검색 키워드 : 
```
cat dog image classification
```

🔗 모델 링크: 
https://huggingface.co/DunnBC22/vit-base-patch16-224-in21k_dog_vs_cat_image_classification

🧠 모델 분석:  
	이 모델은 고양이(cat)와 강아지(dog)를 구분하는 Image Classification 모델입니다.  
	즉, 하나의 이미지를 입력하면 해당 이미지가 고양이인지 강아지인지를 예측합니다.

💰 라이선스 / 비용 분석: 
✔ 무료(Open Source)
- Hugging Face에 공개된 Apache-2.0 라이선스 모델
- 개인·학습·상업적 사용 모두 가능
    
✔ 추가 비용 여부
- 모델 파일 다운로드 및 로컬 실행 → 완전 무료
- 자체 서버 / GPU에서 실행 → 서버 자원 비용만 발생
- Hugging Face Inference API 사용 시 → 플랫폼 사용량에 따라 비용 발생 가능 (선택 사항)

---
모델에 문제가 없는지 우선 테스트를 합니다.
새 폴더 + 새 가상환경 만들기(검수 전용)
```bash
deactivate  # 가상환경 켜져 있으면
cd ~

mkdir test_vit
cd test_vit
code -r .

uv venv
source .venv/bin/activate
```

패키지 설치(최소 구성)
이미지 분류는 Pillow(이미지 열기)가 꼭 필요합니다.
```bash
uv pip install "transformers==4.45.2" torch pillow
```

테스트 이미지 준비
```bash
explorer.exe .
```

```python
test_vit/
 ├── cat.png   ← 아무 jpg/png 가능
```

`test_vit.py `
```python
from transformers import pipeline
from PIL import Image

MODEL_ID = "DunnBC22/vit-base-patch16-224-in21k_dog_vs_cat_image_classification"

classifier = pipeline("image-classification", model=MODEL_ID)

image = Image.open("cat.jpg")

result = classifier(image)

print(result)
```

실행:
```bash
python test_vit.py
```
정상출력
```
(test_vit) (.venv) youjung@DESKTOP-PJCRMMU:~/test_vit$ python test_vit.py
Hardware accelerator e.g. GPU is available in the environment, but no `device` argument is passed to the `Pipeline` object. Model will be on CPU.
[{'label': 'Cat', 'score': 0.9890297055244446}, {'label': 'Dog', 'score': 0.016582109034061432}]
```

---
`0)` 준비: 프로젝트 폴더 만들기
```bash
deactivate # 가상환경안에 있다면
cd ~
mkdir drf_catdog
cd drf_catdog
code -r .

uv venv
source .venv/bin/activate
```

`2)` 필요한 패키지 설치 (DRF + 모델 실행)
```bash
uv pip install django djangorestframework pillow transformers torch
```
⚠️ torch는 환경에 따라 설치가 오래 걸릴 수 있습니다. 이전에 한번 설치를 했다면 금방 설치가 끝납니다.

설치 확인:
```bash
python -c "import django, rest_framework, transformers, torch, PIL; print('ok')"
```
---
`3)` Django & Django REST Framework 설치 (필수)
```bash
pip install django
pip install djangorestframework
```
❗ DRF는 Django 위에서 동작하는 라이브러리라 Django 없이 먼저 설치하는 건 의미 없습니다

requirements.txt 생성
```bash
uv pip freeze > requirements.txt
```

`4)` Django 프로젝트 및 앱 생성
```bash
django-admin startproject mysite .
python manage.py startapp ai
```

디렉토리 구조:
```
drf_catdog/
│
├─ .venv/                   
│
├─ manage.py
├─ requirements.txt
│
├─ mysite/                   # 프로젝트 설정
│   ├─ __init__.py
│   ├─ asgi.py
│   ├─ settings.py
│   ├─ urls.py
│   └─ wsgi.py
│
├─ ai/                       # DRF 앱
│   ├─ __init__.py
│   ├─ admin.py
│   ├─ apps.py
│   ├─ models.py
│   ├─ serializers.py        # ✅ DRF 핵심
│   ├─ views.py
│   ├─ urls.py               # ✅ 앱 단위 라우팅
│   ├─ tests.py
│   └─ migrations/
│       └─ __init__.py
│
└─ .gitignore
```

`5)` settings.py 설정 (DRF 등록) 
`mysite/settings.py` 열어서 `INSTALLED_APPS`에 추가:
```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "ai",
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```
---
### DRF(Django REST Framework)란?
Django 위에서 RESTful API를 쉽게 만들도록 도와주는 확장 프레임워크입니다.

### Django vs DRF 차이:
Django 기본 역할
- HTML 페이지 렌더링 (Template)
- 서버사이드 웹앱 개발에 최적화
- 브라우저 화면 중심
    
DRF 역할
- JSON 기반 데이터 제공
- 프론트엔드 / 모바일 / 외부 시스템과 통신
- API 서버 중심
    
즉,
- Django → 화면 만드는 웹 프레임워크
- DRF → 데이터 제공하는 API 프레임워크 라고 이해하면 가장 쉽습니다.

### DRF가 필요한 이유
일반 Django만 쓰면 브라우저에서 밖에 응답 주고받을수 없지만
```
브라우저 → HTML 응답
```

DRF를 쓰면 아래와 같이 다양한 기반에서 응답을 주고 받을수 있습니다.
```
앱 / React / Vue / 모바일 → JSON 응답
```

### DRF가 제공하는 핵심 기능
DRF는 Django에 없는 API 편의 기능을 제공합니다
- **Serializer** → 모델 ↔ JSON 변환
- **APIView / ViewSet** → API 전용 뷰
- **Browsable API** → 웹에서 테스트 UI 제공
- **Authentication / Permission** → API 보안 처리
- **Pagination / Filtering** → 목록 처리

### DRF는 언제 사용하는가?
✔ React / Vue 프론트엔드 붙일 때  
✔ 모바일 앱과 통신할 때  
✔ 외부 시스템 연동할 때  
✔ SPA(Single Page Application) 구조 만들 때 
	- 페이지 전체를 새로고침하지 않고, 하나의 페이지 안에서 화면만 바뀌는 웹 구조  
✔ 백엔드 API 서버 만들 때

---
`6)` `mysite/urls.py`
```python
from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("ai.urls")),
]

if settings.DEBUG: # settings.py에 있는 DEBUG 값이 True일 때만 실행
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

`if settings.DEBUG:` 이코드가 하는 역할:
개발 환경(DEBUG=True)에서 업로드된 파일(MEDIA)을 Django가 직접 서빙하도록 하는 설정
- STATIC 파일: CSS / JS / 이미지 리소스
- MEDIA 파일: 사용자가 업로드한 파일
MEDIA는 Django가 기본적으로 자동 서빙하지 않습니다. 그래서 개발 중에는 이렇게 붙여줍니다.

DEBUG 조건이 붙는 이유는 개발 서버에서만 사용해야 안전하기 때문입니다.
- DEBUG=True → Django runserver가 파일 직접 제공
- DEBUG=False → 운영 환경 → 웹서버(Nginx, S3 등)가 제공해야 함

운영 환경에서 Django가 미디어를 직접 서빙하면:
✔ 성능 문제  
✔ 보안 문제  
✔ 비정상적인 구조가 생길 수 있습니다.

---
`7)` ai 앱에 urls.py 파일 만들기
`ai/urls.py`
```python
from django.urls import path
from . import views

urlpatterns = [
    # /api/predict/catdog/
    path("predict/catdog/", views.CatDogPredictAPIView.as_view(), name="predict-catdog"),
    path("page/catdog/", views.catdog_page, name="catdog-page"),
]
```

`8)` `ai/views.py`
```python
# =========================
# DRF 관련 import
# =========================
from rest_framework.views import APIView
# APIView: DRF의 가장 기본 클래스 기반 API 뷰
# - get/post/put/delete 같은 메서드를 직접 정의해서 처리

from rest_framework.response import Response
# Response: DRF의 응답 객체
# - dict를 넣으면 JSON으로 자동 변환해줌

from rest_framework.parsers import MultiPartParser, FormParser
# MultiPartParser: 파일 업로드(multipart/form-data) 요청을 파싱
# FormParser: 일반 폼 데이터(application/x-www-form-urlencoded) 파싱

# =========================
# AI 모델 관련 import
# =========================
from transformers import pipeline
# HuggingFace pipeline: 모델 로딩 + 추론을 쉽게 해주는 헬퍼

from PIL import Image
# PIL.Image: 업로드된 파일을 이미지로 열어서 모델에 넣기 위해 사용

# =========================
# Serializer import
# =========================
from .serializers import CatDogPredictSerializer
# CatDogPredictSerializer:
# - request.data에 image가 있는지 검증
# - 파일 타입/필수 여부 등을 확인하는 역할

# =========================
# Django (템플릿 렌더링 및 파일 저장) import
# =========================
from django.shortcuts import render
# render: HTML 템플릿을 렌더링해서 브라우저에 반환

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
# default_storage: Django의 파일 저장소(로컬, S3 등으로 바뀔 수 있음)
# ContentFile: 메모리의 바이트 데이터를 파일처럼 저장할 때 사용


# ==================================================
# 모델 로딩 (전역에서 1번만)
# ==================================================
MODEL_ID = "DunnBC22/vit-base-patch16-224-in21k_dog_vs_cat_image_classification"

# pipeline은 무겁기 때문에 보통 전역에서 1회 로딩해둠
# (요청마다 로딩하면 엄청 느려짐)
classifier = pipeline("image-classification", model=MODEL_ID)


# ==================================================
# 1) DRF API 엔드포인트: /api/... 로 호출되는 JSON API
# ==================================================
class CatDogPredictAPIView(APIView):
    # 파일 업로드 요청을 받기 위한 파서 설정
    parser_classes = (MultiPartParser, FormParser)

    # 이 뷰에서 사용할 serializer 지정
    serializer_class = CatDogPredictSerializer

    def post(self, request):
        # == DRF의 APIView에서는 특별한 의미를 가진 메서드 이름 ==
        # - HTTP GET 요청 → get() 호출   
		# - HTTP POST 요청 → post() 호출 
		# - HTTP PUT 요청 → put() 호출  
		# - HTTP DELETE 요청 → delete() 호출
		# 즉 post함수명은 POST 요청이 들어왔을 때 실행되는 약속된 메서드입니다.    
    
        # 1) 요청 데이터 검증
        # request.data에는 form-data로 들어온 값 + 파일이 함께 들어옴
        serializer = self.serializer_class(data=request.data)
        
        # 유효성 검사 실패 시 400 에러로 자동 응답 (에러 메시지 포함)
        serializer.is_valid(raise_exception=True)

        # 검증된 데이터에서 image 파일 꺼내기
        image_file = serializer.validated_data["image"]

        # 2) 이미지 파일 열기 (PIL로 열어서 RGB로 변환)
        # 이미지가 아니면 예외 발생할 수 있음
        try:
            img = Image.open(image_file).convert("RGB")
        except Exception:
            return Response({"error": "올바른 이미지 파일이 아닙니다."}, status=400)

        # 3) 모델 추론 실행
        # result는 예를 들어:
        # [{"label": "dog", "score": 0.98}, {"label":"cat", "score":0.02}] 형태
        result = classifier(img)

        # 4) top1만 따로 뽑기(가장 높은 확률 결과)
        top1 = result[0] if result else None

        # 5) JSON 응답 반환
        return Response({
            "model_id": MODEL_ID,
            "top1": top1,
            "all": result,
        })


# ==================================================
# 2) Django 템플릿 기반 페이지: 브라우저에서 업로드 폼 + 결과 HTML 렌더링
# ==================================================
def catdog_page(request):
    """
    HTML 페이지: 업로드 → 같은 서버에서 바로 분류 → 결과 렌더
    """
    # 템플릿에 전달할 변수들 초기화
    result = None
    error = None
    preview_url = None

    # 폼 제출(POST)일 때만 처리
    if request.method == "POST":
        # 파일이 없으면 에러 처리
        if "image" not in request.FILES:
            error = "image 파일이 필요합니다."
        else:
            image_file = request.FILES["image"]

            # (선택) 업로드 이미지 미리보기용으로 임시 저장
            # - 템플릿에서 preview_url로 <img src="..."> 보여주기 목적
            try:
                saved_path = default_storage.save(
                    f"tmp/{image_file.name}",
                    ContentFile(image_file.read())
                )
                preview_url = default_storage.url(saved_path)

                # image_file.read()를 이미 해버리면 파일 포인터가 끝으로 가버림
                # 그래서 저장한 파일을 다시 열어서 PIL로 읽음
                with default_storage.open(saved_path, "rb") as f:
                    img = Image.open(f).convert("RGB")
            except Exception:
                error = "올바른 이미지 파일이 아닙니다."
                img = None

            # 이미지가 정상이라면 추론
            if img is not None:
                out = classifier(img)
                top1 = out[0] if out else None
                result = {"model_id": MODEL_ID, "top1": top1, "all": out}

    # 템플릿 렌더링 (HTML 응답)
    return render(request, "ai/catdog.html", {
        "result": result,
        "error": error,
        "preview_url": preview_url,
    })
```
---
우리는 Django에서 CRUD를 쉽게 구현하기 위해 GenericView를 상속받아 사용하는 것을 배웠습니다. 그러나 DRF는 함수 기반/클래스 기반 등 여러 형태가 있지만, 실무에서 주로 APIView / GenericAPIView 계열 / ViewSet 계열 3가지 축으로 선택합니다.

- APIView: HTTP 메서드(get/post/put/delete)를 내가 직접 구현
- 제너릭뷰(GenericAPIView + Mixins): CRUD 패턴(목록/생성/상세/수정/삭제)을 이미 만들어둔 레고를 조합
- ViewSet/ModelViewSet: CRUD 전체 묶음을 더 자동화(라우팅까지 편함)

그러나 현재 우리가 작업하고 있는 코드는 CRUD 패턴이 아니라 커스텀 로직(모델추론)이 핵심이라서 직접 구현하는 APIView가 자연스럽습니다.

왜 이 코드는 APIView를 사용했나?
1. 요청이 파일 업로드(multipart)라 파서/검증 흐름을 직접 제어해야 합니다.
2. 비즈니스 로직이 DB CRUD가 아니라 추론 파이프라인입니다.
3. 응답도 모델 객체 serialize가 아니라 추론 결과 형태를 커스텀 JSON으로 만들고 싶음

---
`9)` 브라우저 화면에 파일 업로드 버튼 뜨게 만들기
`ai/serializers.py` 파일을 새로 생성해야 합니다. 
```python
from rest_framework import serializers
# DRF의 serializer 모듈 import
# Serializer는 입력 검증 + 데이터 변환 역할을 담당

class CatDogPredictSerializer(serializers.Serializer):
    # serializers.Serializer
    # → Django Form과 비슷한 역할
    # → 모델과 직접 연결되지 않은 "순수 입력 검증용 Serializer"

    image = serializers.ImageField(required=True)
    # ImageField:
    # - 업로드된 파일이 이미지인지 검사
    # - 파일이 없거나 이미지 형식이 아니면 에러 발생

    # required=True:
    # - 이 필드는 반드시 포함되어야 함
    # - 요청 데이터에 image가 없으면 validation 실패
```

Django만 사용할 때의 익숙한 구조
기존 Django에서는 보통 이렇게 사용했습니다.
- Form = 입력 검증 담당  
- View = 요청 처리 담당
즉,
- 사용자가 form 태그로 데이터 입력
- Django Form이 유효성 검사
- View가 저장 / 로직 처리로 역할이 비교적 분리되어 있습니다.

DRF로 오면 Form 대신 Serializer가 등장합니다.
DRF에서는 Form 개념이 거의 사라지고 Serializer가 그 역할을 흡수합니다.
Serializer는 단순히 JSON 변환기가 아니라
✔ 입력값 검증  
✔ 타입 검사  
✔ 데이터 정제  
✔ 모델 ↔ JSON 변환까지 전부 담당합니다.

DRF 구조를 쉽게 이해하기
- Serializer = API 전용 Form  
- APIView = Serializer를 사용하는 처리 담당 View
즉 View는 일을 하는 곳이고,  
Serializer는 들어오는 데이터가 정상인지 검사하는 문지기 역할을 담당한다고 생각하면 됩니다.

처리 흐름은 다음과 같습니다.
1️⃣ 클라이언트 → JSON 데이터 전송  
2️⃣ View → Serializer에게 검증 요청  
3️⃣ Serializer → 데이터 검사 / 정리  
4️⃣ View → 안전한 데이터만 사용

왜 views는 굳이 Serializer를 거치게 만들었을까?
DRF 세계에서는 서버가 HTML이 아니라 외부에서 날아오는 데이터(JSON)를 처리합니다.

이 데이터는:
- 타입이 틀릴 수도 있고
- 필수값이 없을 수도 있고
- 악의적일 수도 있음
    
그래서 View가 직접 믿지 않고:
✔ Serializer에게 검증 위임  
✔ validated_data만 사용하는 구조가 됩니다.

Django Form과 Serializer의 가장 큰 차이
- Django Form → HTML 폼 처리 중심  
- Serializer → API / JSON 처리 중심

즉 정리하면 
Serializer는 API에서 사용하는 Form이고,  
View는 Serializer가 검증한 데이터만 사용합니다.

---
`10)` migrate 실행 (세션 테이블 생성)
```bash
python manage.py migrate
```

`11)` 서버 실행 후 URL 테스트
```bash
python manage.py runserver
```
- `http://127.0.0.1:8000/api/predict/catdog/`

![[Pasted image 20260203165157.png]]
###### `ai/` (DRF 앱)의 핵심 파일 분석
|파일|역할|
|---|---|
|`models.py`|DB 구조|
|`serializers.py`|모델 ↔ JSON 변환|
|`views.py`|API 로직|
|`urls.py`|API 엔드포인트|
|`tests.py`|API 테스트|

insomnia에서 테스트![[Pasted image 20260217113254.png]]

결과
POST: `127.0.0.1:8000/api/predict/catdog/`
![[Pasted image 20260217114021.png]]
API를 통해 Json으로 정확히 전달되고 있습니다.

GET: `127.0.0.1:8000/api/predict/catdog/jobs/13/`
![[Pasted image 20260217114117.png]]
API를 통해 Json으로 정확히 받은것도 확인되고 있습니다.

---
탬플릿을 위한 디렉토리 구조
```
ai/
├─ __init__.py
├─ admin.py
├─ apps.py
├─ models.py
├─ serializers.py
├─ views.py
├─ urls.py
├─ tests.py
├─ migrations/
│   └─ __init__.py
│
├─ templates/
│   ├─ base.html
│   └─ ai/
│       └─ catdog.html
│
└─ static/
    └─ ai/
        └─ css/
            └─ catdog.css
```

폴더 만들기
```bash
mkdir -p ai/templates/ai
mkdir -p ai/static/ai/css
```

ai/templates/base.html
```html
{% load static %}
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>{% block title %}My Site{% endblock %}</title>
  <link rel="stylesheet" href="{% static 'css/base.css' %}">
  {% block css %}{% endblock %}
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>

```

ai/templates/ai/catdog.html
```html
{% extends "base.html" %}
{% load static %}

{% block title %}Cat vs Dog 분류{% endblock %}

{% block css %}
  <link rel="stylesheet" href="{% static 'ai/css/catdog.css' %}">
{% endblock %}

{% block content %}
  <main class="container">
    <header class="header">
      <h1>🐶🐱 Cat vs Dog 이미지 분류</h1>
      <p class="sub">이미지를 업로드하면 AI가 고양이/강아지를 예측합니다.</p>
    </header>

    <section class="card">
      <form method="post" enctype="multipart/form-data" class="form">
        {% csrf_token %}

        <label class="file-label">
          <span class="label-title">이미지 선택</span>
          <input type="file" name="image" accept="image/*" required>
        </label>

        <button type="submit" class="btn">분석하기</button>
      </form>
    </section>

    {% if result %}
      <section class="card result">
        <h2>결과</h2>

        <div class="grid">
          <div class="box">
            <h3>Top1</h3>
            <p class="big">{{ result.top1.label }}</p>
            <p class="muted">score: {{ result.top1.score|floatformat:6 }}</p>
          </div>

          <div class="box">
            <h3>전체 확률</h3>
            <ul class="list">
              {% for item in result.all %}
                <li>
                  <span class="tag">{{ item.label }}</span>
                  <span class="score">{{ item.score|floatformat:6 }}</span>
                </li>
              {% endfor %}
            </ul>
          </div>
        </div>

        {% if preview_url %}
          <div class="preview">
            <h3>업로드 이미지</h3>
            <img src="{{ preview_url }}" alt="preview">
          </div>
        {% endif %}
      </section>
    {% endif %}

    {% if error %}
      <section class="card error">
        <h2>에러</h2>
        <p>{{ error }}</p>
      </section>
    {% endif %}
  </main>
{% endblock %}
```

`ai/static/ai/css/catdog.css`
```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: #0b1220;
  color: #e8eefc;
}

.container {
  max-width: 860px;
  margin: 48px auto;
  padding: 0 16px;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 32px;
}
.sub {
  margin: 0 0 24px;
  color: rgba(232,238,252,0.75);
}

.card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
}

.form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.file-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 240px;
}

.label-title {
  font-size: 14px;
  color: rgba(232,238,252,0.80);
}

input[type="file"] {
  padding: 10px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  color: rgba(232,238,252,0.90);
}

.btn {
  padding: 12px 16px;
  border: 0;
  border-radius: 12px;
  background: #4f7cff;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
.btn:hover { opacity: 0.92; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
}

.box {
  padding: 14px;
  border-radius: 14px;
  background: rgba(0,0,0,0.20);
  border: 1px solid rgba(255,255,255,0.08);
}

.big {
  font-size: 32px;
  margin: 10px 0 2px;
}

.muted {
  margin: 0;
  color: rgba(232,238,252,0.70);
  font-size: 14px;
}

.list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}
.list li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.list li:first-child { border-top: 0; }

.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(79,124,255,0.20);
  border: 1px solid rgba(79,124,255,0.40);
}

.score {
  font-variant-numeric: tabular-nums;
}

.preview {
  margin-top: 14px;
}
.preview img {
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.25);
}

.error {
  border-color: rgba(255, 90, 90, 0.4);
}
```


결과확인 주소:
```
http://127.0.0.1:8000/catdog/page/catdog/
```
