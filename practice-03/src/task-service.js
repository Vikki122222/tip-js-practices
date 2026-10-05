export function createTask(id, title, priority = "medium") {
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Некорректный ID" };
  if (typeof title !== "string") return { ok: false, error: "Название должно быть строкой" };

  const cleanTitle = title.trim();
  if (cleanTitle.length < 1 || cleanTitle.length > 100) return { ok: false, error: "Некорректная длина" };
  if (!["low", "medium", "high"].includes(priority)) return { ok: false, error: "Неверный приоритет" };

  return { ok: true, task: { id, title: cleanTitle, completed: false, priority } };
}

export function findTaskById(tasks, id) {
  return tasks.find(task => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter(task => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map(task => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed === true).length;
  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, pending, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Некорректный ID" };
  if (findTaskById(tasks, id)) return { ok: false, error: "ID уже существует" };

  const res = createTask(id, title, priority);
  if (!res.ok) return res;

  return { ok: true, tasks: [...tasks, res.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Некорректный ID" };
  if (typeof completed !== "boolean") return { ok: false, error: "Статус должен быть boolean" };
  if (!findTaskById(tasks, id)) return { ok: false, error: "Задача не найдена" };

  return { ok: true, tasks: tasks.map(t => t.id === id ? { ...t, completed } : t) };
}

export function renameTask(tasks, id, title) {
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Некорректный ID" };
  const task = findTaskById(tasks, id);
  if (!task) return { ok: false, error: "Задача не найдена" };

  const dummy = createTask(id, title, task.priority);
  if (!dummy.ok) return dummy;

  return { ok: true, tasks: tasks.map(t => t.id === id ? { ...t, title: dummy.task.title } : t) };
}

export function removeTask(tasks, id) {
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Некорректный ID" };
  if (!findTaskById(tasks, id)) return { ok: false, error: "Задача не найдена" };

  return { ok: true, tasks: tasks.filter(t => t.id !== id) };
}