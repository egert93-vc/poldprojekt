import { getState, updateState, createId, allTopics, findTopic, localDateString } from "./storage.js";

let mode = "focus";
let secondsLeft = 25 * 60;
let intervalId = null;
let sessionStartedAt = null;
let timerEndsAt = null;
let timerPaused = false;
let topicAtStart = "";

const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function updateDisplay() {
  document.querySelector("#timer-display").textContent = formatTime(secondsLeft);
  document.querySelector("#timer-start").textContent = intervalId ? "Peata" : timerPaused ? "Jätka" : mode === "focus" ? "Alusta fookust" : "Alusta pausi";
  const topicSelect = document.querySelector("#timer-topic-select");
  topicSelect.disabled = !topicSelect.options.length || Boolean(intervalId || sessionStartedAt || (timerPaused && mode === "focus"));
}

function saveFocusedSession(elapsedSeconds) {
  if (!topicAtStart || elapsedSeconds <= 0) return;
  const minutes = Math.max(0.1, Math.round(elapsedSeconds / 6) / 10);
  updateState(state => {
    const result = findTopic(state, topicAtStart);
    if (!result) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Õppeseanssi ei salvestatud, sest valitud teemat enam ei leidu." }));
      return;
    }
    state.sessions.push({
      id: createId(),
      topicId: topicAtStart,
      subjectId: result.subject.id,
      minutes,
      date: localDateString(),
      completedAt: new Date().toISOString()
    });
  });
  document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: `${minutes} õppeminutit salvestatud.` }));
}

function switchMode(nextMode) {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  timerEndsAt = null;
  timerPaused = false;
  if (mode === "focus" && sessionStartedAt) {
    saveFocusedSession(Math.floor((Date.now() - sessionStartedAt) / 1000));
  }
  mode = nextMode;
  sessionStartedAt = null;
  const state = getState();
  secondsLeft = (mode === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
  document.querySelectorAll(".mode-button").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  document.querySelector("#timer-status").textContent = mode === "focus" ? "Valmis, kui sina oled." : "Hinga korraks ja puhka.";
  updateDisplay();
}

function startTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    timerEndsAt = null;
    if (mode === "focus" && sessionStartedAt) {
      const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000);
      saveFocusedSession(elapsed);
      sessionStartedAt = null;
      document.querySelector("#timer-status").textContent = "Sessioon salvestatud. Saad jätkata, kui oled valmis.";
    } else {
      document.querySelector("#timer-status").textContent = "Taimer peatatud.";
    }
    timerPaused = true;
    updateDisplay();
    return;
  }
  if (mode === "focus" && !sessionStartedAt && !timerPaused) {
    topicAtStart = document.querySelector("#timer-topic-select").value;
    if (!topicAtStart) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Vali enne taimeri käivitamist teema." }));
      return;
    }
    sessionStartedAt = Date.now();
  }
  if (mode === "focus" && !sessionStartedAt) sessionStartedAt = Date.now();
  timerPaused = false;
  timerEndsAt = Date.now() + secondsLeft * 1000;
  document.querySelector("#timer-status").textContent = mode === "focus" ? "Fookus on alanud. Üks asi korraga." : "Naudi oma pausi.";
  intervalId = window.setInterval(() => {
    secondsLeft = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    updateDisplay();
    if (secondsLeft === 0) {
      clearInterval(intervalId);
      intervalId = null;
      timerEndsAt = null;
      timerPaused = false;
      if (mode === "focus") {
        saveFocusedSession(Math.floor((Date.now() - sessionStartedAt) / 1000));
        sessionStartedAt = null;
        mode = "break";
        secondsLeft = getState().settings.breakMinutes * 60;
        document.querySelector("#timer-status").textContent = `Tubli töö! Fookusaeg on läbi. Nüüd ${getState().settings.breakMinutes} minutit pausi.`;
      } else {
        mode = "focus";
        secondsLeft = getState().settings.focusMinutes * 60;
        document.querySelector("#timer-status").textContent = "Paus on läbi. Alusta uut fookusaega, kui oled valmis.";
      }
      document.querySelectorAll(".mode-button").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
      updateDisplay();
    }
  }, 1000);
  updateDisplay();
}

export function initTimer() {
  document.querySelector("#timer-start").addEventListener("click", startTimer);
  document.querySelector("#timer-reset").addEventListener("click", () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    timerEndsAt = null;
    if (mode === "focus" && sessionStartedAt) {
      saveFocusedSession(Math.floor((Date.now() - sessionStartedAt) / 1000));
    }
    sessionStartedAt = null;
    timerPaused = false;
    topicAtStart = "";
    const state = getState();
    secondsLeft = (mode === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
    document.querySelector("#timer-status").textContent = "Taimer lähtestatud.";
    updateDisplay();
  });
  document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  document.querySelector("#save-durations").addEventListener("click", () => {
    if (intervalId) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Peata taimer enne kestuse muutmist." }));
      return;
    }
    const focusMinutes = Number(document.querySelector("#focus-duration").value);
    const breakMinutes = Number(document.querySelector("#break-duration").value);
    if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 120 || !Number.isInteger(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
      document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Fookus peab olema 1–120 ja paus 1–60 minutit." }));
      return;
    }
    updateState(state => {
      state.settings.focusMinutes = focusMinutes;
      state.settings.breakMinutes = breakMinutes;
    });
    secondsLeft = (mode === "focus" ? focusMinutes : breakMinutes) * 60;
    document.querySelector("#timer-status").textContent = "Kestus salvestatud.";
    document.dispatchEvent(new CustomEvent("opiabi:toast", { detail: "Taimeri kestus salvestatud." }));
    updateDisplay();
  });
  renderTimer();
}

export function renderTimer() {
  const state = getState();
  const select = document.querySelector("#timer-topic-select");
  const previous = select.value;
  const topics = allTopics(state);
  select.innerHTML = topics.length
    ? topics.map(topic => `<option value="${topic.id}">${escapeHtml(topic.subjectName)} — ${escapeHtml(topic.name)}</option>`).join("")
    : '<option value="">Lisa enne aine ja teema</option>';
  if (topics.some(topic => topic.id === previous)) select.value = previous;
  select.disabled = !topics.length || Boolean(intervalId || sessionStartedAt || (timerPaused && mode === "focus"));
  document.querySelector("#focus-label").textContent = `${state.settings.focusMinutes} min`;
  document.querySelector("#break-label").textContent = `${state.settings.breakMinutes} min`;
  document.querySelector("#focus-duration").value = state.settings.focusMinutes;
  document.querySelector("#break-duration").value = state.settings.breakMinutes;
  if (!intervalId && !sessionStartedAt && (secondsLeft === 25 * 60 || secondsLeft === 0)) {
    secondsLeft = (mode === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
  }
  updateDisplay();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
