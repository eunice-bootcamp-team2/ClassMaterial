공식문서 링크[https://fastapi.tiangolo.com/ko/](https://fastapi.tiangolo.com/ko/)

FastAPI는 **Python**으로 만든 빠르고 현대적인 웹 프레임워크입니다. 주로 REST API 서버를 구축할 때 사용되며, 이름 그대로 매우 빠른 속도와 생산성을 자랑합니다.

FastAPI란?
> FastAPI = “Python + 타입힌트 + Starlette + Pydantic” 기반의 초고속 API 전용 백엔드 프레임워크  

- **Django**: 웹사이트 전체(템플릿, Admin, ORM, 인증 등)를 다 갖춘 풀스택 웹 프레임워크
- **Django REST Framework(DRF)**: Django 위에서 돌아가는 API 프레임워크
- **FastAPI**: 처음부터 **API 서버**만을 잘 만들도록 설계된 **경량·고성능 백엔드 프레임워크**

FastAPI 내부 구성
> FastAPI = **Starlette(비동기 웹 서버) + Pydantic(데이터 검증)** 위에 얇게 프레임워크를 씌운 것

- **Starlette**
    - ASGI 기반 비동기 웹 프레임워크
    - 요청/응답 처리, 라우팅, WebSocket, 미들웨어 등 저수준 기능 담당
        
- **Pydantic**
    - **입출력 데이터 검증 & 직렬화**를 담당
    - DRF의 `Serializer`랑 같은 역할을 한다고 보면 됨
        
⇒ FastAPI는 이 둘을 “프레임워크 수준에서 자연스럽게 묶어놓은 것”이라고 이해하면 편해요.

###### FastAPI의 핵심 특징 (DRF랑 비교하며)
|특징|FastAPI 설명|DRF 기준으로 보면…|
|---|---|---|
|빠른 성능|Starlette 기반 ASGI + 비동기 지원으로 **Node, Go급 속도**|WSGI 기반 Django보다 **동시 처리량이 유리**|
|자동 데이터 검증|`Pydantic` 모델로 요청 바디·쿼리파라미터·헤더까지 자동 검증|DRF `Serializer`가 하던 역할|
|자동 API 문서|`/docs`(Swagger), `/redoc` 자동 제공|DRF는 `drf-yasg` 같은 추가 패키지 필요|
|타입 힌트 적극 활용|`title: str`, `age: int`처럼 Python 타입힌트를 코드에 적어두면 → 검증 + 문서가 자동으로 따라옴|DRF도 가능하지만, FastAPI가 훨씬 “타입 전제 설계”|
|비동기(async/await)|**처음부터 async 지원**을 전제로 설계. 외부 API, DB, I/O 많을수록 장점이 커짐|Django 3+에서 async 일부 지원이지만, 완전 일관X|
|가벼운 구조|ORM, 템플릿, Admin을 “필요하면 가져다 쓰는” 조합형 구조|Django는 “처음부터 다 들어있는 풀세트”|

언제 FastAPI를 쓰면 좋은가?
- React/Vue 같은 프론트의 **백엔드 API 서버**
- **AI/ML 모델 서빙용 API 서버** (모델 호출 → JSON 응답)
- 모바일 앱/프론트엔드 전용 **REST/GraphQL 백엔드**
- **비동기 처리**가 중요한 고성능 API (외부 API호출, WebSocket, 실시간 알림 등)
    
반대로,
- **Admin, 템플릿 기반 페이지, 회원·게시판 웹사이트** 등 “웹서비스 전체”를 빠르게 만들고 싶다면  → Django(+DRF)가 여전히 훨씬 편해요.

###### Django/DRF ↔ FastAPI 개념 매핑
###### DRF 기준으로 본 FastAPI 대응
|Django/DRF 기능|FastAPI에서의 대응|한 줄 설명|
|---|---|---|
|`Serializer`|`Pydantic` 모델 (`BaseModel`)|입력 검증 + 직렬화/역직렬화 1:1 대응 가능|
|`APIView`, `ViewSet`|경로 함수 (`@app.get`, `@app.post` 등)|URL과 연결된 함수에서 바로 로직 작성|
|`urls.py` 라우팅|데코레이터 기반 라우팅|`@app.get("/items/")` 처럼 바로 URL 정의|
|`IsAuthenticated`, JWT 등|`Depends`, `Security`, OAuth2, JWT 라이브러리|의존성 주입(Depends) 방식으로 인증 처리|
|`drf-yasg` 문서화|`/docs`, `/redoc` 자동|추가 설정 없이 OpenAPI 문서 기본 제공|
|`APITestCase`, `APIClient`|`TestClient`, `pytest` + `httpx`|유사한 방식으로 API 테스트 가능|
|`Request`, `Response`|`fastapi.Request`, `fastapi.Response`|요청 정보 접근/응답 헤더 조작 등 동일 개념|

DRF → FastAPI로 생각할 핵심:
> Serializer = Pydantic 모델,  
> APIView/ViewSet = `@app.get/post` 경로 함수

###### Django가 여전히 우위인 부분
|Django 기능|FastAPI에서 대체 가능?|이유/설명|
|---|---|---|
|템플릿 렌더링 (`render`, `templates/`)|⭕ / ❌ (별도 라이브러리 필요)|Jinja2 연결하면 가능하지만, 기본 철학은 API 전용|
|ORM (`models.py`, QuerySet)|❌ 직접 제공 안 함|SQLAlchemy, Tortoise ORM 등 외부 라이브러리 사용|
|Admin 사이트 (`/admin`)|❌ 없음|Django만의 강력한 장점|
|풀스택 웹서비스 구조|❌|FastAPI는 “백엔드 API” 역할에 집중|

그래서:
- “관리자 페이지 + 템플릿 기반 페이지 + Admin으로 CRUD 훑기” → Django/DRF
- “AI API, 모바일/SPA용 JSON API, 고성능 백엔드” → FastAPI
이렇게 용도를 나눠서 설명해주면 학생들이 잘 이해합니다.


예시 코드로 감 잡기 (DRF vs FastAPI)
DRF Serializer vs FastAPI Pydantic
```python
# DRF에서
class BookSerializer(serializers.Serializer):
    title = serializers.CharField()
    author = serializers.CharField()

# FastAPI에서
from pydantic import BaseModel

class Book(BaseModel):
    title: str
    author: str
```
→ 역할과 책임이 거의 동일해요.  
→ 다만 FastAPI 쪽이 Python 타입힌트 문법 그대로라서 더 간결하게 보이죠.

FastAPI 기본 예시
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float
    is_offer: bool | None = None

@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}

@app.post("/items/")
def create_item(item: Item):
    # item.name, item.price 등에 타입이 자동 보장됨
    return {"received": item}
```

여기서 강조 포인트:
- `@app.get("/...")`, `@app.post("/...")` 가 urls.py + views.py 합쳐진 느낌
- `Item(BaseModel)` 이 DRF의 `Serializer` 같은 역할
- 타입힌트만으로 검증 + 문서 + IDE 지원까지 한 번에

FastAPI로 할 수 있는 것들
- REST API (CRUD)
- JWT 기반 인증/인가
- DB 연동 (SQLAlchemy, Tortoise ORM 등)
- 머신러닝/딥러닝 모델 서빙 (AI API)
- WebSocket 기반 실시간 통신
- 비동기 크롤러 서버, 배치, 백그라운드 작업

###### FastAPI가 Django/DRF를 “대체”하기보다는 “보완”하는 방식
|목적|추천 선택|
|---|---|
|관리자 페이지 + 웹 화면 + 간단한 API|**Django + DRF**|
|AI/ML API, 모바일/프론트엔드 전용 API 서버|**FastAPI**|
|기존에 Django가 있고, 모델/관리자까지 다 있다|Django 안에 DRF 붙여 쓰는 것도 여전히 좋음|
|이미 Django 백엔드 + 별도의 AI 서버|Django + **FastAPI 분리 서버**|
여러분은 이미 Django/DRF를 배웠기 때문에,  
FastAPI는 완전히 새 세계가 아니라 ‘다른 스타일의 DRF’처럼 접근하면 됩니다.




