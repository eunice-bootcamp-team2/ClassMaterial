손글씨 숫자 이미지(Digits) 예측
	숫자 손글씨 이미지를 보고, 그 숫자가 몇인지 예측하는 모델을 만들어보겠습니다!

프로젝트 준비
```bash
mkdir digits2
cd digits2
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
```
머신러닝, 데이터 분할, 평가, 시각화를 위한 필수 라이브러리 불러오기

---
### `1.` 데이터 불러오기 및 구성 확인
```python
# 1. 손글씨 숫자 데이터 불러오기
digits = load_digits()

# digits 객체에 어떤 정보들이 들어있는지 확인
print(digits.keys())
```
손글씨 숫자 데이터셋 로딩 후, 어떤 항목들이 들어있는지 확인 (`data`, `target`, `images`, `DESCR` 등)

```
dict_keys(['data', 'target', 'frame', 'feature_names', 'target_names', 'images', 'DESCR'])
```

| 키 이름            | 설명                                    | 예시                                                |
| --------------- | ------------------------------------- | ------------------------------------------------- |
| `data`          | 입력값: 각 이미지의 픽셀(64개)을 1차원 벡터로 만든 것     | `digits.data[0] → [0.0, 0.0, ..., 5.0, ..., 0.0]` |
| `target`        | 정답값: 해당 숫자(0~9)                       | `digits.target[0] → 0`                            |
| `frame`         | DataFrame 버전 제공용 필드 (기본 사용 시 None)    | 생략 가능                                             |
| `feature_names` | 각 픽셀 위치 이름 (예: pixel_0_0 ~ pixel_7_7) | `['pixel_0_0', 'pixel_0_1', ..., 'pixel_7_7']`    |
| `target_names`  | 분류 가능한 숫자 목록 `[0~9]`                  | `[0, 1, ..., 9]`                                  |
| `images`        | 원본 이미지 데이터 (8x8 배열)                   | `digits.images[0] → 2차원 이미지 배열`                   |
| `DESCR`         | 데이터 설명서 (긴 문자열)                       | `print(digits.DESCR)`                             |

---
### 2. 입력(X)과 정답(y) 나누기


우리는 `load_digits()`로 불러온 손글씨 숫자 데이터에서
- X = 입력 데이터(이미지의 픽셀 값들)
- y = 정답 데이터(이미지가 실제로 어떤 숫자인지)를 분리해서 머신러닝 모델에 넣을 준비를 합니다.
```python
# X : 입력 데이터
# 각 숫자 이미지는 8x8 픽셀 → 총 64개의 숫자로 펼쳐진 상태
X = digits.data         # 각 숫자 이미지 (8x8 → 64개 픽셀 값)

# y : 정답(라벨)
# 각 이미지가 어떤 숫자인지 (0~9)
y = digits.target       # 해당 숫자 (0~9)

# 이줄이 없으면 모든행이 생략되서 출력됩니다.
np.set_printoptions(threshold=np.inf)

# 전체 입력 데이터 출력 (학습용으로는 보통 출력 안 함, 구조 확인용)  
print("X shape:", X.shape)  
print("y shape:", y.shape)  
print("X sample:", X[:2])  
print("y sample:", y[:20])  
```

✅ X (입력 데이터)
- `X`에는 손글씨 숫자 이미지가 들어있습니다.
- 하지만 이미지는 컴퓨터가 바로 학습할 수 있게 숫자(픽셀 값)로 바뀌어 들어있습니다.

왜 64개냐?
- digits 이미지는 8 × 8 = 64픽셀
- 각 픽셀의 밝기(강도)를 숫자로 가진다고 생각하면 됩니다.
    
즉,
- 1개의 이미지 = 64개의 숫자(픽셀 강도값)
- 여러 이미지가 모이면 = (이미지 개수, 64) 형태가 됩니다.


✅ y (정답 데이터)
- `y`에는 각 이미지가 실제로 어떤 숫자인지 정답 라벨(0~9) 이 들어있습니다.


? 왜 X는 대문자고 y는 소문자냐? 관례(자주 쓰는 약속) 입니다.
X가 대문자인 이유
- 입력 데이터 `X`는 보통 2차원(행렬)입니다.
- 그래서 수학/머신러닝 관례로 대문자 `X`를 많이 사용합니다.
    
예:
- `X.shape = (1797, 64)`
    - 1797개의 샘플(이미지)
    - 각 샘플은 64개의 특징(feature)

y가 소문자인 이유
- 정답 데이터 `y`는 보통 1차원(벡터)입니다.
- 그래서 관례로 소문자 `y`를 많이 사용합니다.
    
예:
- `y.shape = (1797,)`
    - 이미지 1797개 각각에 대응하는 정답 숫자 1개씩
✅ 정해진 법칙은 아니지만, 머신러닝에서 가장 흔한 표기 방식입니다.

출력결과
![[Pasted image 20260223194300.png]]

```
X shape: (1797, 64)  # 0부터 9까지의 숫자 이미지들이 섞여 있는데, 전부 합쳐서 1797개
y shape: (1797,) # 이미지 1797장 → 정답 1797개
```
의미
- `1797` → 총 1797장의 숫자 이미지가 있다.
- `64` → 한 이미지가 8x8이라서 픽셀값이 64개다.
- `y`는 이미지 한 장당 정답 숫자 1개씩만 있으면 되니까 `(1797,)` 형태다.  

![[Group 36.png]]

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
### 2-1. 이미지 시각화
```python
# 이미지와 그래프를 시각화하기 위한 라이브러리
import matplotlib.pyplot as plt

# digits.images는 8x8 형태의 원본 이미지 데이터
# 첫 번째 숫자 이미지를 화면에 출력
plt.matshow(digits.images[0], cmap='gray') # 첫 번째 숫자 이미지 출력

# 해당 이미지의 실제 숫자 라벨 표시
plt.title(f"Label: {digits.target[0]}")

plt.show()
```

숫자 '0' 그림이 회색 픽셀로 출력
![[Pasted image 20250727175559.png]]

---
### 3. 학습용 / 테스트용 데이터 분리
전체 데이터를 학습용(train) 과 시험용(test) 으로 나누기 

머신러닝은 “공부(학습)”만 잘하면 끝이 아니라,  
처음 보는 문제(새 데이터)도 잘 맞히는지 확인해야 합니다.

그래서 데이터를 2개로 나눕니다.
- train(학습용): 모델이 공부하는 데이터
- test(시험용): 공부에 쓰지 않고, 시험처럼 성능을 평가하는 데이터

```python
# 전체 데이터 중
# - 80%는 학습용(train)
# - 20%는 테스트용(test)
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,      # 테스트 데이터 비율
    random_state=42     # 항상 같은 결과가 나오도록 고정
)
```
- 전체 데이터 중 80%는 학습용, 20%는 테스트용으로 나누기
- `random_state=42`는 결과를 고정하기 위해 사용

digits 데이터가 1797장이니까 대략 이렇게 나뉩니다:
- train ≈ 1437개
- test ≈ 360개

| 파라미터              | 의미                           |
| ----------------- | ---------------------------- |
| `test_size=0.2`   | 전체 데이터 중 20%를 시험용(test)으로 사용 |
| `random_state=42` | 데이터 섞을 때 사용하는 시드값 (결과 고정)    |
`random_state=42` 뜻
`train_test_split()`은 데이터를 **무작위로 섞은 뒤** 나눕니다.
그런데 무작위로 섞으면:
- 실행할 때마다 train/test에 들어가는 데이터가 바뀜
- 그래서 정확도도 조금씩 바뀔 수 있음

그래서 `random_state=42`를 주면:
> 항상 똑같이 섞고, 똑같이 나누게 만들어서  
> 실행할 때마다 결과가 같게(재현 가능하게) 됩니다.

시험지를 섞을 때, 섞는 방식(규칙)을 고정해 두는 것

---
### 4. 모델 생성 및 학습

모델(model)을 만들고 → 데이터로 학습시키는 것
```python
# Decision Tree 분류 모델 생성
model = DecisionTreeClassifier(random_state=42)
```
결정 트리(Decision Tree)라는 알고리즘을 사용하겠다고 선언하는 단계입니다.

학습용 데이터로 모델 학습
```python
# (입력 X_train → 정답 y_train)
model.fit(X_train, y_train)
```
입력(X_train)과 정답(y_train)을 동시에 보여주면서 모델을 훈련시킵니다.

fit 이 실제로 하는 일
```
이 이미지 데이터(X_train)는 이런 모양이고,  
정답(y_train)은 이 숫자야.  
  
이 관계를 스스로 학습해.
```
모델은 내부적으로:

✔ 어떤 픽셀 패턴이 어떤 숫자인지  
✔ 어떤 조건으로 나누면 잘 맞는지 를 계산해서 규칙을 만듭니다.

---
### 5. 예측 및 정확도 평가

시험용 문제(X_test)를 모델에게 주고 정답을 맞춰보게 하는 것
```python
# 테스트 데이터로 숫자 예측
y_pred = model.predict(X_test)

# 실제 정답(y_test)과 예측값(y_pred)을 비교해서 정확도 계산
accuracy = accuracy_score(y_test, y_pred)

print("정확도:", accuracy_score(y_test, y_pred))
```
- 학습된 모델로 테스트 데이터 예측  
- 예측 결과와 실제 정답을 비교해 정확도(accuracy) 계산
- `model.predict(X_test)`는 머신러닝에서 모델이 테스트 데이터를 입력받아 예측 결과를 출력하는 핵심 메소드

`model`	
	학습된 머신러닝 모델 (예: DecisionTreeClassifier, RandomForestClassifier, 등)
`.predict()` : 답안 작성	
	입력 데이터를 기반으로 클래스(또는 숫자)를 예측하는 함수
`X_test`	
	예측에 사용할 데이터 (입력 값들) : 시험 문제
`y_pred`	
	예측 결과 (예: 클래스 번호, 회귀 값 등) : 모델이 제출한 답

predict가 하는 일
```
이건 처음 보는 숫자 이미지들이야.  
각 이미지가 어떤 숫자인지 맞춰봐.
```
그러면 모델은:
✔ 학습했던 규칙을 사용해서  
✔ 각 이미지의 숫자를 예측 결과가 `y_pred`에 저장됩니다.

정확도 계산 (Accuracy) : 실제 정답 vs 모델 정답 비교
```python
accuracy = accuracy_score(y_test, y_pred)

# 정확도 결과
정확도: 0.8416666666666667
```
✔ `y_test` = 진짜 정답지  
✔ `y_pred` = 모델이 맞춘 답
즉 84% 맞춤

---
### 5-1. (중요) 전체 데이터로 최종 학습  
```python
final_model = DecisionTreeClassifier(random_state=42)  
final_model.fit(X, y) # ✅ 전체 데이터로 재학습  
```
지금까지 평가가 끝났으니, 모든 데이터로 다시 공부시키는 단계

그런데 왜 다시 학습할까요?
시험이 끝났기 때문입니다 이제 목적이 바뀝니다 

❌ 성능 평가용 모델이 아니라  
✅ 실제 사용용 모델 만들기 그래서 버리지 말고 전체 데이터를 다 사용해서 최종 모델 생성
✔ 데이터가 많을수록 모델이 더 잘 배움  
✔ 실제 배포 모델은 항상 전체 데이터 사용


### 5-2. 모델 저장 (.pkl) 
```python
import joblib  
  
joblib.dump(final_model, "digits_model.pkl")  
print("✅ 최종 모델 저장 완료: digits_model.pkl")  
```
학습 완료된 모델을 파일로 저장 : 공부 끝난 AI → 하드디스크에 저장


### 5-3. 저장된 모델 로드 테스트 (에러 없는지 확인)  
```python
idx = 1 # ✅ 보고 싶은 샘플 번호 (0, 1, 2 ...)  

loaded_model = joblib.load("digits_model.pkl")  
print("✅ 로드 테스트 예측:", loaded_model.predict([digits.data[0]]))
```
저장된 모델을 다시 메모리로 불러오기

왜 이걸 하냐면:
✔ 파일이 정상 저장되었는지 확인  
✔ 나중에 서버/앱에서 사용할 방식과 동일

`[0]` 의 진짜 의미
```python
loaded_model.predict([digits.data[idx]])[0]
```
`[0]` → 첫 번째 결과로 이미지 1장만 예측해줘라는 뜻입니다.

---
### 6. 이미지 1개 직접 예측해보기
```python
plt.matshow(digits.images[idx], cmap="gray")  
plt.title(f"Label: {digits.target[idx]}")  
plt.show()  
```
- 모델이 예측할 숫자 이미지 1장을 회색조로 출력해서 확인

---
예측 결과 확인
```python
print("실제:", digits.target[idx])  # 두 번째 이미지 선택 (1)번 이미지

# 이미지 1장 넣고 숫자 맞춰보기
print("예측(최종모델):", final_model.predict([digits.data[idx]])[0]) 

# 정답 보여주기
print("예측(로드모델):", loaded_model.predict([digits.data[idx]])[0]) # 예측 한 개
```
- 0번째 이미지의 정답(label)과 모델의 예측값을 나란히 출력  
- 잘 맞추면 모델이 해당 숫자를 정확히 예측한 것!

결과
```
실제: 1  # 실제 이미지
예측(최종모델): 1 # 이미지 1장
예측(로드모델): 1 # 결과 1
```

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
  
# dict_keys(['data', 'target', 'frame', 'feature_names', 'target_names', 'images', 'DESCR'])  
# ✅ 참고:  
# - data : (N, 64) 형태의 "펼쳐진(flatten) 입력 데이터"  
# - images : (N, 8, 8) 형태의 "원본 이미지"  
# - target : (N,) 형태의 정답 라벨(0~9)


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
# ✅ 참고:  
# - threshold=np.inf 는 "배열 출력 생략(...)"을 하지 않게 만드는 옵션  
# - 현재 코드는 X 전체를 출력하지 않고 일부(X[:2])만 출력하므로  
# 실습에 큰 영향은 없지만, '배열 출력 정책'을 명시해두는 의미가 있음  
  
# 전체 입력 데이터 출력 (학습용으로는 보통 출력 안 함, 구조 확인용)  
print("X shape:", X.shape)  
print("y shape:", y.shape)  
print("X sample:", X[:2])  
print("y sample:", y[:20])  
# ✅ 체크 포인트:  
# - X shape가 (1797, 64) 처럼 나오면 정상 (digits 데이터는 1797개 샘플)  
# - y shape가 (1797,) 처럼 나오면 정상  
# - X는 0~16 사이의 픽셀값(스케일)로 구성된 64개 특징(feature) 벡터


# ==============================
# 2-1. 이미지 시각화
# ==============================

# digits.images는 8x8 형태의 원본 이미지 데이터  
# 첫 번째 숫자 이미지를 화면에 출력  
plt.matshow(digits.images[0], cmap="gray")  
# ✅ 참고:  
# - matshow는 "행렬(2D 배열)"을 이미지처럼 보여줌  
# - cmap="gray"는 회색조로 표시(숫자 이미지는 흑백이므로 gray가 직관적)  
  
# 해당 이미지의 실제 숫자 라벨 표시  
plt.title(f"Label: {digits.target[0]}")  
  
plt.show()  
# ✅ 여기까지는 "데이터가 맞게 들어왔는지" 육안 확인 단계


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
# ✅ 핵심 개념:  
# - X_train / y_train : 모델이 "학습"할 데이터  
# - X_test / y_test : 학습에 사용하지 않고 "평가"에만 쓰는 데이터  
# - random_state=42 : 매번 실행해도 같은 분리 결과(재현성) 보장


# ==============================
# 4. 모델 생성 및 학습
# ==============================

# Decision Tree 분류 모델 생성  
model = DecisionTreeClassifier(random_state=42)  
# ✅ 참고:  
# - DecisionTreeClassifier는 규칙(분기)을 만들어 분류하는 모델  
# - random_state는 트리 생성 과정에서의 난수 요소를 고정(재현성)  
  
# 학습용 데이터로 모델 학습  
# (입력 X_train → 정답 y_train)  
model.fit(X_train, y_train)  
# ✅ fit()은 "학습" 단계:  
# - X_train의 패턴과 y_train(정답)을 보고  
# - 숫자를 구분하는 규칙을 내부에 학습함


# ==============================
# 5. 예측 및 정확도 평가
# ==============================

# 테스트 데이터로 숫자 예측  
y_pred = model.predict(X_test)  
# ✅ predict()는 "추론/예측" 단계:  
# - X_test를 보고 모델이 판단한 숫자(0~9)를 반환  
  
# 실제 정답(y_test)과 예측값(y_pred)을 비교해서 정확도 계산  
accuracy = accuracy_score(y_test, y_pred)  
# ✅ accuracy_score:  
# - (맞춘 개수 / 전체 개수) = 정확도  
# - 분류 문제에서 가장 기본적인 성능 지표  
  
print("정확도:", accuracy)  
# ✅ 이 정확도는 "train으로 학습한 model"의 test 성능(일반화 성능)을 의미


# ==============================  
# 5-1. (중요) 전체 데이터로 최종 학습  
# ==============================  
# ✅ 의미:  
# - 위에서 test로 성능 확인을 했으니,  
# - 실제 저장/배포 목적이라면 전체 데이터(X, y)를 사용해 최종 모델을 한 번 더 학습하는 패턴을 사용함  
# - (평가용 모델 model)과 (최종 모델 final_model)을 역할로 분리하는 구조  
  
final_model = DecisionTreeClassifier(random_state=42)  
final_model.fit(X, y) # ✅ 전체 데이터로 재학습  
# ✅ 주의:  
# - final_model은 "평가를 위해 분리해둔 test까지 포함"하여 학습하므로  
# - 더 많은 데이터를 활용해 학습하지만, 이 final_model로는 정확도를 다시 계산하지 않는 것이 일반적  
# (평가 기준이 흐려지기 때문)
  
  
# ==============================  
# 5-2. 모델 저장 (.pkl)  
# ==============================  
# ✅ 모델 저장 목적:  
# - 학습된 모델을 파일로 저장해두면  
# - 다음에 다시 학습하지 않고도 로드해서 바로 예측할 수 있음  
  
import joblib  
# ✅ joblib:  
# - sklearn 모델(대형 numpy 배열 포함)을 파일로 저장/로드할 때 자주 사용하는 도구  
  
joblib.dump(final_model, "digits_model.pkl")  
print("✅ 최종 모델 저장 완료: digits_model.pkl")  
# ✅ 여기서 저장되는 것은 model이 아니라 final_model임(전체 데이터로 학습된 최종 모델)
  
  
# ==============================  
# 5-3. 저장된 모델 로드 테스트 (에러 없는지 확인)  
# ==============================  
# ✅ 로드 테스트 목적:  
# - 파일로 저장한 모델이 실제로 잘 열리고,  
# - predict가 정상 동작하는지 확인(배포 전 필수 점검)  
  
# 첫 번째 숫자 이미지 다시 출력  
idx = 1 # ✅ 보고 싶은 샘플 번호 (0, 1, 2 ...)  
# ✅ idx:  
# - 아래의 이미지 출력 / 정답 / 예측이 모두 같은 샘플을 가리키도록 통일하는 용도  
  
loaded_model = joblib.load("digits_model.pkl")  
print("✅ 로드 테스트 예측:", loaded_model.predict([digits.data[idx]])[0])  
# ✅ 참고:  
# - loaded_model은 파일에서 다시 불러온 모델  
# - final_model과 같은 결과가 나와야 정상(같은 모델을 저장/로드했기 때문)  
# - predict는 2차원 입력을 기대하므로 [digits.data[idx]]처럼 리스트로 감싸줌

# ==============================
# 6. 이미지 1개 직접 예측해보기
# ==============================
# ✅ 이 블록의 목적:  
# - 사람이 보는 이미지(8x8)와  
# - 모델 입력(64개 특징) / 정답 / 예측 결과를 한 번에 대응시켜 확인하기  
  
  
plt.matshow(digits.images[idx], cmap="gray")  
plt.title(f"Label: {digits.target[idx]}")  
plt.show()  
# ✅ 위 출력 이미지와 아래 실제/예측이 같은 idx를 공유하므로 혼동 없음  
  
print("실제:", digits.target[idx])  
print("예측(최종모델):", final_model.predict([digits.data[idx]])[0])  
print("예측(로드모델):", loaded_model.predict([digits.data[idx]])[0])  
# ✅ 해석:  
# - 예측(최종모델) == 예측(로드모델) 이면 저장/로드가 제대로 된 것  
# - 실제와 예측이 같으면 해당 샘플을 맞춘 것
```

(2) 모델 저장 (joblib 사용)
```python
import joblib

joblib.dump(final_model, "digits_model.pkl")
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

--- 
### Scikit-learn 사용 흐름도
```
웹크롤링/수집 → 전처리 → 테이블(DB/CSV) 저장 → 학습 데이터로 모델 학습 → 모델 저장 → 서비스에서 새 데이터 들어오면 추론 → 결과 저장/응답
```

간단한 예시: “리뷰 긍/부정 자동 분류”
1) 외부 데이터(크롤링)
- 쇼핑몰/블로그/커뮤니티에서 **리뷰 텍스트** 수집
- 함께 저장할 것: `상품ID, 작성일, 리뷰본문, 평점(있으면)`
    
2) 전처리(학습용 형태로 변환)
- 텍스트 정리: 이모지/특수문자 제거, 공백 정리
- 특징 만들기(Feature):
    - 가장 흔한 방법: “단어 기반 벡터(빈도/가중치)” 같은 형태로 바꿈
        
- 정답(label) 만들기(가능한 경우):
        - 평점이 있으면: 4~5점=긍정, 1~2점=부정처럼 라벨 생성
    - 라벨이 없으면: 일단 키워드/군집 같은 분석부터 시작
        

3) 테이블(DB)에 저장
- `raw_reviews` (원본)
- `clean_reviews` (정제본)
- `features` (벡터/특징) — 보통은 파일/피클로 저장하거나, 벡터는 DB에 안 넣고 “만들 수 있게” 파이프라인만 둠
- `labels` (긍/부정)
    
4) 모델 학습 & 저장
- 테이블에서 학습용 데이터를 뽑아서 모델 학습
- “전처리(벡터화) + 모델”을 **세트로 저장** (이게 실무에서 핵심)
    
5) 서비스 추론 연결
- 새 리뷰가 들어오면:
    - 같은 전처리 → 같은 방식으로 특징 변환 → 모델로 예측
- 예측 결과를 DB에 저장하거나 API로 응답
    

---

흐름도(간단 버전)
```
[웹/외부소스]  
     |  
     v  
[크롤링/수집] ---> (원본 저장) ---> DB: raw_table  
     |  
     v  
[전처리/정제] ---> (정제본 저장) ---> DB: clean_table  
     |  
     v  
[특징추출(Feature)]  
     |  
     v  
[모델 학습] ---> [모델+전처리 저장(.pkl 등)]  
     |  
     v  
------------------- 운영/서비스 -------------------  
     |  
[새 데이터 입력(API/배치)]  
     |  
     v  
[동일 전처리/특징추출]  
     |  
     v  
[추론(예측)]  
     |  
     v  
[결과 저장/응답] ---> DB: prediction_table / API Response
```

---


## `1)` 표(숫자/카테고리) 데이터: “예측/분류”가 제일 실무적

**뭘 만들 수 있나**
- 이탈/재구매 예측, 대출/사기 탐지, 고객 등급 분류, 매출/수요 예측, 리드 스코어링
- 운영에서는 “이번 고객/거래가 위험한가?”, “다음 달 매출은?” 같은 형태
    

필요 데이터(예시)
- 입력(X): 고객/거래의 수치들(구매금액, 방문횟수, 나이대, 카테고리 등)
- 정답(y): 예측하고 싶은 결과(이탈=1/0, 사기=1/0, 매출 금액 등)
    

파인튜닝/학습이 필요한가
- Scikit-Learn은 보통 사전학습 모델을 ‘파인튜닝’ 하는 개념이 아니라, 내 데이터로 모델을 “학습(fit)” 합니다.
- 즉, 정답(label)이 있으면 학습 필요가 기본입니다.
    
---

## `2)` 텍스트(리뷰/문의/댓글): “감정분석 + 분류 + 키워드”가 바로 서비스로 연결

뭘 만들 수 있나
- 리뷰 긍/부정/중립 분류, CS 문의 자동 분류(환불/배송/불량), VOC(고객의 소리) 트렌드, 키워드 요약
- 운영팀이 “요즘 불만이 뭐가 늘었지?”를 바로 볼 수 있음

필요 데이터(예시)
- 입력(X): 텍스트(리뷰/문의 내용)
- 정답(y): 감정 라벨(긍/부정 등) 또는 문의 카테고리 라벨
- 키워드 분석은 정답 없이도 가능(라벨 없어도 “자주/중요 단어” 뽑기)

파인튜닝/학습이 필요한가
- 감정/문의 “분류”는 라벨이 있으면 학습 필요(Scikit-Learn 방식)
- 라벨이 없으면: 키워드/토픽/클러스터링처럼 “요약/분석” 쪽으로 갑니다.
    

---

## `3)` 이미지(검수/인식): Scikit-Learn도 가능하지만 “현업은 딥러닝이 많음”

**뭘 만들 수 있나**
- 간단한 불량/정상, 문서 스캔 분류, 단순 패턴 분류
- 당신이 했던 digits처럼 “이미지를 숫자 특징으로 펼쳐서 분류”

**필요 데이터(예시)**
- 입력(X): 이미지 → (픽셀값/특징으로 변환된 벡터)
- 정답(y): 라벨(불량/정상, 종류 A/B 등)
    
파인튜닝/학습이 필요한가
- Scikit-Learn으로 하면 라벨 기반 학습이 기본

- 다만 실무에서 이미지 정확도가 중요하면 보통 Hugging Face/딥러닝 사전학습 모델을 쓰고, 필요 시 파인튜닝으로 성능 올립니다(비용↑).

---

## `4)` “정답이 없는” 데이터: 군집/이상탐지/세그먼트가 실무에서 자주 씀

뭘 만들 수 있나
- 고객 세그먼트(비슷한 고객끼리 묶기)
- 이상치 탐지(갑자기 튀는 거래/트래픽/매출)
- 유사도 기반 추천/검색(비슷한 상품/문서 찾기)
    
필요 데이터(예시)
- 입력(X): 고객 특징, 행동 로그, 거래 로그, 텍스트 임베딩 등
- 정답(y): 없음(또는 일부만 있음)
    
학습이 필요한가
- “정답 학습”은 아니지만, 군집/이상탐지도 데이터로 ‘모델을 맞추는 과정(fit)’은 필요합니다(라벨 없이 맞추는 학습이라고 보면 돼요).
    

---

## `5)` 그럼 “파인튜닝”은 언제 하냐?

01 Scikit-Learn 시작하기 - 아이리스꽃
- Scikit-Learn: 비교적 가벼운 모델 → 내 데이터로 학습(fit) 해서 바로 씀 (CPU 중심, 비용 낮음)
- Hugging Face(딥러닝): 거대한 사전학습 모델 → “그대로 추론만” 쓰거나, 더 필요하면 파인튜닝(비용 큼, GPU/VRAM 고려)

실무 판단 기준(핵심만)
- 데이터가 작고/빨리 MVP: Scikit-Learn으로 베이스라인(학습해서 씀)
- 정확도가 매우 중요 + 데이터 충분 + 예산/시간 있음: HF 사전학습 모델 + (필요 시) 파인튜닝
- 라벨이 없음: 키워드/군집/이상탐지부터 시작