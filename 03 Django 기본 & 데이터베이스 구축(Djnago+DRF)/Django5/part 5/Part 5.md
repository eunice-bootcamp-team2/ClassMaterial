🔹 Django 튜토리얼 Part5 – 더 나은 템플릿 작성하기
###### 📖 공식 문서 링크:  
🔗 [https://docs.djangoproject.com/ko/stable/intro/tutorial05/](https://docs.djangoproject.com/ko/stable/intro/tutorial05/)

목표
- 자동화된 테스트의 필요성을 이해한다.
- `was_published_recently()` 모델 메소드의 버그를 테스트 코드로 확인하고 수정한다.
- `IndexView`, `DetailView`와 같은 뷰(View) 기능도 테스트한다.
- 미래의 날짜(pub_date)를 가진 질문은 보이지 않아야 한다는 조건을 코드에 반영하고, 이를 테스트로 검증한다.
- 향후 더 큰 규모의 프로젝트에서 신뢰성 있는 유지보수를 가능하게 만드는 테스트 기반 개발을 실습해본다.

Part5에서는 코드가 잘 작동하는지 자동으로 확인하는 테스트 코드를 만드는 방법을 익힙니다.

---
🔹 `tests.py`란?
	`tests.py`는 Django 앱에서 모델, 뷰, 폼 등의 기능이 올바르게 작동하는지 자동으로 검증하기 위해 작성하는 테스트 코드 파일입니다.

❓ `tests.py`는 왜 필요한가?

이유 1: 버그를 미리 잡기 위해
- 미래 날짜 질문이 "최근"으로 잘못 처리되는 문제를 사람이 눈으로는 못 볼 수 있습니다.
- 테스트를 만들어두면 코드를 고칠 때마다 자동으로 알려줍니다.
    
이유 2: 계속 수정해도 기능이 망가지지 않도록 하기 위해
- 코드가 많아질수록 어디가 잘못됐는지 찾기 어려워집니다.
- 테스트 코드를 만들어두면 "어떤 기능이 깨졌는지" 바로 확인할 수 있습니다.

즉, `tests.py`는 일종의 '자동 검사기계'라고 생각하면 됩니다.

📋 `tests.py`가 있다면 이런점이 효율적입니다:
- 코드가 잘 작동하는지 자동으로 검사해줌 
- 미래에 코드가 바뀌어도 기존 기능이 깨지지 않았는지 확인 가능
- Django가 테스트 전용 데이터베이스를 자동으로 생성하고 삭제해줌
- 실무에서는 팀원들이 마음 놓고 작업할 수 있는 안전망 역할

📋 핵심 개념 요약:
- Django 앱마다 기본으로 제공되는 테스트 전용 파일
- 함수 이름을 `test_`로 시작하고, `TestCase` 클래스를 상속하여 작성
- 명령어 한 줄(`python manage.py test`)로 모든 테스트를 자동 실행 가능
- 코드 변경 후에도 기존 기능이 정상적으로 유지되는지 확인하는 도구

📁 `polls/tests.py` (앱 폴더에 있는 테스트 파일)
```
mysite/
├── polls/
│   ├── models.py
│   ├── views.py
│   ├── tests.py   ← 여기에 테스트 클래스 작성
```
- Django는 이 파일 안에 `TestCase`를 상속받은 클래스들을 자동으로 인식해서 테스트합니다.
---
📖 테스트 작성 기본 공식(패턴) 
```python
from django.test import TestCase
from .models import YourModel

class YourModelTests(TestCase):

    def test_something(self):
	    # 1. 테스트할 객체를 생성하고
        객체 = YourModel(속성)
			
		# 2. 테스트할 메서드를 실행하고
        결과 = 객체.메서드()
			
		# 3. 결과가 기대값과 같은지 확인
        self.assertEqual(결과, 기대값)
```
이 패턴을 기억하고 여러 기능마다 `test_`로 시작하는 메서드를 만들면 됩니다.

`assertEqual()` – 값 비교
`assertIs()` – True/False 명확 비교

---
```python
    def was_published_recently(self):
        from django.utils import timezone
        import datetime
        return self.pub_date >= timezone.now() - datetime.timedelta(days=1)
```
- 위 코드는 날짜 계산을 잘못 하는 핵심 버그 문제코드입니다. 
- 겉보기와 실행에는 문제가 없지만 날짜 계산이 잘못 나와서 원하는 결과가 나오지 않습니다.
- 에러 코드를 뱉어내지 않으니 어디서 문제가 발생되는지 알수가 없습니다.
- 그래서 테스트 기반의 코드로 변경하여 에러를 잡아낼수 있습니다.

---
✨ 전체코드 실습부터 하기

✅ `polls/views.py` : `Question.objects.filter(pub_date__lte=timezone.now())` 추가
```python
from django.utils import timezone
from django.db.models import F
from django.urls import reverse
from django.views import generic
from django.http import HttpResponseRedirect

class IndexView(generic.ListView):
	template_name = "polls/index.html"
    context_object_name = "latest_question_list"

    def get_queryset(self):
        return Question.objects.filter
        (pub_date__lte=timezone.now()).order_by("-pub_date")[:5]

class DetailView(generic.DetailView):
	model = Question
    template_name = "polls/detail.html"
	context_object_name = "question"

    def get_queryset(self):
        return Question.objects.filter(pub_date__lte=timezone.now())

class ResultsView(generic.DetailView):
	model = Question
    template_name = "polls/results.html"
	context_object_name = "question"

    def get_queryset(self):
        return Question.objects.filter(pub_date__lte=timezone.now())

# 투표 처리 로직
def vote(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    try:
        selected_choice = question.choice_set.get
        (pk=request.POST["choice"])
    except (KeyError, Choice.DoesNotExist):
        return render(
            request,
            "polls/detail.html",
            {
                "question": question,
                "error_message":"You didn't select a choice.",
            },
        )
    else:
        selected_choice.votes = F("votes") + 1
        selected_choice.save()
        return HttpResponseRedirect(reverse
        ("polls:results", args=(question.id,)))
```

`특정 뷰(Class-based view)에서 미래에 공개될 질문을 숨기기 위해 사용합니다.`
```python
    def get_queryset(self):
        return Question.objects.filter
        (pub_date__lte=timezone.now())
```
	→ 미래에 공개될 질문은 목록에 안 뜨게 해야 함

- `get_queryset()` → ListView나 DetailView 등에서 화면에 보여줄 데이터(쿼리셋)를 "직접 정의"하는 메서드
- `Question.objects.filter(...)`: ORM 매니저를 통해 DB 조회
- `pub_date`: 게시일
- `__lte`:" less than or equal to" → 이하
- `timezone.now()`: 현재 시각 (datetime 객체)
위 코드의 뜻은 게시일이 '지금 시간보다 같거나 이전인 데이터만 가져와라'는 뜻입니다.

---
==즉 다시 정리하면:==
`get_queryset()`에 `pub_date__lte=timezone.now()` 필터를 넣는 이유는  
“미래에 공개될 콘텐츠가 목록·상세·결과 페이지 어디에서도 보이지 않게 하기 위해서”이다.

---
이 코드는 Django 공식 튜토리얼 Part 5에서 사용하는 코드이며, 공식 문서에서 제시하는 방법이자 모범 사례입니다.

🤔 상황예시:
당신이 뉴스 웹사이트를 만들고 있다고 가정합시다.  
뉴스 기사에는 `publish_date` 필드가 있고, 미래 시점의 뉴스는 예약 발행됩니다. 

문제: 사용자가 뉴스 목록을 보는데, 6월 10일 기사가 오늘(6월 4일)에 보이면 이상하죠?

해결: `get_queryset()`으로 미래의 뉴스는 숨기는 겁니다.

즉, 지금은 문제가 없어도, 미래에 생길 가능성을 대비해서 넣어두는 필터라고 이해하면 됩니다. 날짜(publish_date, pub_date 등)를 기준으로 콘텐츠가 "보여질지 말지" 결정되는 클래스라면, 거의 ‘공식처럼’ 이 필터를 붙입니다.
- `IndexView (목록 페이지)` : `filter(pub_date <= now)`	
	리스트에 미래 질문이 뜨면 안 됨
- `DetailView (상세 페이지)` : `filter(pub_date <= now)`	
	URL로 미래 질문에 직접 들어갈 수 있음 → 막아야 함
- `ResultsView (결과 페이지)` : `filter(pub_date <= now)`	
	미래 질문의 결과 페이지도 막아야 함
---
✅ `polls/tests.py` 전체 테스트 코드
```python
import datetime
from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from .models import Question

# 공통 함수: 테스트용 Question 객체 생성기
def create_question(question_text, days):
    """
    days만큼 현재 시각에서 더하거나 빼서 pub_date를 설정한 Question 생성
    (days > 0 → 미래 / days < 0 → 과거)
    """
    time = timezone.now() + datetime.timedelta(days=days)
    return Question.objects.create
    (question_text=question_text, pub_date=time)

# 모델 메서드 테스트: Question.was_published_recently()
class QuestionModelTests(TestCase):
    def test_was_published_recently_with_future_question(self):
        """
        미래 날짜의 질문은 최근 게시된 것이 아니므로 False를 반환해야 함
        """
        time = timezone.now() + datetime.timedelta(days=30)
        future_question = Question(pub_date=time)
        self.assertIs
        (future_question.was_published_recently(), False)

    def test_was_published_recently_with_old_question(self):
        """
        1일 넘은 과거 질문은 최근 게시된 것이 아니므로 False를 반환해야 함
        """
        time = timezone.now() - datetime.timedelta
        (days=1, seconds=1)
        old_question = Question(pub_date=time)
        self.assertIs
        (old_question.was_published_recently(), False)

    def test_was_published_recently_with_recent_question(self):
        """
        1일 이내의 질문은 최근 게시된 것이므로 True를 반환해야 함
        """
        time = timezone.now() - datetime.timedelta
        (hours=23, minutes=59, seconds=59)
        recent_question = Question(pub_date=time)
        self.assertIs
        (recent_question.was_published_recently(), True)

# 뷰 테스트: IndexView (질문 목록 페이지)
class QuestionIndexViewTests(TestCase):
    def test_no_questions(self):
        """
        질문이 하나도 없을 경우, No polls are available. 
        메시지를 출력해야 함
        """
        response = self.client.get(reverse("polls:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, ".")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_past_question(self):
        """
        과거 질문은 목록 페이지에 보여야 함
        """
        question = create_question("Past question.", days=-30)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [question])

    def test_future_question(self):
        """
        미래 질문은 목록 페이지에 표시되지 않아야 함
        """
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_future_question_and_past_question(self):
        """
        과거와 미래 질문이 모두 존재해도 목록에는 과거 질문만 표시되어야 함
        """
        past_question = create_question
        ("Past question.", days=-30)
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual
        (response.context["latest_question_list"],
        [past_question])

    def test_two_past_questions(self):
        """
        여러 개의 과거 질문이 있을 경우, 최신 순으로 모두 표시되어야 함
        """    
        question1 = create_question("Past question 1.", days=-30)
        question2 = create_question("Past question 2.", days=-5)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual(
            response.context["latest_question_list"],
            [question2, question1],
        )
        
# 뷰 테스트: DetailView (질문 상세 페이지)
class QuestionDetailViewTests(TestCase):
    def test_future_question(self):
        """
        미래 질문의 상세 페이지는 접근할 수 없고, 404 오류가 발생해야 함
        """    
        future_question = create_question
        ("Future question.", days=5)
        url = reverse("polls:detail", args=(future_question.id,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_past_question(self):
        """
        과거 질문의 상세 페이지는 정상적으로 접근되어야 하고, 질문 내용이
        표시되어야 함
        """
        past_question = create_question("Past Question.", days=-5)
        url = reverse("polls:detail", args=(past_question.id,))
        response = self.client.get(url)
        self.assertContains(response, past_question.question_text)
```
---
◽ 모델 테스트: `was_published_recently()`
	`Question` 모델의 `was_published_recently()` 메서드가 제대로 동작하는지 확인:
	`was_published_recently()`라는 메서드가 "정말 최근(24시간 이내)에 게시된 질문인지" 정확하게 판단하는지 테스트하는 코드입니다.
```python
class QuestionModelTests(TestCase):
    def test_was_published_recently_with_future_question(self):
        """
        아직 시간이 안 된 미래의 질문은 최근에 올라온 게 아니니까 
        False를 반환해야 합니다.
        """
        time = timezone.now() + datetime.timedelta(days=30)
        future_question = Question(pub_date=time)
        self.assertIs
        (future_question.was_published_recently(), False)

    def test_was_published_recently_with_old_question(self):
        """
        1일 넘은 과거 질문은 최근 게시된 것이 아니므로 False를 반환해야 
        합니다.
        """
        time = timezone.now() - datetime.timedelta
        (days=1, seconds=1)
        old_question = Question(pub_date=time)
        self.assertIs
        (old_question.was_published_recently(), False)

    def test_was_published_recently_with_recent_question(self):
        """
        1일 이내의 질문은 최근 게시된 것이므로 True를 반환해야 함
        """
        time = timezone.now() - datetime.timedelta
        (hours=23, minutes=59, seconds=59)
        recent_question = Question(pub_date=time)
        self.assertIs
        (recent_question.was_published_recently(), True)
```
---
```python
time = timezone.now() + datetime.timedelta(days=30)
```
- `timezone.now()` → 현재 시각 (예: 지금 이 순간) +
- `datetime.timedelta(days=30)` → 30일뒤
- → 현재 시각에 30일을 더함
지금으로부터 30일 후의 시각을 구해서 `time`이라는 변수에 저장한다

시간 사용예시:
```python
from datetime import timedelta
from django.utils import timezone

# 지금 시간
now = timezone.now()

# 30일 뒤 시간
future = now + timedelta(days=30)

# 7일 전 시간
past = now - timedelta(days=7)
```

`days`, `hours`, `minutes`
```python
timedelta(days=1, hours=2, minutes=30)
→ 1일 2시간 30분의 시간 간격
```
---
```python
future_question = Question(pub_date=time)
```
- `Question(...)` → `Question` 모델의 새 객체를 만듦니다.
- `pub_date` → "시각(날짜와 시간)"을 저장하는 필드
- `pub_date=time` → `pub_date` 필드에 앞에서 만든 30일 뒤의 시간을 넣는다
- `future_question` → 이렇게 만든 객체를 여기에 저장한다
---
```python
self.assertIs(future_question.was_published_recently(), False)
```
- `future_question`: 30일 뒤의 `pub_date`를 가진 질문 객체
- `.was_published_recently()`: 이 질문이 최근(1일 이내)에 게시되었는지를 판단하는 메서드
- `False`: "최근 게시된 것이 아니다"는 예상 결과
- `self.assertIs(...)`: 테스트에서 두 값이 정확히 같은 객체인지 검사하는 함수
'미래 날짜의 질문은 최근 게시된 것이 아니므로 `was_published_recently()` 함수 결과가 `False`로 반환해야 하므로 그것을 확인해라' 라는 의미입니다.

| 메서드                                      | 설명                       |
| ---------------------------------------- | ------------------------ |
| `self.assertEqual(a, b)`                 | `a`와 `b`가 같은 값인지 확인      |
| `self.assertTrue(x)`                     | `x`가 True인지 확인           |
| `self.assertFalse(x)`                    | `x`가 False인지 확인          |
| `self.assertIs(a, b)`                    | `a`와 `b`가 정확히 같은 객체인지 확인 |
| `self.assertIsNone(x)`                   | `x`가 None인지 확인           |
| `self.assertIn(a, b)`                    | `a`가 `b` 안에 있는지          |
| `self.assertNotIn(a, b)`                 | `a`가 `b` 안에 없는지          |
| `self.assertContains(response, text)`    | 응답에 `text`가 포함되어 있는지     |
| `self.assertNotContains(response, text)` | 응답에 `text`가 포함되어 있지 않은지  |
| `self.assertRedirects(response, url)`    | 응답이 특정 URL로 리디렉트되는지      |
| `self.assertRaises(ErrorType)`           | 특정 오류가 발생하는지 확인          |

---
```python
    def test_was_published_recently_with_old_question(self):
        """
        1일 넘은 과거 질문은 최근 게시된 것이 아니므로 False를 반환해야 함
        """
        time = timezone.now() - datetime.timedelta
        (days=1, seconds=1)
        old_question = Question(pub_date=time)
        self.assertIs
        (old_question.was_published_recently(), False)
```
- 시간 = 현재시간 - 1일1초전 → 과거

---
```python
    def test_was_published_recently_with_recent_question(self):
        """
        1일 이내의 질문은 최근 게시된 것이므로 True를 반환해야 함
        """
        time = timezone.now() - datetime.timedelta
        (hours=23, minutes=59, seconds=59)
        recent_question = Question(pub_date=time)
        self.assertIs
        (recent_question.was_published_recently(), True)
```
- 시간 = 현재시간 - 23시간 59분 59초 → 1일이내
---
`models.py`의 `Question` 모델 안에 다음과 같이 정의되어 있습니다:
```python
def was_published_recently(self):
    return timezone.now() - datetime.timedelta(days=1) <=
    self.pub_date <= timezone.now()
```
즉, 지금 시간 기준으로 1일 이내에 게시된 질문이면 True,  
그렇지 않으면 False를 반환하는 메서드입니다.

`위 코드의 시간을 풀어보면:`
```python
time1 <= self.pub_date <= time2

여기에서
time1 = timezone.now() - datetime.timedelta(days=1)  
→ 현재시간보다 1일 전

time2 = timezone.now()                             
→ 현재시간
```

- (현재시간 - 1일) <= 게시시간 <= 현재시간
→ 게시시간이 최근 1일 이내에 들어 있으면 `True` 아니면 `False`

---
만약에 test.py를 사용하지 않고 내가 제대로 코딩을 했는지 확인하려면 shell을 사용해야 합니다.

결과값 확인:
```bash
python manage.py shell
```

```bash
from polls.models import Question
from django.utils import timezone
import datetime

# 1일 이내로 생성된 Question 객체 만들기
recent_question = Question.objects.create(
    question_text="최근 질문입니다",
    pub_date=timezone.now() - datetime.timedelta(hours=23)      
) # 23시간 전

# was_published_recently() 호출 및 결과 확인
print("최근 질문의 결과:", recent_question.was_published_recently())  
# 최근 질문의 결과: True

# 오래된 질문도 하나 테스트
old_question = Question.objects.create(
    question_text="오래된 질문입니다",
    pub_date=timezone.now() - datetime.timedelta(days=2)  # 2일 전
)

print("오래된 질문의 결과:", old_question.was_published_recently())  # 오래된 질문의 결과: False
```
이 코드는 Question 클래스 내부에 직접 만든 함수입니다.  
→ 그래서 Question 인스턴스(객체)를 통해 호출할 수 있습니다.

이렇게 하나씩 테스트 하기가 쉽지 않습니다.

`tests.py`는 이걸 자동화해서 대신해주는 파일입니다

---
◽ 인덱스 뷰 테스트: `polls/index.html` 페이지
	- 질문 목록 페이지에 어떤 질문이 보이는지 확인
    - 미래 질문은 숨겨지고, 과거 질문만 보여야 함
```python
class QuestionIndexViewTests(TestCase):
    def test_no_questions(self):
        """
        질문이 하나도 없을 경우, No polls are available. 
        메시지를 출력해야 함
        """
        response = self.client.get(reverse("polls:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_past_question(self):
        """
        과거 질문은 목록 페이지에 보여야 함
        """
        question = create_question("Past question.", days=-30)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [question])

    def test_future_question(self):
        """
        미래 질문은 목록 페이지에 표시되지 않아야 함
        """
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_future_question_and_past_question(self):
        """
        과거와 미래 질문이 모두 존재해도 목록에는 과거 질문만 표시되어야 함
        """
        past_question = create_question
        ("Past question.", days=-30)
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual
        (response.context["latest_question_list"],
        [past_question])

    def test_two_past_questions(self):
        """
        여러 개의 과거 질문이 있을 경우, 최신 순으로 모두 표시되어야 함
        """
        question1 = create_question("Past question 1.", days=-30)
        question2 = create_question("Past question 2.", days=-5)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual(
            response.context["latest_question_list"],
            [question2, question1],
        )
```
---
```python
def test_no_questions(self):
        """
        질문이 하나도 없을 경우, No polls are available. 
        메시지를 출력해야 함
        """
        response = self.client.get(reverse("polls:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])
```
- `response = self.client.get(reverse("polls:index"))`:
	`"polls:index"`라는 주소로 GET 요청을 보내고, 그 결과를 `response`에 저장한다.

`response를 검사(테스트)`
```python
		self.assertEqual(response.status_code, 200)
		# 응답 코드가 200(성공)인지 확인
		
        self.assertContains(response, "No polls are available.")
        # 응답 HTML 안에 "No polls .."라는 문구가 있는지 확인
        
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])
        # context 안에 있는 질문 리스트가 빈 리스트인지 확인
```
---
```python
    def test_past_question(self):
        """
        과거 질문은 목록 페이지에 보여야 함
        """
        question = create_question("Past question.", days=-30)
        response = self.client.get(reverse("polls:index"))
        
        # 검사테스트 (a,b) → a와 b가 같은지 검사
        self.assertQuerySetEqual 
        (response.context["latest_question_list"], [question])
```
- `self.assertQuerySetEqual:` `a`와 `b`가 같은 데이터를 갖는지 확인

`polls/index.html`
```html
{% for question in latest_question_list %}
  {{ question.question_text }}
{% endfor %}
```
`response.context["latest_question_list"]`는 테스트에서 index 페이지를 호출했을 때, 템플릿으로 전달된 질문 목록을 의미합니다.
즉, 템플릿으로 전달된 질문 리스트에 방금 만든 question만 있는지 검사

---
```python
    def test_future_question(self):
        """
        미래 질문은 목록 페이지에 표시되지 않아야 함
        """
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])
```
- `create_question("Future question.", days=30)`:오늘로부터 30일 뒤의 날짜를 `pub_date`로 갖는 `Question` 객체를 생성. 즉, 미래에 게시될 질문을 만듦.
- 예: 오늘이 6월 5일이라면, `pub_date`는 7월 5일

- `self.assertContains(response, "No polls are available.")`: 응답된 페이지(HTML)에 **"No polls are available."** 라는 문구가 포함되어 있는지 검사. 즉, 사용자가 봤을 때 "질문이 없어요" 메시지가 보여야 한다는 테스트함.

- `self.assertQuerySetEqual`
  `(response.context["latest_question_list"], [])`: 뷰에서 템플릿에 전달된 질문 목록(`latest_question_list`)이 빈 리스트`[]` 인지 검사. 
  즉, 미래 질문은 목록에 포함되지 않아야 함을 확인하는 테스트
---
```python
    def test_future_question_and_past_question(self):
        """
        과거와 미래 질문이 모두 존재해도 목록에는 과거 질문만 표시되어야 함
        """
        past_question = create_question
        ("Past question.", days=-30)
        create_question("Future question.", days=30)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual
        (response.context["latest_question_list"],
        [past_question])
```
- 직접 해석해 봅니다.

---
```python
    def test_two_past_questions(self):
        """
        여러 개의 과거 질문이 있을 경우, 최신 순으로 모두 표시되어야 함
        """    
        question1 = create_question("Past question 1.", days=-30)
        question2 = create_question("Past question 2.", days=-5)
        response = self.client.get(reverse("polls:index"))
        self.assertQuerySetEqual(
            response.context["latest_question_list"],
            [question2, question1],
        )
```
- 직접 해석해 봅니다.

---
◽상세 페이지 뷰 테스트: `polls/detail.html`
	상세 페이지가 과거 질문은 보여주고, 미래 질문은 404 오류 반환하는지 확인
```python
class QuestionDetailViewTests(TestCase):
    def test_future_question(self):
        """
        미래 질문의 상세 페이지는 접근할 수 없고, 404 오류가 발생해야 함
        """
        future_question = create_question
        ("Future question.", days=5)
        url = reverse("polls:detail", args=(future_question.id,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_past_question(self):
        """
        과거 질문의 상세 페이지는 정상적으로 접근되어야 하고, 질문 내용이
        표시되어야 함
        """
        past_question = create_question("Past Question.", days=-5)
        url = reverse("polls:detail", args=(past_question.id,))
        response = self.client.get(url)
        self.assertContains(response, past_question.question_text)
```
---
◽ 공통 유틸 함수 : 
	`create_question()` 함수는 테스트나 개발 중에 `Question` 모델 객체를 쉽고 빠르게 생성할 수 있도록 도와주는 헬퍼 함수입니다.

📖 일반적인 패턴 구조
```python
def create_<모델명>(<필드>, <기타 조건>):
    # 현재 시간에서 상대적인 날짜 계산
    pub_date = timezone.now() + datetime.timedelta(days=days)
    
    # 모델 객체 생성 및 리턴
    return Model.objects.create(필드=값, ...)
```
- `<필드>` : 테이블에서 하나의 열(column), 즉 하나의 속성

특히, 질문을 생성할 때 게시일(pub_date)을 현재 기준으로 며칠 전/후로 조정해서 만들 수 있게 해줍니다.
```python
def create_question(question_text, days):
    """
    days만큼 현재 시각에서 더하거나 빼서 pub_date를 설정한 Question 생성
    (days > 0 → 미래 / days < 0 → 과거)
    """
    time = timezone.now() + datetime.timedelta(days=days)
    return Question.objects.create
    (question_text=question_text, pub_date=time)
```
이 함수는 두 개의 인자를 받아서 질문을 하나 만들어줍니다.
- `question_text`: 질문의 텍스트 (예: "what's new?")
- `days`: 오늘을 기준으로 몇 일 전/후인지 설정하는 숫자입니다.
    - 양수 → 미래 날짜
    - 음수 → 과거 날짜
    - 0 → 오늘날짜
```python
create_question("미래 질문", days=5) # 오늘부터 5일 뒤 날짜로 질문 생성
create_question("과거 질문", days=-2)# 2일 전 날짜로 질문 생성
create_question("오늘 질문", days=0) # 오늘 날짜로 질문 생성
```
이 함수가 하는 일
- `days` 값에 따라 날짜를 계산합니다.
- 그 날짜를 `pub_date`로 사용하여 `Question` 객체를 하나 만들어 데이터베이스에 저장합니다.
---
✅ 테스트 실행 명령어
```bash
python manage.py test polls
```

`테스트 결과:`
```bash
Found 8 test(s).
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
.......F
=============================================================
FAIL: test_was_published_recently_with_future_question (polls.tests.QuestionModelTests.test_was_published_recently_with_future_question)
was_published_recently() returns False for questions whose pub_date
--------------------------------------------------------------
Traceback (most recent call last):
  File "/home/youjung/Django_first_for/polls/tests.py", line 26, in test_was_published_recently_with_future_question
    self.assertIs(future_question.was_published_recently(), False)
AssertionError: True is not False

--------------------------------------------------------------
Ran 8 tests in 0.021s

FAILED (failures=1)
Destroying test database for alias 'default'...
```
- 테스트가 총 8개 있음
- 점(`.`)은 통과한 테스트, `F`는 Fail(실패)을 뜻함
- 결과: 7개 성공, 1개 실패

❌ 에러 발생 위치
```python
FAIL: test_was_published_recently_with_future_question (polls.tests.QuestionModelTests.test_was_published_recently_with_future_question)
```
- 실패한 함수 이름: `test_was_published_recently_with_future_question`
- 위치: `polls/tests.py` 파일의 `QuestionModelTests` 클래스 안
- `line 26`	: 테스트 실패한 정확한 줄 번호 알려줌
- `self.assertIs(..., False)` : 이 줄이 실패했단 뜻
---
💬 에러 읽는 3단계 팁:
`FAIL:` 줄 찾기
- 어떤 테스트가 실패했는지 알려줍니다.
- `test_...` 이름이 그대로 나와서 에러 목적을 바로 파악할 수 있어요.

`Traceback` 줄 확인
- 어디서 실패했는지 파일과 줄 번호를 정확하게 알려줘요.
- `polls/tests.py`, `line 26` → 여기를 바로 확인!

`AssertionError:` 줄 읽기
- 기대한 값과 실제 값이 무엇인지 나와요.
- `True is not False` → 우리가 False를 기대했는데, True가 나왔다는 뜻
----
🔹 버그수정

`기존코드` 기존코드의 한계가 있어서 수정이 필요함
```python
    def was_published_recently(self):
        from django.utils import timezone
        import datetime
        return self.pub_date >= timezone.now() - datetime.timedelta(days=1)
```
위 코드는 다음과 같이 해석할수 있습니다.
	"이 질문이 하루 전 이후에 만들어졌으면 최근에 만든 거라고 생각할게"
	
⚠️ 그런데 이 코드에는 문제가 있습니다. 미래의 질문도 최근으로 인정합니다.

</>예시:  지금 시각이 6월 1일 오후 12시(정오)라고 가장합니다.
```python
pub_date >= 6월 1일 12시 - 1일 == pub_date >= 5월 31일 12시
```
그러니까 5월 31일 12시 이후에 만든 질문은 모두 "최근"으로 인정한다는 뜻이에요. 
이 코드에서는 미래인지 아닌지 전혀 확인을 안하고  그냥 단순히
 "이게 어제 이후에 만들어졌냐?" 만 확인해요.
그러다 보니, 미래도 어제 이후기때문에 미래도 `True`가 되어버려요

---
⭕ 수정을 하면 지난 하루 이내에 게시되었고, 미래 게시가 아닌 것만 True가 되어 정확한 조건을 만족시킬 수 있게 됩니다.
✅ `polls/models.py` : `was_published_recently()` 수정
```python
from django.utils import timezone
import datetime

    def was_published_recently(self):
        now = timezone.now()
        return now - datetime.timedelta(days=1) <= 
        self.pub_date <= now
```
- `self.pub_date`가 현재(now) 기준으로
    - 1일 전부터 현재까지의 범위 안에 있는 경우만 True 반환
- 즉, 다음 조건을 모두 만족해야만 최근 게시된 것으로 인정됨:
    - pub_date ≤ now (어제 이후인가?)
    - pub_date ≥ now - 1일 (지금 이전인가?)

✅ 수정후 테스트 실행 명령어
```bash
python manage.py test polls
```

`테스트 결과:`
```bash
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
...........
-------------------------------------------------------
Ran 11 tests in 0.015s

OK
Destroying test database for alias 'default'...
```
---
###### ◽ Django에서 `tests.py`로 테스트할 수 있는 것들
| 테스트 대상                  | 설명                         | 예시                                      |
| ----------------------- | -------------------------- | --------------------------------------- |
| 모델 (Model)              | 모델 메서드, 필드 동작 확인           | `was_published_recently()`가 올바른 값 반환하는지 |
| 뷰 (View)                | 페이지 응답, 상태 코드, 콘텐츠 확인      | 로그인 페이지가 200 OK 응답하는지                   |
| URL 연결                  | URL이 올바른 뷰로 연결되는지          | `/polls/`가 `IndexView`로 가는지             |
| 폼 (Form)                | 폼 유효성 검사                   | 비어 있는 입력값에서 `form.is_valid()`가 False인지  |
| 템플릿 내용                  | 페이지에 특정 텍스트나 HTML 요소 포함 여부 | "No polls available" 문구가 나오는지           |
| 인증/권한 ................. | 로그인 상태, 접근 권한 확인           | 비로그인 사용자가 특정 URL에 접근 시 리다이렉트 되는지        |

📋 그외 활용되는 부분:
- `UserModelTests`: 사용자 로그인 기능 테스트
- `ArticleModelTests`: 게시글 작성 시간이 유효한지 테스트
- `CommentModelTests`: 댓글 내용이 공백일 때 오류 나는지 확인

---
📁 테스트가 많아지면 이렇게 폴더 구조로 나눌 수도 있어요:
```
polls/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_views.py
│   ├── test_forms.py
```
그리고 `pytest`나 Django는 이 구조도 자동으로 인식해줍니다.

---
</> 예시: 뷰(View) 테스트
```python
from django.test import TestCase
from django.urls import reverse

class MyViewTests(TestCase):
    def test_home_page_status_code(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
```

</> 예시: 폼(Form) 테스트
```python
from django.test import TestCase
from .forms import ContactForm

class ContactFormTests(TestCase):
    def test_blank_form_is_invalid(self):
        form = ContactForm(data={})
        self.assertFalse(form.is_valid())
```

</> 예시: 인증 테스트
```python
from django.test import TestCase
from django.urls import reverse

class AuthTests(TestCase):
    def test_login_required_redirect(self):
        response = self.client.get(reverse("dashboard"))
        self.assertRedirects(response, "/accounts/login/?next=/dashboard/")
```
---
###### 🔹 Git Commit Push & Pull
[[Django_basic/Django_공식문서-깃허브업뎃용/2. Part1/Part 1#🔹 Git Commit Push & Pull]]

---
#### 💡 "`tests.py`는 기본 뼈대, 여기에 효율성과 정확도를 높여주는 도구들을 추가로 사용하면 더 강력한 테스트가 됩니다!"
	
◽ 기본 테스트: `tests.py`
- 기능이 잘 작동하는지 확인하는 기본 테스트 코드 작성 파일입니다.
- Django 프로젝트에서 테스트의 시작점이에요.

◽ 효율성 향상: `setUp()`
- 테스트마다 반복되는 코드를 한 번만 작성하고 공통으로 사용할 수 있어요.
- 예: 매번 `Question.objects.create()`를 하지 않아도 됨.

◽ 실행 개선: `pytest`
- `manage.py test`보다 더 깔끔하고 강력한 테스트 도구예요.
- Django 외에서도 널리 쓰이며, 빠른 테스트 실행과 예쁜 출력 제공!

◽ 정확성 보완: `coverage.py`
- 어떤 코드가 테스트되지 않았는지 색으로 시각적으로 보여줘요.
- 테스트를 빠뜨리지 않고 작성했는지 확인할 수 있어요.

◽ 동작 검증: `LiveServerTestCase + Selenium`
- 실제 브라우저를 자동으로 열고, 클릭·입력·응답 등을 테스트할 수 있어요.
- 로그인 없이도 단순한 버튼이나 페이지 이동 테스트는 바로 가능해요.

◽ 인증 테스트: `client.login()`
- 테스트에서 회원가입, 로그인, 로그아웃 같은 인증 동작을 확인할 수 있어요.
- Django 기본 인증 시스템(`django.contrib.auth`)이 필요해요.

◽ 자동화 배포: `GitHub Actions (CI/CD)`
- 누군가 코드 수정 후 GitHub에 올리면, 자동으로 테스트가 실행돼요.
- 문제가 없으면 자동으로 배포까지 할 수 있어요. 실무에서 필수 기능이에요.
---
🔹 `setUp()` 메서드 – 테스트 반복 준비 자동화
	테스트 시작 전에 공통으로 준비할 작업을 자동으로 실행해줌

같은 코드(예: `Question` 만들기)를 여러 테스트에서 반복하지 않아도 됨

</> `setUp()`을 사용한 테스트 코드 예시
```python
import datetime
from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from .models import Question

# 공통함수(변경없음)
def create_question(question_text, days):
    """
    days: 질문 공개 날짜(pub_date)를 오늘 기준으로 며칠 전/후로 설정
    """
    time = timezone.now() + datetime.timedelta(days=days)
    return Question.objects.create
    (question_text=question_text, pub_date=time)

# 모델 메서드 테스트(변경됨)
class QuestionModelTests(TestCase):
    def setUp(self):
        """
        매 테스트마다 사용할 기본 질문 객체 3종 생성
        """
        now = timezone.now()
        self.future_question = Question(pub_date=now +
        datetime.timedelta(days=30))
        self.old_question = Question(pub_date=now - 
        datetime.timedelta(days=1, seconds=1))
        self.recent_question = Question(pub_date=now - 
        datetime.timedelta(hours=23, minutes=59, seconds=59))

    def test_was_published_recently_with_future_question(self):
        """미래 질문은 최근 게시된 것이 아니므로 False"""
        self.assertIs
        (self.future_question.was_published_recently(), False)

    def test_was_published_recently_with_old_question(self):
        """1일 이상 지난 과거 질문은 False"""
        self.assertIs
        (self.old_question.was_published_recently(), False)

    def test_was_published_recently_with_recent_question(self):
        """24시간 이내의 질문은 True"""
        self.assertIs
        (self.recent_question.was_published_recently(), True)

# Index 뷰 테스트(변경없음)
class QuestionIndexViewTests(TestCase):
    def setUp(self):
        self.url = reverse("polls:index")

    def test_no_questions(self):
        """질문이 없을 경우 메시지 출력"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_past_question(self):
        """과거 질문은 목록에 보여야 함"""
        question = create_question("Past question", days=-30)
        response = self.client.get(self.url)
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [question])

    def test_future_question(self):
        """미래 질문은 목록에 보이면 안 됨"""
        create_question("Future question", days=30)
        response = self.client.get(self.url)
        self.assertContains(response, "No polls are available.")
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [])

    def test_future_question_and_past_question(self):
        """과거 질문만 목록에 표시되어야 함"""
        past_question = create_question("Past question", days=-30)
        create_question("Future question", days=30)
        response = self.client.get(self.url)
        self.assertQuerySetEqual
        (response.context["latest_question_list"], 
        [past_question])

    def test_two_past_questions(self):
        """과거 질문이 여러 개일 경우 최신 순으로 정렬되어야 함"""
        q1 = create_question("Past question 1", days=-30)
        q2 = create_question("Past question 2", days=-5)
        response = self.client.get(self.url)
        self.assertQuerySetEqual
        (response.context["latest_question_list"], [q2, q1])

# Detail 뷰 테스트(변경없음)
class QuestionDetailViewTests(TestCase):
    def test_future_question(self):
        """미래 질문 상세 페이지는 404 반환"""
        future_question = create_question
        ("Future question", days=5)
        url = reverse("polls:detail", args=(future_question.id,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_past_question(self):
        """과거 질문 상세 페이지는 접근 가능"""
        past_question = create_question("Past question", days=-5)
        url = reverse("polls:detail", args=(past_question.id,))
        response = self.client.get(url)
        self.assertContains(response, past_question.question_text)
```

 `setUp()` 없이 중복된 코드
```python
def test_recent_question(self):
    time = timezone.now() - datetime.timedelta(hours=23, minutes=59)
    question = Question(pub_date=time)
    self.assertIs(question.was_published_recently(), True)
```

`setUp()`을 이용한 깔끔한 코드
```python
def test_recent_question(self):
    self.assertIs(self.recent_question.was_published_recently(), True)
```

✅ 테스트 실행 명령어
```bash
python manage.py test polls
```

---
🔹 `coverage.py` 
	내가 작성한 Python 코드 중에서 어떤 부분이 테스트 되었고, 어떤 부분이 테스트되지 않았는지를 알려주는 도구입니다.

◽ coverage 설치 (가상환경 안에서)
```python
pip install coverage
```
가상환경이 활성화된 상태인지 확인하세요. (`source venv/bin/activate` 등)

◽ 사용법
`테스트 실행 + 커버리지 측정`
```python
coverage run manage.py test
```
	Django 테스트를 실행하면서 커버리지도 함께 측정합니다.
---
`터미널에서 커버리지 요약 확인`
```python
coverage report
```
실행결과:
```python
Name                         Stmts   Miss  Cover
-----------------------------------------------
polls/models.py                20      2    90%
polls/views.py                 35      5    86%
```
---
`HTML 커버리지 리포트 생성`
```python
coverage html
```
	htmlcov/ 폴더가 생기고, 그 안에 HTML 리포트 파일들이 생성됩니다.

---
`생성된 HTML 리포트 열기`
```python
explorer.exe htmlcov/index.html
```
	Windows의 브라우저Chrome로 index.html 파일을 엽니다.

---
`요약 명령어 리스트`
```python
pip install coverage
coverage run manage.py test
coverage report
coverage html
explorer.exe htmlcov/index.html
explorer.exe $(wslpath -w htmlcov/index.html)
```

❓ 왜 좋은가요?
	어떤 함수/코드가 테스트 안 되고 있는지 시각적으로 확인할 수 있습니다.

◽테스트 결과
![[Pasted image 20250601152823.png]]
- 현재 테스트 커버리지가 꽤 우수한 편(87%)입니다.
- 핵심 로직인 `models.py`, `views.py`를 조금만 보강하면 90% 이상도 쉽게 달성 가능해요!
- 특히 `polls/views.py`의 `vote()` 함수는 아직 테스트되지 않았을 가능성이 높으므로 그 부분을 테스트 추가하는 게 가장 효과적입니다.

◽ 일반적인 커버리지 기준
90~100%	🟢 매우 우수	
	실무에서도 배포 가능한 수준, CI에서 통과 조건으로 설정하는 경우 많음
80~89%	🟡 양호	
	실무에서 기본 목표치로 자주 사용, 관리 가능한 범위
70~79%	🟠 보통	
	어느 정도 테스트가 되어 있지만, 중요 로직이 누락될 가능성 있음
70% 이하	🔴 미흡	
	테스트가 부족해 유지보수나 배포 리스크가 큼 (CI에서 실패 처리 가능)

---
🔹 `pytest` – Django보다 강력하고 직관적인 테스트 프레임워크

VSCode 터미널에 pytest 설치
```python
pip install pytest pytest-django
```

`pytest.ini` 폴더생성:
```
Django_first/
├── manage.py         ← 여기!
├── mysite/           ← settings.py 포함된 디렉토리
├── polls/            ← 앱 디렉토리
├── db.sqlite3
├── pytest.ini        ← 형제 경로 여기 작성!
```

`pytest.ini` 파일 작성
```bash
[pytest]
DJANGO_SETTINGS_MODULE = mysite.settings
python_files = tests.py test_*.py *_tests.py
```

`VSCode 터미널` 실행:
```python
~/Django_first$  #경로 확인
pytest polls/ # 실행명령어
```

왜 좋은가요?
- 테스트 메시지가 보기 좋고,
- 더 복잡한 테스트도 간단하게 작성할 수 있음

`결과메시지` 출력:
```bash
======================================= test session starts 
platform linux -- Python 3.12.3, pytest-8.3.5, pluggy-1.6.0
django: version: 5.2.1, settings: mysite.settings (from ini)
rootdir: /home/youjung/Django_first_for
configfile: pytest.ini
plugins: django-4.11.1
collected 3 items                                                                                 
polls/tests.py ...                                                                          [100%]

======================================== 3 passed in 0.12s 
```
- `pytest polls/` 명령어를 통해 `polls/tests.py` 파일 안에 있는 테스트 3개가 모두 성공적으로 실행되었습니다.
- 아래와 같은 결과는 초록색 점 3개(...)로 표시되며, 모두 정상 통과된 것을 의미합니다.

---
🔹 `LiveServerTestCase` – 실제 브라우저에서 테스트 (Selenium)
	Django 서버를 테스트용으로 직접 띄운 뒤, Selenium으로 실제 브라우저처럼 자동 조작해서 테스트합니다.

❓ 언제 사용하나요?
- 실제 사용자가 브라우저에서 어떻게 보는지 자동으로 검사할 수 있음
- 로그인 기능 없어도 단순한 화면 텍스트, 버튼 존재 여부 등을 테스트 가능

`selenium` 설치
```bash
pip install selenium
```

`WSL 버전 VSCode 터미널에서`
```bash
sudo apt install chromium-chromedriver
```

`tests_selenium.py` 파일 생성:
```
Django_first_for/
├── manage.py         
├── mysite/           
├── polls/            
│    ├── tests.py
│    ├── tests_selenium.py  ← 여기 작성
```

테스트 코드 작성 (`polls/tests_selenium.py`)
```python
from django.test import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

class PollsUITest(LiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Chrome 브라우저 열기 (자동화 모드)
        cls.browser = webdriver.Chrome()  
        # chromedriver 경로가 PATH에 있어야 함

    @classmethod
    def tearDownClass(cls):
        cls.browser.quit()
        super().tearDownClass()

    def test_homepage_has_title(self):
        """홈페이지에 '설문조사(polls)' 관련 텍스트가 있는지 
        확인"""
        self.browser.get(self.live_server_url + "/polls/")
        time.sleep(1)  
        # 페이지 로딩 대기 (학습 목적이므로 잠시 사용)

        body = self.browser.find_element(By.TAG_NAME, "body")
        self.assertIn("poll", body.text.lower())  
        # 대소문자 무시하고 확인
```

`실행하기`
```bash
python manage.py test polls.tests_selenium
```

결과확인:
```bash
(venv) youjung@DESKTOP-PJCRMMU:~/Django_first_for$ python manage.py test polls.tests_selenium
Found 1 test(s).
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
Traceback (most recent call last):
  File "/usr/lib/python3.12/wsgiref/handlers.py", line 137, in run
    self.result = application(self.environ, self.start_response)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/test/testcases.py", line 1696, in __call__
    return super().__call__(environ, start_response)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/core/handlers/wsgi.py", line 124, in __call__
    response = self.get_response(request)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/test/testcases.py", line 1679, in get_response
    return self.serve(request)
           ^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/test/testcases.py", line 1691, in serve
    return serve(request, final_rel_path, document_root=self.get_base_dir())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/views/static.py", line 45, in serve
    fullpath = Path(safe_join(document_root, path))
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/youjung/Django_first_for/venv/lib/python3.12/site-packages/django/utils/_os.py", line 17, in safe_join
    final_path = abspath(join(base, *paths))
                         ^^^^^^^^^^^^^^^^^^
  File "<frozen posixpath>", line 76, in join
TypeError: expected str, bytes or os.PathLike object, not NoneType
.
-------------------------------------------------------------
Ran 1 test in 11.564s

OK
Destroying test database for alias 'default'...
```

`mysite/settings.py` 하단에 static을 수정하라는 TypeError : 
```python
import os
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static")
]
```
	이 오류는 Django가 정적 파일(CSS, JS, 이미지 등)을 찾으려다가, 
	관련 설정이 없어서 발생한 것입니다.
	그러나 현재는 단순 테스트 용도이기 때문에 무시해도 됩니다.
	다만, Docker 등으로 실제 배포할 때는 반드시 신경 써야 하는 
	설정입니다. 정적 파일이 없으면 디자인이 깨지거나 기능 일부가 
	작동하지 않을 수 있습니다. 정적 파일 경로 설정 오류지만, 지금은 
	무시 가능하고, 배포할 땐 꼭 설정해야 합니다.

