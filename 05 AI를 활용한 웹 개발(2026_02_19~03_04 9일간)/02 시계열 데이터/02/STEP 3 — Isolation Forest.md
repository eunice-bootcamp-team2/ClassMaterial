### STEP 3 코드는 어떤 상황에서 사용하나?
정상 기준을 수학으로 정의하기 어려운 상황에서 사용됩니다. 왜냐하면 STEP 1, 2는 전제 조건이 있었습니다.
✔ 평균 존재  
✔ 분포 안정  
✔ 정상 범위 정의 가능

하지만 현실에서는 이런 문제가 자주 발생합니다.
❌ 정상 범위가 명확하지 않음  
❌ 패턴이 복잡함  
❌ 기준선을 정의하기 어려움
그래서 ML 모델 등장

### STEP 3의 본질
이 단계의 핵심 개념은 규칙 기반 탐지에서 → 패턴 기반 탐지로 전환하는 것입니다.
- STEP 1, 2: → 사람이 기준 설정
- STEP 3: → 모델이 기준 학습

### 무엇을 얻는가?
이 코드는 평균/표준편차 계산이 목적이 아니라 
✔ 정상 데이터의 형태  
✔ 정상 군집 영역  
✔ 고립된 데이터 식별 능력
즉, 정상 정의를 사람이 안 해도 됩니다.

### 왜 필요한가? (실무 핵심 이유)
현실 데이터 특징:
✔ 다변량 구조 (센서 여러 개)  
✔ 비선형 패턴  
✔ 정상 범위가 시간에 따라 변함  
✔ 단순 임계치 실패
Z-score로 해결 안 되는 경우 대응용.

### STEP 2와 무엇이 다른가?
|STEP 2|STEP 3|
|---|---|
|통계 계산 기반|ML 모델 기반|
|평균 중심 사고|데이터 분포 구조 사고|
|기준선 존재 필요|기준선 불필요|
|규칙 기반 판정|학습 기반 판정|

### 이 코드는 무엇을 증명하는가?
이 코드가 보여주는 가장 중요한 사실:
- 라벨 없이 이상 탐지가 가능하다
- 정상/이상 정답 데이터 없이도 학습 가능
이게 Isolation Forest의 핵심 가치입니다.

### Isolation Forest가 실제로 하는 일
정상 데이터들은 서로 비슷해서 비슷한 값들끼리 모여 있고,  
이상 데이터는 다른 값들과 다르기 때문에 혼자 따로 떨어져 보인다.  
그래서 혼자 튀는 데이터는 이상일 가능성이 높다고 판단한다

### 어디에 활용되나? (실무 사례)
✔ 제조 설비 이상 탐지  
✔ 네트워크 공격 탐지  
✔ 금융 사기 탐지  
✔ 서버 장애 감지  
✔ 사용자 행동 이상 탐지  
✔ 로그 분석등에 매우 흔하게 사용됩니다.


---
### Isolation Forest 패턴 뼈대코드
```python
# ============================================
# [STEP 3 Skeleton] Isolation Forest 이상 탐지 패턴
# - 라벨 없는 비지도 학습
# - fit → predict 구조
# ============================================

from sklearn.ensemble import IsolationForest

# 0) 데이터 준비
# X = 이상 탐지에 사용할 수치형 데이터 (2차원 구조)
# 예: 센서값 / 파생변수 / 여러 센서 조합 등

# 1) 모델 생성
model = IsolationForest(
    contamination=0.01,   # 이상 비율 가정 (중요 파라미터)
    random_state=42
)

# 2) 학습 (정상/이상 라벨 없이 학습 가능)
model.fit(X)

# 3) 예측
labels = model.predict(X)

# 규칙:
#  1  → 정상
# -1  → 이상치

# 4) 결과 활용
# 이상치 필터링 / 알람 / 시각화 / 로그 기록 등
```
---

```python
from sklearn.ensemble import IsolationForest
```
scikit-learn 라이브러리 안에 있는 `ensemble` 모듈에서  
`IsolationForest`라는 모델 클래스를 가져옵니다.

---
`0) 데이터 준비`
```python
X = 이상 탐지에 사용할 수치형 데이터 (2차원 구조)
```
이상 탐지 모델에 입력으로 사용할 숫자 데이터 묶음을 준비합니다.

---
`1) 모델 생성`
```python
model = IsolationForest(
    contamination=0.01,   # 이상 비율 가정 (중요 파라미터)
    random_state=42
)
```
이상치를 탐지하기 위한 Isolation Forest 모델을 하나 만듦니다. 즉 이상 탐지를 수행할 분석 도구를 설정하고 준비하는 단계입니다.

아직 학습도 아니고 예측도 아니며,
✔ 모델을 실제로 작동시키기 전  
✔ 어떤 기준으로 탐지할지 옵션을 정하고  
✔ 모델 객체를 만드는 단계입니다.

---
`2) 학습 (정상/이상 라벨 없이 학습 가능)`
```python
model.fit(X)
```
준비된 데이터를 이용해 모델이 데이터의 패턴을 스스로 학습하는 단계입니다. 
즉, 모델이 데이터의 특징과 분포를 파악하는 과정입니다.

---
`3) 예측`
```python
labels = model.predict(X)
```
학습이 완료된 모델이 데이터를 검사하여 정상인지 이상인지 판단하는 단계입니다.
좀더 쉽게 설명하면 모델이 각 데이터 값을 확인하고 판정 결과를 만들어내는 과정입니다.


---
`4) 결과 활용`
```python
이상치 필터링 / 알람 / 시각화 / 로그 기록 등
```

이상치 필터링은 모델이 이상치라고 판단한 데이터만 분리하는 작업입니다.
```python
# 기본형태
# 정상 / 이상 구분 컬럼 생성  
df_model["is_anomaly"] = df_model["label"] == -1  
  
# 이상치만 추출  
anomalies = df_model[df_model["is_anomaly"]]  
  
print("이상치 개수:", len(anomalies))  
print(anomalies.head())
```

알람 처리 (경고 시스템)은 이상치가 발견되었을 때 특정 행동을 수행합니다.
```python
# 가장 단순한 형태
if len(anomalies) > 0:  
	print("🚨 이상치 감지! 확인 필요")

# 실무에 가까운 형태
THRESHOLD = 5 # 허용 이상치 개수  
  
if len(anomalies) >= THRESHOLD:  
	print("🚨 위험 상태 — 즉시 점검 필요")  
else:  
	print("정상 범위")
```

시각화는 모델이 제대로 탐지했는지 눈으로 검증하는 단계입니다.
```python
import plotly.express as px

# 전체 데이터
px.line(df_model, x="timestamp", y="value", title="전체 데이터").show()

# 이상치만 강조
px.scatter(
    anomalies,
    x="timestamp",
    y="value",
    title="탐지된 이상치"
).show()
```
- 모델 결과는 반드시 시각 검증 필요
- 잘못 탐지하는 경우 즉시 발견 가능
- 실무에서 거의 필수 단계

로그 기록 (운영 시스템 핵심)은 이상치 발생 이력을 남기는 작업입니다.
```python
# 가장 기본 형태:
anomalies.to_csv("anomalies_log.csv", index=False)
print("로그 파일 저장 완료")

# 좀더 현실적인 형태:
from datetime import datetime

log_time = datetime.now()

anomalies["detected_at"] = log_time
anomalies.to_csv("anomaly_history.csv", mode="a", header=False, index=False)
```
- 나중에 문제 원인 분석 가능
- 재현 / 감사 / 모니터링 가능
- 장애 대응에 매우 중요
- 
---
### 실무를 위한 연습 전체코드
```python
# ============================================
# [STEP 3 전체코드] Isolation Forest 이상 탐지 실무 예시
# - 라벨 없는 이상 탐지
# - 센서 데이터 기반
# - 실무 구조 그대로
# ============================================

import numpy as np
import pandas as pd
import plotly.express as px
from sklearn.ensemble import IsolationForest

# -------------------------------------------------
# 0) 데이터 준비 (실습용 센서 데이터 생성)
# -------------------------------------------------
np.random.seed(42)

n = 600
timestamps = pd.date_range("2026-02-11 10:00:00", periods=n, freq="s")

values = 100 + np.random.normal(0, 1.2, size=n)

# 비정상 패턴 삽입 (센서 급변 상황 가정)
spike_idx = [120, 121, 260, 400, 520]
values[spike_idx] += [12, -14, 18, -20, 15]

df = pd.DataFrame({
    "timestamp": timestamps,
    "value": values
})

df = df.sort_values("timestamp").reset_index(drop=True)

# -------------------------------------------------
# 1) Feature 구성 (매우 중요)
#    Isolation Forest는 2차원 입력 필요
# -------------------------------------------------
# 실무에서는 원본 값 그대로 넣는 경우 거의 없음
# → 최근 평균 / 변화량 / 분산 등 파생변수 추가

WINDOW = 30

df["roll_mean"] = df["value"].rolling(WINDOW).mean()
df["roll_std"]  = df["value"].rolling(WINDOW).std(ddof=0)
df["diff"]      = df["value"].diff()

# 초기 NaN 제거 (ML 모델 필수 작업)
df_model = df.dropna().copy()

# 모델 입력 변수 선택
FEATURES = ["value", "roll_mean", "roll_std", "diff"]
X = df_model[FEATURES]

# -------------------------------------------------
# 2) Isolation Forest 모델 생성
# -------------------------------------------------
model = IsolationForest(
    contamination=0.01,   # 이상 비율 가정 (실무 핵심 파라미터)
    random_state=42
)

# -------------------------------------------------
# 3) 학습 (비지도 학습 → 라벨 불필요)
# -------------------------------------------------
model.fit(X)

# -------------------------------------------------
# 4) 예측 (정상=1 / 이상=-1)
# -------------------------------------------------
df_model["label"] = model.predict(X)

# 이상치만 필터링
df_model["is_anomaly"] = df_model["label"] == -1

anomalies = df_model[df_model["is_anomaly"]]

print("탐지된 이상치 개수:", len(anomalies))
print(anomalies[["timestamp", "value"]].head(10))

# -------------------------------------------------
# 5) 시각화 — 이상치 확인 (실무에서 매우 중요)
# -------------------------------------------------

# (1) 전체 시계열
px.line(df, x="timestamp", y="value", title="Sensor Data").show()

# (2) 이상치 포인트만 표시
px.scatter(
    anomalies,
    x="timestamp",
    y="value",
    title="Isolation Forest Detected Anomalies"
).show()
```
---
`필요한 모듈 불러오기`
```python
import numpy as np
import pandas as pd
import plotly.express as px
from sklearn.ensemble import IsolationForest
```

`0) 데이터 준비 (실습용 센서 데이터 생성)`
```python
np.random.seed(42)
```


```python
n = 600
timestamps = pd.date_range("2026-02-11 10:00:00", periods=n, freq="s")
```


```python
values = 100 + np.random.normal(0, 1.2, size=n)
```


```python
spike_idx = [120, 121, 260, 400, 520]
values[spike_idx] += [12, -14, 18, -20, 15]
```


```python
df = pd.DataFrame({
    "timestamp": timestamps,
    "value": values
})
```



```python
df = df.sort_values("timestamp").reset_index(drop=True)
```


---
`1) Feature 구성 (매우 중요)`
```python
WINDOW = 30
```


```python
df["roll_mean"] = df["value"].rolling(WINDOW).mean()
df["roll_std"]  = df["value"].rolling(WINDOW).std(ddof=0)
df["diff"]      = df["value"].diff()
```

초기 NaN 제거 (ML 모델 필수 작업)
```python
df_model = df.dropna().copy()
```

모델 입력 변수 선택
```python
FEATURES = ["value", "roll_mean", "roll_std", "diff"]
X = df_model[FEATURES]
```





---
`2) Isolation Forest 모델 생성`
```python
model = IsolationForest(
    contamination=0.01,   # 이상 비율 가정 (실무 핵심 파라미터)
    random_state=42
)
```


---
`3) 학습 (비지도 학습 → 라벨 불필요)`
```python
model.fit(X)
```


---
`4) 예측 (정상=1 / 이상=-1)`
```python
df_model["label"] = model.predict(X)
```

이상치만 필터링
```python
df_model["is_anomaly"] = df_model["label"] == -1
```


```python
anomalies = df_model[df_model["is_anomaly"]]
```


```python
print("탐지된 이상치 개수:", len(anomalies))
print(anomalies[["timestamp", "value"]].head(10))
```



---
`5) 시각화 — 이상치 확인 (실무에서 매우 중요)`
`(1) 전체 시계열`
```python
px.line(df, x="timestamp", y="value", title="Sensor Data").show()
```

`(2) 이상치 포인트만 표시`
```python
px.scatter(
    anomalies,
    x="timestamp",
    y="value",
    title="Isolation Forest Detected Anomalies"
).show()
```

