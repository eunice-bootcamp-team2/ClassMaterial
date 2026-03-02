SQLite에서 PostgreSQL로 전환하려고 할때 무엇이 필요한지 정리

(1) 환경 정보
- WSL(우분투)인지, 맥인지
- Django/파이썬 버전
	- `python --version` : Python 3.12.3
	- `python -m django --version` : 4.2.7
- 가상환경/패키지 관리
	- venv/uv 중 무엇을 사용하는지
	- `pip freeze | grep psycopg` : `psycopg2-binary==2.9.10`

(2) PostgreSQL을 어디에 설치할 건지
	`A. 로컬(WSL)에 직접 설치?`
		- PostgreSQL을 WSL에 apt로 설치할 건지 (개발중)`
	`B. Docker로 PostgreSQL 띄울 건지? (DBeaver 목적)`
		- `docker compose`로 db 컨테이너 만들 건지
	`C. 외부 DB(RDS/Supabase/Railway등) (배포시)` 
		- 호스트/포트/SSL 옵션이 필요함
👉 A/B/C 중 뭐로 할 건지에 따라 설정이 달라집니다.

(3) DB 접속 정보
PostgreSQL은 아래 5개의 정보가 필요합니다. (이건 내가 직접 정하면 됩니다.)
- DB 이름: `DB_NAME` : mysite_db
- 유저: `DB_USER` : mysite_user
- 비밀번호: `DB_PASSWORD` : mysite_password
- 호스트: `DB_HOST` (로컬이면 보통 `localhost` / Docker면 서비스명 예: `db`)
- 포트: `DB_PORT` (기본 `5432`) 
- 호스트/포트: Docker면 보통 `localhost:5432` (DBeaver도 동일)

(4) 현재 SQLite 상태 : 마이그레이션/데이터 이동 때문에 알아야합니다.
- SQLite 파일 경로:
    - 예: `db.sqlite3` 위치
- 지금 데이터 옮겨야 해?
    - 데이터 다 날려도 됨(초기화 OK)
    - 기존 데이터 그대로 옮겨야 함(마이그레이션 필요)
        
- 이 선택에 따라:
	- 그냥 migrate만 하면 되는 경우 vs
	- `dumpdata/loaddata` 같은 데이터 이전 절차가 들어감

(5) 프로젝트 구조 정보
- 프로젝트 이름(루트 폴더/설정 모듈)
    - 예: `config/settings.py` 인지 `mysite/settings.py` 인지
- settings 분리 여부
    - `settings/base.py`, `dev.py`, `prod.py` 처럼 나뉘어 있는지
- `.env` 사용 여부
    - `python-dotenv`, `django-environ` 등

(6) 배포까지 고려 중인지
- 로컬만 바꾸는지
- Fly.io / EC2 / EB / Render 등 배포까지 같이 갈 건지  
    배포까지면 `ALLOWED_HOSTS`, `DATABASE_URL`, SSL 옵션까지 같이 정리해줘야 함.
---
### Sqlite3 에서 PostgreSQL로 전환하는 순서

목표 설정값(내가 정한 값)
- `DB_NAME=mysite_db`
- `DB_USER=mysite_user`
- `DB_PASSWORD=mysite_password`
- `DB_HOST=localhost` (Django/WSL에서 접속)
- `DB_PORT=5432`

1️⃣ 사전 준비

(1) Docker PostgreSQL 먼저 띄우기

1-1) 프로젝트 루트에 `docker-compose.yml` 만들기
```yaml
services:
  db:
    image: postgres:16
    container_name: mysite_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mysite_db
      POSTGRES_USER: mysite_user
      POSTGRES_PASSWORD: mysite_password
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

5432 포트를 누가 잡고 있는지 확정
```bash
sudo lsof -iTCP:5432 -sTCP:LISTEN -n -P
```
결과가 `postgres`면 (WSL에 설치한 Postgres가 점유 중)

2-A) (추천) WSL Postgres 끄고 Docker를 5432로 사용
```bash
sudo service postgresql stop || sudo systemctl stop postgresql  
sudo systemctl disable postgresql 2>/dev/null || true
```

1-2) 실행
```bash
docker compose up -d  
docker ps
```

1-3) DB 준비 확인
```bash
docker exec -it mysite_postgres bash -lc 'export PAGER=cat; psql -U mysite_user -d mysite_db -c "SELECT version();"'
```

1-4) DBeaver 연결 정보
- Host: `localhost`
- Port: `5432`
- Database: `mysite_db`
- Username: `mysite_user`
- Password: `mysite_password`

✔ 연결 성공하면 DB 준비 완료

---
데이터베이스(Database)클릭 -> 새 연결(New Database Connection) 클릭
![[Pasted image 20260228120539.png]]

PostgreSQL 선택
![[Pasted image 20260228120653.png]]

서버정보와 똑같이 설정
![[Pasted image 20260228120948.png]]

새로생긴 DB를 클릭하여 Download하기
![[Pasted image 20260228121110.png]]

database가 생긴것 확인하기
![[Pasted image 20260228121504.png]]

---
가상환경이 활성화 되어 있을때
```python
uv pip install django-environ
```

---
2️⃣ SQLite 데이터 백업 및 덤프
⚠️ 이 단계에서 settings.py는 SQLite 그대로 유지

2-1) SQLite 백업
```bash
cp db.sqlite3 db.sqlite3.backup
```

dump가 실제로 출력되는지 먼저 확인(0B 방지용)
```bash
python manage.py dumpdata --indent 2 | head
```

2-3) 데이터 덤프 생성
```bash
python manage.py dumpdata \  
--natural-foreign --natural-primary \  
--exclude contenttypes \  
--exclude auth.permission \  
--exclude admin.logentry \  
--exclude sessions \  
--indent 2 \  
> data.json
```

2-4) dump 파일 생성 확인 : 파일 크기 확인
```bash
ls -lh data.json
```
파일이 0KB 아니면 정상

파일 크기 확인 결과
```bahs
-rw-r--r-- 1 youjung youjung 4.9K Feb 28 12:53 data.json
```
여기까지는 settings가 SQLite일 때만 해야 함

SQLite 정상 동작 확인
```bash
python manage.py runserver
```
먼저 실행해보고 잘 구동이 되는지 최정 확인합니다

---
3️⃣ Django 설정을 PostgreSQL로 변경

3-1) 드라이버 패키지 확인
```bash
pip freeze | grep psycopg
```
패키지가 없다면
```bash
uv pip install psycopg2-binary
```

3-2) `mysite/settings.py` 수정
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "mysite_db",
        "USER": "mysite_user",
        "PASSWORD": "mysite_password",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```
지금은 일단 하드코딩으로 진행하고, 나중에 배포 준비할 때 `.env`로 빼면 됩니다

---
psycopg2-binary 설치 (가장 간단/확실)
```bash
uv pip install psycopg2-binary==2.9.10
```
---
4️⃣ PostgreSQL에 테이블 생성
```bash
python manage.py migrate
```
✔ 이제 Django는 PostgreSQL을 사용 중

---
5️⃣ SQLite 데이터 → PostgreSQL로 로드

데이터 로드
```bash
python manage.py loaddata data.json
```
✔ 기존 데이터가 Postgres로 들어감

---
6️⃣ 시퀀스 리셋 (매우 중요)
```bash
python manage.py sqlsequencereset todo | python manage.py dbshell  
python manage.py sqlsequencereset posts | python manage.py dbshell
```
✔ 데이터 있는 모든 앱에 대해 실행

---
7️⃣ 최종 확인

7-1) Django shell
```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model  
User = get_user_model()  
User.objects.count()
```

```
exit()
```

서버 실행 확인
```bash
python manage.py runserver
```

---
DBeaver와 연결된것을 확인합니다.

생성된 DB우클릭후 연결 종료 후 다시 연결
![[Pasted image 20260228130036.png]]
그러면 테이블이 새로 생성된것이 확인됩니다.





