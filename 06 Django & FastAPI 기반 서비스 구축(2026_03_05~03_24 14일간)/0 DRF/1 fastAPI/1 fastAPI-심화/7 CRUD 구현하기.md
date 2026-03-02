FastAPI는 모델 정의, CRUD API, 쿠키/헤더 처리까지 하나의 Python 파일에서 빠르게 개발할 수 있도록 설계된 현대적인 웹 프레임워크입니다. 그러나 실무에서는 절대 하나의 `.py` 파일에 모두 담지 않습니다.

실무에서 파일을 분리하는 이유는?
- 유지보수 : 기능별로 나눠야 나중에 수정할 때 편합니다.
- 협업 : 여러 개발자가 동시에 작업할 때 충돌을 줄일 수 있습니다.
- 테스트 : 각 모듈을 독립적으로 테스트할 수 있어 좋습니다.
- 재사용 : 모델, 유틸, 라우터 등을 다른 프로젝트에서도 쉽게 가져다 쓸 수 있습니다.

실무에서는 보통 이렇게 구성해요
```
app/
├── main.py              ← 애플리케이션 실행만 담당
├── models/              ← Pydantic 모델 또는 DB 모델
│   └── item.py
├── routes/              ← 각 API 엔드포인트 분리
│   └── item.py
├── services/            ← 비즈니스 로직
│   └── item_service.py
├── database/            ← DB 설정
│   └── connection.py
├── utils/               ← 공통 함수, 유틸
│   └── helpers.py
```

CRUD 구현실습을 Django와 비교 이해하며 실습하기:

FastAPI (Pydantic 모델)
```python
# FastAPI 데이터 모델정의
class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None
```
이 코드는 클라이언트(프론트엔드)가 FastAPI 서버에 JSON 데이터를 보낼 때, 그 데이터 구조와 유효성 검사 기준을 정의하는 것입니다.

`class Item(BaseModel):` 
- `BaseModel`은 **Pydantic**이라는 라이브러리에서 가져옵니다.
- FastAPI는 내부적으로 Pydantic을 이용해 요청값을 자동 파싱하고 유효성 검사합니다.

`name: str :`
- `name` 필드는 반드시 문자열이어야 하며, 없으면 에러(422)가 납니다.

`description: str | None = None :`
- `description`은 문자열이거나 없어도 되는 선택적인 값입니다.
- `str | None = None` → `Optional[str] = None`과 같은 뜻입니다.
- `Optional[str]`는 "이 값은 `str`일 수도 있고, `None`일 수도 있다"는 뜻입니다.

` price: float :`
- `price`는 반드시 숫자 (소수 가능) 여야 합니다.

`tax: float | None = None :`
- `tax`도 없어도 되는 선택적인 숫자입니다.

위의 Fast API의 모델정의를 우리는 장고에서 아래와 같이 표현했습니다. 비교하여 이해에 도움이 되세요.
모델 정의 (models.py)
```python
# Django에서는 보통 DB 모델로 정의
from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    price = models.FloatField()
    tax = models.FloatField(null=True, blank=True)
```

시리얼라이저 (serializers.py) – FastAPI에서는 `BaseModel`이 이 역할
```python
from rest_framework import serializers
from .models import Item

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = "__all__"
```

즉, Fast API는 DRF의 역할을 대신하고 있습니다.

---
FastAPI Create 
```python
@app.post("/items/")
async def create_item(item: Item):
    fake_items_db.append(item)
    return item
```

`@app.post("/items/")`
- 라우터 데코레이터입니다.
- 이 함수는 `POST` 방식으로 `/items/`라는 주소로 요청이 들어올 때 실행됩니다.
- FastAPI에서는 이 데코레이터가 URL과 HTTP 메서드(Post, Get 등)를 함께 정의합니다.
위의 라우터 데코레이터는 Django REST Framework로 치면:
`class ItemListCreateView(generics.CreateAPIView):` 처럼 어떤 주소에 어떤 메서드를 처리할지를 지정하는 부분과 유사합니다.

`async def create_item(item: Item): ` 
- 비동기 함수 정의입니다.
- `async`는 이 함수가 비동기로 실행될 수 있다는 것을 의미합니다.    
- `item: Item`은 클라이언트가 보내는 JSON 데이터가 `Item`이라는 데이터 모델(Pydantic 기반)을 따르도록 요구합니다.
    - FastAPI는 자동으로 요청 데이터를 `Item` 객체로 변환하고 검증합니다.
Django REST Framework에서는 
`serializer = ItemSerializer(data=request.data)` 처럼 수동으로 시리얼라이저를 만들고 검증하는 것과 유사합니다.

`fake_items_db.append(item)`
- `item`을 임시 리스트(fake DB)에 저장합니다.
- `fake_items_db`는 학습용 또는 프로토타입 실습용으로 사용하는 임시 메모리 저장소입니다.
- 빠른 테스트 용도이며 실제 데이터베이스 연결 없이, FastAPI 동작을 빠르게 실습할 수 있음

`return item`
- 방금 저장된 데이터를 그대로 JSON 형태로 응답으로 돌려줍니다.
- FastAPI는 자동으로 `item`을 JSON으로 직렬화해서 클라이언트에게 응답해줍니다.
Django REST Framework에서는 `return Response(serializer.data)` 같은 역할입니다.

위의 코드를 DRF와 비교해보세요.
Django Generic View  Create
```python
from rest_framework import generics
from .models import Item
from .serializers import ItemSerializer

class ItemListCreateView(generics.CreateAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
```
---
FastAPI List (Read All)
```python
@app.get("/items/")
async def read_item_list(skip: int = 0, limit: int = 10):
    return fake_items_db[skip : skip + limit]
```
 `@app.get("/items/")`
- 이 줄은 라우터 설정입니다.
- `/items/`라는 주소(URL)에 대해 HTTP GET 요청이 오면,
- 아래 정의된 `read_item_list()` 함수를 실행하도록 FastAPI에 등록합니다.
- 즉, 클라이언트가 `GET http://localhost:8000/items/` 요청을 보내면 이 함수가 실행됩니다.

`async def read_item_list(skip: int = 0, limit: int = 10):`
- 비동기 함수(async): FastAPI는 비동기를 기본 지원하여, 성능이 좋고 응답이 빠릅니다.
- `skip`과 `limit`은 쿼리 파라미터입니다:
    - `skip`: 몇 개를 건너뛸지 (기본값 0)
    - `limit`: 최대 몇 개를 가져올지 (기본값 10)
- 예시: `/items/?skip=5&limit=3`이면 6번째부터 3개 가져옵니다.

만약에 FastAPI에서 `.objects.all()`처럼 전체를 가져오고 싶다면?
```python
@app.get("/items/")
async def read_item_list():
    return fake_items_db # 전체 반환
```

`return fake_items_db[skip : skip + limit]`
- `fake_items_db`는 가상의 리스트 기반 데이터베이스입니다.
- 리스트에서 슬라이싱하여 일부 항목만 반환합니다.
    - `fake_items_db[0:10]` → 처음부터 10개 반환

위의 코드를 DRF와 비교해보세요.
DRF ListAPIView
```python
class ItemListView(generics.ListAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
```
---
FastAPI Read One (Detail)
```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return fake_items_db[item_id-1]
```

`@app.get("/items/{item_id}")`
- URL 경로에 변수 `item_id`를 받습니다.
    - 예: `/items/3` → `item_id`는 3으로 인식됩니다.
- 이건 Django의 `path('items/<int:item_id>/')`와 비슷한 역할이에요.

`async def read_item(item_id: int):`
- 비동기 함수로 정의된 엔드포인트 함수입니다.
- `item_id`라는 이름의 경로 변수(path parameter) 를 받습니다.
    - `item_id: int`는 정수형이라고 명시해서 FastAPI가 자동 검증해줍니다.
    - 만약 문자열이 들어오면 FastAPI가 자동으로 422 에러를 발생시켜줘요.
- 함수 이름 `read_item`은 개발자 자유지만, 보통 기능에 맞게 짓습니다.

`return fake_items_db[item_id - 1]`
- 가상의 리스트(`fake_items_db`)에서 `item_id`에 해당하는 데이터를 꺼내 반환합니다.
- `item_id - 1`을 하는 이유:
    - 파이썬의 리스트는 0부터 시작하니까!
    - 예: 사용자가 `/items/1`을 요청하면 → `fake_items_db[0]`을 반환해야 함.
- 리스트 인덱스를 0부터 시작하기 때문에 `-1` 보정

위의 코드를 DRF와 비교해보세요.
DRF RetrieveAPIView
```python
class ItemDetailView(generics.RetrieveAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
```
---
FastAPI Update
```python
@app.put("/items/{item_id}")
async def update_item(item_id: int, item: Item):
    fake_items_db[item_id-1] = item
    return fake_items_db[item_id-1]
```

`async def update_item(item_id: int):`
- 매개변수 설명:
    - `item_id: int` → URL에서 받은 항목의 고유 번호 (정수형)
    - `item: Item` → 요청 본문(body)에서 전달받은 JSON 데이터를 `Item`이라는 Pydantic 모델로 자동 변환
이 부분은 Django에서 `serializer.is_valid()` + `serializer.save()` 같은 역할을 FastAPI가 자동으로 해주는 부분이에요.

`fake_items_db[item_id - 1] = item`
- 기존의 리스트 `fake_items_db`에서 특정 인덱스의 데이터를 새로운 데이터로 덮어쓰기 합니다.
- `item_id - 1`을 하는 이유:
    - 파이썬 리스트 인덱스는 0부터 시작하므로 보정 필요
    - 예: `/items/1` → 리스트의 `0번째` 항목을 수정

`return fake_items_db[item_id - 1]`
- 수정한 데이터를 다시 클라이언트에게 응답으로 반환합니다.
- 수정이 성공했는지 확인용이기도 하고, 프론트엔드에서 화면 갱신에 사용될 수 있습니다.


위의 코드를 DRF와 비교해보세요.
DRF UpdateAPIView
```python
class ItemUpdateView(generics.UpdateAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
```
---
FastAPI Delete 
```python
@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    fake_items_db.remove(fake_items_db[item_id-1])
    return {item_id: item_id}
```

`@app.delete("/items/{item_id}")`
- 이 줄은 “이 함수는 DELETE 요청을 받을 때 실행된다”는 의미입니다.
- `"/items/{item_id}"`는 URL 경로에 있는 동적인 부분(item_id) 을 받아 처리하겠다는 뜻입니다.
    - 예: `/items/3`으로 요청하면 `item_id`는 `3`이 됩니다.

이건 Django REST Framework에서 `DestroyAPIView`가 하는 역할과 비슷합니다.

`async def delete_item(item_id: int):`
- 비동기 함수입니다 (`async def`는 FastAPI에서 자주 쓰임).
- 파라미터 `item_id: int`는 위에서 URL로 받은 `item_id`를 정수형으로 받아오는 것입니다.

`fake_items_db.remove(fake_items_db[item_id - 1])`
- 리스트 `fake_items_db`에서 특정 데이터를 삭제(remove) 합니다.
- `item_id - 1`인 이유:
    - 파이썬 리스트는 0번부터 시작하므로, 1을 빼줘야 원하는 인덱스에 접근 가능
    - 예: `item_id=3`이면 `fake_items_db[2]`를 제거함
예제에서는 리스트를 DB처럼 사용하기 때문에 `.remove(...)`를 사용하고 있어요. 실제 서비스에서는 데이터베이스에서 삭제하는 코드가 들어갑니다.

 `return {item_id: item_id}`
- 삭제 후에 어떤 항목이 삭제되었는지를 클라이언트에게 알려주는 응답입니다.
- 예: `{3: 3}` 형태로 반환됩니다.
- 실무에서는 보통 `{ "status": "deleted", "id": 3 }`처럼 반환하기도 합니다.

위의 코드를 DRF와 비교해보세요.
DRF DeleteAPIView
```python
class ItemDeleteView(generics.DestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
```

스웨거와 임솜니아를 이용하여 CRUD 테스트를 해봅니다.

Swagger UI 접속 주소
```
http://127.0.0.1:8000/docs
```

![[Pasted image 20250713194807.png]]
하단에 있는 **422 Validation Error 섹션**은 실제 에러가 발생했다는 뜻이 아니라, “이런 경우에 이런 에러가 발생할 수 있습니다” 라는 사전 안내입니다.

즉 에러가 나면 이런 구조로 응답을 줄꺼예요 라는 뜻입니다
```json
{
  "detail": [
    {
      "loc": [
        "string",
        0
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```
이 구조는 실제 값이 아니라, 형식을 설명하는 템플릿입니다.
`loc` : 어디(location)에서 문제가 발생했는지를 나타냅니다. 예: `["body", "price"]`, `["query", "limit"]`

`msg` : 무엇이 잘못되었는지 메시지입니다. 예: `"field required"` or `"value is not a valid integer"`

`type` : 오류의 타입을 나타냅니다. 예: `"value_error"` or `"type_error.integer"`

전달되는 오류 예시: price값이 float이 아닌 문자열인 경우
```json
{
  "detail": [
    {
      "loc": ["body", "price"],
      "msg": "value is not a valid float",
      "type": "type_error.float"
    }
  ]
}
```

---
###### Insomnia 테스트용 요청 정리
| 기능        | 메서드      | URL                             | 설명                         |
| --------- | -------- | ------------------------------- | -------------------------- |
| 아이템 생성    | `POST`   | `http://127.0.0.1:8000/items/`  | JSON body로 아이템 생성          |
| 전체 아이템 조회 | `GET`    | `http://127.0.0.1:8000/items/`  | 전체 목록 (쿼리로 skip, limit 조절) |
| 개별 아이템 조회 | `GET`    | `http://127.0.0.1:8000/items/1` | ID=1인 아이템 조회               |
| 아이템 수정    | `PUT`    | `http://127.0.0.1:8000/items/1` | ID=1인 아이템을 수정              |
| 아이템 삭제    | `DELETE` | `http://127.0.0.1:8000/items/1` | ID=1인 아이템 삭제               |
