이 파트는 검색 / 페이지 나누기 / 필터링을 하기 위한 방법을 배우는 것입니다. 
쿼리 파라미터란 URL 뒤에 데이터를 붙여서 서버에게 조건을 전달하는 방법입니다.
웹 서비스를 만들 때 검색이나 목록 조회에서 많이 사용합니다.

DRF에서는 함수형태로 사용합니다.
```python
def get(self, request):
    page = request.query_params.get("page")
```
그리고 `request.query_params`로 값을 꺼냅니다.

FastAPI는 더 단순합니다.
```python
@app.get("/restaurants/")
def read_restaurants(skip: int = 0, limit: int = 10):
    return fake_restaurant_db[skip : skip + limit]
```
요청
```
/restaurants/?skip=0&limit=2
```
그러면 FastAPI가 자동으로 
```
skip = 0  
limit = 2
```
로 변환합니다.

---
이 코드는 전체 데이터를 다 주는 것이 아니라 일부만 주는 API를 만드는 연습입니다.

리스트 데이터를 부분적으로 나눠서 조회(Pagination)하는 간단한 실습 예제
```python
from fastapi import FastAPI
from datetime import time

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI from WSL!"}

# 가상의 데이터베이스 (리스트로 구성)
fake_restaurant_db = [
    {
        "name": "김밥천국",
        "branch_name": "강남점",
        "description": "24시간 운영하는 분식 전문점",
        "address": "서울 강남구 테헤란로 123",
        "feature": "저렴한 가격, 빠른 제공",
        "is_closed": False,
        "latitude": 37.501274,
        "longitude": 127.039585,
        "phone": "02-1234-5678",
        "rating": 4.2,
        "rating_count": 120,
        "start_time": time(0, 0),
        "end_time": time(23, 59),
        "last_order_time": time(23, 30),
        "category": 1,
        "tags": ["분식", "가성비", "혼밥"]
    },
    {
        "name": "한솥도시락",
        "branch_name": "역삼점",
        "description": "도시락 전문 프랜차이즈",
        "address": "서울 강남구 역삼로 45",
        "feature": "다양한 메뉴, 포장 전문",
        "is_closed": False,
        "latitude": 37.499947,
        "longitude": 127.036102,
        "phone": "02-5678-1234",
        "rating": 4.0,
        "rating_count": 98,
        "start_time": time(9, 0),
        "end_time": time(21, 0),
        "last_order_time": time(20, 45),
        "category": 2,
        "tags": ["도시락", "배달", "프랜차이즈"]
    },
    {
        "name": "돈까스하우스",
        "branch_name": "선릉점",
        "description": "수제 돈까스를 판매하는 맛집",
        "address": "서울 강남구 선릉로 77",
        "feature": "바삭한 튀김, 일본식 정식",
        "is_closed": False,
        "latitude": 37.504456,
        "longitude": 127.048123,
        "phone": "02-3333-4444",
        "rating": 4.7,
        "rating_count": 250,
        "start_time": time(11, 0),
        "end_time": time(22, 0),
        "last_order_time": time(21, 30),
        "category": 3,
        "tags": ["돈까스", "수제", "일식"]
    },
]

# GET /restaurants/?skip=0&limit=2 → 처음 2개 반환
@app.get("/restaurants/")
def read_restaurants(skip: int = 0, limit: int = 10):
    return fake_restaurant_db[skip : skip + limit]
```

주소에서 데이터 요청을 합니다: 
```bash
http://127.0.0.1:8000/restaurants/?skip=0&limit=1
```
만약 쿼리문을 생략하면 `http://127.0.0.1:8000/restaurants` 기본값이 출력됨
skip의 기본값은 0, limit의 기본값은 10입니다.

쿼리문 생략시 출력주소
```
# 실제 전송주소
http://127.0.0.1:8000/restaurants

# 데이터요청에서 인지하는 주소
http://127.0.0.1:8000/restaurants/?skip=0&limit=10
```

`/restaurants/?skip=1&limit=2` : 1번 건너뛰고 2개 보여줘
`/restaurants/?skip=1` : 1번 건너뛰고 2번째 부터 나머지는 기본값(10개) 
`/restaurants/` : skip도 생략 → 둘 다 기본값 사용

- `skip` → 몇 개 건너뛸지
- `limit` → 몇 개 가져올지

---

현재구조를 정리하면:
- `main.py` 안에 `fake_restaurant_db` 데이터가 내장되어 있음
- FastAPI가 `/restaurants/` 경로로 직접 응답을 만들어서 보내줌

데이터가 다른 서버에 있다고 가정하면?
- FastAPI는 중간 역할(API 게이트웨이)을 하게 되고
- Axios는 외부 클라이언트(프론트엔드 브라우저)가 API로 요청을 보내는 쪽이 됩니다.

예를 들어보면:
프론트엔드 axios
```js
axios.get("http://localhost:8000/restaurants", {
  params: { skip: 0, limit: 2 }
})
.then(res => console.log(res.data))
```

FastAPI
```python
@app.get("/restaurants/")
def read_restaurants(skip: int = 0, limit: int = 10):
    # 실제론 다른 서버에 있는 DB나 API에서 데이터를 가져와야 함
    external_data = call_other_server(skip, limit)
    return external_data
```

Insomnia / Swagger로 실습
FastAPI 실행
```bash
uvicorn main:app --reload
```

접속 http://127.0.0.1:8000/docs

`/restaurants/` 선택 → Try it out

`skip`, `limit` 값 입력 → Execute

결과 화면
![[Pasted image 20260305170807.png]]

브라우저 콘솔에서 확인해 보기
```console
fetch("http://127.0.0.1:8000/restaurants/?skip=1&limit=1")
.then(r => r.json())
.then(data => {
  document.body.innerHTML = JSON.stringify(data)
})
```
이렇게 하면
```
JS가 받은 데이터
↓
HTML을 바꿈
↓
화면이 변경
```
React / Vue / DRF + JS 구조도 동일합니다
```
axios
↓
FastAPI(서버1) / DRF(서버2)
↓
JSON
↓
state 업데이트
↓
화면 렌더링
```
화면을 바꾸는 것은 API가 아니라 프론트엔드입니다.

---
==`생각해보면 DRF를 사용할때 api요청을 보내게 되면`== 
`urls.py + api_views.py + serializers.py` 세개의 역할이 필요했다면
FastAPI는 이 세 가지 역할을 한 파일 또는 한 함수 안에서 처리할 수 있어요

- URL 설정에서 장고의 urls.py의 역할을  → `@app.get("/...")` 데코레이터
- api_views.py의 역할을  → 함수 자체 (바로 정의)
- 직렬화/검증의 역할인 serializers.py의 역할을  → `Pydantic` 모델 (함수 인자에서 직접 사용)

---
비교 예시코드: DRF
```python
# urls.py
path('items/', views.create_item)

# serializers.py
class ItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    price = serializers.FloatField()

# views.py
@api_view(['POST'])
def create_item(request):
    serializer = ItemSerializer(data=request.data)
    if serializer.is_valid():
        return Response(serializer.data)
```

Fast API
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel): 
    name: str
    price: float

@app.post("/items/")
def create_item(item: Item):
    return item
```
파일 하나, 함수 하나, 클래스 하나면 끝납니다.

그리고:
- 타입 힌트 기반으로 자동 검증
- 문서도 자동 생성
- async도 기본 지원
    
→ 그래서 FastAPI가 빠르고, 간단하고, 실용적인 API 서버 개발에 매우 적합한 거예요.

