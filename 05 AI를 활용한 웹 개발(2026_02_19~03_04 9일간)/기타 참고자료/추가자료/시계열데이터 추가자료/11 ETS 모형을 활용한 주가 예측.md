**10번(앙상블 모델)** → 👉 **11번(ETS 모델)** 이 **연결된 후반부 심화 파트**인 거지.

---

1. 왜 ETS 모델을 사용하는가?

앞선 10번에서는
- 날짜를 연/월/일/요일로 쪼개서
- 시계열 문제를 회귀 문제로 변환해 해결했다.

하지만 이 방식은 한계가 있다.

|한계|설명|
|---|---|
|시간 순서 약화|랜덤 분할 기반|
|이론적 해석 부족|왜 그렇게 예측했는지 설명 어려움|
|시계열 구조 무시|추세·계절성 명시적 반영 ❌|

👉 그래서 정통 시계열 모델이 필요
👉 그중 대표가 ETS 모델

---

2. ETS 모델 개념 정리
**ETS = Error + Trend + Seasonality**

|구성 요소|의미|
|---|---|
|Error (E)|불규칙한 오차|
|Trend (T)|장기적인 상승·하락 추세|
|Seasonality (S)|요일·주기성 패턴|

ETS는
- 시계열을 구조적으로 분해해서 설명하고
- 각 요소를 가법(Additive) 또는 승법(Multiplicative)으로 결합한다고 가정한다.

---

3. 왜 darts 라이브러리를 사용하는가?
일반 `pandas` 데이터프레임은
👉 시계열 전용 모델이 기대하는 구조가 아님

그래서 darts의 `TimeSeries` 객체로 변환한다.
```python
from darts import TimeSeries

series1 = TimeSeries.from_dataframe(
    df_hana,
    '날짜_dt',
    '종가',
    fill_missing_dates=True,
    fillna_value=True,
    freq='D'
)
```

이 코드의 의미
- 날짜 컬럼을 시간 축으로 고정
- 결측 날짜 자동 보완
- 일 단위(`D`) 시계열로 강제

📌 이 순간부터
➡️ 시간 순서가 모델에 의해 강제됨

---

4. 공변량(Covariates)이란?
ETS는 기본적으로
- 과거의 Y(종가)만 보고 예측한다.

하지만 실제 주가는
- 요일 효과*
- 날짜 주기성
    같은 외부 요인의 영향을 받는다.
    
👉 이를 반영하기 위해 공변량(covariates)를 추가

---

5. 날짜 속성을 공변량으로 생성
```python
from darts.utils.timeseries_generation import datetime_attribute_timeseries

cov = datetime_attribute_timeseries(
    series1,
    'day',
    cyclic=True,
    add_length=30
)
```

파라미터 해석 (중요)

|옵션|의미|
|---|---|
|`'day'`|날짜 기반 속성 사용|
|`cyclic=True`|요일·일자 = 원형 주기|
|`add_length=30`|미래 30일치 공변량 미리 생성|

📌 핵심 포인트

> 미래 예측 시점에도 공변량은 존재해야 한다

---

6. AutoETS 모델 생성
```python
from darts.models import AutoETS

ets_model = AutoETS(
    season_length=7,
    model='ZZZ'
)
```

여기서 `ZZZ`의 의미

|문자|의미|
|---|---|
|Z|자동 선택|
|A|가법(Additive)|
|M|승법(Multiplicative)|
|N|해당 요소 없음|

➡️ `ZZZ`

= Error / Trend / Seasonality 모두 자동으로 최적 선택

---

7. 모델 학습
```python
ets_model.fit(series1, future_covariates=cov)
```

- 종가 시계열 학습
- 날짜 기반 공변량을 함께 사용

👉 요일·주기 효과가 예측에 반영됨

---

8. 미래 예측 수행
```python
forecast_ets = ets_model.predict(
    30,
    future_covariates=cov
)
```

- 앞으로 **30일** 종가 예측
- 시계열 구조 유지
- 날짜 순서 보존

시각화:
```python
px.line(p5, x='날짜_dt', y='종가', color='Label')
```

- 실제값 vs 예측값 비교

---

9. 시계열 방식의 올바른 평가

ETS는 절대 랜덤 분할 ❌
```python
train, test = series1.split_before(0.8)
```

- 과거 80% → 학습
- 미래 20% → 테스트

```python
ets_model.fit(train, future_covariates=cov)
pred = ets_model.predict(len(test), future_covariates=cov)
```

---

10. 평가 지표
```python
from darts.metrics import mse, rmse

mse(test, pred)
rmse(test, pred)
```

📌 해석
- 값 자체보다 모델 간 비교 용도
- 머신러닝보다 낮을 수 있음 → 정상

---

11. ETS 모델의 장단점 정리

장점
- 시간 질서 보존
- 추세·계절성 해석 가능
- 이론 기반, 설명력 우수

단점
- 복잡한 비선형 패턴에는 약함
- 대규모 데이터에서는 느림
- 성능 최우선 목적에는 한계

---

핵심 요약
> ETS는
> 시계열을 구조적으로 분해하여 예측하는 전통 모델이며,
> 공변량을 통해 요일·주기 정보를 반영할 수 있다.
> 랜덤 분할이 아닌 시간 기준 평가가 필수이다.







---
## 🎯 목적

> 날짜 정보를 파생 변수로 바꿔서 주가 ‘증가’를 머신러닝으로 예측

- 시계열을 **전통 시계열 모델이 아니라**
- 👉 **회귀 문제(Regression)** 로 바꿔서 해결

---

## 1️⃣ Feature 설계 (가장 중요)

📌 **날짜는 그대로 쓰지 않는다 → 파생 변수 생성**

```python
df_hana['연도'] = df_hana['날짜_dt'].dt.year
df_hana['월']   = df_hana['날짜_dt'].dt.month
df_hana['일']   = df_hana['날짜_dt'].dt.day
df_hana['요일'] = df_hana['날짜_dt'].dt.day_name()
```

### 👉 왜?

- 모델은 **날짜 자체를 이해 못함**
- 대신 **패턴이 있는 정보(월, 요일)** 를 줘야 함

---

## 2️⃣ X / Y 정의

```python
X = df_hana[['연도','월','일','요일','거래량']]
Y = df_hana['증가']
```

- **X** : 날짜 파생 변수 + 거래량
- **Y** : 주가 증가량

---

## 3️⃣ 학습 / 검증 데이터 분리

```python
from sklearn.model_selection import train_test_split
X_train, X_test, Y_train, Y_test = train_test_split(
    X, Y, test_size=0.3, random_state=1234
)
```

---

## 4️⃣ 전처리 + 모델 파이프라인

### 🔹 숫자형 / 문자형 분리 처리

- 숫자: 결측치 → median
- 요일: One-Hot Encoding

```python
from sklearn.compose import make_column_transformer
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor

pipe1 = make_pipeline(SimpleImputer(strategy='median'))
pipe2 = make_pipeline(SimpleImputer(strategy='most_frequent'),
                      OneHotEncoder(handle_unknown='ignore'))

preprocess = make_column_transformer(
    (pipe1, ['연도','월','일','거래량']),
    (pipe2, ['요일'])
)

model_pipe = make_pipeline(
    preprocess,
    RandomForestRegressor()
)

model_pipe.fit(X_train, Y_train)
```

👉 **전처리 + 모델을 하나로 묶는 게 핵심**

---

## 5️⃣ 하이퍼파라미터 튜닝

```python
from sklearn.model_selection import GridSearchCV

hyper = {
 'randomforestregressor__max_depth': [3,4,5],
 'randomforestregressor__min_samples_split': [10,50],
 'randomforestregressor__n_estimators': [200]
}

grid_model = GridSearchCV(
    model_pipe,
    param_grid=hyper,
    cv=3,
    scoring='r2',
    n_jobs=-1
)

grid_model.fit(X_train, Y_train)
best_model = grid_model.best_estimator_
```

---

## 6️⃣ Feature Importance 확인 (시험 단골)

```python
df_importance = pd.DataFrame()
df_importance['X'] = best_model['columntransformer'].get_feature_names_out()
df_importance['value'] = best_model['randomforestregressor'].feature_importances_
```

👉 **어떤 날짜 요소가 중요한지 해석 가능**

---

## 7️⃣ 모델 평가

```python
from sklearn.metricsimport r2_score, mean_squared_error

Y_test_pred = best_model.predict(X_test)

r2_score(Y_test, Y_test_pred)
mean_squared_error(Y_test, Y_test_pred)
```

📌 결과

- R² ≈ **0.96** → 설명력 매우 높음
- 머신러닝 방식의 장점이 잘 드러남

---

# 11 ETS 모형을 활용한 주가 예측 (AutoETS)

> 이번엔 정통 시계열 모델

---

## 1️⃣ ETS 모델 개념

**ETS = Error + Trend + Seasonality**

|요소|의미|
|---|---|
|Error|불규칙 변동|
|Trend|추세|
|Seasonality|계절성|

✔ Additive / Multiplicative 자동 선택

✔ 통계 기반 시계열 모델

---

## 2️⃣ Darts 라이브러리 사용 이유

- 시계열 전용 구조
- **미래 공변량(future covariates)** 지원

---

## 3️⃣ 데이터 변환 (중요)

```python
from darts import TimeSeries

series1 = TimeSeries.from_dataframe(
    df_hana,
    '날짜_dt',
    '종가',
    fill_missing_dates=True,
    freq='D'
)
```

---

## 4️⃣ 날짜 기반 공변량 생성

```python
from darts.utils.timeseries_generation import datetime_attribute_timeseries

cov = datetime_attribute_timeseries(
    series1,
    'day',
    cyclic=True,
    add_length=30
)
```

📌 의미

- day(일자)를 **주기적(cyclic)** 으로 처리
- 예측 구간(30일)까지 미래 날짜 정보 제공

---

## 5️⃣ AutoETS 모델 학습

```python
from darts.models import AutoETS

ets_model = AutoETS(
    season_length=7,
    model='ZZZ'
)

ets_model.fit(series1, future_covariates=cov)
```

- ZZZ = Error / Trend / Seasonality 자동 선택

---

## 6️⃣ 예측

```python
forecast = ets_model.predict(30, future_covariates=cov)
```

---

## 7️⃣ 시각화

```python
px.line(p5, x='날짜_dt', y='종가', color='Label')
```

- 실제값 vs 예측값 비교

---

## 8️⃣ 시계열 방식 평가 (중요 차이)

```python
from darts.metrics import mse, rmse

train, test = series1.split_before(0.8)
ets_model.fit(train, future_covariates=cov)
pred = ets_model.predict(len(test), future_covariates=cov)

mse(test, pred)
rmse(test, pred)
```

📌 **RandomForest와 다르게**

- 시간 순서 유지
- 미래 데이터 절대 사용 ❌

---

# 🔥 한 줄 요약 비교 (시험용)

|구분|앙상블(RandomForest)|ETS|
|---|---|---|
|접근|머신러닝 회귀|전통 시계열|
|날짜 처리|파생 변수|시계열 구조|
|장점|높은 성능, 유연|해석력, 이론|
|단점|시간 순서 무시|복잡한 패턴 한계|