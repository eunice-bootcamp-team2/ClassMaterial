이 기능의 핵심은 Celery가 작업을 마치면 Redis Pub/Sub에 메시지를 던지고, FastAPI가 이를 실시간으로 받아 웹소켓으로 브라우저에 전달하는 것입니다

즉 쉽게 말하면 AI 분석이 끝나면 결과를 실시간으로 화면에 보내는 시스템을 만든 것입니다.

기존 방식은 브라우저 → 계속 서버에 물어봄 (끝났어? 끝났어?) 
이것을 Polling(폴링)이라고 합니다. (비효율적)

지금 변경할 방식은 서버 → 끝나면 바로 브라우저에게 알려줍니다. 
이 방법을 WebSocket (실시간 통신)이라고 합니다.

![[Pasted image 20260320154621.png]]

---
### ⏱️ 시간 순서로 이해

🟡 1. 버튼 클릭
`[비슷한 후기 보기]` 클릭

이 순간
- Django → Celery 작업 요청
- WebSocket 연결 시작
---
🟡 2. 화면 상태 (분석 중)
원래라면 이렇게 떠야 정상
```
"AI가 후기를 분석 중입니다..."
```
(이건 WebSocket 연결되면 잠깐 보임)

---
🟡 3. AI 분석 진행
백엔드에서 일어나는 일:
```
Celery → FastAPI → AI 계산
```
이때는 화면 변화 거의 없음

---
🟡 4. 🔥 핵심 순간 (여기가 중요)
Celery 작업 완료

분석 끝남
바로 이어서

Redis publish 발생

---
🟡 5. WebSocket이 받는 순간
FastAPI가 Redis 메시지 받음
```
"결과 왔다!"
```
바로 브라우저로 전송

그런데 우리 눈에는 순식간에 처리되서 보이지 않으므로 확인하고 싶으면 Celery에 딜레이를 추가해서 확인해 봅니다.

```python
import time  
  
time.sleep(3) # 3초 강제 지연
```
넣는 위치 : `analyze_review_similarity_task` 시작 부분

---
🟡 6. 💥 바로 이때 화면이 바뀜

JS에서 실행됨
```
socket.onmessage = function (event) {  
    // 여기서 화면 업데이트  
}
```

그래서 지금 화면
✔ 비슷한 후기 1개  
✔ 유사도 0.70  
✔ AI 결과 ID

이게 나타난 것입니다.

---
수정 및 추가 파일 목록
1. ai-server/main.py: 웹소켓 엔드포인트 추가 및 Redis 구독 로직 구현
2. backend/apps/ai_gateway/tasks.py: 분석 완료 후 Redis로 알림(Publish)을 보내는 로직 추가
3. backend/static/js/product-detail.js: 기존 폴링(Polling) 대신 웹소켓 연결 로직으로 교체
4. ai-server/requirements.txt: 비동기 Redis 라이브러리 추가 (`redis` 패키지)

설치패키지
```bash
uv pip install redis
```

`requirements.txt` 갱신
```
uv pip freeze > requirements.txt
```

`ai-server/main.py`
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from api.recommend import router as recommend_router
from redis.asyncio import Redis
import json


app = FastAPI(title="AI Recommendation Server")

# Redis 연결 설정 (Docker 서비스명 'redis' 사용)
REDIS_URL = "redis://redis:6379/0"

app.include_router(recommend_router)


@app.get("/")
def root():
    return {"message": "AI server is running"}


@app.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """
    클라이언트가 task_id를 가지고 웹소켓에 접속하면,
    해당 task의 완료 알림을 Redis에서 기다렸다가 전송합니다.
    """
    await websocket.accept()

    # 비동기 Redis 객체 생성
    redis = Redis.from_url(REDIS_URL)
    pubsub = redis.pubsub()
    channel_name = f"task_result_{task_id}"

    # 해당 task_id를 채널 이름으로 구독
    await pubsub.subscribe(channel_name)

    try:
        # 메시지를 무한 루프로 기다림
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            raw_data = message["data"]

            # bytes로 오면 문자열로 변환
            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode("utf-8")

            data = json.loads(raw_data)

            # Celery가 보낸 결과를 그대로 전달
            await websocket.send_json(data)

            # 결과 전송 후 연결 종료 (1회성 알림)
            break

    except WebSocketDisconnect:
        print(f"Client disconnected from task: {task_id}")

    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis.close()
        await websocket.close()
```
---
Celery 작업 수정 (`backend/apps/ai_gateway/tasks.py`)
AI 분석이 끝나면 결과를 DB에 저장한 후, 해당 `task_id` 채널로 완료됐다는 신호를 보냅니다
```python
from celery import shared_task
from django.utils import timezone
from requests import RequestException

from apps.reviews.models import Review
from .models import ReviewSimilarityResult, AIAnalysisTask
from .services import FastAPIClient

import redis
import json


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

        task_status.candidate_count = candidate_reviews.count()
        task_status.save(update_fields=["candidate_count"])

        results = []

        for candidate in candidate_reviews:
            if not candidate.content.strip():
                continue

            similarity_result = FastAPIClient.get_similarity(
                source_review.content,
                candidate.content,
            )

            score = round(similarity_result["similarity"], 4)

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

        # 분석 완료 신호를 Redis publish
        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(response_data, ensure_ascii=False),
        )

        return response_data

    except Exception as e:
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

`bindAnalyzeButtons()` 안에서 이 부분만 교체 : 수정전
```js
// [추가] 작업 등록 후 polling 시작
button.textContent = "분석 진행 중...";
pollTaskStatus(taskId, reviewId, button, resultBox);
```

수정후
```js
// [수정] 작업 등록 후 polling 대신 WebSocket 연결 시작
button.textContent = "실시간 분석 연결 중...";
connectWebSocket(taskId, reviewId, button, resultBox);
```
현재 구조의 목표는 아래와 같습니다.
- `pollTaskStatus()`  
    → 브라우저가 일정 시간마다 서버에 작업 완료 여부를 반복해서 확인하는 방식
    
- `connectWebSocket()`  
    → 서버가 작업 완료 시 브라우저로 결과를 바로 전달하는 방식
    
즉, 현재는 `connectWebSocket()` 함수 자체는 추가되어 있지만, 버튼 클릭 시 실제 호출은 아직 기존 `pollTaskStatus()`로 되어 있습니다.

그래서 이 부분을 수정하지 않으면 WebSocket 코드를 작성해도 실제 동작은 기존 polling 방식으로만 수행됩니다.

즉, 함수는 추가되었지만 실제 실행 연결은 아직 예전 방식이며 따라서 WebSocket 실시간 수신 기능은 사용되지 않는 상태입니다. 그래서 반드시 button.textContent를 수정해야 합니다.

처리구조 흐름:
```
Django View
 → Celery task 실행
   → FastAPI 호출
   → 결과 DB 저장
   → Redis publish
FastAPI WebSocket
 → Redis subscribe
 → publish 신호 받으면 클라이언트에 전송
```

기존 코드에 아래 3가지가 추가되었습니다

1. Redis 연결 객체 생성
	기존에는 없었는데, task 안에서 publish 하려면 Redis 연결이 필요합니다.
```python
redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)
```
이 코드는 Celery worker → Redis 서버 연결입니다.

2. 성공 시 publish
	- 기존에는 DB 저장 후 그냥 `return` 했어요.
	- 이제는 `return` 직전에 Redis로 신호를 보냅니다.
```python
redis_client.publish(
    f"task_result_{self.request.id}",
    json.dumps(response_data, ensure_ascii=False),
)
```
이 뜻은:
- 채널명: `task_result_현재task_id`
- 내용: 분석 결과 JSON
    
즉, FastAPI 웹소켓 서버가 이 채널을 듣고 있다가 결과를 받습니다.

3. 실패 시 publish
	에러가 나도 프론트는 알아야 하니까 실패도 보내는 게 좋습니다.
```python
error_data = {
    "task_id": self.request.id,
    "status": "FAILURE",
    "error": str(e),
}
```
그리고 이것도 Redis publish.

---
지금 화면에서 사용자가 “비슷한 후기 보기” 버튼을 누르면, 보이게 하려는 것은 크게 3가지예요.
`1.` 분석 시작 상태
예:
- `AI 분석 작업을 등록하는 중입니다...`
- `실시간 분석 중입니다...`
    
`2.` 분석 완료 결과
예:
- 비슷한 후기 3개
- 유사도 점수
- 작성자
- 설명 문구
    
`3.` 분석 실패 또는 연결 문제
예:
- `AI 분석 중 오류가 발생했습니다.`
- `실시간 연결에 실패하여 상태 확인 방식으로 전환합니다.`
    
즉, 이 WebSocket 코드는 결과를 새로 만드는 코드가 아니라,  
Celery가 끝낸 분석 결과를 실시간으로 화면에 보여주기 위한 연결 코드입니다.

지금 파일에서 핵심 흐름은 이 부분입니다.
1. `getSimilarityLabel()`
2. `getSimilarityDescription()`
3. `pollTaskStatus()` ← 현재 상태 확인 함수
4. `bindAnalyzeButtons()` ← 버튼 클릭 시 분석 요청
    
여기서 `pollTaskStatus()`가 있던 위치에 `connectWebSocket()`를 추가하면 됩니다.  

코드 추가 위치는:
- `getSimilarityDescription()` 아래
- `pollTaskStatus()` 자리입니다.


프론트엔드 수정 (`backend/static/js/product-detail.js`)
기존에 주기적으로 API를 호출하던 `pollTaskStatus` 함수를 웹소켓 연결 방식으로 바꿉니다
```js
    // =========================================================
    // [유지] Celery task 상태 polling 함수
    // WebSocket 연결 실패 시 fallback 용도로 남겨둠
    // =========================================================
    async function pollTaskStatus(taskId, reviewId, button, resultBox) {
        const maxTry = 20;
        let currentTry = 0;

        const intervalId = setInterval(async () => {
            currentTry += 1;

            try {
                const response = await api.get(`/ai/tasks/${taskId}/status/`);
                const data = response.data;

                if (data.status === "SUCCESS") {
                    clearInterval(intervalId);

                    const result = data.result || {};

                    if (!result.similar_reviews || result.similar_reviews.length === 0) {
                        resultBox.innerHTML = `
                            <div class="ai-result-inner">
                                <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                                <p>충분히 비슷한 후기를 찾지 못했어요.</p>
                                <p class="ai-sub-guide">
                                    비교할 후기가 부족하거나, 현재 후기들과 표현 차이가 클 수 있어요.
                                </p>
                            </div>
                        `;
                    } else {
                        resultBox.innerHTML = `
                            <div class="ai-result-inner">
                                <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                                <p>비슷한 후기 ${result.similar_reviews.length}개를 찾았어요.</p>
                                <p class="ai-sub-guide">
                                    같은 상품에 대해 비슷하게 느낀 사용자 후기입니다.
                                </p>

                                <ul class="ai-similar-review-list">
                                    ${result.similar_reviews.map((item) => `
                                        <li class="ai-similar-review-item">
                                            <p><strong>${item.label || getSimilarityLabel(item.score)}</strong> : ${item.content}</p>
                                            <p><small>작성자: ${item.username}</small></p>
                                            <p><small>${getSimilarityDescription(item.score)}</small></p>
                                            <p><small>유사도 ${item.score.toFixed(2)} / 작성일 ${item.created_at}</small></p>
                                            <p><small>AI 결과 ID: ${item.analysis_id}</small></p>
                                        </li>
                                    `).join("")}
                                </ul>
                            </div>
                        `;
                    }

                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                if (data.status === "FAILURE") {
                    clearInterval(intervalId);
                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>${data.error_message || "AI 분석 중 오류가 발생했습니다."}</p>
                        </div>
                    `;
                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                resultBox.innerHTML = `
                    <div class="ai-result-inner">
                        <p>AI가 후기를 분석 중입니다...</p>
                        <p class="ai-sub-guide">현재 상태: ${data.status}</p>
                    </div>
                `;

                if (currentTry >= maxTry) {
                    clearInterval(intervalId);
                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>분석 시간이 길어지고 있습니다. 잠시 후 다시 확인해주세요.</p>
                        </div>
                    `;
                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                }
            } catch (error) {
                clearInterval(intervalId);
                console.error("작업 상태 조회 실패:", error.response?.data || error);
                resultBox.innerHTML = `
                    <div class="ai-result-inner error">
                        <p>작업 상태를 확인하는 중 오류가 발생했습니다.</p>
                    </div>
                `;
                button.disabled = false;
                button.textContent = "비슷한 후기 보기";
            }
        }, 1500);
    }

    // =========================================================
    // [추가] WebSocket으로 실시간 결과를 받는 함수
    // 위치: 기존 pollTaskStatus 함수 아래 / bindAnalyzeButtons 위
    // 목적: Celery 작업 완료 시 Redis -> FastAPI WebSocket -> 브라우저로
    //       결과를 즉시 전달받아 화면에 표시
    // =========================================================
    function connectWebSocket(taskId, reviewId, button, resultBox) {
        const socket = new WebSocket(`ws://${window.location.hostname}:8001/ws/task/${taskId}`);

        socket.onopen = function () {
            console.log("[WebSocket] Connection established for task:", taskId);

            resultBox.innerHTML = `
                <div class="ai-result-inner">
                    <p>AI가 후기를 실시간으로 분석 중입니다...</p>
                    <p class="ai-sub-guide">작업이 끝나면 결과가 자동으로 표시됩니다.</p>
                </div>
            `;
        };

        socket.onmessage = function (event) {
            const data = JSON.parse(event.data);
            console.log("[WebSocket] Result received:", data);

            // [추가] 실패 결과를 먼저 처리
            if (data.status === "FAILURE") {
                resultBox.innerHTML = `
                    <div class="ai-result-inner error">
                        <p>${data.error || "AI 분석 중 오류가 발생했습니다."}</p>
                    </div>
                `;
                button.disabled = false;
                button.textContent = "비슷한 후기 보기";
                socket.close();
                return;
            }

            // [추가] 성공 시 결과를 바로 화면에 표시
            if (data.status === "SUCCESS") {
                const result = data;

                if (!result.similar_reviews || result.similar_reviews.length === 0) {
                    resultBox.innerHTML = `
                        <div class="ai-result-inner">
                            <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                            <p>충분히 비슷한 후기를 찾지 못했어요.</p>
                            <p class="ai-sub-guide">
                                비교할 후기가 부족하거나, 현재 후기들과 표현 차이가 클 수 있어요.
                            </p>
                        </div>
                    `;
                } else {
                    resultBox.innerHTML = `
                        <div class="ai-result-inner">
                            <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                            <p>비슷한 후기 ${result.similar_reviews.length}개를 찾았어요.</p>
                            <p class="ai-sub-guide">
                                같은 상품에 대해 비슷하게 느낀 사용자 후기입니다.
                            </p>

                            <ul class="ai-similar-review-list">
                                ${result.similar_reviews.map((item) => `
                                    <li class="ai-similar-review-item">
                                        <p><strong>${item.label || getSimilarityLabel(item.score)}</strong> : ${item.content}</p>
                                        <p><small>작성자: ${item.username}</small></p>
                                        <p><small>${getSimilarityDescription(item.score)}</small></p>
                                        <p><small>유사도 ${item.score.toFixed(2)} / 작성일 ${item.created_at}</small></p>
                                        <p><small>AI 결과 ID: ${item.analysis_id}</small></p>
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    `;
                }

                button.disabled = false;
                button.textContent = "비슷한 후기 보기";
                socket.close();
            }
        };

        socket.onclose = function () {
            console.log("[WebSocket] Connection closed");
        };

        socket.onerror = function (error) {
            console.error("[WebSocket] Error:", error);

            resultBox.innerHTML = `
                <div class="ai-result-inner">
                    <p>실시간 연결에 문제가 있어 상태 확인 방식으로 전환합니다...</p>
                </div>
            `;

            // [추가] WebSocket 실패 시 polling 방식으로 대체
            pollTaskStatus(taskId, reviewId, button, resultBox);
        };
    }
```
---
`ai-server/requirements.txt` 에 `redis`를 추가
항상 새로 설치된 라이브러리가 있으면 추가해야 합니다
```
redis
```

컨테이너 상태 확인
```bash
docker compose ps
```
모든 서비스의 상태가 `Up`인지 확인합니다

실행 (기본)
```bash
docker compose up -d
```
Django / Celery / Redis / FastAPI 모두 실행  
대부분 이걸 사용 (기본 실행)

링크로 확인하기
[FastAPI](http://localhost:8001)
[FastAPI 스웨거](http://localhost:8001/docs)
[DRF](http://localhost:8000)

---
코드 수정 반영 (빌드 필요할 때만)
`docker-compose.yml`이 있는 폴더에서만 수정된 파일을 재빌드 하면 됩니다.
```bash
cd ~/product-review-service/backend

docker compose up --build
```
코드 수정이 있었을때는 반드시 재빌드를 합니다.

---
### WSL + Docker 연결 문제

만약에 Docker는 설치되어 있지만 WSL에서 연결이 안 된 상태 : 에러 메시지
```
The command 'docker-compose' could not be found in this WSL 2 distro.
We recommend to activate the WSL integration in Docker Desktop settings.
```
즉,
- docker-compose 명령어 없음 ❌
- WSL ↔ Docker Desktop 연결 안됨 ❌

WSL 재시작: 이건 PowerShell 명령어입니다.
```bash
wsl --shutdown
```
그 다음 다시 WSL 실행

docker 명령어 확인
```bash
docker --version
```
정상 나오면 OK

compose 명령어 확인
```bash
docker compose version
```

---
실행 위치
```
docker-compose.yml 파일이 있는 폴더에서 실행해야 합니다
```

```bash
cd ~/product-review-service/backend  
docker compose up -d
```

---
### WebSocket 알림 기능 테스트 방법
이 테스트의 목적은 버튼 클릭 → Celery 작업 실행 → FastAPI WebSocket 연결 → 결과 수신  
이 흐름이 실제로 잘 동작하는지 확인하는 것입니다.

`1.` 먼저 확인할 것
테스트 전에 아래 컨테이너가 모두 실행 중이어야 합니다.
- Django
- Celery Worker
- Redis
- FastAPI

확인 명령어 : 모든 서비스가 `Up`인지 확인
```bash
docker compose ps
```
![[Pasted image 20260320150945.png]]

Celery-worker 로그 창 열기 : 아래 명령어로 Celery 로그를 띄워둡니다. (SERVICE 이름확인하기)
```bash
docker compose logs -f celery
```
![[Pasted image 20260320190119.png]]
Celery가 일을 받아서 AI 분석을 실제로 수행하고, 성공적으로 끝냈다는 뜻입니다.

전체흐름
```
1. 사용자가 버튼 클릭
2. Django → Celery에게 작업 요청
3. Celery → Redis 통해 작업 받음
4. Celery → FastAPI 호출해서 AI 분석
5. 결과 받아옴
6. DB 저장
7. 결과 반환
```
이게 지금 다 성공한 상태

---
FastAPI는: (fastapi-server)
```bash
docker compose logs -f fastapi
```
![[Pasted image 20260320151843.png]]
FastAPI 서버가 정상적으로 실행되고, 요청도 잘 처리되고, WebSocket도 정상 연결됨

위의 전체 흐름
```
1. FastAPI 서버 실행됨
2. AI 모델 로딩 완료
3. 브라우저에서 WebSocket 연결
4. FastAPI가 연결 수락
5. API 요청 들어옴
6. 결과 처리 완료 (200 OK)
7. WebSocket으로 결과 전달
8. 연결 종료
```

---
Redis는: (ridis-server)
```bash
docker compose logs -f redis
```
![[Pasted image 20260322141954.png]]
Redis 정상 동작 중 (문제 없음)

Redis 실행 성공
이 부분이 가장 중요합니다:
```
Server initialized  
Ready to accept connections tcp
```
의미:
- Redis 실행됨 ✅
- 포트 6379 열림 ✅
- 외부(Celery, FastAPI) 연결 가능 ✅
전체흐름
```
1. Redis 시작
2. 경고 출력 (무시 가능)
3. 연결 준비 완료
4. Docker 재빌드 → 종료
5. 다시 시작
6. 정상 실행
```
즉 Redis가 꺼졌다 켜졌다 했지만 지금은 정상적으로 켜져 있다라고 해석하면 됩니다.

위의 전체흐름을 해석해보면
`1.` Redis 시작
```
Redis is starting
```
지금 켜는 중이라는 메시지

`2.` 경고출력
```
WARNING Memory overcommit must be enabled!
```
메모리 설정이 최적은 아니야 라고 하는건데 쉽게 말하면
- 컴퓨터 설정이 100점은 아님
- 근데 지금 사용하는 데 문제 없음
    
그래서 결론:  ❗ 지금은 무시해도 됨

`3.` 연결 준비 완료
```
Ready to accept connections tcp
```
- Celery → Redis 연결 가능
- FastAPI → Redis 연결 가능
    
👉 이게 뜨면 정상

`4.` Docker 재빌드 → 종료
```
Received SIGTERM  
Redis is now ready to exit
```
Docker를 껏다는 뜻으로 컨네티너 새로 만들려고 기존 것을 종료했다는 뜻입니다.

`5.` 다시시작
```
Redis is starting
```
새 컨테이너로 다시 켜지는 중

`6.` 정상 실행
```
Ready to accept connections tcp
```
완전히 정상 작동 중

`7.`  Redis가 디스크 저장
```
Background saving terminated with success
```
- Redis가 디스크 저장 (RDB snapshot) 성공함
- 데이터 안정성 OK
- 메모리만 쓰는 게 아니라 저장까지 정상

---
Django 웹은: (drf-web)
```bash
docker compose logs -f web
```
![[Pasted image 20260320151904.png]]
브라우저에서 페이지를 보고 → 버튼을 눌러서 → Django가 Celery 작업을 요청했다

처리과정
```
1. 브라우저 접속
2. HTML / JS / CSS 불러옴
3. API로 데이터 요청
4. 이미지 / 리뷰 불러옴
5. 사용자가 버튼 클릭
6. Django → Celery 작업 요청
```
위의 과정이 결과이미지를 보면 로그에 그대로 찍힌 것입니다.

전체 연결 흐름
```
1. 사용자 버튼 클릭
2. Django (이 로그)
   → Celery에게 작업 요청 (202)
3. Celery (이전 로그)
   → 작업 수행
4. FastAPI
   → AI 분석 수행
5. 결과 생성
6. WebSocket
   → 브라우저로 전달
```
완벽하게 연결됨

---
터미널에 메시지 전송
![[Pasted image 20260320150757.png]]버튼 클릭 → Celery → FastAPI → AI 분석 → WebSocket → 결과 전달 → 완료

전체 흐름
```
1. 버튼 클릭
2. Django 요청 받음
3. Celery 작업 시작
4. FastAPI WebSocket 연결
5. AI 분석 수행
6. 결과 생성
7. WebSocket으로 전달
8. 연결 종료
```
이게 지금 로그에 다 찍힌 상태입니다.


최종 처리 속도
![[Pasted image 20260320155053.png]]
웹소켓이 느려진 게 아닙니다 ❌
측정 방식이 달라져서 그렇게 보이는 겁니다 ✅

참고로 WebSocket은 속도 개선 기술이 아닙니다. 
목적은 언제 결과가 오든 바로 보여주기가 진짜 목적입니다.

쉽게 비교하면
기존 (Polling)
```
끝났는데도  
→ 1초 뒤에 확인  
→ 2초 뒤에 확인
```
실제로 더 느림

WebSocket
```
끝나는 순간 바로 전달
```