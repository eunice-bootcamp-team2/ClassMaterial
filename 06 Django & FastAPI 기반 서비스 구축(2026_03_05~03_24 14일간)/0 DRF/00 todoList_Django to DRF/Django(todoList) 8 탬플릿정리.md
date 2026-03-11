템플릿 폴더 구조가 정리(재배치)
```
templates/
├── base.html
├── auth_base.html
├── header.html
├── footer.html
├── accounts/
│  ├── login.html
│  └── signup.html
└── todo/
   ├── list.html
   ├── create.html
   ├── update.html
   └── detail.html
```
accounts 템플릿/ todo 템플릿이 섞이면 관리가 어렵고, 앱별 화면을 찾기 힘들어서 앱 단위로 템플릿을 분리합니다.

- auth 전용 base가 새로 추가됨 (auth_base.html 추가)
	- `base.html` : 사이트 공통 레이아웃(헤더/푸터 포함)
	- `auth_base.html` : 로그인/회원가입 전용 레이아웃(헤더/푸터 제거)
7번에서는 `base.html`에 `header.html`이 포함되어 있는데, 헤더 안에 로그인/로그아웃 UI가 들어가다 보니 로그인 페이지에서 로그인/회원가입 버튼이 중복으로 보이는 문제가 생깁니다.  
그래서 인증 화면은 헤더/푸터 없는 심플한 베이스(auth_base)로 분리한 거예요.
	
- header.html이 인증 상태에 따라 다르게 보이도록 수정됨
	- 로그인 상태면: `username 환영 + 로그아웃 버튼`
	- 비로그인이면: `로그인/회원가입 링크` 이 조건 분기가 들어갑니다.
- axios CDN 중복 선언 제거 (todo 템플릿들 수정)
	- `list.html, update.html, create.html` 각각 요소에 들어있는 axios CDN을 제거하고`base.html`(그리고 `auth_base.html`)에서 한 번만 로드하도록 정리했습니다.
- accounts 템플릿은 base.html → auth_base.html로 변경
	- `templates/accounts/signup.html` : `{% extends "auth_base.html" %}`
	- `templates/accounts/login.html` : `{% extends "auth_base.html" %}`
로그인/회원가입 화면에서는 메인 서비스 UI(헤더/푸터/로그아웃 버튼 등)가 필요 없고 심플한 중앙 정렬 UI가 필요하기 때문입니다.
	

---
`templates/base.html`
```html
{% load static %}
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{% block title %}Todo App{% endblock %}</title>

  <link rel="stylesheet" href="{% static 'css/style.css' %}">
  <!-- axios는 전체에서 1번만 작성 -->
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>

<body>
  {% include "header.html" %}

  <main class="container">
    {% block content %}{% endblock %}
  </main>

  {% include "footer.html" %}

  {% block scripts %}{% endblock %}
</body>
</html>
```

base.html의 공통파일로 로그인과 로그아웃을 만들면 아래와 같은 상태가 되어 중복으로 보이게 됩니다. 
![[Pasted image 20260222113624.png]]

그래서 별도로 로그인로그아웃 base를 만들어서 사용합니다.
`auth_bash.html`
```html
{% load static %}
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{% block title %}Auth{% endblock %}</title>

  <link rel="stylesheet" href="{% static 'css/style.css' %}">
  <!-- axios는 auth에서도 필요하니 여기도 1번만 -->
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>

<body>
  <!-- auth 화면은 보통 중앙 정렬 + 심플 -->
  <main class="auth-wrap">
    {% block content %}{% endblock %}
  </main>

  {% block scripts %}{% endblock %}
</body>
</html>
```

`templates/header.html`
```html
<div class="header">
    <h1>  
	<a href="{% url 'todo_List' %}" style="text-decoration:none; color:inherit;">  
	Todo 서비스  
	</a>  
	</h1>

    <div>
        {% if request.user.is_authenticated %}
            <span>{{ request.user.username }}님 환영합니다</span>

            <button id="logoutBtn">로그아웃</button>

        {% else %}
            <a href="/login/">로그인</a>
            <a href="/signup-page/">회원가입</a>
        {% endif %}
    </div>
</div>

<hr>
<script>
document.addEventListener("DOMContentLoaded", () => {

    // 로그아웃 버튼 요소 가져오기
    const btn = document.getElementById("logoutBtn");

    // 버튼이 없는 페이지에서는 코드 실행 중단
    if (!btn) return;


    // -----------------------------
    // CSRF 토큰을 쿠키에서 가져오는 함수
    // Django에서 POST 요청 시 CSRF 검증에 필요
    // -----------------------------
    function getCSRF() {
        return document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="))
            ?.split("=")[1];
    }


    // -----------------------------
    // 로그아웃 버튼 클릭 이벤트
    // -----------------------------
    btn.addEventListener("click", async () => {
        try {

            // axios POST 요청 → 로그아웃 API 호출
            await axios.post("/api/logout/", {}, {

                // 세션 쿠키(sessionid)를 요청에 포함
                withCredentials: true,

                // Django CSRF 보호를 통과하기 위한 헤더
                headers: {
                    "X-CSRFToken": getCSRF()
                }
            });

            // 로그아웃 성공 후 로그인 페이지로 이동
            window.location.href = "/login/";

            // 다른 페이지로 이동하고 싶으면 아래 사용 가능
            // window.location.href = "/todo/list/";

        } catch (err) {

            // 오류 발생 시 콘솔에 출력
            console.log(err.response?.data || err.message);

            // 사용자에게 실패 메시지 표시
            alert("로그아웃 실패");
        }
    });
});
</script>
```

`templates/footer.html`
```html
<div class="footer">  
	<p>© 2026 Todo App</p>  
</div>
```

`templates/accounts/signup.html`
```html
{% extends "auth_base.html" %}

{% block title %}회원가입{% endblock %}

{% block content %}
<!-- 회원가입 화면 카드 영역 -->
<section class="auth-card">
  <h2>회원가입</h2>

  <!-- 사용자 이름 입력 -->
  <input id="username" placeholder="username">

  <!-- 비밀번호 입력 -->
  <input id="password" placeholder="password" type="password">

  <!-- 비밀번호 확인 입력 -->
  <input id="password2" placeholder="password 확인" type="password">

  <!-- 회원가입 버튼 -->
  <button id="signupBtn">가입</button>

  <!-- 이미 계정이 있는 경우 로그인 페이지 이동 -->
  <p style="margin-top:12px;">
    이미 계정이 있나요? <a href="/login/">로그인</a>
  </p>
</section>
{% endblock %}

{% block scripts %}
<script>
document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------------
  // axios 인스턴스 생성
  // baseURL: 모든 API 요청의 기본 주소
  // withCredentials: 세션 쿠키를 요청에 포함
  // ------------------------------------
  const api = axios.create({
    baseURL: "/",
    withCredentials: true
  });


  // ------------------------------------
  // axios 요청 인터셉터
  // 요청을 보내기 전에 CSRF 토큰을 자동으로 헤더에 추가
  // Django POST 요청에서 CSRF 검증을 통과하기 위해 필요
  // ------------------------------------
  api.interceptors.request.use(config => {

    // 브라우저 쿠키에서 csrftoken 값을 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(r => r.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // CSRF 토큰이 있으면 헤더에 추가
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  });


  // ------------------------------------
  // 회원가입 버튼 클릭 이벤트
  // ------------------------------------
  document.getElementById("signupBtn").addEventListener("click", async () => {

    try {

      // 입력 필드에서 값 가져오기
      const username  = document.getElementById("username").value;
      const password  = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;

      // 회원가입 API 호출
      // POST /api/signup/
      await api.post("/api/signup/", {
        username,
        password,
        password2
      });

      // 회원가입 성공 메시지
      alert("회원가입 완료 → 로그인으로 이동");

      // 로그인 페이지로 이동
      window.location.href = "/login/";

    } catch (err) {

      // 오류 정보 콘솔 출력
      console.log(err.response?.data || err.message);

      // 사용자에게 실패 메시지 표시
      alert("회원가입 실패");
    }
  });
});
</script>
{% endblock %}
```
---
처리 흐름
```
로그인 페이지 로드
        ↓
JavaScript 실행 (DOMContentLoaded)
        ↓
axios 인스턴스 생성
(baseURL + 세션 쿠키 포함)
        ↓
axios 요청 인터셉터 설정
(CSRF 토큰 자동 추가)
        ↓
사용자 입력
username / password
        ↓
[로그인 버튼 클릭]
        ↓
POST /api/login/
        ↓
Django Login API 실행
        ↓
세션 생성 (sessionid 쿠키)
        ↓
로그인 성공
        ↓
/todo/list/ 페이지 이동
```

`templates/accounts/login.html`
```html
{% extends "auth_base.html" %}

{% block title %}로그인{% endblock %}

{% block content %}
<!-- 로그인 화면 카드 영역 -->
<section class="auth-card">
  <h2>로그인</h2>

  <!-- 사용자 이름 입력 -->
  <input id="username" placeholder="username">

  <!-- 비밀번호 입력 -->
  <input id="password" placeholder="password" type="password">

  <!-- 로그인 버튼 -->
  <button id="loginBtn">로그인</button>

  <!-- 회원가입 페이지 이동 링크 -->
  <p style="margin-top:12px;">
    아직 계정이 없나요? <a href="/signup-page/">회원가입</a>
  </p>
</section>
{% endblock %}

{% block scripts %}
<script>
document.addEventListener("DOMContentLoaded", () => {

  // ----------------------------------------
  // axios 인스턴스 생성
  // baseURL: 모든 API 요청의 기본 경로
  // withCredentials: 세션 쿠키(sessionid)를 요청에 포함
  // ----------------------------------------
  const api = axios.create({
    baseURL: "/",
    withCredentials: true
  });


  // ----------------------------------------
  // axios 요청 인터셉터
  // 요청을 보내기 전에 CSRF 토큰을 자동으로 추가
  // Django에서 POST 요청 시 CSRF 검증을 통과하기 위해 필요
  // ----------------------------------------
  api.interceptors.request.use(config => {

    // 브라우저 쿠키에서 csrftoken 값 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(r => r.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // CSRF 토큰이 존재하면 헤더에 추가
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    // 수정된 요청 설정 반환
    return config;
  });


  // ----------------------------------------
  // 로그인 버튼 클릭 이벤트
  // ----------------------------------------
  document.getElementById("loginBtn").addEventListener("click", async () => {

    try {

      // 입력 필드에서 사용자 입력 값 가져오기
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;


      // ----------------------------------------
      // 로그인 API 요청
      // POST /api/login/
      // ----------------------------------------
      await api.post("/api/login/", {
        username,
        password
      });


      // ----------------------------------------
      // 로그인 성공
      // Todo 목록 페이지로 이동
      // ----------------------------------------
      window.location.href = "/todo/list/";

    } catch (err) {

      // 오류 정보 콘솔 출력 (디버깅용)
      console.log(err.response?.data || err.message);

      // 사용자에게 실패 메시지 표시
      alert("로그인 실패");
    }
  });

});
</script>
{% endblock %}
```

list.html, update.html create.html 각각 요소에 들어있는 axios CDN을 제거합니다.