핵심 목표
- 흐름 추적 (START / LOOP / SAVE / FINISH)
- 에러 추적
- Celery task_id 기반 로그 식별

Django / Celery
- `logger.info()` : 작업 시작, 작업 완료
- `logger.warning()` : 후보 리뷰 없음, 재시도 발생
- `logger.error()` : 예외 발생
    
FastAPI
- `logger.info()` : WebSocket 연결, Redis 메시지 수신
- `logger.error()` : 연결 실패, JSON 파싱 실패
    
Redis
- Redis 자체 로그는 Docker 로그로 확인

전체 구조 기준
```
[Django] → Celery → Redis → FastAPI(WebSocket) → 브라우저
```
로그는 이 3군데만 넣으면 됩니다
1. Celery (tasks.py)
2. FastAPI (main.py)
3. Redis (❌ 코드에 안 넣음, 로그 방식 다름)

Redis 로그 확인 방법
```bash
docker compose logs -f redis
```

---
`backend/apps/ai_gateway/tasks.py`
```python
from celery import shared_task
from django.utils import timezone
from requests import RequestException

from apps.reviews.models import Review
from .models import ReviewSimilarityResult, AIAnalysisTask
from .services import FastAPIClient

import redis
import json

import logging  # ✅ [추가] 로깅 사용

# ✅ [추가] logger 생성 (파일 상단에 1번만)
logger = logging.getLogger(__name__)


def get_similarity_label(score: float) -> str:
    if score > 0.7:
        return "매우 비슷"
    if score > 0.5:
        return "비슷"
    if score > 0.3:
        return "약간 비슷"
    return "관련 있음"


@shared_task(
    bind=True,
    autoretry_for=(RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
    """
    기준 리뷰 1개를 기준으로 같은 상품 내 다른 리뷰들과 유사도 분석 후
    ReviewSimilarityResult에 저장하는 Celery task

    추가 기능:
    - 작업 완료 후 Redis publish
    - FastAPI WebSocket 서버가 이 신호를 받아 클라이언트에 전달
    """
    MODEL_NAME = "upskyy/e5-small-korean"
    SIMILARITY_THRESHOLD = 0.45

    # ✅ [추가] task 시작 로그
    logger.info(f"[START] Task 시작 | task_id={self.request.id} review_id={review_id}")

    # Redis 연결 객체 생성
    # Docker Compose에서 서비스명이 redis 라면 host='redis' 사용
    redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)

    # task_id 기준으로 상태 레코드 조회
    task_status = AIAnalysisTask.objects.get(task_id=self.request.id)
    task_status.status = AIAnalysisTask.STATUS_STARTED
    task_status.started_at = timezone.now()
    task_status.error_message = ""
    task_status.save(update_fields=["status", "started_at", "error_message"])

    try:
        source_review = Review.objects.select_related("user", "product").get(
            id=review_id,
            is_public=True,
        )

        # ✅ [추가] source 리뷰 로그
        logger.info(f"[SOURCE] 기준 리뷰 조회 완료 | review_id={source_review.id}")

        if not source_review.content.strip():
            raise ValueError("분석할 리뷰 내용이 없습니다.")

        candidate_reviews = (
            Review.objects
            .select_related("user")
            .filter(
                product=source_review.product,
                is_public=True,
            )
            .exclude(id=source_review.id)
            .order_by("-created_at")[:20]
        )

        # ✅ [추가] 후보 개수 로그
        logger.info(f"[CANDIDATES] 후보 리뷰 개수={candidate_reviews.count()}")

        task_status.candidate_count = candidate_reviews.count()
        task_status.save(update_fields=["candidate_count"])

        results = []

        for candidate in candidate_reviews:
            if not candidate.content.strip():
                continue

            # ✅ [추가] 각 리뷰 비교 시작 로그
            logger.debug(f"[COMPARE] 비교 시작 | candidate_id={candidate.id}")

            similarity_result = FastAPIClient.get_similarity(
                source_review.content,
                candidate.content,
            )

            score = round(similarity_result["similarity"], 4)

            # ✅ [추가] score 로그
            logger.debug(f"[SCORE] candidate_id={candidate.id} score={score}")

            if score < SIMILARITY_THRESHOLD:
                continue

            similarity_label = get_similarity_label(score)

            saved_result, _ = ReviewSimilarityResult.objects.update_or_create(
                source_review=source_review,
                compared_review=candidate,
                model_name=MODEL_NAME,
                defaults={
                    "product": source_review.product,
                    "requested_by_id": requested_by_id,
                    "similarity_score": score,
                    "similarity_label": similarity_label,
                    "similarity_threshold": SIMILARITY_THRESHOLD,
                    "source_review_snapshot": source_review.content,
                    "compared_review_snapshot": candidate.content,
                    "compared_username_snapshot": candidate.user.username,
                }
            )

            # ✅ [추가] DB 저장 로그
            logger.info(f"[SAVE] 유사도 저장 | candidate_id={candidate.id} score={score}")

            results.append({
                "analysis_id": saved_result.id,
                "review_id": candidate.id,
                "username": candidate.user.username,
                "content": candidate.content,
                "score": score,
                "label": similarity_label,
                "created_at": candidate.created_at.strftime("%Y-%m-%d %H:%M"),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        top_results = results[:3]

        task_status.status = AIAnalysisTask.STATUS_SUCCESS
        task_status.result_count = len(top_results)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "result_count", "finished_at"])

        # ✅ [추가] 완료 로그
        logger.info(f"[SUCCESS] Task 완료 | 결과 수={len(top_results)} task_id={self.request.id}")

        response_data = {
            "source_review": {
                "review_id": source_review.id,
                "username": source_review.user.username,
                "content": source_review.content,
            },
            "similar_reviews": top_results,
            "candidate_count": candidate_reviews.count(),
            "similarity_threshold": SIMILARITY_THRESHOLD,
            "model_name": MODEL_NAME,
            "task_id": self.request.id,
            "status": "SUCCESS",
        }

        # ✅ [추가] Redis publish 로그
        logger.info(f"[REDIS] 결과 publish | channel=task_result_{self.request.id}")

        # 분석 완료 신호를 Redis publish
        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(response_data, ensure_ascii=False),
        )

        return response_data

    except Exception as e:
        
        # ✅ [추가] 에러 로그 (stack trace 포함)
        logger.exception(f"[ERROR] Task 실패 | task_id={self.request.id} error={str(e)}")

        task_status.status = AIAnalysisTask.STATUS_FAILURE
        task_status.error_message = str(e)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "error_message", "finished_at"])

        error_data = {
            "task_id": self.request.id,
            "status": "FAILURE",
            "error": str(e),
        }

        # 실패 신호도 Redis publish
        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(error_data, ensure_ascii=False),
        )

        raise
```
---
`ai-server/main.py`
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from api.recommend import router as recommend_router
from redis.asyncio import Redis
import json
import logging  # ✅ [추가] 로깅

# ✅ [추가] logger 생성
logger = logging.getLogger(__name__)


app = FastAPI(title="AI Recommendation Server")

REDIS_URL = "redis://redis:6379/0"

app.include_router(recommend_router)


@app.get("/")
def root():
    return {"message": "AI server is running"}


@app.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):

    # ✅ [추가] WebSocket 연결 요청 로그
    logger.info(f"[WS CONNECT] task_id={task_id}")

    await websocket.accept()

    redis = Redis.from_url(REDIS_URL)
    pubsub = redis.pubsub()
    channel_name = f"task_result_{task_id}"

    # ✅ [추가] Redis 구독 시작 로그
    logger.info(f"[REDIS SUBSCRIBE] channel={channel_name}")

    await pubsub.subscribe(channel_name)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            raw_data = message["data"]

            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode("utf-8")

            # ✅ [추가] 메시지 수신 로그
            logger.info(f"[REDIS RECEIVE] task_id={task_id}")

            data = json.loads(raw_data)

            # ✅ [추가] 클라이언트 전송 로그
            logger.info(f"[WS SEND] task_id={task_id} status={data.get('status')}")

            await websocket.send_json(data)

            # 1회성 알림 후 종료
            break

    except WebSocketDisconnect:
        # ✅ [추가] 클라이언트 강제 종료 로그
        logger.warning(f"[WS DISCONNECT] task_id={task_id}")

    except Exception as e:
        # ✅ [추가] 에러 로그 (stack trace 포함)
        logger.exception(f"[WS ERROR] task_id={task_id} error={str(e)}")

    finally:
        # ✅ [추가] 정리 작업 로그
        logger.info(f"[WS CLEANUP] task_id={task_id}")

        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis.close()

        # 이미 끊긴 경우 예외 방지용 try
        try:
            await websocket.close()
        except Exception:
            pass
```
---
삽입한 로그를 어디에서 확인하나?

Celery (tasks.py에 넣은 로그) `backend/apps/ai_gateway/tasks.py`
```bash
docker compose logs -f celery
```
여기서 보입니다
Celery가 작업을 받고 → AI 분석하고 → 결과를 반환한 로그
![[Pasted image 20260320190216.png]]
로그는 항상 이 흐름으로 읽으면 됩니다
```
[시간] [레벨/프로세스] 내용
```

Task 실행 완료 : 이게 가장 중요합니다
```
Task ... succeeded in 0.315s: {...}
```
0.315초 처리로 빠름 → 정상

처리 결과
```json
{
  "source_review": {...},
  "similar_reviews": [...],
  "candidate_count": 1,
  "similarity_threshold": 0.45,
  "model_name": "upskyy/e5-small-korean",
  "task_id": "...",
  "status": "SUCCESS"
}
```
- Redis 연결 OK
- Celery 정상
- FastAPI 호출 OK
- 결과 정상 반환
- DB 저장 OK (추정)
- 에러 없음
    
👉 완전 정상 시스템

---
FastAPI (main.py에 넣은 로그) `ai-server/main.py`
```bash
docker compose logs -f fastapi
```
여기서 보입니다

FastAPI + WebSocket + Celery 연동이 제대로 되는지 확인하는 핵심 로그 : 지금 구조 완벽하게 정상 작동 중입니다
![[Pasted image 20260320190252.png]]

지금 시스템은 이렇게 움직임
```
1. Django → Celery task 요청
2. Celery → FastAPI API 호출
3. FastAPI → AI 모델 실행
4. 결과 반환
5. Celery → Redis publish
6. FastAPI WebSocket → 결과 전달
7. WebSocket 종료
```

|항목|상태|
|---|---|
|FastAPI 서버|정상|
|WebSocket|정상|
|Redis 연결|정상|
|Celery 연동|정상|
|AI 모델 호출|정상|
|응답 처리|정상|

# 💡 개선 포인트 (있다면)

## 1️⃣ HF Token 추가 (선택)

HF_TOKEN=xxx

👉 속도 개선

---

## 2️⃣ 로그 구조 개선 (선택)

👉 지금은 uvicorn 기본 로그

👉 나중에:

logger.info("[WS CONNECT]")