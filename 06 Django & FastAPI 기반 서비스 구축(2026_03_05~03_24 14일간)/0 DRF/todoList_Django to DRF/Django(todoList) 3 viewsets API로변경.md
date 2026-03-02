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
    path("viewsets/", include(router.urls)), # 127.0.0.1:8000/todo/viewsets/view/
]
```

`todo/api_views.py  viewsets 추가`
```python
# Viewsets을 위한 모듈추가
from rest_framework import viewsets
# from rest_framework import status, generics viewsets -> 
# 같은 모듈안에 있으므로 합치기
from .views.api_views import TodoViewSet

# Viewsets CRUD를 하나로 통일
class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all().order_by("-created_at")
    serializer_class = TodoSerializer
```

💡 예시 전체 주소
목록 조회: `http://127.0.0.1:8000/todo/viewsets/view/`
상세 조회: `http://127.0.0.1:8000/todo/viewsets/view/3/` (예: id=3)

|URL|HTTP 메서드|설명|
|---|---|---|
|`/todo/viewsets/view/`|`GET`|Todo 전체 목록 조회 (list)|
|`/todo/viewsets/view/<pk>/`|`GET`|특정 Todo 상세 조회 (retrieve)|
|`/todo/viewsets/view/`|`POST`|새 Todo 생성 (create)|
|`/todo/viewsets/view/<pk>/`|`PATCH`|특정 Todo 수정 (partial_update)|
|`/todo/viewsets/view/<pk>/`|`DELETE`|특정 Todo 삭제 (destroy)|

`detail.html` 수정 (가장 중요한 부분) : 기존 JS에서 URL만 교체하면 끝.
```html
<script>
document.addEventListener("DOMContentLoaded", () => {

  // 삭제 버튼
    try {
      // const res = await fetch(`/todo/api/delete/${todoId}/`, { # api 주소만 변경
      const res = await fetch(`/todo/viewsets/view/${todoId}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) throw new Error("삭제 실패");
});
</script>
```

`cteate.html` : 기존 JS에서 URL만 교체하면 끝.
```js
<script>
document.getElementById("todoCreate").addEventListener("click", async () => {
  try {
    // const res = await api.post("todo/api/create/", { # api 주소만 변경
    const res = await api.post("todo/viewsets/view/", {  
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      complete: document.getElementById("complete").checked,
      exp: Number(document.getElementById("exp").value || 0)
    });
});
</script>
```
---
todo/tests_viewset_crud_viewset.py
```python
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Todo


class TodoViewSetCRUDTests(TestCase):
    """
    ✅ ViewSet 라우팅(/todo/viewsets/view/) 기반 CRUD가 정상 동작하는지 검증
    - list:     GET    /todo/viewsets/view/
    - create:   POST   /todo/viewsets/view/
    - retrieve: GET    /todo/viewsets/view/<pk>/
    - update:   PATCH  /todo/viewsets/view/<pk>/
    - destroy:  DELETE /todo/viewsets/view/<pk>/
    """

    def setUp(self):
        self.client = APIClient()
        self.base_url = "/todo/viewsets/view/"
        self.todo = Todo.objects.create(
            name="운동",
            description="스쿼트 50회",
            complete=False,
            exp=10,
        )

    def test_list(self):
        res = self.client.get(self.base_url)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    def test_create(self):
        payload = {
            "name": "공부",
            "description": "DRF",
            "complete": False,
            "exp": 5,
        }
        res = self.client.post(self.base_url, payload, format="json")
        self.assertIn(res.status_code, (200, 201))  # 설정에 따라 201이 일반적
        self.assertEqual(Todo.objects.count(), 2)

    def test_retrieve(self):
        res = self.client.get(f"{self.base_url}{self.todo.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "운동")

    def test_partial_update_patch(self):
        payload = {"name": "운동(수정)"}
        res = self.client.patch(f"{self.base_url}{self.todo.id}/", payload, format="json")
        self.assertEqual(res.status_code, 200)

        self.todo.refresh_from_db()
        self.assertEqual(self.todo.name, "운동(수정)")

    def test_destroy_delete(self):
        res = self.client.delete(f"{self.base_url}{self.todo.id}/")
        self.assertIn(res.status_code, (200, 204))  # destroy는 보통 204
        self.assertFalse(Todo.objects.filter(id=self.todo.id).exists())

    def test_not_found_returns_404(self):
        res = self.client.get(f"{self.base_url}999999/")
        self.assertEqual(res.status_code, 404)
```

테스트 실행
```bash
python manage.py test todo.tests_viewset_crud
```
