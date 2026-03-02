### 1️⃣ `app/schemas/todos.py` 업데이트 (TodoUpdate 추가)

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
    created_at: datetime

    class Config:
        from_attributes = True  # 나중에 ORM 객체에서도 사용 가능
```

> ✅ 기존 파일 통째로 교체하면 됩니다. (TodoUpdate만 새로 추가된 구조)

---

### 2️⃣ `app/api/routes/todos.py` 업데이트

CRUD + 필터/정렬/페이지네이션까지 모두 포함된 전체 코드입니다.
```python
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.todos import TodoCreate, TodoRead, TodoUpdate

router = APIRouter()

# 임시 인메모리 저장소 (나중에 DB로 교체)
_fake_db: list[TodoRead] = []
_auto_increment_id = 1  # 간단한 id 증가용

@router.get(
    "/",
    response_model=List[TodoRead],
    summary="Todo 목록 조회 (필터/정렬/페이지네이션 포함)",
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
) -> list[TodoRead]:
    """
    Todo 목록 조회 + 필터링 + 정렬 + 페이지네이션.
    """
    items = list(_fake_db)

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
            # due_date가 None이면 제일 뒤로
            return todo.due_date or date.max
        if order_by == "priority":
            return todo.priority
        if order_by == "title":
            return (todo.title or "").lower()
        # 기본: created_at
        return todo.created_at

    reverse = order_dir.lower() == "desc"
    items.sort(key=_sort_key, reverse=reverse)

    # 6) 페이지네이션 (offset, limit)
    start = offset
    end = offset + limit
    return items[start:end]

@router.post(
    "/",
    response_model=TodoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Todo 생성",
)
def create_todo(payload: TodoCreate) -> TodoRead:
    """
    새 Todo 생성.
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
    ID로 특정 Todo 조회.
    """
    for todo in _fake_db:
        if todo.id == todo_id:
            return todo

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Todo {todo_id} not found",
    )

@router.put(
    "/{todo_id}",
    response_model=TodoRead,
    summary="Todo 수정 (부분 업데이트 허용)",
)
def update_todo(todo_id: int, payload: TodoUpdate) -> TodoRead:
    """
    ID로 특정 Todo 수정.
    - 전달된 필드만 부분 업데이트 (PATCH 느낌의 PUT)
    """
    for idx, todo in enumerate(_fake_db):
        if todo.id == todo_id:
            # 기존 데이터를 dict로 꺼내고
            data = todo.model_dump()
            # 들어온 값 중 설정된 것만 추출
            update_data = payload.model_dump(exclude_unset=True)
            # 덮어쓰기
            data.update(update_data)

            updated = TodoRead(**data)
            _fake_db[idx] = updated
            return updated

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Todo {todo_id} not found",
    )

@router.delete(
    "/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Todo 삭제",
)
def delete_todo(todo_id: int) -> None:
    """
    ID로 특정 Todo 삭제.
    """
    for idx, todo in enumerate(_fake_db):
        if todo.id == todo_id:
            _fake_db.pop(idx)
            return

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Todo {todo_id} not found",
    )
```

> ✅ 이 파일도 기존 [todos.py](http://todos.py) 전체를 그대로 교체하면 됩니다.
> 
> (1챕터에서 만들었던 `list`, `create`, `retrieve`를 확장 + `update`, `delete` + 필터/정렬/페이지네이션 추가된 버전)

---

### 3️⃣ 바로 테스트 체크리스트

코드 교체 후, 루트에서 다시 서버 실행:
```bash
uvicorn app.main:app --reload
```

Swagger에서(`/docs`) 다음 순서로 테스트해 보면 됩니다:

1. `POST /todos/` 여러 개 생성 (status, priority, due_date 다르게)
    
2. `GET /todos/`
    - `status=todo`, `priority=3`, `order_by=priority`, `order_dir=asc`, `limit=5`, `offset=0` 등 조합해 보기
3. `PUT /todos/{todo_id}` 로 제목/상태/우선순위 변경
    
4. `DELETE /todos/{todo_id}` 로 삭제 후
    `GET /todos/{todo_id}` 요청 시 404 나오는지 확인