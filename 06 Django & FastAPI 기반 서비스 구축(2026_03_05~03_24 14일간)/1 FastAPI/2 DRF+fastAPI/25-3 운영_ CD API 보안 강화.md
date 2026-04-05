GitHub를 통한 CD(자동 배포)
```
로컬 개발
→ GitHub push
→ GitHub Actions 실행
→ EC2 접속
→ 최신 코드 pull
→ docker compose prod 재실행
→ 배포 완료
```
CI 성공 후 → EC2 수동 배포 1회 성공 → 그 다음 CD 자동화로 가는 방식

CD는 결국 `main` 푸시 이후 GitHub Actions가 서버에 접속해서 `docker compose`를 다시 올리는 흐름으로 연결됩니다.

---
### 먼저 이해해야 할 개념
지금 만들 것은 GitHub Actions가 대신 서버에 접속해서 배포해주는 구조입니다.
즉, 사람이 직접 매번 이런 명령어를 치던 것을:
```bash
ssh ubuntu@EC2_IP
cd ~/product_review_service
git pull
cd backend
docker compose -f docker-compose.prod.yml up -d --build
```
앞으로는:
```bash
git push origin main
```
하면 GitHub가 대신 해주는 구조로 바꾸는 것입니다. 이게 CD입니다. 문서에도 `main` 푸시 → GitHub Actions → 서버 접속 → `docker compose pull/up -d` 흐름으로 설명되어 있습니다.

---
### CD를 붙이기 전에 준비되어 있어야 하는 것
아래 4개가 먼저 되어 있어야 합니다.

#### 첫번째: CI가 성공한 상태
이미 CI가 성공해야 합니다.  
그래야 코드 자체는 정상이라고 보고 배포 자동화를 붙일 수 있습니다.

#### 두번째: EC2 수동 배포가 1회 성공한 상태
이 단계가 매우 중요합니다.
왜냐하면 자동화는 원래 되던 것을 자동으로 반복하는 것이지,  
안 되던 것을 자동으로 고쳐주는 과정이 아니기 때문입니다.

즉 먼저 수동으로:
```
- EC2 접속
- `git pull`
- `.env`
- `docker compose -f docker-compose.prod.yml up -d --build`
```
이게 성공해야 합니다. 이 순서를 먼저 하라고 정리된 이유도 바로 이것입니다.

#### 세번째: 배포용 compose 파일이 있어야 함
배포는 개발용 `docker-compose.yml`이 아니라  
배포용 `docker-compose.prod.yml` 기준으로 가야 합니다.  
지금 작업중인 프로젝트는 이미 개발용/배포용 분리가 되어 있습니다.

#### 네번째: GitHub 저장소에 코드가 올라가 있어야 함
당연하지만 자동 배포는 GitHub 기준으로 동작하므로, 현재 배포 가능한 코드가 GitHub에 있어야 합니다.

---
전체 CD 구조
```
[내 PC]
코드 수정
→ main 브랜치 push

[GitHub Actions]
워크플로우 실행
→ SSH로 EC2 접속
→ 프로젝트 폴더 이동
→ git pull
→ backend/.env.prod 또는 .env 확인
→ docker compose -f docker-compose.prod.yml up -d --build

[EC2]
새 코드로 재배포 완료
```
---
### CD 작업순서
EC2에 접속해서 배포용 폴더 상태 점검
먼저 수동 배포가 되던 서버에 접속합니다.

내 컴퓨터에서 pem 키를 사용해서 EC2 서버(ubuntu 사용자)에 접속

### 1단계. EC2에 수동으로는 정상 배포되는 상태를 먼저 고정하기
```bash
chmod 600 ~/.ssh/본인의페어링키.pem
```

실행명령어
```bash
ssh -i ~/.ssh/product-review-key.pem ubuntu@15.164.95.113
ssh -i ~/.ssh/본인의페어링키.pem ubuntu@본인의 공개IP키
```

```bash
cd ~/product_review_service/backend  
pwd  
ls
```

그리고 수동 배포 때 쓰던 명령이 정확히 무엇인지 정리해야 합니다.  
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
또는 Git pull 후 재시작이라면:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
핵심은 내가 수동으로 성공시키는 명령어 3~5줄을 먼저 확정하는 것입니다. CD는 그 명령을 GitHub Actions가 대신 실행해주는 구조라고 생각하시면 됩니다.

### 2단계. EC2 서버에서 배포용 사용자/폴더 상태 점검
EC2 안에서 아래를 확인하세요.
```bash
whoami  
hostname  
docker --version  
docker compose version  
git --version
```

1️⃣ `whoami`
```
ubuntu
```
의미: 현재 로그인한 사용자 이름

✔️ 해석
- 지금 EC2 서버에 ubuntu 계정으로 접속 중
- (AWS 기본 계정 정상)

2️⃣ `hostname`
```
ip-172-31-47-103
```
의미: 서버의 이름 (내부 이름)

✔️ 해석
- AWS 내부 네트워크용 이름
- 정상 (EC2 기본 형태)

3️⃣ `docker --version`
```
Docker version 29.3.1
```
의미: 도커 설치 여부 + 버전 확인

✔️ 해석
- 도커 설치 완료
- 최신 버전 사용 중
- 컨테이너 실행 가능 상태

4️⃣ `docker compose version`
```
Docker Compose version v5.1.1
```
의미: docker-compose 사용 가능 여부

✔️ 해석
- 여러 컨테이너(django, redis, fastapi 등) 같이 실행 가능
- 지금 프로젝트 구조에 필수 요소

5️⃣ `git --version`
```
git version 2.43.0
```
의미: Git 설치 여부

✔️ 해석
- ✅ Git 설치 완료
- 👉 GitHub에서 코드 pull 가능

---
그리고 레포가 이미 클론되어 있는지 확인합니다.
```bash
cd ~/product_review_service  
git remote -v  
git branch
```
여기서 중요한 건 두 가지입니다.
1. EC2 안에 이미 프로젝트 폴더가 있어야 함
2. 그 폴더에서 `git pull` 했을 때 최신 코드가 받아져야 함

즉, CD의 기본 전제는  
GitHub → EC2 접속 → 기존 프로젝트 폴더로 이동 → git pull → docker compose 재실행  
이 흐름입니다.

---
### 3단계. EC2에서 GitHub Actions가 접속할 방식 결정
가장 쉬운 방식은 GitHub Actions가 SSH로 EC2에 접속하는 방식입니다. AWS는 Linux 인스턴스에 SSH로 접속하는 일반적인 방법을 공식 문서로 안내하고 있습니다.

쉽게 설명하여 지금 GitHub Actions가 EC2에 자동으로 접속하려면, 사람이 수동으로 하던 이 동작을 대신해야 합니다.
```bash
ssh -i ~/.ssh/product-review-key.pem ubuntu@15.164.95.113
```
이 명령을 잘 보면 3가지 핵심 정보가 들어 있습니다.
- `15.164.95.113` → 서버 주소 = `EC2_HOST`
- `ubuntu` → 접속 계정 = `EC2_USERNAME`
- `product-review-key.pem` → 접속 열쇠 = `EC2_SSH_KEY`
즉 GitHub Secrets에는 이 3개를 넣는 것입니다.

우리가 다운로드 받은 `EC2_SSH_KEY`에는 pem 파일을 열었을 때 나오는 전체 내용을 넣습니다.

다운로드 받은 페어링 키를 메모장으로 열어보면 다음과 같이 나옵니다
```
-----BEGIN RSA PRIVATE KEY-----  
MIIEowIBAAKCAQEA...
....... 
-----END RSA PRIVATE KEY-----
```
이값을 확인합니다.

---
### 4단계. GitHub 저장소에 Secrets 등록

GitHub 저장소에서:
Repository → Settings → Secrets and variables → Actions
![[Pasted image 20260328184423.png]]
그 다음 New repository secret 버튼을 눌러 하나씩 추가합니다.

Name: `EC2_HOST`
![[Pasted image 20260328184720.png]]

Name: `EC2_USERNAME`
![[Pasted image 20260328184743.png]]

---
Name: `EC2_PORT`
Secret: 22

---
Name:  `EC2_SSH_KEY`
여기는 페이링 키를 등록합니다.

모두 등록하면 다음과 같습니다.
![[Pasted image 20260328184928.png]]

왜 파일 업로드가 아니라 내용 복붙을 하냐면 보안상 이슈로 GitHub Actions는 우리의 컴퓨터에 있는 `~/.ssh/product-review-key.pem` 파일을 직접 볼 수 없습니다.

결정적인 이유는 GitHub 서버는 당신 PC 안에 있는 파일에 접근할 수 없으니,  
SSH 접속에 필요한 키 내용을 GitHub Secrets에 저장해두고 워크플로가 그걸 꺼내 쓰는 방식입니다.

즉:
- 내 PC에서는 `pem 파일`로 접속
- GitHub Actions에서는 `Secrets에 저장된 pem 내용`으로 접속이 차이입니다.

---
### 5단계. EC2 서버에 `.env`  있는지 확인

EC2에서:
```bash
cd ~/product_review_service/backend  
ls -al
```
예를 들어 `docker-compose.prod.yml`에서 이런 식으로 쓰고 있으면:
```yaml
env_file:  
  - .env
```
그 파일이 실제로 서버에 존재해야 합니다.
```bash
cat .env
```
![[Pasted image 20260328185557.png]]

![[Pasted image 20260328185627.png]]

CD는 보통:
- 코드만 최신화
- 컨테이너만 재시작
- 비밀키와 DB 접속정보는 서버에 유지 이 구조가 가장 안정적입니다.

---
### 6단계. 서버에서 배포 스크립트를 먼저 만들기

가장 추천하는 방식은
GitHub Actions YAML 안에 긴 명령을 다 넣지 말고, EC2 안에 배포 스크립트 하나를 만들어 두세요.

EC2에서:
```bash
cd ~/product_review_service/backend  
nano deploy.sh
```

nano에 붙여넣기
```bash
#!/bin/bash  
set -e  
  
cd /home/ubuntu/product_review_service/backend  
  
echo "=== Git pull ==="  
git pull origin main  
  
echo "=== Docker compose up ==="  
docker compose -f docker-compose.prod.yml up -d --build  
  
echo "=== Remove unused images ==="  
docker image prune -f

echo "Deploy Complete"  
```

저장 후 실행 권한 부여:
```bash
chmod +x deploy.sh
```

테스트:
```bash
./deploy.sh
```
이 스크립트가 수동으로 잘 돌아가면, GitHub Actions는 나중에 결국 이것만 실행하면 됩니다.

배포 스크립트 실행 성공
![[Pasted image 20260328190146.png]]

---
## 7단계. GitHub Actions용 CD 워크플로 파일 만들기

기존에 우리가 만들었던 저장소 루트에 아래 cd.yml 파일을 추가합니다.
```bash
.github/workflows/cd.yml
```
가장 단순한 형태는 main 브랜치에 push되면 배포입니다. GitHub Actions는 이벤트 기반으로 워크플로를 실행할 수 있고, push 같은 이벤트를 트리거로 쓸 수 있습니다.

구조:
```yaml
.github/workflows/  
├── ci.yml # 테스트/빌드/통합검증  
└── cd.yml # EC2 배포 전용
```

새 파일 `cd.yml` 추가
```bash
.github/workflows/cd.yml
```
내용은 배포만 담당하게 단순하게 두면 됩니다.

```yml
name: CD Deploy to EC2

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script: |
            cd /home/ubuntu/product_review_service/backend
            ./deploy.sh
```

이 구조가 무슨 뜻인가
이 `cd.yml`은 이렇게 동작합니다.
```
1. main 브랜치에 push 발생  
2. GitHub Actions가 CD 워크플로 실행  
3. EC2에 SSH 접속  
4. deploy.sh 실행  
5. 서버 재배포 완료
```
즉, 테스트 성공 후 배포 구조입니다.

---
### 8단계. `main` 브랜치에 push 하면 바로 CD 실행

동작 흐름은 다음과 같습니다.
```
내가 git push origin main
→ GitHub Actions가 CD 워크플로 실행
→ GitHub가 SSH로 EC2 접속
→ /home/ubuntu/product_review_service/backend 로 이동
→ ./deploy.sh 실행
→ git pull origin main
→ docker compose -f docker-compose.prod.yml up -d --build
→ 배포 완료
```
여기서 중요한 점은,  
지금 방식은 CI 성공 여부를 기다리는 구조가 아니라, `main` 브랜치에 push 되면 CD가 바로 실행되는 가장 단순한 방식이라는 점입니다.

즉:
- 현재 방식: `main` push → 바로 배포
- 나중에 고도화하는 방식: CI 성공 후에만 CD 실행

---
### 9단계. 첫 배포 테스트
로컬에서 작은 수정 하나를 한 뒤, 아래처럼 `main` 브랜치로 push 합니다.
```bash
git add .  
git commit -m "test: cd deploy"  
git push origin main
```
그러면 GitHub 저장소의 **Actions** 탭에서 `CD Deploy to EC2` 워크플로가 자동으로 실행됩니다.

여기서 확인해야 할 핵심은 다음입니다.
- GitHub Actions가 시작되었는지
- SSH 접속이 성공했는지
- `cd /home/ubuntu/product_review_service/backend` 가 성공했는지
- `./deploy.sh` 가 실행되었는지
- 마지막에 배포가 정상 완료되었는지

배포를 하고 GitHub Actions를 보면 ci cd가 동시에 구동되는것이 확인됩니다
![[Pasted image 20260328192121.png]]

---
### 10단계. 배포 후 서버에서 직접 확인

배포 후 EC2에 다시 접속해서 확인합니다.
```bash
ssh -i ~/.ssh/product-review-key.pem ubuntu@15.164.95.113  
cd ~/product_review_service/backend  
docker compose -f docker-compose.prod.yml ps  
docker compose -f docker-compose.prod.yml logs --tail=100
```

배포성공상태
![[Pasted image 20260328192324.png]]
✔ 전부 `Up` 상태
- django (web) ✅
- fastapi ✅
- celery ✅
- redis ✅
- postgres ✅
- nginx ✅
이건 서비스 살아있다는 뜻입니다

GitHub Actions도 성공한 상태
![[Pasted image 20260328192449.png]]

---
### 전체 확인할 명령어 정리
```bash
cd ~/product_review_service/backend  
  
docker compose -f docker-compose.prod.yml ps  
  
docker compose -f docker-compose.prod.yml logs --tail=30 web  
docker compose -f docker-compose.prod.yml logs --tail=30 fastapi  
docker compose -f docker-compose.prod.yml logs --tail=30 celery  
docker compose -f docker-compose.prod.yml logs --tail=30 nginx
```

---
Django API 확인
컨테이너 로그 확인
```bash
docker compose -f docker-compose.prod.yml logs --tail=30 web 
```
![[Pasted image 20260328192607.png]]

---
```bash
docker compose -f docker-compose.prod.yml logs --tail=30 fastapi 
```
![[Pasted image 20260328192939.png]]
이건 FastAPI 서버가 정상 실행 중이라는 100% 신호입니다

---
```bash
docker compose -f docker-compose.prod.yml logs --tail=30 celery 
```
![[Pasted image 20260328193155.png]]
Celery worker 정상 실행 + Redis 연결 완료 + 작업 받을 준비 완료 상태

---
```bash
docker compose -f docker-compose.prod.yml logs --tail=30 nginx
```
![[Pasted image 20260328193411.png]]
배포 성공 + nginx 정상 동작 + 공격 잘 막고 있음

---
### 11단계. 운영 안정성 + 나 자신을 위한 기록

CD 실패 시 문제 해결 매뉴얼을 md파일 기록해 둡니다.
1️⃣ git pull 실패
```bash
Permission denied (publickey)
```
원인: EC2에서 GitHub 인증 안됨

✅ 해결 방법
```bash
cd ~/product_review_service/backend  
git remote -v  
git pull origin main
```
여기서 실패하면:
- SSH 키 등록 확인
- HTTPS 방식인지 확인

---
2️⃣ docker 권한 문제
```bash
permission denied while trying to connect to docker
```
원인: ubuntu 유저가 docker 그룹에 없음

✅ 해결 방법
```bash
sudo usermod -aG docker ubuntu  
newgrp docker  
groups
```
docker 포함되어야 정상

---
3️⃣ .env 누락
```bash
ImproperlyConfigured: SECRET_KEY not found
```
원인: 환경변수 파일 없음

✅ 해결 방법
```bash
ls -al  
cat .env
```
없으면 직접 생성

---
4️⃣ 경로 틀림
```bash
No such file or directory
```
원인: 경로 오타 (하이픈 vs 언더바)

✅ 해결 방법
```bash
pwd  
ls
```
실제 경로 확인 후 YAML 수정

이런 문제가 발생하면 대응을 해야 합니다. 그래서 운영 장애 대응 매뉴얼을 작성해야 합니다.

문서 구조
```
docs/
├── deployment.md           ← 전체 흐름
├── cd_guide.md             ← CD 설정 방법
└── troubleshooting.md      ← 문제 해결 모음 
```

`deployment.md` : 처음부터 배포까지 한 번에 보는 문서
```md
# 🚀 Deployment Guide (전체 배포 흐름)

## 1. 프로젝트 구조

- Django (Web API)   
- FastAPI (AI 서버)   
- Celery + Redis (비동기 처리)  
- PostgreSQL (DB)   
- Nginx (Reverse Proxy)
    
---

## 2. 배포 흐름

1. 로컬 개발 완료   
2. GitHub push   
3. GitHub Actions (CI 실행)   
4. GitHub Actions (CD 실행)   
5. EC2 SSH 접속   
6. deploy.sh 실행   
7. Docker 컨테이너 재시작
    
---

## 3. EC2 초기 세팅

bash
sudo apt update
sudo apt install docker.io docker-compose git -y
sudo usermod -aG docker ubuntu

---

## 4. 프로젝트 실행

bash
cd ~/product_review_service/backend
docker compose -f docker-compose.prod.yml up -d --build

---

## 5. 확인

bash
docker compose ps
docker compose logs --tail=100

---

## 6. 서비스 확인

- Django: http://EC2_IP/products/   
- FastAPI: http://EC2_IP:8001
```
백틱이 삭제되었으므로 추가하여 md파일에 작성합니다.


`cd_guide.md` (CD 설정 방법) : 자동 배포 설정 설명서
```md
# ⚙️ CD (Continuous Deployment) 설정 가이드

## 1. 개념

- CI: 코드 테스트   
- CD: 자동 배포   
👉 push → 자동 배포 구조

---

## 2. GitHub Secrets 설정

필수 값:

- EC2_HOST   
- EC2_USERNAME   
- EC2_SSH_KEY  
- EC2_PORT
    
---

## 3. deploy.sh (EC2 내부)

bash
#!/bin/bash
set -e

cd /home/ubuntu/product_review_service/backend

echo "=== Git pull ==="
git pull origin main

echo "=== Docker build & up ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Clean images ==="
docker image prune -f

echo "Deploy Complete"

---

## 4. cd.yml

yaml
name: CD Deploy to EC2

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script: |
            cd /home/ubuntu/product_review_service/backend
            ./deploy.sh

---

## 5. 동작 흐름

text
git push → GitHub Actions → SSH 접속 → deploy.sh 실행 → 배포 완료

```

`troubleshooting.md` : 문제 터졌을 때 바로 해결하는 문서
```md
# 🔥 Troubleshooting (문제 해결 매뉴얼)

---

## 1. git pull 실패

### ❗ 에러

bash
Permission denied (publickey)


### 🔍 원인

- GitHub 인증 안됨
    

### ✅ 해결

bash
git remote -v
git pull origin main

---

## 2. Docker 권한 문제

### ❗ 에러

bash
permission denied while trying to connect to docker


### 🔍 원인

- docker 그룹 미등록
    

### ✅ 해결

bash
sudo usermod -aG docker ubuntu
newgrp docker
groups

---

## 3. 환경변수 누락

### ❗ 에러

bash
SECRET_KEY not found

### 🔍 원인

- .env 없음
    

### ✅ 해결

bash
ls -al
cat .env.prod

---

## 4. 경로 오류

### ❗ 에러

bash
No such file or directory

### 🔍 원인

- 경로 오타
    

### ✅ 해결

bash
pwd
ls

---

## 5. 컨테이너 실행 안됨

### 확인

bash
docker compose ps
docker compose logs --tail=100

---

## 6. 서비스 접속 안됨

### 확인 순서

1. docker 실행 상태   
2. nginx 로그   
3. EC2 보안 그룹 (80 포트)   
4. ALLOWED_HOSTS 설정
    
---

## 💡 핵심 원칙

👉 에러 → 원인 → 해결 순서로 접근  
👉 로그 먼저 확인
```

md파일을 github에 올려둡니다.
```bash
git add docs/  
git commit -m "docs: add deployment and troubleshooting guide"  
git push origin main
```