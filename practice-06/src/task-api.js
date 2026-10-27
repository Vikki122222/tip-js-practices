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

export function isTask(value) {
  return isRecord(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId);
}

export function isCategory(value) {
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

  async function getTasks(filters = {}, { signal } = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, signal });
    validateCollection(payload, isTask, "tasks");
    if (!isRecord(payload.meta.filters)) {
      throw invalidResponse("В meta отсутствует объект filters.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным безопасным целым.");
    }
    const payload = await client.requestJson("/tasks/" + id, { signal });
    if (!isRecord(payload) || !isTask(payload.data) || payload.data.id !== id) {
      throw invalidResponse("Ответ не содержит запрошенную задачу.");
    }
    return payload.data;
  }

  async function getCategories({ signal } = {}) {
    const payload = await client.requestJson("/categories", { signal });
    validateCollection(payload, isCategory, "categories");
    return payload.data;
  }

  async function loadInitialData(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    // Обе операции начинаются до общего await.
    const [result, categories] = await Promise.all([
      getTasks(query, options),
      getCategories(options),
    ]);
    return { tasks: result.tasks, categories, meta: result.meta };
  }

  function checkId(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным безопасным целым.");
    }
  }

  function readTask(payload, expectedId) {
    if (!isRecord(payload) || !isTask(payload.data)
        || (expectedId !== undefined && payload.data.id !== expectedId)) {
      throw invalidResponse("Ответ не содержит корректную задачу.");
    }
    return payload.data;
  }

  async function createTask(draft, { signal } = {}) {
    const payload = await client.requestJson("/tasks", {
      method: "POST", body: draft, signal,
    });
    return readTask(payload);
  }

  async function updateTask(id, changes, { signal } = {}) {
    checkId(id);
    const payload = await client.requestJson("/tasks/" + id, {
      method: "PATCH", body: changes, signal,
    });
    return readTask(payload, id);
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, { signal } = {}) {
    checkId(id);
    const payload = await client.requestJson("/tasks/" + id, {
      method: "DELETE", signal,
    });
    if (payload !== null) throw invalidResponse("DELETE должен возвращать ответ без тела (204).");
    return null;
  }

  async function resetDemoData({ signal } = {}) {
    const payload = await client.requestJson("/debug/reset", { method: "POST", signal });
    if (!isRecord(payload) || !isRecord(payload.data)
        || payload.data.reset !== true || !Number.isSafeInteger(payload.data.total)
        || payload.data.total < 0) {
      throw invalidResponse("Сервер не подтвердил восстановление данных.");
    }
    return payload.data;
  }

  return {
    getTasks, getTaskById, getCategories, loadInitialData,
    createTask, updateTask, setTaskCompleted, deleteTask, resetDemoData,
  };
}
