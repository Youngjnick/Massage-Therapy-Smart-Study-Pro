
async function loadAllQuestionModules() {
  try {
    const res = await fetch('manifestquestions.json');
    const paths = await res.json();
    console.log("📁 Loaded manifest paths:", paths);

    const allQuestions = await Promise.all(
      paths.map(async (path) => {
        try {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`❌ Failed to fetch ${path}`);
          const raw = await response.text();

          try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) throw new Error(`${path} is not an array`);
            console.log(`✅ Loaded: ${path} (${data.length})`);
            return data;
          } catch (jsonError) {
            throw new Error(`❌ ${path} contains invalid JSON: ${jsonError.message}`);
          }

        } catch (e) {
          console.error(`🔥 ${path} failed:`, e);
          return [];
        }
      })
    );

    questions = allQuestions.flat();
    console.log("🧠 Final question count:", questions.length);

    questions.forEach(q => q.answered = false);
    unansweredQuestions = [...questions];
    localStorage.setItem('questions', JSON.stringify(questions));
    updateTopicDropdown(questions);
    document.querySelector('.start-btn').disabled = false;
    document.getElementById('loading').style.display = 'none';
    bookmarkedQuestions = getBookmarkedQuestions(questions);
  } catch (err) {
    console.error("❌ Failed to load question modules:", err);
    document.getElementById('loading').textContent = 'Failed to load questions.';
  }
}
window.loadAllQuestionModules = loadAllQuestionModules;

function loadQuestions() {
  const cachedQuestions = localStorage.getItem('questions');
  try {
    if (cachedQuestions) {
      const parsed = JSON.parse(cachedQuestions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        questions = parsed;
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedQuestions')) || [];
        questions.forEach(q => { q.bookmarked = bookmarks.includes(q.id); });
        unansweredQuestions = [...questions];
        loadUserData();
        updateTopicDropdown(questions);
        document.querySelector('.start-btn').disabled = false;
        document.getElementById('loading').style.display = 'none';
        preloadImages(questions);
        bookmarkedQuestions = getBookmarkedQuestions(questions);
        console.log("✅ Loaded questions from localStorage:", questions.length);
        return;
      }
      console.warn("⚠️ Empty cache — loading fresh.");
      localStorage.removeItem('questions');
    }
  } catch (e) {
    console.warn("⚠️ Corrupt cache — clearing and reloading.");
    localStorage.removeItem('questions');
  }

  loadAllQuestionModules();
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🌱 DOM Ready. Starting loadQuestions()");
  loadQuestions();
});
