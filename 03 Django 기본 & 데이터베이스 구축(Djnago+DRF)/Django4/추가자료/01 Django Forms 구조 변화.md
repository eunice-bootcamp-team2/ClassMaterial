◽  이전 방식 (기본 웹 흐름)
- `urls.py` → `views.py` → `templates`
- 폼 없이 뷰에서 직접 데이터 처리하고, 템플릿에서 결과만 출력
![[Pasted image 20250525201722.png]]

◽ 새로운 방식 (폼 클래스 활용)
- `urls.py` → `views.py` → **`forms.py`** ↔ `templates`
- `forms.py` 파일에서 입력 폼 구조 및 유효성 검사 정의
- 뷰는 폼을 처리하고, 템플릿은 폼을 보여줌
![[Pasted image 20250525201743.png]]

🧐 forms.py를 따로 만들어 재사용성과 유지보수를 높임

◽ Django Forms 기본 개념

◽ 핵심 특징
- `is_valid()` 메서드로 모든 필드의 유효성 검사 수행
- 폼에 문제가 없으면 `True` 반환
- 유효성 검사를 통과한 데이터는 `cleaned_data`에 저장됨

</> 예시 코드:
```python
from django import forms

class NameForm(forms.Form):
    your_name = forms.CharField(label='Your name', max_length=100)
```

</> 이 코드로 아래와 같은 HTML이 자동 생성됨:
```python
<label for="your_name">Your name: </label>
<input id="your_name" type="text" name="your_name" maxlength="100" required>
```

즉, `forms.Form`을 사용하면 파이썬 코드로 HTML 폼을 만들 수 있음

---
🔹Django Forms 렌더링 방법

◽ 템플릿에서 폼을 어떻게 출력할까?
- `{{ form.as_div }}` → `<div>` 태그로 감싼 형태
- `{{ form.as_table }}` → `<table><tr><td>...</td></tr></table>` 형태
- `{{ form.as_p }}` → `<p>` 태그로 감싼 형태 (가장 자주 사용됨)
- `{{ form.as_ul }}` → `<ul><li>...</li></ul>` 형태

전체 폼 출력 예시
```python
<form action="{% url 'polls:survey' %}" method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <input type="submit" value="Submit">
</form>
```

- `csrf_token`은 보안 필수 태그  
- `{{ form.as_p }}`로 간단히 폼 전체 출력 가능