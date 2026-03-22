
1단계. 먼저 현재 SQLite 상태 백업하기
백업 권장
```bash
cp db.sqlite3 db.sqlite3.backup
```

추가로 fixture 백업도 권장
```bash
python manage.py dumpdata \
--exclude auth.permission \
--exclude contenttypes \
--indent 2 > backup_data.json
```

백업하면 아래와 같은 파일이 추가됩니다.
![[Pasted image 20260308150151.png]]

2단계. PostgreSQL 드라이버 설치
PostgreSQL 설정
```bash
uv pip install psycopg2-binary
```

`requirements.txt` 갱신
```
uv pip freeze > requirements.txt
```

3단계. Docker로 PostgreSQL 만들기
PostgreSQL 컨테이너 만들기
```
project-root/
├── backend/
│   ├── manage.py
│   ├── mysite/
│   ├── apps/
│   └── ...
├── docker-compose.yml
└── .env
```

실행 중인 컨테이너 확인
```bash
docker ps
```

이미 생성된 컨테이너가 있습니다.
![[Pasted image 20260308150810.png]]

새컨테이너를 생성합니다.
`docker-compose.yml`
```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    container_name: product_review_postgres
    restart: always
    environment:
      POSTGRES_DB: product_db
      POSTGRES_USER: product_user
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - product_review_postgres_data:/var/lib/postgresql/data

volumes:
  product_review_postgres_data:
```
- `postgres:16` : PostgreSQL 16 버전 사용
- `POSTGRES_DB` : 생성할 데이터베이스 이름
- `POSTGRES_USER` : 사용자명
- `POSTGRES_PASSWORD` : 비밀번호
- `5433:5432` : 로컬 컴퓨터와 컨테이너 포트 연결
- `postgres_data` : 컨테이너를 지워도 데이터 유지

새 컨테이너 실행
```bash
docker compose up -d
```

새 컨테이너 확인
```bash
docker ps
```
생성한 새 컨테이너인 product_review_postgres 보이는지 확인

컨테이너 내부 접속 확인
```bash
docker exec -it product_review_postgres psql -U product_review_user -d product_review_db
```

확인후 빠져나오기
```sql
\q
```

---
4단계. Django settings.py를 PostgreSQL 기준으로 변경

`mysite/settings.py`
```python
import environ  
from pathlib import Path

env = environ.Env()  
environ.Env.read_env(BASE_DIR / ".env")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5433"),
    }
}
```

```bash
uv pip install django-environ
```

`requirements.txt` 갱신
```
uv pip freeze > requirements.txt
```

`.env`
```env
DB_NAME=product_db
DB_USER=product_user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5433
```

5단계. PostgreSQL에 마이그레이션 적용
```bash
# Django에서 마이그레이션 상태를 확인하는 명령어
python manage.py showmigrations
python manage.py migrate
```

###### 결과
|표시|의미|
|---|---|
|`[X]`|이미 DB에 적용됨|
|`[ ]`|아직 DB에 적용되지 않음|

---
6단계. 기존 SQLite 데이터를 PostgreSQL로 옮기기
SQLite 상태에서 dumpdata 만들기
```bash
python manage.py dumpdata \
--exclude auth.permission \
--exclude contenttypes \
--indent 2 > data.json
```

PostgreSQL 마이그레이션 완료 후 loaddata
```bash
python manage.py loaddata data.json
```

7단계. 데이터가 잘 들어갔는지 확인
Django shell 확인
```python
python manage.py shell

from apps.products.models import Product
from apps.reviews.models import Review
from apps.accounts.models import User

print(Product.objects.count())
print(Review.objects.count())
print(User.objects.count())

exit()
```

관리자 페이지 확인: 이미 관리자 아이디를 생성했으면 생략
```bash
python manage.py createsuperuser
```

API 확인
```bash
curl http://127.0.0.1:8000/products/api/
```

postgresql로 잘 변환 되었는지 확인
```python
python manage.py shell

from django.db import connection  
print(connection.vendor)
```
결과가 이것이면 정상입니다. postgresql

---
admin 관리자페이지 접속
`accounts/admin.py`
```python
from django.contrib import admin
from .models import User


admin.site.register(User)
```

`products/admin.py`
```python
from django.contrib import admin
from .models import Product


admin.site.register(Product)
```

`reviews/admin.py`
```python
from django.contrib import admin
from .models import Review, ReviewImage, ReviewAI


admin.site.register(Review)
admin.site.register(ReviewImage)
admin.site.register(ReviewAI)
```

`interactions/admin.py`
```python
from django.contrib import admin
from .models import ReviewLike, ReviewBookmark, ReviewComment, ReviewReport


admin.site.register(ReviewLike)
admin.site.register(ReviewBookmark)
admin.site.register(ReviewComment)
admin.site.register(ReviewReport)
```

최종적으로 한번더 확인겸 마이그레이트를 해줍니다.
```bash
# Django에서 마이그레이션 상태를 확인하는 명령어
python manage.py showmigrations
python manage.py migrate
```

---
DBeaver PostgreSQL 연결 설정(자신의 env설정과 맞춰야 합니다.)

| 항목            | 값              |
| ------------- | -------------- |
| Database Type | PostgreSQL     |
| Host          | `localhost`    |
| Port          | `5433`         |
| Database      | `product_db`   |
| Username      | `product_user` |
| Password      | `password`     |

DBaever연결은 지난 DRF 이미지를 참조합니다.
[[11 Django(database) SQLite → PostgreSQL 데이터베이스 전환]]

