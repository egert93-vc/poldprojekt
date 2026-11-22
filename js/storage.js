const STORAGE_KEY = "opiabi-data-v1";

export function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function starterData() {
  const subjectId = createId();
  const topicId = createId();
  const cards = [
    { id: createId(), question: "Mis on murdude liitmise kõige olulisem reegel?", answer: "Nimetajad peavad olema võrdsed. Vajadusel teisenda murrud ühise nimetajaga murdudeks.", due: localDateString(), interval: 0, repetitions: 0, ease: 2.5, reviews: 0 },
    { id: createId(), question: "Kuidas leida arvust 3/4?", answer: "Jaga arv neljaks võrdseks osaks ja võta neist kolm.", due: localDateString(), interval: 0, repetitions: 0, ease: 2.5, reviews: 0 }
  ];
  return {
    version: 1,
    onboardingComplete: false,
    subjects: [{
      id: subjectId,
      name: "Matemaatika",
      topics: [{ id: topicId, name: "Murrud", understanding: 2, lastReviewed: null, cards }]
    }],
    sessions: [],
    plans: [],
    settings: { theme: "light", focusMinutes: 25, breakMinutes: 5 }
  };
}

export function getState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = starterData();
    saveState(initial);
    return initial;
  }
  const state = JSON.parse(saved);
  if (!state || state.version !== 1 || !Array.isArray(state.subjects) || !Array.isArray(state.sessions) || !Array.isArray(state.plans)) {
    throw new Error("ÕpiAbi salvestatud andmed ei ole loetavas vormingus. Ekspordi fail enne andmete lähtestamist.");
  }
  state.settings = { theme: "light", focusMinutes: 25, breakMinutes: 5, ...(state.settings || {}) };
  return state;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = starterData();
  saveState(state);
  document.dispatchEvent(new CustomEvent("opiabi:datachange"));
  return state;
}

export function updateState(updater) {
  const state = getState();
  updater(state);
  saveState(state);
  document.dispatchEvent(new CustomEvent("opiabi:datachange"));
  return state;
}

export function allTopics(state = getState()) {
  return state.subjects.flatMap(subject => subject.topics.map(topic => ({ ...topic, subjectId: subject.id, subjectName: subject.name })));
}

export function findTopic(state, topicId) {
  for (const subject of state.subjects) {
    const topic = subject.topics.find(item => item.id === topicId);
    if (topic) return { subject, topic };
  }
  return null;
}

export function importState(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.subjects) || !Array.isArray(data.sessions) || !Array.isArray(data.plans)) {
    throw new Error("Valitud fail ei sisalda sobiva kujuga ÕpiAbi andmeid.");
  }
  const validSubjects = data.subjects.every(subject =>
    subject && typeof subject.id === "string" && typeof subject.name === "string" && Array.isArray(subject.topics) &&
    subject.topics.every(topic => topic && typeof topic.id === "string" && typeof topic.name === "string" &&
      Number.isInteger(topic.understanding) && topic.understanding >= 1 && topic.understanding <= 5 && Array.isArray(topic.cards) &&
      topic.cards.every(card => card && typeof card.id === "string" && typeof card.question === "string" && typeof card.answer === "string"))
  );
  const isDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && localDateString(date) === value;
  };
  const validSessions = data.sessions.every(session => session && typeof session.topicId === "string" && Number.isFinite(session.minutes) && session.minutes >= 0 && isDate(session.date));
  const validPlans = data.plans.every(plan => plan && typeof plan.id === "string" && typeof plan.topicId === "string" && isDate(plan.examDate) && (!plan.createdDate || isDate(plan.createdDate)));
  if (!validSubjects || !validSessions || !validPlans) {
    throw new Error("Andmefailis on vigaseid või puuduvaid välju. Olemasolevaid andmeid ei muudetud.");
  }
  const clean = {
    version: 1,
    onboardingComplete: true,
    subjects: data.subjects,
    sessions: data.sessions,
    plans: data.plans,
    settings: {
      theme: data.settings && data.settings.theme === "dark" ? "dark" : "light",
      focusMinutes: Number.isInteger(data.settings && data.settings.focusMinutes) ? Math.min(120, Math.max(1, data.settings.focusMinutes)) : 25,
      breakMinutes: Number.isInteger(data.settings && data.settings.breakMinutes) ? Math.min(60, Math.max(1, data.settings.breakMinutes)) : 5
    }
  };
  saveState(clean);
  document.dispatchEvent(new CustomEvent("opiabi:datachange"));
  return clean;
}
