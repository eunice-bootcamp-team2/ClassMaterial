① Ctrl + Click (정의로 이동)
```
from apps.reviews.models import Review
```
`Review` 클릭 → models.py 이동

---
② F12 (Go to Definition)

Ctrl 클릭과 동일하지만 더 정확함

예시로 설명
코드를 보다가 이런 상황 있습니다.
```python
review = Review.objects.get(id=review_id)
```
여기서 궁금함:
- Review 모델 어디 있음?
- 필드 뭐 있음?
- 구조 어떻게 생겼지?
이때 F12

1. 커서를 대상 위에 올림
2. `F12` 누름

예:
```python
Review
```
F12 누르면  
→ `models.py`의 Review 클래스로 이동

(마우스 방식)
1. Ctrl 누른 상태에서 클릭

이것도 동일하지만
❗ 차이:
- Ctrl 클릭 = 가끔 틀릴 수 있음
- F12 = 더 정확함

---
③ Alt + ← / → (뒤로 / 앞으로 이동)

이거 진짜 중요함
`views → models → serializers → 다시 views`
왔다 갔다 할 때 필수

이 기능은 F12랑 세트로 써야합니다.
- Alt + ← : 방금 전에 보던 코드 위치로 돌아가기
- Alt + → : 다시 앞으로 가기

즉, 웹브라우저의 뒤로가기 / 앞으로가기랑 거의 똑같습니다.

코드 읽을 때 보통 이렇게 합니다.
1. `views.py` 보고 있음
2. `Review` 궁금해서 F12
3. `models.py`로 이동
4. `ReviewSerializer` 궁금해서 또 F12
5. `serializers.py`로 이동
6. 근데 아까 보던 `views.py`의 그 줄로 다시 가고 싶음

그래서:
- Alt + ← 누르면 이전 위치로 돌아감
- 한 번 더 누르면 그 전 위치로 또 돌아감

비유하면 ctrl + z 는 수정 코드 되돌리기면 
 Alt + ← 는 내가 봤던 위치로 돌아갔다 왔다 갔다 하는 기능입니다.

---
④ Ctrl + Shift + F (전체 검색)
프로젝트 전체에서 찾기
```
analyze_review_similarity_task
```
어디서 호출되는지 한 번에 확인 가능

프로젝트 전체에서 특정 코드(문자열)를 모두 찾는 기능

예시: 코드보다 이런 생각이 들때
```
이 함수 어디서 쓰이지?  
이 변수 어디서 바뀌지?  
이 API 어디서 호출하지?
```
이때 사용합니다.

방법
1. `Ctrl + F`
2. 검색어 입력

---
### 반드시 써야 하는 흐름 추적법
코드 리뷰할 때 이렇게 보면 됩니다.

---
기준: “요청 하나”를 끝까지 따라가라

예:
사용자가 버튼 클릭 → AI 분석 실행

---
실제 추적 순서
1. JS (axios 요청)  
2. urls.py  
3. views.py  
4. service / task  
5. FastAPI  
6. DB 저장  
7. 응답 반환

---
프로젝트 기준 흐름

`product_detail.js  `
```
→ /ai/reviews/<id>/analyze/  
  
→ ai_gateway/urls.py  
→ ai_gateway/views.py  
  
→ analyze_review_similarity_task.delay()  
  
→ tasks.py  
  
→ FastAPI 호출  
  
→ DB 저장  
  
→ WebSocket or 결과 반환
```
이걸 한 번 따라가면 전체 구조가 이해가 됩니다.

예시:
기능 하나를 잡고 끝까지 따라가면서 메모하는 방식” = 가장 좋은 방법 (실무에서도 이렇게 함)

단, 그냥 따라가는 게 아니라 구조를 뽑아내면서 따라가야 합니다.

```
파일 기준  
views.py  
tasks.py  
services.py  
fastapi.py
```
파일 기준은 위와 같지만 실제 흐름은 아래와 같습니다.
```
요청 기준 (흐름)  
JS → URL → View → Task → FastAPI → DB → 응답
```
그래서
❌ 파일 단위로 보면 절대 이해 안됨  
⭕ 기능 흐름으로 보면 바로 이해됨

STEP 1. 기능 하나 잡기
```
STEP 1. 기능 하나 잡기
```

STEP 2. 흐름 따라가기 (F12 + 검색 활용)
```
product_detail.js  
→ /ai/reviews/<id>/analyze/  
→ urls.py  
→ views.py  
→ task 호출  
→ tasks.py  
→ FastAPI  
→ DB 저장  
→ 응답
```

STEP 3. 이걸 “메모”로 정리
```
[AI 리뷰 분석 기능 흐름]  
  
1. 사용자가 버튼 클릭 (product_detail.js)  
2. /ai/reviews/<id>/analyze/ 요청 발생  
  
3. ai_gateway/urls.py  
→ ReviewAnalyzeAPIView 연결  
  
4. views.py  
→ analyze_review_similarity_task.delay() 호출  
  
5. tasks.py  
→ 리뷰 가져옴  
→ FastAPI로 임베딩 요청  
  
6. FastAPI  
→ 유사도 계산  
  
7. DB 저장  
→ ReviewEmbedding / 결과 저장  
  
8. 결과 반환 or WebSocket 전송
```
이게 진짜 “이해한 상태”입니다.

업그레이드 메모
```
[AI 리뷰 분석 기능]  
  
1. JS (요청 발생)  
→ 사용자가 버튼 클릭  
  
2. URL (라우팅)  
→ 어떤 view로 갈지 결정  
  
3. View (입구)  
→ 요청 받음  
→ Celery task 실행  
  
4. Task (비동기 처리)  
→ 실제 AI 로직 실행  
  
5. FastAPI (AI 서버)  
→ 임베딩 생성 / 유사도 계산  
  
6. DB (저장)  
→ 결과 캐싱  
  
7. Response (출구)  
→ 사용자에게 결과 전달
```

기억해야 할 것은
```
코드 = 파일이 아니라 역할들의 연결이다
```

그래서 흐름을 한줄로 화살표로 정리합니다
```
[AI 분석]

사용자
  ↓
JS
  ↓
Django View
  ↓
Celery Task
  ↓
FastAPI
  ↓
DB
  ↓
응답
```

---
코드 리뷰할 때 가장 쉬운 방법 (실무 방식)

❌ 잘못된 방법 (초보자)

파일 하나씩 읽기 : 절대 이해 안됨

---
✅ 올바른 방법

“기능 단위”로 읽기

예:
- 로그인 기능만 보기
- 리뷰 작성 기능만 보기
- AI 분석 기능만 보기

---
3단계 코드 이해 공식

① 이 코드는 언제 실행되는가?
```
def get(self, request, review_id):
```
언제 실행됨?  
→ GET 요청 들어올 때

② 이 코드는 무엇을 입력으로 받는가?
```
review_id  
request.user
```

③ 이 코드는 무엇을 반환하는가?
```
Response(data)
```

이 3개만 보면 코드 70% 이해됨

---
코드가 길어질 때 해결 방법 (핵심)
파일 기준 이 아니라 흐름 기준으로 봅니다.

---
❌ 이렇게 보면 망함
```
views.py 500줄 읽기
```

---
✅ 이렇게 봐야 함
```
요청 → 처리 → 결과
```

---
🔥 시각화 (이거 진짜 중요 ⭐)
흐름도 그리는 것 = 최고 방법

---
추천 방법 3가지
1️⃣ 종이에 그리기 (가장 강력)
```
JS → Django → Celery → Redis → FastAPI → DB
```
손으로 그리면 기억에 남습니다.

---
2️⃣ 간단 텍스트로 정리
```
[사용자 클릭]  
→ axios  
→ views  
→ task  
→ fastapi  
→ result
```

---
3️⃣ draw.io / lucidchart 또는 figma

실무에서 많이 씀

---
메모 방법 (이게 진짜 중요)

❌ 하지 말 것
```
코드 그대로 복붙
```

---
✅ 이렇게 메모해야 합니다.

예시
```
[AI 분석 흐름]  
  
1. 사용자가 버튼 클릭  
2. /ai/reviews/<id>/analyze/ 호출  
3. view에서 Celery task 실행  
4. Celery → FastAPI 요청  
5. 결과 DB 저장  
6. 결과 반환 or WebSocket 전달
```
이게 진짜 실력 올라가는 메모 방식

---
🔥 어디가 잘못됐는지 찾는 방법 (디버깅 핵심)

방법 1️⃣ 로그 기준으로 자르기
```
view 로그 찍힘 → OK  
task 로그 없음 → Celery 문제
```

---
방법 2️⃣ 흐름 끊기는 지점 찾기
```
JS → OK  
view → OK  
task → ❌ 실행 안됨
```
문제 위치 바로 찾음

---
방법 3️⃣ “하나씩 테스트”
```
curl API 테스트  
FastAPI 직접 호출  
Celery 단독 실행
```
---
실무 개발자가 실제로 하는 코드 리뷰 방식

Step 1. 이 기능 뭐지? 정의

리뷰 유사도 분석 기능

Step 2. “입력 → 출력” 확인
```
입력: review_id  
출력: 유사 리뷰 리스트
```

Step 3. “흐름 추적”
```
JS → view → task → FastAPI → DB
```

Step 4. “문제 위치 찾기”
```
어디까지 실행됨?
```
---
실습 예시
상품등록 버튼 따라가기
```
HTML (a 태그)  
→ URL (/products/create/)  
→ urls.py  
→ views.py  
→ template
```

브라우저에서 상품등록의 href 주소를 찾습니다.
![[Pasted image 20260323191852.png]]
① HTML에서 href 확인
```
<a href="/products/create/">
```

② Ctrl + Shift + F 검색
```
products/create
```
찾는 위치: `apps/products/urls.py` 대부분 mysit와 연결된 앱일 확률이 높으니 그 순서로 찾아야 합니다.

![[Pasted image 20260323192206.png]]

③ F12 → view 이동 
```python
class ProductCreateView(...)
```
- GET → 페이지 보여줌
- POST → 데이터 저장

![[Pasted image 20260323192341.png]]④ template 찾기
```python
template_name = "products/product_create.html"
```
해당 경로의 HTML 이동합니다

결국 버튼을 클릭하면 해당페이지로 이동하는 기능이 한패턴입니다.


--- 
다른 예시
AI 버튼 클릭시
```
클릭 → JS → Django → Celery → Redis → FastAPI → DB → 결과 반환
```

`1.` 브라우저에서 버튼의 위치를 찾습니다.
![[Pasted image 20260323192929.png]]

`2.` 관련된 js로 이동합니다. 
![[Pasted image 20260323193054.png]]

`3.` 아래를 보면 전송하는 post가 보이고 주소가 보입니다.
![[Pasted image 20260323193529.png]]

`4.` `/ai/reviews/${reviewId}/analyze/`

`5.` JS → Django 요청
```
/ai/reviews/1/analyze/
```

`6.` `ai-gateway/urls.py` 
```python
path("ai/reviews/<int:review_id>/analyze/", ReviewAnalyzeAPIView.as_view())
```
URL → View 연결 

`7.` F12번으로 클래스로 이동합니다. 이 지점이 바로 AI 분석 기능의 입구입니다.
이 View를 봤다면 다음 순서로 코드 리뷰를 하면 됩니다.
```python
1. 이 View를 누가 호출하는가  
2. 이 View가 어떤 URL에 연결되는가  
3. 이 View 안에서 어떤 함수가 실행되는가  
4. 그 함수가 실제로 어디서 처리되는가  
5. 결과를 어디에 저장하는가  
6. 프론트는 그 결과를 어떻게 받는가
```

```
JS  
→ /ai/reviews/<review_id>/analyze/  
→ ai_gateway/urls.py  
→ ReviewAnalyzeAPIView.post()  
→ analyze_review_similarity_task.delay()  
→ tasks.py  
→ FastAPIClient  
→ FastAPI  
→ AIAnalysisTask / ReviewSimilarityResult 저장  
→ 프론트 polling 또는 WebSocket
```

지금 이 View에서 먼저 읽어야 하는 포인트
이 View는 크게 4덩어리로 나뉘어 있습니다
1. 리뷰가 존재하는지 확인
```python
source_review = get_object_or_404(
    Review.objects.select_related("user", "product"),
    id=review_id,
    is_public=True,
)
```
이 부분에서 봐야 할 것:
- `review_id`를 받아서
- 공개된 리뷰인지 확인하고
- 없으면 404

즉 역할은:
```
“분석할 대상 리뷰가 진짜 있는지 검사”
```
여기서 `Review`가 궁금하면 `F12`로 `models.py` 가서  리뷰 구조를 확인하면 됩니다.

2. 리뷰 내용이 비어있는지 확인
```
if not source_review.content.strip():
```

이 부분의 역할:
리뷰는 존재해도 내용이 없으면 분석 못 하니까 미리 막음
즉 이 View는 실제 AI 계산을 하지 않고, 분석 가능한 요청인지 검사하는 입구 역할입니다.

---
3. Celery 작업 등록
```python
async_result = analyze_review_similarity_task.delay(  
    review_id=source_review.id,  
    requested_by_id=requested_by_id,  
)
```

여기가 제일 중요합니다.

여기서 이해해야 하는 건:
- `delay()`가 붙었다
- 즉 즉시 계산하는 게 아니라
- Celery worker에게 넘긴다

이 한 줄을 기준으로 다음 리뷰 위치가 정해집니다.

👉다음으로 봐야 할 곳 = `analyze_review_similarity_task` 정의부

즉 여기서는 `F12`를 눌러서 바로 `tasks.py`로 가면 됩니다.

---
4. Task의 역할
```python
def analyze_review_similarity_task(self, review_id: int, requested_by_id: int | None = None):
```
역할
```
1. 리뷰 가져옴  
2. FastAPI 호출  
3. 임베딩 생성  
4. 유사도 계산  
5. DB 저장 (여기!)  
6. 결과 생성  
7. Redis publish
```

이 코드의 흐름으로 실제 구조를 파악해보면
```
View = 입구  
Task = 진짜 로직
```

마지막으로 DB모델을 확인합니다. tasks.py 상단에 연동된 모델을 확인하면 됩니다.
```python
from .models import AIAnalysisTask, ReviewEmbedding, ReviewSimilarityResult
```
F12번으로 이동하기

확인할 것:
- 어떤 데이터 저장하는지
- 필드 구조

추가확인할 부분
2️⃣ FastAPIClient 보기
```
FastAPIClient.get_embedding()
```
F12
확인:
```
Django → FastAPI 어떻게 호출하는지
```

---
3️⃣ Redis publish 확인
```
redis_client.publish(...)
```

의미:
```
WebSocket으로 결과 보내기
```

---
🔥 지금 코드 한 줄로 요약

이 task는
```
리뷰 → 벡터 → 유사도 계산 → DB 저장 → 결과 전달
```

---
🔥 지금 해야 할 메모

이렇게 정리하기
```
[AI 분석 Task]  
  
1. Review 가져옴  
2. FastAPI로 embedding 생성  
3. ReviewEmbedding 저장  
4. 후보 리뷰 조회  
5. 유사도 계산 (pgvector)  
6. ReviewSimilarityResult 저장  
7. AIAnalysisTask 상태 업데이트  
8. Redis publish (WebSocket)
```

---
최종 핵심 한 줄
```
DB 저장은 View가 아니라 tasks.py에서 일어난다
```