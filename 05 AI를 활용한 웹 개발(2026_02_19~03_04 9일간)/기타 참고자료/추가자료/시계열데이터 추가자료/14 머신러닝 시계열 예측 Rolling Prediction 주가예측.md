
---
🎯 문제 목적
- 과거 **n일(3일) 주가 데이터**를 입력값으로 사용
- 머신러닝 모델(RandomForest)을 이용해
- 
    **다음 날 주가를 예측**
- 예측값을 다시 입력으로 사용하여
    **여러 날(30일) 연속 예측(Rolling Prediction)** 수행
    

---

1️⃣ 데이터 로드 및 기본 확인
```python
df1 = pd.read_csv('hana_stock.csv')
df1.shape
df1.head()
```

- 데이터 크기: (107, 9)
- 날짜(`날짜_dt`)와 시가(`시가`) 사용

---

2️⃣ 예측에 사용할 컬럼 선택
```python
p1 = df1[['날짜_dt', '시가']]
```

- 머신러닝 입력 단순화
- **시가만으로 다음 시가 예측**

---

3️⃣ 시계열 Lag Feature 생성 (Data Shift)

핵심 개념

> 과거 데이터를 피처(feature) 로 만들어야 머신러닝 사용 가능
```python
p1['시가_D3'] = p1['시가']
p1['시가_D2'] = p1['시가'].shift(-1)
p1['시가_D1'] = p1['시가'].shift(-2)
p1['Target'] = p1['시가'].shift(-3)
```

📌 의미 정리

|컬럼|의미|
|---|---|
|시가_D3|3일 전 시가|
|시가_D2|2일 전 시가|
|시가_D1|1일 전 시가|
|Target|**다음 날 시가(예측 대상)**|

👉 **3일 Lag → 1일 미래 예측 구조**

---

4️⃣ 결측치 제거
```python
p2 = p1.dropna()
```

- shift로 인해 생긴 NaN 제거

---

5️⃣ Train / Test 분리 (시계열 방식)
```python
train = p2.iloc[:83]
test = p2.iloc[83:]
```

- 전체의 **앞 80% → 학습**
    
- 뒤 20% → 검증
    
    ❗ 시계열 데이터이므로 **랜덤 분할 ❌**
    

---

6️⃣ 입력(X) / 출력(Y) 정의
```python
X_train = train[['시가_D1','시가_D2','시가_D3']]
Y_train = train['Target']

X_test = test[['시가_D1','시가_D2','시가_D3']]
Y_test = test['Target']
```

---

7️⃣ 머신러닝 모델 + 하이퍼파라미터 탐색

모델 선택
- **RandomForestRegressor**
- 비선형 패턴 학습에 강함

Bayesian Search 적용
```python
from sklearn.ensemble import RandomForestRegressor
from skopt import BayesSearchCV
```

```python
hyper = {
    'max_depth': (3,5),
    'min_samples_split': (20,50),
    'n_estimators': [200]
}

bayes_model = BayesSearchCV(
    RandomForestRegressor(),
    hyper,
    n_iter=8,
    scoring='neg_mean_squared_error',
    n_jobs=-1
)

bayes_model.fit(X_train, Y_train)
best_model = bayes_model.best_estimator_
```

📌 목적

→ **과적합 방지 + 성능 최적화**

---

8️⃣ 모델 성능 평가
```python
from sklearn.metrics import mean_squared_error, r2_score
```

```python
Y_train_pred = best_model.predict(X_train)
Y_test_pred = best_model.predict(X_test)

r2_score(Y_train, Y_train_pred)
r2_score(Y_test, Y_test_pred)

mean_squared_error(Y_train, Y_train_pred)
mean_squared_error(Y_test, Y_test_pred)
```

📌 해석

- Train R² 높음 → 학습 잘 됨
- Test R² 확인 → 일반화 성능 점검
- MSE로 오차 크기 확인

---

9️⃣ Rolling Prediction (30일 연속 예측)

핵심 개념 ⭐
> 예측값을 다시 입력으로 사용
> → 미래로 굴러가며 예측

---

(1) 마지막 입력값 추출
```python
last_value = p2.tail(1)[['시가_D1','시가_D2','시가_D3']].values
```

---

(2) Rolling Prediction 로직
```python
predictions = []

X_col = X_train.columns
last_X = dict(zip(X_col, last_value[0]))

for i in range(30):
    X_new = pd.DataFrame([last_X])
    predict_value = best_model.predict(X_new)[0]
    
    predictions.append(predict_value)
    
    last_X = {
        '시가_D1': predict_value,
        '시가_D2': last_X['시가_D1'],
        '시가_D3': last_X['시가_D2']
    }
```

📌 여기서 제일 중요함

- **시가_D1 ← 예측값**
- **D2, D3는 한 칸씩 밀림**
- 이게 바로 **Rolling Prediction**

---

🔟 예측 날짜 생성
```python
start_day = train.head(1)['날짜_dt'].values[0]

date_range = pd.date_range(
    start=start_day,
    periods=30,
    freq='B'
)
```

- `B` → 영업일 기준

---

1️⃣1️⃣ 최종 예측 결과 정리
```python
pred_df = pd.DataFrame(predictions, columns=['Target'])
pred_df.index = date_range
pred_df
```

👉 **30일 미래 주가 예측 결과 완성**

---

✅ 14번 핵심 요약 한 줄

> 과거 3일 시가 → RandomForest로 다음 날 시가 예측 → 예측값을 다시 입력해 30일 미래 주가를 순차적으로 예측하는 머신러닝 기반 Rolling Prediction 시계열 모델

---
🔥 이 파트가 중요한 이유
- 통계 기반(ARIMA, ETS, Theta) ❌
- **머신러닝 기반 시계열 접근**
- 실제 실무에서 가장 많이 쓰는 구조:
    - Lag Feature
    - Walk-forward / Rolling Forecast
    - Tree 기반 모델







---
## 1️⃣ ETS 모델 개요

**ETS (Error–Trend–Seasonality)** 모델은 시계열을 다음 3요소로 분해하여 예측함

- **Error (오차)** : 불규칙한 잡음
- **Trend (추세)** : 장기적인 상승·하락
- **Seasonality (계절성)** : 주기적 패턴 (요일, 월, 분기 등)

👉 단순 평균/Naive 모델보다 **명시적으로 계절성과 추세를 반영**함

---

## 2️⃣ Additive / Multiplicative 구조

- **Additive**:
    
    → 계절 변동 폭이 일정할 때
    
    `y = Trend + Seasonality + Error`
    
- **Multiplicative**:
    
    → 값이 커질수록 변동 폭도 커질 때
    
    `y = Trend × Seasonality × Error`
    

`AutoETS(model="ZZZ")`

→ 데이터에 맞게 Additive / Multiplicative 구조를 자동 선택

---

## 3️⃣ darts 라이브러리 사용 이유

- 시계열 전용 객체(`TimeSeries`) 제공
- 미래 공변량(future covariates) 지원
- 통계 + 머신러닝 시계열 모델 통합 관리 가능

---

## 4️⃣ 데이터 준비

```python
from darts import TimeSeries
series1 = TimeSeries.from_dataframe(
    df_hana,
    time_col='날짜_dt',
    value_cols='종가',
    fill_missing_dates=True,
    freq='D'
)
```

- 날짜 인덱스 기반 시계열 변환
- 결측 날짜 자동 보정

---

## 5️⃣ 공변량(Covariates) 생성

```python
from darts.utils.timeseries_generation import datetime_attribute_timeseries

cov = datetime_attribute_timeseries(
    series1,
    attribute='day',
    cyclic=True,
    add_length=30
)
```

- 날짜의 **요일/일/월 같은 속성**을 설명 변수로 사용
- `add_length=30` → **미래 30일 예측 가능**

---

## 6️⃣ ETS 모델 학습 & 예측

```python
from darts.models import AutoETS

ets_model = AutoETS(season_length=7, model='ZZZ')
ets_model.fit(series1, future_covariates=cov)

forecast = ets_model.predict(30, future_covariates=cov)
```

- 주 단위 계절성(`season_length=7`)
- 향후 30일 주가 예측

---

## 7️⃣ 평가 (Train/Test)

```python
train, test = series1.split_before(0.8)

ets_model.fit(train, future_covariates=cov)
pred = ets_model.predict(len(test), future_covariates=cov)
```

### 평가 지표

- **MSE**
- **RMSE**

👉 예측 오차의 크기를 수치로 확인

---

## ✅ ETS 파트 핵심 요약

- 통계 기반 시계열 예측
- 추세 + 계절성 + 오차를 명확히 분리
- 날짜 속성을 공변량으로 활용 가능
- **해석 가능성**이 장점

---

---

# 13. 은행 주가 데이터 미션 풀이 (통계 검정)

## 미션 6️⃣

### ❓ 거래량과 가격 변수 간 상관성이 있는가?

### 1️⃣ 정규성 검정

```python
stats.normaltest(df['거래량'])
```

- p-value < 0.05
    
    👉 **정규분포 아님**
    

---

### 2️⃣ 상관분석 방법 선택

- 정규성 ❌ → **Spearman 상관계수** 사용

```python
df[['거래량','시가','종가','저가','고가']].corr(method='spearman')
```

---

### 3️⃣ 가설 검정

- 귀무가설(H₀): 상관관계 없음
- 대립가설(H₁): 상관관계 있음

```python
stats.spearmanr(df['거래량'], df['종가'])
```

### 📌 결과

- p-value > 0.05
    
    👉 **유의미한 상관관계 없음**
    

---

## 미션 7️⃣

### ❓ 2·3월 vs 4·5월 거래량 평균 차이 존재?

### 1️⃣ 데이터 분리

```python
df_23 = df[df['월'].isin([2,3])]
df_45 = df[df['월'].isin([4,5])]
```

---

### 2️⃣ 정규성 재검정

- 두 집단 모두 **정규성 X**

---

### 3️⃣ 검정 방법

- **Wilcoxon Rank-Sum Test**

```python
stats.ranksums(df_23['거래량'], df_45['거래량'])
```

### 📌 결과

- p-value > 0.05
    
    👉 **두 기간 거래량 차이 없음**
    

---

## ✅ 통계 미션 핵심 요약

- 정규성 → 검정 방법 결정의 핵심
- 주가 데이터는 대부분 **비정규**
- 평균 비교 전 반드시 **분포 확인**

---

# 14. 머신러닝 시계열 예측

## Rolling Prediction (Multi-Step Forecasting)

---

## 1️⃣ 개념 정리

**Rolling Prediction**

- 과거 n일 → 다음 1일 예측
- 예측값을 다시 입력으로 사용
- **여러 날을 순차적으로 예측**

---

## 2️⃣ Lag Feature 생성

```python
p1['시가_D3'] = p1['시가']
p1['시가_D2'] = p1['시가'].shift(-1)
p1['시가_D1'] = p1['시가'].shift(-2)
p1['Target']  = p1['시가'].shift(-3)
```

👉 **과거 3일 → 3일 뒤 가격 예측**

---

## 3️⃣ 결측치 제거 & 분할

```python
p2 = p1.dropna()

train = p2.iloc[:83]
test  = p2.iloc[83:]
```

---

## 4️⃣ 학습 데이터 구성

```python
X_train = train[['시가_D1','시가_D2','시가_D3']]
y_train = train['Target']
```

---

## 5️⃣ 모델 & 튜닝

```python
from sklearn.ensembleimport RandomForestRegressor
from skoptimport BayesSearchCV
```

- RandomForest + Bayesian Optimization
- 시계열에서도 **비선형 패턴 학습 가능**

---

## 6️⃣ 성능 평가

- **Train R² ≈ 0.87**
- **Test R² ≈ 0.61**

👉 과적합은 아니지만, 미래 예측 난이도 존재

---

## 7️⃣ 30일 Rolling Forecast

```python
last_value = p2.tail(1)[['시가_D1','시가_D2','시가_D3']]
```

- 하루 예측 → 입력 갱신 → 다음 날 예측
- 실제 실무에서 가장 많이 쓰는 방식

---

## ✅ 머신러닝 시계열 핵심 요약

- 시계열 → **회귀 문제로 변환**
- Lag feature가 핵심
- Rolling 방식은 오차 누적 가능
- ETS보다 예측력 ↑ / 해석력 ↓

---

# 전체 흐름 한 줄 요약

> ETS = 해석 중심의 통계 모델
> 
> **Rolling ML = 예측 중심의 머신러닝 모델**