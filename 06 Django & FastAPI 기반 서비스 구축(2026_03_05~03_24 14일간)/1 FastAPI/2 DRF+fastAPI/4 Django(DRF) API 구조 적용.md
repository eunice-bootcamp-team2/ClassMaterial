1️⃣ accounts views.py : (User 조회 ViewSet)
- 사용자 조회용 API를 담당합니다.
- 전체 사용자 목록 조회, 특정 사용자 상세 조회 같은 기능이 들어갑니다.
- 즉, “유저 데이터를 밖으로 보여주는 창구” 역할입니다

`backend/apps/accounts/views.py`
```python
# → 하나의 클래스에서 list, retrieve, create 등 여러 API를 묶어서 관리
from rest_framework.viewsets import ViewSet

# API 응답을 반환하기 위한 객체 (JSON 형태로 반환됨)
from rest_framework.response import Response

# 객체가 없을 경우 404 에러를 자동으로 발생시키는 함수
from django.shortcuts import get_object_or_404

# User 모델 (DB와 연결된 데이터 구조)
from .models import User

# User 데이터를 JSON으로 변환해주는 Serializer
from .serializers import UserSerializer


class UserViewSet(ViewSet):
    """
    User API ViewSet

    - list     : 전체 사용자 조회 (GET /users/)
    - retrieve : 특정 사용자 조회 (GET /users/{id}/)
    """

    def list(self, request):
        """
        전체 사용자 조회 API

        흐름:
        1. DB에서 모든 User 조회
        2. Serializer로 JSON 변환
        3. Response로 반환
        """

        # 1️⃣ 모든 사용자 데이터 조회 (QuerySet 반환)
        users = User.objects.all()

        # 2️⃣ 여러 개 데이터이므로 many=True 설정
        serializer = UserSerializer(users, many=True)

        # 3️⃣ JSON 형태로 응답 반환
        return Response(serializer.data)


    def retrieve(self, request, pk=None):
        """
        특정 사용자 상세 조회 API

        흐름:
        4. pk(id)를 기준으로 User 조회
        5. 없으면 404 에러 발생
        6. Serializer로 JSON 변환
        7. Response 반환
        """

        # 1️⃣ pk에 해당하는 사용자 조회 (없으면 자동 404)
        user = get_object_or_404(User, pk=pk)

        # 2️⃣ 단일 객체이므로 many=False (기본값)
        serializer = UserSerializer(user)

        # 3️⃣ JSON 형태로 응답 반환
        return Response(serializer.data)
```

위 코드 전체흐름
```
DB → Serializer → Response
```
---
- User 모델 데이터를 JSON으로 바꿔줍니다.
- 보통 id, username, email 같은 값을 응답 형식으로 정리합니다.
- 즉, User 데이터를 API 응답용 형태로 포장하는 역할입니다.

1️⃣ accounts serializer : (User Read Serializer User 데이터 직렬화 - 조회용)

`backend/apps/accounts/serializers.py`
```python
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    사용자 조회용 Serializer
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "created_at",
        ]
```
---
상품 CRUD API입니다.
- 상품 목록 조회
- 상품 상세 조회
- 상품 생성
- 상품 수정
- 상품 삭제

2️⃣ products views.py (Product CRUD API ViewSet)

`backend/apps/products/views.py`
```python
# 특정 객체가 없을 경우 404 에러 반환
from django.shortcuts import get_object_or_404

# (현재 코드에서는 사용 안함 → 제거 가능)
from django.views.generic import TemplateView

# DRF ViewSet (CRUD API를 하나의 클래스에서 관리)
from rest_framework.viewsets import ViewSet

# JSON 응답 반환
from rest_framework.response import Response

# 페이지네이션 처리 클래스
from rest_framework.pagination import PageNumberPagination

# HTTP 상태 코드 사용
from rest_framework import status

# Product 모델 (DB 테이블)
from .models import Product

# Product 데이터를 JSON으로 변환하는 Serializer
from .serializers import ProductSerializer


class ProductPagination(PageNumberPagination):
    """
    페이지네이션 설정

    - 기본 페이지 크기: 6
    - 클라이언트에서 page_size 조정 가능
    - 최대 20개까지 허용
    """
    page_size = 6
    page_size_query_param = "page_size"
    max_page_size = 20


class ProductViewSet(ViewSet):
    """
    Product CRUD API

    - list     : 상품 목록 조회 (GET /products/)
    - retrieve : 상품 상세 조회 (GET /products/{id}/)
    - create   : 상품 생성 (POST /products/)
    - update   : 상품 수정 (PUT /products/{id}/)
    - destroy  : 상품 삭제 (DELETE /products/{id}/)
    """

    def list(self, request):
        """
        상품 목록 조회 API

        흐름:
        1. DB에서 전체 상품 조회 (최신순)
        2. 페이지네이션 적용
        3. Serializer로 JSON 변환
        4. 페이지네이션 응답 반환
        """

        # 1️⃣ 전체 상품 조회 (id 기준 내림차순)
        queryset = Product.objects.all().order_by("-id")

        # 2️⃣ 페이지네이션 적용
        paginator = ProductPagination()
        page = paginator.paginate_queryset(queryset, request)

        # 3️⃣ 여러 데이터이므로 many=True
        serializer = ProductSerializer(page, many=True)

        # 4️⃣ 페이지네이션 포함 응답 반환
        return paginator.get_paginated_response(serializer.data)


    def retrieve(self, request, pk=None):
        """
        상품 상세 조회 API

        흐름:
        1. pk(id)로 상품 조회
        2. 없으면 404 에러
        3. Serializer 변환
        4. Response 반환
        """

        # 1️⃣ 상품 조회 (없으면 자동 404)
        product = get_object_or_404(Product, pk=pk)

        # 2️⃣ 단일 객체 변환
        serializer = ProductSerializer(product)

        # 3️⃣ JSON 응답 반환
        return Response(serializer.data)


    def create(self, request):
        """
        상품 생성 API

        흐름:
        1. 요청 데이터(request.data) 받기
        2. Serializer로 검증
        3. 유효하면 DB 저장
        4. 생성된 데이터 반환
        """

        # 1️⃣ 요청 데이터 → Serializer
        serializer = ProductSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ DB 저장
            serializer.save()

            # 4️⃣ 생성 성공 응답
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # ❌ 유효성 실패 시 에러 반환
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def update(self, request, pk=None):
        """
        상품 수정 API

        흐름:
        1. 기존 상품 조회
        2. 요청 데이터로 덮어쓰기
        3. 검증 후 저장
        4. 수정된 데이터 반환
        """

        # 1️⃣ 수정 대상 조회
        product = get_object_or_404(Product, pk=pk)

        # 2️⃣ 기존 객체 + 새로운 데이터 전달
        serializer = ProductSerializer(product, data=request.data)

        # 3️⃣ 유효성 검사
        if serializer.is_valid():

            # 4️⃣ 업데이트 저장
            serializer.save()

            return Response(serializer.data)

        # ❌ 검증 실패
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def destroy(self, request, pk=None):
        """
        상품 삭제 API

        흐름:
        1. 삭제 대상 조회
        2. DB에서 삭제
        3. 성공 메시지 반환
        """

        # 1️⃣ 삭제 대상 조회
        product = get_object_or_404(Product, pk=pk)

        # 2️⃣ 삭제
        product.delete()

        # 3️⃣ 삭제 성공 응답
        return Response({"message": "deleted"}, status=status.HTTP_204_NO_CONTENT)
```

위 코드 전체흐름
```
요청 → ViewSet → ORM → Serializer → Response
```
---
- 상품 입력값 검증
- 상품 데이터를 JSON으로 변환

예를 들어 상품명, 설명, 가격, 이미지 같은 값이 올바른지 확인하고, 응답할 때도 JSON 형식으로 정리해줍니다.

2️⃣ products serializer (Product CRUD Serializer Product 데이터 검증 및 직렬화)
`backend/apps/products/serializers.py`
```python
from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """
    제품 CRUD Serializer
    """

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "image",
            "created_at",
        ]
```
---
리뷰 CRUD API + 리뷰 관련 관계 데이터 응답
- 리뷰 목록 조회
- 리뷰 상세 조회
- 리뷰 생성
- 리뷰 수정
- 리뷰 삭제

즉, 사용자가 상품에 남기는 핵심 데이터인 리뷰를 직접 다루는 API 파일입니다.  
상품 앱이 상품을 다룬다면, 이 파일은 상품에 달린 리뷰를 다룹니다.

3️⃣ reviews views.py (Review CRUD API ViewSet)

`backend/apps/reviews/views.py`
```python
# DRF ViewSet (CRUD API 묶음)
from rest_framework.viewsets import ViewSet

# JSON 응답 반환
from rest_framework.response import Response

# 객체 없을 경우 404 자동 반환
from django.shortcuts import get_object_or_404

# Review 모델 (DB 테이블)
from .models import Review

# Review 데이터를 JSON으로 변환하는 Serializer
from .serializers import ReviewSerializer


class ReviewViewSet(ViewSet):
    """
    Review CRUD API

    - list     : 리뷰 목록 조회 (GET /reviews/)
    - retrieve : 리뷰 상세 조회 (GET /reviews/{id}/)
    - create   : 리뷰 생성 (POST /reviews/)
    - update   : 리뷰 수정 (PUT /reviews/{id}/)
    - destroy  : 리뷰 삭제 (DELETE /reviews/{id}/)
    """

    def list(self, request):
        """
        리뷰 목록 조회 API

        흐름:
        1. DB에서 모든 리뷰 조회
        2. Serializer로 변환
        3. Response 반환
        """

        # 1️⃣ 모든 리뷰 조회
        reviews = Review.objects.all().order_by("-id")

        # 2️⃣ 여러 개 데이터 → many=True
        serializer = ReviewSerializer(reviews, many=True)

        # 3️⃣ JSON 응답 반환
        return Response(serializer.data)


    def retrieve(self, request, pk=None):
        """
        리뷰 상세 조회 API

        흐름:
        4. pk로 리뷰 조회
        5. 없으면 404
        6. Serializer 변환
        7. Response 반환
        """

        # 1️⃣ 특정 리뷰 조회
        review = get_object_or_404(Review, pk=pk)

        # 2️⃣ 단일 객체 변환
        serializer = ReviewSerializer(review)

        # 3️⃣ JSON 응답 반환
        return Response(serializer.data)


    def create(self, request):
        """
        리뷰 생성 API

        흐름:
        8. 요청 데이터 받기
        9. Serializer 검증
        10. 유효하면 DB 저장
        11. 결과 반환
        """

        # 1️⃣ 요청 데이터 → Serializer
        serializer = ReviewSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ DB 저장
            serializer.save()

            # 4️⃣ 생성된 데이터 반환
            return Response(serializer.data)

        # ❌ 검증 실패
        return Response(serializer.errors)


    def update(self, request, pk=None):
        """
        리뷰 수정 API

        흐름:
        12. 기존 리뷰 조회
        13. 요청 데이터로 덮어쓰기
        14. 검증 후 저장
        15. 수정된 데이터 반환
        """

        # 1️⃣ 수정 대상 조회
        review = get_object_or_404(Review, pk=pk)

        # 2️⃣ 기존 객체 + 요청 데이터 전달
        serializer = ReviewSerializer(review, data=request.data)

        # 3️⃣ 유효성 검사
        if serializer.is_valid():

            # 4️⃣ 업데이트 저장
            serializer.save()

            return Response(serializer.data, status=201)

        # ❌ 검증 실패
        return Response(serializer.errors)


    def destroy(self, request, pk=None):
        """
        리뷰 삭제 API

        흐름:
        16. 삭제 대상 조회
        17. DB에서 삭제
        18. 응답 반환
        """

        # 1️⃣ 삭제 대상 조회
        review = get_object_or_404(Review, pk=pk)

        # 2️⃣ 삭제
        review.delete()

        # 3️⃣ 삭제 완료 응답
        return Response({"message": "deleted"})
```

위의 코드 전체 흐름
```
요청 → ViewSet → ORM → Serializer → Response
```
---
이 파일은 조금 더 중요합니다. 이유는 단순 리뷰 정보만 다루는 게 아니라:
- 리뷰 본문
- 리뷰 평점
- 리뷰 이미지
- AI 분석 결과
까지 함께 묶어서 응답할 수 있게 설계되어 있기 때문입니다.

serializer는 3가지 역할이 있습니다.
1. 리뷰 생성/수정 시 입력값 검증
2. 리뷰 데이터를 JSON으로 변환
3. 리뷰 이미지, AI 결과 같은 관계 데이터까지 함께 묶어서 출력

즉, 이 코드는 리뷰 응답을 풍부하게 만드는 중심 파일입니다.  
리뷰 단독 정보만이 아니라, 리뷰에 연결된 하위 데이터까지 포함하는 구조를 이해하는 데 중요합니다.

3️⃣ reviews serializer (Review CRUD + 관계 데이터 Serializer)
```
Review 생성/수정 데이터 검증 + 
Review + Image + AI 결과를 함께 응답하는 Serializer
```
`backend/apps/reviews/serializers.py`
```python
from rest_framework import serializers
from .models import Review, ReviewImage, ReviewAI


# 📌 ReviewImage (리뷰 이미지) Serializer
# → Review와 1:N 관계 (리뷰 하나에 이미지 여러 개)
class ReviewImageSerializer(serializers.ModelSerializer):
    """
    리뷰 이미지 출력용 Serializer

    역할:
    - ReviewImage 모델 → JSON 변환
    - ReviewSerializer 내부에서 nested로 사용됨 (읽기 전용)
    """

    class Meta:
        model = ReviewImage
        fields = [
            "id",
            "image",
            "created_at",
        ]


# 📌 ReviewAI (AI 분석 결과) Serializer
# → Review와 1:1 관계
class ReviewAISerializer(serializers.ModelSerializer):
    """
    리뷰 AI 분석 결과 Serializer

    역할:
    - AI 감정 분석 결과를 JSON으로 변환
    - ReviewSerializer에서 nested로 포함됨 (읽기 전용)
    """

    class Meta:
        model = ReviewAI
        fields = [
            "sentiment",
            "confidence",
            "keywords",
        ]


# 📌 Review 메인 Serializer
class ReviewSerializer(serializers.ModelSerializer):
    """
    Review CRUD + 관계 데이터 Serializer

    역할:
    1️⃣ 입력 검증
        - user, product, content, rating 등의 데이터 검증
        - create/update 시 request.data 검증 수행

    2️⃣ 출력 변환
        - Review 데이터를 JSON으로 변환

    3️⃣ 관계 데이터 포함 (Nested Serializer)
        - images (1:N) → 리뷰 이미지 목록 포함
        - ai_result (1:1) → AI 분석 결과 포함
    """

    # ReviewImage 연결 (related_name="images")
    # → Review.objects.get(...).images 로 접근 가능
    # → many=True: 여러 개 이미지
    # → read_only=True: 생성/수정은 여기서 안함 (출력만)
    images = ReviewImageSerializer(
        many=True,
        read_only=True
    )

    # ReviewAI 연결 (related_name="ai_result")
    # → 1:1 관계
    # → read_only=True: AI 결과는 별도 로직에서 생성
    ai_result = ReviewAISerializer(
        read_only=True
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "user",         # FK (입력 검증 대상)
            "product",      # FK (입력 검증 대상)
            "content",      # 입력 데이터
            "rating",       # 입력 데이터
            "is_public",
            "images",       # nested (출력 전용)
            "ai_result",    # nested (출력 전용)
            "created_at",
            "updated_at",
        ]
```
---
리뷰에 대한 사용자 행동 API
이 앱은 리뷰 자체가 아니라, 리뷰에 대해 사용자가 하는 행동을 처리합니다.
- 좋아요
- 북마크
- 댓글
- 신고

기능별로 ViewSet을 나누어 설명하면
- `ReviewLikeViewSet` → 좋아요 조회/생성
- `ReviewBookmarkViewSet` → 북마크 조회/생성
- `ReviewCommentViewSet` → 댓글 조회/생성
- `ReviewReportViewSet` → 신고 조회/생성

즉, 이 코드는 사용자가 리뷰에 대해 누르는 모든 부가 행동을 처리하는 API 모음입니다.

4️⃣ interactions views.py (리뷰 상호작용 API ViewSet) 
	(Review Like / Bookmark / Comment / Report API)
```
이 파일은 리뷰에 대한 사용자 상호작용 기능을 담당합니다.  
좋아요, 북마크, 댓글, 신고 기능을 각각 별도의 ViewSet으로 분리하여 관리하며,  
현재 단계에서는 목록 조회(list)와 생성(create) 기능만 먼저 구현합니다.  
이후 필요에 따라 상세 조회, 수정, 삭제 기능을 확장할 수 있습니다.
```
`backend/apps/interactions/views.py`
```python
# DRF ViewSet
# → list, create 같은 API 기능을 클래스 단위로 묶어서 관리
from rest_framework.viewsets import ViewSet

# API 응답을 JSON 형태로 반환
from rest_framework.response import Response

# 현재 코드에서는 사용하지 않음
# retrieve, update, destroy를 만들 때 주로 사용
from django.shortcuts import get_object_or_404

# 리뷰 상호작용 관련 모델
from .models import (
    ReviewLike,
    ReviewBookmark,
    ReviewComment,
    ReviewReport,
)

# 각 모델을 JSON으로 변환하고 입력값을 검증하는 Serializer
from .serializers import (
    ReviewLikeSerializer,
    ReviewBookmarkSerializer,
    ReviewCommentSerializer,
    ReviewReportSerializer,
)


class ReviewLikeViewSet(ViewSet):
    """
    리뷰 좋아요 API

    기능:
    - list   : 전체 좋아요 목록 조회
    - create : 좋아요 생성
    """

    def list(self, request):
        """
        좋아요 목록 조회 API

        흐름:
        1. DB에서 모든 좋아요 조회
        2. Serializer로 JSON 변환
        3. Response 반환
        """

        # 1️⃣ 전체 좋아요 데이터 조회
        likes = ReviewLike.objects.all()

        # 2️⃣ 여러 개 데이터이므로 many=True
        serializer = ReviewLikeSerializer(likes, many=True)

        # 3️⃣ JSON 응답 반환
        return Response(serializer.data)

    def create(self, request):
        """
        좋아요 생성 API

        흐름:
        4. 요청 데이터 받기
        5. Serializer로 검증
        6. 유효하면 DB 저장
        7. 결과 반환
        """

        # 1️⃣ 요청 데이터를 Serializer에 전달
        serializer = ReviewLikeSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ DB 저장
            serializer.save()

            # 4️⃣ 저장된 데이터 반환
            return Response(serializer.data)

        # ❌ 검증 실패 시 에러 반환
        return Response(serializer.errors)


class ReviewBookmarkViewSet(ViewSet):
    """
    리뷰 북마크 API

    기능:
    - list   : 전체 북마크 목록 조회
    - create : 북마크 생성
    """

    def list(self, request):
        """
        북마크 목록 조회 API

        흐름:
        1. DB에서 모든 북마크 조회
        2. Serializer로 JSON 변환
        3. Response 반환
        """

        # 1️⃣ 전체 북마크 조회
        bookmarks = ReviewBookmark.objects.all()

        # 2️⃣ 여러 개 데이터 직렬화
        serializer = ReviewBookmarkSerializer(bookmarks, many=True)

        # 3️⃣ JSON 응답 반환
        return Response(serializer.data)

    def create(self, request):
        """
        북마크 생성 API

        흐름:
        4. 요청 데이터 받기
        5. Serializer 검증
        6. 유효하면 저장
        7. 결과 반환
        """

        # 1️⃣ 요청 데이터 전달
        serializer = ReviewBookmarkSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ 저장
            serializer.save()

            # 4️⃣ 결과 반환
            return Response(serializer.data)

        # ❌ 검증 실패
        return Response(serializer.errors)


class ReviewCommentViewSet(ViewSet):
    """
    리뷰 댓글 API

    기능:
    - list   : 전체 댓글 목록 조회
    - create : 댓글 생성
    """

    def list(self, request):
        """
        댓글 목록 조회 API

        흐름:
        1. DB에서 모든 댓글 조회
        2. Serializer 변환
        3. Response 반환
        """

        # 1️⃣ 전체 댓글 조회
        comments = ReviewComment.objects.all()

        # 2️⃣ JSON 변환
        serializer = ReviewCommentSerializer(comments, many=True)

        # 3️⃣ 응답 반환
        return Response(serializer.data)

    def create(self, request):
        """
        댓글 생성 API

        흐름:
        4. 요청 데이터 받기
        5. Serializer 검증
        6. 유효하면 저장
        7. 결과 반환
        """

        # 1️⃣ 요청 데이터 전달
        serializer = ReviewCommentSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ 저장
            serializer.save()

            # 4️⃣ 저장 결과 반환
            return Response(serializer.data)

        # ❌ 검증 실패
        return Response(serializer.errors)


class ReviewReportViewSet(ViewSet):
    """
    리뷰 신고 API

    기능:
    - list   : 전체 신고 목록 조회
    - create : 신고 생성
    """

    def list(self, request):
        """
        신고 목록 조회 API

        흐름:
        1. DB에서 모든 신고 조회
        2. Serializer 변환
        3. Response 반환
        """

        # 1️⃣ 전체 신고 목록 조회
        reports = ReviewReport.objects.all()

        # 2️⃣ JSON 변환
        serializer = ReviewReportSerializer(reports, many=True)

        # 3️⃣ 응답 반환
        return Response(serializer.data)

    def create(self, request):
        """
        신고 생성 API

        흐름:
        4. 요청 데이터 받기
        5. Serializer 검증
        6. 유효하면 저장
        7. 결과 반환
        """

        # 1️⃣ 요청 데이터 전달
        serializer = ReviewReportSerializer(data=request.data)

        # 2️⃣ 유효성 검사
        if serializer.is_valid():

            # 3️⃣ 저장
            serializer.save()

            # 4️⃣ 결과 반환
            return Response(serializer.data)

        # ❌ 검증 실패
        return Response(serializer.errors)
```

위의 코드 처리 흐름
```
요청 → ViewSet → Serializer 검증 → DB 저장/조회 → Response 반환
```
---
이 코드는 상호작용 데이터를 검증하고 JSON으로 변환합니다.
- 좋아요는 user + review 관계가 맞는지
- 댓글은 user + review + content가 들어왔는지
- 신고는 reason이 있는지 같은 부분을 확인합니다.

즉, 좋아요/북마크/댓글/신고 데이터가 정상인지 체크하는 역할입니다.

4️⃣ interactions serializer (Review 상호작용 CRUD Serializer)
```
리뷰 상호작용 데이터(좋아요/북마크/댓글/신고) 생성 시 입력 검증 + DB → JSON 변환(출력)

- 입력 검증 (create) 
- 출력 변환 (list)
둘 다 담당하는 CRUD Serializer
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


# 좋아요 Serializer
class ReviewLikeSerializer(serializers.ModelSerializer):
    """
    리뷰 좋아요 Serializer

    역할:
    1️⃣ 입력 검증
        - user, review 값이 정상인지 검증
        - 중복 좋아요는 모델(unique_together)에서 제한

    2️⃣ 출력 변환
        - 좋아요 데이터를 JSON으로 변환
    """

    class Meta:
        model = ReviewLike
        fields = [
            "id",
            "user",       # FK (입력 검증 대상)
            "review",     # FK (입력 검증 대상)
            "created_at",
        ]


# 북마크 Serializer
class ReviewBookmarkSerializer(serializers.ModelSerializer):
    """
    리뷰 북마크 Serializer

    역할:
    - user와 review 관계 데이터 검증
    - 북마크 데이터 JSON 변환
    """

    class Meta:
        model = ReviewBookmark
        fields = [
            "id",
            "user",
            "review",
            "created_at",
        ]


# 댓글 Serializer
class ReviewCommentSerializer(serializers.ModelSerializer):
    """
    리뷰 댓글 Serializer

    역할:
    1️⃣ 입력 검증
        - user, review, content 검증
        - 댓글 내용(content) 필수값

    2️⃣ 출력 변환
        - 댓글 데이터를 JSON으로 반환
    """

    class Meta:
        model = ReviewComment
        fields = [
            "id",
            "user",
            "review",
            "content",   # 입력 데이터 (검증 대상)
            "created_at",
        ]


# 신고 Serializer
class ReviewReportSerializer(serializers.ModelSerializer):
    """
    리뷰 신고 Serializer

    역할:
    1️⃣ 입력 검증
        - user, review, reason 검증
        - 신고 사유(reason) 필수값

    2️⃣ 출력 변환
        - 신고 데이터를 JSON으로 반환
    """

    class Meta:
        model = ReviewReport
        fields = [
            "id",
            "user",
            "review",
            "reason",   # 입력 데이터 (검증 대상)
            "created_at",
        ]
```

이 Serializer가 검증하는 것

|기능|검증 내용|
|---|---|
|좋아요|user + review|
|북마크|user + review|
|댓글|user + review + content|
|신고|user + review + reason|

---
AI 서버와 연결되는 분석용 API

이 앱은 일반 CRUD 앱과 성격이 다릅니다.  
상품/리뷰처럼 DB 데이터를 직접 CRUD하는 용도가 아니라, AI 기능을 호출하기 위한 진입점 역할을 합니다.

- 감정분석 요청을 받는 API
- 사용자가 텍스트를 보내면 AI 분석 요청을 처리

즉, 앱은 백엔드에서 AI 기능을 호출하기 위한 입구입니다.  
일반 데이터 CRUD가 아니라 기능 실행형 API라고 이해하시면 됩니다.

5️⃣ ai_gateway views (AI 모델 적용후 사용예정)

이 앱은 CRUD가 아니므로 APIView 유지
`backend/apps/ai_gateway/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response


class SentimentAnalysisAPIView(APIView):

    def post(self, request):
        text = request.data.get("text")
        return Response({
            "message": "AI 분석 요청",
            "text": text
        })
```
---
- AI 요청값 검증
- AI 응답 형식 정의

예를 들면:
- 입력: text
- 출력: sentiment, confidence, keywords

이런 형식을 맞춰주는 역할입니다.

즉, 이 파일은 AI API의 요청/응답 계약서 같은 역할입니다.

5️⃣ ai_gateway serializer
`backend/apps/ai_gateway/serializers.py`
```python
from rest_framework import serializers


class SentimentRequestSerializer(serializers.Serializer):
    text = serializers.CharField()


class SentimentResponseSerializer(serializers.Serializer):
    sentiment = serializers.CharField()
    confidence = serializers.FloatField()
    keywords = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
```
---
이 구조를 한 줄씩 보면 헷갈리는데, 실제로는 두 덩어리입니다

(1) 일반 서비스 API
- accounts
- products
- reviews
- interactions

이쪽은 대부분 CRUD 중심입니다. 즉, DB에 저장된 데이터를 만들고, 읽고, 수정하고, 삭제하는 역할입니다.

(2) 기능 실행 API
- ai_gateway

이쪽은 CRUD보다 AI 기능을 호출하고 결과를 받는 역할이 중심입니다.

그래서 `ai_gateway`는 ViewSet보다 APIView가 더 자연스럽습니다.  
이 앱은 CRUD가 아니므로 APIView 유지라고 이해하면 됩니다.

---
### modes, views, serializer가 있으면 API를 테스트 할수 있는 조건이 완성

현재까지 작성된 코드가 잘 구동되는지 curl테스트를 실행합니다
```
1. GET 목록 조회  
2. POST 생성  
3. GET 상세 조회  
4. PUT/PATCH 수정  
5. DELETE 삭제
```

서버 실행
```bash
python manage.py runserver
```

제품생성
```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
"name":"테스트 제품",
"description":"설명입니다",
"price":"12000.00"
}'
```

결과: 정상처리
```bash
{"id":1,"name":"테스트 제품","description":"설명입니다","price":"12000.00","image":null,"created_at":"20(product-review-service)
```

제품 조회
```bash
curl http://127.0.0.1:8000/products/
```
결과: 정상처리
```bash
[{"id":1,"name":"테스트 제품","description":"설명입니다","price":"12000.00","image":null,"created_at":"2026-03-07T04:39:43.410695Z"}](product-review-service)
```
---
### Insomnia test

Review 생성 테스트
요청
- Method: `POST`
- URL: `http://127.0.0.1:8000/reviews/`
    
Body 타입
- `JSON`

Body
```json
{
  "user": 1,
  "product": 1,
  "content": "이 제품은 정말 만족스럽습니다.",
  "rating": 5,
  "is_public": true
}
```

200ok 성공
![[Pasted image 20260307134357.png]]

Comment 생성 테스트
Review를 참조하는 FK 구조

요청
- Method: `POST`
- URL: `http://127.0.0.1:8000/interactions/comments/`
    
Body 타입
- `JSON`

Body
```json
{
  "user": 1,
  "review": 1,
  "content": "댓글 테스트입니다."
}
```

200ok 성공
![[Pasted image 20260307134604.png]]

AI sentiment 테스트
CRUD가 아니라 APIView 테스트

요청
- Method: `POST`
- URL: `http://127.0.0.1:8000/ai/sentiment/`
    
Body 타입
- `JSON`
    
Body
```json
{
  "text": "이 제품은 배송도 빠르고 품질도 좋았습니다."
}
```

200ok 성공
![[Pasted image 20260307134741.png]]