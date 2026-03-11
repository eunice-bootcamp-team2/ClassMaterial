### 콜백(callback)이란?
	콜백(callback)은 어떤 작업의 결과를 나중에 다시 알려주기 위해, 미리 전달한 주소(URL)로 
	서버가 다시 요청을 보내는 방식을 의미합니다.

즉, 처음 요청을 보낼 때  
결과가 나오면 이 주소로 다시 알려주세요.” 라는 콜백 URL을 함께 전달하는 구조입니다.

쉽게 말해,

> 지금 바로 결과를 받을 수 없을 때,  
> 나중에 결과가 나오면 알려달라고 미리 요청하는 방식입니다.

---
### 시나리오: 카카오페이 결제 시스템

#### 🔹 상황: 
온라인 쇼핑몰에서 카카오페이 API를 사용하여 결제를 처리하는 상황을 예로 들어보겠습니다.

고객이 쇼핑몰에서 상품을 구매하고 결제 버튼을 누르면,  
쇼핑몰 서버는 카카오페이 서버에 결제 요청을 보내게 됩니다.

이때 쇼핑몰 서버는 단순히 결제 요청만 보내는 것이 아니라, 
==“결제가 완료되면 이 주소로 결과를 다시 알려주세요.”== 라는 콜백 URL도 함께 전달합니다.

### FastAPI 서버 입장:
```python
@app.post("/pay")
def request_payment(...):
    # 카카오페이에 결제 요청
    # 결제가 완료되면 이 서버로 다시 알려달라고 콜백 URL 전달
```
즉, 카카오페이에게 다음과 같이 요청하는 것입니다.
이 결제가 완료되면, 반드시 이 URL로 결과를 알려주세요


### 카카오페이 서버 입장:
고객이 실제로 결제를 완료하면 카카오페이 서버는 미리 전달받은 콜백 주소로 다시 요청을 보냅니다.
예를 들어 다음과 같은 요청이 발생합니다.
```python
POST /payment-success  # ← (내가 등록해놓은 콜백 주소)
Body: { "결제완료": true }
```
이 요청은 카카오페이 서버가 직접 쇼핑몰 서버로 보내는 요청입니다.

즉, 이 고객의 결제가 완료되었습니다. 라고 서버에게 자동으로 알려주는 것입니다.

###### 전체 동작 흐름 : 전체 과정을 순서대로 보면 다음과 같습니다.
|단계|설명|
|---|---|
|1️⃣ 고객|쇼핑몰에서 결제 버튼 클릭|
|2️⃣ 쇼핑몰 서버|카카오페이에 결제 요청 + 콜백 URL 전달|
|3️⃣ 카카오페이 서버|결제 완료 후 콜백 URL로 결과 전송|
|4️⃣ 쇼핑몰 서버|결제 완료 사실을 확인|
|5️⃣ 쇼핑몰 서버|후속 처리 진행|
이때 서버에서는 다음과 같은 작업을 수행할 수 있습니다.
- 주문 상태 변경
- 고객에게 결제 완료 알림 발송
- 배송 시작 처리
- 결제 완료 페이지 표시
    
즉, 콜백은 서버가 작업 결과를 정확히 알기 위해 반드시 필요한 통신 방식입니다.

---
### 웹훅(Webhook)이란?
웹훅(Webhook)은 어떤 이벤트가 발생했을 때, 미리 등록된 URL로 자동으로 HTTP 요청을 보내는 방식입니다.

쉽게 말하면,

> 특정 이벤트가 발생하면 서버가 자동으로 다른 서버에게 알림을 보내는 시스템입니다.

예를 들어 다음과 같은 경우에 사용됩니다.
- 결제 완료
- GitHub 코드 push
- Slack 알림
- 주문 생성
    
이때 서버는 미리 등록된 웹훅 URL로 POST 요청을 보내게 됩니다.

예시:
```
POST /webhook/payment
Body: { "status": "success" }
```
이 요청을 받은 서버는 이벤트를 처리하게 됩니다.

---
### 콜백과 웹훅의 핵심 차이
콜백과 웹훅은 비슷한 개념처럼 보이지만, URL을 전달하는 방식에 차이가 있습니다.

|구분|콜백 (Callback)|웹훅 (Webhook)|
|---|---|---|
|URL 전달 방식|요청할 때 URL을 함께 전달|서비스 설정에서 미리 URL 등록|
|동작 방식|요청 → 나중에 결과 전달|이벤트 발생 → 자동 알림|
|사용 목적|특정 요청의 결과 전달|시스템 이벤트 알림|
|사용 상황|결제 결과, 비동기 작업 결과|서비스 이벤트 알림|
|대표 서비스|OpenAPI Callback|GitHub, Stripe, Slack|

콜백 방식
요청할 때 URL을 함께 전달합니다.
```
결제 요청
callback_url = https://myserver.com/payment
```
나중에 결과가 발생하면 해당 URL로 요청이 전달됩니다.


웹훅 방식
서비스에 미리 URL을 등록합니다.

예를 들어 GitHub에 다음과 같이 등록합니다.
```
https://myserver.com/github-webhook
```
그 이후 GitHub에서 이벤트가 발생하면 자동으로 해당 주소로 요청이 전송됩니다.

---
### 언제 콜백을 사용하나요?
콜백은 특정 요청의 결과를 나중에 알려줘야 하는 상황에서 사용됩니다.

즉, 요청을 보낸 사람이  
==**“이 작업이 끝나면 결과를 나에게 알려주세요.”**== 라고 요청하는 구조입니다.


대표적인 사용 사례:

1️⃣ 결제 처리
쇼핑몰 서버가 결제 서버에 요청합니다.
```
결제 요청 + 콜백 URL 전달
```

결제가 완료되면
```
결제 서버 → 콜백 URL로 결과 전달
```


2️⃣ 비동기 작업 처리
예를 들어 다음과 같은 작업입니다.
- 영상 인코딩
- AI 모델 분석
- 대용량 데이터 처리
    
이런 작업은 몇 분 또는 몇 시간이 걸릴 수 있기 때문에 작업 요청 시 콜백 URL을 전달합니다.
작업이 완료되면 서버가 콜백 URL로 결과를 보내줍니다.

---
### 언제 웹훅을 사용하나요?
웹훅은 특정 이벤트가 발생했을 때 자동으로 알림을 보내야 하는 상황에서 사용됩니다.

즉, ==“이런 이벤트가 발생하면 내 서버로 알려주세요.”== 라고 미리 등록해 놓는 방식입니다.


대표적인 사용 사례:

1️⃣ GitHub 이벤트

코드가 push되면
```
GitHub → 웹훅 URL로 POST 요청
```
예
```
/webhook/github
```

2️⃣ 결제 시스템 이벤트
Stripe / Toss 같은 결제 시스템에서는
- 결제 완료
- 결제 실패
- 환불 완료
    
같은 이벤트가 발생하면 웹훅으로 알림을 보냅니다.

3️⃣ Slack 알림

예를 들어
- 서버 오류
- 배포 완료
    
같은 이벤트가 발생하면 Slack 웹훅으로 메시지를 보냅니다.

결론은 핵심차이가 다음과 같습니다.
콜백: 특정 요청의 결과를 나중에 알려주는 방식
```
요청 → 결과 나중에 전달

결제 요청  
callback_url 전달

결제 완료 → callback_url 호출
```

웹훅: 시스템에서 이벤트가 발생하면 자동으로 알림을 보내는 방식
```
이벤트 발생 → 자동 알림

GitHub push  
→ webhook URL 호출
```

실무에서는 웹훅을 훨씬 많이 사용합니다.

대표 서비스
- GitHub Webhook
- Stripe Webhook
- Slack Webhook
- Toss Webhook
    
콜백은 주로
- OpenAPI 문서
- 비동기 API 에서 사용됩니다.

---
실습코드:
```
클라이언트 → 우리 서버에 주문 요청
                 ↓
         callback_url도 함께 전달
                 ↓
         우리 서버가 주문 접수
                 ↓
     우리 서버가 callback_url로 다시 요청 전송
```

디렉토리 구조
```
callback_practice/
├── main.py
├── schemas.py
├── services.py
└── requirements.txt
```

파일별 역할:

(1) `main.py`
FastAPI 앱을 실행하는 메인 파일입니다.  
API 주소(`/orders/`)를 만들고, 요청을 받는 역할을 합니다.

(2) `schemas.py`
요청 바디와 응답 데이터의 구조를 정의합니다.  
즉, 어떤 데이터가 들어오고 나가는지 틀을 정하는 파일입니다.

(3) `services.py`
실제로 콜백 요청을 보내는 기능을 따로 분리한 파일입니다.  
콜백 전송이라는 동작만 담당합니다.

(4) `requirements.txt`
이 프로젝트에 필요한 라이브러리 목록입니다.

---
디렉토리 생성
```bash
mkdir callback_practice
cd callback_practice
touch main.py schemas.py services.py requirements.txt
```

라이브러리 설치
```bash
uv pip install fastapi uvicorn requests pydantic
```

```bash
uv pip freeze > requirements.txt
```

`requirements.txt`
```
fastapi  
uvicorn  
requests  
pydantic
```

---
`schemas.py`
```python
from pydantic import BaseModel


class Order(BaseModel):
    order_id: str
    item_name: str
    price: int


class CallbackResult(BaseModel):
    message: str
    success: bool
```
- `Order`  
    사용자가 `/orders/`로 보낼 주문 데이터 형식입니다.
    
- `CallbackResult`  
    서버가 콜백으로 다시 보낼 데이터 형식입니다.

`services.py`
```python
import requests


def send_callback(callback_url: str, data: dict) -> None:
    """
    callback_url로 POST 요청을 보내는 함수
    """
    response = requests.post(callback_url, json=data, timeout=5)
    print("콜백 응답 상태코드:", response.status_code)
```
- 콜백을 보내는 기능만 따로 뺀 파일입니다.
- 나중에 코드가 길어져도 `main.py`가 복잡해지지 않게 해줍니다.

`main.py`
```python
from typing import Optional

from fastapi import FastAPI, Query
from pydantic import HttpUrl

from schemas import Order, CallbackResult
from services import send_callback

app = FastAPI()


@app.get("/")
def home():
    return {"message": "콜백 연습용 FastAPI 서버입니다."}


@app.post("/orders/")
def create_order(
    order: Order,
    callback_url: Optional[HttpUrl] = Query(default=None)
):
    print("주문 생성됨:", order)

    # 1. 먼저 주문이 접수되었다고 응답할 데이터
    response_data = {
        "msg": "주문이 접수되었습니다.",
        "order_id": order.order_id
    }

    # 2. callback_url이 있으면 콜백 전송
    if callback_url:
        callback_data = CallbackResult(
            message=f"{order.item_name} 주문이 완료되었습니다.",
            success=True
        )

        try:
            send_callback(str(callback_url), callback_data.model_dump())
            print("콜백 전송 완료")
        except Exception as e:
            print("콜백 전송 실패:", e)

    return response_data
```
이 파일이 핵심입니다.
- `/orders/` 주소로 주문 요청을 받습니다.
- `callback_url`도 함께 받습니다.
- 먼저 주문 접수 응답을 돌려줍니다.
- 그 다음 `callback_url`이 있으면 그 주소로 다시 POST 요청을 보냅니다.
    
즉, 요청을 받은 서버가 다시 다른 주소로 요청을 보내는 구조를 보여주는 파일입니다.

실행:
```bash
uvicorn main:app --reload
```

---
테스트 방법:
```
http://127.0.0.1:8000/docs
```

1단계. webhook.site 주소 준비 : https://webhook.site
`webhook.site`에 들어가서 고유 URL을 하나 발급받습니다.
![[Pasted image 20260311161013.png]]
이 긴 URL이 바로 여러분의 콜백 테스트 주소입니다.


2단계. Swagger에서 `/orders/` 테스트
Request Body
```json
{
  "order_id": "order_1",
  "item_name": "키보드",
  "price": 30000
}
```

callback_url
```
https://webhook.site/xxxxx-xxxx-xxxx
```
![[Pasted image 20260311161300.png]]

3단계. 결과 확인
FastAPI 응답 : 브라우저에서는 먼저 이런 응답을 받습니다.
```json
{
  "msg": "주문이 접수되었습니다.",
  "order_id": "order_1"
}
```

- `main.py` :요청을 받는 곳
- `schemas.py` : 데이터 모양 정의하는 곳
- `services.py` : 실제 동작 처리하는 곳

---
OpenAPI 콜백테스트:
URL: `http://127.0.0.1:8000/orders/?callback_url=https://webhook.site/당신의-고유-ID`
![[Pasted image 20260311164531.png]]

```json
689af48b-ee17-40ca-8cd9-52dc328e8327
```

데이터 주문넣기
```json
{
  "order_id": "order_1",
  "item_name": "키보드",
  "price": 30000
}
```

웹훅 사이트에서 결과 확인:
![[Pasted image 20260311165058.png]]

OpenAPI 콜백이란?
OpenAPI 콜백은 어떤 작업이 끝난 후 그 결과를 다시 알려주는 방식입니다.

예를 들어 결제 과정에서는 다음과 같이 동작합니다.
1. 사용자가 쇼핑몰에서 구매 버튼을 클릭합니다.
2. 쇼핑몰 서버가 결제 서비스에 결제를 요청하면서 콜백 URL을 함께 전달합니다.
3. 결제가 완료되면 결제 서비스가 콜백 URL로 결과를 다시 보냅니다.
4. 쇼핑몰 서버는 그 결과를 받아 주문 상태를 “결제 완료”로 변경합니다.
    
즉, 작업 결과를 나중에 다시 알려주는 구조가 콜백입니다.

---
Webhook.site란?
Webhook.site는 콜백이나 웹훅 요청을 테스트할 때 사용하는 도구입니다.

사용 방법은 간단합니다.
1. Webhook.site에 접속하면 고유 URL이 생성됩니다.
2. 그 URL을 콜백 URL로 사용합니다.
3. 서버가 그 주소로 요청을 보내면 Webhook.site 화면에서 요청 내용을 바로 확인할 수 있습니다.
    
즉, 콜백 요청이 제대로 전송되는지 확인하기 위한 테스트용 서비스입니다.

---
✔ 정리
- OpenAPI 콜백  
    → 작업 완료 후 결과를 다시 알려주는 방식
    
- Webhook.site  
    → 콜백 요청이 잘 전달되는지 확인하는 테스트 도구