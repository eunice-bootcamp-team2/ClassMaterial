좋아요, 이제 **파트 13 – JWT 기반 보호 API 구현 + 문서 자동화(/docs) 실습** 들어갈게요.

이미 3번 파트에서 대략적인 JWT 구조를 잡아놨다고 가정하고, 여기서는:

1. **User 스키마([users.py](http://users.py)) 정리**
2. **JWT 토큰 발급용 Auth 라우터([auth.py](http://auth.py)) 완성**
3. **보호된 API(`/users/me`, `/todos`) 예시**
4. **Swagger에서 “Authorize → Bearer 토큰 입력 → 보호 API 호출”까지 되는 상태**

를 코드로 쫙 정리해 줄게요.

---

### 1. User 관련 Pydantic 스키마 정리

📁 `app/schemas/users.py`
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str = Field(..., example="eunice")
    email: Optional[EmailStr] = Field(None, example="eunice@example.com")

class UserCreate(UserBase):
    password: str = Field(..., min_length=4, example="test1234")

class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str = Field(..., example="eunice")
    password: str = Field(..., min_length=4, example="test1234")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
```

> ✅ UserRead는 ORM 객체(User)를 응답할 때 사용,
> `UserCreate`는 회원가입, `UserLogin`은 JSON 로그인용,
> `Token`, `TokenPayload`는 JWT 관련.

---

### 2. JWT 보안 로직 정리 – `core/security.py` (확인차 전체 정리)

📁 `app/core/security.py`

(이전에 작업한 게 있다면, 아래 버전으로 맞춰두면 됩니다.)
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

# ⚠️ 실제 서비스에서는 .env 로 빼야 함
SECRET_KEY = "CHANGE_ME_TO_ENV"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1일

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Swagger /docs 에서 Authorize 버튼이 생기는 부분
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

    # ORM → Pydantic
    return UserRead.model_validate(user, from_attributes=True)
```

> 여기까지가 “JWT 토큰 발급/검증 + 현재 사용자 가져오기”의 핵심.

---

### 3. Auth 라우터 – 회원가입 + 로그인(JWT 발급)

이제 실제 API를 만들 차례.

📁 `app/api/routes/auth.py`
```python
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from app.models.user import User
from app.schemas.users import (
    Token,
    UserCreate,
    UserRead,
)

router = APIRouter()

@router.post(
    "/signup",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="회원가입",
)
def signup(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    # username 중복 체크
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # email 중복 체크 (선택)
    if payload.email:
        existing_email = db.query(User).filter(User.email == payload.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserRead.model_validate(user, from_attributes=True)

@router.post(
    "/login",
    response_model=Token,
    summary="로그인 (JWT 발급)",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  # username, password (form-data)
    db: Session = Depends(get_db),
):
    """
    OAuth2PasswordBearer + Swagger Authorize 버튼과 연동되는 로그인 엔드포인트.
    - username / password 를 form-data 로 받음
    - 성공 시 access_token(JWT) 반환
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")

@router.get(
    "/me",
    response_model=UserRead,
    summary="내 정보 조회 (보호 API 예시)",
)
def read_me(current_user: UserRead = Depends(get_current_user)):
    """
    현재 토큰 기준 로그인된 유저 정보를 반환.
    - JWT 보호 API 예시용
    """
    return current_user
```

> ✅ /auth/login 에서 OAuth2PasswordRequestForm을 사용했기 때문에
> 
> `/docs` 의 “Authorize” 버튼과 자동으로 연동됩니다.

---

### 4. 보호된 API 예시 – Todos, Incoming, Users

이미 3번 파트에서 `Todos` 라우터에 `Depends(get_current_user)`를 넣어서
JWT 보호를 걸어놨어요. 여기에 **“이 API는 JWT 보호가 걸려 있다”** 는 걸
문서에서 보이도록 하면 됩니다.
예시로 Todo 라우터 한 번 다시 정리:

📁 `app/api/routes/todos.py` (일부)
```python
from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.users import UserRead
from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_or_404_for_user,
    list_todos_for_user,
    search_todos_for_user,
)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TodoRead],
    summary="Todo 목록 조회 (JWT 보호)",
)
def list_todos(
    status_filter: str | None = Query(default=None),
    q: str | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserRead = Depends(get_current_user),  # 🔐 보호
    db: Session = Depends(get_db),
):
    todos = list_todos_for_user(
        db=db,
        user=current_user,
        status_filter=status_filter,
        q=q,
        skip=skip,
        limit=limit,
    )
    return todos
```

> 이 패턴대로 /incoming, /notifications 등에도
> `current_user: UserRead = Depends(get_current_user)` 를 붙이면 모두 JWT 보호 API가 됩니다.

---

### 5. `/api` 전체 라우터 정리 (한 번 더)

📁 `app/api/router.py`
```python
from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.todos import router as todo_router
from app.api.routes.incoming_data import router as incoming_router
# (Notification 라우터 등 있으면 추가)

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(todo_router, prefix="/todos", tags=["Todos"])
api_router.include_router(incoming_router, prefix="/incoming", tags=["Incoming Data"])
```

---

### 6. Swagger(/docs)에서 JWT 보호 API 테스트하는 순서

실습용 순서를 정리하면:

1. 서버 실행
```bash
    uvicorn app.main:app --reload
```
    
2. 브라우저에서 `http://127.0.0.1:8000/docs` 접속
    
3. **회원가입**
    - `POST /api/auth/signup` → Try it out → username/email/password 입력 → Execute
4. **로그인 (JWT 발급)**
    
    - `POST /api/auth/login` 클릭
    - `username`, `password` 입력 후 → Execute
    - 응답에서 `access_token` 복사
    
5. **Authorize 버튼 클릭**
    
    - 오른쪽 상단 `Authorize` 클릭
    - `Bearer <토큰>` 형식으로 붙여넣기
        예: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...`
    - `Authorize` → `Close`
        
2. 이제 `GET /api/auth/me`, `GET /api/todos`, `POST /api/todos` 등
    **JWT 보호된 API를 바로 호출**할 수 있음
    

> ❗ 토큰이 없거나 잘못되면 401 Unauthorized
> Swagger에서도 에러 응답이 문서화된 걸 같이 보여줄 수 있습니다.

---

### 7. (선택) OpenAPI 태그/메타데이터 정리

조금 더 문서 자동화를 강조하고 싶다면 `main.py`에 태그 설명을 추가해 줄 수 있어요.

📁 `app/main.py` 일부
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.db import Base, engine

tags_metadata = [
    {
        "name": "Auth",
        "description": "회원가입, 로그인, JWT 인증 관련 엔드포인트",
    },
    {
        "name": "Todos",
        "description": "사용자별 Todo CRUD 및 검색 API",
    },
    {
        "name": "Incoming Data",
        "description": "외부/센서 데이터 수신 및 조회 API",
    },
    {
        "name": "Health",
        "description": "헬스 체크용 엔드포인트 (운영/모니터링 시스템에서 사용)",
    },
]

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리 + Incoming Data + JWT + 모니터링을 포함한 FastAPI 백엔드",
    version="0.1.0",
    openapi_tags=tags_metadata,
)
```

이렇게 하면 `/docs` 왼쪽에
**Auth / Todos / Incoming Data / Health** 메뉴가 설명과 함께 깔끔하게 정리됩니다.

---

### 🔚 파트 13 요약

이 파트에서 완성된 것들:

- ✔ **JWT 기반 회원가입 / 로그인 / 현재 유저 조회 API**
- ✔ `OAuth2PasswordBearer` + `/api/auth/login` 연결로 Swagger `Authorize` 버튼 작동
- ✔ `get_current_user` 의존성으로 `/api/todos`, `/api/incoming` 등 **JWT 보호 API** 구현
- ✔ OpenAPI 태그와 예시 값까지 포함된 **문서 자동화**

이제 TaskBoard API는:

- “로그인 없는 공개 API” +
- “JWT 필수인 보호 API”를
    명확히 구분하는 **실전용 백엔드 구조**가 됐어요.