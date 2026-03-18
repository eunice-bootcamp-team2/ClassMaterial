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

실무에서는 보통 Nginx에서 여기까지 처리합니다.
- HTTPS 강제, HTTP → HTTPS 리다이렉트
- 보안 헤더 추가
- 요청 크기 제한
- 과도한 요청 제한(rate limiting)
- 특정 경로 차단
- 정적 파일 접근 정책
- 프록시 서버 정보 숨김 일부 처리

예를 들면 Nginx에서는 이런 식의 설정을 많이 둡니다.
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # 업로드 크기 제한
    client_max_body_size 10M;

    # 보안 헤더
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # HTTPS 강제 사용
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CSP는 서비스에 맞게 조심해서 설정
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_hide_header X-Powered-By;
    }

    # 민감 파일 차단
    location ~ /\. {
        deny all;
        return 403;
    }
}
```

그리고 과도한 요청을 막기 위해 이런 것도 자주 씁니다.
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=5r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://127.0.0.1:8000;
        }
    }
}
```

실무에서 Nginx가 맡는 범위와 애플리케이션이 맡는 범위를 나누면 다음과 같습니다.

Nginx에서 하는 것
- TLS/SSL 종료
- 리버스 프록시
- 보안 헤더
- IP 기반 차단
- 요청 제한
- 업로드 크기 제한
- 정적 파일 서빙
- 기본적인 접근 제어
    

DRF/FastAPI에서 하는 것
- 로그인/권한 체크
- JWT 검증
- CSRF 처리
- 비즈니스 규칙
- 사용자별 데이터 접근 제어
- 입력값 검증
- DB 저장/조회
- 감사 로그, 도메인 로직

즉, 실무에서는 Nginx는 “입구 보안”, DRF/FastAPI는 “애플리케이션 보안”이라고 생각하시면 됩니다. 브라우저 앞단의 요청 관리와 1차 방어는 Nginx가 맡고, 실제 인증/인가와 데이터 보안은 백엔드가 맡습니다.

실제 위의 Nginx코드는 EC2서버 안에 들어가서 Nginx 설정 파일을 열고 수정합니다.
보통는 이런곳에서 작성합니다.

- Ubuntu 기준  
    `/etc/nginx/nginx.conf`
    
- 사이트별 설정  
    `/etc/nginx/sites-available/프로젝트명`
    
- 활성화 연결  
    `/etc/nginx/sites-enabled/프로젝트명`
    

즉, EC2에 SSH 접속한 뒤 이런 식으로 작업합니다.
```bash
ssh -i 키파일.pem ubuntu@EC2주소  
sudo nano /etc/nginx/sites-available/myproject
```

그리고 수정 후에는 보통 이렇게 확인합니다.
```bash
sudo nginx -t  
sudo systemctl reload nginx
```

흐름은 보통 이렇습니다.
1. EC2에 접속
2. Nginx 설정 파일 열기
3. 보안 헤더, HTTPS 리다이렉트, 업로드 제한, rate limit 같은 설정 작성
4. 문법 검사
5. Nginx 재로드
    
실무에서는 작성 위치가 2가지로 나뉩니다.
`1.` 서버 설정 파일에서 직접 작성
- 가장 흔한 방식
- `nano`, `vim`으로 바로 수정
- 소규모 개인 프로젝트나 초기 배포에서 많이 함

`2.` 로컬에서 설정 파일 관리 후 배포
- `nginx.conf` 또는 사이트 설정 파일을 Git으로 관리
- CI/CD나 Docker로 서버에 반영
- 팀 프로젝트나 운영 환경에서 더 실무적임
    
즉, 처음에는 EC2에서 직접 nano로 작성하는 경우가 많고,  
실무가 커지면 Nginx 설정도 코드처럼 Git으로 관리하는 경우가 많습니다.

---
### WSGI / ASGI 개념
웹 서버는 파이썬 코드를 직접 실행할 수 없습니다.

WSGI / ASGI란?
웹 서버(Nginx)는 파이썬 코드를 직접 실행하지 않습니다.  
그래서 웹 서버와 파이썬 웹 애플리케이션이 서로 어떻게 요청/응답을 주고받을지 정한 표준 규칙이 필요합니다.

이 규칙이 바로
```
WSGI  
ASGI
```
입니다.

WSGI란?
WSGI는 동기(Synchronous) 방식의 파이썬 웹 서버 인터페이스 표준입니다.

쉽게 말하면:
- 웹 요청이 들어오면
- 파이썬 앱이 그 요청을 받아 처리하고
- 응답을 돌려주는 규칙입니다.

주로 이런 경우에 잘 맞습니다.
- Django
- DRF
- 일반 CRUD 웹서비스
- 관리자 페이지
- 게시판
- 쇼핑몰 API
- 전통적인 요청/응답 구조
    
즉, 일반적인 웹서비스 운영에는 WSGI가 아주 많이 쓰였습니다.

ASGI란?
ASGI는 비동기(Asynchronous) 처리까지 지원하는 파이썬 서버 인터페이스 표준입니다.
WSGI보다 확장된 개념이라고 보시면 됩니다.

ASGI가 필요한 이유는 이런 작업 때문입니다.
- 비동기 API 처리
- WebSocket
- 실시간 채팅
- 스트리밍 응답
- long polling
- SSE
- 동시에 많은 I/O 처리
    
즉, 실시간성 / 비동기성 / 연결 유지가 필요한 경우 ASGI가 더 적합합니다.

```
Django / DRF는 전통적으로 WSGI를 많이 사용  
FastAPI는 기본적으로 ASGI 사용  
그리고 최신 Django도 ASGI로 실행 가능
```
즉, Django는 무조건 WSGI만 되는 것이 아닙니다.  
전통적인 일반 웹서비스는 WSGI가 많고, 웹소켓·비동기·실시간 처리가 필요하면 Django도 ASGI로 운영할 수 있습니다.

###### 둘의 차이를 아주 쉽게 정리하면
| 구분        | WSGI           | ASGI                 |
| --------- | -------------- | -------------------- |
| 처리 방식     | 주로 동기          | 동기 + 비동기             |
| 대표 사용     | 전통적 Django/DRF | FastAPI, 웹소켓, 실시간 처리 |
| WebSocket | 부적합            | 가능                   |
| 실시간 채팅    | 어려움            | 적합                   |
| 일반 CRUD   | 매우 적합          | 가능                   |
| AI 추론 API | 가능             | 더 유연함                |

Django / DRF 배포 구조
```
브라우저
   ↓
Nginx
   ↓
Gunicorn
   ↓
Django WSGI app
```

FastAPI 배포 구조
```
브라우저
   ↓
Nginx
   ↓
Uvicorn 또는 Gunicorn + UvicornWorker
   ↓
FastAPI ASGI app
```

로컬서버실행이 아닌 실제 서버 실행 : 로컬서버실행은 :  `python manage.py runserver`
DRF서버
```bash
gunicorn myproject.wsgi:application
```

FastAPI 서버 : 로컬서버 실행은 :  `uvicorn main:app --reload`
```bash
gunicorn -k uvicorn.workers.UvicornWorker main:app
```
---
실무에서는 실제로 어떻게 셋팅하나?
실무에서는 보통 Nginx + 애플리케이션 서버 구조를 씁니다.

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
