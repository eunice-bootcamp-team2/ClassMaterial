기능정의
- Todo CRUD API
- 검색 / 필터 / 정렬
- 회원가입 / 로그인
- 사용자별 Todo 관리
- DB 연동
- HTML 화면
- 파일 업로드
- 비동기 작업
- 테스트 및 배포

프로젝트 구조
```
fastapi_todo/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── item.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── item.py
│   └── templates/
│       └── index.html
├── static/
│   └── style.css
└── requirements.txt
```

파일 및 폴더 생성
```bash
cd ~
mkdir fastapi_todo  
cd fastapi_todo
code -r .

mkdir -p app/models  
mkdir -p app/routes  
mkdir -p app/templates  
mkdir -p static

touch app/__init__.py  
touch app/main.py  
  
touch app/models/__init__.py  
touch app/models/item.py  
  
touch app/routes/__init__.py  
touch app/routes/item.py
```

탬플릿 및 정적파일 생성
```bash
touch app/templates/index.html
touch static/style.css
```

가상환경 및 설치 라이브러리 파일
```bash
uv venv
source .venv/bin/activate

# 라이브러리 파일
uv pip install fastapi uvicorn jinja2 python-multipart
```

###### 각 라이브러리 역할
|라이브러리|역할|
|---|---|
|fastapi|웹 API 프레임워크|
|uvicorn|FastAPI 실행 서버|
|jinja2|HTML 템플릿 엔진|
|python-multipart|form 데이터 처리|
requirements.txt 생성
```bash
uv pip freeze > requirements.txt
```

