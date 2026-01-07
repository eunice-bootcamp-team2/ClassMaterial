### 정의

✅ BeautifulSoup이란?
- 서버에서 받은 **HTML 문자열**을 그대로 쓰기에는 너무 복잡하기 때문에
- HTML을 **트리 구조(부모–자식 관계)** 로 바꿔서
- 우리가 원하는 태그(`<h1>`, `<a>`, `<span>` 등)를  
    쉽게 찾아서 텍스트나 링크를 꺼내게 해주는 도구
    
한 줄로 말하면:
> “HTML 문서를 파이썬에서 다루기 쉽게 바꿔주는 파서 도구”

---
HTML 파서(parser)란?
- HTML 문장을 구조(트리)로 해석해주는 엔진
- 태그가 어디에 속해 있는지(부모/자식)를 판단해 줌

초보자 단계에서는 아래만 써도 100% 충분합니다.
```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, "html.parser")
```

`lxml`, `html5lib`은 **HTML이 깨진 경우**에 더 강력하게 처리하는 심화 주제입니다.

---

🎯목표

- HTML 문서를 구조(계층)로 이해한다
- `select / select_one` 을 의도적으로 사용한다
- 여러 개의 요소 → 리스트로 수집 → 딕셔너리로 정리 할 수 있다

이게 되면, 어떤 사이트든 구조만 보면 접근 가능해집니다.

---
### requests는 이미 배웠으니 최소 설명만

```bash
resp = requests.get(url)
soup = BeautifulSoup(resp.text, "html.parser")
```
이 두 줄의 의미:
1. `requests.get(url)`  
    → 서버에서 HTML 문서를 받아온다
    
2. `resp.text`  
    → 문자열 형태의 HTML
    
3. `BeautifulSoup(...)`  
    → HTML 문자열을 구조화된 객체(soup)로 변환
    
✅ 보완 설명
- `resp.text`는 그냥 “글자(문자열)”라서 태그를 찾기 어렵습니다.
- `soup`는 그 문자열을 “태그 구조”로 바꿔 놓은 **탐색 가능한 객체**입니다.

---
### 예제 HTML (구조 연습)
✔️ 실제 웹사이트와 비슷하지만  
✔️ 구조가 단순하고  
✔️ 실패할 가능성이 없는 HTML
```html
<html>
  <body>
    <h1>📢 공지사항</h1>

    <div class="board">
      <div class="post">
        <a href="/post/1" class="title">파이썬 과제 제출</a>
        <span class="date">2025-07-10</span>
      </div>

      <div class="post">
        <a href="/post/2" class="title">내일 퀴즈 있음</a>
        <span class="date">2025-07-11</span>
      </div>

      <div class="post">
        <a href="/post/3" class="title">프로젝트 안내</a>
        <span class="date">2025-07-12</span>
      </div>
    </div>
  </body>
</html>
```

	이 구조는 게시판 / 공지 / 목록 페이지의 전형적인 형태입니다.

---
#### 핵심 개념 설명

🔹 반복 구조를 먼저 찾는다
```html
<divclass="post"> ...</div>
```
- 이게 “한 개의 글 단위”
- 크롤링은 이 단위로 반복문을 돈다
✅ 보완 설명
- 웹페이지에서 “목록”은 대부분 **같은 모양 블록이 반복**됩니다.
- 그래서 크롤링은 보통
    1. 글 하나의 “박스(post)”를 먼저 찾고
    2. 그 박스 안에서 제목/날짜를 뽑는 방식입니다.

🔹 기준 블록 안에서만 탐색한다
```python
post.select_one("a.title")
```
HTML을 사람처럼 읽으면:
- `board` 안에
- `post`가 3개
- 각 `post` 안에
    - 제목(`a.title`)
    - 날짜(`span.date`)가 하나씩 들어 있음

✅ 잘못된 접근부터 보자
```python
title_tag = soup.select_one("a.title")
```
이 코드는 이렇게 동작합니다:
> HTML 전체(soup)에서  
> a.title을 “하나만” 찾아라

❗ 무슨 일이 벌어질까?
- `a.title`은 3개가 있음
- 그런데 `select_one()`은 맨 처음 것 하나만 반환
    
결과는 항상:
```
파이썬 과제 제출
```
	반복문을 돌려도 값이 안 바뀌는 이유가 바로 이거예요

✅ 반복문 안에서 이런 코드를 쓰면 어떤 일이 생길까?
```python
for post in posts:
    title_tag = soup.select_one("a.title")
```

실행 흐름을 말로 풀면:
- post 1번째 → soup 전체에서 첫 번째 제목 찾기
- post 2번째 → 또 soup 전체에서 첫 번째 제목 찾기
- post 3번째 → 또 soup 전체에서 첫 번째 제목 찾기
    
매번 같은 제목이 나옵니다.
```
파이썬 과제 제출
파이썬 과제 제출
파이썬 과제 제출
```
이건 우리가 원하는 결과가 아니죠 ❌

올바른 접근: “기준 블록(post) 안에서만 찾기”
```python
title_tag = post.select_one("a.title")
```
여기서 핵심은 `post`입니다.

`post.select_one()`이 의미하는 것
> “현재 post 태그 안에서만  
> a.title을 하나 찾아라”

즉,
- soup 전체 ❌
- 현재 반복 중인 post 내부만 ⭕

반복문 전체 흐름을 그림처럼 설명하면
```python
for post in posts:
    title_tag = post.select_one("a.title")
```

1회차 반복
- post = 첫 번째 `<div class="post">`
- 그 안의 `a.title` → 파이썬 과제 제출
    
2회차 반복
- post = 두 번째 `<div class="post">`
- 그 안의 `a.title` → 내일 퀴즈 있음
    
3회차 반복
- post = 세 번째 `<div class="post">`
- 그 안의 `a.title` → 프로젝트 안내
    
우리가 기대한 결과!

---
✅ 날짜도 같은 원리
```python
date_tag = post.select_one("span.date")
```
이건:
> “현재 post 안에 있는 span.date 하나 찾아라”

그래서 제목과 날짜가 서로 섞이지 않고  
항상 같은 글의 정보로 묶입니다.

❌ soup에서 찾는 것
> 이 교실 전체에서 가장 앞자리에 앉은 학생 한 명만 찾아라

⭕ post에서 찾는 것
> 지금 보고 있는 책상(post)에서 그 책상 위에 놓인 필통(title)을 찾아라

즉 soup은 태그가 아니라 HTML 전체를 감싸고 있는 최상위 탐색 객체입니다

---
전체코드
```python
"""
beautifulsoup_day6_full.py

목표:
1) (오프라인) HTML 문자열을 BeautifulSoup으로 파싱해서
   - 게시글 목록(posts)을 찾고
   - 각 글(post) 안에서 title/date/link를 뽑아
   - dict 리스트(result)로 만든다

2) (온라인) example.com을 requests로 요청해서
   - h1 텍스트
   - a 태그의 href
   를 뽑아 출력한다

※ 6일차 기준: requests는 복습, BeautifulSoup의 select/select_one 사용에 집중
"""

import requests
from bs4 import BeautifulSoup


# ------------------------------------------------------------
# 1) 오프라인 파싱 예제: HTML 문자열을 직접 파싱하기 (실패 확률 0%)
# ------------------------------------------------------------
def parse_notice_html_offline():
    """
    아래 html 문자열은 '공지사항 목록 페이지'를 흉내낸 예제입니다.
    구조 포인트:
    - div.board 안에 div.post가 여러 개 반복
    - post 하나가 글 1개 단위
    - post 내부에 a.title(제목/링크), span.date(날짜)가 있음
    """
    html = """
    <html>
      <body>
        <h1>📢 공지사항</h1>

        <div class="board">
          <div class="post">
            <a href="/post/1" class="title">파이썬 과제 제출</a>
            <span class="date">2025-07-10</span>
          </div>

          <div class="post">
            <a href="/post/2" class="title">내일 퀴즈 있음</a>
            <span class="date">2025-07-11</span>
          </div>

          <div class="post">
            <a href="/post/3" class="title">프로젝트 안내</a>
            <span class="date">2025-07-12</span>
          </div>
        </div>
      </body>
    </html>
    """

    # 1) HTML 문자열을 BeautifulSoup으로 파싱(트리 구조로 변환)
    #    soup = "문서 전체를 대표하는 최상위 탐색 객체"
    soup = BeautifulSoup(html, "html.parser")

    # 2) 반복되는 글 단위 블록(post)을 전부 선택
    #    CSS 선택자: "div.board div.post"
    #    - div.board 아래에 있는 div.post들을 모두 찾아 리스트로 반환
    posts = soup.select("div.board div.post")

    # 결과를 담을 리스트(딕셔너리들이 들어감)
    result = []

    # 3) 각 post(글 1개 단위)를 돌면서 필요한 정보 추출
    for post in posts:
        # ⭐ 핵심: 전체 문서(soup)에서 찾지 않고,
        #        현재 post 블록 '안에서만' 찾는다.
        #
        # 이유:
        # - a.title은 문서에 3개가 있음
        # - soup.select_one("a.title") 하면 "맨 첫 번째 것"만 매번 가져오게 됨
        # - post.select_one(...) 하면 "현재 글 블록"에 속한 것만 가져옴
        title_tag = post.select_one("a.title")
        date_tag = post.select_one("span.date")

        # 4) 딕셔너리로 정리해서 result에 추가
        #    - .text : 태그 안의 글자만 추출
        #    - .strip() : 앞뒤 공백 제거
        #    - ["href"] : a 태그의 href 속성값(링크) 추출
        result.append({
            "title": title_tag.text.strip(),
            "link": title_tag["href"],
            "date": date_tag.text.strip(),
        })

    # result는 "딕셔너리 리스트" 형태로 반환
    return result


# ------------------------------------------------------------
# 2) 온라인 요청 예제: example.com 요청 후 h1과 링크 뽑기
# ------------------------------------------------------------
def fetch_example_dot_com():
    """
    requests로 웹 페이지를 요청한 뒤,
    BeautifulSoup으로 h1 텍스트와 a 태그의 href를 추출한다.
    """

    url = "https://example.com"

    # 1) GET 요청으로 HTML 받기
    response = requests.get(url, timeout=10)

    # 2) HTTP 상태코드 확인 (200이 아니면 예외 발생)
    response.raise_for_status()

    # 3) HTML 문자열(response.text)을 파싱해서 soup 객체 만들기
    soup = BeautifulSoup(response.text, "html.parser")

    # 4) 원하는 태그 선택 후 데이터 추출
    h1_text = soup.select_one("h1").text.strip()
    first_link = soup.select_one("a")["href"]

    # 5) 출력
    print("\n[example.com 파싱 결과]")
    print("제목(h1):", h1_text)
    print("첫 링크(href):", first_link)


# ------------------------------------------------------------
# 실행 진입점: 이 파일을 직접 실행할 때만 아래 코드가 동작
# ------------------------------------------------------------
if __name__ == "__main__":
    # (1) 오프라인 파싱 결과 확인
    notice_data = parse_notice_html_offline()

    print("[오프라인 공지 HTML 파싱 결과]")
    print("총 글 개수:", len(notice_data))
    print("첫 번째 글 샘플:", notice_data[0])
    print("\n전체 목록 출력:")
    for i, item in enumerate(notice_data, 1):
        print(f"{i}. {item['title']} ({item['date']}) - link: {item['link']}")

    # (2) 온라인 요청 파싱 결과 확인
    fetch_example_dot_com()
```

실행방법
```bash
python beautifulsoup_day6_full.py
```

출력 결과
```python
[
  {'title':'파이썬 과제 제출','link':'/post/1','date':'2025-07-10'},
  {'title':'내일 퀴즈 있음','link':'/post/2','date':'2025-07-11'},
  {'title':'프로젝트 안내','link':'/post/3','date':'2025-07-12'}
]
```

---
### 예제 문제

공통 준비에서 제공되는 것은 “HTML 데이터(재료)”뿐이고,  
`BeautifulSoup 파싱·선택·반복·출력 코드는 문제를 보고 직접 작성`하는 것입니다.
```python
HTML = """
<html>
  <body>
    <h1>📢 공지사항</h1>

    <div class="board">
      <div class="post">
        <a href="/post/1" class="title">파이썬 과제 제출</a>
        <span class="date">2025-07-10</span>
      </div>

      <div class="post">
        <a href="/post/2" class="title">내일 퀴즈 있음</a>
        <span class="date">2025-07-11</span>
      </div>

      <div class="post">
        <a href="/post/3" class="title">프로젝트 안내</a>
        <span class="date">2025-07-12</span>
      </div>
    </div>
  </body>
</html>
"""
```

파싱 시작
```python
soup = BeautifulSoup(HTML, "html.parser")
posts = soup.select("div.board div.post")
```


📝 문제 1 — 제목만 리스트로 수집

- 모든 공지의 제목만 리스트로 출력
```python
['파이썬 과제 제출','내일 퀴즈 있음','프로젝트 안내']
```

📝 문제 2 — 날짜가 `2025-07-11` 이후인 글만 출력
- 조건 필터링 연습

출력 예:
```
프로젝트 안내 (2025-07-12)
```

---

📝 문제 3 — 결과를 딕셔너리 리스트로 만들기
```python
[
  {'title':'...','date':'...','link':'...'},
  ...
]
```

--- 
🔹 공통 준비 (모든 문제에서 동일)
```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, "html.parser")

# 글 1개 단위(post) 전부 선택
posts = soup.select("div.board div.post")
```

문제 1 정답
```python
titles = []

for post in posts:
    title_tag = post.select_one("a.title")
    titles.append(title_tag.text.strip())

print(titles)
```

✅ 출력
```python
['파이썬 과제 제출', '내일 퀴즈 있음', '프로젝트 안내']
```

---
문제 2 정답
```python
for post in posts:
    title = post.select_one("a.title").text.strip()
    date = post.select_one("span.date").text.strip()

    if date > "2025-07-11":
        print(f"{title} ({date})")
```

✅ 출력
```python
프로젝트 안내 (2025-07-12)
```
---
문제 3 정답
```python
result = []

for post in posts:
    title_tag = post.select_one("a.title")
    date_tag = post.select_one("span.date")

    result.append({
        "title": title_tag.text.strip(),
        "date": date_tag.text.strip(),
        "link": title_tag["href"]
    })

print(result)
```

✅ 출력
```python
[
  {'title': '파이썬 과제 제출', 'date': '2025-07-10', 'link': '/post/1'},
  {'title': '내일 퀴즈 있음', 'date': '2025-07-11', 'link': '/post/2'},
  {'title': '프로젝트 안내', 'date': '2025-07-12', 'link': '/post/3'}
]
```
---
### 실습 예제1

🎯 목표(해야 할 일)
1️⃣ `https://example.com`에 GET 요청을 보낸다.
2️⃣ 응답 HTML을 BeautifulSoup으로 파싱한다.
3️⃣ 아래 정보를 추출해서 출력한다.
    
✅ 추출해야 할 것
- **(1) 페이지의 제목(h1) 텍스트**
- **(2) 페이지 안에 있는 첫 번째 링크(a)의 href 값**
    
---
✅ 힌트(태그 구조 관찰)
example.com에는 보통 이런 구조가 있습니다.
- `<h1>` : 페이지 제목
- `<a href="...">` : 링크

✅ 정답 코드 (mission_example_com.py)
```python
import requests
from bs4import BeautifulSoup

deffetch_example():
    url ="https://example.com"

# 1) 웹 요청 보내기 (GET)
    response = requests.get(url)

# 2) 요청이 실패하면(404/500 등) 여기서 에러로 멈춤
    response.raise_for_status()

# 3) HTML 텍스트를 BeautifulSoup으로 파싱(구조로 변환)
    soup = BeautifulSoup(response.text,"html.parser")

# 4) 원하는 태그 선택해서 정보 추출
    title = soup.select_one("h1").text.strip()# <h1> 텍스트
    link = soup.select_one("a")["href"]# <a href="...">

print("제목(h1):", title)
print("첫 링크:", link)

if __name__ =="__main__":
    fetch_example()
```


✅ 예상 출력 결과
실행:
```bash
python mission_example_com.py
```

출력 예:
```
제목(h1): Example Domain
첫 링크(href): https://www.iana.org/domains/example
```
출력이 똑같지 않을 가능성은 거의 없지만,  
사이트가 업데이트되면 링크가 바뀔 수는 있습니다.  
(그래도 h1과 a 태그는 유지되는 편)

이해포인트
- `response.text` : 서버가 준 HTML 문자열(그냥 “글자 덩어리”)
- `BeautifulSoup(response.text, "html.parser")` : 글자를 “구조화”해서 태그를 찾을 수 있게 만듦
- `select_one("h1")` : h1 태그를 하나 찾음
- `.text` : 태그 안의 글자만 뽑음
- `["href"]` : 태그 속성값(href)을 뽑음

---

### 예제 2: HTML 문자열을 직접 파싱

## 🎯 목표 (해야 할 일)

아래 HTML 문자열이 이미 변수 `html`에 들어 있다고 가정할 때,

1️⃣ `<h1>` 태그의 텍스트를 추출한다  
2️⃣ `<li class="item">` 요소들을 모두 수집해서 리스트로 만든다  
3️⃣ `<a>` 태그의 `href` 속성값을 추출한다  
4️⃣ 추출한 결과를 출력한다

📄 제공되는 HTML (문제에서 주어지는 재료)
```html
<html>
  <body>
    <h1>오늘의 공지</h1>
    <ul>
      <li class="item">파이썬 과제 제출</li>
      <li class="item">내일 퀴즈 있음</li>
    </ul>
    <a href="https://example.com/guide">가이드 보기</a>
  </body>
</html>
```
이 HTML 구조를 말로 풀면:

- 페이지 제목은 `<h1>`
- 공지 목록은 `<li class="item">`로 반복
- 하단에 안내 링크 `<a>` 하나 존재

✅ 정답 코드 (mission_parse_html_string.py)
```python
from bs4 import BeautifulSoup

# 1) HTML 문자열 (이미 서버에서 받아왔다고 가정)
html = """
<html>
  <body>
    <h1>오늘의 공지</h1>
    <ul>
      <li class="item">파이썬 과제 제출</li>
      <li class="item">내일 퀴즈 있음</li>
    </ul>
    <a href="https://example.com/guide">가이드 보기</a>
  </body>
</html>
"""

# 2) HTML 문자열을 BeautifulSoup으로 파싱
#    → HTML을 트리 구조로 변환
soup = BeautifulSoup(html, "html.parser")

# 3) h1 태그 하나 선택 후 텍스트 추출
h1 = soup.select_one("h1").text.strip()

# 4) li.item 태그 여러 개 선택 → 리스트로 수집
items = [li.text.strip() for li in soup.select("li.item")]

# 5) a 태그 하나 선택 → href 속성값 추출
link = soup.select_one("a")["href"]

# 6) 결과 출력
print("제목:", h1)
print("항목들:", items)
print("링크:", link)
```

✅ 예상 출력 결과
```
제목: 오늘의 공지
항목들: ['파이썬 과제 제출', '내일 퀴즈 있음']
링크: https://example.com/guide
```

✅ 이해 포인트

✔ BeautifulSoup의 역할
- HTML 문자열 → 구조화된 트리 객체
- 태그를 기준으로 쉽게 탐색 가능
    

✔ `select_one` vs `select`
```python
soup.select_one("h1")   # 하나만 필요할 때 
soup.select("li.item")  # 여러 개 필요할 때
```
- `select_one()` → 결과 1개 (태그 하나)
- `select()` → 결과 여러 개 (리스트)
    

✔ `.text` 와 `["href"]` 차이
```python
tag.text        # 태그 안의 글자 
tag["href"]     # 태그의 속성값
```
- `<h1>오늘의 공지</h1>` → `"오늘의 공지"`
- `<a href="...">` → `"..."`