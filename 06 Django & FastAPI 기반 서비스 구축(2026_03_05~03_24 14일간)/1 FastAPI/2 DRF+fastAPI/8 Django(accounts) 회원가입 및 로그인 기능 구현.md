목표

구현할 기능 3가지
1. 회원가입
    - username
    - password
    - password_confirm
        
2. 로그인
    - SimpleJWT 사용
    - access / refresh 발급
        
3. 토큰 재발급
    - refresh token으로 새 access 발급

```
회원가입  ->  /accounts/signup/
로그인    ->  /accounts/login/
재발급    ->  /accounts/token/refresh/
```

`backend/apps/accounts/views.py`
```python
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status  # [추가] status 추가
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
        # [수정] 최신 사용자부터 보이도록 정렬 추가
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

    # [추가] 회원가입 성공 시 비밀번호가 아닌 안전한 사용자 정보만 응답하도록 오버라이드
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

    GET /accounts/me/

    헤더:
    Authorization: Bearer <access_token>
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
```

회원가입
```bash
curl -X POST http://127.0.0.1:8900/accounts/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser3",
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

결과
```bash
{"refresh":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc3MzQ3NjM3MSwiaWF0IjoxNzcyODcxNTcxLCJqdGkiOiI1NWM4MTljMmRjZWU0ZmE1ODcxZDQxY2EzMzY3NzI3OCIsInVzZXJfaWQiOiI0In0.N01TY8O6kcWuWayhhFytAePU6I9BUpuB5fds09aHEPY","access":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcyODczMzcxLCJpYXQiOjE3NzI4NzE1NzEsImp0aSI6ImFmZmRjNjU0ZDc1NzQ0MTg4YzhiMTJkNWMwYjEyOTUwIiwidXNlcl9pZCI6IjQifQ.umxupOQWfaUI9YbHWhiA1wVeqpRF78Qmnqb_-14D9xE"}
```

현재 사용자 조회
```bash
curl -X GET http://127.0.0.1:8000/accounts/me/ \
  -H "Authorization: Bearer 실제_access_token"
```

아래처럼 실제 access 토큰 전체 문자열을 넣어야 합니다.
```bash
curl -X GET http://127.0.0.1:8000/accounts/me/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcyODczMjcxLCJpYXQiOjE3NzI4NzE0NzEsImp0aSI6IjZmNGYwZWZmNmJhYzRhOTk5OGE5MjlhMmNiN2U3MTFmIiwidXNlcl9pZCI6IjQifQ.fBi8eTeGLrJC9o-LJxe_3lR2A0ILs_QhoStprpbmWzg"
```

결과
```bash
jung@DESKTOP-PJCRMMU:~/product-review-service/backend$ curl -X GET http://127.0.0.1:8000/accurl -X GET http://127.0.0.1:8000/accounts/me/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcyODczMjcxLCJpYXQiOjE3NzI4NzE0NzEsImp0aSI6IjZmNGYwZWZmNmJhYzRhOTk5OGE5MjlhMmNiN2U3MTFmIiwidXNlcl9pZCI6IjQifQ.fBi8eTeGLrJC9o-LJxe_3lR2A0ILs_QhoStprpbmWzg"
{"id":4,"username":"testuser3","email":"","created_at":"2026-03-07T08:05:30.559400Z"}
```

토큰 재발급
```bash
curl -X POST http://127.0.0.1:8000/accounts/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "실제_refresh_token"
  }'
```

실제 토큰을 넣고 테스트
```bash
curl -X POST http://127.0.0.1:8000/accounts/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc3MzQ3NjI3MSwiaWF0IjoxNzcyODcxNDcxLCJqdGkiOiIwOWViYzdhYzY2NDI0YWYwOTJhZjU0N2FlYzQxMzViMiIsInVzZXJfaWQiOiI0In0.x55wRmI9Jgid6EBdHf1ljKwLtM7svh6E-_8lRRqPF50"
  }'
```

결과
```
{"access":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcyODczNzM3LCJpYXQiOjE3NzI4NzE5MzcsImp0aSI6IjEyNTkxM2IwYTJjYzQzNjViNzRjYTYyNzEwZTZlY2Q1IiwidXNlcl9pZCI6IjQifQ.JK-yU2PLFs8UR5ARfWveLDiIMLJA1fS9emh4LypjuLA"}
```

DB에서 사용자 계정을 삭제할때
Django shell
```bash
python manage.py shell
```

```python
from apps.accounts.models import User

User.objects.filter(username="testuser2").delete()

exit()
```
