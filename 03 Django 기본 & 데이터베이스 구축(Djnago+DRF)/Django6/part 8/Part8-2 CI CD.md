`CI (Continuous Integration)` 지속적 통합
`CD(Continuous Delivery / Deployment)` 지속적 전달/배포
	코드 변경이 생기면, 자동으로 테스트하고, 자동으로 배포까지 진행되게 만드는 개발 파이프라인입니다.

`CI (지속적 통합)`: 
	개발자들이 자주 코드를 commit/push하면, 이를 자동으로 테스트 및 병합하는 과정
`CD (지속적 배포/전달)`: 
	테스트까지 통과한 코드를 자동으로 서버에 배포하거나, 배포 가능한 상태로 만드는 과정
```
1. 개발자가 코드를 수정함
2. GitHub에 push 함
3. GitHub Actions가 자동으로 실행됨
    - 1) 테스트 코드 실행
    - 2) 코드 오류 검증
    - 3) 성공 시 Docker 이미지 생성
    - 4) (선택) 서버에 자동 배포
4. 성공/실패 여부를 PR에서 확인 가능
```


🔹 Django 프로젝트에서 CI/CD 구축 순서:

`tests.py 작성`: 
	개발 중 기능별 자동 테스트 코드를 작성합니다.  
	예: `test_model`, `test_view`, `test_form` 등
	
`VSCode 터미널에서 tests.py가 잘 실행되는지 확인:`
```bash
python manage.py test
```

`파이썬 버전을 확인합니다.`
```bash
python --version
```

`깃허브에 push하기전에 requirements.txt를 최종 생성합니다.`
`requirements.txt 생성`:
```bash
uv pip freeze > requirements.txt
```  
	→ 가상환경에 설치된 패키지 목록을 기록합니다.  
	→ GitHub Actions에서 동일한 환경을 구성하기 위해 필요

---
### 🔹yml파일이란?

YAML은
> 컴퓨터에게 무엇을 어떻게 실행할지를 사람이 읽기 쉽게 적어주는 설정 파일 형식입니다.

즉,
> 📄 사람이 쓰는 설명서이지만  
> 🤖 컴퓨터가 그대로 따라 실행하는 명령서

YAML의 이름 뜻
- **YAML** = YAML Ain’t Markup Language
- YAML은 마크업 언어가 아니다라는 뜻
- HTML처럼 화면을 만드는 언어가 아니라 데이터와 실행 규칙을 표현하는 언어

---
### 🔹 YAML 파일은 왜 쓰나요?

> YAML은 복잡한 설정을 간단하고 읽기 쉽게 쓰기 위해 사용됩니다.

❓ 어디에 사용되나요?
`CI/CD 도구 (예: GitHub Actions)`	
	`.github/workflows/*.yml` 파일을 사용하여 자동 테스트, 빌드, 배포 등을 설정
`Docker Compose`	
	여러 컨테이너의 설정을 docker-compose.yml에 정의
`Kubernetes`	
	배포 설정, 서비스 정의 등 모든 리소스를 YAML로 설정
`Ansible`	
	서버 자동화 설정을 YAML 파일로 관리
`Python 라이브러리 설정`	
	일부 프레임워크에서 config 파일로 사용 (예: mkdocs.yml)
`API 문서 작성(OpenAPI/Swagger)`	
	API 스펙을 정의하는 데 사용


### 🔹 GitHub Actions에서 YAML의 역할

GitHub Actions에서 `.yml` 파일은
> GitHub 서버야,  
> 이 저장소에 이런 일이 생기면  
> 이런 환경에서  
> 이 순서대로  
> 이 명령을 실행해줘 라고 지시하는 파일입니다.

즉,  
사람이 매번 직접 테스트하지 않아도  
GitHub가 자동으로 대신 실행해 주게 만드는 파일입니다.

📖 공식 문서 링크:  
🔗 GitHub Actions 공식 문서 [https://docs.github.com/ko/actions/writing-workflows/quickstart](https://docs.github.com/ko/actions/writing-workflows/quickstart)

🔗 YAML 문법 가이드 [https://yaml.org/spec/1.2.2/](https://yaml.org/spec/1.2.2/)

🔗 YAML 튜토리얼 [https://learnxinyminutes.com/yaml/](https://learnxinyminutes.com/yaml/)


### 🔹 YAML 파일의 특징
|특징|설명|
|---|---|
|들여쓰기 사용|`{}` 대신 공백으로 구조를 표현|
|간결함|불필요한 기호가 거의 없음|
|사람이 읽기 쉬움|코드보다 문서에 가까움|
|순서 중요|위에서 아래로 실행됨|

### 🔹 YAML 문법을 아주 쉽게 보면
```yml
fruits:
  - apple
  - banana
  - orange
```

뜻:
- fruits라는 목록이 있고
- 그 안에 apple, banana, orange가 있다
- 파이썬 딕셔너리 + 리스트를 글처럼 적어놓은 형태와 같습니다.

### 🔹 GitHub Actions용 YAML을 한 줄로 설명하면

> 언제 실행할지(on),  
> 무엇을 실행할지(jobs),  
> 어떤 순서로 실행할지(steps)를 적어둔 자동 실행 설명서


### 🔹 `on`, `jobs`, `steps`는

> GitHub Actions 워크플로우에서만 사용하는  
> 예약어(약속된 키워드)입니다.

GitHub Actions 핵심 문법 구조 (필수 3요소)
```yaml
on:       # 언제 실행할지
jobs:     # 무엇을 실행할지
  job이름:
    steps:  # 어떤 순서로 실행할지
```

1️⃣ `on` — 언제 실행할지
```yaml
on:
  push:
  pull_request:
```

의미:
- **어떤 이벤트가 발생했을 때 실행할지** 정의

###### 자주 쓰는 이벤트
| 이벤트                 | 의미           |
| ------------------- | ------------ |
| `push`              | 코드가 푸시될 때    |
| `pull_request`      | PR 생성/업데이트 시 |
| `workflow_dispatch` | 버튼 눌러 수동 실행  |
`on`은 필수 키워드입니다.

---
2️⃣ `jobs` — 무엇을 실행할지
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
```

의미:
- 실행할 **작업(job)의 묶음**
- `test`는 우리가 붙인 이름 (자유)
- `jobs` 아래에는 하나 이상의 job이 올 수 있음

---
3️⃣ `steps` — 어떤 순서로 실행할지
```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
  - name: Run tests
    run: python manage.py test
```

의미:
- 실행 순서가 있는 명령 목록
- 위에서 아래로 차례대로 실행됨
- `steps`는 `jobs → job → steps` 구조 안에만 존재

---
### 🔹 전체 구조를 한눈에 보면
```yaml
name: Django CI

on:                  # 언제
  push:
    branches: ["main"]

jobs:                # 무엇을
  test:
    runs-on: ubuntu-latest

    steps:            # 어떤 순서로
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run tests
        run: python manage.py test
```

여기에서 name은 ✅ 내 마음대로 적는 이름입니다. 
그러나 uses: actions/checkout@v4 이건 내마음대로 못바꿈
- GitHub가 미리 만들어 둔 공식 액션(Action)을 사용하겠다는 뜻
역할: 
- GitHub Actions 화면에 표시되는 설명
- “아, 지금 코드 내려받는 단계구나” 하고 사람이 보기 위한 것
즉 그냥 적힌대로 놔두면 됩니다.

---
GitHub Actions용 YAML 기본 구조 해석
```yaml
name: 워크플로우이름

on: [push, pull_request]  # 언제 실행?

jobs:
  작업이름:
    runs-on: 실행환경
    steps:
      - name: 단계이름
        run: 실행할 명령어
```
---
`.github/workflows/django.yml 작성`:
	CI 자동화 설정 파일 작성  
	→ `push`, `PR` 때 테스트 자동 실행
![[Pasted image 20260124173617.png]]

![[Pasted image 20260124173659.png]]

깃허브에서 생성해주는 기본 코드:
```yaml
name: Django CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:

    runs-on: ubuntu-latest
    strategy:
      max-parallel: 4
      matrix:
        python-version: [3.7, 3.8, 3.9]

    steps:
    - uses: actions/checkout@v4
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
    - name: Install Dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run Tests
      run: |
        python manage.py test
```

수정된 코드:
```yaml
name: Django CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.12"]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install -r requirements.txt

      - name: Run tests
        run: |
          python manage.py test

```

위의 수정된 코드 해석:
```yaml
# GitHub Actions 워크플로우 이름
# 👉 [내 프로젝트용] 자유롭게 수정 가능 (CI 이름일 뿐)
name: Django CI

# CI가 실행되는 조건 설정
on:
  # main 브랜치에 push 될 때 실행
  # 👉 [내 프로젝트용] 브랜치 이름이 다르면 수정
  push:
    branches: ["main"]

  # main 브랜치로 Pull Request 생성/수정 시 실행
  # 👉 [내 프로젝트용] 브랜치 전략에 따라 수정 가능
  pull_request:
    branches: ["main"]

# 실행할 작업(job) 정의
jobs:
  # job 이름 (임의 이름)
  # 👉 [내 프로젝트용] 이름만 의미 있으므로 자유롭게 수정 가능
  test:
    # CI가 실행될 운영체제
    # 👉 [GitHub 제공] 보통 수정하지 않음
    runs-on: ubuntu-latest

    # 여러 환경 테스트를 위한 전략 설정
    strategy:
      # 하나의 환경에서 실패해도 나머지는 계속 실행
      # 👉 [GitHub 제공 기본 기능] 보통 그대로 둠
      fail-fast: false

      # 테스트 환경 목록 (matrix)
      matrix:
        # 테스트할 Python 버전
        # 👉 [내 프로젝트용] 사용하는 Python 버전에 맞게 수정
        python-version: ["3.12"]

    # 실제 실행 단계들
    steps:
      # 1. GitHub 저장소 코드 가져오기
      - name: Checkout
        # 👉 [GitHub 제공 공식 액션] 수정하지 않음
        uses: actions/checkout@v4

      # 2. Python 환경 설정
      - name: Set up Python ${{ matrix.python-version }}
        # 👉 [GitHub 제공 공식 액션] 보통 수정하지 않음
        uses: actions/setup-python@v5
        with:
          # matrix에서 지정한 Python 버전 사용
          # 👉 [내 프로젝트용] Python 버전만 신경 쓰면 됨
          python-version: ${{ matrix.python-version }}

          # pip 패키지 캐시 사용
          # 👉 [GitHub 제공 기능] 속도 개선용, 보통 그대로 둠
          cache: "pip"

      # 3. 프로젝트 의존성 설치
      - name: Install dependencies
        run: |
          # pip 최신 버전으로 업그레이드
          # 👉 [일반적인 관례] 보통 그대로 둠
          python -m pip install --upgrade pip

          # requirements.txt 기준으로 패키지 설치
          # 👉 [내 프로젝트용] requirements 파일 사용 시 필수
          python -m pip install -r requirements.txt

      # 4. Django 테스트 실행
      - name: Run tests
        run: |
          # Django 프로젝트의 모든 테스트 실행
          # 👉 [내 프로젝트용] 테스트 명령은 프로젝트에 따라 수정 가능
          python manage.py test
```


![[Pasted image 20260124174518.png]]
🔹 Commit message (필수, 한 줄 요약)
	이번 커밋에서 무엇을 했는지 한 문장 요약
작성된 예시: Django CI 워크플로우에서 파이썬 버전과 실행 단계를 수정했다

한글로 작성해도 됩니다.
그러나 대부분 현업에서는:**
- 🔹 영어 사용 비중이 높음
- 🔹 형식(규칙)을 통일
- 🔹 한 커밋 = 한 작업
###### 현업 예시:
| 타입       | 의미       |
| -------- | -------- |
| feat     | 새로운 기능   |
| fix      | 버그 수정    |
| chore    | 설정/환경/CI |
| refactor | 리팩토링     |
| docs     | 문서       |
| test     | 테스트      |
###### 이미지에 넣을 커밋 메시지 예시 (표 기준)
🔹 feat — 새로운 기능
```
feat: add user signup and login feature
```
	회원가입 / 로그인 기능 추가

(한글 버전)
```
feat: 회원가입 및 로그인 기능 추가
```

---
🔹 fix — 버그 수정
```
fix: resolve ModuleNotFoundError for accounts urls
```
	`accounts.urls` 오류 해결

(한글 버전)
```
fix: accounts URL 모듈 오류 수정
```

---
🔹 chore — 설정 / 환경 / CI
	지금 이미지 상황에 가장 잘 맞는 타입
```
chore: update Django CI workflow for Python versions
```

조금 더 간단히:
```
chore: update Django CI workflow
```

(한글 버전)
```
chore: Django CI 워크플로우 설정 수정
```

---
🔹 refactor — 리팩토링
```
refactor: simplify signup view logic
```
	기능 변화 없이 코드 구조만 개선

(한글 버전)
```
refactor: 회원가입 뷰 로직 정리
```

---
🔹 docs — 문서
```
docs: add authentication setup guide
```
	README, 튜토리얼 문서 추가

(한글 버전)
```
docs: 회원가입 및 로그인 설정 문서 추가
```

---
🔹 test — 테스트
```
test: add signup view test cases
```
	회원가입 테스트 코드 추가

(한글 버전)
```
test: 회원가입 뷰 테스트 코드 추가
```
---
지금 커밋은 CI 설정 등록 및 수정을 했습니다.

**Commit message**
```
chore: update Django CI workflow
```

**Extended description**
```
- Adjust Python versions matrix - Update CI steps for Django project
```
✔ 가장 깔끔  
✔ 현업에서 가장 많이 보는 형태

---
지금 커밋이 “테스트 코드 추가”가 핵심

**Commit message**
```
test: add signup view test cases
```

**Extended description**
```
- Add test cases for user signup view - Verify form validation and redirect behavior
```
✔ Conventional Commits에 정확히 부합

---
`git add .` / `git commit` / `git push`:
	작성한 코드, 테스트, 설정파일을 깃허브에 올립니다
	
`GitHub Actions에서 테스트 실행 확인`:
	`[Actions]` 탭에서 초록색 체크가 뜨면 성공입니다.  
	→ 실패하면 로그 보고 `tests.py`, 마이그레이션, 경로 등을 수정합니다

![[Pasted image 20260124181407.png]]

---
jobs아래 test에 대한 설명
	기술적으로는 아무거나 써도 되지만 용도에 맞게 정해진 타입을 써야 합니다.
![[Pasted image 20260124184813.png]]

###### 타입별 “정확한 사용 기준
| 타입             | 언제 쓰는지 (현업 기준)            |
| -------------- | ------------------------- |
| **feat**       | 사용자에게 보이는 기능 추가           |
| **fix**        | 버그 수정                     |
| **test**       | 테스트 코드 추가/수정만 있을 때        |
| **docs**       | 문서만 변경                    |
| **refactor**   | 기능 변화 없는 코드 구조 개선         |
| **chore**      | 설정, 환경, CI, 잡다한 작업        |
| **build**      | 빌드 도구/빌드 시스템 변경           |
| **ci** (팀에 따라) | GitHub Actions 등 CI 설정 변경 |
팀에 따라 `ci:`를 따로 쓰기도 함 (없으면 보통 `chore`)

---
전체 흐름
```
[push or PR 발생]
      ↓
[코드 체크아웃]
      ↓
[Python 3.12 환경 세팅]
      ↓
[필요한 패키지 설치]
      ↓
[DB 마이그레이션 파일 생성]
      ↓
[DB 테이블 생성]
      ↓
[테스트 실행]
```
