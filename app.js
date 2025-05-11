let current = 0;
let selectedTopic = "";
let quiz = [];
let correct = 0;
let streak = 0;

// Fetch questions and populate topics
fetch('smart_questions_cleaned.json')
  .then(res => res.json())
  .then(data => {
    questions = data;
    const topics = [...new Set(data.map(q => q.topic))];
    const topicSelect = document.querySelector('.control[data-topic]');
    topics.forEach(topic => {
      const opt = document.createElement('option');
      opt.value = topic;
      opt.textContent = topic;
      topicSelect.appendChild(opt);
    });
  });

// Start Quiz
document.querySelector('.start-btn').addEventListener('click', () => {
  const topic = document.querySelector('.control[data-topic]').value;
  if (!topic || topic === '-- Select Topic --') return;
  selectedTopic = topic;
  const length = document.querySelector('.control[data-quiz-length]').value || 5;
  const filtered = questions.filter(q => q.topic === topic);
  quiz = shuffle([...filtered]).slice(0, length === 'all' ? filtered.length : parseInt(length));
  current = 0;
  correct = 0;
  streak = 0;
  document.querySelector('.quiz-card').classList.remove('hidden');
  renderQuestion();
});

// Handle Length Selection
document.querySelectorAll('.control[data-length]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.control[data-length]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Render Question
function renderQuestion() {
  const q = quiz[current];
  document.querySelector('.quiz-header strong').textContent = selectedTopic;
  document.querySelector('.question-text').textContent = q.question;
  const answersDiv = document.getElementById('answers');
  answersDiv.innerHTML = "";
  q.answers.forEach((a, i) => {
    const btn = document.createElement('div');
    btn.className = 'answer';
    btn.textContent = `${String.fromCharCode(65 + i)}. ${a}`;
    btn.addEventListener('click', () => handleAnswerClick(i === q.correct, btn));
    answersDiv.appendChild(btn);
  });
  document.querySelector('.feedback').textContent = "";
}

// Handle Answer Click
function handleAnswerClick(isCorrect, btn) {
  btn.classList.add(isCorrect ? 'correct' : 'incorrect');
  updateStreak(isCorrect); // Update streak
  updateProgress(current + 1, quiz.length); // Update progress bar

  if (isCorrect) correct++;
  setTimeout(() => {
    current++;
    if (current >= quiz.length) return showSummary();
    renderQuestion();
  }, 500);
}

// Update Streak
function updateStreak(isCorrect) {
  if (isCorrect) {
    streak++;
  } else {
    streak = 0;
  }
  document.getElementById('quizStreak').textContent = streak;
}

// Update Progress
function updateProgress(current, total) {
  const progress = Math.round((current / total) * 100);
  document.querySelector('.progress-fill').style.width = `${progress}%`;
  document.querySelector('.progress-section span:last-child').textContent = `${progress}%`;
}

// Shuffle Array
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Show Summary
function showSummary() {
  alert(`Quiz finished! You got ${correct} out of ${quiz.length} correct.`);
}