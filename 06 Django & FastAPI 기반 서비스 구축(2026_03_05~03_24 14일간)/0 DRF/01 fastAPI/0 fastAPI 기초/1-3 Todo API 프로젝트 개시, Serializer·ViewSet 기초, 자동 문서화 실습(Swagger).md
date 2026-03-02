
**기능/구조**

- FastAPI 프로젝트 생성 (`app/main.py`)
- 기본 라우터 `/health`, `/` 등 추가
- **Pydantic 스키마**로 Todo 생성/조회용 모델 정의
- `/docs`, `/redoc` 자동 문서 확인
    (DRF의 Swagger 경험과 비교)
    

**학습 포인트**

- DRF Serializer ↔ FastAPI Pydantic 모델 대응
- ViewSet 개념을 **“/todos 경로 + HTTP 메서드별 함수”** 로 나누어 구현해 보기

---
작업 폴더 생성 + 가상환경(uv) 생성
```bash
# 1) 프로젝트 루트 폴더
mkdir taskboard-api
cd taskboard-api

# 2) uv 가상환경 생성
uv venv .venv

# 3) 가상환경 활성화
# Linux / macOS
source .venv/bin/activate

# 4) 설치확인
python --version
uv --version
```

FastAPI & Uvicorn 설치
```bash
uv add "fastapi[standard]" uvicorn
```

> `fastapi[standard]` 안에 pydantic, Starlette, docs에 필요한 의존성들이 같이 들어있습니다.  
> `uvicorn`은 실제 서버를 띄우는 ASGI 서버입니다.

---
### 폴더 구조
- 14개 챕터에서 쓸 구조를 **미리** 만들어 둡니다.

```bash
mkdir -p app/api/routes
mkdir -p app/schemas
mkdir -p app/models
mkdir -p app/core

touch app/__init__.py
touch app/api/__init__.py
touch app/api/routes/__init__.py
touch app/schemas/__init__.py
touch app/models/__init__.py
touch app/core/__init__.py
touch app/main.py
```

```
taskboard-api/
├── .venv/
└── app/
    ├── __init__.py
    ├── main.py
    ├── api/
    │   ├── __init__.py
    │   └── routes/
    │       ├── __init__.py
    │       ├── health.py      # (곧 만듦)
    │       └── todos.py       # (곧 만듦)
    ├── core/
    │   └── __init__.py
    ├── models/
    │   └── __init__.py
    └── schemas/
        ├── __init__.py
        └── todos.py           # (곧 만듦)
```

> 이 구조는 나중에 JWT, Redis, SQLAlchemy, 알림 등 다 넣어도  
> 폴더만 확장하면 되는 형태라서 14챕터까지 견딥니다.

---

### `main.py` – FastAPI 앱 생성 + 라우터 연결

FastAPI에서 `main.py`의 역할:

> FastAPI에서 `main.py`는 **앱의 시작점(엔트리 포인트)** 이면서 전체 API의 길 안내판(라우팅 허브) 역할을 합니다.

📁 `app/main.py`
```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.routes import health, todos

# FastAPI 인스턴스 생성
app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리용 FastAPI 백엔드",
    version="0.1.0",
)


# 루트 엔드포인트: 간단한 인사
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to TaskBoard API"}


# health, todos 라우터 등록
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(todos.router, prefix="/todos", tags=["Todos"])
```

**중요 포인트**
- `app = FastAPI()`  
    → 장고의 `settings.py` + `wsgi.py/asgi.py` 에서 프로젝트를 띄우는 느낌  
    → 이 `app` 객체를 기준으로 Uvicorn이 서버를 실행합니다. (`uvicorn app.main:app`)
    
- `@app.get("/")`  
    → 가장 상단의 루트 URL에 대한 응답 정의
    
- `include_router(...)`  
    → Django의 urls.py에서 
```python
path("polls/", include("polls.urls"))
```
와 완전히 같은 역할로, 
`health.py`, `todos.py` 안에 있는 라우트들을 `/health`, `/todos` 경로로 **묶어서 연결**해 줍니다.

정리하면

> main.py = “FastAPI 앱을 만들고, 각 기능 모듈(라우터)을 붙여주는 중앙 관제실”

그래서 비즈니스 로직은 **여기에 직접 쓰지 않고**,  
각 도메인(health, todo, auth…)별 파일로 분리하는 것이 원칙입니다.

비즈니스 로직은 실제 서비스가 실제로 해야 하는 핵심 기능과 규칙을 의미합니다. 아래에 비즈니스 로직에 대해 좀더 구체적으로 설명하겠습니다.

---
### Health 체크용 라우터 만들기

헬스 체크는 단순한 “테스트용 API”가 아닙니다.

> 실제 운영 환경(EC2, Docker, K8s, Nginx, Load Balancer)에서 서비스가 살아있는지 자동으로 감시하는 필수 엔드포인트.

운영 환경에서는 다음 시스템들이 계속 `/health` 에 요청을 보내며 서비스 장애를 자동 감지합니다:

- Kubernetes livenessProbe / readinessProbe
- AWS ALB/ELB Health Check
- Docker healthcheck
- Nginx upstream health check
- 외부 모니터링 시스템 (Grafana, Prometheus alert rule 등)

헬스 체크가 없으면?

➡️ 서버가 죽었는데도 시스템이 모릅니다.
➡️ 트래픽이 죽은 서버로 계속 들어가며 전체 장애로 이어질 수 있습니다.

그래서 **실무에서는 어떤 언어/프레임워크로 개발하든 반드시 존재하는 엔드포인트** 입니다.

---

### 왜 일반 라우터와 분리해야 하는가?

이유 1) “헬스 체크는 인증·DB·캐시 등 아무 것도 필요 없는 특별한 API” 헬스 체크는 다음 요구조건이 있습니다:

✔ 아주 빠르게
✔ 항상 안정적으로
✔ DB나 Redis가 죽어도 **헬스 체크는 살아 있어야 함**

따라서 일반 API 코드와 섞이면 안 됩니다.
이유 2) 배포/자동화 시스템에서 사용되므로 **구조적으로 명확해야 함**

헬스 체크는:

- 팀원 누구나 위치를 알아야 하고
- 자동화 시스템에서도 쉽게 접근해야 하며
- 추후 유지보수 시 바로 찾을 수 있어야 함

그래서 별도 파일로 관리하는 것이 완전 정석.

이유 3) 일반 API의 비즈니스 로직과 섞이면 성능과 안정성에 영향을 줌

예:

- Todo API는 DB 연결 필요 → DB 장애 시 실패
- 유저 API는 인증 필요 → 토큰 검증 실패 시 장애

하지만 헬스 체크는 단순히 `"status": "ok"` 만 반환해야 합니다.
그래야 서버가 죽었는지만 판단할 수 있습니다.

---

### 헬스 체크를 `/health`로 고정하는 이유

운영 환경에서 다음처럼 설정하는데,
docker-compose.yml 예시
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "<http://localhost:8000/health>"]
  interval: 30s
  timeout: 10s
  retries: 3
```

이런 규칙 때문에 `/health` 나 `/healthz` 같은 경로는 표준처럼 굳어져 있습니다.

---

### APIRouter로 분리하는 것이 왜 좋은가?

DRF 기준으로 설명하면 쉽게 이해됨:

- DRF에서는 앱 별로 urls.py가 있죠?
- FastAPI에서는 **APIRouter가 앱 수준 URL 모듈 역할**을 하는 것입니다.

즉,
```
app/
 └── api/
      └── routes/
            ├── health.py   ← 헬스 체크
            ├── todos.py    ← Todo API
            ├── auth.py     ← Auth API
```

이 구조가 **서비스 분리(SRP 원칙)** 를 만족합니다.

---

### 실제 FastAPI 운영 프로젝트는 100% 헬스 체크를 이렇게 둠

예:

- Uber / Lyft / Netflix FastAPI 서비스
- Kubernetes 기반 백엔드 서비스
- AWS ECS/EC2 Docker 서비스

모두 `/health` 를 별도 라우터로 관리합니다.


📁 `app/api/routes/health.py`
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="헬스 체크")
def health_check():
    """
    서비스 헬스 체크용 엔드포인트.
    - 상태 확인에 사용
    """
    return {"status": "ok"}
```
- `APIRouter`는 DRF의 `ViewSet`을 여러 개 묶어서 **하나의 urls.py 느낌으로 관리**하는 것과 비슷합니다.
    
- `main.py`에서 `app.include_router(health.router, prefix="/health")` 했기 때문에  
    → 최종 경로는 **`GET /health/`** 가 됩니다.

---
### Todo용 Pydantic 스키마 정의 (Serializer 역할)

우선은 **DB 없이 메모리 리스트에 저장**하면서 Pydantic만 맛볼 겁니다.  
(DRF에서 첫 Todo 예제 만들 때 Model 없이 Serializer만 쓰는 느낌)

Pydantic은 다음 두 가지를 동시에 수행합니다:

##### 1. **입력 검증 (Validation)**

클라이언트가 보낸 JSON 값이:
- 필수 입력이 비었는지
- 타입이 맞는지
- 범위가 맞는지
    (ex: priority는 1~5만 가능)
    
자동으로 확인하고 잘못되면 **422 Unprocessable Entity** 오류를 돌려줍니다.

##### 2. **스키마 생성 (OpenAPI 문서 자동 생성)**

Swagger `/docs` 페이지에서 보게 될 “요청/응답 body 구조”가
Pydantic 모델을 기반으로 자동 생성됩니다.

---
📁 `app/schemas/todos.py`
```python
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


class TodoRead(TodoBase):
    """클라이언트에 응답할 때 사용할 스키마"""

    id: int
    created_at: datetime


    class Config:
        from_attributes = True  # 나중에 ORM 객체에서도 사용 가능
```

여기에는 **3개의 스키마 클래스**가 존재합니다:

1. `TodoBase` : 공통 필드를 묶어둔 “부모 스키마”
2. `TodoCreate` : 생성 요청 입력용 스키마
3. `TodoRead` : 조회 시 클라이언트에게 반환할 스키마
    
이 3개를 조합해서 DRF의 Serializer와 완전히 동일한 구조를 FastAPI 방식으로 구현하는 것입니다.

### `TodoBase` — 공통 필드를 묶어둔 “부모 스키마”

```python
class TodoBase(BaseModel):
    title: str = Field(..., example="FastAPI 강의 준비")
    description: Optional[str] = Field(default=None, ...)
    status: str = Field(default="todo", ...)
    due_date: Optional[date] = Field(default=None, ...)
    priority: int = Field(default=1, ge=1, le=5, ...)
```

### 🔍 왜 공통 필드를 묶는가?

Todo 생성(create), 수정(update), 조회(read)에서 등장하는 필드는 대부분 같습니다.

- title
- description
- status
- due_date
- priority

이걸 여러 스키마에 **매번 중복해서 작성하면 유지보수가 어렵습니다.**
그래서 **부모 스키마**를 만들어서
자식 스키마들이 그대로 상속받게 합니다.

---

### `TodoCreate` — 생성 요청 입력용 스키마

```python
class TodoCreate(TodoBase):
    pass
```

여기서는 부모(`TodoBase`) 그대로 사용하므로 `pass` 만 넣은 구조입니다.

### 🔎 역할

- 클라이언트에서 **Todo를 생성할 때** 보내는 JSON 데이터를 검증
- `id`나 `created_at` 같은 서버에서 생성되는 값은 포함하지 않음

DRF로 비교하면?
```python
class TodoCreateSerializer(serializers.Serializer):
    title = ...
    description = ...
    ...
```

과 **동일한 역할**입니다.

---

### `TodoRead` — 조회 시 클라이언트에게 반환할 스키마

```python
class TodoRead(TodoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

### 🔍 왜 별도의 Read 스키마를 만드는가?

클라이언트는 Todo를 가져갈 때 이런 구조를 원한다:

```json
{
  "id": 1,
  "title": "FastAPI 공부",
  "status": "todo",
  "created_at": "2025-01-01T10:23:00"
}
```

이중에서:

- `id`
- `created_at`

은 **서버(DB)가 생성"하는" 값**입니다.
즉, `TodoCreate` 요청에는 절대 넣으면 안 되고,
반대로 `TodoRead` 응답에는 반드시 넣어야 합니다.
그래서 **읽기(Read) 전용 스키마**를 따로 만드는 것입니다.

### DRF로 비교하면?

DRF에서 read/write 분리하려고 다음처럼 Serializer를 나누는 경우와 동일합니다:
```python
class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ["id", "title", "status", "created_at"]
        read_only_fields = ["id", "created_at"]
```

FastAPI에서는 **스키마를 아예 구분하는 방식을 더 선호**합니다.

---

### `Field()` — DRF Serializer의 필드 옵션과 동일한 기능

예:
```python
title: str = Field(..., example="FastAPI 강의 준비")
```

여기서 `Field(...)`가 하는 역할:

|기능|설명|
|---|---|
|`...`|필수 입력(required=True)|
|`example="..."`|Swagger 문서에서 보여줄 Example 데이터|
|`description="..."`|Swagger 문서 설명|
|`default=값`|기본값 지정|
|`ge=1, le=5`|숫자 범위 제한 (greater or equal / less or equal)|

→ 즉, DRF의 `help_text`, `default`, `validators` 기능을 그대로 FastAPI 방식으로 구현한 것.

---

### `from_attributes=True` 의 역할

```python
class Config:
    from_attributes = True
```

이 설정은 FastAPI + ORM(SQLAlchemy) 사용할 때 중요합니다.

ORM 모델을 그대로 응답으로 보낼 수 있게 해줍니다:
```python
db_todo = TodoModel(...)
return TodoRead.from_orm(db_todo)
```

이 기능이 있으면:

- Pydantic이 **ORM 객체 → JSON 응답** 형태로 자동 변환
- DRF의 `ModelSerializer`와 매우 비슷해짐

---

### 전체 구조 요약

|목적|FastAPI|DRF 대응|
|---|---|---|
|공통 필드 정의|`TodoBase`|Serializer 내부 필드|
|생성용|`TodoCreate`|Write Serializer|
|조회용|`TodoRead`|Read Serializer|
|ORM 객체 변환|`from_attributes=True`|ModelSerializer|

---

### 💬 FAQ에 대한 답변

### Q1. 왜 스키마를 두 개(TodoCreate, TodoRead)로 나누나요?

A. 요청(request)과 응답(response)에 필요한 필드가 다르기 때문입니다.

---

### Q2. DRF에서는 하나의 Serializer로 하는데 FastAPI에서는 꼭 나눠야 해요?

A. 선택이지만 **나누는 것이 훨씬 직관적이고 에러 방지에 좋습니다.**

---

### Q3. Pydantic은 Django 모델이에요?

A. No!

Pydantic은 DB와 상관없는 **순수 검증 + 문서화용 클래스**입니다.

---

### Q4. 왜 BaseModel을 상속받나요?

A. Pydantic 검증 기능을 쓰기 위함.

---

### 🎯 결론

Todo 스키마 구조는 FastAPI 전체 패턴을 익히는 데 **가장 중요한 부분**입니다.

- DRF의 Serializer와 1:1 대응
- 타입힌트 기반 자동 검증
- Swagger 자동 생성
- 요청/응답 분리 설계
- 나중에 SQLAlchemy 모델과 자연스럽게 결합

이 3단 구성(Base, Create, Read)은 **FastAPI 베스트 프랙티스**라고 보면 됩니다.

---
### Todo 라우터 만들기 (ViewSet 컨셉 맛보기)

DB는 아직 안 쓰므로 **임시 인메모리 저장소**를 사용합니다.  
(나중에 SQLAlchemy로 갈아 끼울 때 구조가 비슷해서 바꾸기 쉽습니다.)

---
비즈니스 로직(business logic)은 “서비스가 실제로 해야 하는 핵심 기능과 규칙”을 의미합니다.  
즉, 단순히 화면을 보여주거나 데이터를 전달하는 게 아니라,

> **“이 서비스가 왜 존재하는지, 어떤 문제를 해결하는지, 무엇을 처리해야 하는지”**  
> 를 담당하는 **핵심 두뇌 부분**이라고 이해하면 됩니다.

쉽게 말하면
- **겉모습(UI)** : 옷
- **라우터/엔드포인트** : 문과 복도
- **비즈니스 로직** : “사람이 실제로 행동하고 일을 처리하는 뇌와 근육”
    
즉, API가 실제로 해야 할 일은 모두 비즈니스 로직입니다.

##### 비즈니스 로직의 예시 (서비스에 따라 달라짐) 예: Todo 서비스라면
| 기능            | 실제 비즈니스 로직                         |
| ------------- | ---------------------------------- |
| Todo 생성       | 제목이 비었는가 검증 → DB에 저장 → 사용자에게 알림 발송 |
| Todo 완료 처리    | 상태값 변경 → 완료일 기록 → Redis 캐시 무효화     |
| 우선순위 정렬       | DB 쿼리 + 정렬 규칙 적용                   |
| 마감 임박 Todo 알림 | 마감 시간 < 24시간 → 알림 생성 또는 비동기 전송     |

웹 앱에서 보통 레이어가 이렇게 나뉩니다.
```
클라이언트 (React/Flutter 등)
      ↓
라우터(API endpoint)           ← URL 관리
      ↓
비즈니스 로직(Service Layer)   ← 실제 처리 담당
      ↓
DB/ORM(Model)                  ← 데이터 저장/조회
```

FastAPI에서
```python
# routes/todos.py
@router.post("/")
def create_todo(todo_in: TodoCreate, current_user=Depends(get_user)):
    return todo_service.create_todo(todo_in, current_user)
```

위 라우터의 역할은 단순합니다:

- URL을 정의하고
- 요청을 받고
- 어떤 비즈니스 로직을 호출할지 연결해주는 “문지기”
    
**하지만 진짜 일은 서비스(Service Layer)에서 처리합니다.**

비즈니스 로직이 들어가는 위치는 보통 이 파일들입니다:
- `services/todo_service.py`
- `core/logic.py`
- `domain/todo/usecases.py`

```python
def create_todo(todo_in, user):
    # 1. 검증
    if len(todo_in.title) < 3:
        raise ValueError("Title too short")

    # 2. 실제 DB 저장
    todo = Todo(...)

    session.add(todo)
    session.commit()

    # 3. 후처리 (캐시 무효화, 알림 전송 등)
    notify_user(user.id, "새로운 Todo가 추가되었습니다.")

    return todo
```
이 전체 과정이 **비즈니스 로직**입니다.

비즈니스 로직 = “서비스가 실제로 해야 하는 기능 규칙, 처리 과정”  
라우터는 문지기,  
Pydantic은 데이터 경찰,  
DB는 창고,  
비즈니스 로직은 그 안에서 **실제로 일을 하는 핵심 두뇌**

---

📁 `app/api/routes/todos.py`
```python
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status

from app.schemas.todos import TodoCreate, TodoRead

router = APIRouter()

# 임시 인메모리 저장소 (나중에 DB로 교체)
_fake_db: list[TodoRead] = []
_auto_increment_id = 1  # 간단한 id 증가용


@router.get(
    "/",
    response_model=List[TodoRead],
    summary="Todo 목록 조회",
)
def list_todos() -> list[TodoRead]:
    """
    모든 Todo 목록을 조회합니다.
    - 아직은 인증/필터링 없이 **전체 목록**을 반환합니다.
    """
    return _fake_db


@router.post(
    "/",
    response_model=TodoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Todo 생성",
)
def create_todo(payload: TodoCreate) -> TodoRead:
    """
    새 Todo를 생성합니다.
    - DRF의 `Serializer.save()` 역할을
      여기서는 Pydantic + 파이썬 코드로 직접 구현
    """
    global _auto_increment_id

    todo = TodoRead(
        id=_auto_increment_id,
        created_at=datetime.utcnow(),
        **payload.model_dump(),
    )
    _auto_increment_id += 1
    _fake_db.append(todo)
    return todo


@router.get(
    "/{todo_id}",
    response_model=TodoRead,
    summary="단일 Todo 조회",
)
def retrieve_todo(todo_id: int) -> TodoRead:
    """
    ID로 특정 Todo를 조회합니다.
    """
    for todo in _fake_db:
        if todo.id == todo_id:
            return todo

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Todo {todo_id} not found",
    )
```

**ViewSet과의 대응**

- DRF에서는 `TodoViewSet` 안에 `list()`, `create()`, `retrieve()` 메서드가 들어있는데
    
- FastAPI에서는 `@router.get("/") list_todos`, `@router.post("/") create_todo`,  
    `@router.get("/{todo_id}") retrieve_todo` 처럼 **HTTP 메서드 + 경로별 함수**로 쪼갭니다.
    
- 그래도 `router` 하나 안에 묶여 있기 때문에, **하나의 ViewSet을 routes 파일 하나로 본다고 생각**하면 됩니다.

---
### 서버 실행 & Swagger 문서 확인

서버 실행
프로젝트 루트(`taskboard-api`)에서:
```bash
uvicorn app.main:app --reload
```

- `app.main:app`
    - 앞의 `app.main`은 `app/main.py` 모듈
    - 뒤의 `app`은 그 파일 안의 FastAPI 인스턴스 이름
        

터미널에 이런 로그가 나오면 성공:
```bash
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```


Uvicorn / ASGI
Django는 runserver이고, FastAPI는 uvicorn이지?

> Uvicorn과 ASGI 한 줄 이해
- Django (옛날 방식)**: WSGI 기반 – 동기 처리 중심
- FastAPI: ASGI 기반 – 비동기(async) 처리를 지원하도록 설계된 서버 프로토콜
> 우리가 서버를 띄울 때:
- uvicorn app.main:app --reload
- `uvicorn` → ASGI 서버 프로그램 이름
- `app.main:app`
    - `app.main` = `app/main.py` 모듈
    - `app` = 그 파일 안에 있는 `FastAPI()` 인스턴스 변수 이름
즉, **“main.py 안에 있는 app 객체를 ASGI 서버(uvicorn)으로 실행해라”** 라는 의미입니다.

---
### 기본 엔드포인트 테스트

브라우저 또는 HTTP 클라이언트(Insomnia, Postman 등)에서:

1. **루트 확인**
    - `GET http://127.0.0.1:8000/`
    - 응답:
```json
{"message": "Welcome to TaskBoard API"}
```
	
2. Health 체크
- `GET http://127.0.0.1:8000/health/`
- 응답:
```json
{"status": "ok"}
```

**Todo 목록 조회 (현재는 빈 배열)**

- `GET http://127.0.0.1:8000/todos/`
- 응답:
```
[]
```
	
3. **Todo 생성**
    - `POST <http://127.0.0.1:8000/todos/`>
    - Body (JSON 예시):
```json
{
 "title": "FastAPI 1장 자료 작성",
 "description": "프로젝트 구조와 기본 API 작성",
 "status": "todo",
 "priority": 3
}
```

응답:
```json
{
  "title": "FastAPI 1장 자료 작성",
  "description": "프로젝트 구조와 기본 API 작성",
  "status": "todo",
  "due_date": null,
  "priority": 3,
  "id": 1,
  "created_at": "2025-12-11T06:30:00.000000"
}
```

4. **Todo 상세 조회**
    - `GET <http://127.0.0.1:8000/todos/1`>
    - 방금 만든 Todo가 JSON으로 반환됩니다.

---

## Swagger / ReDoc 문서 확인

1. **Swagger UI (실습의 메인)**
    - `http://127.0.0.1:8000/docs`
    - 여기서 `/todos/`, `/health/`, `/` 모두 자동으로 문서화된 것을 확인할 수 있습니다.
    - 요청 Body에 우리가 설정한 `example`, `description` 등이 그대로 표시됩니다.
2. **ReDoc**
    - `http://127.0.0.1:8000/redoc`
    - 좀 더 정적인 문서 스타일. 실제 문서화용으로도 사용 가능.

💡 DRF와 비교
 
- DRF에서는 `drf-yasg`, `drf-spectacular` 같은 패키지를 추가 설치하고
	설정해야 Swagger 문서를 얻을 수 있었는데
- FastAPI는 **기본 내장**입니다.
	Pydantic 모델 + 경로 함수 정의만 제대로 해주면 OpenAPI 문서가 자동으로 생성됩니다.

---

### 포인트 정리

1. **폴더 구조**
    - `main.py` = Django의 프로젝트 레벨 `urls.py` + 약간의 `settings` 느낌
    - `api/routes/*.py` = 앱별/도메인별 ViewSet 모음
    - `schemas/*.py` = DRF Serializer 역할
2. **Pydantic ↔ Serializer**
    - `TodoCreate`, `TodoRead`가 DRF `Serializer`를 대체
    - 타입힌트 + `Field()`로 검증 + 문서 + 예시까지 한 번에 표현
3. **ViewSet을 “경로 함수 집합”으로 쪼개기**
    - `router = APIRouter()` 안에 `@router.get`, `@router.post`들을 모아 놓은 파일 = 하나의 ViewSet처럼 사용
4. **Swagger 자동 문서**
    - `/docs`에 가서 스스로 API를 호출해 보며, 스키마/응답 구조를 눈으로 확인
    - 이 문서를 고객/프론트엔드 팀에 바로 넘길 수 있는 수준으로 자동 생성되는 것이 FastAPI의 강점