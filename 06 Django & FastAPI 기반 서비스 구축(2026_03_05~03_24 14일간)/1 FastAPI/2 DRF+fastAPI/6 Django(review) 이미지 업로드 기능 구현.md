### 목표
- Product는 이미지 1장 업로드 가능
- Review는 본문 + 별점 + 이미지 여러 장 업로드 가능
- Review 생성 시 `uploaded_images`로 여러 장 업로드 가능
- View에서 `multipart/form-data` 처리 가능
- media 설정으로 실제 파일 접근 가능

### 먼저 이해해야 하는 개념
이 작업은 단순히 파일 하나 업로드하는 기능이 아닙니다. 
이 페이지에서 구현하는 것은 서비스 안에서 “제품 이미지”와 “리뷰 이미지”를 서로 다른 책임으로 분리해서 설계하는 작업입니다.

겉으로 보면 둘 다 이미지 업로드처럼 보이지만, 역할은 완전히 다릅니다.

- `Product.image`  
    → 제품 자체를 대표하는 이미지  
    → 제품 목록, 제품 상세, 상품 소개 화면에서 사용되는 기본 이미지
- `ReviewImage.image`  
    → 사용자가 리뷰를 쓰면서 첨부하는 이미지  
    → 실제 사용 후기, 인증 사진, 사용 전후 사진 같은 사용자 생성 콘텐츠

즉,
```
제품 이미지 = 상품 자체 설명용 이미지  
리뷰 이미지 = 사용자의 후기 증거 이미지
```
이 차이를 먼저 이해하고 구현해야 합니다.

### 왜 products 앱과 reviews 앱이 긴밀하게 연결되는가?
리뷰는 독립적으로 존재하지 않습니다.
리뷰는 항상 어떤 제품(Product)에 대한 후기이기 때문에,  리뷰 이미지도 결국은 제품과 간접적으로 연결됩니다.

관계를 풀어쓰면
```
Product  
 └── Review  
      └── ReviewImage
```

의미:
- 제품 하나에 여러 리뷰가 달릴 수 있고
- 리뷰 하나에 여러 이미지가 달릴 수 있다
- 따라서 리뷰 이미지는 직접적으로는 `Review`에 속하지만,  
    서비스 화면에서는 결국 특정 `Product` 상세 페이지 안에서 함께 보여지게 됩니다.

즉, DB 관계상으로는 분리되어 있지만  
서비스 화면과 사용자 경험 측면에서는 제품과 리뷰 이미지가 같이 움직인다는 점이 중요합니다.

### 이 작업에서 가장 신경 써야 하는 핵심

`1.` 제품 이미지와 리뷰 이미지를 절대 같은 개념으로 보면 안 됩니다.

처음 만들 때 가장 흔한 실수는  “어차피 둘 다 이미지니까 한 군데에서 같이 처리하면 되지 않나?” 이렇게 생각할수 있습니다.

하지만 실제로는 다릅니다.
- 제품 이미지는 운영자/관리자 관점의 데이터
- 리뷰 이미지는 사용자 업로드 데이터
- 제품 이미지는 보통 1장 또는 대표 이미지 중심
- 리뷰 이미지는 여러 장 업로드 가능
- 제품 이미지는 상품을 설명하기 위한 정적 데이터
- 리뷰 이미지는 후기와 함께 생성되는 동적 데이터

그래서 `Product.image`는 Product 모델 내부에 두고,  
`ReviewImage`는 별도 테이블로 분리하는 설계가 맞습니다.

---
`2.` 리뷰 이미지는 반드시 별도 테이블로 분리해야 합니다.
리뷰는 이미지가 0장일 수도 있고, 1장일 수도 있고, 여러 장일 수도 있습니다.  
이런 구조를 `Review` 모델 안에 이미지 필드 하나로 넣어버리면 곧 한계가 옵니다.

그래서:
```
Review 1 : N ReviewImage
```
구조로 설계해야 합니다.

이렇게 분리하면 좋은 점:
- 리뷰당 이미지 여러 장 저장 가능
- 이미지 추가 확장 쉬움
- 나중에 대표 이미지, 순서, 썸네일 같은 필드 추가 가능
- 리뷰 본문 데이터와 이미지 데이터를 분리해서 관리 가능

즉, 이 작업의 핵심은  
“리뷰 본문”과 “리뷰 첨부파일”을 분리해서 저장하는 설계 감각을 익히는 것입니다.

---
`3.` 업로드 기능보다 더 중요한 것은 데이터 흐름입니다.
이 기능은 이미지가 저장되기만 하면 끝나는 것이 아닙니다.
전체 흐름이 자연스럽게 이어져야 합니다.

브라우저  
 ```
 → multipart/form-data 요청  
 → Django View / ViewSet  
 → Serializer 검증  
 → Product 또는 Review 저장  
 → ReviewImage 별도 생성  
 → media 경로에 실제 파일 저장  
 → 다시 API 응답으로 이미지 URL 반환  
 → 프론트에서 화면 표시
 ```

---
### 설계할 때 체크해야 하는 포인트

A. Product와 Review의 이미지 책임을 구분했는가
반드시 아래처럼 생각해야 합니다.
```
Product.image  
= 제품 대표 이미지  
  
ReviewImage.image  
= 리뷰 첨부 이미지
```
이 둘이 섞이면 안 됩니다.

예를 들어:
- 제품 대표 이미지를 리뷰 이미지처럼 여러 장 처리하면 안 됩니다.
- 리뷰 이미지를 Product 모델에 직접 넣으면 안됩니다.

---
B. Review는 Product에 종속된다는 점을 잊지 말아야 한다

리뷰 이미지는 직접적으로는 `Review`에 달리지만, 그 리뷰는 다시 `Product`에 속합니다.

즉 화면에서는 보통 이렇게 보입니다.
```
제품 상세 페이지  
 ├─ 제품 대표 이미지  
 ├─ 제품 정보  
 └─ 해당 제품의 리뷰 목록  
      ├─ 리뷰 본문  
      └─ 리뷰 이미지들
```

그래서 제품 상세 페이지를 만들 때는 단순히 Product만 조회하는 것이 아니라  
그 제품에 연결된 Review와 ReviewImage까지 고려해야 합니다.

---
`C.` 업로드 경로를 분리했는가

업로드 경로를 나누는 것은 매우 중요하다.
```
products/  
reviews/
```

이렇게 분리해야 하는 이유:
- 어떤 이미지가 제품용인지 리뷰용인지 바로 구분 가능
- 파일 관리가 쉬움
- 나중에 삭제/교체/백업 시 혼동이 적음

즉, 파일 저장 위치 자체도 설계의 일부라고 보면 됩니다.

---
D. 요청 형식이 multipart/form-data인지 확인해야 합니다.

이미지 업로드는 JSON 요청처럼 처리되지 않습니다.
파일이 포함되면 반드시 `multipart/form-data` 방식으로 들어와야 합니다.

그래서 이 작업에서는 View에서 parser 설정이 중요하고, 프론트나 curl 테스트도 일반 JSON 요청과 다르게 해야 합니다.

이 부분을 이해하지 못하면  
“코드는 맞는데 파일이 안 들어가는” 문제가 자주 생깁니다.

---
E. Review 생성과 ReviewImage 생성은 한 흐름으로 묶여 있어야 합니다.

리뷰 이미지는 혼자 존재할 수 없습니다.  
반드시 먼저 리뷰가 생성되어야 하고, 그 다음 그 리뷰에 연결된 이미지가 저장되어야 합니다.

흐름은 이렇게 이해하면 된다.
1. Review 생성  
2. uploaded_images 꺼내기  
3. 반복문으로 ReviewImage 생성  
4. 최종 응답 반환

즉, 리뷰가 부모, 리뷰 이미지는 자식이라는 관계를 항상 염두에 둬야 합니다.

---
### 머릿속에 먼저 그려야 하는 구조
```
[제품]  
  └─ 대표 이미지 1장  
  
[리뷰]  
  └─ 본문 / 평점 / 공개여부  
  └─ 첨부 이미지 여러 장  
  
[관계]  
Product 1 : N Review  
Review 1 : N ReviewImage
```

즉,
- 제품은 제품대로 대표 이미지가 있고
- 리뷰는 리뷰대로 여러 첨부 이미지가 있고
- 둘은 분리되어 있지만 실제 서비스 화면에서는 함께 보여진다

이 관점을 먼저 이해해야 뒤에 나오는 모델, serializer, view, media 설정이 왜 그렇게 구성되어 있는지 자연스럽게 이해할 수 있습니다.

---
이 작업의 목표
제품의 대표 이미지와 리뷰의 첨부 이미지를 역할별로 분리해서 저장하고,  
리뷰 생성 시 여러 장의 이미지를 안전하게 업로드할 수 있는 구조를 만드는 것입니다.

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

이미지가 삽입되는 위치
![[Pasted image 20260322214201.png]]
![[Pasted image 20260322214300.png]]

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

`requirements.txt` 갱신
```
uv pip freeze > requirements.txt
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
