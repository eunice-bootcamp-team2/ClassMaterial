HTTP Header란?
웹에서 클라이언트(브라우저)와 서버가 통신할 때, 요청(Request)과 응답(Response)에 포함되어 함께 전송되는 부가 정보입니다.

쉽게 이해하면?
- 사용자가 인터넷에서 어떤 웹사이트에 접속하면, 브라우저(크롬 등)가 서버에 이런 정보들을 함께 보냅니다.
- 예:
> 	나는 크롬 브라우저를 쓰고 있어요,  
> 	이전에 로그인한 쿠키가 있어요,  
> 	응답은 JSON 형식으로 주세요

이게 바로 HTTP Header에 담기는 정보입니다.

###### ✅ Header에 포함될 수 있는 것들
| Header 이름          | 설명                                             |
| ------------------ | ---------------------------------------------- |
| `User-Agent`       | 어떤 브라우저/기기에서 요청했는지                             |
| `Content-Type`     | 전송 데이터의 타입 (`application/json`, `text/html` 등) |
| `Authorization`    | 로그인 인증 토큰 등                                    |
| `Accept`           | 내가 어떤 응답 형식을 원하느냐 (`application/json` 등)       |
| `Cookie`           | 이전에 저장된 쿠키값                                    |
| `Referer`          | 이 요청을 보낸 페이지 URL                               |
| `X-Requested-With` | Ajax 요청 여부 (프론트에서 종종 사용됨)                      |

개발자가 Header를 통해 해야 할 일
- 클라이언트 쪽: 어떤 브라우저인지 알려주고, 인증 토큰도 Header에 넣어 전송해야 함
- 서버 쪽: Header의 인증 정보, 쿠키, Content-Type 등을 보고 요청을 처리함

FastAPI에서 Header 사용 예시
```python
from fastapi import FastAPI, Header

app = FastAPI()

@app.get("/items/")
async def read_items(user_agent: str = Header(None)):
    return {"User-Agent": user_agent}
```
요약하자면, 개발자가 HTTP Header에 정보를 담아 요청을 보내는 목적은, 
단순한 데이터 전달 외에 상황 파악, 보안, 유연한 처리를 위한 추가 정보를 서버가 알 수 있게 하기 위해서입니다.

###### HTTP Header에 정보를 담는 목적은?
| 목적             | 설명                                         | 예시                                            |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| 디버깅 및 <br>로깅   | 누가, 어떤 환경에서, 어떤 방식으로 요청했는지 확인해서 문제를 <br>추적 | `User-Agent`, `Referer`, <br>`X-Request-ID` 등 |
| 인증 및 <br>보안    | 유저가 인증된 사람인지 확인                            | `Authorization: Bearer <token>`               |
| 국가/언어 정보 전달    | 사용자 맞춤 정보 제공                               | `Accept-Language: ko-KR`                      |
| API 버전 <br>관리  | 클라이언트가 어떤 버전을 쓰는지 알려줌                      | `X-API-Version: v2`                           |
| 디바이스 <br>분기 처리 | PC/모바일/앱 등 환경에 따라 다르게 응답                   | `User-Agent`로 구분                              |
| 캐시 제어          | 응답을 캐시할지 말지 결정                             | `Cache-Control`, `ETag`                       |
| 추가 상태 추적용      | 요청 간의 연결 관계 추적                             | `X-Request-ID`, `Correlation-ID`              |

공통 개념:
HTML의 `<meta>` 태그와 HTTP Header는 웹페이지나 웹 요청에 대해 설명해주는 메모 같은 역할을 합니다.  
둘 다 보이지 않지만 중요한 정보를 브라우저나 서버에 전달합니다.

HTML `<meta>` 태그는 문서 안에 담기는 정보:
HTML 문서 안에서 브라우저에게 이 문서는 이런 특성을 갖고 있어요라고 알려주는 역할입니다.

예를 들어:
```html
<meta charset="UTF-8"> 
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
- `charset`: 이 문서는 UTF-8 문자셋으로 작성되었어요.
- `viewport`: 모바일 화면에 맞게 반응형으로 보여주세요.
즉, 메타태그는 브라우저가 화면을 어떻게 보여줄지 결정하는데 도움을 줍니다.

HTTP Header는 통신할 때 덧붙이는 정보:
HTML은 문서 자체의 설명이라면,  
HTTP Header는 서버와 클라이언트가 서로 주고받는 대화에서 이 요청은 이런 상황이에요 라고 설명하는 것입니다.
```python
GET /api/items HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept-Language: ko-KR
```
- `User-Agent`: 나는 크롬 브라우저에서 요청하고 있어요.
- `Accept-Language`: 한국어로 된 결과를 받고 싶어요.

예를 들어, 어떤 API 서버가 언어를 자동 감지해서 한국어로 보여준다면,  
사실은 브라우저가 위의 `Accept-Language: ko-KR` 헤더를 자동으로 보내주는 덕분입니다.

쉽게 비유하면?
- 메타태그는 책 속의 서문입니다.  
    책을 읽기 전에 “이 책은 어떤 문체로 쓰였고 어떤 독자를 위한 책인지” 알려주는 느낌.
    
- HTTP Header는 택배 박스에 붙은 송장입니다.  
    물건(본문/데이터)과 함께 누가 보냈는지, 언제 보냈는지, 내용물이 뭐인지를 알려주는 스티커죠.