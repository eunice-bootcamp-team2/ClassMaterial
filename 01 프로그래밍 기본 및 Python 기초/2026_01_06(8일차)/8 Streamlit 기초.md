### Streamlit이란 무엇인가?
Streamlit은 파이썬 코드만으로 간단하게 웹 화면(UI)을 만들 수 있는 오픈 소스 웹 프레임워크입니다. 즉, Streamlit은 파이썬 파일(.py)을 실행하면 웹 화면으로 보여주는 도구입니다.

> 복잡한 HTML/CSS/JavaScript 없이도  
> **데이터 입력 → 처리 → 시각화** 과정을  
> 바로 웹 서비스 형태로 보여줄 수 있는 도구

간단한 예시:
```python
print("Hello")   # 콘솔 출력
st.write("Hello")  # 웹 화면 출력
```
차이점은 출력 위치뿐입니다.

---
### Streamlit 앱의 가장 중요한 특징 3가지

✅ 특징 1. 위에서 아래로 순서대로 실행된다
Streamlit 코드는 일반 파이썬 스크립트처럼 위 → 아래로 실행됩니다.
```python
st.title("A")
st.write("B")
st.write("C")
```

➡ 화면에도 A → B → C 순서로 나타납니다.


✅ 특징 2. 화면을 그리는 함수는 모두 `st.`로 시작한다

|역할|예시|
|---|---|
|글자 출력|`st.write()`, `st.text()`|
|제목|`st.title()`, `st.header()`|
|입력|`st.text_input()`, `st.number_input()`|
|버튼|`st.button()`|
|표/그래프|`st.table()`, `st.bar_chart()`|

👉 Streamlit = `st.`로 시작하는 화면용 함수들의 모음


✅ 특징 3. 새로고침 = 코드 재실행

- 버튼 클릭
- 입력값 변경
    ➡ 파이썬 파일 전체가 다시 실행
    
그래서 상태를 기억하려면 `st.session_state`가 필요합니다 (뒤에서 설명)

---
### Streamlit을 왜 사용할까?
| 이유            | 설명                        |
| ------------- | ------------------------- |
| 빠른 개발         | 코드 몇 줄만으로 Web UI 완성       |
| 분석 결과 공유      | 데이터 테이블, 차트 자동 렌더링        |
| AI·모델 데모 만들기  | ML/AI 예측 결과를 Web으로 쉽게 보여줌 |
| 백엔드·데이터 흐름 경험 | 폼 입력 → 저장 → 시각화 가능        |
###### Streamlit을 어디에 사용하나?
| 분야          | 활용 예시                 |
| ----------- | --------------------- |
| 데이터 분석 / ML | 시각화 대시보드, 모델 예측 결과 화면 |
| 관리도구 / 내부 툴 | 직원용 모니터링 페이지          |
| PoC/MVP 시연  | 초기 프로토타입 검증           |
Streamlit은:  
	파이썬으로 빠르게 만들어보는 웹 대시보드 & 실험용 UI 도구 라고 생각하면 됩니다.

---

실습을 위한 준비:
```bash
# 홈 디렉토리로 이동
cd ~

# 실습용 폴더 생성
mkdir streamlit_day8
cd streamlit_day8
code -r . # 새로 만든 폴더로 이동
```

가상환경 만들기

> ❓ 왜 가상환경을 쓰는가?
- 라이브러리 충돌 방지
- 실습 환경과 개인 PC 환경 분리
- 나중에 삭제/재현 쉬움
    
가상환경 생성
```bash
sudo snap install astral-uv --classic
brew install uv
uv venv
```

```bash
python3 -m venv .venv
source .venv/bin/activate
```

가상환경 활성화
```bash
source .venv/bin/activate
```

Streamlit 설치 (실습 필수 라이브러리)
```bash
uv pip install streamlit pandas

pip install streamlit pandas
```
	가상환경을 쓴다면 → 프로젝트마다 설치해야 합니다.


설치 확인
```bash
uv pip show streamlit
```

정상 출력 예시:
```
Name: streamlit
Version: 1.xx.x
```

공식 데모 실행
```bash
streamlit hello
```
브라우저에서 Streamlit 소개 페이지가 보이면 설치 성공
![[Pasted image 20251221132551.png]]

---
## Streamlit 기본 문법부터 이해하기

🧩 화면에 글자 출력하기

🔹 반드시 있어야 하는 1줄
```python
import streamlit as st
```
	streamlit이라는 라이브러리를 st라는 이름으로 쓰겠다는 뜻으로 이줄이 없으면 st.write()
	에서 st가 뭔지 몰라서 NameError가 발생합니다.

🔹 가장 기본적인 출력 함수
```python
st.write("안녕하세요")
```

- 문자열 → 글자로 출력
- 숫자, 리스트, 딕셔너리도 출력 가능

```python
st.write(10)
st.write([1,2,3])
```

👉 print( )의 웹 버전

🔹 제목 계열 함수
```python
st.title("큰 제목")# 페이지 제목 (1번만)
st.header("중간 제목")# 섹션 제목
st.subheader("작은 제목")
```

실행하기 명령어
```bash
streamlit run app.py
```

---

## 🧩 사용자 입력 받기 (핵심)

🔹 입력 함수의 공통 원리
```python
변수 = st.xxx_input("설명")
```
➡ 입력값이 변수에 저장됨

텍스트 입력
```python
name = st.text_input("이름을 입력하세요")
```

- 사용자가 입력하면
- `name` 변수에 문자열 저장

```python
st.write("입력된 이름:", name)
```

브라우저를 새로고침 눌러서 변수에 저장된것을 확인합니다.

---

🔢 숫자 입력
```python
age = st.number_input("나이", min_value=0, max_value=120)
```

- 숫자만 입력 가능
- 결과는 **int 또는 float**

---

### 🧩 버튼 이해하기

❌ 잘못 이해하기 쉬운 생각
> 버튼을 누르면 그 줄만 실행된다 ❌

✅ 실제 동작 방식
> 버튼을 누르면 전체 코드가 다시 실행되고,
> 버튼이 눌렸는지 여부만 `True / False`로 알려준다 ⭕

```python
clicked = st.button("확인") # True
if clicked:
    st.success("버튼이 눌렸어요!")
else:
    st.info("아직 버튼을 누르지 않았어요.")
```

|상황|clicked 값|
|---|---|
|버튼 안 눌림|False|
|버튼 눌림|True|
👉 웹 이벤트처럼 보이지만, 사실은 조건문

브라우저를 새로고침 눌러서 변수에 저장된것을 확인합니다.

---
### Streamlit 전체 코드 구조 (공식 틀)

```python
import streamlit as st# 1️⃣ 라이브러리

# 2️⃣ 화면 구성
st.title("제목")

# 3️⃣ 사용자 입력
value = st.text_input("입력")

# 4️⃣ 로직 처리
if st.button("실행"):
    result = value.upper()

# 5️⃣ 결과 출력
    st.write(result)
```

---
## 예시 코드: “간단 BMI 계산 앱”

📌 파일명: `bmi_app.py`
```python
import streamlit as st

# ① UI 구성: 제목과 입력필드
st.title("💪 BMI 계산기")

height = st.number_input("키(cm)를 입력하세요", min_value=100, max_value=250)
weight = st.number_input("몸무게(kg)를 입력하세요", min_value=30, max_value=200)

# ② 버튼 누를 때 로직 수행(계산)
if st.button("BMI 계산하기"):
    bmi = weight / ((height / 100) ** 2)

    # ③ 결과 출력
    st.subheader(f"당신의 BMI는 {bmi:.2f} 입니다!")

    # BMI에 따른 결과 해석
    if bmi < 18.5:
        st.info("저체중입니다. 식사 조절이 필요해요!")
    elif bmi < 25:
        st.success("정상 체중입니다. 아주 좋아요! 😄")
    elif bmi < 30:
        st.warning("과체중이네요. 운동이 필요합니다.")
    else:
        st.error("비만입니다. 관리가 시급합니다!")
```

실행 방법
```bash
streamlit run bmi_app.py
```

이 코드로 보는 Streamlit 구조 요약
```
Streamlit 앱 코드 구조

1️⃣ 라이브러리 import
2️⃣ UI 구성 요소 작성
3️⃣ 사용자 입력 받아 처리
4️⃣ 결과를 웹에 
```

흐름을 다시 시각화하면:

> 입력 UI ➜ 버튼 클릭 ➜ 계산 로직 ➜ 화면에 출력

---
실습:

>간단한 웹 프로토타입 도구(streamlit) 소개, 기본 화면 구성과 입력·출력 위젯을 활용한 미니 대시보드 만들기

| 단계  | 실습 내용                       | 핵심 개념                       |
| --- | --------------------------- | --------------------------- |
| 1   | Streamlit 설치 & 첫 실행         | “파이썬 코드 → 웹 화면” 흐름 경험       |
| 2   | 입력 위젯(text, number, button) | 사용자의 입력을 받아서 처리하는 방법        |
| 3   | 간단한 데이터표 + 막대 그래프           | `pandas` 데이터 → 테이블/차트로 출력   |
| 4   | CSV 파일 업로드해서 그래프 그리기        | 파일 업로드 → 데이터 읽기 → 시각화 전체 흐름 |

## 0️⃣ 프로젝트 폴더 만들기 (공통 준비)

**실습용 폴더생성:**
```bash
cd ~              # 홈 디렉토리로 이동 (선택)
mkdir streamlit_day8
cd streamlit_day8
python -m venv venv
source venv/bin/activate   # Windows WSL 기준
```

가상환경 안에서 진행하는 걸 추천

---

### 1️⃣ Streamlit 설치 & 실행 – “파이썬 코드가 웹이 된다” 경험

### 1-1. (필수) 실습 폴더 준비 + 가상환경 만들기

실습 폴더로 이동/생성
```bash
cd ~
mkdir -p streamlit_day8
cd streamlit_day8
```

uv로 가상환경 생성 (현재 폴더에 `.venv` 생성)
```bash
uv venv
```

가상환경 활성화 (WSL/macOS)
```bash
source .venv/bin/activate
```

가상환경이 켜져 있는 상태에서:
```bash
uv pip install streamlit pandas
```

설치 확인:
```bash
uv pip show streamlit
```

데모 실행해 보기
```bash
streamlit hello
```

- 브라우저가 자동으로 열리거나
- 터미널에 `Local URL: http://localhost:8501` 같은 주소가 나옵니다.

➡ **역할**

> “Streamlit이라는 도구가 잘 설치되었고,
> 파이썬이 웹페이지를 띄울 수 있다” 를 경험하는 단계.

---

📌 app.py내용
```python
import streamlit as st
import pandas as pd

# ============================================================
# 0) 페이지 기본 설정 (선택이지만 추천)
# - 브라우저 탭 제목, 아이콘, 화면 폭을 정합니다.
# ============================================================
st.set_page_config(page_title="Streamlit 기초 앱", page_icon="🌱", layout="wide")

# ============================================================
# 1) 화면에 출력하기 (가장 기초)
# - print()는 터미널 출력
# - st.write()는 웹 화면 출력
# ============================================================
st.title("🌱 Streamlit 기초 앱")
st.write("파이썬 코드가 웹 화면으로 출력됩니다.")
st.caption("이 파일 하나(app.py)로 Streamlit 기본 문법을 실습합니다.")

st.divider()  # 화면 구분선

# ============================================================
# 2) 레이아웃: sidebar / columns
# - sidebar: 좌측 메뉴 영역
# - columns: 화면을 가로로 나눔
# ============================================================
st.sidebar.header("⚙️ 설정(사이드바)")
theme = st.sidebar.selectbox("테마 느낌(출력 예시용)", ["기본", "강조", "경고"])

col1, col2 = st.columns(2)  # 화면을 2칸으로 나눔

with col1:
    st.subheader("🧩 기본 출력")
    st.write("문자열:", "안녕하세요")
    st.write("숫자:", 10)
    st.write("리스트:", [1, 2, 3])

with col2:
    st.subheader("✅ 메시지 박스")
    st.info("info: 안내")
    st.success("success: 성공")
    st.warning("warning: 주의")
    st.error("error: 오류")

st.divider()

# ============================================================
# 3) 입력 위젯 (웹 앱의 핵심)
# - 입력 위젯은 '사용자 입력값을 변수로 받는 것'이 핵심입니다.
# ============================================================
st.header("📝 입력 위젯 연습")

name = st.text_input("이름", placeholder="예: 이유정")   # 문자열 입력
age = st.number_input("나이", min_value=0, max_value=120, step=1)  # 숫자 입력
agree = st.checkbox("동의합니다")  # 체크 여부(True/False)
level = st.slider("자신감(0~10)", 0, 10, 3)  # 슬라이더(기본값 3)

# 선택 위젯
job = st.radio("직업", ["학생", "개발자", "강사", "기타"], horizontal=True)

# ============================================================
# 4) 버튼 문법(중요!)
# - 버튼은 '한 번만' 만들고,
# - 결과(True/False)를 변수로 받아 if로 처리합니다.
# ============================================================
clicked = st.button("확인")

if clicked:
    # 입력값 검증(초보자용)
    if not name:
        st.warning("이름을 입력해주세요!")
    elif not agree:
        st.warning("동의 체크를 해주세요!")
    else:
        st.success(f"{name}님 반가워요! 나이:{age}, 직업:{job}, 자신감:{level}/10")

st.divider()

# ============================================================
# 5) 세션 상태(Session State) 맛보기
# - Streamlit은 입력/클릭 때마다 '코드 전체가 다시 실행'됩니다.
# - 그래서 값이 유지되게 하려면 st.session_state를 씁니다.
# ============================================================

st.header("📌 세션 상태로 '기록' 남기기 (기초)")

# session_state에 memo_list가 없으면 처음 한 번만 만들어 둡니다.
if "memo_list" not in st.session_state:
    st.session_state["memo_list"] = []

memo = st.text_input("메모 한 줄", placeholder="예: 오늘 Streamlit 버튼을 이해했다")

add = st.button("메모 추가")

if add:
    if memo.strip():
        st.session_state["memo_list"].append(memo.strip())
        st.info("메모를 저장했습니다! (새로고침해도 유지됩니다)")
    else:
        st.warning("메모 내용을 입력해주세요.")

# 저장된 메모 출력
st.write("📋 저장된 메모 목록")
if len(st.session_state["memo_list"]) == 0:
    st.caption("아직 메모가 없습니다. 위에서 추가해보세요.")
else:
    for i, m in enumerate(st.session_state["memo_list"], start=1):
        st.write(f"{i}. {m}")

# 전체 삭제 버튼
if st.button("⚠️ 메모 전체 삭제"):
    st.session_state["memo_list"] = []
    st.warning("메모를 모두 삭제했습니다.")

st.divider()

# ============================================================
# 6) 표(DataFrame) + 간단 차트
# 내부 샘플 데이터로 시각화합니다.
# ============================================================
st.header("📊 표 + 차트 (샘플 데이터)")

data = {"월": ["1월", "2월", "3월"], "매출": [200, 300, 250]}
df = pd.DataFrame(data)

st.write("✅ 표로 보기")
st.dataframe(df, use_container_width=True)  # 스크롤 가능한 표

st.write("✅ 차트로 보기")
# chart 함수들은 보통 "인덱스=라벨" 형태가 보기 좋아서 set_index를 자주 씁니다.
st.bar_chart(df.set_index("월"))

# ============================================================
# 7) (선택) 디버그: 지금 변수들이 어떤 값을 가지는지 확인
# ============================================================
if st.sidebar.checkbox("🔎 디버그 보기"):
    st.subheader("🔎 디버그(현재 변수 값)")
    st.write({
        "name": name,
        "age": age,
        "agree": agree,
        "level": level,
        "job": job,
        "memo_list": st.session_state["memo_list"]
    })
```

📌 **실행**
```bash
streamlit run app.py
```

---

### 2️⃣ 입력 위젯 실습 – “사용자 입력 → 파이썬 변수 → 화면 출력”
	이제 Streamlit 기초에서 가장 중요한 부분인 입력(Input)을 정확히 이해합니다.

✅ 핵심 개념 1) 입력 위젯은 ‘값을 반환(return)’한다

Streamlit 입력 위젯의 공통 형태는 아래 한 줄로 끝납니다.
```python
변수 = st.xxx_input("설명")
```

- 사용자가 입력/선택한 값이 변수에 저장됩니다.
- 그리고 `st.write()`로 바로 확인할 수 있습니다.

---

✅ 핵심 개념 2) Streamlit은 “입력값이 바뀌면 전체 코드가 다시 실행된다”

가장 헷갈리는 포인트입니다.
- `name`에 글자를 입력한다
- `age` 숫자를 바꾼다
- 버튼을 누른다

➡ 그 순간 전체 파이썬 파일이 위에서 아래로 다시 실행됩니다.
그래서 Streamlit을 이해하려면 이렇게 생각하면 좋습니다:

> “화면은 매 순간 다시 그려진다.
> 단지 입력값만 계속 유지된 채로 다시 실행될 뿐이다.”

### 2-1. 입력 위젯 앱 만들기

📌 **파일명**: `widgets_basic.py`
```bash
cd ~/streamlit_day8
code widgets_basic.py
```

📌 **코드 작성**
```python
import streamlit as st

st.title("🧩 텍스트 입력(text_input)")

# 사용자가 입력한 문자열이 name 변수에 저장됩니다.
name = st.text_input("이름을 입력하세요", placeholder="예: 이유정")

# 입력값은 바로 출력해보면 확인이 됩니다.
st.write("지금 입력된 값:", name)

# 초보자 체크: 빈 문자열인지 확인(웹 폼 검증의 시작)
if name == "":
    st.info("아직 입력되지 않았습니다.")
else:
    st.success(f"{name}님 반갑습니다!")
```

📌 **실행**
```bash
streamlit run widgets_basic.py
```

👉 여기서 배우는 것
- 입력값이 변수에 저장된다
- 입력 즉시 화면이 다시 실행되며 출력이 갱신된다

---
### 2-2. 숫자 입력 (number_input)

**파일명**: `widgets_number.py`
```python
import streamlit as st

st.title("🔢 숫자 입력(number_input)")

# 숫자만 입력 가능
age = st.number_input("나이를 입력하세요", min_value=0, max_value=120, step=1)

st.write("입력된 나이:", age)

# 조건문으로 간단한 로직 처리
if age < 20:
    st.info("청소년/학생 가능성!")
elif age < 40:
    st.success("사회 초년생/직장인 가능성!")
else:
    st.warning("경험이 많을 가능성!")
```

실행:
```bash
streamlit run widgets_number.py
```

👉 여기서 배우는 것
- 숫자 입력은 int 또는 float로 들어온다
- 입력값에 따라 조건문 분기를 할 수 있다

----

### 2-3. 선택 입력 (selectbox / radio / checkbox)
	사용자가 고르는 UI도 결국 변수로 받는다

`widgets_select.py`
```python
import streamlit as st

st.title("✅ 선택 위젯(selectbox / radio / checkbox)")

job = st.selectbox("직업을 선택하세요", ["학생", "개발자", "강사", "기타"])
mood = st.radio("오늘 기분은?", ["😀", "😐", "😞"], horizontal=True)
agree = st.checkbox("약관에 동의합니다")

st.write("선택한 직업:", job)
st.write("선택한 기분:", mood)
st.write("동의 여부:", agree)

# 체크박스는 True/False라서 if문에 바로 사용 가능
if agree:
    st.success("동의 완료 ✅")
else:
    st.warning("동의를 체크해야 다음 단계로 갈 수 있어요.")
```

실행:
```bash
streamlit run widgets_select.py
```

👉 여기서 배우는 것
- checkbox는 **True/False**라서 가장 쉬운 조건문 실습 재료
- selectbox/radio도 결국 “값을 변수로 받는다”

---
### 3️⃣ 버튼(button) 제대로 이해하기 – 가장 많이 헷갈리는 부분
	핵심: 버튼은 그 줄만 실행이 아니라 전체가 다시 실행

❌ 오해
> 버튼 누르면 if 아래만 실행된다

✅ 실제
> 버튼을 누르면 전체 코드가 다시 실행되고  
> 그 순간에만 `st.button()`이 True가 된다

### 3-1. 버튼의 정석 패턴
`button_basic.py`
```python
import streamlit as st

st.title("🖱️ 버튼 기초")

# 버튼은 한 번만 만들고, 결과(True/False)를 변수로 받습니다.
clicked = st.button("확인")

if clicked:
    st.success("버튼이 눌렸어요!")
else:
    st.info("아직 버튼을 누르지 않았어요.")
```

👉 여기서 배우는 것
- 버튼은 한 번만 선언한다
- `clicked` 변수로 True/False를 받아 if 처리한다

## 3-2. 초보자 실수(중요): 버튼을 두 번 만들면 에러

❌ 이런 코드(하지 말 것)
```python
clicked = st.button("확인")
if st.button("확인"):
    st.write("눌림")
```

왜 문제냐?
- `"확인"` 버튼이 2개 생성되면서 Streamlit 내부 ID가 충돌
- 그래서 DuplicateElementId 오류가 발생
    
✅ 해결은 단 하나: 버튼은 한 번만 만들기

### 4️⃣ (기초의 마지막) “상태”를 저장하려면 session_state가 필요

Streamlit은 계속 새로 실행되기 때문에 “기록/목록/카운트” 같은 상태 유지가 필요하면 `st.session_state`를 사용합니다.

`state_basic.py`
```python
import streamlit as st

st.title("📌 session_state 기초")

# 처음 한 번만 count를 만들기
if "count" not in st.session_state:
    st.session_state["count"] = 0

# 버튼을 누를 때마다 count 증가
if st.button("1 증가"):
    st.session_state["count"] += 1

st.write("현재 count:", st.session_state["count"])

# 초기화
if st.button("초기화"):
    st.session_state["count"] = 0
    st.warning("0으로 초기화했습니다.")
```

👉 여기서 배우는 것
- “변수”는 재실행 때 초기화될 수 있음
- “session_state”는 브라우저 세션 동안 유지됨

---

### 5️⃣ 데이터 시각화 기초

딕셔너리 → DataFrame → 테이블 & 차트
Streamlit에서 대시보드처럼 보이게 만드는 핵심은 두 가지입니다.

1. 데이터를 표(Table)로 보여주기
2. 데이터를 그래프(Chart)로 보여주기
    
그리고 이때 거의 항상 쓰는 형태가 바로 **pandas DataFrame**입니다.

✅ 왜 DataFrame으로 바꾸는가?
	파이썬에서 데이터를 만들면 보통 이런 형태입니다.
- 리스트, 딕셔너리, 튜플…
    
그런데 “표”로 보여주려면 행/열 구조(엑셀처럼) 가 필요합니다.  
그 역할을 해주는 게 `pandas.DataFrame` 입니다.
> DataFrame = 엑셀 표 같은 데이터 구조


### 간단 매출 데이터 시각화

`simple_chart.py`
```bash
cd ~/streamlit_day8
code simple_chart.py
```

📌 **코드 작성**
```python
import streamlit as st
import pandas as pd

st.title("📊 간단 매출 대시보드")

# 1) 파이썬 딕셔너리로 데이터 만들기
# - Key(열 이름), Value(열 데이터 리스트)
data = {
    "월": ["1월", "2월", "3월"],
    "매출": [200, 300, 250],
}

# 2) DataFrame으로 변환
# - 이제 엑셀처럼 "행/열" 구조가 됩니다.
df = pd.DataFrame(data)

st.subheader("✅ 원본 데이터(표)")

# st.table: 정적(고정) 테이블 - 간단히 보여줄 때 좋음
st.table(df)

st.subheader("✅ 월별 매출(막대 그래프)")

# 3) 차트를 보기 좋게 만들기 위해 "월"을 인덱스로 설정
# - 차트는 보통 왼쪽 라벨(인덱스)이 있으면 보기 좋습니다.
chart_df = df.set_index("월")

# st.bar_chart: 막대그래프를 자동으로 그려줍니다.
st.bar_chart(chart_df)
```

📌 **실행**
```bash
streamlit run simple_chart.py
```

✅ 화면에서 확인할 것
- 위쪽에 표가 보인다(월/매출)
- 아래쪽에 막대 그래프가 보인다(월별 매출)

👉 여기서 배우는 것
1) dict → DataFrame 변환
- “표 형태”로 보여주려면 DataFrame이 편하다.
    
2) `st.table()` vs `st.dataframe()`
- `st.table(df)` : **정적 테이블**(크기 고정, 간단히 보여줄 때)
- `st.dataframe(df)` : **스크롤/정렬 가능한 테이블**(실무 대시보드 느낌)
    
> 기초에서는 `st.table()`로 충분하지만, 실제 대시보드는 `st.dataframe()`을 많이 씁니다.
	
3) `set_index("월")` 하는 이유
- x축 라벨(월)이 깔끔하게 보이도록 하기 위해서
- 차트에서 “월”이 왼쪽 라벨 역할을 하게 된다

---

### 6️⃣ CSV 파일 업로드 기초

CSV → DataFrame → 테이블 & 차트
이번 단계는 “외부 데이터”이긴 하지만,  
Streamlit에서 외부 데이터를 다루는 가장 쉬운 시작입니다.

- 사용자가 CSV 파일을 올린다
- 우리는 그 CSV를 DataFrame으로 읽는다
- 표/차트로 보여준다
    
> **외부 데이터 처리의 1단계** = 파일 업로드

### CSV 업로드 앱 만들기

먼저 테스트용 CSV 하나 만들어도 좋습니다.
```bash
cd ~/streamlit_day8
echo "month,sales
1월,200
2월,300
3월,250" > sales.csv
```

`upload_chart.py`
```bash
code upload_chart.py
```

코드 작성 ---
```python
import streamlit as st
import pandas as pd

st.title("📁 CSV 업로드 & 시각화(기초)")

st.write("CSV 파일을 업로드하면 표와 그래프로 보여줍니다.")

# 1) 파일 업로드 위젯
# - type=["csv"] : csv 파일만 선택 가능
uploaded = st.file_uploader("CSV 파일을 업로드하세요", type=["csv"])

# 2) 업로드된 파일이 있을 때만 아래 로직 실행
if uploaded is not None:
    # 3) pandas로 CSV 읽기
    # - uploaded는 파일 객체처럼 동작합니다.
    df = pd.read_csv(uploaded)

    st.subheader("✅ 업로드한 데이터(표)")
    # st.dataframe: 스크롤 가능한 표(대시보드 느낌)
    st.dataframe(df, use_container_width=True)

    st.subheader("✅ 숫자 컬럼 차트")

    # 4) 숫자 컬럼만 골라서 차트로 그리기
    numeric_df = df.select_dtypes(include=["number"])

    # 숫자 컬럼이 없으면 차트를 못 그리므로 안내
    if numeric_df.shape[1] == 0: # df.shape -> (행 개수, 열 개수) (2,0)
        st.warning("숫자 컬럼이 없어서 차트를 그릴 수 없습니다.")
        st.write("예: sales 같은 컬럼이 숫자여야 합니다.")
    else:
        # 간단한 차트(라인)
        st.line_chart(numeric_df)

else:
    st.info("먼저 CSV 파일을 업로드해보세요. (예: sales.csv)")
```

실행
```bash
streamlit run upload_chart.py
```

✅ 화면에서 확인할 것
1. `sales.csv` 업로드
2. 표가 출력된다
3. 숫자 컬럼(sales)이 있으면 라인차트가 나온다

---
### ✅ 기초에서 꼭 알아야 하는 포인트(정리)

`1)` `st.file_uploader()`는 업로드된 파일을 “변수로 받는다”
- 업로드 전: `None`
- 업로드 후: 파일 객체
    
그래서 `if uploaded is not None:` 조건이 필요합니다.

`2)` CSV는 결국 DataFrame으로 읽는다
- `pd.read_csv(uploaded)`
- 이후엔 DataFrame 다루는 방식과 동일
    
`3)` 차트는 “숫자 데이터”가 있어야 그려진다
- 문자열만 있으면 차트 불가
- 그래서 `select_dtypes(include=["number"])`로 숫자만 골라 그림

---
### 실습하기

### **“나의 감정 기록 대시보드”** (Mood Tracker Dashboard)

📌 목표
하루의 감정을 선택해서 기록하고,
기간별 감정 통계를 차트로 시각화하는 간단한 웹 서비스 제작

###### 📌 핵심 학습 포인트
| 기능       | 학습 요소                  |
| -------- | ---------------------- |
| 감정 입력    | selectbox / date_input |
| 데이터 저장   | st.session_state       |
| 테이블 조회   | pandas 활용              |
| 감정 통계 표시 | groupby + bar_chart    |
| UI 구성    | title, header, column  |

---

## 🧱 0. 준비하기 (폴더 & 실행)

```bash
mkdir mood_app
cd mood_app

pip install streamlit pandas
```

파일 생성
```bash
code mood_tracker.py
```

실행
```bash
streamlit run mood_tracker.py
```

---
# 🧪 실습 문제

## “나의 감정 기록 대시보드 – 스스로 풀어보기”

> 목표:
> 
> Streamlit 기초 문법(`입력 → 처리 → 출력`, `session_state`, `DataFrame`, `차트`)을
> 
> **직접 조합해서 하나의 작은 기능을 완성**해본다.

---

## 🟢 문제 1 (난이도: 하 / 15분)

오늘의 감정 한 줄 출력하기

📘 문제 설명

사용자가 **오늘의 감정**을 선택하면 아래에 **선택한 감정을 문장으로 출력**하는 간단한 앱을 만들어보세요.

---

✅ 요구사항
1. `st.selectbox()`로 감정 선택
2. 선택한 감정을 `st.write()`로 출력
3. 아직 선택하지 않았을 경우 안내 문구 출력

---

💡 힌트
- `selectbox`의 결과는 **문자열 변수**
- 빈 값(`""`)인지 확인하면 조건문 처리 가능
- 
---

🧩 문제 코드 틀
```python
import streamlitas st

st.title("🧠 오늘의 감정")

# TODO 1: 감정 선택 selectbox 만들기
mood =

# TODO 2: 조건문으로 출력 처리
```

출력화면 미리보기
![[Pasted image 20251221144718.png]]

---

✅ 정답 코드
```python
import streamlit as st

st.title("🧠 오늘의 감정")

mood = st.selectbox(
"오늘 기분은 어떤가요?",
    ["","😀 행복","😊 좋음","😐 보통","😞 슬픔","😡 화남"]
)

if mood =="":
    st.info("감정을 하나 선택해주세요.")
else:
    st.success(f"오늘의 감정은 '{mood}' 입니다.")
```

---

📝 해설
- `selectbox` 결과는 **항상 변수에 저장**
- `""`를 첫 항목으로 두면 “선택 전 상태”를 만들 수 있음
- Streamlit의 기본 패턴:
    **입력 → 조건문 → 출력**
    

---

## 🟡 문제 2 (난이도: 중 / 20분)

감정 기록을 여러 개 저장하기 (session_state)

📘 문제 설명
버튼을 누를 때마다 감정을 리스트에 저장하고 지금까지 저장된 감정 목록을 화면에 출력하세요.

---

✅ 요구사항

1. `st.session_state` 사용
2. 버튼 클릭 시 감정 저장
3. 저장된 감정을 **번호와 함께 출력**

---

💡 힌트
- `if "key" not in st.session_state:` 패턴
- 리스트에 값 추가: `.append()`

출력화면 미리보기
![[Pasted image 20251221144949.png]]

---

🧩 문제 코드 틀
```python
import streamlitas st

st.title("📒 감정 기록")

# TODO 1: session_state 초기화

mood = st.selectbox(
"오늘의 감정",
    ["😀 행복","😊 좋음","😐 보통","😞 슬픔","😡 화남"]
)

# TODO 2: 버튼 클릭 시 감정 저장

# TODO 3: 저장된 감정 목록 출력
```

---

✅ 정답 코드
```python
import streamlit as st

st.title("📒 감정 기록")

# 1) 세션 상태 초기화: moods라는 리스트가 없으면 만들어둔다
if "moods" not in st.session_state:
    st.session_state["moods"] = []

# 2) 감정 선택 (입력 위젯)
mood = st.selectbox(
    "오늘의 감정",
    ["😀 행복", "😊 좋음", "😐 보통", "😞 슬픔", "😡 화남"]
)

# 3) 버튼 클릭 시 저장
if st.button("감정 추가"):
    st.session_state["moods"].append(mood)
    st.success("✅ 감정이 저장되었습니다!")

st.subheader("📋 저장된 감정")

# 4) 저장된 데이터 출력
if len(st.session_state["moods"]) == 0:
    st.info("아직 저장된 감정이 없습니다.")
else:
    for i, m in enumerate(st.session_state["moods"], start=1):
        st.write(f"{i}. {m}")
```

---

📝 해설
- Streamlit은 **새로 실행되기 때문에 일반 변수는 유지되지 않음**
- `st.session_state`는 **브라우저가 열려 있는 동안 유지**
- 이 문제를 이해하면 **기록/로그/히스토리 앱**의 기초가 완성됨

---

## 🔵 문제 3 (난이도: 중상 / 25분)

감정 통계를 표 + 차트로 시각화하기

📘 문제 설명
저장된 감정 기록을 이용해 감정별 횟수 통계를 만들고 표와 막대 그래프로 출력하세요.

`[전체 흐름]`
페이지 설정 → 세션에 감정 저장 공간 준비 → `[기록 탭]`에서 감정 추가/삭제 →  
`[통계 탭]`에서 저장된 감정으로 표·그래프 생성

---

✅ 요구사항
1. 감정 기록을 `DataFrame`으로 변환
2. `groupby()`로 감정별 횟수 계산
3. `st.table()` + `st.bar_chart()`로 출력

---

💡 힌트
- `pd.DataFrame(list)`
- `groupby("컬럼")["컬럼"].count()`
- 차트는 `set_index()`가 필요

출력화면 미리보기
![[Pasted image 20251221145420.png]]

---

🧩 문제 코드 틀
```python
import streamlitas st
import pandasas pd

# TODO: session_state에 감정 데이터가 있다고 가정

# TODO 1: DataFrame 변환

# TODO 2: 감정별 집계

# TODO 3: 표 + 차트 출력
```

---

✅ 정답 코드
```python
import streamlit as st
import pandas as pd

# -----------------------------
# 0) 페이지 설정 (선택이지만 추천)
# -----------------------------
st.set_page_config(page_title="감정 기록/통계", page_icon="📊", layout="wide")

# -----------------------------
# 1) 세션 상태 초기화
# -----------------------------
if "moods" not in st.session_state:
    st.session_state["moods"] = []  # 예: ["😀 행복", "😐 보통", ...]

st.title("📊 감정 기록 & 통계")

# 탭으로 화면을 2개로 분리 (기록 / 통계)
tab_record, tab_stats = st.tabs(["📝 감정 기록", "📈 감정 통계"])

# =========================================================
# 탭 1) 감정 기록
# =========================================================
with tab_record:
    st.header("📝 감정 기록하기")

    mood = st.selectbox(
        "오늘의 감정",
        ["😀 행복", "😊 좋음", "😐 보통", "😞 슬픔", "😡 화남"],
        key="mood_select"  # 위젯 key (중복 방지)
    )

    # 버튼은 한 번만 만들고 변수로 받기
    add_clicked = st.button("감정 추가", key="add_mood_btn")
    if add_clicked:
        st.session_state["moods"].append(mood)
        st.success("✅ 감정이 저장되었습니다!")

    st.subheader("📋 저장된 감정 목록")

    if len(st.session_state["moods"]) == 0:
        st.info("아직 저장된 감정이 없습니다. 위에서 감정을 추가해보세요.")
    else:
        for i, m in enumerate(st.session_state["moods"], start=1):
            st.write(f"{i}. {m}")

    # 전체 삭제
    delete_clicked = st.button("⚠️ 전체 삭제", key="delete_all_btn")
    if delete_clicked:
        st.session_state["moods"] = []
        st.warning("모든 감정 기록을 삭제했습니다.")

# =========================================================
# 탭 2) 감정 통계
# =========================================================
with tab_stats:
    st.header("📈 감정 통계 보기")

    # 데이터가 없으면 통계 계산 불가
    if len(st.session_state["moods"]) == 0:
        st.info("먼저 '📝 감정 기록' 탭에서 감정을 기록해주세요.")
        st.stop()

    # 리스트 -> DataFrame
    df = pd.DataFrame(st.session_state["moods"], columns=["감정"])

    # 감정별 횟수 집계
    mood_count = (
        df.groupby("감정")
          .size()
          .reset_index(name="횟수")
    )

    st.subheader("📋 감정별 통계 (표)")
    st.dataframe(mood_count, width="stretch")  # use_container_width 경고 제거

    st.subheader("📊 감정 분포 그래프")
    st.bar_chart(mood_count.set_index("감정"))
```

의사코드
```python
0️⃣ 페이지 초기 설정
앱 제목을 "감정 기록/통계"로 설정한다
페이지 아이콘과 레이아웃을 지정한다

1️⃣ 세션 상태 초기화
만약 세션에 "moods"라는 저장 공간이 없다면
    빈 리스트를 만들어서 세션에 저장한다
의미:
- 사용자가 버튼을 눌러 추가한 **감정 기록을 기억하기 위한 공간** 
- 새로고침 전까지 유지됨    

2️⃣ 페이지 제목 출력
페이지 상단에 "감정 기록 & 통계" 제목을 보여준다

3️⃣ 화면을 두 개의 탭으로 나눈다
탭 1: 감정 기록
탭 2: 감정 통계    

탭 1 — 감정 기록 화면
감정 선택
"오늘의 감정"을 선택할 수 있는 선택 박스를 만든다
(행복, 좋음, 보통, 슬픔, 화남 중 하나)

감정 추가 버튼
"감정 추가" 버튼을 만든다

만약 버튼을 눌렀다면
    선택한 감정을 세션의 moods 리스트에 추가한다
    "저장되었습니다" 메시지를 보여준다
    
저장된 감정 목록 출력
"저장된 감정 목록" 제목을 보여준다

만약 저장된 감정이 하나도 없다면
    "아직 저장된 감정이 없습니다" 안내 메시지를 보여준다
그렇지 않다면
    저장된 감정을 1번부터 번호를 붙여 하나씩 화면에 출력한다
    
전체 삭제 버튼
"전체 삭제" 버튼을 만든다

만약 버튼을 눌렀다면
    세션의 moods 리스트를 빈 리스트로 초기화한다
    "모든 감정을 삭제했습니다" 경고 메시지를 보여준다   

탭 2 — 감정 통계 화면
데이터 존재 여부 확인
만약 저장된 감정이 없다면
    "먼저 감정을 기록해주세요" 안내 메시지를 보여주고
    통계 처리를 중단한다

감정 데이터를 표 형태로 변환
세션에 저장된 감정 리스트를
"감정"이라는 열을 가진 표(DataFrame)로 만든다

감정별 개수 계산
같은 감정끼리 묶는다
각 감정이 몇 번 나왔는지 센다
결과를 "감정 / 횟수" 형태의 표로 만든다

통계 결과 출력
감정별 횟수를 표로 보여준다
감정별 횟수를 막대 그래프로 시각화한다    
```

---

📝 해설

- `DataFrame → groupby → 집계 → 시각화`
    👉 모든 데이터 대시보드의 기본 공식
    
- 이 구조를 이해하면
    CSV, API, DB 데이터도 동일한 방식으로 처리 가능
    
---
### 추가 자료 행 열

![[Group 12.png]]