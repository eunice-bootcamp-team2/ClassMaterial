- accounts 앱이 새로 추가됨 (프로젝트 구조 변경)
	- 앱 생성: `python manage.py startapp accounts`
	- `INSTALLED_APPS`에 `"accounts"` 추가
- REST_FRAMEWORK 기본 인증/권한 정책이 로그인 필수로 변경됨 (settings.py 변경)
- 6번까지(이미지 업로드)는 보통 누구나 접근 기준이었는데, 
	- 로그인 안 했으면 → 401/403
	- 로그인 했으면 → API 사용 가능 즉, Todo API를 내 계정 기준으로 보호하기 위해서입니다.
- 프로젝트 URL에 accounts 라우팅이 추가됨 (mysite/urls.py 변경)
	- 회원가입/로그인 페이지와 API 엔드포인트를 프로젝트에 연결하려고 추가했습니다.
- accounts/urls.py + views + serializers + templates 전체가 새로 추가됨
- 추가된 파일/기능
	- `accounts/urls.py` : `/api/signup/`, `/api/login/`, `/api/logout/` 및 페이지 라우팅
	- `accounts/serializers.py` : 회원가입 검증(중복 username, 비밀번호 확인)
	- `accounts/views.py` : 세션 기반 회원가입/로그인/로그아웃 API
	- `accounts/views_page.py` : 로그인/회원가입 HTML 페이지 렌더링
	- `templates/accounts/signup.html`, `templates/accounts/login.html` : 실제 화면 + axios 호출
- Todo 모델이 유저 소유 구조로 변경됨 (todo/models.py 변경)
	- Todo를 전체 공유 데이터가 아니라 누가 만들었는지(소유자) 내 것만 조회/수정/삭제 가 가능하게 하려면 DB에 user 연결이 필수라서 추가했습니다.
- serializer가 user를 자동 처리하도록 변경됨 (todo/serializers.py 변경)
	- 프론트에서 `user` 값을 보내게 하면 보안상 위험합니다. 그래서 user는 요청에서 받지 않고(read_only), 서버에서 자동으로 넣도록 바꿉니다.
- TodoViewSet이 내 것만 + 로그인 필수 + user 자동 주입으로 변경됨
	- 변경된 것 (todo/views/api_views.py)
		- `permission_classes = [IsAuthenticated]`
	    - `get_queryset()`에서 내 Todo만 필터링
		- `perform_create()`로 user 자동 저장
- 프론트(JS)도 세션 기반 인증 흐름”에 맞게 변경됨
	- axios에 `withCredentials: true` 추가 (세션 쿠키 포함)
	- CSRF 토큰을 헤더에 자동 주입하는 인터셉터 추가
	- 401/403이면 로그인 페이지로 보내는 처리 추가

7번은 Todo를 로그인한 사용자 기준(내 것만)으로 바꾸는 인증/권한 구조 추가입니다

---
```bash
python manage.py startapp accounts
```

```bash
INSTALLED_APPS = [  
# ...  
"rest_framework",  
"todo",  
"accounts",  
]
```

`mysite/settings.py`
```python
# Django REST Framework 전역 설정
REST_FRAMEWORK = {

    # 인증 방식 설정
    # API 요청을 보낸 사용자가 누구인지 확인하는 방법
    "DEFAULT_AUTHENTICATION_CLASSES": [

        # 세션 인증 (Django 로그인 기반)
        # 브라우저에서 로그인 상태라면 자동 인증됨
        "rest_framework.authentication.SessionAuthentication",

        # Basic 인증 (아이디/비밀번호를 헤더로 보내는 방식)
        # 주로 테스트용으로 사용됨 (Postman, curl 등)
        "rest_framework.authentication.BasicAuthentication",
    ],

    # 기본 권한 설정
    # 인증된 사용자만 API 접근 가능
    "DEFAULT_PERMISSION_CLASSES": [

        # 로그인한 사용자만 API 사용 가능
        "rest_framework.permissions.IsAuthenticated",
    ],

    # 기본 페이지네이션 클래스 설정
    # API 목록 조회 시 페이지 단위로 데이터를 반환
    "DEFAULT_PAGINATION_CLASS": "todo.pagination.CustomPageNumberPagination",

    # 기본 페이지 크기
    # 한 페이지에 보여줄 데이터 개수
    "PAGE_SIZE": 3,

    # 응답 데이터 출력 형식(Renderer)
    "DEFAULT_RENDERER_CLASSES": [

        # JSON 형식 응답 (프론트엔드 / API 사용 시 기본)
        "rest_framework.renderers.JSONRenderer",

        # DRF 브라우저 API 화면 제공 (개발/테스트용)
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
```

`mysite/urls.py` 연결
```python
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("todo/", include("todo.urls")),
    path("", lambda request: redirect("todo_List")), 
    path("", include("accounts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

`accounts/urls.py`
```python
from django.urls import path
from .views import SignupAPIView, SessionLoginAPIView, SessionLogoutAPIView
from .views_page import LoginPageView, SignupPageView

urlpatterns = [
    # API
    path("api/signup/", SignupAPIView.as_view(), name="api-signup"),
    path("api/login/", SessionLoginAPIView.as_view(), name="api-login"),   
    path("api/logout/", SessionLogoutAPIView.as_view(), name="api-logout"),

    # Pages
    path("signup-page/", SignupPageView.as_view(), name="page-signup"),
    path("login/", LoginPageView.as_view(), name="page-login"),
]
```
---
이 코드는 회원가입 API에서 사용하는 Serializer입니다.

이코드의 핵심역할 3가지
1️⃣ 입력 데이터 검증
```
username 중복 확인  
password 길이 확인  
password == password2 확인
```

2️⃣ 회원 생성 → Django User 모델에 실제 계정 생성
```python
User.objects.create_user()
```

3️⃣ API 요청 데이터 처리
```json
{
  "username": "eunice",
  "password": "1234",
  "password2": "1234"
}
```

처리 흐름
```
요청 데이터  
↓  
Serializer 검증 → 클라이언트에서 보낸 JSON 데이터를 Serializer가 받음  
↓  
validate_username() → username이 이미 존재하는지 DB에서 중복 검사  
↓  
validate() → password와 password2가 서로 같은지 확인  
↓  
create() → 검증된 데이터(validated_data)로 실제 User 생성  
↓  
User 생성 → Django User 테이블에 계정이 저장됨

---------------------------------------------------------------------------

클라이언트 회원가입 요청
   ↓
Serializer 데이터 검사 시작
   ↓
아이디 중복 검사 (validate_username)
   ↓
비밀번호 일치 검사 (validate)
   ↓
문제 없으면 create() 실행
   ↓
User.objects.create_user()
   ↓
DB에 사용자 계정 저장
```
---
회원가입 검증 담당 
`accounts/serializers.py`
```python
# Django 기본 User 모델 사용
from django.contrib.auth.models import User

# DRF Serializer 사용
from rest_framework import serializers


# 회원가입 요청 데이터를 처리하기 위한 Serializer
class SignupSerializer(serializers.Serializer):

    # 사용자 아이디
    username = serializers.CharField(max_length=150)

    # 비밀번호 (write_only=True → 응답 JSON에는 포함되지 않음)
    password = serializers.CharField(write_only=True, min_length=4)

    # 비밀번호 확인 입력
    password2 = serializers.CharField(write_only=True, min_length=4)


    # username 필드 검증
    # 같은 username이 이미 존재하는지 확인
    def validate_username(self, value):

        # 동일한 username이 존재하면 에러 발생
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용중인 username 입니다.")

        # 문제가 없으면 username 반환
        return value


    # 전체 데이터 검증
    # password와 password2가 일치하는지 확인
    def validate(self, attrs):

        # 두 비밀번호가 다르면 에러 발생
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({
                "password": "비밀번호가 일치하지 않습니다."
            })

        # 문제가 없으면 검증된 데이터 반환
        return attrs


    # 사용자 생성
    # serializer.save() 호출 시 실행됨
    def create(self, validated_data):

        # Django User 생성
        # create_user()는 내부적으로 비밀번호를 hash 처리함
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )

        # 생성된 user 객체 반환
        return user
```

---
이 코드는 세션 기반 인증 API 3개를 제공하는 코드입니다.

| API                  | 역할   |
| -------------------- | ---- |
| SignupAPIView        | 회원가입 |
| SessionLoginAPIView  | 로그인  |
| SessionLogoutAPIView | 로그아웃 |

전체 흐름
```
회원가입
POST /signup/
   ↓
SignupSerializer 검증
   ↓
User 생성


로그인
POST /login/
   ↓
authenticate()
   ↓
login()
   ↓
세션 생성


로그아웃
POST /logout/
   ↓
logout()
   ↓
세션 삭제
```

핵심 포인트
1️⃣ authenticate → 아이디/비밀번호 확인
```python
user = authenticate(request, username=username, password=password)
```

2️⃣ login → 세션 생성
```python
login(request, user)
```

3️⃣ logout → 세션 삭제
```python
logout(request)
```

이 코드는 Django 세션 기반 로그인/로그아웃/회원가입을 제공하는 DRF APIView 구현 코드입니다.

`accounts/views.py` 
```python
# Django 인증 관련 함수
# authenticate → 사용자 인증
# login → 세션 로그인 처리
# logout → 세션 로그아웃 처리
from django.contrib.auth import authenticate, login, logout

# DRF APIView 사용
from rest_framework.views import APIView

# API 응답 객체
from rest_framework.response import Response

# HTTP 상태 코드
from rest_framework import status

# 모든 사용자 접근 허용
from rest_framework.permissions import AllowAny

# 회원가입 데이터 검증 Serializer
from .serializers import SignupSerializer


# -----------------------------
# 회원가입 API
# -----------------------------
class SignupAPIView(APIView):

    # 로그인하지 않은 사용자도 접근 가능
    permission_classes = [AllowAny]

    # POST 요청 처리
    def post(self, request):

        # 요청 데이터(request.data)를 Serializer에 전달
        serializer = SignupSerializer(data=request.data)

        # 데이터 검증
        # raise_exception=True → 검증 실패 시 자동으로 에러 응답 반환
        serializer.is_valid(raise_exception=True)

        # 검증 완료 후 사용자 생성
        serializer.save()

        # 회원가입 성공 응답
        return Response(
            {"detail": "회원가입 완료"},
            status=status.HTTP_201_CREATED
        )


# -----------------------------
# 세션 로그인 API
# -----------------------------
class SessionLoginAPIView(APIView):

    # 로그인하지 않은 사용자도 접근 가능
    permission_classes = [AllowAny]

    # POST 요청 처리
    def post(self, request):

        # 요청 데이터에서 username, password 추출
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        # 사용자 인증
        # username / password가 맞는지 확인
        user = authenticate(request, username=username, password=password)

        # 인증 실패
        if not user:
            return Response(
                {"detail": "아이디/비밀번호가 올바르지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 인증 성공 → 세션 로그인 처리
        login(request, user)

        # 로그인 성공 응답
        return Response(
            {"detail": "로그인 성공"},
            status=status.HTTP_200_OK
        )


# -----------------------------
# 세션 로그아웃 API
# -----------------------------
class SessionLogoutAPIView(APIView):

    # POST 요청 처리
    def post(self, request):

        # 현재 로그인된 사용자 세션 종료
        logout(request)

        # 로그아웃 성공 응답
        return Response(
            {"detail": "로그아웃"},
            status=status.HTTP_200_OK
        )
```

---
`accounts/views_page.py`
```python
from django.views.generic import TemplateView


class SignupPageView(TemplateView):
    template_name = "accounts/signup.html"


class LoginPageView(TemplateView):
    template_name = "accounts/login.html"
```

Todo 모델에 user FK 추가
`todo/models.py`
```python
from django.db import models
from django.contrib.auth.models import User

class Todo(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    complete = models.BooleanField(default=False)
    exp = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to="todo_images/", blank=True, null=True)
    
    # user 추가
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="todos")
```

데이터 정리 + 마이그레이션
```bash
python manage.py shell  
from todo.models import Todo  
Todo.objects.all().delete()  
exit()  
  
python manage.py makemigrations  
python manage.py migrate  
```

`todo/serializers.py`
```python
from rest_framework.serializers import ModelSerializer
from .models import Todo


class TodoSerializer(ModelSerializer):
    class Meta:
        model = Todo
        fields = ["id", "name", "description", "complete", "exp", "image", "created_at", "user"]
        read_only_fields = ["user"]
```

`todo/views/api_views.py` (IsAuthenticated + 내 것만 + user 자동 주입)
```python
# DRF ViewSet 사용
from rest_framework import viewsets

# 인증된 사용자만 접근 가능하도록 하는 권한 클래스
from rest_framework.permissions import IsAuthenticated

# 페이지네이션 기능
from rest_framework.pagination import PageNumberPagination

# Todo 모델
from ..models import Todo

# Todo 데이터를 JSON으로 변환하는 Serializer
from ..serializers import TodoSerializer


# ---------------------------------------
# Todo 목록 페이지네이션 설정
# ---------------------------------------
class TodoListPagination(PageNumberPagination):

    # 기본 페이지당 데이터 개수
    page_size = 3

    # URL에서 page_size를 변경할 수 있도록 허용
    # 예: /api/todos/?page_size=10
    page_size_query_param = "page_size"

    # 최대 페이지 크기 제한
    max_page_size = 50


# ---------------------------------------
# Todo ViewSet
# ---------------------------------------
class TodoViewSet(viewsets.ModelViewSet):

    # Todo 데이터를 변환할 Serializer 지정
    serializer_class = TodoSerializer

    # 로그인한 사용자만 API 접근 가능
    permission_classes = [IsAuthenticated]

    # 페이지네이션 설정 적용
    pagination_class = TodoListPagination


    # 조회할 queryset 설정
    def get_queryset(self):

        # 현재 로그인한 사용자(request.user)의 Todo만 조회
        # 최신 Todo가 먼저 나오도록 created_at 기준 내림차순 정렬
        return Todo.objects.filter(user=self.request.user).order_by("-created_at")


    # Todo 생성 시 실행되는 메서드
    def perform_create(self, serializer):

        # Todo 생성할 때 현재 로그인한 사용자를 자동으로 user 필드에 저장
        serializer.save(user=self.request.user)
```

템플릿 생성
```bash
mkdir -p templates/accounts
```

`templates/accounts/signup.html`
```html
<h2>회원가입</h2>

<input id="username" placeholder="username">
<input id="password" placeholder="password" type="password">
<input id="password2" placeholder="password 확인" type="password">

<button id="signupBtn">가입</button>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // Axios 인스턴스 생성
  // baseURL을 "/"로 설정하여 같은 Django 서버로 API 요청을 보냄
  const api = axios.create({ baseURL: "/" });


  // 요청 인터셉터 설정
  // 서버로 요청을 보내기 전에 자동으로 실행되는 코드
  api.interceptors.request.use(config => {

    // 브라우저 쿠키에서 csrftoken 값 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // csrftoken이 있으면 요청 헤더에 추가
    // Django의 CSRF 보호를 통과하기 위해 필요
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;

    return config;
  });


  // 회원가입 버튼 클릭 이벤트
  document.getElementById("signupBtn").addEventListener("click", async () => {
    try {

      // 입력창에서 사용자 입력값 가져오기
      const username  = document.getElementById("username").value;
      const password  = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;

      // 회원가입 API 요청
      // 입력한 데이터를 JSON 형태로 서버에 전달
      await api.post("/api/signup/", { username, password, password2 });

      // 회원가입 성공 시 알림 표시
      alert("회원가입 완료 → 로그인으로 이동");

      // 로그인 페이지로 이동
      window.location.href = "/login/";

    } catch (err) {

      // 오류 발생 시 콘솔에 출력
      console.log(err.response?.data || err.message);

      // 사용자에게 실패 메시지 표시
      alert("회원가입 실패");
    }
  });

});
</script>
```

`templates/accounts/login.html`
```python
<h2>로그인 (STEP1: 세션 로그인)</h2>

<input id="username" placeholder="username">
<input id="password" placeholder="password" type="password">
<button id="loginBtn">로그인</button>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // Axios 인스턴스 생성
  // baseURL을 "/"로 설정하여 같은 Django 서버로 API 요청을 보냄
  const api = axios.create({ baseURL: "/" });


  // 요청 인터셉터 설정
  // 모든 axios 요청이 서버로 가기 전에 실행되는 코드
  api.interceptors.request.use(config => {

    // 브라우저 쿠키에서 csrftoken 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // csrftoken이 존재하면 요청 헤더에 추가
    // Django의 CSRF 보호를 통과하기 위해 필요
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;

    return config;
  });


  // 로그인 버튼 클릭 이벤트
  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {

      // 입력창에서 username과 password 값 가져오기
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      // 로그인 API 요청
      // 사용자 입력 데이터를 서버로 전송
      await api.post("/api/login/", { username, password });

      // 로그인 성공 시 알림 표시
      alert("로그인 성공");

      // Todo 리스트 페이지로 이동
      window.location.href = "/todo/list/";

    } catch (err) {

      // 오류 발생 시 콘솔에 출력
      console.log(err.response?.data || err.message);

      // 사용자에게 실패 메시지 표시
      alert("로그인 실패");
    }
  });

});
</script>
```

`templates/todo/create.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}
<div class="container">
  <h2>Create a New Todo</h2>

    <div>
      <label for="name">Name:</label>
      <input type="text" name="name" id="name">
    </div>

    <div>
      <label for="description">Description:</label>
      <textarea name="description" id="description"></textarea>
    </div>

    <div>
      <label for="complete">Complete:</label>
      <input type="checkbox" name="complete" id="complete">
    </div>

    <div>
      <label for="exp">Experience Points:</label>
      <input type="number" name="exp" id="exp" min="0">
    </div>

    <div>
      <label for="image">Image:</label>
      <input type="file" id="image">
    </div>    

    <button type="submit" id="todoCreate">Create</button>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // 로그인 페이지 주소
  const LOGIN_PAGE_URL = "/login/";

  // Todo 생성 API 주소
  const CREATE_API_URL = "/todo/viewsets/view/"; 


  // 1️⃣ Axios 인스턴스 생성
  // withCredentials: true → 브라우저의 쿠키(sessionid)를 함께 전송
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,
  });


  // 2️⃣ 요청 인터셉터
  // 모든 axios 요청이 서버로 보내지기 전에 실행됨
  api.interceptors.request.use((config) => {

    // 브라우저 쿠키에서 csrftoken 값을 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // csrftoken이 있으면 요청 헤더에 추가
    // Django의 CSRF 보호를 통과하기 위해 필요
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  });


  // 3️⃣ 응답 인터셉터
  // 서버 응답을 받은 후 실행되는 코드
  api.interceptors.response.use(

    // 정상 응답이면 그대로 반환
    (res) => res,

    // 에러 응답 처리
    async (err) => {

      const status = err.response?.status;

      // 인증 실패(401) 또는 권한 없음(403)이면 로그인 페이지로 이동
      if (status === 401 || status === 403) {
        console.log("세션 없음/권한 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return Promise.reject(err);
      }

      return Promise.reject(err);
    }
  );


  // 4️⃣ Create 버튼 클릭 이벤트
  document.getElementById("todoCreate").addEventListener("click", async (e) => {

    // 기본 form submit 동작 방지
    e.preventDefault();

    try {

      // FormData 객체 생성
      // 텍스트 데이터 + 파일 데이터를 함께 전송할 수 있음
      const formData = new FormData();

      // 입력값을 FormData에 추가
      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);

      // 체크박스는 true/false 문자열로 전송
      formData.append(
        "complete",
        document.getElementById("complete").checked ? "true" : "false"
      );

      // exp 값이 없으면 0으로 전송
      formData.append("exp", document.getElementById("exp").value || "0");


      // 이미지 파일 input 요소 가져오기
      const fileInput = document.getElementById("image");

      // 이미지가 선택된 경우에만 서버로 전송
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }


      // Todo 생성 API 호출
      const res = await api.post(CREATE_API_URL, formData);

      // 성공 로그 출력
      console.log("생성 성공:", res.data);

      // Todo 목록 페이지로 이동
      window.location.href = "/todo/list/";

    } catch (err) {

      // 오류 발생 시 콘솔에 출력
      console.error("생성 실패:", err.response?.data || err.message);

      // 사용자에게 오류 알림
      alert("생성 실패: 콘솔/네트워크 확인");
    }
  });

});
</script>

{% endblock %}
```
---
전체 동작 흐름
```
Todo 상세 페이지 로드
        ↓
사용자 버튼 선택

[수정]
→ /todo/update/{id}/ 이동

[삭제]
→ confirm 확인
→ axios DELETE 요청: /todo/viewsets/view/{id}/
→ (세션 쿠키 + CSRF 헤더 포함)
→ 401/403이면 → "로그인이 필요합니다" → /login/ 이동
→ 2xx(성공)이면 → /todo/list/ 이동
→ 그 외 오류면 → "삭제 중 오류" 알림

[홈으로]
→ /todo/list/ 이동
```

이 코드에서 중요한 3가지
1️⃣ Django 템플릿 값 사용
```js
const todoId = "{{ todo.id }}";
```

- Django가 템플릿을 렌더링할 때 `{{ todo.id }}` 부분을 **실제 숫자(id)** 로 바꿔서 HTML에 넣어줍니다.

렌더링 결과 예:
```js
const todoId = "12";
```

2️⃣ DELETE 요청
```js
await api.delete(`/todo/viewsets/view/${todoId}/`);
```
- 이 한 줄이 삭제 요청입니다.
- HTTP 메서드는 DELETE
- URL은 /todo/viewsets/view/{id}/ 형태로 들어갑니다.
    
즉 서버에서는 DRF `ModelViewSet`의 삭제 동작(`destroy`)이 실행됩니다.

3️⃣ 세션 쿠키 + CSRF 처리
```js
const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});
```
`withCredentials: true` 덕분에 브라우저의 sessionid 쿠키가 요청에 같이 실립니다.


`templates/todo/detail.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<!-- Todo 상세 정보를 보여주는 영역 -->
<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>

  <!-- 이미지가 있을 때만 표시 -->
  {% if todo.image %}
    <p><strong>이미지:</strong></p>
    <img src="{{ todo.image.url }}" alt="todo image" style="max-width:300px; height:auto;">
  {% else %}
    <p><strong>이미지:</strong> -</p>
  {% endif %}
</div>

<!-- 버튼 영역 -->
<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

<!-- Axios CDN -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // Django 템플릿에서 Todo id를 가져옴
  const todoId = "{{ todo.id }}";

  // 로그인 페이지 URL
  const LOGIN_PAGE_URL = "/login/";

  // Todo 목록 페이지 URL
  const LIST_PAGE_URL  = "/todo/list/";


  // -----------------------------
  // CSRF Token 가져오는 함수
  // Django의 POST/PUT/PATCH/DELETE 요청 시 필요
  // -----------------------------
  function getCookie(name) {
    // 브라우저 쿠키 문자열 가져오기
    const value = `; ${document.cookie}`;

    // 원하는 쿠키 이름을 기준으로 분리
    const parts = value.split(`; ${name}=`);

    // 쿠키가 존재하면 값 반환
    if (parts.length === 2) return parts.pop().split(";").shift();

    return null;
  }


  // -----------------------------
  // Axios 인스턴스 생성
  // - baseURL: 같은 Django 서버로 요청
  // -----------------------------
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,
  });

  // -----------------------------
  // Axios 요청 인터셉터: CSRF 헤더 자동 주입
  // (fetch에서 headers로 X-CSRFToken 넣던 것과 동일 목적)
  // -----------------------------
  api.interceptors.request.use((config) => {
    const csrf = getCookie("csrftoken");

    config.headers = config.headers || {};
    if (csrf) {
      config.headers["X-CSRFToken"] = csrf;
    }
    return config;
  });


  // -----------------------------
  // 수정 버튼 클릭 이벤트
  // -----------------------------
  document.querySelector(".todoUpdate").addEventListener("click", () => {
    // 수정 페이지로 이동
    window.location.href = `/todo/update/${todoId}/`;
  });


  // -----------------------------
  // 삭제 버튼 클릭 이벤트 (fetch → axios로만 변경)
  // - 동작은 동일: confirm → DELETE 요청 → 401/403 로그인 이동 → 성공 시 리스트 이동
  // -----------------------------
  document.querySelector(".todoDelete").addEventListener("click", async () => {

    // 삭제 확인 메시지
    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      // axios DELETE 요청
      // axios: api.delete(`/todo/viewsets/view/${todoId}/`)
      const res = await api.delete(`/todo/viewsets/view/${todoId}/`);

      // axios는 2xx일 때만 여기로 들어오며, 응답 데이터는 res.data
      // (삭제 응답이 body 없이 와도 문제 없음)

      // 삭제 성공 → Todo 목록 페이지로 이동
      window.location.href = LIST_PAGE_URL;

    } catch (err) {

      // axios는 4xx/5xx면 catch로 들어옴
      const status = err.response?.status;

      // 로그인 세션이 없거나 권한이 없는 경우 (fetch의 res.status 체크와 동일)
      if (status === 401 || status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
        return;
      }

      // 그 외 오류 처리
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });


  // -----------------------------
  // 홈으로 버튼 클릭 이벤트
  // -----------------------------
  document.querySelector(".todoHome").addEventListener("click", () => {
    // Todo 목록 페이지로 이동
    window.location.href = LIST_PAGE_URL;
  });

});
</script>

{% endblock %}
```
---
처리 흐름도
```
list.html 페이지 로드
        ↓
JavaScript 실행 (DOMContentLoaded)
        ↓
axios 설정
(세션 쿠키 + CSRF 자동 처리)
        ↓
loadPage(1) 실행
        ↓
GET /todo/viewsets/view/?page=1 요청
        ↓
DRF ViewSet → Todo 목록 반환
        ↓
Todo 목록 화면 출력 (renderTodos)
        ↓
페이지 정보 표시 (updatePaginationUI)
        ↓
사용자 동작

[Todo 클릭]
→ /todo/detail/{id}/ 이동

[이전 버튼]
→ loadPage(currentPage - 1)

[다음 버튼]
→ loadPage(currentPage + 1)

[Todo 등록하기]
→ /todo/create/ 이동
```


`templates/todo/list.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<!-- Todo 목록이 출력될 영역 -->
<div class="todocontainer"></div>

<!-- 페이지네이션 영역 -->
<div class="pagination">
    <button id="prevBtn">이전</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">다음</button>
</div>

<!-- Todo 생성 페이지로 이동하는 버튼 -->
<button id="createBtn">Todo 등록하기</button>

<!-- axios CDN 로드 -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

    // 로그인 페이지 URL (세션이 없을 때 이동)
    const LOGIN_PAGE_URL = "/login/";

    // 현재 페이지 상태 저장
    let currentPage = 1;

    // axios 인스턴스 생성
    // withCredentials: true → 세션 쿠키(sessionid)를 자동으로 포함
    const api = axios.create({
        baseURL: "/",
        withCredentials: true,
    });

    // -----------------------------
    // 요청 인터셉터
    // 모든 axios 요청 전에 실행됨
    // CSRF 토큰을 자동으로 헤더에 추가
    // -----------------------------
    api.interceptors.request.use(config => {

        // 브라우저 쿠키에서 csrftoken 찾기
        const csrfToken = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="))
            ?.split("=")[1];

        // headers 객체가 없으면 생성
        config.headers = config.headers || {};

        // CSRF 토큰이 존재하면 요청 헤더에 추가
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }

        return config;
    });

    // -----------------------------
    // 응답 인터셉터
    // 서버 응답이 401/403이면 로그인 페이지로 이동
    // -----------------------------
    api.interceptors.response.use(
        res => res,
        err => {
            const status = err.response?.status;

            // 세션이 없거나 권한이 없는 경우
            if (status === 401 || status === 403) {
                console.log("세션 없음/권한 없음 → 로그인 이동");
                window.location.href = LOGIN_PAGE_URL;
                return Promise.reject(err);
            }

            return Promise.reject(err);
        }
    );

    // -----------------------------
    // 특정 페이지의 Todo 목록을 서버에서 가져오는 함수
    // -----------------------------
    function loadPage(page) {

        // DRF ViewSet API 호출
        api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {

                // 서버에서 받은 데이터
                const data = res.data;

                // Todo 목록 렌더링
                renderTodos(data.data || data.results || []);

                // 페이지네이션 UI 업데이트
                updatePaginationUI(data);

                // 현재 페이지 업데이트
                currentPage = data.current_page || page;
            })
            .catch(err => console.error("페이지 로드 실패", err));
    }

    // -----------------------------
    // Todo 목록을 화면에 출력하는 함수
    // -----------------------------
    function renderTodos(todos) {

        const container = document.querySelector(".todocontainer");

        // 기존 내용 초기화
        container.innerHTML = "";

        // Todo가 없는 경우 메시지 출력
        if (!todos || todos.length === 0) {
            container.innerHTML = "<p>등록된 Todo 없음</p>";
            return;
        }

        // Todo 목록 반복 출력
        todos.forEach(todo => {

            const div = document.createElement("div");
            div.className = "todo-item";

            // HTML 요소에 데이터 저장
            div.dataset.id = todo.id;

            // 이미지 경로 처리
            const imageSrc = todo.image
                ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
                : "";

            // Todo 정보 HTML 구성
            div.innerHTML = `
                <p><strong>제목:</strong> ${todo.name ?? ""}</p>
                <p><strong>설명:</strong> ${todo.description ?? ""}</p>
                <p><strong>완료 여부:</strong> ${(todo.complete ? "완료" : "미완료")}</p>
                <p><strong>exp:</strong> ${todo.exp ?? 0}</p>
                ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}
                <hr>
            `;

            // Todo 클릭 시 상세 페이지로 이동
            div.addEventListener("click", () => {
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            // 화면에 Todo 추가
            container.appendChild(div);
        });
    }

    // -----------------------------
    // 페이지네이션 UI 업데이트
    // -----------------------------
    function updatePaginationUI(data) {

        // 현재 페이지
        const current = data.current_page ?? currentPage ?? 1;

        // 전체 페이지 계산
        const total =
            data.page_count ??
            (typeof data.count === "number" && data.results
                ? Math.ceil(data.count / data.results.length)
                : "?");

        // 페이지 정보 표시
        document.getElementById("pageInfo").innerText = `${current} / ${total}`;

        // 이전/다음 버튼 활성화 여부 설정
        document.getElementById("prevBtn").disabled = !(data.previous);
        document.getElementById("nextBtn").disabled = !(data.next);
    }

    // -----------------------------
    // 이전 페이지 버튼 클릭 이벤트
    // -----------------------------
    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });

    // -----------------------------
    // 다음 페이지 버튼 클릭 이벤트
    // -----------------------------
    document.getElementById("nextBtn").addEventListener("click", () => {
        loadPage(currentPage + 1);
    });

    // -----------------------------
    // Todo 생성 페이지 이동
    // -----------------------------
    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });

    // -----------------------------
    // 페이지 최초 로딩 시 1페이지 데이터 요청
    // -----------------------------
    loadPage(1);

});
</script>

{% endblock %}
```
---
처리 흐름도
```
update.html 페이지 로드
        ↓
JavaScript 실행 (DOMContentLoaded)
        ↓
axios 설정
(세션 쿠키 + CSRF 자동 처리)
        ↓
사용자가 수정 내용 입력
(name / description / complete / exp / image)
        ↓
[저장 버튼 클릭]
        ↓
FormData 생성
        ↓
PATCH /todo/viewsets/view/{id}/ 요청
        ↓
DRF ViewSet → Todo 데이터 수정
        ↓
수정 성공
        ↓
/todo/detail/{id}/ 페이지 이동

[취소 버튼]
→ history.back() → 이전 페이지 이동
```

`templates/todo/update.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="container">
  <h2>Todo 수정</h2>

  <!-- Todo 이름 입력 -->
  <div>
    <label for="name">Name:</label>
    <input type="text" name="name" id="name" value="{{ todo.name }}">
  </div>

  <!-- Todo 설명 입력 -->
  <div>
    <label for="description">Description:</label>
    <textarea name="description" id="description">{{ todo.description }}</textarea>
  </div>

  <!-- 완료 여부 체크 -->
  <div>
    <label for="complete">Complete:</label>
    <input type="checkbox" name="complete" id="complete" {% if todo.complete %}checked{% endif %}>
  </div>

  <!-- 경험치 입력 -->
  <div>
    <label for="exp">Experience Points:</label>
    <input type="number" name="exp" id="exp" min="0" value="{{ todo.exp }}">
  </div>

  <!-- 현재 저장된 이미지 표시 -->
  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <!-- 새 이미지 업로드 -->
  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

  <!-- 저장 버튼 -->
  <button type="button" id="todoUpdate">저장</button>

  <!-- 취소 버튼 (브라우저 이전 페이지로 이동) -->
  <button type="button" onclick="history.back()">취소</button>
</div>

<!-- axios CDN -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

  // 로그인 페이지 URL
  const LOGIN_PAGE_URL = "/login/";

  // Django 템플릿에서 Todo id 가져오기
  const todoId = "{{ todo.id }}";


  // -----------------------------
  // axios 인스턴스 생성
  // withCredentials: 세션 쿠키(sessionid)를 함께 전송
  // -----------------------------
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,
  });


  // -----------------------------
  // 요청 인터셉터
  // 모든 axios 요청 전에 실행
  // CSRF 토큰을 자동으로 헤더에 추가
  // -----------------------------
  api.interceptors.request.use(config => {

    // 브라우저 쿠키에서 csrftoken 찾기
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    // headers 객체가 없으면 생성
    config.headers = config.headers || {};

    // CSRF 토큰이 있으면 헤더에 추가
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  });


  // -----------------------------
  // 응답 인터셉터
  // 인증 실패 시 로그인 페이지로 이동
  // -----------------------------
  api.interceptors.response.use(
    res => res,
    err => {

      const status = err.response?.status;

      // 세션이 없거나 권한이 없는 경우
      if (status === 401 || status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
      }

      return Promise.reject(err);
    }
  );


  // -----------------------------
  // 저장 버튼 클릭 이벤트
  // Todo 수정 요청
  // -----------------------------
  document.getElementById("todoUpdate").addEventListener("click", async () => {
    try {

      // FormData 생성 (파일 + 텍스트 함께 전송)
      const formData = new FormData();

      // 입력값을 FormData에 추가
      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);

      // 체크박스 값을 문자열로 변환
      formData.append(
        "complete",
        document.getElementById("complete").checked ? "true" : "false"
      );

      // exp 값이 없으면 0으로 설정
      formData.append("exp", document.getElementById("exp").value || 0);


      // 새 이미지가 선택된 경우에만 추가
      const fileInput = document.getElementById("image");
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }


      // -----------------------------
      // PATCH 요청 (부분 수정)
      // DRF ViewSet의 update() 또는 partial_update() 실행
      // -----------------------------
      const res = await api.patch(`/todo/viewsets/view/${todoId}/`, formData);

      // 성공 로그
      console.log("수정 성공:", res.data);

      // 수정 후 상세 페이지로 이동
      window.location.href = `/todo/detail/${todoId}/`;

    } catch (err) {

      // 오류 출력
      console.error("수정 실패:", err.response?.data || err.message);

      // 사용자 알림
      alert("수정 실패");
    }
  });

});
</script>

{% endblock %}
```