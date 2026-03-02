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
# reviews/services.py
import os
from transformers import pipeline

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

MODEL_NAME = "blockenters/finetuned-nsmc-sentiment"
_pipe = None


def get_sentiment_pipe():
    global _pipe
    if _pipe is None:
        _pipe = pipeline(
            "sentiment-analysis",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
        )
    return _pipe


def normalize_label(label_raw: str) -> str:
    # 일반적인 NSMC 파인튜닝 관례: LABEL_1=positive, LABEL_0=negative
    if label_raw == "LABEL_1":
        return "positive"
    if label_raw == "LABEL_0":
        return "negative"
    return label_raw


def predict_sentiment(text: str) -> dict:
    pipe = get_sentiment_pipe()
    
    # 긴문장이여도 앞부분 512 토큰까지만 잘라서안전하게 추론
    result = pipe(text, truncation=True, max_length=512)[0]

    label_raw = result.get("label")
    score = float(result.get("score", 0.0))

    return {
        "model": MODEL_NAME,
        "label_raw": label_raw,
        "label": normalize_label(label_raw),
        "score": score,
    }
```


---
`reviews/serializers.py` : 모델 로딩 + 추론
기존 `CollectedReviewSerializer`는 유지 + 추론용 serializer 추가
```python
# reviews/serializers.py
from rest_framework import serializers
from .models import CollectedReview


class CollectedReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectedReview
        fields = ["id", "title", "review", "doc_id", "collected_at"]


class SentimentTextSerializer(serializers.Serializer):
    """
    POST로 텍스트를 직접 보내서 감정분석할 때 입력 검증용
    """
    text = serializers.CharField(allow_blank=False, max_length=5000)
```


---
`reviews/views.py`
✅ 기존 ViewSet 유지하면서 `@action` 추가
- `GET /reviews/{id}/sentiment/` : DB의 review로 추론
- `POST /reviews/sentiment/` : 텍스트로 추론 (detail=False)
```python
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CollectedReview
from .serializers import CollectedReviewSerializer, SentimentTextSerializer
from .services import predict_sentiment
from rest_framework.permissions import AllowAny


class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    데이터 확인용: 읽기 전용 (list, retrieve)
    + 감정분석 action 추가
    """
    queryset = CollectedReview.objects.all().order_by("-id")
    serializer_class = CollectedReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=["get"], url_path="sentiment")
    def sentiment(self, request, pk=None):
        """
        GET /reviews/{id}/sentiment/
        DB에 저장된 review 텍스트로 감정분석
        """
        obj = self.get_object()
        if not obj.review:
            return Response(
                {"detail": "review text is empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        pred = predict_sentiment(obj.review)

        return Response(
            {
                "id": obj.id,
                "title": obj.title,
                "sentiment": pred,
            },
            status=status.HTTP_200_OK
        )

    @action(
        detail=False, 
        methods=["post"], 
        url_path="sentiment", 
        permission_classes=[AllowAny],
    )
    def sentiment_text(self, request):
        """
        POST /reviews/sentiment/
        body: {"text": "..."}
        텍스트 직접 보내 감정분석
        """
        serializer = SentimentTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text = serializer.validated_data["text"]
        pred = predict_sentiment(text)

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

<script>
document.addEventListener("DOMContentLoaded", () => {
  // ✅ api.js 로드 확인
  if (!window.api) {
    alert("설정 오류: api.js가 로드되지 않았습니다.");
    return;
  }

  // ✅ 이동 버튼
  document.getElementById("backToTodo").onclick = () => location.href = "/todo/list/";

  // ✅ 상태
  let currentPage = 1;
  let selected = { id: null, title: "", review: "" };

  // ✅ 엔드포인트 (네가 만든 router 기준)
  const LIST_URL = (page) => `/api/reviews/collected-reviews/?page=${page}`;
  const SENTIMENT_BY_ID = (id) => `/api/reviews/collected-reviews/${id}/sentiment/`;
  const SENTIMENT_TEXT = `/api/reviews/collected-reviews/sentiment/`;

  const $list = document.getElementById("reviewsList");
  const $pageInfo = document.getElementById("pageInfo");
  const $prev = document.getElementById("prevBtn");
  const $next = document.getElementById("nextBtn");

  const $selectedId = document.getElementById("selectedId");
  const $selectedTitle = document.getElementById("selectedTitle");
  const $inputText = document.getElementById("inputText");
  const $analyzeSelected = document.getElementById("analyzeSelected");
  const $result = document.getElementById("resultArea");

  function renderResult(payload) {
    const s = payload?.sentiment ?? payload; // id 기반이면 {sentiment:{...}} 형태
    if (!s) {
      $result.textContent = "결과 없음";
      return;
    }

    const label = s.label || s.label_raw || "unknown";
    const score = (typeof s.score === "number") ? s.score.toFixed(4) : "-";

    const isPos = (s.label === "positive" || s.label_raw === "LABEL_1");
    const badgeClass = isPos ? "pos" : "neg";
    const badgeText = isPos ? "긍정" : "부정";

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

  function selectReview(itemEl, data) {
    // active 표시
    [...document.querySelectorAll(".review-item")].forEach(el => el.classList.remove("active"));
    itemEl.classList.add("active");

    selected = { id: data.id, title: data.title, review: data.review };

    $selectedId.textContent = String(selected.id);
    $selectedTitle.textContent = selected.title || "(제목 없음)";
    $inputText.value = selected.review || "";
    $analyzeSelected.disabled = false;
    $result.textContent = "선택 리뷰를 분석할 준비가 됐어요.";
  }

  function renderList(items) {
    $list.innerHTML = "";
    if (!items || items.length === 0) {
      $list.innerHTML = "<p class='muted'>리뷰가 없습니다.</p>";
      return;
    }

    items.forEach(r => {
      const el = document.createElement("div");
      el.className = "review-item";
      const snippet = (r.review || "").slice(0, 120);
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <strong>${r.title ?? "(제목 없음)"}</strong>
          <span class="muted"> 글번호 ${r.id}</span>
        </div>
        <div class="review-snippet">${snippet}${(r.review || "").length > 120 ? "..." : ""}</div>
      `;
      el.addEventListener("click", () => selectReview(el, r));
      $list.appendChild(el);
    });
  }

  function updatePagination(data) {
    const current = data.current_page ?? currentPage ?? 1;
    const total = data.page_count ?? "?";
    $pageInfo.textContent = `${current} / ${total}`;
    $prev.disabled = !data.previous;
    $next.disabled = !data.next;
  }

  async function loadPage(page) {
    try {
      const res = await window.api.get(LIST_URL(page));
      const data = res.data;

      renderList(data.data || data.results || []);
      updatePagination(data);

      currentPage = data.current_page || page;
    } catch (err) {
      console.error("리뷰 목록 로드 실패", err.response?.data || err.message);
      alert("리뷰 목록 로드 실패");
    }
  }

  // ✅ 버튼들
  $prev.onclick = () => { if (currentPage > 1) loadPage(currentPage - 1); };
  $next.onclick = () => loadPage(currentPage + 1);

  document.getElementById("analyzeSelected").onclick = async () => {
    if (!selected.id) return;
    try {
      $result.textContent = "분석 중...";
      const res = await window.api.get(SENTIMENT_BY_ID(selected.id));
      renderResult(res.data);
    } catch (err) {
      console.error("선택 리뷰 분석 실패", err.response?.data || err.message);
      alert("선택 리뷰 분석 실패");
    }
  };

  document.getElementById("analyzeText").onclick = async () => {
    const text = $inputText.value.trim();
    if (!text) return alert("텍스트를 입력하세요.");
    try {
      $result.textContent = "분석 중...";
      const res = await window.api.post(SENTIMENT_TEXT, { text });
      renderResult(res.data);
    } catch (err) {
      console.error("텍스트 분석 실패", err.response?.data || err.message);
      alert("텍스트 분석 실패");
    }
  };

  document.getElementById("clearBtn").onclick = () => {
    selected = { id: null, title: "", review: "" };
    $selectedId.textContent = "없음";
    $selectedTitle.textContent = "리뷰를 선택하세요";
    $inputText.value = "";
    $analyzeSelected.disabled = true;
    $result.textContent = "결과가 여기에 표시됩니다.";
    [...document.querySelectorAll(".review-item")].forEach(el => el.classList.remove("active"));
  };

  // 첫 로드
  loadPage(1);
});
</script>

{% endblock %}
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