기존 모델 설계에서는 `CASCADE` 옵션을 사용해 부모 데이터가 삭제되면 연관된 데이터까지 함께 삭제되도록 구현했지만, 이 방식은 실수로 삭제할 경우 모든 데이터가 복구 없이 사라지는 위험이 있습니다.

따라서 실제 서비스에서는 데이터를 바로 삭제하지 않고, 삭제 상태만 표시하는 ‘논리 삭제(Soft Delete)’ 방식으로 변경하여 데이터 보존과 복구를 가능하게 합니다.  

또한 크롤링 과정에서는 차단을 방지하기 위해 요청 간격 조절, User-Agent 변경, 재시도 등의 안정화 전략을 함께 적용합니다.

---
`1.` CASCADE 삭제의 위험성과 Soft Delete 도입

`CASCADE 삭제의 위험성`
기존 모델 설계(3번 단계)에서는 `on_delete=models.CASCADE`를 사용하여 부모 데이터(User, Product, Review)가 삭제되면 연관된 자식 데이터(ReviewImage, ReviewAI, Like 등)가 물리적으로 자동 삭제되도록 설정했습니다.

- 복구 불가능: 운영 중 관리자나 사용자의 실수로 데이터를 지웠을 때 DB에서 즉시 사라져 복구가 매우 어렵습니다.
- 데이터 분석 단절: 탈퇴한 회원의 리뷰 데이터나 삭제된 리뷰의 AI 분석 이력 등을 나중에 통계적으로 활용하고 싶어도 데이터가 없어 분석이 불가능합니다.

---
A. `Soft Delete(논리 삭제) 구현 방안`
데이터를 실제로 삭제하지 않고, `is_deleted=True`로 상태만 변경하여 삭제된 것처럼 보이게 처리합니다.  이렇게 하면 실수로 삭제해도 복구가 가능하고, 기존 데이터(리뷰·AI 분석 결과 등)를 유지하여 이후 분석에도 활용할 수 있습니다.

B. 크롤링 차단 대응
크롤링은 단순 요청이 아니라, 차단을 피하기 위한 전략이 필요합니다.  
User-Agent 변경, 요청 간격 조절(sleep), 재시도 처리, robots.txt 확인, 수집량 제한(limit) 등을 적용하여 안정적으로 데이터를 수집합니다.

---
### 어떤 파일을 수정해야 하나

Soft Delete 관련

필수 수정 파일
- `apps/core/models.py` ← 공통 `SoftDeleteModel`용 새 파일 추가
- `apps/reviews/models.py` ← `Review`에 `is_deleted`, `deleted_at` 적용
- `apps/reviews/views.py` ← 삭제 API를 물리 삭제가 아니라 논리 삭제로 변경
- `apps/reviews/admin.py` ← 삭제된 리뷰 조회/복구 기능 반영
- `apps/reviews/serializers.py` ← 삭제된 리뷰를 어떻게 응답할지 점검
- `apps/reviews/urls.py` ← 삭제/복구 엔드포인트를 따로 만들면 수정 필요
- 마이그레이션 파일 생성 ← 반드시 필요

거의 같이 봐야 하는 파일
- `apps/products/views.py` ← 상품 상세에서 리뷰 목록 조회 시 삭제된 리뷰 제외 확인
- `static/js/product_detail.js` ← 삭제 후 화면 갱신, 삭제된 리뷰가 안 보이게 처리 확인
- `static/js/product_list.js` ← 목록에서 리뷰를 같이 그리면 삭제 제외 반영 확인

상황에 따라 수정하는 파일
- `apps/products/models.py` ← `Product`를 바로 Soft Delete 할 게 아니면 지금은 꼭 안 건드려도 됨
- `apps/interactions/models.py` ← 좋아요/북마크/댓글/신고까지 Soft Delete 확장할 때 수정
- `apps/interactions/views.py` ← 리뷰가 논리 삭제된 경우 댓글/좋아요 API 접근 제한이 필요하면 수정
- `apps/interactions/serializers.py` ← 삭제된 리뷰에 연결된 상호작용 응답 처리 시 수정
- `apps/products/admin.py`, `apps/interactions/admin.py` ← 운영 관리에서 삭제 상태를 보려면 수정

---
크롤링 안정성 관련

필수 수정 파일
- `apps/crawling/services/http.py` ← 공통 HTTP 요청 유틸 추가
- `apps/crawling/services/*.py` ← 기존 `requests.get()` 또는 실제 수집 요청 부분 수정
- `apps/crawling/management/commands/scheduled_crawl.py` ← `limit`, 간격, 분산 수집 반영

선택 수정 파일
- `settings.py` ← timeout, retry, delay, user-agent 목록 같은 기본 설정값을 분리하고 싶을 때 추가
- `apps/crawling/tasks.py` ← Celery로 크롤링을 돌리고 있다면 작업 간격이나 재시도 정책 반영 시 수정
- `apps/crawling/models.py` ← 수집 로그, 실패 횟수, 마지막 수집 시간 등을 저장하려면 수정
- `apps/crawling/admin.py` ← 크롤링 상태를 관리자에서 보고 싶다면 수정

---
`apps/core/models.py`
```python
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(
            is_deleted=True,
            deleted_at=timezone.now()
        )

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def hard_delete(self):
        return self.get_queryset().hard_delete()


class AllObjectsManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, verbose_name="삭제 여부")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="삭제 일시")

    # 기본 조회: 삭제 안 된 것만
    objects = SoftDeleteManager()

    # 전체 조회: 삭제 포함
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])
```


`apps/reviews/models.py` 수정
기존 `Review` 모델에 바로 상속 붙이면 됩니다.
```python
from django.db import models
from apps.core.models import SoftDeleteModel


class Review(SoftDeleteModel):
    # 기존 CASCADE -> SET_NULL / PROTECT로 변경
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
        verbose_name="작성자"
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="reviews",
        verbose_name="상품"
    )
    content = models.TextField(verbose_name="리뷰 내용")
    rating = models.PositiveSmallIntegerField(default=5, verbose_name="평점")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"Review({self.id})"
```

왜 이렇게 바꾸냐
- 유저 탈퇴 시 리뷰 자체는 보존하고 작성자만 비워두기 위해 `SET_NULL`
- 리뷰가 달린 상품은 실수로 지우지 못하게 합니다.

`apps/reviews/models.py` 안의 연관 모델도 점검
예를 들어 `ReviewImage`, `ReviewAI`, `ReviewComment`, `ReviewLike` 같은 것들은  
보통 `Review` 기준으로 연결되므로 아래처럼 둡니다.
```python
class ReviewImage(models.Model):
    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(upload_to="reviews/")
```
여기서 중요한 건  
부모 Review가 hard delete 되지 않으므로 자식이 바로 사라질 일이 거의 없습니다.

즉,
- 평소 삭제 = soft delete
- 정말 물리 삭제할 때만 cascade 발동하므로 이 구조가 실무적으로 더 안전합니다.

리뷰 삭제 API 수정
지금 가장 중요한 포인트입니다.  
기존에 `review.delete()`를 쓰고 있었다면, 이제 그 호출이 soft delete가 됩니다.
```python
# apps/reviews/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Review


class ReviewDeleteView(APIView):
    def delete(self, request, pk):
        review = get_object_or_404(Review, pk=pk)

        # 권한 체크 예시
        if review.user != request.user:
            return Response(
                {"detail": "삭제 권한이 없습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 이제 실제 물리 삭제가 아니라 논리 삭제됨
        review.delete()

        return Response(
            {"detail": "리뷰가 삭제되었습니다.", "soft_deleted": True},
            status=status.HTTP_200_OK
        )
```

조회 API에서 삭제된 데이터가 자동 제외되는지 확인
`objects`가 기본 매니저이므로 아래 코드는 자동으로 삭제된 리뷰를 제외합니다.
```python
reviews = Review.objects.filter(product_id=product_id)
```
삭제된 것까지 보고 싶을 때만:
```python
reviews = Review.all_objects.filter(product_id=product_id)
```

관리자(admin)에서 복구 기능 추가
```python
from django.contrib import admin
from .models import Review


@admin.action(description="선택한 리뷰 복구")
def restore_reviews(modeladmin, request, queryset):
    for obj in queryset:
        obj.restore()


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "product", "user", "is_deleted", "deleted_at", "created_at"]
    list_filter = ["is_deleted", "created_at"]
    search_fields = ["content"]
    actions = [restore_reviews]

    def get_queryset(self, request):
        return Review.all_objects.all()
```
이렇게 해두면 운영 중 실수 삭제 복구가 쉬워집니다.

마이그레이션
```bash
python manage.py makemigrations  
python manage.py migrate
```
이미 데이터가 있는 상태라면,  
`user` 필드를 `SET_NULL`로 바꿀 경우 `null=True`가 꼭 있어야 합니다.

---
### 크롤링 안정성 코드

`apps/crawling/services/http.py` 추가
```python
import random
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from requests import RequestException


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def build_headers(extra_headers=None):
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


def is_allowed_by_robots(url, user_agent="*"):
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        # robots 확인 실패 시 무조건 막기보다는 False/True 정책을 팀 기준으로 정하면 됨
        return False


def get_with_retry(url, headers=None, retries=3, min_delay=1.0, max_delay=3.0, timeout=10):
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            time.sleep(random.uniform(min_delay, max_delay))
            merged_headers = build_headers(headers)

            response = requests.get(
                url,
                headers=merged_headers,
                timeout=timeout,
            )
            response.raise_for_status()
            return response

        except RequestException as e:
            last_error = e
            if attempt < retries:
                time.sleep(2 * attempt)
            else:
                raise last_error
```
이 구조는 문서에서 말한
- UA 회전
- 요청 지연
- 재시도를 실제 코드로 옮긴 것입니다.

실제 크롤링 서비스에서 공통 HTTP 유틸 사용
예를 들어 기존에 이렇게 되어 있었다면
```python
response = requests.get(url)
```
이걸 아래처럼 바꿉니다.
```python
from apps.crawling.services.http import get_with_retry, is_allowed_by_robots

if not is_allowed_by_robots(url):
    raise ValueError(f"robots.txt 정책상 수집 불가 URL입니다: {url}")

response = get_with_retry(url)
html = response.text
```

Selenium도 간단히 안정화
Selenium은 `requests`보다 차단에 덜 민감할 수 있지만, 너무 빠른 접근은 여전히 문제입니다.
```python
import random
import time

driver.get(url)
time.sleep(random.uniform(2.0, 4.5))
```
페이지 넘김, 상세 페이지 접근 사이에도 같은 식으로 넣으세요.

스케줄 크롤링 명령어에서 limit 적용
문서에서도 한꺼번에 많이 긁지 말고 나눠 수집하라고 했으니, `scheduled_crawl`에 limit을 강제하는 게 좋습니다.
```python
# apps/crawling/management/commands/scheduled_crawl.py
from django.core.management.base import BaseCommand
from apps.crawling.models import CrawlTarget
from apps.crawling.services.collector import run_collect


class Command(BaseCommand):
    help = "스케줄 크롤링 실행"

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=10)

    def handle(self, *args, **options):
        limit = options["limit"]
        targets = CrawlTarget.objects.filter(is_active=True)[:limit]

        for target in targets:
            self.stdout.write(f"[START] {target.id} - {target.title}")
            try:
                run_collect(target)
                self.stdout.write(self.style.SUCCESS(f"[OK] {target.id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"[FAIL] {target.id}: {e}"))
```
---
### 실제로 먼저 적용해야 하는 우선순위

지금 상태에서는 아래 순서가 제일 안전합니다.

1단계
`apps/core/models.py` 추가

2단계
`Review` 모델만 먼저 Soft Delete 적용

왜냐하면 처음부터 전 모델에 다 넣으면 마이그레이션이 커지고,  
어디서 조회가 빠지는지 찾기 어려워집니다.

3단계
리뷰 삭제 API 수정

4단계
관리자(admin) 복구 기능 추가

5단계
크롤링 공통 HTTP 유틸 추가

6단계
기존 크롤링 코드에서 `requests.get()`를 `get_with_retry()`로 교체

---
### 주의할 점
`get_object_or_404(Review, pk=pk)`

이 코드는 이제 `Review.objects`를 쓰므로 삭제된 리뷰는 조회되지 않습니다.

삭제된 리뷰도 관리자에서 다시 보고 싶으면:
```python
review = get_object_or_404(Review.all_objects, pk=pk)
```

unique 제약

예를 들어 좋아요 모델에서
- 삭제된 리뷰를 제외한 unique
- soft delete된 데이터와의 충돌같은 문제가 생길 수 있습니다.

그래서 좋아요/북마크/댓글까지 soft delete를 넓힐지는 리뷰 모델 먼저 안정화한 뒤에 하시는 게 좋습니다.

상품(Product)에 바로 soft delete 넣을지 여부
처음부터 넣기보다, 지금은 `Review.product = PROTECT`만 먼저 적용하는 게 낫습니다.


--------------------------------------------------------------------------------


대응 방안 2: robots.txt 준수 및 스케줄링 조절

- **robots.txt 확인:** 수집 전 해당 사이트의 `/robots.txt`를 확인하여 허용된 경로만 수집하는 로직을 준수해야 합니다.
- **분산 수집:** 한꺼번에 긁어오는 것이 아니라, 기존에 구축한 `scheduled_crawl` 명령어의 `--limit` 옵션을 활용하여 1시간마다 조금씩 나누어 수집하는 전략을 유지합니다.
