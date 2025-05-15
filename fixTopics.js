const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, 'questions');

function humanizeTopic(topic) {
  if (!topic) return topic;
  if (topic.trim().toUpperCase() === 'SOAP') return 'SOAP';
  // Replace underscores/hyphens with spaces, capitalize each word
  return topic
    .replace(/[_\-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function processFile(filePath) {
  let changed = false;
  let data = fs.readFileSync(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(data);
  } catch (e) {
    console.error(`Could not parse JSON in ${filePath}:`, e);
    return;
  }

  // If file has a root "topic" property, fix it
  if (json.topic) {
    const newTopic = humanizeTopic(json.topic);
    if (json.topic !== newTopic) {
      json.topic = newTopic;
      changed = true;
    }
  }

  // If file has a "questions" array, fix each question's topic and tags
  if (Array.isArray(json.questions)) {
    json.questions.forEach(q => {
      // topic
      if (q.topic) {
        const newTopic = humanizeTopic(q.topic);
        if (q.topic !== newTopic) {
          q.topic = newTopic;
          changed = true;
        }
      }
      // tags
      if (Array.isArray(q.tags)) {
        const newTags = q.tags.map(tag => humanizeTopic(tag));
        if (JSON.stringify(q.tags) !== JSON.stringify(newTags)) {
          q.tags = newTags;
          changed = true;
        }
      }
    });
  }

  // If file is an array of questions
  if (Array.isArray(json)) {
    json.forEach(q => {
      // topic
      if (q.topic) {
        const newTopic = humanizeTopic(q.topic);
        if (q.topic !== newTopic) {
          q.topic = newTopic;
          changed = true;
        }
      }
      // tags
      if (Array.isArray(q.tags)) {
        const newTags = q.tags.map(tag => humanizeTopic(tag));
        if (JSON.stringify(q.tags) !== JSON.stringify(newTags)) {
          q.tags = newTags;
          changed = true;
        }
      }
    });
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Updated topics/tags in: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

function processDirectory(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.toLowerCase().endsWith('.json')) {
      processFile(fullPath);
    }
  });
}

processDirectory(QUESTIONS_DIR);