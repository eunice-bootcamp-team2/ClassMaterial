터미널에서 jupyter notebook 설치 및 실행하기
```bash
uv pip install notebook

jupyter notebook
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
headers = {"User-Agent": "Mozilla/5.0"}
```

`크롬브라우저를 열고 chrome://version/ 들어가면 정보가 나옵니다.`
![[Pasted image 20260228150637.png]]

`웹페이지를 요청하고, 정상적으로 받아왔는지 확인하는 디버깅 코드`
```python
r = requests.get(URL, headers=headers, timeout=10)
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
- 블러그의 URL을 확인하기 위한 과정

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
DB 테이블 컬럼이 name/description이어야 함
```sql
SELECT column_name, data_type  
FROM information_schema.columns  
WHERE table_schema='public'  
AND table_name='stg_movie_reviews' # 새로 만들고 싶은 테이블 이름  
ORDER BY ordinal_position;
```

### 요청 2번 = 실전 수집 단계

검색페이지에서 글 링크만 모으기
목표: 필요 없는 링크(로그인, 검색탭, #lnb 등) 제거하고 실제 글로 갈 가능성이 높은 링크만뽑기

```python
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"
headers = {"User-Agent": "Mozilla/5.0"}

html = requests.get(URL, headers=headers, timeout=10).text
soup = BeautifulSoup(html, "lxml")
```

여기부터가 수집 로직
```python
links = []
for a in soup.select("a[href]"):
    h = a.get("href")
    if not h:
        continue
    h = urljoin(URL, h)  # 상대주소 보정

    # 글 링크 후보(블로그/인플루언서/포스트만)
    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):
        # 로그인/허브/검색자기자신 같은 것 제거
        if "nid.naver.com" in h:
            continue
        if "section.blog.naver.com" in h:
            continue
        if "in.naver.com/discover" in h:
            continue
        links.append(h)

# 중복 제거
links = list(dict.fromkeys(links))

print("collected links:", len(links))
print("first 5:", links[:5])
```
- `a[href]` : 링크 태그만 모음
- `blog/in/post`만 남김
- 로그인/허브 링크는 버림
- 중복 제거 후 `links` 리스트 완성

---
제목/본문만 수집 
```python
import requests
from bs4 import BeautifulSoup
```


```python
def extract_title_text(article_url):
    html = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10).text
    soup = BeautifulSoup(html, "lxml")

    # 제목
    title = ""
    og = soup.select_one("meta[property='og:title']")
    if og and og.get("content"):
        title = og["content"].strip()

    # 본문
    text = ""
    for sel in ["article", "div.se-main-container", "div#content", "div.post_ct"]:
        node = soup.select_one(sel)
        if node:
            text = node.get_text(" ", strip=True)
            if len(text) > 200:
                break

    return title, text
```
- 수집 로직을 함수로 분리
- 재사용 가능
- 에러 처리 가능

샘플 5개 테스트 (URL 출력 제거)
```python
sample_links = links[:5]

for u in sample_links:
    title, text = extract_title_text(u)
    print("\nTITLE:", title[:60])
    print("TEXT_LEN:", len(text))
```

---
### 실제 저장용 코드

```python
import pandas as pd
from tqdm import tqdm
import time

rows = []

for u in tqdm(links[:30]):  # 30개만
    try:
        title, text = extract_title_text(u)
        if len(text) < 200:
            continue

        rows.append({
            "title": title,
            "text": text
        })

        time.sleep(1.0)
    except:
        continue

df = pd.DataFrame(rows)

print("수집 개수:", len(df))
df.head()

df.to_csv("naver_influencer_movie_reviews.csv",
          index=False,
          encoding="utf-8-sig")

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
# 200개 수집 + PostgreSQL 저장
# ============================================================

import pandas as pd
from tqdm import tqdm
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from sqlalchemy import create_engine
from getpass import getpass

# ============================================================
# 1) 검색 페이지에서 글 링크 수집
# ============================================================
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"
headers = {"User-Agent": "Mozilla/5.0"}

html = requests.get(URL, headers=headers, timeout=10).text
soup = BeautifulSoup(html, "lxml")

links = []
for a in soup.select("a[href]"):
    h = a.get("href")
    if not h:
        continue
    h = urljoin(URL, h)

    # 글 링크 후보(블로그/인플루언서/포스트만)
    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):
        # 로그인/허브/검색자기자신 같은 것 제거
        if "nid.naver.com" in h:
            continue
        if "section.blog.naver.com" in h:
            continue
        if "in.naver.com/discover" in h:
            continue
        links.append(h)

# 중복 제거(순서 유지)
links = list(dict.fromkeys(links))

print("collected links:", len(links))
print("first 5:", links[:5])

# ============================================================
# 2) 제목/본문 추출 함수
# ============================================================
def extract_title_text(article_url):
    html = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10).text
    soup = BeautifulSoup(html, "lxml")

    # 제목
    title = ""
    og = soup.select_one("meta[property='og:title']")
    if og and og.get("content"):
        title = og["content"].strip()

    # 본문
    text = ""
    for sel in ["article", "div.se-main-container", "div#content", "div.post_ct"]:
        node = soup.select_one(sel)
        if node:
            text = node.get_text(" ", strip=True)
            if len(text) > 200:
                break

    return title, text

# ============================================================
# 3) 200개 수집 (DB 저장용 rows 생성)
# ============================================================
rows = []

TARGET_COUNT = 200
SLEEP_SEC = 1.0

for u in tqdm(links, desc="Collecting"):
    if len(rows) >= TARGET_COUNT:
        break

    try:
        title, text = extract_title_text(u)

        # 본문이 너무 짧으면 버림
        if len(text) < 200:
            continue

        rows.append({
            "title": title,
            "review": text,
        })

        time.sleep(SLEEP_SEC)

    except Exception as e:
        print("에러:", e)
        continue

df = pd.DataFrame(rows)

print("수집 개수:", len(df))
print(df.head())

# ============================================================
# 4) PostgreSQL 저장
# ============================================================
DB_USER = "mysite_user"
DB_PASS = getpass("Postgres password: ")
DB_NAME = "mysite_db"
DB_HOST = "localhost"
DB_PORT = 5432

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

df.to_sql( 
    "stg_movie_reviews",
    engine,
    if_exists="append",  # 필요하면 replace 로 변경
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
ALTER TABLE public.stg_movie_reviews  
ADD COLUMN IF NOT EXISTS url TEXT;  
  
ALTER TABLE public.stg_movie_reviews  
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
```
순서대로 실행하기

그리고 (중복 방지용) doc_id도 없으면:
```sql
ALTER TABLE public.stg_movie_reviews  
ADD COLUMN IF NOT EXISTS doc_id TEXT;  
  
CREATE UNIQUE INDEX IF NOT EXISTS ux_stg_movie_reviews_doc_id  
ON public.stg_movie_reviews (doc_id);
```

---
### 추가 데이터를 계속 늘리는 순서

```python
import pandas as pd
from tqdm import tqdm
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.dialects.postgresql import insert
from getpass import getpass
import hashlib

# ============================================================
# 1) 검색 페이지에서 글 링크 수집
# ============================================================
URL = "https://search.naver.com/search.naver?query=%EC%98%81%ED%99%94%EB%A6%AC%EB%B7%B0&sm=tab_nmr&where=influencer"
headers = {"User-Agent": "Mozilla/5.0"}

html = requests.get(URL, headers=headers, timeout=10).text
soup = BeautifulSoup(html, "lxml")

links = []
for a in soup.select("a[href]"):
    h = a.get("href")
    if not h:
        continue
    h = urljoin(URL, h)

    if ("blog.naver.com" in h) or ("in.naver.com" in h) or ("post.naver.com" in h):
        if "nid.naver.com" in h:
            continue
        if "section.blog.naver.com" in h:
            continue
        if "in.naver.com/discover" in h:
            continue
        links.append(h)

links = list(dict.fromkeys(links))
print("collected links:", len(links))
print("first 5:", links[:5])

# ============================================================
# 2) 제목/본문 추출 함수
# ============================================================
def extract_title_text(article_url):
    html = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10).text
    soup = BeautifulSoup(html, "lxml")

    title = ""
    og = soup.select_one("meta[property='og:title']")
    if og and og.get("content"):
        title = og["content"].strip()

    text = ""
    for sel in ["article", "div.se-main-container", "div#content", "div.post_ct"]:
        node = soup.select_one(sel)
        if node:
            text = node.get_text(" ", strip=True)
            if len(text) > 200:
                break

    return title, text

# ✅ doc_id 생성 함수 (URL을 sha1 해시로 고정 길이 ID 생성)
def make_doc_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()

# ============================================================
# 3) 수집
# ============================================================
rows = []
TARGET_COUNT = 30       # 데이터 수
MIN_TEXT_LEN = 200      # 정상 글만
SLEEP_SEC = 1.0

for u in tqdm(links, desc="Collecting"):
    if len(rows) >= TARGET_COUNT:
        break

    try:
        title, text = extract_title_text(u)
        if len(text) < MIN_TEXT_LEN:
            continue

        rows.append({
            "title": title,
            "review": text,
            "doc_id": make_doc_id(u)  # ✅ 중복방지 키
        })

        time.sleep(SLEEP_SEC)

    except Exception as e:
        print("에러:", e)
        continue

df = pd.DataFrame(rows)
print("수집 개수:", len(df))
print(df.head())

# ============================================================
# 4) PostgreSQL 누적 저장 (중복 doc_id는 자동 스킵)
# ============================================================
DB_USER = "mysite_user"
DB_PASS = getpass("Postgres password: ")
DB_NAME = "mysite_db"
DB_HOST = "localhost"
DB_PORT = 5432

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

TABLE_NAME = "stg_movie_reviews"

def upsert_ignore_conflict(df: pd.DataFrame, engine, table_name: str, conflict_col: str = "doc_id", schema: str = "public"):
    records = df.where(pd.notnull(df), None).to_dict(orient="records")
    if not records:
        print("저장할 데이터가 없습니다.")
        return

    meta = MetaData(schema=schema)
    table = Table(table_name, meta, autoload_with=engine)

    stmt = insert(table).values(records)
    stmt = stmt.on_conflict_do_nothing(index_elements=[conflict_col])

    with engine.begin() as conn:
        conn.execute(stmt)

upsert_ignore_conflict(df, engine, TABLE_NAME, conflict_col="doc_id")

print("DB 누적 저장 완료 ✅ (중복 doc_id는 자동 스킵)")
```

저장이 잘 되었는지 DBeaver에서 확인합니다.
