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
### 어떤 파일들이 연결되어 있나?

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
처음부터 Product/Interaction 전부 Soft Delete로 넓히지 말고
- `core` 공통 파일 추가
- `Review`만 Soft Delete 적용
- 리뷰 삭제 API만 논리 삭제로 변경
- admin에서 복구 가능하게 추가
- 크롤링 공통 HTTP 유틸 추가
- 기존 크롤링 서비스에서 그 유틸을 사용하도록 교체
현재 `ReviewViewSet`은 `ModelViewSet` 기반이며 `Review.objects`를 통해 조회하고 있으므로, 기본 매니저만 바꿔도 삭제된 리뷰가 자동으로 목록에서 빠지는 구조로 연결할 수 있습니다.

그래서 추가할 파일
```
backend/apps/core/__init__.py
backend/apps/core/models.py
backend/apps/crawling/management/commands/scheduled_crawl.py   # 없으면 추가
```

기존파일 수정
```
backend/apps/reviews/models.py
backend/apps/reviews/serializers.py
backend/apps/reviews/views.py
backend/apps/reviews/admin.py
backend/apps/crawling/services/http.py
backend/apps/crawling/services/crawl_service.py
```

지금은 안건드려도 되는 파일
```
backend/apps/products/models.py
backend/apps/interactions/models.py
backend/apps/interactions/views.py
backend/apps/reviews/urls.py   # 현재 router 구조면 수정 없이 가능
backend/apps/products/views.py # 현재 구조상 필수 아님
```
왜냐하면 `interactions/views.py`에서 `get_object_or_404(Review, id=review_id)`를 이미 쓰고 있어서, `Review.objects`가 soft-delete 기본 매니저가 되면 삭제된 리뷰는 자동으로 조회되지 않습니다. 즉, 좋아요/댓글/신고도 간접적으로 막히게 됩니다.

---
폴더만들기 : 그냥 코드 정리용 폴더 (유틸 / 공통 모델)
```bash
cd backend
mkdir -p apps/core  
touch apps/core/__init__.py  
touch apps/core/models.py
```

```
apps/  
├─ reviews/  
├─ products/  
├─ interactions/  
└─ core/ ← 공통 코드 보관용
```

---
데이터를 진짜로 지우지 않고, 숨겨서 관리하는 시스템으로 활용할 models.py
기존 방식 (문제)
```
삭제 버튼 → DB에서 완전히 삭제
```
문제점:
- ❌ 실수로 삭제하면 복구 불가
- ❌ 연관 데이터(CASCADE)까지 전부 날아감
- ❌ AI 분석, 통계 데이터도 같이 사라짐
그래서 나온 개념이 Soft Delete (논리 삭제)입니다

✅ 이 코드가 하는 일

1️⃣ delete()를 바꿔버림
```python
def delete(self):
```
원래:
```sql
DELETE FROM review;
```
지금:
```sql
UPDATE review SET is_deleted=True;
```
✔ DB에서 안 지움  
✔ 상태만 변경

2️⃣ 기본 조회에서 자동으로 숨김
```python
objects = SoftDeleteManager()
```

이 매니저가 하는 일:
```sql
SELECT * FROM review WHERE is_deleted=False;
```
✔ 삭제된 데이터는 자동으로 안 보임

3️⃣ 필요하면 전체 조회 가능
```python
all_objects = AllObjectsManager()
```
이건 관리자용
```sql
SELECT * FROM review;
```
✔ 삭제된 것도 포함해서 조회

4️⃣ 복구 기능 있음
```python
is_deleted=False 로 되돌림
```
✔ 삭제 취소 가능

5️⃣ 진짜 삭제도 가능
```python
def hard_delete(self):
```
이건 진짜 DB에서 삭제 
✔ 관리자용 위험 기능

아래 코드의 전체 흐름
```
사용자 삭제 버튼 클릭
        ↓
Review.delete()
        ↓
is_deleted=True 저장 (DB는 안 지움)
        ↓
일반 조회 → 안 보임
관리자 조회 → 보임
        ↓
복구 가능 (restore)
```

아래 수정된 코드의 기능

1️⃣ AI 데이터 보호
- 리뷰 삭제돼도
- 임베딩 / 유사도 / 감정 분석 유지 가능

2️⃣ 사용자 실수 방지
- 잘못 삭제해도 복구 가능

3️⃣ 통계/추천 유지
- 삭제된 리뷰도 분석에 활용 가능

4️⃣ CASCADE 사고 방지
- 리뷰 삭제 → 이미지/AI 결과 다 날아가는 문제 해결

---
`backend/apps/core/models.py` 새파일 추가
```python
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """
    QuerySet 단위 soft delete 지원
    """

    def delete(self):
        return super().update(
            is_deleted=True,
            deleted_at=timezone.now(),
        )

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager):
    """
    기본 매니저
    - 삭제되지 않은 데이터만 조회
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(
            self.model,
            using=self._db,
        ).filter(is_deleted=False)


class AllObjectsManager(models.Manager):
    """
    전체 조회 매니저
    - 삭제된 데이터 포함
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(
            self.model,
            using=self._db,
        )


class SoftDeleteModel(models.Model):
    """
    공통 soft delete 추상 모델
    """

    is_deleted = models.BooleanField(default=False, verbose_name="삭제 여부")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="삭제 일시")

    # 기본 조회는 살아있는 데이터만
    objects = SoftDeleteManager()

    # 운영/복구용 전체 조회
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """
        기본 delete()는 물리 삭제가 아니라 논리 삭제
        """
        if self.is_deleted:
            return

        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """
        진짜 물리 삭제가 필요할 때만 사용
        """
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """
        삭제 복구
        """
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])
```
---
`backend/apps/reviews/models.py` 수정
기존 `Review` 모델에 바로 상속 붙이면 됩니다. 
리뷰 데이터를 물리 삭제가 아니라 논리 삭제(Soft Delete) 방식으로 처리하기 위해서 수정합니다.
```python
from django.db import models
from django.conf import settings

from apps.products.models import Product
from apps.core.models import SoftDeleteModel   
# [추가] 공통 Soft Delete 추상 모델 import


User = settings.AUTH_USER_MODEL


class Review(SoftDeleteModel):  # [수정] models.Model → SoftDeleteModel 상속으로 변경
    """
    제품 리뷰 모델
    - 리뷰 본문, 평점, 공개 여부 저장
    - Soft Delete 적용 대상
    """

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,   # [수정] 사용자 삭제 시 리뷰까지 지우지 않고 user만 null 처리
        null=True,                   # [추가] SET_NULL 사용을 위해 필요
        blank=True,                  # [추가] 관리자/폼에서 비워둘 수 있게 허용
        related_name="reviews",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,    # [수정] 상품 삭제 시 리뷰가 있으면 삭제 막음
        related_name="reviews",
    )

    content = models.TextField()     # 리뷰 내용
    rating = models.IntegerField()   # 평점
    is_public = models.BooleanField(default=True)   # 공개 여부
    created_at = models.DateTimeField(auto_now_add=True)  # 생성 시각
    updated_at = models.DateTimeField(auto_now=True)      # 수정 시각

    class Meta:
        ordering = ["-created_at"]   # 최신 리뷰가 먼저 보이도록 정렬

    def __str__(self):
        # user가 삭제되어 null일 수도 있으므로 안전하게 처리
        username = self.user.username if self.user else "탈퇴한 사용자"
        return f"{self.product} - {username}"


class ReviewImage(models.Model):
    """
    리뷰 이미지 모델
    - 리뷰 1개에 여러 이미지가 연결될 수 있음
    """

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE, # 리뷰가 완전 삭제(hard delete)되면 이미지도 함께 삭제
        related_name="images",
    )
    image = models.ImageField(upload_to="reviews/")   # 업로드 이미지 파일
    created_at = models.DateTimeField(auto_now_add=True)  # 업로드 시각

    def __str__(self):
        return f"ReviewImage(review_id={self.review_id})"


class ReviewAI(models.Model):
    """
    리뷰 AI 분석 결과 모델
    - 리뷰 1개당 AI 결과 1개 저장
    """

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,# 리뷰가 완전 삭제(hard delete)되면 AI 결과도 함께 삭제
        related_name="ai_result",
    )
    sentiment = models.CharField(max_length=50)   # 감정 분석 결과
    confidence = models.FloatField()              # 예측 신뢰도
    keywords = models.JSONField(blank=True, null=True)  # 핵심 키워드 목록
    created_at = models.DateTimeField(auto_now_add=True)  # 분석 생성 시각

    def __str__(self):
        return f"ReviewAI(review_id={self.review_id})"
```

수정된 핵심
1. `Review` 상속 변경
```python
class Review(SoftDeleteModel)
```
- `[수정]`
- 이제 리뷰는 물리 삭제가 아니라 논리 삭제 가능

---
2. `SoftDeleteModel import`
```python
from apps.core.models import SoftDeleteModel
```
- `[추가]`
- 공통 soft delete 기능 사용

---
3. `user` 외래키 변경
```python
on_delete=models.SET_NULL  
null=True  
blank=True
```
- `[수정 + 추가]`
- 사용자가 탈퇴해도 리뷰 내용은 남김
- user만 `None` 처리

---
4. `product` 외래키 변경
```python
on_delete=models.PROTECT
```
- `[수정]`
- 리뷰가 달린 상품은 실수로 삭제되지 않게 막음

---
각 모델 역할 한 줄 요약
- `Review`  
    → 리뷰 본문/평점 저장 + soft delete 적용 대상
- `ReviewImage`  
    → 리뷰에 연결된 이미지 저장
- `ReviewAI`  
    → 리뷰에 대한 AI 분석 결과 저장

---
`backend/apps/reviews/serializers.py`
```python
from rest_framework import serializers

from .models import Review, ReviewImage


class ReviewImageSerializer(serializers.ModelSerializer):
    # [유지]
    # 업로드된 이미지의 실제 접근 URL을 응답에 추가하기 위한 가상 필드
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = [
            "id",          # 이미지 ID
            "image",       # 원본 이미지 파일 경로
            "image_url",   # [유지] 브라우저에서 바로 접근 가능한 전체 URL
            "created_at",  # 생성 시각
        ]

    def get_image_url(self, obj):
        # [유지]
        # serializer context에서 request를 꺼내 절대경로 URL 생성에 사용
        request = self.context.get("request")

        # [유지]
        # 이미지가 없으면 None 반환
        if not obj.image:
            return None

        try:
            # [유지]
            # 저장된 이미지의 상대 URL 추출
            image_url = obj.image.url
        except Exception:
            # [유지]
            # 파일이 없거나 접근 불가하면 안전하게 None 반환
            return None

        if request:
            # [유지]
            # request가 있으면 절대 URL로 변환
            # 예: http://127.0.0.1:8000/media/reviews/1.jpg
            return request.build_absolute_uri(image_url)

        # [유지]
        # request가 없으면 상대 경로 그대로 반환
        return image_url


class ReviewAISerializer(serializers.Serializer):
    """
    AI 분석 결과 응답용 serializer
    - [수정] ModelSerializer가 아니라 Serializer 사용
    - 이유: 현재 프로젝트 단계별로 AI 결과 필드명이 조금씩 다를 수 있어서
      유연하게 읽기 위해 직접 선언형으로 작성
    """

    sentiment = serializers.CharField(read_only=True)  # 감정 결과
    confidence = serializers.FloatField(read_only=True, required=False)  # [추가] 신뢰도
    score = serializers.FloatField(read_only=True, required=False)       # [추가] 다른 문서 호환용 점수
    summary = serializers.CharField(read_only=True, required=False)      # [추가] 다른 문서 호환용 요약
    keywords = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        required=False,
    )  # [유지] 키워드 목록


class ReviewSerializer(serializers.ModelSerializer):
    # [추가]
    # user.username을 바로 노출하기 위해 가공 필드 추가
    username = serializers.SerializerMethodField()

    # [유지]
    # 리뷰 1개에 연결된 이미지 여러 개를 중첩 응답으로 포함
    images = ReviewImageSerializer(many=True, read_only=True)

    # [수정]
    # AI 결과를 안전하게 꺼내기 위해 직접 메서드 필드 사용
    ai_result = serializers.SerializerMethodField()

    # [추가]
    # 좋아요/북마크 관련 확장 응답 필드
    likes_count = serializers.SerializerMethodField()
    bookmarks_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",                # 리뷰 ID
            "user",              # 작성자 ID
            "username",          # [추가] 작성자 이름
            "product",           # 상품 ID
            "content",           # 리뷰 본문
            "rating",            # 평점
            "is_public",         # 공개 여부
            "created_at",        # 생성 시각
            "updated_at",        # 수정 시각
            "images",            # [유지] 연결된 이미지 목록
            "ai_result",         # [수정] AI 분석 결과
            "likes_count",       # [추가] 좋아요 개수
            "bookmarks_count",   # [추가] 북마크 개수
            "is_liked",          # [추가] 현재 사용자의 좋아요 여부
            "is_bookmarked",     # [추가] 현재 사용자의 북마크 여부
        ]
        read_only_fields = [
            "id",
            "user",              # [유지] 작성자는 서버에서 넣음
            "username",          # [유지] 계산값
            "created_at",
            "updated_at",
            "images",            # [유지] 별도 업로드 API로 처리
            "ai_result",         # [유지] AI 결과는 직접 입력하지 않음
            "likes_count",       # [유지] 계산값
            "bookmarks_count",   # [유지] 계산값
            "is_liked",          # [유지] 계산값
            "is_bookmarked",     # [유지] 계산값
        ]

    def get_username(self, obj):
        # [수정]
        # Soft Delete 구조에서 user가 null일 수 있으므로 안전 처리
        if obj.user:
            return obj.user.username
        return "탈퇴한 사용자"

    def get_ai_result(self, obj):
        # [수정]
        # 리뷰에 연결된 ai_result가 없으면 None 반환
        if not hasattr(obj, "ai_result"):
            return None

        # [유지]
        # AI 결과가 있으면 전용 serializer로 감싸서 응답
        return ReviewAISerializer(obj.ai_result).data

    def get_likes_count(self, obj):
        # [추가]
        # 현재 리뷰에 연결된 좋아요 총 개수 반환
        return obj.likes.count()

    def get_bookmarks_count(self, obj):
        # [추가]
        # 현재 리뷰에 연결된 북마크 총 개수 반환
        return obj.bookmarks.count()

    def get_is_liked(self, obj):
        # [추가]
        # 로그인한 현재 사용자가 이 리뷰에 좋아요를 눌렀는지 확인
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.likes.filter(user=request.user).exists()

    def get_is_bookmarked(self, obj):
        # [추가]
        # 로그인한 현재 사용자가 이 리뷰를 북마크했는지 확인
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.bookmarks.filter(user=request.user).exists()
```

핵심 수정 포인트
1. `username`
```python
username = serializers.SerializerMethodField()
```
- `[추가]`
- 리뷰 작성자 이름을 바로 프론트에 보내기 위한 필드
- `obj.user.username`을 꺼내서 응답함

---
2. `ai_result`
```python
ai_result = serializers.SerializerMethodField()
```
- `[수정]`
- AI 결과가 없는 리뷰도 있을 수 있으므로 안전하게 처리
- 없으면 `None`, 있으면 `ReviewAISerializer`로 변환

---
3. `ReviewAISerializer`
```python
class ReviewAISerializer(serializers.Serializer):
```
- `[수정]`
- `ModelSerializer`가 아니라 일반 `Serializer`
- 이유: 단계별 문서마다 `confidence`, `score`, `summary` 같은 필드 차이가 있어서 유연하게 대응하려는 목적

---
4. 좋아요/북마크 관련 필드
```python
likes_count  
bookmarks_count  
is_liked  
is_bookmarked
```
- `[추가]`
- 프론트엔드에서 바로 쓰기 좋게 계산값 포함
- 목록/상세 화면에서 추가 요청 없이 상태 표시 가능

---
5. `get_username()`
```python
if obj.user:  
    return obj.user.username  
return "탈퇴한 사용자"
```
- `[수정]`
- soft delete 구조와 `SET_NULL` 구조 때문에 user가 비어 있을 수 있음
- 그래서 안전하게 문자열 반환

---
serializer 파일의 역할을 한 줄씩 요약하면
- `ReviewImageSerializer`  
    → 리뷰 이미지 정보를 응답용 JSON으로 변환
- `ReviewAISerializer`  
    → AI 분석 결과를 유연하게 응답용 JSON으로 변환
- `ReviewSerializer`  
    → 리뷰 1개를 프론트가 쓰기 좋은 형태로 확장해서 응답

---
전체 흐름으로 보면
```
Review 객체  
   ↓  
ReviewSerializer  
   ↓  
작성자 이름(username)  
이미지 목록(images)  
AI 결과(ai_result)  
좋아요 수(likes_count)  
북마크 수(bookmarks_count)  
현재 사용자 상태(is_liked, is_bookmarked)  
   ↓  
프론트엔드에 JSON 응답
```
즉, 이 파일은 단순히 DB 값을 그대로 보내는 게 아니라
프론트가 바로 화면에 그리기 좋은 형태로 가공해서 보내는 역할입니다.

---
이 파일이 이번 단계의 핵심입니다.
현재 프로젝트의 `ReviewViewSet`은 `ModelViewSet` 기반이고, `destroy()`가 `perform_destroy(instance)`를 호출하고 있습니다. 여기서 `Review.delete()`가 soft delete로 바뀌면, API도 자동으로 논리 삭제가 됩니다. 다만 응답 문구와 권한 체크를 조금 더 명확히 하는 게 좋습니다.

`backend/apps/reviews/views.py`
```python
from django.shortcuts import get_object_or_404

from rest_framework import permissions, status, viewsets, generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Review, ReviewImage
from .serializers import (
    ReviewSerializer,
    ReviewImageSerializer,
    ReviewAISerializer,
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    [유지]
    작성자만 수정/삭제 가능하게 하는 권한 클래스
    - GET, HEAD, OPTIONS 같은 읽기 요청은 모두 허용
    - PUT, PATCH, DELETE 같은 수정 요청은 작성자만 허용
    """

    def has_object_permission(self, request, view, obj):
        # [유지]
        # 읽기 요청은 누구나 허용
        if request.method in permissions.SAFE_METHODS:
            return True

        # [유지]
        # 수정/삭제는 작성자 본인만 허용
        return obj.user == request.user


class ReviewViewSet(viewsets.ModelViewSet):
    """
    [수정]
    리뷰 CRUD API
    - 목록 조회
    - 상세 조회
    - 생성
    - 수정
    - 삭제

    현재 삭제 정책 변경 중:
    - 예전: DELETE 시 DB에서 실제 삭제(물리 삭제)
    - 지금: DELETE 시 is_deleted=True 처리(논리 삭제, Soft Delete)
    """

    serializer_class = ReviewSerializer

    # [유지]
    # 리뷰 생성/수정 시 일반 폼 데이터 + 파일 업로드 둘 다 받을 수 있게 설정
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        """
        [유지]
        요청 종류(action)에 따라 권한을 다르게 적용
        - list, retrieve: 누구나 조회 가능
        - create, update, partial_update, destroy: 로그인 필요 + 작성자 권한 검사
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        [수정]
        리뷰 조회용 기본 queryset

        Soft Delete 정책 변경 반영:
        - Review.objects 는 살아있는 데이터만 조회하는 기본 매니저
        - 따라서 삭제된 리뷰(is_deleted=True)는 자동으로 제외됨

        추가 기능:
        - user, product, ai_result는 JOIN 최적화
        - images, likes, bookmarks는 미리 조회해서 성능 개선
        - 공개 리뷰(is_public=True)만 노출
        - 최신순 정렬
        - product 쿼리파라미터가 있으면 상품별 필터링
        """
        queryset = (
            Review.objects   # [수정] Soft Delete 기본 매니저 사용
            .select_related("user", "product", "ai_result")
            .prefetch_related("images", "likes", "bookmarks")
            .filter(is_public=True)
            .order_by("-created_at")
        )

        # [유지]
        # /reviews/?product=1 형태로 들어오면 해당 상품 리뷰만 조회
        product_id = self.request.query_params.get("product")
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        return queryset

    def get_serializer_context(self):
        """
        [유지]
        serializer 안에서 request를 사용할 수 있도록 context에 담아 전달
        - 이미지 절대 URL 생성
        - 현재 사용자 기준 좋아요/북마크 여부 계산
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        """
        [유지]
        리뷰 생성 시 자동으로 현재 로그인 사용자를 작성자로 저장
        - 프론트에서 user를 직접 보내지 않아도 됨
        - 기본 공개 상태(is_public=True)로 저장
        """
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, is_public=True)
        else:
            raise ValidationError("리뷰 작성은 로그인 후 가능합니다.")

    def perform_update(self, serializer):
        """
        [유지]
        리뷰 수정 시 작성자 본인인지 한 번 더 확인
        - 권한 클래스가 있어도 안전하게 추가 검증
        """
        review = self.get_object()

        if review.user != self.request.user:
            raise PermissionDenied("본인 리뷰만 수정할 수 있습니다.")

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        [핵심 수정]
        삭제 정책 변경 부분

        예전 방식:
        - instance.delete() 가 물리 삭제였다면 DB에서 진짜 삭제됨

        지금 방식:
        - Review가 SoftDeleteModel을 상속받고
        - delete()가 논리 삭제로 바뀌었으므로
        - 여기서 instance.delete()를 호출하면
          실제 삭제가 아니라 is_deleted=True 로 변경됨
        """
        instance = self.get_object()

        # [유지]
        # 작성자 본인만 삭제 가능
        if instance.user != request.user:
            return Response(
                {"detail": "본인 리뷰만 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # [수정]
        # 물리 삭제 대신 soft delete 수행
        instance.delete()

        # [수정]
        # 프론트가 soft delete 여부를 알 수 있도록 응답 명시
        return Response(
            {
                "message": "리뷰가 삭제되었습니다.",
                "soft_deleted": True,
            },
            status=status.HTTP_200_OK,
        )


class MyReviewListAPIView(generics.ListAPIView):
    """
    [유지 + Soft Delete 영향 있음]
    내 리뷰 목록 조회 API
    - 로그인한 사용자의 리뷰만 보여줌
    - Review.objects 를 쓰므로 soft delete 된 리뷰는 자동 제외됨
    """

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        [수정 의미 있음]
        현재 로그인한 사용자의 리뷰만 조회
        - 삭제된 리뷰는 Soft Delete 기본 매니저 때문에 자동으로 빠짐
        """
        return (
            Review.objects   # [수정 의미] soft delete 반영된 기본 매니저
            .select_related("user", "product", "ai_result")
            .prefetch_related("images", "likes", "bookmarks")
            .filter(user=self.request.user)
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        """
        [유지]
        serializer 내부에서 request 사용 가능하게 전달
        """
        return {"request": self.request}


class ReviewImageUploadAPIView(APIView):
    """
    [유지]
    리뷰 이미지 업로드 API
    - 로그인한 사용자만 가능
    - 본인 리뷰에만 이미지 추가 가능
    - 여러 장 업로드 가능
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, review_id):
        """
        [유지 + Soft Delete 간접 반영]
        review_id에 해당하는 리뷰를 찾아 이미지 업로드

        Soft Delete 영향:
        - get_object_or_404(Review, id=review_id) 에서 Review.objects 사용
        - 따라서 삭제된 리뷰는 찾지 못함
        - 즉, 삭제된 리뷰에는 이미지 업로드가 자동 차단됨
        """
        review = get_object_or_404(Review, id=review_id)

        # [유지]
        # 본인 리뷰에만 이미지 업로드 가능
        if review.user != request.user:
            return Response(
                {"detail": "본인 리뷰에만 이미지를 추가할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # [유지]
        # 프론트에서 uploaded_images 이름으로 여러 파일 받기
        files = request.FILES.getlist("uploaded_images")

        # [유지]
        # 파일이 없으면 예외 응답
        if not files:
            return Response(
                {"detail": "업로드할 이미지가 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # [유지]
        # 여러 파일을 순회하며 DB에 저장
        created_images = []
        for file in files:
            image = ReviewImage.objects.create(
                review=review,
                image=file,
            )
            created_images.append(image)

        # [유지]
        # 저장된 이미지 목록을 serializer로 변환 후 응답
        serializer = ReviewImageSerializer(
            created_images,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReviewAIResultAPIView(APIView):
    """
    [유지 + Soft Delete 간접 반영]
    특정 리뷰의 AI 분석 결과 조회 API
    - 공개 조회 허용
    - 삭제된 리뷰는 기본 매니저 때문에 조회되지 않음
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, review_id):
        """
        [유지 + 수정 의미 있음]
        review_id에 해당하는 리뷰의 AI 결과를 반환

        Soft Delete 영향:
        - Review.objects.select_related("ai_result") 사용
        - 삭제된 리뷰는 자동 제외
        """
        review = get_object_or_404(
            Review.objects.select_related("ai_result"),
            id=review_id,
        )

        # [유지]
        # AI 결과가 아직 없으면 404 반환
        if not hasattr(review, "ai_result"):
            return Response(
                {"detail": "AI 분석 결과가 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # [유지]
        # AI 결과를 serializer로 변환해서 응답
        serializer = ReviewAISerializer(review.ai_result)
        return Response(serializer.data, status=status.HTTP_200_OK)
```
---
`backend/apps/reviews/admin.py` : 관리자(admin)에서 복구 기능 추가
```python
# apps/reviews/admin.py

from django.contrib import admin
from .models import Review, ReviewImage, ReviewAI


# [추가]
# 관리자에서 선택한 리뷰를 복구하는 액션
@admin.action(description="선택한 리뷰 복구")
def restore_reviews(modeladmin, request, queryset):
    for obj in queryset:
        obj.restore()   # Soft Delete 복구


# [추가]
# 관리자에서 선택한 리뷰를 진짜 DB에서 삭제하는 액션
@admin.action(description="선택한 리뷰 완전 삭제")
def hard_delete_reviews(modeladmin, request, queryset):
    for obj in queryset:
        obj.hard_delete()   # 물리 삭제


# [추가]
# 관리자에서 선택한 리뷰를 논리 삭제하는 액션
@admin.action(description="선택한 리뷰 삭제(논리 삭제)")
def soft_delete_reviews(modeladmin, request, queryset):
    for obj in queryset:
        obj.delete()   # Soft Delete 실행


class ReviewImageInline(admin.TabularInline):
    # [유지]
    # 리뷰 상세 화면에서 연결된 이미지들을 함께 보이게 함
    model = ReviewImage
    extra = 0


class ReviewAIInline(admin.StackedInline):
    # [유지]
    # 리뷰 상세 화면에서 AI 결과를 함께 보이게 함
    model = ReviewAI
    extra = 0
    can_delete = False   # [유지] 인라인에서 AI 결과 직접 삭제 방지


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    # [수정]
    # 목록에서 soft delete 관련 필드까지 보이도록 확장
    list_display = [
        "id",
        "product",
        "user",
        "rating",
        "is_public",
        "is_deleted",   # [추가] 삭제 여부 확인용
        "deleted_at",   # [추가] 삭제 시각 확인용
        "created_at",
    ]

    # [수정]
    # 삭제 여부로 필터링 가능하게 추가
    list_filter = [
        "is_public",
        "is_deleted",   # [추가]
        "created_at",
    ]

    # [유지]
    # 검색 필드
    search_fields = ["content", "product__name", "user__username"]

    # [추가]
    # 관리자 액션에 soft delete / restore / hard delete 추가
    actions = [soft_delete_reviews, restore_reviews, hard_delete_reviews]

    # [유지]
    # 리뷰 상세 화면에 이미지/AI 결과 함께 표시
    inlines = [ReviewImageInline, ReviewAIInline]

    def get_queryset(self, request):
        # [수정]
        # 기본 Review.objects 대신 Review.all_objects 사용
        # → 삭제된 리뷰도 관리자에서 보이게 함
        return Review.all_objects.select_related("user", "product").all()

    def delete_model(self, request, obj):
        # [수정]
        # 관리자 상세 화면에서 delete 시 물리 삭제가 아니라 soft delete 되도록 변경
        obj.delete()

    def delete_queryset(self, request, queryset):
        # [수정]
        # 관리자 목록에서 여러 개 삭제해도 물리 삭제가 아니라 soft delete 되도록 변경
        for obj in queryset:
            obj.delete()
```
이렇게 하면 운영 중 실수 삭제를 복구할 수 있습니다. 
이미 데이터가 있는 상태라면,  
`user` 필드를 `SET_NULL`로 바꿀 경우 `null=True`가 꼭 있어야 합니다.


마이그레이션 : 도커 환경으로 변경했으므로, 명령어도 컨테이너 기준으로 실행합니다.
```bash
docker compose exec web python manage.py makemigrations  
docker compose exec web python manage.py migrate  
docker compose exec web python manage.py showmigrations
```

확인할 것
- 새 마이그레이션 파일이 생성되었는지
- `migrate`가 정상 완료되었는지
- `showmigrations`에서 해당 앱 마이그레이션이 `[X]` 로 표시되는지

컨테이너 전체실행
```bash
docker compose up -d
```
- web (Django)
- db (PostgreSQL)
- redis
- celery
- fastapi
이 서비스들을 한꺼번에 띄움

관리자 페이지에서 삭제 전 데이터 확인
삭제 테스트 전, 먼저 대상 데이터를 하나 확인합니다.

만약 관리자 페이지가 영문으로 보인다면 settings.py에서 LANGUAGE_CODE 변경합니다
```python
LANGUAGE_CODE = "ko-kr" # ✅ 한국어로 변경
TIME_ZONE = "Asia/Seoul"
USE_I18N = True # 이게 False면 번역이 적용 안 됩니다.
```

컨테이너 환경이니까 서버 재시작 필요합니다.
```bash
docker compose restart web
```

---
### 관리자 페이지에서 삭제 여부(is_deleted) 확인하는 방법

관리자페이지에서 리뷰하나를 선택해서 삭제버튼을 누룹니다
![[Pasted image 20260324154441.png]]
삭제는 했으나 여전히 관리자페이지에 글이 남아 있습니다.

리뷰에 작성한 글이 보입니다.
![[Pasted image 20260324154616.png]]

삭제이후 글이 사라졌습니다.
![[Pasted image 20260324154655.png]]

관리자 페이지에는 여전히 글이 남아 있습니다. 단, 삭제 여부에 체크가 되어 삭제된 글인것을 확인할수 있습니다.
![[Pasted image 20260324154754.png]]

---
### shell에서 삭제 여부(is_deleted) 확인하는 방법
```bash
docker compose exec web python manage.py shell
```

특정 글 1개 확인
```python
from apps.reviews.models import Review

review = Review.all_objects.get(id=25)   # ← 확인할 ID

print(review.is_deleted)
print(review.deleted_at)
```
결과
```
Python 3.12.13 (main, Mar 16 2026, 23:06:54) [GCC 14.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
(InteractiveConsole)
>>> from apps.reviews.models import Review
>>> 
>>> review = Review.all_objects.get(id=25)   # ← 확인할 ID
>>> 
>>> print(review.is_deleted)
True
>>> print(review.deleted_at)
2026-03-24 06:42:02+00:00
>>> 
```

###### 결과 해석
| 값                 | 의미        |
| ----------------- | --------- |
| `True`            | 삭제된 상태    |
| `False`           | 정상 상태     |
| `deleted_at 있음`   | 삭제 시각 기록됨 |
| `deleted_at None` | 삭제 안됨     |

삭제된 글만 조회
```python
for r in Review.all_objects.filter(is_deleted=True):
    print(r.id, r.content)
```
결과
```
>>> for r in Review.all_objects.filter(is_deleted=True):
...     print(r.id, r.content)
... 
26 두번째 글이 삭제되나?
25 이글이 삭제되는지 테스트 합니다.
>>> 
```
id=26 → 삭제됨
id=25 → 삭제됨
두 개의 글이 현재 삭제 상태(is_deleted=True) 입니다.

---
Soft Delete가 제대로 동작하는지 검증한 테스트 로그
```bash
docker compose exec web python manage.py shell
```

```python
from apps.reviews.models import Review

# 전체 개수 확인
print("전체(삭제 제외):", Review.objects.count()) 
print("전체(삭제 포함):", Review.all_objects.count())

# 삭제 전 상태
review = Review.objects.first()
print("삭제 전:", review.id, review.is_deleted)

# 삭제 실행
review.delete()

# 삭제 후 기본 조회
print("삭제 후 기본 조회:", Review.objects.filter(id=review.id).exists()) 

# 삭제 후 전체 조회
print("삭제 후 전체 조회:", Review.all_objects.filter(id=review.id).exists())


deleted_review = Review.all_objects.get(id=review.id)
print(deleted_review.is_deleted, deleted_review.deleted_at)

# 복구 실행
deleted_review.restore()

# 복구 후 확인
print("복구 후 기본 조회:", Review.objects.filter(id=review.id).exists()) # True 기대
```
결과
```
>>> from apps.reviews.models import Review
>>> 
>>> print("전체(삭제 제외):", Review.objects.count())
전체(삭제 제외): 3
>>> print("전체(삭제 포함):", Review.all_objects.count())
전체(삭제 포함): 5
>>> 
>>> review = Review.objects.first()
>>> print("삭제 전:", review.id, review.is_deleted)
삭제 전: 24 False
>>> 
>>> review.delete()
>>> 
>>> # False 기대
>>> print("삭제 후 기본 조회:", Review.objects.filter(id=review.id).exists()) 
삭제 후 기본 조회: False
>>> 
>>> # True 기대
>>> print("삭제 후 전체 조회:", Review.all_objects.filter(id=review.id).exists())
삭제 후 전체 조회: True
>>> 
>>> deleted_review = Review.all_objects.get(id=review.id)
>>> print(deleted_review.is_deleted, deleted_review.deleted_at)
True 2026-03-24 09:47:43.731198+00:00
>>> 
>>> deleted_review.restore()
>>> 
>>> print("복구 후 기본 조회:", Review.objects.filter(id=review.id).exists()) # True 기대
복구 후 기본 조회: True
>>> 
```
✔ Soft Delete 정상  
✔ 기본 조회 필터 정상  
✔ 전체 조회 분리 정상  
✔ 삭제 처리 정상  
✔ 복구 기능 정상
    -> 완성도 100% 상태

DB에서는 안 지우고, 화면에서만 숨겼다가 다시 살릴 수 있는 구조가 완벽하게 동작하고 있다

---
문제가 있을때 Docker에서 Dongo 로그 확인하는 명령어
```bash
docker compose logs -f web
```
---
### 크롤링 안정성 코드

크롤링은 단순히 `requests.get()` 한 번 보내서 HTML을 가져오는 작업이 아닙니다.  
실제 서비스나 프로젝트에서 크롤링을 돌리다 보면, 처음에는 잘 되다가도 어느 순간 사이트에서 요청을 막거나, 네트워크가 잠깐 불안정해서 수집이 실패하거나, 너무 많은 요청을 짧은 시간에 보내서 차단당하는 일이 자주 발생합니다. 그래서 “크롤링이 되게 만드는 코드”와 “크롤링이 오래 버티게 만드는 코드”는 다릅니다. 이 단계에서 하는 작업은 바로 그 차이를 만드는 것입니다

이번 단계의 목표는 크롤링 요청을 좀 더 사람처럼, 조심스럽게, 실패에 대비하면서 보내도록 구조를 바꾸는 것입니다. 즉, 예전에는 각 크롤링 파일 안에서 필요할 때마다 바로 `requests.get()`을 호출했다면, 이제는 그런 요청을 한 군데에서 공통으로 처리하도록 바꾸는 것입니다. 그렇게 하면 나중에 정책을 바꾸거나 차단 대응 로직을 추가할 때도 한 파일만 수정하면 전체 크롤링에 반영할 수 있습니다

쉽게 말하면, 이번 작업은 다음과 같은 문제를 줄이기 위한 것입니다.
- 너무 빠르게 요청해서 사이트에 의해 차단되는 문제
- 일시적인 네트워크 오류 때문에 수집이 중간에 실패하는 문제
- robots.txt 정책을 무시해서 수집 예절을 어기게 되는 문제
- 각 크롤러 파일마다 요청 코드가 제각각이라 유지보수가 어려운 문제

즉, 결론은 사이트가 크롤링을 허락하지 않으면, 우리 코드가 직접 차단하도록 바뀐 것입니다.

예전코드(12번 파일)
```python
response = requests.get(url)
```
특징:
- 그냥 무조건 요청 보냄
- 사이트 허락 여부 안 봄
- 빠르게 막힐 가능성 높음

이렇게 하면:
- ❌ 사이트에서 IP 차단
- ❌ 403 Forbidden
- ❌ 크롤링 중간에 죽음
- ❌ 법적/정책 문제 가능

그래서 바꾼 것은 사람처럼 조심스럽게 크롤링하자 입니다.
그래서 이걸 추가한 겁니다:
- 요청 간격 랜덤
- 재시도
- User-Agent 변경
- 🔥 robots.txt 체크 이게 핵심입니다

robots.txt가 뭐냐
사이트에는 이런 파일이 있습니다:
```
https://example.com/robots.txt
```
이 안에는 이런 내용이 있음:
```
User-agent: *  
Disallow: /search
```
검색 페이지는 크롤링 하지 마세요

그래서 코드가 어떻게 바뀐것이냐 여기부터가 핵심입니다.
추가된 코드
```python
def fetch_page(url: str):
    if not is_allowed_by_robots(url):
        raise ValueError("robots.txt 정책상 수집 불가")
```
이 한 줄이 모든 걸 바꾼 겁니다.

이전에는 `requests.get(url)` 무조건 실행 되었다면
지금은
```python
if robots 허용:
    요청 보냄
else:
    에러 발생
```
즉, 코드가 직접 차단

그래서 지금 네 로그가 이렇게 나온 것
```bash
[FAIL] robots.txt 정책상 수집 불가 URL입니다
```
의미:
1. 요청 보내기 전에
2. robots.txt 확인함
3. 다나와가 검색 페이지 크롤링 금지 상태
4. 그래서 코드가 요청을 안 보내고 막음

전체 흐름
```
크로링 실행
    ↓
URL 분석
    ↓
robots.txt 주소 생성
    ↓
그 사이트 서버에서 robots.txt 가져옴
    ↓
Disallow 규칙 확인
    ↓
크롤링 가능 / 불가 판단
```

---
### 그래서 아래 코드는 다음과 같은 내용을 변경합니다.

`apps/crawling/services/http.py` : 수정
```python
# [수정] 안정성 향상을 위해 random / time / robots / retry 관련 import 추가
import random
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from requests import RequestException


USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
]


def build_headers(extra_headers=None):
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


def is_allowed_by_robots(url: str, user_agent: str = "*") -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    rp = RobotFileParser()
    rp.set_url(robots_url)

    try:
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception as e:
        raise ValueError(f"robots.txt 확인 실패: {robots_url} / {e}")


def get_with_retry(
    url: str,
    headers=None,
    retries: int = 3,
    min_delay: float = 1.0,
    max_delay: float = 3.0,
    timeout: int = 10,
):
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            time.sleep(random.uniform(min_delay, max_delay))

            response = requests.get(
                url,
                headers=build_headers(headers),
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


def fetch_page(url: str, timeout: int = 15) -> requests.Response:
    if not is_allowed_by_robots(url):
        raise ValueError(f"robots.txt 정책상 수집 불가 URL입니다: {url}")

    return get_with_retry(
        url=url,
        timeout=timeout,
        retries=3,
        min_delay=1.0,
        max_delay=3.0,
    )
```
---
12번 에서는 `http.py`가 원래 단순히 `requests.get()`만 하던 구조였고, 24번 에서는 이를 UA 회전, 지연, 재시도, robots 체크가 있는 공통 유틸로 바꾸는 것이 핵심이라고 설명하고 있습니다. 그래서 이 파일은 전면 교체합니다.

---
`backend/apps/crawling/services/crawl_service.py` : 수정
```python
# backend/apps/crawling/services/crawl_service.py

from django.utils import timezone

from apps.crawling.models import CrawlRawData
from .http import fetch_page          # 페이지 요청 (robots + retry 포함)
from .parser import extract_page_info # HTML 분석해서 정보 추출


def crawl_search_target(target):
    """
    검색 페이지 크롤링 함수

    전체 흐름:
    1. 페이지 요청
    2. HTML 파싱
    3. 페이지 정보 저장
    4. (있다면) 상품 링크 저장
    5. 마지막 크롤링 시간 업데이트
    """

    # 1️⃣ 페이지 요청
    # → 내부적으로 robots.txt 검사 + retry + delay 적용됨
    response = fetch_page(target.url)

    # HTML 문자열 추출
    html = response.text


    # 2️⃣ HTML 분석 (파싱)
    # → 제목, 텍스트, a 태그 개수 등 추출
    page_info = extract_page_info(html)


    # 3️⃣ 상품 링크 후보 리스트
    # ⚠ 현재는 구현 안되어 있어서 빈 리스트
    candidate_links = []


    # 4️⃣ 페이지 전체 정보 저장 (로그 성격)
    CrawlRawData.objects.create(
        target=target,                 # 어떤 크롤링 대상인지
        source_url=target.url,         # 요청한 URL
        page_title=page_info["title"], # 페이지 제목
        raw_text=page_info["text_preview"],  # 일부 텍스트
        raw_html=html[:5000],          # HTML 일부 저장 (너무 크니까 잘라서 저장)

        # 추가 정보(JSON)
        extra_data={
            "a_count": page_info["a_count"],  # 링크 개수
            "contains_review_word": page_info["contains_review_word"],  # 리뷰 관련 단어 포함 여부
            "contains_keyword": page_info["contains_keyword"],          # 키워드 포함 여부
            "type": "page_info",  # 데이터 타입 구분용
        },
    )


    # 5️⃣ 상품 링크 저장 (있다면)
    # → 현재는 candidate_links가 빈 리스트라 실행 안됨
    for item in candidate_links[:20]:

        CrawlRawData.objects.create(
            target=target,
            source_url=target.url,
            page_title=page_info["title"],

            # 상품 정보
            item_title=item["title"],   # 상품 이름
            item_url=item["url"],       # 상품 링크

            raw_text="",
            raw_html="",

            extra_data={
                "type": "candidate_link",  # 이 데이터는 링크 정보임
            },
        )


    # 6️⃣ 마지막 크롤링 시간 업데이트
    target.last_crawled_at = timezone.now()
    target.save(update_fields=["last_crawled_at"])


    # 7️⃣ 결과 반환 (로그/테스트용)
    return {
        "page_title": page_info["title"],       # 페이지 제목
        "candidate_count": len(candidate_links), # 추출된 링크 개수
    }
```

왜 이 파일은 크게 안 바꾸는가
24번 에서도 명확히 말하듯이, 기존 `crawl_service.py`는 이미 `fetch_page()`를 쓰고 있었기 때문에 여기까지 갈아엎을 필요는 없고, 새 `fetch_page()`를 그대로 타게 하는 방식이 가장 안전합니다.

---
`backend/apps/crawling/management/commands/scheduled_crawl.py` : 추가
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlTarget, CrawlJobLog
from apps.crawling.services.crawl_service import crawl_search_target


class Command(BaseCommand):
    help = "스케줄 크롤링 실행 (limit 기반 분산 수집)"

    def add_arguments(self, parser):
        # [추가] 한 번에 너무 많이 긁지 않도록 limit 옵션 추가
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="한 번 실행할 최대 target 개수",
        )

    def handle(self, *args, **options):
        limit = options["limit"]

        # [추가]
        # 아직 오래 안 돌린 것부터(limit만큼) 가져와서 분산 수집
        targets = CrawlTarget.objects.filter(
            is_active=True,
            target_type="search",
        ).order_by("last_crawled_at", "id")[:limit]

        total_targets = targets.count()
        success_count = 0
        fail_count = 0
        site_summary = {}

        # [추가] 실행 로그 생성
        log = CrawlJobLog.objects.create(
            site="all",
            command_name="scheduled_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message=f"scheduled_crawl 시작 (limit={limit})",
        )

        if total_targets == 0:
            self.stdout.write(self.style.WARNING("수집할 대상이 없습니다."))
            log.message = "수집할 대상이 없습니다."
            log.finished_at = timezone.now()
            log.save(update_fields=["message", "finished_at"])
            return

        self.stdout.write(
            self.style.SUCCESS(f"scheduled_crawl 시작 - 대상 {total_targets}건")
        )

        for target in targets:
            self.stdout.write(f"[START] {target.id} - {target.title}")

            try:
                result = crawl_search_target(target)
                success_count += 1

                site_summary[target.site] = site_summary.get(target.site, 0) + 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"[OK] {target.id} "
                        f"title={result['page_title']} "
                        f"candidate_count={result['candidate_count']}"
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f"[FAIL] {target.id}: {e}")
                )

        final_status = "success" if fail_count == 0 else "failed"

        # [추가] 실행 결과 로그 갱신
        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = f"사이트별 처리 수: {site_summary}"
        log.finished_at = timezone.now()
        log.save(
            update_fields=[
                "status",
                "success_count",
                "fail_count",
                "message",
                "finished_at",
            ]
        )

        self.stdout.write(self.style.SUCCESS("scheduled_crawl 종료"))
        self.stdout.write(
            self.style.SUCCESS(
                f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count}"
            )
        )
```

왜 이 파일을 새로 추가하는가
24번 문서에서는 `scheduled_crawl.py`를 limit 기반 분산 수집용 명령어로 추가하자고 했고, 12번 문서의 흐름도 역시 “스케줄러가 일정 수만 골라 실행”하는 구조를 지향합니다. 그래서 이 파일은 **추가가 맞습니다.** 다만 저는 `target_selector.py`까지 바로 끌어오지 않고, 현재 모델만으로 바로 동작하는 버전으로 정리했습니다.

---
마이그레이션 순서
`Review.user`가 `SET_NULL`로 바뀌므로 `null=True`가 반드시 있어야 합니다.
지금 코드에는 이미 넣어놨으나 이 점을 주의해야 합니다

```bash
cd backend

docker compose up -d  
docker compose exec web python manage.py makemigrations 
docker compose exec web python manage.py migrate

# 확인
docker compose exec web python manage.py showmigrations 


# 로그 확인
docker compose logs -f web
```
`core`는 추상모델만 두는 폴더라서 별도 마이그레이션 대상이 아닙니다.

---

크롤링 안정성 테스트
```bash
docker compose exec web python manage.py scheduled_crawl --limit 3
```
결과
```
(.venv) (.venv) youjung@DESKTOP-PJCRMMU:~/product-review-service/backend$ docker compose exec web python manage.py scheduled_crawl --limit 3
WARN[0000] /home/youjung/product-review-service/backend/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion 
scheduled_crawl 시작 - 대상 1건
[START] 1 - 다나와 수분 보습크림 검색
[FAIL] 1: robots.txt 정책상 수집 불가 URL입니다: https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84+%EB%B3%B4%EC%8A%B5%ED%81%AC%EB%A6%BC
scheduled_crawl 종료
총 1개 / 성공 0 / 실패 1
```

---
지금 로그 해석

1. 이건 문제 아님
```
System check identified no issues (0 silenced).
```

뜻:
- Django 설정 문제 없음
- import 문제 없음
- 명령어 실행 구조 정상

---
2. 실제 실패 원인
```
[FAIL] 1: robots.txt 정책상 수집 불가 URL입니다:  
https://search.danawa.com/dsearch.php?query=...
```

뜻:
- 코드가 `fetch_page()` 안에서 요청 보내기 전에
- `robots.txt` 정책을 먼저 확인했고
- 그 결과 **해당 URL은 수집하면 안 된다고 판단해서 직접 막은 것**

즉, 지금은 코드가 고장난 게 아니라 네가 넣은 크롤링 정책이 동작한 것입니다.

---
핵심 결론
지금은 두 가지가 분리되어 있습니다.

해결된 것
- `extract_candidate_links` 관련 import/call 에러 해결됨
- `scheduled_crawl.py` 실행 가능
- `crawl_service.py` 진입 가능

새로 확인된 것
- 다나와 검색 URL이 **robots 정책 검사**에서 막힘

즉,  
코드 오류 → 해결됨  
크롤링 정책 차단 → 현재 남아 있음

---
왜 이런 일이 생기나

24번에서 넣은 방향이 이거였죠.
- robots.txt 확인
- 허용된 경우만 requests 진행
- 허용 안 되면 예외 발생

그러니까 지금 실패는 사실상 정상 동작입니다.

코드 입장에서는 이렇게 동작한 겁니다.
```
if not is_allowed_by_robots(url):  
    raise ValueError(f"robots.txt 정책상 수집 불가 URL입니다: {url}")
```
즉, 네 코드가 일부러 막은 것입니다.

---
지금 무엇을 수정해야 하나
여기서 선택지는 2개입니다.

1. 이 정책을 유지할 경우
다나와 검색 페이지는 현재 수집하지 않음

즉:
- 코드 수정 없이 그대로 둠
- `scheduled_crawl`에서 다나와는 실패 처리
- 화해 / 글로우픽 같은 다른 대상만 먼저 테스트

이건 윤리 정책을 강하게 지키는 방식입니다.

---
2. robots 실패 시 전체 차단을 완화할 경우
현재 `http.py` 정책을 조금 바꿔야 합니다.

예를 들어 지금은:
- robots 확인 실패 또는 불가 → 바로 예외
- 그래서 크롤링 중단

이걸 바꾸면:
- robots 확인 실패 → 로그만 남김
- 혹은 검색 페이지만 예외 처리
- 혹은 사이트별로 정책 분기 이런 식이 됩니다.

---
지금 네가 이해해야 할 가장 중요한 포인트
현재 실패는 코드가 틀려서가 아닙니다.  
정책상 막도록 작성한 코드가 그대로 동작한 것입니다.

즉, 지금은
- `crawl_service.py` 에러를 잡는 단계는 통과했고
- 이제 `http.py`의 정책 수준을 어떻게 둘지 결정하는 단계입니다.

---
어디를 보면 되나
수정 후보 파일은 이쪽입니다.
```
backend/apps/crawling/services/http.py
```

여기 안에 아마 이런 흐름이 있을 겁니다.
```
if not is_allowed_by_robots(url):  
    raise ValueError(...)
```
이 부분 때문에 지금 다나와가 막힌 것입니다.

---
지금 가장 안전한 판단
지금 당장 크게 바꾸지 말고, 먼저 이렇게 판단하면 됩니다.

현재 상태 판정
- import 에러 해결됨
- 실행 흐름 정상
- 정책 검사 때문에 차단됨

즉, 24번 수정 중 크롤링 윤리 정책 부분이 실제로 동작하고 있는 것입니다.

---
다음 진행 추천

그대로 정책 유지
다나와는 제외하고 다른 사이트 대상부터 테스트

또는
정책 완화
`http.py`에서 robots 차단 방식을 완화

---
warning도 같이 정리
이건 경고일 뿐입니다.
```
the attribute `version` is obsolete
```

뜻:
- `docker-compose.yml` 상단의 `version:` 키는 요즘 docker compose에서는 거의 안 씀
- 실행에는 큰 문제 없음
- 나중에 지워도 됨

즉, 지금 실패 원인과는 무관합니다.