쿼리 파라미터 검증이란?
사용자가 전달한 값이 우리가 기대하는 형식(type)이나 조건(길이, 범위 등)을 만족하는지 검사하는 과정이에요. 다시 말해  API가 받는 입력값을 “미리” 한 번 걸러 주는 과정입니다.

왜 쿼리 파라미터 검증이 필요할까?  
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

###### Django vs FastAPI: 검색 처리 방식 비교
| 비교 항목    | Django                                  | FastAPI                               |
| -------- | --------------------------------------- | ------------------------------------- |
| 방식       | 폼 또는 URL에서 `request.GET.get("q")`로 값 꺼냄 | 함수 매개변수에 `q: str = Query(...)`처럼 명시   |
| 검증       | 개발자가 직접 `if not q:` 같은 조건을 코드로 작성       | FastAPI가 타입·길이·형식 등을 자동 검증            |
| 문서화      | 개발자가 따로 문서나 주석 작성                       | Swagger UI 자동 생성 → 직접 테스트 가능          |
| 보안 및 견고함 | 직접 처리해야 함                               | FastAPI가 422 오류 등 자동 처리               |
| 예시 검색    | `/search?q=apple` → 뷰에서 필터링 수행          | `/search?q=apple` → API 레벨에서 조건 미리 체크 |

Django는 이렇게 합니다:
```python
def search(request):
    q = request.GET.get("q")
    if q:
        result = Product.objects.filter(name__icontains=q)
```
→ q에 어떤 값이 오든지 개발자가 직접 확인해서 필터링을 합니다.  
→ 보안 검사, 길이 체크는 수동으로 추가해야 해요.

FastAPI는 이렇게 합니다:
```python
@app.get("/search")
def search(q: Annotated[str, Query(min_length=3, max_length=50)]):
    ...
```
→ FastAPI가 `"q는 반드시 문자 3~50자"` 라고 API 설계에 명시  
→ 잘못된 입력이 오면 FastAPI가 직접 막고 에러 메시지를 반환해요.

크롤링 + 머신러닝 모델 + FastAPI 서빙 관점에서
목표: 크롤링으로 수집한 데이터를 기반으로 ML 모델을 만들고,  FastAPI로 예측 결과를 사용자에게 제공
이때, 사용자가 FastAPI API에 요청을 보낼 때,  
요청 파라미터에 이상한 값이 오면... ❌ 모델이 오작동할 수 있어요.

예를 들어: 사용자 요청
```bash
/predict?brand=삼성&price=10000&category=전자제품
```
문제 상황:
- `price=-100`처럼 말이 안 되는 숫자
- `category=@@@@` → 모델에 없는 데이터
- `brand`가 누락됨

→ 이런 문제가 있으면 모델이 학습된 입력 포맷과 안 맞아서 예측이 불가능하거나 엉뚱한 결과가 나와요.

그래서 FastAPI에서는 "입력값 검증"이 매우 중요합니다!
> 예측 모델에 전달되기 전에 FastAPI가 다음을 자동으로 검사해주는 거예요:

- 이 값이 존재하는가?
- 타입이 맞는가? (int, str 등)
- 범위는 적절한가?
- 형식은 괜찮은가? (ex. 이메일 형식, 한글 제한 등)

쉽게 비유하면:
> Django는 마치 "지하철 무인게이트 없이 승객이 그냥 들어오는 역"이라면  
> FastAPI는 "입구에 신분증 검사와 짐 검색이 있는 공항" 같아요.

- Django는 "개발자가 직접 뒷단에서 걸러야 해요"
- FastAPI는 "들어올 때부터 검사를 자동으로 해줍니다"
---
실제 파라미터 검증을 실습해봅니다.

Annotated란?
	`Annotated`는 "이 변수는 어떤 타입이면서, 이 조건을 따라야 해!" 라고 타입 + 조건을 함께 지정해주는 도구입니다.

예시:
```python
from typing import Annotated
from fastapi import Query

q: Annotated[str, Query(min_length=3, max_length=50)]
```
여기서 `q:`는 클라이언트가 검색할 때 보내는 쿼리 파라미터의 이름입니다.
- `q`는 문자열이고,
- 최소 3자 이상, 최대 50자 이하로 제한할 것이라는 "검증 조건"이 붙어 있음

Annotated 구조 공식 요약
```python
Annotated[기본타입, 추가정보1, 추가정보2, ...]
```

검색 API `/search` 에 다음 조건을 둡니다:
- `q`: 검색 키워드 (3자 이상 50자 이하)
- `limit`: 검색 결과 수 제한 (1~100 사이 정수)
- `offset`: 페이지 스킵 (0 이상 정수)

예시 실습 코드 (query.py)
```python
from typing import Annotated
from fastapi import FastAPI, Query

app = FastAPI()

@app.get("/search")
async def search_items(
    q: Annotated[str, Query(min_length=3, max_length=50, description="검색 키워드")] = ...,
    limit: Annotated[int, Query(ge=1, le=100, description="최대 결과 수 (1~100)")] = 5,
    offset: Annotated[int, Query(ge=0, description="몇 번째 결과부터 시작할지")] = 0,
):
    dummy_data = [f"{q}_result_{i}" for i in range(1, 101)]

    return {
        "query": q,
        "limit": limit,
        "offset": offset,
        "results": dummy_data[offset:offset + limit],
        "message": "검색 성공"
    }
```
이 함수는 `/search` 경로로 GET 요청이 오면 실행되는 API입니다.  
매개변수 3개를 쿼리 파라미터로 받습니다:

- `q (필수)`: 검색어. 반드시 3~50자 사이여야 함
- `limit (선택)`: 몇 개까지 결과를 보여줄지. 기본값 10, 최소 1~최대 100
- `offset (선택)`: 몇 번째부터 시작할지. 기본값 0, 0 이상 정수

---
코드해석:
```python
q: Annotated[str, Query(min_length=3, max_length=50, description="검색 키워드")] = ...,
```
`q`: 검색어 파라미터
`Annotated[...]` → 이건 타입과 조건을 묶어서 설명하는 방식입니다.
- `str` → `q`는 문자열이어야 해요.
- `Query(...)` → FastAPI의 쿼리 파라미터 조건 지정 도구입니다.
	- `min_length=3` → 최소 3자 이상
	- `max_length=50` → 최대 50자 이하
	- `description="검색 키워드"` → Swagger 문서에 표시될 설명
- `= ...` → 필수값이라는 뜻입니다. 이걸 안 보내면 422 에러 발생!
---
```python
limit: Annotated[int, Query(ge=1, le=100, description="최대 결과 수 (1~100)")] = 10,
```
`limit`: 검색 결과 개수 제한(이건 결과를 몇 개까지 보여줄지를 설정합니다.)
`int` → 정수여야 해요.
`Query(...)` 조건:
- `ge=1` → 최소 1 이상
- `le=100` → 최대 100 이하
- `description="최대 결과 수"` → Swagger 설명
`= 10` → 기본값은 10입니다 (입력 안 하면 자동으로 10 사용)
---
```python
 offset: Annotated[int, Query(ge=0, description="몇 번째 결과부터 시작할지")] = 0,
```
`offset`: 시작 위치 지정(검색 결과를 어디서부터 보여줄지 설정하는 파라미터예요.)
`int` → 정수여야 하고
`ge=0` → 0 이상 값만 허용됩니다
`= 0` → 기본값은 0 (즉, 처음부터 시작)

---
```python
dummy_data = [f"{q}_result_{i}" for i in range(1, 101)]
```
결과 데이터 생성
- 가짜 검색 결과(dummy)를 만들어내는 코드입니다.
- `q`가 `"apple"`이면, 결과는 아래처럼 생성돼요:
```python
["apple_result_1", "apple_result_2", ..., "apple_result_100"]
```
---
예시 요청:
```python
/search?q=banana&limit=5&offset=0
```

실행하기
```bash
uvicorn query:app --reload
```

다음 주소로 접속:
```python
http://127.0.0.1:8000/docs
```

Swagger UI 접속
```
http://127.0.0.1:8000/docs
```

`/search` 엔드포인트 찾기
Swagger UI 화면에서 `GET /search` 항목을 찾고, 오른쪽에 있는 **"Try it out"** 버튼 클릭합니다.

###### 파라미터 입력
|이름|예시 입력값|설명|
|---|---|---|
|`q`|banana|(필수) 검색어, 최소 3자|
|`limit`|5|(선택) 결과 개수|
|`offset`|0|(선택) 시작 위치|
그리고 아래쪽의 **Execute** 버튼을 누릅니다.

응답 결과
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

❌ 너무 짧은 문자열 입력 (검증 실패)
```python
q = hi   # 너무 짧은 검색어
```
- 에러 코드: `422`
- 메시지: `"String should have at least 3 characters"`

❌ 2. 최대 초과
```python
limit=500
```
- 에러 코드: `422`
- 메시지: `"Input should be less than or equal to 100"`

✅ 정리: 쿼리 파라미터 검증의 목적

> 클라이언트(브라우저, 앱 등)가 검색을 요청할 때  
> 개발자가 FastAPI의 Query 검증 조건을 걸어두면,  
> FastAPI는 그 조건을 자동으로 검사해서  
> ❌ 잘못된 검색이면 "422 오류"와 함께  
> ✅ 명확한 에러 메시지를 클라이언트에 반환합니다.

예를 들어:
- "검색어는 최소 3자 이상입니다"
- "limit은 1~100 사이여야 합니다"

→ 즉, 클라이언트가 검증 조건에 맞춰 검색하도록 유도하는 자동 방어막이에요.