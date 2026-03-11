- DRF Pagination 설정 추가
- pagination.py 파일 추가 : 파일의 역할은 페이지 응답 구조를 커스터마이징으로 프론트엔드에서 쓰기 쉬운 구조로 응답 변경
- list.html 구조 변경 : 
	- Django 템플릿 반복문 사용 `{% for todo in todos %}`에서 
	- `<div class="todocontainer"></div>` JS가 데이터를 받아 DOM을 직접 생성
		- 이유는: 페이지네이션은 JS 기반 API 호출 방식에서 사용

|구분|4번|5번|
|---|---|---|
|환경변수(.env)|추가|유지|
|SECRET_KEY 보안|env 사용|유지|
|Pagination|없음|추가|
|pagination.py|없음|추가|
|REST_FRAMEWORK pagination 설정|없음|추가|
|list.html 렌더링 방식|Django template|JS DOM 생성|
|API 호출|전체 조회|페이지 조회|

---
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
# DRF 기본 페이지네이션 클래스를 상속받기 위한 import
from rest_framework.pagination import PageNumberPagination

# API 응답을 만들기 위한 Response 객체
from rest_framework.response import Response

# 응답 JSON의 key 순서를 유지하기 위한 OrderedDict
from collections import OrderedDict

# Django settings 값을 가져오기 위한 모듈
from django.conf import settings


# ---------------------------------------------------------
# 사용자 정의 페이지네이션 클래스
# ---------------------------------------------------------
class CustomPageNumberPagination(PageNumberPagination):

  # 기본 페이지 사이즈 설정
  # settings.py의 REST_FRAMEWORK["PAGE_SIZE"] 값을 사용
  # 값이 없으면 기본 10개
  default_page_size = settings.REST_FRAMEWORK.get("PAGE_SIZE", 10)


  # ---------------------------------------------------------
  # 페이지네이션 적용 전 QuerySet 처리
  # ---------------------------------------------------------
  def paginate_queryset(self, queryset, request, view=None):

    # URL 파라미터에서 page_size 값을 가져옴
    # 예: /api/list/?page_size=20
    page_size = request.query_params.get("page_size", self.default_page_size)

    # page_size=all 이면 모든 데이터를 반환
    if page_size == "all":
      self.page_size = len(queryset)

    else:
      try:
        # page_size를 정수로 변환
        self.page_size = int(page_size)

      except ValueError:
        # 숫자가 아닌 값이 들어오면 기본값 사용
        self.page_size = self.default_page_size

    # DRF 기본 paginate_queryset 기능 실행
    return super().paginate_queryset(queryset, request, view)


  # ---------------------------------------------------------
  # 페이지네이션 응답 구조 정의
  # ---------------------------------------------------------
  def get_paginated_response(self, data):

    return Response(
      OrderedDict([
        ("data", data),
        # 현재 페이지의 데이터 목록

        ("page_size", len(data)),
        # 현재 페이지에 포함된 데이터 개수

        ("total_count", self.page.paginator.count),
        # 전체 데이터 개수

        ("page_count", self.page.paginator.num_pages),
        # 전체 페이지 수

        ("current_page", self.page.number),
        # 현재 페이지 번호

        ("next", self.get_next_link()),
        # 다음 페이지 URL

        ("previous", self.get_previous_link()),
        # 이전 페이지 URL
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
```python
# [추가] 페이지네이션 기능을 사용하기 위한 DRF 모듈 import
from rest_framework.pagination import PageNumberPagination


# ---------------------------------------------------------
# Todo ViewSet (CRUD API)
# ---------------------------------------------------------
class TodoViewSet(viewsets.ModelViewSet):

    queryset = Todo.objects.all().order_by("-created_at")
    # Todo 모델의 모든 데이터를 조회
    # created_at 기준 내림차순 정렬 → 최신 데이터가 먼저 표시

    serializer_class = TodoSerializer
    # Todo 데이터를 JSON으로 변환하거나
    # JSON 데이터를 검증 및 저장할 때 사용할 Serializer 지정


# ---------------------------------------------------------
# Todo 목록 페이지네이션 설정
# ---------------------------------------------------------
class TodoListPagination(PageNumberPagination):

    page_size = 3
    # 한 페이지에 기본적으로 보여줄 데이터 개수

    page_size_query_param = "page_size"
    # URL 쿼리 파라미터로 페이지 크기 변경 가능
    # 예: /todo/viewsets/view/?page_size=5

    max_page_size = 50
    # 사용자가 설정할 수 있는 최대 페이지 크기 제한
    # 예: page_size=100 요청 시 최대 50까지만 허용
```

`templates/list.html` 페이지네이션이 구동되는 형태로 코드 수정 
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<!-- Todo 목록이 출력될 영역 -->
<div class="todocontainer"></div>

<!-- 페이지네이션 영역 -->
<div class="pagination">
    <button id="prevBtn">이전</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">다음</button>
</div>

<!-- Todo 생성 페이지 이동 버튼 -->
<button id="createBtn">Todo 등록하기</button>

<!-- Axios 라이브러리 CDN 로드 (HTTP 요청을 쉽게 보내기 위한 라이브러리) -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>

/* HTML이 모두 로드된 후 JavaScript 실행 */
document.addEventListener("DOMContentLoaded", () => {

    /* Axios 인스턴스 생성
       baseURL을 "/"로 설정하면 같은 Django 서버로 요청을 보냄 */
    const api = axios.create({
        baseURL: "/",
    });

    /* 현재 페이지 번호 저장 */
    let currentPage = 1;


    /* 특정 페이지의 Todo 목록을 서버에서 가져오는 함수 */
    function loadPage(page) {

        /* axios GET 요청 → Django ViewSet API 호출 */
        api.get(`/todo/viewsets/view/?page=${page}`)
            .then(res => {

                /* axios는 응답 데이터가 res.data 안에 들어있음 */
                const data = res.data;

                /* Todo 목록 화면에 출력 */
                renderTodos(data.data);

                /* 페이지네이션 UI 업데이트 */
                updatePaginationUI(data);

                /* 현재 페이지 상태 업데이트 */
                currentPage = data.current_page;
            })
            .catch(err => console.error("페이지 로드 실패", err));
    }


    /* Todo 목록을 HTML에 렌더링하는 함수 */
    function renderTodos(todos) {

        /* Todo 출력 영역 선택 */
        const container = document.querySelector(".todocontainer");

        /* 기존 내용 초기화 */
        container.innerHTML = "";

        /* Todo 데이터를 반복하면서 화면에 출력 */
        todos.forEach(todo => {

            const div = document.createElement("div");
            div.className = "todo-item";

            /* dataset → HTML 요소에 데이터를 저장하는 속성 */
            div.dataset.id = todo.id;

            /* Todo 정보 표시 */
            div.innerHTML = `
                <p><strong>이름:</strong> ${todo.name}</p>
                <p><strong>설명:</strong> ${todo.description}</p>
                <p><strong>완료 여부:</strong> ${todo.complete}</p>
                <p><strong>exp:</strong> ${todo.exp}</p>
                <hr>
            `;

            /* Todo 클릭 시 상세 페이지 이동 */
            div.addEventListener("click", () => {
                window.location.href = `/todo/detail/${todo.id}/`;
            });

            /* 화면에 Todo 추가 */
            container.appendChild(div);
        });
    }


    /* 페이지네이션 UI 업데이트 */
    function updatePaginationUI(data) {

        /* 현재 페이지 / 전체 페이지 표시 */
        document.getElementById("pageInfo").innerText =
            `${data.current_page} / ${data.page_count}`;

        /* 이전 버튼 활성화 여부 */
        document.getElementById("prevBtn").disabled = !data.previous;

        /* 다음 버튼 활성화 여부 */
        document.getElementById("nextBtn").disabled = !data.next;
    }


    /* 이전 페이지 버튼 클릭 이벤트 */
    document.getElementById("prevBtn").addEventListener("click", () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });


    /* 다음 페이지 버튼 클릭 이벤트 */
    document.getElementById("nextBtn").addEventListener("click", () => {
        loadPage(currentPage + 1);
    });


    /* Todo 생성 페이지 이동 */
    document.getElementById("createBtn").addEventListener("click", () => {
        window.location.href = "/todo/create/";
    });


    /* 페이지 최초 로딩 시 1페이지 데이터 요청 */
    loadPage(1);

});

</script>
{% endblock %}
```

