오늘 수업을 한 문장으로
> 외부 데이터(API/CSV)를 받아서 DataFrame으로 만들고, 기준(임계치)으로 위험만 골라서 화면에 보여주는 ‘관제 화면’의 최소형을 만든다.

목표
- API가 뭔지 감으로 이해하기
    - 웹 브라우저 대신 파이썬이 서버에 요청을 보내는 것
- JSON 응답 구조를 보고 필요한 데이터 위치 찾기
- pandas.DataFrame으로 변환해서 표처럼 다루기

데이터 가져오기 → 파싱 → UI 표시 → 필터링/색상 표시 → 실시간 갱신

### 왜 이걸 해야 하나?

`1)` 데이터가 들어오는 서비스를 만들려면 필수다
	게시판/CRUD만 만들면 내 DB 안에서만 놀아요.  
하지만 실무 서비스는 거의 항상:
- 외부 API(날씨/결제/지도/공공데이터)
- 파일(CSV/엑셀)
- 센서/로그 같은 스트림 데이터를 불러와서 화면에 보여주고 판단합니다.
    

`2)` 관제(모니터링)는 전체를 다 보여주는 UI가 아니다
관제는 보통:
- 정상은 넘기고
- 이상만 강조해서
- 우선순위를 정해서 사람이 판단하게 만들어야 합니다.
    
그래서 오늘 핵심은:
> 데이터(DataFrame) + 기준(임계치) = 위험 목록

`3)` API가 항상 성공한다 라고 가정하면 운영 불가능합니다.

실무에서는 API가 자주 실패합니다. 예를 들어
- 인증키 만료/오입력
- 서버 장애(점검, 과부하)
- 응답 형식 변경(JSON → XML/HTML)
- 네트워크/타임아웃 문제가 흔하게 발생합니다.
    
그래서 에러가 발생해도 앱이 멈추지 않도록, 에러 상황을 사용자에게 이해하기 쉬운 UI 메시지로 안내하는 방어 코드까지 구현해야 완성입니다.

`4)` 이후 확장(저장/알림/자동갱신)의 기반이 됩니다.
	오늘 만든 구조는 그대로 다음 단계 기능으로 확장됩니다:
		- CSV 파일 데이터를 데이터베이스(DB)에 저장
		- 특정 수치가 기준을 넘으면 알림 전송 (Slack / Discord 등)
		- 일정 시간마다 데이터를 다시 불러오는 자동 갱신 구조 (캐시 / TTL 적용)
    
👉 즉, 오늘 만든 흐름은 실무 관제·대시보드의 출발점이 됩니다.

---

오늘의 흐름
	데이터 가져오기→파싱→DataFrame 변환→UI 표시→필터링→차트→탐색(필터/정렬)

이 흐름 하나만 몸에 들어오면, DRF/FastAPI 응답도 같은 방식으로 다룰 수 있어요.

---
### 외부 API 불러오기 기본

실습 환경 준비
> uv는 이미 설치되어 있다고 가정합니다.  
> uv는 컴퓨터(WSL)에 한 번만 설치하면 되며,  
> 실습이나 프로젝트마다 중복 설치할 필요는 없습니다.

uv 설치 여부 확인
```bash
uv --version
```
	✅ 설치되어 있는 경우: uv 0.x.x
	❌ 설치되어 있지 않은 경우 : command not found: uv
	uv는 컴퓨터(WSL)에 한 번만 설치하고, 프로젝트마다 .venv 가상환경만 새로 만든다.
- `uv` 자체를 매번 설치 ❌  
- 프로젝트용 가상환경을 매번 생성 ⭕

디렉토리 구조
```
day9_api/                 # 오늘 실습 전체 폴더 (프로젝트 루트)
├─ .venv/                 # uv venv로 만든 가상환경 폴더
├─ seoul_air_api.py       # 서울시 미세먼지 API 호출 + JSON 파싱 + DataFrame + 필터링 메인 스크립트
├─ browser_json.py        # JSONPlaceholder 예제로 "브라우저 vs requests" 비교용 연습 코드
├─ secrets_example.py     # (선택) API_KEY를 코드 밖에서 관리하는 예시 파일
├─ data/                  # (선택) 내려받은 데이터 저장용 폴더
│  ├─ raw/                # 원본 JSON/CSV 저장
└─ └─ processed/          # 전처리·필터링된 CSV/파켓 등

```

실습 준비 – 폴더 & 가상환경 만들기
```bash
# 1) 오늘 실습용 폴더 만들기
mkdir day9_api
cd day9_api

# 2) 가상환경 생성 (파이썬 3 기준)
uv venv

# 3) 가상환경 활성화
source .venv/bin/activate
# (프롬프트 앞에 (venv) 가 보이면 성공)
which python # 가상환경 경로가 맞는지 경로확인
```
이 시점부터는 이 프로젝트 전용 파이썬 환경에서 작업 중 상태입니다.

필요한 라이브러리 설치
```bash
uv pip install requests pandas
```
가상환경을 사용하므로 이 설치는 이 프로젝트에서만 유효합니다.

설치 확인:
```bash
uv pip list
```
아래 항목이 보이면 정상입니다:
- `requests`
- `pandas`

---
### 파일 만들기
- `seoul_air_api.py` : 서울시 OpenAPI에 요청 보내는 메인 실습 파일
- `secrets_example.py` : API KEY를 코드 밖에서 관리하는 예시용 파일

메인 파일 만들기
```bash
code seoul_air_api.py
```
	VSCode가 열리면 아래 코드를 그대로 붙여넣습니다.

---
### 1단계 – “API에 요청 보내기”만 먼저 성공해 보기

🎯 목표는 딱 2개입니다.
1. 파이썬이 서버에 요청을 보낼 수 있다
2. 서버가 준 응답을 문자열(text)로 확인할 수 있다
    
> 아직 데이터를 분석하는 단계가 아니고, 요청/응답이 되는지 감 잡는 단계입니다.

`seoul_air_api.py` (1차 버전)
```python
import requests

# ✅ 1) 서울시 미세먼지 API 기본 URL (예시)
# - API_KEY가 없거나 틀리면: 서울시 서버가 "XML 에러 메시지"를 내려줄 수 있습니다.
API_KEY = "여기에_본인_API_키_문자열_붙이기"

# ✅ URL 구성
# 1/5/ 는 "1번째부터 5개까지 가져와라" 같은 의미로 생각하면 됩니다.
url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/airQualityAPI/1/5/"

# ✅ 2) 서버에 GET 요청 보내기
# - timeout을 넣으면 서버가 응답이 없을 때 무한 대기하지 않습니다.
response = requests.get(url, timeout=10)

# ✅ 3) 상태 코드 확인
print("HTTP Status Code:", response.status_code)

# ✅ 4) 서버가 준 응답 원문(text) 일부 출력
print("\n응답 내용 (앞부분만):")
print(response.text[:300])

# ✅ 5) 응답이 JSON인지 XML인지 힌트 확인(중요)
print("\nContent-Type:", response.headers.get("Content-Type"))
```

의사코드
```python
1. requests 라는 웹요청 도구를 불러온다.

2. 사용할 API 키를 문자열로 준비한다.
   - 이 키는 나는 인증된 사용자입니다 라고 증명하는 열쇠 역할이다.

3. 서울시 미세먼지 API 주소를 만든다.
   - 기본 도메인: openapi.seoul.go.kr:8088
   - 중간에 API_KEY를 끼워 넣는다.
   - 응답 형식은 json 으로 요청한다.
   - 데이터 종류는 airQualityAPI 이다.
   - 1번째부터 5번째 데이터까지만 달라고 요청한다.
   → 최종적으로 하나의 URL 문자열이 완성된다.

4. 완성된 URL로 서버에게 GET 요청을 보낸다.
   - “이 주소의 데이터를 주세요” 라고 요청한다.
   - 서버가 10초 안에 대답 안 하면 요청을 중단한다.
   - 서버가 보내준 응답 전체를 response 라는 변수에 저장한다.

5. 응답의 HTTP 상태코드를 확인한다.
   - response.status_code 를 꺼내서 화면에 출력한다.
   - (200 이면: 서버가 요청을 정상 처리하고 답장을 줬다는 뜻)

6. 응답 본문(내용)을 텍스트로 가져온다.
   - response.text 의 앞부분 300글자만 출력한다.
   - 실제 API 데이터일 수도 있고,
     “인증키가 없습니다” 같은 안내 메시지일 수도 있다.

7. 서버가 어떤 형식의 내용을 보냈는지 확인한다.
   - response.headers 에서 "Content-Type" 값을 가져온다.
   - application/json 이면 JSON,
     application/xml 이면 XML 이라는 힌트다.
   - 그 값을 화면에 출력한다.

8. 여기까지 오면,
   - 통신이 됐는지,
   - 권한이 있는지,
   - 데이터가 JSON 인지 XML 인지를 사람이 눈으로 판단할 수 있다.
```


실행 (가상환경 켜진 상태에서)
```bash
python seoul_air_api.py
```

터미널에 출력결과:
```
HTTP Status Code: 200

응답 내용 (앞부분만):
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

Content-Type: application/xml;charset=UTF-8
```
✅ 이 결과를 이렇게 이해하면 됩니다
- `HTTP Status Code: 200`  
    → 통신은 성공 (서버까지 갔고, 서버가 답장을 줬다)
    
- 그런데 내용이 XML이다  
    → 데이터(JSON)가 아니라 안내문/에러 메시지(XML)를 받은 것
    
핵심:
> 200이면 다 성공이 아니라 200은 서버가 답을 줬다는 뜻이고,  
> 진짜 성공/실패는 response.text 내용을 봐야 한다
	
👉 이 첫 단계에서는 “아 파이썬이 웹에 요청을 보내는구나” 정도만 느끼면 됩니다. 브라우저 대신 requests가 일을 할수 있습니다.

---
### 브라우저 vs `requests` 비교
	같은 URL을 요청해도 브라우저는 사람이 보기 좋은 화면을, 파이썬은 가공하기 좋은 데이터 
	원문을 다룹니다.

| 비교 항목            | 브라우저(크롬, 사파리 등)            | 파이썬 + `requests`            |
| ---------------- | -------------------------- | --------------------------- |
| 누가 실행?           | 사람 손으로 클릭/입력               | 코드가 자동 실행                   |
| 어떤 형태로 봄?      . | 예쁜 웹페이지(HTML+CSS 렌더링)      | 응답 원문(text/json)을 그대로 받음    |
| 반복 작업            | 사람 손으로 계속 해야 함             | for문, 스케줄러로 무한 반복 가능        |
| 용도               | 사람 눈으로 보기, 인터랙션(로그인, 클릭 등) | 데이터 수집, 분석, 자동화, 다른 시스템과 연동 |
### 브라우저 버전 실습 (JSON을 직접 눈으로 보기)

1. 주소창에 입력:
    `https://jsonplaceholder.typicode.com/posts/1`
    
2. JSON처럼 생긴 글자가 화면에 보이면 OK
![[Pasted image 20251220180833.png]]

파이썬 버전 (같은 걸 코드로 요청해보기)

파일 생성
```bash
code browser_json.py
```

browser_json.py 파일을 생성한후 아래 코드를 작성합니다.
```python
import requests
# 웹 서버에 HTTP 요청을 보내기 위한 라이브러리

url = "https://jsonplaceholder.typicode.com/posts/1"
# 요청을 보낼 API 주소 (게시글 1개를 달라는 예시용 URL)

response = requests.get(url, timeout=10)
# 서버에 GET 요청 전송
# timeout=10 → 서버가 10초 안에 응답하지 않으면 중단

print("HTTP Status Code:", response.status_code)
# 서버가 요청을 정상적으로 받았는지 확인 (200이면 통신 성공)

print("\n응답 원문:")
print(response.text)
# 서버가 보내준 실제 응답 내용(문자열)
# JSON처럼 보이지만, 파이썬 입장에서는 아직 '글자(text)'
```

의사코드
```python
1. requests라는 “웹 서버에 요청을 보내는 도구”를 가져온다.

2. 요청을 보낼 API 주소를 변수에 저장한다.
   - 이 주소는 “게시글 1개를 주세요” 라는 의미의 테스트 API 이다.

3. 이 URL로 GET 요청을 보낸다.
   - 서버에게 데이터를 달라고 요청한다.
   - 서버가 10초 안에 응답하지 않으면 요청을 취소한다.
   - 서버가 보낸 결과(상태코드 + 내용)를 response 변수에 저장한다.

4. 응답 상태코드를 꺼내서 출력한다.
   - 200이면: 서버가 요청을 정상적으로 처리하고 응답을 보냈다는 뜻이다.

5. 응답 본문 전체를 문자열 형태로 출력한다.
   - JSON처럼 생겼지만,
   - 이 시점에는 아직 “그냥 글자(text)”일 뿐이다.
```

터미널에서 실행:
```bash
python browser_json.py
```

출력결과:
```
HTTP Status Code: 200

응답 원문:
{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
}
```
이건 JSONPlaceholder 서버가 정상적으로 JSON 데이터를 돌려준 것이고, 파이썬이 웹 서버에 요청 → 서버가 JSON 응답 → 그대로 출력 이 흐름이 100% 성공했다는 뜻입니다.

=> 둘 다 같은 서버, 같은 URL에 요청하지만,
- 브라우저는 화면에 예쁘게 보여주는 용도
- 파이썬은 데이터를 가져와서 코드로 바로 처리하는 용도

이 차이를 알면,
`response.json()`, `pandas.DataFrame` 다음에 이런 함수에 대해 이해하기 쉽습니다.

이 단계에서는 딥하게 API가 뭐고 HTTP가 뭔지 다 이해시키려고 하기보다,  
‘지금은 크롬이 아니라 파이썬 코드가 웹에 요청을 보내고, 서버가 응답을 돌려주면 우리가 그 데이터를 코드로 다룰 수 있다’ 이 감각만 잡아도 충분합니다.

---
### 2단계 – `.json()`으로 파이썬 dict로 변환해 보기

지금까지 우리는 파이썬 코드로 웹 서버에 요청을 보내고, 서버가 어떤 응답을 돌려주는지 확인했습니다.

이제 목표는 한 가지입니다.
> 서버가 준 텍스트(JSON)를 파이썬이 다룰 수 있는 자료구조(dict)로 바꾸기

### 🌱 먼저 꼭 알아야 할 아주 중요한 개념 3가지

이 3가지만 이해하면, **API·JSON·에러가 왜 나는지**가 한 번에 정리됩니다.

---
1️⃣ 서버가 보내주는 건 항상 글자(text)다
```python
response.text
```

이게 무슨 뜻이냐면요…
서버는 우리에게 엑셀 파일이나 딕셔너리를 직접 주는 게 아닙니다.
👉 항상 글자(문자열)로만 줍니다.

---
예를 들어 보면

서버가 주는 내용이
- JSON처럼 보이든
- XML처럼 보이든
- 웹페이지(HTML)처럼 보이든

파이썬 눈에는 전부 그냥 글자입니다.
```
"{ 'name': 'seoul', 'pm10': 30 }"
"<RESULT><CODE>INFO-100</CODE></RESULT>"
"<html><body>Hello</body></html>"
```
👉 전부 문자열(str) 그래서 처음에는 항상 이렇게 확인합니다.

```python
print(response.text)
```
	서버가 나한테 무슨 글자를 줬는지 먼저 본다

---
2️⃣ `.json()`은 JSON일 때만 쓰는 변환기다
```python
response.json()
```

이걸 이렇게 생각하면 됩니다 👇
> .json( )은 “이 글자가 JSON 맞지? 그럼 파이썬 딕셔너리로 바꿔줄게”라는 변환기입니다.

---
그래서 중요한 규칙 1개
- 서버가 JSON을 줬을 때만 사용 가능
- JSON이 아니면 ❌ 바로 에러

---
비유로 설명하면
- `.json()`은
    👉 한글 문서를 엑셀로 변환하는 버튼 같은 것
    
그런데 서버가 준 게
- 엑셀 ❌
- 이미지 ❌
- PDF ❌
라면?
👉 “엑셀로 바꿀 수 없습니다” 하고 에러가 나는 것과 똑같습니다.

---
그래서 이렇게 해야 합니다
```
1️⃣ response.text 로 내용 확인
2️⃣ JSON처럼 생겼는지 확인
3️⃣ 그 다음에 response.json()
```
	무조건 순서 중요

---
3️⃣ HTTP 상태 코드 200은 데이터 성공이 아니다
```
HTTP Status Code: 200
```
	이건 초보자들이 가장 많이 착각하는 부분입니다.

200의 진짜 의미
> 요청은 잘 받았고, 서버가 뭔가를 응답으로 돌려줬다

✔️ 요청 성공
❌ 데이터 성공 아님

---
예를 들면 이런 상황입니다
- 회사 건물에 들어감 → 출입 성공 (200)
- 하지만
    - 출입증(API 키) 없음
    - 담당자 없음
    
👉 일은 못 보고 안내문만 받고 나옴

---
실제로 서버는 이렇게 말할 수도 있습니다
```
HTTP 200
"인증키가 없습니다"
"권한이 없습니다"
"잘못된 요청입니다"
```
	서버 입장에서는 정상적으로 대답했기 때문에 200

그래서 실무/관제에서는 이렇게 판단합니다
```
상태 코드 = 통신 성공 여부
응답 내용 = 진짜 성공/실패 여부
```
	항상 response.text를 봐야 하는 이유

---
#### 🧠 최종 정리 (이 4줄만 기억하세요)
1️⃣ 서버는 항상 글자(text) 로 응답한다
2️⃣ `.json()`은 JSON일 때만 써야 한다
3️⃣ HTTP 200 = 통신 성공이지, 데이터 성공은 아니다
4️⃣ 그래서 항상 response.text부터 확인한다

> API에서 에러가 났을 때 코드가 틀린 게 아니라, 서버가 JSON이 아닌 안내문을 준 경우가 대부분입니다.

---
`seoul_air_api.py` 수정
`# 🔹 추가`, `# 🔹 변경`
```python
import requests
import pprint  # 🔹 추가: dict를 보기 좋게 출력하기 위한 도구

# 1️⃣ 서울시 미세먼지 API 주소
# ⚠️ 아직은 인증키를 넣지 않은 상태
API_KEY = "여기에_본인_API_키_문자열_붙이기"
url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/airQualityAPI/1/5/"

# 2️⃣ 서버에 요청 보내기
response = requests.get(url, timeout=10)

# 3️⃣ HTTP 상태 코드 확인
print("HTTP Status Code:", response.status_code)

# 4️⃣ 서버가 준 '원본 텍스트' 확인
#    🔹 이모지 폰트 추가
print("\n📦 응답 원문 미리보기:")
print(response.text[:300])   # 너무 길어서 앞부분만 출력 (이 부분은 기존과 동일)

# 5️⃣ 응답의 데이터 형식(Content-Type) 확인
#    🔹 이모지 폰트 추가
print("\n📦 Content-Type:")
print(response.headers.get("Content-Type"))

# 6️⃣ JSON일 때만 .json() 사용
#    🔹 여기부터가 "새로 추가된 핵심 로직"
#       - Content-Type이 JSON인 경우에만 response.json()을 호출
#       - 아니면 에러 안내
if response.headers.get("Content-Type", "").startswith("application/json"):
    print("\n✅ JSON 형식 확인 → 파이썬 dict로 변환 시도")

    data = response.json()   # 🔹 추가: JSON → 파이썬 dict로 실제 변환
    print("\n🔍 타입 확인:", type(data))   # 🔹 추가: dict 타입인지 확인

    print("\n📦 전체 구조(일부):")
    # 🔹 추가: pprint로 딕셔너리 구조를 예쁘게 출력
    pprint.pprint(data, width=80, depth=2)

else:
    # 🔹 추가: JSON이 아닐 때(예: XML 에러 메시지) 안내 메시지 출력
    print("\n❌ JSON이 아님")
    print("👉 현재 응답은 XML 또는 에러 메시지입니다.")
```

의사코드
```python
1. 웹 서버에 HTTP 요청을 보내기 위한 도구 requests 를 불러온다.
2. 파이썬 딕셔너리를 보기 좋게 출력하기 위한 pprint 도 같이 불러온다.

3. 서울시 미세먼지 API를 호출하기 위해,  
   내 API_KEY 를 문자열로 변수에 넣어둔다.

4. API 호출에 사용할 URL 문자열을 만든다.
   - 기본 주소: http://openapi.seoul.go.kr:8088/
   - 그 뒤에 API_KEY 를 붙인다.
   - 응답 형식은 json 으로 요청한다.
   - 데이터 이름은 airQualityAPI 이다.
   - 1번째부터 5번째 데이터까지 달라고 요청한다.
   → 이 모든 정보를 합쳐서 하나의 URL 문자열로 만든다.

5. 만든 URL 로 서버에 GET 요청을 보낸다.
   - 서버가 10초 안에 응답하지 않으면 timeout 으로 중단한다.
   - 서버가 보내준 응답 전체(상태코드, 헤더, 본문)를 response 변수에 저장한다.

6. response 에서 HTTP 상태코드를 꺼내서 화면에 출력한다.
   - 200 이면 요청 자체는 성공적으로 도착했다는 뜻이다.

7. 서버가 준 응답 내용을 “글자 그대로” 앞에서 300글자만 잘라서 미리보기로 출력한다.
   - 여기에는 실제 데이터(JSON)일 수도 있고,
   - “인증키가 틀립니다” 같은 에러 안내 XML일 수도 있다.

8. 응답 헤더에서 "Content-Type" 값을 꺼내서 출력한다.
   - 이 값으로 “JSON인지, XML인지, 다른 형식인지” 대략 추측할 수 있다.

9. 만약 Content-Type 이 "application/json" 으로 시작한다면:
   9-1. “아, 이건 JSON 형식이구나” 라고 판단하고,
        response.json() 을 사용해 JSON 문자열을 파이썬 dict 로 변환한다.
   9-2. 변환된 data 의 타입이 dict 인지 출력해서 확인한다.
   9-3. pprint 를 사용해 dict 전체 구조를 보기 좋게 출력한다.
        (너무 깊이 들어가면 복잡하니까 depth=2 정도까지만 보여준다.)

10. 만약 Content-Type 이 JSON 이 아니라면:
    10-1. “JSON이 아님” 이라는 메시지를 출력한다.
    10-2. “지금 응답은 XML이거나 에러 메시지일 수 있다”는 안내문을 보여준다.

11. 이 코드의 목적:
    - 요청이 되는지 확인하고
    - 서버가 실제 JSON을 주는 상황과
    - 인증키 에러 등으로 XML/에러 메시지가 오는 상황을  
      눈으로 구분할 수 있도록 도와준다.
```

6번 로직이 추가된 이유:
	응답이 JSON일 때만 안전하게 `.json()`을 쓰려고  
	(XML·에러 메시지일 때 프로그램이 터지지 않게 하려고) 추가된 로직입니다.

이 코드는 거의 예외 처리에 가까운 사고이며 예외가 나지 않도록 미리 막는 안전 장치(방어 코드)
```python
if Content-Type 이 JSON 이라면:
      → json() 써도 안전함 → dict 로 변환
else:
      → json() 쓰지 말고
      → "XML/에러입니다" 라고 안내

# 의사코드      
서버가 보내준 데이터가 진짜 JSON인지 먼저 확인하자.
JSON이면 변환해서 쓰고,
JSON이 아니면 (키 오류, XML 등) 깨지지 않게 안내만 하자.
```

코드실행하기:
```bash
python seoul_air_api.py
```

출력결과:
```
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님 → 현재는 XML 또는 에러 메시지
(venv) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ python seoul_air_api.py
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
```

### 🧠 이 출력 결과를 이렇게 이해하면 됩니다

✔️ 1. 요청은 성공했다
```
HTTP Status Code: 200
```
	서버까지는 정상적으로 도착

---
❌ 2. 하지만 데이터는 실패
```xml
인증키가 유효하지 않습니다
```
- 서울시 API는 인증키가 없으면
    - JSON 데이터 ❌
    - XML 에러 메시지 ⭕ 를 돌려줌

---
❌ 3. 그래서 `.json()`을 쓰면 안 되는 상태
```
Content-Type: application/xml
```
- JSON 아님 → `.json()` 사용 ❌
- 지금은 에러 메시지를 확인하는 단계

---
📌 지금 단계에서 꼭 기억해야 할 핵심 정리
`1` `response.text`
> 서버가 준 원본 문자열

`2` `response.json()`
> JSON일 때만 파이썬 `dict` / `list` 로 변환

`3.` 실무/관제에서는 항상 이 순서
```
요청
 → response.status_code
 → response.text
 → Content-Type 확인
 → JSON일 때만 response.json()
```

---
## 3단계 – 필요한 위치(row)까지 “안전하게” 들어가 보기

앞 단계에서 우리는 중요한 사실 하나를 확인했습니다.
> 서버가 JSON을 주면 파이썬에서는 그 JSON이 딕셔너리(dict)와 리스트(list)로 바뀐다는 것

이제부터 할 일은 아주 단순합니다.
> 큰 박스(JSON) 안에 뭐가 들어 있는지 하나씩 열어보면서 실제 데이터가 어디 있는지 찾기

우리가 하고 싶은 건 “미세먼지 데이터”인데, 서버는 데이터를 바로 주지 않고 큰 JSON 상자 안에 넣어서 줍니다.

그래서 우리는 JSON을 이렇게 탐색합니다:
- 바깥 상자(dict) →
- 그 안 상자(dict) →
- 데이터 목록(list) →
- 데이터 1개(dict)
    
즉, 3단계는 JSON 구조를 읽는 능력을 키우는 단계입니다.

---
🎯 **3단계의 목표**

이 단계에서의 목표는 딱 3가지입니다.
- 최상위 키가 무엇인지 확인한다 (`data.keys()`)
- dict → dict → list 순서로 내려간다 (`data["airQualityAPI"]["row"]`)
- 데이터 1개(dict)를 직접 눈으로 확인한다 (`rows[0]`)

👉 즉, JSON 안에서 실제 데이터가 어디에 숨어 있는지 찾는 연습을 하는 단계입니다

---
### 🌱 먼저 그림으로 이해해보기 (개념)

API에서 받아오는 데이터는 바로 쓰기 좋은 형태가 아닙니다.

서울시 공공데이터 응답은 보통 이런 구조입니다:
```json
{
"airQualityAPI":{
	"list_total_count":50,
	"RESULT":{ ...},
	"row":[
		{"MSRSTE_NM":"강남구","PM10":20},
		{"MSRSTE_NM":"영등포구","PM10":40}
		]
	}
}
```

이걸 박스로 비유하면 👇
```
data (dict)
 └─"airQualityAPI" (dict)
     ├─"list_total_count"
     ├─"RESULT"
     └─"row" (list)
          ├─0번째 데이터 (dict)
          ├─1번째 데이터 (dict)
          └─ ...
```

👉 우리가 진짜로 쓰고 싶은 데이터는 `"row"` 안에 들어 있는 리스트(list) 입니다.

그래서 이 구조를 읽을 수 있어야
- pandas DataFrame으로 바꿀 수 있고
- 필터링, 시각화, 관제 대시보드로 확장할 수 있습니다.

---
⚠️ 반드시 알고 가야 할 전제

❗ HTTP Status Code 200 ≠ JSON 성공
```
HTTP Status Code: 200
```

이 말은 단지:
> 요청을 서버가 받았고, 무언가 답을 줬다 라는 뜻입니다.

- ✅ 정상 데이터(JSON)일 수도 있고
- ❌ 에러 메시지(XML)일 수도 있습니다
    
👉 그래서 3단계에서는 반드시

> 지금 받은 응답이 JSON인지 먼저 확인해야 합니다.

---

### 실습 코드:
	이 코드는 “요청 → JSON인지 확인 → JSON이면 구조 안으로 쭉 들어가 보기”까지 들어간 버전

`seoul_air_api.py`
```python
import requests
import pprint  # 딕셔너리를 보기 좋게 출력하기 위한 도구

API_KEY = "여기에_본인_API_키_문자열_붙이기"
url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/airQualityAPI/1/5/"

# 1️⃣ 서버에 요청 보내기
response = requests.get(url, timeout=10)

# 2️⃣ HTTP 상태 코드 확인
print("HTTP Status Code:", response.status_code)

# 3️⃣ 서버가 준 '원본 텍스트' 확인
print("\n📦 응답 원문 미리보기:")
print(response.text[:300])

# 4️⃣ 응답의 데이터 형식(Content-Type) 확인
content_type = response.headers.get("Content-Type", "")
print("\n📦 Content-Type:")
print(content_type)

# =====================================================
# 🔧 [수정] JSON일 때만 파싱하도록 안전장치 유지
# =====================================================
is_json = content_type.lower().startswith("application/json")

if is_json:
    print("\n✅ JSON 형식 확인 → 파이썬 dict로 변환합니다.")

    data = response.json()   # JSON → dict
    print("\n🔍 타입 확인:", type(data))   # dict 확인

    # =================================================
    # 🔵 [추가] 3단계: JSON 구조 안으로 하나씩 들어가기
    # =================================================
    print("\n--- 🔍 3단계: JSON 구조 해석 시작 ---")

    # 🔵 [추가-1] 최상위 키 확인
    print("\n1️⃣ 최상위 키:", data.keys())

    # 🔵 [추가-2] 'airQualityAPI' 키 존재 여부 확인
    if "airQualityAPI" not in data:
        print("\n❌ 'airQualityAPI' 키가 없습니다.")
        print("👉 응답 구조가 예상과 다릅니다.")
        pprint.pprint(data, width=80, depth=3)

    else:
        # 🔵 [추가-3] airQualityAPI 안으로 진입
        air = data["airQualityAPI"]
        print("\n2️⃣ air 타입:", type(air))
        print("   air 키:", air.keys())

        # 🔵 [추가-4] 실제 데이터가 들어있는 'row' 확인
        if "row" not in air:
            print("\n❌ 'row' 키가 없습니다.")
            print("👉 데이터가 없거나 응답 구조가 다릅니다.")
            pprint.pprint(air, width=80, depth=3)

        else:
            rows = air["row"]
            print("\n3️⃣ row 타입:", type(rows))   # list
            print("   row 길이:", len(rows))

            # 🔵 [추가-5] 첫 번째 데이터만 출력
            if len(rows) == 0:
                print("\n⚠️ row 리스트가 비어 있습니다.")
            else:
                print("\n4️⃣ 첫 번째 측정 데이터:")
                pprint.pprint(rows[0], width=80)

# =====================================================
# 🔧 [유지] JSON이 아닐 때는 파싱하지 않음
# =====================================================
else:
    print("\n❌ JSON이 아님")
    print("👉 현재 응답은 XML 또는 에러 메시지입니다.")
    print("👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.")
```

의사코드:
```python
1. 웹 서버에 HTTP 요청을 보내기 위한 requests 도구를 불러온다.
2. 파이썬 딕셔너리나 리스트를 보기 좋게 출력하기 위한 pprint 도구를 불러온다.

3. 서울시 미세먼지 API를 사용할 때 필요한 API_KEY 문자열을 변수에 저장한다.
4. API 호출 주소(URL)를 규칙에 맞게 문자열로 만든다.
   - 기본 주소 + API_KEY + 응답형식(json) + 서비스명(airQualityAPI) + 데이터 범위(1~5)를 합쳐서 완성된 URL 하나를 만든다.

5. 완성된 URL로 서버에 GET 요청을 보낸다.
   - 서버가 10초 안에 응답하지 않으면 timeout으로 요청을 중단한다.
   - 서버가 돌려준 응답 전체를 response 변수에 저장한다.

6. response 에서 HTTP 상태코드를 꺼내서 화면에 출력한다.
   - (200이면: 서버가 요청을 잘 받고 응답했다는 뜻)

7. response 에서 응답 본문(내용)을 text 형식으로 꺼낸다.
   - 너무 길 수 있으니 앞에서 300글자만 잘라서 미리보기로 출력한다.

8. response 의 헤더(headers) 중에서 "Content-Type" 값을 꺼낸다.
   - 없으면 기본값으로 빈 문자열("")을 사용한다.
   - 그 Content-Type 값을 화면에 출력한다.

9. Content-Type 이 "application/json" 으로 시작하는지 확인한다.
   - 소문자로 바꿔 비교해서, JSON 여부를 확인한 뒤 is_json 변수에 True/False 로 저장한다.

10. 만약 is_json 이 True 라면 (응답이 JSON 형식이라면):

    10-1. "JSON 형식이다 → 파이썬 dict 로 변환해 보겠다"는 안내 문구를 출력한다.

    10-2. response.json() 을 호출해서
          JSON 문자열을 파이썬 딕셔너리(dict) 로 변환하고,
          그 결과를 data 변수에 저장한다.

    10-3. data 의 타입(type(data))을 출력해서
          진짜 dict 로 잘 변환되었는지 확인한다.

    10-4. 이제부터는 JSON 구조 안으로 단계별로 들어가면서
          어떤 키들이 있는지, 어디에 실제 데이터(row)가 있는지를 확인한다는 안내 문구를 출력한다.

    10-5. data 딕셔너리의 최상위 키 목록(data.keys())을 출력한다.
          - 여기 안에 "airQualityAPI"라는 키가 있는지 확인할 준비를 한다.

    10-6. 만약 "airQualityAPI"라는 키가 data 안에 없다면:
          - "airQualityAPI 키가 없다"는 안내를 출력한다.
          - 응답 구조가 우리가 기대한 모양과 다르다는 문구를 출력한다.
          - pprint.pprint() 를 사용해 data 전체(혹은 일부)를 보기 좋게 찍어서
            실제로 어떤 구조로 왔는지 확인한다.
          - 그리고 더 이상 안으로 들어가지 않는다.

    10-7. 만약 "airQualityAPI" 키가 있다면:
          - data["airQualityAPI"] 값을 꺼내서 air 변수에 저장한다.
          - air 의 타입(type(air))을 출력한다. (보통 dict)
          - air 딕셔너리 안에 있는 키 목록(air.keys())을 출력한다.

    10-8. air 안에 "row"라는 키가 있는지 확인한다.
          - 만약 "row" 키가 없다면:
            - "row 키가 없다"는 안내를 출력한다.
            - 데이터가 없거나 응답 구조가 달라졌다는 메시지를 출력한다.
            - pprint.pprint(air, ...) 로 air 내용을 보기 좋게 출력한다.
            - 그리고 더 이상 안으로 들어가지 않는다.

    10-9. "row" 키가 있다면:
          - air["row"] 값을 꺼내서 rows 변수에 저장한다.
          - rows 의 타입(type(rows))을 출력한다. (보통 list)
          - rows 리스트의 길이(len(rows))를 출력한다. (데이터 개수)

    10-10. 만약 rows 리스트의 길이가 0이라면:
           - "row 리스트가 비어 있다"는 경고 메시지를 출력한다.

    10-11. rows 안에 하나 이상 데이터가 있다면:
           - rows[0] (첫 번째 요소)를 꺼내서
             "첫 번째 측정 데이터"라고 안내 문구를 출력한 뒤
             pprint.pprint(rows[0])으로 딕셔너리 내용을 보기 좋게 출력한다.
           - 이를 통해 실제 측정값이 어떤 키/값 구조로 들어있는지 확인할 수 있다.

11. 만약 is_json 이 False 라면 (응답이 JSON이 아니라면):

    11-1. "JSON이 아니다"라는 메시지를 출력한다.
    11-2. 현재 응답이 XML 이거나 에러 안내 메시지일 수 있다는 설명을 출력한다.
    11-3. 특히 서울시 공공데이터의 경우,
          인증키가 틀리거나 없으면 XML 로 에러를 보내준다는 것을 알리고,
          "인증키가 유효한지 확인하고 다시 실행하라"는 안내를 출력한다.

12. 이 전체 코드는 결국 다음을 도와준다:
    - 서버까지 요청이 가는지 (HTTP 상태코드로 확인)
    - 응답이 JSON인지 XML/에러인지 (Content-Type과 일부 미리보기로 확인)
    - JSON이면 파이썬 dict 로 변환
    - 그 dict 안에서 실제 데이터(row)까지 단계적으로 찾아 들어가서
      구조를 이해하고, 첫 번째 데이터 예시를 눈으로 확인
    - JSON이 아니면 함부로 json()을 호출하지 않고,
      프로그램이 에러 없이 안전하게 끝나도록 방어한다.
```

실행 방법:
```bash
python seoul_air_api.py
```

실행 결과
```
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님 → 현재는 XML 또는 에러 메시지
(venv) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ python seoul_air_api.py
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
(venv) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ python seoul_air_api.py
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.
```

🖥 실행 결과 해석

🔴 지금처럼 인증키가 없을 때 (정상 상황)
```
📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
```

이 뜻은:
> ❌ 코드가 틀린 게 아님
> ❌ 3단계를 잘못 이해한 것도 아님
> 👉 서버가 JSON 데이터 대신 에러 안내문(XML)을 준 상태

그래서 3단계는 실행되지 않는 것이 맞습니다.

---

🟢 인증키가 유효할 때 (3단계 정상 실행)
```
1️⃣ 최상위 키: dict_keys(['airQualityAPI'])

2️⃣ air 타입: <class'dict'>
   air 키: dict_keys(['list_total_count','RESULT','row'])

3️⃣ row 타입: <class'list'>
   row 길이:5

4️⃣ 첫 번째 측정 데이터:
{'MSRSTE_NM':'중구','PM10':23, ...}
```

---

✔️ 우리가 3단계에서 실제로 한 일
1. JSON 전체를 **dict**로 받았다
2. 가장 바깥 키가 무엇인지 확인했다
3. 그 안의 dict(`airQualityAPI`)로 들어갔다
4. 실제 데이터 목록(list, `row`)을 찾았다
5. 데이터 1개(dict)를 직접 눈으로 확인했다

🧠 핵심 공식 (반드시 기억)
```
JSON 구조 해석 공식
dict →dict →list →dict
```

이 공식은
- 서울시 API
- 공공데이터
- 모든 REST API
- DRF 응답 구조
에서 100% 그대로 반복됩니다.

---
## 4단계 – pandas DataFrame으로 변환해서 “표(엑셀)”처럼 보기

🎯 4단계의 목적 (왜 하는가?)
3단계까지는 JSON 구조를 해석해서 row(데이터 목록)를 찾는 연습이었다면,

4단계의 목적은
> “row(list)에 들어 있는 데이터를 pandas DataFrame으로 변환해서 표(엑셀)처럼 다루는 것”

###### ✅ 왜 DataFrame이 중요한가?
| JSON(list/dict) | pandas DataFrame |
| --------------- | ---------------- |
| 구조는 명확하지만 보기 불편 | 엑셀처럼 한눈에 보기 쉬움   |
| 값 하나하나 접근해야 함   | 컬럼 단위 처리 가능      |
| 가공·분석 어려움       | 필터·정렬·통계·차트 가능   |

즉, 관제 대시보드 / 분석 / 시각화의 출발점 = DataFrame

---

🧠 4단계 핵심 개념 3가지
`1)` `rows`는 딕셔너리들이 들어있는 리스트(list)

3단계에서 찾은 이것:
```python
rows = air["row"]
```

`rows` 형태는 대략 이런 느낌:
```python
[
  {"MSRSTE_NM":"강남구","PM10":20, ...},
  {"MSRSTE_NM":"종로구","PM10":30, ...},
  ...
]
```

즉,
- 리스트 안에
- 딕셔너리 여러 개 들어있음 
- 각 딕셔너리 = 한줄(row) 데이터

---

`2)` `pd.DataFrame(rows)`는 “리스트(행들)를 표로 바꿔주는 함수”
```python
df = pd.DataFrame(rows)
```

이 한 줄로 벌어지는 일:
- 딕셔너리의 키들은 **컬럼명**이 되고
- 딕셔너리 하나가 **한 줄(row)** 즉 표의 한 행이 됩니다.

---

`3)` `.head()` / `.columns`로 “표가 잘 만들어졌는지” 확인
```python
df.head()
df.columns.tolist()
```
- `df.head()` → 상위 5줄 미리보기
- `df.columns.tolist()` → 컬럼 이름 확인

---

### 실습 코드

`seoul_air_api.py`
```python
# =====================================================
# 0️⃣ import 구문
# =====================================================
import requests
import pprint  # 딕셔너리를 보기 좋게 출력하기 위한 도구
import pandas as pd  # [추가] DataFrame 변환용 (1번째 코드에는 없던 부분)


# =====================================================
# 1️⃣ API 설정
# =====================================================
API_KEY = "여기에_본인_API_키_문자열_붙이기"

# ❌ url 문자열에 < > 가 들어가 있으면 안 됨
# ❌ f"<http://...>"  ← 잘못된 형식
# ✅ 정상적인 f-string URL
# [수정] 1번째 코드에서는 /1/5/ 까지만 조회했는데, 여기서는 /1/50/ 으로 50건 요청
url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/airQualityAPI/1/50/"


# =====================================================
# 2️⃣ 서버에 요청 보내기
# =====================================================
response = requests.get(url, timeout=10)

# =====================================================
# 3️⃣ HTTP 상태 코드 확인
# =====================================================
print("HTTP Status Code:", response.status_code)

# =====================================================
# 4️⃣ 서버가 준 원본 텍스트 확인
# =====================================================
print("\n📦 응답 원문 미리보기:")
print(response.text[:300])

# =====================================================
# 5️⃣ 응답 데이터 형식(Content-Type) 확인
# =====================================================
content_type = response.headers.get("Content-Type", "")
print("\n📦 Content-Type:")
print(content_type)


# =====================================================
# ✅ JSON일 때만 파싱하도록 안전장치
# =====================================================
is_json = content_type.lower().startswith("application/json")

if is_json:
    print("\n✅ JSON 형식 확인 → 파이썬 dict로 변환합니다.")

    data = response.json()  # JSON → dict
    print("\n🔍 타입 확인:", type(data))  # dict 확인

    # =================================================
    # ✅ 3단계: JSON 구조 안으로 하나씩 들어가기
    #    (이 부분은 1번째 코드와 거의 동일한 흐름)
    # =================================================
    print("\n--- 🔍 3단계: JSON 구조 해석 시작 ---")

    print("\n1️⃣ 최상위 키:", data.keys())

    if "airQualityAPI" not in data:
        print("\n❌ 'airQualityAPI' 키가 없습니다.")
        print("👉 응답 구조가 예상과 다릅니다.")
        pprint.pprint(data, width=80, depth=3)

    else:
        air = data["airQualityAPI"]
        print("\n2️⃣ air 타입:", type(air))
        print("   air 키:", air.keys())

        if "row" not in air:
            print("\n❌ 'row' 키가 없습니다.")
            print("👉 데이터가 없거나 응답 구조가 다릅니다.")
            pprint.pprint(air, width=80, depth=3)

        else:
            rows = air["row"]
            print("\n3️⃣ row 타입:", type(rows))  # list
            print("   row 길이:", len(rows))

            if len(rows) == 0:
                print("\n⚠️ row 리스트가 비어 있습니다.")
            else:
                print("\n4️⃣ 첫 번째 측정 데이터:")
                pprint.pprint(rows[0], width=80)

            # =================================================
            # ✅ 4단계: pandas DataFrame으로 변환
            #    [추가] 1번째 코드에는 없고, 2번째 코드에서 새로 들어간 부분
            # =================================================
            print("\n--- 📊 4단계: DataFrame 변환 시작 ---")

            df = pd.DataFrame(rows)  # [추가] rows 리스트 → DataFrame 변환

            print("\n📊 DataFrame.head() 결과:")  # [추가]
            print(df.head())

            print("\n📌 컬럼 목록:")  # [추가]
            print(df.columns.tolist())

            print("\n📌 (선택) 자주 보는 컬럼만 출력 예시:")  # [추가]

            wanted_cols = ["MSRSTE_NM", "PM10", "PM25"]  # [추가] 보고 싶은 컬럼 후보

            # [추가] 실제 응답에 존재하는 컬럼만 골라내기
            existing_cols = [c for c in wanted_cols if c in df.columns]

            if existing_cols:  # [추가]
                print(df[existing_cols].head())
            else:
                print("⚠️ 예시 컬럼(MSRSTE_NM, PM10, PM25)이 현재 응답에 없습니다.")
                print("👉 위의 '컬럼 목록'에서 실제 컬럼명을 확인해 주세요.")

# =====================================================
# ❌ JSON이 아닐 때
# =====================================================
else:
    print("\n❌ JSON이 아님")
    print("👉 현재 응답은 XML 또는 에러 메시지입니다.")
    print("👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.")
```

의사코드
```python
[0️⃣ 필요한 도구 불러오기]
- HTTP 요청을 보내는 도구 불러오기
- 깔끔하게 출력하는 도구 불러오기
- 표(테이블) 형태로 다루는 도구(DataFrame) 불러오기

[1️⃣ API 기본 설정]
- "내 인증키 문자열"을 변수에 넣어 둔다
- 서울시 공공데이터 API 주소를 만든다
    - 형식: "http://openapi.seoul.go.kr:8088/인증키/json/airQualityAPI/1/50/"
    - 1~50번까지의 미세먼지 데이터 요청하도록 설정

[2️⃣ 서버에 요청 보내기]
- 위에서 만든 URL로 GET 요청을 보낸다 (응답을 response에 저장)
- 요청이 너무 오래 걸리면 에러 나도록 timeout=10초 설정

[3️⃣ HTTP 상태 코드 확인]
- 응답에서 status_code를 꺼내서 출력한다
    - 200이면 정상, 400/500대는 문제 발생 가능

[4️⃣ 응답 원문(텍스트) 잠깐 보기]
- 응답 본문(response.text)에서 앞의 300글자만 잘라서 출력
    - "지금 대충 뭐가 왔는지" 눈으로 확인용

[5️⃣ 응답의 데이터 형식 확인]
- 응답 헤더에서 "Content-Type" 값을 꺼낸다
- 그 값을 출력해서 현재 응답이 JSON인지, XML인지, HTML인지 확인

[6️⃣ JSON인지 여부 판단]
- content_type을 소문자로 바꾼 뒤 "application/json"으로 시작하는지 체크
- 만약 JSON이면:
    - "JSON 형식입니다" 라고 출력
    - response.json()으로 파이썬 dict로 변환해서 data 변수에 담기
    - data의 타입이 dict인지 출력해서 확인

    [6-1️⃣ JSON 구조 한 단계씩 내려가며 확인]
    - data의 최상위 키 목록을 출력

    - 최상위에 "airQualityAPI"라는 키가 있는지 검사
      - 없으면:
        - "'airQualityAPI' 키가 없습니다" 출력
        - 전체 data 구조를 대략 출력하고 종료

      - 있으면:
        - air = data["airQualityAPI"] 로 꺼내기
        - air가 어떤 타입(dict인지)을 출력
        - air 안에 어떤 키들이 있는지 출력

        - air 안에 "row"라는 키가 있는지 검사
          - 없으면:
            - "'row' 키가 없습니다" 출력
            - air 내용을 대략 출력하고 종료

          - 있으면:
            - rows = air["row"] 라는 리스트로 저장
            - rows의 타입과 길이(몇 개나 있는지) 출력

            - 만약 rows 길이가 0이면:
              - "row 리스트가 비어 있습니다" 출력

            - 그렇지 않으면:
              - "첫 번째 측정 데이터"라고 안내 문구 출력
              - rows 리스트의 첫 번째 원소를 예쁘게 출력

    [6-2️⃣ rows를 pandas DataFrame으로 변환]
    - "DataFrame 변환 시작" 문구 출력
    - df = DataFrame(rows) 로 변환
    - df.head() 결과를 출력해서 앞부분 몇 줄만 확인
    - df의 컬럼 이름 목록을 출력

    [6-3️⃣ 자주 보는 컬럼만 골라서 출력]
    - 보고 싶은 컬럼 이름 목록을 미리 만든다 (예: ["MSRSTE_NM", "PM10", "PM25"])
    - 이 중에서 실제 df.columns에 존재하는 컬럼만 골라서 existing_cols에 담기
    - 만약 existing_cols가 비어 있지 않으면:
        - df[existing_cols].head() 로 해당 컬럼들만 앞부분 출력
      그렇지 않으면:
        - "예시 컬럼이 응답에 없습니다" 라고 안내하고
        - 위에서 출력된 전체 컬럼 목록을 보고 직접 골라 쓰라고 안내

[7️⃣ JSON이 아닐 때 처리]
- 만약 처음에 JSON이 아니라고 판단되면:
    - "JSON이 아님" 이라고 출력
    - "현재 응답은 XML 또는 에러 메시지일 수 있다"고 안내
    - "인증키가 유효한지, URL이 맞는지 다시 확인하라"고 안내
```

1. 그냥 출력용 코드 → “안전하게 구조 확인 + 분석” 코드로 업그레이드
    - 무조건 `response.json()` 하는 게 아니라,  
        먼저 `Content-Type`이 JSON인지 확인해서 에러를 예방해요.
        
2. JSON 구조를 한 단계씩 내려가면서 점검하도록 변경*
    - `airQualityAPI` 키가 있는지, `row`가 있는지, 비어 있지는 않은지  
        단계별로 확인해서 **“어디서 구조가 달라졌는지”** 쉽게 찾으려고 바꾼 거예요.
        
3. 단순 출력에서 → pandas DataFrame까지 확장
    - `rows`를 바로 `DataFrame`으로 바꿔서  
        `.head()`로 미리보기, 컬럼 목록 확인, 자주 보는 컬럼만 골라 보는 등  
        **데이터 분석 준비 단계까지 한 번에 가도록** 만든 코드예요.
        
4. 나중에 재사용/확장하기 좋은 형태로 정리
    - 이 구조를 그대로 두고,
        - API만 바꾸거나
        - 원하는 컬럼만 바꾸거나
        - 필터링/저장 로직을 더 얹기 되게  
            “뼈대 코드”처럼 쓰려고 이렇게 단계별로 정리된 버전입니다.

실행
```bash
python seoul_air_api.py
```

---

🖥 출력 결과
```
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.
```

✅ 출력 결과 해석

❌ 이 출력은 “코드 실패”가 아닙니다
현재 상태는:
- HTTP 요청은 정상 (200)
- 하지만 응답 내용이 JSON이 아니라 XML
- 이유는 인증키가 아직 유효하지 않기 때문

그래서:
- `response.json()`을 의도적으로 실행하지 않았고
- 프로그램은 에러 없이 정상 종료됨

---
✅ 인증키가 정상일 경우, 달라지는 점

인증키가 유효해지면:
```
Content-Type:
application/json
```
위와 같이 이렇게 바뀌고,
그 순간부터:
- 3단계(JSON 구조 해석)
- 4단계(DataFrame 변환) 이 자동으로 실행됩니다.
---
✅ 한 줄 요약

> API(JSON)에서 row(list)를 찾았다면 → DataFrame으로 바꾸는 순간 “관제 대시보드의 재료”가 된다.

---
## 5단계 – 간단한 필터링까지 맛보기

🎯 5단계의 목적
4단계에서 `rows(list)`를 `DataFrame(df)`로 바꿨죠?

이제부터가 “관제 느낌”의 시작입니다.
> 관제 화면은 보통 “전체 데이터”를 다 보여주지 않고 **위험한 것 / 기준 이상인 것만 걸러서 보여주는 화면**이에요.

그래서 5단계 목표는 딱 하나입니다.
✅ 기준(임계치)을 정하고, 그 이상인 데이터만 골라서 출력해보기

예:
- PM10이 50 이상인 지역만 보기
- “나쁨 이상 지역만 보여줘!” 같은 요구를 코드로 구현하는 것

---

🧠 5단계 핵심 개념 3가지

`1)` 필터링은 “True인 행만 남기는 것”
```python
df["PM10"] >=50
```

이 결과는 “True/False”로 된 목록(Series)이 됩니다.

그리고 이걸 `df[ ... ]` 안에 넣으면:
```python
bad_air = df[df["PM10"] >=50]
```

✅ 조건이 True인 행만 남습니다.

---

`2)` 관제에서 중요한 건 “기준값(threshold)”
- PM10 50 이상 → 나쁨 이상
- PM10 80 이상 → 매우 나쁨
    처럼 기준이 있어야 “위험”을 판단할 수 있어요.
    
즉, 관제는 사실상:
> (데이터) + (기준) → 필터링 결과(경고 목록)

---

`3)` DataFrame이니까 “원하는 컬럼만 뽑아 보여주기”도 쉬움
```python
bad_air[["MSRSTE_NM","PM10"]]
```

- 관제 화면에서는 전체 컬럼을 다 보여주기보다 **핵심 컬럼만 뽑아서** 보여주는 경우가 많습니다.

---

### 실습 코드

seoul_air_api.py
```python
# =====================================================
# 0️⃣ import 구문
# =====================================================
import requests
import pprint  # 딕셔너리를 보기 좋게 출력하기 위한 도구
import pandas as pd  # DataFrame 변환용


# =====================================================
# 1️⃣ API 설정
# =====================================================
API_KEY = "여기에_본인_API_키_문자열_붙이기"
url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/airQualityAPI/1/50/"


# =====================================================
# 2️⃣ 서버에 요청 보내기
# =====================================================
response = requests.get(url, timeout=10)

# =====================================================
# 3️⃣ HTTP 상태 코드 확인
# =====================================================
print("HTTP Status Code:", response.status_code)

# =====================================================
# 4️⃣ 서버가 준 원본 텍스트 확인
# =====================================================
print("\n📦 응답 원문 미리보기:")
print(response.text[:300])

# =====================================================
# 5️⃣ 응답 데이터 형식(Content-Type) 확인
# =====================================================
content_type = response.headers.get("Content-Type", "")
print("\n📦 Content-Type:")
print(content_type)


# =====================================================
# ✅ JSON일 때만 파싱하도록 안전장치
# =====================================================
is_json = content_type.lower().startswith("application/json")

if is_json:
    print("\n✅ JSON 형식 확인 → 파이썬 dict로 변환합니다.")

    data = response.json()  # JSON → dict
    print("\n🔍 타입 확인:", type(data))  # dict 확인


    # =================================================
    # ✅ 3단계: JSON 구조 안으로 하나씩 들어가기
    # =================================================
    print("\n--- 🔍 3단계: JSON 구조 해석 시작 ---")

    print("\n1️⃣ 최상위 키:", data.keys())

    if "airQualityAPI" not in data:
        print("\n❌ 'airQualityAPI' 키가 없습니다.")
        print("👉 응답 구조가 예상과 다릅니다.")
        pprint.pprint(data, width=80, depth=3)

    else:
        air = data["airQualityAPI"]
        print("\n2️⃣ air 타입:", type(air))
        print("   air 키:", air.keys())

        if "row" not in air:
            print("\n❌ 'row' 키가 없습니다.")
            print("👉 데이터가 없거나 응답 구조가 다릅니다.")
            pprint.pprint(air, width=80, depth=3)

        else:
            rows = air["row"]
            print("\n3️⃣ row 타입:", type(rows))  # list
            print("   row 길이:", len(rows))

            if len(rows) == 0:
                print("\n⚠️ row 리스트가 비어 있습니다.")
            else:
                print("\n4️⃣ 첫 번째 측정 데이터:")
                pprint.pprint(rows[0], width=80)


            # =================================================
            # ✅ 4단계: pandas DataFrame으로 변환
            #    (이 부분까지는 이전 코드와 동일)
            # =================================================
            print("\n--- 📊 4단계: DataFrame 변환 시작 ---")

            df = pd.DataFrame(rows)

            print("\n📊 DataFrame.head() 결과:")
            print(df.head())

            print("\n📌 컬럼 목록:")
            print(df.columns.tolist())

            print("\n📌 (선택) 자주 보는 컬럼만 출력 예시:")

            wanted_cols = ["MSRSTE_NM", "PM10", "PM25"]
            existing_cols = [c for c in wanted_cols if c in df.columns]

            if existing_cols:
                print(df[existing_cols].head())
            else:
                print("⚠️ 예시 컬럼(MSRSTE_NM, PM10, PM25)이 현재 응답에 없습니다.")
                print("👉 위의 '컬럼 목록'에서 실제 컬럼명을 확인해 주세요.")


            # =================================================
            # ✅ 5단계: 간단한 필터링 (관제 느낌)
            #    ⬇⬇⬇⬇⬇ [여기부터 전부 새로 추가된 부분] ⬇⬇⬇⬇⬇
            # =================================================
            print("\n--- ⚠️ 5단계: 기준 이상 지역만 필터링 ---")  # [추가-5단계]

            # [추가-5단계-1] 기준(임계치) 설정: PM10이 이 값 이상이면 "나쁨 이상"이라고 가정
            THRESHOLD_PM10 = 50
            print(f"\n✅ 필터 기준: PM10 >= {THRESHOLD_PM10}")

            # [추가-5단계-2] 필터링: 조건을 만족하는 행만 남김
            # (df['PM10'] >= 50) → True/False 시리즈
            # df[조건] → 조건이 True인 행만 남김
            if "PM10" in df.columns:
                bad_air = df[df["PM10"] >= THRESHOLD_PM10]

                # [추가-5단계-3] 결과 출력: 관제 모니터에 띄운다고 가정하고 핵심 컬럼만 출력
                print("\n⚠️ 미세먼지 나쁨 이상 지역 목록:")

                # [추가-5단계-4] 실제 존재하는 컬럼만 사용 (안전장치)
                cols_to_show = [c for c in ["MSRSTE_NM", "PM10"] if c in df.columns]

                if len(bad_air) == 0:
                    print("✅ 기준 이상 지역이 없습니다. (모두 양호)")
                elif cols_to_show:
                    # to_string(index=False) → 인덱스 번호 없이 표 출력
                    print(bad_air[cols_to_show].to_string(index=False))
                else:
                    # [추가-5단계-5] 컬럼명이 예상과 다를 때 안내
                    print("⚠️ 예상 컬럼(MSRSTE_NM, PM10)이 없습니다.")
                    print("👉 df.columns를 확인해서 실제 컬럼명으로 수정하세요.")
            else:
                # [추가-5단계-6] 아예 PM10 컬럼이 없을 때
                print("\n❌ 'PM10' 컬럼이 없습니다.")
                print("👉 df.columns에서 실제 미세먼지 컬럼명을 확인해 주세요.")

# =====================================================
# ❌ JSON이 아닐 때
# =====================================================
else:
    print("\n❌ JSON이 아님")
    print("👉 현재 응답은 XML 또는 에러 메시지입니다.")
    print("👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.")
```

의사코드
```python
[0️⃣ 필요한 도구 불러오기]
- HTTP 요청을 보내는 도구(요청 라이브러리)를 준비한다.
- 딕셔너리/리스트를 예쁘게 출력하는 도구를 준비한다.
- 표(테이블) 형태로 데이터를 다루는 도구(pandas)를 준비한다.


[1️⃣ API 기본 설정]
- 내 공공데이터 인증키 문자열을 변수에 저장한다. (API_KEY)
- 서울시 대기질 정보를 요청할 API URL 문자열을 만든다.
    - 형식: "http://openapi.seoul.go.kr:8088/인증키/json/airQualityAPI/1/50/"
    - → 1번부터 50번까지의 측정값을 JSON 형식으로 달라고 요청하는 주소


[2️⃣ 서버에 요청 보내기]
- 위에서 만든 URL로 GET 요청을 보낸다.
- 요청 결과(응답 객체)를 response 변수에 담는다.
- 너무 오래 걸리지 않도록 timeout은 10초로 설정한다.


[3️⃣ HTTP 상태 코드 확인]
- response에서 HTTP 상태 코드(status_code)를 꺼낸다.
- "HTTP Status Code: ..." 형태로 화면에 출력한다.
    - 200인 경우: 정상 응답 가능성이 높음
    - 그 외 코드: 에러 또는 이상 응답일 수 있음


[4️⃣ 응답 원문(텍스트) 미리보기]
- response의 본문(text)에서 앞의 300글자만 잘라서 출력한다.
- → "지금 어떤 내용이 대충 왔는지" 사람이 눈으로 확인하는 용도


[5️⃣ 응답의 데이터 형식(Content-Type) 확인]
- response의 헤더에서 "Content-Type" 값을 꺼낸다.
- 그 값을 출력한다.
    - 예: "application/json; charset=utf-8"
- 이 값을 보고 JSON인지, XML인지, HTML인지 알 수 있다.


[6️⃣ JSON인지 여부 판단하는 안전장치]
- content_type을 소문자로 바꾼 후 "application/json"으로 시작하는지 확인한다.
- 만약 JSON이라면 is_json = True, 아니면 False라고 본다.

- 만약 is_json == True (JSON일 때)라면:
    - "JSON 형식입니다"라는 안내를 출력한다.
    - response.json()을 호출해서 JSON 문자열을 파이썬 dict 구조로 변환한다.
    - 변환된 객체를 data 변수에 담는다.
    - data의 타입이 dict인지 출력해본다.


    [6-1️⃣ JSON 구조를 단계별로 내려가며 확인]
    - data의 최상위 키 목록을 출력한다.

    - 최상위에 "airQualityAPI"라는 키가 있는지 확인한다.
        - 만약 없다면:
            - "'airQualityAPI' 키가 없습니다"라고 출력한다.
            - 응답 구조가 예상과 다르다고 안내한다.
            - pprint로 data 전체 구조를 대략 출력해 보고 여기서 JSON 해석을 멈춘다.

        - 만약 있다면:
            - air = data["airQualityAPI"]로 해당 부분을 꺼낸다.
            - air의 타입(보통 dict)을 출력한다.
            - air 안에 있는 키 목록을 출력한다.

            - air 안에 "row"라는 키가 있는지 확인한다.
                - 없으면:
                    - "'row' 키가 없습니다"라고 출력한다.
                    - "데이터가 없거나 응답 구조가 변경된 것"이라고 안내한다.
                    - air 내용을 대략 출력하고 여기서 JSON 해석을 멈춘다.

                - 있으면:
                    - rows = air["row"] 로 데이터를 꺼낸다.
                    - rows의 타입(보통 리스트)을 출력한다.
                    - rows의 길이(데이터 개수)를 출력한다.

                    - 만약 rows의 길이가 0이면:
                        - "row 리스트가 비어 있습니다"라고 출력한다.
                        - 더 이상 처리할 데이터가 없으므로 여기까지.

                    - 그렇지 않으면(데이터가 1개 이상이면):
                        - "첫 번째 측정 데이터:"라고 안내 문구를 출력한다.
                        - rows 리스트의 첫 번째 원소를 예쁘게 출력해서 구조를 눈으로 확인한다.


    [6-2️⃣ DataFrame으로 변환하는 단계]
    - "DataFrame 변환 시작"이라는 문구를 출력한다.
    - rows 리스트를 표 구조로 변환한다.
        - df = DataFrame(rows)
        - 이렇게 하면 각 dict의 키가 컬럼 이름이 된다.

    - df.head() 결과(앞에서 몇 행)를 출력해서 데이터 모양을 확인한다.
    - df.columns를 출력해서 컬럼 이름 목록을 확인한다.

    - "자주 보는 컬럼만 출력하는 예시"를 보여준다.
        - 보고 싶은 컬럼 이름 후보 리스트를 만든다.
            - 예: wanted_cols = ["MSRSTE_NM", "PM10", "PM25"]
        - 이 중에서 실제로 df에 존재하는 컬럼만 골라서 existing_cols에 넣는다.
            - existing_cols = [c for c in wanted_cols if c in df.columns]
        - 만약 existing_cols가 비어 있지 않다면:
            - df[existing_cols].head()를 출력해서 해당 컬럼들만 앞부분을 보여준다.
        - 만약 비어 있다면:
            - "예시 컬럼이 현재 응답에 없습니다"라고 안내하고,
            - 컬럼 목록을 보고 실제 이름을 확인하라고 안내한다.


    [6-3️⃣ 간단한 관제용 필터링 로직 추가]
    - "기준 이상 지역만 필터링"이라는 제목을 출력한다.

    - 1) 기준(임계치) 설정
        - PM10이 일정 값 이상이면 "나쁨 이상"이라고 가정한다.
        - 예: THRESHOLD_PM10 = 50
        - "필터 기준: PM10 >= 50"이라는 안내 문구를 출력한다.

    - 2) 필터링 수행
        - 우선 df에 "PM10" 컬럼이 있는지 확인한다.
            - 없다면:
                - "'PM10' 컬럼이 없습니다"라고 출력한다.
                - df.columns에 어떤 컬럼이 있는지 보고 미세먼지 관련 컬럼명을 찾으라고 안내한다.
            - 있다면:
                - 조건식 (df["PM10"] >= THRESHOLD_PM10)을 만든다.
                - 이 조건을 이용해서 bad_air = df[df["PM10"] >= THRESHOLD_PM10] 으로 필터링한다.
                - bad_air에는 기준 이상(나쁨 이상)의 지역만 남는다.

    - 3) 필터링된 결과 출력
        - "미세먼지 나쁨 이상 지역 목록:" 문구를 출력한다.
        - 기본으로 보여주고 싶은 컬럼 목록을 정한다. (예: ["MSRSTE_NM", "PM10"])
        - 이 중 실제로 존재하는 컬럼만 골라서 cols_to_show에 넣는다.

        - 만약 bad_air의 행 개수가 0이면:
            - "기준 이상 지역이 없습니다. (모두 양호)"라고 출력한다.

        - 만약 행이 있고, cols_to_show도 비어 있지 않다면:
            - bad_air[cols_to_show]만 골라서 표 형태로 출력한다.
            - 인덱스 번호는 표시하지 않고(관제 화면이라고 가정) 깔끔한 표만 보여준다.

        - 만약 cols_to_show가 비어 있다면:
            - "예상했던 컬럼명이 없습니다"라고 안내하고,
            - df.columns를 확인해서 실제 컬럼명으로 수정하라고 안내한다.


[7️⃣ JSON이 아닐 때 처리]
- 만약 처음에 Content-Type이 JSON이 아니라면 (is_json == False):
    - "JSON이 아님"이라고 출력한다.
    - "현재 응답은 XML 또는 에러 메시지일 수 있습니다"라고 안내한다.
    - "인증키가 올바른지, URL이 맞는지 다시 확인해 보세요"라고 안내한다.
```

실행 방법
```bash
python seoul_air_api.py
```

🖥 출력 결과
```bash
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.
(venv) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ python seoul_air_api.py
HTTP Status Code: 200

📦 응답 원문 미리보기:
<RESULT><CODE>INFO-100</CODE><MESSAGE><![CDATA[인증키가 유효하지 않습니다.
인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.]]></MESSAGE></RESULT>

📦 Content-Type:
application/xml;charset=UTF-8

❌ JSON이 아님
👉 현재 응답은 XML 또는 에러 메시지입니다.
👉 인증키가 유효한지 확인한 뒤 다시 실행하세요.
```
이 말은 곧 👇
- 서버 요청 자체는 성공 (HTTP 200)
- ❌ 하지만 데이터 형식이 JSON이 아님
- ❌ 그래서 `response.json()`을 실행하면 안 됨
- ✅ 코드가 이를 정확히 감지해서 3~5단계를 스킵
    
즉,
> “아직 데이터가 준비되지 않았으니, 분석/필터링 단계로 들어가지 않는다”

라는 판단을 코드가 정확히 한 것입니다.
👉 이건 매우 잘 짠 코드의 증거입니다.

---
왜 5단계까지 안 나오는데도 ‘맞다’고 할 수 있나?

지금 코드 흐름은:
```
요청 →
Content-Type 확인 →
JSON일 때만
    ├─ 3단계(JSON 구조 해석)
    ├─ 4단계(DataFrame 변환)
    └─ 5단계(필터링)
```

그리고 실제 결과는:
```
Content-Type = application/xml
→ JSON 아님
→ 3~5단계 실행 안 함
```
👉 설계한 대로 정확히 동작

---

✅ 5단계 요약
- 필터링은 관제의 핵심이다.
    
- DataFrame에서
```python
df[df["PM10"] >= 기준값]
```
    이 한 줄로 위험 목록을 만들 수 있다.
    
- 이제 이걸 Streamlit UI로 연결하면 “관제 대시보드”가 됩니다.

---
## 5단계 마무리: Streamlit 화면으로 관제 대시보드 만들기

🎯 목표
- 콘솔 출력으로 끝내지 않고,
- 브라우저 화면에서
    - 전체 데이터 표
    - 임계치 슬라이더(기준값 조절)
    - “나쁨 이상” 필터 결과
    - 간단 차트  
        를 직접 보게 해서 **관제 시스템이 ‘완성’된 느낌**을 만든다.

준비
```bash
cd ~/day1_console/day9_api
pip install streamlit pandas requests
```
브라우저를 열수있는 스트림릿을 설치합니다.

VSCode에서 app.py파일을 생성합니다.
app.py
```python
import requests
import pandas as pd
import streamlit as st   # [추가] 웹 대시보드 출력용


# ==============================
# 0) Streamlit 기본 설정
# ==============================
st.set_page_config(        # [추가]
    page_title="서울 미세먼지 관제 대시보드",
    page_icon="🌫️",
    layout="wide"
)

st.title("🌫️ 서울 미세먼지 관제 대시보드 (API → DataFrame → 필터링)")   # [추가]
st.write("API로 데이터를 가져와서 **기준값(임계치)** 으로 위험 지역만 걸러서 보여주는 관제 화면입니다.")   # [추가]


# ==============================
# 1) 사이드바: 입력(설정값)
# ==============================
st.sidebar.header("⚙️ 설정")   # [추가]

API_KEY = st.sidebar.text_input(         # [수정] → 하드코드 → 사용자 입력
    "서울 OpenAPI KEY",
    value="여기에_본인_API_키_문자열_붙이기"
)

limit = st.sidebar.selectbox(           # [추가]
    "가져올 데이터 개수", 
    [5, 10, 20, 50], 
    index=3
)

threshold_pm10 = st.sidebar.slider(     # [수정] → 코드 값 → 슬라이더 UI
    "PM10 임계치 (나쁨 기준)",
    min_value=0, max_value=200, value=50, step=5
)

only_bad = st.sidebar.checkbox("나쁨 이상만 보기", value=True)   # [추가]

refresh = st.sidebar.button("🔄 새로고침(재요청)")                # [추가]


# ==============================
# 2) API 호출 함수
# ==============================
@st.cache_data(ttl=60)        # [추가] → 60초 동안 캐싱
def fetch_air_data(api_key: str, limit: int):
    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"   # [수정] limit 적용
    response = requests.get(url, timeout=10)

    content_type = response.headers.get("Content-Type", "")
    is_json = content_type.lower().startswith("application/json")

    # JSON이 아니면(XML/에러 메시지)
    if not is_json:          # [수정] → 예외 반환 형식 (df, err)
        return None, response.text[:500]

    data = response.json()

    if "airQualityAPI" not in data:
        return None, "응답에 airQualityAPI 키가 없습니다."

    if "row" not in data["airQualityAPI"]:
        return None, "응답에 row 데이터가 없습니다."

    rows = data["airQualityAPI"]["row"]
    df = pd.DataFrame(rows)

    return df, None          # [수정] → DataFrame + 에러 메시지 반환


# ==============================
# 3) 데이터 가져오기
# ==============================
if refresh:            # [추가] → 버튼으로 캐시 초기화
    fetch_air_data.clear()

df, err = fetch_air_data(API_KEY, limit)   # [수정] → 함수 호출 구조 변경

if df is None:         # [수정] → Streamlit식 오류 처리
    st.error("❌ DataFrame 생성에 실패했습니다. (df가 None)")
    if err:
        st.code(err)
    st.stop()


# ==============================
# 4) 에러 처리
# ==============================
if err is not None:    # [수정]
    st.error("❌ 데이터를 가져오지 못했습니다.")
    st.write("아래 메시지를 확인하세요 (대부분 인증키 문제로 XML이 내려옵니다).")
    st.code(err)
    st.stop()


# ==============================
# 5) 컬럼 확인 및 타입 정리
# ==============================
# [추가] 숫자 비교를 위한 형변환
if "PM10" in df.columns:
    df["PM10"] = pd.to_numeric(df["PM10"], errors="coerce")

if "PM25" in df.columns:
    df["PM25"] = pd.to_numeric(df["PM25"], errors="coerce")


# ==============================
# 6) 필터링(관제 핵심)
# ==============================
if "PM10" not in df.columns:
    st.warning("⚠️ PM10 컬럼이 없습니다. df.columns를 확인해 주세요.")
    st.write(df.columns.tolist())
    st.stop()

bad_df = df[df["PM10"] >= threshold_pm10].copy()    # [수정] → 슬라이더 기준 적용


# ==============================
# 7) 화면 출력(관제 마무리)
# ==============================
col1, col2 = st.columns([2, 1])   # [추가] 레이아웃 분리

with col1:
    st.subheader("📋 전체 데이터")
    st.caption("API에서 받은 원본 데이터(DataFrame)입니다.")
    st.dataframe(df, use_container_width=True)      # [수정] → print → 테이블 UI

with col2:
    st.subheader("🚨 위험 요약")
    st.metric("총 데이터 수", len(df))             # [추가]
    st.metric(f"PM10 ≥ {threshold_pm10} 지역 수", len(bad_df))

    st.subheader("📌 컬럼 확인")
    st.write(df.columns.tolist())

st.divider()   # [추가]


st.subheader("⚠️ 나쁨 이상(필터링 결과)")
st.caption("관제 화면은 보통 **기준 이상 데이터만** 보여줍니다.")

show_cols = [c for c in ["MSRSTE_NM", "PM10", "PM25", "MSRDATE"] if c in df.columns]

if only_bad:                                   # [수정] 체크박스 조건 추가
    if len(bad_df) == 0:
        st.success("✅ 기준 이상 지역이 없습니다. (모두 양호)")
    else:
        st.dataframe(bad_df[show_cols], use_container_width=True)
else:
    st.info("체크 해제 상태: 전체 데이터가 이미 위에 표시되어 있습니다.")

st.divider()


# ==============================
# 8) 차트 추가
# ==============================
st.subheader("📈 간단 차트: PM10 상위 지역 TOP 10")   # [추가]

if len(df) > 0:
    top = df.sort_values("PM10", ascending=False).head(10)   # [추가]
    chart_cols = [c for c in ["MSRSTE_NM", "PM10"] if c in top.columns]

    if chart_cols == ["MSRSTE_NM", "PM10"]:
        top_chart = top.set_index("MSRSTE_NM")["PM10"]
        st.bar_chart(top_chart)       # [추가]
    else:
        st.write("차트에 필요한 컬럼이 부족합니다. (MSRSTE_NM, PM10)")
```

의사코드:
```python
[0) 필요한 라이브러리 불러오기]
- HTTP 요청을 보내기 위한 라이브러리 불러오기 (requests)
- 표(테이블) 데이터를 다루기 위한 라이브러리 불러오기 (pandas)
- 웹 대시보드 UI를 만들기 위한 라이브러리 불러오기 (streamlit)


[0) Streamlit 기본 설정]
- 페이지 제목을 "서울 미세먼지 관제 대시보드"로 설정한다.
- 상단에 표시될 아이콘(이모지)을 🌫️ 로 설정한다.
- 레이아웃은 가로로 넓게(wide) 쓰도록 설정한다.

- 화면 맨 위에 대시보드 제목을 쓴다.
  - "서울 미세먼지 관제 대시보드 (API → DataFrame → 필터링)"
- 아래에 한 줄 설명을 적는다.
  - "API로 데이터를 가져와서 기준값(임계치)으로 위험 지역만 걸러서 보여주는 관제 화면입니다."


[1) 사이드바: 사용자 입력(설정값)]
- 화면 왼쪽 사이드바에 "⚙️ 설정" 이라는 섹션 제목을 표시한다.

- 사이드바에 서울 OpenAPI KEY를 입력하는 텍스트 박스를 만든다.
  - 기본값은 "여기에_본인_API_키_문자열_붙이기" 로 채워둔다.
  - 사용자가 여기 내용을 자기 키로 바꿀 수 있다.

- 사이드바에 "가져올 데이터 개수" 선택 박스를 만든다.
  - 선택지는 [5, 10, 20, 50]
  - 기본 선택은 50개(index=3)

- 사이드바에 슬라이더를 하나 만든다.
  - 레이블: "PM10 임계치 (나쁨 기준)"
  - 최소값: 0
  - 최대값: 200
  - 기본값: 50
  - 증가 단위: 5
  → 이 값이 "나쁨 기준"으로 사용된다.

- 사이드바에 체크박스를 하나 만든다.
  - 레이블: "나쁨 이상만 보기"
  - 기본값: True
  → 체크되어 있으면 "나쁨 이상 데이터만" 보여주는 모드.

- 사이드바에 "🔄 새로고침(재요청)" 버튼을 하나 만든다.
  → 사용자가 누르면 API를 다시 호출하게 만들 예정이다.


[2) API 호출 함수 정의]
- fetch_air_data(api_key, limit) 라는 함수를 만든다.
- 이 함수는 Streamlit의 캐시 기능을 사용한다.
  - 같은 입력(api_key, limit)으로 60초 이내에 다시 호출되면
    → 이전 결과를 재사용하여 API를 매번 다시 부르지 않는다.

- 함수 안에서 하는 일:

  1. 서울시 대기질 API URL을 만든다.
     - 형식: "http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"
     - limit만큼의 데이터를 JSON으로 요청한다.

  2. 이 URL로 GET 요청을 보낸다. (timeout은 10초)

  3. 응답의 Content-Type 값을 확인한다.
     - 소문자로 바꾼 후 "application/json" 으로 시작하는지 체크한다.
     - JSON이 아니면:
       - (예: 인증 실패로 XML/HTML이 왔을 때)
       - (df=None, 에러 메시지 텍스트 일부) 를 반환하고 함수 종료.

  4. JSON이면:
     - response.json() 으로 파이썬 dict로 변환해서 data 변수에 담는다.

  5. data 안에 "airQualityAPI"라는 키가 있는지 확인한다.
     - 없으면:
       - (df=None, "응답에 airQualityAPI 키가 없습니다.") 를 반환하고 종료.

  6. data["airQualityAPI"] 안에 "row"라는 키가 있는지 확인한다.
     - 없으면:
       - (df=None, "응답에 row 데이터가 없습니다.") 를 반환하고 종료.

  7. rows = data["airQualityAPI"]["row"]로 리스트 데이터를 꺼낸다.

  8. rows를 pandas DataFrame으로 변환한다. (df = DataFrame(rows))

  9. (df, 에러 없음)를 반환한다.
     - 즉, (df, None) 반환.


[3) 데이터 가져오기 로직]
- 만약 사용자가 사이드바의 "새로고침" 버튼을 눌렀다면:
  - fetch_air_data의 캐시를 지운다. (clear)
  - 다음 호출부터는 API를 다시 호출하게 된다.

- fetch_air_data(API_KEY, limit)를 호출하여
  - df(데이터프레임), err(에러메시지)를 받아온다.

- 만약 df가 None이라면:
  - "DataFrame 생성에 실패했습니다"라는 에러 메시지를 화면에 띄운다.
  - err 내용이 있으면 코드 블록 형태로 보여준다.
  - 더 이상 진행하지 않고 앱 실행을 중단한다(st.stop).


[4) 에러 메시지 처리]
- df는 만들어졌지만 err가 None이 아닌 경우:
  - "데이터를 가져오지 못했습니다"라는 에러 메시지를 띄운다.
  - 대부분 인증키 문제로 XML이 내려온다고 설명을 써준다.
  - err 내용을 코드 블록으로 보여준다.
  - 더 이상 진행하지 않고 앱 실행을 중단한다.


[5) 컬럼 확인 및 타입 정리]
- df에 "PM10" 컬럼이 있다면:
  - df["PM10"]을 숫자형으로 변환한다.
    - 숫자가 아닌 값은 NaN으로 처리한다(errors="coerce").

- df에 "PM25" 컬럼이 있다면:
  - df["PM25"]도 같은 방식으로 숫자형으로 변환한다.

→ 이렇게 하는 이유:
- API 응답이 문자열 형태의 숫자일 수 있어서
- 임계치 비교(>=)가 제대로 되도록 타입을 맞춰주는 단계.


[6) 필터링 (관제 핵심 로직)]
- df에 "PM10" 컬럼이 없으면:
  - "PM10 컬럼이 없습니다"라는 경고 메시지를 띄운다.
  - df.columns 목록을 화면에 보여준다.
  - 더 이상 진행하지 않고 앱 실행을 멈춘다.

- "PM10" 컬럼이 있다면:
  - bad_df 라는 DataFrame을 만든다.
  - 조건: df["PM10"] 값이 threshold_pm10 (슬라이더에서 정한 임계치) 이상인 행만 추린다.
  - 이렇게 필터링한 결과를 bad_df에 복사(copy)해 둔다.
  → bad_df = "나쁨 이상 지역 목록" 이라고 보면 된다.


[7) 화면 출력 (관제 마무리)]
- 화면을 두 개의 컬럼으로 나눈다. (왼쪽: 오른쪽 = 2:1 비율)

- 왼쪽 컬럼(col1)에는:
  - "📋 전체 데이터"라는 부제목을 보여준다.
  - "API에서 받은 원본 DataFrame입니다"라는 설명을 표시한다.
  - df 전체를 표 형태로 보여준다(st.dataframe).

- 오른쪽 컬럼(col2)에는:
  - "🚨 위험 요약" 이라는 부제목을 쓴다.
  - st.metric으로 요약 숫자를 보여준다:
    - 총 데이터 수: len(df)
    - PM10 ≥ threshold_pm10 지역 수: len(bad_df)
  - "📌 컬럼 확인" 부제목 밑에 df.columns 목록을 보여준다.

- 구분선(st.divider)을 그어준다.

- "⚠️ 나쁨 이상(필터링 결과)"라는 부제목을 다시 쓴다.
- "관제 화면은 보통 기준 이상 데이터만 보여줍니다" 라는 캡션을 단다.

- show_cols라는 리스트를 만든다.
  - ["MSRSTE_NM", "PM10", "PM25", "MSRDATE"] 중
  - 실제로 df에 존재하는 컬럼만 골라서 넣는다.

- 만약 사이드바에서 "나쁨 이상만 보기" 체크박스가 체크된 상태라면 (only_bad=True):
  - bad_df에 행이 0개면:
    - "기준 이상 지역이 없습니다. (모두 양호)"라는 성공 메시지를 띄운다.
  - bad_df에 데이터가 있으면:
    - bad_df에서 show_cols만 골라서 표로 보여준다.

- 만약 only_bad가 False라면:
  - "체크 해제 상태: 전체 데이터가 이미 위에 표시되어 있습니다."라는 안내 메시지를 띄운다.

- 다시 한 번 구분선(st.divider)를 넣는다.


[8) 차트 출력]
- "📈 간단 차트: PM10 상위 지역 TOP 10"이라는 부제목을 쓴다.

- df에 행이 1개 이상 있으면:
  - PM10 값을 기준으로 내림차순 정렬한다.
  - 상위 10개의 행만 뽑아서 top이라는 DataFrame을 만든다.

  - ["MSRSTE_NM", "PM10"] 컬럼이 top에 모두 있는지 확인한다.
    - 둘 다 있으면:
      - top의 "MSRSTE_NM"을 인덱스로 쓰고, "PM10" 값을 시리즈로 만든다.
      - 이 시리즈를 막대그래프(bar chart)로 그린다.
    - 필요한 컬럼이 없으면:
      - "차트에 필요한 컬럼이 부족합니다. (MSRSTE_NM, PM10)"이라는 안내 문구를 대신 보여준다.
```

실행
```bash
streamlit run app.py
```

![[Pasted image 20251220201047.png]]
빨간 에러 박스의 의미
```
❌ 데이터를 가져오지 못했습니다.
```
그리고 아래 메시지:
```xml
<RESULT>
  <CODE>INFO-100</CODE>
  <MESSAGE>
    인증키가 유효하지 않습니다.
    인증키가 없는 경우, 열린 데이터 광장 홈페이지에서 인증키를 신청하십시오.
  </MESSAGE>
</RESULT>
```
이건 ❌ 프로그램 오류가 아닙니다.

이게 뜻하는 정확한 의미
- 서울 OpenAPI 서버가 요청을 정상적으로 받았고
- 대신 이렇게 말해준 것:
	“너가 준 API 키가 아직 유효하지 않거나, 잘못됐어”
    
그래서:
- JSON ❌
- XML(에러 메시지) ⭕ 를 내려준 겁니다.
    
👉 이건 우리가 일부러 만든 “방어 코드”가 정확히 작동했다는 증거예요.

- 화면이 안 뜨는 건 ❌ 개발 실패
- 데이터가 안 오는 이유를 화면에서 설명해주는 것 ⭕
- 이것이 바로 운영 가능한 관제 시스템

관제 대시보드는 완벽하게 만들어졌고, 현재 보이는 메시지는 외부 API 인증 실패를 정상적으로 알려주는 ‘정상 동작 화면’입니다.

---
# 6단계 – CSV 업로드를 관제 대시보드에 “자연스럽게” 붙이기 (API 실패 대비/리플레이)

✅ 왜 갑자기 CSV를 하냐? (관제 관점에서의 정의)

5단계까지 우리가 만든 관제 대시보드는 이런 구조였죠.
> API(외부 데이터) → requests.get() → JSON → rows(list) → DataFrame(df) → 필터링(임계치 이상만) → 화면 출력

그런데 지금 실제로 겪고 있는 문제가 있어요:
- 인증키가 틀리거나 만료됨
- 외부 API 서버 장애
- 네트워크 문제
- 서버에서 XML 에러를 내려줌

즉, “관제 시스템은 외부 데이터가 항상 정상이라고 가정하면 안 됩니다.”

그래서 실무 관제에서는 거의 무조건 아래가 같이 들어가요:
✅ 관제에서 CSV는 “옵션 기능”이 아니라 “운영 안전장치”

CSV를 쓰는 이유는 3가지로 정리됩니다.
1. API가 죽어도 화면은 살아있어야 함 (Fallback)
- 외부 API가 안 되면 CSV로라도 대체해서 화면과 기능을 유지
- “시스템이 죽었다”가 아니라
    “현재 실시간 데이터가 안 와서 대체 모드로 동작 중” 상태를 보여줄 수 있음
    
2. 테스트/수업용 데이터 재생(Replay)
- API가 매번 바뀌면 테스트가 어렵습니다.
- CSV는 “고정된 샘플 데이터”라서
    - 필터링 실습
    - 차트 실습
    - UI 실습을 안정적으로 할 수 있음
    
3. 운영 기록(로그) / 배치 데이터 분석
- 관제 시스템은 보통 “실시간”만 보는 게 아니라
    - 어제 데이터
    - 일주일 평균
    - 특정 지역의 추이 같은 걸 봐야 합니다.
- 이런 건 API보다 CSV/DB에 저장된 데이터가 더 유리한 경우가 많음
    
---

🎯 6단계 목표

이 단계의 목표는 딱 4가지입니다.
1. 같은 관제 화면에서 데이터 소스를 선택한다
    - `API(실시간)` 또는 `CSV(업로드)`
2. CSV 파일을 업로드하면 **DataFrame(df)** 으로 만들어 표로 보여준다
3. 5단계에서 했던 것처럼 **임계치 기반 필터링**을 똑같이 적용한다
4. 가능하면 **간단한 차트(추이)** 도 뽑아본다

즉,
> 데이터가 API든 CSV든,
> DataFrame만 만들면 관제 필터/표/차트는 똑같이 동작한다
> 이걸 몸으로 이해시키는 게 핵심입니다.

---

✅ 실습 준비
 `0)` 현재 폴더 구조 가정
	지금 관제 앱을 실행하던 폴더 `day9_api/` 안에 `app.py` 파일을 생성합니다. 

 `1)` 같은 폴더에 CSV 샘플 파일 만들기 (관제 데이터 “리플레이” 용)

터미널에서 현재 폴더에 파일 생성:
```bash
code dust_sample.csv
```

`dust_sample.csv` 내용 그대로 붙여넣기:
```
date,station,pm10,pm2_5
2025-01-01,강남구,45,22
2025-01-01,송파구,55,30
2025-01-01,강북구,32,18
2025-01-02,강남구,60,35
2025-01-02,송파구,70,40
2025-01-02,강북구,50,28
```

> 이 파일은 “API가 정상일 때의 row(list)”를 흉내 낸 데이터라고 생각하면 됩니다.
> (station = 구 이름, pm10 = 미세먼지, date = 날짜)

---
그대로 app.py에 통째로 복붙하세요.
```python
import streamlit as st
import requests
import pandas as pd


# =====================================================
# 0) 기본 페이지 설정
# =====================================================
st.set_page_config(
    page_title="서울 미세먼지 관제 대시보드",
    page_icon="🌫️",
    layout="wide"
)

st.title("🌫️ 서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 필터링)")  # [수정] 제목에 CSV 지원 문구 추가
st.write("데이터를 가져와서 기준값(임계치)으로 위험 지역만 걸러서 보여주는 관제 화면입니다.")  # [유지]


# =====================================================
# 1) 사이드바: 관제 설정 UI
# =====================================================
st.sidebar.header("⚙️ 설정")

data_source = st.sidebar.radio(  # [추가] 데이터 소스 선택 기능(API/CSV)
    "데이터 소스 선택",
    ["API(실시간)", "CSV 업로드(브라우저)", "로컬 CSV(dust_sample.csv)"],
    index=0
)

api_key = st.sidebar.text_input(  # [수정] API 전용이 아니라, 모드에 따라 사용
    "서울 OpenAPI KEY (API 모드에서만 필요)",
    value="",
    placeholder="여기에 본인 API KEY 입력"
)

limit = st.sidebar.selectbox("가져올 데이터 개수(API 모드)", [5, 10, 20, 50], index=3)  # [유지]

threshold_pm10 = st.sidebar.slider(  # [유지]
    "PM10 임계치 (나쁨 기준)",
    min_value=0,
    max_value=150,  # [수정] 최대값 200 → 150으로 조정
    value=50,
    step=5
)

only_bad = st.sidebar.checkbox("나쁨 이상만 보기", value=True)  # [유지]

st.sidebar.divider()  # [추가] 사이드바 구분선

# CSV 업로드는 해당 모드에서만
uploaded_file = None
if data_source == "CSV 업로드(브라우저)":  # [추가]
    uploaded_file = st.sidebar.file_uploader("CSV 파일 업로드", type=["csv"])

refresh = st.sidebar.button("🔄 새로고침(재요청)")  # [유지]


# =====================================================
# 2) 데이터 로딩 함수
# =====================================================

# ✅ [권장] API 요청도 캐시하면 실무/수업에서 과도한 호출 방지에 좋음
@st.cache_data(ttl=60)
def load_from_api(api_key: str, limit: int) -> tuple[pd.DataFrame | None, str | None]:
    if not api_key.strip():  # [추가] API KEY 빈 문자열 방어
        return None, "API KEY가 비어 있습니다. 왼쪽 사이드바에 KEY를 입력하세요."

    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"

    try:  # [추가] 네트워크 예외 처리
        response = requests.get(url, timeout=10)
    except Exception as e:
        return None, f"요청 실패(네트워크/timeout 가능): {e}"

    # ✅ [권장] HTTP 코드가 200이 아닐 때는 바로 안내
    if response.status_code != 200:  # [추가] 상태 코드 체크
        return None, (
            f"HTTP 요청 실패 (status={response.status_code})\n\n"
            f"응답 미리보기:\n{response.text[:500]}"
        )

    content_type = response.headers.get("Content-Type", "")

    # ✅ [수정 - 필수] Content-Type 판별을 더 안전하게 (json; charset=utf-8 포함)
    is_json = content_type.lower().startswith("application/json")

    # 서울 OpenAPI는 인증/에러 상황에서 XML로 내려오는 경우가 많음
    if not is_json:
        preview = response.text[:500]
        return None, (
            f"JSON이 아닙니다. (Content-Type: {content_type})\n\n"
            f"응답 미리보기:\n{preview}"
        )

    try:  # [추가] JSON 파싱 예외 처리
        data = response.json()
    except Exception as e:
        return None, f"JSON 파싱 실패: {e}"

    if "airQualityAPI" not in data or "row" not in data["airQualityAPI"]:  # [수정] 키 검사 통합
        return None, f"응답 구조가 예상과 다릅니다.\n\n키 목록: {list(data.keys())}"

    rows = data["airQualityAPI"]["row"]
    df = pd.DataFrame(rows)
    return df, None  # [유지]


def load_from_uploaded_csv(uploaded_file) -> tuple[pd.DataFrame | None, str | None]:
    """[추가] 브라우저에서 업로드한 CSV를 읽는 함수"""
    if uploaded_file is None:
        return None, "CSV 파일이 업로드되지 않았습니다. 왼쪽에서 파일을 선택하세요."

    try:
        df = pd.read_csv(uploaded_file)
        return df, None
    except Exception as e:
        return None, f"CSV 읽기 실패: {e}"


def load_from_local_csv(path: str = "dust_sample.csv") -> tuple[pd.DataFrame | None, str | None]:
    """[추가] app.py와 같은 폴더에 있는 로컬 CSV를 읽는 함수"""
    try:
        df = pd.read_csv(path)
        return df, None
    except FileNotFoundError:
        return None, (
            f"로컬 CSV 파일을 찾지 못했습니다: {path}\n"
            f"👉 app.py와 같은 폴더에 {path}가 있는지 확인하세요."
        )
    except Exception as e:
        return None, f"로컬 CSV 읽기 실패: {e}"


# =====================================================
# 3) 데이터 로딩
# =====================================================
st.subheader("✅ 1) 데이터 로딩 결과")

# ✅ [권장] 새로고침 버튼 누르면 캐시 클리어
if refresh:  # [유지]
    load_from_api.clear()  # [수정] 이전 fetch_air_data.clear() → load_from_api.clear()

# [수정] 데이터 소스 종류에 따라 분기 처리
if data_source == "API(실시간)":
    df, err = load_from_api(api_key, limit)
elif data_source == "CSV 업로드(브라우저)":
    df, err = load_from_uploaded_csv(uploaded_file)
else:
    # 로컬 CSV
    df, err = load_from_local_csv("dust_sample.csv")

if err is not None:  # [유지] 에러 메시지 처리
    st.error("❌ 데이터를 가져오지 못했습니다.")
    st.write("아래 메시지를 확인하세요 (실무 관제에서도 이런 안내가 매우 중요합니다).")  # [수정] 안내 문구 강화
    st.code(err)
    st.stop()

# ✅ [권장] df가 None인 케이스 방어(예외적 상황 대비)
if df is None:  # [추가] 방어 코드
    st.error("❌ DataFrame 생성 실패(df=None).")
    st.stop()

st.success("✅ 데이터 로딩 성공 (DataFrame 생성 완료)")  # [유지]


# =====================================================
# 4) DataFrame 기본 확인
# =====================================================
st.subheader("✅ 2) DataFrame 미리보기 / 컬럼 확인")

col1, col2 = st.columns([2, 1])  # [유지]

with col1:
    st.write("📊 상위 5줄(df.head())")
    st.dataframe(df.head(), use_container_width=True)

with col2:
    st.write("📌 컬럼 목록")
    st.write(list(df.columns))


# =====================================================
# 5) 임계치 기반 필터링
# =====================================================
st.subheader("✅ 3) 관제 필터링 (임계치 이상만 보기)")

# API / CSV 컬럼 차이를 흡수
pm10_candidates = ["PM10", "pm10"]      # [추가] 컬럼 이름 후보 목록
name_candidates = ["MSRSTE_NM", "station"]  # [추가]

pm10_col = next((c for c in pm10_candidates if c in df.columns), None)  # [추가] 실제 존재하는 컬럼 찾기
name_col = next((c for c in name_candidates if c in df.columns), None)  # [추가]

if pm10_col is None:
    st.warning("⚠️ PM10 컬럼을 찾지 못했습니다. df.columns를 확인해서 컬럼명을 맞춰주세요.")
    st.stop()

# 숫자 변환
df[pm10_col] = pd.to_numeric(df[pm10_col], errors="coerce")  # [수정] 기존 PM10 → 선택된 pm10_col 사용

# 필터링
if only_bad:  # [유지]
    filtered = df[df[pm10_col] >= threshold_pm10].copy()  # [수정] 하드코드 PM10 → pm10_col
else:
    filtered = df.copy()

st.write(f"- 사용 컬럼: **{pm10_col}**")  # [추가]
st.write(f"- 필터 기준: **{pm10_col} >= {threshold_pm10}**")  # [추가]
st.write(f"- 결과 행 개수: **{len(filtered)}개**")  # [추가]

show_cols = []
if name_col is not None:  # [추가] 측정소 이름 컬럼이 있을 때만 추가
    show_cols.append(name_col)
show_cols.append(pm10_col)

if len(filtered) == 0:
    st.info("✅ 기준 이상 지역이 없습니다. (모두 양호)")
else:
    st.dataframe(
        filtered[show_cols].sort_values(by=pm10_col, ascending=False),
        use_container_width=True
    )


# =====================================================
# 6) 차트로 보기 (관제 마무리)
# =====================================================
st.subheader("✅ 4) 차트로 보기 (관제 마무리: TOP 10)")

if len(filtered) == 0:
    st.info("표시할 데이터가 없습니다. 임계치를 낮추거나 '나쁨 이상만 보기'를 해제해보세요.")
else:
    chart_df = filtered.copy()  # [유지]

    if name_col is not None:  # [추가] 이름 컬럼이 있을 때와 없을 때 분기
        chart_df = chart_df[[name_col, pm10_col]].dropna()
        chart_df = chart_df.sort_values(by=pm10_col, ascending=False).head(10)
        chart_df = chart_df.set_index(name_col)
        st.bar_chart(chart_df[[pm10_col]])
    else:
        chart_df = chart_df[[pm10_col]].dropna().sort_values(by=pm10_col, ascending=False).head(10)
        st.bar_chart(chart_df[[pm10_col]])

st.caption("✅ 정리: 데이터가 API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작합니다.")  # [추가]
```

의사코드:
```python
[0) 라이브러리 불러오기]
- streamlit: 웹 대시보드 UI 생성용
- requests: API 호출(HTTP GET 요청)용
- pandas: DataFrame(표 데이터) 처리용


[0) 기본 페이지 설정]
- 페이지 설정:
  - 제목: "서울 미세먼지 관제 대시보드"
  - 아이콘: 🌫️
  - 레이아웃: wide (가로로 넓게)

- 화면 상단에 큰 제목 출력:
  - "서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 필터링)"
- 설명 문구 출력:
  - "데이터를 가져와서 기준값(임계치)으로 위험 지역만 걸러서 보여주는 관제 화면입니다."


[1) 사이드바: 관제 설정 UI]
- 사이드바에 섹션 제목 표시: "⚙️ 설정"

- 1-1) 데이터 소스 선택 라디오 버튼
  - 라벨: "데이터 소스 선택"
  - 선택지:
    - "API(실시간)"
    - "CSV 업로드(브라우저)"
    - "로컬 CSV(dust_sample.csv)"
  - 기본값: "API(실시간)"

- 1-2) API KEY 입력칸 (텍스트 입력)
  - 라벨: "서울 OpenAPI KEY (API 모드에서만 필요)"
  - 기본값: 빈 문자열 ("")
  - placeholder: "여기에 본인 API KEY 입력"

- 1-3) API 모드에서 가져올 데이터 개수 선택
  - 라벨: "가져올 데이터 개수(API 모드)"
  - 선택지: [5, 10, 20, 50]
  - 기본 선택: 50 (index=3)

- 1-4) PM10 임계치 슬라이더
  - 라벨: "PM10 임계치 (나쁨 기준)"
  - 최소값: 0
  - 최대값: 150
  - 기본값: 50
  - step: 5
  → 이 값 이상이면 "나쁨 이상"으로 간주

- 1-5) 체크박스: "나쁨 이상만 보기"
  - 기본값: True
  → True면 필터링해서 나쁨 이상만 보여주고, False면 전체를 기준으로 사용

- 1-6) 사이드바 구분선 표시

- 1-7) CSV 업로드 UI (CSV 모드일 때만)
  - 만약 데이터 소스가 "CSV 업로드(브라우저)"라면:
    - CSV 파일 업로드 컴포넌트 보여줌
    - 파일 타입: .csv
    - 업로드된 파일을 uploaded_file 변수에 담음

- 1-8) “🔄 새로고침(재요청)” 버튼 추가
  - 나중에 API 캐시를 지우고 다시 요청할 때 사용


[2) 데이터 로딩 함수 정의]

(2-1) load_from_api(api_key, limit)
- 목적: API에서 데이터를 가져와 DataFrame으로 변환

- 캐시 기능 사용 (60초 동안 같은 요청 결과 재사용)

- 단계:
  1. api_key가 비어 있으면:
     - (None, "API KEY가 비어 있습니다") 반환

  2. 서울시 OpenAPI URL 생성:
     - "http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"

  3. try로 감싸서 GET 요청 보내기
     - 실패(네트워크 문제, timeout 등) 시:
       - (None, "요청 실패: 에러 메시지") 반환

  4. HTTP status code 확인
     - 200이 아니면:
       - (None, "HTTP 요청 실패 (status=...) + 응답 미리보기") 반환

  5. Content-Type 헤더 확인
     - 소문자로 바꾸고 "application/json"으로 시작하는지 체크
     - JSON이 아니면:
       - (None, "JSON이 아닙니다 + Content-Type + 응답 미리보기") 반환

  6. JSON 파싱 시도
     - 실패하면:
       - (None, "JSON 파싱 실패: 에러 메시지") 반환

  7. data 안에 "airQualityAPI"와 "row" 키가 둘 다 있는지 확인
     - 없으면:
       - (None, "응답 구조가 예상과 다릅니다. 키 목록: ...") 반환

  8. rows = data["airQualityAPI"]["row"]
     - rows 리스트를 DataFrame으로 변환 (df)

  9. (df, None) 반환  → 데이터 OK, 에러 없음


(2-2) load_from_uploaded_csv(uploaded_file)
- 목적: 브라우저로 업로드한 CSV 파일을 DataFrame으로 읽기

- 단계:
  1. uploaded_file이 None이면:
     - (None, "CSV 파일이 업로드되지 않았습니다") 반환
  2. try로 감싸서 pandas.read_csv(uploaded_file) 시도
     - 성공: (df, None) 반환
     - 실패: (None, "CSV 읽기 실패: 에러 메시지") 반환


(2-3) load_from_local_csv(path="dust_sample.csv")
- 목적: 로컬에 있는 CSV 파일을 DataFrame으로 읽기

- 단계:
  1. try로 감싸서 pandas.read_csv(path) 시도
     - 성공: (df, None) 반환
  2. FileNotFoundError 발생 시:
     - (None, "dust_sample.csv 못 찾았다. 같은 폴더에 있는지 확인하라") 반환
  3. 그 외 에러:
     - (None, "로컬 CSV 읽기 실패: 에러 메시지") 반환


[3) 데이터 로딩 실행]

- 화면에 소제목 출력: "1) 데이터 로딩 결과"

- 만약 새로고침 버튼이 눌렸다면:
  - load_from_api 함수의 캐시를 비운다.

- data_source 값에 따라 분기:
  1. "API(실시간)"이면:
     - load_from_api(api_key, limit) 호출 → (df, err)
  2. "CSV 업로드(브라우저)"이면:
     - load_from_uploaded_csv(uploaded_file) 호출 → (df, err)
  3. "로컬 CSV(...)"이면:
     - load_from_local_csv("dust_sample.csv") 호출 → (df, err)

- err가 None이 아니면 (즉, 에러가 있으면):
  - 빨간 에러 메시지 표시
  - 아래에 안내 문구 작성 (실무에서도 이런 에러 로그가 중요하다고 설명)
  - err 내용을 코드 블록으로 보여줌
  - st.stop()으로 이후 코드 실행 중단

- df가 None이면:
  - "DataFrame 생성 실패(df=None)" 에러 표시
  - st.stop()으로 종료

- 둘 다 괜찮으면:
  - 초록색 성공 메시지: "데이터 로딩 성공 (DataFrame 생성 완료)"


[4) DataFrame 기본 확인]

- 화면에 소제목: "2) DataFrame 미리보기 / 컬럼 확인"

- 화면을 두 컬럼(왼 2, 오른 1 비율)으로 나눈다.

- 왼쪽(col1):
  - "상위 5줄(df.head())" 라는 설명
  - df.head()를 표로 출력

- 오른쪽(col2):
  - "컬럼 목록" 설명
  - df.columns 리스트 출력


[5) 임계치 기반 필터링]

- 화면에 소제목: "3) 관제 필터링 (임계치 이상만 보기)"

- 5-1) PM10 컬럼 이름 후보 목록 준비
  - pm10_candidates = ["PM10", "pm10"]
- 5-2) 측정소 이름 컬럼 후보 목록 준비
  - name_candidates = ["MSRSTE_NM", "station"]

- 5-3) 실제 DataFrame에 존재하는 컬럼 찾기
  - pm10_col = pm10_candidates 중 df.columns에 존재하는 첫 번째 것, 없으면 None
  - name_col = name_candidates 중 df.columns에 존재하는 첫 번째 것, 없으면 None

- 5-4) 만약 pm10_col이 None이라면:
  - "PM10 컬럼을 찾지 못했습니다" 경고 출력
  - 실행 중단

- 5-5) pm10_col 컬럼을 숫자로 변환 (to_numeric, errors="coerce")
  - 문자열이면 숫자로, 안 되면 NaN

- 5-6) 필터링 로직:
  - only_bad가 True면:
    - filtered = pm10_col >= threshold_pm10 인 행들만 copy()
  - only_bad가 False면:
    - filtered = df 전체 copy()

- 5-7) 필터링 정보 표시:
  - 사용 컬럼 이름: pm10_col
  - 필터 기준: pm10_col >= threshold_pm10
  - 결과 행 개수: len(filtered)

- 5-8) 화면에 보여줄 컬럼 목록 만들기 (show_cols)
  - name_col이 있으면 먼저 넣고
  - 그 다음에 pm10_col 추가

- 5-9) filtered가 0행이면:
  - "기준 이상 지역 없음 (모두 양호)" 메시지 출력
- 그렇지 않으면:
  - filtered[show_cols]를 pm10_col 기준 내림차순 정렬해서 표로 표시


[6) 차트로 보기 (관제 마무리: TOP 10)]

- 화면에 소제목: "4) 차트로 보기 (관제 마무리: TOP 10)"

- filtered가 0행이면:
  - "표시할 데이터가 없습니다. 임계치를 낮추거나 체크박스 해제해보라" 안내문 출력

- 데이터가 있으면:
  - chart_df = filtered 복사

  - name_col이 있는 경우:
    - chart_df에서 name_col과 pm10_col만 선택
    - 결측값(NaN) 제거
    - pm10_col 기준으로 내림차순 정렬 후 상위 10개만 선택
    - name_col을 인덱스로 설정
    - bar_chart로 pm10_col 값 그리기

  - name_col이 없는 경우:
    - chart_df에서 pm10_col만 선택
    - 결측값 제거
    - pm10_col 기준 내림차순 정렬 후 상위 10개
    - bar_chart로 pm10_col 값만 그리기

- 마지막으로 캡션:
  - "데이터가 API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작한다"는 요약 문구 출력
```


실행
```bash
streamlit run app.py
```

브라우저: `http://localhost:8501`
![[Pasted image 20251220204410.png]]

1️⃣ 데이터 로딩 결과 해석

상단에 초록색 메시지:
> ✅ 데이터 로딩 성공 (DataFrame 생성 완료)

의미
- CSV(`dust_sample.csv`)가 **정상적으로 읽혔고**
- Pandas `DataFrame`으로 **문제 없이 변환 완료**
- 관제 시스템 입장에서 보면  
    👉 **“센서 데이터 수신 성공”** 상태입니다.
    
이 시점까지가 관제 시스템의 가장 기본적인 생존 조건이에요.

---

2️⃣ DataFrame 미리보기 / 컬럼 확인

보이는 데이터
상위 5줄:

|date|station|pm10|pm2_5|
|---|---|---|---|
|2025-01-01|강남구|45|22|
|2025-01-01|송파구|55|30|
|2025-01-01|강북구|32|18|
|2025-01-02|강남구|60|35|
|2025-01-02|송파구|70|40|

컬럼 목록
`["date", "station", "pm10", "pm2_5"]`

의미
- ✔ 관제에 필요한 최소 컬럼이 모두 있음
    - `station` → 관측 위치 (관제 대상)
    - `pm10` → 판단 기준 수치
- ✔ 숫자 컬럼(`pm10`)도 정상 인식됨
    
👉 “이 데이터로 관제 판단 가능” 상태입니다.

---
3️⃣ 관제 필터링 결과 해석

 설정 상태
- PM10 임계치: **50**
- 옵션: **나쁨 이상만 보기 체크**
- 사용 컬럼: `pm10`
    

필터 조건
`pm10 >= 50`

결과 요약
- 결과 행 개수: **4개**
    
|station|pm10|
|---|---|
|송파구|70|
|강남구|60|
|송파구|55|
|강북구|50|

관제 관점 해석
- 총 데이터 중 **4건이 ‘나쁨 이상’ 상태**
- 특히:
    - **송파구**: 70, 55 → 반복적으로 높음
    - **강남구**: 60 → 주의 필요
    - **강북구**: 50 → 임계치 경계
        
👉 이 화면을 본 관제 담당자는 이렇게 판단합니다:

> 송파구는 지속 감시 대상, 강남구는 단기 경보 검토, 강북구는 추세 관찰 필요

이게 바로 관제 시스템의 역할이에요.  
모든 데이터를 보는 게 아니라 “문제가 되는 것만 걸러서 보여주는 것”.

---
4️⃣ 차트 (관제 마무리: TOP 10) 해석

차트 의미
- x축: 관측 지점(station)
- y축: PM10 수치
- 값이 클수록 위험
    
해석 포인트
- 가장 높은 막대 → **송파구**
- 그 다음 → 강남구, 강북구
- 숫자 크기 차이가 **한눈에 비교 가능**
    
👉 관제에서 차트의 목적은:
- 정확한 수치 ❌
- **“어디가 제일 위험한지 한눈에 파악” ⭕**
    
---
전체 결과를 한 문장으로 정리하면
> “서울 미세먼지 데이터 중 PM10 기준 50 이상인 지역만 선별하여,  
> 현재 송파구·강남구·강북구가 관제 대상이며  
> 송파구가 가장 위험도가 높다.”

---
## 7단계(필터/정렬)

실무 관제는 항상 2단계로 움직입니다.
1. **시스템 관제(자동)**
- “PM10 임계치 이상만” 자동으로 걸러서 보여줌
- 즉, **이상치 감지**

2. 사람 관제(탐색/검증) ← 오늘 추가하는 파트
- “강남구만 보면?”
- “가장 심한 순서로 정렬하면?”
- “기준을 50→70으로 바꾸면 결과가 어떻게 달라지지?”
    즉, **원인 파악/우선순위 결정/보고서 작성** 단계
    
---

개념 정리
- **필터링(filter)**: “조건에 맞는 행만 남기기”
    - 예: `df[df["station"] == "강남구"]`
- **정렬(sort)**: “남아있는 행의 순서를 바꾸기”
    - 예: `df.sort_values("pm10", ascending=False)`
- **관제에서의 의미**
    - 필터링 = “어떤 대상을 볼지 고르기”
    - 정렬 = “우선순위를 정해서 보기”

---

전체 app.py
```python
import streamlit as st
import requests
import pandas as pd

# =====================================================
# ✅ 0) Streamlit 기본 페이지 설정
# =====================================================
st.set_page_config(
    page_title="서울 미세먼지 관제 대시보드",
    page_icon="🌫️",
    layout="wide",
)

# [수정] 제목/설명에 "탐색" 개념 추가 (이전엔 관제까지)
st.title("🌫️ 서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 관제 + 탐색)")
st.write(
    "데이터를 가져와서 DataFrame으로 만들고, 임계치 기준으로 위험 지역을 걸러본 뒤 "
    "필터/정렬로 관제 담당자처럼 탐색합니다."
)

# =====================================================
# ✅ 1) 사이드바: 데이터 소스 선택 + 관제 설정
# =====================================================
st.sidebar.header("⚙️ 설정")

# [수정] 라벨 텍스트 약간 변경 (CSV 업로드/로컬 표현 다듬기, 기본값 index=1로 CSV 모드 강조)
data_source = st.sidebar.radio(
    "데이터 소스 선택",
    ["API(실시간)", "CSV 업로드(파일)", "CSV 로컬(폴더)"],
    index=1,
)

api_key = st.sidebar.text_input(
    "서울 OpenAPI KEY (API 모드에서만 사용)",  # [수정] 설명 문구 약간 수정
    value="",
    placeholder="여기에 본인 API KEY 입력",
)

limit = st.sidebar.selectbox("가져올 데이터 개수 (API 모드)", [5, 10, 20, 50], index=3)

threshold_pm10 = st.sidebar.slider(
    "PM10 임계치 (나쁨 기준)",
    min_value=0,
    max_value=150,
    value=50,
    step=5,
)

# [수정] 체크박스 라벨에 "PM10 임계치 이상" 설명 추가
only_bad = st.sidebar.checkbox("나쁨 이상만 보기(PM10 임계치 이상)", value=True)

# [추가] 새로고침 버튼 (이전 버전에서도 있었지만, 아래에서 st.rerun과 함께 동작 방식 강화)
refresh = st.sidebar.button("🔄 새로고침(재요청)")

# =====================================================
# ✅ 2) 데이터 로딩 함수들
# =====================================================

# ✅ [추가] API 호출은 캐시 적용(과도한 요청 방지) — 이전 코드와 동일한 패턴 유지
@st.cache_data(ttl=60)
def load_from_api(api_key: str, limit: int):
    """
    API에서 JSON을 가져와 DataFrame으로 변환합니다.
    반환: (df, err)
      - 성공: (DataFrame, None)
      - 실패: (None, 에러메시지 str)
    """
    if not api_key.strip():
        return None, "API KEY가 비어 있습니다. 왼쪽 사이드바에 KEY를 입력하세요."  # [유지]

    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"

    try:
        response = requests.get(url, timeout=10)
    except Exception as e:
        return None, f"요청 실패(네트워크/timeout 가능): {e}"

    # ✅ [추가] HTTP 상태코드 방어(200이 아니면 에러 처리)
    if response.status_code != 200:
        return None, (
            f"HTTP 요청 실패 (status={response.status_code})\n\n"
            f"응답 미리보기:\n{response.text[:800]}"  # [수정] 미리보기 길이 500 → 800
        )

    content_type = response.headers.get("Content-Type", "")

    # ✅ [수정] Content-Type 판별을 이전 단계와 동일하게(더 안전)
    is_json = content_type.lower().startswith("application/json")
    if not is_json:
        preview = response.text[:800]  # [수정] 미리보기 길이 확장
        return None, (
            f"JSON이 아닙니다. (Content-Type: {content_type})\n\n"
            f"응답 미리보기(앞부분):\n{preview}"
        )

    try:
        data = response.json()
    except Exception as e:
        return None, f"JSON 파싱 실패: {e}"

    if "airQualityAPI" not in data or "row" not in data["airQualityAPI"]:
        return None, f"응답 구조가 예상과 다릅니다.\n키 목록: {list(data.keys())}"

    rows = data["airQualityAPI"]["row"]
    df = pd.DataFrame(rows)
    return df, None


def load_from_csv_upload(uploaded_file):
    """[유지] 브라우저에서 업로드한 CSV를 읽는 함수"""
    if uploaded_file is None:
        return None, "CSV 파일이 업로드되지 않았습니다. 왼쪽에서 파일을 선택하세요."

    try:
        df = pd.read_csv(uploaded_file)
        return df, None
    except Exception as e:
        return None, f"CSV 읽기 실패: {e}"


def load_from_csv_local(filename: str = "dust_sample.csv"):
    """[유지] app.py와 같은 폴더에 있는 로컬 CSV를 읽는 함수"""
    try:
        df = pd.read_csv(filename)
        return df, None
    except FileNotFoundError:
        return None, f"'{filename}' 파일을 찾을 수 없습니다. app.py와 같은 폴더에 두세요."
    except Exception as e:
        return None, f"로컬 CSV 읽기 실패: {e}"


# =====================================================
# ✅ 3) 데이터 로딩 (API / CSV)
# =====================================================
st.subheader("✅ 1) 데이터 로딩 결과")

# ✅ [수정] refresh 시 캐시 삭제 + rerun까지 수행 (이전엔 clear만)
if refresh:
    load_from_api.clear()
    st.rerun()

uploaded_file = None
if data_source == "CSV 업로드(파일)":  # [수정] 라벨 이름과 맞춤
    uploaded_file = st.sidebar.file_uploader("CSV 파일 업로드", type=["csv"])

# [수정] data_source 값에 맞게 분기 라벨 변경 (브라우저 → 파일, 로컬 → 폴더)
if data_source == "API(실시간)":
    df, err = load_from_api(api_key, limit)
elif data_source == "CSV 업로드(파일)":
    df, err = load_from_csv_upload(uploaded_file)
else:
    df, err = load_from_csv_local("dust_sample.csv")

if err is not None:
    st.error("❌ 데이터를 가져오지 못했습니다.")
    st.write("아래 메시지를 확인하세요. (실무 관제에서도 이런 안내가 매우 중요합니다.)")  # [유지]
    st.code(err)
    st.stop()

# ✅ [추가] df None 방어 (혹시 모를 예외 케이스)
if df is None:
    st.error("❌ DataFrame 생성 실패(df=None).")
    st.stop()

st.success("✅ 데이터 로딩 성공 (DataFrame 생성 완료)")

# =====================================================
# ✅ 4) DataFrame 기본 확인
# =====================================================
st.subheader("✅ 2) DataFrame 미리보기 / 컬럼 확인")

col1, col2 = st.columns([2, 1])

with col1:
    st.write("📊 상위 5줄(df.head())")
    # ✅ [수정] width="stretch" 같은 커스텀 대신 use_container_width 표준 옵션 사용
    st.dataframe(df.head(), use_container_width=True)

with col2:
    st.write("📌 컬럼 목록")
    st.write(list(df.columns))

# =====================================================
# ✅ 5) 관제 핵심: 임계치 기반 필터링
# =====================================================
st.subheader("✅ 3) 관제 필터링 (임계치 이상만 보기)")

pm10_candidates = ["PM10", "pm10"]          # [유지]
station_candidates = ["MSRSTE_NM", "station"]  # [유지]

pm10_col = next((c for c in pm10_candidates if c in df.columns), None)
station_col = next((c for c in station_candidates if c in df.columns), None)

if pm10_col is None:
    st.warning("⚠️ PM10 컬럼을 찾지 못했습니다. df.columns를 확인해서 pm10 컬럼명을 맞춰주세요.")
    st.stop()

df[pm10_col] = pd.to_numeric(df[pm10_col], errors="coerce")

if only_bad:
    filtered = df[df[pm10_col] >= threshold_pm10].copy()
else:
    filtered = df.copy()

st.write(f"- 사용 컬럼: **{pm10_col}**")
st.write(f"- 필터 기준: **{pm10_col} >= {threshold_pm10}**")
st.write(f"- 결과 행 개수: **{len(filtered)}개**")

show_cols = []
if station_col is not None:
    show_cols.append(station_col)
show_cols.append(pm10_col)

if len(filtered) == 0:
    st.info("✅ 기준 이상 지역이 없습니다. (모두 양호)")
else:
    st.dataframe(
        filtered[show_cols].sort_values(by=pm10_col, ascending=False),
        use_container_width=True,  # ✅ [수정] 통일된 출력 옵션
    )

# =====================================================
# ✅ 6) 관제 마무리: 간단 차트 TOP N
# =====================================================
st.subheader("✅ 4) 차트로 보기 (관제 마무리: TOP 10)")

if len(filtered) == 0:
    st.info("표시할 데이터가 없습니다. 임계치를 낮추거나 '나쁨 이상만 보기'를 해제해보세요.")
else:
    chart_df = filtered.copy()

    if station_col is not None:
        chart_df = chart_df[[station_col, pm10_col]].dropna()
        chart_df = chart_df.sort_values(by=pm10_col, ascending=False).head(10)
        chart_df = chart_df.set_index(station_col)
        st.bar_chart(chart_df[[pm10_col]])
    else:
        chart_df = chart_df[[pm10_col]].dropna().sort_values(by=pm10_col, ascending=False).head(10)
        st.bar_chart(chart_df[[pm10_col]])

st.caption("✅ 정리: 데이터가 API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작합니다.")

# =====================================================================
# ✅ 7) 관제 탐색: 필터링/정렬 실습 파트
# =====================================================================
st.divider()  # [추가] 관제 파트와 탐색 파트를 시각적으로 구분
st.header("🔍 5) 관제 데이터 탐색 (필터링 / 정렬)")  # [추가] 새로운 큰 섹션

# [추가] 탐색 모드 설명 텍스트(관제 vs 탐색 개념 정리)
st.write(
    """
**왜 이 단계가 필요한가?**

- 앞에서는 시스템이 임계치로 **자동 감지(관제)** 를 했습니다.
- 이제는 관제 담당자처럼 **직접 질문하며 확인(탐색/검증)** 합니다.

✅ 필터링 = “조건에 맞는 행만 남긴다”  
✅ 정렬 = “남은 행을 위험도/우선순위 순서로 본다”
"""
)

explore_df = df.copy()  # [추가] 관제용 filtered와 분리해서 탐색용 복사본 사용

# -------------------------------------------------
# 7-1) 지역 선택 필터링
# -------------------------------------------------
if station_col is None:
    st.warning("⚠️ 지역(station) 컬럼이 없어 지역 기반 탐색(필터)이 제한됩니다. CSV 컬럼명을 확인하세요.")
else:
    st.subheader("① 선택한 지역만 보기 (필터링)")  # [추가]

    stations = sorted(explore_df[station_col].dropna().unique())  # [추가]
    selected_station = st.selectbox("지역 선택", stations)        # [추가]

    station_only = explore_df[explore_df[station_col] == selected_station].copy()  # [추가]
    st.write(f"✅ **{selected_station}** 데이터만 표시합니다.")
    st.dataframe(station_only, use_container_width=True)  # ✅ [추가] 탐색용 테이블

# -------------------------------------------------
# 7-2) PM10 기준 이상 필터링(탐색용)
# -------------------------------------------------
st.subheader("② PM10 기준값을 바꿔가며 보기 (필터링)")  # [추가]

pm10_series = explore_df[pm10_col].dropna()
min_pm10 = int(pm10_series.min()) if len(pm10_series) else 0   # [추가] 슬라이더 최소값 동적 계산
max_pm10 = int(pm10_series.max()) if len(pm10_series) else 150 # [추가] 슬라이더 최대값 동적 계산

threshold_test = st.slider(
    "PM10 기준 값 선택(탐색용)",
    min_value=min_pm10,
    max_value=max_pm10,
    value=min(50, max_pm10),  # [추가] 데이터 범위 안에서 기본값 50 사용
)

high_pm10 = explore_df[explore_df[pm10_col] >= threshold_test].copy()  # [추가]
st.write(f"✅ PM10이 **{threshold_test} 이상**인 행만 표시합니다.")
st.dataframe(high_pm10, use_container_width=True)  # [추가]

# -------------------------------------------------
# 7-3) 정렬: 위험도 순으로 보기
# -------------------------------------------------
st.subheader("③ 위험도 순서로 정렬 (Sort)")  # [추가]

sort_order = st.radio(
    "정렬 순서 선택",
    ("PM10 높은 순", "PM10 낮은 순"),
    horizontal=True,  # [추가] 라디오를 가로로 배치
)

if sort_order == "PM10 높은 순":
    sorted_df = explore_df.sort_values(pm10_col, ascending=False)
else:
    sorted_df = explore_df.sort_values(pm10_col, ascending=True)

st.dataframe(sorted_df, use_container_width=True)  # [추가]

# -------------------------------------------------
# 7-4) 지역 + 정렬 조합 (필터 + 정렬)
# -------------------------------------------------
st.subheader("④ 지역 + 정렬 조합 보기 (필터 + 정렬)")  # [추가]

if station_col is None:
    st.info("지역(station) 컬럼이 없어서 조합 기능을 사용할 수 없습니다.")
else:
    c1, c2 = st.columns(2)  # [추가] 지역/정렬 옵션을 두 컬럼으로 배치

    with c1:
        station_for_combo = st.selectbox("지역 선택(조합용)", stations, key="combo_station")  # [추가]

    with c2:
        order_for_combo = st.radio(
            "정렬 순서(조합용)",
            ("PM10 높은 순", "PM10 낮은 순"),
            key="combo_order",
            horizontal=True,
        )

    combo_filtered = explore_df[explore_df[station_col] == station_for_combo].copy()  # [추가]

    if order_for_combo == "PM10 높은 순":
        combo_result = combo_filtered.sort_values(pm10_col, ascending=False)
    else:
        combo_result = combo_filtered.sort_values(pm10_col, ascending=True)

    st.write(f"✅ **{station_for_combo}** / **{order_for_combo}** 결과")
    st.dataframe(combo_result, use_container_width=True)  # [추가]

st.caption("✅ 관제 팁: 필터(대상 선택) → 정렬(우선순위) 순서로 보면, 실무 관제처럼 판단이 쉬워집니다.")  # [추가]
```

의사코드:
```python
[0) 페이지 기본 설정]

- 웹 대시보드 페이지 설정:
  - 제목: "서울 미세먼지 관제 대시보드"
  - 아이콘: 🌫️
  - 화면 레이아웃: 가로로 넓게(wide)

- 페이지 상단에 제목과 설명 표시:
  - 제목: "서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 관제 + 탐색)"
  - 설명: 
    - 데이터를 DataFrame으로 만들고
    - 임계치(기준값)로 위험 지역을 걸러보고
    - 필터/정렬로 관제 담당자처럼 “탐색”하는 대시보드


[1) 사이드바: 데이터 소스 & 관제 설정]

- 사이드바에 “⚙️ 설정” 헤더 표시

- 데이터 소스 선택 라디오 버튼:
  - 선택지:
    1) "API(실시간)"
    2) "CSV 업로드(파일)"
    3) "CSV 로컬(폴더)"
  - 기본 선택: "CSV 업로드(파일)"

- API KEY 입력 칸(텍스트 박스):
  - 라벨: "서울 OpenAPI KEY (API 모드에서만 사용)"
  - 기본값: 빈 문자열
  - placeholder: “여기에 본인 API KEY 입력”

- API 모드일 때 가져올 데이터 수 선택(드롭다운):
  - 선택지: 5, 10, 20, 50
  - 기본값: 50

- PM10 임계치 입력(슬라이더):
  - 0 ~ 150
  - 기본값: 50
  - 5 단위로 움직임

- 체크박스:
  - “나쁨 이상만 보기(PM10 임계치 이상)”
  - 기본값: 체크됨(True)
  - → 체크되면 “PM10 ≥ 임계치” 인 행만 보여주기

- “🔄 새로고침(재요청)” 버튼:
  - 나중에 API 캐시를 지우고 화면을 다시 그릴 때 사용


[2) 데이터 로딩 함수 정의]

(2-1) load_from_api(api_key, limit)

- 역할:
  - 서울 OpenAPI 호출 → JSON 응답 → DataFrame 생성
  - 결과와 에러 메시지를 함께 반환

- 동작:
  1. API KEY가 비어 있으면:
     - (None, "API KEY가 비어 있습니다") 반환

  2. 요청할 URL 생성:
     - '.../{API_KEY}/json/airQualityAPI/1/{limit}/'

  3. HTTP GET 요청 시도
     - 네트워크 에러/타임아웃 나면:
       - (None, "요청 실패: 에러 내용") 반환

  4. HTTP 상태 코드가 200이 아니면:
     - (None, "HTTP 요청 실패 + 응답 앞부분 미리보기") 반환

  5. 응답 Content-Type 확인:
     - "application/json"으로 시작하지 않으면:
       - (None, "JSON이 아님 + 응답 앞부분 미리보기") 반환

  6. JSON 파싱 시도:
     - 실패하면: (None, "JSON 파싱 실패: 에러") 반환

  7. JSON 구조에서 "airQualityAPI" 키와 그 안의 "row" 키 확인:
     - 둘 중 하나라도 없으면:
       - (None, "응답 구조가 예상과 다름 + 키 목록") 반환

  8. rows = data["airQualityAPI"]["row"] 리스트 추출

  9. rows → DataFrame으로 변환

  10. (DataFrame, None) 반환


(2-2) load_from_csv_upload(uploaded_file)

- 역할: 브라우저에서 업로드된 CSV 파일 → DataFrame

- 동작:
  1. 파일이 없으면:
     - (None, "CSV 파일이 업로드되지 않았습니다") 반환
  2. CSV 읽기 시도:
     - 성공: (DataFrame, None)
     - 실패: (None, "CSV 읽기 실패: 에러") 


(2-3) load_from_csv_local(filename="dust_sample.csv")

- 역할: 현재 폴더에 있는 CSV 파일 → DataFrame

- 동작:
  1. filename 경로에서 CSV 읽기 시도:
     - 성공: (DataFrame, None)
  2. 파일이 없으면:
     - (None, "'dust_sample.csv' 파일을 찾을 수 없습니다") 반환
  3. 다른 에러 발생 시:
     - (None, "로컬 CSV 읽기 실패: 에러") 반환


[3) 실제 데이터 로딩 진행]

- 화면에 소제목:
  - "✅ 1) 데이터 로딩 결과"

- 만약 “새로고침” 버튼이 눌렸다면:
  - API 캐시(load_from_api)를 지우고
  - 페이지를 다시 실행(st.rerun)

- CSV 업로드 모드일 경우:
  - 사이드바에 CSV 업로드 위젯 띄움
  - 선택된 파일 객체를 uploaded_file에 저장

- 선택된 data_source 값에 따라 분기:

  1) "API(실시간)" 이면:
     - load_from_api(api_key, limit) 호출 → (df, err)

  2) "CSV 업로드(파일)" 이면:
     - load_from_csv_upload(uploaded_file) 호출 → (df, err)

  3) "CSV 로컬(폴더)" 이면:
     - load_from_csv_local("dust_sample.csv") 호출 → (df, err)

- 만약 err 가 None이 아니라면:
  - 빨간 에러 메시지 박스 표시
  - “실무 관제에서도 이런 안내 중요”라는 설명 출력
  - err 내용을 코드블록으로 보여주고
  - 실행 중단

- df 가 None이면:
  - “DataFrame 생성 실패(df=None)” 에러 출력
  - 실행 중단

- 문제 없으면:
  - “데이터 로딩 성공” 성공 메시지 출력


[4) DataFrame 기본 구조 확인]

- 소제목: "✅ 2) DataFrame 미리보기 / 컬럼 확인"

- 화면을 두 컬럼으로 나눔: 왼쪽(2), 오른쪽(1)

- 왼쪽:
  - 텍스트: "📊 상위 5줄(df.head())"
  - df.head()를 표로 출력

- 오른쪽:
  - 텍스트: "📌 컬럼 목록"
  - df.columns 리스트 출력


[5) 관제 핵심: 임계치 기반 필터링]

- 소제목: "✅ 3) 관제 필터링 (임계치 이상만 보기)"

- PM10 컬럼 후보 이름 목록:
  - ["PM10", "pm10"]

- 지역(측정소) 컬럼 후보 이름 목록:
  - ["MSRSTE_NM", "station"]

- 실제 df.columns 안에 있는 컬럼을 위 후보에서 하나씩 찾아서:
  - pm10_col 에 할당 (없으면 None)
  - station_col 에 할당 (없으면 None)

- 만약 pm10_col 이 None이면:
  - “PM10 컬럼을 찾지 못했습니다” 경고 후 실행 중단

- pm10_col 열을 숫자형으로 변환 (문자 → 숫자, 못 바꾸면 NaN)

- 나쁨 이상 체크 여부에 따라 필터링:
  - only_bad == True:
    - filtered = PM10 값이 threshold_pm10 이상인 행들만 복사
  - only_bad == False:
    - filtered = df 전체 복사

- 필터링 요약 정보 출력:
  - 사용 컬럼 이름
  - 사용한 임계치
  - 필터링 결과 행 개수

- 화면에 보여줄 컬럼 목록 show_cols 만들기:
  - station_col 이 있으면 먼저 넣고
  - 그 다음 pm10_col 추가

- filtered의 길이가 0이면:
  - “기준 이상 지역 없음(모두 양호)” 안내

- 아니면:
  - filtered[show_cols] 를 PM10 내림차순으로 정렬한 표를 출력


[6) 관제 마무리: TOP 10 차트]

- 소제목: "✅ 4) 차트로 보기 (관제 마무리: TOP 10)"

- 만약 filtered가 비어 있으면:
  - “표시할 데이터가 없습니다. 임계치를 낮춰보세요” 안내

- 데이터가 있으면:
  - chart_df = filtered 복사

  - station_col 이 있으면:
    - station_col, pm10_col 두 컬럼만 선택
    - NaN 제거
    - pm10_col 기준 내림차순 정렬 후 상위 10개
    - station_col을 인덱스로 설정
    - 막대 그래프로 PM10 보여주기

  - station_col 이 없으면:
    - pm10_col만 써서 내림차순 TOP 10 막대 그래프

- 아래에 요약 캡션:
  - “API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작한다”


[7) 관제 데이터 ‘탐색’ 실습 파트]

- 구분선 표시
- 큰 제목: "🔍 5) 관제 데이터 탐색 (필터링 / 정렬)"

- 설명 텍스트:
  - 앞부분은 시스템이 임계치로 자동 감지(관제)
  - 이제는 사람이 직접 필터/정렬하면서 탐색/검증
  - 필터링 = 조건에 맞는 행만 남김
  - 정렬 = 남은 행의 우선순위(위험도) 정렬

- explore_df = df 복사 (관제용 filtered와는 별개로 사용)


(7-1) 지역 선택 필터링

- station_col 이 없으면:
  - 지역 기반 탐색 불가 안내

- 있으면:
  - 소제목: "① 선택한 지역만 보기 (필터링)"
  - station_col의 고유값 목록을 stations로 만듦
  - 드롭다운으로 지역 하나 선택
  - explore_df에서 해당 지역만 남긴 station_only 생성
  - “선택한 지역 데이터만 표시합니다” 문구와 함께 표 출력


(7-2) PM10 기준값을 바꿔가며 보기 (탐색용 필터)

- 소제목: "② PM10 기준값을 바꿔가며 보기 (필터링)"

- pm10_series = explore_df[pm10_col] 에서 NaN 제거한 값들

- 슬라이더 범위 계산:
  - 최소값 = pm10_series 최소값 (없으면 0)
  - 최대값 = pm10_series 최대값 (없으면 150)

- 슬라이더:
  - "PM10 기준 값 선택(탐색용)"
  - min_pm10 ~ max_pm10
  - 기본값은 (50과 max_pm10 중 작은 값)

- high_pm10 = 해당 기준 이상인 행들만 모은 DataFrame

- “PM10이 선택값 이상인 행만 표시합니다” 문구와 함께 표 출력


(7-3) 정렬: 위험도 순 보기

- 소제목: "③ 위험도 순서로 정렬 (Sort)"

- 라디오 버튼:
  - "PM10 높은 순"
  - "PM10 낮은 순"
  - 가로 배치

- 선택값에 따라 explore_df를 PM10 기준으로 오름/내림차순 정렬한 sorted_df 생성

- sorted_df 전체를 표로 출력


(7-4) 지역 + 정렬 조합 (필터 + 정렬)

- 소제목: "④ 지역 + 정렬 조합 보기 (필터 + 정렬)"

- station_col 이 없으면:
  - “지역 컬럼 없어서 조합 기능 사용 불가” 안내

- 있으면:
  - 두 개의 컬럼 레이아웃 만들기 (왼쪽: 지역, 오른쪽: 정렬 순서)

  - 왼쪽:
    - “지역 선택(조합용)” 드롭다운으로 stations 중 하나 선택

  - 오른쪽:
    - “정렬 순서(조합용)” 라디오 버튼:
      - "PM10 높은 순" / "PM10 낮은 순"

  - combo_filtered = 해당 지역만 필터링한 DataFrame

  - 정렬 순서에 따라 combo_filtered를 정렬 → combo_result

  - “선택한 지역 / 정렬 순서 결과” 문구 + combo_result 표 출력

- 마지막에 캡션:
  - “관제 팁: 필터(대상 선택) → 정렬(우선순위) 순서로 보면 실무 관제처럼 판단이 쉬워진다”
```

실행
```bash
streamlit run app.py
```

![[Pasted image 20251220211105.png]]

---

## 관제 대시보드 화면 구성

🎯 목표 (한 문장)
> 외부 데이터(API 또는 CSV)를 받아 DataFrame으로 만들고,  
> 임계치 기준으로 위험만 선별해 사람이 판단할 수 있는 관제 대시보드 화면을 완성한다.

---
✅ 이 단계에서 완성의 기준
	여기서 말하는 완성은 기능을 많이 넣는 것이 아닙니다.  

다음 질문에 모두 “YES” 라고 답할 수 있으면 완성입니다.
- ❓ 데이터가 API든 CSV든 같은 화면에서 처리되는가
- ❓ 정상 데이터 / 이상 데이터가 구분되어 보이는가
- ❓ API가 실패해도 화면이 깨지지 않고 이유를 설명하는가
- ❓ 사람이 보고 판단할 수 있는 정보만 강조되어 있는가
    
이것이 실무에서 말하는 운영 가능한 관제 화면의 최소 조건입니다.

---
### 🧭 7단계까지 우리가 이미 만든 것

현재 코드는 이미 아래를 완성했습니다.
- API / CSV 로딩 → DataFrame
- 임계치 필터링(only_bad)
- 위험 목록 표 출력
- TOP10 차트
- 탐색(필터/정렬) 기능까지 구현
    
✅ 즉, “데이터 관제 + 탐색”의 핵심 구조까지 작성되었습니다.

---

### 8단계 – 관제 화면답게 만들기

7단계까지는 데이터를 보여주는 앱이라면,  
8단계부터는 관제 화면(운영 가능)이 되기 위해 아래 2가지를 보완합니다.

1. 상단 상태 요약(메트릭) 추가: 관제 담당자가 지금 상황을 바로 판단
2. 에러 안내/대체 흐름 강화: API 실패해도 화면이 설명 가능한 상태로 유지

---
### 관제 화면의 역할을 코드로 드러내기

❌ 관제 화면이 아닌 것
- 모든 데이터를 전부 나열하는 화면
- 예쁘지만 의미 없는 차트
- 클릭은 많지만 판단이 어려운 UI

✅ 관제 화면의 진짜 역할
- 정상 데이터는 넘기고,  
- 이상 데이터만 강조해서  
- 사람이 빠르게 판단하도록 돕는 화면

이 역할을 코드와 화면 구조로 명확히 드러내는 것이 8단계의 목표입니다.

---
### 🧩 관제 대시보드 기본 화면 구성

관제 담당자는 표를 보기 전에 “지금 위험한가?”를 먼저 확인합니다.
그래서 가장 위에 아래 3개를 숫자로 요약합니다.
- 전체 데이터 개수
- 위험(기준 초과) 개수
- 상태(정상/주의/경고)

1️⃣ 상단 – 현재 상태 요약
- 전체 데이터 개수
- 기준 초과(위험) 데이터 개수
- 현재 정상 / 주의 / 경고 같은 상태 메시지
    
👉 한눈에 지금 상황이 어떤지 알기 위함

✅ 추가 코드 :
```python
# =====================================================
# ✅ 5) 관제 핵심: 임계치 기반 필터링
# =====================================================
st.subheader("✅ 3) 관제 필터링 (임계치 이상만 보기)")

pm10_candidates = ["PM10", "pm10"]
#......코드생략
```
⚠️ 이 줄 “바로 아래”에 넣으면 화면 흐름이 자연스럽습니다.

✅ [추가] 1️⃣ 상단 상태 요약 코드
```python
# =====================================================
# ✅ 5-0) 관제 핵심: 임계치 기반 필터링
# =====================================================
st.subheader("📌 현재 관제 상태 요약")

total_count = len(df)
bad_count = len(filtered)

c1, c2, c3 = st.columns(3)

with c1:
    st.metric("전체 데이터 수", total_count)

with c2:
    st.metric(f"PM10 ≥ {threshold_pm10} 지역 수", bad_count)

with c3:
    # 위험 비율로 상태 표현(단순한 룰)
    if bad_count == 0:
        st.success("상태: 정상")
    elif bad_count < total_count * 0.3:
        st.warning("상태: 주의")
    else:
        st.error("상태: 경고")
```

의사코드:
```python
[1] 섹션 제목 표시
- 화면에 소제목으로 "📌 현재 관제 상태 요약"을 보여준다.


[2] 기본 숫자 계산
- total_count = 전체 데이터 개수 (df의 행 수)
- bad_count   = 임계치 이상(나쁨 이상)으로 필터된 데이터 개수 (filtered의 행 수)


[3] 화면을 3개의 가로 칸으로 나눈다
- c1, c2, c3 = 3개의 컬럼 영역


[4] 첫 번째 칸(c1): 전체 데이터 수 표시
- c1 영역 안에서:
    - 라벨: "전체 데이터 수"
    - 값  : total_count
    - 대시보드용 지표(metric) 형태로 출력


[5] 두 번째 칸(c2): 나쁨 이상 지역 수 표시
- c2 영역 안에서:
    - 라벨: "PM10 ≥ (임계치) 지역 수"
    - 값  : bad_count
    - 여기서 (임계치)는 threshold_pm10 값 그대로 보여준다.


[6] 세 번째 칸(c3): 전체 상태 라벨 표시
- c3 영역 안에서, bad_count와 total_count를 비교해서 상태를 정한다.

    - 만약 bad_count == 0 이라면:
        - "상태: 정상" 이라는 초록색(success) 박스를 보여준다.

    - 그렇지 않고 bad_count가 전체의 30% 미만이라면:
        - "상태: 주의" 라는 노란색(warning) 박스를 보여준다.

    - 그 외(나쁨 이상 비율이 30% 이상)라면:
        - "상태: 경고" 라는 빨간색(error) 박스를 보여준다.


[정리]
- 이 블록은:
    - “전체 데이터 수”
    - “나쁨 이상 데이터 수”
    - “현재 상태를 한 단어로 표현(정상/주의/경고)”
  를 한눈에 보여주는 **관제 요약 헤더** 역할을 한다.
```


현재 관제상태 요약 추가전
![[Pasted image 20251221172300.png]]

현재 관제상태 요약 추가후
![[Pasted image 20251221172309.png]]

---
2️⃣ 기준(임계치) 조절 영역

- PM10 기준값 슬라이더
- 나쁨 이상만 보기 체크박스
    
👉 사람이 상황에 따라 기준을 바꿔가며 판단 (이미 코드에 구현이 되어 있음)

PM10 기준값 슬라이더
```python
threshold_pm10 = st.sidebar.slider(
    "PM10 임계치 (나쁨 기준)",
    min_value=0,
    max_value=150,
    value=50,
    step=5,
)
```

나쁨 이상만 보기 체크박스
```python
only_bad = st.sidebar.checkbox("나쁨 이상만 보기(PM10 임계치 이상)", value=True)
```

그리고 실제 필터링은 여기서 적용돼요:
```python
if only_bad:
    filtered = df[df[pm10_col] >= threshold_pm10].copy()
else:
    filtered = df.copy()
```
➡️ 체크 ON: 임계치 이상만 남김  
➡️ 체크 OFF: 전체 데이터를 그대로 둠

---
3️⃣ 위험 목록 (핵심)
- 기준 이상 데이터만 필터링된 표
- 위치 + 수치 중심 (불필요한 컬럼 제거)
    
👉 관제 화면의 핵심
	지금 당장 봐야 할 대상이 누구인가?

위의 코드에서 이 부분이 이미 관제의 핵심 역할을 수행합니다.
```python
st.dataframe(
    filtered[show_cols].sort_values(by=pm10_col, ascending=False),
    use_container_width=True
)
```

관제 관점 설명
- 전체 데이터가 아니라
- 지금 당장 봐야 할 위험 대상 목록만 남긴다
- PM10 내림차순 = 우선순위 정렬

기준 이상 데이터만 필터링된 표
```python
if only_bad:
    filtered = df[df[pm10_col] >= threshold_pm10].copy()
```
임계치(`threshold_pm10`)를 넘은 데이터만 `filtered`에 남김

---
4️⃣ 차트 영역 (보조 판단: TOP10)

위의 코드에서 이 부분도 관제 목적에 딱 맞게 구성되어 있습니다.
```python
st.bar_chart(chart_df[[pm10_col]])
```

왜 차트가 필요한가?
- 숫자표는 정확한 값에 유리
- 차트는 비교에 유리  
    👉 위험도가 높은 지역이 눈으로 바로 보임

---
5️⃣ 에러/대체 안내 영역 (운영 필수)

이 부분도 이미 실무 관제 방식으로 구현하셨습니다.
```python
if err is not None:
    st.error("❌ 데이터를 가져오지 못했습니다.")
    st.code(err)
    st.stop()
```

실무에서는 API가 자주 깨집니다.
- 인증키 만료
- 서버 장애
- 응답 포맷 변경
- 타임아웃
    
그래서 관제 시스템의 완성 기준은:

> ❌ “에러가 안 나는 코드”  
> ⭕ “에러가 나도, 이유를 설명하고 화면이 유지되는 코드”

---

### 새로고침 버튼(refresh)을 “의도적으로” 동작하게 만들기
 
현재 코드에는 이미 아래 버튼이 있습니다.
```python
refresh = st.sidebar.button("🔄 새로고침(재요청)")
```
하지만 이런 의문이 생깁니다.
> 버튼을 눌렀는데… 정말 다시 API를 호출한 건지 잘 모르겠어요.
> 그 이유는 Streamlit의 기본 동작 방식 때문입니다.

🧠 Streamlit의 기본 동작 원리 (중요)
- Streamlit 앱은  
    👉 위에서 아래로 스크립트를 다시 실행하는 구조입니다.
- 버튼을 누르면 사실상 재실행은 이미 일어나고 있습니다.
    
❗ 하지만
- 코드 흐름상 버튼을 눌렀기 때문에 다시 실행한다는 의도가 코드에 명시적으로 보이지 않습니다.
- 그래서 학습 단계에서는 동작이 불분명하게 느껴집니다.

코드 추가하기
```python
if refresh:
    st.rerun()
```
이 코드는 이렇게 읽으면 됩니다 👇
> 사용자가 ‘새로고침’ 버튼을 눌렀다면  
> 이 앱을 지금 즉시 처음부터 다시 실행하라

```python
# =====================================================
# 1) 사이드바: 데이터 소스 & 관제 설정
# =====================================================
st.sidebar.header("⚙️ 설정")
# ..... 기존코드


# ✅ 새로고침 버튼
refresh = st.sidebar.button("🔄 새로고침(재요청)")

# ✅ 버튼을 눌렀을 때 즉시 rerun(강제 재실행)
if refresh:
    st.rerun()
```
👉 이 위치에 조건문을 추가하는 이유:
- 아직 데이터 로딩(API/CSV)이 시작되기 전
- 버튼 클릭 → 즉시 앱 전체 재실행
- “재요청”이라는 개념이 코드 흐름상 명확해짐

🔄 이 한 줄이 만들어주는 차이
❌ 기존 (버튼만 있을 때)
- 버튼을 눌러도  
    → “지금 이 버튼이 뭘 했는지” 초보자가 체감하기 어려움
- Streamlit 내부 동작을 암묵적으로 의존
    
⭕ 개선 후 (`st.rerun()` 추가)
- 버튼 클릭 = 앱을 다시 시작
- API 재호출 / CSV 재로딩이 명확
- 관제 시스템에서 말하는  
    “재요청 / 새로고침” 개념을 정확히 적용

코드를 추가하면 브라우저에서는 
- 화면 깜빡임 ❌
- 새 메시지 ❌
- 상태 변화 ❌
👉 아무 변화가 없어 보이는 게 맞습니다

그럼 왜 이 코드를 “굳이” 넣을까?
	이건 개념 학습 + 실무 대비용 코드입니다

지금은 버튼을 눌러도 자동으로 다시 실행되기 때문에  
`st.rerun()`이 눈에 띄지 않는다.

하지만 캐시, 세션 상태, 조건부 로딩이 들어가는 순간  
이 한 줄이 진짜 ‘강제 재요청 버튼’ 이 된다.

F5는 브라우저를 전체 새로고침하는 역할
`st.rerun()` 버튼 👉 Streamlit 앱만 다시 실행

`st.rerun()` 버튼은 무엇을 하나?
```python
if refresh:
    st.rerun()
```
이건:
- 브라우저는 그대로
- 서버 연결 유지
- 현재 세션 안에서
- 파이썬 스크립트만 다시 실행
    
📌 쉽게 말해:
	앱 내부에서 새로고침

비교 대상:
1. F5 (브라우저 새로고침)
2. 버튼만 있고 `if refresh:` 없는 경우
3. 버튼 + `if refresh: st.rerun()` 있는 경우

|구분|F5(브라우저 새로고침)|버튼만 있음|버튼 + `if refresh: st.rerun()`|
|---|---|---|---|
|클릭 대상|브라우저|Streamlit 위젯|Streamlit 위젯|
|코드 재실행|⭕ (서버 재연결 포함 가능)|⭕ (Streamlit이 자동 재실행)|⭕ (즉시 재실행 강제)|
|“강제 재실행” 의도|개발자 제어 밖|❌ (자동 동작에 의존)|⭕ (코드에 의도가 명시됨)|
|세션 유지|❌ (초기화될 수 있음)|⭕|⭕|
|`st.session_state` 유지|❌ (초기화될 수 있음)|⭕|⭕|
|캐시 제어(예: `st.cache_data`)|❌|❌|⭕ (캐시 비우고 재요청 같은 패턴 가능)|
|실무 관제에서 “재요청 버튼” 의미|애매함|애매함|명확함|
핵심은 이거예요:  
지금 단계에서는 버튼만 있어도 재실행이 되기 때문에 “겉으로 티가 안 나는 게 정상”이고,  
나중에 `cache` / `session_state` / “조건부 로딩”이 들어오면 `st.rerun()`이 진짜로 의미가 커집니다.


최종코드:
`app.py`
```python
import streamlit as st
import requests
import pandas as pd

# =====================================================
# ✅ 0) Streamlit 기본 페이지 설정
# =====================================================
st.set_page_config(
    page_title="서울 미세먼지 관제 대시보드",
    page_icon="🌫️",
    layout="wide",
)

st.title("🌫️ 서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 관제 + 탐색)")  # [수정] 제목에 '탐색' 단계까지 포함
st.write(
    "데이터를 가져와서 DataFrame으로 만들고, 임계치 기준으로 위험 지역을 걸러본 뒤 "
    "필터/정렬로 관제 담당자처럼 탐색합니다."
)

# =====================================================
# ✅ 1) 사이드바: 데이터 소스 선택 + 관제 설정
# =====================================================
st.sidebar.header("⚙️ 설정")

data_source = st.sidebar.radio(
    "데이터 소스 선택",
    ["API(실시간)", "CSV 업로드(파일)", "CSV 로컬(폴더)"],  # [수정] 라벨 문구 약간 정리
    index=1,  # [수정] 기본값을 CSV 업로드(파일)로 변경 (학습용 CSV 실습 강조)
)

api_key = st.sidebar.text_input(
    "서울 OpenAPI KEY (API 모드에서만 사용)",  # [수정] 설명 문구 보완
    value="",
    placeholder="여기에 본인 API KEY 입력",
)

limit = st.sidebar.selectbox("가져올 데이터 개수 (API 모드)", [5, 10, 20, 50], index=3)

threshold_pm10 = st.sidebar.slider(
    "PM10 임계치 (나쁨 기준)",
    min_value=0,
    max_value=150,
    value=50,
    step=5,
)

only_bad = st.sidebar.checkbox("나쁨 이상만 보기(PM10 임계치 이상)", value=True)  # [수정] 설명 문구에 '임계치 이상' 추가

refresh = st.sidebar.button("🔄 새로고침(재요청)")  # [유지]

# ✅ 버튼을 눌렀을 때 즉시 rerun(강제 재실행)
if refresh:                     # [추가] 즉시 재실행을 위한 첫 번째 rerun 처리
    st.rerun()                  # [추가] 버튼 클릭 시 전체 스크립트를 다시 실행


# =====================================================
# ✅ 2) 데이터 로딩 함수들
# =====================================================

# ✅ API 호출은 캐시 적용(과도한 요청 방지)
@st.cache_data(ttl=60)
def load_from_api(api_key: str, limit: int):
    """
    API에서 JSON을 가져와 DataFrame으로 변환합니다.
    반환: (df, err)
      - 성공: (DataFrame, None)
      - 실패: (None, 에러메시지 str)
    """
    if not api_key.strip():
        return None, "API KEY가 비어 있습니다. 왼쪽 사이드바에 KEY를 입력하세요."

    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"

    try:
        response = requests.get(url, timeout=10)
    except Exception as e:
        return None, f"요청 실패(네트워크/timeout 가능): {e}"

    # ✅ HTTP 상태코드 방어(200이 아니면 에러 처리)
    if response.status_code != 200:
        return None, (
            f"HTTP 요청 실패 (status={response.status_code})\n\n"
            f"응답 미리보기:\n{response.text[:800]}"  # [수정] 미리보기 길이 500 → 800으로 확장
        )

    content_type = response.headers.get("Content-Type", "")

    # ✅ Content-Type 판별 (json; charset=utf-8 포함까지 고려)
    is_json = content_type.lower().startswith("application/json")
    if not is_json:
        preview = response.text[:800]  # [수정] 미리보기 길이 500 → 800
        return None, (
            f"JSON이 아닙니다. (Content-Type: {content_type})\n\n"
            f"응답 미리보기(앞부분):\n{preview}"
        )

    try:
        data = response.json()
    except Exception as e:
        return None, f"JSON 파싱 실패: {e}"

    if "airQualityAPI" not in data or "row" not in data["airQualityAPI"]:
        return None, f"응답 구조가 예상과 다릅니다.\n키 목록: {list(data.keys())}"

    rows = data["airQualityAPI"]["row"]
    df = pd.DataFrame(rows)
    return df, None


def load_from_csv_upload(uploaded_file):
    """브라우저에서 업로드한 CSV를 읽는 함수"""
    if uploaded_file is None:
        return None, "CSV 파일이 업로드되지 않았습니다. 왼쪽에서 파일을 선택하세요."

    try:
        df = pd.read_csv(uploaded_file)
        return df, None
    except Exception as e:
        return None, f"CSV 읽기 실패: {e}"


def load_from_csv_local(filename: str = "dust_sample.csv"):
    """app.py와 같은 폴더에 있는 로컬 CSV를 읽는 함수"""
    try:
        df = pd.read_csv(filename)
        return df, None
    except FileNotFoundError:
        return None, f"'{filename}' 파일을 찾을 수 없습니다. app.py와 같은 폴더에 두세요."
    except Exception as e:
        return None, f"로컬 CSV 읽기 실패: {e}"


# =====================================================
# ✅ 3) 데이터 로딩 (API / CSV)
# =====================================================
st.subheader("✅ 1) 데이터 로딩 결과")

# ✅ refresh 버튼 클릭 시 캐시 삭제 + 재실행
# (API 모드일 때 의미가 큼)
if refresh:                     # [보완] 캐시까지 삭제 후 새로고침 (위의 rerun와 중복이지만, 캐시 초기화 목적)
    load_from_api.clear()       # [추가] 기존 캐시된 API 결과를 제거
    st.rerun()                  # [유지] 재실행

uploaded_file = None
if data_source == "CSV 업로드(파일)":
    uploaded_file = st.sidebar.file_uploader("CSV 파일 업로드", type=["csv"])

# 데이터 소스 분기 처리
if data_source == "API(실시간)":
    df, err = load_from_api(api_key, limit)
elif data_source == "CSV 업로드(파일)":
    df, err = load_from_csv_upload(uploaded_file)
else:
    df, err = load_from_csv_local("dust_sample.csv")

if err is not None:
    st.error("❌ 데이터를 가져오지 못했습니다.")
    st.write("아래 메시지를 확인하세요. (실무 관제에서도 이런 안내가 매우 중요합니다.)")
    st.code(err)
    st.stop()

# ✅ df None 방어 (혹시 모를 예외 케이스)
if df is None:
    st.error("❌ DataFrame 생성 실패(df=None).")
    st.stop()

st.success("✅ 데이터 로딩 성공 (DataFrame 생성 완료)")

# =====================================================
# ✅ 4) DataFrame 기본 확인
# =====================================================
st.subheader("✅ 2) DataFrame 미리보기 / 컬럼 확인")

col1, col2 = st.columns([2, 1])

with col1:
    st.write("📊 상위 5줄(df.head())")
    # ✅ width="stretch" 같은 커스텀 대신 use_container_width 표준 옵션 사용
    st.dataframe(df.head(), use_container_width=True)  # [수정]

with col2:
    st.write("📌 컬럼 목록")
    st.write(list(df.columns))

# =====================================================
# ✅ 5) 관제 핵심: 임계치 기반 필터링
# =====================================================
st.subheader("✅ 3) 관제 필터링 (임계치 이상만 보기)")

pm10_candidates = ["PM10", "pm10"]
station_candidates = ["MSRSTE_NM", "station"]

pm10_col = next((c for c in pm10_candidates if c in df.columns), None)
station_col = next((c for c in station_candidates if c in df.columns), None)

if pm10_col is None:
    st.warning("⚠️ PM10 컬럼을 찾지 못했습니다. df.columns를 확인해서 pm10 컬럼명을 맞춰주세요.")
    st.stop()

df[pm10_col] = pd.to_numeric(df[pm10_col], errors="coerce")

if only_bad:
    filtered = df[df[pm10_col] >= threshold_pm10].copy()
else:
    filtered = df.copy()

st.write(f"- 사용 컬럼: **{pm10_col}**")
st.write(f"- 필터 기준: **{pm10_col} >= {threshold_pm10}**")
st.write(f"- 결과 행 개수: **{len(filtered)}개**")

show_cols = []
if station_col is not None:
    show_cols.append(station_col)
show_cols.append(pm10_col)

if len(filtered) == 0:
    st.info("✅ 기준 이상 지역이 없습니다. (모두 양호)")
else:
    st.dataframe(
        filtered[show_cols].sort_values(by=pm10_col, ascending=False),
        use_container_width=True,  # [수정] 출력 옵션 통일
    )

# =====================================================
# ✅ 5-0) 관제 핵심: 요약 상태 박스 추가
# =====================================================
st.subheader("📌 현재 관제 상태 요약")  # [추가] 관제 현황을 한눈에 보는 섹션 제목

total_count = len(df)        # [추가] 전체 데이터 개수
bad_count = len(filtered)    # [추가] 임계치 이상(나쁨 이상) 데이터 개수

c1, c2, c3 = st.columns(3)   # [추가] 3개의 요약 박스를 가로로 배치

with c1:
    st.metric("전체 데이터 수", total_count)  # [추가]

with c2:
    st.metric(f"PM10 ≥ {threshold_pm10} 지역 수", bad_count)  # [추가]

with c3:
    # [추가] 위험 비율에 따라 상태를 색깔로 표현 (정상/주의/경고)
    if bad_count == 0:
        st.success("상태: 정상")
    elif bad_count < total_count * 0.3:
        st.warning("상태: 주의")
    else:
        st.error("상태: 경고")


# =====================================================
# ✅ 6) 관제 마무리: 간단 차트 TOP N
# =====================================================
st.subheader("✅ 4) 차트로 보기 (관제 마무리: TOP 10)")

if len(filtered) == 0:
    st.info("표시할 데이터가 없습니다. 임계치를 낮추거나 '나쁨 이상만 보기'를 해제해보세요.")
else:
    chart_df = filtered.copy()

    if station_col is not None:
        chart_df = chart_df[[station_col, pm10_col]].dropna()
        chart_df = chart_df.sort_values(by=pm10_col, ascending=False).head(10)
        chart_df = chart_df.set_index(station_col)
        st.bar_chart(chart_df[[pm10_col]])
    else:
        chart_df = chart_df[[pm10_col]].dropna().sort_values(by=pm10_col, ascending=False).head(10)
        st.bar_chart(chart_df[[pm10_col]])

st.caption("✅ 정리: 데이터가 API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작합니다.")

# =====================================================================
# ✅ 7) 관제 탐색: 필터링/정렬 실습 파트
# =====================================================================
st.divider()  # [추가] 관제 블록과 탐색 블록 사이 구분선
st.header("🔍 5) 관제 데이터 탐색 (필터링 / 정렬)")  # [추가] 탐색 섹션 제목

# [추가] 관제 vs 탐색 개념 설명 블록
st.write(
    """
**왜 이 단계가 필요한가?**

- 앞에서는 시스템이 임계치로 **자동 감지(관제)** 를 했습니다.
- 이제는 관제 담당자처럼 **직접 질문하며 확인(탐색/검증)** 합니다.

✅ 필터링 = “조건에 맞는 행만 남긴다”  
✅ 정렬 = “남은 행을 위험도/우선순위 순서로 본다”
"""
)

explore_df = df.copy()  # [추가] 탐색용 DataFrame (filtered와 별도 복사본)

# -------------------------------------------------
# 7-1) 지역 선택 필터링
# -------------------------------------------------
if station_col is None:
    st.warning("⚠️ 지역(station) 컬럼이 없어 지역 기반 탐색(필터)이 제한됩니다. CSV 컬럼명을 확인하세요.")
else:
    st.subheader("① 선택한 지역만 보기 (필터링)")  # [추가]

    stations = sorted(explore_df[station_col].dropna().unique())  # [추가]
    selected_station = st.selectbox("지역 선택", stations)        # [추가]

    station_only = explore_df[explore_df[station_col] == selected_station].copy()  # [추가]
    st.write(f"✅ **{selected_station}** 데이터만 표시합니다.")
    st.dataframe(station_only, use_container_width=True)  # [수정] use_container_width 적용

# -------------------------------------------------
# 7-2) PM10 기준 이상 필터링(탐색용)
# -------------------------------------------------
st.subheader("② PM10 기준값을 바꿔가며 보기 (필터링)")  # [추가]

pm10_series = explore_df[pm10_col].dropna()
min_pm10 = int(pm10_series.min()) if len(pm10_series) else 0   # [추가] 슬라이더 최소값을 데이터 기반으로 설정
max_pm10 = int(pm10_series.max()) if len(pm10_series) else 150 # [추가] 슬라이더 최대값도 데이터 기반 설정

threshold_test = st.slider(
    "PM10 기준 값 선택(탐색용)",
    min_value=min_pm10,
    max_value=max_pm10,
    value=min(50, max_pm10),
)

high_pm10 = explore_df[explore_df[pm10_col] >= threshold_test].copy()  # [추가]
st.write(f"✅ PM10이 **{threshold_test} 이상**인 행만 표시합니다.")
st.dataframe(high_pm10, use_container_width=True)  # [수정] use_container_width 적용

# -------------------------------------------------
# 7-3) 정렬: 위험도 순으로 보기
# -------------------------------------------------
st.subheader("③ 위험도 순서로 정렬 (Sort)")  # [추가]

sort_order = st.radio(
    "정렬 순서 선택",
    ("PM10 높은 순", "PM10 낮은 순"),
    horizontal=True,  # [추가] 가로 방향 배치
)

if sort_order == "PM10 높은 순":
    sorted_df = explore_df.sort_values(pm10_col, ascending=False)
else:
    sorted_df = explore_df.sort_values(pm10_col, ascending=True)

st.dataframe(sorted_df, use_container_width=True)  # [수정] use_container_width 적용

# -------------------------------------------------
# 7-4) 지역 + 정렬 조합 (필터 + 정렬)
# -------------------------------------------------
st.subheader("④ 지역 + 정렬 조합 보기 (필터 + 정렬)")  # [추가]

if station_col is None:
    st.info("지역(station) 컬럼이 없어서 조합 기능을 사용할 수 없습니다.")
else:
    c1, c2 = st.columns(2)  # [추가] 옵션 UI를 2열로 배치

    with c1:
        station_for_combo = st.selectbox("지역 선택(조합용)", stations, key="combo_station")  # [추가]

    with c2:
        order_for_combo = st.radio(
            "정렬 순서(조합용)",
            ("PM10 높은 순", "PM10 낮은 순"),
            key="combo_order",
            horizontal=True,
        )

    combo_filtered = explore_df[explore_df[station_col] == station_for_combo].copy()  # [추가]

    if order_for_combo == "PM10 높은 순":
        combo_result = combo_filtered.sort_values(pm10_col, ascending=False)
    else:
        combo_result = combo_filtered.sort_values(pm10_col, ascending=True)

    st.write(f"✅ **{station_for_combo}** / **{order_for_combo}** 결과")
    st.dataframe(combo_result, use_container_width=True)  # [수정] use_container_width 적용

st.caption("✅ 관제 팁: 필터(대상 선택) → 정렬(우선순위) 순서로 보면, 실무 관제처럼 판단이 쉬워집니다.")  # [추가]
```

의사코드:
```python
[0) 페이지 기본 설정]

- Streamlit 페이지 제목/아이콘/레이아웃 설정
- 화면 상단에 제목 출력:
    "서울 미세먼지 관제 대시보드 (API / CSV → DataFrame → 관제 + 탐색)"
- 한 줄 설명 출력:
    "DataFrame으로 만들고, 임계치 기준으로 필터링하고, 필터/정렬로 탐색한다."


[1) 사이드바: 데이터 소스 + 관제 설정]

- 사이드바에 "⚙️ 설정" 제목 표시

- 데이터 소스 선택 라디오 버튼:
    옵션 1: "API(실시간)"
    옵션 2: "CSV 업로드(파일)"
    옵션 3: "CSV 로컬(폴더)"
    기본값은 "CSV 업로드(파일)"

- API KEY 입력창:
    - 레이블: "서울 OpenAPI KEY (API 모드에서만 사용)"
    - 기본값: 빈 문자열
    - placeholder: "여기에 본인 API KEY 입력"

- API 모드에서 사용할 "가져올 데이터 개수" 선택:
    - 선택지: 5, 10, 20, 50
    - 기본값: 50

- PM10 임계치 슬라이더:
    - 레이블: "PM10 임계치 (나쁨 기준)"
    - 최소: 0, 최대: 150, 기본: 50, step: 5

- 체크박스:
    - 라벨: "나쁨 이상만 보기(PM10 임계치 이상)"
    - 기본값: 체크됨(True)

- "🔄 새로고침(재요청)" 버튼 생성

- 만약 새로고침 버튼이 눌렸다면:
    - 전체 앱을 다시 실행(st.rerun)


[2) 데이터 로딩 함수 정의]

- 함수 load_from_api(api_key, limit):

    - 만약 api_key가 비어 있으면:
        - (None, "API KEY가 비어 있습니다...") 반환

    - API URL 생성:
        "http://openapi.seoul.go.kr:8088/{api_key}/json/airQualityAPI/1/{limit}/"

    - try:
        - 해당 URL로 HTTP GET 요청 (timeout=10초)
      except 예외:
        - (None, "요청 실패(네트워크/timeout 가능): ...") 반환

    - 만약 HTTP 상태코드가 200이 아니면:
        - 응답 본문 앞부분(800자)까지 잘라서 에러 메시지에 포함하고
        - (None, "HTTP 요청 실패 ... 응답 미리보기: ...") 반환

    - 응답 헤더에서 Content-Type 읽기
    - Content-Type이 "application/json"으로 시작하지 않으면:
        - 응답 텍스트 앞부분(800자)을 잘라 에러 메시지에 포함
        - (None, "JSON이 아닙니다... 응답 미리보기: ...") 반환

    - try:
        - response.json()으로 JSON 파싱
      except 예외:
        - (None, "JSON 파싱 실패: ...") 반환

    - JSON에서 "airQualityAPI" 키와 그 안의 "row" 키가 없으면:
        - (None, "응답 구조가 예상과 다릅니다...") 반환

    - rows = data["airQualityAPI"]["row"]
    - rows 리스트를 pandas DataFrame으로 변환
    - (DataFrame, None)을 반환


- 함수 load_from_csv_upload(uploaded_file):

    - 파일이 None이면:
        - (None, "CSV 파일이 업로드되지 않았습니다...") 반환

    - try:
        - pd.read_csv(uploaded_file)로 DataFrame 생성
        - (DataFrame, None) 반환
      except 예외:
        - (None, "CSV 읽기 실패: ...") 반환


- 함수 load_from_csv_local(filename="dust_sample.csv"):

    - try:
        - pd.read_csv(filename)로 DataFrame 생성
        - (DataFrame, None) 반환
      except FileNotFoundError:
        - (None, "'dust_sample.csv' 파일을 찾을 수 없습니다...") 반환
      except 기타 예외:
        - (None, "로컬 CSV 읽기 실패: ...") 반환


[3) 데이터 로딩 (사용자 선택에 따라 분기)]

- 화면에 부제목 출력: "✅ 1) 데이터 로딩 결과"

- 새로고침 버튼이 눌려있다면:
    - load_from_api에 저장된 캐시를 비우고(clear)
    - 앱을 다시 실행(st.rerun)

- uploaded_file 변수를 기본 None으로 둠

- 만약 데이터 소스가 "CSV 업로드(파일)"이면:
    - 사이드바에서 CSV 파일 업로드 위젯 생성
    - 사용자가 업로드한 파일을 uploaded_file 변수에 저장

- 데이터 소스에 따라 분기:

    1) "API(실시간)"인 경우:
        - df, err = load_from_api(api_key, limit)

    2) "CSV 업로드(파일)"인 경우:
        - df, err = load_from_csv_upload(uploaded_file)

    3) "CSV 로컬(폴더)"인 경우:
        - df, err = load_from_csv_local("dust_sample.csv")

- 만약 err가 None이 아니라면(에러 발생):

    - 빨간 에러박스에 "데이터를 가져오지 못했습니다." 출력
    - 추가 설명 텍스트 출력
    - err 내용을 코드 블록 형태로 출력
    - 앱 실행을 중지(st.stop)


- 만약 df가 None이라면 (예외 방어):

    - 에러 메시지 "DataFrame 생성 실패(df=None)." 출력
    - 앱 종료(st.stop)


- 성공 시:
    - "✅ 데이터 로딩 성공 (DataFrame 생성 완료)" 메시지 출력


[4) DataFrame 기본 확인]

- 부제목 출력: "✅ 2) DataFrame 미리보기 / 컬럼 확인"

- 화면을 두 컬럼으로 나눔 (좌:2, 우:1 비율)

- 왼쪽(col1):

    - "📊 상위 5줄(df.head())" 텍스트 출력
    - df.head() 결과를 표(DataFrame) 형태로 화면 폭에 맞춰 출력

- 오른쪽(col2):

    - "📌 컬럼 목록" 텍스트 출력
    - df.columns를 리스트로 변환해서 보여줌


[5) 관제 필터링: PM10 임계치 이상만 보기]

- 부제목 출력: "✅ 3) 관제 필터링 (임계치 이상만 보기)"

- pm10 컬럼 후보 목록 정의:
    - ["PM10", "pm10"]

- 지역(측정소 이름) 컬럼 후보 목록 정의:
    - ["MSRSTE_NM", "station"]

- df.columns 중에서 pm10 후보 중 실제 존재하는 컬럼을 하나 찾기 → pm10_col
- df.columns 중에서 station 후보 중 실제 존재하는 컬럼을 하나 찾기 → station_col

- 만약 pm10_col을 찾지 못했다면:
    - 경고 메시지 출력 ("PM10 컬럼을 찾지 못했습니다...")
    - 앱 종료

- pm10_col 컬럼을 숫자형으로 강제 변환 (문자 → 숫자, 실패 시 NaN)

- if only_bad(체크박스):

    - filtered = df에서 pm10_col 값이 threshold_pm10 이상인 행만 복사

  else:

    - filtered = df 전체 복사

- 현재 사용 중인 컬럼, 임계치, 필터 결과 행 개수 출력:
    - "- 사용 컬럼: pm10_col"
    - "- 필터 기준: pm10_col >= threshold_pm10"
    - "- 결과 행 개수: len(filtered)"

- show_cols 리스트 생성:

    - station_col이 존재하면 show_cols에 station_col 추가
    - show_cols에 pm10_col 추가

- 만약 filtered가 비어 있으면:
    - "기준 이상 지역이 없습니다(모두 양호)" 메시지 출력

- 아니면:
    - filtered에서 show_cols만 선택하고,
    - pm10_col 기준 내림차순 정렬 후
    - 표(DataFrame)로 화면 폭에 맞춰 출력


[5-0) 관제 요약 상태 박스]

- 부제목 출력: "📌 현재 관제 상태 요약"

- total_count = df 전체 행 수
- bad_count = filtered 행 수 (임계치 이상 지역 수)

- 화면을 3개의 컬럼(c1, c2, c3)으로 나눔

- 첫 번째 박스(c1):
    - st.metric으로 "전체 데이터 수"와 total_count 표시

- 두 번째 박스(c2):
    - st.metric으로 "PM10 ≥ 임계치 지역 수"와 bad_count 표시

- 세 번째 박스(c3):
    - bad_count와 total_count 비율에 따라 상태를 나눔:
        - bad_count == 0  → 초록(success) 박스: "상태: 정상"
        - 0 < bad_count < 30% * total_count → 노랑(warning) 박스: "상태: 주의"
        - 그 이상 → 빨강(error) 박스: "상태: 경고"


[6) 관제 마무리: 차트로 TOP 10 보기]

- 부제목 출력: "✅ 4) 차트로 보기 (관제 마무리: TOP 10)"

- 만약 filtered가 비어 있으면:
    - "표시할 데이터가 없습니다..." 안내 출력

- 아니면:

    - chart_df = filtered 복사

    - station_col이 존재하는 경우:
        - chart_df에서 [station_col, pm10_col] 컬럼만 사용
        - NaN 제거
        - pm10_col 기준 내림차순 정렬 후 상위 10개만 선택
        - station_col을 인덱스로 설정
        - bar_chart로 pm10_col 막대그래프 출력

    - station_col이 없으면:
        - pm10_col만 사용, NaN 제거
        - 내림차순 정렬 후 상위 10개 선택
        - bar_chart로 pm10_col 막대그래프 출력

- 캡션 출력:
    - "데이터가 API든 CSV든, DataFrame만 만들면 필터링/표/차트는 동일하게 동작합니다."


[7) 관제 데이터 탐색(필터링/정렬 실습)]

- 구분선(st.divider) 출력
- 큰 제목 출력: "🔍 5) 관제 데이터 탐색 (필터링 / 정렬)"

- 관제 vs 탐색 개념 설명 텍스트 출력:
    - 관제 = 자동 감지
    - 탐색 = 사람이 질문하면서 직접 확인
    - 필터링/정렬의 의미 설명

- explore_df = df 복사


[7-1) 지역 선택 필터링]

- 만약 station_col이 없다면:
    - "지역 컬럼이 없어 지역 기반 탐색이 제한된다" 경고 출력

- station_col이 있으면:
    - 부제목: "① 선택한 지역만 보기 (필터링)"

    - explore_df[station_col]의 고유값 목록을 정렬해서 stations 리스트 생성
    - selectbox로 stations 중 하나 선택 → selected_station

    - station_only = explore_df에서 station_col == selected_station인 행들만 복사
    - "OOO 지역 데이터만 표시합니다" 텍스트 출력
    - station_only를 표로 출력


[7-2) PM10 기준값을 바꿔가며 필터링]

- 부제목: "② PM10 기준값을 바꿔가며 보기 (필터링)"

- pm10_series = explore_df[pm10_col]에서 NaN 제거

- 최소값/최대값 계산:
    - min_pm10 = pm10_series 최소값 (없으면 0)
    - max_pm10 = pm10_series 최대값 (없으면 150)

- 슬라이더 생성:
    - 레이블: "PM10 기준 값 선택(탐색용)"
    - 범위: min_pm10 ~ max_pm10
    - 기본값: 50 또는 max_pm10 중 더 작은 값

- high_pm10 = explore_df에서 pm10_col >= threshold_test인 행들만 복사

- "PM10이 X 이상인 행만 표시" 문구 출력
- high_pm10를 표로 출력


[7-3) 정렬: 위험도 순서로 보기]

- 부제목: "③ 위험도 순서로 정렬 (Sort)"

- 정렬 순서 선택 라디오 버튼:
    - "PM10 높은 순"
    - "PM10 낮은 순"
    - 가로 배치

- 선택값에 따라:

    - "PM10 높은 순"이면:
        - sorted_df = explore_df를 pm10_col 기준 내림차순 정렬

    - "PM10 낮은 순"이면:
        - sorted_df = explore_df를 pm10_col 기준 오름차순 정렬

- sorted_df를 표로 출력


[7-4) 지역 + 정렬 조합 (필터 + 정렬)]

- 부제목: "④ 지역 + 정렬 조합 보기 (필터 + 정렬)"

- 만약 station_col이 없다면:
    - "지역 컬럼이 없어서 조합 기능 사용 불가" 안내 출력

- station_col이 있으면:

    - c1, c2 두 컬럼 레이아웃 생성

    - c1 안에서:
        - selectbox로 stations 목록 중 station_for_combo 선택

    - c2 안에서:
        - 라디오 버튼으로 order_for_combo 선택
            - "PM10 높은 순"
            - "PM10 낮은 순"

    - combo_filtered = explore_df에서 station_col == station_for_combo인 행들만 복사

    - 선택한 정렬 방향에 따라 combo_result를 pm10_col 기준으로 정렬

    - "OOO / PM10 높은/낮은 순 결과" 텍스트 출력
    - combo_result를 표로 출력

- 마지막으로 캡션 출력:
    - "관제 팁: 필터(대상 선택) → 정렬(우선순위) 순서로 보면 실무 관제처럼 판단이 쉬워진다."
```

터미널에 이런 경고가 뜹니다.
```
For `use_container_width=True`, use `width='stretch'`. For `use_container_width=False`, use `width='content'`.
2025-12-21 19:11:27.795 Please replace `use_container_width` with `width`.

`use_container_width` will be removed after 2025-12-31.
```

`use_container_width` 경고의 원인

Streamlit이 최근 버전에서
- `st.dataframe(..., use_container_width=True)` 같은 옵션을
- 곧 제거(deprecate) 하기로 결정해서
    
2025-12-31 이후 제거 예정이라고 미리 경고를 띄우는 겁니다.

그래서 Streamlit이 “이제부터는 이렇게 쓰세요”라고 안내하는 거예요:
- `use_container_width=True` → `width="stretch"`
- `use_container_width=False` → `width="content"`
    
✅ 즉, 코드가 틀려서가 아니라, Streamlit API가 바뀌는 중이라서 나는 경고입니다.

모든 코드에서
```python
use_container_width=True
```
위의 코드를

```python
width="stretch"
```
로 한 번에 수정 + 검증

바로 수정하지 말고 먼저 어디에 있는지 확인
```bash
rg "use_container_width=True"
```

결과
```
(streamlit_day8) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ rg "use_container_width=True"
Command 'rg' not found, but can be installed with:
sudo snap install ripgrep  # version 12.1.0, or
sudo apt  install ripgrep  # version 14.0.3-1
See 'snap info ripgrep' for additional versions.
(streamlit_day8) youjung@DESKTOP-PJCRMMU:~/day1_console/day9_api$ 
```

해결방법:
1단계) ripgrep 설치
```bash
sudo apt update
sudo apt install ripgrep
```

설치 확인:
```bash
rg --version
```

2단계) 다시 검색 실행
```bash
rg "use_container_width=True"
```

결과
```
seoul_air_api.py
175:    st.dataframe(df.head(), use_container_width=True)
217:        use_container_width=True,  # ✅ [수정]
300:    st.dataframe(station_only, use_container_width=True)  # ✅ [수정]
320:st.dataframe(high_pm10, use_container_width=True)  # ✅ [수정]
338:st.dataframe(sorted_df, use_container_width=True)  # ✅ [수정]
369:    st.dataframe(combo_result, use_container_width=True)  # ✅ [수정]

venv/lib/python3.12/site-packages/streamlit/hello/animation_demo.py
60:        image.image(1.0 - (n_matrix / n_matrix.max()), use_container_width=True)

venv/lib/python3.12/site-packages/streamlit/hello/dataframe_demo.py
57:            st.altair_chart(chart, use_container_width=True)

venv/lib/python3.12....
```

3단계) 한꺼번에 수정 (백업 포함)
```bash
sed -i.bak 's/use_container_width=True/width="stretch"/g' seoul_air_api.py
```

4단계) 남아있는지 재확인
```bash
rg "use_container_width" seoul_air_api.py
```

최종확인
```bash
streamlit run seoul_air_api.py
```
이제 터미널이 정상적으로 출력됩니다.
