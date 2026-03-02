
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

class TodoSerializer(ModelSerializer):
	class Meta:
		model = Todo
		fields = "__all__" # 모델의 모든 필드를 자동으로 직렬화합니다.
        read_only_fields = ["created_at", "updated_at"] # 읽기만 가능
        
        
        fields = [
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
- 필수 아님. DRF는 기본 설정으로도 Insomnia에 **JSON 잘 반환**합니다.
- 해두면 좋은 경우: API 서버만 쓸 거고(React/모바일), 브라우저에서 예쁜 DRF 화면 필요 없을 때.

`todo/views.py`
```python
from django.urls import reverse_lazy

# 목록 조회
class TodoListView(ListView):
  model = Todo
  template_name = "todo/list.html"
  context_object_name = "todos"
  ordering = ['-created_at']
  success_url = reverse_lazy('todo:list')
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
		todos = Todo.objects.all() 
		serializer = TodoSerializer(todos, many=True)
		return Response(serializer.data)
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
    fields = ['name', 'description', 'complete', 'exp']
    template_name = "todo/create.html"
    success_url = reverse_lazy('todo:list')
```

`todo/api_views.py`
```python
# 생성하기
class TodoCreateAPI(APIView):
	def post(self, request):
		serializer = TodoSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		todo = serializer.save()
		return Response(TodoSerializer(todo).data,
		status=status.HTTP_201_CREATED)
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
document.getElementById("createBtn").addEventListener
("click", () => {
    window.location.href = "/todo/create/"; 
    console.log("createBtn click")
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

<script>
const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  }
});

// CSRF 자동 주입 (Django 필수)
api.interceptors.request.use(config => {
  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrftoken"))
    ?.split("=")[1];

  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }

  return config;
});

document.getElementById("todoCreate").addEventListener("click", async () => {
  try {
    const res = await api.post("todo/api/create/", {
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      complete: document.getElementById("complete").checked,
      exp: Number(document.getElementById("exp").value || 0)
    });

    console.log(res.data);
    
    // ✅ 글 저장후 메인페이지도 이동 
	window.location.href = "/todo/list/";

  } catch (err) {
    console.error(err.response?.data || err.message);
  }
});
</script>
```

자바스크립트의 아래 코드가
```js
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      complete: document.getElementById("complete").checked,
      exp: Number(document.getElementById("exp").value || 0)
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
    template_name = "todo/detail.html"
    context_object_name = "todo"
```

`todo/views/api_views.py`
```python
from django.views.generic import DetailView # 추가

# 상세보기
class TodoRetrieveAPI(APIView):
    def get(self, request, pk):

        try:
            todo = Todo.objects.get(pk=pk)

        except Todo.DoesNotExist:
            return Response(
                {"error": "해당하는 todo가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TodoSerializer(todo)
        return Response(serializer.data)
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
    console.log("create loading");
    
    // 모든 리스트의 클래스를 호출하여
    const items = document.querySelectorAll(".todo-item");

	// for문과 같은 forEach로 데이터를 모두 돌린뒤
    items.forEach(item => {
        // 클릭이벤트로 상세페이지의 pk로 이동시킨다.
        item.addEventListener("click", () => {
            const todoId = item.dataset.id;
            window.location.href = `/todo/detail/${todoId}/`;
        });
    });
		  
	document.getElementById("createBtn").addEventListener
	("click", () => {
		window.location.href = "/todo/create/";
		console.log("createBtn click")
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
# 수정하기
class TodoUpdateAPI(APIView):
    def put(self, request, pk):
        try:
            todo = Todo.objects.get(pk=pk)
        except Todo.DoesNotExist:
            return Response(
                {"error": "해당하는 todo가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TodoSerializer(todo, data=request.data)
        serializer.is_valid(raise_exception=True)
        todo = serializer.save()
        serializer = TodoSerializer(todo)
        return Response(serializer.data)

    def patch(self, request, pk):
        try:
            todo = Todo.objects.get(pk=pk)
        except Todo.DoesNotExist:
            return Response(
                {"error": "해당하는 todo가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TodoSerializer(todo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        todo = serializer.save()
        serializer = TodoSerializer(todo)
        return Response(serializer.data)
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
from django.views.generic import UpdateView # 추가

# 수정하기
class TodoUpdateView(UpdateView):
    model = Todo
    fields = ['name', 'description', 'complete', 'exp']
    template_name = "todo/update.html"
    context_object_name = "todo"
    success_url = reverse_lazy('todo:list')
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
  const todoId = "{{ todo.id }}";

  // 수정 버튼	
  const updateBtn = document.querySelector(".todoUpdate");
  updateBtn.addEventListener("click", () => {
    window.location.href = `/todo/update/${todoId}/`;
  });

  // 삭제는 나중에 연결 (원하면 DeleteView도 같이 만들어줄게)
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
  // ✅ Content-Type 제거: FormData는 axios가 자동으로 multipart 설정
});

// ✅ CSRF 자동 주입 (create.html과 동일)
api.interceptors.request.use(config => {
  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrftoken"))
    ?.split("=")[1];

  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
  return config;
});

const todoId = "{{ todo.id }}";

document.getElementById("todoUpdate").addEventListener("click", async () => {
  try {
    const formData = new FormData();

    formData.append("name", document.getElementById("name").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("complete", document.getElementById("complete").checked);
    formData.append("exp", document.getElementById("exp").value || 0);

    const res = await api.patch(`/todo/viewsets/view/${todoId}/`, formData);

    console.log(res.data);

    window.location.href = `/todo/detail/${todoId}/`;

  } catch (err) {
    console.error(err.response?.data || err.message);
    alert("수정 실패");
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
# 삭제하기
class TodoDeleteAPI(APIView):
    def delete(self, request, pk):
        try:
            todo = Todo.objects.get(pk=pk)
        except Todo.DoesNotExist:
            return Response(
                {"error": "해당하는 todo가 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        todo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
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
  const todoId = "{{ todo.id }}";

  // 기존에 있는 수정 버튼
  const updateBtn = document.querySelector(".todoUpdate");
  updateBtn.addEventListener("click", () => {
    window.location.href = `/todo/update/${todoId}/`;
  });

  // ✅ 삭제 버튼 수정
  const deleteBtn = document.querySelector(".todoDelete");
  deleteBtn.addEventListener("click", async () => {

    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const res = await fetch(`/todo/api/delete/${todoId}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) throw new Error("삭제 실패");

      // ✅ 삭제 성공 → 리스트로 이동
      window.location.href = "/todo/list/";

    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });
  // ✅ 여기까지 삭제하기 종료
  
  // ✅ 홈으로 버튼
  const homeBtn = document.querySelector(".todoHome");
  homeBtn.addEventListener("click", () => {
    window.location.href = "/todo/list/";
  });
  // ✅ 홈으로 버튼 종료 
  
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

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:

    runs-on: ubuntu-latest
    strategy:
      max-parallel: 4
      matrix:
        python-version: ["3.12"]

    steps:
    - uses: actions/checkout@v4
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
    - name: Install Dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run Migrations
      run: |
        python manage.py migrate --noinput

    - name: Debug Info
      run: |
        python manage.py showmigrations todo
        python manage.py shell -c "from django.conf import settings; print('DATABASES =', settings.DATABASES)"

    - name: Run Tests
      run: |
        python manage.py test --verbosity 2
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

