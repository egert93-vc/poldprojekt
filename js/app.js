import { getState, updateState, importState, resetState, localDateString } from "./storage.js";
import { initSubjects, renderSubjects } from "./subjects.js";
import { initFlashcards, renderFlashcards, setFlashcardTopic } from "./flashcards.js";
import { initTimer, renderTimer } from "./timer.js";
import { initPlanner, renderPlanner } from "./planner.js";
import { renderStats, renderDashboard } from "./stats.js";

const viewTitles = {
  dashboard: "Tere tulemast tagasi",
  subjects: "Sinu ained ja teemad",
  cards: "Mälukaardid",
  timer: "Sinu fookusaeg",
  planner: "Õpi omas tempos",
  stats: "Iga samm on edenemine"
};
let toastTimeout;

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function navigate(view) {
  if (!viewTitles[view]) return;
  document.querySelectorAll(".view").forEach(section => {
    const active = section.id === `view-${view}`;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });
  document.querySelectorAll(".nav-link").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelector("#page-title").textContent = viewTitles[view];
  if (view === "cards") renderFlashcards();
  if (view === "timer") renderTimer();
  if (view === "planner") renderPlanner();
  if (view === "stats") renderStats();
  if (view === "dashboard") renderDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderSubjects();
  renderFlashcards();
  renderTimer();
  renderPlanner();
  renderStats();
  renderDashboard();
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  document.querySelector("#theme-toggle .theme-label").textContent = theme === "dark" ? "Hele režiim" : "Tume režiim";
  document.querySelector("#theme-toggle").setAttribute("aria-label", theme === "dark" ? "Lülita heledat režiimi" : "Lülita tumedat režiimi");
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#1d2521" : "#f5f7f5";
}

function exportData() {
  const data = getState();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `opiabi-andmed-${localDateString()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Andmed eksporditud JSON-failina.");
}

function initImportExport() {
  document.querySelector("#export-button").addEventListener("click", exportData);
  const fileInput = document.querySelector("#import-file");
  document.querySelector("#import-button").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      if (!window.confirm("Import asendab selle seadme praegused ÕpiAbi andmed. Kas soovid jätkata?")) return;
      const imported = importState(JSON.parse(await file.text()));
      applyTheme(imported.settings.theme);
      showToast("Andmed edukalt imporditud.");
    } catch (error) {
      showToast(error instanceof SyntaxError ? "Fail ei ole korrektne JSON-fail." : error.message);
    } finally {
      fileInput.value = "";
    }
  });
}

function initNavigation() {
  document.querySelector(".main-nav").addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) navigate(button.dataset.view);
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-go]");
    if (button) navigate(button.dataset.go);
  });
  document.addEventListener("opiabi:navigate", event => {
    if (event.detail.view === "cards") setFlashcardTopic(event.detail.topicId);
    navigate(event.detail.view);
  });
}

function initOnboarding() {
  const state = getState();
  const dialog = document.querySelector("#welcome-dialog");
  document.querySelector("#welcome-close").addEventListener("click", () => {
    updateState(data => { data.onboardingComplete = true; });
    dialog.close();
  });
  if (!state.onboardingComplete && typeof dialog.showModal === "function") dialog.showModal();
}

function initReset() {
  document.querySelector("#reset-demo").addEventListener("click", () => {
    if (!window.confirm("See asendab kogu selle seadme ÕpiAbi info näidisandmetega. Kas soovid jätkata?")) return;
    resetState();
    applyTheme("light");
    showToast("Näidisandmed taastatud.");
  });
}

function startApp() {
  const date = new Intl.DateTimeFormat("et-EE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  document.querySelector("#today-label").textContent = date;
  initSubjects();
  initFlashcards();
  initTimer();
  initPlanner();
  initImportExport();
  initNavigation();
  initReset();
  const state = getState();
  applyTheme(state.settings.theme);
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    const theme = getState().settings.theme === "dark" ? "light" : "dark";
    updateState(data => { data.settings.theme = theme; });
    applyTheme(theme);
  });
  document.addEventListener("opiabi:datachange", renderAll);
  document.addEventListener("opiabi:toast", event => showToast(event.detail));
  renderAll();
  initOnboarding();
}

try {
  startApp();
} catch (error) {
  document.querySelector("#main").innerHTML = `<section class="panel empty-state"><h2>ÕpiAbi ei saanud käivituda</h2><p>${String(error.message).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character])}</p><p>Salvestatud andmete probleemide korral laadi enne lähtestamist alla JSON-varukoopia.</p></section>`;
}
