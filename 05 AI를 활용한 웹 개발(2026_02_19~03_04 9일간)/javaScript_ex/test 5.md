```html
<!DOCTYPE html>
<html>
<body>

<h2>숫자: <span id="count">0</span></h2>
<button id="increaseBtn">증가</button>

<br>
<div><a href="index.html">홈으로</a></div>

<script>
document.addEventListener('DOMContentLoaded', function () {

  let count = 0;

  const btn = document.getElementById("increaseBtn");
  const display = document.getElementById("count");

  btn.addEventListener("click", function () {
    count += 1;
    display.textContent = count;
  });

});
</script>

</body>
</html>
```