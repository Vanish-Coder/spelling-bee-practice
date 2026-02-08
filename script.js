let words = [];
let current = null;
let previousWord = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {}; // Track {word: {failures: 0, successes: 0}}
let sfxEnabled = true;

// ---- Sound effect ----
const clickSound = new Audio("click.wav");

// ---- Check if word is easy difficulty (7 letters or fewer) ----
function isEasyWord(word) {
  return word.length <= 7;
}

// ---- Load word statistics from localStorage ----
function loadWordStats() {
  const stored = localStorage.getItem('spellingBeeWordStats');
  wordStats = stored ? JSON.parse(stored) : {};
}

// ---- Save word statistics to localStorage ----
function saveWordStats() {
  localStorage.setItem('spellingBeeWordStats', JSON.stringify(wordStats));
}

// ---- Initialize word stat if not exists ----
function initWordStat(word) {
  if (!wordStats[word]) {
    wordStats[word] = { failures: 0, successes: 0 };
  }
}

// ---- Check if a word is "truly struggling" ----
function isTrulyStruggling(word) {
  const stat = wordStats[word];
  if (!stat) return false;
  if (stat.successes >= 2) return false; // mastered
  return stat.failures >= 2 || (stat.failures > 0 && stat.failures > stat.successes);
}

// ---- Record a failure for a word ----
function recordFailure(word) {
  initWordStat(word);
  wordStats[word].failures++;
  saveWordStats();
}

// ---- Record a success for a word ----
function recordSuccess(word) {
  initWordStat(word);
  wordStats[word].successes++;
  saveWordStats();
}

// ---- Manually add a word to practice ----
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

// ---- Clear all cached data ----
function clearCache() {
  if (confirm("Are you sure? This will delete all your progress and unlock status.")) {
    localStorage.removeItem('spellingBeeWordStats');
    localStorage.removeItem('hideLicensePopup');
    wordStats = {};
    currentMode = "easy";
    previousWord = null;
    document.getElementById("difficultyMode").value = "easy";
    filterWordsByMode();
    updatePracticeModeLabel();
    pickWord();
    alert("Cache cleared! Your progress has been reset.");
  }
}

// ---- Get struggling words ----
function getStruggleWords() {
  return words
    .map(w => w.word)
    .filter(word => isTrulyStruggling(word));
}

// ---- Count words attempted ----
function getUniqueWordsAttempted() {
  return Object.keys(wordStats).length;
}

// ---- Count words with failures ----
function getUniqueWordsWithFailures() {
  return Object.keys(wordStats).filter(word => wordStats[word].failures > 0).length;
}

// ---- Count unique struggling words ----
function getUniqueStrugglingWords() {
  return Object.keys(wordStats).filter(word => isTrulyStruggling(word)).length;
}

// ---- Check if practice mode unlocked ----
function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

// ---- Check if practice mode should relock ----
function shouldRelock() {
  return getUniqueStrugglingWords() < 10 && currentMode === "practice";
}

// ---- Update practice mode label ----
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
    practiceOption.style.color = "";
    practiceOption.style.fontWeight = "";
  }

  if (currentMode === "practice") {
    if (warningText) warningText.style.display = "block";
  } else {
    if (warningText) warningText.style.display = "none";
  }
}

// ---- Filter words by mode ----
function filterWordsByMode() {
  if (currentMode === "easy") {
    filteredWords = words.filter(w => isEasyWord(w.word));
  } else if (currentMode === "hard") {
    filteredWords = words.filter(w => !isEasyWord(w.word));
  } else if (currentMode === "practice") {
    if (!isPracticeModeUnlocked()) {
      currentMode = "easy";
      filteredWords = words.filter(w => isEasyWord(w.word));
      return;
    }
    const strugglingList = getStruggleWords();
    filteredWords = words.filter(w => strugglingList.includes(w.word));
  }
}

// ---- Load words ----
fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    loadWordStats();
    updatePracticeModeLabel();
    filterWordsByMode();
    pickWord();
  });

// ---- Pick a random word ----
function pickWord() {
  if (filteredWords.length === 0) {
    if (currentMode === "practice") {
      const wrongWords = getUniqueWordsWithFailures();
      if (wrongWords < 15) {
        document.getElementById("feedback").textContent = `Get 15 words wrong first to unlock Practice mode! You've got ${wrongWords}/15.`;
      } else {
        document.getElementById("feedback").textContent = "Great job! No struggling words yet. Keep practicing!";
      }
    } else {
      document.getElementById("feedback").textContent = "No words available for this difficulty.";
    }
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

// ---- Text-to-speech ----
function speak(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// ---- Load voices ----
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === "en-US") || voices[0];
}
speechSynthesis.onvoiceschanged = loadVoices;

// ---- Button events ----
function addGlow(btn) {
  btn.classList.add("glow");
  setTimeout(() => btn.classList.remove("glow"), 250);
}

document.getElementById("sayWord").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("sayWord"));
  speak(current.word);
};

document.getElementById("saySlow").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("saySlow"));
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(current.word);
  utterance.rate = 0.35;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
};

document.getElementById("saySentence").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("saySentence"));
  speak(current.sentence);
};

document.getElementById("sayDefinition").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("sayDefinition"));
  speak(current.definition);
};

document.getElementById("check").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("check"));
  const guess = document.getElementById("answer").value.trim().toLowerCase();
  const correct = current.word.toLowerCase();
  const feedback = document.getElementById("feedback");
  if (guess === correct) {
    feedback.textContent = "Correct!";
    feedback.style.color = "green";
    recordSuccess(current.word);
  } else {
    feedback.textContent = `Incorrect! The correct spelling is ${current.word}`;
    feedback.style.color = "red";
    recordFailure(current.word);
  }
  updatePracticeModeLabel();

  if (shouldRelock()) {
    currentMode = "easy";
    document.getElementById("difficultyMode").value = "easy";
    filterWordsByMode();
    pickWord();
    alert("Practice mode re-locked! You have fewer than 10 struggling words.");
    updatePracticeModeLabel();
  }
};

document.getElementById("next").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("next"));
  pickWord();
};

document.getElementById("addToPractice").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("addToPractice"));
  if (current) manuallyAddToPractice(current.word);
};

document.getElementById("clearCache").onclick = () => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("clearCache"));
  clearCache();
};

// ---- Difficulty selector ----
document.getElementById("difficultyMode").onchange = (e) => {
  if (sfxEnabled) clickSound.play();
  addGlow(document.getElementById("difficultyMode"));
  const selectedMode = e.target.value;
  if (selectedMode === "practice" && !isPracticeModeUnlocked()) {
    const wrongWords = getUniqueWordsWithFailures();
    alert(`Practice mode unlocks after getting 15 words wrong!\nYou've got ${wrongWords}/15.`);
    document.getElementById("difficultyMode").value = currentMode;
    return;
  }
  currentMode = selectedMode;
  filterWordsByMode();
  updatePracticeModeLabel();
  pickWord();
};

// ---- Keyboard shortcuts ----
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("check").click();
  } else if (e.key === "Shift") {
    e.preventDefault();
    document.getElementById("next").click();
  }
});

// ---- License popup ----
const licensePopup = document.getElementById("licensePopup");
const closePopup = document.getElementById("closePopup");
const dontShowAgain = document.getElementById("dontShowAgain");

function showPopup() {
  if (!localStorage.getItem("hideLicensePopup")) {
    licensePopup.style.display = "flex";
  }
}

closePopup.onclick = () => {
  if (dontShowAgain.checked) {
    localStorage.setItem("hideLicensePopup", "true");
  }
  licensePopup.style.display = "none";
};

// Show popup on load
window.addEventListener("load", showPopup);
