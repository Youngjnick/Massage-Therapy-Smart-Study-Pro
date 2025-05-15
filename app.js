// ===============================
// Massage Therapy Smart Study PRO
// Main App Logic
// ===============================

// --- GLOBAL STATE & BADGES ---
let current = 0;
let selectedTopic = "";
let quiz = [];
let correct = 0;
let streak = 0;
let missedQuestions = [];
let unansweredQuestions = [];
let bookmarkedQuestions = [];
let questions = [];
let historyChart;
let accuracyChart;

/**
 * @typedef {Object} Badge
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {() => boolean} condition
 */

/** @type {Badge[]} */
const badges = [
  { id: "streak_10", name: "Streak Master", description: "Achieve a streak of 10 correct answers.", condition: () => streak >= 10 },
  { id: "accuracy_90", name: "Accuracy Pro", description: "Achieve 90% accuracy in a quiz.", condition: () => (correct / quiz.length) >= 0.9 },
  { id: "first_steps", name: "First Steps", description: "Answer your first question correctly.", condition: () => correct === 1 },
  { id: "first_quiz", name: "First Quiz", description: "Complete your first quiz.", condition: () => quiz.length > 0 && current >= quiz.length },
];
let earnedBadges = JSON.parse(localStorage.getItem("earnedBadges")) || [];
earnedBadges = earnedBadges.filter(badgeId => badges.some(b => b.id === badgeId));

// --- UTILITY FUNCTIONS ---
function shuffle(array) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

function formatTitle(filename) {
  return filename.replace(/_/g, ' ').replace(/\.json$/i, '').replace(/\b\w/g, c => c.toUpperCase());
}

// --- QUESTION LOADING & INITIALIZATION ---
function loadQuestions() {
  const cachedQuestions = localStorage.getItem("questions");
  try {
    if (cachedQuestions) {
      questions = JSON.parse(cachedQuestions);
      const bookmarks = JSON.parse(localStorage.getItem("bookmarkedQuestions")) || [];
      questions.forEach(q => { q.bookmarked = bookmarks.includes(q.id); });
      unansweredQuestions = [...questions];
      loadUserData();
      updateTopicDropdown(questions);
      document.querySelector(".start-btn").disabled = false;
      document.getElementById("loading").style.display = "none";
      preloadImages(questions);
      bookmarkedQuestions = getBookmarkedQuestions(questions);
    } else {
      loadAllQuestionModules();
    }
  } catch (err) {
    localStorage.removeItem("questions");
    loadAllQuestionModules();
  }
}

function updateTopicDropdown(questionsArr) {
  const topics = [...new Set(questionsArr.map((q) => q.topic))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const topicSelect = document.querySelector(".control[data-topic]");
  if (!topicSelect) return;
  topicSelect.innerHTML = `
    <option value="" disabled selected>-- Select Topic --</option>
    <option value="unanswered">Unanswered Questions</option>
    <option value="missed">Missed Questions</option>
    <option value="bookmarked">Bookmarked Questions</option>
  `;
  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = formatTitle(topic);
    topicSelect.appendChild(option);
  });
}

function preloadImages(questionsArr) {
  questionsArr.forEach(q => {
    if (q.image) {
      const img = new Image();
      img.src = q.image;
    }
  });
}

// --- EVENT LISTENERS & UI SETUP ---
document.addEventListener("DOMContentLoaded", () => {
  loadQuestions();
  setupUI();
  populateTopicDropdown();
  showNotification(
    "Welcome!",
    "Challenge your skills with Massage Therapy Smart Study PRO!",
    "badges/welcome.png"
  );
  renderChartsOnLoad();
});

function setupUI() {
  const topicSelect = document.querySelector(".control[data-topic]");
  const lengthSelect = document.querySelector(".control[data-quiz-length]");
  const startBtn = document.querySelector(".start-btn");

  function updateStartBtn() {
    startBtn.disabled = !(topicSelect.value && lengthSelect.value);
  }
  topicSelect.addEventListener("change", () => {
    selectedTopic = topicSelect.value;
    updateStartBtn();
  });
  lengthSelect.addEventListener("change", updateStartBtn);

  startBtn.addEventListener("click", startQuiz);

  // Modal links
  document.querySelectorAll(".smart-learning a, .smart-learning-link").forEach(link =>
    link.addEventListener("click", showSmartLearningModal)
  );
  document.querySelectorAll(".view-analytics a, .analytics-link").forEach(link =>
    link.addEventListener("click", showAnalyticsModal)
  );
  document.querySelectorAll(".settings a, .settings-link").forEach(link =>
    link.addEventListener("click", showSettingsModal)
  );
}

// --- QUIZ LOGIC ---
async function startQuiz() {
  const topicSelect = document.querySelector(".control[data-topic]");
  const lengthSelect = document.querySelector(".control[data-quiz-length]");
  const topic = topicSelect.value;
  const length = lengthSelect.value === "all" ? 9999 : parseInt(lengthSelect.value, 10);

  if (topic && topic.match(/\.json$/i)) {
    try {
      const res = await fetch(topic);
      const data = await res.json();
      quiz = shuffle([...data]).slice(0, length);
      current = 0; correct = 0; streak = 0;
      selectedTopic = formatTitle(topic.split('/').pop());
      document.querySelector(".quiz-card").classList.remove("hidden");
      renderQuestion();
      return;
    } catch {
      showNotification("Error", "Failed to load questions from file.", "badges/summary.png");
      return;
    }
  }

  let quizPool = [];
  if (topic === "unanswered") quizPool = unansweredQuestions;
  else if (topic === "missed") quizPool = missedQuestions.map(id => questions.find(q => q.id === id)).filter(Boolean);
  else if (topic === "bookmarked") quizPool = bookmarkedQuestions;
  else quizPool = questions.filter(q => q.topic === topic);

  quiz = shuffle([...quizPool]).slice(0, length);
  current = 0; correct = 0; streak = 0;
  document.querySelector(".quiz-card").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion() {
  if (!quiz || quiz.length === 0) {
    document.querySelector(".quiz-card").innerHTML = "<p>No missed questions to review!</p>";
    return;
  }
  const q = quiz[current];
  if (!q) {
    document.querySelector(".quiz-card").classList.add("hidden");
    return;
  }

  // Shuffle answers and track correct index
  const answerObjs = q.answers.map((a, i) => ({
    text: a,
    isCorrect: i === q.correct
  }));
  shuffle(answerObjs);

  // Header row with topic, streak, and bookmark
  renderQuizHeader(q);

  document.querySelector(".quiz-header strong").textContent = selectedTopic;
  document.querySelector(".question-text").textContent = q.question;
  renderAnswers(answerObjs);
  document.querySelector(".feedback").textContent = "";

  // Remove old action button containers if present
  document.querySelector(".quiz-card").querySelectorAll(".question-actions").forEach(el => el.remove());

  // Render actions (suggest, report, flag, rate)
  renderQuestionActions(q);
}

function renderQuizHeader(q) {
  const quizHeader = document.querySelector(".quiz-header");
  quizHeader.querySelector(".quiz-header-row")?.remove();

  const headerRow = document.createElement("div");
  headerRow.className = "quiz-header-row";
  headerRow.innerHTML = `
    <div class="topic-streak">
      <span>TOPIC: <strong>${selectedTopic}</strong></span>
      <span style="margin-left: 16px;">Streak: <span id="quizStreak">${streak}</span></span>
    </div>
  `;

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "bookmark-btn";
  bookmarkBtn.textContent = q.bookmarked ? "Unbookmark" : "Bookmark";
  bookmarkBtn.setAttribute("aria-label", q.bookmarked ? "Unbookmark this question" : "Bookmark this question");
  bookmarkBtn.addEventListener("click", () => {
    q.bookmarked = !q.bookmarked;
    bookmarkBtn.textContent = q.bookmarked ? "Unbookmark" : "Bookmark";
    toggleBookmark(q.id);
    bookmarkedQuestions = getBookmarkedQuestions(questions);
  });

  headerRow.appendChild(bookmarkBtn);
  quizHeader.appendChild(headerRow);
}

function renderAnswers(answerObjs) {
  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";
  answerObjs.forEach((ansObj, i) => {
    const btn = document.createElement("div");
    btn.className = "answer";
    btn.textContent = `${String.fromCharCode(65 + i)}. ${ansObj.text}`;
    btn.setAttribute("aria-label", `Answer ${String.fromCharCode(65 + i)}: ${ansObj.text}`);
    btn.tabIndex = 0;
    btn.addEventListener("click", () => handleAnswerClick(ansObj.isCorrect, btn));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") handleAnswerClick(ansObj.isCorrect, btn);
    });
    answersDiv.appendChild(btn);
  });
}

function renderQuestionActions(q) {
  const quizCard = document.querySelector(".quiz-card");
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "question-actions";
  actionsDiv.setAttribute("role", "group");
  actionsDiv.setAttribute("aria-label", "Question actions");

  // Suggest, Report, Flag, Rate
  actionsDiv.appendChild(createSuggestBtn());
  actionsDiv.appendChild(createReportBtn());
  actionsDiv.appendChild(createFlagBtn());
  actionsDiv.appendChild(createRateDiv(q.id));

  quizCard.appendChild(actionsDiv);
}

function createSuggestBtn() {
  const btn = document.createElement("button");
  btn.textContent = "Suggest a Question";
  btn.className = "suggest-btn";
  btn.addEventListener("click", () => {
    openModal("Suggest a Question", `
      <form id="suggestForm">
        <label>Question:<br><input type="text" id="suggestQ" required></label><br>
        <label>Answer A:<br><input type="text" id="suggestA" required></label><br>
        <label>Answer B:<br><input type="text" id="suggestB" required></label><br>
        <label>Answer C:<br><input type="text" id="suggestC"></label><br>
        <label>Answer D:<br><input type="text" id="suggestD"></label><br>
        <label>Correct Answer (A/B/C/D):<br><input type="text" id="suggestCorrect" required maxlength="1"></label><br>
        <label>Topic:<br><input type="text" id="suggestTopic" required></label><br>
        <button type="submit">Submit</button>
      </form>
    `);
    document.getElementById("suggestForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const suggestion = {
        question: document.getElementById("suggestQ").value,
        answers: [
          document.getElementById("suggestA").value,
          document.getElementById("suggestB").value,
          document.getElementById("suggestC").value,
          document.getElementById("suggestD").value,
        ].filter(Boolean),
        correct: ["A","B","C","D"].indexOf(document.getElementById("suggestCorrect").value.toUpperCase()),
        topic: document.getElementById("suggestTopic").value,
        submittedAt: new Date().toISOString()
      };
      await submitSuggestionToFirestore(suggestion);
      showNotification("Thank you!", "Your suggestion has been submitted.", "badges/summary.png");
      document.querySelector(".modal-overlay").remove();
    });
  });
  return btn;
}

function createReportBtn() {
  const btn = document.createElement("button");
  btn.textContent = "Report Question";
  btn.className = "report-btn";
  btn.addEventListener("click", () => {
    openModal("Report Question", `
      <form id="reportForm">
        <p>Why are you reporting this question?</p>
        <textarea id="reportReason" required style="width:100%;height:60px;"></textarea><br>
        <button type="submit">Submit Report</button>
      </form>
    `);
    document.getElementById("reportForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const report = {
        questionId: quiz[current].id,
        question: quiz[current].question,
        reason: document.getElementById("reportReason").value,
        reportedAt: new Date().toISOString()
      };
      await submitReportToFirestore(report);
      showNotification("Thank you!", "Your report has been submitted.", "badges/summary.png");
      document.querySelector(".modal-overlay").remove();
    });
  });
  return btn;
}

function createFlagBtn() {
  const btn = document.createElement("button");
  btn.textContent = "Flag as Unclear";
  btn.className = "flag-unclear-btn";
  btn.addEventListener("click", async () => {
    const qid = quiz[current].id;
    let unclearFlags = JSON.parse(localStorage.getItem("unclearFlags") || "{}");
    unclearFlags[qid] = (unclearFlags[qid] || 0) + 1;
    localStorage.setItem("unclearFlags", JSON.stringify(unclearFlags));
    showNotification("Thank you!", "This question has been flagged as unclear.", "badges/summary.png");
  });
  return btn;
}

function createRateDiv(qid) {
  const rateDiv = document.createElement("div");
  rateDiv.className = "rate-question";
  rateDiv.innerHTML = `
    <span>Rate: </span>
    ${[1, 2, 3, 4, 5].map(n =>
      `<span class="star" data-star="${n}" style="cursor:pointer;font-size:1.2em;color:#ccc;">&#9734;</span>`
    ).join("")}
  `;
  const stars = rateDiv.querySelectorAll(".star");
  const ratings = JSON.parse(localStorage.getItem("questionRatings") || "{}");
  const savedRating = ratings[qid] || 0;
  stars.forEach((star, index) => {
    star.style.color = index < savedRating ? "gold" : "#ccc";
    star.addEventListener("click", () => {
      stars.forEach((s, i) => s.style.color = i <= index ? "gold" : "#ccc");
      const rating = index + 1;
      ratings[qid] = rating;
      localStorage.setItem("questionRatings", JSON.stringify(ratings));
      showNotification("Thank you!", `You rated this question ${rating} stars.`, "badges/summary.png");
    });
    star.addEventListener("mouseover", () => {
      stars.forEach((s, i) => s.style.color = i <= index ? "gold" : "#ccc");
    });
    star.addEventListener("mouseout", () => {
      stars.forEach((s, i) => s.style.color = i < savedRating ? "gold" : "#ccc");
    });
  });
  return rateDiv;
}

function handleAnswerClick(isCorrect, btn) {
  if (!quiz[current]) return;
  btn.classList.add(isCorrect ? "correct" : "incorrect");
  updateStreak(isCorrect);
  updateProgress(current + 1, quiz.length);

  const feedback = document.querySelector(".feedback");
  const qid = quiz[current].id;

  if (!isCorrect) {
    const correctAnswer = quiz[current].answers[quiz[current].correct];
    feedback.textContent = `Incorrect! The correct answer is: ${correctAnswer}`;
    feedback.style.color = "red";
    if (!missedQuestions.includes(qid)) {
      missedQuestions.push(qid);
      saveUserData();
    }
    quiz[current].stats = quiz[current].stats || { correct: 0, incorrect: 0 };
    quiz[current].stats.incorrect++;
    localStorage.setItem("review_" + qid, JSON.stringify({
      lastMissed: Date.now(),
      interval: 24 * 60 * 60 * 1000
    }));
  } else {
    feedback.textContent = "Correct!";
    feedback.style.color = "green";
    missedQuestions = missedQuestions.filter(id => id !== qid);
    saveUserData();
    quiz[current].stats = quiz[current].stats || { correct: 0, incorrect: 0 };
    quiz[current].stats.correct++;
  }
  const explanation = quiz[current].explanation || "";
  feedback.innerHTML += explanation ? `<br><em>${explanation}</em>` : "";
  if (isCorrect) correct++;
  unansweredQuestions = unansweredQuestions.filter(q => q.id !== qid);

  setTimeout(() => {
    current++;
    if (current >= quiz.length) {
      showSummary();
      return;
    }
    renderQuestion();
    renderAccuracyChart(correct, current - correct, quiz.length - current);
  }, 1500);
}

function updateStreak(isCorrect) {
  streak = isCorrect ? streak + 1 : 0;
  document.getElementById("quizStreak").textContent = streak;
  checkBadges();
}

function updateProgress(current, total) {
  const progress = Math.round((current / total) * 100);
  document.querySelector(".progress-fill").style.width = `${progress}%`;
  document.querySelector(".progress-section span:last-child").textContent = `${progress}%`;
}

function showSummary() {
  const accuracy = quiz.length > 0 ? Math.round((correct / quiz.length) * 100) : 0;
  showNotification("Quiz Summary", `You answered ${correct} out of ${quiz.length} questions correctly (${accuracy}% accuracy).`, "badges/summary.png");
  checkBadges();
  if (missedQuestions.length > 0) showReviewMissedBtn();
  if (getSmartReviewQuestions().length > 0) showSmartReviewBtn();
  saveQuizResult();
}

function showReviewMissedBtn() {
  const reviewBtn = document.createElement("button");
  reviewBtn.textContent = "Review Missed Questions";
  reviewBtn.className = "modal-btn";
  reviewBtn.onclick = () => {
    quiz = questions.filter(q => missedQuestions.includes(q.id));
    current = 0; correct = 0; streak = 0;
    document.querySelector(".quiz-card").classList.remove("hidden");
    renderQuestion();
    document.querySelector(".notification-container")?.remove();
  };
  setTimeout(() => {
    document.body.appendChild(reviewBtn);
    setTimeout(() => reviewBtn.remove(), 5000);
  }, 500);
}

function showSmartReviewBtn() {
  const smartReviewBtn = document.createElement("button");
  smartReviewBtn.textContent = "Smart Review Questions";
  smartReviewBtn.className = "modal-btn";
  smartReviewBtn.onclick = () => {
    quiz = getSmartReviewQuestions();
    current = 0; correct = 0; streak = 0;
    document.querySelector(".quiz-card").classList.remove("hidden");
    renderQuestion();
    document.querySelector(".notification-container")?.remove();
  };
  setTimeout(() => {
    document.body.appendChild(smartReviewBtn);
    setTimeout(() => smartReviewBtn.remove(), 5000);
  }, 500);
}

// --- MODALS ---
function openModal(title, content, toggle = false) {
  const existingModal = document.querySelector(".modal-overlay");
  if (toggle && existingModal) {
    existingModal.remove();
    return;
  }
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", title);
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", () => modal.remove());
  modal.querySelector(".modal").addEventListener("click", (e) => e.stopPropagation());
  modal.querySelector(".close-modal").setAttribute("aria-label", "Close modal");
  document.addEventListener("keydown", function escListener(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escListener);
    }
  });
  setTimeout(() => document.querySelector('.modal').scrollTop = 0, 0);
}

function showSmartLearningModal(e) {
  e.preventDefault();
  openModal("Smart Learning", `
    <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
    <div class="badge-grid">
      ${badges.map(badge => `
        <div class="badge-item ${earnedBadges.includes(badge.id) ? "" : "unearned"}">
          <img src="badges/${badge.id}.png" alt="${badge.name}" />
          <p>${badge.name}</p>
        </div>
      `).join("")}
    </div>
  `, true);
}

function showAnalyticsModal(e) {
  e.preventDefault();
  const totalQuestions = quiz.length;
  const unansweredQuestionsCount = totalQuestions - current;
  const incorrectAnswers = current - correct;
  const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const stats = { totalQuestions, correctAnswers: correct, incorrectAnswers, unansweredQuestions: unansweredQuestionsCount, accuracy, streak };
  const topicStats = getTopicMastery();
  const masteryHtml = Object.entries(topicStats).map(([topic, stat]) => {
    const acc = stat.total ? stat.correct / stat.total : 0;
    return `<li style="background:${masteryColor(acc)};padding:4px 8px;border-radius:4px;margin:2px 0;">
      <strong>${topic}:</strong> ${(acc*100).toFixed(0)}% mastery
    </li>`;
  }).join("");
  openModal("View Analytics", `
    <p>Track your progress, accuracy, and streaks over time to measure your improvement.</p>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
      <canvas id="accuracyChart" width="200" height="200"></canvas>
      <ul style="list-style: none; padding: 0; text-align: left;">
        <li><strong>Total Questions Attempted:</strong> ${stats.totalQuestions}</li>
        <li><strong>Correct Answers:</strong> ${stats.correctAnswers}</li>
        <li><strong>Incorrect Answers:</strong> ${stats.incorrectAnswers}</li>
        <li><strong>Unanswered Questions:</strong> ${stats.unansweredQuestions}</li>
        <li><strong>Accuracy:</strong> ${stats.accuracy}%</li>
        <li><strong>Current Streak:</strong> ${stats.streak}</li>
      </ul>
      <h4 style="margin-top:16px;">Mastery by Topic</h4>
      <ul style="margin-top:0">${masteryHtml}</ul>
      <h4 style="margin-top:16px;">Quiz History</h4>
      <canvas id="historyChart" width="300" height="120"></canvas>
    </div>
  `);
  setTimeout(() => {
    renderAccuracyChart(stats.correctAnswers, stats.incorrectAnswers, stats.unansweredQuestions);
    renderHistoryChart();
  }, 0);
}

function showSettingsModal(e) {
  e.preventDefault();
  openModal("Settings", `
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
      <label>
        <input type="checkbox" id="adaptiveModeToggle" /> Enable Adaptive Mode
      </label>
      <br />
      <button type="submit">Save Settings</button>
    </form>
    <hr />
    <button id="exportProgressBtn" type="button">Export Progress</button>
    <input type="file" id="importProgressInput" style="display:none" accept=".json" />
    <button id="importProgressBtn" type="button">Import Progress</button>
    <button id="resetAllButton" style="background-color: red; color: white; padding: 10px; border: none; cursor: pointer;">
      Reset All
    </button>
  `);
  const form = document.getElementById("settingsForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem("adaptiveMode", document.getElementById("adaptiveModeToggle").checked);
    // ...other settings...
  });
  document.getElementById("resetAllButton").addEventListener("click", resetAll);
  document.getElementById("difficultySelect").value = localStorage.getItem("difficulty") || "easy";
  document.getElementById("timerToggle").checked = JSON.parse(localStorage.getItem("timerEnabled") || "false");
  document.getElementById("adaptiveModeToggle").checked = JSON.parse(localStorage.getItem("adaptiveMode") || "true");
}

// --- CHARTS ---
function renderChartsOnLoad() {
  const stats = {
    correct: correct,
    incorrect: quiz.length - correct,
    unanswered: quiz.length > 0 ? quiz.length - current : 0
  };
  renderAccuracyChart(stats.correct, stats.incorrect, stats.unanswered);
  renderHistoryChart();
}

function renderAccuracyChart(correct, incorrect, unanswered) {
  const ctxElem = document.getElementById("accuracyChart");
  if (!ctxElem) return;
  const ctx = ctxElem.getContext("2d");
  if (accuracyChart) accuracyChart.destroy();
  accuracyChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Correct", "Incorrect", "Unanswered"],
      datasets: [{
        data: [correct, incorrect, unanswered],
        backgroundColor: ["#6BCB77", "#FF6B6B", "#FFD93D"],
        hoverBackgroundColor: ["#8FDCA8", "#FF8787", "#FFE066"],
        borderWidth: 1,
        borderColor: "#ffffff",
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 14 } } },
      },
      cutout: "85%",
    },
  });
}

function renderHistoryChart() {
  const results = JSON.parse(localStorage.getItem("quizResults")) || [];
  const ctx = document.getElementById("historyChart")?.getContext("2d");
  if (!ctx) return;
  if (historyChart) historyChart.destroy();
  historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: results.length ? results.map(r => new Date(r.date).toLocaleDateString()) : ["No Data"],
      datasets: [
        {
          label: "Accuracy (%)",
          data: results.length
            ? results.map(r =>
                r.total > 0 && typeof r.score === "number"
                  ? Math.max(0, Math.round((r.score / r.total) * 100))
                  : 0
              )
            : [0],
          borderColor: "#007bff",
          fill: false,
        },
        {
          label: "Streak",
          data: results.length
            ? results.map(r => typeof r.streak === "number" ? Math.max(0, r.streak) : 0)
            : [0],
          borderColor: "#FFD93D",
          fill: false,
        }
      ]
    },
    options: { responsive: true }
  });
}

// --- NOTIFICATIONS ---
function showNotification(title, message, imageUrl) {
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    container.setAttribute("role", "alert");
    container.setAttribute("aria-live", "assertive");
    document.body.appendChild(container);
  }
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.innerHTML = `<h3>${title}</h3><p>${message}</p><img src="${imageUrl}" alt="${title}" />`;
  container.appendChild(notification);
  setTimeout(() => {
    notification.remove();
    if (container.children.length === 0) container.remove();
  }, 3500);
}

// --- BADGES ---
function checkBadges() {
  badges.forEach(badge => {
    if (!earnedBadges.includes(badge.id) && badge.condition()) {
      earnedBadges.push(badge.id);
      localStorage.setItem("earnedBadges", JSON.stringify(earnedBadges));
      showBadgeModal(badge);
    }
  });
}

function showBadgeModal(badge) {
  openModal("New Achievement Unlocked!", `
    <h3>${badge.name}</h3>
    <p>${badge.description}</p>
    <img src="badges/${badge.id}.png" alt="${badge.name}" style="width: 100px; height: 100px;" />
  `);
}

// --- STORAGE & DATA ---
function saveStats() {
  const stats = { correct, streak, current, quizLength: quiz.length };
  localStorage.setItem("userStats", JSON.stringify(stats));
}

function loadStats() {
  const savedStats = JSON.parse(localStorage.getItem("userStats"));
  if (savedStats) {
    correct = savedStats.correct || 0;
    streak = savedStats.streak || 0;
    current = savedStats.current || 0;
    quiz = quiz.slice(0, savedStats.quizLength || quiz.length);
  }
}

function saveUserData() {
  localStorage.setItem("missedQuestions", JSON.stringify(missedQuestions));
}

function loadUserData() {
  missedQuestions = JSON.parse(localStorage.getItem("missedQuestions")) || [];
}

function saveQuizResult() {
  const results = JSON.parse(localStorage.getItem("quizResults")) || [];
  results.push({ streak, total: quiz.length, score: correct, date: new Date().toISOString() });
  localStorage.setItem("quizResults", JSON.stringify(results));
  renderHistoryChart();
}

// --- ANALYTICS ---
function getTopicMastery() {
  const topicStats = {};
  questions.forEach(q => {
    if (!q.topic) return;
    if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, incorrect: 0, total: 0 };
    topicStats[q.topic].correct += q.stats?.correct || 0;
    topicStats[q.topic].incorrect += q.stats?.incorrect || 0;
    topicStats[q.topic].total += (q.stats?.correct || 0) + (q.stats?.incorrect || 0);
  });
  return topicStats;
}

function masteryColor(accuracy) {
  if (accuracy >= 0.85) return "#6BCB77";
  if (accuracy >= 0.6) return "#FFD93D";
  return "#FF6B6B";
}

function getSmartReviewQuestions() {
  return questions.filter(q => (q.stats?.incorrect || 0) > 1 || ((q.stats?.correct || 0) / ((q.stats?.correct || 0) + (q.stats?.incorrect || 0))) < 0.7);
}

// --- BOOKMARKS ---
function toggleBookmark(questionId) {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarkedQuestions")) || [];
  if (bookmarks.includes(questionId)) bookmarks = bookmarks.filter(id => id !== questionId);
  else bookmarks.push(questionId);
  localStorage.setItem("bookmarkedQuestions", JSON.stringify(bookmarks));
}

function getBookmarkedQuestions(allQuestions) {
  const bookmarks = JSON.parse(localStorage.getItem("bookmarkedQuestions")) || [];
  return allQuestions.filter(q => bookmarks.includes(q.id));
}

// --- MANIFEST & TOPIC DROPDOWN ---
async function getManifestPaths() {
  const res = await fetch('manifestquestions.json');
  return await res.json();
}

async function populateTopicDropdown() {
  const dropdown = document.querySelector('.control[data-topic]');
  if (!dropdown) return;
  dropdown.innerHTML = `
    <option value="" disabled selected>-- Select Topic --</option>
    <option value="unanswered">Unanswered Questions</option>
    <option value="missed">Missed Questions</option>
    <option value="bookmarked">Bookmarked Questions</option>
  `;
  try {
    const manifestPaths = await getManifestPaths();
    for (const path of manifestPaths) {
      try {
        const fileRes = await fetch(path);
        const data = await fileRes.json();
        const option = document.createElement('option');
        option.value = path;
        option.textContent = data.title || formatTitle(path.split('/').pop());
        dropdown.appendChild(option);
      } catch {
        const option = document.createElement('option');
        option.value = path;
        option.textContent = formatTitle(path.split('/').pop());
        dropdown.appendChild(option);
      }
    }
  } catch (err) {
    // fail silently
  }
}

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function submitSuggestionToFirestore(suggestion) {
  try {
    await db.collection("suggestedQuestions").add(suggestion);
  } catch (error) {
    showNotification("Error", "Failed to submit suggestion. Try again later.", "badges/summary.png");
  }
}

async function submitReportToFirestore(report) {
  try {
    await db.collection("reportedQuestions").add(report);
  } catch (error) {
    showNotification("Error", "Failed to submit report. Try again later.", "badges/summary.png");
  }
}

// --- END OF FILE ---
