바디란?
	HTTP 요청(Request)에서 "내용물"에 해당하는 부분입니다.
	즉, 클라이언트가 서버에 데이터를 보내는 실제 내용(payload)을 말합니다.

웹 요청 구조 이해
HTTP 요청은 보통 아래처럼 구성돼요:
```
[요청 라인]     → 예: GET /items/1 HTTP/1.1  
[헤더(header)]  → 예: Content-Type: application/json  
[바디(body)]    → 예: {"name": "pen", "price": 3.0}
```

예시
```http
POST /items/ HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "name": "pen",
  "price": 3.0
}
```
- URL: `/items/`
- Method: `POST`
- Header: JSON이라고 명시
- Body: `{ "name": "pen", "price": 3.0 }` ← 여기!

FastAPI에서의 바디는?
FastAPI에서는 `body` 데이터를 `Pydantic 모델`을 통해 받아요.
```python
from pydantic import BaseModel
from fastapi import FastAPI

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

@app.post("/items/")
async def create_item(item: Item): # 👈 이 item은 body에서 오는 것!
    return item
```
클라이언트가 JSON 형식으로 보낸 데이터를 FastAPI가 `item: Item`을 통해 자동으로 받아주는 구조입니다.

여러 개의 Body 데이터를 한 번에 처리하기
```python
# body.py

# 추가적인 설명(제약, 메타데이터 등)을 붙이기 위한 기능
from typing import Annotated 

# FastAPI 애플리케이션을 만들기 위한 메인 클래스로 반드시 있어야 FastAPI 서버를 만들 수 있어요 app = FastAPI()
from fastapi import FastAPI, Body

# Pydantic은 FastAPI에서 데이터를 검증하는 핵심 도구
from pydantic import BaseModel

app = FastAPI()

# 1. Pydantic 모델 정의
class Item(BaseModel): # 데이터 검증
    name: str
    description: str | None = None
    price: float
    tax: float | None = None
# 클라이언트가 보낸 데이터에는 반드시 name(문자열)과 price(숫자)가 있어야 해! 라는 걸 뜻해요.  
# → 이걸 보고 FastAPI는 자동으로 유효성 검사를 해줘요.

class User(BaseModel): # 데이터 검증
    username: str
    full_name: str | None = None

# 2. PUT 메서드: item_id는 URL 경로에서, 나머지는 body에서 받음
@app.put("/items/{item_id}")
async def update_item(
    item_id: int,
    item: Item,
    user: User,
    importance: Annotated[int, Body()]
):
    results = {
        "item_id": item_id,
        "item": item,
        "user": user,
        "importance": importance
    }
    return results
```
`importance: Annotated[int, Body()]`
- 함수 인자(parameter) 정의
즉, 클라이언트가 요청할 때 JSON body에 아래처럼 데이터를 보낼 수 있다는 뜻이에요:
```python
{
  "importance": 5
}
```
여기서 `importance`는 클라이언트가 요청 바디에서 추가로 전달하는 "중요도" 값이에요.  쉽게 말하면, 이 아이템이 얼마나 중요한지를 나타내는 정수 값이에요.

실제 요청 예시
```json
{
  "item": {
    "name": "책상",
    "price": 100.0
  },
  "user": {
    "username": "eunice",
    "email": "eunice@example.com"
  },
  "importance": 5
}
```

`importance`는 왜 별도로 받나요?
FastAPI에서 `"importance": 5` 같은 값을 요청 본문(body) 으로 받는 경우, 이 숫자 `5`는 클라이언트가 보낸 어떤 중요도(중요성)의 수치로서 비즈니스 로직에서 다양하게 활용될 수 있습니다.

importance 활용 예시
```python
from typing import Annotated
from fastapi import FastAPI, Body
from pydantic import BaseModel

app = FastAPI()

class Task(BaseModel): # 할일형태 정의
    title: str
    description: str

@app.post("/tasks/")
async def create_task(
    task: Task,
    importance: Annotated[int, Body()]
): # task: Pydantic 모델 Task 형식의 본문 데이터를 받음
   # importance: 별도로 바디에서 정수형 중요도를 받음
   
    return {
        "task_title": task.title,
        "importance_level": importance,
        "message": f"'{task.title}' 작업이 중요도 {importance}로 등록되었습니다."
    }
#사용자가 보낸 데이터를 바탕으로  
#작업 제목, 중요도, 그리고 메시지를 만들어 JSON 응답으로 반환합니다.
```
이 코드는 사용자가 할 일(Task) 을 등록할 수 있는 API입니다.  
할 일 정보와 함께 중요도(importance) 숫자도 같이 보내면, 서버가 그것을 받아서 응답으로 다시 돌려주는 구조예요.

이 코드는 사용자가 `"title"`과 `"description"`으로 구성된 할 일과, `"importance"`라는 중요도를 함께 보내면, 서버가 이 정보를 받아서 다시 응답해주는 할 일 등록 API입니다.

---
클라이언트가 요청 보낼 때:
```python
{
  "task": {
    "title": "회의 준비",
    "description": "내일 클라이언트 회의 자료 준비"
  },
  "importance": 5
}
```

우리가 만든 할 일(ToDo) 앱에서 사용자가 "회의 준비"라는 작업을 등록하는 버튼을 누릅니다.

이 때 실제 일어나는 일:
- 사용자(클라이언트)가 앱이나 웹사이트에서
	- `제목: 회의 준비`
	- `설명: 내일 회의자료 만들기`
	- `중요도: 5`  
    입력하고,` [등록]` 버튼을 누릅니다.

브라우저나 앱의 JavaScript 코드가 작동해서 위와 같은 JSON을 FastAPI 서버에 보냅니다

FastAPI 서버는 이 JSON 요청을 받고:
- Pydantic이 `title`, `description`, `importance` 값이 올바른지 검사하고
- 이상 없으면 서버에서 데이터 저장하거나 처리해서
- `"작업이 중요도 5로 등록되었습니다"` 같은 응답을 보냅니다.

---
백엔드에서 활용 예시
- `importance == 5` 이면 "긴급 처리 항목"으로 처리
- `importance >= 3` 이면 알림 메시지를 전송
- `importance` 순으로 정렬해서 작업 리스트 보여주기
```python
if importance >= 5:
    send_slack_alert("긴급한 작업이 등록되었습니다!")
```

---
스웨거에서 테스트하기
FastAPI 서버 실행:
```bash
uvicorn body:app --reload
```
브라우저에서 열기:
```bash
http://127.0.0.1:8000/docs
```
`PUT /items/{item_id}` 클릭
- `item_id` → 숫자 입력 (예: `1`)
- 아래 JSON body에 위 JSON처럼 입력
- `Execute` 누르면 결과 출력

실행 결과 예시
```json
{
  "item_id": 1,
  "item": {
    "name": "iPad",
    "description": "Apple tablet",
    "price": 800.0,
    "tax": 50.0
  },
  "user": {
    "username": "eunice",
    "full_name": "Eunice Lee"
  },
  "importance": 5
}
```

