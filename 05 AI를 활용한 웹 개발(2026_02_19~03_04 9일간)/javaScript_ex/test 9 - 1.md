```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>jQuery 목록 추가</title>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>  
  <div><a href="index.html">홈으로</a></div>

  <h2>목록 추가</h2>
  <button id="addBtn">+ 아이템 추가</button>
  <ul id="itemList"></ul>

  <script>
    $(function () {

      $('#addBtn').on('click', function () {
        const newItem = $('<li>새로운 항목</li>');
        $('#itemList').append(newItem);
      });

    });
  </script>
</body>
</html>
```