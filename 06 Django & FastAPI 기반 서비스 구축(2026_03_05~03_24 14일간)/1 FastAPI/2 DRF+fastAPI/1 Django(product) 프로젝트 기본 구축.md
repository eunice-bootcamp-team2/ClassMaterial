프로젝트 폴더 생성 및 해당폴더로 이동
```bash
cd ~
mkdir product-review-service
cd product-review-service
code -r .
```
프로젝트 기본 구조를 만듭니다.
```bash
mkdir backend  
mkdir ai-server  

cd ~/product-review-service/backend 
uv venv
source .venv/bin/activate

# new bash 열어서 작업하기
cd ~/product-review-service/ai-server
uv venv
source .venv/bin/activate
```
bash
```
product-review-service
├── backend
└── ai-server
```
Django + DRF 설치
```bash
uv pip install django  
uv pip install djangorestframework  
uv pip install psycopg2-binary  
uv pip install pillow  
uv pip install python-dotenv
uv pip install django-environ
```
JWT 인증
```bash
uv pip install djangorestframework-simplejwt
```
Celery
```bash
uv pip install celery  
uv pip install redis
```
HTTP 요청 (FastAPI 호출용)
```bash
uv pip install requests
```
requirements.txt 생성
```bash
uv pip freeze > requirements.txt
```

---
Django 프로젝트 생성
backend 폴더로 이동합니다.
```bash
cd backend
django-admin startproject mysite .
mkdir apps  
cd apps
python ../manage.py startapp accounts  
python ../manage.py startapp products  
python ../manage.py startapp reviews  
python ../manage.py startapp interactions  
python ../manage.py startapp ai_gateway
```
구조
```
backend
├── manage.py
└── mysite
    ├── __init__.py
    ├── settings.py
    ├── urls.py
    ├── asgi.py
    └── wsgi.py
├── apps
│   ├── accounts
│   ├── products
│   ├── reviews
│   ├── interactions
│   └── ai_gateway
```

settings.py 앱 등록
`mysite/settings.py`
```python
INSTALLED_APPS = [
    # DRF
    'rest_framework',

    # apps
    'apps.accounts',
    'apps.products',
    'apps.reviews',
    'apps.interactions',
    'apps.ai_gateway',
]
```

Custom User 모델 준비
`accounts/models.py`
```python
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    created_at = models.DateTimeField(auto_now_add=True)
```

`mysite/settings.py`
```python
AUTH_USER_MODEL = "accounts.User"

# 이미지 업로드 파일 접근 경로  
MEDIA_URL = "/media/"   
# 실제 업로드 파일 저장 폴더  
MEDIA_ROOT = BASE_DIR / "media"

STATIC_URL = "/static/"  
STATICFILES_DIRS = [BASE_DIR / "static"]
```

폴더 위치 확인후 이동합니다. 
```bash
ls
cd ..

# 이렇게 보여야 합니다.
manage.py  
mysite  
apps
```

### Django 앱 등록(App Registration) 및 AppConfig 경로 설정

Django에서는 `settings.py`의 `INSTALLED_APPS`에 등록된 앱 경로가 실제 프로젝트의 폴더 구조와 정확히 일치해야 합니다.  

특히 `apps/` 같은 하위 폴더에 앱을 생성한 경우, `apps.py`의 `name` 속성과 `INSTALLED_APPS`의 경로를 `apps.앱이름` 형태로 맞춰주어야 Django가 앱을 정상적으로 로드할 수 있습니다.  
이 과정은 Django가 앱을 인식하도록 설정하는 초기 앱 등록 과정입니다

`apps/accounts/apps.py`
```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
```

`apps/products/apps.py`
```python
from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products"
```

`apps/reviews/apps.py`
```python
from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reviews"
```

`apps/interactions/apps.py`
```python
from django.apps import AppConfig


class InteractionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.interactions"
```

`apps/ai_gateway/apps.py`
```python
from django.apps import AppConfig


class AiGatewayConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ai_gateway"
```

마이그레이션
```bash
python manage.py makemigrations  
python manage.py migrate
```

서버 실행
```bash
python manage.py runserver
```

---
pre-commit-config.yaml 작성
```yaml

```