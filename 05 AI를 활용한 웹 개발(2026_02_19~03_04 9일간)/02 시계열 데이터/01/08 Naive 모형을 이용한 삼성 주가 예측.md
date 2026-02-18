05 → 06 → 07 → 08은 하나의 시계열 학습 파이프라인
(05 정상성 변환 → 06 계절성 분해/STL → 07 차분 이후 이어지는 단계)

---
1️⃣ 왜 Naive 모델을 사용하는가?
- Naive 모델은 가장 단순한 시계열 예측 모델
- 과거 값을 그대로 미래 예측값으로 사용
- 실제 성능 목적 ❌
- 시계열 분석 전체 흐름을 이해하기 위한 기준선(Baseline) 모델

📌 이 단계의 핵심

> “잘 맞추는 것”이 아니라 시계열 예측 파이프라인을 끝까지 경험하는 것

---

2️⃣ Darts 라이브러리를 사용하는 이유
- 시계열 전용 라이브러리
- 전통 통계 모델 + 머신러닝 관점 평가 모두 지원
- 모델 학습 → 예측 → 평가 구조가 명확

⚠️ 설치 주의
- Windows 환경에서는 C++ 컴파일러 필요
- 오류 시 Visual Studio C++ Build Tools 설치

---
시계열 모델 학습 기본 Skeleton 패턴
```python
# =========================================================
# [Skeleton 08] 정상성 확보 후 시계열 모델 학습 패턴
# =========================================================

# ---------------------------------------------------------
# (0) 준비: 라이브러리
# ---------------------------------------------------------
from darts import TimeSeries  
from darts.models import NaiveSeasonal  
from darts.metrics import mse, rmse

import pandas as pd  
import plotly.express as px

# ---------------------------------------------------------
# (1) Pandas → Darts TimeSeries 변환
# ---------------------------------------------------------
# 핵심: 모델 입력용 자료구조 변환

series = TimeSeries.from_dataframe(  
df2,  
time_col="Date",  
value_cols="시가_diff", # 정상성 만족된 값 사용  
fill_missing_dates=True,  
freq="D"  
)

# ---------------------------------------------------------
# (2) Train / Test 분리 (시간 순서 유지!!)
# ---------------------------------------------------------
train, test = series.split_before(0.8)
# 앞 80% → 학습
# 뒤 20% → 검증

# ---------------------------------------------------------
# (3) 모델 선택 & 학습
# ---------------------------------------------------------
model = NaiveSeasonal(K=10) # 예: Naive baseline 모델  
model.fit(train)

# ---------------------------------------------------------
# (4) 예측 수행
# ---------------------------------------------------------
pred = model.predict(len(test))

# ---------------------------------------------------------
# (5) 성능 평가
# ---------------------------------------------------------
print("MSE :", mse(test, pred))  
print("RMSE :", rmse(test, pred))

# ---------------------------------------------------------
# (6) 시각화 (실무에서 매우 중요)
# ---------------------------------------------------------

df_pred = pred.to_dataframe().reset_index()  
df_pred["Label"] = "예측값"

df_real = test.to_dataframe().reset_index()  
df_real["Label"] = "실측값"

df_plot = pd.concat([df_real, df_pred])

px.line(df_plot, x="Date", y="시가_diff", color="Label")
```

패턴과 일치시킨 전체코드
```python
# ---------------------------------------------------------
# (0) 준비: 라이브러리
# ---------------------------------------------------------
import pandas as pd
import plotly.express as px

from darts import TimeSeries
from darts.models import NaiveSeasonal
from darts.metrics import mse, rmse


# ---------------------------------------------------------
# (1) Pandas → Darts TimeSeries 변환
# ---------------------------------------------------------
# 핵심: 모델이 이해할 수 있는 Darts 전용 자료구조로 변환
# 전제:
# - df2["Date"] : 날짜 컬럼
# - df2["시가_diff"] : 정상성 확보된 값(차분 결과)

series = TimeSeries.from_dataframe(
    df2,
    time_col="Date",
    value_cols="시가_diff",     # 정상성 만족된 값 사용
    fill_missing_dates=True,    # 빠진 날짜 자동 생성
    freq="D",                   # 일 단위 시계열
    fillna_value=1              # 생성된 날짜 값 대치 (실습 안정성용)
)


# ---------------------------------------------------------
# (2) Train / Test 분리 (시간 순서 유지!!)
# ---------------------------------------------------------
# 시계열 데이터는 반드시 시간 순서 유지가 핵심
# 앞 80% → 학습 / 뒤 20% → 검증

train, test = series.split_before(0.8)


# ---------------------------------------------------------
# (3) 모델 선택 & 학습
# ---------------------------------------------------------
# NaiveSeasonal:
# 과거 패턴을 그대로 반복하는 가장 단순한 베이스라인 모델

naive_model = NaiveSeasonal(K=10)    # 예시: 계절 주기 10 가정
naive_model.fit(train)


# ---------------------------------------------------------
# (4) 예측 수행
# ---------------------------------------------------------
# 테스트 구간 길이만큼 미래 예측

pred = naive_model.predict(len(test))


# ---------------------------------------------------------
# (5) 성능 평가
# ---------------------------------------------------------
# 예측값 vs 실제값 비교

print("MSE  :", mse(test, pred))
print("RMSE :", rmse(test, pred))


# ---------------------------------------------------------
# (6) 시각화 (실무에서 매우 중요)
# ---------------------------------------------------------
# 실제값 / 예측값 비교 그래프

df_pred = pred.to_dataframe().reset_index()
df_pred["Label"] = "예측값"

df_real = test.to_dataframe().reset_index()
df_real["Label"] = "실측값"

df_plot = pd.concat([df_real, df_pred])

px.line(df_plot, x="Date", y="시가_diff", color="Label")


# ---------------------------------------------------------
# (7) 모델 저장
# ---------------------------------------------------------
import pickle

with open("naive_model.pkl", "wb") as f:
    pickle.dump(naive_model, f)

print("모델 저장 완료")
```


---
(0) 준비: 라이브러리
```python
import pandas as pd
import plotly.express as px

from darts import TimeSeries
from darts.models import NaiveSeasonal
from darts.metrics import mse, rmse
```

(1) Pandas → Darts TimeSeries 변환
```python
series = TimeSeries.from_dataframe(
    df2,
    time_col="Date",
    value_cols="시가_diff",     # 정상성 만족된 값 사용
    fill_missing_dates=True,    # 빠진 날짜 자동 생성
    freq="D",                   # 일 단위 시계열
    fillna_value=1              # 생성된 날짜 값 대치 (실습 안정성용)
)

```

(2) Train / Test 분리 (시간 순서 유지!!)
```python
train, test = series.split_before(0.8)
```

(3) 모델 선택 & 학습
```python
naive_model = NaiveSeasonal(K=10)    # 예시: 계절 주기 10 가정
naive_model.fit(train)
```

(4) 예측 수행
```python
pred = naive_model.predict(len(test))
```

(5) 성능 평가
```python
print("MSE  :", mse(test, pred))
print("RMSE :", rmse(test, pred))
```

(6) 시각화 (실무에서 매우 중요)
```python
df_pred = pred.to_dataframe().reset_index()
df_pred["Label"] = "예측값"
```


```python
df_real = test.to_dataframe().reset_index()
df_real["Label"] = "실측값"
```


```python
df_plot = pd.concat([df_real, df_pred])
```


```python
px.line(df_plot, x="Date", y="시가_diff", color="Label")
```

