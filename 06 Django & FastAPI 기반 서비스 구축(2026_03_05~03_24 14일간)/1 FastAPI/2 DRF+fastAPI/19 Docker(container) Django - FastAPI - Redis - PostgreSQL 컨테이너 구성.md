### Docker 컨테이너 구조를 만드는 이유

우리가 지금 하고 있는건 하나의 프로그램을 만드는 게 아니라  
여러 개의 프로그램이 함께 동작하는 시스템을 만들고 있습니다.

예를 들어 현재 구조는 이렇게 나뉘어 있습니다.
```
Django      → 웹 서비스 (사용자 화면)
Celery      → 백그라운드 작업 처리
Redis       → 작업 큐 (중간 전달자)
FastAPI     → AI 분석 서버
PostgreSQL  → 데이터 저장소
```
즉, 하나의 앱이 아니라 팀 처럼 여러 프로그램이 협력하는 구조입니다.

### 기존 문제 (왜 불편했냐)
	기존 구조는 이런 상태였습니다:
```
Docker 안:
- Django
- Celery
- Redis
- PostgreSQL

로컬 PC:
- FastAPI
```

이게 왜 문제냐면…

❌ 문제 1: 주소 문제 (127.0.0.1)
- Docker 안에서 `127.0.0.1` = 자기 자신
- 그런데 FastAPI는 밖(로컬)에 있음
    
그래서 Celery가 FastAPI를 못 찾는 문제가 발생

---
❌ 문제 2: 실행 순서 문제
- Django 실행됨
- Celery 실행됨
- 그런데 FastAPI 안 켜짐
    
그럼 Celery 작업 실패

---
❌ 문제 3: 환경마다 다르게 동작
- 내 컴퓨터에서는 됨
- 팀원 컴퓨터에서는 안됨
- 배포 서버에서는 또 다름
    
실무에서는 이거 매우 치명적입니다

---
그래서 해결 방법 = Docker로 전부 묶는다
모든 프로그램을 같은 환경(Docker) 안에 넣습니다.
```
web      → Django
celery   → 작업 처리
redis    → 큐
db       → DB
fastapi  → AI 서버
```

이제 이렇게 됩니다:
```
모든 서비스 = 같은 네트워크 안
```

### 이런 방식이 좋은 이유
✅ 주소 문제 해결
```
http://fastapi:8001  
http://db:5432  
http://redis:6379
```
`127.0.0.1` 안 씀  
서비스 이름으로 접근

✅ 실행 한 번으로 전체 시스템 실행
```bash
docker compose up -d
```
Django + Celery + Redis + FastAPI + DB 전부 실행됨

환경 통일 (🔥 매우 중요)
- 내 컴퓨터
- 팀원 컴퓨터
- 배포 서버
👉 전부 같은 환경

✅ 실무 구조와 동일
실무에서는 거의 100% 이렇게 구성합니다:
```
웹 서버 / 워커 / AI 서버 / DB / 캐시  
→ 전부 컨테이너로 분리
```
---
전체 흐름 : 이 구조를 하나의 흐름으로 보면 이렇게 됩니다
```
사용자 → Django → Celery → Redis → Celery Worker → FastAPI → DB
```
👉 쉽게 말하면:
1. 사용자가 요청
2. Django가 받음
3. 이거 오래 걸림 → Celery에 맡김
4. Celery가 FastAPI 호출
5. FastAPI가 AI 분석
6. 결과를 DB에 저장

---
### 역할은 다음과 같이 나뉩니다.

Django (web)
- 사용자 요청 처리
- 리뷰 등록 / 상품 조회
- AI 분석 작업 등록
- 결과 조회 API 제공
    
Celery (worker)
- 백그라운드 작업 실행
- Redis 큐에서 작업 가져오기
- FastAPI 호출
- 결과 저장
    
Redis
- Celery broker
- Celery result backend
    
FastAPI
- AI 모델 로딩
- 임베딩 생성
- 유사도 계산
- 추론 결과 반환
    
PostgreSQL
- 사용자 / 상품 / 리뷰 / AI 결과 저장

---
FastAPI Dockerfile 만들기
```bash
cd ~/product-review-service/ai-server
touch Dockerfile
```

`ai-server/Dockerfile`
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

설명
- `WORKDIR /app` : 컨테이너 안 작업 폴더
- `COPY requirements.txt .` : 패키지 목록 복사
- `RUN pip install ...` : 패키지 설치
- `COPY . .` : FastAPI 코드 전체 복사
- `EXPOSE 8001` : FastAPI 포트 오픈
- `CMD ...` : 컨테이너 시작 시 FastAPI 실행

Django backend Dockerfile 이미 작성했습니다.
`backend/Dockerfile` 
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
```
이 파일은 Django web과 Celery가 공통으로 사용할 수 있습니다.

`backend/docker-compose.yml` : 이제 완전 컨테이너 구조로 수정합니다.
```yml
version: "3.9"

services:
  db:
    image: postgres:16
    container_name: product_review_postgres
    restart: always
    environment:
      POSTGRES_DB: product_review_db
      POSTGRES_USER: product_review_user
      POSTGRES_PASSWORD: product_review_password
    ports:
      - "5433:5432"
    volumes:
      - product_review_postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7
    container_name: redis-server
    restart: always
    ports:
      - "6379:6379"
    networks:
      - app-network

  web:
    build: .
    container_name: drf-web
    command: python manage.py runserver 0.0.0.0:8000
    restart: always
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db
      - redis
    networks:
      - app-network

  celery:
    build: .
    container_name: celery-worker
    command: celery -A mysite worker --loglevel=info --pool=solo
    restart: always
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      - db
      - redis
      - web
      - fastapi
    networks:
      - app-network

  fastapi:
    build:
      context: ../ai-server
    container_name: fastapi-server
    command: uvicorn main:app --host 0.0.0.0 --port 8001
    restart: always
    volumes:
      - ../ai-server:/app
    ports:
      - "8001:8001"
    networks:
      - app-network

volumes:
  product_review_postgres_data:

networks:
  app-network:
    driver: bridge
```
핵심 수정 포인트
- `fastapi` 서비스 추가
- `.env` 값이 Docker 내부 서비스명 기준으로 동작하도록 맞추기
- DB host도 `127.0.0.1`이 아니라 `db`
- Redis도 `redis`
- FastAPI도 `fastapi`
---
`backend/.env` 수정
```
# PostgreSQL
DB_NAME=product_review_db
DB_USER=product_review_user
DB_PASSWORD=product_review_password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# FastAPI
FASTAPI_BASE_URL=http://fastapi:8001
```
이제 Docker 내부에서는 서비스명으로 접근해야 하므로 아래처럼 바꿉니다.

`backend/mysite/settings.py`에서 환경변수를 읽도록 되어 있어야 합니다.
```python
import os

DB_NAME = os.getenv("DB_NAME", "product_review_db")
DB_USER = os.getenv("DB_USER", "product_review_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "product_review_password")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": DB_NAME,
        "USER": DB_USER,
        "PASSWORD": DB_PASSWORD,
        "HOST": DB_HOST,
        "PORT": DB_PORT,
    }
}

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
```

그리고 FastAPI 호출용 서비스 코드에서도 아래처럼 환경변수를 읽어야 합니다.
```python
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL", "http://fastapi:8001")

FASTAPI_BASE_URL = env(
    "FASTAPI_BASE_URL",
    default="http://fastapi:8001"
)
```

`backend/mysite/celery.py` 파일 확인
```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

app = Celery("mysite")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

`backend/mysite/__init__.py` 파일 확인
```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```
---
`requirements.txt`를 정확히 분리하지 않으면 문제가 발생됩니다.

`1.` 배포 이미지가 불필요하게 커집니다
FastAPI 서버는 추론만 하면 되는데 Django, DRF, psycopg2까지 설치하면  
이미지 크기가 커지고 빌드 시간도 늘어납니다.

`2.` 장애 원인 파악이 어려워집니다
예를 들어 FastAPI 컨테이너 에러인데 Django 관련 패키지까지 깔려 있으면  
이 서버가 정확히 무슨 역할인지가 흐려집니다.

`3.` 보안 점검 범위가 불필요하게 넓어집니다
안 써도 되는 패키지가 많으면 취약점 점검 대상도 늘어납니다.

`4.` 모니터링/운영 관점에서 역할 분리가 약해집니다

실무에서는 보통 이렇게 봅니다.
- web 컨테이너: Django 앱
- worker 컨테이너: Celery worker
- fastapi 컨테이너: 모델 추론
- redis: 큐
- db: 저장소
    
그런데 패키지가 제대로 분리되어 있지 않으면 서버 역할이 불명확해집니다.

혹시 가상환경이 확인결과 섞여 있다면 아래와 같이 현재 가상환경 위치를 확인하여 requirements.txt를 다시 설치해야 합니다.

backend 쪽 확인
```bash
cd ~/product-review-service/backend  
pwd  
which python  
which pip  
echo $VIRTUAL_ENV  
ls -a
```

예상결과 : 아래와 같이 나오면 정상입니다.
```bash
/home/youjung/product-review-service/backend
/usr/bin/python
/home/youjung/.local/bin/pip
```

ai-server 쪽 확인 : 여기도 같은 방식으로 확인합니다.
```bash
cd ~/product-review-service/ai-server  
pwd  
which python  
which pip  
echo $VIRTUAL_ENV  
ls -a
```

예상결과
```bash
/home/youjung/product-review-service/ai-server
/usr/bin/python
/home/youjung/.local/bin/pip
```

먼저 활성화된 가상환경을 먼저 끄기
```bash
deactivate
```

기존 가상환경 삭제
이제 폴더별로 `.venv`를 지웁니다.
```bash
# backend 가상환경 삭제
cd ~/product-review-service/backend  
rm -rf .venv

cd ~/product-review-service/ai-server  
rm -rf .venv
```

삭제 확인:
```bash
ls -a
```

새 가상환경 만들기
```bash
cd ~/product-review-service/backend
uv venv
source .venv/bin/activate

python --version  
python -m pip --version  
which python  
which pip
```

FastAPI `ai-server/requirements.txt`  최종 정리
```requirements
fastapi
uvicorn[standard]
requests
python-dotenv
pydantic
numpy
scikit-learn
sentence-transformers
torch
transformers
```

backend requirements 설치
```bash
cat requirements.txt

uv pip install --upgrade pip 
uv pip install -r requirements.txt
```

backend 설치 후 점검
```bash
python manage.py check
```

실행하여 최종 확인
```bash
python manage.py runserver
```

---
ai-server(FastAPI) 새 가상환경 만들기
```bash
deactivate

cd ~/product-review-service/ai-server
uv venv
source .venv/bin/activate

python --version  
python -m pip --version  
which python  
which pip
```

Django `backend/requirements.txt` 최종 정리
```requirements
Django==6.0.3
django-environ==0.13.0
djangorestframework==3.17.0
djangorestframework-simplejwt==5.5.1

celery==5.6.2
redis==7.3.0
kombu==5.6.2
billiard==4.2.4
vine==5.1.0
amqp==5.3.1

psycopg2-binary==2.9.11
pillow==12.1.1
requests==2.32.5
python-dotenv==1.2.2

asgiref==3.11.1
sqlparse==0.5.5
tzdata==2025.3
tzlocal==5.3.1

certifi==2026.2.25
charset-normalizer==3.4.6
idna==3.11
urllib3==2.6.3

click==8.3.1
click-didyoumean==0.3.1
click-plugins==1.1.1.2
click-repl==0.3.0
prompt-toolkit==3.0.52
wcwidth==0.6.0
packaging==26.0
python-dateutil==2.9.0.post0
six==1.17.0
PyJWT==2.12.1
django-environ==0.13.0
```

ai-server requirements 설치
```bash
cat requirements.txt

uv pip install --upgrade pip 
uv pip install -r requirements.txt
```

ai-server 설치 후 점검
```bash
uvicorn main:app --reload --port 8001
```
---
✅ 1. 컨테이너가 떠 있는지 확인 (가장 중요)

Windows PowerShell 또는 CMD 관리자 권한으로 실행 
```
wsl --shutdown
```
또는 이미지와 같이 wsl을 다시 실행
![[Pasted image 20260319185004.png]]

```bash
cd ~/product-review-service
code -r .
```

```bash
docker --version  
docker compose version
```
결과:
```bash
docker compose version
Docker version 27.5.1, build 27.5.1-0ubuntu3~24.04.2
Docker Compose version v2.29.2
```
이게 나와야 정상

프로젝트 폴더 이동 후 컨테이너로 실행
```bash
cd ~/product-review-service/backend
docker compose up -d
```

그리고 상태 확인:
```bash
docker ps
```

Celery 에러 로그 보기
```bash
docker logs celery-worker --tail 100  
docker logs fastapi-server --tail 100
```

web 로그도 확인
```bash
docker exec -it drf-web env | grep DB
```

혹시 파일을 수정했을경우에는 반드시 다시 컨테이너에 재빌드를 해줘야 합니다
```bash
docker compose up --build -d
```

---
Django 접속 확인
```bash
http://localhost:8000
```

FastAPI 접속 확인
```bash
http://localhost:8001/docs
```

Celery 실제 동작 확인 : AI 분석 요청을 한 번 보내보면 됩니다.
```bash
curl -X POST http://localhost:8000/ai/reviews/1/analyze/
```
결과
```bash
{"detail":"AI 분석 작업이 등록되었습니다.","task_id":"fae35d44-ad01-45c1-b26d-48558080ae82","status":"PENDING","review_id":1}
```

정상 흐름
```
Django -> Celery task 등록  
Celery -> FastAPI 호출  
FastAPI -> 응답 반환  
Celery -> DB 저장
```

최종 결과
![[Pasted image 20260319212359.png]]

---
Docker 단계 이후에는 실행 환경이 더 엄격해 집니다.
- Django 컨테이너
- PostgreSQL 컨테이너
- Redis 컨테이너
- FastAPI 컨테이너
- Celery 컨테이너

이때부터는 상단 import가 이런 문제를 만들 수 있습니다.
- 안 쓰는 크롤러까지 import됨
- 특정 사이트 의존성 문제 때문에 전체 명령이 죽음
- 한 사이트 문제로 전체 crawl 명령 실패

예를 들어:
- 지금은 `hwahae`만 `undetected_chromedriver`를 씀
- 그런데 상단 import면 danawa만 돌려도 hwahae import가 실행됨
- 그래서 hwahae 패키지 오류가 danawa까지 막아버림

행 구조에 맞게 “import 방식”은 바꿨어야 합니다.
- 실행 안정성
- 의존성 분리
- 사이트별 독립성

`backend/apps/crawling/services/crawl_service.py`
```python
from apps.crawling.services.save_service import save_review_result


def crawl_product_review_target(target, review_limit: int = 20) -> dict:
    """
    product target에 대해 사이트별 리뷰 collector를 실행하고 저장합니다.
    """

    if target.site == "danawa":
        from apps.crawling.collectors.danawa_review_collector import DanawaReviewCollector
        collector = DanawaReviewCollector()

    elif target.site == "hwahae":
        from apps.crawling.collectors.hwahae_review_collector import HwahaeReviewCollector
        collector = HwahaeReviewCollector()

    elif target.site == "glowpick":
        from apps.crawling.collectors.glowpick_review_collector import GlowpickReviewCollector
        collector = GlowpickReviewCollector()

    else:
        raise ValueError(f"지원하지 않는 사이트입니다: {target.site}")

    reviews = collector.collect_reviews(target.url, limit=review_limit)
    save_result = save_review_result(target, reviews)

    return {
        "review_count": save_result["review_count"],
        "created_count": save_result["created_count"],
        "updated_count": save_result["updated_count"],
    }
```
이 구조의 장점은:
- danawa일 때 danawa만 import
- hwahae일 때만 hwahae import
- glowpick일 때만 glowpick import

즉 지연 import(lazy import)로 바꿔야 합니다.
다시 말해서 12번 단계에서는 사이트별 collector를 상단 import해도 큰 문제가 없었지만, 19번 이후 Docker 기반 멀티서비스 환경으로 전환되면서 특정 collector의 의존성 문제가 전체 크롤링 명령을 막을 수 있었습니다. 이를 방지하기 위해 `crawl_service.py`에서 사이트별 collector를 함수 내부에서 지연 import하도록 수정하였습니다.

---
## 1) 기본 위치

항상 먼저 여기로 이동:

cd ~/product-review-service/backend

---

## 2) 컨테이너 실행 / 재빌드

처음 실행:

docker compose up -d

코드/패키지/Dockerfile 변경 후:

docker compose up -d --build

상태 확인:

docker compose ps

로그 보기:

docker compose logs -f web  
docker compose logs -f celery  
docker compose logs -f fastapi  
docker compose logs -f redis  
docker compose logs -f db

---

## 3) Django 명령어 전부 교체

### 기존 로컬 방식 → Docker 방식

python manage.py check

→

docker compose exec web python manage.py check

python manage.py shell

→

docker compose exec web python manage.py shell

python manage.py migrate

→

docker compose exec web python manage.py migrate

python manage.py makemigrations

→

docker compose exec web python manage.py makemigrations

python manage.py showmigrations

→

docker compose exec web python manage.py showmigrations

python manage.py createsuperuser

→

docker compose exec web python manage.py createsuperuser

python manage.py collectstatic

→

docker compose exec web python manage.py collectstatic --noinput

---

## 4) 크롤링 명령어도 전부 교체

python manage.py test_crawl

→

docker compose exec web python manage.py test_crawl

python manage.py scheduled_crawl --limit 3

→

docker compose exec web python manage.py scheduled_crawl --limit 3

---

## 5) 테스트/관리용 자주 쓰는 명령어

superuser 생성:

docker compose exec web python manage.py createsuperuser

DB shell 대신 Django shell:

docker compose exec web python manage.py shell

앱 체크:

docker compose exec web python manage.py check

마이그레이션:

docker compose exec web python manage.py makemigrations  
docker compose exec web python manage.py migrate

---

## 6) Postgres 직접 접속도 Docker 기준

docker compose exec db psql -U product_user -d product_db

컨테이너 이름 직접 쓸 때는:

docker exec -it product_review_postgres psql -U product_user -d product_db

---

## 7) Celery / FastAPI 확인

Celery 로그:

docker compose logs -f celery

FastAPI 로그:

docker compose logs -f fastapi

Redis 로그:

docker compose logs -f redis

---

## 8) 앞으로의 원칙

이제부터는:

- 코드 수정: VSCode
- 서버 실행: Docker
- manage.py 명령: Docker
- 크롤링 테스트: Docker
- superuser 생성: Docker

즉, **로컬에서 `python manage.py ...`는 쓰지 않는 걸로 통일**하면 돼.

---

## 9) 편하게 쓰는 alias 추천

`~/.bashrc` 에 추가:

alias dc='docker compose'  
alias dj='docker compose exec web python manage.py'

적용:

source ~/.bashrc

그러면 이렇게 짧게 가능:

dj check  
dj shell  
dj migrate  
dj createsuperuser  
dj test_crawl  
dj scheduled_crawl --limit 3

---

## 10) superuser 생성 명령 최종본

cd ~/product-review-service/backend  
docker compose exec web python manage.py createsuperuser