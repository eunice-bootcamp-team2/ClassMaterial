### 📌 지금 우리는 어디까지 왔나요?

앞 단계(05)에서 ADF 검정을 해본 결과,
- Log 변환
- Box-Cox 변환

만으로는 정상성을 확보하지 못했습니다.

즉,
> 단순히 값을 눌러주는 변환으로는 부족하다는 의미입니다.
그래서 이제는 데이터의 구조 자체를 분해해서 원인을 찾는 단계로 넘어갑니다.

---
### 📌 이번 단계의 핵심

이번 단계의 목적은 이것입니다.
> 정상성을 만족하지 않는 시계열 데이터를
> 구조적으로 분해해서
> 통계 기반 모델(ARIMA 등)에 적합한 형태로 만드는 것입니다.

---
### 📌 계절성 제거란 무엇인가요?

시계열 데이터는 보통 세 가지 요소로 구성됩니다.
```
시계열 = 추세(Trend) + 계절성(Seasonality) + 잔차(Residual)
```

- 추세: 전체적으로 증가하거나 감소하는 흐름
- 계절성: 반복되는 패턴 (요일, 월별, 주기적 변동)
- 잔차: 설명되지 않는 불규칙한 부분

만약 데이터에 반복 패턴이 있다면 그 패턴이 정상성을 깨고 있을 가능성이 있습니다.

그래서:
> 계절성을 분리하고 제거한 뒤 다시 정상성을 검사해보는 것입니다.

---
### 📌 Classical Decomposition (전통적 분해)

1️⃣ 가법 모델 (Additive)
```
시계열 = 추세 + 계절성 + 잔차
```

이 모델은
- 계절성의 크기가 일정할 때 사용합니다.
- 값이 커져도 변동 폭이 비슷한 경우에 적합합니다.

예:
- 항상 ±10 정도 변동하는 데이터

---

2️⃣ 승법 모델 (Multiplicative)
```
시계열 = 추세 × 계절성 × 잔차
```

이 모델은
- 값이 커질수록 변동 폭도 커질 때 사용합니다.
- 주가, 매출처럼 규모가 커지면 변동도 커지는 데이터에 적합합니다.

---

지금 흐름을 한 줄로 정리하면
```
원본 비정상
   ↓
Log/Box-Cox 실패
   ↓
계절성 분해
   ↓
계절성 제거
   ↓
ADF 재검정
```

---
### 🎯 이 단계의 목적

이 단계는 모델을 돌리는 단계가 아니라,
> 비정상의 원인이 계절성 때문인지 확인하는 단계입니다.

만약 계절성을 제거했더니 정상성이 생긴다면,
→ ARIMA 같은 통계 기반 모델을 사용할 수 있습니다.

만약 여전히 비정상이라면,
→ 다음 단계인 차분(Differencing) 으로 넘어가야 합니다.

---
### 시계열 계절성 제거 후 정상성(ADF) 재검정 기본 패턴

분해 → 계절성 제거 → ADF 재검정 패턴만 남긴 버전입니다. 
주가 말고 다른 시계열에도 그대로 씁니다.
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


### 전체 코드 (계절성 분해 + STL로 계절성 제거 후 ADF 재검정)
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

- plotly.express (`import plotly.express as px`)
	- 인터랙티브 그래프를 그리는 라이브러리입니다.

- adfuller : ADF(정상성 검정)를 수행하는 함수입니다.
- seasonal_decompose : 전통적 시계열 분해 함수입니다.

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

05에서 설명했으므로 그부분을 참고합니다.

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

![[Pasted image 20260302135428.png]]

그래프(Original)를 정상성 관점에서 해석

1️⃣ 전체 흐름(Trend) 존재
그래프를 보면:
- 2020 → 2021 초반까지 상승
- 2021~2022 하락
- 2023~2024 다시 상승
- 2024 후반~2025 급락
    
👉 평균이 일정하지 않습니다.

정상성의 조건은
	평균이 시간에 따라 일정해야 한다
	인데, 지금은 평균이 계속 변하고 있습니다.
→ ❌ 정상성 깨짐


2️⃣ 분산(변동성)도 일정하지 않음
- 어떤 구간은 변동 폭이 큼 (2021, 2024)
- 어떤 구간은 비교적 안정적
👉 분산도 일정하지 않아 보입니다.

정상성 조건 두 번째:
	분산이 일정해야 한다
→ 이것도 깨진 상태입니다.

계절성은 뚜렷하지 않음
- 매년 같은 시점에 반복되는 규칙적인 패턴은 보이지 않음
- 대신 장기 추세 변화가 더 강함
    
즉,
👉 이 데이터는 계절성 문제보다는  
👉 추세(Trend) 문제가 더 큽니다.


3️⃣ 계절성은 뚜렷하지 않음
- 매년 같은 시점에 반복되는 규칙적인 패턴은 보이지 않음
- 대신 장기 추세 변화가 더 강함
    
즉,
👉 이 데이터는 계절성 문제보다는  
👉 추세(Trend) 문제가 더 큽니다.

---
(2-A) Classical Decomposition (Additive)

Additive 분해란?
시계열 데이터를 추세 + 계절성 + 잔차로 나누는 방법입니다.

이 방식을 왜 사용하냐면 정상성이 없을때, 그 원인이 계절성 때문인지 확인하기 위해 사용합니다
즉,
- 반복되는 패턴이 있는지 확인하고
- 그 패턴을 제거한 뒤
- 정상성이 생기는지 다시 검사하려는 목적입니다.

왜 사용하냐면
- 계절성의 크기가 일정할 때
- 값이 커져도 변동 폭이 비슷할 때 사용합니다.
예를 들어 매달 ±10 정도 반복되는 데이터

즉 아래 수행 방식은 Additive 분해로 시계열을 구조적으로 나눠서 계절성이 정상성을 깨는 원인인지 확인하기 위해 사용합니다.

(2-A-1) Additive 분해 수행
```python
decomp_add = seasonal_decompose(
    ts, # 우리가 분석할 원본 시계열 데이터로 삼성주가의 시가데이터
    period=10,  # 한 주기가 몇 개 데이터로 구성되는지 알려주는 값
    model="additive" # 가법 모델 사용
)
```

`seasonal_decompose( )` : 시계열을 추세 + 계절성 + 잔차로 분해하는 함수입니다.
	즉, 원본 데이터 → 구조적으로 나눔

`additive` : 가법 모델은 "시계열 = 추세 + 계절성 + 잔차" 로 계산합니다. 즉,
- 계절성의 크기가 일정하다고 가정
- 값이 커져도 변동폭은 비슷하다고 보는 모델

결과 `decomp_add` : 이 함수는 객체를 반환합니다
```
decomp_add.trend      # 추세
decomp_add.seasonal   # 계절성
decomp_add.resid      # 잔차 가 각각 저장됩니다.

잔차란 모델이나 분해로 설명되지 않은 남은 부분입니다.
``` 
ts 시계열을 0주기 가정 하에 가법 모델로 분해해서 추세·계절성·잔차로 나눈다.

아까 그래프를 보면 뚜렷한 계절성보다는 추세가 강했습니다. 그래서 이 분해를 해보면
- seasonal은 작고
- trend가 크게 나올 가능성이 큽니다.

---
계절성 제거(가법)란?
	원본 시계열에서 반복되는 패턴(계절성)을 빼는 과정입니다.

수식으로는 계절성 제거값 = 원본 - 계절성

왜 이렇게 계산하냐면 가법 모델은 아래와 같이 가정합니다
```
시계열 = 추세 + 계절성 + 잔차
```
따라서 계절성을 제거하려면
```
(추세 + 계절성 + 잔차) - 계절성  
= 추세 + 잔차
```
즉 
- 반복되는 패턴을 제거하고  
- 순수한 흐름과 불규칙성만 남기려는 목적입니다.

언제 사용하는가?
- 계절성이 정상성을 깨는 원인일 가능성이 있을 때
- 반복 패턴이 눈에 보일 때

가법 계절성 제거는 원본에서 반복 패턴을 빼서 정상성에 가까운 시계열을 만들기 위한 과정입니다.

(2-A-2) 계절성 제거(가법): 원본 - seasonal
```python
ts_add_removed = ts - decomp_add.seasonal
df2["시가_add_season_removed"] = ts_add_removed
df2.head()
```

- `decomp_add.seasonal` : 앞에서 분해했던 시계열 = 추세 + 계절성 + 잔차
	각 시점별 계절성 값만 모아놓은 시계열입니다.

`ts` = (추세 + 계절성 + 잔차) 
`decomp_add.seasonal` = 계정성으로 
(추세 + 계절성 + 잔차) - 계절성 즉 `ts - decomp_add.seasonal`
이 계산을 변수인 `ts_add_removed` 에 담은 즉, 계절성 제거(가법)를 변수에 담았습니다.

`df2["시가_add_season_removed"]` 새로운 커럼에 데이터를 생성합니다.
	원본 시가에서 계절성을 제거한 값
![[Pasted image 20260302142202.png]]

---
(선택) 계절성 제거 후 그래프 확인
```python
px.line(df2, x="Date", y="시가_add_season_removed", title="Additive seasonal removed")
```

이 그래프는 계절성 제거 후 시가 데이터입니다.
![[Pasted image 20260302142235.png]]

1️⃣ 전체 모양은 거의 동일합니다
- 2020 → 2021 상승
- 2021~2022 하락
- 2023~2024 상승
- 2024 후반 급락

👉 장기 추세는 그대로 유지됩니다.

---
2️⃣ 반복 패턴 변화는 거의 보이지 않습니다
- 원본 그래프와 비교했을 때
- 눈에 띄는 주기적 패턴 감소는 크게 체감되지 않습니다.

즉,
👉 이 데이터는 강한 계절성이 있었던 데이터는 아닙니다.

---
3️⃣ 정상성 관점에서의 해석

계절성을 제거했지만:
- 평균이 여전히 변하고 있음
- 추세가 계속 존재함

따라서:
👉 비정상의 원인은 계절성보다는 추세(Trend)입니다.

---
🎯 결론
이 데이터는 계절성이 문제라기보다는 장기 추세 때문에 정상성이 깨진 상태입니다.
즉, 이 흐름이 더 적절합니다.
```
계절성 제거 → 효과 거의 없음
다음 단계 → 차분(Differencing)
```

---
(2-A-3) Additive 계절성 제거 후 정상성 재검정
```python
res_add = check_stationarity(df2["시가_add_season_removed"], "additive_removed")
```

결과값
![[Pasted image 20260302142518.png]]

정상성 판단 기준
```
- p-value ≤ 0.05 → 정상성 있음
- p-value > 0.05 → 정상성 없음
  
0.2583 > 0.05 정상성 없음 (비정상)   
```

계절성을 제거했지만:
- 평균이 여전히 일정하지 않음
- 추세가 계속 존재함
    
즉, 비정상의 원인은 계절성이 아니었습니다.

---
Classical Decomposition(클래시컬 분해)란?

시계열을 3가지 성분으로 나누는 전통적인 방법입니다.
- 추세(Trend): 전체적인 상승/하락 흐름
- 계절성(Seasonality): 반복되는 패턴
- 잔차(Residual): 나머지(불규칙 변동)

목적은 간단합니다.
> 정상성을 깨는 원인이 계절성인지 확인하고, 필요하면 계절성을 제거해 보려는 것입니다.

---
언제 Multiplicative(승법) 모델을 쓰나요?

승법 모델은 이런 상황에 씁니다.
> 값이 커질수록 계절성(변동폭)도 같이 커지는 경우

예:
- 매출이 커질수록 계절 변동 폭도 커짐
- 값이 1만일 때 ±500, 값이 10만일 때 ±5000처럼 비율로 흔들림이 커지는 데이터

반대로 계절 변동 폭이 항상 비슷하면 Additive가 더 잘 맞는 편입니다.


(2-B) Classical Decomposition (Multiplicative)

(2-B-1) Multiplicative 분해 수행
```python
decomp_mul = seasonal_decompose(
    ts,
    period=10,             # 예시 주기
    model="multiplicative"
)
```
`seasonal_decompose( )` : 시계열을 추세 + 계절성 + 잔차로 분해하는 함수
	즉, 원본 데이터 → 구조적으로 나눔
`period=10`: 10개 간격으로 반복되는 패턴이 있다라고 가정하고 계절성을 계산
`multiplicative` : 시계열 = 추세 × 계절성 × 잔차 라는 관점으로 분해합니다.

결과 `decomp_mul` 안에는:
- `decomp_mul.trend` (추세)
- `decomp_mul.seasonal` (계절성)
- `decomp_mul.resid` (잔차) 가 들어 있습니다.

---
(2-B-2) 계절성 제거(승법): 원본 / seasonal
```python
ts_mul_removed = ts / decomp_mul.seasonal
df2["시가_mul_season_removed"] = ts_mul_removed
df2.head()
```

승법 모델에서는 계절성이 곱으로 붙어있다라고 봅니다.

그래서 계절성을 제거할 때는: 원본을 계절성으로 나눠서 계절성 효과를 없앱니다.
- `ts / decomp_mul.seasonal`  
    → 계절성 효과를 제거한 시계열
    
- 그 결과를 `df2["시가_mul_season_removed"]` 컬럼으로 저장  
    → 이후 그래프/ADF 검정에 쓰기 위함
![[Pasted image 20260302144027.png]]

원본 시가 데이터를 분해한 계절성(seasonal) 값으로 나눈 결과를 `시가_mul_season_removed` 컬럼에 저장한 것입니다.

원본 시가 ÷ 분해된 계절성 값 → 계절성이 제거된 시가 값을 새 컬럼에 넣은 것

---
(선택) 계절성 제거 후 그래프 확인
```python
px.line(df2, x="Date", y="시가_mul_season_removed", title="Multiplicative seasonal removed")
```

![[Pasted image 20260302144138.png]]
- 전체적인 상승 → 하락 → 상승 → 급락 흐름이 그대로 존재합니다.
- 반복되는 일정한 주기 패턴이 크게 줄어든 느낌은 거의 없습니다.
- 큰 추세(Trend)는 그대로 남아 있습니다.
    
👉 즉, 계절성을 나눠 제거했지만 데이터의 구조(추세)는 거의 변하지 않았습니다.


(2-B-3) Multiplicative 계절성 제거 후 정상성 재검정
```python
res_mul = check_stationarity(ts_mul_removed, "mul_removed")
```

ADF 결과
![[Pasted image 20260302144356.png]]
```
0.2576 > 0.05
```
👉 정상성 없음 (비정상)

Multiplicative 방식으로 계절성을 제거했지만:
- 평균이 일정해지지 않았고
- 추세가 그대로 존재하며
- 단위근이 여전히 존재합니다
    
즉, 비정상의 원인은 계절성이 아니라 추세입니다.

---
STL Decomposition (LOESS 기반)이란?
시계열을 추세(Trend), 계절성(Seasonality), 잔차(Residual)로 분해하는 방법인데,  
단순 평균이 아니라 LOESS(부드러운 곡선 회귀)를 사용해서 더 유연하게 분해하는 방법입니다.

Classical 분해와 무엇이 다를까요?
Classical은:
- 고정된 방식으로 계절성을 계산
- 패턴이 일정해야 잘 맞음
- 구조가 단순함
    
STL은:
- 데이터에 맞게 **부드럽게 적응**
- 추세가 복잡해도 잘 잡음
- 계절성이 조금씩 변해도 대응 가능
- 더 현실적인 데이터에 강함
👉 그래서 현업에서는 STL을 더 많이 사용합니다.

언제 STL을 사용하나요?
✔ 추세가 부드럽게 변하는 경우  
✔ 계절 패턴이 완전히 일정하지 않은 경우  
✔ Classical 분해가 잘 맞지 않는 경우  
✔ 현실 데이터(주가, 매출, 센서 데이터 등)

특히 데이터가 복잡할수록 STL이 더 적합합니다.


(3) STL Decomposition (LOESS 기반)

(3-1) Date를 index로 설정한 시계열 만들기
```python
p4 = df2[["Date", "시가"]].set_index("Date")
ts_indexed = p4["시가"]
```
- `df2[["Date", "시가"]]`  
    → df2에서 Date와 시가 컬럼만 뽑습니다.
    
- `.set_index("Date")`  
    → `Date`를 인덱스(시간축)로 바꿉니다.  
    (STL 같은 시계열 작업은 시간 인덱스가 있으면 더 자연스럽게 동작합니다.)
    
- `ts_indexed = p4["시가"]`  
    → `p4`에서 “시가”만 꺼내서 Series(시계열)로 만듭니다.  
    이제 `ts_indexed`는 Date 인덱스를 가진 시가 시계열입니다.

---
(3-2) STL 분해 수행
```python
stl_result = STL(
    ts_indexed,
    period=7,       # 7일 주기(주 단위 패턴 가정)
    seasonal=21     # 계절성 추정 window(주기의 약 3배)
).fit()
```
- `STL(ts_indexed, ...)`  
    → 시계열을 추세(trend), 계절성(seasonal), 잔차(resid)로 분해할 준비를 합니다.
    
- `period=7`  
    → 7개마다 반복되는 주기가 있다라고 가정합니다.  
    예) 일별 데이터라면 주 단위 패턴(7일) 가정.
    
- `seasonal=21`  
    → 계절성(반복 패턴)을 부드럽게 추정할 때 쓰는 계절성 추정 윈도우 크기입니다.  
    보통 period의 3배 정도(여기선 7×3=21)로 잡는 예시가 많습니다.
    
- `.fit()`  
    → 실제로 분해를 수행하고 결과를 `stl_result`에 담습니다.
    

`stl_result` 안에는 보통 이런 게 있습니다:
- `stl_result.seasonal` : 계절성 성분
- `stl_result.trend` : 추세 성분
- `stl_result.resid` : 잔차 성분

---
(3-3) STL 계절성 제거(가법 개념): 원본 - seasonal
```python
ts_stl_removed = ts_indexed - stl_result.seasonal
p4["시가_stl_season_removed"] = ts_stl_removed  
```
- `ts_indexed - stl_result.seasonal`  
    → 원본 시계열에서 STL이 뽑아낸 계절성(반복 패턴)을 빼서  
    계절성 제거된 시계열을 만듭니다.
    
- `p4["시가_stl_season_removed"] = ...`  
    → 그 결과를 `p4` 데이터프레임에 새 컬럼으로 저장합니다.  
    (그래프 그리거나 ADF 돌릴 때 편하게 쓰기 위함입니다.)

이 컬럼은 원본 시가 − STL로 추정한 계절성(seasonal) 을 계산한 값입니다.
즉, 원본 시계열에서 반복 패턴(계절성)만 제거한 값입니다.
쉽게 말하면 시가_stl_season_removed는 원본 시가에서 STL이 분리한 계절성 값을 뺀 데이터입니다.

---
(선택) 계절성 제거 후 그래프 확인
```python
px.line(p4.reset_index(), x="Date", y="시가_stl_season_removed", title="STL seasonal removed")
```

![[Pasted image 20260302150437.png]]
- 전체적인 상승 → 하락 → 상승 → 급락 흐름이 그대로 존재합니다.
- 반복되는 7일 패턴 같은 계절성 흔적은 거의 보이지 않습니다.
- 하지만 큰 추세(Trend)는 여전히 강하게 남아 있습니다.
    
👉 즉, 계절성은 제거되었지만 추세는 그대로입니다.


(3-4) STL 계절성 제거 후 정상성 재검정
```python
res_stl = check_stationarity(ts_stl_removed, "stl_removed")
```

![[Pasted image 20260302150429.png]]

```
0.4289 > 0.05
```
👉 정상성 없음 (비정상)

STL은 계절성을 아주 유연하게 잘 분리하는 방법입니다.  
그런데도 정상성이 나오지 않았습니다.

이 말은:
> 이 데이터의 비정상 원인은 계절성이 아니라 추세(Trend)라는 뜻입니다.
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