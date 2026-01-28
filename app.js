const GRID_SIZE = 10;
const MINE_COUNT = 15;
const TURKEY = "🦃";
const SHAVED_TURKEY = "";
const FLAG = "🚩";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const flagCountEl = document.getElementById("flag-count");
const mineCountEl = document.getElementById("mine-count");
const gridSizeEl = document.getElementById("grid-size");
const newGameBtn = document.getElementById("new-game");
const modalEl = document.getElementById("turkey-modal");
const modalCloseBtn = document.getElementById("close-modal");

let cells = [];
let firstClick = true;
let gameOver = false;
let revealedCount = 0;
let flaggedCount = 0;

function init() {
  gridSizeEl.textContent = `${GRID_SIZE}×${GRID_SIZE}`;
  mineCountEl.textContent = MINE_COUNT;
  newGameBtn.addEventListener("click", startGame);
  modalCloseBtn.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (event) => {
    if (event.target.dataset.close) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
  startGame();
}

function startGame() {
  cells = [];
  firstClick = true;
  gameOver = false;
  revealedCount = 0;
  flaggedCount = 0;
  statusEl.textContent = "Make your first move.";
  updateFlagCount();
  closeModal();
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--columns", GRID_SIZE);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = createCell(row, col);
      cells.push(cell);
      boardEl.appendChild(cell.button);
    }
  }
}

function createCell(row, col) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cell";
  button.dataset.row = row;
  button.dataset.col = col;
  button.setAttribute("role", "gridcell");
  button.setAttribute("aria-label", `Row ${row + 1} Column ${col + 1}`);

  const cell = {
    row,
    col,
    hasMine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    button,
  };

  button.addEventListener("click", () => handleReveal(cell));
  button.addEventListener("dblclick", () => handleChord(cell));
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    handleFlag(cell);
  });

  return cell;
}

function handleReveal(cell) {
  if (gameOver || cell.flagged || cell.revealed) {
    return;
  }

  if (firstClick) {
    placeMines(cell);
    calculateAdjacents();
    firstClick = false;
  }

  if (cell.hasMine) {
    revealMine(cell);
    return;
  }

  revealCell(cell);
  checkWin();
}

function handleChord(cell) {
  if (gameOver || !cell.revealed || cell.adjacent === 0) {
    return;
  }

  const nearby = neighbors(cell);
  const flagged = nearby.filter((neighbor) => neighbor.flagged).length;
  if (flagged !== cell.adjacent) {
    return;
  }

  nearby.forEach((neighbor) => {
    if (!neighbor.revealed && !neighbor.flagged) {
      handleReveal(neighbor);
    }
  });
}

function handleFlag(cell) {
  if (gameOver || cell.revealed) {
    return;
  }

  cell.flagged = !cell.flagged;
  flaggedCount += cell.flagged ? 1 : -1;
  cell.button.classList.toggle("flagged", cell.flagged);
  cell.button.textContent = cell.flagged ? FLAG : "";
  updateFlagCount();
}

function placeMines(safeCell) {
  const safeIndex = indexFor(safeCell.row, safeCell.col);
  let placed = 0;

  while (placed < MINE_COUNT) {
    const index = Math.floor(Math.random() * cells.length);
    if (index === safeIndex || cells[index].hasMine) {
      continue;
    }
    cells[index].hasMine = true;
    placed += 1;
  }
}

function calculateAdjacents() {
  cells.forEach((cell) => {
    if (cell.hasMine) {
      cell.adjacent = 0;
      return;
    }
    cell.adjacent = neighbors(cell).filter((neighbor) => neighbor.hasMine).length;
  });
}

function revealCell(cell, skipFlood = false) {
  if (cell.revealed || cell.flagged) {
    return;
  }

  cell.revealed = true;
  revealedCount += 1;
  cell.button.classList.add("revealed");
  cell.button.textContent = cell.adjacent ? cell.adjacent : "";

  if (!skipFlood && cell.adjacent === 0) {
    floodReveal(cell);
  }
}

function floodReveal(startCell) {
  const queue = [startCell];
  const visited = new Set([indexFor(startCell.row, startCell.col)]);

  while (queue.length) {
    const current = queue.shift();
    neighbors(current).forEach((neighbor) => {
      const idx = indexFor(neighbor.row, neighbor.col);
      if (visited.has(idx) || neighbor.flagged || neighbor.hasMine) {
        return;
      }
      revealCell(neighbor, true);
      visited.add(idx);
      if (neighbor.adjacent === 0) {
        queue.push(neighbor);
      }
    });
  }
}

function revealMine(triggerCell) {
  gameOver = true;
  statusEl.textContent = "Turkey hit! The flock is spooked.";
  openModal();

  cells.forEach((cell) => {
    if (!cell.hasMine) {
      return;
    }
    cell.button.classList.add("revealed", "mine");
    if (cell === triggerCell) {
      cell.button.classList.add("shaved");
      cell.button.textContent = SHAVED_TURKEY;
    } else {
      cell.button.textContent = TURKEY;
    }
  });
}

function openModal() {
  modalEl.classList.add("is-open");
  modalEl.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalEl.classList.remove("is-open");
  modalEl.setAttribute("aria-hidden", "true");
}

function checkWin() {
  const safeCells = GRID_SIZE * GRID_SIZE - MINE_COUNT;
  if (revealedCount === safeCells) {
    gameOver = true;
    statusEl.textContent = "You saved the flock!";
    cells.forEach((cell) => {
      if (cell.hasMine && !cell.flagged) {
        cell.button.textContent = TURKEY;
      }
    });
  }
}

function updateFlagCount() {
  const remaining = Math.max(MINE_COUNT - flaggedCount, 0);
  flagCountEl.textContent = remaining;
}

function neighbors(cell) {
  const results = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const row = cell.row + dr;
      const col = cell.col + dc;
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
        continue;
      }
      results.push(cells[indexFor(row, col)]);
    }
  }
  return results;
}

function indexFor(row, col) {
  return row * GRID_SIZE + col;
}

init();
