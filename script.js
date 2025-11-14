let currentRound = 1;
let gridSize = 2;
let targetSequence = [];
let userSequence = [];
let roundTimer;

// 라운드별 제한시간 (1~5라운드)
const roundTimeLimits = [0, 5, 7, 15, 25, 30]; // 0번 인덱스는 사용 안함
let timeLimit = 5;

// ============ localStorage 기회 관리 로직 ============
const PLAY_COUNT_KEY = 'playCount';
const INITIAL_PLAYS = 3;

// localStorage에서 현재 기회 수 읽기 (없으면 초기값 3)
function getPlayCount() {
  const count = localStorage.getItem(PLAY_COUNT_KEY);
  return count !== null ? parseInt(count, 10) : INITIAL_PLAYS;
}

// localStorage에 기회 수 저장
function setPlayCount(count) {
  localStorage.setItem(PLAY_COUNT_KEY, Math.max(0, count)); // 음수 방지
}

// localStorage에서 기회 수 1 감소
function decrementPlayCount() {
  const current = getPlayCount();
  setPlayCount(current - 1);
}

// localStorage에서 기회 수 1 증가 (공유 보상)
function addPlayCount() {
  const current = getPlayCount();
  setPlayCount(current + 1);
  showMessage('공유 성공! 기회 +1 획득했습니다 🎉', 2000);
}

// UI에서 남은 기회 표시 업데이트
function updatePlayCountDisplay() {
  const count = getPlayCount();
  const display = document.getElementById('play-count-display');
  if (display) {
    display.textContent = count;
  }
}

const gridContainer = document.getElementById('grid-container');
const roundNumberElement = document.getElementById('round-number');
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-btn');
const messageBox = document.getElementById('message-box');
const rulesModal = document.getElementById('rules-modal');

// 룰 팝업 닫기 함수
function closeRulesModal() {
  rulesModal.classList.add('hidden');
}

// 팝업의 X 버튼 클릭 시
document.querySelector('.close').addEventListener('click', closeRulesModal);

// 팝업 외부 클릭 시 닫기
window.addEventListener('click', function(event) {
  if (event.target === rulesModal) {
    closeRulesModal();
  }
});

// 페이지 로드 시 팝업 표시
window.addEventListener('load', function() {
  rulesModal.classList.remove('hidden');
});

// 메시지 표시 함수
function showMessage(message, duration = 2000) {
  messageBox.textContent = message;
  messageBox.classList.add('show');
  
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, duration);
}

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
    showMessage('틀렸습니다! 다시 시도해 주세요.');
    // 진행도를 초기화하지 않고, 그냥 계속 진행
  }
}

// 다음 라운드로 넘어가는 함수
function nextRound() {
  clearInterval(roundTimer);  // 기존 타이머 정지
  currentRound++;
  if (currentRound > 5) {
    showMessage('게임 종료! 축하합니다!', 3000);
    setTimeout(resetGame, 3000);
  } else {
    roundNumberElement.textContent = currentRound;
    gridSize = currentRound + 1;  // 2, 3, 4, 5, 6
    // 라운드별 제한시간 적용
    timeLimit = roundTimeLimits[currentRound];
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
  const playCount = getPlayCount();
  
  // 기회가 없으면 게임 시작 차단
  if (playCount <= 0) {
    showMessage('기회가 없습니다! 친구에게 공유해서 기회를 받아보세요 📱', 3000);
    return;
  }
  
  // 기회 1 소비
  decrementPlayCount();
  updatePlayCountDisplay();
  
  currentRound = 1;
  roundNumberElement.textContent = currentRound;
  gridSize = 2;
  timeLimit = roundTimeLimits[currentRound];
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
      showMessage('시간 초과! 게임을 다시 시작합니다.', 3000);
      setTimeout(resetGame, 3000);
    }
  }, 1000);
}


// 게임 리셋 함수
function resetGame() {
  clearInterval(roundTimer);  // 타이머 멈추기
  timerElement.textContent = '0';
  startButton.disabled = false;  // 버튼 활성화
  userSequence = [];  // 클릭한 숫자 배열 초기화
  updatePlayCountDisplay();  // 기회 수 업데이트
}

// 게임 시작 버튼
startButton.disabled = false;

// ============ 페이지 로드 시 초기화 ============
window.addEventListener('load', function() {
  updatePlayCountDisplay();  // 페이지 로드 시 기회 수 표시
  
  // Kakao SDK 초기화 (당신이 설정할 JavaScript 키를 여기 입력)
  Kakao.init('a082589492b825fcacc96781ed3824c3'); // 다음에 설정해주세요!
});

// ============ 카카오톡 공유 함수 ============
function shareWithKakao() {
  // Kakao SDK가 로드되지 않았으면 경고
  if (typeof Kakao === 'undefined') {
    showMessage('카카오톡 공유 기능을 사용할 수 없습니다.', 2000);
    return;
  }
  
  // SDK가 초기화되지 않았으면 경고
  if (!Kakao.isInitialized()) {
    showMessage('카카오톡 공유 설정 중입니다. 다시 시도해주세요.', 2000);
    return;
  }
  
  // 현재 페이지 URL
  const currentUrl = window.location.href;
  
  // 카카오톡 링크 공유 API
  Kakao.Link.sendDefault({
    objectType: 'feed',
    content: {
      title: '🎮 기획냐옹 - 숫자 찾기 게임',
      description: '숫자를 순서대로 찾는 게임! 너도 도전해봐! 🔢',
      imageUrl: currentUrl + 'image.png', // (선택) 썸네일 이미지 URL
      link: {
        mobileWebUrl: currentUrl,
        webUrl: currentUrl,
      },
    },
    buttons: [
      {
        title: '게임하기',
        link: {
          mobileWebUrl: currentUrl,
          webUrl: currentUrl,
        },
      },
    ],
    success: function(response) {
      console.log('카카오톡 공유 성공:', response);
      addPlayCount();  // 공유 성공 시 기회 +1
    },
    fail: function(error) {
      console.log('카카오톡 공유 실패:', error);
      showMessage('카카오톡 공유에 실패했습니다.', 2000);
    },
  });
}
