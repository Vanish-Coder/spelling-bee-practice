let words = [];
let current = null;
let previousWord = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {}; // Track {word: {failures: 0, successes: 0}}

// ===== Sound effect =====
const clickSound = new Audio("click.wav");

// ===== License Popup Logic =====
const licensePopup = document.getElementById("licensePopup");
const closePopupBtn = document.getElementById("closePopup");
const dontShowCheckbox = document.getElementById("dontShowAgain");

// Show popup if user hasn't opted out
if (!localStorage.getItem("hideLicensePopup")) {
  licensePopup.style.display = "flex";
}

// Close popup function
closePopupBtn.onclick = () => {
  triggerGlow(closePopupBtn);
  if (dontShowCheckbox.checked) {
    localStorage.setItem("hideLicensePopup", "true");
  }
  licensePopup.style.display = "none";
  clickSound.play();
};

// ===== Word Stats Storage =====
function loadWordStats() {
  const stored = localStorage.getItem('spellingBeeWordStats');
  wordStats = stored ? JSON.parse(stored) : {};
}

function saveWordStats() {
  localStorage.setItem('spellingBeeWordStats', JSON.stringify(wordStats));
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

function clearCache() {
  if (confirm("Are you sure? This will delete all your progress and your unlock status.")) {
    localStorage.removeItem('spellingBeeWordStats');
    localStorage.removeItem("hideLicensePopup");
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

// ===== Word Filtering / Practice Mode =====
function getStruggleWords() {
  return words.map(w => w.word).filter(word => isTrulyStruggling(word));
}

function getUniqueWordsWithFailures() {
  return Object.keys(wordStats).filter(word => wordStats[word].failures > 0).length;
}

function getUniqueStrugglingWords() {
  return Object.keys(wordStats).filter(word => isTrulyStruggling(word)).length;
}

function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

function shouldRelock() {
  return getUniqueStrugglingWords() < 10 && currentMode === "practice";
}

function updatePracticeModeLabel() {
  const practiceOption = document.getElementById("practiceOption");
  if (!practiceOption) return;

  const warningText = document.getElementById("practiceWarning");

  if (isPracticeModeUnlocked()) {
    practiceOption.textContent = `Practice (Unlocked)`;
    practiceOption.style.fontWeight = "bold";
    practiceOption.style.color = "green";
  } else {
    practiceOption.textContent = `Practice (Locked)`;
    practiceOption.style.color = "";
    practiceOption.style.fontWeight = "";
  }

  if (currentMode === "practice") {
    if (warningText) warningText.style.display = "block";
  } else {
    if (warningText) warningText.style.display = "none";
  }
}

function filterWordsByMode() {
  if (currentMode === "easy") {
    filteredWords = words.filter(w => w.word.length <= 7);
  } else if (currentMode === "hard") {
    filteredWords = words.filter(w => w.word.length > 7);
  } else if (currentMode === "practice") {
    if (!isPracticeModeUnlocked()) {
      currentMode = "easy";
      filteredWords = words.filter(w => w.word.length <= 7);
      return;
    }
    const strugglingList = getStruggleWords();
    filteredWords = words.filter(w => strugglingList.includes(w.word));
  }
}

// ===== Load words =====
fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    loadWordStats();
    updatePracticeModeLabel();
    filterWordsByMode();
    pickWord();
  });

// ===== Pick Word =====
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

// ===== Speech =====
function speak(text, rate = 0.85) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === "en-US") || voices[0];
}
speechSynthesis.onvoiceschanged = loadVoices;

// ===== Button Glow + Sound =====
function triggerGlow(button) {
  button.classList.add("button-glow");
  clickSound.currentTime = 0;
  clickSound.play();
  setTimeout(() => button.classList.remove("button-glow"), 300);
}

document.querySelectorAll("button").forEach((btn) => {
  if (btn.id !== "closePopup") {
    btn.addEventListener("click", () => triggerGlow(btn));
  }
});

// ===== Button Events =====
document.getElementById("sayWord").onclick = () => speak(current.word);
document.getElementById("saySlow").onclick = () => speak(current.word, 0.35);
document.getElementById("saySentence").onclick = () => speak(current.sentence);
document.getElementById("sayDefinition").onclick = () => speak(current.definition);

document.getElementById("check").onclick = () => {
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
    alert("Practice mode re-locked! You have fewer than 10 struggling words. Master more words to unlock it again!");
    updatePracticeModeLabel();
  }
};

document.getElementById("next").onclick = pickWord;
document.getElementById("addToPractice").onclick = () => current && manuallyAddToPractice(current.word);
document.getElementById("clearCache").onclick = clearCache;

// ===== Mode Selector =====
document.getElementById("difficultyMode").onchange = (e) => {
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

// ===== Keyboard Shortcuts =====
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("check").click();
    } else if (e.key === "Shift") {
      e.preventDefault();
      document.getElementById("next").click();
    }
  }
});
