/* statistics.js: 日・週・月・年・教科別の集計を担当します。 */
window.App = window.App || {};

App.pad = (value) => String(value).padStart(2, "0");
App.dateKey = (date = new Date()) => `${date.getFullYear()}-${App.pad(date.getMonth() + 1)}-${App.pad(date.getDate())}`;
App.timeLabel = (date = new Date()) => `${App.pad(date.getHours())}:${App.pad(date.getMinutes())}`;
App.parseDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

App.formatMinutes = function formatMinutes(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}分`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
};

App.escapeHtml = function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
};

App.recordsForDate = (key, source = App.state.records) => source.filter((record) => record.date === key);
App.minutesForDate = (key, source = App.state.records) => App.recordsForDate(key, source).reduce((sum, record) => sum + record.minutes, 0);

App.daysBetween = function daysBetween(start, end) {
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

App.lastSevenDays = function lastSevenDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return App.daysBetween(start, today);
};

App.currentMonthDates = function currentMonthDates() {
  const now = new Date();
  return App.daysBetween(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

App.rangeDates = function rangeDates(range) {
  const today = new Date();
  const start = new Date(today);
  if (range === "today") return [today];
  if (range === "week") start.setDate(today.getDate() - today.getDay());
  if (range === "month") start.setDate(1);
  if (range === "year") {
    start.setMonth(0);
    start.setDate(1);
  }
  return App.daysBetween(start, today);
};

App.subjectTotals = function subjectTotals(source = App.state.records) {
  const totals = new Map();
  source.forEach((record) => totals.set(record.subject, (totals.get(record.subject) || 0) + record.minutes));
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
};

App.recordsInDates = function recordsInDates(dates) {
  const keys = new Set(dates.map(App.dateKey));
  return App.state.records.filter((record) => keys.has(record.date));
};

App.calculateStreak = function calculateStreak() {
  let streak = 0;
  const cursor = new Date();
  while (App.minutesForDate(App.dateKey(cursor)) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

App.updateStatisticsCache = function updateStatisticsCache() {
  App.state.statistics = {
    updatedAt: new Date().toISOString(),
    totalMinutes: App.state.records.reduce((sum, record) => sum + record.minutes, 0),
    streakDays: App.calculateStreak(),
  };
  App.savePart("statistics");
};
