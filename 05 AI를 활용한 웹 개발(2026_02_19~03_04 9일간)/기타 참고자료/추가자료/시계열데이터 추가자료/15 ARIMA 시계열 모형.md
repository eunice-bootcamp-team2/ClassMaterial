
---
## 🔚 이 강의의 최종 목표 한 줄 요약

> 주가는 ‘정답을 맞히는 문제’가 아니라 “어떤 가정과 구조로 예측하느냐”의 문제다.

---

## 14. Rolling Prediction (머신러닝 시계열 예측)의 진짜 의미

### ❌ 초보자가 흔히 하는 오해

- “모델 하나 만들어서 미래를 쭉 맞히면 되지 않나?”
- “test set에서 성능 좋으면 끝 아닌가?”

👉 **강사는 이 생각을 깨려고 이 파트를 넣은 거야.**

---

### ✅ Rolling Prediction이 말하는 핵심

### 1️⃣ 현실의 예측은 **한 번만 하는 게 아니다**

- 오늘 예측 → 내일 예측 → 모레 예측 …
- **미래로 갈수록 입력값 자체가 ‘예측값’이 된다**

즉,

```
실제값 → 예측 → 그 예측을 다시 입력으로 사용 → 또 예측
```

➡️ 이걸 **Rolling / Recursive / Multi-step Forecast** 라고 부름

---

### 2️⃣ 머신러닝 예측의 치명적인 약점

- 첫 예측이 조금만 틀려도
- 그 오차가 다음, 다음, 다음으로 **누적됨**

그래서:

- test 성능이 좋아도
- **30일 Rolling 예측은 급격히 흔들릴 수 있음**

👉 이걸 직접 보여주려고 **Rolling Prediction** 을 한 것

---

### 3️⃣ 강사가 진짜 말하고 싶은 포인트

> “RandomForest가 나쁘다는 게 아니다.
> 
> 시계열에서 머신러닝은 구조적 한계를 가진다.”

- 트리는 **패턴 암기에는 강함**
- 하지만 **시간의 흐름(동역학)** 을 이해하지는 못함
- 그래서 **멀어질수록 불안정**

---

## 15. ARIMA를 마지막에 넣은 이유 (아주 중요)

### ❓ 왜 갑자기 고전 시계열(ARIMA)을 다시 꺼냈을까?

👉 **14번의 한계를 ‘대비’시키기 위해서**

---

### 머신러닝 vs ARIMA의 관점 차이

|구분|머신러닝 (RF 등)|ARIMA|
|---|---|---|
|핵심 사고|패턴 학습|데이터 생성 구조|
|입력|Lag feature|자기 자신 + 오차|
|예측|강하지만 불안정|단순하지만 안정|
|Rolling|오차 누적 큼|상대적으로 안정|
|해석|블랙박스|해석 가능|

---

### 강사의 숨은 메시지

> “실무에서는
> 
> **복잡한 모델이 항상 더 좋은 건 아니다.**”

- 데이터가 짧다
- 구조가 단순하다
- 설명 가능성이 필요하다

👉 이런 상황에서는

**ARIMA / ETS / Naive** 같은 모델이 오히려 더 적합

---

## 🔗 그래서 1~15 전체 흐름을 연결하면

### 강의 전체 스토리라인

1️⃣ **Naive 모델**

- “아무것도 안 해도 이 정도는 나온다”

2️⃣ **ETS**

- 추세·계절성 같은 **구조적 규칙**

3️⃣ **통계 검정**

- 상관, 차이 검정 → **데이터 성질 이해**

4️⃣ **머신러닝**

- “패턴은 잘 잡는다”
- 하지만…

5️⃣ **Rolling Prediction**

- “미래 예측에서는 약점이 드러난다”

6️⃣ **ARIMA로 회귀**

- “시계열은 결국 시계열답게 다뤄야 한다”

---

## 🧠 강의의 최종 결론 (이게 진짜 핵심)

> ❌ “어떤 모델이 제일 좋다”
> 
> ✅ “**데이터 상황에 맞는 모델을 고를 줄 아는 게 실력이다**”

- 짧은 데이터 → 통계적 시계열
- 긴 데이터 + 외생 변수 → 머신러닝
- 기준선 → Naive / ETS
- 실무 → **여러 모델 비교**

---

## 📌 한 문장으로 정리

> 이 강의는 ‘주가 예측 방법’ 강의가 아니라 ‘시계열을 다루는 사고방식’ 강의다.









---
## 13. 은행 주가 데이터 미션 풀이 정리 (통계 분석)

### 6) 거래량 vs 시가/종가/고가/저가 상관성 검정

### (1) 결측치 확인

```python
df_hana1['거래량'].isnull().sum()
```

- 결과가 `0`이면 거래량 컬럼에 결측치 없음.

### (2) 정규성 검정 → 정규성 X 이므로 Spearman 사용

```python
from scipyimport stats
stats.normaltest(df_hana1['거래량'])
```

- **귀무가설(H0)**: 정규분포를 따른다
- **대립가설(H1)**: 정규분포가 아니다
- p-value가 **0.05보다 작으면** → **정규성 아님(비정규)**

캡처에서 p-value가 매우 작아서(≈ 1e-05) → **정규성 X**

➡️ 그래서 **Pearson(정규 가정)** 말고 **Spearman(순위 기반, 비정규에도 OK)** 로 상관 확인.

### (3) Spearman 상관계수 확인

```python
df_hana1[['거래량','시가','종가','저가','고가']].corr(method='spearman')['거래량']
```

- 거래량과 각 가격 변수의 **순위 상관(단조 관계)** 를 봄

### (4) 상관 “유의성” 검정 (spearmanr)

```python
for i in ['시가','종가','저가','고가']:
    print(stats.spearmanr(df_hana1['거래량'], df_hana1[i]))
```

- **귀무가설(H0)**: 거래량과 해당 변수는 상관이 없다.
- **대립가설(H1)**: 상관이 있다.

캡처 예시처럼 p-value가 **0.05보다 크면**

➡️ **귀무가설 채택(= 유의한 상관 없음)**

✅ 결론 예시(캡처 흐름 그대로):

> “거래량과 시가/종가/저가/고가 간에 통계적으로 유의한 상관이 없다(p>0.05).”
> 
> ※ 상관계수가 조금 있어도 p-value가 크면 “유의하다”고 말 못함.

---

### 7) 25년도 2~3월 vs 4~5월 거래량 평균(또는 중심) 차이 검정

### (1) 두 집단 나누기 (2,3월 / 4,5월)

```python
cond1 = df_hana1['월'].isin([2,3])
cond2 = df_hana1['월'].isin([4,5])

df0203 = df_hana1.loc[cond1]
df0405 = df_hana1.loc[cond2]
```

### (2) 각 집단 정규성 검정

```python
print(stats.normaltest(df0203['거래량']))
print(stats.normaltest(df0405['거래량']))
```

캡처에서 두 집단 모두 p-value < 0.05 → **둘 다 정규성 X(비정규)**

### (3) 비정규 → Mann-Whitney 계열(= rank-sum) 사용

캡처에서는:

```python
stats.ranksums(df0203['거래량'], df0405['거래량'])
```

- **귀무가설(H0)**: 두 집단의 중심(분포의 위치/중앙값)이 같다 (차이 없다)
- **대립가설(H1)**: 두 집단의 중심이 다르다 (차이 있다)

해석:

- p-value < 0.05 → **차이 있다**
- p-value ≥ 0.05 → **차이 없다**

> ⚠️ 캡처 주석에서 “귀무/대립가설 문장”이 서로 바뀌어 적히는 경우가 많아.
> 
> 정확히는 보통 **H0=같다 / H1=다르다** 로 적는 게 표준이야.

---

## 14. 머신러닝 시계열 예측 Rolling Prediction (주가 예측) 정리

### 목표

- **Lag(과거 3일)** 을 피처로 만들고
- **3일 뒤 주가(Target)** 를 예측하는 모델을 만들고
- 예측값을 다시 다음 입력으로 넣어서 **연속 예측(rolling, multi-step)** 하기

---

### 1) 데이터 로딩 & 기본 확인

```python
import pandasas pd
df1 = pd.read_csv('hana_stock.csv')
print(df1.shape)
df1.head(2)
```

---

### 2) 필요한 컬럼만 뽑기 + 자주 나는 문법 오류

캡처의 오류:

```python
p1 = df1[['날짜_dt','시가']]
# (오타/따옴표 누락하면 SyntaxError: unterminated string literal)
```

---

### 3) Shift로 Lag 피처 만들기 (D1/D2/D3)

핵심: `shift(-1)`은 “위로 당겨오기”라서 **미래값을 현재행에 붙이는 형태**가 됨

(데이터가 날짜 내림차순/오름차순인지에 따라 의미가 달라질 수 있음)

캡처 흐름:

```python
p1['시가_D3'] = p1['시가']
p1['시가_D2'] = p1['시가'].shift(-1)
p1['시가_D1'] = p1['시가'].shift(-2)

p1['Target']  = p1['시가'].shift(-3)# 3일 뒤 시가를 타깃으로
```

✅ 해석(이 구조의 의미):

- 입력 X: (D1, D2, D3) = “최근 3일의 시가(또는 기준일 포함 3개)”
- 타깃 y: “그 다음 3일 후 시가(Target)”

> 만약 날짜가 오름차순이면 일반적으로는 shift(1), shift(2)...를 쓰는 게 직관적이야.
> 
> 근데 캡처 데이터는 화면상 날짜가 2025-06-12 → 2025-06-11 → … 로 내려가 보이니(내림차순) `shift(-1)`을 쓴 흐름이 나온 것 같아.

---

### 4) SettingWithCopyWarning 해결 팁

캡처처럼 `p1 = df1[['날짜_dt','시가']]` 로 슬라이스 만든 다음 `p1['새컬럼']=...` 하면 경고가 나올 수 있어.

✅ 안전한 방식(추천):

```python
p1 = df1[['날짜_dt','시가']].copy()
```

---

### 5) 결측 제거

shift로 만든 끝부분에 NaN이 생김 → 학습 전에 제거

```python
p2 = p1.dropna()
```

---

### 6) 시계열 분할 (앞 80% train / 뒤 20% test)

랜덤 분할 금지(미래 데이터가 섞이면 데이터 누수)

```python
cut =int(len(p2) *0.8)
train = p2.iloc[:cut]
test  = p2.iloc[cut:]
```

---

### 7) X/y 구성

```python
X_train = train[['시가_D1','시가_D2','시가_D3']]
y_train = train['Target']

X_test  = test[['시가_D1','시가_D2','시가_D3']]
y_test  = test['Target']
```

---

### 8) 모델: RandomForest + BayesSearchCV (하이퍼파라미터 탐색)

```python
from sklearn.ensemble import RandomForestRegressor
from skopt import BayesSearchCV

hyper = {
  'randomforestregressor__max_depth': (3, 5),
  'randomforestregressor__min_samples_split': (20, 50),
  'randomforestregressor__n_estimators': [200]
}

bayes_model = BayesSearchCV(
    RandomForestRegressor(),
    hyper,
    n_iter=8,
    n_jobs=-1,
    scoring='neg_mean_squared_error'
)

bayes_model.fit(X_train, y_train)
best_model = bayes_model.best_estimator_
```

---

### 9) 성능 평가 (R², MSE)

```python
from sklearn.metrics import mean_squared_error, r2_score

y_train_pred = best_model.predict(X_train)
y_test_pred  = best_model.predict(X_test)

print("학습 R2:", r2_score(y_train, y_train_pred))
print("검증 R2:", r2_score(y_test, y_test_pred))
print("학습 MSE:", mean_squared_error(y_train, y_train_pred))
print("검증 MSE:", mean_squared_error(y_test, y_test_pred))
```

캡처에서:

- 학습 R²가 더 높고
    
- 검증 R²가 더 낮음
    
    ➡️ 전형적인 “일부 과적합 가능성” 패턴(트리/앙상블에서 자주 나옴)
    

---

### 10) Rolling Prediction (향후 30일 예측)

핵심 아이디어:

1. 마지막 입력(최근 3개 값)을 준비
2. 예측 1번 → 그 예측값을 다음 입력의 D1로 넣고, 기존 D1→D2, D2→D3처럼 “밀기”
3. 이것을 30번 반복

예시 형태(캡처의 last_x 흐름을 정리하면 이런 구조):

```python
last_value = p2.tail(1)[['시가_D1','시가_D2','시가_D3']].values  # (1,3)

predictions = []
last_x = {'시가_D1': last_value[0][0], '시가_D2': last_value[0][1], '시가_D3': last_value[0][2]}

for _ in range(30):
    X_new = [[last_x['시가_D1'], last_x['시가_D2'], last_x['시가_D3']]]
    pred = best_model.predict(X_new)[0]
    predictions.append(pred)

    # 다음 스텝을 위한 입력 갱신(rolling)
    last_x = {
        '시가_D1': pred,
        '시가_D2': last_x['시가_D1'],
        '시가_D3': last_x['시가_D2'],
    }
```

날짜 인덱스 만들기(영업일 기준):

```python
start_day = train.head(1)['날짜_dt'].values[0]  # 캡처에서는 '2025-06-13' 같은 값
date_range = pd.date_range(start=start_day, periods=30, freq='B')

rf_time = pd.DataFrame({'날짜_dt': date_range, 'Target': predictions})
```

---

## 15. ARIMA 시계열 모형 정리 (개념 중심)

### ARIMA는 뭐의 약자?

- **AR**: AutoRegressive (자기회귀)
- **I**: Integrated (차분, 비정상 → 정상으로 만들기)
- **MA**: Moving Average (이동평균, 오차항 기반)

즉, **과거값(AR) + 차분(I) + 과거오차(MA)** 를 결합한 **복합 시계열 모델**.

---

### AR(p): 과거 “값”으로 현재/미래 예측

- AR(1): 1일 전 값만 반영
- AR(3): 3일 전까지 반영

p가 커질수록 과거 반영이 늘어나지만

➡️ 너무 크면 과거에 끌려가서 **과적합/둔해짐**(설명에서 말한 포인트)

### p 선택 힌트: ACF(자기상관함수)

- ACF는 “현재값과 k시점 전 값의 상관”을 계산
    
- +1에 가까울수록 양의 자기상관 강함
    
- 1에 가까울수록 음의 자기상관 강함
    
    ➡️ 상관이 강하게 남아있는 lag를 p 후보로 봄
    

---

### MA(q): 과거 “오차(잔차)”로 현재/미래 예측

- MA(1): 직전 오차 1개만 반영
- MA(2): 2일 전까지 오차 반영
- 불규칙 변동(노이즈)을 줄이는 관점
- 오차는 보통 **White Noise(평균 0, 분산 일정)** 가정

---

### I(d): 차분(differencing) 횟수

- d=1: 1차 차분 (현재-이전)
- d=2: 차분을 한 번 더(2차 차분)

차분을 쓰는 이유:

- 비정상성(추세/변동성)을 줄여서 **정상성에 가깝게** 만들기

---

### ARIMA(p, d, q) 정리 한 줄

- **p**: 과거 값 몇 개 볼래? (AR 차수)
- **d**: 차분 몇 번 할래? (정상성 만들기)
- **q**: 과거 오차 몇 개 볼래? (MA 차수)