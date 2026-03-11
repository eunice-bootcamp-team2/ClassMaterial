- Django / DRF 서버  
    → 웹 서비스, 사용자 API, 데이터 관리
    
- FastAPI 서버  
    → AI 모델 추론 처리
    
즉 역할을 분리합니다.
```
DRF = 웹 서비스 서버  
FastAPI = AI 추론 서버
```

전체 서버 구조
실제 배포 구조는 보통 다음과 같습니다.
```
브라우저 (사용자)
      ↓
Nginx (웹 서버)
      ↓
DRF 서버                FastAPI 서버
(Gunicorn + WSGI)      (Uvicorn + ASGI)
      ↓                      ↓
Django / DRF           AI 모델 추론
```

###### 설명을 하면 다음과 같습니다.
| 구성       | 역할               |
| -------- | ---------------- |
| 브라우저     | 사용자 요청           |
| Nginx    | 요청을 받아 내부 서버로 전달 |
| Gunicorn | Django/DRF 서버 실행 |
| Uvicorn  | FastAPI 서버 실행    |
| WSGI     | Django 서버 실행 규칙  |
| ASGI     | FastAPI 서버 실행 규칙 |

---
### Nginx란?
Nginx는 웹 서버(Web Server)입니다.

웹 서버는 사용자의 요청(브라우저 요청)을 먼저 받아서 내부 애플리케이션 서버로 전달하는 역할을 합니다.

즉, Nginx는 사용자와 웹 애플리케이션 사이에서 요청을 전달해주는 중간 서버라고 이해하시면 됩니다.

### 왜 Nginx를 사용하는가?
Django나 FastAPI 서버를 직접 외부에 공개할 수도 있지만,  
보통은 Nginx를 앞단에 두고 요청을 전달하도록 구성합니다.

이유는 다음과 같습니다.
- 사용자 요청을 먼저 받아 처리할 수 있습니다.
- 정적 파일(css, js, 이미지)을 빠르게 제공할 수 있습니다.
- HTTPS(SSL) 처리를 할 수 있습니다.
- 여러 서버로 요청을 분산할 수 있습니다.
    
즉, Nginx는 사용자 요청을 관리하고 내부 서버로 전달하는 문지기 역할을 합니다.

Nginx 기본 설정 예시
Nginx는 설정 파일에서 요청을 어느 서버로 전달할지 지정할 수 있습니다.

예를 들어 Django 서버가 8000 포트에서 실행되고 있다면 다음과 같이 설정할 수 있습니다.
```
server {
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```
이 코드는 Nginx 설정 파일에 작성합니다.
보통 리눅스 서버에서는 아래 위치에 있습니다.
```
/etc/nginx/sites-available/default
```

이런 설정들은 추후 EC2 클라우드 서버 배포시 상세히 배웁니다.

---
### WSGI / ASGI 개념
웹 서버는 파이썬 코드를 직접 실행할 수 없습니다.

그래서 웹 서버와 파이썬 앱 사이의 연결 규칙이 필요합니다
이 규칙이 바로
```
WSGI  
ASGI
```
입니다.

|규칙|사용 프레임워크|
|---|---|
|WSGI|Django / DRF|
|ASGI|FastAPI|
연결구조
```
Gunicorn → WSGI → Django  
Uvicorn → ASGI → FastAPI
```

로컬서버실행이 아닌 실제 서버 실행 : 로컬서버실행은 :  `python manage.py runserver`
DRF서버
```bash
gunicorn myproject.wsgi:application
```
구조
```
Nginx
 ↓
Gunicorn
 ↓
WSGI
 ↓
Django / DRF
```

FastAPI 서버 : 로컬서버 실행은 :  `uvicorn main:app --reload`
```bash
gunicorn -k uvicorn.workers.UvicornWorker main:app
```
구조
```
Nginx
 ↓
Uvicorn
 ↓
ASGI
 ↓
FastAPI
```

### DRF와 FastAPI 연동
웹 서비스는 DRF에서 처리하고 AI 처리는 FastAPI로 요청을 보냅니다.
```
DRF 서버
   ↓
HTTP 요청
   ↓
FastAPI 서버
   ↓
AI 모델 추론
```
예시 코드
```python
# DRF에서 FastAPI 호출
import requests

response = requests.post(
    "http://fastapi-server:8001/predict",
    json={"text": "리뷰 내용"}
)

result = response.json()
```
즉,
```
DRF = 웹 서비스  
FastAPI = AI 서비스
```
역할을 분리합니다.

### Docker 배포 구조
Docker로 배포하면 구조는 다음과 같습니다.
```
브라우저  
   ↓  
Nginx  
   ↓  
Docker  
   ↓  
DRF 컨테이너 (Gunicorn)  
FastAPI 컨테이너 (Uvicorn)
```

예
```
container  
 ├─ nginx  
 ├─ drf-server  
 └─ fastapi-server
```

### 핵심 정리
###### 기억할 것은 이것 5개 뿐입니다.
| 개념       | 의미                   |
| -------- | -------------------- |
| Nginx    | 사용자 요청을 받아 내부 서버로 전달 |
| Gunicorn | Django / DRF 서버 실행   |
| Uvicorn  | FastAPI 서버 실행        |
| WSGI     | Django 실행 규칙         |
| ASGI     | FastAPI 실행 규칙        |

즉
```
DRF → Gunicorn → WSGI  
FastAPI → Uvicorn → ASGI
```
입니다.
