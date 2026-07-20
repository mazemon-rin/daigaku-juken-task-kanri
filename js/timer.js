/* timer.js: 永続タイマー、通知音、ポモドーロを担当します。 */
window.App = window.App || {};

App.timerInterval = null;
App.audioContext = null;
App.isFinishingTimer = false;
App.wakeLock = null;

App.requestWakeLock = async function requestWakeLock() {
  if (!App.state.settings.wakeLockEnabled) return;
  if (!("wakeLock" in navigator)) return;
  if (App.wakeLock) return;

  try {
    App.wakeLock = await navigator.wakeLock.request("screen");
    App.wakeLock.addEventListener("release", () => {
      App.wakeLock = null;
      if (App.state.timerState.status === "running" && document.visibilityState === "visible") {
        App.requestWakeLock();
      }
    });
  } catch (error) {
    console.warn("画面スリープ防止を有効にできませんでした", error);
  }
};

App.releaseWakeLock = async function releaseWakeLock() {
  if (!App.wakeLock) return;

  try {
    await App.wakeLock.release();
  } catch (error) {
    console.warn("画面スリープ防止の解除に失敗しました", error);
  } finally {
    App.wakeLock = null;
  }
};

App.vibrate = function vibrate() {
  if (!App.state.settings.vibrationEnabled) return;
  if (!("vibrate" in navigator)) return;

  navigator.vibrate([500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 1000]);
};

App.unlockAudio = function unlockAudio() {
  if (!App.state.settings.soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    if (!App.audioContext) App.audioContext = new AudioContext();
    if (App.audioContext.state === "suspended") App.audioContext.resume();
  } catch (error) {
    console.warn("通知音の準備に失敗しました", error);
    return;
  }

  // ユーザー操作の直後に無音を一瞬流して、ブラウザの音声再生制限を解除します。
  const gain = App.audioContext.createGain();
  const oscillator = App.audioContext.createOscillator();
  gain.gain.value = 0.0001;
  oscillator.connect(gain).connect(App.audioContext.destination);
  oscillator.start();
  oscillator.stop(App.audioContext.currentTime + 0.03);
};

App.beep = async function beep() {

  if (!App.state.settings.soundEnabled) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {

    console.warn("このブラウザは通知音に対応していません");

    return;

  }

  if (!App.audioContext) {

    App.audioContext = new AudioContext();

  }

  const ctx = App.audioContext;

  // 停止状態なら再開する

  if (ctx.state === "suspended") {

    try {

      await ctx.resume();

    } catch (error) {

      console.error("音声の再開に失敗しました", error);

      return;

    }

  }

  const startTime = ctx.currentTime + 0.05;
  const masterGain = ctx.createGain();

  masterGain.connect(ctx.destination);

  // 全体音量

  masterGain.gain.setValueAtTime(0.35, startTime);

  const notes = [880, 660, 880, 660, 1046, 880];

  notes.forEach((frequency, index) => {

    const start = startTime + index * 0.45;

    const oscillator = ctx.createOscillator();

    const noteGain = ctx.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(frequency, start);

    noteGain.gain.setValueAtTime(0.0001, start);

    noteGain.gain.exponentialRampToValueAtTime(0.5, start + 0.03);

    noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

    oscillator.connect(noteGain);

    noteGain.connect(masterGain);

    oscillator.start(start);

    oscillator.stop(start + 0.4);

  });

  // 音が終わる頃に全体音量を下げる

  masterGain.gain.setValueAtTime(0.35, startTime + 2.5);

  masterGain.gain.exponentialRampToValueAtTime(

    0.0001,

    startTime + 3

  );

  await new Promise((resolve) => window.setTimeout(resolve, 3200));

};

App.startTimer = function startTimer() {
  App.unlockAudio();
  App.requestWakeLock();
  const subject = App.el.subjectInput.value.trim();
  if (!subject && App.state.timerState.mode === "study") {
    App.el.subjectInput.focus();
    App.el.statusText.textContent = "科目を入力してください";
    return;
  }
  App.addSubject(subject);
  const now = Date.now();
  const seconds = App.state.timerState.remainingSeconds || App.state.timerState.studyMinutes * 60;
  App.state.timerState = {
    ...App.state.timerState,
    status: "running",
    subject,
    memo: App.el.memoInput.value.trim(),
    startedAt: App.state.timerState.startedAt || new Date().toISOString(),
    expectedEndAt: new Date(now + seconds * 1000).toISOString(),
  };
  App.savePart("timerState");
  App.tickTimer();
  App.timerInterval = window.setInterval(App.tickTimer, 1000);
};

App.pauseTimer = function pauseTimer() {
  window.clearInterval(App.timerInterval);
  App.releaseWakeLock();
  App.state.timerState.status = "paused";
  App.state.timerState.expectedEndAt = null;
  App.savePart("timerState");
  App.renderTimer();
};

App.resetTimer = function resetTimer() {
  window.clearInterval(App.timerInterval);
  App.releaseWakeLock();
  App.state.timerState = {
    ...App.defaults.timerState,
    studyMinutes: Number(App.el.minutesInput.value) || App.state.settings.defaultStudyMinutes,
    breakMinutes: Number(App.el.breakMinutesInput.value) || App.state.settings.defaultBreakMinutes,
    remainingSeconds: (Number(App.el.minutesInput.value) || App.state.settings.defaultStudyMinutes) * 60,
    mode: "study",
  };
  App.savePart("timerState");
  App.renderTimer();
};

App.syncDurationInputs = function syncDurationInputs() {
  const studyMinutes = Number(App.el.minutesInput.value) || App.state.settings.defaultStudyMinutes;
  const breakMinutes = Number(App.el.breakMinutesInput.value) || App.state.settings.defaultBreakMinutes;
  const timer = App.state.timerState;

  timer.studyMinutes = studyMinutes;
  timer.breakMinutes = breakMinutes;
  if (timer.status !== "running") {
    timer.remainingSeconds = (timer.mode === "break" ? breakMinutes : studyMinutes) * 60;
  }
  App.savePart("timerState");
  App.renderTimer();
};

App.startManualBreak = function startManualBreak() {
  window.clearInterval(App.timerInterval);
  App.timerInterval = null;
  if (App.state.timerState.mode === "study" && App.state.timerState.status !== "idle") {
    App.saveStudyRecord();
  }
  App.state.timerState.breakMinutes = Number(App.el.breakMinutesInput.value) || App.state.settings.defaultBreakMinutes;
  App.startNextPhase("break");
  App.renderAll();
};

App.tickTimer = function tickTimer() {
  const timer = App.state.timerState;
  if (timer.status !== "running" || !timer.expectedEndAt) {
    App.renderTimer();
    return;
  }
  timer.remainingSeconds = Math.max(0, Math.ceil((new Date(timer.expectedEndAt) - new Date()) / 1000));
  App.savePart("timerState");
  App.renderTimer();
  if (timer.remainingSeconds <= 0) App.finishTimerPhase();
};

App.finishTimerPhase = async function finishTimerPhase() {
  if (App.isFinishingTimer) return;
  App.isFinishingTimer = true;
  window.clearInterval(App.timerInterval);
  App.timerInterval = null;

  const timer = App.state.timerState;
  const finishedMode = timer.mode;

  if (finishedMode === "study") {
    App.saveStudyRecord();
  }

  timer.status = "paused";
  timer.remainingSeconds = 0;
  timer.expectedEndAt = null;
  App.savePart("timerState");

  App.vibrate();
  await App.beep();

  if (finishedMode === "study") {
    alert("勉強終了！お疲れ様でした");

    if (App.state.settings.pomodoroEnabled) {
      App.isFinishingTimer = false;
      App.startNextPhase("break");
      return;
    }
  } else {
    alert("休憩終了！勉強に戻りましょう");

    if (App.state.settings.pomodoroEnabled) {
      App.isFinishingTimer = false;
      App.startNextPhase("study");
      return;
    }
  }

  App.resetTimer();
  App.renderAll();
  App.isFinishingTimer = false;
};

App.startNextPhase = function startNextPhase(mode) {
  App.requestWakeLock();
  const seconds = (mode === "study" ? App.state.timerState.studyMinutes : App.state.timerState.breakMinutes) * 60;
  App.state.timerState = {
    ...App.state.timerState,
    status: "running",
    mode,
    startedAt: new Date().toISOString(),
    expectedEndAt: new Date(Date.now() + seconds * 1000).toISOString(),
    remainingSeconds: seconds,
  };
  App.savePart("timerState");
  App.tickTimer();
  App.timerInterval = window.setInterval(App.tickTimer, 1000);
};

App.studyElapsedMinutes = function studyElapsedMinutes() {
  const timer = App.state.timerState;
  const totalSeconds = Math.max(0, Number(timer.studyMinutes) * 60);
  const liveRemainingSeconds = timer.status === "running" && timer.expectedEndAt
    ? Math.ceil((new Date(timer.expectedEndAt) - new Date()) / 1000)
    : timer.remainingSeconds;
  const remainingSeconds = Math.max(0, Number(liveRemainingSeconds) || 0);
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  return Math.max(1, Math.ceil(elapsedSeconds / 60));
};

App.saveStudyRecord = function saveStudyRecord() {
  const timer = App.state.timerState;
  const subject = timer.subject || App.el.subjectInput.value.trim();
  if (!subject) return;
  const startDate = timer.startedAt ? new Date(timer.startedAt) : new Date(Date.now() - timer.studyMinutes * 60000);
  const endDate = new Date();
  const memo = timer.memo || App.el.memoInput.value.trim();
  const record = {
    id: `record-${Date.now()}`,
    date: App.dateKey(endDate),
    subject,
    minutes: App.studyElapsedMinutes(),
    start: App.timeLabel(startDate),
    end: App.timeLabel(endDate),
    memo,
    tags: memo.match(/#[^\s#]+/g) || [],
  };
  App.state.records.push(record);
  App.addSubject(subject);
  App.el.memoInput.value = "";
  App.savePart("records");
  App.updateStatisticsCache();
};

App.renderTimer = function renderTimer() {
  const timer = App.state.timerState;
  const minutes = Math.floor((timer.remainingSeconds || 0) / 60);
  const seconds = (timer.remainingSeconds || 0) % 60;
  const phaseTotal = (timer.mode === "break" ? timer.breakMinutes : timer.studyMinutes) * 60;
  const progress = phaseTotal ? ((phaseTotal - timer.remainingSeconds) / phaseTotal) * 100 : 0;
  App.el.timerText.textContent = `${App.pad(minutes)}:${App.pad(seconds)}`;
  App.el.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  App.el.startPauseButton.textContent = timer.status === "running" ? "一時停止" : "スタート";
  App.el.startBreakButton.disabled = timer.status === "running" && timer.mode === "break";
  App.el.statusText.textContent = timer.status === "running" ? (timer.mode === "break" ? "休憩中" : "集中タイム") : "準備できたらスタート";
  App.el.timerModeBadge.textContent = timer.mode === "break" ? "休憩中" : "勉強中";
  App.el.timerModeBadge.className = `mode-badge ${timer.mode}`;
  App.el.timerDisplay.className = `timer-display ${timer.mode}`;
};

App.restoreTimer = function restoreTimer() {
  const timer = App.state.timerState;
  App.el.subjectInput.value = timer.subject || "";
  App.el.memoInput.value = timer.memo || "";
  App.el.minutesInput.value = timer.studyMinutes || App.state.settings.defaultStudyMinutes;
  App.el.breakMinutesInput.value = timer.breakMinutes || App.state.settings.defaultBreakMinutes;
  App.el.pomodoroToggle.checked = App.state.settings.pomodoroEnabled;
  if (timer.status === "running") {
    App.requestWakeLock();
    App.tickTimer();
    App.timerInterval = window.setInterval(App.tickTimer, 1000);
  } else {
    App.renderTimer();
  }
};
