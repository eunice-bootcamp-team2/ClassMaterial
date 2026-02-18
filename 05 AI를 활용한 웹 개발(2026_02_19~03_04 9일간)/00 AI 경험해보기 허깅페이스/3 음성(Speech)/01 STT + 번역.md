🔗 https://huggingface.co/AventIQ-AI/whisper_small_Automatic_speech_recognition

위 모델의 핵심 요약:
✔️ 해당 모델(`AventIQ-AI/whisper_small_Automatic_speech_recognition`)은 Whisper Small 
기반의 STT(음성 → 텍스트) 모델입니다.  

❗ 이 모델은 번역까지 직접 해주는 모델이 아닙니다.  
→ 영어 음성을 바로 한글로 번역해주는 기능은 지원하지 않음.

따라서 DRF API 구성은 아래처럼 됩니다.
✔️ 1) 음성 → 텍스트 (STT)
```
영어 음성 → English text
한국어 음성 → Korean text
```
	이건 그대로 잘 작동합니다.

✔️ 2) STT 결과 → (원하면) 번역 모델로 한글 번역
```
English text → Korean text
```
	이 부분은 번역 모델이 별도로 필요하기 때문에 다른 모델을 API로 연결해야 합니다.

따라서 최종 목표인  
`음성 → 한국어 텍스트`를 만들려면 2단계 파이프라인이 필요합니다
```
input audio
   ↓ Whisper-ASR (STT)
text output (en/ko)
   ↓ translation model
final output (ko unified)
```

---
### DRF 구조 구성

`1)` Whisper 모델 로딩
- 서버 시작 시 한 번만 로딩
- 캐시된 모델로 여러 요청 처리
    
`2)` File Upload
- POST로 wav/mp3 업로드
- 서버에서 임시 저장 또는 메모리 처리
    
`3)` STT 처리
- Whisper로 텍스트 생성
```python
result = asr_pipeline(audio_file)
text = result["text"]
```

`4)` 번역 요청 (선택)
- 영어 텍스트 → 한국어 텍스트
```python
result = translation_pipeline(text)
```

---



