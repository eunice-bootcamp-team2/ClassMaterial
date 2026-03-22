[아키텍처](https://www.figma.com/design/T6Hf8Uww5OqyGYBU144pak/%EC%BD%94%EB%93%9C%EB%B6%84%EC%84%9D?node-id=242-515&t=vQGIRFYTdy5VrFTD-0)
![[Group 463.png]]

### 프로젝트 개요
이 프로젝트는 웹 서비스(Django) 와 AI 분석 서버(FastAPI)를 분리하여  
확장성과 성능을 고려한 실무형 구조로 설계된 AI 기반 리뷰 분석 + 추천 시스템을 포함한 실무형 플랫폼입니다

### 우리가 만드는 서비스
```
사용자가 남긴 리뷰 데이터를 기반으로
AI가 분석하고, 추천하고, 유사한 리뷰를 찾아주는 서비스
```

### 👤 사용자 관점

사용자는:
- 상품을 조회한다
- 리뷰를 작성한다
- 다른 사람 리뷰를 본다
- AI 분석 결과를 확인한다
- 유사한 리뷰 / 추천을 받는다

### 🤖 시스템 관점

시스템은:
- 데이터를 저장하고 (Django)
- AI 분석을 수행하고 (FastAPI)
- 오래 걸리는 작업은 비동기로 처리하고 (Celery)
- 결과를 실시간으로 전달한다 (WebSocket + Redis)

### 왜 서버를 분리했는가
Django 안에서 AI 모델 실행하면 문제는
- 요청 느려짐
- 서버 터짐 (CPU/GPU 과부하)
- 확장 불가능
- 유지보수 어려움

해결 방법: 서버 분리
```
Django → 서비스 담당  
FastAPI → AI 담당
```

전체 시스템 구조
```
[브라우저]
   │
   ▼
[Nginx]
   │
   ▼
[Django (서비스 서버)]
   │
   ├── PostgreSQL (데이터 저장)
   ├── Celery 작업 요청
   │
   ▼
[Redis (큐 + Pub/Sub)]
   │
   ▼
[Celery Worker]
   │
   ▼
[FastAPI (AI 서버)]
   │
   ▼
[HuggingFace 모델]
```

1️⃣ Django (웹 서비스 서버) : 서비스 서버 담당
```
- 회원가입 / 로그인 (JWT)
- 상품 / 리뷰 CRUD
- 댓글 / 좋아요
- DB 관리
- Celery 작업 생성
- FastAPI 호출 게이트웨이
```
	서비스 중심 서버

2️⃣ FastAPI (AI 서버) : AI 전용 서버 담당
```
- 임베딩 생성
- 유사도 계산
- 감정 분석
- 추천 시스템
```
	AI 전용 서버

3️⃣ Redis
```
- Celery 메시지 큐
- 작업 상태 관리
- Pub/Sub (실시간 알림)
```
	데이터 흐름 중심

4️⃣ Celery
```
- 비동기 작업 실행  
- AI 요청 처리  
- 실패 재시도 가능
```
	백그라운드 엔진

5️⃣ PostgreSQL
```
- 사용자 데이터
- 리뷰 데이터
- AI 분석 결과
```

6️⃣ Nginx
```
- 요청 분배  
- Reverse Proxy  
- WebSocket 처리
```

7️⃣ Prometheus / Grafana
```
- 서버 모니터링  
- 성능 분석  
- 알림 시스템
```

8️⃣ 프로젝트 구조
```
product-review-service/
│
├── backend/                         # Django + DRF (웹 서비스 서버)
│   ├── .venv                        # Python 가상환경
│   ├── manage.py                    # Django 프로젝트 실행/관리 명령어 진입점
│   │
│   ├── mysite/                      # Django 프로젝트 설정 폴더
│   │   ├── __init__.py              # Python 패키지 인식 파일
│   │   ├── settings.py              # 전체 설정 (DB, JWT, CORS, Celery 등)
│   │   ├── urls.py                  # 전체 URL 라우팅 (앱 urls 연결)
│   │   ├── asgi.py                  # 비동기 서버용 설정 (WebSocket 등)
│   │   ├── celery.py                # Celery 설정 (비동기 작업 연결)
│   │   └── wsgi.py                  # 배포용 서버 설정 (Gunicorn 등)
│   │
│   ├── apps/                        # 기능별 앱 모음 (도메인 기반 구조)
│   │   │
│   │   ├── accounts/                # 회원 인증 (회원가입 / 로그인 / JWT)
│   │   │   ├── models.py            # User 모델 정의
│   │   │   ├── serializers.py       # 요청/응답 데이터 검증 및 변환
│   │   │   ├── views.py             # API 로직 (회원가입, 로그인 등)
│   │   │   ├── urls.py              # accounts 관련 URL
│   │   │   └── admin.py             # Django 관리자 페이지 등록
│   │
│   │   ├── products/                # 상품 관리
│   │   │   ├── models.py            # 상품 모델 (이름, 가격, 이미지 등)
│   │   │   ├── serializers.py       # 상품 API 데이터 처리
│   │   │   ├── views.py             # 상품 CRUD API
│   │   │   ├── urls.py              # 상품 관련 URL
│   │   │   └── admin.py             # 관리자 등록
│   │
│   │   ├── reviews/                 # 리뷰 시스템
│   │   │   ├── models.py            # 리뷰 모델 (내용, 평점, 상품 FK 등)
│   │   │   ├── serializers.py       # 리뷰 데이터 처리
│   │   │   ├── views.py             # 리뷰 CRUD API
│   │   │   ├── urls.py              # 리뷰 URL
│   │   │   └── admin.py             # 관리자 등록
│   │
│   │   ├── interactions/            # 유저 상호작용 기능
│   │   │   ├── models.py            # 좋아요, 북마크, 댓글, 신고 모델
│   │   │   ├── serializers.py       # 상호작용 데이터 처리
│   │   │   ├── views.py             # 좋아요/댓글/신고 API
│   │   │   ├── urls.py              # interactions URL
│   │   │   └── admin.py             # 관리자 등록
│   │
│   │   └── ai_gateway/              # AI 서버(FastAPI) 연결 중간 계층 ⭐
│   │       ├── serializers.py       # FastAPI로 보낼 데이터 검증
│   │       ├── views.py             # Django → FastAPI 호출 API
│   │       ├── urls.py              # AI 관련 URL (embed, similarity, analyze)
│   │       ├── admin.py             # (필요 시) 관리자 등록
│   │       ├── tasks.py             # Celery 비동기 작업 정의 (AI 요청)
│   │       └── services.py          # FastAPI 요청 보내는 HTTP 클라이언트
│   │
│   ├── templates/                   # Django HTML 템플릿
│   │   ├── base.html                # 공통 레이아웃 (header/footer)
│   │
│   │   ├── accounts/               # 회원 관련 페이지
│   │   │   ├── login.html
│   │   │   └── signup.html
│   │
│   │   ├── products/               # 상품 페이지
│   │   │   ├── product_create.html # 상품 생성 페이지
│   │   │   ├── product_detail.html # 상품 상세 (리뷰 포함)
│   │   │   ├── product_list.html   # 상품 목록
│   │   │   └── product_update.html # 상품 수정
│   │
│   │   └── interactions/
│   │       └── navbar.html         # 상단 네비게이션 UI
│   │
│   ├── static/                     # 정적 파일 (프론트 자원)
│   │   ├── css/
│   │   │   └── style.css           # 전체 스타일
│   │   │
│   │   ├── js/                     # 프론트 로직 (Axios 기반)
│   │   │   ├── api.js              # Axios 공통 설정 (BASE_URL 등)
│   │   │   ├── auth.js             # 로그인 / 토큰 처리
│   │   │   ├── product_create.js   # 상품 생성 JS
│   │   │   ├── product_detail.js   # 상품 상세 (리뷰/댓글/AI)
│   │   │   ├── product_list.js     # 상품 목록 + 리뷰/댓글 렌더링 ⭐
│   │   │   └── product_update.js   # 상품 수정 JS
│   │   │
│   │   └── images/                 # 이미지 파일
│   │
│   ├── media/                      # 업로드 파일 (상품 이미지 등)
│   ├── Dockerfile                  # Django 컨테이너 설정
│   └── docker-compose.yml          # Django + DB + Redis + Celery 구성
│
│
├── ai-server/                      # FastAPI (AI 추론 서버)
│   ├── .venv                       # FastAPI 가상환경
│   ├── main.py                     # FastAPI 앱 시작점 + 라우터 등록
│
│   ├── api/                        # API 엔드포인트 정의
│   │   └── recommend.py            # 유사도 / 추천 API
│
│   ├── models/                     # AI 모델 로딩
│   │   └── recommend_model.py      # 임베딩 모델 로드 (SentenceTransformer)
│
│   ├── schemas/                    # 요청/응답 데이터 구조 (Pydantic)
│   │   └── recommend_schema.py     # embed / similarity 요청 구조
│
│   ├── services/                   # 실제 AI 로직 처리
│   │   └── recommend_service.py    # 임베딩 생성 + 유사도 계산
│
│   └── Dockerfile                  # FastAPI 컨테이너 설정
│
└── README.md                       # 프로젝트 설명 문서
```

8️⃣ 이 프로젝트의 핵심 기술 포인트
```
1. MSA 구조 (서비스 / AI 분리)  
2. 비동기 처리 (Celery)  
3. 메시지 브로커 (Redis)  
4. 실시간 처리 (WebSocket)  
5. AI 서버 분리 (FastAPI)  
6. 확장 가능한 구조
```

9️⃣ ERD 계획
목표기능:
```
- 제품(Product)
- 리뷰(Review)
- 리뷰 이미지(ReviewImage)
- 좋아요(ReviewLike)
- 북마크(ReviewBookmark)
- 댓글(ReviewComment)
- 리뷰 신고(ReviewReport)
- AI 분석 결과(ReviewAI)
```

이 서비스는 제품 상세 페이지를 중심으로 리뷰가 쌓이고,  
그 리뷰를 기준으로 이미지, 좋아요, 북마크, 댓글, 신고, AI 분석 결과가 연결되는 구조입니다.

즉, 중심 엔티티는 다음 순서로 이해하면 됩니다.
```
User → Review ← Product
          │
          ├─ ReviewImage
          ├─ ReviewLike
          ├─ ReviewBookmark
          ├─ ReviewComment
          ├─ ReviewReport
          └─ ReviewAI
```
- User는 리뷰를 작성하는 주체
- Product는 리뷰가 달리는 대상
- Review는 서비스의 핵심 중심 테이블
- 나머지 기능은 모두 Review에 매달리는 하위 테이블
- ReviewAI는 리뷰 1개당 AI 결과 1개를 저장하는 구조

전체 관계도
```
User
 ├── 1:N ── Review
 ├── 1:N ── ReviewLike
 ├── 1:N ── ReviewBookmark
 ├── 1:N ── ReviewComment
 └── 1:N ── ReviewReport

Product
 └── 1:N ── Review

Review
 ├── 1:N ── ReviewImage
 ├── 1:N ── ReviewLike
 ├── 1:N ── ReviewBookmark
 ├── 1:N ── ReviewComment
 ├── 1:N ── ReviewReport
 └── 1:1 ── ReviewAI
```
해석
- 한 명의 사용자는 여러 리뷰를 작성할 수 있음
- 한 개의 제품에는 여러 리뷰가 달릴 수 있음
- 한 개의 리뷰에는 여러 이미지가 달릴 수 있음
- 한 개의 리뷰에는 여러 좋아요/댓글/신고가 연결될 수 있음
- 한 개의 리뷰에는 AI 분석 결과가 하나만 연결됨
	- 따라서 `ReviewAI`는 ForeignKey가 아니라 OneToOneField 관계입니다.

핵심 원칙
- 각 앱은 자기 책임 모델만 가짐
- 중심 데이터는 `Review`입니다.
- 관계는 `ForeignKey`와 `OneToOneField`로 명확하게 분리함
- 불필요한 중복 저장을 피함
- 서비스 확장 시에도 기존 구조를 크게 흔들지 않도록 설계함

---
앱 구성
```
accounts  
products  
reviews  
interactions  
ai_gateway
```
설명:
- `accounts`: 사용자
- `products`: 제품
- `reviews`: 리뷰, 리뷰 이미지, AI 분석 결과
- `interactions`: 좋아요, 북마크, 댓글, 신고
- `ai_gateway`: FastAPI 호출 전용 계층, DB 테이블 없음
---
accounts 앱 : `accounts_user`

역할
사용자 계정을 관리하는 기본 테이블입니다.  
리뷰 작성, 좋아요, 북마크, 댓글, 신고의 출발점이 됩니다.

###### 주요 필드
| 필드         | 타입       | 설명     |
| ---------- | -------- | ------ |
| id         | PK       | 사용자 ID |
| username   | varchar  | 로그인 ID |
| email      | varchar  | 이메일    |
| password   | varchar  | 비밀번호   |
| created_at | datetime | 가입일    |
###### 관계
```
User  
 ├─ Review  
 ├─ ReviewLike  
 ├─ ReviewBookmark  
 ├─ ReviewComment  
 └─ ReviewReport
```

설명:
- 사용자 1명은 리뷰를 여러 개 작성 가능
- 사용자 1명은 여러 리뷰에 좋아요/북마크/댓글/신고 가능

`accounts/models.py`에서는 `AbstractUser`를 상속하고 `created_at`을 추가한 구조입니다.

---
products 앱 : `products_product`

역할
리뷰가 달리는 대상이 되는 제품 테이블입니다.

###### 주요 필드
| 필드          | 타입       | 설명     |
| ----------- | -------- | ------ |
| id          | PK       | 제품 ID  |
| name        | varchar  | 제품명    |
| description | text     | 제품 설명  |
| price       | decimal  | 가격     |
| image       | image    | 제품 이미지 |
| created_at  | datetime | 생성일    |

관계
```
Product  
 └─ Review
```

더 정확히 쓰면:
```
Product 1 : N Review
```
설명:
- 제품 하나에 리뷰가 여러 개 달릴 수 있음
- 리뷰는 반드시 하나의 제품에 속함

---
reviews 앱

실제 테이블
```
reviews_review  
reviews_reviewimage  
reviews_reviewai
```

여기서 수정 포인트:
- 기존 초안의 `reviews_review_ai` 표기는 실제 모델명 기준과 다릅니다
- Django 기본 테이블명 규칙상 **`reviews_reviewai`** 가 맞습니다.

---
Review

역할
서비스의 중심 테이블입니다.  
어떤 사용자가 어떤 제품에 어떤 내용과 평점을 남겼는지 저장합니다.

|필드|타입|설명|
|---|---|---|
|id|PK|리뷰 ID|
|user_id|FK|작성자|
|product_id|FK|제품|
|content|text|리뷰 내용|
|rating|int|별점|
|is_public|bool|공개 여부|
|created_at|datetime|작성일|
|updated_at|datetime|수정일|

관계
```
Review  
 ├─ N:1 User  
 ├─ N:1 Product  
 ├─ 1:N ReviewImage  
 ├─ 1:N ReviewLike  
 ├─ 1:N ReviewBookmark  
 ├─ 1:N ReviewComment  
 ├─ 1:N ReviewReport  
 └─ 1:1 ReviewAI
```

설명:
- 리뷰는 작성자 1명과 제품 1개를 반드시 가짐
- 리뷰를 중심으로 나머지 부가 기능이 연결됨

---
ReviewImage

역할
리뷰에 여러 장의 이미지를 연결하기 위한 테이블입니다.

|필드|타입|설명|
|---|---|---|
|id|PK|이미지 ID|
|review_id|FK|연결된 리뷰|
|image|image|이미지 파일|
|created_at|datetime|업로드 일시|

관계
```
Review 1 : N ReviewImage
```

설명:
- 리뷰 하나에 이미지 여러 장 가능
- 그래서 `Review` 안에 이미지 필드를 넣지 않고 별도 테이블로 분리한 구조입니다.

---
ReviewAI

역할
리뷰에 대한 AI 분석 결과를 저장하는 테이블입니다.

|필드|타입|설명|
|---|---|---|
|id|PK|분석 ID|
|review_id|OneToOne|리뷰|
|sentiment|varchar|감정 분석 결과|
|confidence|float|신뢰도|
|keywords|json|키워드|
|created_at|datetime|분석일|

관계
```
Review 1 : 1 ReviewAI
```

---
전체 앱별 테이블명 정리
```
accounts  
 └─ accounts_user  
  
products  
 └─ products_product  
  
reviews  
 ├─ reviews_review  
 ├─ reviews_reviewimage  
 └─ reviews_reviewai  
  
interactions  
 ├─ interactions_reviewlike  
 ├─ interactions_reviewbookmark  
 ├─ interactions_reviewcomment  
 └─ interactions_reviewreport
```

---
interactions 앱

실제 테이블
```
interactions_reviewlike  
interactions_reviewbookmark  
interactions_reviewcomment  
interactions_reviewreport
```

이 앱은 리뷰에 대한 사용자 행동을 따로 분리한 영역입니다.  
즉, 리뷰 본문 자체는 `reviews` 앱에 있고, 리뷰에 대한 반응은 `interactions` 앱에 있습니다.

---
###### ReviewLike
| 필드         | 타입       | 설명     |
| ---------- | -------- | ------ |
| id         | PK       | 좋아요 ID |
| user_id    | FK       | 사용자    |
| review_id  | FK       | 리뷰     |
| created_at | datetime | 생성일    |

관계
```
User 1 : N ReviewLike  
Review 1 : N ReviewLike
```

설명
좋아요는 사용자와 리뷰를 연결하는 중간 테이블입니다.

---
###### ReviewBookmark
| 필드         | 타입       | 설명     |
| ---------- | -------- | ------ |
| id         | PK       | 북마크 ID |
| user_id    | FK       | 사용자    |
| review_id  | FK       | 리뷰     |
| created_at | datetime | 생성일    |

관계
```
User 1 : N ReviewBookmark  
Review 1 : N ReviewBookmark
```

설명
북마크도 좋아요와 같은 연결 테이블 구조입니다.

---
###### ReviewComment
| 필드         | 타입       | 설명    |
| ---------- | -------- | ----- |
| id         | PK       | 댓글 ID |
| user_id    | FK       | 작성자   |
| review_id  | FK       | 리뷰    |
| content    | text     | 댓글 내용 |
| created_at | datetime | 작성일   |

관계
```
User 1 : N ReviewComment  
Review 1 : N ReviewComment
```

설명
한 사용자는 여러 댓글을 작성할 수 있고, 한 리뷰에는 여러 댓글이 달릴 수 있습니다.

---
###### ReviewReport
| 필드         | 타입       | 설명    |
| ---------- | -------- | ----- |
| id         | PK       | 신고 ID |
| user_id    | FK       | 신고자   |
| review_id  | FK       | 리뷰    |
| reason     | varchar  | 신고 이유 |
| created_at | datetime | 신고일   |

관계
```
User 1 : N ReviewReport  
Review 1 : N ReviewReport
```

설명
신고도 사용자와 리뷰를 연결하는 테이블입니다.  
나중에 신고 상태, 처리 결과, 관리자 메모 같은 필드를 확장하기 좋은 구조입니다.

---
interactions 관계 정리
```
User  
 ├─ ReviewLike  
 ├─ ReviewBookmark  
 ├─ ReviewComment  
 └─ ReviewReport  
  
Review  
 ├─ ReviewLike  
 ├─ ReviewBookmark  
 ├─ ReviewComment  
 └─ ReviewReport
```

즉, `interactions` 앱은  
리뷰 자체를 저장하는 곳이 아니라, 리뷰에 대한 행동 로그를 저장하는 곳이라고 이해하면 됩니다.

---
ai_gateway 앱 : DB 테이블 없음

역할
`ai_gateway`는 AI 결과를 직접 저장하는 테이블 앱이 아니라,  
Django가 FastAPI를 호출하기 위한 중간 계층입니다.
```
Django → ai_gateway → FastAPI
```

```
구성
serializers  
services  
views 또는 api_views  
tasks
```

설명:
- `serializers`: 요청값 검증
- `services`: FastAPI HTTP 호출
- `views/api_views`: Django API 엔드포인트
- `tasks`: Celery 비동기 작업

즉, AI 결과 저장 테이블은 `reviews` 앱의 `ReviewAI`,  
AI 서버와 통신하는 관문은 `ai_gateway` 앱입니다.  










