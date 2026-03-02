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