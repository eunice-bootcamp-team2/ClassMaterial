쿠키(Cookie)란?
- 쿠키는 클라이언트(브라우저)에 저장되는 작은 데이터 조각입니다.
- 내가 어떤 웹사이트에 다녀갔다는 흔적 또는 기록을 내 컴퓨터(브라우저)에 저장해 두는 것입니다.
- 주로 사용자 인증 정보, 추적 정보, 설정 값 등을 저장하는 데 사용됩니다.

CSRF : Cross-Site Request Forgery (사이트 간 요청 위조)
- 사용자의 인증 정보를 도용해서 원하지 않는 요청을 보내는 공격

Django에서 CSRF 방지 방법 2가지 
HTML Form 방식
```html
<form method="POST">
  {% csrf_token %}
  <input type="text" name="title" />
</form>
```

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
이 코드가 하는 일은?
- `/items/` 경로로 GET 요청이 들어왔을 때
- 요청에 포함된 쿠키 중 `ads_id`라는 쿠키가 있는지 확인
- 있다면 그 값을 응답 JSON에 포함
- 없다면 `None` 반환

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
위의 코드로 FastAPI의 `Cookie()` 파라미터  결과와 브라우저의 쿠키 저장 상태(DevTools > 애플리케이션 탭)를 함께 보여주고 있어요.
![[Pasted image 20250713142917.png]]
FastAPI로 만든 `/items/` 엔드포인트에서 클라이언트(브라우저)의 쿠키 중 `ads_id` 값을 읽어오는 API를 작성했고,  브라우저에는 여러 쿠키가 저장되어 있지만 `ads_id`는 아직 설정되지 않아서 null로 나오는 상황입니다.

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

![[Pasted image 20250713165100.png]]

---
두개의 쿠키 시스템 비교:

Django는 “자동 쿠키 시스템”
- 로그인 하면 `sessionid`라는 쿠키를 브라우저에 자동 저장
- 이후 요청 시 이 쿠키로 로그인 상태를 자동 확인
- `request.user`를 통해 사용자 정보 자동 제공
👉 로그인 처리부터 쿠키 저장/인증까지 다 해줌

---
FastAPI는 “수동 쿠키 시스템”
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
📌 요약 한 문장
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

그러나 결론적으로 말하면 — 프레임워크마다 "모두 쿠키설정을 해줘야 하는 건" 아닙니다.  프로젝트 성격상 어떤 구조를 선택하느냐에 따라 누가 어떤 역할을 맡는지가 달라집니다.

시나리오 1: FastAPI 단독 백엔드 (React + FastAPI)
- FastAPI가 로그인 API 제공 (`/login`)
- FastAPI가 JWT 생성해서 쿠키로 내려줌 (`Set-Cookie`)
- React는 `axios`에 `withCredentials: true` 설정만 해주면 됨
- ❌ React는 쿠키 신경 안 써도 됨
    
📌 이 경우 FastAPI가 인증 전담, 프론트는 UI만 담당

---
시나리오 2: Django + FastAPI 공존

- Django는 Admin과 회원가입, 로그인 처리 담당 (세션 기반)
- FastAPI는 API만 제공 (쿠키나 인증 없이 데이터 응답만)
- 프론트는 필요한 데이터만 API로 받음
- ❌ FastAPI는 인증 처리 안 해도 됨 (역할 분담됨)
    
📌 이 경우 Django가 인증 전담, FastAPI는 인증 없는 API 전담

---
시나리오 3: React에서 JWT 직접 관리
- FastAPI는 JWT 토큰만 발급 (`/login` → `{access_token: xxx}`)
- React가 `localStorage`에 저장 후 `axios` 헤더에 직접 붙임
- ❌ 쿠키도 필요 없음 (쿠키 저장/확인 X)
    
📌 이 경우 React가 인증 흐름을 담당, FastAPI는 토큰 검증만 함
