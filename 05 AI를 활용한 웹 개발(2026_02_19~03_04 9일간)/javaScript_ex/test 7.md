```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>  
    <div><a href="index.html">홈으로</a></div>

    <h2>Axios로 데이터 불러오기</h2>
    <button id="loadBtn">데이터 가져오기</button>
    <pre id="result"></pre>

<script>
document.addEventListener('DOMContentLoaded', function () {

    const button = document.getElementById("loadBtn");
    const resultBox = document.getElementById("result");

    button.addEventListener("click", function () {

        resultBox.textContent = "불러오는 중...";

        axios.get('https://jsonplaceholder.typicode.com/posts/1')
            .then(function (response) {
                resultBox.textContent = JSON.stringify(response.data, null, 2);
            })
            .catch(function (error) {
                resultBox.textContent = "오류 발생: " + error;
            });

        console.log("Axios: 데이터 요청 보냄 (비동기)");

    });

});
</script>

</body>
</html>
```