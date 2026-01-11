🔹 Django 튜토리얼 Part7 – Django의 관리자(Admin) 페이지를 커스터마이징 
###### 📖 공식 문서 링크:  
🔗 [https://docs.djangoproject.com/ko/stable/intro/tutorial07/](https://docs.djangoproject.com/ko/stable/intro/tutorial07/)

목표
- `admin.site.register()`를 활용하여 관리자 페이지에 모델 등록
- `ModelAdmin` 클래스 사용하여 필드 재배치 및 분할 (`fieldsets`)
- `InlineModelAdmin`으로 관련 모델(`Choice`)을 인라인으로 추가
- `list_display`, `list_filter`, `search_fields` 등으로 목록 커스터마이징
- 관리자 페이지 템플릿 커스터마이징 (`base_site.html`, `index.html`)
- `was_published_recently()` 같은 커스텀 메서드를 정렬 가능하게 표시

---
✨ 전체코드 실습부터 하기

아래 코드는 `admin.py`는 Django 관리자(admin) 페이지에서 `Question`(질문)과 `Choice`(선택지) 모델을 더 편리하게 보고, 추가·수정·검색할 수 있도록 커스터마이징하는 설정입니다.  

기본적으로 Django는 모델을 admin에 등록하면 아주 기본적인 UI만 제공하지만, 이 코드는 그 기본을 넘어 더 직관적이고 강력한 관리 화면을 만들어줍니다.

✅ `polls/admin.py`
```python
from django.contrib import admin
from .models import Question, Choice

# Choice 인라인 (Tabular 형식)
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 3

# Question 모델 커스터마이징
class QuestionAdmin(admin.ModelAdmin):
    fieldsets = [
        ("제목", {"fields": ["question_text"]}),
        ("날짜정보", {"fields": ["pub_date"], "classes": ["collapse"]}),
    ]
    inlines = [ChoiceInline]
    list_display = ["question_text", "pub_date", "was_published_recently"]
    list_filter = ["pub_date"]
    search_fields = ["question_text"]

# 등록
admin.site.register(Question, QuestionAdmin)
admin.site.register(Choice)
```
	Choice 모델을 Question 관리자 페이지 안에서 인라인으로 
	관리할 수 있게 정의합니다.
		
	Question 모델을 커스터마이징하는 관리자 클래스입니다.

---
🔹 데코레이터란?
	파이썬에서 데코레이터(decorator)는 함수나 메서드에 추가 기능을 쉽게 부여할 수 있도록 해주는 문법적인 도구입니다. `@` 기호를 사용해서 함수나 메서드 위에 사용하며 함수(또는 메서드)를 다른 함수로 감싸서 수정하거나 확장하는 방법입니다.  함수의 동작을 바꾸지 않고, 부가적인 기능을 추가할 때 유용합니다.

📖 기본적인 데코레이터 예시:
```python
def my_decorator(func):
    def wrapper():
        print("함수 실행 전")
        func()
        print("함수 실행 후")
    return wrapper

@my_decorator
def say_hello():
    print("안녕하세요!")

say_hello()
```

🖨️ 출력결과:
```python
함수 실행 전
안녕하세요!
함수 실행 후
```
- `@my_decorator`는 `say_hello = my_decorator(say_hello)` 와 같은 의미입니다.
- `say_hello()`를 실행하면, 실제로는 `wrapper()`가 실행됩니다.

Django에서 인증, 권한, Admin 커스터마이징 등에 많이 사용됩니다.

---
아래 코드는 어떤 질문(Question)이 최근(하루 이내)에 게시되었는지를 판단하는 `was_published_recently`라는 메서드를 정의하고, 이 메서드를 Django Admin 페이지에 표시되도록 설정한 코드입니다.

✅ `polls/models.py` (추가 메서드 포함)
```python
import datetime
from django.utils import timezone
from django.contrib import admin


class Question(models.Model):

    @admin.display(
        boolean=True,
        ordering="pub_date",
        description="Published recently?",
    )
    def was_published_recently(self):
        now = timezone.now()
        return now - datetime.timedelta(days=1) <= self.pub_date <= now
```
---
📁`admin` 커스터마이징 디렉토리 구조:
```
mysite/
├── manage.py
├── mysite/
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── polls/
│   ├── __init__.py
│   ├── admin.py        # ← 관리자 커스터마이징 코드 위치
│   ├── apps.py
│   ├── migrations/
│   │   └── __init__.py
│   ├── models.py
│   ├── templates/
│   │   └── polls/
│   │       └── ...     # (필요하다면 앱 전용 템플릿 여기에 추가)
│   ├── tests.py
│   └── views.py
└── templates/
    └── admin/
        └── base_site.html  # ← 관리자 템플릿 커스터마이징 파일

```
---
✅ `templates/admin/base_site.html`
```html
{% extends "admin/base.html" %}
{% block branding %}
<div id="site-name">
	<a href="{% url 'admin:index' %}">Polls Administration</a>
</div>
{% endblock %}
```
- `admin:index` → `/admin/`로 이동 `127.0.0.1:8000/admin/`
- `index` → `/`로 이동
```html
<a href="{% url 'admin:index' %}">Admin Home</a>
<a href="{% url 'index' %}">Site Home</a>
```
---
✨ 코드리뷰

1️⃣ `polls/admin.py`

`필요한 모듈 가져오기`
```python
from django.contrib import admin
from .models import Question, Choice
```
	django.contrib.admin: 
	Django의 관리자 기능을 담당하는 모듈로 Django의 자동 생성 관리자 
	페이지를 제어할 수 있게 해줍니다.
	from .models import Question, Choice:
	같은 앱(polls)에 있는 Question과 Choice 모델을 가져옵니다.

`ChoiceInline` 클래스
```python
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 3
```
	→ Choice 모델을 Question 관리자 페이지 안에서 인라인으로 관리할 
	수 있게 정의합니다.
	- TabularInline: 표 형식으로 (행-열) 보여주는 방식.
	- extra = 3: 기본적으로 빈 선택지 폼 3개를 보여줍니다.
	결과적으로, 관리자가 질문을 추가할 때 같은 화면에서 선택지들도 
	한꺼번에 등록할 수 있게 됩니다.

`QuestionAdmin` 클래스
```python
class QuestionAdmin(admin.ModelAdmin):
    fieldsets = [
        ("제목", {"fields": ["question_text"]}),
        ("날짜정보", {"fields": ["pub_date"], "classes": ["collapse"]}),
    ]
```
	→ Question 모델을 커스터마이징하는 관리자 클래스입니다.  
	이 안에 여러 옵션이 들어갑니다:

`fieldsets`
```python
    fieldsets = [
        ("제목", {"fields": ["question_text"]}),
        ("날짜정보", {"fields": ["pub_date"], "classes": ["collapse"]}),
    ]
```
	이 코드는 Django admin에서 Question 모델의 입력 폼(추가·수정 
	화면)에서 필드의 배치와 그룹화를 제어합니다.
	ModelAdmin 클래스 안에 들어가는 설정 중 하나예요.

![[Pasted image 20250603092640.png]]

![[Pasted image 20250603095329.png]]

![[Pasted image 20250603095611.png]]
![[Pasted image 20250603095624.png]]

`fieldsets`란?
- 기본적으로 Django admin은 모델에 정의된 필드를 전부 한 덩어리로 쭉 나열합니다.
- 하지만 `fieldsets`를 쓰면 폼 필드를 논리적 그룹으로 묶고, 그룹마다 제목을 붙이거나 접을 수 있는(collapse) 스타일을 줄 수 있습니다.

📖 문법구조: 
```python
fieldsets = [
    (그룹 제목, {옵션들}),
    ...
]
```

◽ 첫 번째 그룹
```python
(None, {"fields": ["question_text"]})
```
- 그룹 제목: `None` → 제목 없이 보여줌.
- `fields`: `["question_text"]` → `question_text` 필드만 이 그룹에 표시.
    
이 그룹은 주로 폼 맨 위에 기본 필드를 보여줄 때 씁니다.  
그래서 질문 추가 화면에서는 질문 내용(`question_text`)만 딱 보이게 됩니다.

◽ 두 번째 그룹
```python
("Date information", {"fields": ["pub_date"], "classes": ["collapse"]})
```
- 그룹 제목: `"Date information"` → “Date information”라는 제목이 붙은 박스로 보여줌.
- `fields`: `["pub_date"]` → 발행일(`pub_date`) 필드가 포함됨.
- `classes`: `["collapse"]` → 이 박스는 접힌 상태로 기본 표시되고, 클릭하면 열 수 있음.
이 설정 덕분에 관리자가 질문을 추가하거나 수정할 때:  
- 평소에는 발행일 정보는 접혀 있고  
- 필요할 때만 열어서 수정할 수 있게 됩니다.

❓ 왜 이렇게 쓰나?
- 필드를 그룹화하면 폼이 더 깔끔해지고, 중요도가 낮은 정보는 숨겨서 UX(사용자 경험)를 개선할 수 있어요.
- 예를 들어 발행일 같은 건 기본값을 그대로 쓰는 경우가 많고, 자주 바꾸지 않으니까 접어두는 거죠.

`inlines`
```python
inlines = [ChoiceInline]
```
- `Question`을 편집할 때 그 아래에 연결된 `Choice`들을 같이 편집할 수 있게 보여줌.

`list_display`
```python
list_display = ["question_text", "pub_date", "was_published_recently"]
```
- 관리자 리스트 페이지에서 어떤 컬럼들을 보여줄지 지정.
- `was_published_recently`: 아마도 `models.py`에서 정의한 메서드 (예: 최근에 게시되었는지 여부를 반환).

`list_filter`
```python
list_filter = ["pub_date"]
```
- 오른쪽에 **필터 박스**를 만들어서 게시 날짜별로 쉽게 걸러볼 수 있게 함.

`search_fields`
```python
search_fields = ["question_text"]
```
- 검색창에서 `question_text` 내용을 검색할 수 있게 함.

`모델 등록`
```python
admin.site.register(Question, QuestionAdmin)
admin.site.register(Choice)
```
- `Question` 모델은 `QuestionAdmin` 설정을 적용해서 등록.
- `Choice` 모델은 기본 설정으로 그냥 등록.

---
2️⃣ 데코레이터(@admin.display)

```python
import datetime
from django.utils import timezone
from django.contrib import admin    
```
- `datetime`: 파이썬의 표준 날짜/시간 처리 모듈입니다.
- `timezone`: Django에서 타임존을 고려한 현재 시간 등을 처리할 때 사용하는 유틸리티입니다.
- `admin`: Django Admin 인터페이스를 커스터마이징하기 위한 모듈입니다.

```python
    @admin.display(
        boolean=True,
        ordering="pub_date", 
        description="Published recently?",
    )
    def was_published_recently(self):
        now = timezone.now()
        return now - datetime.timedelta(days=1) <= self.pub_date <= now
```
- 이 데코레이터는 `was_published_recently` 메서드를 Django Admin 리스트 페이지에서 사용할 수 있게 꾸며줍니다.
    
◽ 데코레이터 옵션 설명:
- `boolean=True`: Admin 페이지에서 True/False 값을 체크박스 형태로 표시하게 합니다.
- `ordering="pub_date"`: 이 컬럼을 클릭하면 `pub_date` 필드를 기준으로 정렬됩니다.
- `description="Published recently?"`: Admin 페이지의 컬럼 제목입니다.

![[커리큐럼/03 Django 기본 & 데이터베이스 구축(Djnago+DRF)/images/Pasted image 20250609153241.png]]

---
```python
    def was_published_recently(self):
        now = timezone.now()
        return now - datetime.timedelta(days=1) <= self.pub_date <= now
```
- `now = timezone.now()`: 현재 시간을 가져옵니다 (타임존을 고려함).
- `self.pub_date`: `Question` 인스턴스가 저장한 게시일자입니다.
- `now - datetime.timedelta(days=1) <= self.pub_date <= now`:
    - 현재 시간(`now`)에서 1일을 뺀 시간부터 지금까지의 사이에 `pub_date`가 있으면 True를 반환합니다.
    - 즉, "게시일자가 현재 시간 기준으로 24시간 이내냐?"를 판단합니다.