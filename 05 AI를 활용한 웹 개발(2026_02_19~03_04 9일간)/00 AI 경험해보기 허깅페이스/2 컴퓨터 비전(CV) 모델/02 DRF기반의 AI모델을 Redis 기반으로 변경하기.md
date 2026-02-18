다음 과정은 동기(sync) vs 비동기(async, Redis+Celery) 분리하여 Redis의 속도차이를 파악해보도록 하겠습니다.

#### views.py의 파일을 아래 코드와 같이 분리하여 작성합니다.

✅ models.py
✔ 데이터베이스 구조 정의  
✔ Job 상태 / 결과 저장 공간  
→ 어떤 데이터가 저장되는지만 담당

✅ serializers.py
✔ 요청 데이터 검증 전용 (API 입구)  
✔ image 필드가 정상인지 확인  
→ 입력값 검사기
- `CatDogPredictSerializer` → 동기 API 요청 검증
- `CatDogAsyncEnqueueSerializer` → 비동기 API 요청 검증
- `CatDogJobStatusSerializer` → 상태조회 응답 형식

✅ hf_model.py
✔ HuggingFace 모델 로딩 전담  
✔ pipeline 전역 1회 로딩  
✔ predict(img) 같은 함수 제공  
→ 모델만 관리

✅ services.py
✔ 실제 추론 작업 담당  
✔ 이미지 변환(PIL / RGB)  
✔ 모델 호출(hf_model 사용)  
✔ 캐시 처리 가능  
→ 비즈니스 로직 / 추론 로직

✅ tasks.py
✔ Celery 비동기 작업 전용  
✔ 오래 걸리는 작업 실행  
✔ Job 상태 변경 + 결과 저장  
→ 백그라운드 작업자

✅ views/api_sync.py
✔ 동기 API 엔드포인트  
✔ 요청 → 즉시 추론 → 응답  
→ 빠른 테스트 / 단순 API

✅ views/api_async.py
✔ 비동기 API 엔드포인트  
✔ 요청 → Job 생성 → Task 등록 → job_id 반환  
✔ 상태 조회 API 포함  
→ 실무형 구조

✅ views/web_views.py (또는 web.py)
✔ HTML 템플릿 화면 전용  
✔ 업로드 UI / 페이지 렌더링  
→ 브라우저 화면 담당

✅ `urls/*.py`
✔ URL 라우팅 전담  
✔ sync / async / web 분리  
→ 어디로 연결되는지 관리

---
✅ 핵심 구조 한 줄 요약
- Serializer → 입력 검증
- Service → 추론 로직
- Model → DB 저장
- Task → 느린 작업 처리
- View → 요청/응답
- URL → 경로 연결
- hf_model → 모델 로딩

---
#### services.py와 serializers.py의 역할 구분
- serializers.py = API 입구에서 검사하는 문지기
- services.py = 실제 작업을 수행하는 실행 담당

✅ serializers.py의 본질적인 역할
Serializer는 DRF 전용 개념입니다.

주된 목적:
✔ 요청 데이터 형식 검증  
✔ 필드 타입 검증  
✔ 필수값 체크  
✔ 에러를 표준 JSON으로 반환

예:
```python
class CatDogPredictSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True)
```

이건 의미상:
> 요청에 image라는 필드가 존재하냐? 
> 이미지 파일이 맞냐? 만 검사합니다.

❗ 모델 호출 / 이미지 변환 / 비즈니스 로직 없음

✅ services.py의 본질적인 역할
services.py는 DRF랑 무관한 순수 파이썬 로직 공간입니다.

주된 목적:
✔ 이미지 열기 (PIL)  
✔ RGB 변환  
✔ 모델 추론 호출  
✔ 결과 가공  
✔ 캐시 처리  
✔ 예외 처리

예:
```python
def classify_image_bytes(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    classifier = get_classifier()
    result = classifier(img)
```
이건 의미상:
> 실제로 일을 하는 코드

---
### 각 파일의 기준

✔ serializers.py에 들어갈 수 있는 것
- 필드 정의
- 타입 검사
- required 검사
- 길이 제한
- 파일 크기 제한
- 값 검증(validate_XXX)
👉 값이 맞냐?만 검사

✔ services.py에 들어갈 수 있는 것
- PIL.Image 처리
- 모델 추론 호출
- 데이터 변환
- 계산
- 캐시 처리
- 업무 로직
👉일을 수행하는 코드

---
#### 분리를 하는 목적은?
A. 모델 로딩을 “한 번만” 하고 재사용하려고 (속도/메모리)
B. 입력 처리/검증(이미지 열기, RGB 변환, 에러 처리)을 한곳에서 재사용하려고
C. 비동기(Celery+Redis)로 요청-응답을 빠르게 만들려고
D. API / Web / Async를 섞지 않기 위해 (유지보수/확장)

`ai/views.py` 
```python
# =========================
# DRF 관련 import
# =========================
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

# ✅ [동기와 비동기로 이동]
# - APIView/Response/Parser들은 "API View 파일들"에서 사용됨
# - 최종 이동 위치:
#   - ai/views/api_sync.py  (동기 APIView)
#   - ai/views/api_async.py (비동기 APIView)
# ---------------------------------------------------------
# ✔ 결론: 이 import들은 views.py에서 삭제되고,
#         api_sync.py / api_async.py 상단으로 그대로 복사됨
# ---------------------------------------------------------


# =========================
# AI 모델 관련 import
# =========================
from transformers import pipeline
# ✅ [이 import는 hf_model.py로 이동]
# - 최종 이동 위치: ai/hf_model.py
# - 이유: pipeline 로딩은 무겁기 때문에 "전역 1회 로딩" 책임을 hf_model.py로 분리

from PIL import Image
# ✅ [이 import는 services.py(주로) + web_views.py(일부)로 이동]
# - 최종 이동 위치(권장):
#  - ai/services.py : Image.open(...).convert("RGB") 같은 공통 로직
#  - ai/views/web_views.py:(웹에서 파일 다시 열어 PIL로 읽는 경우가 있으면) 필요할 수 있음
# ---------------------------------------------------------
# ✔ 결론: 모델 관련은 "hf_model / services"로 이동해서 view에서는 직접 다루지 않게 함
# ---------------------------------------------------------


# =========================
# Serializer import
# =========================
from .serializers import CatDogPredictSerializer
# ✅ [동기와 비동기로 이동]
# - serializers.py 위치는 그대로
# - serializer를 실제로 사용하는 주체(View)가 분리되었기 때문에
#   - ai/views/api_sync.py (동기 추론 APIView)
#   - ai/views/api_async.py (비동기 enqueue / status APIView)
# 로 바뀜(그쪽으로 import 라인 이동)


# =========================
# Django (템플릿 렌더링 및 파일 저장) import
# =========================
from django.shortcuts import render
# ✅ [이 import는 web_views.py로 이동]
# - 최종 이동 위치: ai/views/web_views.py
# - 이유: render는 HTML 템플릿 응답 전용이므로 web view에만 남긴다.

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
# ✅ [이 import도 web_views.py로 이동]
# - 최종 이동 위치: ai/views/web_views.py
# - 이유: preview 저장/URL 생성 같은 "웹 UI 편의 기능"은 web view 책임


# ==================================================
# 모델 로딩 (전역에서 1번만)
# ==================================================
MODEL_ID = "DunnBC22/vit-base-patch16-224-in21k_dog_vs_cat_image_classification"
# ✅ [이 상수는 hf_model.py로 이동]
# - 최종 이동 위치: ai/hf_model.py (MODEL_ID 상수 관리)

classifier = pipeline("image-classification", model=MODEL_ID)
# ✅ [이 전역 로딩은 hf_model.py로 이동]
# - 최종 이동 위치: ai/hf_model.py (classifier 전역 1회 로딩)
# - 이후 views에서는 classifier를 직접 호출하지 않고,
#   hf_model.predict(img) 또는 services.predict_xxx(...)만 호출함
# ---------------------------------------------------------
# ✔ 결론: 이 블록 전체가 hf_model.py로 통째로 이동
# ---------------------------------------------------------


# ==================================================
# 1) DRF API 엔드포인트: /api/... 로 호출되는 JSON API
# ==================================================
class CatDogPredictAPIView(APIView):
    """
    ✅ 이 클래스는 '원본 통합 버전'이고, 분리 후에는 아래 두 파일로 쪼개진다.

    1) 동기 버전(즉시 추론):
       ➜ ai/views/api_sync.py : CatDogPredictSyncAPIView

    2) 비동기 버전(큐에 넣고 task_id 반환):
       ➜ ai/views/api_async.py : CatDogPredictAsyncEnqueueAPIView
       ➜ ai/views/api_async.py : CatDogJobStatusAPIView (상태 조회)
    """
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = CatDogPredictSerializer

    def post(self, request):
        # ---------------------------------------------------------
        # [A] serializer 검증 블록
        # ✅ 이동 대상:
        #   - 동기: ai/views/api_sync.py
        #   - 비동기: ai/views/api_async.py
        # ---------------------------------------------------------
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        image_file = serializer.validated_data["image"]

        # ---------------------------------------------------------
        # [B] 파일 → PIL.Image(RGB) 변환 블록 (try/except)
        # ✅ 이동 대상: ai/services.py
        # - 이유: API/Web 어디서든 "이미지 검증/변환"은 공통이기 때문
        # - 최종 형태 예:
        #   img = services.load_image_to_rgb(image_file)
        # ---------------------------------------------------------
        try:
            img = Image.open(image_file).convert("RGB")
        except Exception:
            return Response({"error": "올바른 이미지 파일이 아닙니다."}, status=400)

        # ---------------------------------------------------------
        # [C] 모델 추론 실행 classifier(img)
        # ✅ 이동 대상:
        #   - hf_model.py : classifier 전역 + predict(img)
        #   - services.py : hf_model.predict(img) 호출 + 결과 포맷팅
        # - 최종 형태 예:
        #   result = hf_model.predict(img)
        #   또는
        #   payload = services.predict_catdog_from_img(img)
        # ---------------------------------------------------------
        result = classifier(img)

        # ---------------------------------------------------------
        # [D] top1 추출 + JSON payload 구성
        # ✅ 이동 대상: ai/services.py
        # - 이유: 응답 포맷(공통)을 한 곳에서 관리하기 위함
        # - 최종 형태 예:
        #   payload = services.build_payload(result)
        # ---------------------------------------------------------
        top1 = result[0] if result else None

        return Response({
            "model_id": MODEL_ID,
            "top1": top1,
            "all": result,
        })

        # ---------------------------------------------------------
        # [E] (비동기 전환 시 추가되는 부분)
        # ✅ 이동 대상: ai/tasks.py + ai/views/api_async.py
        # - 비동기에서는 여기서 classifier(img) 하지 않고,
        #   1) 파일 저장(default_storage)
        #   2) tasks.predict_catdog.delay(saved_path)
        #   3) task_id 반환
        # ---------------------------------------------------------


# ==================================================
# 2) Django 템플릿 기반 페이지: 업로드 폼 + 결과 HTML 렌더링
# ==================================================
def catdog_page(request):
    """
    ✅ 이 함수는 통째로 web view 전용 파일로 이동한다.

    이동 대상:
    ➜ ai/views/web_views.py : catdog_page()
    """
    result = None
    error = None
    preview_url = None

    # ---------------------------------------------------------
    # [W1] request.method == "POST" 분기 + request.FILES 처리
    # ✅ 이동 대상: ai/views/web_views.py (웹 요청/폼 처리 책임)
    # ---------------------------------------------------------
    if request.method == "POST":
        if "image" not in request.FILES:
            error = "image 파일이 필요합니다."
        else:
            image_file = request.FILES["image"]

            # ---------------------------------------------------------
            # [W2] 업로드 파일 저장 + preview_url 생성
            # ✅ 이동 대상: ai/views/web_views.py
            # - 이유: "템플릿 미리보기"는 웹 UI 전용 관심사
            # ---------------------------------------------------------
            try:
                saved_path = default_storage.save(
                    f"tmp/{image_file.name}",
                    ContentFile(image_file.read())
                )
                preview_url = default_storage.url(saved_path)

                # ---------------------------------------------------------
                # [W3] 저장된 파일을 다시 열어 PIL로 로딩
                # ✅ 이동 대상(권장):
                #   - ai/services.py : load_image_to_rgb(...) 같은 공통 함수로 빼고
                #   - web_views.py에서는 default_storage.open만 담당
                # ---------------------------------------------------------
                with default_storage.open(saved_path, "rb") as f:
                    img = Image.open(f).convert("RGB")
            except Exception:
                error = "올바른 이미지 파일이 아닙니다."
                img = None

            # ---------------------------------------------------------
            # [W4] 웹에서 동기 추론 classifier(img)
            # ✅ 이동 대상:
            #   - hf_model.py : predict(img)
            #   - services.py : 결과 포맷팅
            #   - web_views.py : "화면에 보여주기 위한 흐름"만 유지
            #
            # (비동기 웹 확장 시)
            # ✅ tasks.py 호출해서 task_id를 받고,
            #    JS polling으로 status API 호출해서 결과 렌더링
            # ---------------------------------------------------------
            if img is not None:
                out = classifier(img)
                top1 = out[0] if out else None
                result = {"model_id": MODEL_ID, "top1": top1, "all": out}

    # ---------------------------------------------------------
    # [W5] 템플릿 렌더링 render(...)
    # ✅ 이동 대상: ai/views/web_views.py
    # ---------------------------------------------------------
    return render(request, "ai/catdog.html", {
        "result": result,
        "error": error,
        "preview_url": preview_url,
    })
```
- MODEL_ID / classifier = pipeline(...)
    - ➜ `ai/hf_model.py` 로 이동 (모델 로딩 + `predict(img)`)
        
- Image.open(file).convert("RGB") + 이미지 검증
    - ➜ `ai/services.py` 로 이동 (`load_image(...)` 같은 함수)
        
- **classifier(img) 추론 호출 + top1 뽑기 + 결과 포맷팅**
    - ➜ `ai/services.py` (서비스 함수에서 predict 호출 후 결과 정리)
    - (실제 모델 호출은 `hf_model.predict(img)`)
        
- CatDogPredictAPIView(APIView)
    - 동기 버전 ➜ `ai/views/api_sync.py`
    - 비동기 enqueue 버전 + status 조회 ➜ `ai/views/api_async.py`
        
- catdog_page(request) (템플릿 렌더링)
    - ➜ `ai/views/web_views.py`
        
- default_storage 저장 / preview_url 생성
    - ➜ `ai/views/web_views.py` (웹 UI에 종속된 로직)
    - 또는 `services.py`로 일부 helper 함수로 빼도 됨(선택)
        
- Celery task (delay/apply_async로 실행)
    - ➜ `ai/tasks.py`
        
- URL 라우팅
    - ➜ `ai/urls/api_sync.py`, `ai/urls/api_async.py`, `ai/urls/web_urls.py`

---
### 파일 분리의 핵심 기준 4가지

`1)` 파일 하나는 딱 한 가지 역할만 하게 만들어라 (SRP:한 가지 책임 원칙)
- 이 파일을 수정해야 하는 이유가 여러 개라면 이미 잘못 섞여 있는 상태입니다.

어떤 파일을 열었는데, 그 안에:
- 데이터베이스 관련 코드도 있고
- 화면(HTML) 관련 코드도 있고
- JSON 응답 구조도 있고
- AI 모델 호출도 들어 있음 "이런 식이면 문제가 생김"

왜냐하면…
✔ 화면만 바꾸고 싶은데 모델 코드까지 건드리게 되고  
✔ 응답 포맷만 바꾸려는데 DB 로직이 같이 섞여 있고  
✔ 한 줄 수정하려다가 다른 기능이 깨질 가능성이 커짐

이 파일은 무엇 때문에 존재하는가?

models.py
존재 이유 = DB 구조 정의

바뀌는 이유:
- 필드 추가
- 제약조건 변경
- 테이블 구조 수정
    
→ 화면 바뀐다고 models.py 수정 안 함  
→ 응답 JSON 바뀐다고 models.py 수정 안 함

views.py (API View)
존재 이유 = 요청 받고 응답 보내기

바뀌는 이유:
- URL 동작 변경
- 응답 정책 변경
- 인증 정책 변경
    
→ 모델 구조 바뀌면 최소 수정만  
→ 화면 디자인 때문에 수정하지 않음

template(html)
존재 이유 = 화면 표시(UI)

바뀌는 이유:
- 디자인 수정
- 레이아웃 변경
- 문구 변경
    
→ DB 구조랑 무관  
→ AI 모델이랑 무관

그런데 문제 상황은 여러 이유가 한 파일에 섞인 경우
만약 views.py 안에:
- 모델 로딩 코드 있음
- 이미지 변환 로직 있음
- HTML 렌더링 있음
- JSON 응답 있음
    
이러면… 이 파일이 바뀌는 이유가 너무 많아짐:
- 모델 바뀌면 수정
- 응답 구조 바뀌면 수정
- 화면 바뀌면 수정
- 예외 처리 정책 바뀌면 수정
    
→ 이미 역할이 뒤섞인 상태 → 분리 시점


`2)` 웹/HTTP 코드는 View에만, 업무 로직은 밖으로 뺍니다.
- View는 딱 2가지만:
    - 요청 받기(request)
    - 응답 보내기(response)
- 나머지(추론, 계산, 저장, 조합)는 `services.py`로.
- 이게 FastAPI에서 특히 중요합니다. FastAPI도 endpoint 함수가 비대해지면 똑같이 망가져요.


`3)` 무거운 것은 전역 1회 로딩 위치로 보냅니다.
- 모델(pipeline), 외부 클라이언트, 드라이버 같은 것들
- View 안에서 만들면 요청마다 느려지고 서버가 불안정해짐
- 그래서 `hf_model.py`처럼 “로드 전용 파일”로 빼는 게 정석.


`4)` 재사용되는 코드는 무조건 밖으로
- 같은 코드가 API에도 있고 Web에도 있으면 100% 분리 대상.
- 예: 이미지 열기/RGB 변환/에러 처리/결과 포맷
- 한 군데만 고치면 전체가 같이 고쳐지는 구조가 됩니다.

---
디렉토리 구조
```python
project_root/
│
├── manage.py
├── requirements.txt
├── .env
│
├── mysite/                    # Django 프로젝트 설정
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── settings.py
│   ├── celery.py              # ✅ 느린 작업을 별도 프로세스에게 맡기는 역할
│   └── urls.py                 
│
├── ai/                        # 메인 앱 (CatDog / AI 관련)
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   │
│   ├── hf_model.py            # ✅ HuggingFace 모델 전담
│   │   ├── MODEL_ID
│   │   ├── classifier (전역 로딩)
│   │   └── predict(image)
│   │
│   ├── services.py            # ✅ 비즈니스 로직 / 추론 래핑
│   │   ├── load_image()
│   │   ├── predict_image()
│   │   └── cache 처리 가능
│   │
│   ├── tasks.py               # ✅ Celery Task (Redis 사용)
│   │   └── predict_catdog_task()
│   │
│   ├── views/                 # ✅ View 분리 (실무 스타일)
│   │   ├── __init__.py
│   │   ├── api_sync.py        # 동기식 API
│   │   ├── api_async.py       # 비동기 API (Celery 호출)
│   │   └── web_views.py       # 템플릿 렌더링
│   │
│   ├── urls/                  # ✅ URL 분리
│   │   ├── __init__.py
│   │   ├── api_sync.py
│   │   ├── api_async.py
│   │   └── web_urls.py
│   │
│   ├── templates/
│   │   └── ai/
│   │       └── catdog.html
│   │
│   ├── static/css/catdog.css
│   │
│   └── migrations/
│
├── media/                     # 사용자 업로드 파일
│   └── tmp/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml      # Redis / Celery / Django
│
└── README.md
```

`0)` 설치 패키지 추가
```bash
uv pip install celery redis django-redis
```

`1) `프로젝트 설정 파일들
(수정) `mysite/settings.py`
```python
# mysite/settings.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ... (기존 설정 유지)

INSTALLED_APPS = [
    # ...
    "rest_framework",
    "ai",
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Redis Cache (동기/비동기 공통으로 "결과 캐시"에 사용)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": 60 * 10,  # 기본 TTL 10분
    }
}

# Celery (비동기 브로커/결과 저장소)
CELERY_BROKER_URL = "redis://127.0.0.1:6379/2"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/3"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Seoul"
```
---
(신규) `mysite/celery.py`
```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

app = Celery("mysite")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

Celery = 오래 걸리는 작업을 백그라운드에서 대신 처리해주는 작업 큐 시스템으로 쉽게 말하면 느린 작업을 별도 프로세스에게 맡기는 역할을 합니다.

왜 필요한가? 웹 서버(Django / FastAPI 등)는 기본적으로 ✔ 요청 → 즉시 응답 구조입니다. 

그런데 이런 작업들을 웹 요청안에서 직접 처리하면
- AI 모델 추론 (느림)
- 대용량 파일 처리
- 이메일 발송
- PDF 생성
- 크롤링
- 데이터 분석

직접처리할때 벌어지는 일
❌ 응답 지연  
❌ 타임아웃  
❌ 서버 멈춘 느낌 발생

그래서 Celery가 해결하는 문제
사용자 → 이미지 업로드 → 강아지/고양이 분류가 모델 추론로 3초 걸린다고 가정하면 Celery 사용할 때 빠르게 처리할수 있습니다.

❌ Celery 없을 때 : 순서대로 처리하며 느리다
```
요청 → Django가 추론 실행 → 3초 멈춤 → 응답
```

✅ Celery 사용할 때
```
요청 → Celery에게 작업 전달 → 즉시 응답  
↓  
백그라운드에서 추론 실행
```
✔ 화면 안 멈춤  
✔ 서버 빠르게 반응  
✔ 대규모 처리 가능

(수정) `mysite/__init__.py`
```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```
	Django가 시작될 때 Celery 앱을 자동으로 로딩시키기 위한 장치입니다.

Django 프로젝트는 내부적으로 패키지 단위로 로딩됩니다. 그리고
`mysite` 패키지가 import 될 때 `__init__.py` 가 가장 먼저 실행됩니다. 그래서
mysite 패키지가 로딩될 때 celery.py를 실행시키기 위함입니다.

---
`2)` URL을 “동기/비동기”로 분리 
`/api/sync/`와 `/api/async/` 두 군데에서 확인 가능하게 분리합니다.

직접 AI의 처리속도의 차이를 비교해보기 위해 분리합니다.
(수정) `mysite/urls.py`
```python
from django.contrib import admin  
from django.urls import path, include  
  
from django.conf import settings  
from django.conf.urls.static import static  
  
urlpatterns = [  
	path("admin/", admin.site.urls),  
  
    # ✅ 화면 전용 prefix (api 밑에 두지 않음)
    path("catdog/", include("ai.urls.web_urls")),
    path("api/", include("ai.urls.api_sync")), 
   
	# ✅ API 동기/비동기 prefix 분리 (새로 추가)  
	path("api/sync/", include("ai.urls.api_sync")),  
	path("api/async/", include("ai.urls.api_async")),  
]  
  
if settings.DEBUG:  
	urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```
- DEBUG=True → Django runserver가 파일 직접 제공
- DEBUG=False → 운영 환경 → 웹서버(Nginx, S3 등)가 제공해야 함


`ai/urls/` 폴더 생성
```bash
mkdir -p ai/urls
touch ai/urls/__init__.py ai/urls/api_sync.py ai/urls/api_async.py ai/urls/web_urls.py
```


(신규) `ai/urls/api_sync.py` 동기처리: 요청-응답이 한 흐름에서 끝남(추론느림)
```python
from django.urls import path
from ai.views.api_sync import CatDogPredictSyncAPIView

urlpatterns = [
    path("predict/catdog/", CatDogPredictSyncAPIView.as_view(), name="sync-predict-catdog"),
]

# http://127.0.0.1:8000/api/async/predict/catdog/
```


(신규) `ai/urls/api_async.py` 비동기처리: 요청-응답은 접수까지만, 실제 작업은 뒤에서 따로(추론빠름)
```python
from django.urls import path
from ai.views.api_async import CatDogPredictAsyncEnqueueAPIView, CatDogJobStatusAPIView

urlpatterns = [
    path("predict/catdog/", CatDogPredictAsyncEnqueueAPIView.as_view(), name="async-enqueue-catdog"),
    path("jobs/<int:job_id>/", CatDogJobStatusAPIView.as_view(), name="async-job-status"),
]
```


(수정) `ai/urls/web_urls.py` : urls.py의 이름 변경
```python
from django.urls import path
from ai.views.web import CatDogSyncPageView, CatDogAsyncPageView

urlpatterns = [
	path("page/catdog/", catdog_page, name="catdog-page"),
    path("sync/", CatDogSyncPageView.as_view(), name="catdog-sync-page"),
    path("async/", CatDogAsyncPageView.as_view(), name="catdog-async-page"),
]
```

(신규) `ai/urls/__init__.py` 생성만 해둠
```python
```

---
`3)` 앱(ai) 쪽: 모델/서비스/태스크/시리얼라이저/뷰
(신규) `ai/models.py`
```python
from django.db import models

class CatDogJob(models.Model):

    # --------------------------------------------
    # 1️⃣ 작업 상태 값 정의 (문자열 상수)
    # --------------------------------------------
    # Celery 비동기 작업의 진행 상태를 표현하기 위한 값
    STATUS_QUEUED = "queued"     # 작업 대기 중 (큐에 들어간 상태)
    STATUS_RUNNING = "running"   # 작업 실행 중
    STATUS_DONE = "done"         # 작업 완료
    STATUS_FAILED = "failed"     # 작업 실패

    # Django Admin / 선택 제한용 상태 목록
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_RUNNING, "Running"),
        (STATUS_DONE, "Done"),
        (STATUS_FAILED, "Failed"),
    ]

    # --------------------------------------------
    # 2️⃣ 입력 데이터 (사용자가 업로드한 이미지)
    # --------------------------------------------
    image = models.ImageField(
        upload_to="catdog/"
    )
    # 사용자가 업로드한 이미지 파일 저장
    # MEDIA_ROOT/catdog/ 경로에 실제 파일이 저장됨

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_QUEUED
    )
    # 현재 작업 상태 저장
    # queued / running / done / failed 중 하나만 가능

    # --------------------------------------------
    # 3️⃣ 모델 추론 결과 저장 필드
    # --------------------------------------------
    model_id = models.CharField(max_length=255, blank=True)
    # 어떤 AI 모델을 사용했는지 기록
    # 예: "google/vit-base-patch16-224"

    top1_label = models.CharField(max_length=50, blank=True)
    # 가장 높은 확률의 예측 결과
    # 예: "cat" / "dog"

    top1_score = models.FloatField(null=True, blank=True)
    # top1_label의 신뢰도(확률)
    # 예: 0.9876

    all_scores = models.JSONField(null=True, blank=True)
    # 전체 예측 결과 저장
    # 예: [{"label": "cat", "score": 0.98}, ...]

    # --------------------------------------------
    # 4️⃣ 오류 정보 저장
    # --------------------------------------------
    error_message = models.TextField(blank=True)
    # 추론 실패 시 오류 메시지 저장
    # 예: "Invalid image file"

    # --------------------------------------------
    # 5️⃣ 생성 / 수정 시각 (자동 기록)
    # --------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    # 레코드 최초 생성 시각 (변경되지 않음)

    updated_at = models.DateTimeField(auto_now=True)
    # 레코드가 저장될 때마다 갱신됨
```

(신규) `ai/hf_model.py`
```python
from transformers import pipeline

# --------------------------------------------
# 1️⃣ 사용할 HuggingFace 모델 ID
# --------------------------------------------
MODEL_ID = "DunnBC22/vit-base-patch16-224-in21k_dog_vs_cat_image_classification"
# HuggingFace Hub에 등록된 모델 이름
# 어떤 모델을 다운로드 / 로딩할지 지정하는 값

# --------------------------------------------
# 2️⃣ 전역 변수 (모델 캐시용)
# --------------------------------------------
_classifier = None
# 처음에는 모델이 로딩되지 않은 상태
# 나중에 pipeline 객체가 저장될 변수

def get_classifier():

    global _classifier
    # 함수 내부에서 전역 변수 수정 가능하도록 선언

    # --------------------------------------------
    # 3️⃣ 모델이 아직 로딩되지 않았다면
    # --------------------------------------------
    if _classifier is None:

        _classifier = pipeline(
            "image-classification",
            model=MODEL_ID
        )
        # HuggingFace pipeline 생성
        # 내부적으로:
        # ✔ 모델 다운로드 (최초 1회)
        # ✔ 가중치 로딩
        # ✔ 추론 가능한 객체 생성

    # --------------------------------------------
    # 4️⃣ 이미 로딩된 모델 반환
    # --------------------------------------------
    return _classifier
```

---
(신규) `ai/services.py`
```python
import hashlib
from typing import Dict, Any, List

from django.core.cache import cache   # Django 캐시 시스템 (Redis 연결 가능)
from PIL import Image                 # 이미지 처리를 위한 PIL 라이브러리

from .hf_model import get_classifier, MODEL_ID  # 모델 로딩 함수 + 모델 ID

# ---------------------------------------------------------
# 1️⃣ 이미지 바이트 기반 캐시 키 생성 함수
# ---------------------------------------------------------
def _img_cache_key(image_bytes: bytes) -> str:

    # 이미지 데이터로 SHA256 해시 생성
    # → 동일 이미지면 항상 동일 해시값
    h = hashlib.sha256(image_bytes).hexdigest()

    # Redis에 저장될 최종 키 문자열
    return f"catdog:img:{h}"
    # 예: catdog:img:a8d9f1c2...

# ---------------------------------------------------------
# 2️⃣ 이미지 추론 서비스 함수 (핵심 로직)
# ---------------------------------------------------------
def classify_image_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """
    입력: 이미지 바이트 데이터
    출력: 추론 결과 dict
    """

    # --------------------------------------------
    # 2-1 캐시 키 생성
    # --------------------------------------------
    key = _img_cache_key(image_bytes)

    # --------------------------------------------
    # 2-2 Redis 캐시 확인 (속도 최적화 핵심)
    # --------------------------------------------
    cached = cache.get(key)

    # 캐시에 이미 결과가 있다면
    if cached:
        return cached
        # 모델 추론 없이 즉시 반환 (초고속)

    # --------------------------------------------
    # 2-3 캐시 miss → 실제 모델 추론 수행
    # --------------------------------------------

    # bytes → 파일처럼 변환 → PIL 이미지 열기
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    # convert("RGB") :
    # 모델 입력 형식 통일 (색상 채널 문제 방지)

    # HuggingFace pipeline 객체 가져오기
    classifier = get_classifier()

    # 모델 추론 실행
    result: List[dict] = classifier(img) or []
    # 결과 예:
    # [{"label": "cat", "score": 0.98}, ...]

    # 가장 확률 높은 결과 추출
    top1 = result[0] if result else None

    # --------------------------------------------
    # 2-4 최종 응답 데이터 구성
    # --------------------------------------------
    payload = {
        "model_id": MODEL_ID,  # 어떤 모델을 사용했는지
        "top1": top1,          # 최고 확률 예측
        "all": result,         # 전체 예측 목록
    }

    # --------------------------------------------
    # 2-5 Redis 캐시에 저장 (성능 최적화)
    # --------------------------------------------
    cache.set(
        key,
        payload,
        timeout=60 * 10   # 10분 동안 유지
    )

    return payload


# ---------------------------------------------------------
# 3️⃣ io 모듈 하단 import
# ---------------------------------------------------------
import io  # noqa: E402
# 이미지 바이트 → 메모리 파일 객체 변환용
# 하단 배치는 스타일/순환참조 방지 목적
```
---

(수정) `ai/serializers.py`
```python
from rest_framework import serializers


# ---------------------------------------------------------
# 1️⃣ 동기 추론 API 요청 데이터 검증용 Serializer
# ---------------------------------------------------------
class CatDogPredictSerializer(serializers.Serializer):

    image = serializers.ImageField(required=True)
    # 클라이언트가 반드시 image 필드를 보내야 함
    # 이미지 파일인지 자동 검증
    # 없거나 잘못된 형식이면 400 에러 발생


# ---------------------------------------------------------
# 2️⃣ 비동기 작업 등록 API 요청 검증용 Serializer
# ---------------------------------------------------------
class CatDogAsyncEnqueueSerializer(serializers.Serializer):

    image = serializers.ImageField(required=True)
    # 비동기 enqueue API에서도 동일하게 이미지 필드 필요
    # 동기와 구조는 같지만 "용도"가 다름
    # → 작업 등록 전 입력 검증 역할


# ---------------------------------------------------------
# 3️⃣ 작업 상태 조회 API 응답 형식 정의 Serializer
# ---------------------------------------------------------
class CatDogJobStatusSerializer(serializers.Serializer):

    id = serializers.IntegerField()
    # 작업 ID (job_id)
    # 어떤 작업인지 식별하기 위한 값

    status = serializers.CharField()
    # 현재 작업 상태
    # 예: queued / running / done / failed

    model_id = serializers.CharField(allow_blank=True)
    # 사용된 모델 정보
    # 값이 없어도 허용 (빈 문자열 가능)

    top1 = serializers.DictField(required=False, allow_null=True)
    # 최고 확률 예측 결과
    # 예: {"label": "cat", "score": 0.98}
    # 작업 미완료 시 None 가능

    all = serializers.ListField(required=False, allow_null=True)
    # 전체 예측 결과 목록
    # 예: [{"label": "cat", ...}, {"label": "dog", ...}]
    # 아직 결과 없으면 None 가능

    error_message = serializers.CharField(allow_blank=True)
    # 작업 실패 시 오류 메시지
    # 정상 완료 시 빈 문자열
```

기존 `CatDogPredictSerializer`
이건 요청(request) 검사용
- 클라이언트가 `multipart/form-data`로 보낸 요청에
- `image`라는 파일이 진짜 들어왔는지 확인
- 이미지 파일 형식인지 확인  
    → 즉, 파일 업로드 요청이 유효한가? 를 체크하는 역할.
    
동기든 비동기든 요청에 image가 필요한 건 똑같기 때문에 이 형태는 계속 필요합니다.

`CatDogAsyncEnqueueSerializer` 추가된 클래스
겉보기엔 1번과 완전 똑같아서 중복 아닌가 의문이 생길수 있지만 이걸 따로 만든 이유는
동기 API와 비동기 API는 같은 image라도 규칙이 달라질 가능성이 높기 때문입니다.

예를 들어 나중에 비동기에서는 이런 요구가 추가될 수 있습니다.
- 비동기는 파일 크기 제한을 더 강하게 (예: 5MB 이하)
- 비동기는 여러 장 업로드 허용
- 비동기는 옵션 필드 추가 (예: `priority`, `callback_url`, `mode`)
- 비동기는 저장 후 task enqueue가 목적이라 추가 검증이 필요
그래서 지금은 동일해 보여도,
- `CatDogPredictSerializer` = 동기 즉시 추론용 요청 규격
- `CatDogAsyncEnqueueSerializer` = 비동기 큐 등록용 요청 규격
    
이렇게 API 계약(스펙)을 분리해두면 나중에 변경이 편해집니다.

> 현재는 동기/비동기 모두 동일한 image 검증만 필요하므로 하나의 Serializer로도 충분합니다.  다만 실무에서는 동기 API와 비동기 API의 확장 방향이 달라지는 경우가 많기 때문에,  
> 향후 변경 가능성을 고려하여 Serializer를 분리하는 설계를 적용했습니다


---
### tasks.py의 역할
	시간이 오래 걸리는 작업을 백그라운드에서 대신 처리하는 파일

Django View는 원래:
✔ 요청 받으면 바로 처리해야 하고  
✔ 오래 걸리면 사용자 응답이 느려지고  
✔ 서버 부담이 커짐

그래서 무거운 작업(AI 추론 같은 것)을 Celery Worker에게 맡기기 위해 만든 공간이 바로 tasks.py입니다.

tasks.py가 하는 일:
1️⃣ DB에 저장된 작업(job)을 가져와서 → 2️⃣ 상태 변경 → 3️⃣ 이미지 읽기 → 4️⃣ AI 추론 → 
5️⃣결과 저장 → 6️⃣ 실패 시 상태 기록

풀어서 설명하면:
작업 예약된 대상 가져오기 (DB 조회)

View(API)는 보통 이렇게 끝남:
✔ 이미지 받음  
✔ DB에 Job 레코드 생성 (status = queued)” 
✔ Celery에게 작업 지시 → 끝

실제 추론은 안 합니다. 왜냐면 느리니까.

1️⃣ 처리 대상 찾기 (DB에서 작업 조회)
```python
job = CatDogJob.objects.get(id=job_id)
```
비동기 작업은 어떤 데이터를 처리해야 하는지 알아야 하므로  먼저 DB에서 Job 레코드를 가져옴
✔ Celery Worker가 실행되자마자 가장 먼저 수행되는 단계  
✔ 이 Job 객체 안에 이미지, 상태, 결과 필드 전부 들어 있음


2️⃣ 작업 시작 표시 (상태 변경)

현재 작업이 어떤 상태인지 구분하기 위해 필요
- queued → 아직 대기
- running → 지금 처리 중
- done → 완료
- failed → 실패
```python
with transaction.atomic():  
	job.status = CatDogJob.STATUS_RUNNING  
	job.save(update_fields=["status"])
```
✔ DB 트랜잭션으로 묶어서 상태만 안전하게 업데이트  
✔ Worker가 실제 추론 시작 전 상태 변경


3️⃣ 실제 데이터 읽기 (파일 → bytes)
AI 모델은 Django FileField 객체가 아니라 메모리 데이터(bytes / PIL / tensor 등)를 사용함.

```python
with job.image.open("rb") as f:
    image_bytes = f.read()
```
✔ DB에서 가져온 Job의 이미지 파일 열기  
✔ 파일 내용을 bytes로 변환


4️⃣ 무거운 처리 실행 (AI 모델 추론)

이 작업이 바로 비동기 구조의 존재 이유.
✔ 오래 걸림  
✔ CPU/GPU 사용  
✔ View에서 하면 응답 느려짐

```python
payload = classify_image_bytes(image_bytes)
```
✔ 실제 AI 모델 호출은 services.py 내부에 있음  
✔ Worker 프로세스가 수행


5️⃣ 결과 DB 저장

비동기 구조에서는:
✔ 요청 시점에 결과 없음  
✔ 나중에 상태조회 API에서 읽어야 함

그래서 DB가 결과 보관소 역할.
```python
with transaction.atomic():
    job.status = CatDogJob.STATUS_DONE
    job.model_id = payload.get("model_id") or MODEL_ID
    job.top1_label = top1.get("label") or ""
    job.top1_score = float(top1.get("score", 0.0)) if top1 else None
    job.all_scores = all_scores
    job.error_message = ""
    job.save(update_fields=[
        "status",
        "model_id",
        "top1_label",
        "top1_score",
        "all_scores",
        "error_message"
    ])
```
✔ 추론 완료 후 상태 + 결과 필드 저장  
✔ status API에서 이 값들을 읽게 됨


6️⃣ 실패 시 기록

비동기 시스템에서 가장 중요한 안정성 패턴.
✔ 오류 원인 추적  
✔ 자동 재시도 가능  
✔ 사용자에게 실패 상태 전달 가능
```python
except Exception as e:
    with transaction.atomic():
        job.status = CatDogJob.STATUS_FAILED
        job.error_message = str(e)
        job.save(update_fields=["status", "error_message"])
    raise
```
✔ 상태 FAILED 기록  
✔ 에러 메시지 저장  
✔ 예외 다시 발생 → Celery autoretry 동작 가능


(신규) `ai/tasks.py`
```python
from celery import shared_task
# shared_task:
# - 이 함수를 Celery Worker가 실행할 수 있는 "비동기 작업(task)"으로 등록
# - .delay(), apply_async() 같은 방식으로 큐에 넣어 실행 가능

from django.db import transaction
# transaction.atomic:
# - DB 작업을 하나의 트랜잭션으로 묶음
# - 중간에 오류 나면 전체 롤백 → 데이터 정합성 보호

from .models import CatDogJob
# CatDogJob:
# - 비동기 작업 상태/결과 저장용 DB 모델
# - queued / running / done / failed 같은 상태 관리

from .services import classify_image_bytes
# classify_image_bytes:
# - 실제 AI 모델 추론 로직을 담당하는 서비스 함수
# - "이미지 bytes → 모델 입력 변환 → 추론 → 결과 dict 반환"

from .hf_model import MODEL_ID
# MODEL_ID:
# - 어떤 HuggingFace 모델을 사용했는지 기록용
# - 추론 결과 저장 시 사용


# ============================================================
# Celery Task 정의
# ============================================================
@shared_task(
    bind=True,
    autoretry_for=(Exception,),   # 예외 발생 시 자동 재시도
    retry_backoff=True,           # 재시도 간격 점점 증가 (서버 보호)
    max_retries=5                 # 최대 5번 재시도
)
def catdog_classify_job_task(self, job_id: int) -> None:
    """
    [역할]
    - 비동기 큐에서 실행되는 실제 추론 작업
    - job_id를 받아 DB에서 작업 정보를 조회하고 처리

    [입력]
    - job_id: CatDogJob 테이블의 PK
    """

    # --------------------------------------------------------
    # 1) 작업 정보 조회
    # --------------------------------------------------------
    job = CatDogJob.objects.get(id=job_id)
    # DB에서 해당 작업 객체 가져오기
    # 이 객체 안에:
    # - 업로드된 이미지 파일
    # - 현재 상태(status)
    # - 결과 저장 필드들이 들어 있음


    # --------------------------------------------------------
    # 2) 중복 실행 방지 로직 (매우 중요)
    # --------------------------------------------------------
    # 이미 끝난 작업이면 다시 실행하지 않음
    # - worker 재시작 / 재시도 / 중복 enqueue 상황 방어 목적
    if job.status in (CatDogJob.STATUS_DONE, CatDogJob.STATUS_FAILED):
        return


    # --------------------------------------------------------
    # 3) 상태를 RUNNING으로 변경
    # --------------------------------------------------------
    # 왜 트랜잭션을 쓰나?
    # - 상태 변경 중 오류 나면 롤백 보장
    with transaction.atomic():
        job.status = CatDogJob.STATUS_RUNNING
        job.save(update_fields=["status"])
        # update_fields:
        # - 필요한 필드만 UPDATE → 성능/안정성 개선


    try:
        # ----------------------------------------------------
        # 4) 이미지 파일 읽기
        # ----------------------------------------------------
        # Django FileField → 실제 bytes로 변환
        with job.image.open("rb") as f:
            image_bytes = f.read()

        # ----------------------------------------------------
        # 5) AI 모델 추론 호출 (핵심)
        # ----------------------------------------------------
        payload = classify_image_bytes(image_bytes)
        # payload 예시:
        # {
        #   "model_id": "...",
        #   "top1": {"label": "cat", "score": 0.98},
        #   "all": [...]
        # }

        # ----------------------------------------------------
        # 6) 결과 안전하게 꺼내기
        # ----------------------------------------------------
        top1 = payload.get("top1") or {}
        all_scores = payload.get("all") or []
        # get() + 기본값 패턴:
        # - KeyError 방지
        # - None 대응


        # ----------------------------------------------------
        # 7) 상태 및 결과 DB 저장
        # ----------------------------------------------------
        with transaction.atomic():
            job.status = CatDogJob.STATUS_DONE
            # 작업 완료 상태로 변경

            job.model_id = payload.get("model_id") or MODEL_ID
            # 어떤 모델을 사용했는지 기록

            job.top1_label = top1.get("label") or ""
            job.top1_score = (
                float(top1.get("score", 0.0)) if top1 else None
            )
            # 최고 확률 결과 저장

            job.all_scores = all_scores
            # 전체 점수 리스트 저장 (JSONField 등)

            job.error_message = ""
            # 성공 시 에러 메시지 초기화

            job.save(update_fields=[
                "status",
                "model_id",
                "top1_label",
                "top1_score",
                "all_scores",
                "error_message"
            ])
            # 필요한 필드만 부분 업데이트


    except Exception as e:
        # ----------------------------------------------------
        # 8) 오류 발생 시 처리 (실무 핵심 패턴)
        # ----------------------------------------------------
        with transaction.atomic():
            job.status = CatDogJob.STATUS_FAILED
            job.error_message = str(e)
            job.save(update_fields=["status", "error_message"])

        # 예외를 다시 던짐
        # → Celery autoretry_for 조건에 의해 자동 재시도 가능
        raise
```
---

(신규) `ai/views/api_sync.py` ✅ 동기식(즉시 결과 반환)
```python
# DRF에서 APIView 클래스 가져오기
# → Django View와 비슷하지만 REST API 전용 기능 제공
from rest_framework.views import APIView

# API 응답을 만들 때 사용하는 Response 객체
# → JsonResponse 대신 사용 (자동 렌더링 / 상태코드 처리)
from rest_framework.response import Response

# 파일 업로드 처리를 위한 파서(parser)
# → multipart/form-data 요청 해석용
from rest_framework.parsers import MultiPartParser, FormParser


# 현재 앱 내부 serializers 모듈에서 Serializer 가져오기
# → 업로드 데이터 검증 역할
from ..serializers import CatDogPredictSerializer

# 현재 앱 내부 services 모듈에서 추론 함수 가져오기
# → 실제 ML 모델 호출 로직
from ..services import classify_image_bytes


class CatDogPredictSyncAPIView(APIView):
    """
    동기식 API View
    → 요청이 들어오면 즉시 모델 추론 후 결과 반환

    Endpoint:
    POST /api/sync/predict/catdog/
    """

    # 어떤 형식의 요청 데이터를 처리할지 정의
    # MultiPartParser → 파일 업로드 처리
    # FormParser → 일반 form 데이터 처리
    parser_classes = (MultiPartParser, FormParser)

    # 사용할 Serializer 지정
    # → request.data 검증 담당
    serializer_class = CatDogPredictSerializer

    def post(self, request):
        """
        POST 요청 처리 함수
        → 클라이언트가 이미지를 업로드하면 실행됨
        """

        # 1️⃣ 요청 데이터(request.data)를 Serializer에 전달
        # → image 필드 존재 여부 / 타입 검증
        serializer = self.serializer_class(data=request.data)

        # 2️⃣ 유효성 검사 수행
        # raise_exception=True →
        #   오류 발생 시 자동으로 400 응답 반환
        serializer.is_valid(raise_exception=True)

        # 3️⃣ 검증 완료된 데이터에서 이미지 파일 꺼내기
        image_file = serializer.validated_data["image"]

        # 4️⃣ 업로드된 파일을 바이트(bytes) 형태로 읽기
        # → ML 모델 입력용
        image_bytes = image_file.read()

        try:
            # 5️⃣ 바이트 데이터를 모델 추론 함수로 전달
            # → 예: {"label": "cat", "score": 0.98}
            payload = classify_image_bytes(image_bytes)

        except Exception:
            # 6️⃣ 추론 실패 시 예외 처리
            # → 잘못된 파일 / 손상 이미지 등
            return Response(
                {"error": "올바른 이미지 파일이 아닙니다."},
                status=400
            )

        # 7️⃣ 추론 성공 시 결과 반환
        # → DRF Response는 자동 JSON 변환
        return Response(payload)
```

(신규) `ai/views/api_async.py` ✅ 비동기식(접수 → job_id 반환, 상태 조회)
```python
# DRF APIView → REST API용 View 클래스
from rest_framework.views import APIView

# DRF Response → JSON 응답 생성용
from rest_framework.response import Response

# 파일 업로드 처리용 파서
from rest_framework.parsers import MultiPartParser, FormParser


# 비동기 작업 상태를 저장하는 모델
from ..models import CatDogJob

# 업로드 데이터 검증용 Serializer
from ..serializers import CatDogAsyncEnqueueSerializer

# Celery 비동기 Task
from ..tasks import catdog_classify_job_task


class CatDogPredictAsyncEnqueueAPIView(APIView):
    """
    비동기식 처리 흐름:

    1️⃣ 이미지 업로드
    2️⃣ Job 레코드 생성 (DB 저장)
    3️⃣ Celery Task 등록
    4️⃣ job_id 반환

    Endpoint:
    POST /api/async/predict/catdog/
    """

    # multipart/form-data 요청 처리 설정
    parser_classes = (MultiPartParser, FormParser)

    # 입력 검증 Serializer
    serializer_class = CatDogAsyncEnqueueSerializer

    def post(self, request):
        """
        POST 요청 처리
        → 클라이언트가 이미지 업로드 시 실행
        """

        # 1️⃣ 요청 데이터 검증
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2️⃣ 검증된 이미지 파일 추출
        image_file = serializer.validated_data["image"]

        # 3️⃣ Job 객체 생성 (DB 저장)
        # STATUS_QUEUED → 작업 대기 상태
        job = CatDogJob.objects.create(
            image=image_file,
            status=CatDogJob.STATUS_QUEUED
        )

        # 4️⃣ Celery 비동기 작업 등록
        # delay() → 백그라운드 실행
        catdog_classify_job_task.delay(job.id)

        # 5️⃣ 즉시 응답 반환
        # 202 → 작업 접수 성공 (아직 완료 아님)
        return Response(
            {
                "job_id": job.id,                 # 작업 식별자
                "status": job.status,             # 현재 상태
                "check_url": f"/api/async/jobs/{job.id}/",  # 상태 조회 URL
            },
            status=202,
        )


class CatDogJobStatusAPIView(APIView):
    """
    비동기 작업 상태 조회 API

    Endpoint:
    GET /api/async/jobs/<job_id>/
    """

    def get(self, request, job_id: int):
        """
        Job 상태 확인 로직
        """

        # 1️⃣ job_id로 DB 조회
        job = CatDogJob.objects.get(id=job_id)

        # 2️⃣ 작업 완료 상태
        if job.status == CatDogJob.STATUS_DONE:

            # 모델 추론 결과 구성
            top1 = {
                "label": job.top1_label,
                "score": job.top1_score
            }

            return Response(
                {
                    "id": job.id,
                    "status": job.status,
                    "model_id": job.model_id,
                    "top1": top1,           # 최고 확률 결과
                    "all": job.all_scores,  # 전체 점수
                    "error_message": "",    # 오류 없음
                }
            )

        # 3️⃣ 작업 실패 상태
        if job.status == CatDogJob.STATUS_FAILED:
            return Response(
                {
                    "id": job.id,
                    "status": job.status,
                    "error_message": job.error_message,
                },
                status=500,  # 서버 처리 실패 의미
            )

        # 4️⃣ 아직 처리 중 상태 (queued / running)
        return Response(
            {
                "id": job.id,
                "status": job.status
            }
        )
```


(신규) `ai/views/web.py`
```python
from django.views.generic import TemplateView


class CatDogSyncPageView(TemplateView):
    """
    동기식 화면: JS로 /api/sync/predict/catdog/ 호출
    GET /catdog/sync/
    """
    template_name = "ai/catdog_sync.html"


class CatDogAsyncPageView(TemplateView):
    """
    비동기식 화면: JS로 enqueue + polling
    GET /catdog/async/
    """
    template_name = "ai/catdog_async.html"
```

(신규) `ai/views/__init__.py` 생성만 해둠
```python
```

---
`4)` 마이그레이션
```bash
python manage.py makemigrations
python manage.py migrate
```

`ai/templates/ai/catdog_sync.html` (동기식)
- 업로드 → `POST /api/sync/predict/catdog/` → 결과 즉시 출력
```html
{% extends "base.html" %}
{% load static %}
{% block title %}Cat vs Dog 분류{% endblock %}
{% block css %}
  <link rel="stylesheet" href="{% static 'ai/css/catdog.css' %}">
{% endblock %}

{% block content %}
<h2>🐶🐱 Cat/Dog 이미지 분류 - 동기식(Sync)</h2>

<p>
  업로드하면 서버가 즉시 추론해서 결과를 바로 반환합니다.<br>
  API: <code>POST /api/sync/predict/catdog/</code>
</p>

<p>
  <a href="/catdog/async/">비동기식 화면으로 →</a>
</p>

<hr>

<input type="file" id="file" accept="image/*">
<button id="btn">분석(동기)</button>

<div style="margin-top:12px;">
  <img id="preview" style="max-width:260px; display:none; border:1px solid #ddd; border-radius:10px;">
</div>

<pre id="out" style="margin-top:12px;">{}</pre>

<script>
  // HTML 요소들을 JS에서 사용할 수 있도록 변수에 저장
  const fileEl = document.getElementById("file");        // 파일 선택 input
  const btnEl = document.getElementById("btn");          // 분석 버튼
  const outEl = document.getElementById("out");          // 결과 출력 영역
  const previewEl = document.getElementById("preview");  // 이미지 미리보기

  // --------------------------------------------
  // 1️⃣ 파일 선택 시 실행되는 이벤트
  // --------------------------------------------
  fileEl.addEventListener("change", () => {

    // 사용자가 선택한 첫 번째 파일 가져오기
    const f = fileEl.files?.[0];

    // 파일이 없으면 아무 것도 하지 않음
    if (!f) return;

    // 브라우저 메모리에 임시 URL 생성
    // → 업로드 없이 미리보기 가능
    previewEl.src = URL.createObjectURL(f);

    // 숨겨져 있던 이미지 표시
    previewEl.style.display = "block";
  });

  // --------------------------------------------
  // 2️⃣ 버튼 클릭 시 서버로 요청
  // --------------------------------------------
  btnEl.addEventListener("click", async () => {

    // 선택된 파일 가져오기
    const f = fileEl.files?.[0];

    // 파일 없으면 경고창 표시
    if (!f) return alert("이미지를 선택하세요!");

    // 버튼 비활성화 (중복 클릭 방지)
    btnEl.disabled = true;

    // 사용자에게 현재 상태 표시
    outEl.textContent = "동기식 추론 중... (응답 올 때까지 대기)";

    // ----------------------------------------
    // 3️⃣ FormData 생성 (파일 업로드용)
    // ----------------------------------------
    const form = new FormData();

    // 서버에서 기대하는 필드명과 동일해야 함
    // → DRF Serializer의 image 필드와 매칭
    form.append("image", f);

    try {
      // ----------------------------------------
      // 4️⃣ 서버 API 호출
      // ----------------------------------------
      const res = await fetch(
        "/api/sync/predict/catdog/",
        {
          method: "POST",  // POST 요청
          body: form       // multipart/form-data 자동 처리
        }
      );

      // 서버에서 반환한 JSON 데이터 파싱
      const data = await res.json();

      // 결과를 예쁘게 출력
      outEl.textContent = JSON.stringify(data, null, 2);

    } catch (e) {
      // 네트워크 오류 / 서버 다운 등 처리
      outEl.textContent = JSON.stringify(
        { error: String(e) },
        null,
        2
      );

    } finally {
      // 버튼 다시 활성화 (성공/실패와 무관)
      btnEl.disabled = false;
    }
  });
</script>
{% endblock %}
```

`ai/templates/ai/catdog_async.html` (비동기식)
- 업로드 → `POST /api/async/predict/catdog/` → `job_id` 받음(202)
- 이후 `GET /api/async/jobs/<job_id>/` 를 1초마다 폴링해서 완료되면 결과 출력
```html
{% extends "base.html" %}
{% load static %}
{% block title %}Cat vs Dog 분류{% endblock %}
{% block css %}
  <link rel="stylesheet" href="{% static 'ai/css/catdog.css' %}">
{% endblock %}

{% block content %}
<h2>🐶🐱 Cat/Dog 이미지 분류 - 비동기식(Async + Celery)</h2>

<p>
  업로드하면 작업을 큐에 넣고, 상태 조회로 완료되면 결과를 가져옵니다.<br>
  enqueue: <code>POST /api/async/predict/catdog/</code><br>
  status: <code>GET /api/async/jobs/&lt;job_id&gt;/</code>
</p>

<p>
  <a href="/catdog/sync/">동기식 화면으로 →</a>
</p>

<hr>

<input type="file" id="file" accept="image/*">
<button id="btn">작업 등록(비동기)</button>
<button id="stop" disabled>폴링 중지</button>

<div style="margin-top:12px;">
  <img id="preview" style="max-width:260px; display:none; border:1px solid #ddd; border-radius:10px;">
</div>

<div style="margin-top:12px;">
  <b>job_id:</b> <span id="jobid">-</span><br>
  <b>status:</b> <span id="status">대기중</span>
</div>

<pre id="out" style="margin-top:12px;">{}</pre>

<!-- ✅ axios CDN (base.html에 넣었다면 여기서는 제거해도 됨) -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script>
  // --------------------------------------------------
  // 1️⃣ HTML 요소들을 JS 변수로 연결
  // --------------------------------------------------
  const fileEl = document.getElementById("file");       // 파일 선택 input
  const btnEl = document.getElementById("btn");         // 작업 등록 버튼
  const stopEl = document.getElementById("stop");       // 폴링 중지 버튼
  const jobIdEl = document.getElementById("jobid");     // job_id 표시 영역
  const statusEl = document.getElementById("status");   // 상태 표시 영역
  const outEl = document.getElementById("out");         // 결과 출력 영역
  const previewEl = document.getElementById("preview"); // 이미지 미리보기

  // 폴링 타이머 저장 변수
  let timer = null;

  // --------------------------------------------------
  // 2️⃣ 폴링 중지 함수 (중요)
  // --------------------------------------------------
  function stopPolling(msg) {
    if (timer) clearInterval(timer);
    timer = null;
    stopEl.disabled = true;
    if (msg) statusEl.textContent = msg;
  }

  // --------------------------------------------------
  // 3️⃣ 파일 선택 시 미리보기 표시
  // --------------------------------------------------
  fileEl.addEventListener("change", () => {
    const f = fileEl.files?.[0];
    if (!f) return;

    previewEl.src = URL.createObjectURL(f);
    previewEl.style.display = "block";
  });

  // --------------------------------------------------
  // 4️⃣ 폴링 중지 버튼 클릭
  // --------------------------------------------------
  stopEl.addEventListener("click", () => stopPolling("폴링 중지됨"));

  // --------------------------------------------------
  // 5️⃣ 작업 등록 버튼 클릭
  // --------------------------------------------------
  btnEl.addEventListener("click", async () => {
    const f = fileEl.files?.[0];
    if (!f) return alert("이미지를 선택하세요!");

    // 기존 폴링 강제 중지 + UI 초기화
    stopPolling();
    outEl.textContent = "{}";
    statusEl.textContent = "작업 등록 중...";
    jobIdEl.textContent = "-";

    btnEl.disabled = true;

    // 파일 업로드용 FormData
    const form = new FormData();
    form.append("image", f);

    try {
      // --------------------------------------------------
      // 6️⃣ Enqueue 요청 (작업 등록) - axios
      // --------------------------------------------------
      // axios는 기본적으로 status가 2xx가 아니면 catch로 빠짐.
      // fetch처럼 res.ok 분기와 똑같이 보이게 하려면 validateStatus를 사용.
      const res = await axios.post(
        "/api/async/predict/catdog/",
        form,
        {
          // FormData면 Content-Type은 axios가 자동으로 boundary 포함해 설정함
          // headers: { "Content-Type": "multipart/form-data" }, // 보통 생략 권장
          validateStatus: () => true, // 어떤 상태코드든 then에서 처리 가능
        }
      );

      const data = res.data;

      // fetch의 (!res.ok)와 동일한 처리
      if (res.status < 200 || res.status >= 300) {
        statusEl.textContent = "등록 실패 ❌";
        outEl.textContent = JSON.stringify(data, null, 2);
        return;
      }

      // 서버에서 job_id 수신
      const jobId = data.job_id;

      // 화면 표시
      jobIdEl.textContent = jobId;
      statusEl.textContent = "등록 완료 ✅ (1초마다 상태 확인)";
      stopEl.disabled = false;

      // --------------------------------------------------
      // 7️⃣ Polling 시작 (1초마다 상태 조회) - axios
      // --------------------------------------------------
      timer = setInterval(async () => {
        try {
          const r = await axios.get(`/api/async/jobs/${jobId}/`, {
            validateStatus: () => true, // 500도 응답 본문을 보려면
          });

          const s = r.data;

          if (s.status === "done") {
            statusEl.textContent = "완료 ✅";
            outEl.textContent = JSON.stringify(s, null, 2);
            stopPolling();
            return;
          }

          if (s.status === "failed") {
            statusEl.textContent = "실패 ❌";
            outEl.textContent = JSON.stringify(s, null, 2);
            stopPolling();
            return;
          }

          statusEl.textContent = `진행중... (${s.status})`;
        } catch (e) {
          // axios는 네트워크 오류/타임아웃 등에서 여기로 옴
          statusEl.textContent = `상태 조회 오류: ${String(e)}`;
        }
      }, 1000);

    } catch (e) {
      // enqueue 요청 자체 실패 (네트워크 문제 등)
      statusEl.textContent = "네트워크 오류";
      outEl.textContent = JSON.stringify({ error: String(e) }, null, 2);
    } finally {
      btnEl.disabled = false;
    }
  });
</script>
{% endblock %}
```

`ai/templates/base.html`
```html
{% load static %}
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>{% block title %}Cat/Dog{% endblock %}</title>

  <!-- ✅ 공통 CSS (동기/비동기 모두 적용) -->
  <link rel="stylesheet" href="{% static 'ai/css/catdog.css' %}">

  <!-- ✅ 페이지별 CSS 추가가 필요하면 여기에서 확장 -->
  {% block css %}{% endblock %}
</head>
<body>
  <main class="container">
    {% block content %}{% endblock %}
  </main>
</body>
</html>
```

`5)` 실행 방법 (서버 1개 + 워커 1개)

Redis 진짜 살아있는지 ping
```bash
docker exec -it redis redis-cli ping
```
정상이면 `PONG`

Redis (도커) 자동 재시작
```bash
docker run -d \
  --name redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7
```

터미널 1: Django
```bash
python manage.py runserver
```

터미널 2: Celery Worker
```bash
celery -A mysite worker -l info -P solo
```

`6)` 테스트 URL (동기/비동기 비교)

동기식 (즉시 결과) `POST /api/sync/predict/catdog/`
화면에서 보기 `http://127.0.0.1:8000/catdog/sync/`
![[Pasted image 20260207224941.png]]

비동기식 (접수 → 상태조회) 
`POST /api/async/predict/catdog/` → `{"job_id": ...}(202)'
`GET /api/async/jobs/<job_id>/` → `queued/running/done/failed`
화면에서 보기 `http://127.0.0.1:8000/catdog/async/`
![[Pasted image 20260207224920.png]]