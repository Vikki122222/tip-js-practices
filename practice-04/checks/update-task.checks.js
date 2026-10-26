import assert from "node:assert/strict";
import { updateTask } from "../src/task-service.js";

const tasks = Object.freeze([
    Object.freeze({
        id: 1, title: "Первая", completed: false, priority: "low",
    }),
    Object.freeze({
        id: 2, title: "Вторая", completed: true, priority: "medium",
    }),
]);

const before = JSON.stringify(tasks);

function check(name, action) {
    action();
    console.log(`OK: ${name}`);
}

check("1. Обновление невыполненной задачи", () => {
    const result = updateTask(tasks, 1, "Новое название", "high");
    assert.equal(result.ok, true);
    assert.deepEqual(result.tasks[0], {
        id: 1, title: "Новое название",
        completed: false, priority: "high",
    });
});

check("2. Сохранение выполненного статуса", () => {
    const result = updateTask(tasks, 2, "Обновлённая", "low");
    assert.equal(result.ok, true);
    assert.deepEqual(result.tasks[1], {
        id: 2, title: "Обновлённая",
        completed: true, priority: "low",
    });
});

check("3. Удаление краевых пробелов", () => {
    const result = updateTask(tasks, 1, "  Новое название  ", "medium");
    assert.equal(result.ok, true);
    assert.equal(result.tasks[0].title, "Новое название");
});

check("4. Отказ для неверного или отсутствующего id", () => {
    for (const id of [0, -1, 1.5, "1", NaN, Infinity, 999]) {
        const result = updateTask(tasks, id, "Название", "low");
        assert.equal(result.ok, false);
        assert.ok(result.error.length > 0);
    }
});

check("5. Проверки названия и приоритета", () => {
    for (const title of ["", "   ", "x".repeat(101), null, 42]) {
        assert.equal(updateTask(tasks, 1, title, "low").ok, false);
    }

    for (const priority of ["urgent", "HIGH", null, undefined]) {
        assert.equal(updateTask(tasks, 1, "Название", priority).ok, false);
    }

    assert.equal(updateTask(tasks, 1, "x".repeat(100), "low").ok, true);
});

check("6. Сохранность исходных данных и порядка", () => {
    const result = updateTask(tasks, 1, "Изменённая", "high");
    assert.equal(result.ok, true);
    assert.notEqual(result.tasks, tasks);
    assert.notEqual(result.tasks[0], tasks[0]);
    assert.deepEqual(result.tasks[1], tasks[1]);
    assert.deepEqual(result.tasks.map(task => task.id), [1, 2]);
    assert.equal(JSON.stringify(tasks), before);
});

console.log("Все 6 проверок updateTask пройдены.");