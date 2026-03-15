최소 수정될 연관 파일들
```
1️⃣ backend/mysite/settings.py
2️⃣ backend/apps/accounts/views.py
3️⃣ backend/apps/accounts/serializers.py
4️⃣ backend/apps/accounts/urls.py
```

DRF 기본 인증 방식 설정

1️⃣ `backend/mysite/settings.py`
```python
from datetime import timedelta

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```
---
2️⃣ `backend/apps/accounts/views.py`
```python
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .models import User
from .serializers import UserSerializer, SignupSerializer


class UserViewSet(ViewSet):
    """
    사용자 조회용 ViewSet

    - list: 전체 사용자 목록 조회
    - retrieve: 특정 사용자 상세 조회

    현재는 조회 전용으로 사용
    필요하면 나중에 관리자 권한으로 제한 가능
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)


class SignupAPIView(generics.CreateAPIView):
    """
    회원가입 API

    POST /accounts/signup/

    요청 예시:
    {
        "username": "testuser",
        "email": "test@example.com",
        "password": "1234",
        "password_confirm": "1234"
    }
    """

    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]


class MeAPIView(generics.RetrieveAPIView):
    """
    현재 로그인한 사용자 정보 조회 API

    GET /accounts/me/

    헤더:
    Authorization: Bearer <access_token>
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
```
---
3️⃣ `backend/apps/accounts/serializers.py`
```python
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    사용자 조회용 Serializer

    - 회원정보를 응답으로 보여줄 때 사용
    - 비밀번호는 절대 노출하지 않음
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class SignupSerializer(serializers.ModelSerializer):
    """
    회원가입용 Serializer

    - password, password_confirm 입력을 받음
    - 두 비밀번호가 일치하는지 검사
    - create_user()를 사용해서 비밀번호를 해시 저장
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=4,
        style={"input_type": "password"}
    )

    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        min_length=4,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "password_confirm",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]

    def validate(self, attrs):
        """
        비밀번호 확인 검사
        """
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        if password != password_confirm:
            raise serializers.ValidationError({
                "password_confirm": "비밀번호가 일치하지 않습니다."
            })

        return attrs

    def create(self, validated_data):
        """
        회원 생성

        - password_confirm 는 DB에 저장하지 않으므로 제거
        - create_user()를 사용해야 비밀번호가 해시 처리됨
        """
        validated_data.pop("password_confirm")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user
```

---
4️⃣ `backend/apps/accounts/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import UserViewSet, SignupAPIView, MeAPIView

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    # 기존 UserViewSet 유지
    path("", include(router.urls)),

    # 회원가입
    path("signup/", SignupAPIView.as_view(), name="signup"),

    # JWT 로그인 / 재발급
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeAPIView.as_view(), name="me"),
]
```
---
JWT가 잘 적용되는지 테스트를 합니다.

회원가입
```bash
curl -X POST http://127.0.0.1:8000/accounts/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "password": "1234",
    "password_confirm": "1234"
  }'
```

로그인
```bash
curl -X POST http://127.0.0.1:8000/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser3",
    "password": "1234"
  }'
```

토큰 재발급
```bash
curl -X POST http://127.0.0.1:8000/accounts/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"여기에_refresh_token"}'
```

테스트해서 문제가 없는지 확인합니다.