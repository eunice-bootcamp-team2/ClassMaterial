### 쿠키(Cookie)란?
쿠키는 사용자의 브라우저(클라이언트)에 저장되는 작은 데이터 조각입니다.

쉽게 말하면, 사용자가 어떤 웹사이트를 방문했다는 기록이나 정보를  
사용자의 컴퓨터(브라우저)에 저장해 두는 것이라고 생각하시면 됩니다.

웹사이트는 이 쿠키를 이용하여 다음과 같은 정보를 저장합니다.
- 로그인 상태 유지
- 사용자 설정값 저장
- 방문 기록 추적
- 사용자 인증 정보 관리
    
예를 들어, 어떤 사이트에 로그인하면  
브라우저에는 로그인 정보를 확인하기 위한 쿠키가 저장됩니다.  
그래서 페이지를 새로고침해도 계속 로그인 상태가 유지되는 것입니다.


### CSRF란?
CSRF는 Cross-Site Request Forgery의 약자입니다.  
한국어로는 사이트 간 요청 위조 공격이라고 합니다.

이 공격은 다음과 같은 방식으로 발생합니다.
1. 사용자가 어떤 사이트에 로그인되어 있는 상태입니다.
2. 공격자가 사용자를 속여서 특정 요청을 보내도록 합니다.
3. 서버는 사용자의 인증 정보를 가지고 있기 때문에  
    사용자가 직접 요청한 것처럼 처리해버립니다.
    
즉, 사용자가 원하지 않는 요청이 서버로 전달되는 공격 방식입니다.

Django에서 CSRF를 방지하는 방법:
Django에서는 CSRF 공격을 방지하기 위해 CSRF Token이라는 보안 토큰을 사용합니다.

대표적으로 두 가지 방법이 있는것을 우리는 이미 배웠습니다.

HTML Form 방식
```html
<form method="POST">
  {% csrf_token %}
  <input type="text" name="title" />
</form>
```
이 코드는 CSRF 토큰을 자동으로 생성해서 form 안에 넣어주는 역할을 합니다.
이 토큰이 서버에서 발급한 값과 동일해야 서버가 요청을 정상 요청으로 인정합니다.

JS + Axios 방식 (SPA, 비동기 요청)
```js
const csrfToken = getCookie('csrftoken');  // 전역 유틸에서 읽음

axios.post('/create/', { title: '내용' }, {
  headers: {
    'X-CSRFToken': csrfToken
  },
  withCredentials: true
});
```
여기서 동작 과정은 다음과 같습니다.

1️⃣ 브라우저에 저장된 csrftoken 쿠키를 읽습니다  
2️⃣ 그 값을 HTTP 요청 헤더에 포함시킵니다  
3️⃣ 서버는 토큰을 확인하고 요청을 허용합니다.

`csrftoken`은 어떻게 생성될까?
Django는 로그인하거나 페이지를 요청할 때, 브라우저에게 아래 쿠키를 내려줍니다:
```http
Set-Cookie: csrftoken=abc123; path=/; SameSite=Lax
```
이후 클라이언트가 이 값을 꺼내서 요청에 포함시키는 것입니다.

---
그렇다면 FastAPI에서 쿠키 파라미터 받는 코드
```python
from fastapi import Cookie, FastAPI

app = FastAPI()

@app.get("/items/")
async def read_items(ads_id: str | None = Cookie(default=None)):
    return {"ads_id": ads_id}
```

FastAPI 서버 실행
```bash
uvicorn main:app --reload
```

이 코드가 하는 일은?
- 브라우저가 `/items/`로 요청을 보냄
- 요청에 포함된 쿠키 중 `ads_id`라는 쿠키가 있는지 확인
- 있으면 값 반환
- 없으면 `None` 반환![[Pasted image 20260312131140.png]]

브라우저에 ads_id 쿠키가 없기 때문에 null이 정상입니다.

코드 구성요소의 의미:
`@app.get("/items/")`: 	
- 이 함수는 /items/ 주소로 들어온 GET 요청을 처리해요	
- 의사코드: "이 주소로 요청하면 이 함수를 실행해줄게"

`async`: 비동기 프로그래밍을 할 수 있도록 해주는 키워드
- 파이썬 3.5이상부터 제공하는 비동기 함수선언입니다.
```python
# 비동기 함수 예시코드
import asyncio

async def read_data():
    await asyncio.sleep(5)  # 5초 기다리는 동안 다른 작업 가능
    return "data"

# await: 시간이 오래 걸리는 작업(예: 파일 읽기, API 요청 등)을 기다림
# 장점: CPU 낭비 없이 효율적인 처리 가능
```

`ads_id: str | None = Cookie(default=None)`:
- ads_id라는 쿠키를 받아요	
- 쿠키 이름이 ads_id인 값을 자동으로 읽어요
`return {"ads_id": ads_id}`:	
- 받은 값을 그대로 JSON으로 반환	
- 브라우저에서 쿠키가 잘 넘어왔는지 확인할 수 있어요
---
쿠키를 저장하는 코드
```python
from fastapi import Cookie, FastAPI, Response


@app.get("/set-cookie/")
def set_cookie(response: Response):
    response.set_cookie(key="ads_id", value="abc123")
    return {"message": "ads_id 쿠키가 저장되었습니다!"}
```
- `GET` 방식으로 `/set-cookie/` 주소를 요청하면,  
-  FastAPI가 응답(Response) 에 `Set-Cookie` 헤더를 포함시켜  
-  브라우저가 쿠키에 `ads_id`를 저장하게 되는 구조입니다.

브라우저에서 확인합니다. http://127.0.0.1:8000/set-cookie/
![[Pasted image 20260305190022.png]]

### 두개의 쿠키 시스템 비교:

Django는 자동 쿠키 시스템
- 로그인 하면 `sessionid`라는 쿠키를 브라우저에 자동 저장
- 이후 요청 시 이 쿠키로 로그인 상태를 자동 확인
- `request.user`를 통해 사용자 정보 자동 제공
👉 로그인 처리부터 쿠키 저장/인증까지 다 해줌

---
FastAPI는 수동 쿠키 시스템
- 쿠키를 저장하고 싶으면 직접 명령어로 저장
```python
response.set_cookie(key="token", value="abc123")
```

읽을 때도 함수 매개변수로 직접 받아야 함
```python
def read(cookie_val: str = Cookie(None)):
```
- 로그인 유지 등은 직접 구현해야 함
    - 쿠키에 JWT 저장하거나
    - Redis 등에 세션 저장해서 검증하는 방식
👉 더 유연하지만 직접 구현해야 함

---
요약 한 문장
> Django: 쿠키/세션/로그인을 자동으로 처리해주는 프레임워크  
> FastAPI: 쿠키/세션/인증을 직접 구현해서 사용할 수 있는 프레임워크

다시 한 번 명확히 정리하면:
DRF (Django REST Framework) 
- 기본적으로 세션과 쿠키를 지원함
- 로그인 시 자동으로 `sessionid` 쿠키를 내려주고,
- 자바스크립트에서 쿠키를 읽거나  
    `axios`로 요청 시 `withCredentials: true` 설정하면  
    → 자동으로 쿠키 전송됨
💡 즉, 자동 + 수동 둘 다 가능함

FastAPI
- 세션 시스템이 내장되어 있지 않음
- 따라서 쿠키를 저장하고 읽는 것 모두 직접 구현해야 함
    - `response.set_cookie(...)`
    - `@app.get(..., Cookie(...))`
- 자바스크립트에서 axios로 쿠키 처리할 때도  
    `withCredentials: true` 설정해야 쿠키가 전송됨  

---
웹 서비스에서 인증 정보(JWT, session)를 누가 관리하느냐에 따라 쿠키를 누가 만들고 보내는지가 달라집니다.

쿠키를 누가 만들고 관리하느냐? 가능한 주체는 3개입니다.
```
1️⃣ 백엔드 (FastAPI)  
2️⃣ 백엔드 (Django)  
3️⃣ 프론트엔드 (React)
```

시나리오 1️⃣ ] FastAPI 단독 백엔드
```
React → FastAPI  
(프론트) (백엔드)
```

로그인 흐름
```
1️⃣ React → /login 요청  
2️⃣ FastAPI → JWT 생성  
3️⃣ FastAPI → 쿠키로 내려줌  
4️⃣ 브라우저 → 쿠키 저장  
5️⃣ 이후 요청마다 쿠키 자동 전송
```

```
React
   │ 로그인 요청
   ▼
FastAPI
   │ JWT 생성
   ▼
Set-Cookie: token=xxxxx
   ▼
브라우저 저장
   ▼
이후 요청마다 자동 전송
```

FastAPI 코드
```python
@app.post("/login")
def login(response: Response):
    token = create_jwt()

    response.set_cookie(
        key="access_token",
        value=token
    )

    return {"message": "login success"}
```

- FastAPI가 로그인 API 제공 (`/login`)
- FastAPI가 JWT 생성해서 쿠키로 내려줌 (`Set-Cookie`)
- React는 `axios`에 `withCredentials: true` 설정만 해주면 됨
- ❌ React는 쿠키 신경 안 써도 됨
    
이 경우 FastAPI가 인증 전담하여 React는 신경 쓸 게 거의 없습니다.

---
시나리오 2️⃣ ] Django + FastAPI 공존
```
React / HTML
        │
        ▼
      Django
        │
        ▼
     FastAPI
```

```
1️⃣ Django 로그인  
2️⃣ Django → sessionid 쿠키 생성  
3️⃣ 브라우저 저장  
4️⃣ 이후 요청마다 쿠키 자동 전송  
5️⃣ FastAPI는 인증 없이 데이터만 제공
```

```
React
   │
   ▼
Django 로그인
   │
   ▼
Set-Cookie: sessionid=xxxxx
   ▼
브라우저 저장
   ▼
FastAPI는 그냥 데이터만 제공
```

```
즉,
쿠키 생성 → Django  
FastAPI → 인증 신경 안씀
```

FastAPI 코드
```python
@app.get("/restaurants")
def restaurants():
    return data
```
인증 코드 없습니다.

- Django는 Admin과 회원가입, 로그인 처리 담당 (세션 기반)
- FastAPI는 API만 제공 (쿠키나 인증 없이 데이터 응답만)
- 프론트는 필요한 데이터만 API로 받음
- ❌ FastAPI는 인증 처리 안 해도 됨 (역할 분담됨)
    
이 경우 Django가 인증 전담, FastAPI는 인증 없는 API 전담

---
시나리오 3️⃣ ] React에서 JWT 직접 관리
```
React → FastAPI
```
하지만 쿠키를 안 씁니다.

로그인 흐름
```
1️⃣ React → /login 요청  
2️⃣ FastAPI → JWT 반환  
3️⃣ React → localStorage 저장  
4️⃣ React → 요청마다 헤더에 붙임
```

```
React
   │ 로그인
   ▼
FastAPI
   │
   ▼
{access_token: xxx}
   ▼
React localStorage 저장
   ▼
axios 요청
Authorization: Bearer xxx
```

FastAPI 코드
```python
@app.post("/login")
def login():
    token = create_jwt()
    return {"access_token": token}
```

React코드
```js
axios.get("/api", {
 headers: {
   Authorization: "Bearer " + token
 }
})
```

```
이 경우
쿠키 사용 ❌  
React가 토큰 관리
```

- FastAPI는 JWT 토큰만 발급 (`/login` → `{access_token: xxx}`)
- React가 `localStorage`에 저장 후 `axios` 헤더에 직접 붙임
- ❌ 쿠키도 필요 없음 (쿠키 저장/확인 X)
    
이 경우 React가 인증 흐름을 담당, FastAPI는 토큰 검증만 함

실무에서 가장 흔한 구조
```
Django
 ├ 로그인
 ├ 회원관리
 ├ Admin
 └ JWT 발급

FastAPI
 ├ AI 모델
 ├ 추천 API
 └ 데이터 분석 API
```

즉
```
인증 → Django
AI API → FastAPI
```