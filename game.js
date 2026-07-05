const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bgm = new Audio("./sounds/tetris-bgm.mp3");

bgm.loop = true;
bgm.volume = 0.35;

function playBgm() {
  bgm.play().catch(() => {
    // 아이폰 Safari 등에서 자동 재생이 차단될 경우 조용히 무시
  });
}

function pauseBgm() {
  bgm.pause();
}

function stopBgm() {
  bgm.pause();
  bgm.currentTime = 0;
}

const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const messageEl = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let board = [];
let currentPiece = null;
let nextPiece = null;

let score = 0;
let bestScore = Number(localStorage.getItem("blockPuzzleBestScore") || 0);
let lines = 0;
let level = 1;

let dropCounter = 0;
let dropInterval = 700;
let lastTime = 0;
let animationId = null;

let isRunning = false;
let isPaused = false;
let isGameOver = false;

const COLORS = [
  null,
  "#38bdf8",
  "#facc15",
  "#a78bfa",
  "#fb7185",
  "#22c55e",
  "#f97316",
  "#06b6d4"
];

const PIECES = [
  {
    shape: [[1, 1, 1, 1]],
    color: 1
  },
  {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 2
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 3
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 4
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 5
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 6
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 7
  }
];

bestScoreEl.textContent = bestScore;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function cloneShape(shape) {
  return shape.map(row => [...row]);
}

function createPiece() {
  const randomIndex = Math.floor(Math.random() * PIECES.length);
  const piece = PIECES[randomIndex];

  return {
    shape: cloneShape(piece.shape),
    color: piece.color,
    x: Math.floor(COLS / 2) - Math.ceil(piece.shape[0].length / 2),
    y: 0
  };
}

function resetGame() {
  board = createBoard();
  currentPiece = createPiece();
  nextPiece = createPiece();

  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 700;

  dropCounter = 0;
  lastTime = 0;

  isRunning = true;
  isPaused = false;
  isGameOver = false;

  updateInfo();
  hideMessage();

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  draw();
  playBgm();
  animationId = requestAnimationFrame(update);
}

function startGame() {
  if (!isRunning || isGameOver) {
    resetGame();
    return;
  }

  if (isPaused) {
    togglePause();
  }
}

function togglePause() {
  if (!isRunning || isGameOver) return;

  isPaused = !isPaused;

  if (isPaused) {
    pauseBgm();
    showMessage("일시정지");
  } else {
    hideMessage();
    playBgm();
    lastTime = 0;
    animationId = requestAnimationFrame(update);
  }
}

function gameOver() {
  isGameOver = true;
  isRunning = false;

  stopBgm();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("blockPuzzleBestScore", String(bestScore));
  }

  updateInfo();
  showMessage(`게임 오버<br>점수: ${score}`);
}

function updateInfo() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

function showMessage(text) {
  messageEl.innerHTML = text;
  messageEl.classList.add("show");
}

function hideMessage() {
  messageEl.classList.remove("show");
}

function drawBlock(context, x, y, color, size = BLOCK_SIZE) {
  context.fillStyle = COLORS[color];
  context.fillRect(x * size, y * size, size, size);

  context.strokeStyle = "#0f172a";
  context.lineWidth = 2;
  context.strokeRect(x * size, y * size, size, size);

  context.fillStyle = "rgba(255, 255, 255, 0.18)";
  context.fillRect(x * size + 3, y * size + 3, size - 6, 5);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.stroke();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) {
        drawBlock(ctx, x, y, board[y][x]);
      }
    }
  }
}

function drawPiece(piece) {
  if (!piece) return;

  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        drawBlock(ctx, piece.x + x, piece.y + y, piece.color);
      }
    });
  });
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#0f172a";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const size = 24;
  const shape = nextPiece.shape;
  const offsetX = Math.floor((5 - shape[0].length) / 2);
  const offsetY = Math.floor((5 - shape.length) / 2);

  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        drawBlock(nextCtx, offsetX + x, offsetY + y, nextPiece.color, size);
      }
    });
  });
}

function draw() {
  drawBoard();
  drawPiece(currentPiece);
  drawNextPiece();
}

function collide(piece) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue;

      const newX = piece.x + x;
      const newY = piece.y + y;

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }

      if (newY >= 0 && board[newY][newX] !== 0) {
        return true;
      }
    }
  }

  return false;
}

function mergePiece() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const boardY = currentPiece.y + y;
        const boardX = currentPiece.x + x;

        if (boardY >= 0) {
          board[boardY][boardX] = currentPiece.color;
        }
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }

    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    cleared++;
    y++;
  }

  if (cleared > 0) {
    lines += cleared;

    const lineScores = {
      1: 100,
      2: 300,
      3: 500,
      4: 800
    };

    score += (lineScores[cleared] || cleared * 200) * level;

    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 700 - (level - 1) * 55);

    updateInfo();
  }
}

function movePiece(dx, dy) {
  if (!canControl()) return;

  currentPiece.x += dx;
  currentPiece.y += dy;

  if (collide(currentPiece)) {
    currentPiece.x -= dx;
    currentPiece.y -= dy;

    if (dy > 0) {
      lockPiece();
    }

    return false;
  }

  draw();
  return true;
}

function lockPiece() {
  mergePiece();
  clearLines();

  currentPiece = nextPiece;
  nextPiece = createPiece();

  if (collide(currentPiece)) {
    draw();
    gameOver();
    return;
  }

  draw();
}

function rotatePiece() {
  if (!canControl()) return;

  const originalShape = currentPiece.shape;
  const originalX = currentPiece.x;

  const rotated = currentPiece.shape[0].map((_, index) =>
    currentPiece.shape.map(row => row[index]).reverse()
  );

  currentPiece.shape = rotated;

  const kicks = [0, -1, 1, -2, 2];

  for (const offset of kicks) {
    currentPiece.x = originalX + offset;

    if (!collide(currentPiece)) {
      draw();
      return;
    }
  }

  currentPiece.shape = originalShape;
  currentPiece.x = originalX;
  draw();
}

function hardDrop() {
  if (!canControl()) return;

  let dropped = 0;

  while (movePiece(0, 1)) {
    dropped++;
  }

  score += dropped * 2;
  updateInfo();
}

function canControl() {
  return isRunning && !isPaused && !isGameOver && currentPiece;
}

function update(time = 0) {
  if (!isRunning || isPaused || isGameOver) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    movePiece(0, 1);
    dropCounter = 0;
  }

  draw();
  animationId = requestAnimationFrame(update);
}

document.addEventListener("keydown", event => {
  if (!canControl()) {
    if (event.key === "Enter") {
      startGame();
    }
    return;
  }

  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === " "
  ) {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft") {
    movePiece(-1, 0);
  } else if (event.key === "ArrowRight") {
    movePiece(1, 0);
  } else if (event.key === "ArrowDown") {
    movePiece(0, 1);
  } else if (event.key === "ArrowUp") {
    rotatePiece();
  } else if (event.key === " ") {
    hardDrop();
  }
});

document.querySelectorAll(".touch-controls button").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();

    const action = button.dataset.action;

    if (action === "left") {
      movePiece(-1, 0);
    } else if (action === "right") {
      movePiece(1, 0);
    } else if (action === "down") {
      movePiece(0, 1);
    } else if (action === "rotate") {
      rotatePiece();
    } else if (action === "drop") {
      hardDrop();
    }
  });
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);

board = createBoard();
drawBoard();
drawNextPiece();
updateInfo();
showMessage("시작 버튼을 눌러주세요");
