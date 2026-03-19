### 전체 개발 순서

**1단계**  
FastAPI에서 모델을 1번만 로딩하는 구조 만들기

**2단계**  
스키마(Pydantic) 만들기

**3단계**  
서비스 로직 만들기
- 임베딩 생성
- 유사도 계산

**4단계**  
API 라우터 만들기
- `/api/v1/recommend/embed`
- `/api/v1/recommend/similarity`

**5단계**  
`main.py`에 라우터 연결

**6단계**  
Swagger에서 테스트

**7단계**  
그 다음 DRF `ai_gateway`가 FastAPI를 호출하게 연결

---
디렉토리구조
```bash
ai-server/
├── main.py
├── api/
├── models/
│   └── embedding_model.py
├── schemas/
├── services/
└── test_embedding.py
```

모델 로딩 파일 만들기
`ai-server/models/embedding_model.py`
```python
from sentence_transformers import SentenceTransformer


# FastAPI 서버가 뜰 때 모델을 한 번만 메모리에 로딩
embedding_model = SentenceTransformer("upskyy/e5-small-korean")
```
이 구조의 핵심은 아주 단순합니다.
- `SentenceTransformer(...)`는 무거운 작업입니다.
- 요청이 올 때마다 다시 만들면 너무 느립니다.
- 그래서 `models/embedding_model.py`에서 전역 객체로 1회만 로드합니다.
- 이후 다른 파일에서는 이 `embedding_model`만 import해서 씁니다.
    
즉 구조는 이렇게 이해하면 됩니다.
```python
models/embedding_model.py
    ↓
services/recommend_service.py 에서 import
    ↓
api/recommend.py 에서 서비스 함수 호출
```

현재 단계 체크 포인트
- FastAPI 프로젝트 안에 `models/embedding_model.py`가 존재
- `embedding_model = SentenceTransformer("upskyy/e5-small-korean")` 작성 완료
- 다른 파일에서 import 가능한 상태

---
요청/응답 스키마 만들기
이제 API가 받을 데이터 형식을 정해야 합니다.
`ai-server/schemas/recommend_schema.py`
```python
from pydantic import BaseModel
from typing import List


class EmbeddingRequest(BaseModel):
    texts: List[str]


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


class SimilarityResponse(BaseModel):
    similarity: float
```

스키마를 별도의 파일로 만들면
- 요청 body 검증
- Swagger 문서 자동 생성
- 응답 구조 고정
- 나중에 DRF에서 호출할 때도 형식이 명확해짐
예를 들어 `/similarity`에 잘못된 JSON이 오면 FastAPI가 자동으로 422 검증 에러를 내줍니다.
---
서비스 로직 만들기
이제 실제 추론 로직을 작성합니다.
`ai-server/services/recommend_service.py`
```python
from sklearn.metrics.pairwise import cosine_similarity
from models.embedding_model import embedding_model


def make_embeddings(texts: list[str]) -> list[list[float]]:
    """
    여러 문장을 받아 임베딩 벡터 리스트로 반환
    """
    vectors = embedding_model.encode(texts)
    return [vector.tolist() for vector in vectors]


def calculate_similarity(text1: str, text2: str) -> float:
    """
    두 문장의 cosine similarity 계산
    """
    vectors = embedding_model.encode([text1, text2])
    score = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
    return float(score)
```
왜 서비스 레이어를 두는가
- `api/` : 요청 받기
- `schemas/` : 입력/출력 형식
- `services/` : 실제 계산
- `models/` : 모델 로딩
    
이렇게 나누면 나중에  
`리뷰 추천`, `비슷한 리뷰 검색`, `상품 유사도 계산` 기능을 추가할 때도 편합니다.

---
FastAPI 라우터 만들기
이제 엔드포인트를 만듭니다.
`ai-server/api/recommend.py`
```python
from fastapi import APIRouter
from schemas.recommend_schema import (
    EmbeddingRequest,
    EmbeddingResponse,
    SimilarityRequest,
    SimilarityResponse,
)
from services.recommend_service import make_embeddings, calculate_similarity

router = APIRouter(prefix="/api/v1/recommend", tags=["recommend"])


@router.post("/embed", response_model=EmbeddingResponse)
def embed_texts(payload: EmbeddingRequest):
    return {"embeddings": make_embeddings(payload.texts)}


@router.post("/similarity", response_model=SimilarityResponse)
def similarity(payload: SimilarityRequest):
    return {"similarity": calculate_similarity(payload.text1, payload.text2)}
```

여기서 열리는 API
```bash
POST /api/v1/recommend/embed  
POST /api/v1/recommend/similarity
```
---
main.py 연결
`ai-server/main.py`
```python
from fastapi import FastAPI
from api.recommend import router as recommend_router

app = FastAPI(title="AI Recommendation Server")

app.include_router(recommend_router)


@app.get("/")
def root():
    return {"message": "AI server is running"}
```

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