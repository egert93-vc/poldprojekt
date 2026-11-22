import { getState, updateState, createId, allTopics, findTopic, localDateString } from "./storage.js";

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
let currentCardId = null;
let showingAnswer = false;

export function initFlashcards() {
  const topicSelect = document.querySelector("#cards-topic-select");
  topicSelect.addEventListener("change", () => {
    currentCardId = null;
    showingAnswer = false;
    renderFlashcards();
  });
  document.querySelector("#card-form").addEventListener("submit", event => {
    event.preventDefault();
    const topicId = topicSelect.value;
    if (!topicId) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Lisa enne mälukaardi lisamist aine ja teema." }));
      return;
    }
    const question = document.querySelector("#card-question").value.trim();
    const answer = document.querySelector("#card-answer").value.trim();
    if (!question || !answer) return;
    updateState(state => {
      const result = findTopic(state, topicId);
      if (result) result.topic.cards.push({ id: createId(), question, answer, due: localDateString(), interval: 0, repetitions: 0, ease: 2.5, reviews: 0 });
    });
    event.target.reset();
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Mälukaart lisatud." }));
  });
  document.querySelector("#flashcard-area").addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "reveal") {
      showingAnswer = true;
      renderFlashcards();
    } else if (action.dataset.action === "grade") {
      gradeCard(Number(action.dataset.quality));
    }
  });
}

export function setFlashcardTopic(topicId) {
  const select = document.querySelector("#cards-topic-select");
  if (topicId && Array.from(select.options).some(option => option.value === topicId)) {
    select.value = topicId;
    currentCardId = null;
    showingAnswer = false;
  }
}

export function renderFlashcards() {
  const select = document.querySelector("#cards-topic-select");
  const topics = allTopics();
  const previous = select.value;
  select.innerHTML = topics.length
    ? topics.map(topic => `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.subjectName)} — ${escapeHtml(topic.name)}</option>`).join("")
    : '<option value="">Lisa esmalt aine ja teema</option>';
  if (topics.some(topic => topic.id === previous)) select.value = previous;
  const topic = topics.find(item => item.id === select.value);
  const area = document.querySelector("#flashcard-area");
  const form = document.querySelector("#card-form");
  form.querySelectorAll("input, button").forEach(control => { control.disabled = !topic; });
  if (!topic) {
    document.querySelector("#due-count").textContent = "";
    area.innerHTML = '<div class="empty-state">Lisa aine ja teema, siis saad luua oma esimesed kaardid.</div>';
    return;
  }
  const dueCards = topic.cards.filter(card => !card.due || card.due <= localDateString());
  document.querySelector("#due-count").textContent = `${dueCards.length} kordamiseks`;
  if (!topic.cards.length) {
    currentCardId = null;
    area.innerHTML = '<div class="empty-state">Selle teema juures pole veel kaarte. Lisa küsimus ja vastus ülaloleva vormiga.</div>';
    return;
  }
  if (!dueCards.length) {
    currentCardId = null;
    const nextDate = topic.cards.map(card => card.due).filter(Boolean).sort()[0];
    area.innerHTML = `<div class="empty-state">Tänased kaardid on tehtud. Järgmine kordamine: ${escapeHtml(nextDate || "hiljem")} — tubli töö!</div>`;
    return;
  }
  if (!dueCards.some(card => card.id === currentCardId)) currentCardId = dueCards[0].id;
  const card = dueCards.find(item => item.id === currentCardId);
  area.innerHTML = `<article class="flashcard" aria-live="polite"><p class="eyebrow">${showingAnswer ? "VASTUS" : "KÜSIMUS"}</p><h3>${escapeHtml(showingAnswer ? card.answer : card.question)}</h3>${showingAnswer ? "" : '<button type="button" class="secondary-button reveal-button" data-action="reveal">Näita vastust</button>'}</article>
    ${showingAnswer ? `<div class="review-controls" aria-label="Hinda oma vastust"><button class="did-not-know" type="button" data-action="grade" data-quality="0">Ei teadnud</button><button class="hard" type="button" data-action="grade" data-quality="3">Raske</button><button class="knew" type="button" data-action="grade" data-quality="5">Teadsin</button></div>` : ""}`;
}

function gradeCard(quality) {
  const topicId = document.querySelector("#cards-topic-select").value;
  const reviewedCardId = currentCardId;
  let nextCardId = null;
  showingAnswer = false;
  updateState(state => {
    const result = findTopic(state, topicId);
    const card = result && result.topic.cards.find(item => item.id === reviewedCardId);
    if (!card || !result) return;
    if (quality < 3) {
      card.repetitions = 0;
      card.interval = 1;
    } else {
      if (card.repetitions === 0) card.interval = 1;
      else if (card.repetitions === 1) card.interval = quality === 3 ? 1 : 6;
      else card.interval = Math.max(1, Math.round(card.interval * card.ease * (quality === 3 ? 0.8 : 1)));
      card.repetitions += 1;
      card.ease = Math.max(1.3, card.ease + (quality === 3 ? -0.15 : 0.1));
    }
    const nextDate = new Date(`${localDateString()}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.due = localDateString(nextDate);
    card.reviews = (card.reviews || 0) + 1;
    result.topic.lastReviewed = localDateString();
    const dueCards = result.topic.cards.filter(item => item.id !== card.id && (!item.due || item.due <= localDateString()));
    nextCardId = dueCards.length ? dueCards[0].id : null;
  });
  currentCardId = nextCardId;
  document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Kordamine salvestatud. Jätka omas tempos." }));
}
