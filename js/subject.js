/* subject.js: 科目候補の保存・表示・削除を担当します。 */
window.App = window.App || {};

App.addSubject = function addSubject(subject) {
  const clean = String(subject || "").trim();
  if (!clean || App.state.subjects.includes(clean)) return;
  App.state.subjects.push(clean);
  App.state.subjects.sort((a, b) => a.localeCompare(b, "ja"));
  App.savePart("subjects");
};

App.deleteSubject = function deleteSubject(subject) {
  App.state.subjects = App.state.subjects.filter((item) => item !== subject);
  App.savePart("subjects");
  App.renderSubjects();
};

App.renderSubjects = function renderSubjects() {
  const subjectsFromRecords = App.state.records.map((record) => record.subject);
  App.state.subjects = [...new Set([...App.state.subjects, ...subjectsFromRecords].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  App.savePart("subjects");

  App.el.subjectList.innerHTML = "";
  App.el.trendSubject.innerHTML = "";
  App.el.subjectManageList.innerHTML = "";

  App.state.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    App.el.subjectList.append(option);

    const selectOption = document.createElement("option");
    selectOption.value = subject;
    selectOption.textContent = subject;
    App.el.trendSubject.append(selectOption);

    const chip = document.createElement("div");
    chip.className = "subject-chip";
    chip.innerHTML = `<strong>${App.escapeHtml(subject)}</strong><button class="text-button" type="button" data-delete-subject="${App.escapeHtml(subject)}">削除</button>`;
    App.el.subjectManageList.append(chip);
  });
};
