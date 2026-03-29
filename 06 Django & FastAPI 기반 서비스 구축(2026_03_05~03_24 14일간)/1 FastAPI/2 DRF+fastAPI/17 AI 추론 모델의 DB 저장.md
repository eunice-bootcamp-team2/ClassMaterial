```
기존: FastAPI → 결과만 반환 (저장 없음)  
변경: FastAPI → 계산만 / DRF → 결과를 DB에 저장
```

기존 방식 vs 변경된 방식의 흐름도를 비교합니다
```
기존방식:
JS → DRF → FastAPI → 결과 반환 → 화면 출력 (끝)

문제
- 결과가 저장되지 않음
- 나중에 다시 확인 불가
-------------------------------------------
변경 방식:
JS → DRF → FastAPI → 결과 받음 → DRF DB 저장 → 화면 출력

핵심 변화
- AI 결과를 DB에 저장함
- 서비스 기능으로 발전
```

### 추가된 것 (NEW)

✅ `models.py`
역할: AI 결과를 DB에 저장
- 어떤 리뷰를 분석했는지  
- 어떤 리뷰랑 비교했는지  
- 유사도 점수  
- 언제 분석했는지
AI 분석 결과를 저장하는 테이블

✅ `admin.py`
역할: 관리자 페이지에서 결과 확인
- 저장된 AI 결과 목록 확인  
- 검색 / 필터 가능 
저장된 AI 결과를 눈으로 보는 곳

---
### 수정된 것 (CHANGED)

✅ `views.py`
역할: 핵심 로직 변경된 파일 (가장 중요)

기존
```
FastAPI 결과 → 그대로 반환
```

변경
```
FastAPI 결과 → DB 저장 → 반환
```

추가된 핵심 코드
```python
ReviewSimilarityResult.objects.update_or_create(...)
```
AI 결과를 DB에 저장하도록 변경됨


✅ `urls.py`
역할: API 주소 연결
```
/ai/reviews/<id>/analyze/
```
거의 변화 없음 (구조 유지)


✅ `product-detail.js`
역할: 화면에서 API 호출 + 결과 출력

변경된 부분
- label 추가 (비슷/매우비슷)  
- analysis_id 추가 (DB 저장된 결과 ID)
저장된 결과를 화면에 더 잘 보여주도록 변경


✅ `product_detail.html`
역할: 화면 구조
변화 거의 없음 (JS가 대부분 담당)


✅ `style.css`
역할: UI 스타일

변경 이유
AI 분석 → 비슷한 후기 보기
사용자 친화 UI로 변경

---
`backend/apps/ai_gateway/models.py` : `[추가]` AI 추론 결과 저장 모델
```python
# [추가] AI 추론 결과를 DRF DB에 저장하기 위한 모델 파일

from django.conf import settings
from django.db import models


class ReviewSimilarityResult(models.Model):
    """
    [추가]
    특정 기준 리뷰(source_review)와 비교 리뷰(compared_review)의
    유사도 결과를 저장하는 모델
    """

    # 어떤 상품 안에서 비교했는지 저장
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="ai_similarity_results",
    )

    # 기준이 되는 리뷰
    source_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="source_similarity_results",
    )

    # 비교 대상 리뷰
    compared_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="compared_similarity_results",
    )

    # 버튼을 누른 사용자 (비로그인 사용자일 수 있으므로 null 허용)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_similarity_results",
    )

    # FastAPI 모델 이름 저장
    model_name = models.CharField(
        max_length=100,
        default="upskyy/e5-small-korean",
    )

    # 유사도 점수
    similarity_score = models.FloatField()

    # 프론트에서 쓰는 해석 문구도 같이 저장
    similarity_label = models.CharField(max_length=30)

    # 기준 점수(threshold) 저장
    similarity_threshold = models.FloatField(default=0.45)

    # 당시의 텍스트 스냅샷 저장
    source_review_snapshot = models.TextField()
    compared_review_snapshot = models.TextField()

    # 비교 리뷰 작성자명을 스냅샷으로 저장
    compared_username_snapshot = models.CharField(max_length=150, blank=True)

    # 추론 시각
    analyzed_at = models.DateTimeField(auto_now=True)

    # 최초 생성 시각
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 같은 기준 리뷰 + 비교 리뷰 + 모델 이름 조합은 1개만 유지
        constraints = [
            models.UniqueConstraint(
                fields=["source_review", "compared_review", "model_name"],
                name="unique_review_similarity_result",
            )
        ]
        ordering = ["-similarity_score", "-analyzed_at"]

	# 관리/디버깅용 표시
    def __str__(self):
        return (
            f"[{self.model_name}] "
            f"source={self.source_review_id} "
            f"vs compared={self.compared_review_id} "
            f"score={self.similarity_score:.4f}"
        )
```

이부분이 영향을 주는곳
`def __str__(self):`
- Django Admin 화면 : 한 눈에 보이게 해주는 역할입니다
- `Django shell / print()` : 디버깅할 때 매우 중요합니다
- 로그 출력 : 로그에 찍히는 값도 이 문자열로 나옵니다

---
`backend/apps/ai_gateway/admin.py` : `[추가]` 관리자 페이지에서 저장 결과 확인
```python
# AI 추론 결과를 Django admin에서 확인하기 위한 파일

from django.contrib import admin
from .models import ReviewSimilarityResult


@admin.register(ReviewSimilarityResult)
class ReviewSimilarityResultAdmin(admin.ModelAdmin):
    # 목록에서 주요 필드 확인
    list_display = (
        "id",
        "product",
        "source_review",
        "compared_review",
        "similarity_score",
        "similarity_label",
        "model_name",
        "analyzed_at",
    )

    # 검색 기능
    search_fields = (
        "product__name",
        "source_review__content",
        "compared_review__content",
        "compared_username_snapshot",
        "model_name",
    )

    # 필터
    list_filter = (
        "model_name",
        "similarity_label",
        "analyzed_at",
    )

    # 정렬
    ordering = ("-analyzed_at",)
```
---
```
[설명]
이 코드는 특정 리뷰를 기준으로 같은 상품의 다른 리뷰들과
AI 유사도 분석을 수행하고, 그 결과를 DB에 저장한 뒤 프론트에 반환하는 API입니다.

[전체 흐름]
1. 사용자가 "비슷한 후기 보기" 버튼 클릭
2. JS → Django API (/ai/reviews/<review_id>/analyze/) 호출
3. Django(View)가 기준 리뷰 + 비교 리뷰 목록 조회
4. FastAPI에 요청하여 유사도 계산 수행
5. 결과를 DB(ReviewSimilarityResult)에 저장
6. 상위 유사 리뷰만 정렬하여 프론트에 반환
7. 프론트에서 사용자 친화적으로 화면 출력

[핵심 역할]
- FastAPI: 유사도 계산만 담당 (AI 서버)
- Django(View): 데이터 조회 + 결과 저장 + 응답 반환 (서비스 서버)

[기존 코드 대비 변경점]
1. 단순 결과 반환 → DB 저장 기능 추가
2. 유사도 기준값(threshold) 적용 (낮은 점수 필터링)
3. 분석 결과에 label(비슷/매우비슷) 추가
4. 저장된 결과 id(analysis_id)도 함께 반환
5. 모델 이름(model_name) 관리

[이 코드의 목적]
- AI 결과를 단순 계산이 아니라 "서비스 데이터"로 관리하기 위함
- 어떤 리뷰를 언제 어떻게 분석했는지 추적 가능하게 만들기 위함
- 이후 추천, 통계, 캐싱 등에 활용하기 위한 기반 구축
```

이 코드는 리뷰 유사도 분석 + DB 저장 + 프론트 반환을 한 번에 처리하는 핵심 API입니다.
`backend/apps/ai_gateway/views.py` : `[수정]` FastAPI 결과를 받아서 DB에 저장하도록 변경
```python
# [유지] 필요한 import
from requests import RequestException

# [유지] DRF import
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

# [유지] Django import
from django.shortcuts import get_object_or_404

# [유지] 앱 import
from apps.reviews.models import Review
from .services import FastAPIClient

# [추가] AI 추론 결과 저장 모델 import
from .models import ReviewSimilarityResult


# ============================
# [추가] 유사도 점수 → 사용자용 문구 변환 함수
# ============================
def get_similarity_label(score: float) -> str:
    if score > 0.7:
        return "매우 비슷"
    if score > 0.5:
        return "비슷"
    if score > 0.3:
        return "약간 비슷"
    return "관련 있음"


class ReviewAnalyzeAPIView(APIView):
    """
    [수정]
    특정 리뷰를 기준으로 같은 상품의 다른 리뷰들과 유사도 비교
    GET /ai/reviews/<review_id>/analyze/

    변경점:
    - 유사도 기준값(threshold) 적용
    - 결과를 DB에 저장
    """
    permission_classes = [AllowAny]

    # [추가] 너무 낮은 점수는 화면에 보여주지 않기 위한 기준값
    SIMILARITY_THRESHOLD = 0.45

    # [추가] 현재 사용 중인 모델 이름 저장용 상수
    MODEL_NAME = "upskyy/e5-small-korean"

    def get(self, request, review_id):
        # [유지] 기준이 되는 리뷰 조회
        source_review = get_object_or_404(
            Review.objects.select_related("user", "product"),
            id=review_id,
            is_public=True,
        )

        # [유지] 같은 상품의 다른 리뷰 후보 조회
        candidate_reviews = (
            Review.objects
            .select_related("user")
            .filter(
                product=source_review.product,
                is_public=True
            )
            .exclude(id=source_review.id)
            .order_by("-created_at")[:20]
        )

        # [유지] 기준 리뷰 내용이 비어 있으면 에러 반환
        if not source_review.content.strip():
            return Response(
                {"detail": "분석할 리뷰 내용이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []

        try:
            for candidate in candidate_reviews:
                # [유지] 후보 리뷰 내용이 비어 있으면 건너뜀
                if not candidate.content.strip():
                    continue

                similarity_result = FastAPIClient.get_similarity(
                    source_review.content,
                    candidate.content
                )

                score = round(similarity_result["similarity"], 4)

                # [추가] 기준 점수 이상인 경우만 결과에 포함
                if score >= self.SIMILARITY_THRESHOLD:
                    similarity_label = get_similarity_label(score)

                    # ============================
                    # [추가] DB 저장 또는 갱신
                    # ============================
                    saved_result, _ = ReviewSimilarityResult.objects.update_or_create(
                        source_review=source_review,
                        compared_review=candidate,
                        model_name=self.MODEL_NAME,
                        defaults={
                            "product": source_review.product,
                            "requested_by": request.user if request.user.is_authenticated else None,
                            "similarity_score": score,
                            "similarity_label": similarity_label,
                            "similarity_threshold": self.SIMILARITY_THRESHOLD,
                            "source_review_snapshot": source_review.content,
                            "compared_review_snapshot": candidate.content,
                            "compared_username_snapshot": candidate.user.username,
                        }
                    )

                    results.append({
                        # [유지] 프론트에 넘길 필드
                        "analysis_id": saved_result.id,  # [추가] 저장된 AI 결과 id
                        "review_id": candidate.id,
                        "username": candidate.user.username,
                        "content": candidate.content,
                        "score": score,
                        "label": similarity_label,  # [추가] 프론트에서 바로 사용 가능
                        "created_at": candidate.created_at.strftime("%Y-%m-%d %H:%M"),
                    })

        except RequestException as e:
            return Response(
                {"detail": f"FastAPI 호출 실패: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # [유지] 점수 높은 순 정렬
        results.sort(key=lambda x: x["score"], reverse=True)

        # [유지] 상위 3개만 반환
        top_results = results[:3]

        return Response(
            {
                # [유지] 기준 리뷰 정보
                "source_review": {
                    "review_id": source_review.id,
                    "username": source_review.user.username,
                    "content": source_review.content,
                },

                # [유지] 최종 유사 리뷰 목록
                "similar_reviews": top_results,

                # [추가] 프론트에서 안내 문구에 활용할 비교 대상 수
                "candidate_count": candidate_reviews.count(),

                # [추가] 프론트/디버깅용 기준 점수
                "similarity_threshold": self.SIMILARITY_THRESHOLD,

                # [추가] 현재 사용 모델 정보
                "model_name": self.MODEL_NAME,
            },
            status=status.HTTP_200_OK
        )
```

---
`backend/apps/ai_gateway/urls.py` : 기존 분석 URL `[유지]`
```python
from django.urls import path
from .views import (
    EmbeddingAPIView,     # [유지] 기존 사용 중이면 유지
    SimilarityAPIView,    # [유지] 기존 사용 중이면 유지
    ReviewAnalyzeAPIView, # [유지] 분석 API
)

urlpatterns = [
    # [유지] 기존 URL
    path("reviews/<int:review_id>/analyze/", ReviewAnalyzeAPIView.as_view(), name="ai-review-analyze"),
]
```
---
```
[전체 역할]
이 코드는 상품 상세 페이지에서 리뷰 목록을 불러오고,
각 리뷰마다 비슷한 후기 보기 기능을 연결하는 프론트엔드 JS 코드입니다.

사용자가 버튼을 누르면 Django의 AI 분석 API를 호출하고,
반환된 유사 리뷰 결과를 화면에 사용자 친화적인 형태로 출력합니다.

[기존 코드 대비 변경 목적]
처음 코드는 AI 분석이라는 개발자 중심 표현과 점수 중심 화면이었다면,
변경 후 코드는 "비슷한 후기 보기"라는 사용자 중심 표현과
이해하기 쉬운 문구 중심 UI로 바뀌었습니다.

즉, 이번 변경은 단순 기능 추가가 아니라
AI 분석 결과를 실제 사용자 화면에서 더 자연스럽게 보여주기 위한 UI 개선입니다.

[핵심 변경점]
1. 버튼 문구 변경
   - AI 분석 → 비슷한 후기 보기

2. 안내 문구 추가
   - 리뷰 목록 상단에 기능 설명 추가

3. 결과 출력 방식 변경
   - 점수 숫자 중심 → 해석 문구 중심

4. 결과 없을 때 안내 개선
   - 단순 실패 문구 → 이유를 설명하는 문구로 변경

5. DB 저장 결과 반영
   - analysis_id, label 등을 화면에서 사용할 수 있게 확장
```

`backend/static/js/product-detail.js` : `[수정]` 저장된 결과 id, label도 활용 가능하게 정리
```js
document.addEventListener("DOMContentLoaded", function () {
    // [유지] 상품 상세 영역 DOM
    const productDetailBox = document.getElementById("productDetailBox");
    const productId = window.PRODUCT_ID;

    // [유지] 수정 / 삭제 버튼 DOM
    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");

    // [유지] 리뷰 작성 관련 DOM
    const reviewForm = document.getElementById("reviewCreateForm");
    const contentInput = document.getElementById("content");
    const ratingInput = document.getElementById("rating");
    const imageInput = document.getElementById("images");
    const previewBox = document.getElementById("previewBox");
    const reviewList = document.getElementById("reviewList");

    // [유지] axios 또는 공통 api 인스턴스 사용
    const api = window.api || axios;

    // [유지] 로그인 토큰을 헤더에 붙이는 공통 함수
    function getAuthHeaders(extraHeaders = {}) {
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        const headers = { ...extraHeaders };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    // [유지] 상품 상세 조회 후 화면 출력
    async function loadProductDetail() {
        try {
            const response = await api.get(`/products/api/${productId}/`);
            const product = response.data;

            productDetailBox.innerHTML = `
                <img src="${product.image_url || ""}" alt="${product.name}" class="thumb">
                <h1>${product.name}</h1>
                <p>${product.description || ""}</p>
                <p><strong>${Number(product.price).toLocaleString()}원</strong></p>
                <p class="muted">등록일: ${product.created_at || "-"}</p>
            `;
        } catch (error) {
            console.error("상품 상세 조회 실패:", error.response?.data || error);
            productDetailBox.innerHTML = `<p>상품 상세 정보를 불러오지 못했습니다.</p>`;
        }
    }

    // [유지 + 일부 수정] 리뷰 목록 조회 후 카드 생성
    async function loadReviews() {
        try {
            const response = await api.get(`/reviews/?product=${productId}`);
            const data = response.data;
            const reviews = data.results || data;

            reviewList.innerHTML = "";

            if (!reviews || reviews.length === 0) {
                reviewList.innerHTML = "<p>아직 등록된 리뷰가 없습니다.</p>";
                return;
            }

            // [추가]
            // 처음 코드에는 없었음
            // 리뷰 목록 상단에 이 기능이 무엇인지 안내 문구를 보여줌
            const guideBox = document.createElement("div");
            guideBox.className = "review-guide-box";
            guideBox.innerHTML = `
                <p class="review-guide-text">
                    작성한 리뷰와 비슷한 다른 사용자의 후기를 찾아 보여줍니다.<br>
                    리뷰 수가 적으면 결과가 제한적일 수 있습니다.
                </p>
            `;
            reviewList.appendChild(guideBox);

            reviews.forEach((review) => {
                let imagesHtml = "";

                // [유지] 리뷰 이미지가 있으면 렌더링
                if (review.images && review.images.length > 0) {
                    imagesHtml = `
                        <div style="margin-top: 12px; display:flex; flex-wrap:wrap; gap:10px;">
                            ${review.images.map((img) => `
                                <img
                                    src="${img.image}"
                                    alt="리뷰 이미지"
                                    style="width:120px; height:120px; object-fit:cover; border-radius:8px;"
                                >
                            `).join("")}
                        </div>
                    `;
                }

                const card = document.createElement("div");
                card.className = "review-card";
                card.style.border = "1px solid #ddd";
                card.style.borderRadius = "8px";
                card.style.padding = "16px";
                card.style.marginBottom = "12px";

                card.innerHTML = `
                    <p><strong>작성자:</strong> ${review.username || review.user || "-"}</p>
                    <p><strong>평점:</strong> ${review.rating ?? "-"}</p>
                    <p style="margin-top: 10px;">${review.content || ""}</p>
                    ${imagesHtml}
                    <p class="muted" style="margin-top: 10px;">
                        작성일: ${review.created_at || "-"}
                    </p>

                    <!-- [수정]
                         처음 코드: 버튼 문구가 "AI 분석"
                         변경 후: 버튼 문구를 "비슷한 후기 보기" 로 변경 -->
                    <button
                        class="ai-analyze-btn"
                        data-review-id="${review.id}"
                        style="margin-top:12px; padding:8px 14px; border:none; border-radius:8px; background:#2563eb; color:#fff; font-weight:700; cursor:pointer;"
                    >
                        비슷한 후기 보기
                    </button>

                    <!-- [유지] 결과 출력 영역 -->
                    <div
                        class="ai-result-box"
                        id="ai-result-${review.id}"
                        style="display:none; margin-top:12px; padding:12px; border:1px solid #ddd; border-radius:8px; background:#f8fafc;"
                    ></div>
                `;

                reviewList.appendChild(card);
            });

            // [유지] 버튼 이벤트 연결
            bindAnalyzeButtons();

        } catch (error) {
            console.error("리뷰 목록 조회 실패:", error.response?.data || error);
            reviewList.innerHTML = "<p>리뷰 목록을 불러오지 못했습니다.</p>";
        }
    }

    // [유지] 점수를 짧은 라벨로 변환
    function getSimilarityLabel(score) {
        if (score > 0.7) return "매우 비슷";
        if (score > 0.5) return "비슷";
        if (score > 0.3) return "약간 비슷";
        return "관련 있음";
    }

    // [유지였던 추가 함수]
    // 처음 코드에서는 없었고, 중간 변경 단계에서 추가된 설명용 함수
    function getSimilarityDescription(score) {
        if (score > 0.7) return "표현과 느낌이 매우 비슷한 후기예요.";
        if (score > 0.5) return "비슷한 의견을 담고 있는 후기예요.";
        if (score > 0.3) return "어느 정도 관련 있는 후기예요.";
        return "참고용으로 볼 수 있는 후기예요.";
    }

    // [유지 + 결과 출력 부분 수정]
    function bindAnalyzeButtons() {
        const buttons = document.querySelectorAll(".ai-analyze-btn");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const reviewId = button.dataset.reviewId;
                const resultBox = document.getElementById(`ai-result-${reviewId}`);

                button.disabled = true;

                // [수정]
                // 처음 코드: "분석 중..."
                // 변경 후: "후기 찾는 중..."
                button.textContent = "후기 찾는 중...";

                resultBox.style.display = "block";

                // [수정]
                // 처음 코드: "AI 분석 중입니다..."
                // 변경 후: "비슷한 후기를 찾는 중입니다..."
                resultBox.innerHTML = "<p>비슷한 후기를 찾는 중입니다...</p>";

                try {
                    // [유지] Django AI 분석 API 호출
                    const response = await api.get(`/ai/reviews/${reviewId}/analyze/`);
                    const data = response.data;

                    // [수정]
                    // 처음 코드:
                    // - "AI 분석 결과"
                    // - "비슷한 리뷰를 찾지 못했습니다."
                    //
                    // 변경 후:
                    // - 제목 문구 변경
                    // - 부족한 이유 설명 추가
                    if (!data.similar_reviews || data.similar_reviews.length === 0) {
                        resultBox.innerHTML = `
                            <div class="ai-result-inner">
                                <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                                <p>충분히 비슷한 후기를 찾지 못했어요.</p>
                                <p class="ai-sub-guide">
                                    아직 비교할 후기가 부족하거나, 현재 등록된 후기와 표현 차이가 클 수 있어요.
                                </p>
                            </div>
                        `;
                        return;
                    }

                    // [추가]
                    // 처음 코드에는 없었음
                    // 몇 개를 찾았는지 사용자에게 자연스럽게 안내
                    const countText = `비슷한 후기 ${data.similar_reviews.length}개를 찾았어요.`;

                    // [수정]
                    // 처음 코드:
                    // - AI 분석 결과
                    // - TOP n
                    // - username / label / 숫자 중심
                    //
                    // 변경 후:
                    // - 사용자 중심 제목
                    // - 설명 문구 추가
                    // - 숫자보다 의미 문구를 먼저 노출
                    // - analysis_id 표시 추가
                    resultBox.innerHTML = `
                        <div class="ai-result-inner">
                            <p><strong>이 리뷰와 비슷한 다른 후기</strong></p>
                            <p>${countText}</p>
                            <p class="ai-sub-guide">
                                같은 상품에 대해 비슷하게 느낀 사용자 후기입니다.
                            </p>

                            <ul class="ai-similar-review-list" style="margin-top:10px; padding-left:18px;">
                                ${data.similar_reviews.map((item) => `
                                    <li class="ai-similar-review-item" style="margin-bottom:14px;">
                                        <p>
                                            <!-- [수정]
                                                 처음 코드: getSimilarityLabel(item.score)만 사용
                                                 변경 후: 백엔드에서 내려준 label이 있으면 우선 사용 -->
                                            <strong>${item.label || getSimilarityLabel(item.score)}</strong>
                                            : ${item.content}
                                        </p>

                                        <!-- [유지] 작성자 표시 -->
                                        <p><small>작성자: ${item.username}</small></p>

                                        <!-- [유지] 설명 문구 표시 -->
                                        <p><small>${getSimilarityDescription(item.score)}</small></p>

                                        <!-- [유지] 점수/작성일 표시 -->
                                        <p><small>유사도 ${item.score.toFixed(2)} / 작성일 ${item.created_at}</small></p>

                                        <!-- [추가]
                                             처음 코드에는 없었음
                                             DB에 저장된 AI 결과 id를 보여줌 -->
                                        <p><small>AI 결과 ID: ${item.analysis_id}</small></p>
                                    </li>
                                `).join("")}
                            </ul>

                            <!-- [유지] 안내 문구 -->
                            <p class="ai-sub-guide">
                                아직 리뷰 수가 적어 결과가 제한적일 수 있어요.
                            </p>
                        </div>
                    `;
                } catch (error) {
                    // [수정]
                    // 처음 코드: "AI 분석 실패"
                    // 변경 후: "비슷한 후기 조회 실패"
                    console.error("비슷한 후기 조회 실패:", error.response?.data || error);

                    const detail =
                        error.response?.data?.detail || "후기를 불러오는 중 오류가 발생했습니다.";

                    resultBox.innerHTML = `
                        <div class="ai-result-inner error">
                            <p>${detail}</p>
                        </div>
                    `;
                } finally {
                    button.disabled = false;

                    // [수정]
                    // 처음 코드: "AI 분석"
                    // 변경 후: "비슷한 후기 보기"
                    button.textContent = "비슷한 후기 보기";
                }
            });
        });
    }

    // [유지] 이미지 미리보기
    if (imageInput && previewBox) {
        imageInput.addEventListener("change", function () {
            previewBox.innerHTML = "";

            Array.from(imageInput.files).forEach((file) => {
                if (!file.type.startsWith("image/")) return;

                const reader = new FileReader();

                reader.onload = function (e) {
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.className = "preview-image";
                    img.style.width = "120px";
                    img.style.height = "120px";
                    img.style.objectFit = "cover";
                    img.style.marginRight = "10px";
                    img.style.marginTop = "10px";
                    img.style.borderRadius = "8px";
                    previewBox.appendChild(img);
                };

                reader.readAsDataURL(file);
            });
        });
    }

    // [유지] 리뷰 작성 기능
    if (reviewForm) {
        reviewForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const content = contentInput.value.trim();
            const rating = ratingInput.value.trim();

            if (!content || !rating) {
                alert("리뷰 내용과 평점을 입력해주세요.");
                return;
            }

            try {
                const formData = new FormData();
                formData.append("product", productId);
                formData.append("content", content);
                formData.append("rating", rating);

                if (imageInput && imageInput.files.length > 0) {
                    for (let i = 0; i < imageInput.files.length; i++) {
                        formData.append("uploaded_images", imageInput.files[i]);
                    }
                }

                const response = await api.post("/reviews/", formData, {
                    headers: getAuthHeaders({
                        "Content-Type": "multipart/form-data",
                    }),
                });

                console.log("리뷰 등록 성공:", response.data);

                alert("리뷰가 등록되었습니다.");

                reviewForm.reset();
                previewBox.innerHTML = "";

                await loadReviews();
            } catch (error) {
                console.error("리뷰 등록 실패:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("리뷰 작성은 로그인 후 가능합니다.");
                    return;
                }

                alert("리뷰 등록 실패: " + JSON.stringify(error.response?.data || {}));
            }
        });
    }

    // [유지] 상품 수정 이동
    if (editBtn) {
        editBtn.addEventListener("click", function () {
            window.location.href = `/products/${productId}/update/`;
        });
    }

    // [유지] 상품 삭제
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async function () {
            const confirmDelete = confirm("정말 이 상품을 삭제하시겠습니까?");
            if (!confirmDelete) return;

            try {
                await api.delete(`/products/api/${productId}/`, {
                    headers: getAuthHeaders(),
                });

                alert("상품이 삭제되었습니다.");
                window.location.href = "/products/";
            } catch (error) {
                console.error("상품 삭제 실패:", error.response?.data || error);

                if (error.response?.status === 401) {
                    alert("상품 삭제는 로그인 후 가능합니다.");
                    return;
                }

                alert("상품 삭제에 실패했습니다.");
            }
        });
    }

    // [유지] 페이지 시작 시 실행
    loadProductDetail();
    loadReviews();
});
```

`templates/products/product_detail.html` : `[유지]` 구조는 거의 그대로 사용
```html
{% extends "base.html" %}
{% load static %}

{% block title %}상품 상세{% endblock %}

{% block content %}
<section class="card">
    <div id="productDetailBox" class="detail-box">
        <p>로딩 중...</p>
    </div>

    <div class="product-create-actions" style="margin-top: 20px;">
        <button type="button" id="editBtn" class="btn-primary">수정</button>
        <button type="button" id="deleteProductBtn" class="btn-danger">삭제</button>
        <a href="/products/" class="btn">목록</a>
    </div>
</section>

<section class="card" style="margin-top: 24px;">
    <h2>리뷰 작성</h2>

    <form id="reviewCreateForm" class="form" enctype="multipart/form-data">
        <div class="form-group">
            <label for="content">리뷰 내용</label>
            <textarea id="content" name="content" required></textarea>
        </div>

        <div class="form-group">
            <label for="rating">평점</label>
            <input type="number" id="rating" name="rating" min="1" max="5" required>
        </div>

        <div class="form-group">
            <label for="images">리뷰 이미지</label>
            <input type="file" id="images" name="images" multiple accept="image/*">
        </div>

        <div id="previewBox" class="preview-box"></div>

        <button type="submit" class="btn">리뷰 등록</button>
    </form>
</section>

<section class="card" style="margin-top: 24px;">
    <h2>리뷰 목록</h2>
    <div id="reviewList">
        <p>리뷰를 불러오는 중...</p>
    </div>
</section>

{% endblock %}

{% block script %}
<script>
    window.PRODUCT_ID = "{{ view.kwargs.pk }}";
</script>
<script src="{% static 'js/product-detail.js' %}"></script>
{% endblock %}
```

`static/css/style.css` : `[수정]` UI 문구 변경에 맞춘 스타일 유지
```css
.ai-analyze-btn {
    margin-top: 12px;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background-color: #2563eb;
    color: white;
    font-weight: 700;
    cursor: pointer;
}

.ai-analyze-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.ai-result-box {
    margin-top: 14px;
    padding: 14px;
    border: 1px solid #dbe2ea;
    border-radius: 10px;
    background: #f8fafc;
}

.ai-result-inner p {
    margin: 6px 0;
}

.ai-similar-review-list {
    margin-top: 10px;
    padding-left: 18px;
}

.ai-similar-review-item {
    margin-bottom: 12px;
}

/* [추가] 리뷰 목록 상단 안내 문구 */
.review-guide-box {
    margin-bottom: 16px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
}

.review-guide-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #1e3a8a;
}

/* [추가] AI 결과 내 보조 안내 문구 */
.ai-sub-guide {
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
}
```
---
마이그레이션 실행
```bash
cd /home/youjung/product-review-service/backend  
python manage.py makemigrations ai_gateway  
python manage.py migrate
```

이번 변경 핵심 요약
- FastAPI는 그대로 추론만 담당
- DRF의 `ReviewAnalyzeAPIView` 가 결과를 받아 DB에 저장
- 저장 모델은 `ReviewSimilarityResult`
- 같은 기준 리뷰/비교 리뷰/모델 조합은 `update_or_create`로 갱신
- 프론트에서는 기존처럼 `/ai/reviews/<id>/analyze/` 호출
- UI는 AI 분석보다 비슷한 후기 보기 중심으로 변경

---
저장되는 데이터 예시
- 어떤 상품인지
- 기준 리뷰 id
- 비교 리뷰 id
- 유사도 점수
- 해석 문구
- 모델 이름
- 기준 텍스트 스냅샷
- 비교 텍스트 스냅샷
- 분석 시각

분석결과가 저장됩니다.
![[Pasted image 20260319130344.png]]

실제 DB가 저장되는지 확인하려면 runserver를 종료후 다시 로컬서버를 활성화 한후 사이트를 열어러 실제 AI추론이 리뷰에 저장되었는지 확인해보면 됩니다.