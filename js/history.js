/* history.js: 履歴一覧、検索、編集、削除を担当します。 */
window.App = window.App || {};

App.recordNode = function recordNode(record, editable) {
  const item = document.createElement("article");
  item.className = "record-item";
  const memo = record.memo ? `<span>${App.escapeHtml(record.memo)}</span>` : "";
  const actions = editable ? `
    <div class="record-actions">
      <button class="small-button" type="button" data-edit-record="${record.id}">編集</button>
      <button class="small-button text-button" type="button" data-delete-record="${record.id}">削除</button>
    </div>
  ` : "";
  item.innerHTML = `
    <div class="record-main">
      <strong>${App.escapeHtml(record.subject)}</strong>
      <span>${record.date} ${record.start}〜${record.end}</span>
      ${memo}
    </div>
    <strong class="record-minutes">${App.formatMinutes(record.minutes)}</strong>
    ${actions}
  `;
  return item;
};

App.renderTodayRecords = function renderTodayRecords() {
  const todayRecords = App.recordsForDate(App.dateKey());
  App.el.recordList.innerHTML = "";
  if (!todayRecords.length) {
    App.el.recordList.innerHTML = '<div class="empty-state">まだ今日の記録はありません</div>';
  } else {
    todayRecords.slice().reverse().forEach((record) => App.el.recordList.append(App.recordNode(record, true)));
  }
  App.renderTodayTotals(todayRecords);
};

App.renderHistory = function renderHistory() {
  const query = App.el.historySearch.value.trim().toLowerCase();
  const filtered = App.state.records.filter((record) => {
    const text = `${record.date} ${record.subject} ${record.memo || ""} ${(record.tags || []).join(" ")}`.toLowerCase();
    return text.includes(query);
  }).slice().reverse();

  App.el.historyList.innerHTML = "";
  if (!filtered.length) {
    App.el.historyList.innerHTML = '<div class="empty-state">条件に合う履歴がありません</div>';
    return;
  }
  filtered.forEach((record) => App.el.historyList.append(App.recordNode(record, true)));
};

App.historyTaskNode = function historyTaskNode(task) {
  const item = document.createElement("div");
  item.className = "history-task-item";
  item.innerHTML = `
    <span>${task.done ? "済" : "未"}: ${App.escapeHtml(task.text)}</span>
    <button type="button" class="small-button" data-use-subject="${App.escapeHtml(task.text)}" data-use-memo="">科目に入れる</button>
  `;
  return item;
};

App.historyPlanNode = function historyPlanNode(plan) {
  const item = document.createElement("div");
  item.className = "plan-item";
  const time = plan.start || plan.end ? `${plan.start || "--:--"} - ${plan.end || "--:--"}` : "時間未定";
  item.innerHTML = `
    <div class="plan-time">${App.escapeHtml(time)}</div>
    <div class="plan-main">
      <strong>${App.escapeHtml(plan.title)}</strong>
      ${plan.note ? `<span>${App.escapeHtml(plan.note)}</span>` : ""}
    </div>
    <button type="button" class="small-button" data-use-subject="${App.escapeHtml(plan.title)}" data-use-memo="${App.escapeHtml(plan.note || "")}">科目に入れる</button>
  `;
  return item;
};

App.useHistoryItemForTimer = function useHistoryItemForTimer(subject, memo) {
  const cleanSubject = String(subject || "").trim();
  if (!cleanSubject) return;
  App.el.subjectInput.value = cleanSubject;
  App.el.memoInput.value = String(memo || "").trim();
  App.addSubject(cleanSubject);
  App.savePart("subjects");
  App.switchTab("home");
  App.el.subjectInput.focus();
};

App.renderSelectedDateHistory = function renderSelectedDateHistory() {
  const date = App.state.selectedHistoryDate || App.dateKey();
  App.el.historyDateInput.value = date;
  App.el.historyDateTitle.textContent = `${date} の履歴`;

  const records = App.recordsForDate(date);
  App.el.historyDateRecords.innerHTML = "";
  if (!records.length) {
    App.el.historyDateRecords.innerHTML = '<div class="empty-state">この日の勉強記録はありません</div>';
  } else {
    records.slice().reverse().forEach((record) => App.el.historyDateRecords.append(App.recordNode(record, true)));
  }

  const tasks = App.state.tasks[date] || [];
  App.el.historyDateTasks.innerHTML = "";
  if (!tasks.length) {
    App.el.historyDateTasks.innerHTML = '<div class="empty-state">この日のやることはありません</div>';
  } else {
    tasks.forEach((task) => App.el.historyDateTasks.append(App.historyTaskNode(task)));
  }

  const plans = App.state.dailyPlans[date] || [];
  App.el.historyDatePlans.innerHTML = "";
  if (!plans.length) {
    App.el.historyDatePlans.innerHTML = '<div class="empty-state">この日の計画はありません</div>';
  } else {
    plans
      .slice()
      .sort((a, b) => `${a.start || "99:99"}${a.end || ""}`.localeCompare(`${b.start || "99:99"}${b.end || ""}`))
      .forEach((plan) => App.el.historyDatePlans.append(App.historyPlanNode(plan)));
  }
};

App.showDateHistory = function showDateHistory(date) {
  if (!date) return;
  App.state.selectedHistoryDate = date;
  App.switchTab("history");
  App.renderSelectedDateHistory();
};

App.renderTodayTotals = function renderTodayTotals(records) {
  const totals = App.subjectTotals(records);
  const total = records.reduce((sum, record) => sum + record.minutes, 0);
  App.el.totalTime.textContent = App.formatMinutes(total);
  App.el.subjectTotals.innerHTML = "";
  if (!totals.length) {
    App.el.subjectTotals.innerHTML = '<div class="empty-state">科目別の合計もここに表示されます</div>';
    return;
  }
  totals.forEach(([subject, minutes]) => {
    const row = document.createElement("div");
    row.className = "subject-total";
    row.innerHTML = `<div class="total-main"><strong>${App.escapeHtml(subject)}</strong><span>今日の合計</span></div><strong>${App.formatMinutes(minutes)}</strong>`;
    App.el.subjectTotals.append(row);
  });
};

App.editRecord = function editRecord(id) {
  const record = App.state.records.find((item) => item.id === id);
  if (!record) return;
  const subject = prompt("科目", record.subject);
  if (subject == null) return;
  const minutes = Number(prompt("勉強時間（分）", record.minutes));
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  const memo = prompt("メモ", record.memo || "");
  record.subject = subject.trim() || record.subject;
  record.minutes = minutes;
  record.memo = memo || "";
  record.tags = record.memo.match(/#[^\s#]+/g) || [];
  App.addSubject(record.subject);
  App.savePart("records");
  App.renderAll();
};

App.deleteRecord = function deleteRecord(id) {
  if (!confirm("この記録を削除しますか？")) return;
  App.state.records = App.state.records.filter((record) => record.id !== id);
  App.savePart("records");
  App.renderAll();
};
