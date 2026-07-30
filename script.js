const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

let answer = "";
let puzzleDate = "";
let puzzleNumber = "";
let currentGuess = "";
let guesses = [];
let results = [];
let gameOver = false;

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const puzzleLabel = document.getElementById("puzzleLabel");
const clearButton = document.getElementById("clearButton");
const helpButton = document.getElementById("helpButton");
const helpPanel = document.getElementById("helpPanel");

const keyboardLayout = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACK"]
];

function getCentralDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GLOBEL_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const value = type => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeDate(value) {
  const trimmed = String(value || "").trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }

  return trimmed;
}

async function loadTodayPuzzle() {
  const response = await fetch(`${GLOBEL_CONFIG.puzzleFeedUrl}&cacheBust=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("The puzzle schedule could not be loaded.");
  }

  const rows = parseCsv(await response.text());
  const headerIndex = rows.findIndex(row =>
    row.some(cell => cell.trim().toUpperCase() === "DATE") &&
    row.some(cell => cell.trim().toUpperCase() === "ANSWER")
  );

  if (headerIndex === -1) {
    throw new Error("The spreadsheet header row could not be found.");
  }

  const headers = rows[headerIndex].map(cell => cell.trim().toUpperCase());
  const dateIndex = headers.indexOf("DATE");
  const answerIndex = headers.indexOf("ANSWER");
  const statusIndex = headers.indexOf("STATUS");
  const numberIndex = headers.indexOf("PUZZLE #");

  const requestedDate =
    new URLSearchParams(window.location.search).get("date") || getCentralDateKey();

  const match = rows.slice(headerIndex + 1).find(row => {
    const date = normalizeDate(row[dateIndex]);
    const status = String(row[statusIndex] || "").trim().toUpperCase();
    return date === requestedDate && status === GLOBEL_CONFIG.readyStatus;
  });

  if (!match) {
    throw new Error(`No Ready puzzle is scheduled for ${requestedDate}.`);
  }

  const loadedAnswer = String(match[answerIndex] || "").trim().toUpperCase();
  if (!/^[A-Z]{5}$/.test(loadedAnswer)) {
    throw new Error("Today’s answer must contain exactly five letters.");
  }

  return {
    date: requestedDate,
    answer: loadedAnswer,
    number: String(match[numberIndex] || "").trim()
  };
}

function storageKey() {
  return `globel:${puzzleDate}`;
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify({
    guesses,
    results,
    gameOver
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    if (!saved || !Array.isArray(saved.guesses) || !Array.isArray(saved.results)) return;
    guesses = saved.guesses.slice(0, MAX_GUESSES);
    results = saved.results.slice(0, MAX_GUESSES);
    gameOver = Boolean(saved.gameOver);
  } catch {
    localStorage.removeItem(storageKey());
  }
}

function createBoard() {
  board.innerHTML = "";
  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex++) {
    const row = document.createElement("div");
    row.className = "row";

    for (let columnIndex = 0; columnIndex < WORD_LENGTH; columnIndex++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${rowIndex}-${columnIndex}`;
      tile.setAttribute("aria-label", `Row ${rowIndex + 1}, letter ${columnIndex + 1}`);
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function createKeyboard() {
  keyboard.innerHTML = "";
  keyboardLayout.forEach(rowLetters => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    rowLetters.forEach(letter => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.key = letter;
      button.className = "key";
      button.textContent = letter === "BACK" ? "⌫" : letter;
      button.setAttribute("aria-label", letter === "BACK" ? "Backspace" : letter);
      if (letter === "ENTER" || letter === "BACK") button.classList.add("wide");
      button.addEventListener("click", () => handleInput(letter));
      row.appendChild(button);
    });
    keyboard.appendChild(row);
  });
}

function restoreBoard() {
  guesses.forEach((guess, rowIndex) => {
    const result = results[rowIndex];
    for (let i = 0; i < WORD_LENGTH; i++) {
      const tile = document.getElementById(`tile-${rowIndex}-${i}`);
      tile.textContent = guess[i];
      tile.classList.add(result[i]);
      updateKeyColor(guess[i], result[i]);
    }
  });

  if (gameOver) {
    message.textContent = guesses.includes(answer) ? "Correct." : `The word was ${answer}.`;
  }
}

function handleInput(key) {
  if (gameOver || !answer) return;
  if (key === "ENTER") return submitGuess();

  if (key === "BACK") {
    currentGuess = currentGuess.slice(0, -1);
    return updateCurrentRow();
  }

  if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key;
    updateCurrentRow();
  }
}

function updateCurrentRow() {
  const rowIndex = guesses.length;
  if (rowIndex >= MAX_GUESSES) return;

  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${rowIndex}-${i}`);
    tile.textContent = currentGuess[i] || "";
    tile.classList.toggle("filled", Boolean(currentGuess[i]));
  }
}

function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    message.textContent = "Enter five letters.";
    return;
  }

  const result = scoreGuess(currentGuess, answer);
  revealGuess(currentGuess, result);
  guesses.push(currentGuess);
  results.push(result);

  if (currentGuess === answer) {
    message.textContent = "Correct.";
    gameOver = true;
  } else if (guesses.length === MAX_GUESSES) {
    message.textContent = `The word was ${answer}.`;
    gameOver = true;
  } else {
    message.textContent = "";
  }

  currentGuess = "";
  saveState();
}

function scoreGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = target.split("");

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const matchIndex = remaining.indexOf(guess[i]);
    if (matchIndex !== -1) {
      result[i] = "present";
      remaining[matchIndex] = null;
    }
  }
  return result;
}

function revealGuess(guess, result) {
  const rowIndex = guesses.length;
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${rowIndex}-${i}`);
    tile.textContent = guess[i];
    tile.classList.add(result[i]);
    updateKeyColor(guess[i], result[i]);
  }
}

function updateKeyColor(letter, status) {
  const button = document.querySelector(`[data-key="${letter}"]`);
  if (!button) return;

  const priority = { absent: 1, present: 2, correct: 3 };
  const current = ["absent", "present", "correct"].find(x => button.classList.contains(x));

  if (!current || priority[status] > priority[current]) {
    button.classList.remove("absent", "present", "correct");
    button.classList.add(status);
  }
}

async function initialize() {
  createBoard();
  createKeyboard();
  keyboard.classList.add("disabled");

  try {
    const puzzle = await loadTodayPuzzle();
    answer = puzzle.answer;
    puzzleDate = puzzle.date;
    puzzleNumber = puzzle.number;

    puzzleLabel.textContent = puzzleNumber
      ? `Puzzle #${puzzleNumber} · ${puzzleDate}`
      : `Daily puzzle · ${puzzleDate}`;

    loadState();
    restoreBoard();
    keyboard.classList.remove("disabled");
    message.textContent = gameOver
      ? (guesses.includes(answer) ? "Correct." : `The word was ${answer}.`)
      : "";
  } catch (error) {
    puzzleLabel.textContent = "Daily five-letter word game";
    message.textContent = error.message;
  }
}

document.addEventListener("keydown", event => {
  const key = event.key.toUpperCase();
  if (key === "ENTER") handleInput("ENTER");
  else if (key === "BACKSPACE") handleInput("BACK");
  else if (/^[A-Z]$/.test(key)) handleInput(key);
});

helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

clearButton.addEventListener("click", () => {
  if (!puzzleDate) return;
  localStorage.removeItem(storageKey());
  window.location.reload();
});

initialize();
