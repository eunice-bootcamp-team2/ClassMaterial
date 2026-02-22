디렉토리 구조 + 파일별 역할
```
drf_speech/                   # 프로젝트 루트
├─ manage.py                  # Django 실행/관리 명령 진입점 (runserver, migrate 등)
├─ media/                     # (선택) 업로드/임시 저장 폴더 (개발용)
│
├─ mysite/                    # 프로젝트 설정(최상위)
│  ├─ settings.py             # 앱 등록, MEDIA, 템플릿 설정 등
│  └─ urls.py                 # 최상위 URL 라우팅 (speech.urls 포함, 루트 리다이렉트)
│
└─ speech/                    # 앱(기능 단위)
   ├─ urls.py                 # speech 앱 URL 매핑 (HTML page + API endpoint)
   ├─ views.py                # API 처리(View) + 화면 렌더링(record_page)
   ├─ serializers.py          # 입력 검증 전담 (audio/src_lang 검증)
   ├─ services.py             # 모델 로딩/추론/번역 로직(비즈니스 로직)
   └─ templates/
      └─ speech/
         ├─ base.html         # 공통 레이아웃(템플릿 상속 기반)
         └─ record.html       # 마이크 녹음 + fetch 업로드 + 결과 표시(UI)
```

### 파일들의 연결 관계

URL 연결(라우팅)
1. `mysite/urls.py`
    - `/api/` → `include("speech.urls")`
2. `speech/urls.py`
    - `record/` → `record_page` (HTML)
    - `api/stt-to-ko/` → `SttToKoAPIView` (API)

View ↔ Serializer ↔ Service 연결(역할 분리)
- `SttToKoAPIView.post()`
    - 입력 검증: `SttRequestSerializer(...).is_valid()`
    - 처리 로직 호출:
        - `safe_asr_transcribe(tmp_path)`
        - `maybe_translate_to_ko(src_lang, stt_text)`
- `services.py` 내부에서
    - `get_asr()` / `get_mt()`가 모델을 최초 1회만 만들고 재사용

Template ↔ API 연결(프론트→백엔드)
- `record.html`의 JS(fetch)가 API를 호출 → 응답 JSON 받아서 DOM에 표시

---
### ✅ serializer 코드가 하는 일

✔ 1. 요청 형식 검사
- audio 파일이 존재하는지 확인
- src_lang 값이 허용된 값인지 확인

✔ 2. 파일 안전성 검사
- 업로드된 audio 파일에 대해 파일 크기 제한 검사  
	→ 20MB 초과하면 거부
- 파일 확장자 검사  
	→ wav / mp3 / webm 등만 허용

✔ 3. 잘못된 요청 차단
- 조건 불만족 시:
	✔ View 로직 실행 전에 오류 발생  
	✔ 서버 처리 낭비 방지  
	✔ 보안 / 안정성 확보

아래 Serializer는 업로드 파일의 유효성 검사 전용 필터 역할을 합니다.

`8)` `speech/serializer`
```python
from pathlib import Path              # 파일 경로 / 확장자 처리를 위한 도구
from rest_framework import serializers # DRF Serializer 모듈


class SttRequestSerializer(serializers.Serializer):
    """
    ✅ 이 Serializer의 목적

    클라이언트가 multipart/form-data 형식으로 요청을 보낼 때
    들어오는 데이터를 검증(Validation)하기 위한 클래스

    기대 입력값:

    - audio    : 업로드 파일 (필수)
    - src_lang : 언어 옵션 (선택)

    src_lang 허용 값:
      - "ko"
      - "en"
      - "auto"
    """

    # ---------------------------------------------------------
    # ✅ 요청 데이터 필드 정의
    # ---------------------------------------------------------

    # 업로드 파일 필드
    # → 반드시 파일이 들어와야 함
    audio = serializers.FileField()

    # 선택 필드
    # ChoiceField = 지정된 값만 허용
    src_lang = serializers.ChoiceField(
        choices=["ko", "en", "auto"],  # 허용 가능한 값 목록
        default="auto",                # 값이 없으면 기본값 auto
        required=False,                # 필수 입력 아님
    )

    # ---------------------------------------------------------
    # ✅ 업로드 정책 설정 (검증 기준값)
    # ---------------------------------------------------------

    # 최대 업로드 허용 크기 (20MB)
    MAX_UPLOAD_BYTES = 20 * 1024 * 1024

    # 허용 가능한 파일 확장자 목록
    ALLOWED_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}

    # ---------------------------------------------------------
    # ✅ audio 필드 전용 검증 함수
    # ---------------------------------------------------------
    # 함수 이름 규칙:
    # validate_<필드명>()
    #
    # DRF가 자동으로 호출함
    # 개발자가 직접 실행 안 함 ⭐⭐⭐
    # ---------------------------------------------------------
    def validate_audio(self, f):
        """
        f = 실제 업로드된 파일 객체
        """

        # -----------------------------------------------------
        # 1️⃣ 파일 크기 검사
        # -----------------------------------------------------
        # getattr(f, "size", 0):
        # → 파일 객체에 size 속성이 없을 수도 있으므로 안전 접근
        size = getattr(f, "size", 0) or 0

        # 업로드 제한 초과 시 오류 발생
        if size > self.MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(
                f"파일이 너무 큽니다. 최대 {self.MAX_UPLOAD_BYTES // (1024 * 1024)}MB"
            )

        # -----------------------------------------------------
        # 2️⃣ 확장자 검사
        # -----------------------------------------------------
        # 업로드 파일 이름 가져오기
        name = getattr(f, "name", "") or ""

        # 확장자 추출 (.wav, .mp3 등)
        ext = Path(name).suffix.lower()

        # 확장자가 있고 허용 목록에 없으면 오류
        if ext and ext not in self.ALLOWED_EXTS:
            allow = ", ".join(sorted(self.ALLOWED_EXTS))

            raise serializers.ValidationError(
                f"지원하지 않는 파일 형식입니다. 허용: {allow}"
            )

        # 모든 검증 통과 → 파일 객체 그대로 반환
        return f
```

---
`2)` `speech/views.py` (처리 흐름만 담당 + tempfile로 최적화)
```python
# ============================================================
# ✅ [변경] import 구성 변경
# ------------------------------------------------------------
# (기존 03) uuid 사용 + settings.MEDIA_ROOT 저장 방식
# (수정 04) tempfile 사용 + Serializer 사용 + parser_classes 추가
# ============================================================

import os
import tempfile  # [추가] 임시파일 저장을 위한 모듈 (MEDIA_ROOT 저장 방식 대신 사용)
from pathlib import Path

from django.shortcuts import render  # [추가] record_page 템플릿 렌더링용

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework.parsers import MultiPartParser, FormParser  
# ✅ [추가] 업로드 요청 파싱 보장

from .serializers import SttRequestSerializer  
# ✅ [추가] 입력 검증을 Serializer로 이동

from .services import safe_asr_transcribe, maybe_translate_to_ko  
# (동일) 서비스 함수 호출


class SttToKoAPIView(APIView):
    """
    ✅ [동일 목적]
    업로드 → STT → (필요시 번역) → JSON 반환

    ✅ [변경 핵심]
    - 입력검증을 View에서 직접 하지 않고 Serializer로 위임한다.
    - 파일 저장을 MEDIA_ROOT 대신 tempfile(임시파일)로 처리한다.
    """

    # ✅ [추가] 업로드 요청을 제대로 파싱하기 위한 설정
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # -----------------------------------------------------
        # ✅ [삭제/이동됨] request.FILES.get("audio"), request.data.get("src_lang")
        # ✅ [대신 추가] Serializer로 입력 검증 + 데이터 추출
        # -----------------------------------------------------

        # ✅ [추가] Serializer에 request.data를 넣어서 검증
        # - 검증 실패하면 자동으로 400 응답 발생
        ser = SttRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # ✅ [추가] 검증 통과한 값만 가져오기
        audio = ser.validated_data["audio"]
        src_lang = ser.validated_data["src_lang"]

        # -----------------------------------------------------
        # ❌ [삭제됨] View 내부에서 하던 검증 코드들
        # -----------------------------------------------------
        # 기존 03에서 View가 직접 하던 것:
        # - if not audio: (파일 필수 체크)
        # - 파일 size 체크(MAX_UPLOAD_BYTES)
        # - 확장자 체크(ALLOWED_EXTS)
        #
        # ✅ 이검증들은 serializer.py의 validate_audio()로 이동하는 것이 "이단계의 핵심"
        # -----------------------------------------------------

        # -----------------------------------------------------
        # 🔁 [변경] 파일 저장 방식
        # -----------------------------------------------------
        # (기존 03)
        # - settings.MEDIA_ROOT에 uuid 파일명으로 저장
        # - os.makedirs(settings.MEDIA_ROOT) 필요
        #
        # (수정 04)
        # - tempfile.NamedTemporaryFile로 임시 파일 저장
        # - MEDIA_ROOT 오염 방지 + 정리 쉬움
        # -----------------------------------------------------
        original_name = getattr(audio, "name", "upload")
        ext = Path(original_name).suffix.lower() or ".wav"

        tmp_path = None
        try:
        
# ✅ [추가] 임시파일 생성 (delete=False로 해야 파일 경로를 다시 열어서 모델이 읽을 수 있음)
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                tmp_path = tmp.name
                for chunk in audio.chunks():
                    tmp.write(chunk)

            # ✅ [동일] STT 수행
            stt_text = safe_asr_transcribe(tmp_path) or ""

            # ✅ [동일] 번역 판단/수행
            ko_text, used_translation = maybe_translate_to_ko(src_lang, stt_text)
            final_text = (ko_text or "").strip() or stt_text

            # ✅ [동일] 응답 반환
            return Response(
                {
                    "src_lang": src_lang,
                    "stt_text": stt_text,
                    "ko_text": final_text,
                    "used_translation": bool(used_translation),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # ✅ [동일] 예외 발생 시 500 응답
            return Response(
                {"detail": "처리 중 오류가 발생했습니다.", "error": repr(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        finally:
            # [변경] 임시파일 삭제 대상이 save_path(uuid) → tmp_path(tempfile)로 변경됨
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass


# ============================================================
# ✅ [추가] record_page
# ------------------------------------------------------------
# (기존 03) 없음
# (수정 04) 템플릿 페이지를 렌더링하는 "일반 Django View" 추가
# ============================================================
def record_page(request):
    """
    ✅ [추가된 기능]
    - API(JSON) 응답이 아니라
    - HTML 페이지(녹음 UI)를 보여주는 Django 템플릿 렌더링 뷰

    record.html 안에서 JS(MediaRecorder + axios/fetch)가
    /api/stt-to-ko/ 로 업로드 요청을 보내게 된다.
    """
    return render(request, "speech/record.html")
```

`3)` `speech/urls.py` (HTML + API 분리)
```python
from django.urls import path
from .views import SttToKoAPIView, record_page

urlpatterns = [
    # HTML 페이지 (브라우저에서 접근)
    path("record/", record_page, name="speech-record"),

    # API (Insomnia/Fetch에서 호출)
    path("api/stt-to-ko/", SttToKoAPIView.as_view(), name="stt-to-ko"),
]
```

`mysite/urls.py` : 리다이렉트로 첫화면 뜨게 하기
```python
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect   # ✅ 추가

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("speech.urls")),

    # ✅ 루트 접속 시 /api/record/ 로 이동
    path("", lambda request: redirect("/api/record/")),
]

# 개발 중 업로드 파일 서빙
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```


