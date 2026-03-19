2개의 서버구조
```
[프론트]
   │
   ▼
[Django / DRF]  ← 웹 서비스 담당
   │
   │ HTTP API 호출
   ▼
[FastAPI]       ← AI 분석 서버
   │
   ▼
[HuggingFace / ML 모델]
```

1️⃣ Django (웹 서비스 서버) : 서비스 서버 담당
```
- 회원가입 / 로그인
- JWT 인증
- Todo CRUD 
- 댓글 / 좋아요  
- 리뷰 목록 조회  
- DB 저장 (PostgreSQL)  
- Celery 작업 시작
```

2️⃣ FastAPI (AI 서버) : AI 전용 서버 담당
```
- 감정분석
- 추천 모델 
- 이미지 모델  
- NLP 모델   
- 대량 연산
```

3️⃣ Django → FastAPI 호출
Django는 AI 분석이 필요할 때 FastAPI에 요청합니다.

4️⃣ Celery + FastAPI
```
사용자 요청
   │
   ▼
Django API
   │
   ▼
Celery 작업 시작
   │
   ▼
Celery Worker
   │
   ▼
FastAPI AI 서버 호출
   │
   ▼
AI 결과 반환
   │
   ▼
DB 저장
```

5️⃣ 프로젝트 구조
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

ERD 계획
목표기능:
```
- 제품(Product) 
- 리뷰(Review) 
- 리뷰 이미지  
- 좋아요  
- 북마크   
- 댓글  
- 리뷰 신고  
- AI 분석 결과
```

ERD 구조
```
User
 │
 │ 1:N
 ▼
Review
 │
 │ N:1
 ▼
Product

Review
 │
 ├── ReviewImage
 ├── ReviewLike
 ├── ReviewBookmark
 ├── ReviewComment
 ├── ReviewReport
 └── ReviewAIResult
```

핵심 원칙
- 각 앱은 자기 책임 모델만 가진다
- 관계는 ForeignKey로 연결
- 불필요한 중복 제거
- 서비스 확장 가능 구조

앱 구성
```
accounts
products
reviews
interactions
ai_gateway (DB 없음)
```

1️⃣ accounts 앱 : `accounts_user`

|필드|타입|설명|
|---|---|---|
|id|PK|사용자 ID|
|username|varchar|로그인 ID|
|email|varchar|이메일|
|password|varchar|비밀번호|
|created_at|datetime|가입일|
관계
```
User
 ├─ Review
 ├─ ReviewLike
 ├─ ReviewBookmark
 ├─ ReviewComment
 └─ ReviewReport
```

2️⃣ products 앱 : products_product

|필드|타입|설명|
|---|---|---|
|id|PK|제품 ID|
|name|varchar|제품명|
|description|text|제품 설명|
|price|decimal|가격|
|image|image|제품 이미지|
|created_at|datetime|생성일|

관계 : 제품은 리뷰의 부모 엔티티입니다.
```
Product
   │
   ▼
Review
```

3️⃣ reviews 앱
테이블 
```
reviews_review
reviews_reviewimage
reviews_review_ai
```

###### Review
| 필드         | 타입       | 설명    |
| ---------- | -------- | ----- |
| id         | PK       | 리뷰 ID |
| user_id    | FK       | 작성자   |
| product_id | FK       | 제품    |
| content    | text     | 리뷰 내용 |
| rating     | int      | 별점    |
| is_public  | bool     | 공개 여부 |
| created_at | datetime | 작성일   |
| updated_at | datetime | 수정일   |

###### ReviewImage
|필드|타입|설명|
|---|---|---|
|id|PK|이미지 ID|
|review_id|FK|리뷰|
|image|image|이미지|
|created_at|datetime|업로드|

###### ReviewAI : AI 분석 결과 저장
|필드|타입|설명|
|---|---|---|
|id|PK|분석 ID|
|review_id|FK|리뷰|
|sentiment|varchar|감정|
|confidence|float|신뢰도|
|keywords|json|키워드|
|created_at|datetime|분석일|

---
전체 앱별 테이블명 정리
```
accounts
 └ accounts_user

products
 └ products_product

reviews
 ├ reviews_review
 ├ reviews_reviewimage
 └ reviews_reviewai

interactions
 ├ interactions_reviewlike
 ├ interactions_reviewbookmark
 ├ interactions_reviewcomment
 └ interactions_reviewreport
```

4️⃣ interactions 앱
```
interactions_reviewlike
interactions_reviewbookmark
interactions_reviewcomment
interactions_reviewreport
```

###### ReviewLike
|필드|타입|설명|
|---|---|---|
|id|PK|좋아요 ID|
|user_id|FK|사용자|
|review_id|FK|리뷰|
|created_at|datetime|생성일|

###### ReviewBookmark
|필드|타입|설명|
|---|---|---|
|id|PK|북마크 ID|
|user_id|FK|사용자|
|review_id|FK|리뷰|
|created_at|datetime|생성일|

###### ReviewComment
|필드|타입|설명|
|---|---|---|
|id|PK|댓글 ID|
|user_id|FK|사용자|
|review_id|FK|리뷰|
|content|text|댓글|
|created_at|datetime|작성일|

###### ReviewReport
|필드|타입|설명|
|---|---|---|
|id|PK|신고 ID|
|user_id|FK|신고자|
|review_id|FK|리뷰|
|reason|varchar|신고 이유|
|created_at|datetime|신고일|

interactions 관계
```
User
  │
  ├─ ReviewLike
  ├─ ReviewBookmark
  ├─ ReviewComment
  └─ ReviewReport

Review
  │
  ├─ ReviewLike
  ├─ ReviewBookmark
  ├─ ReviewComment
  └─ ReviewReport
```

5️⃣ ai_gateway 앱 : 이 앱은 DB 테이블 없음

역할
```
Django → FastAPI 호출
```

구성
```
serializer  
service  
api_views
```


