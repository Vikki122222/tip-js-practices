// Дополнительные проверки граничных случаев. Исходные проверки курса не изменяются.
import assert from "node:assert/strict";
import { ApiError, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { createAppController } from "../src/app-controller.js";
import { validateTaskDraft } from "../src/form-validation.js";

let passed = 0;
let failed = 0;
async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}\n${error.stack}`);
  }
}

function task(changes = {}) {
  return { id: 4, title: "Модель", completed: false, priority: "high", categoryId: 2, ...changes };
}
const categories = [{ id: 1, name: "Учёба" }, { id: 2, name: "Проект" }];
const validDraft = Object.freeze({ title: "  Новая задача  ", priority: "medium", categoryId: "2" });
function result(tasks = [task()]) {
  return { tasks, categories, meta: { total: tasks.length, filters: {} } };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function viewDouble() {
  const calls = [];
  const view = { calls };
  for (const name of [
    "setListState", "setTasks", "setCategories", "setTotal", "setFormTask",
    "showFormErrors", "setMutationPending", "notify", "setLoadDuration",
  ]) view[name] = (...args) => calls.push({ name, args });
  return view;
}
function apiDouble(overrides = {}) {
  return {
    loadInitialData: async () => result(),
    getTasks: async () => result(),
    createTask: async () => task({ id: 35 }),
    updateTask: async (id, changes) => task({ id, ...changes }),
    setTaskCompleted: async (id, completed) => task({ id, completed }),
    deleteTask: async () => null,
    resetDemoData: async () => ({ reset: true, total: 12 }),
    ...overrides,
  };
}
const invalid = (error) => error instanceof ApiError && error.kind === "invalid-response";

await check("01. AbortSignal передаётся всеми девятью методами предметного API", async () => {
  const controller = new AbortController();
  const calls = [];
  const api = createTaskApi({ async requestJson(path, options) {
    calls.push({ path, options });
    if (path === "/debug/reset") return { data: { reset: true, total: 12 } };
    if (options.method === "DELETE") return null;
    if (path === "/categories") return { data: categories, meta: { total: 2 } };
    if (path === "/tasks" && !options.method) return { data: [task()], meta: { total: 1, filters: {} } };
    return { data: task() };
  } });
  const options = { signal: controller.signal };
  await api.getTasks({}, options);
  await api.getTaskById(4, options);
  await api.getCategories(options);
  await api.loadInitialData({}, options);
  await api.createTask({}, options);
  await api.updateTask(4, {}, options);
  await api.setTaskCompleted(4, true, options);
  await api.deleteTask(4, options);
  await api.resetDemoData(options);
  assert.equal(calls.length, 10);
  assert.ok(calls.every((call) => call.options.signal === controller.signal));
});

await check("02. Неверные id и completed отклоняются до сети", async () => {
  let calls = 0;
  const api = createTaskApi({ requestJson: async () => { calls += 1; } });
  for (const id of [0, -1, 1.5, "4", NaN, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(() => api.getTaskById(id), TypeError);
    await assert.rejects(() => api.updateTask(id, {}), TypeError);
    await assert.rejects(() => api.deleteTask(id), TypeError);
  }
  await assert.rejects(() => api.setTaskCompleted(4, "true"), TypeError);
  assert.equal(calls, 0);
});

await check("03. Неожиданное тело DELETE и ложный reset отклоняются", async () => {
  const api = createTaskApi({ requestJson: async () => ({ data: { reset: false, total: 12 } }) });
  await assert.rejects(() => api.deleteTask(4), invalid);
  await assert.rejects(() => api.resetDemoData(), invalid);
});

await check("04. Дубликаты категорий, неверный total и id ответа отклоняются", async () => {
  for (const payload of [
    { data: [categories[0], categories[0]], meta: { total: 2 } },
    { data: categories, meta: { total: 99 } },
  ]) {
    const api = createTaskApi({ requestJson: async () => payload });
    await assert.rejects(() => api.getCategories(), invalid);
  }
  const api = createTaskApi({ requestJson: async () => ({ data: task({ id: 7 }) }) });
  await assert.rejects(() => api.updateTask(4, { completed: true }), invalid);
});

await check("05. Предварительная отмена, цикл в JSON и GET с телом не вызывают fetch", async () => {
  let calls = 0;
  const client = createApiClient({ baseUrl: "http://example.test/api", fetchFn: async () => { calls += 1; } });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => client.requestJson("/tasks", { signal: controller.signal }),
    (error) => error instanceof ApiError && error.kind === "aborted");
  const cycle = {}; cycle.self = cycle;
  await assert.rejects(() => client.requestJson("/tasks", { method: "POST", body: cycle }), TypeError);
  await assert.rejects(() => client.requestJson("/tasks", { body: null }), TypeError);
  assert.equal(calls, 0);
});

await check("06. HTTP 503 сохраняется при повреждённом JSON ошибки", async () => {
  const client = createApiClient({
    baseUrl: "http://example.test/api",
    fetchFn: async () => new Response("{broken", { status: 503, headers: { "Content-Type": "application/json" } }),
  });
  await assert.rejects(() => client.requestJson("/tasks"), (error) =>
    error instanceof ApiError && error.kind === "http" && error.status === 503 && error.cause instanceof SyntaxError);
});

await check("07. Валидация неизменяема, принимает 100 символов и отклоняет 101", () => {
  const frozenCategories = Object.freeze(categories.map((category) => Object.freeze({ ...category })));
  assert.equal(validateTaskDraft(validDraft, frozenCategories).value.title, "Новая задача");
  assert.deepEqual(validDraft, { title: "  Новая задача  ", priority: "medium", categoryId: "2" });
  assert.equal(validateTaskDraft({ ...validDraft, title: "a".repeat(100) }, frozenCategories).valid, true);
  assert.equal(validateTaskDraft({ ...validDraft, title: "a".repeat(101) }, frozenCategories).valid, false);
  for (const value of [null, false, "", "99", 2.5]) {
    assert.equal(validateTaskDraft({ ...validDraft, categoryId: value }, frozenCategories).valid, false);
  }
});

await check("08. Двойная отправка формы выполняет один POST", async () => {
  const gate = deferred();
  let count = 0;
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({ createTask() { count += 1; return gate.promise; } }), view });
  await controller.start();
  const first = controller.submit(validDraft);
  assert.equal(await controller.submit(validDraft), false);
  assert.equal(count, 1);
  gate.resolve(task({ id: 35 }));
  await first;
  assert.deepEqual(view.calls.filter((call) => call.name === "setMutationPending").at(-1).args, [false]);
});

await check("09. Мутация повторяет GET с фильтром, выбранным во время ожидания", async () => {
  const gate = deferred();
  const filters = [];
  const controller = createAppController({ api: apiDouble({
    createTask: () => gate.promise,
    getTasks: async (value) => { filters.push(value); return result(); },
  }), view: viewDouble() });
  await controller.start({ priority: "high" });
  const pending = controller.submit(validDraft);
  await controller.applyFilters({ priority: "medium" });
  gate.resolve(task({ id: 35 }));
  await pending;
  assert.deepEqual(filters, [{ priority: "medium" }, { priority: "medium" }]);
});

await check("10. Ошибка мутации сохраняет форму и карточки, показывает серверные поля", async () => {
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({ async updateTask() {
    throw new ApiError("Ошибка сервера", { kind: "http", status: 400,
      code: "VALIDATION_ERROR", details: { title: "Название отклонено" } });
  } }), view });
  await controller.start();
  controller.beginEdit(4);
  const before = view.calls.filter((call) => call.name === "setTasks").length;
  assert.equal(await controller.submit(validDraft), false);
  assert.equal(view.calls.filter((call) => call.name === "setFormTask").at(-1).args[0].id, 4);
  assert.equal(view.calls.filter((call) => call.name === "setTasks").length, before);
  assert.deepEqual(view.calls.filter((call) => call.name === "showFormErrors").at(-1).args[0], { title: "Название отклонено" });
  assert.equal(view.calls.filter((call) => call.name === "setMutationPending").at(-1).args[0], false);
});

await check("11. Устаревшая ошибка не заменяет успешную новую загрузку и её время", async () => {
  const gate = deferred();
  let calls = 0;
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({
    loadInitialData: () => ++calls === 1 ? gate.promise : Promise.resolve(result([task({ id: 7 })])),
  }), view });
  const first = controller.start();
  await controller.applyFilters({ q: "новый" });
  gate.reject(new ApiError("Старая ошибка", { kind: "network" }));
  await first;
  assert.equal(view.calls.filter((call) => call.name === "setListState").at(-1).args[0], "ready");
  const durations = view.calls.filter((call) => call.name === "setLoadDuration");
  assert.equal(durations.length, 1);
  assert.ok(Number.isFinite(durations[0].args[0]) && durations[0].args[0] >= 0);
});

await check("12. destroy отменяет загрузку и запрещает применение позднего ответа", async () => {
  const gate = deferred();
  let signal;
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({
    loadInitialData(_filters, options) { signal = options.signal; return gate.promise; },
  }), view });
  const pending = controller.start();
  controller.destroy();
  const count = view.calls.length;
  assert.equal(signal.aborted, true);
  gate.resolve(result());
  await pending;
  assert.equal(view.calls.length, count);
  assert.equal(await controller.refresh(), false);
});

await check("13. destroy отменяет мутацию и не обновляет уничтоженное представление", async () => {
  const gate = deferred();
  let signal;
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({ createTask(_draft, options) {
    signal = options.signal; return gate.promise;
  } }), view });
  await controller.start();
  const pending = controller.submit(validDraft);
  controller.destroy();
  const count = view.calls.length;
  assert.equal(signal.aborted, true);
  gate.resolve(task({ id: 35 }));
  await pending;
  assert.equal(view.calls.length, count);
});

await check("14. Ошибка повторного GET оставляет снимок и допускает успешный retry", async () => {
  let calls = 0;
  const view = viewDouble();
  const controller = createAppController({ api: apiDouble({ getTasks: async () => {
    if (++calls === 1) throw new ApiError("Нет сети", { kind: "network" });
    return result([task({ title: "Восстановлено" })]);
  } }), view });
  await controller.start();
  await controller.refresh();
  assert.equal(view.calls.filter((call) => call.name === "setTasks").length, 1);
  assert.equal(view.calls.filter((call) => call.name === "setListState").at(-1).args[0], "error");
  await controller.refresh();
  assert.equal(view.calls.filter((call) => call.name === "setTasks").at(-1).args[0][0].title, "Восстановлено");
  assert.equal(view.calls.filter((call) => call.name === "setListState").at(-1).args[0], "ready");
});

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
