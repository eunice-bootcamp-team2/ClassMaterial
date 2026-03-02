### 0️⃣ 패키지 설치

```bash
# Redis 클라이언트 설치
uv add "redis>=5"
```

> 로컬에 Redis 서버가 떠 있다고 가정합니다. (기본: localhost:6379)

---

### 1️⃣ 설정에 REDIS_URL 추가

📁 `app/core/config.py` (기존 Settings에 필드만 추가)
```python
# app/core/config.py
from functools import lru_cache

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TaskBoard API"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"

    # ✅ Redis 기본 설정 추가
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

`.env`에서 바꾸고 싶으면:

```
REDIS_URL=redis://localhost:6379/1
```

---

### 2️⃣ Redis 클라이언트 모듈 (async)

📁 `app/core/redis.py`
```python
# app/core/redis.py
import redis.asyncio as redis

from app.core.config import settings

# 단일 전역 클라이언트 (연결 풀)
redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,  # str 로 받기
)
```

---

### 3️⃣ Todo 통계용 서비스 (캐싱 + 쿼리 최적화 맛보기)

“쿼리 최적화 기초”를 위해 **자주 조회되는 통계 API**를 하나 만들고,
이걸 Redis에 **짧게(예: 30초) 캐싱**하는 구조를 넣습니다.

📁 `app/services/stats_service.py`
```python
# app/services/stats_service.py
import json
from datetime import date
from typing import Dict

from app.core.redis import redis_client
from app.models.todos import get_all_todos
from app.schemas.users import UserRead

CACHE_TTL_SECONDS = 30  # 30초 동안 캐시 유지

async def _compute_todo_stats(user: UserRead) -> Dict[str, int]:
    """실제 Todo 통계 계산 (DB/모델만 사용, 캐시 없음)"""

    todos = [t for t in get_all_todos() if t.user_id == user.id]

    total = len(todos)
    todo_count = sum(1 for t in todos if t.status == "todo")
    in_progress_count = sum(1 for t in todos if t.status == "in_progress")
    done_count = sum(1 for t in todos if t.status == "done")

    today = date.today()
    due_today_count = sum(
        1 for t in todos if t.due_date is not None and t.due_date <= today
    )

    return {
        "total": total,
        "todo": todo_count,
        "in_progress": in_progress_count,
        "done": done_count,
        "due_today": due_today_count,
    }

async def get_todo_stats(user: UserRead) -> Dict[str, int]:
    """
    Todo 통계 조회 + Redis 캐시.

    1. Redis에서 캐시 조회
    2. 없으면 직접 계산 → Redis에 저장
    3. 결과 반환
    """
    cache_key = f"todo:stats:{user.id}"

    # 1) Redis 캐시 조회 (cache hit 시 즉시 반환)
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return json.loads(cached)

    # 2) 캐시 미스 → 실제 계산
    stats = await _compute_todo_stats(user)

    # 3) Redis에 저장 (TTL 설정)
    try:
        await redis_client.set(cache_key, json.dumps(stats), ex=CACHE_TTL_SECONDS)
    except Exception:
        # Redis 장애 시에도 서비스는 동작해야 하므로
        # 캐시 실패는 조용히 무시
        pass

    return stats

async def invalidate_todo_stats_cache(user_id: int) -> None:
    """해당 사용자의 Todo 통계 캐시 무효화"""
    cache_key = f"todo:stats:{user_id}"
    try:
        await redis_client.delete(cache_key)
    except Exception:
        # Redis 장애 시 무시 (캐시만 썩을 뿐, 서비스는 계속 동작)
        pass
```

---

### 4️⃣ Todo 생성/수정/삭제 시 캐시 무효화

이제 **쓰기 작업**이 일어날 때마다
해당 유저의 통계 캐시를 **invalidate** 해 줍니다.

📁 `app/services/todo_service.py` 수정
```python
# 상단 import에 추가
from app.services.notification_service import create_notification_for_user
from app.services.stats_service import invalidate_todo_stats_cache
```

4-1. 생성 시
```python
def create_todo_for_user(user: UserRead, payload: TodoCreate) -> TodoRead:
    """현재 사용자(owner) 기준 Todo 생성 + 알림 생성 + 캐시 무효화"""
    todo = create_todo_record(user_id=user.id, payload=payload)

    # 알림 생성
    create_notification_for_user(
        user_id=user.id,
        message=f"새 Todo가 생성되었습니다: {todo.title}",
        notif_type="todo_created",
    )

    # ✅ 통계 캐시 무효화 (비동기 함수지만 fire-and-forget 느낌으로 호출)
    # 여기서는 간단히 asyncio.create_task 를 사용
    import asyncio

    asyncio.create_task(invalidate_todo_stats_cache(user.id))

    return todo
```

4-2. 수정 시
```python
def update_todo_for_user(
    todo_id: int,
    payload: TodoUpdate,
    user: UserRead,
) -> TodoRead:
    """내 Todo 수정"""
    _ensure_owned_todo(todo_id, user)
    update_data = payload.model_dump(exclude_unset=True)
    updated = update_todo_record(todo_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )

    # ✅ 수정 시에도 캐시 무효화
    import asyncio

    asyncio.create_task(invalidate_todo_stats_cache(user.id))

    return updated
```

4-3. 삭제 시
```python
def delete_todo_for_user(todo_id: int, user: UserRead) -> None:
    """내 Todo 삭제"""
    _ensure_owned_todo(todo_id, user)
    ok = delete_todo_record(todo_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )

    # ✅ 삭제 시 캐시 무효화
    import asyncio

    asyncio.create_task(invalidate_todo_stats_cache(user.id))
```

> 여기서 asyncio.create_task()를 사용한 이유는
> “통계 캐시 삭제”는 **조금 늦게 되어도 상관없는 비즈니스**이기 때문에
> 요청/응답을 막지 않고 “살짝 비동기로 밀어내기” 위함입니다.
> (진짜로 큐/워커 구조를 쓰려면 Celery, RQ, Dramatiq 등을 7파트쯤에서 붙이면 좋아요.)

---

### 5️⃣ 통계 API 엔드포인트 추가 (`/api/todos/stats`)

이제 이 캐시를 사용하는 **전용 API**를 만들면 됩니다.

📁 `app/api/routes/todos.py` 하단에 추가
```python
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_for_user,
    list_todos_for_user,
    update_todo_for_user,
)
from app.services.stats_service import get_todo_stats  # ✅ 추가
```

그리고 제일 아래에 통계용 라우터 추가:
```python
@router.get(
    "/stats",
    summary="내 Todo 통계 조회 (Redis 캐시 사용)",
)
async def read_todo_stats(
    current_user: UserRead = Depends(get_current_user),
):
    """
    - total / todo / in_progress / done / due_today 통계를 반환합니다.
    - Redis에 30초간 캐시됩니다.
    """
    stats = await get_todo_stats(current_user)
    return stats
```

---

### 6️⃣ 전체 동작 체크 시나리오

1. 서버 실행
```bash
uvicorn app.main:app --reload
```

1. 회원가입 & 로그인
    `POST /api/auth/signup` → `POST /api/auth/login` → 토큰 확보 → `/docs`에서 Authorize
    
2. Todo 여러 개 생성
    `POST /api/todos/` 여러 번
    
3. 통계 조회
    `GET /api/todos/stats`
    첫 호출에서는
    → 인메모리 todos에서 직접 계산
    → Redis에 `todo:stats:<user_id>` 키로 저장
    
4. 다시 `GET /api/todos/stats` 여러 번 호출
    → 이제는 Redis에서 바로 반환 (쿼리/계산 부담 감소)
    
5. Todo 생성/수정/삭제 후 다시 `GET /api/todos/stats`
    → 캐시가 무효화되고, 새로운 값으로 다시 계산 + 캐시
    

---

## 정리 

- **쿼리 최적화 기초**
    - 자주 조회되는 “통계 API”에 대해
    - 매번 계산하지 않고 Redis에 짧게 캐싱
- **Redis 도입**
    - `core/redis.py`에 전역 클라이언트
    - `stats_service`에서 캐시 read/write
- **비동기 개념**
    - Redis 클라이언트는 `redis.asyncio`
    - 통계 조회 엔드포인트는 `async def`
    - 쓰기 작업 후 캐시 무효화는 `asyncio.create_task`로 비동기 처리