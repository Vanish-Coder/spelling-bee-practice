let words = [];
let current = null;
let voice = null;

// Load words
fetch("words.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    pickWord();
  });

// Pick random word
function pickWord() {
  current = words[Math.floor(Math.random() * words.length)];
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
  utterance.rate = 0.5;
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
  } else {
    feedback.innerHTML = `❌ Incorrect. Try again!<br><strong>Correct spelling: ${current.word}</strong>`;
    feedback.style.color = "red";
  }
};

document.getElementById("next").onclick = pickWord;
