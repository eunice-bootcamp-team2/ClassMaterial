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


