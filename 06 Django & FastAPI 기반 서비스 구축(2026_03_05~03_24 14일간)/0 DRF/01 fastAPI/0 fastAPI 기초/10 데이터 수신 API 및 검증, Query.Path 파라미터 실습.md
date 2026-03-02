좋아, 이제 **파트 10: 데이터 수신 API 및 검증, Query · Path 파라미터 실습**을

지금까지 만든 구조 위에 “추가”하는 형태로 짤게요.

> ✅ 목표
> 
> - `GET /api/todos/search` : Query 파라미터로 필터링/검증 연습
> - `GET /api/users/{user_id}/todos` : Path 파라미터 + 권한 체크 연습

이미 1~9번까지 짠 코드와 **충돌 안 나게**,

“추가되는 파일·코드”만 정리해서 줄게요.

---

### 1️⃣ Todo 검색용 Search API (Query 파라미터 실습)

### 1-1. 서비스 레이어에 검색 함수 추가

📁 `app/services/todo_service.py`

(기존에 있던 파일에 **함수만 추가**)
```python
# app/services/todo_service.py
from datetime import date
from typing import List, Optional

from app.models.todos import list_todos_by_user_id
from app.schemas.todos import TodoRead
from app.schemas.users import UserRead

def search_todos_for_user(
    user: UserRead,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    due_from: Optional[date] = None,
    due_to: Optional[date] = None,
    min_priority: Optional[int] = None,
    max_priority: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
) -> List[TodoRead]:
    """
    Query 파라미터들을 적용하여 현재 사용자의 Todo를 검색.
    - status_filter: todo / in_progress / done
    - q: 제목/설명 검색
    - due_from / due_to: 마감일 범위
    - min_priority / max_priority: 우선순위 범위
    - skip / limit: 페이지네이션
    """
    todos = list_todos_by_user_id(user.id)

    # 상태 필터
    if status_filter:
        todos = [t for t in todos if t.status == status_filter]

    # 키워드 검색 (제목 + 설명)
    if q:
        key = q.lower()
        todos = [
            t
            for t in todos
            if key in (t.title or "").lower()
            or key in (t.description or "").lower()
        ]

    # 마감일 범위
    if due_from:
        todos = [t for t in todos if t.due_date and t.due_date >= due_from]
    if due_to:
        todos = [t for t in todos if t.due_date and t.due_date <= due_to]

    # 우선순위 범위
    if min_priority is not None:
        todos = [t for t in todos if t.priority >= min_priority]
    if max_priority is not None:
        todos = [t for t in todos if t.priority <= max_priority]

    # 페이지네이션
    todos = todos[skip : skip + limit]

    return todos
```

> 🔎 list_todos_by_user_id 는
> 인메모리 DB에서 `user_id`로 Todo 목록을 가져오는 기존 헬퍼라고 가정하고 쓴 거예요
> (2~3파트에서 만들었던 `list_todos_for_user`가 내부적으로 쓰던 헬퍼를 분리했다고 보면 됨)

---

1-2. 라우터에 `/search` 엔드포인트 추가 (Query 파라미터 + 검증)

📁 `app/api/routes/todos.py`

(기존 파일의 **맨 위 import + 아래쪽에 엔드포인트 추가**)
```python
# app/api/routes/todos.py
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.schemas.todos import (
    TodoCreate,
    TodoRead,
    TodoUpdate,
)
from app.schemas.users import UserRead
from app.services.todo_service import (
    create_todo_for_user,
    delete_todo_for_user,
    get_todo_or_404_for_user,
    list_todos_for_user,
    update_todo_for_user,
    search_todos_for_user,  # ✅ 새로 추가
)

router = APIRouter()

# --- (기존 list / create / retrieve / update / delete 엔드포인트들 생략) ---

@router.get(
    "/search",
    response_model=List[TodoRead],
    summary="Todo 검색 (Query 파라미터 실습)",
)
def search_todos(
    status_filter: str | None = Query(
        default=None,
        description="todo / in_progress / done 중 하나로 필터",
        pattern="^(todo|in_progress|done)$",
    ),
    q: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
        description="제목/설명 검색 키워드",
    ),
    due_from: date | None = Query(
        default=None,
        description="이 날짜 이후 마감인 Todo만 (YYYY-MM-DD)",
        example="2025-12-01",
    ),
    due_to: date | None = Query(
        default=None,
        description="이 날짜 이전 마감인 Todo만 (YYYY-MM-DD)",
        example="2025-12-31",
    ),
    min_priority: int | None = Query(
        default=None,
        ge=1,
        le=5,
        description="우선순위 최소값 (1~5)",
        example=2,
    ),
    max_priority: int | None = Query(
        default=None,
        ge=1,
        le=5,
        description="우선순위 최대값 (1~5)",
        example=4,
    ),
    skip: int = Query(
        default=0,
        ge=0,
        description="페이지 시작 offset (0부터)",
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="한 번에 가져올 최대 개수",
    ),
    current_user: UserRead = Depends(get_current_user),
) -> list[TodoRead]:
    """
    Query 파라미터를 활용한 Todo 검색 예제.

    - `status_filter`: todo / in_progress / done
    - `q`: 제목/설명에 포함되는 키워드 검색
    - `due_from` / `due_to`: 마감일 범위 필터
    - `min_priority` / `max_priority`: 우선순위 범위 필터
    - `skip` / `limit`: 페이지네이션
    """
    # 추가적인 수동 검증 로직이 필요하면 여기에 작성 가능
    if min_priority is not None and max_priority is not None:
        if min_priority > max_priority:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_priority는 max_priority보다 클 수 없습니다.",
            )

    if due_from and due_to and due_from > due_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="due_from은 due_to보다 클 수 없습니다.",
        )

    return search_todos_for_user(
        user=current_user,
        status_filter=status_filter,
        q=q,
        due_from=due_from,
        due_to=due_to,
        min_priority=min_priority,
        max_priority=max_priority,
        skip=skip,
        limit=limit,
    )
```

> 여기서 핵심 포인트(코드상으로만)
> 
> - `Query()` 를 써서 **타입 + 범위 + 길이 + 정규식(pattern)** 검증
> - 수동 검증이 필요한 부분은 `HTTPException(400)` 으로 처리
> - Swagger `/docs`에서 Query 파라미터들이 전부 문서화됨

---

### 2️⃣ Path 파라미터 실습 – `/api/users/{user_id}/todos`

이번에는 Path 파라미터 + 권한 체크.

> 설계:
> 
> - `GET /api/users/{user_id}/todos`
>     - URL 경로에서 `user_id`를 Path 파라미터로 받음
>     - 현재 로그인한 사용자와 `user_id`가 다르면 403 (관리자 기능은 아직 X)
>     - 같으면 `list_todos_for_user` 호출해서 반환

2-1. 사용자별 Todo 조회 라우터 추가

📁 `app/api/routes/user_todos.py` (새 파일)
```python
# app/api/routes/user_todos.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.core.security import get_current_user
from app.schemas.todos import TodoRead
from app.schemas.users import UserRead
from app.services.todo_service import list_todos_for_user

router = APIRouter()

@router.get(
    "/{user_id}/todos",
    response_model=List[TodoRead],
    summary="특정 사용자의 Todo 목록 (Path 파라미터 실습)",
)
def list_todos_for_specific_user(
    user_id: int = Path(
        ...,
        ge=1,
        description="조회할 사용자 ID(양의 정수)",
        example=1,
    ),
    current_user: UserRead = Depends(get_current_user),
) -> list[TodoRead]:
    """
    Path 파라미터로 user_id를 받아 해당 사용자의 Todo를 조회.

    - 현재는 "본인 것만" 허용 (관리자 기능 X)
      → `current_user.id`와 `user_id`가 다르면 403 Forbidden
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 Todo는 조회할 수 없습니다.",
        )

    return list_todos_for_user(
        user=current_user,
        status_filter=None,
        q=None,
        skip=0,
        limit=100,
    )
```

---

2-2. API Gateway에 `/users` 라우터 연결

📁 `app/api/router.py` 수정
```python
# app/api/router.py
from fastapi import APIRouter

from app.api.routes import (
    health,
    todos,
    user_todos,  # ✅ 추가
)

api_router = APIRouter()

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

api_router.include_router(
    todos.router,
    prefix="/todos",
    tags=["Todos"],
)

# ✅ Path 파라미터 실습: /api/users/{user_id}/todos
api_router.include_router(
    user_todos.router,
    prefix="/users",
    tags=["UserTodos"],
)
```

---

### 3️⃣ 간단 테스트 시나리오

서버 실행:
```bash
uvicorn app.main:app --reload
```

1. **로그인 후 토큰 발급**
    
    - `POST /api/auth/signup`
    - `POST /api/auth/login` → access_token 확보
    - `/docs` → Authorize 버튼 클릭 → Bearer 토큰 입력
2. **Todo 몇 개 생성**
    
    - `POST /api/todos/`
    - 서로 다른 status / priority / due_date 로 3~5개 만들어 두기
3. **Query 파라미터 검색 테스트**
    
    - `GET /api/todos/search?status_filter=done&min_priority=2&max_priority=5`
    - `GET /api/todos/search?q=fastapi`
    - `GET /api/todos/search?due_from=2025-12-01&due_to=2025-12-31`
    
    👉 Swagger `/docs` 에서 Query 파라미터 설명과 검증 범위가 다 보입니다.
    
4. **Path 파라미터 테스트**
    
    - `GET /api/users/1/todos`
    - Path 입력란에 1 넣고 실행
    - 로그인한 유저의 id가 1이면 → 정상 응답
    - 다르면 → 403 Forbidden

---

### 4️⃣ 지금까지(1~10파트) 구조가 잘 이어졌는지 체크

- **1~4 파트**: 기본 구조 + Todo CRUD + JWT + 모듈분리
- **5 파트**: `/api` Gateway + 서비스 레이어 개념
- **6~7 파트**: Redis 캐시 + 비동기 알림 큐
- **8 파트**: Todo 첨부파일 업로드 & 정적 파일 서빙
- **9 파트**: 설치 + 라우팅 + 스키마 전반 정리
- **10 파트(지금)**:
    - Query 파라미터를 통한 검색 API (`/api/todos/search`)
    - Path 파라미터를 통한 사용자별 Todo API (`/api/users/{user_id}/todos`)

전부 **기존 구조를 건드리지 않고 “추가”만 하는 방식**으로 설계해서,
앞으로 11~14파트(ORM/DB, 예외 처리, 테스트 등)도 그대로 위에 올릴 수 있는 상태입니다.
이제 11번부터는 **SQLAlchemy/DB 연동**으로 인메모리 부분을 차근차근 교체하면서 가면 돼요.