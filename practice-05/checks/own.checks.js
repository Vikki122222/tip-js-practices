// Собственные проверки дополняют неизменённые наборы преподавателя.
import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters, variantNumber } from "../src/variant.js";

let passed = 0;
let failed = 0;
async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log("OK: " + name);
  } catch (error) {
    failed += 1;
    console.error("FAIL: " + name);
    console.error(error.stack);
  }
}
async function expectError(promise, kind, status = null) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, kind);
    if (status !== null) assert.equal(error.status, status);
    return true;
  });
}
const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = "http://127.0.0.1:" + server.address().port + "/api";
const client = createApiClient({ baseUrl });
const api = createTaskApi(client);

// Поддельный ответ уже получен, но тело ещё не прочитано.
// Сигнал должен прерывать и эту фазу, а не только ожидание заголовков.
function streamingFetch(_url, { signal }) {
  const body = new ReadableStream({
    start(stream) {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        stream.enqueue(new TextEncoder().encode('{"ok":true}'));
        stream.close();
      }, 200);
      function abort() {
        clearTimeout(timer);
        stream.error(signal.reason);
      }
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    },
  });
  return Promise.resolve(new Response(body, {
    headers: { "Content-Type": "application/json" },
  }));
}

try {
  await check("01. Все четыре фильтра совместно: false/high/категория 2/клиент", async () => {
    const filters = Object.freeze({
      completed: false, priority: "high", categoryId: 2, q: "  клиент  ",
    });
    const result = await api.getTasks(filters);
    assert.deepEqual(result.tasks.map((task) => task.id), [34]);
    assert.equal(result.meta.total, 1);
    assert.equal(result.meta.filters.completed, false);
    assert.equal(filters.q, "  клиент  ");
  });
  await check("02. Кириллица, пробел и амперсанд доходят как один параметр q", async () => {
    const filters = { completed: false, categoryId: 2, q: "API & ошибки" };
    const url = new URL(buildUrl(baseUrl, "/tasks", filters));
    assert.equal(url.searchParams.get("q"), "API & ошибки");
    assert.equal([...url.searchParams.keys()].length, 3);
    const result = await api.getTasks(filters);
    assert.deepEqual(result.tasks, []);
    assert.equal(result.meta.filters.q, "API & ошибки");
  });
  await check("03. Повреждённое percent-кодирование id даёт http/400/INVALID_ID", async () => {
    await assert.rejects(client.requestJson("/tasks/%E0%A4%A"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 400);
      assert.equal(error.code, "INVALID_ID");
      return true;
    });
  });
  await check("04. Заранее отменённый сигнал не вызывает fetchFn", async () => {
    let calls = 0;
    const fakeClient = createApiClient({
      baseUrl,
      fetchFn: async () => { calls += 1; return new Response("{}"); },
    });
    const controller = new AbortController();
    controller.abort("Отмена до начала запроса");
    await expectError(fakeClient.requestJson("/tasks", { signal: controller.signal }), "aborted");
    assert.equal(calls, 0);
  });
  await check("05. Тайм-аут при чтении тела остаётся timeout", async () => {
    const streamingClient = createApiClient({ baseUrl, fetchFn: streamingFetch });
    await expectError(streamingClient.requestJson("/slow-body", { timeoutMs: 20 }), "timeout");
  });
  await check("06. Внешняя отмена при чтении тела остаётся aborted", async () => {
    const streamingClient = createApiClient({ baseUrl, fetchFn: streamingFetch });
    const controller = new AbortController();
    const pending = streamingClient.requestJson("/slow-body", {
      timeoutMs: 1000, signal: controller.signal,
    });
    const timer = setTimeout(() => controller.abort("Остановить чтение"), 10);
    try { await expectError(pending, "aborted"); } finally { clearTimeout(timer); }
  });
  await check("07. Валидная задача с чужим id отклоняется", async () => {
    const wrongApi = createTaskApi({
      async requestJson() {
        return { data: { id: 4, title: "Другая", completed: false, priority: "low", categoryId: 1 } };
      },
    });
    await expectError(wrongApi.getTaskById(25), "invalid-response");
  });
  await check("08. Повторяющиеся id категорий отклоняются", async () => {
    const wrongApi = createTaskApi({
      async requestJson() {
        return { data: [{ id: 1, name: "Учёба" }, { id: 1, name: "Проект" }], meta: { total: 2 } };
      },
    });
    await expectError(wrongApi.getCategories(), "invalid-response");
  });
  await check("09. HTTP 503 с повреждённым JSON остаётся http", async () => {
    const fakeClient = createApiClient({
      baseUrl,
      fetchFn: async () => new Response('{"error":', {
        status: 503, headers: { "Content-Type": "application/json" },
      }),
    });
    await expectError(fakeClient.requestJson("/broken-error"), "http", 503);
  });
  await check("10. baseUrl с hash и запрос с неверным тайм-аутом отклоняются", async () => {
    assert.throws(() => buildUrl(baseUrl + "#part", "/tasks"), TypeError);
    assert.throws(() => buildUrl(baseUrl, "https://example.test/tasks"), TypeError);
    await assert.rejects(client.requestJson("/tasks", { timeoutMs: 0 }), TypeError);
  });
  await check("11. Конфигурация варианта 3 получает [4,13,16,25,34]", async () => {
    assert.equal(variantNumber, 3);
    const result = await api.getTasks(variantFilters);
    assert.deepEqual(result.tasks.map((task) => task.id), [4, 13, 16, 25, 34]);
    assert.equal(result.meta.total, 5);
  });
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
console.log("\nИтог собственных проверок: успешно " + passed + ", ошибок " + failed + ".");
if (failed) process.exitCode = 1;
