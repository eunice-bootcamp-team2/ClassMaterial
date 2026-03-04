- 새 앱 `interaction`이 추가됨
	- `python manage.py startapp interaction` 으로 앱 생성
	- `mysite/settings.py`의 `INSTALLED_APPS`에 `"interaction"` 추가
	- `mysite/urls.py`에 `path("interaction/", include("interaction.urls"))` 연결
```
왜 변경?
	- 9번까지는 JWT로 로그인해서 Todo CRUD까지만 가능했는데,  
	- 10번에서 좋아요/북마크/댓글 같은 사용자 인터랙션 기능을 분리된 앱으로 확장하려고
	  interaction 앱을 만들었음
```
	
- DB 모델이 3개 추가됨: Like / Bookmark / Comment
	- `interaction/models.py`에 아래 모델 추가
		- `TodoLike(user, todo, created_at)` + `unique_together = (user, todo)`
		- `TodoBookmark(user, todo, created_at)` + `unique_together = (user, todo)`
		- `TodoComment(user, todo, content, created_at)`
	- 그리고 마이그레이션 실행
```
왜 변경?
	- 좋아요/북마크는 한 유저가 같은 Todo에 여러 번 누르면 안 됨 → unique_together로 
	  중복 방지
	- 댓글은 Todo에 텍스트 + 작성자 + 시간을 저장해야 해서 별도 테이블이 필요함
```
	
- 인터랙션용 API가 추가됨 (JWT 인증 기반)
	- `interaction/views.py`에 APIView들이 추가됩니다.
		- 좋아요 토글: `POST /interaction/like/<todo_id>/` (IsAuthenticated)
		- 북마크 토글: `POST /interaction/bookmark/<todo_id>/` (IsAuthenticated)
		- 댓글 등록: `POST /interaction/comment/<todo_id>/` (IsAuthenticated)
		- 댓글 목록: `GET /interaction/comment/<todo_id>/list/` (인증 없이도 조회 가능하게 작성됨)
```
왜 변경?
	- 9번에서 JWT로 인증 체계를 잡았기 때문에,  
	- 좋아요/북마크/댓글 “작성/토글”은 로그인한 유저만 가능하게 IsAuthenticated를 붙인것
```
	
- TodoViewSet도 확장됨: ViewSet action으로 like/bookmark/comments 추가
	- `todo/views/api_views.py`의 `TodoViewSet`에 `@action`으로 기능이 붙습니다.
	- `POST /todo/viewsets/view/<id>/like/`
	- `POST /todo/viewsets/view/<id>/bookmark/`
	- `POST /todo/viewsets/view/<id>/comments/`
또한 ViewSet 기본 권한이 다음처럼 바뀝니다:
- 기본 `permission_classes = [AllowAny]` (목록/상세는 누구나)
- 액션은 `permission_classes=[IsAuthenticated]` (좋아요/북마크/댓글 등록만 로그인 필요)
```
왜 변경?
	- 목록/상세는 공개로 두고(AllowAny)
	- 사용자 행위(좋아요/북마크/댓글)는 인증 필요(IsAuthenticated)
	- 이렇게 하면 UX가 좋아집니다: 둘러보기는 가능하지만, 액션은 로그인해야 함.
```
	
- TodoSerializer가 ‘인터랙션 정보’를 같이 내려주도록 확장됨
	- `todo/serializers.py`에서 다음 필드들이 추가됩니다.
	- `like_count`, `is_liked`
	- `bookmark_count`, `is_bookmarked`
	- `comment_count`
	- `username`(작성자 표시)
그리고 `context={"request": request}`를 넘겨서, 로그인 유저 기준으로 `is_liked/is_bookmarked`를 계산합니다
```
왜 변경?
프론트(list.html)에서 버튼 UI를 만들려면:
	- 현재 좋아요 수
	- 내가 좋아요 눌렀는지 여부(하트 채움/빈 하트)
	- 북마크 수/상태
	- 댓글 수  
이 정보가 한 번의 list API 응답에 같이 와야 화면을 쉽게 그릴 수 있어서 Serializer를 확장함
```
	
list.html이 인터랙티브 UI로 크게 변경됨
- `templates/todo/list.html`에 아래가 추가/변경됩니다.
	- 좋아요/북마크/댓글 버튼 UI 추가
	- 댓글 입력 박스 토글 + 댓글 등록 기능 추가
	- 이벤트 위임(document click)으로 버튼 클릭 처리
	- 이벤트 전파 방지: 버튼 클릭이 카드 클릭으로 넘어가 detail로 이동하던 문제를 `closest()` 체크로 막음
	- JWT 토큰 없으면 로그인으로 보내는 처리 유지/강화
```
왜 변경?
	- 9번까지는 목록 클릭 → 상세 이동 정도의 정적 UX였는데,  
	- 10번은 목록에서 바로 좋아요/북마크/댓글을 하려는 목표라서 UI/이벤트 구조 자체가 바뀐 것
```
9번 = JWT 인증 체계 완성(토큰 기반 요청)
10번 = 그 JWT 위에서 ‘좋아요/북마크/댓글’ 인터랙티브 기능을 DB+API+프론트까지 통합 추가

---
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
---
이 모델들의 역할 (간단 구조)
```
User
  │
  ├── TodoLike
  │      └── 어떤 Todo에 좋아요 눌렀는지
  │
  ├── TodoBookmark
  │      └── 어떤 Todo를 북마크했는지
  │
  └── TodoComment
         └── 어떤 Todo에 댓글 작성했는지
```

Todo 모델 기준 관계 구조
```
Todo
 ├─ likes      → 좋아요 목록
 ├─ bookmarks  → 북마크 목록
 └─ comments   → 댓글 목록
```

```python
todo.likes.count()        # 좋아요 수
todo.bookmarks.count()    # 북마크 수
todo.comments.all()       # 댓글 목록
```

좋아요 / 북마크 / 댓글을 별도 테이블로 분리하는 이유
```
확장성  
조회 성능  
데이터 관리
```

`interaction/models.py`
```python
# Django 설정에서 AUTH_USER_MODEL 가져오기
# 기본 User 모델 또는 커스텀 User 모델을 참조하기 위해 사용
from django.conf import settings

# Django ORM 모델 클래스 사용
from django.db import models


# ============================================
# Todo 좋아요 모델
# ============================================
class TodoLike(models.Model):

    # 좋아요를 누른 사용자
    # settings.AUTH_USER_MODEL → 현재 프로젝트에서 사용하는 User 모델
    # on_delete=models.CASCADE
    # → 사용자가 삭제되면 좋아요도 함께 삭제
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    # 좋아요 대상 Todo
    # "todo.Todo" → todo 앱의 Todo 모델을 문자열로 참조
    # related_name="likes"
    # → Todo 객체에서 todo.likes 로 접근 가능
    # 예: todo.likes.all()
    todo = models.ForeignKey(
        "todo.Todo",   # 기존 todo 앱 모델 참조
        on_delete=models.CASCADE,
        related_name="likes"
    )

    # 좋아요 생성 시간
    # auto_now_add=True
    # → 생성될 때 자동으로 현재 시간이 저장됨
    created_at = models.DateTimeField(auto_now_add=True)


    # 모델 추가 옵션 설정
    class Meta:

        # 동일한 user + todo 조합은 한 번만 허용
        # 즉 한 사용자가 같은 Todo에 여러 번 좋아요 못 누르게 함
        unique_together = ("user", "todo")



# ============================================
# Todo 북마크 모델
# ============================================
class TodoBookmark(models.Model):

    # 북마크를 등록한 사용자
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    # 북마크 대상 Todo
    # related_name="bookmarks"
    # → todo.bookmarks 로 접근 가능
    # 예: todo.bookmarks.count()
    todo = models.ForeignKey(
        "todo.Todo",
        on_delete=models.CASCADE,
        related_name="bookmarks"
    )

    # 북마크 생성 시간
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:

        # 동일 사용자 + Todo 조합 중복 방지
        # 같은 Todo를 여러 번 북마크 못하도록 제한
        unique_together = ("user", "todo")



# ============================================
# Todo 댓글 모델
# ============================================
class TodoComment(models.Model):

    # 댓글 작성 사용자
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    # 댓글이 달린 Todo
    # related_name="comments"
    # → todo.comments 로 접근 가능
    # 예: todo.comments.all()
    todo = models.ForeignKey(
        "todo.Todo",
        on_delete=models.CASCADE,
        related_name="comments"
    )

    # 댓글 내용
    # TextField → 긴 문자열 저장 가능
    content = models.TextField()

    # 댓글 작성 시간
    created_at = models.DateTimeField(auto_now_add=True)
```

`마이그레이션`
```bash
python manage.py makemigrations  
python manage.py migrate
```
---
Serializer가 하는 3가지 핵심 역할
1️⃣ 모델 → JSON 변환 (직렬화)
```python
todo_like = TodoLike.objects.first()
serializer = TodoLikeSerializer(todo_like)

serializer.data
```
결과
```json
{
  "id": 1,
  "user": 3,
  "todo": 10,
  "created_at": "2026-03-04T12:30:00"
}
```

2️⃣ JSON → 모델 객체 변환 (역직렬화)
```python
data = {
    "todo": 10
}

serializer = TodoLikeSerializer(data=data)
```

3️⃣ 입력 데이터 검증
```python
serializer.is_valid()
```
검증
```
필수값 확인  
타입 확인  
모델 필드 규칙 확인
```

`interaction/serializers.py 생성`
```python
# DRF Serializer 사용
# 모델 데이터를 JSON으로 변환하거나
# JSON 데이터를 모델 객체로 변환할 때 사용
from rest_framework import serializers

# 현재 앱의 모델 import
from .models import TodoLike, TodoBookmark, TodoComment


# ============================================
# Todo 좋아요 Serializer
# ============================================
class TodoLikeSerializer(serializers.ModelSerializer):

    # ModelSerializer
    # → Django 모델을 기반으로 자동 필드 생성
    class Meta:

        # 어떤 모델을 사용할지 지정
        model = TodoLike

        # 모델의 모든 필드를 serializer에 포함
        # user, todo, created_at 등
        fields = "__all__"



# ============================================
# Todo 북마크 Serializer
# ============================================
class TodoBookmarkSerializer(serializers.ModelSerializer):

    class Meta:

        # TodoBookmark 모델을 기반으로 직렬화
        model = TodoBookmark

        # 모델의 모든 필드 포함
        fields = "__all__"



# ============================================
# Todo 댓글 Serializer
# ============================================
class TodoCommentSerializer(serializers.ModelSerializer):

    # username 필드를 추가
    # source="user.username"
    # → user 모델의 username 값을 가져옴
    # read_only=True
    # → 클라이언트가 수정할 수 없음 (조회용)
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )


    class Meta:

        # TodoComment 모델 기반
        model = TodoComment

        # API에서 사용할 필드 목록
        fields = [
            "id",          # 댓글 id
            "todo",        # 어떤 Todo에 달린 댓글인지
            "user",        # 댓글 작성자
            "username",    # 작성자 username (추가 필드)
            "content",     # 댓글 내용
            "created_at"   # 작성 시간
        ]

        # 읽기 전용 필드
        # user는 보통 request.user로 서버에서 자동 설정
        read_only_fields = ["user"]
```

`interaction/views.py` : JWT 인증이므로 `IsAuthenticated` 사용
```python
# DRF APIView 사용
# 클래스 기반 API를 만들 때 사용
from rest_framework.views import APIView

# API 응답을 JSON 형태로 반환하기 위한 클래스
from rest_framework.response import Response

# 로그인한 사용자만 접근하도록 제한하는 권한 클래스
from rest_framework.permissions import IsAuthenticated

# 객체가 없을 경우 자동으로 404 반환
from django.shortcuts import get_object_or_404


# Todo 모델 import
from todo.models import Todo

# 좋아요 / 북마크 / 댓글 모델 import
from .models import TodoLike, TodoBookmark, TodoComment

# 댓글 serializer import
from .serializers import TodoCommentSerializer


# =========================================================
# 좋아요 토글 API
# POST /interaction/like/<todo_id>/
# =========================================================
class TodoLikeToggleAPIView(APIView):

    # 로그인한 사용자만 접근 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):

        # 해당 todo_id에 해당하는 Todo 객체 가져오기
        # 없으면 자동으로 404 반환
        todo = get_object_or_404(Todo, id=todo_id)

        # 좋아요 객체 생성 또는 조회
        # 이미 좋아요가 있으면 기존 객체 반환
        # 없으면 새로 생성
        obj, created = TodoLike.objects.get_or_create(
            todo=todo,
            user=request.user
        )

        # 이미 좋아요가 존재했던 경우
        if not created:

            # 좋아요 취소 (삭제)
            obj.delete()
            liked = False

        else:
            # 좋아요 새로 생성됨
            liked = True

        # 현재 Todo의 전체 좋아요 개수 계산
        count = TodoLike.objects.filter(todo=todo).count()

        # JSON 응답 반환
        return Response({
            "liked": liked,        # 현재 좋아요 상태
            "like_count": count    # 총 좋아요 수
        })



# =========================================================
# 북마크 토글 API
# POST /interaction/bookmark/<todo_id>/
# =========================================================
class TodoBookmarkToggleAPIView(APIView):

    # 로그인 사용자만 접근 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):

        # Todo 객체 조회
        todo = get_object_or_404(Todo, id=todo_id)

        # 북마크 생성 또는 조회
        obj, created = TodoBookmark.objects.get_or_create(
            todo=todo,
            user=request.user
        )

        # 이미 북마크가 존재하면
        if not created:

            # 북마크 취소 (삭제)
            obj.delete()
            bookmarked = False

        else:
            # 새 북마크 생성
            bookmarked = True

        # 현재 Todo의 북마크 개수 계산
        count = TodoBookmark.objects.filter(todo=todo).count()

        # JSON 응답 반환
        return Response({
            "bookmarked": bookmarked,     # 현재 북마크 상태
            "bookmark_count": count       # 전체 북마크 수
        })



# =========================================================
# 댓글 등록 API
# POST /interaction/comment/<todo_id>/
# =========================================================
class TodoCommentCreateAPIView(APIView):

    # 로그인 사용자만 댓글 작성 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, todo_id):

        # 댓글이 달릴 Todo 객체 조회
        todo = get_object_or_404(Todo, id=todo_id)

        # 요청 데이터에서 content 값 가져오기
        # strip() → 앞뒤 공백 제거
        content = request.data.get("content", "").strip()

        # 댓글 내용이 없는 경우
        if not content:

            # 오류 메시지 반환
            return Response(
                {"detail": "내용이 필요합니다."},
                status=400
            )

        # 댓글 생성
        comment = TodoComment.objects.create(
            todo=todo,              # 어떤 Todo에 달렸는지
            user=request.user,      # 작성자
            content=content         # 댓글 내용
        )

        # 생성된 댓글을 serializer로 변환
        serializer = TodoCommentSerializer(comment)

        # JSON 응답 반환
        return Response(serializer.data)



# =========================================================
# 댓글 목록 조회 API
# GET /interaction/comment/<todo_id>/
# =========================================================
class TodoCommentListAPIView(APIView):

    def get(self, request, todo_id):

        # Todo 객체 조회
        todo = get_object_or_404(Todo, id=todo_id)

        # 해당 Todo의 댓글 목록 조회
        # 최신 댓글이 먼저 나오도록 정렬
        comments = TodoComment.objects.filter(
            todo=todo
        ).order_by("-created_at")

        # 댓글 목록을 serializer로 변환
        serializer = TodoCommentSerializer(
            comments,
            many=True   # 여러 개 객체이기 때문에 many=True
        )

        # JSON 응답 반환
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
---
흐름도
```
[클라이언트 요청]

        ↓

[Router → TodoViewSet 연결]

        ↓

[Permission 검사]
AllowAny  → 조회 가능
IsAuthenticated → 좋아요/북마크/댓글 가능

        ↓

[Todo 데이터 조회]
Todo.objects.all()

        ↓

[요청 종류 판단]

 ┌───────────────┬───────────────┬───────────────┬───────────────┐
 │ 목록조회       │ 좋아요         │ 북마크         │ 댓글작성       │
 │ GET /todos/   │ POST /like/   │ POST /bookmark│ POST /comments│
 └───────────────┴───────────────┴───────────────┴───────────────┘

        ↓

[데이터 처리]

목록 → serializer → pagination  
좋아요 → get_or_create → 토글  
북마크 → get_or_create → 토글  
댓글 → content 저장

        ↓

[결과 JSON 반환]

{
  data / like_count / bookmark_count / comment_count
}
```


`views/api_views.py`
```python
# ---------------------------------------------------------
# models에서 좋아요 / 북마크 / 댓글 모델 import
# ---------------------------------------------------------
# .. 는 상위 디렉토리를 의미합니다.
# 즉 todo 앱의 models.py 에서 정의된 모델을 가져옵니다.
from ..models import TodoLike, TodoBookmark, TodoComment


# ---------------------------------------------------------
# DRF action / permission import
# ---------------------------------------------------------
# action
# → ViewSet 안에서 "추가 API"를 만들 때 사용하는 데코레이터
# → 기본 CRUD 외에 커스텀 API를 만들 수 있음
#
# permission
# → API 접근 권한을 제어
# → 로그인 필요 / 누구나 가능 등을 설정
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny


# ---------------------------------------------------------
# 기존 APIView CRUD 클래스 (현재 사용하지 않음)
# ---------------------------------------------------------
# 예전에는 아래처럼 APIView를 사용해서
# List / Create / Retrieve / Update / Delete
# 각각 클래스를 따로 만들어야 했습니다.
#
# 하지만 ViewSet을 사용하면
# CRUD가 자동 생성되기 때문에
# 현재는 사용하지 않는 구조입니다.
# ---------------------------------------------------------
class TodoListAPI(APIView):
    pass


class TodoCreateAPI(APIView):
    pass


class TodoRetrieveAPI(APIView):
    pass


class TodoUpdateAPI(APIView):
    pass


class TodoDeleteAPI(APIView):
    pass


# ---------------------------------------------------------
# 핵심 ViewSet
# ---------------------------------------------------------
# ModelViewSet
#
# 아래 CRUD가 자동 생성됩니다.
#
# GET    /todos/          → list
# POST   /todos/          → create
# GET    /todos/{id}/     → retrieve
# PUT    /todos/{id}/     → update
# DELETE /todos/{id}/     → destroy
#
# 즉 CRUD API를 자동으로 만들어주는 클래스입니다.
# ---------------------------------------------------------
class TodoViewSet(viewsets.ModelViewSet):

    # -----------------------------------------------------
    # 기본 queryset
    # -----------------------------------------------------
    # Todo 테이블 전체 데이터를 가져옵니다.
    # created_at 기준으로 최신순 정렬
    queryset = Todo.objects.all().order_by("-created_at")

    # -----------------------------------------------------
    # serializer 지정
    # -----------------------------------------------------
    # 데이터 → JSON 변환
    # JSON → 데이터 검증 및 저장
    serializer_class = TodoSerializer

    # -----------------------------------------------------
    # 기본 permission
    # -----------------------------------------------------
    # AllowAny
    # → 로그인하지 않아도 조회 가능
    #
    # 즉
    # list / retrieve 는 누구나 가능
    permission_classes = [AllowAny]

    # -----------------------------------------------------
    # list API 커스터마이징
    # -----------------------------------------------------
    # 기본 list 응답
    #
    # [
    #   {...},
    #   {...}
    # ]
    #
    # 하지만 JS에서 사용하기 편하도록
    # 아래처럼 응답 구조를 변경했습니다.
    #
    # {
    #   data: [...],
    #   current_page: 1,
    #   page_count: 5,
    #   next: true,
    #   previous: false
    # }
    # -----------------------------------------------------
    def list(self, request, *args, **kwargs):

        # queryset 필터링
        qs = self.filter_queryset(self.get_queryset())

        # pagination 처리
        page = self.paginate_queryset(qs)

        # ---------------------------------------------
        # pagination이 적용된 경우
        # ---------------------------------------------
        if page is not None:

            # serializer 실행
            serializer = self.get_serializer(
                page,
                many=True,
                context={"request": request},
            )

            return Response({
                "data": serializer.data,

                # 현재 페이지
                "current_page": int(request.query_params.get("page", 1)),

                # 전체 페이지 수
                "page_count": self.paginator.page.paginator.num_pages,

                # 다음 페이지 존재 여부
                "next": self.paginator.get_next_link() is not None,

                # 이전 페이지 존재 여부
                "previous": self.paginator.get_previous_link() is not None,
            })

        # ---------------------------------------------
        # pagination이 없는 경우
        # ---------------------------------------------
        serializer = self.get_serializer(
            qs,
            many=True,
            context={"request": request},
        )

        return Response({
            "data": serializer.data,
            "current_page": 1,
            "page_count": 1,
            "next": False,
            "previous": False,
        })

    # -----------------------------------------------------
    # 좋아요 토글 API
    # -----------------------------------------------------
    # URL
    #
    # POST /todo/viewsets/view/<id>/like/
    #
    # detail=True
    # → 특정 Todo 대상 API
    #
    # permission_classes=[IsAuthenticated]
    # → 로그인한 사용자만 가능
    #
    # get_or_create 패턴
    # → 없으면 생성
    # → 있으면 삭제
    #
    # 즉
    # 좋아요 ON / OFF 토글 기능
    # -----------------------------------------------------
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):

        # 현재 Todo 가져오기
        todo = self.get_object()

        # 로그인한 사용자
        user = request.user

        # 좋아요 존재 확인
        obj, created = TodoLike.objects.get_or_create(
            todo=todo,
            user=user
        )

        # 새로 생성된 경우 → 좋아요 ON
        if created:
            liked = True

        # 이미 존재 → 삭제 → 좋아요 OFF
        else:
            obj.delete()
            liked = False

        # 전체 좋아요 개수 계산
        like_count = TodoLike.objects.filter(todo=todo).count()

        # 응답
        return Response({
            "liked": liked,
            "like_count": like_count
        })

    # -----------------------------------------------------
    # 북마크 토글 API
    # -----------------------------------------------------
    # URL
    #
    # POST /todo/viewsets/view/<id>/bookmark/
    #
    # 좋아요와 동일한 구조
    # -----------------------------------------------------
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def bookmark(self, request, pk=None):

        # 현재 Todo
        todo = self.get_object()

        # 로그인 사용자
        user = request.user

        # 북마크 생성 또는 조회
        obj, created = TodoBookmark.objects.get_or_create(
            todo=todo,
            user=user
        )

        # 북마크 ON
        if created:
            bookmarked = True

        # 북마크 OFF
        else:
            obj.delete()
            bookmarked = False

        # 전체 북마크 수
        bookmark_count = TodoBookmark.objects.filter(todo=todo).count()

        return Response({
            "bookmarked": bookmarked,
            "bookmark_count": bookmark_count
        })

    # -----------------------------------------------------
    # 댓글 등록 API
    # -----------------------------------------------------
    # URL
    #
    # POST /todo/viewsets/view/<id>/comments/
    #
    # request.data
    # → 클라이언트에서 보낸 JSON 데이터
    #
    # {
    #   "content": "댓글 내용"
    # }
    # -----------------------------------------------------
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):

        # Todo 가져오기
        todo = self.get_object()

        # 로그인 사용자
        user = request.user

        # 댓글 내용 가져오기
        content = (request.data.get("content") or "").strip()

        # 댓글 내용 검증
        if not content:
            return Response(
                {"detail": "content is required"},
                status=400
            )

        # 댓글 생성
        TodoComment.objects.create(
            todo=todo,
            user=user,
            content=content
        )

        # 댓글 개수 계산
        comment_count = TodoComment.objects.filter(todo=todo).count()

        return Response({
            "comment_count": comment_count
        })
```

`todo/serializers.py`
```python
# ---------------------------------------------------------
# DRF ModelSerializer import
# ---------------------------------------------------------
# ModelSerializer
# → Django 모델을 기반으로 자동으로 serializer를 만들어줍니다.
#
# 즉
# Model → JSON 변환
# JSON → 데이터 검증 및 저장
from rest_framework.serializers import ModelSerializer


# serializers 전체 모듈 import
# → SerializerMethodField 같은 필드를 사용할 때 필요
from rest_framework import serializers


# Todo 모델 import
# → 직렬화할 대상 모델
from .models import Todo


# interaction 앱의 모델 import
# → 좋아요 / 북마크 / 댓글 수 계산에 사용
from interaction.models import TodoLike, TodoBookmark, TodoComment


# ---------------------------------------------------------
# TodoSerializer
# ---------------------------------------------------------
# Todo 모델을 JSON 형태로 변환하는 Serializer
#
# 역할
#
# 1️⃣ Todo 모델 데이터를 JSON으로 변환
# 2️⃣ 추가 정보 계산 (좋아요 수 / 북마크 수 / 댓글 수)
# 3️⃣ 현재 로그인 사용자가 좋아요/북마크 했는지 판단
# ---------------------------------------------------------
class TodoSerializer(ModelSerializer):

    # -----------------------------------------------------
    # username 필드
    # -----------------------------------------------------
    # Todo 모델에는 user FK가 있습니다.
    #
    # user.username 값을 가져와서
    # username이라는 필드로 JSON에 포함합니다.
    #
    # source="user.username"
    # → user 모델의 username 필드를 가져옴
    #
    # read_only=True
    # → 읽기 전용 (입력 불가)
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    # -----------------------------------------------------
    # 좋아요 관련 필드
    # -----------------------------------------------------

    # 좋아요 개수
    like_count = serializers.SerializerMethodField()

    # 현재 사용자가 좋아요 했는지 여부
    is_liked = serializers.SerializerMethodField()

    # -----------------------------------------------------
    # 북마크 관련 필드
    # -----------------------------------------------------

    # 북마크 개수
    bookmark_count = serializers.SerializerMethodField()

    # 현재 사용자가 북마크 했는지 여부
    is_bookmarked = serializers.SerializerMethodField()

    # -----------------------------------------------------
    # 댓글 개수
    # -----------------------------------------------------
    comment_count = serializers.SerializerMethodField()

    # -----------------------------------------------------
    # Serializer Meta 설정
    # -----------------------------------------------------
    class Meta:

        # 어떤 모델을 직렬화할지 지정
        model = Todo

        # JSON으로 변환할 필드 목록
        fields = [

            # 기본 Todo 필드
            "id",
            "name",
            "description",
            "complete",
            "exp",
            "image",
            "created_at",

            # 사용자 정보
            "user",
            "username",

            # 공개 여부
            "is_public",

            # 좋아요 관련
            "like_count",
            "is_liked",

            # 북마크 관련
            "bookmark_count",
            "is_bookmarked",

            # 댓글 수
            "comment_count",
        ]

        # 읽기 전용 필드
        # → 클라이언트에서 수정 불가
        read_only_fields = ["user"]

    # -----------------------------------------------------
    # 현재 로그인 사용자 가져오는 함수
    # -----------------------------------------------------
    # serializer는 request 객체를 직접 접근할 수 없기 때문에
    # context를 통해 request를 전달받습니다.
    #
    # view에서
    #
    # serializer = TodoSerializer(..., context={"request": request})
    #
    # 이렇게 전달됩니다.
    #
    # 이 함수는
    # 로그인된 사용자를 반환합니다.
    def _user(self):

        # serializer context에서 request 가져오기
        request = self.context.get("request")

        # 로그인 상태 확인
        if request and request.user.is_authenticated:
            return request.user

        # 로그인 안 된 경우
        return None

    # -----------------------------------------------------
    # 좋아요 개수 계산
    # -----------------------------------------------------
    # SerializerMethodField는
    #
    # get_필드명
    #
    # 형식의 함수가 필요합니다.
    #
    # 즉
    # like_count → get_like_count
    def get_like_count(self, obj):

        # TodoLike 테이블에서
        # 해당 todo의 좋아요 개수 계산
        return TodoLike.objects.filter(todo=obj).count()

    # -----------------------------------------------------
    # 현재 사용자가 좋아요 눌렀는지 여부
    # -----------------------------------------------------
    def get_is_liked(self, obj):

        # 현재 로그인 사용자
        user = self._user()

        # 로그인 안한 경우
        if not user:
            return False

        # 좋아요 존재 여부 확인
        return TodoLike.objects.filter(
            todo=obj,
            user=user
        ).exists()

    # -----------------------------------------------------
    # 북마크 개수 계산
    # -----------------------------------------------------
    def get_bookmark_count(self, obj):

        return TodoBookmark.objects.filter(
            todo=obj
        ).count()

    # -----------------------------------------------------
    # 현재 사용자가 북마크 했는지 여부
    # -----------------------------------------------------
    def get_is_bookmarked(self, obj):

        # 현재 사용자
        user = self._user()

        if not user:
            return False

        return TodoBookmark.objects.filter(
            todo=obj,
            user=user
        ).exists()

    # -----------------------------------------------------
    # 댓글 개수 계산
    # -----------------------------------------------------
    def get_comment_count(self, obj):

        return TodoComment.objects.filter(
            todo=obj
        ).count()
```

Todo 모델 데이터를 JSON으로 변환하면서  
좋아요 / 북마크 / 댓글 정보를 추가 계산해서 함께 반환하는 역할

응답형태
```json
{
  "id": 1,
  "name": "공부하기",
  "description": "DRF 공부",
  "complete": false,
  "exp": 10,
  "image": null,
  "created_at": "2026-03-04T12:00:00",
  "user": 1,
  "username": "eunice",

  "is_public": true,

  "like_count": 5,
  "is_liked": true,

  "bookmark_count": 3,
  "is_bookmarked": false,

  "comment_count": 8
}
```

---
`ltemplates/todo/list.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<!-- -------------------------------------------------------
  Todo 카드들이 렌더링될 컨테이너
-------------------------------------------------------- -->
<div class="todocontainer"></div>

<!-- -------------------------------------------------------
  페이지네이션 UI
-------------------------------------------------------- -->
<div class="pagination">
    <button id="prevBtn">이전</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">다음</button>
</div>

<!-- -------------------------------------------------------
  Todo 생성 페이지로 이동 버튼
-------------------------------------------------------- -->
<button id="createBtn">Todo 등록하기</button>

<script>
/* =========================================================
   DOM이 완전히 로드되면 실행
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

    /* -------------------------------------------------------
      1) 기본 설정 값
    -------------------------------------------------------- */
    const LOGIN_PAGE_URL = "/login/"; // 토큰 없거나 인증 실패 시 이동할 로그인 페이지
    let currentPage = 1;              // 현재 페이지 번호(페이지네이션용)

    /* -------------------------------------------------------
      2) window.api 존재 확인
      - base.html에서 static/js/api.js를 로드했다고 가정
      - window.api는 axios 인스턴스 같은 역할(요청 보냄)
    -------------------------------------------------------- */
    if (!window.api) {
        console.error("window.api가 없습니다. base.html에서 static/js/api.js가 로드됐는지 확인하세요.");
        alert("설정 오류: api.js가 로드되지 않았습니다.");
        return; // 여기서 멈춤
    }

    /* -------------------------------------------------------
      3) access_token 체크
      - 없으면 로그인 페이지로 보내기
    -------------------------------------------------------- */
    const access = localStorage.getItem("access_token");
    if (!access) {
        console.log("access_token 없음 → 로그인 이동");
        window.location.href = LOGIN_PAGE_URL;
        return;
    }

    /* -------------------------------------------------------
      4) 인증 실패(401/403) 공통 처리 함수
      - 토큰 삭제 → 로그인 이동
      - 모든 API 호출 catch에서 재사용
    -------------------------------------------------------- */
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

    /* -------------------------------------------------------
      5) interaction API 엔드포인트 문자열 생성기
      - todoId만 넣으면 URL이 만들어짐
      - 현재는 interaction 앱 APIView 방식 URL을 사용 중
    -------------------------------------------------------- */
    const InteractionAPI = {
        like: (todoId) => `/interaction/like/${todoId}/`,
        bookmark: (todoId) => `/interaction/bookmark/${todoId}/`,
        comment: (todoId) => `/interaction/comment/${todoId}/`,
        // commentList: (todoId) => `/interaction/comment/${todoId}/list/`, // (필요 시)
    };

    /* =========================================================
      6) 특정 페이지를 서버에서 불러오는 함수
      - GET /todo/viewsets/view/?page=1
      - 응답(JSON) → renderTodos()로 화면 렌더링
      - updatePaginationUI()로 페이지 UI 갱신
    ========================================================= */
    function loadPage(page) {
        window.api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {
                const data = res.data;

                // data.data(커스텀 응답) 또는 data.results(기본 DRF pagination)를 모두 대응
                renderTodos(data.data || data.results || []);

                // 페이지네이션 UI 업데이트
                updatePaginationUI(data);

                // 현재 페이지 저장(서버가 current_page를 주면 그걸 우선 사용)
                currentPage = data.current_page || page;
            })
            .catch(err => {
                handleAuthError(err).catch(() => {});
                console.error("페이지 로드 실패", err.response?.data || err.message);
            });
    }

    /* =========================================================
      7) Todo 목록을 화면에 그리는 함수
      - 서버에서 받은 todos 배열을 받아서 HTML 카드들을 만듦
    ========================================================= */
    function renderTodos(todos) {
        const container = document.querySelector(".todocontainer");
        container.innerHTML = ""; // 기존 내용 초기화

        // 데이터가 없으면 안내 문구 표시
        if (!todos || todos.length === 0) {
            container.innerHTML = "<p>등록된 Todo 없음</p>";
            return;
        }

        // todo 하나씩 카드 생성
        todos.forEach(todo => {
            const div = document.createElement("div");
            div.className = "todo-item";
            div.dataset.id = todo.id; // 추후 클릭/이벤트에서 사용

            /* ---------------------------------------------------
              이미지 URL 처리
              - todo.image가 있고
              - 이미 http로 시작하면 그대로 사용
              - 아니면 현재 도메인을 붙여서 절대 경로로 변환
            ---------------------------------------------------- */
            const imageSrc = todo.image
                ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
                : "";

            /* ---------------------------------------------------
              like/bookmark/comment 관련 값 기본값 처리
              - 서버가 null/undefined를 주는 경우 대비
            ---------------------------------------------------- */
            const likeCount = Number(todo.like_count ?? 0);
            const bookmarkCount = Number(todo.bookmark_count ?? 0);
            const commentCount = Number(todo.comment_count ?? 0);

            const isLiked = Boolean(todo.is_liked ?? false);
            const isBookmarked = Boolean(todo.is_bookmarked ?? false);

            /* ---------------------------------------------------
              카드 내부 HTML 구성
              - 좋아요/북마크/댓글 버튼 UI 포함
              - 댓글 입력박스(comment-box)는 기본 숨김
              - comment-list에 댓글 DOM을 추가할 예정
            ---------------------------------------------------- */
            div.innerHTML = `
                <p><strong>제목:</strong> ${todo.name ?? ""}</p>
                <p><strong>설명:</strong> ${todo.description ?? ""}</p>
                <p><strong>완료 여부:</strong> ${(todo.complete ? "완료" : "미완료")}</p>
                <p><strong>exp:</strong> ${todo.exp ?? 0}</p>
                ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}

                <!-- 액션 버튼 영역 -->
                <div class="todo-actions" style="display:flex; gap:10px; align-items:center; margin-top:10px;">
                    <!-- 좋아요 버튼 -->
                    <button class="btn-like" type="button"
                        data-id="${todo.id}"
                        aria-pressed="${isLiked}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">${isLiked ? "❤️" : "🤍"}</span>
                        <span class="count">${likeCount}</span>
                    </button>

                    <!-- 북마크 버튼 -->
                    <button class="btn-bookmark" type="button"
                        data-id="${todo.id}"
                        aria-pressed="${isBookmarked}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">${isBookmarked ? "🔖" : "📑"}</span>
                        <span class="count">${bookmarkCount}</span>
                    </button>

                    <!-- 댓글 버튼 -->
                    <button class="btn-comment" type="button"
                        data-id="${todo.id}"
                        style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
                        <span class="icon">💬</span>
                        <span class="count">${commentCount}</span>
                    </button>
                </div>

                <!-- 댓글 입력 영역(토글로 보이게 함) -->
                <div class="comment-box" style="display:none; margin-top:10px;">
                    <textarea class="comment-text" rows="3" style="width:100%;"></textarea>
                    <button class="comment-submit" data-id="${todo.id}">등록</button>
                </div>

                <!-- 댓글이 화면에 쌓일 영역 -->
                <div class="comment-list" style="margin-top:8px;"></div>

                <hr>
            `;

            /* ---------------------------------------------------
              카드 클릭 → 상세 페이지 이동
              단, 좋아요/북마크/댓글 영역 클릭은 상세 이동 방지
              (버튼 눌렀는데 detail로 넘어가면 UX가 나쁨)
            ---------------------------------------------------- */
            div.addEventListener("click", (e) => {
                // 버튼/댓글 입력 영역 클릭이면 상세 이동 금지
                if (e.target.closest(".todo-actions") || e.target.closest(".comment-box")) return;

                // 그 외 영역 클릭 시 상세 이동
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            // 컨테이너에 카드 추가
            container.appendChild(div);
        });
    }

    /* =========================================================
      8) 페이지네이션 UI 업데이트
      - 서버 응답 형태가 커스텀일 수도, DRF 기본일 수도 있어서 둘 다 대응
    ========================================================= */
    function updatePaginationUI(data) {
        const current = data.current_page ?? currentPage ?? 1;

        // 커스텀 응답이면 page_count 사용
        // 기본 pagination이면 count/results로 전체 페이지 추정
        const total =
            data.page_count ??
            (typeof data.count === "number" && data.results
                ? Math.ceil(data.count / data.results.length)
                : "?");

        document.getElementById("pageInfo").innerText = `${current} / ${total}`;

        // 서버가 next/previous를 boolean으로 주도록 커스텀 응답에 맞춤
        document.getElementById("prevBtn").disabled = !(data.previous);
        document.getElementById("nextBtn").disabled = !(data.next);
    }

    /* =========================================================
      9) 이벤트 위임 (document 한 곳에서 버튼 클릭 처리)
      - 동적으로 생성된 todo 카드에도 클릭 이벤트가 적용됨
    ========================================================= */
    document.addEventListener("click", async (e) => {

        /* ------------------------
          (1) 좋아요 버튼 처리
        ------------------------- */
        const likeBtn = e.target.closest(".btn-like");
        if (likeBtn) {
            e.stopPropagation(); // 카드 클릭(상세 이동) 막기
            e.preventDefault();

            const todoId = likeBtn.dataset.id;

            try {
                // 서버에 좋아요 토글 요청
                const res = await window.api.post(InteractionAPI.like(todoId));
                const { liked, like_count } = res.data;

                // UI 즉시 반영(아이콘/숫자)
                likeBtn.setAttribute("aria-pressed", String(liked));
                likeBtn.querySelector(".icon").textContent = liked ? "❤️" : "🤍";
                likeBtn.querySelector(".count").textContent = Number(like_count ?? 0);

            } catch (err) {
                handleAuthError(err).catch(() => {});
                console.error("좋아요 실패:", err.response?.data || err.message);
                alert("좋아요 실패");
            }
            return; // 다른 분기 처리 방지
        }

        /* ------------------------
          (2) 북마크 버튼 처리
        ------------------------- */
        const bookmarkBtn = e.target.closest(".btn-bookmark");
        if (bookmarkBtn) {
            e.stopPropagation();
            e.preventDefault();

            const todoId = bookmarkBtn.dataset.id;

            try {
                const res = await window.api.post(InteractionAPI.bookmark(todoId));
                const { bookmarked, bookmark_count } = res.data;

                // UI 반영
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

        /* ------------------------
          (3) 댓글 버튼 클릭 → 입력창 토글
        ------------------------- */
        const commentBtn = e.target.closest(".btn-comment");
        if (commentBtn) {
            e.stopPropagation();
            e.preventDefault();

            const card = commentBtn.closest(".todo-item");
            const box = card.querySelector(".comment-box");

            // display 토글
            box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
            return;
        }

        /* ------------------------
          (4) 댓글 등록 처리
        ------------------------- */
        const submitBtn = e.target.closest(".comment-submit");
        if (submitBtn) {
            e.stopPropagation();
            e.preventDefault();

            const todoId = submitBtn.dataset.id;
            const card = submitBtn.closest(".todo-item");
            const textarea = card.querySelector(".comment-text");
            const content = textarea.value.trim();

            // 빈 댓글 방지
            if (!content) return;

            try {
                // 서버에 댓글 등록 요청
                const res = await window.api.post(InteractionAPI.comment(todoId), { content });
                const saved = res.data; // 서버가 (username, content 등) 응답한다고 가정

                // 1) 화면에 댓글 DOM 추가
                const listEl = card.querySelector(".comment-list");
                const item = document.createElement("div");
                item.className = "comment-item";
                item.style.padding = "6px 0";
                item.innerHTML = `
                    <div style="font-size:14px;">
                        <strong>${saved.username ?? "me"}</strong> : ${saved.content}
                    </div>
                `;
                listEl.prepend(item);

                // 2) 댓글 수 +1 (서버에서 count를 따로 안 주는 경우 대비)
                const countEl = card.querySelector(".btn-comment .count");
                countEl.textContent = Number(countEl.textContent || 0) + 1;

                // 3) 입력창 초기화 + 입력창은 유지(계속 입력하기 편하게)
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

    /* =========================================================
      10) 페이지네이션 버튼 이벤트
    ========================================================= */
    document.getElementById("prevBtn").addEventListener("click", () => {
        // 현재 페이지가 2 이상이면 이전 페이지 로드
        if (currentPage > 1) loadPage(currentPage - 1);
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        // 다음 페이지 로드(서버가 next=false면 버튼이 disabled 됨)
        loadPage(currentPage + 1);
    });

    /* =========================================================
      11) Todo 생성 페이지 이동
    ========================================================= */
    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });

    /* =========================================================
      12) 최초 1페이지 로드
    ========================================================= */
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
  // 액션 버튼(좋아요/북마크/댓글) 클릭이면 상세페이지 이동 금지
  if (e.target.closest(".todo-actions")) return;

  window.location.href = `/todo/detail/${todo.id}/`;
});
```