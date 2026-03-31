### Docker 컨테이너 구조를 만드는 이유

우리가 지금 하고 있는건 하나의 프로그램을 만드는 게 아니라 여러 개의 프로그램이 함께 동작하는 시스템을 만들고 있습니다.

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
`127.0.0.1`은 쉽게 말하면 나 자신 즉, 지금 내가 서 있는 바로 이 컴퓨터라는 뜻입니다.
내 컴퓨터에서 실행중인 서버는 8001번 서버입니다.
그러나 Docker 컨테이너 안에서 `127.0.0.1:8001` 그 컨테이너 자기 자신 안의 8001번 서버입니다. 같은 숫자여도 보는 위치가 다르면 의미가 달라집니다.

로컬에서 Django와 FastAPI를 둘 다 직접 실행하면 보통 이렇게 하죠.
- Django: `127.0.0.1:8000`
- FastAPI: `127.0.0.1:8001`

이 상태에서는 잘 됩니다.  
왜냐하면 둘 다 내 컴퓨터 안에 있기 때문입니다.

그런데 Docker로 Django와 Celery를 띄우면 이야기가 달라집니다.
예를 들어 Celery가 Docker 안에 있고,  
FastAPI는 내 컴퓨터 바깥 로컬에서 따로 켜져 있다고 해봅시다.
```
내 실제 컴퓨터 (Host)
│
├── Docker 컨테이너 A (Django)
├── Docker 컨테이너 B (Celery)
├── Docker 컨테이너 C (Redis)
│
└── (밖) FastAPI (내 컴퓨터에서 그냥 실행)
```
그런데 자기 안에는 FastAPI가 없습니다. FastAPI는 컨테이너 밖에 있기 때문입니다.

그래서 결과는:
- 연결 실패
- timeout
- connection refused가 납니다.

그래서 각 역할별로 컨테이너를 나누는 것이 원칙에 가깝습니다.
```
Django → 컨테이너 1개  
Celery → 컨테이너 1개  
FastAPI → 컨테이너 1개  
Redis → 컨테이너 1개  
DB → 컨테이너 1개
```

| 서비스     | 역할                |
| ------- | ----------------- |
| Django  | 사용자 요청 처리 (웹/API) |
| Celery  | 백그라운드 작업          |
| FastAPI | AI 처리             |
| Redis   | 큐                 |
| DB      | 데이터 저장            |
Docker에 컨테이너에 담으면 포트는 이렇게 됩니다.
```
내 컴퓨터 (Host)
│
├── 컨테이너1 → Django (8000)
├── 컨테이너2 → FastAPI (8001)
├── 컨테이너3 → Redis (6379)
├── 컨테이너4 → Celery
├── 컨테이너5 → DB (5432)
```

- 여러 서비스를 하나의 명령어로 동시에 실행하여 운영을 단순화할 수 있습니다.
- 각 서비스가 동일한 네트워크 안에서 실행되기 때문에, `127.0.0.1`이 아닌 서비스 이름(`fastapi`, `db`, `redis`)으로 서로를 안정적으로 찾을 수 있습니다.
- 개발 환경, 팀원 환경, 배포 환경을 동일하게 맞출 수 있어 내 컴퓨터에서는 되는데 다른 곳에서는 안 되는 문제를 방지할 수 있습니다.
- 서비스별로 컨테이너를 분리함으로써 장애 발생 시 특정 서비스만 재시작하거나 확장할 수 있어 유지보수와 운영이 훨씬 수월해집니다.

---
❌ 문제 2: 실행 순서 문제
만약 도커에 Django와 Celery가 있고 fast api는 도커 밖에 있을 경우 실행되었을때
상황
- Django → Docker 안에서 실행
- Celery → Docker 안에서 실행
- FastAPI → `uvicorn`으로 따로 실행 이 경우는 FastAPI를 먼저 켜두는 게 안전합니다.

왜냐하면 처리순서가 있기 때문입니다.
- 사용자가 Django에 요청
- Django가 Celery에게 작업 시킴
- Celery가 FastAPI 호출
- 그런데 FastAPI가 아직 안 켜져 있으면 실패

즉, Celery는 실행만 되어 있다고 바로 문제는 아니고, 실제 작업을 수행하는 순간 FastAPI가 필요합니다. Celery가 일을 시작했는데, 그때 FastAPI가 준비되지 않으면 작업이 실패할 수 있습니다.
그래서 모든 서비스를 Docker 컨테이너로 만들어 한꺼번에 관리하는 것이 가장 안정적이고 실무적인 방식입니다
한꺼번에 도커에서 관리하면 실행 순서에 대한 문제 해결이 됩니다.
```bash
docker compose up -d
```

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

---
docker-compose.yml 개념
`docker-compose.yml` 파일은 여러 개의 컨테이너를 한 번에 실행하고 연결해주는 설정 파일입니다. 쉽게 설명하면 이 프로젝트에 필요한 서버들을 어떻게 띄울지 적어둔 실행 설명서입니다.

이 파일이 하는 일
- 어떤 컨테이너를 사용할지 정의합니다 (Django, Celery, FastAPI, Redis, DB)
- 각 컨테이너를 어떤 포트로 실행할지 설정합니다
- 컨테이너끼리 어떻게 연결할지 설정합니다
- 환경변수(.env)를 어떻게 적용할지 지정합니다

`backend/docker-compose.yml` : 이제 완전 컨테이너 구조로 수정합니다.
```yml
version: "3.9"

services:

  # 1️⃣ DB 먼저 (가장 먼저 준비되어야 함)
  db:
    image: postgres:16
    container_name: product_review_postgres
    restart: always
    environment:
      POSTGRES_DB: product_review_db        # DB 이름
      POSTGRES_USER: product_review_user    # 사용자
      POSTGRES_PASSWORD: product_review_password  # 비밀번호
    ports:
      - "5433:5432"                         # 외부5433 → 내부5432
    volumes:
      - product_review_postgres_data:/var/lib/postgresql/data  # 데이터 저장
    networks:
      - app-network

  # 2️⃣ Redis (Celery가 사용할 큐)
  redis:
    image: redis:7
    container_name: redis-server
    restart: always
    ports:
      - "6379:6379"                         # Redis 기본 포트
    networks:
      - app-network

  # 3️⃣ Django (웹 서버)
  web:
    build: .
    container_name: drf-web
    command: python manage.py runserver 0.0.0.0:8000  # 서버 실행
    restart: always
    volumes:
      - .:/app                                # 코드 동기화
    ports:
      - "8000:8000"
    env_file:
      - .env                                  # 환경변수 적용
    depends_on:
      - db                                    # DB 먼저 필요
      - redis                                 # Redis 먼저 필요
    networks:
      - app-network

  # 4️⃣ FastAPI (AI 서버)
  fastapi:
    build:
      context: ../ai-server
    container_name: fastapi-server
    command: uvicorn main:app --host 0.0.0.0 --port 8001  # AI 서버 실행
    restart: always
    volumes:
      - ../ai-server:/app
    ports:
      - "8001:8001"
    networks:
      - app-network

  # 5️⃣ Celery (가장 마지막, 모든 서비스 필요)
  celery:
    build: .
    container_name: celery-worker
    command: celery -A mysite worker --loglevel=info --pool=solo  # 작업 실행
    restart: always
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      - db        # DB 필요
      - redis     # 큐 필요
      - web       # Django 필요
      - fastapi   # AI 서버 필요
    networks:
      - app-network


# 🔽 DB 데이터 영구 저장
volumes:
  product_review_postgres_data:


# 🔽 컨테이너끼리 통신하는 내부 네트워크
networks:
  app-network:
    driver: bridge
```

실행 흐름은 이렇게 보시면 됩니다
```
db → redis → web → fastapi → celery
```
특히 중요한 포인트
- DB, Redis 먼저 준비
- Django 실행
- FastAPI 실행
- 마지막에 Celery (모든 걸 사용하니까)
의존성이 적은 것부터 먼저, 많이 의존하는 Celery는 마지막에 실행됩니다.

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

backend 쪽 확인(가상환경 활성화 일때)
```bash
cd ~/product-review-service/backend  # backend 폴더로 이동
pwd                                  # 현재 위치 경로 확인
which python                         # 사용 중인 python 실행 경로 확인
which pip                            # 사용 중인 pip 실행 경로 확인
echo $VIRTUAL_ENV                    # 활성화된 가상환경 경로 확인
# /home/youjung/product-review-service/backend/.venv

ls -a                                # 현재 폴더의 모든 파일(숨김파일 포함) 확인 (.venv 존재 여부 확인)
```
비활성화 상태: 시스템 python
활성화 상태: `.venv/bin/python`


ai-server 쪽 확인 : 여기도 같은 방식으로 확인합니다.
```bash
cd ~/product-review-service/ai-server  
pwd  
which python  
which pip  
echo $VIRTUAL_ENV  
ls -a
```

먼저 활성화된 가상환경을 먼저 끄기
```bash
deactivate
```

기존 가상환경 삭제
이제 폴더별로 `.venv`를 지웁니다.
```bash
# 가상환경이 켜져 있다면 종료  
deactivate  
  
# backend 가상환경 삭제  
cd ~/product-review-service/backend  
rm -rf .venv  
ls -a  
  
# ai-server 가상환경 삭제  
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

backend `backend/requirements.txt`  최종 정리
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
pgvector==0.3.6
beautifulsoup4
lxml
gunicorn
boto3
django-storages
django-prometheus
```

backend 순차적으로 실행하여 정검합니다.
```bash
cat requirements.txt  
uv pip install --upgrade pip  
uv pip install -r requirements.txt  
  
python manage.py check  
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

FastAPI 순차적으로 실행하여 정검합니다.
```bash
cat requirements.txt  
uv pip install --upgrade pip  
uv pip install -r requirements.txt  
```

API 동작 확인
```bash
uvicorn main:app --reload --port 8001

# 브라우저에서 주소를 넣어서 확인
http://127.0.0.1:8001/docs
```

---
### Docker가 갑자기 안 될 때만 확인해보는 과정입니다.

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
docker compose up -d # docker-compose.yml에 정의된 모든 서비스가 한 번에 생성
```
- db
- redis
- web (Django)
- fastapi
- celery 총 5개 컨테이너가 생성됩니다
```bash
docker compose up -d
```
실행하면 내부적으로:
1. 이미지 build
2. 컨테이너 생성
3. 컨테이너 실행

도커 상태 확인:
```bash
docker ps
```
결과
```
drf-web  
celery-worker  
fastapi-server  
redis-server  
product_review_postgres
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

중요) 빌드의 위치는 `docker-compose.yml` 파일이 있는 위치의 경로여야 합니다.
우리 프로젝트는 `backend/docker-compose.yml` 파일이 있으므로 반드시 경로를 `cd backend` 로 변경후 `build` 명령어를 적용해야 합니다.

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

행 구조에 맞게 import 방식은 바꿨어야 합니다.
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
### Docker로 넘어가면 “필수 운영 가이드

(1) 기본 위치
항상 먼저 여기로 이동:
```bash
cd ~/product-review-service/backend
```
왜냐하면 docker-compose.yml파일이 backend안에 있기 때문입니다.

---
(2) 컨테이너 실행 / 재빌드

기존 실행명령어는 아래와 같았지만
```bash
python manage.py runserver

uvicorn main:app --reload --port 8001
```

앞으로 실행 명령어는 이렇게 바뀝니다.
```bash
docker compose up -d
```

코드/패키지/Dockerfile등이 변경되면 항상 빌드를 해줘야 합니다.
```bash
docker compose up -d --build
```

상태 확인:
```bash
docker compose ps
```

로그 보기:
```bash
docker compose logs -f web  
docker compose logs -f celery  
docker compose logs -f fastapi  
docker compose logs -f redis  
docker compose logs -f db
```

---
(3) Django 명령어 전부 교체
Docker 환경에서는 모든 Django 명령을 컨테이너 내부에서 실행합니다 

예를 들어
❌ 잘못된 방식 (로컬)
```bash
python manage.py migrate
```

⭕ 올바른 방식 (Docker)
```bash
docker compose exec web python manage.py migrate
```

##### Django 명령어 실행 방식 (전체 변경)
| 기존 (로컬)                          | Docker 방식                                                        |
| -------------------------------- | ---------------------------------------------------------------- |
| python manage.py check           | docker compose exec web python manage.py check                   |
| python manage.py shell           | docker compose exec web python manage.py shell                   |
| python manage.py migrate         | docker compose exec web python manage.py migrate                 |
| python manage.py makemigrations  | docker compose exec web python manage.py makemigrations          |
| python manage.py showmigrations  | docker compose exec web python manage.py showmigrations          |
| python manage.py createsuperuser | docker compose exec web python manage.py createsuperuser         |
| python manage.py collectstatic   | docker compose exec web python manage.py collectstatic --noinput |

크롤링 명령어 실행 방식
```
docker compose exec web python manage.py test_crawl  
docker compose exec web python manage.py scheduled_crawl --limit 3
```

---
### 자주 사용하는 관리 명령어

관리자 생성  
```bash
docker compose exec web python manage.py createsuperuser  
```
  
Django shell  
```bash
docker compose exec web python manage.py shell
```  
  
앱 상태 체크  
```bash
docker compose exec web python manage.py check 
``` 
  
마이그레이션  
```bash
docker compose exec web python manage.py makemigrations  
docker compose exec web python manage.py migrate
```

---
PostgreSQL 접속 (Docker 기준)

docker compose 기준  
```bash
docker compose exec db psql -U product_user -d product_db 
``` 
  
컨테이너 이름 직접 사용  
```bash
docker exec -it product_review_postgres psql -U product_user -d product_db
```

---
### 서비스 로그 확인

Celery 로그  
```bash
docker compose logs -f celery  
```
  
FastAPI 로그  
```bash
docker compose logs -f fastapi
```  
  
Redis 로그  
```bash
docker compose logs -f redis
```

---
### 운영 원칙 (중요)
앞으로 작업 방식은 아래처럼 통일합니다
- 코드 수정 → VSCode
- 서버 실행 → Docker
- Django 명령 → Docker
- 크롤링 테스트 → Docker
- 관리자 생성 → Docker

즉,
❌ 로컬 실행 금지
```
python manage.py runserver  
python manage.py migrate
```

⭕ Docker 기준으로만 실행

---
### 편의성 향상 (alias 설정)

alias는 명령어를 줄여서 쓰는 별명입니다
원래 명령어: 너무 김 ❌
```bash
docker compose exec web python manage.py migrate
```

alias를 쓰면: 짧고 편함 ⭕
```bash
dj migrate
```

그래서 이 코드 의미 
```bash
alias dc='docker compose'  
alias dj='docker compose exec web python manage.py'  
alias dlog='docker compose logs -f'
```

앞으로는 아래와 같이 사용하겠다는 의미입니다.
```bash
dc up -d 
```
아래와 같은 의미
```bash
docker compose up -d
```

적용: 바로 적용됨 (재부팅 필요 없음)
```bash
source ~/.bashrc
```

적용되면 바로 이렇게 사용할수 있습니다.
```bash
dc up -d # 서버 실행  
dj migrate # DB 적용  
dj createsuperuser # 관리자 생성  
dlog web # 로그 확인
```

(실무 최소 alias 추천)
```bash
# dc (도커 실행/관리)
dc up -d  
dc down  
dc ps  
dc up -d --build

# dj (Django 명령 전용)
dj migrate  
dj makemigrations  
dj createsuperuser  
dj shell  
dj check

# dlog (로그 확인) 디버깅할 때 필수
dlog web  
dlog celery  
dlog fastapi  
dlog redis
```
---
superuser 생성 (최종 명령)
```bash
cd ~/product-review-service/backend  
docker compose exec web python manage.py createsuperuser
```
---
### 1️⃣ 반드시 rebuild 해야 하는 경우

① requirements.txt 변경
```
redis 추가  
torch 버전 변경
```
이유:  
Docker는 빌드할 때만 pip install 실행됨

실행:
```bash
dc up -d --build
```
---
② Dockerfile 변경
```
RUN apt-get install ...  
ENV ...
```
이유:  
이미지 자체가 바뀜

---
③ docker-compose.yml 변경
```yml
ports:  
environment:  
depends_on:
```
이유:  
컨테이너 설정이 바뀜

---
④ .env (환경변수) 변경
```
DB_HOST=...  
FASTAPI_BASE_URL=...
```
이유:  
컨테이너 실행 환경이 바뀜

---
### 2️⃣ rebuild 안 해도 되는 경우

① Python 코드 수정
```
views.py  
tasks.py  
services.py
```
이유:
- 볼륨 마운트 되어 있음
- 바로 반영됨

---
② HTML / JS / CSS 수정
```
templates/  
static/
```
바로 반영 ⭕

---
③ Django 로직 변경
```
serializer.py  
model 로직
```
rebuild 필요 없음

---
⚠️ 예외 (헷갈리는 부분)

❗ 모델 변경 + 마이그레이션
```
dj makemigrations  
dj migrate
```
rebuild ❌  
DB 작업만 하면 됨

---
🔥 실무 기준 판단법 (진짜 중요)

이렇게 생각하면 100% 맞습니다:
```
pip install이 필요하면 → rebuild 즉 requirements.txt 건드림 → rebuild 
서버 설정 바뀌면 → rebuild  
그 외 → rebuild 필요 없음
```

---
한 줄 핵심
설치/환경 바뀌면 rebuild, 코드만 바뀌면 그냥 실행