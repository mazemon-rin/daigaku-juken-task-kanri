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
