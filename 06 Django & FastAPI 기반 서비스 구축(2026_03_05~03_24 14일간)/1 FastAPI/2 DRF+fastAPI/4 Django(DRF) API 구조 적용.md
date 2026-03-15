1️⃣ accounts views.py

`backend/apps/accounts/views.py`
```python
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import User
from .serializers import UserSerializer


class UserViewSet(ViewSet):
    def list(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)
```

1️⃣ accounts serializer

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
2️⃣ products views.py

`backend/apps/products/views.py`
```python
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView

from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status

from .models import Product
from .serializers import ProductSerializer


class ProductPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = "page_size"
    max_page_size = 20


class ProductViewSet(ViewSet):
    """
    상품 API ViewSet
    - 목록
    - 상세
    - 생성
    - 수정
    - 삭제
    """

    def list(self, request):
        queryset = Product.objects.all().order_by("-id")

        paginator = ProductPagination()
        page = paginator.paginate_queryset(queryset, request)

        serializer = ProductSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    def create(self, request):
        serializer = ProductSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductSerializer(product, data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        product = get_object_or_404(Product, pk=pk)
        product.delete()
        return Response({"message": "deleted"}, status=status.HTTP_204_NO_CONTENT)
```

2️⃣ products serializer
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
3️⃣ reviews views.py

`backend/apps/reviews/views.py`
```python
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Review
from .serializers import ReviewSerializer


class ReviewViewSet(ViewSet):
    def list(self, request):
        reviews = Review.objects.all()
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        review = get_object_or_404(Review, pk=pk)
        serializer = ReviewSerializer(review)
        return Response(serializer.data)

    def create(self, request):
        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def update(self, request, pk=None):
        review = get_object_or_404(Review, pk=pk)
        serializer = ReviewSerializer(review, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def destroy(self, request, pk=None):
        review = get_object_or_404(Review, pk=pk)
        review.delete()
        return Response({"message": "deleted"})
```

3️⃣ reviews serializer
`backend/apps/reviews/serializers.py`
```python
from rest_framework import serializers
from .models import Review, ReviewImage, ReviewAI


class ReviewImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewImage
        fields = [
            "id",
            "image",
            "created_at",
        ]
        
class ReviewAISerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewAI
        fields = [
            "sentiment",
            "confidence",
            "keywords",
        ]
        
class ReviewSerializer(serializers.ModelSerializer):

    images = ReviewImageSerializer(
        many=True,
        read_only=True
    )

    ai_result = ReviewAISerializer(
        read_only=True
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
            "created_at",
            "updated_at",
        ]
```
---
4️⃣ interactions views.py

`backend/apps/interactions/views.py`
```python
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import (
    ReviewLike,
    ReviewBookmark,
    ReviewComment,
    ReviewReport,
)

from .serializers import (
    ReviewLikeSerializer,
    ReviewBookmarkSerializer,
    ReviewCommentSerializer,
    ReviewReportSerializer,
)

class ReviewLikeViewSet(ViewSet):
    def list(self, request):
        likes = ReviewLike.objects.all()
        serializer = ReviewLikeSerializer(likes, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ReviewLikeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
        
class ReviewBookmarkViewSet(ViewSet):
    def list(self, request):
        bookmarks = ReviewBookmark.objects.all()
        serializer = ReviewBookmarkSerializer(bookmarks, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ReviewBookmarkSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
        

class ReviewCommentViewSet(ViewSet):
    def list(self, request):
        comments = ReviewComment.objects.all()
        serializer = ReviewCommentSerializer(comments, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ReviewCommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
        
class ReviewReportViewSet(ViewSet):
    def list(self, request):
        reports = ReviewReport.objects.all()
        serializer = ReviewReportSerializer(reports, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ReviewReportSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
```

4️⃣ interactions serializer
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

    class Meta:
        model = ReviewLike
        fields = [
            "id",
            "user",
            "review",
            "created_at",
        ]
        
class ReviewBookmarkSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewBookmark
        fields = [
            "id",
            "user",
            "review",
            "created_at",
        ]
        
class ReviewCommentSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewComment
        fields = [
            "id",
            "user",
            "review",
            "content",
            "created_at",
        ]
        
class ReviewReportSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReviewReport
        fields = [
            "id",
            "user",
            "review",
            "reason",
            "created_at",
        ]
```
---
5️⃣ ai_gateway views

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
modes, views, serializer가 있으면 API를 테스트 할수 있는 조건이 완성됩니다.

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