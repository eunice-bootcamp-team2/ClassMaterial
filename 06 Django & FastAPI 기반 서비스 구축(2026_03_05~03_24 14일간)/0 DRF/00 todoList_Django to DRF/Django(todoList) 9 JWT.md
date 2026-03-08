
1️⃣ 현재까지 만들어진 로그인 방식 (세션 방식)
지금까지는 Django 기본 로그인 방식 = 세션(Session) 입니다.

동작 흐름은 다음과 같습니다.
```
1. 사용자가 로그인 요청
2. 서버가 로그인 성공 확인
3. 서버가 sessionid 쿠키를 브라우저에 저장
4. 이후 요청마다 브라우저가 sessionid 자동 전송
5. 서버가 sessionid로 사용자 확인
```
즉 로그인 상태를 서버가 기억하는 방식입니다.
```
브라우저
   │
   │ sessionid 쿠키
   ▼
Django 서버 (세션 저장)
```
그래서 지금은 `request.user`가 자동으로 동작합니다. 

2️⃣ 바꾸려는 방식 (JWT 방식)
JWT는 서버가 로그인 상태를 저장하지 않습니다.
대신 토큰을 사용자에게 발급합니다.
```
1. 로그인 요청
2. 서버가 JWT 토큰 발급
3. 브라우저가 토큰 저장
4. 이후 요청마다 토큰을 Authorization 헤더로 전송
5. 서버는 토큰을 검사해서 사용자 확인
```
구조
```
브라우저
   │
   │ Authorization: Bearer 토큰
   ▼
Django 서버 (토큰 검증만)
```
즉 로그인 상태를 토큰으로 증명하는 방식입니다.

3️⃣ 변환 순서 (실무에서 실수 줄이는 순서)
1. JWT 라이브러리(simplejwt) 설치/설정 → settings.py 변경
2. 로그인 API를 JWT 발급으로 교체 (`/api/login/` → 토큰 발급)
3. axios 공통 인스턴스에서 Authorization 자동 부착
4. todo API 호출들이 401 없이 동작하는지 확인
5. refresh 로직 추가(만료 자동 재발급)
6. 로그아웃 UX(토큰 삭제/블랙리스트) 정리
7. header 표시 방식 정리(템플릿 vs JS)

---
### 1️⃣ 먼저 이해해야 하는 핵심 (세션 → JWT)

#### 기존 방식 (세션 인증)

로그인하면
```
서버 → sessionid 쿠키 발급
```

이후 요청
```
브라우저가 sessionid 자동 전송
```

서버는
```
sessionid → 사용자 확인
```
즉 서버가 로그인 상태를 저장합니다.

#### JWT 기반

로그인하면
```
서버 → access token + refresh token 발급
```

이후 요청
```
Authorization: Bearer access_token
```
이렇게 요청 헤더에 토큰을 붙여서 보내야 합니다.

서버는
```
토큰 서명 검증 → 사용자 확인
```
즉 로그인 상태를 서버가 저장하지 않습니다.

---
### 2️⃣ JWT로 바꿀 때 작업 순서 (실무에서 많이 쓰는 순서)

`1. settings.py 설정 변경`
먼저 Django가 JWT 인증을 사용하도록 설정해야 합니다.

지금은
```
SessionAuthentication
```
을 사용하고 있습니다.

이것을
```
JWTAuthentication
```
으로 변경합니다.

즉, Django가 세션 대신 JWT 토큰으로 사용자를 확인하도록 만드는 단계입니다.

---
`2. accounts 앱 로그인 방식 변경`

지금 로그인 방식
```
/api/login/  
→ authenticate()  
→ login()  
→ 세션 생성
```

JWT 방식에서는
```
/api/login/  
→ access 토큰 발급  
→ refresh 토큰 발급
```
즉 로그인하면 세션이 아니라 토큰을 받게 됩니다.

로그아웃도 바뀝니다.

세션 방식
```
logout()  
→ 서버에서 세션 삭제
```

JWT 방식
```
브라우저에서 토큰 삭제
```
즉 토큰을 지우면 로그아웃입니다.

---
`3. 프론트(JS)에서 인증 방식 변경`

지금 방식
```
쿠키(sessionid) 자동 전송
```

그래서
```
withCredentials  
CSRF 토큰
```
을 사용했습니다.

JWT 방식에서는
```
Authorization: Bearer access_token
```
을 모든 요청에 직접 붙여야 합니다. 그래서 axios 설정을 바꿔야 합니다. 

또한 토큰이 만료되면
```
refresh 토큰으로 access 재발급
```
하는 로직도 추가할 수 있습니다.

---
`4. API 요청 방식 확인`

JWT 방식에서는 토큰이 없으면
```
401 Unauthorized
```
가 발생합니다. 그래서 모든 API 요청에 토큰이 붙어 있는지 확인해야 합니다.

좋은 점은 보통
```
settings.py
```
에서 인증 클래스를 바꾸면 대부분의 API 코드는 수정하지 않아도 됩니다.

---
`5. 로그인 UI 표시 방식 변경`
여기가 중요한 부분입니다.
세션 방식에서는 템플릿에서 바로 로그인 상태를 확인할 수 있습니다.

예
```
{% if request.user.is_authenticated %}
```

하지만 JWT 방식에서는 서버 템플릿이 토큰을 알 수 없습니다. 그래서 보통 이렇게 합니다.

방법 1 (가장 흔함)
```
JS에서 토큰 존재 여부 확인
```

예
```
localStorage에 토큰 있으면 로그인 상태
```

방법 2
```
JWT를 쿠키에 저장
```

하지만 이 방법은 설정이 더 복잡합니다. 그래서 대부분 JS로 로그인 상태를 관리합니다.

---
전체 흐름 한 번에 정리

JWT 방식 로그인 흐름
```
로그인  
↓  
서버가 access / refresh 토큰 발급  
↓  
브라우저가 토큰 저장  
↓  
API 요청 시 Authorization 헤더에 토큰 첨부  
↓  
서버가 토큰 검증 후 사용자 확인
```

---
### 세션에서 JWT로 변환

1️⃣단계:  JWT 라이브러리(simplejwt) 설치
```bash
uv pip install djangorestframework-simplejwt
```

`mysite/settings.py` : JWT + DRF 기본 설정
```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "todo",
    "accounts",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # 1) JWT 우선
        "rest_framework_simplejwt.authentication.JWTAuthentication",

        # 2) 전환기 안전장치(선택): 기존 세션도 허용
        #    모든 프론트가 JWT로 바뀐 후 제거 가능
        "rest_framework.authentication.SessionAuthentication",
    ],

    # 실무 기본: 기본은 잠그고, 인증/회원가입 뷰만 AllowAny로 예외 처리
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    # 페이지 네이션
    "DEFAULT_PAGINATION_CLASS": "todo.pagination.CustomPageNumberPagination",
    "PAGE_SIZE": 3,

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
```

`mysite/settings.py`  : 만료 시간/헤더 타입
```python
from datetime import timedelta

SIMPLE_JWT = {
    # access는 짧게(보안), refresh는 길게(편의)
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=300),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=365),

    # Authorization: Bearer <token>
    "AUTH_HEADER_TYPES": ("Bearer",),

    # (5~6단계에서 다룰 것들 - 지금은 False로 두고 시작 권장)
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}
```

1단계는 설치/설정이니까, 여기까지 한 뒤 서버를 켜서 에러 없이 부팅되는지만 확인하면 완료
```bash
python manage.py runserver
```
---
2️⃣단계: 로그인 API를 JWT 발급으로 교체
- 기존: `/api/login/` → 세션을 만드는 로그인( `login(request, user)` )
- 변경: `/api/login/` → JWT 발급(access/refresh 반환)
- `/api/token/refresh/` → refresh로 access 재발급

`accounts/urls.py`
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import SignupAPIView, SessionLogoutAPIView  
from .views_page import LoginPageView, SignupPageView

urlpatterns = [
    # API
    path("api/signup/", SignupAPIView.as_view(), name="api-signup"),

    # JWT 로그인(토큰 발급): access + refresh 반환
    path("api/login/", TokenObtainPairView.as_view(), name="jwt-login"),

    # access 만료 시 refresh로 재발급
    path("api/token/refresh/", TokenRefreshView.as_view(), name="jwt-refresh"),

    # (임시 유지) 세션 로그아웃 API - JWT에서는 의미가 약함 (6단계에서 정리 권장)
    path("api/logout/", SessionLogoutAPIView.as_view(), name="api-logout"),

    # Pages
    path("signup-page/", SignupPageView.as_view(), name="page-signup"),
    path("login/", LoginPageView.as_view(), name="page-login"),
]
```

`accounts/views.py` 정리 (세션 로그인은 더 이상 필요 없음)
```python
from django.contrib.auth import logout # 세션 로그인은 더 이상 필요 없음
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated # 추가

from .serializers import SignupSerializer


class SignupAPIView(APIView):
    """
    회원가입은 JWT/세션과 무관하게 그대로 사용
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "회원가입 완료"}, status=status.HTTP_201_CREATED)


# 2단계부터는 SessionLoginAPIView가 필요 없음
# - /api/login/ 은 accounts/urls.py에서 TokenObtainPairView가 처리 (JWT 발급)
# - 따라서 authenticate/login 로직 제거


class SessionLogoutAPIView(APIView):
    """
    ⚠️ 전환기 임시 로그아웃(세션 정리용)
    - JWT 환경에서 '로그아웃'은 보통 프론트에서 토큰 삭제로 처리합니다.
    - 그래도 혹시 남아있을 수 있는 세션을 logout(request)로 정리해줍니다.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "로그아웃(세션 정리)"}, status=status.HTTP_200_OK)
```

`로그인 페이지(login.html) JS변경` 
`templates/accounts/login.html`
```html
{% extends "auth_base.html" %}

{% block title %}로그인{% endblock %}

{% block content %}
<section class="auth-card">
  <h2>로그인</h2>

  <input id="username" placeholder="username">
  <input id="password" placeholder="password" type="password">
  <button id="loginBtn">로그인</button>

  <p style="margin-top:12px;">
    아직 계정이 없나요? <a href="/signup-page/">회원가입</a>
  </p>
</section>
{% endblock %}

{% block scripts %}
<script>
document.addEventListener("DOMContentLoaded", () => {

  // [수정됨] 기존: const api = axios.create({ baseURL: "/"});
  // const api = axios.create({ baseURL: "/" }); 
  // ❌ [삭제됨] window.api 공통 인스턴스로 통일

  // [추가됨] 공통 axios 인스턴스(window.api) 존재 여부 체크
  // - auth_base.html에서 static/js/api.js 로드가 되어 있어야 함
  if (!window.api) {
    console.error("window.api가 없습니다. auth_base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return; // [추가됨] api 없으면 여기서 중단
  }

  // (선택) 토큰 키 이름: 프로젝트에서 공통으로 쓰기 좋게 상수화
  const ACCESS_KEY = "access_token";
  const REFRESH_KEY = "refresh_token";

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      // [수정됨] username 값에 trim() 추가 (공백 입력 방지)
      const username = document.getElementById("username").value.trim(); // ✅ 변경
      const password = document.getElementById("password").value;

      // (선택) 입력값 간단 검증
      if (!username || !password) {
        alert("username / password를 입력해주세요.");
        return;
      }

      // (선택) 이전 토큰 제거 (충돌 방지)
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);

      // [수정됨] 기존: api.post(...)
      // const res = await api.post("/api/login/", { username, password }); 
      // ❌ [삭제됨]
      
      // 변경: window.api.post(...) 사용
      // 로그인 요청 자체는 토큰이 없으므로 Authorization이 없어도 정상
      const res = await window.api.post("/api/login/", { username, password }); 
      // ✅ 변경

      const access = res.data?.access;
      const refresh = res.data?.refresh;

      if (!access || !refresh) {
        console.log("토큰 응답이 이상함:", res.data);
        alert("로그인 응답에 토큰이 없습니다. 서버 응답을 확인하세요.");
        return;
      }

      // 토큰 저장
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);

      // 로그인 성공 후 메인(list)로
      window.location.href = "/todo/list/";
    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("로그인 실패");
    }
  });
});
</script>
{% endblock %}
```

로그아웃 UX는 아직 세션처럼 끝나지 않음 (하지만 2단계에서 최소 처리 가능)
`header.html`에서 `<script>` 부분만 교체
```html
<script>
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // JWT 로그아웃 = 토큰 삭제
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    // 로그인 페이지로 이동
    window.location.href = "/login/";
  });
});
</script>
```


2단계 완료 체크(꼭 확인)
1. 로그인 버튼 클릭
2. 개발자도구 → Application → Local Storage에
    - `access_token`
    - `refresh_token` 저장됐는지 확인
![[Pasted image 20260222124137.png]]

![[Pasted image 20260222125304.png]]

---
3️⃣ axios 공통 인스턴스에서 Authorization 자동 부착

공통 axios를 만들면 앞으로는 아래와 같이 사용하면 됩니다.
```js
api.get(...)  
api.post(...)  
api.patch(...)  
api.delete(...)
```
`axios.create 절대 다시 만들 필요 없습니다.`

`static/js/api.js` : 공통 axios 인스턴스
```js
// static/js/api.js

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// access 토큰 읽기
function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

// refresh 토큰 읽기 (4~5단계에서 사용)
function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

// ✅ 전역 axios 인스턴스 생성
window.api = axios.create({
  baseURL: "/",   // same-origin
  timeout: 15000,
});

// ✅ 모든 요청에 Authorization 자동 부착
window.api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

`base.html`
```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>  
<script src="{% static 'js/api.js' %}"></script>
```

auth_`base.html
```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>  
<script src="{% static 'js/api.js' %}"></script>
```

`templates/accounts/login.html`
```html
{% extends "auth_base.html" %}

{% block title %}로그인{% endblock %}

{% block content %}
<section class="auth-card">
  <h2>로그인</h2>

  <input id="username" placeholder="username">
  <input id="password" placeholder="password" type="password">
  <button id="loginBtn">로그인</button>

  <p style="margin-top:12px;">
    아직 계정이 없나요? <a href="/signup-page/">회원가입</a>
  </p>
</section>
{% endblock %}

{% block scripts %}
<script>
document.addEventListener("DOMContentLoaded", () => {

  // ✅ [수정됨] 기존: const api = axios.create({ baseURL: "/"});
  // const api = axios.create({ baseURL: "/" }); 
  // ❌ [삭제됨] window.api 공통 인스턴스로 통일

  // ✅ [추가됨] 공통 axios 인스턴스(window.api) 존재 여부 체크
  // - auth_base.html에서 static/js/api.js 로드가 되어 있어야 함
  if (!window.api) {
    console.error("window.api가 없습니다. auth_base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return; // ✅ [추가됨] api 없으면 여기서 중단
  }

  // (선택) 토큰 키 이름: 프로젝트에서 공통으로 쓰기 좋게 상수화
  const ACCESS_KEY = "access_token";
  const REFRESH_KEY = "refresh_token";

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      // ✅ [수정됨] username 값에 trim() 추가 (공백 입력 방지)
      const username = document.getElementById("username").value.trim(); // ✅ 변경
      const password = document.getElementById("password").value;

      // (선택) 입력값 간단 검증
      if (!username || !password) {
        alert("username / password를 입력해주세요.");
        return;
      }

      // (선택) 이전 토큰 제거 (충돌 방지)
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);

      // ✅ [수정됨] 기존: api.post(...)
      // const res = await api.post("/api/login/", { username, password }); 
      // ❌ [삭제됨]
      
      // ✅ 변경: window.api.post(...) 사용
      // ⚠️ 로그인 요청 자체는 토큰이 없으므로 Authorization이 없어도 정상입니다. (설명 주석 추가됨)
      const res = await window.api.post("/api/login/", { username, password }); // ✅ 변경

      const access = res.data?.access;
      const refresh = res.data?.refresh;

      if (!access || !refresh) {
        console.log("토큰 응답이 이상함:", res.data);
        alert("로그인 응답에 토큰이 없습니다. 서버 응답을 확인하세요.");
        return;
      }

      // 토큰 저장
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);

      // 로그인 성공 후 메인(list)로
      window.location.href = "/todo/list/";
    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("로그인 실패");
    }
  });
});
</script>
{% endblock %}
```
- DevTools → Network 탭 켜고
- 로그인 버튼 클릭
- `/api/login/` 요청이 딱 1번 발생하는지 확인
    
여기서 흔한 문제
- DOMContentLoaded가 중복 실행되거나, 이벤트 리스너가 중복 등록되어 **요청이 2번** 나가는 경우
- URL이 잘못되어 404/405 나는 경우

![[Pasted image 20260222140644.png]]

![[Pasted image 20260222140702.png]]


`templates/accounts/signup.html`
```html
{% extends "auth_base.html" %}

{% block title %}회원가입{% endblock %}

{% block content %}
<section class="auth-card">
  <h2>회원가입</h2>

  <input id="username" placeholder="username">
  <input id="password" placeholder="password" type="password">
  <input id="password2" placeholder="password 확인" type="password">
  <button id="signupBtn">가입</button>

  <p style="margin-top:12px;">
    이미 계정이 있나요? <a href="/login/">로그인</a>
  </p>
</section>
{% endblock %}

{% block scripts %}
<script>
document.addEventListener("DOMContentLoaded", () => {

//[수정됨] 기존: const api = axios.create({ baseURL: "/", withCredentials: true });
  // const api = axios.create({ baseURL: "/", withCredentials: true }); 
  // ❌ [삭제됨] window.api 공통 인스턴스로 통일

  // [추가됨] 공통 axios 인스턴스(window.api) 존재 여부 체크
  // (auth_base.html에서 static/js/api.js를 로드해야 함)
  if (!window.api) {
    console.error("window.api가 없습니다. auth_base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return; // ✅ [추가됨] api 없으면 중단
  }

  // [삭제됨] 기존: CSRF 토큰을 쿠키에서 꺼내서 인터셉터로 X-CSRFToken 넣던 로직
  /*
  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(r => r.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    return config;
  });
  */

  document.getElementById("signupBtn").addEventListener("click", async () => {
    try {
      // [수정됨] username에 trim() 추가
      const username  = document.getElementById("username").value.trim();// ✅ 변경
      const password  = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;

      // [추가됨] 빈 값 체크
      if (!username || !password || !password2) {
        alert("모든 값을 입력해주세요.");
        return;
      }

      // [추가됨] 비밀번호 일치 체크
      if (password !== password2) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }

      // [수정됨] 기존 endpoint: "/api/signup/"
      // await api.post("/api/signup/", { username, password, password2 }); 
      // ❌ [삭제됨]
      
      // [변경] endpoint + 인스턴스: window.api + "/signup/"
      // 회원가입 API는 토큰 없이도 가능(AllowAny) (설명 주석 추가됨)
      await window.api.post("/signup/", { username, password, password2 });//✅변경

      alert("회원가입 완료 → 로그인으로 이동");
      window.location.href = "/login/";
    } catch (err) {
      console.log(err.response?.data || err.message);

      // [추가됨] 서버 에러 메시지를 더 친절하게 뽑아서 alert
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.username?.[0] ||
        err.response?.data?.password?.[0] ||
        "회원가입 실패";
      alert(msg);

      // ❌ [삭제됨] 기존: 단순 alert("회원가입 실패");
      // alert("회원가입 실패");
    }
  });
});
</script>
{% endblock %}
```

핵심 변경점
- ✅ `axios.create(...)` 제거 → `window.api` 사용
- ✅ `withCredentials` 제거
- ✅ CSRF 주입 인터셉터 제거 (JWT 헤더 방식이라 기본적으로 불필요)
- ✅ 회원가입 API는 `AllowAny`이므로 토큰 없이 호출 가능 (정상)


`templates/todo/list.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todocontainer"></div>

<div class="pagination">
    <button id="prevBtn">이전</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">다음</button>
</div>

<button id="createBtn">Todo 등록하기</button>

<script>
document.addEventListener("DOMContentLoaded", () => {

    const LOGIN_PAGE_URL = "/login/"; // ✅ (유지) 로그인 페이지 URL
    let currentPage = 1;              // ✅ (유지)

    // ✅ [삭제됨] 기존: 세션 쿠키 기반 axios 인스턴스 생성
    /*
    const api = axios.create({
        baseURL: "/",
        withCredentials: true,
    });
    */

    // ✅ [삭제됨] 기존: CSRF 자동 주입 (세션 기반에서 POST/PATCH/DELETE에 필요)
    /*
    api.interceptors.request.use(config => {
        const csrfToken = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="))
            ?.split("=")[1];

        config.headers = config.headers || {};
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }
        return config;
    });
    */

    // ✅ [삭제됨] 기존: 세션 없으면(401/403) 로그인으로 보내는 response interceptor
    /*
    api.interceptors.response.use(
        res => res,
        err => {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                console.log("세션 없음/권한 없음 → 로그인 이동");
                window.location.href = LOGIN_PAGE_URL;
                return Promise.reject(err);
            }
            return Promise.reject(err);
        }
    );
    */

    // ✅ [수정됨] 이제 세션 기반 api가 아니라, 공통 axios 인스턴스(window.api) 사용
    // ✅ 3단계: 공통 axios 인스턴스(window.api) 사용
    if (!window.api) { // ✅ [추가됨] window.api 존재 확인
        console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
        alert("설정 오류: api.js가 로드되지 않았습니다.");
        return;
    }

    // ✅ [추가됨] JWT access 토큰이 없으면 바로 로그인 이동(선택 로직)
    // (토큰이 있는데 만료된 경우는 401에서 처리)
    const access = localStorage.getItem("access_token");
    if (!access) {
        console.log("access_token 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return;
    }

    // ✅ [추가됨] 401/403 처리 로직을 함수로 분리 (기존 interceptor 대체)
    // ✅ 응답에서 401/403이면 로그인으로 (3단계용: refresh 자동화는 5단계에서)
    function handleAuthError(err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
            console.log("인증 실패(401/403) → 토큰 삭제 후 로그인 이동");

            // ✅ [추가됨] 토큰 정리(선택)
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");

            window.location.href = LOGIN_PAGE_URL;
        }
        return Promise.reject(err);
    }

    function loadPage(page) {
        // ✅ [수정됨] 기존: api.get(...) → 세션 기반
        // api.get(`/todo/viewsets/view/?page=${page}`)  // ❌ [삭제됨]

        // ✅ [수정됨] 변경: window.api.get(...) → JWT 토큰 기반
        // ✅ 이제 api.js에서 Authorization: Bearer <access_token> 자동 부착됨
        window.api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {
                const data = res.data;

                renderTodos(data.data || data.results || []);
                updatePaginationUI(data);

                currentPage = data.current_page || page;
            })
            .catch(err => {
                // ✅ [수정됨] 기존: console.error("페이지 로드 실패", err) 단순 처리
                // ✅ 변경: 인증 오류면 handleAuthError로 로그인 이동 처리
                handleAuthError(err).catch(() => {}); // ✅ [추가됨] 인증 실패 처리
                console.error("페이지 로드 실패", err.response?.data || err.message); // ✅ [수정됨] 로그 더 자세히
            });
    }

    function renderTodos(todos) {
        const container = document.querySelector(".todocontainer");
        container.innerHTML = "";

        if (!todos || todos.length === 0) {
            container.innerHTML = "<p>등록된 Todo 없음</p>";
            return;
        }

        todos.forEach(todo => {
            const div = document.createElement("div");
            div.className = "todo-item";
            div.dataset.id = todo.id;

            // ✅ 이미지 표시 로직은 그대로 유지
            const imageSrc = todo.image
                ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
                : "";

            div.innerHTML = `
                <p><strong>제목:</strong> ${todo.name ?? ""}</p>
                <p><strong>설명:</strong> ${todo.description ?? ""}</p>
                <p><strong>완료 여부:</strong> ${(todo.complete ? "완료" : "미완료")}</p>
                <p><strong>exp:</strong> ${todo.exp ?? 0}</p>
                ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}
                <hr>
            `;

            div.addEventListener("click", () => {
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            container.appendChild(div);
        });
    }

    function updatePaginationUI(data) {
        const current = data.current_page ?? currentPage ?? 1;
        const total =
            data.page_count ??
            (typeof data.count === "number" && data.results
                ? Math.ceil(data.count / data.results.length)
                : "?");

        document.getElementById("pageInfo").innerText = `${current} / ${total}`;

        document.getElementById("prevBtn").disabled = !(data.previous);
        document.getElementById("nextBtn").disabled = !(data.next);
    }

    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        loadPage(currentPage + 1);
    });

    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });

    loadPage(1);
});
</script>
{% endblock %}
```

`templates/todo/create.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}
<div class="container">
  <h2>Create a New Todo</h2>
    <div>
      <label for="name">Name:</label>
      <input type="text" name="name" id="name">
    </div>

    <div>
      <label for="description">Description:</label>
      <textarea name="description" id="description"></textarea>
    </div>

    <div>
      <label for="complete">Complete:</label>
      <input type="checkbox" name="complete" id="complete">
    </div>

    <div>
      <label for="exp">Experience Points:</label>
      <input type="number" name="exp" id="exp" min="0">
    </div>

    <div>
      <label for="image">Image:</label>
      <input type="file" id="image">
    </div>

    <button type="submit" id="todoCreate">Create</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // (유지) 로그인 페이지 / 생성 API URL
  const LOGIN_PAGE_URL = "/login/";
  const CREATE_API_URL = "/todo/viewsets/view/";

  // ✅ [삭제됨] 기존: 세션 쿠키 기반 axios 인스턴스 생성
  /*
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,
  });
  */

  // ✅ [삭제됨] 기존: CSRF 자동 주입 (세션 기반에서 필요)
  /*
  api.interceptors.request.use((config) => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  });
  */

  // ✅ [삭제됨] 기존: response interceptor로 401/403이면 로그인으로 이동
  /*
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err.response?.status;

      if (status === 401 || status === 403) {
        console.log("세션 없음/권한 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return Promise.reject(err);
      }
      return Promise.reject(err);
    }
  );
  */

  // [수정됨] 이제 세션 기반 api가 아니라, 공통 axios 인스턴스(window.api) 사용
  // 3단계: 공통 axios 인스턴스(window.api) 사용
  if (!window.api) { // [추가됨] window.api 로드 여부 확인
    console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // [추가됨] access 토큰이 없으면 바로 로그인으로(선택)
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // [추가됨] 401/403 처리 로직을 함수로 분리 (기존 interceptor 대체)
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      console.log("인증 실패(401/403) → 토큰 삭제 후 로그인 이동");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  // (유지) Create 버튼 클릭 → FormData 전송
  document.getElementById("todoCreate").addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("complete", document.getElementById("complete").checked ? "true" : "false");
      formData.append("exp", document.getElementById("exp").value || "0");

      const fileInput = document.getElementById("image");
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }

      // [수정됨] 기존: api.post(...) → 세션 기반
      // const res = await api.post(CREATE_API_URL, formData); // ❌ [삭제됨]

      // [수정됨] 변경: window.api.post(...) → JWT 기반
      // JWT: Authorization은 api.js가 자동으로 붙임 (설명 주석 추가됨)
      // FormData일 때 Content-Type은 axios가 자동 설정하도록 헤더 지정하지 않는 게 안전 (설명 주석 추가됨)
      const res = await window.api.post(CREATE_API_URL, formData); // ✅ 변경

      console.log("생성 성공:", res.data);
      window.location.href = "/todo/list/";

    } catch (err) {
      // ✅ [추가됨] 인증 문제면 로그인으로 보내기
      handleAuthError(err).catch(() => {});

      console.error("생성 실패:", err.response?.data || err.message);
      alert("생성 실패: 콘솔/네트워크 확인");
    }
  });

});
</script>
{% endblock %}
```

`templates/todo/update.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="container">
  <h2>Todo 수정</h2>

  <div>
    <label for="name">Name:</label>
    <input type="text" name="name" id="name" value="{{ todo.name }}">
  </div>

  <div>
    <label for="description">Description:</label>
    <textarea name="description" id="description">{{ todo.description }}</textarea>
  </div>

  <div>
    <label for="complete">Complete:</label>
    <input type="checkbox" name="complete" id="complete" {% if todo.complete %}checked{% endif %}>
  </div>

  <div>
    <label for="exp">Experience Points:</label>
    <input type="number" name="exp" id="exp" min="0" value="{{ todo.exp }}">
  </div>

  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

  <button type="button" id="todoUpdate">저장</button>
  <button type="button" onclick="history.back()">취소</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {

  const LOGIN_PAGE_URL = "/login/"; // ✅ (유지)
  const todoId = "{{ todo.id }}";   // ✅ (유지)

  // ✅ [삭제됨] 기존: 세션 쿠키 기반 axios 인스턴스 생성
  /*
  const api = axios.create({
    baseURL: "/",
    withCredentials: true, // ✅ 세션 쿠키 포함
  });
  */

  // ✅ [삭제됨] 기존: CSRF 자동 주입 (세션 기반에서 POST/PATCH/DELETE에 필요)
  /*
  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  });
  */

  // ✅ [삭제됨] 기존: 세션 없으면(401/403) 로그인으로 보내는 response interceptor
  /*
  api.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
      }
      return Promise.reject(err);
    }
  );
  */

  // ✅ [수정됨] 이제 세션 기반 api가 아니라, 공통 axios 인스턴스(window.api) 사용
  // ✅ 3단계: 공통 axios 인스턴스(window.api) 사용
  if (!window.api) { // ✅ [추가됨] window.api 로드 여부 확인
    console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // ✅ [추가됨] access 토큰이 없으면 바로 로그인으로(선택)
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ✅ [추가됨] 401/403 처리 로직을 함수로 분리 (기존 interceptor 대체)
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      alert("로그인이 필요합니다.");

      // ✅ [추가됨] (선택) 토큰 정리
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  document.getElementById("todoUpdate").addEventListener("click", async () => {
    try {
      const formData = new FormData();
      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("complete", document.getElementById("complete").checked ? "true" : "false");

      // ✅ [수정됨] exp의 기본값: 0(숫자) → "0"(문자열)로 통일
      // formData.append("exp", document.getElementById("exp").value || 0);   
      // ❌ [삭제됨]
      
      formData.append("exp", document.getElementById("exp").value || "0");//✅변경

      const fileInput = document.getElementById("image");
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }

      // ✅ [수정됨] 기존: api.patch(...) → 세션 기반
      // const res = await api.patch(`/todo/viewsets/view/${todoId}/`, formData);
      // ❌ [삭제됨]
      

      // ✅ [수정됨] 변경: window.api.patch(...) → JWT 기반
      const res = await window.api.patch(`/todo/viewsets/view/${todoId}/`, formData); // ✅ 변경

      console.log("수정 성공:", res.data);
      window.location.href = `/todo/detail/${todoId}/`;

    } catch (err) {
      // ✅ [추가됨] 인증 문제면 로그인으로 보내기
      handleAuthError(err).catch(() => {});

      // ✅ [수정됨] 실패 alert 메시지 변경 (더 구체적)
      console.error("수정 실패:", err.response?.data || err.message);
      // alert("수정 실패"); // ❌ [삭제됨]
      alert("수정 실패: 콘솔/네트워크 확인"); // ✅ 변경
    }
  });

});
</script>

{% endblock %}
```

`templates/todo/detail.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>

  {% if todo.image %}
    <p><strong>이미지:</strong></p>
    <img src="{{ todo.image.url }}" alt="todo image" style="max-width:300px; height:auto;">
  {% else %}
    <p><strong>이미지:</strong> -</p>
  {% endif %}
</div>

<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const todoId = "{{ todo.id }}";
  const LOGIN_PAGE_URL = "/login/";   // ✅ (유지)
  const LIST_PAGE_URL  = "/todo/list/"; // ✅ (유지)

  // ✅ [삭제됨] 기존: 세션 기반 CSRF 쿠키 꺼내는 함수
  /*
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }
  */

  // ✅ [추가됨] 3단계: 공통 axios 인스턴스(window.api) 사용
  if (!window.api) {
    console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // ✅ [추가됨] access 토큰 없으면 로그인으로(선택)
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ✅ [추가됨] 401/403 처리 함수 (세션 기반의 res.status 체크 대체)
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      alert("로그인이 필요합니다.");

      // ✅ [추가됨] (선택) 토큰 정리
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  // 수정 버튼 (✅ 유지)
  document.querySelector(".todoUpdate").addEventListener("click", () => {
    window.location.href = `/todo/update/${todoId}/`;
  });

  // ✅ [삭제됨] 기존: fetch로 DELETE (세션 쿠키 + CSRF 필요)
  /*
  document.querySelector(".todoDelete").addEventListener("click", async () => {
    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const res = await fetch(`/todo/viewsets/view/${todoId}/`, {
        method: "DELETE",
        credentials: "same-origin", // ✅ 세션 쿠키 포함 (안전)
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        }
      });

      // ✅ 세션 없거나 권한 없으면 로그인으로
      if (res.status === 401 || res.status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
        return;
      }

      if (!res.ok) throw new Error("삭제 실패");

      // 삭제 성공 → 리스트로 이동
      window.location.href = LIST_PAGE_URL;

    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });
  */

  // ✅ [수정됨] 변경: window.api.delete(...) 사용 (JWT Authorization은 api.js가 자동 부착)
  document.querySelector(".todoDelete").addEventListener("click", async () => {
    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      // ✅ 변경: fetch → axios(window.api)
      await window.api.delete(`/todo/viewsets/view/${todoId}/`);
      window.location.href = LIST_PAGE_URL;

    } catch (err) {
      // ✅ [추가됨] 인증 문제면 로그인으로
      handleAuthError(err).catch(() => {});

      console.error("삭제 실패:", err.response?.data || err.message); 
      // ✅ [수정됨] 로그 상세화
      
      alert("삭제 중 오류가 발생했습니다.");
    }
  });

  // 홈으로 버튼 (✅ 유지)
  document.querySelector(".todoHome").addEventListener("click", () => {
    window.location.href = LIST_PAGE_URL;
  });

});
</script>
{% endblock %}
```

`templates/todo/header.html`
```html
<div class="header">
  <h1>
    <a href="{% url 'todo_List' %}" style="text-decoration:none; color:inherit;">
      Todo 서비스
    </a>
  </h1>

  <div>
    <!-- ✅ [삭제됨] 기존: Django 템플릿 인증 분기(request.user.is_authenticated) -->
    <!--
    {% if request.user.is_authenticated %}
        <span>{{ request.user.username }}님 환영합니다</span>
        <button id="logoutBtn">로그아웃</button>
    {% else %}
        <a href="/login/">로그인</a>
        <a href="/signup-page/">회원가입</a>
    {% endif %}
    -->

    <!-- ✅ [수정됨] 변경: JWT 기준으로 "JS가 토글"할 영역을 미리 만들어둠 -->
    <!-- ✅ JWT 기준: JS로 토글할 영역 -->
    <span id="authWelcome" style="display:none;"></span> 
    <!-- ✅ [추가됨] 환영/상태 표시 -->
    
    <button id="logoutBtn" style="display:none;">로그아웃</button> 
    <!-- ✅ [수정됨] 기본 숨김 처리(display:none) -->
    

    <!-- ✅ [추가됨] 로그인/회원가입 링크도 JS로 토글 -->
    <a id="loginLink" href="/login/" style="display:none;">로그인</a>
    <a id="signupLink" href="/signup-page/" style="display:none;">회원가입</a>
  </div>
</div>

<hr>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // ✅ [추가됨] 토큰 키 상수화 (다른 페이지들과 통일)
  const ACCESS_KEY = "access_token";
  const REFRESH_KEY = "refresh_token";

  // ✅ [수정됨] 기존에는 logoutBtn만 찾아서 있으면 클릭 이벤트만 붙였음
  // const btn = document.getElementById("logoutBtn"); 
  // ❌ [삭제됨] 아래에서 logoutBtn으로 다시 받음
  

  // ✅ [추가됨] 현재 access 토큰 존재 여부로 로그인 상태 판단
  const access = localStorage.getItem(ACCESS_KEY);

  // ✅ [추가됨] 토글 대상 DOM 요소들
  const welcomeEl = document.getElementById("authWelcome");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");

  // ✅ [삭제됨] 기존: logoutBtn이 없으면 return (이제는 loginLink 등도 다루므로 단순 return 제거)
  // const btn = document.getElementById("logoutBtn");
  // if (!btn) return;

  // ✅ [추가됨] 토큰 있으면: 로그아웃/환영 표시 + 로그인/회원가입 숨김
  if (access) {
    // ✅ [수정됨] 기존: "{{ request.user.username }}님 환영합니다"를 서버가 출력
    // ✅ 변경: (3단계에서는 username을 토큰에서 꺼내지 않으므로) 일단 "로그인됨" 표시
    // (3단계에서는 username까지는 안 뽑아도 됨 — 7단계에서 정리)
    welcomeEl.textContent = "로그인됨";
    welcomeEl.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";

    loginLink.style.display = "none";
    signupLink.style.display = "none";

    // ✅ [수정됨] 기존: btn.addEventListener(...) → logoutBtn에 이벤트 부착
    logoutBtn.addEventListener("click", () => {
      // ✅ JWT 로그아웃 = 토큰 삭제
      localStorage.removeItem(ACCESS_KEY); //✅[수정됨]기존 문자열 하드코딩→상수사용
      localStorage.removeItem(REFRESH_KEY);//✅[수정됨] 기존 문자열 하드코딩→상수사용

      // 로그인 페이지로 이동
      window.location.href = "/login/";
    });

  } else {
    // ✅ [추가됨] 토큰 없으면: 로그인/회원가입 표시 + 로그아웃/환영 숨김
    welcomeEl.style.display = "none";
    logoutBtn.style.display = "none";

    loginLink.style.display = "inline-block";
    signupLink.style.display = "inline-block";
  }
});
</script>
```

---
토큰이 만료되면  [https://jwt.io](https://jwt.io) 접속
![[Pasted image 20260227151818.png]]

access_token 복사
![[Pasted image 20260227152027.png]]

`settings.py`
```python
SIMPLE_JWT = {
    # access는 짧게(보안), refresh는 길게(편의)
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    # Authorization: Bearer <token>
    "AUTH_HEADER_TYPES": ("Bearer",),

    # (5~6단계에서 다룰 것들 - 지금은 False로 두고 시작 권장)
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}
```
access → 보통 5분 / refresh → 보통 1일 
기간은 여기에서 정합니다.
