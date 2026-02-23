```html
<!DOCTYPE html>
<html>
<body>

<select id="colorSelect">
  <option value="">색상 선택</option>
  <option value="red">빨강</option>
  <option value="blue">파랑</option>
</select>

<div id="colorBox" style="width:100px;height:100px;background-color:gray;"></div>

<br>
<div><a href="index.html">홈으로</a></div>

<script>
document.addEventListener('DOMContentLoaded', function () {

  const select = document.getElementById("colorSelect");
  const box = document.getElementById("colorBox");

  function changeColor(color) {
    box.style.backgroundColor = color || "gray";
  }

  select.addEventListener("change", function () {
    changeColor(this.value);
  });

});
</script>

</body>
</html>
```