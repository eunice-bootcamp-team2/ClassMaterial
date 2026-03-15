`app/templates/index.html`
```html
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastAPI Todo</title>
    <link rel="stylesheet" href="/static/style.css">
</head>

<body>

    <div class="todo-container">

        <h1>FastAPI Todo</h1>

        <!-- 로그인 영역 -->
        <div id="auth-box">

            <div id="login-form">
                <input type="text" id="login-username" placeholder="아이디">
                <input type="password" id="login-password" placeholder="비밀번호">
                <button onclick="login()">로그인</button>
                <button onclick="signup()">회원가입</button>
            </div>

            <div id="user-info" style="display:none;">
                <span id="welcome-text"></span>
                <button onclick="logout()">로그아웃</button>
            </div>

        </div>

        <hr>

        <!-- Todo 생성 -->
        <div class="todo-input-box">
            <input type="text" id="create-title" placeholder="할 일을 입력하세요">
            <button onclick="createTodo()">추가</button>
        </div>

        <div id="message-box"></div>

        <ul id="todo-list" class="todo-list"></ul>

    </div>

<script>

let token = localStorage.getItem("token");


function showMessage(message, isError = false) {
    const box = document.getElementById("message-box");
    box.innerHTML = `<p class="${isError ? 'error' : 'success'}">${message}</p>`;
}


function setLoggedIn(username) {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("user-info").style.display = "block";
    document.getElementById("welcome-text").innerText = `${username}님 로그인`;
}


function setLoggedOut() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("user-info").style.display = "none";
}


async function signup() {

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    const res = await fetch("/users/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await res.json();

    if (!res.ok) {
        showMessage(data.detail || "회원가입 실패", true);
        return;
    }

    showMessage("회원가입 성공");
}


async function login() {

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    const res = await fetch("/users/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await res.json();

    if (!res.ok) {
        showMessage(data.detail || "로그인 실패", true);
        return;
    }

    token = data.access_token;

    localStorage.setItem("token", token);

    setLoggedIn(username);

    loadTodos();

    showMessage("로그인 성공");
}


function logout() {

    localStorage.removeItem("token");

    token = null;

    setLoggedOut();

    document.getElementById("todo-list").innerHTML = "";

    showMessage("로그아웃 되었습니다.");
}


async function loadTodos() {

    if (!token) {
        return;
    }

    const res = await fetch("/todos", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const todos = await res.json();

    const list = document.getElementById("todo-list");

    list.innerHTML = "";

    todos.forEach(todo => {

        const li = document.createElement("li");

        li.className = "todo-item";

        li.innerHTML = `
        <span class="${todo.done ? 'completed' : ''}">
            ${todo.title}
        </span>

        <div>
            <button onclick="toggleDone(${todo.id}, ${todo.done})">완료</button>
            <button onclick="deleteTodo(${todo.id})">삭제</button>
        </div>
        `;

        list.appendChild(li);

    });

}


async function createTodo() {

    const title = document.getElementById("create-title").value;

    if (!title) {
        showMessage("할 일을 입력하세요", true);
        return;
    }

    const res = await fetch("/todos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            title: title,
            done: false
        })
    });

    const data = await res.json();

    if (!res.ok) {
        showMessage(data.detail || "생성 실패", true);
        return;
    }

    showMessage("Todo 생성 완료");

    document.getElementById("create-title").value = "";

    loadTodos();
}


async function deleteTodo(id) {

    const res = await fetch(`/todos/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (!res.ok) {
        showMessage("삭제 실패", true);
        return;
    }

    showMessage("삭제 완료");

    loadTodos();
}


async function toggleDone(id, done) {

    const res = await fetch(`/todos/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            done: !done
        })
    });

    if (!res.ok) {
        showMessage("수정 실패", true);
        return;
    }

    loadTodos();
}


if (token) {

    fetch("/users/me", {
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(res => res.json())
    .then(data => {
        setLoggedIn(data.username);
        loadTodos();
    })
    .catch(() => {
        logout();
    });

}

</script>

</body>
</html>
```

`static/style.css` : 기존 CSS 아래에  추가하시면 됩니다.
```css
.todo-item span {
    font-size: 18px;
    color: #1e293b;
}

.todo-item span.completed {
    text-decoration: line-through;
    color: #94a3b8;
}


#auth-box {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}


#login-form {
    display: flex;
    gap: 10px;
}


#login-form input {
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
}


#login-form button {
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    cursor: pointer;
}


#login-form button:hover {
    background: #2563eb;
}


#user-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}


#user-info button {
    background: #ef4444;
    border: none;
    padding: 8px 12px;
    color: white;
    border-radius: 6px;
    cursor: pointer;
}


#user-info button:hover {
    background: #dc2626;
}
```