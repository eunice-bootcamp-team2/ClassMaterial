
DRF와 FastAPI로 분리하는 목적은 웹 서비스 로직과 AI 추론 로직의 책임을 나누기위해서 입니다.
예를 들면:
- Django는 로그인, 리뷰 CRUD, 템플릿, 관리자, DB 관계 처리에 강함
- FastAPI는 AI 모델 로딩, 추론 API, 빠른 응답, Swagger 테스트에 강함

앞으로 설계할 파일 기준으로 전체 흐름을 보면 다음과 같습니다.

`1.` 프론트에서 버튼 클릭
```
templates/products/product_detail.html  
  ↓  
backend/static/js/product-detail.js
```
- 사용자가 상품 상세 페이지에서 `비슷한 후기 보기` 버튼 클릭
- JS가 Django API `/ai/reviews/<review_id>/analyze/` 호출


`2.` Django ai_gateway가 요청 받음
```
backend/apps/ai_gateway/urls.py  
  ↓  
backend/apps/ai_gateway/views.py의 ReviewAnalyzeAPIView
```
- URL 연결
- `review_id` 기준으로 리뷰 조회
- 같은 상품의 다른 리뷰 후보 조회
- 비교할 리뷰들을 순회하면서 FastAPI 호출 준비


`3.` Django에서 FastAPI 호출
```
backend/apps/ai_gateway/views.py  
  ↓  
backend/apps/ai_gateway/services.py의 FastAPIClient.get_similarity()
```
여기서 Django는 직접 AI 계산을 안 하고  
`requests.post(...)`로 FastAPI의
- `/api/v1/recommend/embed`
- `/api/v1/recommend/similarity`
를 호출합니다.  
즉, `services.py`가 외부 AI 서버 호출 전담층입니다.


`4.` FastAPI가 요청 받음
```
ai-server/main.py  
  ↓  
ai-server/api/recommend.py
```
- FastAPI 앱이 라우터를 등록하고
- `/api/v1/recommend/similarity` 요청을 받음


`5.` FastAPI가 입력 검증
```
ai-server/api/recommend.py  
  ↓  
ai-server/schemas/recommend_schema.py
```
- `SimilarityRequest`
- `EmbeddingRequest`

같은 Pydantic 스키마로 요청 body를 검증합니다. 
즉 장고에서 들어오는 요청을 받아서 검수하는 부분이 바로 여기입니다.


`6.` FastAPI 서비스 로직 실행
```
ai-server/api/recommend.py  
  ↓  
ai-server/services/recommend_service.py
```
- `calculate_similarity(text1, text2)`
- `make_embeddings(texts)`

여기서 실제 계산을 수행함  
즉 실제 AI 로직 처리 위치는 `services/recommend_service.py`입니다.


`7.` FastAPI 모델 사용
```
ai-server/services/recommend_service.py  
  ↓  
ai-server/models/embedding_model.py
```
- `embedding_model = SentenceTransformer("upskyy/e5-small-korean")`
- 서비스 함수가 이 모델을 import해서 사용

즉 모델은 FastAPI 안에 있지만 DB 모델이 아니라 AI 모델 객체입니다.


`8.` FastAPI가 결과 반환
```
ai-server/services/recommend_service.py  
  ↓  
ai-server/api/recommend.py  
  ↓  
Django FastAPIClient
```
- 유사도 점수 JSON 반환
- 예: `{"similarity": 0.36}`


`9.` Django가 결과 가공 + 저장
`backend/apps/ai_gateway/views.py`
- 반환된 similarity 점수를 정렬
- threshold(예: 0.45) 이상만 결과 포함
- 사용자용 label 생성
- 필요하면 `ReviewSimilarityResult` 모델로 DB 저장

이 저장 위치가 `backend/apps/ai_gateway/models.py`의 `ReviewSimilarityResult`입니다.
즉 AI 결과 저장은 Django DB 쪽에서 합니다.


`10.` Django가 프론트로 최종 응답
```
backend/apps/ai_gateway/views.py  
  ↓  
backend/static/js/product-detail.js
```
- `similar_reviews`
- `candidate_count`
- `similarity_threshold`
- `model_name`

같은 JSON 반환  
그걸 JS가 받아서 리뷰 카드 아래에 출력합니다.

프로젝트 한 흐름을 텍스트 화살표로 쓰면 다음과 같습니다.
```
templates/products/product_detail.html  
  ↓  
backend/static/js/product-detail.js  
  ↓  
GET /ai/reviews/<review_id>/analyze/  
  ↓  
backend/apps/ai_gateway/urls.py  
  ↓  
backend/apps/ai_gateway/views.py  
  - ReviewAnalyzeAPIView  
  - source_review 조회  
  - candidate_reviews 조회  
  ↓  
backend/apps/ai_gateway/services.py  
  - FastAPIClient.get_similarity(text1, text2)  
  ↓  
HTTP 요청
(HTTP 요청 자체를 보내는것:http://fastapi:8001/api/v1/recommend/similarity) 
  ↓  
ai-server/main.py (app.include_router(recommend_router))  
  ↓  
ai-server/api/recommend.py
(@router.post("/similarity") ← 여기서 http가 잡힘)  
  - /api/v1/recommend/similarity 
  - 결과는 {"similarity": 0.87} 이런 형태로 Django에 전달됩니다	
  - FastAPI는 기본적으로 dict 반환 → 자동으로 JSON 변환 
  - calculate_similarity(payload.text1, payload.text2) 이부분은
    recommend_service.py 검증 후 바로 함수 호출로 전달한다  
  ↓  
ai-server/schemas/recommend_schema.py  
  - SimilarityRequest 검증 (JSON을 받을 때 검증합니다.)  
  ↓  
ai-server/services/recommend_service.py  
  - calculate_similarity()  
  ↓  
ai-server/models/embedding_model.py  
  - SentenceTransformer 모델 사용  
  ↓  
유사도 점수 반환(JSON)  
  ↓  
backend/apps/ai_gateway/services.py  
  ↓  
backend/apps/ai_gateway/views.py  
  - 점수 정렬  
  - threshold 적용  
  - label 생성  
  - ReviewSimilarityResult DB 저장  
  ↓  
JSON 응답 반환  
  ↓  
backend/static/js/product-detail.js  
  ↓  
상품 상세 페이지에 "비슷한 후기" 출력
```

---
핵심만 다시 정리

DRF 쪽
- 사용자 요청 받음
- 리뷰/상품/유저 조회
- FastAPI 호출
- 결과 저장
- 프론트에 응답

FastAPI 쪽
- 요청 형식 검증
- 모델로 임베딩/유사도 계산
- 계산 결과만 반환

FastAPI에는 모델이 없고 schemas로 장고에서 들어오는 요청을 받아서 검수후 services에서 로직처리후 다시 장고로 보내는 구조입니다.
- FastAPI에는 Django ORM 모델은 없음
- 대신 AI 모델 로딩 파일(`models/embedding_model.py`)은 있음
- `schemas/`는 입력/응답 검증
- `services/`는 계산 로직
- `api/`는 엔드포인트
- 결과는 다시 Django로 반환
- 저장은 Django가 담당

---
`backend/apps/ai_gateway/urls.py`
```python
from django.urls import path
from .views import EmbeddingAPIView, SimilarityAPIView

urlpatterns = [
    path("embed/", EmbeddingAPIView.as_view(), name="ai-embed"),
    path("similarity/", SimilarityAPIView.as_view(), name="ai-similarity")
]
```
---
프론트엔드의 요청을 받아 데이터를 검증하고, FastAPI를 호출하여 결과를 받아 응답하는 Django의 컨트롤러(View) 역할입니다.

`backend/apps/ai_gateway/views.py`
```python
from requests import RequestException

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import EmbeddingRequestSerializer, SimilarityRequestSerializer
from .services import FastAPIClient


class EmbeddingAPIView(APIView):
    def post(self, request):
        serializer = EmbeddingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        texts = serializer.validated_data["texts"]

        try:
            # 현재 구조 유지: 한 문장씩 보내서 리스트로 반환
            embeddings = [FastAPIClient.get_embedding(text) for text in texts]
            return Response({"embeddings": embeddings}, status=status.HTTP_200_OK)
        except RequestException as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class SimilarityAPIView(APIView):
    def post(self, request):
        serializer = SimilarityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text1 = serializer.validated_data["text1"]
        text2 = serializer.validated_data["text2"]

        try:
            result = FastAPIClient.get_similarity(text1, text2)
            return Response(result, status=status.HTTP_200_OK)
        except RequestException as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
```
- 요청 받기
- serializer 검증
- service 호출
- 필요하면 DB 저장

---
`backend/apps/ai_gateway/serializers.py` : 프론트에서 받을 입력 검증

이 코드는 DRF Serializer로, 프론트엔드에서 들어온 데이터를 검증하여 FastAPI로 전달하기 전에 올바른 형식인지 확인하는 역할을 합니다.
쉽게 설명하면 프론트 → Django → FastAPI로 가기 전에 데이터가 맞는지 검사하는 필터입니다.

```python
from rest_framework import serializers


class EmbeddingRequestSerializer(serializers.Serializer):
    """
    여러 문장을 받아 FastAPI /embed로 전달할 때 사용
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

---
Django에서 FastAPI 서버로 HTTP 요청을 보내고, AI 분석 결과를 받아오는 외부 API 호출 전담 서비스입니다.
즉, Django가 FastAPI와 통신하기 위한 전용 클라이언트입니다.

`backend/apps/ai_gateway/services.py`
```python
import requests
from django.conf import settings


class FastAPIClient:
    @staticmethod
    def get_embedding(text: str):
        response = requests.post(
            f"{settings.FASTAPI_BASE_URL}/api/v1/recommend/embed",
            json={"texts": [text]},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["embeddings"][0]

    @staticmethod
    def get_similarity(text1: str, text2: str) -> dict:
        response = requests.post(
            f"{settings.FASTAPI_BASE_URL}/api/v1/recommend/similarity",
            json={
                "text1": text1,
                "text2": text2,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()
```
---
서버 실행
```bash
uvicorn main:app --reload --port 8001
```
---
### Swagger 테스트
```bash
http://127.0.0.1:8001/docs
```

similarity 테스트
Swagger에서 `/api/v1/recommend/similarity` 에 아래처럼 넣습니다.
```json
{
  "text1": "보습력이 좋아서 겨울에 쓰기 좋았어요.",
  "text2": "수분감이 오래가고 건성 피부에 잘 맞아요."
}
```
![[Pasted image 20260318153526.png]]
✔ 첫 번째 테스트
- 문장1: 보습 좋다
- 문장2: 수분감 좋다  
- 결과: **0.3605**

그리고 비교용으로:
```json
{
  "text1": "보습력이 좋아서 겨울에 쓰기 좋았어요.",
  "text2": "향이 너무 강하고 자극적이어서 별로였어요."
}
```
보통 첫 번째 점수가 두 번째보다 높게 나와야 정상입니다.  
이 모델은 sentence similarity 용도로 배포되어 있고 cosine similarity를 기본으로 안내하고 있습니다.
![[Pasted image 20260318153600.png]]
✔ 두 번째 테스트
- 문장1: 보습 좋다    
- 문장2: 향이 강하고 별로  
- 결과: **0.2346**

결과 :  **0.36 > 0.23**
즉,
- ✔ 좋은 리뷰 vs 좋은 리뷰 → 더 유사 (0.36)
- ✔ 좋은 리뷰 vs 부정 리뷰 → 덜 유사 (0.23)

이 패턴이 나오면 모델이 “의미를 이해하고 있다”는 뜻입니다.

###### 점수 기준 감 잡기 (실무 기준) 코사인 유사도는 이렇게 보면 됩니다:
|점수|의미|
|---|---|
|0.7 ~ 1.0|거의 같은 의미|
|0.5 ~ 0.7|꽤 유사|
|0.3 ~ 0.5|어느 정도 관련 있음|
|0.1 ~ 0.3|약간 관련|
|0 ~ 0.1|거의 무관|
지금 결과:
- 0.36 → **어느 정도 유사**
- 0.23 → **약한 관련**
    
✔ 아주 자연스러운 결과입니다

왜 0.9 이런 값이 안 나오냐?
이 모델은
- “문장 완전히 동일”
- “거의 같은 문장 구조”
    
일 때만 0.7~0.9 나옵니다

예시:
```
"text1": "보습력이 좋아요"  
"text1": "보습력이 정말 좋아요"
```
이런 경우만 0.8~0.9 나옴
![[Pasted image 20260318154131.png]]

---
embed 테스트
```json
{
  "texts": [
    "보습력이 좋아서 겨울에 쓰기 좋았어요.",
    "수분감이 오래가고 건성 피부에 잘 맞아요."
  ]
}
```
정상이라면 각 문장마다 384차원 벡터가 나옵니다
![[Pasted image 20260318154220.png]]

지금 단계에서 이걸 이해하면 추천 시스템까지 바로 갈 수 있습니다.
```json
{
  "embeddings": [
    [-0.32, 0.12, 0.23, ...],
    [-0.11, 0.09, 0.18, ...]
  ]
}
```
이건 쉽게 말하면
```
문장 → 숫자 벡터(좌표)
```
입니다.

핵심 개념 (진짜 중요)
모델은 문장을 이렇게 바꿉니다:
```
"보습력이 좋다"
→ [0.12, -0.33, 0.88, ...]  (384개 숫자)
```
이것을 임베딩 (Embedding)이라고 합니다.

이런 숫자는 사람이 이해하는 방식이 아니고 AI가 이해하는 방식입니다.
embedding → similarity 계산 → 가까운 것 찾기를 통해 유사도 높은 리뷰를 추천하는 방식으로 활용됩니다.

즉 다시 설명하면 
```
문장은 모델을 통해 숫자 벡터로 변환됩니다.

예:
"보습력이 좋다"
→ [0.12, -0.33, 0.88, ...] (384차원 벡터)

이 과정을 임베딩(Embedding)이라고 합니다.

이 숫자 자체는 의미가 있는 것이 아니라,
벡터 간의 거리(유사도)가 중요합니다.

즉,
embedding → similarity 계산을 통해

- 비슷한 문장은 가까운 벡터
- 다른 문장은 먼 벡터로 표현됩니다.

이 원리를 활용하여
유사도가 높은 리뷰를 추천하는 시스템을 만들 수 있습니다.
```