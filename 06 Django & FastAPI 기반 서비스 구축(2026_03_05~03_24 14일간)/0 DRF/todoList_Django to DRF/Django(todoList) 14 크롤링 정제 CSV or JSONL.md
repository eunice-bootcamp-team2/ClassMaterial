터미널에서 jupyter notebook 설치 및 실행하기
```bash
uv pip install notebook

cd
```

환경 준비 (Jupyter에서 크롤링/수집용 패키지 설치)
```bash
source .venv/bin/activate  
uv pip install requests beautifulsoup4 lxml pandas tqdm
```
- `requests` : 웹페이지 가져오기
- `bs4 + lxml` : HTML 파싱(태그 뽑기)
- `pandas` : 표로 만들고 CSV 저장
- `tqdm` : 진행바
---
수집 전략 선택

선택 A) HTML 크롤링(BeautifulSoup) — 허용된 사이트/데이터셋
- robots/약관 허용 + 로그인 불필요 + 공개 페이지
- 가장 전형적인 웹크롤링 실습
    
선택 B) API 수집(requests)
- 이건 엄밀히 말하면 크롤링이라기보다 공식 수집
- 하지만 목적(수집→저장→DB적재)을 가장 안정적으로 달성함
---
공개 리뷰 데이터셋
- 네이버 영화 리뷰(NSMC)
- AI Hub 리뷰/감성 데이터(있으면 최고)
- Kaggle 리뷰 데이터(한/영 다양)

네이버 검색창에 영화 리뷰라고 검색한 주소
https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer
여기에서 크로링을 합니다.

---
### 요청 1번 = 디버깅 테스트 단계

jupyter notebook 에서 
`요청 1번) 크롤링이 잘되는지 간단 테스트`
 ```python
import requests
from bs4 import BeautifulSoup
 ```

`크로링할 주소`
```python
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"
```

`User-Agent`
```python
headers = {  
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",  
	"Accept-Language": "ko-KR,ko;q=0.9",  
	"Referer": "https://www.naver.com/"  
}
```

`크롬브라우저를 열고 chrome://version/ 들어가면 정보가 나옵니다.`
![[Pasted image 20260228150637.png]]

`웹페이지를 요청하고, 정상적으로 받아왔는지 확인하는 디버깅 코드`
```python
r = requests.get(URL, headers=headers, timeout=10) # 10초
print("status:", r.status_code, "| html length:", len(r.text))
```
- URL 요청함
- 성공했는지 확인함
- HTML이 제대로 왔는지 길이로 확인함

`받아온 HTML을 분석해서 링크(a태그)가 몇 개인지 세는 코드`
```python
soup = BeautifulSoup(r.text, "lxml")
print("a tags:", len(soup.select("a[href]")))
```
- 블러그의 URL을 확인하기 위한 과정으로 링크가 423개 있습니다.

`네이버 블로그 / 인플루언서 링크만 골라서 10개만 샘플로 확인하는 필터링 과정`
```python
# 블로그/인플루언서 도메인 링크만 샘플로 10개 보기
sample = []
for a in soup.select("a[href]"):
    h = a.get("href")
    if h and ("blog.naver.com" in h or "in.naver.com" in h):
        sample.append(h)
    if len(sample) == 10:
        break

print("sample links(10):")
for s in sample:
    print("-", s)
```
- 수많은 `<a>` 태그 중에서  
	- 블로그 도메인 링크만 추려서  
	- 10개만 출력해보자

`블로그/인플루언서 도메인 링크만 샘플로 10개 보기`
```python
sample = []
for a in soup.select("a[href]"):
    h = a.get("href")
    if h and ("blog.naver.com" in h or "in.naver.com" in h):
        sample.append(h)
    if len(sample) == 10:
        break
```

`링크 10개만 추출하기`
```python
for s in sample:
    print("-", s)
```

🔎 이 단계 목적
- 요청이 차단되지 않는지 확인
- HTML이 실제로 오는지 확인
- 내가 원하는 링크가 HTML 안에 존재하는지 확인

---
### 먼저 테이블 만들기 (추천)
```sql
CREATE TABLE public.stg_movie_reviews (  
id BIGSERIAL PRIMARY KEY,  
title VARCHAR(255),  
review TEXT  
);
```
이렇게 하면
- DB: 현재 SQL 에디터에 연결된 DB
- 스키마: `public`
- 테이블명: `stg_movie_reviews2` 로 생성됩니다.

만들고 나서 확인
```sql
SELECT column_name, data_type  
FROM information_schema.columns  
WHERE table_schema='public'  
	AND table_name='stg_movie_reviews3' -- 새로 만들고 싶은 테이블 이름  
ORDER BY ordinal_position;
```
---
### 요청 2번 = 실전 수집 단계

검색페이지에서 글 링크만 모으기
목표: 필요 없는 링크(로그인, 검색탭, #lnb 등) 제거하고 실제 글로 갈 가능성이 높은 링크만뽑기

전체 구조
```sql
크롤링 (BeautifulSoup)
      ↓
HTML에서 제목 / 리뷰 추출
      ↓
rows.append()
Python 리스트에 데이터 저장
      ↓
pandas DataFrame
데이터를 표 형태로 정리
      ↓
df.to_sql()
PostgreSQL DB에 저장
      ↓
PostgreSQL
stg_movie_reviews 테이블
      ↓
Django ORM
CollectedReview 모델로 DB 연결
      ↓
View / API / Template
웹 화면 또는 API로 데이터 출력
```


```python
# ======================================================
# 필요한 라이브러리 import
# ======================================================

# 웹페이지에 HTTP 요청을 보내서 HTML을 가져오기 위한 라이브러리
import requests 

# HTML 문서를 분석(파싱)해서 원하는 태그 데이터를 추출하기 위한 라이브러리     
from bs4 import BeautifulSoup 

# 상대 경로 URL을 절대 경로 URL로 변환할 때 사용하는 유틸리티 
from urllib.parse import urljoin  


# ======================================================
# 크롤링할 대상 URL
# ======================================================

# 네이버에서 "영화리뷰" 검색 결과 페이지
# influencer 탭에서 블로그/인플루언서 리뷰를 수집하기 위한 페이지
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"


# ======================================================
# User-Agent 설정
# ======================================================

# 일부 사이트는 Python requests 요청을 차단하기 때문에
# 브라우저에서 접속한 것처럼 보이도록 User-Agent 헤더를 추가
headers = {"User-Agent": "Mozilla/5.0"}


# ======================================================
# 웹페이지 요청
# ======================================================

# requests.get()을 사용해 지정한 URL의 HTML 페이지를 가져온다
# timeout=10 → 서버 응답이 10초 이상 지연되면 요청을 중단
html = requests.get(URL, headers=headers, timeout=10).text


# ======================================================
# HTML 파싱
# ======================================================

# 가져온 HTML 문자열을 BeautifulSoup으로 분석
# "lxml" 파서를 사용하여 HTML 구조를 빠르게 파싱
# 이후 soup 객체를 통해 태그 검색 및 데이터 추출 가능
soup = BeautifulSoup(html, "lxml")
```

코드 실행 흐름
```
URL 지정
   ↓
requests로 웹페이지 요청
   ↓
HTML 문자열 수신
   ↓
BeautifulSoup으로 HTML 구조 분석
   ↓
soup 객체 생성
   ↓
태그 검색 가능
```

---
여기부터가 수집 로직
```python
# ======================================================
# 블로그 / 인플루언서 리뷰 링크 수집
# ======================================================

links = []  # 최종적으로 저장할 리뷰 페이지 링크 리스트

# HTML에서 href 속성이 있는 모든 <a> 태그를 탐색
for a in soup.select("a[href]"):

    # <a> 태그의 href 값 가져오기
    h = a.get("href")

    # href 값이 없는 경우 건너뜀
    if not h:
        continue

    # 상대 경로 URL을 절대 경로 URL로 변환
    # 예: /blog/123 → https://search.naver.com/blog/123
    h = urljoin(URL, h)

    # ======================================================
    # 리뷰 글 후보 링크 필터링
    # ------------------------------------------------------
    # 네이버 검색 페이지에는 광고, 검색 내부 링크 등
    # 다양한 링크가 섞여 있으므로
    # 실제 리뷰 글이 있을 가능성이 높은 도메인만 선택
    # ======================================================

    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):

        # ==================================================
        # 불필요한 링크 제거
        # ==================================================

        # 네이버 로그인 페이지 링크 제거
        if "nid.naver.com" in h:
            continue

        # 네이버 블로그 섹션 페이지(검색/허브 페이지) 제거
        if "section.blog.naver.com" in h:
            continue

        # 인플루언서 추천 페이지 제거
        if "in.naver.com/discover" in h:
            continue

        # 위 조건을 모두 통과한 링크만 저장
        links.append(h)


# ======================================================
# 중복 링크 제거
# ------------------------------------------------------
# dict.fromkeys()를 사용하면
# 기존 순서를 유지하면서 중복을 제거할 수 있음
# ======================================================
links = list(dict.fromkeys(links))


# ======================================================
# 결과 확인
# ======================================================

# 수집된 전체 링크 개수 출력
print("collected links:", len(links))

# 앞에서부터 5개의 링크만 샘플로 출력
print("first 5:", links[:5])
```
- `a[href]` : 링크 태그만 모음
- `blog/in/post`만 남김
- 로그인/허브 링크는 버림
- 중복 제거 후 `links` 리스트 완성

---
제목/본문만 수집 
```python
# ======================================================
# 필요한 라이브러리 import
# ======================================================

import requests
# requests
# → 웹 서버에 HTTP 요청(GET, POST 등)을 보내고
#   웹페이지의 HTML 데이터를 가져오기 위한 라이브러리
# → 크롤링에서 "웹페이지 다운로드" 역할을 한다.

from bs4 import BeautifulSoup
# BeautifulSoup
# → 가져온 HTML 문서를 분석(파싱)해서
#   원하는 태그나 데이터를 쉽게 추출할 수 있게 해주는 라이브러리
# → 예: <a>, <div>, <p> 같은 태그를 찾을 때 사용
```


```python
# ======================================================
# 블로그/게시글 페이지에서 제목과 본문 텍스트를 추출하는 함수
# ======================================================
def extract_title_text(article_url):

    # --------------------------------------------------
    # 1) 웹페이지 요청
    # --------------------------------------------------
    # requests.get()을 이용해 게시글 URL의 HTML을 가져온다.
    # headers에 User-Agent를 넣어 브라우저 요청처럼 보이게 함
    # timeout=10 → 서버 응답이 10초 이상 지연되면 요청 중단
    html = requests.get(
        article_url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10
    ).text

    # --------------------------------------------------
    # 2) HTML 파싱
    # --------------------------------------------------
    # BeautifulSoup을 사용하여 HTML 구조를 분석
    # "lxml" 파서를 사용해 빠르게 HTML을 처리
    soup = BeautifulSoup(html, "lxml")


    # --------------------------------------------------
    # 3) 제목 추출
    # --------------------------------------------------
    # 기본값은 빈 문자열
    title = ""

    # meta 태그 중 og:title 값을 찾는다.
    # 많은 블로그/사이트에서 페이지 제목을 og:title에 넣는다.
    og = soup.select_one("meta[property='og:title']")

    # og:title이 존재하고 content 속성이 있으면 제목으로 사용
    if og and og.get("content"):
        title = og["content"].strip()  # 앞뒤 공백 제거


    # --------------------------------------------------
    # 4) 본문 텍스트 추출
    # --------------------------------------------------
    # 기본값은 빈 문자열
    text = ""

    # 사이트마다 본문이 들어있는 HTML 구조가 다르기 때문에
    # 여러 후보 selector를 순서대로 시도한다.
    for sel in [
        "article",                 # 일반적인 article 태그
        "div.se-main-container",   # 네이버 블로그 최신 에디터
        "div#content",             # 일부 블로그 구조
        "div.post_ct"              # 네이버 포스트 구조
    ]:
        node = soup.select_one(sel)

        # 해당 selector로 본문이 발견되면
        if node:

            # get_text()로 모든 텍스트를 추출
            # " " → 태그 사이에 공백 추가
            # strip=True → 앞뒤 공백 제거
            text = node.get_text(" ", strip=True)

            # 너무 짧은 텍스트는 본문이 아닐 가능성이 높으므로
            # 200자 이상이면 정상 본문으로 판단하고 반복 종료
            if len(text) > 200:
                break


    # --------------------------------------------------
    # 5) 결과 반환
    # --------------------------------------------------
    # 추출된 제목과 본문 텍스트를 반환
    return title, text
```
- 수집 로직을 함수로 분리
- 재사용 가능
- 에러 처리 가능

샘플 5개 테스트 (URL 출력 제거)
```python
# ======================================================
# 수집된 링크 중 일부만 테스트 실행
# ======================================================

# links 리스트에서 앞쪽 5개의 링크만 가져옴
# 전체 링크를 한 번에 크롤링하면 시간이 오래 걸리거나
# 서버에 부담을 줄 수 있으므로 먼저 샘플 테스트 진행
sample_links = links[:5]


# ======================================================
# 각 링크에 대해 제목과 본문을 추출
# ======================================================

for u in sample_links:

    # extract_title_text() 함수 호출
    # 해당 URL의 페이지에 접속하여
    # (제목, 본문텍스트)를 추출
    title, text = extract_title_text(u)

    # --------------------------------------------------
    # 결과 확인 출력
    # --------------------------------------------------

    # 제목 출력 (너무 길면 보기 힘들기 때문에 앞 60자만 출력)
    print("\nTITLE:", title[:60])

    # 본문 텍스트 길이 출력
    # 실제 본문이 제대로 수집되었는지 확인하기 위한 디버깅 용도
    print("TEXT_LEN:", len(text))
```

---
### 실제 저장용 코드

```python
# ======================================================
# 필요한 라이브러리 import
# ======================================================

import pandas as pd     # 수집한 데이터를 표(DataFrame) 형태로 관리하고 CSV 파일로 저장하기 위한 라이브러리
from tqdm import tqdm   # 반복문 진행 상황을 시각적인 진행바(progress bar)로 보여주는 라이브러리
import time             # 요청 사이에 딜레이(sleep)를 주기 위한 라이브러리


# ======================================================
# 수집된 데이터를 저장할 리스트
# ======================================================

rows = []   # 각 리뷰 데이터를 딕셔너리 형태로 저장할 리스트


# ======================================================
# 링크 목록을 순회하면서 리뷰 수집
# ======================================================

# links 리스트에서 앞쪽 30개만 테스트 수집
# 전체를 바로 크롤링하면 시간이 오래 걸리거나 서버에 부담이 될 수 있으므로
# 먼저 일부 데이터로 테스트 실행
for u in tqdm(links[:30]):  

    try:
        # --------------------------------------------------
        # 블로그 페이지에서 제목과 본문 텍스트 추출
        # --------------------------------------------------
        title, text = extract_title_text(u)

        # --------------------------------------------------
        # 본문 길이 필터링
        # --------------------------------------------------
        # 본문이 너무 짧은 경우 (예: 광고 페이지, 오류 페이지 등)
        # 정상적인 리뷰가 아닐 가능성이 높으므로 제외
        if len(text) < 200:
            continue

        # --------------------------------------------------
        # 수집된 데이터를 리스트에 저장
        # --------------------------------------------------
        rows.append({
            "title": title,   # 리뷰 제목
            "review": text      # 리뷰 본문
        })

        # --------------------------------------------------
        # 요청 간 딜레이
        # --------------------------------------------------
        # 서버에 과도한 요청을 보내지 않도록
        # 1초 동안 대기
        time.sleep(1.0)

    except:
        # --------------------------------------------------
        # 오류 발생 시 해당 링크 건너뜀
        # --------------------------------------------------
        # 일부 페이지는 접근 제한, 구조 변경 등의 이유로
        # 파싱이 실패할 수 있으므로 예외 처리
        continue


# ======================================================
# pandas DataFrame 생성
# ======================================================

# 리스트에 저장된 리뷰 데이터를 DataFrame 형태로 변환
df = pd.DataFrame(rows)


# ======================================================
# 수집 결과 확인
# ======================================================

# 총 수집된 리뷰 개수 출력
print("수집 개수:", len(df))

# 상위 5개 데이터 미리보기
df.head()


# ======================================================
# CSV 파일로 저장
# ======================================================

df.to_csv(
    "naver_influencer_movie_reviews.csv",  # 저장할 파일 이름
    index=False,                           # 인덱스 컬럼 제거
    encoding="utf-8-sig"                   # 한글 깨짐 방지 인코딩
)


# 저장 완료 메시지 출력
print("저장 완료")
```
저장하면 CSV파일이 vscode에 저장됩니다. 우선 데이터가 잘 들왔는지 확인합니다.

---
### Jupyter에서 바로 PostgreSQL로 DB넣기

DBeaver로 접속상태 확인
![[Pasted image 20260228152855.png]]
✔ 연두색 체크 = DB 접속 정상  
✔ runserver 안 켜도 DB는 접속 가능  
✔ 지금 상태에서 SQL 실행해도 정상 작동

---
Jupyter에서 패키지 설치
```bash
uv pip install sqlalchemy  

# PostgreSQL이면(우리는 이것을 설치) 
uv pip install psycopg2-binary  

# MySQL이면 (이건 설치 안해도 됨) 
uv pip install pymysql
```

---

위의 저장코드를 아래 코드로 CSV 저장 대신 DB 저장하게 바꾸기
```python
# ============================================================
# 네이버 영화 리뷰 크롤링
# → 최대 200개 수집 후 PostgreSQL DB 저장
# ============================================================


# ============================================================
# 필요한 라이브러리 import
# ============================================================

import pandas as pd              # 데이터 테이블(DataFrame) 관리 및 DB/CSV 저장
from tqdm import tqdm            # 반복문 진행 상황을 보여주는 진행바(progress bar)
import time                      # 요청 사이 대기 시간(sleep) 제어
import requests                  # 웹페이지 HTTP 요청
from bs4 import BeautifulSoup    # HTML 파싱 (웹페이지 구조 분석)
from urllib.parse import urljoin # 상대경로 URL → 절대경로 URL 변환
from sqlalchemy import create_engine # PostgreSQL DB 연결
from getpass import getpass      # 비밀번호 입력 시 화면에 표시되지 않도록 처리


# ============================================================
# 1) 네이버 검색 페이지에서 리뷰 글 링크 수집
# ============================================================

# 네이버 인플루언서 탭에서 "영화리뷰" 검색 결과 페이지
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"

# 브라우저 요청처럼 보이도록 User-Agent 설정 (차단 방지)
headers = {"User-Agent": "Mozilla/5.0"}

# 검색 페이지 HTML 가져오기
html = requests.get(URL, headers=headers, timeout=10).text

# HTML 구조 파싱
soup = BeautifulSoup(html, "lxml")


# 리뷰 링크 저장 리스트
links = []

# 페이지에 있는 모든 <a href> 태그 탐색
for a in soup.select("a[href]"):
    h = a.get("href")

    # href 값이 없는 경우 건너뜀
    if not h:
        continue

    # 상대경로 URL을 절대경로 URL로 변환
    h = urljoin(URL, h)

    # --------------------------------------------------------
    # 리뷰 글 후보 필터링
    # --------------------------------------------------------
    # 네이버 검색 페이지에는 다양한 링크가 있으므로
    # 실제 리뷰 글이 있을 가능성이 높은 도메인만 선택
    # --------------------------------------------------------
    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):

        # 로그인 페이지 제거
        if "nid.naver.com" in h:
            continue

        # 블로그 허브 페이지 제거
        if "section.blog.naver.com" in h:
            continue

        # 인플루언서 추천 페이지 제거
        if "in.naver.com/discover" in h:
            continue

        links.append(h)


# ------------------------------------------------------------
# 중복 링크 제거 (순서 유지)
# ------------------------------------------------------------
links = list(dict.fromkeys(links))

print("collected links:", len(links))
print("first 5:", links[:5])


# ============================================================
# 2) 블로그/게시글 페이지에서 제목 + 본문 추출 함수
# ============================================================
def extract_title_text(article_url):

    # 게시글 페이지 HTML 요청
    html = requests.get(
        article_url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10
    ).text

    # HTML 파싱
    soup = BeautifulSoup(html, "lxml")

    # --------------------------------------------------------
    # 제목 추출
    # --------------------------------------------------------
    title = ""

    # 대부분 사이트는 og:title meta 태그에 제목을 넣음
    og = soup.select_one("meta[property='og:title']")

    if og and og.get("content"):
        title = og["content"].strip()

    # --------------------------------------------------------
    # 본문 추출
    # --------------------------------------------------------
    text = ""

    # 사이트 구조가 다양하기 때문에
    # 여러 selector를 순서대로 시도
    for sel in [
        "article",                 # 일반적인 article 태그
        "div.se-main-container",   # 네이버 블로그 최신 에디터
        "div#content",             # 일반 블로그 구조
        "div.post_ct"              # 네이버 포스트 구조
    ]:
        node = soup.select_one(sel)

        if node:
            # HTML 태그 제거하고 텍스트만 추출
            text = node.get_text(" ", strip=True)

            # 200자 이상이면 정상 리뷰로 판단
            if len(text) > 200:
                break

    return title, text


# ============================================================
# 3) 리뷰 200개 수집
# ============================================================

rows = []           # DB 저장용 데이터 리스트
TARGET_COUNT = 200  # 목표 수집 개수
SLEEP_SEC = 1.0     # 요청 사이 대기 시간


# tqdm 진행바로 수집 진행 상황 표시
for u in tqdm(links, desc="Collecting"):

    # 목표 수집 개수 도달 시 종료
    if len(rows) >= TARGET_COUNT:
        break

    try:
        # 제목 + 본문 추출
        title, text = extract_title_text(u)

        # 본문이 너무 짧으면 리뷰가 아닐 가능성이 높으므로 제외
        if len(text) < 200:
            continue

        # DB 저장용 데이터 생성
        rows.append({
            "title": title,
            "review": text,
        })

        # 서버 부하 방지 (1초 대기)
        time.sleep(SLEEP_SEC)

    except Exception as e:
        # 일부 페이지는 구조 문제 등으로 실패할 수 있음
        print("에러:", e)
        continue


# ------------------------------------------------------------
# pandas DataFrame 생성
# ------------------------------------------------------------
df = pd.DataFrame(rows)

print("수집 개수:", len(df))
print(df.head())


# ============================================================
# 4) PostgreSQL 데이터베이스 저장
# ============================================================

# DB 접속 정보
DB_USER = "mysite_user"
DB_PASS = getpass("Postgres password: ")
DB_NAME = "mysite_db"
DB_HOST = "localhost"
DB_PORT = 5433


# SQLAlchemy 엔진 생성
engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ------------------------------------------------------------
# DataFrame → PostgreSQL 테이블 저장
# ------------------------------------------------------------
df.to_sql(
    "stg_movie_reviews",  # 저장할 테이블 이름
    engine,
    if_exists="append",   # 기존 데이터 유지하고 추가 저장
    index=False
)

print("DB 저장 완료 ✅")
```

비밀번호는 직접 입력해야 하는데 settings.py에 DATABASES안에 
PASSWORD": "mysite_password", 이부분이 패스워드입니다.

DB 저장 완료 메시지가 뜨면 재연결 및 연결 종료 후 다시 연결을 하여 stg_movie_reviews 테이블이 생성되었는지 확인합니다.

---
계속 추가하여 데이터를 크로링 하는것을 반복하고 싶다면 DB에 컬럼/유니크 제약 추가 (DBeaver에서 1번만)

`stg_movie_reviews` 테이블 아래 SQL을 DBeaver에서 실행
![[Pasted image 20260228160755.png]]
SQL 편집기 열기

아래코드를 편집기 안에 붙여넣기
```sql
-- ============================================================
-- stg_movie_reviews 테이블에 추가 컬럼 생성
-- ============================================================


-- ------------------------------------------------------------
-- 1) url 컬럼 추가
-- ------------------------------------------------------------
-- 리뷰 데이터를 수집한 원본 페이지 주소(URL)를 저장하기 위한 컬럼
-- TEXT 타입은 길이 제한 없이 문자열을 저장할 수 있음
-- IF NOT EXISTS 옵션은 컬럼이 이미 존재할 경우 오류가 발생하지 않도록 방지
ALTER TABLE public.stg_movie_reviews  
ADD COLUMN IF NOT EXISTS url TEXT;  


-- ------------------------------------------------------------
-- 2) collected_at 컬럼 추가
-- ------------------------------------------------------------
-- 리뷰 데이터를 언제 수집했는지 기록하는 컬럼
-- TIMESTAMP 타입은 날짜 + 시간 정보를 저장
-- 데이터 수집 시간, 로그 기록, 분석 등에 활용 가능
-- IF NOT EXISTS 옵션으로 중복 생성 오류 방지
ALTER TABLE public.stg_movie_reviews  
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
```
순서대로 실행하기

그리고 (중복 방지용) doc_id도 없으면:
```sql
-- ============================================================
-- stg_movie_reviews 테이블에 doc_id 컬럼 추가
-- ============================================================

-- ALTER TABLE : 기존 테이블 구조를 변경할 때 사용하는 명령어
-- public.stg_movie_reviews : public 스키마에 있는 stg_movie_reviews 테이블

ALTER TABLE public.stg_movie_reviews

-- ADD COLUMN : 새로운 컬럼을 추가
-- IF NOT EXISTS : 이미 컬럼이 존재하면 에러를 발생시키지 않고 넘어감
-- doc_id : 문서 고유 식별자 (중복 방지 및 데이터 식별용)
-- TEXT : 문자열 타입
ADD COLUMN IF NOT EXISTS doc_id TEXT;


-- ============================================================
-- doc_id 컬럼에 UNIQUE INDEX 생성
-- ============================================================

-- CREATE UNIQUE INDEX : 중복을 허용하지 않는 인덱스 생성
-- IF NOT EXISTS : 이미 같은 이름의 인덱스가 있으면 생성하지 않음
-- ux_stg_movie_reviews_doc_id : 인덱스 이름 (관례적으로 ux = unique index)

CREATE UNIQUE INDEX IF NOT EXISTS ux_stg_movie_reviews_doc_id

-- 어떤 테이블의 어떤 컬럼에 인덱스를 만들지 지정
-- doc_id 값이 중복되면 저장되지 않도록 보장
ON public.stg_movie_reviews (doc_id);
```

---
### 추가 데이터를 계속 늘리는 순서

```python
# ============================================================
# 필요한 라이브러리 import
# ============================================================

import pandas as pd                # 데이터프레임 처리
from tqdm import tqdm              # 진행률(progress bar) 표시
import time                        # 크롤링 간 sleep 사용
import requests                    # 웹 요청
from bs4 import BeautifulSoup      # HTML 파싱
from urllib.parse import urljoin   # 상대경로 URL → 절대경로 변환
from sqlalchemy import create_engine, MetaData, Table  # DB 연결 및 테이블 메타데이터
from sqlalchemy.dialects.postgresql import insert      # PostgreSQL upsert 기능
from getpass import getpass        # 비밀번호 입력 시 화면에 표시 안되게
import hashlib                     # 해시 생성 (doc_id 생성용)


# ============================================================
# 1) 검색 페이지에서 글 링크 수집
# ============================================================

# 네이버 인플루언서 검색 결과 페이지
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"

# 크롤링 차단 방지를 위해 브라우저 User-Agent 설정
headers = {"User-Agent": "Mozilla/5.0"}

# HTML 요청
html = requests.get(URL, headers=headers, timeout=10).text

# HTML 파싱
soup = BeautifulSoup(html, "lxml")

links = []

# 모든 a 태그 중 href 있는 링크 수집
for a in soup.select("a[href]"):

    h = a.get("href")

    # href 없는 경우 skip
    if not h:
        continue

    # 상대경로를 절대경로로 변환
    h = urljoin(URL, h)

    # 네이버 블로그 / 인플루언서 / 포스트 링크만 필터링
    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):

        # 로그인 페이지 제외
        if "nid.naver.com" in h:
            continue

        # 블로그 섹션 페이지 제외
        if "section.blog.naver.com" in h:
            continue

        # 인플루언서 추천 페이지 제외
        if "in.naver.com/discover" in h:
            continue

        links.append(h)

# 중복 링크 제거
links = list(dict.fromkeys(links))

print("collected links:", len(links))
print("first 5:", links[:5])


# ============================================================
# 2) 제목 / 본문 추출 함수
# ============================================================

def extract_title_text(article_url):

    # 글 페이지 요청
    html = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10).text
    soup = BeautifulSoup(html, "lxml")

    # ------------------------
    # 제목 추출
    # ------------------------
    title = ""

    # og:title 메타 태그 사용 (대부분 블로그에서 안정적)
    og = soup.select_one("meta[property='og:title']")

    if og and og.get("content"):
        title = og["content"].strip()

    # ------------------------
    # 본문 추출
    # ------------------------
    text = ""

    # 여러 HTML 구조 대응
    for sel in ["article", "div.se-main-container", "div#content", "div.post_ct"]:

        node = soup.select_one(sel)

        if node:
            text = node.get_text(" ", strip=True)

            # 너무 짧은 경우 본문이 아닐 가능성
            if len(text) > 200:
                break

    return title, text


# ============================================================
# doc_id 생성 함수
# ============================================================

# URL을 SHA1 해시로 변환하여 고정 길이 ID 생성
# → 동일 URL은 항상 동일 doc_id 생성
# → DB 중복 방지에 사용

def make_doc_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


# ============================================================
# 3) 데이터 수집
# ============================================================

rows = []

TARGET_COUNT = 30      # 수집 목표 개수
MIN_TEXT_LEN = 200     # 최소 본문 길이
SLEEP_SEC = 1.0        # 서버 부하 방지 delay

for u in tqdm(links, desc="Collecting"):

    # 목표 개수 도달하면 종료
    if len(rows) >= TARGET_COUNT:
        break

    try:

        # 제목 / 본문 추출
        title, text = extract_title_text(u)

        # 본문 너무 짧으면 제외
        if len(text) < MIN_TEXT_LEN:
            continue

        # 데이터 저장
        rows.append({
            "title": title,
            "review": text,
            "doc_id": make_doc_id(u)   # URL 기반 고유 ID 생성
        })

        # 요청 간 delay
        time.sleep(SLEEP_SEC)

    except Exception as e:

        print("에러:", e)
        continue


# DataFrame 생성
df = pd.DataFrame(rows)

print("수집 개수:", len(df))
print(df.head())


# ============================================================
# 4) PostgreSQL 누적 저장
# ============================================================

# DB 연결 정보
DB_USER = "mysite_user"
DB_PASS = getpass("Postgres password: ")
DB_NAME = "mysite_db"
DB_HOST = "localhost"
DB_PORT = 5432

# SQLAlchemy 엔진 생성
engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

TABLE_NAME = "stg_movie_reviews"


# ============================================================
# Upsert 함수
# ============================================================

def upsert_ignore_conflict(
        df: pd.DataFrame,
        engine,
        table_name: str,
        conflict_col: str = "doc_id",
        schema: str = "public"
):

    # DataFrame → dict 변환
    records = df.where(pd.notnull(df), None).to_dict(orient="records")

    if not records:
        print("저장할 데이터가 없습니다.")
        return

    # 테이블 메타데이터 로드
    meta = MetaData(schema=schema)
    table = Table(table_name, meta, autoload_with=engine)

    # INSERT 쿼리 생성
    stmt = insert(table).values(records)

    # doc_id 중복 시 insert 하지 않음
    stmt = stmt.on_conflict_do_nothing(index_elements=[conflict_col])

    # DB 실행
    with engine.begin() as conn:
        conn.execute(stmt)


# ============================================================
# DB 저장 실행
# ============================================================

upsert_ignore_conflict(
    df,
    engine,
    TABLE_NAME,
    conflict_col="doc_id"
)

print("DB 누적 저장 완료 ✅ (중복 doc_id는 자동 스킵)")
```

저장이 잘 되었는지 DBeaver에서 확인합니다.
