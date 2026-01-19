🔹 DRF 튜토리얼 Part7 _ Schemas & Client Libraries

📖 공식 문서 링크:  
🔗 [https://www.django-rest-framework.org/api-guide/schemas/](https://www.django-rest-framework.org/api-guide/schemas/)

목표:
`스키마(Schema)란?`	
	API의 구조와 동작을 기계가 읽을 수 있게 문서화한 JSON or YAML 형식
`왜 필요한가?`	
	Swagger, ReDoc, 자동 문서, 클라이언트 SDK 생성 등을 위해 사용
`지원되는 형식`	
	OpenAPI 3 (이전: Swagger 2.0)
`추천 도구`	
	drf-spectacular ← 공식 추천

---
✅ Schema 생성 방식 2가지
`정적 생성 (Offline)`	.yml 파일로 한번 생성 후 저장	
	`python manage.py generateschema --file openapi.yml`
`동적 생성 (Live)`	
	/openapi 주소로 실시간 제공	`get_schema_view()`를 통해 등록

---
✅ 스키마 동적 제공하기
필수 설치
```bash
pip install pyyaml uritemplate inflection
```

`urls.py`에 스키마 뷰 추가
```python
from rest_framework.schemas import get_schema_view
from django.urls import path

urlpatterns = [
    # ... 기존 path들 ...
    path(
        "openapi/",
        get_schema_view(
            title="My Project API",
            description="모든 기능을 정리한 API 문서",
            version="1.0.0",
        ),
        name="openapi-schema"
    ),
]
```
---
✅ 접속 :` http://127.0.0.1:8000/openapi/`
OpenAPI 형식의 JSON 문서가 출력됨

---
✅ 스키마 커스터마이징
`SchemaGenerator`	전체 URL을 순회하며 스키마 생성	
`AutoSchema`	각 View에서 자동 introspection	
`get_schema_view()`	동적 문서를 view로 생성해주는 함수	
`@schema 또는 schema = CustomSchema()`	뷰마다 개별 스키마 적용

---
✅ 왜 `drf-spectacular`를 추천하는가?
OpenAPI 3.0 완전 지원	
Swagger UI / ReDoc 자동 연동 지원	
커스터마이징 쉬움 + 대규모 서비스에 적합	
VSCode, SwaggerHub 등과 호환 가능

