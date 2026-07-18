/* main.js: アプリ初期化とイベント登録を担当します。 */
window.App = window.App || {};

document.addEventListener("DOMContentLoaded", () => {
  App.collectElements();
  App.loadState();
  App.el.minutesInput.value = App.state.timerState.studyMinutes || App.state.settings.defaultStudyMinutes;
  App.el.breakMinutesInput.value = App.state.timerState.breakMinutes || App.state.settings.defaultBreakMinutes;
  App.restoreTimer();
  App.bindEvents();
  App.renderClock();
  window.setInterval(App.renderClock, 1000);
  App.renderAll();
});

App.bindEvents = function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => App.switchTab(tab.dataset.tab));
  });

  document.querySelectorAll(".range-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".range-button").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      App.state.analysisRange = button.dataset.range;
      App.renderAnalysis();
    });
  });

  App.el.startPauseButton.addEventListener("click", () => {
    App.state.timerState.status === "running" ? App.pauseTimer() : App.startTimer();
  });
  App.el.resetButton.addEventListener("click", App.resetTimer);
  App.el.completeButton.addEventListener("click", () => App.finishTimerPhase());
  App.el.minutesInput.addEventListener("input", App.syncDurationInputs);
  App.el.breakMinutesInput.addEventListener("input", App.syncDurationInputs);
  App.el.decreaseMinutes.addEventListener("click", () => adjustInput(App.el.minutesInput, -5, App.syncDurationInputs));
  App.el.increaseMinutes.addEventListener("click", () => adjustInput(App.el.minutesInput, 5, App.syncDurationInputs));
  App.el.decreaseBreak.addEventListener("click", () => adjustInput(App.el.breakMinutesInput, -1, App.syncDurationInputs));
  App.el.increaseBreak.addEventListener("click", () => adjustInput(App.el.breakMinutesInput, 1, App.syncDurationInputs));
  App.el.pomodoroToggle.addEventListener("change", () => {
    App.state.settings.pomodoroEnabled = App.el.pomodoroToggle.checked;
    App.savePart("settings");
  });
  App.el.subjectInput.addEventListener("change", () => App.addSubject(App.el.subjectInput.value));

  App.el.clearTodayButton.addEventListener("click", () => {
    if (!confirm("今日の記録をすべて削除しますか？")) return;
    App.state.records = App.state.records.filter((record) => record.date !== App.dateKey());
    App.savePart("records");
    App.renderAll();
  });
  App.el.historySearch.addEventListener("input", App.renderHistory);
  App.el.trendSubject.addEventListener("change", App.renderSubjectTrend);

  document.body.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-record]");
    const del = event.target.closest("[data-delete-record]");
    const subjectDel = event.target.closest("[data-delete-subject]");
    if (edit) App.editRecord(edit.dataset.editRecord);
    if (del) App.deleteRecord(del.dataset.deleteRecord);
    if (subjectDel) App.deleteSubject(subjectDel.dataset.deleteSubject);
  });

  App.el.saveGoalButton.addEventListener("click", () => {
    App.state.goals.dailyGoalHours = Number(App.el.dailyGoalInput.value) || 0;
    App.savePart("goals");
    App.renderAll();
  });
  App.el.saveExamButton.addEventListener("click", () => {
    App.state.settings.examName = App.el.examNameInput.value.trim() || "試験";
    App.state.settings.examDate = App.el.examDateInput.value;
    App.savePart("settings");
    App.renderExamCountdown();
  });
  App.el.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = App.el.taskInput.value.trim();
    if (!text) return;
    App.todaysTasks().push({ text, done: false });
    App.el.taskInput.value = "";
    App.renderTasks();
  });
  App.el.taskList.addEventListener("click", (event) => {
    const check = event.target.closest("[data-task-index]");
    const del = event.target.closest("[data-delete-task]");
    if (check) App.todaysTasks()[Number(check.dataset.taskIndex)].done = check.checked;
    if (del) App.todaysTasks().splice(Number(del.dataset.deleteTask), 1);
    App.renderTasks();
  });
  App.el.dailyPlanForm.addEventListener("submit", (event) => {
    event.preventDefault();
    App.addDailyPlanItem();
  });
  App.el.dailyPlanList.addEventListener("click", (event) => {
    const del = event.target.closest("[data-delete-plan]");
    if (!del) return;
    App.todaysPlan().splice(Number(del.dataset.deletePlan), 1);
    App.renderDailyPlan();
  });
  App.el.clearPlanButton.addEventListener("click", () => {
    if (!confirm("今日の計画をすべて削除しますか？")) return;
    App.state.dailyPlans[App.dateKey()] = [];
    App.renderDailyPlan();
  });

  App.el.subjectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    App.addSubject(App.el.newSubjectInput.value);
    App.el.newSubjectInput.value = "";
    App.renderSubjects();
  });

  [App.el.soundToggle, App.el.vibrationToggle, App.el.wakeLockToggle, App.el.themeToggle, App.el.autoSaveToggle, App.el.defaultStudyInput, App.el.defaultBreakInput, App.el.settingsGoalInput]
    .forEach((input) => input.addEventListener("change", App.applySettingInputs));
  App.el.soundToggle.addEventListener("change", () => {
    if (App.el.soundToggle.checked) App.unlockAudio();
  });
  App.el.wakeLockToggle.addEventListener("change", () => {
    if (App.el.wakeLockToggle.checked && App.state.timerState.status === "running") App.requestWakeLock();
    if (!App.el.wakeLockToggle.checked) App.releaseWakeLock();
  });

  App.el.exportCsvButton.addEventListener("click", App.exportCsv);
  App.el.exportJsonButton.addEventListener("click", App.exportJson);
  App.el.importCsvInput.addEventListener("change", () => App.el.importCsvInput.files[0] && App.importCsv(App.el.importCsvInput.files[0]));
  App.el.importJsonInput.addEventListener("change", () => App.el.importJsonInput.files[0] && App.importJson(App.el.importJsonInput.files[0]));

  window.addEventListener("beforeunload", () => App.saveAll());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && App.state.timerState.status === "running") {
      App.requestWakeLock();
    }
  });
};

function adjustInput(input, diff, callback) {
  input.value = Math.max(Number(input.min) || 1, Number(input.value) + diff);
  callback();
}

/*
追加した機能一覧:
- タイマー終了時の通知音とダイアログ
- LocalStorageに保存される永続タイマー
- ポモドーロ式の勉強/休憩自動切り替え
- 科目の保存、候補表示、削除
- 今日/今週/今月/今年の分析切り替え
- 教科別集計、週間グラフ、月別グラフ、月間カレンダー
- 履歴の検索、編集、削除
- CSV保存/読込、JSONバックアップ/復元
- 通知音、ダークモード、デフォルト時間、自動保存、目標時間の設定
- タイマー終了時のバイブレーション
- タイマー中の画面スリープ防止

変更点:
- script.jsをjs/配下の機能別ファイルへ分割
- LocalStorageキーをsubjects/records/settings/timerState/statistics/goalsへ整理
- 画面下のタブでホーム/履歴/分析/目標/設定を切り替えるUIへ改善

今後追加できる機能:
- 通知APIによるOS通知
- 記録の詳細編集画面
- 模試結果や偏差値との相関分析
- 科目ごとの目標時間と苦手度管理
*/
