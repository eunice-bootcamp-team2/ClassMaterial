🔹 간단한 책 제목과 저자를 저장하고, 화면에 예쁘게 출력하는 웹앱
```
bookproject/
├── manage.py
├── bookproject/
│   └── settings.py, urls.py ...
└── books/
    ├── models.py
    ├── views.py    ← ✔️ 수정됨
    ├── urls.py     ← ✔️ 수정됨
    ├── templates/
    │   └── books/
    │       ├── base.html
    │       ├── book_list.html
    │       ├── book_detail.html
	│       ├── book_form.html   ← ✔️ 추가됨 (Create, Update)
    │       └── book_confirm_delete.html ← ✔️ 추가됨 (Delete)
    │       └── book_results.html
    └── static/
        └── books/
            └── css/
                └── style.css
```

모델 정의 – `books/models.py`
```python
from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    votes = models.IntegerField(default=0)  # 투표 수 추가

    def __str__(self):
        return f"{self.title} by {self.author}"
```

모델 정의
`books/models.py` 파일에서 다음을 수행하세요.
- 책 정보를 저장할 `Book` 모델을 정의합니다.
- 다음 필드를 포함하세요:
    - `title`: 책 제목, 최대 200자
    - `author`: 저자 이름, 최대 100자
    - `votes`: 정수, 기본값은 0, 사용자 투표 수 저장

| id (자동 생성) | title | author      | votes |
| ---------- | ----- | ----------- | ----- |
| 1          | 데미안   | 헤르만 헤세      | 2     |
| 2          | 어린 왕자 | 앙투안 드 생텍쥐페리 | 5     |
| 3          | 삼국지   | 나관중         | 4     |

뷰 작성 – `books/views.py`  ==변경 없음==
```python
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.views import generic
from .models import Book
from django.db.models import F

# 책 목록 보기 (ListView)
class BookListView(generic.ListView):
    model = Book
    template_name = "books/book_list.html"
    context_object_name = "books"

# 책 상세 및 투표 폼 (DetailView)
class BookDetailView(generic.DetailView):
    model = Book
    template_name = "books/book_detail.html"
    context_object_name = "book"

# 투표 처리 함수형 뷰
def vote(request, pk):
    book = get_object_or_404(Book, pk=pk)
    if request.method == "POST":
        book.votes = F("votes") + 1  # 안전한 증가
        book.save()
        book.refresh_from_db() # 이부분 추가함
        return HttpResponseRedirect(reverse("books:results", args=(book.id,)))
    return render(request, "books/book_detail.html", {
        "book": book,
        "error_message": "Invalid access.",
    })

# 결과 보기 (DetailView 재사용)
class BookResultsView(generic.DetailView):
    model = Book
    template_name = "books/book_results.html"
    context_object_name = "book"
```

🔹 CRUD 클래스뷰 추가
```python
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponseRedirect
from django.urls import reverse, reverse_lazy
from django.views import generic
from .models import Book
from django.db.models import F

# 책 목록 보기
class BookListView(generic.ListView):
    model = Book
    template_name = "books/book_list.html"
    context_object_name = "books"

# 책 상세 보기
class BookDetailView(generic.DetailView):
    model = Book
    template_name = "books/book_detail.html"
    context_object_name = "book"

# 책 생성 (Create)
class BookCreateView(generic.CreateView):
    model = Book
    fields = ["title", "author"]
    template_name = "books/book_form.html"
    success_url = reverse_lazy("books:book_list")

# 책 수정 (Update)
class BookUpdateView(generic.UpdateView):
    model = Book
    fields = ["title", "author"]
    template_name = "books/book_form.html"
    success_url = reverse_lazy("books:book_list")

# 책 삭제 (Delete)
class BookDeleteView(generic.DeleteView):
    model = Book
    template_name = "books/book_confirm_delete.html"
    success_url = reverse_lazy("books:book_list")

# 투표 처리
def vote(request, pk):
    book = get_object_or_404(Book, pk=pk)
    if request.method == "POST":
        book.votes = F("votes") + 1
        book.save()
        return HttpResponseRedirect(reverse("books:results", args=(book.id,)))
    return render(request, "books/book_detail.html", {
        "book": book,
        "error_message": "Invalid access.",
    })

# 결과 보기
class BookResultsView(generic.DetailView):
    model = Book
    template_name = "books/book_results.html"
    context_object_name = "book"
```

---
앱 URL 설정 – `books/urls.py`
🔹 CRUD URL 추가됨
```python
from django.urls import path
from . import views

app_name = "books"

urlpatterns = [
    path("", views.BookListView.as_view(), name="book_list"),
    path("add/", views.BookCreateView.as_view(), name="book_add"),
    path("<int:pk>/", views.BookDetailView.as_view(), name="book_detail"),
    path("<int:pk>/edit/", views.BookUpdateView.as_view(), name="book_edit"),
    path("<int:pk>/delete/", views.BookDeleteView.as_view(), name="book_delete"),
    path("<int:pk>/vote/", views.vote, name="vote"),
    path("<int:pk>/results/", views.BookResultsView.as_view(), name="results"),
]
```

프로젝트 URL 연결 – `bookproject/urls.py`  ==변경 없음==
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("books/", include("books.urls")),
]
```

템플릿 – `books/templates/books/base.html` ==변경 없음==
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Book List{% endblock %}</title>
    <link rel="stylesheet" href="{% static 'books/css/style.css' %}">
</head>
<body>
    <div class="container">
        {% block content %}{% endblock %}
    </div>
</body>
</html>
```

템플릿 – `books/templates/books/book_list.html` 
🔹 책 추가 링크 및 수정/삭제 링크 추가
```html
{% extends "books/base.html" %}

{% block title %}책 목록{% endblock %}

{% block content %}
<h1>책 목록</h1>
<a href="{% url 'books:book_add' %}">➕ 새 책 추가</a>
<ul class="book-list">
    {% for book in books %}
    <li>
        <a href="{% url 'books:book_detail' book.id %}">{{ book.title }}</a> by {{ book.author }}
        |
        <a href="{% url 'books:book_edit' book.id %}">✏️ 수정</a>
        <a href="{% url 'books:book_delete' book.id %}">🗑 삭제</a>
    </li>
    {% endfor %}
</ul>
{% endblock %}
```

템플릿 – `books/templates/books/book_detail.html`  ==변경 없음==
```html
{% extends "books/base.html" %}
{% load static %}

{% block title %}{{ book.title }}{% endblock %}

{% block content %}
<h2>{{ book.title }}</h2>
<p>저자: {{ book.author }}</p>

<form method="post" action="{% url 'books:vote' book.id %}">
    {% csrf_token %}
    <button type="submit">이 책에 투표하기</button>
</form>

{% if error_message %}
<p style="color:red;"><strong>{{ error_message }}</strong></p>
{% endif %}
{% endblock %}
```

템플릿 – `books/templates/books/book_results.html`  ==변경 없음==
```html
{% extends "books/base.html" %}

{% block title %}투표 결과{% endblock %}

{% block content %}
<h2>{{ book.title }}</h2>
<p>저자: {{ book.author }}</p>
<p><strong>총 투표 수: {{ book.votes }}</strong></p>
<a href="{% url 'books:book_list' %}">← 목록으로 돌아가기</a>
{% endblock %}
```

템플릿 – `book_form.html` (신규)
```html
{% extends "books/base.html" %}

{% block title %}책 정보 작성{% endblock %}

{% block content %}
<h2>책 정보 작성</h2>
<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">저장</button>
</form>
<a href="{% url 'books:book_list' %}">← 목록으로 돌아가기</a>
{% endblock %}
```

템플릿 – `book_confirm_delete.html` (신규)
```html
{% extends "books/base.html" %}

{% block title %}책 삭제{% endblock %}

{% block content %}
<h2>“{{ book.title }}” 삭제</h2>
<p>정말 삭제하시겠습니까?</p>

<form method="post">
    {% csrf_token %}
    <button type="submit">삭제</button>
    <a href="{% url 'books:book_list' %}">취소</a>
</form>
{% endblock %}
```

CSS – `books/static/books/css/style.css` ==변경 없음==
```css
body {
    font-family: 'Arial', sans-serif;
    background-color: #f2f2f2;
    margin: 2rem;
}

.container {
    background: white;
    border-radius: 10px;
    padding: 2rem;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

h1 {
    color: #4a4a4a;
}

.book-list {
    list-style-type: none;
    padding: 0;
}

.book-list li {
    padding: 8px 0;
    border-bottom: 1px solid #ddd;
}
```

설정 – `settings.py` STATIC 설정 확인 ==변경 없음==
```python
STATIC_URL = "static/"
```

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```