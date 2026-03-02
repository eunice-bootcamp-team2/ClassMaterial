좋아요. 이제 **12번 파트 – “수신데이터 저장 및 조회 API 구성 + 간단 모니터링(Prometheus + Grafana)”** 를 완성해볼게요.

이 파트는 **실전 백엔드의 기준점**입니다.

1. FastAPI 앱에서 외부 센서/클라이언트가 데이터를 POST로 보내면 저장
2. 저장된 데이터를 조회하는 API 구축
3. 서비스 상태/트래픽/지연시간 등을 **Prometheus로 수집 → Grafana로 시각화**

> 👉 지금까지 만든 TaskBoard 구조를 유지하면서 확장 가능하게 구성합니다.
> 
> 👉 코드와 설정을 모두 직접 붙여도 실행되게 상세히 작성합니다.

---

### ✅ 1. “수신 데이터” 도메인 정의

단순한 Todo가 아니라 **센서나 외부 시스템이 FastAPI로 보내는 데이터**라고 가정합니다.

예시 도메인: `IncomingData`

|필드|설명|
|---|---|
|id|PK|
|user_id|데이터 소유자|
|source|데이터 출처(sensor_01 / mobile_app 등)|
|payload|JSON 데이터 전체 저장|
|received_at|수신 시각|

---

### ✅ 2. SQLAlchemy ORM 모델 생성

📁 `app/models/incoming_data.py`

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.db import Base

class IncomingData(Base):
    __tablename__ = "incoming_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    source = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
```

📁 `app/models/__init__.py` 에 추가

```python
from app.models.incoming_data import IncomingData
```

---

### ✅ 3. Pydantic 스키마 정의

📁 `app/schemas/incoming_data.py`

```python
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any, Dict

class IncomingDataCreate(BaseModel):
    source: str = Field(..., example="sensor_01")
    payload: Dict[str, Any] = Field(..., example={"temp": 24.5, "humidity": 45})

class IncomingDataRead(BaseModel):
    id: int
    user_id: int | None
    source: str
    payload: dict
    received_at: datetime

    class Config:
        from_attributes = True
```

---

### ✅ 4. 서비스 레이어 작성

📁 `app/services/incoming_data_service.py`

```python
from sqlalchemy.orm import Session
from app.models.incoming_data import IncomingData
from app.schemas.incoming_data import IncomingDataCreate
from app.schemas.users import UserRead

def save_incoming_data(
    db: Session,
    user: UserRead,
    payload: IncomingDataCreate,
) -> IncomingData:

    item = IncomingData(
        user_id=user.id if user else None,
        source=payload.source,
        payload=payload.payload,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def list_incoming_data(
    db: Session,
    user: UserRead,
    source: str | None,
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(IncomingData)
    if user:
        query = query.filter(IncomingData.user_id == user.id)

    if source:
        query = query.filter(IncomingData.source == source)

    return (
        query.order_by(IncomingData.received_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
```

---

### ✅ 5. 라우터 작성

📁 `app/api/routes/incoming_data.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.users import UserRead
from app.schemas.incoming_data import (
    IncomingDataCreate,
    IncomingDataRead,
)
from app.services.incoming_data_service import (
    save_incoming_data,
    list_incoming_data,
)

router = APIRouter()

@router.post(
    "/",
    response_model=IncomingDataRead,
    summary="외부 데이터 수신 API",
)
def receive_data(
    payload: IncomingDataCreate,
    user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return save_incoming_data(db, user, payload)

@router.get(
    "/",
    response_model=list[IncomingDataRead],
    summary="수신 데이터 목록 조회",
)
def get_received_data(
    source: str | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    user: UserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_incoming_data(db, user, source, skip, limit)
```

---

### ✅ 6. `api_router`에 등록

📁 `app/api/router.py`

```python
from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.todos import router as todo_router
from app.api.routes.incoming_data import router as incoming_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(todo_router, prefix="/todos", tags=["Todos"])
api_router.include_router(incoming_router, prefix="/incoming", tags=["Incoming Data"])
```

---

### 🟦 7. 모니터링 도입 – Prometheus & Grafana 연동

FastAPI는 ASGI라서 Prometheus 계측이 매우 쉽습니다.

### 필요한 패키지

```bash
uv add prometheus-fastapi-instrumentator
```

---

### ✅ 8. FastAPI에 Prometheus 수집 엔드포인트 추가

📁 `app/main.py` 수정

```python
from prometheus_fastapi_instrumentator import Instrumentator

@app.on_event("startup")
def start_monitoring():
    try:
        Instrumentator().instrument(app).expose(app, endpoint="/metrics")
        print("Prometheus metrics enabled → GET /metrics")
    except Exception as e:
        print("Prometheus init failed:", e)
```

이렇게 되면:

- `/metrics` ← Prometheus가 읽어가는 엔드포인트 자동 생성
- 요청 지연, 리퀘스트 수, HTTP 상태 분포 등 자동 수집

---

### 👍 9. Prometheus 설정 파일 작성

📁 `prometheus.yml`

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "fastapi"
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:8000"]
```

> Docker 내부에서 FastAPI가 실행 중이라면
> 
> `host.docker.internal` 또는 FastAPI 컨테이너 이름을 사용
> 
> 예: `fastapi:8000`

---

### 🟦 10. Docker Compose 구성 (Prometheus + Grafana)

📁 `docker-compose.yml`

```yaml
version: "3.8"

services:
  fastapi:
    build: .
    container_name: fastapi
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - PYTHONUNBUFFERED=1
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  prometheus:
    image: prom/prometheus
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    container_name: grafana
    ports:
      - "3000:3000"
```

---

### 🟩 11. Grafana에서 대시보드 연결

1. [http://localhost:3000](http://localhost:3000) 접속
2. 로그인 (admin/admin)
3. **Add Data Source → Prometheus**
4. URL: `http://prometheus:9090`
5. Import Dashboard → ID: **FastAPI Prometheus 13047**

그러면 다음 지표를 시각화할 수 있음:

- Request per second
- HTTP status 분포
- p50 / p90 / p99 latency
- Exception count
- Todo 조회량, Incoming Data 수신량

---

### 🟧 12. 간단한 수신 데이터 모니터링 예시

Prometheus는 `/metrics`에서 자동 수집하지만,

원한다면 직접 커스텀 지표도 만들 수 있음.

📁 `app/monitoring/custom_metrics.py`

```python
from prometheus_client import Counter

incoming_data_counter = Counter(
    "incoming_data_received_total",
    "Total number of received data events",
)
```

📁 `routes/incoming_data.py` 에 적용:

```python
from app.monitoring.custom_metrics import incoming_data_counter

@router.post("/")
def receive_data(...):
    incoming_data_counter.inc()
    return save_incoming_data(...)
```

이제 Prometheus는:

```
incoming_data_received_total 125
```

같은 지표를 수집함.

---

### ✅ **12번 파트 요약**

|기능|적용 여부|
|---|---|
|수신 데이터 저장|✔ ORM 기반|
|수신 데이터 조회|✔ 필터링 · 페이지네이션 가능|
|Prometheus + Grafana 모니터링|✔ `/metrics`|
|커스텀 지표|✔ incoming_data_received_total|

이제 이 백엔드는 실제 서비스 수준의 모니터링까지 갖추고 있음.