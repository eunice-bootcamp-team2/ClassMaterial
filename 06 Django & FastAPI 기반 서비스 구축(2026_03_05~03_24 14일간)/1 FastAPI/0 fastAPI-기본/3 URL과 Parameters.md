URL의 구성요소
![[Pasted image 20250713094635.png]]![[Pasted image 20250713094747.png]]
![[Pasted image 20250713094811.png|150]]

| 번호  | 용어 (영문)                  | 설명                                     | 예시                                                 |
| --- | ------------------------ | -------------------------------------- | -------------------------------------------------- |
| 01  | Scheme (스킴)              | 웹 주소의 시작 부분으로 이게 어떤 방식으로 연결할지 정해줘요.    | `http://`, `https://` ← 보안 연결 여부                   |
| 02  | Domain Name (도메인 이름)     | 웹사이트의 이름이에요. 인터넷에서 컴퓨터(서버)를 찾는 주소예요.   | `www.example.com`, `naver.com`                     |
| 03  | Port (포트)                | 컴퓨터 내부 통신창 번호예요. 어떤 서비스로 연결할지 정해요.     | `80` (HTTP), `443` (HTTPS), `8000` (FastAPI 기본 포트) |
| 04  | Path to the file (파일 경로) | 서버 안에서 어떤 파일이나 페이지를 보여줄지 정해요.          | `/index.html`, `/img/logo.png`                     |
| 05  | Parameters <br>(쿼리 파라미터) | 주소 뒤에 붙는 추가 정보예요. 서버에 뭔가 요청할 때 같이 보내요. | `?key=value`, `?search=banana&page=2`              |
| 06  | Anchor <br>(앵커, 해시)      | 웹페이지 안의 특정 위치로 바로 이동할 때 써요.            | `#section1`, `#bottom`, `#title`                   |
그중 05번에 해당하는 Query Parameters


### URL 요청을 받아서 함수로 연결하는 방법
```
브라우저 URL
        ↓
서버가 어떤 함수 실행
        ↓
JSON 결과 반환
```

쿼리 파라미터란? 웹 주소(URL)에 추가 정보를 넣는 방식으로 주소 끝에 `?키=값` 형식으로 붙습니다. 
```
?key3=value1&key2=value2
```

```json
{
	"key3": "value1",
	"key2": "value2"
}
```

FastAPI 함수에서는 이렇게 사용됩니다:
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/search") # 127.0.0.1:8000/serarch/
def search(keyword: str, page: int = 1):
    return {
        "검색어": keyword,
        "페이지번호": page
    }
```
이 주소로 요청이 들어오면:
```
/search?keyword=사과&page=3
```
`keyword="사과"`, `page=3`이 함수에 전달됩니다.

브라우저에서 다음 주소로 접속하면:
```
http://127.0.0.1:8000/search?keyword=사과&page=2
```

브라우저 응답 결과 (JSON):
```json
{
  "검색어": "사과",
  "페이지번호": 2
}
```

위의 코드에서 데이터는 json이 아닙니다.
요청은 `/search?keyword=사과&page=2` 여기서 데이터는 `?keyword=사과&page=2` 이부분입니다.
즉 브라우저 주소창에서 데이터를 서버로 보내는 것입니다.

서버 내부에서 실제로 일어나는 일
```
URL 분석
↓
query string 파싱
↓
keyword = "사과"
page = 2
↓
함수에 전달
```

즉 아래가 실행되는 겁니다
```python
search(keyword="사과", page=2)
```

FastAPI는 기본적으로 API 서버입니다.
```
요청(Request)
↓
Python 함수 실행
↓
응답(Response)
```
응답 형식이 기본적으로 JSON입니다.

Django REST Framework는 분리형 구조입니다.
```
URL
 ↓
urls.py
 ↓
View(APIView / ViewSet)
 ↓
Serializer
 ↓
Response
---
URL 설정  
View 로직  
데이터 변환  
응답
```

FastAPI는 **함수 중심 구조**입니다.
```
URL
 ↓
Python 함수
 ↓
JSON 응답
---
URL + View + Validation
```
이 한 함수 안에서 처리됩니다.

---
### Fast API의 Path Parameters란?

URL 주소 안에 들어가는 값이에요.  
예: `http://127.0.0.1:8000/items/1` → 여기서 `1`이 바로 path parameter!

즉 URL 안에서 특정 데이터를 식별하는 값입니다.

| 개념        | DRF            | FastAPI        |
| --------- | -------------- | -------------- |
| 특정 데이터 식별 | pk             | Path Parameter |
| URL 예시    | `/articles/3/` | `/articles/3`  |
| URL 설정    | `<int:pk>`     | `{article_id}` |
| 함수 인자     | `pk`           | `article_id`   |
| 목적        | 특정 데이터 조회      | 특정 데이터 조회      |

예시 비교코드: 
DRF 
urls.py
```python
from django.urls import path  
from .views import ArticleDetailAPIView  
  
urlpatterns = [  
path("articles/<int:pk>/", ArticleDetailAPIView.as_view())  
]
```

views.py
```python
from rest_framework.views import APIView
from rest_framework.response import Response

class ArticleDetailAPIView(APIView):

    def get(self, request, pk):
        return Response({"article_id": pk})
```

요청
```
GET /articles/3
```

응답
```
{
  "article_id": 3
}
```

---
FastAPI
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/articles/{article_id}")
def read_article(article_id: int):
    return {"article_id": article_id}
```

요청
```
GET /articles/3
```

응답
```
{
  "article_id": 3
}
```

DRF 구조의 차이
```
URL
↓
urls.py
↓
View
↓
pk 전달
```

FastAPI
```
URL
↓
@app.get("/articles/{article_id}")
↓
함수 실행
```

즉 DRF는 URL 설정 파일 따로  View 따로

FastAPI는 함수 위에서 URL + View 같이 작성 입니다.

---
`@app.get("/items/{item_id}")` 데코레이터

DRF 스타일 : URLConf (urls.py)
```python
from django.urls import path
from . import views

urlpatterns = [
    path("items/<int:item_id>/", views.read_item),
]
```

views.py
```python
from django.http import JsonResponse

def read_item(request, item_id):
    return JsonResponse({"item_id": item_id})
```

FastAPI 스타일 (main.py)
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
```

###### 위의 데코레이터의 사용법에 대한 장고와의 비교표
| 개념        | DRF                        | FastAPI                      |
| --------- | -------------------------- | ---------------------------- |
| URL 설정  . | `urls.py`에 `path()` 사용   . | 데코레이터 `@app.get()`에 직접 경로 작성 |
- Django는 `urls.py`에서 URL → View 함수 연결을 분리해서 설정하지만
- FastAPI는 `@app.get("/items/{item_id}")`처럼,  View 함수 위에 직접 경로를 지정합니다.

📌차이점: FastAPI는 코드 한 곳에서 URL과 로직을 함께 볼 수 있어 더 직관적입니다.

---

| 개념                 | Django          | FastAPI     |
| ------------------ | --------------- | ----------- |
| **Path Parameter** | `<int:item_id>` | `{item_id}` |
    path parameter는 장고에서는 PK가 됩니다.
    
- Django는 URL 경로에 들어올 값의 자료형까지 명시합니다. 
	-(예: `<int:pk>` → 정수)
- FastAPI는 중괄호 `{}`로 변수 이름만 지정하고,  타입은 함수 매개변수에서 지정합니다.  
	예: `def read_item(item_id: int)`

📌차이점: FastAPI는 함수 매개변수와 타입을 같이 보면서 개발할 수 있어 IDE 자동
	완성도 좋고 가독성도 좋아요.

---

| 개념           | DRF                               | FastAPI                       |
| ------------ | --------------------------------- | ----------------------------- |
| View 함수    . | `def read_item(request, item_id)` | `def read_item(item_id: int)` |
- Django는 항상 첫 번째 인자로 `request` 객체가 필요합니다. (모든 요청 정보가 여기에 들어 있음)
- FastAPI는 `request`를 꼭 명시하지 않아도 되고,  필요한 파라미터만 함수 인자로 명확하게 지정할 수 있어요.

📌 차이점: FastAPI는 더 단순한 함수 스타일로 API를 만들 수 있습니다.

---
###### 응답 리턴 방식
| 개념        | DRF                   | FastAPI                     |
| --------- | --------------------- | --------------------------- |
| **응답 리턴** | `JsonResponse({...})` | 그냥 `dict` 리턴하면 JSON으로 자동 변환 |
- Django에서는 JSON 응답을 만들기 위해 반드시 `JsonResponse`를 사용해야 해요.
- FastAPI는 딕셔너리를 바로 반환하면 자동으로 JSON 형태로 변환해줍니다.

📌 차이점: FastAPI는 코드가 간단하고 짧아짐 → 빠르게 API 만들기 좋음!

---
###### 라우팅 방식 (구조)
| 개념     | DRF                         | FastAPI                |
| ------ | --------------------------- | ---------------------- |
| 라우팅 방식 | 분리형 (`urls.py`, `views.py`) | 결합형 (`함수 위에 @app.get`) |
- DRF는 URL 라우팅과 View 함수를 분리해서 작성합니다. 유지 보수에는 좋지만, 처음에는 구조가 복잡하게 느껴질 수 있어요.
- FastAPI는 함수 위에 데코레이터(`@app.get()`, `@app.post()` 등)를 붙여서 URL과 View를 한 번에 작성합니다.

📌 차이점: FastAPI는 한 파일 안에서 API 개발이 가능해서, 빠르게 개발하고 테스트
	하기에 최적입니다.

---
실행 구조방식:
```bash
uvicorn [파일명 without .py]:[FastAPI 객체 이름] --reload
```

예를 들어:
- `main.py` 안에 `app = FastAPI()`가 있다면  
    → `uvicorn main:app`
    
- `user_api.py` 안에 `api = FastAPI()`라면  
    → `uvicorn user_api:api`

`--reload` 옵션은?
- 코드 변경 시 서버 자동 재시작 (개발 환경에서 필수!)
- 실시간으로 수정 사항 반영됨

실행코드 예시
a/pathParamertersBasic.py
```python
from fastapi import FastAPI
app = FastAPI()
```
실행시:
```bash
uvicorn a.pathParamertersBasic:app --reload
```

main.py
```python
from fastapi import FastAPI
app = FastAPI()
```
실행시:
```bash
uvicorn main:app --reload
```

---
로컬서버뒤에 /docs를 붙이면 스웨거로 문서를 확인할수 있습니다.
![[Pasted image 20250713112107.png]]

스웨거 공식 사이트[https://swagger.io](https://swagger.io)

스웨거와 같이 별도의 설치를 하지 않아도 redoc를 지원합니다.
![[Pasted image 20250713112451.png]]

redoc참고 사이트 [https://github.com/Redocly/redoc](https://github.com/Redocly/redoc)

두 도구 모두 FastAPI에서 자동으로 생성해주는 API 문서 인터페이스지만, UI와 목적, 사용성에 차이가 있습니다.

Swagger UI vs ReDoc는 둘다 라이브러리 입니다. 

### Swagger UI의 역할

Swagger UI는 FastAPI에서 자동으로 제공되는 웹 기반 도구입니다.  
이 도구를 사용하면 만든 API의 문서를 확인하고, 실제로 API를 테스트해 볼 수 있습니다.

Swagger UI 화면에서는 각 API 주소(예: `/items/{item_id}`)에 대해 다음과 같은 정보를 확인할 수 있습니다.

- 어떤 방식의 요청인지 (GET, POST 등)
- 어떤 값을 입력해야 하는지
- 어떤 형태의 결과가 반환되는지
    

또한 "Try it out" 버튼을 누르면**, 입력값을 직접 넣어서 서버에 요청을 보내고 결과를 바로 확인할 수 있습니다.

따라서 Swagger UI는 개발자가 API를 만든 후 API가 제대로 동작하는지 확인하고 테스트할 때 매우 유용한 도구입니다.

---
### ReDoc의 역할

ReDoc은 FastAPI에서 자동으로 제공되는 API 문서 보기 도구입니다.  
Swagger UI와 같은 API 정보를 사용하지만, API를 테스트하는 기능은 없고 문서를 보기 위한 용도로 만들어진 도구입니다.

ReDoc 화면에서는 다음과 같은 정보를 정리된 문서 형태로 확인할 수 있습니다.

- 각 API가 어떤 기능을 하는지 설명
- API 요청에 필요한 파라미터 정보
- API가 반환하는 응답 데이터 형식
    
ReDoc은 API를 직접 실행하거나 테스트하기보다는, API 문서를 깔끔하게 정리해서 보여주는 데에 집중한 도구입니다.

따라서 ReDoc은 API를 사용하는 다른 개발자나 협업하는 팀원에게 API 사용 방법을 설명할 때 유용한 문서 도구입니다.