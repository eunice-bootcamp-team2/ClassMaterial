`mysite > settings.py `
``` python
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    
    # 기본권한 설정: 누구나 API에 접근 가능(개발시 사용)
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
  ],
  
  # 기본 페이지네이션 설정
    "DEFAULT_PAGINATION_CLASS": "todo.pagination.CustomPageNumberPagination",
    "PAGE_SIZE": 3,

  # API응답형식
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
  ],
}
```

`todo/pagination.py `
``` python
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict
from django.conf import settings

class CustomPageNumberPagination(PageNumberPagination):
  default_page_size = settings.REST_FRAMEWORK.get("PAGE_SIZE", 10)
  def paginate_queryset(self, queryset, request, view=None):
    page_size = request.query_params.get("page_size", self.default_page_size)

    if page_size == "all":
      self.page_size = len(queryset)
    else:
      try:
        self.page_size = int(page_size)
      except ValueError:
        self.page_size = self.default_page_size

    return super().paginate_queryset(queryset, request, view)

  def get_paginated_response(self, data):
    return Response(
      OrderedDict([
        ("data", data),
        ("page_size", len(data)),
        ("total_count", self.page.paginator.count),
        ("page_count", self.page.paginator.num_pages),
        ("current_page", self.page.number),
        ("next", self.get_next_link()),
        ("previous", self.get_previous_link()),
      ])
    )
```
---
페이지네이션 UI는 JS 방식에서만 의미가 있습니다.

그래서 정석 접근은:
✅ 템플릿 for문 제거  
✅ JS가 `/todo/viewsets/view/?page=1` 호출  
✅ 응답의 `data` 배열로 DOM 생성  
✅ next / previous 버튼 제어


페이지네이션 쓰려면 템플릿 반복을 제거합니다.
```html
<div class="todocontainer">
<!--안에 코드를 삭제하고 js에서 dom으로 생성되게 코드를 수정합니다.-->
</div>  
  
<div class="pagination">  
	<button id="prevBtn">이전</button>  
	<span id="pageInfo"></span>  
	<button id="nextBtn">다음</button>  
</div>  
  
<button id="createBtn">Todo 등록하기</button>
```

`views/api_views.py`
```json
# [추가] 페이지네이션
from rest_framework.pagination import PageNumberPagination

class TodoViewSet(viewsets.ModelViewSet):
    queryset = Todo.objects.all().order_by("-created_at")
    serializer_class = TodoSerializer

class TodoListPagination(PageNumberPagination):
    page_size = 3  # 한 페이지에 몇 개 보여줄지
    page_size_query_param = "page_size"
    max_page_size = 50
```

`templates/list.html` 페이지네이션이 구동되는 형태로 코드 수정 
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

<!-- ✅ 1️⃣ Axios CDN -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
document.addEventListener("DOMContentLoaded", () => {

    /* ✅ 2️⃣ Axios 인스턴스 생성 */
    const api = axios.create({
        baseURL: "/",   // Django 동일 서버
    });

    let currentPage = 1;

    function loadPage(page) {

        /* ✅ 3️⃣ fetch → axios 변경 */
        api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {

                const data = res.data;   // fetch와 차이 나는 핵심

                renderTodos(data.data);
                updatePaginationUI(data);

                currentPage = data.current_page;
            })
            .catch(err => console.error("페이지 로드 실패", err));
    }

    function renderTodos(todos) {
        const container = document.querySelector(".todocontainer");
        container.innerHTML = "";

        todos.forEach(todo => {
            const div = document.createElement("div");
            div.className = "todo-item";
            div.dataset.id = todo.id;

            div.innerHTML = `
                <p><strong>이름:</strong> ${todo.name}</p>
                <p><strong>설명:</strong> ${todo.description}</p>
                <p><strong>완료 여부:</strong> ${todo.complete}</p>
                <p><strong>exp:</strong> ${todo.exp}</p>
                <hr>
            `;

            div.addEventListener("click", () => {
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            container.appendChild(div);
        });
    }

    function updatePaginationUI(data) {
        document.getElementById("pageInfo").innerText =
            `${data.current_page} / ${data.page_count}`;

        document.getElementById("prevBtn").disabled = !data.previous;
        document.getElementById("nextBtn").disabled = !data.next;
    }

    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        loadPage(currentPage + 1);
    });

    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });

    /* ✅ 4️⃣ 최초 로딩 */
    loadPage(1);
});
</script>
{% endblock %}
```

