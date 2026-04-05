### 📊 Grafana 개요
Grafana는  
시스템에서 수집된 데이터를 그래프로 시각화해서 보여주는 대시보드 도구입니다.

### 왜 사용하는가?
서버는 원래 이렇게 숫자만 쌓입니다
```
요청 수: 120  
응답 시간: 0.23초  
에러: 3건
```
Grafana를 사용하면
```
📈 요청 수 증가 그래프  
📉 응답 시간 변화 그래프  
🚨 에러 발생 추이
```
즉, 숫자를 사람이 이해할 수 있는 그림으로 바꿔주는 도구입니다.

### Grafana로 이런 것들을 볼 수 있습니다:
```
📊 초당 요청 수 (RPS)
⏱️ 응답 속도 (Latency)
❌ 에러 발생률 (5xx)
💾 메모리 사용량
🔥 트래픽 증가 추이
```
즉 서버 상태를 눈으로 바로 파악이 가능합니다.


그라파나 설치를 위한 수정 범위
- `docker-compose.yml`

---
### 그라파나 연동을 위한 환경 셋팅

전체 구조
```
사용자 요청
   ↓
Django (web)
   ↓
DB (Postgres)

+ 백그라운드 처리
Celery + Redis

+ AI 처리
FastAPI

+ 모니터링
Prometheus → Grafana
```

docker-compose파일에 그라파나 연동을 추가합니다.
`backend/docker-compose.yaml`
```yaml
version: "3.9"

services:
  db:
    image: ankane/pgvector:v0.5.1
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
      - .env.dev
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
      - .env.dev
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

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus-server
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - web
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana-server
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    networks:
      - app-network

volumes:
  product_review_postgres_data:

networks:
  app-network:
    driver: bridge
```

동일 네트워크 사용
```yaml
networks:
  - app-network
```
모든 서비스에 위의 내용이 있어야 합니다.

위 docker-compose 에서는 모든 서비스가 app-network를 사용합니다.
그중 모니터링 흐름과 직접 관련 있는 서비스는
- `web`
- `prometheus`
- `grafana`
입니다.

이 3개가 같은 네트워크에 있어야 아래 통신이 가능합니다.
- Prometheus → `web:8000`
- Grafana → `prometheus:9090`

---
### Grafana 컨테이너 추가

`backend/docker-compose.yml` : services 안의 `prometheus` 밑에 추가
```yaml
grafana:
  image: grafana/grafana:latest
  container_name: grafana-server
  restart: always
  ports:
    - "3000:3000"
  networks:
    - app-network
```

왜 이렇게 추가하는가? 모니터링 구조는 반드시 이 흐름입니다:
```
Django (/metrics 제공)
        ↓
Prometheus (데이터 수집)
        ↓
Grafana (그래프로 시각화)
```
즉 역할이 완전히 나뉘어 있습니다

|구성요소|역할|
|---|---|
|Django|메트릭 제공 (`/metrics`)|
|Prometheus|메트릭 수집 + 저장|
|Grafana|그래프 화면|
도커에서 어떻게 연결되는가? 도커에서는 컨테이너끼리 이렇게 통신합니다:
```
서비스명:포트

web:8000 → Django  
prometheus:9090 → Prometheus  
grafana:3000 → Grafana
```
이게 제일 중요합니다

### depends_on을 쓰는 이유
`prometheus:`는 web과 연결하고 grafana:는 prometheus와 연결되는 구조로 만들어줍니다.
```yaml
depends_on:
  - prometheus
```
의미:
```
Grafana는 Prometheus가 먼저 떠야 정상 작동함

Prometheus → 먼저 실행  
Grafana → 그 다음 실행
```

---
### 각 서비스 역할
1️⃣ web (Django)
```yaml
web:
  command: python manage.py runserver 0.0.0.0:8000
```
역할
- API 서버 (DRF)
- 사용자 요청 처리
- `/metrics` 제공 (Prometheus가 긁어감)
- 메인 서버 (API + 데이터 처리 중심)
브라우저에서 보면
```
http://localhost:8000/metrics
```
하지만 Prometheus는 이렇게 접근합니다:
```
http://web:8000/metrics
```

---
2️⃣ prometheus (데이터 수집)
```yaml
prometheus:
  image: prom/prometheus:latest
```
역할
- Django `/metrics` 데이터를 주기적으로 수집
- 시간 흐름에 따라 저장

핵심 설정 (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: "django"
    static_configs:
      - targets: ["web:8000"]
```
의미:
```
Prometheus야  
web 컨테이너의 8000번으로 가서  
/metrics 데이터를 계속 가져와라
```

---
3️⃣ grafana (시각화)
```yaml
grafana:
  image: grafana/grafana:latest
```
역할
- Prometheus 데이터를 그래프로 표시
- 그래프로 보여주는 UI 서버

---
### Grafana가 Prometheus에 연결되는 이유
Grafana는 데이터를 직접 수집하지 않습니다.
대신 Prometheus에게 물어봅니다:
```
“데이터 좀 줘”
```

그래서 Grafana 설정에서 이렇게 입력합니다:
```
http://prometheus:9090
```
의미:
```
Grafana → Prometheus 컨테이너에게 요청
```
---
전체 흐름 한 번에 이해하기
```
1️⃣ Django
→ /metrics 제공

2️⃣ Prometheus
→ web:8000 접근해서 데이터 수집

3️⃣ Grafana
→ prometheus:9090 접근해서 데이터 가져옴

4️⃣ 사용자
→ http://localhost:3000 접속해서 그래프 확인
```
---
Docker 재빌드
```bash
cd backend  
docker compose up -d --build
```

서버 실행
```bash
docker compose up -d 
```

Grafana 접속
```
http://127.0.0.1:3000
```

로그인
```
아이디: admin  
비밀번호: admin
```
---
### Prometheus를 Grafana에 연결하는 가이드
`admin / admin`이 Grafana의 기본 관리자 계정이라서 보안상 위험하다고 경고가 나오는데 연습하는 과정이니 skip을 하여 넘겨도 됩니다.

로그인후 화면과 같이 클릭합니다.
![[Pasted image 20260404103932.png]]

Prometheus를 클릭합니다.
![[Pasted image 20260404105410.png]]

Name 그대로
![[Pasted image 20260404112222.png]]

docker-compose에서 이 두 서비스 이름이 중요합니다.
```yaml
prometheus:
  image: prom/prometheus:latest

grafana:
  image: grafana/grafana:latest
```
여기서 서비스명이 각각
- `prometheus`
- `grafana`
이기 때문에, Grafana 설정 화면의 Prometheus URL은 아래처럼 작성합니다.
![[Pasted image 20260404105648.png]]
Grafana 설정:
```
http://prometheus:9090
```
의미:
```
서비스명 prometheus = Grafana URL의 host 부분  
포트 9090 = Prometheus 컨테이너 내부 포트
```

Authentication method
```
No Authentication
```

TLS settings
```
전부 체크 안 함
```

Advanced settings
```
기본값 유지  
지금 단계에서는 바꾸지 않습니다
```

그 다음 맨 아래
```
Save & test
```
눌러서 성공 메시지 확인
![[Pasted image 20260404112625.png]]

Django metrics 확인
```bash
curl http://127.0.0.1:8000/metrics
```
![[Pasted image 20260404112745.png]]
메트릭 글자들이 보이면 정상

Prometheus 확인
```
http://127.0.0.1:9090
```
---
### Explore (테스트 단계)
Explore는 Grafana에서 데이터가 잘 들어오는지 확인하는 테스트 화면입니다.

Explore ← 클릭
![[Pasted image 20260404114941.png]]

code를 클릭하여 확인하는 방법
Code는 Prometheus 쿼리(PromQL)를 직접 입력하는 방식입니다.  
즉, 실제 쿼리 문법을 작성하여 데이터를 조회합니다.
![[Pasted image 20260404115257.png]]

###### 현재값은 up = 1 이며 
| 값   | 의미                   |
| --- | -------------------- |
| 1   | 정상 (서버 살아있음 + 통신 가능) |
| 0   | 비정상 (서버 죽음 or 접근 불가) |

builder를 클릭하여 확인하는 방법
Builder는 쿼리를 직접 쓰지 않고 클릭으로 만드는 방식입니다.  
즉, 메트릭과 조건을 선택하면 Grafana가 자동으로 쿼리를 생성해줍니다.
![[Pasted image 20260404115732.png]]

---
`Django → Redis → Celery → FastAPI → PostgreSQL` 라인이 바로 핵심 관찰 라인
그러나 지금 상태는 Prometheus가 Django(web)만 보고 있습니다.  
`prometheus.yml`도 현재 `targets: ["web:8000"]` 만 들어가 있어서, 지금은 장고 메트릭만 수집하는 구조입니다.

그런데 AI 기능 병목을 보려면 FastAPI 쪽에서 적어도 이것들은 봐야 합니다.

- FastAPI 서버가 살아있는가
- AI 추론 요청이 몇 번 들어오는가
- 응답 시간이 얼마나 걸리는가
- 에러가 나는가

즉 FastAPI도 `/metrics`를 노출하게 하고, Prometheus가 그것도 긁어가게 해야 합니다.
지금 프로젝트 구조에서 핵심 병목 후보는 AI 연동 구간입니다.
```
브라우저
   ↓
Django
   ↓
Celery / 직접호출
   ↓
FastAPI
```
그래서 이제는 Prometheus가 FastAPI도 함께 수집해야 합니다.

추가구조
```
Prometheus
   ├── web:8000      (Django)
   └── fastapi:8001  (FastAPI)
```
즉,
- Django 상태 확인
- FastAPI 상태 확인
- AI 요청 처리 속도 확인
- AI 서버 에러 여부 확인

이 4가지를 같이 볼 수 있게 만드는 단계입니다.

---
### FastAPI 모니터링 추가

추가 수정 범위
- `ai-server/requirements.txt`
- `ai-server/main.py`
- `backend/prometheus/prometheus.yml`
- `backend/docker-compose.yml`

---
### FastAPI에 metrics 라이브러리 추가
FastAPI는 기본적으로 Django처럼 `/metrics`가 자동 제공되지 않습니다.  
그래서 메트릭 노출용 라이브러리를 직접 추가해야 합니다.

`ai-server/requirements.txt`
```
prometheus-fastapi-instrumentator
```

이 라이브러리의 역할:
- FastAPI 요청 수 수집
- 응답 시간 수집
- 상태 코드별 요청 수 수집
- `/metrics` 엔드포인트 제공

즉, FastAPI 서버도 Prometheus가 읽을 수 있는 형식으로 숫자를 보여주게 만드는 도구

### FastAPI main.py에 /metrics 추가
`ai-server/main.py`
```python
# [유지] 기본 라이브러리 import
import json

# [유지] 로깅 모듈
import logging  

# [유지] FastAPI 관련 import
from api.recommend import router as recommend_router
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

# ✅ [추가] Prometheus 메트릭 수집 라이브러리
from prometheus_fastapi_instrumentator import Instrumentator


# ================================
# ✅ [추가] 로거 설정
# ================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# [유지] logger 객체 생성
logger = logging.getLogger(__name__)


# ================================
# [유지] FastAPI 앱 생성
# ================================
app = FastAPI(title="AI Recommendation Server")


# [유지] Redis 설정
REDIS_URL = "redis://redis:6379/0"


# [유지] 라우터 등록
app.include_router(recommend_router)


# ================================
# [유지] 기본 루트 API
# ================================
@app.get("/")
def root():
    return {"message": "AI server is running"}


# ================================
# [유지] WebSocket 엔드포인트
# ================================
@app.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):

    # [추가] WebSocket 연결 로그
    logger.info(f"[WS CONNECT] task_id={task_id}")

    await websocket.accept()

    # [유지] Redis 연결
    redis = Redis.from_url(REDIS_URL)
    pubsub = redis.pubsub()
    channel_name = f"task_result_{task_id}"

    # [추가] Redis 구독 시작 로그
    logger.info(f"[REDIS SUBSCRIBE] channel={channel_name}")

    await pubsub.subscribe(channel_name)

    try:
        async for message in pubsub.listen():

            # [유지] 메시지 타입 필터링
            if message["type"] != "message":
                continue

            raw_data = message["data"]

            # [유지] bytes → 문자열 변환
            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode("utf-8")

            # [추가] Redis 메시지 수신 로그
            logger.info(f"[REDIS RECEIVE] task_id={task_id}")

            # [유지] JSON 파싱
            data = json.loads(raw_data)

            # [추가] WebSocket 전송 로그
            logger.info(f"[WS SEND] task_id={task_id} status={data.get('status')}")

            # [유지] 클라이언트로 데이터 전송
            await websocket.send_json(data)

            # [유지] 1회성 처리 후 종료
            break

    # [유지] WebSocket 종료 처리
    except WebSocketDisconnect:
        # [추가] 클라이언트 종료 로그
        logger.warning(f"[WS DISCONNECT] task_id={task_id}")

    except Exception as e:
        # [추가] 에러 로그 (stack trace 포함)
        logger.exception(f"[WS ERROR] task_id={task_id} error={str(e)}")

    finally:
        # [추가] 정리 작업 로그
        logger.info(f"[WS CLEANUP] task_id={task_id}")

        # [유지] Redis 구독 해제
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis.close()

        # [유지] WebSocket 종료 (예외 방지)
        try:
            await websocket.close()
        except Exception:
            pass


# ================================
# [추가] Prometheus 메트릭 설정
# ================================
Instrumentator(
    excluded_handlers=["/metrics", "/docs", "/openapi.json"]  # [추가] 불필요 endpoint 제외
).instrument(app).expose(app, endpoint="/metrics")  
# [추가] /metrics 노출
```

`backend/prometheus/prometheus.yml`
```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "django"
    static_configs:
      - targets: ["web:8000"]

  # 추가
  - job_name: "fastapi"
    metrics_path: /metrics
    static_configs:
      - targets: ["fastapi:8001"]
```
- job_name: "fastapi"
	Prometheus 안에서 이 수집 대상을 `fastapi`라는 이름으로 관리하겠다는 뜻입니다.
- `targets: ["fastapi:8001"]`
	도커 네트워크 안에서 `fastapi` 컨테이너의 8001 포트로 접속하겠다는 뜻입니다.
```
Prometheus야,  
fastapi 컨테이너 8001번에 가서  
/metrics 데이터를 주기적으로 수집해라
```

`backend/docker-compose.yml` : 위치에 맞게 수정합니다.
```yaml
prometheus:
  image: prom/prometheus:latest
  container_name: prometheus-server
  restart: always
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  # ✅ [수정] fastapi 추가
  depends_on:
    - web
    - fastapi

  networks:
    - app-network
```
docker-compose 수정 (지금 한 것)은 
```yaml
depends_on:  
- fastapi
```
이부분 입니다. 즉 프로메티우스에서 fast api를 추가한 것입니다.
web은 DRF이고 fastapi를 추가한겁니다.

---
1️⃣ main.py에 /metrics 추가
2️⃣ docker-compose 수정  
3️⃣ prometheus.yml 수정  
4️⃣ 재빌드
```bash
docker compose up -d --build
```

### API 실제 호출 테스트
브라우저:
```
http://127.0.0.1:8001/docs
```

아래와 같이 테스트 해봅니다.
![[screencapture-127-0-0-1-8001-docs-2026-04-04-14_19_48 1.png]]

fast api /metrics 확인
```
http://127.0.0.1:8001/metrics
```
![[Pasted image 20260404142245.png]]

![[Pasted image 20260404142340.png]]

✔ `8001` 접속됨  
✔ `/metrics` 나옴  
✔ Prometheus `up = 1`  
✔ API 호출 시 metrics 증가
👉 이 4개면 완벽

Data sources를 클릭하면 기존에 연결한 프로메티우스가 보입니다.
![[Pasted image 20260404143327.png]]

연동된 프로메티우스로 들어갑니다.
![[Pasted image 20260404143409.png]]

django와 fastapi가 연동된것을 확인합니다.
![[Pasted image 20260404143555.png]]