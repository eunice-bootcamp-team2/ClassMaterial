### 0️⃣ JWT 관련 패키지 설치 (한 번만)

프로젝트 루트에서:

```bash
uv add "python-jose[cryptography]" passlib[bcrypt]
```

---

### 1️⃣ `app/schemas/users.py` – 유저 & 토큰 스키마

```python
# app/schemas/users.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserInDB(UserBase):
    id: int
    created_at: datetime
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
```

---

### 2️⃣ `app/core/config.py` – JWT 설정값

```python
# app/core/config.py
from pydantic import BaseModel

class Settings(BaseModel):
    # 교육용 고정 값 (실서비스에서는 환경변수로 관리)
    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

settings = Settings()
```

---

### 3️⃣ `app/models/users.py` – 인메모리 유저 “테이블”

```python
# app/models/users.py
from datetime import datetime
from typing import Dict, Optional

from app.schemas.users import UserCreate, UserInDB

# username -> UserInDB
_fake_users_db: Dict[str, UserInDB] = {}
_auto_user_id = 1

def create_user(user_in: UserCreate, hashed_password: str) -> UserInDB:
    """유저 생성 (인메모리 저장)"""
    global _auto_user_id

    now = datetime.utcnow()
    user_db = UserInDB(
        id=_auto_user_id,
        username=user_in.username,
        email=user_in.email,
        created_at=now,
        hashed_password=hashed_password,
    )
    _auto_user_id += 1

    _fake_users_db[user_db.username] = user_db
    return user_db

def get_user_by_username(username: str) -> Optional[UserInDB]:
    return _fake_users_db.get(username)
```

---

### 4️⃣ `app/core/security.py` – 비밀번호 해시 + JWT + 현재 유저 의존성

```python
# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.users import get_user_by_username
from app.schemas.users import TokenData, UserRead

# 비밀번호 해시용 설정 (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Swagger에서 "Authorize" 버튼이 참고하는 토큰 발급 URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    """JWT 토큰에서 현재 로그인한 유저 정보를 꺼내는 의존성"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    user_in_db = get_user_by_username(token_data.username)
    if user_in_db is None:
        raise credentials_exception

    return UserRead(
        id=user_in_db.id,
        username=user_in_db.username,
        email=user_in_db.email,
        created_at=user_in_db.created_at,
    )
```

---

### 5️⃣ `app/api/routes/auth.py` – 회원가입 & 로그인 & 내 정보

```python
# app/api/routes/auth.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.users import create_user, get_user_by_username
from app.schemas.users import Token, UserCreate, UserRead

router = APIRouter()

@router.post(
    "/signup",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="회원가입",
)
def signup(user_in: UserCreate) -> UserRead:
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

@router.post(
    "/login",
    response_model=Token,
    summary="로그인(JWT 발급)",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """
    OAuth2PasswordRequestForm를 사용하므로
    - 요청 형식은 x-www-form-urlencoded:
      - username
      - password
    """
    user = get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")

@router.get(
    "/me",
    response_model=UserRead,
    summary="내 프로필 조회",
)
async def read_me(current_user: UserRead = Depends(get_current_user)) -> UserRead:
    return current_user
```

---

### 6️⃣ `app/schemas/todos.py` 수정 – `user_id` 추가

이제 Todo가 “어느 유저의 것인지” 알아야 하므로 `TodoRead`에 `user_id` 필드를 추가합니다.

```python
# app/schemas/todos.py
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field

class TodoBase(BaseModel):
    """공통 필드 정의 (입출력 공통)"""

    title: str = Field(..., example="FastAPI 강의 준비")
    description: Optional[str] = Field(
        default=None, example="14개 챕터 내용을 정리하고 자료 작성"
    )
    status: str = Field(
        default="todo",
        description="todo / in_progress / done 중 하나",
        example="todo",
    )
    due_date: Optional[date] = Field(
        default=None,
        description="마감일 (선택)",
        example="2025-12-31",
    )
    priority: int = Field(
        default=1,
        ge=1,
        le=5,
        description="1(낮음) ~ 5(높음)",
        example=3,
    )

class TodoCreate(TodoBase):
    """Todo 생성 시 사용할 스키마"""

    pass

class TodoUpdate(BaseModel):
    """Todo 수정 시 사용할 스키마 (부분 업데이트 허용)"""

    title: Optional[str] = Field(
        default=None,
        example="제목 수정 예시",
    )
    description: Optional[str] = Field(
        default=None,
        example="설명 수정 예시",
    )
    status: Optional[str] = Field(
        default=None,
        description="todo / in_progress / done 중 하나",
        example="in_progress",
    )
    due_date: Optional[date] = Field(
        default=None,
        description="마감일 변경",
        example="2025-12-25",
    )
    priority: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="1(낮음) ~ 5(높음)",
        example=4,
    )

class TodoRead(TodoBase):
    """클라이언트에 응답할 때 사용할 스키마"""

    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True  # 나중에 ORM 객체에서도 사용 가능
```

---

### 7️⃣ `app/api/routes/todos.py` 수정 – 사용자별 Todo + 권한 체크

기존 2번 파트에서 만들었던 `todos.py`를 **아래 코드로 통째로 교체**하면 됩니다.

변경 포인트:

- `Depends`, `get_current_user`, `UserRead` 사용
- `_fake_db` 에 저장되는 Todo에 `user_id` 포함
- 모든 조회/수정/삭제가 `current_user.id` 기준으로 동작

```python
# app/api/routes/todos.py
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead

router = APIRouter()

# 인메모리 Todo 저장소 (user_id 포함)
_fake_db: list[TodoRead] = []
_auto_increment_id = 1  # 간단한 id 증가용

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
) -> list[TodoRead]:
    """
    현재 로그인한 사용자에 속한 Todo만 조회 + 필터링/정렬/페이지네이션.
    """
    # 0) 내 Todo만 필터
    items = [t for t in _fake_db if t.user_id == current_user.id]

    # 1) 검색어 필터 (title / description)
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

    # 5) 정렬 기준 설정
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
    """
    현재 로그인한 사용자(owner)의 Todo 생성.
    """
    global _auto_increment_id

    todo = TodoRead(
        id=_auto_increment_id,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        **payload.model_dump(),
    )
    _auto_increment_id += 1
    _fake_db.append(todo)
    return todo

def _get_todo_owned_by_user(todo_id: int, user: UserRead) -> tuple[int, TodoRead]:
    """해당 user가 소유한 Todo인지 확인하고 반환 (없으면 404/403 대신 404 처리)"""
    for idx, todo in enumerate(_fake_db):
        if todo.id == todo_id and todo.user_id == user.id:
            return idx, todo
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Todo {todo_id} not found",
    )

@router.get(
    "/{todo_id}",
    response_model=TodoRead,
    summary="단일 Todo 조회 (내 Todo만 가능)",
)
def retrieve_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> TodoRead:
    """
    현재 로그인한 사용자의 Todo만 조회 가능.
    """
    _, todo = _get_todo_owned_by_user(todo_id, current_user)
    return todo

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
    """
    현재 로그인한 사용자의 Todo만 수정 가능.
    """
    idx, todo = _get_todo_owned_by_user(todo_id, current_user)

    data = todo.model_dump()
    update_data = payload.model_dump(exclude_unset=True)
    data.update(update_data)

    updated = TodoRead(**data)
    _fake_db[idx] = updated
    return updated

@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Todo 삭제 (내 Todo만 가능)",
)
def delete_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> None:
    """
    현재 로그인한 사용자의 Todo만 삭제 가능.
    """
    idx, _ = _get_todo_owned_by_user(todo_id, current_user)
    _fake_db.pop(idx)
    return
```

---

### 8️⃣ `app/main.py` – Auth 라우터 연결 추가

기존 `health`, `todos`만 있던 main에 `auth` 라우터를 추가합니다.

```python
# app/main.py
from fastapi import FastAPI

from app.api.routes import auth, health, todos

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리용 FastAPI 백엔드",
    version="0.1.0",
)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to TaskBoard API"}

# 라우터 등록
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(todos.router, prefix="/todos", tags=["Todos"])
```

---

### 9️⃣ 간단 동작 체크 시나리오

1. 서버 실행
    
    ```bash
    uvicorn app.main:app --reload
    ```
    
2. `POST /auth/signup` – JSON으로 회원가입
    
    ```json
    {
      "username": "eunice",
      "email": "eunice@example.com",
      "password": "test1234"
    }
    ```
    
3. `POST /auth/login` – `x-www-form-urlencoded`
    
    - username=eunice
        
    - password=test1234
        
        → `access_token` 발급 확인
        
4. Swagger `/docs` → 오른쪽 상단 **Authorize** 클릭
    
    - `Bearer <access_token>` 입력 후 인증
5. `POST /todos/` 로 Todo 생성
    
6. `GET /todos/` 로 **내 Todo만** 보이는지 확인
    
7. 다른 유저로 회원가입+로그인 후 같은 `/todos/` 조회 시
    
    → 서로의 Todo가 섞이지 않고 각자 것만 보이는지 확인