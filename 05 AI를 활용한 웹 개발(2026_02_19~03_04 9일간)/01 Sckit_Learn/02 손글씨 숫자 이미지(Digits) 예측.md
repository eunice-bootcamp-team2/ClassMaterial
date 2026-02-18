손글씨 숫자 이미지(Digits) 예측
	숫자 손글씨 이미지를 보고, 그 숫자가 몇인지 예측하는 모델을 만들어보겠습니다!

프로젝트 준비
```bash
mkdir digits
cd digits
code -r .

uv venv
source .venv/bin/activate

which python # 활성화 확인
uv pip install notebook # 쥬피터 설치
```

쥬피터 실행: wsl2 (브라우저 자동 실행 X)
```bash
jupyter notebook --no-browser --port=8888
```

쥬피터 실행: mac macOS (브라우저 자동 실행 O)
```bash
jupyter notebook
```

터미널에서 설치하기 :  
```bash
uv pip install -U scikit-learn pandas numpy matplotlib ipykernel
```

라이브러리 불러오기
```python
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import numpy as np
```
머신러닝, 데이터 분할, 평가, 시각화를 위한 필수 라이브러리 불러오기

---
데이터 불러오기 및 구성 확인
```python
# 1. 손글씨 숫자 데이터 불러오기
digits = load_digits()
print(digits.keys())
```
손글씨 숫자 데이터셋 로딩 후, 어떤 항목들이 들어있는지 확인 (`data`, `target`, `images`, `DESCR` 등)

```
dict_keys(['data', 'target', 'frame', 'feature_names', 'target_names', 'images', 'DESCR'])
```

| 키 이름            | 설명                                     | 예시                                                |
| --------------- | -------------------------------------- | ------------------------------------------------- |
| `data`          | 입력값: 각 이미지의 픽셀(64개)을 1차원 벡터로 만든 것      | `digits.data[0] → [0.0, 0.0, ..., 5.0, ..., 0.0]` |
| `target`        | 정답값: 해당 숫자(0~9)                        | `digits.target[0] → 0`                            |
| `frame`         | `pandas.DataFrame` 형식 데이터 (대부분 `None`) | 생략 가능                                             |
| `feature_names` | 특성 이름 (보통 없음 또는 0~63 번호)               | `[pixel_0, pixel_1, ...]`                         |
| `target_names`  | 분류 가능한 숫자 리스트                          | `[0, 1, ..., 9]`                                  |
| `images`        | 원본 이미지 데이터 (8x8 배열)                    | `digits.images[0] → 2차원 이미지 배열`                   |
| `DESCR`         | 데이터 설명서 (긴 문자열)                        | `print(digits.DESCR)`                             |

---
입력(X)과 정답(y) 분리
```python
# 2. 입력(X)과 정답(y) 나누기
X = digits.data         # 각 숫자 이미지 (8x8 → 64개 픽셀 값)
y = digits.target       # 해당 숫자 (0~9)

# 이줄이 없으면 모든행이 생략되서 출력됩니다.
np.set_printoptions(threshold=np.inf)

print("X:", X)
print()
print("y:", y)
```
X가 대문자인 이유:
- 수학에서 대문자 X는 행렬(Matrix) 을 나타냅니다.
- 입력값은 여러 개의 특성(feature)을 가지는 2차원 배열이므로 `X`라고 씁니다

y가 소문자인 이유:
- 수학에서 벡터(1차원) 를 나타낼 때 소문자 `y`를 자주 사용합니다.
- 정답값은 보통 하나의 컬럼이니까 1차원 벡터로 표현되며, 그래서 `y`를 씁니다.

`X`는 대문자고 `y`는 소문자인 이유는 수학적 관례와 머신러닝 커뮤니티의 암묵적인 약속입니다. 정해진 법칙은 아니지만, 의미가 있는 표현 방식 입니다.

결과: `np.set_printoptions(threshold=np.inf)` 없이 출력
```
X: [[ 0.  0.  5. ...  0.  0.  0.]
 [ 0.  0.  0. ... 10.  0.  0.]
 [ 0.  0.  0. ... 16.  9.  0.]
 ...
 [ 0.  0.  1. ...  6.  0.  0.]
 [ 0.  0.  2. ... 12.  0.  0.]
 [ 0.  0. 10. ... 12.  1.  0.]]

y:[0 1 2 ... 8 9 8]
```
`X	입력값들 (숫자 이미지의 픽셀 값)`	
- X.shape = (1797, 64) → 1797개의 숫자 이미지
`y	정답값들 (이미지가 나타내는 실제 숫자)`	
- y.shape = (1797,) → 각 이미지의 숫자 라벨
이 데이터는 아직 학습 된게 아니며 그냥 데이터 뭉치 입니다.
학습을 위해 직접 `.fit()`으로 모델에 넣어줘야 합니다.

0.0은 완전 흰색 (밝음 비어있음)  0. == 0.0
8.0은 회색(중간 글자 일부) 8. == 8.0
16.0은 검정색(가장어두운색 글자선이 진함) 16. == 16.0

`np.set_printoptions(threshold=np.inf)` 있게 출력된 결과:
```python
X: [[ 0.  0.  5. 13.  9.  1.  0.  0.  0.  0. 13. 15. 10. 15.  5.  0.  0.  3.
  15.  2.  0. 11.  8.  0.  0.  4. 12.  0.  0.  8.  8.  0.  0.  5.  8.  0.
   16.  9.  8.  0.  0.  4. 11.  0.  1. 12.  7.  0.  0.  2. 14.  5. 10. 12.
   17.  0.  0.  0.  6. 13. 10.  0.  0.  0.]
 [ 0.  0.  0. 12. 13.  5.  0.  0.  0.  0.  0. 11. 16.  9.  0.  0.  0.  0.
   18. 15. 16.  6.  0.  0.  0.  7. 15. 16. 16.  2.  0.  0.  0.  0.  1. 16.
  19.  3.  0.  0.  0.  0.  1. 16. 16.  6.  0.  0.  0.  0.  1. 16. 16.  6.
   20.  0.  0.  0.  0. 11. 16. 10.  0.  0.]
 [ 0.  0.  0.  4. 15. 12.  0.  0.  0.  0.  3. 16. 15. 14.  0.  0.  0.  0.
   21. 13.  8. 16.  0.  0.  0.  0.  1.  6. 15. 11.  0.  0.  0.  1.  8. 13.
  22.  1.  0.  0.  0.  9. 16. 16.  5.  0.  0.  0.  0.  3. 13. 16. 16. 11.
   23.  0.  0.  0.  0.  3. 11. 16.  9.  0.]
       .......]]
       
y: [0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 9 5 5 6 5 0
 9 8 9 8 4 1 7 7 3 5 1 0 0 2 2 7 8 2 0 1 2 6 3 3 7 3 3 4 6 6 6 4 9 1 5 0 9
 5 2 8 2 0 0 1 7 6 3 2 1 7 4 6 3 1 3 9 1 7 6 8 4 3 1 4 0 5 3 6 9 6 1 7 5 4
 4 7 2 8 2 2 5 7 9 5 4 8 8 4 9 0 8 9 8 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7
 8 9 0 1 2 3 4 5 6 7 8 9 0 9 5 5 6 5 0 9 8 9 8 4 1 7 7 3 5 1 0 0 2 2 7 8 2
 0 1 2 6 3 3 7 3 3 4 6 6 6 4 9 1 5 0 9 5 2 8 2 0 0 1 7 6 3 2 1 7 3 1 3 9 1
 7 6 8 4 3 1 4 0 5 3 6 9 6 1 7 5 4 4 7 2 8 2 2 5 5 4 8 8 4 9 0 8 9 8 0 1 2  ......]     
```

---
시각적으로 데이터를 확인해보고 싶다면:
```python
import matplotlib.pyplot as plt

plt.matshow(digits.images[0], cmap='gray') # 첫 번째 숫자 이미지 출력
plt.title(f"Label: {digits.target[0]}")
plt.show()
```

숫자 '0' 그림이 회색 픽셀로 출력
![[Pasted image 20250727175559.png]]

---
전체 데이터를 학습용(train) 과 시험용(test) 으로 나누기 
데이터셋 분할 (train/test split)을 수행하는 코드:
```python
# 3. 학습용/테스트용 데이터 나누기
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
```
- 전체 데이터 중 80%는 학습용, 20%는 테스트용으로 나누기
- `random_state=42`는 결과를 고정하기 위해 사용

| 파라미터              | 의미                           |
| ----------------- | ---------------------------- |
| `test_size=0.2`   | 전체 데이터 중 20%를 시험용(test)으로 사용 |
| `random_state=42` | 데이터 섞을 때 사용하는 시드값 (결과 고정)    |
시드값(seed)이란?
	무작위(random) 작업을 "항상 같은 결과"로 만들기 위한 숫자 값이에요.

왜 시드값이 필요한가요?
`train_test_split()`은 데이터를 "랜덤으로 섞어서" 나눕니다.
- 그래서 매번 실행할 때마다 다른 데이터 조합이 생길 수 있어요.
- 즉, 학습용/시험용 데이터가 계속 바뀝니다 → 예측 결과도 바뀜

그런데 우리가 실험/디버깅/비교할 때는?
- 항상 같은 데이터 조합으로 실험해야 결과 비교가 됩니다.
- 그래서 무작위성을 "고정"하기 위해 `random_state=숫자`를 줍니다.

비유로 이해해볼게요. 예를 들어 시험지를 섞는다고 해볼게요.
- 그냥 `random.shuffle()`로 섞으면 → 매번 다른 시험지 나옴
- `random.seed(42)`를 주고 섞으면 → 항상 같은 순서로 섞임
	→ 이게 `random_state=42`의 의미와 같아요.

`random.seed(정수인 아무 숫자나 줘도 됩니다.)`
42는 전통적으로 프로그래밍에서 유래된 숫자로 개발자들 사이에 매우 유명한 문화적 밈이자 문학적인 유머입니다. 궁금하면 왜 42를 쓰는지 검색해 보세요.

---
모델 만들고 학습시키기
```python
# 4. 모델 만들고 학습하기
model = DecisionTreeClassifier()
model.fit(X_train, y_train)
```
- 결정 트리 모델 생성 후, 학습 데이터를 이용해 모델 훈련(fit)

---
테스트 데이터로 예측하고 정확도 평가
```python
# 5. 예측하고 정확도 평가
y_pred = model.predict(X_test)
print("정확도:", accuracy_score(y_test, y_pred))
```
- 학습된 모델로 테스트 데이터 예측  
- 예측 결과와 실제 정답을 비교해 정확도(accuracy) 계산
- `model.predict(X_test)`는 머신러닝에서 모델이 테스트 데이터를 입력받아 예측 결과를 출력하는 핵심 메소드

`model`	
	학습된 머신러닝 모델 (예: DecisionTreeClassifier, RandomForestClassifier, 등)
`.predict()`	
	입력 데이터를 기반으로 클래스(또는 숫자)를 예측하는 함수
`X_test`	
	예측에 사용할 데이터 (입력 값들)
`y_pred`	
	예측 결과 (예: 클래스 번호, 회귀 값 등)

---
이미지 1장 예측 시각화
```python
# 6. 이미지 1개 예측해보기
plt.gray()
plt.matshow(digits.images[0])  # 첫 번째 이미지 출력
plt.show()
```
- 모델이 예측할 숫자 이미지 1장을 회색조로 출력해서 확인

---
예측 결과 확인
```python
print("실제:", digits.target[0])
print("예측:", model.predict([digits.data[0]]))
```
- 0번째 이미지의 정답(label)과 모델의 예측값을 나란히 출력  
- 잘 맞추면 모델이 해당 숫자를 정확히 예측한 것!

---
### 1️⃣ Jupyter에서 모델 저장하기 (학습 결과를 파일로)

(1) 모델 학습 완료
```python
# ==============================
# 0. 필요한 라이브러리 불러오기
# ==============================

# 숫자 이미지 데이터셋(손글씨 숫자 0~9)을 불러오기 위한 함수
from sklearn.datasets import load_digits

# 학습용 데이터와 테스트용 데이터를 나누기 위한 함수
from sklearn.model_selection import train_test_split

# 의사결정나무(Decision Tree) 분류 모델
from sklearn.tree import DecisionTreeClassifier

# 예측 결과의 정확도를 계산해주는 함수
from sklearn.metrics import accuracy_score

# 이미지와 그래프를 시각화하기 위한 라이브러리
import matplotlib.pyplot as plt

# 수치 계산과 배열 처리를 위한 라이브러리
import numpy as np


# ==============================
# 1. 데이터 불러오기
# ==============================

# sklearn에 내장된 digits 데이터셋 로드
digits = load_digits()

# digits 객체에 어떤 정보들이 들어있는지 확인
# (data, target, images 등)
print(digits.keys())


# ==============================
# 2. 입력(X)과 정답(y) 나누기
# ==============================

# X : 입력 데이터
# 각 숫자 이미지는 8x8 픽셀 → 총 64개의 숫자로 펼쳐진 상태
X = digits.data

# y : 정답(라벨)
# 각 이미지가 어떤 숫자인지 (0~9)
y = digits.target


# 출력이 중간에 ...으로 생략되지 않도록 설정
np.set_printoptions(threshold=np.inf)

# 전체 입력 데이터 출력 (학습용으로는 보통 출력 안 함, 구조 확인용)
print("X:", X)
print()
print("y:", y)


# ==============================
# 2-1. 이미지 시각화
# ==============================

# digits.images는 8x8 형태의 원본 이미지 데이터
# 첫 번째 숫자 이미지를 화면에 출력
plt.matshow(digits.images[0], cmap="gray")

# 해당 이미지의 실제 숫자 라벨 표시
plt.title(f"Label: {digits.target[0]}")

plt.show()


# ==============================
# 3. 학습용 / 테스트용 데이터 분리
# ==============================

# 전체 데이터 중
# - 80%는 학습용(train)
# - 20%는 테스트용(test)
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,      # 테스트 데이터 비율
    random_state=42     # 항상 같은 결과가 나오도록 고정
)


# ==============================
# 4. 모델 생성 및 학습
# ==============================

# Decision Tree 분류 모델 생성
model = DecisionTreeClassifier()

# 학습용 데이터로 모델 학습
# (입력 X_train → 정답 y_train)
model.fit(X_train, y_train)


# ==============================
# 5. 예측 및 정확도 평가
# ==============================

# 테스트 데이터로 숫자 예측
y_pred = model.predict(X_test)

# 실제 정답(y_test)과 예측값(y_pred)을 비교해서 정확도 계산
accuracy = accuracy_score(y_test, y_pred)

print("정확도:", accuracy)


# ==============================
# 6. 이미지 1개 직접 예측해보기
# ==============================

# 흑백 이미지로 표시
plt.gray()

# 첫 번째 숫자 이미지 다시 출력
plt.matshow(digits.images[0])
plt.show()

# 실제 정답 출력
print("실제:", digits.target[0])

# 모델이 예측한 결과 출력
# predict는 2차원 배열 형태를 요구하므로 리스트로 감싸줌
print("예측:", model.predict([digits.data[0]]))
```

(2) 모델 저장 (joblib 사용)
```python
import joblib

joblib.dump(model, "digits_model.pkl")
```
현재 노트북 폴더에  
    `digits_model.pkl` 파일 생성됨

(3) 저장이 잘 됐는지 바로 테스트
```python
loaded_model = joblib.load("digits_model.pkl")
loaded_model.predict(digits.data[:1])
```
✔ 에러 없으면 저장 성공  
✔ 이 파일을 DRF로 가져갈 겁니다

---
📂 아래와 같은 상태로 디렉토리를 정리합니다.
```
digits/
├─ manage.py
├─ mysite/                  
│  ├─ settings.py
│  ├─ urls.py
│  └─ ...
└─ ml/
   ├─ artifacts/
   │  └─ digits_model.pkl   # Jupyter에서 만든 pkl을 여기로 복사
   ├─ services/
   │  └─ digits_lo_model.py # 모델 로더
   ├─ templates/
   │  └─ ml/
   │     └─ digits.html     # 화면(UI)
   ├─ static/
   │  └─ ml/
   │     └─ digits.css      # (선택)
   ├─ models.py
   ├─ serializers.py
   ├─ views.py
   └─ urls.py
```

Django & Django REST Framework 설치
```bash
uv pip install django djangorestframework
```

Django 프로젝트 및 앱 생성
```bash
django-admin startproject mysite .
python manage.py startapp ml
```

`requirements.txt` 생성
```bash
uv pip freeze > requirements.txt
```

`settings.py` 설정 (DRF 등록) 
`mysite/settings.py` 열어서 `INSTALLED_APPS`에 추가:
```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "ml",
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

실행 & 테스트
```bash
python manage.py runserver
```

모델과 모델 로드할 파일 파일 생성
```bash
mkdir -p ml/artifacts
```
그리고 쥬피터에서 복사한 `digits_model.pkl`을 생성한 폴더에 이동

```bash
mkdir -p ml/services
```

`서비스용 로더 연결부 ml/services/digits_lo_model.py`
```python
# ml/services/digits_lo_model.py
from __future__ import annotations

from pathlib import Path
import threading
import joblib


# ✅ 이 파일 위치 기준으로 pkl 경로를 안전하게 잡습니다.
BASE_DIR = Path(__file__).resolve().parent.parent  # ml/
MODEL_PATH = BASE_DIR / "artifacts" / "digits_model.pkl"

_lock = threading.Lock()
_model = None


def get_digits_model():
    """
    서버가 켜져 있는 동안 모델을 1번만 로드하고 재사용합니다.
    (매 요청마다 joblib.load 하면 느려져요)
    """
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                if not MODEL_PATH.exists():
                    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
                _model = joblib.load(MODEL_PATH)
    return _model
```
---
View (예측 API)
`ml/views.py` (API + 화면 렌더)
```python
import numpy as np
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import DigitsPredictRequestSerializer
from .services.digits_lo_model import get_digits_model


def digits_page(request):
    """
    브라우저에서 테스트할 화면
    """
    return render(request, "ml/digits.html")


class DigitsPredictAPIView(APIView):
    """
    POST /api/digits/predict/
    body:
    {
      "pixels": [0,0,5,13,... 총 64개]
    }
    """
    def post(self, request):
        ser = DigitsPredictRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        pixels = ser.validated_data["pixels"]

        model = get_digits_model()

        # sklearn은 2차원 입력을 기대합니다: (n_samples, n_features)
        X = np.array([pixels], dtype=float)

        pred = int(model.predict(X)[0])

        payload = {"predicted": pred}

        # 확률 제공 가능하면 포함
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)[0]  # length 10
            payload["proba"] = {str(i): float(proba[i]) for i in range(len(proba))}

        # (선택) DB에 로그 저장
        try:
            DigitsPredictionLog.objects.create(
                pixels=pixels,
                predicted=pred,
                proba=payload.get("proba")
            )
        except Exception:
            # 로그 저장은 부가 기능이므로 실패해도 API는 정상 응답하도록
            pass

        return Response(payload, status=status.HTTP_200_OK)
```

`ml/serializers.py`
```python
# ml/serializers.py
from rest_framework import serializers


class DigitsPredictRequestSerializer(serializers.Serializer):
    """
    digits 모델은 8x8 이미지 → 64개 픽셀(0~16)을 1차원 리스트로 받습니다.
    """
    pixels = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=16),
        allow_empty=False
    )

    def validate_pixels(self, value):
        if len(value) != 64:
            raise serializers.ValidationError("pixels는 길이가 정확히 64여야 합니다. (8x8 이미지)")
        return value


class DigitsPredictResponseSerializer(serializers.Serializer):
    predicted = serializers.IntegerField()
    proba = serializers.DictField(required=False)
```

`mysite/urls.py (include 연결)`
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("ml.urls")),   # ml 앱 URL 연결
]
```

`ml/urls.py` (앱 URL)
```python
from django.urls import path
from .views import digits_page, DigitsPredictAPIView

urlpatterns = [
    path("digits/", digits_page, name="digits-page"),                 # 화면
    path("api/digits/predict/", DigitsPredictAPIView.as_view(), name="digits-predict"),  # API
]
```

`migration`(필수 권장)
```bash
python manage.py migrate
```

실행 & 테스트
```bash
python manage.py runserver
```
---
여기서 JSON 응답이 오면 모델 서빙 성공입니다.  
API만 직접 테스트(curl) : 테스트시 반드시 서버가 켜져 있어야 합니다.
```bash
curl -s -X POST "http://127.0.0.1:8000/api/digits/predict/" \
  -H "Content-Type: application/json" \
  -d '{"pixels":[0,0,5,13,9,1,0,0,0,0,13,15,10,15,5,0,0,3,15,2,0,11,8,0,0,4,12,0,0,8,8,0,0,5,8,0,0,8,8,0,0,4,11,0,1,12,7,0,0,2,14,5,10,12,0,0,0,0,6,13,10,0,0,0]}'
```
결과:
```
{"predicted":0,"proba":{"0":1.0,...}}
```

### imsomnia로 테스트 하기
![[Pasted image 20260206115920.png]]

```json
{
	"predicted": 0,
	"proba": {
		"0": 1.0,
		"1": 0.0,
		"2": 0.0,
		"3": 0.0,
		"4": 0.0,
		"5": 0.0,
		"6": 0.0,
		"7": 0.0,
		"8": 0.0,
		"9": 0.0
	}
}
```
---
`ml/views.py`
```python
from .models import DigitsPredictionLog
```

`ml/models.py` (선택: 예측 로그 저장)
```python
from django.db import models


class DigitsPredictionLog(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    # 64개 픽셀 값을 저장 (간단히 JSON으로)
    pixels = models.JSONField()

    predicted = models.IntegerField()

    # 확률이 있으면 저장 (DecisionTree는 predict_proba 가능)
    proba = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] predicted={self.predicted}"
```

마이그레이션
```bash
python manage.py makemigrations
python manage.py migrate
```

중간 테스트 실행 & 테스트
```bash
python manage.py runserver
```

템플릿 폴더 만들기
`ml/templates/ml`
```bash
mkdir -p ml/templates/ml
```

템플릿: `ml/templates/ml/digits.html`
```html
<!-- ml/templates/ml/digits.html -->
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Digits 예측</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    textarea { width: 100%; height: 140px; }
    .row { display: flex; gap: 12px; margin-top: 12px; }
    button { padding: 10px 14px; cursor: pointer; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px; margin-top: 12px; }
    .muted { color: #666; font-size: 14px; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h1>손글씨 숫자(Digits) 예측 테스트</h1>
  <p class="muted">
    digits 모델 입력은 <b>픽셀 64개(0~16)</b> 입니다. (8×8 이미지)
  </p>

  <div class="card">
    <label><b>pixels (64개)</b></label>
    <textarea id="pixels" placeholder="예: 0,0,5,13,9,1,... (총 64개)"></textarea>

    <div class="row">
      <button id="fillSample">샘플 채우기(0번 이미지 예시)</button>
      <button id="predict">예측하기</button>
    </div>
  </div>

  <div class="card">
    <b>결과</b>
    <pre id="result">{}</pre>
  </div>

  <script>
    // 문서에 있는 예시(0번 이미지 픽셀) 형태로 간단 샘플을 넣어주는 버튼
    // (정확히 digits.data[0]과 동일하진 않아도, 64개 입력 형식 연습용)
    const sample64 = [
      0,0,5,13,9,1,0,0,
      0,0,13,15,10,15,5,0,
      0,3,15,2,0,11,8,0,
      0,4,12,0,0,8,8,0,
      0,5,8,0,0,8,8,0,
      0,4,11,0,1,12,7,0,
      0,2,14,5,10,12,0,0,
      0,0,6,13,10,0,0,0
    ];

    const pixelsEl = document.getElementById("pixels");
    const resultEl = document.getElementById("result");

    document.getElementById("fillSample").addEventListener("click", () => {
      pixelsEl.value = sample64.join(",");
    });

    document.getElementById("predict").addEventListener("click", async () => {
      try {
        const raw = pixelsEl.value.trim();
        if (!raw) {
          alert("pixels를 입력하세요 (64개).");
          return;
        }

        const pixels = raw
          .split(",")
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(Number);

        const res = await fetch("/api/digits/predict/", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({pixels})
        });

        const data = await res.json();
        resultEl.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        resultEl.textContent = String(e);
      }
    });
  </script>
</body>
</html>
```

실행/테스트 순서
```bash
python manage.py runserver
```

브라우저에서 화면 확인
```
http://127.0.0.1:8000/digits/
```

화면 결과
![[Pasted image 20260206121201.png]]

---
`ml/views.py` `DigitsPredictAPIView` 아래에 이 클래스를 추가하세요.
```python
from sklearn.datasets import load_digits

class DigitsSampleAPIView(APIView):
    """
    GET /api/digits/sample/?label=0
    - label(0~9)에 해당하는 digits 샘플 1개를 반환
    - mode=random: 랜덤 샘플
    - mode=first: 첫 샘플
    """
    def get(self, request):
        try:
            label = int(request.query_params.get("label", 0))
        except ValueError:
            return Response({"detail": "label은 0~9 정수여야 합니다."}, status=400)

        if label < 0 or label > 9:
            return Response({"detail": "label은 0~9 범위여야 합니다."}, status=400)

        mode = request.query_params.get("mode", "random")  # random | first

        digits = load_digits()
        idxs = np.where(digits.target == label)[0]
        if len(idxs) == 0:
            return Response({"detail": "해당 label 샘플을 찾지 못했습니다."}, status=404)

        if mode == "first":
            idx = int(idxs[0])
        else:
            idx = int(np.random.choice(idxs))

        pixels = digits.data[idx].tolist()     # 길이 64
        image = digits.images[idx].tolist()    # 8x8 (선택: 그리드에 쓰기 편함)

        return Response({
            "label": label,
            "index": idx,
            "pixels": pixels,
            "image": image,   # 8x8
        })
```

`ml/urls.py`에 라우트 추가
```python
from django.urls import path
from .views import digits_page, DigitsPredictAPIView, DigitsSampleAPIView

urlpatterns = [
    path("digits/", digits_page, name="digits-page"),
    path("api/digits/predict/", DigitsPredictAPIView.as_view(), name="digits-predict"),
    path("api/digits/sample/", DigitsSampleAPIView.as_view(), name="digits-sample"),  # ✅ 추가
]
```

서버 재시작 후 샘플 API 테스트
```bash
curl -s "http://127.0.0.1:8000/api/digits/sample/?label=0" | head
```
JSON으로 `pixels`(64개)와 `image`(8x8)가 오면 성공.

화면(HTML)에서 8×8 그리드 그리기 + 드롭다운으로 샘플 불러오기
`ml/templates/ml/digits.html`을 아래처럼 그리드 영역을 추가해요.

HTML에 드롭다운 + 버튼 + 8×8 그리드 영역 추가
`<textarea>` 위나 아래에 이 블록을 넣으세요.
```html
<div class="card">
  <div class="row">
    <label><b>샘플 숫자 선택</b></label>
    <select id="labelSelect">
      <option value="0">0</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
      <option value="6">6</option>
      <option value="7">7</option>
      <option value="8">8</option>
      <option value="9">9</option>
    </select>

    <button id="loadSample">샘플 불러오기</button>
  </div>

  <div id="grid" class="grid"></div>
  <div class="muted" id="gridInfo"></div>
</div>

```

`<style>`에 그리드 스타일 추가:
```css
<style>
  /* 기존 스타일 유지하고 아래 추가 */
  .grid {
    display: grid;
    grid-template-columns: repeat(8, 24px);
    grid-template-rows: repeat(8, 24px);
    gap: 3px;
    margin-top: 12px;
  }
  .cell {
    width: 24px;
    height: 24px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
</style>
```

JS에 샘플 불러오기 → 그리드 칠하기 → textarea에 pixels 채우기 추가
```js
<script>
  // =========================
  // 0) DOM 요소 잡기 (1번만)
  // =========================
  const pixelsEl = document.getElementById("pixels");
  const resultEl = document.getElementById("result");

  // (선택) 기존 샘플 채우기 버튼
  const fillSampleBtn = document.getElementById("fillSample");

  // (추가) 드롭다운 샘플 로드 + 그리드
  const labelSelect = document.getElementById("labelSelect");
  const loadSampleBtn = document.getElementById("loadSample");
  const gridEl = document.getElementById("grid");
  const gridInfoEl = document.getElementById("gridInfo");

  // =========================
  // 1) 로컬 샘플(0번 이미지 예시)
  // =========================
  const sample64 = [
    0,0,5,13,9,1,0,0,
    0,0,13,15,10,15,5,0,
    0,3,15,2,0,11,8,0,
    0,4,12,0,0,8,8,0,
    0,5,8,0,0,8,8,0,
    0,4,11,0,1,12,7,0,
    0,2,14,5,10,12,0,0,
    0,0,6,13,10,0,0,0
  ];

  if (fillSampleBtn) {
    fillSampleBtn.addEventListener("click", () => {
      pixelsEl.value = sample64.join(",");
      // 로컬 샘플을 그리드에도 반영
      renderPixels(sample64);
      if (gridInfoEl) gridInfoEl.textContent = "로컬 샘플(0번 예시) 로드";
      resultEl.textContent = "{}";
    });
  }

  // =========================
  // 2) 8x8 그리드 렌더링 준비
  // =========================
  const cells = [];

  function initGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    cells.length = 0;

    for (let i = 0; i < 64; i++) {
      const div = document.createElement("div");
      div.className = "cell";
      gridEl.appendChild(div);
      cells.push(div);
    }
  }

  // 값(0~16)을 회색으로 표현 (값이 클수록 더 진하게)
  function valueToGray(v) {
    const t = Math.max(0, Math.min(16, v)) / 16; // 0~1
    const c = Math.round(255 * (1 - t));        // 255~0
    return `rgb(${c},${c},${c})`;
  }

  // pixels(길이 64)로 그리드 칠하기
  function renderPixels(pixels) {
    if (!cells.length) return;
    for (let i = 0; i < 64; i++) {
      const v = Number(pixels[i] ?? 0);
      cells[i].style.background = valueToGray(v);
    }
  }

  // textarea에 pixels를 "0,0,..."로 채우기
  function fillTextareaFromPixels(pixels) {
    pixelsEl.value = pixels.join(",");
  }

  // =========================
  // 3) DRF에서 샘플 불러오기
  // =========================
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener("click", async () => {
      try {
        const label = labelSelect ? labelSelect.value : "0";

        const res = await fetch(`/api/digits/sample/?label=${label}&mode=random`);
        const data = await res.json();

        if (!res.ok) {
          resultEl.textContent = JSON.stringify(data, null, 2);
          return;
        }

        const pixels = data.pixels; // 64개
        renderPixels(pixels);
        fillTextareaFromPixels(pixels);

        if (gridInfoEl) {
          gridInfoEl.textContent = `샘플 label=${data.label}, index=${data.index} 불러옴`;
        }
        resultEl.textContent = "{}";
      } catch (e) {
        resultEl.textContent = String(e);
      }
    });
  }

  // =========================
  // 4) 예측하기 (딱 1번만)
  // =========================
  document.getElementById("predict").addEventListener("click", async () => {
    try {
      const raw = pixelsEl.value.trim();
      if (!raw) {
        alert("pixels를 입력하세요 (64개).");
        return;
      }

      const pixels = raw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .map(Number);

      const res = await fetch("/api/digits/predict/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ pixels })
      });

      const data = await res.json();
      resultEl.textContent = JSON.stringify(data, null, 2);

      // 예측 버튼 눌렀을 때도 그리드 반영(입력값 시각화)
      renderPixels(pixels);
    } catch (e) {
      resultEl.textContent = String(e);
    }
  });

  // =========================
  // 5) 초기 실행
  // =========================
  initGrid();
</script>
```

실행 & 테스트
```bash
python manage.py runserver
```

브라우저에서 화면 확인
```
http://127.0.0.1:8000/digits/
```

![[Pasted image 20260206122127.png]]