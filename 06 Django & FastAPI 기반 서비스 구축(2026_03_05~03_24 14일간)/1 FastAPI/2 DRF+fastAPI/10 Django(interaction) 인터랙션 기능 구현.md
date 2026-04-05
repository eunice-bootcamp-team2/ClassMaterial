인터렉티브를 추가하기 위해 수정해야하는 파일들
```
# interactions 앱 : 인터랙션 기능의 중심
backend/apps/interactions/models.py
backend/apps/interactions/serializers.py
backend/apps/interactions/views.py
backend/apps/interactions/urls.py

# reviews 앱 : 리뷰 앱에서 연결되는 부분
backend/apps/reviews/views.py
backend/apps/reviews/serializers.py

# 탬플릿에 영향주는 JS : 화면에서 실제로 보이고 동작하는 부분
backend/static/js/product-list.js

interactions 앱 = 기능의 본체 
reviews 앱 = 리뷰 응답에
```
---
관계도
```
User
 │
 ├── ReviewLike
 ├── ReviewBookmark
 ├── ReviewComment
 └── ReviewReport
        │
        ▼
      Review
		 ├── likes
		 ├── bookmarks
		 ├── comments
		 └── reports     
```

`backend/apps/interactions/models.py`
```python
from django.db import models
from django.conf import settings


class ReviewLike(models.Model):
    """
    리뷰 좋아요 모델
    - 한 사용자가 하나의 리뷰에 좋아요를 누르는 정보 저장
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="likes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ("user", "review")

        # [10번에서 변경] 최신순 정렬 추가
        ordering = ["-id"]

    # [10번에서 변경] 관리자/디버깅용 문자열 표시 추가
    def __str__(self):
        return f"{self.user} - {self.review}"


class ReviewBookmark(models.Model):
    """
    리뷰 북마크 모델
    - 사용자가 나중에 보기 위해 리뷰를 저장하는 기능
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="bookmarks"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        # [10번에서 변경] 북마크도 중복 방지 제약 추가
        unique_together = ("user", "review")

        # [10번에서 변경] 최신순 정렬 추가
        ordering = ["-id"]

    # [10번에서 변경] 관리자/디버깅용 문자열 표시 추가
    def __str__(self):
        return f"{self.user} - {self.review}"


class ReviewComment(models.Model):
    """
    리뷰 댓글 모델
    - 리뷰에 대한 사용자 댓글 저장
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="comments"
    )

    content = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    # [10번에서 변경] 댓글 수정 시간 추가
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        # [10번에서 변경] 최신 댓글 우선 정렬 추가
        ordering = ["-id"]

    # [10번에서 변경] 관리자/디버깅용 문자열 표시 추가
    def __str__(self):
        return f"{self.user} - {self.review}"


class ReviewReport(models.Model):
    """
    리뷰 신고 모델
    - 부적절한 리뷰를 신고하는 기능
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reason = models.CharField(
        max_length=255
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        # [10번에서 변경] 신고도 중복 방지 제약 추가
        unique_together = ("user", "review")

        # [10번에서 변경] 최신 신고 우선 정렬 추가
        ordering = ["-id"]

    # [10번에서 변경] 관리자/디버깅용 문자열 표시 추가
    def __str__(self):
        return f"{self.user} - {self.review}"
```

`backend/apps/interactions/serializers.py`
```python
from rest_framework import serializers

from .models import (
    ReviewLike,
    ReviewBookmark,
    ReviewComment,
    ReviewReport,
)


class ReviewLikeSerializer(serializers.ModelSerializer):
    """
    리뷰 좋아요 Serializer
    """

    class Meta:
        model = ReviewLike
        fields = [
            "id",
            "user",
            "review",
            "created_at",
        ]

        # [10번에서 변경] user를 request.user로 처리하는 구조에 맞게
        # id, user, created_at을 읽기 전용으로 추가
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


class ReviewBookmarkSerializer(serializers.ModelSerializer):
    """
    리뷰 북마크 Serializer
    """

    class Meta:
        model = ReviewBookmark
        fields = [
            "id",
            "user",
            "review",
            "created_at",
        ]

        # [10번에서 변경] 북마크도 user를 직접 받지 않고
        # View에서 자동 처리할 수 있도록 읽기 전용 필드 추가
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]


class ReviewCommentSerializer(serializers.ModelSerializer):
    """
    리뷰 댓글 Serializer
    """

    # [10번에서 변경] 댓글 작성자의 username 표시용 필드 추가
    # source="user.username" 으로 User 모델의 username을 응답에 포함
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    class Meta:
        model = ReviewComment
        fields = [
            "id",
            "user",

            # [10번에서 변경] 작성자 username 응답 필드 추가
            "username",

            "review",
            "content",
            "created_at",

            # [10번에서 변경] models.py에 추가된 updated_at 반영
            "updated_at",
        ]

        # [10번에서 변경] 댓글은 user, review를 View/URL에서 처리하는 구조라
        # 클라이언트 수정 불가 필드들을 읽기 전용으로 추가
        read_only_fields = [
            "id",
            "user",
            "username",
            "review",
            "created_at",
            "updated_at",
        ]


class ReviewReportSerializer(serializers.ModelSerializer):
    """
    리뷰 신고 Serializer
    """

    # [10번에서 변경] 신고자 username 표시용 필드 추가
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    class Meta:
        model = ReviewReport
        fields = [
            "id",
            "user",

            # [10번에서 변경] 신고자 username 응답 필드 추가
            "username",

            "review",
            "reason",
            "created_at",
        ]

        # [10번에서 변경] 신고도 user, review를 View에서 자동 처리하므로
        # 읽기 전용 필드 추가
        read_only_fields = [
            "id",
            "user",
            "username",
            "review",
            "created_at",
        ]
```

`backend/apps/interactions/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.reviews.models import Review

from .models import (
    ReviewLike,
    ReviewBookmark,
    ReviewComment,
    ReviewReport,
)

from .serializers import (
    ReviewCommentSerializer,
    ReviewReportSerializer,
)


# [10번에서 추가]
# 리뷰 좋아요 토글 APIView 추가
class ReviewLikeToggleAPIView(APIView):
    """
    리뷰 좋아요 토글 API

    기능
    - 이미 좋아요가 있으면 삭제 (좋아요 취소)
    - 없으면 생성 (좋아요 추가)

    요청 방식
    POST /reviews/{review_id}/like/
    """

    # [10번에서 추가] 로그인 사용자만 좋아요 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):

        # [10번에서 추가] review_id로 대상 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 이미 좋아요가 있으면 가져오고, 없으면 생성
        obj, created = ReviewLike.objects.get_or_create(
            review=review,
            user=request.user
        )

        # [10번에서 추가] 이미 존재하면 좋아요 취소
        if not created:
            obj.delete()
            liked = False
        else:
            # [10번에서 추가] 새로 생성되면 좋아요 상태 True
            liked = True

        # [10번에서 추가] 현재 리뷰의 전체 좋아요 개수 반환
        count = ReviewLike.objects.filter(review=review).count()

        return Response(
            {
                "liked": liked,
                "like_count": count,
            },
            status=status.HTTP_200_OK
        )


# [10번에서 추가]
# 리뷰 북마크 토글 APIView 추가
class ReviewBookmarkToggleAPIView(APIView):
    """
    리뷰 북마크 토글 API

    기능
    - 북마크 추가 / 북마크 취소
    """

    # [10번에서 추가] 로그인 사용자만 북마크 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):

        # [10번에서 추가] 대상 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 북마크가 있으면 가져오고, 없으면 생성
        obj, created = ReviewBookmark.objects.get_or_create(
            review=review,
            user=request.user
        )

        # [10번에서 추가] 이미 있으면 북마크 취소
        if not created:
            obj.delete()
            bookmarked = False
        else:
            bookmarked = True

        # [10번에서 추가] 현재 리뷰의 전체 북마크 수 계산
        count = ReviewBookmark.objects.filter(review=review).count()

        return Response(
            {
                "bookmarked": bookmarked,
                "bookmark_count": count,
            },
            status=status.HTTP_200_OK
        )


# [10번에서 추가]
# 리뷰 댓글 생성 APIView 추가
class ReviewCommentCreateAPIView(APIView):
    """
    리뷰 댓글 생성 API

    요청
    POST /reviews/{review_id}/comments/

    body
    {
        "content": "댓글 내용"
    }
    """

    # [10번에서 추가] 로그인 사용자만 댓글 작성 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):

        # [10번에서 추가] 댓글 대상 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 요청 body에서 댓글 내용 추출
        content = request.data.get("content", "").strip()

        # [10번에서 추가] 빈 댓글 방지
        if not content:
            return Response(
                {"detail": "내용이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # [10번에서 추가] 댓글 생성
        comment = ReviewComment.objects.create(
            review=review,
            user=request.user,
            content=content
        )

        # [10번에서 추가] serializer로 응답 데이터 변환
        serializer = ReviewCommentSerializer(comment)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


# [10번에서 추가]
# 리뷰 댓글 목록 조회 APIView 추가
class ReviewCommentListAPIView(APIView):
    """
    리뷰 댓글 목록 조회 API

    요청
    GET /reviews/{review_id}/comments/
    """

    # [10번에서 추가] 댓글 조회는 비로그인 사용자도 가능
    permission_classes = [AllowAny]

    def get(self, request, review_id):

        # [10번에서 추가] 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 해당 리뷰의 댓글을 최신순으로 조회
        comments = ReviewComment.objects.filter(
            review=review
        ).order_by("-created_at")

        # [10번에서 추가] 여러 개 댓글 직렬화
        serializer = ReviewCommentSerializer(comments, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# [10번에서 추가]
# 리뷰 댓글 수정 / 삭제 APIView 추가
class ReviewCommentDetailAPIView(APIView):
    """
    리뷰 댓글 수정 / 삭제 API

    수정
    PATCH /comments/{comment_id}/

    삭제
    DELETE /comments/{comment_id}/
    """

    # [10번에서 추가] 로그인 사용자만 수정/삭제 가능
    permission_classes = [IsAuthenticated]

    def patch(self, request, comment_id):

        # [10번에서 추가] 수정 대상 댓글 조회
        comment = get_object_or_404(ReviewComment, id=comment_id)

        # [10번에서 추가] 본인 댓글만 수정 가능
        if comment.user != request.user:
            return Response(
                {"detail": "본인 댓글만 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        # [10번에서 추가] 수정할 내용 추출
        content = request.data.get("content", "").strip()

        # [10번에서 추가] 빈 내용 수정 방지
        if not content:
            return Response(
                {"detail": "내용이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # [10번에서 추가] 댓글 내용 수정 후 저장
        comment.content = content
        comment.save()

        serializer = ReviewCommentSerializer(comment)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, comment_id):

        # [10번에서 추가] 삭제 대상 댓글 조회
        comment = get_object_or_404(ReviewComment, id=comment_id)

        # [10번에서 추가] 본인 댓글만 삭제 가능
        if comment.user != request.user:
            return Response(
                {"detail": "본인 댓글만 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        # [10번에서 추가] 댓글 삭제
        comment.delete()

        return Response(
            {"detail": "댓글이 삭제되었습니다."},
            status=status.HTTP_204_NO_CONTENT
        )


# [10번에서 추가]
# 리뷰 신고 생성 APIView 추가
class ReviewReportCreateAPIView(APIView):
    """
    리뷰 신고 생성 API

    요청
    POST /reviews/{review_id}/report/

    body
    {
        "reason": "스팸 리뷰"
    }
    """

    # [10번에서 추가] 로그인 사용자만 신고 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):

        # [10번에서 추가] 신고 대상 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 신고 사유 추출
        reason = request.data.get("reason", "").strip()

        # [10번에서 추가] 신고 사유 없으면 오류
        if not reason:
            return Response(
                {"detail": "신고 사유가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # [10번에서 추가] 신고 생성
        report = ReviewReport.objects.create(
            review=review,
            user=request.user,
            reason=reason
        )

        serializer = ReviewReportSerializer(report)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


# [10번에서 추가]
# 리뷰 신고 목록 조회 APIView 추가
class ReviewReportListAPIView(APIView):
    """
    리뷰 신고 목록 조회 API
    (관리자 확인용)

    GET /reviews/{review_id}/reports/
    """

    # [10번에서 추가] 현재 문서 기준으로 로그인 필요
    permission_classes = [IsAuthenticated]

    def get(self, request, review_id):

        # [10번에서 추가] 리뷰 조회
        review = get_object_or_404(Review, id=review_id)

        # [10번에서 추가] 해당 리뷰의 신고 목록 조회
        reports = ReviewReport.objects.filter(
            review=review
        ).order_by("-created_at")

        serializer = ReviewReportSerializer(reports, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
```

`backend/apps/interactions/urls.py`
```python
from django.urls import path

# interactions 앱에서 사용하는 APIView import
from .views import (
    ReviewLikeToggleAPIView,        # 리뷰 좋아요 토글 API
    ReviewBookmarkToggleAPIView,    # 리뷰 북마크 토글 API
    ReviewCommentCreateAPIView,     # 리뷰 댓글 생성 API
    ReviewCommentListAPIView,       # 리뷰 댓글 목록 조회 API
    ReviewCommentDetailAPIView,     # 리뷰 댓글 수정 / 삭제 API
    ReviewReportCreateAPIView,      # 리뷰 신고 생성 API
    ReviewReportListAPIView,        # 리뷰 신고 목록 조회 API
)

# interactions 앱의 URL 패턴 정의
urlpatterns = [

    # ---------------------------------------------------------
    # 리뷰 좋아요 토글
    #
    # 기능
    # - 이미 좋아요가 있으면 취소
    # - 없으면 좋아요 추가
    #
    # 요청 방식
    # POST /interaction/like/<review_id>/
    #
    # 예시
    # POST /interaction/like/5/
    # → review id=5에 좋아요 토글
    # ---------------------------------------------------------
    path(
        "like/<int:review_id>/",
        ReviewLikeToggleAPIView.as_view(),
        name="review-like-toggle"
    ),


    # ---------------------------------------------------------
    # 리뷰 북마크 토글
    #
    # 기능
    # - 북마크 추가 / 취소
    #
    # 요청 방식
    # POST /interaction/bookmark/<review_id>/
    #
    # 예시
    # POST /interaction/bookmark/5/
    # ---------------------------------------------------------
    path(
        "bookmark/<int:review_id>/",
        ReviewBookmarkToggleAPIView.as_view(),
        name="review-bookmark-toggle"
    ),


    # ---------------------------------------------------------
    # 리뷰 댓글 등록
    #
    # 기능
    # - 특정 리뷰에 댓글 생성
    #
    # 요청 방식
    # POST /interaction/comment/<review_id>/
    #
    # body 예시
    # {
    #     "content": "좋은 리뷰네요!"
    # }
    # ---------------------------------------------------------
    path(
        "comment/<int:review_id>/",
        ReviewCommentCreateAPIView.as_view(),
        name="review-comment-create"
    ),


    # ---------------------------------------------------------
    # 리뷰 댓글 목록 조회
    #
    # 기능
    # - 특정 리뷰의 댓글 리스트 조회
    #
    # 요청 방식
    # GET /interaction/comments/<review_id>/
    #
    # 예시
    # GET /interaction/comments/5/
    # ---------------------------------------------------------
    path(
        "comments/<int:review_id>/",
        ReviewCommentListAPIView.as_view(),
        name="review-comment-list"
    ),


    # ---------------------------------------------------------
    # 리뷰 댓글 수정 / 삭제
    #
    # 기능
    # - 댓글 수정 (PATCH)
    # - 댓글 삭제 (DELETE)
    #
    # 요청 방식
    # PATCH /interaction/comment/detail/<comment_id>/
    # DELETE /interaction/comment/detail/<comment_id>/
    #
    # 예시
    # PATCH /interaction/comment/detail/10/
    # DELETE /interaction/comment/detail/10/
    # ---------------------------------------------------------
    path(
        "comment/detail/<int:comment_id>/",
        ReviewCommentDetailAPIView.as_view(),
        name="review-comment-detail"
    ),


    # ---------------------------------------------------------
    # 리뷰 신고 등록
    #
    # 기능
    # - 부적절한 리뷰 신고
    #
    # 요청 방식
    # POST /interaction/report/<review_id>/
    #
    # body 예시
    # {
    #     "reason": "광고성 리뷰"
    # }
    # ---------------------------------------------------------
    path(
        "report/<int:review_id>/",
        ReviewReportCreateAPIView.as_view(),
        name="review-report-create"
    ),


    # ---------------------------------------------------------
    # 리뷰 신고 목록 조회
    #
    # 기능
    # - 특정 리뷰에 대한 신고 목록 조회
    # - 관리자 확인용
    #
    # 요청 방식
    # GET /interaction/reports/<review_id>/
    #
    # 예시
    # GET /interaction/reports/5/
    # ---------------------------------------------------------
    path(
        "reports/<int:review_id>/",
        ReviewReportListAPIView.as_view(),
        name="review-report-list"
    ),
]
```
---
`backend/apps/reviews/views.py`
```python
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import permissions, status, viewsets, generics
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Review, ReviewImage
from .serializers import (
    ReviewSerializer,
    ReviewImageSerializer,
    ReviewAISerializer,
)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    리뷰 CRUD API

    지원 기능
    - GET    /api/reviews/                : 리뷰 목록
    - GET    /api/reviews/?product=1      : 특정 상품 리뷰 목록
    - GET    /api/reviews/<id>/           : 리뷰 상세
    - POST   /api/reviews/                : 리뷰 생성
    - PATCH  /api/reviews/<id>/           : 리뷰 수정
    - DELETE /api/reviews/<id>/           : 리뷰 삭제
    """

    # =========================================================
    # [인터랙티브 관련]
    # ReviewSerializer 안에
    # likes_count, bookmarks_count, is_liked, is_bookmarked
    # 가 추가되어 있다면,
    # 이 ViewSet의 목록/상세 응답에도 그 값들이 함께 내려가게 됩니다.
    # 즉, View 코드 자체보다 serializer 확장의 영향이 반영되는 부분입니다.
    # =========================================================
    serializer_class = ReviewSerializer

    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        """
        조회는 누구나 가능,
        생성/수정/삭제는 로그인 사용자만 가능하게 설정
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        기본적으로 공개 리뷰만 조회하고,
        product 쿼리파라미터가 있으면 해당 상품 리뷰만 필터링합니다.
        """
        queryset = (
            Review.objects
            .select_related("user", "product", "ai_result")
            .prefetch_related("images")
            .filter(is_public=True)
            .order_by("-created_at")
        )

        product_id = self.request.query_params.get("product")
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        return queryset

    def perform_create(self, serializer):
        """
        로그인 사용자의 리뷰를 저장합니다.
        """
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, is_public=True)
        else:
            raise ValidationError("리뷰 작성은 로그인 후 가능합니다.")

    def destroy(self, request, *args, **kwargs):
        """
        삭제 응답 메시지 커스텀
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "deleted"},
            status=status.HTTP_200_OK
        )


# =============================================================
# [인터랙티브 관련]
# 사용자 본인이 작성한 리뷰만 따로 조회하는 기능
# 좋아요/북마크와 직접 토글하는 API는 아니지만,
# 인터랙션이 붙은 리뷰 데이터를 "내 리뷰" 기준으로 확인하는 흐름에서
# 함께 사용될 수 있는 확장 기능입니다.
# =============================================================
class MyReviewListAPIView(generics.ListAPIView):
    """
    내 리뷰 목록
    GET /api/reviews/my/
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Review.objects
            .select_related("user", "product", "ai_result")
            .prefetch_related("images")
            .filter(user=self.request.user)
            .order_by("-created_at")
        )


class ReviewImageUploadAPIView(APIView):
    """
    특정 리뷰에 이미지 추가 업로드
    POST /api/reviews/<review_id>/images/
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, review_id):
        review = get_object_or_404(Review, id=review_id)

        # 본인 리뷰에만 이미지 추가 가능
        if review.user != request.user:
            return Response(
                {"detail": "본인 리뷰에만 이미지를 추가할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        files = request.FILES.getlist("uploaded_images")

        if not files:
            return Response(
                {"detail": "업로드할 이미지가 없습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_images = []
        for file in files:
            image = ReviewImage.objects.create(
                review=review,
                image=file
            )
            created_images.append(image)

        serializer = ReviewImageSerializer(created_images, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReviewAIResultAPIView(APIView):
    """
    특정 리뷰의 AI 분석 결과 조회
    GET /api/reviews/<review_id>/ai/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, review_id):
        review = get_object_or_404(
            Review.objects.select_related("ai_result"),
            id=review_id
        )

        if not hasattr(review, "ai_result"):
            return Response(
                {"detail": "AI 분석 결과가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ReviewAISerializer(review.ai_result)
        return Response(serializer.data, status=status.HTTP_200_OK)
```
`ReviewSerializer`에 인터랙션 필드가 추가됨
그래서 `ReviewViewSet`, `MyReviewListAPIView` 응답에 그 값이 같이 포함됨
인터랙션 정보가 포함된 리뷰 데이터를 내려주는 쪽

---
인터랙티브 추가 해당사항
```
- 리뷰별 댓글 조회  
- 좋아요 토글   
- 북마크 토글  
- 댓글 작성  
- 신고 작성  
- 댓글 HTML 생성   
- 리뷰 HTML 안에 좋아요/북마크/댓글/신고 UI 추가  
- 리뷰 새로고침 시 댓글까지 함께 다시 렌더링
```

`backend/apps/reviews/serializers.py`
```python
from rest_framework import serializers

from .models import Review, ReviewImage


class ReviewImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = [
            "id",
            "image",
            "image_url",
            "created_at",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")

        if not obj.image:
            return None

        try:
            image_url = obj.image.url
        except Exception:
            return None

        if request:
            return request.build_absolute_uri(image_url)

        return image_url


class ReviewAISerializer(serializers.Serializer):
    sentiment = serializers.CharField(read_only=True)
    score = serializers.FloatField(read_only=True)
    summary = serializers.CharField(read_only=True, required=False)
    keywords = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        required=False
    )


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    # =========================================================
    # [인터랙티브 추가]
    # 좋아요 개수 표시용 필드
    # =========================================================
    likes_count = serializers.SerializerMethodField()

    # =========================================================
    # [인터랙티브 추가]
    # 북마크 개수 표시용 필드
    # =========================================================
    bookmarks_count = serializers.SerializerMethodField()

    # =========================================================
    # [인터랙티브 추가]
    # 현재 로그인 사용자가 이 리뷰에 좋아요를 눌렀는지 여부
    # =========================================================
    is_liked = serializers.SerializerMethodField()

    # =========================================================
    # [인터랙티브 추가]
    # 현재 로그인 사용자가 이 리뷰를 북마크했는지 여부
    # =========================================================
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "username",
            "product",
            "content",
            "rating",
            "is_public",
            "created_at",

            # =================================================
            # [인터랙티브 추가]
            # 좋아요 수
            # =================================================
            "likes_count",

            # =================================================
            # [인터랙티브 추가]
            # 북마크 수
            # =================================================
            "bookmarks_count",

            # =================================================
            # [인터랙티브 추가]
            # 현재 유저 좋아요 여부
            # =================================================
            "is_liked",

            # =================================================
            # [인터랙티브 추가]
            # 현재 유저 북마크 여부
            # =================================================
            "is_bookmarked",
        ]
        read_only_fields = [
            "id",
            "user",
            "username",
            "created_at",

            # =================================================
            # [인터랙티브 추가]
            # 계산해서 보여주는 값이라 읽기 전용
            # =================================================
            "likes_count",
            "bookmarks_count",
            "is_liked",
            "is_bookmarked",
        ]

    # =========================================================
    # [인터랙티브 추가]
    # 해당 리뷰의 좋아요 개수 반환
    # related_name='likes' 기준
    # =========================================================
    def get_likes_count(self, obj):
        return obj.likes.count()

    # =========================================================
    # [인터랙티브 추가]
    # 해당 리뷰의 북마크 개수 반환
    # related_name='bookmarks' 기준
    # =========================================================
    def get_bookmarks_count(self, obj):
        return obj.bookmarks.count()

    # =========================================================
    # [인터랙티브 추가]
    # 현재 로그인한 사용자가 이 리뷰에 좋아요를 눌렀는지 확인
    # 비로그인 사용자는 False
    # =========================================================
    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    # =========================================================
    # [인터랙티브 추가]
    # 현재 로그인한 사용자가 이 리뷰를 북마크했는지 확인
    # 비로그인 사용자는 False
    # =========================================================
    def get_is_bookmarked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.bookmarks.filter(user=request.user).exists()
```
---
`backend/static/js/product-list.js`
```python
document.addEventListener("DOMContentLoaded", function () {
    const productList = document.getElementById("productList");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");

    let currentPage = 1;
    let nextPageExists = false;

    function getAccessToken() {
        return localStorage.getItem("access");
    }

    function getAuthHeaders() {
        const token = getAccessToken();

        if (!token) {
            return {};
        }

        return {
            Authorization: `Bearer ${token}`
        };
    }

    // =========================
    // [기존]
    // 상품별 리뷰 조회
    // =========================
    async function fetchReviewsByProduct(productId) {
        try {
            const response = await axios.get(`/reviews/?product=${productId}`, {
                headers: getAuthHeaders()
            });

            const data = response.data;

            if (Array.isArray(data)) {
                return data;
            }

            if (Array.isArray(data.results)) {
                return data.results;
            }

            return [];
        } catch (error) {
            console.error(`상품 ${productId} 리뷰 불러오기 실패:`, error.response?.data || error);
            return [];
        }
    }

    // =========================================================
    // [인터랙티브 추가]
    // 리뷰별 댓글 목록 조회
    // GET /interactions/comments/<review_id>/
    // =========================================================
    async function fetchCommentsByReview(reviewId) {
        try {
            const response = await axios.get(`/interactions/comments/${reviewId}/`, {
                headers: getAuthHeaders()
            });

            const data = response.data;

            if (Array.isArray(data)) {
                return data;
            }

            if (Array.isArray(data.results)) {
                return data.results;
            }

            return [];
        } catch (error) {
            console.error(`리뷰 ${reviewId} 댓글 불러오기 실패:`, error.response?.data || error);
            return [];
        }
    }

    // =========================================================
    // [인터랙티브 추가]
    // 좋아요 토글
    // POST /interactions/like/<review_id>/
    // =========================================================
    async function toggleLike(reviewId) {
        return await axios.post(
            `/interactions/like/${reviewId}/`,
            {},
            {
                headers: getAuthHeaders()
            }
        );
    }

    // =========================================================
    // [인터랙티브 추가]
    // 북마크 토글
    // POST /interactions/bookmark/<review_id>/
    // =========================================================
    async function toggleBookmark(reviewId) {
        return await axios.post(
            `/interactions/bookmark/${reviewId}/`,
            {},
            {
                headers: getAuthHeaders()
            }
        );
    }

    // =========================================================
    // [인터랙티브 추가]
    // 댓글 작성
    // POST /interactions/comment/<review_id>/
    // =========================================================
    async function createComment(reviewId, content) {
        return await axios.post(
            `/interactions/comment/${reviewId}/`,
            { content: content },
            {
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                }
            }
        );
    }

    // =========================================================
    // [인터랙티브 추가]
    // 신고 작성
    // POST /interactions/report/<review_id>/
    // =========================================================
    async function createReport(reviewId, reason) {
        return await axios.post(
            `/interactions/report/${reviewId}/`,
            { reason: reason },
            {
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                }
            }
        );
    }

    // =========================================================
    // [인터랙티브 추가]
    // 댓글 1개를 화면에 표시할 HTML 생성
    // =========================================================
    function createCommentHTML(comment) {
        return `
            <div class="comment-item" style="padding:6px 0; border-top:1px solid #eee;">
                <strong>${comment.username || "익명"}</strong>
                <span class="muted" style="margin-left:6px;">
                    ${comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}
                </span>
                <div style="margin-top:4px;">${comment.content || ""}</div>
            </div>
        `;
    }

    // =========================================================
    // [인터랙티브 추가]
    // 리뷰 HTML 안에
    // - 좋아요 버튼
    // - 북마크 버튼
    // - 신고 버튼
    // - 댓글 입력창
    // - 댓글 목록
    // 을 함께 렌더링하도록 확장된 부분
    // =========================================================
    function createReviewHTML(review, productId, commentsHTML = "") {
        return `
            <div class="review-item" data-review-id="${review.id}" data-product-id="${productId}">
                <div class="review-top">
                    <strong>${review.username || review.user_name || "익명"}</strong>
                    <span class="muted">평점: ${review.rating ?? "-"}</span>
                </div>

                <p class="review-content">${review.content || ""}</p>

                <!-- [인터랙티브 추가] 좋아요 / 북마크 / 신고 버튼 -->
                <div class="review-actions">
                    <button type="button" class="like-btn action-btn">
                        <span class="action-label">
                            ${review.is_liked ? "💖 취소" : "🤍 좋아요"}
                        </span>
                        <span class="action-count">${review.likes_count ?? 0}</span>
                    </button>

                    <button type="button" class="bookmark-btn action-btn">
                        <span class="action-label">
                            ${review.is_bookmarked ? "🔖 취소" : "📑 북마크"}
                        </span>
                        <span class="action-count">${review.bookmarks_count ?? 0}</span>
                    </button>

                    <button type="button" class="report-btn action-btn report-action-btn">
                        <span class="action-label">🚨 신고하기</span>
                    </button>
                </div>

                <!-- [인터랙티브 추가] 댓글 작성 폼 -->
                <div class="comment-form" style="margin-top:10px; display:flex; gap:6px;">
                    <input
                        type="text"
                        class="comment-input"
                        placeholder="댓글을 입력하세요"
                        style="flex:1;"
                    >
                    <button type="button" class="comment-btn">댓글 등록</button>
                </div>

                <!-- [인터랙티브 추가] 댓글 목록 렌더링 영역 -->
                <div class="comment-list" style="margin-top:10px;">
                    ${commentsHTML || `<p class="muted">등록된 댓글이 없습니다.</p>`}
                </div>
            </div>
        `;
    }

    // =========================================================
    // [인터랙티브 추가]
    // 상품에 달린 리뷰를 불러오고,
    // 각 리뷰의 댓글까지 함께 불러와서
    // 최종 리뷰 HTML을 조합하는 함수
    // =========================================================
    async function buildReviewsHTML(productId) {
        const reviews = await fetchReviewsByProduct(productId);

        if (reviews.length === 0) {
            return `<p class="muted">등록된 리뷰가 없습니다.</p>`;
        }

        const reviewHtmlList = await Promise.all(
            reviews.map(async (review) => {
                const comments = await fetchCommentsByReview(review.id);
                const commentsHTML = comments.length > 0
                    ? comments.map(createCommentHTML).join("")
                    : `<p class="muted">등록된 댓글이 없습니다.</p>`;

                return createReviewHTML(review, productId, commentsHTML);
            })
        );

        return reviewHtmlList.join("");
    }

    // =========================================================
    // [인터랙티브 추가]
    // 특정 상품 카드 안의 리뷰 영역을
    // 리뷰 + 댓글 포함해서 다시 렌더링하는 함수
    // 좋아요, 북마크, 댓글 작성 후 즉시 새로고침할 때 사용
    // =========================================================
    async function refreshReviewBox(card, productId) {
        const reviewBox = card.querySelector(".review-box");
        if (!reviewBox) {
            return;
        }

        const reviewsHTML = await buildReviewsHTML(productId);

        reviewBox.innerHTML = `
            <h4>리뷰</h4>
            ${reviewsHTML}
        `;
    }

    // =========================================================
    // [인터랙티브 추가]
    // 상품 카드 렌더링 시
    // 상품 정보만이 아니라 리뷰 + 댓글 영역까지 같이 그림
    // =========================================================
    async function renderProductCard(product) {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.productId = product.id;

        const reviewsHTML = await buildReviewsHTML(product.id);

        card.innerHTML = `
            <a href="/products/${product.id}/" class="product-link">
                <img src="${product.image_url || ""}" alt="${product.name}" class="thumb">
                <h3>${product.name}</h3>
                <p class="muted">${product.description || ""}</p>
                <p><strong>${Number(product.price).toLocaleString()}원</strong></p>
            </a>

            <div class="review-box">
                <h4>리뷰</h4>
                ${reviewsHTML}
            </div>
        `;

        return card;
    }

    // =========================================================
    // [인터랙티브 추가]
    // 이벤트 위임으로
    // - 좋아요 클릭
    // - 북마크 클릭
    // - 댓글 등록 클릭
    // - 신고 클릭
    // 을 처리하는 핵심 이벤트 로직
    // =========================================================
    productList.addEventListener("click", async function (event) {
        const likeBtn = event.target.closest(".like-btn");
        const bookmarkBtn = event.target.closest(".bookmark-btn");
        const commentBtn = event.target.closest(".comment-btn");
        const reportBtn = event.target.closest(".report-btn");

        if (likeBtn || bookmarkBtn || commentBtn || reportBtn) {
            event.preventDefault();
            event.stopPropagation();
        }

        // =====================================================
        // [인터랙티브 추가]
        // 좋아요 처리 후 리뷰 영역 다시 렌더링
        // =====================================================
        if (likeBtn) {
            const reviewItem = likeBtn.closest(".review-item");
            const reviewId = reviewItem.dataset.reviewId;
            const productId = reviewItem.dataset.productId;
            const card = likeBtn.closest(".product-card");

            try {
                await toggleLike(reviewId);
                await refreshReviewBox(card, productId);
            } catch (error) {
                console.error("좋아요 에러:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("로그인이 필요합니다.");
                    return;
                }

                alert("좋아요 처리에 실패했습니다.");
            }

            return;
        }

        // =====================================================
        // [인터랙티브 추가]
        // 북마크 처리 후 리뷰 영역 다시 렌더링
        // =====================================================
        if (bookmarkBtn) {
            const reviewItem = bookmarkBtn.closest(".review-item");
            const reviewId = reviewItem.dataset.reviewId;
            const productId = reviewItem.dataset.productId;
            const card = bookmarkBtn.closest(".product-card");

            try {
                await toggleBookmark(reviewId);
                await refreshReviewBox(card, productId);
            } catch (error) {
                console.error("북마크 에러:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("로그인이 필요합니다.");
                    return;
                }

                alert("북마크 처리에 실패했습니다.");
            }

            return;
        }

        // =====================================================
        // [인터랙티브 추가]
        // 댓글 등록 처리 후 리뷰 + 댓글 전체 다시 렌더링
        // =====================================================
        if (commentBtn) {
            const reviewItem = commentBtn.closest(".review-item");
            const reviewId = reviewItem.dataset.reviewId;
            const productId = reviewItem.dataset.productId;
            const card = commentBtn.closest(".product-card");
            const input = reviewItem.querySelector(".comment-input");

            const content = input.value.trim();

            if (!content) {
                alert("댓글 내용을 입력해주세요.");
                return;
            }

            try {
                await createComment(reviewId, content);

                input.value = "";
                alert("댓글이 등록되었습니다.");

                await refreshReviewBox(card, productId);
            } catch (error) {
                console.error("댓글 등록 에러:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("로그인이 필요합니다.");
                    return;
                }

                alert("댓글 등록에 실패했습니다.");
            }

            return;
        }

        // =====================================================
        // [인터랙티브 추가]
        // 신고 처리
        // =====================================================
        if (reportBtn) {
            const reviewItem = reportBtn.closest(".review-item");
            const reviewId = reviewItem.dataset.reviewId;

            const reason = prompt("신고 사유를 입력해주세요.");

            if (!reason || !reason.trim()) {
                return;
            }

            try {
                await createReport(reviewId, reason.trim());
                alert("신고가 접수되었습니다.");
            } catch (error) {
                console.error("신고 에러:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("로그인이 필요합니다.");
                    return;
                }

                alert("신고 처리에 실패했습니다.");
            }

            return;
        }
    });

    // =========================
    // [기존]
    // 상품 목록 로드 + 페이지네이션
    // =========================
    async function loadProducts(page = 1) {
        try {
            const response = await axios.get(`/products/api/?page=${page}`);
            const data = response.data;

            console.log("상품 응답:", data);

            productList.innerHTML = "";

            const products = Array.isArray(data) ? data : (data.results || []);

            if (products.length === 0) {
                productList.innerHTML = "<p>등록된 상품이 없습니다.</p>";
            } else {
                for (const product of products) {
                    const card = await renderProductCard(product);
                    productList.appendChild(card);
                }
            }

            currentPage = page;
            nextPageExists = !!data.next;

            pageInfo.textContent = `${currentPage} 페이지`;
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = !nextPageExists;

        } catch (error) {
            console.error("상품 목록 불러오기 에러:", error.response?.data || error);
            alert("상품 목록을 불러오지 못했습니다.");
        }
    }

    prevBtn.addEventListener("click", function () {
        if (currentPage > 1) {
            loadProducts(currentPage - 1);
        }
    });

    nextBtn.addEventListener("click", function () {
        if (nextPageExists) {
            loadProducts(currentPage + 1);
        }
    });

    loadProducts(1);
});
```

