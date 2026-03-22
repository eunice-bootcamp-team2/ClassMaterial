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