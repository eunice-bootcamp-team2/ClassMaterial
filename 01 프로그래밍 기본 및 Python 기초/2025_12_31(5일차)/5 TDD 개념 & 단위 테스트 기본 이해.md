
### 1. TDD란?

> TDD(Test-Driven Development) = “테스트를 먼저 작성하고, 그 테스트를 통과시키는 코드를 나중에 작성하는 개발 방식”

3단계 반복:

1. **Red**: 실패하는 테스트를 먼저 작성한다.
2. **Green**: 테스트가 통과하도록 최소한의 코드를 작성한다.
3. **Refactor**: 테스트가 모두 초록불인 상태에서, 코드/테스트를 깔끔하게 정리한다.

---

### 2. 왜 TDD를 할까?

- **실수 방지**: 사소한 버그를 미리 잡는다.
- **안전한 리팩토링**: 코드를 바꿔도 테스트가 지켜보고 있어서 안심.
- **사용자 관점 설계**: “이 함수/클래스를 어떻게 사용하게 될까?”를 먼저 생각하게 만들어줌.
- **작은 단위로 개발**: 한 번에 거대한 기능이 아니라, “작은 기능” 위주로 쪼개서 개발.

### TDD가 유리한 경우

✅ 요구사항이 명확할 때
- “입력 → 출력이 분명한 기능”
- 예: 계산, 검증 로직, 데이터 변환, 비즈니스 규칙(프로그램이 반드시 지켜야하는 규칙)
```python
def add(a, b):
    return a + b
```
👉 이런 함수는  
**테스트 먼저 작성 → 구현** 흐름이 매우 잘 맞습니다.
즉 답을 미리 상상할수 있는 코드에 가장 잘 맞습니다.

예시1: 계산 로직
```python
def calc_total(price, qty):
    return price * qty
```
- 입력: price, qty
- 출력: 항상 하나의 정답
    
👉 테스트 먼저 쓰기 매우 쉬움

예시 2: 검증 로직
```python
def is_adult(age):
    return age >= 19
```
- 경우의 수가 명확함
- 경계값(18/19) 테스트 가능
    
👉 TDD에 딱 맞음

예시 3: 비즈니스 규칙
```python
def discount_rate(total):
    if total >= 100_000:
        return 0.1
    return 0
```
- “이 조건이면 이 결과”가 명확
- 정책이 코드로 고정됨
    
👉 테스트가 곧 **문서**

---
✅ 실수 비용이 큰 코드일 때
- 결제
- 포인트 / 잔액 계산
- 권한 / 인증 로직
- 데이터 정합성
    
👉 테스트가 **안전망** 역할을 합니다.
> “코드를 바꿔도, 깨졌는지 바로 알 수 있다”

---
✅ 유지보수가 중요한 프로젝트
- 팀 개발
- 장기 운영 서비스
- 기능 추가/리팩토링이 잦은 경우
    
👉 TDD의 진짜 힘은 **‘나중’** 에 나옵니다.

---
✅ 설계가 깔끔해진다
테스트를 먼저 쓰면 이런 생각을 하게 됩니다.
- 이 함수는 **입력이 뭐지?**
- 반환값은 **명확한가?**
- 외부 의존성(DB, API)이 너무 많지 않은가?
    
👉 결과적으로
- 함수가 작아지고
- 책임이 분리되고
- 테스트 가능한 구조가 됩니다

---
### TDD가 불리한 경우

❌ 처음 배우는 사람에게는 부담
- 테스트 문법 + 테스트 개념 + 구현
- **한 번에 배울 게 많음**

👉 초보자는 오히려
- “코딩이 느려졌다”
- “왜 이걸 먼저 써야 하지?” 라고 느낄 수 있습니다.
    
---
❌ UI / 화면 중심 개발에는 비효율
	결과가 ‘느낌’이거나 ‘주관’인 경우

- HTML/CSS
- 프론트엔드 화면
- 디자인 위주의 작업
```python
def render_main_page():
    ...
```
“잘 나왔는지”를 코드로 정의하기 어려움
👉 이런 영역은 눈으로 확인하는 게 더 빠른 경우가 많습니다.

---
❌ 요구사항이 자주 바뀌는 초기 단계

- 아이디어 검증
- PoC
- MVP 초반

👉 테스트를 먼저 쓰면 테스트 자체가 자주 깨지고 다시 써야 함

---
❌ 결과가 외부 환경에 크게 의존하는 경우
- API 호출
- 크롤링
- 네트워크 상태
- 시간, 랜덤값
```python
def fetch_weather():
    ...
```

👉 테스트는 가능하지만
- mock
- stub
- patch  
    이 필요해서 **난이도가 급상승**

---
❌ 정답이 하나가 아닌 경우
- 추천 시스템
- AI 예측
- 통계적 결과
```python
def recommend_items(user):
    ...
```

👉 “이게 맞다/틀리다”를  
단정하기 어려움

---
### 실무에서는 어떻게 하느냐?

👉 실무에서 100% TDD는 거의 없습니다.

대부분 이렇게 합니다 👇
🔹핵심 로직만 TDD
- 계산
- 규칙
- 검증
- 데이터 처리 함수

🔹 “나머지는 테스트를 나중에”
- 화면
- 간단 CRUD
- 관리자 UI

> 즉 TDD + 테스트 보완 방식

---
### 초보 개발자에게 추천하는 접근법

**❌ 이렇게는 하지 마세요**

- 모든 코드에 무조건 TDD
- 화면까지 테스트 먼저 작성

**⭕ 이렇게 하세요**

1. **순수 함수부터**
2. 입력/출력이 명확한 로직만
3. 작은 기능 하나에 테스트 1~2개

예시:
```python
# test_calc.py
deftest_add():
assert add(2,3) ==5
```

```python
# calc.py
defadd(a, b):
return a + b
```

👉 이 감각만 익혀도 충분합니다.

---
한 줄 정리

> TDD는 개발 속도를 빠르게 하는 기법이 아니라, 유지보수와 안정성을 높이는 설계 도구입니다. 모든 곳에 쓰는 게 아니라, 중요한 로직에 선택적으로 적용하는 것이 현실적인 접근입니다.

---

### 3. 단위 테스트(Unit Test)란?

- **하나의 함수, 하나의 메서드, 작은 기능 한 덩어리**가
    “기대한 대로 동작하는지” 자동으로 검사하는 코드.
    
- 사람이 일일이 `print()`로 확인하는 대신,
    `assert`를 사용해서 자동으로 검증.
    

---
## 4. Python에서 단위 테스트 – `unittest` 모듈
`unittest`는 **파이썬 표준 라이브러리**에 포함되어 있어서 추가 설치 없이 바로 사용 가능합니다.

##### 4-1. 기본 구조 (가장 작은 단위의 테스트 파일)

`test_example.py`
```python
import unittest

class TestSomething(unittest.TestCase):
    def test_example(self):
        # Arrange(준비)
        x = 1 + 2
        # Assert(검증)
        self.assertEqual(x, 3)

if __name__ == "__main__":
    unittest.main()
```

실행:
```bash
python3 test_example.py
```


---

##### 4-2. unittest가 테스트를 “찾는 규칙”

아래 6개만 지키면 **unittest가 자동으로 테스트를 찾고 실행**할 수 있습니다.

✅ 규칙 1) 테스트 파일명은 `test_`로 시작하면 가장 안전하다

- 추천: `test_math_utils.py`, `test_bank.py`
- 이유: `python -m unittest discover`가 기본적으로 `test*.py` 파일을 자동 탐색함

###### 자동으로 찾는 파일 예: 그래서 **`test_파일이름.py`** 가 가장 안전하고 표준이에요

| 파일명             | 발견됨? | 이유            |
| --------------- | ---- | ------------- |
| `test_math.py`  | ✅    | test로 시작함     |
| `test_bank.py`  | ✅    | test로 시작함     |
| `tests_user.py` | ❌    | test로 시작하지 않음 |
| `bank_test.py`  | ❌    | 뒤에 test가 붙음   |
| `math.py`       | ❌    | test가 없음      |

직접 실행 할 때는 왜 상관없을까?
```bash
python test_example.py
```
	이건 unittest에게 찾으라고 시키는 게 아니라, 그냥 이 파일을 직접 실행해!

왜 그래도 test_로 시작하는 걸 ==강력 추천==할까?
팀원이 아래만 치면 전체 테스트가 돌아야 하거든요:
```bash
python -m unittest discover
```

나중에 테스트가 많아지면 “직접 실행 방식”은 번거롭다
프로젝트가 이렇게 되면
```
tests/
 ├── test_users.py
 ├── test_orders.py
 ├── test_payments.py
```
하나씩 실행하는 건 너무 힘들죠

---

✅ 규칙 2) 테스트 클래스는 `unittest.TestCase`를 상속해야 한다
```python
class TestSomething(unittest.TestCase):
    ...
```

비유로 이해하기
> `unittest.TestCase` = 테스트 도구가 들어있는 가방

테스트를 하려면:
- 비교하기
- 실패/성공 표시하기
- 에러 메시지 보여주기 같은 기능이 필요하죠?

이 기능들이 전부 `TestCase` 안에 들어 있어요.
그래서 위와 같이 상속을 하면 이 클래스는 테스트 클래스야! 라고 unittest가 알아봅니다.

예시코드
```python
import unittest

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(1 + 1, 2)
```

여기서:
- `TestMath` → 테스트 묶음
- `self.assertEqual()` → TestCase 가방 안에 있는 “비교 도구”
    
만약 상속을 빼면?
```python
class TestMath:
    def test_add(self):
        self.assertEqual(1 + 1, 2)
```
- 실행하면 **에러** (assertEqual이 없음)
- unittest도 “테스트 클래스가 아니네?” 하고 무시합니다.

---

✅ 규칙 3) 테스트 메서드는 반드시 `test_`로 시작해야 실행된다
```python
def test_example(self):
    ...
```

왜 이름이 중요할까?

unittest 입장:
> “파일과 클래스 안에 있는 함수들 중에서,  
> 이름이 test로 시작하는 것만 실행해야지!”

비교예제: 정상적으로 실행됨
```python
class TestUser(unittest.TestCase):

    def test_signup(self):
        print("회원가입 테스트!")
```

실행되지 않음
```python
class TestUser(unittest.TestCase):

    def signup(self):
        print("이건 실행 안 됨!")
```
테스트를 돌려도 출력이 안 나옵니다. 
unittest가 자동으로 실행할 함수라고 알아듣게 하기 위함
테스트 함수 이름 → test_ 로 시작해야 “자동 실행”된다를 기억하세요.

---

✅ 규칙 4) 테스트는 `assert`로 “기대값 vs 실제값”을 비교해야 한다

- 핵심은 “자동 검증”입니다. `print()`로 확인하면 테스트가 아닙니다.

왜 `print()`는 테스트가 아닐까?
```python
print(add(1, 2))   # 3이 나오네?  OK인가?
```
사람이 눈으로 보고 확인해야 하죠.  
→ 실수하기 쉽고, 자동화가 안 됩니다.

테스트는 “자동으로 확인”해야 한다
```python
self.assertEqual(actual, expected)
```
- `expected` = 내가 기대하는 값
- `actual` = 코드가 실제로 만든 값

예제
```python
import unittest

def add(a, b):
    return a + b

class TestAdd(unittest.TestCase):

    def test_add_numbers(self):
        result = add(2, 3)
        self.assertEqual(result, 5)   # 기대: 5
```
👉 만약 결과가 6이라면?

> ❌ 테스트 실패  
> 에러 메시지로 “5가 아니다!”라고 알려줌

---

✅ 규칙 5) 테스트는 서로 독립적이어야 한다 (순서에 의존하지 않기)
	앞 테스트의 결과가 뒤 테스트에 영향을 주면 안 된다!

- 테스트 실행 순서는 보장되지 않을 수 있음
- “이전 테스트 결과가 다음 테스트에 영향을 주면” 좋은 테스트가 아님

✅ 좋은 예: 각 테스트에서 필요한 데이터는 그 테스트가 준비

❌ 나쁜 예 (순서에 의존)
```python
class TestList(unittest.TestCase):

    items = []

    def test_add_item(self):
        self.items.append(1)
        self.assertEqual(len(self.items), 1)

    def test_length(self):
        self.assertEqual(len(self.items), 0)   # ❌ 실패!
```
두 번째 테스트는  
👉 첫 번째 테스트가 리스트를 바꿔버려서 실패합니다.

✅ 좋은 예 — 각자 준비, 각자 검사
```python
class TestList(unittest.TestCase):

    def test_add_item(self):
        items = []
        items.append(1)
        self.assertEqual(len(items), 1)

    def test_empty_list(self):
        items = []
        self.assertEqual(len(items), 0)
```
각 테스트가 자기 것만 준비하죠

✨ 더 깔끔한 방법: `setUp()`
> “테스트를 시작하기 전에 항상 실행되는 준비 함수”
```python
class TestList(unittest.TestCase):

    def setUp(self):
        self.items = [1, 2, 3]

    def test_length(self):
        self.assertEqual(len(self.items), 3)

    def test_first_item(self):
        self.assertEqual(self.items[0], 1)
```
각 테스트마다:
1️⃣ `setUp()`이 새 리스트를 만들고  
2️⃣ 그 리스트를 갖고 테스트를 시작합니다
➡️ 그래서 서로 **절대 영향을 주지 않음**

---

✅ 규칙 6) `unittest.main()`은 “직접 실행”할 때만 필요하다
```python
if __name__ == "__main__":
    unittest.main()
```
이 파일을 직접 실행하면  여기 있는 테스트들을 전부 실행해! 라는 뜻입니다.

직접 실행할 때
```bash
python test_example.py
```
`unittest.main()`이 테스트를 돌립니다.

하지만 프로젝트 전체 테스트를 돌릴 때
```bash
python -m unittest discover
```
unittest가 자동으로 테스트 파일을 찾아 실행하므로  
`unittest.main()`이 없어도 잘 돌아갑니다.

---

##### 4-3. 테스트 실행 방법 2가지

방법 A) 파일 하나만 직접 실행 (가장 직관적)
```bash
python test_example.py
```

- 왜 테스트가 실행되나?
    - 파이썬이 “테스트 파일”이라서가 아니라,
    - `unittest.main()`이 실행되어 테스트를 찾아 돌리기 때문

---

방법 B) 폴더 안의 테스트를 한 번에 실행 (실무 기본)
```bash
python -m unittest discover
```

- 현재 폴더에서 `test*.py` 파일을 찾아서
- 그 안의 `TestCase` / `test_` 메서드를 전부 실행

---

##### 4-4. 예상 출력 해석 (시험/실무에서 매우 중요)

실행 결과 예시:
```
.
----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

- `.` : 테스트 1개 통과
- `Ran 1 test` : 테스트 1개 실행됨
- `OK` : 모두 통과

추가로 꼭 알아야 하는 출력:

- `F` : 실패(Assertion이 틀림, 기대값 ≠ 실제값)
- `E` : 에러(코드 자체가 예외로 터짐, 예: 함수 없음/타입 에러)
- `FAIL:` / `ERROR:` 아래에 원인 추적(traceback)이 나옴 → 디버깅 힌트

---

##### 4-5. 초보자용 한 줄 요약

> unittest가 테스트를 자동으로 찾는 핵심 규칙은
> 파일명 test.py + TestCase 상속 + test_ 메서드 + assert 검증 + 테스트 독립성 이다.

---
### [실전테스트] 미니 쇼핑몰 결제/회원 시스템 (unittest + TDD 실습)

### 0) 실습 목표

이 실습은 “미니 쇼핑몰 백엔드”에서 자주 나오는 기능을 예로 들어,  
단위 테스트(Unit Test)와 TDD(Red → Green → Refactor) 흐름을 경험하는 것이 목표입니다.

#### 가상 시나리오 구성
- 숫자 계산 유틸: 포인트·평균 점수 계산
- 문자열 유틸: 회원 이름 정리, 주민번호 마스킹
- 계좌/지갑: BankAccount 클래스로 입출금
- 할인 기능: `discount_price`로 할인 가격 계산

### 1) unittest 기초 문법 + 첫 테스트 파일 만들기

#### 1-1) 테스트 파일 구조 만들기

프로젝트 구조(아주 간단)
```
tdd_shop/
    venv/             
    math_utils.py
    test_math_utils.py
```

#### 1-2) WSL(Ubuntu)에서 프로젝트 폴더 생성
```bash
# 1) 홈 디렉토리로 이동
cd ~

# 2) 프로젝트 폴더 만들기
mkdir tdd_shop

# 3) 그 폴더로 이동
cd tdd_shop

# 내가 생성한 폴더로 이동
code -r .
```

####  1-2-1) venv 패키지 설치
```bash
sudo apt update
sudo apt install -y python3-venv
```

#### 1-3) 가상환경 만들기(선택이지만 추천)
```bash
# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source ./venv/bin/activate

# 가상환경 나가기
deactivate

# 프롬프트 앞에 (venv) 붙으면 성공
```

#### 1-4) 파일 생성
```bash
cd ~/tdd_shop

touch math_utils.py
touch test_math_utils.py
```

#### 1-5) 기능 코드 뼈대 만들기 – `math_utils.py`
```python
# math_utils.py
"""
숫자 관련 유틸 함수 모음
(예: 합계, 차이, 절댓값, 평균 등)
"""

def add(a, b):
    """두 수를 더한 결과를 반환합니다."""
    return a + b


def sub(a, b):
    """두 수를 뺀 결과를 반환합니다. (a - b)"""
    return a - b
```

#### 1-6) 테스트 코드 작성 – `test_math_utils.py`
```python
# test_math_utils.py

import unittest
import math_utils  # 같은 폴더에 있는 math_utils.py

class TestMathUtils(unittest.TestCase):
    def test_add(self):
        result = math_utils.add(2, 3)
        self.assertEqual(result, 5)

    def test_sub(self):
        result = math_utils.sub(10, 4)
        self.assertEqual(result, 6)


if __name__ == "__main__":
    unittest.main()
```

#### 1-7) 테스트 실행

터미널에서:
```bash
cd ~/tdd_shop
python test_math_utils.py
```

예상 출력:
```
..
----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
```
여기까지가 **“단위 테스트는 어떻게 생겼는지”** 첫 맛보기입니다.

---
### 2) 대표적인 assert 메서드들

unittest는 “기대값 vs 실제값”을 비교하는 assert 메서드들로 검증합니다. ==어서트==
```python
self.assertEqual(a, b)       # a == b
self.assertNotEqual(a, b)    # a != b
self.assertTrue(expr)        # expr가 True인지
self.assertFalse(expr)       # expr가 False인지
self.assertIn(x, seq)        # x가 seq 안에 있는지
self.assertIsNone(x)         # x is None
self.assertIsNotNone(x)      # x is not None
```

예시 해석:
- `self.assertEqual(1 + 1, 2)`
    - 실제 값: `1 + 1`
    - 기대 값: `2`
    - → “1+1이 2냐?” 체크
        
- `self.assertTrue(3 > 1)`
    - 조건식: `3 > 1`
    - → “3은 1보다 크냐?” 체크
        
- `self.assertIn("a", "apple")`
    - `"a"`가 `"apple"` 안에 들어 있냐? (True)
        
- `self.assertIsNone(None)`
    - 값이 정말 `None`이냐?

#### 2-1) assert 모음 예제 파일
```python
# test_basic_assertions.py
import unittest


class TestBasicAssertions(unittest.TestCase):
    def test_assertions(self):
        self.assertEqual(1 + 1, 2)     # 1+1=2 맞지?
        self.assertTrue(3 > 1)         # 3이 1보다 크지?
        self.assertIn("a", "apple")    # "a"가 "apple" 안에 있지?
        self.assertIsNone(None)        # 이 값은 None이지?


if __name__ == "__main__":
    unittest.main()
```

✔️ 터미널에서 실행:
```bash
python test_basic_assertions.py

# 결과
.
----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
# 네 줄의 assert...가 모두 “맞다”고 판단됐다는 뜻
```

❌ 일부러 실패시키면:
```python
self.assertEqual(1 + 1, 3)
```

실행 결과 예:
```bash
F
======================================================================
FAIL: test_assertions (__main__.TestBasicAssertions)
----------------------------------------------------------------------
Traceback (most recent call last):
  ...
AssertionError: 2 != 3
```

- `F` : 테스트는 실행됐는데, `assertEqual` 조건이 틀림
- `AssertionError: 2 != 3` : 실제값 2, 기대값 3 → 틀렸다는 메시지

---

### 실습문제 1 – 숫자 유틸 함수 TDD (my_abs, mean)

#### 목표
- `my_abs(x)` : 절댓값 함수 만들기
    
#### 테스트할 상황(케이스)
1. 양수 입력 → 그대로
2. 음수 입력 → 양수로 변환
3. 0 입력 → 0
	

실습 폴더 구조
	이번부터는 “TDD 실습 폴더”로 분리해서 진행합니다.
```
tdd_intro/     
	math_utils.py     
	test_math_utils.py
```

폴더 만들기:
```bash
cd ~/tdd_intro

touch math_utils.py
touch test_math_utils.py
```

---
### 1) [Red] 실패하는 테스트 먼저 작성 – `test_math_utils.py`

폴더 구조:
```
tdd_intro/
  math_utils.py
  test_math_utils.py
```
터미널:
```bash
cd ~/tdd_intro
ls
```

#### 1-1. 먼저 `math_utils.py`는 “my_abs가 없는 상태”로 둔다

`math_utils.py` (처음 상태)
```python
# 일부러 my_abs는 아직 만들지 않는다 (Red 단계)

def add(a, b):
    return a + b

def sub(a, b):
    return a - b
```

#### 1-2. `test_math_utils.py`에 실패할 테스트를 작성
`test_math_utils.py`를 다음처럼 작성:
```python
import unittest
import math_utils  # 같은 폴더의 math_utils.py


class TestMathUtils(unittest.TestCase):
    # 상황 1: 양수의 절댓값은 자기 자신이어야 한다.
    def test_my_abs_positive(self):
        self.assertEqual(math_utils.my_abs(10), 10)

    # 상황 2: 음수의 절댓값은 부호만 바뀐 양수여야 한다.
    def test_my_abs_negative(self):
        self.assertEqual(math_utils.my_abs(-5), 5)


if __name__ == "__main__":
    unittest.main()
```

#### 1-3. 테스트 실행 (실패 확인)
```bash
python test_math_utils.py
```
✅ 이 단계에서 “실패/에러”가 나오는 게 정상입니다.

예상 에러:
```
EE
======================================================================
ERROR: test_my_abs_positive (__main__.TestMathUtils)
...
AttributeError: module 'math_utils' has no attribute 'my_abs'
```

- 의미: `math_utils.py`에 `my_abs`가 아직 없어서, 테스트가 실행 중에 함수 호출을 못함
- **이게 Red 단계 성공**입니다. (실패를 먼저 확인)
    
> 참고: 이 실패는 `assert`가 틀린 게 아니라 “함수가 아예 없음”이라서 `ERROR(E)`로 뜹니다.

---

### 2) [Green] 최소한의 구현으로 테스트 통과시키기
이제 `math_utils.py`에 `my_abs`를 “최소 구현”으로 추가합니다.

`math_utils.py`에 `my_abs` 추가:
```python
# math_utils.py

def add(a, b):
    return a + b

def sub(a, b):
    return a - b

def my_abs(x):
    """
    절댓값 함수.
    - x가 양수/0이면 그대로 반환
    - x가 음수이면 부호를 바꿔서 반환
    """
    if x >= 0:
        return x
    else:
        return -x
```

다시 테스트 실행:
```bash
python test_math_utils.py
```

예상:
```
..
----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
```

- `.` 하나 = 테스트 1개 통과
- `OK` = 전부 통과
- **이게 Green 단계 성공**입니다.

---

### 3) [Refactor] 테스트를 추가하고, 코드를 더 깔끔하게 정리

#### 3-1. 케이스 추가(0 입력)

테스트를 한 개 더 추가합니다.

`test_math_utils.py` (Refactor 단계: 테스트 보강)
```python
import unittest
import math_utils

class TestMathUtils(unittest.TestCase):
    def test_my_abs_positive(self):
        self.assertEqual(math_utils.my_abs(10), 10)

    def test_my_abs_negative(self):
        self.assertEqual(math_utils.my_abs(-5), 5)

    def test_my_abs_zero(self):
        self.assertEqual(math_utils.my_abs(0), 0)

if __name__ == "__main__":
    unittest.main()
```

다시 실행:
```bash
python test_math_utils.py
```

예상:
```bash
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```

#### 3-2. 코드 리팩토링 (동작은 유지, 더 깔끔하게)

테스트가 있으니 마음 놓고 코드 정리합니다.

`math_utils.py` (리팩토링 버전)
```python
def add(a, b):
    return a + b

def sub(a, b):
    return a - b

def my_abs(x):
    return x if x >= 0 else -x
```

다시 실행:
```bash
python test_math_utils.py
```

테스트 재실행 → 계속 통과 → **안전한 리팩토링 경험**

---

### 4) `mean(numbers)` 함수 TDD 

🔎 어떤 상황을 테스트할까?

1. **여러 값의 평균**
    - [1, 2, 3, 4] → 2.5
        
2. **값이 하나일 때 평균**
    - [10] → 10
        
3. **값이 하나도 없을 때(빈 리스트)**
    - 평균을 낼 수 없으니 **에러를 발생시켜야 한다.**  
        (→ `ValueError`)

---
#### 4-1) [Red] 테스트 먼저 작성 (실패 확인)

`test_math_utils.py`에 **mean 테스트를 “추가”**합니다.  
(※ 아래 코드는 **my_abs 테스트 3개 + mean 테스트 3개**가 함께 있는 “완성 형태”입니다.)

`test_math_utils.py` (mean 테스트 추가 후 전체)
```python
import unittest
import math_utils


class TestMathUtils(unittest.TestCase):
    # --- my_abs 테스트들 ---
    def test_my_abs_positive(self):
        self.assertEqual(math_utils.my_abs(10), 10)

    def test_my_abs_negative(self):
        self.assertEqual(math_utils.my_abs(-5), 5)

    def test_my_abs_zero(self):
        self.assertEqual(math_utils.my_abs(0), 0)

    # --- mean 테스트들 (새로 추가) ---
    def test_mean_basic(self):
        self.assertEqual(math_utils.mean([1, 2, 3, 4]), 2.5)

    def test_mean_single_value(self):
        self.assertEqual(math_utils.mean([10]), 10)

    def test_mean_empty_list_raises_error(self):
        with self.assertRaises(ValueError):
            math_utils.mean([])


if __name__ == "__main__":
    unittest.main()
```

실행:
```bash
python test_math_utils.py
```

예상 에러:
```
...EEE
AttributeError: module 'math_utils' has no attribute 'mean'
```
- 의미: mean 테스트는 작성했는데, `math_utils.py`에 mean 함수가 아직 없어서 실패
- **이게 mean의 Red 단계 성공**입니다.
---
#### 4-2) [Green] `mean` 최소 구현 (테스트 통과)

이제 `math_utils.py`에 `mean`을 “최소 구현”으로 추가합니다.

`math_utils.py` (mean 추가 후 전체)
```python
# math_utils.py

def add(a, b):
    return a + b

def sub(a, b):
    return a - b

def my_abs(x):
    return x if x >= 0 else -x

def mean(numbers):
    """
    숫자 리스트의 평균을 구한다.
    - numbers가 비어 있으면 ValueError를 발생시킨다.
    """
    if len(numbers) == 0:
        raise ValueError("빈 리스트의 평균은 구할 수 없습니다.")
    return sum(numbers) / len(numbers)
```

다시 실행:
```bash
python test_math_utils.py
```

예상 출력:
```
......
----------------------------------------------------------------------
Ran 6 tests in 0.000s

OK
```

- 테스트 6개 = my_abs 3개 + mean 3개
- **이게 mean의 Green 단계 성공**입니다.

---
#### 4-3) [Refactor] mean도 안전하게 리팩토링

이제 mean도 더 “파이썬답게” 정리할 수 있습니다.  
테스트가 있으니 바꿔도 안전합니다.

`math_utils.py` (리팩토링 예시)
```python
def mean(numbers):
    if not numbers:
        raise ValueError("빈 리스트의 평균은 구할 수 없습니다.")
    return sum(numbers) / len(numbers)
```

다시 실행:
```bash
python test_math_utils.py
```
테스트 재실행 → 계속 통과 → **mean도 안전한 리팩토링 경험**

---

### 실습 2 – 문자열 유틸 함수 TDD (`string_utils.py`)

##### 시나리오

> “회원 이름/주민번호를 저장할 때,  
> 화면에 보여줄 때는 **정리된 이름**과 **마스킹된 주민번호**가 필요하다.”

우리가 만들 함수:
- `normalize_name(raw_name)` : 이름 문자열 정리
- `mask_ssn(ssn)` : 주민번호 마스킹

### 0) 폴더/파일 구조 확인

폴더 구조:
```
tdd_intro/
    math_utils.py
    test_math_utils.py
    string_utils.py
    test_string_utils.py
```

터미널에서 파일생성:
```bash
cd ~/tdd_intro

touch string_utils.py
touch test_string_utils.py
ls
```

### ✅ `normalize_name` TDD

🔎 테스트할 상황(케이스)

1. **앞뒤에 공백 + 중간에 여러 공백**
    - `" hong gil dong "` → `"Hong gil dong"`
        
2. **이미 깔끔한 이름**
    - `"Alice"` → `"Alice"`
        
3. **공백만 있는 입력**
    - `" "` → `""` (빈 문자열)

---

### 1) [Red] 실패하는 테스트 먼저 작성 테스트 작성 (Red)

#### 1-1) 먼저 `string_utils.py`는 “normalize_name이 없는 상태”로 둔다
```python
# 일부러 normalize_name은 아직 만들지 않는다 (Red 단계)
```

#### 1-2) `test_string_utils.py`에 실패할 테스트 작성

`test_string_utils.py`
```python
import unittest
import string_utils


class TestStringUtils(unittest.TestCase):
    # 상황 1: 이름 앞뒤 공백과 여러 칸 공백을 정리하고, 첫 글자만 대문자로 만든다.
    def test_normalize_name_basic(self):
        self.assertEqual(
            string_utils.normalize_name("  hong   gil   dong  "),
            "Hong gil dong"
        )

    # 상황 2: 이미 깔끔한 이름은 그대로 둔다.
    def test_normalize_name_already_clean(self):
        self.assertEqual(
            string_utils.normalize_name("Alice"),
            "Alice"
        )

    # 상황 3: 공백만 있는 경우는 빈 문자열로 처리한다.
    def test_normalize_name_empty_string(self):
        self.assertEqual(
            string_utils.normalize_name("   "),
            ""
        )


if __name__ == "__main__":
    unittest.main()
```

#### 1-3) 테스트 실행 (실패 확인)
```bash
python test_string_utils.py
```

예상:
```
EEE
======================================================================
ERROR: test_normalize_name_basic (__main__.TestStringUtils)
...
AttributeError: module 'string_utils' has no attribute 'normalize_name'
```
- 의미: `string_utils.py`에 `normalize_name()`이 아직 없어서 테스트가 호출을 못함
- **이게 Red 단계 성공**입니다.

---
#### 2) [Green] 최소 구현으로 테스트 통과시키기

이제 `string_utils.py`에 `normalize_name()`을 “최소 구현”으로 추가합니다.

`string_utils.py`
```python
def normalize_name(raw_name: str) -> str:
    """
    이름 문자열 정리:
    - 앞뒤 공백 제거
    - 중간 공백 여러 개는 한 칸으로
    - 전체 문자열의 첫 글자만 대문자, 나머지는 소문자
    """
    # 앞뒤 공백 제거
    name = raw_name.strip()

    # 빈 문자열 처리
    if not name:
        return ""

    # 중간 공백 여러 개 → 한 칸으로
    parts = name.split()      # 공백 기준으로 쪼개기
    name = " ".join(parts)    # "hong gil dong" 형태로 합치기

    # 첫 글자만 대문자로, 나머지는 소문자
    return name[0].upper() + name[1:].lower()
```

다시 실행:
```bash
python test_string_utils.py
```

예상:
```
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```
- `.` 3개 = 테스트 3개 통과
- **이게 Green 단계 성공**입니다.

---
#### 3) [Refactor] 리팩토링(선택)

테스트가 있으니 더 파이썬스럽게 정리해도 안전합니다.

예시(선택):
```python
def normalize_name(raw_name: str) -> str:
    name = " ".join(raw_name.strip().split())
    if not name:
        return ""
    return name[0].upper() + name[1:].lower()
```

테스트 재실행:
```bash
python test_string_utils.py
```

### 4) `mask_ssn(ssn)` TDD

> 중요: 이 파트는 “새 테스트 파일을 만드는 게 아니라”,  
> 같은 `test_string_utils.py`에 테스트를 이어서 추가하는 방식입니다.

#### 🔎 어떤 상황을 테스트할까?

-  정상 주민번호
    - `"900101-1234567"` → `"900101-*******"`
        
-  형식이 잘못된 주민번호
    - 하이픈(-)이 없거나 길이가 다름 → `ValueError`

---

### 5) [Red] 테스트 먼저 작성 (실패 확인)

`test_string_utils.py`에 **mask_ssn 테스트를 추가**합니다.  
(※ 아래 코드는 “normalize_name 테스트 3개 + mask_ssn 테스트 2개”가 같이 있는 완성 형태)

`test_string_utils.py` (전체)
```python
import unittest
import string_utils


class TestStringUtils(unittest.TestCase):
    # --- normalize_name 테스트들 ---
    def test_normalize_name_basic(self):
        self.assertEqual(
            string_utils.normalize_name("  hong   gil   dong  "),
            "Hong gil dong"
        )

    def test_normalize_name_already_clean(self):
        self.assertEqual(
            string_utils.normalize_name("Alice"),
            "Alice"
        )

    def test_normalize_name_empty_string(self):
        self.assertEqual(
            string_utils.normalize_name("   "),
            ""
        )

    # --- mask_ssn 테스트들 (새로 추가) ---
    def test_mask_ssn_basic(self):
        result = string_utils.mask_ssn("900101-1234567")
        self.assertEqual(result, "900101-*******")

    def test_mask_ssn_invalid_format_raises(self):
        with self.assertRaises(ValueError):
            string_utils.mask_ssn("9001011234567")  # '-' 없음


if __name__ == "__main__":
    unittest.main()
```

실행:
```bash
python test_string_utils.py
```

예상에러:
```
...EE
======================================================================
ERROR: test_mask_ssn_basic (__main__.TestStringUtils)
...
AttributeError: module 'string_utils' has no attribute 'mask_ssn'
```

- 의미: `mask_ssn()` 테스트는 만들었는데, 함수가 아직 없어서 실패
- **이게 mask_ssn의 Red 단계 성공**입니다.

---

### 6) [Green] 최소 구현으로 테스트 통과시키기

이제 `string_utils.py`에 `mask_ssn()`을 추가합니다.

`string_utils.py` (전체)
```python
def normalize_name(raw_name: str) -> str:
    name = raw_name.strip()

    if not name:
        return ""

    parts = name.split()
    name = " ".join(parts)

    return name[0].upper() + name[1:].lower()


def mask_ssn(ssn: str) -> str:
    """
    주민번호 마스킹:
    - "900101-1234567" -> "900101-*******"
    - 형식이 잘못되면 ValueError
    """
    # 길이 14, 7번째 문자가 '-'인지 확인
    if len(ssn) != 14 or ssn[6] != "-":
        raise ValueError("주민번호 형식이 올바르지 않습니다. (예: 900101-1234567)")

    # 앞부분(생년월일 + '-')은 그대로, 뒤 7자리는 *로 대체
    return ssn[:7] + "*******"
```

다시 실행:
```bash
python test_string_utils.py
```

예상:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

- 테스트 5개 = normalize_name 3개 + mask_ssn 2개
- **이게 Green 단계 성공**입니다.

---

### 7) [Refactor] 리팩토링(선택)

테스트가 있으니 검증을 더 깔끔하게 바꿔도 안전합니다.

예시(선택):
```python
def mask_ssn(ssn: str) -> str:
    if len(ssn) != 14 or "-" not in ssn or ssn[6] != "-":
        raise ValueError("주민번호 형식이 올바르지 않습니다. (예: 900101-1234567)")
    return ssn[:7] + "*******"
```

테스트 재실행:
```bash
python test_string_utils.py
```

---

### 실습 3 – BankAccount 클래스 TDD (`bank.py`)

#### 시나리오

> “고객의 포인트/지갑 계좌를 관리하는 클래스를 만든다.”

#### 기능 요구사항

1. 계좌는 잔액(`balance`)을 가진다.
    - 기본 잔액 0
    - 초기 잔액을 생성 시 지정할 수도 있음
2. `deposit(amount)`
    - 0보다 큰 금액만 입금 가능
    - 아니면 `ValueError`
3. `withdraw(amount)`
    - 0보다 큰 금액만 출금 가능
    - 잔액보다 많이 출금하면 `ValueError`
4. `get_balance()`
    - 현재 잔액 반환

---

### 0) 준비: 파일/폴더 생성 및 위치 확인

#### 0-1) 실습 폴더로 이동
```bash
cd ~/tdd_intro
pwd
ls
```

#### 0-2) 파일 생성
```bash
touch bank.py
touch test_bank.py
ls
```

폴더 구조 확인:

```
tdd_intro/
    bank.py
    test_bank.py
```

---

### 1) [Red] 테스트 먼저 작성 (실패 확인) – `test_bank.py`

> 핵심: 지금 단계에서는 bank.py에 BankAccount가 아직 없어야 정상입니다.
> 그래서 테스트 실행 시 **ImportError 또는 AttributeError**가 나는 게 Red 성공이에요.

#### 1-1) 먼저 `bank.py`를 “비어있거나 최소 상태”로 둔다

`bank.py` (처음 상태 — 비워도 됨)
```python
# 일부러 BankAccount는 아직 만들지 않는다 (Red 단계)
```

#### 1-2) `test_bank.py`에 테스트 작성

`test_bank.py`
```python
import unittest
from bank import BankAccount

class TestBankAccount(unittest.TestCase):
    # 상황 1: 기본 생성 시 잔액은 0이어야 한다.
    def test_initial_balance_zero_by_default(self):
        account = BankAccount()
        self.assertEqual(account.get_balance(), 0)

    # 상황 2: 초기 잔액을 지정할 수 있어야 한다.
    def test_initial_balance_can_be_set(self):
        account = BankAccount(100)
        self.assertEqual(account.get_balance(), 100)

    # 상황 3: 입금하면 잔액이 증가해야 한다.
    def test_deposit_increases_balance(self):
        account = BankAccount()
        account.deposit(50)
        self.assertEqual(account.get_balance(), 50)

    # 상황 4: 출금하면 잔액이 줄어야 한다.
    def test_withdraw_decreases_balance(self):
        account = BankAccount(100)
        account.withdraw(40)
        self.assertEqual(account.get_balance(), 60)

    # 상황 5: 잔액보다 많이 출금하면 ValueError가 발생해야 한다.
    def test_withdraw_more_than_balance_raises(self):
        account = BankAccount(50)
        with self.assertRaises(ValueError):
            account.withdraw(100)

    # 상황 6: 0 이하 금액을 입금하려 하면 ValueError가 발생해야 한다.
    def test_deposit_negative_amount_raises(self):
        account = BankAccount()
        with self.assertRaises(ValueError):
            account.deposit(-10)

if __name__ == "__main__":
    unittest.main()
```

#### 1-3) 테스트 실행 (실패 확인)
```bash
python test_bank.py
```

예상 에러(둘 중 하나 형태가 정상):

#### (A) ImportError 형태
```
ImportError: cannot import name 'BankAccount' from 'bank' ...
```

#### (B) AttributeError 형태
```
AttributeError: module 'bank' has no attribute 'BankAccount'
```

✅ 의미:

- 테스트는 **BankAccount가 있다고 가정하고** 실행하려고 했는데
    
- 아직 구현이 없어서 실패한 것
    → **이게 Red 단계 성공**입니다.
    

---

### 2) [Green] 최소 구현으로 테스트 통과시키기 – `bank.py`

> 핵심: 지금은 “테스트가 통과하기 위한 최소한의 코드”만 먼저 작성합니다.

`bank.py`
```python
class BankAccount:
    """
    간단한 계좌/지갑 클래스.
    - 초기 잔액을 지정할 수 있다 (기본 0).
    - deposit: 0보다 큰 금액만 허용.
    - withdraw: 0보다 큰 금액 + 잔액보다 크면 안 됨.
    - get_balance: 현재 잔액 반환.
    """

    def __init__(self, initial_balance=0):
        self._balance = initial_balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("입금 금액은 0보다 커야 합니다.")
        self._balance += amount

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("출금 금액은 0보다 커야 합니다.")
        if amount > self._balance:
            raise ValueError("잔액이 부족합니다.")
        self._balance -= amount

    def get_balance(self):
        return self._balance
```

#### 2-1) 테스트 재실행 (통과 확인)
```bash
python test_bank.py
```

예상 출력:
```
......
----------------------------------------------------------------------
Ran 6 tests in 0.000s

OK
```

✅ 의미:

- `.` 6개 = 테스트 6개가 모두 통과
    
- `OK` = 전부 통과
    → **Green 단계 성공**입니다.
    
---

### 3) [Refactor] 테스트 코드 정리(setUp 사용)

> 핵심: 테스트가 통과하는 상태(초록불)에서
> 테스트 코드의 “중복 준비 코드”를 `setUp()`으로 정리합니다.
> 기능은 안 바뀌고, 테스트 코드만 더 깔끔해집니다.

#### 3-1) 왜 setUp을 쓰나?

- 여러 테스트에서 `account = BankAccount(100)` 같은 준비 코드가 반복되면
    테스트가 길어지고 지저분해짐
    
- `setUp()`은 **각 테스트 실행 전에 매번 자동으로 호출**됨
    
- Django/DRF 테스트(`TestCase`)에서도 똑같이 쓰임
    

#### 3-2) `test_bank.py`를 setUp 버전으로 리팩토링

`test_bank.py` (리팩토링 버전 예시)
```python
import unittest
from bank import BankAccount

class TestBankAccount(unittest.TestCase):
    def setUp(self):
        # 각 테스트마다 100원 가진 새 계좌 생성
        self.account = BankAccount(100)

    def test_initial_balance(self):
        self.assertEqual(self.account.get_balance(), 100)

    def test_deposit(self):
        self.account.deposit(50)
        self.assertEqual(self.account.get_balance(), 150)

    def test_withdraw(self):
        self.account.withdraw(30)
        self.assertEqual(self.account.get_balance(), 70)

if __name__ == "__main__":
    unittest.main()
```

#### 3-3) 테스트 실행
```bash
python test_bank.py
```

예상:
```
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```

✅ 의미:

- `.` 3개 = 테스트 3개 통과
- setUp이 각 테스트마다 자동 실행되면서 **중복이 제거됨**
- **리팩토링이 안전한 이유 = 테스트가 계속 OK로 보장해줌**

---

### 4) 여러 테스트 파일을 한 번에 실행하기 (`unittest discover`)

> 핵심: 프로젝트가 커지면 테스트 파일이 여러 개가 되는데,
> 이걸 매번 하나씩 실행하기 힘들기 때문에 “한 방에” 돌립니다.

폴더 구조 예시:
```
tdd_intro/
    math_utils.py
    test_math_utils.py
    string_utils.py
    test_string_utils.py
    bank.py
    test_bank.py
    price.py
    test_discount.py
```

#### 4-1) 현재 폴더에서 전체 실행
```bash
cd ~/tdd_intro
python -m unittest
```

#### 4-2) discover(탐색) 모드 (가장 많이 씀)
```bash
python -m unittest discover
```

설명:

- 현재 폴더에서
- 파일명이 `test_*.py`인 것을 자동으로 찾고
- 그 안의 `unittest.TestCase` 중 `test_`로 시작하는 메서드를 전부 실행

예상 출력(예시):
```
................
----------------------------------------------------------------------
Ran 16 tests in 0.002s

OK
```

- `.` 개수 = 전체 테스트 개수
- `OK` = 전체 통과
- 실패는 `F`, 에러는 `E`로 섞여 나오며, 어떤 테스트가 실패했는지 상세 로그가 뜸

---
### 🧪 문제1 — 할인 계산기 TDD

#### 🎯 목표

TDD 방식으로 **할인 계산 함수 `discount_price`** 를 완성한다.

- 테스트를 **먼저 작성**하고
- 테스트가 **실패하는 것(Red)** 을 확인한 뒤
- **최소한의 구현(Green)** 으로 통과시키고
- 테스트가 있으니 **안전하게 리팩토링(Refactor)** 한다

---

## 📁 준비 단계

#### 0-1. 실습 폴더로 이동
```bash
cd ~/tdd_intro
```

####  0-2. 파일 생성
```bash
touch price.py
touch test_discount.py
```

#### 0-3. 폴더 구조 확인
```bash
ls
```

예상 구조:
```
tdd_intro/
  price.py
  test_discount.py
```

---

### 🧠 문제 설명

당신은 쇼핑몰 백엔드를 개발하고 있습니다.
상품 가격과 할인율을 입력받아 **할인된 최종 가격을 계산하는 함수**가 필요합니다.

#### 함수 이름
```python
discount_price(price, rate)
```

---

### 📌 요구사항 (문제 조건)

입력 규칙
1. `price`
    - 정수
    - 0 이상
2. `rate`
    - 정수
    - 0 ~ 100 사이 (할인율 %)

반환값
- 할인된 가격 (정수)
- 소수점 이하는 **반올림**

#### 계산 예시
| 입력                          | 결과     |
| --------------------------- | ------ |
| `discount_price(10000, 10)` | `9000` |
| `discount_price(5000, 0)`   | `5000` |
| `discount_price(10000, 33)` | `6700` |

#### 예외 처리

- `price < 0` → `ValueError`
- `rate < 0` 또는 `rate > 100` → `ValueError`

---

### 단계 1 — 테스트 먼저 작성하기 (Red)

❗ 규칙
- **아직 `price.py`에 함수를 만들지 마세요**
- 테스트를 실행했을 때 **실패하는 것이 정상**입니다

---

#### 1-1. `price.py` (아직 비워둔다)
```python
# 아직 discount_price 함수는 만들지 않는다
```

---

#### 1-2. `test_discount.py` 작성

아래 테스트 코드를 그대로 작성하세요.
```python
import unittest
from price import discount_price

class TestDiscountPrice(unittest.TestCase):
    def test_discount_10_percent(self):
        self.assertEqual(discount_price(10000, 10), 9000)

    def test_discount_zero_percent(self):
        self.assertEqual(discount_price(5000, 0), 5000)

    def test_discount_33_percent_round(self):
        self.assertEqual(discount_price(10000, 33), 6700)

    def test_negative_price_raises(self):
        with self.assertRaises(ValueError):
            discount_price(-1000, 10)

    def test_invalid_rate_raises(self):
        with self.assertRaises(ValueError):
            discount_price(10000, 200)

if __name__ == "__main__":
    unittest.main()
```

---

#### 1-3. 테스트 실행 (실패 확인)
```bash
python test_discount.py
```

### ✔ 정상 결과 (중요)

- ImportError 또는 AttributeError 발생
- **실패 = 성공 (Red 단계 통과)**

> 💡 아직 함수가 없기 때문에 실패하는 것이 정상적인 TDD 흐름

---

### 단계 2 — 최소 구현으로 통과시키기 (Green)

이제 **테스트를 통과시키는 최소 코드**를 작성하세요.

🔧 문제
- `price.py`에 `discount_price` 함수를 구현하시오.
- 위 요구사항을 모두 만족해야 합니다.

⚠️ 힌트
- 예외부터 처리하세요
- 계산식은 단순합니다

> ✍️ 이 단계는 직접 구현해보세요
> (정답 코드 아래에 있습니다.)

---

#### 2-1. 테스트 재실행
```bash
python test_discount.py
```

#### ✔ 목표 결과
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

- 테스트 5개 모두 통과 → **Green 단계 성공**

---

### 단계 3 — 리팩토링 (Refactor, 선택)

문제
- 기능은 유지한 채
- 코드를 **더 읽기 쉽게** 정리해보세요

조건
- 테스트는 **절대 수정하지 않는다**
- 리팩토링 후에도 테스트는 반드시 통과해야 한다

> 💡 테스트가 있기 때문에
> “마음 놓고 고쳐도 되는 상태”가 바로 지금입니다.

---

#### 3-1. 리팩토링 후 테스트 재실행
```bash
python test_discount.py
```

- 여전히 `OK` → 리팩토링 성공 🎉

---

### ✅ 실습 체크포인트

- [ ] 테스트를 먼저 작성했다
- [ ] 테스트 실패(Red)를 직접 확인했다
- [ ] 최소 구현으로 테스트를 통과시켰다(Green)
- [ ] 테스트 덕분에 안심하고 리팩토링했다


### ✅ 문제1 정답 – 할인 계산기 TDD (`discount_price`) : `price.py`

### 0) 준비: 파일 생성/위치 확인
```bash
cd ~/tdd_intro
pwd
ls
touch price.py
touch test_discount.py
ls
```

폴더 구조:
```
tdd_intro/
  price.py
  test_discount.py
```

---

### 1) [Red] 실패하는 테스트 먼저 작성 – `test_discount.py`

> 지금 단계에서는 price.py에 discount_price가 없어야 정상입니다.
> 그래서 실행하면 실패(Error)가 나오는 게 **Red 성공**입니다.

#### 1-1) `price.py`는 비워두거나 최소 상태

`price.py` (처음 상태)
```python
# 일부러 discount_price는 아직 만들지 않는다 (Red 단계)
```

#### 1-2) `test_discount.py` 작성

`test_discount.py`
```python
import unittest
from price import discount_price

class TestDiscountPrice(unittest.TestCase):
    def test_discount_10_percent(self):
        self.assertEqual(discount_price(10000, 10), 9000)

    def test_discount_zero_percent(self):
        self.assertEqual(discount_price(5000, 0), 5000)

    def test_discount_33_percent_round(self):
        self.assertEqual(discount_price(10000, 33), 6700)

    def test_negative_price_raises(self):
        with self.assertRaises(ValueError):
            discount_price(-1000, 10)

    def test_invalid_rate_raises(self):
        with self.assertRaises(ValueError):
            discount_price(10000, 200)

if __name__ == "__main__":
    unittest.main()
```

#### 1-3) 테스트 실행 (실패 확인)
```bash
python test_discount.py
```

예상 에러(정상):

- 보통은 ImportError/AttributeError가 납니다.

예시 1) ImportError 형태
```
ImportError: cannot import name 'discount_price' from 'price' ...
```

예시 2) AttributeError 형태(작성 방식에 따라)
```
AttributeError: module 'price' has no attribute 'discount_price'
```

✅ 의미: 아직 함수가 없어서 실패 → **Red 성공**

---

### 2) [Green] 최소 기능 구현으로 통과시키기 – `price.py`

`price.py`
```python
def discount_price(price, rate):
    if price < 0:
        raise ValueError("가격은 0 이상이어야 합니다.")
    if rate < 0 or rate > 100:
        raise ValueError("할인율은 0~100 사이여야 합니다.")

    discounted = price * (100 - rate) / 100
    return round(discounted)
```

#### 2-1) 테스트 재실행 (통과 확인)

```bash
python test_discount.py
```

예상:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

✅ 의미: 5개 테스트 통과 → **Green 성공**

---

### 3) [Refactor] 리팩토링 (선택)

> 지금 코드도 충분히 깔끔하지만, “리팩토링 감각”을 주기 위해 예시를 남깁니다.
> **테스트가 있으니까 마음 놓고 바꿔도 OK로 검증**할 수 있음.

예: 중복 체크를 조금 더 읽기 좋게

```python
def discount_price(price, rate):
    if price < 0:
        raise ValueError("가격은 0 이상이어야 합니다.")
    if not (0 <= rate <= 100):
        raise ValueError("할인율은 0~100 사이여야 합니다.")

    return round(price * (100 - rate) / 100)
```

리팩토링 후 재실행:

```bash
python test_discount.py
```

---

### 문제2 — TODO 관리 함수 TDD

#### 리스트(상태) 수정 로직 연습

> ⚠️ 이번 실습은 단순 계산이 아니라
> **리스트(상태)를 직접 수정하는 로직**을 다룹니다.
> 실제 서비스 코드와 매우 유사한 형태입니다.

---

#### 🎯 목표

- TODO 목록을 관리하는 함수를 **TDD 방식**으로 구현한다
- 테스트를 먼저 작성하고
- 실패(Red) → 통과(Green) → 개선(Refactor) 흐름을 직접 경험한다

---

#### 📁 0) 준비 — 파일 생성 & 위치 확인
```bash
cd ~/tdd_intro
touch todo.py
touch test_todo.py
ls
```

#### 폴더 구조 (확인)
```
tdd_intro/
  todo.py
  test_todo.py
```

---

### 🧠 문제 설명

당신은 간단한 TODO 관리 기능을 만들고 있습니다.
TODO는 **리스트 안의 딕셔너리** 형태로 관리됩니다.
#### TODO 데이터 구조
```python
tasks = [
    {"title": "파이썬 공부", "done": False},
    {"title": "운동하기", "done": True},
]
```

---

### 📌 구현해야 할 함수

1️⃣ `add_task(tasks, title)`
- 새로운 할 일을 리스트에 추가한다

조건:
- `tasks` : TODO 리스트
- `title` : 할 일 제목 (문자열)
- 새로 추가되는 TODO는 반드시:
```python
{"title": title, "done": False}
```
---

 2️⃣ `complete_task(tasks, index)`
- 지정한 인덱스의 TODO를 완료 처리한다

조건:
- `index`가 범위를 벗어나면 → `IndexError`
- 정상이라면:
```python
tasks[index]["done"] = True
```

---

### 단계 1 — 테스트 먼저 작성하기 (Red)

> ❗ 중요
> 
> - 이 단계에서는 `todo.py`에 함수를 만들지 마세요
> - 테스트 실행 시 **실패하는 것이 정상**입니다

---

#### 1-1) `todo.py` (아직 비워둔다)

```python
# 아직 add_task, complete_task는 만들지 않는다 (Red 단계)
```

---

#### 1-2) `test_todo.py` 작성

아래 테스트 코드를 그대로 작성하세요.
```python
import unittest
from todo import add_task, complete_task

class TestTodo(unittest.TestCase):
    def test_add_task(self):
        tasks = []
        add_task(tasks, "공부하기")
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["title"], "공부하기")
        self.assertFalse(tasks[0]["done"])

    def test_complete_task(self):
        tasks = [{"title": "공부하기", "done": False}]
        complete_task(tasks, 0)
        self.assertTrue(tasks[0]["done"])

    def test_complete_task_invalid_index(self):
        tasks = [{"title": "공부하기", "done": False}]
        with self.assertRaises(IndexError):
            complete_task(tasks, 3)

if __name__ == "__main__":
    unittest.main()
```

---

#### 1-3) 테스트 실행 (실패 확인)
```bash
python test_todo.py
```

#### ✔ 정상 결과
- `ImportError` 또는 `AttributeError` 발생

예:
```
ImportError: cannot import name 'add_task' from 'todo'
```

또는
```
AttributeError: module 'todo' has no attribute 'add_task'
```

✅ 의미

- 아직 함수가 없어서 실패
- **Red 단계 성공**

---

### 단계 2 — 최소 구현으로 테스트 통과시키기 (Green)

이제 테스트를 **통과시키는 최소 코드**를 작성하세요.
#### 🔧 문제

- `todo.py`에 `add_task`, `complete_task`를 구현하시오
- 위 테스트 조건을 모두 만족해야 합니다

> ✍️ 이 단계는 직접 구현하세요
> (정답 코드는 아래 있습니다.)

---

#### 2-1) 테스트 재실행
```bash
python test_todo.py
```

#### ✔ 목표 결과
```
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```

- 테스트 3개 모두 통과 → **Green 단계 성공**

---

### 단계 3 — 확장 & 리팩토링 (선택 과제)

> 이제 테스트가 있으니
> **조금 더 실전처럼 기능을 강화**해봅니다.

---

### 🔹 추가 요구사항 (선택)

> “빈 제목의 TODO는 허용하지 않는다”

조건:
- `title`이 비어 있거나 공백만 있으면 → `ValueError`

---

#### 3-1) 테스트 먼저 추가 (Red)

`test_todo.py`에 아래 테스트를 추가하세요.
```python
def test_add_task_empty_title_raises(self):
    tasks = []
    with self.assertRaises(ValueError):
        add_task(tasks, "")
```

이제 테스트를 실행하면 **실패**해야 합니다.

---

#### 3-2) 구현 수정 (Green)

> 테스트를 통과하도록 todo.py를 수정하세요.

힌트:

- 문자열의 공백 제거
- 빈 값 체크

---

#### 3-3) 테스트 재실행
```bash
python test_todo.py
```

- 모든 테스트 통과 → 확장 성공 🎉

---

### 🔄 전체 테스트 한 번에 실행 (마무리)
```bash
cd ~/tdd_intro
python -m unittest discover
```

#### 예상 출력
```
..........
----------------------------------------------------------------------
Ran 10 tests in 0.001s

OK
```

---

### ✅ 실습 체크리스트

- [ ] 테스트를 먼저 작성했다
- [ ] 실패(Red)를 직접 확인했다
- [ ] 최소 구현으로 통과(Green)시켰다
- [ ] 테스트 덕분에 기능을 확장했다
- [ ] 리스트(상태) 변경 로직이 익숙해졌다

---

### 📌 이 실습이 중요한 이유

- 단순 계산 ❌
- **상태 변경 로직 ⭕**
- 실제 서비스(게시글, 댓글, 장바구니, TODO 등)의 핵심 패턴
- Django / FastAPI / DRF 테스트와 **완전히 같은 사고 방식**

### ✅ 문제2 정답 – TODO 관리 함수 TDD (`todo.py`) : 리스트(상태) 수정 연습

> 이 실습은 “순수 계산”이 아니라 데이터 구조(리스트)를 바꾸는 로직이라 실전감이 있습니다.

#### 0) 준비: 파일 생성/확인
```bash
cd ~/tdd_intro
touch todo.py
touch test_todo.py
ls
```

폴더 구조:
```
tdd_intro/
  todo.py
  test_todo.py
```

---

### 1) [Red] 테스트 먼저 작성 (실패 확인) – `test_todo.py`

#### 1-1) `todo.py`는 비워둔다(함수 없음이 정상)

`todo.py` (처음 상태)
```python
# 일부러 add_task, complete_task는 아직 만들지 않는다 (Red 단계)
```

#### 1-2) `test_todo.py` 작성

`test_todo.py`
```python
import unittest
from todo import add_task, complete_task

class TestTodo(unittest.TestCase):
    def test_add_task(self):
        tasks = []
        add_task(tasks, "공부하기")
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["title"], "공부하기")
        self.assertFalse(tasks[0]["done"])

    def test_complete_task(self):
        tasks = [{"title": "공부하기", "done": False}]
        complete_task(tasks, 0)
        self.assertTrue(tasks[0]["done"])

    def test_complete_task_invalid_index(self):
        tasks = [{"title": "공부하기", "done": False}]
        with self.assertRaises(IndexError):
            complete_task(tasks, 3)

if __name__ == "__main__":
    unittest.main()
```

#### 1-3) 테스트 실행 (실패 확인)
```bash
python test_todo.py
```

예상 에러(정상):
```
ImportError: cannot import name 'add_task' from 'todo' ...
```

또는
```
AttributeError: module 'todo' has no attribute 'add_task'
```

✅ 의미: 구현이 없어서 실패 → **Red 성공**

---

### 2) [Green] 최소 구현으로 테스트 통과 – `todo.py`

`todo.py`
```python
def add_task(tasks, title):
    task = {"title": title, "done": False}
    tasks.append(task)

def complete_task(tasks, index):
    if index < 0 or index >= len(tasks):
        raise IndexError("잘못된 인덱스입니다.")
    tasks[index]["done"] = True
```

#### 2-1) 테스트 재실행 (통과 확인)
```bash
python test_todo.py
```

예상:
```
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```

✅ 의미: 3개 테스트 통과 → **Green 성공**

---

### 3) [Refactor] 테스트 케이스 확장 + 코드 개선 (선택)

> “조금 더 실전”으로 만들고 싶으면 아래를 추가하세요.
> **테스트 먼저 추가하고(Red) → 구현 수정(Green)** 순서로 가면 TDD가 더 살아납니다.

#### 3-1) (선택) 빈 제목은 막고 싶다면 → 테스트 추가

`test_todo.py`에 추가:
```python
def test_add_task_empty_title_raises(self):
    tasks = []
    with self.assertRaises(ValueError):
        add_task(tasks, "")
```

이제 실행하면 실패할 겁니다(Red).

#### 3-2) (선택) 구현 업데이트(Green)

`todo.py` 수정:
```python
def add_task(tasks, title):
    if not title or not title.strip():
        raise ValueError("제목은 비어 있을 수 없습니다.")
    task = {"title": title.strip(), "done": False}
    tasks.append(task)
```

재실행:
```bash
python test_todo.py
```

---

### 🔄 전체 테스트 한 번에 실행(마무리)

`tdd_intro` 폴더 전체 테스트를 한 번에 실행:
```bash
cd ~/tdd_intro
python -m unittest discover
```

예상:
```
..........
----------------------------------------------------------------------
Ran 10 tests in 0.001s

OK
```

---