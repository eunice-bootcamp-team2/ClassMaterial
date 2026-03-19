1️⃣ Django / DRF 쪽
- 로그인, 리뷰 저장, 제품 조회
- 사용자가 리뷰를 작성하면
- 그 리뷰 텍스트를 FastAPI로 보내기
- FastAPI가 준 분석 결과를 DB에 저장하기
    

2️⃣ FastAPI 쪽
- 모델 로딩
- 추론
- 결과 반환

---
### 모델선정
upskyy/e5-small-korean 모델은 문장을 384차원 벡터로 변환하는 Sentence Transformer 모델입니다.  
  
이 모델은 직접 추천 결과를 출력하지는 않지만, semantic similarity, semantic search 등에 활용할 수 있으며, 임베딩 벡터와 cosine similarity를 이용하여 비슷한 리뷰나 상품을 찾는 추천 시스템을 구현하는 데 사용할 수 있습니다.
https://huggingface.co/upskyy/e5-small-korean

작업 순서
```
- FastAPI 프로젝트에 모델 로딩 코드 추가
- 파이썬 파일 단독 실행으로 임베딩 테스트   
- FastAPI 엔드포인트 1개 생성  
- Swagger 또는 curl로 테스트  
- 그다음 DRF에서 호출
```

이 모델의 특징 정리
이 모델은 감정분석처럼 `"positive"` 같은 라벨을 바로 주는 모델이 아닙니다.  
이 모델의 출력은 벡터(숫자 배열)입니다. 모델 카드 예시도 `SentenceTransformer("upskyy/e5-small-korean")`로 로드해서 `encode()`로 임베딩을 만들고, 그다음 similarity를 계산하는 흐름입니다.

즉 테스트 목표는:
- 텍스트 1개 → 임베딩 벡터가 나오는지 확인
- 텍스트 2개 → 유사도 점수가 그럴듯하게 나오는지 확인입니다.

Fast API 임시 디렉토리 구조
```
├── ai-server/                      # FastAPI (AI 서버)
│   ├── main.py
│   ├── test_embedding.py
│   ├── api/
│   │   └──  recommend.py
│   ├── models/
│   │   ├── recommend_model.py
│   │   └── embedding_model.py
│   ├── schemas/
│   │   └── recommend_schema.py
│   └── services/
│       └── recommend_service.py  
```

설치할 라이브러리
```bash
uv pip install fastapi uvicorn sentence-transformers torch
```

```bash
cd ai-server
mkdir -p api \
         models \
         schemas \
         services
         
touch __init__.py \  
api/__init__.py \  
models/__init__.py \  
schemas/__init__.py \  
services/__init__.py

touch main.py \
      test_embedding.py \
      api/sentiment.py \
      models/recommend_model.py \
      models/embedding_model.py \
      schemas/recommend_schema.py \
      services/recommend_service.py
```


1차 테스트: 파이썬 파일 단독 실행: 모델이 돌아가는지 확인만 합니다.
`ai-server/models/embedding_model.py`
```python
from sentence_transformers import SentenceTransformer

# 전역에서 1회 로드
embedding_model = SentenceTransformer("upskyy/e5-small-korean")
```

`ai-server/test_embedding.py`
```python
from models.embedding_model import embedding_model
from sklearn.metrics.pairwise import cosine_similarity


def main():
    texts = [
        "보습력이 좋아서 겨울에 쓰기 좋았어요.",
        "수분감이 오래가고 건성 피부에 잘 맞아요.",
        "향이 너무 강하고 자극적이어서 별로였어요.",
    ]

    embeddings = embedding_model.encode(texts)

    print("임베딩 개수:", len(embeddings))
    print("벡터 차원:", len(embeddings[0]))

    sim_01 = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    sim_02 = cosine_similarity([embeddings[0]], [embeddings[2]])[0][0]

    print("1번-2번 유사도:", float(sim_01))
    print("1번-3번 유사도:", float(sim_02))


if __name__ == "__main__":
    main()
```

실행:
```bash
python test_embedding.py
```
- 임베딩 개수: 3
- 벡터 차원: 384
- 비슷한 문장(1번-2번) 유사도 > 덜 비슷한 문장(

결과
```
modules.json: 100%|████████████████████████████████████████████████| 229/229 [00:00<00:00, 1.33MB/s]
README.md: 9.77kB [00:00, 33.3MB/s]
sentence_bert_config.json: 100%|██████████████████████████████████| 53.0/53.0 [00:00<00:00, 351kB/s]
config.json: 100%|█████████████████████████████████████████████████| 628/628 [00:00<00:00, 4.38MB/s]
model.safetensors: 100%|█████████████████████████████████████████| 471M/471M [00:15<00:00, 31.3MB/s]
Loading weights: 100%|██████████████████████████████████████████| 199/199 [00:00<00:00, 3068.53it/s]
tokenizer_config.json: 1.17kB [00:00, 4.93MB/s]
tokenizer.json: 100%|██████████████████████████████████████████| 17.1M/17.1M [00:00<00:00, 28.1MB/s]
special_tokens_map.json: 100%|█████████████████████████████████████| 965/965 [00:00<00:00, 7.91MB/s]
config.json: 100%|█████████████████████████████████████████████████| 296/296 [00:00<00:00, 2.41MB/s]
임베딩 개수: 3
벡터 차원: 384
1번-2번 유사도: 0.3605636656284332
1번-3번 유사도: 0.23461520671844482
```
아래 파일들은 허깅페이스에서 모델 파일을 받아왔다는 뜻
- `modules.json`
- `config.json`
- `model.safetensors`
- `tokenizer.json`
    
특히
- `model.safetensors: 471M`
- `Loading weights: 100%`
    
이 부분은 모델 본체 가중치까지 문제 없이 불러온 상태입니다.

임베딩 생성 성공
```
임베딩 개수: 3  
벡터 차원: 384
```
이 뜻은:
- 문장 3개를 넣었고
- 각 문장이 384차원 숫자 벡터로 변환되었다는 의미입니다.
즉, 이 모델은 지금 문장을 숫자 벡터로 바꾸는 역할을 정상 수행하고 있습니다.

유사도 값 해석
```
1번-2번 유사도: 0.3605636656284332  
1번-3번 유사도: 0.23461520671844482
```
보통 코사인 유사도는 대략 이렇게 봅니다.
- 1에 가까울수록 매우 유사
- 0에 가까울수록 관련 적음
- 음수면 의미가 꽤 다름
    
지금 결과는:
- 1번과 2번: 0.36
- 1번과 3번: 0.23
    
이므로,  
1번 문장은 2번 문장과 3번 문장보다 더 가깝다고 모델이 판단한 것입니다.

이 수치가 높은 건가?
지금 값만 보면 엄청 높지는 않지만, 상대 비교는 정상적입니다.

중요한 건 절대값보다:
- 비슷한 문장끼리 더 높게 나오는지
- 다른 문장끼리는 더 낮게 나오는지입니다.

즉, 테스트 목적에서는  
모델이 아예 이상하게 동작하는 건 아니고, 어느 정도 의미 구분을 하고 있다고 볼 수 있습니다.

`backend/apps/ai_gateway/serializers.py` : 프론트에서 받을 입력 검증
```python
from rest_framework import serializers


class EmbeddingRequestSerializer(serializers.Serializer):
    """
    여러 문장을 받아 FastAPI /embed 로 전달할 때 사용
    """
    texts = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False
    )


class SimilarityRequestSerializer(serializers.Serializer):
    """
    두 문장을 받아 FastAPI /similarity 로 전달할 때 사용
    """
    text1 = serializers.CharField()
    text2 = serializers.CharField()
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
from django.urls import path
from .views import EmbeddingAPIView, SimilarityAPIView

urlpatterns = [
    path("embed/", EmbeddingAPIView.as_view(), name="ai-embed"),
    path("similarity/", SimilarityAPIView.as_view(), name="ai-similarity")
]
```
- `/ai/sentiment/`

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

`ai-server/schemas/sentiment_schema.py` : 요청/응답 데이터 구조
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
`ai-server/models/sentiment_model.py` : 모델 로딩
```python
from transformers import pipeline


sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
```

서비스
`ai-server/services/inference.py` : 실제 추론 로직
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
`ai-server/api/sentiment.py` : 엔드포인트 정의
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

`ai-server/main.py` : FastAPI 앱 생성, 라우터 등록
```python
from fastapi import FastAPI
from api.sentiment import router as sentiment_router

app = FastAPI(title="AI Server")

app.include_router(sentiment_router)
```
---
```
- POST /ai/embed/  
- POST /ai/similarity/  
```
Django 내부에서 이런 FastAPI 주소를 호출
```
POST http://127.0.0.1:8001/api/v1/sentiment/predict
```

즉,
- 사용자용 URL = Django
- AI 추론용 내부 URL = FastAPI