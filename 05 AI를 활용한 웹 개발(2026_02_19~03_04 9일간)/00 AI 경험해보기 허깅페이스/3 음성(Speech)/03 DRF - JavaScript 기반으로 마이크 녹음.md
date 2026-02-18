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
[fetch] or [Axios]로 Django API 호출 (/api/stt-to-ko/)
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
{% block title %}음성 녹음 번역기{% endblock %}

{% block content %}
<h1>🎙️ 음성 녹음 후 번역하기</h1>

<button id="recordBtn">⏺️ 녹음 시작</button>
<button id="stopBtn" disabled>⏹️ 녹음 종료</button>

<div class="result">
  <p><strong>🎧 인식 결과:</strong> <span id="sttText">-</span></p>
  <p><strong>🌐 번역 결과:</strong> <span id="translatedText">-</span></p>
</div>

<script>
let mediaRecorder;
let audioChunks = [];

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const sttTextEl = document.getElementById("sttText");
const translatedTextEl = document.getElementById("translatedText");

recordBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    uploadAudio(audioBlob);
  };

  mediaRecorder.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  recordBtn.disabled = false;
  stopBtn.disabled = true;
};

function uploadAudio(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "recorded_audio.webm");
  formData.append("src_lang", "auto");

  fetch("/api/stt-to-ko/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      sttTextEl.textContent = data.stt_text || "(없음)";
      translatedTextEl.textContent = data.ko_text || "(없음)";
    })
    .catch((err) => {
      console.error("오류:", err);
      sttTextEl.textContent = "오류 발생";
      translatedTextEl.textContent = "";
    });
}
</script>
{% endblock %}
```

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