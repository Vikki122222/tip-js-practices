
import { validateTaskDraft } from "./src/form-validation.js";

// КР2. Задание №1 — проверка названия задачи.

// Используем пустой массив задач согласно условию.
const tasks = [];

// Общие значения для обоих проверочных вызовов.
const common = {
    id: "20",
    priority: "high",
};

// Проверка 1. Корректное название с пробелами по краям.
// Ожидаем успешную валидацию и удаление пробелов.
const result1 = validateTaskDraft(
    { ...common, title: " Изучить localStorage " },
    tasks
);

console.log("Проверка 1 — корректное название:");
console.log(result1);

// Проверка 2. Название состоит только из пробела.
// Ожидаем ошибку валидации названия.
const result2 = validateTaskDraft(
    { ...common, title: " " },
    tasks
);

console.log("Проверка 2 — пустое название:");
console.log(result2);

// Автоматически проверяем ожидаемые результаты.
const check1 =
    result1.ok === true &&
    result1.value?.title === "Изучить localStorage";

const check2 =
    result2.ok === false &&
    typeof result2.errors?.title === "string" &&
    result2.errors.title.length > 0;

console.log("Проверка 1:", check1 ? "ПРОЙДЕНА" : "ОШИБКА");
console.log("Проверка 2:", check2 ? "ПРОЙДЕНА" : "ОШИБКА");

if (!check1 || !check2) {
    process.exitCode = 1;
}
