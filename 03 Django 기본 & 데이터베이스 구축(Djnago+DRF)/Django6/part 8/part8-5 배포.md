
배포 전체 흐름 한눈에 보기
```
내 컴퓨터 (Django + uv)
   ↓
Dockerfile로 실행 환경 정의
   ↓
flyctl CLI로 서버 생성
   ↓
Gunicorn으로 Django 실행
   ↓
Fly.io 서버에서 서비스 공개
```

위의 시각화의 의미는 다음과 같습니다:

- **내 컴퓨터**에서는 Django가 `python manage.py runserver`로 실행됨
- 하지만 **실제 서비스**는:
    - Linux 서버 위에서
    - Gunicorn이라는 서버 프로그램으로
    - Docker 컨테이너 안에서 실행됨
- Fly.io는 이 모든 걸 대신 만들어주는 플랫폼입니다

---
1️⃣ Fly.io란 무엇인가?

Fly.io는  
👉 내 Django 프로젝트를 실제 서버에서 실행해서  
`https://주소.fly.dev` 형태의 웹사이트로 만들어주는 서비스입니다.

Fly.io를 쓰는 이유
- 서버 직접 구매/관리 ❌
- EC2, 보안그룹, 로드밸런서 설정 ❌
- 콘솔 클릭 위주의 설정 ❌
    

Docker의 개요와 필요성

✔ Docker란?
	내 프로그램이 실행되는 ‘컴퓨터 환경 자체’를 통째로 포장하는 기술입니다.
	내 컴퓨터에서는 되는데 서버에서는 안 돼요 문제를 없애기 위한 도구

✔ 왜 필요한가요? 
	로컬에서 Django는 보통 이렇게 실행하죠:
```
python manage.py runserver
```
하지만 실제 서버에서는:
- 운영체제: Linux
- Python 버전 다를 수 있음
- 설치된 패키지 다를 수 있음
- 환경변수 방식으로 설정함
- 환경 차이 때문에 에러가 자주 발생
- Docker는 이것을 해결합니다.**

✔ Gunicorn이란?
	Django를 실제 서버에서 실행해주는 실행기(Server 프로그램)입니다.

✔ 왜 runserver를 쓰면 안 되나요?
	`python manage.py runserver`는
	- 개발용
	- 혼자 테스트용
	- 성능 / 안정성 ❌
	- 실제 서비스에서는 사용 ❌

✔ Gunicorn의 역할
	요청이 오면 Django에게 일을 시키고, 결과를 돌려주는 관리자


 Fly.io는 CLI로의 배포
- **CLI 명령어 몇 개로 배포 가능**
- **Dockerfile 기준으로 정확히 실행**
- **SSH 접속 가능 (DB migrate, superuser 생성 가능)**
    
왜 CLI 방식(`flyctl`)을 쓰나요?

CLI 방식의 장점:
1. **Dockerfile 직접 제어 가능**
    - Django가 어떤 환경에서 실행되는지 정확히 알 수 있음
        
2. **fly.toml 설정 파일 직접 수정 가능**
    - 포트, 서버 설정을 명시적으로 관리
        
3. **로컬에서 테스트 후 배포 가능**
4. **서버에 SSH 접속 가능**
    - `migrate`, `createsuperuser` 실행 가능
        
👉 Django 학습자/포트폴리오용으로 가장 좋은 방식

사이트에 접속합니다. [https://fly.io/]
![[Pasted image 20260126201751.png]]

결제 수단 등록 (필수)
Fly.io는 **후불(pay-as-you-go)** 방식입니다.
- 카드는 **등록만** 하면 됨
- 당장 결제 ❌
- 실제 사용량만큼만 월말에 청구
    

현재 상태 요약:
- ✔ Account Status: Good Standing
- ✔ 결제 수단 등록 완료
- ✔ Credit Balance $0.00 → 정상
👉 배포를 막는 요소는 이미 없음

![[Pasted image 20260126212246.png]]

![[Pasted image 20260126201934.png]]
지금 상황 요약

- ✔ GitHub 연동 이미 정상 완료
- ✔ 결제 수단 등록 **완료**
- ✔ Account Status: Good Standing
- ✔ Credit Balance: $0.00 (정상)
    
👉 배포 준비는 이미 끝난 상태입니다.


---
(1) 로그인 확인: vscode 터미널에서
```bash
flyctl auth whoami
```
- 로컬 터미널에서 Fly 서버를 제어하려면
- 내 계정과 CLI가 연결돼 있어야 함

결과
```
(Django_first2) (.venv) youjung@DESKTOP-PJCRMMU:~/Django_first2$ flyctl auth whoami
Automatically updating 0.3.149 -> v0.4.4.
Running automatic upgrade [curl -L "https://fly.io/install.sh" | sh]
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  5167  100  5167    0     0  18432      0 --:--:-- --:--:-- --:--:-- 18453
######################################################################## 100.0%
set update channel to shell
flyctl was installed successfully to /home/youjung/.fly/bin/flyctl

----

Welcome back!
Your session has expired, please log in to continue using flyctl.

? Would you like to sign in? (y/N) 
```
여기서 반드시 `y` 입력 후 Enter

브라우저 인증 페이지가 열리고, 로그인하면 다시 터미널로 돌아옵니다.
```
Welcome back!
Your session has expired, please log in to continue using flyctl.

? Would you like to sign in? Yes
Opening https://fly.io/app/auth/cli/70736676326333696a7a68356d7a676e35623771646e376c7777633464616477 ...

Waiting for session...⡿
```
이렇게 나오면 ctrl을 누른후 주소를 클릭하여 이동합니다.

![[Pasted image 20260126203034.png]]

```
Waiting for session... Done
successfully logged in as youjung7598@gmail.com
youjung7598@gmail.com
(Django_first2) (.venv) youjung@DESKTOP-PJCRMMU:~/Django_first2$ 
```
위와 같이 보이면 성공입니다.

이 의미는:
1. ✅ 브라우저 인증 완료
2. ✅ Fly.io CLI 토큰 발급 완료
3. ✅ flyctl ↔ Fly.io 계정 연결 완료
4. ✅ 현재 터미널 세션에서 인증 유지됨
---
Fly 앱 초기화 (앱 + fly.toml + Dockerfile 생성)
```bash
flyctl launch
```
이 명령 하나로 Fly는:
1. 서버 앱 생성
2. Postgres DB 생성
3. DATABASE_URL 환경변수 설정
4. fly.toml 생성
5. Dockerfile 기본 템플릿 생성

질문 나오면 이렇게 선택하세요(초보자 기준 안전 루트):
- ? Do you want to tweak these settings before proceeding? (y/N) 
    엔터만 치기 = N

왜 N을 선택하나요?
- 이 단계의 tweak은 Fly 내부 고급 옵션
- Django 초보자 + 첫 배포에서는
    - 오히려 설정 꼬일 확률 ↑
        
- 우리가 해야 할 수정은
    - `settings.py`
    - `Dockerfile`
    - `fly.toml`  
        → launch 끝난 다음에 직접 수정하는 게 정석

```
Managed Postgres cluster 82ylg01n29lozx19 is ready and attached to django-first2
The following secret was added to django-first2:
  DATABASE_URL=postgresql://fly-user:17k6eCIrnY1aVK8Qd518RnO4@pgbouncer.82ylg01n29lozx19.flympg.net/fly-db
Wrote config file fly.toml

[INFO] Python 3.12.3 was detected. 'python:3.12-slim' image will be set in the Dockerfile.

Validating /home/youjung/Django_first2/fly.toml
✓ Configuration is valid

Your Django app is almost ready to deploy!

We recommend using the django-environ(pip install django-environ) or dj-database-url(pip install dj-database-url) to parse the DATABASE_URL from os.environ['DATABASE_URL']

For detailed documentation, see https://fly.dev/docs/django/
```
여기까지면 DB(Postgres)까지 포함해서 앱 생성/연결이 완전히 끝난 상태예요 ✅

이제부터는 Django가 Fly가 준 `DATABASE_URL`을 읽어서 Postgres로 붙게 만들고 → 배포만 하면 됩니다.

---
(1) 필요한 패키지 설치
Fly 서버에서 Django를 실행하려면 로컬 개발 환경과는 다른 패키지가 필요합니다.
```bash
uv pip install gunicorn whitenoise dj-database-url "psycopg[binary]"
uv pip freeze > requirements.txt
```
`psycopg[binary]`는 Postgres 연결 드라이버입니다(파이썬 3.12에서 안정적).

###### 각 패키지 역할
| 패키지             | 역할                   |
| --------------- | -------------------- |
| gunicorn        | 실제 서버에서 Django 실행    |
| whitenoise      | static 파일(CSS/JS) 제공 |
| dj-database-url | DATABASE_URL 해석      |
| psycopg         | Postgres 연결 드라이버     |
`requirements.txt`는 **Dockerfile에서 설치 목록으로 사용**

---
settings.py 수정 (왜 필요한가?)
Fly 서버는:
- 환경변수로 설정을 넘겨줍니다
- `DATABASE_URL`, `SECRET_KEY` 같은 값들
    
그래서 Django 설정도:
- 하드코딩 ❌
- 환경변수 기반으로 변경해야 함

`mysite/settings.py`에 아래를 반영하세요.
```python
import os
import dj_database_url
from pathlib import Path
```

로컬 / CI / Fly 환경 모두 대응
```
SECRET_KEY = (
    os.environ.get("DJANGO_SECRET_KEY")
    or os.environ.get("SECRET_KEY")
    or "ci-dev-secret-key"
    )
DEBUG = os.environ.get("DEBUG", "0") == "1"
```

ALLOWED_HOSTS / CSRF
```
ALLOWED_HOSTS = ["django-first2.fly.dev", "localhost", "127.0.0.1"]
CSRF_TRUSTED_ORIGINS = ["https://django-first2.fly.dev"]
```

DATABASES: Fly의 DATABASE_URL 사용

기존 `DATABASES = {...}` 아래/대신에 이렇게:
```python
import dj_database_url
DATABASES = {
    "default": dj_database_url.config(
        default=(
            os.environ.get("DATABASE_URL")
            or f"postgresql://{os.environ.get('POSTGRES_USER','django_user')}:"
               f"{os.environ.get('POSTGRES_PASSWORD','strong-password')}@"
               f"{os.environ.get('POSTGRES_HOST','127.0.0.1')}:"
               f"{os.environ.get('POSTGRES_PORT','5432')}/"
               f"{os.environ.get('POSTGRES_DB','django_first2_db')}"
        ),
        conn_max_age=600,
        ssl_require=bool(os.environ.get("DATABASE_URL")),  # Fly에서만 SSL 강제
    )
}
```
Fly의 Managed Postgres는 `DATABASE_URL`을 이미 secret으로 넣어줬기 때문에 이걸 읽기만 하면 됩니다.

Static: WhiteNoise
Fly는 기본적으로 Nginx가 없음 →  
👉 Django가 직접 static 파일을 서빙해야 함

그래서 WhiteNoise 사용.

`MIDDLEWARE`에서 `SecurityMiddleware` 바로 아래에: 위치 중요
```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware", # 여기에 추가
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
```
반드시 SecurityMiddleware 바로 아래

그리고 아래도 추가/확인:
```python
STATIC_URL = "static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",  
]

STATIC_ROOT = BASE_DIR / "staticfiles"
```

Procfile 만들기: vscode 터미널에 입력
```bash
printf "web: gunicorn mysite.wsgi:application --bind 0.0.0.0:8080\n" > Procfile
```
	프로젝트 폴더명이 mysite가 아니라면 그 이름으로 바꿔야 해요. (wsgi.py 있는 폴더명)

의미:
- web 서비스
- gunicorn으로 실행
- wsgi 진입점 = `mysite/wsgi.py`
- 8080 포트로 실행

로컬에서 체크
```bash
python manage.py check
```

결과
```bash
(Django_first2) (.venv) youjung@DESKTOP-PJCRMMU:~/Django_first2$ uv pip freeze > requirements.txt
(Django_first2) (.venv) youjung@DESKTOP-PJCRMMU:~/Django_first2$ printf "web: gunicorn mysite.wsgi:application --bind 0.0.0.0:8080\n" > Procfile
```
✔ `requirements.txt` → uv 기준으로 정상 생성됨  
✔ `Procfile` → gunicorn 엔트리포인트 정상  
✔ Fly App 생성 + Postgres 연결 완료  
✔ `DATABASE_URL` secret 설정됨  
✔ `WhiteNoise` middleware 위치 수정 완료

---
Dockerfile은 말 그대로 이 Django 앱을 실행하는 서버를 만드는 설명서입니다.

프로젝트 루트에서 Dockerfile 열기
```bash
nano Dockerfile
```

Dockerfile을 requirements.txt 방식으로 바꾸기
```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /code

# psycopg 빌드/런타임에 필요한 패키지(안전)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# requirements 먼저 복사(캐시 효율)
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 코드 복사
COPY . /code/

# 정적파일 모으기(Whitenoise 사용할 거라 추천)
RUN python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["sh", "-c", "gunicorn mysite.wsgi:application --bind 0.0.0.0:8080"]
```

Ctrl + O
enter
Ctrl + X  이렇게 저장하고 빠져나옵니다.

- Python 버전 고정
- 패키지 설치
- 코드 복사
- static 파일 수집
- gunicorn 실행

---
fly.toml
```
internal_port = 8000
```

배포!
```bash
flyctl deploy
```

Fly가 하는 일:
1. Dockerfile로 이미지 빌드
2. 서버에 업로드
3. 컨테이너 실행
4. gunicorn 실행
5. 공개 URL 생성

배포 후 DB 마이그레이션 (필수)
```bash
flyctl ssh console -C "python manage.py migrate"
```

관리자 계정 만들려면:
```bash
flyctl ssh console 
python manage.py createsuperuser
exit
```

접속
```bash
https://django-first2.fly.dev/
https://django-first2.fly.dev/admin/
```

