크롤러 파이썬 코드 + DB + 스케줄러 + Django/DRF

### 전체 흐름
1. 크롤링할 URL 목록을 저장
2. 스케줄러가 1시간마다 실행
3. 크롤러가 URL 10개만 골라서 수집
4. 새 데이터만 DB에 저장
5. 이미 있던 데이터는 중복 체크 후 업데이트
6. DRF API는 그 결과를 사용자에게 보여줌

---
목표
- `crawling` 앱 생성
- 크롤링 대상 링크 저장 모델 만들기
- 크롤링 원본 데이터 저장 모델 만들기
- 실행 로그 모델 만들기
- 관리 명령어(`manage.py` command)로 테스트 크롤링 실행
- 우선은 페이지 접근 + 상품 링크 후보 추출까지만 구현
- 나중에 리뷰 본문 추출로 확장
---
### 1단계: 수동 크롤링 사이트 확보 및 환경설정
- 공개 데이터셋으로 모델 파이프라인 먼저 완성
- 공식 API로 상품 후보 수집
- 허용 범위가 분명한 소스만 제한적으로 수집

크로링 사이트
[다나와](https://search.danawa.com/dsearch.php?addDelivery=N&boost=true&checkedInfo=N&coupangMemberSort=N&defaultPhysicsCategoryCode=9875%7C36916%7C36932%7C0&defaultUICategoryCode=18255394&defaultVaTab=116291&defaultVmTab=7188&isZeroPrice=Y&limit=40&list=list&originalQuery=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC&page=1&priceUnitSort=Y&priceUnitSortOrder=A&query=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC&quickProductYN=N&recommendedSort=N&simpleDescOpen=Y&sort=saveDESC&tab=main&volumeType=va)
[화해화장품](https://www.hwahae.co.kr/search?q=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC&type=goods)
[글로우픽](https://glowpick.co.kr/ranking/search/%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC)

크로링 전용 앱생성
```bash
python manage.py startapp crawling apps/crawling
```

디렉토리 구조
```
backend/
└── apps/
    ├── ai_gateway/
    ├── products/
    ├── reviews/
    └── crawling/
        ├── migrations/
        ├── admin.py
        ├── apps.py
        ├── models.py
        ├── tests.py
        └── views.py
```

settings.py 에 앱 등록 : `backend/mysite/settings.py`
```python
INSTALLED_APPS = [
    ...
    "apps.crawling",
]
```

crawling 앱 디렉토리 확장
```bash
mkdir -p apps/crawling/management/commands
mkdir -p apps/crawling/services
mkdir -p apps/crawling/collectors

touch apps/crawling/management/__init__.py
touch apps/crawling/management/commands/__init__.py
touch apps/crawling/services/__init__.py
touch apps/crawling/collectors/__init__.py
touch apps/crawling/services/http.py
touch apps/crawling/services/parser.py
touch apps/crawling/services/crawl_service.py
touch apps/crawling/management/commands/test_crawl.py
```

최종 구조
```
apps/crawling/
├── migrations/
├── management/
│   └── commands/
│       └── test_crawl.py
├── collectors/          ← 사이트별 크롤러 (3단계 핵심)
│   └── __init__.py
├── services/
│   ├── __init__.py
│   ├── http.py          ← 요청
│   ├── parser.py        ← HTML 파싱
│   └── crawl_service.py ← 전체 실행 흐름
├── __init__.py
├── admin.py
├── apps.py
├── models.py
└── tests.py
```

웹크로링에 필요한 라이브러리 설치
```bash
uv pip install beautifulsoup4 lxml requests
```
---
### 2단계: DB 테이블 구조 만들기
A. 크롤링 대상 링크 테이블
B. 수집 데이터 테이블
C. 실행 로그 테이블

`apps/crawling/models.py`
```python
from django.db import models


class CrawlTarget(models.Model):
    """
    크롤링 대상 URL 저장
    - search: 검색 결과 페이지
    - product: 상품 상세 페이지
    """

    SITE_CHOICES = [
        ("danawa", "다나와"),
        ("hwahae", "화해"),
        ("glowpick", "글로우픽"),
    ]

    TARGET_TYPE_CHOICES = [
        ("search", "검색 페이지"),
        ("product", "상품 상세 페이지"),
    ]

    site = models.CharField(
        max_length=30,
        choices=SITE_CHOICES
    )

    target_type = models.CharField(
        max_length=20,
        choices=TARGET_TYPE_CHOICES,
        default="search"
    )

    keyword = models.CharField(
        max_length=100,
        blank=True
    )

    title = models.CharField(
        max_length=255,
        blank=True
    )

    url = models.URLField(
	    max_length=1000,
        unique=True
    )

    is_active = models.BooleanField(
        default=True
    )

    last_crawled_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["site", "target_type", "-created_at"]
        verbose_name = "크롤링 대상"
        verbose_name_plural = "크롤링 대상 목록"

    def __str__(self):
        return f"{self.site} | {self.target_type} | {self.url}"


class CrawlRawData(models.Model):
    """
    크롤링해서 가져온 원본 데이터 저장
    현재 단계에서는:
    - 검색 페이지에서 추출한 상품 링크 후보
    - 페이지 제목
    - 일부 텍스트
    - 원본 HTML 일부/전체
    등을 저장
    """

    target = models.ForeignKey(
        CrawlTarget,
        on_delete=models.CASCADE,
        related_name="raw_items"
    )

    source_url = models.URLField(max_length=1000)

    page_title = models.CharField(
        max_length=500,
        blank=True
    )

    item_title = models.CharField(
        max_length=500,
        blank=True
    )

    item_url = models.URLField(
	    max_length=1000,
        blank=True
    )

    raw_text = models.TextField(
        blank=True
    )

    raw_html = models.TextField(
        blank=True
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True
    )

    crawled_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-crawled_at"]
        verbose_name = "크롤링 원본 데이터"
        verbose_name_plural = "크롤링 원본 데이터 목록"

    def __str__(self):
        return f"{self.target.site} | {self.item_title or self.page_title}"


class CrawlJobLog(models.Model):
    """
    크롤링 실행 로그
    """

    STATUS_CHOICES = [
        ("success", "성공"),
        ("failed", "실패"),
    ]

    site = models.CharField(
        max_length=30
    )

    command_name = models.CharField(
        max_length=100,
        default="test_crawl"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    total_targets = models.PositiveIntegerField(
        default=0
    )

    success_count = models.PositiveIntegerField(
        default=0
    )

    fail_count = models.PositiveIntegerField(
        default=0
    )

    message = models.TextField(
        blank=True
    )

    started_at = models.DateTimeField(
        auto_now_add=True
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "크롤링 실행 로그"
        verbose_name_plural = "크롤링 실행 로그 목록"

    def __str__(self):
        return f"{self.site} | {self.status} | {self.started_at}"
```

`apps/crawling/admin.py`
```python
from django.contrib import admin
from .models import CrawlTarget, CrawlRawData, CrawlJobLog


@admin.register(CrawlTarget)
class CrawlTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "target_type",
        "keyword",
        "title",
        "is_active",
        "last_crawled_at",
        "created_at",
    )
    list_filter = ("site", "target_type", "is_active")
    search_fields = ("keyword", "title", "url")
    ordering = ("site", "target_type", "-created_at")


@admin.register(CrawlRawData)
class CrawlRawDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target",
        "item_title",
        "item_url",
        "crawled_at",
    )
    list_filter = ("target__site", "crawled_at")
    search_fields = ("item_title", "item_url", "page_title")
    ordering = ("-crawled_at",)


@admin.register(CrawlJobLog)
class CrawlJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "command_name",
        "status",
        "total_targets",
        "success_count",
        "fail_count",
        "started_at",
        "finished_at",
    )
    list_filter = ("site", "status")
    search_fields = ("site", "message")
    ordering = ("-started_at",)
```

`apps/crawling/apps.py`
```python
from django.apps import AppConfig

class CrawlingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.crawling"
```


마이그레이션
```bash
python manage.py makemigrations crawling
python manage.py migrate
```

테스트 대상 링크 먼저 DB에 넣기
Django shell에서 넣는 방식으로 먼저 진행하겠습니다.
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlTarget

targets = [
    {
        "site": "danawa",
        "target_type": "search",
        "keyword": "수분크림",
        "title": "다나와 수분크림 검색",
        "url": "https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC",
    },
    {
        "site": "hwahae",
        "target_type": "search",
        "keyword": "수분크림",
        "title": "화해 수분크림 검색",
        "url": "https://www.hwahae.co.kr/search?q=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC&type=goods",
    },
    {
        "site": "glowpick",
        "target_type": "search",
        "keyword": "수분크림",
        "title": "글로우픽 수분크림 검색",
        "url": "https://glowpick.co.kr/ranking/search/%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC",
    },
]

for item in targets:
    CrawlTarget.objects.get_or_create(
        url=item["url"],
        defaults=item
    )

print("등록 완료")
```
정상적으로 나오면 `exit()` 로 빠져나옵니다.


HTTP 요청 서비스 작성
`apps/crawling/services/http.py`
```python
import requests


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}


def fetch_page(url: str, timeout: int = 15) -> requests.Response:
    response = requests.get(
        url,
        headers=HEADERS,
        timeout=timeout
    )
    response.raise_for_status()
    return response
```

파서 작성
지금은 1차 테스트이기 때문에  
“상품 상세 링크 후보를 찾는 것”까지만 구현합니다.
`apps/crawling/services/parser.py`
```python
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def get_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def extract_page_info(html: str) -> dict:
    soup = get_soup(html)
    text = soup.get_text(" ", strip=True)

    return {
        "title": soup.title.get_text(strip=True) if soup.title else "",
        "a_count": len(soup.select("a[href]")),
        "contains_review_word": "리뷰" in text,
        "contains_keyword": "수분크림" in text,
        "text_preview": text[:500],
    }


def extract_candidate_links(site: str, base_url: str, html: str) -> list[dict]:
    soup = get_soup(html)
    candidates = []

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(base_url, href)
        keep = False

        if site == "danawa":
            if "prod.danawa.com" in full_url:
                keep = True

        elif site == "hwahae":
            if "hwahae.co.kr" in full_url and (
                "/products/" in full_url
                or "/product/" in full_url
                or "/goods/" in full_url
            ):
                keep = True

        elif site == "glowpick":
            if "glowpick.co.kr" in full_url and (
                "/product/" in full_url
                or "/products/" in full_url
                or "/ranking/" in full_url
            ):
                keep = True

        if keep:
            candidates.append({
                "title": text[:255],
                "url": full_url,
            })

    unique_items = []
    seen = set()

    for item in candidates:
        if item["url"] not in seen:
            seen.add(item["url"])
            unique_items.append(item)

    return unique_items
```

크롤링 서비스 작성
`apps/crawling/services/crawl_service.py`
```python
from django.utils import timezone

from apps.crawling.models import CrawlRawData
from .http import fetch_page
from .parser import extract_page_info, extract_candidate_links


def crawl_search_target(target):
    """
    검색 페이지를 테스트 크롤링해서:
    - 페이지 정보 추출
    - 상품 상세 링크 후보 저장
    """

    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    candidate_links = extract_candidate_links(
        site=target.site,
        base_url=target.url,
        html=html
    )

    # 페이지 자체 정보 1건 저장
    CrawlRawData.objects.create(
        target=target,
        source_url=target.url,
        page_title=page_info["title"],
        raw_text=page_info["text_preview"],
        raw_html=html[:5000],  # 너무 길어서 앞부분만 저장
        extra_data={
            "a_count": page_info["a_count"],
            "contains_review_word": page_info["contains_review_word"],
            "contains_keyword": page_info["contains_keyword"],
            "type": "page_info",
        }
    )

    # 후보 링크 저장
    for item in candidate_links[:20]:
        CrawlRawData.objects.create(
            target=target,
            source_url=target.url,
            page_title=page_info["title"],
            item_title=item["title"],
            item_url=item["url"],
            raw_text="",
            raw_html="",
            extra_data={
                "type": "candidate_link"
            }
        )

    target.last_crawled_at = timezone.now()
    target.save(update_fields=["last_crawled_at"])

    return {
        "page_title": page_info["title"],
        "candidate_count": len(candidate_links),
    }
```

management command 작성
`apps/crawling/management/commands/test_crawl.py`
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlTarget, CrawlJobLog
from apps.crawling.services.crawl_service import crawl_search_target


class Command(BaseCommand):
    help = "크롤링 대상(search 페이지)에 대해 테스트 크롤링을 수행합니다."

    def handle(self, *args, **options):
        targets = CrawlTarget.objects.filter(
            is_active=True,
            target_type="search"
        )

        total_targets = targets.count()
        success_count = 0
        fail_count = 0

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="test_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message="테스트 크롤링 시작",
        )

        self.stdout.write(self.style.SUCCESS("테스트 크롤링 시작"))

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_search_target(target)
                success_count += 1

                site_summary[target.site] = site_summary.get(target.site, 0) + 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"성공 - title={result['page_title']} / candidate_count={result['candidate_count']}"
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f"실패 - {str(e)}")
                )

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = f"사이트별 처리 수: {site_summary}"
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\n테스트 크롤링 종료")
        self.stdout.write(
            self.style.SUCCESS(
                f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count}"
            )
        )
```

실행
```bash
python manage.py test_crawl
```

테스트 성공한 결과
![[Pasted image 20260315130853.png]]

실행 후 확인할 것
관리자 페이지나 shell에서 확인

CrawlTarget
- `last_crawled_at` 값이 들어갔는지
    
CrawlRawData
- 페이지 정보 1건 이상 저장됐는지
- 상품 링크 후보가 저장됐는지
    
CrawlJobLog
- 성공/실패 로그가 남았는지

---
### 3단계: 크롤러를 함수로 분리

```
사이트별 요청 함수  
→ 사이트별 파싱 함수  
→ 공통 저장 함수  
→ 실행 orchestration 함수
```
크롤링 로직과 저장 로직을 분리해야 나중에 유지보수가 쉬워집니다.
예를 들어:
- 다나와는 `prod.danawa.com` 링크를 찾는 방식
- 화해는 상품 링크 패턴이 다름
- 글로우픽은 랭킹 구조가 다름
    
이걸 한 파일에 다 섞으면 나중에 너무 복잡해집니다.

현재는 `crawl_service.py` 안에 요청 + 파싱 + 저장이 같이 들어 있는 상태
```
crawl_service.py
 ├ fetch_page() 호출
 ├ extract_page_info() 호출
 ├ extract_candidate_links() 호출
 └ CrawlRawData.objects.create() 저장
```
그래서 3단계의 핵심은 `crawl_service.py`에 들어있는 사이트별 크롤링 책임과 저장 책임을 밖으로 빼는 것입니다.

지금 구조의 문제를 먼저 정확히 짚으면
현재 `crawl_service.py`는 아래 4가지 일을 동시에 하고 있습니다.
1. 페이지 요청
2. HTML 파싱
3. 사이트별 링크 후보 추출
4. DB 저장
    
테스트 단계에서는 괜찮지만, 사이트가 늘어나면 아래 문제가 생깁니다.
- 다나와만의 규칙
- 화해만의 규칙
- 글로우픽만의 규칙
    
이걸 전부 `crawl_service.py` 안에서 처리하게 됨

그러면 나중에 `if target.site == "danawa"` 같은 코드가 늘어나서  
파일이 금방 복잡해집니다.

그래서 3단계에서 바꿔야 하는 목표
`crawl_service.py`는 흐름 제어만 하고,  
실제 사이트별 크롤링은 `collectors/` 로 분리하는 것입니다.

즉, 이렇게 바꿔야 합니다.
```
test_crawl.py
   ↓
crawl_service.py     ← orchestration만 담당
   ↓
collectors/
   ├ danawa_collector.py
   ├ hwahae_collector.py
   └ glowpick_collector.py
   ↓
parser.py / http.py
   ↓
저장 함수(save 서비스)
```

`1.` `services/http.py`
역할: HTTP 요청만 담당

예:
- `requests.get()`
- header 설정
- timeout 설정
    
즉, 페이지를 가져오는 일만 하는 파일

---
`2.` `services/parser.py`
역할: HTML 분석 공통 함수

예:
- `extract_page_info()`
- `extract_candidate_links()`
    
하지만 여기서 중요한 건 이 파일은 공통 파서 정도만 두고,  
사이트별 파싱은 collector 파일로 넘기는 게 더 좋습니다.

즉:
- 공통 함수: `get_soup()`
- 간단한 공통 텍스트 처리
    
---
`3.` `collectors/`
역할: 사이트별 크롤러의 핵심

여기가 바로 3단계의 핵심 파일들입니다.
예:
- `danawa_collector.py`
- `hwahae_collector.py`
- `glowpick_collector.py`
    
각 파일은 해당 사이트만 책임집니다.

예:
- 다나와 링크 규칙
- 화해 링크 규칙
- 글로우픽 링크 규칙
    
---
`4.` `services/save_service.py`
역할: DB 저장만 담당

예:
- 페이지 정보 저장
- candidate 링크 저장
- last_crawled_at 갱신
- 로그 저장

즉, 크롤링과 저장을 분리

---
`5.` `services/crawl_service.py`
역할: 전체 흐름 제어

예:
- target.site 확인
- 맞는 collector 호출
- collector 결과를 save_service에 전달
    
즉, 여기서는 더 이상 직접 `CrawlRawData.objects.create()` 하지 않습니다.

---
### 최종 구조
```
apps/crawling/
├── collectors/                       # 3단계 핵심: 사이트별 크롤러
│   ├── __init__.py                   # collectors 패키지 인식 파일
│   ├── danawa_collector.py           # 다나와 검색 페이지 크롤러
│   ├── hwahae_collector.py           # 화해 검색 페이지 크롤러
│   └── glowpick_collector.py         # 글로우픽 검색 페이지 크롤러
│
├── services/                         # 공통 서비스 로직
│   ├── __init__.py                   # services 패키지 인식 파일
│   ├── http.py                       # HTTP 요청 전용
│   ├── parser.py                     # 공통 HTML 파싱 전용
│   ├── save_service.py               # DB 저장 로직 전용
│   └── crawl_service.py              # 전체 흐름 제어 전용
│
├── management/
│   └── commands/
│       └── test_crawl.py             # manage.py 명령어 실행 파일
│
├── models.py                         # CrawlTarget / CrawlRawData / CrawlJobLog
└── admin.py                          # Django Admin 등록
```

추가 생성할 파일
```bash
touch apps/crawling/collectors/danawa_collector.py
touch apps/crawling/collectors/hwahae_collector.py
touch apps/crawling/collectors/glowpick_collector.py

touch apps/crawling/services/save_service.py
```

위의 구조동작
```
python manage.py test_crawl
        ↓
test_crawl.py
        ↓
crawl_service.py
        ↓
site에 따라 collector 선택
        ├── danawa_collector.py
        ├── hwahae_collector.py
        └── glowpick_collector.py
        ↓
save_service.py
        ↓
CrawlRawData 저장 + last_crawled_at 갱신
```
---
`apps/crawling/collectors/__init__.py`
```python
# collectors 패키지 인식용 파일
```

`apps/crawling/collectors/danawa_collector.py` : 다나와 전용 링크 추출
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_danawa_search(target) -> dict:
    """
    다나와 검색 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "prod.danawa.com" not in full_url:
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "danawa",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```
역할:
- 다나와 검색 페이지 요청
- 페이지 정보 추출
- 상품 상세 링크 후보 추출

---
`apps/crawling/collectors/hwahae_collector.py` : 화해 전용 링크 추출
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_hwahae_search(target) -> dict:
    """
    화해 검색 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "hwahae.co.kr" not in full_url:
            continue

        if not (
            "/product/" in full_url
            or "/products/" in full_url
            or "/goods/" in full_url
        ):
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "hwahae",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```
역할:
- 화해 검색 페이지 요청
- 페이지 정보 추출
- 상품 상세 링크 후보 추출
---
`apps/crawling/collectors/glowpick_collector.py` : 글로우픽 전용 링크 추출
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_glowpick_search(target) -> dict:
    """
    글로우픽 검색/랭킹 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "glowpick.co.kr" not in full_url:
            continue

        if not (
            "/product/" in full_url
            or "/products/" in full_url
            or "/ranking/" in full_url
        ):
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "glowpick",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```
역할:
- 글로우픽 검색/랭킹 페이지 요청
- 페이지 정보 추출
- 상품 상세 링크 후보 추출

---
`apps/crawling/services/__init__.py`
```python
# services 패키지 인식용 파일
```

`apps/crawling/services/http.py` : HTTP 요청 전용 (수정사항 없음)
```python
import requests


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}


def fetch_page(url: str, timeout: int = 15) -> requests.Response:
    """
    주어진 URL에 GET 요청을 보내고 응답 객체를 반환합니다.
    """
    response = requests.get(
        url,
        headers=HEADERS,
        timeout=timeout
    )
    response.raise_for_status()
    return response
```
역할:
- HTTP 요청만 담당
- 헤더, timeout, 예외 발생 처리

---
`apps/crawling/services/parser.py` : 공통 HTML 파싱 전용
```python
from bs4 import BeautifulSoup


def get_soup(html: str) -> BeautifulSoup:
    """
    HTML 문자열을 BeautifulSoup 객체로 변환합니다.
    """
    return BeautifulSoup(html, "lxml")


def extract_page_info(html: str) -> dict:
    """
    페이지의 공통 정보를 추출합니다.
    """
    soup = get_soup(html)
    text = soup.get_text(" ", strip=True)

    return {
        "title": soup.title.get_text(strip=True) if soup.title else "",
        "a_count": len(soup.select("a[href]")),
        "contains_review_word": "리뷰" in text,
        "contains_keyword": "수분크림" in text,
        "text_preview": text[:500],
    }
    
# extract_candidate_links() 함수는 공통 파서에서 제거하고 사이트별 collector로 이동한 것
# 링크 추출은 사이트별 규칙이므로 collector의 각각 파일로 이동합니다.
```
역할:
- 공통 HTML 파싱만 담당
- 사이트 독립적인 공통 정보 추출

---
`apps/crawling/services/save_service.py` : DB 저장 전용
```python
from django.utils import timezone

from apps.crawling.models import CrawlRawData


def save_search_result(target, result: dict) -> None:
    """
    검색 페이지 크롤링 결과를 DB에 저장합니다.
    """
    page_info = result["page_info"]
    candidate_links = result["candidate_links"]
    html = result["html"]

    # 페이지 자체 정보 저장
    CrawlRawData.objects.create(
        target=target,
        source_url=target.url,
        page_title=page_info["title"],
        raw_text=page_info["text_preview"],
        raw_html=html[:5000],
        extra_data={
            "a_count": page_info["a_count"],
            "contains_review_word": page_info["contains_review_word"],
            "contains_keyword": page_info["contains_keyword"],
            "type": "page_info",
        }
    )

    # 후보 링크 저장
    for item in candidate_links:
        CrawlRawData.objects.create(
            target=target,
            source_url=target.url,
            page_title=page_info["title"],
            item_title=item["title"],
            item_url=item["url"],
            raw_text="",
            raw_html="",
            extra_data={
                "type": "candidate_link",
            }
        )

    # 마지막 크롤링 시간 갱신
    target.last_crawled_at = timezone.now()
    target.save(update_fields=["last_crawled_at"])
```
역할:
- DB 저장만 담당
- 페이지 정보 저장
- 후보 링크 저장
- 마지막 크롤링 시간 갱신

`apps/crawling/services/crawl_service.py` : 전체 흐름 제어 전용
```python
from apps.crawling.collectors.danawa_collector import collect_danawa_search
from apps.crawling.collectors.hwahae_collector import collect_hwahae_search
from apps.crawling.collectors.glowpick_collector import collect_glowpick_search
from apps.crawling.services.save_service import save_search_result


def crawl_search_target(target) -> dict:
    """
    CrawlTarget(site, search 타입)에 맞는 collector를 선택해서
    크롤링을 수행하고, 결과를 저장한 뒤 요약 정보를 반환합니다.
    """

    if target.site == "danawa":
        result = collect_danawa_search(target)

    elif target.site == "hwahae":
        result = collect_hwahae_search(target)

    elif target.site == "glowpick":
        result = collect_glowpick_search(target)

    else:
        raise ValueError(f"지원하지 않는 사이트입니다: {target.site}")

    save_search_result(target, result)

    return {
        "page_title": result["page_info"]["title"],
        "candidate_count": len(result["candidate_links"]),
    }
```
역할:
- 전체 흐름 제어만 담당
- 사이트에 따라 알맞은 collector 호출
- 저장 서비스 호출

---
`apps/crawling/management/commands/test_crawl.py` : 명령어 실행 전용 (수정사항없음)
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlTarget, CrawlJobLog
from apps.crawling.services.crawl_service import crawl_search_target


class Command(BaseCommand):
    help = "크롤링 대상(search 페이지)에 대해 테스트 크롤링을 수행합니다."

    def handle(self, *args, **options):
        targets = CrawlTarget.objects.filter(
            is_active=True,
            target_type="search"
        )

        total_targets = targets.count()
        success_count = 0
        fail_count = 0

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="test_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message="테스트 크롤링 시작",
        )

        self.stdout.write(self.style.SUCCESS("테스트 크롤링 시작"))

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_search_target(target)
                success_count += 1

                site_summary[target.site] = site_summary.get(target.site, 0) + 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"성공 - title={result['page_title']} / candidate_count={result['candidate_count']}"
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f"실패 - {str(e)}")
                )

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = f"사이트별 처리 수: {site_summary}"
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\n테스트 크롤링 종료")
        self.stdout.write(
            self.style.SUCCESS(
                f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count}"
            )
        )
```
역할:
- Django 명령어 실행 파일
- active search 대상 조회
- crawl_service 호출
- 실행 로그 저장

---
이 구조의 장점
이제부터는 사이트 하나가 바뀌어도  
예를 들어 다나와 구조가 바뀌면:
- `danawa_collector.py` 만 수정하면 됩니다.
    
화해만 바뀌면:
- `hwahae_collector.py` 만 수정하면 됩니다.
    
즉, 사이트별 책임이 분리되었기 때문에 유지보수가 쉬워집니다.
3단계는 2단계 테스트와 동일한 상태이며 구조만 분리한것입니다.

테스트 다시 실행
```bash
python manage.py test_crawl
```

결과 성공
![[Pasted image 20260315135950.png]]

---
### 4단계: DB 저장 로직 분리

디렉토리 구조
```
apps/crawling/
├── collectors/
│   ├── __init__.py
│   ├── danawa_collector.py
│   ├── hwahae_collector.py
│   └── glowpick_collector.py
│
├── services/
│   ├── __init__.py
│   ├── http.py
│   ├── parser.py
│   ├── repository.py        # [4단계 추가] ORM/DB 직접 접근 전용
│   ├── save_service.py      # [4단계 수정] 저장 흐름 전용
│   └── crawl_service.py     # [4단계 수정] 저장 결과 요약만 받음
│
├── management/
│   └── commands/
│       └── test_crawl.py    # [4단계 수정] create/update 결과 출력
│
├── migrations/
├── models.py                # [4단계 수정] unique_key, record_type 추가
├── admin.py                 # [4단계 수정] record_type, unique_key 확인 가능
└── tests.py                 # [4단계 추가] 중복 저장 방지 테스트
```

파일 생성
```bash
touch apps/crawling/services/repository.py
```

`apps/crawling/models.py`
```python
from django.db import models


class CrawlTarget(models.Model):
    """
    크롤링 대상 URL 저장
    - search: 검색 결과 페이지
    - product: 상품 상세 페이지
    """

    SITE_CHOICES = [
        ("danawa", "다나와"),
        ("hwahae", "화해"),
        ("glowpick", "글로우픽"),
    ]

    TARGET_TYPE_CHOICES = [
        ("search", "검색 페이지"),
        ("product", "상품 상세 페이지"),
    ]

    site = models.CharField(
        max_length=30,
        choices=SITE_CHOICES
    )

    target_type = models.CharField(
        max_length=20,
        choices=TARGET_TYPE_CHOICES,
        default="search"
    )

    keyword = models.CharField(
        max_length=100,
        blank=True
    )

    title = models.CharField(
        max_length=255,
        blank=True
    )

    url = models.URLField(
        max_length=1000,
        unique=True
    )

    is_active = models.BooleanField(
        default=True
    )

    last_crawled_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["site", "target_type", "-created_at"]
        verbose_name = "크롤링 대상"
        verbose_name_plural = "크롤링 대상 목록"

    def __str__(self):
        return f"{self.site} | {self.target_type} | {self.url}"


class CrawlRawData(models.Model):
    """
    크롤링해서 가져온 원본 데이터 저장

    [4단계 수정]
    - record_type 추가:
      page_info / candidate_link 같은 레코드 종류를 명확히 구분
    - unique_key 추가:
      같은 데이터가 다시 들어와도 update_or_create 가능하게 함
    - 이 필드 덕분에 '새 데이터만 저장 / 기존 데이터는 업데이트' 전략 구현 가능
    """

    RECORD_TYPE_CHOICES = [
        ("page_info", "페이지 정보"),
        ("candidate_link", "후보 링크"),
    ]

    target = models.ForeignKey(
        CrawlTarget,
        on_delete=models.CASCADE,
        related_name="raw_items"
    )

    source_url = models.URLField(max_length=1000)

    page_title = models.CharField(
        max_length=255,
        blank=True
    )

    item_title = models.CharField(
        max_length=255,
        blank=True
    )

    item_url = models.URLField(
        max_length=1000,
        blank=True
    )

    raw_text = models.TextField(
        blank=True
    )

    raw_html = models.TextField(
        blank=True
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True
    )

    # [4단계 추가 시작]
    record_type = models.CharField(
        max_length=30,
        choices=RECORD_TYPE_CHOICES,
        default="candidate_link",
        db_index=True,
    )

    unique_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        blank=True,
        null=False,
    )
    # [4단계 추가 끝]

    crawled_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-crawled_at"]
        verbose_name = "크롤링 원본 데이터"
        verbose_name_plural = "크롤링 원본 데이터 목록"
        indexes = [
            # [4단계 추가] 자주 조회할 조합에 인덱스 추가
            models.Index(fields=["target", "record_type"]),
            models.Index(fields=["source_url"]),
            models.Index(fields=["item_url"]),
        ]

    def __str__(self):
        return f"{self.target.site} | {self.record_type} | {self.item_title or self.page_title}"


class CrawlJobLog(models.Model):
    """
    크롤링 실행 로그
    """

    STATUS_CHOICES = [
        ("success", "성공"),
        ("failed", "실패"),
    ]

    site = models.CharField(
        max_length=30
    )

    command_name = models.CharField(
        max_length=100,
        default="test_crawl"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    total_targets = models.PositiveIntegerField(
        default=0
    )

    success_count = models.PositiveIntegerField(
        default=0
    )

    fail_count = models.PositiveIntegerField(
        default=0
    )

    message = models.TextField(
        blank=True
    )

    started_at = models.DateTimeField(
        auto_now_add=True
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "크롤링 실행 로그"
        verbose_name_plural = "크롤링 실행 로그 목록"

    def __str__(self):
        return f"{self.site} | {self.status} | {self.started_at}"
```

`apps/crawling/admin.py`
```python
from django.contrib import admin
from .models import CrawlTarget, CrawlRawData, CrawlJobLog


@admin.register(CrawlTarget)
class CrawlTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "target_type",
        "keyword",
        "title",
        "is_active",
        "last_crawled_at",
        "created_at",
    )
    list_filter = ("site", "target_type", "is_active")
    search_fields = ("keyword", "title", "url")
    ordering = ("site", "target_type", "-created_at")


@admin.register(CrawlRawData)
class CrawlRawDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target",
        "record_type",   # [4단계 추가] 어떤 종류 데이터인지 바로 확인
        "item_title",
        "item_url",
        "unique_key",    # [4단계 추가] 중복 방지 키 확인
        "crawled_at",
    )
    list_filter = ("target__site", "record_type", "crawled_at")
    search_fields = ("item_title", "item_url", "page_title", "unique_key")
    ordering = ("-crawled_at",)


@admin.register(CrawlJobLog)
class CrawlJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "command_name",
        "status",
        "total_targets",
        "success_count",
        "fail_count",
        "started_at",
        "finished_at",
    )
    list_filter = ("site", "status")
    search_fields = ("site", "message")
    ordering = ("-started_at",)
```

`apps/crawling/services/parser.py`
```python
from bs4 import BeautifulSoup


def get_soup(html: str) -> BeautifulSoup:
    """
    HTML 문자열을 BeautifulSoup 객체로 변환합니다.
    """
    return BeautifulSoup(html, "lxml")


def extract_page_info(html: str) -> dict:
    """
    페이지의 공통 정보를 추출합니다.
    """
    soup = get_soup(html)
    text = soup.get_text(" ", strip=True)

    return {
        "title": soup.title.get_text(strip=True) if soup.title else "",
        "a_count": len(soup.select("a[href]")),
        "contains_review_word": "리뷰" in text,
        "contains_keyword": "수분크림" in text,
        "text_preview": text[:500],
    }

# 3단계에서 이미 extract_candidate_links()는 제거된 상태 유지
# [4단계에서는 parser 수정 없음]
```

`apps/crawling/collectors/danawa_collector.py`
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_danawa_search(target) -> dict:
    """
    다나와 검색 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "prod.danawa.com" not in full_url:
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "danawa",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```

`apps/crawling/collectors/hwahae_collector.py`
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_hwahae_search(target) -> dict:
    """
    화해 검색 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "hwahae.co.kr" not in full_url:
            continue

        if not (
            "/product/" in full_url
            or "/products/" in full_url
            or "/goods/" in full_url
        ):
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "hwahae",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```

`apps/crawling/collectors/glowpick_collector.py`
```python
from urllib.parse import urljoin

from apps.crawling.services.http import fetch_page
from apps.crawling.services.parser import extract_page_info, get_soup


def collect_glowpick_search(target) -> dict:
    """
    글로우픽 검색/랭킹 페이지를 수집해서
    페이지 기본 정보와 상품 상세 링크 후보를 반환합니다.
    """
    response = fetch_page(target.url)
    html = response.text

    page_info = extract_page_info(html)
    soup = get_soup(html)

    candidates = []
    seen = set()

    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        text = a.get_text(" ", strip=True)

        if not href:
            continue

        full_url = urljoin(target.url, href)

        if "glowpick.co.kr" not in full_url:
            continue

        if not (
            "/product/" in full_url
            or "/products/" in full_url
            or "/ranking/" in full_url
        ):
            continue

        if full_url in seen:
            continue

        seen.add(full_url)

        candidates.append({
            "title": text[:255],
            "url": full_url,
        })

    return {
        "site": "glowpick",
        "page_info": page_info,
        "candidate_links": candidates[:20],
        "html": html,
    }
```

`apps/crawling/services/repository.py` 추가
```python
from apps.crawling.models import CrawlRawData


# [4단계 추가]
# 이 파일은 DB 직접 접근(ORM)만 담당합니다.
# save_service.py 에서 비즈니스 흐름을 짜고,
# repository.py 에서는 create/update/get_or_create/update_or_create만 담당합니다.


def upsert_raw_data(unique_key: str, defaults: dict):
    """
    unique_key 기준으로 CrawlRawData를 update_or_create 합니다.
    """
    obj, created = CrawlRawData.objects.update_or_create(
        unique_key=unique_key,
        defaults=defaults,
    )
    return obj, created
```

`apps/crawling/services/save_service.py` 수정
```python
import hashlib

from django.db import transaction
from django.utils import timezone

from apps.crawling.services.repository import upsert_raw_data


# [4단계 수정]
# 기존에는 unique_key에 URL 전체를 그대로 넣어서
# 다나와처럼 긴 URL에서 varchar(255) 초과 문제가 발생했습니다.
# 그래서 이제는 원문 문자열을 sha256 해시로 변환해서
# 항상 고정 길이 unique_key를 저장하도록 수정합니다.


def make_hash(value: str) -> str:
    """
    문자열을 SHA256 해시값(64자리 고정 길이)으로 변환합니다.
    """
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_page_info_unique_key(target) -> str:
    raw = f"{target.site}:page_info:{target.url}"
    return make_hash(raw)


def build_candidate_unique_key(target, item_url: str) -> str:
    raw = f"{target.site}:candidate_link:{item_url}"
    return make_hash(raw)


def build_page_info_defaults(target, result: dict) -> dict:
    """
    page_info 레코드 저장용 defaults 조립
    """
    page_info = result["page_info"]
    html = result["html"]

    return {
        "target": target,
        "source_url": target.url,
        "page_title": page_info["title"][:500],   # 방어적 슬라이싱
        "item_title": "",
        "item_url": "",
        "raw_text": page_info["text_preview"],
        "raw_html": html[:5000],
        "record_type": "page_info",
        "extra_data": {
            "a_count": page_info["a_count"],
            "contains_review_word": page_info["contains_review_word"],
            "contains_keyword": page_info["contains_keyword"],
        },
    }


def build_candidate_defaults(target, page_title: str, item: dict) -> dict:
    """
    candidate_link 레코드 저장용 defaults 조립
    """
    return {
        "target": target,
        "source_url": target.url,
        "page_title": page_title[:500],      # 방어적 슬라이싱
        "item_title": item["title"][:500],   # 방어적 슬라이싱
        "item_url": item["url"],
        "raw_text": "",
        "raw_html": "",
        "record_type": "candidate_link",
        "extra_data": {},
    }


@transaction.atomic
def save_search_result(target, result: dict) -> dict:
    """
    검색 결과를 DB에 저장하되,
    - page_info는 unique_key로 1건 유지
    - candidate_link는 item_url 기준으로 중복 저장 방지
    - 새 데이터는 create
    - 기존 데이터는 update
    """
    created_count = 0
    updated_count = 0

    page_info = result["page_info"]
    candidate_links = result["candidate_links"]

    # 1. 페이지 정보 upsert
    page_info_key = build_page_info_unique_key(target)
    _, created = upsert_raw_data(
        unique_key=page_info_key,
        defaults={
            **build_page_info_defaults(target, result),
            "unique_key": page_info_key,
        }
    )
    if created:
        created_count += 1
    else:
        updated_count += 1

    # 2. 후보 링크 upsert
    for item in candidate_links:
        candidate_key = build_candidate_unique_key(target, item["url"])

        # 필요하면 한 번만 디버깅
        # print("candidate title len =", len(item["title"]))
        # print("candidate url len =", len(item["url"]))
        # print("candidate unique_key len =", len(candidate_key))
        # print("page title len =", len(page_info["title"]))

        _, created = upsert_raw_data(
            unique_key=candidate_key,
            defaults={
                **build_candidate_defaults(target, page_info["title"], item),
                "unique_key": candidate_key,
            }
        )

        if created:
            created_count += 1
        else:
            updated_count += 1

    # 3. 마지막 크롤링 시간 갱신
    target.last_crawled_at = timezone.now()
    target.save(update_fields=["last_crawled_at"])

    return {
        "page_title": page_info["title"],
        "candidate_count": len(candidate_links),
        "created_count": created_count,
        "updated_count": updated_count,
    }
```

`apps/crawling/services/crawl_service.py` 수정
```python
from apps.crawling.collectors.danawa_collector import collect_danawa_search
from apps.crawling.collectors.hwahae_collector import collect_hwahae_search
from apps.crawling.collectors.glowpick_collector import collect_glowpick_search
from apps.crawling.services.save_service import save_search_result


def crawl_search_target(target) -> dict:
    """
    [3단계 유지]
    - site에 따라 collector 선택
    - [4단계 반영] 저장은 save_service에 맡기고
      여기서는 결과 요약만 반환합니다.
    """

    if target.site == "danawa":
        result = collect_danawa_search(target)

    elif target.site == "hwahae":
        result = collect_hwahae_search(target)

    elif target.site == "glowpick":
        result = collect_glowpick_search(target)

    else:
        raise ValueError(f"지원하지 않는 사이트입니다: {target.site}")

    save_result = save_search_result(target, result)

    return {
        "page_title": save_result["page_title"],
        "candidate_count": save_result["candidate_count"],
        "created_count": save_result["created_count"],
        "updated_count": save_result["updated_count"],
    }
```

`apps/crawling/management/commands/test_crawl.py` 수정
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlTarget, CrawlJobLog
from apps.crawling.services.crawl_service import crawl_search_target


class Command(BaseCommand):
    help = "크롤링 대상(search 페이지)에 대해 테스트 크롤링을 수행합니다."

    def handle(self, *args, **options):
        targets = CrawlTarget.objects.filter(
            is_active=True,
            target_type="search"
        )

        total_targets = targets.count()
        success_count = 0
        fail_count = 0

        total_created = 0   # [4단계 추가]
        total_updated = 0   # [4단계 추가]

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="test_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message="테스트 크롤링 시작",
        )

        self.stdout.write(self.style.SUCCESS("테스트 크롤링 시작"))

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_search_target(target)
                success_count += 1

                total_created += result["created_count"]   # [4단계 추가]
                total_updated += result["updated_count"]   # [4단계 추가]

                site_summary[target.site] = {
                    "targets": site_summary.get(target.site, {}).get("targets", 0) + 1,
                    "created": site_summary.get(target.site, {}).get("created", 0) + result["created_count"],
                    "updated": site_summary.get(target.site, {}).get("updated", 0) + result["updated_count"],
                }

                self.stdout.write(
                    self.style.SUCCESS(
                        (
                            f"성공 - title={result['page_title']} / "
                            f"candidate_count={result['candidate_count']} / "
                            f"created={result['created_count']} / "
                            f"updated={result['updated_count']}"
                        )
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f"실패 - {str(e)}")
                )

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = (
            f"사이트별 처리 수: {site_summary} | "
            f"전체 created={total_created}, updated={total_updated}"
        )
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\n테스트 크롤링 종료")
        self.stdout.write(
            self.style.SUCCESS(
                (
                    f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count} / "
                    f"created {total_created} / updated {total_updated}"
                )
            )
        )
```

`apps/crawling/tests.py` 수정
```python
from django.test import TestCase

from apps.crawling.models import CrawlRawData, CrawlTarget
from apps.crawling.services.save_service import save_search_result


class SaveSearchResultTest(TestCase):
    def setUp(self):
        self.target = CrawlTarget.objects.create(
            site="danawa",
            target_type="search",
            keyword="수분크림",
            title="다나와 수분크림 검색",
            url="https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC",
        )

        self.result = {
            "site": "danawa",
            "page_info": {
                "title": "테스트 페이지",
                "a_count": 10,
                "contains_review_word": True,
                "contains_keyword": True,
                "text_preview": "미리보기 텍스트",
            },
            "candidate_links": [
                {
                    "title": "상품 A",
                    "url": "https://prod.danawa.com/info/?pcode=111",
                },
                {
                    "title": "상품 B",
                    "url": "https://prod.danawa.com/info/?pcode=222",
                },
            ],
            "html": "<html><title>테스트 페이지</title></html>",
        }

    def test_first_save_creates_rows(self):
        summary = save_search_result(self.target, self.result)

        self.assertEqual(summary["created_count"], 3)   # page_info 1 + candidate 2
        self.assertEqual(summary["updated_count"], 0)
        self.assertEqual(CrawlRawData.objects.count(), 3)

    def test_second_save_updates_not_duplicates(self):
        save_search_result(self.target, self.result)
        summary = save_search_result(self.target, self.result)

        self.assertEqual(summary["created_count"], 0)
        self.assertEqual(summary["updated_count"], 3)
        self.assertEqual(CrawlRawData.objects.count(), 3)

    def test_candidate_title_changes_should_update_existing_row(self):
        save_search_result(self.target, self.result)

        modified = {
            **self.result,
            "candidate_links": [
                {
                    "title": "상품 A 수정됨",
                    "url": "https://prod.danawa.com/info/?pcode=111",
                },
                {
                    "title": "상품 B",
                    "url": "https://prod.danawa.com/info/?pcode=222",
                },
            ],
        }

        save_search_result(self.target, modified)

        row = CrawlRawData.objects.get(
            unique_key="danawa:candidate_link:https://prod.danawa.com/info/?pcode=111"
        )
        self.assertEqual(row.item_title, "상품 A 수정됨")
        self.assertEqual(CrawlRawData.objects.count(), 3)
```

migration 생성
```bash
python manage.py makemigrations crawling
python manage.py migrate
```

3단계에서는
- `collector`가 수집
- `crawl_service`가 저장 서비스 호출
- `save_service` 안에서 DB ORM 작업까지 전부 직접 수행

4단계에서는 
- `collector`  
    → HTML 수집/파싱 결과 반환만 담당
    
- `crawl_service`  
    → collector 선택 + save_service 호출만 담당
    
- `save_service`  
    → 저장 흐름 제어, 고유키 생성, 저장 정책(create/update) 결정
    
- `repository.py`  
    → `update_or_create()` 같은 ORM 직접 호출만 담당
    
즉, 4단계의 핵심은 DB 저장 흐름과 DB 직접 접근을 다시 한 번 나눈 것입니다.

단위 테스트 실행
```bash
python manage.py test apps.crawling.tests
```
- 첫 저장 시 `created_count > 0`
- 같은 데이터 재저장 시 `updated_count > 0`
- 총 row 수는 늘어나지 않음

테스트 크롤링 2번 실행
```bash
python manage.py test_crawl  
```
첫 번째 실행:
- `created`가 많이 나옴
- `updated`는 거의 0이거나 적음
    

두 번째 실행:
- 같은 대상이면 created가 거의 0
- updated가 증가
- 레코드 수가 무한히 늘어나지 않음

4단계 로직분리 성공
![[Pasted image 20260315154617.png]]


Django shell에서 직접 확인
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlRawData, CrawlTarget

print("전체 raw 데이터 수:", CrawlRawData.objects.count())

for row in CrawlRawData.objects.all()[:10]:
    print(row.id, row.record_type, row.unique_key, row.item_url)
```
확인 포인트:
- `record_type` 값이 `page_info`, `candidate_link`로 잘 구분되는지
- `unique_key`가 비어 있지 않은지
- 같은 `item_url`로 중복 행이 여러 개 생기지 않는지

같은 unique_key 중복 여부 확인
```python
from django.db.models import Count
from apps.crawling.models import CrawlRawData

duplicates = (
    CrawlRawData.objects
    .values("unique_key")
    .annotate(cnt=Count("id"))
    .filter(cnt__gt=1)
)

print(list(duplicates))
```
정상이라면:
```python
[]
```
빈 리스트가 나와야 합니다.

target 마지막 실행 시간 확인
```python
for target in CrawlTarget.objects.all():
    print(target.site, target.url, target.last_crawled_at)
```
정상이라면 `last_crawled_at` 값이 비어 있지 않아야 합니다.

관리자 페이지에서 확인
CrawlRawData
확인할 것:
- `record_type`이 보이는지
- `unique_key`가 보이는지
- 두 번째 실행 후에도 같은 후보 링크가 새 row로 계속 쌓이지 않는지
    
CrawlJobLog
확인할 것:
- `message`에 `created`, `updated` 정보가 남는지
    
CrawlTarget
확인할 것:
- `last_crawled_at`이 갱신되는지
---
이번 4단계는 아래 4개로 판단하시면 됩니다.

1. 코드 구조
    - collector / crawl_service / save_service / repository 역할이 분명히 나뉨
        
2. DB 저장 정책
    - 같은 데이터 재수집 시 create가 아니라 update로 처리됨
        
3. 실행 결과
    - `python manage.py test_crawl`를 두 번 돌려도 row 수가 폭증하지 않음
        
4. 검증 가능성
    - admin, shell, test 코드에서 모두 확인 가능함

---
### 5단계: 여러 링크를 조금씩 돌리는 전략 세우기
추천 방식
- 100개 링크가 있더라도
- 한 번 실행할 때 10개만 수집
- 다음 실행 때 또 10개
- `last_crawled_at` 오래된 순으로 선택

자동화 도구 cron
리눅스 서버에서 주기적으로 파이썬 명령 실행

목표
- `CrawlTarget` 중에서 이번 차례에 돌릴 대상만 선택
- `python manage.py scheduled_crawl --limit 3` 처럼 실행 가능
- cron이 1시간마다 이 명령어 실행
- 실행 로그에 `created / updated / skipped` 남기기

디렉토리 구조
```
apps/crawling/
├── collectors/
│   ├── __init__.py
│   ├── danawa_collector.py
│   ├── hwahae_collector.py
│   └── glowpick_collector.py
├── services/
│   ├── __init__.py
│   ├── http.py
│   ├── parser.py
│   ├── repository.py
│   ├── save_service.py
│   ├── crawl_service.py
│   └── target_selector.py      # [5단계 추가]
├── management/
│   └── commands/
│       ├── test_crawl.py
│       └── scheduled_crawl.py  # [5단계 추가]
├── admin.py
├── apps.py
├── models.py
└── tests.py
```

```bash
touch apps/crawling/services/target_selector.py
touch apps/crawling/management/commands/scheduled_crawl.py
```

`apps/crawling/models.py` 수정 : 스케줄링 제어용 필드 추가
```python
from django.db import models


class CrawlTarget(models.Model):
    """
    크롤링 대상 URL 저장
    - search: 검색 결과 페이지
    - product: 상품 상세 페이지

    [5단계 추가]
    - crawl_interval_minutes:
      이 target을 몇 분 간격으로 다시 수집할지
    - priority:
      같은 조건이면 우선순위가 높은 것을 먼저 실행
    """

    SITE_CHOICES = [
        ("danawa", "다나와"),
        ("hwahae", "화해"),
        ("glowpick", "글로우픽"),
    ]

    TARGET_TYPE_CHOICES = [
        ("search", "검색 페이지"),
        ("product", "상품 상세 페이지"),
    ]

    site = models.CharField(
        max_length=30,
        choices=SITE_CHOICES
    )

    target_type = models.CharField(
        max_length=20,
        choices=TARGET_TYPE_CHOICES,
        default="search"
    )

    keyword = models.CharField(
        max_length=100,
        blank=True
    )

    title = models.CharField(
        max_length=255,
        blank=True
    )

    url = models.URLField(
        max_length=1000,
        unique=True
    )

    is_active = models.BooleanField(
        default=True
    )

    # [5단계 추가 시작]
    crawl_interval_minutes = models.PositiveIntegerField(
        default=60,
        help_text="이 target을 다시 수집할 최소 간격(분)"
    )

    priority = models.PositiveIntegerField(
        default=1,
        help_text="숫자가 클수록 우선 수집"
    )
    # [5단계 추가 끝]

    last_crawled_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-priority", "site", "target_type", "-created_at"]
        verbose_name = "크롤링 대상"
        verbose_name_plural = "크롤링 대상 목록"

    def __str__(self):
        return f"{self.site} | {self.target_type} | {self.url}"


class CrawlRawData(models.Model):
    """
    크롤링해서 가져온 원본 데이터 저장

    [4단계 유지]
    - record_type 추가
    - unique_key 추가
    """

    RECORD_TYPE_CHOICES = [
        ("page_info", "페이지 정보"),
        ("candidate_link", "후보 링크"),
    ]

    target = models.ForeignKey(
        CrawlTarget,
        on_delete=models.CASCADE,
        related_name="raw_items"
    )

    source_url = models.URLField(max_length=1000)

    page_title = models.CharField(
        max_length=255,
        blank=True
    )

    item_title = models.CharField(
        max_length=255,
        blank=True
    )

    item_url = models.URLField(
        max_length=1000,
        blank=True
    )

    raw_text = models.TextField(
        blank=True
    )

    raw_html = models.TextField(
        blank=True
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True
    )

    record_type = models.CharField(
        max_length=30,
        choices=RECORD_TYPE_CHOICES,
        default="candidate_link",
        db_index=True,
    )

    unique_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        blank=True,
        null=False,
    )

    crawled_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-crawled_at"]
        verbose_name = "크롤링 원본 데이터"
        verbose_name_plural = "크롤링 원본 데이터 목록"
        indexes = [
            models.Index(fields=["target", "record_type"]),
            models.Index(fields=["source_url"]),
            models.Index(fields=["item_url"]),
        ]

    def __str__(self):
        return f"{self.target.site} | {self.record_type} | {self.item_title or self.page_title}"


class CrawlJobLog(models.Model):
    """
    크롤링 실행 로그
    """

    STATUS_CHOICES = [
        ("success", "성공"),
        ("failed", "실패"),
    ]

    site = models.CharField(
        max_length=30
    )

    command_name = models.CharField(
        max_length=100,
        default="test_crawl"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    total_targets = models.PositiveIntegerField(
        default=0
    )

    success_count = models.PositiveIntegerField(
        default=0
    )

    fail_count = models.PositiveIntegerField(
        default=0
    )

    message = models.TextField(
        blank=True
    )

    started_at = models.DateTimeField(
        auto_now_add=True
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "크롤링 실행 로그"
        verbose_name_plural = "크롤링 실행 로그 목록"

    def __str__(self):
        return f"{self.site} | {self.status} | {self.started_at}"
```

`apps/crawling/admin.py` 수정 : 관리자에서 interval, priority를 볼 수 있게 추가합니다.
```python
from django.contrib import admin
from .models import CrawlTarget, CrawlRawData, CrawlJobLog


@admin.register(CrawlTarget)
class CrawlTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "target_type",
        "keyword",
        "title",
        "priority",                # [5단계 추가]
        "crawl_interval_minutes",  # [5단계 추가]
        "is_active",
        "last_crawled_at",
        "created_at",
    )
    list_filter = ("site", "target_type", "is_active")
    search_fields = ("keyword", "title", "url")
    ordering = ("-priority", "site", "target_type", "-created_at")


@admin.register(CrawlRawData)
class CrawlRawDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target",
        "record_type",
        "item_title",
        "item_url",
        "unique_key",
        "crawled_at",
    )
    list_filter = ("target__site", "record_type", "crawled_at")
    search_fields = ("item_title", "item_url", "page_title", "unique_key")
    ordering = ("-crawled_at",)


@admin.register(CrawlJobLog)
class CrawlJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "command_name",
        "status",
        "total_targets",
        "success_count",
        "fail_count",
        "started_at",
        "finished_at",
    )
    list_filter = ("site", "status")
    search_fields = ("site", "message")
    ordering = ("-started_at",)
```
---
target 선택 서비스 추가
이 파일이 5단계 핵심입니다.
- active 대상만 조회
- `last_crawled_at`이 비어 있으면 먼저
- 아니면 오래된 순
- 너무 최근에 돌린 건 제외
- limit 개수만 반환

`apps/crawling/services/target_selector.py`
```python
from datetime import timedelta

from django.db.models import F, ExpressionWrapper, DateTimeField, Q
from django.db.models.functions import Now
from django.utils import timezone

from apps.crawling.models import CrawlTarget


def get_due_targets(limit: int = 3, target_type: str = "search"):
    """
    이번 실행 차례가 된 target만 선택합니다.

    규칙
    1. is_active=True
    2. target_type=search
    3. 아직 한 번도 안 돌린 대상 우선
    4. 이미 돌린 대상은 last_crawled_at 오래된 순
    5. 단, crawl_interval_minutes가 지나지 않은 것은 제외
    """

    now = timezone.now()

    all_targets = CrawlTarget.objects.filter(
        is_active=True,
        target_type=target_type,
    )

    # 1) 아직 한 번도 안 돌린 대상
    never_crawled_qs = all_targets.filter(
        last_crawled_at__isnull=True
    ).order_by("-priority", "created_at")

    selected_ids = list(
        never_crawled_qs.values_list("id", flat=True)[:limit]
    )

    remaining = limit - len(selected_ids)

    if remaining > 0:
        # 2) 돌린 적은 있지만, interval이 지난 대상만 후보
        due_targets = []

        candidates = all_targets.filter(
            last_crawled_at__isnull=False
        ).order_by("last_crawled_at", "-priority", "created_at")

        for target in candidates:
            next_time = target.last_crawled_at + timedelta(
                minutes=target.crawl_interval_minutes
            )
            if next_time <= now:
                due_targets.append(target.id)

            if len(due_targets) >= remaining:
                break

        selected_ids.extend(due_targets)

    if not selected_ids:
        return CrawlTarget.objects.none()

    # 선택된 순서를 대충 유지하려면 단순 필터 후 후정렬
    selected_targets = CrawlTarget.objects.filter(
        id__in=selected_ids
    ).order_by("last_crawled_at", "-priority", "created_at")

    return selected_targets
```
---
기존 `crawl_service.py` 유지 : 4단계에서 만든 구조는 그대로 사용해도 됩니다.

`apps/crawling/services/crawl_service.py`
```python
수정내용 없음
```
---
자동 실행용 management command 추가
이제 테스트용 `test_crawl` 말고 실제로 cron이 실행할 명령어를 따로 만듭니다.
`apps/crawling/management/commands/scheduled_crawl.py`
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlJobLog
from apps.crawling.services.crawl_service import crawl_search_target
from apps.crawling.services.target_selector import get_due_targets


class Command(BaseCommand):
    help = "스케줄링용 크롤링 명령어. due target만 limit 개수만큼 실행합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=3,
            help="한 번 실행할 최대 target 개수 (실습용 기본값 3)"
        )

    def handle(self, *args, **options):
        limit = options["limit"]

        targets = get_due_targets(limit=limit, target_type="search")
        total_targets = targets.count()

        success_count = 0
        fail_count = 0
        skipped_count = 0

        total_created = 0
        total_updated = 0

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="scheduled_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message=f"scheduled_crawl 시작 (limit={limit})",
        )

        self.stdout.write(self.style.SUCCESS("scheduled_crawl 시작"))

        if total_targets == 0:
            log.status = "success"
            log.message = "실행할 due target이 없습니다."
            log.finished_at = timezone.now()
            log.save()

            self.stdout.write("실행할 대상이 없습니다.")
            return

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_search_target(target)
                success_count += 1

                total_created += result["created_count"]
                total_updated += result["updated_count"]

                site_summary[target.site] = {
                    "targets": site_summary.get(target.site, {}).get("targets", 0) + 1,
                    "created": site_summary.get(target.site, {}).get("created", 0) + result["created_count"],
                    "updated": site_summary.get(target.site, {}).get("updated", 0) + result["updated_count"],
                }

                self.stdout.write(
                    self.style.SUCCESS(
                        (
                            f"성공 - title={result['page_title']} / "
                            f"candidate_count={result['candidate_count']} / "
                            f"created={result['created_count']} / "
                            f"updated={result['updated_count']}"
                        )
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f"실패 - {str(e)}")
                )

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = (
            f"limit={limit} | "
            f"site_summary={site_summary} | "
            f"created={total_created} | "
            f"updated={total_updated} | "
            f"skipped={skipped_count}"
        )
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\nscheduled_crawl 종료")
        self.stdout.write(
            self.style.SUCCESS(
                (
                    f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count} / "
                    f"created {total_created} / updated {total_updated}"
                )
            )
        )
```
---
테스트 코드 추가
`apps/crawling/tests.py`
```python
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.crawling.models import CrawlTarget
from apps.crawling.services.target_selector import get_due_targets


class TargetSelectorTest(TestCase):
    def setUp(self):
        now = timezone.now()

        self.t1 = CrawlTarget.objects.create(
            site="danawa",
            target_type="search",
            keyword="수분크림",
            title="다나와 1",
            url="https://example.com/d1",
            is_active=True,
            crawl_interval_minutes=60,
            priority=3,
            last_crawled_at=None,   # 아직 안 돌림
        )

        self.t2 = CrawlTarget.objects.create(
            site="hwahae",
            target_type="search",
            keyword="수분크림",
            title="화해 1",
            url="https://example.com/h1",
            is_active=True,
            crawl_interval_minutes=60,
            priority=2,
            last_crawled_at=now - timedelta(hours=2),   # due
        )

        self.t3 = CrawlTarget.objects.create(
            site="glowpick",
            target_type="search",
            keyword="수분크림",
            title="글로우픽 1",
            url="https://example.com/g1",
            is_active=True,
            crawl_interval_minutes=60,
            priority=1,
            last_crawled_at=now - timedelta(minutes=10),   # 아직 due 아님
        )

    def test_never_crawled_target_selected_first(self):
        targets = list(get_due_targets(limit=1))
        self.assertEqual(len(targets), 1)
        self.assertEqual(targets[0].id, self.t1.id)

    def test_due_targets_only(self):
        targets = list(get_due_targets(limit=3))
        target_ids = [t.id for t in targets]

        self.assertIn(self.t1.id, target_ids)
        self.assertIn(self.t2.id, target_ids)
        self.assertNotIn(self.t3.id, target_ids)

    def test_limit_works(self):
        targets = list(get_due_targets(limit=1))
        self.assertEqual(len(targets), 1)
```

마이그레이션
```bash
python manage.py makemigrations crawling
python manage.py migrate
```

테스트 실행
```bash
python manage.py test apps.crawling.tests
```

shell에서 target 데이터 보정
기존 target에 interval, priority를 지정하고 싶으면:
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlTarget

for target in CrawlTarget.objects.all():
    target.crawl_interval_minutes = 60
    target.priority = 1
    target.save()

print("interval, priority 설정 완료")
```

수동 실행 테스트 : 먼저 cron 걸기 전에 직접 실행
```bash
python manage.py scheduled_crawl --limit 2
```
확인 포인트
- 처음 실행: 아직 안 돌린 target 우선 실행
- 두 번째 실행: 방금 돌린 것은 interval 때문에 제외
- 나머지 오래된 target이 선택됨
- `CrawlJobLog.message`에 created / updated가 남음

cron 등록
이제 자동화입니다.
현재 가상환경 경로와 프로젝트 경로를 정확히 확인한 뒤 cron에 등록합니다.

경로확인
```bash
which python  
pwd
```
예시 경로가 아래라고 가정
- 프로젝트: `/home/youjung/product-review-service/backend`
- 파이썬: `/home/youjung/product-review-service/.venv/bin/python`
    
cron 편집기 열기:
```bash
crontab -e
```

1을 선택하면 nano 편집기가 열립니다.
```bash
Choose 1-4 [1]: 1
```

nano 화면이 열리면 아래 한 줄 추가:
```bash
0 * * * * cd /home/youjung/product-review-service/backend && /home/youjung/product-review-service/.venv/bin/python manage.py scheduled_crawl --limit 3 >> /home/youjung/product-review-service/logs/scheduled_crawl.log 2>&1
```
의미:
- 매 시간마다
- 프로젝트 폴더로 이동
- 가상환경의 python으로 실행
- 한 번에 3개만 수집
- 로그 파일 저장

테스트용 1분마다로 테스트 
```bash
* * * * * cd /home/youjung/product-review-service/backend && /home/youjung/product-review-service/.venv/bin/python manage.py scheduled_crawl --limit 3 >> /home/youjung/product-review-service/logs/scheduled_crawl.log 2>&1
```

저장 방법 (nano)
```
Ctrl + O (저장)  
Enter  
Ctrl + X (종료)
```

등록 확인
```bash
crontab -l
```

정상이라면 이렇게 보입니다.
![[Pasted image 20260315161237.png]]

먼저 target 하나 넣어야 합니다
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlTarget

CrawlTarget.objects.create(
    site="danawa",
    target_type="search",
    keyword="수분크림",
    title="다나와 수분크림",
    url="https://search.danawa.com/dsearch.php?query=수분크림"
)
```

다시 실행
```bash
python manage.py scheduled_crawl --limit 2
```

성공하면 이렇게 나옵니다
![[Pasted image 20260315161428.png]]


로그 폴더 만들기
cron 로그 파일용 디렉토리 먼저 만들어 주세요.
```bash
mkdir -p /home/youjung/product-review-service/logs
```
로그 확인:
```bash
tail -f /home/youjung/product-review-service/logs/scheduled_crawl.log
```
1분 기다려야 합니다.

먼저 로그파일을 직접 생성하기
```bash
touch /home/youjung/product-review-service/logs/scheduled_crawl.log
```

설정
연습용이므로 무난한 설정을 하겠습니다.
- cron 주기: 1시간마다
- `--limit 2` 또는 `--limit 3`
- `crawl_interval_minutes=60`
    
즉 한 번에 조금만 돌리고,  
너무 자주 같은 링크를 다시 긁지 않게 하는 방식입니다.  
여러 링크를 조금씩 돌리는 전략으로 제작한 방법입니다.

---
현재 수집된 데이터

|데이터|설명|
|---|---|
|item_title|상품 제목|
|item_url|상품 링크|
|record_type|후보 링크|

AI 분석에 필요한 데이터 추가 크로링

|review|rating|
|---|---|
|촉촉하고 좋아요|5|
|향이 너무 강함|2|
|가성비 좋음|4|

---
### 리뷰를 위한 추가 디렉토리
```
apps/crawling/collectors/ 
   ├─ danawa_collector.py 
   ├─ hwahae_collector.py 
   ├─ glowpick_collector.py 
   ├─ danawa_review_collector.py ← 추가 
   ├─ hwahae_review_collector.py ← 추가 
   └─ glowpick_review_collector.py ← 추가
```

```bash
touch apps/crawling/collectors/danawa_review_collector.py
touch apps/crawling/collectors/hwahae_review_collector.py
touch apps/crawling/collectors/glowpick_review_collector.py
```

리뷰 크롤링 방법
```
검색 페이지 크롤링
        ↓
상품 URL 수집
        ↓
Selenium으로 상품 페이지 열기
        ↓
JS 렌더링
        ↓
리뷰 HTML 추출
        ↓
BeautifulSoup 파싱
```

먼저 Selenium 설치
```python
uv pip install selenium webdriver-manager
uv pip install undetected-chromedriver
sudo apt install python3-distutils
uv pip install --upgrade setuptools
uv pip install packaging
uv pip install packaging
sudo apt install google-chrome-stable
```

`test_selenium_reviews1.py` 테스트용 Selenium 코드
```python
import undetected_chromedriver as uc
import time


def test_browser():

    print("브라우저 실행 테스트")

    options = uc.ChromeOptions()

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = uc.Chrome(options=options)

    driver.get("https://www.google.com")

    time.sleep(5)

    print("페이지 제목:", driver.title)

    driver.quit()


if __name__ == "__main__":
    test_browser()
```

```bash
python test_selenium_reviews1.py
```

구글 브라우저가 selenium으로 잘 뜨면 성공입니다.

`test_selenium_reviews2.py` 봇차단 단계
```python
import time
import traceback
import undetected_chromedriver as uc


def build_driver():
    options = uc.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1400,1200")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    )

    # 현재 브라우저가 145라서 맞춰줍니다.
    driver = uc.Chrome(
        options=options,
        version_main=145,
        headless=False,
        use_subprocess=True,
    )
    return driver


def main():
    driver = None
    try:
        print("1. 브라우저 생성 시작")
        driver = build_driver()
        print("2. 브라우저 생성 성공")

        print("3. Google 접속")
        driver.get("https://www.google.com")
        time.sleep(3)
        print("   Google title:", driver.title)

        print("4. 화해 메인 접속")
        driver.get("https://www.hwahae.co.kr")
        time.sleep(5)
        print("   현재 URL:", driver.current_url)
        print("   title:", driver.title)

        print("5. 화해 상품 페이지 접속")
        driver.get("https://www.hwahae.co.kr/goods/70006")
        time.sleep(8)
        print("   현재 URL:", driver.current_url)
        print("   title:", driver.title)

        print("6. 페이지 소스 길이 확인")
        html = driver.page_source
        print("   html length:", len(html))

        print("7. 스크린샷 저장")
        driver.save_screenshot("hwahae_debug.png")
        print("   저장 완료: hwahae_debug.png")

        print("완료")

    except Exception as e:
        print("\n[에러 발생]")
        print(type(e).__name__, str(e))
        traceback.print_exc()

        if driver:
            try:
                driver.save_screenshot("hwahae_error.png")
                print("에러 스크린샷 저장: hwahae_error.png")
            except Exception:
                pass
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    main()
```

```bash
python test_selenium_reviews2.py
```

현재는
```
브라우저 실행 성공  
화해 메인 접속 성공  
상품 페이지 접속 성공  
HTML 확보 성공
```
이제 다음 단계는 리뷰 영역 selector 찾기입니다.  
지금부터는 크롤링이 되냐 안 되냐 문제가 아니라 어느 태그가 리뷰인지 찾는 작업입니다.

```
1. 리뷰 탭 클릭
2. 리뷰 텍스트 selector 찾기
```

`test_selenium_reviews3.py`
```python
import time
import traceback
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup


def build_driver():
    options = uc.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1400,1200")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    )

    driver = uc.Chrome(
        options=options,
        version_main=145,
        headless=False,
        use_subprocess=True,
    )
    return driver


def main():
    driver = None
    try:
        driver = build_driver()

        print("1. 화해 메인 접속")
        driver.get("https://www.hwahae.co.kr/")
        time.sleep(3)

        print("2. 상품 페이지 접속")
        driver.get("https://www.hwahae.co.kr/goods/70006")
        time.sleep(5)

        print("3. 페이지 아래로 스크롤")
        for _ in range(5):
            driver.execute_script("window.scrollBy(0, 1000);")
            time.sleep(1.5)

        print("4. 리뷰 관련 버튼/탭 찾기")
        buttons = driver.find_elements(By.XPATH, "//*[contains(text(),'리뷰')]")
        print("리뷰 텍스트 포함 요소 수:", len(buttons))

        for i, b in enumerate(buttons[:10], start=1):
            try:
                print(f"{i}. tag={b.tag_name} text={b.text[:50]!r}")
            except Exception:
                pass

        print("5. 첫 번째 리뷰 요소 클릭 시도")
        clicked = False
        for b in buttons:
            try:
                if "리뷰" in b.text:
                    driver.execute_script("arguments[0].click();", b)
                    clicked = True
                    print("리뷰 탭 클릭 성공")
                    break
            except Exception:
                continue

        if not clicked:
            print("리뷰 탭 클릭 실패")

        time.sleep(5)

        print("6. HTML 저장")
        html = driver.page_source
        with open("hwahae_after_review_click.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("저장 완료: hwahae_after_review_click.html")

        print("7. BeautifulSoup으로 긴 문장 후보 추출")
        soup = BeautifulSoup(html, "lxml")

        texts = []
        for tag in soup.find_all(["p", "span", "div"]):
            text = tag.get_text(" ", strip=True)
            if 20 <= len(text) <= 200:
                texts.append(text)

        # 중복 제거
        unique_texts = []
        seen = set()
        for t in texts:
            if t not in seen:
                seen.add(t)
                unique_texts.append(t)

        print("\n후보 텍스트 상위 30개:")
        for i, t in enumerate(unique_texts[:30], start=1):
            print(f"{i}. {t}")

        driver.save_screenshot("hwahae_review_debug.png")
        print("\n스크린샷 저장 완료: hwahae_review_debug.png")

    except Exception as e:
        print("\n[에러 발생]")
        print(type(e).__name__, str(e))
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    main()
```

```bash
python test_selenium_reviews3.py
```

결과
```
(product-review-service) (.venv) youjung@DESKTOP-PJCRMMU:~/product-review-service$ python test_selenium_reviews.py
1. 화해 메인 접속
2. 상품 페이지 접속
3. 페이지 아래로 스크롤
4. 리뷰 관련 버튼/탭 찾기
리뷰 텍스트 포함 요소 수: 2
5. tag=title text=''
6. tag=span text='리뷰/성분'
7. 첫 번째 리뷰 요소 클릭 시도
리뷰 탭 클릭 성공
8. HTML 저장
저장 완료: hwahae_after_review_click.html
9. BeautifulSoup으로 긴 문장 후보 추출

후보 텍스트 상위 30개:
1. {"items":[{"encrypted_product_id":"240a312033035192b79cd6b6dc8a4a5d"}]}
2. 아직도 화해 첫 구매 안 했다면? 1만 원 상당 혜택 받아가세요!
3. 싸이닉 병풀 PDRN 시카 엔드 수딩 크림 80ml (2개) 4.50 311 판매 중인 상품 옵션보기 병풀 PDRN 시카 엔드 수딩 크림 80ml (2개) 외 3 개 화해쇼핑 판매가 무료배송 40 % 14,000 원
4. 병풀 PDRN 시카 엔드 수딩 크림 80ml (2개)
5. 판매 중인 상품 옵션보기 병풀 PDRN 시카 엔드 수딩 크림 80ml (2개) 외 3 개
6. 병풀 PDRN 시카 엔드 수딩 크림 80ml (2개) 외 3 개
7. 화해쇼핑 판매가 무료배송 40 % 14,000 원
8. 상품에 적용 가능한 쿠폰 이 있어요! 쿠폰 다운 예상 혜택가 14,000 원 최대 적립 포인트 +1,800P 자세히 보기
9. 상품에 적용 가능한 쿠폰 이 있어요! 쿠폰 다운
10. 상품에 적용 가능한 쿠폰 이 있어요!
11. 최대 적립 포인트 +1,800P 자세히 보기
12. 정가 160ml / 23,500원 랭킹 크림 ・ 진정 16위 배송비 무료배송 한진택배 제주, 도서산간지역 3,000원 추가 정품인증 화해 모든 상품은 100% 정품입니다
13. 배송비 무료배송 한진택배 제주, 도서산간지역 3,000원 추가
14. 무료배송 한진택배 제주, 도서산간지역 3,000원 추가
15. 제주, 도서산간지역 3,000원 추가
16. 정품인증 화해 모든 상품은 100% 정품입니다
17. 화해 모든 상품은 100% 정품입니다
18. 좋아요 흡수잘되는 111 수분있는 105 잘발리는 83 가벼운 78 진정되는 57 자극없는 52 유분없는 32 아쉬워요 보습안되는 46 모공관리안되는 10 알러지반응오는 9 유수분밸런스가맞지않는 3 지속력안좋은 3 따가운 3 잘굳는 2
19. 좋아요 흡수잘되는 111 수분있는 105 잘발리는 83 가벼운 78 진정되는 57 자극없는 52 유분없는 32
20. 아쉬워요 보습안되는 46 모공관리안되는 10 알러지반응오는 9 유수분밸런스가맞지않는 3 지속력안좋은 3 따가운 3 잘굳는 2
21. 4.50 207 5점 4점 3점 2점 1점
22. dmslek 20대/수부지/여드름 2026.03.12
23. 또 샀어요.. 지성분들에개 추천! 그리고 무엇보다 논코메딕이라 믿고씁니다
24. 없어요 없어! 재구매템인거보면 진짜 없는데,, 
건성분들에겐 좀 건조할수도..
25. nkiihu 20대/복합성 2026.03.12
26. 무난한 평범한 수분크림 정도이고 보습감은 별로 안 높아요
27. 무난하고 진정 부분에서는 딱히 효과는 못봤어요
28. 성분 구성 전체 성분 58 1-2 낮은 위험 57 3-6 중간 위험 Free 7-10 높은 위험 Free 등급 미정 1 전체 성분 58 20가지 주의성분 Free 알레르기 주의성분 Free 주름 개선에 도움되는 기능성 성분 1 피부 미백에 도움되는 기능성 성분 1
29. 성분 구성 전체 성분 58 1-2 낮은 위험 57 3-6 중간 위험 Free 7-10 높은 위험 Free 등급 미정 1
30. 전체 성분 58 1-2 낮은 위험 57 3-6 중간 위험 Free 7-10 높은 위험 Free 등급 미정 1

스크린샷 저장 완료: hwahae_review_debug.png
```
---
이제 본격적으로 코드에 적용해 봅니다.

`apps/crawling/collectors/hwahae_review_collector.py`
```python
import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup


class HwahaeReviewCollector:
    """
    화해 상품 상세 페이지에서 리뷰 데이터를 수집합니다.
    - 리뷰 탭 클릭
    - 페이지 스크롤
    - 리뷰 작성자/피부타입/작성일 + 리뷰 본문 추출
    """

    def _build_driver(self):
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--start-maximized")
        options.add_argument("--window-size=1400,1200")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/145.0.0.0 Safari/537.36"
        )

        driver = uc.Chrome(
            options=options,
            version_main=145,
            headless=False,   # 테스트 끝난 뒤 True로 바꿔도 됨
            use_subprocess=True,
        )
        return driver

    def collect_reviews(self, product_url: str, limit: int = 20) -> list[dict]:
        driver = None
        results = []

        try:
            driver = self._build_driver()

            # 1. 화해 메인 먼저 접속
            driver.get("https://www.hwahae.co.kr/")
            time.sleep(3)

            # 2. 상품 페이지 접속
            driver.get(product_url)
            time.sleep(5)

            # 3. 리뷰 영역이 보이도록 스크롤
            for _ in range(5):
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1.5)

            # 4. 리뷰/성분 탭 클릭
            buttons = driver.find_elements(By.XPATH, "//*[contains(text(),'리뷰')]")
            for b in buttons:
                try:
                    if "리뷰" in b.text:
                        driver.execute_script("arguments[0].click();", b)
                        time.sleep(5)
                        break
                except Exception:
                    continue

            # 5. 클릭 후 HTML 파싱
            html = driver.page_source
            soup = BeautifulSoup(html, "lxml")

            texts = []
            for tag in soup.find_all(["p", "span", "div"]):
                text = tag.get_text(" ", strip=True)
                if 20 <= len(text) <= 200:
                    texts.append(text)

            # 중복 제거
            unique_texts = []
            seen = set()
            for t in texts:
                if t not in seen:
                    seen.add(t)
                    unique_texts.append(t)

            # 6. 실제 리뷰 패턴만 추출
            # 테스트 결과 기준:
            # - 작성자/피부타입/날짜 줄
            # - 리뷰 본문 1~2줄
            i = 0
            while i < len(unique_texts):
                line = unique_texts[i]

                # 작성자 + 피부타입 + 날짜 패턴처럼 보이는 줄
                if ("20대" in line or "30대" in line or "10대" in line or "40대" in line or "50대" in line) and "." in line:
                    author_info = line

                    review_parts = []
                    j = i + 1

                    while j < len(unique_texts):
                        next_line = unique_texts[j]

                        # 다음 작성자 정보가 나오면 종료
                        if ("20대" in next_line or "30대" in next_line or "10대" in next_line or "40대" in next_line or "50대" in next_line) and "." in next_line:
                            break

                        # 너무 긴 상품정보/성분정보/요약정보 제외
                        blocked_keywords = [
                            "전체 성분", "좋아요", "아쉬워요", "판매가", "무료배송",
                            "상품에 적용 가능한 쿠폰", "정품인증", "랭킹", "혜택가"
                        ]
                        if not any(k in next_line for k in blocked_keywords):
                            review_parts.append(next_line)

                        j += 1

                    review_text = " ".join(review_parts).strip()

                    if review_text:
                        results.append({
                            "source": "hwahae",
                            "url": product_url,
                            "author_info": author_info,
                            "review": review_text,
                        })

                    i = j
                else:
                    i += 1

            return results[:limit]

        except Exception as e:
            print(f"hwahae 리뷰 수집 실패: {e}")
            return []

        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass
```

바로 테스트하는 방법
```bash
python manage.py shell
```

```python
from apps.crawling.collectors.hwahae_review_collector import HwahaeReviewCollector

collector = HwahaeReviewCollector()
reviews = collector.collect_reviews("https://www.hwahae.co.kr/goods/70006", limit=5)

print(len(reviews))
for r in reviews:
    print(r)
```

아래와 같이 나오면 성공
```
{'source': 'hwahae', 'url': 'https://www.hwahae.co.kr/goods/70006', 'author_info': 'nkiihu 20대/복합성 2026.03.12', 'review': '무난한 평범한 수분크림 정도이고 보습감은 별로 안 높아요 무난하고 진정 부분에서는 딱히 효과는 못봤어요 20가지 주의성분 Free 알레르기 주의성분 Free 주름 개선에 도움되는 기능성 성분 1 피부 미백에 도움되는 기능성 성분 1 목적별 성분 피부 보습, 피부 보호 등 도움을 주는 성분이 있어요 피부 보습, 피부 보호 등 도움을 주는 성분이 있어요 40 피부 보습 6 피부 보호 2 수분 증발 차단 1 피부 미백 1 주름 개선 0 수렴 진정 0 각질 제거 0 여드름 완화 0 자외선 차단 목적별 성분 정보는 포함된 성분의 배합목적에 관한 정보로서, 완제품인 화장품의 기능성 효능ㆍ효과에 관한 정보가 아니며, 해당 성분의 포함 사실만으로 관련 기능이 보장되지 않습니다. 지성 피부 1 0 건성 피부 4 0 민감성 피부 1 0 구매 전에 제조판매업자가 표기한 전성분 표를 한 번 더 확인하시길 권장드립니다. 화해 정보를 허가없이 상업적으로 활용할 경우, 법적 조치를 받을 수 있습니다. 성분별 해당 제품 내 배합 비율은 브랜드사에서 제공한 정보로 모든 책임은 브랜드사에 있습니다. 상품이 장바구니에 담겼습니다.\n지금 확인하시겠습니까? 아니오 네 상품이 장바구니에 담겼습니다.\n지금 확인하시겠습니까? 사업자정보확인 이용약관 개인정보 처리방침 1:1 문의 화해 비즈니스 광고/제휴문의 사업자정보확인 이용약관 개인정보 처리방침 1:1 문의 화해 비즈니스 광고/제휴문의 (주)화해글로벌은 결제정보의 중개서비스 또는 통신판매중개시스템의 제공자로서, 통신판매의 당사자가 아니며 제공 정보의 오류로 인해 발생하는 모든 손해 및 상품의 주문, 배송 및 환불 등과 관련한 의무와 책임은 각 판매자에게 있습니다. © Hwahae Global Inc. All Rights Reserved. 새로운 뷰티의 발견 지금, 화해 앱에서 리뷰 확인부터 무료 체험 신청, 포인트 혜택까지 받아보세요! 지금, 화해 앱에서 리뷰 확인부터 무료 체험 신청, 포인트 혜택까지 받아보세요!'}
>>> 
```
---
### 리뷰 크로링을 위한 마지막 테스트
`apps/crawling/collectors/hwahae_review_collector.py`
```python
import re
import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup


class HwahaeReviewCollector:
    """
    화해 상품 상세 페이지에서 리뷰 데이터를 수집합니다.
    - 리뷰 탭 클릭
    - 페이지 스크롤
    - 리뷰 작성자/피부타입/작성일 + 리뷰 본문 추출
    """

    def _build_driver(self):
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--start-maximized")
        options.add_argument("--window-size=1400,1200")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/145.0.0.0 Safari/537.36"
        )

        driver = uc.Chrome(
            options=options,
            version_main=145,
            headless=False,   # 나중에 안정화되면 True 검토
            use_subprocess=True,
        )
        return driver

    def _is_author_line(self, text: str) -> bool:
        """
        작성자/피부타입/날짜 줄인지 판별
        예:
        dmslek 20대/수부지/여드름 2026.03.12
        nkiihu 20대/복합성 2026.03.12
        """
        age_keywords = ["10대", "20대", "30대", "40대", "50대", "60대"]
        has_age = any(k in text for k in age_keywords)
        has_date = bool(re.search(r"\d{4}\.\d{2}\.\d{2}", text))
        return has_age and has_date

    def _is_stop_line(self, text: str) -> bool:
        """
        리뷰 본문이 끝났다고 판단할 키워드들
        """
        stop_keywords = [
            "전체 성분",
            "좋아요",
            "아쉬워요",
            "목적별 성분",
            "피부 보습",
            "피부 보호",
            "수분 증발 차단",
            "피부 미백",
            "주름 개선",
            "구매 전에",
            "화해 정보를 허가없이",
            "상품이 장바구니에 담겼습니다",
            "지금 확인하시겠습니까",
            "사업자정보확인",
            "이용약관",
            "개인정보 처리방침",
            "화해 비즈니스",
            "광고/제휴문의",
            "모든 손해",
            "All Rights Reserved",
            "새로운 뷰티의 발견",
            "리뷰 확인부터 무료 체험 신청",
        ]
        return any(k in text for k in stop_keywords)

    def _clean_review_text(self, text: str) -> str:
        """
        불필요한 공백/줄바꿈 정리
        """
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def collect_reviews(self, product_url: str, limit: int = 20) -> list[dict]:
        driver = None
        results = []

        try:
            driver = self._build_driver()

            driver.get("https://www.hwahae.co.kr/")
            time.sleep(3)

            driver.get(product_url)
            time.sleep(5)

            for _ in range(5):
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1.5)

            buttons = driver.find_elements(By.XPATH, "//*[contains(text(),'리뷰')]")
            for b in buttons:
                try:
                    if "리뷰" in b.text:
                        driver.execute_script("arguments[0].click();", b)
                        time.sleep(5)
                        break
                except Exception:
                    continue

            html = driver.page_source
            soup = BeautifulSoup(html, "lxml")

            texts = []
            for tag in soup.find_all(["p", "span", "div"]):
                text = tag.get_text(" ", strip=True)
                if 2 <= len(text) <= 200:
                    texts.append(text)

            unique_texts = []
            seen = set()
            for t in texts:
                if t not in seen:
                    seen.add(t)
                    unique_texts.append(t)

            i = 0
            while i < len(unique_texts):
                line = unique_texts[i]

                if self._is_author_line(line):
                    author_info = line
                    review_parts = []
                    j = i + 1

                    while j < len(unique_texts):
                        next_line = unique_texts[j]

                        # 다음 작성자 나오면 현재 리뷰 종료
                        if self._is_author_line(next_line):
                            break

                        # 성분/푸터/장바구니 등 나오면 종료
                        if self._is_stop_line(next_line):
                            break

                        # 너무 짧은 라인은 제외
                        if len(next_line) >= 8:
                            review_parts.append(next_line)

                        # 리뷰는 보통 1~3문장 정도만 가져오도록 제한
                        if len(review_parts) >= 3:
                            break

                        j += 1

                    review_text = self._clean_review_text(" ".join(review_parts))

                    # 최종 필터
                    if review_text and 10 <= len(review_text) <= 300:
                        results.append({
                            "source": "hwahae",
                            "url": product_url,
                            "author_info": author_info,
                            "review": review_text,
                        })

                    i = j
                else:
                    i += 1

            return results[:limit]

        except Exception as e:
            print(f"hwahae 리뷰 수집 실패: {e}")
            return []

        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass
```

다시 테스트
```bash
python manage.py shell
```

```python
from apps.crawling.collectors.hwahae_review_collector import HwahaeReviewCollector

collector = HwahaeReviewCollector()
reviews = collector.collect_reviews("https://www.hwahae.co.kr/goods/70006", limit=5)

print(len(reviews))
for r in reviews:
    print(r)
```

결과는 성공
```bash
{'source': 'hwahae', 'url': 'https://www.hwahae.co.kr/goods/70006', 'author_info': 'dmslek 20대/수부지/여드름 2026.03.12', 'review': 'dmslek 20대/수부지/여드름 20대/수부지/여드름 2026.03.12'}
{'source': 'hwahae', 'url': 'https://www.hwahae.co.kr/goods/70006', 'author_info': 'nkiihu 20대/복합성 2026.03.12', 'review': 'nkiihu 20대/복합성 무난한 평범한 수분크림 정도이고 보습감은 별로 안 높아요 무난하고 진정 부분에서는 딱히 효과는 못봤어요'}
```
현재는 여기까지 온 겁니다.
```
화해 접속 성공  
→ 리뷰 탭 클릭 성공  
→ 리뷰 추출 성공  
→ 후처리 정제만 남음
```
즉 리뷰 크롤링은 된 상태입니다.


----
### 리뷰 크로링을 위한 마지막 단계

최종 디렉토리 구조
```
apps/crawling/
├── __init__.py
├── admin.py                          (선택 ✔)
├── apps.py
├── models.py                         ✔ = 수정 필요
├── tests.py                          (선택 ✔)
├── collectors/
│   ├── __init__.py
│   ├── danawa_review_collector.py    ✔ = 수정 필요
│   ├── hwahae_review_collector.py    ✔ = 수정 필요
│   └── glowpick_review_collector.py  ✔ = 수정 필요
├── services/
│   ├── __init__.py
│   ├── repository.py                 
│   ├── save_service.py               ✔ = 수정 필요
│   ├── crawl_service.py              ✔ = 수정 필요
│   └── target_selector.py            ✔ = 수정 필요
└── management/
    ├── __init__.py
    └── commands/
        ├── __init__.py
        ├── test_review_crawl.py      ✔ = 수정 필요
        └── scheduled_crawl.py        ✔ = 수정 필요
```

`apps/crawling/models.py` (수정)
```python
from django.db import models


class CrawlTarget(models.Model):
    """
    크롤링 대상 URL 저장
    - search: 검색 페이지
    - product: 상품 상세 페이지
    """

    SITE_CHOICES = [
        ("danawa", "다나와"),
        ("hwahae", "화해"),
        ("glowpick", "글로우픽"),
    ]

    TARGET_TYPE_CHOICES = [
        ("search", "검색 페이지"),
        ("product", "상품 상세 페이지"),
    ]

    site = models.CharField(max_length=30, choices=SITE_CHOICES)
    target_type = models.CharField(
        max_length=20,
        choices=TARGET_TYPE_CHOICES,
        default="product",
    )
    keyword = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=1000, unique=True)

    is_active = models.BooleanField(default=True)

    # 스케줄링 제어용
    crawl_interval_minutes = models.PositiveIntegerField(
        default=60,
        help_text="이 target을 다시 수집할 최소 간격(분)"
    )
    priority = models.PositiveIntegerField(
        default=1,
        help_text="숫자가 클수록 우선 수집"
    )

    last_crawled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "site", "target_type", "-created_at"]
        verbose_name = "크롤링 대상"
        verbose_name_plural = "크롤링 대상 목록"

    def __str__(self):
        return f"{self.site} | {self.target_type} | {self.url}"


class CrawlRawData(models.Model):
    """
    크롤링해서 가져온 원본 데이터 저장

    review 전용까지 포함:
    - page_info
    - candidate_link
    - review
    """

    RECORD_TYPE_CHOICES = [
        ("page_info", "페이지 정보"),
        ("candidate_link", "후보 링크"),
        ("review", "리뷰"),
    ]

    target = models.ForeignKey(
        CrawlTarget,
        on_delete=models.CASCADE,
        related_name="raw_items"
    )

    source_url = models.URLField(max_length=1000)
    page_title = models.CharField(max_length=255, blank=True)
    item_title = models.CharField(max_length=255, blank=True)
    item_url = models.URLField(max_length=1000, blank=True)

    raw_text = models.TextField(blank=True)
    raw_html = models.TextField(blank=True)

    extra_data = models.JSONField(default=dict, blank=True)

    record_type = models.CharField(
        max_length=30,
        choices=RECORD_TYPE_CHOICES,
        default="review",
        db_index=True,
    )

    unique_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        blank=True,
        null=False,
    )

    crawled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-crawled_at"]
        verbose_name = "크롤링 원본 데이터"
        verbose_name_plural = "크롤링 원본 데이터 목록"
        indexes = [
            models.Index(fields=["target", "record_type"]),
            models.Index(fields=["source_url"]),
            models.Index(fields=["item_url"]),
        ]

    def __str__(self):
        return f"{self.target.site} | {self.record_type} | {self.item_title or self.page_title}"


class CrawlJobLog(models.Model):
    STATUS_CHOICES = [
        ("success", "성공"),
        ("failed", "실패"),
    ]

    site = models.CharField(max_length=30)
    command_name = models.CharField(max_length=100, default="scheduled_crawl")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    total_targets = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    fail_count = models.PositiveIntegerField(default=0)

    message = models.TextField(blank=True)

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "크롤링 실행 로그"
        verbose_name_plural = "크롤링 실행 로그 목록"

    def __str__(self):
        return f"{self.site} | {self.status} | {self.started_at}"
```

`apps/crawling/admin.py` (선택수정)
```python
from django.contrib import admin
from .models import CrawlTarget, CrawlRawData, CrawlJobLog


@admin.register(CrawlTarget)
class CrawlTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "target_type",
        "keyword",
        "title",
        "priority",
        "crawl_interval_minutes",
        "is_active",
        "last_crawled_at",
        "created_at",
    )
    list_filter = ("site", "target_type", "is_active")
    search_fields = ("keyword", "title", "url")
    ordering = ("-priority", "site", "target_type", "-created_at")


@admin.register(CrawlRawData)
class CrawlRawDataAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "target",
        "record_type",
        "item_title",
        "raw_text_preview",
        "crawled_at",
    )

    list_filter = ("target__site", "record_type", "crawled_at")

    search_fields = ("item_title", "raw_text")

    def raw_text_preview(self, obj):
        return obj.raw_text[:80]

    raw_text_preview.short_description = "리뷰 내용"


@admin.register(CrawlJobLog)
class CrawlJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "command_name",
        "status",
        "total_targets",
        "success_count",
        "fail_count",
        "started_at",
        "finished_at",
    )
    list_filter = ("site", "status")
    search_fields = ("site", "message")
    ordering = ("-started_at",)
```

`apps/crawling/collectors/hwahae_review_collector.py` (수정)
```python
import re
import time

import undetected_chromedriver as uc
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By


class HwahaeReviewCollector:
    """
    화해 상품 상세 페이지에서 리뷰 데이터를 수집합니다.
    """

    def _build_driver(self):
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--start-maximized")
        options.add_argument("--window-size=1400,1200")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/145.0.0.0 Safari/537.36"
        )

        driver = uc.Chrome(
            options=options,
            version_main=145,
            headless=True,
            use_subprocess=True,
        )
        return driver

    def _is_author_line(self, text: str) -> bool:
        """
        예: nkiihu 20대/복합성 2026.03.12
        """
        has_date = bool(re.search(r"\d{4}\.\d{2}\.\d{2}", text))
        has_age_skin = bool(re.search(r"(10대|20대|30대|40대|50대|건성|지성|복합성|민감성)", text))
        return has_date and has_age_skin

    def _is_stop_line(self, text: str) -> bool:
        stop_keywords = [
            "성분", "장바구니", "구매", "배송", "브랜드", "광고", "추천순",
            "평점", "별점", "필터", "정렬", "상품정보", "전성분", "리뷰쓰기",
        ]
        return any(keyword in text for keyword in stop_keywords)

    def _clean_review_text(self, text: str) -> str:
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def collect_reviews(self, product_url: str, limit: int = 20) -> list[dict]:
        driver = None
        results = []

        try:
            driver = self._build_driver()

            driver.get("https://www.hwahae.co.kr/")
            time.sleep(3)

            driver.get(product_url)
            time.sleep(5)

            for _ in range(5):
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1.5)

            buttons = driver.find_elements(By.XPATH, "//*[contains(text(),'리뷰')]")
            for b in buttons:
                try:
                    if "리뷰" in b.text:
                        driver.execute_script("arguments[0].click();", b)
                        time.sleep(5)
                        break
                except Exception:
                    continue

            html = driver.page_source
            soup = BeautifulSoup(html, "lxml")

            texts = []
            for tag in soup.find_all(["p", "span", "div"]):
                text = tag.get_text(" ", strip=True)
                if 2 <= len(text) <= 200:
                    texts.append(text)

            unique_texts = []
            seen = set()
            for t in texts:
                if t not in seen:
                    seen.add(t)
                    unique_texts.append(t)

            i = 0
            while i < len(unique_texts):
                line = unique_texts[i]

                if self._is_author_line(line):
                    author_info = line
                    review_parts = []
                    j = i + 1

                    while j < len(unique_texts):
                        next_line = unique_texts[j]

                        if self._is_author_line(next_line):
                            break

                        if self._is_stop_line(next_line):
                            break

                        if len(next_line) >= 8:
                            review_parts.append(next_line)

                        if len(review_parts) >= 3:
                            break

                        j += 1

                    review_text = self._clean_review_text(" ".join(review_parts))

                    if review_text and 10 <= len(review_text) <= 300:
                        results.append({
                            "source": "hwahae",
                            "url": product_url,
                            "author_info": author_info,
                            "review": review_text,
                        })

                    i = j
                else:
                    i += 1

            return results[:limit]

        except Exception as e:
            print(f"hwahae 리뷰 수집 실패: {e}")
            return []

        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass
```

`apps/crawling/collectors/danawa_review_collector.py` (수정)
```python
import re
import requests
from bs4 import BeautifulSoup


class DanawaReviewCollector:
    """
    다나와 상품 상세 페이지의 리뷰 영역에서 텍스트를 최대한 추출하는 휴리스틱 버전
    """
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/145.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    def _clean_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()

    def _looks_like_review(self, text: str) -> bool:
        if len(text) < 20 or len(text) > 400:
            return False

        stop_keywords = [
            "상품정보", "스펙", "최저가", "판매처", "의견", "비교", "구매하기",
            "제조사", "가격비교", "등록월", "배송비",
        ]
        if any(k in text for k in stop_keywords):
            return False

        return True

    def collect_reviews(self, product_url: str, limit: int = 20) -> list[dict]:
        try:
            response = requests.get(product_url, headers=self.HEADERS, timeout=20)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "lxml")

            texts = []
            for tag in soup.find_all(["p", "div", "span", "li"]):
                text = self._clean_text(tag.get_text(" ", strip=True))
                if self._looks_like_review(text):
                    texts.append(text)

            unique_texts = []
            seen = set()
            for text in texts:
                if text not in seen:
                    seen.add(text)
                    unique_texts.append(text)

            results = []
            for idx, review_text in enumerate(unique_texts[:limit], start=1):
                results.append({
                    "source": "danawa",
                    "url": product_url,
                    "author_info": f"danawa_user_{idx}",
                    "review": review_text,
                })

            return results

        except Exception as e:
            print(f"danawa 리뷰 수집 실패: {e}")
            return []
```

`apps/crawling/collectors/glowpick_review_collector.py` (수정)
```python
import re
import requests
from bs4 import BeautifulSoup


class GlowpickReviewCollector:
    """
    글로우픽 상품 상세 페이지 리뷰 휴리스틱 버전
    """
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/145.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    def _clean_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()

    def _looks_like_review(self, text: str) -> bool:
        if len(text) < 15 or len(text) > 350:
            return False

        stop_keywords = [
            "랭킹", "브랜드", "카테고리", "필터", "정렬", "구매", "광고",
            "이벤트", "성분", "추천", "별점",
        ]
        if any(k in text for k in stop_keywords):
            return False

        return True

    def collect_reviews(self, product_url: str, limit: int = 20) -> list[dict]:
        try:
            response = requests.get(product_url, headers=self.HEADERS, timeout=20)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "lxml")

            texts = []
            for tag in soup.find_all(["p", "div", "span", "li"]):
                text = self._clean_text(tag.get_text(" ", strip=True))
                if self._looks_like_review(text):
                    texts.append(text)

            unique_texts = []
            seen = set()
            for text in texts:
                if text not in seen:
                    seen.add(text)
                    unique_texts.append(text)

            results = []
            for idx, review_text in enumerate(unique_texts[:limit], start=1):
                results.append({
                    "source": "glowpick",
                    "url": product_url,
                    "author_info": f"glowpick_user_{idx}",
                    "review": review_text,
                })

            return results

        except Exception as e:
            print(f"glowpick 리뷰 수집 실패: {e}")
            return []
```

`apps/crawling/services/save_service.py` (수정)
```python
import hashlib

from django.db import transaction
from django.utils import timezone

from apps.crawling.services.repository import upsert_raw_data


def make_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_review_unique_key(target, review: dict) -> str:
    raw = (
        f"{target.site}:review:"
        f"{target.url}:"
        f"{review.get('author_info', '')}:"
        f"{review.get('review', '')}"
    )
    return make_hash(raw)


def build_review_defaults(target, review: dict) -> dict:
    return {
        "target": target,
        "source_url": target.url,
        "page_title": target.title[:255] if target.title else "",
        "item_title": target.title[:255] if target.title else "",
        "item_url": target.url,
        "raw_text": review.get("review", "")[:5000],
        "raw_html": "",
        "record_type": "review",
        "extra_data": {
            "source": review.get("source", target.site),
            "author_info": review.get("author_info", ""),
        },
    }


@transaction.atomic
def save_review_result(target, reviews: list[dict]) -> dict:
    created_count = 0
    updated_count = 0

    for review in reviews:
        unique_key = build_review_unique_key(target, review)

        _, created = upsert_raw_data(
            unique_key=unique_key,
            defaults={
                **build_review_defaults(target, review),
                "unique_key": unique_key,
            }
        )

        if created:
            created_count += 1
        else:
            updated_count += 1

    target.last_crawled_at = timezone.now()
    target.save(update_fields=["last_crawled_at"])

    return {
        "review_count": len(reviews),
        "created_count": created_count,
        "updated_count": updated_count,
    }
```

`apps/crawling/services/crawl_service.py` (수정) 리뷰로 변경
```python
from apps.crawling.collectors.danawa_review_collector import DanawaReviewCollector
from apps.crawling.collectors.hwahae_review_collector import HwahaeReviewCollector
from apps.crawling.collectors.glowpick_review_collector import GlowpickReviewCollector
from apps.crawling.services.save_service import save_review_result


def crawl_product_review_target(target, review_limit: int = 20) -> dict:
    """
    product target에 대해 사이트별 리뷰 collector를 실행하고 저장합니다.
    """

    if target.site == "danawa":
        collector = DanawaReviewCollector()
    elif target.site == "hwahae":
        collector = HwahaeReviewCollector()
    elif target.site == "glowpick":
        collector = GlowpickReviewCollector()
    else:
        raise ValueError(f"지원하지 않는 사이트입니다: {target.site}")

    reviews = collector.collect_reviews(target.url, limit=review_limit)
    save_result = save_review_result(target, reviews)

    return {
        "review_count": save_result["review_count"],
        "created_count": save_result["created_count"],
        "updated_count": save_result["updated_count"],
    }
```

`apps/crawling/management/commands/test_review_crawl.py` (수정)
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlTarget, CrawlJobLog
from apps.crawling.services.crawl_service import crawl_product_review_target


class Command(BaseCommand):
    help = "상품 상세 페이지(product target)에 대해 리뷰 테스트 크롤링을 수행합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=3,
            help="테스트할 target 개수"
        )
        parser.add_argument(
            "--review-limit",
            type=int,
            default=5,
            help="상품당 최대 리뷰 수집 개수"
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        review_limit = options["review_limit"]

        targets = CrawlTarget.objects.filter(
            is_active=True,
            target_type="product"
        ).order_by("-priority", "created_at")[:limit]

        total_targets = targets.count()
        success_count = 0
        fail_count = 0
        total_created = 0
        total_updated = 0

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="test_review_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message=f"리뷰 테스트 크롤링 시작 (limit={limit}, review_limit={review_limit})",
        )

        self.stdout.write(self.style.SUCCESS("리뷰 테스트 크롤링 시작"))

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_product_review_target(target, review_limit=review_limit)
                success_count += 1

                total_created += result["created_count"]
                total_updated += result["updated_count"]

                site_summary[target.site] = {
                    "targets": site_summary.get(target.site, {}).get("targets", 0) + 1,
                    "created": site_summary.get(target.site, {}).get("created", 0) + result["created_count"],
                    "updated": site_summary.get(target.site, {}).get("updated", 0) + result["updated_count"],
                    "reviews": site_summary.get(target.site, {}).get("reviews", 0) + result["review_count"],
                }

                self.stdout.write(
                    self.style.SUCCESS(
                        f"성공 - review_count={result['review_count']} / "
                        f"created={result['created_count']} / "
                        f"updated={result['updated_count']}"
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(self.style.ERROR(f"실패 - {str(e)}"))

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = (
            f"사이트별 처리 수: {site_summary} | "
            f"전체 created={total_created}, updated={total_updated}"
        )
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\n리뷰 테스트 크롤링 종료")
        self.stdout.write(
            self.style.SUCCESS(
                f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count} / "
                f"created {total_created} / updated {total_updated}"
            )
        )
```

`apps/crawling/management/commands/scheduled_crawl.py` (수정)
```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crawling.models import CrawlJobLog
from apps.crawling.services.crawl_service import crawl_product_review_target
from apps.crawling.services.target_selector import get_due_targets


class Command(BaseCommand):
    help = "스케줄링용 리뷰 크롤링 명령어. due product target만 limit 개수만큼 실행합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=3,
            help="한 번 실행할 최대 target 개수"
        )
        parser.add_argument(
            "--review-limit",
            type=int,
            default=5,
            help="상품당 최대 리뷰 수집 개수"
        )
        parser.add_argument(
            "--target-type",
            type=str,
            default="product",
            help="기본값은 product"
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        review_limit = options["review_limit"]
        target_type = options["target_type"]

        targets = get_due_targets(limit=limit, target_type=target_type)
        total_targets = targets.count()

        success_count = 0
        fail_count = 0

        total_created = 0
        total_updated = 0

        site_summary = {}

        log = CrawlJobLog.objects.create(
            site="all",
            command_name="scheduled_crawl",
            status="success",
            total_targets=total_targets,
            success_count=0,
            fail_count=0,
            message=(
                f"scheduled_crawl 시작 "
                f"(limit={limit}, review_limit={review_limit}, target_type={target_type})"
            ),
        )

        self.stdout.write(self.style.SUCCESS("scheduled_crawl 시작"))

        if total_targets == 0:
            log.status = "success"
            log.message = "실행할 due target이 없습니다."
            log.finished_at = timezone.now()
            log.save()

            self.stdout.write("실행할 대상이 없습니다.")
            return

        for target in targets:
            self.stdout.write(f"\n[{target.site}] {target.url}")

            try:
                result = crawl_product_review_target(target, review_limit=review_limit)
                success_count += 1

                total_created += result["created_count"]
                total_updated += result["updated_count"]

                site_summary[target.site] = {
                    "targets": site_summary.get(target.site, {}).get("targets", 0) + 1,
                    "created": site_summary.get(target.site, {}).get("created", 0) + result["created_count"],
                    "updated": site_summary.get(target.site, {}).get("updated", 0) + result["updated_count"],
                    "reviews": site_summary.get(target.site, {}).get("reviews", 0) + result["review_count"],
                }

                self.stdout.write(
                    self.style.SUCCESS(
                        f"성공 - review_count={result['review_count']} / "
                        f"created={result['created_count']} / "
                        f"updated={result['updated_count']}"
                    )
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(self.style.ERROR(f"실패 - {str(e)}"))

        final_status = "success" if fail_count == 0 else "failed"

        log.status = final_status
        log.success_count = success_count
        log.fail_count = fail_count
        log.message = (
            f"사이트별 처리 수: {site_summary} | "
            f"전체 created={total_created}, updated={total_updated}"
        )
        log.finished_at = timezone.now()
        log.save()

        self.stdout.write("\nscheduled_crawl 종료")
        self.stdout.write(
            self.style.SUCCESS(
                f"총 {total_targets}개 / 성공 {success_count} / 실패 {fail_count} / "
                f"created {total_created} / updated {total_updated}"
            )
        )
```

`apps/crawling/tests.py`
```python
from django.test import TestCase

from apps.crawling.models import CrawlRawData, CrawlTarget
from apps.crawling.services.save_service import save_review_result


class SaveReviewResultTest(TestCase):
    def setUp(self):
        self.target = CrawlTarget.objects.create(
            site="hwahae",
            target_type="product",
            keyword="수분크림",
            title="화해 수분크림 상품",
            url="https://www.hwahae.co.kr/goods/70006",
        )

        self.reviews = [
            {
                "source": "hwahae",
                "url": self.target.url,
                "author_info": "user1 20대/복합성 2026.03.12",
                "review": "무난한 수분크림이고 보습감은 적당했습니다.",
            },
            {
                "source": "hwahae",
                "url": self.target.url,
                "author_info": "user2 30대/건성 2026.03.11",
                "review": "발림성은 좋았지만 아주 강한 보습은 아니었습니다.",
            },
        ]

    def test_first_save_creates_rows(self):
        summary = save_review_result(self.target, self.reviews)

        self.assertEqual(summary["created_count"], 2)
        self.assertEqual(summary["updated_count"], 0)
        self.assertEqual(CrawlRawData.objects.count(), 2)

    def test_second_save_updates_not_duplicates(self):
        save_review_result(self.target, self.reviews)
        summary = save_review_result(self.target, self.reviews)

        self.assertEqual(summary["created_count"], 0)
        self.assertEqual(summary["updated_count"], 2)
        self.assertEqual(CrawlRawData.objects.count(), 2)

    def test_review_text_changes_should_create_new_hash(self):
        save_review_result(self.target, self.reviews)

        modified_reviews = [
            {
                "source": "hwahae",
                "url": self.target.url,
                "author_info": "user1 20대/복합성 2026.03.12",
                "review": "무난한 수분크림인데 생각보다 흡수가 빨랐습니다.",
            }
        ]

        summary = save_review_result(self.target, modified_reviews)

        self.assertEqual(summary["created_count"], 1)
        self.assertEqual(CrawlRawData.objects.count(), 3)
```


**Django shell**에서 한 번 실행
```bash
python manage.py shell
```

등록 예시: product target 넣기
```python
from apps.crawling.models import CrawlTarget

targets = [
    {
        "site": "hwahae",
        "target_type": "product",
        "keyword": "수분크림",
        "title": "화해 수분크림 상품",
        "url": "https://www.hwahae.co.kr/goods/70006",
        "crawl_interval_minutes": 60,
        "priority": 3,
    },
    {
        "site": "danawa",
        "target_type": "product",
        "keyword": "수분크림",
        "title": "다나와 수분크림 상품",
        "url": "https://prod.danawa.com/info/?pcode=00000000",
        "crawl_interval_minutes": 60,
        "priority": 2,
    },
    {
        "site": "glowpick",
        "target_type": "product",
        "keyword": "수분크림",
        "title": "글로우픽 수분크림 상품",
        "url": "https://www.glowpick.com/products/00000",
        "crawl_interval_minutes": 60,
        "priority": 2,
    },
]

for item in targets:
    CrawlTarget.objects.update_or_create(
        url=item["url"],
        defaults=item,
    )
```

마이그레이션
```
python manage.py makemigrations crawling  
python manage.py migrate
```

```bash
python manage.py test_crawl --limit 1 --review-limit 5
```

결과
![[Pasted image 20260315180235.png]]

cron 편집기 열기
```bash
crontab -e
```

```
1 → nano
```

파일 맨 아래에 붙여넣습니다.
```bash
0 * * * * /home/youjung/product-review-service/.venv/bin/python /home/youjung/product-review-service/backend/manage.py scheduled_crawl --limit 3 --review-limit 5 --target-type product >> /home/youjung/product-review-service/logs/crawl.log 2>&1
```

저장
```
CTRL + O  
ENTER  
CTRL + X
```

### cron은 기다리기 힘드니 **수동 테스트** 먼저 합니다.
```bash
/home/youjung/product-review-service/.venv/bin/python \
/home/youjung/product-review-service/backend/manage.py scheduled_crawl \
--limit 3 \
--review-limit 5 \
--target-type product
```

cron이 실행되면 로그가 쌓입니다.
```bash
cat /home/youjung/product-review-service/logs/crawl.log
```

### 지금 바로 새로 크롤링하려면

리뷰만 다시 확인하려면 기존 crawling 원본 데이터를 비우고, 다시 review 크롤링만 실행하는 게 제일 깔끔합니다.
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlTarget

targets = [
    {
        "site": "danawa",
        "target_type": "search",
        "keyword": "수분 보습크림",
        "title": "다나와 수분크림 검색",
        "url": "[https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC](https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84+%EB%B3%B4%EC%8A%B5%ED%81%AC%EB%A6%BC&tab=main)",
    },
    {
        "site": "hwahae",
        "target_type": "search",
        "keyword": "수분 보습크림",
        "title": "화해 수분크림 검색",
        "url": "[https://www.hwahae.co.kr/search?q=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC&type=goods](https://www.hwahae.co.kr/search?q=%EC%88%98%EB%B6%84%20%EB%B3%B4%EC%8A%B5%ED%81%AC%EB%A6%BC)",
    },
    {
        "site": "glowpick",
        "target_type": "search",
        "keyword": "수분 보습크림",
        "title": "글로우픽 수분크림 검색",
        "url": "[https://glowpick.co.kr/ranking/search/%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC](https://glowpick.co.kr/ranking/search/%EC%88%98%EB%B6%84%20%EB%B3%B4%EC%8A%B5%ED%81%AC%EB%A6%BC)",
    },
]

for item in targets:
    CrawlTarget.objects.update_or_create(
        url=item["url"],
        defaults=item,
    )

print("등록 완료")

exit()
```
여기서 `review`가 0이면 리뷰가 아직 거의 안 들어간 상태일 수 있습니다.

이제 리뷰 테스트 크롤링 다시 실행
```bash
python manage.py test_crawl --limit 3 --review-limit 10 
python manage.py test_crawl --limit 3 --review-limit 10  
python manage.py test_crawl --limit 3 --review-limit 10
```
한번씩 시간을 두고 반복해서 터미널에 위의 명령어를 입력합니다.

다시 shell에서 review 개수 확인
```bash
python manage.py shell
```

```python
from apps.crawling.models import CrawlRawData, CrawlTarget

print("search target:", CrawlTarget.objects.filter(target_type="search").count())
print("product target:", CrawlTarget.objects.filter(target_type="product").count())

print("candidate_link:", CrawlRawData.objects.filter(record_type="candidate_link").count())
print("page_info:", CrawlRawData.objects.filter(record_type="page_info").count())
print("review:", CrawlRawData.objects.filter(record_type="review").count())
```
해석
- `search target`은 늘었는데 `candidate_link`가 0  
    → 검색 페이지 파싱이 안 됨
    
- `candidate_link`는 생기는데 `product target`이 안 늘어남  
    → 후보 링크를 상품 타겟으로 넘기는 단계 확인 필요
    
- `product target`은 늘었는데 `review`가 0  
    → 상품 상세 리뷰 파서 문제

---
이제 Django 관리자 페이지(admin)에서 확인하시면 됩니다.
```
cron
  ↓
scheduled_crawl
  ↓
target 선택
  ↓
사이트별 크롤러 실행
  ↓
데이터 파싱
  ↓
DB 저장
  ↓
admin에서 확인
```