목표
```
product 목록 조회 시  
한 번에 전부 보여주지 않고  
페이지 단위로 나누어 보여주기
```

진행 순서
```
1. pagination 클래스 작성  
2. product/views.py에 연결  
3. 서버 실행  
4. 데이터 여러 개 생성  
5. GET 요청으로 테스트
```

pagination 클래스 작성
`backend/apps/products/paginations.py`
```python
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class ProductPageNumberPagination(PageNumberPagination):
    page_size = 3
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })
```

`backend/apps/product/views.py`
```python
from rest_framework.viewsets import ViewSet

from .models import Product
from .serializers import ProductSerializer
from .paginations import ProductPageNumberPagination # 추가


class ProductViewSet(ViewSet):
    """
    상품 목록 페이지네이션
    """

    def list(self, request):
        queryset = Product.objects.all().order_by("-id")

        paginator = ProductPageNumberPagination() # 추가
        page = paginator.paginate_queryset(queryset, request) # 추가

        serializer = ProductSerializer(
            page,
            many=True,
            context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)
```

`mysite/settings.py`
```python
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 3,
}
```

서버실행
```bash
python manage.py runserver
```

---
### curl 테스트

curl로 여러 개 생성
```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
  "name": "상품 1",
  "description": "상품 설명 1",
  "price": 10000
}'
```

내용만 바꿔서 여러 번 넣습니다.
```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
  "name": "상품 2",
  "description": "상품 설명 2",
  "price": 20000
}'
```

```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
  "name": "상품 3",
  "description": "상품 설명 3",
  "price": 30000
}'
```

```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
  "name": "상품 4",
  "description": "상품 설명 4",
  "price": 40000
}'
```

```bash
curl -X POST http://127.0.0.1:8000/products/ \
-H "Content-Type: application/json" \
-d '{
  "name": "상품 5",
  "description": "상품 설명 5",
  "price": 50000
}'
```

페이지네이션 테스트
```bash
curl http://127.0.0.1:8000/products/?page=1
```
결과
```
{"count":0,"next":null,"previous":null,"results":[]}

count = 전체 리뷰 개수  
results = 현재 페이지 데이터
```


```bash
curl http://127.0.0.1:8000/products/?page=2
```
결과
```
{"detail":"Invalid page."}

전체 데이터 0개  
→ 페이지는 1페이지밖에 없음  
→ page=2 요청 → 존재하지 않는 페이지
```


페이지 크기 변경 테스트
```bash
curl "http://127.0.0.1:8000/products/?page=1&page_size=2"
```
결과
```
{"count":0,"next":null,"previous":null,"results":[]}(product-review-service)

page=1 → 정상  
page=2 → 정상  
page_size → 정상
```