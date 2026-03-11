CRUD를 하나의 클래스에 통합했습니다.
```
TodoViewSet
```

|기능|HTTP|
|---|---|
|list|GET|
|retrieve|GET|
|create|POST|
|update|PUT/PATCH|
|destroy|DELETE|
이 ModelViewSet 하나가 아래 기능을 전부 자동 생성합니다.

|구분|2번|3번|
|---|---|---|
|API 구조|APIView 여러 개|ViewSet 하나|
|CRUD 클래스|5개|1개|
|URL|각각 따로|Router 자동|
|코드량|많음|매우 적음|
|DRF 스타일|기본|**실무 표준**|

2번: CRUD 기능을 각각 APIView로 직접 구현한 구조
3번 : CRUD 기능을 ModelViewSet 하나로 통합한 구조

DRF 실무에서는 거의 ViewSet + Router를 씁니다.

이유
1️⃣ 코드 70% 감소  
2️⃣ URL 자동 생성  
3️⃣ 표준 REST API 구조  
4️⃣ 유지보수 쉬움

---
`todo/urls.py  viewsets 추가`
```python
from django.urls import path, include
from .views.templates_views import TodoListView, TodoCreateView, TodoDetailView, TodoUpdateView
# from .views.api_views import TodoListAPI, TodoCreateAPI, TodoRetrieveAPI, TodoUpdateAPI, TodoDeleteAPI, TodoViewSet
from .views.api_views import TodoViewSet

from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("view", TodoViewSet, basename="todo")

urlpatterns = [
	# path("list/", views.todo_list, name="todo_List"), # 첫 테스트용

    # HTML 렌더링 뷰
    path("list/", TodoListView.as_view(), name="todo_List"),
    path("create/", TodoCreateView.as_view(), name="todo_create"),
    path("detail/<int:pk>/", TodoDetailView.as_view(), name="todo_Detail"),
    path("update/<int:pk>/", TodoUpdateView.as_view(), name="todo_Update"),


    # api DRF / JSON 응답 뷰
    # path("api/list/", TodoListAPI.as_view(), name="todo_api_list"),
    # path("api/create/", TodoCreateAPI.as_view(), name="todo_api_create"),
    # path("api/retrieve/<int:pk>/", TodoRetrieveAPI.as_view(), name="todo_api_retrieve"),
    # path("api/update/<int:pk>/", TodoUpdateAPI.as_view(), name="todo_api_update"),
    # path("api/delete/<int:pk>/", TodoDeleteAPI.as_view(), name="todo_api_delete"),   

    # Viewsets CRUD를 하나로 통일
    path("viewsets/", include(router.urls)), 
    # 127.0.0.1:8000/todo/viewsets/view/
]
```

`todo/api_views.py  viewsets 추가`
```python
# from rest_framework import status, generics viewsets -> 같은 모듈안에 있으므로 합치기

# ViewSets 사용을 위한 DRF 모듈 import
from rest_framework import viewsets

# 기존 APIView 방식 대신 ViewSet을 사용하기 위해 TodoViewSet import
from .views.api_views import TodoViewSet


# Todo CRUD를 하나의 클래스에서 처리하는 ViewSet
class TodoViewSet(viewsets.ModelViewSet):

    queryset = Todo.objects.all().order_by("-created_at")
    # Todo 모델의 모든 데이터를 조회
    # created_at 기준으로 최신 데이터가 먼저 나오도록 정렬

    serializer_class = TodoSerializer
    # Todo 데이터를 JSON으로 변환하거나
    # JSON 데이터를 검증/저장할 때 사용할 Serializer 지정


# ModelViewSet을 사용하면 아래 기능이 자동 생성됩니다
# - list()      : 전체 목록 조회 (GET)
# - retrieve()  : 단일 데이터 조회 (GET)
# - create()    : 데이터 생성 (POST)
# - update()    : 전체 수정 (PUT)
# - partial_update() : 부분 수정 (PATCH)
# - destroy()   : 삭제 (DELETE)
```

💡 예시 전체 주소
목록 조회: `http://127.0.0.1:8000/todo/viewsets/view/`
상세 조회: `http://127.0.0.1:8000/todo/viewsets/view/3/` (예: id=3)

| URL                         | HTTP 메서드 | 설명                          |
| --------------------------- | -------- | --------------------------- |
| `/todo/viewsets/view/`      | `GET`    | Todo 전체 목록 조회 (list)        |
| `/todo/viewsets/view/<pk>/` | `GET`    | 특정 Todo 상세 조회 (retrieve)    |
| `/todo/viewsets/view/`      | `POST`   | 새 Todo 생성 (create)          |
| `/todo/viewsets/view/<pk>/` | `PATCH`  | 특정 Todo 수정 (partial_update) |
| `/todo/viewsets/view/<pk>/` | `DELETE` | 특정 Todo 삭제 (destroy)        |

`detail.html` 수정 (가장 중요한 부분) : 기존 JS에서 URL만 교체하면 끝.
```html
<!-- axios 라이브러리 CDN 로드 (HTTP 요청을 쉽게 보내기 위한 라이브러리) -->  
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
// 페이지가 모두 로드된 후 실행
document.addEventListener("DOMContentLoaded", () => {

  const todoId = "{{ todo.id }}";  
  // Django 템플릿에서 전달된 todo의 id(pk)

  // axios 인스턴스 생성
  const api = axios.create({
    baseURL: "/", 
    headers: {
      "Content-Type": "application/json"
    }
  });

  // 삭제 버튼
  const deleteBtn = document.querySelector(".todoDelete");

  deleteBtn.addEventListener("click", async () => {
    // 삭제 버튼 클릭 시 실행

    try {

      const res = await api.delete(`/todo/viewsets/view/${todoId}/`);
      // axios를 사용하여 DELETE 요청 전송
      // 기존 fetch DELETE 요청과 동일한 기능

      console.log(res.data);
      // 서버 응답 데이터 확인 (DELETE는 보통 데이터 없음)

      // 삭제 성공 후 목록 페이지로 이동
      window.location.href = "/todo/list/";

    } catch (err) {
      console.error(err.response?.data || err.message);
      // 삭제 중 오류 발생 시 콘솔 출력

      alert("삭제 실패");
      // 사용자에게 실패 메시지 표시
    }

  });

});
</script>
```

`create.html` 
```js
<script>
// id가 "todoCreate"인 버튼 클릭 이벤트 등록
document.getElementById("todoCreate").addEventListener("click", async () => {

  try {

    // Todo 생성 API 호출 (POST 요청)
    // 기존 API 주소(todo/api/create/) 대신 ViewSet API 주소로 변경
    const res = await api.post("todo/viewsets/view/", {  

      name: document.getElementById("name").value,
      // id="name" 입력칸의 값을 가져와 Todo의 name 필드로 전달

      description: document.getElementById("description").value,
      // id="description" 입력칸의 값을 가져와 description 필드로 전달

      complete: document.getElementById("complete").checked,
      // 체크박스 상태(true / false)를 complete 값으로 전달

      exp: Number(document.getElementById("exp").value || 0)
      // exp 입력값을 숫자로 변환
      // 값이 비어 있으면 0으로 처리
    });

    console.log(res.data);
    // 서버에서 생성된 Todo 데이터 확인

  } catch (err) {

    console.error(err.response?.data || err.message);
    // 요청 중 오류 발생 시 콘솔에 에러 출력

  }

});
</script>
```
---
이 테스트 코드가 검증하는 것
이 테스트는 DRF ViewSet 기반 Todo API CRUD 기능이 정상 동작하는지 확인하는 테스트입니다.

테스트 항목
1. 목록 조회 (List)  
    → `/todo/viewsets/view/` 로 Todo 목록이 정상 반환되는지 확인합니다.
    
2. 데이터 생성 (Create)  
    → 새로운 Todo가 정상적으로 생성되는지 확인합니다.
    
3. 상세 조회 (Retrieve)  
    → 특정 Todo id(pk)로 데이터를 정상 조회할 수 있는지 확인합니다.
    
4. 부분 수정 (PATCH Update)  
    → Todo 데이터 일부 필드가 정상적으로 수정되는지 확인합니다.
    
5. 삭제 (Delete)  
    → Todo 데이터가 정상적으로 삭제되는지 확인합니다.
    
6. 존재하지 않는 데이터 요청 (404)  
    → 존재하지 않는 id로 요청했을 때 404가 반환되는지 확인합니다.

---
todo/tests_viewset_crud_viewset.py
```python
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Todo


# ---------------------------------------------------------
# ViewSet 기반 Todo CRUD API 테스트
# ---------------------------------------------------------
class TodoViewSetCRUDTests(TestCase):

    """
    ViewSet 라우팅 기반 API 테스트

    list:     GET    /todo/viewsets/view/
    create:   POST   /todo/viewsets/view/
    retrieve: GET    /todo/viewsets/view/<pk>/
    update:   PATCH  /todo/viewsets/view/<pk>/
    destroy:  DELETE /todo/viewsets/view/<pk>/
    """

    # ---------------------------------------------------------
    # 테스트 시작 전에 공통 데이터 준비
    # ---------------------------------------------------------
    def setUp(self):

        self.client = APIClient()
        # DRF API 테스트용 클라이언트
        # 실제 브라우저 대신 API 요청을 보내는 역할

        self.base_url = "/todo/viewsets/view/"
        # ViewSet API 기본 URL

        self.todo = Todo.objects.create(
            name="운동",
            description="스쿼트 50회",
            complete=False,
            exp=10,
        )
        # 테스트용 기본 Todo 데이터 생성


    # ---------------------------------------------------------
    # 목록 조회 테스트
    # ---------------------------------------------------------
    def test_list(self):

        res = self.client.get(self.base_url)
        # GET 요청으로 Todo 목록 조회

        self.assertEqual(res.status_code, 200)
        # 상태코드 200(성공)인지 확인

        data = res.json()
        # 응답 데이터를 JSON으로 변환

        self.assertIsInstance(data, list)
        # 응답이 리스트 형태인지 확인

        self.assertGreaterEqual(len(data), 1)
        # 최소 1개 이상의 데이터가 존재하는지 확인


    # ---------------------------------------------------------
    # 생성 테스트
    # ---------------------------------------------------------
    def test_create(self):

        payload = {
            "name": "공부",
            "description": "DRF",
            "complete": False,
            "exp": 5,
        }
        # 새로 생성할 Todo 데이터

        res = self.client.post(self.base_url, payload, format="json")
        # POST 요청으로 Todo 생성

        self.assertIn(res.status_code, (200, 201))
        # 상태코드 확인 (보통 201 Created)

        self.assertEqual(Todo.objects.count(), 2)
        # 기존 1개 + 새로 생성된 1개 = 총 2개인지 확인


    # ---------------------------------------------------------
    # 상세 조회 테스트
    # ---------------------------------------------------------
    def test_retrieve(self):

        res = self.client.get(f"{self.base_url}{self.todo.id}/")
        # 특정 Todo id로 조회

        self.assertEqual(res.status_code, 200)
        # 상태코드 200 확인

        self.assertEqual(res.json()["name"], "운동")
        # 반환된 데이터의 name 값 확인


    # ---------------------------------------------------------
    # 부분 수정 테스트 (PATCH)
    # ---------------------------------------------------------
    def test_partial_update_patch(self):

        payload = {"name": "운동(수정)"}
        # 수정할 데이터

        res = self.client.patch(
            f"{self.base_url}{self.todo.id}/",
            payload,
            format="json"
        )
        # PATCH 요청으로 Todo 일부 수정

        self.assertEqual(res.status_code, 200)
        # 수정 성공 확인

        self.todo.refresh_from_db()
        # DB에서 데이터를 다시 불러옴

        self.assertEqual(self.todo.name, "운동(수정)")
        # 실제 DB 값이 수정되었는지 확인


    # ---------------------------------------------------------
    # 삭제 테스트
    # ---------------------------------------------------------
    def test_destroy_delete(self):

        res = self.client.delete(f"{self.base_url}{self.todo.id}/")
        # DELETE 요청으로 Todo 삭제

        self.assertIn(res.status_code, (200, 204))
        # 삭제 성공 상태코드 확인 (보통 204)

        self.assertFalse(Todo.objects.filter(id=self.todo.id).exists())
        # DB에 해당 데이터가 존재하지 않는지 확인


    # ---------------------------------------------------------
    # 존재하지 않는 데이터 요청 테스트
    # ---------------------------------------------------------
    def test_not_found_returns_404(self):

        res = self.client.get(f"{self.base_url}999999/")
        # 존재하지 않는 id로 조회 요청

        self.assertEqual(res.status_code, 404)
        # 404 Not Found 반환 확인
```

테스트 실행
```bash
python manage.py test todo.tests_viewset_crud
```
