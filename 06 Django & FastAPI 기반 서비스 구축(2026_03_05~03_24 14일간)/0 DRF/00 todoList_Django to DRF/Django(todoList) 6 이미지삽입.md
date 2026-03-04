- 이미지 업로드를 위한 라이브러리
- Django 미디어 설정 추가
- 모델에 이미지 필드 추가 (todo/models.py)
- 개발환경에서 media 서빙 설정 추가 (mysite/urls.py)
- create.html 전송 방식 변경: JSON → FormData (multipart)
- 변경 포인트:
	- `<input type="file" id="image">` 추가
	- axios 인스턴스에서 Content-Type 명시 제거 (브라우저가 multipart boundary 자동 생성)
	- `api.post(..., {json})` → `api.post(..., formData)`로 변경
		- 이미지 전송은 `FormData` 방식으로 해야 하며 binary file (바이너리 데이터)방식이라 json으로 표현할 수 없습니다. 그래서 웹에서는 파일 업로드 표준으로 multipart/form-data를 사용합니다. 
- list.html 렌더링에 이미지 표시 로직 추가: img 태그 출력이 추가됩니다
```js
${todo.image ? `<img src="${todo.image}" style="max-width:200px;">` : ""}
```
	
- detail.html / update.html에도 이미지 표시 + 변경 기능 추가
	- detail.html: 기존 텍스트 정보 + `{% if todo.image %}<img ...>` 추가
	- update.html: 현재 이미지 미리보기 + 새 이미지 업로드 input 추가
	- update 요청도 JSON이 아니라 FormData로 보내는 방향으로 변경
- 모델 동작 보완 추가: `complete`에 따라 `completed_at`을 자동 처리하는 `save()` 로직이 추가되었습니다

|파일|5번|6번에서 변경/추가|
|---|---|---|
|mysite/settings.py|페이지네이션 설정 중심|`MEDIA_URL`, `MEDIA_ROOT` 추가|
|mysite/urls.py|일반 url|DEBUG에서 media 서빙 추가|
|todo/models.py|기존 필드|`image` 필드 + save() 보완 추가|
|create.html|JSON 전송|file input + FormData 업로드로 변경|
|list.html|텍스트 목록 렌더링|이미지 있으면 `<img>` 출력 추가|
|detail.html/update.html|텍스트 중심|이미지 표시/업로드 UI 추가|

---
```bash
source .venv/bin/activate

uv pip install Pillow
```

`mysite/settings.py`
```python
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / "media"
```

`todo/models.py `(이미지 필드 추가)
```python
# 이미지 필드 추가
image = models.ImageField(upload_to='todo_images/', blank=True, null=True)
```
---
이 코드는 Django Model의 `save()` 메서드를 오버라이딩한 코드입니다
즉, Todo 모델의 저장 동작을 커스터마이징하기 위한 코드입니다.

목적은 `complete` 값에 따라 완료 시간(`completed_at`)을 자동으로 관리하기 위해서입니다.
사용자가 직접 `completed_at`을 입력하지 않아도 
```
완료 체크 → 완료시간 자동 기록  
완료 해제 → 완료시간 자동 삭제
```
되도록 만든 것입니다.

`todo/models.py ` 추가
``` python
from django.utils import timezone

# 모델의 save() 메서드를 오버라이딩
# → Todo가 저장될 때 complete 상태에 따라 completed_at을 자동으로 관리
def save(self, *args, **kwargs):

    # 완료 상태(True)인데 완료 시간이 없는 경우
    # → 현재 시간을 완료 시간으로 자동 저장
    if self.complete and self.completed_at is None:
        self.completed_at = timezone.now()

    # 완료 상태(False)인데 완료 시간이 이미 있는 경우
    # → 완료 취소로 판단하고 완료 시간을 제거
    if not self.complete and self.completed_at is not None:
        self.completed_at = None

    # 부모 모델(Model)의 원래 save() 실행 (DB에 실제 저장)
    super().save(*args, **kwargs)
```

---
complete=True 로 저장될 때
```python
if self.complete and self.completed_at is None:  
	self.completed_at = timezone.now()
```
✔ 완료 체크되면 완료 시간 자동 기록

complete=False 로 되돌릴 때
```python
if not self.complete and self.completed_at is not None:
    self.completed_at = None
```
✔ 완료 취소하면 완료 시간 제거

이미지 테이블 생성
```bash
python manage.py makemigrations
python manage.py migrate
```

이미지가 json으로 잘 파싱 되는지 Insomnia로 테스트 합니다.
![[Pasted image 20260221181435.png]]
```
name         test todo  
description  아무 설명  
image        cat.png
```

`mysite/urls.py` 
```python
from django.conf import settings
from django.conf.urls.static import static

# ✅ [추가] DEBUG일 때만 media 파일을 /media/로 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

`create.html` (이미지 업로드 기능 추가 버전)
```html
{% extends "base.html" %}
{% load static %}
{% block content %}
<div class="container">
  <h2>Create a New Todo</h2>

    <!-- [추가됨] 이미지 업로드 필드 -->
    <div>
      <label for="image">Image:</label>
      <input type="file" id="image">
    </div>

</div>

<script>

// Axios 인스턴스 생성
// baseURL을 "/"로 설정하여 같은 Django 서버로 API 요청을 보냄
const api = axios.create({
  baseURL: "/",

  // multipart/form-data는 브라우저가 자동으로 Content-Type을 생성해야 하므로
  // 직접 Content-Type을 지정하지 않는다.
});

// Axios 요청 인터셉터
// 모든 요청이 서버로 가기 전에 실행되는 코드
api.interceptors.request.use(config => {

  // Django CSRF 보호를 위해 csrftoken 쿠키를 읽어온다
  const csrftoken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrftoken="))
    ?.split("=")[1];

  // csrftoken이 존재하면 요청 헤더에 자동으로 추가
  if (csrftoken) {
    config.headers["X-CSRFToken"] = csrftoken;
  }

  // 수정된 config를 다시 axios 요청으로 전달
  return config;
});


// Todo 생성 버튼 클릭 이벤트
document.getElementById("todoCreate").addEventListener("click", async () => {
  try {

    // FormData 객체 생성
    // 파일 업로드를 포함한 데이터를 서버로 전송할 때 사용
    const formData = new FormData();

    // 입력된 Todo 데이터를 FormData에 추가
    formData.append("name", document.getElementById("name").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("complete", document.getElementById("complete").checked);
    formData.append("exp", document.getElementById("exp").value || 0);

    // 이미지 파일 input 요소 가져오기
    const fileInput = document.getElementById("image");

    // 파일이 선택되어 있으면 FormData에 이미지 추가
    if (fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

    // Todo 생성 API 호출
    // JSON 대신 FormData 형태로 서버에 전송
    const res = await api.post("todo/viewsets/view/", formData);

    // 서버 응답 확인 (디버깅용)
    console.log(res.data);

    // Todo 생성 완료 후 리스트 페이지로 이동
    window.location.href = "/todo/list/";

  } catch (err) {

    // 에러 발생 시 콘솔에 출력
    console.error(err.response?.data || err.message);
  }
});

</script>
{% endblock %}
```

`templates/list.html` : 렌더링 로직 그대로 유지하면서 img 태그만 추가.
```js
div.innerHTML = `
    <p><strong>이름:</strong> ${todo.name}</p>
    <p><strong>설명:</strong> ${todo.description}</p>
    <p><strong>완료 여부:</strong> ${todo.complete}</p>
    <p><strong>exp:</strong> ${todo.exp}</p>

    <!-- [추가됨] 이미지 표시 -->
    ${todo.image ? `<img src="${todo.image}" style="max-width:200px;">` : ""}

    <hr>
`;
```

상세보기에도 이미지 데이터가 들어와서 수정할수 있도록 detail.html을 수정합니다.
`templates/detail.html`
```html
<div class="todoDetail">
  <p><strong>이름:</strong> {{ todo.name }}</p>
  <p><strong>설명:</strong> {{ todo.description }}</p>
  <p><strong>완료 여부:</strong> {{ todo.complete }}</p>
  <p><strong>작성일:</strong> {{ todo.created_at }}</p>

  <!-- [추가됨] 이미지 출력 -->
  {% if todo.image %}
    <p><strong>이미지:</strong></p>
    <img src="{{ todo.image.url }}" alt="todo image" style="max-width:300px; height:auto;">
  {% else %}
    <p><strong>이미지:</strong> -</p>
  {% endif %}
</div>
```

`templates/update.html` : 폼태그 대신 axios 인스턴스로 다시 수정
```html
{% extends "base.html" %}
{% load static %}
{% block content %}

<div class="container">
  <h2>Todo 수정</h2>

  <!-- [추가] 현재 이미지 미리보기 -->
  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <!-- [추가] 새 이미지 업로드 -->
  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

</div>

<script>

// Axios 인스턴스 생성
// baseURL을 "/"로 설정하여 같은 Django 서버로 API 요청을 보냄
const api = axios.create({
  baseURL: "/",
});

// Todo 수정 버튼 클릭 이벤트
// id="todoUpdate" 버튼을 클릭하면 실행됨
document.getElementById("todoUpdate").addEventListener("click", async () => {
  try {

    // FormData 객체 생성
    // 파일 업로드나 multipart/form-data 요청을 보낼 때 사용
    const formData = new FormData();

    // 이미지 input 요소 가져오기
    const fileInput = document.getElementById("image");

    // 새 이미지를 선택했을 경우에만 image 필드를 추가
    // (이미지를 변경하지 않으면 서버로 보내지 않음)
    if (fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

  } catch (err) {

    // 서버 오류 또는 네트워크 오류 발생 시 콘솔에 출력
    console.error(err.response?.data || err.message);

    // 사용자에게 수정 실패 알림
    alert("수정 실패");
  }
});

</script>
{% endblock %}
```





