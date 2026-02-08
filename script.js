let words = [];
let current = null;
let previousWord = null;
let voice = null;
let currentMode = "easy";
let filteredWords = [];
let wordStats = {}; // Track {word: {failures: 0, successes: 0}}

// ---- SFX Feature ----
let sfxEnabled = true;
const clickSound = new Audio('click.wav');
function playClick() {
  if (sfxEnabled) clickSound.play();
}

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
// BUT if user got it right 2+ times, they've mastered it
function isTrulyStruggling(word) {
  const stat = wordStats[word];
  if (!stat) return false;
  
  // If user got it right twice, they've mastered it - remove from practice
  if (stat.successes >= 2) return false;
  
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

// Manually add a word to practice (0 successes, 1 failure)
function manuallyAddToPractice(word) {
  initWordStat(word);
  // Only set to 0 successes and 1 failure if not already tracked
  if (wordStats[word].failures === 0 && wordStats[word].successes === 0) {
    wordStats[word].failures = 1;
    wordStats[word].successes = 0;
  }
  saveWordStats();
  updatePracticeModeLabel();
  playClick();
  alert(`"${word}" has been added to practice mode!`);
}

// Clear all cached data from localStorage
function clearCache() {
  playClick();
  if (confirm("Are you sure? This will delete all your progress and your unlock status.")) {
    localStorage.removeItem('spellingBeeWordStats');
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

// Count unique struggling words (for practice mode)
function getUniqueStrugglingWords() {
  return Object.keys(wordStats).filter(word => isTrulyStruggling(word));
}

// Check if practice mode is unlocked (15+ unique words with at least one failure)
function isPracticeModeUnlocked() {
  return getUniqueWordsWithFailures() >= 15;
}

// Check if practice mode should be re-locked (fewer than 10 struggling words)
function shouldRelock() {
  return getUniqueStrugglingWords() < 10 && currentMode === "practice";
}

// Update practice mode label and UI elements
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
  
  // Show/hide practice warning based on current mode
  if (currentMode === "practice") {
    if (warningText) warningText.style.display = "block";
  } else {
    if (warningText) warningText.style.display = "none";
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

// Pick random word (avoiding same word twice in a row)
function pickWord() {
  if (filteredWords.length === 0) {
    const feedback = document.getElementById("feedback");
    if (currentMode === "practice") {
      const wrongWords = getUniqueWordsWithFailures();
      if (wrongWords < 15) {
        feedback.textContent = `Get 15 words wrong first to unlock Practice mode! You've got ${wrongWords}/15.`;
      } else {
        feedback.textContent = "Great job! No struggling words yet. Keep practicing!";
      }
    } else {
      document.getElementById("feedback").textContent = "No words available for this difficulty.";
    }
    return;
  }
  
  // Keep picking until we get a different word from the previous one
  let newWord;
  do {
    newWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  } while (filteredWords.length > 1 && newWord.word === previousWord);
  
  previousWord = newWord.word;
  current = newWord;
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
  playClick();
  speak(current.word);
};

document.getElementById("saySlow").onclick = () => {
  playClick();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(current.word);
  utterance.rate = 0.35;
  utterance.voice = voice;
  speechSynthesis.speak(utterance);
};

document.getElementById("saySentence").onclick = () => {
  playClick();
  speak(current.sentence);
};

document.getElementById("sayDefinition").onclick = () => {
  playClick();
  speak(current.definition);
};

document.getElementById("check").onclick = () => {
  playClick();
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
  
  // Check if practice mode should be re-locked
  if (shouldRelock()) {
    currentMode = "easy";
    document.getElementById("difficultyMode").value = "easy";
    filterWordsByMode();
    pickWord();
    alert("Practice mode re-locked! You have fewer than 10 struggling words. Master more words to unlock it again!");
    updatePracticeModeLabel();
  }
};

document.getElementById("next").onclick = () => { playClick(); pickWord(); };

// Add current word to practice manually
document.getElementById("addToPractice").onclick = () => {
  playClick();
  if (current) {
    manuallyAddToPractice(current.word);
  }
};

// Clear cache button
document.getElementById("clearCache").onclick = clearCache;

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
  updatePracticeModeLabel();
  pickWord();
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("check").click(); }
  else if (e.key === "Shift") { e.preventDefault(); document.getElementById("next").click(); }
});

// SFX Toggle
document.getElementById('toggleSFX').onclick = () => {
  sfxEnabled = !sfxEnabled;
  document.getElementById('toggleSFX').textContent = `SFX: ${sfxEnabled ? 'On' : 'Off'}`;
};
