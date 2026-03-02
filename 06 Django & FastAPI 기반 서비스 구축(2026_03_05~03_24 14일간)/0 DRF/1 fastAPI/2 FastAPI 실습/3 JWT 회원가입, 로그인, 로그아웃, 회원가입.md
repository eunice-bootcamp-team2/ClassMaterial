회원가입부분

Django에서 설정한 부분
proj/settings.py
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("DB_NAME", "restaurant_db"),
        "USER": os.environ.get("DB_USER", "django_user"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "db_password"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "3306"),
        "OPTIONS": {"charset": "utf8mb4"},
    },
        "fdc": {     
        "ENGINE": "django.db.backends.mysql",
        "NAME": "myproject_db",
        "USER": "django_user",
        "PASSWORD": "DjangoUserPass!123",
        "HOST": "localhost",
        "PORT": "3306",
        "OPTIONS": {"charset": "utf8mb4"},
    },
}

DATABASE_ROUTERS = ["restaurant.dbrouters.FdcRouter"]
```

restaurant/dbrouters.py
```python
class FdcRouter:
    """
    fdc_* 테이블 모델은 'fdc' DB(myproject_db)로 라우팅.
    나머지는 기본 DB(restaurant_db).
    """
    def _is_fdc_model(self, model):
        return model._meta.db_table.startswith("fdc_")

    def db_for_read(self, model, **hints):
        return "fdc" if self._is_fdc_model(model) else None

    def db_for_write(self, model, **hints):
        return "fdc" if self._is_fdc_model(model) else None

    def allow_relation(self, obj1, obj2, **hints):
        # 서로 다른 DB 간 관계는 제한 없도록 허용
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # fdc_*는 이미 존재/외부 관리 → 이 DB로 마이그레이션 금지
        if db == "fdc":
            return False
        return None
```
---
`src/models/user_model.py`
```python
# 외부 스키마 매핑: Django의 auth_user 테이블과 1:1 매핑
# - 필드/타입은 실제 DB(DBeaver)와 일치해야 함
from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from src.core.database import Base

class User(Base):
    __tablename__ = "auth_user"  # 실제 테이블명

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    first_name = Column(String, nullable=True)
    last_name  = Column(String, nullable=True)
    email      = Column(String, nullable=True)

    nickname = Column(String, nullable=True)
    bio      = Column(String, nullable=True)

    is_superuser = Column(Boolean, nullable=False, default=False)
    is_staff     = Column(Boolean, nullable=False, default=False)
    is_active    = Column(Boolean, nullable=False, default=True)

    last_login  = Column(DateTime, nullable=True)
    date_joined = Column(DateTime, nullable=False)

	# 발급된 토큰 기록과의 관계(1:N)
    access_tokens = relationship("AccessToken", back_populates="user", cascade="all, delete-orphan")
```

`src/models/access_token_model.py`
```python
# 발급된 토큰 기록(fdc_user_access_tokens) 매핑
from sqlalchemy import BigInteger, Column, ForeignKey, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from src.core.database import Base

class AccessToken(Base):
    __tablename__ = "fdc_user_access_tokens"

    id = Column(BigInteger, primary_key=True, nullable=False, autoincrement=True)
    user_id = Column(Integer, ForeignKey("auth_user.id"), nullable=False)
    access_token = Column(Text, nullable=False)
    expiration_date = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="access_tokens")
```

`src/schemas/user_schema.py`
```python
# 사용자 요청/응답 스키마
from datetime import datetime
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=4)
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRead(BaseModel):
    id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    nickname: str | None = None
    bio: str | None = None
    is_active: bool
    date_joined: datetime

    class Config:
        from_attributes = True  # SQLAlchemy 모델 → 응답 변환
```

필요 패키지 설치
```bash
pip install PyMySQL
pip install python-jose
```

필요함수 작성 및 의존성 주입 준비
`src/core/auth.py` (인증정보 포함)
```python
# JWT/인증 공통 설정 (환경변수 로드)
import os
from dotenv import load_dotenv

load_dotenv(verbose=True)

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change-me")
AUTH_ALGORITHM = os.getenv("AUTH_ALGORITHM", "HS256")
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
```

`.env`
```python
##### DATABASE #####
DATABASE_DRIVER=mysql+pymysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=django_user
DATABASE_PASSWORD=DjangoUserPass!123
DATABASE_NAME=restaurant_db
DATABASE_URL=mysql+pymysql://django_user:DjangoUserPass!123@localhost:3306/myproject_db?charset=utf8mb4

##### AUTH #####
AUTH_SECRET_KEY=this-is-secret-key
AUTH_ALGORITHM=HS256 # JWT에서 사용되는 대표적인 암호화 알고리즘
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

`src/dependencies/database.py`
```python
# 요청마다 DB 세션을 열고 닫는 FastAPI 의존성
from typing import Generator
from src.core.database import SessionLocal

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

`src/dependencies/auth.py`
```python
# 인증 핵심: 비밀번호 해시/검증, JWT 생성/검증, 현재 사용자 로딩
# - tokenUrl="/auth/login": Swagger에서 Authorize할 때 쓰는 토큰 발급 엔드포인트
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import src.core.auth as AUTH
from src.dependencies.database import get_db
from src.models.user_model import User

# bcrypt 기반 비밀번호 해시/검증 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Bearer 토큰(Access Token) 의존성
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
	# 입력 비번과 해시된 비번 비교
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
	# 비밀번호 해싱(저장 시 사용)
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
	# JWT 페이로드에 만료(exp) 추가 후 서명
    to_encode = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, AUTH.AUTH_SECRET_KEY, algorithm=AUTH.AUTH_ALGORITHM)

def decode_access_token(token: str) -> dict:
	# JWT 유효성/서명 검증 → 페이로드 반환
    try:
        return jwt.decode(token, AUTH.AUTH_SECRET_KEY, algorithms=[AUTH.AUTH_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

`src/app.py`
```python
from fastapi import FastAPI
from src.routers.index_router import router as index_router

app = FastAPI(
    title="패스트다이닝 API",
    openapi_tags=tags_metadata)

app.include_router(index_router)
```
----
라우팅 오퍼레이터

`src/routers/index_router.py`
```python
from fastapi import APIRouter

router = APIRouter(tags=["Authentication"])

@router.post("/login")
async def login_user() 
    return {}
```

스웨거에 현재까지 작성된 내용을 중간 정검 합니다.
```python
http://127.0.0.1:8000/docs
```

`src/routers/index_router.py`
```python
from fastapi import APIRouter, Depends
from src.schemas import user_schema
from src.schemas import access_token_schema
from src.operators import user_operator

@router.post("/login")
async def login_user(access_token: access_token_schema.AccessToken = Depends
(user_operator.authenticate_user)):
    return {
	    "access_token": access_token.access_token,
	    "token_type": "bearer"
    }
```

`src/operators/user_operator.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from src.models import user_model
from src.schemas import access_token_schema
from src.dependencies.database import get_db
from sqlalchemy.orm import Session
from src.dependencies.auth import verify_password, get_access_token_expire_minutes, create_access_token
from datetime import datetime, timedelta
from src.models import access_token_model
from typing import cast

def get_user_by_username(username: str, db: Session = Depends(get_db)):
    user = db.query(user_model.User)
    .filter(user_model.User.username == username).first()
    return user

def authenticate_user(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm)):
    user = get_user_by_username(form_data.username, db)

    if user is None or verify_password(form_data.password, user.password) is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    expires_delta = timedelta(minutes=get_access_token_expire_minutes())
    expiration_date = datetime.now() + expires_delta
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=expires_delta
    )

    db_token = access_token_model.AccessToken
    (user_id=user.id,
    access_token=access_token,
    expiration_date=expiration_date)
    db.add(db_token)
    user.last_login = datetime.now()
    db.commit()
    db.refresh(db_token)
    return cast(access_token_schema, db_token)
```

패키지 설치
```bash
pip insatll passlib
pip insatll python-multipart

# requirements.txt에 설치된 항목 추가하기
pip freeze > requirements.txt
```
---
회원가입 기능구현
`src/routers/index_router.py`
```python
@router.post("/signup", response_model=user_schema.User)
async def create_user(user: user_schema.User = Depends(user_operator.add_user)):
    return user
```

`src/operators/user_operator.py`
```python
from src.schemas import user_schema
from src.dependencies.auth import get_password_hash


def add_user(user: user_schema.UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(user.username, db) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exist")
    
    db_user = user_model.User(username=user.username,
                                password=get_password_hash(user.password),
                                first_name=user.first_name,
                                last_name=user.last_name,
                                email=user.email,
                                nickname = '',
                                bio = '',
                                is_superuser = False,
                                is_staff = False,
                                is_active = True,
                                date_joined = datetime.now())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
```

필요한 패키지 설치
```bash
pip install cryptography
pip install bcrypt
pip freeze > requirements.txt
```

스웨거에서 indext router가 제대로 동작하는지 실행해 봅니다.
암호화된 패스워드가 저장되는것을 확인할수 있습니다.




























`src/core/database.py`
```python
# SQLAlchemy 세션/엔진 설정(외부 스키마 myproject_db)
# - Django와 동일 DB를 바라보되, SQLAlchemy로 접속
import os
from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv(verbose=True)

SQLALCHEMY_DATABASE_URL = URL.create(
    drivername=os.getenv("DATABASE_DRIVER", "mysql+pymysql"),
    username=os.getenv("DATABASE_USERNAME", "django_user"),
    password=os.getenv("DATABASE_PASSWORD", "DjangoUserPass!123"),
    host=os.getenv("DATABASE_HOST", "localhost"),
    port=os.getenv("DATABASE_PORT", "3306"),
    database=os.getenv("DATABASE_NAME", "myproject_db"),  
    # 외부 스키마(myproject_db)
)

# pool_pre_ping=True: 커넥션 유휴 시에도 살아있는지 핑 체크
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모든 모델의 베이스 클래스
Base = declarative_base()
```




`src/schemas/access_token_schema.py`
```python
# 토큰/메시지 응답 스키마
from datetime import datetime
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expiration_date: datetime

class Message(BaseModel):
    detail: str
```

`src/operators/auth_operator.py`
```python
# 회원가입/로그인/로그아웃 비즈니스 로직
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies.auth import (
    verify_password, get_password_hash,
    create_access_token, get_access_token_expire_minutes,
)
from src.models.user_model import User
from src.models.access_token_model import AccessToken
from src.schemas.user_schema import UserCreate
from src.schemas.access_token_schema import Token

# -------------------------------------------------------------
# 유틸
# -------------------------------------------------------------
def get_user_by_username(username: str, db: Session) -> User | None:
    return db.query(User).filter(User.username == username).first()

# -------------------------------------------------------------
# 회원가입
# -------------------------------------------------------------
def register_user(payload: UserCreate, db: Session) -> User:
    if get_user_by_username(payload.username, db):
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=payload.username,
        password=get_password_hash(payload.password),
        first_name=payload.first_name or "",
        last_name=payload.last_name or "",
        email=payload.email or "",
        nickname="",
        bio="",
        is_superuser=False,
        is_staff=False,
        is_active=True,
        date_joined=datetime.now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# -------------------------------------------------------------
# 로그인 → JWT 발급 + 토큰 기록
# -------------------------------------------------------------
def login_user(username: str, password: str, db: Session) -> Token:
    user = get_user_by_username(username, db)
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires = timedelta(minutes=get_access_token_expire_minutes())
    expiration_date = datetime.now() + expires

    jwt_token = create_access_token(data={"sub": user.username}, expires_delta=expires)

    db_token = AccessToken(
        user_id=user.id,
        access_token=jwt_token,
        expiration_date=expiration_date,
    )
    db.add(db_token)
    user.last_login = datetime.now()
    db.commit()
    db.refresh(db_token)

    return Token(access_token=jwt_token, expiration_date=expiration_date)

# -------------------------------------------------------------
# 로그아웃 → 현재 토큰 무효화(기록 삭제)
# -------------------------------------------------------------
def logout_user(current_token: str, db: Session) -> int:
    """현재 Authorization 헤더로 전달된 토큰을 DB에서 제거(단순 무효화).
       반환값: 삭제된 토큰 레코드 수
    """
    q = db.query(AccessToken).filter(AccessToken.access_token == current_token)
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return deleted
```

`src/routers/auth_router.py`
```python
# /auth 엔드포인트: 회원가입, 로그인, 로그아웃, 내 정보
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from src.dependencies.database import get_db
from src.dependencies.auth import oauth2_scheme, get_current_user
from src.models.user_model import User
from src.operators import auth_operator
from src.schemas.user_schema import UserCreate, UserRead
from src.schemas.access_token_schema import Token, Message

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    user = auth_operator.register_user(payload, db)
    return user

@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # form.username / form.password
    token = auth_operator.login_user(form.username, form.password, db)
    return token

@router.post("/logout", response_model=Message, status_code=200)
def logout(
    db: Session = Depends(get_db),
    bearer: str = Depends(oauth2_scheme),  # 현재 토큰 문자열
):
    deleted = auth_operator.logout_user(bearer, db)
    if deleted == 0:
        # 이미 만료/삭제되었을 가능성 포함
        raise HTTPException(status_code=400, detail="Token not found or already revoked")
    return Message(detail="Logged out")

@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
```

