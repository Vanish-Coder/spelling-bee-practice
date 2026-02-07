let words = [];
let current = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {}; // Track {word: {failures: 0, successes: 0}}

// Check if word is easy difficulty (7 letters or fewer)
function isEasyWord(word) {
  return word.length <= 7;
}

// Load word statistics from localStorage
function loadWordStats() {
  const stored = localStorage.getItem('spellingBeeWordStats');
  wordStats = stored ? JSON.parse(stored) : {};
}

// Save word statistics to localStorage
function saveWordStats() {
  localStorage.setItem('spellingBeeWordStats', JSON.stringify(wordStats));
}

// Initialize word stat if not exists
function initWordStat(word) {
  if (!wordStats[word]) {
    wordStats[word] = { failures: 0, successes: 0 };
  }
}

// Check if a word is "truly struggling" (2+ failures OR more failures than successes)
function isTrulyStruggling(word) {
  const stat = wordStats[word];
  if (!stat) return false;
  return stat.failures >= 2 || (stat.failures > 0 && stat.failures > stat.successes);
}

// Record a failure for a word
function recordFailure(word) {
  initWordStat(word);
  wordStats[word].failures++;
  saveWordStats();
}

// Record a success for a word
function recordSuccess(word) {
  initWordStat(word);
  wordStats[word].successes++;
  saveWordStats();
}

// Get list of struggling words
function getStruggleWords() {
  return words
    .map(w => w.word)
    .filter(word => isTrulyStruggling(word));
}

// Count unique words with at least one attempt (success or failure)
function getUniqueWordsAttempted() {
  return Object.keys(wordStats).length;
}

// Count unique words with at least one failure
function getUniqueWordsWithFailures() {
  return Object.keys(wordStats).filter(word => wordStats[word].failures > 0).length;
}

// Check if practice mode is unlocked (15+ unique words with at least one failure)
function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

// Update practice mode label to show progress
function updatePracticeModeLabel() {
  const practiceOption = document.getElementById("practiceOption");
  if (!practiceOption) return;
  
  if (isPracticeModeUnlocked()) {
    practiceOption.textContent = "Practice (Unlocked)";
    practiceOption.style.fontWeight = "bold";
    practiceOption.style.color = "green";
  } else {
    const wrongWords = getUniqueWordsWithFailures();
    practiceOption.textContent = `Practice (${wrongWords}/15)`;
    practiceOption.style.color = "";
    practiceOption.style.fontWeight = "";
  }
}

// Filter words based on current mode
function filterWordsByMode() {
  if (currentMode === "easy") {
    filteredWords = words.filter(w => isEasyWord(w.word));
  } else if (currentMode === "hard") {
    filteredWords = words.filter(w => !isEasyWord(w.word));
  } else if (currentMode === "practice") {
    // Check if practice mode is unlocked
    if (!isPracticeModeUnlocked()) {
      currentMode = "easy"; // Fallback to easy
      filteredWords = words.filter(w => isEasyWord(w.word));
      return;
    }
    // Filter for only truly struggling words
    const strugglingList = getStruggleWords();
    filteredWords = words.filter(w => strugglingList.includes(w.word));
  }
}

// Load words
fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    loadWordStats();
    updatePracticeModeLabel();
    filterWordsByMode();
    pickWord();
  });

// Pick random word
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
  current = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  document.getElementById("answer").value = "";
  document.getElementById("feedback").textContent = "";
}

// Text-to-speech
function speak(text) {
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.voice = voice;

  speechSynthesis.speak(utterance);
}

// Load voices
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === "en-US") || voices[0];
}

speechSynthesis.onvoiceschanged = loadVoices;

// Button events
document.getElementById("sayWord").onclick = () => {
  speak(current.word);
};

document.getElementById("saySlow").onclick = () => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(current.word);
  utterance.rate = 0.35;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
};

document.getElementById("saySentence").onclick = () => {
  speak(current.sentence);
};

document.getElementById("sayDefinition").onclick = () => {
  speak(current.definition);
};

document.getElementById("check").onclick = () => {
  const guess = document.getElementById("answer").value.trim().toLowerCase();
  const correct = current.word.toLowerCase();

  const feedback = document.getElementById("feedback");
  if (guess === correct) {
    feedback.textContent = "✅ Correct!";
    feedback.style.color = "green";
    recordSuccess(current.word);
  } else {
    feedback.innerHTML = `❌ Incorrect. Try again!<br><strong>Correct spelling: ${current.word}</strong>`;
    feedback.style.color = "red";
    recordFailure(current.word);
  }
  updatePracticeModeLabel();
};

document.getElementById("next").onclick = pickWord;

// Mode selector handler
document.getElementById("difficultyMode").onchange = (e) => {
  const selectedMode = e.target.value;
  
  // Check if trying to access practice mode before unlocking
  if (selectedMode === "practice" && !isPracticeModeUnlocked()) {
    const wrongWords = getUniqueWordsWithFailures();
    alert(`Practice mode unlocks after getting 15 words wrong!\nYou've got ${wrongWords}/15.`);
    document.getElementById("difficultyMode").value = currentMode; // Revert dropdown
    return;
  }
  
  currentMode = selectedMode;
  filterWordsByMode();
  pickWord();
};
