### CORS란?
	CORS(Cross-Origin Resource Sharing)는 서로 다른 출처(origin)의 웹사이트나 
	프론트엔드 앱이 FastAPI 서버의 리소스(API)를 요청할 수 있도록 허용하는 보안 정책입니다.

CORS가 왜 필요한가요?
	브라우저 보안 정책 중 Same-Origin Policy(동일 출처 정책) 때문입니다.
	이 정책은 다른 출처(origin)의 웹사이트가 내 웹서버의 API에 마음대로 접근하지 못하도록 막아줍니다.
	
예를 들어,
- 프론트엔드가 `http://localhost:3000`
- 백엔드가 `http://localhost:8000`  
    이 경우, 포트 번호가 다르므로 출처가 다르다고 간주되어 CORS 문제가 발생합니다.
	
CORS 차단이 발생하는 상황:
	다른 Origin(출처)에서 API 요청을 보낼 때,  서버가 그 Origin을 허용하지 않으면 차단됩니다.

차단 발생 조건은?
브라우저는 다음 중 하나라도 다르면 "다른 Origin"으로 판단합니다:

| 항목       | 설명            | 예시                                                   |
| -------- | ------------- | ---------------------------------------------------- |
| 프로토콜   . | http vs https | ❌ `http://localhost:8000` ≠ `https://localhost:8000` |
| 도메인      | 도메인이 다름       | ❌ `http://localhost` ≠ `http://127.0.0.1`            |
| 포트       | 포트 번호 다름      | ❌ `http://localhost:8000` ≠ `http://localhost:3000`  |

### 실제 차단 예시 상황:

로컬 개발 중
- 백엔드: `http://localhost:8000` (backend)
- 프론트엔드: `http://localhost:3000` (React)

리액트(프론트엔드)와 FastAPI/Django(백엔드)가 같은 프로젝트에서 일하더라도,  
주소가 다르면 브라우저는 “다른 출처”로 인식해서 차단할 수 있어요.

이 둘은 내 컴퓨터 안에서 실행되지만 출처(Origin)이 다르기 때문에  브라우저는 자동으로 CORS 정책을 적용해서 차단할 수 있어요.

CORS 차단을 피하려면:
프론트엔드가 실행되는 주소(Origin)를 FastAPI 서버에서 미리 허용해줘야 합니다.

FastAPI에서 CORS 차단 안 당하게 설정하는 완성 코드
`cors.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 프론트엔드가 요청을 보낼 Origin 주소들
origins = [
    "http://localhost",             # 기본 개발 서버
    "http://localhost:3000",        # React 개발 서버
    "http://localhost:8000",        # Vue 개발 서버
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    "https://localhost",            # https 환경 테스트용
    "http://localhost.tiangolo.com" # FastAPI 예제 도메인
]

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    # 위에 정의한 출처만 허용
    allow_credentials=True,   # 쿠키, 인증 허용
    allow_methods=["*"]     # 모든 메서드 허용 (GET, POST, PUT 등)
    allow_headers=["*"]       # 모든 헤더 허용
)

# 예시 라우터
@app.get("/")
async def root():
    return {"message": "CORS OK! Hello from FastAPI"}
```

모두 허용하고 싶다면 이렇게 작성할 수 있어요:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],  # 빈 리스트로 두고
    allow_origin_regex=r"https://.*\.example\.org",# 정규표현식 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Custom-Header"],
    # 응답에서 브라우저에 노출할 커스텀 헤더 (필요할 경우)
    
    max_age=600  # 프리플라이트 결과를 브라우저가 600초 동안 캐시
)
```

잘 적용되었는지 확인하기
- F12 눌러서 개발자도구 열기
- Network 탭 선택
- API 요청 실행 (`axios`, `fetch` 등으로)
- 요청 항목 클릭 → Response Headers 확인
- 아래와 같은 헤더가 있으면 CORS 허용된 것:
```python
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: *
access-control-allow-headers: *
```

테스트코드:
```consol
fetch("http://localhost:8000/", {
  method: "GET",
  credentials: "include"  // withCredentials과 동일
})
  .then(res => res.json())
  .then(data => console.log("CORS 응답 OK!",data))
  .catch(err => console.error("CORS 오류!", err));
```

CORS 차단 테스트 "성공" 메시지
```
Promise {<pending>}
VM21:6 CORS 응답 OK!
{message: 'CORS OK! Hello from FastAPI'}
```

React(프론트엔드)와 FastAPI(백엔드)를 따로 띄워서 개발할 경우, FastAPI에서는 CORS 차단 방지 설정을 반드시 해야 합니다.

Origin	요청을 보내는 페이지의 주소`(예: http://localhost:3000)`
Host	요청을 받는 서버 주소`(예: http://localhost:8000)`

html로 차단방지코드 작성예시:
```html
<!-- test.html -->
<!DOCTYPE html>
<html>
  <body>
    <button onclick="callApi()">API 요청</button>

    <script>
      function callApi() {
        fetch("http://localhost:8000/", {
          method: "GET",
          credentials: "include"
        })
          .then(res => res.json())
          .then(data => alert("성공: " + JSON.stringify(data)))
          .catch(err => alert("CORS 오류: " + err));
      }
    </script>
  </body>
</html>
```

CORS 차단 방지 코드는 백엔드(FastAPI)에서 작성해야 합니다.
브라우저는 보안상 규칙(Same-Origin Policy)에 따라, 다른 출처(origin) 로 요청을 보낼 때 
"서버가 허락해야만" 요청을 허용합니다.
- 프론트에서 `fetch()`나 `axios()`로 아무리 잘 요청해도
- 백엔드(FastAPI)에서 `"너는 허용된 origin이야"` 라고 설정하지 않으면
- 브라우저가 자체적으로 요청을 막습니다