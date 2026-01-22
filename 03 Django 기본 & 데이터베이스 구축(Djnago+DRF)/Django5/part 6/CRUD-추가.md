디렉토리 구조
```
Django_first2/
├─ manage.py
└─ polls/
   ├─ templates/
   │  └─ polls/
   │     ├─ base.html
   │     ├─ index.html
   │     ├─ detail.html
   │     ├─ results.html
   │     ├─ question_form.html
   │     └─ question_confirm_delete.html
   └─ static/
      └─ polls/
         ├─ index.css
         └─ images/
            └─ background.jpg
```


polls/urls.py
```python
from django.urls import path
from . import views

app_name = "polls"

urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
    path("<int:pk>/", views.DetailView.as_view(), name="detail"),
    path("<int:pk>/results/", views.ResultsView.as_view(), name="results"),
    path("<int:question_id>/vote/", views.vote, name="vote"),

    # 추가: CRUD
    path("create/", views.QuestionCreateView.as_view(), name="question_create"),
    path("<int:pk>/update/", views.QuestionUpdateView.as_view(), name="question_update"),
    path("<int:pk>/delete/", views.QuestionDeleteView.as_view(), name="question_delete"),
]
```

`polls/views.py`
```python
from django.urls import reverse_lazy
from .models import Question
from django.shortcuts import get_object_or_404, render
from django.views import generic

# 기존 IndexView, DetailView, ResultsView 생략

class QuestionCreateView(generic.CreateView):
    model = Question
    fields = ["question_text", "pub_date"]
    template_name = "polls/question_form.html"
    success_url = reverse_lazy("polls:index")

class QuestionUpdateView(generic.UpdateView):
    model = Question
    fields = ["question_text", "pub_date"]
    template_name = "polls/question_form.html"
    success_url = reverse_lazy("polls:index")

class QuestionDeleteView(generic.DeleteView):
    model = Question
    template_name = "polls/question_confirm_delete.html"
    success_url = reverse_lazy("polls:index")
```

`fields = ["question_text", "pub_date"]`의 정체
이 모델의 어떤 필드를 폼 입력으로 쓸 것인가” 를 Django에게 알려주는 설정으로
CreateView / UpdateView는 내부적으로 ModelForm을 자동 생성합니다.

---
`{{ form.as_p }}` 의 의미?
- Django가 **필드 + label + error** 를 자동으로 `<p>`로 감싸서 출력
- 내부 구조는 Django가 결정
```html
<p>
  <label for="id_question_text">Question text:</label>
  <input type="text" name="question_text" required id="id_question_text">
</p>
```
특징
✔ 빠름  
✔ 간단  
❌ 디자인 제어 어려움  
❌ placeholder / class 직접 지정 어려움

---
첫번째 코드와 두번째 코드는 같은 결과를 만듧니다.

A. 첫번째 코드 
`{{ form.as_p }}`로 작성한 예시
`polls/templates/polls/question_form.html` : 기존코드
```html
{% extends "polls/base.html" %} 
{% block title %} 질문 작성/수정 {% endblock %}

{% block content %}
<h2>질문 입력</h2>
<form method="post">
  {% csrf_token %} 
  {{ form.as_p }}
  <button type="submit">저장</button>
</form>
{% endblock %}
```

A. 첫번째 코드의 `{{ form.as_p }}`코드를 풀어서 쓰면:
```html
<form method="post">
  {% csrf_token %}
  
  <p>
    <label for="{{ form.question_text.id_for_label }}">질문:</label>
    {{ form.question_text }}
    {{ form.question_text.errors }}
  </p>

  <p>
    <label for="{{ form.pub_date.id_for_label }}">날짜:</label>
    {{ form.pub_date }}
    {{ form.pub_date.errors }}
  </p>

  <button type="submit">저장</button>
</form>
```


A. 두 번째 코드 (직접 작성)
`polls/templates/polls/question_form.html` : CSS와 UI를 위한 `수정`
```html
{% extends "polls/base.html" %}
{% block title %} 질문 작성/수정 {% endblock %}

{% block content %}
<form method="post">
  <div class="form-container">
    {% csrf_token %}

    <p>
      <label for="{{ form.question_text.id_for_label }}">질문:</label><br>
      <input type="text"
             name="{{ form.question_text.name }}"
             id="{{ form.question_text.id_for_label }}"
             value="{{ form.question_text.value|default_if_none:'' }}"
             placeholder="예: 당신이 좋아하는 음식은 무엇인가요?"
             required>
      {{ form.question_text.errors }}
    </p>

    <p>
      <label for="{{ form.pub_date.id_for_label }}">게시 날짜와 시간:</label><br>
      <input type="datetime-local"
             name="{{ form.pub_date.name }}"
             id="{{ form.pub_date.id_for_label }}"
             value="{{ form.pub_date.value|default_if_none:'' }}"
             placeholder="예: 2025-06-06T10:00"
             required>
      {{ form.pub_date.errors }}
    </p>

    <button type="submit" class="submit-btn">저장</button>
  </div>
</form>
{% endblock %}
```
의미
- Form 필드를 HTML로 직접 분해해서 렌더링
- 모든 속성 직접 제어 가능

특징
✔ 디자인·UX 완전 제어  
✔ placeholder, class, type 변경 가능  
✔ 에러 위치 제어 가능  
❌ 코드 길어짐

---
A. 두번째 코드의 일부 및 해석
```html
    <p>
      <label for="{{ form.question_text.id_for_label }}">질문:</label><br>
      <input type="text"
             name="{{ form.question_text.name }}"
             id="{{ form.question_text.id_for_label }}"
             value="{{ form.question_text.value|default_if_none:'' }}"
             placeholder="예: 당신이 좋아하는 음식은 무엇인가요?"
             required>
      {{ form.question_text.errors }}
    </p>
```
A. 아래와 같이 출력됩니다.
```html
<label for="id_question_text">질문:</label><br>

<input type="text"
       name="question_text"
       id="id_question_text"
       value="오늘 뭐 먹지?"
       placeholder="예: 당신이 좋아하는 음식은 무엇인가요?"
       required>

<ul class="errorlist"></ul>
```

1️⃣ `name="question_text"`
	서버로 전송될 때 쓰이는 “데이터 이름(키)”
	
- 폼 제출 시 POST 데이터의 key
- 서버에서는 이 이름으로 값을 꺼냄
```python
request.POST["question_text"]
```
	
✔️ 서버와의 약속 이름  
✔️ 없으면 값이 서버로 안 감

2️⃣ `id`
	HTML 문서 안에서 이 요소를 구분하는 고유 식별자
	
- `<label for="id_question_text">` 와 연결됨
- JavaScript / CSS에서 요소를 찾을 때 사용
```html
<label for="id_question_text">질문</label>
```
	
✔️ 화면/브라우저용 식별자  
✔️ 서버 전송과는 직접 관계 없음

3️⃣ `value`
	입력칸에 실제로 들어 있는 값으로 실제 사용자가 입력한 값

- 수정 화면에서는 기존 값
- 새 작성 화면에서는 빈 값
```
value="오늘 뭐 먹지?"
```
	
✔️ 사용자가 입력한 내용
✔️ 서버로 전송되는 실제 값
	
```python
value="{{ form.question_text.value|default_if_none:'' }}"
```
	출력할 값을 안전하게 가공하는 템플릿 필터
```python
default_if_none:''
```
	만약 value가 None이면 → 빈 문자열 ''로 바꿔라

4️⃣ `placeholder`
	입력 전에 보여주는 안내 문구

- 사용자가 입력하면 사라짐
- 서버로 전송 ❌ 안됨
```
placeholder="예: 당신이 좋아하는 음식은 무엇인가요?"
```
	
✔️ UX용 설명

5️⃣ `required`
	비어 있으면 제출 못 하게 하는 브라우저 검증

- 서버 검증 아님
- 프론트 1차 방어
```html
<input type="text" required>  
```
✔️ 사용자 실수 방지
이 상태에서 아무것도 입력하지 않고 제출 버튼 클릭하면 브라우저가 자동으로 막고
- 폼이 서버로 아예 안 감
- Django까지 요청이 도달하지 않음
- 브라우저가 즉시 메시지 표시
```chrome
“이 입력란을 작성하세요.”

“Please fill out this field.”
```

정리하면: Generic View의 `fields`에 지정한 모델 필드명으로 `<form>`에서 넘어온 값이  
`<input>`의 `name`으로 들어오고, 그 값은 “실제 사용자 입력 데이터”입니다.
그러나 아직 DB에 저장된 데이터는 아니고, 서버가 받은 ‘원본 입력 데이터’ 상태”입니다.

---
B. 첫번째 코드
`polls/templates/polls/question_confirm_delete.html`:기존코드
```html
{% extends "polls/base.html" %} 
{% block title %} 질문 삭제 {% endblock %}

{%block content %}
<h2>정말 삭제하시겠습니까?</h2>
<p>{{ object.question_text }}</p>

<form method="post">
  {% csrf_token %}
  <button type="submit">삭제</button>
  <a href="{% url 'polls:index' %}">취소</a>
</form>
{% endblock %}
```

B. 두번째 코드
`polls/templates/polls/question_form_delete.html`: `수정`
```html
{% extends "polls/base.html" %}
{% block title %}질문 삭제 확인{% endblock %}

{% block content %}
<div class="form-container" style="text-align: center;">
  <h2>정말 삭제하시겠습니까?</h2>
  <p><strong>{{ object.question_text }}</strong></p>

  <form method="post">
    {% csrf_token %}
    <button type="submit" class="btn-delete">삭제</button>
    <a href="{% url 'polls:index' %}" class="btn-cancel">취소</a>
  </form>
</div>
{% endblock %}
```

B. 첫번째 코드를 두번째 코드로 바꾼 이유/변경점(추가 설명)
- 삭제 기능(POST로 삭제 / 취소 링크 이동)은 동일하고, 바뀐 것은 UI(디자인)만입니다.
- 삭제 화면을 `<div class="form-container">`로 감싸서 **중앙 정렬 + 카드 형태 스타일**을 적용했습니다.
- 삭제 대상 문구(`{{ object.question_text }}`)를 `<strong>`로 감싸서 **강조 표시**했습니다.
- 버튼에 클래스를 추가하여 CSS로 스타일링 가능하게 했습니다.
    - `삭제` 버튼: `class="btn-delete"`
    - `취소` 링크: `class="btn-cancel"`
- 결과적으로 **동작은 똑같고**, 사용자가 보는 화면만 더 깔끔하게 개선된 버전입니다

---
C. 첫번째 코드
`polls/templates/polls/index.html` 기존코드
```html
{% extends "polls/base.html" %} {% load static %} 
{% block title %} 질문 목록{%endblock %} 

{% block content %}
<link rel="stylesheet" href="{% static 'polls/index.css' %}" />
<div class="container">
  <div class="header">
    <h2>설문 목록</h2>  
    <a href="{% url 'polls:question_create' %}" class="btn new-question-btn">새 질문</a>   
  </div>
  
  {% if latest_question_list %}
  <ul class="question-list">
    {% for question in latest_question_list %}
    <li class="question-item">
      <div class="question-text">
        <a href="{% url 'polls:detail' question.id %}">
        {{ question.question_text }}</a>
      </div>
      <div class="question-actions">
        <a href="{% url 'polls:question_update' question.id %}"
          class="btn edit-btn">수정</a>
        <a href="{% url 'polls:question_delete' question.id %}"
        class="btn delete-btn"> 삭제</a>
      </div>
    </li>
    {% endfor %}
  </ul>
  {% else %}
  <p>질문이 없습니다.</p>
  {% endif %}
</div>
{% endblock %}
```

C. 두번째 코드
`polls/templates/polls/index.html`: `수정`
```html
{% extends "polls/base.html" %} {% load static %}
{% block title %}<h1>최근 질문</h1>{% endblock %}

{% block content %}
{% if latest_question_list %}
<ul class="question-list">
  {% for question in latest_question_list %}
  <li class="question-item">
    <div class="question-text">
      <a href="{% url 'polls:detail' question.id %}">{{ question.question_text }}</a>
    </div>
    <div class="question-actions">
      <a href="{% url 'polls:question_create' %}" class="button create">글생성</a>
      <a href="{% url 'polls:question_update' question.id %}" class="button update">수정</a>
      <a href="{% url 'polls:question_delete' question.id %}" class="button delete">삭제</a>
    </div>
  </li>
  {% endfor %}
</ul>
{% else %}
<p>No polls are available.</p>
{% endif %} {% endblock %}
```

C. 첫번째 코드를 두번째 코드로 바꾼 이유/변경점(추가 설명)
- 질문 목록 출력(반복문/조건문)은 동일하며, 바뀐 것은 UI 구조/클래스명/버튼 위치입니다.
- 첫번째 코드는 상단에 `container/header/새 질문 버튼` 영역을 따로 두고, 버튼 클래스를 `btn`, `edit-btn`, `delete-btn`처럼 사용했습니다.
- 두번째 코드는 구조를 단순화해서 **리스트 중심 UI**로 만들었고, 버튼 클래스도 CSS에 맞춰  
    `button create / update / delete` 형태로 통일했습니다.
- 두번째 코드는 `글생성(create)` 버튼이 **각 질문 항목마다** 보이도록 배치되어 있습니다.  
    (원래 의도대로 “상단에 한 번만” 보이게 하려면 create 버튼을 `{% for %}` 밖으로 빼면 됩니다.)
- 첫번째 코드에는 `<link rel="stylesheet"...>`가 포함되어 있는데, 두번째 코드에서 CSS를 계속 쓰려면  
    **base.html에서 공통으로 로드하거나**, 두번째 코드에도 같은 `<link>`를 유지해야 합니다.
- 결과적으로 **동작(조회/이동)은 같고**, 사용자가 보는 버튼 스타일과 레이아웃을 **CSS 구조에 맞게 정리**한 버전입니다.
---
index.css
```css
body {
  background: url("../images/background.jpg") no-repeat top left;
  background-size: cover;
  font-family: "Segoe UI", sans-serif;
  margin: 0;
  padding: 0;
}

header {
  background-color: #4a4e69;
  color: white;
  padding: 20px;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.site-nav li {
  display: inline;
  background: none;
  box-shadow: none;
}

main {
  padding: 20px;
  text-align: center;
}

h2 {
  color: #333;
  font-size: 28px;
  margin-bottom: 20px;
}

/* 질문 리스트 중앙 정렬 */
ul {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  max-width: 700px;
}

li {
  background-color: white;
  border-radius: 10px;
  margin-bottom: 12px;
  padding: 15px 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
}

li:hover {
  background-color: #f0f4f8;
}

a {
  text-decoration: none;
  font-size: 18px;
  color: #1d3557;
}

footer {
  margin-top: 50px;
  padding: 20px;
  background-color: #f1f1f1;
  text-align: center;
  font-size: 14px;
  color: #666;
}

footer a {
  color: #1e1c2b;
  text-decoration: none;
  font-size: 14px;
}

/*우선순위를 위해서*/
.site-header {
  width: 100%;
  position: relative;
  text-align: center;
}

.site-title {
  margin: 0;
  font-size: 24px;
}

.site-nav {
  position: absolute;
  left: 100px;
  top: 50%;
  transform: translateY(-50%);
}

.site-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.site-nav li:hover {
  background: none;
}

.site-nav li:hover a {
  color: #b8bee6;
}

.site-nav a {
  color: white;
  text-decoration: none;
  font-weight: bold;
  font-size: 16px;
}

/* 질문 리스트 영역 */
.question-list {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  max-width: 700px;
}

.question-item {
  background-color: white;
  border-radius: 12px;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  text-align: left;
  transition: box-shadow 0.2s ease;
}

.question-item:hover {
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

/*###-------index.html----------###*/
/* 질문 텍스트 */
.question-text {
  font-size: 18px;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 10px;
}
 
/* 버튼 영역 */
.question-actions {
  display: flex;
  gap: 8px;
}
 
/* 공통 버튼 스타일  */
.button {
  padding: 6px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

/* 각 버튼 색상*/
.button.create {
  background-color: #6c757d; /* 차분한 회색 */
}

.button.update {
  background-color: #495057; /* 짙은 회색 */
}

.button.delete {
  background-color: #adb5bd; /* 은은한 회색 */
}

/* 호버 시 강조 */
.button:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
 
/* 폼 전체 컨테이너 */
form{
  margin-top: 20px;
}
.form-container {
  max-width: 500px;
  margin: 40px auto;
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 폼 필드 텍스트 */
.form-container label {
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 6px;
}

.form-container input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
}

/* 저장 버튼 스타일 */
.submit-btn {
  background-color: #4a4e69;
  color: white;
  padding: 10px 20px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-btn:hover {
  background-color: #5c6085;
}

/*###-------question_form_delete.html----------###*/
/* 삭제 폼 버튼 스타일 */
.btn-delete {
  background-color: #e63946;
  color: white;
  border: none;
  padding: 10px 20px;
  margin-right: 10px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-delete:hover {
  background-color: #c82333;
}
 
.btn-cancel {
  background-color: #dee2e6;
  color: #333;
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-cancel:hover {
  background-color: #ced4da;
}

/*###-------results.html----------###*/
.results-container {
  max-width: 700px;
  margin: 50px auto;
  padding: 20px;
  text-align: center;
}

.question-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #2c2c2c;
}

.result-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-list li {
  background-color: white;
  border-radius: 10px;
  margin-bottom: 16px;
  padding: 14px 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  transition: background-color 0.2s ease;
}

.result-list li:hover {
  background-color: #f1f3f5;
}

.choice-text {
  font-weight: 500;
  color: #1d3557;
}

.vote-count {
  font-weight: 600;
  color: #495057;
}

/* 다시 투표 버튼 */
.vote-again {
  margin-top: 30px;
}

.vote-again-btn {
  display: inline-block;
  background-color: #4a4e69;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.vote-again-btn:hover {
  background-color: #5f6483;
}

/* 별 이미지 */
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px 0;
  gap: 10px;
  margin-bottom: 1em;
}
 
.heading-with-icon .icon {
  width: 50px;
  height: 50px;
}
```