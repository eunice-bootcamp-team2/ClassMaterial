- 05 정상성 변환 ❌
- 06 계절성 제거 ❌
- 07 차분 ⭕ → 정상성 확보 성공
    

이제 드디어:
> 정상성을 만족하는 시계열을 가지고  
> 실제 예측 모델을 학습하는 단계입니다.

---
1️⃣ 왜 Naive 모델을 사용하는가?
	Naive 모델은 가장 단순한 시계열 모델입니다.

특징
- 복잡한 학습 ❌
- 과거 값을 그대로 반복
- 성능이 좋기 위해 쓰는 모델 ❌
- 기준선(Baseline) 모델

이 단계의 진짜 목적
> 모델 성능을 높이는 것이 아니라 시계열 예측 파이프라인을 끝까지 경험하는 것

```
정상성 확보  
↓  
모델 학습  
↓  
예측  
↓  
평가  
↓  
시각화
```
이 전체 구조를 이해하는 단계입니다.



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
---
Darts는 내부적으로 PyTorch를 사용합니다.
```bash
uv pip install u8darts[torch]
```

설치중 에러가 나는건 설치 시 모든 선택 모듈을 다 설치하지 않으면,  
"이 모듈은 없음" 이라고 알려주는 것입니다. 그냥 무시해도 됩니다. 그냥 최소한의 사양을 설치한것입니다.


전체코드
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
`TimeSeries` : Darts에서 사용하는 시계열 전용 데이터 구조입니다.
`NaiveSeasonal` : 가장 단순한 기준선(Baseline) 시계열로 과거 값을 그대로 반복하여 미래를 예측하는 모델
`mse` : 평균제곱오차(Mean Squared Error)를 계산하는 함수입니다.
`rmse` : 평균제곱근오차(Root Mean Squared Error)를 계산하는 함수입니다.

---
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
- `TimeSeries.from_dataframe(...)`  
    → Pandas DataFrame을 Darts 전용 시계열 객체로 변환하는 함수입니다.
    
- `df2`  
    → 변환할 원본 데이터프레임입니다. 모델이 학습할 데이터의 원천
    
- `time_col="Date"`  
    → 날짜 컬럼을 시간 축으로 사용하겠다는 의미입니다.
    
- `value_cols="시가_diff"`  
    → 모델이 학습하고 예측할 값(정상성 확보된 차분 데이터)을 지정합니다.
    
- `fill_missing_dates=True`  
    → 빠진 날짜가 있으면 자동으로 생성합니다.
    
- `freq="D"`  
    → 데이터가 일(Daily) 단위 시계열임을 명시합니다.
    
- `fillna_value=1`  
    → 자동 생성된 날짜의 결측값을 1로 채웁니다. (실습 안정성용 옵션입니다.)


---
(2) Train / Test 분리 (시간 순서 유지!!)
```python
train, test = series.split_before(0.8)
```
- `split_before(0.8)`  
    → 전체 데이터의 80% 지점에서 앞/뒤로 나눕니다.
    
- `train`  
    → 앞 80% 데이터 (모델 학습용)
    
- `test`  
    → 뒤 20% 데이터 (모델 검증용)
    
⚠️ 시계열은 반드시 시간 순서를 유지해야 합니다. (랜덤 분리 금지)


---
(3) 모델 선택 & 학습
```python
naive_model = NaiveSeasonal(K=10)    # 예시: 계절 주기 10 가정
```
- `NaiveSeasonal(K=10)`  
    → 10시점 전 값을 그대로 반복하는 가장 단순한 기준선 모델입니다.
    
```python
naive_model.fit(train)
```
- `fit(train)`  
    → 학습 데이터(train)를 기반으로 모델을 학습합니다.  
    (Naive 모델은 복잡한 학습은 없고, 과거 패턴을 저장하는 단계입니다.)

---
(4) 예측 수행
```python
pred = naive_model.predict(len(test))
```
- `predict(len(test))`  
    → 테스트 구간 길이만큼 미래 값을 예측합니다.
    
- `pred`  
    → 예측된 시계열 결과입니다.

---
(5) 성능 평가
```python
print("MSE  :", mse(test, pred))
print("RMSE :", rmse(test, pred))
```

결과
```
MSE  : 4690496.046272494
RMSE : 2165.7553061859257
```
MSE : 4,690,496
- 평균적으로 오차를 제곱한 값입니다.
- 단위가 **제곱 단위**라서 직관적으로 해석하기는 어렵습니다.
- 값이 클수록 예측이 많이 틀렸다는 의미입니다.
    
👉 참고용 지표입니다.

RMSE : 2,165.75 ⭐ (더 중요)
- 평균적으로 약 2,166 정도 틀렸다는 의미입니다.
- 단위는 원래 데이터와 동일합니다.  
    (지금은 `시가_diff`, 즉 변화량 단위)
    
즉, 모델은 하루 변동폭을 평균적으로 약 ±2,166 정도 오차를 내며 예측하고 있습니다.

판단 기준은:
- 시가_diff의 평균 변동폭이 1,000~3,000 수준이라면 → 보통 수준
- 변동폭이 10,000 이상이라면 → 비교적 괜찮은 수준
- 변동폭이 500 수준이라면 → 나쁜 성능
    
즉, 데이터의 평균 변동폭과 비교해야 정확한 판단이 가능합니다.

Naive 모델은 하루 변동폭을 평균 약 2,166 정도 오차로 예측하고 있으며, 이는 이후 고급 모델과 비교하기 위한 기준선 성능입니다.

---
(6) 시각화 (실무에서 매우 중요)
```python
df_pred = pred.to_dataframe().reset_index()
df_pred["Label"] = "예측값"
```
- `"Label"` 컬럼을 새로 생성합니다.
- 값은 모두 `"예측값"`으로 지정합니다.
- 실측값과 구분하기 위한 시각화용 구분 컬럼입니다.

---
실제값(Test 데이터) 시각화용 DataFrame 변환 단계
```python
df_real = test.to_dataframe().reset_index()
df_real["Label"] = "실측값"
```
- `"Label"` 컬럼을 새로 생성합니다.
- 값은 모두 `"실측값"`으로 지정합니다.
- 예측값과 구분하기 위한 시각화용 구분 컬럼입니다.

---

```python
df_plot = pd.concat([df_real, df_pred])
```

![[Pasted image 20260302160846.png]]

→ 실측값(df_real)과 예측값(df_pred)을  
→ 하나의 데이터프레임으로 합친 것입니다.

왜 이렇게 합치는가?
→ 실측값(파란색)  
→ 예측값(빨간색) 을 동시에 비교하기 위함입니다.

---

```python
px.line(df_plot, x="Date", y="시가_diff", color="Label")
```

![[Pasted image 20260302160415.png]]

1️⃣ 파란색(실측값)
- 0을 중심으로 위아래로 진동
- 변동 폭이 불규칙
- 스파이크(급등·급락)가 랜덤하게 발생
👉 실제 변화량은 예측하기 어려운 형태입니다.

2️⃣ 빨간색(예측값, Naive)
- 일정한 패턴이 반복됨
- 일정 간격으로 큰 스파이크 발생
- 실제 변동과 잘 맞지 않음
👉 과거 K시점 값을 그대로 반복하는 특성이 그대로 보입니다.

3️⃣ 두 선 비교
- 스파이크 위치가 거의 일치하지 않음
- 실제 급락/급등을 제대로 잡지 못함
- 전반적으로 패턴을 따라가지 못함
즉, 예측선이 실제선과 동조하지 않습니다.

---
이 과정에서 무엇을 얻었나요?
이번 단계에서 얻은 것은 3가지입니다.

① 정상성 확보된 데이터로 예측 실습 완료
→ 차분 → 모델 → 예측 → 평가까지 전체 흐름 경험

② 기준선(Baseline) 성능 확보
→ RMSE ≈ 2166  
→ 앞으로 만들 모델은 이보다 좋아야 의미가 있음

③ 예측 파이프라인 완성 경험
```
데이터 전처리  
→ 시계열 객체 변환  
→ train/test 분리  
→ 모델 학습  
→ 예측  
→ 성능평가  
→ 시각화
```

모델을 저장해서 다시 돌릿수 있는 상태가 되었습니다.
하지만 중요한 점은 
Naive 모델은:
- 복잡한 가중치 ❌
- 학습된 파라미터 거의 없음
    
즉, 저장 의미는 있지만, 실무적 가치가 큰 모델은 아닙니다.

지금 단계의 진짜 의미

이번 실습의 핵심은:
✔ 정상성 확보 → 모델 적용 가능 상태 확인  
✔ 시계열 예측 전체 구조 이해  
✔ 기준선 성능 확보  
✔ 모델 저장 및 재사용 가능 상태 확인