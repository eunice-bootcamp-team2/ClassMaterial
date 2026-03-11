### 쿼리 파라미터 검증이란?

사용자가 전달한 값이 우리가 기대하는 형식(type)이나 조건(길이, 범위 등)을 만족하는지 검사하는 과정이에요. 다시 말해  API가 받는 입력값을 미리 한 번 걸러 주는 과정입니다.

### 왜 쿼리 파라미터 검증이 필요할까?  

- 데이터 무결성(Data Integrity) : 잘못된 데이터 차단 → 덜 고생해요
    - 입력값에 이상(예: 글자가 들어와야 할 자리에 숫자, 너무 작은 값, 너무 큰 값 등)이 있으면 곧바로 “잘못된 요청”이라고 알려 줍니다.
	- 예를 들어 `limit` 파라미터를 1~100 사이 정수로 정해 두면, 그 범위를 벗어나거나 문자가 들어왔을 때 DB 조회나 뒤쪽 비즈니스 로직이 시작되기 전 단계에서 막아 줍니다.
	- 덕분에 뒤에서 “왜 프로그램이 에러 나지?” 하며 이리저리 디버깅할 필요가 줄어들어요.
        
- 자동 문서화 & 생산성 향상(Developer Experience) : 문서 자동 생성으로 사용자가 헛갈리지 않아요
    - FastAPI 같은 프레임워크에선 검증 규칙을 코드에 적어 두면, Swagger(UI)나 OpenAPI 명세에 그대로 반영됩니다.
	- API를 쓰는 사람(또는 나중의 나!)가 “이 파라미터는 어떤 타입이고, 최소값·최대값은 얼마인지”를 따로 문서 찾아보지 않아도 바로 알 수 있어요.
	- IDE(코드 편집기)도 타입 정보를 그대로 읽어서 오타를 잡아 주니, 개발 속도와 정확도가 모두 올라갑니다..
        
- 보안 강화(Security Hardening) : 공격 시도(보안)도 미리 걸러요
    - SQL 인젝션, 스크립트 태그 삽입(XSS) 같은 공격은 종종 “특수문자”를 파라미터에 끼워 넣어 발생합니다.
	- 검증 단계에서 허용할 문자·형식을 엄격히 정해 두면, “HTML 태그는 안 돼요” “특수문자는 안 돼요” 하고 차단할 수 있어요.
	- 즉, 좀 더 안전한 API를 만들 수 있죠.
        
- 재사용성·유지보수성(Reusable & Maintainable Code) : 같은 검증 로직을 여러 곳에서 나눠 쓸 수 있어요
    - 예를 들어 공통 파라미터(페이징용 `skip`, `limit` 등)는 한 번 검사 로직을 만들어 두고, 여러 API에서 똑같이 `Depends()` 같은 기능으로 불러다 쓸 수 있습니다.
	- 검증 규칙을 한 곳에 모아 두면, 수정할 때도 그 파일 하나만 고치면 돼서 유지보수가 편해집니다.
        
- 퍼포먼스 이점(Performance) : 서버 자원을 아껴 써요
    - 잘못된 요청을 비즈니스 로직이나 DB 조회 전에 걸러 주면, 그 뒤에 불필요하게 처리하지 않아도 됩니다.
	- 작은 검증 작업은 보통 아주 빠르게 끝나기 때문에, 특히 트래픽이 많은 서비스에서도 부담이 크지 않습니다.

### Django vs FastAPI: 검색 처리 방식 비교

웹에서 **검색 기능이나 필터 기능**을 만들 때 보통 쿼리 파라미터(Query Parameter)를 사용합니다.

예를 들어 사용자가 아래와 같은 주소로 요청할 수 있습니다.
```
/search?q=apple
```
여기서
- `q` → 검색어 변수 이름
- `apple` → 사용자가 입력한 값
    
이렇게 URL 뒤에 붙어서 서버에 전달되는 값을 쿼리 파라미터라고 합니다.

### Django는 이렇게 합니다:
```python
def search(request):
    q = request.GET.get("q")
    if q:
        result = Product.objects.filter(name__icontains=q)
```
설명
1️⃣ `request.GET.get("q")`로 URL 파라미터 값을 가져옵니다.

예를 들어 사용자가 아래처럼 요청하면
```
/search?q=apple
```
`q`에는 `"apple"`이 들어갑니다.
```
q = "apple"
```


2️⃣ 값이 있는지 개발자가 직접 확인합니다.
```python
if q:
```
이 코드는 검색어가 존재하는지 확인하는 코드입니다.


3️⃣ 값이 있으면 데이터베이스에서 검색합니다.
```python
Product.objects.filter(name__icontains=q)
```

즉 Django에서는
- 입력값이 있는지
- 값의 길이가 적절한지
- 형식이 맞는지
    
이러한 검사를 개발자가 직접 코드로 작성해야 합니다.

---
### FastAPI는 이렇게 처리합니다:
```python
@app.get("/search")
def search(q: Annotated[str, Query(min_length=3, max_length=50)]):
    ...
```
이 코드는 다음과 같은 의미를 가집니다.
- `q`는 문자열이어야 합니다.
- 최소 3글자 이상이어야 합니다.
- 최대 50글자까지 가능합니다.
    
즉 검색어의 조건을 API 설계 단계에서 미리 정의하는 것입니다.

### 잘못된 값이 들어오면 어떻게 될까요?

예를 들어 사용자가 이렇게 요청했다고 가정해 보겠습니다.
```bash
/search?q=a
```
검색어가 1글자입니다.

하지만 FastAPI에서는 최소 3글자라고 정의했기 때문에 FastAPI가 자동으로 요청을 거부합니다.

그리고 다음과 같은 응답을 반환합니다.
```
422 Validation Error
```
즉 잘못된 입력이 실제 코드까지 들어가지 않도록 미리 막아줍니다.

### 왜 이런 검증이 중요할까요? (머신러닝 API 예시)

예를 들어 FastAPI로 머신러닝 모델을 서비스한다고 가정해 보겠습니다.

사용자가 아래와 같은 요청을 보냅니다.
```
/predict?brand=삼성&price=10000&category=전자제품
```
이 값은 FastAPI를 통해 머신러닝 모델로 전달됩니다.

하지만 다음과 같은 문제가 발생할 수도 있습니다.
```
/predict?brand=삼성&price=-100&category=전자제품
```
또는
```
/predict?brand=삼성&price=abc&category=전자제품
```
또는
```
/predict?price=10000&category=전자제품
```

이런 경우에는
- 가격이 음수입니다
- 숫자가 아닌 값이 들어왔습니다
- 필요한 값이 없습니다
    
이런 데이터가 그대로 모델에 들어가면
- 모델이 오류를 발생시키거나
- 예측 결과가 이상하게 나오거나
- 서버가 멈출 수도 있습니다.
    
그래서 모델에 데이터를 전달하기 전에 입력값을 검증하는 과정이 매우 중요합니다.

---
### FastAPI가 편리한 이유
FastAPI는 다음과 같은 검사를 자동으로 수행할 수 있습니다.
- 값이 존재하는지
- 타입이 맞는지 (문자열, 숫자 등)
- 값의 길이가 적절한지
- 값의 범위가 정상인지
    
이 검사는 실제 API 코드가 실행되기 전에 먼저 수행됩니다.

그래서 잘못된 입력이 서버 내부 로직이나 머신러닝 모델까지 전달되는 것을 막을 수 있습니다.

간단한 비유
API 서버를 건물 입구라고 생각해 보겠습니다.
사용자의 요청은 건물에 들어오는 사람과 같습니다.

FastAPI는 입구에서
- 신분 확인
- 가방 검사를 먼저 합니다.

그래서 문제가 있는 요청은 건물 안으로 들어오기 전에 막을 수 있습니다.

---
### 실제 파라미터 검증을 실습해봅니다.

디렉토리 구조
```
query/
└── main.py
```

`main.py 전체코드`
```python
from typing import Annotated
from fastapi import FastAPI, Query

# FastAPI 앱 생성
app = FastAPI()


# /search 경로로 GET 요청이 들어오면 실행되는 API
@app.get("/search")
async def search_items(
    q: Annotated[
        str,
        Query(
            min_length=3,
            max_length=50,
            description="검색 키워드"
        )
    ],
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=100,
            description="최대 결과 수 (1~100)"
        )
    ] = 5,
    offset: Annotated[
        int,
        Query(
            ge=0,
            description="몇 번째 결과부터 시작할지"
        )
    ] = 0,
):
    # 가짜 검색 결과 100개 생성
    dummy_data = [f"{q}_result_{i}" for i in range(1, 101)]

    # offset부터 limit 개수만큼 잘라서 결과 반환
    results = dummy_data[offset:offset + limit]

    return {
        "query": q,
        "limit": limit,
        "offset": offset,
        "results": results,
        "message": "검색 성공"
    }
```

실행
```bash
uvicorn query.main:app --reload
```
- `main` → `main.py` 파일 이름
- `app` → `app = FastAPI()`에서 만든 FastAPI 객체 이름
- `--reload` → 코드를 수정하면 서버가 자동 재시작됨

### Annotated란?

FastAPI에서 API를 만들 때는 사용자가 보내는 값이 올바른지 검사(검증) 해야 합니다.

예를 들어 검색 API라면 다음과 같은 규칙을 만들 수 있습니다.
- 검색어는 3글자 이상
- 검색어는 50글자 이하
- 결과 개수는 1~100 사이
    
이런 규칙을 FastAPI에게 알려주는 방법 중 하나가 `Annotated`입니다.

즉, `Annotated`는 다음과 같은 의미를 가집니다.
이 변수는 어떤 타입인지 + 어떤 조건을 따라야 하는지를 한 번에 함께 설명하는 문법입니다

Annotated 간단한 예시
```python
from typing import Annotated
from fastapi import Query

q: Annotated[str, Query(min_length=3, max_length=50)]
```
이 코드는 다음 의미를 가지고 있습니다.
- `q`는 문자열(str) 이어야 합니다.
- 최소 3글자 이상
- 최대 50글자 이하
    
즉 FastAPI에게 이렇게 말하는 것입니다.
	q라는 값은 문자열이어야 하고, 3글자 이상 50글자 이하만 허용합니다.

Annotated 구조 공식 요약
```python
Annotated[기본타입, 추가정보 또는 조건]

Annotated[str, Query(min_length=3)]
```
의미
- `str` → 문자열 타입
- `Query(...)` → 쿼리 파라미터 검증 조건
    
즉 타입 + 검증조건을 한 줄에 같이 작성하는 방식입니다.

---
### 왜 Annotated를 사용하는가?

FastAPI에서는 다음과 같은 작업을 자동으로 해줍니다.

1️⃣ 사용자가 잘못된 값을 보내면 자동으로 검사합니다.  
2️⃣ 잘못된 값이면 **422 오류**를 반환합니다.  
3️⃣ Swagger 문서에도 자동으로 설명이 표시됩니다.

예를 들어:
```
/search?q=hi
```
검색어가 2글자라면 FastAPI가 자동으로 이런 오류를 반환합니다.

```
422 error  
String should have at least 3 characters
```

즉 개발자가 직접 이런 코드를 작성하지 않아도 됩니다.
```python
if len(q) < 3:
    return error
```
FastAPI가 자동으로 처리해줍니다.

---
### 코드해석

1️⃣ 라이브러리 가져오기
```python
from typing import Annotated
```
`Annotated`는 변수의 타입과 검증 조건을 함께 작성할 수 있게 해주는 도구

예를 들어 다음과 같이 사용할 수 있습니다.
```python
Annotated[str, Query(min_length=3)]
```
이 뜻은
- 문자열 타입이어야 하고
- 최소 3글자 이상이어야 합니다.
    
즉, 타입 + 조건을 함께 작성하는 문법입니다.

```python
from fastapi import FastAPI, Query
```
- `FastAPI`
    → FastAPI 웹 서버를 만들기 위한 기본 클래스입니다.
    
- `Query`
    → 쿼리 파라미터의 검증 조건을 설정하는 도구입니다.

예를 들어:
```python
Query(min_length=3)
```
검색어는 최소 3글자 이상이어야 합니다. 라는 조건을 의미합니다.

---
2️⃣ FastAPI 앱 생성
```python
app = FastAPI()
```
이 코드는 FastAPI 서버의 시작점입니다 즉, 이제 FastAPI 웹 서버를 시작하겠습니다. 라는 의미입니다.

이 `app` 객체에 여러 API 경로를 등록하게 됩니다.

예를 들어
- `/search`
- `/users`
- `/items`
    
같은 API들을 여기에 연결합니다.

---
3️⃣ API 경로 정의
```python
@app.get("/search")
```
`/search` 주소로 GET 요청이 들어오면 아래 함수를 실행합니다.

예를 들어 사용자가 다음 주소로 접속하면
```python
http://127.0.0.1:8000/search?q=apple
```
FastAPI는 다음을 수행합니다.

1️⃣ `/search` 경로를 찾습니다.  
2️⃣ 연결된 함수를 실행합니다.

즉 이 코드는 `/search` API를 만들겠습니다. 라는 의미입니다.

---
4️⃣ API 함수 정의
```python
async def search_items(
```
`search_items`라는 비동기 함수를 정의로 검색 API 역할을 하는 함수입니다.

즉 사용자가 `/search`로 요청을 보내면 이 함수가 실행됩니다

---
5️⃣ 검색어 파라미터 (q)
```python
q: Annotated[
    str,
    Query(
        min_length=3,
        max_length=50,
        description="검색 키워드"
    )
],
```
`q`라는 쿼리 파라미터를 정의합니다. 

조건은 다음과 같습니다.
- 타입: 문자열 (`str`)
- 최소 길이: 3
- 최대 길이: 50
- Swagger 설명: "검색 키워드"
- 필수값 (`...`)

이 코드는 사용자가 보내는 검색어를 받습니다.

예를 들어 사용자가 다음과 같이 요청할 수 있습니다.
```python
/search?q=banana
```

여기서 아래 부분 입니다.
```python
q = banana
```

그리고 다음 조건이 자동으로 적용됩니다.

|조건|설명|
|---|---|
|`min_length=3`|최소 3글자|
|`max_length=50`|최대 50글자|
예를 들어 다음 요청은 실패합니다. 
```
/search?q=hi
```
왜냐하면 2글자이기 때문입니다.
FastAPI는 자동으로 422 에러를 반환합니다.

아무것도 입력하지 않으면 오류가 발생됩니다.
```python

```
이것은 필수값(required)이라는 뜻입니다. 즉, `q`를 보내지 않으면 오류가 발생합니다.

```python
/search
```
→ 에러 발생

---
6️⃣ limit 파라미터
```python
limit: Annotated[
    int,
    Query(
        ge=1,
        le=100,
        description="최대 결과 수 (1~100)"
    )
] = 5
```
`limit`이라는 검색 결과 개수 제한 파라미터입니다.

조건은 다음과 같습니다.
- 타입: 정수 (`int`)
- 최소값: 1
- 최대값: 100
- 기본값: 5

이 값은검색 결과를 몇 개까지 보여줄지 정합니다.

예를 들어 다음 요청을 보겠습니다.
```
/search?q=apple&limit=3
```

그러면 결과는 3개만 반환됩니다.

###### 검증 조건
|조건|설명|
|---|---|
|`ge=1`|1 이상|
|`le=100`|100 이하|
예를 들어 다음 요청은 실패합니다.
```python
limit=500
```
왜냐하면 100보다 크기 때문입니다.

---
7️⃣ offset 파라미터
```python
offset: Annotated[
    int,
    Query(
        ge=0,
        description="몇 번째 결과부터 시작할지"
    )
] = 0
```
`offset`은 검색 결과 시작 위치를 지정하는 값입니다.

조건은 다음과 같습니다.
- 타입: 정수
- 최소값: 0
- 기본값: 0

예를 들어 검색 결과가 100개 있다고 가정해보겠습니다.

|offset|의미|
|---|---|
|0|처음부터|
|5|6번째 결과부터|
|10|11번째 결과부터|
즉 페이지 이동 같은 기능입니다.

---
8️⃣ 가짜 검색 데이터 생성
```python
dummy_data = [f"{q}_result_{i}" for i in range(1, 101)]
```
검색 결과 100개를 리스트 형태로 생성합니다.

예를 들어 `q="apple"`이라면 다음 데이터가 만들어집니다.
```
apple_result_1  
apple_result_2  
apple_result_3  
...  
apple_result_100
```
지금은 실제 데이터베이스가 없기 때문에 연습용 데이터를 생성하는 코드입니다.

실제 프로젝트에서는 다음이 들어갑니다.

예:
- DB 검색
- Elasticsearch 검색
- 외부 API 호출

---
9️⃣ 결과 슬라이싱
```python
results = dummy_data[offset:offset + limit]
```
전체 검색 결과에서 offset부터 limit 개수만큼 잘라옵니다.

예를 들어 다음 요청이 있다고 가정합니다.
```
limit = 5  
offset = 10
```

그러면 결과는
```
11번째 ~ 15번째
```
입니다.
즉,
```
dummy_data[10:15]
```
을 반환합니다. 이 방식은 페이지네이션(Pagination)의 기본 구조입니다.

---
🔟 결과 반환
```python
return {
    "query": q,
    "limit": limit,
    "offset": offset,
    "results": results,
    "message": "검색 성공"
}
```
검색 결과를 JSON 형태로 반환합니다.
FastAPI는 Python의 dict 객체를 자동으로 JSON으로 변환합니다.
그래서 클라이언트는 다음과 같은 데이터를 받게 됩니다.
```json
{
  "query": "banana",
  "limit": 5,
  "offset": 0,
  "results": [
    "banana_result_1",
    "banana_result_2",
    "banana_result_3",
    "banana_result_4",
    "banana_result_5"
  ],
  "message": "검색 성공"
}
```
---
### FastAPI 테스트
테스트 흐름은 아래와 같습니다.

1. 서버 실행
2. Swagger 접속
3. `/search` 선택
4. 값 입력
5. Execute 실행
6. 응답 확인
7. 일부러 잘못된 값도 넣어보기

스웨거 설정
![[Pasted image 20260306171504.png]]

결과:
![[Pasted image 20260306171552.png]]


일부러 글자수를 3자보다 적게 입력
![[Pasted image 20260306171712.png]]

값을 아예 비우고 아무것도 입력하지 않았을때 422에러가 납니다.
![[Pasted image 20260306173909.png]]



