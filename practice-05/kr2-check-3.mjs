
import { createApiClient } from "./src/api-client.js";
import { createTaskApi } from "./src/task-api.js";

// КР2. Задание №3 — получение задач с сервера.

// Создаём HTTP-клиент для учебного API ПР5.
const client = createApiClient({
    baseUrl: "http://127.0.0.1:5505/api",
    timeoutMs: 2000,
});

// Создаём предметный API для работы с задачами.
const api = createTaskApi(client);

// Запрашиваем только незавершённые задачи
// с высоким приоритетом.
const { tasks, meta } = await api.getTasks({
    completed: false,
    priority: "high",
});

// Выводим идентификаторы и количество задач.
const ids = tasks.map((task) => task.id);

console.log("КР2 — Задание №3");
console.log("ID задач:", ids);
console.log("meta.total:", meta.total);

// Проверяем соответствие ожидаемому результату.
const passed =
    JSON.stringify(ids) === JSON.stringify([4, 13, 34]) &&
    meta.total === 3;

console.log("Результат:", passed ? "ПРОЙДЕНО" : "ОШИБКА");

if (!passed) {
    process.exitCode = 1;
}
