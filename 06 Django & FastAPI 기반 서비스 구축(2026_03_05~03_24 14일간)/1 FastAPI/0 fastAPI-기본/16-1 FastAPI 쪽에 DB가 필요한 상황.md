구조
```
Client
   │
   ├── DRF (메인 서비스)
   │       └── PostgreSQL (메인 DB)
   │
   └── FastAPI (AI / 비동기 / 실시간 처리)
```
- DB는 DRF가 중심
- FastAPI는 서빙(서비스 로직 / AI / 처리)

이런 상황일경우 FastAPI 쪽에 DB가 필요한 상황이 있을까요?
많지는 않지만 FastAPI쪽에 DB를 둬야 하는 상황을 설명해보겠습니다.

1️⃣ AI 추론 로그 저장
FastAPI가 AI 모델을 서빙할 때입니다.
```
사용자 → 추천 요청  
FastAPI → AI 모델 실행
```
이때 이런 데이터를 저장하고 싶을 수 있습니다.

예
```
prediction_logs

id
user_id
input_text
prediction
model_version
created_at
```
- 모델 성능 분석
- 추론 기록
- 오류 분석
- A/B 테스트

A/B 테스트는 두 가지 버전(A와 B)을 실제 사용자에게 나누어 보여주고, 어느 쪽이 더 좋은 결과를 내는지 비교하는 실험 방법입니다. A/B 테스트는 배포 이후 실제 사용자 데이터를 이용해 기능이나 모델의 성능을 비교하는 실험 방법입니다.

이런 로그는 DRF 서비스 데이터와 성격이 다르기 때문에 FastAPI 쪽 DB에 두는 경우가 있습니다.

2️⃣ 캐시 / 임시 데이터 저장
FastAPI는 비동기 처리나 외부 API를 많이 사용합니다.

예:
```
외부 API  
AI 결과  
추천 결과  
검색 결과
```
이걸 매번 계산하면 느립니다.

그래서 이런 테이블을 둘 수 있습니다.
```
recommendation_cache  
  
user_id  
result_json  
expires_at
```

또는 보통은 DB테이블을 두는 것보다
```
Redis
```
를 더 많이 사용합니다. 즉 DB 테이블을 만드는 것보다 Redis를 사용하는 경우가 더 많습니다.

---
3️⃣ 작업 큐 / 백그라운드 작업 상태
FastAPI가 비동기 작업을 처리할 때입니다.

작업큐란 시간이 오래 걸리는 작업을 바로 처리하지 않고, 대기열(queue)에 넣어 두었다가 백그라운드에서 처리하는 방식입니다

예:
```
이미지 분석  
영상 처리  
AI 학습  
대량 데이터 처리
```
사용자는 요청만 하고 결과는 나중에 받습니다.

그래서 이런 테이블이 필요합니다.
```
jobs  
  
id  
user_id  
status  
result  
created_at
```
FastAPI가 이 상태를 관리합니다.

---
4️⃣ 실시간 서비스 데이터

예를 들면
- 채팅
- 실시간 알림
- WebSocket
    
이런 경우입니다.
```
chat_messages  
notifications  
online_users
```
이런 데이터는 실시간 서비스와 가까워서 FastAPI 서비스 쪽 DB에 두기도 합니다.

---
5️⃣ AI 서비스 전용 데이터
AI 서비스는 일반 서비스와 다른 데이터를 사용합니다.
```
model_versions  
vector_embeddings  
feature_store  
training_logs
```
이런 테이블은 서비스 DB와 분리하는 경우가 많습니다.

---
DRF 중심 구조라면 대부분 데이터는 여기 있습니다.

DRF DB  
- users  
- products  
- orders  
- reviews  
- payments

FastAPI는 보통 이런 데이터만 별도로 가질 수 있습니다.

FastAPI DB  
- ai_logs  
- prediction_logs  
- cache  
- jobs  
- chat_messages  
- vector_embeddings

즉
서비스 데이터 → DRF
AI / 비동기 / 실시간 데이터 → FastAPI
이렇게 나뉘는 경우가 있습니다.

---
🔵 한 줄 정리

FastAPI에 DB가 필요한 경우는 보통
1️⃣ AI 추론 로그  
2️⃣ 캐시 데이터  
3️⃣ 비동기 작업 상태  
4️⃣ 실시간 서비스 데이터  
5️⃣ AI 전용 데이터

같은 서비스 보조 데이터를 저장할 때입니다.