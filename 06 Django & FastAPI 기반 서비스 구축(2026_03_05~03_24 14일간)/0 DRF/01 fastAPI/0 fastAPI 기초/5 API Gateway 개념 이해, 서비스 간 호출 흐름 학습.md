### 1️⃣ Notification 스키마 추가

📁 `app/schemas/notifications.py`
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

class NotificationBase(BaseModel):
    """알림 공통 필드"""

    message: str = Field(..., example="새 Todo가 생성되었습니다.")
    type: str = Field(
        default="todo_created",
        description="알림 유형 (todo_created, deadline_soon 등)",
        example="todo_created",
    )

class NotificationCreate(NotificationBase):
    """알림 생성용 스키마"""

    pass

class NotificationRead(NotificationBase):
    """클라이언트 응답용 스키마"""

    id: int
    user_id: int
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
```

> Todo처럼 Base / Create / Read 3단 구조입니다.

---

### 2️⃣ Notification 인메모리 “모델 계층”

📁 `app/models/notifications.py`
```python
from datetime import datetime
from typing import List, Optional

from app.schemas.notifications import NotificationCreate, NotificationRead

_fake_notifications_db: List[NotificationRead] = []
_auto_notification_id = 1

def create_notification_record(
    user_id: int,
    payload: NotificationCreate,
) -> NotificationRead:
    """알림 레코드 생성"""
    global _auto_notification_id

    notif = NotificationRead(
        id=_auto_notification_id,
        user_id=user_id,
        created_at=datetime.utcnow(),
        is_read=False,
        **payload.model_dump(),
    )
    _auto_notification_id += 1
    _fake_notifications_db.append(notif)
    return notif

def list_notifications_by_user(user_id: int) -> List[NotificationRead]:
    return [n for n in _fake_notifications_db if n.user_id == user_id]

def get_notification_by_id(notif_id: int) -> Optional[NotificationRead]:
    for notif in _fake_notifications_db:
        if notif.id == notif_id:
            return notif
    return None

def mark_notification_read(notif_id: int) -> Optional[NotificationRead]:
    for idx, notif in enumerate(_fake_notifications_db):
        if notif.id == notif_id:
            updated = NotificationRead(
                **notif.model_dump(),
                is_read=True,
            )
            _fake_notifications_db[idx] = updated
            return updated
    return None
```

---

### 3️⃣ Notification 서비스 레이어

📁 `app/services/notification_service.py`
```python
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
    message: str,
    notif_type: str = "todo_created",
) -> NotificationRead:
    """특정 사용자에게 알림 생성"""
    payload = NotificationCreate(message=message, type=notif_type)
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

---

### 4️⃣ Todo 서비스 → Notification 서비스 호출 연결

> “서비스 간 호출 흐름”을 위해 Todo 생성 시 자동으로 알림을 남기게 합니다.

📁 `app/services/todo_service.py` **수정**
```python
# 맨 위 import 에 추가
from app.services.notification_service import create_notification_for_user
```

그리고 `create_todo_for_user` 함수 안을 이렇게 수정:

```python
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead
from app.services.notification_service import create_notification_for_user
# ...위 생략...

def create_todo_for_user(user: UserRead, payload: TodoCreate) -> TodoRead:
    """현재 사용자(owner) 기준 Todo 생성 + 알림 생성"""
    todo = create_todo_record(user_id=user.id, payload=payload)

    # ✅ Todo 생성 후, 알림 서비스 호출
    create_notification_for_user(
        user_id=user.id,
        message=f"새 Todo가 생성되었습니다: {todo.title}",
        notif_type="todo_created",
    )

    return todo
```

이렇게 하면:

- `/todos/` 에서 Todo를 만들면
- 내부에서 **Notification 서비스가 자동 호출**되고
- 별도의 `notifications` 도메인에 알림이 쌓입니다.

(= 모놀리식 안의 “서비스 간 호출” 흐름 예시)

---

### 5️⃣ Notification 라우터(API) 추가

📁 `app/api/routes/notifications.py`
```python
from typing import List

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.schemas.notifications import NotificationRead
from app.schemas.users import UserRead
from app.services.notification_service import (
    list_notifications_for_user,
    mark_notification_read_for_user,
)

router = APIRouter()

@router.get(
    "/",
    response_model=List[NotificationRead],
    summary="내 알림 목록 조회",
)
def list_my_notifications(
    current_user: UserRead = Depends(get_current_user),
) -> List[NotificationRead]:
    return list_notifications_for_user(current_user)

@router.post(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="알림 읽음 처리",
)
def mark_read(
    notification_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> NotificationRead:
    """
    - 내 알림만 읽음 처리 가능
    """
    return mark_notification_read_for_user(notification_id, current_user)
```

---

### 6️⃣ API Gateway 역할의 중앙 라우터 작성

> 이제 API Gateway 스타일로 모든 서브 라우터를 한 곳에서 묶습니다.
> 
> (실제 마이크로서비스라면 이 `api_router`가 외부 트래픽을 각 서비스로 라우팅하는 역할을 하게 됩니다.)

📁 `app/api/router.py`
```python
from fastapi import APIRouter

from app.api.routes import auth, health, notifications, todos

api_router = APIRouter()

# /api/health/*
api_router.include_router(health.router, prefix="/health", tags=["Health"])

# /api/auth/*
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# /api/todos/*
api_router.include_router(todos.router, prefix="/todos", tags=["Todos"])

# /api/notifications/*
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["Notifications"]
)
```

---

### 7️⃣ `main.py`를 “게이트웨이 진입점”으로 리팩토링

📁 `app/main.py` (이전 내용을 아래처럼 교체)
```python
from fastapi import FastAPI

from app.api.router import api_router  # 중앙 API 라우터

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo + 알림 관리용 FastAPI 백엔드",
    version="0.2.0",
)

@app.get("/", tags=["Root"])
def read_root():
    """
    API Gateway의 루트 엔드포인트.
    - 실제 비즈니스 API는 /api/... 아래로 제공
    """
    return {"message": "Welcome to TaskBoard API (via /api/*)"}

# ✅ 여기가 'API Gateway' 역할
# 외부에서는 /api/... 만 보고 접속하면 되고,
# 내부적으로는 auth, todos, notifications 등이 나누어져 있음.
app.include_router(api_router, prefix="/api")
```

이제 경로 구조는 이렇게 됩니다.

- `/` → 간단한 환영 메시지
- `/api/health/` → 헬스 체크
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- `/api/todos/` (CRUD + 필터/정렬/페이지네이션, 사용자별)
- `/api/notifications/` (내 알림 목록)
- `/api/notifications/{id}/read` (읽음 처리)

> 기존 1~4에서 쓰던 /todos/, /health/를 계속 쓰고 싶으면
> 
> `main.py`에서 예전처럼 `include_router(health.router, prefix="/health")`를 추가해도 되지만,
> 
> **API Gateway 개념을 강조**하려면 `/api/*` 구조만 유지하는 게 더 깔끔합니다.

---

### 8️⃣ 동작 체크 시나리오 (요약)

1. 서버 실행

```bash
uvicorn app.main:app --reload
```

1. 회원가입
    `POST /api/auth/signup`
    
2. 로그인 → 토큰 발급
    `POST /api/auth/login`
    
3. Swagger `/docs` → Authorize → `Bearer <token>` 입력
    
4. Todo 생성
    `POST /api/todos/`
    → 내부에서 `create_notification_for_user` 호출, 알림 생성
    
1. 내 알림 확인
    `GET /api/notifications/`
    → 방금 생성한 “새 Todo가 생성되었습니다” 알림이 보이는지 확인
    
2. 알림 읽음 처리
    `POST /api/notifications/{id}/read`
    

---

## 정리

- **API Gateway 관점**
    - `main.py`는 더 이상 세부 도메인 로직을 모릅니다.
    - `app.include_router(api_router, prefix="/api")` 한 줄로
        **auth/todos/notifications/health** 전체를 `/api/*`로 노출합니다.
        
- **서비스 간 호출 흐름**
    
    - 클라이언트: `/api/todos/` 호출
    - → `routes/todos.py` (엔드포인트/입출력 정의)
    - → `services/todo_service.py` (Todo 비즈니스 로직)
    - → `models/todos.py` + **`services/notification_service.py`** 호출
    - → `models/notifications.py` 에 알림 저장