### 🔹 PostgreSQL이란?

PostgreSQL(Postgres)은  
실제 서비스에서 가장 많이 쓰이는 “진짜 서버용 데이터베이스” 입니다.

- 파일 하나가 아니라 항상 실행 중인 DB 서버
- 여러 사용자가 동시에 접근 가능
- 데이터가 많아져도 안정적
- 무료 + 오픈소스
- Django와 궁합이 매우 좋음 (공식 문서에서도 적극 추천)
    
📌 쉽게 말하면
> “서비스를 운영하기 위해 쓰는 데이터베이스”입니다.

---
### 🔹 Sqlite3는 뭐고, 왜 처음엔 이걸 쓰는가?

SQLite는:
- 파일 하나(`db.sqlite3`)로 동작
- 설치 필요 없음
- 설정이 거의 없음
- Django 기본값
    
그래서 Django는 이렇게 시작합니다:
- 개발하는 입장에서는 DB 설정에 신경 쓰지 말고  
- 웹 구조부터 제작한후 이후 서버용DB로 변경합니다.
- 학습용 / 개발초기용 / 혼자 쓰는 프로젝트에는 최고입니다.


### 🔹 그럼 왜 SQLite를 PostgreSQL로 바꾸는가?

🔥 핵심 이유 한 문장
	SQLite는 개발용, PostgreSQL은 실전용이기 때문입니다.

### 🔹 초보자 관점에서 가장 중요한 차이

###### ① 동시 접속 처리
|항목|SQLite|PostgreSQL|
|---|---|---|
|여러 사용자 동시 접속|❌ 매우 약함|✅ 매우 강함|
|쓰기 작업|한 번에 하나|여러 개 가능|
실제 서비스에서는:
- 여러 사람이 동시에 회원가입
- 댓글 쓰기
- 투표하기
- SQLite는 여기서 에러 or 병목이 생김

② 데이터 안정성
SQLite:
- 파일 하나가 깨지면 전체 데이터 위험
PostgreSQL:
- 서버 기반
- 트랜잭션 처리
- 장애 복구 구조 존재
- 운영 서비스에 필수

③ 기능 차이 (Django에서 체감되는 부분)
PostgreSQL만 제대로 지원되는 기능들:
- `JSONField`
- 강력한 인덱스
- 고급 쿼리
- 대용량 데이터 처리
- 향후 PostGIS(지도), 분석, AI 서비스 확장 가능
    
SQLite는:
- 기능 제한 많음
- 되긴 되는데 불안한 수준

④ CI / 테스트 / 배포 환경과의 일치
지금 당신이 하고 있는 것 
- GitHub Actions CI
- 테스트 코드 작성
- 배포를 염두에 둔 구조

지금 Postgres로 바꾸면:
- 로컬 / CI / 운영 환경이 모두 동일한 DB
- 이게 실무에서 엄청 중요합니다.

### 🔹 언제 SQLite → PostgreSQL로 바꾸는 게 맞나?

아래 중 2개 이상 해당되면 바꾸는 시점입니다.
- ✅ 테스트 코드를 쓰기 시작했다
- ✅ CI를 구성했다
- ✅ 회원 시스템이 있다
- ✅ 여러 사용자가 동시에 접근할 가능성이 있다
- ✅ 배포를 생각하고 있다

---
## Django에서 PostgreSQL을 사용하기 위한 로컬 DB 초기 세팅

### 1) 로컬에 PostgreSQL 설치/실행 (WSL 기준)

1-1. 설치
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

1-2. 서비스 시작
```bash
sudo service postgresql start
```

1-3. Postgres 접속
```bash
sudo -u postgres psql
```

---
### 2) DB / 유저 생성 (한 번만)
	psql 안에서 아래를 실행

1️⃣ PostgreSQL 접속
```bash
sudo -u postgres psql
```

프롬프트:
```
postgres=#
```

2️⃣ 데이터베이스 생성
```sql
CREATE DATABASE django_first2_db;
```

✔ 정상 출력:
```
CREATE DATABASE
```

3️⃣ 사용자 생성 (공백 중요 ⚠️)
```sql
CREATE USER django_user WITH PASSWORD 'strong-password';
```

✔ 정상 출력:
```
CREATE ROLE
```

✅ 필수 1: 스키마에서 테이블 생성 가능하게
```sql
GRANT USAGE, CREATE ON SCHEMA public TO django_user;
```

✅ 권장 2: public 스키마 소유자 변경(안전/깔끔)
```sql
ALTER SCHEMA public OWNER TO django_user;
```

✅ 권장 3: DB 소유자도 django_user로(권한 꼬임 방지)
```sql
ALTER DATABASE django_first2_db OWNER TO django_user;
```

4️⃣ 사용자 기본 설정 (각각 따로 실행)
```sql
ALTER ROLE django_user SET client_encoding TO 'utf8';
```

```sql
ALTER ROLE django_user SET timezone TO 'Asia/Seoul';
```

✔ 각각 실행 시:
```
ALTER ROLE
```

5️⃣ 데이터베이스 권한 부여
```sql
GRANT ALL PRIVILEGES ON DATABASE django_first2_db TO django_user;
```

✔ 정상 출력:
```
GRANT
```

6️⃣ PostgreSQL 종료
```sql
\q
```

> ⚠️ 주의
> - `\\q` 앞에 ❌
> - 반드시 역슬래시 하나만 써야 함

명령어를 한꺼번에 정리한 것:
```sql
-- 1) DB 생성
CREATE DATABASE django_first2_db;

-- 2) 유저 생성
CREATE USER django_user WITH PASSWORD 'strong-password';

-- 3) 유저 기본 옵션
ALTER ROLE django_user SET client_encoding TO 'utf8';
ALTER ROLE django_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE django_user SET timezone TO 'Asia/Seoul';

-- 4) DB 권한 부여
GRANT ALL PRIVILEGES ON DATABASE django_first2_db TO django_user;

-- ✅ (여기부터가 당신 문서에 빠진 핵심!)
-- 5) public 스키마에서 테이블 생성 권한 부여 (Django migrate 필수)
GRANT USAGE, CREATE ON SCHEMA public TO django_user;

-- 6) (권장) 스키마 소유자 변경
ALTER SCHEMA public OWNER TO django_user;

-- 7) (권장) DB 소유자 변경
ALTER DATABASE django_first2_db OWNER TO django_user;

-- 8) 종료
\q
```

---
### 3) Django가 Postgres를 쓰게 패키지 설치

3-1) psycopg 설치 (가장 무난)

uv 사용 중이면:
```bash
uv pip install "psycopg[binary]"
```
	psycopg2-binary도 많이 쓰지만, 요즘은 psycopg(v3) 쪽을 많이 씁니다. 
	둘 중 하나만 쓰면 돼요.

---
### 4) settings.py에서 DB 설정 바꾸기 (env로 추천)

이 과정을 진행하는 이유는?
	내 컴퓨터, GitHub CI, 실제 서버에서 모두 같은 코드로 실행되게 만들기 위해서 입니다.

예전 방식 (SQLite, 하드코딩)
```python
DATABASES = {
    "default": {
        "ENGINE": "sqlite3",
        "NAME": "db.sqlite3",
    }
}
```
이 방식의 문제:

- ✔️ 혼자 연습할 땐 편함
- ❌ 여러 사람이 쓰기 어려움
- ❌ GitHub Actions에서 DB 테스트 불가
- ❌ 실제 서비스용 DB(PostgreSQL)와 다름

지금 하는 방식 (PostgreSQL + env)
```
내 컴퓨터 → PostgreSQL
GitHub CI → PostgreSQL
실서버 → PostgreSQL
```
	개발 환경과 실무 환경을 최대한 비슷하게 맞추는 과정
	실무에서는 “로컬에서는 되는데 서버에서 안 됨”이 제일 큰 사고입니다.

### env가 무엇이며 왜 분리하는가?

env(Environment Variable)란?
	`코드가 아닌, 실행 환경이 들고 있는 설정값입니다.`

쉽게 말하면:
- 코드가 아니고,
- 설정값 라이센스를 보관하는 파일로 비밀번호, DB 주소 등이 들어 있습니다.

만약 env를 따로 관리하지 않는다면?
- 코드에 비밀번호가 적혀 있음
- GitHub에 올리는 순간 전 세계 공개
- 실수 한 번이면 보안 사고

⭕ env 사용 (좋은 예)
```python

# settings.py에는 이렇게 작성하고
PASSWORD = os.environ.get("POSTGRES_PASSWORD")

# env에 따로 이렇게 관리합니다
POSTGRES_PASSWORD=strong-password
```
- 코드는 “값을 읽기만 함”
- 실제 값은 컴퓨터/서버/GitHub가 따로 관리
- 코드와 비밀정보가 분리됨

기존에 settings.py에 작성된 SQLite는 주석처리를 합니다. 
```python
# DATABASES = {
#   "default": {
#     "ENGINE": "django.db.backends.sqlite3",
#     "NAME": BASE_DIR / "db.sqlite3",
#   }
# }
```

이걸 Postgres로 변경: `mysite/settings.py`
```python
import os

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "django_first2_db"),
        "USER": os.environ.get("POSTGRES_USER", "django_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "strong-password"),
        "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or "ci-dev-secret-key"
```

위의 코드를 주석문으로 해석한 부분입니다.
```python
import os
# os 모듈: 운영체제의 환경변수(Environment Variable)를 읽기 위해 사용
# ex) POSTGRES_DB, DJANGO_SECRET_KEY 같은 값들

DATABASES = {
    "default": {
        # Django가 사용할 데이터베이스 종류
        # sqlite3 → postgresql로 변경됨
        "ENGINE": "django.db.backends.postgresql",

        # 사용할 데이터베이스 이름
        # 환경변수 POSTGRES_DB가 있으면 그 값을 사용
        # 없으면 기본값 "django_first2_db" 사용
        "NAME": os.environ.get("POSTGRES_DB", "django_first2_db"),

        # PostgreSQL 접속 계정 이름
        # 환경변수 POSTGRES_USER가 있으면 그 값을 사용
        # 없으면 기본값 "django_user" 사용
        "USER": os.environ.get("POSTGRES_USER", "django_user"),

        # PostgreSQL 접속 비밀번호
        # 환경변수 POSTGRES_PASSWORD가 있으면 그 값을 사용
        # 없으면 기본값 "strong-password" 사용
        # (실무에서는 기본값 없이 env로만 관리하는 경우가 많음)
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "strong-password"),

        # PostgreSQL 서버 주소
        # 로컬 개발/CI에서는 보통 127.0.0.1 (내 컴퓨터)
        # GitHub Actions service를 쓰는 경우엔 "postgres"가 될 수도 있음
        "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),

        # PostgreSQL 서버 포트
        # 기본 포트는 5432
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

# Django 내부에서 사용하는 비밀 키
# 세션, 로그인, CSRF, 비밀번호 초기화 토큰 등에 사용됨
#
# 1) 환경변수 DJANGO_SECRET_KEY가 있으면 그 값을 사용
# 2) 없거나 빈 문자열이면 "ci-dev-secret-key"를 사용 (CI/개발용 fallback)
#
# → GitHub Actions / 로컬 개발에서는 에러 없이 동작
# → 운영 환경에서는 반드시 env로 실제 키를 넣어야 함
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or "ci-dev-secret-key"
```

`Django_first2/.env`
```env
POSTGRES_DB=django_first2_db
POSTGRES_USER=django_user
POSTGRES_PASSWORD=strong-password
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
```
---
GitHub에 env를 올리면 안 되는 이유
	`GitHub에 올라간 순간, 비밀이 아니라 “공개 정보”가 됩니다`

실제로 벌어지는 일
- 누군가 실수로 `.env` 커밋
- 봇이 자동으로 SECRET_KEY 수집
- 서버 해킹 / DB 삭제 / 크레딧 소진
- 이건 이론이 아니라 실제로 매일 발생하는 사고

`.gitignore`에 추가 (필수)
```gitignore
# Environment variables
.env
```

settings.py에서 읽기
	`.env`를 자동으로 읽으려면 `python-dotenv`를 설치합니다.
```bash
uv pip install python-dotenv
```

`mysite/settings.py` 상단에 추가합니다.
```python
from dotenv import load_dotenv

load_dotenv()
```

`requirements.txt 생성`:
```bash
uv pip freeze > requirements.txt
``` 

✅ **핵심**
- 로컬에서는 HOST가 보통 `127.0.0.1`
- CI에서는 서비스 이름(예: `postgres`)로 바뀌는 경우가 많아서 환경변수로 받는 게 안전

---
### 5) 마이그레이션 실행 (새 DB에 테이블 만들기)

이제 Postgres에 테이블을 생성합니다.
```bash
uv run python manage.py makemigrations
uv run python manage.py migrate
```

확인:
```bash
uv run python manage.py createsuperuser
uv run python manage.py runserver
```

---
### 6) (선택) SQLite 데이터가 이미 있다면 옮기기
	기존에 SQLite에 데이터가 들어있다면, 가장 쉬운 방법은 dump → loaddata 입니다.
	이미 PostgreSQL로 변경한 뒤에는 dump를 하면 안 됩니다
	dump는 반드시 “SQLite를 사용 중일 때” 해야 합니다.

6-1. 먼저 SQLite 설정으로 잠깐 돌려서 dump

아직 sqlite DB가 남아있을 때
```bash
uv run python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > data.json
```

6-2. settings를 Postgres로 바꾼 상태에서 migrate 후 loaddata
```bash
uv run python manage.py migrate
uv run python manage.py loaddata data.json
```
	auth, admin 관련 데이터는 충돌날 수 있어서 위처럼 -e로 제외하는 게 초보자에게 안전합니다.

---
### 7) CI(GitHub Actions)에서 PostgreSQL 붙이기
	지금 CI는 그냥 python manage.py test만 돌고 있죠.
	Postgres를 쓰려면 CI에 Postgres 서비스를 띄워야 합니다.

디렉토리구조
```
.github/
└── workflows/
    └── django.yml   ✅ 기존 야물파일에서 아래 코드 수정
```

이 워크플로우는 Django 기본 CI 뼈대에  
➡️ PostgreSQL 서비스  
➡️ 마이그레이션 + 테스트 실행을 추가한 형태입니다.

아래처럼 workflow에 `services: postgres`를 추가하고, 환경변수를 맞춰주세요.
```yaml
name: Django CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: django_first2_db
          POSTGRES_USER: django_user
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U django_user -d django_first2_db"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.12"]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install -r requirements.txt

      - name: Run migrations and tests
        env:
          DJANGO_SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
          POSTGRES_DB: django_first2_db
          POSTGRES_USER: django_user
          POSTGRES_PASSWORD: postgres
          POSTGRES_HOST: 127.0.0.1
          POSTGRES_PORT: 5432
        run: |
          python manage.py migrate
          python manage.py test
```

코드해석:
```yaml
name: Django CI
# GitHub Actions 워크플로우 이름
# GitHub Actions 화면에 이 이름으로 표시됨

on:
  push:
    branches: ["main"]
  # main 브랜치에 push 될 때 CI 실행

  pull_request:
    branches: ["main"]
  # main 브랜치로 PR 생성/업데이트 시 CI 실행
  # 실무에서 가장 일반적인 트리거 조합

jobs:
  test:
    # 이 워크플로우에서 실행할 작업(job) 이름
    # 관례적으로 test, build, ci 같은 이름을 씀

    runs-on: ubuntu-latest
    # GitHub가 제공하는 Ubuntu 최신 환경에서 실행
    # 직접 서버를 준비할 필요 없음

    services:
      postgres:
        # 테스트 중 사용할 PostgreSQL 컨테이너 서비스 정의
        image: postgres:16
        # PostgreSQL 16 버전 Docker 이미지 사용

        env:
          # PostgreSQL 컨테이너가 시작될 때 사용할 환경변수
          POSTGRES_DB: django_first2_db
          POSTGRES_USER: django_user
          POSTGRES_PASSWORD: postgres
          # 컨테이너 내부에서 DB / 유저 / 비밀번호 자동 생성

        ports:
          - 5432:5432
          # PostgreSQL 기본 포트
          # GitHub Actions runner ↔ 컨테이너 간 통신용

        options: >-
          # PostgreSQL이 "완전히 준비되었는지" 확인하는 헬스체크
          --health-cmd="pg_isready -U django_user -d django_first2_db"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
          # DB가 준비되기 전에 Django가 접근해서 실패하는 걸 방지

    strategy:
      fail-fast: false
      # 여러 환경(matrix)을 쓸 때 하나 실패해도 전체 중단 안 함
      # 지금은 Python 하나라 체감은 적음

      matrix:
        python-version: ["3.12"]
        # 테스트에 사용할 Python 버전
        # 여러 버전 테스트 시 ["3.10", "3.11", "3.12"] 이런 식으로 확장 가능

    steps:
      # job 안에서 순서대로 실행될 단계들

      - name: Checkout
        uses: actions/checkout@v4
        # GitHub 저장소 코드를 runner로 내려받는 단계
        # 없으면 코드 자체가 없음

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"
        # 지정한 Python 버전 설치
        # pip 캐시 사용 → CI 속도 향상

      - name: Install dependencies
        # Django, psycopg, 테스트 관련 패키지 설치
        run: |
          python -m pip install --upgrade pip
          python -m pip install -r requirements.txt
        # requirements.txt 기준으로 의존성 설치
        # 로컬 환경과 CI 환경을 동일하게 맞추기 위함

      - name: Run migrations and tests
        # 실제 Django 테스트 단계 (핵심)
        env:
          # settings.py에서 읽을 환경변수들
          DJANGO_SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
          # Django SECRET_KEY (GitHub Secrets에 저장된 값)

          POSTGRES_DB: django_first2_db
          POSTGRES_USER: django_user
          POSTGRES_PASSWORD: postgres

          POSTGRES_HOST: 127.0.0.1
          # PostgreSQL 접속 주소
          # services + ports를 쓰면 127.0.0.1로 접근 가능

          POSTGRES_PORT: 5432
          # PostgreSQL 기본 포트

        run: |
          python manage.py migrate
          # PostgreSQL에 Django 테이블 생성
          # 마이그레이션 실패 시 CI 즉시 실패

          python manage.py test
          # Django 테스트 실행
          # 테스트 실패 시 PR / push 차단
```


git push : PostgreSQL로 변경후 깃허브에 push해서 Actions에 성공한 이미지
![[Pasted image 20260124203220.png]]
