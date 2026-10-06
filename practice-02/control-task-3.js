// Берём общий массив demoTasks из ПР2.
// Сам массив уже приведён в задании 2 контрольной,
// поэтому здесь повторно его не записываем.
import { demoTasks } from "./src/data.js";

// Вспомогательная функция ищет задачу по её id.
// Она используется внутри setTaskCompleted.
function findTaskById(tasks, id) {
    return tasks.find(task => task.id === id);
}

// Функция изменяет статус задачи.
//
// При корректных данных возвращается:
// { ok: true, tasks }
//
// При этом создаётся новый массив,
// а изменённая задача также создаётся как новый объект.
// Исходный массив не изменяется.
function setTaskCompleted(tasks, id, completed) {
    // id должен быть положительным безопасным целым числом.
    if (!Number.isSafeInteger(id) || id <= 0) {
        return {
            ok: false,
            error: "Некорректный ID"
        };
    }

    // completed должен быть строго boolean.
    if (typeof completed !== "boolean") {
        return {
            ok: false,
            error: "Статус должен быть boolean"
        };
    }

    // Проверяем существование задачи.
    if (!findTaskById(tasks, id)) {
        return {
            ok: false,
            error: "Задача не найдена"
        };
    }

    // Создаём новый массив.
    // Для нужной задачи создаём новый объект
    // и изменяем только свойство completed.
    return {
        ok: true,
        tasks: tasks.map(task =>
            task.id === id
                ? { ...task, completed }
                : task
        )
    };
}

// Проверка 1.
// Для задачи id = 4 устанавливаем completed = true.
// В исходном demoTasks статус должен остаться false,
// а в новом массиве стать true.

const successResult = setTaskCompleted(demoTasks, 4, true);

const originalTask = findTaskById(demoTasks, 4);

const updatedTask = successResult.ok
    ? findTaskById(successResult.tasks, 4)
    : null;

console.log("Проверка 1: id = 4, completed = true");
console.log("Статус в исходном массиве:", originalTask.completed);
console.log("Статус в новом массиве:", updatedTask.completed);


// Проверка 2.
// Пытаемся изменить несуществующую задачу id = 777.
// Ожидается отказ: ok = false.

const errorResult = setTaskCompleted(demoTasks, 777, true);

console.log("");
console.log("Проверка 2: id = 777, completed = true");
console.log("Результат:", errorResult);

// Дополнительно убеждаемся,
// что после ошибочного вызова исходная задача id = 4
// по-прежнему имеет исходный статус false.
console.log(
    "Статус id = 4 в исходном массиве после проверок:",
    findTaskById(demoTasks, 4).completed
);