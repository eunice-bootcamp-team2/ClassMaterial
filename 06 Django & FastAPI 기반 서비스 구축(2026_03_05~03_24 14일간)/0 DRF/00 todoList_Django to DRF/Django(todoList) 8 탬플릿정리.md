디렉토리 구조
```
templates/  
├── base.html  
├── auth_base.html  
├── header.html  
├── footer.html  
│  
├── accounts/  
│ ├── login.html  
│ └── signup.html  
│  
└── todo/  
├── list.html  
├── create.html  
├── update.html  
└── detail.html
```

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

    const btn = document.getElementById("logoutBtn");
    if (!btn) return;

    function getCSRF() {
        return document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="))
            ?.split("=")[1];
    }

    btn.addEventListener("click", async () => {
        try {
            await axios.post("/api/logout/", {}, {
                withCredentials: true,
                headers: {
                    "X-CSRFToken": getCSRF()
                }
            });

            // 원하는 이동 위치 선택
            window.location.href = "/login/";
            // 또는
            // window.location.href = "/todo/list/";

        } catch (err) {
            console.log(err.response?.data || err.message);
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
```python
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
  const api = axios.create({ baseURL: "/", withCredentials: true });

  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(r => r.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    return config;
  });

  document.getElementById("signupBtn").addEventListener("click", async () => {
    try {
      const username  = document.getElementById("username").value;
      const password  = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;

      await api.post("/api/signup/", { username, password, password2 });

      alert("회원가입 완료 → 로그인으로 이동");
      window.location.href = "/login/";
    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("회원가입 실패");
    }
  });
});
</script>
{% endblock %}
```

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
  const api = axios.create({ baseURL: "/", withCredentials: true });

  // CSRF 자동 주입(세션 기반)
  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(r => r.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    return config;
  });

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      await api.post("/api/login/", { username, password });

      // ✅ 로그인 성공 후 메인(list)로
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

list.html, update.html create.html 각각 요소에 들어있는 axios CDN을 제거합니다.