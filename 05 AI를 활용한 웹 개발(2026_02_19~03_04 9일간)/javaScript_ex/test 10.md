```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
    .card {
      padding: 10px;
      margin: 5px 0;
      background-color: #f0f0f0;
      border-radius: 5px;
    }
    </style>
</head>
<body> 
    <div><a href="index.html">홈으로</a></div>

    <h2>카드 만들기</h2>
    <input type="text" id="textInput" placeholder="내용을 입력하세요">
    <button id="createBtn">카드 추가</button>

    <div id="cardContainer"></div>

<script>
document.addEventListener('DOMContentLoaded', function () {

    const input = document.getElementById("textInput");
    const btn = document.getElementById("createBtn");
    const container = document.getElementById("cardContainer");

    btn.addEventListener("click", function () {

        const value = input.value.trim();
        if (value === "") return;

        const div = document.createElement("div");
        div.className = "card";
        div.textContent = value;

        container.appendChild(div);

        input.value = "";

    });

});
</script>

</body>
</html>
```