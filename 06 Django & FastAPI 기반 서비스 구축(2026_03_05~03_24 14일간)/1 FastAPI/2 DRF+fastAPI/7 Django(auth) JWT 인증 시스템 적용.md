

로그인/회원가입 엔드포인트는 `accounts`가 중심이 맞지만, 인증을 사용하는 모든 API와 프론트 요청 방식까지 함께 연결됩니다.

JWT 적용의 중심은 accounts 앱입니다.
왜냐하면 JWT에서 가장 먼저 필요한 기능이 아래 4가지이기 때문입니다.
- 회원가입
- 로그인
- 토큰 재발급
- 현재 로그인 사용자 조회(me)

그래서 최소 수정 파일이 먼저 `accounts` 중심으로 잡혀 있습니다.
```
1️⃣ backend/mysite/settings.py
2️⃣ backend/apps/accounts/views.py
3️⃣ backend/apps/accounts/serializers.py
4️⃣ backend/apps/accounts/urls.py
```

그런데 실제로는 accounts만 수정하고 끝나지 않습니다.
왜냐하면 JWT의 목적은 “로그인 API 만들기”가 아니라 로그인한 사용자만 특정 기능을 쓰게 하는 것이기 때문입니다.

예를 들어 너 프로젝트 기준으로 보면:
- 리뷰 작성
- 댓글 작성
- 좋아요
- 북마크
- 신고
- 내 정보 조회
- 내 글만 수정/삭제
이런 기능은 전부 “누가 요청했는지” 알아야 합니다.

즉, `accounts`에서 토큰을 발급받더라도  
실제로 그 토큰을 사용하는 곳은 `reviews`, `interactions`, 경우에 따라 `products` 일부까지 연결됩니다.

어느 앱까지 수정해야 하는지 기준은 딱 하나입니다.
그 기능이 “사용자 식별”이 필요한가? 만약 필요하면 JWT 영향권입니다.

수정이 필요한 경우
- 작성자 저장이 필요한 API
- 로그인한 사용자만 접근해야 하는 API
- 본인 글만 수정/삭제해야 하는 API
- 좋아요/북마크처럼 user FK가 필요한 API
- `request.user`를 써야 하는 API

이런 경우는 accounts만이 아니라  
그 기능이 들어있는 앱의 `views.py`, `serializers.py`, 경우에 따라 `permissions.py`도 같이 봐야 합니다.

수정이 거의 필요 없는 경우
- 공개 제품 목록 조회
- 공개 제품 상세 조회
- 공개 리뷰 목록 조회
- 누구나 볼 수 있는 메인 페이지

이런 것은 JWT와 직접 관계가 없을 수 있습니다. 즉, 인증 없이 열어둘 API는 굳이 많이 안 건드려도 됩니다.

래서 실제 연결되는 앱은 보통 이렇게 봅니다.
반드시 수정해야 하는 파일들
```
backend/mysite/settings.py
backend/apps/accounts/views.py
backend/apps/accounts/serializers.py
backend/apps/accounts/urls.py
```
이건 로그인 체계 자체를 만드는 부분입니다.

거의 확실히 영향 받는 앱
```
backend/apps/reviews/views.py  
backend/apps/reviews/serializers.py  
backend/apps/interactions/views.py  
backend/apps/interactions/serializers.py
```
왜냐하면 여기엔 보통 이런 코드가 들어가기 때문입니다.
- `review.user = request.user`
- 댓글 작성자 = 현재 로그인 유저
- 좋아요 누른 사람 = 현재 로그인 유저
- 북마크한 사람 = 현재 로그인 유저
- 신고한 사람 = 현재 로그인 유저

즉, user를 직접 입력받는 구조에서 request.user 기반 구조로 바꾸는 작업이 필요할 수 있습니다.

우에 따라 영향 받는 곳
```
backend/apps/products/views.py  
backend/templates/*.html  
backend/static/js/*.js
```

products/views.py
제품 조회만 하면 영향이 적습니다. 
하지만 “관리자만 상품 등록/수정” 같은 정책이 있으면 인증/권한이 들어갑니다.

templates / static/js
프론트에서 JWT를 실제로 저장하고 보내야 하므로 매우 중요합니다.

즉,
- 로그인 페이지 JS
- 회원가입 페이지 JS
- 리뷰 작성 JS
- 댓글 작성 JS
- 좋아요/북마크 요청 JS

이런 파일은 거의 반드시 손대야 합니다.

프론트(JS)에서 해야 할 일
- 로그인 성공 시 access/refresh 저장
- API 요청 시 `Authorization: Bearer <access_token>` 헤더 추가
- access 만료 시 refresh로 재발급
- 로그아웃 시 토큰 삭제

백엔드(View/Serializer)에서 해야 할 일
- `IsAuthenticated` 적용
- `request.user` 사용
- user 필드를 클라이언트가 직접 보내지 못하게 처리
- 본인만 수정/삭제 가능하게 권한 처리

즉
```
accounts만 수정 = 로그인 API만 생김
JS만 수정 = 토큰만 들고 다님
실제 인증 시스템 완성 = accounts + 보호할 views + 프론트 JS
```

JWT 붙일 때 “어디까지 수정해야 하지?”가 헷갈리면 이 질문으로 판단하면 됩니다.

질문 1
이 API는 로그인 안 한 사람도 써도 되는가?
- 예 → `AllowAny`
- 아니오 → `IsAuthenticated`

질문 2
이 API에서 현재 로그인한 사용자가 누구인지 알아야 하는가?
- 예 → `request.user` 필요 → JWT 영향 있음
- 아니오 → 인증 영향 적음

질문 3
이 데이터의 작성자/행위자가 user와 연결되는가?
- 예 → serializer/view 수정 필요
- 아니오 → accounts만으로 끝날 수도 있음

---
우리 프로젝트는 어떤 파일들을 수정해야 하는가?

accounts
- 회원가입
- 로그인
- 토큰 재발급
- 내 정보 조회

reviews
- 리뷰 작성: 로그인 필요
- 리뷰 수정/삭제: 본인만 가능
- 리뷰 목록/상세: 공개면 AllowAny 가능

interactions
- 댓글 작성: 로그인 필요
- 좋아요: 로그인 필요
- 북마크: 로그인 필요
- 신고: 로그인 필요

products
- 상품 조회: 대개 공개
- 상품 등록/수정/삭제: 관리자 전용일 수 있음

templates / static/js
- 로그인 페이지
- 회원가입 페이지
- 리뷰 작성 페이지
- 댓글/좋아요/북마크 요청 스크립트

---
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