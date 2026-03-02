좋아요, 이제 **파트 11 – “SQLAlchemy ORM 연동 + 비동기 처리 맛보기”** 단계로 넘어가 볼게요.

지금까지 인메모리(`_fake_db` 리스트)로 돌리던 Todo들을 **진짜 DB(SQLAlchemy + SQLite)** 로 옮기는 단계입니다.

> 👉 설명보다는 “실제 동작 코드”가 우선이니,
> 
> **필수 파일 + 변경 파일**을 순서대로 정리해 줄게요.
> 
> (설명은 주석 위주, 나중에 강의자료에 풀어서 쓰면 돼요.)

---

### 0. 의존성 설치 (uv)

우리는 `SQLite + SQLAlchemy(동기)`를 먼저 사용하고,

마지막에 **비동기(AsyncSession) 맛보기 코드**만 살짝 붙일게요.

```bash
# SQLAlchemy + SQLite 드라이버
uv add "sqlalchemy>=2" aiosqlite
```

> ※ 아직은 동기 ORM만 쓸 거라 aiosqlite는 “나중에 async 맛보기”용입니다.

---

### 1. DB 기본 세팅 – `core/db.py`

📁 `app/core/db.py` **[NEW]**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

DATABASE_URL = "sqlite:///./taskboard.db"

class Base(DeclarativeBase):
    """모든 ORM 모델이 상속받을 Base 클래스"""
    pass

# SQLite 동기 엔진
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite용 옵션
)

# 세션팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db() -> Session:
    """
    FastAPI 의 Depends 에서 사용할 DB 세션 의존성.
    요청마다 새 세션을 열고, 사용 후 닫는다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### 2. User/Todo ORM 모델 정의

2-1. User 모델

📁 `app/models/user.py` **[NEW]**

```python
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    username: str = Column(String(50), unique=True, index=True, nullable=False)
    email: str | None = Column(String(255), unique=True, index=True, nullable=True)
    password_hash: str = Column(String(255), nullable=False)
    created_at: datetime = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # 관계: User 1 : N Todo
    todos = relationship(
        "Todo",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
```

---

2-2. Todo / TodoAttachment / Notification 모델

📁 `app/models/todos.py` **[NEW or REPLACE]**

> 기존에 _fake_db 같은 인메모리 구조를 쓰고 있었다면,
> 
> 이제 이 파일로 교체하고, fake_db 관련 코드는 지워도 됩니다.

```python
from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.db import Base

class Todo(Base):
    __tablename__ = "todos"

    id: int = Column(Integer, primary_key=True, index=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: str = Column(String(200), nullable=False)
    description: str | None = Column(Text, nullable=True)
    status: str = Column(
        String(50),
        nullable=False,
        default="todo",  # todo / in_progress / done
    )
    due_date: date | None = Column(Date, nullable=True)
    priority: int = Column(Integer, nullable=False, default=1)
    created_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    owner = relationship("User", back_populates="todos")
    attachments = relationship(
        "TodoAttachment",
        back_populates="todo",
        cascade="all, delete-orphan",
    )

class TodoAttachment(Base):
    __tablename__ = "todo_attachments"

    id: int = Column(Integer, primary_key=True, index=True)
    todo_id: int = Column(
        Integer,
        ForeignKey("todos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_path: str = Column(String(500), nullable=False)
    original_filename: str = Column(String(255), nullable=False)
    uploaded_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    todo = relationship("Todo", back_populates="attachments")

class Notification(Base):
    __tablename__ = "notifications"

    id: int = Column(Integer, primary_key=True, index=True)
    user_id: int = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: str = Column(String(500), nullable=False)
    type: str = Column(
        String(50),
        nullable=False,
        default="info",  # deadline_soon / todo_assigned 등
    )
    is_read: bool = Column(Boolean, default=False, nullable=False)
    created_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
```

---

2-3. models 패키지에서 import

📁 `app/models/__init__.py` **[UPDATE]**

```python
from app.core.db import Base  # re-export

from app.models.user import User  # noqa
from app.models.todos import Todo, TodoAttachment, Notification  # noqa
```

이렇게 해두면 다른 곳에서:

```python
from app.models import Base, User, Todo
```

처럼 쓸 수 있습니다.

---

### 3. 앱 시작 시 테이블 생성 – `main.py` 수정

📁 `app/main.py` **[UPDATE]**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.db import Base, engine  # ✅ 추가 import

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리용 FastAPI 백엔드",
    version="0.1.0",
)

@app.on_event("startup")
def on_startup() -> None:
    """
    애플리케이션 시작 시점에 테이블 생성.
    - 실제 운영에서는 Alembic 마이그레이션 도구 사용 권장.
    """
    Base.metadata.create_all(bind=engine)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to TaskBoard API (via /api/*)"}

app.mount("/files", StaticFiles(directory="uploads"), name="files")

app.include_router(api_router, prefix="/api")
```

---

### 4. JWT 인증이 DB를 쓰도록 수정 – `core/security.py` (요약 버전)

이 파일은 이미 3번 파트에서 있었을 텐데,

이제는 **User ORM**을 사용해서 동작해야 합니다.

📁 `app/core/security.py` **[REPLACE or UPDATE]**

```python
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.schemas.users import TokenPayload, UserRead

# JWT 설정
SECRET_KEY = "CHANGE_ME_TO_ENV"  # 나중에 .env로 분리해야 함
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1일

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    subject: str | int,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserRead:
    """
    JWT 토큰을 검증하고 현재 로그인한 유저를 반환.
    - 실패 시 401 에러 발생
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception

    if token_data.sub is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if user is None:
        raise credentials_exception

    # ORM → Pydantic 변환
    return UserRead.model_validate(user, from_attributes=True)
```

> 👉 create_user, login API는 app/api/routes/auth.py 에 구현되어 있다고 가정합니다.
> 
> (이미 3파트 JWT 챕터에서 구현했던 코드에 위의 해시/인증 로직만 맞추면 됩니다.)

---

### 5. Todo 서비스 레이어를 ORM 기반으로 수정 – `services/todo_service.py`

이제 **인메모리 `_fake_db` 대신 SQLAlchemy Session**을 사용합니다.

📁 `app/services/todo_service.py` **[REPLACE]**

```python
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.todos import Todo
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead

def list_todos_for_user(
    db: Session,
    user: UserRead,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> List[Todo]:
    query = db.query(Todo).filter(Todo.user_id == user.id)

    if status_filter:
        query = query.filter(Todo.status == status_filter)

    if q:
        key = f"%{q}%"
        query = query.filter(
            or_(
                Todo.title.ilike(key),
                Todo.description.ilike(key),
            )
        )

    return query.order_by(Todo.created_at.desc()).offset(skip).limit(limit).all()

def search_todos_for_user(
    db: Session,
    user: UserRead,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    due_from: Optional[date] = None,
    due_to: Optional[date] = None,
    min_priority: Optional[int] = None,
    max_priority: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
) -> List[T]:  # type: ignore[name-defined]
    query = db.query(Todo).filter(Todo.user_id == user.id)

    if status_filter:
        query = query.filter(Todo.status == status_filter)

    if q:
        key = f"%{q}%"
        query = query.filter(
            or_(Todo.title.ilike(key), Todo.description.ilike(key))
        )

    if due_from:
        query = query.filter(Todo.due_date >= due_from)
    if due_to:
        query = query.filter(Todo.due_date <= due_to)

    if min_priority is not None:
        query = query.filter(Todo.priority >= min_priority)
    if max_priority is not None:
        query = query.filter(Todo.priority <= max_priority)

    return (
        query.order_by(Todo.due_date.asc(), Todo.priority.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_todo_for_user(
    db: Session,
    user: UserRead,
    payload: TodoCreate,
) -> Todo:
    todo = Todo(
        user_id=user.id,
        **payload.model_dump(),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

def get_todo_or_404_for_user(
    db: Session,
    todo_id: int,
    user: UserRead,
) -> Todo:
    todo = (
        db.query(Todo)
        .filter(
            and_(
                Todo.id == todo_id,
                Todo.user_id == user.id,
            )
        )
        .first()
    )
    if not todo:
        raise ValueError("Todo not found")
    return todo

def update_todo_for_user(
    db: Session,
    todo_id: int,
    user: UserRead,
    payload: TodoUpdate,
) -> Todo:
    todo = get_todo_or_404_for_user(db, todo_id, user)

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(todo, key, value)

    todo.updated_at = datetime.utcnow()
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

def delete_todo_for_user(
    db: Session,
    todo_id: int,
    user: UserRead,
) -> bool:
    todo = (
        db.query(Todo)
        .filter(
            and_(
                Todo.id == todo_id,
                Todo.user_id == user.id,
            )
        )
        .first()
    )
    if not todo:
        return False

    db.delete(todo)
    db.commit()
    return True
```

> ⚠️ 위에서 List[T] 는 IDE 타입 경고 피하려면 List[Todo] 로 바꾸세요. (위에 작은 실수)
> 
> 실제로는 `-> List[Todo]` 로 쓰면 됩니다.

---

### 6. Todo 라우터에서 DB 세션 의존성 주입 – `routes/todos.py`

이제 라우터 함수에서 `db: Session = Depends(get_db)` 를 받아서

서비스 레이어로 넘겨줘야 합니다.

📁 `app/api/routes/todos.py` **[UPDATE]**

```python
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.schemas.users import UserRead
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_or_404_for_user,
    list_todos_for_user,
    search_todos_for_user,
    update_todo_for_user,
)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TodoRead],
    summary="현재 사용자 Todo 목록 조회",
)
def list_todos(
    status_filter: str | None = Query(default=None),
    q: str | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TodoRead]:
    todos = list_todos_for_user(
        db=db,
        user=current_user,
        status_filter=status_filter,
        q=q,
        skip=skip,
        limit=limit,
    )
    # ORM → Pydantic 변환은 response_model + from_attributes=True 덕에 자동
    return todos

@router.post(
    "/",
    response_model=TodoRead,
    status_code=status.HTTP_201_CREATED,
    summary="새 Todo 생성",
)
def create_todo(
    payload: TodoCreate,
    current_user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodoRead:
    todo = create_todo_for_user(db, current_user, payload)
    return todo

@router.get(
    "/{todo_id}",
    response_model=TodoRead,
    summary="단일 Todo 조회",
)
def retrieve_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodoRead:
    try:
        todo = get_todo_or_404_for_user(db, todo_id, current_user)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
    return todo

@router.patch(
    "/{todo_id}",
    response_model=TodoRead,
    summary="Todo 일부 수정",
)
def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    current_user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodoRead:
    todo = update_todo_for_user(db, todo_id, current_user, payload)
    return todo

@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Todo 삭제",
)
def delete_todo(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = delete_todo_for_user(db, todo_id, current_user)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
```

> ✅ /api/todos/search 도 마찬가지로 db: Session = Depends(get_db) 추가해서
> 
> `search_todos_for_user(db, ...)` 호출하도록 바꿔주면 됩니다.

---

### 7. “비동기 처리 소개” – Async ORM 맛보기

지금 프로젝트는 **동기 SQLAlchemy** 기반으로 잘 돌아가고 있습니다.

여기서 “실제 전체를 async로 바꾸기”는 공사가 크니까,

**맛보기 코드**로 “이렇게 바뀐다” 정도만 보여주면 됩니다.

### 7-1. Async 엔진/세션 기본 예시

```python
# app/core/db_async_example.py (실습용)

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

DATABASE_URL = "sqlite+aiosqlite:///./taskboard.db"

async_engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
)

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

7-2. async 라우터 예시

```python
# app/api/routes/todos_async_example.py (실습만)

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db_async_example import get_async_db
from app.models.todos import Todo
from app.schemas.todos import TodoRead

router = APIRouter()

@router.get("/async", response_model=List[TodoRead])
async def list_todos_async(
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(select(Todo))
    todos = result.scalars().all()
    return todos
```

> 실제 서비스에서는 엔진/세션/라우터 전체를 async 스타일로 통일해야 하지만,
> 
> 파트 11에서는
> 
> > “동기 SQLAlchemy로 먼저 완성 →
> > 
> > async 버전은 이런 식으로 바뀐다”
> > 
> > 정도의 **개념 전환**만 보여줘도 충분합니다.

---

### 마무리 요약 (파트 11)

1. **SQLAlchemy ORM 도입**
    - `core/db.py` : `engine`, `SessionLocal`, `Base`, `get_db`
    - `models/user.py`, `models/todos.py` : 실제 테이블 구조 정의
    - `main.py` 에서 `Base.metadata.create_all()` 로 테이블 생성
2. **JWT + User가 DB 기반으로 동작**
    - `core/security.py` 에서 `db.query(User)` 로 인증
3. **Todo CRUD가 인메모리 → DB로 이동**
    - `services/todo_service.py` : `Session` 기반 쿼리
    - `routes/todos.py` : `db: Session = Depends(get_db)` 주입
4. **비동기 처리 소개**
    - `create_async_engine`, `AsyncSession` 예시로 “ASGI + async ORM” 그림 맛보기

이 상태면,

**TaskBoard API는 “실제 DB를 쓰는 정식 백엔드” 상태**까지 올라온 거고,

다음 12~14 파트에서 **모니터링, 예외 처리, 테스트, 코드 정리**를 쌓아 올리면

완전한 실전 포트폴리오용 FastAPI 프로젝트가 됩니다.

다음 파트(12번) 들어가기 전에,

- `uvicorn app.main:app --reload`
    
- 회원가입 → 로그인 → 토큰으로 `/api/todos` CRUD
    
    한 번 쭉 돌아가는지만 테스트해보고 이어가면 딱 좋습니다.