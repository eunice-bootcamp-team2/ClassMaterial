좋아요, 이제 **파트 9 – “FastAPI 설치, 라우팅·Pydantic 스키마 정의”**를
**지금까지 만든 TaskBoard API 구조에 맞게** “정리 + 코드 스냅샷” 형태로 적어볼게요.
이미 1~8파트에서 대부분 구현했지만,
파트 9에서는 **설치 → 라우팅 → Pydantic 스키마**를 한 번에 볼 수 있도록
“처음부터 따라 만들 수 있는 코드 순서”로 정리해 주는 느낌으로 가겠습니다.

> ⚠️ 주의: 아래 코드는 TaskBoard API 전체 구조에서
> “설치 + 라우터 + 스키마” 부분만 모아 정리한 스냅샷입니다.
> 이미 만든 코드가 있다면 **덮어쓰기 or 비교**하면서 사용하면 됩니다.

---

## 0. FastAPI 설치 (uv 기준)

```bash
# 0-1. 작업 폴더
mkdir taskboard-api
cd taskboard-api

# 0-2. uv 가상환경 생성
uv venv .venv

# 0-3. 가상환경 활성화
# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
# .\\.venv\\Scripts\\Activate.ps1

# 0-4. FastAPI + Uvicorn 설치
uv add "fastapi[standard]" uvicorn
```

---

## 1. 기본 폴더 구조

```bash
mkdir -p app/api/routes
mkdir -p app/schemas
mkdir -p app/models
mkdir -p app/core
mkdir -p app/services

touch app/__init__.py
touch app/api/__init__.py
touch app/api/routes/__init__.py
touch app/schemas/__init__.py
touch app/models/__init__.py
touch app/core/__init__.py
touch app/services/__init__.py
touch app/main.py
```

구조:

```
taskboard-api/
├── .venv/
└── app/
    ├── __init__.py
    ├── main.py
    ├── api/
    │   ├── __init__.py
    │   ├── router.py
    │   └── routes/
    │       ├── __init__.py
    │       ├── health.py
    │       └── todos.py
    ├── core/
    │   ├── __init__.py
    │   └── security.py      # JWT/인증 (3파트에서 이미 구현)
    ├── models/
    │   ├── __init__.py
    │   └── todos.py         # 인메모리 or DB 모델 (2,3파트 코드)
    ├── schemas/
    │   ├── __init__.py
    │   ├── todos.py
    │   └── users.py
    └── services/
        ├── __init__.py
        └── todo_service.py
```

> 여기서는 라우팅 + 스키마에 집중하므로
> 모델/서비스 파일은 크게 건드리지 않고 “연결되는 형태만” 보여줄게요.

---

## 2. FastAPI 앱 생성 + 라우터 연결 (`main.py`)

📁 `app/main.py`
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리용 FastAPI 백엔드",
    version="0.1.0",
)

@app.get("/", tags=["Root"])
def read_root():
    """
    루트 엔드포인트.
    실제 비즈니스 API는 모두 /api/... 아래에 있습니다.
    """
    return {"message": "Welcome to TaskBoard API (via /api/*)"}

# (선택) 업로드 파일 서빙용 static mount
app.mount("/files", StaticFiles(directory="uploads"), name="files")

# ✅ API Gateway 역할: /api 아래로 모든 서브 라우터 붙이기
app.include_router(api_router, prefix="/api")
```

서버 실행:
```bash
uvicorn app.main:app --reload
```

---

## 3. 중앙 라우터 – API Gateway (`api/router.py`)

📁 `app/api/router.py`
```python
from fastapi import APIRouter

from app.api.routes import health, todos  # 필요한 라우터들 import

api_router = APIRouter()

# /api/health/...
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

# /api/todos/...
api_router.include_router(
    todos.router,
    prefix="/todos",
    tags=["Todos"],
)
```

> 여기서 api_router는 Django의 “프로젝트 레벨 [urls.py](http://urls.py)” 느낌이고,
> 
> 각 앱별 라우터(health, todos)를 `/api/...` 하위로 묶는 역할을 합니다.

---

## 4. Health 라우터 – `/api/health` (`routes/health.py`)

📁 `app/api/routes/health.py`
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/", summary="헬스 체크")
def health_check():
    """
    서비스 헬스 체크용 엔드포인트.
    - 서버가 정상 응답 가능한지 확인할 때 사용.
    - Docker / K8s / 로드밸런서 헬스체크에서 자주 호출.
    """
    return {"status": "ok"}
```

최종 URL: `GET /api/health/`

---

## 5. Todo 라우터–`/api/todos` 기본 CRUD (`routes/todos.py`)

> 여기서는 **“라우팅과 Pydantic 스키마 정의”**가 포인트이므로
> 인메모리 DB + 간단 서비스 호출 구조로 작성합니다.

📁 `app/api/routes/todos.py`
```python
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.todos import (
    TodoCreate,
    TodoRead,
    TodoUpdate,
)
from app.schemas.users import UserRead
from app.core.security import get_current_user
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_or_404_for_user,
    list_todos_for_user,
    update_todo_for_user,
)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TodoRead],
    summary="현재 사용자 Todo 목록 조회",
)
def list_todos(
    status_filter: str | None = Query(
        default=None,
        description="todo / in_progress / done 중 하나로 필터",
    ),
    q: str | None = Query(
        default=None,
        description="제목/설명 검색 키워드",
    ),
    skip: int = Query(0, ge=0, description="페이지 시작 offset"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user: UserRead = Depends(get_current_user),
) -> list[TodoRead]:
    """
    로그인한 사용자의 Todo 목록을 조회합니다.
    - 상태 필터링
    - 검색(q)
    - 페이지네이션(skip, limit)
    """
    return list_todos_for_user(
        user=current_user,
        status_filter=status_filter,
        q=q,
        skip=skip,
        limit=limit,
    )

@router.post(
    "/",
    response_model=TodoRead,
    status_code=status.HTTP_201_CREATED,
    summary="새 Todo 생성",
)
def create_todo(
    payload: TodoCreate,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    """
    로그인한 사용자의 Todo를 새로 생성합니다.
    """
    return create_todo_for_user(current_user, payload)

@router.get(
    "/{todo_id}",
    response_model=TodoRead,
    summary="단일 Todo 조회",
)
def retrieve_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    """
    특정 Todo를 조회합니다 (본인 소유만).
    """
    return get_todo_or_404_for_user(todo_id, current_user)

@router.patch(
    "/{todo_id}",
    response_model=TodoRead,
    summary="Todo 일부 수정",
)
def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    """
    특정 Todo를 부분 수정합니다.
    """
    return update_todo_for_user(todo_id, current_user, payload)

@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Todo 삭제",
)
def delete_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> None:
    """
    특정 Todo를 삭제합니다.
    """
    deleted = delete_todo_for_user(todo_id, current_user)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
```

> 여기에서 핵심은:
> 
> - `@router.get("/", ...)` 등으로 **HTTP 메서드 + 경로별로 함수 정의**
> - `response_model=TodoRead` → Pydantic 스키마 기반 자동 응답 검증/문서화
> - `Depends(get_current_user)` → JWT 인증과 연결 (3파트에서 구현한 것 사용)

---

## 6. Todo Pydantic 스키마 정의 (`schemas/todos.py`)

> DRF의 Serializer를 FastAPI/Pydantic 스타일로 풀어 쓴 것입니다.
> 요청/응답을 나누고, 공통 필드를 Base로 묶었습니다.

📁 `app/schemas/todos.py`
```python
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field

class TodoBase(BaseModel):
    """입출력 공통 필드"""

    title: str = Field(
        ...,
        description="Todo 제목",
        example="FastAPI 9장 스키마 정의",
    )
    description: Optional[str] = Field(
        default=None,
        description="상세 설명 (선택)",
        example="FastAPI 설치, 라우팅, Pydantic 스키마 정의 정리",
    )
    status: str = Field(
        default="todo",
        description="todo / in_progress / done",
        example="todo",
    )
    due_date: Optional[date] = Field(
        default=None,
        description="마감일(선택)",
        example="2025-12-31",
    )
    priority: int = Field(
        default=1,
        ge=1,
        le=5,
        description="1(낮음) ~ 5(높음) 우선순위",
        example=3,
    )

class TodoCreate(TodoBase):
    """Todo 생성 시 요청 바디"""

    # 생성 시에는 Base와 동일 (추가 필드 없음)
    pass

class TodoUpdate(BaseModel):
    """Todo 부분 수정용 스키마 (모든 필드 선택)"""

    title: Optional[str] = Field(
        default=None,
        description="변경할 제목",
        example="제목 수정",
    )
    description: Optional[str] = Field(
        default=None,
        description="변경할 설명",
    )
    status: Optional[str] = Field(
        default=None,
        description="todo / in_progress / done",
    )
    due_date: Optional[date] = Field(
        default=None,
        description="변경할 마감일",
    )
    priority: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="우선순위",
    )

class TodoRead(TodoBase):
    """클라이언트 응답용 스키마"""

    id: int = Field(..., description="Todo 고유 ID", example=1)
    user_id: int = Field(..., description="소유 사용자 ID", example=42)
    created_at: datetime = Field(
        ...,
        description="생성 시각",
        example="2025-12-11T12:34:56",
    )
    updated_at: datetime = Field(
        ...,
        description="수정 시각",
        example="2025-12-11T12:40:00",
    )

    class Config:
        from_attributes = True  # 나중에 ORM 객체에서도 사용 가능
```

---

## 7. User Pydantic 스키마 정의 (`schemas/users.py`)

JWT 인증/사용자별 Todo를 위해 필요한 최소 스키마입니다.
(3파트에서 이미 썼던 구조를 정리용으로 다시 작성)

📁 `app/schemas/users.py`
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str = Field(
        ...,
        description="사용자 이름(로그인 ID 겸용)",
        example="eunice",
    )
    email: Optional[EmailStr] = Field(
        default=None,
        description="이메일 (선택)",
        example="eunice@example.com",
    )

class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        description="로그인 비밀번호",
        example="secret123",
    )

class UserRead(UserBase):
    id: int = Field(..., description="사용자 ID", example=1)
    created_at: datetime = Field(
        ...,
        description="가입 시각",
        example="2025-12-11T12:00:00",
    )

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: str | int
    exp: int | None = None
```

> 여기까지가 “FastAPI 설치 + 라우팅 + Pydantic 스키마 정의”의 핵심 뼈대입니다.
> 나머지 **JWT 로직(`core/security.py`)**, **서비스 레이어(`todo_service.py`)**,
> **인메모리/DB 모델**은 2~8파트에서 구현한 그 코드 그대로 사용하면 됩니다.

---

## 8. 요약 (파트 9 관점)

- **설치**
    - `uv venv`, `uv add "fastapi[standard]" uvicorn`
- **라우팅 구조**
    - `main.py` → FastAPI 앱 생성 + `/api` Gateway
    - `api/router.py` → health, todos 라우터를 `/api/...` 아래로 묶기
    - `routes/health.py`, `routes/todos.py` → 실제 엔드포인트 정의
- **Pydantic 스키마**
    - `schemas/todos.py` → `TodoBase`, `TodoCreate`, `TodoUpdate`, `TodoRead`
    - `schemas/users.py` → `UserCreate`, `UserRead`, `Token` 등
    - DRF의 `Serializer`를 **요청/응답 스키마로 분리한 형태**

이걸 기준으로 학생들에게는:

1. **설치 커맨드 →**
2. **main.py에 FastAPI 인스턴스 생성 →**
3. **[router.py](http://router.py) + health/todos 라우터 추가 →**
4. **Pydantic 스키마(Todo, User) 정의 →**
5. `/docs`에서 자동 문서 확인

이 흐름 그대로 실습하게 하면,
“FastAPI 설치 → 라우팅 → 스키마 정의”가 머릿속에 잘 정리될 거예요.