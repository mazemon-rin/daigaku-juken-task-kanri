/* graph.js: 棒グラフ、月間カレンダー、円グラフ風の比率表示を担当します。 */
window.App = window.App || {};

App.colors = ["#2563eb", "#0f9f6e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];
App.dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

App.renderBarList = function renderBarList(target, entries, color) {
  target.innerHTML = "";
  if (!entries.length) {
    target.innerHTML = '<div class="empty-state">記録するとグラフが表示されます</div>';
    return;
  }
  const max = Math.max(...entries.map((entry) => entry[1]), 60);
  entries.forEach(([label, minutes], index) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <strong>${App.escapeHtml(label)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${(minutes / max) * 100}%;background:${color || App.colors[index % App.colors.length]}"></div></div>
      <span>${App.formatMinutes(minutes)}</span>
    `;
    target.append(row);
  });
};

App.renderAnalysis = function renderAnalysis() {
  const dates = App.rangeDates(App.state.analysisRange);
  const rangeRecords = App.recordsInDates(dates);
  const dayTotals = dates.map((date) => App.minutesForDate(App.dateKey(date)));
  const total = dayTotals.reduce((sum, minutes) => sum + minutes, 0);
  const activeDays = Math.max(1, dayTotals.filter(Boolean).length);
  const max = Math.max(0, ...dayTotals);
  const labels = { today: "今日", week: "今週", month: "今月", year: "今年" };

  App.el.rangeLabel.textContent = labels[App.state.analysisRange];
  App.el.rangeTotal.textContent = App.formatMinutes(total);
  App.el.rangeAverage.textContent = `${App.formatMinutes(total / activeDays)}/日`;
  App.el.rangeMax.textContent = App.formatMinutes(max);
  App.el.streakDays.textContent = `${App.calculateStreak()}日`;

  App.renderBarList(App.el.allSubjectTotals, App.subjectTotals(rangeRecords), App.colors[0]);
  App.renderWeekGraph();
  App.renderMonthlyGraph();
  App.renderMonthCalendar();
  App.renderSubjectTrend();
  App.renderBalance(rangeRecords);
};

App.renderWeekGraph = function renderWeekGraph() {
  const entries = App.lastSevenDays().map((date) => [`${App.dayLabels[date.getDay()]}`, App.minutesForDate(App.dateKey(date))]);
  App.renderBarList(App.el.weekGraph, entries, App.colors[2]);
};

App.renderMonthlyGraph = function renderMonthlyGraph() {
  const year = new Date().getFullYear();
  const entries = Array.from({ length: 12 }, (_, index) => {
    const prefix = `${year}-${App.pad(index + 1)}-`;
    const total = App.state.records.filter((record) => record.date.startsWith(prefix)).reduce((sum, record) => sum + record.minutes, 0);
    return [`${index + 1}月`, total];
  });
  App.renderBarList(App.el.monthlyGraph, entries, App.colors[4]);
};

App.renderMonthCalendar = function renderMonthCalendar() {
  const monthDates = App.currentMonthDates();
  const firstDay = monthDates[0].getDay();
  App.el.monthCalendar.innerHTML = "";
  App.dayLabels.forEach((label) => {
    const node = document.createElement("div");
    node.className = "weekday";
    node.textContent = label;
    App.el.monthCalendar.append(node);
  });
  Array.from({ length: firstDay }).forEach(() => {
    const empty = document.createElement("div");
    empty.className = "month-day empty";
    App.el.monthCalendar.append(empty);
  });
  monthDates.forEach((date) => {
    const minutes = App.minutesForDate(App.dateKey(date));
    const hours = minutes / 60;
    const heat = hours >= 6 ? 4 : hours >= 4 ? 3 : hours >= 2 ? 2 : hours > 0 ? 1 : 0;
    const day = document.createElement("div");
    day.className = `month-day heat-${heat}`;
    day.dataset.historyDate = App.dateKey(date);
    day.tabIndex = 0;
    day.innerHTML = `<strong>${date.getDate()}</strong><br><span>${App.formatMinutes(minutes)}</span>`;
    App.el.monthCalendar.append(day);
  });
};

App.renderSubjectTrend = function renderSubjectTrend() {
  const subject = App.el.trendSubject.value || App.state.subjects[0] || "";
  const entries = App.lastSevenDays().map((date) => {
    const total = App.state.records
      .filter((record) => record.date === App.dateKey(date) && record.subject === subject)
      .reduce((sum, record) => sum + record.minutes, 0);
    return [App.dayLabels[date.getDay()], total];
  });
  App.renderBarList(App.el.subjectTrend, entries, App.colors[1]);
};

App.renderBalance = function renderBalance(source) {
  const entries = App.subjectTotals(source);
  App.el.subjectBalance.innerHTML = "";
  if (!entries.length) {
    App.el.subjectBalance.innerHTML = '<div class="empty-state">記録すると比率が表示されます</div>';
    return;
  }
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  let start = 0;
  const gradient = entries.map((entry, index) => {
    const deg = (entry[1] / total) * 360;
    const part = `${App.colors[index % App.colors.length]} ${start}deg ${start + deg}deg`;
    start += deg;
    return part;
  }).join(", ");
  const donut = document.createElement("div");
  donut.className = "donut";
  donut.style.background = `conic-gradient(${gradient})`;
  const legend = document.createElement("div");
  legend.className = "legend";
  entries.forEach(([subject, minutes], index) => {
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span><i class="legend-dot" style="background:${App.colors[index % App.colors.length]}"></i>${App.escapeHtml(subject)}</span><strong>${Math.round((minutes / total) * 100)}%</strong>`;
    legend.append(row);
  });
  App.el.subjectBalance.append(donut, legend);
};
