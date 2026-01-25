목표: polls 목록(/polls/)에 쿼리 스트링 필터/검색/정렬 추가

1️⃣ 쿼리스트링이란?

정의:
> 쿼리스트링(Query String)은  
> HTTP 요청에서 리소스의 식별자(Path)는 유지한 채,  
> 해당 리소스에 적용할 조회 조건·정렬·필터·표현 상태를  
> URL을 통해 서버로 전달하는 메커니즘이다.

쉽게 말해서:
> 쿼리스트링(Query String)은  
> 같은 페이지를, 조건만 바꿔서 보여달라고 서버에 요청하는 방법입니다.

---
이전 시간에 아래와 같은 내용을 언급한적이 있었습니다.
URL과 QueryString

1️⃣ URL의 구성요소
![[Pasted image 20250713094635.png]]![[Pasted image 20250713094747.png]]
![[Pasted image 20250713094811.png|150]]

| 번호  | 용어 (영문)                  | 설명                                     | 예시                                                 |
| --- | ------------------------ | -------------------------------------- | -------------------------------------------------- |
| 01  | Scheme (스킴)              | 웹 주소의 시작 부분으로 이게 어떤 방식으로 연결할지 정해줘요.    | `http://`, `https://` ← 보안 연결 여부                   |
| 02  | Domain Name (도메인 이름)     | 웹사이트의 이름이에요. 인터넷에서 컴퓨터(서버)를 찾는 주소예요.   | `www.example.com`, `naver.com`                     |
| 03  | Port (포트)                | 컴퓨터 내부 통신창 번호예요. 어떤 서비스로 연결할지 정해요.     | `80` (HTTP), `443` (HTTPS), `8000` (FastAPI 기본 포트) |
| 04  | Path to the file (파일 경로) | 서버 안에서 어떤 파일이나 페이지를 보여줄지 정해요.          | `/index.html`, `/img/logo.png`                     |
| 05  | Parameters <br>(쿼리 파라미터) | 주소 뒤에 붙는 추가 정보예요. 서버에 뭔가 요청할 때 같이 보내요. | `?key=value`, `?search=banana&page=2`              |
| 06  | Anchor <br>(앵커, 해시)      | 웹페이지 안의 특정 위치로 바로 이동할 때 써요.            | `#section1`, `#bottom`, `#title`                   |
그중 05번에 해당하는 Query Parameters
쿼리 파라미터란? 웹 주소(URL)에 추가 정보를 넣는 방식으로 주소 끝에 `?키=값` 형식으로 붙습니다. 
```
?key1=value1&key2=value2
```

2️⃣ QueryString (쿼리 파라미터)란?
> QueryString은 URL 뒤에 붙는 추가 정보입니다.  
> 서버에게 “검색 조건”이나 “옵션”을 전달할 때 사용합니다.

URL 뒤에 `?`로 붙는 **추가 정보**
```
?키=값&키2=값2

?key=value&key2=value2
```

예제:
```
https://google.com/search?q=python&page=2
```

|요소|의미|
|---|---|
|q=python|검색어|
|page=2|페이지 번호|
👉 즉, QueryString은 서버에게 “이 조건으로 처리해줘”라고 말하는 방식입니다.

쿼리 스트링은 왜 필요한가?
❓ 이런 요구가 있을 때
- 같은 목록인데
    - 검색하고 싶다
    - 정렬을 바꾸고 싶다
    - 기간을 바꾸고 싶다
- 페이지를 새로 만들어야 할까?
	- ❌ 아닙니다.
	- URL는 그대로 두고, 조건만 전달하면 됩니다.

❌ 쿼리스트링이 없다면 생기는 문제
```
/polls/search/운동/
/polls/search/공부/
/polls/oldest/
/polls/future/
/polls/2026/01/
```
- URL 폭발
- urls.py 지옥
- 관리 불가
즉, 라우터(URL 패턴)와 뷰 분기 로직이 늘어나는 문제가 생긴다

✅ 쿼리스트링을 쓰면:
```
/polls/?q=운동
/polls/?order=oldest
/polls/?show=future
/polls/?start=2026-01-01
```
✔ URL 1개  
✔ 조건만 바뀜  
✔ 관리 쉬움
즉,  ListView의 `get_queryset()` 안에서 request.GET 값을 읽어 조건문으로 처리합니다.

---
### 좀더 상세히 설명하면

🔹 쿼리스트링 예시:
```sql
/polls/?q=django&order=oldest&start=2026-01-01
```

➡️ Django 안에서는 이렇게 보입니다:
```python
request.GET == {
    "q": "django",
    "order": "oldest",
    "start": "2026-01-01"
}
```
✔ **모든 값은 문자열(str)**  
✔ 없으면 `None`

---
🔹 쿼리 스트링의 처리 흐름

① 사용자가 주소 요청 (브라우저)
```
/polls/?q=django&order=oldest
```
✔ 이때 **쿼리스트링은 이미 만들어져 있음**  
✔ 브라우저가 서버로 전달

② urls.py (라우터)
```python
path("", IndexView.as_view(), name="index")
```
주소(`/polls/`)에 맞는 뷰 클래스 선택 그러나 ⚠️ 쿼리스트링은 라우팅 대상이 아님

③ views.py (핵심 포인트)
```python
class IndexView(ListView):
    def get_queryset(self):
        qs = Question.objects.all()

        q = self.request.GET.get("q")
        if q:
            qs = qs.filter(question_text__icontains=q)

        return qs
```
여기서 일어나는 일:

1️⃣ 쿼리스트링을 읽는다 (`request.GET`)  
2️⃣ 조건문으로 해석한다 (`if q:`)  
3️⃣ DB에서 필요한 데이터만 필터링한다

④ View → Template 데이터 전달
```python
context = {
    "latest_question_list": qs
}
```
➡️ **필터된 결과만** 템플릿으로 전달

⑤ Template (HTML)
```html
{% for question in latest_question_list %}
  <li>{{ question.question_text }}</li>
{% endfor %}
```
➡️ 조건을 통과한 데이터만 출력

🔁 전체 흐름을 한 줄로 요약하면
```
주소로 요청 →  
라우터가 뷰 선택 →  
뷰가 쿼리스트링을 읽어서 조건 처리 →  
필터된 데이터를 템플릿에 전달 →  
화면 출력
```

시각화로 그리면 (개념도)
```
브라우저
  │
  │  /polls/?q=django
  ▼
urls.py
  │   (/polls/)
  ▼
views.py
  │   request.GET["q"]
  │   if 조건 → queryset 필터
  ▼
QuerySet
  │
  ▼
template
  │   for question in list
  ▼
화면 출력
```

🔹 쿼리스트링은 어디에 활용되나?
	사용자의 선택·조건·맥락을 URL로 남겨서 데이터 필터링, 분석, 공유, 추적에 쓰입니다.

📌 실무에서의 활용 분야별 정리

① 검색 / 필터 / 정렬 (가장 대표적)
예시:
```bash
/products/?q=노트북&brand=apple&price_min=1000000&sort=price_desc
```

활용 서비스
- 쇼핑몰 (쿠팡, 무신사, 네이버 쇼핑)
- 커뮤니티 (게시글 검색)
- 관리자 페이지 (날짜/상태 필터)등 DB 조회 조건을 URL로 표현

② 마케팅 (유입 추적, 성과 분석)
대표적인 쿼리스트링
```
?utm_source=instagram
&utm_medium=cpc
&utm_campaign=summer_sale
```

마케팅에서 하는 일
- 어디서 들어왔는지
- 어떤 광고를 눌렀는지
- 전환이 일어났는지 등의 광고 성과 측정의 핵심 도구

그래서:
- GA (Google Analytics) : 분석도구
- Meta Ads : 광고 플랫폼
- 네이버 광고 : 광고 플랫폼
    전부 **쿼리스트링 기반 추적**

③ 페이지 상태 유지 (UX)
```bash
/articles/?page=3&order=popular
```

의미
- 새로고침해도 상태 유지
- 링크 공유 시 동일한 화면등 지금 보고 있는 상태 자체를 URL로 저장
- 즐겨찾기 버튼의 원리와 유사합니다.
- 즉, 쿼리스트링은 현재 보고 있는 화면 상태를 URL에 저장하는 방식이고,  
- 즐겨찾기(북마크)는 그 URL을 나중에 다시 열기 위해 저장하는 기능입니다.

④ 관리자 페이지 / 백오피스
```
/admin/orders/?status=paid&date=2026-01-01
```
- 주문 상태 필터
- 날짜 기준 조회
- 운영자가 매일 쓰는 기능등 Django Admin도 내부적으로 쿼리스트링 사용함

⑤ API (특히 REST API)
```
GET /api/orders/?user=3&status=completed
```
- 모바일 앱
- 프론트엔드 (React, Vue)
- 외부 서비스 연동등 조회 조건 전달 방식의 표준

---
🔹 검색창에서 검색하는 것과 쿼리스트링의 연관성
	검색창은 사용자가 검색어를 입력하는 화면(UI) 입니다.
	쿼리스트링은 그 입력값을 서버로 전달하는 방식 입니다.
즉 한문장으로 정리하면 검색창에서 검색한다는 것은:
- 검색창에 입력한 값을 쿼리스트링으로 보내서  
- 서버에서 데이터를 필터링하는 것이다.
---
🔹 검색에서 POST와 GET 차이는?
❌ POST 검색 (비추천)
- URL에 안 남음
- 공유 불가
- 뒤로가기 불편
    
⭕ GET 검색 (표준)
- URL에 남음
- 북마크 가능
- SEO 가능 : (Search Engine Optimization) 구글·네이버 같은 검색엔진이 내 페이지를 잘 찾고, 잘 보여주게 만드는 것
    
그래서:
- 검색/필터는 무조건 GET + 쿼리스트링
---
🔹 마케팅 + 개발 관점 연결
	쿼리스트링은 마케팅과 개발이 함께 사용하는 공통 언어입니다.

마케터 관점
> 이 사용자가 어디에서 들어왔는지를 URL에 표시합니다.
```
?utm_source=google
```

개발자 관점
> 그 값을 서버에서 받아서  
> 아, 이 사용자는 구글에서 들어왔구나 하고 판단합니다.
```
source = request.GET.get("utm_source")
```

➡️ 같은 쿼리스트링을 서로 다른 직군이 각자 다르게 활용

쉽게 말하면
- 마케터는 URL에 정보 적어 보내고
- 개발자는 그 정보를 읽어서 처리한다
---
### 실전 전 연습문제 풀이하기 🔗 [[쿼리스트링 연습문제]] 바로가기

---
`1) polls/views.py 수정 (IndexView에 request.GET 처리)`
```python
# 쿼리스트링용: 날짜 파싱
import datetime

def _parse_yyyy_mm_dd(value: str):
    """
    'YYYY-MM-DD' 형식 문자열을 date로 파싱.
    실패하면 None 반환.
    """
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


# 쿼리스트링 처리: IndexView(get_queryset)
class IndexView(generic.ListView):
    template_name = "polls/index.html"
    context_object_name = "latest_question_list"

    def get_queryset(self):
        qs = Question.objects.all()

        # 1) show=future → 미래 질문 포함 여부 (기본: 미래 숨김)
        show = self.request.GET.get("show")
        if show != "future":
            qs = qs.filter(pub_date__lte=timezone.now())

        # 2) q=키워드 → question_text 검색
        q = (self.request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(question_text__icontains=q)

        # 3) start/end=YYYY-MM-DD → 기간 필터
        start = _parse_yyyy_mm_dd(self.request.GET.get("start"))
        end = _parse_yyyy_mm_dd(self.request.GET.get("end"))

        if start:
            qs = qs.filter(pub_date__date__gte=start)
        if end:
            qs = qs.filter(pub_date__date__lte=end)

        # 4) order=oldest → 정렬 (기본: 최신순)
        order = self.request.GET.get("order")
        if order == "oldest":
            qs = qs.order_by("pub_date")
        else:
            qs = qs.order_by("-pub_date")

        # 5) (옵션) 목록 5개 제한 유지
        return qs[:5]
```

`2) templates/polls/index.html`
```html
{# 화면 제목을 content 블록 안에서 실제로 출력 #}
<h1>최근 질문</h1>

{# 쿼리스트링 GET 폼 #}
<form method="get" class="filter-form">
  <input type="text" name="q" placeholder="질문 검색" value="{{ request.GET.q }}">

  <select name="order">
    <option value="">최신순</option>
    <option value="oldest" {% if request.GET.order == "oldest" %}selected{% endif %}>
      오래된순
    </option>
  </select>

  <label>
    <input type="checkbox" name="show" value="future"
           {% if request.GET.show == "future" %}checked{% endif %}>
    미래 질문 포함
  </label>

  <input type="text" name="start" placeholder="start: 2026-01-01" value="{{ request.GET.start }}">
  <input type="text" name="end" placeholder="end: 2026-01-31" value="{{ request.GET.end }}">

  <button type="submit">적용</button>
  <a href="{% url 'polls:index' %}">초기화</a>
</form>

<hr>
```

쿼리스트링을 html에 적용
![[Pasted image 20260124212840.png]]