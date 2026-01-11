API 루트 View 추가, 하이라이트 View 추가
`snippets/views.py`
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework import renderers

# API의 홈(/)에 접속하면 users, snippets 링크 제공
@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'users': reverse('user-list', request=request, format=format),
        'snippets': reverse('snippet-list', request=request, format=format)
    })

# HTML 하이라이트 뷰 만들기
class SnippetHighlight(generics.GenericAPIView):
    queryset = Snippet.objects.all()
    renderer_classes = [renderers.StaticHTMLRenderer]

    def get(self, request, *args, **kwargs):
        snippet = self.get_object()
        return Response(snippet.highlighted)
```

의사코드:
```python
# DRF에서 제공하는 제네릭 뷰, 권한 기능 사용
from rest_framework import generics, permissions

# Snippet 모델과 사용자 모델, 시리얼라이저 불러오기
from snippets.models import Snippet
from snippets.serializers import SnippetSerializer, UserSerializer
from snippets.permissions import IsOwnerOrReadOnly
from django.contrib.auth.models import User

# 함수형 API 뷰를 만들기 위한 데코레이터와 도구들
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework import renderers
```

Snippet 목록 & 생성 (List + Create)
```python
class SnippetList(generics.ListCreateAPIView):  
    # 전체 Snippet 목록을 보여주거나 새 Snippet을 생성하는 API

    queryset = Snippet.objects.all()  
    # DB에서 모든 Snippet을 가져오도록 설정 (기본 쿼리셋)

    serializer_class = SnippetSerializer  
    # Snippet 데이터를 JSON으로 변환할 때 사용할 시리얼라이저 지정

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  
# 로그인한 사용자만 POST(생성) 가능, 나머지는 누구나 읽기(GET) 가능

    def perform_create(self, serializer):  
    # POST 요청이 왔을 때 자동으로 실행되는 함수 (객체 저장 시 호출됨)
        serializer.save(owner=self.request.user)  
        # 현재 요청을 보낸 사용자를 Snippet의 owner로 저장
```

Snippet 단일 조회, 수정, 삭제 (Retrieve + Update + Destroy)
```python
class SnippetDetail(generics.RetrieveUpdateDestroyAPIView):  
    # 하나의 Snippet을 조회하거나 수정 또는 삭제하는 API

    queryset = Snippet.objects.all()  
    # 조회할 Snippet 데이터

    serializer_class = SnippetSerializer  
    # 데이터 직렬화 방식 지정

    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,  
        # 로그인한 사람만 수정/삭제 가능
        
        IsOwnerOrReadOnly                       
        # 단, 작성자 본인만 수정/삭제 가능
    ]
```

사용자 목록 조회
```python
class UserList(generics.ListAPIView):  
    # 전체 사용자 목록을 조회하는 API (읽기 전용)

    queryset = User.objects.all()  
    serializer_class = UserSerializer  
```

특정 사용자 정보 조회
```python
class UserDetail(generics.RetrieveAPIView):  
    # 특정 사용자의 정보를 가져오는 API (ex. /users/1/)

    queryset = User.objects.all()  
    serializer_class = UserSerializer  
```

🔹 API의 루트(index) 경로 `/` 에 접속 시 보여줄 정보
```python
@api_view(['GET'])  
# GET 요청만 허용하는 함수형 API 뷰

def api_root(request, format=None):  
    # API의 홈에서 보여줄 기본 정보 정의

    return Response({  
        'users': reverse('user-list', request=request, format=format),
        # 'users' 키에 /users/ 경로를 연결

        'snippets': reverse('snippet-list', request=request, format=format)
        # 'snippets' 키에 /snippets/ 경로를 연결
    })
```

🔹 Snippet 코드 하이라이트 전용 HTML API
```python
class SnippetHighlight(generics.GenericAPIView):  
    # 커스텀 로직을 위한 일반 API 뷰 사용

    queryset = Snippet.objects.all()  
    # 모든 Snippet 객체 대상

    renderer_classes = [renderers.StaticHTMLRenderer]  
    # 응답을 HTML로 렌더링(코드 하이라이트 용도)

    def get(self, request, *args, **kwargs):  
        # GET 요청이 오면 실행됨

        snippet = self.get_object()  
        # URL에서 전달받은 pk에 해당하는 snippet 객체 가져오기

        return Response(snippet.highlighted)  
        # 하이라이트된 HTML 코드 응답으로 반환
```

---
`HyperlinkedModelSerializer`로 변경, 하이라이트 필드 및 URL 필드 추가
`snippets/serializers.py`
```python
from rest_framework import serializers
from snippets.models import Snippet
from django.contrib.auth.models import User

class SnippetSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    highlight = serializers.HyperlinkedIdentityField(view_name='snippet-highlight', format='html')

    class Meta:
        model = Snippet
        fields = ['url', 'id', 'highlight', 'owner', 'title', 'code', 'linenos', 'language', 'style']


class UserSerializer(serializers.HyperlinkedModelSerializer):
    snippets = serializers.HyperlinkedRelatedField(
        many=True,
        view_name='snippet-detail',
        read_only=True
    )

    class Meta:
        model = User
        fields = ['url', 'id', 'username', 'snippets']
```

의사코드:
```python
# SnippetSerializer 클래스를 만든다. HyperlinkedModelSerializer를 상속받는다.
class SnippetSerializer(serializers.HyperlinkedModelSerializer):

    # 작성자 필드를 추가한다. 입력은 안 받고, 보여주기만 한다.
    # owner는 Snippet의 owner.username 값을 가져와서 출력한다.
    owner = serializers.ReadOnlyField(source='owner.username')

# highlight 필드를 추가한다.
# 이 필드는 이 Snippet의 하이라이트된 HTML 보기를 위한 링크를 제공한다.
    # 'snippet-highlight'라는 URL name을 가진 뷰와 연결된다.
    highlight = serializers.HyperlinkedIdentityField(
        view_name='snippet-highlight',
        format='html'
    )
	
# 이 시리얼라이저에서 어떤 모델을 다룰지, 어떤 필드를 사용할지 정의한다.
    class Meta:
        model = Snippet  # Snippet 모델을 사용한다.
        fields = [
            'url',        # 이 Snippet 객체의 전체 URL
            'id',         # 고유 ID
            'highlight',  # 하이라이트 보기용 링크
            'owner',      # 작성자 이름 (username)
            'title',      # 제목
            'code',       # 코드 내용
            'linenos',    # 줄 번호 표시 여부
            'language',   # 코드 언어
            'style'       # 하이라이트 스타일
        ]

# UserSerializer 클래스를 만든다. HyperlinkedModelSerializer를 상속받는다.
class UserSerializer(serializers.HyperlinkedModelSerializer):

# 이 사용자가 작성한 모든 Snippet을 보여주는 필드를 추가한다.
# 여러 개의 Snippet을 가질 수 있으므로 many=True
# 각 Snippet은 snippet-detail이라는 뷰 이름을 가진 링크로 표현된다.
    snippets = serializers.HyperlinkedRelatedField(
        many=True,
        view_name='snippet-detail',
        read_only=True  
        # 사용자 정보로부터 읽기만 가능, 직접 추가/수정은 못 함
    )

    # 이 시리얼라이저에서 어떤 모델과 필드를 다룰지 정의한다.
    class Meta:
        model = User  # User 모델을 사용한다.
        fields = [
            'url',       # 사용자 본인의 전체 URL
            'id',        # 사용자 ID
            'username',  # 사용자 이름
            'snippets'   # 이 사용자가 작성한 Snippet 링크 목록
        ]
```

----
모든 URL에 이름(`name=...`) 추가, API 루트 및 하이라이트 경로 추가
`snippets/urls.py`
```python
from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from snippets import views

urlpatterns = format_suffix_patterns([
    path('snippets/', views.SnippetList.as_view(), name='snippet-list'),
    path('snippets/<int:pk>/', views.SnippetDetail.as_view(), name='snippet-detail'),
    path('users/', views.UserList.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetail.as_view(), name='user-detail'),
	
	path('', views.api_root),
    path('snippets/<int:pk>/highlight/', views.SnippetHighlight.as_view(), name='snippet-highlight'),
])
```


| URL 패턴                           | name                  | 영향 받는 곳                                                   |
| -------------------------------- | --------------------- | --------------------------------------------------------- |
| `'snippets/'`                    | `'snippet-list'`      | `reverse('snippet-list')` 또는 `HyperlinkedRelatedField`    |
| `'snippets/<int:pk>/'`           | `'snippet-detail'`    | `view_name='snippet-detail'`                              |
| `'users/'`                       | `'user-list'`         | `UserSerializer`에서 `reverse('user-list')`                 |
| `'users/<int:pk>/'`              | `'user-detail'`       | `view_name='user-detail'`                                 |
| `'snippets/<int:pk>/highlight/'` | `'snippet-highlight'` | `HyperlinkedIdentityField(view_name='snippet-highlight')` |
| `'/'`                            | 없음                    | 직접 reverse로 참조 (예: `api_root`)                            |




`tutorial/settings.py` 페이지네이션 설정 추가
```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_PERMISSION_CLASSES': [
    'rest_framework.permissions.AllowAny',
  ]
}
```
