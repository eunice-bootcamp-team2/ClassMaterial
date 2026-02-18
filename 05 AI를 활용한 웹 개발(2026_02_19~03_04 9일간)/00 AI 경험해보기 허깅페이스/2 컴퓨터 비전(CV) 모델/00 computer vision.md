1️⃣ Hugging Face에서 검색할 때 Task(작업) 기준 키워드

Hugging Face에서 모델 찾을 때는 모델명보다 Task 키워드로 검색하는 게 정답입니다.

---

2️⃣ CV 주요 기능별 검색어 + DRF 응답 형태 + 어디에 쓰는지

① Image Classification (이미지 분류)

🔍 검색어
```
image-classification
```

🧠 기능
- 이미지 전체를 하나의 라벨로 분류 (예: 고양이/강아지, 정상/불량, 음식 종류)

✅ DRF에서의 응답(JSON 예시)
```json
{
  "task": "image-classification",
  "predictions": [
    {"label": "cat", "score": 0.98},
    {"label": "dog", "score": 0.01}
  ]
}
```

💡 언제 쓰면 최고?
- 가장 쉽고 안정적 (입문/포트폴리오/서비스 MVP)

---
② Object Detection (객체 탐지)

🔍 검색어
```
object-detection
```

🧠 기능
- 이미지 안의 여러 객체 + 위치(box) 찾기

✅ DRF 응답(JSON 예시)
```json
{
  "task": "object-detection",
  "detections": [
    {
      "label": "person",
      "score": 0.93,
      "box": {"xmin": 0.12, "ymin": 0.10, "xmax": 0.45, "ymax": 0.88}
    }
  ]
}
```

💡 어디에 쓰나?
- CCTV, 상품 위치 표시, 차량/사람 카운팅, 안전장비 착용 탐지

> 포인트: 프론트에서 box를 그리려면 정규화 좌표(0~1)로 주는 게 편함.

---
③ Image Segmentation (이미지 분할)

🔍 검색어
```
image-segmentation
semantic-segmentation
instance-segmentation
```

🧠 기능
- 픽셀 단위로 영역을 나눔 (배경 제거, 사람/물체 마스크)
    
✅ DRF 응답 형태 2가지

1. 마스크 이미지를 파일/URL로 반환 (추천)
```json
{
"task":"image-segmentation",
"mask_image_url":"/media/masks/abc.png"
}
```

2. 마스크를 배열/압축 데이터로 반환(비추천: 무거움)

💡 어디에 쓰나?
- 배경 제거, 인물/제품 컷아웃, 의료 영상, 결함 영역 표시

---
④ OCR (문자 인식)

🔍 검색어
```
ocr
text-recognition
document-understanding
```

🧠 기능
- 이미지 속 텍스트 추출
    (영수증, 명함, 문서)
    

✅ DRF 응답(JSON 예시)
```json
{
  "task": "ocr",
  "text": "Total: 12,900\\nDate: 2026-02-03",
  "blocks": [
    {"text": "Total: 12,900", "box": {"xmin": 0.1, "ymin": 0.2, "xmax": 0.6, "ymax": 0.25}}
  ]
}
```

💡 어디에 쓰나?
- 영수증 자동입력, 문서 검색/요약, 자동 DB 입력 파이프라인

---
⑤ Image-to-Text (이미지 설명 생성 / 캡셔닝)

🔍 검색어
```
image-to-text
image-captioning
```

기능
- 이미지를 자연어 문장으로 설명

✅ DRF 응답(JSON 예시)
```json
{
"task":"image-to-text",
"caption":"A cat sitting on a sofa."
}
```

💡 어디에 쓰나?
- 접근성(ALT 텍스트), SNS 자동 설명, 사진 검색 태깅

---
⑥ Face 관련 (주의)

🔍 검색어
```
face-detection
face-recognition
```

기능
- 얼굴 위치 탐지 / (인식은 개인정보 이슈 큼)

✅ DRF에서 권장
- face-recognition(누구인지 식별) 은 피하고
- face-detection(얼굴 위치만) 정도로 제한하는 경우가 많음

---
3️⃣ DRF로 붙이기 쉬운 순서(실전 추천)

1순위: 이미지 분류
```
image-classification
```
- 제일 단순
- 성능/속도도 무난
- JSON 응답 깔끔

2순위: OCR / 이미지 캡셔닝
```
ocr
image-to-text
```
- 텍스트 결과라 DB 저장/검색/서비스화 쉬움

3순위: Object Detection
```
object-detection
```
- 프론트에서 박스 시각화 필요
- 그래도 임팩트 큼

---
4️⃣ Hugging Face 모델 고를 때 DRF 관점 체크리스트

✅ 1) pipeline로 바로 되는지 (제일 중요)

- 모델 페이지에 Use in Transformers / pipeline 예시가 있으면 좋음
- Task에 맞게 `pipeline("image-classification")` 같은 형태로 사용 가능하면 베스트

✅ 2) License 확인 (상업/배포 가능성)

- `Apache-2.0`, `MIT`, `BSD`, `CC-BY` 계열은 대체로 OK
- 아래는 조심:
    - `non-commercial`
    - `research only`
    - `no redistribution`

✅ 3) 모델 크기 / 속도

- DRF 서버에 붙이면 응답 시간이 UX를 좌우합니다.
- CPU 서버면 MobileNet/작은 ViT 계열이 현실적

✅ 4) 입력 타입

- 이미지 1장인지, 문서/멀티페이지인지 확인

---
5️⃣ DRF에서 API 엔드포인트는 이렇게 잡는 게 깔끔함

추천 구조:
- `POST /api/v1/vision/classify/`
- `POST /api/v1/vision/detect/`
- `POST /api/v1/vision/ocr/`
- `POST /api/v1/vision/caption/`

요청:
- `multipart/form-data` 로 `image` 업로드

응답:
- 위에서 말한 JSON 포맷