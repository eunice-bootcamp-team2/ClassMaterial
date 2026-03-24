
반드시 경로 이동후 명령어를 실행하세요.
```bash
cd backend
```

생성해야할 폴더명
```bash
mkdir -p templates/accounts templates/includes templates/products static/css static/images static/js 
```

생성해야할 파일명
```bash
touch templates/base.html \
templates/accounts/login.html \
templates/accounts/signup.html \
templates/includes/navbar.html \
templates/products/product_create.html \
templates/products/product_detail.html \
templates/products/product_list.html \
templates/products/product_update.html \
static/css/style.css \
static/js/api.js \
static/js/auth.js \
static/js/product-create.js \
static/js/product-detail.js \
static/js/product-list.js \
static/js/product-update.js \
```

생성되는 디렉토리 구조
```
project-root/
│
├── templates/
│   ├── base.html
│   ├── accounts/
│   │   ├── login.html
│   │   └── signup.html
│   ├── includes/
│   │   └── navbar.html
│   └── products/
│       ├── product_create.html
│       ├── product_detail.html
│       ├── product_list.html
│       └── product_update.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── product-create.js
        ├── product-detail.js
        ├── product-list.js
        └── product-update.js
```
---
설정

`mysite/settings.py`
```python
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"], # 프로젝트 공통 templates
        "APP_DIRS": True,
        "OPTIONS": {
				.......
            ],
        },
    },
]

STATICFILES_DIRS = [
  BASE_DIR / "static",
]
```
---
1️⃣ accounts 

`backend/apps/accounts/views.py`
```python
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .models import User
from .serializers import UserSerializer, SignupSerializer


# -------------------------------------------------
# API Views
# -------------------------------------------------
class UserViewSet(ViewSet):
    """
    사용자 조회용 ViewSet
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        users = User.objects.all().order_by("-id")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)


class SignupAPIView(generics.CreateAPIView):
    """
    회원가입 API
    POST /accounts/api/signup/
    """

    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class MeAPIView(generics.RetrieveAPIView):
    """
    현재 로그인한 사용자 정보 조회 API
    GET /accounts/api/me/
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# -------------------------------------------------
# Template Views
# -------------------------------------------------
class SignupPageView(TemplateView):
    template_name = "accounts/signup.html"


class LoginPageView(TemplateView):
    template_name = "accounts/login.html"


class MyPageView(TemplateView):
    template_name = "accounts/mypage.html"
```
- 8번파일 → API 동작을 이해하기 위해 직접 `create()`를 커스터마이징함 → `status` 필요
- 9번파일 → 템플릿 + JS 구조 분리에 집중하면서 API를 기본형으로 단순화 → `status` 제거
---
`backend/apps/accounts/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    UserViewSet,
    SignupAPIView,
    MeAPIView,
    SignupPageView,
    LoginPageView,
    MyPageView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    # =================================================
    # Template Page URLs
    # =================================================
    path("signup/", SignupPageView.as_view(), name="signup-page"),
    path("login/", LoginPageView.as_view(), name="login-page"),
    path("mypage/", MyPageView.as_view(), name="mypage"),

    # =================================================
    # API URLs
    # =================================================
    path("api/", include(router.urls)),
    path("api/signup/", SignupAPIView.as_view(), name="signup-api"),
    path("api/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeAPIView.as_view(), name="me-api"),
]
```
URL 구조 변경
- 8번파일: `/accounts/signup/` → API
- 9번파일: `/accounts/signup/` → HTML 페이지  
	     `/accounts/api/signup/` → API
탬플릿과 API 역할분리

---
2️⃣ products 

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
    - 부분 수정
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
            partial=False,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def partial_update(self, request, pk=None):
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
        return Response({"message": "deleted"}, status=status.HTTP_204_NO_CONTENT)


class ProductListPageView(TemplateView):
    template_name = "products/product_list.html"


class ProductDetailPageView(TemplateView):
    template_name = "products/product_detail.html"


class ProductCreatePageView(TemplateView):
    template_name = "products/product_create.html"


class ProductUpdatePageView(TemplateView):
    template_name = "products/product_update.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["pk"] = self.kwargs.get("pk")
        return context
```

`backend/apps/products/serializers.py`
```python
from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    # =========================================================
    # [추가]
    # 이미지 업로드를 serializer에서 명시적으로 받기 위한 필드
    # - required=False : 이미지 없이도 생성/수정 가능
    # - allow_null=True : null 허용
    # Product 모델에 image 필드가 있는 구조에 맞춘 부분
    # =========================================================
    image = serializers.ImageField(required=False, allow_null=True)

    # =========================================================
    # [추가]
    # 프론트엔드에서 바로 사용할 수 있는 이미지 URL을 내려주기 위한 필드
    # DB에 저장된 image 자체와 별도로 image_url 값을 응답에 포함합니다.
    # =========================================================
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",

            # =================================================
            # [추가/유지]
            # Product 모델의 이미지 필드
            # =================================================
            "image",

            # =================================================
            # [추가]
            # 클라이언트에서 미리보기/출력용으로 사용하는 URL 필드
            # =================================================
            "image_url",

            "created_at",
        ]

    # =========================================================
    # [추가]
    # image 필드의 실제 접근 가능한 URL을 만들어 반환하는 메서드
    #
    # 예:
    # - request가 있으면 절대경로:
    #   http://127.0.0.1:8000/media/products/a.jpg
    #
    # - request가 없으면 상대경로:
    #   /media/products/a.jpg
    # =========================================================
    def get_image_url(self, obj):
        request = self.context.get("request")

        # [추가]
        # 이미지가 없으면 None 반환
        if not obj.image:
            return None

        try:
            image_url = obj.image.url
        except Exception:
            # [추가]
            # 파일 접근 중 예외가 나면 안전하게 None 반환
            return None

        # [추가]
        # request가 있으면 절대 URL 생성
        if request:
            return request.build_absolute_uri(image_url)

        # [추가]
        # request가 없으면 상대 URL 반환
        return image_url
```

`backend/apps/products/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,

    # -------------------------------
    # [추가] 템플릿 페이지용 View
    # -------------------------------
    ProductListPageView,
    ProductDetailPageView,
    ProductCreatePageView,
    ProductUpdatePageView,
)

router = DefaultRouter()

# -----------------------------------
# [수정] ProductViewSet를 api/ 아래에서만 사용하도록 유지
# 실제 최종 URL: /products/api/
# 또는 /products/api/<pk>/
# -----------------------------------
router.register("", ProductViewSet, basename="product")

urlpatterns = [
    # =================================================
    # Template Page URLs
    # =================================================

    # -----------------------------------
    # [추가] 상품 목록 페이지
    # 실제 최종 URL: /products/
    # -----------------------------------
    path("", ProductListPageView.as_view(), name="product-page-list"),
    path("create/", ProductCreatePageView.as_view(), name="product-page-create"),
    path("<int:pk>/update/", ProductUpdatePageView.as_view(), name="product-page-edit"),

    # -----------------------------------
    # [추가] 상품 상세 페이지
    # 실제 최종 URL: /products/1/
    # -----------------------------------
    path("<int:pk>/", ProductDetailPageView.as_view(), name="product-page-detail"),


    # =================================================
    # API URLs
    # =================================================

    # -----------------------------------
    # [추가] API는 api/ 하위로 분리
    # 실제 최종 URL:
    # /products/api/
    # /products/api/1/
    # -----------------------------------
    path("api/", include(router.urls)),
]
```
---
3️⃣ reviews  

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

`backend/apps/reviews/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReviewViewSet,
    MyReviewListAPIView,
    ReviewImageUploadAPIView,
    ReviewAIResultAPIView,
)

router = DefaultRouter()
router.register("", ReviewViewSet, basename="review")

urlpatterns = [
    path("my/", MyReviewListAPIView.as_view(), name="my-review-list"),
    path("<int:review_id>/images/", ReviewImageUploadAPIView.as_view(), name="review-image-upload"),
    path("<int:review_id>/ai/", ReviewAIResultAPIView.as_view(), name="review-ai-result"),
    path("", include(router.urls)),
]
```
---
4️⃣ 탬플릿

Base html
`backend/templates/base.html`
```html
{% load static %}
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Product Review Service{% endblock %}</title>

    <!-- 공통 CSS -->
    <link rel="stylesheet" href="{% static 'css/style.css' %}">
</head>
<body>

    <!-- 공통 네비게이션 -->
    {% include "includes/navbar.html" %}

    <main class="container">
        {% block content %}
        {% endblock %}
    </main>
    
    <!-- 공통 하단정보 -->
    {% include "footer.html" %}

    <!-- Axios CDN -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <!-- 공통 API 인스턴스 -->
    <script src="{% static 'js/api.js' %}"></script>

    <!-- 페이지별 JS -->
    {% block script %}
    {% endblock %}
</body>
</html>
```

footer html 파일 추가
`backend/templates/footer.html`
```html
<footer>
	<p>&copy; 2024 Product Review Service. All rights reserved.</p>
</footer>
```

---
5️⃣ navigation

navbar html
`backend/templates/includes/navbar.html`
```html
<nav class="navbar">
    <div class="navbar-left">
        <a href="/products/" class="logo">Review Service</a>
    </div>

    <div class="navbar-right">
        <a href="/products/">상품목록</a>
        <a href="/accounts/signup/">회원가입</a>
        <a href="/accounts/login/">로그인</a>
        <a href="/accounts/mypage/">마이페이지</a>
        <button type="button" id="logoutBtn">로그아웃</button>
    </div>
</nav>
```

---
6️⃣ 공통 js

`backend/static/js/api.js`
```js
const api = axios.create({
    timeout: 10000,
});

// ------------------------------
// 토큰 유틸 함수
// ------------------------------
function getAccessToken() {
    return localStorage.getItem("access_token");
}

function getRefreshToken() {
    return localStorage.getItem("refresh_token");
}

function setTokens(access, refresh = null) {
    if (access) {
        localStorage.setItem("access_token", access);
    }
    if (refresh) {
        localStorage.setItem("refresh_token", refresh);
    }
}

function clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
}

// ------------------------------
// 요청 인터셉터
// access token 자동 첨부
// ------------------------------
api.interceptors.request.use(
    function (config) {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);

// ------------------------------
// refresh 중복 처리 방지
// ------------------------------
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });

    failedQueue = [];
}

// ------------------------------
// 응답 인터셉터
// 401이면 refresh 시도
// ------------------------------
api.interceptors.response.use(
    function (response) {
        return response;
    },
    async function (error) {
        const originalRequest = error.config;

        if (!error.response) {
            return Promise.reject(error);
        }

        if (error.response.status === 401 && !originalRequest._retry) {
            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                clearTokens();
                window.location.href = "/accounts/login/";
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                .then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post("/accounts/api/token/refresh/", {
                    refresh: refreshToken,
                });

                const newAccess = response.data.access;
                setTokens(newAccess);

                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                processQueue(null, newAccess);

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearTokens();
                window.location.href = "/accounts/login/";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ------------------------------
// 로그아웃 공통 처리
// ------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            clearTokens();
            alert("로그아웃 되었습니다.");
            window.location.href = "/accounts/login/";
        });
    }
});

// 전역으로 사용 가능하게 등록
window.api = api;
window.authUtils = {
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
};
```
---
### 앱 탬플릿 & JS

1️⃣ accounts

회원가입
`backend/templates/accounts/signup.html`
```html
{% extends "base.html" %}
{% load static %}

{% block title %}회원가입{% endblock %}

{% block content %}
<section class="card auth-card">
    <h1>회원가입</h1>

    <form id="signupForm" class="form">
        <div class="form-group">
            <label for="username">아이디</label>
            <input type="text" id="username" required>
        </div>

        <div class="form-group">
            <label for="email">이메일</label>
            <input type="email" id="email" required>
        </div>

        <div class="form-group">
            <label for="password">비밀번호</label>
            <input type="password" id="password" required>
        </div>

        <div class="form-group">
            <label for="password_confirm">비밀번호 확인</label>
            <input type="password" id="password_confirm" required>
        </div>

        <button type="submit" class="btn">회원가입</button>
    </form>

    <p class="helper-text">
        이미 계정이 있으신가요? <a href="/accounts/login/">로그인</a>
    </p>
</section>
{% endblock %}

{% block script %}
<script src="{% static 'js/auth.js' %}"></script>
{% endblock %}
```

로그인
`backend/templates/accounts/login.html`
```html
{% extends "base.html" %}
{% load static %}

{% block title %}로그인{% endblock %}

{% block content %}
<section class="card auth-card">
    <h1>로그인</h1>

    <form id="loginForm" class="form">
        <div class="form-group">
            <label for="username">아이디</label>
            <input type="text" id="username" required>
        </div>

        <div class="form-group">
            <label for="password">비밀번호</label>
            <input type="password" id="password" required>
        </div>

        <button type="submit" class="btn">로그인</button>
    </form>

    <p class="helper-text">
        아직 계정이 없으신가요? <a href="/accounts/signup/">회원가입</a>
    </p>
</section>
{% endblock %}

{% block script %}
<script src="{% static 'js/auth.js' %}"></script>
{% endblock %}
```

마이페이지 템플릿 : 파일추가
`backend/templates/accounts/mypage.html`
```html
{% extends "base.html" %}
{% load static %}

{% block title %}마이페이지{% endblock %}

{% block content %}
<section class="card">
    <h1>내 정보</h1>
    <div id="myInfoBox" class="detail-box">
        <p>로딩 중...</p>
    </div>
</section>
{% endblock %}

{% block script %}
<script src="{% static 'js/auth.js' %}"></script>
{% endblock %}
```

accounts 공통 JS
`backend/static/js/auth.js`
```js
document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("signupForm");
    const loginForm = document.getElementById("loginForm");
    const myInfoBox = document.getElementById("myInfoBox");

    // ------------------------------
    // 회원가입
    // POST /accounts/api/signup/
    // ------------------------------
    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const payload = {
                username: document.getElementById("username").value,
                email: document.getElementById("email").value,
                password: document.getElementById("password").value,
                password_confirm: document.getElementById("password_confirm").value,
            };

            try {
                await axios.post("/accounts/api/signup/", payload);

                alert("회원가입이 완료되었습니다.");
                window.location.href = "/accounts/login/";
            } catch (error) {
                console.error("회원가입 실패:", error.response?.data || error);
                alert("회원가입에 실패했습니다: " + JSON.stringify(error.response?.data || {}));
            }
        });
    }

    // ------------------------------
    // 로그인
    // POST /accounts/api/login/
    // ------------------------------
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const payload = {
                username: document.getElementById("username").value,
                password: document.getElementById("password").value,
            };

            try {
                const response = await axios.post("/accounts/api/login/", payload);

                const access = response.data.access;
                const refresh = response.data.refresh;

                // 토큰 저장
                localStorage.setItem("access", access);
                localStorage.setItem("refresh", refresh);

                // authUtils가 있으면 같이 사용
                if (window.authUtils && typeof window.authUtils.setTokens === "function") {
                    window.authUtils.setTokens(access, refresh);
                }

                alert("로그인 성공");
                window.location.href = "/products/";
            } catch (error) {
                console.error("로그인 실패:", error.response?.data || error);
                alert("로그인에 실패했습니다: " + JSON.stringify(error.response?.data || {}));
            }
        });
    }

    // ------------------------------
    // 내 정보 조회
    // GET /accounts/api/me/
    // ------------------------------
    if (myInfoBox) {
        loadMyInfo();
    }

    async function loadMyInfo() {
        try {
            const token = localStorage.getItem("access");

            const response = await axios.get("/accounts/api/me/", {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            });

            const user = response.data;

            myInfoBox.innerHTML = `
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>아이디:</strong> ${user.username}</p>
                <p><strong>이메일:</strong> ${user.email}</p>
                <p><strong>가입일:</strong> ${user.created_at || "-"}</p>
            `;
        } catch (error) {
            console.error("내 정보 조회 실패:", error.response?.data || error);
            myInfoBox.innerHTML = `<p>내 정보를 불러오지 못했습니다.</p>`;
        }
    }
});
```
---
2️⃣ 글생성 HTML & JS

create html
`backend/templates/products/product_create.html`
```python
{% extends "base.html" %}
{% load static %}

{% block title %}상품 등록{% endblock %}

{% block content %}
<section class="card product-create-card">
    <div class="page-header">
        <h1>상품 등록</h1>
    </div>

    <form id="productCreateForm" class="form product-create-form">
        <div class="form-group">
            <label for="name">상품 이름</label>
            <input
                type="text"
                id="name"
                name="name"
                placeholder="상품 이름을 입력하세요."
                required
            >
        </div>

        <div class="form-group">
            <label for="description">설명</label>
            <textarea
                id="description"
                name="description"
                placeholder="상품 설명을 입력하세요."
            ></textarea>
        </div>

        <div class="form-group">
            <label for="price">가격</label>
            <input
                type="number"
                id="price"
                name="price"
                placeholder="가격을 입력하세요."
                required
            >
        </div>

        <div class="form-group">
            <label for="image">이미지</label>
            <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
            >
        </div>

        <div class="product-create-actions">
            <button type="submit" class="btn-primary">상품 등록</button>
            <a href="/products/" class="btn">목록으로</a>
        </div>
    </form>
</section>
{% endblock %}

{% block script %}
<script src="{% static 'js/product-create.js' %}"></script>
{% endblock %}
```

create js
`backend/static/js/product-create.js`
```js
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("productCreateForm");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const description = document.getElementById("description").value.trim();
        const price = document.getElementById("price").value;
        const imageFile = document.getElementById("image").files[0];

        if (!name) {
            alert("상품 이름을 입력해주세요.");
            return;
        }

        if (!price) {
            alert("가격을 입력해주세요.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("price", price);

        if (imageFile) {
            formData.append("image", imageFile);
        }

        try {
            const response = await api.post("/products/api/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            alert("상품이 등록되었습니다.");
            window.location.href = "/products/";
        } catch (error) {
            console.error("상품 등록 실패:", error);

            if (error.response && error.response.data) {
                console.log("서버 응답:", error.response.data);
                alert("상품 등록 실패: " + JSON.stringify(error.response.data));
            } else {
                alert("상품 등록에 실패했습니다.");
            }
        }
    });
});
```
---
3️⃣ 상세보기 HTML & JS

detail html
`backend/templates/products/product_detail.html`
```python
{% extends "base.html" %}
{% load static %}

{% block title %}상품 상세{% endblock %}

{% block content %}
<section class="card">
    <div id="productDetailBox" class="detail-box">
        <p>로딩 중...</p>
    </div>

    <div class="product-create-actions" style="margin-top: 20px;">
        <button type="button" id="editBtn" class="btn-primary">수정</button>
        <button type="button" id="deleteBtn" class="btn-danger">삭제</button>
        <a href="/products/" class="btn">목록</a>
    </div>
</section>
{% endblock %}

{% block script %}
<script>
    window.PRODUCT_ID = "{{ view.kwargs.pk }}";
</script>
<script src="{% static 'js/product-detail.js' %}"></script>
{% endblock %}
```

detail js
`backend/static/js/product-detail.js`
```js
document.addEventListener("DOMContentLoaded", function () {
    const productDetailBox = document.getElementById("productDetailBox");
    const productId = window.PRODUCT_ID;

    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteBtn");

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
                <div class="product-detail-card">
                    ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="thumb">` : ""}
                    <h1>${product.name}</h1>
                    <p>${product.description || ""}</p>
                    <p><strong>${Number(product.price).toLocaleString()}원</strong></p>
                    <p class="muted">등록일: ${product.created_at || "-"}</p>
                </div>
            `;
        } catch (error) {
            console.error("상품 상세 조회 실패:", error.response?.data || error);
            productDetailBox.innerHTML = `<p>상품 상세 정보를 불러오지 못했습니다.</p>`;
        }
    }

    if (editBtn) {
        editBtn.addEventListener("click", function () {
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
});
```
---
4️⃣ 목록보기 HTML & JS

list html
`backend/templates/products/product_list.html`
```js
{% extends "base.html" %}
{% load static %}

{% block title %}상품 목록{% endblock %}

{% block content %}
<section class="card">
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h1>상품 목록</h1>

        <div style="display:flex; gap:10px;">
            <a href="/products/create/" class="btn-primary">상품 등록</a>
        </div>
    </div>

    <div id="productList" class="grid"></div>

    <div class="pagination">
        <button type="button" id="prevBtn">이전</button>
        <span id="pageInfo">1 페이지</span>
        <button type="button" id="nextBtn">다음</button>
    </div>
</section>
{% endblock %}

{% block script %}
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="{% static 'js/product-list.js' %}"></script>
{% endblock %}
```

list js
`backend/static/js/product-list.js`
```python
document.addEventListener("DOMContentLoaded", function () {
    const productList = document.getElementById("productList");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");

    let currentPage = 1;
    let nextPageExists = false;

    async function renderProductCard(product) {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.productId = product.id;

        card.innerHTML = `
            <a href="/products/${product.id}/" class="product-link">
                ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="thumb">` : ""}
                <h3>${product.name}</h3>
                <p class="muted">${product.description || ""}</p>
                <p><strong>${product.price}원</strong></p>
            </a>
        `;

        return card;
    }

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


---
5️⃣ 수정하기  HTML & JS

update html
`backend/templates/products/product_update.html`
```python
{% extends "base.html" %}
{% load static %}

{% block title %}상품 수정{% endblock %}

{% block content %}
<section class="card product-create-card">
    <h1>상품 수정</h1>

    <form id="productUpdateForm" class="form product-create-form">
        <div class="form-group">
            <label for="name">상품 이름</label>
            <input type="text" id="name" name="name" required>
        </div>

        <div class="form-group">
            <label for="description">설명</label>
            <textarea id="description" name="description"></textarea>
        </div>

        <div class="form-group">
            <label for="price">가격</label>
            <input type="number" id="price" name="price" required>
        </div>

        <div class="form-group">
            <label for="image">이미지</label>
            <input type="file" id="image" name="image" accept="image/*">
        </div>

        <div class="form-group">
            <label>현재 이미지</label>
            <div class="preview-box">
                <img
                    id="imagePreview"
                    class="preview-image"
                    src=""
                    alt="현재 이미지 미리보기"
                    style="display: none;"
                >
            </div>
        </div>

        <div class="product-create-actions">
            <button type="submit" class="btn-primary">수정 완료</button>
            <a href="/products/" class="btn">목록으로</a>
        </div>
    </form>
</section>
{% endblock %}

{% block script %}
<script src="{% static 'js/product-update.js' %}"></script>
{% endblock %}
```

update js
`backend/static/js/product-update.js`
```js
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("productUpdateForm");

    const nameInput = document.getElementById("name");
    const descriptionInput = document.getElementById("description");
    const priceInput = document.getElementById("price");
    const imageInput = document.getElementById("image");
    const imagePreview = document.getElementById("imagePreview");

    // 현재 URL 예: /products/15/update/
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const productId = pathParts[1]; // ["products", "15", "update"]

    async function loadProduct() {
        try {
            const response = await axios.get(`/products/api/${productId}/`);
            const product = response.data;

            nameInput.value = product.name || "";
            descriptionInput.value = product.description || "";
            priceInput.value = product.price || "";

            if (product.image_url || product.image) {
                imagePreview.src = product.image_url || product.image;
                imagePreview.style.display = "block";
            } else {
                imagePreview.style.display = "none";
            }
        } catch (error) {
            console.error("상품 정보 조회 실패:", error.response?.data || error);
            alert("상품 정보를 불러오지 못했습니다.");
        }
    }

    if (imageInput) {
        imageInput.addEventListener("change", function () {
            const file = imageInput.files[0];

            if (!file) {
                imagePreview.style.display = "none";
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                imagePreview.src = event.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        });
    }

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = nameInput.value.trim();
            const description = descriptionInput.value.trim();
            const price = priceInput.value.trim();

            if (!name) {
                alert("상품 이름을 입력해주세요.");
                return;
            }

            if (!price) {
                alert("가격을 입력해주세요.");
                return;
            }

            try {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("description", description);
                formData.append("price", price);

                if (imageInput.files.length > 0) {
                    formData.append("image", imageInput.files[0]);
                }

                const response = await axios.patch(
                    `/products/api/${productId}/`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data"
                        }
                    }
                );

                console.log("상품 수정 성공:", response.data);
                alert("상품이 수정되었습니다.");
                window.location.href = `/products/${productId}/`;
            } catch (error) {
                console.error("상품 수정 실패:", error.response?.data || error);
                alert("상품 수정에 실패했습니다.");
            }
        });
    }

    loadProduct();
});
```
---
6️⃣ 공통 css

`backend/static/css/style.css`
```css
/* ------------------------------
   기본 설정
------------------------------ */
* {
    box-sizing: border-box;
}

:root {
    --bg: #f4f6fb;
    --surface: #ffffff;
    --surface-2: #f8fafc;
    --text: #1f2937;
    --muted: #6b7280;
    --line: #e5e7eb;
    --line-strong: #d1d5db;

    --primary: #111827;
    --primary-hover: #000000;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;

    --danger: #dc2626;
    --danger-hover: #b91c1c;

    --shadow-sm: 0 4px 14px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 10px 30px rgba(15, 23, 42, 0.10);
    --shadow-lg: 0 18px 40px rgba(15, 23, 42, 0.14);

    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 18px;
}

html, body {
    height: 100%;
}

body {
    margin: 0;
    font-family: "Pretendard", "Noto Sans KR", Arial, sans-serif;
    background:
        radial-gradient(circle at top, #ffffff 0%, #f4f6fb 45%, #eef2f7 100%);
    color: var(--text);
    line-height: 1.55;
}

/* ------------------------------
   공통 요소
------------------------------ */
a {
    text-decoration: none;
    color: inherit;
}

button {
    cursor: pointer;
    font: inherit;
}

img {
    display: block;
    max-width: 100%;
}

.container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 34px 22px 60px;
}

/* ------------------------------
   네비게이션
------------------------------ */
.navbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 28px;
    background: rgba(17, 24, 39, 0.94);
    color: #ffffff;
    backdrop-filter: blur(10px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
}

.logo {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.navbar > div:last-child {
    display: flex;
    align-items: center;
    gap: 10px;
}

.navbar a,
.navbar button {
    margin-left: 0;
    color: #ffffff;
    background: transparent;
    border: 1px solid transparent;
    font-size: 15px;
    font-weight: 600;
    padding: 10px 14px;
    border-radius: 10px;
    transition: all 0.2s ease;
}

.navbar a:hover,
.navbar button:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.10);
}

/* ------------------------------
   카드 / 레이아웃
------------------------------ */
.card {
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(229, 231, 235, 0.9);
    border-radius: var(--radius-lg);
    padding: 28px;
    box-shadow: var(--shadow-md);
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 26px;
}

.page-header h1,
.card h1,
.card h2 {
    margin: 0;
    letter-spacing: -0.03em;
}

.page-header h1,
.card h1 {
    font-size: 28px;
    font-weight: 800;
}

.card h2 {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 18px;
}

/* ------------------------------
   폼
------------------------------ */
.form {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    background: #ffffff;
    color: var(--text);
    font-size: 15px;
    outline: none;
    transition: all 0.2s ease;
}

.form-group textarea {
    min-height: 120px;
    resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

/* ------------------------------
   버튼
------------------------------ */
.btn,
.btn-primary,
.btn-danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 12px 18px;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
}

.btn {
    background: var(--primary);
    color: #ffffff;
}

.btn:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
}

.btn-primary {
    background: var(--accent);
    color: #ffffff;
}

.btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.btn-danger {
    background: var(--danger);
    color: #ffffff;
}

.btn-danger:hover {
    background: var(--danger-hover);
    transform: translateY(-1px);
}

/* ------------------------------
   인증 카드
------------------------------ */
.auth-card {
    max-width: 560px;
    margin: 56px auto;
    padding: 34px;
}

.auth-card h1 {
    margin-bottom: 26px;
    font-size: 26px;
}

.helper-text {
    color: var(--muted);
    font-size: 14px;
    margin-top: 10px;
}

.helper-text a {
    color: var(--accent);
    font-weight: 700;
}

/* ------------------------------
   상품/리뷰 그리드 카드
------------------------------ */
.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
}

.product-card,
.review-card {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 18px;
    background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
    box-shadow: var(--shadow-sm);
    transition: all 0.22s ease;
}

.product-card:hover,
.review-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.product-card h3,
.review-card h3 {
    margin: 14px 0 8px;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.product-card p,
.review-card p {
    margin: 6px 0;
}

/* ------------------------------
   썸네일 / 디테일 이미지
------------------------------ */
.thumb {
    width: 100%;
    height: 250px;
    object-fit: cover;
    border-radius: 14px;
    background: #eef2f7;
    border: 1px solid var(--line);
}

.preview-box,
.detail-images {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 14px;
}

.preview-image,
.detail-image {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #f8fafc;
    box-shadow: var(--shadow-sm);
}

/* ------------------------------
   상세 영역
------------------------------ */
.detail-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.detail-box h1 {
    margin-top: 4px;
    margin-bottom: 0;
    font-size: 30px;
    font-weight: 800;
}

.detail-box p {
    margin: 0;
    font-size: 15px;
}

.muted {
    color: var(--muted);
}

/* ------------------------------
   페이지네이션
------------------------------ */
.pagination {
    margin-top: 30px;
    display: flex;
    justify-content: center;
    gap: 10px;
    align-items: center;
}

.pagination button {
    min-width: 80px;
    padding: 10px 14px;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: #ffffff;
    color: var(--text);
    transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
    background: var(--primary);
    color: #ffffff;
    border-color: var(--primary);
}

.pagination button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

#pageInfo {
    font-weight: 700;
    color: var(--muted);
}

/* ------------------------------
   파일 입력 약간 정리
------------------------------ */
input[type="file"] {
    padding: 10px;
    background: #fafafa;
}

/* ------------------------------
   링크 버튼 느낌 보정
------------------------------ */
a.btn,
a.btn-primary,
a.btn-danger {
    text-decoration: none;
}

/* ------------------------------
   상품 등록 페이지 전용
------------------------------ */
.product-create-card {
    max-width: 860px;
    margin: 0 auto;
}

.product-create-form {
    gap: 20px;
}

.product-create-form textarea {
    min-height: 140px;
}

.product-create-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}

.product-create-actions .btn,
.product-create-actions .btn-primary {
    min-width: 120px;
}

@media (max-width: 768px) {
    .product-create-card {
        max-width: 100%;
    }

    .product-create-actions {
        flex-direction: column;
    }

    .product-create-actions .btn,
    .product-create-actions .btn-primary {
        width: 100%;
    }
}

/* ------------------------------
   리뷰 / 인터렉션 영역 개선
------------------------------ */

/* 리뷰 박스 전체 크기 정리 */
.review-box {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
}

/* 리뷰 한 개 카드 내부 블록 */
.review-item {
    margin-top: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #fafbfd;
}

/* 리뷰 상단 */
.review-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 6px;
}

.review-top strong {
    font-size: 15px;
    font-weight: 800;
}

.review-content {
    margin: 8px 0 10px;
    font-size: 14px;
    color: var(--text);
    line-height: 1.5;
    word-break: break-word;
}

/* 액션 버튼 줄 */
.review-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    margin-bottom: 10px;
}

/* 공통 액션 버튼 */
.action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 8px 12px;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: #ffffff;
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    box-shadow: none;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: #f3f4f6;
    border-color: #cbd5e1;
}

/* 버튼 안 텍스트 */
.action-label {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
}

/* 버튼 안 숫자 */
.action-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: #eef2ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
}

/* 신고 버튼은 숫자 없음 */
.report-action-btn .action-label {
    color: #b91c1c;
}

/* 댓글 작성 폼 */
.comment-form {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.comment-input {
    flex: 1;
    min-width: 0;
    height: 38px;
    padding: 0 12px;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    background: #ffffff;
}

.comment-input:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.comment-btn {
    height: 38px;
    padding: 0 14px;
    border: none;
    border-radius: 10px;
    background: var(--primary);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s ease;
}

.comment-btn:hover {
    background: var(--primary-hover);
}

/* 댓글 목록 */
.comment-list {
    margin-top: 10px;
    padding-top: 6px;
}

.comment-item {
    padding: 8px 0;
    border-top: 1px solid #eceff3;
    font-size: 14px;
}

.comment-item strong {
    font-weight: 800;
    color: var(--text);
}

.comment-item .muted {
    font-size: 13px;
}

/* 상품 카드 안 내용이 너무 길어질 때 정리 */
.product-card .review-box h4 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 800;
}

footer{
    text-align: center;
    color: var(--muted);
    font-size: 14px;
}

/* 모바일 대응 */
@media (max-width: 768px) {
    .review-actions {
        gap: 6px;
    }

    .action-btn {
        width: 100%;
        justify-content: space-between;
    }

    .comment-form {
        flex-direction: column;
    }

    .comment-btn {
        width: 100%;
    }
}

/* ------------------------------
   반응형
------------------------------ */
@media (max-width: 1024px) {
    .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .container {
        padding: 26px 18px 50px;
    }
}

@media (max-width: 768px) {
    .navbar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 18px;
    }

    .navbar > div:last-child {
        flex-wrap: wrap;
        gap: 8px;
    }

    .container {
        padding: 22px 14px 40px;
    }

    .card {
        padding: 20px;
        border-radius: 16px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .grid {
        grid-template-columns: 1fr;
        gap: 18px;
    }

    .thumb {
        height: 220px;
    }

    .preview-image,
    .detail-image {
        width: 110px;
        height: 110px;
    }

    .auth-card {
        margin: 28px auto;
        padding: 24px;
    }
}
```

서버실행 확인
```bash
python manage.py runserver
```

http://127.0.0.1:8000/products/

---
변경된 부분을 정리하면 
8번 회원가입 및 로그인 기능구현과 9번 탬플릿 구조 정리 및 static-js분리 파트에서

SignupAPIView 로직 단순화
- 8번: `create()` 있음
- 9번: 없음
기능 제거가 아니라 설명을 위해 단순화한 것

Login 방식 변화 (JWT 흐름)
- 8번: 로그인 API 개념
- 9번: `/api/login/` + JS + 토큰 저장 구조 등장 : 프론트(JS)에서 토큰 처리까지 포함
9번에서 로그인은 API → JS → 브라우저 저장까지 확장된 것

View 종류 혼합 (APIView vs TemplateView)
- 어떤 view는 APIView
- 어떤 view는 TemplateView

왜 view가 두 종류냐?
- APIView → 데이터 반환(JSON)
- TemplateView → HTML 렌더링

8번까지:
```
백엔드 API 만들기 단계
```

9번부터:
```
API + HTML + JS → 실제 서비스 구조 만들기 단계
```