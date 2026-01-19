🔹 Django 튜토리얼 - 회원가입과 로그인

목표
- 이름(username)과 비밀번호로 회원가입
- 로그인/로그아웃 가능
- 관리자(admin) 가입처럼 심플한 구조

`회원가입을 위한 앱생성`
```python
python manage.py startapp accounts
```

`mysite/settings.py`에 아래 항목이 있어야 합니다:
```python
LOGIN_REDIRECT_URL = "/polls/" # 로그인후 이동할 페이지
LOGOUT_REDIRECT_URL = "/accounts/login/"

INSTALLED_APPS = [
    "accounts",  # accounts 앱 추가
]
```
	로그인/로그아웃 후 이동할 URL 설정

`mysite/urls.py`
```python
urlpatterns = [
    path("accounts/", include("accounts.urls")),
    path("accounts/", include("django.contrib.auth.urls")), 
]
```
	django.contrib.auth.urls는 로그인/로그아웃 등 인증에 필요한 URL 
	패턴과 뷰를 자동으로 등록합니다.  
	즉, views.py 없이도 로그인·로그아웃 기능이 작동합니다.

📂 로그인 회원가입이 들어갈 디렉토리 구조:
```
templates/
├── registration/
│   ├── login.html    
│   └── logged_out.html
├── accounts/
│   └── signup.html
```

`accounts/urls.py`
```python
from django.urls import path
from . import views

urlpatterns = [
    path("signup/", views.signup, name="signup"),
]
```
---
`accounts/views.py`
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

`signup` 함수
```python
def signup(request):
```
`회원가입 처리용 뷰 함수`로, `/accounts/signup/` 주소에서 동작하도록 설정

```python
if request.method == "POST":
```
사용자가 회원가입 폼을 제출한 경우 (즉, 데이터를 보내온 경우)

```python
form = UserCreationForm(request.POST)
```
`POST`로 전송된 데이터를 바탕으로 폼 생성

```python
if form.is_valid():
```
입력된 데이터가 유효한지 확인 (예: 비밀번호 일치, 필드 누락 없음 등)

```python
form.save()
```
새 사용자 계정을 생성하여 데이터베이스에 저장

```python
return HttpResponseRedirect(reverse("login"))
```
회원가입 완료 후 `"login"` URL 이름을 가진 페이지로 리디렉션 (즉, 로그인 페이지로 이동)

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

`polls/css/index.css`
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

![[커리큐럼/03 Django 기본 & 데이터베이스 구축(Djnago+DRF)/images/Pasted image 20250610020239.png]]

![[커리큐럼/03 Django 기본 & 데이터베이스 구축(Djnago+DRF)/images/Pasted image 20250610020306.png]]