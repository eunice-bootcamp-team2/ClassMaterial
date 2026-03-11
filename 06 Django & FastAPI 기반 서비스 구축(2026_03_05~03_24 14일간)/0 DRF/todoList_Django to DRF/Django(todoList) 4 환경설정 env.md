환경변수를 읽기 위해서 `django-environ` 라이브러리 추가

|구분|3번|4번|
|---|---|---|
|SECRET_KEY|settings.py에 직접 작성|.env로 분리|
|환경변수 라이브러리|없음|django-environ 추가|
|환경변수 읽기|없음|`read_env()` 추가|
|보안|낮음|높음|

---
`환경변수 설정`
``` bash
# 새로운 bash 열어서 가상환경 활성화
source .venv/bin/activate

# django-environ 설치하기
uv pip install django-environ
```

`settings.py`
```python
import os, environ # 환경변수 추가

# 가장 윗줄에 있어야 에러가 안남
BASE_DIR = Path(__file__).resolve().parent.parent

# 보안 향상, 코드 재사용, 환경 구분 가능
env = environ.Env(
	DEBUG=(bool, False)
)

# 환경변수
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY를 .env로 이동하여 보호
SECRET_KEY = env("DJANGO_SECRET_KEY")
```

`.env 파일을 manage.py경로에 생성`
```python
DJANGO_SECRET_KEY=your-very-secret-key-here
```


