let currentRound = 1;
let gridSize = 2;
let targetSequence = [];
let userSequence = [];
let roundTimer;
let gameStartTime = null;
let gameActive = false;
let globalCompletionTime = 0;

// ============ 캐싱 및 성능 최적화 변수 ============
let rankingsCache = null;
let rankingsCacheTime = 0;
let localRankingsCache = null;
let playCountCache = null;

const PLAY_COUNT_KEY = 'playCount';
const RANKINGS_KEY = 'rankings';
const SHARE_DONE_KEY = 'shareCompleted';
const INITIAL_PLAYS = 3;
const MAX_RANKINGS = 10;
const CACHE_DURATION = 30000; // 30초
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzD_f3flj1126mc7-fZ6bTTjgGXfgAT6P31r3Tb3Th934Ap3hUVEHkeQFsKseJ7ToiD/exec';

const gridContainer = document.getElementById('grid-container');
const roundNumberElement = document.getElementById('round-number');
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-btn');
const messageBox = document.getElementById('message-box');
const rulesModal = document.getElementById('rules-modal');

// ============ 기회 관리 ============
function getPlayCount() {
  if (playCountCache === null) {
    const count = localStorage.getItem(PLAY_COUNT_KEY);
    playCountCache = count !== null ? parseInt(count, 10) : INITIAL_PLAYS;
  }
  return playCountCache;
}

function setPlayCount(count) {
  playCountCache = Math.max(0, count);
  localStorage.setItem(PLAY_COUNT_KEY, playCountCache);
}

function decrementPlayCount() {
  const current = getPlayCount();
  setPlayCount(current - 1);
}

function addPlayCount() {
  const current = getPlayCount();
  setPlayCount(current + 1);
  showMessage('공유 성공! 기회 +1 획득했습니다 🎉', 2000);
}

function hasShared() {
  return localStorage.getItem(SHARE_DONE_KEY) === 'true';
}

function markShared() {
  localStorage.setItem(SHARE_DONE_KEY, 'true');
}

function updatePlayCountDisplay() {
  const count = getPlayCount();
  const display = document.getElementById('play-count-display');
  if (display) {
    display.textContent = count;
  }
}

// ============ 랭킹 시스템 ============
function getRankings() {
  if (!localRankingsCache) {
    const rankingsJson = localStorage.getItem(RANKINGS_KEY);
    localRankingsCache = rankingsJson ? JSON.parse(rankingsJson) : [];
  }
  return localRankingsCache;
}

function saveRankings(rankings) {
  localRankingsCache = rankings;
  localStorage.setItem(RANKINGS_KEY, JSON.stringify(rankings));
}

function addRanking(name, timeInSeconds) {
  const rankings = getRankings();
  
  // 같은 이름의 기존 기록 찾기
  const existingIndex = rankings.findIndex(r => r.name === name);
  
  if (existingIndex !== -1) {
    // 기존 기록이 있으면 더 좋은 시간만 유지
    if (timeInSeconds < rankings[existingIndex].time) {
      rankings[existingIndex].time = timeInSeconds;
      rankings[existingIndex].timestamp = new Date().toLocaleString('ko-KR');
    }
  } else {
    // 새로운 기록 추가
    rankings.push({
      name: name,
      time: timeInSeconds,
      timestamp: new Date().toLocaleString('ko-KR')
    });
  }
  
  rankings.sort((a, b) => a.time - b.time);
  const topRankings = rankings.slice(0, MAX_RANKINGS);
  saveRankings(topRankings);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 글로벌 랭킹 저장 (Google Apps Script)
async function saveToGlobalRankings(name, timeInSeconds) {
  try {
    const data = {
      name: name,
      time: `'${timeInSeconds}`,  // 앞에 '를 붙여서 텍스트로 저장
      formattedTime: formatTime(timeInSeconds),
      date: new Date().toLocaleString('ko-KR')
    };
    
    console.log('Google Sheets 저장 시도:', data);
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    console.log('저장 완료');
    return true;
  } catch (error) {
    console.error('글로벌 랭킹 저장 실패:', error);
    return false;
  }
}

// 글로벌 랭킹 불러오기 (Google Apps Script) - 캐싱 적용
async function getGlobalRankings() {
  const now = Date.now();
  
  // 캐시가 유효하면 반환
  if (rankingsCache && (now - rankingsCacheTime) < CACHE_DURATION) {
    console.log('캐시된 랭킹 사용');
    return rankingsCache;
  }
  
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    if (!response.ok) {
      throw new Error('불러오기 실패');
    }
    
    const data = await response.json();
    console.log('새로운 랭킹 데이터 로드:', data.length + '개 항목');
    
    // 캐시 업데이트
    rankingsCache = Array.isArray(data) ? data : [];
    rankingsCacheTime = now;
    
    return rankingsCache;
  } catch (error) {
    console.error('글로벌 랭킹 불러오기 실패:', error);
    // 캐시가 있으면 실패해도 반환
    return rankingsCache || [];
  }
}

function showCompletionModal(completionTime) {
  const modal = document.createElement('div');
  modal.id = 'completion-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🎉 게임 완료!</h2>
      <p style="font-size: 18px; margin: 20px 0;">
        완료 시간: <strong>${formatTime(completionTime)}</strong>
      </p>
      <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 12px; margin-bottom: 15px; font-size: 13px; color: #856404;">
        <strong>📝 이름 입력 방법:</strong><br>
        홍길동_과학20 형식으로 입력하세요<br>
        (예: 김철수_영어15, 이영희_과학18)<br>
        <strong style="color: #d32f2f;">⚠️ 양식을 지키지 않으면 경품 제공에 제외됩니다!</strong>
      </div>
      <input 
        type="text" 
        id="player-name" 
        placeholder="이름_학과학번 (예: 홍길동_과학20)" 
        maxlength="20"
        style="width: 100%; padding: 10px; font-size: 16px; margin: 15px 0; border: 2px solid #ddd; border-radius: 5px; box-sizing: border-box;"
      />
      <button onclick="saveAndShowRankings()" style="width: 100%; padding: 12px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 10px;">저장 및 랭킹 보기</button>
      <button onclick="closeCompletionModal()" style="width: 100%; padding: 12px; font-size: 16px; background: #999; color: white; border: none; border-radius: 5px; cursor: pointer;">닫기</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeCompletionModal() {
  const modal = document.getElementById('completion-modal');
  if (modal) modal.remove();
}

async function saveAndShowRankings() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim();
  
  if (name === '') {
    alert('이름을 입력해주세요!');
    return;
  }
  
  const completionTime = globalCompletionTime;
  
  // 로컬 저장
  addRanking(name, completionTime);
  
  const saveBtn = document.querySelector('#completion-modal button:first-of-type');
  saveBtn.textContent = '저장 중...';
  saveBtn.disabled = true;
  
  const success = await saveToGlobalRankings(name, completionTime);
  
  // 캐시 무효화
  rankingsCache = null;
  rankingsCacheTime = 0;
  
  if (success) {
    showMessage('✅ 글로벌 랭킹에 저장되었습니다!', 2000);
    // 저장 후 서버 데이터 동기화 대기
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    showMessage('⚠️ 글로벌 저장 실패 (로컬에는 저장됨)', 2000);
  }
  
  closeCompletionModal();
  showRankingsPage();
}

async function showRankingsPage() {
  // 로딩 표시
  const loadingHtml = '<div class="rankings-container"><h2>🏆 글로벌 랭킹</h2><p>불러오는 중...</p></div>';
  const overlay = document.createElement('div');
  overlay.id = 'rankings-overlay';
  overlay.className = 'modal';
  overlay.innerHTML = loadingHtml;
  document.body.appendChild(overlay);
  
  // 글로벌 랭킹 불러오기
  const rankings = await getGlobalRankings();
  
  // 모바일 여부 확인
  const isMobile = window.innerWidth <= 600;
  
  let rankingsHtml = '<div class="rankings-container"><h2>🏆 글로벌 랭킹</h2>';
  
  if (rankings.length === 0) {
    rankingsHtml += '<p>아직 완료 기록이 없습니다.</p>';
  } else if (isMobile) {
    // 모바일: 카드 형식
    rankingsHtml += '<div class="rankings-card-list">';
    rankings.slice(0, 50).forEach((rank, index) => {
      const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
      rankingsHtml += `
        <div class="ranking-card">
          <div class="ranking-rank ${rankClass}">${index + 1}</div>
          <div class="ranking-info">
            <div class="ranking-name">${rank.name}</div>
            <div class="ranking-date">${rank.date}</div>
          </div>
          <div class="ranking-time">${rank.formattedTime || formatTime(parseInt(rank.time))}</div>
        </div>
      `;
    });
    rankingsHtml += '</div>';
  } else {
    // PC: 테이블 형식
    rankingsHtml += '<table class="rankings-table"><thead><tr><th>순위</th><th>이름</th><th>시간</th><th>날짜</th></tr></thead><tbody>';
    rankings.slice(0, 50).forEach((rank, index) => {
      rankingsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${rank.name}</td>
          <td>${rank.formattedTime || formatTime(parseInt(rank.time))}</td>
          <td style="font-size: 12px;">${rank.date}</td>
        </tr>
      `;
    });
    rankingsHtml += '</tbody></table>';
  }
  
  rankingsHtml += '<button onclick="hideRankingsPage()" style="width: 100%; padding: 12px; font-size: 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">돌아가기</button>';
  rankingsHtml += '</div>';
  
  overlay.innerHTML = rankingsHtml;
}

function hideRankingsPage() {
  const overlay = document.getElementById('rankings-overlay');
  if (overlay) overlay.remove();
  resetGame();
}

function showRankingsButton() {
  const btn = document.createElement('button');
  btn.id = 'rankings-btn';
  btn.textContent = '🏆 랭킹';
  btn.onclick = showRankingsPage;
  btn.style.cssText = 'background-color: #FFB6C1; color: #333; font-weight: bold;';
  document.getElementById('button-group').appendChild(btn);
}

// ============ UI 초기화 ============
function closeRulesModal() {
  rulesModal.classList.add('hidden');
}

document.querySelector('.close').addEventListener('click', closeRulesModal);

window.addEventListener('click', function(event) {
  if (event.target === rulesModal) {
    closeRulesModal();
  }
});

window.addEventListener('load', function() {
  rulesModal.classList.remove('hidden');
  updatePlayCountDisplay();
  showRankingsButton();
  Kakao.init('a082589492b825fcacc96781ed3824c3');
});

function showMessage(message, duration = 2000) {
  messageBox.textContent = message;
  messageBox.classList.add('show');
  
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, duration);
}

// ============ 게임 로직 ============
function generateGrid() {
  gridContainer.innerHTML = '';
  let numbers = [];
  for (let i = 1; i <= gridSize * gridSize; i++) {
    numbers.push(i);
  }

  numbers = numbers.sort(() => Math.random() - 0.5);
  adjustCellSize();

  numbers.forEach(num => {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.textContent = num;
    cell.dataset.number = num;
    cell.onclick = () => handleCellClick(num);
    gridContainer.appendChild(cell);
  });
}

function adjustCellSize() {
  let padding = 20;
  let fontSize = 24;
  
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
  
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.style.padding = padding + 'px';
    cell.style.fontSize = fontSize + 'px';
  });
}

function handleCellClick(num) {
  if (!gameActive) return;
  
  if (num === targetSequence[userSequence.length]) {
    userSequence.push(num);
    
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      if (parseInt(cell.textContent) === num) {
        cell.classList.add('clicked');
      }
    });
    
    if (userSequence.length === targetSequence.length) {
      nextRound();
    }
  } else {
    showMessage('틀렸습니다! 다시 시도해 주세요.');
  }
}

function nextRound() {
  // 기존 타이머 취소
  if (roundTimer) {
    if (typeof roundTimer === 'number' && roundTimer > 0) {
      cancelAnimationFrame(roundTimer);
    } else {
      clearInterval(roundTimer);
    }
  }
  roundTimer = null;
  
  currentRound++;
  
  if (currentRound > 5) {
    gameActive = false;
    globalCompletionTime = Math.floor((Date.now() - gameStartTime) / 1000);
    showMessage('게임 완료! 축하합니다! 🎉', 2000);
    setTimeout(() => {
      showCompletionModal(globalCompletionTime);
    }, 2000);
  } else {
    roundNumberElement.textContent = currentRound;
    gridSize = currentRound + 1;
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    userSequence = [];
    targetSequence = generateSequence(gridSize);
    generateGrid();
    startTimer();
  }
}

function generateSequence(size) {
  const sequence = [];
  for (let i = 1; i <= size * size; i++) {
    sequence.push(i);
  }
  return sequence;
}

function startGame() {
  // 무제한 플레이 모드: 기회 수 검사 및 감소 로직 제거
  gameStartTime = Date.now();
  gameActive = true;

  currentRound = 1;
  roundNumberElement.textContent = currentRound;
  gridSize = 2;
  gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  userSequence = [];
  targetSequence = generateSequence(gridSize);
  generateGrid();
  startTimer();
}

function startTimer() {
  // 기존 타이머 취소
  if (roundTimer) {
    if (typeof roundTimer === 'number' && roundTimer > 0) {
      cancelAnimationFrame(roundTimer);
    } else {
      clearInterval(roundTimer);
    }
  }
  
  const startTime = Date.now();
  let lastSecond = 0;
  
  function updateTimer() {
    if (!gameActive) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // 1초 단위로만 업데이트 (성능 최적화)
    if (elapsed !== lastSecond) {
      timerElement.textContent = formatTime(elapsed);
      lastSecond = elapsed;
    }
    
    roundTimer = requestAnimationFrame(updateTimer);
  }
  
  updateTimer();
}

function resetGame() {
  if (roundTimer) {
    if (typeof roundTimer === 'number' && roundTimer > 0) {
      cancelAnimationFrame(roundTimer);
    } else {
      clearInterval(roundTimer);
    }
  }
  gameActive = false;
  gameStartTime = null;
  timerElement.textContent = '00:00';
  startButton.disabled = false;
  userSequence = [];
  currentRound = 1;
  updatePlayCountDisplay();
}

startButton.disabled = false;

// ============ 카카오톡 공유 ============
function shareWithKakao() {
  // 이미 공유했는지 확인
  if (hasShared()) {
    showMessage('⚠️ 공유는 1회만 가능합니다!', 2000);
    return;
  }
  
  if (typeof Kakao === 'undefined') {
    showMessage('카카오톡 공유 기능을 사용할 수 없습니다.', 2000);
    return;
  }
  
  if (!Kakao.isInitialized()) {
    showMessage('카카오톡 공유 설정 중입니다. 다시 시도해주세요.', 2000);
    return;
  }
  
  const currentUrl = window.location.href;
  
  Kakao.Link.sendDefault({
    objectType: 'feed',
    content: {
      title: '🎮 기획냐옹 - 숫자 찾기 게임',
      description: '숫자를 순서대로 찾는 게임! 너도 도전해봐! 🔢',
      imageUrl: currentUrl + 'image.png',
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
      markShared();  // 공유 완료 기록
      addPlayCount();
    },
    fail: function(error) {
      console.log('카카오톡 공유 실패:', error);
      showMessage('카카오톡 공유에 실패했습니다.', 2000);
    },
  });
}
