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

`todo/models.py ` 추가
``` python
from django.utils import timezone

# 기본 동작 보완: complete 값에 따라 completed_at을 자동으로 처리
def save(self, *args, **kwargs):
	if self.complete and self.completed_at is None:
		self.completed_at = timezone.now()
	if not self.complete and self.completed_at is not None:
		self.completed_at = None
	super().save(*args, **kwargs)
```

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

    <!-- ✅ [추가됨] 이미지 업로드 필드 -->
    <div>
      <label for="image">Image:</label>
      <input type="file" id="image">
    </div>

</div>

<script>
const api = axios.create({
  baseURL: "/",
  // ✅ [중요 변경] Content-Type 제거
  // multipart/form-data는 브라우저가 자동 생성해야 함
});

// CSRF 자동 주입 (그대로 유지)
api.interceptors.request.use(config => {
...

document.getElementById("todoCreate").addEventListener("click", async () => {
  try {

    // ✅ [추가됨] FormData 생성
    const formData = new FormData();

    formData.append("name", document.getElementById("name").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("complete", document.getElementById("complete").checked);
    formData.append("exp", document.getElementById("exp").value || 0);

    // ✅ [추가됨] 이미지 파일 추가
    const fileInput = document.getElementById("image");
    if (fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

    // ✅ [변경됨] JSON → FormData 전송
    const res = await api.post("todo/viewsets/view/", formData);

    console.log(res.data);

    window.location.href = "/todo/list/";

  } catch (err) {
    console.error(err.response?.data || err.message);
  }
});
</script>
{% endblock %}
```

`templates/list.html` : 렌더링 로직 그대로 유지하면서 img 태그만 추가.
```html
div.innerHTML = `
    <p><strong>이름:</strong> ${todo.name}</p>
    <p><strong>설명:</strong> ${todo.description}</p>
    <p><strong>완료 여부:</strong> ${todo.complete}</p>
    <p><strong>exp:</strong> ${todo.exp}</p>

    <!-- ✅ [추가됨] 이미지 표시 -->
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

  <!-- ✅ [추가됨] 이미지 출력 -->
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

  <!-- ✅ [추가] 현재 이미지 미리보기 -->
  <div>
    <label>Current Image:</label><br>
    {% if todo.image %}
      <img src="{{ todo.image.url }}" alt="todo image" style="max-width:250px; height:auto;">
    {% else %}
      <p>-</p>
    {% endif %}
  </div>

  <!-- ✅ [추가] 새 이미지 업로드 -->
  <div>
    <label for="image">New Image:</label>
    <input type="file" id="image">
  </div>

</div>

<script>
const api = axios.create({
  baseURL: "/",
});

document.getElementById("todoUpdate").addEventListener("click", async () => {
  try {
    const formData = new FormData();

    // ✅ 새 이미지 선택했을 때만 image 포함
    const fileInput = document.getElementById("image");
    if (fileInput.files.length > 0) {
      formData.append("image", fileInput.files[0]);
    }

  } catch (err) {
    console.error(err.response?.data || err.message);
    alert("수정 실패");
  }
});
</script>
{% endblock %}
```





