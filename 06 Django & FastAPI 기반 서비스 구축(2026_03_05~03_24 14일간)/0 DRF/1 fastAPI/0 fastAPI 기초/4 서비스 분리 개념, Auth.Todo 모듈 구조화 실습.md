### 1️⃣ 서비스 레이어 폴더 생성

```bash
mkdir -p app/services
touch app/services/__init__.py
```

---

### 2️⃣ `app/services/auth_service.py` – Auth 서비스 레이어

```python
# app/services/auth_service.py
from datetime import timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.users import create_user, get_user_by_username
from app.schemas.users import Token, UserCreate, UserRead

def register_user(user_in: UserCreate) -> UserRead:
    """회원가입 비즈니스 로직"""
    if get_user_by_username(user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_pw = get_password_hash(user_in.password)
    user_db = create_user(user_in, hashed_pw)

    return UserRead(
        id=user_db.id,
        username=user_db.username,
        email=user_db.email,
        created_at=user_db.created_at,
    )

def login_user(username: str, password: str) -> Token:
    """로그인 + JWT 발급 비즈니스 로직"""
    user = get_user_by_username(username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")
```

---

### 3️⃣ `app/models/todos.py` – Todo 인메모리 “모델 계층”

```python
# app/models/todos.py
from datetime import datetime
from typing import List, Optional

from app.schemas.todos import TodoCreate, TodoRead

_fake_todos_db: List[TodoRead] = []
_auto_todo_id = 1

def get_all_todos() -> List[TodoRead]:
    return list(_fake_todos_db)

def create_todo_record(user_id: int, payload: TodoCreate) -> TodoRead:
    """새 Todo 레코드 생성"""
    global _auto_todo_id

    todo = TodoRead(
        id=_auto_todo_id,
        user_id=user_id,
        created_at=datetime.utcnow(),
        **payload.model_dump(),
    )
    _auto_todo_id += 1
    _fake_todos_db.append(todo)
    return todo

def get_todo_by_id(todo_id: int) -> Optional[TodoRead]:
    for todo in _fake_todos_db:
        if todo.id == todo_id:
            return todo
    return None

def update_todo_record(todo_id: int, update_data: dict) -> Optional[TodoRead]:
    """id 기준으로 Todo 내용 업데이트"""
    for idx, todo in enumerate(_fake_todos_db):
        if todo.id == todo_id:
            data = todo.model_dump()
            data.update(update_data)
            updated = TodoRead(**data)
            _fake_todos_db[idx] = updated
            return updated
    return None

def delete_todo_record(todo_id: int) -> bool:
    """id 기준으로 삭제, 성공 여부 반환"""
    for idx, todo in enumerate(_fake_todos_db):
        if todo.id == todo_id:
            _fake_todos_db.pop(idx)
            return True
    return False
```

---

### 4️⃣ `app/services/todo_service.py` – Todo 서비스 레이어

```python
# app/services/todo_service.py
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

def list_todos_for_user(
    user: UserRead,
    q: Optional[str],
    status_filter: Optional[str],
    priority: Optional[int],
    due_from: Optional[date],
    due_to: Optional[date],
    order_by: str,
    order_dir: str,
    limit: int,
    offset: int,
) -> List[TodoRead]:
    """현재 사용자 기준 Todo 목록 조회 + 필터/정렬/페이지네이션"""

    # 0) 내 Todo만
    items = [t for t in get_all_todos() if t.user_id == user.id]

    # 1) 검색어 필터
    if q:
        q_lower = q.lower()
        items = [
            t
            for t in items
            if q_lower in (t.title or "").lower()
            or q_lower in (t.description or "").lower()
        ]

    # 2) 상태 필터
    if status_filter:
        items = [t for t in items if t.status == status_filter]

    # 3) 우선순위 필터
    if priority is not None:
        items = [t for t in items if t.priority == priority]

    # 4) 마감일 범위 필터
    if due_from:
        items = [t for t in items if t.due_date and t.due_date >= due_from]
    if due_to:
        items = [t for t in items if t.due_date and t.due_date <= due_to]

    # 5) 정렬
    def _sort_key(todo: TodoRead):
        if order_by == "due_date":
            return todo.due_date or date.max
        if order_by == "priority":
            return todo.priority
        if order_by == "title":
            return (todo.title or "").lower()
        # 기본: created_at
        return todo.created_at

    reverse = order_dir.lower() == "desc"
    items.sort(key=_sort_key, reverse=reverse)

    # 6) 페이지네이션
    start = offset
    end = offset + limit
    return items[start:end]

def create_todo_for_user(user: UserRead, payload: TodoCreate) -> TodoRead:
    """현재 사용자(owner) 기준 Todo 생성"""
    return create_todo_record(user_id=user.id, payload=payload)

def _ensure_owned_todo(todo_id: int, user: UserRead) -> TodoRead:
    todo = get_todo_by_id(todo_id)
    if not todo or todo.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
    return todo

def get_todo_for_user(todo_id: int, user: UserRead) -> TodoRead:
    """내 Todo 1개 조회"""
    return _ensure_owned_todo(todo_id, user)

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
        # 이론상 여기 올 일은 거의 없지만 방어 코드
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
    return updated

def delete_todo_for_user(todo_id: int, user: UserRead) -> None:
    """내 Todo 삭제"""
    _ensure_owned_todo(todo_id, user)
    ok = delete_todo_record(todo_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
```

---

### 5️⃣ `app/api/routes/auth.py` – 라우터를 서비스 사용하도록 수정

```python
# app/api/routes/auth.py
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import get_current_user
from app.schemas.users import Token, UserCreate, UserRead
from app.services.auth_service import login_user, register_user

router = APIRouter()

@router.post(
    "/signup",
    response_model=UserRead,
    summary="회원가입",
)
def signup(user_in: UserCreate) -> UserRead:
    return register_user(user_in)

@router.post(
    "/login",
    response_model=Token,
    summary="로그인(JWT 발급)",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """
    - 요청 형식: x-www-form-urlencoded
      - username
      - password
    """
    return login_user(form_data.username, form_data.password)

@router.get(
    "/me",
    response_model=UserRead,
    summary="내 프로필 조회",
)
async def read_me(current_user: UserRead = Depends(get_current_user)) -> UserRead:
    return current_user
```

---

### 6️⃣ `app/api/routes/todos.py` – 라우터에서 서비스 호출만 남기기

```python
# app/api/routes/todos.py
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.security import get_current_user
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_for_user,
    list_todos_for_user,
    update_todo_for_user,
)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TodoRead],
    summary="Todo 목록 조회 (사용자별 + 필터/정렬/페이지네이션)",
)
def list_todos(
    q: Optional[str] = Query(
        default=None,
        description="검색어 (title / description 에 포함되는지 검색)",
        example="FastAPI",
    ),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="상태로 필터링 (todo / in_progress / done)",
        example="todo",
    ),
    priority: Optional[int] = Query(
        default=None,
        ge=1,
        le=5,
        description="우선순위로 필터링 (1~5)",
        example=3,
    ),
    due_from: Optional[date] = Query(
        default=None,
        description="마감일 시작(이 날짜 이후)",
        example="2025-01-01",
    ),
    due_to: Optional[date] = Query(
        default=None,
        description="마감일 끝(이 날짜 이전)",
        example="2025-12-31",
    ),
    order_by: str = Query(
        default="created_at",
        description="정렬 기준 (created_at / due_date / priority / title)",
        example="created_at",
    ),
    order_dir: str = Query(
        default="desc",
        description="정렬 방향 (asc / desc)",
        example="desc",
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="한 번에 가져올 최대 개수",
        example=10,
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="건너뛸 데이터 개수 (페이지네이션용)",
        example=0,
    ),
    current_user: UserRead = Depends(get_current_user),
) -> List[TodoRead]:
    return list_todos_for_user(
        user=current_user,
        q=q,
        status_filter=status_filter,
        priority=priority,
        due_from=due_from,
        due_to=due_to,
        order_by=order_by,
        order_dir=order_dir,
        limit=limit,
        offset=offset,
    )

@router.post(
    "/",
    response_model=TodoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Todo 생성 (현재 사용자 기준)",
)
def create_todo(
    payload: TodoCreate,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    return create_todo_for_user(current_user, payload)

@router.get(
    "/{todo_id}",
    response_model=TodoRead,
    summary="단일 Todo 조회 (내 Todo만 가능)",
)
def retrieve_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    return get_todo_for_user(todo_id, current_user)

@router.put(
    "/{todo_id}",
    response_model=TodoRead,
    summary="Todo 수정 (내 Todo만 가능, 부분 업데이트 허용)",
)
def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    return update_todo_for_user(todo_id, payload, current_user)

@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Todo 삭제 (내 Todo만 가능)",
)
def delete_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> None:
    delete_todo_for_user(todo_id, current_user)
    return
```

---

### 7️⃣ 실행 확인

기존과 동일하게:

```bash
uvicorn app.main:app --reload
```

- `/auth/signup`, `/auth/login`, `/auth/me`
- `/todos/`, `/todos/{id}` (생성/조회/수정/삭제)
- `/docs` 에서 Authorize 후 테스트

모두 이전과 같은 동작을 하되,

**라우터는 “입출력 정의 + 서비스 호출”만 담당**하고

실제 로직은 `services/*`와 `models/*`로 분리된 구조가 됩니다.