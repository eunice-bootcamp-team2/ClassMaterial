Django + JavaScript 기반으로 "마이크 녹음 → 서버로 전송 → 번역 결과 표시

🎯 최종 목표
1. 사용자가 버튼을 눌러 음성을 녹음하고
2. 서버(Django API)에 파일을 전송하고
3. 번역 결과를 웹 페이지에 표시하는 것

🧱 전체 구성 흐름
```
[브라우저] 🎤 녹음 (JS MediaRecorder)
   ↓
[JavaScript] FormData로 오디오 파일 생성
   ↓
[Axios]로 Django API 호출 (/api/stt-to-ko/)
   ↓
[서버 응답] STT 결과 + 번역 결과 JSON 반환
   ↓
[브라우저] 결과 텍스트 화면에 표시
```

---
- Django + DRF 백엔드: `/api/stt-to-ko/` API 엔드포인트
- 프론트엔드: `base.html`을 상속받는 `record.html` 템플릿
- JavaScript: `MediaRecorder` API로 음성 녹음 및 전송

📁 디렉토리 구조
```
speech/
├── templates/
│   └── speech/
│       ├── base.html
│       └── record.html
```

---
✅ 1. `base.html`
`templates/base.html`
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{% block title %}STT 웹앱{% endblock %}</title>
  <style>
    body { font-family: sans-serif; padding: 2em; }
    button { font-size: 1.1em; margin: 0.5em; }
    .result { margin-top: 1.5em; padding: 1em; border: 1px solid #ccc; border-radius: 8px; }
  </style>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

✅ 2. `record.html`: 마이크 녹음 + 결과 표시 
`templates/speech/record.html`
```html
{% extends "speech/base.html" %}

{# ✅ 브라우저 탭 제목 #}
{% block title %}음성 녹음 번역기{% endblock %}

{% block content %}
<h1>🎙️ 음성 녹음 후 번역하기</h1>

{# ✅ 녹음 시작 버튼 #}
<button id="recordBtn">⏺️ 녹음 시작</button>

{# ✅ 녹음 종료 버튼 (처음에는 비활성화) #}
<button id="stopBtn" disabled>⏹️ 녹음 종료</button>

<div class="result">
  <p><strong>🎧 인식 결과:</strong> <span id="sttText">-</span></p>
  <p><strong>🌐 번역 결과:</strong> <span id="translatedText">-</span></p>
</div>

<!-- =========================================================
     ✅ Axios 라이브러리 로드 (CDN 방식)
     ---------------------------------------------------------
     axios = 서버에 HTTP 요청을 보내는 도구
     fetch보다 문법이 단순하고 자동 기능이 많음
========================================================= -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
// =========================================================
// ✅ 전역 변수
// ---------------------------------------------------------
// mediaRecorder : 실제 녹음 장치 제어 객체
// audioChunks   : 녹음된 오디오 데이터 조각 저장 배열
// =========================================================
let mediaRecorder;  //값 변경 가능한 변수
let audioChunks = [];

// =========================================================
// ✅ HTML 요소 선택 (DOM 접근)
// ---------------------------------------------------------
// document.getElementById("id") → 해당 요소 가져오기
// =========================================================
const recordBtn = document.getElementById("recordBtn"); //재할당 불가능한 변수 
const stopBtn = document.getElementById("stopBtn");
const sttTextEl = document.getElementById("sttText");
const translatedTextEl = document.getElementById("translatedText");

/* =========================================================
   ✅ Axios 공통 인스턴스 생성

   axios.create() :
   - axios 설정을 재사용하기 위한 객체 생성
   - baseURL / timeout / headers 등을 공통 관리 가능

   여기 설정 의미:
   - baseURL "/" → 현재 사이트 기준으로 요청
   - timeout 60000 → 최대 60초 대기 (STT는 느릴 수 있음)
   - 서버 응답을 최대 60초까지 기다리겠다
========================================================= */
const api = axios.create({
  baseURL: "/",
  timeout: 60000, 
});

// =========================================================
// ✅ 녹음 시작 버튼 클릭 시 실행
// =========================================================
recordBtn.onclick = async () => {

  // -------------------------------------------------------
  // 1️⃣ 브라우저 마이크 접근 권한 요청
  // -------------------------------------------------------
  // getUserMedia({ audio: true }) :
  // → 사용자 마이크 사용 허용 요청
  // → 최초 1회 권한 팝업 등장
  // -------------------------------------------------------
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // -------------------------------------------------------
  // 2️⃣ MediaRecorder 객체 생성
  // -------------------------------------------------------
  // stream(마이크 입력)을 녹음 가능한 형태로 감쌈
  // -------------------------------------------------------
  mediaRecorder = new MediaRecorder(stream);

  // 녹음 데이터 초기화
  audioChunks = [];

  // -------------------------------------------------------
  // 3️⃣ 녹음 데이터 수집 이벤트
  // -------------------------------------------------------
  // 녹음 중 발생하는 오디오 조각을 배열에 저장
  // -------------------------------------------------------
  mediaRecorder.ondataavailable = (e) => {
    audioChunks.push(e.data);
  };

  // -------------------------------------------------------
  // 4️⃣ 녹음 종료 이벤트
  // -------------------------------------------------------
  // 녹음이 끝나면 실행됨
  // → Blob(파일 객체) 생성 → 서버 업로드
  // -------------------------------------------------------
  mediaRecorder.onstop = () => {

    // Blob = 브라우저에서 사용하는 파일 객체
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

    // 서버로 업로드
    uploadAudio(audioBlob);
  };

  // -------------------------------------------------------
  // 5️⃣ 녹음 시작
  // -------------------------------------------------------
  mediaRecorder.start();

  // UI 상태 변경
  recordBtn.disabled = true;   // 녹음 중 → 시작 버튼 비활성화
  stopBtn.disabled = false;    // 종료 버튼 활성화
};

// =========================================================
// ✅ 녹음 종료 버튼 클릭 시
// =========================================================
stopBtn.onclick = () => {

  // 녹음 중지 → onstop 이벤트 자동 호출됨
  mediaRecorder.stop();

  // UI 상태 복구
  recordBtn.disabled = false;
  stopBtn.disabled = true;
};

// =========================================================
// ✅ 서버 업로드 함수
// =========================================================
async function uploadAudio(blob) {

  // -------------------------------------------------------
  // FormData 생성
  // -------------------------------------------------------
  // FormData = 파일 업로드용 표준 객체
  // multipart/form-data 형식 자동 구성
  // -------------------------------------------------------
  const formData = new FormData();

  // audio 필드로 녹음 파일 추가
  formData.append("audio", blob, "recorded_audio.webm");

  // 언어 옵션 전달
  formData.append("src_lang", "auto");

  try {
    // -----------------------------------------------------
    // axios POST 요청
    // -----------------------------------------------------
    // api.post(URL, 데이터)
    // → 서버 API 호출
    // → 응답 JSON은 res.data에 자동 저장됨
    // -----------------------------------------------------
    const res = await api.post("/api/stt-to-ko/", formData);

    const data = res.data || {};

    // STT 결과 표시
    sttTextEl.textContent = data.stt_text || "(없음)";

    // 번역 결과 표시
    translatedTextEl.textContent = data.ko_text || "(없음)";

  } catch (err) {

    // 오류 처리
    console.error("오류:", err);

    sttTextEl.textContent = "오류 발생";
    translatedTextEl.textContent = "";
  }
}
</script>
{% endblock %}
```

### 전체 동작 흐름:
	녹음 기능은 JavaScript가 만들고, 실제 녹음은 브라우저 내장 API를 사용하며, 
	AI는 업로드된 음성 파일만 분석합니다.

✅ 단계별로 쪼개서 보면

① 녹음기 역할 → JavaScript
	자바스크립트가 녹음 기능을 직접 구현한 것이 아니고 브라우저에 이미 존재하는 마이크 API를 호출하는 구조입니다.
- `navigator.mediaDevices.getUserMedia()` → 마이크 접근
- `MediaRecorder` → 녹음 데이터 생성
✔ 녹음 엔진 = 브라우저  
✔ 제어 코드 = JavaScript

② 녹음 수행 주체 → 웹 브라우저
실제 오디오 캡처는:
✔ Chrome / Edge 같은 브라우저가 처리

JavaScript는 단지:
✔ 시작해줘  
✔ 멈춰줘  
✔ 데이터 줘 라고 명령만 내림.

③ 녹음 결과 → Blob (파일 객체)
녹음이 끝나면:
✔ 브라우저가 오디오 데이터를 모아서  
✔ Blob 형태로 생성 이건 그냥 메모리 상의 파일 객체

④ 서버로 업로드
JavaScript가 수행:
✔ FormData 생성  
✔ POST 요청 전송 여기까지는 AI랑 아무 관련 없음

⑤ AI 역할 → 서버에서만 동작
AI 모델은:
✔ 녹음 안 함  
✔ 마이크 접근 안 함  
✔ 브라우저 제어 안 함
✔ 업로드된 파일만 분석 ⭐

⑥ Whisper (STT 모델) 수행
서버 내부에서 이 작업만 수행
```
음성 파일 → 텍스트 변환
```

⑦ 화면 표시
서버 응답(JSON)을 받아:
✔ JavaScript가 DOM에 출력

---
`mysite/settings.py`
```python
TEMPLATES = [
    {
        "DIRS": [BASE_DIR / "templates"], # 이 줄 추가
```

`mysite/urls.py`
```python
urlpatterns = [
    path("api/", include("speech.urls")),
]
```

`speech/urls.py`
```python
urlpatterns = [
    path("record/", views.record_page, name="record_page"),
]
```

`speech/views.py`
```python
from django.shortcuts import render

def record_page(request):
    """
    음성 녹음 + 번역 테스트 UI를 제공하는 HTML 페이지
    templates/speech/record.html 사용
    """
    return render(request, "speech/record.html")
```