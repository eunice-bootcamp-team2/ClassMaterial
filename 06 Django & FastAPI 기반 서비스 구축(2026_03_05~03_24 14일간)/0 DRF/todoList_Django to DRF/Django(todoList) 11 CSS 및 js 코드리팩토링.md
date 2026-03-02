디렉토리에 폴더 및 파일 생성
```
static / css / style.css
```

`static > css > list.css `
```css
/* =========================
   Base
========================= */
* { box-sizing: border-box; }
body{
  margin:0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, sans-serif;
  background:#f5f7fb;
  color:#111827;
}

/* =========================
   Header (기존: .header 유지)
========================= */
.header{
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e5e7eb;

  /* ✅ 레이아웃 */
  width: min(980px, 92vw);
  margin: 0 auto;
  padding: 14px 0;

  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}

/* 제목 */
.header h1{
  margin:0;
  font-size:22px;
  letter-spacing:-0.2px;
  font-weight:800;
}

/* 제목 링크(기존 인라인 style 제거해도 됨) */
.header h1 a{
  text-decoration:none;
  color:inherit;
}

/* 오른쪽 영역(로그인/로그아웃/회원가입) */
.header > div{
  display:flex;
  align-items:center;
  gap:10px;
}

.app-header__inner {
  width: min(980px, 92vw);
  margin: 0 auto;
  padding: 14px 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* "로그인됨" 같은 상태 텍스트 */
#authWelcome{
  font-size:13px;
  color:#6b7280;
  padding:6px 10px;
  border:1px solid #e5e7eb;
  border-radius:999px;
  background:#fff;
}

/* 버튼/링크 공통 버튼처럼 보이게 */
#logoutBtn,
#loginLink,
#signupLink{
  appearance:none;
  border:1px solid #e5e7eb;
  background:#fff;
  color:#111827;

  border-radius:12px;
  padding:9px 14px;
  font-weight:700;
  cursor:pointer;

  text-decoration:none;
  display:inline-flex;
  align-items:center;
  gap:8px;

  transition: transform 0.08s ease, background 0.12s ease, border-color 0.12s ease;
}

#logoutBtn:active,
#loginLink:active,
#signupLink:active{
  transform: translateY(1px);
}

#logoutBtn:hover,
#loginLink:hover{
  background:#f9fafb;
  border-color:#d1d5db;
}

/* 회원가입만 포인트 컬러 */
#signupLink{
  background:#2563eb;
  border-color:#2563eb;
  color:#fff;
}
#signupLink:hover{
  background:#1d4ed8;
  border-color:#1d4ed8;
}

/* ✅ 기존 header.html에 있는 hr 스타일 예쁘게 */
hr{
  border:0;
  border-top:1px solid #e5e7eb;
  margin:0;
}

/* =========================
   Footer (기존 footer 태그 유지)
========================= */
.app-footer {
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}
.app-footer__inner {
  width: min(980px, 92vw);
  margin: 0 auto;
  padding: 18px 0;
  color: #6b7280;
}


/* footer.html에 클래스가 없을 수 있으니 footer 안 텍스트를 중앙 정렬 */
.app-footer, .app-footer *{
  color:#6b7280;
}

.app-footer{
  padding: 18px 0;
  text-align:center;
  font-size: 13px;
}

/* =========================
   Todo list (기존 구조 유지)
========================= */
.list_container{
  margin: 24px auto 56px;
  display:grid;
  grid-template-columns: 1fr;
  gap:16px;
}

.todo-item{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:18px;
  padding:18px;
  box-shadow:0 10px 30px rgba(17,24,39,0.06);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}

.todo-item:hover{
  transform: translateY(-1px);
  border-color:#dbe3ff;
  box-shadow:0 14px 40px rgba(17,24,39,0.08);
}

.todo-item img{
  display:block;
  max-width:240px;
  width:100%;
  border-radius:16px;
  margin-top:10px;
}

/* pagination + create */
.pagination{
  width: min(980px, 92vw);
  margin: 18px auto;
  display:flex;
  justify-content:center;
  align-items:center;
  gap:10px;
}

.pagination button{
  border:1px solid #e5e7eb;
  background:#fff;
  border-radius:12px;
  padding:10px 14px;
  cursor:pointer;
}
.pagination button:disabled{
  opacity:.5;
  cursor:not-allowed;
}

#pageInfo{
  font-weight:800;
  color:#374151;
  min-width:80px;
  text-align:center;
}

#createBtn{
  width: min(930px, 92vw);
  margin: 10px auto 0;
  display:block;
  padding:14px 16px;
  border-radius:14px;
  border:0;
  background:#2563eb;
  color:#fff;
  font-weight:800;
  cursor:pointer;
  box-shadow: 0 10px 26px rgba(37,99,235,0.22);
}
#createBtn:hover{ background:#1d4ed8; }

/* 모바일 */
@media (max-width:520px){
  .header h1{ font-size:18px; }
  .header{ padding: 12px 0; }
}
```

`detail.css`
```css
/* =========================
   Todo Detail Page
   (detail.html: .todoDetail, .btnList)
========================= */

/* 상세 카드 */
.todoDetail{
  width: min(930px, 92vw);
  margin: 24px auto 16px;

  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;

  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
}

/* 라벨/내용 줄 */
.todoDetail p{
  margin: 10px 0;
  line-height: 1.6;
  color: #111827;
}

.todoDetail strong{
  display: inline-block;
  min-width: 84px;
  color: #374151;
}

/* 이미지 */
.todoDetail img{
  display: block;
  margin-top: 10px;
  width: min(360px, 100%);
  border-radius: 16px;
  border: 1px solid #e5e7eb;
}

/* 버튼 영역 */
.btnList{
  width: min(930px, 92vw);
  margin: 0 auto 56px;

  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;

  padding: 14px 0;
}

/* 버튼 공통 */
.btnList button{
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;

  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 800;

  cursor: pointer;
  transition: transform 0.08s ease, background 0.12s ease, border-color 0.12s ease;
}

.btnList button:hover{
  background: #f9fafb;
  border-color: #d1d5db;
}

.btnList button:active{
  transform: translateY(1px);
}

/* 버튼별 포인트 컬러 */
.todoUpdate{
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
}
.todoUpdate:hover{
  background: #1d4ed8 !important;
  border-color: #1d4ed8 !important;
}

.todoDelete{
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
}
.todoDelete:hover{
  background: #dc2626 !important;
  border-color: #dc2626 !important;
}

.todoHome{
  background: #111827 !important;
  border-color: #111827 !important;
  color: #ffffff !important;
}
.todoHome:hover{
  background: #0b1220 !important;
  border-color: #0b1220 !important;
}

/* 모바일 */
@media (max-width: 520px){
  .btnList{
    flex-direction: column;
    align-items: stretch;
  }
  .btnList button{
    width: 100%;
  }
  .todoDetail strong{
    min-width: 70px;
  }
}
```

update.css
```css
/* =========================
   Todo Update Page
   (update.html: .container, #todoUpdate 등)
========================= */

/* update 페이지 컨테이너를 카드로 */
.container{
  width: min(980px, 92vw);
  margin: 24px auto 56px;

  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 22px;

  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
}

.cre_container{
  margin: 24px auto 56px;
  display:grid;
  grid-template-columns: 1fr;
  gap:16px;
}


/* 제목 */
.container h2{
  margin: 0 0 18px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.2px;
}

/* 각 입력 블록 */
.container > div{
  margin: 12px 0;
}

/* 라벨 */
.container label{
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #374151;
  margin-bottom: 8px;
}

/* 텍스트/숫자 입력 */
.container input[type="text"],
.container input[type="number"],
.container textarea{
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  outline: none;
  font-size: 14px;
}

.container textarea{
  min-height: 110px;
  resize: vertical;
}

/* 포커스 */
.container input[type="text"]:focus,
.container input[type="number"]:focus,
.container textarea:focus{
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.12);
}

/* 체크박스 라인 (Complete) */
.container input[type="checkbox"]{
  width: 18px;
  height: 18px;
  accent-color: #2563eb;
}

/* 현재 이미지 */
.container img{
  display: block;
  margin-top: 10px;
  width: min(320px, 100%);
  border-radius: 16px;
  border: 1px solid #e5e7eb;
}

/* 파일 업로드 */
.container input[type="file"]{
  width: 100%;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
}

/* 버튼들 */
.container button{
  margin-top: 20px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 900;
  cursor: pointer;

  transition: transform 0.08s ease, background 0.12s ease, border-color 0.12s ease;
}

.container button:hover{
  background: #f9fafb;
  border-color: #d1d5db;
}
.container button:active{
  transform: translateY(1px);
}

/* 저장 버튼 강조 */
#todoUpdate{
  border: 0;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.22);
}
#todoUpdate:hover{
  background: #1d4ed8;
}

/* 취소 버튼은 약하게 */
.container button[onclick*="history.back"]{
  background: #111827;
  border-color: #111827;
  color: #fff;
}
.container button[onclick*="history.back"]:hover{
  background: #0b1220;
  border-color: #0b1220;
}

/* 버튼 간격 */
.container button + button{
  margin-left: 10px;
}

/* 모바일: 버튼 세로로 */
@media (max-width:520px){
  .container button{
    width: 100%;
  }
  .container button + button{
    margin-left: 0;
    margin-top: 10px;
  }
}
```

auth_base.html
```html
<head>
  <link rel="stylesheet" href="{% static 'css/login.css' %}">
</head>
```

login.css
```css
/* =========================
   Auth Page (login/signup)
   - auth_base.html + .auth-card
========================= */

/* auth_base.html에서 body 배경이 다르면 안 바꿔도 됨 */
body{
  background:#f5f7fb;
}

/* 가운데 정렬 컨테이너가 없다면 auth_card 자체를 중앙으로 */
.auth-card{
  width: min(420px, 92vw);
  margin: 64px auto 56px;

  background:#ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 22px;

  box-shadow: 0 14px 40px rgba(17,24,39,0.08);
}

/* 제목 */
.auth-card h2{
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.2px;
}

/* 인풋 */
.auth-card input{
  width: 100%;
  display: block;

  border: 1px solid #e5e7eb;
  border-radius: 12px;

  padding: 12px 12px;
  margin-top: 10px;

  font-size: 14px;
  outline: none;
  background:#fff;
}

.auth-card input:focus{
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.12);
}

/* 로그인 버튼 */
.auth-card button{
  width: 100%;
  margin-top: 14px;

  border: 0;
  border-radius: 12px;
  padding: 12px 14px;

  background: #2563eb;
  color: #fff;

  font-weight: 900;
  cursor: pointer;

  box-shadow: 0 10px 26px rgba(37,99,235,0.22);
  transition: transform 0.08s ease, background 0.12s ease;
}

.auth-card button:hover{
  background:#1d4ed8;
}

.auth-card button:active{
  transform: translateY(1px);
}

/* 아래 문구 */
.auth-card p{
  margin: 14px 0 0;
  color:#6b7280;
  font-size: 14px;
}

/* 링크 */
.auth-card a{
  color:#2563eb;
  font-weight: 800;
  text-decoration: none;
}

.auth-card a:hover{
  text-decoration: underline;
}

/* 모바일 */
@media (max-width:520px){
  .auth-card{ margin-top: 36px; }
}
```

list.html 리팩토링
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<button id="movieReviewsBtn">🎬 영화 리뷰 & 감정분석</button>
<div class="list_container"></div>

<div class="pagination">
  <button id="prevBtn">이전</button>
  <span id="pageInfo"></span>
  <button id="nextBtn">다음</button>
</div>

<button id="createBtn">Todo 등록하기</button>

<script>
document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // 0) 기본 설정 / 상태값
  // ======================================================
  const LOGIN_PAGE_URL = "/login/";
  let currentPage = 1;

  // axios 인스턴스(window.api) 확인
  if (!window.api) {
    console.error("window.api가 없습니다. base.html에서 static/js/api.js 로드 확인");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // access_token 없으면 로그인으로
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ======================================================
  // 1) 공통 헬퍼
  // ======================================================
  // 인증 실패(401/403) → 토큰 삭제 후 로그인 이동
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      console.log("인증 실패(401/403) → 토큰 삭제 후 로그인 이동");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  // interaction API 경로 헬퍼
  const InteractionAPI = {
    like: (todoId) => `/interaction/like/${todoId}/`,
    bookmark: (todoId) => `/interaction/bookmark/${todoId}/`,
    comment: (todoId) => `/interaction/comment/${todoId}/`,
    commentList: (todoId) => `/interaction/comment/${todoId}/list/`,
  };

  // 안전한 숫자 변환
  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // ======================================================
  // 2) 데이터 로딩 함수 (Read)
  // ======================================================
  async function loadPage(page) {
    try {
      const res = await window.api.get(`/todo/viewsets/view/?page=${page}`);
      const data = res.data;

      const todos = data.data || data.results || [];
      renderTodos(todos);
      updatePaginationUI(data);

      currentPage = data.current_page || page;
    } catch (err) {
      handleAuthError(err).catch(() => {});
      console.error("페이지 로드 실패", err.response?.data || err.message);
    }
  }

  async function loadComments(todoId, card) {
    const listEl = card.querySelector(".comment-list");
    if (!listEl) return;

    try {
      const res = await window.api.get(InteractionAPI.commentList(todoId));
      const comments = res.data || [];

      listEl.innerHTML = "";
      comments.forEach((c) => {
        const item = document.createElement("div");
        item.className = "comment-item";
        item.style.padding = "6px 0";
        item.innerHTML = `
          <div style="font-size:14px;">
            <strong>${c.username ?? ""}</strong> : ${c.content ?? ""}
          </div>
        `;
        listEl.appendChild(item);
      });
    } catch (err) {
      handleAuthError(err).catch(() => {});
      console.error("댓글 목록 로드 실패", err.response?.data || err.message);
    }
  }

  // ======================================================
  // 3) 렌더링 함수 (UI)
  // ======================================================
  function renderTodos(todos) {
    const container = document.querySelector(".list_container");
    container.innerHTML = "";

    if (!todos || todos.length === 0) {
      container.innerHTML = "<p>등록된 Todo 없음</p>";
      return;
    }

    todos.forEach((todo) => {
      const card = document.createElement("div");
      card.className = "todo-item";
      card.dataset.id = todo.id;

      // 이미지 URL 처리
      const imageSrc = todo.image
        ? (todo.image.startsWith("http") ? todo.image : `${location.origin}${todo.image}`)
        : "";

      // 안전한 기본값 처리
      const likeCount = toNumber(todo.like_count, 0);
      const bookmarkCount = toNumber(todo.bookmark_count, 0);
      const commentCount = toNumber(todo.comment_count, 0);

      const isLiked = Boolean(todo.is_liked ?? false);
      const isBookmarked = Boolean(todo.is_bookmarked ?? false);

      card.innerHTML = `
        <p><strong>제목:</strong> ${todo.name ?? ""}</p>
        <p><strong>설명:</strong> ${todo.description ?? ""}</p>
        <p><strong>작성자:</strong> ${todo.username ?? ""}</p>
        <p><strong>완료 여부:</strong> ${todo.complete ? "완료" : "미완료"}</p>
        <p><strong>exp:</strong> ${todo.exp ?? 0}</p>

        ${imageSrc ? `<img src="${imageSrc}" style="max-width:200px;">` : ""}

        <!-- 액션 바 -->
        <div class="todo-actions" style="display:flex; gap:10px; align-items:center; margin-top:10px;">
          <button class="btn-like" type="button"
            data-id="${todo.id}" aria-pressed="${isLiked}"
            style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
            <span class="icon">${isLiked ? "❤️" : "🤍"}</span>
            <span class="count">${likeCount}</span>
          </button>

          <button class="btn-bookmark" type="button"
            data-id="${todo.id}" aria-pressed="${isBookmarked}"
            style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
            <span class="icon">${isBookmarked ? "🔖" : "📑"}</span>
            <span class="count">${bookmarkCount}</span>
          </button>

          <button class="btn-comment" type="button"
            data-id="${todo.id}"
            style="display:flex; gap:6px; align-items:center; border-radius:999px; padding:6px 10px;">
            <span class="icon">💬</span>
            <span class="count">${commentCount}</span>
          </button>
        </div>

        <!-- 댓글 입력 영역 (기본 숨김) -->
        <div class="comment-box" style="display:none; margin-top:10px;">
          <textarea class="comment-text" rows="3" style="width:100%;"></textarea>
          <button class="comment-submit" data-id="${todo.id}">등록</button>
        </div>

        <!-- 댓글 표시 영역 -->
        <div class="comment-list" style="margin-top:8px;"></div>
      `;

      // 카드 클릭 → detail 이동 (단, 액션/댓글 영역 클릭은 제외)
      card.addEventListener("click", (e) => {
        if (e.target.closest(".todo-actions") || e.target.closest(".comment-box")) return;
        window.location.href = `/todo/detail/${todo.id}/`;
      });

      container.appendChild(card);

      // 각 카드별 댓글 목록 로딩
      loadComments(todo.id, card);
    });
  }

  function updatePaginationUI(data) {
    const current = data.current_page ?? currentPage ?? 1;
    const total =
      data.page_count ??
      (typeof data.count === "number" && data.results
        ? Math.ceil(data.count / data.results.length)
        : "?");

    document.getElementById("pageInfo").innerText = `${current} / ${total}`;
    document.getElementById("prevBtn").disabled = !(data.previous);
    document.getElementById("nextBtn").disabled = !(data.next);
  }

  // ======================================================
  // 4) 이벤트 처리 (이벤트 위임 + 버튼 이벤트)
  // ======================================================
  // 좋아요/북마크/댓글/댓글등록 (이벤트 위임)
  document.addEventListener("click", async (e) => {
    // 좋아요
    const likeBtn = e.target.closest(".btn-like");
    if (likeBtn) {
      e.stopPropagation();
      e.preventDefault();

      const todoId = likeBtn.dataset.id;

      try {
        const res = await window.api.post(InteractionAPI.like(todoId));
        const { liked, like_count } = res.data;

        likeBtn.setAttribute("aria-pressed", String(liked));
        likeBtn.querySelector(".icon").textContent = liked ? "❤️" : "🤍";
        likeBtn.querySelector(".count").textContent = toNumber(like_count, 0);
      } catch (err) {
        handleAuthError(err).catch(() => {});
        console.error("좋아요 실패:", err.response?.data || err.message);
        alert("좋아요 실패");
      }
      return;
    }

    // 북마크
    const bookmarkBtn = e.target.closest(".btn-bookmark");
    if (bookmarkBtn) {
      e.stopPropagation();
      e.preventDefault();

      const todoId = bookmarkBtn.dataset.id;

      try {
        const res = await window.api.post(InteractionAPI.bookmark(todoId));
        const { bookmarked, bookmark_count } = res.data;

        bookmarkBtn.setAttribute("aria-pressed", String(bookmarked));
        bookmarkBtn.querySelector(".icon").textContent = bookmarked ? "🔖" : "📑";
        bookmarkBtn.querySelector(".count").textContent = toNumber(bookmark_count, 0);
      } catch (err) {
        handleAuthError(err).catch(() => {});
        console.error("북마크 실패:", err.response?.data || err.message);
        alert("북마크 실패");
      }
      return;
    }

    // 댓글 버튼 → 입력창 토글
    const commentBtn = e.target.closest(".btn-comment");
    if (commentBtn) {
      e.stopPropagation();
      e.preventDefault();

      const card = commentBtn.closest(".todo-item");
      const box = card.querySelector(".comment-box");

      box.style.display =
        (box.style.display === "none" || !box.style.display) ? "block" : "none";
      return;
    }

    // 댓글 등록
    const submitBtn = e.target.closest(".comment-submit");
    if (submitBtn) {
      e.stopPropagation();
      e.preventDefault();

      const todoId = submitBtn.dataset.id;
      const card = submitBtn.closest(".todo-item");
      const textarea = card.querySelector(".comment-text");
      const content = textarea.value.trim();

      if (!content) return;

      try {
        const res = await window.api.post(InteractionAPI.comment(todoId), { content });
        const saved = res.data;

        // comment-list는 항상 만들어두었지만, 안전하게 재확인
        const listEl = card.querySelector(".comment-list");

        const item = document.createElement("div");
        item.className = "comment-item";
        item.style.padding = "6px 0";
        item.innerHTML = `
          <div style="font-size:14px;">
            <strong>${saved.username ?? "me"}</strong> : ${saved.content}
          </div>
        `;
        listEl.prepend(item);

        // 댓글 수 +1
        const countEl = card.querySelector(".btn-comment .count");
        countEl.textContent = toNumber(countEl.textContent, 0) + 1;

        // 입력 초기화
        textarea.value = "";

        // 입력창 유지(원하면 none으로 변경 가능)
        card.querySelector(".comment-box").style.display = "block";
      } catch (err) {
        handleAuthError(err).catch(() => {});
        console.error("댓글 등록 실패", err.response?.data || err.message);
        alert("댓글 등록 실패");
      }
      return;
    }
  });

  // 페이지 이동 버튼
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) loadPage(currentPage - 1);
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    loadPage(currentPage + 1);
  });

  // 생성 페이지 이동
  document.getElementById("createBtn").addEventListener("click", () => {
    window.location.href = "/todo/create/";
  });

  // 영화 리뷰 페이지 이동
  document.getElementById("movieReviewsBtn").addEventListener("click", () => {
    window.location.href = "/reviews/page/";
  });

  // ======================================================
  // 5) 초기 실행
  // ======================================================
  loadPage(1);
});
</script>

{% endblock %}
```


`create.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}
<div class="cre_container">
  <h2>Create a New Todo</h2>

  <div>
    <label for="name">Name:</label>
    <input type="text" name="name" id="name">
  </div>

  <div>
    <label for="description">Description:</label>
    <textarea name="description" id="description"></textarea>
  </div>

  <div>
    <label for="complete">Complete:</label>
    <input type="checkbox" name="complete" id="complete">
  </div>

  <div>
    <label for="exp">Experience Points:</label>
    <input type="number" name="exp" id="exp" min="0">
  </div>

  <div>
    <label for="image">Image:</label>
    <input type="file" id="image">
  </div>

  <button type="submit" id="todoCreate">Create</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // 0) 기본 설정
  // ======================================================
  const LOGIN_PAGE_URL = "/login/";
  const CREATE_API_URL = "/todo/viewsets/view/";

  // axios 인스턴스(window.api) 확인
  if (!window.api) {
    console.error("window.api가 없습니다. base.html에서 static/js/api.js 로드 확인");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // access_token 없으면 로그인으로
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ======================================================
  // 1) 공통 헬퍼
  // ======================================================
  // 인증 실패(401/403) → 토큰 삭제 후 로그인 이동
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      console.log("인증 실패(401/403) → 토큰 삭제 후 로그인 이동");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  // FormData 생성
  function buildFormData() {
    const formData = new FormData();

    formData.append("name", document.getElementById("name").value.trim());
    formData.append("description", document.getElementById("description").value.trim());
    formData.append("complete", document.getElementById("complete").checked ? "true" : "false");
    formData.append("exp", document.getElementById("exp").value || "0");

    const fileInput = document.getElementById("image");
    if (fileInput.files && fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

    return formData;
  }

  // ======================================================
  // 2) 이벤트 처리
  // ======================================================
  document.getElementById("todoCreate").addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const formData = buildFormData();

      // FormData일 때 Content-Type은 axios가 자동 설정하므로 헤더를 따로 건드리지 않음
      const res = await window.api.post(CREATE_API_URL, formData);

      console.log("생성 성공:", res.data);
      window.location.href = "/todo/list/";
    } catch (err) {
      handleAuthError(err).catch(() => {});
      console.error("생성 실패:", err.response?.data || err.message);
      alert("생성 실패: 콘솔/네트워크 확인");
    }
  });

  // ======================================================
  // 3) 초기화(선택)
  // ======================================================
  // 필요하면 여기서 기본값 세팅/포커스 처리 가능
  // document.getElementById("name").focus();
});
</script>
{% endblock %}
```

`detail.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>

  {% if todo.image %}
    <p><strong>이미지:</strong></p>
    <img src="{{ todo.image.url }}" alt="todo image" style="max-width:300px; height:auto;">
  {% else %}
    <p><strong>이미지:</strong> -</p>
  {% endif %}
</div>

<div class="btnList">
  <button class="todoUpdate">수정</button>
  <button class="todoDelete">삭제</button>
  <button class="todoHome">홈으로</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // 0) 기본 설정
  // ======================================================
  const todoId = "{{ todo.id }}";
  const LOGIN_PAGE_URL = "/login/";
  const LIST_PAGE_URL = "/todo/list/";

  // window.api 확인
  if (!window.api) {
    console.error("window.api가 없습니다. base.html에서 static/js/api.js 로드 확인");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // access_token 없으면 로그인으로
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ======================================================
  // 1) 공통 헬퍼
  // ======================================================
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      alert("로그인이 필요합니다.");

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  // ======================================================
  // 2) 버튼 이벤트
  // ======================================================
  // 수정 페이지로 이동
  document.querySelector(".todoUpdate").addEventListener("click", () => {
    window.location.href = `/todo/update/${todoId}/`;
  });

  // 삭제 처리
  document.querySelector(".todoDelete").addEventListener("click", async () => {
    const ok = confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await window.api.delete(`/todo/viewsets/view/${todoId}/`);
      window.location.href = LIST_PAGE_URL;
    } catch (err) {
      handleAuthError(err).catch(() => {});
      console.error("삭제 실패:", err.response?.data || err.message);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });

  // 리스트(홈)로 이동
  document.querySelector(".todoHome").addEventListener("click", () => {
    window.location.href = LIST_PAGE_URL;
  });
});
</script>

{% endblock %}
```

`update.html`
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

  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

  <button type="button" id="todoUpdate">저장</button>
  <button type="button" onclick="history.back()">취소</button>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  // ======================================================
  // 0) 기본 설정
  // ======================================================
  const LOGIN_PAGE_URL = "/login/";
  const todoId = "{{ todo.id }}";
  const UPDATE_API_URL = `/todo/viewsets/view/${todoId}/`;

  // window.api 확인
  if (!window.api) {
    console.error("window.api가 없습니다. base.html에서 static/js/api.js 로드 확인");
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // access_token 없으면 로그인으로
  const access = localStorage.getItem("access_token");
  if (!access) {
    console.log("access_token 없음 → 로그인 이동");
    window.location.href = LOGIN_PAGE_URL;
    return;
  }

  // ======================================================
  // 1) 공통 헬퍼
  // ======================================================
  function handleAuthError(err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      alert("로그인이 필요합니다.");

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.location.href = LOGIN_PAGE_URL;
    }
    return Promise.reject(err);
  }

  function buildFormData() {
    const formData = new FormData();

    formData.append("name", document.getElementById("name").value.trim());
    formData.append("description", document.getElementById("description").value.trim());
    formData.append("complete", document.getElementById("complete").checked ? "true" : "false");
    formData.append("exp", document.getElementById("exp").value || "0");

    const fileInput = document.getElementById("image");
    if (fileInput.files && fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

    return formData;
  }

  // ======================================================
  // 2) 이벤트 처리
  // ======================================================
  document.getElementById("todoUpdate").addEventListener("click", async () => {
    try {
      const formData = buildFormData();

      // FormData는 Content-Type을 axios가 자동 설정하므로 헤더를 강제로 지정하지 않음
      const res = await window.api.patch(UPDATE_API_URL, formData);

      console.log("수정 성공:", res.data);
      window.location.href = `/todo/detail/${todoId}/`;
    } catch (err) {
      handleAuthError(err).catch(() => {});
      console.error("수정 실패:", err.response?.data || err.message);
      alert("수정 실패: 콘솔/네트워크 확인");
    }
  });
});
</script>

{% endblock %}
```