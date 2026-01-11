🔹 데이터베이스 설정 (DB CONFIGURATION)
```python
# mysite > settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```
- Django 프로젝트의 `settings.py`에서 데이터베이스를 설정하는 코드입니다.
- 기본 설정은 SQLite 사용 (간단한 테스트/학습용 DB).

  [DB설정 공식문서](https://docs.djangoproject.com/en/4.1/ref/settings/#databases)

---
🔹 SQLite 브라우저 사용 (SQLITE BROWSER)
	`DB Browser for SQLite`를 사용하면 Django의 `db.sqlite3` 파일을 GUI로 열어 테이블과 데이터를 직접 확인할 수 있습니다.
	[SQLite 다운로드](https://sqlitebrowser.org/)

🔹 get vs. filter (쿼리 비교)

◽ ` get()`
- 딱 하나의 객체만 가져옴
- 여러 개거나 없으면 에러 발생
```python
Question.objects.get(pk=1)
```

◽ `filter()` 
- 조건에 맞는 여러 개의 객체(QuerySet)를 가져옴
- 없으면 빈 결과 반환 (에러 ❌)
```python
Question.objects.filter(id=1)
```

◽ Field Lookup (필드 조회)
- Django ORM에서 **WHERE 절**에 해당하는 조건을 줄 때 사용
- `__`(언더바 두 개)로 **lookup type**을 연결
```python
Entry.objects.filter(pub_date__lte='2006-01-01')
# pub_date <= '2006-01-01'

Blog.objects.get(name__iexact='beatles blog')
# 대소문자 구분 없이 일치

Entry.objects.get(headline__contains='Lennon')
# headline LIKE '%Lennon%'

Entry.objects.filter(id__in=[1, 3, 4])
# id IN (1, 3, 4)
```

◽ 관계 필드 조회 (Join Query)
- 외래키 관계에서 관련된 필드를 조회할 때는  
- `relatedfield__fieldname` 형태로 사용
```python
Entry.objects.filter(blog__name='Beatles Blog')
# Entry 테이블에서 blog 테이블의 name이 'Beatles Blog'인 경우
```

◽ 복잡한 조건: Q 객체 사용 (Complex Lookup)
- 여러 조건을 **OR** 또는 AND로 조합할 때 사용
- `Q()`는 복합 조건식을 만들고, `|`, `&`, `~` 연산자 사용 가능
```python
from django.db.models import Q

# 질문이 'Who'로 시작하거나 pub_date가 2005년이면
Poll.objects.get(
    Q(question__startswith="Who") | Q(pub_date__year=2005)
)

# NOT 조건
Poll.objects.get(
    ~Q(pub_date__year=2005)
)
```

◽ QuerySet Evaluation (평가 시점)
	QuerySet은 실제로 데이터베이스를 바로 조회하지 않습니다!

실제 쿼리 수행되는 시점:
- `for`문으로 순회할 때
- 슬라이싱할 때 (`Post.objects.all()[:3]`)
- `list()`로 변환할 때
- `len()` 또는 `repr()` 호출할 때
- `if`, `bool()`로 논리값 평가할 때

> 요약: "사용될 때 진짜로 쿼리가 실행된다."

◽ 적용 예시 
```python
# 질문이 "취미"를 포함하는 경우 조회
Question.objects.filter(question_text__contains="취미")

# id가 1, 2인 질문만
Question.objects.filter(id__in=[1, 2])

# 외래키를 통한 역참조: id=1인 질문의 선택지들
Choice.objects.filter(question__id=1)
```