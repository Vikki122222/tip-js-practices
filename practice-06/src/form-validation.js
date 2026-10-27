const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
export function validateTaskDraft(draft, categories) {
  const errors = {};
  const title = typeof draft?.title === "string" ? draft.title.trim() : "";
  const priority = draft?.priority;
  const rawCategory = draft?.categoryId;
  const categoryId = typeof rawCategory === "number"
    ? rawCategory
    : typeof rawCategory === "string" && rawCategory.trim() !== ""
      ? Number(rawCategory) : NaN;

  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов после удаления пробелов.";
  }
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите низкий, средний или высокий приоритет.";
  }
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0
      || !Array.isArray(categories) || !categories.some((item) => item.id === categoryId)) {
    errors.categoryId = "Выберите категорию из загруженного списка.";
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, value: valid ? { title, priority, categoryId } : null, errors };
}
