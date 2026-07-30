const ANSWERS = ["PRESS", "STORY", "MEDIA", "WRITE", "PHOTO", "PRINT", "QUOTE"];
const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

let answer = "";
let currentGuess = "";
let guesses = [];
let gameOver = false;

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const resetButton = document.getElementById("resetButton");
const helpButton = document.getElementById("helpButton");
const helpPanel = document.getElementById("helpPanel");

const keyboardLayout = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACK"]
];

function startGame() {
  answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  currentGuess = "";
  guesses = [];
  gameOver = false;
  message.textContent = "";
  createBoard();
  createKeyboard();
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

function handleInput(key) {
  if (gameOver) return;

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

resetButton.addEventListener("click", startGame);
startGame();
