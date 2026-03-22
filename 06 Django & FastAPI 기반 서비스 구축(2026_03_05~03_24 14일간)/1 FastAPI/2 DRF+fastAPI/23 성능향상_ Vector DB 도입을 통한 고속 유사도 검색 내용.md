현재 방식은 리뷰를 가져와 매번 FastAPI에서 계산하지만, 데이터가 많아지면 성능이 저하됩니다. 이를 해결하기 위해 PostgreSQL의 확장 기능인 pgvector를 사용하여 DB 레벨에서 고속 벡터 검색을 수행하도록 개편합니다.

쉽게 설명하면 현재 구조는 다음과 같습니다.
```
리뷰 1개 → FastAPI → 모든 리뷰 비교 (for문)
👉 O(N) → 데이터 많아지면 느림
```

개선구조는 다음과 같습니다
```
리뷰 → FastAPI → 임베딩 1번 생성
👉 DB(pgvector)에 저장

이후:
👉 DB에서 유사한 벡터 TOP N 검색 (인덱스 사용)
👉 O(log N) 수준으로 개선
```

전체 구조
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

```python
# EmbeddingResponse,
```
위의 코드가 수정되었으므로 이부분은 삭제합니다.

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
from celery import shared_task
from django.utils import timezone
from requests import RequestException

from pgvector.django import CosineDistance

from apps.reviews.models import Review
from .models import AIAnalysisTask, ReviewEmbedding, ReviewSimilarityResult
from .services import FastAPIClient

import redis
import json
import logging


logger = logging.getLogger(__name__)


def get_similarity_label(score: float) -> str:
    if score > 0.7:
        return "매우 비슷"
    if score > 0.5:
        return "비슷"
    if score > 0.3:
        return "약간 비슷"
    return "관련 있음"


@shared_task(
    bind=True,
    autoretry_for=(RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
    """
    기준 리뷰 1개를 기준으로 같은 상품 내 다른 리뷰들과
    pgvector 기반 유사도 검색을 수행한 뒤 결과를 저장하고,
    Redis publish를 통해 WebSocket 클라이언트에 전달한다.
    """
    MODEL_NAME = "upskyy/e5-small-korean"
    SIMILARITY_THRESHOLD = 0.45

    logger.info(f"[START] Task 시작 | task_id={self.request.id} review_id={review_id}")

    redis_client = redis.Redis(
        host="redis",
        port=6379,
        db=0,
        decode_responses=True,
    )

    task_status = AIAnalysisTask.objects.get(task_id=self.request.id)
    task_status.status = AIAnalysisTask.STATUS_STARTED
    task_status.started_at = timezone.now()
    task_status.error_message = ""
    task_status.save(update_fields=["status", "started_at", "error_message"])

    try:
        source_review = Review.objects.select_related("user", "product").get(
            id=review_id,
            is_public=True,
        )

        logger.info(f"[SOURCE] 기준 리뷰 조회 완료 | review_id={source_review.id}")

        if not source_review.content or not source_review.content.strip():
            raise ValueError("분석할 리뷰 내용이 없습니다.")

        # 1) 기준 리뷰 임베딩 생성/저장
        source_embedding = FastAPIClient.get_embedding(source_review.content)

        ReviewEmbedding.objects.update_or_create(
            review=source_review,
            defaults={"embedding": source_embedding},
        )

        logger.info(f"[EMBED] 기준 리뷰 임베딩 저장 완료 | review_id={source_review.id}")

        # 2) 같은 상품의 다른 리뷰들 조회
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

        task_status.candidate_count = candidate_count
        task_status.save(update_fields=["candidate_count"])

        # 3) 후보 리뷰 임베딩이 없으면 생성해서 저장
        for candidate in candidate_reviews:
            if not candidate.content or not candidate.content.strip():
                continue

            exists = ReviewEmbedding.objects.filter(review=candidate).exists()
            if exists:
                continue

            candidate_embedding = FastAPIClient.get_embedding(candidate.content)
            ReviewEmbedding.objects.create(
                review=candidate,
                embedding=candidate_embedding,
            )
            logger.info(f"[EMBED] 후보 리뷰 임베딩 생성 | candidate_id={candidate.id}")

        # 4) pgvector로 유사 리뷰 검색
        similar_embedding_rows = (
            ReviewEmbedding.objects
            .select_related("review", "review__user")
            .exclude(review_id=source_review.id)
            .filter(review__product=source_review.product)
            .annotate(distance=CosineDistance("embedding", source_embedding))
            .order_by("distance")[:3]
        )

        results = []

        # 기존 결과가 중복 저장되지 않게 update_or_create 사용
        for item in similar_embedding_rows:
            compared_review = item.review
            score = round(float(1 - item.distance), 4)

            if score < SIMILARITY_THRESHOLD:
                continue

            similarity_label = get_similarity_label(score)

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

            results.append({
                "analysis_id": saved_result.id,
                "review_id": compared_review.id,
                "username": compared_review.user.username,
                "content": compared_review.content,
                "score": score,
                "label": similarity_label,
                "created_at": compared_review.created_at.strftime("%Y-%m-%d %H:%M"),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        top_results = results[:3]

        task_status.status = AIAnalysisTask.STATUS_SUCCESS
        task_status.result_count = len(top_results)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "result_count", "finished_at"])

        logger.info(
            f"[SUCCESS] Task 완료 | 결과 수={len(top_results)} task_id={self.request.id}"
        )

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

        logger.info(f"[REDIS] 결과 publish | channel=task_result_{self.request.id}")

        redis_client.publish(
            f"task_result_{self.request.id}",
            json.dumps(response_data, ensure_ascii=False),
        )

        return response_data

    except Exception as e:
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
`dependencies`는 **`ReviewEmbedding`를 생성한 migration 파일명**을 써야 한다.

예를 들어 `makemigrations ai_gateway`를 실행했더니 이런 파일이 생겼다면:
```
0003_reviewembedding.py
```
그럼 인덱스 migration은 반드시 이렇게 해야 한다:
```
dependencies = [  
    ("ai_gateway", "0003_reviewembedding"),  
]
```
즉, **실제로 생성된 migration 파일명을 보고 맞춰야 한다.**


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
