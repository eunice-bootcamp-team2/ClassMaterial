Docker(19번)로 구축된 환경을 GitHub Actions 등을 통해 자동으로 배포하는 법과 API 접근 제한(Rate Limiting)을 설정하는 법을 다룹니다

운영 - CI/CD 파이프라인 구축 및 API 보안 강화는 개발된 서비스를 실제 운영 환경으로 안전하고 효율적으로 내보내기 위한 핵심 공정입니다. 19번 단계에서 구축한 Docker 컨테이너 구조를 기반으로, 자동 배포 체계를 만들고 무분별한 API 호출로부터 서버 자원을 보호하는 방법을 다룹니다

`1.` GitHub Actions를 이용한 CI/CD 파이프라인 구축

수동으로 서버에 접속해 빌드하는 방식은 배포 실수를 유발할 수 있으므로, 코드가 푸시되면 자동으로` [테스트 → 빌드 → 배포]`가 이루어지는 파이프라인을 구축합니다.

`**.github/workflows/deploy.yml**` (워크플로우 설정)

프로젝트 루트에 아래 파일을 생성하여 자동화 흐름을 정의합니다.

```yml
name: Deploy to EC2 with Docker Compose

on:
  push:
    branches: [ main ] # main 브랜치에 푸시될 때 실행

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # 1. Docker Build & Push (Docker Hub 등을 사용할 경우)
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and Push Backend
        run: |
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/review-backend ./backend
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/review-backend

      - name: Build and Push AI Server
        run: |
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/review-ai-server ./ai-server
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/review-ai-server

      # 2. EC2 서버에 접속하여 배포 실행
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/${{ secrets.EC2_USER }}/app
            docker-compose pull
            docker-compose up -d
            docker image prune -f # 오래된 이미지 정리
```

- **설명**: GitHub에서 제공하는 서버(Runner)가 코드를 가져와 Docker 이미지를 빌드하고, 이를 저장소에 올린 뒤 실제 EC2 서버에 접속하여 `docker-compose up` 명령어를 실행하는 흐름입니다.

--------------------------------------------------------------------------------

`2.` API 보안 및 Rate Limiting (접근 제한) 설정

AI 추론 요청은 많은 컴퓨팅 자원을 소모하므로, 무분별한 요청으로 인한 리소스 낭비를 방지하기 위해 **Rate Limiting**과 **CORS** 설정을 강화해야 합니다.

**A. DRF Throttling (Rate Limiting) 설정**

Django REST Framework의 기본 기능을 사용하여 사용자별 API 호출 횟수를 제한합니다.

`backend/mysite/settings.py`
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle', # 비로그인 사용자
        'rest_framework.throttling.UserRateThrottle'  # 로그인 사용자
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/day',      # 비로그인 유저는 하루 10번
        'user': '100/day',     # 로그인 유저는 하루 100번
        'ai_analysis': '5/min' # 특정 AI 분석 API는 분당 5번으로 제한
    }
}
```

**B. 특정 View에 전용 제한 적용**

AI 분석처럼 무거운 작업이 일어나는 뷰에 별도의 제한을 둡니다.

`backend/apps/ai_gateway/views.py`
```python
from rest_framework.throttling import UserRateThrottle

class AIAnalysisRateThrottle(UserRateThrottle):
    scope = 'ai_analysis'

class ReviewAnalyzeAPIView(APIView):
    throttle_classes = [AIAnalysisRateThrottle] # 분당 5회 제한 적용
    # ... 기존 로직
```

**C. CORS 설정 엄격화**

외부 노출 가능성을 차단하기 위해 허용된 도메인만 접근 가능하도록 설정합니다.

`backend/mysite/settings.py`
```python
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    "http://localhost:8000", # 개발 환경
]
CORS_ALLOW_CREDENTIALS = True
```

--------------------------------------------------------------------------------

3. 포인트

- 자동화의 가치: 수동 배포의 위험성을 설명하고, **CI/CD**를 통해 개발자가 코드 작성에만 집중할 수 있는 환경을 구축하는 경험을 제공합니다.
- 자원 관리의 중요성: AI 모델은 서버에 큰 부하를 주기 때문에, **Rate Limiting**이 단순한 보안을 넘어 서비스의 가용성을 유지하기 위한 필수 장치임을 강조합니다.
- 환경 변수 보안: 비밀번호나 API 키 같은 민감 정보는 GitHub Secrets에 저장하여 코드에 노출되지 않도록 하는 보안 습관을 가르칩니다.
