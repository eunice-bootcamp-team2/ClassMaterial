## 목표

- 책 목록/상세/결과는 **CBV(generic)** 로 구성
- 투표 처리는 **CBV로 변경** (함수형 vote → 클래스형 VoteView)
- 투표 증가 로직은 **F표현식**으로 동시성 안전하게 처리
- 목록 페이지에서 **인기 점수(popularity_score)** 를 “표현식 계산”으로 만들어서 같이 출력 (votes 기반)
    
> 참고: Part4에서 말한 핵심 포인트(POST 처리, 예외처리, F("votes") + 1, redirect)는 그대로 적용합니다.

# 0) 최종 URL 설계 (이번 문제에서 만들 것)

- `/books/` : 책 목록 (ListView)
- `/books/<pk>/` : 책 상세 + 투표 버튼 (DetailView)
- `/books/<pk>/vote/` : CBV로 투표 처리 (POST면 +1, GET이면 에러 메시지로 detail 재렌더)
- `/books/<pk>/results/` : 결과 페이지 (DetailView)

---
# 1) 모델 정의 – `books/models.py`

✅ 기존 요구사항 그대로 + (선택) 정렬을 위한 메타는 선택
```python
from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    votes = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.title} - {self.author}"
```

---
# 2) 뷰 작성 – `books/views.py` (CBV + 표현식 계산 포함)

(1) 책 목록: `BookListView` (ListView) + “인기 점수” 표현식 계산
- 템플릿: `books/book_list.html`
- 변수명: `books`
- 추가 요구: 목록에서 `popularity_score = votes * 10` 을 **DB에서 계산**해서 같이 보여주기  
    (이게 “표현식 계산” 파트입니다)
```python
from django.views import generic
from django.db.models import F, IntegerField, ExpressionWrapper
from .models import Book

class BookListView(generic.ListView):
    model = Book
    template_name = "books/book_list.html"
    context_object_name = "books"

    def get_queryset(self):
        # popularity_score = votes * 10 (DB에서 계산)
        return (
            Book.objects
            .annotate(
                popularity_score=ExpressionWrapper(
                    F("votes") * 10,
                    output_field=IntegerField()
                )
            )
            .order_by("-votes", "title")
        )
```
`F("votes")`는 “DB에 저장된 votes 컬럼”을 가리키고, 계산을 DB가 하게 만드는 방식입니다.

---
(2) 책 상세: `BookDetailView` (DetailView)

- 템플릿: `books/book_detail.html`
- 변수명: `book`
```python
class BookDetailView(generic.DetailView):
    model = Book
    template_name = "books/book_detail.html"
    context_object_name = "book"
```

---
(3) 결과 페이지: `BookResultsView` (DetailView)

- 템플릿: `books/book_results.html`
- 변수명: `book`
```python
class BookResultsView(generic.DetailView):
    model = Book
    template_name = "books/book_results.html"
    context_object_name = "book"
```

---
(4) ✅ 이번 문제의 핵심: 투표 처리 로직을 “CBV로 변경”하기

### 요구사항

- `BookVoteView`를 작성하세요. (추천: `django.views.View` 사용)
- **POST 요청이면**
    - Book.votes를 **F표현식으로 +1**
    - 저장 후 결과 페이지로 redirect (`HttpResponseRedirect + reverse`)
        
- **GET 요청이면**
    - “잘못된 접근”이므로 detail을 다시 렌더링 + error_message 전달
        
> Part4의 try/except/else 구조를 “GET/POST 분기”로 바꿔보는 느낌입니다. (예외가 터질만한 부분을 통제하는 목적은 동일)

```python
from django.views import View
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.db.models import F
from .models import Book

class BookVoteView(View):
    def post(self, request, pk):
        book = get_object_or_404(Book, pk=pk)

        # ✅ DB에서 votes = votes + 1 로 안전하게 증가
        Book.objects.filter(pk=book.pk).update(votes=F("votes") + 1)

        return HttpResponseRedirect(
            reverse("books:results", args=(book.pk,))
        )

    def get(self, request, pk):
        # GET으로 들어오면 "투표는 POST로만!" 안내하고 상세로 돌려보내기
        book = get_object_or_404(Book, pk=pk)
        return render(
            request,
            "books/book_detail.html",
            {
                "book": book,
                "error_message": "투표는 버튼을 눌러서(POST)만 가능합니다.",
            },
        )
```

✅ 여기서 포인트
- `post()` / `get()` 메서드가 CBV에서 request를 받는 표준 구조
- `update(votes=F("votes")+1)`는 동시성에 안전한 증가 방식
- redirect는 새로고침 중복 제출 방지

# 3) URL 설정 – `books/urls.py`
```python
from django.urls import path
from . import views

app_name = "books"

urlpatterns = [
    path("", views.BookListView.as_view(), name="list"),
    path("<int:pk>/", views.BookDetailView.as_view(), name="detail"),
    path("<int:pk>/vote/", views.BookVoteView.as_view(), name="vote"),
    path("<int:pk>/results/", views.BookResultsView.as_view(), name="results"),
]
```

그리고 `bookproject/urls.py`에 연결:
```python
from django.urls import path, include

urlpatterns = [
    path("books/", include("books.urls")),
]
```

---
# 4) 템플릿 핵심 변경점
## `book_list.html`

- 책 제목 클릭 → detail로 이동
- votes와 popularity_score도 같이 보여주기
```html
{% extends "books/base.html" %}
{% block content %}
<div class="container">
  <h1>📘 나의 책 목록</h1>

  <ul class="book-list">
    {% for book in books %}
      <li>
        <a href="{% url 'books:detail' book.id %}">{{ book.title }}</a>
        <span>by {{ book.author }}</span>
        <span> | votes: {{ book.votes }}</span>
        <span> | score: {{ book.popularity_score }}</span>
      </li>
    {% endfor %}
  </ul>
</div>
{% endblock %}
```

## `book_detail.html`

- 버튼은 POST로 `/vote/`로 전송
- error_message 출력
```html
{% extends "books/base.html" %}
{% block content %}
<div class="container">
  <h1>📗 {{ book.title }}</h1>
  <p>저자: {{ book.author }}</p>

  {% if error_message %}
    <p style="color: crimson;"><strong>{{ error_message }}</strong></p>
  {% endif %}

  <form action="{% url 'books:vote' book.id %}" method="post">
    {% csrf_token %}
    <button type="submit">이 책에 투표하기</button>
  </form>

  <p><a href="{% url 'books:list' %}">← 목록으로</a></p>
</div>
{% endblock %}
```

book_results.html
```html
{% extends "books/base.html" %}
{% block content %}
<div class="container">
  <h1>📙 {{ book.title }}</h1>
  <p>저자: {{ book.author }}</p>
  <p>총 투표 수: <strong>{{ book.votes }}</strong></p>

  <p><a href="{% url 'books:list' %}">← 목록으로 돌아가기</a></p>
</div>
{% endblock %}
```

---
# 5) (추가 미션) 예외처리 “진짜 try/except”도 넣어보기 (선택)

지금은 GET/POST로 안전장치를 했지만, “POST인데 pk가 없다/이상하다” 같은 경우를 더 탄탄하게 하려면 Part4처럼 예외처리를 섞을 수도 있어요. (예외처리 이유/목적은 Part4에 정리된 그대로입니다.

---
# 6) 최종 실행
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```