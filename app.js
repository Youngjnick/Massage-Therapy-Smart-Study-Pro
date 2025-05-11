let current = 0;
let selectedTopic = "";
let quiz = [];
let correct = 0;
let streak = 0;

const badges = [
  { id: 'streak_10', name: 'Streak Master', description: 'Achieve a streak of 10 correct answers.', condition: () => streak >= 10 },
  { id: 'accuracy_90', name: 'Accuracy Pro', description: 'Achieve 90% accuracy in a quiz.', condition: () => (correct / quiz.length) >= 0.9 },
  { id: 'first_steps', name: 'First Steps', description: 'Answer your first question correctly.', condition: () => correct === 1 },
  { id: 'first_quiz', name: 'First Quiz', description: 'Complete your first quiz.', condition: () => quiz.length > 0 && current >= quiz.length },
];
let earnedBadges = JSON.parse(localStorage.getItem('earnedBadges')) || [];
earnedBadges = earnedBadges.filter(badgeId => badges.some(b => b.id === badgeId)); // Remove invalid IDs

// Fetch questions and populate topics
fetch('smart_questions_cleaned.json')
  .then(res => {
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  })
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
  })
  .catch(error => {
    console.error('Error fetching questions:', error);
    alert('Failed to load questions. Please try again later.');
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

  // Show feedback for incorrect answers
  const feedback = document.querySelector('.feedback');
  if (!isCorrect) {
    const correctAnswer = quiz[current].answers[quiz[current].correct];
    feedback.textContent = `Incorrect! The correct answer is: ${correctAnswer}`;
    feedback.style.color = 'red';
  } else {
    feedback.textContent = 'Correct!';
    feedback.style.color = 'green';
  }

  if (isCorrect) correct++;
  setTimeout(() => {
    current++;
    if (current >= quiz.length) return showSummary();
    renderQuestion();
  }, 1500); // Delay to allow users to see feedback
}

// Update Streak
function updateStreak(isCorrect) {
  if (isCorrect) {
    streak++;
  } else {
    streak = 0;
  }
  document.getElementById('quizStreak').textContent = streak;
  checkBadges(); // Check badges after updating streak
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
  const modal = document.createElement('div');
  modal.className = 'summary-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Quiz Summary</h2>
      <p>You got ${correct} out of ${quiz.length} correct.</p>
      <button class="close-btn">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.querySelector('.close-btn').addEventListener('click', () => {
    modal.remove();
  });
  checkBadges(); // Check badges after completing the quiz
}

// Open Modal Function
function openModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close Modal when clicking anywhere inside the modal
  modal.addEventListener('click', () => {
    modal.remove();
  });

  // Prevent closing when clicking on the modal content
  modal.querySelector('.modal').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close Modal when clicking the close button
  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });
}

// Toggle Modal Function
function toggleModal(title, content) {
  // Check if the modal already exists
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) {
    // If the modal exists, remove it (hide it)
    existingModal.remove();
    return;
  }

  // If the modal doesn't exist, create and show it
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close Modal when clicking the close button
  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });

  // Prevent closing when clicking on the modal content
  modal.querySelector('.modal').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close Modal when clicking outside the modal content
  modal.addEventListener('click', () => {
    modal.remove();
  });
}

// Smart Learning Modal
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.smart-learning a').addEventListener('click', (e) => {
    e.preventDefault();

    const badgeGrid = badges
      .map(badge => {
        const isEarned = earnedBadges.includes(badge.id);
        return `
          <div class="badge-item ${isEarned ? '' : 'unearned'}">
            <img src="badges/${badge.id}.png" alt="${badge.name}" />
            <p>${badge.name}</p>
          </div>
        `;
      })
      .join('');

    toggleModal(
      'Smart Learning',
      `
        <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
        <div class="badge-grid">
          ${badgeGrid}
        </div>
      `
    );
  });
});

// Update View Analytics Modal
document.querySelector('.view-analytics a').addEventListener('click', (e) => {
  e.preventDefault();

  const stats = {
    totalQuestions: 50,
    correctAnswers: 40,
    incorrectAnswers: 10,
    accuracy: Math.round((40 / 50) * 100), // 80%
    streak: streak,
  };

  openModal(
    'View Analytics',
    `
      <p>Track your progress, accuracy, and streaks over time to measure your improvement.</p>
      <div style="display: flex; justify-content: space-around; align-items: center;">
        <canvas id="accuracyChart" width="200" height="200"></canvas>
        <ul>
          <li><strong>Total Questions Attempted:</strong> ${stats.totalQuestions}</li>
          <li><strong>Correct Answers:</strong> ${stats.correctAnswers}</li>
          <li><strong>Incorrect Answers:</strong> ${stats.incorrectAnswers}</li>
          <li><strong>Accuracy:</strong> ${stats.accuracy}%</li>
          <li><strong>Current Streak:</strong> ${stats.streak}</li>
        </ul>
      </div>
    `
  );

  // Render the chart after the modal is opened
  renderAccuracyChart(stats.correctAnswers, stats.incorrectAnswers);
});

// Update Settings Modal
document.querySelector('.settings a').addEventListener('click', (e) => {
  e.preventDefault();
  openModal(
    'Settings',
    `
      <p>Customize your quiz experience. Adjust difficulty, topics, and more.</p>
      <form id="settingsForm">
        <label>
          Difficulty:
          <select id="difficultySelect">
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <br />
        <label>
          Enable Timer:
          <input type="checkbox" id="timerToggle" />
        </label>
        <br />
        <button type="submit">Save Settings</button>
      </form>
    `
  );

  // Add functionality to the form
  const form = document.getElementById('settingsForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const difficulty = document.getElementById('difficultySelect').value;
    const isTimerEnabled = document.getElementById('timerToggle').checked;
    console.log('Settings Saved:', { difficulty, isTimerEnabled });
    // Save settings or update app behavior
  });
});

function checkBadges() {
  badges.forEach(badge => {
    if (!earnedBadges.includes(badge.id) && badge.condition()) {
      earnedBadges.push(badge.id);
      localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
      showBadgeModal(badge); // Show a modal when a badge is earned
      console.log(`Badge earned: ${badge.name}`);
    }
  });
}

function showBadgeModal(badge) {
  openModal(
    "New Achievement Unlocked!",
    `
      <h3>${badge.name}</h3>
      <p>${badge.description}</p>
      <img src="badges/${badge.id}.png" alt="${badge.name}" style="width: 100px; height: 100px;" />
    `
  );
}

function renderAccuracyChart(correct, incorrect) {
  const ctx = document.getElementById('accuracyChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [correct, incorrect],
        backgroundColor: ['#4caf50', '#f44336'], // Green for correct, red for incorrect
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    },
  });
}

function showNotification(title, message, imageUrl) {
  // Create the notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  // Create the notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    <img src="${imageUrl}" alt="${title}" />
  `;

  // Append the notification to the container
  container.appendChild(notification);

  // Automatically remove the notification after 3.5 seconds
  setTimeout(() => {
    notification.remove();
    if (container.children.length === 0) {
      container.remove(); // Remove the container if no notifications are left
    }
  }, 3500);
}

// Example usage
showNotification(
  'Welcome!',
  'Challenge your skills with Massage Therapy Smart Study PRO!',
  'badges/welcome.png' // Replace with the path to a welcome image
);