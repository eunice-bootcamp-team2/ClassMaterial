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
---
### ✅ services.py는 비즈니스 로직 함수이며 보통 이런식으로 발전하며

services.py의 8개 함수는 역할별로 쪼갠 것입니다.

1. 일단 STT만 되는 코드를 만든다
2. 번역도 붙인다
3. 번역이 필요한 경우만 번역하도록 조건이 생긴다
4. 매 요청마다 모델을 다시 로딩하면 너무 느려서 싱글톤(한 번만 로딩)으로 바꾼다
5. 동시에 요청이 여러 개 오면 중복 로딩 문제가 생겨서 락(lock)을 건다
6. 번역 모델 다운로드가 막히는 환경도 있어서 번역 실패해도 서버는 살아야 함 같은 예외처리가 붙는다

그래서 한 파일에 큰 함수 1개가 아니라, 안전하고 유지보수 쉬운 작은 함수들로 분리된겁니다.

---
#### 함수 8개 초간단 해석

1️⃣ `def _device()` : GPU 쓸지 CPU 쓸지 결정하는 함수
- GPU 있으면 → GPU 사용
- 없으면 → CPU 사용

2️⃣ `def contains_latin(text)` : 텍스트에 영어가 있는지 검사
- A, B, C 같은 알파벳 있으면 True

3️⃣ `def looks_like_korean(text)` : 텍스트에 한글이 있는지 검사
- 가, 나, 다 같은 한글 있으면 True

4️⃣ `def get_asr()` : STT 모델(Whisper) 불러오는 함수
- 처음 1번만 로딩
- 이후 계속 재사용

5️⃣ `def get_mt()` : 번역 모델 불러오는 함수
- 처음 1번만 로딩
- 실패하면 비활성화

6️⃣ `def safe_asr_transcribe(audio_path)` : 음성 파일 → 텍스트 변환
- 실제 STT 실행 담당

7️⃣ `def safe_translate_en_to_ko(text)` : 영어 텍스트 → 한국어 번역
- 번역 실행 담당
- 실패하면 원문 그대로 반환

8️⃣ `def maybe_translate_to_ko(src_lang, stt_text)` : 번역할지 말지 결정하는 함수
- ko → 번역 안 함
- en → 번역 시도
- auto → 영어 같으면 번역

역할만 보면 이렇게 그룹화됩니다.
✔ 환경 결정 → `_device()`  
✔ 언어 판단 → `contains_latin()`, `looks_like_korean()`  
✔ 모델 준비 → `get_asr()`, `get_mt()`  
✔ 실제 실행 → `safe_asr_transcribe()`, `safe_translate_en_to_ko()`  
✔ 최종 판단 → `maybe_translate_to_ko()`

---
`7)` 모델 로더 만들기 (서버 실행 중 1번만 로드되게) `speech/services.py` 생성
```python
import re
import threading
import torch
from transformers import pipeline

# =========================================================
# ✅ [Config] 사용할 Hugging Face 모델 ID
# ---------------------------------------------------------
# ASR_MODEL_ID: Whisper 기반 STT(음성→텍스트) 모델
# MT_MODEL_ID : 영어→한국어 번역 모델 (Machine Translation)
# =========================================================
ASR_MODEL_ID = "AventIQ-AI/whisper_small_Automatic_speech_recognition"
MT_MODEL_ID = "Helsinki-NLP/opus-mt-en-ko"


# =========================================================
# ✅ [Lazy singletons] "한 번만 로딩하고 계속 재사용"하기 위한 전역 변수들
# ---------------------------------------------------------
# - pipeline(model)은 로딩 시간이 크고 메모리를 많이 씀
# - 요청마다 새로 만들면 엄청 느려지고 서버가 터질 수 있음
# - 그래서 최초 1회만 만들고(_asr/_mt), 이후에는 계속 재사용한다.
# =========================================================
_asr = None                 # Whisper ASR 파이프라인 인스턴스 (처음엔 없음)
_mt = None                  # 번역 파이프라인 인스턴스 (처음엔 없음)
_mt_available = True        # 번역 로딩 실패 시 False로 내려 "계속 재시도 폭주" 방지

# =========================================================
# ✅ [Thread Lock] 동시에 여러 요청이 들어올 때
# ---------------------------------------------------------
# - 여러 스레드가 동시에 get_asr(), get_mt()를 호출하면
#   pipeline이 중복 생성될 수 있음 (메모리/시간 낭비 + 오류 가능)
# - lock으로 "한 번만" 생성되도록 안전하게 막는다.
# =========================================================
_lock = threading.Lock()


def _device():
    """
    ✅ HF pipeline의 device 인덱스 선택
    - GPU 사용 가능하면 device=0 (첫 번째 GPU)
    - GPU 없으면 device=-1 (CPU)
    """
    return 0 if torch.cuda.is_available() else -1


# =========================================================
# ✅ [Text Helpers] STT 결과 텍스트를 보고 "번역이 필요한지" 판단하는 도우미
# =========================================================

# 라틴 문자(영어 알파벳)가 포함되어 있는지 검사하기 위한 정규식
_LATIN_RE = re.compile(r"[A-Za-z]")


def contains_latin(text: str) -> bool:
    """
    ✅ 텍스트 안에 영어 알파벳(A-Z)이 하나라도 있으면 True
    예) "hello" -> True, "안녕" -> False
    """
    return bool(_LATIN_RE.search(text or ""))


def looks_like_korean(text: str) -> bool:
    """
    ✅ 텍스트 안에 한글(가~힣)이 하나라도 있으면 True
    예) "안녕" -> True, "hello" -> False
    """
    return any("가" <= ch <= "힣" for ch in (text or ""))


# =========================================================
# ✅ [Pipelines] 모델 로딩 (Whisper / 번역 모델)
# - 핵심: "singleton(한 번만 생성)" + "thread-safe(락으로 안전)"
# =========================================================

def get_asr():
    """
    ✅ Whisper ASR pipeline을 싱글톤으로 반환
    - ASR은 음성을 텍스트로 바꾸는 기술
    - 이미 로딩되어 있으면 그대로 반환
    - 없으면 한 번만 pipeline을 생성해서 저장 후 반환
    """
    global _asr

    # 이미 생성되어 있으면 즉시 반환
    if _asr is not None:
        return _asr

    # 아직 없으면 lock 잡고 한 번만 생성
    with _lock:
        if _asr is None:
            _asr = pipeline(
                task="automatic-speech-recognition",  # STT 태스크
                model=ASR_MODEL_ID,       # Whisper 모델
                device=_device(),         # GPU 있으면 GPU, 없으면 CPU
            )

    return _asr


def get_mt():
    """
    ✅ EN->KO 번역 파이프라인(싱글톤)

    왜 예외 처리가 있나?
    - 어떤 환경에서는 huggingface.co 접근이 막혀서 모델 다운로드 실패 가능
    - 번역은 '선택 기능'이므로,
      번역이 안 된다고 서버 전체가 죽으면 안 됨
    - 그래서 한 번 실패하면 _mt_available=False로 내리고,
      이후 요청에서 계속 다운로드 재시도를 하지 않게 막는다.
    """
    global _mt, _mt_available

    # 번역이 "비활성화"된 상태면 None 반환 (재시도 폭주 방지)
    if not _mt_available:
        return None

    # 이미 생성되어 있으면 반환
    if _mt is not None:
        return _mt

    with _lock:
        # double-check + 아직 번역 사용 가능한 상태일 때만 생성 시도
        if _mt is None and _mt_available:
            try:
                _mt = pipeline(
                    task="translation_en_to_ko",  # 영어→한국어 번역 태스크
                    model=MT_MODEL_ID,            # 번역 모델
                    device=_device(),             # GPU/CPU 선택
                )
            except Exception as e:
                # ✅ 번역 로딩 실패 시: 서버는 살아야 하므로 번역만 비활성화
                print("⚠️ MT pipeline disabled:", repr(e))
                _mt_available = False
                _mt = None

    return _mt


# =========================================================
# ✅ [Core Functions] 실제 STT / 번역 실행
# =========================================================

def safe_asr_transcribe(audio_path: str) -> str:
    """
    ✅ STT(음성→텍스트) 안정 버전

    - audio_path(파일 경로)를 pipeline에 직접 넣는 방식이 안정적임
    - 반환 형식이 dict일 수도 있고, 아닐 수도 있어서 방어 코드 포함
    """
    if not audio_path:
        return ""

    asr = get_asr()          # Whisper pipeline 가져오기(없으면 생성)
    out = asr(audio_path)    # STT 실행

    # pipeline 결과가 보통 {"text": "..."} 형태로 옴
    if isinstance(out, dict) and "text" in out:
        return (out["text"] or "").strip()

    # 혹시 예상과 다른 형태면 문자열로 변환해서 반환
    return str(out).strip()


def safe_translate_en_to_ko(text: str) -> str:
    """
    ✅ EN->KO 번역 안정 버전

    - 번역 모델이 없거나(비활성) 실패하면 원문 그대로 반환
    - 번역은 옵션 기능이므로, 실패해도 서버는 정상 응답해야 함
    """
    if not text:
        return text

    mt = get_mt()        # 번역 pipeline 가져오기
    if mt is None:
        return text      # 번역이 비활성화이면 원문 반환

    try:
        out = mt(text)   # 번역 실행

        # 보통 리스트 형태: [{"translation_text": "..."}]
        if isinstance(out, list) and out:
            return (
                out[0].get("translation_text")  # 가장 흔한 키
                or out[0].get("generated_text") # 모델에 따라 다른 키
                or out[0].get("text")           # 또 다른 케이스
                or text                         # 다 없으면 원문 반환
            )

        return text

    except Exception as e:
        print("⚠️ Translation error:", repr(e))
        return text


def maybe_translate_to_ko(src_lang: str, stt_text: str):
    """
    ✅ "번역을 할지 말지" 결정하는 함수

    입력:
    - src_lang : 사용자가 지정한 언어 ("ko", "en", "auto")
    - stt_text : STT 결과 텍스트

    출력:
    - (ko_text, used_translation)
      ko_text: 최종 한국어 텍스트(번역 or 원문)
      used_translation: "진짜 번역이 수행되어 결과가 달라졌을 때"만 True

    번역 규칙:
    1) src_lang == "ko"  -> 번역 금지 (한국어는 전사만)
    2) src_lang == "en"  -> 번역 시도
    3) src_lang == "auto"-> STT 결과에 영어가 있고(알파벳),
                             한글이 없으면 번역 시도
    """
    stt_text = (stt_text or "").strip()
    src = (src_lang or "auto").strip().lower()

    # 기본값: 번역 안 하고 STT 결과 그대로 사용
    ko_text = stt_text
    used_translation = False

    # STT 결과가 없으면 빈 값 반환
    if not stt_text:
        return "", False

    # 1) 사용자가 ko라고 지정하면 번역하지 않는다
    if src == "ko":
        return ko_text, False

    # 2) 번역을 시도해야 하는지 결정
    if src == "en":
        # 영어라고 명시했으면 무조건 번역 시도
        should_translate = True
    else:
        # auto: 알파벳이 있고, 한글이 없으면 "영어로 판단" → 번역 시도
        should_translate = contains_latin(stt_text) and not looks_like_korean(stt_text)

    # 번역 대상이 아니면 그대로 반환
    if not should_translate:
        return ko_text, False

    # 3) 실제 번역 실행
    translated = safe_translate_en_to_ko(stt_text).strip()

    # 4) "번역이 성공했다"의 기준
    # - 번역 결과가 비어있지 않고
    # - 번역 결과가 원문과 달라야 함
    # (실패 시 원문 반환하도록 되어 있기 때문에, 같으면 실패로 본다)
    if translated and translated != stt_text:
        return translated, True

    # 번역 실패(또는 변화 없음) -> 원문 그대로
    return stt_text, False
```

---
### ✅ serializer 코드가 하는 일
	API로 들어오는 입력값을 검사(검증) + 정리(표준화)해서 View가 바로 쓰게 만들어주는 필터

Serializer가 해주는 것
- 필수값 체크: audio가 없으면 에러
- 형식 체크: audio가 파일인지, src_lang이 허용값인지
- 정책 체크(리팩토링 때 추가): 파일 용량/확장자 제한
- 정리(표준화): src_lang이 없으면 auto로 기본값 넣어줌
    
즉 View는 검증에서 해방되고, 처리 흐름만 관리하게 됩니다.

아래 코드 코드의 목표는 끝까지 동작하는지 먼저 확인 (업로드 → STT → 번역 → 응답)

초반부터 검증을 빡세게 넣으면:
- 작은 실수(확장자, 용량, 폼 이름)로 계속 막힘
- 핵심 기능(STT/번역)이 동작하는지 확인이 늦어짐

`8)` `speech/serializer`
```python
from rest_framework import serializers


class SttRequestSerializer(serializers.Serializer):
    """
    ✅ [02단계: 최소 버전 Serializer]

    목적:
    - multipart/form-data 요청에서 어떤 필드가 들어오는지만 '정의'한다.
    - 02단계에서는 동작 확인이 목표라서,
      파일 용량/확장자 같은 강한 검증은 아직 넣지 않는다.
      (그런 검증은 다음단계 역할분리에서 Serializer가 검증 전담이 될 때 붙인다.)

    입력:
    - audio    : 음성 파일 (필수)
    - src_lang : 'ko' | 'en' | 'auto' (선택, 기본값 auto)
    """

    # ✅ 업로드 파일(필수)
    # FileField 자체가 "파일이 있어야 함"을 기본으로 체크해줌
    audio = serializers.FileField()

    # ✅ 언어 옵션(선택)
    # choices로 허용값을 제한 → 이상한 값이 들어오면 자동으로 400 처리됨
    src_lang = serializers.ChoiceField(
        choices=["ko", "en", "auto"],
        default="auto",
        required=False,
    )

    # ---------------------------------------------------------
    # ✅ [다음단계에서 추가할 예정인 것들]
    # - 파일 크기 제한(MAX_UPLOAD_BYTES)
    # - 확장자 제한(ALLOWED_EXTS)
    # - validate_audio()로 검증 전담 처리
    # ---------------------------------------------------------
```

---
### ✅ View의 역할
	브라우저에서 업로드된 음성 파일을 받아서 AI 처리(STT / 번역)를 수행하고 JSON 결과를 
	돌려주는 처리를 담당

###### View가 하는 가장 중요한 일:

Django / DRF 구조에서 View의 역할은 딱 이것입니다:
✔ 요청(Request)을 받는다  
✔ 필요한 처리 로직을 호출한다  
✔ 응답(Response)을 반환한다

아래 코드에서 실제 수행하는 작업:
① 클라이언트 요청 받기
② 업로드 데이터 꺼내기
	✔ 음성 파일 (`request.FILES`)  
	✔ 옵션 값 (`request.data`) 읽기.
③ 안전성 검사 (방어 로직)
서버 보호 목적:
	✔ 파일 존재 여부 검사  
	✔ 파일 크기 제한  
	✔ 확장자 제한
	✔ 잘못된 요청이면 즉시 차단 (400 에러)
④ 서버 임시 저장
	✔ Whisper 모델은 파일 경로 기반 처리가 가장 안정적이기 때문
	✔ 업로드 파일 → 서버 디스크에 잠깐 저장
⑤ AI 처리 호출
	 ✔ View는 서비스 함수 호출만 함
⑥ JSON 응답 생성
브라우저가 사용할 수 있는 형태로 변환:
```
{  
"stt_text": "...",  
"ko_text": "...",  
"used_translation": true  
}
```
⑦ 임시 파일 삭제
디스크 관리 목적:
	✔ 처리 후 항상 삭제  
	✔ 서버 저장소 오염 방지

---
`9)` DRF APIView 만들기 (음성 업로드 → 한국어 텍스트 반환)
`speech/views.py`
```python
import os
import uuid
from pathlib import Path

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# ✅ services.py에 있는 핵심 함수들
# - safe_asr_transcribe: 저장된 음성 파일 경로를 넣으면 STT 결과 텍스트 반환
# - maybe_translate_to_ko: src_lang 규칙에 따라 번역을 할지 말지 판단 후 (ko_text, used_translation) 반환
from .services import safe_asr_transcribe, maybe_translate_to_ko


class SttToKoAPIView(APIView):
    """
    ✅ 이 API의 목적
    - 사용자가 multipart/form-data 로 음성 파일(audio)을 업로드하면,
      1) 서버에 임시로 저장하고
      2) Whisper로 STT(음성→텍스트)를 수행하고
      3) 필요하면 영어→한국어 번역까지 수행하여
      4) JSON으로 결과를 반환한다.

    ✅ src_lang 동작 규칙
    - src_lang=ko   : 번역 금지 (한국어 음성은 STT만)
    - src_lang=en   : 번역 시도 (영어라고 명시했으니 번역)
    - src_lang=auto : STT 결과 텍스트 패턴(영어/한글 포함 여부)로 번역 여부 판단
    """

    # ---------------------------------------------------------
    # ✅ 업로드 제한 설정(선택 기능)
    # ---------------------------------------------------------
    # 너무 큰 파일이 들어오면 서버가 느려지거나 메모리/디스크가 터질 수 있으므로 제한을 둔다.
    MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB

    # 업로드 가능한 확장자 제한(선택 기능)
    # 필요에 따라 정책적으로 확장/축소 가능
    ALLOWED_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}

    def post(self, request):
        """
        ✅ 클라이언트가 POST 요청을 보낼 때 실행되는 함수
        - request.FILES: 업로드된 파일들이 들어오는 곳 (multipart/form-data일 때)
        - request.data : 폼 데이터(텍스트)들이 들어오는 곳
        """

        # ---------------------------------------------------------
        # 0) 요청에서 데이터 꺼내기
        # ---------------------------------------------------------

        # ✅ 업로드된 음성 파일 (폼에서 name="audio"로 보내야 함)
        audio = request.FILES.get("audio")

        # ✅ src_lang 값 (없으면 auto 기본값)
        # - strip(): 앞뒤 공백 제거
        # - lower(): 대문자 들어와도 소문자로 통일
        src_lang = (request.data.get("src_lang") or "auto").strip().lower()

        # ---------------------------------------------------------
        # 1) 입력 검증: 파일이 없으면 바로 400 응답
        # ---------------------------------------------------------
        if not audio:
            return Response(
                {"detail": "audio 파일이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # 2) 용량 체크(선택)
        # ---------------------------------------------------------
        # getattr(audio, "size", 0): audio.size가 없을 수도 있으니 안전하게 꺼내기
        # audio.size가 MAX_UPLOAD_BYTES보다 크면 업로드 거절
        if getattr(audio, "size", 0) and audio.size > self.MAX_UPLOAD_BYTES:
            return Response(
                {
                    "detail": f"파일이 너무 큽니다. 최대 {self.MAX_UPLOAD_BYTES // (1024 * 1024)}MB" # // 나눗셈 연산자로 소수점은 버리고 정수만 남긴다는 뜻
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # 3) 확장자 체크(선택)
        # ---------------------------------------------------------
        # 원래 파일명에서 확장자를 뽑아 검사
        original_name = getattr(audio, "name", "upload")
        ext = Path(original_name).suffix.lower()

        # ext가 있고(ext="")가 아니고, 허용 목록에 없으면 거절
        if ext and ext not in self.ALLOWED_EXTS:
            return Response(
                {
                    "detail": f"지원하지 않는 파일 형식입니다. 허용: {sorted(self.ALLOWED_EXTS)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---------------------------------------------------------
        # 4) 저장 경로 준비 (임시 파일 저장)
        # ---------------------------------------------------------
        # settings.MEDIA_ROOT 경로가 없을 수도 있으니 폴더 생성
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

        # ✅ 파일명 충돌 방지:
        # - 같은 이름의 파일이 동시에 들어오면 덮어쓰기 위험이 있음
        # - uuid로 랜덤 파일명을 만들어 충돌을 막음
        safe_name = f"{uuid.uuid4().hex}{ext or '.wav'}"

        # 최종 저장 경로: MEDIA_ROOT/랜덤파일명.wav
        save_path = os.path.join(settings.MEDIA_ROOT, safe_name)

        # ---------------------------------------------------------
        # 5) 저장 → STT/번역 처리 → 응답 → 항상 파일 삭제
        # ---------------------------------------------------------
        try:
            # ✅ 업로드 파일을 서버 디스크에 저장
            # audio.chunks():큰파일도 메모리에 한번에 올리지않고 조각(chunk)단위로 저장가능
            with open(save_path, "wb") as f:
                for chunk in audio.chunks():
                    f.write(chunk)

            # ✅ 1) STT 수행 (음성 파일 경로를 넘김)
            stt_text = safe_asr_transcribe(save_path) or ""

            # ✅ 2) 필요 시 번역 수행
            # maybe_translate_to_ko는 (ko_text, used_translation)을 반환
            ko_text, used_translation = maybe_translate_to_ko(src_lang, stt_text)

            # ko_text가 비어있다면 fallback으로 stt_text 사용
            ko_text = ko_text or stt_text

            # ✅ 3) 최종 JSON 응답 반환
            return Response(
                {
                    "src_lang": src_lang,    # 입력으로 받은 언어 옵션
                    "stt_text": stt_text,    # STT 결과(원문 텍스트)
                    "ko_text": ko_text,      # 최종 한국어 텍스트(번역 또는 원문)
                    "used_translation": bool(used_translation),#실제 번역이 수행됐는지
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # -----------------------------------------------------
            # ✅ 처리 중 예외(에러)가 났을 때
            # - 서버가 죽지 않도록 try/except로 막음
            # - 로그를 남기고, 클라이언트에겐 깔끔한 메시지 반환
            # -----------------------------------------------------
            return Response(
                {"detail": "처리 중 오류가 발생했습니다.", "error": repr(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        finally:
            # -----------------------------------------------------
            # ✅ finally는 "성공/실패 상관없이 무조건 실행"됨
            # - 임시로 저장한 음성 파일을 삭제해서 디스크가 쌓이지 않게 함
            # - 삭제 중 오류가 나도 서버가 죽지 않도록 try/except
            # -----------------------------------------------------
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

방법1]  내 경로에서 wsl 폴더 열기
```bash
explorer.exe .
```
탐색기가 열리면 녹화된 음성파일을 wsl 프로젝트 안에 드레그해서 복사합니다.

---
방법2] 전송 경로를 다운로드로 지정했을 경우

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

---
### m4a → wav 변환

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
### 이 API는 Django 서버(runserver)가 실행 중일 때만 curl 테스트가 가능합니다.

curl 테스트란?
터미널에서 API 요청을 보내는 가장 기본적인 도구입니다. 
즉, curl은 브라우저 없이 터미널에서 API를 직접 호출하는 테스트 명령어입니다.

왜 사용하는가?
- 서버가 정상 동작하는지 확인
- JSON 응답 확인
- 파라미터 전달 테스트
- 파일 업로드 테스트
- 빠른 디버깅

Insomnia / Postman과의 차이
- Insomnia → GUI 도구 (버튼 클릭) 
- curl → CLI 도구 (명령어 한 줄)
- 기능은 거의 동일, 사용 방식만 다름

---
`1)` src_lang=ko
- 한국어 음성은 그대로 전사(STT)만 수행됩니다.
- 번역은 수행되지 않습니다.
```bash
안녕하세요 이 파일은 STT 테스트를 위한 한국어 음성 파일입니다


curl -s -X POST "http://127.0.0.1:8000/api/stt-to-ko/" \
  -F "audio=@sample_ko.wav" \
  -F "src_lang=ko" ; echo
```
이 명령의 의미: 로컬에서 실행 중인 Django 서버에 음성 파일을 업로드하는 POST 요청

---
### 위의 curl 명령어 분석

✅ 구성 요소 하나씩 분석

✔ 1️⃣ `curl`
- HTTP 요청을 보내는 터미널 도구
- 브라우저 없이 API 테스트 가능
 
✔ 2️⃣ `-s` (silent)
- 진행 로그 숨김
- 응답(JSON)만 깔끔하게 출력
- 없으면 다운로드 진행 표시 등 잡다한 메시지 나옴

✔ 3️⃣ `-X POST`
- 요청 방식 지정
- POST = 데이터를 서버로 보냄
- API 호출 시 가장 흔한 방식

✔ 4️⃣ `"http://127.0.0.1:8000/api/stt-to-ko/"`
- 요청 대상 주소(URL)
- 현재 실행 중인 Django 서버
의미:
- 내 컴퓨터의 서버 → /api/stt-to-ko/ 엔드포인트 호출

✔ 5️⃣ `-F "audio=@sample_ko.wav"`

가장 중요한 부분 ⭐
의미:
- `-F` → form-data 방식 전송 (파일 업로드용)
- `audio` → 서버에 전달될 필드 이름
- `@sample_ko.wav` → 실제 파일 첨부
즉: sample_ko.wav 파일을 audio라는 이름으로 서버에 전송

✔ 6️⃣ `-F "src_lang=ko"`
- 추가 파라미터 전달
- src_lang 값으로 ko 전달
의미: 이 음성은 한국어입니다

7️⃣ `; echo`
- 출력 줄바꿈용 트릭
- 터미널 보기 좋게 정리
- 기능상 중요하지 않음

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
### API가 잘 전송 되는지 curl 대신 Imsomnia를 사용하여 작업하는 방법

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




