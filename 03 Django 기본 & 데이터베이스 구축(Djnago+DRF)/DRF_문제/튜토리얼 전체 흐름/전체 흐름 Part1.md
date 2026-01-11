- 실제 사용 가능한 REST API를 설계하고 구현하는 전 과정을 익힌다.
- Django로 만든 웹앱을 RESTful API 서버로 전환하는 과정을 단계적으로 체험한다.
- 보안(인증/권한), 구조(링크 기반), 자동화(ViewSet/Router)를 통해 실무 수준의 API 구조를 익힌다.

```python
# 디렉토리 생성
mkdir drf_tutorial 
cd drf_tutorial

# 가상환경 설정
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install django
pip install djangorestframework

# 서드파티 설치 Browsable API용
pip install markdown

# 새 프로젝트 생성
django-admin startproject tutorial .

# 새 앱 생성
python manage.py startapp snippets
```

 `tutorial/settings.py`
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'snippets',
]
```

`pygments` 외부 패키지
```bash
pip install pygments
```

`snippets/models.py`
```python
from django.db import models
from pygments.lexers import get_all_lexers
from pygments.styles import get_all_styles

LEXERS = [item for item in get_all_lexers() if item[1]]
LANGUAGE_CHOICES = sorted([(item[1][0], item[0]) for item in LEXERS])
STYLE_CHOICES = sorted([(item, item) for item in get_all_styles()])


class Snippet(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=100, blank=True, default='')
    code = models.TextField()
    linenos = models.BooleanField(default=False)
    language = models.CharField(choices=LANGUAGE_CHOICES, default='python', max_length=100)
    style = models.CharField(choices=STYLE_CHOICES, default='friendly', max_length=100)

    class Meta:
        ordering = ['created']

```

```
[LEXERS 정의]
- Pygments에서 지원하는 모든 프로그래밍 언어 정보를 가져온다
- 각 언어 항목에서 별칭(alias)이 존재하는 것만 필터링한다
- 예: ('Python', ['python', 'py'], ['*.py'], ['text/x-python'])

[LANGUAGE_CHOICES 생성]
- 각 언어에서 첫 번째 alias와 언어 이름을 추출해서 정렬된 리스트로 만든다
- 예: [('python', 'Python'), ('js', 'JavaScript'), ...]

[STYLE_CHOICES 생성]
- Pygments에서 지원하는 스타일 목록을 받아서 [(이름, 이름)] 형식으로 정렬
- 예: [('friendly', 'friendly'), ('monokai', 'monokai'), ...]

```

```python
# 마이그레이션
python manage.py makemigrations snippets
python manage.py migrate
```
---
`snippets/serializers.py` 기본형
```python
from rest_framework import serializers
from snippets.models import Snippet, LANGUAGE_CHOICES, STYLE_CHOICES

class SnippetSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(required=False, allow_blank=True, max_length=100)
    code = serializers.CharField(style={'base_template': 'textarea.html'})
    linenos = serializers.BooleanField(required=False)
    language = serializers.ChoiceField(choices=LANGUAGE_CHOICES, default='python')
    style = serializers.ChoiceField(choices=STYLE_CHOICES, default='friendly')

    def create(self, validated_data):
        return Snippet.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field in ['title','code','linenos','language','style']:
            setattr(instance, field, validated_data.get(field, getattr(instance, field)))
        instance.save()
        return instance
```

```
[클래스 이름]
- SnippetSerializer: Snippet 모델 데이터를 JSON으로 변환하거나,
                     JSON 데이터를 Snippet 모델로 변환해주는 클래스

[상속]
- DRF의 기본 Serializer를 상속받음
```

```
- id:
    정수형 필드, 읽기 전용 (자동 생성되는 PK 값)

- title:
    문자열 필드, 필수 아님, 빈 문자열 허용, 최대 길이 100자

- code:
    문자열 필드, 코드 내용을 입력받음
    textarea 형식으로 보여줄 수 있도록 style 지정

- linenos:
    불리언 필드 (True/False)
    줄 번호를 표시할지 여부, 필수 아님

- language:
    선택 필드, LANGUAGE_CHOICES 중 하나 선택
    기본값 'python'

- style:
    선택 필드, STYLE_CHOICES 중 하나 선택
    기본값 'friendly'
```

def create(self, validated_data):
```
[용도]
- POST 요청에서 새로운 Snippet 객체를 만들 때 사용됨

[동작]
- validated_data(검증된 데이터)를 이용해 Snippet 모델 인스턴스를 생성하고 DB에 저장
- 저장된 객체를 리턴
```

def update(self, instance, validated_data):
```
[용도]
- PUT 요청에서 기존 Snippet 객체를 수정할 때 사용됨

[동작]
- instance: 수정 대상이 되는 기존 Snippet 객체
- validated_data: 새로 입력된 데이터
- 각 필드를 새 값으로 바꾸고 저장
- 바뀐 instance를 리턴
```


🔷 `ModelSerializer` 버전
`snippets/serializers.py`
```python
from rest_framework import serializers
from snippets.models import Snippet


class SnippetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Snippet
        fields = ['id', 'title', 'code', 'linenos', 'language', 'style']
```

`snippets/views.py`
```python
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from snippets.models import Snippet
from snippets.serializers import SnippetSerializer


@csrf_exempt
def snippet_list(request):
    if request.method == 'GET':
        snippets = Snippet.objects.all()
        serializer = SnippetSerializer(snippets, many=True)
        return JsonResponse(serializer.data, safe=False)

    elif request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = SnippetSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, status=201)
        return JsonResponse(serializer.errors, status=400)

----------------
		if serializer.is_valid():
		    serializer.save()
		    return JsonResponse(serializer.data, status=201)
		else:
		    return JsonResponse(serializer.errors, status=400)
------------------------


@csrf_exempt
def snippet_detail(request, pk):
    try:
        snippet = Snippet.objects.get(pk=pk)
    except Snippet.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = SnippetSerializer(snippet) 
        # 모델 인스턴스를 JSON으로 바꾸는 것
        
        return JsonResponse(serializer.data)

    elif request.method == 'PUT':
        data = JSONParser().parse(request)
        # 입력된 HTTP 요청 데이터를 JSON(Python dict)으로 변환하는 
        # 작업, 즉 "파싱(parsing)"을 수행합니다.
		serializer = SnippetSerializer(snippet, data=data)

// JSON (문자열) data = JSONParser().parse(request)
'{"name": "Alice", "age": 25, "is_admin": false, "score": null}'

# Python dict -> serializer = SnippetSerializer(snippet, data=data)
{
    "name": "Alice",
    "age": 25,
    "is_admin": False,
    "score": None
}



        
		

        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'DELETE':
        snippet.delete()
        return HttpResponse(status=204)
```

이 코드는 웹서버에 다음 기능의 API를 제공합니다:
- `/snippets/` 경로로
    - `GET`: 모든 코드(snippet) 목록을 JSON으로 반환
    - `POST`: 새로운 코드를 저장
- `/snippets/<pk>/` 경로로
    - `GET`: 특정 코드 한 개의 정보를 조회
    - `PUT`: 특정 코드 내용을 수정
    - `DELETE`: 특정 코드를 삭제

의사코드
```
[함수: snippet_list 요청 처리]

만약 요청 방식이 GET이라면:
    - 데이터베이스에서 Snippet 전체 목록을 가져온다
    - SnippetSerializer를 사용해 목록을 JSON으로 바꾼다
    - 그 JSON 데이터를 브라우저 또는 클라이언트에 응답으로 보낸다

만약 요청 방식이 POST라면:
    - 요청으로부터 JSON 데이터를 읽어온다
    - SnippetSerializer를 사용해 해당 데이터를 Python 객체로 변환한다
    - 데이터가 유효하면 (검증 성공):
     - DB에 저장하고, 저장된 데이터를 다시 JSON으로 만들어 응답한다 
       (201 Created)
    - 데이터가 잘못되었으면 (검증 실패):
    - 에러 메시지를 JSON으로 보내고, 400 Bad Request 상태로 응답한다
```

```
[함수: snippet_detail 요청 처리, 인자로 pk(기본키, ID)를 받음]

먼저:
    - pk에 해당하는 Snippet이 DB에 있는지 확인한다
    - 없으면 404 Not Found 응답을 보낸다

만약 요청 방식이 GET이라면:
    - DB에서 가져온 snippet 객체(예: 특정 코드 조각 데이터)를
    SnippetSerializer라는 클래스를 이용해 JSON으로 변환할 준비를 한다
    (즉, 파이썬 객체 → JSON 형태로 직렬화)
    - 직렬화된 데이터를 꺼내서 JsonResponse로 감싸서 응답으로 보낸다
(JsonResponse는 데이터를 JSON으로 자동 변환해 클라이언트에게 응답함)



# 만약 들어온 요청이 PUT 방식이면 (데이터 수정 요청임)
elif request.method == 'PUT':

    # 클라이언트가 보낸 JSON 데이터를 파이썬 딕셔너리로 변환한다
    # (request.body → 파싱된 딕셔너리로)
    data = JSONParser().parse(request)

    # 기존에 존재하는 snippet 객체를 새로운 data로 업데이트하기 위해
    # SnippetSerializer에 기존 객체(snippet)와 
    새 데이터(data)를 함께 전달
    serializer = SnippetSerializer(snippet, data=data)

    # 새로 전달된 데이터가 유효한지 검사한다
    if serializer.is_valid():

        # 유효하면, serializer를 통해 DB에 수정 내용을 저장한다
        serializer.save()

        # 수정된 결과 데이터를 JSON 형식으로 응답한다
        return JsonResponse(serializer.data)

# 만약 유효하지 않은 데이터라면, 에러 메시지를 JSON 형식으로 반환하고
    #  HTTP 상태 코드를 400(Bad Request)으로 설정해서 응답한다
    return JsonResponse(serializer.errors, status=400)


# 만약 들어온 요청이 DELETE 방식이면 (데이터 삭제 요청임)
elif request.method == 'DELETE':

    # DB에 있는 해당 snippet 객체를 삭제한다
    snippet.delete()

# 삭제 후, 아무 내용 없이 상태 코드 204(No Content)만 응답으로 보낸다
# (204는 "요청은 성공했지만, 보낼 내용은 없다"는 뜻임)
    return HttpResponse(status=204)
```


| 요청       | URL               | 설명       | 관련 View 함수                  | 관련 Serializer 동작                                                  |
| -------- | ----------------- | -------- | --------------------------- | ----------------------------------------------------------------- |
| `GET`    | `/snippets/`      | 전체 목록 조회 | `snippet_list()` (GET)      | `SnippetSerializer(snippets, many=True)` → `serializer.data`      |
| `POST`   | `/snippets/`      | 새 코드 저장  | `snippet_list()` (POST)     | `SnippetSerializer(data=data)` → `is_valid()` → `save()`          |
| `GET`    | `/snippets/<pk>/` | 단일 항목 조회 | `snippet_detail()` (GET)    | `SnippetSerializer(snippet)` → `serializer.data`                  |
| `PUT`    | `/snippets/<pk>/` | 단일 항목 수정 | `snippet_detail()` (PUT)    | `SnippetSerializer(snippet, data=data)` → `is_valid()` → `save()` |
| `DELETE` | `/snippets/<pk>/` | 단일 항목 삭제 | `snippet_detail()` (DELETE) | 없음 (삭제만 수행)                                                       |

전체 목록 조회 (GET)
- **Method**: `GET`
- **URL**: `http://localhost:8000/snippets/`

새 코드 저장 (POST)
- **Method**: `POST`
- **URL**: `http://localhost:8000/snippets/`
- **Body** (JSON):
```
{
  "code": "print('Hello DRF')"
}
```

단일 조회 (GET)
- **Method**: `GET`
- **URL**: `http://localhost:8000/snippets/1/`

단일 수정 (PUT)
- **Method**: `PUT`
- **URL**: `http://localhost:8000/snippets/1/`
- **Body** (JSON):
```
{
  "code": "print('Updated code')"
}
```

단일 삭제 (DELETE)
- **Method**: `DELETE`
- **URL**: `http://localhost:8000/snippets/1/`





`snippets/urls.py`
```python
from django.urls import path
from snippets import views

urlpatterns = [
    path('snippets/', views.snippet_list),
    path('snippets/<int:pk>/', views.snippet_detail),
]
```

`tutorial/urls.py`
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
	path('admin/', admin.site.urls),
    path('', include('snippets.urls')),
]
```

`API 테스트 방법: 서버 실행`
```bash
python manage.py runserver
```

###### 🔹 Insomnia 사용
| 요청                       | URL            | 메서드              | 설명                      |
| ------------------------ | -------------- | ---------------- | ----------------------- |
| 전체 목록 조회                 | `/snippets/`   | `GET`            | 모든 Snippet을 JSON으로 받아옴  |
| 새 Snippet 생성             | `/snippets/`   | `POST`           | JSON 데이터로 새 Snippet 추가  |
| 특정 Snippet 조회            | `/snippets/1/` | `GET`            | ID=1인 Snippet의 상세 정보 조회 |
| 특정 Snippet 수정 .......... | `/snippets/1/` | `PUT` or `PATCH` | ID=1인 Snippet 수정        |
| 특정 Snippet 삭제            | `/snippets/1/` | `DELETE`         | ID=1인 Snippet 삭제        |
```json
{
  "title": "Hello World",
  "code": "print('Hello, World!')",
  "language": "python",
  "style": "friendly",
  "linenos": true
}
```

![[기타/image7-8/Pasted image 20250607232829.png]]

`httpie로 GET 테스트`
```python
pip install httpie

# 전체 스니펫 목록
http GET http://127.0.0.1:8000/snippets/

# 특정 스니펫 상세
http GET http://127.0.0.1:8000/snippets/1/
```


