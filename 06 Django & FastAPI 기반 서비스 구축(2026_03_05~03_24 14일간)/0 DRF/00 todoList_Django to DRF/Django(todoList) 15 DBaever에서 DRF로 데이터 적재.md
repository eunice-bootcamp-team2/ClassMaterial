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
# Django ORM 모델 정의를 위해 models 모듈 import
from django.db import models


# ============================================================
# 크롤링으로 수집된 영화 리뷰 데이터를 표현하는 Django Model
# ============================================================
class CollectedReview(models.Model):

    # ------------------------------------------------------------
    # 기본 Primary Key
    # ------------------------------------------------------------
    # BigAutoField
    # → 자동 증가하는 큰 정수형 PK
    # → 대량 데이터(크롤링 데이터)에서 안전하게 사용
    id = models.BigAutoField(primary_key=True)


    # ------------------------------------------------------------
    # 리뷰 제목
    # ------------------------------------------------------------
    # CharField
    # → 짧은 문자열 저장
    # max_length=255
    # → PostgreSQL VARCHAR(255)
    title = models.CharField(max_length=255)


    # ------------------------------------------------------------
    # 리뷰 본문
    # ------------------------------------------------------------
    # TextField
    # → 길이 제한 없는 텍스트
    # → 블로그 글 본문 저장
    review = models.TextField()


    # ------------------------------------------------------------
    # 문서 고유 ID
    # ------------------------------------------------------------
    # 크롤링 URL을 SHA1 해시로 만든 값
    # → 동일한 글이 다시 크롤링되어도 중복 저장 방지
    # → PostgreSQL에서는 UNIQUE INDEX로 중복 제어
    doc_id = models.CharField(
        max_length=255,
        null=True,   # DB에 NULL 허용
        blank=True   # Django form에서도 비워둘 수 있음
    )


    # ------------------------------------------------------------
    # 데이터 수집 시각
    # ------------------------------------------------------------
    # 크롤링 파이프라인에서 언제 수집했는지 기록
    # → 데이터 추적 / 데이터 품질 관리 / 파이프라인 관리에 사용
    collected_at = models.DateTimeField(
        null=True,
        blank=True
    )


    # ============================================================
    # Django Meta 설정
    # ============================================================
    class Meta:

        # 실제 PostgreSQL 테이블 이름 지정
        # → Django 기본 이름(app_model)이 아닌
        #   기존 데이터 파이프라인 테이블을 그대로 사용
        db_table = "stg_movie_reviews"

        # managed=False
        # → Django가 이 테이블을 생성/삭제/마이그레이션하지 않음
        # → 이미 PostgreSQL에 존재하는 테이블을 읽기용으로 연결
        managed = False


    # ============================================================
    # Django Admin / Shell 출력용 문자열
    # ============================================================
    def __str__(self):

        # 객체 출력 시 제목 표시
        return self.title
```

필드와 모델과 맞춰줘야 합니다.
![[Pasted image 20260228225422.png]]

만약에 맞지 않으면 DBeaver에 가서 SQL로 추가해줍니다.
이건 id 기본키를 생성하는 sql문
```sql
-- ============================================================
-- stg_movie_reviews 테이블에 기본 키(primary key) 컬럼 추가
-- ============================================================

-- ALTER TABLE
-- → 기존에 존재하는 테이블의 구조를 변경할 때 사용하는 SQL 명령어
ALTER TABLE stg_movie_reviews

-- ADD COLUMN
-- → 새로운 컬럼을 테이블에 추가

-- id
-- → 컬럼 이름 (각 행(row)을 고유하게 식별하는 ID)

-- bigserial
-- → PostgreSQL의 자동 증가 정수 타입
-- → 내부적으로 sequence가 생성되어 값이 1,2,3,4... 자동 증가
-- → 대용량 데이터에도 안전하게 사용 가능 (bigint 기반)

-- PRIMARY KEY
-- → 테이블의 기본 키
-- → 각 행을 고유하게 식별
-- → NULL 허용 안됨
-- → 중복 값 허용 안됨
ADD COLUMN id bigserial PRIMARY KEY;
```

`abc`라는 컬럼이 생김
```sql
-- ============================================================
-- stg_movie_reviews 테이블에 새로운 자동 증가 컬럼 추가
-- ============================================================

-- ALTER TABLE
-- → 이미 존재하는 테이블의 구조를 변경할 때 사용하는 SQL 명령어
ALTER TABLE stg_movie_reviews  

-- ADD COLUMN
-- → 테이블에 새로운 컬럼을 추가하는 명령

-- abc
-- → 새로 생성할 컬럼 이름

-- bigserial
-- → PostgreSQL의 자동 증가 정수 타입
-- → 내부적으로 sequence가 자동 생성됨
-- → 데이터가 추가될 때 값이 1, 2, 3, 4 ... 형태로 자동 증가
-- → 대용량 데이터에서도 사용 가능한 bigint 기반 타입
ADD COLUMN abc bigserial;
```

1-3) 마이그레이션
```bash
python manage.py makemigrations  
python manage.py migrate
```

1-4) Admin 등록해서 빠르게 확인 가능하게 하기: `reviews/admin.py`
```python
# Django 관리자 기능을 사용하기 위해 admin 모듈 import
from django.contrib import admin

# 현재 앱(models.py)에 정의된 CollectedReview 모델 import
from .models import CollectedReview


# ============================================================
# Django Admin에 CollectedReview 모델 등록
# ============================================================

# @admin.register()
# → 해당 모델을 Django 관리자 페이지에 등록하는 데코레이터
# → admin.site.register() 대신 간단히 사용 가능
@admin.register(CollectedReview)


# CollectedReview 모델의 관리자 페이지 설정 클래스
class CollectedReviewAdmin(admin.ModelAdmin):

    # ------------------------------------------------------------
    # 관리자 목록 화면에서 표시할 컬럼 설정
    # ------------------------------------------------------------
    # id           : 데이터 기본 키
    # title        : 리뷰 제목
    # doc_id       : 중복 방지용 문서 ID
    # collected_at : 데이터 수집 시각
    list_display = ("id", "title", "doc_id", "collected_at")


    # ------------------------------------------------------------
    # 관리자 페이지 검색 기능 설정
    # ------------------------------------------------------------
    # title  : 제목 기준 검색
    # review : 본문 기준 검색
    # 관리자 검색창에서 키워드를 입력하면
    # 해당 필드를 기준으로 DB 검색 수행
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
# ============================================================
# CSV / JSONL 파일로 저장된 "수집 리뷰 데이터"를
# Django ORM(CollectedReview 모델)을 통해 DB에 적재하는 커맨드
# ============================================================

import csv                     # CSV 파일을 dict 형태로 읽기 위해 사용
import json                    # JSONL(한 줄당 JSON) 파싱을 위해 사용
import hashlib                 # doc_id 생성(내용 기반 해시)용
from pathlib import Path       # 파일 경로 처리 (OS 독립적)
from datetime import datetime  # 날짜 문자열을 datetime으로 변환할 때 사용

from django.core.management.base import BaseCommand, CommandError  # 커맨드 생성/에러 처리
from django.utils.dateparse import parse_datetime                 # ISO datetime 문자열 파싱 도우미

from reviews.models import CollectedReview  # DB에 저장할 Django 모델


# ============================================================
# 1) pick 함수: 컬럼명이 서로 다른 데이터에 대응하기 위한 유틸
# ============================================================
def pick(d: dict, candidates: list[str], default=None):
    """
    여러 후보 키(candidates) 중에서
    실제 dict(d)에 존재하고 값이 비어있지 않은 첫 번째 값을 반환합니다.

    예)
      r = {"title": "abc", "review": "내용"}
      pick(r, ["name", "title", "subject"]) => "abc"
    """
    for k in candidates:
        # 값이 None 또는 ""(빈문자열)이면 없는 값으로 취급하고 넘어감
        if k in d and d[k] not in (None, ""):
            return d[k]
    return default


# ============================================================
# 2) doc_id 생성 함수: doc_id가 없을 때 "내용 기반" 임시 ID 생성
# ============================================================
def make_doc_id(name: str, description: str, source: str = "") -> str:
    """
    doc_id가 파일에 없거나 비어있을 때 사용하는 임시 doc_id 생성기입니다.
    - source + name + description 을 합쳐서 해시를 만들기 때문에
      같은 내용이면 같은 doc_id가 생성될 확률이 높습니다.
    - sha256 해시 문자열을 만들고, 앞 32자리만 잘라 사용합니다.
    """
    raw = f"{source}||{name}||{description}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:32]


# ============================================================
# 3) Django Management Command 본체
#    실행 예)
#    python manage.py import_collected_reviews --path data.csv --source naver
# ============================================================
class Command(BaseCommand):
    help = "Import collected reviews from CSV or JSONL into DB."

    # ------------------------------------------------------------
    # 커맨드 옵션 설정
    # ------------------------------------------------------------
    def add_arguments(self, parser):
        # --path : 입력 파일 경로 (필수)
        parser.add_argument("--path", required=True, help="data file path (csv/jsonl)")

        # --source : 데이터 출처 메타 정보 (옵션)
        parser.add_argument("--source", default="", help="source name e.g. naver/musinsa")

        # --limit : 테스트용으로 일부 행만 적재하고 싶을 때 사용 (0이면 전체)
        parser.add_argument("--limit", type=int, default=0, help="limit rows for test (0=all)")

        # --batch : bulk_create를 몇 개 단위로 끊어서 넣을지(성능/메모리 조절)
        parser.add_argument("--batch", type=int, default=1000, help="bulk_create batch size")

    # ------------------------------------------------------------
    # 커맨드가 실제로 실행되는 메인 로직
    # ------------------------------------------------------------
    def handle(self, *args, **options):
        # 옵션 값 꺼내기
        path = Path(options["path"])          # 파일 경로
        source = options["source"].strip()    # 출처 문자열(공백 제거)
        limit = options["limit"]              # 적재 제한
        batch_size = options["batch"]         # 배치 크기

        # 파일 존재 여부 체크
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        # 확장자 검사 (csv 또는 jsonl만 허용)
        suffix = path.suffix.lower()
        if suffix not in [".csv", ".jsonl"]:
            raise CommandError("Only .csv or .jsonl is supported")

        # --------------------------------------------------------
        # (1) 파일 읽기
        # --------------------------------------------------------
        if suffix == ".csv":
            rows = self._read_csv(path, limit=limit)
        else:
            rows = self._read_jsonl(path, limit=limit)

        total = len(rows)
        self.stdout.write(self.style.NOTICE(f"Loaded {total} rows from {path.name}"))

        # --------------------------------------------------------
        # (2) 각 row(dict)를 CollectedReview 객체로 변환
        # --------------------------------------------------------
        to_create = []

        for r in rows:
            # ---- 컬럼 매핑(데이터마다 키 이름이 다를 수 있어서 후보 키를 둠) ----
            # 제목 후보: name / title / subject
            name = pick(r, ["name", "title", "subject"], default="(no title)")

            # 본문 후보: description / text / content / review
            description = pick(r, ["description", "text", "content", "review"], default="")

            # doc_id 후보: doc_id / id / document_id / uuid
            doc_id = pick(r, ["doc_id", "id", "document_id", "uuid"], default=None)

            # doc_id가 없으면 내용 기반 해시로 생성(중복 방지용)
            if not doc_id:
                doc_id = make_doc_id(name, description, source=source)

            # 수집 시간 후보: collected_at / created_at / date / datetime
            collected_at_raw = pick(r, ["collected_at", "created_at", "date", "datetime"], default=None)

            collected_at = None

            if collected_at_raw:
                # 문자열이라면 datetime 파싱 시도
                if isinstance(collected_at_raw, str):
                    # 1차: Django parse_datetime (ISO-8601 형태에 강함)
                    collected_at = parse_datetime(collected_at_raw)

                    # 2차: parse_datetime 실패 시, python 표준 fromisoformat 시도
                    if collected_at is None:
                        try:
                            collected_at = datetime.fromisoformat(collected_at_raw)
                        except Exception:
                            collected_at = None

            # ----------------------------------------------------
            # Django 모델 객체 생성 (아직 DB 저장 X)
            # ----------------------------------------------------
            # ⚠️ 주의:
            # CollectedReview 모델 필드명이
            # name/description/source 인지,
            # title/review/doc_id/collected_at 인지
            # 실제 models.py와 반드시 일치해야 합니다.
            obj = CollectedReview(
                doc_id=str(doc_id),
                name=str(name)[:255],            # 제목 길이 제한(255)
                description=str(description),     # 본문
                source=source,                    # 출처
                collected_at=collected_at,        # 수집 시간
            )
            to_create.append(obj)

        # --------------------------------------------------------
        # (3) DB 적재 (bulk_create)
        # --------------------------------------------------------
        # bulk_create는 한 번에 여러 row를 insert해서 성능이 좋습니다.
        # batch_size로 끊어 넣으면 메모리 부담을 줄일 수 있습니다.
        created_count = 0

        for i in range(0, len(to_create), batch_size):
            chunk = to_create[i:i + batch_size]

            # ignore_conflicts=True:
            # - UNIQUE 제약조건(예: doc_id UNIQUE)에 걸리는 데이터는 자동 스킵
            # - 즉 "중복 doc_id"는 insert되지 않고 넘어갑니다.
            CollectedReview.objects.bulk_create(
                chunk,
                ignore_conflicts=True,
                batch_size=batch_size
            )

            created_count += len(chunk)
            self.stdout.write(f"Inserted batch: {i} ~ {i + len(chunk) - 1}")

        self.stdout.write(self.style.SUCCESS("Done. (Duplicates skipped by doc_id unique)"))

    # ============================================================
    # CSV 파일 읽기 함수
    # ============================================================
    def _read_csv(self, path: Path, limit: int = 0) -> list[dict]:
        """
        CSV 파일을 DictReader로 읽어서
        각 행을 dict로 만든 뒤 list로 반환합니다.

        encoding="utf-8-sig":
        - 윈도우/엑셀에서 저장한 CSV에 BOM이 붙어도 깨지지 않도록 처리
        """
        data = []
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)

            for idx, row in enumerate(reader):
                data.append(row)

                # limit이 0이 아니면 해당 개수만큼만 읽고 종료
                if limit and (idx + 1) >= limit:
                    break

        return data

    # ============================================================
    # JSONL 파일 읽기 함수
    # ============================================================
    def _read_jsonl(self, path: Path, limit: int = 0) -> list[dict]:
        """
        JSONL 파일은 한 줄(line)마다 JSON 객체가 있는 형태입니다.
        예)
          {"title":"a","review":"..."}
          {"title":"b","review":"..."}

        각 줄을 json.loads로 dict로 변환 후 list로 반환합니다.
        """
        data = []
        with path.open("r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                line = line.strip()

                # 빈 줄은 스킵
                if not line:
                    continue

                data.append(json.loads(line))

                # limit이 0이 아니면 해당 개수만큼만 읽고 종료
                if limit and (idx + 1) >= limit:
                    break

        return data
```


(3) 적재 후 DRF에서 데이터 확인

3-1) Serializer: `reviews/serializers.py`
```python
# Django REST Framework의 serializer 모듈 import
# → API에서 데이터를 변환(직렬화/역직렬화)할 때 사용
from rest_framework import serializers

# 현재 앱의 CollectedReview 모델 import
# → DB 테이블(stg_movie_reviews)에 매핑된 모델
from .models import CollectedReview


# ============================================================
# CollectedReview 데이터를 API용으로 변환하는 Serializer
# ============================================================
class CollectedReviewSerializer(serializers.ModelSerializer):

    # ------------------------------------------------------------
    # Serializer 설정 클래스
    # ------------------------------------------------------------
    class Meta:

        # 어떤 Django 모델을 기반으로 Serializer를 만들지 지정
        model = CollectedReview

        # API에서 사용할 필드 목록 지정
        # → 모델의 필드 중 아래 항목만 JSON으로 변환됨
        fields = [
            "id",           # DB 기본 키 (Primary Key)
            "title",        # 리뷰 제목
            "review",       # 리뷰 본문
            "doc_id",       # 중복 방지용 문서 ID
            "collected_at"  # 데이터 수집 시각
        ]
```

3-2) ViewSet: `reviews/views.py`
```python
# Django REST Framework의 ViewSet 기능 import
# → 여러 API 기능(list, retrieve 등)을 하나의 클래스에서 처리할 수 있음
from rest_framework import viewsets

# API 접근 권한 설정 클래스 import
# → 인증된 사용자만 수정 가능, 비로그인 사용자는 읽기만 가능
from rest_framework.permissions import IsAuthenticatedOrReadOnly

# 현재 앱의 모델과 Serializer import
from .models import CollectedReview
from .serializers import CollectedReviewSerializer


# ============================================================
# CollectedReview 데이터 조회용 API ViewSet
# ============================================================
class CollectedReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    데이터 확인용 API ViewSet

    ReadOnlyModelViewSet
    → 읽기 전용 ViewSet
    → 아래 API만 자동 생성됨

    GET /reviews/        : 리뷰 목록 조회 (list)
    GET /reviews/{id}/   : 리뷰 상세 조회 (retrieve)
    """

    # ------------------------------------------------------------
    # 조회할 데이터(QuerySet) 설정
    # ------------------------------------------------------------
    # DB에서 CollectedReview 데이터를 모두 가져오고
    # id 기준 내림차순 정렬 (최신 데이터 먼저)
    queryset = CollectedReview.objects.all().order_by("-id")


    # ------------------------------------------------------------
    # 사용할 Serializer 지정
    # ------------------------------------------------------------
    # 모델 데이터를 JSON 형태로 변환할 때 사용
    serializer_class = CollectedReviewSerializer


    # ------------------------------------------------------------
    # API 접근 권한 설정
    # ------------------------------------------------------------
    # IsAuthenticatedOrReadOnly 의미
    #
    # 비로그인 사용자
    #   → GET 요청만 가능 (조회)
    #
    # 로그인 사용자
    #   → GET / POST / PUT / DELETE 가능
    #
    # 하지만 현재 ViewSet이 ReadOnlyModelViewSet이므로
    # 실제로는 GET 요청(list, retrieve)만 제공됨
    permission_classes = [IsAuthenticatedOrReadOnly]
```

3-3) URL 라우팅 `reviews/urls.py`
```python
# ============================================================
# Django REST Framework Router 설정
# ============================================================

# DRF에서 ViewSet을 URL과 자동으로 연결해주는 Router 클래스 import
# → URL 패턴을 직접 작성하지 않아도 API 경로를 자동 생성해줌
from rest_framework.routers import DefaultRouter

# 현재 앱의 ViewSet import
# → CollectedReview 데이터를 조회하는 API ViewSet
from .views import CollectedReviewViewSet


# ============================================================
# Router 생성
# ============================================================

# DefaultRouter
# → DRF에서 가장 기본적으로 사용하는 Router
# → ViewSet을 등록하면 자동으로 REST API URL을 생성
router = DefaultRouter()


# ============================================================
# ViewSet 등록
# ============================================================

# router.register()
# → 특정 URL 경로에 ViewSet을 연결하는 함수
#
# r"collected-reviews"
# → API 기본 URL 경로
# → 예: /collected-reviews/
#
# CollectedReviewViewSet
# → 해당 URL에서 실행될 ViewSet 클래스
#
# basename
# → URL 이름을 만들 때 사용하는 기본 이름
router.register(
    r"collected-reviews",
    CollectedReviewViewSet,
    basename="collected-reviews"
)


# ============================================================
# Django URL 패턴 생성
# ============================================================

# router.urls
# → Router가 자동으로 생성한 URL 패턴 목록
#
# 이 값을 urlpatterns에 연결하면
# 아래 API가 자동으로 생성됩니다.
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
