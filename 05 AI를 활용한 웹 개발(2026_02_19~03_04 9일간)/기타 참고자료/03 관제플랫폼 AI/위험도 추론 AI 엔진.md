추론을 해야하는 범위
- 가스/환경 센서
- 인원 밀집도
- 체류시간
- 과거 알람 히스토리
    
→ **위험도 점수/등급 산출**
즉, **시계열 기반 ML 추론 모델 + 룰 기반 결합** 구조가 필요합니다.

###### 필요한 기술 스택
| 학습 항목                                    | 왜 필요한가?                   | 우선순위  |
| ---------------------------------------- | ------------------------- | :---: |
| **Python 기본 + NumPy**                    | 실시간 수치 계산, 위험도 스코어 산출     | ⭐⭐⭐⭐⭐ |
| **Pandas**                               | 시계열 전처리, 윈도우 집계           | ⭐⭐⭐⭐  |
| **시계열 분석** (Rolling, 이동평균, Drift, Trend) | 위험 패턴·변화 추이 분석            | ⭐⭐⭐⭐⭐ |
| **통계 시계열 모델** (ARIMA 등)                  | 단기 위험도 예측 (실시간 가능)        | ⭐⭐⭐⭐⭐ |
| **Scikit-Learn**                         | 위험 등급 분류, 이상 탐지           | ⭐⭐⭐⭐  |
| **신호 처리 기초**                             | 센서 노이즈 제거, smoothing      |  ⭐⭐⭐  |
| **Stream / IoT 처리 기술**                   | 실시간 데이터 수집·전달             | ⭐⭐⭐⭐  |
| **TensorFlow / PyTorch**                 | 딥러닝 기반 예측 _(데이터 축적 후 선택)_ |  ⭐⭐   |

###### 실무형 모델 접근 단계
|단계|목표|기술|
|---|---|---|
|1️⃣ Rule-based 위험도|즉시 대응, 안전 기준 확보|임계치 룰, Python, NumPy|
|2️⃣ 통계 기반 시계열 모델|단기 위험도 예측|ARIMA, 이동평균, Trend 분석|
|3️⃣ ML 기반 위험도 모델|위험 등급 분류·이상 탐지|Scikit-Learn (RF, GB, IF)|
|4️⃣ 딥러닝 기반 예측 _(선택)_|중·장기 패턴 학습|LSTM, TCN _(고도화)_|
최초 출고(MVP)는 1~2단계로 충분, 데이터 누적 후 3단계, 필요 시 4단계 확장

데이터 처리 구조(실무 기준)
센서 → 실시간 수집 → Feature 변환 → 위험도 추론 → 알림 이벤트
```
센서
 → 실시간 수집
 → 시계열 Feature 변환 (Rolling / Trend)
 → Rule-based 1차 위험 판정
 → 통계 기반 예측 (ARIMA)
 → ML 기반 보정/등급화
 → 위험도 Level / 알림 이벤트
```

```
MQ / MQTT / Socket
 → Streaming Preprocess
 → Rule + TimeSeries Model
 → ML Classifier
 → Risk Level Output
```
예시
- 10초 Rolling Window 평균 가스 ppm
- 임계치 초과 여부 즉시 판단
- ARIMA로 단기 상승 위험 예측
- ML로 최종 위험 등급 산출

---
# 📌 **구체적 학습 로드맵**

📍1단계 — 데이터 기반 사고 만들기  
→ NumPy, Pandas, EDA, 그룹별/시간별 집계

📍2단계 — 센서 특성 반영  
→ 시계열 분석 (이동평균, Peaks, Drift)

📍3단계 — 위험도 분류 모델  
→ Scikit-Learn 기반 분류(레이블링 기반)

📍4단계 — 실시간 엔진으로 승격  
→ FastAPI + Redis/Worker + 배포

📍5단계 — 고급화  
→ 딥러닝 기반 예측(LSTM, Attention)

**NumPy + Pandas + Scikit-Learn + 시계열 분석**을 먼저 철저하게  
그 다음 필요 시 **딥러닝(TensorFlow/PyTorch)** 확장

A) 위험도 추론 모델(예측/분류) 코드  
B) 실시간 데이터 처리 구조 설계(FastAPI + Worker)  
C) 전체 AI Risk Engine 아키텍처(PDF용)