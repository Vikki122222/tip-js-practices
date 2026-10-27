import assert from "node:assert/strict";
import http from "node:http";
import { writeFile } from "node:fs/promises";
// Не нужен для запуска приложения. Дополнительная проверка в отдельном эмуляторе DOM.
const moduleUrl = process.env.PRACTICE06_DOM_MODULE;
if (!moduleUrl) throw new Error("Укажите PRACTICE06_DOM_MODULE: file-URL отдельно установленного happy-dom/lib/index.js.");
const { Browser } = await import(moduleUrl);
import { createApiServer } from "../api/server.mjs";
import { createStaticServer } from "../tools/static-server.mjs";

const reportRoot = new URL("../reports/", import.meta.url);
const API = "http://127.0.0.1:5505/api";
const WEB = "http://127.0.0.1:5506/";
const requests = [];
const scenarios = [];
let apiServer;
let proxy;
const webServer = createStaticServer();
const browser = new Browser({ settings: {
  enableJavaScriptEvaluation: true,
  enableIframePageLoading: true,
  enableCSSFileLoading: true,
} });
const listen = (server, port) => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});
const close = (server) => new Promise((resolve) => {
  server?.closeAllConnections();
  if (server?.listening) server.close(resolve);
  else resolve();
});
async function startApi() {
  apiServer = createApiServer();
  apiServer.on("request", (req) => requests.push({ method: req.method, url: req.url }));
  await listen(apiServer, 5505);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(condition, message, timeout = 6000) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    if (condition()) return;
    await sleep(15);
  }
  throw new Error(message);
}
const node = (doc, selector) => {
  const found = doc.querySelector(selector);
  assert.ok(found, selector);
  return found;
};
const ids = (doc) => [...doc.querySelectorAll("#task-list > [data-task-id]")].map((item) => Number(item.dataset.taskId));
function fill(doc, selector, value) {
  const input = node(doc, selector);
  input.value = value;
  input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
  input.dispatchEvent(new doc.defaultView.Event("change", { bubbles: true }));
}
const click = (doc, selector) => node(doc, selector).click();
const submit = (doc, selector) => node(doc, selector).requestSubmit();
const state = (doc) => node(doc, "#list-state").dataset.kind;
const idle = (doc) => ["ready", "empty"].includes(state(doc)) && !node(doc, "#form-submit").disabled;
async function open(search = "", reset = true) {
  if (reset) await fetch(API + "/debug/reset", { method: "POST" });
  const page = browser.newPage();
  await page.goto(WEB + search);
  await wait(() => page.mainFrame.window.practice06, "Нет точки входа приложения");
  await page.mainFrame.window.practice06.ready;
  return { page, doc: page.mainFrame.window.document, win: page.mainFrame.window };
}
async function scenario(name, action) {
  try {
    const actual = await action();
    scenarios.push({ name, passed: true, actual });
    console.log("OK:", name, JSON.stringify(actual));
  } catch (error) {
    scenarios.push({ name, passed: false, error: error.message });
    console.error("FAIL:", name, error.stack);
    process.exitCode = 1;
  }
}

try {
  await startApi();
  await listen(webServer, 5506);
  const checkPage = browser.newPage();
  await checkPage.goto(WEB + "checks.html");
  await wait(() => checkPage.mainFrame.window.document.querySelector("#check-summary")?.textContent.startsWith("Всего:"),
    "Не завершился checks.html: " + checkPage.virtualConsolePrinter.readAsString(), 45000);
  const checkDoc = checkPage.mainFrame.window.document;
  const summary = node(checkDoc, "#check-summary").textContent;
  const transcript = "Среда: Happy DOM 21.0.4 (эмуляция DOM в Node.js, не настоящий браузер).\n"
    + node(checkDoc, "#check-log").textContent + "\n\n" + summary + "\n";
  await writeFile(new URL("dom-emulation.txt", reportRoot), transcript);
  console.log(transcript);
  assert.equal(summary, "Всего: 14. Пройдено: 14. Ошибок: 0.");
  await checkPage.close();

  await scenario("Вариант 3: изменение high на medium исключает карточку", async () => {
    const { page, doc } = await open("?dataset=variant");
    const before = ids(doc);
    assert.deepEqual(before, [4, 13, 16, 25, 34]);
    click(doc, '[data-task-id="4"] [data-action="edit"]');
    fill(doc, "#task-priority", "medium");
    submit(doc, "#task-form");
    await wait(() => idle(doc) && !ids(doc).includes(4), "Карточка осталась в high");
    const after = ids(doc);
    const task = (await (await fetch(API + "/tasks/4")).json()).data;
    assert.deepEqual(after, [13, 16, 25, 34]);
    assert.equal(task.priority, "medium");
    assert.equal(task.completed, false);
    await page.close();
    return { initialRequest: "GET /api/tasks?priority=high", before, taskId: 4, priority: task.priority,
      completed: task.completed, after, total: after.length };
  });

  await scenario("Пустая выборка удаляет карточки и показывает empty", async () => {
    const { page, doc } = await open();
    fill(doc, "#filter-query", "несуществующая-задача-пр6");
    submit(doc, "#filters-form");
    await wait(() => state(doc) === "empty", "Нет empty");
    assert.deepEqual(ids(doc), []);
    assert.equal(node(doc, "#task-total").textContent, "0");
    const actual = { state: state(doc), ids: ids(doc), total: node(doc, "#task-total").textContent };
    await page.close();
    return actual;
  });

  await scenario("Неверная форма показывает ошибки без POST", async () => {
    const { page, doc } = await open();
    const before = requests.filter((req) => req.method === "POST" && req.url === "/api/tasks").length;
    fill(doc, "#task-title", "   ");
    fill(doc, "#task-priority", "medium");
    fill(doc, "#task-category", "2");
    submit(doc, "#task-form");
    await wait(() => node(doc, "#task-title-error").textContent, "Нет ошибки названия");
    const after = requests.filter((req) => req.method === "POST" && req.url === "/api/tasks").length;
    assert.equal(after - before, 0);
    const actual = { postRequests: after - before, ariaInvalid: node(doc, "#task-title").getAttribute("aria-invalid"), total: ids(doc).length };
    await page.close();
    return actual;
  });

  await scenario("Создание и обновление страницы сохраняют серверную задачу", async () => {
    const opened = await open();
    fill(opened.doc, "#task-title", "  Задача ПР6  ");
    fill(opened.doc, "#task-category", "2");
    submit(opened.doc, "#task-form");
    await wait(() => idle(opened.doc) && ids(opened.doc).includes(35), "Не создана 35");
    await opened.page.reload();
    await wait(() => opened.page.mainFrame.window.practice06, "Нет приложения после reload");
    await opened.page.mainFrame.window.practice06.ready;
    const doc = opened.page.mainFrame.window.document;
    assert.equal(node(doc, '[data-task-id="35"] .task-title').textContent, "Задача ПР6");
    const actual = { id: 35, title: node(doc, '[data-task-id="35"] .task-title').textContent, totalAfterReload: ids(doc).length };
    await opened.page.close();
    return actual;
  });

  await scenario("Редактирование сохраняет completed у выполненной задачи", async () => {
    const { page, doc } = await open();
    click(doc, '[data-task-id="16"] [data-action="edit"]');
    fill(doc, "#task-title", "Учебный API проверен");
    submit(doc, "#task-form");
    await wait(() => idle(doc) && node(doc, '[data-task-id="16"] .task-title').textContent === "Учебный API проверен", "Нет изменений");
    const task = (await (await fetch(API + "/tasks/16")).json()).data;
    assert.equal(task.completed, true);
    await page.close();
    return { id: task.id, title: task.title, completed: task.completed };
  });

  await scenario("Смена статуса удаляет задачу из completed=false", async () => {
    const { page, doc } = await open();
    fill(doc, "#filter-completed", "false");
    submit(doc, "#filters-form");
    await wait(() => state(doc) === "ready" && ids(doc).length === 7, "Нет фильтра");
    click(doc, '[data-task-id="4"] [data-action="toggle"]');
    await wait(() => idle(doc) && !ids(doc).includes(4), "Статус не применился");
    const task = (await (await fetch(API + "/tasks/4")).json()).data;
    assert.equal(task.completed, true);
    const actual = { id: 4, completed: true, visibleIds: ids(doc), total: ids(doc).length };
    await page.close();
    return actual;
  });

  await scenario("Отмена подтверждения удаления не отправляет DELETE", async () => {
    const { page, doc, win } = await open();
    win.confirm = () => false;
    const before = requests.filter((req) => req.method === "DELETE").length;
    click(doc, '[data-task-id="7"] [data-action="delete"]');
    assert.ok(ids(doc).includes(7));
    const count = requests.filter((req) => req.method === "DELETE").length - before;
    assert.equal(count, 0);
    await page.close();
    return { deleteRequests: count, task7StillPresent: true };
  });

  await scenario("Reset восстанавливает набор после подтверждённого удаления", async () => {
    const { page, doc, win } = await open();
    win.confirm = () => true;
    click(doc, '[data-task-id="7"] [data-action="delete"]');
    await wait(() => idle(doc) && !ids(doc).includes(7), "Не удалена 7");
    click(doc, "#reset-data");
    await wait(() => idle(doc) && ids(doc).length === 12, "Reset не завершился");
    assert.ok(ids(doc).includes(7));
    const actual = { total: ids(doc).length, restoredIds: ids(doc) };
    await page.close();
    return actual;
  });

  await scenario("Вывод длительности загрузки — дополнительное задание 5", async () => {
    const { page, doc } = await open();
    const duration = node(doc, "#load-duration").textContent;
    assert.match(duration, /^\d+\.\d мс$/);
    assert.ok(Number.parseFloat(duration) >= 0);
    await page.close();
    return { duration };
  });

  await scenario("Недоступный API и повтор после его запуска", async () => {
    await close(apiServer);
    const { page, doc } = await open("", false);
    assert.equal(state(doc), "error");
    assert.equal(node(doc, "#retry-load").hidden, false);
    const error = node(doc, "[data-state-message]").textContent;
    await startApi();
    click(doc, "#retry-load");
    await wait(() => idle(doc) && ids(doc).length === 12, "Retry не восстановил интерфейс");
    assert.equal(node(doc, "#task-category").options.length, 4);
    await page.close();
    return { before: "error", error, after: "ready", total: 12, categories: 3 };
  });

  await scenario("Перезапуск API сбрасывает созданную задачу", async () => {
    await fetch(API + "/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Исчезнет при перезапуске", priority: "low", categoryId: 1 }) });
    assert.equal((await (await fetch(API + "/tasks")).json()).meta.total, 13);
    await close(apiServer);
    await startApi();
    const { page, doc } = await open("", false);
    assert.equal(ids(doc).length, 12);
    assert.equal(ids(doc).includes(35), false);
    await page.close();
    return { beforeRestart: 13, afterRestart: 12, task35Present: false };
  });

  await scenario("Быстрые фильтры с задержками 200/20 мс применяют последний ответ", async () => {
    let markLow;
    const lowArrived = new Promise((resolve) => { markLow = resolve; });
    let cancelled = false;
    proxy = http.createServer(async (req, res) => {
      const url = new URL(req.url, API);
      const low = req.method === "GET" && url.searchParams.get("priority") === "low";
      const high = req.method === "GET" && url.searchParams.get("priority") === "high";
      if (low) {
        res.on("close", () => { if (!res.writableEnded) cancelled = true; });
        markLow();
      }
      const upstream = await fetch("http://127.0.0.1:5505" + req.url, { method: req.method });
      const body = await upstream.text();
      await sleep(low ? 200 : high ? 20 : 0);
      if (!res.destroyed) {
        res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
        res.end(body);
      }
    });
    await listen(proxy, 0);
    const proxyUrl = `http://127.0.0.1:${proxy.address().port}/api`;
    const { page, doc } = await open("?api=" + encodeURIComponent(proxyUrl));
    fill(doc, "#filter-priority", "low");
    submit(doc, "#filters-form");
    await lowArrived;
    fill(doc, "#filter-priority", "high");
    submit(doc, "#filters-form");
    await wait(() => state(doc) === "ready" && ids(doc).length === 5, "Последний фильтр не применился");
    await wait(() => cancelled, "Предыдущий HTTP-запрос не отменён");
    const duration = node(doc, "#load-duration").textContent;
    await sleep(250);
    assert.deepEqual(ids(doc), [4, 13, 16, 25, 34]);
    assert.equal(node(doc, "#load-duration").textContent, duration);
    assert.equal(node(doc, "#operation-message").textContent, "");
    await page.close();
    await close(proxy);
    return { delaysMs: [200, 20], previousRequestCancelled: cancelled,
      finalPriority: "high", finalIds: [4, 13, 16, 25, 34], duration, staleResultIgnored: true };
  });

  await writeFile(new URL("scenarios.json", reportRoot), JSON.stringify({
    environment: "Node.js v24.22.1 + Happy DOM 21.0.4 + предоставленный HTTP API; не реальный браузер",
    scenarios,
    passed: scenarios.filter((item) => item.passed).length,
    failed: scenarios.filter((item) => !item.passed).length,
    requests,
  }, null, 2) + "\n");
} finally {
  await browser.close();
  await close(proxy);
  await close(webServer);
  await close(apiServer);
}
