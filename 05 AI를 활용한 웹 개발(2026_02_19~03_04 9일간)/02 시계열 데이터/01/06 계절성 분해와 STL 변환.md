🎯 이 문제에서 핵심

> 정상성을 만족하지 않는 시계열 데이터에 대해  계절성(Seasonality)을 구조적으로 분리·제거하여  통계 기반 시계열 모델에 적합한 형태로 만드는 과정을 학습합니다.

앞선 05번 문제에서 확인한 것처럼,
- Log 변환
- Box-Cox 변환 만으로는 삼성 주가 데이터의 정상성을 확보하지 못했습니다.

따라서 이번 단계에서는 시계열의 구조 자체를 분해하는 방법을 사용합니다.

1️⃣ 계절성 제거(Seasonal Decomposition) 개요

계절성 제거란?
- 시계열 데이터를 다음 요소로 분해합니다.
    - 추세(Trend)
    - 계절성(Seasonality)
    - 잔차(Residual)

이를 통해
- 데이터에 반복되는 패턴(계절성) 이 존재하는지 파악하고
- 필요 시 이를 제거하여 정상성에 가까운 시계열을 생성합니다.

---
2️⃣ Classical Decomposition (전통적 시계열 분해)

🔹 Additive Model (가법 모델)
```
시계열 데이터 = 추세 + 계절성 + 잔차
```

- 계절성의 크기가 일정한 경우에 사용합니다.
- 데이터 수준과 무관하게 동일한 폭으로 변동할 때 적합합니다.

---

🔹 Multiplicative Model (승법 모델)
```
시계열 데이터 = 추세 × 계절성 × 잔차
```

- 계절성의 크기가 데이터 수준에 비례하여 변동하는 경우에 사용합니다.
- 주가, 매출처럼 값이 커질수록 변동폭도 커지는 데이터에 적합합니다.

---
### 뼈대(Skeleton) 코드 패턴 
분해 → 계절성 제거 → ADF 재검정 패턴만 남긴 버전입니다. (주가 말고 다른 시계열에도 그대로 씁니다.)
```python
# =========================================================
# [Skeleton 06] 계절성 분해/제거 후 정상성(ADF) 재검정 패턴
# =========================================================

# (0) 준비
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.seasonal import seasonal_decompose, STL

def check_stationarity(series, name="data"):
    result = adfuller(series.dropna())
    print(f"[{name}] ADF Statistic :", result[0])
    print(f"[{name}] p-value       :", result[1])
    print("-" * 40)
    return result


# (1) 원본 시계열 준비
# ts = df["value"]  또는  ts = df2["시가"]
res_original = check_stationarity(ts, "original")


# (2-A) Classical Decomposition (Additive)
# decomp = seasonal_decompose(ts, period=주기, model="additive")
# ts_add_removed = ts - decomp.seasonal
# check_stationarity(ts_add_removed, "add_removed")


# (2-B) Classical Decomposition (Multiplicative)
# decomp = seasonal_decompose(ts, period=주기, model="multiplicative")
# ts_mul_removed = ts / decomp.seasonal
# check_stationarity(ts_mul_removed, "mul_removed")


# (3) STL Decomposition
# (보통 Date index 형태 권장: ts가 시계열 인덱스를 가지면 좋음)
# result = STL(ts, period=주기, seasonal=윈도우).fit()
# ts_stl_removed = ts - result.seasonal
# check_stationarity(ts_stl_removed, "stl_removed")


# (4) 판단
# p-value <= 0.05 이면 정상성(O)
# p-value >  0.05 이면 정상성(X) → 다음 후보(차분 등)로 넘어감
```


### 전체 코드 (계절성 분해 + STL로 “계절성 제거 후” ADF 재검정)
```python
# =========================================================
# ✅ 06 계절성 분해(Classical) + STL로 계절성 제거 후 정상성 재검정
# (0) 준비 → (1) 원본 ADF → (2-A) Additive → (2-B) Multiplicative → 
# (3) STL → (4) 판단
# =========================================================

# -----------------------------
# (0) 준비: 필요한 라이브러리 불러오기
# -----------------------------
import pandas as pd
import plotly.express as px

from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.seasonal import seasonal_decompose, STL


# ---------------------------------------------------------
# (0-1) ADF(정상성) 검정 결과를 보기 좋게 출력하는 헬퍼 함수
# ---------------------------------------------------------
def check_stationarity(series, name="data"):
    result = adfuller(series.dropna())
    print(f"[{name}] ADF Statistic :", result[0])
    print(f"[{name}] p-value       :", result[1])
    print("-" * 40)
    return result


# =========================================================
# (1) 원본 시계열 준비 + 정상성 확인
# =========================================================
# ✅ 전제: df2에는 최소한 아래 컬럼이 있어야 함
# - df2["Date"] : 날짜(datetime)
# - df2["시가"] : 값(주가 시가)

# ts는 “정상성 검정을 할 원본 시계열” 변수로 통일해서 사용
ts = df2["시가"]

# (1) 원본 정상성(ADF) 확인
res_original = check_stationarity(ts, "original")

# (선택) 원본 그래프 확인 (추세/변동 패턴을 눈으로 확인)
px.line(df2, x="Date", y="시가", title="Original")


# =========================================================
# (2-A) Classical Decomposition (Additive)
# =========================================================
# 가법(Additive) 분해 가정:
#   시계열 = 추세 + 계절성 + 잔차
#
# “계절성이 정상성을 깨는 원인일 수도 있다”라고 의심되면,
#  → 분해해서 seasonal(계절성)만 빼고
#  → 계절성이 제거된 시계열로 ADF를 다시 검사한다.

# (2-A-1) Additive 분해 수행
decomp_add = seasonal_decompose(
    ts,
    period=10,  # 예시: 강의에서 사용한 주기 값(데이터 특성에 맞게 조정 가능)
    model="additive"
)

# (2-A-2) 계절성 제거(가법): 원본 - seasonal
ts_add_removed = ts - decomp_add.seasonal
df2["시가_add_season_removed"] = ts_add_removed  # (선택) df에 저장

# (선택) 계절성 제거 후 그래프 확인
px.line(df2, x="Date", y="시가_add_season_removed", title="Additive seasonal removed")

# (2-A-3) Additive 계절성 제거 후 정상성 재검정
res_add = check_stationarity(df2["시가_add_season_removed"], "additive_removed")


# =========================================================
# (2-B) Classical Decomposition (Multiplicative)
# =========================================================
# 승법(Multiplicative) 분해 가정:
#   시계열 = 추세 × 계절성 × 잔차
#
# 값의 크기에 비례해서 변동폭이 커지는 데이터(레벨이 커질수록 계절성도 커짐)라면
# 승법 모델이 더 맞을 수 있다.
#
# 승법에서 “계절성 제거”는:
#   원본 / seasonal

# (2-B-1) Multiplicative 분해 수행
decomp_mul = seasonal_decompose(
    ts,
    period=10,             # 예시 주기
    model="multiplicative"
)

# (2-B-2) 계절성 제거(승법): 원본 / seasonal
ts_mul_removed = ts / decomp_mul.seasonal
df2["시가_mul_season_removed"] = ts_mul_removed  # (선택) df에 저장

# (선택) 계절성 제거 후 그래프 확인
px.line(df2, x="Date", y="시가_mul_season_removed", title="Multiplicative seasonal removed")

# (2-B-3) Multiplicative 계절성 제거 후 정상성 재검정
res_mul = check_stationarity(ts_mul_removed, "mul_removed")


# =========================================================
# (3) STL Decomposition (LOESS 기반)
# =========================================================
# STL은 전통적 분해보다 “더 유연하게” 계절성/추세를 분리하는 방법(LOESS 기반).
# 보통 Date를 index로 두고 수행하면 시계열 형태가 명확해져서 관리가 쉽다.

# (3-1) Date를 index로 설정한 시계열 만들기
p4 = df2[["Date", "시가"]].set_index("Date")
ts_indexed = p4["시가"]

# (3-2) STL 분해 수행
stl_result = STL(
    ts_indexed,
    period=7,       # 예시: 7일 주기(주 단위 패턴 가정)
    seasonal=21     # 예시: 계절성 추정 window(주기의 약 3배)
).fit()

# (3-3) STL 계절성 제거(가법 개념): 원본 - seasonal
ts_stl_removed = ts_indexed - stl_result.seasonal
p4["시가_stl_season_removed"] = ts_stl_removed  # (선택) df에 저장

# (선택) 계절성 제거 후 그래프 확인
px.line(p4.reset_index(), x="Date", y="시가_stl_season_removed", title="STL seasonal removed")

# (3-4) STL 계절성 제거 후 정상성 재검정
res_stl = check_stationarity(ts_stl_removed, "stl_removed")


# =========================================================
# (4) 판단(해석 기준)
# =========================================================
# p-value <= 0.05  → 정상성(O) 가능성 높음  (귀무가설 기각)
# p-value  > 0.05  → 정상성(X) 가능성 높음  (귀무가설 기각 못함)
#
# ✅ 만약 Additive / Multiplicative / STL 계절성 제거 후에도 
#    p-value가 계속 0.05 초과라면,
#    계절성만 제거해서는 정상성이 안 만들어진다는 의미이며,
#    다음 단계로 차분(diff), 로그+차분, (주가라면) 수익률/로그수익률 등을 시도한다.
```


---
(0) 준비: 필요한 라이브러리 불러오기
```python
import pandas as pd
import plotly.express as px

from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.seasonal import seasonal_decompose, STL
```


---
(0-1) ADF(정상성) 검정 결과를 보기 좋게 출력하는 헬퍼 함수
```python
def check_stationarity(series, name="data"):
    result = adfuller(series.dropna())
    print(f"[{name}] ADF Statistic :", result[0])
    print(f"[{name}] p-value       :", result[1])
    print("-" * 40)
    return result
```



---
(1) 원본 시계열 준비 + 정상성 확인
```python
# ts는 “정상성 검정을 할 원본 시계열” 변수로 통일해서 사용
ts = df2["시가"]

# (1) 원본 정상성(ADF) 확인
res_original = check_stationarity(ts, "original")

# (선택) 원본 그래프 확인 (추세/변동 패턴을 눈으로 확인)
px.line(df2, x="Date", y="시가", title="Original")
```



---
(2-A) Classical Decomposition (Additive)

(2-A-1) Additive 분해 수행
```python
decomp_add = seasonal_decompose(
    ts,
    period=10,  # 예시: 강의에서 사용한 주기 값(데이터 특성에 맞게 조정 가능)
    model="additive"
)
```

(2-A-2) 계절성 제거(가법): 원본 - seasonal
```python
ts_add_removed = ts - decomp_add.seasonal
df2["시가_add_season_removed"] = ts_add_removed
```

(선택) 계절성 제거 후 그래프 확인
```python
px.line(df2, x="Date", y="시가_add_season_removed", title="Additive seasonal removed")
```

(2-A-3) Additive 계절성 제거 후 정상성 재검정
```python
res_add = check_stationarity(df2["시가_add_season_removed"], "additive_removed")
```

---
(2-B) Classical Decomposition (Multiplicative)

(2-B-1) Multiplicative 분해 수행
```python
decomp_mul = seasonal_decompose(
    ts,
    period=10,             # 예시 주기
    model="multiplicative"
)
```

(2-B-2) 계절성 제거(승법): 원본 / seasonal
```python
ts_mul_removed = ts / decomp_mul.seasonal
df2["시가_mul_season_removed"] = ts_mul_removed
```

(선택) 계절성 제거 후 그래프 확인
```python
px.line(df2, x="Date", y="시가_mul_season_removed", title="Multiplicative seasonal removed")
```

(2-B-3) Multiplicative 계절성 제거 후 정상성 재검정
```python
res_mul = check_stationarity(ts_mul_removed, "mul_removed")
```

---
(3) STL Decomposition (LOESS 기반)

(3-1) Date를 index로 설정한 시계열 만들기
```python
p4 = df2[["Date", "시가"]].set_index("Date")
ts_indexed = p4["시가"]
```

(3-2) STL 분해 수행
```python
stl_result = STL(
    ts_indexed,
    period=7,       # 예시: 7일 주기(주 단위 패턴 가정)
    seasonal=21     # 예시: 계절성 추정 window(주기의 약 3배)
).fit()
```

(3-3) STL 계절성 제거(가법 개념): 원본 - seasonal
```python
ts_stl_removed = ts_indexed - stl_result.seasonal
p4["시가_stl_season_removed"] = ts_stl_removed  # (선택) df에 저장
```

(선택) 계절성 제거 후 그래프 확인
```python
px.line(p4.reset_index(), x="Date", y="시가_stl_season_removed", title="STL seasonal removed")
```

(3-4) STL 계절성 제거 후 정상성 재검정
```python
res_stl = check_stationarity(ts_stl_removed, "stl_removed")
```

---
(4) 판단(해석 기준)
```python
# p-value <= 0.05  → 정상성(O) 가능성 높음  (귀무가설 기각)
# p-value  > 0.05  → 정상성(X) 가능성 높음  (귀무가설 기각 못함)
#
# ✅ 만약 Additive / Multiplicative / STL 계절성 제거 후에도 
#    p-value가 계속 0.05 초과라면,
#    계절성만 제거해서는 정상성이 안 만들어진다는 의미이며,
#    다음 단계로 차분(diff), 로그+차분, (주가라면) 수익률/로그수익률 등을 시도한다.
```