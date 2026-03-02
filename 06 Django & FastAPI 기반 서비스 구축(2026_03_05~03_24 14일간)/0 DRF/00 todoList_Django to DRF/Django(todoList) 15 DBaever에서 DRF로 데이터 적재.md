(1) DRF에 수집 데이터용 테이블(모델) 만들기
`1-1) 앱 생성 + settings 등록`
```bash
python manage.py startapp reviews
```

`settings.py`
```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "reviews",
]
```

1-2) 모델 작성: `reviews/models.py`
```python
from django.db import models

class CollectedReview(models.Model):
    id = models.BigAutoField(primary_key=True)   # ✅ DB에 이미 있음

    title = models.CharField(max_length=255)
    review = models.TextField()

    doc_id = models.CharField(max_length=255, null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "stg_movie_reviews"
        managed = False   # ✅ Django가 테이블 건드리지 않게

    def __str__(self):
        return self.title
```

필드와 모델과 맞춰줘야 합니다.
![[Pasted image 20260228225422.png]]

만약에 맞지 않으면 DBeaver에 가서 SQL로 추가해줍니다.
이건 id 기본키를 생성하는 sql문
```sql
ALTER TABLE stg_movie_reviews
ADD COLUMN id bigserial PRIMARY KEY;
```

`abc`라는 컬럼이 생김
```sql
ALTER TABLE stg_movie_reviews  
ADD COLUMN abc bigserial;
```


1-3) 마이그레이션
```bash
python manage.py makemigrations  
python manage.py migrate
```

1-4) Admin 등록해서 빠르게 확인 가능하게 하기: `reviews/admin.py`
```python
from django.contrib import admin
from .models import CollectedReview

@admin.register(CollectedReview)
class CollectedReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "doc_id", "collected_at")
    search_fields = ("title", "review")
```

(2) CSV/JSONL 파일을 DRF 프로젝트로 가져오는 Import 커맨드 만들기

생성할 앱 디렉토리
```
your_project/
│
├── manage.py
│
├── mysite/              # (settings.py 있는 프로젝트 폴더)
│   └── settings.py
│
└── reviews/             # 앱 폴더
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── views.py
    ├── serializers.py
    ├── tests.py
    │
    ├── management/
    │   ├── __init__.py
    │   │
    │   └── commands/
    │       ├── __init__.py
    │       └── import_collected_reviews.py
```

2-2) Import 커맨드 코드:
	1️⃣ 파일을 읽고  
	2️⃣ 컬럼을 모델에 맞게 매핑하고  
	3️⃣ 중복(doc_id) 체크하고  
	4️⃣ DB에 대량으로 저장함

👉 즉, 데이터 이관(ETL)의 Load 단계 담당

🔥 이건 언제 쓰는 거냐면
	✔ 크롤링 데이터 처음 적재할 때  
	✔ 대량 데이터 마이그레이션 할 때  
	✔ AI 학습용 데이터 DB로 넣을 때  
	✔ CSV → PostgreSQL 옮길 때

구조 흐름
```
Jupyter (크롤링/정제)
        ↓
CSV / JSONL
        ↓
import_collected_reviews (이 파일)
        ↓
PostgreSQL
        ↓
DRF API
        ↓
HuggingFace 감정분석
```

`reviews/management/commands/import_collected_reviews.py`
```python
import csv
import json
import hashlib
from pathlib import Path
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_datetime

from reviews.models import CollectedReview


def pick(d: dict, candidates: list[str], default=None):
    """여러 후보 키 중 첫 번째로 존재하는 값을 반환"""
    for k in candidates:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return default


def make_doc_id(name: str, description: str, source: str = "") -> str:
    """doc_id가 없을 때 임시로 만들기(내용 기반 해시)"""
    raw = f"{source}||{name}||{description}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:32]


class Command(BaseCommand):
    help = "Import collected reviews from CSV or JSONL into DB."

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="data file path (csv/jsonl)")
        parser.add_argument("--source", default="", help="source name e.g. naver/musinsa")
        parser.add_argument("--limit", type=int, default=0, help="limit rows for test (0=all)")
        parser.add_argument("--batch", type=int, default=1000, help="bulk_create batch size")

    def handle(self, *args, **options):
        path = Path(options["path"])
        source = options["source"].strip()
        limit = options["limit"]
        batch_size = options["batch"]

        if not path.exists():
            raise CommandError(f"File not found: {path}")

        suffix = path.suffix.lower()
        if suffix not in [".csv", ".jsonl"]:
            raise CommandError("Only .csv or .jsonl is supported")

        if suffix == ".csv":
            rows = self._read_csv(path, limit=limit)
        else:
            rows = self._read_jsonl(path, limit=limit)

        total = len(rows)
        self.stdout.write(self.style.NOTICE(f"Loaded {total} rows from {path.name}"))

        to_create = []
        for r in rows:
            # ---- 컬럼 매핑(너 데이터에 맞게 후보 키를 늘릴 수 있음) ----
            name = pick(r, ["name", "title", "subject"], default="(no title)")
            description = pick(r, ["description", "text", "content", "review"], default="")

            doc_id = pick(r, ["doc_id", "id", "document_id", "uuid"], default=None)
            if not doc_id:
                doc_id = make_doc_id(name, description, source=source)

            collected_at_raw = pick(r, ["collected_at", "created_at", "date", "datetime"], default=None)
            collected_at = None
            if collected_at_raw:
                # ISO 문자열이면 parse_datetime 시도
                if isinstance(collected_at_raw, str):
                    collected_at = parse_datetime(collected_at_raw)
                    # 날짜만 있으면 단순 처리(선택)
                    if collected_at is None:
                        try:
                            collected_at = datetime.fromisoformat(collected_at_raw)
                        except Exception:
                            collected_at = None

            obj = CollectedReview(
                doc_id=str(doc_id),
                name=str(name)[:255],
                description=str(description),
                source=source,
                collected_at=collected_at,
            )
            to_create.append(obj)

        # ---- DB 적재 ----
        created_count = 0
        for i in range(0, len(to_create), batch_size):
            chunk = to_create[i:i + batch_size]
        # ignore_conflicts=True => unique(doc_id) 충돌이면 자동 스킵(PostgreSQL 권장)
            CollectedReview.objects.bulk_create(chunk, ignore_conflicts=True, batch_size=batch_size)
            created_count += len(chunk)
            self.stdout.write(f"Inserted batch: {i} ~ {i + len(chunk) - 1}")

        self.stdout.write(self.style.SUCCESS("Done. (Duplicates skipped by doc_id unique)"))

    def _read_csv(self, path: Path, limit: int = 0) -> list[dict]:
        # UTF-8 BOM 대응: utf-8-sig
        data = []
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                data.append(row)
                if limit and (idx + 1) >= limit:
                    break
        return data

    def _read_jsonl(self, path: Path, limit: int = 0) -> list[dict]:
        data = []
        with path.open("r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                data.append(json.loads(line))
                if limit and (idx + 1) >= limit:
                    break
        return data
```


(3) 적재 후 DRF에서 데이터 확인

3-1) Serializer: `reviews/serializers.py`
```python
from rest_framework import serializers
from .models import CollectedReview

class CollectedReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectedReview
        fields = ["id", "title", "review", "doc_id", "collected_at"]
```

3-2) ViewSet: `reviews/views.py`
```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import CollectedReview
from .serializers import CollectedReviewSerializer

class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    데이터 확인용: 읽기 전용 (list, retrieve)
    """
    queryset = CollectedReview.objects.all().order_by("-id")
    serializer_class = CollectedReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
```

3-3) URL 라우팅 `reviews/urls.py`
```python
from rest_framework.routers import DefaultRouter
from .views import CollectedReviewViewSet

router = DefaultRouter()
router.register(r"collected-reviews", CollectedReviewViewSet, basename="collected-reviews")

urlpatterns = router.urls
```

`mysite/urls.py`
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/reviews/", include("reviews.urls")),
]
```

3-4) 확인 방법
- 리스트: `GET /api/collected-reviews/`
- 상세: `GET /api/collected-reviews/1/`
```bash
curl -s http://127.0.0.1:8000/api/collected-reviews/ | head
```

결과
```
서라도 큰 건을 해결하려 하고, 누군가는 그 어긋남을 핑계로 더 위험한 거래를 시작합니다. 이 충돌이 계속 누적되면서, 관객은 올바른 결말보다 납득 가능한 결말을 찾게 되는 쪽으로 감정이 이동합니다. ​ ​ 반전의 쾌감과 씁쓸한 뒷맛 ​ 후반부의 반전은 누가 배신자인가를 넘어, 처음부터 깔아둔 행동들이 어떤 의도로 연결되는지를 다시 보게 만드는 힘이 있습니다. 다만, 이 쾌감은 깔끔하게 정리되지 않고, 돈이 남긴 흔적처럼 뒷맛을 남기는데요. 사건이 마무리되는 방식은 통쾌함과 씁쓸함을 동시에 건드리며, 정의가 이겼다는 선언보다 현실적인 감각을 강하게 남깁니다. 거액의 제작비와 스타 배우들의 출연에도 불구하고 실망감을 안겼던 기존 넷플릭스 오리지널 영화들과 달리, 배우들의 존재감과 장르적 재미를 모두 만끽할 수 있으므로, 가볍게 볼만한 영화 한 편을 찾는다면 추천드립니다. ​ 더 립 스릴러, 액션 2026 조 카나한 블로그 글 더보기","doc_id":"785cf4563133e38b1ca858f923db4d66c2749145","collected_at":null}],"page_size":3,"total_count":90,"page_count":30,"current_page":1,"next":"http://127.0.0.1:8000/api/reviews/collected-reviews/?page=2","previous":null}(DRF_todoList_26221) (.venv) youjung@DESKTOP-PJCRMMU:~/DRF_todoList_26221$ 
```
지금 출력은 DRF가 DB(`stg_movie_reviews`)에서 데이터를 읽어서 **JSON으로 응답**한 거고, pagination도 잘 붙어있다는 의미입니다.

DBeaver의 데이터가 DRF에 잘 적재된것을 확인할수 있습니다.
![[Pasted image 20260228230226.png]]
