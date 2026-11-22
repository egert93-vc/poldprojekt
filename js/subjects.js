import { getState, updateState, createId, findTopic } from "./storage.js";

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

export function initSubjects() {
  const subjectForm = document.querySelector("#subject-form");
  subjectForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = new FormData(subjectForm).get("name").trim();
    if (!name) return;
    updateState(state => state.subjects.push({ id: createId(), name, topics: [] }));
    subjectForm.reset();
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Aine lisatud." }));
  });

  document.querySelector("#subjects-list").addEventListener("submit", event => {
    if (!event.target.matches(".topic-add-form")) return;
    event.preventDefault();
    const form = event.target;
    const name = new FormData(form).get("topic").trim();
    if (!name) return;
    updateState(state => {
      const subject = state.subjects.find(item => item.id === form.dataset.subjectId);
      if (subject) subject.topics.push({ id: createId(), name, understanding: 3, lastReviewed: null, cards: [] });
    });
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Teema lisatud." }));
  });

  document.querySelector("#subjects-list").addEventListener("change", event => {
    if (!event.target.matches("[data-understanding]")) return;
    const { topicId } = event.target.dataset;
    const understanding = Number(event.target.value);
    updateState(state => {
      const result = findTopic(state, topicId);
      if (result) result.topic.understanding = understanding;
    });
  });

  document.querySelector("#subjects-list").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.deleteSubject) {
      const state = getState();
      const subject = state.subjects.find(item => item.id === button.dataset.deleteSubject);
      if (!subject || !window.confirm(`Kas soovid aine „${subject.name}” ja kõik selle teemad kustutada?`)) return;
      updateState(data => {
        data.subjects = data.subjects.filter(item => item.id !== button.dataset.deleteSubject);
        const remaining = new Set(data.subjects.flatMap(item => item.topics.map(topic => topic.id)));
        data.sessions = data.sessions.filter(session => remaining.has(session.topicId));
        data.plans = data.plans.filter(plan => remaining.has(plan.topicId));
      });
    } else if (button.dataset.deleteTopic) {
      const result = findTopic(getState(), button.dataset.deleteTopic);
      if (!result || !window.confirm(`Kas soovid teema „${result.topic.name}” kustutada?`)) return;
      updateState(state => {
        const found = findTopic(state, button.dataset.deleteTopic);
        if (found) found.subject.topics = found.subject.topics.filter(topic => topic.id !== button.dataset.deleteTopic);
        state.sessions = state.sessions.filter(session => session.topicId !== button.dataset.deleteTopic);
        state.plans = state.plans.filter(plan => plan.topicId !== button.dataset.deleteTopic);
      });
    } else if (button.dataset.openCards) {
      document.dispatchEvent(new CustomEvent("opiabi:navigate", { detail: { view: "cards", topicId: button.dataset.openCards } }));
    }
  });
}

export function renderSubjects() {
  const target = document.querySelector("#subjects-list");
  const { subjects } = getState();
  if (!subjects.length) {
    target.innerHTML = '<div class="panel empty-state">Sul pole veel aineid. Lisa esimene aine ja vali üks teema, millega alustada.</div>';
    return;
  }
  target.innerHTML = subjects.map(subject => `
    <article class="subject-card">
      <header class="subject-header"><h3>${escapeHtml(subject.name)}</h3><div class="subject-actions"><span class="topic-meta">${subject.topics.length} teemat</span><button class="delete-button" data-delete-subject="${escapeHtml(subject.id)}" type="button" aria-label="Kustuta aine ${escapeHtml(subject.name)}">Kustuta aine</button></div></header>
      <div class="topic-list">${subject.topics.length ? subject.topics.map(topic => `
        <div class="topic-row">
          <span class="topic-name">${escapeHtml(topic.name)}</span><span class="topic-meta">${topic.cards.length} mälukaarti</span>
          <label class="understanding-label" for="understanding-${escapeHtml(topic.id)}">Arusaamine</label>
          <select id="understanding-${escapeHtml(topic.id)}" class="understanding-select" data-understanding data-topic-id="${escapeHtml(topic.id)}" aria-label="${escapeHtml(topic.name)} arusaamise hinnang">
            ${[1, 2, 3, 4, 5].map(level => `<option value="${level}" ${topic.understanding === level ? "selected" : ""}>${level} / 5 ${["", "Vajan abi", "Harjutan", "Osaliselt", "Hästi", "Selge"][level]}</option>`).join("")}
          </select>
          <div class="topic-actions"><button class="small-button" data-open-cards="${escapeHtml(topic.id)}" type="button">Mälukaardid</button><button class="delete-button" data-delete-topic="${escapeHtml(topic.id)}" type="button" aria-label="Kustuta teema ${escapeHtml(topic.name)}">×</button></div>
        </div>`).join("") : '<p class="empty-state">Lisa esimene teema, et õppimist jälgida.</p>'}</div>
      <form class="topic-add-form" data-subject-id="${escapeHtml(subject.id)}"><label class="visually-hidden" for="new-topic-${escapeHtml(subject.id)}">Uue teema nimi</label><input id="new-topic-${escapeHtml(subject.id)}" name="topic" maxlength="80" placeholder="Uue teema nimi" required><button type="submit">+ Lisa teema</button></form>
    </article>`).join("");
}
