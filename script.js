let words = [];
let current = null;
let previousWord = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {}; // { word: { failures: 0, successes: 0 } }

/* ===== Sound Feedback ===== */
const clickSound = new Audio("click.wav"); // Put click.wav in same folder

/* ===== Glow Helper ===== */
function triggerGlow(btn) {
  if (!btn) return;
  btn.classList.remove("button-glow");
  void btn.offsetWidth; // Force reflow
  btn.classList.add("button-glow");
  clickSound.currentTime = 0;
  clickSound.play();
}

/* ===== Stats & Word Logic ===== */
function isEasyWord(word) {
  return word.length <= 7;
}

function loadWordStats() {
  const stored = localStorage.getItem("spellingBeeWordStats");
  wordStats = stored ? JSON.parse(stored) : {};
}

function saveWordStats() {
  localStorage.setItem("spellingBeeWordStats", JSON.stringify(wordStats));
}

function initWordStat(word) {
  if (!wordStats[word]) wordStats[word] = { failures: 0, successes: 0 };
}

function isTrulyStruggling(word) {
  const stat = wordStats[word];
  if (!stat) return false;
  if (stat.successes >= 2) return false;
  return stat.failures >= 2 || (stat.failures > 0 && stat.failures > stat.successes);
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

function manuallyAddToPractice(word) {
  initWordStat(word);
  if (wordStats[word].failures === 0 && wordStats[word].successes === 0) {
    wordStats[word].failures = 1;
    wordStats[word].successes = 0;
  }
  saveWordStats();
  updatePracticeModeLabel();
  alert(`"${word}" has been added to practice mode!`);
}

function getUniqueWordsWithFailures() {
  return Object.keys(wordStats).filter((w) => wordStats[w].failures > 0).length;
}

function getUniqueStrugglingWords() {
  return Object.keys(wordStats).filter(isTrulyStruggling).length;
}

function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

function shouldRelock() {
  return getUniqueStrugglingWords() < 10 && currentMode === "practice";
}

function getStruggleWords() {
  return words.map((w) => w.word).filter(isTrulyStruggling);
}

/* ===== Filter Words ===== */
function filterWordsByMode() {
  if (currentMode === "easy") {
    filteredWords = words.filter((w) => isEasyWord(w.word));
  } else if (currentMode === "hard") {
    filteredWords = words.filter((w) => !isEasyWord(w.word));
  } else if (currentMode === "practice") {
    if (!isPracticeModeUnlocked()) {
      currentMode = "easy";
      filteredWords = words.filter((w) => isEasyWord(w.word));
      return;
    }
    const strugglingList = getStruggleWords();
    filteredWords = words.filter((w) => strugglingList.includes(w.word));
  }
}

/* ===== Practice Mode Label ===== */
function updatePracticeModeLabel() {
  const practiceOption = document.getElementById("practiceOption");
  if (!practiceOption) return;

  const warningText = document.getElementById("practiceWarning");

  if (isPracticeModeUnlocked()) {
    practiceOption.textContent = "Practice (Unlocked)";
    practiceOption.style.fontWeight = "bold";
    practiceOption.style.color = "green";
  } else {
    practiceOption.textContent = "Practice (Locked)";
    practiceOption.style.fontWeight = "";
    practiceOption.style.color = "";
  }

  if (currentMode === "practice") {
    if (warningText) warningText.style.display = "block";
  } else {
    if (warningText) warningText.style.display = "none";
  }
}

/* ===== Pick Word ===== */
function pickWord() {
  if (filteredWords.length === 0) {
    document.getElementById("feedback").textContent =
      currentMode === "practice"
        ? getUniqueWordsWithFailures() < 15
          ? `Get 15 words wrong first to unlock Practice mode! You've got ${getUniqueWordsWithFailures()}/15.`
          : "Great job! No struggling words yet. Keep practicing!"
        : "No words available for this difficulty.";
    return;
  }

  let newWord;
  do {
    newWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  } while (filteredWords.length > 1 && newWord.word === previousWord);

  previousWord = newWord.word;
  current = newWord;
  document.getElementById("answer").value = "";
  document.getElementById("feedback").textContent = "";
}

/* ===== Text-to-Speech ===== */
function speak(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => v.lang === "en-US") || voices[0];
};

/* ===== Button & Input Events ===== */
document.getElementById("sayWord").onclick = () => speak(current.word);
document.getElementById("saySlow").onclick = () => {
  const u = new SpeechSynthesisUtterance(current.word);
  u.rate = 0.35;
  u.voice = voice;
  speechSynthesis.speak(u);
};
document.getElementById("saySentence").onclick = () => speak(current.sentence);
document.getElementById("sayDefinition").onclick = () => speak(current.definition);

document.getElementById("check").onclick = () => {
  triggerGlow(document.getElementById("check"));
  const guess = document.getElementById("answer").value.trim().toLowerCase();
  if (guess === current.word.toLowerCase()) {
    document.getElementById("feedback").textContent = "Correct!";
    document.getElementById("feedback").style.color = "green";
    recordSuccess(current.word);
  } else {
    document.getElementById("feedback").textContent = `Incorrect! The correct spelling is ${current.word}`;
    document.getElementById("feedback").style.color = "red";
    recordFailure(current.word);
  }

  updatePracticeModeLabel();

  if (shouldRelock()) {
    currentMode = "easy";
    document.getElementById("difficultyMode").value = "easy";
    filterWordsByMode();
    pickWord();
    alert(
      "Practice mode re-locked! You have fewer than 10 struggling words. Master more words to unlock it again!"
    );
    updatePracticeModeLabel();
  }
};

document.getElementById("next").onclick = () => {
  triggerGlow(document.getElementById("next"));
  pickWord();
};

document.getElementById("addToPractice").onclick = () => {
  if (current) manuallyAddToPractice(current.word);
};

document.getElementById("clearCache").onclick = () => {
  if (
    confirm(
      "Are you sure? This will delete all your progress and your unlock status."
    )
  ) {
    localStorage.removeItem("spellingBeeWordStats");
    wordStats = {};
    currentMode = "easy";
    document.getElementById("difficultyMode").value = "easy";
    filterWordsByMode();
    pickWord();
    alert("Cache cleared! Progress reset.");
  }
};

document.getElementById("difficultyMode").onchange = (e) => {
  const selected = e.target.value;
  if (selected === "practice" && !isPracticeModeUnlocked()) {
    alert(
      `Practice mode unlocks after getting 15 words wrong!\nYou've got ${getUniqueWordsWithFailures()}/15.`
    );
    e.target.value = currentMode;
    return;
  }
  currentMode = selected;
  filterWordsByMode();
  updatePracticeModeLabel();
  pickWord();
};

/* ===== Keyboard Shortcuts ===== */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("check").click();
  }
  if (e.key === "Shift") {
    e.preventDefault();
    document.getElementById("next").click();
  }
});

/* ===== Glow on all buttons (except popup) ===== */
document.querySelectorAll("button").forEach((btn) => {
  if (btn.id !== "closePopup") {
    btn.addEventListener("click", () => triggerGlow(btn));
  }
});

/* ===== Load Words ===== */
fetch("words.json")
  .then((res) => res.json())
  .then((data) => {
    words = data;
    loadWordStats();
    updatePracticeModeLabel();
    filterWordsByMode();
    pickWord();
  });
