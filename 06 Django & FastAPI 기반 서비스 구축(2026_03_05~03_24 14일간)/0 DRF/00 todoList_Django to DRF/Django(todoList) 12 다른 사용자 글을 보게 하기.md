✅ 반드시 수정/확인할 파일 (핵심 3개)

1. **`todo/models.py`**
    - (선택) `is_public` 같은 공개 여부 필드 추가할 경우 수정
        
2. **`todo/api_views.py`**
    - ViewSet의 `queryset` 또는 `get_queryset()` 수정
    - 지금 “내 글만” 필터링하고 있다면 → 전체 글로 변경
        
3. **`todo/serializers.py`**
    - 작성자(`user`)를 read_only로 설정했는지 확인
    - 작성자 username을 같이 보여주려면 여기서 필드 추가
        
---
✅ 프론트도 같이 바꿔야 한다면

4. 템플릿 파일 (예: `templates/todo/list.html`)
    - 작성자 username 표시 추가

`medels.py`
```python
# 공개 여부
is_public = models.BooleanField(default=True)
```

`마이그레이션`
```bash
python manage.py makemigrations  
python manage.py migrate
```

`todo/api_views.py`
```python
from django.db.models import Q

# Viewsets CRUD를 하나로 통일
class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]          # 로그인한 사용자만 접근 가능
    pagination_class = TodoListPagination           # 리스트 조회 시 페이지네이션 적용

    # ======================================================
    # 공개글 + 내 글 조회 로직
    # ======================================================
    def get_queryset(self):
        user = self.request.user  # 현재 로그인한 사용자

        return Todo.objects.filter(
            # Q 객체를 사용하여 OR 조건을 생성
            # ---------------------------------------------
            # Q(is_public=True)
            #   → 다른 사용자가 작성한 Todo라도
            #     "공개글(is_public=True)"이면 조회 가능
            #
            # Q(user=user)
            #   → 현재 로그인한 사용자가 작성한 Todo는
            #     공개 여부와 상관없이 모두 조회 가능
            #
            # 즉,
            # "공개글이거나 OR 내가 작성한 글" 을 조회
            Q(is_public=True) | Q(user=user)
        ).order_by("-created_at")  # 최신 글이 먼저 보이도록 정렬
        
    # ======================================================
    # Todo 생성 시 작성자 자동 설정
    # ======================================================
    def perform_create(self, serializer):
        # 프론트에서 user를 보내지 않아도
        # 현재 로그인한 사용자를 작성자로 자동 저장
        # 또한 기본적으로 글을 공개 상태(is_public=True)로 생성
        serializer.save(user=self.request.user, is_public=True)
```

`todo/serializers.py`
```python
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from .models import Todo


class TodoSerializer(ModelSerializer):

    # ======================================================
    # username 필드 추가
    # ======================================================
    # source="user.username"
    # → Todo 모델의 user 필드(User 모델 FK)에서
    #   username 값을 가져와서 serializer에 표시
    #
    # 예:
    # Todo.user.username → username 필드로 출력
    #
    # read_only=True
    # → 클라이언트가 이 값을 수정하거나 생성 시 보내지 못하게 함
    # → 단순히 "조회용 데이터"로만 사용
    #
    # 즉, Todo를 조회할 때 작성자의 username을 같이 보여주기 위한 필드
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Todo

        # ======================================================
        # serializer에서 사용할 필드 목록
        # ======================================================
        # is_public
        # → Todo가 공개글인지 여부
        #
        # username
        # → Todo 작성자의 username (위에서 source로 연결)
        #
        # 실제 프로젝트에서는 보통 id, name, description 같은
        # 기존 Todo 필드들도 함께 포함됩니다.
        fields = [
            "is_public",   # 공개글 여부
            "username",    # 작성자 username (읽기 전용)
        ]
```


✅ 남의 글을 “보이게/안 보이게” 바꾸는 곳 (API 호출 URL)
✅ 남의 글을 “구분해서 표시”하려면 (작성자 표시)

`templates/todo/list.html`
```css
div.innerHTML = `
	<p><strong>작성자:</strong> ${todo.username ?? ""}</p>
```

`list.html`
```js
container.appendChild(div);

// ======================================================
// [추가된 코드]
// 각 Todo 카드(div)를 화면에 추가한 뒤,
// 해당 Todo에 달린 댓글 목록을 서버에서 가져와 표시하기 위해
// loadComments 함수를 호출한다.
// todo.id → 어떤 Todo의 댓글을 가져올지 식별
// div → 댓글을 표시할 카드 DOM 요소
// ======================================================
loadComments(todo.id, div);

});
}


// ======================================================
// [추가된 함수]
// 특정 Todo의 댓글 목록을 서버에서 조회하여
// 해당 Todo 카드에 댓글을 표시하는 함수
// ======================================================
async function loadComments(todoId, card) {

    // Todo 카드 내부에 있는 댓글 표시 영역(.comment-list)을 찾음
    const listEl = card.querySelector(".comment-list");

    // 만약 댓글 표시 영역이 없다면 함수 종료
    // (DOM 구조가 바뀌거나 오류가 있을 때 방어 코드)
    if (!listEl) return;

    // 서버에 댓글 목록 요청
    // 예: /interaction/comment/{todoId}/list/
    const res = await window.api.get(InteractionAPI.commentList(todoId));

    // 서버 응답에서 댓글 데이터 가져오기
    const comments = res.data || [];

    // 기존 댓글 목록 초기화
    listEl.innerHTML = "";

    // 댓글 배열을 순회하면서 화면에 댓글 생성
    comments.forEach(c => {

        // 댓글 DOM 요소 생성
        const item = document.createElement("div");
        item.className = "comment-item";
        item.style.padding = "6px 0";

        // 댓글 내용 표시
        // username → 작성자
        // content → 댓글 내용
        item.innerHTML = `<div style="font-size:14px;">
        <strong>${c.username ?? ""}</strong> : ${c.content ?? ""}
        </div>`;

        // 댓글을 댓글 목록 영역에 추가
        listEl.appendChild(item);
    });
}	
```

`interaction/views.py`
```python
class TodoCommentListAPIView(APIView):

    # ======================================================
    # permission_classes
    # ------------------------------------------------------
    # IsAuthenticated
    # → 로그인한 사용자만 이 API에 접근 가능하도록 설정
    #
    # 즉,
    # 인증되지 않은 사용자가 요청하면
    # DRF가 자동으로 401 Unauthorized 응답을 반환한다.
    # ======================================================
    permission_classes = [IsAuthenticated]

	# GET 요청 처리
    def get(self, request, todo_id):
    ...
```


서버에 현재 로그인 사용자 API 만들기
`accounts/views.py`
```python
class MeAPIView(APIView):

    # ======================================================
    # permission_classes
    # ------------------------------------------------------
    # IsAuthenticated
    # → 로그인(인증)된 사용자만 이 API에 접근할 수 있도록 설정
    #
    # 인증되지 않은 사용자가 요청하면
    # DRF가 자동으로 401 Unauthorized 응답을 반환한다.
    # ======================================================
    permission_classes = [IsAuthenticated]


    # ======================================================
    # GET 요청 처리
    # ------------------------------------------------------
    # 현재 로그인한 사용자의 정보를 반환하는 API
    #
    # request.user
    # → 인증된 사용자 객체(User 모델)
    # → JWT 토큰 인증이 성공하면 자동으로 채워진다.
    # ======================================================
    def get(self, request):

        # Response로 JSON 형태의 사용자 정보를 반환
        return Response({

            # 현재 로그인한 사용자의 고유 ID
            "id": request.user.id,

            # 사용자 이름(username)
            "username": request.user.username,

            # 사용자 이메일
            "email": request.user.email,
        })
```

`accounts/urls.py에 추가`
```python
from .views import  MeAPIView

path("me/", MeAPIView.as_view()),
```

`templates/header.html`
```js
// access 토큰이 존재하는 경우 (즉, 로그인 상태인 경우)
if (access) {

  // ======================================================
  // 기존 코드 삭제
  // ------------------------------------------------------
  // 단순히 "로그인됨"이라고 표시하던 부분을 제거
  // 이제는 실제 로그인한 사용자 정보를 API로 가져와서
  // username을 화면에 표시하도록 변경
  // ======================================================
  // welcomeEl.textContent = "로그인됨";



  // ======================================================
  // 로그인한 사용자 정보 가져오기
  // ------------------------------------------------------
  // /me/ API를 호출하여 현재 로그인한 사용자 정보를 조회
  // (MeAPIView에서 id, username, email을 반환)
  // ======================================================
  try {

    // 서버에 사용자 정보 요청
    const res = await window.api.get("/me/");

    // 응답 데이터에서 사용자 정보 추출
    const user = res.data;

    // 화면에 "username님 환영합니다" 메시지 표시
    // 예: "hong님 환영합니다"
    welcomeEl.textContent = `${user.username}님 환영합니다`;

  } catch (err) {

    // ======================================================
    // 사용자 정보 조회 실패 처리
    // ------------------------------------------------------
    // 토큰이 만료되었거나 인증 오류가 발생했을 가능성
    // ======================================================

    // 콘솔에 오류 출력 (디버깅용)
    console.error("유저 정보 불러오기 실패", err);

    // 로컬스토리지에 저장된 토큰 제거
    // → 인증 상태 초기화
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);

    // 로그인 페이지로 이동
    window.location.href = "/login/";

    return;
  }
}
```

