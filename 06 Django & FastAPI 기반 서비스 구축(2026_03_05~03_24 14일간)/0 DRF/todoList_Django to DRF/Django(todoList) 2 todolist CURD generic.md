CRUD API를 각각 따로 만들었습니다.
즉 기능마다 클래스가 하나씩 존재합니다.
```
TodoListAPI  
TodoCreateAPI  
TodoRetrieveAPI  
TodoUpdateAPI  
TodoDeleteAPI
```

| 기능  | 클래스             | URL           |
| --- | --------------- | ------------- |
| 목록  | TodoListAPI     | /api/list     |
| 생성  | TodoCreateAPI   | /api/create   |
| 조회  | TodoRetrieveAPI | /api/retrieve |
| 수정  | TodoUpdateAPI   | /api/update   |
| 삭제  | TodoDeleteAPI   | /api/delete   |
CRUD가 전부 분리된 구조

---
`todo > urls.py`
```python
from django.urls import path
from . import views

app_name ="todo"

urlpatterns = [
	# path("list/", views.todo_list, name="list"), # 첫 테스트용
	path("list/", views.TodoListView.as_view(), name="list"),
    # 실제 작동용 list
]
```

`todo > views.py` 테스트용
```python
from django.shortcuts import render
from .models import Todo
from django.views import View 
from django.views.generic import ListView


def todo_list(request): #  함수형
    todos = Todo.objects.all()
    return render(request, "todo/todo.html", {"todos": todos})
	
	
class TodoListView(View): # 클래스형
    def get(self, request):
        todos = Todo.objects.all()
        return render(request, "todo/todo.html", {"todos": todos})


class TodoListGenericView(ListView): # 제너릭뷰
    model = Todo
    template_name = "todo/todo.html" # 기본값: todo_list.html
    context_object_name = "todos"   # 기본값: object_list	
```

`todo > serializers.py`
```python
from rest_framework.serializers import ModelSerializer
from .models import Todo

# API 요청 데이터를 모델 객체로 변환하는 변환기
class TodoSerializer(ModelSerializer): 
	class Meta:
		model = Todo
		fields = "__all__" # 모델의 모든 필드를 자동으로 직렬화합니다.
        read_only_fields = ["created_at", "updated_at"] # 읽기만 가능
        
        
        fields = [
	        "id",
            "name",
            "description",
            "complete",
            "exp",
            "completed_at",
            "created_at",
            "updated_at"
        ]
        
        
        exclude = ["created_at", "updated_at"]
        # 모든 필드를 기본 포함시키고 → 특정 필드만 제외하고 싶을 때
        
# 둘중 한개를 사용합니다.
```

Serializer TodoSerializer 클래스의 역할
- 첫번째 역할: 모델 ↔ JSON 변환기 -> 이 클래스 자체가 변환기입니다.
- 두번째 역할: 데이터 검증기 -> 데이터 검사기
```
{  
	"exp":"abc"  
}
이런 요청이 들어오면
exp는 IntegerField이므로 오류 발생을 시킵니다.
```

- 세번째 역할: API 데이터 구조 정의
```
fields = [
    "name",
    "description",
    "complete",
    "exp",
    "completed_at",
    "created_at",
    "updated_at"
]
fields는 Serializer에서 사용할 모델 필드를 정의하는 것입니다.  
즉 API에서 사용할 데이터 구조를 정의합니다.  
이 필드는  
- Model → JSON 응답 생성  
- JSON → Model 데이터 검증 및 저장  
두 과정 모두에서 사용됩니다.

Json에서 이런 데이터가 넘어옵니다.
{
  "name": "운동",
  "description": "스쿼트 50회",
  "complete": false,
  "exp": 10,
  "completed_at": null,
  "created_at": "2026-03-04T10:15:30Z",
  "updated_at": "2026-03-04T10:15:30Z"
}
```
	
- read_only_fields의 역할 : 이건 읽기만 가능 즉 ✔ 응답에는 포함됨, ❌ 요청으로 수정 불가

---
Serializer Meta 옵션의 기본 개념
Serializer의 `Meta` 클래스는 모델의 어떤 필드를 JSON으로 변환할지 정하는 설정 공간입니다.

`fields = "__all__"` 의 의미
```python
fields = "__all__"
```
✔ 모델에 있는 모든 필드 포함  
✔ 자동으로 전부 직렬화
모델에 필드가 10개면 → JSON에도 10개 전부 나옴

`fields = [ ... ]` 리스트 방식
```python
fields = [  
	"name",  
	"description",  
	"complete"  
]
```
✔ 내가 지정한 필드만 포함  
✔ 나머지는 무시
✔ 이 필드들만 JSON에 보여줘

응답(JSON Response)에 미치는 영향
```json
{  
	"name": "운동",  
	"description": "스쿼트",  
	"complete": false,  
	"exp": 10,  
	"completed_at": null,  
	"created_at": "2026-02-21T10:00:00",  
	"updated_at": "2026-02-21T10:00:00"  
}
```

요청(JSON Request)에 미치는 영향
```json
{  
"name": "공부",  
"description": "DRF"  
}
```

created_at / updated_at 관련 핵심
`models.py`
```python
created_at = models.DateTimeField(auto_now_add=True)  
updated_at = models.DateTimeField(auto_now=True)
```
✔ 사용자가 보내는 값 무시됨  
✔ 서버가 자동 생성

그래서 아래처럼 표시해주는것이 좋습니다.
```python
read_only_fields = ["created_at", "updated_at"] # 읽기만 가능
```

`exclude` 의 의미
```python
exclude = ["created_at", "updated_at"]
```
✔ 기본적으로 모든 필드 포함  
✔ 특정 필드만 제외
✔ 다 포함하되 이것만 빼

세개 모두 사용하면 충돌이 일어나므로 설정에 맞게 사용합니다.

---
`mysite/settings.py` : Renderer = 응답을 어떤 형식으로 변환할지 결정하는 장치
```python
REST_FRAMEWORK = {
  "DEFAULT_RENDERER_CLASSES": [
    "rest_framework.renderers.JSONRenderer",
  ],
}
```
	DRF 브라우저용 HTML(Browsable API) 화면을 끄고, 무조건 JSON만 응답하게 만드는 옵션
- 필수 아님. DRF는 기본 설정으로도 Insomnia에 JSON 잘 반환합니다.
- 해두면 좋은 경우: API 서버만 쓸 거고(React/모바일), 브라우저에서 예쁜 DRF 화면 필요 없을 때.

`todo/views.py`
```python
from django.urls import reverse_lazy

# 목록 조회
class TodoListView(ListView):
    model = Todo  # 이 뷰가 사용할 모델 지정 (Todo 테이블 데이터를 조회)

    template_name = "todo/list.html"  
    # 데이터를 보여줄 HTML 템플릿 파일 지정

    context_object_name = "todos"  
    # 템플릿에서 사용할 변수 이름 (기본값 object_list 대신 todos 사용)

    ordering = ['-created_at']  
    # 데이터 정렬 방식 (created_at 기준 내림차순 → 최신 글이 먼저)

    success_url = reverse_lazy('todo:list')  
    # 작업 성공 후 이동할 URL (ListView에서는 보통 사용하지 않지만 설정 가능)
```

`templates/base.html`
```html
{% load static %} 
<!DOCTYPE html>
<html lang="ko">
<body>
	{% block content %}{% endblock %}
</body>
</html>
```

`todo/list.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todocontainer"> 
    {% for todo in todos %}
        <div class="todo-item">
            <p><strong>이름:</strong> {{ todo.name }}</p>
            <p><strong>설명:</strong> {{ todo.description }}</p>
            <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
            <p><strong>작성일:</strong> 
            {{ todo.created_at|date:"Y-m-d H:i" }}</p>
            
            <hr>
        </div>
    {% empty %}
        <p>등록된 할 일이 없습니다.</p>
    {% endfor %}
</div>
<button class="todoCreate" id="createBtn">Todo 등록하기</button>

<script>
  document.addEventListener("DOMContentLoaded", function () {
    console.log("create loading");
  });
		  
	document.getElementById("createBtn").addEventListener
	("click", () => {
		console.log("createBtn click")
	});

</script>
{% endblock %}
```
`("click", () => { ... })` 이 부분은 자바스크립트의 화살표 함수(Arrow Function) 문법입니다.

화살표 함수 문법:
```javascript
() => {
  // 클릭 시 실행할 코드
}
```
- `()` : 매개변수 (없으면 비워둠)
- `=> { ... }` : 함수의 본문
- 화살표 함수는 `function()` 키워드보다 간결한 문법입니다.

동일한 의미의 일반 함수 방식:
```javascript
document.getElementById("createBtn").addEventListener("click", function () {
    window.location.href = "/todo/create/"; # 클릭후 이동할 URL
    console.log("createBtn click");
});
```

---
views폴더로 api와 탬플릿용 views.py를 분리합니다.
```
todo/
│
├── migrations/
│
├── views/                     ✅ views 전용 폴더
│   ├── __init__.py            ✅ 반드시 필요 (폴더 → 모듈 인식)
│   ├── api_views.py           ✅ DRF / JSON 응답 전용
│   └── templates_views.py     ✅ HTML 렌더링 전용 
│   # views.py를 templates_views.py로 이름 변경
│
│
├── templates/
│   └── todo/
│       ├── list.html
│       └── todo.html
│
├── serializers.py             ✅ DRF Serializer
├── models.py                  ✅ Model
├── urls.py                    ✅ URL 연결
├── admin.py
└── apps.py
```

### List 목록보기

`todo/urls.py`
```python
from django.urls import path
from .views.templates_views import TodoListView
from .views.api_views import TodoListAPI

app_name = "todo"

urlpatterns = [
    # path("list/", views.todo_list, name="todo_List"), # 첫 테스트용
    path("list/", TodoListView.as_view(), name="list"),
	
    # api
    path("api/list/", TodoListAPI.as_view(), name="todo_api_list"),
]
```

`todo/api_views.py` 
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..models import Todo # 경로변경
from ..serializers import TodoSerializer # 경로변경

# 전체보기
class TodoListAPI(APIView):
    def get(self, request):  
        # GET 요청이 들어오면 실행되는 함수

        todos = Todo.objects.all()  
        # Todo 모델의 모든 데이터 조회 (QuerySet)

        serializer = TodoSerializer(todos, many=True)  
        # 조회한 Todo 객체들을 Serializer로 JSON 변환 준비
        # many=True → 여러 개의 객체를 변환한다는 의미

        return Response(serializer.data)  
        # serializer.data를 JSON 형태로 변환하여 API 응답으로 반환
```
/todo/list/  전체 Todo 목록 조회
`http://127.0.0.1:8000/todo/api/list/`

Insomnia를 이용한 API JSON 응답 확인
![[Pasted image 20260221135750.png]]

views폴더안에 api_views.py와 templates_views.py로 파일을 넣었으므로 아래와 같이 경로를 변경
`todo/templates_views.py`
```python
from ..models import Todo # 경로 변경
```
---
### Create 글생성하기

`todo/urls.py`
```python
from .views.templates_views import TodoListView, TodoCreateView
from .views.api_views import TodoListAPI, TodoCreateAPI

urlpatterns = [
    # path("list/", views.todo_list, name="todo_List"), # 첫 테스트용
	
    # HTML 렌더링 뷰
    path("list/", TodoListView.as_view(), name="list"),
    path("create/", TodoCreateView.as_view(), name="todo_create"),
	
    # api DRF / JSON 응답 뷰
    path("api/list/", TodoListAPI.as_view(), name="todo_api_list"),
    path("api/create/", TodoCreateAPI.as_view(), name="todo_api_create"),
]
```

`todo/templates_views.py`
```python
from django.views.generic import ListView, CreateView

# 생성
class TodoCreateView(CreateView):
    model = Todo  
    # 이 뷰에서 사용할 모델 (Todo 테이블에 데이터 생성)

    fields = ['name', 'description', 'complete', 'exp']  
    # HTML form에서 입력받을 모델 필드 정의

    template_name = "todo/create.html"  
    # Todo 생성 화면에 사용할 템플릿 파일

    success_url = reverse_lazy('todo:list')  
    # 생성이 성공하면 이동할 URL (todo 목록 페이지)
```

`todo/api_views.py`
```python
# 생성하기
# 생성하기
class TodoCreateAPI(APIView):

    def post(self, request):
        # POST 요청이 들어오면 실행되는 함수 (데이터 생성 요청)

        serializer = TodoSerializer(data=request.data)
        # 요청(request)으로 들어온 JSON 데이터를 Serializer에 전달

        serializer.is_valid(raise_exception=True)
        # 데이터 유효성 검사 수행
        # 잘못된 데이터가 있으면 자동으로 400 에러 발생

        todo = serializer.save()
        # 검증된 데이터를 Todo 모델에 저장 (DB에 새로운 데이터 생성)

        return Response(
            TodoSerializer(todo).data,
            status=status.HTTP_201_CREATED
        )
        # 생성된 Todo 객체를 다시 Serializer로 JSON 변환 후 응답
        # HTTP 상태코드 201 (생성 성공)
```

```json
{
	"name":"2026년 2월 21일 세번째 할일",
	"description":"세번째 할일은 임솜니아로 테스트를 하는 일입니다",
	"complete":"true",
	"exp":"10"
}
```

Insomnia로  새로운 Todo 생성
`POST` `http://127.0.0.1:8000/todo/api/create/`

`테스트 데이터 Imsomnia`
```
{
	"name": "2026년 2월 21일 세번째 할일",
	"description": "세번째 할일은 임솜니아로 테스트하는 일입니다.",
	"complete": true,
	"exp": 10
}
```

![[Pasted image 20260221143717.png]]

models.py
```python
name = models.CharField(max_length=100) description = models.TextField(blank=True) complete = models.BooleanField(default=False) exp = models.PositiveIntegerField(default=0) completed_at = models.DateTimeField(null=True, blank=True) created_at = models.DateTimeField(auto_now_add=True) updated_at = models.DateTimeField(auto_now=True)
```

| 옵션           | 적용 위치                  | 의미            |
| ------------ | ---------------------- | ------------- |
| `null=True`  | DB(데이터베이스)             | 값이 없어도 저장 허용  |
| `blank=True` | 입력/검증(Serializer/Form) | 입력 안 해도 유효 처리 |
null=True 의미:
✔ 데이터베이스 컬럼에 NULL 저장 허용  
✔ 값이 없어도 DB 에러 없음
❌ null 옵션 없으면 → DB 값 필요

blank 옵션 기준
✔ blank=True → 입력 안 해도 됨  
❌ blank 옵션 없으면 → 입력 필수

---
글쓰기 생성
`templates/list.html` 클릭해서 create.html로 이동할수 있도록 클릭이벤트를 수정합니다.
```js
document.getElementById("createBtn").addEventListener(  
"click", () => {  
  
window.location.href = "/todo/create/";  
// createBtn 버튼을 클릭하면 Todo 생성 페이지로 이동  
  
console.log("createBtn click");  
// 버튼 클릭이 발생했는지 확인하기 위한 콘솔 출력  
});
```

`templates/create.html`
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
      <textarea name="description" id="description">
      </textarea>
    </div>

    <div>
      <label for="complete">Complete:</label>
      <input type="checkbox" name="complete" id="complete">
    </div>

    <div>
      <label for="exp">Experience Points:</label>
      <input type="number" name="exp" id="exp" min="0">
    </div>

    <button type="submit" id="todoCreate">Create</button>
</div>

<script>
  document.addEventListener("DOMContentLoaded", function () {
    console.log("create loading")
  });
</script>
{% endblock %}
```

글을 생성할수 있게 자바스크립트를 수정합니다.
```js
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<!-- axios 라이브러리 CDN 로드 (HTTP 요청을 쉽게 보내기 위한 라이브러리) -->

<script>
const api = axios.create({
  baseURL: "/", 
  // 모든 API 요청의 기본 URL

  headers: {
    "Content-Type": "application/json",
    // 서버로 보낼 데이터 형식 지정 (JSON)
  }
});

// CSRF 자동 주입 (Django 필수)
api.interceptors.request.use(config => {

  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrftoken"))
    ?.split("=")[1];
  // 브라우저 쿠키에서 csrftoken 값을 찾기

  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
    // Django가 요구하는 CSRF 토큰을 요청 헤더에 자동 추가
  }

  return config;
  // 수정된 요청 설정 반환
});


document.getElementById("todoCreate").addEventListener("click", async () => {
  // todoCreate 버튼 클릭 시 실행

  try { // 에러가 발생할 수 있는 코드를 실행하는 영역

    const res = await api.post("todo/api/create/", {
      // Todo 생성 API로 POST 요청 전송
      // 비동기 작업이 끝날 때까지 기다림, 서버 응답이 올 때까지 기다린 후 다음 코드 실행

      name: document.getElementById("name").value,
      // 입력한 Todo 이름

      description: document.getElementById("description").value,
      // 입력한 설명

      complete: document.getElementById("complete").checked,
      // 체크박스 상태 (true / false)

      exp: Number(document.getElementById("exp").value || 0)
      // 경험치 입력값 (숫자로 변환, 없으면 0)
    });

    console.log(res.data);
    // 서버에서 받은 응답 데이터 출력

    // 글 저장 후 메인페이지 이동
    window.location.href = "/todo/list/";

  } catch (err) { // 에러가 발생했을 때 처리하는 영역
    console.error(err.response?.data || err.message);
    // 에러 발생 시 콘솔에 에러 출력
  }
});
</script>
```

자바스크립트의 아래 코드가
```js
name: document.getElementById("name").value,
// id가 "name"인 입력칸의 값을 가져와서 name 필드에 저장

description: document.getElementById("description").value,
// id가 "description"인 입력칸의 값을 가져와서 description 필드에 저장

complete: document.getElementById("complete").checked,
// id가 "complete"인 체크박스의 체크 상태(true / false)를 가져와서 complete에 저장

exp: Number(document.getElementById("exp").value || 0)
// id가 "exp"인 입력값을 숫자로 변환
// 값이 비어있으면(빈 문자열) 0으로 처리
```

이런 JSON을 만들어냅니다.
```json
{
  "name": "운동",
  "description": "스쿼트",
  "complete": false,
  "exp": 10
}
```

특히 exp 이부분의 해석은
```js
exp: Number(document.getElementById("exp").value || 0)
```
입력값이 비어있으면 0을 사용하라는 뜻으로 `||` 이건 or 논리 연산자 입니다.

----
### Retrieve 상세보기

`todo/urls.py`
```python
from .views.templates_views import TodoDetailView # 추가
from .views.api_views import TodoRetrieveAPI # 추가

# 탬플릿View
path("detail/<int:pk>/", TodoDetailView.as_view(), name="todo_Detail"),

# APIView
path("api/retrieve/<int:pk>/", TodoRetrieveAPI.as_view(), name="todo_api_retrieve"),
```

`todo/views/templates_views.py`
```python
# 상세보기
class TodoDetailView(DetailView):
    model = Todo  
    # 이 뷰에서 사용할 모델 지정 (Todo 테이블의 특정 데이터 조회)

    template_name = "todo/detail.html"  
    # 조회한 데이터를 보여줄 HTML 템플릿 파일

    context_object_name = "todo"  
    # 템플릿에서 사용할 변수 이름
    # 기본값 object 대신 todo라는 이름으로 전달됨
```

`todo/views/api_views.py`
```python
from django.views.generic import DetailView  
# Django에서 상세 페이지를 만들 때 사용하는 제네릭 뷰

# 상세보기 API
class TodoRetrieveAPI(APIView):

    def get(self, request, pk):
        # GET 요청이 들어오면 실행되는 함수
        # pk는 URL에서 전달된 Todo의 기본키(id)

        try:
            todo = Todo.objects.get(pk=pk)
            # pk 값에 해당하는 Todo 데이터를 DB에서 조회

        except Todo.DoesNotExist:
            # 해당 pk의 Todo가 존재하지 않을 경우 실행

            return Response(
                {"error": "해당하는 todo가 없습니다."},
                # 에러 메시지를 JSON 형태로 반환

                status=status.HTTP_404_NOT_FOUND
                # HTTP 상태코드 404 (데이터 없음)
            )

        serializer = TodoSerializer(todo)
        # 조회한 Todo 객체를 Serializer로 JSON 변환 준비

        return Response(serializer.data)
        # 변환된 데이터를 JSON 응답으로 반환
```

`templates/todo/detail.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todoDetail"></div>
<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

<script>
</script>
{% endblock %}
```

/todo/retrieve/<int:pk>/  특정 Todo 상세 조회
`http://127.0.0.1:8000/todo/api/retrieve/1/`
`TodoRetrieveAPI` `GET`

![[Pasted image 20260221153403.png]]

---
list.html에서 작성한 리스트글을 클릭하면 상세페이지로 이동시키기
`templates/list.html`
```html
<script>
  document.addEventListener("DOMContentLoaded", function () {
    // HTML 문서가 모두 로드된 후 실행되는 코드

    console.log("create loading");
    // 페이지가 정상적으로 로드되었는지 확인하는 콘솔 출력
    
    // class가 "todo-item"인 모든 요소들을 선택
    const items = document.querySelectorAll(".todo-item");

    // 선택된 요소들을 하나씩 반복 처리
    items.forEach(item => {

        // 각 todo-item에 클릭 이벤트 추가
        item.addEventListener("click", () => {

            const todoId = item.dataset.id;
            // HTML의 data-id 속성 값을 가져옴 (todo의 pk 값)

            window.location.href = `/todo/detail/${todoId}/`;
            // 해당 pk를 사용하여 상세 페이지로 이동
        });
    });
		  
    document.getElementById("createBtn").addEventListener("click", () => {
        // id가 createBtn인 버튼 클릭 이벤트

        window.location.href = "/todo/create/";
        // Todo 생성 페이지로 이동

        console.log("createBtn click");
        // 버튼 클릭 확인용 콘솔 출력
    });

});
</script>
```

pk를 가진 상세페이지로 이동시킨 결과
![[Pasted image 20260221155905.png]]

`templates/todo/detail.html` 
```html
{% extends "base.html" %}
{% block content %}

<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>
</div>

<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

{% endblock %}
```
	상세페이지에 데이터를 불러옵니다.

---
### 수정하기 Update

`todo/views/api_view.py`
```python
# 수정하기 API
class TodoUpdateAPI(APIView):

    def put(self, request, pk):
        # PUT 요청 → 전체 수정 (모든 필드를 다시 보내야 함)

        try:
            todo = Todo.objects.get(pk=pk)
            # pk에 해당하는 Todo 데이터 조회

        except Todo.DoesNotExist:
            # 해당 Todo가 존재하지 않을 경우

            return Response(
                {"error": "해당하는 todo가 없습니다."},
                # 에러 메시지를 JSON 형태로 반환

                status=status.HTTP_404_NOT_FOUND
                # HTTP 상태코드 404 반환
            )

        serializer = TodoSerializer(todo, data=request.data)
        # 기존 Todo 객체 + 요청 데이터(request.data)를 Serializer에 전달
        # 전체 데이터를 기준으로 수정

        serializer.is_valid(raise_exception=True)
        # 데이터 유효성 검사 (문제 있으면 400 에러 발생)

        todo = serializer.save()
        # 검증된 데이터로 Todo 객체 업데이트

        serializer = TodoSerializer(todo)
        # 수정된 Todo 객체를 다시 Serializer로 변환

        return Response(serializer.data)
        # 수정된 데이터를 JSON 형태로 응답



    def patch(self, request, pk):
        # PATCH 요청 → 부분 수정 (일부 필드만 수정 가능)

        try:
            todo = Todo.objects.get(pk=pk)
            # pk에 해당하는 Todo 데이터 조회

        except Todo.DoesNotExist:
            # 해당 Todo가 존재하지 않을 경우

            return Response(
                {"error": "해당하는 todo가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
                # HTTP 상태코드 404 반환
            )

        serializer = TodoSerializer(todo, data=request.data, partial=True)
        # partial=True → 일부 필드만 보내도 수정 가능

        serializer.is_valid(raise_exception=True)
        # 데이터 유효성 검사

        todo = serializer.save()
        # 수정된 데이터 DB 저장

        serializer = TodoSerializer(todo)
        # 수정된 객체를 JSON 변환

        return Response(serializer.data)
        # 수정된 데이터 응답
```

`todo/urls.py`
```python
from .views.api_views import TodoUpdateAPI # 추가

path("api/update/<int:pk>/", TodoUpdateAPI.as_view(), name="todo_api_update"),
```

update 수정하기 api가 잘 구동되는지 Insomnia로 테스트 합니다.
```json
	{
		"id": 1,
		"name": "2026년 2월 21일 첫번째 할일을 수정합니다.",
		"description": "오늘은 Todo list를 테스트 하는 첫날입니다를 수정합니다.",
		"complete": true,
		"exp": 20
	}
```

`TodoUpdateAPI`  `PATCH` or `PUT`
`http://127.0.0.1:8000/todo/api/update/1/`
![[Pasted image 20260221161245.png]]
정상적으로 수정된 것을 확인합니다.

---
탬플릿 update도 추가합니다.

`todo/templates_views.py`
```python
from django.views.generic import UpdateView  
# Django에서 데이터 수정 화면을 만들 때 사용하는 제네릭 뷰

# 수정하기 화면(View)
class TodoUpdateView(UpdateView):
    model = Todo
    # 수정할 대상 모델 (Todo 테이블의 데이터를 수정)

    fields = ['name', 'description', 'complete', 'exp']
    # 수정할 때 사용할 모델 필드
    # 이 필드들을 기반으로 HTML form이 자동 생성됨

    template_name = "todo/update.html"
    # 수정 화면에 사용할 HTML 템플릿 파일

    context_object_name = "todo"
    # 템플릿에서 사용할 변수 이름
    # 기본값 object 대신 todo로 전달됨

    success_url = reverse_lazy('todo:list')
    # 수정이 성공하면 이동할 URL (todo 목록 페이지)
```

`todo/urls.py`
```python
from .views.templates_views import TodoUpdateView # 추가

path("update/<int:pk>/", TodoUpdateView.as_view(), name="todo_Update"),
```

detail.html : 수정 버튼 클릭 시 update로 이동
```html
<script>
document.addEventListener("DOMContentLoaded", () => {
  // HTML 문서가 모두 로드된 후 실행되는 코드

  const todoId = "{{ todo.id }}";
  // Django 템플릿에서 전달된 todo의 id(pk)를 JavaScript 변수에 저장

  // 수정 버튼
  const updateBtn = document.querySelector(".todoUpdate");
  // class가 "todoUpdate"인 수정 버튼 요소 선택

  updateBtn.addEventListener("click", () => {
    // 수정 버튼 클릭 이벤트

    window.location.href = `/todo/update/${todoId}/`;
    // 해당 todo의 수정 페이지로 이동
  });

  // 삭제는 나중에 연결 (DeleteView 또는 API와 연결 예정)
});
</script>
```

`templates/todo/update.html`
```html
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

  <button type="button" id="todoUpdate">저장</button>
  <button type="button" onclick="history.back()">취소</button>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script>
const api = axios.create({
  baseURL: "/",
  // axios 인스턴스 생성 (모든 API 요청의 기본 URL 설정)
  // Content-Type을 따로 지정하지 않음 → FormData 사용 시 axios가 자동으로 multipart/form-data 설정
});

// CSRF 토큰 자동 추가 (Django 보안 필수)
api.interceptors.request.use(config => {

  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrftoken"))
    ?.split("=")[1];
  // 브라우저 쿠키에서 csrftoken 값을 찾아서 추출

  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
    // Django에서 요구하는 CSRF 토큰을 요청 헤더에 추가
  }

  return config;
  // 수정된 요청 설정 반환
});


const todoId = "{{ todo.id }}";
// Django 템플릿에서 전달된 todo의 id(pk)를 JavaScript 변수로 저장


document.getElementById("todoUpdate").addEventListener("click", async () => {
  // id가 todoUpdate인 버튼을 클릭하면 실행

  try {

    const formData = new FormData();
    // FormData 객체 생성 (폼 데이터를 서버로 전송하기 위한 객체)

    formData.append("name", document.getElementById("name").value);
    // name 입력값을 FormData에 추가

    formData.append("description", document.getElementById("description").value);
    // description 입력값을 FormData에 추가

    formData.append("complete", document.getElementById("complete").checked);
    // 체크박스 상태(true / false)를 complete 값으로 추가

    formData.append("exp", document.getElementById("exp").value || 0);
    // exp 입력값 추가 (값이 없으면 0으로 설정)

    const res = await api.patch(`/todo/viewsets/view/${todoId}/`, formData);
    // PATCH 요청으로 Todo 데이터 수정 API 호출
    // formData를 서버로 전송하여 일부 필드만 수정

    console.log(res.data);
    // 서버에서 반환된 수정된 데이터 콘솔 출력

    window.location.href = `/todo/detail/${todoId}/`;
    // 수정이 완료되면 해당 Todo의 상세 페이지로 이동

  } catch (err) {
    console.error(err.response?.data || err.message);
    // 오류 발생 시 에러 메시지를 콘솔에 출력

    alert("수정 실패");
    // 사용자에게 수정 실패 알림 표시
  }
});
</script>

{% endblock %}
```

수정이 잘 되는지 확인하세요.
![[Pasted image 20260221163728.png]]

---
### 삭제하기

`todo/views/api_views.py`
```python
# 삭제하기 API
class TodoDeleteAPI(APIView):

    def delete(self, request, pk):
        # DELETE 요청이 들어오면 실행되는 함수
        # pk는 URL로 전달된 Todo의 기본키(id)

        try:
            todo = Todo.objects.get(pk=pk)
            # pk에 해당하는 Todo 데이터를 DB에서 조회

        except Todo.DoesNotExist:
            # 해당 Todo가 존재하지 않을 경우 실행

            return Response(
                {"error": "해당하는 todo가 없습니다."},
                # 에러 메시지를 JSON 형태로 반환

                status=status.HTTP_404_NOT_FOUND
                # HTTP 상태코드 404 (데이터 없음)
            )

        todo.delete()
        # 조회한 Todo 데이터를 DB에서 삭제

        return Response(status=status.HTTP_204_NO_CONTENT)
        # 삭제 성공 시 응답 반환 (204 = 성공했지만 반환할 데이터 없음)
```

`todo/urls.py`
```python
from .views.api_views import TodoDeleteAPI # 추가

path("api/delete/<int:pk>/", TodoDeleteAPI.as_view(), name="todo_api_delete"),
```

`http://127.0.0.1:8000/todo/api/delete/1/`
`TodoDeleteAPI`  `DELETE
![[Pasted image 20260221164314.png]]

정말 pk1이 삭제되었는지 확인합니다
![[Pasted image 20260221164341.png]]


삭제하기 탬플릿 수정

`templates/todo/detail.html`
```html
<script>
document.addEventListener("DOMContentLoaded", () => {
  // HTML 문서가 모두 로드된 후 실행

  const todoId = "{{ todo.id }}";
  // Django 템플릿에서 전달된 todo의 id(pk)를 JS 변수에 저장

  // 기존 수정 버튼
  const updateBtn = document.querySelector(".todoUpdate");
  // class가 todoUpdate인 버튼 선택

  updateBtn.addEventListener("click", () => {
    // 수정 버튼 클릭 시 실행
    window.location.href = `/todo/update/${todoId}/`;
    // 해당 todo의 수정 페이지로 이동
  });

  // 삭제 버튼
  const deleteBtn = document.querySelector(".todoDelete");
  // class가 todoDelete인 버튼 선택

  deleteBtn.addEventListener("click", async () => {
    // 삭제 버튼 클릭 시 실행

    const ok = confirm("정말 삭제하시겠습니까?");
    // 사용자에게 삭제 여부 확인 창 표시

    if (!ok) return;
    // 취소를 누르면 삭제 진행하지 않음

    try {
      const res = await fetch(`/todo/api/delete/${todoId}/`, {
        // DELETE 요청으로 Todo 삭제 API 호출
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
          // 서버에 JSON 형식 요청임을 알림
        }
      });

      if (!res.ok) throw new Error("삭제 실패");
      // 응답이 정상적이지 않으면 에러 발생

      // 삭제 성공 시 Todo 목록 페이지로 이동
      window.location.href = "/todo/list/";

    } catch (err) {
      console.error(err);
      // 오류 내용을 콘솔에 출력

      alert("삭제 중 오류가 발생했습니다.");
      // 사용자에게 오류 메시지 표시
    }
  });
  // 삭제 기능 끝
  
  // 홈으로 버튼
  const homeBtn = document.querySelector(".todoHome");
  // class가 todoHome인 버튼 선택

  homeBtn.addEventListener("click", () => {
    // 홈 버튼 클릭 시 실행
    window.location.href = "/todo/list/";
    // Todo 목록 페이지로 이동
  });
  // 홈 버튼 기능 끝
  
});
</script>
```

삭제하기 탬플릿 결과
![[Pasted image 20260221165134.png]]
삭제가 잘 되는지 확인합니다.

---
`todo/tests/tests_crud.py` 경로에 test코드를 작성합니다.
tests폴더 안에 반드시 `__init__.py`를 작성합니다.
```
todo/
 └── tests/
      ├── __init__.py   ← 이거 반드시 필요
      └── tests_crud.py
```
---
이 테스트 코드는 Todo API의 CRUD 전체 동작과 예외 처리(404)가 정상적으로 작동하는지를 검증하는 테스트입니다.

Todo API 테스트 항목

1. 목록 조회 테스트 (List)
    - `/todo/api/list/` 요청이 정상적으로 동작하는지 확인합니다.
    - 상태코드가 200인지 확인합니다.
    - 응답 데이터가 리스트 형태인지 검증합니다.
        
2. 데이터 생성 테스트 (Create)
    - `/todo/api/create/`로 새로운 Todo를 생성합니다.
    - 상태코드가 201(생성 성공)인지 확인합니다.
    - 데이터가 실제로 DB에 추가되었는지 확인합니다.
        
3. 상세 조회 테스트 (Retrieve)
    - `/todo/api/retrieve/<pk>/` 요청으로 특정 Todo를 조회합니다.
    - 상태코드가 **200**인지 확인합니다.
    - 반환된 데이터의 내용이 올바른지 검증합니다.
        
4. 데이터 수정 테스트 (Update - PATCH)
    - `/todo/api/update/<pk>/`로 Todo 일부 데이터를 수정합니다.
    - 상태코드가 200인지 확인합니다.
    - 실제 DB 값이 수정되었는지 검증합니다.
        
5. 데이터 삭제 테스트 (Delete)
    - `/todo/api/delete/<pk>/` 요청으로 Todo를 삭제합니다.
    - 상태코드가 204(삭제 성공)인지 확인합니다.
    - 해당 데이터가 DB에서 실제로 삭제되었는지 확인합니다.
        
6. 존재하지 않는 데이터 요청 테스트 (404 처리)
    - 존재하지 않는 id로 조회 요청을 보냅니다.
    - 상태코드가 404(Not Found)로 반환되는지 확인합니다.
        

---
테스트 코드 작성하기
`todo/tests/tests_crud.py`
```python
from django.test import TestCase
from rest_framework.test import APIClient

from ..models import Todo 


# ---------------------------------------------------------
# ✅ Todo API CRUD 동작을 검증하는 테스트 클래스
# ---------------------------------------------------------
# TestCase를 상속받으면:
# - 테스트용 임시 DB가 생성됨
# - 각 테스트 함수 실행 전 DB가 초기화됨
# - 실제 DB에 영향을 주지 않음
class TodoAPITests(TestCase):

    # -----------------------------------------------------
    # 테스트 실행 전에 공통으로 준비되는 데이터
    # -----------------------------------------------------
    def setUp(self):
        # DRF 전용 테스트 클라이언트 생성
        # → 실제 브라우저 대신 API 요청을 보내는 역할
        self.client = APIClient()

        # 테스트용 기본 Todo 1개 생성
        # → retrieve / update / delete 테스트에서 사용
        self.todo = Todo.objects.create(
            name="운동",
            description="스쿼트 50회",
            complete=False,
            exp=10,
        )

    # -----------------------------------------------------
    # 1️⃣ 목록 조회 테스트 (GET /list/)
    # -----------------------------------------------------
    def test_list(self):
        # API 요청
        res = self.client.get("/todo/api/list/")

        # 상태코드가 200(성공)인지 확인
        self.assertEqual(res.status_code, 200)

        # 응답이 리스트 형태인지 확인
        self.assertIsInstance(res.json(), list)

    # -----------------------------------------------------
    # 2️⃣ 생성 테스트 (POST /create/)
    # -----------------------------------------------------
    def test_create(self):
        payload = {
            "name": "공부",
            "description": "DRF",
            "complete": False,
            "exp": 5,
        }

        # 새 Todo 생성 요청
        res = self.client.post("/todo/api/create/", payload, format="json")

        # 상태코드가 201(생성 성공)인지 확인
        self.assertEqual(res.status_code, 201)

        # 기존 1개 + 새로 생성 1개 = 총 2개인지 확인
        self.assertEqual(Todo.objects.count(), 2)

    # -----------------------------------------------------
    # 3️⃣ 상세 조회 테스트 (GET /retrieve/<pk>/)
    # -----------------------------------------------------
    def test_retrieve(self):
        # 생성된 Todo의 id로 조회
        res = self.client.get(f"/todo/api/retrieve/{self.todo.id}/")

        # 상태코드 200 확인
        self.assertEqual(res.status_code, 200)

        # 반환된 데이터의 name 값이 올바른지 확인
        self.assertEqual(res.json()["name"], "운동")

    # -----------------------------------------------------
    # 4️⃣ 수정 테스트 (PATCH /update/<pk>/)
    # -----------------------------------------------------
    def test_update_patch(self):
        payload = {"name": "운동(수정)"}

        # 해당 Todo의 name 수정 요청
        res = self.client.patch(
            f"/todo/api/update/{self.todo.id}/", payload, format="json"
        )

        # 상태코드 200 확인
        self.assertEqual(res.status_code, 200)

        # DB에서 다시 불러와서 실제 값이 변경되었는지 확인
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.name, "운동(수정)")

    # -----------------------------------------------------
    # 5️⃣ 삭제 테스트 (DELETE /delete/<pk>/)
    # -----------------------------------------------------
    def test_delete(self):
        # 삭제 요청
        res = self.client.delete(f"/todo/api/delete/{self.todo.id}/")

        # 상태코드 204(삭제 성공) 확인
        self.assertEqual(res.status_code, 204)

        # 실제 DB에 해당 데이터가 존재하지 않는지 확인
        self.assertFalse(Todo.objects.filter(id=self.todo.id).exists())

    # -----------------------------------------------------
    # 6️⃣ 존재하지 않는 데이터 요청 시 404 테스트
    # -----------------------------------------------------
    def test_not_found_returns_404(self):
        # 존재하지 않는 id로 조회
        res = self.client.get("/todo/api/retrieve/999999/")

        # 404(Not Found) 반환 확인
        self.assertEqual(res.status_code, 404)
```

필수 5개(딱 CRUD 고정):
1. GET `/todo/api/list/` → 200 + 리스트가 온다
2. POST `/todo/api/create/` → 201 + 생성됨
3. GET `/todo/api/retrieve/<pk>/` → 200 + 해당 todo
4. PATCH `/todo/api/update/<pk>/` → 200 + 값 변경됨
5. DELETE `/todo/api/delete/<pk>/` → 204 + 삭제됨

테스트 실행
```bash
python manage.py test
```
- `test*.py`
- `tests.py`
- `tests_*.py`
    
이름을 가진 파일을 자동으로 찾아서 실행합니다. 
그러므로 `todo/tests_crud.py`도 정상적으로 실행됩니다.

---
### CI 코드 작성
깃허브에서 Actions탭에서  yaml파일을 작성합니다.
![[Pasted image 20260301141905.png]]

python 자신의 버전을 확인한뒤 버전을 수정합니다.
```yaml
name: Django CI
# GitHub Actions 워크플로우 이름 (Django 프로젝트 CI 실행)

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
# main 브랜치에 push 또는 pull request가 발생하면 실행

jobs:
  build:
  # 실행할 작업(Job) 이름

    runs-on: ubuntu-latest
    # GitHub에서 제공하는 Ubuntu 환경에서 실행

    strategy:
      max-parallel: 4
      # 최대 4개의 작업을 동시에 실행 가능

      matrix:
        python-version: ["3.12"]
        # 사용할 Python 버전 지정 (여기서는 3.12)

    steps:
    - uses: actions/checkout@v4
      # GitHub 저장소 코드를 워크플로우 환경으로 가져오기

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
      # 지정된 Python 버전 설치

    - name: Install Dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
      # pip 업데이트 후 requirements.txt에 있는 패키지 설치

    - name: Run Migrations
      run: |
        python manage.py migrate --noinput
      # Django 데이터베이스 마이그레이션 실행

    - name: Debug Info
      run: |
        python manage.py showmigrations todo
        python manage.py shell -c "from django.conf import settings; print('DATABASES =', settings.DATABASES)"
      # 마이그레이션 상태와 DB 설정 정보 확인 (디버깅용)

    - name: Run Tests
      run: |
        python manage.py test --verbosity 2
      # Django 테스트 코드 실행
```


📌 커밋 전략

이 프로젝트는 Conventional Commit 형식을 따릅니다.  
커밋은 한 작업(한 목적) 단위로 작성하며, 다음과 같은 타입을 사용합니다:
```
- feat: 새로운 기능을 추가했을 때 사용하는 커밋 타입
- fix: 버그를 수정했을 때 사용하는 커밋 타입
- docs: README나 주석 등 문서를 수정했을 때 사용하는 커밋 타입 
- test: 테스트 코드를 추가하거나 수정했을 때 사용하는 커밋 타입  
- refactor: 기능 변화 없이 코드 구조를 개선했을 때 사용하는 커밋 타입  
- style: 공백, 코드 포맷, 세미콜론 등 스타일 관련 수정일 때 사용하는 커밋 타입 
- chore: 설정 변경, 패키지 설치 등 기능과 직접적인 관련이 없는 작업일 때 사용하는 커밋 타입
  
기능 추가 → feat  
버그 수정 → fix  
테스트 추가 → test  
문서 수정 → docs  
설정 변경 → chore
```

Git 커밋 전략
작업 단위별 커밋 전략을 따릅니다.  
하나의 커밋에는 하나의 목적만 포함하며, 기능·문서·테스트를 분리하여 관리합니다.

한 커밋 = 한 작업: 테스트 코드 추가 후 
```bash
git add todo/tests_crud.py  
git commit -m "test: CRUD 테스트 코드 추가"
```

커밋시 pre-commit 훅이 자동 수정(auto-fix)을 시도할경우 자동수정을 원할경우 명령어
```bash
pre-commit run --all-files
```
	여기서 파일이 수정되면 정상입니다.
	현재 프로젝트의 모든 파일에 대해 pre-commit 훅을 강제로 실행한다는 뜻입니다.

```
커밋 전에 pre-commit 자동수정을 미리 적용하려면:  
  
pre-commit run --all-files  
  
이 명령어를 실행하면 자동 수정이 필요한 파일이 수정됩니다.  
수정된 파일이 있다면 정상이며,  
이후 git add -A 후 다시 commit 하면 됩니다.
```


한 커밋 = 한 작업: README 수정 후
```bash
git add README.md  
git commit -m "docs: README 업데이트"
```

마지막에 푸시
```bash
git push
```

🎯 목적
- 변경 이력 추적 용이
- 기능별 롤백 가능
- GitHub 히스토리 가독성 향상
- 실무형 협업 구조 유지

