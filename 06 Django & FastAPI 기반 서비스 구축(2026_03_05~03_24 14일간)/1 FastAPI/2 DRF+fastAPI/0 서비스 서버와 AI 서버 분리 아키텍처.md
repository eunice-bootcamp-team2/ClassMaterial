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
├── backend/                         # Django + DRF (웹 서비스)
│   │
│   ├── manage.py
│   │
│   ├── mysite/                      # Django 프로젝트 설정
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   │
│   ├── apps/
│   │   │
│   │   ├── accounts/                # 회원
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   ├── products/                # 제품
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   ├── reviews/                 # 리뷰
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   ├── interactions/            # 좋아요 / 북마크 / 댓글 / 신고
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── admin.py
│   │   │
│   │   │
│   │   └── ai_gateway/              # FastAPI 호출
│   │       ├── serializers.py
│   │       ├── views.py
│   │       ├── urls.py
│   │       ├── admin.py
│   │       └── services.py
│   │
│   │
│   ├── templates/                   # Django Template
│   │   ├── base.html
│   │   ├── accounts/
│   │   │   ├── login.html
│   │   │   └── signup.html
│   │   ├── products/
│   │   │   ├── product_create.html
│   │   │   ├── product_detail.html
│   │   │   ├── product_list.html
│   │   │   └── product_update.html
│   │   └── interactions/
│   │       └── navbar.html
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── product_create.js
│   │   │   ├── product_detail.js
│   │   │   ├── product_list.js
│   │   │   └── product_update.js
│   │   └── images/
│   └── media/
├── ai-server/                      # FastAPI (AI 서버)
│   ├── main.py
│   ├── api/
│   │   ├── sentiment.py
│   │   └── keyword.py
│   ├── models/
│   │   ├── sentiment_model.py
│   │   └── keyword_model.py
│   ├── schemas/
│   │   ├── sentiment_schema.py
│   │   └── keyword_schema.py
│   └── services/
│       └── inference.py
├── worker/                         # Celery Worker
│   ├── celery.py
│   └── tasks/
│       ├── sentiment_task.py
│       └── keyword_task.py
├── docker/
│   ├── django.dockerfile
│   ├── fastapi.dockerfile
│   └── worker.dockerfile
├── docker-compose.yml
└── README.md
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


