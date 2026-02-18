
---
## 1️⃣ Theta 모형이란?

Theta Model은
시계열 데이터를 두 개의 Theta 선형 성분(Theta Lines) 으로 분해한 뒤
각 성분을 예측하고 다시 결합하여 최종 예측값을 만드는 모델이다.

핵심 아이디어
![[Pasted image 20260201155912.png]]
👉 단순하지만 강력
👉 특히 단기 예측 + 추세가 있는 시계열에서 성능이 좋음

---
2️⃣ Theta 모형의 특징 요약

✅ 장점
- ETS보다 단순
- Naive 모델보다 훨씬 성능 우수
- 선형 + 일부 비선형 특성까지 포착 가능
- 구현과 해석이 쉬움

⚠️ 단점
- 음수 값이 포함된 시계열에는 바로 적용 불가
    - 필요 시 로그 변환, shift 등 전처리 필요

---

3️⃣ Theta 파라미터(theta)의 의미

|theta 값|의미|
|---|---|
|theta = 0|평균 수준만 반영|
|theta < 1|단기 변동성 강조|
|theta = 1|기본 형태|
|theta > 1|**추세를 더 강하게 반영** (장기 패턴 강조)|

👉 theta 값이 모델 성능에 큰 영향

---

4️⃣ 모델 생성 및 학습

(1) 라이브러리 불러오기
```python
from darts.models import Theta
```

(2) 모델 생성 & 학습
```python
theta_model = Theta(theta=0.5)
theta_model.fit(series1)
```

- `series1` : 이전 단계에서 만든 Darts `TimeSeries` 객체

---

5️⃣ 미래 예측 수행
```python
forecast_theta = theta_model.predict(30)
```

- 향후 30일 예측

DataFrame 변환 및 시각화
```python
p6 = forecast_theta.to_dataframe().reset_index()
p6['Label'] = '예측값'

p7 = pd.concat([df_hana1, p6])
px.line(p7, x='날짜_dt', y='종가', color='Label')
```

👉 실제값 vs 예측값 시각적 비교

---

6️⃣ 성능 평가 (Train / Test 분리)

(1) 시계열 분할
```python
train, test = series1.split_before(0.8)
```

- 앞 80% → 학습
- 뒤 20% → 테스트

(2) 예측 및 평가
```python
theta_model.fit(train)
forecast = theta_model.predict(len(test))
```

(3) 평가 지표
```python
from darts.metrics import mse, rmse

mse(test, forecast)
rmse(test, forecast)
```

- MSE: 제곱 오차
- RMSE: 실제 주가 단위 기준 오차 → 해석에 유리

---

7️⃣ Theta 값 최적화 (Grid Search 개념)
Theta 모델은 theta 값에 따라 성능 차이가 큼
→ 여러 theta 값을 시도하여 MAPE 기준 최적값 선택

(1) MAPE 정의
```python
from darts.metrics import mape
```

- 평균 절대 백분율 오차
- 예: MAPE = 5 → 평균적으로 5% 오차

---
(2) Theta 후보 값 생성
```python
theta_list = np.linspace(0.01, 3, 30)
```

---
(3) Grid Search 방식 반복 평가
```python
best_mape = float('inf')
best_theta = 0

for i in theta_list:
    theta_loop_model = Theta(theta=i)
    theta_loop_model.fit(train)

    forecast_loop = theta_loop_model.predict(len(test))
    model_mape = mape(test, forecast_loop)

    if best_mape > model_mape:
        best_mape = model_mape
        best_theta = i

print(best_theta, best_mape)
```

👉 가장 낮은 MAPE를 만드는 theta 값 선택

---
8️⃣ 정리: Theta 모델은 언제 쓰면 좋은가?

✅ 이런 경우 추천
- 주가처럼 추세가 존재하는 시계열
- 복잡한 딥러닝 이전 Baseline / 비교 모델
- ETS가 과하다고 느껴질 때

❌ 이런 경우 주의
- 음수 값이 많은 데이터
- 강한 비선형 + 외부 변수 의존도가 큰 경우

---
📌 전체 흐름 요약
```
시계열 데이터
   ↓
Theta 분해 (평활 + 추세)
   ↓
theta 값에 따른 예측
   ↓
MAPE / RMSE 평가
   ↓
최적 theta 선택
   ↓
최종 주가 예측
```




















---
## 1. Theta Model이란?

**Theta 모형**은

👉 시계열 데이터를 **두 개의 Theta 선형 성분(Theta lines)** 으로 분해한 뒤

👉 각각을 예측하고

👉 다시 **결합하여 최종 예측**을 만드는 시계열 예측 모델이다.

핵심 목적은:

- **추세(Trend)** 와
    
- **단기 변동(Noise / Fluctuation)**
    
    을 **간단하지만 효과적으로 분리**하는 것
    

---

## 2. 핵심 아이디어 (수식 관점)

Theta 모형의 기본 구조는 다음과 같다:

Yt=12(Yt(0)+Yt(2))Y_t = \frac{1}{2}\left(Y_t^{(0)} + Y_t^{(2)}\right)

Yt=21(Yt(0)+Yt(2))

- Yt(0)Y_t^{(0)}Yt(0)
    
    → **평활 성분**
    
    → 단순 지수 평활(Simple Exponential Smoothing)을 적용
    
    → 단기 변동성 제거
    
- Yt(2)Y_t^{(2)}Yt(2)
    
    → **추세 성분**
    
    → 시계열의 장기적인 방향성 반영
    

👉 두 성분을 평균내어 최종 예측값 생성

---

## 3. Theta 계수(θ)의 의미

Theta 값은 **시계열의 선형성을 얼마나 강조할지**를 결정한다.

|Theta 값|의미|
|---|---|
|θ = 0|평균 수준 위주의 데이터|
|θ < 1|단기 변동성 강조 → **단기 예측에 유리**|
|θ = 1|기본 수준|
|θ > 1|추세 강조 → **장기 패턴 반영**|

📌 실무에서는 **θ를 고정하지 않고 튜닝**하는 경우가 많다.

---

## 4. 모델 특징 요약

### ✅ 장점

- ETS보다 **구조가 단순**
- Naive 모델보다 **성능 우수**
- **단기 예측 + 추세 존재 데이터**에 특히 강함
- 계산 비용이 작음

### ⚠️ 단점

- **Y값이 음수이면 계산 불가**
    
    → 로그 변환, 시프트 변환 등으로 해결 필요
    
- 계절성이 강한 데이터에는 한계
    

---

## 5. Darts 라이브러리로 Theta 모델 적용 흐름

### (1) 모델 생성 & 학습

```python
from darts.modelsimport Theta

theta_model = Theta(theta=0.5)
theta_model.fit(series1)
```

---

### (2) 미래 예측

```python
forecast_theta = theta_model.predict(30)
```

- 30일 미래 주가 예측
- 결과는 `TimeSeries` 객체

---

### (3) 시각화

```python
p6 = forecast_theta.to_dataframe().reset_index()
p6['Label'] ='예측값'

p7 = pd.concat([df_hana1, p6])
px.line(p7, x='날짜_dt', y='종가', color='Label')
```

👉 실제값 vs 예측값을 한 그래프에서 비교

---

## 6. 모델 성능 평가

### (1) Train / Test 분리

```python
train, test = series1.split_before(0.8)
```

---

### (2) 예측 및 평가

```python
theta_model.fit(train)
forecast = theta_model.predict(len(test))

mse(test, forecast)
rmse(test, forecast)
```

- **MSE / RMSE**로 오차 크기 평가
- 값이 작을수록 성능 우수

---

## 7. Grid Search로 최적 Theta 값 찾기

### (1) 탐색할 Theta 후보 생성

```python
theta_list = np.linspace(0,3,30)
```

---

### (2) MAPE 기준 최적화

```python
best_mape =float('inf')
best_theta =0

for iin theta_list:
    model = Theta(theta=i)
    model.fit(train)
    forecast_loop = model.predict(len(test))
    model_mape = mape(test, forecast_loop)

if best_mape > model_mape:
        best_mape = model_mape
        best_theta = i

print(best_theta, best_mape)
```

📌 **MAPE (Mean Absolute Percentage Error)**

- 오차를 %로 해석 가능
- 서로 다른 모델 비교에 매우 유용

---

## 8. 전체 흐름 한 줄 요약

> Theta 모형은 시계열을 ‘부드러운 평균 성분 + 추세 성분’으로 나눠 예측하는, 구조는 단순하지만 단기 주가 예측에 강력한 모델이며, Theta 값을 Grid Search로 튜닝하면 성능을 더욱 끌어올릴 수 있다.