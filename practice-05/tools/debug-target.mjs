// Выполняется дочерним процессом под управлением Node.js Inspector.
import assert from "node:assert/strict";
import { createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
const api = createTaskApi(createApiClient({ baseUrl: process.env.API_URL }));
const task = await api.getTaskById(25);
assert.equal(task.id, 25);
console.log("SUCCESS_PAYLOAD " + JSON.stringify(task));
try {
  await api.getTaskById(999);
  throw new Error("Ожидался отказ запроса задачи 999");
} catch (error) {
  const summary = { kind: error.kind, status: error.status, code: error.code, details: error.details, url: error.url };
  assert.equal(summary.kind, "http");
  assert.equal(summary.status, 404);
  console.log("HTTP_ERROR " + JSON.stringify(summary));
}
console.log("DEBUG_TARGET_DONE");
