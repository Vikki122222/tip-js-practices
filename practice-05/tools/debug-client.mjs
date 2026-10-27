// Настоящие точки останова через Chrome DevTools Protocol в Node.js Inspector.
// Сервер преподавателя и исходники клиента не модифицируются.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApiServer } from "../api/server.mjs";

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = "http://127.0.0.1:" + server.address().port + "/api";
const child = spawn(process.execPath, ["--inspect-brk=127.0.0.1:0", "tools/debug-target.mjs"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  env: { ...process.env, API_URL: baseUrl },
  stdio: ["ignore", "pipe", "pipe"],
});
const exited = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", resolve);
});
let socket;
let stdout = "";
let stderr = "";
let captureFailure;
const snapshots = [];
const timer = setTimeout(() => {
  captureFailure = new Error("Отладка не завершилась за 20 секунд");
  socket?.close();
  child.kill();
}, 20000);
const inspectorUrl = new Promise((resolve, reject) => {
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    const match = stderr.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/);
    if (match) resolve(match[0]);
  });
  child.once("error", reject);
  child.once("close", () => reject(new Error("Процесс закрылся до запуска Inspector")));
});
child.stdout.on("data", (chunk) => {
  stdout += chunk;
  if (stdout.includes("DEBUG_TARGET_DONE")) socket?.close();
});

try {
  socket = new WebSocket(await inspectorUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  const breakpoints = new Map();
  function post(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const action = pending.get(message.id);
      if (!action) return;
      pending.delete(message.id);
      if (message.error) action.reject(new Error(message.error.message));
      else action.resolve(message.result);
      return;
    }
    if (message.method === "Debugger.paused") {
      void (async () => {
        for (const id of message.params.hitBreakpoints ?? []) {
          const point = breakpoints.get(id);
          if (!point) continue;
          const evaluation = await post("Debugger.evaluateOnCallFrame", {
            callFrameId: message.params.callFrames[0].callFrameId,
            expression: "JSON.stringify(" + point.expression + ")",
            returnByValue: true,
          });
          if (evaluation.exceptionDetails) throw new Error("Не удалось прочитать область видимости: " + point.label);
          snapshots.push({
            stage: point.label, source: point.source, line: point.line + 1,
            values: JSON.parse(evaluation.result.value),
          });
        }
        await post("Debugger.resume");
      })().catch((error) => { captureFailure = error; socket.close(); child.kill(); });
    }
  });
  await post("Runtime.enable");
  await post("Debugger.enable");

  const sourceUrl = new URL("../src/api-client.js", import.meta.url);
  const lines = (await readFile(sourceUrl, "utf8")).split("\n");
  async function addPoint(url, sourceLines, needle, label, expression, start = 0) {
    const line = sourceLines.findIndex((text, index) => index >= start && text.includes(needle));
    assert.ok(line >= 0, "Строка точки останова не найдена: " + label);
    const { breakpointId } = await post("Debugger.setBreakpointByUrl", { url: url.href, lineNumber: line });
    breakpoints.set(breakpointId, { label, expression, source: url.pathname.split("/").slice(-2).join("/"), line });
  }
  await addPoint(sourceUrl, lines, "response = await fetchFn", "before-fetch", "({url, query, aborted: requestSignal.aborted})");
  await addPoint(sourceUrl, lines, "if (!(response instanceof Response))", "after-response", "({url, status: response.status, ok: response.ok, contentType: response.headers.get('content-type')})");
  await addPoint(sourceUrl, lines, "return await response.json()", "before-json", "({url, status: response.status, ok: response.ok, contentType})");
  const errorStart = lines.findIndex((line) => line.includes("const error = isPlainObject(payload)"));
  await addPoint(sourceUrl, lines, "throw new ApiError(", "http-error", "({url, status: response.status, ok: response.ok, contentType, payload})", errorStart);
  const taskUrl = new URL("../src/task-api.js", import.meta.url);
  const taskLines = (await readFile(taskUrl, "utf8")).split("\n");
  await addPoint(taskUrl, taskLines, "if (!isRecord(payload) || !isTask(payload.data)", "parsed-payload", "({id, payload})");
  await post("Runtime.runIfWaitingForDebugger");
  const exitCode = await exited;
  if (captureFailure) throw captureFailure;
  assert.equal(exitCode, 0, stderr);
  for (const stage of ["before-fetch", "after-response", "before-json", "http-error", "parsed-payload"]) {
    assert.ok(snapshots.some((row) => row.stage === stage), "Нет остановки: " + stage);
  }
  assert.ok(snapshots.some((row) => row.stage === "after-response" && row.values.status === 404));
  const reports = new URL("../reports/", import.meta.url);
  await mkdir(reports, { recursive: true });
  await writeFile(new URL("debug-trace.json", reports), JSON.stringify({ baseUrl, snapshots }, null, 2) + "\n");
  await writeFile(new URL("debug-result.txt", reports), stdout);
  console.log("Сработали настоящие точки останова: " + snapshots.length);
  console.log(JSON.stringify(snapshots, null, 2));
  console.log(stdout);
} finally {
  clearTimeout(timer);
  socket?.close();
  if (child.exitCode === null) child.kill();
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
