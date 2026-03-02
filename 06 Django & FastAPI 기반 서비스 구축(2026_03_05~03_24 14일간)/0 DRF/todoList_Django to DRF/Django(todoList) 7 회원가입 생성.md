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
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated", 
    ],

    "DEFAULT_PAGINATION_CLASS": "todo.pagination.CustomPageNumberPagination",
    "PAGE_SIZE": 3,

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
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

회원가입 검증 담당 
`accounts/serializers.py`
```python
from django.contrib.auth.models import User
from rest_framework import serializers


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=4)
    password2 = serializers.CharField(write_only=True, min_length=4)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용중인 username 입니다.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "비밀번호가 일치하지 않습니다."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user
```

`accounts/views.py` 
```python
from django.contrib.auth import authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .serializers import SignupSerializer


class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "회원가입 완료"}, status=status.HTTP_201_CREATED)


class SessionLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"detail": "아이디/비밀번호가 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)  # 세션 로그인
        return Response({"detail": "로그인 성공"}, status=status.HTTP_200_OK)


class SessionLogoutAPIView(APIView):
    def post(self, request):
        logout(request)
        return Response({"detail": "로그아웃"}, status=status.HTTP_200_OK)
```

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
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from ..models import Todo
from ..serializers import TodoSerializer


class TodoListPagination(PageNumberPagination):
    page_size = 3
    page_size_query_param = "page_size"
    max_page_size = 50


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TodoListPagination

    def get_queryset(self):
        return Todo.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```


템플릿 생성
```bash
mkdir -p templates/accounts
```

`templates/accounts/signup.html`
```html
<h2>회원가입 (STEP1: JWT 없음)</h2>

<input id="username" placeholder="username">
<input id="password" placeholder="password" type="password">
<input id="password2" placeholder="password 확인" type="password">

<button id="signupBtn">가입</button>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", () => {

  const api = axios.create({ baseURL: "/" });

  // CSRF 자동 주입(세션 기반 API에 필요)
  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    return config;
  });

  document.getElementById("signupBtn").addEventListener("click", async () => {
    try {
      const username  = document.getElementById("username").value;
      const password  = document.getElementById("password").value;
      const password2 = document.getElementById("password2").value;

      await api.post("/api/signup/", { username, password, password2 });

      alert("회원가입 완료 → 로그인으로 이동");
      window.location.href = "/login/";

    } catch (err) {
      console.log(err.response?.data || err.message);
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

  const api = axios.create({ baseURL: "/" });

  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    return config;
  });

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      await api.post("/api/login/", { username, password });

      alert("로그인 성공");
      window.location.href = "/todo/list/";

    } catch (err) {
      console.log(err.response?.data || err.message);
      alert("로그인 실패");
    }
  });

});
</script>
```

`templates/todo/create.html`
```python
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

  // (세션 기반) 로그인 페이지
  const LOGIN_PAGE_URL = "/login/";
  const CREATE_API_URL = "/todo/viewsets/view/"; 

  // 1) axios 인스턴스 (세션 인증은 쿠키 기반)
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,  
  });

  // 2) 요청 인터셉터: CSRF만 주입 (세션 기반에서 필요)
  api.interceptors.request.use((config) => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  });

  // 3) (세션 기반) 로그인 여부는 "실제 요청이 401/403이면" 로그인으로 보냄
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err.response?.status;

      // 세션이 없거나 권한 없으면 로그인 페이지로
      if (status === 401 || status === 403) {
        console.log("세션 없음/권한 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return Promise.reject(err);
      }

      return Promise.reject(err);
    }
  );

  // 4) Create 버튼 클릭 → FormData 전송 (기존 구조 유지)
  document.getElementById("todoCreate").addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("complete", document.getElementById("complete").checked ? "true" : "false");
      formData.append("exp", document.getElementById("exp").value || "0");

      const fileInput = document.getElementById("image");
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }

      const res = await api.post(CREATE_API_URL, formData);

      console.log("생성 성공:", res.data);
      window.location.href = "/todo/list/";

    } catch (err) {
      console.error("생성 실패:", err.response?.data || err.message);
      alert("생성 실패: 콘솔/네트워크 확인");
    }
  });

});
</script>
{% endblock %}
```

`templates/todo/detail.html`
```python
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>

  {% if todo.image %}
    <p><strong>이미지:</strong></p>
    <img src="{{ todo.image.url }}" alt="todo image" style="max-width:300px; height:auto;">
  {% else %}
    <p><strong>이미지:</strong> -</p>
  {% endif %}
</div>

<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const todoId = "{{ todo.id }}";
  const LOGIN_PAGE_URL = "/login/";   // 로그인 페이지
  const LIST_PAGE_URL  = "/todo/list/";

  // CSRF 꺼내는 함수 (세션 기반에서 필요)
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  // 수정 버튼
  document.querySelector(".todoUpdate").addEventListener("click", () => {
    window.location.href = `/todo/update/${todoId}/`;
  });

  // 삭제 버튼 (세션 쿠키로 인증)
  document.querySelector(".todoDelete").addEventListener("click", async () => {
    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const res = await fetch(`/todo/viewsets/view/${todoId}/`, {
        method: "DELETE",
        credentials: "same-origin", // 세션 쿠키 포함 (안전)
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        }
      });

      // 세션 없거나 권한 없으면 로그인으로
      if (res.status === 401 || res.status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
        return;
      }

      if (!res.ok) throw new Error("삭제 실패");

      // 삭제 성공 → 리스트로 이동
      window.location.href = LIST_PAGE_URL;

    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });

  // 홈으로 버튼
  document.querySelector(".todoHome").addEventListener("click", () => {
    window.location.href = LIST_PAGE_URL;
  });

});
</script>
{% endblock %}
```


`templates/todo/list.html`
```python
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todocontainer"></div>

<div class="pagination">
    <button id="prevBtn">이전</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">다음</button>
</div>

<button id="createBtn">Todo 등록하기</button>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

    const LOGIN_PAGE_URL = "/login/"; // 로그인 페이지
    let currentPage = 1;

    // axios (세션 쿠키 기반)
    const api = axios.create({
        baseURL: "/",
        withCredentials: true,
    });

    // CSRF 자동 주입 (세션 기반에서 POST/PATCH/DELETE에 필요)
    api.interceptors.request.use(config => {
        const csrfToken = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="))
            ?.split("=")[1];

        config.headers = config.headers || {};
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }
        return config;
    });

    // 세션 없으면(401/403) 로그인으로
    api.interceptors.response.use(
        res => res,
        err => {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                console.log("세션 없음/권한 없음 → 로그인 이동");
                window.location.href = LOGIN_PAGE_URL;
                return Promise.reject(err);
            }
            return Promise.reject(err);
        }
    );

    function loadPage(page) {
        api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {
                const data = res.data;

                renderTodos(data.data || data.results || []);
                updatePaginationUI(data);

                currentPage = data.current_page || page;
            })
            .catch(err => console.error("페이지 로드 실패", err));
    }

    function renderTodos(todos) {
        const container = document.querySelector(".todocontainer");
        container.innerHTML = "";

        if (!todos || todos.length === 0) {
            container.innerHTML = "<p>등록된 Todo 없음</p>";
            return;
        }

        todos.forEach(todo => {
            const div = document.createElement("div");
            div.className = "todo-item";
            div.dataset.id = todo.id;

            // 이미지 표시 로직
            const imageSrc = todo.image
                ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
                : "";

            div.innerHTML = `
                <p><strong>제목:</strong> ${todo.name ?? ""}</p>
                <p><strong>설명:</strong> ${todo.description ?? ""}</p>
                <p><strong>완료 여부:</strong> ${(todo.complete ? "완료" : "미완료")}</p>
                <p><strong>exp:</strong> ${todo.exp ?? 0}</p>
                ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}
                <hr>
            `;

            div.addEventListener("click", () => {
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            container.appendChild(div);
        });
    }

    function updatePaginationUI(data) {
        const current = data.current_page ?? currentPage ?? 1;
        const total =
            data.page_count ??
            (typeof data.count === "number" && data.results
                ? Math.ceil(data.count / data.results.length)
                : "?");

        document.getElementById("pageInfo").innerText = `${current} / ${total}`;

        document.getElementById("prevBtn").disabled = !(data.previous);
        document.getElementById("nextBtn").disabled = !(data.next);
    }

    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        loadPage(currentPage + 1);
    });

    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });

    loadPage(1);
});
</script>
{% endblock %}
```


`templates/todo/update.html`
```python
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="container">
  <h2>Todo 수정</h2>

  <div>
    <label for="name">Name:</label>
    <input type="text" name="name" id="name" value="{{ todo.name }}">
  </div>

  <div>
    <label for="description">Description:</label>
    <textarea name="description" id="description">{{ todo.description }}</textarea>
  </div>

  <div>
    <label for="complete">Complete:</label>
    <input type="checkbox" name="complete" id="complete" {% if todo.complete %}checked{% endif %}>
  </div>

  <div>
    <label for="exp">Experience Points:</label>
    <input type="number" name="exp" id="exp" min="0" value="{{ todo.exp }}">
  </div>

  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

  <button type="button" id="todoUpdate">저장</button>
  <button type="button" onclick="history.back()">취소</button>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", () => {

  const LOGIN_PAGE_URL = "/login/";
  const todoId = "{{ todo.id }}";

  const api = axios.create({
    baseURL: "/",
    withCredentials: true, // 세션 쿠키 포함
  });

  // CSRF 자동 주입 (세션 기반에서 POST/PATCH/DELETE에 필요)
  api.interceptors.request.use(config => {
    const csrfToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];

    config.headers = config.headers || {};
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  });

  // 세션 없으면 로그인으로
  api.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        alert("로그인이 필요합니다.");
        window.location.href = LOGIN_PAGE_URL;
      }
      return Promise.reject(err);
    }
  );

  document.getElementById("todoUpdate").addEventListener("click", async () => {
    try {
      const formData = new FormData();
      formData.append("name", document.getElementById("name").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("complete", document.getElementById("complete").checked ? "true" : "false");
      formData.append("exp", document.getElementById("exp").value || 0);

      const fileInput = document.getElementById("image");
      if (fileInput.files.length > 0) {
        formData.append("image", fileInput.files[0]);
      }

      // ViewSet 단건 수정 URL + PATCH
      const res = await api.patch(`/todo/viewsets/view/${todoId}/`, formData);

      console.log("수정 성공:", res.data);
      window.location.href = `/todo/detail/${todoId}/`;

    } catch (err) {
      console.error("수정 실패:", err.response?.data || err.message);
      alert("수정 실패");
    }
  });

});
</script>

{% endblock %}
```