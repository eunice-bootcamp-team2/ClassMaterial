`0)` 준비: 프로젝트 폴더 만들기
```bash
deactivate # 가상환경안에 있다면
cd ~
mkdir drf_speech
cd drf_speech
code -r .

uv venv
source .venv/bin/activate
```

`2)` 필요한 패키지 설치 (DRF + 모델 실행)
Whisper 파이프라인이 mp3 같은 포맷을 다루려면 보통 ffmpeg가 필요해요.

```bash
sudo apt update
sudo apt install -y ffmpeg
```
	WAV만 받을 거면 ffmpeg 없이도 되는 경우가 많지만, 실습에선 mp3도 자주 써서 설치 추천.

`ffmpeg`란? 
Whisper 파이프라인에서 자주 등장하는 `ffmpeg`는 오디오/비디오 데이터를 다룰 때 거의 필수 도구로, 오디오와 비디오를 변환·편집·처리하는 오픈소스 명령줄 도구입니다.

주로 하는 일은:
- 포맷 변환: mp3 → wav, mp4 → mp3, flac → wav 등
- 자르기
- 리샘플링
- 영상 추출
- 영상 합치기

`3)` 패키지 설치 (uv 환경에서)
```bash
# 1️⃣ Django 웹 프레임워크 + Django REST Framework
# - API 서버 구축용 (POST로 음성 파일 받기, JSON 응답)
uv pip install django djangorestframework


# 2️⃣ Hugging Face + PyTorch 핵심 패키지
# - transformers : Whisper(STT), 번역 모델 파이프라인
# - torch        : 모델 실행 엔진
# - torchaudio   : PyTorch 기반 오디오 처리 보조
uv pip install transformers torch torchaudio


# 3️⃣ 오디오 디코딩 안정화 패키지 (⭐ 매우 중요)
# - soundfile : wav, flac 등 오디오 파일 로딩
# - librosa   : mp3, m4a 등 다양한 음성 포맷 지원
# → Whisper ASR 실행 시 num_frames 오류 방지
uv pip install -U numpy librosa soundfile


# 4️⃣ 번역 모델용 토크나이저
# - opus-mt, t5 계열 번역 모델에서 필수
uv pip install sentencepiece


# 5️⃣ multipart/form-data 처리
# - curl -F "audio=@file.wav" 형태의 파일 업로드 처리용
# - DRF에서 request.FILES 사용 가능하게 함
uv pip install python-multipart
```

`4)` Django 프로젝트/앱 생성
```bash
django-admin startproject mysite .
python manage.py startapp speech
```

`5)` settings.py 설정
`mysite/settings.py`
```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "speech",
]
```
업로드 파일 저장 경로 설정 (MEDIA)
```python
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

`6)` `mysite/urls.py`
```python
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("speech.urls")),
]

# 개발 중 업로드 파일 서빙
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```
`speech/urls.py` : app URL 만들기
```python
from django.urls import path
from . import views

urlpatterns = [
    path("stt-to-ko/", views.SttToKoAPIView.as_view(), name="stt_to_ko"),
]
```

`7)` 모델 로더 만들기 (서버 실행 중 1번만 로드되게) `speech/services.py` 생성
```python
import re
import threading
import torch
from transformers import pipeline

# ====== Config ======
ASR_MODEL_ID = "AventIQ-AI/whisper_small_Automatic_speech_recognition"
MT_MODEL_ID = "Helsinki-NLP/opus-mt-en-ko"

# ====== Lazy singletons ======
_asr = None
_mt = None
_mt_available = True  # MT가 다운로드/로딩 실패하면 False로 내려서 재시도 폭주 방지

_lock = threading.Lock()


def _device():
    """HF pipeline device index: GPU면 0, 아니면 -1"""
    return 0 if torch.cuda.is_available() else -1


# ---------- text helpers ----------
_LATIN_RE = re.compile(r"[A-Za-z]")


def contains_latin(text: str) -> bool:
    return bool(_LATIN_RE.search(text or ""))


def looks_like_korean(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in (text or ""))


# ---------- pipelines ----------
def get_asr():
    """Whisper ASR pipeline singleton (thread-safe)."""
    global _asr
    if _asr is not None:
        return _asr

    with _lock:
        if _asr is None:
            _asr = pipeline(
                task="automatic-speech-recognition",
                model=ASR_MODEL_ID,
                device=_device(),
            )
    return _asr


def get_mt():
    """
    EN->KO MT pipeline singleton (thread-safe).
    환경에서 huggingface.co 접근이 막혀 있으면 여기서 예외가 날 수 있음.
    그 경우 _mt_available=False로 내려서 이후 요청에서 재시도 폭주를 막음.
    """
    global _mt, _mt_available
    if not _mt_available:
        return None
    if _mt is not None:
        return _mt

    with _lock:
        if _mt is None and _mt_available:
            try:
                _mt = pipeline(
                    task="translation_en_to_ko",
                    model=MT_MODEL_ID,
                    device=_device(),
                )
            except Exception as e:
                # MT는 선택 기능이므로 서버를 죽이지 않고 비활성화
                print("⚠️ MT pipeline disabled:", repr(e))
                _mt_available = False
                _mt = None

    return _mt


# ---------- core functions ----------
def safe_asr_transcribe(audio_path: str) -> str:
    """
    STT 안정 버전:
    - pipeline에 '파일 경로'를 직접 넣는 방식 (가장 안정적)
    """
    if not audio_path:
        return ""

    asr = get_asr()
    out = asr(audio_path)

    if isinstance(out, dict) and "text" in out:
        return (out["text"] or "").strip()

    return str(out).strip()


def safe_translate_en_to_ko(text: str) -> str:
    """
    EN->KO 번역 안정 버전:
    - MT 비활성/실패 시 원문 반환
    """
    if not text:
        return text

    mt = get_mt()
    if mt is None:
        return text  # MT 비활성

    try:
        out = mt(text)
        if isinstance(out, list) and out:
            return (
                out[0].get("translation_text")
                or out[0].get("generated_text")
                or out[0].get("text")
                or text
            )
        return text
    except Exception as e:
        print("⚠️ Translation error:", repr(e))
        return text


def maybe_translate_to_ko(src_lang: str, stt_text: str):
    """
    번역 여부 결정 로직 (정확/안전 버전)
    - ko: 번역 금지
    - en: 번역 시도
    - auto: 영어가 있고(라틴) 한글이 없으면 번역 시도
    used_translation은 '진짜 번역 성공'일 때만 True
    """
    stt_text = (stt_text or "").strip()
    src = (src_lang or "auto").strip().lower()

    # 기본값
    ko_text = stt_text
    used_translation = False

    if not stt_text:
        return "", False

    # 1) ko면 번역 금지
    if src == "ko":
        return ko_text, False

    # 2) 번역 시도 여부
    if src == "en":
        should_translate = True
    else:  # auto 포함
        should_translate = contains_latin(stt_text) and not looks_like_korean(stt_text)

    if not should_translate:
        return ko_text, False

    translated = safe_translate_en_to_ko(stt_text).strip()

    # 3) "실제 번역 성공" 판정
    if translated and translated != stt_text:
        return translated, True

    return stt_text, False
```
- `get_asr() / get_mt()`로 요청 때마다 다시 모델 로드하지 않게(매우 중요)
- 번역 모델은 학습용으로 가벼운 `opus-mt-en-ko` 사용

`8)` DRF APIView 만들기 (음성 업로드 → 한국어 텍스트 반환)
`speech/views.py`
```python
import os
import uuid
from pathlib import Path

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import safe_asr_transcribe, maybe_translate_to_ko


class SttToKoAPIView(APIView):
    """
    multipart/form-data 로 audio 파일을 받아 STT 수행.
    - src_lang=ko: 번역 금지
    - src_lang=en: 번역 시도(가능하면)
    - src_lang=auto: 텍스트 패턴 기반 번역 판단
    """

    # 필요하면 조절 (너무 큰 파일 방지)
    MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB

    # 필요하면 확장자 제한 (요청 정책에 따라 수정)
    ALLOWED_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}

    def post(self, request):
        audio = request.FILES.get("audio")
        src_lang = (request.data.get("src_lang") or "auto").strip().lower()

        if not audio:
            return Response(
                {"detail": "audio 파일이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1) 용량 체크(선택)
        if getattr(audio, "size", 0) and audio.size > self.MAX_UPLOAD_BYTES:
            return Response(
                {"detail": f"파일이 너무 큽니다. 최대 {self.MAX_UPLOAD_BYTES // (1024 * 1024)}MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) 확장자 체크(선택)
        original_name = getattr(audio, "name", "upload")
        ext = Path(original_name).suffix.lower()
        if ext and ext not in self.ALLOWED_EXTS:
            return Response(
                {"detail": f"지원하지 않는 파일 형식입니다. 허용: {sorted(self.ALLOWED_EXTS)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3) 저장 경로 준비 (충돌 방지: uuid 파일명)
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        safe_name = f"{uuid.uuid4().hex}{ext or '.wav'}"
        save_path = os.path.join(settings.MEDIA_ROOT, safe_name)

        # 4) 저장 → 처리 → 항상 삭제
        try:
            with open(save_path, "wb") as f:
                for chunk in audio.chunks():
                    f.write(chunk)

            stt_text = safe_asr_transcribe(save_path) or ""
            ko_text, used_translation = maybe_translate_to_ko(src_lang, stt_text)
            ko_text = ko_text or stt_text

            return Response(
                {
                    "src_lang": src_lang,
                    "stt_text": stt_text,
                    "ko_text": ko_text,
                    "used_translation": bool(used_translation),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # STT/MT 관련 예외는 서버 로그에 남기고, 응답은 깔끔하게
            return Response(
                {"detail": "처리 중 오류가 발생했습니다.", "error": repr(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        finally:
            # 임시 파일 정리 (실패해도 서버 죽지 않게)
            try:
                if os.path.exists(save_path):
                    os.remove(save_path)
            except Exception:
                pass
```

`9)` 마이그레이션 & 서버 실행
```bash
python manage.py migrate
python manage.py runserver
```

---
내 휴대폰을 이용하여 음성 데이터를 만듦니다.

sample_ko 이름으로 저장합니다.
```
안녕하세요 이 파일은 STT 테스트를 위한 한국어 음성 파일입니다
```

sample_en 이름으로 저장합니다.
```
This is an English-only audio file.
We are testing speech to text recognition.
Thank you for listening.
```

sample_any 이름으로 저장합니다.
```
안녕하세요.
This is a mixed language audio file.
이 파일은 음성 인식과 번역 기능을 동시에 테스트하기 위한 샘플입니다.
Thank you for listening.
```

내 휴대폰에 있는 음성 파일을 내 컴퓨터로 전송합니다.

전송 경로를 다운로드로 지정했을 경우

현재 wsls 내 경로 확인
```bash
pwd
```
예시 출력:
```bash
/home/youjung/drf_speech # 지금 터미널 위치 = /home/youjung/drf_speech
```

Windows 경로와 비교해서 보기 (WSL 핵심)
```bash
ls /mnt/c/Users
```
	여기서 보이는 이름이 Windows 사용자 계정명이에요.
```
All Users        → 시스템용 (공용 링크)
Default          → 기본 템플릿 계정
Default User     → 기본 템플릿 계정
desktop.ini      → 설정 파일
Public           → 모든 사용자가 공유하는 폴더
MS               → ⭐ 실제 사용자 계정일 가능성 매우 높음
```

또는 WSL에서 Windows 사용자 이름을 직접 물어보는 방법
```bash
cmd.exe /c echo %USERNAME%
```

그다음:
```bash
ls /mnt/c/Users/내이름/Downloads

ls /mnt/c/Users/MS/Downloads
```

프로젝트 폴더로 `sample_ko.m4a` 복사 : 지금 이 목록이 `/mnt/c/Users/MS/Downloads`라 가정
```bash
cp /mnt/c/Users/MS/Downloads/sample_ko.m4a ~/drf_speech/
cp /mnt/c/Users/MS/Downloads/sample_en2.m4a ~/drf_speech/
cp /mnt/c/Users/MS/Downloads/sample_any.m4a ~/drf_speech/
```
확인:
```bash
ls ~/drf_speech | grep sample_ko
```
	sample_ko.m4a가 보이면 OK

m4a → wav 변환
```
ffmpeg -i sample_ko.m4a sample_ko.wav
ffmpeg -i sample_en2.m4a sample_en2.wav
ffmpeg -i sample_any.m4a sample_any.wav
```
변환 확인:
```bash
file sample_ko.wav
```
정상이면:
```
RIFF (little-endian) data, WAVE audio
```
---
이 API는 서버가 실행 중일 때만 curl 테스트가 가능합니다.

`1)` src_lang=ko
- 한국어 음성은 그대로 전사(STT)만 수행됩니다.
- 번역은 수행되지 않습니다.
```bash
안녕하세요 이 파일은 STT 테스트를 위한 한국어 음성 파일입니다


curl -s -X POST "http://127.0.0.1:8000/api/stt-to-ko/" -F "audio=@sample_ko.wav" -F "src_lang=ko" ; echo
```
서버응답:
```
{
  "src_lang": "ko",
  "stt_text": "안녕하세요 이 화일은 STT 테스트를 위한 한국어 음성 화일입니다",
  "ko_text": "안녕하세요 이 화일은 STT 테스트를 위한 한국어 음성 화일입니다",
  "used_translation": false
}
```

`2)` src_lang=en
- 영어 음성은 STT만 수행됩니다.
- 현재 설정에서는 번역 모델이 적용되지 않아 한글 번역은 되지 않습니다.
```bash
This is an English-only audio file.
We are testing speech to text recognition.
Thank you for listening.

curl -s -X POST "http://127.0.0.1:8000/api/stt-to-ko/" -F "audio=@sample_en.wav" -F "src_lang=en" ; echo
```
서버응답:
```
{
  "src_lang": "en",
  "stt_text": "HELLO THIS IS A SAMPLE AUDIO FILE FOR TESTING SPEACH TO TEXT",
  "ko_text": "HELLO THIS IS A SAMPLE AUDIO FILE FOR TESTING SPEACH TO TEXT",
  "used_translation": false
}
```

`3)` src_lang=auto
- Whisper STT 결과에 영어 문자가 포함된 경우에만 번역을 시도합니다.
- STT 결과가 이미 한국어인 경우 번역은 수행되지 않습니다.
```bash
안녕하세요.
This is a mixed language audio file.
이 파일은 음성 인식과 번역 기능을 동시에 테스트하기 위한 샘플입니다.
Thank you for listening.


curl -s -X POST "http://127.0.0.1:8000/api/stt-to-ko/" -F "audio=@sample_any.wav" -F "src_lang=auto" ; echo
```
서버응답:
```
{
  "src_lang": "auto",
  "stt_text": "안녕하세요. 이 파일은 음성 인식과 번역 기능을 동시에 테스트하기 위한 샘플입니다.",
  "ko_text": "안녕하세요. 이 파일은 음성 인식과 번역 기능을 동시에 테스트하기 위한 샘플입니다.",
  "used_translation": false
}
```

Hugging Face의 Whisper + transformers 파이프라인은  
음성 인식(STT)까지만 안정적으로 지원하고, 영어 → 한국어 번역은 기본 동작으로 제공하지 않습니다. 그래서 Hugging Face는 Whisper를 STT 중심으로 설계했으며, 영어→한국어 번역은 파이프라인에서 기본적으로 비활성화되어 있어 번역 실패 시 원문을 그대로 반환합니다.

그래서 
- STT는 Hugging Face Whisper 사용
- 번역은 Papago / Google Translate API 사용 → 성공률 99%

---
GPU와 CPU는 어떤 차이가 있을까?

✅ CPU란?
- 중앙처리장치(Central Processing Unit)
- 대부분의 컴퓨터 기본 연산을 처리함
- 한 번에 적은 데이터를 빠르게 처리하는 데 적합함
- 예: 워드 작성, 웹 브라우징, 기본 프로그램 실행
    
✅ GPU란?
- 그래픽처리장치(Graphics Processing Unit)
- 원래는 게임/그래픽을 빠르게 그리기 위한 장치였지만,  
    지금은 AI/딥러닝 연산용으로도 사용됨
- 한 번에 많은 데이터를 동시에 처리하는 데 뛰어남 (병렬 연산)
- 예: 이미지 분류, 음성 인식, 자연어 처리, 번역 등 AI 작업
    
> 💡 AI 모델은 연산량이 많기 때문에 GPU에서 훨씬 빠르게 작동합니다.  
> 동일한 음성 파일을 처리해도 CPU에선 몇 초, GPU에선 1초 이내에 끝날 수 있어요.


⚙️ GPU로 처리되고 있는지 확인하는 코드 설명 : `services.py`
```python
print("✅ CUDA 사용 가능 여부:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("➡️ 사용 가능한 GPU:", torch.cuda.get_device_name(0))
else:
    print("❌ GPU 없음 (CPU로 동작 중)")
```

|코드|설명|
|---|---|
|`torch.cuda.is_available()`|GPU(CUDA)가 연결되어 있는지 확인|
|`torch.cuda.get_device_name(0)`|GPU가 있다면 이름(모델명)을 출력|
|`device=0`|Hugging Face 모델을 GPU에 할당하겠다는 뜻|
|`device=-1`|GPU가 없으면 CPU에서 작동하겠다는 뜻|

결과:
```bash
✅ CUDA 사용 가능 여부: True
➡️ 사용 가능한 GPU: NVIDIA GeForce RTX *** SUPER
```
- PyTorch는 GPU를 정상 인식 중입니다.
- AI 모델(Whisper, 번역기 등)은 `device=0`을 통해 GPU에서 실행됩니다.
- 결과적으로 음성 인식이나 번역 속도가 훨씬 빨라집니다.
- Django 서버는 이 환경 위에서 정상 작동 중입니다.

🚀 실제 모델이 GPU에서 작동 중인지 확인하는 방법
Whisper 모델을 로딩한 뒤 이렇게 확인할 수 있어요: `services.py`
```python
asr = get_asr()  # Whisper 모델 불러오기
print("🔥 모델이 실행 중인 디바이스:", asr.model.device)
```
- 결과가 `cuda:0`이면 GPU 사용 중
- 결과가 `cpu`면 CPU 사용 중

결과:
```bash
🔥 모델이 실행 중인 디바이스: cuda:0
```

----
API가 잘 전송 되는지 curl 대신 Imsomnia를 사용하여 작업하는 방법

Insomnia란?
Insomnia는 Postman과 유사한 API 테스트 도구입니다.  
프론트엔드 없이도 백엔드 API를 직접 테스트할 수 있어서 Django REST API를 개발할 때 매우 유용합니다.

✅ 1단계: Body 설정 – `Form Data`로 전환
	POST 방식이면서 파일을 포함할 땐 반드시 `multipart/form-data`로 전송해야 합니다.

📌 설정 방법:
- `Body` 탭 클릭
- 하단 드롭다운에서 `Form Data` 선택  
    (자동으로 `multipart/form-data` 헤더 생성됨)
    
📷 예시 화면:
![[Pasted image 20260205093634.png]]


✅ 2단계: 실제 Form 필드 추가

|name|type|value|설명|
|---|---|---|---|
|`audio`|File|`sample_ko.wav` 등|🎤 업로드할 오디오 파일 (.wav/.mp3 등)|
|`src_lang`|Text|`auto` 또는 `ko/en`|🌍 번역 여부 판단 기준 (선택값)|
📷 예시 화면:
![[Pasted image 20260205094231.png]]

###### 💬 `src_lang` 설명 (선택값)
| 값      | 의미                 |
| ------ | ------------------ |
| `ko`   | 한국어이므로 **번역 안함**   |
| `en`   | 영어이면 **번역 시도함**    |
| `auto` | 자동 판단 (영어만 있으면 번역) |
✅ 3단계: 전송 후 응답 확인
💚 정상 응답 예시 (200 OK)
```json
{
  "src_lang": "auto",
  "stt_text": "안녕하세요 이 화일은 STT 테스트를 위한 한국어 음성 화일입니다",
  "ko_text": "안녕하세요 이 화일은 STT 테스트를 위한 한국어 음성 화일입니다",
  "used_translation": false
}
```




