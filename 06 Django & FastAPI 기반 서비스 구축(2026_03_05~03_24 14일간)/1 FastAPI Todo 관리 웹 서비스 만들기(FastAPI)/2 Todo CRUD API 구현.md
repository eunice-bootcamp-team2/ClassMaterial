- 할 일 전체 조회
- 할 일 1개 조회
- 할 일 등록
- 할 일 수정
- 할 일 삭제
등 CRUD(Create, Read, Update, Delete)를 작성합니다.

### 1️⃣ 요청/응답 구조 정의 (Pydantic)

`app/models/item.py` : 이 파일은 DB 모델이 아니라 데이터 스키마 파일입니다
```python
from pydantic import BaseModel
from typing import Optional


# 할 일 생성할 때 사용하는 데이터 형식
class TodoCreate(BaseModel):  # 요청 데이터 검증 (POST)
    title: str
    done: bool = False


# 할 일 수정할 때 사용하는 데이터 형식
class TodoUpdate(BaseModel):  # 수정 데이터 검증 (PUT/PATCH)
    title: Optional[str] = None
    done: Optional[bool] = None


# 실제 저장/응답에 사용하는 데이터 형식
class Todo(BaseModel):  # 응답 데이터 형식 정의 (JSON 직렬화) JSON으로 변환하는 것을 의미
    id: int
    title: str
    done: bool = False
```

`Optional[str]` 의미: str 또는 None이 올 수 있다. 즉 둘 다 허용합니다.
```python
title = "공부" # 가능  
title = None # 가능
```

해석: 서버가 응답으로 보낼 JSON 데이터 구조를 정의합니다.
```python
class Todo(BaseModel):
    id: int
    title: str
    done: bool = False
```

결과: Python 객체를 아래와 같은 JSON으로 직렬화하여 응답합니다.
```json
{
  "id": 1,
  "title": "공부합시다",
  "done": false
}
```

|클래스|역할|HTTP|
|---|---|---|
|`TodoCreate`|할 일 생성 요청 데이터|POST|
|`TodoUpdate`|할 일 수정 요청 데이터|PUT / PATCH|
|`Todo`|DB에서 가져온 데이터 응답|GET|
흐름
```
POST /todos  
   ↓  
TodoCreate (요청 데이터 검증)  
   ↓  
DB 저장  
   ↓  
Todo (응답 반환)
```

```
PUT /todos/1  
   ↓  
TodoUpdate (수정 데이터 검증)  
   ↓  
DB 수정  
   ↓  
Todo (응답 반환)
```

DRF와 비유하면 위의 파일은 `serializer.py` 같은 데이터 스키마 파일입니다.

클래스가 3개인 이유
→ POST 요청 데이터 검증
```python
class TodoCreate(BaseModel)
```

→ PUT/PATCH 수정 데이터 검증
```python
class TodoUpdate(BaseModel)
```

→ 응답 데이터 형식
```python
class Todo(BaseModel)
```
---
### 2️⃣ 라우터 + 처리 로직 작성
```
@router.get("/todos")
@router.post("/todos")
@router.put("/todos/{id}")
@router.delete("/todos/{id}")
```
아래 코드가 하는일
```
URL 정의  
CRUD 로직 처리
```
장고와 비교하면 urls.py + views.py역할입니다.

`app/routes/item.py`
```python
from fastapi import APIRouter, HTTPException
from app.models.item import Todo, TodoCreate, TodoUpdate

router = APIRouter()

# 임시 저장소(DB 대신 사용)
todos = []
next_id = 1


# 전체 조회
@router.get("/todos", response_model=list[Todo])
def get_todos():
    return todos


# 상세 조회
@router.get("/todos/{todo_id}", response_model=Todo)
def get_todo(todo_id: int):
    for todo in todos:
        if todo.id == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="해당 할 일이 없습니다.")


# 생성
@router.post("/todos", response_model=Todo)
def create_todo(todo_data: TodoCreate):
    global next_id

    new_todo = Todo(
        id=next_id,
        title=todo_data.title,
        done=todo_data.done
    )

    todos.append(new_todo)
    next_id += 1
    return new_todo


# 수정
@router.put("/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo_data: TodoUpdate):
    for index, todo in enumerate(todos):
        if todo.id == todo_id:
            updated_todo = todo.model_copy(
                update=todo_data.model_dump(exclude_unset=True)
            )
            todos[index] = updated_todo
            return updated_todo

    raise HTTPException(status_code=404, detail="수정할 할 일이 없습니다.")


# 삭제
@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    for index, todo in enumerate(todos):
        if todo.id == todo_id:
            deleted_todo = todos.pop(index)
            return {"message": "삭제 완료", "deleted": deleted_todo}

    raise HTTPException(status_code=404, detail="삭제할 할 일이 없습니다.")
```
---
### 3️⃣ main.py 에 라우터 등록
```python
app = FastAPI()

app.include_router(todo_router)
```
여기 역할
```
FastAPI 앱 생성  
라우터 연결
```
장고와 비교하면 project의 `urls.py`와 같은 역할입니다.

`app/main.py`
```python
from fastapi import FastAPI
from app.routes.item import router as item_router

app = FastAPI()

# 라우터 등록
app.include_router(item_router)

@app.get("/")
def home():
    return {"message": "FastAPI Todo API 실행 중"}
```

프로젝트 루트(`fastapi_todo`)에서 실행하세요.
```bash
uvicorn app.main:app --reload
```
- 메인: `http://127.0.0.1:8000/`
- Swagger 문서: `http://127.0.0.1:8000/docs`
