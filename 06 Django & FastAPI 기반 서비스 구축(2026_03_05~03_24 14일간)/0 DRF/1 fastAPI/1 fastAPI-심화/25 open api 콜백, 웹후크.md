콜백(callback)이란?
서버가 나중에 클라이언트에게 알려줄 일이 있을 때, 클라이언트가 미리 알려준 주소로 다시 요청을 보내는 구조입니다.

시나리오: 카카오페이 결제 시스템
🔹 상황: 
	고객을 위해 온라인 쇼핑몰(백엔드 서버)을 만들었고, 결제는 카카오페이 API를 사용합니다.  
	고객이 쇼핑몰에서 상품을 결제하면,  당신의 서버는 카카오페이 API에 “이 고객 결제 좀 처리해줘요”라고 요청을 보냅니다.
	이때, 결제가 끝나면 결과를 다시 알려달라고 콜백 주소도 함께 전달합니다.

FastAPI 서버 입장:
```python
@app.post("/pay")
def request_payment(...):
    # 카카오페이에 결제 요청을 보냄
    # 결제가 완료되면 내 서버에 다시 알려달라고 콜백 주소도 같이 보냄
```
즉, 카카오페이에게 “이 결제 결과를 나한테 다시 알려줘야 하니까  
이 URL로 콜백 보내줘!” 라고 요청합니다.

카카오페이 서버 입장:
며칠후 고객이 결제를 완료하면
```python
POST /payment-success  ← (내가 등록해놓은 콜백 주소)
Body: { "결제완료": true }
```
이렇게 내 FastAPI 서버에 카카오페이가 직접 요청을 보내서  
“이 고객 결제 완료됐어요!” 하고 자동으로 알려줍니다.

요청할 때 콜백 URL을 같이 넘겨놓고,  
나중에 결과가 생기면 해당 콜백 주소로 다시 POST 요청이 오는 구조가 OpenAPI 콜백입니다.

###### 전체흐름을 보면:
| 단계         | 설명                                      |
| ---------- | --------------------------------------- |
| 1️⃣ 고객     | 쇼핑몰에서 결제 버튼 클릭                          |
| 2️⃣ 당신의 서버 | 카카오페이에 결제 요청 + 콜백 URL 전달                |
| 3️⃣ 카카오페이  | 결제 완료 시, 당신의 서버 콜백 URL에 “결제 완료됨” 메시지 전달 |
| 4️⃣ 당신의 서버 | ✅ 이제 알게 됨: 이 고객 결제 완료됨!                 |
| 5️⃣ 당신의 서버 | 🟢 이 정보를 기반으로 행동함:                      |
| →          | 주문 상태 변경 (`order.status = "결제완료"`)      |
| →          | 고객에게 알림(이메일, 문자, UI 알림)                 |
| →          | 배송 시작 처리                                |
| →          | 결제 완료 페이지 보여주기                          |
즉, 개발자(서버)가 콜백을 받아서 이 고객의 결제가 실제로 끝났다는 사실”을 받아서,  그에 따른 후속처리를 자동으로 하기 위해서입니다. 즉 콜백은 처리 결과를 서버가 먼저 받아야 고객에게 제대로 알려주고 처리할수 있게 되는 핵심 통신 수단입니다.

실습코드:
- 클라이언트(API 사용자)가 `/invoices/` 엔드포인트로 인보이스를 생성 요청함
- 서버는 요청을 처리한 후, 나중에 인보이스 상태 변경(예: 결제 완료)이 되면
- 클라이언트가 제공한 콜백 URL(callback_url)로 `POST` 요청을 보냄
```python
# callbacks.py

from typing import Union
import requests
from fastapi import APIRouter, FastAPI, Query
from pydantic import BaseModel, HttpUrl

app = FastAPI()

# ---------------------------
# 데이터 모델 정의
# ---------------------------

# 인보이스(청구서) 정보를 담는 모델
class Invoice(BaseModel):
    id: str # 인보이스 고유 ID
    title: Union[str, None] = None # 인보이스 제목 (선택 사항)
    customer: str # 고객 이름 또는 ID
    total: float  # 결제 금액

# 콜백으로 전달될 이벤트 정보 모델 (ex. 결제 완료 알림)
class InvoiceEvent(BaseModel):
    description: str # 이벤트 설명 (예: "결제 완료")
    paid: bool # 결제가 완료되었는지 여부 (True/False)

# 콜백을 정상적으로 받았다고 클라이언트에게 알려주는 응답 모델
class InvoiceEventReceived(BaseModel):
    ok: bool # 콜백 수신 여부를 나타내는 응답 (예: {"ok": true})


# ---------------------------
# 콜백 라우터 정의
# ---------------------------

invoices_callback_router = APIRouter()

# 콜백을 받을 라우터에 POST 요청 경로를 등록
@invoices_callback_router.post(
    "/{request.body.id}",  
    # 콜백 URL 경로에 인보이스 ID를 포함시킴 (예: /inv_001)
    
    response_model=InvoiceEventReceived  
    # 콜백 응답 형식을 정의 (ok: true/false)
)
# 외부 서버(API 제공자)가 콜백을 보낼 때 실행될 함수
def invoice_notification(body: InvoiceEvent):  
# body에는 콜백으로 전달된 이벤트 데이터가 들어옴

    print(f"콜백 수신됨 (ID: {invoice_id}): {body}")  
    # 콜백 내용을 로그에 출력 (예: description="결제 완료", paid=True)
    
    # 클라이언트에게 콜백을 잘 받았다고 응답
    return {"ok": True}


# ---------------------------
# 인보이스 생성 라우터 (콜백 포함)
# ---------------------------

# 인보이스 생성 요청을 처리하는 엔드포인트
# 동시에, 콜백 경로 정보도 OpenAPI 문서에 포함시킴 (Swagger에 자동 반영됨)
@app.post("/invoices/", callbacks=invoices_callback_router.routes)
def create_invoice(
    invoice: Invoice,  
    # 클라이언트가 보낸 인보이스 정보 (id, customer, total 등)
    
    callback_url: Union[HttpUrl, None] = Query(default=None, description="콜백 받을 주소")  
    # 선택적으로 콜백을 받을 URL도 함께 전달받음
):

    # 독스트링: 함수나 클래스 바로 아래에 """큰따옴표 3개"""로 묶어 
    # 작성하는 문서용 주석으로 이코드가 무슨일을 하는지 다른 개발자를 
    # 위해 설명할때 사용합니다.
    """
	인보이스를 생성합니다.
	
	이 API는 (가상의 시나리오로) 외부 개발자(API 사용자)가 인보이스를 
	생성할 수 있도록 해줍니다.
	
	이 API 경로는 다음과 같은 일을 합니다:
	
	- 클라이언트에게 인보이스를 보냅니다.
	- 클라이언트로부터 결제를 수금합니다.
	- 그리고 외부 개발자에게 콜백으로 결제 결과를 다시 알려줍니다.
	    - 이때는 API가 외부에서 제공한 콜백 URL로 POST 요청을 보내서
	      "결제가 성공했어요" 같은 알림을 전달하는 상황입니다.
    """

    # 인보이스 생성 요청 로그 출력
    print(f"인보이스 생성됨: {invoice}")

	if callback_url:
         try:
             payload = {
                 "description": f"{invoice.customer}님의 결제 완료",
                 "paid": True
                }

                # 예: https://webhook.site/abc123/invoices/inv_123
                callback_target = f"{callback_url}/invoices/{invoice.id}"
                print(f"콜백 전송 중: {callback_target}")
                response = requests.post(callback_target, json=payload, timeout=5)
                print(f"콜백 응답 코드: {response.status_code}")
            except Exception as e:
                print(f"콜백 전송 실패: {e}")

    # 클라이언트에게 인보이스 요청이 정상적으로 처리되었음을 응답
    return {"msg": "Invoice received"}
```

콜백 테스트 사이트: [https://webhook.site/](https://webhook.site/)

클라이언트가 `POST /invoices/` 요청 시:
```json
{
  "id": "inv_123",
  "title": "FastAPI 튜토리얼 결제",
  "customer": "홍길동",
  "total": 30000
}
```
`callback_url`도 쿼리 파라미터나 body에서 함께 전달

이후 서버에서 결제가 완료되었을 때, 해당 URL로 콜백을 보냄:
```python
POST https://client-server.com/invoices/inv_123
Content-Type: application/json

{
  "description": "결제 완료됨",
  "paid": true
}
```
그러면 클라이언트 서버는 `ok: true` 응답을 주게 됨

웹훅(Webhook)이란?
> 서버 간에 “자동으로 알림을 주고받는 HTTP 요청 방식”이에요.  
> 즉, 어떤 이벤트가 발생했을 때,  
> 정해진 URL로 자동으로 POST 요청을 보내는 메커니즘입니다.

webhook.site 주소로 테스트하기:
> webhook.site는 가짜 콜백 서버 역할을 해주는 무료 웹 서비스예요.

FastAPI에서 콜백 테스트할 때 이렇게 활용해요:
1. webhook.site에서 고유 주소를 하나 발급받음  
    예: `https://webhook.site/abcde-1234`
2. FastAPI에서 콜백 주소로 이걸 사용
    `callback_url = "https://webhook.site/abcde-1234"`
3. POST 요청이 그 주소로 날아가면  
    → webhook.site 화면에서 실시간으로 요청 데이터 확인 가능!

아래 명령어를 입력해서 `requests` 라이브러리를 설치
```bash
pip install requests
```

`http://localhost:8000/docs`
![[Pasted image 20250727114717.png]]

URL주소를 callback_url에 붙여 넣습니다.
![[Pasted image 20250727114942.png]]

결과확인:
![[Pasted image 20250727114748.png]]

OpenAPI 콜백테스트:
URL: `http://localhost:8000/invoices/?callback_url=https://webhook.site/당신의-고유-ID`
![[Pasted image 20250727120205.png]]

웹훅 사이트에서 결과 확인:
![[Pasted image 20250727120656.png]]

OpenAPI 콜백이란?
사용자가 쇼핑몰에서 "구매" 버튼 클릭  
→ 개발자가 만든 서버에 구매 요청 전달됨  
→ 서버에서 외부 결제 사이트에 결제 요청 + 콜백 URL 전달  
→ 결제가 끝나면 결제 사이트가 콜백 URL로 완료 메시지 전송  
→ 내 서버는 그 메시지를 받고 고객에게 "결제 완료"라고 보여줌
이때 콜백을 처리할 수 있게 문서에 명세로 보여주는 것이 OpenAPI 콜백이에요.

Webhook.site(웹훅 사이트)란?
- 용도: 테스트 전용 도구
- 설명: 실제로 외부 서버가 없을 때, 콜백 요청이 잘 보내졌는지 확인하기 위한 무료 도구예요.
    
- 예를 들어:
    - 콜백 URL로 `https://webhook.site/abc123`을 넣고
    - 내 API가 이 URL로 POST 요청을 잘 보내는지 확인함.
    - Webhook.site의 페이지에서 요청이 들어오는 걸 실시간으로 볼 수 있음.
- 개발·테스트 단계에서 매우 유용합니다. 개발 테스트 용도입니다.