
Redis만 사용 (동기 처리) — `tasks.py` 없음
요청이 들어오면 그 요청 안에서 바로 HF 추론까지 끝냄
```
[Browser / Front(JS) / Insomnia]
   |
   | POST /api/sentiment/predict/
   v
mysite/urls.py
   v
ml/urls.py
   v
ml/views.py  (SentimentPredictAPIView.post)
   v
ml/serializers.py  (입력 검증/파싱)
   v
ml/services.py  (analyze_text)
   |
   +----> [Redis Cache] (hit이면 즉시 반환)
   |
   v
ml/hf_model.py  (get_classifier)
   v
[HuggingFace Model Inference]
   v
ml/services.py  (결과 정리 + Redis 저장)
   v
ml/serializers.py  (응답 직렬화)
   v
[Response JSON]
```

백그라운드(워커) 흐름: 실제 추론 + 저장
```bash
[Celery Worker]
   v
ml/tasks.py  (analyze_textitem_task 실행)           ✅ 워커가 tasks.py를 실행!
   v
ml/models.py  (TextItem 조회)
   v
ml/services.py  (analyze_text)
   |
   +----> [Redis Cache] (hit이면 즉시 결과 반환)     ✅ 여기 Redis는 "캐시"
   |
   v
ml/hf_model.py  (get_classifier)
   v
[HuggingFace Model Inference]
   v
ml/services.py  (결과 정리 + Redis Cache 저장)
   v
ml/models.py  (label/score 저장 + is_analyzing=False)
```
---
우리가 제작하는 플랫폼은 아래에 해당합니다.
즉 API 요청은 `views.py`에서 `TextItem`을 만들고  
`tasks.py`에 일을 맡긴 뒤,  
Redis(브로커)에 큐로 넣고 즉시 응답하는 구조로 제작합니다.

---
Redis + Celery 사용 (비동기 처리) — `tasks.py`가 들어가는 정식 흐름
요청은 빠르게 작업만 등록하고 실제 추론은 Celery worker가 `tasks.py`를 통해 실행
요청(웹/API) 흐름: 
`감정분석 작업을 예약(큐에 등록)하는 파이프라인의 구조`
```bash
[Browser / Front(JS) / Insomnia]
- 사용자/클라이언트가 요청을 보내는 쪽    
- 이 문장 감정분석 해줘라고 서버에 POST 요청함
   |
POST /api/sentiment/predict/
- 감정분석 요청 접수 API 엔드포인트  
- 여기서는 보통 바로 결과를 주지 않고, 작업을 등록하고 id를 줌  
   |   
   v
mysite/urls.py
- 길 안내 표지판 /api/sentiment/predict/가 들어오면 어느 앱/어느 urls로 보낼지 결정
   |   
   v
ml/urls.py
- 이 URL을 어떤 View(클래스/함수)가 처리할지 매칭
   v
ml/views.py  (SentimentPredictAPIView.post) AI 작업 접수 창구(등록자)
- 요청을 받아서   
- 입력 검사 맡기고(serializer)  
- DB에 “분석 요청”을 기록하고(models)  
- Celery에 “분석 작업”을 맡기고   
- 즉시 응답을 돌려주는 “접수/오케스트레이션(흐름 조립)” 담당
   | 
   v
ml/serializers.py  (입력 검증/파싱) 사용자 입력이 안전/정상인지 확인하고, 뽑아주는 역할
- 들어온 JSON이 형식이 맞는지 검사
    - text가 있는지?  
    - 문자열인지? 
    - 길이 제한 등  
- 그리고 validated_data["text"]처럼 깨끗한 입력값을 만들어줌
   |
   v
ml/models.py  (TextItem 저장 + is_analyzing=True) 
- 분석 요청을 DB에 기록해서 추적 가능한 상태로 만드는 역할
- DB에 한 줄 저장: 
    - text 원문
    - 현재 상태 is_analyzing=True (분석 진행 중)  
- 즉 작업 티켓(접수표)을 DB에 만들어 둠
   |
   v
ml/tasks.py  (analyze_textitem_task.delay(item_id))  ✅ 여기서 작업 등록!
- 분석을 지금 하지 않고, Celery 워커에게 나중에 이거 해줘라고 맡기는 역할
- 여기서 .delay(item_id)를 호출하면:
    - 이 id를 분석해라 라는 일을 큐에 등록함 
- tasks.py 자체는 실행 코드가 아니라, 워커가 실행할 작업 함수가 들어있는 파일
   |
   v
[Redis Broker Queue]  (할 일 저장소)                ✅ 여기 Redis는 "큐"
- 해야 할 일을 잠깐 맡아두는 대기 줄(큐)
- Redis가 여기서는 캐시가 아니라 할 일 목록(큐)역할 
- .delay()로 등록된 작업이 Redis에 쌓이고, 
- Celery 워커가 하나씩 꺼내서 실행함
   |
   v
[Response JSON]  (예: {"id": 10, "status": "queued"})
- 서버는 즉시 응답함:
    - 접수 완료
    - id는 10 
- 클라이언트는 이 id로 나중에 결과 조회를 해야 함
- 결과가 아니라 접수번호를 돌려주는 응답
```

✅ 이 흐름이 하는 일

> 감정분석을 실행하는 흐름이 아니라  
> 감정분석을 예약(등록)하는 흐름

✅ 허깅페이스 모델이 실행되는 위치
- 이 흐름(POST 요청 처리) 안에서 실행되는 게 아니라
- Celery 워커가 `tasks.py`를 실행할 때
    - `services.py → hf_model.py → HuggingFace inference` 로 실행됨

---
역할을 아주 짧게 나누면

🟥 Redis (두 가지 얼굴)

1️⃣ 큐(브로커)
- "이거 나중에 해줘”라고 맡긴 일을 줄 세워 보관
- Celery가 여기서 일을 하나씩 꺼냄
    
2️⃣ 캐시
- “이건 이미 계산했어”
- 다시 계산 안 하려고 결과를 잠깐 저장
    
👉 Redis는 창고, 용도에 따라 큐 / 캐시로 씀


🟩 Celery
- 일꾼 관리자
- “지금은 말고, 뒤에서 처리해”
- 워커들을 돌려서 큐에 있는 일을 실행
    
👉 비동기 실행 엔진


🟦 tasks.py
- 그 일을 어떻게 할지 정리해 둔 파일

조금 더 정확히 말하면:
- Celery가 실행할 작업 목록
- 이 id가 오면 → 이 함수 실행해라를 정의
    
```python
@shared_task
def analyze_textitem_task(id):
    # 이 일이 실제로 어떻게 수행되는지 적어둔 곳
```

아주 직관적인 비유 (현장 느낌)

❌ 동기 처리 (Redis/Celery 없음)
- 손님 주문 → 요리 완성될 때까지 카운터에서 기다림
- AI 추론 오래 걸리면 → 서버 멈춘 느낌
    

✅ Redis + Celery
- 손님 주문 → 번호표 받고 바로 나감
- 주방(워커)이 뒤에서 요리
- 완료되면 나중에 찾으러 옴
    

최종 초간단 정리 (암기용)
- Redis  
    → “보관함 (큐 / 캐시)”
- Celery  
    → “뒤에서 일하는 비동기 일꾼”
- tasks.py  
    → “일꾼에게 시키는 작업 설명서”
    

👉 그래서 쉽게 정리하면

> Redis와 Celery는  
> 느리고 무거운 작업을 바로 실행하지 않고  
> 큐에 맡겨서 비동기로 처리하게 해주고,  
> `tasks.py`는 그 작업 내용을 정리해둔 파일입니다.

---
디렉토리 구조
```
DJANGO_SENTIMENT/
├── .venv/                   # 파이썬 가상환경
│
├── mysite/                  # Django 프로젝트 설정 폴더
│   ├── __init__.py          # 프로젝트 패키지 초기화 (Celery 연결 포함)
│   ├── asgi.py              # ASGI 설정 (비동기 서버용)
│   ├── celery.py            # ✅ Celery 설정 파일 (Redis 브로커 연결)
│   ├── settings.py          # Django 전역 설정 (Redis / Celery 설정 포함)
│   ├── urls.py              # 프로젝트 전체 URL 라우팅
│   └── wsgi.py              # WSGI 설정
│
├── sentiment/               # 감정 분석 앱
│   ├── __pycache__/         # 파이썬 캐시 (자동 생성)
│   ├── migrations/          # DB 마이그레이션 파일
│   │
│   ├── static/              # 정적 파일 (CSS, JS 등)
│   ├── templates/           # HTML 템플릿
│   │
│   ├── __init__.py          # 앱 패키지 초기화
│   ├── admin.py             # Django 관리자 설정
│   ├── apps.py              # 앱 설정
│   ├── forms.py             # Django Form (HTML 폼용)
│   ├── hf_model.py          # ✅ HuggingFace 모델 로딩/재사용
│   ├── models.py            # ✅ TextItem 모델 (분석 요청/결과 저장)
│   ├── services.py          # ✅ 핵심 서비스 로직 (캐시 → 모델 → 결과)
│   ├── tasks.py             # ✅ Celery 비동기 작업 정의
│   ├── tests.py             # 테스트 코드
│   ├── urls.py              # sentiment 앱 URL 라우팅
│   └── views.py             # View (요청 접수, 작업 등록)
│
├── db.sqlite3               # SQLite 데이터베이스
├── manage.py                # Django 관리 명령어 진입점
└── requirements.txt         # 패키지 의존성 목록
```
- `services.py`
- `tasks.py`
    
이 두 개가 Redis + Celery를 쓰기 위해 핵심적으로 추가된 파일

---
설치 & Redis 실행
```python
uv pip install celery redis django-redis
```

Docker 설치 (처음 1번만)
OS에 맞게 설치해야 합니다.

- Windows / macOS  
    → Docker Desktop 설치

Docker 설치 방법 (Windows / macOS 공통 흐름)

① 공식 사이트 접속
[https://www.docker.com/](https://www.docker.com/)

![[Pasted image 20260207180549.png]]

설치 파일 다운로드
- Windows: `.exe`
- macOS: `.dmg`
    
다운로드 끝나면 실행

설치 진행
- 그냥 Next / Install 계속
- Windows면 WSL2 관련 체크 그대로 유지

설치 후 Docker Desktop 실행
- 고래 🐳 아이콘 뜨면 정상
- Docker is running 상태 확인

설치 확인 
```bash
docker --version
```

Redis 실행(가장 쉬운 Docker):
```bash
docker run -d --name redis -p 6379:6379 redis:7
```
여기까지가 Redis 서버 실행 완료

실행 확인 (추천)
```bash
docker ps
```
결과
```
(.venv) (.venv) youjung@DESKTOP-PJCRMMU:~/django_sentiment$ docker ps
CONTAINER ID   IMAGE                    COMMAND                  CREATED         STATUS          PORTS                                                           NAMES
0a6fb797e27a   redis:7                  "docker-entrypoint.s…"   7 seconds ago   Up 7 seconds    0.0.0.0:6379->6379/tcp, :::6379->6379/tcp                       redis
28d1d73e40f0   grafana/grafana          "/run.sh"                5 months ago    Up 38 minutes   0.0.0.0:3000->3000/tcp, :::3000->3000/tcp                       grafana
235737b5d507   portainer/portainer-ce   "/portainer"             10 months ago   Up 38 minutes   8000/tcp, 9443/tcp, 0.0.0.0:9000->9000/tcp, :::9000->9000/tcp   portainer
```

도커가 실행된 실제 구조
```
[OS / WSL]
   ├ Docker Engine  ← 여기에 설치됨
   │    ├ redis 컨테이너
   │    ├ grafana 컨테이너
   │    └ portainer 컨테이너
   │
   └ Python venv (.venv)
        └ Django / Celery / Python 패키지들
```
- Docker → OS/WSL 레벨
- .venv → Python 패키지 격리용
- 서로 완전히 다른 층
    
`.venv`가 활성화된 상태에서 `docker ps`가 되는 건  
👉 venv 안에 설치돼서가 아니라, 그냥 터미널에서 Docker를 호출한 것입니다.

---
DRF 환경셋팅하기

`mysite/settings.py 설정 추가 (Redis 캐시 + Celery 브로커)`
```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": 60 * 10,  # 기본 캐시 TTL 10분
    }
}

CELERY_BROKER_URL = "redis://127.0.0.1:6379/2"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/3"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Seoul"
```
	Celery와 Redis가 사용할 ‘설정값’을 Django의 설정 저장소에 정의해둡니다.

---
Celery 연결 파일 만들기
`mysite/celery.py` 새로 생성
```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

app = Celery("mysite")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```
	위의 코드는 Django 프로젝트와 Celery를 ‘연결’하는 환경 셋업 파일입니다.
	celery.py는 Celery 앱을 만들고, Django 설정을 읽게 만들고, 프로젝트 안의 task들을 
	자동으로 발견하게 하는 초기화 파일입니다.

---
`mysite/__init__.py` (수정)
```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```
`mysite/__init__.py`의 이 코드는  
Django가 시작될 때 `mysite/celery.py`를 반드시 실행시키기 위한  
자동 초기화 트리거 코드입니다.

---
Redis Cache를 붙일 서비스 파일 만들기
	이 파일(`sentiment/services.py`)이 허깅페이스 모델 호출(추론)을 한 곳에 모아두는 핵심 로직이고, 여기에 Redis 캐시까지 붙여서 같은 입력이면 다시 모델을 돌리지 않게 만드는 역할을 합니다.

`services.py`는 결국 입력 → 처리 → 출력 파이프라인을 한 곳에 모으는 거라서, 아래 사고 순서만 몸에 익히면 어떤 기능이든 같은 방식으로 짤 수 있습니다.

services.py를 짤 때의 사고 패턴 (5단계)

`1)` 이 함수는 뭘 책임져야 하지?를 한 문장으로 정하기
- 예: `analyze_text(text)`는  
    텍스트를 받아서 label/score를 돌려준다 
    (DB 저장, HTTP 응답, HTML 렌더링은 책임 아님)
    
✅ 핵심: 이 함수는 서비스 로직만 담당
❌ view/serializer/model 일을 섞지 않기

쉽게 설명하면:
- 이 함수는 한 가지 일만 하게 만든다
- `analyze_text()`의 일은 딱 이것:
    - 글을 받아서 → 분석 결과를 돌려주는 것
        
- 이 함수 안에서는:
    - 화면 보여주기 ❌
    - DB에 저장하기 ❌
    - API 응답 만들기 ❌
        
- 그냥 계산기처럼 생각하면 됨
    → 넣으면 결과만 나오는 함수

---
`2)` 입출력 계약(Contract)을 고정하기
- 입력 타입 / 출력 형태를 먼저 고정하면 구현이 쉬워집니다.

예)
- 입력: `text: str`
- 출력: `{"label": str, "score": float}`
    
이걸 고정하면:
- DRF든, CBV든, Celery든 동일한 방식으로 재사용가능

쉽게 설명하면:
- 함수를 만들기 전에 약속부터 정합니다.
    - 무엇을 넣으면
    - 무엇이 나온다
        
- 예를 들면:
    - 입력은 항상 문자열 하나
    - 결과는 항상 label + score
        
- 이렇게 약속을 정해두면:
    - 웹 화면에서 써도 되고
    - API에서 써도 되고
    - 백그라운드 작업에서 써도 된다
        
- 즉, 어디서 불러도 똑같이 동작하는 부품됩니다.

---
`3)` 빠른 길을 먼저 생각하기 (캐시 / early return)

서비스 로직은 보통 이 순서로 작성합니다.
1. 비정상 입력 방어 (`if not text: return ...`)
2. 캐시 있으면 바로 반환 (`cache.get`)
3. 없으면 진짜 비용 큰 처리 수행 (모델 호출)
4. 결과 정리
5. 캐시에 저장
6. 반환
    
✅ 위의 순서가 이 코드의 뼈대가 됩니다.

쉽게 설명하면:
- 항상 가장 쉬운 경우부터 처리합니다
- 생각 순서는 다음과 같습니다:
    1. 아무 글도 안 왔네? → 그냥 기본값 반환
    2. 전에 분석한 글이네? → Redis에서 바로 꺼내기
    3. 처음 보는 글이네? → 모델 돌리기 (제일 비쌈)
    4. 결과를 보기 좋은 형태로 정리
    5. 다음에 또 쓰려고 Redis에 저장
    6. 결과 돌려주기
        
- 이 순서를 따르면 코드 구조가 자연스럽게 정리됩니다.

---
`4)` 느린/외부 의존을 분리하기
- 서비스 코드에서 제일 중요한 감각은:
	- 외부 호출(느림): HuggingFace, DB, API
	- 내부 로직(빠름): 입력정리, 결과정리
    
- 그래서 보통 파일을 이렇게 나눕니다.
	- `hf_model.py` : 모델 로딩/재사용
	- `services.py` : 캐시 확인 → 모델 호출 → 결과 정리 흐름
	- `tasks.py` : 비동기 실행(옵션)
    
✅ 외부 의존은 얇게 감싸고, 서비스는 흐름을 조립한다 이게 패턴입니다.

쉽게 설명하면:
- 시간이 오래 걸리는 건 따로 빼놓습니다.
- 예:
    - 모델 로딩 → `hf_model.py`
    - 분석 순서 관리 → `services.py`
    - 뒤에서 몰래 실행 → `tasks.py`
        
- `services.py`는:
    - 어떤 순서로 할지만 결정하는 곳
        
- 즉:
    - 힘든 일은 다른 파일에 맡기고
    - 서비스는 전체 흐름만 조립

---
`5)` 실패/예외/로그를 어디서 처리할지 정하기

초보자는 여기서 멘붕이 옵니다.
그러나 규칙 하나만 기억하면 돼:
- 서비스 함수는 예외를 발생시켜도 됨
- View/Task가 사용자 응답/재시도 정책을 결정
    
예)
- API는 400/500 응답 만들기 
- Celery task는 `autoretry`로 재시도

쉽게 설명하면:
services.py는  
입력 → 처리 → 결과”만 담당하는 계산기 같은 파일입니다.

화면, DB, API, 재시도 같은 건 다른 파일이 책임집니다.

---
services.py는 거의 항상 이 모양입니다. 그대로 외워도 됩니다.
```python
def service(input):
    # 1) 입력 정리/검증(간단한 수준)
    if invalid: 
        return default_or_raise

    # 2) 캐시/빠른 길
    cached = cache.get(key)
    if cached:
        return cached

    # 3) 느린 처리(외부 호출)
    result = slow_operation(input)

    # 4) 결과 정리(형식 통일)
    normalized = normalize(result)

    # 5) 캐시 저장(옵션)
    cache.set(key, normalized, ttl)

    # 6) 반환
    return normalized
```
---
`sentiment/services.py` 새로 생성
```python
import hashlib
from django.core.cache import cache        # Redis 캐시 (Django CACHES 설정 사용)
from .hf_model import get_classifier        # 느린 외부 의존: HuggingFace 모델


def _cache_key(text: str) -> str:
    """
    캐시용 key 생성 함수
    - 원문 텍스트 대신 해시를 사용해 안전하고 짧은 key를 만든다
    """
    normalized = text.strip().encode("utf-8")
    h = hashlib.sha256(normalized).hexdigest()
    return f"sentiment:analysis:{h}"


def analyze_text(text: str) -> dict:
    """
    [서비스 함수]
    입력: text(str)
    출력: {"label": str, "score": float}
    """

    # -------------------------------------------------
    # 1) 입력 정리 / 검증 (간단한 수준)
    # -------------------------------------------------
    text = (text or "").strip()
    if not text:
        return {"label": "", "score": 0.0}

    # -------------------------------------------------
    # 2) 캐시 / 빠른 길 (Redis hit이면 즉시 반환)
    # -------------------------------------------------
    key = _cache_key(text)
    cached = cache.get(key)
    if cached:
        return cached

    # -------------------------------------------------
    # 3) 느린 처리 (외부 의존: HuggingFace 모델 호출)
    # -------------------------------------------------
    classifier = get_classifier()
    out = classifier(text)

    if isinstance(out, list) and out:
        out = out[0]

    # -------------------------------------------------
    # 4) 결과 정리 (서비스 표준 형태로 통일)
    # -------------------------------------------------
    result = {
        "label": out.get("label") or "",
        "score": float(out.get("score", 0.0)),
    }

    # -------------------------------------------------
    # 5) 캐시 저장 (다음 요청을 빠르게 처리하기 위함)
    # -------------------------------------------------
    cache.set(key, result, timeout=60 * 10)

    # -------------------------------------------------
    # 6) 반환
    # -------------------------------------------------
    return result

```


🔹 1) 입력 정리 / 검증
```python
text = (text or "").strip()

if not text:
    return {"label": "", "score": 0.0}
```

👉 뼈대의 이 부분에 해당:
```python
# 1) 입력 정리/검증
if invalid:
    return default
```

의미:
- `None` 방어
- 공백 제거
- “분석할 가치가 없는 입력이면 바로 끝”

---
🔹 2) 캐시 / 빠른 길
```python
key = _cache_key(text)
cached = cache.get(key)
if cached:
    return cached
```

👉 뼈대의 이 부분:
```python
# 2) 캐시/빠른 길
cached = cache.get(key)
if cached:
    return cached
```

의미:
- 이미 분석한 적 있으면
- 비싼 작업(모델 호출)을 아예 안 함

---
🔹 3) 느린 처리 (외부 호출)
```python
classifier = get_classifier()
out = classifier(text)
```

👉 뼈대의 이 부분:
```python
# 3) 느린 처리(외부 호출)
result = slow_operation(input)
```

의미:

- HuggingFace 모델 호출
- 가장 느리고 비용 큰 단계
- 그래서 앞에서 캐시로 최대한 걸러냄

---
🔹 4) 결과 정리 (형식 통일)
```python
result = {
    "label": out.get("label") or "",
    "score": float(out.get("score", 0.0)),
}
```

👉 뼈대의 이 부분:
```python
# 4) 결과 정리(형식 통일)
normalized = normalize(result)
```

의미:

- HF 모델의 제멋대로인 출력 → **우리 서비스 표준 형태로 통일**
- 이후 View / Serializer / Task에서 고민 안 하게 만듦

---
🔹 5) 캐시 저장
```python
cache.set(key, result, timeout=60 * 10)
```

👉 뼈대의 이 부분:
```python
# 5) 캐시 저장
cache.set(key, normalized, ttl)
```

의미:

- 다음 요청을 빠르게 처리하기 위한 준비
- 이번에 계산한 결과를 메모해 둔다

---
🔹 6) 반환
```python
return result
```

👉 뼈대의 마지막:
```python
# 6) 반환
return normalized
```
---

이 코드의 용도
`1)` 왜 `services.py`로 분리하나?
- `views.py`는 요청/응답 처리만 하고
- 실제 비즈니스 로직(분석)은 `services.py`로 빼면  
    재사용(CreateView/UpdateView/DRF API/ Celery task)이 쉬워집니다.
    

`2)` 왜 Redis 캐시를 붙이나?
- 허깅페이스 모델 추론은 보통 시간이 걸리고(느림) 비용이 큼
- 같은 문장을 여러 번 분석할 수도 있음(테스트, 새로고침, 같은 요청 반복)
- 그래서 결과를 Redis에 잠깐 저장해두고(예: 10분)
    - 다음에 같은 문장 요청이 오면
    - 모델 호출 없이
    - Redis에서 즉시 결과를 꺼내 반환
    

`3)` 해시 키를 쓰는 이유
- Redis key에 원문 텍스트를 그대로 쓰면:
    - 너무 길어질 수 있고
    - 공백/줄바꿈/특수문자 문제도 생길 수 있고
    - 개인정보/민감한 문장이 key로 남을 수도 있음
- 그래서 `sha256` 해시로 짧고 안전한 key를 만듭니다.

---
Celery Task 파일 만들기 (비동기 분석 담당)
`sentiment/models.py` (추가)
```python
class TextItem(models.Model):
    text = models.TextField()   # 분석 대상 원문
    label = models.CharField(max_length=50, blank=True) # 분석 결과(긍정/부정 등)
    score = models.FloatField(null=True, blank=True) # 분석 점수
    created_at = models.DateTimeField(auto_now_add=True) # 언제 생성됐는지

    is_analyzing = models.BooleanField(default=False)  
    # ✅ 추가 지금 이 텍스트가 분석 중인가?를 기록
```
	is_analyzing은 “이 텍스트가 지금 분석 중인지 아닌지”라는 상태를 DB에 저장하기 위한 
	필드입니다.

왜 이런 상태 필드가 필요할까? (실제 상황 기준)

상황 1️⃣ 분석이 느린 경우 (AI 모델, Celery)
- HuggingFace 모델은 즉시 끝나지 않을 수 있음
- Celery로 백그라운드에서 돌리면:
    - 요청 → 바로 결과가 안 나옴
        
이때 DB에 이렇게 저장됨:
```
text="이 영화 정말 좋다"
is_analyzing=True
label=""
score=NULL
```
	“아직 처리 중”이라는 사실을 명확히 알 수 있음


상황 2️⃣ 프론트엔드 / 관리자 화면
UI에서 이런 판단이 가능해짐:
- `is_analyzing=True`  
    → “분석 중입니다… ⏳”
    
- `is_analyzing=False` + label 있음  
    → 결과 표시
    
👉 프론트가 DB 상태만 보고도 판단 가능


상황 3️⃣ 중복 분석 방지
같은 TextItem에 대해:
- 이미 분석 중인데
- 또 Celery task를 보내는 실수를 막을 수 있음
```python
if item.is_analyzing:
    return  # 이미 처리 중
```


상황 4️⃣ 장애/실패 추적

만약:
- Celery worker가 죽어서
- `is_analyzing=True`로만 남아 있다면?
    
👉 어디서 작업이 멈췄는지 추적 가능  
👉 나중에 재시도/복구 로직도 만들 수 있음

---
마이그레이션:
```bash
python manage.py makemigrations
python manage.py migrate
```
필드가 추가되었으니 다시 테이블을 생성해 줍니다.

---
`tasks.py`는 Celery 워커가 실행할 작업 함수(=task)들을 모아둔 파일이고,  
그 작업 함수는 보통 DB에서 대상 가져오기 → 서비스 로직 실행 → DB에 결과 저장 → 상태 업데이트 순서로 코딩합니다.

Task 뼈대 패턴 (거의 모든 비동기 작업에 공통)

✅ Celery Task 기본 패턴 (6단계)
1. (Import) 필요한 것 가져오기
    - Task 데코레이터, DB 트랜잭션, 모델, 서비스 함수
        
2. (Task 선언) Celery가 인식할 수 있게 `@shared_task` 붙이기
    - 재시도 정책(autoretry)도 여기서 정함
        
3. (Input) task 함수는 보통 “id 하나”만 받기
    - 큰 텍스트/파일을 큐에 직접 넣지 않기 위해서
        
4. (Fetch) DB에서 대상 레코드 가져오기
    - `TextItem.objects.get(id=item_id)`
        
5. (Work) 핵심 로직은 services.py에 맡기기
    - `analyze_text(item.text)`
    - 여기서 Redis 캐시도 자동 적용됨
        
6. (Save) DB 업데이트는 원자적으로(atomic) 저장 + 상태 변경
    - 결과 저장, `is_analyzing=False`
    - update_fields로 필요한 필드만 업데이트
        
이 6단계 패턴만 기억하면 “task 코드”는 거의 다 만들 수 있습니다.

아래는 Celery task를 만들 때 쓰는 “6단계 뼈대 코드”입니다.
이걸 복사해서 `tasks.py`에 붙여두고, 필요한 부분만 바꾸면 됩니다.
```python
# app/tasks.py

# [패턴 1] Import: task 실행에 필요한 것들
from celery import shared_task
from django.db import transaction

# 예시) 작업 대상 모델/서비스 함수
# from .models import YourModel
# from .services import do_work


# [패턴 2] Task 선언: Celery가 실행할 작업임을 표시 + 재시도 정책(옵션)
@shared_task(
    bind=True,
    autoretry_for=(Exception,),  # 에러 나면 자동 재시도
    retry_backoff=True,          # 재시도 간격 점점 증가
    max_retries=5                # 최대 5번
)
def your_task(self, obj_id: int) -> None:
    """
    ✅ Task 목표:
    - (DB) obj_id로 대상 가져오기
    - (서비스) 핵심 로직 실행
    - (DB) 결과 저장 + 상태 업데이트
    """

    # [패턴 3] Input: task는 보통 "id 하나"만 받는다
    # (큰 데이터를 큐에 직접 넣지 않고 DB에서 가져오는 방식)

    # [패턴 4] Fetch: DB에서 작업 대상 레코드 가져오기
    # obj = YourModel.objects.get(id=obj_id)

    # [패턴 5] Work: 핵심 로직은 services.py에 맡기기
    # result = do_work(obj.input_data)

    # [패턴 6] Save: 결과 저장/상태 변경은 atomic으로 안전하게 처리
    with transaction.atomic():
        # obj.result_field = result["..."]
        # obj.status = "done"
        # obj.save(update_fields=["result_field", "status"])
        pass
```


`sentiment/tasks.py` (새로 생성)
```python
# [패턴 1] Import: task 실행에 필요한 것들 가져오기
# - shared_task: Celery가 이 함수를 "작업(task)"으로 인식하게 함
# - transaction: DB 저장을 안전하게(원자적으로) 묶기 위해 사용
# - TextItem: 작업 대상(DB 레코드)
# - analyze_text: 실제 감정분석 로직(캐시→모델→결과정리)이 들어있는 서비스 함수
from celery import shared_task
from django.db import transaction
from .models import TextItem
from .services import analyze_text

# [패턴 2] Task 선언: "이 함수는 Celery 워커가 실행할 작업이다"라고 등록
# - bind=True: task 함수에 self를 받아 재시도/메타정보 등을 사용할 수 있게 함
# - autoretry_for=(Exception,): 예외 발생 시 자동 재시도
# - retry_backoff=True: 재시도 간격을 점점 늘림 (1s, 2s, 4s ... 같은 느낌)
# - max_retries=5: 최대 5번까지 재시도
@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def analyze_textitem_task(self, item_id: int) -> None:
    """
    ✅ 이 Task의 목표(역할):
    - (DB) TextItem을 가져온다
    - (서비스) analyze_text()로 감정분석을 수행한다 (Redis 캐시 적용됨)
    - (DB) label/score 저장하고 is_analyzing을 False로 바꿔 "완료" 처리한다
    """
    
    # [패턴 3] Input: task는 보통 "id 하나"만 받는다
    # - 큰 텍스트를 큐에 넣는 대신,
    #   id만 넘기고 실제 데이터는 DB에서 조회하는 게 정석 패턴
    
    
    # [패턴 4] Fetch: DB에서 작업 대상 레코드 가져오기
    # - item_id에 해당하는 TextItem을 조회
    item = TextItem.objects.get(id=item_id)


    # [패턴 5] Work: 핵심 로직은 services.py에 맡겨 실행
    # - analyze_text 내부에서:
    #   1) Redis 캐시 확인
    #   2) 없으면 HuggingFace 추론
    #   3) 결과 정리 + Redis 저장
    result = analyze_text(item.text)
    # result 예: {"label": "positive", "score": 0.98}
    

    # [패턴 6] Save: 결과 저장/상태 변경은 atomic으로 안전하게 처리
    # - label, score, is_analyzing을 "한 번에" 저장해서
    #   중간 실패로 데이터가 꼬이지 않게 함
    with transaction.atomic():
        item.label = result["label"]
        item.score = result["score"]
        item.is_analyzing = False  # 분석 완료 표시

        # update_fields: 필요한 필드만 업데이트해서 DB 부담을 줄임
        item.save(update_fields=["label", "score", "is_analyzing"])
```

###### 매칭표
|패턴|이 코드에서 해당 부분|
|---|---|
|1 Import|`from celery...`, `from .models...`, `from .services...`|
|2 Task 선언|`@shared_task(...)`|
|3 Input|`def ...(self, item_id: int)` (id만 받는 구조)|
|4 Fetch|`TextItem.objects.get(id=item_id)`|
|5 Work|`result = analyze_text(item.text)`|
|6 Save|`transaction.atomic()` + `item.save(...)`|

---
이전 views.py의 코드는 저장하기 전에(요청 안에서) 분석까지 끝내는 동기 처리였는데
아래 코드로 변경하여 먼저 저장하고, 분석은 Celery로 뒤에서 하는 비동기 처리로 바꾸기 위한 코드입니다.

`sentiment/views.py` (Create/Update만 바뀝니다.)
```python
from django.urls import reverse_lazy
from django.views.generic import CreateView, UpdateView

from .forms import SentimentForm
from .models import TextItem

# ✅ 변경점: 예전엔 analyze_text()를 view에서 직접 호출했지만,
#          이제는 Celery task로 넘기기 위해 tasks.py를 import 합니다.
from .tasks import analyze_textitem_task


class TextItemCreateView(CreateView):
    """
    ✅ 변경 전(동기 처리):
      - form_valid 안에서 analyze_text(text)를 직접 호출
      - HF 추론이 끝날 때까지 요청이 기다림
      - 결과(label/score)를 form.instance에 넣고 저장

    ✅ 변경 후(비동기 처리):
      - 먼저 DB에 저장하고(is_analyzing=True)
      - 저장된 객체 id로 Celery 작업을 등록(.delay)
      - HF 추론은 Celery worker가 뒤에서 수행하고 DB에 반영
    """
    model = TextItem
    form_class = SentimentForm
    template_name = "sentiment/textitem_form.html"
    success_url = reverse_lazy("sentiment:item_list")

    def form_valid(self, form):
        # ✅ 변경점 1) 저장 전에 분석 결과(label/score)를 넣지 않는다.
        # 이유: 분석은 시간이 오래 걸리므로(병목), 요청 안에서 처리하지 않기 위함

        # ✅ 변경점 2) 분석이 아직 안 끝났다는 표시를 DB에 남김
        # 이유: 화면에서 "분석중..." 상태를 표시할 수 있고, 중복 요청도 방지 가능
        form.instance.is_analyzing = True

        # ✅ 변경점 3) 먼저 저장을 수행한다.
        # 여기서 self.object가 생성되며 id(pk)가 생긴다.
        response = super().form_valid(form)

        # ✅ 변경점 4) 저장된 객체 id로 Celery 작업 등록
        # 이유: task는 보통 id만 받고, 실제 데이터는 DB에서 조회하는 방식이 정석
        analyze_textitem_task.delay(self.object.id)

        # ✅ 응답은 즉시 반환된다 (추론 완료를 기다리지 않음)
        return response


class TextItemUpdateView(UpdateView):
    """
    ✅ 변경 이유:
    - 글을 수정하면 text가 바뀌므로 label/score도 다시 분석해야 한다.
    - 그래서 UpdateView도 CreateView와 동일하게:
      '먼저 저장 → task 등록 → 뒤에서 분석' 흐름을 사용한다.
    """
    model = TextItem
    form_class = SentimentForm
    template_name = "sentiment/textitem_form.html"

    def get_success_url(self):
        return reverse_lazy("sentiment:item_detail", kwargs={"pk": self.object.pk})

    def form_valid(self, form):
        # ✅ 변경점 1) 수정 시에도 분석중 표시
        form.instance.is_analyzing = True

        # ✅ 변경점 2) 먼저 저장해서 최신 text가 DB에 반영되게 한다.
        response = super().form_valid(form)

        # ✅ 변경점 3) 저장된 객체 id로 분석 task 등록
        # (task가 DB에서 최신 text를 조회해서 분석하게 됨)
        analyze_textitem_task.delay(self.object.id)

        return response
```

### 동기처리와 비동기처리 패턴 비교

`1)` 동기 처리 패턴 (Sync)
특징: 요청이 들어오면 그 요청 안에서 분석(추론)까지 끝내고 응답/저장함.  
➡️ 사용자는 결과가 나올 때까지 기다림.

✅ 동기 처리 흐름(구조)
```
1. 사용자가 폼 제출(POST)
2. Django가 SentimentForm로 데이터 검증 
3. 검증이 성공하면 → form_valid(self, form)을 호출 
4. super().form_valid(form)이 DB 저장을 수행 
5. 저장이 끝나면 성공 페이지로 redirect  

즉,
- 검증은: form_valid 밖에서 이미 끝났고
- form_valid는: 검증 통과한 데이터로 뭘 더 할지를 적는 곳이야
```

✅ 동기 처리 코드 뼈대(패턴)
```python
def form_valid(self, form):
    # (검증은 이미 끝남) → cleaned_data에서 text 꺼냄
    text = form.cleaned_data["text"]

    # [동기] 여기서 바로 분석(느림)
    result = analyze_text(text)

    # 분석 결과를 저장될 객체에 미리 넣어둠
    form.instance.label = result["label"]
    form.instance.score = result["score"]
    form.instance.is_analyzing = False

    # DB 저장 (label/score 포함해서 한 번에 저장됨)
    return super().form_valid(form)
```
✅ 동기 처리 언제 쓰나?
- 분석이 빠르다 (몇 백 ms ~ 1초 정도)
- 저장 버튼 눌렀을 때 즉시 결과가 꼭 필요하다
- 사용자 수가 적거나, 서버가 충분히 여유 있다

---
`2)` 비동기 처리 패턴 (Async: Redis + Celery)
특징: 요청은 빨리 끝내고, 분석은 뒤에서(워커) 처리함.  
➡️ 사용자는 “접수 완료(id)”를 받고, 나중에 결과를 확인함.

✅ 비동기 처리 흐름(구조)
```
[CreateView.post 내부 흐름]
1) Form 검증 성공 → form_valid(form)로 들어옴
2) (DB 저장 준비) form.instance.is_analyzing = True
3) (DB 저장) super().form_valid(form)  → self.object.pk 생성됨
4) (작업 등록) analyze_textitem_task.delay(self.object.pk)
5) (응답) redirect/응답 반환 (결과는 아직 없음)
```

✅ 비동기 처리 코드 뼈대(패턴)

(A) views.py: 작업 등록만
```python
def form_valid(self, form):
    # 1) (입력 검증은 이미 끝남) cleaned_data 사용 가능

    # 2) DB 저장 준비: 분석중 표시
    form.instance.is_analyzing = True

    # 3) DB 저장 먼저 → id 생성
    response = super().form_valid(form)

    # 4) Celery 작업 등록 (id만 넘김)
    analyze_textitem_task.delay(self.object.id)

    # 5) 응답 반환 (결과는 나중에 채워짐)
    return response
```


B) 워커(Celery) 쪽 뼈대 — “실제 분석 실행 + 저장”
```
[tasks.py 내부 흐름]
1) task 실행(item_id 받음)
2) DB에서 TextItem 조회
3) services.analyze_text(text) 실행 (캐시→모델)
4) DB에 label/score 저장 + is_analyzing=False
```

(B) tasks.py: 워커 뼈대 코드(패턴)
```python
# @ 이 함수는 Celery가 큐에 넣고, 워커가 실행할 작업(task)이다 라고 등록(표시)해주는 딱지
@shared_task(...) 
def analyze_textitem_task(item_id):
    # 1) DB 조회
    item = TextItem.objects.get(id=item_id)

    # 2) 서비스 실행 (캐시→모델)
    result = analyze_text(item.text)

    # 3) DB 저장 + 상태 종료
    with transaction.atomic():
        item.label = result["label"]
        item.score = result["score"]
        item.is_analyzing = False
        item.save(update_fields=["label", "score", "is_analyzing"])
```
✅ 비동기 처리 언제 쓰나?
- 분석이 느리다 (몇 초~수십 초)
- 동시에 요청이 많아져서 병목이 생길 수 있다
- 실패 시 재시도가 필요하다
- “분석중/완료” 같은 상태 관리가 필요하다

---
기존 템플릿에 분석중 표시(선택이지만 추천)
`sentiment/templates/sentiment/textitem_detail.html` 안에:
```html
{% extends "base.html" %}
{% block content %}
  <h1 class="page-title">상세</h1>

  <div class="card">
    <div class="row">
      <span class="label">입력</span>
      <div>{{ item.text }}</div>
    </div>

    <!-- ✅ 여기부터가 추가/수정 포인트 -->
    {% if item.is_analyzing %}
      <div class="row">
        <span class="label">분석 상태</span>
        <div>분석중입니다... 잠시 후 새로고침 해주세요.</div>
      </div>
    {% else %}
      <div class="row">
        <span class="label">라벨</span>
        <div>{{ item.label }}</div>
      </div>
      <div class="row">
        <span class="label">점수</span>
        <div>{{ item.score|floatformat:4 }}</div>
      </div>
    {% endif %}
    <!-- ✅ 여기까지 -->
  </div>

  <div class="btn-group" style="margin-top:14px;">
    <a class="btn" href="{% url 'sentiment:item_update' item.pk %}">수정</a>
    <a class="btn btn-ghost" href="{% url 'sentiment:item_delete' item.pk %}">삭제</a>
    <a class="btn btn-ghost" href="{% url 'sentiment:item_list' %}">목록</a>
  </div>
{% endblock %}
```

실행 (중요: 서버 1개 + 워커 1개)
터미널1
```bash
python manage.py runserver
```

터미널2
```bash
celery -A mysite worker -l info -P solo
```

화면 결과: 이렇게 나오면 정상입니다.
![[Pasted image 20260207203512.png]]

이제 “작업이 실제로 도는지” 테스트하는 방법

브라우저에서 테스트할 주소는 다음과 같습니다.
```
http://127.0.0.1:8000/predict/  # 동기식 테스트
http://127.0.0.1:8000/new/  # 비동기식 테스트
```

테스트할 문장예시
```
### ✅ 긍정(Positive)
1. 오늘은 진짜 기분이 너무 좋아서 뭐든 할 수 있을 것 같아!   
2. 오랜만에 좋은 소식이 있어서 마음이 편안하고 행복해. 
3. 노력한 만큼 결과가 나와서 뿌듯하고 자신감이 생겼어.
    
### ✅ 부정(Negative)
4. 요즘 너무 지치고 의욕이 없어서 아무것도 하기 싫다.
5. 계속 일이 꼬여서 스트레스가 심하고 답답해.
6. 기대했던 일이 실패해서 속상하고 우울해.
    
### ✅ 중립(Neutral) / 애매(모델이 헷갈릴 수 있는 문장)
7. 오늘은 그냥 평범한 하루였고 특별한 일은 없었다.
8. 해야 할 일이 많긴 한데 차근차근 해보려고 한다.  
9. 좋기도 하고 나쁘기도 한데 정확히 뭐라 말하기 애매해.
    
### ✅ 길게(모델 로딩/추론 시간 차이 크게 보기 좋음)
10. 오늘은 아침부터 일정이 많아서 정신이 없었지만, 점심에 맛있는 걸 먹으면서 잠깐 여유를 찾았어. 그런데 오후에 예상치 못한 문제가 생겨서 다시 스트레스를 받았고, 그래도 끝까지 해결하려고 노력했더니 조금은 안도감이 드는 하루였어.
```

---
방법 1) 웹에서 글 작성/수정해보기 (추천)
1. Django 서버 켠 상태에서
2. 글 작성(Create) 또는 수정(Update) 폼 제출
3. 그러면 view에서 `.delay(id)`가 호출되어
4. Celery 터미널에 아래처럼 로그가 찍혀야 정상

예상 로그:
```
Task sentiment.tasks.analyze_textitem_task[....] received
```
- 처리 완료 후 DB에 label/score 저장

그리고 상세 페이지에서:
- 처음엔 “분석중…”
- 새로고침하면 label/score 채워짐

---
방법 2) Django shell에서 강제로 task 던지기

(가장 확실)
1) 먼저 TextItem 하나 만들기
```bash
python manage.py shell
```

```python
from sentiment.models import TextItem
item = TextItem.objects.create(text="오늘 너무 행복해", is_analyzing=True)
item.id
```

2) task 등록
```python
from sentiment.tasks import analyze_textitem_task
analyze_textitem_task.delay(item.id)
```

이제 Celery 워커 터미널에 “received” 같은 로그가 뜨면 성공.

3) DB 업데이트 확인
```python
item.refresh_from_db()
item.is_analyzing, item.label, item.score
```

4) “Redis가 살아있나”를 제대로 확인하는 법 redis-cli로 ping (가능하면)
```bash
redis-cli -h 127.0.0.1 -p 6379 ping
```

정상이라면:
```
PONG
```

만약 redis-cli가 없다면(WSL에 미설치):
```bash
sudo apt-get update
sudo apt-get install -y redis-tools
```

B) 또는 컨테이너 로그 확인
```bash
docker logs redis --tail 50
```

---
### 동기식과 비동기식의 처리 속도 측정하기

| 항목                   | 의미                |
| -------------------- | ----------------- |
| 요청 전송됨               | 브라우저 → 서버 요청 시작   |
| 서버 응답을 기다리는 중 (TTFB) | 서버에서 실제로 처리 중인 시간 |
| 콘텐츠 다운로드             | 결과 HTML 받는 시간     |
| 설명 (총 시간)            | 이 요청 전체 처리 시간     |

브라우저 네트워크에서 처리시간 확인하기
(1) 동기 측정  
![[Pasted image 20260207212330.png]]
```
서버 응답을 기다리는 중: 1.81초
설명(총): 1.81초
```
실제 흐름
```
POST /predict/
→ Django View 진입
→ HuggingFace 모델 로딩 + 추론
→ 결과 생성
→ HTML 응답
```
	모델 추론 시간이 그대로 사용자 대기 시간

(2) 비동기 측정 
![[Pasted image 20260207212259.png]]

```
서버 응답을 기다리는 중: 4~5 ms
설명(총): 5.49 ms
```
실제 흐름
```
POST /new/
→ DB에 text 저장
→ Celery.delay(id) 호출
→ 즉시 redirect 응답
```

###### 그래서 이 숫자가 의미하는 것
| 방식   | 브라우저 대기 시간    |
| ---- | ------------- |
| 동기식  | ~1.8초         |
| 비동기식 | ~0.005초 (5ms) |
👉 약 360배 차이

성능평가를 이렇게 설명하면 됩니다
동기 방식은 모델 추론 시간이 그대로 HTTP 응답 시간으로 반영되어 평균 1.8초 이상 소요되었고,  비동기 방식은 요청 등록만 처리하여 평균 5ms 이내로 응답되었습니다.  
실제 분석은 Celery Worker에서 비동기로 수행됩니다.


