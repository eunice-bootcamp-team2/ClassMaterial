허깅페이스 링크[https://huggingface.co/](https://huggingface.co/)
![[Pasted image 20260202104629.png]]

### 🔹 1단계: 상단 검색창 사용
지금 화면 맨 위 가운데에 있는 이 칸 
`Search models, datasets, users...`

여기에 이렇게 입력:
```
sentiment analysis
```

### 🔹 2단계: 자동완성 목록은 무시해도 됨
이미지와 같이 제일 아래 있는 이 줄을 클릭하세요

자동완성 목록 맨 아래에 있는
```
See 2249 model results for "sentiment analysis
```
이걸 클릭

📌 이게 핵심 버튼이에요.  
→ 추천 몇 개가 아니라  
→ 전체 감정분석 모델 목록 페이지로 이동합니다.
![[Pasted image 20260202110522.png]]

Hugging Face에서 감정분석 모델 고르는 법 (실무 기준)

1️⃣ 실무에서 모델 고를 때 보는 순서 (중요도 순)

✅ 1순위: Task & Pipeline 태그

모델 카드에 반드시 있어야 함:
- `Task: Text Classification`
- `Pipeline tag: sentiment-analysis`
    
📌 이게 없으면  
→ pipeline으로 바로 못 씀  
→ FastAPI / Django 연동 불편

🔗 [[#감정분석 모델의 예시]]  예시로 확인하기 링크

---
✅ 2순위: Library (Transformers)

왼쪽 필터에서 Transformers 체크한 이유가 이거예요.

- `from transformers import pipeline`
- 표준 인터페이스
- 유지보수 쉬움
- 팀원도 바로 이해함
    
📌 실무에서는 거의 무조건 Transformers 기반 씁니다.

---
✅ 3순위: 최근 업데이트 날짜

모델 목록에서 꼭 보세요:
- 최근 1~2년 내 업데이트 → 👍
- 2021~2022에 멈춘 모델 → ❌ (웬만하면 패스)
    
📌 이유:
- transformers / torch 버전 충돌
- deprecated 옵션 많음
    
---
✅ 4순위: 모델 크기 (중요)

지금 화면에서 보이는 예:
- `0.1B`, `82.1M`, `0.5B` 이런 표기
    
플랫폼 초반에는:
- ❌ Large / Huge 모델
- ✅ small ~ base 모델
    
이유:
- 응답 속도
- 서버 비용
- 메모리 안정성
    
---
✅ 5순위: 좋아요(❤️) / 다운로드 수
	보조 지표입니다.

- 👍 많다 → 사람들이 써봤다는 의미
- ❌ 내 서비스에 맞다는 보장은 아님
    
실무 기준:
> 좋아요는 신뢰도 보조 지표로 선택 기준은 아님

---
![[Pasted image 20260202111038.png]]

2️⃣ 지금 화면에서 모델들을 실무 기준으로 분류해보면

실무 테스트용으로 괜찮은 타입
- `finiteautomata/bertweet-base-sentiment-analysis`
    - Twitter 기반
    - base 모델
    - pipeline 바로 가능
        
- `tabularisai/multilingual-sentiment-analysis`
    - 다국어
    - 범용 테스트용
    - 빠르게 붙이기 좋음
        
---
⚠️ 목적 특화 모델 (지금은 비추)

- `financial-news-sentiment-analysis`
    - 금융 뉴스 전용
    - 일반 감정분석엔 과적합
        

❌ 지금 단계에서 피할 모델

- 업데이트 2021~2022
- likes 거의 없음 + 사용 예제 부족
- `Fill-Mask`로 되어 있는 것 (감정분석 아님)
    
---
3️⃣ 실무에서 쓰는 모델 선택 공식
```
(1) pipeline 가능?
(2) Transformers 기반?
(3) 최근 업데이트?
(4) 모델 크기 적당?
-------------------
→ YES면 일단 써본다
```

실무에서는 완벽한 모델 안 찾습니다.

- 붙여보고
- 데이터 모으고
- 나중에 바꿉니다.
    
---
4️⃣ 그래서 지금 가장 현실적인 선택은?

🎯 추천 전략
1️⃣ 범용 모델 하나 선택
- multilingual or english
- 빠르게 API 연결
    
2️⃣ FastAPI로 감정분석 API 완성
3️⃣ 실제 서비스 문장 테스트
4️⃣ 부족하면 → 한국어 특화 모델로 교체

이 흐름이 실무에서 90%입니다.

---
### 감정분석 모델의 예시

Hugging Face에서
`Task: Text Classification` / `pipeline tag: sentiment-analysis` 확인하는 법

[https://huggingface.co/tabularisai/multilingual-sentiment-analysis]
![[Pasted image 20260202114541.png]]
목록 화면에서는 안 보이고, 반드시 모델 상세 페이지(모델 카드)에 들어가야 보입니다.

1️⃣ 지금 화면에서 할일
지금 보고 있는 모델 목록 화면에서는  
❌ Task / pipeline tag를 확정적으로 알 수 없습니다.

👉 모델 이름을 클릭해야 합니다.

예를 들어, 맨 위에 있는 이걸 클릭하세요: 어떤 모델이든 상관없음 — 연습용
```
finiteautomata/bertweet-base-sentiment-analysis
```

2️⃣ 모델을 클릭하면 나오는 “모델 상세 페이지” 구조
	모델을 클릭하면 모델 카드(Model Card) 페이지로 이동합니다.  
	여기서 아래 3군데만 보면 됩니다.

3️⃣ 확인 포인트 ① — 상단 메타 정보 (가장 중요)

모델 페이지 맨 위쪽을 보면 이런 정보 블록이 있습니다:

- Task  
    → `Text Classification`
    
- Pipeline tag  
    → `sentiment-analysis`
    
📌 이 두 개가 둘 다 있어야 합니다.

✔ 이렇게 되어 있으면 OK
```
Task: Text Classification
Pipeline tag: sentiment-analysis
```

❌ 이런 경우는 탈락
- Task가 없음
- Task가 `Fill-Mask`, `Token Classification`
- Pipeline tag가 없음

![[Pasted image 20260202115612.png]]
위의 모델을 예시로 보면 
- Task (Text Classification)
- Pipeline tag (sentiment-analysis)
- Transformers 사용 (있음)

이 3개가 보이면  
→ FastAPI / Django에 바로 붙여도 되는 모델입니다.

뜻으로 보면:
- Task = Text Classification : 텍스트를 입력하면 → 미리 정해진 카테고리(라벨)중 하나로 분류하는 작업 즉 이 모델은 문장을 분류하는 모델이다 라는 뜻입니다.
- Pipeline tag = sentiment-analysis : 이 Text Classification 모델을 감정분석용으로 바로 쓰라고 Hugging Face가 인정한 타입으로 감정분석용으로 바로 쓰는 표준 인터페이스가 있다 라는 뜻
- Transformers 사용 : Hugging Face의 표준 라이브러리(`transformers`)로 이 모델을 불러서 쓸 수 있다는 뜻입니다.

위의 세개를 한문장으로 합쳐서 이해하면 
이 모델은 텍스트 분류 모델이고(Task), 그중에서도 감정분석에 특화되어 있으며(pipeline tag),  
Hugging Face 표준 라이브러리로 바로 사용할 수 있다(Transformers) 라고 해석하면 됩니다.

🔗 확인후 다시 제자리로 이동 [[#🔹 1단계 상단 검색창 사용]] [[# ]]

---
그러면 다른 모델은 어떤가? 

모든 AI 모델은  
1️⃣ 무슨 일을 하는지_ 
2️⃣ 표준 인터페이스로 바로 쓸 수 있는지_ 
3️⃣ 어떤 라이브러리로 쓰는지

이 3가지를 반드시 확인한다.

🧠 모델 종류별로 3대 체크 포인트가 어떻게 바뀌는지 알아봅니다.

1️⃣ NLP (텍스트) 모델

###### 예: 감정분석, 번역, 요약
| 확인 항목        | 의미                                                |
| ------------ | ------------------------------------------------- |
| Task         | Text Classification / Translation / Summarization |
| Pipeline tag | sentiment-analysis / translation / summarization  |
| Library      | Transformers                                      |
👉 위에서 감정분석으로 설명한 내용입니다.

---
2️⃣ 컴퓨터 비전 (이미지) 모델은 어떻게 보나?

###### 예: 이미지 분류, 객체 탐지, 얼굴 인식
| 역할           | 감정분석                | 컴퓨터 비전                                                       |
| ------------ | ------------------- | ------------------------------------------------------------ |
| Task         | Text Classification | Image Classification / Object Detection / Image Segmentation |
| Pipeline tag | sentiment-analysis  | image-classification / object-detection / image-segmentation |
| Library      | Transformers        | Transformers / Diffusers / timm                              |

예시
```
Task: Image Classification
Pipeline tag: image-classification
Library: Transformers
```

이러면 이미지도 pipeline으로 바로 사용 가능
```
pipeline("image-classification")
```

---
3️⃣ 음성(Speech) 모델은?

###### 예: 음성 → 텍스트, 텍스트 → 음성
| 역할           | 확인                                            |
| ------------ | --------------------------------------------- |
| Task         | Automatic Speech Recognition / Text-to-Speech |
| Pipeline tag | automatic-speech-recognition / text-to-speech |
| Library      | Transformers                                  |

ASR 모델이면:
```
pipeline("automatic-speech-recognition")
```

---
4️⃣ 생성형 모델(LLM, 이미지 생성)은?

여기서 조금 달라져요.

###### 텍스트 생성 (LLM)
| 항목           | 확인              |
| ------------ | --------------- |
| Task         | Text Generation |
| Pipeline tag | text-generation |
| Library      | Transformers    |
하지만 실무에서는:
- pipeline 대신 `AutoModelForCausalLM` 직접 쓰는 경우 많음
    
---
###### 이미지 생성 (Diffusion)
| 항목           | 확인              |
| ------------ | --------------- |
| Task         | Text-to-Image   |
| Pipeline tag | text-to-image   |
| Library      | **Diffusers** ⭐ |

👉 여기서는 Transformers보다 Diffusers가 핵심 라이브러리

---
5️⃣ 그럼 이 세 개만 보면 되는가?에 대한 정확한 답

❌ 잘못된 이해
> 무조건  
> Task / Pipeline tag / Transformers  
> 이것만 보면 된다

✅ 정확한 이해
> 항상 3가지는 본다
> 단,
> - Task 이름은 바뀌고
> - Pipeline tag 이름도 바뀌고
> - Library는 모델 종류에 따라 달라진다
---
실무에서 쓰는 범용 공식 (진짜 중요)
```
1. 이 모델은 무슨 일을 하나? (Task) 
2. 표준 호출 방식이 있나? (Pipeline tag / Example) 
3. 내가 아는 라이브러리로 쓰나? (Transformers / Diffusers / etc)
```

이 공식은
- NLP
- 컴퓨터 비전
- 음성
- 생성형 AI
전부 동일하게 적용됩니다.

🎯 모델을 고를때 기억하면 되는 한 문장
	모델 종류는 달라도, 항상 Task / 표준 사용법 / 라이브러리는 확인한다.

---
### 검색한 모델 검증하는 과정

```bash
deactivate # 가상환경안에 있다면
cd ~
mkdir test_llm

cd test_llm
code -r .

uv venv
source .venv/bin/activate

uv pip install -U pip
uv pip install --no-cache-dir "transformers==4.45.2"
uv pip install torch sentencepiece protobuf safetensors

```

pipeline 테스트
```python
from transformers import pipeline

summarizer = pipeline("summarization", model="lcw99/t5-base-korean-text-summary")

text = "이 제품 배송이 빠르고 품질도 만족스러웠습니다."
print(summarizer(text))
```

실행:
```bash
python test_llm_summary.py
```

결과
```
(llm_test) (.venv) youjung@DESKTOP-PJCRMMU:~/llm_test$ python test_llm_summary.py
model.safetensors: 100%|███████████████████████████████████| 1.10G/1.10G [00:12<00:00, 86.7MB/s]
Hardware accelerator e.g. GPU is available in the environment, but no `device` argument is passed to the `Pipeline` object. Model will be on CPU.
Your max_length is set to 20, but your input_length is only 18. Since this is a summarization task, where outputs shorter than the input are typically wanted, you might consider decreasing max_length manually, e.g. summarizer('...', max_length=9)
/home/youjung/llm_test/.venv/lib/python3.12/site-packages/transformers/generation/utils.py:1220: UserWarning: Using the model-agnostic default `max_length` (=20) to control the generation length. We recommend setting `max_new_tokens` to control the maximum length of the generation.
  warnings.warn(
[{'summary_text': '배송이 정말 빠르고 품질도 만족스러웠습니다. 배송이 정말 '}]
```
테스트 성공

테스트용과 개발용 가상환경은 각가 두는것이 훨씬 꼬임방지에 유리합니다.