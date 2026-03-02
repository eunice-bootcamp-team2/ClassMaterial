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
    # queryset = Todo.objects.all().order_by("-created_at")
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]          # ✅ 로그인한 사람만
    pagination_class = TodoListPagination           # ✅ 페이지네이션 연결

    # def get_queryset(self):
    #     # ✅ 내 Todo만 조회
    #     return Todo.objects.filter(user=self.request.user).order_by("-created_at")
    
    def get_queryset(self):
        user = self.request.user
        return Todo.objects.filter(
            Q(is_public=True) | Q(user=user)
        ).order_by("-created_at")
```

`todo/serializers.py`
```python
class TodoSerializer(ModelSerializer):
    
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:	
		# 추가
        fields = ["is_public", "username"]
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
	
	//위의 코드 아래에 이코드 추가
	loadComments(todo.id, div);
  });
}

	// 이함수 추가
    async function loadComments(todoId, card) {
        const listEl = card.querySelector(".comment-list");
        if (!listEl) return;

        const res = await window.api.get(InteractionAPI.commentList(todoId));
        const comments = res.data || [];

        listEl.innerHTML = "";
        comments.forEach(c => {
            const item = document.createElement("div");
            item.className = "comment-item";
            item.style.padding = "6px 0";
            item.innerHTML = `<div style="font-size:14px;">
            <strong>${c.username ?? ""}</strong> : ${c.content ?? ""}
            </div>`;
            listEl.appendChild(item);
        });
        }
```

`interaction/views.py`
```python
class TodoCommentListAPIView(APIView):
    permission_classes = [IsAuthenticated] # 추가

    def get(self, request, todo_id):
    ...
```


서버에 현재 로그인 사용자 API 만들기
`accounts/views.py`
```python
class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "username": request.user.username,
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
  if (access) {
    //welcomeEl.textContent = "로그인됨"; 이부분을 삭제합니다.
    
    // 로그인한 사용자 정보 가져오기 이부분을 추가합니다.
    try {
      const res = await window.api.get("/me/");
      const user = res.data;
      welcomeEl.textContent = `${user.username}님 환영합니다`;
    } catch (err) {
      console.error("유저 정보 불러오기 실패", err);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.location.href = "/login/";
      return;
    }
```

