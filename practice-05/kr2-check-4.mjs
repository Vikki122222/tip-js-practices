
import { createApiClient } from "./src/api-client.js";
import { createTaskApi } from "./src/task-api.js";

// КР2. Задание №4 — обработка HTTP-ошибки.

// Настраиваем HTTP-клиент для учебного API ПР5.
const client = createApiClient({
    baseUrl: "http://127.0.0.1:5505/api",
    timeoutMs: 2000,
});

// Создаём API для получения задач.
const api = createTaskApi(client);

console.log("КР2 — Задание №4");

// Запрашиваем задачу с несуществующим ID 999.
try {
    await api.getTaskById(999);

    // Эта строка не должна выполняться,
    // так как задача 999 отсутствует.
    console.log("ОШИБКА: ожидался HTTP 404");
    process.exitCode = 1;

} catch (error) {
    // Перехватываем ошибку, чтобы программа
    // не завершилась с необработанным исключением.
    console.log("kind:", error.kind);
    console.log("status:", error.status);

    // Проверяем правильность классификации ошибки.
    const passed =
        error.kind === "http" &&
        error.status === 404;

    console.log(
        "Результат:",
        passed ? "ПРОЙДЕНО" : "ОШИБКА"
    );

    if (!passed) {
        process.exitCode = 1;
    }
}
