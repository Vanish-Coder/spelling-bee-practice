let words = [];
let current = null;
let previousWord = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {};

/* ===== Sound Feedback ===== */
const clickSound = new Audio(
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
);

/* ===== Glow Helper ===== */
function triggerGlow(btn) {
  if (!btn) return;
  btn.classList.remove("button-glow");
  void btn.offsetWidth;
  btn.classList.add("button-glow");
  clickSound.currentTime = 0;
  clickSound.play();
}

/* ===== Difficulty Logic ===== */
function isEasyWord(word) {
  return word.length <= 7;
}

function loadWordStats() {
  wordStats = JSON.parse(localStorage.getItem("spellingBeeWordStats")) || {};
}

function saveWordStats() {
  localStorage.setItem("spellingBeeWordStats", JSON.stringify(wordStats));
}

function initWordStat(word) {
  if (!wordStats[word]) wordStats[word] = { failures: 0, successes: 0 };
}

function isTrulyStruggling(word) {
  const s = wordStats[word];
  if (!s) return false;
  if (s.successes >= 2) return false;
  return s.failures >= 2 || s.failures > s.successes;
}

function recordFailure(word) {
  initWordStat(word);
  wordStats[word].failures++;
  saveWordStats();
}

function recordSuccess(word) {
  initWordStat(word);
  wordStats[word].successes++;
  saveWordStats();
}

function getUniqueWordsWithFailures() {
  return Object.values(wordStats).filter(s => s.failures > 0).length;
}

function getUniqueStrugglingWords() {
  return Object.keys(wordStats).filter(isTrulyStruggling).length;
}

function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

/* ===== Words ===== */
fetch("words.json")
  .then(r => r.json())
  .then(data => {
    words = data;
    loadWordStats();
    filterWordsByMode();
    pickWord();
  });

function filterWordsByMode() {
  if (currentMode === "easy")
    filteredWords = words.filter(w => isEasyWord(w.word));
  else if (currentMode === "hard")
    filteredWords = words.filter(w => !isEasyWord(w.word));
  else
    filteredWords = words.filter(w => isTrulyStruggling(w.word));
}

function pickWord() {
  if (!filteredWords.length) return;
  let w;
  do {
    w = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  } while (filteredWords.length > 1 && w.word === previousWord);
  previousWord = w.word;
  current = w;
  answer.value = "";
  feedback.textContent = "";
}

/* ===== Speech ===== */
function speak(text) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.voice = voice;
  speechSynthesis.speak(u);
}

speechSynthesis.onvoiceschanged = () => {
  voice = speechSynthesis.getVoices().find(v => v.lang === "en-US");
};

/* ===== Buttons ===== */
sayWord.onclick = () => speak(current.word);
saySlow.onclick = () => speak(current.word);
saySentence.onclick = () => speak(current.sentence);
sayDefinition.onclick = () => speak(current.definition);

check.onclick = () => {
  triggerGlow(check);
  const guess = answer.value.trim().toLowerCase();
  if (guess === current.word.toLowerCase()) {
    feedback.textContent = "✅ Correct!";
    feedback.style.color = "green";
    recordSuccess(current.word);
  } else {
    feedback.innerHTML = `❌ Incorrect<br><strong>${current.word}</strong>`;
    feedback.style.color = "red";
    recordFailure(current.word);
  }
};

next.onclick = () => {
  triggerGlow(next);
  pickWord();
};

/* ===== Keyboard Shortcuts ===== */
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    check.click();
  }
  if (e.key === "Shift") {
    e.preventDefault();
    next.click();
  }
});

/* ===== Mouse Glow ===== */
document.querySelectorAll("button").forEach(b => {
  if (b.id !== "closePopup") {
    b.addEventListener("click", () => triggerGlow(b));
  }
});
