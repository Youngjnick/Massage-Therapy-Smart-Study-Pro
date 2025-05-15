/** @type {number} */
let current = 0;
/** @type {string} */
let selectedTopic = "";
/** @type {Array<Object>} */
let quiz = [];
/** @type {number} */
let correct = 0;
/** @type {number} */
let streak = 0;
/** @type {Array<string>} */
let missedQuestions = [];
/** @type {Array<Object>} */
let unansweredQuestions = [];
/** @type {Array<Object>} */
let bookmarkedQuestions = [];
/** @type {Array<Object>} */
let questions = [];
/** @type {Chart|undefined} */
let historyChart;

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
      console.log("✅ Loaded questions from localStorage:", questions.length);
    } else {
      console.log("📭 No cache found — loading modules");
      loadAllQuestionModules();
    }
  } catch (err) {
    console.error("❌ Error parsing cached questions. Clearing cache and reloading...", err);
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
    option.textContent = topic;
    topicSelect.appendChild(option);
}); // Correctly close the forEach method
}

function preloadImages(questionsArr) {
  questionsArr.forEach(q => {
    if (q.image) {
      const img = new Image();
      img.src = q.image;
    }
  });
}

// Event listeners for topic and quiz start
document.addEventListener("DOMContentLoaded", () => {
  loadQuestions();

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

  startBtn.addEventListener("click", function() {
    // ...existing quiz start logic...
  });

  // Smart Learning Modal
  document.querySelector('.smart-learning a').addEventListener("click", (e) => {
    e.preventDefault();
    openModal(
      "Smart Learning",
      `
        <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
        <div class="badge-grid">
          ${badges.map(badge => `
            <div class="badge-item ${earnedBadges.includes(badge.id) ? "" : "unearned"}">
              <img src="badges/${badge.id}.png" alt="${badge.name}" />
              <p>${badge.name}</p>
            </div>
          `).join("")}
        </div>
      `,
      true
    );
  });

  // ...other startup code...
});

document.addEventListener("DOMContentLoaded", function() {
  // Quiz controls
  const topicSelect = document.querySelector('.control[data-topic]');
  const lengthSelect = document.querySelector('.control[data-quiz-length]');
  const startBtn = document.querySelector('.start-btn');

  function updateStartBtn() {
    startBtn.disabled = !(topicSelect.value && lengthSelect.value);
  }

  topicSelect.addEventListener('change', updateStartBtn);
  lengthSelect.addEventListener('change', updateStartBtn);

  startBtn.addEventListener('click', function() {
    // Get selected topic and quiz length
    const topic = topicSelect.value;
    const length = lengthSelect.value === "all" ? questions.length : parseInt(lengthSelect.value, 10);

    // Filter questions based on topic
    let quizPool = [];
    if (topic === "unanswered") {
      quizPool = unansweredQuestions;
    } else if (topic === "missed") {
      quizPool = missedQuestions.map(id => questions.find(q => q.id === id)).filter(Boolean);
    } else if (topic === "bookmarked") {
      quizPool = bookmarkedQuestions;
    } else {
      quizPool = questions.filter(q => q.topic === topic);
    }

    // Shuffle and select the desired number of questions
    quiz = shuffle([...quizPool]).slice(0, length);
    current = 0;
    correct = 0;
    streak = 0;

    // Show the quiz card and render the first question
    document.querySelector(".quiz-card").classList.remove("hidden");
    renderQuestion();
  });

  // Smart Learning Modal
  document.querySelector('.smart-learning a').addEventListener("click", (e) => {
    e.preventDefault();
    openModal(
      "Smart Learning",
      `
        <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
        <div class="badge-grid">
          ${badges.map(badge => `
            <div class="badge-item ${earnedBadges.includes(badge.id) ? "" : "unearned"}">
              <img src="badges/${badge.id}.png" alt="${badge.name}" />
              <p>${badge.name}</p>
            </div>
          `).join("")}
        </div>
      `,
      true
    );
  });

  // ...add any other startup code here...
});

// Main renderQuestion function
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
  const quizHeader = document.querySelector(".quiz-header");
  const oldHeaderRow = quizHeader.querySelector(".quiz-header-row");
  if (oldHeaderRow) oldHeaderRow.remove();

  const headerRow = document.createElement("div");
  headerRow.className = "quiz-header-row";

  const topicStreak = document.createElement("div");
  topicStreak.className = "topic-streak";
  topicStreak.innerHTML = `
    <span>TOPIC: <strong>${selectedTopic}</strong></span>
    <span style="margin-left: 16px;">Streak: <span id="quizStreak">${streak}</span></span>
  `;

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "bookmark-btn";
  bookmarkBtn.textContent = q.bookmarked ? "Unbookmark" : "Bookmark";
  bookmarkBtn.setAttribute("aria-label", q.bookmarked ? "Unbookmark this question" : "Bookmark this question");
  bookmarkBtn.addEventListener("click", () => {
    q.bookmarked = !q.bookmarked;
    bookmarkBtn.textContent = q.bookmarked ? "Unbookmark" : "Bookmark";
    toggleBookmark(q.id); // <-- Save to localStorage
    // Update the in-memory bookmarkedQuestions array
    bookmarkedQuestions = getBookmarkedQuestions(questions);
  });

  headerRow.appendChild(topicStreak);
  headerRow.appendChild(bookmarkBtn);
  quizHeader.appendChild(headerRow);

  document.querySelector(".quiz-header strong").textContent = selectedTopic;
  document.querySelector(".question-text").textContent = q.question;
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
      if (e.key === "Enter" || e.key === " ") {
        handleAnswerClick(ansObj.isCorrect, btn);
      }
    });
    answersDiv.appendChild(btn);
  });
  document.querySelector(".feedback").textContent = "";

  // Remove old action button containers if present
  const quizCard = document.querySelector(".quiz-card");
  quizCard.querySelectorAll(".question-actions").forEach(el => el.remove());

  // Action buttons (suggest, report, flag)
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "question-actions";
  actionsDiv.setAttribute("role", "group");
  actionsDiv.setAttribute("aria-label", "Question actions");

  // Suggest Button
  const suggestBtn = document.createElement("button");
  suggestBtn.textContent = "Suggest a Question";
  suggestBtn.className = "suggest-btn";
  suggestBtn.addEventListener("click", () => {
    openModal(
      "Suggest a Question",
      `<form id="suggestForm">
        <label>Question:<br><input type="text" id="suggestQ" required></label><br>
        <label>Answer A:<br><input type="text" id="suggestA" required></label><br>
        <label>Answer B:<br><input type="text" id="suggestB" required></label><br>
        <label>Answer C:<br><input type="text" id="suggestC"></label><br>
        <label>Answer D:<br><input type="text" id="suggestD"></label><br>
        <label>Correct Answer (A/B/C/D):<br><input type="text" id="suggestCorrect" required maxlength="1"></label><br>
        <label>Topic:<br><input type="text" id="suggestTopic" required></label><br>
        <button type="submit">Submit</button>
      </form>`
    );
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

  // Report Button
  const reportBtn = document.createElement("button");
  reportBtn.textContent = "Report Question";
  reportBtn.className = "report-btn";
  reportBtn.addEventListener("click", () => {
    openModal(
      "Report Question",
      `<form id="reportForm">
        <p>Why are you reporting this question?</p>
        <textarea id="reportReason" required style="width:100%;height:60px;"></textarea><br>
        <button type="submit">Submit Report</button>
      </form>`
    );
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

  // Flag as Unclear Button
  const flagBtn = document.createElement("button");
  flagBtn.textContent = "Flag as Unclear";
  flagBtn.className = "flag-unclear-btn";
  flagBtn.addEventListener("click", async () => {
    const qid = quiz[current].id;
    let unclearFlags = JSON.parse(localStorage.getItem("unclearFlags") || "{}");
    unclearFlags[qid] = (unclearFlags[qid] || 0) + 1;
    localStorage.setItem("unclearFlags", JSON.stringify(unclearFlags));
    showNotification("Thank you!", "This question has been flagged as unclear.", "badges/summary.png");
  });

  actionsDiv.appendChild(suggestBtn);
  actionsDiv.appendChild(reportBtn);
  actionsDiv.appendChild(flagBtn);

  // Add the rating stars
  const rateDiv = document.createElement("div");
  rateDiv.className = "rate-question";
  rateDiv.innerHTML = `
    <span>Rate: </span>
    ${[1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<span class="star" data-star="${n}" style="cursor:pointer;font-size:1.2em;color:#ccc;">&#9734;</span>`
      )
      .join("")}
  `;
  actionsDiv.appendChild(rateDiv);

  // Add interactivity to the stars
  const stars = rateDiv.querySelectorAll(".star");
  const qid = quiz[current].id; // Get the current question ID
  const ratings = JSON.parse(localStorage.getItem("questionRatings") || "{}");
  const savedRating = ratings[qid] || 0; // Get the saved rating for the current question

  // Show stars by default based on the saved rating
  stars.forEach((star, index) => {
    star.style.color = index < savedRating ? "gold" : "#ccc"; // Fill stars up to the saved rating

    star.addEventListener("click", () => {
      // Fill all stars up to the clicked one with gold
      stars.forEach((s, i) => {
        s.style.color = i <= index ? "gold" : "#ccc";
      });

      // Save the rating to localStorage or send it to the server
      const rating = index + 1;
      ratings[qid] = rating;
      localStorage.setItem("questionRatings", JSON.stringify(ratings));

      showNotification("Thank you!", `You rated this question ${rating} stars.`, "badges/summary.png");
    });

    // Highlight stars on hover
    star.addEventListener("mouseover", () => {
      stars.forEach((s, i) => {
        s.style.color = i <= index ? "gold" : "#ccc";
      });
    });

    // Reset stars to the saved rating or default on mouseout
    star.addEventListener("mouseout", () => {
      stars.forEach((s, i) => {
        s.style.color = i < savedRating ? "gold" : "#ccc";
      });
    });
  });

  quizCard.appendChild(actionsDiv);

  // Enable/disable buttons as needed
  bookmarkBtn.disabled = !q;
  flagBtn.disabled = !q;
  reportBtn.disabled = !q;
}

// Handle Answer Click
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

    // Add to missedQuestions if not already present
    if (!missedQuestions.includes(qid)) {
      missedQuestions.push(qid);
      saveUserData();
    }
    quiz[current].stats = quiz[current].stats || { correct: 0, incorrect: 0 };
    quiz[current].stats.incorrect++;

    const now = Date.now();
    localStorage.setItem("review_" + qid, JSON.stringify({
      lastMissed: now,
      interval: 24 * 60 * 60 * 1000 // 1 day, increase on each miss
    }));
  } else {
    feedback.textContent = "Correct!";
    feedback.style.color = "green";

    // Remove from missedQuestions if answered correctly
    missedQuestions = missedQuestions.filter(id => id !== qid);
    saveUserData();
    quiz[current].stats = quiz[current].stats || { correct: 0, incorrect: 0 };
    quiz[current].stats.correct++;
  }

  const explanation = quiz[current].explanation || "";
  feedback.innerHTML += explanation ? `<br><em>${explanation}</em>` : "";

  if (isCorrect) correct++;

  // Remove from unansweredQuestions as before
  unansweredQuestions = unansweredQuestions.filter(q => q.id !== qid);

  setTimeout(() => {
    current++;
    if (current >= quiz.length) {
      showSummary();
      return;
    }
    renderQuestion();

    // Dynamically update the chart
    const unanswered = quiz.length - current;
    renderAccuracyChart(correct, current - correct, unanswered);
  }, 1500);
}

// Update Streak
function updateStreak(isCorrect) {
  if (isCorrect) {
    streak++;
  } else {
    streak = 0;
  }
  document.getElementById("quizStreak").textContent = streak;
  checkBadges(); // Check badges after updating streak
}

// Update Progress
function updateProgress(current, total) {
  const progress = Math.round((current / total) * 100);
  document.querySelector(".progress-fill").style.width = `${progress}%`;
  document.querySelector(".progress-section span:last-child").textContent = `${progress}%`;
}

// Show Summary
function showSummary() {
  // Calculate accuracy
  const accuracy = quiz.length > 0 ? Math.round((correct / quiz.length) * 100) : 0;

  // Show quiz summary as a notification
  showNotification(
    "Quiz Summary",
    `You answered ${correct} out of ${quiz.length} questions correctly (${accuracy}% accuracy).`,
    "badges/summary.png" // Replace with a relevant image path
  );

  // Check badges after completing the quiz
  checkBadges();

  // Show "Review Missed" if there are missed questions
  if (missedQuestions.length > 0) {
    const reviewBtn = document.createElement("button");
    reviewBtn.textContent = "Review Missed Questions";
    reviewBtn.className = "modal-btn";
    reviewBtn.onclick = () => {
      console.log("Missed:", missedQuestions);
      quiz = questions.filter(q => missedQuestions.includes(q.id));
      console.log("Quiz for review:", quiz);
      current = 0;
      correct = 0;
      streak = 0;
      document.querySelector(".quiz-card").classList.remove("hidden");
      renderQuestion();
      document.querySelector(".notification-container")?.remove();
    };
    setTimeout(() => {
      document.body.appendChild(reviewBtn);
      setTimeout(() => reviewBtn.remove(), 5000); // Remove after 5s
    }, 500); // Show after summary
  }

  // Show "Smart Review" if there are smart review questions
  if (getSmartReviewQuestions().length > 0) {
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
      setTimeout(() => smartReviewBtn.remove(), 5000); // Remove after 5s
    }, 500); // Show after summary
  }

  saveQuizResult(); // Save to history
}

// Open Modal Function
function openModal(title, content, toggle = false) {
  const existingModal = document.querySelector(".modal-overlay");

  // If toggle is true and the modal exists, close it
  if (toggle && existingModal) {
    existingModal.remove();
    return;
  }

  // Create and display the modal
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
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close modal when clicking the close button or outside the modal
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

  setTimeout(() => {
    document.querySelector('.modal').scrollTop = 0;
  }, 0);
}

// Smart Learning Modal
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".smart-learning a").addEventListener("click", (e) => {
    e.preventDefault();

    openModal(
      "Smart Learning",
      `
        <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
        <div class="badge-grid">
          ${badges.map(badge => `
            <div class="badge-item ${earnedBadges.includes(badge.id) ? "" : "unearned"}">
              <img src="badges/${badge.id}.png" alt="${badge.name}" />
              <p>${badge.name}</p>
            </div>
          `).join("")}
        </div>
      `,
      true // Pass true if you want toggling behavior
    );
  });

  // Show progress chart by default
  const stats = {
    correct: correct,
    incorrect: quiz.length - correct,
    unanswered: quiz.length > 0 ? quiz.length - current : 0
  };
  renderAccuracyChart(stats.correct, stats.incorrect, stats.unanswered);
  renderHistoryChart(); // Always show history chart on load
});

// Update View Analytics Modal
document.querySelector(".view-analytics a").addEventListener("click", (e) => {
  e.preventDefault();

  // Dynamically calculate stats
  const totalQuestions = quiz.length;
  const unansweredQuestionsCount = totalQuestions - current;
  const incorrectAnswers = current - correct;
  const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  const stats = {
    totalQuestions,
    correctAnswers: correct,
    incorrectAnswers,
    unansweredQuestions: unansweredQuestionsCount,
    accuracy,
    streak,
  };

  // Mastery heatmap HTML
  const topicStats = getTopicMastery();
  const masteryHtml = Object.entries(topicStats).map(([topic, stat]) => {
    const acc = stat.total ? stat.correct / stat.total : 0;
    return `<li style="background:${masteryColor(acc)};padding:4px 8px;border-radius:4px;margin:2px 0;">
      <strong>${topic}:</strong> ${(acc*100).toFixed(0)}% mastery
    </li>`;
  }).join("");

  // Open the modal
  openModal(
    "View Analytics",
    `
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
    `
  );

  // Only call this ONCE, after the modal is open and the canvas exists:
  setTimeout(() => {
    renderAccuracyChart(stats.correctAnswers, stats.incorrectAnswers, stats.unansweredQuestions);
    renderHistoryChart();
  }, 0);
});

// Update Settings Modal
document.querySelector(".settings a").addEventListener("click", (e) => {
  e.preventDefault();
  openModal(
    "Settings",
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
    `
  );

  // Add functionality to the form
  const form = document.getElementById("settingsForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const adaptiveMode = document.getElementById("adaptiveModeToggle").checked;
    const randomMode = document.getElementById("randomModeToggle").checked;
    localStorage.setItem("adaptiveMode", adaptiveMode);
    localStorage.setItem("randomMode", randomMode);
    // ...other settings...
  });

  // Add functionality to the Reset All button
  document.getElementById("resetAllButton").addEventListener("click", () => {
    resetAll();
  });

  // When opening the settings modal
  document.getElementById("difficultySelect").value = localStorage.getItem("difficulty") || "easy";
  document.getElementById("timerToggle").checked = JSON.parse(localStorage.getItem("timerEnabled") || "false");
  document.getElementById("adaptiveModeToggle").checked = JSON.parse(localStorage.getItem("adaptiveMode") || "true");
});

if (localStorage.getItem("adaptiveMode") === null) {
  localStorage.setItem("adaptiveMode", "true");
}

function checkBadges() {
  badges.forEach(badge => {
    if (!earnedBadges.includes(badge.id) && badge.condition()) {
      earnedBadges.push(badge.id);
      localStorage.setItem("earnedBadges", JSON.stringify(earnedBadges));
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

let accuracyChart; // Declare a global variable to hold the chart instance

function renderAccuracyChart(correct, incorrect, unanswered) {
  const ctxElem = document.getElementById("accuracyChart");
  if (!ctxElem) return; // Exit if the canvas doesn't exist

  const ctx = ctxElem.getContext("2d");

  // If the chart already exists, destroy it before creating a new one
  if (accuracyChart) {
    accuracyChart.destroy();
  }

  // Create a new chart instance
  accuracyChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Correct", "Incorrect", "Unanswered"],
      datasets: [{
        data: [correct, incorrect, unanswered],
        backgroundColor: ["#6BCB77", "#FF6B6B", "#FFD93D"], // Green, Red, Yellow
        hoverBackgroundColor: ["#8FDCA8", "#FF8787", "#FFE066"], // Lighter shades for hover
        borderWidth: 1,
        borderColor: "#ffffff", // White border for a clean look
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 14,
            },
          },
        },
      },
      cutout: "85%", // Narrower ring for a sleek look
    },
  });
}

function renderHistoryChart() {
  const results = JSON.parse(localStorage.getItem("quizResults")) || [];
  const ctx = document.getElementById("historyChart").getContext("2d");

  // Destroy previous chart if it exists
  if (historyChart) {
    historyChart.destroy();
  }

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

  // Create the notification element
  const notification = document.createElement("div");
  notification.className = "notification";
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
  "Welcome!",
  "Challenge your skills with Massage Therapy Smart Study PRO!",
  "badges/welcome.png" // Replace with the path to a welcome image
);

function saveStats() {
  const stats = {
    correct,
    streak,
    current,
    quizLength: quiz.length,
  };
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
  // ...other saves
}

function loadUserData() {
  missedQuestions = JSON.parse(localStorage.getItem("missedQuestions")) || [];
  // ...other loads
}

function getTopicMastery() {
  // Aggregate stats by topic
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
  if (accuracy >= 0.85) return "#6BCB77"; // green
  if (accuracy >= 0.6) return "#FFD93D"; // yellow
  return "#FF6B6B"; // red
}

function saveQuizResult() {
  const results = JSON.parse(localStorage.getItem("quizResults")) || [];
  results.push({
    streak,
    total: quiz.length,
    score: correct,
    date: new Date().toISOString(),
  });
  localStorage.setItem("quizResults", JSON.stringify(results));
  renderHistoryChart(); // Update chart after saving results
}

function getNextQuestion() {
  // Example: If last 3 correct, increase difficulty
  const lastResults = quiz.slice(Math.max(0, current - 3), current).map(q => q.stats?.correct > 0);
  let nextDifficulty = "easy";
  if (lastResults.every(Boolean)) nextDifficulty = "moderate";
  if (lastResults.length === 3 && lastResults.every(Boolean) && quiz[current-1]?.difficulty === "moderate") nextDifficulty = "hard";
  // Pick a question of nextDifficulty not yet answered
  return questions.find(q => q.difficulty === nextDifficulty && !quiz.includes(q));
}

function getDueForReview() {
  const now = Date.now();
  return questions.filter(q => {
    const review = JSON.parse(localStorage.getItem("review_" + q.id));
    if (!review) return false;
    return now - review.lastMissed > review.interval;
  });
}

function getWeakTopics() {
  const mastery = getTopicMastery();
  return Object.entries(mastery)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / a[1].total))
    .map(([topic]) => topic);
}

function getAdaptiveQuizLength() {
  if (streak >= 10) return 20; // longer quiz for high streak
  if (streak >= 5) return 10;
  if (streak <= 2) return 5;   // shorter quiz if struggling
  return 7; // default
}

function isUnlocked(topic) {
  const mastery = getTopicMastery();
  if (topic === "Advanced") {
    return (mastery["Basics"]?.correct / mastery["Basics"]?.total) > 0.8;
  }
  return true;
}

function getDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  const challengeKey = "challenge_" + today;
  let challenge = JSON.parse(localStorage.getItem(challengeKey));
  if (!challenge) {
    // Pick 5 random weak-topic questions
    const weakTopics = getWeakTopics().slice(0, 2);
    const pool = questions.filter(q => weakTopics.includes(q.topic));
    challenge = shuffle(pool).slice(0, 5);
    localStorage.setItem(challengeKey, JSON.stringify(challenge));
  }
  return challenge;
}

// To start daily challenge:
quiz = getDailyChallenge();

function getSmartReviewQuestions() {
  return questions.filter(q => (q.stats?.incorrect || 0) > 1 || ((q.stats?.correct || 0) / ((q.stats?.correct || 0) + (q.stats?.incorrect || 0))) < 0.7);
}

function getWeeklyStats() {
  const results = JSON.parse(localStorage.getItem("quizResults")) || [];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return results.filter(r => new Date(r.date).getTime() > weekAgo);
}

// --- FIREBASE CONFIG ---
// Replace with your own config from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ...other config...
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- END FIREBASE CONFIG ---

async function submitSuggestionToFirestore(suggestion) {
  try {
    await db.collection("suggestedQuestions").add(suggestion);
  } catch (error) {
    showNotification("Error", "Failed to submit suggestion. Try again later.", "badges/summary.png");
    console.error("Firestore error:", error);
  }
}

async function submitReportToFirestore(report) {
  try {
    await db.collection("reportedQuestions").add(report);
  } catch (error) {
    showNotification("Error", "Failed to submit report. Try again later.", "badges/summary.png");
    console.error("Firestore error:", error);
  }
}

function getAdaptiveQuiz(questions, quizLength, streak) {
  let difficulty = "easy";
  if (streak >= 5) difficulty = "moderate";
  if (streak >= 10) difficulty = "hard";
  const filtered = questions.filter(q => q.difficulty === difficulty);
  return shuffle(filtered).slice(0, quizLength);
}

function getBalancedQuiz(questions, quizLength) {
  const byTopic = {};
  questions.forEach(q => {
    if (!byTopic[q.topic]) byTopic[q.topic] = [];
    byTopic[q.topic].push(q);
  });
  Object.values(byTopic).forEach(arr => shuffle(arr));
  const topics = Object.keys(byTopic);
  const quiz = [];
  let i = 0;
  while (quiz.length < quizLength && topics.length) {
    const topic = topics[i % topics.length];
    if (byTopic[topic].length) {
      quiz.push(byTopic[topic].pop());
    }
    i++;
  }
  return quiz;
}

function getWeakTopicQuiz(questions, mastery, quizLength) {
  const weakTopics = Object.entries(mastery)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .map(([topic]) => topic);
  const pool = questions.filter(q => weakTopics.includes(q.topic));
  return shuffle(pool).slice(0, quizLength);
}

function filterLowQualityQuestions(questions) {
  const ratings = JSON.parse(localStorage.getItem("questionRatings") || "{}");
  const unclearFlags = JSON.parse(localStorage.getItem("unclearFlags") || "{}");
  // Exclude questions with rating <= 2 or flagged as unclear 2+ times
  return questions.filter(q => {
    const qid = q.id;
    return (ratings[qid] === undefined || ratings[qid] > 2) && (unclearFlags[qid] === undefined || unclearFlags[qid] < 2);
  });
}

function getStrongestAndWeakestTopics() {
  const mastery = getTopicMastery();
  const sorted = Object.entries(mastery)
    .filter(([_, stat]) => stat.total > 0)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / a[1].total));
  return {
    weakest: sorted[0],
    strongest: sorted[sorted.length - 1]
  };
}

document.addEventListener("DOMContentLoaded", function() {
  // your code that uses document.getElementById(...)
});

const { weakest, strongest } = getStrongestAndWeakestTopics();
const dueForReview = getDueForReview().length;
const avgRating = (() => {
  const ratings = Object.values(JSON.parse(localStorage.getItem("questionRatings") || "{}"));
  return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : "N/A";
})();
const flaggedCount = Object.values(JSON.parse(localStorage.getItem("unclearFlags") || "{}")).filter(v => v >= 2).length;

const analyticsHtml = `
  <ul>
    <li><strong>Strongest Topic:</strong> ${strongest ? strongest[0] : "N/A"}</li>
    <li><strong>Weakest Topic:</strong> ${weakest ? weakest[0] : "N/A"}</li>
    <li><strong>Questions Due for Review:</strong> ${dueForReview}</li>
    <li><strong>Average Question Rating:</strong> ${avgRating}</li>
    <li><strong>Flagged Questions:</strong> ${flaggedCount}</li>
  </ul>
`;

// Example: Save bookmarked question IDs
function toggleBookmark(questionId) {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarkedQuestions")) || [];
  if (bookmarks.includes(questionId)) {
    bookmarks = bookmarks.filter(id => id !== questionId);
  } else {
    bookmarks.push(questionId);
  }
  localStorage.setItem("bookmarkedQuestions", JSON.stringify(bookmarks));
}

// Example: Get bookmarked questions
function getBookmarkedQuestions(allQuestions) {
  const bookmarks = JSON.parse(localStorage.getItem("bookmarkedQuestions")) || [];
  return allQuestions.filter(q => bookmarks.includes(q.id));
}

async function loadManifest() {
  const res = await fetch("manifestquestions.json");
  return await res.json();
}

async function loadAllJsonFiles() {
  const paths = await loadManifest();
  const data = await Promise.all(
    paths.map(async path => {
      try {
        const res = await fetch(path); // Changed from fetch(`questions/${path}`) fullPath = `questions/${path}`;
        if (!res.ok) throw new Error(`❌ Failed to load ${path}`);
        return { path, data: await res.json() };
      } catch (err) {
        console.error(err);
        return null;
      }
    })
  );
  return data.filter(Boolean);
}

document.querySelector('.smart-learning .settings-link').addEventListener("click", (e) => {
  e.preventDefault();
  openModal(
    "Smart Learning",
    `
      <p>Smart Learning helps you focus on missed or unanswered questions to improve your knowledge.</p>
      <div class="badge-grid">
        ${badges.map(badge => `
          <div class="badge-item ${earnedBadges.includes(badge.id) ? "" : "unearned"}">
            <img src="badges/${badge.id}.png" alt="${badge.name}" />
            <p>${badge.name}</p>
          </div>
        `).join("")}
      </div>
    `,
    true
  );
});

function formatTitleFromPath(path) {
  // Get filename without extension
  const file = path.split('/').pop().replace('.JSON', '');

  // Replace underscores and dashes with spaces, capitalize each word
  return file
    .replace(/[_\-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Assume manifestPaths is an array of paths (from manifestquestions.json)
// and dropdown is your <select> element

manifestPaths.forEach(path => {
  const displayTitle = formatTitleFromPath(path); // Use your formatting function
  const option = document.createElement('option');
  option.value = path;
  option.textContent = displayTitle;
  dropdown.appendChild(option);
});
