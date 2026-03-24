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
    "rest_framework",

    # apps
    "apps.accounts",
    "apps.products",
    "apps.reviews",
    "apps.interactions",
    "apps.ai_gateway",
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
1단계 (초기 프로젝트) : 자동 포맷, 공백 정리

설치
```bash
uv pip install pre-commit
```

`requirements.txt`
```
uv pip freeze > requirements.txt
```
---
지금은 레포 1개로 시작하는게 이상적입니다.
```
product-review-service/
├── .git/
├── .gitignore
├── .pre-commit-config.yaml      ← 루트용(중계 역할)
├── backend/
│   ├── .pre-commit-config.yaml  ← Django 전용
│   └── ...
└── ai-server/
    ├── .pre-commit-config.yaml  ← FastAPI 전용
    └── ...
```
하나의 GitHub repo로 관리하는것이 좋습니다.

실무 기준 판단 공식
✔ 레포 1개 (Monorepo) 쓰는 경우
- 같은 서비스다
- 같이 배포된다
- 서로 강하게 의존한다
- 팀이 작다 (너 + 팀 프로젝트)

✔ 레포 2개 (Multi-repo) 쓰는 경우
- 완전히 독립 서비스
- 배포도 따로
- 팀도 따로
- API 계약만 공유

예:
- AI 서버를 다른 회사에도 제공
- Django 없이도 돌아감

현재 구조
```
product-review-service (GitHub repo 1개)
├── backend/
│   ├── .pre-commit-config.yaml
│
├── ai-server/
│   ├── .pre-commit-config.yaml
```
pre-commit은 2개, repo는 1개

---
로컬 프로젝트 폴더에서 git 초기화
```bash
cd ~/product-review-service
ls # backend ai-server 이 파일들이 보이는 위치
git init
```

기본 브랜치명을 main으로 바꾸기
```bash
git branch -M main
```

`.gitignore` 만들기
`product-review-service/.gitignore`
```gitignore
# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd

# Virtual environments
backend/.venv/
ai-server/.venv/
.venv/

# Django
backend/db.sqlite3
backend/media/
backend/staticfiles/

# Environment
.env
*.env

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Test / cache
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Logs
*.log
```

`backend/.pre-commit-config.yaml` : `backend/` 만 검사하도록 제한함
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        files: ^backend/.*\.py$

  - repo: https://github.com/PyCQA/isort
    rev: 5.13.2
    hooks:
      - id: isort
        files: ^backend/.*\.py$

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
        files: ^backend/
      - id: end-of-file-fixer
        files: ^backend/
      - id: check-yaml
        files: ^backend/.*\.(yml|yaml)$
      - id: check-added-large-files
```
---
`ai-server/.pre-commit-config.yaml`
```yml
repos:
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        files: ^ai-server/.*\.py$

  - repo: https://github.com/PyCQA/isort
    rev: 5.13.2
    hooks:
      - id: isort
        files: ^ai-server/.*\.py$

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
        files: ^ai-server/
      - id: end-of-file-fixer
        files: ^ai-server/
      - id: check-yaml
        files: ^ai-server/.*\.(yml|yaml)$
      - id: check-added-large-files
```

`product-review-service/.pre-commit-config.yaml`
```yml
repos:
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        files: ^(backend|ai-server)/.*\.py$

  - repo: https://github.com/PyCQA/isort
    rev: 5.13.2
    hooks:
      - id: isort
        files: ^(backend|ai-server)/.*\.py$

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
        files: ^(backend|ai-server)/
      - id: end-of-file-fixer
        files: ^(backend|ai-server)/
      - id: check-yaml
        files: ^(backend|ai-server)/.*\.(yml|yaml)$
      - id: check-added-large-files
```

- 커밋 대상 파일이 `backend/` 아래면  
    → `backend/.pre-commit-config.yaml` 기준으로 검사
- 커밋 대상 파일이 `ai-server/` 아래면  
    → `ai-server/.pre-commit-config.yaml` 기준으로 검사

즉, 루트 hook 1개가 두 하위 설정을 분기 호출하는 구조입니다.

pre-commit 설치
```bash
cd ~/product-review-service  
uv pip install pre-commit
```

github 레파지토리 생성후
```bash
git add .
git commit -m "chore: pre-commit 설정 및 코드 포맷 적용"
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```
