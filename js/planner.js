import { getState, updateState, createId, allTopics, localDateString } from "./storage.js";

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const dateAtNoon = value => new Date(`${value}T12:00:00`);
const shortDate = value => new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "short" }).format(dateAtNoon(value));

export function initPlanner() {
  document.querySelector("#plan-form").addEventListener("submit", event => {
    event.preventDefault();
    const topicId = document.querySelector("#plan-topic-select").value;
    const examDate = document.querySelector("#exam-date").value;
    if (!topicId || !examDate) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Vali teema ja kontrolltöö kuupäev." }));
      return;
    }
    if (examDate < localDateString()) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Kontrolltöö kuupäev ei saa olla minevikus." }));
      return;
    }
    updateState(state => state.plans.push({ id: createId(), topicId, examDate, createdDate: localDateString() }));
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Õppeplaan koostatud." }));
  });
  document.querySelector("#plans-list").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-plan]");
    if (!button) return;
    updateState(state => { state.plans = state.plans.filter(plan => plan.id !== button.dataset.deletePlan); });
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Õppeplaan kustutatud." }));
  });
}

export function renderPlanner() {
  const state = getState();
  const select = document.querySelector("#plan-topic-select");
  const previous = select.value;
  const topics = allTopics(state);
  select.innerHTML = topics.length
    ? topics.map(topic => `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.subjectName)} — ${escapeHtml(topic.name)}</option>`).join("")
    : '<option value="">Lisa esmalt aine ja teema</option>';
  if (topics.some(topic => topic.id === previous)) select.value = previous;
  select.disabled = !topics.length;
  document.querySelector("#plan-form button").disabled = !topics.length;
  const target = document.querySelector("#plans-list");
  if (!state.plans.length) {
    target.innerHTML = '<div class="panel empty-state">Sul pole veel kontrolltöid plaanis. Lisa kuupäev ja teema, et kordamine päevade peale jagada.</div>';
    return;
  }
  const today = localDateString();
  target.innerHTML = state.plans.map(plan => {
    const topic = topics.find(item => item.id === plan.topicId);
    if (!topic) return "";
    const start = plan.createdDate && plan.createdDate > today ? plan.createdDate : today;
    const startDate = dateAtNoon(start);
    const endDate = dateAtNoon(plan.examDate);
    const dayCount = Math.max(1, Math.floor((endDate - startDate) / 86400000) + 1);
    const displayCount = Math.min(7, dayCount);
    const days = Array.from({ length: displayCount }, (_, index) => {
      const offset = displayCount === dayCount ? index : Math.floor(index * (dayCount - 1) / (displayCount - 1));
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);
      const value = localDateString(date);
      return `<div class="plan-day ${value === today ? "today" : ""} ${value === plan.examDate ? "exam" : ""}"><strong>${value === plan.examDate ? "Töö" : shortDate(value)}</strong><small>${value === plan.examDate ? "kontrolltöö" : "korda teemat"}</small></div>`;
    }).join("");
    const todayLabel = plan.examDate < today ? "Kontrolltöö kuupäev on möödas." : plan.examDate === today ? "Kontrolltöö on täna — hinga sügavalt ja anna endast parim." : "Tänane ülesanne: korda seda teemat 15 minutit.";
    return `<article class="panel plan-card"><div class="plan-card-header"><div><h3>${escapeHtml(topic.subjectName)} — ${escapeHtml(topic.name)}</h3><p>${todayLabel} Kontrolltöö: ${shortDate(plan.examDate)}.</p></div><button class="delete-button" data-delete-plan="${escapeHtml(plan.id)}" type="button" aria-label="Kustuta plaan teemale ${escapeHtml(topic.name)}">Kustuta</button></div><div class="plan-days" aria-label="Kordamise jaotus">${days}</div></article>`;
  }).join("");
}
