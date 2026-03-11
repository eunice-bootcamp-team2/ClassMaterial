
FastAPI는 Python으로 만든 빠르고 현대적인 웹 프레임워크입니다. 주로 REST API 서버를 구축할 때 사용되며, 이름 그대로 매우 빠른 속도와 생산성을 자랑합니다.

### FastAPI란?
> FastAPI = `Python + 타입힌트 + Starlette + Pydantic` 기반의 초고속 API 전용 백엔드 프레임워크  

- **Django**: 웹사이트 전체(템플릿, Admin, ORM, 인증 등)를 다 갖춘 풀스택 웹 프레임워크
- **Django REST Framework(DRF)**: Django 위에서 돌아가는 API 프레임워크
- **FastAPI**: 처음부터 **API 서버**만을 잘 만들도록 설계된 경량·고성능 백엔드 프레임워크

FastAPI는 사실 하나의 거대한 프레임워크가 아니라 
```
웹 처리 엔진 + 데이터 검증 엔진
```
을 합쳐서 만든 프레임워크입니다

```
FastAPI
 = Starlette (웹 요청 처리)
 + Pydantic (데이터 검증)
```
그리고 이걸 실행하는 서버가 Uvicorn (웹 서버) 입니다.

DRF는 `Model → Serializer → View → URL` 이런 흐름입니다.
즉, 먼저 DB 모델이 있고, 그 모델을 시리얼라이저로 검증/변환하고, 그걸 뷰에서 CRUD로 다루는 방식이에요.

FastAPI는 
- `/users` 요청이 오면?
- 요청 body는 어떤 형태인가?
- 응답 JSON은 어떤 구조인가?
- 이 요청을 처리할 함수는 무엇인가?
즉, 먼저 URL과 요청/응답 구조를 설계하고, 그 다음 필요하면 DB를 붙이는 방식이에요.
`요청 → Pydantic 검증 → 함수 실행 → JSON 응답` 즉, API 자체가 중심이에요.

###### FastAPI의 핵심 특징 (DRF랑 비교하며)
| 비교 항목     | DRF 기준에서의 의미    | FastAPI                                    | DRF                                                      |
| --------- | --------------- | ------------------------------------------ | -------------------------------------------------------- |
| 프레임워크 성격  | 무엇을 중심으로 만들어졌는가 | API 중심 프레임워크. 처음부터 REST API 서버를 만들기 좋게 설계됨 | Django 기반 API 확장 프레임워크. Django의 모델/ORM/관리자 기능 위에 API를 붙임 |
| 개발 출발점    | 어디서부터 시작하나      | 보통 엔드포인트와 요청/응답 설계부터 시작                    | 보통 모델 설계부터 시작하고, 그 위에 Serializer/View/API를 연결            |
| 핵심 설계 방식  | 무엇을 먼저 생각하게 되나  | 이 URL에서 어떤 JSON을 받을까?                      | "이 모델 데이터를 어떻게 API로 보여줄까?"                               |
| 데이터 검증    | 입력값 검사 방식       | Pydantic으로 타입 기반 자동 검증                     | Serializer로 필드 검증 및 변환                                   |
| DB와의 관계   | DB가 기본 포함인가     | 기본 내장 아님. SQLAlchemy, Tortoise 등 선택        | Django ORM이 기본 포함                                        |
| 관리자 페이지   | 관리자 기능 제공 여부    | 기본 없음                                      | Django Admin 기본 제공                                       |
| 템플릿 렌더링   | HTML 화면 제작과의 관계 | 가능은 하지만 주 목적은 아님                           | Django Template와 자연스럽게 연결 가능                             |
| 문서화       | API 문서 생성       | `/docs`, `/redoc` 자동 제공                    | 별도 패키지 추가 필요                                             |
| 비동기 처리    | async 지원 정도     | async/await 중심 설계                          | 일부 가능하지만 전체 구조는 Django 중심                                |
| 성능 구조     | 동시 요청 처리        | 가볍고 빠른 API 서버에 유리                          | 기능은 풍부하지만 상대적으로 무거움                                      |
| 프로젝트 느낌   | 실제 개발 감각        | 필요한 것만 조립하는 느낌                             | 이미 많은 기능이 갖춰진 큰 프레임워크 안에서 개발하는 느낌                        |
| 초보자 학습 느낌 | 배우기 쉬운 방향       | 단순 API는 빠르게 이해 가능, 대신 구조를 스스로 정해야 함        | 규칙이 잘 잡혀 있어 큰 웹서비스 흐름 배우기에 좋음                            |

### 언제 FastAPI를 쓰면 좋은가?
- React/Vue 같은 프론트의 백엔드 API 서버
- AI/ML 모델 서빙용 API 서버 (모델 호출 → JSON 응답)
- 모바일 앱/프론트엔드 전용 REST/GraphQL 백엔드
- 비동기 처리가 중요한 고성능 API (외부 API호출, WebSocket, 실시간 알림 등)
    
반대로,
- Admin, 템플릿 기반 페이지, 회원·게시판 웹사이트 등 웹서비스 전체를 빠르게 만들고 싶다면  → Django(+DRF)가 여전히 훨씬 편해요.

### Django/DRF ↔ FastAPI 개념 매핑
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

###### Django가 더 편한 부분
|기능|Django|FastAPI|
|---|---|---|
|HTML 화면 만들기|기본 기능 있음|기본 기능 없음|
|관리자 페이지|자동 제공|없음|
|데이터베이스 관리|Django ORM|외부 라이브러리 필요|
|게시판/쇼핑몰 같은 웹서비스|만들기 쉬움|직접 구조를 많이 만들어야 함|

### 그래서 이렇게 나누면 좋습니다.
Django / DRF
✔ 관리자 페이지 필요  
✔ HTML 웹사이트 만들기  
✔ 게시판 / 쇼핑몰 / 커뮤니티  
✔ 데이터 관리 화면 필요
```
쇼핑몰  
블로그  
커뮤니티  
관리자 시스템
```

FastAPI
✔ 모바일 앱 API  
✔ React / Vue 같은 프론트엔드  
✔ AI 모델 서버  
✔ 빠른 API 서버
```
AI 추천 서버  
챗봇 API  
모바일 앱 백엔드  
React + API 서버
```

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




