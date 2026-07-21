/* stopwatch.js: 科目入力できるストップウォッチ計測を担当します。 */
window.App = window.App || {};

App.stopwatchKey = "study-tracker-stopwatch";

App.stopwatch = {
  status: "idle",
  startedAt: null,
  elapsedSeconds: 0,
  subject: "",
  interval: null,
};

App.loadStopwatch = function loadStopwatch() {
  try {
    const saved = JSON.parse(localStorage.getItem(App.stopwatchKey));
    if (saved) App.stopwatch = { ...App.stopwatch, ...saved, interval: null };
    if (App.stopwatch.status === "running") {
      App.stopwatch.interval = window.setInterval(App.renderStopwatch, 1000);
    }
  } catch {
  }
};

App.saveStopwatch = function saveStopwatch() {
  const { interval, ...data } = App.stopwatch;
  localStorage.setItem(App.stopwatchKey, JSON.stringify(data));
};

App.stopwatchSeconds = function stopwatchSeconds() {
  const watch = App.stopwatch;
  if (watch.status !== "running" || !watch.startedAt) return watch.elapsedSeconds;
  return watch.elapsedSeconds + Math.floor((Date.now() - new Date(watch.startedAt).getTime()) / 1000);
};

App.formatStopwatchTime = function formatStopwatchTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${App.pad(hours)}:${App.pad(minutes)}:${App.pad(seconds)}`;
};

App.startStopwatch = function startStopwatch() {
  if (App.stopwatch.status === "running") return;
  App.stopwatch.status = "running";
  App.stopwatch.startedAt = new Date().toISOString();
  App.stopwatch.subject = App.el.stopwatchSubjectInput.value.trim();
  App.saveStopwatch();
  App.renderStopwatch();
  App.stopwatch.interval = window.setInterval(App.renderStopwatch, 1000);
};

App.pauseStopwatch = function pauseStopwatch() {
  if (App.stopwatch.status !== "running") return;
  window.clearInterval(App.stopwatch.interval);
  App.stopwatch.interval = null;
  App.stopwatch.elapsedSeconds = App.stopwatchSeconds();
  App.stopwatch.startedAt = null;
  App.stopwatch.status = "paused";
  App.stopwatch.subject = App.el.stopwatchSubjectInput.value.trim();
  App.saveStopwatch();
  App.renderStopwatch();
};

App.resetStopwatch = function resetStopwatch() {
  window.clearInterval(App.stopwatch.interval);
  App.stopwatch = {
    status: "idle",
    startedAt: null,
    elapsedSeconds: 0,
    subject: "",
    interval: null,
  };
  localStorage.removeItem(App.stopwatchKey);
  if (App.el.stopwatchSubjectInput) App.el.stopwatchSubjectInput.value = "";
  App.renderStopwatch();
};

App.saveStopwatchRecord = function saveStopwatchRecord() {
  const seconds = App.stopwatchSeconds();
  if (seconds <= 0) {
    App.el.stopwatchStatus.textContent = "まだ記録できる時間がありません";
    return;
  }

  const subject = App.el.stopwatchSubjectInput.value.trim() || App.stopwatch.subject || "フリー";
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - seconds * 1000);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const record = {
    id: `record-${Date.now()}`,
    date: App.dateKey(endDate),
    subject,
    minutes,
    start: App.timeLabel(startDate),
    end: App.timeLabel(endDate),
    memo: "ストップウォッチ計測",
    tags: [],
  };

  App.state.records.push(record);
  App.addSubject(subject);
  App.savePart("records");
  App.updateStatisticsCache();
  App.resetStopwatch();
  App.renderAll();
  App.el.stopwatchStatus.textContent = `${App.formatMinutes(minutes)} を「${subject}」で今日の勉強時間に追加しました`;
};

App.renderStopwatch = function renderStopwatch() {
  if (!App.el.stopwatchText) return;
  const seconds = App.stopwatchSeconds();
  App.el.stopwatchText.textContent = App.formatStopwatchTime(seconds);
  App.el.stopwatchStartPauseButton.textContent = App.stopwatch.status === "running" ? "一時停止" : "スタート";
  if (App.el.stopwatchSubjectInput && document.activeElement !== App.el.stopwatchSubjectInput) {
    App.el.stopwatchSubjectInput.value = App.stopwatch.subject || App.el.stopwatchSubjectInput.value;
  }
  if (App.stopwatch.status === "running") {
    App.el.stopwatchStatus.textContent = "計測中。画面を切り替えても続きます";
  } else if (seconds > 0) {
    App.el.stopwatchStatus.textContent = "停止中。記録できます";
  } else {
    App.el.stopwatchStatus.textContent = "科目を入力して、今から勉強した時間を測れます";
  }
};
