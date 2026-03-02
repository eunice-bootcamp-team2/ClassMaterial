날씨 → 음식 카테고리 Top-K 예측
(ML + 데이터 조회): 위도/경도 → 근처 음식점 추천
좌표 자체를 바로 ML에 넣는 게 아니라,
1. 좌표 → 현재 날씨 피처로 변환(날씨 API/캐시)
2. ML로 음식 카테고리 Top-K 예측
3. 예측된 카테고리로 DB에서 근처 가게를 검색/정렬  
    1+2+3의 파이프라인이 필요합니다. 여기서 2만 ML이고, 3은 보통 규칙/검색(또는 별도 랭킹 모델)을 씁니다.


```bash
pip install -U pytest pytest-mock httpx pytest-asyncio
pip install -U fastapi uvicorn sqlalchemy pydantic
```

```
python - <<'PY'
import pandas as pd
df = pd.read_csv("src/ml_models/weather_data_updated.csv")
print(df["Category"].value_counts())
PY

# 결과
Category
찜       369
국밥      368
디저트     232
카페      221
스테이크    185
파스타     182
분식      141
초밥      138
리멘       51
중식       51
치킨       35
족발       27
Name: count, dtype: int64

# 즉 데이터에 편향성이 있다.
```

모델 디렉토리
```
src/
ml_models/
  └── v1/
    ├── model.pkl
    ├── preprocessor.pkl
  ├── train_weather2cuisine.py
  └── weather_data_updated.csv
```

ml모델에 관련된 파일 디렉토리
```
src/
├── core/
│   ├── config.py     # 공통 설정(.env 로드, 상수/경로)
│   └── ml.py         # ✅ ML 아티팩트 경로 반환(get_*_path)
├── dependencies/
│   ├── weather.py    # ✅ 좌표→날씨(캐시/예외처리 포함)
│   └── predict.py    # ✅ 날씨→Top-K 카테고리 예측(현재 파일)
├── models/
│   └── restaurant_model.py     # (선택) SQLAlchemy 모델
├── operators/
│   └── restaurant_operator.py  # ✅ get_restaurants등 검색/정렬로직
├── routers/
│   ├── utilities_router.py # ✅ /predict_cuisine_type_by_weather
│   └── recommendations_router.py 
└── ml_models/
    ├── weather_data_updated.csv    # ✅ 학습 데이터
	   ├── train_weather2cuisine.py # ✅ 학습 스크립트
	   └── v1/                      # ✅ 버전 폴더 
           ├── model.pkl
           └── preprocessor.pkl
```
---
`src/ml_models/train_weather2cuisine.py`
- `weather_data_updated.csv` → 피처/라벨 분리
- `ColumnTransformer` + `RandomForestClassifier` 파이프라인 구성
- `class_weight="balanced_subsample"`로 데이터 불균형 보정
- 학습 후 **`preprocessor.pkl`**, **`model.pkl`** 저장 (`src/ml_models/v1/`)
```python
# src/ml_models/train_weather2cuisine.py
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE    = Path(__file__).resolve().parent          # ← src/ml_models/
DATA    = BASE / "weather_data_updated.csv"        # ← CSV 위치
OUTDIR  = BASE / "v1"                              # ← 저장 위치: src/ml_models/v1/
OUTDIR.mkdir(parents=True, exist_ok=True)

LABEL_COL = "Category"                             # ★ 라벨 컬럼명 (당신 CSV 기준)

FEATS = ["Temperature","Precipitation","Cloudiness","Snowfall","Pressure"]

df = pd.read_csv(DATA)

missing = [c for c in FEATS if c not in df.columns]
if missing:
    raise SystemExit(f"CSV에 필요한 피처 컬럼이 없습니다: {missing}\n현재 컬럼: {list(df.columns)}")

if LABEL_COL not in df.columns:
    raise SystemExit(f"라벨 컬럼 '{LABEL_COL}' 이(가) 없습니다. 현재 컬럼: {list(df.columns)}")

# 라벨/피처 확인
print("Label col:", LABEL_COL)
print("Feature cols:", FEATS)
print("Class dist (head):")
print(df[LABEL_COL].value_counts().head())

# 결측 라벨 제거 + 희소 라벨 묶기(불균형 완화)
df = df.dropna(subset=[LABEL_COL])
vc = df[LABEL_COL].value_counts()
rare = vc[vc < 20].index  # 필요시 20→50 등 조정
if len(rare) > 0:
    df[LABEL_COL] = np.where(df[LABEL_COL].isin(rare), "기타", df[LABEL_COL])

X = df[FEATS]
y = df[LABEL_COL]

pre = ColumnTransformer([("num", StandardScaler(), FEATS)])
clf = RandomForestClassifier(
    n_estimators=400,
    random_state=42,
    class_weight="balanced_subsample"   # 불균형 보정
)
pipe = Pipeline([("pre", pre), ("clf", clf)])

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
pipe.fit(Xtr, ytr)

print("\n=== Classification report ===")
print(classification_report(yte, pipe.predict(Xte), digits=3))

joblib.dump(pipe.named_steps["pre"], OUTDIR / "preprocessor.pkl")
joblib.dump(pipe.named_steps["clf"], OUTDIR / "model.pkl")
print("\nSaved:", OUTDIR / "preprocessor.pkl", OUTDIR / "model.pkl")
print("Classes:", pipe.named_steps["clf"].classes_)
```

성능이 제대로 나오지 않을때 다시 ml모델을 학습시키려면
```
python src/ml_models/train_weather2cuisine.py
```
이 명령어를 실행하면
- `src/ml_models/weather_data_updated.csv`를 불러와서
- 전처리(`StandardScaler`) + 분류기(`RandomForestClassifier`) 학습
- 결과를 `src/ml_models/v1/preprocessor.pkl`, `src/ml_models/v1/model.pkl` 로 저장  
    까지 한 번에 수행됩니다.
즉, 모델 재학습 + 저장을 한 번에 하는 스크립트를 실행한 거예요.
---
모델 경로 관리
- `src/core/ml.py`
    - `.env`에서 불러온 경로를 조합해 모델 파일 위치를 반환
    - API 내부에서는 `get_model_path()` / `get_preprocessor_path()`로 접근
여기는 모델 파일 로딩 위치를 결정하는 설정부입니다.

`src/core/ml.py`
```python
import os
from dotenv import load_dotenv

load_dotenv(verbose=True)

ML_MODEL_DIR = os.getenv('ML_MODEL_DIR')
ML_MODEL_VERSION = os.getenv('ML_MODEL_VERSION')
ML_MODEL_FILE = os.getenv('ML_MODEL_FILE')
ML_PREPROCESSOR_FILE = os.getenv('ML_PREPROCESSOR_FILE')

def get_model_path():
  return os.path.join(ML_MODEL_DIR, ML_MODEL_VERSION, ML_MODEL_FILE)

def get_preprocessor_path():
  return os.path.join(ML_MODEL_DIR, ML_MODEL_VERSION, ML_PREPROCESSOR_FILE)
```
---
예측 로직
`src/dependencies/predict.py`
- FastAPI 의존성 함수로 동작
    - uvicorn 시작 시 한 번만 `model.pkl`과 `preprocessor.pkl`을 로드
    - API 요청이 들어오면:
        1. 전처리기에 맞는 컬럼 순서 확인
        2. 입력값(`temperature`, `precipitation` 등)을 DataFrame으로 변환
        3. 전처리 → 모델 예측 → 상위 `top_k` 레이블 반환
        4. `return_probs` 또는 `debug`가 True이면 확률·매핑 정보까지 반환
이 파일이 실제로 예측을 수행하는 핵심입니다.
```python
import re
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException, Query

from src.core.ml import get_model_path, get_preprocessor_path

# ------------------------------------------------------------
# 모델/전처리기: 모듈 임포트 시 1회 로드 (성능)
# ------------------------------------------------------------
try:
    loaded_model = joblib.load(get_model_path())
    preprocessor = joblib.load(get_preprocessor_path())
except Exception as e:
    # uvicorn 시작 시 바로 터지면 개발 편의상 503로 돌려주기
    raise HTTPException(status_code=503, detail=f"ML artifacts load failed: {e}")


def _expected_columns_from_pre(pre) -> List[str]:
    """
    학습 당시 입력 컬럼 이름을 전처리기에서 추출.
    - ColumnTransformer.transformers_ 우선
    - fallback: feature_names_in_
    - 둘 다 없으면 빈 리스트
    """
    cols: List[str] = []
    transformers = getattr(pre, "transformers_", None)
    if transformers:
        for name, trans, sel in transformers:
            if name == "remainder":
                continue
            if isinstance(sel, list):
                cols += sel
            elif hasattr(sel, "tolist"):
                cols += sel.tolist()
            else:
                try:
                    cols += list(sel)
                except Exception:
                    pass
    if not cols and hasattr(pre, "feature_names_in_"):
        cols = list(pre.feature_names_in_)
    # 문자열화 보장
    cols = [str(c) for c in cols]
    return cols


def _build_row(payload: Dict[str, float], expected_cols: List[str]) -> pd.DataFrame:
    """
    expected 컬럼 이름에 '부분 문자열'로 매칭하여 쿼리 파라미터를 채움.
    매칭 실패한 컬럼은 0.0 유지.
    """
    row = {c: 0.0 for c in expected_cols}

    # 정규식 패턴(소문자 비교)
    def put_if_match(key: str, patterns: Tuple[str, ...]):
        val = float(payload.get(key, 0.0))
        for col in expected_cols:
            c = col.lower()
            if any(re.search(p, c) for p in patterns):
        # 동일 카테고리로 여러 컬럼이 있을 수 있지만, 일단 같은 값 채움
                row[col] = val

    # temperature
    put_if_match("temperature", (r"\btemp", r"temperature", r"\btmp"))
    # precipitation / rain
    put_if_match("precipitation", (r"precip", r"\bprcp", r"rain"))
    # cloudiness
    put_if_match("cloudiness", (r"cloud", r"sky", r"cldn", r"cloudiness"))
    # snowfall
    put_if_match("snowfall", (r"snow", r"sfall", r"snowfall"))
    # pressure
    put_if_match("pressure", (r"press", r"hpa", r"pressure"))

    return pd.DataFrame([row], columns=expected_cols)


def _to_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return default

def predict_cuisine_type_by_weather(
    temperature: float = Query(0.0, description="기온(°C)"),
    precipitation: float = Query(0.0, description="강수량(mm)"),
    cloudiness: float = Query(0.0, description="운량/구름"),
    snowfall: float = Query(0.0, description="적설(cm)"),
    pressure: float = Query(0.0, description="기압(hPa)"),
    top_k: int = Query(2, ge=1, le=10),
    return_probs: bool = Query(False),
    debug: bool = Query(False),
):
    """
    현재 날씨 피처 -> (상위 top_k) 음식 카테고리 예측

    반환 형태:
    - return_probs=False: ["라벨1", "라벨2", ...]
    - return_probs=True : {
        "top": [...],
        "probs": {"라벨": {"rank": 1, "probability": 0.42}, ...},
        "expected_columns": [...],
        "features_mapped": {"실제_전처리_입력_컬럼": 값, ...}
      }
    """
    # 1) 기대 컬럼 추출
    expected_cols = _expected_columns_from_pre(preprocessor)
    if not expected_cols:
        # 기대 컬럼을 모르겠으면, fallback로 이름 고정(과거 코드 호환)
        expected_cols = ["Temperature", "Precipitation", "Cloudiness", "Snowfall", "Pressure"]

    # 2) 페이로드 구성
    payload = dict(
        temperature=_to_float(temperature),
        precipitation=_to_float(precipitation),
        cloudiness=_to_float(cloudiness),
        snowfall=_to_float(snowfall),
        pressure=_to_float(pressure),
    )

    # 3) 기대 컬럼에 맞게 1행 DataFrame 생성
    X = _build_row(payload, expected_cols)

    # 4) 전처리 → 예측
    try:
        Xp = preprocessor.transform(X)
        probs = loaded_model.predict_proba(Xp)[0]      
        # shape: (n_classes,)
        classes = np.array(loaded_model.classes_) 
        # shape: (n_classes,)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # 5) 상위 top_k 추출
    order = np.argsort(probs)[::-1]
    top_k = max(1, int(top_k))
    top_idx = order[:top_k]
    top_labels = classes[top_idx].tolist()

    if not return_probs and not debug:
        # 과거 호환: 리스트만 반환
        return top_labels

    # 확률/진단 정보 포함
    probs_map = {classes[i]: {"rank": r + 1, "probability": float(probs[i])}
                 for r, i in enumerate(top_idx)}

    return {
        "top": top_labels,
        "probs": probs_map,
        "expected_columns": expected_cols,
        "features_mapped": X.to_dict(orient="records")[0],
    }
```
---
라우팅
- `src/routers/utilities_router.py`
    - `/predict_cuisine_type_by_weather` GET 엔드포인트 등록
    - 내부에서 `Depends(predict_cuisine_type_by_weather)` 호출 → `predict.py`의 함수 실행
    - API 응답 반환
FastAPI 외부 요청이 들어올 때 진입하는 문입니다.
`src/routers/utilities_router.py`
```python
from src.dependencies.predict import predict_cuisine_type_by_weather

@router.get("/predict_cuisine_type_by_weather")
async def read_predicted_cuisine_type_by_weather(
    response: dict = Depends(predict_cuisine_type_by_weather)
):
    return response
```
---
`src/routers/recommendations_router.py`
```python
# src/routers/recommendations_router.py
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.dependencies.database import get_db
from src.dependencies.predict import predict_cuisine_type_by_weather
from src.dependencies.weather import get_wthr_data_list_by_coordinate

# 레스토랑 오퍼레이터: 동기 함수(get_restaurants)와 enum을 그대로 재사용
from src.operators.restaurant_operator import RestaurantOrderBy, Sort
from src.operators.restaurant_operator import get_restaurants as fetch_restaurants

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _extract_weather_features(latitude: float, longitude: float, db: Session) -> Dict[str, float]:
    """
    기상청 응답 포맷을 방어적으로 파싱. 실패하면 안전한 기본값으로 대체.
    """
    try:
        w = get_wthr_data_list_by_coordinate(longitude, latitude, "JSON", db)
    except Exception as e:
        print(f"[WARN] weather fetch failed: {e}")
        w = None

    def _f(x):
        try:
            return float(x) if (x is not None and str(x) != "") else 0.0
        except Exception:
            return 0.0

    if isinstance(w, dict):
        item0 = (
            w.get("response", {})
            .get("body", {})
            .get("items", {})
            .get("item", [{}])[0]
        )
        return {
            "temperature": _f(item0.get("ta")),
            "precipitation": _f(item0.get("rn")),   # 강수량
            "cloudiness": _f(item0.get("dc10Tca")),
            "snowfall": _f(item0.get("dsnw")),
            "pressure": _f(item0.get("pa")),
        }

    # fallback
    return {
        "temperature": 20.0,
        "precipitation": 0.0,
        "cloudiness": 30.0,
        "snowfall": 0.0,
        "pressure": 1013.0,
    }


@router.get("/restaurants/by-coords")
async def recommend_restaurants_by_coords(
    latitude: float = Query(..., description="위도"),
    longitude: float = Query(..., description="경도"),
    radius_km: float = Query(1.0, ge=0.1, le=20.0, description="검색 반경(km)"),
    top_k: int = Query(2, ge=1, le=5),
    limit: int = Query(50, ge=1, le=200),
    order_by: RestaurantOrderBy = Query(RestaurantOrderBy.updated_at),
    sort: Sort = Query(Sort.desc),
    return_probs: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    좌표 기반 추천:
      1) 좌표 → 날씨 피처 생성
      2) ML로 카테고리 Top-K 예측
      3) 예측 카테고리를 /restaurants 오퍼레이터에 넘겨서 결과 조회
    """
    # 1) 날씨 피처
    wx = _extract_weather_features(latitude, longitude, db)

    # 2) ML 예측
    pred = predict_cuisine_type_by_weather(
        temperature=wx["temperature"],
        precipitation=wx["precipitation"],
        cloudiness=wx["cloudiness"],
        snowfall=wx["snowfall"],
        pressure=wx["pressure"],
        top_k=top_k,
        return_probs=return_probs,
        debug=False,
    )

    if isinstance(pred, list):
        top_labels = pred
        probs: Optional[Dict[str, Any]] = None
    elif isinstance(pred, dict):
        top_labels = pred.get("top", []) or []
        probs = pred.get("probs")
    else:
        top_labels = []
        probs = None

    if not top_labels:
        raise HTTPException(status_code=500, detail="예측 결과가 비어 있습니다.")

    # 3) /restaurants 오퍼레이터 호출 (동기 함수이므로 await 금지!)
    #    ML 결과는 '카테고리'이므로 cuisine_type_categories로 전달
    items = fetch_restaurants(
        db=db,
        tags=None,
        cuisine_type_categories=",".join(top_labels),
        cuisine_types=None,
        area=None,
        longitude=longitude,
        latitude=latitude,
        distance=radius_km,
        skip=0,
        limit=limit,
        order_by=order_by,
        sort=sort,
    )

    return {
        "coords": {"latitude": latitude, "longitude": longitude, "radius_km": radius_km},
        "weather_used": wx,
        "top_categories": top_labels,
        "probs": probs if return_probs else None,
        "items": items,
    }


@router.get("/restaurants/by-coords-debug")
async def recommend_restaurants_by_coords_debug(
    latitude: float = Query(...),
    longitude: float = Query(...),
    temperature: Optional[float] = Query(None),
    precipitation: Optional[float] = Query(None),
    cloudiness: Optional[float] = Query(None),
    snowfall: Optional[float] = Query(None),
    pressure: Optional[float] = Query(None),
    radius_km: float = Query(1.0),
    top_k: int = Query(2),
    limit: int = Query(50),
    order_by: RestaurantOrderBy = Query(RestaurantOrderBy.updated_at),
    sort: Sort = Query(Sort.desc),
    db: Session = Depends(get_db),
):
    """
    디버그용: 좌표 + 수동 날씨 값을 직접 넣어 E2E 테스트
    """
    wx = _extract_weather_features(latitude, longitude, db)

    # 수동값 오버라이드
    if temperature is not None: wx["temperature"] = temperature
    if precipitation is not None: wx["precipitation"] = precipitation
    if cloudiness is not None: wx["cloudiness"] = cloudiness
    if snowfall is not None: wx["snowfall"] = snowfall
    if pressure is not None: wx["pressure"] = pressure

    pred = predict_cuisine_type_by_weather(
        temperature=wx["temperature"],
        precipitation=wx["precipitation"],
        cloudiness=wx["cloudiness"],
        snowfall=wx["snowfall"],
        pressure=wx["pressure"],
        top_k=top_k,
        return_probs=True,
        debug=True,
    )
    top_labels = pred.get("top", []) if isinstance(pred, dict) else (pred or [])

    items = fetch_restaurants(
        db=db,
        tags=None,
        cuisine_type_categories=",".join(top_labels) if top_labels else None,
        cuisine_types=None,
        area=None,
        longitude=longitude,
        latitude=latitude,
        distance=radius_km,
        skip=0,
        limit=limit,
        order_by=order_by,
        sort=sort,
    )

    return {
        "coords": {"latitude": latitude, "longitude": longitude, "radius_km": radius_km},
        "weather_used": wx,
        "prediction_debug": pred,
        "items": items,
    }
```
