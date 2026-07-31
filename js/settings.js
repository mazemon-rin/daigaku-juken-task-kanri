/* settings.js: 設定、目標、CSV/JSONバックアップを担当します。 */
window.App = window.App || {};

App.renderSettings = function renderSettings() {
  const settings = App.state.settings;
  App.el.soundToggle.checked = settings.soundEnabled;
  App.el.vibrationToggle.checked = settings.vibrationEnabled;
  App.el.wakeLockToggle.checked = settings.wakeLockEnabled;
  App.el.themeToggle.checked = settings.darkMode;
  App.el.autoSaveToggle.checked = settings.autoSave;
  App.el.defaultStudyInput.value = settings.defaultStudyMinutes;
  App.el.defaultBreakInput.value = settings.defaultBreakMinutes;
  App.el.settingsGoalInput.value = App.state.goals.dailyGoalHours;
  App.el.dailyGoalInput.value = App.state.goals.dailyGoalHours;
  App.el.examNameInput.value = settings.examName;
  App.el.examDateInput.value = settings.examDate;
  App.el.vibrationSupportText.textContent = "vibrate" in navigator
    ? "この端末ではバイブレーションに対応している可能性があります"
    : "この端末のブラウザではバイブレーションに対応していません";
  document.body.classList.toggle("dark", settings.darkMode);
  App.renderExamCountdown();
  App.renderGoalProgress();
};

App.renderGoalProgress = function renderGoalProgress() {
  const today = App.minutesForDate(App.dateKey());
  const goal = Math.max(0, Number(App.state.goals.dailyGoalHours) * 60);
  const left = Math.max(0, goal - today);
  App.el.todayGoalSummary.textContent = `${App.formatMinutes(today)} / ${App.formatMinutes(goal)}`;
  App.el.todayGoalBar.style.width = `${goal ? Math.min(100, (today / goal) * 100) : 100}%`;
  App.el.todayGoalLeft.textContent = left ? `残り ${App.formatMinutes(left)}` : "今日の目標達成";
};

App.todaysPlan = function todaysPlan() {
  const today = App.dateKey();
  if (!Array.isArray(App.state.dailyPlans[today])) App.state.dailyPlans[today] = [];
  return App.state.dailyPlans[today];
};

App.dateOptionsFrom = function dateOptionsFrom(source) {
  return Object.keys(source || {})
    .filter((date) => Array.isArray(source[date]) && source[date].length)
    .sort((a, b) => b.localeCompare(a));
};

App.fillHistorySelect = function fillHistorySelect(select, dates) {
  select.innerHTML = "";
  if (!dates.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "履歴なし";
    select.append(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  dates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    select.append(option);
  });
};

App.renderReuseSelectors = function renderReuseSelectors() {
  App.fillHistorySelect(App.el.planHistorySelect, App.dateOptionsFrom(App.state.dailyPlans));
  App.fillHistorySelect(App.el.taskHistorySelect, App.dateOptionsFrom(App.state.tasks));
};

App.addDailyPlanItem = function addDailyPlanItem() {
  const title = App.el.planTitleInput.value.trim();
  if (!title) {
    App.el.planTitleInput.focus();
    return;
  }
  App.todaysPlan().push({
    start: App.el.planStartInput.value,
    end: App.el.planEndInput.value,
    title,
    note: App.el.planNoteInput.value.trim(),
  });
  App.el.planTitleInput.value = "";
  App.el.planNoteInput.value = "";
  App.renderDailyPlan();
};

App.renderDailyPlan = function renderDailyPlan() {
  const list = App.todaysPlan()
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => `${a.start || "99:99"}${a.end || ""}`.localeCompare(`${b.start || "99:99"}${b.end || ""}`));
  App.el.dailyPlanList.innerHTML = "";
  if (!list.length) {
    App.el.dailyPlanList.innerHTML = '<p class="empty-state">今日の計画はまだありません</p>';
    App.savePart("dailyPlans");
    App.renderReuseSelectors();
    return;
  }
  list.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "plan-item";
    const time = item.start || item.end ? `${item.start || "--:--"} - ${item.end || "--:--"}` : "時間未定";
    row.innerHTML = `
      <div class="plan-time">${App.escapeHtml(time)}</div>
      <div class="plan-main">
        <strong>${App.escapeHtml(item.title)}</strong>
        ${item.note ? `<span>${App.escapeHtml(item.note)}</span>` : ""}
      </div>
      <button type="button" class="text-button" data-delete-plan="${item.index}">削除</button>
    `;
    App.el.dailyPlanList.append(row);
  });
  App.savePart("dailyPlans");
  App.renderReuseSelectors();
};

App.renderExamCountdown = function renderExamCountdown() {
  if (!App.state.settings.examDate) {
    App.el.examCountdown.textContent = "未設定";
    return;
  }
  const days = Math.ceil((App.parseDate(App.state.settings.examDate) - App.parseDate(App.dateKey())) / 86400000);
  App.el.examCountdown.textContent = days >= 0
    ? `${App.state.settings.examName || "試験"}まで あと${days}日`
    : `${App.state.settings.examName || "試験"}から ${Math.abs(days)}日経過`;
};

App.todaysTasks = function todaysTasks() {
  const today = App.dateKey();
  if (!Array.isArray(App.state.tasks[today])) App.state.tasks[today] = [];
  return App.state.tasks[today];
};

App.renderTasks = function renderTasks() {
  const list = App.todaysTasks();
  const done = list.filter((task) => task.done).length;
  const progressText = list.length ? `達成率 ${Math.round((done / list.length) * 100)}%` : "今日のタスクはまだありません";

  App.el.taskProgress.textContent = progressText;
  App.el.taskList.innerHTML = "";
  list.forEach((task, index) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.done ? "done" : ""}`;
    item.innerHTML = `
      <label><input type="checkbox" ${task.done ? "checked" : ""} data-task-index="${index}"><span>${App.escapeHtml(task.text)}</span></label>
      <button type="button" class="text-button" data-delete-task="${index}">削除</button>
    `;
    App.el.taskList.append(item);
  });

  App.renderHomeTasks(list, progressText);
  App.savePart("tasks");
  App.renderReuseSelectors();
};

App.renderHomeTasks = function renderHomeTasks(list, progressText) {
  if (!App.el.homeTaskProgress || !App.el.homeTaskList) return;
  App.el.homeTaskProgress.textContent = progressText;
  App.el.homeTaskList.innerHTML = "";
  if (!list.length) {
    App.el.homeTaskList.innerHTML = '<div class="empty-state">今日やることはまだありません</div>';
    return;
  }
  list.forEach((task, index) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.done ? "done" : ""}`;
    item.innerHTML = `
      <label><input type="checkbox" ${task.done ? "checked" : ""} data-home-task-index="${index}"><span>${App.escapeHtml(task.text)}</span></label>
    `;
    App.el.homeTaskList.append(item);
  });
};

App.loadPlanFromHistory = function loadPlanFromHistory() {
  const date = App.el.planHistorySelect.value;
  if (!date || !Array.isArray(App.state.dailyPlans[date])) return;
  App.state.dailyPlans[App.dateKey()] = App.state.dailyPlans[date].map((item) => ({ ...item }));
  App.savePart("dailyPlans");
  App.renderDailyPlan();
};

App.loadTasksFromHistory = function loadTasksFromHistory() {
  const date = App.el.taskHistorySelect.value;
  if (!date || !Array.isArray(App.state.tasks[date])) return;
  App.state.tasks[App.dateKey()] = App.state.tasks[date].map((task) => ({ text: task.text, done: false }));
  App.savePart("tasks");
  App.renderTasks();
};

App.exportFile = function exportFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

App.exportCsv = function exportCsv() {
  const header = ["date", "subject", "minutes", "start", "end", "memo", "tags"];
  const rows = App.state.records.map((record) => header.map((key) => {
    const value = Array.isArray(record[key]) ? record[key].join(" ") : record[key] || "";
    return `"${String(value).replaceAll('"', '""')}"`;
  }).join(","));
  App.exportFile("study.csv", [header.join(","), ...rows].join("\n"), "text/csv");
};

App.importCsv = async function importCsv(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(",").map((item) => item.replaceAll('"', ""));
  const records = lines.map((line, index) => {
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
    const data = {};
    header.forEach((key, i) => data[key] = (cols[i] || "").replace(/^"|"$/g, "").replaceAll('""', '"'));
    return {
      id: `record-${Date.now()}-${index}`,
      date: data.date,
      subject: data.subject,
      minutes: Number(data.minutes) || 0,
      start: data.start,
      end: data.end,
      memo: data.memo || "",
      tags: data.tags ? data.tags.split(/\s+/) : [],
    };
  }).filter((record) => record.date && record.subject && record.minutes > 0);
  App.state.records.push(...records);
  App.savePart("records");
  App.renderAll();
};

App.exportJson = function exportJson() {
  const data = {
    subjects: App.state.subjects,
    records: App.state.records,
    settings: App.state.settings,
    timerState: App.state.timerState,
    statistics: App.state.statistics,
    goals: App.state.goals,
    tasks: App.state.tasks,
    dailyPlans: App.state.dailyPlans,
  };
  App.exportFile("study-tracker-backup.json", JSON.stringify(data, null, 2), "application/json");
};

App.importJson = async function importJson(file) {
  const data = JSON.parse(await file.text());
  ["subjects", "records", "settings", "timerState", "statistics", "goals", "tasks", "dailyPlans"].forEach((key) => {
    if (data[key]) App.state[key] = Array.isArray(App.state[key]) ? data[key] : { ...App.state[key], ...data[key] };
  });
  App.saveAll();
  App.renderAll();
};
