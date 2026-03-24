이 단계는 앞에서 생성한 Django 프로젝트와 앱들을 실제로 URL에 연결하고, 각 앱이 기본적인 CRUD 구조를 가질 수 있도록 뼈대를 먼저 세팅하는 작업입니다.

이 작업을 먼저 해두면 이후 단계에서 모델, 시리얼라이저, 데이터베이스 로직, AI 연동 로직을 추가하더라도 이미 URL 구조와 뷰 구조가 잡혀 있기 때문에 기능을 확장하기가 훨씬 쉬워집니다.  
즉, 이번 단계는 기능 구현 전, 프로젝트의 골격을 세우는 초기 CRUD 연결 작업이라고 보면 됩니다.

```
accounts
backend/apps/accounts/views.py
backend/apps/accounts/urls.py

ai_gateway
backend/apps/ai_gateway/views.py
backend/apps/ai_gateway/urls.py

interactions
backend/apps/interactions/views.py
backend/apps/interactions/urls.py

products
backend/apps/products/views.py
backend/apps/products/urls.py

reviews
backend/apps/reviews/views.py
backend/apps/reviews/urls.py

# 모든앱을 처음 연결하는 url
backend/mysite/urls.py
```
---
1️⃣ products 앱 CRUD
`backend/apps/products/views.py`
```python
from rest_framework.viewsets import ViewSet


class ProductViewSet(ViewSet):
    """
    Product CRUD API
    """

    def list(self, request):
        pass

    def retrieve(self, request, pk=None):
        pass

    def create(self, request):
        pass

    def update(self, request, pk=None):
        pass

    def destroy(self, request, pk=None):
        pass
```

`backend/apps/products/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet


router = DefaultRouter()
router.register("", ProductViewSet, basename="product")

urlpatterns = [
    path("", include(router.urls)),
]
```

2️⃣ reviews 앱 CRUD
`backend/apps/reviews/views.py`
```python
from rest_framework.viewsets import ViewSet


class ReviewViewSet(ViewSet):

    def list(self, request):
        pass

    def retrieve(self, request, pk=None):
        pass

    def create(self, request):
        pass

    def update(self, request, pk=None):
        pass

    def destroy(self, request, pk=None):
        pass
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

3️⃣ interactions 앱 CRUD
`backend/apps/interactions/views.py`
```python
from rest_framework.viewsets import ViewSet


class ReviewLikeViewSet(ViewSet):
    pass


class ReviewBookmarkViewSet(ViewSet):
    pass


class ReviewCommentViewSet(ViewSet):
    pass


class ReviewReportViewSet(ViewSet):
    pass
```

`backend/apps/interactions/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReviewLikeViewSet,
    ReviewBookmarkViewSet,
    ReviewCommentViewSet,
    ReviewReportViewSet,
)


router = DefaultRouter()

router.register("likes", ReviewLikeViewSet, basename="review-like")
router.register("bookmarks", ReviewBookmarkViewSet, basename="review-bookmark")
router.register("comments", ReviewCommentViewSet, basename="review-comment")
router.register("reports", ReviewReportViewSet, basename="review-report")


urlpatterns = [
    path("", include(router.urls)),
]
```

4️⃣ accounts 앱 CRUD
`backend/apps/accounts/views.py`
```python
from rest_framework.viewsets import ViewSet


class UserViewSet(ViewSet):

    def list(self, request):
        pass

    def retrieve(self, request, pk=None):
        pass
```

`backend/apps/accounts/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet


router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
]
```

5️⃣ ai_gateway 앱
`backend/apps/ai_gateway/views.py`
```python
from rest_framework.views import APIView


class SentimentAnalysisAPIView(APIView):

    def post(self, request):
        pass
```

`backend/apps/ai_gateway/urls.py`
```python
from django.urls import path
from .views import SentimentAnalysisAPIView


urlpatterns = [
    path("sentiment/", SentimentAnalysisAPIView.as_view()),
]
```

6️⃣ 프로젝트 urls.py 연결
`backend/mysite/urls.py`
```python
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    path("accounts/", include("apps.accounts.urls")),
    path("products/", include("apps.products.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("interactions/", include("apps.interactions.urls")),
    path("ai/", include("apps.ai_gateway.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

서버 실행후 확인
```
python manage.py runserver
```

브라우저에서 아래 주소로 접속하여 에러 없이 정상 응답이 오는지 확인합니다.
```
http://127.0.0.1:8000/accounts/
http://127.0.0.1:8000/products/
http://127.0.0.1:8000/reviews/
http://127.0.0.1:8000/interactions/
http://127.0.0.1:8000/ai/sentiment/
```
완성된 코드가 아니므로 에러가 날수 있는점 참고해 주세요.

각 URL에 접속 시 다음을 확인합니다.
- 404 에러가 발생하지 않는지
- DRF 기본 화면(JSON 또는 API 브라우저)이 출력되는지
- 서버 로그에 에러가 없는지