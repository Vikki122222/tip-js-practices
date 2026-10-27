import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
  return isRecord(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId);
}

function isCategory(value) {
  return isRecord(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100;
}

function normalizeFilters(filters) {
  if (!isRecord(filters)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(filters))) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }
  const query = {};
  for (const [name, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(name)) throw new TypeError("Неизвестный фильтр: " + name);
    if (value === undefined) continue;
    if (name === "completed" && typeof value !== "boolean") {
      throw new TypeError("completed должен быть логическим значением.");
    }
    if (name === "priority" && !ALLOWED_PRIORITIES.has(value)) {
      throw new TypeError("Недопустимый приоритет.");
    }
    if (name === "categoryId" && !isPositiveSafeInteger(value)) {
      throw new TypeError("categoryId должен быть положительным безопасным целым.");
    }
    if (name === "q") {
      if (typeof value !== "string" || value.trim().length > 100) {
        throw new TypeError("q должен быть строкой длиной до 100 после trim.");
      }
      query.q = value.trim();
    } else {
      query[name] = value;
    }
  }
  return query;
}

function validateCollection(payload, validator, resource) {
  if (!isRecord(payload) || !Array.isArray(payload.data)
      || !isRecord(payload.meta)
      || !Number.isSafeInteger(payload.meta.total)
      || payload.meta.total !== payload.data.length) {
    throw invalidResponse("Неверная оболочка коллекции: " + resource);
  }
  const ids = new Set();
  for (const item of payload.data) {
    if (!validator(item) || ids.has(item.id)) {
      throw invalidResponse("Неверная запись или повторяющийся id: " + resource);
    }
    ids.add(item.id);
  }
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Требуется клиент с методом requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    validateCollection(payload, isTask, "tasks");
    if (!isRecord(payload.meta.filters)) {
      throw invalidResponse("В meta отсутствует объект filters.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным безопасным целым.");
    }
    const payload = await client.requestJson("/tasks/" + id);
    if (!isRecord(payload) || !isTask(payload.data) || payload.data.id !== id) {
      throw invalidResponse("Ответ не содержит запрошенную задачу.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    validateCollection(payload, isCategory, "categories");
    return payload.data;
  }

  async function loadInitialData(filters = {}) {
    const query = normalizeFilters(filters);
    // Обе операции начинаются до общего await.
    const [result, categories] = await Promise.all([
      getTasks(query),
      getCategories(),
    ]);
    return { tasks: result.tasks, categories, meta: result.meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
