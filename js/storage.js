/* storage.js: LocalStorageの読み書きと旧データ移行を担当します。 */
window.App = window.App || {};

App.keys = {
  subjects: "subjects",
  records: "records",
  settings: "settings",
  timerState: "timerState",
  statistics: "statistics",
  goals: "goals",
  tasks: "study-tracker-tasks",
  dailyPlans: "study-tracker-daily-plans",
};

App.defaults = {
  settings: {
    soundEnabled: true,
    darkMode: false,
    autoSave: true,
    defaultStudyMinutes: 25,
    defaultBreakMinutes: 5,
    pomodoroEnabled: false,
    examName: "共通テスト",
    examDate: "",
  },
  goals: {
    dailyGoalHours: 8,
  },
  timerState: {
    status: "idle",
    mode: "study",
    subject: "",
    memo: "",
    studyMinutes: 25,
    breakMinutes: 5,
    startedAt: null,
    expectedEndAt: null,
    remainingSeconds: 1500,
  },
};

App.storage = {
  read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  },

  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

App.state = {
  subjects: [],
  records: [],
  settings: { ...App.defaults.settings },
  timerState: { ...App.defaults.timerState },
  statistics: {},
  goals: { ...App.defaults.goals },
  tasks: {},
  dailyPlans: {},
  analysisRange: "today",
};

App.loadState = function loadState() {
  const legacySubjects = App.storage.read("study-tracker-subjects", []);
  const legacyRecords = App.storage.read("study-tracker-records", []);
  const legacySettings = App.storage.read("study-tracker-settings", {});

  App.state.subjects = uniqueSubjects(App.storage.read(App.keys.subjects, legacySubjects));
  App.state.records = normalizeRecords(App.storage.read(App.keys.records, legacyRecords));
  App.state.settings = { ...App.defaults.settings, ...legacySettings, ...App.storage.read(App.keys.settings, {}) };
  App.state.goals = { ...App.defaults.goals, dailyGoalHours: legacySettings.dailyGoalHours || 8, ...App.storage.read(App.keys.goals, {}) };
  App.state.timerState = { ...App.defaults.timerState, ...App.storage.read(App.keys.timerState, {}) };
  App.state.statistics = App.storage.read(App.keys.statistics, {});
  App.state.tasks = App.storage.read(App.keys.tasks, {});
  App.state.dailyPlans = App.storage.read(App.keys.dailyPlans, {});
  App.saveAll();
};

App.saveAll = function saveAll() {
  App.storage.write(App.keys.subjects, App.state.subjects);
  App.storage.write(App.keys.records, App.state.records);
  App.storage.write(App.keys.settings, App.state.settings);
  App.storage.write(App.keys.timerState, App.state.timerState);
  App.storage.write(App.keys.statistics, App.state.statistics);
  App.storage.write(App.keys.goals, App.state.goals);
  App.storage.write(App.keys.tasks, App.state.tasks);
  App.storage.write(App.keys.dailyPlans, App.state.dailyPlans);
};

App.savePart = function savePart(key) {
  if (App.keys[key]) App.storage.write(App.keys[key], App.state[key]);
};

function uniqueSubjects(subjects) {
  return [...new Set((subjects || []).map((subject) => String(subject).trim()).filter(Boolean))];
}

function normalizeRecords(records) {
  return (records || []).map((record, index) => ({
    id: record.id || `record-${Date.now()}-${index}`,
    date: record.date,
    subject: record.subject || "未分類",
    minutes: Number(record.minutes) || 0,
    start: record.start || "",
    end: record.end || "",
    memo: record.memo || "",
    tags: Array.isArray(record.tags) ? record.tags : String(record.memo || "").match(/#[^\s#]+/g) || [],
  })).filter((record) => record.date && record.minutes > 0);
}
