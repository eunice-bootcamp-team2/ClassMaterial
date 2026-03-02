WSGI란?
파이썬 웹 애플리케이션과 웹 서버를 연결해주는 일종의 규칙이에요.  
쉽게 말해, 웹 서버(예: Nginx, Apache)는 직접 파이썬 코드를 실행할 수 없기 때문에, 
그 사이에서 요청과 응답을 전달해주는 "중간 통역자"가 필요합니다.  
이때 등장하는 게 바로 WSGI입니다.

Django 프로젝트의 `wsgi.py` 파일은:
> 웹 서버(Apache, Nginx, Gunicorn 등)가 Django 애플리케이션을 실행할 수 있도록 연결해주는 진입점(entry point) 입니다.

즉, Django 앱을 외부에서 실행하기 위한 문이다라고 보면 됍니다.

Django는  `wsgi.py`가 자동으로 생성되어 있습니다. 이유는?
- Django는 전통적인 WSGI 기반 프레임워크예요.
- 그래서 `django-admin startproject`로 프로젝트를 만들면 `wsgi.py`를 자동으로 만들어줘요.
- Django는 기본적으로 WSGI 서버(Gunicorn, uWSGI 등)와 잘 연동되도록 설계되어 있어요.

그러나 FastAPI에는 `wsgi.py`를 생성해 줘야 합니다.
- FastAPI는 비동기 웹 프레임워크예요.
- 그래서 WSGI보다 더 현대적인 ASGI(Asynchronous Server Gateway Interface)를 기본으로 사용해요.
- 따라서 FastAPI는 `asgi.py` 구조로 작동하며, Uvicorn, Hypercorn 같은 ASGI 서버와 함께 사용돼요.

###### 그럼 WSGI와 ASGI, 어떤 게 더 좋을까?
| 비교      | WSGI               | ASGI                               |
| ------- | ------------------ | ---------------------------------- |
| 요청 처리   | 동기 (한 번에 하나씩)      | 비동기 (동시에 여러 작업)                    |
| 서버 예    | Gunicorn, uWSGI    | Uvicorn, Daphne                    |
| 프레임워크 예 | Django (기본 WSGI)   | FastAPI, Django Channels (ASGI 확장) |
| 특징      | 안정적, 전통적인          | 더 빠르고 비동기 작업에 강함                   |
| 호환성     | 오래되어 다양한 서비스에서 안정적 | 최신 웹/모바일 API에 최적화                  |

- Django는 `wsgi.py`를 자동으로 만들고, 기본적으로 WSGI 방식으로 작동해요.
- FastAPI는 `main.py` 자체가 ASGI 앱이기 때문에 별도 `wsgi.py`가 없어요.
    - 필요하다면 `asgi.py`처럼 만들 수 있지만 일반적으로는 `main.py` 자체를 Uvicorn으로 실행합니다. 
    - 그래서 별도로 wsgi.py나 asgi.py를 만들 필요는 없습니다.

그럼 언제 `asgi.py` 같은 걸 따로 만들까?
✔ 이런 경우에 만듭니다:
1. 대형 프로젝트에서 앱 구조를 나눌 때
    - 예: `app/`, `api/`, `config/` 디렉터리 구조로 나누고, `asgi.py`에서 전체 앱을 조립
2. Gunicorn이나 다른 배포 서버에서 FastAPI 앱을 `import`해서 실행하려고 할 때
    - 예: `gunicorn -k uvicorn.workers.UvicornWorker project.asgi:app`
3. 웹소켓, 백그라운드 작업, 실시간 이벤트를 다룰 때
    - 이건 ASGI의 비동기 기능이 필요한 상황이죠

예시 디렉터리 구조
```css
myproject/
│
├── app/
│   ├── __init__.py         # 패키지로 인식시키는 파일
│   ├── main.py             # FastAPI 앱 생성 및 라우터 연결
│   └── api.py              # 실제 라우터 정의
│
├── asgi.py                 # 배포용 또는 Uvicorn 실행 진입점
└── manage.py                  # 개발 시 직접 실행 진입점
```

`asgi.py` 실습:
```python
from app.main import create_app

# FastAPI 앱 인스턴스를 가져옵니다.
app = create_app()

# 이 파일은 Gunicorn 또는 Uvicorn에서 모듈 경로로 실행할 때 사용됩니다.
# 예: uvicorn asgi:app 또는 gunicorn asgi:app -k uvicorn.workers.UvicornWorker
```

`manage.py` 예시 : 직접 실행 가능한 개발용 진입점
```python
import uvicorn
from app.main import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("manage:app", host="127.0.0.1", port=8000, reload=True)
```

`app/main.py` 예시
```python
from fastapi import FastAPI
from app.api import router as api_router

def create_app() -> FastAPI:
    app = FastAPI(title="My FastAPI App")
    app.include_router(api_router)
    return app
```

`app/api.py`
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Hello from API"}
```

실행 방법
```bash
# 개발용 실행
python manage.py

# ASGI 서버
uvicorn asgi:app --reload
```
`asgi.py` 안의 `app` 객체를 찾아 실행하라는 뜻입니다.

이런 상황일 때 유용해요
1. 실무 또는 협업용 프로젝트일 때
    - 기능이 늘어나도 `main.py`, `api.py`, `routers/`, `services/`처럼 분리해서 관리 가능
        
2. 대형 서비스나 실시간 연동이 필요할 때
    - WebSocket, background tasks, cron 작업 등 여러 컴포넌트를 통합할 수 있음
        
3. Uvicorn + Gunicorn, Docker, Cloud 등으로 배포할 때
    - `asgi.py` 또는 `wsgi.py`를 통해 서버와 연결점을 명확히 해야 배포 툴에서 잘 인식됨
        
4. 테스트/로깅/환경변수 등 확장 기능 추가 시
    - 앱 생성 로직을 `create_app()` 함수로 분리하면 테스트 프레임워크에서도 불러오기 편해짐