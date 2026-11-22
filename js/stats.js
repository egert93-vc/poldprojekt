import { getState, allTopics, localDateString } from "./storage.js";

const PALETTE = ["#78a886", "#b39acb", "#d4a47b", "#7fa7b4", "#c98787", "#a9a96f", "#7796c2", "#c18d65"];
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function getWeekDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    return localDateString(date);
  });
}

function calculateStreak(state) {
  const dates = new Set(state.sessions.filter(session => session.minutes > 0).map(session => session.date));
  for (const topic of allTopics(state)) {
    for (const card of topic.cards) {
      if (card.reviews > 0 && topic.lastReviewed) dates.add(topic.lastReviewed);
    }
  }
  let date = new Date();
  date.setHours(12, 0, 0, 0);
  if (!dates.has(localDateString(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateString(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function drawChart(state) {
  const target = document.querySelector("#weekly-chart");
  const dates = getWeekDates();
  const subjects = state.subjects;
  if (!subjects.length) {
    target.innerHTML = '<div class="empty-state">Lisa aineid ja õpi natuke, et siin oma nädalat näha.</div>';
    return;
  }
  const width = 620, height = 220, left = 40, top = 15, chartHeight = 160, chartWidth = 550;
  const dayWidth = chartWidth / 7;
  const daily = dates.map(date => subjects.map(subject => state.sessions
    .filter(session => session.subjectId === subject.id && session.date === date)
    .reduce((sum, session) => sum + session.minutes, 0)));
  const maximum = Math.max(30, ...daily.map(values => values.reduce((sum, value) => sum + value, 0)));
  const scale = chartHeight / maximum;
  const grid = [0, .5, 1].map(fraction => {
    const y = top + chartHeight * fraction;
    return `<line x1="${left}" y1="${y}" x2="${left + chartWidth}" y2="${y}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y + 3}" text-anchor="end" fill="var(--muted)" font-size="9">${Math.round(maximum * (1 - fraction))}</text>`;
  }).join("");
  const bars = daily.map((values, dayIndex) => {
    let stacked = 0;
    return values.map((value, subjectIndex) => {
      if (!value) return "";
      const barHeight = Math.max(2, value * scale);
      const x = left + dayWidth * dayIndex + dayWidth * .25;
      const y = top + chartHeight - (stacked + value) * scale;
      stacked += value;
      return `<rect x="${x}" y="${y}" width="${dayWidth * .5}" height="${barHeight}" rx="3" fill="${PALETTE[subjectIndex % PALETTE.length]}"><title>${escapeHtml(subjects[subjectIndex].name)}: ${value} min</title></rect>`;
    }).join("");
  }).join("");
  const labels = dates.map((date, index) => {
    const label = new Intl.DateTimeFormat("et-EE", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
    return `<text x="${left + dayWidth * (index + .5)}" y="${top + chartHeight + 20}" text-anchor="middle" fill="var(--muted)" font-size="9">${label}</text>`;
  }).join("");
  const legend = subjects.map((subject, index) => `<span class="legend-item"><i class="legend-dot" style="background:${PALETTE[index % PALETTE.length]}"></i>${escapeHtml(subject.name)}</span>`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Viimase seitsme päeva õppeminutid aine kaupa">${grid}${bars}${labels}</svg><div class="chart-legend">${legend}</div>`;
}

export function renderStats() {
  const state = getState();
  const topics = allTopics(state);
  const dates = getWeekDates();
  const weekSessions = state.sessions.filter(session => dates.includes(session.date));
  const totalMinutes = Math.round(weekSessions.reduce((sum, session) => sum + session.minutes, 0) * 10) / 10;
  const reviews = topics.reduce((sum, topic) => sum + topic.cards.reduce((cardSum, card) => cardSum + (card.reviews || 0), 0), 0);
  const streak = calculateStreak(state);
  document.querySelector("#week-minutes").textContent = `${totalMinutes} min`;
  document.querySelector("#week-subtitle").textContent = totalMinutes ? "Tubli, jätka omas tempos" : "Iga minut loeb";
  document.querySelector("#cards-reviewed").textContent = reviews;
  document.querySelector("#study-streak").textContent = `${streak} ${streak === 1 ? "päev" : "päeva"}`;
  document.querySelector("#progress-summary").innerHTML = `
    <div class="progress-item"><span>Õppinud sel nädalal</span><strong>${totalMinutes} min</strong></div>
    <div class="progress-item"><span>Korratud kaarte kokku</span><strong>${reviews}</strong></div>
    <div class="progress-item"><span>Õppimise jada</span><strong>${streak} ${streak === 1 ? "päev" : "päeva"}</strong></div>
    <div class="progress-item"><span>Teemasid jälgimisel</span><strong>${topics.length}</strong></div>`;
  drawChart(state);
  const bySubject = state.subjects.map(subject => ({
    name: subject.name,
    minutes: Math.round(weekSessions.filter(session => session.subjectId === subject.id).reduce((sum, session) => sum + session.minutes, 0) * 10) / 10
  }));
  const maximum = Math.max(1, ...bySubject.map(subject => subject.minutes));
  document.querySelector("#subject-minutes").innerHTML = bySubject.length
    ? bySubject.map(subject => `<div class="minute-row"><strong>${escapeHtml(subject.name)}</strong><div class="minute-bar" aria-label="${subject.minutes} min"><span style="width:${Math.round(subject.minutes / maximum * 100)}%"></span></div><small>${subject.minutes} min</small></div>`).join("")
    : '<p class="empty-state">Aineid pole veel lisatud.</p>';
}

export function renderDashboard() {
  const state = getState();
  const topics = allTopics(state);
  const today = localDateString();
  const candidates = topics.map(topic => {
    const daysSinceReview = topic.lastReviewed
      ? Math.floor((new Date(`${today}T12:00:00`) - new Date(`${topic.lastReviewed}T12:00:00`)) / 86400000)
      : Infinity;
    const overdue = topic.cards.filter(card => card.due && card.due <= today).length;
    const score = (6 - topic.understanding) * 2 + Math.min(Number.isFinite(daysSinceReview) ? daysSinceReview : 4, 14) + overdue * 2;
    return { ...topic, daysSinceReview, overdue, score };
  }).sort((a, b) => b.score - a.score).slice(0, 4);
  const weakList = document.querySelector("#weak-list");
  weakList.innerHTML = candidates.length
    ? candidates.map(topic => `<div class="weak-item"><div><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.subjectName)} · ${topic.overdue ? `${topic.overdue} kaarti ootab kordamist` : Number.isFinite(topic.daysSinceReview) ? `Viimati vaadatud ${topic.daysSinceReview} päeva tagasi` : "Pole veel korratud"}</small></div><span class="weak-score">${topic.understanding}/5</span></div>`).join("")
    : '<div class="empty-state">Lisa aineid ja teemasid, et leida koos järgmine hea õppimissamm.</div>';
  const todayPlans = state.plans.filter(plan => plan.examDate >= today);
  const planArea = document.querySelector("#today-plan");
  if (todayPlans.length) {
    const plan = todayPlans.sort((a, b) => a.examDate.localeCompare(b.examDate))[0];
    const topic = topics.find(item => item.id === plan.topicId);
    planArea.innerHTML = topic ? `<div class="today-task"><span class="task-date">TÄNANE VÄIKE SAMM</span><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.subjectName)} · Kontrolltöö ${new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "long" }).format(new Date(`${plan.examDate}T12:00:00`))}</small><button type="button" data-go="planner">Vaata plaani →</button></div>` : '<div class="empty-state">Lisa õppeplaan, et näha tänast ülesannet.</div>';
  } else if (candidates.length) {
    planArea.innerHTML = `<div class="today-task"><span class="task-date">SOOVITUS TÄNA</span><strong>${escapeHtml(candidates[0].name)}</strong><small>${escapeHtml(candidates[0].subjectName)} · Alusta 15-minutilise kordamisega</small><button type="button" data-go="timer">Alusta fookusaega →</button></div>`;
  } else {
    planArea.innerHTML = '<div class="empty-state">Lisa aine või kontrolltöö plaan, et valida tänane väike samm.</div>';
  }
}
