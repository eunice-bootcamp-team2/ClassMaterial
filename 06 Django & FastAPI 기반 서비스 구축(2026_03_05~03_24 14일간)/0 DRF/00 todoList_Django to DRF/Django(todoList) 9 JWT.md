### 변환 순서 (실무에서 실수 줄이는 순서)

1. JWT 라이브러리(simplejwt) 설치/설정 → settings.py 변경
2. 로그인 API를 JWT 발급으로 교체 (`/api/login/` → 토큰 발급)
3. axios 공통 인스턴스에서 Authorization 자동 부착
4. todo API 호출들이 401 없이 동작하는지 확인
5. refresh 로직 추가(만료 자동 재발급)
6. 로그아웃 UX(토큰 삭제/블랙리스트) 정리
7. header 표시 방식 정리(템플릿 vs JS)

(1) 토큰 저장 위치
- localStorage: 구현 쉬움(학습/개발에 많이 씀) / XSS에 취약
- HttpOnly 쿠키: 보안 강함 / CSRF 고려 + 구현 복잡

(2) 템플릿 헤더에서 로그인 표시 유지할지
- 유지하려면: JWT를 쿠키 전략으로 가야 편함
- SPA처럼 갈 거면: JS로 토큰 유무로 표시 변경

---
### 1️⃣ 먼저 개념: 세션 vs JWT에서 바뀌는 핵심

세션 기반
- 로그인 성공 → 서버가 `sessionid` 쿠키를 내려줌
- 이후 요청은 브라우저가 sessionid 쿠키를 자동 전송
- 서버는 세션 저장소(DB/캐시)를 보고 사용자 식별
    

JWT 기반(바꿀 것)
- 로그인 성공 → 서버가 `access/refresh 토큰`을 내려줌
- 이후 요청은 JS가 access 토큰을 저장해 요청 헤더에 붙임  
    `Authorization: Bearer <access>`
- 서버는 세션 저장소 없이 토큰 서명 검증으로 사용자 식별
- access 만료 → refresh로 재발급
    
즉 세션쿠키 자동 인증 → 헤더에 토큰 수동 부착으로 바뀝니다.

---
### 2️⃣ 변환하면 “수정해야 하는 파일 영역” (큰 덩어리 5개)

A. settings.py (가장 중요)
- DRF 인증 클래스를 SessionAuthentication → JWTAuthentication으로 교체
- 권한 기본값(`IsAuthenticated`) 유지/조정
- CORS/CSRF 전략을 정해야 함
    - JWT를 헤더에 담으면 CSRF 의존이 줄어듦(쿠키 쓰는 방식이면 CSRF 고려 필요)
        
수정 대상
- `mysite/settings.py`
    
---
B. accounts 앱 (로그인/로그아웃 방식 변경)

지금은:
- `/api/login/` : `authenticate()` + `login()` (세션 생성)
- `/api/logout/` : `logout()` (세션 삭제)
    
JWT로 바꾸면:
- `/api/login/`은 보통 simplejwt의 TokenObtainPairView로 대체
    - 응답: `{access, refresh}`
        
- `/api/logout/`은 세션처럼 서버에서 끊는”개념이 약함
    - 실무 선택지 2가지:
        1. 프론트에서 토큰 삭제만 하고 끝(가장 흔함)
        2. refresh 토큰을 서버에서 무효화(블랙리스트) 기능 추가(보안 강화)
            
수정 대상
- `accounts/urls.py` (JWT 로그인/refresh 경로로 변경)
- `accounts/views.py` (세션 로그인/로그아웃 API는 제거하거나 JWT용으로 변경)
- (선택) `accounts/serializers.py`는 회원가입은 그대로 쓸 수 있음
    
---
C. 프론트(JS) 코드 전반 (axios 인증 방식 변경)

지금은:
- `withCredentials: true` + CSRF 토큰(X-CSRFToken) 주입
- 서버가 쿠키(sessionid)로 인증
    
JWT로 바꾸면:
- 로그인 성공 시 받은 `access/refresh`를 저장하고
- 요청마다 axios interceptor에서:
    - `Authorization: Bearer <access>` 붙여야 함
        
- 401(토큰 만료) 나오면:
    - refresh로 access 재발급 후 원 요청 재시도(자동화 가능)
        
수정 대상
- `templates/accounts/login.html` (로그인 성공 시 토큰 저장)
- `templates/accounts/signup.html` (보통 변화 없음, 가입 후 로그인 이동만)
- `templates/todo/list.html`, `create.html`, `update.html`, `detail.html`
    - axios 인스턴스/인터셉터를 JWT 방식으로 변경
- `templates/header.html`
    - 로그아웃은 `/api/logout/` 호출이 아니라 토큰 삭제 + 이동으로 변경
        
---
D. 백엔드 API 권한/인증이 걸린 ViewSet / APIView
지금은 세션 인증이 기본이라 로그인 세션이 있으면 통과.

JWT로 바꾸면:
- `Authorization` 헤더 없으면 401
- 그래서 프론트가 반드시 헤더를 붙이도록 해야 함
    
수정 대상
- todo 쪽 viewset / apiview 파일은 보통 직접 수정이 크지 않음  
    (settings의 인증 클래스가 바뀌면 자동으로 JWT를 보게 됨)
- 다만 예외적으로 `SessionAuthentication`을 view에서 직접 지정해뒀다면 제거해야 함
    
---
E. 인증 UI(템플릿에서 request.user 사용 여부)

중요 포인트:
- 세션 기반은 템플릿 렌더링 시점에 `request.user`가 이미 인증됨 → `header.html`에서 `{% if request.user.is_authenticated %}`가 잘 먹음
- JWT를 순수 API 방식(헤더)로 쓰면, 브라우저가 템플릿 GET 요청할 때 JWT를 자동으로 못 붙임
    - 즉, 서버 템플릿 관점에서는 `request.user`가 항상 익명일 수 있음
        
그래서 실무에서 선택이 갈립니다:
1. 완전 SPA 스타일(추천 흐름)
    - header의 로그인/로그아웃 표시도 JS로 토큰 유무 보고 바꿈
    - 서버 템플릿 `request.user`에 의존하지 않음
2. JWT를 쿠키에 넣는 방식(HttpOnly cookie)
    - 템플릿 렌더링에도 인증이 어느 정도 반영 가능
    - 대신 CSRF/쿠키 전략이 다시 복잡해짐
        
현재 템플릿 + axios 혼합 구조라서,
- UI는 템플릿이지만 인증은 API(JWT)로 가면 header 표시 방식도 바꾸는 게 일반적입니다.

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
```python
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
