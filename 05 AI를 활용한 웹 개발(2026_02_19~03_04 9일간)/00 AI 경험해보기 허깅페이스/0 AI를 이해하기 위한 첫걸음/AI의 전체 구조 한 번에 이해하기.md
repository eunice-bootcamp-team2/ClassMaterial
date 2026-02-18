### ✔ 알고리즘의 기본 개념

알고리즘(Algorithm) 이란?  
문제를 해결하기 위한 절차, 규칙, 방법의 순서를 말합니다.

🔹 일상 예시

라면 끓이기 알고리즘:
1. 물을 끓인다
2. 스프를 넣는다
3. 면을 넣는다
4. 3분 기다린다
    
➡️ 이 정해진 순서 자체가 알고리즘입니다.

✔ 인공지능에서 말하는 알고리즘

인공지능에서 알고리즘은  
데이터를 보고 규칙을 찾고, 예측하거나 판단하는 수학적 방법입니다.

예를 들면:
- 이 사진은 고양이일 확률이 얼마인가?
- 이 문장은 긍정일까 부정일까?
- 다음 단어로 뭐가 나올 가능성이 높을까?
    
이 질문에 답하기 위한 계산 규칙이 알고리즘입니다.

###### 인공지능 학습 방식별 알고리즘 분류
| 분야    | 의미          | 대표 알고리즘                    | 한 줄 설명          |
| ----- | ----------- | -------------------------- | --------------- |
| 지도학습  | 정답을 알려주고 학습 | 선형 회귀, 로지스틱 회귀, SVM, 결정 트리 | 문제 + 정답 세트로 공부  |
| 비지도학습 | 정답 없이 패턴 찾기 | KMeans, PCA, DBSCAN        | 비슷한 것끼리 묶기      |
| 강화학습  | 보상으로 학습     | Q-Learning, DQN            | 잘하면 보상, 못하면 패널티 |
| 딥러닝   | 신경망 기반      | CNN, RNN, Transformer      | 사람 뇌 구조를 흉내     |

알고리즘 vs 모델 vs 프레임워크 (가장 헷갈리는 부분)
	이 구분을 이해하면 AI 개념의 70%는 끝입니다

✔ 한 문장 요약
- 알고리즘: 공부 방법
- 모델: 공부를 끝낸 결과물
- 프레임워크: 공부시키는 도구

| 구분               | 정의                        | 예시                                        |
| ---------------- | ------------------------- | ----------------------------------------- |
| 알고리즘 (Algorithm) | 문제 해결을 위한 수학적 방법이나 구조     | Transformer, CNN, RNN                     |
| 모델 (Model)       | 알고리즘을 기반으로 학습된 결과         | GPT, BERT, LLaMA, YOLO                    |
| 프레임워크 / 라이브러리    | 알고리즘과 모델을 구현하고 실행하기 위한 도구 | PyTorch, TensorFlow, Hugging Face, OpenCV |

###### 인공지능 주요 분야 한눈에 보기 : 분야별 정리

| 분야                       | 하는 일     | 쉬운 예시              | 대표 모델            | 핵심 알고리즘           | 사용 도구 / 프레임워크             |
| ------------------------ | -------- | ------------------ | ---------------- | ----------------- | ------------------------- |
| LLM / NLP                | 글 이해·생성  | 번역기, 챗봇, 요약        | GPT, BERT, LLaMA | Transformer       | Hugging Face, OpenAI      |
| 컴퓨터 비전                 . | 이미지 인식   | 얼굴 인식, 자율주행, 사진 분류 | YOLO, ResNet     | CNN               | OpenCV, PyTorch           |
| 음성 AI                    | 말 ↔ 글    | 음성 자막 생성, 텍스트 읽어주기 | Whisper          | RNN, Transformer  | Whisper, Mozilla TTS      |
| 멀티모달 AI                  | 여러 입력 처리 | 이미지에 대해 질문하면 설명해줌  | CLIP             | Transformer 기반 융합 | Hugging Face, OpenAI CLIP |

### ✔ Hugging Face란 무엇인가?
	AI 개발자들의 GitHub + 앱스토어 + 모델 마켓

Hugging Face는 전 세계 개발자들이 만든 AI 모델, 코드, 데이터셋을 모아둔 오픈소스 플랫폼입니다. 쉽게 말하면 AI 개발자들의 GitHub + 앱스토어 같은 곳이라고 보시면 돼요.

허깅페이스 링크[https://huggingface.co/](https://huggingface.co/)

그래서 개발자는 Hugging Face에 있는 모델이나 라이브러리를 이용해서 웹사이트에 붙이거나 직접 개발할수 있습니다. 

| 이유                  | 설명                                                  |
| ------------------- | --------------------------------------------------- |
| 사전학습 모델 제공          | GPT, BERT, YOLO, Whisper 등 이미 학습된 모델을 바로 사용할 수 있어요. |
| 간단한 코드              | `pip install transformers` 후 3~5줄 코드로 모델 실행 가능.     |
| 웹 데모 도구 제공 (Spaces) | 코딩 없이도 웹앱을 만들 수 있는 Gradio, Streamlit 통합             |
| API처럼 호출 가능         | Inference API를 통해 모델을 **REST API로 바로 사용** 가능        |
| 문서와 예제가 풍부          | 초보자용 튜토리얼이 잘 되어 있어 그대로 따라 하기만 해도 OK                 |

필요한 라이브러리 설치
```bash
pip install streamlit transformers torch
```

허깅페이스의 스트림-릿으로 웹사이트 띄워보기 맛보기
```python
# my_app.py
import streamlit as st
import torch

from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, set_seed

st.title("안녕하세요!")
st.write("이건 Streamlit으로 만든 웹앱입니다.")
```

터미널에서 다음 명령 실행:
```bash
streamlit run my_app.py
```

Hugging Face의 사전학습 모델 중 하나인 **`skt/kogpt2-base-v2`** 를 기반으로 한 코드

한국어 GPT텍스트 생성기 (KoGPT)
```python
import streamlit as st
from transformers import GPT2LMHeadModel, PreTrainedTokenizerFast

st.title("한국어 GPT 텍스트 생성기 (KoGPT)")
st.markdown("한국어로 자연스럽게 이어지는 문장을 생성합니다.")

# KoGPT 로딩
@st.cache_resource
def load_model():
    model = GPT2LMHeadModel.from_pretrained("skt/kogpt2-base-v2")
    tokenizer = PreTrainedTokenizerFast.from_pretrained("skt/kogpt2-base-v2", bos_token='</s>', eos_token='</s>', unk_token='<unk>', pad_token='<pad>', mask_token='<mask>')
    return model, tokenizer

model, tokenizer = load_model()

# 입력값
text = st.text_area("시작 문장을 입력하세요", "나는 오늘 기분이 너무 좋았어")
max_length = st.slider("생성할 길이 (토큰 수)", 20, 100, 50)
temperature = st.slider("창의성 조절 (temperature)", 0.7, 1.5, 1.0)

# 버튼 클릭
if st.button("생성하기"):
    input_ids = tokenizer.encode(text, return_tensors='pt')

    output = model.generate(
        input_ids,
        max_length=max_length,
        temperature=temperature,
        top_p=0.9,
        top_k=50,
        do_sample=True,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id
    )

    result = tokenizer.decode(output[0], skip_special_tokens=True)
    st.markdown("### 🤖 생성된 문장")
    st.success(result)
```

---
사전학습 모델: KoGPT
```python
from transformers import GPT2LMHeadModel, PreTrainedTokenizerFast
```
이 부분이 Hugging Face 라이브러리에서 제공하는 모델 구조 및 토크나이저입니다.  
이 함수들은 Hugging Face Model Hub의 경로를 기반으로 모델을 다음처럼 불러옵니다:
```python
model = GPT2LMHeadModel.from_pretrained("skt/kogpt2-base-v2")
tokenizer = PreTrainedTokenizerFast.from_pretrained("skt/kogpt2-base-v2")
```
즉, Hugging Face 모델 허브에서 자동으로 다운로드 받아 사용하는 방식입니다.

그러나 우리의 목표는 사전학습된 모델이 아닌 우리가 직접 데이터를 수집하여 직접 학습 또는 파인튜닝을 시키고 결과를 얻어내는 것입니다.

"사전학습(Pretraining)" 과 "파인튜닝(Fine-tuning)"이란?

### ✔ 사전학습 (Pretraining)
- 정의: 모델이 언어의 기본 구조와 규칙을 배우는 첫 번째 학습 단계
- 데이터: 위키백과, 뉴스, 블로그 등 대용량 일반 텍스트
- 목적: 문장 구성, 어휘, 문법 등 언어 자체에 대한 지식 습득
- 예시: GPT, BERT 등은 모두 사전학습된 모델
쉽게 설명하면:
- Hugging Face 서버에서
- 이미 학습된 한국어 GPT 모델을
- 자동으로 다운로드해서
- 내 컴퓨터에서 바로 사용
- 우리는 학습을 안 했는데도 AI가 글을 써줌

---
### ✔ 파인튜닝 (Fine-tuning)
- 정의: 사전학습된 모델을 특정 작업에 맞게 추가 학습시키는 단계
- 데이터: 감정 분석, 뉴스 분류, 챗봇 대화 등 작업별 데이터셋
- 목적: 모델이 특정 문제를 더 잘 해결하도록 조정
- 예시: GPT를 영화 리뷰 감정 분석에 맞게 파인튜닝 → 감정 분석 모델 완성
쉽게 설명하면:
- Hugging Face에서 사전학습된 모델을 가져오고
- 내가 준비한 내 데이터(라벨이 있는 데이터)를 사용해
- 기존 지식을 유지한 채
- 특정 문제에 맞게 조금 더 공부를 시키는 것
- 그래서 같은 GPT라도 결과가 완전히 달라짐

==간단히 요약하면:==
✅ 사전학습 = 세상의 언어를 배우는 단계 
✅ 파인튜닝 = 내가 시키고 싶은 일을 잘하도록 가르치는 단계

사전학습된 GPT는 똑똑한 사람이고,  
파인튜닝은 그 사람에게 직무 교육을 시키는 것입니다.


