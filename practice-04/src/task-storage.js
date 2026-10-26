export const STORAGE_VERSION = 1;

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Проверяет весь список, не исправляя данные.
export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;

  const ids = new Set();

  for (const task of value) {
    if (task === null || typeof task !== "object" || Array.isArray(task)) {
      return false;
    }

    if (!Number.isSafeInteger(task.id) || task.id <= 0 || ids.has(task.id)) {
      return false;
    }

    if (typeof task.title !== "string"
        || task.title.length < 1
        || task.title.length > 100
        || task.title !== task.title.trim()) {
      return false;
    }

    if (typeof task.completed !== "boolean"
        || !ALLOWED_PRIORITIES.has(task.priority)) {
      return false;
    }

    ids.add(task.id);
  }

  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  // Создаём независимую копию исходного набора.
  const fallback = fallbackTasks.map((task) => ({ ...task }));

  try {
    const raw = storage.getItem(key);

    if (raw === null) {
      return { ok: true, source: "initial", tasks: fallback };
    }

    const saved = JSON.parse(raw);

    if (saved === null || typeof saved !== "object"
        || Array.isArray(saved)
        || saved.version !== STORAGE_VERSION
        || !isValidTaskList(saved.tasks)) {
      throw new Error("Неверная версия или схема сохранённых данных");
    }

    return {
      ok: true,
      source: "storage",
      tasks: saved.tasks.map((task) => ({ ...task })),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "ошибка хранилища";

    return {
      ok: false,
      source: "fallback",
      tasks: fallback,
      error: `Не удалось загрузить задачи: ${reason}`,
    };
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Некорректный список задач" };
  }

  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось сохранить задачи в хранилище" };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось удалить сохранённые задачи" };
  }
}