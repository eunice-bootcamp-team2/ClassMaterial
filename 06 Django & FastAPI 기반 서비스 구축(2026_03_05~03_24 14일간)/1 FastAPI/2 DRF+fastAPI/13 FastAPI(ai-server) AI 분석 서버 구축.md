1️⃣ Django / DRF 쪽
- 로그인, 리뷰 저장, 제품 조회
- 사용자가 리뷰를 작성하면
- 그 리뷰 텍스트를 FastAPI로 보내기
- FastAPI가 준 분석 결과를 DB에 저장하기
    

2️⃣ FastAPI 쪽
- 모델 로딩
- 추론
- 결과 반환

어떻게 들어왔는지? DRF(무엇으로 http json) ->
{값:0.67}

json(검증) -> json(검증) 형식의 조건



http json만들어서 - > http방식으로 json



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
│   │   └── embedding_model.py
│   ├── schemas/
│   │   └── recommend_schema.py
│   └── services/
│       └── recommend_service.py  
```

```
├── ai-server/                      # FastAPI (AI 서버 전체 루트)
│
│   ├── main.py (Django settings.py + urls.py)
│   │   # FastAPI 앱 실행 진입점
│   │   # 라우터 연결 + 서버 시작 (uvicorn이 여기서 실행됨)
│
│   ├── test_embedding.py
│   │   # AI 모델 단독 테스트 파일
│   │   # 서버 없이 임베딩 생성/유사도 계산이 정상 동작하는지 확인
│
│   ├── api/
│   │   └── recommend.py
│   │       # API 엔드포인트 정의 (FastAPI의 View 역할)
│   │       # Django에서 요청을 받는 "입구"
│   │       # → 서비스 로직 호출 후 JSON 응답 반환
│
│   ├── models/
│   │   └── embedding_model.py
│   │       # AI 모델 로딩 전용 파일
│   │       # SentenceTransformer를 서버 시작 시 1번만 메모리에 로드
│   │       # (요청마다 로딩하면 너무 느리기 때문)
│
│   ├── schemas/
│   │   └── recommend_schema.py
│   │       # 요청/응답 데이터 구조 정의 (Pydantic)
│   │       # JSON → Python 자동 변환 + 데이터 검증
│   │       # (DRF의 Serializer와 같은 역할)
│
│   └── services/
│       └── recommend_service.py
│           # 핵심 비즈니스 로직 (AI 처리)
│           # 문장 → 임베딩 생성
│           # 벡터 → 유사도 계산
│           # 실제 "AI 기능"이 수행되는 곳
```

설치할 라이브러리
```bash
uv pip install fastapi uvicorn sentence-transformers torch
```
---
`requirements.txt 개념정리`  
  
로컬 개발환경에서는 직접 라이브러리를 설치하면서 개발하지만,  
다른 서버나 개발자는 어떤 라이브러리가 필요한지 알 수 없습니다.  
  
그래서 requirements.txt는  
이 프로젝트에 필요한 라이브러리 목록을 기록해두는 파일이며,  
  
협업이나 배포 시 이 파일을 기준으로  
CI/CD나 Docker 환경에서 `pip install -r requirements.txt`를 실행하여  
동일한 환경을 자동으로 구성하기 위해 사용됩니다.

Docker / CI/CD 환경에서는  
`requirements.txt`를 기준으로 라이브러리를 설치하며,  
  
일반적으로는 pip install -r requirements.txt를 사용하지만,  
uv를 사용하는 경우 uv pip install -r requirements.txt로 설치할 수도 있습니다.

`requirements.txt` 갱신
```
uv pip freeze > requirements.txt
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
      models/embedding_model.py \
      schemas/recommend_schema.py \
      services/recommend_service.py
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

---
### 요청/응답 스키마 만들기

이제 API가 받을 데이터 형식을 정해야 합니다.
`ai-server/schemas/recommend_schema.py` : 클라이언트(DRF/Django)에서 FastAPI로 들어오는 데이터 형식이 올바른지 검사하는 파일입니다.
```python
from pydantic import BaseModel
from typing import List

# Django → FastAPI 요청 데이터
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
`BaseModel`은 Pydantic 라이브러리에서 제공하는 클래스입니다
- 요청 데이터 자동 검증
- JSON → Python 객체 자동 변환
- 응답 구조 자동 생성
위의 파일은 이런 일들을 수행합니다.

---
서비스 로직 만들기
AI 모델을 이용해서 실제로 임베딩 생성과 유사도 계산을 수행하는 핵심 처리 로직 파일입니다.
`ai-server/services/recommend_service.py`
```python
from sklearn.metrics.pairwise import cosine_similarity
from models.embedding_model import embedding_model

# 임베딩 생성
def make_embeddings(texts: list[str]) -> list[list[float]]:
    """
    여러 문장을 받아 임베딩 벡터 리스트로 반환
    """
    vectors = embedding_model.encode(texts)
    return [vector.tolist() for vector in vectors]

# 유사도 계산
def calculate_similarity(text1: str, text2: str) -> float:
    """
    두 문장의 cosine similarity 계산
    """
    vectors = embedding_model.encode([text1, text2])
    score = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
    return float(score)
```
- 두 문장을 받아
- 각각 임베딩 생성
- cosine similarity 계산
- 0 ~ 1 사이 점수 반환
두 문장이 얼마나 비슷한지 계산합니다.

왜 서비스 레이어를 두는가
- `api/` : 요청 받기
- `schemas/` : 입력/출력 형식
- `services/` : 실제 계산
- `models/` : 모델 로딩
    
이렇게 나누면 나중에  
`리뷰 추천`, `비슷한 리뷰 검색`, `상품 유사도 계산` 기능을 추가할 때도 편합니다.

---
### FastAPI 라우터 만들기
외부(Django 등)에서 들어오는 요청을 받아서, 서비스 로직을 실행하고 결과를 반환하는 FastAPI의 입구(엔드포인트) 역할을 하는 파일입니다.

즉, 이 코드인 FastAPI 라우터는 DRF의 요청을 받아 서비스 로직을 실행시키고, 그 결과를 다시 DRF에게 JSON으로 반환하는 역할입니다
```
DRF (Django)
   ↓ 요청 (HTTP)
FastAPI (api/recommend.py ← 여기 코드)
   ↓
services/recommend_service.py (실제 계산)
   ↓
FastAPI (결과 받음)
   ↓
DRF로 응답 반환
```

API 엔드포인트 정의
```bash
POST /api/v1/recommend/embed  
POST /api/v1/recommend/similarity
```
외부에서 호출할 수 있는 URL을 생성합니다.

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

---
main.py 연결
이 코드는 FastAPI 애플리케이션을 생성하고, 정의된 라우터를 등록하여 API가 실제로 동작하도록 연결하는 진입점 역할을 합니다.

`ai-server/main.py`
```python
from fastapi import FastAPI
from api.recommend import router as recommend_router

# FastAPI 앱 생성
app = FastAPI(title="AI Recommendation Server")

# 라우터 연결
app.include_router(recommend_router)

# 기본 테스트 API
@app.get("/")
def root():
    return {"message": "AI server is running"}
```
---
서버 실행
```bash
uvicorn main:app --reload --port 8001
```















