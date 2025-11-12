let currentRound = 1;
let gridSize = 2;
let targetSequence = [];
let userSequence = [];
let roundTimer;
let timeLimit = 60;

const gridContainer = document.getElementById('grid-container');
const roundNumberElement = document.getElementById('round-number');
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-btn');

// 숫자 그리드 생성
function generateGrid() {
  gridContainer.innerHTML = '';  // 기존 그리드 비우기
  let numbers = [];
  for (let i = 1; i <= gridSize * gridSize; i++) {
    numbers.push(i);  // 1부터 gridSize*gridSize까지의 숫자 생성
  }

  // 숫자 섞기 (랜덤) - 게임판 배치만 랜덤
  numbers = numbers.sort(() => Math.random() - 0.5);

  // 격자 크기에 따라 셀 크기 조정
  adjustCellSize();

  // 그리드 생성
  numbers.forEach(num => {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.textContent = num;
    cell.dataset.number = num;  // 데이터 속성으로 숫자 저장
    cell.onclick = () => handleCellClick(num);  // 클릭 시 숫자 처리
    gridContainer.appendChild(cell);
  });
}

// 격자 크기에 따라 셀 패딩과 폰트 크기 조정
function adjustCellSize() {
  let padding = 20;
  let fontSize = 24;
  
  // 라운드(격자 크기)에 따라 조정
  if (gridSize === 2) {
    padding = 20;
    fontSize = 24;
  } else if (gridSize === 3) {
    padding = 15;
    fontSize = 20;
  } else if (gridSize === 4) {
    padding = 10;
    fontSize = 18;
  } else if (gridSize === 5) {
    padding = 8;
    fontSize = 16;
  } else if (gridSize === 6) {
    padding = 4;
    fontSize = 12;
  }
  
  // CSS 변수 또는 인라인 스타일로 설정
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.style.padding = padding + 'px';
    cell.style.fontSize = fontSize + 'px';
  });
}

// 사용자가 숫자 클릭 시 처리
function handleCellClick(num) {
  console.log("클릭된 숫자:", num);
  // 사용자가 클릭한 숫자가 현재 맞춰야 할 숫자와 일치하는지 확인
  if (num === targetSequence[userSequence.length]) {
    userSequence.push(num);  // 맞으면 userSequence에 추가
    
    // 클릭한 셀의 색깔 변경
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      if (parseInt(cell.textContent) === num) {
        cell.classList.add('clicked');
      }
    });
    
    console.log("현재 userSequence:", userSequence);  // userSequence 배열을 확인하기 위한 로그
    if (userSequence.length === targetSequence.length) {
      // 모든 숫자를 맞췄으면
      console.log("userSequence가 targetSequence와 일치!");
      nextRound();  // 다음 라운드로
    }
  } else {
    // 잘못된 숫자를 클릭했으면
    console.log("잘못된 클릭");
    alert('틀렸습니다! 다시 시도해 주세요.');
    // 진행도를 초기화하지 않고, 그냥 계속 진행
  }
}

// 다음 라운드로 넘어가는 함수
function nextRound() {
  clearInterval(roundTimer);  // 기존 타이머 정지
  currentRound++;
  if (currentRound > 5) {
    alert('게임 종료! 축하합니다!');
    resetGame();
  } else {
    roundNumberElement.textContent = currentRound;
    gridSize = currentRound + 1;  // 2, 3, 4, 5, 6
    // CSS 그리드 칼럼 수 동적 설정 (정사각형 격자)
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    userSequence = [];
    targetSequence = generateSequence(gridSize);  // 새 라운드에 맞는 숫자 시퀀스 생성
    generateGrid();  // 새 그리드 생성
    startTimer();  // 새 타이머 시작
  }
}

// 정답 숫자 시퀀스 생성 (항상 1, 2, 3, 4... 순서)
function generateSequence(size) {
  const sequence = [];
  for (let i = 1; i <= size * size; i++) {
    sequence.push(i);
  }
  return sequence;  // 정답은 항상 1, 2, 3, 4... 순서
}

// 게임 시작 함수
function startGame() {
  currentRound = 1;
  roundNumberElement.textContent = currentRound;
  gridSize = 2;
  // CSS 그리드 칼럼 수 동적 설정 (정사각형 격자)
  gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  userSequence = [];
  targetSequence = generateSequence(gridSize);  // 2x2 그리드에 맞는 숫자 시퀀스
  generateGrid();  // 그리드 생성
  startTimer();  // 타이머 시작
}

// 타이머 시작 함수
function startTimer() {
  let timeLeft = timeLimit;
  timerElement.textContent = timeLeft;
  roundTimer = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(roundTimer);
      alert('시간 초과! 게임을 다시 시작합니다.');
      resetGame();
    }
  }, 1000);
}

// 게임 리셋 함수
function resetGame() {
  clearInterval(roundTimer);  // 타이머 멈추기
  timerElement.textContent = '0';
  startButton.disabled = false;  // 버튼 활성화
  userSequence = [];  // 클릭한 숫자 배열 초기화
}

// 게임 시작 버튼
startButton.disabled = false;
