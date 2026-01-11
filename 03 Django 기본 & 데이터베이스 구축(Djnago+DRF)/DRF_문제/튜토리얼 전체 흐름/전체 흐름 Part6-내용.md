Tutorial 6: ViewSets & Routers에서는 기존의 뷰 클래스들을 `ViewSet`으로 통합하고, URL 구성을 `DefaultRouter`로 자동화하는 방식으로 변경되었습니다.


`UserViewSet`, `SnippetViewSet` 추가 / 기존 뷰들 제거 (`SnippetList`, `SnippetDetail`, `SnippetHighlight`, `UserList`, `UserDetail`, `api_root`)

`snippets/views.py`
```python
from rest_framework import viewsets, permissions, renderers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from snippets.models import Snippet
from snippets.serializers import SnippetSerializer, UserSerializer
from snippets.permissions import IsOwnerOrReadOnly


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class SnippetViewSet(viewsets.ModelViewSet):
    queryset = Snippet.objects.all()
    serializer_class = SnippetSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    @action(detail=True, renderer_classes=[renderers.StaticHTMLRenderer])
    def highlight(self, request, *args, **kwargs):
        snippet = self.get_object()
        return Response(snippet.highlighted)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
```

의사코드: UserViewSet
```python
이 클래스는 사용자(User) 데이터를 조회만 가능하게 만든다.
→ 모든 사용자 목록을 보여주거나 (GET /users/)
→ 특정 사용자 하나만 조회 가능하다 (GET /users/<pk>/)

ReadOnlyModelViewSet을 사용했기 때문에
- 사용자 추가, 수정, 삭제는 불가능하다.
```

의사코드: SnippetViewSet
```python
이 클래스는 코드 조각(Snippet)에 대한 전체 CRUD 기능을 처리한다.

- 전체 목록 보여주기 (GET /snippets/)
- 새 코드 등록하기 (POST /snippets/)
- 특정 코드 보기 (GET /snippets/<pk>/)
- 수정하기 (PUT/PATCH /snippets/<pk>/)
- 삭제하기 (DELETE /snippets/<pk>/)

---

권한 설정:
- 로그인하지 않은 사용자도 코드 읽기는 가능
- 로그인한 사용자만 코드 작성 가능
- 작성자(owner)만 수정/삭제 가능

---

highlight 메서드:
- GET /snippets/<pk>/highlight/ 요청이 오면,
  → 해당 snippet을 HTML 형식으로 하이라이팅된 코드로 보여줌

---

perform_create 메서드:
- 사용자가 POST 요청으로 새 Snippet을 만들면
  → 요청한 사용자를 자동으로 owner로 지정함
  → 사용자는 JSON에 owner를 넣지 않아도 됨
```

---
기존 뷰 분기 방식 제거 → Router 기반 URL 자동 구성으로 변경

`snippets/urls.py`
```python
from snippets import views

from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('snippets', views.SnippetViewSet, basename='snippet') 
router.register('users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
```
기존에 수동으로 정의했던 `path('snippets/...')`, `path('users/...')`, `api_root` 등은 모두 제거됨

ViewSet + Router 방식
```python
router = DefaultRouter()
router.register('snippets', views.SnippetViewSet, basename='snippet')
```
- 이 한 줄이면 CRUD URL이 자동으로 생성됨
- 뷰도 하나의 `ViewSet` 클래스에 통합 가능
- 더 깔끔하고 재사용성이 높음

`DefaultRouter()`	
	REST API용 URL을 자동으로 만들어주는 도구
`router.register('snippets', views.SnippetViewSet)`
	`/snippets/, /snippets/<pk>/` 같은 URL 자동 생성
`basename = 'snippet'` 
	내부적으로 URL 이름 지을 때 사용 (예: snippet-list, snippet-detail)
`router.register('users', views.UserViewSet)`	
	사용자 관련 URL도 자동 생성




`[test]`
`http://127.0.0.1:8000/snippets/`
`http://127.0.0.1:8000/snippets/1/`
`http://127.0.0.1:8000/users/`
`http://127.0.0.1:8000/users/1/`
`http://127.0.0.1:8000/`
`http://127.0.0.1:8000/snippets/1/highlight/`