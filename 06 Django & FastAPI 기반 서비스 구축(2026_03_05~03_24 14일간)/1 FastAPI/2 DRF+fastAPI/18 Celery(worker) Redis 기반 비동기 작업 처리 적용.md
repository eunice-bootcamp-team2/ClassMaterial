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

# Django settings 모듈 지정
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

# Celery 앱 생성
app = Celery("mysite")

# Django settings.py의 CELERY_ 접두사 설정값 자동 로드
app.config_from_object("django.conf:settings", namespace="CELERY")

# INSTALLED_APPS 안의 tasks.py 자동 탐색
app.autodiscover_tasks()
```

`backend/mysite/__init__.py` : `[추가]`
```python
# [추가] Celery 앱을 Django 시작 시 함께 로드

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
---
기존의 모델은 AI 결과를 저장하는 것이였고 추가된 모델은 AI 작업 진행 상태를 저장을 추가함
```
ReviewSimilarityResult = 분석 결과 저장
AIAnalysisTask = 분석 작업 상태 저장
```

`AIAnalysisTask`가 추가된 이유는:
기존 흐름
```
버튼 클릭  
→ 바로 FastAPI 호출  
→ 결과 받음  
→ 화면 출력
```
이 방식은 작업이 짧으면 괜찮습니다.  
그런데 나중에는 리뷰가 많아지고, 비교 대상이 늘어나고, AI 계산이 무거워질 수 있습니다.

그럼 이런 문제가 생깁니다.
- 요청이 오래 걸림
- 화면이 기다려야 함
- 중간에 실패했는지 알기 어려움
- 지금 몇 % 진행됐는지 알기 어려움

그래서 셀러리를 붙이면 흐름이 이렇게 바뀝니다.
```
버튼 클릭  
→ Django가 Celery 작업 등록  
→ task_id 발급  
→ Celery가 백그라운드에서 분석  
→ 상태를 DB에 기록  
→ 완료되면 결과 확인
```

왜 DB에 상태를 저장하는가?
셀러리를 쓰면 작업은 백그라운드에서 돌아갑니다.  
그런데 프론트나 관리자 입장에서는 이런 정보가 필요합니다.
- 지금 대기중인가?
- 이미 시작했는가?
- 끝났는가?
- 실패했는가?
- 후보 리뷰가 몇 개였는가?
- 최종 결과가 몇 개였는가?
- 실패했다면 왜 실패했는가?

이걸 메모리로만 두면 서버 재시작 시 확인이 어렵고,  
관리자 페이지나 Django 쪽에서 조회하기도 불편합니다.

그래서 작업 상태를 DB에도 남기는 것입니다.

---
각 모델 역할 차이

`ReviewSimilarityResult`
이건 최종 분석 결과 저장용입니다.

예를 들면:
- 리뷰 10번과 리뷰 23번 비교
- 유사도 0.81
- 라벨: 매우 비슷

즉, 결과 데이터입니다.

---
`AIAnalysisTask`
이건 작업 진행 상황 저장용입니다.

예를 들면:
- task_id = abc123
- 상태 = STARTED
- 비교 후보 수 = 18
- 최종 결과 수 = 3
- 실패 메시지 = 없음

즉, 작업 로그/상태 데이터입니다.

---
`backend/apps/ai_gateway/models.py` : `[수정]`
```python
from django.conf import settings
from django.db import models


class ReviewSimilarityResult(models.Model):
    """
    [유지]
    AI 유사도 분석 결과 저장 모델 (최종 결과 데이터)
    """

    product = models.ForeignKey(...
    # 어떤 상품 기준으로 분석했는지 연결


class AIAnalysisTask(models.Model):
    """
    [추가]
    Celery 비동기 작업 상태를 DB에서 추적하기 위한 모델
    """

    # =========================
    # [상태 값 정의]
    # =========================
    STATUS_PENDING = "PENDING"     # 작업 대기중
    STATUS_STARTED = "STARTED"     # 작업 진행중
    STATUS_SUCCESS = "SUCCESS"     # 작업 완료
    STATUS_FAILURE = "FAILURE"     # 작업 실패

    STATUS_CHOICES = [
        (STATUS_PENDING, "대기중"),
        (STATUS_STARTED, "진행중"),
        (STATUS_SUCCESS, "완료"),
        (STATUS_FAILURE, "실패"),
    ]

    # =========================
    # [어떤 리뷰를 분석했는지]
    # =========================
    source_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="ai_analysis_tasks",
    )
    # 분석 기준이 되는 리뷰 (버튼 누른 리뷰)

    # =========================
    # [누가 요청했는지]
    # =========================
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_analysis_tasks",
    )
    # 어떤 사용자가 분석 요청했는지 (로그 추적용)

    # =========================
    # [Celery 연결 키]
    # =========================
    task_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
    )
    # Celery 작업 고유 ID (이걸로 작업 상태 추적)

    # =========================
    # [현재 작업 상태]
    # =========================
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    # 현재 상태 (대기중 / 진행중 / 완료 / 실패)

    # =========================
    # [사용한 AI 모델]
    # =========================
    model_name = models.CharField(
        max_length=100,
        default="upskyy/e5-small-korean",
    )
    # 어떤 AI 모델로 분석했는지 기록

    # =========================
    # [유사도 기준값]
    # =========================
    similarity_threshold = models.FloatField(default=0.45)
    # 이 점수 이상만 결과로 인정 (필터 기준)

    # =========================
    # [분석 통계]
    # =========================
    candidate_count = models.PositiveIntegerField(default=0)
    # 비교 대상 리뷰 개수

    result_count = models.PositiveIntegerField(default=0)
    # 최종 유사하다고 판단된 결과 개수

    # =========================
    # [에러 정보]
    # =========================
    error_message = models.TextField(blank=True)
    # 실패 시 에러 내용 저장

    # =========================
    # [시간 기록]
    # =========================
    created_at = models.DateTimeField(auto_now_add=True)
    # 작업 생성 시간

    started_at = models.DateTimeField(null=True, blank=True)
    # 실제 작업 시작 시간

    finished_at = models.DateTimeField(null=True, blank=True)
    # 작업 완료 시간

    # =========================
    # [정렬 기준]
    # =========================
    class Meta:
        ordering = ["-created_at"]
    # 최신 작업이 위로 보이도록 정렬

    # =========================
    # [관리자 표시용]
    # =========================
    def __str__(self):
        return f"{self.task_id} - {self.status}"
    # admin / 로그에서 "task_id - 상태" 형태로 표시
```

상태값은 왜 필요한가?

코드에 있는 이 값들:
```python
STATUS_PENDING = "PENDING"  
STATUS_STARTED = "STARTED"  
STATUS_SUCCESS = "SUCCESS"  
STATUS_FAILURE = "FAILURE"
```

이건 작업의 현재 상태를 뜻합니다.
- `PENDING` : 아직 대기중
- `STARTED` : 작업 시작됨
- `SUCCESS` : 완료됨
- `FAILURE` : 실패함

이게 있으면 프론트에서도 이런 식으로 보여줄 수 있습니다.
```
분석 요청됨  
분석 진행중  
분석 완료  
분석 실패
```

---
`candidate_count`, `result_count`, `error_message`는 왜 저장하는가?

`candidate_count`
비교 후보가 몇 개였는지

예:
- 같은 상품 리뷰 20개 중 18개 비교 가능

`result_count`
최종적으로 몇 개가 살아남았는지

예:
- threshold 통과한 결과 3개

`error_message`
실패 이유 저장

예:
- FastAPI 연결 실패
- 리뷰 내용 없음
- 예외 발생

이 값들이 있으면 나중에 관리자 페이지나 디버깅에서 매우 편합니다.

---
정리
```
ReviewSimilarityResult = AI 분석 결과 저장  
AIAnalysisTask = Celery 작업 상태 저장
```
결과와 작업상태는 다르기 때문에 테이블도 나누는 것입니다.

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
```
이 코드는 리뷰 유사도 분석 작업을 Celery worker가 비동기로 처리하도록 만든 task입니다.

즉,
- Django View가 직접 FastAPI를 오래 기다리지 않고
- Celery가 백그라운드에서 분석을 수행하며
- 분석 상태는 AIAnalysisTask에 기록하고
- 최종 유사도 결과는 ReviewSimilarityResult에 저장하는 역할을 합니다.

한마디로,
AI 분석을 백그라운드에서 실행하고, 상태와 결과를 DB에 저장하는 작업 코드입니다.
```

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


# [보조 함수]
# 유사도 점수를 사람이 보기 쉬운 문구로 바꿔줌
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
    retry_kwargs={"max_retries": 3}
)
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
    """
    [역할]
    기준 리뷰 1개를 기준으로 같은 상품의 다른 리뷰들과 유사도 분석 후
    결과를 DB에 저장하는 Celery 비동기 작업

    [전체 흐름]
    1. task_id로 AIAnalysisTask 상태 레코드 조회
    2. 작업 상태를 STARTED로 변경
    3. 기준 리뷰 조회
    4. 같은 상품의 비교 후보 리뷰 조회
    5. 후보 리뷰들을 FastAPI로 하나씩 비교
    6. 기준 점수 이상인 결과만 ReviewSimilarityResult에 저장
    7. 상위 결과를 정렬해서 반환
    8. 작업 성공/실패 상태를 AIAnalysisTask에 저장
    """

    # [상수]
    # 현재 사용하는 모델명과 유사도 기준값
    MODEL_NAME = "upskyy/e5-small-korean"
    SIMILARITY_THRESHOLD = 0.45

    # [1] 현재 Celery task_id로 작업 상태 레코드 조회
    task_status = AIAnalysisTask.objects.get(task_id=self.request.id)

    # [2] 작업 시작 상태로 변경
    task_status.status = AIAnalysisTask.STATUS_STARTED
    task_status.started_at = timezone.now()
    task_status.error_message = ""
    task_status.save(update_fields=["status", "started_at", "error_message"])

    try:
        # [3] 기준이 되는 리뷰 1개 조회
        source_review = Review.objects.select_related("user", "product").get(
            id=review_id,
            is_public=True,
        )

        # [예외 처리]
        # 기준 리뷰 내용이 비어 있으면 작업 실패 처리 대상
        if not source_review.content.strip():
            raise ValueError("분석할 리뷰 내용이 없습니다.")

        # [4] 같은 상품의 다른 리뷰들을 비교 후보로 조회
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

        # [5] 비교 후보 개수 기록
        task_status.candidate_count = candidate_reviews.count()
        task_status.save(update_fields=["candidate_count"])

        # [6] 최종 결과를 담을 리스트
        results = []

        # [7] 후보 리뷰들을 하나씩 순회하며 FastAPI 유사도 분석 수행
        for candidate in candidate_reviews:

            # [건너뛰기]
            # 후보 리뷰 내용이 비어 있으면 분석하지 않음
            if not candidate.content.strip():
                continue

            # [FastAPI 호출]
            # 기준 리뷰와 후보 리뷰의 유사도 계산
            similarity_result = FastAPIClient.get_similarity(
                source_review.content,
                candidate.content,
            )

            # [점수 추출]
            score = round(similarity_result["similarity"], 4)

            # [필터링]
            # 기준 점수 미만이면 결과에서 제외
            if score < SIMILARITY_THRESHOLD:
                continue

            # [라벨 생성]
            similarity_label = get_similarity_label(score)

            # [8] 최종 유사도 결과를 DB에 저장 또는 갱신
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

            # [9] 프론트에 반환할 결과 형태로 리스트에 추가
            results.append({
                "analysis_id": saved_result.id,
                "review_id": candidate.id,
                "username": candidate.user.username,
                "content": candidate.content,
                "score": score,
                "label": similarity_label,
                "created_at": candidate.created_at.strftime("%Y-%m-%d %H:%M"),
            })

        # [10] 점수 높은 순으로 정렬
        results.sort(key=lambda x: x["score"], reverse=True)

        # [11] 상위 3개만 선택
        top_results = results[:3]

        # [12] 작업 성공 상태 저장
        task_status.status = AIAnalysisTask.STATUS_SUCCESS
        task_status.result_count = len(top_results)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "result_count", "finished_at"])

        # [13] 최종 결과 반환
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
        # [실패 처리]
        # 작업 실패 시 상태, 에러 메시지, 종료 시각 저장
        task_status.status = AIAnalysisTask.STATUS_FAILURE
        task_status.error_message = str(e)
        task_status.finished_at = timezone.now()
        task_status.save(update_fields=["status", "error_message", "finished_at"])

        # [예외 다시 발생]
        # Celery가 실패로 인식하도록 예외를 다시 올림
        raise
```
이 파일은 리뷰 유사도 분석을 Celery worker가 비동기로 처리하도록 만든 task 파일입니다.  
작업 상태는 AIAnalysisTask에 저장하고, 최종 분석 결과는 ReviewSimilarityResult에 저장합니다.

---
이번 views의 변경은 단순 코드 스타일 변경이 아니라 처리 방식 자체가 바뀐 것입니다.

기존 코드는 `views.py` 안에서 바로
- 리뷰 조회
- FastAPI 호출
- 결과 저장
- 바로 응답 반환
까지 모두 한 번에 처리했습니다.

그런데 이 방식은 리뷰 수가 많아지거나 AI 호출이 오래 걸리면,
- 요청 응답이 느려지고
- 사용자가 오래 기다려야 하고
- 중간 상태를 알기 어렵고
- 실패 시 추적이 불편해집니다

그래서 변경 후 코드는
- View는 작업 등록만
- 실제 AI 분석은 Celery worker가 비동기로 처리
- 진행 상태는 별도 상태 조회 API로 확인
하는 구조로 바뀐 것입니다.

---
왜 변경되었는가

핵심 이유는 아래와 같습니다.

1. 요청-응답 시간을 짧게 만들기 위해서입니다
	기존에는 사용자가 버튼을 누르면 View가 FastAPI 분석이 끝날 때까지 기다렸습니다.  
	변경 후에는 View가 바로 `task_id`만 반환하므로 화면 응답이 빨라집니다.

2. 무거운 작업을 백그라운드로 분리하기 위해서입니다
	유사도 비교는 후보 리뷰들을 반복 비교하므로 점점 무거워질 수 있습니다.  
	이런 작업은 View가 직접 처리하기보다 Celery worker가 맡는 구조가 더 안정적입니다.

3. 작업 상태를 추적하기 위해서입니다
	기존에는 성공/실패만 즉시 응답으로 알 수 있었지만,  
	변경 후에는 `PENDING`, `STARTED`, `SUCCESS`, `FAILURE` 같은 상태를 따로 확인할 수 있습니다.

4. View와 실제 분석 로직의 역할을 분리하기 위해서입니다
	기존에는 View 안에 로직이 많았고,  

변경 후에는
- `views.py` = 작업 등록, 상태 조회
- `tasks.py` = 실제 분석, 결과 저장으로 책임이 분리되었습니다.

---
변경된 코드의 전체 역할
이 코드는 이제 `views.py`에서 직접 AI 분석을 수행하지 않고,  
리뷰 분석 작업을 Celery에 등록한 뒤 `task_id`를 반환하며,  
별도의 상태 조회 API를 통해 현재 작업 진행 상황과 완료 결과를 확인할 수 있게 만든 코드입니다.

즉 한 줄로 정리하면:
기존: View가 직접 분석하고 바로 결과 반환  
변경: View는 작업만 등록하고, 실제 분석은 Celery가 처리

`backend/apps/ai_gateway/views.py` : `[수정]` : 기존 동기 분석 뷰를 비동기 작업 등록 + 상태 조회 + 결과 조회 구조로 변경합니다.
```python
# [수정]
# 기존: from requests import RequestException
# 변경: requests.exceptions 에서 직접 import
from requests.exceptions import RequestException

# [추가]
# Celery 작업의 현재 상태 조회를 위해 AsyncResult import 추가
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

# [유지]
# Embedding / Similarity API는 여전히 FastAPI를 직접 호출
from .services import FastAPIClient

# [수정]
# 기존: ReviewSimilarityResult 를 import 해서 View 안에서 직접 저장했음
# 변경: 비동기 작업 상태 저장용 AIAnalysisTask import
from .models import AIAnalysisTask

# [추가]
# 실제 AI 분석은 Celery task로 이동했으므로 task import 추가
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
# 기존 코드에는 View 안에서 직접 유사도 라벨을 만들기 위해
# get_similarity_label() 함수가 있었음
#
# 변경 후에는 실제 유사도 계산과 라벨 생성이 tasks.py 로 이동했으므로
# views.py 에서는 더 이상 이 함수가 필요 없어짐
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
    기존:
    GET /ai/reviews/<review_id>/analyze/
    -> View 안에서 FastAPI 직접 호출
    -> DB 저장
    -> 결과 즉시 반환

    변경:
    POST /ai/reviews/<review_id>/analyze/
    -> Celery 작업만 등록
    -> task_id 반환
    """
    permission_classes = [AllowAny]

    # [수정]
    # 기존 코드에는 SIMILARITY_THRESHOLD, MODEL_NAME 상수가 클래스 내부에 있었음
    # 변경 후에는 실제 분석 로직이 tasks.py 로 이동했으므로 여기서는 제거됨

    def post(self, request, review_id):
        # [유지]
        # 기준 리뷰 존재 여부 먼저 확인
        source_review = get_object_or_404(
            Review.objects.select_related("user", "product"),
            id=review_id,
            is_public=True,
        )

        # [유지]
        # 기준 리뷰 내용이 비어 있으면 작업 등록 전 바로 에러 반환
        if not source_review.content.strip():
            return Response(
                {"detail": "분석할 리뷰 내용이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # [추가]
        # 로그인 사용자인 경우 요청자 ID 저장
        requested_by_id = request.user.id if request.user.is_authenticated else None

        # =========================================================
        # [추가]
        # 기존 코드에서는 여기서 직접 FastAPI 호출 + 결과 저장을 했음
        #
        # 변경 후에는 Celery task에게 실제 분석 작업을 맡김
        # -> delay() 호출 시 비동기 작업 등록
        # -> 즉시 task_id 반환 가능
        # =========================================================
        async_result = analyze_review_similarity_task.delay(
            review_id=source_review.id,
            requested_by_id=requested_by_id,
        )

        # =========================================================
        # [추가]
        # 기존 코드에는 없었음
        # 작업 시작 전 DB에 작업 상태를 먼저 저장
        # 나중에 상태 조회 API에서 이 레코드를 사용함
        # =========================================================
        AIAnalysisTask.objects.create(
            source_review=source_review,
            requested_by_id=requested_by_id,
            task_id=async_result.id,
            status=AIAnalysisTask.STATUS_PENDING,
            model_name="upskyy/e5-small-korean",
            similarity_threshold=0.45,
        )

        # =========================================================
        # [수정]
        # 기존:
        # 200 OK + 분석 결과(JSON) 즉시 반환
        #
        # 변경:
        # 202 ACCEPTED + task_id만 반환
        # 실제 결과는 나중에 상태 조회 API로 확인
        # =========================================================
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

    역할:
    - 현재 작업 상태 확인
    - DB에 기록된 상태 확인
    - 작업 성공 시 최종 결과도 함께 반환
    """
    permission_classes = [AllowAny]

    def get(self, request, task_id):
        # [추가]
        # DB에 저장된 작업 상태 레코드 조회
        task_obj = get_object_or_404(AIAnalysisTask, task_id=task_id)

        # [추가]
        # Celery 백엔드 기준 실제 task 상태 조회
        async_result = AsyncResult(task_id)

        # [추가]
        # 상태 조회용 기본 응답 데이터 구성
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

        # [추가]
        # 작업이 성공 완료된 경우 Celery task가 반환한 최종 결과 포함
        if async_result.successful():
            response_data["result"] = async_result.result

        return Response(response_data, status=status.HTTP_200_OK)
```

변경 전
- `GET /ai/reviews/<review_id>/analyze/`
- View가 직접 FastAPI 호출
- View가 직접 DB 저장
- 바로 결과 반환

변경 후
- `POST /ai/reviews/<review_id>/analyze/`
- View는 Celery 작업 등록만 수행
- `task_id` 반환
- 별도 상태 조회 API 추가
- 실제 분석/저장은 `tasks.py`에서 처리

---
`tasks/<task_id>/status/` URL을 추가한 이유는
비동기 작업(Celery)의 진행 상태와 결과를 나중에 조회하기 위해서입니다.

기존 (동기 방식)은 
```
요청 → View → FastAPI → 결과 생성 → 바로 응답
```
- 요청하면 바로 결과가 나옴
- 별도의 조회 API 필요 없음

그러나 변경된 (비동기 방식)은
```
요청 → View → Celery 작업 등록 → task_id 반환
                      ↓
                (백그라운드에서 실행)
                      ↓
                결과 저장

사용자 → 상태 조회 API → 결과 확인(tasks/<task_id>/status/)
```

```
요청(사용자가 버튼을 누르는 순간)
→ backend/static/js/product-detail.js 에서 분석 요청
→ backend/apps/ai_gateway/views.py 에서 Celery 작업 등록
→ backend/apps/ai_gateway/tasks.py 작업 연결
→ task_id 반환
                      ↓
                backend/apps/ai_gateway/tasks.py 가 백그라운드에서 실행
                      ↓
                backend/apps/ai_gateway/models.py 에 결과 저장

사용자(같은 사용자가, 같은 화면에서 조금 뒤에 결과가 나왔는지 다시 확인하는 단계)
→ backend/static/js/product-detail.js 에서 상태 조회 요청
→ backend/apps/ai_gateway/views.py 에서 상태 조회 API 처리
→ 결과 확인 (tasks/<task_id>/status/) json 조회용
```


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

---
```
기존: 버튼 클릭 → 바로 결과 반환 (동기 방식)  
  
변경: 버튼 클릭 → 작업 등록 → 나중에 결과 조회 (비동기 방식)
```
즉
```
AI 작업이 오래 걸리기 때문에  
→ 사용자 응답을 빠르게 하기 위해  
→ Celery 기반 비동기 구조로 변경되었습니다.
```

`backend/static/js/product-detail.js` : `[수정]`
```js
document.addEventListener("DOMContentLoaded", function () {
    const productDetailBox = document.getElementById("productDetailBox");

    const productId = window.PRODUCT_ID;

    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");

    const reviewForm = document.getElementById("reviewCreateForm");
    const contentInput = document.getElementById("content");
    const ratingInput = document.getElementById("rating");
    const imageInput = document.getElementById("images");
    const previewBox = document.getElementById("previewBox");
    const reviewList = document.getElementById("reviewList");

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

            // [수정] 안내 문구를 "비동기 처리" 기준으로 변경
            const guideBox = document.createElement("div");
            guideBox.innerHTML = `
                <p>
                    비슷한 후기를 비동기로 찾아 보여줍니다.
                </p>
            `;
            reviewList.appendChild(guideBox);

            reviews.forEach((review) => {
                const card = document.createElement("div");

                card.innerHTML = `
                    <p>${review.content}</p>

                    <!-- [수정] 버튼 스타일 제거 (UI 분리) -->
                    <button class="ai-analyze-btn" data-review-id="${review.id}">
                        비슷한 후기 보기
                    </button>

                    <!-- [수정] 결과 영역 스타일 최소화 -->
                    <div id="ai-result-${review.id}" style="display:none;"></div>
                `;

                reviewList.appendChild(card);
            });

            bindAnalyzeButtons();

        } catch (error) {
            reviewList.innerHTML = "<p>리뷰 목록을 불러오지 못했습니다.</p>";
        }
    }

    // =========================================================
    // [추가] Celery 상태 polling 함수
    // 기존 코드에는 없음
    // =========================================================
    async function pollTaskStatus(taskId, reviewId, button, resultBox) {
        const intervalId = setInterval(async () => {
            try {
                // [추가] 상태 조회 API 호출
                const response = await api.get(`/ai/tasks/${taskId}/status/`);
                const data = response.data;

                // [추가] 작업 완료 시 결과 렌더링
                if (data.status === "SUCCESS") {
                    clearInterval(intervalId);

                    const result = data.result || {};

                    resultBox.innerHTML = `
                        <p>결과 개수: ${result.similar_reviews?.length || 0}</p>
                    `;

                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                    return;
                }

                // [추가] 진행 중 상태 표시
                resultBox.innerHTML = `<p>분석 중... (${data.status})</p>`;

            } catch (error) {
                clearInterval(intervalId);
            }
        }, 1500);
    }

    // =========================================================
    // [핵심 수정] 버튼 클릭 로직 변경
    // 기존: GET → 즉시 결과 반환
    // 변경: POST → 작업 등록 → polling
    // =========================================================
    function bindAnalyzeButtons() {
        const buttons = document.querySelectorAll(".ai-analyze-btn");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const reviewId = button.dataset.reviewId;
                const resultBox = document.getElementById(`ai-result-${reviewId}`);

                button.disabled = true;

                // [수정] 문구 변경 (즉시 분석 → 작업 등록)
                button.textContent = "작업 등록 중...";

                resultBox.style.display = "block";
                resultBox.innerHTML = "<p>작업 등록 중...</p>";

                try {
                    // [핵심 수정]
                    // 기존: GET /ai/reviews/{id}/analyze/
                    // 변경: POST → Celery 작업 등록
                    const response = await api.post(
                        `/ai/reviews/${reviewId}/analyze/`,
                        {},
                        { headers: getAuthHeaders() }
                    );

                    const taskId = response.data.task_id;

                    // [추가] task_id 기반 polling 시작
                    button.textContent = "분석 진행 중...";
                    pollTaskStatus(taskId, reviewId, button, resultBox);

                } catch (error) {
                    button.disabled = false;
                    button.textContent = "비슷한 후기 보기";
                }
            });
        });
    }

    loadProductDetail();
    loadReviews();
});
```

핵심 변경 포인트 요약
```
1. GET → POST 변경
   → 즉시 결과 → 작업 등록 구조로 변경

2. pollTaskStatus() 추가
   → 결과를 나중에 반복 조회

3. /ai/tasks/<task_id>/status/ 사용
   → 비동기 결과 확인 API

4. 버튼 흐름 변경
   분석 → 작업 등록 → 진행 중
```

---
YAML 파일 역할
```
# ---------------------------------------------------------
# 본 파일은 Docker Compose 설정 파일로,
# 여러 개의 컨테이너(Django, PostgreSQL, Redis, Celery)를
# 하나의 서비스처럼 동시에 실행하고 관리하기 위한 설정 파일입니다.
#
# YAML 파일은 사람이 읽기 쉬운 설정 파일 형식으로,
# 서비스 구조, 실행 명령어, 환경 변수, 네트워크 등을 정의하는 역할을 합니다.
#
# 즉, 이 파일 하나로:
# - DB 서버
# - Django 서버
# - Celery 작업 서버
# - Redis 메시지 큐
# 를 한 번에 실행할 수 있도록 구성합니다.
# ---------------------------------------------------------
```

docker-compose.yml 전체 역할
```
이 파일은 Django 프로젝트 실행에 필요한 여러 서버(DB, Redis, Celery 등)를
Docker 컨테이너로 묶어서 한 번에 실행하도록 설정하는 파일입니다.
```

코드 이해용
```
# db      → PostgreSQL 데이터베이스
# web     → Django 서버 (API 처리)
# celery  → 비동기 작업 처리 (AI 분석)
# redis   → Celery 메시지 큐 (작업 전달)

# 이 파일은 Django, DB, Redis, Celery를 하나의 시스템으로 구성하여  
# 비동기 처리까지 포함된 전체 백엔드 환경을 Docker로 실행하기 위한 설정입니다.
```

가장 핵심적인 docker-compose의 역할은
여러 컨테이너를 하나씩 따로 실행하지 않고 한 번에 묶어서 실행하게 해주는 설정 파일입니다.
```
컨테이너를 4개를 만들었으니 원래는 이렇게 각각 컨테이너를 실행시켜야 합니다.
1. PostgreSQL 실행  
2. Redis 실행  
3. Django 실행  
4. Celery 실행
```
이걸 하나하나 직접 명령어로 띄우려면 번거롭고, 순서도 맞춰야 하고, 설정도 각각 넣어야 합니다.

그런데 docker-compose.yml 이 있으면

이 파일 안에 미리
- 어떤 컨테이너를 띄울지
- 어떤 이름으로 띄울지
- 어떤 포트를 쓸지
- 어떤 환경변수를 쓸지
- 누가 누구를 먼저 실행해야 하는지를 다 적어두기 때문에, 명령어 한 번으로 됩니다.

실행명령어 하나로 해결됩니다.
```bash
docker compose up -d
```

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
```
# ---------------------------------------------------------
# 본 파일은 Docker 이미지를 생성하기 위한 Dockerfile입니다.
#
# Python 실행 환경을 구성하고,
# 필요한 패키지를 설치한 뒤,
# Django 프로젝트 코드를 컨테이너 안에 복사하여
# 실행 가능한 상태로 만드는 역할을 합니다.
#
# 즉, 이 프로젝트를 실행할 수 있는 서버 환경을 자동으로 만드는 설계도입니다.
# ---------------------------------------------------------
```

왜 도커 이미지라고 부르는가?
실행 환경을 그대로 복제해서 어디서든 똑같이 실행할 수 있기 때문에 이미지라고 부릅니다.
즉 진짜 이미지처럼 찍어두는 형태라서 그렇게 부르는것이 아니고 사진에 찍어두듯 복제해둔다는 의미로 이미지라는 표현을 사용합니다. 실제 IT에서 자주 쓰는 의미이며 
- OS 이미지 (윈도우 ISO)
- VM 이미지
- 디스크 이미지 등으로 불리며 복사해서 실행 가능하다는 의미로 사용됩니다.

한 줄 핵심
```
이 파일은 Django 프로젝트가 실행될 수 있는 환경(Python + 라이브러리)을 만드는 설정 파일입니다.
```

파일 생성
```bash
touch Dockerfile
```

docker-compose와 연결해서 이해하면
```
docker-compose.yml → 컨테이너를 어떻게 실행할지  
Dockerfile → 컨테이너 안을 어떻게 만들지
```

`backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
# → Python이 설치된 기본 환경 가져오기

WORKDIR /app
# → 컨테이너 내부 작업 폴더 설정

RUN apt-get update && apt-get install -y build-essential
# → 필요한 시스템 패키지 설치

COPY requirements.txt .
# → 라이브러리 목록 복사

RUN pip install -r requirements.txt
# → Python 패키지 설치

COPY . .
# → 프로젝트 전체 코드 복사

EXPOSE 8000
# → 컨테이너에서 사용할 포트 지정
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
### build가 필요 없는 경우:
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

### build 해야 하는 경우:
이미지 자체가 바뀌는 경우
① requirements.txt 변경
- 라이브러리 추가/삭제
- 무조건 `docker compose up --build`를 해야 합니다.
② Dockerfile 수정
③ Python 버전 변경
④ 환경변수 구조 변경 (.env)
⑤ 패키지 설치 방식 변경 (uv / pip 등)

---
정상 작동 확인 체크리스트(로그메시지)

Redis 연결 확인 : 로그에 이런거 나오면 성공
```bash
Connected to redis://redis:6379/0
```

Celery worker 확인
```bash
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
![[Pasted image 20260329230726.png]]
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


