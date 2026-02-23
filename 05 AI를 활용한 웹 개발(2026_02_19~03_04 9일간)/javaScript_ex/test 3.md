```html
<!DOCTYPE html>
<html>
<body>

<form id="loginForm">
  <input type="text" id="username" placeholder="이름 입력">
  <button type="submit">제출</button>
</form>

<br>
<div><a href="index.html">홈으로</a></div>

<script>
document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById("loginForm");
  const username = document.getElementById("username");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = username.value;
    alert("입력한 이름: " + name);
  });

});
</script>

</body>
</html>
```