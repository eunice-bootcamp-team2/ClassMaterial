그 다음 Redis + Celery 붙이기
- 오래 걸리는 AI 작업
- 대량 리뷰 분석
- 배치 임베딩 생성
- 주기적 분석 작업

---
Celery(worker) Redis적용전 속도를 확인하면 아래 이미지와 같습니다.
![[Pasted image 20260319135334.png]]

---
Celery + Redis는 DRF 쪽에 두는 것이 가장 좋습니다. FastAPI는 AI 모델 서빙 전용, DRF는 서비스 오케스트레이션 + DB 저장 + 비동기 작업 관리 역할로 나누는 방식이 가장 안정적입니다.
DRF는 사용자/상품/리뷰/AI 결과 저장을 맡고, FastAPI는 모델 로딩·추론·결과 반환만 담당하도록 잡혀 있습니다.

왜 DRF에 두는 게 더 좋은가 하면, 지금 비동기화하려는 작업의 시작점과 끝점이 둘 다 DRF이기 때문입니다. 

사용자는 DRF 화면이나 DRF API를 통해 요청을 보내고, `ai_gateway`가 FastAPI를 호출하며, 최종 결과는 다시 DRF DB의 `ReviewSimilarityResult` 같은 모델에 저장됩니다. 즉, 작업 큐를 잡아야 하는 위치가 FastAPI 앞이 아니라 DRF와 FastAPI 사이 입니다. 

`ReviewAnalyzeAPIView`가 FastAPI 결과를 받아 DB에 저장하도록 구성되어 있고, 결과 저장 모델도 DRF `ai_gateway` 안에 두는 방향으로 정리되어 있습니다.

### 서버별 역할
- DRF + Celery + Redis
    - 요청 접수
    - 작업 등록
    - 작업 상태 관리
    - 결과 DB 저장
    - 실패 재시도
    - 주기 작업 관리
        
- FastAPI
    - 모델 1회 로딩
    - 임베딩 생성
    - 유사도 계산
    - 추론 결과 반환

### 이 구조의 장점:
첫째, 도메인 데이터가 DRF에 몰려 있습니다.  
리뷰, 상품, 사용자, 크롤링 데이터, 추론 결과가 모두 DRF DB와 연결되어 있으므로 작업의 시작과 종료를 DRF에서 관리하는 것이 자연스럽습니다.

둘째, Celery는 백그라운드 작업 관리에 강하고, FastAPI는 모델 추론에 강합니다.  
FastAPI 안에 Celery를 또 두면 가능은 하지만, 현재 단계에서는 책임이 겹쳐집니다. 그러면 어느 쪽에서 재시도?, 어느 쪽에서 상태 저장?, 어느 쪽에서 작업 ID 관리?가 흐려집니다.

셋째, 확장성이 좋습니다.  
문서에서도 Redis + Celery를 붙일 대상이 오래 걸리는 AI 작업, 대량 리뷰 분석, 배치 임베딩 생성, 주기적 분석 작업이라고 되어 있는데, 이런 작업은 대부분 DRF가 스케줄을 잡고 FastAPI를 호출하는 쪽이 운영하기 편합니다.

### 그렇다면 FastAPI에 Celery를 두는 경우는 언제인가?

FastAPI에도 Celery를 붙일 수는 있습니다. 다만 그건 보통 이런 경우입니다.
- FastAPI가 단순 추론 서버가 아니라 독립 AI 플랫폼일 때
- FastAPI가 자체 DB를 갖고 작업 상태까지 직접 관리할 때
- 모델 추론 외에 전처리/후처리/배치 잡을 전부 AI 서버에서 책임질 때
    
지금 프로젝트는 그 구조가 아닙니다.  
지금은 DRF 서비스 서버 + FastAPI 모델 서버 구조이므로, FastAPI에 Celery를 먼저 두는 건 오히려 복잡도만 올릴 가능성이 큽니다.

---
파일 생성
```bash
cd backend
touch mysite/celery.py
```

`backend/mysite/celery.py` : `[추가]`
```python
# [추가] Django 프로젝트에서 Celery 앱을 등록하는 파일

import os
from celery import Celery

# [추가] Django settings 모듈 지정
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

# [추가] Celery 앱 생성
app = Celery("mysite")

# [추가] Django settings.py의 CELERY_ 접두사 설정값 자동 로드
app.config_from_object("django.conf:settings", namespace="CELERY")

# [추가] INSTALLED_APPS 안의 tasks.py 자동 탐색
app.autodiscover_tasks()
```

`backend/mysite/__init__.py` : `[수정]`
```python
# [수정] Celery 앱을 Django 시작 시 함께 로드

from .celery import app as celery_app

__all__ = ("celery_app",)
```

`backend/mysite/settings.py` : `[수정]`
```python
# ... 기존 import 유지
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================================================
# [추가] Celery + Redis 설정
# =========================================================

# [추가] Redis 주소
# docker-compose 사용 시 보통 redis://redis:6379/0
# 로컬 직접 실행 시 redis://127.0.0.1:6379/0
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

# [추가] Celery broker / backend
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# [추가] 직렬화 포맷
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# [추가] 시간대
CELERY_TIMEZONE = "Asia/Seoul"

# [추가] 작업 결과 만료 시간(1시간)
CELERY_RESULT_EXPIRES = 3600

# [추가] worker가 한 번에 너무 많은 작업을 오래 붙잡지 않도록 설정
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# [추가] 작업 시작 상태 추적
CELERY_TASK_TRACK_STARTED = True

# [추가] 긴 작업 안정성용
CELERY_TASK_TIME_LIMIT = 60 * 10
CELERY_TASK_SOFT_TIME_LIMIT = 60 * 8

# [추가] 테스트/개발 중 eager 모드 쓰고 싶으면 환경변수로 제어 가능
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "False") == "True"
CELERY_TASK_EAGER_PROPAGATES = True
```

`backend/apps/ai_gateway/models.py` : `[수정]`
```python
from django.conf import settings
from django.db import models


class ReviewSimilarityResult(models.Model):
    """
    [유지]
    기존 문서에서 사용하던 AI 유사도 결과 저장 모델
    """

    product = models.ForeignKey(...


class AIAnalysisTask(models.Model):
    """
    [추가]
    Celery 비동기 작업 상태를 DB에서도 확인하기 위한 모델
    """

    STATUS_PENDING = "PENDING"
    STATUS_STARTED = "STARTED"
    STATUS_SUCCESS = "SUCCESS"
    STATUS_FAILURE = "FAILURE"

    STATUS_CHOICES = [
        (STATUS_PENDING, "대기중"),
        (STATUS_STARTED, "진행중"),
        (STATUS_SUCCESS, "완료"),
        (STATUS_FAILURE, "실패"),
    ]

    source_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="ai_analysis_tasks",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_analysis_tasks",
    )

    task_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    model_name = models.CharField(
        max_length=100,
        default="upskyy/e5-small-korean",
    )

    similarity_threshold = models.FloatField(default=0.45)

    candidate_count = models.PositiveIntegerField(default=0)
    result_count = models.PositiveIntegerField(default=0)

    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.task_id} - {self.status}"
```
- `AIAnalysisTask` 모델을 새로 추가
    - Celery 작업 상태를 DB에 저장하려고 만든 테이블입니다.
    - `task_id`, `status`, `candidate_count`, `result_count`, `error_message` 같은 컬럼이 생깁니다.
        
- `ReviewSimilarityResult` 모델도 변경 ?? 확인해봄
    - 이 모델이 기존에 이미 프로젝트에 있다면, 제가 적어드린 코드와 현재 코드가 완전히 같을 때는 추가 마이그레이션이 없을 수도 있습니다.
        
    - 하지만 필드나 제약조건이 다르면 이 부분도 DB 변경으로 잡힙니다.


---
`backend/apps/ai_gateway/admin.py` : `[수정]`
```python
# backend/apps/ai_gateway/admin.py
# [수정] Celery 작업 상태까지 관리자에서 확인 가능하게 등록

from django.contrib import admin
from .models import ReviewSimilarityResult, AIAnalysisTask

# [유지] 목록에서 주요필드
@admin.register(ReviewSimilarityResult)
class ReviewSimilarityResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "source_review",
        "compared_review",
        "similarity_score",
        "similarity_label",
        "model_name",
        "analyzed_at",
    )
    search_fields = (
        "product__name",
        "source_review__content",
        "compared_review__content",
        "compared_username_snapshot",
        "model_name",
    )
    list_filter = (
        "model_name",
        "similarity_label",
        "analyzed_at",
    )
    ordering = ("-analyzed_at",)


# [추가] 비동기 작업 상태를 관리자에서 추적
@admin.register(AIAnalysisTask)
class AIAnalysisTaskAdmin(admin.ModelAdmin):
    
    list_display = (
        "id",
        "task_id",
        "source_review",
        "status",
        "candidate_count",
        "result_count",
        "model_name",
        "created_at",
        "finished_at",
    )
    search_fields = (
        "task_id",
        "source_review__content",
        "model_name",
    )
    list_filter = (
        "status",
        "model_name",
        "created_at",
    )
    ordering = ("-created_at",)
```
---
파일 생성
```bash
touch apps/ai_gateway/tasks.py
```

`backend/apps/ai_gateway/tasks.py` : `[추가]`
```python
# [추가] FastAPI 호출 + 결과 저장을 Celery worker로 분리

from celery import shared_task
from django.utils import timezone
from requests import RequestException

from apps.reviews.models import Review
from .models import ReviewSimilarityResult, AIAnalysisTask
from .services import FastAPIClient


def get_similarity_label(score: float) -> str:
    if score > 0.7:
        return "매우 비슷"
    if score > 0.5:
        return "비슷"
    if score > 0.3:
        return "약간 비슷"
    return "관련 있음"


@shared_task(bind=True, autoretry_for=(RequestException,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
    """
    [추가]
    기준 리뷰 1개를 기준으로 같은 상품 내 다른 리뷰들과 유사도 분석 후
    ReviewSimilarityResult에 저장하는 Celery task
    """
    MODEL_NAME = "upskyy/e5-small-korean"
    SIMILARITY_THRESHOLD = 0.45

    # [추가] task_id 기준으로 상태 레코드 조회
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

        if not source_review.content.strip():
            raise ValueError("분석할 리뷰 내용이 없습니다.")

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

        task_status.candidate_count = candidate_reviews.count()
        task_status.save(update_fields=["candidate_count"])

        results = []

        for candidate in candidate_reviews:
            if not candidate.content.strip():
                continue

            similarity_result = FastAPIClient.get_similarity(
                source_review.content,
                candidate.content,
            )

            score = round(similarity_result["similarity"], 4)

            if score < SIMILARITY_THRESHOLD:
                continue

            similarity_label = get_similarity_label(score)

            saved_result, _ = ReviewSimilarityResult.objects.update_or_create(
                source_review=source_review,
                compared_review=candidate,
                model_name=MODEL_NAME,
                defaults={
                    "product": source_review.product,
                    "requested_by_id": requested_by_id,
                    "similarity_score": score,
                    "similarity_label": similarity_label,
                    "similarity_threshold": SIMILARITY_THRESHOLD,
                    "source_review_snapshot": source_review.content,
                    "compared_review_snapshot": candidate.content,
                    "compared_username_snapshot": candidate.user.username,
                }
            )

            results.append({
                "analysis_id": saved_result.id,
                "review_id": candidate.id,
                "username": candidate.user.username,
                "content": candidate.content,
                "score": score,
                "label": similarity_label,
                "created_at": candidate.created_at.strftime("%Y-%m-%d %H:%M"),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        top_results = results[:3]

        task_status.status = AIAnalysisTask.STATUS_SUCCESS
        task_status.result_count = len(top_results)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "result_count", "finished_at"])

        return {
            "source_review": {
                "review_id": source_review.id,
                "username": source_review.user.username,
                "content": source_review.content,
            },
            "similar_reviews": top_results,
            "candidate_count": candidate_reviews.count(),
            "similarity_threshold": SIMILARITY_THRESHOLD,
            "model_name": MODEL_NAME,
            "task_id": self.request.id,
            "status": "SUCCESS",
        }

    except Exception as e:
        task_status.status = AIAnalysisTask.STATUS_FAILURE
        task_status.error_message = str(e)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "error_message", "finished_at"])
        raise
```
---
`backend/apps/ai_gateway/views.py` : `[수정]` : 기존 동기 분석 뷰를 비동기 작업 등록 + 상태 조회 + 결과 조회 구조로 변경합니다.
```python
from requests.exceptions import RequestException

# [추가] Celery 작업 상태 조회용 import
from celery.result import AsyncResult

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.shortcuts import get_object_or_404
from apps.reviews.models import Review

from .serializers import (
    EmbeddingRequestSerializer,
    SimilarityRequestSerializer,
)

# [유지] FastAPI 직접 호출은 Embedding / Similarity API에서 계속 사용
from .services import FastAPIClient

# [수정] 기존 ReviewSimilarityResult import만 있던 구조에서
#        비동기 작업 상태 저장용 AIAnalysisTask import 추가
from .models import AIAnalysisTask

# [추가] Celery task import
from .tasks import analyze_review_similarity_task


class EmbeddingAPIView(APIView):
    """
    [유지]
    Django -> FastAPI 임베딩 요청
    POST /ai/embed/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmbeddingRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        texts = serializer.validated_data["texts"]

        try:
            result = FastAPIClient.get_embeddings(texts)
            return Response(result, status=status.HTTP_200_OK)

        except RequestException as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )


class SimilarityAPIView(APIView):
    """
    [유지]
    Django -> FastAPI 유사도 요청
    POST /ai/similarity/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SimilarityRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        text1 = serializer.validated_data["text1"]
        text2 = serializer.validated_data["text2"]

        try:
            result = FastAPIClient.get_similarity(text1, text2)
            return Response(result, status=status.HTTP_200_OK)

        except RequestException as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )


# =========================================================
# [삭제]
# 기존 get_similarity_label() 함수는 동기 분석 로직에서만 사용했음
# 이제 실제 유사도 계산/저장 로직은 Celery task(tasks.py)로 이동했으므로
# views.py에서는 더 이상 사용하지 않음
# =========================================================
# def get_similarity_label(score: float) -> str:
#     if score > 0.7:
#         return "매우 비슷"
#     if score > 0.5:
#         return "비슷"
#     if score > 0.3:
#         return "약간 비슷"
#     return "관련 있음"


class ReviewAnalyzeAPIView(APIView):
    """
    [수정]
    기존: GET /ai/reviews/<review_id>/analyze/
          -> View 안에서 FastAPI 직접 호출 + 결과 저장 + 즉시 반환

    변경: POST /ai/reviews/<review_id>/analyze/
          -> Celery 작업만 등록하고 task_id 반환
    """
    permission_classes = [AllowAny]

    def post(self, request, review_id):
        # [유지] 기준 리뷰 존재 여부 먼저 확인
        source_review = get_object_or_404(
            Review.objects.select_related("user", "product"),
            id=review_id,
            is_public=True,
        )

        # [유지] 기준 리뷰 내용이 비어 있으면 에러 반환
        if not source_review.content.strip():
            return Response(
                {"detail": "분석할 리뷰 내용이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # [추가] 로그인 사용자인 경우 요청자 ID 저장
        requested_by_id = request.user.id if request.user.is_authenticated else None

        # =========================================================
        # [추가]
        # Celery worker에게 실제 AI 분석 작업을 위임
        # =========================================================
        async_result = analyze_review_similarity_task.delay(
            review_id=source_review.id,
            requested_by_id=requested_by_id,
        )

        # =========================================================
        # [추가]
        # 작업 상태를 DB에 먼저 저장
        # =========================================================
        AIAnalysisTask.objects.create(
            source_review=source_review,
            requested_by_id=requested_by_id,
            task_id=async_result.id,
            status=AIAnalysisTask.STATUS_PENDING,
            model_name="upskyy/e5-small-korean",
            similarity_threshold=0.45,
        )

        # [수정] 기존 200 OK + 즉시 결과 반환 -> 202 ACCEPTED + task_id 반환
        return Response(
            {
                "detail": "AI 분석 작업이 등록되었습니다.",
                "task_id": async_result.id,
                "status": "PENDING",
                "review_id": source_review.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ReviewAnalyzeTaskStatusAPIView(APIView):
    """
    [추가]
    Celery 작업 상태 조회 API
    GET /ai/tasks/<task_id>/status/
    """
    permission_classes = [AllowAny]

    def get(self, request, task_id):
        # [추가] DB에 저장된 작업 상태 조회
        task_obj = get_object_or_404(AIAnalysisTask, task_id=task_id)

        # [추가] Celery 백엔드 기준 실제 task 상태 조회
        async_result = AsyncResult(task_id)

        response_data = {
            "task_id": task_id,
            "status": async_result.status,
            "db_status": task_obj.status,
            "error_message": task_obj.error_message,
            "candidate_count": task_obj.candidate_count,
            "result_count": task_obj.result_count,
            "created_at": task_obj.created_at,
            "started_at": task_obj.started_at,
            "finished_at": task_obj.finished_at,
        }

        # [추가] 성공 시 Celery task 반환 데이터까지 포함
        if async_result.successful():
            response_data["result"] = async_result.result

        return Response(response_data, status=status.HTTP_200_OK)
```
핵심 변경은 아래입니다.
- `EmbeddingAPIView`, `SimilarityAPIView`는 유지
- 기존 `ReviewAnalyzeAPIView`의 동기 FastAPI 직접 호출 방식 삭제
- `ReviewAnalyzeAPIView`를 Celery 작업 등록 방식으로 수정
- `AIAnalysisTask` import 추가
- `analyze_review_similarity_task` import 추가
- `ReviewAnalyzeTaskStatusAPIView` 새로 추가
- `get_similarity_label()` 함수는 이 파일에서 더 이상 사용하지 않으므로 삭제

---
`backend/apps/ai_gateway/urls.py` : `[수정추가]`
```python
from django.urls import path
from .views import (
    ReviewAnalyzeTaskStatusAPIView
)

urlpatterns = [
    # [추가] Celery 작업 상태 조회
    path("tasks/<str:task_id>/status/", ReviewAnalyzeTaskStatusAPIView.as_view(), name="ai-task-status"),
]
```

`backend/static/js/product-detail.js` : `[수정]`
기존의 버튼 클릭 → 바로 결과 받기를  
버튼 클릭 → 작업 등록 → polling → 완료 시 결과 표시로 바꿉니다.
```js
document.addEventListener("DOMContentLoaded", function () {
    const productDetailBox = document.getElementById("productDetailBox");

    // [수정] 주석 문구 제거, 값 자체는 동일
    const productId = window.PRODUCT_ID;

    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");

    const reviewForm = document.getElementById("reviewCreateForm");
    const contentInput = document.getElementById("content");
    const ratingInput = document.getElementById("rating");
    const imageInput = document.getElementById("images");
    const previewBox = document.getElementById("previewBox");
    const reviewList = document.getElementById("reviewList");

    // [수정] 설명 주석 제거, 동작은 동일
    const api = window.api || axios;

    function getAuthHeaders(extraHeaders = {}) {
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        const headers = { ...extraHeaders };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    async function loadProductDetail() {
        try {
            const response = await api.get(`/products/api/${productId}/`);
            const product = response.data;

            productDetailBox.innerHTML = `
                <img src="${product.image_url || ""}" alt="${product.name}" class="thumb">
                <h1>${product.name}</h1>
                <p>${product.description || ""}</p>
                <p><strong>${Number(product.price).toLocaleString()}원</strong></p>
                <p class="muted">등록일: ${product.created_at || "-"}</p>
            `;
        } catch (error) {
            console.error("상품 상세 조회 실패:", error.response?.data || error);
            productDetailBox.innerHTML = `<p>상품 상세 정보를 불러오지 못했습니다.</p>`;
        }
    }

    async function loadReviews() {
        try {
            const response = await api.get(`/reviews/?product=${productId}`);
            const data = response.data;
            const reviews = data.results || data;

            reviewList.innerHTML = "";

            if (!reviews || reviews.length === 0) {
                reviewList.innerHTML = "<p>아직 등록된 리뷰가 없습니다.</p>";
                return;
            }

            // ============================
            // [수정] 안내 문구를 비동기 처리 기준으로 변경
            // ============================
            const guideBox = document.createElement("div");
            guideBox.className = "review-guide-box";
            guideBox.innerHTML = `
                <p class="review-guide-text">
                    작성한 리뷰와 비슷한 다른 사용자의 후기를 비동기로 찾아 보여줍니다.<br>
                    분석에는 몇 초 정도 걸릴 수 있습니다.
                </p>
            `;
            reviewList.appendChild(guideBox);

            reviews.forEach((review) => {
                let imagesHtml = "";

                if (review.images && review.images.length > 0) {
                    imagesHtml = `
                        <div style="margin-top: 12px; display:flex; flex-wrap:wrap; gap:10px;">
                            ${review.images.map((img) => `
                                <img
                                    src="${img.image}"
                                    alt="리뷰 이미지"
                                    style="width:120px; height:120px; object-fit:cover; border-radius:8px;"
                                >
                            `).join("")}
                        </div>
                    `;
                }

                const card = document.createElement("div");
                card.className = "review-card";
                card.style.border = "1px solid #ddd";
                card.style.borderRadius = "8px";
                card.style.padding = "16px";
                card.style.marginBottom = "12px";

                card.innerHTML = `
                    <p><strong>작성자:</strong> ${review.username || review.user || "-"}</p>
                    <p><strong>평점:</strong> ${review.rating ?? "-"}</p>
                    <p style="margin-top: 10px;">${review.content || ""}</p>
                    ${imagesHtml}
                    <p class="muted" style="margin-top: 10px;">작성일: ${review.created_at || "-"}</p>

                    <!-- [수정] 버튼 인라인 스타일 제거 -->
                    <button
                        class="ai-analyze-btn"
                        data-review-id="${review.id}"
                    >
                        비슷한 후기 보기
                    </button>

                    <!-- [수정] 결과 박스 스타일을 최소화 -->
                    <div
                        class="ai-result-box"
                        id="ai-result-${review.id}"
                        style="display:none;"
                    ></div>
                `;

                reviewList.appendChild(card);
            });

            // [유지] 리뷰 렌더링 후 버튼 이벤트 연결
            bindAnalyzeButtons();

        } catch (error) {
            console.error("리뷰 목록 조회 실패:", error.response?.data || error);
            reviewList.innerHTML = "<p>리뷰 목록을 불러오지 못했습니다.</p>";
        }
    }

    // ============================
    // [유지] 유사도 텍스트 변환 함수
    // ============================
    function getSimilarityLabel(score) {
        if (score > 0.7) return "매우 비슷";
        if (score > 0.5) return "비슷";
        if (score > 0.3) return "약간 비슷";
        return "관련 있음";
    }

    // ============================
    // [유지] 점수별 설명 문구 함수
    // ============================
    function getSimilarityDescription(score) {
        if (score > 0.7) return "표현과 느낌이 매우 비슷한 후기예요.";
        if (score > 0.5) return "비슷한 의견을 담고 있는 후기예요.";
        if (score > 0.3) return "어느 정도 관련 있는 후기예요.";
        return "참고용으로 볼 수 있는 후기예요.";
    }

    // =========================================================
    // [추가] Celery task 상태 polling 함수
    // =========================================================
    async function pollTaskStatus(taskId, reviewId, button, resultBox) {
        const maxTry = 20;
        let currentTry = 0;

        const intervalId = setInterval(async () => {
            currentTry += 1;

            try {
                const response = await api.get(`/ai/tasks/${taskId}/status/`);
                const data = response.data;

                if (data.status === "SUCCESS") {
                    clearInterval(intervalId);

                    const result = data.result || {};

                    if (!result.similar_reviews || result.similar_reviews.length === 0) {
                        resultBox.innerHTML = `
                            <div class="ai-result-inner">
                                <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                                <p>충분히 비슷한 후기를 찾지 못했어요.</p>
                                <p class="ai-sub-guide">
                                    비교할 후기가 부족하거나, 현재 후기들과 표현 차이가 클 수 있어요.
                                </p>
                            </div>
                        `;
                    } else {
                        resultBox.innerHTML = `
                            <div class="ai-result-inner">
                                <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                                <p>비슷한 후기 ${result.similar_reviews.length}개를 찾았어요.</p>
                                <p class="ai-sub-guide">
                                    같은 상품에 대해 비슷하게 느낀 사용자 후기입니다.
                                </p>

                                <ul class="ai-similar-review-list">
                                    ${result.similar_reviews.map((item) => `
                                        <li class="ai-similar-review-item">
                                            <p><strong>${item.label || getSimilarityLabel(item.score)}</strong> : ${item.content}</p>
                                            <p><small>작성자: ${item.username}</small></p>
                                            <p><small>${getSimilarityDescription(item.score)}</small></p>
                                            <p><small>유사도 ${item.score.toFixed(2)} / 작성일 ${item.created_at}</small></p>
                                            <p><small>AI 결과 ID: ${item.analysis_id}</small></p>
                                        </li>
                                    `).join("")}
                                </ul>
                            </div>
                        `;
                    }

                    button.disabled = false;

                    // [수정] 버튼 문구를 원래 문구로 복원
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                if (data.status === "FAILURE") {
                    clearInterval(intervalId);
                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>${data.error_message || "AI 분석 중 오류가 발생했습니다."}</p>
                        </div>
                    `;
                    button.disabled = false;

                    // [수정] 실패 시에도 버튼 문구 복원
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                resultBox.innerHTML = `
                    <div class="ai-result-inner">
                        <p>AI가 후기를 분석 중입니다...</p>
                        <p class="ai-sub-guide">현재 상태: ${data.status}</p>
                    </div>
                `;

                if (currentTry >= maxTry) {
                    clearInterval(intervalId);
                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>분석 시간이 길어지고 있습니다. 잠시 후 다시 확인해주세요.</p>
                        </div>
                    `;
                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                }
            } catch (error) {
                clearInterval(intervalId);
                console.error("작업 상태 조회 실패:", error.response?.data || error);
                resultBox.innerHTML = `
                    <div class="ai-result-inner error">
                        <p>작업 상태를 확인하는 중 오류가 발생했습니다.</p>
                    </div>
                `;
                button.disabled = false;
                button.textContent = "비슷한 후기 보기";
            }
        }, 1500);
    }

    // ============================
    // [수정] AI 분석 버튼 클릭 이벤트
    // 기존: GET으로 즉시 분석 결과 요청
    // 변경: POST로 작업 등록 후 polling
    // ============================
    function bindAnalyzeButtons() {
        const buttons = document.querySelectorAll(".ai-analyze-btn");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const reviewId = button.dataset.reviewId;
                const resultBox = document.getElementById(`ai-result-${reviewId}`);

                button.disabled = true;

                // [수정] 버튼 문구 변경
                button.textContent = "작업 등록 중...";

                resultBox.style.display = "block";

                // [수정] 즉시 분석 문구 -> 작업 등록 문구
                resultBox.innerHTML = "<p>AI 분석 작업을 등록하는 중입니다...</p>";

                try {
                    // [수정] GET -> POST
                    const response = await api.post(`/ai/reviews/${reviewId}/analyze/`, {}, {
                        headers: getAuthHeaders(),
                    });

                    const data = response.data;
                    const taskId = data.task_id;

                    if (!taskId) {
                        throw new Error("task_id를 받지 못했습니다.");
                    }

                    // [추가] 작업 등록 후 polling 시작
                    button.textContent = "분석 진행 중...";
                    pollTaskStatus(taskId, reviewId, button, resultBox);

                } catch (error) {
                    console.error("AI 분석 작업 등록 실패:", error.response?.data || error);

                    const detail =
                        error.response?.data?.detail || "AI 분석 작업 등록 중 오류가 발생했습니다.";

                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>${detail}</p>
                        </div>
                    `;

                    button.disabled = false;

                    // [수정] 버튼 문구를 기존 UI에 맞게 복원
                    button.textContent = "비슷한 후기 보기";
                }
            });
        });
    }

    if (imageInput && previewBox) {
        imageInput.addEventListener("change", function () {
            previewBox.innerHTML = "";

            Array.from(imageInput.files).forEach((file) => {
                if (!file.type.startsWith("image/")) return;

                const reader = new FileReader();

                reader.onload = function (e) {
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.className = "preview-image";
                    img.style.width = "120px";
                    img.style.height = "120px";
                    img.style.objectFit = "cover";
                    img.style.marginRight = "10px";
                    img.style.marginTop = "10px";
                    img.style.borderRadius = "8px";
                    previewBox.appendChild(img);
                };

                reader.readAsDataURL(file);
            });
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const content = contentInput.value.trim();
            const rating = ratingInput.value.trim();

            if (!content || !rating) {
                alert("리뷰 내용과 평점을 입력해주세요.");
                return;
            }

            try {
                const formData = new FormData();
                formData.append("product", productId);
                formData.append("content", content);
                formData.append("rating", rating);

                if (imageInput && imageInput.files.length > 0) {
                    for (let i = 0; i < imageInput.files.length; i++) {
                        formData.append("uploaded_images", imageInput.files[i]);
                    }
                }

                // [삭제] 디버깅용 formData 콘솔 출력 제거
                // for (const pair of formData.entries()) {
                //     console.log(pair[0], pair[1]);
                // }

                await api.post("/reviews/", formData, {
                    headers: getAuthHeaders({
                        "Content-Type": "multipart/form-data",
                    }),
                });

                // [삭제] 리뷰 등록 성공 콘솔 로그 제거
                // console.log("리뷰 등록 성공:", response.data);

                alert("리뷰가 등록되었습니다.");

                reviewForm.reset();
                previewBox.innerHTML = "";

                await loadReviews();
            } catch (error) {
                console.error("리뷰 등록 실패:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("리뷰 작성은 로그인 후 가능합니다.");
                    return;
                }

                alert("리뷰 등록 실패: " + JSON.stringify(error.response?.data || {}));
            }
        });
    }

    if (editBtn) {
        editBtn.addEventListener("click", function () {
            // [삭제] 디버깅용 로그 제거
            // console.log("수정 버튼 클릭");
            window.location.href = `/products/${productId}/update/`;
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async function () {
            const confirmDelete = confirm("정말 이 상품을 삭제하시겠습니까?");
            if (!confirmDelete) return;

            try {
                await api.delete(`/products/api/${productId}/`, {
                    headers: getAuthHeaders(),
                });

                alert("상품이 삭제되었습니다.");
                window.location.href = "/products/";
            } catch (error) {
                console.error("상품 삭제 실패:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("상품 삭제는 로그인 후 가능합니다.");
                    return;
                }

                alert("상품 삭제에 실패했습니다.");
            }
        });
    }

    loadProductDetail();
    loadReviews();
});
```
주요 변경점
- 안내 문구 변경
- AI 버튼 스타일 일부 단순화
- `api.get("/ai/reviews/.../analyze/")` → `api.post(...)` 로 변경
- 즉시 결과 반환 방식 제거
- `pollTaskStatus()` 함수 추가
- 버튼 문구 흐름 변경
- 등록 성공 후 `task_id`로 상태 조회
- 리뷰 등록 시 `formData.entries()` 출력 로그 제거
- edit 버튼의 `console.log("수정 버튼 클릭")` 제거
- 결과 문구가 더 자연스럽게 변경됨
---
`backend/docker-compose.yml`
```yaml
version: "3.9"

services:
  # =========================================================
  # [기존] PostgreSQL
  # =========================================================
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
      - app-network   # [추가] 다른 컨테이너와 통신하기 위한 네트워크 연결

  # =========================================================
  # [추가] Django (DRF 서버)
  # =========================================================
  web:
    build: .
    container_name: drf-web
    command: python manage.py runserver 0.0.0.0:8000
    restart: always   # [추가] 컨테이너 종료 시 자동 재시작
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db           # [추가] DB 먼저 실행
      - redis        # [추가] Redis 먼저 실행
    networks:
      - app-network

  # =========================================================
  # [추가] Celery Worker
  # =========================================================
  celery:
    build: .
    container_name: celery-worker
    command: celery -A config worker --loglevel=info --pool=solo
    restart: always   # [추가] worker 자동 재시작
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      - db           # [추가] DB 먼저 실행
      - redis        # [추가] Redis 먼저 실행
      - web          # [추가] Django 코드 기준으로 worker 실행
    networks:
      - app-network

  # =========================================================
  # [추가] Redis (Celery Broker + Result Backend)
  # =========================================================
  redis:
    image: redis:7
    container_name: redis-new
    restart: always   # [추가] Redis 자동 재시작
    ports:
      - "6379:6379"
    networks:
      - app-network

volumes:
  product_review_postgres_data:

networks:
  app-network:
    driver: bridge
```
지금 구조는 한 프로젝트 안에서 아래 컨테이너들이 같이 움직여야 합니다.
- `db` → PostgreSQL
- `web` → Django/DRF
- `celery` → 비동기 worker
- `redis` → Celery 큐
    
즉, 따로 두 개의 compose 파일로 관리하는 것보다  
하나의 `docker-compose.yml`에서 같이 올리는 게 훨씬 관리가 편합니다.

`backend/.env`
```env
# PostgreSQL
DB_NAME=product_review_db
DB_USER=product_review_user
DB_PASSWORD=product_review_password
DB_HOST=127.0.0.1
DB_PORT=5433

# Redis
REDIS_URL=redis://127.0.0.1:6379/0

# FastAPI
FASTAPI_BASE_URL=http://127.0.0.1:8001
```
---
파일 생성
```bash
touch Dockerfile
```

`backend/Dockerfile`
```dockerfile
# Python 버전
FROM python:3.12-slim

# 작업 디렉토리
WORKDIR /app

# 시스템 패키지
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# requirements 먼저 복사
COPY requirements.txt .

# 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 전체 코드 복사
COPY . .

# 포트
EXPOSE 8000
```

`backend/mysite/settings.py` 수정
```python
# [수정]  
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
```
- Docker 내부에서는 `localhost` 접근이 안되고
- `redis` 서비스 이름으로 접근해야 합니다.

마이그레이션 명령
```bash
cd /home/youjung/product-review-service/backend  
  
python manage.py makemigrations ai_gateway  
python manage.py migrate
```

완전 새로 시작 (기존 컨테이너 무시)
```bash
# 1. 기존 컨테이너 전부 정리 (강력 추천)
docker compose down -v

# 혹시 다른 redis 떠있으면 제거
docker rm -f $(docker ps -aq) 2>/dev/null

# 2. 이미지까지 싹 정리 (선택)
docker system prune -a

# Are you sure you want to continue? [y/N] y
```

빌드 + 실행
```bash
docker compose up --build
```

```bash
python manage.py check
python manage.py showmigrations
python manage.py migrate
```
---
build 필요 없는 경우:
그냥 코드 수정했을때 예를 들어
- `.py` 수정 (views.py, tasks.py 등)
- `.html`, `.js`, `.css` 수정
- 로직 변경
- print/log 추가
이 경우에는 그냥 restart만 하면 됩니다.
```bash
docker compose restart
```
이유:
- 코드가 volume으로 마운트됨
- 컨테이너는 이미 실행 중
- 재시작만 하면 반영됨

### build 해야 하는 경우
이미지 자체가 바뀌는 경우
① requirements.txt 변경
- 라이브러리 추가/삭제
- 무조건 `docker compose up --build`를 해야 합니다.
② Dockerfile 수정
③ Python 버전 변경
④ 환경변수 구조 변경 (.env)
⑤ 패키지 설치 방식 변경 (uv / pip 등)

---
정상 작동 확인 체크리스트

Redis 연결 확인 : 로그에 이런거 나오면 성공
```
Connected to redis://redis:6379/0
```

Celery worker 확인
```
[INFO/MainProcess] celery@... ready.
```

데이터 확인하기
```bash
python manage.py shell
```

```python
from apps.reviews.models import Review

print("전체 리뷰 수:", Review.objects.count())
print("id=1 존재:", Review.objects.filter(id=1).exists())
print("id=1 + 공개:", Review.objects.filter(id=1, is_public=True).exists())

for r in Review.objects.all()[:10]:
    print(r.id, getattr(r, "is_public", None), getattr(r, "content", "")[:50])
```

Task 실행 테스트
```bash
curl -X POST http://localhost:8000/ai/reviews/1/analyze/
```

응답:
```json
{
  "task_id": "...",
  "status": "PENDING"
}
```

상태 조회
```bash
GET /ai/tasks/<task_id>/status/
```

지금 구조:
```
DRF (web)
  ↓
Celery (worker)
  ↓
Redis (queue)
  ↓
FastAPI (AI)
  ↓
DB 저장
```
장점
- 요청 속도 즉시 반환
- timeout 없음
- 대량 처리 가능
- 재시도 가능
- 장애 분리 가능

---
### 로컬에서 추론 테스트할 때

AI 추론이 정상 동작하려면 **3개의 프로세스**가 모두 실행 중이어야 합니다.
```bash
# 1. Celery Worker 실행
celery -A mysite worker --loglevel=info --pool=solo
```

```bash
# 2. Django 서버 실행
python manage.py runserver 8000
```

```bash
# 3. FastAPI 서버 실행
uvicorn main:app --reload --port 8001
```

### 📊 Celery + Redis 적용 전/후 성능 비교 분석
![[Pasted image 20260319172003.png]]

1️⃣ Celery 적용 이전 (동기 처리)
- 요청 URL: `reviews/?product=14`
- 총 응답 시간: 약 20.67 ms
- 서버 응답 대기 시간이 대부분 차지
    
분석
- 사용자가 요청하면  
    👉 Django가 직접 AI 모델(FastAPI)을 호출  
    👉 결과를 기다린 후 응답 반환
    
즉,
```
요청 → Django → FastAPI → 결과 기다림 → 응답
```

⚠️ 문제점
- 사용자는 AI 분석이 끝날 때까지 기다려야 함
- 요청이 많아지면:
    - 서버 병목 발생
    - 응답 지연 증가
    - UX 저하

---
2️⃣ Celery + Redis 적용 이후 (비동기 처리)
![[Pasted image 20260319172111.png]]
- 요청 URL: `analyze/`, `status/`
- 응답 시간:
    - analyze 요청: **약 4.61 ms**
    - 이후 status polling

분석
요청 흐름이 이렇게 변경됨:
```
요청 → Django → Celery 작업 등록 → 즉시 응답
                     ↓
                 (백그라운드)
               Celery → FastAPI → 결과 저장
```

핵심 변화
- AI 분석을 백그라운드로 분리
- 사용자 요청은 즉시 응답

###### 3️⃣ 핵심 성능 비교
|구분|처리 방식|응답 시간|특징|
|---|---|---|---|
|Celery 미적용|동기 처리|약 20.67 ms|AI 끝날 때까지 대기|
|Celery 적용|비동기 처리|약 4.61 ms|즉시 응답 + 백그라운드 처리|

4️⃣ 개선 효과 정리

✅ 1. 응답 속도 개선
- 약 4~5배 이상 빠른 초기 응답
- 사용자 체감 속도 크게 향상
    
---
✅ 2. 서버 부하 분산
- 기존: Django가 모든 처리 담당
- 개선:
    - Django → 요청만 처리
    - Celery → 작업 처리
    - FastAPI → AI 처리
- 역할 분리 구조 완성

---
✅ 3. 사용자 경험 개선 (UX)

기존:
> AI 분석 끝날 때까지 기다림

개선:
> 먼저 결과 화면 보여주고 → 분석은 뒤에서 진행

---
✅ 4. 확장성 확보
- Celery Worker 개수 늘리면:
    - 동시에 여러 AI 작업 처리 가능
        
- 대규모 트래픽 대응 가능


