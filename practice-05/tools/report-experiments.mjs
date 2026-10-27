// Воспроизводит наблюдения отчёта на собственном временном локальном API.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const reports = new URL("../reports/", import.meta.url);
await mkdir(reports, { recursive: true });

async function listen(port = 0) {
  const server = createApiServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
function run(file, baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      cwd, env: { ...process.env, API_URL: baseUrl }, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    const timer = setTimeout(() => { child.kill(); reject(new Error("Клиент не завершился за 15 секунд")); }, 15000);
    child.once("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr });
    });
  });
}
function errorRecord(error) {
  assert.ok(error instanceof ApiError);
  return {
    name: error.name, kind: error.kind, status: error.status,
    code: error.code, details: error.details, url: error.url, message: error.message,
    cause: error.cause ? { name: error.cause.name, message: error.cause.message } : null,
  };
}
let server = await listen();
let isListening = true;
const port = server.address().port;
const baseUrl = "http://127.0.0.1:" + port + "/api";
const client = createApiClient({ baseUrl });
const api = createTaskApi(client);
const result = { baseUrl, environment: { node: process.version, platform: process.platform, arch: process.arch }, http: [], errors: {}, timings: [] };
try {
  for (const path of ["/health", "/tasks", "/tasks?completed=false&priority=high", "/tasks/25", "/tasks/999", "/categories"]) {
    const response = await fetch(baseUrl + path, { headers: { Accept: "application/json" } });
    result.http.push({
      path, url: response.url, method: "GET", status: response.status, ok: response.ok,
      contentType: response.headers.get("content-type"), payload: await response.json(),
    });
  }
  result.exampleFetch = await run("examples/fetch-basics.js", baseUrl);
  assert.equal(result.exampleFetch.exitCode, 0);
  const full = await api.getTasks();
  const common = await api.loadInitialData({ completed: false, priority: "high" });
  const variant = await api.getTasks(variantFilters);
  result.domain = {
    allIds: full.tasks.map((task) => task.id),
    general: { ids: common.tasks.map((task) => task.id), meta: common.meta, categories: common.categories },
    task25: await api.getTaskById(25),
    variant: { url: buildUrl(baseUrl, "/tasks", variantFilters), ids: variant.tasks.map((task) => task.id), meta: variant.meta },
  };
  assert.equal(full.meta.total, 12);
  assert.deepEqual(result.domain.general.ids, [4, 13, 34]);
  assert.deepEqual(result.domain.variant.ids, [4, 13, 16, 25, 34]);

  const cases = [
    ["task999", "http", () => api.getTaskById(999)],
    ["invalidQuery", "http", () => client.requestJson("/tasks", { query: { completed: "yes" } })],
    ["serviceUnavailable", "http", () => client.requestJson("/debug/error")],
    ["invalidJson", "invalid-response", () => client.requestJson("/debug/invalid-json")],
    ["text", "invalid-response", () => client.requestJson("/debug/text")],
    ["timeout", "timeout", () => client.requestJson("/debug/delay", { query: { ms: 150 }, timeoutMs: 20 })],
    ["aborted", "aborted", () => {
      const controller = new AbortController();
      const pending = client.requestJson("/debug/delay", {
        query: { ms: 150 }, timeoutMs: 1000, signal: controller.signal,
      });
      controller.abort();
      return pending;
    }],
  ];
  for (const [name, kind, action] of cases) {
    let caught;
    try { await action(); } catch (error) { caught = error; }
    assert.ok(caught instanceof ApiError, name + " должен завершиться ApiError");
    assert.equal(caught.kind, kind);
    result.errors[name] = errorRecord(caught);
  }

  for (let trial = 1; trial <= 3; trial += 1) {
    let start = performance.now();
    await client.requestJson("/debug/delay", { query: { ms: 150 } });
    await client.requestJson("/debug/delay", { query: { ms: 150 } });
    const sequentialMs = performance.now() - start;
    start = performance.now();
    await Promise.all([
      client.requestJson("/debug/delay", { query: { ms: 150 } }),
      client.requestJson("/debug/delay", { query: { ms: 150 } }),
    ]);
    result.timings.push({ trial, sequentialMs, parallelMs: performance.now() - start });
  }

  result.consoleOnline = await run("src/main.js", baseUrl);
  assert.equal(result.consoleOnline.exitCode, 0);
  await close(server);
  isListening = false;
  result.consoleOffline = await run("src/main.js", baseUrl);
  assert.equal(result.consoleOffline.exitCode, 1);
  assert.match(result.consoleOffline.stderr, /Тип: network/);
  try { await client.requestJson("/health"); }
  catch (error) { result.errors.network = errorRecord(error); }
  assert.equal(result.errors.network?.kind, "network");
  server = await listen(port);
  isListening = true;
  result.consoleRestarted = await run("src/main.js", baseUrl);
  assert.equal(result.consoleRestarted.exitCode, 0);
  const health = await client.requestJson("/health");
  assert.equal(health.data.status, "ok");
  result.restarted = true;

  await writeFile(new URL("experiments.json", reports), JSON.stringify(result, null, 2) + "\n");
  await writeFile(new URL("client-online.txt", reports), result.consoleOnline.stdout + result.consoleOnline.stderr);
  await writeFile(new URL("client-offline.txt", reports), result.consoleOffline.stdout + result.consoleOffline.stderr);
  await writeFile(new URL("client-restarted.txt", reports), result.consoleRestarted.stdout + result.consoleRestarted.stderr);
  await writeFile(new URL("fetch-basics.txt", reports), result.exampleFetch.stdout + result.exampleFetch.stderr);
  console.log("HTTP-наблюдения:");
  console.table(result.http.map(({ path, status, ok, contentType }) => ({ path, status, ok, contentType })));
  console.log("Общий запрос:", JSON.stringify(result.domain.general.ids));
  console.log("Вариант 3:", JSON.stringify(result.domain.variant.ids));
  console.log("Классификация:", JSON.stringify(Object.fromEntries(Object.entries(result.errors).map(([name, error]) => [name, error.kind]))));
  console.table(result.timings.map((row) => ({
    trial: row.trial, sequentialMs: row.sequentialMs.toFixed(1), parallelMs: row.parallelMs.toFixed(1),
  })));
  console.log("Остановка и повторный запуск API проверены. Фактические данные: reports/experiments.json");
} finally {
  if (isListening) await close(server);
}
