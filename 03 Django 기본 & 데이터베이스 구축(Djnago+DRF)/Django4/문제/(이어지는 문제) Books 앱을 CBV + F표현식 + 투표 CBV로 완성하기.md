## 목표

- 책 목록/상세/결과는 **CBV(generic)** 로 구성한다.
- 투표 처리는 **CBV로 변경**한다. (함수형 vote 금지)
- 투표 증가 로직은 **F 표현식**으로 동시성 안전하게 처리한다.
- 목록 페이지에서 **인기 점수(popularity_score)** 를 “표현식 계산”으로 만들어서 같이 출력한다.
    - popularity_score = votes * 10 (DB에서 계산)

---

# 0) URL 설계(정답 아님, 요구사항)

- `/books/` : 책 목록 (ListView)
- `/books/<pk>/` : 책 상세 + 투표 버튼 (DetailView)
- `/books/<pk>/vote/` : 투표 처리 (CBV / POST면 +1 / GET이면 에러 메시지로 detail 재렌더)
- `/books/<pk>/results/` : 결과 페이지 (DetailView)

---

# 1) 모델 정의 – `books/models.py`

✅ 아래 요구사항대로 `Book` 모델을 정의하세요.

### 요구사항

- `title`: CharField(max_length=200)
- `author`: CharField(max_length=100)
- `votes`: IntegerField(default=0)
- `__str__`도 보기 좋게 출력되도록 구현

### 문제 코드(여기 채우기)

```python
from django.db import models

class Book(models.Model):
    # TODO: title 필드 만들기 (최대 200자)
    # TODO: author 필드 만들기 (최대 100자)
    # TODO: votes 필드 만들기 (정수, 기본 0)

    def __str__(self):
        # TODO: "제목 - 저자" 형태로 반환하기
        pass
```

---

# 2) 뷰 작성 – `books/views.py` ✅ (핵심 문제)

## (1) 책 목록: `BookListView` (ListView) + 인기 점수 계산

### 요구사항

- `ListView` 사용
- 템플릿: `books/book_list.html`
- 템플릿 변수명: `books`
- `get_queryset()`에서
    - `popularity_score = votes * 10` 을 **DB에서 계산**해서 붙여서 넘기기
    - `votes` 내림차순, `title` 오름차순 정렬

### 문제 코드(여기 채우기)

```python
from django.views import generic
from django.db.models import F, IntegerField, ExpressionWrapper
from .models import Book

class BookListView(generic.ListView):
    model = Book
    template_name = "books/book_list.html"
    context_object_name = "books"

    def get_queryset(self):
        # TODO:
        # 1) Book.objects에서 annotate로 popularity_score 붙이기
        # 2) popularity_score = votes * 10 (ExpressionWrapper + F 사용)
        # 3) order_by("-votes", "title")
        pass
```

---

## (2) 책 상세: `BookDetailView` (DetailView)

### 요구사항

- `DetailView` 사용
- 템플릿: `books/book_detail.html`
- 템플릿 변수명: `book`

### 문제 코드(여기 채우기)

```python
class BookDetailView(generic.DetailView):
    # TODO: model 지정
    # TODO: template_name 지정
    # TODO: context_object_name = "book"
    pass
```

---

## (3) 결과 페이지: `BookResultsView` (DetailView)

### 요구사항

- `DetailView` 사용
- 템플릿: `books/book_results.html`
- 템플릿 변수명: `book`

### 문제 코드(여기 채우기)

```python
class BookResultsView(generic.DetailView):
    # TODO: model 지정
    # TODO: template_name 지정
    # TODO: context_object_name = "book"
    pass
```

---

## (4) ✅ 투표 처리: `BookVoteView` (CBV로 작성)

### 요구사항

- **함수형 vote 금지**
- `django.views.View`를 사용하여 `BookVoteView` 작성
- `post(self, request, pk)`:
    1. pk로 Book 객체 가져오기(없으면 404)
    2. **F 표현식으로 votes 1 증가**
        - 힌트: `Book.objects.filter(pk=...).update(votes=F("votes")+1)`
    3. 결과 페이지로 리디렉션
        - 힌트: `HttpResponseRedirect(reverse("books:results", args=(pk,)))`
- `get(self, request, pk)`:
    - GET으로 들어오면 **오류 메시지 포함하여 상세 페이지를 다시 렌더링**
    - context에 `error_message`를 담아라

### 문제 코드(여기 채우기)

```python
from django.views import View
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.db.models import F

class BookVoteView(View):
    def post(self, request, pk):
        # TODO: book 가져오기 (404 처리)
        # TODO: votes를 F 표현식으로 +1 증가시키기 (update 사용)
        # TODO: results 페이지로 redirect
        pass

    def get(self, request, pk):
        # TODO: book 가져오기 (404 처리)
        # TODO: detail 페이지를 다시 렌더링
        # TODO: error_message를 context로 전달 ("투표는 POST로만 가능합니다.")
        pass
```

---

# 3) URL 설정 – `books/urls.py`

### 요구사항

- 네임스페이스 `app_name = "books"`
- URL 패턴 이름(name) 정확히:
    - list / detail / vote / results

### 문제 코드(여기 채우기)

```python
from django.urls import path
from . import views

app_name = "books"

urlpatterns = [
    # TODO: /books/ -> BookListView
    # TODO: /books/<pk>/ -> BookDetailView
    # TODO: /books/<pk>/vote/ -> BookVoteView
    # TODO: /books/<pk>/results/ -> BookResultsView
]
```

그리고 `bookproject/urls.py`에서 `/books/`로 include 하세요.

---

# 4) 템플릿 작성 (정답 없음, 요구사항만)

## `books/templates/books/base.html`

- `{% block title %}`, `{% block content %}` 만들기
- static css 연결 (`books/css/style.css`)

---

## `books/templates/books/book_list.html`

### 요구사항

- base.html 상속
- books 반복 출력
- 책 제목 클릭 시 상세 페이지로 이동
- votes와 popularity_score 출력

✅ 힌트

- 링크: `{% url 'books:detail' book.id %}`
- 점수: `{{ book.popularity_score }}`

---

## `books/templates/books/book_detail.html`

### 요구사항

- 제목/저자 출력
- 투표 버튼 POST 폼 작성 (csrf 포함)
- error_message 있으면 출력
- 폼 action은 vote URL로

✅ 힌트

- action: `{% url 'books:vote' book.id %}`
- method="post"
- `{% csrf_token %}`

---

## `books/templates/books/book_results.html`

### 요구사항

- 제목/저자/총투표수 출력
- 목록으로 돌아가기 링크

✅ 힌트

- `{% url 'books:list' %}`

---

# 5) CSS – `books/static/books/css/style.css`

### 요구사항(필수)

- `.container`: padding, 배경색, 둥근 테두리
- `.book-list`: list-style 제거, 간격 조정

(디자인은 자유)

---

# 6) 실행 체크

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

✅ 확인할 것

- `/books/` 목록이 뜨는가?
- 제목 클릭 → `/books/<id>/`
- 투표 버튼 클릭 → `/books/<id>/results/` 이동 + votes 증가
- `/books/<id>/vote/`를 브라우저에서 직접(GET) 치면 detail로 돌아가며 에러 메시지가 뜨는가?
- 목록에서 score(votes*10)가 계산되어 보이는가?