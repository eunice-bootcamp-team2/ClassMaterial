가상환경안에서 fast api 설치
```bash
mkdir ml_model_api
cd ml_model_api
python3 -m venv venv
source venv/bin/activate
```

디렉토리 구조:
```
~/레스토랑 폴더/
├── AIrestaurant/       ← Django 프로젝트
└── ml_model_api/       ← FastAPI 프로젝트
```

가상환경 안에서 fast api 설치:
```bash
pip install fastapi uvicorn numpy pandas scikit-learn joblib python-multipart
```

```bash
pip freeze > requirements.txt
```

| 명령어                                                             | 목적               |
| --------------------------------------------------------------- | ---------------- |
| `pip install fastapi`                                           | FastAPI 핵심만 설치   |
| `pip install fastapi uvicorn`                                   | FastAPI 실행       |
| `pip install numpy pandas scikit-learn joblib python-multipart` | ML 서빙, 파일 업로드 용도 |

fastAPI 첫 코드 작성: WSL (Ubuntu + VSCode) 기준
```bash
code main.py # VSCode에서 파일 열기
```

main.py
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI from WSL!"}
```

가끔 FastAPI 패키지를 인식 못하는 경우 발생:
	해결 방법: VSCode에 가상환경 인터프리터 연결
		- 단축키 `Ctrl + Shift + P` (또는 F1)
		- Python: Select Interpreter 입력 후 선택
		- 가상환경 경로와 파이썬 버전을 확인한후 선택해준다.

FastAPI 서버 실행
```bash
uvicorn main:app --reload
```

출력 예시
![[Pasted image 20250713094023.png]]