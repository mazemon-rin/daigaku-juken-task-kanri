/* ui.js: タブ切り替え、時計、画面全体の再描画を担当します。 */
window.App = window.App || {};

App.collectElements = function collectElements() {
  App.el = {};
  document.querySelectorAll("[id]").forEach((node) => App.el[node.id] = node);
};

App.renderClock = function renderClock() {
  const now = new Date();
  App.el.todayLabel.textContent = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  App.el.clockText.textContent = `${App.timeLabel(now)}:${App.pad(now.getSeconds())}`;
};

App.switchTab = function switchTab(tabName) {
  document.querySelectorAll(".tab, .tab-page").forEach((node) => node.classList.remove("active"));
  document.querySelectorAll(`.tab[data-tab="${tabName}"]`).forEach((node) => node.classList.add("active"));
  document.querySelector(`#${tabName}`).classList.add("active");
  App.renderAll();
};

App.renderAll = function renderAll() {
  App.renderSubjects();
  App.renderTodayRecords();
  App.renderHistory();
  App.renderSelectedDateHistory();
  App.renderAnalysis();
  App.renderSettings();
  App.renderReuseSelectors();
  App.renderDailyPlan();
  App.renderTasks();
  App.renderTimer();
  App.renderStopwatch();
  App.updateStatisticsCache();
};

App.applySettingInputs = function applySettingInputs() {
  App.state.settings.soundEnabled = App.el.soundToggle.checked;
  App.state.settings.vibrationEnabled = App.el.vibrationToggle.checked;
  App.state.settings.wakeLockEnabled = App.el.wakeLockToggle.checked;
  App.state.settings.darkMode = App.el.themeToggle.checked;
  App.state.settings.autoSave = App.el.autoSaveToggle.checked;
  App.state.settings.defaultStudyMinutes = Number(App.el.defaultStudyInput.value) || 25;
  App.state.settings.defaultBreakMinutes = Number(App.el.defaultBreakInput.value) || 5;
  App.state.goals.dailyGoalHours = Number(App.el.settingsGoalInput.value) || 0;
  App.savePart("settings");
  App.savePart("goals");
  App.renderSettings();
};
