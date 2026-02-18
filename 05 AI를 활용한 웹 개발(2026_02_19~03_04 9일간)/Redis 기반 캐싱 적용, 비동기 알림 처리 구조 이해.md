

- Redis 캐시(`todo stats`) + 캐시 무효화(쓰기 작업 후 invalidate)까지 했고,
- `async def` + `redis.asyncio`도 도입했으니,

7번에서는 **“알림(Notification)을 비동기 파이프라인으로 처리하는 구조”**를 추가하는 데 집중할게요.

컨셉은 이거야:

> Todo 생성 시 → 바로 DB에 알림을 쓰지 않고
> **Redis 큐에 “알림 이벤트”를 넣기만 함**
> → 백그라운드 워커가 Redis에서 이벤트를 꺼내서
> 실제 Notification 레코드를 생성

즉, **“요청/응답 사이클” ↔ “알림 처리” 분리**를 보여주는 예제.

---

### 1️⃣ Notification 큐용 서비스 추가 (Redis 리스트 사용)

📁 `app/services/notification_queue.py` **새 파일**
```python
# app/services/notification_queue.py
import asyncio
import json
from typing import Any, Dict

from app.core.redis import redis_client
from app.schemas.notifications import NotificationCreate
from app.services.notification_service import create_notification_for_user

# Redis 리스트 키 이름
NOTIFICATION_QUEUE_KEY = "notifications:queue"

async def enqueue_notification_event(
    user_id: int,
    message: str,
    notif_type: str = "todo_created",
) -> None:
    """
    알림 이벤트를 Redis 큐에 쌓는 함수.

    - HTTP 요청 처리 중에는 '큐에 넣기'까지만 하고
    - 진짜 알림 생성은 워커가 나중에 처리한다.
    """

    event: Dict[str, Any] = {
        "user_id": user_id,
        "message": message,
        "type": notif_type,
    }
    data = json.dumps(event)
    await redis_client.rpush(NOTIFICATION_QUEUE_KEY, data)

async def notification_worker_loop(poll_timeout: int = 10) -> None:
    """
    Redis 큐에서 알림 이벤트를 계속 꺼내서 처리하는 워커 루프.

    - BRPOP을 사용해서 큐에 데이터가 올 때까지 블로킹 대기
    - 이벤트를 꺼내면 Notification 레코드 생성
    """
    print("[NotificationWorker] 시작")

    while True:
        try:
            # BRPOP: 데이터가 들어올 때까지 기다렸다가 (최대 poll_timeout초)
            # (key, data) 형태로 반환.
            result = await redis_client.brpop(
                NOTIFICATION_QUEUE_KEY,
                timeout=poll_timeout,
            )

            # timeout 동안 아무 이벤트도 안 오면 None
            if result is None:
                # 그냥 다시 loop → 다음 BRPOP
                continue

            _key, raw = result
            event = json.loads(raw)
            user_id = event["user_id"]
            payload = NotificationCreate(
                message=event["message"],
                type=event.get("type", "todo_created"),
            )

            # 실제 Notification 레코드 생성 (동기 함수)
            create_notification_for_user(user_id=user_id, payload=payload)

            print(
                f"[NotificationWorker] processed notification for user={user_id}: "
                f"{payload.message}"
            )

        except asyncio.CancelledError:
            print("[NotificationWorker] 종료 요청 감지, 루프 종료")
            break
        except Exception as e:
            # 워커는 죽지 않고 계속 돌 수 있어야 하므로 에러를 삼키고 계속
            print(f"[NotificationWorker] error: {e!r}")
            await asyncio.sleep(1)
```

포인트:

- `enqueue_notification_event()` :
    → Todo 생성 시 여기까지만 실행 (아주 가벼운 작업)
    
- `notification_worker_loop()` :
    → 별도의 **background task**로 돌면서 Redis 큐를 소비
    → 실제 Notification 레코드를 생성
    

---

### 2️⃣ Notification 서비스 레이어 조정

이제 **“레코드 생성”**과 **“큐에 넣기”** 를 분리합니다.

📁 `app/services/notification_service.py` (전체 예시)
```python
# app/services/notification_service.py
from typing import List

from fastapi import HTTPException, status

from app.models.notifications import (
    create_notification_record,
    get_notification_by_id,
    list_notifications_by_user,
    mark_notification_read,
)
from app.schemas.notifications import NotificationCreate, NotificationRead
from app.schemas.users import UserRead

def create_notification_for_user(
    user_id: int,
    payload: NotificationCreate,
) -> NotificationRead:
    """
    실제 Notification 레코드를 생성하는 함수.
    - 워커(백그라운드)에서 호출되도록 설계
    """
    return create_notification_record(user_id=user_id, payload=payload)

def list_notifications_for_user(user: UserRead) -> List[NotificationRead]:
    """현재 사용자의 알림 목록"""
    return list_notifications_by_user(user_id=user.id)

def mark_notification_read_for_user(
    notif_id: int,
    user: UserRead,
) -> NotificationRead:
    """현재 사용자의 알림만 읽음 처리 가능"""
    notif = get_notification_by_id(notif_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notif_id} not found",
        )

    updated = mark_notification_read(notif_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notif_id} not found",
        )
    return updated
```

> 기존에 create_notification_for_user(user_id, message, type) 이
> 바로 레코드를 만들던 구조였다면,
> 이제는 **워커에서 호출하기 좋은 형태**로 바꿔둔 것.

---

### 3️⃣ Todo 생성 시 “동기 알림 생성” → “Redis 큐에 비동기 push”로 변경

이제 Todo 생성 로직에서 **알림을 직접 생성하는 대신**
Redis 큐에 이벤트를 넣도록 수정합니다.

📁 `app/services/todo_service.py` (중요 부분 수정)
```python
# app/services/todo_service.py
import asyncio
from datetime import date
from typing import List, Optional

from fastapi import HTTPException, status

from app.models.todos import (
    create_todo_record,
    delete_todo_record,
    get_all_todos,
    get_todo_by_id,
    update_todo_record,
)
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead
from app.services.notification_queue import enqueue_notification_event
from app.services.stats_service import invalidate_todo_stats_cache
```

그리고 `create_todo_for_user` 함수 수정:
```python
def create_todo_for_user(user: UserRead, payload: TodoCreate) -> TodoRead:
    """
    현재 사용자(owner) 기준 Todo 생성.

    - 1) Todo 레코드를 동기적으로 생성
    - 2) 알림 이벤트는 Redis 큐에 비동기 push
    - 3) 통계 캐시 무효화는 비동기 처리
    """
    todo = create_todo_record(user_id=user.id, payload=payload)

    # ✅ 알림 이벤트를 Redis 큐에 비동기 push
    asyncio.create_task(
        enqueue_notification_event(
            user_id=user.id,
            message=f"새 Todo가 생성되었습니다: {todo.title}",
            notif_type="todo_created",
        )
    )

    # ✅ 통계 캐시 무효화도 비동기로 처리
    asyncio.create_task(invalidate_todo_stats_cache(user.id))

    return todo
```

이제 흐름은 이렇게 바뀜:

1. 클라이언트가 `/api/todos/` 에 새 Todo 생성 요청 →
2. `create_todo_for_user`에서 DB(또는 인메모리)에 Todo 저장
3. 비즈니스 로직은 **즉시 응답**
4. 백그라운드에서:
    - Redis 큐에 알림 이벤트 push
    - 통계 캐시 삭제
5. 워커가 Redis에서 이벤트를 꺼내 알림(Notification) 레코드 생성

> 실제 실무에서는 4~5단계에 Celery / RQ / Dramatiq + 별도 워커 프로세스를 두지만,
> 여기선 “구조 이해”가 목표라 FastAPI + Redis 안에서 구현했습니다.

---

### 4️⃣ FastAPI 시작 시 Notification 워커 자동 실행

이제 Redis 큐를 소비하는 워커를 **서버 시작 시 백그라운드 태스크로 실행**해야 합니다.

📁 `app/main.py` 수정
```python
# app/main.py
import asyncio
from contextlib import suppress

from fastapi import FastAPI

from app.api.router import api_router
from app.services.notification_queue import notification_worker_loop

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo + 알림 관리용 FastAPI 백엔드",
    version="0.3.0",
)

@app.get("/", tags=["Root"])
def read_root():
    """
    API Gateway의 루트 엔드포인트.
    - 실제 비즈니스 API는 /api/... 아래로 제공
    """
    return {"message": "Welcome to TaskBoard API (via /api/*)"}

# ✅ 중앙 API 라우터 (Gateway 역할)
app.include_router(api_router, prefix="/api")

# ✅ Notification 워커 태스크를 보관할 곳
_worker_task: asyncio.Task | None = None

@app.on_event("startup")
async def on_startup() -> None:
    global _worker_task
    # 알림 워커 시작
    _worker_task = asyncio.create_task(notification_worker_loop())
    print("[Main] Notification worker started")

@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _worker_task
    if _worker_task is not None:
        _worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await _worker_task
        print("[Main] Notification worker stopped")
```

이제 서버가 뜰 때마다:

- `notification_worker_loop()`가 백그라운드에서 돌아가며
- Redis 큐에 들어온 이벤트들을 소비하고
- Notification 레코드를 생성합니다.

---

### 5️⃣ 전체 흐름 정리 (6 + 7 합쳐서)

### 1) Todo 생성

- 엔드포인트: `POST /api/todos/`
- 동작:
    1. Todo 레코드 생성 (동기)
        
    2. `enqueue_notification_event` 를 **비동기 태스크**로 실행
        → Redis 리스트(`notifications:queue`)에 `{user_id, message, type}` push
        
    3. `invalidate_todo_stats_cache` 도 비동기로 실행
        
→ 응답은 **바로 반환** (알림/캐시는 뒤에서 처리)

### 2) 통계 조회 (6번 파트)

- 엔드포인트: `GET /api/todos/stats`
- 동작:
    1. Redis에 `todo:stats:<user_id>` 캐시 있으면 바로 반환
    2. 없으면 실제로 todos 목록을 순회해서 통계 계산
    3. 다시 Redis에 30초 캐싱

### 3) 알림 처리 (7번 파트 핵심)

- 서버 시작 시:
    - `notification_worker_loop()` 백그라운드 태스크 실행
- 워커 동작:
    1. Redis `BRPOP notifications:queue` 로 이벤트 대기
    2. 이벤트가 들어오면 JSON 파싱
    3. `create_notification_for_user` 호출 → Notification 레코드 생성
    4. 다음 이벤트 대기
- 사용자는:
    - `GET /api/notifications/` 로 “내 알림 목록 조회”
    - `POST /api/notifications/{id}/read` 로 읽음 처리

> 즉, 7번 파트에서는
> **“알림 생성”과 “알림 저장/후처리”를 시간적으로 분리**해서
> 비동기 파이프라인 형태의 구조를 보여준 것입니다.

---

### ✅ 지금 상태까지 요약

1. **1~5파트**: 기본 프로젝트 구조, Todo CRUD, JWT 인증, 모듈 분리, API Gateway
2. **6파트**: Redis 캐시 도입, Todo 통계 API + 캐시 무효화
3. **7파트**:
    - Redis 큐(`notifications:queue`) 기반 비동기 알림 처리
    - 서버 시작 시 워커가 큐를 소비 → Notification 레코드 생성
    - Todo 생성 요청은 알림을 “큐에 넣기만 하고 바로 응답”하는 구조

이제 이 위에:

- (8) 파일 업로드,
- (9~11) DB/SQLAlchemy,
- (12~14) 모니터링, 미들웨어, 테스트 를 얹어도 전체 구조가 무너지지 않는 상태까지 왔어요.
