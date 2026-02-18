### STEP 4가 무엇을 하려는 단계인가?
이 파트의 목적은 숫자가 잠깐 튀는 것을 찾는 것이 아니라,  
데이터의 흐름이 이전과 달라지기 시작한 지점을 찾는 것입니다.

### 이전 단계들과 가장 큰 차이
STEP 1 / 2 / 3 은 공통점:
✔ 각각의 숫자가 정상인지 이상인지를 판단하는 단계이고
STEP 4:
✔ 데이터 전체 흐름이 이전과 달라졌는지를 감지하는 단계입니다.

쉽게 말하면 이런 문제 해결용
이전 방식이 잘 잡는 것:
✔ 순간 스파이크  
✔ 튀는 값  
✔ 단발성 이상

하지만 놓치기 쉬운 것:
✔ 평균이 서서히 바뀜  
✔ 노이즈가 갑자기 커짐  
✔ 정상 패턴 붕괴

### STEP 4의 핵심 아이디어
과거 구간과 최근 구간을 비교합니다.

질문 형태로 보면:
✔ 예전 상태랑 지금 상태가 같은가?  
✔ 평균이 달라졌는가?  
✔ 흔들림 크기가 달라졌는가?

### 이 코드가 실제로 하는 일
이 파트는 예전 데이터와 지금 데이터를 나누어 보고,  
값의 수준이나 흔들림이 이전과 달라졌는지를 확인하는 방식입니다.

아주 직관적으로:
- 이전 구간 평균 vs 최근 구간 평균 비교
- 이전 구간 흔들림 vs 최근 흔들림 비교

### 왜 이런 비교가 중요하냐?
이런 비교가 중요한 이유는,  
값이 잠깐 튀는 것을 찾는 것보다  
문제가 언제부터 시작되었는지를 아는 것이 더 중요하기 때문입니다.

---
### Change Point 패턴 뼈대코드 (급변/상태전이)
```python
# ============================================
# [STEP 4 Skeleton] Change Point(급변/상태전이) 탐지 패턴
# - 목표: "언제부터 상태가 바뀌었는지" (고장 시작 시점, 패턴 붕괴 시작점)
# - 접근: 최근 구간(window)의 평균/분산이 "이전 구간"과 크게 달라졌는지 감지
# ============================================

import numpy as np
import pandas as pd

# -------------------------------------------------
# 0) 데이터 준비
#    - df: columns = ["timestamp", "value"]
# -------------------------------------------------
df = df.sort_values("timestamp").reset_index(drop=True)

# -------------------------------------------------
# 1) Change Point 탐지 설정
# -------------------------------------------------
W = 30                 # 비교 구간 길이(최근 30개 vs 이전 30개)
MEAN_K = 3.0           # 평균 변화 감지 민감도(표준편차 대비 몇 배?)
STD_K  = 3.0           # 분산(표준편차) 변화 감지 민감도
EPS = 1e-9

# -------------------------------------------------
# 2) 상태 머신(전이 감지) 준비
# -------------------------------------------------
state = "STABLE"       # "STABLE"(정상) / "SHIFT"(변화 감지)
events = []            # 변화 시점 로그

# -------------------------------------------------
# 3) 슬라이딩으로 "이전 구간" vs "최근 구간" 비교
# -------------------------------------------------
# i 시점에서:
#   prev = [i-2W : i-W)
#   curr = [i-W  : i)
for i in range(2 * W, len(df) + 1):
    prev = df["value"].iloc[i - 2*W : i - W]
    curr = df["value"].iloc[i - W   : i]

    prev_mean, prev_std = float(prev.mean()), float(prev.std(ddof=0))
    curr_mean, curr_std = float(curr.mean()), float(curr.std(ddof=0))

    # 평균 변화량(표준편차로 정규화)
    mean_shift_score = abs(curr_mean - prev_mean) / (prev_std + EPS)

    # 분산 변화량(표준편차의 비율로 비교)
    std_ratio = (curr_std + EPS) / (prev_std + EPS)

    is_change = (mean_shift_score >= MEAN_K) or (std_ratio >= STD_K) or (std_ratio <= 1/STD_K)

    # -------------------------------------------------
    # 4) 상태 변화 감지 (STABLE ↔ SHIFT)
    # -------------------------------------------------
    t = df["timestamp"].iloc[i - 1]
    if state == "STABLE" and is_change:
        state = "SHIFT"
        events.append({"timestamp": t, "event": "CHANGE_POINT", "mean_shift_score": mean_shift_score, "std_ratio": std_ratio})

    elif state == "SHIFT" and (not is_change):
        state = "STABLE"
        events.append({"timestamp": t, "event": "BACK_TO_STABLE", "mean_shift_score": mean_shift_score, "std_ratio": std_ratio})

# -------------------------------------------------
# 5) 결과 확인
# -------------------------------------------------
events_df = pd.DataFrame(events)
print(events_df.head(20))
```
---
`라이브러리 불러오기`
```python
import numpy as np
import pandas as pd
```
데이터 계산과 데이터 처리를 위해 필요한 외부 도구들을 불러오는 단계입니다.

`0) 데이터 준비`
```python
df = df.sort_values("timestamp").reset_index(drop=True)
```
데이터를 시간 순서대로 정렬하고, 인덱스를 다시 깔끔하게 정리하는 단계로 뒤죽박죽일 수 있는 데이터를 올바른 순서로 재배치하는 과정입니다.

---
`1) Change Point 탐지 설정`
```python
W = 30                 # 비교 구간 길이(최근 30개 vs 이전 30개)
MEAN_K = 3.0           # 평균 변화 감지 민감도(표준편차 대비 몇 배?)
STD_K  = 3.0           # 분산(표준편차) 변화 감지 민감도
EPS = 1e-9
```
변화 탐지를 어떤 기준과 민감도로 수행할 것인지 규칙을 정하는 단계로 언제 상태가 바뀌었다고 판단할지 기준선을 설정하는 과정입니다.
즉, 모델 계산 전에
✔ 비교 방식  
✔ 감지 기준  
✔ 민감도 수준을 미리 정의하는 단계입니다.

---
`2) 상태 머신(전이 감지) 준비`
```python
state = "STABLE"       # "STABLE"(정상) / "SHIFT"(변화 감지)
events = []            # 변화 시점 로그
```
데이터 상태를 추적하고 변화 발생 시점을 기록하기 위한 준비 단계로  현재 시스템이 정상 상태인지 변화 상태인지 구분하기 위한 기준을 세우는 과정입니다.
즉, 단순 계산이 아니라
✔ 상태 개념 도입  
✔ 변화 흐름 추적  
✔ 이벤트 기록 구조 생성이 목적의 단계입니다.

---
`3) 슬라이딩으로 "이전 구간" vs "최근 구간" 비교`
```python
for i in range(2 * W, len(df) + 1):
```
데이터의 앞부분(초기 구간)은 건너뛰고, ‘이전 구간’과 ‘최근 구간’을 둘 다 만들 수 있는 시점부터 끝까지 한 칸씩 이동하면서 반복 검사하겠다는 뜻으로 이전 30개 + 최근 30개(총 60개)가 쌓인 시점부터, 한 단계씩 밀어가며 계속 비교하는 과정입니다.


```python
    prev = df["value"].iloc[i - 2*W : i - W]
```
현재 시점 i를 기준으로, 최근 구간 바로 이전에 있었던 과거 데이터 묶음을 가져옵니다. 좀더 쉽게 설명하면 비교 기준이 되는 ‘이전 상태 구간’을 선택하는 단계입니다.
핵심 맥락:
- 최근 데이터를 보기 전에
- 먼저 과거 기준 구간을 만드는 과정
    
즉, 예전 상태를 대표하는 데이터 구간을 추출합니다.


```python
    curr = df["value"].iloc[i - W   : i]
```
현재 시점 i 바로 직전까지의 최신 데이터 묶음을 가져옵니다. 쉽게 말해 지금 상태를 대표하는 ‘최근 구간’을 선택하는 단계입니다. 
핵심 맥락:
- 방금 만든 과거 구간(prev)과
- 이제 최신 구간(curr)을 비교하기 위한 준비
즉, 현재 상태를 대표하는 데이터 구간을 추출합니다.


```python
    prev_mean, prev_std = float(prev.mean()), float(prev.std(ddof=0))
```
이전 구간(prev)의 평균과 데이터 흔들림 크기(표준편차)를 계산합니다. 조금 더 쉽게 말하면
과거 상태의 대표적인 값 수준과 변동성을 요약하는 단계입니다.
✔ 이전 상태가 어떤 특징을 갖는지 수치로 정리  
✔ 비교 기준을 만드는 과정
즉, 예전 데이터의 상태 기준값을 계산합니다.


```python
    curr_mean, curr_std = float(curr.mean()), float(curr.std(ddof=0))
```
최근 구간(curr)의 평균과 데이터 흔들림 크기(표준편차)를 계산합니다. 쉽게 설명하면 현재 상태의 값 수준과 변동성을 요약하는 단계입니다.
✔ 지금 데이터가 어떤 상태인지 수치로 표현  
✔ 이전 구간과 비교하기 위한 준비
즉, 현재 데이터의 상태 기준값을 계산합니다.


평균 변화량(표준편차로 정규화)
```python
    mean_shift_score = abs(curr_mean - prev_mean) / (prev_std + EPS)
```
최근 구간의 평균이 이전 구간의 평균과 얼마나 달라졌는지를 계산합니다. 쉽게 설명하면 지금 상태의 값 수준이 예전 상태에 비해 얼마나 이동했는지를 수치로 측정하는 단계입니다

왜 표준편차로 나눌까?
✔ 단순한 평균 차이를 보는 것이 아니라  
✔ 이전 구간의 변동성 기준으로 변화 크기를 평가
즉,
- 평균 차이가 커 보여도
- 원래 데이터 흔들림이 큰 구간이면 큰 변화가 아닐 수 있음
    
그래서 데이터 특성을 고려한 상대적 변화 크기 계산입니다.


분산 변화량(표준편차의 비율로 비교)
```python
    std_ratio = (curr_std + EPS) / (prev_std + EPS)
```
최근 구간의 데이터 흔들림 크기가 이전 구간에 비해 얼마나 달라졌는지를 계산합니다.
즉, 현재 데이터의 변동성이 과거 상태와 비교해 얼마나 커졌거나 작아졌는지를 측정하는 단계입니다
✔ 평균이 아닌 ‘흔들림 수준’ 비교하고 
✔ 데이터 안정성 변화 감지 목적
즉, 상태 불안정 여부를 판단하기 위한 지표 계산입니다.

직관적으로 보면:
- 값이 크다 → 흔들림 증가 (노이즈 증가 / 불안정 가능)
- 값이 작다 → 흔들림 감소 (패턴 변화 / 센서 고정 가능)


```python
    is_change = (mean_shift_score >= MEAN_K) or (std_ratio >= STD_K) or (std_ratio <= 1/STD_K)
```
평균 변화 또는 변동성 변화가 기준 이상이면 상태 변화로 판단합니다. 아주 쉽게 말하면 
변화 감지 규칙을 적용하여 현재 시점이 변화 구간인지 결정하는 단계입니다.
✔ 평균 변화 검사  
✔ 분산(흔들림) 변화 검사  
✔ 둘 중 하나라도 크면 변화 인정
즉, 상태 전이 여부를 최종 판단하는 조건식입니다.

---
이번 구간은 STEP 4(Change Point)에서 가장 실무적인 핵심 로직입니다.

`4) 상태 변화 감지 (STABLE ↔ SHIFT)`
```python
t = df["timestamp"].iloc[i - 1]
```
현재 검사 중인 시점의 시간 정보를 가져옵니다. 즉, 지금 판단이 발생한 정확한 시간 위치를 기억하는 단계입니다.
✔ 변화가 언제 발생했는지 기록하기 위한 준비  
✔ 로그 / 이벤트 저장의 기준 시점 확보


변화 감지 조건 구간
```python
    if state == "STABLE" and is_change:
        state = "SHIFT"
        events.append({"timestamp": t, "event": "CHANGE_POINT", "mean_shift_score": mean_shift_score, "std_ratio": std_ratio})
```
현재 정상 상태인데 변화 조건이 감지되었는지 확인합니다 다시 말해서 정상 → 변화 상태로 전환해야 하는 순간인지 검사하는 단계입니다.


```python
   state == "SHIFT"
```
현재 상태를 변화 감지 상태로 변경합니다. 쉽게 표현하면 이 시점부터 시스템 상태가 달라졌다고 선언하는 단계입니다.

```python
   events.append({...})
```
변화가 발생한 시점을 기록 목록에 저장합니다.
✔ 변화 시작 시점 로그  
✔ 나중에 분석 / 알람 / 시각화 가능
즉, 상태 전이 이벤트 기록 단계입니다

정상 복귀 조건 구간
```python
elif state == "SHIFT" and (not is_change):
```
현재 변화 상태인데 더 이상 변화 조건이 없는지 확인합니다. 쉽게 말하면 변화 상태 → 정상 상태로 돌아갈 시점인지 검사하는 단계입니다.

```python
state = "STABLE"
```
시스템 상태를 다시 정상 상태로 변경합니다. 즉 불안정 구간이 종료되었음을 선언하는 단계입니다.

```python
   events.append({...})
```
정상 복귀 시점을 기록 목록에 저장합니다. 
✔ 변화 구간 종료 로그  
✔ 상태 변화 이력 완성

전체적으로 해석하면 
재 시점의 시간을 가져오고, 정상 상태에서 변화가 감지되면 상태를 변경하고 기록하며, 변화 상태에서 안정되면 다시 정상 상태로 복귀하고 기록합니다.

이 부분이 하는 가장 중요한 역할은
✔ 변화가 발생했는지 여부만 판단하는 것이 아니라  
✔ 언제 상태가 바뀌었는지 기록
즉, 관제 시스템에서 가장 중요한 이벤트 기록 로직입니다.

---
`5) 결과 확인`
```python
events_df = pd.DataFrame(events)
print(events_df.head(20))
```
기록해 둔 상태 변화 정보들을 표 형태 데이터로 정리하는 단계입니다. 쉽게 설명하면 변화 시점 로그 목록을 사람이 보기 쉬운 구조로 변환하는 과정입니다.
✔ 리스트 형태 기록 → 표 구조 변환  
✔ 분석 / 확인 / 시각화 가능 상태로 정리
즉, 결과 데이터를 해석 가능한 형태로 만드는 단계입니다.

그런후 앞쪽의 20번째줄까지의 데이터를 확인합니다.

---
### 실무를 위한 연습 전체코드
```python
# ============================================
# [STEP 4 전체코드] Change Point(급변/상태전이) 탐지 실무 예시
# - 센서 값이 "어느 시점부터" 평균이 바뀌거나(고장 시작)
#   변동성이 커지는(패턴 붕괴) 상황을 감지
# - 실무에서 흔한 "두 윈도우 비교(two-window)" 방식
# ============================================

import numpy as np
import pandas as pd
import plotly.express as px

# -------------------------------------------------
# 0) 데이터 준비 (실습용 센서 데이터 생성)
#    - 앞의 STEP들과 동일하게, 1초 간격 센서 데이터라고 가정
# -------------------------------------------------
np.random.seed(42)

n = 600
timestamps = pd.date_range("2026-02-11 10:00:00", periods=n, freq="S")

# 정상 구간: 평균 100, 작은 노이즈
values = 100 + np.random.normal(0, 1.2, size=n)

# (A) 스파이크 몇 개 (단발성 이상)
spike_idx = [120, 121, 260, 520]
values[spike_idx] += [12, -14, 18, 15]

# (B) 상태 전이(고장 시작) 시뮬레이션
# 예: 360초부터 평균이 100 -> 106으로 올라가며, 변동성도 커짐(패턴 붕괴)
shift_start = 360
values[shift_start:] = 106 + np.random.normal(0, 2.0, size=n - shift_start)

df = pd.DataFrame({"timestamp": timestamps, "value": values})
df = df.sort_values("timestamp").reset_index(drop=True)

px.line(df, x="timestamp", y="value", title="Sensor Stream (with change point)").show()


# -------------------------------------------------
# 1) Change Point 탐지 설정
#    - W: 이전 구간 vs 최근 구간 비교 길이
#    - MEAN_K: 평균 변화 감지 민감도 (표준편차 대비 몇 배 차이면 변화로 볼지)
#    - STD_K:  변동성(표준편차) 변화 감지 민감도 (비율로 비교)
# -------------------------------------------------
W = 30
MEAN_K = 3.0
STD_K = 2.0   # 분산 변화는 보통 2배만 커져도 의미가 있어 2.0부터 보는 경우가 많음
EPS = 1e-9


# -------------------------------------------------
# 2) 상태 머신(전이 감지) 준비
#    - STABLE: 정상 구간
#    - SHIFT : 변화 구간(상태 전이/패턴 붕괴 의심)
# -------------------------------------------------
state = "STABLE"
events = []
rows = []  # 각 시점의 점수 기록(그래프/분석용)


# -------------------------------------------------
# 3) 슬라이딩으로 "이전 구간" vs "최근 구간" 비교(two-window)
#    i 시점 기준:
#      prev = [i-2W : i-W)
#      curr = [i-W  : i)
# -------------------------------------------------
for i in range(2 * W, len(df) + 1):
    prev = df["value"].iloc[i - 2*W : i - W]
    curr = df["value"].iloc[i - W   : i]

    prev_mean = float(prev.mean())
    prev_std  = float(prev.std(ddof=0))
    curr_mean = float(curr.mean())
    curr_std  = float(curr.std(ddof=0))

    # 평균 변화 점수: "이전 표준편차 기준으로 평균이 얼마나 이동했나?"
    mean_shift_score = abs(curr_mean - prev_mean) / (prev_std + EPS)

    # 표준편차 비율: 변동성이 얼마나 변했나? (2배↑면 위험)
    std_ratio = (curr_std + EPS) / (prev_std + EPS)

    # 변화 감지 규칙:
    # - 평균이 크게 이동했거나
    # - 변동성이 갑자기 커지거나/작아지면(센서 고정/고장 등)
    is_change = (mean_shift_score >= MEAN_K) or (std_ratio >= STD_K) or (std_ratio <= 1/STD_K)

    t = df["timestamp"].iloc[i - 1]
    x = float(df["value"].iloc[i - 1])

    # -------------------------------------------------
    # 4) 상태 변화 감지 (STABLE ↔ SHIFT)
    #    - 관제에서 중요한 건 "변화 자체"뿐 아니라
    #      "언제 시작했는지(CHANGE_POINT)" 기록하는 것
    # -------------------------------------------------
    if state == "STABLE" and is_change:
        state = "SHIFT"
        events.append({
            "timestamp": t,
            "event": "CHANGE_POINT",
            "value": x,
            "mean_shift_score": mean_shift_score,
            "std_ratio": std_ratio
        })

    elif state == "SHIFT" and (not is_change):
        state = "STABLE"
        events.append({
            "timestamp": t,
            "event": "BACK_TO_STABLE",
            "value": x,
            "mean_shift_score": mean_shift_score,
            "std_ratio": std_ratio
        })

    # 각 시점 점수/상태 저장
    rows.append({
        "timestamp": t,
        "value": x,
        "prev_mean": prev_mean,
        "curr_mean": curr_mean,
        "prev_std": prev_std,
        "curr_std": curr_std,
        "mean_shift_score": mean_shift_score,
        "std_ratio": std_ratio,
        "is_change": bool(is_change),
        "state": state
    })


# -------------------------------------------------
# 5) 결과 확인
#    - events_df: 상태 전이 시점 로그(고장 시작 시점 후보)
#    - score_df : 매 시점 점수/상태 (그래프 확인용)
# -------------------------------------------------
events_df = pd.DataFrame(events)
score_df = pd.DataFrame(rows)

print("상태 전이 이벤트(앞부분):")
print(events_df.head(20))

# CHANGE_POINT만 모아서 보기
cp = events_df[events_df["event"] == "CHANGE_POINT"].copy()
print("\nCHANGE_POINT 후보 개수:", len(cp))

# -------------------------------------------------
# (선택) 시각화 1) mean_shift_score / std_ratio 추이
# -------------------------------------------------
px.line(score_df, x="timestamp", y="mean_shift_score", title="Mean shift score").show()
px.line(score_df, x="timestamp", y="std_ratio", title="Std ratio").show()

# -------------------------------------------------
# (선택) 시각화 2) CHANGE_POINT 지점을 센서 값 위에 표시
# -------------------------------------------------
if len(cp) > 0:
    px.scatter(cp, x="timestamp", y="value", title="Detected CHANGE_POINT on sensor value").show()
```
---


```python
import numpy as np
import pandas as pd
import plotly.express as px
```

`0) 데이터 준비 (실습용 센서 데이터 생성)`
```python
np.random.seed(42)
```


```python
n = 600
timestamps = pd.date_range("2026-02-11 10:00:00", periods=n, freq="S")
```


`정상 구간: 평균 100, 작은 노이즈`
```python
values = 100 + np.random.normal(0, 1.2, size=n)
```

`(A) 스파이크 몇 개 (단발성 이상)`
```python
spike_idx = [120, 121, 260, 520]
values[spike_idx] += [12, -14, 18, 15]
```

`(B) 상태 전이(고장 시작) 시뮬레이션`
```python
shift_start = 360
values[shift_start:] = 106 + np.random.normal(0, 2.0, size=n - shift_start)
```


```python
df = pd.DataFrame({"timestamp": timestamps, "value": values})
df = df.sort_values("timestamp").reset_index(drop=True)
```


```python
px.line(df, x="timestamp", y="value", title="Sensor Stream (with change point)").show()
```



`1) Change Point 탐지 설정`
```python
W = 30
MEAN_K = 3.0
STD_K = 2.0   # 분산 변화는 보통 2배만 커져도 의미가 있어 2.0부터 보는 경우가 많음
EPS = 1e-9
```


`2) 상태 머신(전이 감지) 준비`
```python
state = "STABLE"
events = []
rows = []  # 각 시점의 점수 기록(그래프/분석용)

```

`3) 슬라이딩으로 "이전 구간" vs "최근 구간" 비교(two-window)`
```python
for i in range(2 * W, len(df) + 1):
```


```python
    prev = df["value"].iloc[i - 2*W : i - W]
    curr = df["value"].iloc[i - W   : i]

    prev_mean = float(prev.mean())
    prev_std  = float(prev.std(ddof=0))
    curr_mean = float(curr.mean())
    curr_std  = float(curr.std(ddof=0))
```

`평균 변화 점수: "이전 표준편차 기준으로 평균이 얼마나 이동했나?"`
```python
    mean_shift_score = abs(curr_mean - prev_mean) / (prev_std + EPS)
```

`표준편차 비율: 변동성이 얼마나 변했나? (2배↑면 위험)`
```python
    std_ratio = (curr_std + EPS) / (prev_std + EPS)
```


```python
    is_change = (mean_shift_score >= MEAN_K) or (std_ratio >= STD_K) or (std_ratio <= 1/STD_K)
```


```python
    t = df["timestamp"].iloc[i - 1]
    x = float(df["value"].iloc[i - 1])
```

`4) 상태 변화 감지 (STABLE ↔ SHIFT)`
```python
    if state == "STABLE" and is_change:
        state = "SHIFT"
        events.append({
            "timestamp": t,
            "event": "CHANGE_POINT",
            "value": x,
            "mean_shift_score": mean_shift_score,
            "std_ratio": std_ratio
        })
```


```python
    elif state == "SHIFT" and (not is_change):
        state = "STABLE"
        events.append({
            "timestamp": t,
            "event": "BACK_TO_STABLE",
            "value": x,
            "mean_shift_score": mean_shift_score,
            "std_ratio": std_ratio
        })
```

`각 시점 점수/상태 저장`
```python
    rows.append({
        "timestamp": t,
        "value": x,
        "prev_mean": prev_mean,
        "curr_mean": curr_mean,
        "prev_std": prev_std,
        "curr_std": curr_std,
        "mean_shift_score": mean_shift_score,
        "std_ratio": std_ratio,
        "is_change": bool(is_change),
        "state": state
    })
```

`5) 결과 확인`
```python
events_df = pd.DataFrame(events)
score_df = pd.DataFrame(rows)
```


```python
print("상태 전이 이벤트(앞부분):")
print(events_df.head(20))
```

`CHANGE_POINT만 모아서 보기`
```python
cp = events_df[events_df["event"] == "CHANGE_POINT"].copy()
print("\nCHANGE_POINT 후보 개수:", len(cp))
```

`(선택) 시각화 1) mean_shift_score / std_ratio 추이`
```python
px.line(score_df, x="timestamp", y="mean_shift_score", title="Mean shift score").show()
px.line(score_df, x="timestamp", y="std_ratio", title="Std ratio").show()
```

`(선택) 시각화 2) CHANGE_POINT 지점을 센서 값 위에 표시`
```python
if len(cp) > 0:
    px.scatter(cp, x="timestamp", y="value", title="Detected CHANGE_POINT on sensor value").show()
```