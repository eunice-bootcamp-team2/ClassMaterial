### 바디란?
	Body(바디)는 HTTP 요청(Request)에서 실제 데이터가 들어 있는 부분을 말합니다.
	쉽게 말하면 클라이언트가 서버에게 보내는 내용물입니다.

예를 들어 사용자가 웹사이트에서 상품 등록 버튼을 누르면, 브라우저는 상품 정보를 서버로 보내게 됩니다. 이때 보내는 데이터가 바로 Body입니다.

### HTTP 요청 구조

웹에서 서버로 요청을 보내면 보통 아래와 같은 구조로 전달됩니다.
```
[요청 라인]     → 예: GET /items/1 HTTP/1.1           → 어떤 주소로 요청하는지
[헤더(header)]  → 예: Content-Type: application/json  → 어떤 형식의 데이터인지
[바디(body)]    → 예: {"name": "pen", "price": 3.0}   → 실제 데이터
```

예시를 보겠습니다.
```http
POST /items/ HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "name": "pen",
  "price": 3.0
}
```

|구성|설명|
|---|---|
|POST /items/|어떤 주소로 요청하는지|
|Content-Type: application/json|JSON 데이터라는 것을 서버에 알려줌|
|Body|실제로 보내는 데이터|
즉 여기에서
```json
{
  "name": "pen",
  "price": 3.0
}
```
이 부분이 Body입니다.

---
### FastAPI에서의 바디는?
FastAPI에서는 Pydantic 모델을 이용하여 Body 데이터를 받습니다.

예제를 보겠습니다.
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

```
item: Item
```
이 의미는 클라이언트가 Body로 보낸 JSON 데이터를 
`Item` 모델 형태로 받아오겠다는 뜻입니다.

예를 들어 클라이언트가 다음 데이터를 보내면
```json
{
  "name": "pen",
  "price": 3.0
}
```
FastAPI는 자동으로 이것을 Item 객체로 변환합니다.
그리고 데이터 형식이 맞는지도 자동으로 검사합니다.

예를 들어
- name이 문자열인지
- price가 숫자인지 이것을 자동으로 검사합니다.

### DRF vs FastAPI 비교
|역할|DRF|FastAPI|
|---|---|---|
|요청 Body 데이터|request.data|자동 파싱|
|데이터 검증|Serializer|Pydantic|
|JSON → 객체 변환|Serializer|Pydantic|
|모델 저장|serializer.save()|직접 ORM 사용|
```
DRF request.data
DRF serializer
DRF view

↓

FastAPI body
FastAPI pydantic
FastAPI router
```

---
### 여러 개의 Body 데이터를 한 번에 처리하기

FastAPI에서는 여러 개의 Body 데이터를 동시에 받을 수도 있습니다.

예를 들어
- 상품 정보
- 사용자 정보
- 중요도 값
    
같이 여러 종류의 데이터를 동시에 서버로 보낼 수 있습니다.

아래 예제를 보겠습니다.
```python
from typing import Annotated
from fastapi import FastAPI, Body
from pydantic import BaseModel

# FastAPI 앱 생성
app = FastAPI()


# 상품 정보 스키마 (serializer 같은 검증)
# 요청 body 데이터를 검증하고 Python 객체로 변환
# -----------------------------
class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None


# -----------------------------  
# 사용자 정보 스키마 (serializer 같은 검증) 
# 요청 body 데이터를 검증하고 Python 객체로 변환
# -----------------------------
class User(BaseModel):
    username: str
    full_name: str | None = None


# -----------------------------  
# PUT 요청 처리  (urls.py + views.py 같은 역할)
# /items/3 같은 주소로 요청 가능  
#  
# item_id -> URL 경로값(Path Parameter)  
# item -> 요청 body 안의 상품 정보  
# user -> 요청 body 안의 사용자 정보  
# importance -> 요청 body 안의 추가 정수값
# Python 객체를 JSON으로 직렬화하여 응답  
# -----------------------------
@app.put("/items/{item_id}")
async def update_item(
    item_id: int,             # URL에서 받는 값
    item: Item,               # body의 item 데이터 검증 + Python 객체 변환 (역직렬화)
    user: User,               # body의 user 데이터 검증 + Python 객체 변환 (역직렬화)
    importance: Annotated[int, Body()] # body의 importance 값 검증 + Python 객체 변환
):
	# Python 객체를 JSON으로 직렬화하여 응답
    results = {
        "item_id": item_id,
        "item": item,
        "user": user,
        "importance": importance
    }
    
	# 검증된 데이터를 그대로 응답
    return results
```

1️⃣ 위쪽 (`Item`, `User`) → 검증 + 변환
```python
item: Item  
user: User
```
클라이언트가 이런 요청을 보내면
```json
{
  "item": {
    "name": "Laptop",
    "price": 1000
  },
  "user": {
    "username": "eunice"
  },
  "importance": 5
}
```
FastAPI는 내부적으로 이렇게 합니다.
```
JSON 요청
↓
Pydantic(BaseModel)
↓
데이터 검증
↓
Python 객체 생성
```
즉
```python
item = Item(name="Laptop", price=1000)
user = User(username="eunice")
```
이 상태가 됩니다.

이걸 역직렬화 (deserialization) 라고 합니다.

2️⃣ 아래쪽 `return results` → 직렬화
```python
return results
```

FastAPI가 하는 일은
```json
Python 객체
↓
JSON 변환
↓
응답 반환

results = {
    "item_id": 3,
    "item": Item(...),
    "user": User(...),
}
```
↓
자동 변환
```json
{
  "item_id": 3,
  "item": {
    "name": "Laptop",
    "price": 1000
  },
  "user": {
    "username": "eunice"
  }
}
```
이것을 직렬화 (serialization) 라고 합니다.

그래서 전체 흐름을 보면
```
Client JSON 요청
↓
Pydantic 검증
↓
Python 객체 생성
↓
view 함수 실행
↓
Python 객체 반환
↓
FastAPI가 JSON으로 변환
↓
Client 응답
```

|과정|DRF|FastAPI|
|---|---|---|
|요청 JSON → 객체|Serializer|Pydantic|
|객체 → JSON 응답|Serializer|FastAPI 자동|

코드설명:
```python
Annotated[int, Body()]
```
의미는
```
importance는 int 타입이고  
값은 request body에서 가져와라
```
FastAPI에서 **Body**는 클라이언트가 보내는 요청 데이터입니다. 즉 외부에서 들어오는 json이라고 생각하면 됩니다.

DRF에서는 body데이터를 `request.data` 이렇게 보면 됩니다.

### 정리하면 데이터의 위치
|위치|예|FastAPI|
|---|---|---|
|Path|`/items/3`|`item_id: int`|
|Query|`?page=2`|`page: int`|
|Body|`{ "name": "Laptop" }`|`item: Item`|
✔ Body = 요청 JSON 데이터 (request.data)  
✔ Query = URL 뒤에 붙는 데이터  
✔ Path = URL 경로에 있는 데이터

---
### 실제 요청 예시
클라이언트가 서버로 보내는 JSON 데이터는 다음과 같이 생길 수 있습니다.
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
이 요청의 의미는 다음과 같습니다.

|데이터|설명|
|---|---|
|item|상품 정보|
|user|사용자 정보|
|importance|중요도 값|
즉 한 번의 요청으로 여러 종류의 데이터를 동시에 서버로 보내는 구조입니다.

---
### importance 값은 왜 사용할까요?
`importance` 값은 비즈니스 로직에서 다양한 방식으로 활용할 수 있습니다.

예를 들면 다음과 같은 경우입니다.
- 중요도가 높은 작업을 우선 처리
- 중요도가 높은 작업에 알림 전송
- 중요도 순으로 데이터 정렬
    
예시 코드입니다.
```python
if importance >= 5:
    send_slack_alert("긴급한 작업이 등록되었습니다!")
```
이 코드는 중요도가 높은 작업이 등록되면 알림을 보내는 예시입니다.

---
### 할 일(Task) 등록
이번에는 할 일(ToDo)을 등록하는 API 예제를 보겠습니다.
```python
from typing import Annotated
from fastapi import FastAPI, Body
from pydantic import BaseModel

app = FastAPI()

class Task(BaseModel):
    title: str
    description: str


@app.post("/tasks/")
async def create_task(
    task: Task,
    importance: Annotated[int, Body()]
):

    return {
        "task_title": task.title,
        "importance_level": importance,
        "message": f"'{task.title}' 작업이 중요도 {importance}로 등록되었습니다."
    }
```
이 API는
- 할 일 정보 
- 중요도 를 함께 받아서 처리하는 API입니다.
---
### 클라이언트가 요청
클라이언트는 다음과 같은 JSON 데이터를 보낼 수 있습니다.
```python
{
  "task": {
    "title": "회의 준비",
    "description": "내일 클라이언트 회의 자료 준비"
  },
  "importance": 5
}
```
이 상황을 실제 사용 예로 생각해보겠습니다.

사용자가 웹사이트에서
- 제목 : 회의 준비
- 설명 : 회의 자료 준비
- 중요도 : 5
	
를 입력하고 등록 버튼을 눌렀다고 가정해 보겠습니다.

그러면 브라우저의 JavaScript 코드가 이 데이터를 JSON 형태로 만들어 FastAPI 서버로 전송합니다.

---
### 서버에서 처리되는 과정

서버에서는 다음과 같은 과정이 진행됩니다.

1️⃣ FastAPI가 요청을 받습니다.
2️⃣ Pydantic이 데이터 형식을 검사합니다.
- title이 문자열인지
- description이 문자열인지
- importance가 숫자인지
    
3️⃣ 데이터에 문제가 없으면 서버에서 처리합니다.

예를 들어
- 데이터 저장
- 응답 생성
- 알림 전송
    
같은 작업을 할 수 있습니다.

### Swagger에서 테스트하기

FastAPI는 Swagger 문서를 통해 쉽게 API 테스트를 할 수 있습니다.

먼저 서버를 실행합니다.
```bash
uvicorn body:app --reload
```

그리고 브라우저에서 다음 주소를 열어 주세요.
```bash
http://127.0.0.1:8000/docs
```

Swagger 화면에서
```bash
PUT /items/{item_id}
```

API를 선택합니다.

그리고
- item_id 입력
- JSON Body 입력
    
후 Execute 버튼을 누르면 결과를 확인할 수 있습니다.

### 실행 결과
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

이 응답은
- 요청에서 받은 데이터
- 서버에서 처리한 결과
    
를 다시 클라이언트에게 반환한 것입니다.




