머신러닝 기본 구조
```
데이터 준비 → Train/Test 분리 → 모델 학습 → 평가 → 최종학습모델 학습  → 저장 → 서빙
```

HF 파인튜닝 기본 구조
```
데이터셋 로드 → Tokenizer 적용 → Train/Validation 분리 → Trainer 학습 → Metric 평가 → 저장 → 추론
```

###### HF 파인튜닝
| Scikit-Learn | Hugging Face              |
| ------------ | ------------------------- |
| 숫자 Feature   | Tokenizer / Text / Image  |
| fit()        | Trainer / backpropagation |
| 작은 모델        | 거대한 사전학습 모델               |
| CPU 중심       | GPU / VRAM 고려             |
| 즉시 학습        | 학습 비용 큼                   |
ML 원리 = 동일
허깅페이스에서는 딥러닝 학습 mechanics 됩니다.

### Scikit-Learn이란?
	기계 학습(Machine Learning)을 쉽게 할 수 있도록 도와주는 파이썬 라이브러리입니다. 

쉽게 말해서 데이터를 넣으면:
	➡ 알아서 분석하고  
	➡ 예측도 해주는 똑똑한 도구 모음이에요.

예를 들어:
- 키와 몸무게를 보고 이 사람이 남자인지 여자인지 맞혀볼 수 있을까?
- 작년 판매 데이터를 보고, 내년 매출을 예측할 수 있을까?

해결 방법
→ 우리가 이런 문제를 해결할 때 사용하는 게 머신러닝 알고리즘이에요.  
→ 그런데 이걸 직접 코딩하려면 너무 복잡하겠죠?

그래서:
➡ `Scikit-Learn`은 이런 복잡한 알고리즘을 손쉽게 사용할 수 있게 해줘요.  
➡ 마치 머신러닝 키트처럼, 필요한 부품(모델, 도구들)을 꺼내 쓰기만 하면 됩니다.

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

---
터미널에서 설치하기 :  
```bash
# OS 패키지(한 번만) 설치
sudo apt update
sudo apt install -y python3-venv python3-pip

uv pip install --upgrade pip
uv pip install -U scikit-learn pandas numpy matplotlib ipykernel
```

### 실습하기: 

우리가 하고 싶은 일 (문제 정의)
Scikit-Learn을 사용해 의사결정트리(Decision Tree) 모델을 학습하고 간단히 예측해보는 데모 코드를 작성합니다.

아이리스(Iris) 꽃 데이터셋은 Scikit-Learn에 기본 내장된 학습용 예제 데이터셋입니다.
아이리스(Iris) 데이터를 불러와서 꽃잎의 길이, 너비 같은 데이터를 보고  
이 꽃이 어떤 품종(종류)인지 자동으로 맞히고 싶어요.
이 꽃은 `setosa`인가요, `versicolor`인가요, `virginica`인가요?

즉, 우리는:
- 입력값: 꽃잎 길이, 꽃받침 너비 등 수치 데이터
- 정답(타깃값): 꽃의 품종 이름을 가지고, 입력을 보고 정답을 맞히는 모델을 만들고 싶은 겁니다.

라이브러리 불러오기:
```python
import joblib  
import pandas as pd  
  
from sklearn.datasets import load_iris  
from sklearn.tree import DecisionTreeClassifier  
from sklearn.model_selection import train_test_split  
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
```

라이브러리 임포트
- `pandas`: 데이터를 표 형태로 다루기 위함
- `load_iris`: Scikit-Learn에서 제공하는 붓꽃 분류용 샘플 데이터셋
- `DecisionTreeClassifier`: 분류용 결정 트리 모델
- `train_test_split`: 학습/평가 데이터를 나누기 위한 도구 (검증을 위해 매우 중요)
- `accuracy_score`, `classification_report`, `confusion_matrix`: 성능 평가 지표 (pkl 저장 전 확인용)
- `joblib`: 학습된 모델(pkl)을 저장/로드할 때 사용

✅ 중요 포인트  
모델을 만들었다에서 끝나면 안 되고,  
pkl로 저장해서 DRF에 붙이기 전에 반드시 검증(평가)을 하고 저장해야 합니다.  
검증을 안 하면 좋아 보이는데 실제로는 잘 못 맞히는 모델을 저장할 수도 있어요.

---
데이터 로드
```python
iris = load_iris() # 사이킷런에 내장된 Iris(붓꽃) 데이터셋을 불러옵니다  
X = iris.data # 입력값(특성) : 꽃잎/꽃받침 길이, 너비  
y = iris.target # 정답값(레이블) : 품종 번호(0,1,2)  
  
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

---
아이리스꽃 데이터셋을 표 형태로 확인하기

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
Train/Test 분리 (검증 필수)

왜 분리를 하냐면:
- 전체 데이터로 학습하면(`fit(X, y)`),
- 같은 데이터로 평가하면(`predict(X)`),
- 무조건 잘 맞히는 것처럼 보일 수 있어요.
    
✅ 그래서 반드시:
- 학습용(train) 데이터로 공부시키고
- 시험용(test) 데이터로 성능을 확인합니다.

```python
X_train, X_test, y_train, y_test = train_test_split(  
X, y, test_size=0.2, random_state=42, stratify=y  
)
```

- `test_size=0.2` : 전체 150개 중 20%를 시험용으로 빼겠다 (약 30개)
- `random_state=42` : 매번 같은 방식으로 나뉘게 해서 결과가 재현되게 함
- `stratify=y` : 품종(0,1,2) 비율을 train/test에 비슷하게 유지 (분류에서 중요)

---
모델 생성 및 훈련
```python
model = DecisionTreeClassifier(random_state=42) 
# 의사결정나무 알고리즘 선택해서 빈 모델 객체를 만드는것(학습전)

model.fit(X_train, y_train) # .fit()은 모델을 학습시키는 함수
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
평가 (pkl 저장 전 필수 체크)
이 단계는 모델이 진짜 학습됐는지 확인하는 단계입니다.  
DRF로 서비스하기 전에 반드시 확인해야 하는 단계예요.
```python
pred = model.predict(X_test)  
  
acc = accuracy_score(y_test, pred)  
print("✅ accuracy:", acc)  
print("\n✅ classification_report:\n", classification_report(y_test, pred, target_names=iris.target_names))  
print("\n✅ confusion_matrix:\n", confusion_matrix(y_test, pred))
```

- `accuracy`: 전체 중 몇 개 맞혔는지(정확도)
- `classification_report`: 품종별로 정밀도/재현율 등이 나옴 (좀 더 상세)
- `confusion_matrix`: 어떤 품종을 어떤 품종으로 헷갈리는지 표로 확인
- pkl은 배포 파일입니다.
- 최소한 한 번은 시험(X_test)에서 성능을 확인하고 저장해야 해요.

결과
![[Pasted image 20260222203703.png]]

✅ accuracy: 0.9333… 
	전체 예측 중 93.33%를 맞춤
왜 93.33%냐?
- 테스트 데이터가 30개였고 (`support` 합계 보면 30)
- 그 중 28개 맞고 2개 틀리면: 28 / 30 = 0.9333
즉, 시험 문제 30개 중 거의 다 맞춘 상태입니다

###### ✅ classification_report 해석
| 항목        | 의미                       |
| --------- | ------------------------ |
| precision | 맞다고 한 것 중 실제로 맞은 비율      |
| recall    | 실제 정답 중에서 찾아낸 비율         |
| f1-score  | precision & recall 균형 점수 |
| support   | 해당 클래스의 실제 샘플 개수         |
setosa
```
precision = 1.00  
recall = 1.00  
f1-score = 1.00  
support = 10
```
해석:
✔ setosa 10개 모두 정확히 맞춤  
✔ 단 하나도 틀리지 않음 (완벽)

versicolor
```
precision = 0.90  
recall = 0.90
```
해석:
✔ 대부분 맞춤  
✔ 일부 virginica와 헷갈림

virginica
```
precision = 0.90  
recall = 0.90
```
✔ 서로 약간 혼동 발생 

macro avg vs weighted avg
핵심만 기억:
- macro avg → 클래스별 평균 (동등 취급)
- weighted avg → 샘플 수 반영 평균
    
아이리스는 클래스 균형 데이터라 둘이 거의 동일.

✅ confusion_matrix
```
[[10 0 0]  # 실제 setosa 10개 → 전부 setosa로 예측
[ 0 9 1]   # 실제 versicolor 10개 중 9개 맞추고 1개를 virginica로 오판
[ 0 1 9]]  # 실제 virginica 10개 중 9개 맞추고 1개를 versicolor로 오판
```
행 = 실제 정답  
열 = 모델 예측

---
🎯 (중요) 최종 저장용: 전체 데이터로 다시 학습 후 저장  
검증 OK → 서비스용 모델은 보통 full data로 재학습해서 저장

왜 전체 데이터로 다시 학습하냐면:
- 우리는 이미 성능이 괜찮다는 것을 test로 확인했어요.
- 그 다음에는 서비스 품질을 위해 가능한 많은 데이터를 사용해서 최종 모델을 만들고 저장하는 경우가 많아요.
    
즉,
1. `train/test`로 검증(시험)하고
2. OK면 `전체 데이터`로 최종 학습해서
3. 그 최종 모델을 pkl로 저장하는 방식입니다.

```python
final_model = DecisionTreeClassifier(random_state=42)  
final_model.fit(X, y)
```

- DecisionTreeClassifier : 의사결정나무(Decision Tree) 알고리즘을 사용하는 분류 모델
	✔ 데이터를 보고  
	✔ 질문을 단계적으로 던지면서  
	✔ 어떤 클래스인지 결정하는 모델입니다.

동작 방식이 진짜 나무 구조랑 비슷하기 때문에 의사결정 나무입니다.
```
꽃잎 길이가 2cm보다 작은가?
 ├─ YES → setosa
 └─ NO  → 꽃잎 너비가 1.8보다 큰가?
           ├─ YES → virginica
           └─ NO  → versicolor
```
이렇게 조건문(if문)이 계속 갈라지는 구조입니다.
그래서:
✔ 가지(branch)  
✔ 노드(node)  
✔ 리프(leaf) 같은 용어를 씁니다.

- `fit()` : Scikit-Learn 모델을 학습시키는 메서드
	✔ 데이터를 모델에 넣고  
	✔ 패턴(규칙)을 배우게 만드는 단계입니다.

모델 객체를 만든 직후 반드시 호출합니다. 
```
model = DecisionTreeClassifier()  
model.fit(X_train, y_train)
```
이 시점에서 일어나는 일:
- 모델은 아직 아무것도 모르는 상태
- `fit()` 호출 → 데이터로 학습 시작
- 입력(X)과 정답(y)의 관계를 내부적으로 계산

---
(선택) 모델이 잘 학습되었는지 앞 5개로 간단 확인

이 코드는 검증이라기보다 동작 확인용이에요.
```python
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

✅ 주의  
이건 전체 데이터 중 일부를 보는 거라서 평가(검증)의 근거로 쓰면 안 되고  
코드가 돌아가는지 확인 정도로 이해하면 정확합니다.

---
모델 + 메타데이터를 같이 저장하면 DRF가 편해짐

DRF에서 `CLASS_NAMES = [...]` 같은 걸 따로 관리할 필요가 줄어들고, 응답 JSON 만들기도 편해집니다.
```python
artifact = {  
"model": final_model,  
"feature_names": iris.feature_names,  
"target_names": iris.target_names.tolist(),  
}  
  
joblib.dump(artifact, "iris_dt_model.pkl")  
print("\n✅ saved: iris_dt_model.pkl")
```

- `"model"` : 실제 예측하는 최종 모델
- `"feature_names"` : 입력 특성 이름(무슨 값을 받는지 설명할 때 유용)
- `"target_names"` : 0,1,2가 무엇인지(품종 이름) 매핑용

---
저장이 잘 됐는지 바로 테스트
```python
artifact = joblib.load("iris_dt_model.pkl")
print(type(artifact)) 
print(artifact.keys()) 

final_model = artifact["model"]
final_model.predict(iris.data[:1])
```
✔ 에러 없으면 저장 성공  
✔ 이 파일을 DRF로 가져갈 겁니다

---
### 전체 흐름 요약
```
[Jupyter]  
데이터→(train/test 분리)→모델 학습→성능 평가→(전체 데이터로 최종 학습)→모델 저장(.pkl)
                ↓
[DRF]
모델 로드→요청 데이터 받기→예측→JSON 응답
```
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

# 모델을 메모리에 1번만 로드하기 위한 변수
_model = None

# 모델 로드 함수
def get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model

# 추론(예측) 함수 이 함수가 길어지면 services.py로 분리하는 것이 정석 구조입니다
def predict(features):
    """
    features = [sepal_length, sepal_width, petal_length, petal_width]
    
    사용자가 입력한 꽃 정보 리스트  
	예: [5.1, 3.5, 1.4, 0.2]
    """
    
    # 모델 가져오기 (이미 로드됐으면 재사용)
    model = get_model()
    
    # 결과는 numpy 배열로 나오므로  
	# 첫 번째 값 꺼내서 int 변환
    return int(model.predict([features])[0])
```

역할분리를 한다면:
✔ services → 모델 로딩 / 추론 로직  
✔ views → HTTP 처리 / Serializer / Response  
✔ artifacts → 모델 파일 저장소

---
View (예측 API)
`ml/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response

# 입력값 검증용 Serializer
# → 사용자가 보낸 JSON 데이터 구조를 검사하는 역할
from .serializers import IrisPredictSerializer

# services 레이어에서 모델 로드 함수 가져오기
# → 모델 로딩 책임은 view가 아니라 services가 담당 (중요한 설계 원칙)
from .services.iris_model import get_model


# 예측 결과 숫자 → 품종 이름 변환용 리스트
# 0 → setosa
# 1 → versicolor
# 2 → virginica
CLASS_NAMES = ["setosa", "versicolor", "virginica"]


# ---------------------------------------------------------
# ✅ APIView 정의
# ---------------------------------------------------------
class IrisPredictAPIView(APIView):

    # POST 요청만 처리
    # → 클라이언트가 JSON 데이터를 보낼 때 사용
    def post(self, request):

        # -------------------------------------------------
        # 1️⃣ 사용자 입력 데이터 검증
        # -------------------------------------------------

        # request.data = 사용자가 보낸 JSON 데이터
        # Serializer에 넣어서 형식 / 타입 검사
        serializer = IrisPredictSerializer(data=request.data)

        # 데이터가 잘못되면 자동으로 에러 응답 발생
        # raise_exception=True → 오류 메시지 자동 반환
        serializer.is_valid(raise_exception=True)

        # 검증 완료된 안전한 데이터만 추출
        # (여기까지 오면 값이 정상이라는 의미)
        data = serializer.validated_data


        # -------------------------------------------------
        # 2️⃣ 모델 입력 형태 변환 (Scikit-Learn 규칙)
        # -------------------------------------------------

        # Scikit-Learn predict 입력은 반드시 2차원 배열
        # [[feature1, feature2, feature3, feature4]]
        X = [[
            data["sepal_length"],   # 꽃받침 길이
            data["sepal_width"],    # 꽃받침 너비
            data["petal_length"],   # 꽃잎 길이
            data["petal_width"],    # 꽃잎 너비
        ]]


        # -------------------------------------------------
        # 3️⃣ 모델 불러오기 (services 레이어)
        # -------------------------------------------------

        # get_model() 호출 시:
        # - 최초 1회만 pkl 로드
        # - 이후 메모리 캐시 모델 재사용
        
        model = get_model()
        # artifact = get_model()  
		# model = artifact["model"]
		

        # -------------------------------------------------
        # 4️⃣ 예측 수행 (추론 단계)
        # -------------------------------------------------

        # model.predict(X) → 결과는 numpy 배열
        # 예: [0] / [1] / [2]
        pred = model.predict(X)[0]


        # -------------------------------------------------
        # 5️⃣ JSON 응답 반환
        # -------------------------------------------------

        # Response() → DRF가 자동으로 JSON 변환
        return Response({

            # 예측된 클래스 번호
            "prediction": int(pred),

            # 사람이 읽기 쉬운 품종 이름
            "class_name": CLASS_NAMES[pred]
        })
```

`ml/serializers.py`
```python
from rest_framework import serializers

# ---------------------------------------------------------
# ✅ Iris 예측 입력값 검증용 Serializer
# ---------------------------------------------------------
class IrisPredictSerializer(serializers.Serializer):

    # 사용자가 JSON으로 보내야 하는 값들 정의
    # → FloatField = 반드시 숫자(실수) 타입이어야 함

    sepal_length = serializers.FloatField()
    # 꽃받침 길이 (예: 5.1)

    sepal_width = serializers.FloatField()
    # 꽃받침 너비 (예: 3.5)

    petal_length = serializers.FloatField()
    # 꽃잎 길이 (예: 1.4)

    petal_width = serializers.FloatField()
    # 꽃잎 너비 (예: 0.2)
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

엔드포인트 `http://127.0.0.1:8000/api/iris/`

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
마이그레이트
```bash
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

---
### 코드 개선하기

브라우저 폼에서 `"abc"` 같은 값이 들어왔는데, 이 줄에서 바로 터집니다.
![[Pasted image 20260222210244.png]]

```python
float(request.POST["sepal_length"])
```
그래서 오류 팝업(알림)을 띄우려면 iris_page에서 입력 검증 + 예외 처리를 해줘야 합니다.

`ml/views.py` 의 `iris_page` 수정
```python
from django.shortcuts import render
from .services.iris_model import predict

CLASS_NAMES = ["setosa", "versicolor", "virginica"]

def iris_page(request):
    result = None
    error = None  # ✅ 에러 메시지 전달용

    if request.method == "POST":
        try:
            # 숫자로 변환 시도 (여기서 abc면 ValueError 발생)
            features = [
                float(request.POST["sepal_length"]),
                float(request.POST["sepal_width"]),
                float(request.POST["petal_length"]),
                float(request.POST["petal_width"]),
            ]

            pred = predict(features)
            result = {"prediction": pred, "class_name": CLASS_NAMES[pred]}

        except ValueError:
            # float 변환 실패(abc 등) 잡기
            error = "숫자만 입력할 수 있어요. 예: 5.1, 3.5, 1.4, 0.2"
        except KeyError:
            # 필드가 누락된 경우
            error = "입력값이 누락되었습니다. 모든 칸을 채워주세요."

    return render(request, "ml/iris.html", {"result": result, "error": error})
```

초보자·사용자 UX 관점에서는 “어떤 값을 넣어야 하는지”가 전혀 안 보이는 상태
여기서는 placeholder(플레이스홀더)를 쓰는 게 정석
```html
<input type="number" name="sepal_length" step="0.1" required placeholder="예: 5.1">
<input type="number" name="sepal_width"  step="0.1" required placeholder="예: 3.5">
<input type="number" name="petal_length" step="0.1" required placeholder="예: 1.4">
<input type="number" name="petal_width"  step="0.1" required placeholder="예: 0.2">
```