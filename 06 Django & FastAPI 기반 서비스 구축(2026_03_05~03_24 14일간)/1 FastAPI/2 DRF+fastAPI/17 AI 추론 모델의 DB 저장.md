추론한 모델의 DB를 저장해야 하는데 이건 보통 DRF에 저장하는것이 더 낫습니다.

이 프로젝트 구조에서는 보통 이렇게 가는 게 가장 안정적입니다.
- **DRF**: 사용자, 상품, 리뷰, AI 결과 저장
- **FastAPI**: 모델 로딩, 추론, 결과 반환만 담당
    
즉, FastAPI는 계산 서버, DRF는 서비스 서버 + DB 서버로 두는 게 좋습니다.

왜 DRF에 저장하는 게 좋은 이유는 다음과 같습니다.

원본 데이터가 이미 DRF 쪽에 있습니다.
지금 기준 데이터는 이미 DRF 쪽에 있습니다.
- 상품
- 리뷰
- 사용자
- 크롤링 데이터
- 화면 렌더링
    
그러면 추론 결과도 같은 쪽에 붙는 게 자연스럽습니다.

예를 들면:
- 어떤 리뷰를 분석했는지
- 어떤 상품에 대한 추천인지
- 어떤 사용자가 버튼을 눌렀는지
- 언제 분석했는지
    
이런 연결이 전부 DRF DB와 관계있습니다.

---
추가/수정 파일 목록

새로 추가되는 파일
- `backend/apps/ai_gateway/models.py`
- `backend/apps/ai_gateway/admin.py`
    

수정되는 파일
- `backend/apps/ai_gateway/views.py`
- `backend/apps/ai_gateway/urls.py`
- `backend/static/js/product-detail.js`
- `templates/products/product_detail.html`
- `static/css/style.css`
---
`backend/apps/ai_gateway/models.py` : `[추가]` AI 추론 결과 저장 모델
```python
# backend/apps/ai_gateway/models.py
# [추가] AI 추론 결과를 DRF DB에 저장하기 위한 모델 파일

from django.conf import settings
from django.db import models


class ReviewSimilarityResult(models.Model):
    """
    [추가]
    특정 기준 리뷰(source_review)와 비교 리뷰(compared_review)의
    유사도 결과를 저장하는 모델
    """

    # [추가] 어떤 상품 안에서 비교했는지 저장
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="ai_similarity_results",
    )

    # [추가] 기준이 되는 리뷰
    source_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="source_similarity_results",
    )

    # [추가] 비교 대상 리뷰
    compared_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="compared_similarity_results",
    )

    # [추가] 버튼을 누른 사용자 (비로그인 사용자일 수 있으므로 null 허용)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_similarity_results",
    )

    # [추가] FastAPI 모델 이름 저장
    model_name = models.CharField(
        max_length=100,
        default="upskyy/e5-small-korean",
    )

    # [추가] 유사도 점수
    similarity_score = models.FloatField()

    # [추가] 프론트에서 쓰는 해석 문구도 같이 저장
    similarity_label = models.CharField(max_length=30)

    # [추가] 기준 점수(threshold) 저장
    similarity_threshold = models.FloatField(default=0.45)

    # [추가] 당시의 텍스트 스냅샷 저장
    source_review_snapshot = models.TextField()
    compared_review_snapshot = models.TextField()

    # [추가] 비교 리뷰 작성자명을 스냅샷으로 저장
    compared_username_snapshot = models.CharField(max_length=150, blank=True)

    # [추가] 추론 시각
    analyzed_at = models.DateTimeField(auto_now=True)

    # [추가] 최초 생성 시각
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # [추가] 같은 기준 리뷰 + 비교 리뷰 + 모델 이름 조합은 1개만 유지
        constraints = [
            models.UniqueConstraint(
                fields=["source_review", "compared_review", "model_name"],
                name="unique_review_similarity_result",
            )
        ]
        ordering = ["-similarity_score", "-analyzed_at"]

    def __str__(self):
        return (
            f"[{self.model_name}] "
            f"source={self.source_review_id} "
            f"vs compared={self.compared_review_id} "
            f"score={self.similarity_score:.4f}"
        )
```

`backend/apps/ai_gateway/admin.py` : `[추가]` 관리자 페이지에서 저장 결과 확인
```python
# backend/apps/ai_gateway/admin.py
# [추가] AI 추론 결과를 Django admin에서 확인하기 위한 파일

from django.contrib import admin
from .models import ReviewSimilarityResult


@admin.register(ReviewSimilarityResult)
class ReviewSimilarityResultAdmin(admin.ModelAdmin):
    # [추가] 목록에서 주요 필드 확인
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

    # [추가] 검색 기능
    search_fields = (
        "product__name",
        "source_review__content",
        "compared_review__content",
        "compared_username_snapshot",
        "model_name",
    )

    # [추가] 필터
    list_filter = (
        "model_name",
        "similarity_label",
        "analyzed_at",
    )

    # [추가] 정렬
    ordering = ("-analyzed_at",)
```

`backend/apps/ai_gateway/views.py` : `[수정]` FastAPI 결과를 받아서 DB에 저장하도록 변경
```python
# backend/apps/ai_gateway/views.py

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

`backend/apps/ai_gateway/urls.py` : `[수정]` 기존 분석 URL 유지
```python
# backend/apps/ai_gateway/urls.py

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

`backend/static/js/product-detail.js` : `[수정]` 저장된 결과 id, label도 활용 가능하게 정리
```python
document.addEventListener("DOMContentLoaded", function () {
    const productDetailBox = document.getElementById("productDetailBox");
    const productId = window.PRODUCT_ID;

    const editBtn = document.getElementById("editBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");

    const reviewForm = document.getElementById("reviewCreateForm");
    const contentInput = document.getElementById("content");
    const ratingInput = document.getElementById("rating");
    const imageInput = document.getElementById("images");
    const previewBox = document.getElementById("previewBox");
    const reviewList = document.getElementById("reviewList");

    const api = window.api || axios;

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

            // ============================
            // [유지] 리뷰 목록 상단 안내 문구
            // ============================
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

                    <!-- [수정] 버튼 문구 변경 -->
                    <button
                        class="ai-analyze-btn"
                        data-review-id="${review.id}"
                        style="margin-top:12px; padding:8px 14px; border:none; border-radius:8px; background:#2563eb; color:#fff; font-weight:700; cursor:pointer;"
                    >
                        비슷한 후기 보기
                    </button>

                    <!-- [유지] AI 결과 출력 영역 -->
                    <div
                        class="ai-result-box"
                        id="ai-result-${review.id}"
                        style="display:none; margin-top:12px; padding:12px; border:1px solid #ddd; border-radius:8px; background:#f8fafc;"
                    ></div>
                `;

                reviewList.appendChild(card);
            });

            bindAnalyzeButtons();

        } catch (error) {
            console.error("리뷰 목록 조회 실패:", error.response?.data || error);
            reviewList.innerHTML = "<p>리뷰 목록을 불러오지 못했습니다.</p>";
        }
    }

    // ============================
    // [유지] 점수를 사용자 친화 문구로 변환
    // ============================
    function getSimilarityLabel(score) {
        if (score > 0.7) return "매우 비슷";
        if (score > 0.5) return "비슷";
        if (score > 0.3) return "약간 비슷";
        return "관련 있음";
    }

    // ============================
    // [유지] 점수별 설명 문구
    // ============================
    function getSimilarityDescription(score) {
        if (score > 0.7) return "표현과 느낌이 매우 비슷한 후기예요.";
        if (score > 0.5) return "비슷한 의견을 담고 있는 후기예요.";
        if (score > 0.3) return "어느 정도 관련 있는 후기예요.";
        return "참고용으로 볼 수 있는 후기예요.";
    }

    function bindAnalyzeButtons() {
        const buttons = document.querySelectorAll(".ai-analyze-btn");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const reviewId = button.dataset.reviewId;
                const resultBox = document.getElementById(`ai-result-${reviewId}`);

                button.disabled = true;
                button.textContent = "후기 찾는 중...";

                resultBox.style.display = "block";
                resultBox.innerHTML = "<p>비슷한 후기를 찾는 중입니다...</p>";

                try {
                    const response = await api.get(`/ai/reviews/${reviewId}/analyze/`);
                    const data = response.data;

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

                    const countText = `비슷한 후기 ${data.similar_reviews.length}개를 찾았어요.`;

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
                                            <strong>${item.label || getSimilarityLabel(item.score)}</strong>
                                            : ${item.content}
                                        </p>
                                        <p><small>작성자: ${item.username}</small></p>
                                        <p><small>${getSimilarityDescription(item.score)}</small></p>
                                        <p><small>유사도 ${item.score.toFixed(2)} / 작성일 ${item.created_at}</small></p>
                                        <p><small>AI 결과 ID: ${item.analysis_id}</small></p>
                                    </li>
                                `).join("")}
                            </ul>

                            <p class="ai-sub-guide">
                                아직 리뷰 수가 적어 결과가 제한적일 수 있어요.
                            </p>
                        </div>
                    `;
                } catch (error) {
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
                    button.textContent = "비슷한 후기 보기";
                }
            });
        });
    }

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

    if (editBtn) {
        editBtn.addEventListener("click", function () {
            window.location.href = `/products/${productId}/update/`;
        });
    }

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