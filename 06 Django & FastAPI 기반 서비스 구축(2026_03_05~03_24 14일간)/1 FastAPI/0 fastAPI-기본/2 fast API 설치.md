가상환경안에서 fast api 설치
```bash
cd ~
mkdir fastapi_basic
cd fastapi_basic

code -r .

uv venv
source .venv/bin/activate
```

디렉토리 구조:
```
~/레스토랑 폴더/
├── AIrestaurant/       ← Django 프로젝트
└── ml_model_api/       ← FastAPI 프로젝트
```

가상환경 안에서 fast api 설치:
```bash
uv pip install fastapi uvicorn
```

```bash
uv pip freeze > requirements.txt
```

| 명령어                                                                | 목적               |
| ------------------------------------------------------------------ | ---------------- |
| `uv pip install fastapi`                                           | FastAPI 핵심만 설치   |
| `uv pip install fastapi uvicorn`                                   | FastAPI 실행       |

fastAPI 첫 코드 작성: WSL (Ubuntu + VSCode) 기준
```bash
code main.py # VSCode에서 파일 열기
```

main.py
```python
from fastapi import FastAPI

# FastAPI 애플리케이션 객체 생성
app = FastAPI()

# "/" 주소로 GET 요청이 오면 실행
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI from WSL!"}
```

FastAPI 서버 실행
```bash
uvicorn main:app --reload
```

출력 예시
![[Pasted image 20250713094023.png]]


