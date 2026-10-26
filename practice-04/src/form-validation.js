const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let id = editingId;

  // При создании преобразуем значение поля в число.
  // При редактировании используем только editingId.
  if (editingId === null) {
    const rawId = draft.id;
    id = typeof rawId === "string" || typeof rawId === "number"
        ? Number(rawId)
        : NaN;
  }

  if (!Number.isSafeInteger(id) || id <= 0) {
    errors.id = "ID должен быть положительным безопасным целым числом";
  } else {
    const exists = tasks.some((task) => task.id === id);

    if (editingId === null && exists) {
      errors.id = "Задача с таким ID уже существует";
    } else if (editingId !== null && !exists) {
      errors.id = "Редактируемая задача не найдена";
    }
  }

  let title = "";

  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой";
  } else {
    title = draft.title.trim();

    if (title.length < 1 || title.length > 100) {
      errors.title = "Название должно содержать от 1 до 100 символов";
    }
  }

  if (!ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = "Выберите приоритет low, medium или high";
  }

  // Собираем все независимые ошибки, а не только первую.
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { id, title, priority: draft.priority },
  };
}