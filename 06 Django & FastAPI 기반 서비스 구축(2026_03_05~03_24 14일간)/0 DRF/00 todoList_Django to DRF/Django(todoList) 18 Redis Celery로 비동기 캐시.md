설치 & 기본 설정 (Redis + Celery)
```bash
uv pip install celery redis
```

`mysite/celery.py` (새로 생성)
```python
# mysite/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

app = Celery("mysite")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

`mysite/__init__.py`
```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```

`mysite/settings.py`
```python
CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/1"

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Seoul"
```

`reviews/tasks.py` (새로 생성)
```python
from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist

from .models import CollectedReview
from .services import predict_sentiment


@shared_task(bind=True)
def analyze_review_sentiment_by_id(self, review_id: int) -> dict:
    """
    DB에 있는 리뷰(id)를 가져와서 services의 AI 로직으로 감정분석 후 결과 반환
    """
    try:
        obj = CollectedReview.objects.get(id=review_id)
    except ObjectDoesNotExist:
        return {"status": "error", "detail": "review not found", "review_id": review_id}

    text = (obj.review or "").strip()
    if not text:
        return {"status": "error", "detail": "review text is empty", "review_id": review_id}

    pred = predict_sentiment(text)

    return {
        "status": "ok",
        "review_id": obj.id,
        "title": obj.title,
        "sentiment": pred,
    }


@shared_task(bind=True)
def analyze_sentiment_text(self, text: str) -> dict:
    """
    텍스트를 직접 받아 감정분석
    """
    text = (text or "").strip()
    if not text:
        return {"status": "error", "detail": "text is empty"}

    pred = predict_sentiment(text)
    return {"status": "ok", "sentiment": pred}
```

`reviews/views.py`
`CollectedReviewViewSet`에 동기 sentiment action이 붙어 있으므로 거기에 비동기 시작 + 결과 조회만 추가하면 됩니다.
```python
from celery.result import AsyncResult
from .tasks import analyze_review_sentiment_by_id, analyze_sentiment_text


class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    # ... (기존 그대로)

    # ✅ (기존) 동기 sentiment action
    # @action(detail=True, methods=["get"], url_path="sentiment")
    # def sentiment(...):
    #     ...

    # ---------------------------------------------------------
    # ✅ (추가 1) DB 리뷰 비동기 분석 시작: job_id 즉시 반환
    # POST /api/reviews/collected-reviews/{id}/sentiment-async/
    # ---------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="sentiment-async")
    def sentiment_async(self, request, pk=None):
        review_id = int(pk)
        task = analyze_review_sentiment_by_id.delay(review_id)

        return Response(
            {"task_id": task.id, "status": "queued"},
            status=status.HTTP_202_ACCEPTED
        )

    # ---------------------------------------------------------
    # ✅ (추가 2) 텍스트 비동기 분석 시작
    # POST /api/reviews/collected-reviews/sentiment-async/
    # body: {"text": "..."}
    # ---------------------------------------------------------
    @action(detail=False, methods=["post"], url_path="sentiment-async")
    def sentiment_text_async(self, request):
        serializer = SentimentTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text = serializer.validated_data["text"]
        task = analyze_sentiment_text.delay(text)

        return Response(
            {"task_id": task.id, "status": "queued"},
            status=status.HTTP_202_ACCEPTED
        )

    # ---------------------------------------------------------
    # ✅ (추가 3) 결과 조회
    # GET /api/reviews/collected-reviews/sentiment-result/{task_id}/
    # ---------------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"sentiment-result/(?P<task_id>[^/.]+)")
    def sentiment_result(self, request, task_id=None):
        res = AsyncResult(task_id)

        payload = {"task_id": task_id, "state": res.state}

        if res.state == "PENDING":
            return Response(payload, status=status.HTTP_200_OK)

        if res.state == "FAILURE":
            payload["error"] = str(res.result)
            return Response(payload, status=status.HTTP_200_OK)

        if res.state == "SUCCESS":
            payload["result"] = res.result
            return Response(payload, status=status.HTTP_200_OK)

        return Response(payload, status=status.HTTP_200_OK)
```


수정된 전체 코드 `reviews/views.py`
```python
from celery.result import AsyncResult
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CollectedReview
from .serializers import CollectedReviewSerializer, SentimentTextSerializer
from .tasks import analyze_review_sentiment_by_id, analyze_sentiment_text
from django.shortcuts import render


class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CollectedReview.objects.all().order_by("-id")
    serializer_class = CollectedReviewSerializer

    # ---------------------------------------------------------
    # ✅ (A) DB 리뷰 비동기 분석 시작: job_id 즉시 반환
    # POST /api/reviews/collected-reviews/{id}/sentiment-async/
    # ---------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="sentiment-async")
    def sentiment_async(self, request, pk=None):
        review_id = int(pk)
        task = analyze_review_sentiment_by_id.delay(review_id)

        return Response(
            {"task_id": task.id, "status": "queued"},
            status=status.HTTP_202_ACCEPTED
        )

    # ---------------------------------------------------------
    # ✅ (B) 텍스트 비동기 분석 시작
    # POST /api/reviews/collected-reviews/sentiment-async/
    # body: {"text": "..."}
    # ---------------------------------------------------------
    @action(detail=False, methods=["post"], url_path="sentiment-async")
    def sentiment_text_async(self, request):
        serializer = SentimentTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text = serializer.validated_data["text"]
        task = analyze_sentiment_text.delay(text)

        return Response(
            {"task_id": task.id, "status": "queued"},
            status=status.HTTP_202_ACCEPTED
        )

    # ---------------------------------------------------------
    # ✅ (C) 결과 조회
    # GET /api/reviews/collected-reviews/sentiment-result/{task_id}/
    # ---------------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"sentiment-result/(?P<task_id>[^/.]+)")
    def sentiment_result(self, request, task_id=None):
        res = AsyncResult(task_id)

        payload = {"task_id": task_id, "state": res.state}

        if res.state == "PENDING":
            return Response(payload, status=status.HTTP_200_OK)

        if res.state == "FAILURE":
            payload["error"] = str(res.result)
            return Response(payload, status=status.HTTP_200_OK)

        # SUCCESS
        if res.state == "SUCCESS":
            payload["result"] = res.result
            return Response(payload, status=status.HTTP_200_OK)

        # STARTED / RETRY 등
        return Response(payload, status=status.HTTP_200_OK)
        
def reviews_page(request):  
	return render(request, "reviews/reviews_page.html")
```
---
✅ 비동기 엔드포인트 추가 (추가)
```js
// ✅ 비동기 시작
const SENTIMENT_ASYNC_BY_ID = (id) => `/api/reviews/collected-reviews/${id}/sentiment-async/`;
const SENTIMENT_ASYNC_TEXT = `/api/reviews/collected-reviews/sentiment-async/`;

// ✅ 결과 조회
const SENTIMENT_RESULT = (taskId) =>
  `/api/reviews/collected-reviews/sentiment-result/${taskId}/`;
```

✅ pollResult 함수 추가 (추가)
```js
// ✅ task 완료까지 결과 조회(폴링)
async function pollResult(taskId, { intervalMs = 800, timeoutMs = 30000 } = {}) {
  const start = Date.now();

  while (true) {
    const res = await window.api.get(SENTIMENT_RESULT(taskId));
    const data = res.data;

    if (data.state === "SUCCESS") return data.result;
    if (data.state === "FAILURE") throw new Error(data.error || "Task failed");

    if (Date.now() - start > timeoutMs) {
      throw new Error("분석 시간이 오래 걸려 타임아웃되었습니다.");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
```

✅ 선택 리뷰 분석 버튼 로직 변경 (동기 → 비동기) (수정)
```js
// const res = await window.api.get(SENTIMENT_BY_ID(selected.id));  
// renderResult(res.data);

document.getElementById("analyzeSelected").onclick = async () => {
  if (!selected.id) return;

  try {
    $result.textContent = "분석 요청 중...";

    // ✅ 1) 비동기 작업 시작 (POST)
    const startRes = await window.api.post(SENTIMENT_ASYNC_BY_ID(selected.id));
    const taskId = startRes.data.task_id;

    $result.textContent = `분석 중... (task_id=${taskId})`;

    // ✅ 2) 결과 조회(폴링)
    const finalResult = await pollResult(taskId);

    // ✅ 3) 화면 표시
    renderResult(finalResult);

  } catch (err) {
    console.error("선택 리뷰 분석 실패", err.response?.data || err.message);
    alert(err.message || "선택 리뷰 분석 실패");
  }
};
```

`reviews_page.html`
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



  // ✅ 비동기 시작
  const SENTIMENT_ASYNC_BY_ID = (id) => `/api/reviews/collected-reviews/${id}/sentiment-async/`;
  const SENTIMENT_ASYNC_TEXT = `/api/reviews/collected-reviews/sentiment-async/`;

  // ✅ 결과 조회
  const SENTIMENT_RESULT = (taskId) => `/api/reviews/collected-reviews/sentiment-result/${taskId}/`;

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


  // 기존 동기처리 코드
  // document.getElementById("analyzeSelected").onclick = async () => {
  //   if (!selected.id) return;
  //   try {
  //     $result.textContent = "분석 중...";
  //     const res = await window.api.get(SENTIMENT_BY_ID(selected.id));
  //     renderResult(res.data);
  //   } catch (err) {
  //     console.error("선택 리뷰 분석 실패", err.response?.data || err.message);
  //     alert("선택 리뷰 분석 실패");
  //   }
  // };


  document.getElementById("analyzeSelected").onclick = async () => {
    if (!selected.id) return;

    try {
      $result.textContent = "분석 요청 중...";

      // ✅ 1) 비동기 작업 시작 (POST)
      const startRes = await window.api.post(SENTIMENT_ASYNC_BY_ID(selected.id));
      const taskId = startRes.data.task_id;

      $result.textContent = `분석 중... (task_id=${taskId})`;

      // ✅ 2) 결과 조회(폴링)
      const finalResult = await pollResult(taskId);

      // ✅ 3) 화면 표시
      renderResult(finalResult);

    } catch (err) {
      console.error("선택 리뷰 분석 실패", err.response?.data || err.message);
      alert(err.message || "선택 리뷰 분석 실패");
    }
};

  // ✅ task 완료까지 결과 조회(폴링)
  async function pollResult(taskId, { intervalMs = 800, timeoutMs = 30000 } = {}) {
    const start = Date.now();

    while (true) {
      const res = await window.api.get(SENTIMENT_RESULT(taskId));
      const data = res.data;

      if (data.state === "SUCCESS") return data.result;
      if (data.state === "FAILURE") throw new Error(data.error || "Task failed");

      if (Date.now() - start > timeoutMs) {
        throw new Error("분석 시간이 오래 걸려 타임아웃되었습니다.");
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  // ✅ 텍스트 분석 버튼
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



Redis 실행(로컬)
```bash
docker run -d --name redis -p 6379:6379 redis:7
```

이미 있다는 결과 
```bash
(DRF_todoList_26221) (.venv) youjung@DESKTOP-PJCRMMU:~/DRF_todoList_26221$ docker run -d --name redis -p 6379:6379 redis:7
docker: Error response from daemon: Conflict. The container name "/redis" is already in use by container "bfef9671f4c87d3a80c1ad8e4cb1daaa5132dee3889a29a11317fe361658fc4f". You have to remove (or rename) that container to be able to reuse that name.
See 'docker run --help'.
```
	이미 redis라는 이름의 컨테이너가 존재한다는 뜻
	기존에 Redis 컨테이너가 있다면 사용해도 됩니다.

실무에서는 보통 Redis를 하나만 두며 그 안에서 기능별로 나눠서 사용합니다.

```bash
docker ps
```
redis 포트가 열려있다면  Celery만 실행하면 됩니다.

```bash
celery -A mysite worker -l info -P solo
```
celery를 실행할때 반드시 runserver가 실행되어 있어야 합니다.



두개 비교해보기
Redis적용전 동기처리
![[Pasted image 20260301112424.png]]

Redis적용후  비동기처리
![[Pasted image 20260301112526.png]]