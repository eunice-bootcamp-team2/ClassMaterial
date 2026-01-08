# Streamlit 심화 & 배포 실습

# 0. 전체 콘셉트 & 산출물

🎯 목표
- Streamlit 대시보드 1개 완성
- 예시 주제: `대한민국 도시 인구/지표 분석 대시보드`
- 기능 포함:
    - 사이드바 필터
    - 탭(Tab) 기반 화면 분리
    - 차트(Bar / Line / Metric)
    - 간단한 “관제 느낌” 색상/지표
- GitHub 레포지토리 1개
- Streamlit Cloud 배포 URL 1개
- 테스트 코드로 데이터 처리 함수 검증

---
# 1. 프로젝트 폴더 만들기

```bash
cd ~
mkdir streamlit_dashboard_day # 폴더생성
cd streamlit_dashboard_day # 생성한 폴더로 이동
pwd  # 경로확인
```

uv 설치 확인
```bash
uv --version
```

없으면 설치(그러나 우린 이미설치했습니다. 참고만 하세요.)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh  # uv 설치 명령어
source ~/.bashrc # 지금 터미널에 환경 변수 변경을 즉시 반영하는 명령어
uv --version
```

uv로 프로젝트 초기화
```bash
uv init
```
	이 단계에서 이 폴더는 하나의 파이썬 프로젝트다가 확정됩니다.

가상환경(.venv) 만들고 활성화
```bash
uv venv
source .venv/bin/activate
```

.venv/가 안보이면 활성화 여부를 확인합니다.
```bash
which python
```

활성화 확인: 정상적으로 활성화 되었다는 뜻입니다.
```bash
/home/youjung/streamlit_dashboard_day/.venv/bin/python
```

가상환경은 활성화됐지만 표시만 안 되는 상태 해결방법(해당사항만 진행합니다.)
```bash
unset VIRTUAL_ENV_DISABLE_PROMPT
source .venv/bin/activate
export PS1="(.venv) $PS1"
```
이때 (.venv)가 보이면 가상환경은 정상

필수 라이브러리 설치
```bash
uv pip install streamlit pandas requests python-dotenv pytest
```

선택(고급):
```bash
uv pip install matplotlib plotly folium streamlit-folium
```

설치 확인:
```bash
uv pip list
```

---
중간 점검 - Streamlit이 뜨는지 먼저 확인
app.py 생성
```bash
touch app.py
```

`app.py`에 아래 입력:
```python
import streamlit as st

st.set_page_config(page_title="Day10 Streamlit", layout="wide")
st.title("🏙️ Streamlit Day10 시작")
st.write("폴더 생성 → uv 환경 세팅 → 실행 성공까지 완료!")
```

실행 (uv 방식)
```bash
uv run streamlit run app.py
```
브라우저: `http://localhost:8501`
	환경설정이 됐고, 스트림릿이 실제로 뜬다”를 먼저 확인합니다.

Streamlit이 실제로 뜨면 종료: 터미널에서 `Ctrl + C`

---
# 2. 디렉토리 구조 생성 (서비스형 구조 만들기)

프로젝트 구조:
```bash
streamlit_dashboard_day/
├─ app.py                      # 메인 Streamlit 앱
├─ dashboard/
│   ├─ __init__.py
│   ├─ layout.py               # 레이아웃(컬럼, 탭, 사이드바) 구성
│   ├─ widgets.py              # 위젯(입력/필터) 관련 함수
│   ├─ views.py                # 각 탭에서 그리는 화면(표/차트/카드)
│   └─ state.py                # Session state 관련 유틸 (필요 시)
├─ services/
│   ├─ __init__.py
│   └─ data_loader.py          # CSV / API 데이터 불러오기 로직
├─ data/
│   └─ population.csv          # 예시 데이터 (도시/연도/인구 등)
├─ tests/
│   ├─ __init__.py
│   └─ test_data_loader.py     # 데이터 처리 함수 단위 테스트
├─ requirements.txt            # streamlit, pandas 등
└─ README.md                   # 프로젝트 설명 + 실행/배포 방법
```

폴더 구조 생성 (dashboard/services/data/tests)
```bash
mkdir -p dashboard services data tests

touch dashboard/__init__.py services/__init__.py tests/__init__.py
touch dashboard/layout.py dashboard/widgets.py dashboard/views.py dashboard/state.py
touch services/data_loader.py
touch tests/test_data_loader.py
touch README.md requirements.txt
```

data/population.csv 만들기
```bash
cat > data/population.csv << 'EOF'
도시,연도,인구수
서울,2020,950
서울,2021,960
서울,2022,970
부산,2020,340
부산,2021,345
부산,2022,350
대구,2020,240
대구,2021,242
대구,2022,245
제주,2020,70
제주,2021,72
제주,2022,75
EOF
```
---
# requirements.txt 생성 (설치 끝났으니 이제 freeze)

```bash
uv pip freeze > requirements.txt
```
→ 현재 설치된 streamlit, pandas, requests 등  
모든 패키지 버전 정보가 자동으로 들어감

확인:
```bash
cat requirements.txt
```

requirements.txt 
```
streamlit==1.41.1
pandas==2.2.2
requests==2.32.3
python-dotenv==1.0.1
.....이하 생략
```
(버전은 현재 기준 값이며 수업 시점에서 자동 freeze 권장)

Streamlit 실행 명령어
```bash
 uv run streamlit run app.py
```
	제대로 구동되는지 확인

---
### 설치한 라이브러리
	오늘 우리는 파이썬으로 웹 대시보드를 만들어 실제 서비스처럼 배포하는 것이 목표입니다.  
	그래서 웹 화면 + 데이터 처리 + 외부 데이터 연동 + 배포 환경 관리에 필요한 라이브러리만 
	설치했습니다.

필수 라이브러리 (이 4개는 반드시 필요)
```bash
uv pip install streamlit pandas requests python-dotenv
```

### 왜 이 4개인가?
| 라이브러리             | 쉽게 말하면                | 하는 역할                       |
| ----------------- | --------------------- | --------------------------- |
| **streamlit**     | 파이썬으로 웹 화면을 그리는 도구    | HTML/CSS 없이 대시보드 화면을 바로 만듦  |
| **pandas**        | 표(엑셀 같은 데이터)를 다루는 도구  | CSV/API 데이터를 정리·필터·계산       |
| **requests**      | 웹 주소(API)에 요청 보내는 도구  | 외부 데이터(미세먼지, 인구, 날씨 등) 가져오기 |
| **python-dotenv** | 비밀 값(API KEY)을 숨기는 도구 | 배포 시 보안 정보 관리               |

🔹 streamlit
	파이썬 코드 → 바로 웹 화면
- 버튼, 표, 차트, 탭을 파이썬 한 줄로 만듦
- 서버 설정, 프론트엔드 지식 없이도 웹 앱 가능

예:
```python
st.title("대시보드")
st.dataframe(df)
st.bar_chart(df)
```
---
🔹 pandas
	데이터 다루기의 표준 도구
- CSV 파일 읽기
- 필터링 / 정렬 / 합계 / 평균 계산
- Streamlit과 가장 잘 어울리는 데이터 도구

예:
```python
df = pd.read_csv("population.csv")
df[df["연도"] ==2022]
```
---
🔹 requests
	파이썬으로 외부 사이트/API에 데이터 요청
- 공공데이터 API
- 날씨/미세먼지/교통 데이터
- 나중에 실시간 관제 데이터 연결할 때 사용

예:
```python
response = requests.get(url)
data = response.json()
```
---
🔹 python-dotenv
	중요한 키를 코드 밖으로 빼는 안전장치
- API KEY를 코드에 직접 쓰면 ❌
- `.env` 파일에 저장해서 관리

예:
```
API_KEY=abc123
```

```python
import os
api_key = os.getenv("API_KEY")
```
---
### 선택(확장) 라이브러리

선택 패키지 (선택 과제 or 확장 기능 시)
```bash
uv pip install matplotlib plotly folium
```

### 언제 쓰는가?
| 라이브러리          | 한 줄 설명        | 이럴 때 사용        |
| -------------- | ------------- | -------------- |
| **matplotlib** | 정밀한 차트 그리기    | 색·축·주석 세밀 조정   |
| **plotly**     | 움직이는 인터랙티브 차트 | 줌/툴팁/마우스 반응    |
| **folium**     | 지도 위에 데이터 표시  | 지역·좌표 기반 관제 화면 |

---
🔹 matplotlib
	가장 기본적인 차트 라이브러리
- 막대/선/원 그래프
- 커스터마이징 자유도 높음

단점:
- 인터랙션(줌/클릭)은 약함

---
🔹 plotly
	마우스로 만지는 차트
- 확대/축소
- 마우스 올리면 수치 표시
- 발표·데모용으로 매우 좋음

Streamlit과 궁합 👍

---
🔹 folium
	지도 위에 점/영역 표시
- 지도 + 좌표 데이터
- 관제, 위치 기반 서비스에 필수

예:
- 도시별 위험 지역
- 센서 위치 표시


---
# 3. `app.py` 파일 만들기

이 파일이 하는 일:
	CSV 데이터를 읽어 → 사이드바에서 필터 조건을 받고 → 탭으로 화면을 나누고 → 표/차트/지표를 보여주는 미니 관제 대시보드를 만든다.

화면 구성(사용자가 보게 될 UI)
- 왼쪽 사이드바: 연도 선택 / 도시 선택 / 정렬 / 관제 임계치(경고 기준)설정
- 메인 화면 탭 3개
    1. 데이터: 원본/필터 결과 표
    2. 차트·지표: bar/line + metric 카드
    3. 관제(경고): 임계치 넘는 도시만 빨간 경고로 보여주기
---
개발순서:
1. 화면이 뜬다(뼈대)
2. CSV를 읽어서 표가 뜬다
3. 사이드바에서 필터를 누르면 표가 바뀐다
4. 탭으로 화면을 나눈다
5. 차트/Metric을 붙인다
6. 임계치 기반 “경고 관제”를 만든다
---
## 1. 화면이 뜬다(뼈대)

#### Step 1. “뼈대만” 만들기 (가장 단순)
	목적: Streamlit 앱이 뜨는지 확인 (지금 단계에서 데이터/필터 없음)

`app.py` : 
```python
import streamlit as st

# 1) 페이지 설정 (가장 위에서 1번만)
# 페이지 기본 설정 (탭 제목, 레이아웃 등)
st.set_page_config(
    page_title="도시 인구 대시보드",  # 브라우저 탭 제목
    layout="wide"                    # 화면을 넓게 쓰기
)

# 2) 제목/설명 (화면에 텍스트만 출력)
# 화면 상단 제목
st.title("🏙️ 대한민국 도시 인구 대시보드")

# 부제 / 설명
st.write("Streamlit으로 만드는 나만의 첫 웹 대시보드입니다.")

# 간단한 텍스트 출력
st.write("이 화면은 파이썬 코드로 만들어진 웹 페이지입니다.")
```

실행
```bash
uv run streamlit run app.py
```

![[Pasted image 20251222201151.png]]
이렇게 보이면 성공

---
#### Step 2. CSV 연결 → 표 띄우기 (데이터 흐름 체감)
	목적: CSV → DataFrame → 화면에 표시 경험

`app.py` (Step 1에 추가/교체)
```python
import streamlit as st
import pandas as pd   # ⭐ [추가] CSV를 읽고 표(DataFrame)를 다루기 위해 pandas 필요

# ============================
# 1) 페이지 기본 설정
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    layout="wide",
    page_icon="🏙️"   # ⭐ [추가] 브라우저 탭에 아이콘 표시 (기능엔 영향 없음, UI 개선)
)

# ============================
# 2) 제목 / 설명
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")

# ⭐ [수정]
# 기존: "Streamlit으로 만드는 나만의 첫 웹 대시보드입니다."
# 변경 이유: 지금 단계가 'CSV 읽기'라는 걸 사용자에게 명확히 알리기 위해
st.write("Step 2: CSV 데이터를 읽어서 표로 보여줍니다.")

# ============================
# 3) CSV 데이터 로드
# ============================

# ⭐ [추가]
# pandas를 이용해 data/population.csv 파일을 읽어 DataFrame으로 변환
# → 이 한 줄이 '파일 → 파이썬 메모리'로 데이터가 들어오는 핵심 지점
df = pd.read_csv("data/population.csv")

# ============================
# 4) 데이터 출력
# ============================

# ⭐ [추가]
# 화면에 '원본 데이터'라는 소제목을 표시
st.subheader("📑 원본 데이터")

# ⭐ [추가]
# DataFrame을 웹 테이블 형태로 출력
# use_container_width=True:
# → 화면 가로폭에 맞게 표를 자동으로 늘려서 보여줌
st.dataframe(df, use_container_width=True)
```
	확인: 테이블이 화면에 보이면 OK

![[Pasted image 20251222201709.png]]

---
#### Step 3. 사이드바 필터(연도/도시) → 표가 바뀌게 만들기
	목적: 위젯 입력 → 조건 → df 필터링 → 화면 반영 패턴 이해

`app.py`
```python
import streamlit as st
import pandas as pd

# ============================
# 1) 페이지 기본 설정 (변경 없음)
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    layout="wide",
    page_icon="🏙️"
)

# ============================
# 2) 제목 / 단계 설명
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")

# ⭐ [수정]
# 기존 Step 2에서는 "CSV 데이터를 표로 보여줍니다"
# → Step 3에서는 '사이드바 필터로 데이터가 바뀐다'는 목적을 명확히 알리기 위해 문구 변경
st.write("Step 3: 사이드바 필터로 데이터를 줄여봅니다.")

# ============================
# 3) CSV 데이터 로드 (변경 없음)
# ============================
df = pd.read_csv("data/population.csv")

# ============================
# 4) 사이드바 입력 UI (⭐ Step 3의 핵심 추가)
# ============================

# ⭐ [추가]
# 왼쪽 사이드바 영역에 '필터' 섹션 생성
# → 메인 화면과 '입력 영역'을 시각적으로 분리
st.sidebar.header("🔎 필터")

# ⭐ [추가]
# 데이터에 들어 있는 연도/도시 목록을 미리 준비
# unique(): 중복 제거
# sorted(): 보기 좋게 정렬
years = sorted(df["연도"].unique())
cities = sorted(df["도시"].unique())

# ⭐ [추가]
# 연도는 하나만 선택 → selectbox 사용
selected_year = st.sidebar.selectbox(
    "연도 선택",
    years
)

# ⭐ [추가]
# 도시는 여러 개 선택 가능 → multiselect 사용
# default=cities:
# → 처음 열었을 때 '전체 도시 선택 상태'로 시작
selected_cities = st.sidebar.multiselect(
    "도시 선택",
    cities,
    default=cities
)

# ============================
# 5) 필터링 처리 로직 (⭐ Step 3의 핵심)
# ============================

# ⭐ [추가]
# 사이드바에서 선택한 값으로 DataFrame을 줄임
# 조건 1: 선택한 연도만 남긴다
# 조건 2: 선택한 도시만 남긴다
# & 로 두 조건을 동시에 만족하는 행만 추출
filtered = df[
    (df["연도"] == selected_year) &
    (df["도시"].isin(selected_cities))
]

# ============================
# 6) 화면 출력 (필터 결과 표시)
# ============================

st.subheader("🎯 필터 결과")

# ⭐ [추가]
# 현재 사용자가 어떤 조건을 선택했는지 한 줄로 보여줌
# → 대시보드에서 '현재 상태 표시'는 매우 중요
st.caption(
    f"현재 선택: 연도={selected_year}, 도시={len(selected_cities)}개"
)

# ⭐ [수정]
# 기존에는 df(전체 데이터)를 보여줬다면
# → 이제는 filtered(필터링된 결과)를 보여줌
st.dataframe(filtered, use_container_width=True)
```
	확인: 사이드바에서 연도/도시를 바꾸면 표가 바뀌면 OK

![[Pasted image 20251222202037.png]]

---
#### Step 4. 탭으로 화면 분리 (데이터 탭 / 차트 탭)
	목적: 화면을 나누는 감각 먼저 잡기 (차트는 다음 단계)
	화면을 한 페이지에서 섹션으로 나누던 방식 → 탭으로 화면을 분리하는 방식

`app.py`
```python
import streamlit as st
import pandas as pd

# ============================
# 1) 페이지 설정 (Step 3과 동일)
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    layout="wide",
    page_icon="🏙️"
)

# ============================
# 2) 제목 / 단계 안내 문구
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")

# ✅ [수정]
# Step 3에서는 "사이드바 필터로 데이터를 줄여봅니다." 였고
# Step 4에서는 "탭으로 화면을 나눕니다." 로 변경
# → 지금 단계의 목표(탭 분리)를 사용자에게 명확히 알려주기 위함
st.write("Step 4: 탭으로 화면을 나눕니다.")

# ============================
# 3) CSV 로드 (Step 3과 동일)
# ============================
df = pd.read_csv("data/population.csv")

# ============================
# 4) 사이드바 필터 UI (Step 3과 동일)
# ============================
st.sidebar.header("🔎 필터")

years = sorted(df["연도"].unique())
cities = sorted(df["도시"].unique())

selected_year = st.sidebar.selectbox("연도 선택", years)
selected_cities = st.sidebar.multiselect("도시 선택", cities, default=cities)

# ============================
# 5) 필터링 처리 (Step 3과 동일)
# ============================
filtered = df[
    (df["연도"] == selected_year) &
    (df["도시"].isin(selected_cities))
]

# ============================
# 6) 탭(Tab)으로 화면 분리 (⭐ Step 4 핵심 추가!)
# ============================

# ✅ [추가]
# Step 3까지는 화면이 "한 페이지"에서 이어지는 구조였음
# Step 4부터는 화면을 "탭 버튼"으로 분리해서 보여줌
# → 데이터 / 차트 / 관제 같은 화면을 기능별로 나눌 수 있어
# → 사용자 입장에서 훨씬 "대시보드"처럼 보이게 됨
tab1, tab2 = st.tabs(["📑 데이터", "📈 차트(다음 단계)"])

# ============================
# 7) 탭 1: 데이터 화면 (⭐ 출력 위치가 바뀜)
# ============================

# ✅ [수정/이동]
# Step 3에서는 st.dataframe(filtered)가 "그냥 메인 화면에 바로" 출력됐는데
# Step 4에서는 "데이터 탭(tab1) 안에서만" 보이도록 위치를 옮김
# → 탭을 누른 사람에게만 해당 화면을 보여주는 구조로 변경
with tab1:
    st.subheader("📑 데이터 탭")
    st.dataframe(filtered, use_container_width=True)

# ============================
# 8) 탭 2: 차트 화면 (현재는 뼈대만)
# ============================

# ✅ [추가]
# Step 4는 "탭 분리"가 목적이라
# 차트 탭은 아직 실제 차트가 아니라 안내문만 넣어둠
# Step 5에서 st.bar_chart, st.metric 등을 여기에 붙일 예정
with tab2:
    st.subheader("📈 차트 탭")
    st.info("Step 5에서 차트/지표를 붙일 예정입니다.")
```
	확인: 탭이 생기고, 데이터 탭에 표가 나오면 OK

여기까지가 “뼈대 + 핵심 흐름”입니다
지금 단계에서 이해해야 하는 건 딱 이 3개예요:
1. Streamlit은 위에서 아래로 실행된다
2. 위젯 값이 바뀌면 전체가 다시 실행된다
3. 그래서 `입력(위젯) → 처리(필터) → 출력(표/차트)` 구조로 짠다

![[Pasted image 20251222202353.png]]

---
## 2. CSV를 읽어서 표가 뜬다(CSV → DataFrame → Streamlit 표)
	⚠️ 이 단계는 이미 앞에서 구현 완료했습니다.

Step 2에서 우리가 확인하려던 건 딱 이것뿐입니다 👇
목표
- `data/population.csv` 파일이 존재하는지
- `pd.read_csv()`로 DataFrame(df)이 만들어지는지
- `st.dataframe(df)`로 표가 화면에 뜨는지
    
---
## 3. 사이드바 필터를 누르면 표가 바뀐다

목표
- 왼쪽 사이드바에 연도 선택(selectbox), 도시 선택(multiselect) 위젯이 보인다
- 위젯 선택값이 바뀌면 메인 화면의 표가 자동으로 바뀐다
- 핵심 패턴을 체감한다:
    
입력(위젯) → 처리(필터링) → 출력(표)

현재 상태
이전 단계에서 이미 했던 것:
- `data/population.csv`가 있다
- `app.py`가 CSV를 읽어서 `st.dataframe(df)`로 표를 보여준다
    
먼저 실행 확인(선택):
```bash
uv run streamlit run app.py
```
---
app.py에 사이드바 필터 UI 추가하기
	지금 단계는 “정렬/탭/차트/경고”는 아직 안 합니다.  
	오직 “필터”만 해서 표가 바뀌는 경험을 만듭니다.
```python
import streamlit as st
import pandas as pd

# ============================
# 1) 페이지 설정
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    page_icon="🏙️",
    layout="wide",
)

# ============================
# 2) 제목/설명
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")
st.write("Step 3: 사이드바 필터(연도/도시)를 바꾸면 표가 바로 바뀝니다.")

# ============================
# 3) CSV 로드
# ============================
df = pd.read_csv("data/population.csv")

# ✅ [추가] 타입 안정화 (CSV에 따라 문자열로 읽히는 경우 대비)
df["연도"] = pd.to_numeric(df["연도"], errors="coerce").astype("Int64")
df["인구수"] = pd.to_numeric(df["인구수"], errors="coerce")

# ============================
# 4) 사이드바(입력 UI)  ✅ (버튼 없음: 바꾸면 즉시 반영)
# ============================
st.sidebar.header("🔎 필터")

years = sorted(df["연도"].dropna().unique())
cities = sorted(df["도시"].dropna().unique())

selected_year = st.sidebar.selectbox("연도 선택", years)

selected_cities = st.sidebar.multiselect(
    "도시 선택 (여러 개 가능)",
    options=cities,
    default=cities
)

# ============================
# 5) 필터링(처리 로직)
# ============================
filtered = df[
    (df["연도"] == selected_year) &
    (df["도시"].isin(selected_cities))
]

# ============================
# 6) 출력(화면)
# ============================
st.caption(f"현재 선택: 연도={selected_year}, 도시={len(selected_cities)}개")

# ✅ [수정] 원본 데이터는 접어두기 (혼란 방지)
with st.expander("📑 원본 데이터 보기(참고용)", expanded=False):
    st.dataframe(df, use_container_width=True)

st.subheader("🎯 필터 결과 데이터")
if filtered.empty:
    st.warning("선택한 조건에 해당하는 데이터가 없습니다. 사이드바 조건을 바꿔보세요.")
else:
    st.dataframe(filtered, use_container_width=True)
```

실행
```bash
uv run streamlit run app.py
```
	브라우저: http://localhost:8501

![[Pasted image 20251222210349.png]]

확인 포인트(필수 체크리스트)
사이드바에 보이는지 확인
- `연도 선택` 드롭다운이 보인다
- `도시 선택` 체크박스 리스트가 보인다
    
표가 바뀌는지 확인
1. 연도를 2020 → 2022로 바꿔본다
2. 도시 체크를 1개만 남겨본다(예: 서울만)
3. 메인 화면의 필터 결과 데이터가 바로 바뀌면 성공
    
Streamlit은 위젯 값이 바뀌면 자동으로 스크립트가 다시 실행되면서 화면이 갱신됩니다.

---
## 4. 탭(Tab)으로 화면을 나눈다

목표
- 화면 상단에 탭 2~3개가 보인다
- 탭을 클릭하면 화면 내용이 바뀐다
- 중요한 포인트:
    - 필터링은 1번만 하고
    - 그 결과(filtered)를 탭마다 다르게 보여준다
        
왜 탭을 쓰나요?
	한 화면에 표/차트/경고를 다 때려 넣으면 복잡해져요.  
	실무 대시보드는 보통 목적별로 화면을 나눕니다:
- 데이터 탭: 원본/필터 결과를 표로 확인
- 차트 탭: 그래프로 빠르게 추세/비교
- 관제 탭: 경고만 뽑아서 우선 확인
    
오늘은 먼저 탭으로 나누는 뼈대부터 만들고, 다음 단계에서 차트/경고를 붙입니다.

---
app.py 수정
이 코드는 **Step 3(필터)** 를 유지하고, 출력 부분만 탭 구조로 분리합니다.
```python
import streamlit as st
import pandas as pd

# =========================================================
# ✅ Step 4 전체 코드 (Step 3 유지 + "출력 부분"을 탭으로 분리)
# ---------------------------------------------------------
# 핵심 변화 요약
# - Step 3까지: 필터 결과를 "메인 화면에 바로" 출력
# - Step 4부터: 필터는 1번만 하고(filtered),
#              출력은 탭(tab_data / tab_chart / tab_monitor) 안에서 분리
# =========================================================


# ============================
# 1) 페이지 기본 설정 (Step 3과 동일)
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    page_icon="🏙️",
    layout="wide",
)

# ============================
# 2) 제목/설명 (✅ Step 3 문구에서 Step 4 문구로 수정)
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")

# ✅ [수정] Step 3 → Step 4 단계 안내 문구 변경
# - Step 3: "사이드바 필터(연도/도시)를 누르면 표가 바뀝니다."
# - Step 4: "탭(Tab)으로 화면을 나눕니다. (데이터/차트/관제)"
# 👉 이유: 지금 단계의 목표가 "탭 분리"이기 때문
st.write("Step 4: 탭(Tab)으로 화면을 나눕니다. (데이터/차트/관제)")

# ============================
# 3) CSV 로드 (Step 3과 동일)
# ============================
df = pd.read_csv("data/population.csv")

# ============================
# 4) 사이드바(입력 UI) (Step 3과 동일)
# ============================
st.sidebar.header("🔎 필터")

years = sorted(df["연도"].unique())
cities = sorted(df["도시"].unique())

selected_year = st.sidebar.selectbox("연도 선택", years)
selected_cities = st.sidebar.multiselect(
    "도시 선택 (여러 개 가능)",
    options=cities,
    default=cities
)

# ============================
# 5) 필터링(처리) (Step 3과 동일)
# ============================
# ✅ [중요 포인트] 필터링은 "딱 1번만" 수행하고, 그 결과(filtered)를 탭마다 재사용
filtered = df[
    (df["연도"] == selected_year) &
    (df["도시"].isin(selected_cities))
]

# ✅ [유지] 현재 선택 상태를 한 줄로 표시 (사용자 혼란 방지)
st.caption(f"현재 선택: 연도={selected_year}, 도시={len(selected_cities)}개")

# ============================
# 6) 탭 만들기 (✅ Step 4 핵심 "추가")
# ============================
# ✅ [추가] Step 3까지는 탭이 없었음
# 👉 이유: 화면을 목적별로 나누기 위해 (데이터 / 차트 / 관제)
tab_data, tab_chart, tab_monitor = st.tabs(
    ["📑 데이터", "📈 차트(다음 단계)", "🚨 관제(다음 단계)"]
)

# ============================
# 7) 탭별 화면 출력 (✅ Step 4 핵심 "이동/분리")
# ============================

# ---------------------------------------------------------
# (1) 데이터 탭
# ---------------------------------------------------------
with tab_data:
    st.subheader("📑 데이터 탭")

    # ✅ [추가] 원본 데이터는 항상 펼쳐놓으면 화면이 길어져서 복잡해짐
    # 👉 이유: 필요할 때만 보도록 expander로 접어두기
    with st.expander("원본 데이터 보기(펼치기)", expanded=False):
        st.dataframe(df, use_container_width=True)

    # ✅ [수정/이동] Step 3에서는 "메인 화면에 바로" 필터 결과를 출력했지만
    # Step 4에서는 "데이터 탭 안"에서만 출력하도록 위치 이동
    st.markdown("### 🎯 필터 결과 데이터")
    if filtered.empty:
        st.warning("선택한 조건에 해당하는 데이터가 없습니다. 사이드바 조건을 바꿔보세요.")
    else:
        st.dataframe(filtered, use_container_width=True)

# ---------------------------------------------------------
# (2) 차트 탭 (현재는 뼈대)
# ---------------------------------------------------------
with tab_chart:
    st.subheader("📈 차트 탭")

    # ✅ [추가] Step 4 목표는 탭 분리 구조 잡기이므로
    # 차트는 Step 5에서 붙일 예정 (지금은 안내문만)
    st.info("Step 5에서 bar/line 차트와 Metric(요약지표)을 붙입니다.")
    st.write("지금은 탭 분리 구조만 잡는 단계입니다.")

# ---------------------------------------------------------
# (3) 관제 탭 (현재는 뼈대)
# ---------------------------------------------------------
with tab_monitor:
    st.subheader("🚨 관제(경고) 탭")

    # ✅ [추가] Step 6에서 임계치 기준 경고 도시만 추려서 보여줄 예정
    st.info("Step 6에서 임계치 기준으로 경고 도시만 뽑아 빨간 박스로 보여줍니다.")
    st.write("지금은 탭 분리 구조만 잡는 단계입니다.")
```

실행:
```bash
uv run streamlit run app.py
```
	브라우저: http://localhost:8501

![[Pasted image 20251222210810.png]]

확인 포인트(체크리스트)
1. 상단에 탭이 보이나요?
	- `📑 데이터`
	- `📈 차트(다음 단계)`
	- `🚨 관제(다음 단계)`
2. 사이드바에서 도시/연도를 바꾸면
	- 데이터 탭의 필터 결과 표가 바뀌나요?
3. 차트/관제 탭을 눌러도
	- 화면이 바뀌면서 “다음 단계 안내”가 보이나요?
이 3개가 되면 Step 4 성공입니다.

---
## 5. 차트 + Metric(요약지표) 붙이기

목표
- 📈 차트 탭에서 아래가 보인다:
    1. Metric 3개: 총 인구 / 평균 인구 / 최대 도시
    2. 막대 차트(Bar): 도시별 인구 비교
    3. 라인 차트(Line): 도시별 인구를 선으로 보기(간단 비교)
        
- 사이드바에서 연도/도시를 바꾸면  
    → Metric 값과 차트가 같이 바뀐다
    
왜 Metric과 차트가 필요한가?
- 표는 정확한 값 확인에 좋고
- 차트/지표는 한눈에 상황 파악에 좋습니다  
    → 이 순간부터 화면이 표가 아니라 대시보드처럼 보이기 시작합니다.
---
`app.py`
tab_chart 코드
아래 코드를 기존 `with tab_chart:` 부분에 그대로 붙여넣어 교체하세요.
```python
import streamlit as st
import pandas as pd

# =========================================================
# ✅ Step 5 전체 코드 (Step 4 + "차트 탭에 Metric/차트" 추가)
# ---------------------------------------------------------
# Step 4 → Step 5에서 바뀐 점(핵심)
# 1) tab_chart 안의 내용이 "안내문" → "Metric + 차트"로 교체됨 ✅
# 2) filtered(필터 결과)를 그대로 재사용해서
#    사이드바 선택이 바뀌면 Metric/차트도 같이 바뀜 ✅
# 3) CSV(df)는 그대로, 변경 없음 ✅
# =========================================================

# ============================
# 1) 페이지 기본 설정 (Step 4와 동일)
# ============================
st.set_page_config(
    page_title="도시 인구 대시보드",
    page_icon="🏙️",
    layout="wide",
)

# ============================
# 2) 제목/단계 안내 (Step 4와 동일)
# ============================
st.title("🏙️ 대한민국 도시 인구 대시보드")
st.write("Step 5: 차트 + Metric(요약지표)를 붙입니다. (데이터/차트/관제)")

# ============================
# 3) CSV 로드 (Step 4와 동일)
# ============================
df = pd.read_csv("data/population.csv")

# ============================
# 4) 사이드바 필터 UI (Step 4와 동일)
# ============================
st.sidebar.header("🔎 필터")

years = sorted(df["연도"].unique())
cities = sorted(df["도시"].unique())

selected_year = st.sidebar.selectbox("연도 선택", years)
selected_cities = st.sidebar.multiselect(
    "도시 선택 (여러 개 가능)",
    options=cities,
    default=cities
)

# ============================
# 5) 필터링 처리 (Step 4와 동일)
# ============================
filtered = df[
    (df["연도"] == selected_year) &
    (df["도시"].isin(selected_cities))
]

# 현재 선택 상태 표시(유지)
st.caption(f"현재 선택: 연도={selected_year}, 도시={len(selected_cities)}개")

# ============================
# 6) 탭 만들기 (Step 4와 동일)
# ============================
tab_data, tab_chart, tab_monitor = st.tabs(
    ["📑 데이터", "📈 차트", "🚨 관제(다음 단계)"]
)

# ============================
# 7) 데이터 탭 (Step 4와 동일)
# ============================
with tab_data:
    st.subheader("📑 데이터 탭")

    # 원본 데이터는 필요할 때만 펼치기(유지)
    with st.expander("원본 데이터 보기(펼치기)", expanded=False):
        st.dataframe(df, use_container_width=True)

    st.markdown("### 🎯 필터 결과 데이터")
    if filtered.empty:
        st.warning("선택한 조건에 해당하는 데이터가 없습니다. 사이드바 조건을 바꿔보세요.")
    else:
        st.dataframe(filtered, use_container_width=True)

# ============================
# 8) 차트 탭 (✅ Step 5 핵심 수정/교체 부분)
# ============================
with tab_chart:
    st.subheader("📈 차트 탭 (차트 + Metric)")

    # ✅ [유지/필수] 예외 처리: filtered가 비면 metric/차트 계산이 불가
    # - mean/sum은 가능해도, max_row(iloc[0])에서 에러가 날 수 있음
    if filtered.empty:
        st.info("표시할 데이터가 없습니다. 사이드바에서 도시를 선택해보세요.")
    else:
        # ✅ [추가] ============================
        # 1) Metric(요약 지표) 계산
        # ============================
        # - filtered를 기준으로 계산하므로
        #   사이드바에서 연도/도시를 바꾸면 값이 자동으로 같이 바뀜
        total_pop = float(filtered["인구수"].sum())
        avg_pop = float(filtered["인구수"].mean())
        max_row = filtered.sort_values("인구수", ascending=False).iloc[0]

        st.markdown("### 📌 요약 지표 (Metric)")
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("총 인구(합)", f"{total_pop:,.0f} (만 명)")
        with col2:
            st.metric("평균 인구", f"{avg_pop:,.1f} (만 명)")
        with col3:
            st.metric("최대 도시", f"{max_row['도시']} ({max_row['인구수']:,.0f})")

        st.divider()

        # ✅ [추가] ============================
        # 2) 차트 데이터 만들기
        # ============================
        # Streamlit의 bar_chart/line_chart는
        # index가 x축, 값이 y축이 되므로 '도시'를 index로 둔다.
        chart_series = filtered.set_index("도시")["인구수"]

        st.markdown("### 📊 막대 차트 (도시별 인구 비교)")
        st.bar_chart(chart_series)

        st.markdown("### 📈 라인 차트 (도시별 인구를 선으로 보기)")
        st.line_chart(chart_series)

        st.caption("※ 현재는 '연도 1개'만 선택하므로 시간 추세 분석보다는 '도시 간 비교'용으로 봅니다.")

    # ✅ [Step 4 → Step 5 변경 설명]
    # Step 4에서는 tab_chart에 아래처럼 안내문만 있었음:
    #   st.subheader("📈 차트 탭")
    #   st.info("Step 5에서 차트/지표를 붙일 예정입니다.")
    #
    # Step 5에서는 그 안내문을 "Metric + 차트" 코드로 교체한 것임.

# ============================
# 9) 관제 탭 (Step 4와 동일: 아직 뼈대)
# ============================
with tab_monitor:
    st.subheader("🚨 관제(경고) 탭")
    st.info("Step 6에서 임계치 기준으로 경고 도시만 뽑아 빨간 박스로 보여줍니다.")
    st.write("지금은 관제 탭 뼈대만 있는 단계입니다.")
```

실행
```bash
uv run streamlit run app.py
```

![[Pasted image 20251222210940.png]]

확인 포인트(체크리스트)
1. **📈 차트 탭**에 들어가면
	- Metric 3개가 보이나요?
	    - 총 인구(합)
	    - 평균 인구
	    - 최대 도시
2. 그 아래에
	- 막대 차트가 보이나요?
	- 라인 차트가 보이나요?
3. 사이드바에서
	- 도시를 “서울만” 선택해보면  
	    → Metric/차트가 서울 1개 기준으로 바뀌나요?
✅ 이 3개가 되면 Step 5 성공입니다.

---
## 6. 임계치 기반 “경고 관제” 만들기

🎯 목표
- 사이드바에 경고 임계치(숫자 입력)가 있다
- 🚨 관제 탭에서:
    1. 임계치 이상 도시만 경고 대상으로 필터링된다
    2. 경고 대상이 있으면 빨간 경고 메시지가 뜬다
    3. 경고 대상 목록(표) + TOP3(우선 확인)까지 보여준다
- 사이드바에서 임계치를 바꾸면 → 관제 결과가 즉시 바뀐다
---
`app.py`
	관제 탭 코드
```python
# --- (3) 관제(경고) 탭: Step 6에서 임계치 기반 경고 관제 구현 ---
with tab_monitor:
    st.subheader("🚨 관제(경고) 탭")

    # 1) 필터 결과가 없으면 관제할 것도 없음
    if filtered.empty:
        st.info("데이터가 없습니다. 사이드바 필터(연도/도시)를 조정해보세요.")
    else:
        # 2) 임계치 기준으로 '경고 대상'만 추려내기
        # - warn_threshold 이상인 행만 위험(경고)으로 간주
        danger = filtered[filtered["인구수"] >= warn_threshold].copy()

        # 3) 현재 기준을 화면에 명시 (관제 화면은 '기준'이 중요)
        st.write(f"✅ 현재 경고 기준: 인구수 ≥ {warn_threshold} (만 명)")
        st.caption("관제 화면의 핵심은 '모든 데이터'가 아니라 '문제가 되는 것만 빠르게 추려 보여주기'입니다.")

        # 4) 경고 대상이 없으면 성공 메시지
        if danger.empty:
            st.success("✅ 현재 기준으로 경고 대상 도시가 없습니다.")
        else:
            # 5) 경고 대상이 있으면 빨간 경고 박스 + 목록
            st.error(f"⚠️ 경고 대상 도시가 {len(danger)}개 있습니다. 아래 목록을 확인하세요.")

            # 보기 좋게 내림차순 정렬
            danger = danger.sort_values("인구수", ascending=False)

            # (1) 경고 대상 전체 목록
            st.markdown("### 📋 경고 대상 목록")
            st.dataframe(danger, use_container_width=True)

            # (2) 우선 확인 TOP 3 (가장 큰 값부터)
            st.markdown("### 🔥 우선 확인 TOP 3")
            top3 = danger.head(3)
            st.table(top3[["도시", "연도", "인구수"]])

            # (3) 관제 요약 카드(선택 사항이지만 관제 느낌 업)
            st.markdown("### 📌 관제 요약")
            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("경고 도시 수", f"{len(danger)}개")
            with col2:
                st.metric("최대 인구(경고 중)", f"{danger['인구수'].max():,.0f}")
            with col3:
                st.metric("평균 인구(경고 중)", f"{danger['인구수'].mean():,.1f}")
```

실행
```bash
uv run streamlit run app.py
```

![[Pasted image 20251222211212.png]]

확인 포인트(체크리스트)
1. 사이드바에 임계치 입력이 보이나요?
	- 숫자 바꿀 수 있어야 함 (예: 500 → 300)
2. 🚨 관제 탭에서
	- 임계치를 낮추면 경고 대상이 늘고
	- 임계치를 높이면 경고 대상이 줄어드나요?
3. 경고 대상이 있을 때
	- 빨간 `st.error(...)` 박스가 뜨고
	- 경고 목록 표 + TOP3가 보이나요?
이 3개가 되면 Step 6 성공입니다.

---
## 역할별로 분리

왜 분리하나요?
1) app.py가 길어지면 “어디가 UI고 어디가 데이터 처리인지” 구분이 안 됨
	- 필터 UI, 탭 UI, 표 출력, 차트 출력, 임계치 관제 로직이 한 파일에 섞이면
	- 버그가 났을 때 어디를 고쳐야 하는지 감이 안 옵니다.
2) 역할을 나누면 고치기 쉬움
	- services/ : 데이터 읽기/전처리 (UI랑 분리)
	- dashboard/ : 화면(레이아웃/위젯/탭 화면)만 담당
	- tests/ : Streamlit 없이 “순수 함수”만 테스트 가능
3) 배포/협업 때 더 안전
	- 팀원이 UI만 수정할 수도 있고
	- 데이터 로딩만 바꿀 수도 있음  
    → 서로 충돌이 줄어듭니다.

---
## 디렉토리 구조 다시 확인

디렉토리 구조:
```bash
streamlit_dashboard_day/
├─ app.py
├─ dashboard/
│   ├─ __init__.py
│   ├─ layout.py
│   ├─ widgets.py
│   ├─ views.py
│   └─ state.py
├─ services/
│   ├─ __init__.py
│   └─ data_loader.py
├─ data/
│   └─ population.csv
├─ tests/
│   ├─ __init__.py
│   └─ test_data_loader.py
├─ requirements.txt
└─ README.md
```

`services/data_loader.py` (CSV 로딩 담당)
	UI 없이 데이터만 다루는 계층 
	Streamlit과 분리하면 테스트/재사용이 쉬워집니다.
```python
# services/data_loader.py
"""
✅ 역할: 데이터 로딩(입력 데이터)만 담당
- Streamlit UI와 분리하는 이유:
  1) 나중에 CSV → API로 바뀌어도 UI 코드는 건드릴 필요가 없음
  2) 테스트가 쉬워짐 (pytest로 로더 함수만 테스트 가능)
"""

from __future__ import annotations
import pandas as pd


REQUIRED_COLUMNS = {"도시", "연도", "인구수"}


def load_population_csv(csv_path: str = "data/population.csv") -> pd.DataFrame:
    """
    population.csv를 읽어서 DataFrame 반환.
    - 필수 컬럼(도시/연도/인구수) 존재 여부를 검사
    - 연도/인구수는 숫자 타입으로 변환(가능한 범위에서)
    """
    df = pd.read_csv(csv_path)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"CSV에 필수 컬럼이 없습니다: {sorted(missing)}")

    # 타입 정리: (데이터가 문자열로 들어왔을 때를 대비)
    df["연도"] = pd.to_numeric(df["연도"], errors="coerce")
    df["인구수"] = pd.to_numeric(df["인구수"], errors="coerce")

    # NaN 제거(필수 값이 비어있으면 대시보드가 이상하게 동작하므로)
    df = df.dropna(subset=["도시", "연도", "인구수"]).copy()

    # 정수처럼 보이게 정리(필요시)
    df["연도"] = df["연도"].astype(int)
    # 인구수는 소수도 가능하게 float 유지해도 되지만, 기본은 float로 둠
    df["인구수"] = df["인구수"].astype(float)

    return df
```
---

`dashboard/widgets.py` (사이드바 위젯 담당)
	사이드바(입력 UI)만 모아두는 파일  
	입력과 출력이 분리되면 화면 관리가 편해져요.
```python
# dashboard/widgets.py
"""
✅ 역할: "입력(UI 위젯)"만 담당
- sidebar에 무엇을 보여줄지(연도, 도시, 임계치)를 여기서만 관리
"""

from __future__ import annotations
from dataclasses import dataclass
import streamlit as st
import pandas as pd


@dataclass(frozen=True)
class Filters:
    """사이드바에서 선택한 값들을 한 덩어리로 묶어서 전달하기 위한 구조"""
    year: int
    cities: list[str]
    warn_threshold: float


def build_sidebar_widgets(df: pd.DataFrame) -> Filters:
    """
    df를 보고 가능한 선택지(years/cities)를 만든 뒤
    Streamlit sidebar 위젯을 띄우고, 선택 결과를 Filters로 반환한다.
    """
    st.sidebar.header("🔎 필터")

    years = sorted(df["연도"].unique())
    cities = sorted(df["도시"].unique())

    selected_year = st.sidebar.selectbox("연도 선택", years)
    selected_cities = st.sidebar.multiselect(
        "도시 선택 (여러 개 가능)",
        options=cities,
        default=cities
    )

    # 관제 임계치(경고 기준)
    st.sidebar.divider()
    st.sidebar.header("🚨 관제 설정")

    warn_threshold = st.sidebar.number_input(
        "경고 임계치 (인구수 ≥ ? / 단위: 만 명)",
        min_value=0.0,
        max_value=10_000.0,
        value=500.0,   # 기본 500만명
        step=10.0
    )

    return Filters(
        year=int(selected_year),
        cities=list(selected_cities),
        warn_threshold=float(warn_threshold),
    )
```
---
`dashboard/layout.py` (페이지 설정 + 탭 생성)
	화면 뼈대(레이아웃)만 담당  
	app.py에서 흐름을 보기 쉽게 만들기 위한 분리입니다.
```python
# dashboard/layout.py
"""
✅ 역할: 화면의 "뼈대(레이아웃)"만 담당
- 페이지 설정(set_page_config)
- 탭 생성(tabs)

💡 왜 분리?
- app.py에서 UI 뼈대를 한 줄로 만들고 싶기 때문
- "탭을 몇 개 쓸지" 같은 레이아웃 정책은 여기서만 바꾸면 됨
"""

from __future__ import annotations
import streamlit as st


def setup_page() -> None:
    """페이지 공통 설정은 app 시작 초반에 딱 1번 호출"""
    st.set_page_config(
        page_title="도시 인구 대시보드",
        page_icon="🏙️",
        layout="wide",
    )


def create_tabs():
    """
    ✅ 탭 생성
    - app.py에서 tab 객체를 받아 views.py에 전달해 화면을 그림

    ✅ 4개 탭 버전
    - 데이터 / 차트비교 / 관제 / 지도
    """
    return st.tabs(["📑 데이터", "📈 차트(비교)", "🚨 관제", "🗺️ 지도"])
```
---
`dashboard/views.py` (탭별 화면 출력 담당)
	각 탭에서 무엇을 보여줄지만 모아둠  
	실제 서비스에서 가장 흔한 구조입니다.
```python
# dashboard/views.py
"""
✅ 역할: "출력(View)"만 담당
- 탭별로 어떤 화면을 그릴지 여기서만 관리
- app.py는 데이터를 준비해서 이 함수들을 호출하기만 함
"""

from __future__ import annotations
import streamlit as st
import pandas as pd


def render_data_tab(tab, df: pd.DataFrame, filtered: pd.DataFrame) -> None:
    with tab:
        st.subheader("📑 데이터 탭")

        with st.expander("원본 데이터 보기(펼치기)", expanded=False):
            st.dataframe(df, use_container_width=True)

        st.markdown("### 🎯 필터 결과 데이터")
        if filtered.empty:
            st.warning("선택한 조건에 해당하는 데이터가 없습니다. 사이드바 조건을 바꿔보세요.")
        else:
            st.dataframe(filtered, use_container_width=True)


def render_chart_tab(tab, filtered: pd.DataFrame) -> None:
    with tab:
        st.subheader("📈 차트 탭 (차트 + Metric)")

        if filtered.empty:
            st.info("표시할 데이터가 없습니다. 사이드바에서 도시를 선택해보세요.")
            return

        # ----------------------------
        # Metric(요약 지표)
        # ----------------------------
        total_pop = float(filtered["인구수"].sum())
        avg_pop = float(filtered["인구수"].mean())
        max_row = filtered.sort_values("인구수", ascending=False).iloc[0]

        st.markdown("### 📌 요약 지표 (Metric)")
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("총 인구(합)", f"{total_pop:,.0f} (만 명)")
        with col2:
            st.metric("평균 인구", f"{avg_pop:,.1f} (만 명)")
        with col3:
            st.metric("최대 도시", f"{max_row['도시']} ({max_row['인구수']:,.0f})")

        st.divider()

        # ----------------------------
        # Chart
        # ----------------------------
        chart_series = filtered.set_index("도시")["인구수"]

        st.markdown("### 📊 막대 차트 (도시별 인구 비교)")
        st.bar_chart(chart_series)

        st.markdown("### 📈 라인 차트 (도시별 인구를 선으로 보기)")
        st.line_chart(chart_series)

        st.caption("※ 현재는 '연도 1개'만 선택하므로 시간 추세 분석보다는 '도시 간 비교'용으로 봅니다.")


def render_monitor_tab(tab, filtered: pd.DataFrame, warn_threshold: float) -> None:
    with tab:
        st.subheader("🚨 관제(경고) 탭")

        if filtered.empty:
            st.info("데이터가 없습니다. 사이드바 필터(연도/도시)를 조정해보세요.")
            return

        # ✅ 임계치 이상만 경고 대상
        danger = filtered[filtered["인구수"] >= warn_threshold].copy()

        st.write(f"✅ 현재 경고 기준: 인구수 ≥ {warn_threshold} (만 명)")
        st.caption("관제 화면의 핵심은 '모든 데이터'가 아니라 '문제가 되는 것만 빠르게 추려 보여주기'입니다.")

        if danger.empty:
            st.success("✅ 현재 기준으로 경고 대상 도시가 없습니다.")
            return

        st.error(f"⚠️ 경고 대상 도시가 {len(danger)}개 있습니다. 아래 목록을 확인하세요.")

        danger = danger.sort_values("인구수", ascending=False)

        st.markdown("### 📋 경고 대상 목록")
        st.dataframe(danger, use_container_width=True)

        st.markdown("### 🔥 우선 확인 TOP 3")
        top3 = danger.head(3)
        st.table(top3[["도시", "연도", "인구수"]])

        st.markdown("### 📌 관제 요약")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("경고 도시 수", f"{len(danger)}개")
        with col2:
            st.metric("최대 인구(경고 중)", f"{danger['인구수'].max():,.0f}")
        with col3:
            st.metric("평균 인구(경고 중)", f"{danger['인구수'].mean():,.1f}")
            
            
# =========================================================
# ✅ [추가 코드] 시각화 비교용(View 확장)
# - Streamlit 기본 vs Matplotlib vs Plotly
# - Folium 지도(관제 대상 도시 마커)
# =========================================================

def render_chart_tab_compare(tab, filtered: pd.DataFrame) -> None:
    """
    ✅ 같은 데이터(filtered)로 차트를 3가지 방식으로 비교:
    1) Streamlit 기본(st.bar_chart / st.line_chart)
    2) Matplotlib
    3) Plotly
    """
    with tab:
        st.subheader("📈 차트 탭 (비교: Streamlit vs Matplotlib vs Plotly)")

        if filtered.empty:
            st.info("표시할 데이터가 없습니다. 사이드바에서 도시를 선택해보세요.")
            return

        # ----------------------------
        # 0) 공통: Metric(요약 지표)
        # ----------------------------
        total_pop = float(filtered["인구수"].sum())
        avg_pop = float(filtered["인구수"].mean())
        max_row = filtered.sort_values("인구수", ascending=False).iloc[0]

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("총 인구(합)", f"{total_pop:,.0f} (만 명)")
        with col2:
            st.metric("평균 인구", f"{avg_pop:,.1f} (만 명)")
        with col3:
            st.metric("최대 도시", f"{max_row['도시']} ({max_row['인구수']:,.0f})")

        st.divider()

        # ----------------------------
        # 1) 비교 모드 선택
        # ----------------------------
        mode = st.radio(
            "시각화 방식 선택",
            ["Streamlit 기본", "Matplotlib", "Plotly"],
            horizontal=True,
        )

        # ----------------------------
        # 2) 차트용 데이터(공통)
        # - 막대/라인 모두 동일한 데이터로 비교해야 "차이"가 보임
        # ----------------------------
        chart_df = (
            filtered[["도시", "인구수"]]
            .groupby("도시", as_index=False)["인구수"]
            .sum()
            .sort_values("인구수", ascending=False)
        )
        series = chart_df.set_index("도시")["인구수"]

        # ----------------------------
        # 3) Streamlit 기본
        # ----------------------------
        if mode == "Streamlit 기본":
            st.markdown("### 📊 막대 차트 (Streamlit)")
            st.bar_chart(series)

            st.markdown("### 📈 라인 차트 (Streamlit)")
            st.line_chart(series)

        # ----------------------------
        # 4) Matplotlib
        # ----------------------------
        elif mode == "Matplotlib":
            try:
                import matplotlib.pyplot as plt
            except ImportError:
                st.error("matplotlib이 설치되어 있지 않습니다. `uv pip install matplotlib` 실행하세요.")
                return

            st.markdown("### 📊 막대 차트 (Matplotlib)")
            fig1, ax1 = plt.subplots()
            ax1.bar(chart_df["도시"], chart_df["인구수"])
            ax1.set_xlabel("도시")
            ax1.set_ylabel("인구수(만 명)")
            ax1.set_title("도시별 인구 비교 (Matplotlib)")
            st.pyplot(fig1)

            st.markdown("### 📈 라인 차트 (Matplotlib)")
            fig2, ax2 = plt.subplots()
            ax2.plot(chart_df["도시"], chart_df["인구수"], marker="o")
            ax2.set_xlabel("도시")
            ax2.set_ylabel("인구수(만 명)")
            ax2.set_title("도시별 인구 비교 (Matplotlib)")
            st.pyplot(fig2)

        # ----------------------------
        # 5) Plotly
        # ----------------------------
        else:  # mode == "Plotly"
            try:
                import plotly.express as px
            except ImportError:
                st.error("plotly가 설치되어 있지 않습니다. `uv pip install plotly` 실행하세요.")
                return

            st.markdown("### 📊 막대 차트 (Plotly)")
            fig_bar = px.bar(chart_df, x="도시", y="인구수", title="도시별 인구 비교 (Plotly)")
            st.plotly_chart(fig_bar, use_container_width=True)

            st.markdown("### 📈 라인 차트 (Plotly)")
            fig_line = px.line(chart_df, x="도시", y="인구수", markers=True, title="도시별 인구 비교 (Plotly)")
            st.plotly_chart(fig_line, use_container_width=True)

        st.caption("✅ 같은 데이터로 3가지 라이브러리의 표현 방식 차이를 비교합니다.")


def render_map_tab_folium(tab, filtered: pd.DataFrame, warn_threshold: float) -> None:
    """
    ✅ Folium 지도 탭:
    - filtered 중 warn_threshold 이상(경고 대상) 도시만 지도에 마커 표시
    - 좌표는 예시용(하드코딩)이며, 실무에서는 DB/API로 대체
    """
    with tab:
        st.subheader("🗺️ 지도 탭 (Folium 관제)")

        if filtered.empty:
            st.info("데이터가 없습니다. 사이드바 조건을 바꿔보세요.")
            return

        # 경고 대상만 추림
        danger = filtered[filtered["인구수"] >= warn_threshold].copy()

        st.write(f"✅ 지도 표시 기준: 인구수 ≥ {warn_threshold} (만 명)")
        if danger.empty:
            st.success("✅ 현재 기준으로 지도에 표시할 경고 도시가 없습니다.")
            return

        # ✅ 예시 좌표(실무에서는 좌표 데이터 테이블/API 필요)
        CITY_COORDS = {
            "서울": (37.5665, 126.9780),
            "부산": (35.1796, 129.0756),
            "대구": (35.8714, 128.6014),
            "제주": (33.4996, 126.5312),
        }

        # streamlit-folium 필요
        try:
            import folium
            from streamlit_folium import st_folium
        except ImportError:
            st.error("folium/streamlit-folium이 필요합니다. `uv pip install folium streamlit-folium` 실행하세요.")
            return

        # 지도 중심: 경고 도시 첫 번째 좌표 또는 서울(기본)
        first_city = danger["도시"].iloc[0]
        center = CITY_COORDS.get(first_city, (37.5665, 126.9780))

        m = folium.Map(location=center, zoom_start=6)

        # 마커 추가
        missing_coords = []
        for _, row in danger.iterrows():
            city = row["도시"]
            pop = row["인구수"]
            coord = CITY_COORDS.get(city)

            if not coord:
                missing_coords.append(city)
                continue

            # 경고 느낌(빨간 마커)
            folium.Marker(
                location=coord,
                popup=f"{city} / {int(row['연도'])} / {pop:,.0f}만",
                tooltip=f"⚠️ {city}: {pop:,.0f}만",
                icon=folium.Icon(color="red", icon="info-sign"),
            ).add_to(m)

        st_folium(m, width=900, height=520)

        if missing_coords:
            st.warning(f"⚠️ 좌표가 없어 지도에 못 찍은 도시: {sorted(set(missing_coords))}")

        st.caption("✅ 관제(경고) 대상 도시만 지도에 표시했습니다. (Folium)")

```

app.py에서 호출을 이렇게 바꿔주세요
```python
# app.py에서 import 추가
from dashboard.views import (
    render_data_tab,
    render_chart_tab,            # 기존
    render_monitor_tab,
    render_chart_tab_compare,    # ✅ 추가
    render_map_tab_folium        # ✅ 추가
)

# 탭 4개 받기
tab_data, tab_chart, tab_monitor, tab_map = create_tabs()

# 기존 대신 비교 버전 호출(원하면)
render_data_tab(tab_data, df, filtered)

# ✅ 기존 차트 대신 비교 차트 호출
render_chart_tab_compare(tab_chart, filtered)

render_monitor_tab(tab_monitor, filtered, filters.warn_threshold)

# ✅ folium 지도 탭
render_map_tab_folium(tab_map, filtered, filters.warn_threshold)
```

---
`dashboard/state.py` (선택: 세션 상태 유틸)
	지금 단계에서는 필수는 아님  
	나중에 기본 선택값 기억, 버튼 클릭 상태 유지 등에 씁니다.
```python
# dashboard/state.py
"""
✅ 역할(선택): session_state 기본값 관리
- Streamlit은 위젯이 바뀌면 코드가 재실행됩니다.
- 재실행될 때도 유지되어야 하는 값이 있다면 session_state를 씁니다.
"""

from __future__ import annotations
import streamlit as st


def init_state_defaults() -> None:
    """
    세션에 기본값이 없으면 넣어주는 유틸.
    (지금 프로젝트에서는 꼭 필요하진 않지만, 확장 대비)
    """
    if "debug" not in st.session_state:
        st.session_state["debug"] = False
```

---
`app.py` - 조립만 하는 진짜 진입점
	app.py는 이제 조립자 역할만 합니다.  
	그래서 읽기 쉬워지고 흐름이 한 눈에 보입니다.

```python
# app.py
"""
✅ 역할: "조립(Orchestration)"만 담당 (가장 바람직한 구조)
- 데이터 로드(services)
- 위젯 입력(dashboard/widgets)
- 처리(filtered 생성)
- 레이아웃/탭 생성(dashboard/layout)
- 탭별 화면 출력(dashboard/views)

📌 핵심 철학 (실무 구조)
1) app.py는 "흐름만" 보이게 (읽기 쉬움)
2) 데이터 로직은 services로 (테스트 가능)
3) 화면 출력은 views로 (UI만 수정 가능)
4) 입력 위젯은 widgets로 (사이드바 UX 관리)
"""

from __future__ import annotations

import streamlit as st

from services.data_loader import load_population_csv
from dashboard.layout import setup_page, create_tabs
from dashboard.widgets import build_sidebar_widgets
from dashboard.state import init_state_defaults
from dashboard.views import (
    render_data_tab,
    render_chart_tab_compare,   # ✅ 차트 비교 버전 사용
    render_monitor_tab,
    render_map_tab_folium,      # ✅ 지도 탭
)


def main() -> None:
    # =====================================================
    # 0) "앱 시작 시 1번만" 해야 하는 초기 설정들
    # =====================================================
    # ✅ (1) 페이지 설정: 브라우저 탭 제목/아이콘/레이아웃 등 (딱 1번)
    setup_page()

    # ✅ (2) 세션 상태 기본값 세팅(선택)
    # - Streamlit은 위젯 변경 시 스크립트가 재실행됨
    # - 재실행돼도 유지돼야 하는 값이 있으면 session_state에 둠
    init_state_defaults()

    # =====================================================
    # 1) 상단 타이틀 / 설명
    # =====================================================
    st.title("🏙️ 대한민국 도시 인구 대시보드")
    st.write("✅ 최종본: 사이드바 필터 + 탭 + 차트/Metric + 임계치 관제 + 지도(Folium)")

    # =====================================================
    # 2) 데이터 로드 (UI와 분리된 services 계층)
    # =====================================================
    # ✅ 여기서 CSV → DataFrame 변환 + 컬럼검증 + 타입정리
    # - UI 코드(app.py)가 CSV 구조에 덜 의존하게 됨
    df = load_population_csv("data/population.csv")

    # =====================================================
    # 3) 입력(UI) : 사이드바 위젯
    # =====================================================
    # ✅ 사용자 입력(연도/도시/임계치)을 Filters로 묶어서 받음
    # - 이 덩어리 하나만 들고 다니면 app.py가 매우 깔끔해짐
    filters = build_sidebar_widgets(df)

    # =====================================================
    # 4) 처리(Processing) : 필터링
    # =====================================================
    # ✅ "입력 → 처리 → 출력" 패턴의 처리 단계
    # - 필터링은 딱 1번만 하고 결과(filtered)를 탭마다 재사용 (중요!)
    filtered = df[
        (df["연도"] == filters.year) &
        (df["도시"].isin(filters.cities))
    ].copy()

    # 현재 상태 표시(관제/대시보드에서는 '현재 기준' 표시가 중요)
    st.caption(
        f"현재 선택: 연도={filters.year} | 도시={len(filters.cities)}개 | "
        f"경고 임계치={filters.warn_threshold:,.0f}+ (만 명)"
    )

    # =====================================================
    # 5) 레이아웃 : 탭 생성
    # =====================================================
    tab_data, tab_chart, tab_monitor, tab_map = create_tabs()

    # =====================================================
    # 6) 출력(View) : 탭별 화면 그리기
    # =====================================================
    # ✅ 탭별로 "무엇을 보여줄지"는 views.py에만 존재
    render_data_tab(tab_data, df, filtered)

    # ✅ 기존 차트 탭 대신 "비교 차트" 탭 사용
    render_chart_tab_compare(tab_chart, filtered)

    # ✅ 관제 탭: 임계치 기반 위험 도시 필터링
    render_monitor_tab(tab_monitor, filtered, filters.warn_threshold)

    # ✅ 지도 탭: 경고 대상만 folium 지도에 마커 표시
    render_map_tab_folium(tab_map, filtered, filters.warn_threshold)


if __name__ == "__main__":
    main()
```


---------------=-==========

실행:
```bash
uv run streamlit run app.py
```

---

## tests/test_data_loader.py (단위 테스트)
	Streamlit 없이도 CSV 로딩 함수가 동작하는지 검증합니다.

pytest 설치
```bash
uv pip install pytest
```

`tests/test_data_loader.py`
```python
# tests/test_data_loader.py
import pandas as pd
import pytest
from services.data_loader import load_population_csv


def test_load_population_csv_has_required_columns(tmp_path):
    # 임시 CSV 생성
    csv = tmp_path / "population.csv"
    csv.write_text(
        "도시,연도,인구수\n서울,2022,950\n부산,2022,330\n",
        encoding="utf-8"
    )

    df = load_population_csv(str(csv))
    assert set(["도시", "연도", "인구수"]).issubset(df.columns)
    assert len(df) == 2


def test_load_population_csv_missing_columns(tmp_path):
    csv = tmp_path / "bad.csv"
    csv.write_text("도시,연도\n서울,2022\n", encoding="utf-8")

    with pytest.raises(ValueError):
        load_population_csv(str(csv))
```

테스트 실행
```bash
uv run pytest
```

성공메시지
```
===================================== test session starts =======================
platform linux -- Python 3.12.3, pytest-9.0.2, pluggy-1.6.0
rootdir: /home/youjung/streamlit_dashboard_day
configfile: pyproject.toml
collected 2 items                                                                              

tests/test_data_loader.py ..                                                             [100%]

====================================== 2 passed in 0.26s ========================
```

전체 실행
```bash
uv run streamlit run app.py
```

---
## GitHub 연동 & requirements / README 정리

### 시작 전 체크

현재 프로젝트 위치 확인
```bash
cd ~/streamlit_dashboard_day
pwd
ls
```

`.venv/`는 Git에 올리지 않기
	`.venv`를 올리면 레포가 너무 커지고, 배포도 꼬입니다.

`.gitignore` 만들기/추가
```bash
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
*.log

# Virtual env
.venv/
venv/

# OS/Editor
.DS_Store
.vscode/

# Streamlit
.streamlit/secrets.toml

# Test cache
.pytest_cache/
EOF
```
---
### requirements.txt / README.md 준비 (배포/협업의 기본)

위쪽에서 처음에 requirements.txt 만들었지만 최종본으로 다시 생성합니다.
	Streamlit Cloud는 보통 `requirements.txt`를 읽습니다.
```bash
uv pip freeze > requirements.txt
```

확인:
```bash
cat requirements.txt
```

README.md 최소 문서 작성
```bash
## 8교시 (약 1시간) — Streamlit Cloud 배포 & 최종 점검

**목표**

- 실제 URL이 나오는 “배포 경험”을 제공
- 친구/지인에게 공유할 수 있는 수준까지

**내용**

1. [streamlit.io](<https://streamlit.io>) / Streamlit Cloud 접속, GitHub 연동
2. “New app” → 레포 선택 → `app.py` 지정 → 배포
3. 배포된 URL 접속해 실제 동작 확인
4. 작은 버그 수정 → 커밋 → Push → 자동 재배포 체험
5. 마지막에 학생 각자:
   - 내 서비스 URL
   - 스크린샷 2~3장
   - “내가 구현한 기능 한 줄 소개” 정리

---

# 3. 요약 – 오늘 하루에 쌓이는 것

| 항목 | 경험 |
|------|------|
| UI 구성 | Column / Tab / Sidebar로 화면짜기 |
| 데이터 | CSV → pandas → Streamlit 표/차트 |
| 인터랙션 | 위젯으로 필터링/정렬 |
| 구조화 | 파일/모듈 분리, 간단한 테스트 |
| 협업/배포 | GitHub 업로드, Streamlit Cloud 배포 |

---

이게 **하루(8시간) 기준 “큰 뼈대”**입니다.
다음 질문에서,

- `app.py` 전체 예시,
- `data_loader.py`,
- `layout.py / views.py`
같이 **파일별 상세 코드**를 단계별로 풀어줄게요 😊
```

---
깃허브 전체 흐름 요약
1️⃣ GitHub에서 빈 레포 생성  
2️⃣ 로컬 프로젝트를 Git 레포로 초기화  
3️⃣ GitHub 레포와 remote 연결  
4️⃣ `main` 브랜치로 첫 push  
5️⃣ (선택) 기능 브랜치 → PR → Merge  

---
## GitHub에서 레포지토리 생성 (웹에서 먼저)

###### GitHub 접속 → New repository
| 항목                     | 값                            |
| ---------------------- | ---------------------------- |
| Repository name        | `streamlit-dashboard-day`    |
| Public / Private       | Public (수업/포트폴리오면 Public 권장) |
| Initialize with README | ❌ 체크하지 말 것                   |
| Add .gitignore         | ❌                            |
| License                | ❌                            |

레포 생성 완료 후 주소 복사: 각자의 깃허브 사이트에서 확인합니다.
```bash
https://github.com/<username>/streamlit-dashboard-day.git
```

로컬 프로젝트를 Git 레포로 만들기 (여기서 git init)
	이제 로컬 터미널(WSL) 로 돌아옵니다.

프로젝트 폴더로 이동
```bash
cd ~/streamlit_dashboard_day
```

확인:
```bash
pwd
ls
```

Git 초기 설정(딱 한 번만)
(이미 init 되어 있다면 생략 가능)
```bash
git init
```

.gitignore 확인 (중요)
`.venv/` 같은 게 올라가면 안 됩니다.
```bash
cat .gitignore
```

첫 커밋 만들기 (아직 GitHub랑 연결 ❌)
```bash
git status
```
	→ app.py, dashboard/, services/, requirements.txt, README.md 등이 보이면 정상

스테이징 + 커밋
```bash
git add .
git commit -m "Initial Streamlit dashboard (Step 1~6 complete)"
```
👉 아직 GitHub로 안 올라감  
👉 그냥 로컬 Git 기록만 만든 상태

GitHub 레포와 연결 (remote add origin)
	이제 아까 복사해 둔 GitHub 주소를 사용합니다.
remote 등록
```bash
git remote add origin https://github.com/eunice-bootcamp-team2/Streamlit10.git
```

연결 확인
```bash
git remote -v
```

정상 출력 예:
```bash
origin  https://github.com/username/streamlit-dashboard-day.git (fetch)
origin  https://github.com/username/streamlit-dashboard-day.git (push)
```

main 브랜치로 첫 push : 브랜치 이름을 main으로 맞추기
```bash
git branch -M main
```

첫 push (⭐ 여기서 처음 GitHub에 올라감)
```bash
git push -u origin main
```
이제서야 GitHub 레포에 코드가 생깁니다

확인:
- GitHub 페이지 새로고침
- 파일 구조가 보이면 성공
---
## 협업 — Pull Request
	수업/팀 프로젝트라면 이 단계가 매우 중요
	목적: main에 바로 push하지 않고,feature 브랜치에서 작업 → PR로 요청 → 리뷰 → merge
	하는 실무 표준 흐름을 경험한다.

PR 하기 전에 꼭 확인할 것 (main 최신화)
지금 내가 main인지 확인
```bash
git branch
```
- `* main` 이면 OK
- `* feature/...`면 main으로 이동 후 최신화부터

main으로 이동 + 최신화
```bash
git checkout main
git pull origin main
```
	팀 프로젝트에서는 항상 작업 시작 전 main 최신화가 기본 습관입니다.


기능 브랜치 생성 (feature 브랜치)
브랜치 이름 규칙 예시:
- `feature/layout-improve`
- `feature/monitor-threshold`
- `fix/chart-bug`
- `docs/readme-update`

브랜치 생성 + 이동
```bash
git checkout -b feature/layout-improve
```

브랜치 확인
```bash
git branch
```
`* feature/layout-improve` 로 표시되면 성공

브랜치에서 코드 수정
	예시로 “UI 문구 개선” 또는 “관제 임계치 기본값 추가” 같은 작은 변경 1개를 합니다.

변경 파일 확인(변경 전)
```bash
git status
```

코드 수정 : VSCode에서 수정
```bash
아무 파일이나 열어서 주석문을 간략히 수정해본다.
```

변경 내용 확인
```bash
git diff
```

코드 수정 후 커밋
```bash
git add .  # 스테이징(add)
git commit -am "Improve layout with tabs and sidebar"  # 커밋(commit)
```


원격 브랜치로 push (PR 만들려면 꼭 필요)
	브랜치 push (처음 한 번은 -u 권장)
```bash
git push -u origin feature/layout-improve
```
	성공하면 GitHub에 feature/layout-improve 브랜치가 생깁니다.

GitHub에서 PR 만들기 (웹)

PR 생성 화면으로 이동
GitHub 레포 접속하면 상단에 이런 버튼이 뜰 수 있어요:
- Compare & pull request → 클릭
    
없다면:
- 상단 메뉴 Pull requests → New pull request
    

PR 설정(중요)
- base: `main`
- compare: `feature/layout-improve`
    
✅ 이 설정이 “내 브랜치 변경사항을 main에 반영해달라”는 뜻입니다.

PR 제목/본문 작성(템플릿)
제목 예시
- `Improve layout and sidebar UX`
- `Add monitor threshold and warnings`
- `Fix chart rendering when empty`
	

본문 템플릿
```txt
## 변경 내용 
- 탭 이름을 더 명확하게 수정 
- 사이드바 안내 문구 추가  
    
## 테스트 
- [ ] uv run streamlit run app.py로 화면 확인 
- [ ] uv run pytest 통과  
      
## 스크린샷(선택)
- (탭 화면 캡처 1장)
```

![[Pasted image 20251222213449.png]]

지금 보고 있는 화면의 정체
이 화면은 GitHub Pull Request(PR) 생성 화면입니다.
- **base: `main`** ← 최종으로 합쳐질 브랜치
- **compare: `feature/layout-improve`** ← 내가 작업한 브랜치
- 위에 `Able to merge` 초록 표시 → 충돌 없이 병합 가능

Create pull request 녹색 버튼을 클릭하여 병합합니다.

---
Reviewer 지정이란?
	이 PR을 누가 리뷰(코드 확인)할 것인지 지정하는 기능

- 실무/팀 프로젝트에서는:
    - 코드 작성자 ≠ 코드 확인자
    - 리뷰어가 코드 보고:
        - “이거 OK”
        - “여기 수정 필요”
- 이런 과정을 거칩니다.

---
이미지 기준으로 “어디를 눌러야 하나?”

1️⃣ 화면 오른쪽 사이드바를 봅니다
이미지 오른쪽에 이런 섹션들이 보일 거예요:
- Reviewers
- Assignees
- Labels
- Projects
- Milestone
우리가 보는 건 **Reviewers** 입니다.

![[Pasted image 20251222213710.png]]

---
2️⃣ `Reviewers` 영역 확인

이미지에서 보이는 상태 👇
```
Reviewers
Noreviews
(⚙️ 아이콘)
```

👉 아직 아무도 리뷰어로 지정되지 않은 상태입니다.

---
3️⃣ Reviewer 추가하는 방법 (팀원이 있을 때)
1. Reviewers 옆의 ⚙️(톱니바퀴)클릭
2. 레포지토리에 접근 권한이 있는 팀원 목록이 뜸
3. 리뷰를 맡길 사람 클릭
4. 선택 즉시 Reviewer로 추가됨

📌 그러면:
- 그 사람에게 PR 리뷰 요청 알림이 감
- PR 화면에 그 사람이 Reviewer로 표시됨

---
팀원을 추가하는 방법:
	이 레포지토리에 collaborator(협업자)가 아무도 없습니다.

🔹 전제 조건
- 레포지토리 Owner(소유자) 이거나
- 관리 권한(Admin) 이 있어야 합니다  
    (본인 레포라면 당연히 OK)

---
🧭 1단계: 레포지토리 Settings로 이동
1. GitHub 레포지토리 메인 화면으로 이동
2. 상단 메뉴에서 **`Settings`** 클릭

> ⚠️ 개인 계정 레포라면 Settings 메뉴가 보입니다
> 조직 레포라도 권한 있으면 보입니다

---
🧭 2단계: Collaborators 메뉴 들어가기

Settings 왼쪽 사이드바에서:
```
Access
└── Collaborators
```
클릭하면 아래 화면처럼 보입니다.

![[Pasted image 20251222214711.png]]

---
🧭 3단계: 팀원 초대하기
1. **`Add people`** 버튼 클릭
2. 초대할 사람의:
    - GitHub **아이디(username)**
    - 또는 **이메일**
3. 선택 → **Add / Invite**

📌 이때 권한은 보통:
- `Write` → 리뷰 & PR 가능 (추천)
- `Read` → 리뷰만 가능
- `Admin` → 관리까지 가능
👉 수업/팀 프로젝트면 **Write 권한**이면 충분

---
🧭 4단계: 팀원이 초대 수락

- 초대된 사람에게 GitHub 알림 또는 이메일이 감
- Accept invitation 클릭해야 실제로 추가됨
⚠️ 수락 전까지는 Reviewer 목록에 안 보임

---
🧭 5단계: 다시 PR 화면으로 돌아가기
이제 다시 PR 화면으로 와서:
1. `Reviewers` → ⚙️ 클릭
2. 아까 초대한 팀원이 목록에 등장
3. 클릭 → Reviewer 지정 완료 🎉

---
🔁 흐름 요약 (한 줄로)
	Reviewer는 먼저 Collaborator로 초대 → 초대 수락 → PR에서 선택해야 보인다.
🤔 지금 팀원이 아직 없으니 팀을 짜면 이대로 진행하시기 바랍니다.

----
### 코드 리뷰(Reviewer가 하는 일) — “어떻게 작업하는지” 상세

리뷰어가 보는 위치
- PR 페이지 → Fix chart rendering when empty 제목을 클릭
- Files changed 탭 클릭
![[Pasted image 20251222215335.png]]
Files changed 탭의 역할
`Files changed` 탭을 누르면 👇
- 어떤 파일이 바뀌었는지
- 어떤 줄이 추가(+ 초록) / 삭제(- 빨강)됐는지
- 리뷰어가 코드에 코멘트 달 수 있는 화면
    
즉 👉 리뷰어가 실제로 코드를 보는 핵심 공간


코멘트 다는 방법 3가지
A) 라인 코멘트(가장 중요)
- 코드 줄 번호 옆 `+` 클릭 → 코멘트 작성 → **Add single comment**

예시 코멘트:
- “이 변수명은 `selected_year`보다 `year`가 더 간단해요.”
- “빈 데이터 처리 if 문이 여기에도 필요해 보입니다.”

B) 제안(Suggestion) 코멘트(실무 느낌)
- 코멘트 박스에서 “Insert a suggestion” 사용 가능
- 예: 문자열 문구나 작은 코드 개선 제안

C) Review 요약(Approve / Request changes)
- Files changed 화면 상단 또는 Review 버튼 → Submit review
    - Approve: 문제 없음 → merge 가능
    - Request changes: 수정 요청(merge 막힘)
    - Comment: 그냥 의견
![[Pasted image 20251222215547.png]]

![[Pasted image 20251222220354.png]]

---
리뷰 반영(작성자가 하는 일) — 수정 → 다시 push → 리뷰 재확인
리뷰에서 “수정 요청”을 받았다고 가정.

로컬로 돌아와 수정
```bash
# 현재 브랜치 확인
git branch
```
	`feature/layout-improve` 이어야 함.

수정 후: 다시 커밋
```bash
git add .
git commit -m"Apply review feedback: rename variables and handle empty state"
```

다시 push
```bash
git push
```
	PR은 자동으로 업데이트됩니다.
	PR 페이지 새로고침하면 변경사항이 반영된 상태로 보입니다.

---
### PR Merge (승인 후 main에 합치기)

Merge 전에 최종 확인
- PR 페이지에서:
    - ✅ checks 통과(있다면)
    - ✅ 리뷰 승인(Approve)
    - ✅ 충돌(conflict) 없음

Merge 방식 선택(권장)
- Squash and merge 권장 (실습/교육용 베스트)
    - 브랜치 커밋 여러 개를 main에 1개 커밋으로 합침
    - main 히스토리가 깔끔해짐

Merge 버튼 클릭
- Merge pull request → Confirm
![[Pasted image 20251222220547.png]]

---
### Merge 후 필수 정리 (로컬/원격 브랜치 정리까지) 
이건 왜하는지 모르겠어. 추가 설명을 넣어야해

main으로 이동 + 최신화
```bash
git checkout main
git pull origin main
```

로컬 브랜치 삭제
```bash
git branch -d feature/layout-improve
```

원격 브랜치 삭제(선택, 하지만 보통 함)
```bash
git push origin --delete feature/layout-improve
```

---
“2인 1조 실습” 운영 시나리오
- A: feature 브랜치에서 수정하고 PR 생성
- B: 리뷰어로 라인 코멘트 2개 + Approve/Request changes
- A: 수정 반영 후 push
- B: Approve
- A 또는 B: Squash merge
- 둘 다: main pull 받고 브랜치 삭제

---
### 자주 터지는 실수 TOP 3 (미리 차단)

main에서 작업해버림
```bash
git branch
```
	항상 feature 브랜치인지 확인하고 시작

push를 안 해서 PR 브랜치가 GitHub에 없음
```bash
git push -u origin feature/xxx
```

commit -am만 쓰다가 새 파일 누락
```bash
git add .
git commit -m"..."
```


