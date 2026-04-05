현재 방식은 리뷰를 가져와 매번 FastAPI에서 계산하지만, 데이터가 많아지면 성능이 저하됩니다. 이를 해결하기 위해 PostgreSQL의 확장 기능인 pgvector를 사용하여 DB 레벨에서 고속 벡터 검색을 수행하도록 개편합니다.

pgvector는 PostgreSQL의 확장 기능으로 벡터(숫자 배열) 간 거리 계산 + 유사도 검색 기능입니다. 

PostgreSQL는 우리가 단순히 데이터를 저장을 하는 기능으로 알고 있지만 데이터를 저장 + 검색 + 계산까지 해주는 프로그램입니다. 단순히 저장이 아니라
```
1. 저장한다  
2. 꺼낸다  
3. 조건으로 찾는다  
4. 계산한다
```
이런것을 처리할수 있습니다.


아래의 내용은 DB 공통 언어인 SQL이고 거의 모든 DB에서 사용하는 공통 언어입니다
1️⃣ 저장
<<<<<<< HEAD
```sql
=======
```
>>>>>>> 82f033a31524b140768822535221c3427a9b47f3
INSERT INTO review (content) VALUES ('좋아요');
```
데이터 넣기

---
2️⃣ 검색
<<<<<<< HEAD
```sql
=======
```
>>>>>>> 82f033a31524b140768822535221c3427a9b47f3
SELECT * FROM review WHERE product_id=1;
```
조건으로 찾기

---
3️⃣ 계산
<<<<<<< HEAD
```sql
=======
```
>>>>>>> 82f033a31524b140768822535221c3427a9b47f3
SELECT COUNT(*) FROM review;
```
개수 계산

---
4️⃣ 정렬
<<<<<<< HEAD
```sql
=======
```
>>>>>>> 82f033a31524b140768822535221c3427a9b47f3
SELECT * FROM review ORDER BY created_at DESC;
```
최신순 정렬

여기까지가 기본 DB입니다.

우리가 초반에 사용했던 SQLite도 기본 위의 기능이 가능합니다. 그러나 
동시 처리 (Concurrency)
- 여러 명이 동시에 쓰면 느림
- 파일 기반 DB라서
Django 개발용 사용할수 있지만
서비스용 ❌ 비추입니다.

그런데 PostgreSQL은 더 강력합니다.
```
PostgreSQL은 계산을 엄청 잘하는 DB입니다.
```

---
#### PostgreSQL 확장은 기본 DB 기능으로 부족할 때, 특정 기능을 추가하는 것
###### 대표적인 확장들
| 확장               | 기능       |
| ---------------- | -------- |
| pgvector         | AI 벡터 검색 |
| PostGIS          | 지도(GPS)  |
| full-text search | 검색엔진     |
| JSONB            | JSON 처리  |
1️⃣ pgvector → AI / 추천 / 유사도
이런 상황이면 사용
```
- 문장 유사도 비교  
- 리뷰 추천  
- 상품 추천  
- 챗봇 검색 (RAG)
```
예:
```
"이 리뷰랑 비슷한 리뷰 찾아줘"
```
사용 이유:
```
의미 기반 검색 필요  
→ 숫자 벡터 비교 필요
```

---
2️⃣ PostGIS → 지도 / 위치 기반 서비스
```
- 맛집 지도  
- 주변 매장 찾기  
- 거리 계산
```
예:
```
"내 주변 1km 안 카페 보여줘"
```
사용 이유:
```
위도/경도 + 거리 계산 필요
```

---
3️⃣ full-text search → 검색 기능: 보통 데이터가 많아질수록 훨씬 유리
```
- 게시글 검색  
- 블로그 검색  
- 상품 검색
```
예:
```
"수분크림 추천"
```
사용 이유:
```
키워드 기반 검색 (LIKE보다 훨씬 빠름)
```

각 검색기능의 차이점
- JS 내부 검색
    - 이미 화면에 내려온 데이터 안에서만 검색
    - 작은 목록에는 간단하고 빠름
    - 데이터가 많으면 브라우저가 다 받아야 해서 비효율적
- 쿼리스트링 + 일반 DB 검색
    - 예: `?q=크림`
    - 보통 `icontains`, `LIKE` 검색
    - 간단하지만 큰 데이터에서 느려질 수 있음
- PostgreSQL full-text search
    - DB가 검색용 방식으로 색인해서 찾음
    - 게시글, 상품, 문서가 많을수록 유리
    - 정렬, 관련도 점수도 가능
작은 리스트는 JS 검색도 충분  
큰 데이터, 서버 검색, 검색 품질이 중요하면 full-text search가 유리

### full-text search 사용방법
보통 바꾸는 파일은 이 정도입니다.

`models.py` : 검색 대상 필드 정의
```python
class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
```

`views.py` : 검색 로직 작성
```python
from django.contrib.postgres.search import SearchVector, SearchQuery

products = Product.objects.annotate(
    search=SearchVector("name", "description")
).filter(search=SearchQuery("수분크림"))
```

`serializers.py`
```python
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
```

`urls.py` : 검색 API 연결
```python
path("products/search/", ProductSearchAPIView.as_view())
```

`settings.py` : PostgreSQL 관련 앱 추가가 필요한 경우 있음
```python
INSTALLED_APPS = [
    ...
    "django.contrib.postgres",
]
```

---
4️⃣ JSONB → 유연한 데이터 구조
```
- 구조가 자주 바뀌는 데이터  
- API 응답 저장  
- 로그 저장
```
예:
```
{
  "user_action": "click",
  "device": "mobile"
}
```
사용 이유:
```
테이블 구조 변경 없이 데이터 저장
```

JSONB가 하는 일
PostgreSQL 안에 JSON 형태 데이터를 그대로 저장하고,  
그 안의 키를 기준으로 조회/필터링할 수 있게 해줍니다.

예를 들어
```json
{
  "device": "mobile",
  "browser": "chrome",
  "clicked": true
}
```
이걸 JSONB 필드에 저장해두고,
```sql
metadata->>'device' = 'mobile'
```
이런 식으로 DB에서 검색 가능

시리얼라이저 역할은:
- 요청 데이터 검증
- 타입 체크
- 필수값 확인
- 응답 형태 정리

JSONB 역할은:
- DB에 유연한 JSON 구조 저장
- DB 내부에서 JSON 키 조회

즉,
- Serializer = API 입구에서 검증
- JSONB = DB 저장 방식
서로 역할이 다릅니다.


### JSONB 사용방법

`models.py` : JSONField 추가
```python
from django.db import models

class EventLog(models.Model):
    event_name = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict)
```

`views.py` 또는 `services.py` : JSON 내부 키로 검색
```python
EventLog.objects.filter(metadata__device="mobile")
```

`serializers.py` : JSON 응답/입력 처리
```python
class EventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventLog
        fields = "__all__"
```

`urls.py` : API 연결

즉, PostgreSQL은
```
플러그인 끼우듯 기능 확장 가능한 DB입니다.
```

PostgreSQL 기능을 쓴다고 해서  
특별한 새 파일이 꼭 생기는 건 아닙니다.

보통은 기존 Django 파일에서 처리합니다:
- `models.py` → 어떤 데이터 구조로 저장할지
- `views.py` → 검색/조회 로직
- `serializers.py` → API 입출력 검증/응답
- `urls.py` → 라우팅
- `settings.py` → postgres 관련 앱/설정 추가
이런 파일들을 통해 로직을 작성하고 셋팅하는 작업으로 이런 확장기능을 적용할수 있습니다.

---
현재 우리 구조는
```
Django → for문 → FastAPI
```
DB는 그냥 저장만 하는 구조로 설계되어 있습니다.

pgvector 구조로 변경하면
```
Django → DB에게 요청  
→ DB가 유사도 계산  
→ 결과 반환
```
이렇게 DB가 일을 대신 해줍니다.

즉 이런 구조기능을 적용할수 있습니다.
```
PostgreSQL (기본 DB)  
       +  
pgvector (AI 기능)
```

pgvector는 AI 유사도 계산을 DB에서 빠르게 처리해서 속도 + 확장성 + 비용을 모두 개선하는 기술입니다.

기존 (for문 + FastAPI 반복 호출)
```
리뷰 1개  
→ for문  
→ FastAPI 20번 호출  
→ 하나씩 비교
```
문제:
- 느림 (네트워크 왕복)
- 서버 부하 큼
- 확장 불가

pgvector 방식
```
리뷰 → 임베딩 1번 생성  
→ DB에 저장  
→ DB에서 TOP 3 바로 검색
```
특징:
- 요청 1번
- DB 내부 계산
- 즉시 결과

###### 성능차이를 보면
|데이터 수|기존 방식|pgvector|
|---|---|---|
|100개|빠름|빠름|
|1,000개|느려짐|빠름|
|10,000개|매우 느림|매우 빠름|
|1,000,000개|거의 불가능|가능|
실제로 100배 이상 차이 발생

pgvector의 장점:
- 속도
- 확장성
- 비용 절감
- 구조가 깔끔해짐
```
기존방식:
Django → FastAPI → 반복 호출 → 결과 정리 (처리시간: 2~3초 이상)

변경방식
Django → DB → 끝 (처리시간: 수십 ms 수준)
```

### 변경된 전체 구조
```
[FastAPI] → 임베딩 생성만 담당
[PostgreSQL + pgvector] → 유사도 검색 담당
[DRF + Celery] → 오케스트레이션
```
핵심 변화:
- AI 계산 → FastAPI  
- 유사도 검색 → DB (pgvector)

---
`1.` 인프라 설정: pgvector 설치 (Docker)
기존에는 일반 PostgreSQL 이미지를 사용하고 있었지만 이 상태에서는 벡터 연산(유사도 검색)을 수행할 수 없습니다. 

→ 따라서 PostgreSQL에 벡터 검색 기능을 추가하기 위해 `pgvector` 확장이 포함된 이미지로 변경해야 합니다. 

이를 위해 `docker-compose.yml`에서 사용 중인 PostgreSQL 이미지를 `pgvector`가 포함된 이미지로 교체합니다.

즉, pgvector를 도커에 적용하는 이유는 PostgreSQL 컨테이너 안에 벡터 기능을 포함시키기 위해서입니다

도커에서는 왜 따로 설정해야 하냐면 도커는 독립된 환경(컨테이너)입니다
즉:
- 로컬에 pgvector 설치해도  
    ❌ 컨테이너에는 없음

그래서 하는 것
```yml
image: ankane/pgvector
```
pgvector가 이미 설치된 PostgreSQL 사용 하게 됩니다.

`backend/docker-compose.yml (pgvector 적용)`
```yml
services:
  db:
    image: ankane/pgvector:v0.5.1   # ✅ 변경
    container_name: product_review_postgres
    environment:
      POSTGRES_DB: product_db
      POSTGRES_USER: product_user
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

도커 멍령어 실행시 `docker-compose.yml`이 있는 폴더로 반드시 이동하여 실행해야 합니다.

지금 현재 우리의 구조
```
product-review-service/
│
├── backend/              ← docker-compose.yml 있음 ⭐
│   ├── docker-compose.yml
│   ├── manage.py
│
├── ai-server/
│   ├── .venv
│   ├── main.py
```


실행
```bash
deactivate
cd ~/product-review-service/backend # ⭐ 여기로 이동한후 아래 도커 명령어를 실행합니다.
docker compose down
docker compose up -d
```

---
`2.` Django 모델 수정: 벡터 저장 공간 확보

Django에서 벡터 필드를 다루기 위해 `django-pgvector` 라이브러리를 설치하고, 기존 `ReviewAI`모델에 384차원(e5-small-korean 모델 기준) 벡터 필드를 추가합니다.

Django에 VectorField 추가를 위한 라이브러리 설치 
```
uv pip install pgvector
```

`requirements.txt`
```
pgvector==0.3.6
```
설치한 라이브러리슬 추가합니다.

`backend/mysite/settings.py`
```python
INSTALLED_APPS = [
    ...
    "pgvector.django",  # ✅ 추가
]
```

`backend/apps/ai_gateway/models.py 모델 설계` : 이부분이 핵심입니다.
```python
from django.db import models
from pgvector.django import VectorField
from django.conf import settings


class ReviewEmbedding(models.Model):
    """
    핵심 모델 (Vector DB 역할)
    """

    review = models.OneToOneField(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="embedding"
    )

    # e5-small-korean = 384 차원
    embedding = VectorField(dimensions=384)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ReviewEmbedding(review_id={self.review_id})"
```

왜 따로 모델을 만드는가?
기존
```
Review 테이블에 넣으면 → 무거움 + 책임 혼합
```

변경후
```
Review → 원본 데이터  
ReviewEmbedding → AI 전용 데이터
```
실무에서는 AI 데이터 분리가 기본

중요) 빌드의 위치는 `docker-compose.yml` 파일이 있는 위치의 경로여야 합니다.
우리 프로젝트는 `backend/docker-compose.yml` 파일이 있으므로 반드시 경로를 `cd backend` 로 변경후 `build` 명령어를 적용해야 합니다.

수정한 내용을 Docker 이미지 다시 빌드
```bash
docker compose down  
docker compose build --no-cache web celery  
docker compose up -d
```
---
`3.` FastAPI: (임베딩 API 추가)

FastAPI는 이미 문장을 384차원 벡터(숫자 배열)로 변환하는 기능을 갖추고 있습니다. 이 벡터를 그대로 Django DB에 저장하면 됩니다.
`ai-server/api/recommend.py` 수정합니다.
```python 
@router.post("/embed")
def embed_text(request: EmbeddingRequest):
    vectors = make_embeddings(request.texts)
    return {"embeddings": vectors}
```

실제 fast api에서 받은 결과
```json
{
  "embeddings": [
    [0.12, 0.55, 0.91, ..., 384개 숫자]
  ]
}
```

기존 방식
기존에는 이런 느낌입니다.
```
기준 리뷰 1개  
→ 후보 리뷰 20개  
→ for문  
→ text1, text2 묶어서 FastAPI 20번 호출  
→ 유사도 점수 20개 받음
```

즉,
- FastAPI가 비교까지 담당
- Django가 for문으로 반복 호출
- HTTP 요청이 많이 발생

변경 후 방식
이제는 이렇게 바뀝니다.
```
리뷰 여러 개  
→ 한꺼번에 리스트로 FastAPI에 보냄  
→ 벡터 여러 개 받음  
→ DB에 저장  
→ DB(pgvector)가 내부에서 유사도 비교
```

즉,
- FastAPI는 문장들을 숫자 벡터로 바꾸는 역할만
- PostgreSQL(pgvector)은 저장된 벡터끼리 비교
- Django는 흐름만 제어

다시 말하면:
- 한꺼번에 보내는 것은 텍스트 리스트
- 받아오는 것은 유사도 점수가 아니라 벡터 리스트
- 비교는 FastAPI가 아니라 DB 내부(pgvector) 에서 수행


비교해서 보면 기존
```
[text1, text2] → FastAPI → similarity=0.87  
[text1, text3] → FastAPI → similarity=0.72  
[text1, text4] → FastAPI → similarity=0.65  
...
```

변경 후
```
[text1, text2, text3, text4, ...]  
→ FastAPI  
→ [벡터1, 벡터2, 벡터3, 벡터4, ...]  
```
→ DB 저장  
→ DB에서 벡터1과 가장 가까운 것 TOP 3 검색

---
핵심 차이
비교 위치 변화

기존:
```
Django for문 + FastAPI 반복 호출
```

변경 후:
```
DB(pgvector) 내부 비교
```

예전에는 비교 요청을 여러 번 보냈고,  
이제는 텍스트 여러 개를 한 번에 보내 벡터를 만든 뒤, DB가 내부에서 비교하는 구조입니다.

즉, HTTP 방식은 그대로입니다 하지만 무엇을 보내느냐와 어디서 비교하느냐가 바뀐 것입니다.
요청 데이터 형태
```
# 기존방식
한 번 요청 = 문장 2개  
(text1, text2)  
→ 비교 요청
```

```
변경 후
한 번 요청 = 문장 여러 개  
(text 리스트)  
→ 벡터 생성 요청
```

<<<<<<< HEAD
=======

>>>>>>> 82f033a31524b140768822535221c3427a9b47f3
위의 코드가 수정되었으므로 이부분은 삭제합니다.
```python
# EmbeddingResponse,
```
---
`4.` Django → FastAPI 호출 함수
`backend/apps/ai_gateway/services.py` : 수정
```python
import requests

FASTAPI_URL = "http://fastapi:8001"


class FastAPIClient:

    @staticmethod
    def get_embedding(text: str):
        response = requests.post(
            f"{FASTAPI_URL}/api/v1/recommend/embed",
            json={"texts": [text]},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["embeddings"][0]
```
---
`5.` Celery Task: 벡터 저장 및 검색 로직 고도화 (이부분이 핵심)

비동기 작업 시, FastAPI로부터 받은 임베딩 값을 DB에 저장하고, 유사도 검색 시 DB의 벡터 연산
(`Cosine Distance`)을 사용하도록 수정합니다.

`backend/apps/ai_gateway/tasks.py 수정`
```python
# [역할] Celery 비동기 작업 등록용
from celery import shared_task

# [역할] 작업 시작/종료 시간 저장용
from django.utils import timezone

# [역할] FastAPI 요청 실패 시 재시도 처리용
from requests import RequestException

# [핵심] pgvector 거리 계산 함수
# DB 안에서 embedding 간 코사인 거리 계산할 때 사용
from pgvector.django import CosineDistance

# [역할] 기준 리뷰 / 후보 리뷰 조회용
from apps.reviews.models import Review

# [역할]
# - AIAnalysisTask: 작업 상태 저장
# - ReviewEmbedding: 리뷰별 벡터 저장
# - ReviewSimilarityResult: 유사도 결과 저장
from .models import AIAnalysisTask, ReviewEmbedding, ReviewSimilarityResult

# [역할] FastAPI 임베딩 API 호출용
from .services import FastAPIClient

# [역할] 결과를 Redis Pub/Sub으로 WebSocket에 전달
import redis
import json
import logging


# [역할] 로그 출력기
logger = logging.getLogger(__name__)


def get_similarity_label(score: float) -> str:
    """
    [역할] 점수를 사람이 보기 쉬운 라벨로 변환
    """
    if score > 0.7:
        return "매우 비슷"
    if score > 0.5:
        return "비슷"
    if score > 0.3:
        return "약간 비슷"
    return "관련 있음"


@shared_task(
    bind=True,
    # [역할] FastAPI 통신 에러 발생 시 자동 재시도
    autoretry_for=(RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
    """
    [전체 역할]
    1. 기준 리뷰 조회
    2. 기준 리뷰 임베딩 생성 후 DB 저장
    3. 후보 리뷰 임베딩이 없으면 생성 후 DB 저장
    4. pgvector로 DB 내부 유사도 검색
    5. 결과 저장
    6. Redis publish로 WebSocket 클라이언트에게 알림
    """

    # [역할] 현재 사용하는 임베딩 모델 이름
    MODEL_NAME = "upskyy/e5-small-korean"

    # [역할] 너무 낮은 점수는 결과에서 제외하기 위한 기준값
    SIMILARITY_THRESHOLD = 0.45

    logger.info(f"[START] Task 시작 | task_id={self.request.id} review_id={review_id}")

    # [역할] Redis 연결
    # 작업 완료 후 결과를 publish하기 위해 사용
    redis_client = redis.Redis(
        host="redis",
        port=6379,
        db=0,
        decode_responses=True,
    )

    # [역할] 현재 Task 상태를 DB에 기록
    task_status = AIAnalysisTask.objects.get(task_id=self.request.id)
    task_status.status = AIAnalysisTask.STATUS_STARTED
    task_status.started_at = timezone.now()
    task_status.error_message = ""
    task_status.save(update_fields=["status", "started_at", "error_message"])

    try:
        # ---------------------------------------------------
        # 1) 기준 리뷰 조회
        # ---------------------------------------------------
        source_review = Review.objects.select_related("user", "product").get(
            id=review_id,
            is_public=True,
        )
        logger.info(f"[SOURCE] 기준 리뷰 조회 완료 | review_id={source_review.id}")

        # [예외 처리] 본문이 비어 있으면 분석 불가
        if not source_review.content or not source_review.content.strip():
            raise ValueError("분석할 리뷰 내용이 없습니다.")

        # ---------------------------------------------------
        # 2) 기준 리뷰 임베딩 생성 후 DB 저장
        # ---------------------------------------------------
        # [핵심]
        # FastAPI에 텍스트를 보내서 384차원 벡터를 받아옴
        source_embedding = FastAPIClient.get_embedding(source_review.content)

        # [핵심]
        # ReviewEmbedding 테이블에 기준 리뷰 벡터 저장
        # 이미 있으면 update, 없으면 create
        ReviewEmbedding.objects.update_or_create(
            review=source_review,
            defaults={"embedding": source_embedding},
        )
        logger.info(f"[EMBED] 기준 리뷰 임베딩 저장 완료 | review_id={source_review.id}")

        # ---------------------------------------------------
        # 3) 같은 상품의 다른 리뷰들 조회
        # ---------------------------------------------------
        candidate_reviews = (
            Review.objects
            .select_related("user")
            .filter(
                product=source_review.product,
                is_public=True,
            )
            .exclude(id=source_review.id)
            .order_by("-created_at")[:20]
        )

        candidate_count = candidate_reviews.count()
        logger.info(f"[CANDIDATES] 후보 리뷰 개수={candidate_count}")

        # [역할] 후보 개수도 Task 상태 테이블에 기록
        task_status.candidate_count = candidate_count
        task_status.save(update_fields=["candidate_count"])

        # ---------------------------------------------------
        # 4) 후보 리뷰 임베딩 생성 및 저장
        # ---------------------------------------------------
        # [중요]
        # 여기서의 for문은 "비교"를 위한 for문이 아니라
        # "아직 벡터가 없는 후보 리뷰들에 대해 임베딩을 생성/저장"하기 위한 for문
        for candidate in candidate_reviews:
            # [예외 처리] 빈 본문은 건너뜀
            if not candidate.content or not candidate.content.strip():
                continue

            # [역할] 이미 임베딩이 있으면 재생성하지 않음 (캐싱 효과)
            exists = ReviewEmbedding.objects.filter(review=candidate).exists()
            if exists:
                continue

            # [역할] FastAPI에서 후보 리뷰 임베딩 생성
            candidate_embedding = FastAPIClient.get_embedding(candidate.content)

            # [역할] 후보 리뷰 벡터를 DB에 저장
            ReviewEmbedding.objects.create(
                review=candidate,
                embedding=candidate_embedding,
            )
            logger.info(f"[EMBED] 후보 리뷰 임베딩 생성 | candidate_id={candidate.id}")

        # ---------------------------------------------------
        # 5) pgvector로 유사 리뷰 검색
        # ---------------------------------------------------
        # [핵심]
        # 이제부터는 Python에서 하나씩 비교하는 것이 아니라
        # DB가 embedding 컬럼끼리 코사인 거리를 계산함
        similar_embedding_rows = (
            ReviewEmbedding.objects
            .select_related("review", "review__user")
            .exclude(review_id=source_review.id)
            .filter(review__product=source_review.product)
            # [핵심] DB 내부에서 벡터 거리 계산
            .annotate(distance=CosineDistance("embedding", source_embedding))
            # [핵심] 거리 작은 순 = 더 비슷한 순
            .order_by("distance")[:3]
        )

        results = []

        # ---------------------------------------------------
        # 6) 검색 결과를 점수화하고 결과 테이블에 저장
        # ---------------------------------------------------
        for item in similar_embedding_rows:
            compared_review = item.review

            # [역할]
            # 코사인 거리(distance)를 유사도 점수(score)로 변환
            # distance가 작을수록 비슷하므로 1 - distance 사용
            score = round(float(1 - item.distance), 4)

            # [역할] 기준점보다 낮은 점수는 제외
            if score < SIMILARITY_THRESHOLD:
                continue

            # [역할] 사람이 보기 쉬운 라벨 생성
            similarity_label = get_similarity_label(score)

            # [역할]
            # 유사도 결과 저장
            # 이미 있으면 갱신, 없으면 생성
            saved_result, _ = ReviewSimilarityResult.objects.update_or_create(
                source_review=source_review,
                compared_review=compared_review,
                model_name=MODEL_NAME,
                defaults={
                    "product": source_review.product,
                    "requested_by_id": requested_by_id,
                    "similarity_score": score,
                    "similarity_label": similarity_label,
                    "similarity_threshold": SIMILARITY_THRESHOLD,
                    "source_review_snapshot": source_review.content,
                    "compared_review_snapshot": compared_review.content,
                    "compared_username_snapshot": compared_review.user.username,
                },
            )

            logger.info(
                f"[SAVE] 유사도 저장 | compared_review_id={compared_review.id} score={score}"
            )

            # [역할] 프론트로 바로 보내기 좋은 형태로 결과 정리
            results.append({
                "analysis_id": saved_result.id,
                "review_id": compared_review.id,
                "username": compared_review.user.username,
                "content": compared_review.content,
                "score": score,
                "label": similarity_label,
                "created_at": compared_review.created_at.strftime("%Y-%m-%d %H:%M"),
            })

        # [역할] 점수 높은 순으로 정렬
        results.sort(key=lambda x: x["score"], reverse=True)

        # [역할] 상위 3개만 최종 결과로 사용
        top_results = results[:3]

        # ---------------------------------------------------
        # 7) Task 완료 상태 저장
        # ---------------------------------------------------
        task_status.status = AIAnalysisTask.STATUS_SUCCESS
        task_status.result_count = len(top_results)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "result_count", "finished_at"])

        logger.info(
            f"[SUCCESS] Task 완료 | 결과 수={len(top_results)} task_id={self.request.id}"
        )

        # ---------------------------------------------------
        # 8) 프론트로 보낼 응답 데이터 구성
        # ---------------------------------------------------
        response_data = {
            "source_review": {
                "review_id": source_review.id,
                "username": source_review.user.username,
                "content": source_review.content,
            },
            "similar_reviews": top_results,
            "candidate_count": candidate_count,
            "similarity_threshold": SIMILARITY_THRESHOLD,
            "model_name": MODEL_NAME,
            "task_id": self.request.id,
            "status": "SUCCESS",
        }

        # ---------------------------------------------------
        # 9) Redis Pub/Sub으로 결과 전송
        # ---------------------------------------------------
        # [역할]
        # WebSocket 서버가 이 채널을 구독하고 있다가
        # 프론트 화면에 실시간 전달할 수 있음
        logger.info(f"[REDIS] 결과 publish | channel=task_result_{self.request.id}")

        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(response_data, ensure_ascii=False),
        )

        # [역할] Celery task 반환값
        return response_data

    except Exception as e:
        # ---------------------------------------------------
        # 10) 실패 처리
        # ---------------------------------------------------
        logger.exception(f"[ERROR] Task 실패 | task_id={self.request.id} error={str(e)}")

        task_status.status = AIAnalysisTask.STATUS_FAILURE
        task_status.error_message = str(e)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "error_message", "finished_at"])

        error_data = {
            "task_id": self.request.id,
            "status": "FAILURE",
            "error": str(e),
        }

        # [역할] 실패 결과도 Redis로 전달
        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(error_data, ensure_ascii=False),
        )

        raise
```

핵심 코드 설명
이 줄이 모든 걸 바꿉니다
```python
.annotate(distance=CosineDistance("embedding", embedding))
```
이 코드는 DB가 직접 벡터 거리 계산합니다.

### ❗ 기존 vs 개선 비교
|방식|설명|성능|
|---|---|---|
|기존|Python for문으로 비교|❌ 느림|
|개선|DB에서 벡터 검색|✅ 빠름|
성능차이를 보면
기존 방식은 for문을 통해 `리뷰 10,000개 → 10,000번` 비교합니다.

그러나 변경 이후는 `DB 인덱스 기반 검색 → TOP 3 바로 반환` 실무에서는 이 차이 100배 이상 납니다.

추가
```sql
-- PostgreSQL에서 실행
CREATE INDEX review_embedding_idx
ON app_reviewembedding
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```
이 인덱스는 pgvector의 성능을 극대화하기 위한 핵심 설정입니다.  이것을 해야 진짜 빨라집니다.
해당 SQL은 Django 코드가 아니라 데이터베이스에 직접 실행해야 하는 명령어입니다.

SQL은 Django 코드가 아니라 DB에 직접 실행해야합니다. 그래서 추가 방법은 다음과 같습니다.

1️⃣ DBeaver 사용 (가장 쉬움, 실습/개발 환경 추천) 
DBeaver 사용를 사용하는 겁니다. 가장 쉽고 실무에서 가장 많이 사용합니다. 이부분은 우리가 실습시간에 SQL 테이블 생성 및 수정 방식으로 배웠습니다.

PostgreSQL에 연결된 상태에서 다음 순서로 실행합니다.
- DB 선택 → 우클릭
- SQL Editor → New SQL Script
- 위 SQL 붙여넣기 후 실행 (▶ 버튼)
👉 이 방식은 빠르게 테스트하거나 개발 중 확인할 때 가장 편리합니다.


그러나 우리는 이번에는 Django 정석 방식으로 테이블을 생성해 보도록 하겠습니다.
2️⃣ Django Migration 방식 (실무 권장 ⭐)
Django에서는 DB 구조 변경을 코드로 관리하는 것이 원칙입니다.  
따라서 인덱스 생성도 migration으로 관리하는 것이 가장 Django스러운 방식입니다.

- pgvector Python 패키지 설치 ✅
- pgvector Docker 이미지 사용 ✅
pgvector 이미지를 써도, 보통 아래 SQL을 한 번은 실행해야 합니다
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

PostgreSQL 컨테이너 안으로 들어가기
```bash
docker exec -it product_review_postgres psql -U product_review_user -d product_review_db
```

extension 생성 : 들어가서 아래것을 실행합니다.
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

설치 확인
```sql
\dx
```
여기서 `vector`가 보이면 성공

나오기
```sql
\q
```

먼저 일반 migration 생성
```bash
docker compose exec web python manage.py makemigrations ai_gateway
docker compose exec web python manage.py migrate
```

아래 파일을 경로에 맞게 추가합니다.
`backend/apps/ai_gateway/migrations/0004_add_vector_index.py`
```python
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ai_gateway", "0003_reviewembedding"),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE INDEX review_embedding_idx
            ON ai_gateway_reviewembedding
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS review_embedding_idx;
            """
        ),
    ]
```

인덱스는 `ai_gateway_reviewembedding` 테이블이 만들어진 뒤에 걸어야 하니까,  
`dependencies`는 `ReviewEmbedding`를 생성한 migration 파일명을 써야 합니다.

예를 들어 `makemigrations ai_gateway`를 실행했더니 이런 파일이 생겼다면:
```
0003_reviewembedding.py
```
그럼 인덱스 migration은 반드시 이렇게 해야 한다:
```python
dependencies = [  
    ("ai_gateway", "0003_reviewembedding"),  
]
```
즉, 실제로 생성된 migration 파일명을 보고 맞춰야 한다.


인덱스 migration 적용 : 인덱스 파일 추가 후 실행
```bash
docker compose exec web python manage.py migrate
```

---
전체 흐름 (완성 구조)
```
사용자 클릭
→ Django API
→ Celery Task 실행
→ FastAPI (임베딩 생성)
→ PostgreSQL (vector 검색)
→ 결과 저장
→ WebSocket 알림
→ 프론트 반영
```

수정한 내용을 전체 정리하면
```
- FastAPI는 "계산만"
- DB는 "검색 담당"
- embedding은 반드시 저장 (캐싱)
- 유사도 검색은 DB에서 수행
- Celery는 오케스트레이터
```

---
### 설치 확인 테스트
먼저 DB 확장과 인덱스가 실제로 들어갔는지 확인합니다.

vector extension 확인
```bash
docker exec -it product_review_postgres psql -U product_review_user -d product_review_db
```

들어가서 
```
\dx
```

여기서 `vector`가 보이면 성공입니다.
![[Pasted image 20260321143422.png]]

인덱스 확인
같은 `psql` 안에서:
```sql
\d ai_gateway_reviewembedding
```
![[Pasted image 20260321143521.png]]
위의 이미지와 같이 보이면 성공입니다.

1️⃣ 벡터 컬럼 정상 생성
```
embedding | vector(384)
```
- pgvector 정상 적용됨  
- 차원(384)도 맞음 → 모델(e5-small-korean)과 일치

---
2️⃣ 인덱스 존재 (🔥 가장 중요)
```
"review_embedding_idx" ivfflat (embedding vector_cosine_ops) WITH (lists='100')
```
- 이게 바로 너가 만든 핵심 인덱스  
- `ivfflat + cosine` = 벡터 검색 최적화 완료

---
3️⃣ UNIQUE 제약도 정상
```
review_id_key UNIQUE
```
- 리뷰 1개당 embedding 1개 → 설계 정확함

---
4️⃣ FK 연결도 정상
```
FOREIGN KEY (review_id) REFERENCES reviews_review(id)
```
- Review랑 연결 OK

나오기
```sql
\q
```
---
### 다음으로 데이터 저장 테스트 입니다.
이제 ReviewEmbedding 테이블에 실제 벡터가 저장되는지 확인해야합니다.
Django shell에서 테스트 데이터를 넣어봅니다
```bash
docker compose exec web python manage.py shell
```

우선 데이터가 있는지 먼저 확인합니다.
```python
from apps.reviews.models import Review  
Review.objects.count()
```
테스트용으로 최소한 아래 3개가 필요합니다.
- 사용자 1명
- 상품 1개
- 리뷰 3개 이상

왜냐하면:
- 리뷰 1개만 있으면 유사도 비교 대상이 없음
- 2~3개는 있어야 “TOP 3” 검색이 가능함

User / Product 있는지 확인 : Django shell 안에서
```python
from django.contrib.auth import get_user_model
from apps.products.models import Product

User = get_user_model()

print("User 수:", User.objects.count())
print("Product 수:", Product.objects.count())
```
우리은 테이블 생성을 하여 현재 데이터도 사용자도 없는 상태입니다.

```python
user = User.objects.create_user(
    username="testuser",
    password="1234"
)
print(user)
```

상품 생성 전 필수 확인 
`Product` 모델 필수 필드가 뭔지 알아야 정확히 만들 수 있습니다.
```python
from apps.products.models import Product  
[f.name for f in Product._meta.fields]
```
이 결과를 보면
- 어떤 필드가 필수인지
- `name`, `description`, `price`, `image` 같은 게 필요한지 바로 알수 있습니다.
결과
```
>>> from apps.products.models import Product  
>>> [f.name for f in Product._meta.fields]
['id', 'name', 'description', 'price', 'image', 'created_at']
```
- `name`
- `description`
- `price` 는 거의 확실히 넣어야 하고
- `image`는 보통 비워도 될 가능성이 큽니다.
- `created_at`은 자동 생성

즉 지금은 테스트용 상품 1개 만들고, 그 상품에 리뷰 3개 넣으면 됩니다.

사용자/상품 준비
```python
from django.contrib.auth import get_user_model
from apps.products.models import Product

User = get_user_model()

user = User.objects.first()
print("user:", user)

product = Product.objects.create(
    name="테스트 수분크림",
    description="pgvector 유사도 검색 테스트용 상품",
    price=19900,
)

print("product:", product.id, product.name)
```

리뷰 3개 생성
```python
from apps.reviews.models import Review

test_texts = [
    "보습력이 좋고 촉촉해서 겨울에 쓰기 좋아요.",
    "촉촉하고 수분감이 오래가서 겨울용으로 만족합니다.",
    "건조한 피부에 잘 맞고 보습감이 오래 유지돼요.",
    "흡수도 빠르고 촉촉해서 데일리 크림으로 좋아요.",
    "수분감이 풍부해서 아침 저녁으로 쓰기 괜찮아요.",

    "무난하게 사용할 수 있는 크림이에요.",
    "가격 대비 괜찮은 제품이라고 생각합니다.",
    "피부에 자극 없이 편안하게 발려서 좋아요.",
    "제형이 부드럽고 사용감이 나쁘지 않았어요.",
    "재구매 의사는 조금 더 써보고 결정하려고요.",

    "향이 너무 강해서 저는 별로였어요.",
    "조금 끈적거려서 여름에는 부담스러울 것 같아요.",
    "트러블이 생겨서 저한테는 맞지 않았습니다.",
    "기대했던 것보다 보습력이 부족했어요.",
    "바르고 나면 답답한 느낌이 들어 아쉬웠어요.",
]

created_ids = []

for text in test_texts:
    review = Review.objects.create(
        user=user,
        product=product,
        content=text,
        rating=4,
        is_public=True,
    )
    created_ids.append(review.id)

print("생성된 review ids:", created_ids)
print("총 개수:", len(created_ids))
```
여기서 확인할 것
- `len(embedding)` 결과가 **384**이면 정상
- `ReviewEmbedding` 객체가 생성되면 저장 성공
- `len(obj.embedding)`도 **384**이면 DB 저장 성공

결과
![[Pasted image 20260321153539.png]]
- 리뷰 15개 임베딩 생성 성공
- 384차원 정상
- `ReviewEmbedding` 저장 성공
즉 pgvector 저장 단계는 정상 통과입니다.

임베딩 저장
```python
from apps.reviews.models import Review
from apps.ai_gateway.models import ReviewEmbedding
from apps.ai_gateway.services import FastAPIClient

reviews = Review.objects.filter(product=product).exclude(content="")

for review in reviews:
    embedding = FastAPIClient.get_embedding(review.content)
    obj, created = ReviewEmbedding.objects.update_or_create(
        review=review,
        defaults={"embedding": embedding}
    )
    print("saved:", review.id, "created:", created, "len:", len(embedding))
```

결과
![[Pasted image 20260321153632.png]]
- vector extension ✅
- vector 컬럼 생성 ✅
- ivfflat index 생성 ✅
- embedding 저장 ✅
- embedding 업데이트도 정상 ✅
👉 Vector DB 구축 완료 상태

---
### 유사도 검색 테스트
이제 가장 중요한 테스트입니다.  
DB가 직접 벡터 거리 계산을 해서 TOP 3를 주는지 확인한다.

같은 shell에서:
```python
from pgvector.django import CosineDistance
from apps.ai_gateway.models import ReviewEmbedding

source = ReviewEmbedding.objects.order_by("review_id").first()

same_product_results = list(
    ReviewEmbedding.objects
    .exclude(id=source.id)
    .filter(review__product=source.review.product)
    .annotate(distance=CosineDistance("embedding", source.embedding))
    .order_by("distance")[:5]
)

print("같은 상품 결과 개수:", len(same_product_results))

for r in same_product_results:
    print("review_id:", r.review.id)
    print("distance:", r.distance)
    print("content:", r.review.content)
    print("-" * 50)
```

결과
![[Pasted image 20260321154844.png]]
- 기준 리뷰: `보습력이 좋고 촉촉해서 겨울에 쓰기 좋아요.`
- 1위: `촉촉하고 수분감이 오래가서 겨울용으로 만족합니다.`
    - distance: `0.2524`
    - 의미상 가장 비슷해서 정상
- 2위: `향이 조금 강해서 저는 아쉬웠어요.`
    - distance: `0.6713`
    - 덜 비슷해서 뒤로 가는 것도 정상
즉, 같은 상품 내부에서 벡터 유사도 정렬이 기대대로 동작한 것입니다.

지금 확인된 것
- pgvector extension 적용 성공
- `vector(384)` 컬럼 생성 성공
- `ivfflat` 인덱스 생성 성공
- 임베딩 저장 성공
- 같은 상품 기준 유사도 검색 성공

즉, 기술 검증 완료 상태입니다.

테스트 결과
```
테스트 결과, ReviewEmbedding 테이블에 384차원 임베딩이 정상 저장되었고, pgvector의 CosineDistance를 이용한 유사도 검색도 기대대로 동작하였다. 특히 동일 상품 내 리뷰만 대상으로 필터링했을 때, 기준 리뷰와 의미적으로 가장 유사한 리뷰가 가장 낮은 distance 값으로 반환되는 
것을 확인하였다. 이를 통해 단순 Python 반복 비교가 아니라 PostgreSQL 벡터 검색 기반 Top-N 
추천 구조가 정상적으로 구현되었음을 검증하였다.
```
---
