
🔹 Django 프로젝트에서 HTML 폼에 CSS 스타일을 입히는 방법

◽ 기본 개념 : `{% load static %}` 사용
- Django 템플릿에서 정적 파일(css, js, 이미지 등)을 사용하려면 꼭 이 코드를 넣어야 해요.
- 위치: `{% extends 'base.html' %}` 다음 줄에 써요.
```python
{% load static %}
```

◽ 정적 파일(static) 위치 만들기
- 앱 폴더 안에 `static` 폴더를 만들고, 그 안에 다시 앱 이름 폴더를 만들어야 해요.
- 예시 구조:
```python
polls/
├── static/
│   └── polls/
│       └── custom.css   ← 여기에 스타일 파일!
```

◽ CSS 파일 연결하기
```python
<link rel="stylesheet" href="{% static 'polls/polls_custom.css' %}" />
```
- `polls_custom.css` 파일을 HTML에 연결해요.
- 이때 경로는 `static` 폴더 기준이 아니라 `static/앱이름/파일명`으로 씁니다.

◽ 폼 작성 예시
```python
<form action="{% url 'polls:survey' %}" method="post">
```
- 사용자가 입력한 값을 서버로 보내는 HTML 폼.
- `action`은 데이터를 보낼 URL이고, `method="post"`는 데이터를 POST 방식으로 보낸다는 뜻이에요.

 </> 전체 코드:
```python
{% extends 'base.html' %}
{% load static %}

{% block content %}
<link rel="stylesheet" href="{% static 'polls/polls_custom.css' %}" />
<form action="{% url 'polls:survey' %}" method="post">
  ...
</form>
{% endblock %}
```

🔹 `widget` 속성
	Django 폼 필드에 Bootstrap과 같은 CSS 스타일을 적용하는 방법 중 `widget` 속성을 사용하는 방법 

◽ 코드 구조 설명
```python
class SurveyForm(forms.Form):  # 설문조사 폼 정의
```

◽ `user_name` 입력 필드
```python
user_name = forms.CharField(
    label='Your name',
    max_length=100,
    widget=forms.TextInput(attrs={'class': 'form-control'})
)
```
`forms.CharField`	
	이름을 입력받는 문자열 필드
`label`	
	폼에 보이는 라벨 문구 ("Your name")
`max_length`	
	최대 100글자 제한
`widget=forms.TextInput(...)`	
	텍스트 입력 필드를 생성하며, HTML 속성을 지정
`attrs={'class': 'form-control'}`	
	Bootstrap 스타일을 적용 (폼이 예쁘게 보임)

---
◽ `user_age` 입력 필드
```python
user_age = forms.IntegerField(
    label='Your age',
    widget=forms.NumberInput(attrs={'class': 'form-control'})
)
```
`forms.IntegerField`	
	숫자(정수)만 입력받는 필드
`label='Your age'`	
	표시될 라벨 문구
`widget=forms.NumberInput(...)`	
	숫자 전용 입력창 (HTML input type="number")
`attrs={'class': 'form-control'}`	
	마찬가지로 Bootstrap 스타일 적용

---
◽ 위젯(widget)이란?
- Django의 폼 필드 모양을 제어하는 도구예요.
- HTML `<input>`, `<textarea>`, `<select>` 등을 생성할 때 사용됩니다.
- `attrs`를 통해 HTML 속성을 넣을 수 있어서 스타일 추가, placeholder 지정 등이 가능해요.

◽ 정리된 폴더 구조
```python
myproject/
├── polls/
│   ├── forms.py      ← 폼 클래스(SurveyForm) 정의
│   ├── templates/
│   │   └── polls/
│   │       └── survey_form.html
│   └── static/
│       └── polls/
│           └── custom.css
```

[!위젯공식문서](https://docs.djangoproject.com/en/4.1/ref/forms/widgets/#built-in-widgets)