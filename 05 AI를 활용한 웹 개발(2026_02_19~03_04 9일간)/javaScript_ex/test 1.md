```html
<!DOCTYPE html>
<html>
<body>

<input type="text" id="userInput" placeholder="여기에 입력해보세요">
<p id="displayText"></p>
<br>
<div><a href="index.html">홈으로</a></div>

<script>
document.addEventListener('DOMContentLoaded', function () {

  const input = document.getElementById("userInput");
  const display = document.getElementById("displayText");

  input.addEventListener("input", function () {
    display.textContent = this.value;
  });

});
</script>

</body>
</html>
```