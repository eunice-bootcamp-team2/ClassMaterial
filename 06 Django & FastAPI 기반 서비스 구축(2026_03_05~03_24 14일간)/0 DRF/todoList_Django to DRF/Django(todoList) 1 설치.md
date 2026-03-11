
✅ 1단계: 프로젝트 디렉터리로 이동: `mysite/`는 `startproject` 명령으로 생성한 프로젝트 루트입니다.
```bash
cd ~ 
deactivate

# 디렉터리 생성
mkdir DRF_todoList_26221

# 해당 디렉터리로 이동
cd DRF_todoList_26221
code -r .

# 가상환경 설정
uv venv
source .venv/bin/activate

# 패키지 설치
uv pip install django
uv pip install djangorestframework

# ----------------------------------------
# ✅ pre-commit + 코드 정리 도구 설치
# ----------------------------------------
uv pip install ruff black pre-commit
```

`.gitignore 파일 생성`
```bash
touch .gitignore
```

`.gitignore`
```python
# Python 기본 캐시 및 가상환경 파일 제외
venv/
env/
__pycache__/
*.pyc
*.pyo
*.pyd

# 환경 변수 파일 (보안 중요)
.env
# 개발중에만 사용

# 데이터베이스 파일 제외 (SQLite 등)
db.sqlite3
*.sqlite3

# Django 마이그레이션 캐시 제외
**/migrations/*.pyc
!**/migrations/__init__.py

# 로그 파일 제외
*.log
*.out
*.err

# 미디어 및 정적 파일 (수동 업로드 방지)
# media/
# staticfiles/
# static/
node_modules/

# VS Code 및 IDE 설정 파일 제외
.vscode/
.idea/
*.sublime-workspace

# Docker 관련 파일 제외 (사용할 경우)
docker-compose.override.yml
```

---
### 이 코드(.pre-commit-config.yaml)는 왜 쓰는가?
	- 커밋하기 전에 코드 자동 검사 + 자동 정리를 하기 위해서작성되는 코드
	- 내가 실수해도 Git이 막아주고, 자동으로 코드 정리까지 해줌
	- 자동 코드 정리 + 🚨 자동 오류 검사를 켜놓는 설정 파일

언제 실행되는가?
```bash
git commt #할때 실행됩니다.
```

아래 코드는 Python + Django 실무에서 가장 많이 쓰는 기본 세팅으로

| 도구               | 공식 저장소      |
| ---------------- | ----------- |
| pre-commit-hooks | GitHub 공식   |
| black            | psf(파이썬 재단) |
| isort            | pycqa       |
| flake8           | pycqa       |
안에 있는 도구들은 전부 공식 오픈소스입니다.

`.pre-commit-config.yaml 파일 생성`
```bash
touch .pre-commit-config.yaml
```

`DRF_todoList_26221/.pre-commit-config.yaml` 파일 생성
```yml
repos:
  # 기본 정리 훅 (이건 유지해도 좋음)
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  # Ruff (flake8 + isort 대체, 자동 수정 가능)
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]

  # Black (코드 포맷터)
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        language_version: python3
```

전체 파일 추가 + 첫 커밋 + 레포 연결
```bash
git add .
git commit -m "Initial Django + DRF + pre-commit setup"
git branch -M main  
```

`pre-commit 설치`
```bash
pre-commit install
pre-commit run -a
```


깃허브에서 레파지토리를 생성한 후
```bash
# 자신의 주소로 변경하여 사용
git remote add origin https://github.com/your-id/....git

git remote add origin https://github.com/eunice-bootcamp-team2/TodoList_26221.git
git push -u origin main
```

---
✅ 2단계: 프로젝트 생성 & 앱 생성
```bash
# Django 프로젝트 생성 (주의: . 을 붙이면 현재 폴더에 생성됨)
django-admin startproject mysite .

# 앱 생성 (예: 할 일 관리용 앱 todo)
python manage.py startapp todo
```

```bash
uv pip freeze > requirements.txt
```

---
✅ 생성 후 구조
```python
DRF_todoList_26221/
├── mysite/             # ← settings.py 있는 메인 프로젝트
├── todo/               # ← 새로 만든 앱
├── manage.py
├── .venv/
└── requirements.txt
```
---
✅ 용어 설명

| 용어            | 뜻                                               |
| ------------- | ----------------------------------------------- |
| 라우팅 (Routing) | 사용자가 웹 주소에 접근했을 때, 어떤 함수(또는 화면)가 실행될지 길을 지정하는 것 |
| `path()`      | 특정 URL 주소에 대해 실행할 내용을 설정하는 Django의 함수           |
| `include()`   | 다른 앱(`todo`)의 URL들을 불러와서 현재 URL에 붙이는 역할         |
| `urlpatterns` | 주소와 실행할 기능들을 모아둔 URL 목록                         |

---
`mysite/settings.py`
```python
INSTALLED_APPS = [
    "todo",
    "rest_framework",
]
```

`todo > models.py`
``` python
from django.db import models

class Todo(models.Model):
	name = models.CharField(max_length=100)
	description = models.TextField(blank=True)
	complete = models.BooleanField(default=False)
	exp = models.PositiveIntegerField(default=0)
	completed_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return self.name
```

`DB테이블 생성`
```bash
python manage.py makemigrations
python manage.py migrate
```

`관리자생성`
```bash
python manage.py createsuperuser
```

실행하여 구동확인
```bash
python manage.py runserver
```

---
✅ 라우팅(Routing) 
`mysite > urls.py`
```python
from django.contrib import admin 
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
	path('admin/', admin.site.urls),
	path("todo/", include("todo.urls")), 
]
```

---
`todo > urls.py`
```python
from django.urls import path
from . import views

app_name ="todo"

urlpatterns = [
	path("list/", views.todo_list, name="list"), # 첫 테스트용
]
```
---
`todo > views.py` 테스트용
```python
from django.shortcuts import render
from .models import Todo
from django.views import View 
from django.views.generic import ListView


def todo_list(request): #  함수형
    todos = Todo.objects.all()
    return render(request, "todo/todo.html", {"todos": todos})	
```

`mysite/settings.py`
```python
import os

TEMPLATES = [
	"DIRS": [os.path.join(BASE_DIR, "templates")], # 앱 밖의 공통 탬플릿 설정
]

STATICFILES_DIRS = [
  BASE_DIR / "static",
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
```

폴더생성 명령
```bash
mkdir -p templates/todo 
```

`templates > todo > todo.html`
```html
<h1>확인용</h1>
```

```bash
python manage.py runserver
```

`mysite > urls.py`
```python
	path("", lambda request: redirect("todo:list")), # 첫페이지가 무조건 보이게하기
```

외부 프레임워크 접속
![[Pasted image 20260221115509.png]]

---
둘중에 한개를 선택하여 만듦니다.
`todo/admin.py`
```python
from django.contrib import admin
from .models import Todo

admin.site.register(Todo)
```
✔ 가장 기본 등록 방식  
✔ Admin 옵션 커스터마이징 없음  
✔ 그냥 기본 관리자 화면으로 등록됨
✔ 일단 admin에 보이게만 하고 싶을 때 사용


`todo > admin.py`
``` python
from django.contrib import admin
from .models import Todo

admin.site.register(Todo) # 둘중 택1

# @admin.register(Todo) + 클래스 방식
@admin.register(Todo) # 둘중 택1 둘다 있으면 오류가 발생합니다.
class TodoAdmin(admin.ModelAdmin):
	list_display = (
		"__str__",
		"created_at",
		"updated_at",
	)
```
✔ 데코레이터 방식 등록  
✔ 관리자 옵션 커스터마이징 가능  
✔ `list_display`, `search_fields`, `list_filter` 등 설정 가능
👉 관리자 화면을 커스터마이징할 때 사용
같은 모델을 두 번 등록하게 되어 오류 발생 🚨

---
차후 CSS를 위해 미리 폴더를 만들어 둡니다.
```bash
mkdir -p static/todo
```

`templates > todo > todo.html`
```html	 
{% for todo in todos %}
  <p>{{ todo.name }}</p>
  <p>{{ todo.description }}</p> 
  <p>{{ todo.complete }}</p>
  <p>{{ todo.created_at }}</p>
  <p>-------------------------------------------------------------------------</p>

  {% if todo.description %}
    <p>{{ todo.description }}</p>
  {% else %}
    No description
  {% endif %}
    <p>{{ todo.complete }}</p>
    <p>{{ todo.created_at }}</p>
{% endfor %}
```

관리자 페이지로 접속하여 데이터 두개정도를 입력합니다.

그리고 shell에서도 테스트로 데이터를 입력합니다
```bash
python manage.py shell
```

```bash
>>> 
from todo.models import Todo

Todo.objects.create(  
name="운동",  
description="스쿼트 50회",  
complete=False,  
exp=10  
)

Todo.objects.all()
Todo.objects.count()

exit() # shell에서 나가기
```

`README.md`
``` README.md
# 🚀 todoList_Django_to_DRF  
  
이 프로젝트는 Django 기반 Todo 애플리케이션을 시작으로    
Django REST Framework, JWT 인증, PostgreSQL 전환,    
AI 모델 연동(Hugging Face), Redis/Celery 비동기 처리까지    
단계적으로 확장하는 풀스택 학습 프로젝트입니다.  
  
---  
  
## 📌 프로젝트 목표  
  
- Django MVT 구조 이해  
- DRF 기반 API 설계  
- 인증(JWT) 시스템 구축  
- 데이터베이스 전환(SQLite → PostgreSQL)  
- 외부 데이터 수집 및 적재  
- AI 모델 연동  
- Redis/Celery 기반 비동기 처리  
- 실무형 프로젝트 구조 설계  
  
---  
  
## 🧭 전체 개발 로드맵  
  
### 1️⃣ Django 기본 세팅  
- 가상환경 설정 (uv)  
- pre-commit 설정 (black, isort, flake8)  
- Todo CRUD 구현  
  
### 2️⃣ Generic View 기반 CRUD  
- CBV 기반 구조 설계  
- Django Template 렌더링  
  
### 3️⃣ DRF ViewSets로 API 전환  
- Serializer 설계  
- API 응답 구조 설계  
  
### 4️⃣ 환경 변수 설정 (.env)  
  
### 5️⃣ Pagination 추가  
  
### 6️⃣ 이미지 업로드 기능 추가  
  
### 7️⃣ 회원가입 / 로그인 기능 구현  
  
### 8️⃣ 템플릿 구조 정리  
  
### 9️⃣ JWT 인증 도입  
  
### 🔟 인터랙티브 기능 추가 (Ajax / Axios)  
  
### 1️⃣1️⃣ CSS 및 UI 정리  
  
### 1️⃣2️⃣ 다른 사용자 글 조회 기능  
  
### 1️⃣3️⃣ SQLite → PostgreSQL 전환  
  
### 1️⃣4️⃣ 웹 크롤링 → CSV / JSONL 데이터 정제  
  
### 1️⃣5️⃣ DBeaver → DRF 데이터 적재  
  
### 1️⃣6️⃣ DRF에 Hugging Face 모델 연동  
  
### 1️⃣8️⃣ Redis + Celery 비동기 처리 및 캐시 적용  
  
---  
  
## 🛠 사용 기술  
  
### Backend  
- Python  
- Django  
- Django REST Framework  
- Django ORM  
- JWT (SimpleJWT)  
  
### Database  
- SQLite3 (개발 초기)  
- PostgreSQL (확장 단계)  
  
### AI / Data  
- Hugging Face  
- Pandas  
- CSV / JSONL 데이터 처리  
  
### Async / Cache  
- Redis  
- Celery  
  
### Frontend  
- Django Template  
- HTML5 / CSS3  
- JavaScript  
- Axios  
  
### DevOps  
- Git / GitHub  
- pre-commit  
- Docker (예정)  
- AWS EC2 (예정)  
  
---  
  
## 📂 프로젝트 구조  

DRF_todoList_26221/  
├── mysite/ # Django 프로젝트 설정  
├── todo/ # Todo 앱  
├── templates/  
├── static/  
├── manage.py  
├── requirements.txt  
└── .pre-commit-config.yaml

  
---  
  
## ⚙ 실행 방법  
  
```bash  
uv venv  
source .venv/bin/activate  
uv pip install -r requirements.txt  
  
python manage.py migrate  
python manage.py runserver

---

## 📈 확장 방향

- REST API 기반 프론트엔드 분리  
- Docker 기반 배포 
- CI/CD 구성 
- AI 추천 기능 확장  
- 모니터링 시스템(Prometheus/Grafana)
    

---

## 🎯 프로젝트 성격

이 프로젝트는 단순 Todo 앱이 아닌  
"실무 확장형 Django → DRF → AI → 비동기 구조 학습 프로젝트"입니다.
```

---
마무리 깃허브에 업로드
```
- feat: 새로운 기능을 추가했을 때 사용하는 커밋 타입
- fix: 버그를 수정했을 때 사용하는 커밋 타입
- docs: README나 주석 등 문서를 수정했을 때 사용하는 커밋 타입 
- test: 테스트 코드를 추가하거나 수정했을 때 사용하는 커밋 타입  
- refactor: 기능 변화 없이 코드 구조를 개선했을 때 사용하는 커밋 타입  
- style: 공백, 코드 포맷, 세미콜론 등 스타일 관련 수정일 때 사용하는 커밋 타입 
- chore: 설정 변경, 패키지 설치 등 기능과 직접적인 관련이 없는 작업일 때 사용하는 커밋 타입
  
기능 추가 → feat  
버그 수정 → fix  
테스트 추가 → test  
문서 수정 → docs  
설정 변경 → chore
```

설치 환경 설정이므로 chore를 적용하여 커밋합니다.
```bash
pre-commit run -a
git add .
git commit -m "chore: update project configuration"
git push origin main
```