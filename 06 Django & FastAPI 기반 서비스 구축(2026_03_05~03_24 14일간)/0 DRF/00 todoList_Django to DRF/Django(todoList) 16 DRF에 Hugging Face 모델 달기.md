0) 필요한 파일 목록 (최소 구성)

✅ 필수
1. `services/sentiment.py` (모델 로딩 + 추론 함수)
2. `serializers.py` (입력 검증)
3. `views.py` (API 엔드포인트)
4. `urls.py` (라우팅)
    
🟡 성능/운영
- `settings.py` (캐시, 토크나이저 병렬 옵션 등)
- `models.py`에 별도 저장용 테이블 추가
---
### AI model 호출 후 구동테스트
NSMC(네이버 영화리뷰 코퍼스)로 학습된 감정분류 모델사용
https://huggingface.co/blockenters/finetuned-nsmc-sentiment?utm_source=chatgpt.com


(1) 모델이 내 환경(WSL/Django)에서 진짜 로딩되고 추론되는지부터 검증
```bash
mkdir todo_aimodel_test
cd todo_aimodel_test
code -r .

uv venv
source .venv/bin/activate

# 필요한 모듈
uv pip install -U transformers torch
python -c "import transformers, torch; print('transformers', transformers.__version__); print('torch', torch.__version__)"
```

허깅페이스 허브를 설치합니다.
```bash
uv pip install -U huggingface_hub  
```

Hugging Face 사이트에서 토큰 생성
https://huggingface.co/security-checkup?cookieId=67e3219c-88ab-456c-ba95-0b3868c62076
로그인하고 접속합니다.
![[Pasted image 20260301080435.png]]


만약 회원가입이 필요할 경우 회원가입후 로그인합니다.
https://huggingface.co/welcome 


토큰을 새로 발급받습니다.  https://huggingface.co/settings/tokens
![[Pasted image 20260301080634.png]]

다음과 같이 token name을 지정한뒤 토큰을 생성합니다.
![[Pasted image 20260301080940.png]]

토큰이 생성되면 한번밖에 확인이 안되므로 반드시 복사하여 잘 보관해 둡니다. 
발급된 토큰은 `hf_iS********` 이런식으로 생성됩니다.

가상환경에서 터미널에 아래 명령어 이후 발급된 토큰을 저장합니다.
```bash
hf auth login
```

터미널에서 다음과 같이 나오면 좀전에 발급했던 토큰을 붙여넣기 하는데 화면에서는 안보이는것이 정상입니다. 보안으로 인해 화면에서는 표시가 안됩니다.
```
ce.co/settings/tokens .
Enter your token (input will not be visible): 
```

다음 질문 나오면
```bash
Add token as git credential? [y/N]:
```
그냥 `N` 누르고 엔터
- 우리는 git push용이 아니라
- 모델 다운로드 인증용이라 굳이 git credential 저장 안 해도 됨

---
https://huggingface.co/blockenters/finetuned-nsmc-sentiment?utm_source=chatgpt.com
다시 허깅페이스 AI모델사이트에 들어가서 동의를 누룹니다.
사용 조건 동의 + 연락처 공유 동의가 필요한 gated 모델
![[Pasted image 20260301082515.png]]

테스트를 위한 아래 코드를 작성합니다.
`hf_smoke_test.py`
```python
from transformers import pipeline

MODEL = "blockenters/finetuned-nsmc-sentiment"

clf = pipeline("sentiment-analysis", model=MODEL, tokenizer=MODEL)

texts = [
    "이 영화 진짜 재밌었어요!",
    "너무 지루하고 시간 아까웠다."
]

print(clf(texts))
```

ai 모델 실행 테스트
```bash
python hf_smoke_test.py
```

시간이 다소 소요되므로 기다립니다.

결과
```
(todo_aimodel_test) (.venv) youjung@DESKTOP-PJCRMMU:~/todo_aimodel_test$ python hf_smoke_test.py
config.json: 100%|███████████████████████████████| 895/895 [00:00<00:00, 4.00MB/s]
model.safetensors: 100%|███████████████████████| 711M/711M [00:43<00:00, 16.4MB/s]
Loading weights: 100%|█| 201/201 [00:00<00:00, 2131.82it/s, Materializing param=cl
tokenizer_config.json: 100%|█████████████████| 1.22k/1.22k [00:00<00:00, 8.29MB/s]
vocab.txt: 100%|███████████████████████████████| 996k/996k [00:00<00:00, 1.58MB/s]
tokenizer.json: 100%|████████████████████████| 2.92M/2.92M [00:00<00:00, 4.58MB/s]
special_tokens_map.json: 100%|████████████████████| 125/125 [00:00<00:00, 719kB/s]
[{'label': 'LABEL_1', 'score': 0.9383759498596191}, {'label': 'LABEL_0', 'score': 0.9609906077384949}]
(todo_aimodel_test) (.venv) youjung@DESKTOP-PJCRMMU:~/todo_aimodel_test$ 
```

검증 성공!
- 모델 다운로드/로딩 ✅
- 추론 실행 ✅
- 결과 반환 ✅

컴퓨터의 용량이 부족한 분들은 테스트한 모델을 삭제합니다.
```bash
deactivate
cd ~
rm -rf todo_aimodel_test
```

---
DRF로 모델 불러오기

- `reviews/services.py` : 모델 로딩 + predict
- `reviews/serializers.py` : 기존 serializer 유지 + 텍스트 입력 serializer 추가
- `reviews/views.py` : 기존 ViewSet 유지 + `@action` 으로
    - `GET /reviews/{id}/sentiment/` (DB 리뷰로 추론)
    - `POST /reviews/sentiment/` (텍스트로 추론)
- `urls.py`는 router에 그대로 연결



`reviews/services.py`
```python
# ============================================================
# reviews/services.py
# HuggingFace Transformers 기반 감정 분석 서비스
# ============================================================

# 운영체제 환경 변수 설정을 위해 os 모듈 import
import os

# HuggingFace Transformers의 pipeline 기능 import
# → 텍스트 분류, 번역, 요약 등 다양한 NLP 작업을 간단하게 수행 가능
from transformers import pipeline


# ============================================================
# tokenizer 병렬 처리 경고 비활성화
# ============================================================

# TOKENIZERS_PARALLELISM
# → tokenizer가 멀티스레드로 실행될 때 발생하는 경고 메시지를 비활성화
# → 실제 서비스 환경에서 불필요한 로그를 줄이기 위해 설정
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


# ============================================================
# 사용할 감정 분석 모델 지정
# ============================================================

# HuggingFace Hub에 올라와 있는 한국어 감정 분석 모델
# → NSMC (네이버 영화 리뷰 데이터셋) 기반 파인튜닝 모델
MODEL_NAME = "blockenters/finetuned-nsmc-sentiment"


# ============================================================
# 전역 pipeline 객체 (모델 캐싱용)
# ============================================================

# pipeline을 매번 새로 생성하면
# → 모델 로딩 시간이 매우 오래 걸림
# → 따라서 최초 1회만 로딩 후 재사용
_pipe = None


# ============================================================
# 감정 분석 pipeline 로드 함수
# ============================================================

def get_sentiment_pipe():
    """
    감정 분석 pipeline을 생성하거나
    이미 생성된 pipeline을 반환하는 함수
    """

    global _pipe

    # pipeline이 아직 생성되지 않았으면
    if _pipe is None:

        # HuggingFace pipeline 생성
        # task: sentiment-analysis (감정 분석)
        _pipe = pipeline(
            "sentiment-analysis",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
        )

    # 이미 생성된 pipeline 재사용
    return _pipe


# ============================================================
# 모델 라벨을 사람이 이해하기 쉬운 형태로 변환
# ============================================================

def normalize_label(label_raw: str) -> str:
    """
    HuggingFace 모델이 반환하는 LABEL 값을
    사람이 이해하기 쉬운 값으로 변환

    일반적인 NSMC 모델 convention
    LABEL_1 → positive
    LABEL_0 → negative
    """

    if label_raw == "LABEL_1":
        return "positive"

    if label_raw == "LABEL_0":
        return "negative"

    # 예외 상황에서는 원래 값 그대로 반환
    return label_raw


# ============================================================
# 감정 분석 예측 함수
# ============================================================

def predict_sentiment(text: str) -> dict:
    """
    입력 텍스트(text)에 대해 감정 분석 수행

    반환 값:
    {
        "model": 모델 이름
        "label_raw": 모델 원래 출력
        "label": 정규화된 감정 결과
        "score": 예측 확률
    }
    """

    # 감정 분석 pipeline 가져오기
    pipe = get_sentiment_pipe()

    # --------------------------------------------------------
    # 모델 추론
    # --------------------------------------------------------
    # truncation=True
    # → 입력 문장이 너무 길 경우 잘라서 처리
    #
    # max_length=512
    # → BERT 기반 모델의 최대 토큰 길이 제한
    #
    # [0]
    # → pipeline 결과는 리스트로 반환되므로 첫 번째 결과 사용
    result = pipe(text, truncation=True, max_length=512)[0]


    # --------------------------------------------------------
    # 결과 값 추출
    # --------------------------------------------------------

    # 모델이 반환한 원본 라벨 (예: LABEL_1)
    label_raw = result.get("label")

    # 예측 확률 (confidence score)
    score = float(result.get("score", 0.0))


    # --------------------------------------------------------
    # 최종 결과 반환
    # --------------------------------------------------------

    return {
        "model": MODEL_NAME,                 # 사용한 모델 이름
        "label_raw": label_raw,              # 모델 원본 라벨
        "label": normalize_label(label_raw), # 사람이 이해하기 쉬운 라벨
        "score": score,                      # 감정 예측 확률
    }
```

---
`reviews/serializers.py` : 모델 로딩 + 추론
기존 `CollectedReviewSerializer`는 유지 + 추론용 serializer 추가
```python
# ============================================================
# reviews/serializers.py
# Django REST Framework Serializer 정의 파일
# ============================================================

# DRF serializer 모듈 import
# → 데이터 검증(validation) 및 JSON 변환(직렬화)에 사용
from rest_framework import serializers

# 리뷰 데이터를 저장하는 Django 모델 import
from .models import CollectedReview


# ============================================================
# 1️⃣ CollectedReview 모델용 Serializer
# ============================================================
class CollectedReviewSerializer(serializers.ModelSerializer):
    """
    CollectedReview 모델 데이터를
    JSON 형태로 변환하거나(JSON 응답),
    JSON 데이터를 모델 객체로 변환할 때 사용되는 Serializer
    """

    class Meta:
        # 어떤 모델을 기반으로 Serializer를 만들지 지정
        model = CollectedReview

        # API에서 사용할 필드 목록
        # → 모델 필드 중 아래 항목만 JSON으로 변환됨
        fields = [
            "id",           # DB 기본 키 (Primary Key)
            "title",        # 리뷰 제목
            "review",       # 리뷰 본문
            "doc_id",       # 중복 방지용 문서 ID
            "collected_at"  # 데이터 수집 시각
        ]


# ============================================================
# 2️⃣ 감정 분석 API 입력 검증용 Serializer
# ============================================================
class SentimentTextSerializer(serializers.Serializer):
    """
    감정 분석 API에서 사용자가 직접 텍스트를 POST로 보낼 때
    입력 데이터 검증(validation)을 수행하는 Serializer

    예시 요청

    POST /api/sentiment/

    {
        "text": "이 영화 정말 재미있다"
    }
    """

    # ------------------------------------------------------------
    # 분석할 텍스트 필드
    # ------------------------------------------------------------
    text = serializers.CharField(

        # 빈 문자열 허용 여부
        # False → 반드시 내용이 있어야 함
        allow_blank=False,

        # 최대 길이 제한
        # 너무 긴 텍스트 입력 방지 (서버 보호 목적)
        max_length=5000
    )
```

---
`reviews/views.py`
✅ 기존 ViewSet 유지하면서 `@action` 추가
- `GET /reviews/{id}/sentiment/` : DB의 review로 추론
- `POST /reviews/sentiment/` : 텍스트로 추론 (detail=False)
```python
# ============================================================
# Django REST Framework ViewSet + 감정 분석 API
# ============================================================

# DRF ViewSet 기능 import
# → CRUD 또는 조회 기능을 하나의 클래스에서 관리
from rest_framework import viewsets, status

# API 접근 권한 설정 클래스
from rest_framework.permissions import IsAuthenticatedOrReadOnly

# ViewSet에 추가 API endpoint(action)를 만들기 위한 데코레이터
from rest_framework.decorators import action

# HTTP 응답 객체
from rest_framework.response import Response


# Django 모델 import (DB 테이블: stg_movie_reviews)
from .models import CollectedReview

# Serializer import
# - CollectedReviewSerializer : DB 데이터 JSON 변환
# - SentimentTextSerializer   : 감정분석 입력 검증
from .serializers import CollectedReviewSerializer, SentimentTextSerializer

# HuggingFace 감정 분석 함수
from .services import predict_sentiment

# 인증 없이 접근 가능하도록 하는 권한 클래스
from rest_framework.permissions import AllowAny


# ============================================================
# 리뷰 데이터 조회 + 감정 분석 API ViewSet
# ============================================================
class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    리뷰 데이터 확인용 ViewSet

    기본 제공 API
    -----------------
    GET /reviews/           → 리뷰 목록 조회
    GET /reviews/{id}/      → 리뷰 상세 조회

    추가 action API
    -----------------
    GET  /reviews/{id}/sentiment/  → DB 리뷰 감정분석
    POST /reviews/sentiment/       → 텍스트 직접 감정분석
    """

    # ------------------------------------------------------------
    # 조회할 데이터(QuerySet)
    # ------------------------------------------------------------
    # DB에서 CollectedReview 데이터를 가져와
    # id 기준 내림차순 정렬 (최신 데이터 먼저)
    queryset = CollectedReview.objects.all().order_by("-id")


    # ------------------------------------------------------------
    # 사용할 Serializer 지정
    # ------------------------------------------------------------
    serializer_class = CollectedReviewSerializer


    # ------------------------------------------------------------
    # 기본 API 접근 권한
    # ------------------------------------------------------------
    # 비로그인 사용자 → 읽기(GET) 가능
    # 로그인 사용자 → 읽기 + 쓰기 가능
    # 하지만 ReadOnlyModelViewSet이므로 실제로는 GET만 제공
    permission_classes = [IsAuthenticatedOrReadOnly]


    # ============================================================
    # 1️⃣ DB 리뷰 감정 분석 API
    # ============================================================
    @action(detail=True, methods=["get"], url_path="sentiment")
    def sentiment(self, request, pk=None):
        """
        GET /reviews/{id}/sentiment/

        DB에 저장된 review 텍스트를 가져와
        HuggingFace 모델로 감정 분석 수행
        """

        # URL의 id에 해당하는 리뷰 객체 조회
        obj = self.get_object()

        # 리뷰 텍스트가 없는 경우 에러 반환
        if not obj.review:
            return Response(
                {"detail": "review text is empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 감정 분석 수행
        pred = predict_sentiment(obj.review)

        # 결과 반환
        return Response(
            {
                "id": obj.id,         # 리뷰 ID
                "title": obj.title,   # 리뷰 제목
                "sentiment": pred,    # 감정 분석 결과
            },
            status=status.HTTP_200_OK
        )


    # ============================================================
    # 2️⃣ 텍스트 직접 감정 분석 API
    # ============================================================
    @action(
        detail=False,              # 특정 id 필요 없음
        methods=["post"],          # POST 요청
        url_path="sentiment",      # URL 경로
        permission_classes=[AllowAny],  # 로그인 없이 접근 가능
    )
    def sentiment_text(self, request):
        """
        POST /reviews/sentiment/

        요청 body 예시
        {
            "text": "이 영화 정말 재미있다"
        }

        사용자가 직접 텍스트를 보내면
        해당 텍스트에 대해 감정 분석 수행
        """

        # 입력 데이터 검증
        serializer = SentimentTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 검증된 텍스트 추출
        text = serializer.validated_data["text"]

        # 감정 분석 수행
        pred = predict_sentiment(text)

        # 결과 반환
        return Response(pred, status=status.HTTP_200_OK)
```

---
### DRF에 Json이 잘 들어오는지 테스트

가상환경 활성화 후 필요한 모듈 설치
```bash
source .venv/bin/activate
uv pip install transformers torch
```

서버먼저 실행하기
```bash
python manage.py runserver
```

새로운 bash를 활성화 한후 가상환경 활성화 후 테스트 시작
DB 리뷰 감정분석 (GET)
```bash
curl http://127.0.0.1:8000/api/reviews/collected-reviews/
```

텍스트 직접 감정분석 (POST)
```bash
curl -X POST http://127.0.0.1:8000/api/reviews/collected-reviews/sentiment/ -H "Content-Type: application/json" -d '{"text":"이 영화 진짜 재밌었어요!"}'
```

DRF에 모델 연결 + 추론 API 테스트까지 성공
```bash
{
  "model": "blockenters/finetuned-nsmc-sentiment",
  "label_raw": "LABEL_1",
  "label": "positive",
  "score": 0.9383
}
```

---
### Imsomnia 테스트 해보기

텍스트 직접 감정분석 (POST)
![[Pasted image 20260301091035.png]]
- Name: `Sentiment - Text`
- Method: **POST**
- URL: `http://127.0.0.1:8000/api/reviews/collected-reviews/sentiment/`
```json
{  
"text": "이 영화 진짜 재밌었어요!"  
}
```


DB 리뷰 id로 감정분석 (GET)
![[Pasted image 20260301091719.png]]

---
### 탬플릿 만들기

`mysite/urls.py`
```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("todo/", include("todo.urls")),
    path("", lambda request: redirect("todo_List")),

    path("", include("accounts.urls")),
    path("interaction/", include("interaction.urls")),

    # ✅ API용
    path("api/reviews/", include("reviews.urls")),

    # ✅ HTML 페이지용 (api 없이)
    path("reviews/", include("reviews.page_urls")),
]
```


`reviews/views.py` : URL 연결(템플릿 렌더링 뷰)
```python
from django.shortcuts import render

# 독립적인 함수 생성
def reviews_page(request):
    return render(request, "reviews/reviews_page.html")
```

`reviews/urls.py`
```python
from django.urls import path # 추가
from rest_framework.routers import DefaultRouter
from .views import CollectedReviewViewSet, reviews_page # 추가

router = DefaultRouter()
router.register(r"collected-reviews", CollectedReviewViewSet, basename="collected-reviews")

urlpatterns = [
    path("reviews/page/", reviews_page, name="reviews-page"), # 추가
]

urlpatterns += router.urls
```

`list.html`에 버튼 추가
```html
<button id="movieReviewsBtn">🎬 영화 리뷰 보기</button>

<script>
  document.getElementById("movieReviewsBtn").addEventListener("click", () => {
    window.location.href = "/reviews/page/";
  });
</script>
```
---
html을 js와 분리해서 작성하세요.

`templates/reviews/reviews_page.html`
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="reviews-wrap">
  <!-- 왼쪽: 리뷰 목록 -->
  <section class="card">
    <div class="btn-row" style="justify-content:space-between;">
      <h2 class="title">🎬 영화 리뷰</h2>
      <button id="backToTodo">← Todo로</button>
    </div>
    <p class="muted">리뷰글을 선택하면 영화분석이 시작됩니다.</p>

    <div id="reviewsList"></div>

    <div class="pagination">
      <button id="prevBtn">이전</button>
      <span id="pageInfo" class="muted"></span>
      <button id="nextBtn">다음</button>
    </div>
  </section>

  <!-- 오른쪽: 분석 패널 -->
  <section class="card">
    <h2 class="title">🧠 감정 분석</h2>
    <p class="muted">선택한 리뷰 또는 직접 입력한 텍스트를 분석합니다.</p>

    <div class="hr"></div>

    <div class="kv">
      <div class="muted">글번호 <strong id="selectedId">없음</strong></div>
      <div class="muted">제목 <strong id="selectedTitle">리뷰를 선택하세요</strong></div>
    </div>

    <div style="margin-top:10px;">
      <textarea id="inputText" placeholder="여기에 텍스트를 붙여넣고 [텍스트 분석]을 눌러도 돼요."></textarea>
    </div>

    <div class="btn-row" style="margin-top:10px;">
      <button id="analyzeSelected" class="primary" disabled>선택 리뷰 분석</button>
      <button id="analyzeText">텍스트 분석</button>
      <button id="clearBtn">초기화</button>
    </div>

    <div class="hr"></div>

    <div id="resultArea" class="muted">결과가 여기에 표시됩니다.</div>
  </section>
</div>

<!-- ✅ 외부 JS 파일 로드 -->  
<script src="{% static 'js/reviews/reviews_page.js' %}"></script>

{% endblock %}
```


`static/js/reviews/reviews_page.js`
```js
/*
  ============================================================
  리뷰 목록 + 감정분석 UI 스크립트
  - DRF API(리뷰 목록/상세/감정분석)를 호출해서 화면에 표시
  - window.api (axios 인스턴스)가 base.html에서 로드되어 있어야 함
  ============================================================
*/
document.addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // 0) 사전 체크: api.js 로드 확인
  // ============================================================
  // window.api는 보통 api.js에서 만들어둔 axios 인스턴스입니다.
  // (예: baseURL, Authorization 헤더, withCredentials 등 공통 설정)
  if (!window.api) {
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // ============================================================
  // 1) 페이지 이동 버튼
  // ============================================================
  // 'Todo 목록' 페이지로 돌아가기
  document.getElementById("backToTodo").onclick = () => location.href = "/todo/list/";

  // ============================================================
  // 2) 상태(state) 변수
  // ============================================================
  // currentPage: 현재 페이지 번호 (페이지네이션)
  let currentPage = 1;

  // selected: 사용자가 클릭해서 선택한 리뷰(현재 선택 상태 저장)
  let selected = { id: null, title: "", review: "" };

  // ============================================================
  // 3) API 엔드포인트 (router.register 기준)
  // ============================================================
  // 목록 조회: GET /api/reviews/collected-reviews/?page=1
  const LIST_URL = (page) => `/api/reviews/collected-reviews/?page=${page}`;

  // 선택 리뷰 감정분석: GET /api/reviews/collected-reviews/{id}/sentiment/
  const SENTIMENT_BY_ID = (id) => `/api/reviews/collected-reviews/${id}/sentiment/`;

  // 텍스트 직접 감정분석: POST /api/reviews/collected-reviews/sentiment/
  const SENTIMENT_TEXT = `/api/reviews/collected-reviews/sentiment/`;

  // ============================================================
  // 4) DOM 요소 캐싱 (자주 쓰는 요소는 변수로 저장)
  // ============================================================
  const $list = document.getElementById("reviewsList");     // 리뷰 목록이 렌더링될 영역
  const $pageInfo = document.getElementById("pageInfo");    // "현재/전체" 페이지 표시 영역
  const $prev = document.getElementById("prevBtn");         // 이전 버튼
  const $next = document.getElementById("nextBtn");         // 다음 버튼

  const $selectedId = document.getElementById("selectedId");      // 선택된 리뷰 id 표시 영역
  const $selectedTitle = document.getElementById("selectedTitle");// 선택된 리뷰 제목 표시 영역
  const $inputText = document.getElementById("inputText");        // 분석할 텍스트 입력 textarea
  const $analyzeSelected = document.getElementById("analyzeSelected"); // 선택 리뷰 분석 버튼
  const $result = document.getElementById("resultArea");          // 감정 분석 결과 표시 영역

  // ============================================================
  // 5) 결과 렌더링 함수
  // ============================================================
  // - id 기반 감정분석 응답은 { sentiment: {...} } 형태일 수 있고
  // - 텍스트 직접 감정분석 응답은 {...} 형태일 수 있어서
  //   payload.sentiment가 있으면 그것을 우선 사용합니다.
  function renderResult(payload) {
    const s = payload?.sentiment ?? payload; // id 기반이면 {sentiment:{...}} 형태

    if (!s) {
      $result.textContent = "결과 없음";
      return;
    }

    // label / score 추출 (서버 응답 키에 유연하게 대응)
    const label = s.label || s.label_raw || "unknown";
    const score = (typeof s.score === "number") ? s.score.toFixed(4) : "-";

    // NSMC 관례: LABEL_1 = positive, LABEL_0 = negative
    const isPos = (s.label === "positive" || s.label_raw === "LABEL_1");

    // 배지 UI 클래스/텍스트 결정
    const badgeClass = isPos ? "pos" : "neg";
    const badgeText = isPos ? "긍정" : "부정";

    // 결과를 HTML로 출력 (배지 + 부가정보)
    $result.innerHTML = `
      <div class="badge ${badgeClass}">
        <strong>${badgeText}</strong>
        <span class="muted">score: ${score}</span>
      </div>
      <div style="margin-top:10px;" class="muted">
        <div>model: <code>${s.model ?? "-"}</code></div>
        <div>label_raw: <code>${s.label_raw ?? "-"}</code></div>
      </div>
    `;
  }

  // ============================================================
  // 6) 리뷰 선택 처리 함수
  // ============================================================
  // - 목록에서 특정 리뷰를 클릭하면 선택 상태를 갱신하고
  // - 입력창에 리뷰 본문을 자동 채우며
  // - "선택 리뷰 분석" 버튼을 활성화합니다.
  function selectReview(itemEl, data) {

    // (1) 기존 active 표시 제거 후, 클릭된 항목에 active 추가
    [...document.querySelectorAll(".review-item")].forEach(el => el.classList.remove("active"));
    itemEl.classList.add("active");

    // (2) 선택 상태 업데이트
    selected = { id: data.id, title: data.title, review: data.review };

    // (3) 우측 패널 표시 업데이트
    $selectedId.textContent = String(selected.id);
    $selectedTitle.textContent = selected.title || "(제목 없음)";
    $inputText.value = selected.review || "";

    // (4) 분석 버튼 활성화
    $analyzeSelected.disabled = false;

    // (5) 안내 문구 출력
    $result.textContent = "선택 리뷰를 분석할 준비가 됐어요.";
  }

  // ============================================================
  // 7) 리뷰 목록 렌더링 함수
  // ============================================================
  function renderList(items) {
    $list.innerHTML = "";

    // 데이터가 없으면 안내 표시
    if (!items || items.length === 0) {
      $list.innerHTML = "<p class='muted'>리뷰가 없습니다.</p>";
      return;
    }

    // 각 리뷰를 카드 형태로 렌더링
    items.forEach(r => {
      const el = document.createElement("div");
      el.className = "review-item";

      // 본문 일부만 잘라서 스니펫으로 표시 (최대 120자)
      const snippet = (r.review || "").slice(0, 120);

      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <strong>${r.title ?? "(제목 없음)"}</strong>
          <span class="muted"> 글번호 ${r.id}</span>
        </div>
        <div class="review-snippet">
          ${snippet}${(r.review || "").length > 120 ? "..." : ""}
        </div>
      `;

      // 클릭 시 선택 처리
      el.addEventListener("click", () => selectReview(el, r));

      $list.appendChild(el);
    });
  }

  // ============================================================
  // 8) 페이지네이션 표시 업데이트
  // ============================================================
  // 서버가 반환하는 형식에 따라 current_page/page_count/previous/next 를 사용
  function updatePagination(data) {
    const current = data.current_page ?? currentPage ?? 1;
    const total = data.page_count ?? "?";

    // 예: "1 / 10"
    $pageInfo.textContent = `${current} / ${total}`;

    // previous/next가 없으면 버튼 비활성화
    $prev.disabled = !data.previous;
    $next.disabled = !data.next;
  }

  // ============================================================
  // 9) 페이지 로드(목록 조회) 함수
  // ============================================================
  async function loadPage(page) {
    try {
      // GET 요청으로 목록 가져오기
      const res = await window.api.get(LIST_URL(page));
      const data = res.data;

      // 서버 응답이 {data:[...]} 또는 {results:[...]} 형태일 수 있으니 둘 다 대응
      renderList(data.data || data.results || []);

      // 페이지네이션 UI 갱신
      updatePagination(data);

      // currentPage 업데이트
      currentPage = data.current_page || page;

    } catch (err) {
      console.error("리뷰 목록 로드 실패", err.response?.data || err.message);
      alert("리뷰 목록 로드 실패");
    }
  }

  // ============================================================
  // 10) 페이지 이동 버튼 이벤트
  // ============================================================
  $prev.onclick = () => {
    // 현재 페이지가 1보다 클 때만 이전 페이지 로드
    if (currentPage > 1) loadPage(currentPage - 1);
  };

  $next.onclick = () => {
    // 다음 페이지 로드 (서버에서 next가 없으면 disabled 처리됨)
    loadPage(currentPage + 1);
  };

  // ============================================================
  // 11) 선택 리뷰 감정 분석 버튼
  // ============================================================
  document.getElementById("analyzeSelected").onclick = async () => {
    if (!selected.id) return;

    try {
      $result.textContent = "분석 중...";

      // 선택한 리뷰 id로 감정분석 GET 호출
      const res = await window.api.get(SENTIMENT_BY_ID(selected.id));

      // 결과 렌더링
      renderResult(res.data);

    } catch (err) {
      console.error("선택 리뷰 분석 실패", err.response?.data || err.message);
      alert("선택 리뷰 분석 실패");
    }
  };

  // ============================================================
  // 12) 텍스트 직접 감정 분석 버튼
  // ============================================================
  document.getElementById("analyzeText").onclick = async () => {
    const text = $inputText.value.trim();

    // 입력이 없으면 안내
    if (!text) return alert("텍스트를 입력하세요.");

    try {
      $result.textContent = "분석 중...";

      // 입력 텍스트를 POST로 전달
      const res = await window.api.post(SENTIMENT_TEXT, { text });

      // 결과 렌더링
      renderResult(res.data);

    } catch (err) {
      console.error("텍스트 분석 실패", err.response?.data || err.message);
      alert("텍스트 분석 실패");
    }
  };

  // ============================================================
  // 13) 초기화 버튼: 선택 상태/입력/결과 UI 초기화
  // ============================================================
  document.getElementById("clearBtn").onclick = () => {
    // 선택 상태 초기화
    selected = { id: null, title: "", review: "" };

    // UI 초기화
    $selectedId.textContent = "없음";
    $selectedTitle.textContent = "리뷰를 선택하세요";
    $inputText.value = "";
    $analyzeSelected.disabled = true;
    $result.textContent = "결과가 여기에 표시됩니다.";

    // 목록 active 표시 제거
    [...document.querySelectorAll(".review-item")].forEach(el => el.classList.remove("active"));
  };

  // ============================================================
  // 14) 페이지 최초 진입 시 1페이지 로드
  // ============================================================
  loadPage(1);
});
```


`static/css/reviews.css`
```css
/* ===== Layout ===== */
.reviews-wrap {
  display: grid;                 /* ✅ 중요: grid 활성화 */
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  align-items: start;
}

/* 모바일 대응 */
@media (max-width: 980px) {
  .reviews-wrap {
    grid-template-columns: 1fr;
  }
}

/* ===== Card ===== */
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  min-width: 0;                 /* ✅ grid 안에서 overflow 방지 */
}

.title {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 10px;
  color: #111827;
}

.muted {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}

/* ===== List (left) ===== */
#reviewsList {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.review-item {
  padding: 12px 10px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  background: #fff;
  transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
}

.review-item:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
  transform: translateY(-1px);
}

.review-item.active {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.review-snippet {
  color: #374151;
  font-size: 14px;
  margin-top: 6px;
  line-height: 1.45;
}

/* ===== Right panel ===== */
.kv {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 8px;
  font-size: 14px;
  align-items: center;
}

.hr {
  height: 1px;
  background: #e5e7eb;
  margin: 12px 0;
}

textarea {
  width: 100%;
  min-height: 140px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  background: #fff;
}

textarea:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.25);
}

/* ===== Buttons ===== */
.btn-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
  margin-bottom: 10px; /* ✅ 아래 여백 */
}

button {
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 13px;
  line-height: 1;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

button:hover {
  background: #f9fafb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transform: translateY(-1px);
}

button.primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

button.primary:hover {
  background: #0b1220;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ===== Result ===== */
#resultArea {
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fafafa;
  min-height: 64px;
}

/* ===== Badge ===== */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.badge.pos {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.badge.neg {
  background: #fef2f2;
  border-color: #fecaca;
}

/* ===== Pagination ===== */
.pagination {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.card .pagination {
  width: fit-content !important;     /* 기존 width:min(...) 덮기 */
  margin: 18px auto 0 !important;    /* 가운데 정렬 */
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 12px !important;
}
```

`base.html` css 추가
```html
<head>
  <link rel="stylesheet" href="{% static 'css/reviews.css' %}">
</head>
```