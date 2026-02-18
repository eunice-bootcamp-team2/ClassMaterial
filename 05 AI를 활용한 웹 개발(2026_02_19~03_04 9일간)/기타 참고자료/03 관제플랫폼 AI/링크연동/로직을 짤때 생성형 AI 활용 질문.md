1) 데이터 수신 직후: 스키마 검증/정규화

상황
- 값이 누락/타입 틀림/단위 혼동/필드 추가됨
- `valid`, `calibration_flag`, `signal_strength` 같은 QA 필드 처리 필요
    

 AI에게 할 질문
- 아래 센서 JSON 스키마로 Pydantic 모델을 만들어줘. 누락/타입오류를 검증하고, invalid면 이유를 반환해.
- CO/H2S/O2/CO2/온습도/미세먼지/소음의 허용 범위(물리적으로 말이 되는 범위)로 sanity check 로직을 추가해줘.
- `valid=false` 또는 `calibration_flag=true`면 추론 제외하고 관제에 ‘품질 이슈’ 이벤트를 보내는 로직 설계해줘.
    
---
2) 품질(QA)·장치 상태: ‘센서 고장’ vs ‘실제 위험’ 분리

상황
- 센서가 고장났는데 위험으로 오탐하면 큰일
- 배터리/통신불량/보정필요면 추론 신뢰도 낮춤
    

AI에게 할 질문
- `battery<20`, `signal_strength<-90`, `calibration_flag=true`일 때 risk_score 신뢰도를 낮추는 방식(가중치/플래그) 설계해줘.
- “센서 고장 의심 조건을 정의해줘: 갑작스런 점프, 범위 밖 값, 특정 값 고정(stuck) 등.”
    
---
3) 1차 룰(운영기준) 경보: 즉시 판단

상황
- 표에 ‘운영기준(알람)’이 이미 존재 (⚠️/🔥)
- 이건 AI보다 **규칙이 먼저**임
    

AI에게 할 질문
- 표의 운영기준을 코드로 바꿔줘. 각 항목별 caution/danger 기준을 함수로 만들고, 이벤트를 생성해줘.
- 동시에 여러 항목이 기준 초과일 때 alert_level을 어떻게 결정할지(최대 위험 우선, 조합 규칙) 정책을 제안해줘.
    
---
4) 멀티센서 조합 로직: 단일 임계치로 안 되는 위험

상황
- CO2 높고 O2 낮으면 ‘환기/질식 위험’처럼 **조합 위험**
- 온도+습도는 열스트레스(간이 WBGT)로 묶을 수 있음
    

AI에게 할 질문
- CO2와 O2를 결합해 ‘환기/질식 위험 점수’를 만드는 간단한 조합 스코어를 설계해줘.
- Temperature+Humidity로 열스트레스 지표(간단 버전)를 만들어 caution/danger로 매핑해줘.
    

---
5) 시간 개념(시계열) 처리: trend(변화율) 만들기

상황
- 지금은 1개 샘플이지만, 관제는 최근 N분 윈도우가 필수
- `seq`, `timestamp`로 순서/유실 검출도 해야 함
    

AI에게 할 질문
- device_id별로 최근 5분 데이터를 메모리(또는 Redis)에 유지하고 rolling mean, rolling std, 변화율(trend)을 계산하는 구조를 설계해줘.
- `seq`가 끊기면 유실 이벤트를 기록하고, 추론에 어떤 영향을 줄지 정책을 정해줘.
    
---
6) 이상탐지(Anomaly): ‘임계치 미만인데 이상한’ 경우

상황
- 기준치는 넘지 않았지만 평소 패턴과 다르면 조기경보 가치가 큼
    

AI에게 할 질문
- rolling mean/std 기반 z-score 이상탐지 규칙을 만들어줘. (예: |z|>3이면 anomaly)
- IsolationForest로 항목별/다변량 이상탐지를 하려면 어떤 feature를 쓰는 게 좋을지 추천해줘.
    
---
7) 위험 점수(risk_score)와 alert_level 매핑

상황
- 지금 JSON엔 `risk_score`, `alert_level`이 이미 있음 → 우리 엔진이 계산해서 채워야 함
- 점수는 0~100, 레벨은 normal/caution/danger
    

AI에게 할 질문
- 각 센서 항목을 0~100 위험도로 정규화하는 방법(임계치 기반 piecewise scaling)을 제안해줘.
- 여러 항목 위험도를 가중합해서 최종 risk_score를 만들고, 3단계 alert_level로 매핑하는 코드를 만들어줘.
    
---
8) 제어/릴레이 정책: 자동 차단(옵션) 의사결정

상황
- relay_state/control_source가 있음 → 위험 시 차단 여부 결정 필요(안전/감사추적)
    

AI에게 할 질문
- danger일 때 relay_state를 OFF로 제어하는 정책을 설계해줘(예외조건 포함: 신호불량/배터리부족/유효성 false).
- control_source=auto로 차단했을 때 감사로그에 남길 필드를 정의해줘.
    
---
9) API 설계(FastAPI): 입력→추론→출력 계약

상황
- 플랫폼이 이 엔진을 호출하거나, 엔진이 MQ 소비 후 결과를 push할 수 있음
    

AI에게 할 질문
- FastAPI에서 `/infer` 엔드포인트를 설계해줘: 입력(raw sensor json) → 출력(risk_score, alert_level, trend, reasons[])
- 헬스체크 `/health`, 모델버전 `/version`도 같이 만들어줘.
    
---
10) 테스트/시뮬레이터: 가짜 데이터로 검증이 핵심

상황
- 실시간 센서가 없어도 개발 가능해야 함(지금 질문이 그 상황)
    

AI에게 할 질문
- 위 스키마로 가짜 센서 데이터 생성기(정상/스파이크/드리프트/고장)를 만들어줘.
- pytest로 케이스별 기대 결과(정상/주의/위험)를 테스트 코드로 작성해줘.