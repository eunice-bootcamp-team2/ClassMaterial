🔹 Django 튜토리얼 Part6 – 정적파일 (static files)
###### 📖 공식 문서 링크:  
🔗 [https://docs.djangoproject.com/ko/stable/intro/tutorial06/](https://docs.djangoproject.com/ko/stable/intro/tutorial06/)

목표
- 정적 파일의 개념 이해
    - CSS, JavaScript, 이미지와 같은 파일을 Django에서는 "정적 파일(static files)"이라 부름.
        
- 앱 디렉토리에 정적 파일 저장
    - `polls/static/polls/` 경로에 스타일시트(`style.css`) 및 이미지(`background.png`) 저장.
        
- 템플릿에서 정적 파일 사용
    - `{% load static %}` 태그로 템플릿 상단에 로딩.
    - `{% static '경로/파일명' %}`으로 정적 파일의 경로를 지정.
        
- CSS를 이용한 텍스트 스타일링과 배경 이미지 설정
    - 링크 색상 변경 (`li a { color: green; }`)
    - 배경 이미지 추가 (`body { background: url(...) }`)
        
- 정적 파일 네임스페이싱의 필요성 이해
    - 앱 이름과 같은 하위 디렉토리를 만들어 충돌을 방지.

📂 디렉토리 구조 변경:
```
manage.py
static/
│   └── polls/
│       ├── css/
│       │   ├── detail.css
│       │   ├── results.css
│       │   └── styles.css
│       ├── images/
│       │   └── background.jpg #이미지 넣기
│       └── js/
templates/
│   └── polls/
│       ├── base.html
│       ├── detail.html
│       ├── footer.html
│       ├── head.html
│       ├── header.html
│       ├── index.html
│       └── results.html

```

✅ `settings.py`
```python
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

TEMPLATES = [
	"DIRS": [BASE_DIR / "templates"],
]
```

✅ `base.html`에서 head.html로 분리
```html
{% load static %}
<!DOCTYPE html>
<html lang="ko">
{% include "polls/head.html" %} ==<!--head분리-->==
  <body>
    {% include "polls/header.html" %} 
    <main>
    {% block content %}
    {% endblock %}
    </main>
    {% include "polls/footer.html" %}
  </body>
</html>
```

✅ detail 및 다른 컨텐츠에 아래 코드 삭제
```html
<link rel="stylesheet" href="{% static 'polls/css/index.css' %}" />
```
	head.html에 넣었으므로 모두 적용됩니다.

`CSS 경로수정`
```html
  {% load static %}
  <head>
    <meta charset="UTF-8" />
    <title>{% block title %}Polls{% endblock %}</title>
    <link rel="stylesheet" href="{% static 'polls/css/index.css' %}" />
    <link rel="stylesheet" href="{% static 'polls/css/detail.css' %}" />
  </head>
```

---
✅ (`index.css` 또는 공통 레이아웃에 연결된 CSS 파일)
```css
body {
    background: url("../images/background.png") no-repeat top left;
    background-size: cover;
}
```
	경로는 상대경로입니다. {% static %}를 사용하지 않습니다.

✅ `WSL 터미널에서 아래 명령어 입력:` 이미지를 넣기 위해 본인경로찾기
```bash
explorer.exe .
```
---
무료 이미지 site
[Freepik](https://www.freepik.com/)

---
✅ `index.html에 별이미지 삽입하기`
```html
<div class="header">
  <img src="{% static 'polls/images/icon.png' %}" alt="아이콘" class="icon" />
  <h2>설문 목록</h2>
  <a href="{% url 'polls:question_create' %}" class="btn new-question-btn">새 질문</a>
</div>
```

✅ `static/polls/css/style.css
```css
/*icon*/
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px 0;
  gap: 10px;
  margin-bottom: 1em;
}
 
.header .icon {
  width: 50px;
  height: 50px;
}
```

![[Pasted image 20250601174811.png]]