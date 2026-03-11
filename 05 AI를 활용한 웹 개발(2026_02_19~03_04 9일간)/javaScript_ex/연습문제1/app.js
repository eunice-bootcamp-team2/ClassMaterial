// 랜덤 데이터
const adjectives = ["행복한", "용감한", "졸린", "미친", "반짝이는", "귀여운"];
const animals = ["고양이", "호랑이", "햄스터", "펭귄", "여우", "수달"];
const emojis = ["😎", "🔥", "🚀", "🐱", "🌈", "👑"];

const input = document.getElementById("nameInput");
const button = document.getElementById("genBtn");
const card = document.getElementById("resultCard");

// 랜덤 선택 함수
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 색상 랜덤 함수
function randomColor() {
  const colors = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7", "#a29bfe"];
  return pick(colors);
}

// 닉네임 생성 로직
function generateNickname() {
  //글자를 가져와서 공백을 제거후 변수에 저장
  const name = input.value.trim();

  if (!name) {
    card.innerText = "이름을 먼저 입력하세요";
    return;
  }

  // 문자열(String) 만드는 문법 ex) 행복한 고양이 이모지폰트
  const nickname = `${pick(adjectives)} ${pick(animals)} ${pick(emojis)}`;

  card.innerText = `${name}님의 별명: ${nickname}`;
  card.style.backgroundColor = randomColor();
}

// 클릭 이벤트
//button.addEventListener("click", generateNickname);

button.addEventListener("click", () => {
  // console.log("클릭 이벤트 발생");
  generateNickname();
});


// 엔터키 이벤트
input.addEventListener("keydown", (e) => {
  console.log(e.key);  
  if (e.key === "Enter") {
    generateNickname();
  }
});