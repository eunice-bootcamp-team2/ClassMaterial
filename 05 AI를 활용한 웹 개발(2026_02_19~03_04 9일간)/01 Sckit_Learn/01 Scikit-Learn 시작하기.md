Scikit-Learn이란?
	기계 학습(Machine Learning)을 쉽게 할 수 있도록 도와주는 파이썬 라이브러리입니다. 
쉽게 말해서 데이터를 넣으면:
	➡ 알아서 분석하고  
	➡ 예측도 해주는 똑똑한 도구 모음이에요.
예를 들어:
- "키와 몸무게를 보고 이 사람이 남자인지 여자인지 맞혀볼 수 있을까?"
- "작년 판매 데이터를 보고, 내년 매출을 예측할 수 있을까?"

해결 방법
→ 우리가 이런 문제를 해결할 때 사용하는 게 머신러닝 알고리즘이에요.  
→ 그런데 이걸 직접 코딩하려면 너무 복잡하겠죠?

그래서:
➡ `Scikit-Learn`은 이런 복잡한 알고리즘을 손쉽게 사용할 수 있게 해줘요.  
➡ 마치 "머신러닝 키트"처럼, 필요한 부품(모델, 도구들)을 꺼내 쓰기만 하면 됩니다.

###### Scikit-Learn이 해주는 일:
| 기능                              | 설명                   | 예시               |
| ------------------------------- | -------------------- | ---------------- |
| 분류(Classification)              | 어떤 그룹인지 맞히기          | 이메일이 스팸인지 아닌지    |
| 회귀(Regression)                  | 숫자 예측                | 집값 예측, 온도 예측     |
| 군집화(Clustering)                 | 비슷한 것끼리 묶기           | 고객을 성향별로 나누기     |
| 차원 축소(Dimensionality Reduction) | 복잡한 데이터를 간단하게 만들기    | 이미지에서 중요한 정보만 추출 |
| 모델 선택 / 평가                      | 어떤 모델이 잘 맞는지 비교하고 확인 | 정확도 측정, 교차 검증 등  |

정리하면
- Scikit-Learn은 머신러닝을 위한 파이썬 도구 상자예요.
- 어렵고 복잡한 기계학습 알고리즘을 쉽게 사용하게 해줍니다.
- 데이터 분석, 예측, 분류, 추천 등 다양한 일을 자동으로 할 수 있어요.

터미널에서 설치하기 :  
```bash
# OS 패키지(한 번만) 설치
sudo apt update
sudo apt install -y python3-venv python3-pip

uv pip install --upgrade pip
uv pip install -U scikit-learn pandas numpy matplotlib ipykernel
```

실습하기: 우리가 하고 싶은 일 (문제 정의)
Scikit-Learn을 사용해 의사결정트리(Decision Tree) 모델을 학습하고 간단히 예측해보는 데모 코드를 작성합니다.

아이리스(Iris) 데이터를 불러와서 꽃잎의 길이, 너비 같은 데이터를 보고  
이 꽃이 어떤 품종(종류)인지 자동으로 맞히고 싶어요.
"이 꽃은 `setosa`인가요, `versicolor`인가요, `virginica`인가요?"

즉, 우리는:
- 입력값: 꽃잎 길이, 꽃받침 너비 등 수치 데이터
- 정답(타깃값): 꽃의 품종 이름을 가지고, 입력을 보고 정답을 맞히는 모델을 만들고 싶은 겁니다.

라이브러리 불러오기:
```python
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.tree import DecisionTreeClassifier
```
라이브러리 임포트
- `pandas`: 데이터를 표 형태로 다루기 위함
- `load_iris`: Scikit-Learn에서 제공하는 붓꽃 분류용 샘플 데이터셋
- `DecisionTreeClassifier`: 분류용 결정 트리 모델
---
```python
# 데이터 로드
iris = load_iris() # 사이킷런에 내장된 Iris(붓꽃) 데이터셋을 불러옵니다
print(iris.keys()) # 데이터 확인하기
```
출력결과:
```
dict_keys(['data', 'target', 'frame', 'target_names', 'DESCR', 'feature_names', 'filename', 'data_module'])
```
###### 데이터 로드 및 확인
| 키               | 설명                                 |
| --------------- | ---------------------------------- |
| `data`          | 입력 데이터 (특성)꽃잎 길이, 꽃받침 너비 등 수치형 데이터 |
| `target`        | 정답(레이블) 데이터꽃의 품종 번호 (0, 1, 2)      |
| `frame`         | `pandas.DataFrame` 형식의 전체 데이터      |
| `target_names`  | 클래스 이름 목록0, 1, 2가 어떤 품종인지 이름 제공    |
| `DESCR`         | 데이터셋 설명서 (텍스트)                     |
| `feature_names` | 각 특성(열)의 이름 리스트                    |
| `filename`      | 로컬에 저장된 데이터 파일의 경로                 |
| `data_module`   | 이 데이터셋을 관리하는 내부 모듈                 |

아이리스꽃 데이터셋을 표 형태로 만들고, 그 표에 꽃의 품종(class) 정보를 추가한 다음, 전체 데이터를 출력한 코드:
```python
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['class'] = iris.target
print(df)
```

🔹 `iris.data`
- 꽃의 측정값 (꽃잎/꽃받침의 길이, 너비 등)
- 2차원 배열: 150개 샘플 × 4개 특성 ( 꽃잎 꽃받침의 크기에 따라 다른 품종)
- 예: `[[5.1, 3.5, 1.4, 0.2], [4.9, 3.0, 1.4, 0.2], ...]`
    
🔹 `iris.feature_names`
- 각 열의 이름
- 예: `['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)']`
    
🔹 `pd.DataFrame(...)`
- 위의 데이터와 열 이름을 활용해 표(`DataFrame`)를 생성함
- 열 이름을 붙인 이유: 보기 좋게 만들기 위해
    
🔹 `df['class'] = iris.target`
- 각 행의 정답(꽃의 품종)을 `class`라는 새 열에 추가
- `iris.target`은 `[0, 0, 0, 1, 1, 2, 2, ...]` 식으로 구성됨
    
🔹 `print(df)`
- 최종적으로 만든 표(입력 데이터 + 품종)를 화면에 출력

데이터 확인:
![[Pasted image 20250727162606.png]]
`sepal length (cm)`	꽃받침 길이
`sepal width (cm)`	꽃받침 너비
`petal length (cm)`	꽃잎 길이
`petal width (cm)`	꽃잎 너비
`class`	품종 (0, 1, 2)으로 구분된 정답 레이블

---
```python
# 모델 생성 및 훈련
model = DecisionTreeClassifier() 
# 의사결정나무 알고리즘 선택해서 빈 모델 객체를 만드는것(학습전)

model.fit(iris.data, iris.target) # .fit()은 모델을 학습시키는 함수
# - iris.data: 입력값 (꽃잎/꽃받침의 길이, 너비 등)
# - iris.target: 정답값 (0=setosa, 1=versicolor, 2=virginica)
```
모델 생성 및 학습
- `DecisionTreeClassifier()`: 결정 트리 분류기 생성
- `fit(...)`: 학습 데이터로 모델 학습

`DecisionTreeClassifier`란?
- 의사결정나무(Decision Tree) 알고리즘을 이용해 데이터를 분류(Classification) 하는 모델입니다.
- 질문을 따라가며 "이건 뭐지?"를 결정하는 나무 구조처럼 동작합니다.

각 파라미터 설명:
![[Pasted image 20250727162751.png]]

| 파라미터 이름                    | 기본값      | 뜻                | 쉽게 설명                                          |
| -------------------------- | -------- | ---------------- | ---------------------------------------------- |
| `criterion`                | `'gini'` | 불순도 계산 방법        | `'gini'` 또는 `'entropy'`. 나무에서 어떤 분할이 좋은지 판단 기준 |
| `splitter`                 | `'best'` | 노드 분할 방식         | `'best'`: 가장 좋은 기준으로 분할. `'random'`: 무작위 선택    |
| `max_depth`                | `None`   | 최대 깊이 제한         | 나무가 너무 깊어지는 것을 막음 (과적합 방지)                     |
| `min_samples_split`        | `2`      | 분할에 필요한 최소 샘플 수  | 이보다 작으면 더 이상 분할하지 않음                           |
| `min_samples_leaf`         | `1`      | 리프 노드 최소 샘플 수    | 끝 노드에 최소 몇 개의 데이터가 있어야 하는지                     |
| `min_weight_fraction_leaf` | `0.0`    | 리프 노드 최소 가중치 비율  | 샘플 가중치 기준 (잘 안 씀)                              |
| `max_features`             | `None`   | 분할할 때 고려할 특성 수   | `'sqrt'`, `'log2'` 등 지정 가능. 랜덤성과 성능 제어         |
| `random_state`             | `None`   | 랜덤 시드 설정         | 결과를 재현 가능하게 하기 위한 숫자                           |
| `max_leaf_nodes`           | `None`   | 리프 노드 최대 개수 제한   | 나무 크기 제한 (복잡도 조절)                              |
| `min_impurity_decrease`    | `0.0`    | 불순도 감소 최소값       | 이 값보다 작으면 분할 안 함                               |
| `class_weight`             | `None`   | 클래스 가중치 조정       | 불균형 데이터에서 소수 클래스 가중치를 높여줌                      |
| `ccp_alpha`                | `0.0`    | 비용-복잡도 가지치기 파라미터 | 복잡한 나무를 잘라 단순하게 만듦 (가지치기)                      |
| `monotonic_cst`            | `None`   | 단조 제약 조건         | 특정 특성이 오를수록 결과도 오르도록 강제 (고급 옵션)                |

---
모델이 잘 학습되었는지 확인하기 위해 데이터의 앞 5개 샘플에 대해 예측값과 실제 정답을 비교하는 코드:
```python
# 예측 테스트
print("예측:", model.predict(iris.data[:5]))
print("실제:", iris.target[:5])
```
- `iris.data[:5]` → 입력 데이터 앞에서 5개만 슬라이싱  
    예: 꽃잎/꽃받침 길이, 너비가 들어 있는 5개 행
- `model.predict(...)` → 학습된 모델에 이 데이터를 넣어서  
    "이건 무슨 품종일까?" 예측
- 예측 결과는 `[0 0 0 0 0]` 이런 식의 배열로 나와요  
    (0: setosa, 1: versicolor, 2: virginica)

결과: 이 출력 결과는 Scikit-Learn의 Decision Tree 모델이 붓꽃(iris) 데이터를 기반으로 학습한 뒤, 첫 5개 샘플을 예측한 결과입니다.
```python
[150 rows x 5 columns] # 총 150개의 샘플 (행)
예측: [0 0 0 0 0]
실제: [0 0 0 0 0]
```
- `predict()`는 학습한 모델이 품종을 어떻게 맞히는지 보여주는 메서드예요.
- 이 코드에서는 학습한 모델에게 입력값 5개를 주고,  
    → 예측값과 실제값이 일치하는지 비교하고 있어요

---
### 전체 흐름 요약
```
[Jupyter]
데이터 → 모델 학습 → 모델 저장(.pkl)
                ↓
[DRF]
모델 로드 → 요청 데이터 받기 → 예측 → JSON 응답
```

### 1️⃣ Jupyter에서 모델 저장하기 (학습 결과를 파일로)

(1) 모델 학습 완료
```python
# scikit-learn에 내장된 예제 데이터셋(iris)을 불러오기 위한 함수
from sklearn.datasets import load_iris

# 의사결정트리(Decision Tree) 분류 모델을 사용하기 위한 클래스
from sklearn.tree import DecisionTreeClassifier


# 1️⃣ 아이리스(붓꽃) 데이터셋 로드
# - scikit-learn에서 미리 준비해 둔 학습용 데이터
# - 꽃잎/꽃받침 길이와 너비 → 꽃의 품종을 맞히는 문제
iris = load_iris()


# 2️⃣ 머신러닝 모델 객체 생성 (아직 학습 전 상태)
# - DecisionTreeClassifier(): 의사결정나무 알고리즘을 사용하겠다고 선언
# - 이 시점의 model은 "아무것도 모르는 빈 모델"
model = DecisionTreeClassifier()


# 3️⃣ 모델 학습(fit)
# - iris.data  : 입력값(X)
#   → 꽃잎/꽃받침 길이, 너비 등 숫자 데이터
# - iris.target: 정답값(y)
#   → 각 꽃이 어떤 품종인지에 대한 라벨 (0, 1, 2)
# - fit()을 호출하면:
#   → 모델이 입력값과 정답의 관계를 학습함
#   → 이후 새로운 데이터를 넣으면 예측 가능
model.fit(iris.data, iris.target)
```

(2) 모델 저장 (joblib 사용)
	Scikit-Learn 공식 권장 방식
```python
import joblib

joblib.dump(model, "iris_dt_model.pkl")
```
실행 후:
- 현재 노트북 폴더에  
    `iris_dt_model.pkl` 파일 생성됨
이 파일이 바로 학습된 AI 모델입니다.

(3) 저장이 잘 됐는지 바로 테스트
```python
loaded_model = joblib.load("iris_dt_model.pkl")
loaded_model.predict(iris.data[:1])
```
✔ 에러 없으면 저장 성공  
✔ 이 파일을 DRF로 가져갈 겁니다

---
📂 아래와 같은 상태로 디렉토리를 정리합니다.
```
ㄴscikit_learn/
├─ manage.py
├─ mysite/
├─ ml/
│  ├─ artifacts/ 
│  │  └─ iris_dt_model.pkl   ← 모델 파일
│  ├─ services/
│  │  ├─ iris_model.py       ← Django에서 모델 로드할 파일
│  ├─ views.py
│  ├─ models.py 
│  ├─ serializers.py
│  └─ urls.py
└─ train_iris_exported.py    ← 참고용(서비스에서 사용 X)
```

Django & DRF 설치
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

`settings.py`에 앱 등록
```python
INSTALLED_APPS = [
    # third-party
    "rest_framework",
    # local
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
그리고 쥬피터에서 복사한 `iris_dt_model.pkl`을 생성한 폴더에 이동

```bash
mkdir -p ml/services
```

`1)` Jupyter Notebook (.ipynb) — 학습용

- 학습하고
- 실험하고
- 성능 확인하고
- 마지막에 pkl로 저장만 함
- 노트북은 서비스에서 직접 실행하지 않음.

`2)` `ml/artifacts/iris_dt_model.pkl` — 학습 결과물

- 이것만 있으면 서비스는 끝이에요.
- 서비스는 이 파일을 불러오기만 합니다.

`3)` `ml/services/iris_model.py` — 서비스용 로더(연결부)

여기는 딱 2개만 합니다:
1. pkl 모델을 로드한다
2. 예측 함수 제공한다

`서비스용 로더 연결부 ml/services/iris_model.py`
```python
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "artifacts" / "iris_dt_model.pkl"

_model = None

def get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def predict(features):
    """
    features = [sepal_length, sepal_width, petal_length, petal_width]
    """
    model = get_model()
    return int(model.predict([features])[0])
```
---
View (예측 API)
`ml/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response

from .serializers import IrisPredictSerializer
from .services.iris_model import get_model

CLASS_NAMES = ["setosa", "versicolor", "virginica"]

class IrisPredictAPIView(APIView):
    def post(self, request):
        serializer = IrisPredictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        X = [[
            data["sepal_length"],
            data["sepal_width"],
            data["petal_length"],
            data["petal_width"],
        ]]

        model = get_model()
        pred = model.predict(X)[0]

        return Response({
            "prediction": int(pred),
            "class_name": CLASS_NAMES[pred]
        })
```

`ml/serializers.py`
```python
from rest_framework import serializers

class IrisPredictSerializer(serializers.Serializer):
    sepal_length = serializers.FloatField()
    sepal_width = serializers.FloatField()
    petal_length = serializers.FloatField()
    petal_width = serializers.FloatField()
```

`mysite/urls.py (include 연결)`
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
	path("admin/", admin.site.urls),
    path("api/", include("ml.urls")),
]
```

`ml/urls.py`
```python
from django.urls import path
from . import views

urlpatterns = [
    path("predict/iris/", views.IrisPredictAPIView.as_view()),
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
테스트시 반드시 서버가 켜져 있어야 합니다.
```bash
curl -X POST http://127.0.0.1:8000/api/predict/iris/ \
  -H "Content-Type: application/json" \
  -d '{"sepal_length":5.1,"sepal_width":3.5,"petal_length":1.4,"petal_width":0.2}'
```
결과:
```
{"prediction":0,"class_name":"setosa"}
```

### imsomnia로 테스트 하기
![[Pasted image 20260205184913.png]]

```json
{
  "sepal_length": 5.1,
  "sepal_width": 3.5,
  "petal_length": 1.4,
  "petal_width": 0.2
}
```
---
`ml/models.py` (선택: 예측 로그 저장)
```python

```

마이그레이션
```bash
python manage.py makemigrations
python manage.py migrate
```

실행 & 테스트
```bash
python manage.py runserver
```

템플릿 폴더 만들기
`ml/templates/ml`
```bash
mkdir -p ml/templates/ml
```

템플릿 파일 생성: `ml/templates/ml/iris.html`
```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Iris 예측</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; }
    input { width: 220px; padding: 8px; margin: 6px 0; }
    button { padding: 10px 14px; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Iris 품종 예측</h1>

  <form method="post">
    {% csrf_token %}
    <div><label>sepal_length <input name="sepal_length" step="0.1" required></label></div>
    <div><label>sepal_width <input name="sepal_width" step="0.1" required></label></div>
    <div><label>petal_length <input name="petal_length" step="0.1" required></label></div>
    <div><label>petal_width <input name="petal_width" step="0.1" required></label></div>
    <button type="submit">예측하기</button>
  </form>

  {% if result %}
    <div class="card">
      <div><b>예측 결과:</b> {{ result.class_name }} ({{ result.prediction }})</div>
    </div>
  {% endif %}
</body>
</html>
```

템플릿 렌더링 뷰 추가: `ml/views.py`에 추가
APIView는 그대로 두고, 아래 함수 뷰 하나만 더 붙이세요.
```python
from django.shortcuts import render
from .services.iris_model import predict

def iris_page(request):
    result = None
    if request.method == "POST":
        features = [
            float(request.POST["sepal_length"]),
            float(request.POST["sepal_width"]),
            float(request.POST["petal_length"]),
            float(request.POST["petal_width"]),
        ]
        pred = predict(features)
        result = {"prediction": pred, "class_name": CLASS_NAMES[pred]}

    return render(request, "ml/iris.html", {"result": result})
```

URL에 페이지 라우팅 추가: `ml/urls.py`
```python
from django.urls import path
from . import views

urlpatterns = [
    path("predict/iris/", views.IrisPredictAPIView.as_view()),
    path("iris/", views.iris_page),  # 화면 확인용
]
```

화면에서 AI를 통해 예측결과를 출력한 화면
![[Pasted image 20260205190734.png]]

실행/테스트 순서
```bash
python manage.py runserver
```

브라우저에서 화면 확인
```
http://127.0.0.1:8000/api/iris/
```
