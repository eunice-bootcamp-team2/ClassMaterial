`1)` `speech/serializers.py` (입력 검증 전담)
```python
from pathlib import Path
from rest_framework import serializers


class SttRequestSerializer(serializers.Serializer):
    """
    multipart/form-data:
      - audio: File
      - src_lang: 'ko' | 'en' | 'auto'
    """
    audio = serializers.FileField()
    src_lang = serializers.ChoiceField(
        choices=["ko", "en", "auto"],
        default="auto",
        required=False,
    )

    # 정책값(원하면 settings.py로 빼도 됨)
    MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB
    ALLOWED_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}

    def validate_audio(self, f):
        # 1) 용량 체크
        size = getattr(f, "size", 0) or 0
        if size > self.MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(
                f"파일이 너무 큽니다. 최대 {self.MAX_UPLOAD_BYTES // (1024 * 1024)}MB"
            )

        # 2) 확장자 체크
        name = getattr(f, "name", "") or ""
        ext = Path(name).suffix.lower()
        if ext and ext not in self.ALLOWED_EXTS:
            allow = ", ".join(sorted(self.ALLOWED_EXTS))
            raise serializers.ValidationError(f"지원하지 않는 파일 형식입니다. 허용: {allow}")

        return f
```

`2)` `speech/views.py` (처리 흐름만 담당 + tempfile로 최적화)
```python
import os
import tempfile
from pathlib import Path

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import SttRequestSerializer
from .services import safe_asr_transcribe, maybe_translate_to_ko


class SttToKoAPIView(APIView):
    """
    audio 업로드 → STT → (필요 시) 번역 → JSON 응답
    """
    parser_classes = [MultiPartParser, FormParser]  # ✅ multipart 받기

    def post(self, request):
        # 1) 입력 검증 (Serializer가 담당)
        ser = SttRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        audio = ser.validated_data["audio"]
        src_lang = ser.validated_data["src_lang"]

        # 2) 임시 파일로 저장 (MEDIA_ROOT 오염 방지 + 자동 정리 쉬움)
        original_name = getattr(audio, "name", "upload")
        ext = Path(original_name).suffix.lower() or ".wav"

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                tmp_path = tmp.name
                for chunk in audio.chunks():
                    tmp.write(chunk)

            # 3) STT
            stt_text = safe_asr_transcribe(tmp_path) or ""

            # 4) 번역 판단/수행
            ko_text, used_translation = maybe_translate_to_ko(src_lang, stt_text)
            final_text = (ko_text or "").strip() or stt_text

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
            # 서버 로그에는 traceback이 찍히고, 응답은 깔끔하게
            return Response(
                {"detail": "처리 중 오류가 발생했습니다.", "error": repr(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        finally:
            # 5) 임시 파일 정리
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass


def record_page(request):
    """
    음성 녹음 + 번역 테스트 UI 페이지
    templates/speech/record.html
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


