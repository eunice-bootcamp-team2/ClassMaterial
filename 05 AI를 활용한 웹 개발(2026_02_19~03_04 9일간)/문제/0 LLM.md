### 문제 1) LLM: 상품 리뷰 요약 + 감정/키워드 추출 API

허깅페이스 모델링크:
https://huggingface.co/lcw99/t5-base-korean-text-summary?utm_source=chatgpt.com 
- 한국어 요약 전용
- pipeline 사용 가능
- CPU 환경에서도 비교적 안정적

목표
1. 동기 방식(Sync)으로 호출했을 때
2. 비동기 방식(Async + Celery)으로 호출했을 때
3. Redis 캐시 적용 전/후 어떤 차이가 발생하는지를 직접 확인해야 한다.

위의 모델로 구현할수 있는 주제들..
	1. 고객 리뷰 자동 요약 시스템
	2. 문의/피드백 요약 API
	3. 뉴스 / 게시글 요약 API

0️⃣ 고정 엔드포인트 (문서 전체에서 이 3개만 사용)
1. Sync 동기
- `POST /api/llm/sync/summarize/`
	
2. Async 비동기
- `POST /api/llm/async/summarize/`
	
3. Job 상태 조회
- `GET /api/llm/jobs/<job_id>/`

디렉토리 구조
```
project_root/
│
├── manage.py
├── requirements.txt
├── .env
│
├── mysite/                          # Django 프로젝트 설정
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── settings.py
│   ├── celery.py
│   └── urls.py
│
├── llm/                              # DRF + Celery + Redis 앱
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── hf_model.py                   # 모델 로딩 / 추론
│   ├── services.py                   # 비즈니스 로직(전처리/후처리/캐시 등)
│   ├── tasks.py                      # Celery Task
│   │
│   ├── views/
│   │   ├── __init__.py
│   │   ├── api_sync.py               # 동기 API
│   │   ├── api_async.py              # 비동기 API (enqueue/status)
│   │   └── web_views.py              # 템플릿 렌더링(화면 쉘)
│   │
│   ├── urls/
│   │   ├── __init__.py
│   │   ├── api_sync.py
│   │   ├── api_async.py
│   │   └── web_urls.py
│   │
│   ├── templates/
│   │   ├── base.html                 # ✅ 공통 레이아웃
│   │   └── llm/
│   │       └── index.html            # axios로 API 호출하는 화면
│   │
│   ├── static/
│   │   ├── css/
│   │   │   └── llm.css               # ✅ CSS 분리
│   │   └── js/
│   │       ├── axios.js              # API 호출 모듈
│   │       └── llm.js                # 화면 로직(이벤트/렌더링)
│   │
│   └── migrations/
│
├── media/
│   └── tmp/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml            # Django + Redis + Celery
│
└── README.md
```

### 작업 순서

STEP 1) 모델만 단독 실행 (Django/DRF 코드 작성 금지)
- 위치: `llm/hf_model.py`
- 해야 할 일: pipeline 로딩 + `summarize(text)` 같은 함수로 감싸기
- 성공 기준: 파이썬에서 `summarize("아무 문장")` 실행하면 요약 문자열이 나온다.

---
STEP 2) Sync API 구현 (캐시/셀러리 없음)
- 위치
    - `llm/serializers.py` : 입력 검증
    - `llm/views/api_sync.py` : APIView post
    - `llm/urls/api_sync.py` : URL 연결
    - `mysite/urls.py` : llm url include

Sync API 동기
POST `/api/llm/sync/summarize/`

Body (JSON):
```json
{"text":"요약할 문장"}
```

Response (200):
```json
{"summary":"...","latency_ms":123,"cached":false}
```

성공 기준:
- Insomnia로 호출 시 200 OK
- summary 문자열이 옴
- latency_ms 숫자가 옴
- cached는 일단 false로 고정 0 LLM

---
STEP 3) Redis 캐시 추가
- 위치: `llm/services.py`

캐시 규칙
- Redis Key: `llm:summary:<sha256(text)>`
- TTL: 600초(10분)
- 저장값: summary 문자열

Sync 요청 흐름:
1. 캐시 조회 → 있으면 바로 반환(cached=true)
2. 없으면 모델 요약 → 캐시에 저장 → 반환(cached=false)

Response 예시:
```json
{"summary":"...","latency_ms":3,"cached":true}
```

성공 기준:
- 같은 text로 2번 호출
    - 1회차 cached=false
    - 2회차 cached=true
    - latency_ms가 확 줄어듦 0 LLM

---
STEP 4) Async API 추가 (Celery enqueue + Job 조회)

- 위치
    - `llm/models.py` : Job 저장 모델
    - `llm/tasks.py` : Celery task
    - `llm/views/api_async.py` : enqueue + status
    - `llm/urls/api_async.py` : URL 연결

Async 비동기 스펙
**POST** `/api/llm/async/summarize/`

Body (JSON):
```json
{"text":"요약할 문장"}
```

Response (202):
```json
{"job_id":15,"status":"QUEUED"}
```

Job 조회 스펙
**GET** `/api/llm/jobs/<job_id>/`

Response (200) 예시:
```json
{"job_id":15,"status":"SUCCESS","result":{"summary":"..."},"cached":false}
```

> 여기서 cached는 “결과 만들 때 캐시를 사용했는가?”인데, 초보자용 실습에서는 **우선 false로 두고** 나중에 확장해도 됩니다.

성공 기준:
- enqueue 시 202 + job_id
- worker 실행 후 job 조회하면 status가 SUCCESS로 바뀌고 summary가 나온다 0 LLM

---
URL 라우팅

llm/urls/api_sync.py
- `/api/llm/sync/summarize/` 만 담당

llm/urls/api_async.py
- `/api/llm/async/summarize/`
- `/api/llm/jobs/<job_id>/`

llm/urls/**init**.py
- 위 두 파일을 include 해서 `path("llm/", include(...))`처럼 합치기

mysite/urls.py
- 최종적으로 `/api/llm/...` 가 되게 `path("api/", include("llm.urls"))`

---
Insomnia 테스트 체크리스트

무슨테스트를 해야하나?

✅ (A) Sync 테스트
1. `POST /api/llm/sync/summarize/`
    - JSON `{ "text": "테스트 문장" }`
    - 기대: 200, cached=false, summary 있음
	
✅ (B) Cache 테스트
2. 위와 동일 요청 1번 더
    - 기대: cached=true, latency_ms 감소
    
✅ (C) Async 테스트
3. `POST /api/llm/async/summarize/`
    - 기대: 202, job_id
    
4. `GET /api/llm/jobs/<job_id>/`
    - 처음엔 QUEUED/RUNNING일 수 있음
    - 잠시 뒤 SUCCESS + summary