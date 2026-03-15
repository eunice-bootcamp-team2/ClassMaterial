1️⃣ Django / DRF 쪽
- 로그인, 리뷰 저장, 제품 조회
- 사용자가 리뷰를 작성하면
- 그 리뷰 텍스트를 FastAPI로 보내기
- FastAPI가 준 분석 결과를 DB에 저장하기
    

2️⃣ FastAPI 쪽
- 모델 로딩
- 추론
- 결과 반환

전체 흐름
```
사용자
 → Django/DRF API
 → 리뷰 저장
 → Django ai_gateway/services.py
 → FastAPI /predict/sentiment 호출
 → FastAPI가 모델 추론
 → Django가 결과 받음
 → ReviewAIResult 저장
 → 사용자에게 응답
```

`backend/apps/ai_gateway/serializers.py` : 프론트에서 받을 입력 검증
```python

```

`backend/apps/ai_gateway/services.py` : FastAPI 서버 호출
```python
import requests
from django.conf import settings


class FastAPIClient:
    """
    FastAPI AI 서버 호출용 클라이언트
    """

    @staticmethod
    def analyze_sentiment(text: str) -> dict:
        url = f"{settings.FASTAPI_BASE_URL}/api/v1/sentiment/predict"

        payload = {
            "text": text
        }

        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
```

`backend/apps/ai_gateway/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import FastAPIClient


class SentimentPredictAPIView(APIView):
    """
    Django -> FastAPI 감정분석 요청
    """

    def post(self, request):
        text = request.data.get("text")

        if not text:
            return Response(
                {"detail": "text 값이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = FastAPIClient.analyze_sentiment(text)
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```
- 요청 받기
- serializer 검증
- service 호출
- 필요하면 DB 저장

`backend/apps/ai_gateway/urls.py`
```python

```
- `/ai/sentiment/`
- `/ai/keywords/`
- `/ai/reviews/<id>/analyze/`

---
### FastAPI

폴더 및 파일 생성
```bash
cd ../ai-server
mkdir -p api schemas models services
```

```bash
touch api/sentiment.py \
schemas/sentiment_schema.py \
models/sentiment_model.py \
services/inference.py \
```

```
ai-server/
├── main.py
├── api/
│   └── sentiment.py
├── schemas/
│   └── sentiment_schema.py
├── models/
│   └── sentiment_model.py
└── services/
    └── inference.py
```

`ai-server/schemas/sentiment_schema.py`
```python
# ai-server/schemas/sentiment_schema.py

from pydantic import BaseModel


class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    label: str
    score: float
```

모델 로딩/추론
`ai-server/models/sentiment_model.py`
```python
from transformers import pipeline


sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
```

서비스
`ai-server/services/inference.py`
```python
from models.sentiment_model import sentiment_pipeline


def predict_sentiment(text: str) -> dict:
    result = sentiment_pipeline(text)[0]

    return {
        "label": result["label"],
        "score": float(result["score"])
    }
```

API 라우터
`ai-server/api/sentiment.py`
```python
# ai-server/api/sentiment.py

from fastapi import APIRouter
from schemas.sentiment_schema import SentimentRequest, SentimentResponse
from services.inference import predict_sentiment

router = APIRouter(prefix="/api/v1/sentiment", tags=["sentiment"])


@router.post("/predict", response_model=SentimentResponse)
def sentiment_predict(payload: SentimentRequest):
    return predict_sentiment(payload.text)
```

`ai-server/main.py`
```python
# ai-server/main.py

from fastapi import FastAPI
from api.sentiment import router as sentiment_router

app = FastAPI(title="AI Server")

app.include_router(sentiment_router)
```
---
```
POST /ai/sentiment/
POST /ai/keywords/
POST /ai/reviews/3/analyze/
```
Django 내부에서 이런 FastAPI 주소를 호출
```
POST http://127.0.0.1:8001/api/v1/sentiment/predict
POST http://127.0.0.1:8001/api/v1/keywords/extract
```

`ai-server/urls.py`
```python
from django.urls import path
from .views import (
    SentimentAPIView,
    KeywordAPIView,
    ReviewAnalyzeAPIView,
)

urlpatterns = [
    path("sentiment/", SentimentAPIView.as_view(), name="ai-sentiment"),
    path("keywords/", KeywordAPIView.as_view(), name="ai-keywords"),
    path("reviews/<int:review_id>/analyze/", ReviewAnalyzeAPIView.as_view(), name="ai-review-analyze"),
]
```

즉,
- 사용자용 URL = Django
- AI 추론용 내부 URL = FastAPI