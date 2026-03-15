좋아, 이제 **지금까지 만든 TaskBoard API 백엔드 위에**

👀 실제로 눈에 보이는 **HTML + CSS + JS + Jinja2 프론트**를 얹어볼게.

> 목표:
> - FastAPI 그대로 두고
> - Jinja2 + 바닐라 JS로
>     **로그인 → JWT 저장 → Todo 목록 조회/생성**까지
>     화면에서 직접 확인할 수 있게 만들기.
>     

아래는 **“추가로 만들 코드”**만 정리한 거라,
지금까지 1~14파트 백엔드 코드는 그대로 두고 위에 얹으면 돼.

---

### 0. 디렉토리 구조 확장

프로젝트 루트(`taskboard-api/`)에서:
```bash
mkdir -p app/templates
mkdir -p app/static/css
mkdir -p app/static/js
mkdir -p app/web
touch app/web/__init__.py
touch app/web/pages.py
```

최종 구조 예시:
```bash
taskboard-api/
├── app/
│   ├── main.py            # 이미 있음 (조금 수정할 거)
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py    # 이미 있음 (JWT 로그인 API)
│   │       ├── todos.py   # 이미 있음 (Todo API)
│   │       └── ...
│   ├── web/
│   │   ├── __init__.py
│   │   └── pages.py       # 🆕 HTML 화면 라우터
│   ├── templates/
│   │   ├── base.html      # 🆕 공통 레이아웃
│   │   ├── login.html     # 🆕 로그인 화면
│   │   └── todos.html     # 🆕 Todo 화면
│   └── static/
│       ├── css/
│       │   └── style.css  # 🆕 간단 스타일
│       └── js/
│           ├── auth.js    # 🆕 로그인 관련 JS
│           └── todos.js   # 🆕 Todo 관련 JS
└── ...
```

---

### 1. `main.py` 수정 – 템플릿 & static & 페이지 라우터 연결

📁 `app/main.py`

> 기존에 FastAPI(...), include_router(auth.router, ...) 이런 부분은 그대로 두고,
> **Jinja2 템플릿 + static + pages 라우터**만 추가해 주면 됨.

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import health, todos, auth  # 예: 이미 만든 API 라우터들
from app.web import pages                       # 🆕 HTML 페이지 라우터

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo 관리용 FastAPI 백엔드",
    version="0.1.0",
)

# 🔹 API 라우터들 (이미 있던 코드일 것)
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(todos.router, prefix="/todos", tags=["Todos"])

# 🔹 HTML 페이지 라우터 (Jinja2 기반 화면)
app.include_router(pages.router, tags=["Pages"])

# 🔹 static 파일(css, js) 서빙
app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static",
)

# 루트 페이지를 HTML로 보낼지, JSON으로 보낼지는 취향인데
# 여기서는 그냥 "/login"으로 리다이렉트하는 단순 버전으로 두어도 됨.
@app.get("/", include_in_schema=False)
async def root_redirect():
    from fastapi.responses import RedirectResponse

    return RedirectResponse(url="/login")
```

> ⚠️ auth.router, todos.router 이름은
> 
> 너가 기존에 만든 파일 이름/구조에 맞게 import 경로만 조정하면 돼.
> 
> (예: `from app.api.routes import health, todos, auth` 형태)

---

### 2. HTML 페이지 라우터 – `pages.py`

여기서는 **템플릿만 렌더링**하고,

실제 데이터 통신은 JS에서 REST API(`/auth/login`, `/todos/...`)를 호출하게 만들 거야.

📁 `app/web/pages.py`
```python
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()

templates = Jinja2Templates(directory="app/templates")

@router.get("/login", response_class=HTMLResponse, name="login_page")
async def login_page(request: Request):
    """
    로그인 화면
    """
    return templates.TemplateResponse(
        "login.html",
        {"request": request},
    )

@router.get("/todos", response_class=HTMLResponse, name="todos_page")
async def todos_page(request: Request):
    """
    Todo 목록 화면
    - JWT 토큰은 브라우저 localStorage에 저장되어 있다고 전제
    - JS에서 /todos API 호출
    """
    return templates.TemplateResponse(
        "todos.html",
        {"request": request},
    )
```

---

### 3. 베이스 템플릿 – `base.html`

📁 `app/templates/base.html`
```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>{% block title %}TaskBoard{% endblock %}</title>
    <link rel="stylesheet" href="/static/css/style.css" />
    <!-- axios CDN -->
    <script src="<https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js>"></script>
  </head>
  <body>
    <header class="top-nav">
      <div class="logo">TaskBoard</div>
      <nav>
        <a href="/todos">Todos</a>
        <a href="/login" id="logout-link">로그아웃</a>
      </nav>
    </header>

    <main>
      {% block content %}{% endblock %}
    </main>

    <script>
      // 로그아웃 공통 처리
      document.addEventListener("DOMContentLoaded", () => {
        const logoutLink = document.getElementById("logout-link");
        if (logoutLink) {
          logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("access_token");
            window.location.href = "/login";
          });
        }
      });
    </script>

    {% block scripts %}{% endblock %}
  </body>
</html>
```

---

### 4. 로그인 화면 – `login.html`

📁 `app/templates/login.html`
```html
{% extends "base.html" %}

{% block title %}로그인 - TaskBoard{% endblock %}

{% block content %}
<section class="center-box">
  <h1>TaskBoard 로그인</h1>
  <form id="login-form">
    <div class="form-row">
      <label for="username">아이디</label>
      <input type="text" id="username" name="username" required />
    </div>
    <div class="form-row">
      <label for="password">비밀번호</label>
      <inputtype="password"
        id="password"
        name="password"
        required
        autocomplete="current-password"
      />
    </div>
    <button type="submit">로그인</button>
  </form>

  <p class="message" id="login-message"></p>
</section>
{% endblock %}

{% block scripts %}
<script src="/static/js/auth.js"></script>
{% endblock %}
```

---

### 5. Todo 화면 – `todos.html`

📁 `app/templates/todos.html`
```html
{% extends "base.html" %}

{% block title %}Todos - TaskBoard{% endblock %}

{% block content %}
<section class="page">
  <h1>나의 Todo 목록</h1>

  <section class="todo-form">
    <h2>새 Todo 추가</h2>
    <form id="todo-form">
      <div class="form-row">
        <label for="title">제목</label>
        <input type="text" id="title" name="title" required />
      </div>
      <div class="form-row">
        <label for="description">내용</label>
        <textarea id="description" name="description"></textarea>
      </div>
      <div class="form-row">
        <label for="priority">우선순위 (1~5)</label>
        <inputtype="number"
          id="priority"
          name="priority"
          value="3"
          min="1"
          max="5"
        />
      </div>
      <div class="form-row">
        <label for="due_date">마감일</label>
        <input type="date" id="due_date" name="due_date" />
      </div>
      <button type="submit">추가</button>
    </form>
  </section>

  <section class="todo-list">
    <h2>Todo 목록</h2>
    <div id="todo-list-container"></div>
  </section>
</section>
{% endblock %}

{% block scripts %}
<script src="/static/js/todos.js"></script>
{% endblock %}
```

---

### 6. 간단 스타일 – `style.css`

📁 `app/static/css/style.css`
```css
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  background: #f4f4f8;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #222831;
  color: white;
  padding: 0.75rem 1.5rem;
}

.top-nav a {
  color: #eeeeee;
  margin-left: 1rem;
  text-decoration: none;
}

.top-nav a:hover {
  text-decoration: underline;
}

main {
  padding: 2rem;
}

.center-box {
  max-width: 400px;
  margin: 4rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.form-row {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.form-row label {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: #333;
}

.form-row input,
.form-row textarea {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 0.9rem;
}

button {
  border: none;
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
  background: #00adb5;
  color: white;
  cursor: pointer;
  font-weight: 600;
}

button:hover {
  background: #01939a;
}

.message {
  margin-top: 1rem;
  font-size: 0.9rem;
}

.message.error {
  color: #e53935;
}
.message.success {
  color: #43a047;
}

.page {
  max-width: 960px;
  margin: 0 auto;
}

.todo-form,
.todo-list {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.todo-item {
  border-bottom: 1px solid #eee;
  padding: 0.75rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-meta {
  font-size: 0.8rem;
  color: #777;
}
```

---

### 7. 로그인 JS – `auth.js`

📁 `app/static/js/auth.js`

> 여기서 /auth/login 엔드포인트는
> 네가 3번 파트(JWT 인증)에서 만든 로그인 API에 맞춰서 수정하면 됨.
> (예: `{"access_token": "...", "token_type": "bearer"}` 응답 가정)

```jsx
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const messageEl = document.getElementById("login-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      messageEl.textContent = "아이디와 비밀번호를 입력해주세요.";
      messageEl.classList.add("error");
      return;
    }

    try {
      const resp = await axios.post("/auth/login", {
        username,
        password,
      });

      const token = resp.data.access_token;
      if (!token) {
        throw new Error("토큰이 응답에 없습니다.");
      }

      // JWT 저장
      localStorage.setItem("access_token", token);

      messageEl.textContent = "로그인 성공! 잠시 후 이동합니다.";
      messageEl.classList.add("success");

      setTimeout(() => {
        window.location.href = "/todos";
      }, 500);
    } catch (err) {
      console.error(err);
      messageEl.textContent =
        err.response?.data?.detail || "로그인에 실패했습니다.";
      messageEl.classList.add("error");
    }
  });
});
```

> ⚠️ 여기서 POST /auth/login의 응답 구조가
> 
> 네가 만든 백엔드와 다르면 `resp.data.xxx` 부분만 맞게 바꿔주면 됨.

---

### 8. Todo JS – `todos.js`

📁 `app/static/js/todos.js`

> 페이지 진입 시: 토큰 확인 → 없으면 /login으로 보냄있으면 /todos API 호출해서 목록 렌더링폼 전송 시: POST /todos 호출해서 새 Todo 생성

```jsx
const API_BASE = ""; // 같은 도메인이므로 prefix 불필요. 만약 /api/todos 였다면 "/api" 등으로 조정

function getToken() {
  return localStorage.getItem("access_token");
}

function authHeader() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchTodos() {
  const container = document.getElementById("todo-list-container");
  container.textContent = "로딩 중...";

  try {
    const resp = await axios.get("/todos", {
      headers: authHeader(),
    });

    const todos = resp.data;
    if (!todos || todos.length === 0) {
      container.innerHTML = "<p>등록된 Todo가 없습니다.</p>";
      return;
    }

    const listEl = document.createElement("div");
    todos.forEach((todo) => {
      const item = document.createElement("div");
      item.className = "todo-item";

      const left = document.createElement("div");
      const right = document.createElement("div");

      left.innerHTML = `
        <div><strong>${todo.title}</strong> (${todo.status})</div>
        <div class="todo-meta">
          우선순위: ${todo.priority}
          ${
            todo.due_date
              ? ` | 마감일: ${todo.due_date}`
              : ""
          }
        </div>
      `;

      right.innerHTML = `
        <button data-id="${todo.id}" class="btn-done">완료</button>
        <button data-id="${todo.id}" class="btn-delete">삭제</button>
      `;

      item.appendChild(left);
      item.appendChild(right);
      listEl.appendChild(item);
    });

    container.innerHTML = "";
    container.appendChild(listEl);

    // 버튼 이벤트 바인딩
    container.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    });

    container.querySelectorAll(".btn-done").forEach((btn) => {
      btn.addEventListener("click", () => handleDone(btn.dataset.id));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML =
      "<p>Todo 목록을 불러오는 중 오류가 발생했습니다.</p>";
  }
}

async function handleCreateTodo(e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const priority = parseInt(document.getElementById("priority").value, 10);
  const dueDate = document.getElementById("due_date").value || null;

  if (!title) {
    alert("제목을 입력해주세요.");
    return;
  }

  try {
    await axios.post(
      "/todos",
      {
        title,
        description: description || null,
        priority,
        due_date: dueDate,
        status: "todo",
      },
      {
        headers: authHeader(),
      }
    );

    // 입력값 초기화 후 목록 다시 로드
    document.getElementById("todo-form").reset();
    fetchTodos();
  } catch (err) {
    console.error(err);
    alert("Todo 생성 중 오류가 발생했습니다.");
  }
}

async function handleDelete(id) {
  if (!confirm("정말 삭제할까요?")) return;

  try {
    await axios.delete(`/todos/${id}`, {
      headers: authHeader(),
    });
    fetchTodos();
  } catch (err) {
    console.error(err);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

async function handleDone(id) {
  try {
    await axios.patch(
      `/todos/${id}`,
      { status: "done" },
      {
        headers: authHeader(),
      }
    );
    fetchTodos();
  } catch (err) {
    console.error(err);
    alert("상태 변경 중 오류가 발생했습니다.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "/login";
    return;
  }

  const form = document.getElementById("todo-form");
  form.addEventListener("submit", handleCreateTodo);

  fetchTodos();
});
```

> ⚠️ 여기서 /todos, /todos/{id} 엔드포인트는
> 
> 네가 2번 파트에서 정의한 API 경로에 맞춰서 수정하면 돼.
> 
> (만약 `/api/todos` 형태라면 문자열만 바꿔주면 됨)

---

### 9. 실행 흐름 정리

1. 백엔드 서버 실행
```bash
uvicorn app.main:app --reload
```

1. 브라우저에서:

- `http://127.0.0.1:8000/login` → 로그인 화면
    (실제 로그인 계정은 네가 만든 User 생성 로직에 따라 테스트 계정 준비)
    
- 로그인 성공 → `localStorage`에 JWT 저장 → `/todos`로 이동
    
- `/todos` 화면에서:
    - GET `/todos` 호출해 목록 표시
    - 폼 작성 후 “추가” → POST `/todos` 호출, 목록 다시 갱신
    - “완료/삭제” 버튼으로 PATCH/DELETE 실행

---

### 요약

- **기존 1~14번 FastAPI 백엔드 코드는 그대로 유지**
- 그 위에
    - `app/web/pages.py` (HTML 라우팅)
    - `templates/*.html`
    - `static/css/style.css`
    - `static/js/*.js`
        만 추가해서 **진짜 화면이 보이는 Todo 웹앱**을 만든 것.