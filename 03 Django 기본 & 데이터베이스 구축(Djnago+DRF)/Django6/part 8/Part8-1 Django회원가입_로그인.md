🔹 Django 튜토리얼 - 회원가입과 로그인

목표
- username + password 기반 회원가입
- 로그인 / 로그아웃 기능
- Django admin과 동일한 심플한 인증 구조
- polls / accounts 앱이 공통 templates / static 사용

`회원가입을 위한 앱생성` : 회원 인증(회원가입)을 담당할 전용 앱 생성
```python
python manage.py startapp accounts
```

`mysite/settings.py`에 아래 항목이 있어야 합니다:
	Django가 accounts 앱을 인식하도록 설정
```python
LOGIN_REDIRECT_URL = "/polls/" # 로그인후 이동할 페이지
LOGOUT_REDIRECT_URL = "/accounts/login/"

INSTALLED_APPS = [
    "accounts",  # accounts 앱 추가
]
```
	로그인/로그아웃 후 이동할 URL 설정

`mysite/urls.py` : 인증 URL 연결
	로그인/로그아웃/비밀번호 관련 URL을 자동 제공
```python
urlpatterns = [
    path("accounts/", include("accounts.urls")),
    path("accounts/", include("django.contrib.auth.urls")), 
]
```
	django.contrib.auth.urls는 로그인/로그아웃 등 인증에 필요한 URL 
	패턴과 뷰를 자동으로 등록합니다.  
	즉, views.py 없이도 로그인·로그아웃 기능이 작동합니다.

---
### 공통 templates / static 구조로 변경

목적
- polls, accounts 앱이 **같은 템플릿과 CSS 사용**
- 프로젝트 규모가 커져도 관리 쉬운 구조

📂 디렉토리 구조 (공통 templates / static)
```
DJANGO_FIRST2/
├── accounts/
├── polls/
├── mysite/
│
├── templates/              ← 공통 템플릿
│   ├── polls/
│   ├── accounts/
│   ├── registration/       ← Django auth 규약
│   └── admin/
│
├── static/                 ← 공통 static
│   ├── polls/
│   └── accounts/
│
├── manage.py
└── db.sqlite3
```

공통 템플릿 설정 (settings.py)
`mysite/settings.py` : templates 디렉토리 인식 설정
```python
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],   # ✅ 공통 템플릿 폴더
        "APP_DIRS": True,                  
        "OPTIONS": {
            "context_processors": [
```

`mysite/settings.py` 공통 static 설정
	정적 파일(css, js, img) 공통 관리
```python
STATIC_URL = "static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",   # ✅ 공통 static 폴더
]

# 배포용(지금 당장은 없어도 됨, 하지만 나중에 꼭 필요)
STATIC_ROOT = BASE_DIR / "staticfiles"
```

`mysite/settings.py`에 아래를 추가하세요.
	인증 후 이동 경로 최종 설정
```python
LOGIN_REDIRECT_URL = "polls:index"   # 로그인 성공 후 polls 홈으로
LOGOUT_REDIRECT_URL = "polls:index"  # 로그아웃 후 polls 홈으로 (원하면)
```
이렇게 하면 로그인 후 `/accounts/profile/`로 안 가고 `polls:index`로 갑니다.
	`polls:index`는 URL name 이라서 나중에 주소가 바뀌어도 안전해요.

---
로그인 회원가입을 위한 앱에 urls.py파일을 추가하여 아래와 같이 작성합니다

`accounts/urls.py` : 회원가입 URL 설정
```python
from django.urls import path
from . import views

urlpatterns = [
    path("signup/", views.signup, name="signup"),
]
```
---
#### Django 공식 문서가 의도한 방식으로 구현한 회원가입 기초 뼈대 코드

`accounts/views.py` : 회원가입 URL 설정
	Django 기본 UserCreationForm 사용
```python
from django.shortcuts import render
from django.contrib.auth.forms import UserCreationForm
from django.http import HttpResponseRedirect
from django.urls import reverse

def signup(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return HttpResponseRedirect(reverse("login"))
    else:
        form = UserCreationForm()
    return render(request, "accounts/signup.html", {"form": form})
```
---
회원가입 뷰 코드 해석 (Code Reading)

🔹 signup 함수
- 회원가입을 처리하는 함수형 뷰
- POST / GET 요청을 분기 처리
    
🔹 POST 요청
- 사용자가 입력한 데이터 검증
- 정상일 경우 사용자 계정 생성 후 로그인 페이지 이동
    
🔹 GET 요청
- 빈 회원가입 폼을 화면에 표시

---
`signup` 함수
```python
def signup(request):
```
`회원가입 처리용 뷰 함수`로, `/accounts/signup/` 주소에서 동작하도록 설정

---
```python
if request.method == "POST":
```
사용자가 회원가입 폼을 제출한 경우 (즉, 데이터를 보내온 경우)

---
Django가 미리 만들어 둔 “폼(Form) 클래스로
	`django.contrib.auth.forms`에 들어있는 회원가입 전용 Form 클래스 입니다.
```python
form = UserCreationForm(request.POST)
```
`POST`로 전송된 데이터를 바탕으로 폼 생성

#### Form 클래스란?
Django에서 **Form 클래스**는 다음 역할을 합니다:
- HTML 입력 필드 정의
- 입력값 검증(validation)
- 에러 메시지 관리
- (ModelForm인 경우) DB 저장까지 담당
    
`UserCreationForm`은 그중에서도 회원가입에 특화된 Form이에요.

---
`form.is_valid()`는  
UserCreationForm이 정의해 둔 모든 규칙을 전부 통과했는지를 검사합니다.
```python
if form.is_valid():
```
입력된 데이터가 유효한지 확인 (예: 비밀번호 일치, 필드 누락 없음 등)
즉, 쉽게 말해서 사용자가 입력한 값들이 회원가입을 해도 되는 상태인가?를 검사해 줍니다.

검사에 통과하면 저장합니다.
```python
form.save()
```
새 사용자 계정을 생성하여 데이터베이스에 저장

```python
return HttpResponseRedirect(reverse("login"))
```
회원가입 완료 후 `"login"` URL 이름을 가진 페이지로 리디렉션 (즉, 로그인 페이지로 이동)

`login"`은 URL의 `name`입니다
```python
path("accounts/", include("django.contrib.auth.urls")),
```
###### 이걸 `mysite/urls.py`에 넣는 순간, Django는 아래 URL들을 **자동으로 등록**합니다.
|URL path|name|
|---|---|
|`/accounts/login/`|`"login"`|
|`/accounts/logout/`|`"logout"`|
|`/accounts/password_change/`|`"password_change"`|
|`/accounts/password_reset/`|`"password_reset"`|
|…|…|
즉, `"login"`이라는 이름은 Django가 공식적으로 제공하는 인증 URL name**입니다.

```python
else:
    form = UserCreationForm()
```
`GET` 요청인 경우 (페이지를 처음 열었을 때), 빈 폼을 사용자에게 보여줌

```python
return render(request, "accounts/signup.html", {"form": form})
```
HTML 템플릿(`signup.html`)에 폼을 전달하여 렌더링

---
`accounts/signup.html`
```html
{% extends "polls/base.html" %} 
{% load static %} 
{% block content %}
<h2>회원가입</h2>
<form method="post" class="auth-form">
  {% csrf_token %} {{ form.as_p }}
  <button type="submit">가입</button>
</form>
<a href="{% url 'login' %}">이미 계정이 있으신가요?</a>
{% endblock %}
```

`registration/logged_out.html`
```html
{% extends "polls/base.html" %} 
{% block content %}
<h2>로그아웃 완료</h2>
<p>성공적으로 로그아웃되었습니다.</p>
<a href="{% url 'login' %}">다시 로그인</a>
{% endblock %}
```

`registration/login.html`
```html
{% extends "polls/base.html" %} 
{% load static %} 
{% block content %}
<h2>로그인</h2>
<form method="post" class="auth-form">
  {% csrf_token %} {{ form.as_p }}
  <button type="submit">로그인</button>
</form>
<a href="{% url 'signup' %}">회원가입하기</a>
{% endblock %}
```

`polls/header.html`
```html
{% load static %}
<header>
  <div class="site-header">
    <h1 class="site-title">설문조사 시스템</h1>

    <nav class="site-nav">
      <ul>
        <li><a href="{% url 'polls:index' %}">HOME</a></li>
        <li><a href="{% url 'admin:index' %}">Admin Home</a></li>

        {% if user.is_authenticated %}
          <li>
            <form method="post" action="{% url 'logout' %}">
              {% csrf_token %}
              <button type="submit" class="nav-button">로그아웃</button>
            </form>
          </li>
        {% else %}
          <li><a href="{% url 'login' %}" class="nav-button">로그인</a></li>
          <li><a href="{% url 'signup' %}" class="nav-button">회원가입</a></li>
        {% endif %}
      </ul>
    </nav>
  </div>
</header>

```

```html
{% if user.is_authenticated %}
```
- 로그인한 사용자는 True
- 로그인 하지 않은 사용자는  False

---
✅  CSS를 위한 수정:

`static/css/accounts.css`
```css
/* ===== 로그인 & 회원가입 폼 ===== */
form.auth-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}

.auth-form input {
  width: 100%;
  padding: 0.6rem;
  margin: 0.5rem 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.auth-form button {
  width: 100%;
  background-color: #4b4c60;
  color: white;
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.auth-form button:hover {
  background-color: #3a3b4c;
} 

/* ===== 안내 링크 ===== */
.auth-form a {
  display: block;
  margin-top: 1rem;
  color: #4b4c60;
  text-align: center;
  font-size: 14px;
}

/* ===== 에러/경고 메시지 ===== */
.auth-form ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.auth-form li {
  background-color: #ffffff;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  color: #cc0000;
  font-size: 14px;
}

/*로그아웃 버튼 수정*/
.site-nav li {
  display: flex;
  align-items: center;
}

.site-nav ul {
  list-style: none;
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 0;
}
 
/*로그인 로그아웃 회원가입*/
.navbar {
  background-color: #3c3b52;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.nav-links li a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.nav-button {
  background-color: #464559;
  color: white;
  padding: 8px 14px;
  border-radius: 5px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  text-decoration: none;
  border: none;
  outline: none;
  box-shadow: none;
}

.nav-button:hover {
  background-color: #5a5970;
}

.site-nav form {
  margin: 0;
}
```

`templates/polls/head.html` css를 추가합니다.
```html
<link rel="stylesheet" href="{% static 'polls/css/accounts.css' %}" />
```

결과를 브라우저에서 확인합니다.
![[커리큐럼/03 Django 기본 & 데이터베이스 구축(Djnago+DRF)/images/Pasted image 20250610020239.png]]

![[커리큐럼/03 Django 기본 & 데이터베이스 구축(Djnago+DRF)/images/Pasted image 20250610020306.png]]