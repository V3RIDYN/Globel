const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

let answer = "";
let hint = "";
let puzzleDate = "";
let puzzleNumber = "";
let currentGuess = "";
let guesses = [];
let results = [];
let gameOver = false;
let hintUsed = false;
let allPuzzles = [];
let todayKey = "";

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const puzzleLabel = document.getElementById("puzzleLabel");
const clearButton = document.getElementById("clearButton");
const helpButton = document.getElementById("helpButton");
const helpPanel = document.getElementById("helpPanel");
const hintButton = document.getElementById("hintButton");
const hintPanel = document.getElementById("hintPanel");
const hintText = document.getElementById("hintText");
const archiveButton = document.getElementById("archiveButton");
const todayButton = document.getElementById("todayButton");
const archiveModal = document.getElementById("archiveModal");
const archiveList = document.getElementById("archiveList");
const closeArchiveButton = document.getElementById("closeArchiveButton");
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultFollowUp = document.getElementById("resultFollowUp");
const closeModalButton = document.getElementById("closeModalButton");
const doneButton = document.getElementById("doneButton");
const resultTodayButton = document.getElementById("resultTodayButton");

const keyboardLayout = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACK"]
];

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

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
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
  }

  return trimmed;
}

function playableStatuses() {
  const configured = Array.isArray(GLOBEL_CONFIG.playableStatuses)
    ? GLOBEL_CONFIG.playableStatuses
    : [GLOBEL_CONFIG.readyStatus || "READY"];

  return new Set(configured.map(status => String(status).trim().toUpperCase()));
}

async function loadPuzzleFeed() {
  const separator = GLOBEL_CONFIG.puzzleFeedUrl.includes("?") ? "&" : "?";
  const response = await fetch(
    `${GLOBEL_CONFIG.puzzleFeedUrl}${separator}cacheBust=${Date.now()}`,
    { cache: "no-store" }
  );

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
  const index = name => headers.indexOf(name);
  const dateIndex = index("DATE");
  const answerIndex = index("ANSWER");
  const statusIndex = index("STATUS");
  const numberIndex = index("PUZZLE #");
  const hintIndex = index("OPTIONAL HINT");
  const allowed = playableStatuses();

  return rows.slice(headerIndex + 1)
    .map(row => ({
      date: normalizeDate(row[dateIndex]),
      answer: String(row[answerIndex] || "").trim().toUpperCase(),
      status: String(row[statusIndex] || "").trim().toUpperCase(),
      number: numberIndex >= 0 ? String(row[numberIndex] || "").trim() : "",
      hint: hintIndex >= 0 ? String(row[hintIndex] || "").trim() : ""
    }))
    .filter(puzzle =>
      /^\d{4}-\d{2}-\d{2}$/.test(puzzle.date) &&
      /^[A-Z]{5}$/.test(puzzle.answer) &&
      allowed.has(puzzle.status)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function requestedDateKey() {
  return new URLSearchParams(window.location.search).get("date") || todayKey;
}

function getRequestedPuzzle() {
  const requestedDate = requestedDateKey();
  const puzzle = allPuzzles.find(item => item.date === requestedDate);

  if (!puzzle) {
    throw new Error(`No playable puzzle is scheduled for ${requestedDate}.`);
  }

  VALID_FIVE_LETTER_WORDS.add(puzzle.answer);
  return puzzle;
}

function storageKeyFor(date) {
  return `globel:${date}`;
}

function storageKey() {
  return storageKeyFor(puzzleDate);
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify({
    guesses,
    results,
    gameOver,
    hintUsed
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    if (!saved || !Array.isArray(saved.guesses) || !Array.isArray(saved.results)) return;

    guesses = saved.guesses.slice(0, MAX_GUESSES);
    results = saved.results.slice(0, MAX_GUESSES);
    gameOver = Boolean(saved.gameOver);
    hintUsed = Boolean(saved.hintUsed);
  } catch {
    localStorage.removeItem(storageKey());
  }
}

function archiveState(date) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeyFor(date)));
    if (!saved) return "";
    if (saved.gameOver) return "Completed";
    if (Array.isArray(saved.guesses) && saved.guesses.length > 0) return "In progress";
  } catch {
    return "";
  }
  return "";
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

      if (letter === "ENTER" || letter === "BACK") {
        button.classList.add("wide");
      }

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

  if (hintUsed && hint) {
    hintText.textContent = hint;
    hintPanel.hidden = false;
    hintButton.textContent = "Hide Hint";
  }

  if (gameOver) {
    setMessage(guesses.includes(answer) ? "Correct." : `The word was ${answer}.`);
  }
}

function handleInput(key) {
  if (gameOver || !answer) return;

  if (key === "ENTER") {
    submitGuess();
    return;
  }

  if (key === "BACK") {
    currentGuess = currentGuess.slice(0, -1);
    updateCurrentRow();
    return;
  }

  if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key;
    setMessage("");
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
    setMessage("Enter five letters.", true);
    return;
  }

  const submittedGuess = currentGuess.toUpperCase();

  if (!VALID_FIVE_LETTER_WORDS.has(submittedGuess)) {
    setMessage("Not in the word list.", true);
    return;
  }

  const result = scoreGuess(submittedGuess, answer);
  revealGuess(submittedGuess, result);

  guesses.push(submittedGuess);
  results.push(result);
  currentGuess = "";

  const won = submittedGuess === answer;
  const lost = !won && guesses.length === MAX_GUESSES;

  if (won) {
    gameOver = true;
    setMessage("Correct.");
  } else if (lost) {
    gameOver = true;
    setMessage(`The word was ${answer}.`);
  } else {
    setMessage("");
  }

  saveState();

  if (gameOver) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => showResultModal(won));
    });
  }
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
  const current = ["absent", "present", "correct"]
    .find(className => button.classList.contains(className));

  if (!current || priority[status] > priority[current]) {
    button.classList.remove("absent", "present", "correct");
    button.classList.add(status);
  }
}

function toggleHint() {
  if (!hint) return;

  hintUsed = true;
  hintText.textContent = hint;
  hintPanel.hidden = !hintPanel.hidden;
  hintButton.textContent = hintPanel.hidden ? "Show Hint" : "Hide Hint";
  saveState();
}

function navigateToDate(date) {
  const url = new URL(window.location.href);
  url.searchParams.set("date", date);
  window.location.href = url.toString();
}

function navigateToToday() {
  const url = new URL(window.location.href);
  url.searchParams.delete("date");
  window.location.href = url.toString();
}

function dateObject(date) {
  return new Date(`${date}T12:00:00Z`);
}

function formatPuzzleDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(dateObject(date));
}

function monthKey(date) {
  return date.slice(0, 7);
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric"
  }).format(dateObject(`${monthKey(date)}-01`));
}

function buildArchive() {
  const pastPuzzles = allPuzzles
    .filter(item => item.date < todayKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  archiveList.innerHTML = "";

  if (!pastPuzzles.length) {
    const empty = document.createElement("p");
    empty.className = "archive-empty";
    empty.textContent = "No past puzzles are available yet.";
    archiveList.appendChild(empty);
    return;
  }

  const grouped = new Map();

  pastPuzzles.forEach(puzzle => {
    const key = monthKey(puzzle.date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(puzzle);
  });

  grouped.forEach(puzzles => {
    const section = document.createElement("section");
    section.className = "archive-month";

    const heading = document.createElement("h3");
    heading.textContent = monthLabel(puzzles[0].date);
    section.appendChild(heading);

    const items = document.createElement("div");
    items.className = "archive-items";

    puzzles.forEach(puzzle => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "archive-item";
      button.addEventListener("click", () => navigateToDate(puzzle.date));

      const main = document.createElement("span");
      main.className = "archive-item-main";

      const date = document.createElement("span");
      date.className = "archive-item-date";
      date.textContent = formatPuzzleDate(puzzle.date);

      const number = document.createElement("span");
      number.className = "archive-item-number";
      number.textContent = puzzle.number ? `Puzzle #${puzzle.number}` : "Globel archive";

      main.append(date, number);
      button.appendChild(main);

      const stateText = archiveState(puzzle.date);
      if (stateText) {
        const state = document.createElement("span");
        state.className = "archive-item-state";
        state.textContent = stateText;
        button.appendChild(state);
      }

      items.appendChild(button);
    });

    section.appendChild(items);
    archiveList.appendChild(section);
  });
}

function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function showResultModal(won) {
  const isArchive = puzzleDate < todayKey;
  const isPreview = puzzleDate > todayKey;

  resultTitle.textContent = won ? "Congratulations!" : "Good try!";
  resultMessage.textContent = won
    ? `You solved Globel${puzzleNumber ? ` #${puzzleNumber}` : ""} in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}.`
    : `The answer was ${answer}.`;

  if (isArchive) {
    resultFollowUp.textContent = "Choose another past puzzle or return to today’s Globel.";
    resultTodayButton.hidden = false;
  } else if (isPreview) {
    resultFollowUp.textContent = "This was a preview puzzle.";
    resultTodayButton.hidden = false;
  } else {
    resultFollowUp.textContent = "Come back tomorrow for a new Globel.";
    resultTodayButton.hidden = true;
  }

  openModal(resultModal);
  doneButton.focus();
}

function updatePuzzleLabel() {
  const formatted = formatPuzzleDate(puzzleDate);
  const number = puzzleNumber ? ` #${puzzleNumber}` : "";

  if (puzzleDate < todayKey) {
    puzzleLabel.textContent = `Archive Puzzle${number} · ${formatted}`;
  } else if (puzzleDate > todayKey) {
    puzzleLabel.textContent = `Preview Puzzle${number} · ${formatted}`;
  } else {
    puzzleLabel.textContent = puzzleNumber
      ? `Puzzle #${puzzleNumber} · ${formatted}`
      : `Daily puzzle · ${formatted}`;
  }
}

async function initialize() {
  createBoard();
  createKeyboard();
  keyboard.classList.add("disabled");
  todayKey = getCentralDateKey();

  try {
    allPuzzles = await loadPuzzleFeed();
    archiveButton.disabled = false;
    buildArchive();

    const puzzle = getRequestedPuzzle();

    answer = puzzle.answer;
    puzzleDate = puzzle.date;
    puzzleNumber = puzzle.number;
    hint = puzzle.hint;

    updatePuzzleLabel();

    const viewingToday = puzzleDate === todayKey;
    todayButton.hidden = viewingToday;

    hintButton.disabled = !hint;
    hintButton.textContent = hint ? "Show Hint" : "No Hint Available";

    loadState();
    restoreBoard();
    keyboard.classList.remove("disabled");
  } catch (error) {
    puzzleLabel.textContent = "Daily five-letter word game";
    setMessage(error.message, true);
  }
}

document.addEventListener("keydown", event => {
  const open = document.querySelector(".modal-backdrop.is-open");

  if (open) {
    if (event.key === "Escape") closeModal(open);
    return;
  }

  const key = event.key.toUpperCase();

  if (key === "ENTER") handleInput("ENTER");
  else if (key === "BACKSPACE") handleInput("BACK");
  else if (/^[A-Z]$/.test(key)) handleInput(key);
});

helpButton.addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  helpButton.setAttribute("aria-expanded", String(!helpPanel.hidden));
});

hintButton.addEventListener("click", toggleHint);

archiveButton.addEventListener("click", () => {
  buildArchive();
  openModal(archiveModal);
  closeArchiveButton.focus();
});

todayButton.addEventListener("click", navigateToToday);
resultTodayButton.addEventListener("click", navigateToToday);

closeArchiveButton.addEventListener("click", () => closeModal(archiveModal));
closeModalButton.addEventListener("click", () => closeModal(resultModal));
doneButton.addEventListener("click", () => closeModal(resultModal));

[archiveModal, resultModal].forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });
});

clearButton.addEventListener("click", () => {
  if (!puzzleDate) return;

  const confirmed = window.confirm(
    "Clear this browser’s saved progress for this puzzle?"
  );

  if (!confirmed) return;

  localStorage.removeItem(storageKey());
  window.location.reload();
});

initialize();
