
`앱 생성`
```bash
python manage.py startapp interaction
```

`settings.py 등록`
```python
INSTALLED_APPS = [  
...  
"interaction",  
]
```

`interaction/models.py`
```python
from django.conf import settings
from django.db import models


class TodoLike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    todo = models.ForeignKey(
        "todo.Todo",   # ✅ 기존 todo 앱 모델 참조
        on_delete=models.CASCADE,
        related_name="likes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "todo")


class TodoBookmark(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    todo = models.ForeignKey(
        "todo.Todo",
        on_delete=models.CASCADE,
        related_name="bookmarks"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "todo")


class TodoComment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    todo = models.ForeignKey(
        "todo.Todo",
        on_delete=models.CASCADE,
        related_name="comments"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

`마이그레이션`
```bash
python manage.py makemigrations  
python manage.py migrate
```

`interaction/serializers.py 생성`
```python
from rest_framework import serializers
from .models import TodoLike, TodoBookmark, TodoComment


class TodoLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoLike
        fields = "__all__"


class TodoBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoBookmark
        fields = "__all__"


class TodoCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TodoComment
        fields = ["id", "todo", "user", "username", "content", "created_at"]
        read_only_fields = ["user"]
```

`interaction/views.py` : JWT 인증이므로 `IsAuthenticated` 사용
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from todo.models import Todo
from .models import TodoLike, TodoBookmark, TodoComment
from .serializers import TodoCommentSerializer


# ------------------------
# 좋아요 토글
# POST /interaction/like/<todo_id>/
# ------------------------
class TodoLikeToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):
        todo = get_object_or_404(Todo, id=todo_id)

        obj, created = TodoLike.objects.get_or_create(
            todo=todo,
            user=request.user
        )

        if not created:
            obj.delete()
            liked = False
        else:
            liked = True

        count = TodoLike.objects.filter(todo=todo).count()

        return Response({
            "liked": liked,
            "like_count": count
        })


# ------------------------
# 북마크 토글
# POST /interaction/bookmark/<todo_id>/
# ------------------------
class TodoBookmarkToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):
        todo = get_object_or_404(Todo, id=todo_id)

        obj, created = TodoBookmark.objects.get_or_create(
            todo=todo,
            user=request.user
        )

        if not created:
            obj.delete()
            bookmarked = False
        else:
            bookmarked = True

        count = TodoBookmark.objects.filter(todo=todo).count()

        return Response({
            "bookmarked": bookmarked,
            "bookmark_count": count
        })


# ------------------------
# 댓글 등록
# POST /interaction/comment/<todo_id>/
# ------------------------
class TodoCommentCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):
        todo = get_object_or_404(Todo, id=todo_id)
        content = request.data.get("content", "").strip()

        if not content:
            return Response({"detail": "내용이 필요합니다."}, status=400)

        comment = TodoComment.objects.create(
            todo=todo,
            user=request.user,
            content=content
        )

        serializer = TodoCommentSerializer(comment)

        return Response(serializer.data)


# ------------------------
# 댓글 목록 조회
# GET /interaction/comment/<todo_id>/
# ------------------------
class TodoCommentListAPIView(APIView):

    def get(self, request, todo_id):
        todo = get_object_or_404(Todo, id=todo_id)
        comments = TodoComment.objects.filter(todo=todo).order_by("-created_at")

        serializer = TodoCommentSerializer(comments, many=True)
        return Response(serializer.data)
```

`interaction/urls.py 생성`
```python
from django.urls import path
from .views import (
    TodoLikeToggleAPIView,
    TodoBookmarkToggleAPIView,
    TodoCommentCreateAPIView,
    TodoCommentListAPIView,
)

urlpatterns = [
    path("like/<int:todo_id>/", TodoLikeToggleAPIView.as_view()),
    path("bookmark/<int:todo_id>/", TodoBookmarkToggleAPIView.as_view()),
    path("comment/<int:todo_id>/", TodoCommentCreateAPIView.as_view()),
    path("comment/<int:todo_id>/list/", TodoCommentListAPIView.as_view()),
]
```

`mysite/urls.py 연결`
```python
from django.urls import path, include  
  
urlpatterns = [  
...  
path("interaction/", include("interaction.urls")),  
]
```

생성된 추가 주소
```
POST /interaction/like/3/  
POST /interaction/bookmark/3/  
POST /interaction/comment/3/  
GET /interaction/comment/3/list/
```

`테이블 생성`
```bash
python manage.py makemigrations  
python manage.py migrate
```

`views/api_views.py`
```python
from ..models import TodoLike, TodoBookmark, TodoComment  # [추가]

# [추가] DRF action / permission
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny


# -------------------------------------------
# ✅ APIView 기반 CRUD 사용하지 않음
# -------------------------------------------
class TodoListAPI(APIView):
class TodoCreateAPI(APIView):
class TodoRetrieveAPI(APIView):
class TodoUpdateAPI(APIView):
class TodoDeleteAPI(APIView):


# -------------------------------------------
# [핵심 수정] ViewSet에 좋아요/북마크/댓글 기능 추가
# -------------------------------------------
class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all().order_by("-created_at")
    serializer_class = TodoSerializer

    # [추가] 기본은 누구나 조회 가능(목록/상세)
    permission_classes = [AllowAny]

    # [추가] list 응답을 네 JS 코드
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)

        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return Response({
                "data": serializer.data,
                "current_page": int(request.query_params.get("page", 1)),
                "page_count": self.paginator.page.paginator.num_pages,
                "next": self.paginator.get_next_link() is not None,
                "previous": self.paginator.get_previous_link() is not None,
            })

        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response({
            "data": serializer.data,
            "current_page": 1,
            "page_count": 1,
            "next": False,
            "previous": False,
        })

    # [추가] 좋아요 토글: POST /todo/viewsets/view/<id>/like/
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])  
    def like(self, request, pk=None):
        todo = self.get_object()
        user = request.user

        obj, created = TodoLike.objects.get_or_create(todo=todo, user=user)
        if created:
            liked = True
        else:
            obj.delete()
            liked = False

        like_count = TodoLike.objects.filter(todo=todo).count()
        return Response({"liked": liked, "like_count": like_count})

    # [추가] 북마크 토글: POST /todo/viewsets/view/<id>/bookmark/
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])  
    def bookmark(self, request, pk=None):
        todo = self.get_object()
        user = request.user

        obj, created = TodoBookmark.objects.get_or_create(todo=todo, user=user)
        if created:
            bookmarked = True
        else:
            obj.delete()
            bookmarked = False

        bookmark_count = TodoBookmark.objects.filter(todo=todo).count()
        return Response({"bookmarked": bookmarked, "bookmark_count": bookmark_count})

    # [추가] 댓글 등록: POST /todo/viewsets/view/<id>/comments/
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])  
    def comments(self, request, pk=None):
        todo = self.get_object()
        user = request.user

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"detail": "content is required"}, status=400)

        TodoComment.objects.create(todo=todo, user=user, content=content)
        comment_count = TodoComment.objects.filter(todo=todo).count()
        return Response({"comment_count": comment_count})
```

`todo/serializers.py`
```python
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import Todo

from interaction.models import TodoLike, TodoBookmark, TodoComment  # ✅ 경로 맞으면 그대로 사용

class TodoSerializer(ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    bookmark_count = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            "id", "name", "description", "complete", "exp", "image", "created_at",
            "user", "username",
            "is_public",
            "like_count", "is_liked",
            "bookmark_count", "is_bookmarked",
            "comment_count",
        ]
        read_only_fields = ["user"]

    def _user(self):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user
        return None

    def get_like_count(self, obj):
        return TodoLike.objects.filter(todo=obj).count()

    def get_is_liked(self, obj):
        user = self._user()
        if not user:
            return False
        return TodoLike.objects.filter(todo=obj, user=user).exists()

    def get_bookmark_count(self, obj):
        return TodoBookmark.objects.filter(todo=obj).count()

    def get_is_bookmarked(self, obj):
        user = self._user()
        if not user:
            return False
        return TodoBookmark.objects.filter(todo=obj, user=user).exists()

    def get_comment_count(self, obj):
        return TodoComment.objects.filter(todo=obj).count()
```


`ltemplates/todo/list.html`
```html
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

<script>
document.addEventListener("DOMContentLoaded", () => {

    const LOGIN_PAGE_URL = "/login/"; // 로그인 페이지 URL
    let currentPage = 1;             

    // window.api 존재 확인
    if (!window.api) {
        console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
        alert("설정 오류: api.js가 로드되지 않았습니다.");
        return;
    }

    // access 토큰 없으면 로그인 이동
    const access = localStorage.getItem("access_token");
    if (!access) {
        console.log("access_token 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return;
    }

    // 인증 실패 처리
    function handleAuthError(err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
            console.log("인증 실패(401/403) → 토큰 삭제 후 로그인 이동");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = LOGIN_PAGE_URL;
        }
        return Promise.reject(err);
    }

    // ===== INTERACTIVE START: interaction API helper =====
    const InteractionAPI = {
        like: (todoId) => `/interaction/like/${todoId}/`,
        bookmark: (todoId) => `/interaction/bookmark/${todoId}/`,
        comment: (todoId) => `/interaction/comment/${todoId}/`,
        // commentList: (todoId) => `/interaction/comment/${todoId}/list/`,
    };
    // ===== INTERACTIVE END =====

    function loadPage(page) {
        window.api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {
                const data = res.data;

                renderTodos(data.data || data.results || []);
                updatePaginationUI(data);

                currentPage = data.current_page || page;
            })
            .catch(err => {
                handleAuthError(err).catch(() => {});
                console.error("페이지 로드 실패", err.response?.data || err.message);
            });
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

            const imageSrc = todo.image
                ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
                : "";

            // ===== INTERACTIVE START: count/is 상태 기본값 =====
            const likeCount = Number(todo.like_count ?? 0);
            const bookmarkCount = Number(todo.bookmark_count ?? 0);
            const commentCount = Number(todo.comment_count ?? 0);

            const isLiked = Boolean(todo.is_liked ?? false);
            const isBookmarked = Boolean(todo.is_bookmarked ?? false);
            // ===== INTERACTIVE END =====


            div.innerHTML = `
                <p><strong>제목:</strong> ${todo.name ?? ""}</p>
                <p><strong>설명:</strong> ${todo.description ?? ""}</p>
                <p><strong>완료 여부:</strong> ${(todo.complete ? "완료" : "미완료")}</p>
                <p><strong>exp:</strong> ${todo.exp ?? 0}</p>
                ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}

                <!-- =================================================
                     ===== INTERACTIVE START: 액션바 + 댓글 UI =====
                     ================================================= -->
                <div class="todo-actions" style="display:flex; gap:10px; align-items:center; margin-top:10px;">
                    <button class="btn-like" type="button"
                        data-id="${todo.id}"
                        aria-pressed="${isLiked}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">${isLiked ? "❤️" : "🤍"}</span>
                        <span class="count">${likeCount}</span>
                    </button>

                    <button class="btn-bookmark" type="button"
                        data-id="${todo.id}"
                        aria-pressed="${isBookmarked}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">${isBookmarked ? "🔖" : "📑"}</span>
                        <span class="count">${bookmarkCount}</span>
                    </button>

                    <button class="btn-comment" type="button"
                        data-id="${todo.id}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">💬</span>
                        <span class="count">${commentCount}</span>
                    </button>
                </div>

                <!-- 댓글 입력 영역 (기본 숨김) -->
                <div class="comment-box" style="display:none; margin-top:10px;">
                    <textarea class="comment-text" rows="3" style="width:100%;"></textarea>
                    <button class="comment-submit" data-id="${todo.id}">등록</button>
                </div>

                <!-- 댓글이 화면에 보일 자리 -->
                <div class="comment-list" style="margin-top:8px;"></div>
                <!-- INTERACTIVE END  -->

                <hr>
            `;

            // (유지) 카드 클릭 → detail 이동
            div.addEventListener("click", (e) => {               
                // ===== INTERACTIVE START: 클릭 전파 방지 범위 확장 =====
                if (e.target.closest(".todo-actions") || e.target.closest(".comment-box")) return;

                // ===== INTERACTIVE END =====
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

    // ======================================================
    // ===== INTERACTIVE START: 이벤트 위임(좋아요/북마크/댓글) =====
    document.addEventListener("click", async (e) => {

        // 좋아요
        const likeBtn = e.target.closest(".btn-like");
        if (likeBtn) {
            e.stopPropagation();
            e.preventDefault();

            const todoId = likeBtn.dataset.id;

            try {
                const res = await window.api.post(InteractionAPI.like(todoId));
                const { liked, like_count } = res.data;

                likeBtn.setAttribute("aria-pressed", String(liked));
                likeBtn.querySelector(".icon").textContent = liked ? "❤️" : "🤍";
                likeBtn.querySelector(".count").textContent = Number(like_count ?? 0);

            } catch (err) {
                handleAuthError(err).catch(() => {});
                console.error("좋아요 실패:", err.response?.data || err.message);
                alert("좋아요 실패");
            }
            return;
        }

        // 북마크
        const bookmarkBtn = e.target.closest(".btn-bookmark");
        if (bookmarkBtn) {
            e.stopPropagation();
            e.preventDefault();

            const todoId = bookmarkBtn.dataset.id;

            try {
                const res = await window.api.post(InteractionAPI.bookmark(todoId));
                const { bookmarked, bookmark_count } = res.data;

                bookmarkBtn.setAttribute("aria-pressed", String(bookmarked));
                bookmarkBtn.querySelector(".icon").textContent = bookmarked ? "🔖" : "📑";
                bookmarkBtn.querySelector(".count").textContent = Number(bookmark_count ?? 0);

            } catch (err) {
                handleAuthError(err).catch(() => {});
                console.error("북마크 실패:", err.response?.data || err.message);
                alert("북마크 실패");
            }
            return;
        }

        // 댓글 버튼 → 입력창 토글
        const commentBtn = e.target.closest(".btn-comment");
        if (commentBtn) {
            e.stopPropagation();
            e.preventDefault();

            const card = commentBtn.closest(".todo-item");
            const box = card.querySelector(".comment-box");

            box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
            return;
        }

        // 댓글 등록
        const submitBtn = e.target.closest(".comment-submit");
        if (submitBtn) {
            e.stopPropagation();
            e.preventDefault();

            const todoId = submitBtn.dataset.id;
            const card = submitBtn.closest(".todo-item");
            const textarea = card.querySelector(".comment-text");
            const content = textarea.value.trim();

            if (!content) return;

            try {
                const res = await window.api.post(InteractionAPI.comment(todoId), { content });
                const saved = res.data;

                // 화면에 댓글 추가
                const listEl = card.querySelector(".comment-list");
                const item = document.createElement("div");
                item.className = "comment-item";
                item.style.padding = "6px 0";
                item.innerHTML = `<div style="font-size:14px;">
                    <strong>${saved.username ?? "me"}</strong> : ${saved.content}
                </div>`;
                listEl.prepend(item);

                // 댓글 수 +1
                const countEl = card.querySelector(".btn-comment .count");
                countEl.textContent = Number(countEl.textContent || 0) + 1;

                textarea.value = "";
                card.querySelector(".comment-box").style.display = "block";

            } catch (err) {
                handleAuthError(err).catch(() => {});
                console.error("댓글 등록 실패", err.response?.data || err.message);
                alert("댓글 등록 실패");
            }
            return;
        }
    });
    // ======================================================
    // ===== INTERACTIVE END =====

    // 페이지네이션/등록 버튼
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


이건 이벤트 전파 때문에 버튼 클릭이 부모(div의 클릭 이벤트로 넘어가서 detail로 이동하는 상황
list.html의 기존코드
```js
div.addEventListener("click", () => {
  window.location.href = `/todo/detail/${todo.id}/`;
});
```

수정
```js
div.addEventListener("click", (e) => {
  // ✅ 액션 버튼(좋아요/북마크/댓글) 클릭이면 상세페이지 이동 금지
  if (e.target.closest(".todo-actions")) return;

  window.location.href = `/todo/detail/${todo.id}/`;
});
```