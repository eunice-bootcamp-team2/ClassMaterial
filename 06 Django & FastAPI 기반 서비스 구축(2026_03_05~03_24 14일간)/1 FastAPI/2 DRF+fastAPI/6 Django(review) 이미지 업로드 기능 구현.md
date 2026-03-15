목표
- Product는 이미지 1장 업로드 가능
- Review는 본문 + 별점 + 이미지 여러 장 업로드 가능
- Review 생성 시 `uploaded_images`로 여러 장 업로드 가능
- View에서 `multipart/form-data` 처리 가능
- media 설정으로 실제 파일 접근 가능

수정해야할 파일 목록
```
1️⃣ products 앱
backend/apps/products/models.py
backend/apps/products/serializers.py
backend/apps/products/views.py
backend/apps/products/urls.py

2️⃣ reviews 앱 
backend/apps/reviews/models.py
backend/apps/reviews/serializers.py
backend/apps/reviews/views.py
backend/apps/reviews/urls.py

3️⃣ project mysite
backend/mysite/settings.py
backend/mysite/urls.py
```
---
1️⃣ products 앱

`backend/apps/products/models.py`
```python
from django.db import models


class Product(models.Model):
    """
    제품 모델
    """

    name = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        null=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name
```

`backend/apps/products/serializers.py`
```python
ffrom rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """
    상품 Serializer
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
        read_only_fields = [
            "id",
            "created_at",
        ]
```

`backend/apps/products/views.py`
```python
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView

from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Product
from .serializers import ProductSerializer
from .paginations import ProductPageNumberPagination


class ProductViewSet(ViewSet):
    """
    상품 API ViewSet
    - 목록
    - 상세
    - 생성
    - 수정
    - 삭제
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def list(self, request):
        queryset = Product.objects.all().order_by("-id")

        paginator = ProductPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)

        serializer = ProductSerializer(
            page,
            many=True,
            context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductSerializer(
            product,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        serializer = ProductSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        product.delete()
        return Response(
            {"message": "deleted"},
            status=status.HTTP_204_NO_CONTENT
        )

# 이후 화면설계
class ProductListPageView(TemplateView):
    template_name = "products/product_list.html"


class ProductDetailPageView(TemplateView):
    template_name = "products/product_detail.html"


class ProductCreatePageView(TemplateView):
    template_name = "products/product_create.html"

    
class ProductUpdatePageView(TemplateView):
    template_name = "products/product_update.html"
```

---
`backend/apps/product/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,
    ProductListPageView,
    ProductDetailPageView,
    ProductCreatePageView,
)

router = DefaultRouter()
router.register("", ProductViewSet, basename="product")

urlpatterns = [
    path("", ProductListPageView.as_view(), name="product-page-list"),
    path("create/", ProductCreatePageView.as_view(), name="product-page-create"),
    path("<int:pk>/update/", ProductUpdatePageView.as_view(), name="product-page-edit"),
    path("<int:pk>/", ProductDetailPageView.as_view(), name="product-page-detail"),

    path("api/", include(router.urls)),
]
```
---
2️⃣ reviews 앱

`backend/apps/reviews/models.py`
```python
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from apps.products.models import Product


User = settings.AUTH_USER_MODEL


class Review(models.Model):
    """
    제품 리뷰
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    content = models.TextField()

    rating = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ]
    )

    is_public = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product} - {self.user}"


class ReviewImage(models.Model):
    """
    리뷰 이미지
    """

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="reviews/"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ReviewImage(review_id={self.review.id}, id={self.id})"


class ReviewAI(models.Model):
    """
    리뷰 AI 분석 결과
    """

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="ai_result"
    )

    sentiment = models.CharField(
        max_length=50
    )

    confidence = models.FloatField()

    keywords = models.JSONField(
        default=list,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ReviewAI(review_id={self.review.id}, sentiment={self.sentiment})"
```

`backend/apps/reviews/serializers.py`
```python
from rest_framework import serializers

from .models import Review, ReviewImage, ReviewAI


class ReviewSerializer(serializers.ModelSerializer):
    """
    리뷰 Serializer
    """

    images = ReviewImageSerializer(
        many=True,
        read_only=True
    )

    ai_result = ReviewAISerializer(
        read_only=True
    )

    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "product",
            "content",
            "rating",
            "is_public",
            "images",
            "ai_result",
            "uploaded_images",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "images",
            "ai_result",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        """
        리뷰 생성 + 이미지 저장 처리
        """

        uploaded_images = validated_data.pop("uploaded_images", [])
        review = Review.objects.create(**validated_data)

        for image_file in uploaded_images:
            ReviewImage.objects.create(
                review=review,
                image=image_file
            )

        return review


class ReviewImageSerializer(serializers.ModelSerializer):
    """
    리뷰 이미지 Serializer
    """

    class Meta:
        model = ReviewImage
        fields = [
            "id",
            "image",
            "created_at",
        ]


class ReviewAISerializer(serializers.ModelSerializer):
    """
    리뷰 AI 분석 결과 Serializer
    """

    class Meta:
        model = ReviewAI
        fields = [
            "sentiment",
            "confidence",
            "keywords",
        ]
```

`backend/apps/reviews/views.py`
```python
from rest_framework import permissions, status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Review
from .serializers import ReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
	"""  
	리뷰 CRUD API  
		- GET /reviews/  
		- GET /reviews/<id>/  
		- POST /reviews/  
		- PATCH /reviews/<id>/  
		- DELETE /reviews/<id>/  
	  
	최소 이미지 업로드 테스트용 코드  
	"""

    queryset = Review.objects.all().order_by("-created_at")
    serializer_class = ReviewSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        """
        조회는 누구나 가능
        생성/수정/삭제는 로그인 사용자만 가능
        """
        if self.action in ["list", "retrieve"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        로그인 사용자로 리뷰 저장
        """
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "deleted"},
            status=status.HTTP_204_NO_CONTENT
        )
```

`backend/apps/reviews/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ReviewViewSet

router = DefaultRouter()
router.register("", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
]
```
---
3️⃣ project mysite

`mysite/settings.py` 이미 있으면 확인만 합니다.
```python
MEDIA_URL = "/media/"  
MEDIA_ROOT = BASE_DIR / "media"
```

이미지 업로드용 라이브러리: 이미 설치했으면 확인만 합니다.
```bash
uv pip install pillow
```

`backend/mysite/urls.py`
```python
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("products/", include("apps.products.urls")),
    path("reviews/", include("apps.reviews.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

서버 실행 전 기본 점검
```bash
python manage.py check
```

마이그레이션
```
python manage.py makemigrations  
python manage.py migrate
```
---
### 테스트 1단계: 제품.리뷰 목록 API 먼저 확인
	이미지 업로드부터 바로 하지 말고, 먼저 기본 CRUD가 정상인지 확인합니다.

테스트할 것
- 제품.리뷰 목록 조회
- 제품.리뷰 상세 조회
- 제품.리뷰 생성
- 제품.리뷰 수정
- 제품.리뷰 삭제

shell에서 테스트 데이터 만들기
```bash
python manage.py shell
```

User 생성
```python
from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.create_user(
    username="admin",
    password="1234"
)
user
```

Product 생성
```python
from apps.products.models import Product

product = Product.objects.create(
    name="테스트 상품",
    description="리뷰 테스트용 상품",
    price=10000
)
product
```

Review 생성
```python
from apps.reviews.models import Review

review = Review.objects.create(
    user=user,
    product=product,
    content="테스트 리뷰입니다.",
    rating=5,
    is_public=True
)
review
```

ReviewAI 생성
```python
from apps.reviews.models import ReviewAI

review = ReviewIMG.objects.create(
    review=review,
    sentiment="positive",
    confidence=0.97,
    keywords=["배송", "품질", "만족"]
)

product = ProductIMG.objects.create(
    product=product,
    sentiment="positive",
    confidence=0.97,
    keywords=["배송", "품질", "만족"]
)
```

shell 종료
```python
exit()
```


목록 조회
```bash
curl http://127.0.0.1:8000/api/reviews/

curl http://127.0.0.1:8000/api/products/
```
확인할 것:
- 200 응답 오는지
- 페이지네이션 형식인지
- 에러 없이 JSON 나오는지
```
{"count":1,"next":null,"previous":null,"results":[{"id":1,"user":2,"product":2,"content":"테스트 리뷰입니다.","rating":5,"is_public":true,"images":[],"ai_result":{"sentiment":"positive","confidence":0.97,"keywords":["배송","품질","만족"]},"created_at":"2026-03-07T06:49:08.874801Z","updated_at":"2026-03-07T06:49:08.874819Z"}]}(product-review-service)
```

리뷰 생성 : 이미지 없이 먼저 생성 테스트합니다.
```bash
curl -X POST http://127.0.0.1:8000/api/reviews/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "product=1" \
  -F "content=테스트 리뷰입니다." \
  -F "rating=5" \
  -F "is_public=true"
  
  
curl -X POST http://127.0.0.1:8000/products/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "product=2" \
  -F "content=테스트 리뷰입니다." \
  -F "rating=5" \
  -F "is_public=true"
```
확인할 것:
- 리뷰가 생성되는지
- `user`가 자동 저장되는지
- `images`는 빈 배열인지
결과
```bash
{"detail":"Authentication credentials were not provided."}(product-review-service)
```

상세 조회 
```bash
curl http://127.0.0.1:8000/api/reviews/1/

curl http://127.0.0.1:8000/api/products/1/
```
확인할 것:
- 방금 만든 리뷰가 보이는지
- `images`, `ai_result` 구조가 정상인지
결과
```bash
{"id":1,"user":2,"product":2,"content":"테스트 리뷰입니다.","rating":5,"is_public":true,"images":[],"ai_result":{"sentiment":"positive","confidence":0.97,"keywords":["배송","품질","만족"]},"created_at":"2026-03-07T06:49:08.874801Z","updated_at":"2026-03-07T06:49:08.874819Z"}(product-review-service)
```

수정
```bash
curl -X PATCH http://127.0.0.1:8000/api/reviews/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "content=수정된 리뷰입니다." \
  -F "rating=4"
  
  
curl -X PATCH http://127.0.0.1:8000/api/products/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "content=수정된 리뷰입니다." \
  -F "rating=3"
```
확인할 것:
- 내용이 수정되는지
- PATCH가 허용되는지
```
{"detail":"Authentication credentials were not provided."}(product-review-service)
```
- 읽기(GET) 는 누구나 가능
- 쓰기(POST, PATCH, DELETE)는 로그인한 사용자만 가능
    
즉 지금 응답은 잘못된 것이 아니라, 권한 설정이 잘 작동하고 있다는 뜻입니다.

삭제
```bash
curl -X DELETE http://127.0.0.1:8000/api/reviews/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
  
  
curl -X DELETE http://127.0.0.1:8000/api/products/1/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
```
확인할 것:
- 삭제 응답이 오는지
- 다시 조회 시 404인지
```
{"detail":"Authentication credentials were not provided."}(product-review-service)
```
정상입니다.

---
테스트를 위해 이미지를 프로젝트에 업로드 합니다.
```bash
explorer.exe .
```

```
backend/
├── test1.png
├── test2.png
├── manage.py
```

### 테스트 2단계: 이미지 업로드 테스트
	기본 CRUD가 확인되면 그 다음은 이미지 업로드입니다.

리뷰 생성하면서 이미지 같이 업로드
현재 serializer 구조가 `uploaded_images`를 받는다면 이걸 테스트합니다.
```bash
curl -X POST http://127.0.0.1:8000/api/reviews/ \
  -H "Authorization: Bearer 실제_ACCESS_TOKEN" \
  -F "product=2" \
  -F "content=이미지 포함 리뷰입니다." \
  -F "rating=5" \
  -F "is_public=true" \
  -F "uploaded_images=@test1.png" \
  -F "uploaded_images=@test2.png"
  
  
curl -X POST http://127.0.0.1:8000/api/products/ \
  -H "Authorization: Bearer 실제_ACCESS_TOKEN" \
  -F "product=3" \
  -F "content=이미지 포함 리뷰입니다." \
  -F "rating=5" \
  -F "is_public=true" \
  -F "uploaded_images=@test1.png" \
  -F "uploaded_images=@test2.png"
```
확인할 것:
- 리뷰가 생성되는지
- `ReviewImage` 레코드가 2개 생기는지
- 응답의 `images` 배열에 이미지 URL이 보이는지
```
{"id":2,"user":1,"product":2,"content":"이미지 포함 리뷰입니다.","rating":5,"is_public":true,"images":[{"id":2,"image":"http://127.0.0.1:8000/reviews/test2.png","created_at":"2026-03-07T07:18:00.354955Z"},{"id":1,"image":"http://127.0.0.1:8000/reviews/test1.png","created_at":"2026-03-07T07:18:00.349388Z"}],"ai_result":null,"created_at":"2026-03-07T07:18:00.341954Z","updated_at":"2026-03-07T07:18:00.341970Z"}
```
정상입니다.

브라우저에서 이미지 URL 열기
응답에 나온 이미지 URL을 브라우저에서 직접 열어봅니다.
```
http://127.0.0.1:8000/media/reviews/test1.png

http://127.0.0.1:8000/media/products/test1.png
```
열리면 media 설정이 정상입니다.
