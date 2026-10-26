import assert from "node:assert/strict";
import { validateTaskDraft } from "../src/form-validation.js";

const tasks = Object.freeze([
    Object.freeze({
        id: 1, title: "Первая", completed: false, priority: "low",
    }),
    Object.freeze({
        id: 4, title: "Вторая", completed: true, priority: "high",
    }),
]);

function check(name, action) {
    action();
    console.log(`OK: ${name}`);
}

function draft(fields = {}) {
    return { id: "20", title: "Название", priority: "medium", ...fields };
}

check("1. Создание и нормализация полей", () => {
    const result = validateTaskDraft(
        draft({ title: "  Новая задача  " }), tasks
    );
    assert.deepEqual(result, {
        ok: true,
        value: { id: 20, title: "Новая задача", priority: "medium" },
    });
});

check("2. Некорректные и повторяющиеся id", () => {
    for (const id of ["", "0", "-1", "1.5", "4abc", "4",
        Number.MAX_SAFE_INTEGER + 1]) {
        const result = validateTaskDraft(draft({ id }), tasks);
        assert.equal(result.ok, false);
        assert.ok(result.errors.id.length > 0);
    }
});

check("3. Тип и граничные длины названия", () => {
    for (const title of ["", "   ", "x".repeat(101), null, 42]) {
        const result = validateTaskDraft(draft({ title }), tasks);
        assert.equal(result.ok, false);
        assert.ok(result.errors.title.length > 0);
    }

    for (const title of ["x", "x".repeat(100)]) {
        assert.equal(validateTaskDraft(draft({ title }), tasks).ok, true);
    }
});

check("4. Допустимые и недопустимые приоритеты", () => {
    for (const priority of ["low", "medium", "high"]) {
        assert.equal(validateTaskDraft(draft({ priority }), tasks).ok, true);
    }

    for (const priority of ["urgent", "HIGH", " high ", "", null]) {
        const result = validateTaskDraft(draft({ priority }), tasks);
        assert.equal(result.ok, false);
        assert.ok(result.errors.priority.length > 0);
    }
});

check("5. Редактирование использует editingId", () => {
    const result = validateTaskDraft(
        draft({ id: "игнорируется", title: "  Изменённая  " }),
        tasks,
        4
    );
    assert.deepEqual(result, {
        ok: true,
        value: { id: 4, title: "Изменённая", priority: "medium" },
    });
});

check("6. Неверный или отсутствующий editingId", () => {
    for (const editingId of [999, 0, -1, 1.5, "4"]) {
        const result = validateTaskDraft(draft(), tasks, editingId);
        assert.equal(result.ok, false);
        assert.ok(result.errors.id.length > 0);
    }
});

check("7. Несколько ошибок возвращаются вместе", () => {
    const result = validateTaskDraft(
        draft({ id: "", title: "   ", priority: "urgent" }), tasks
    );
    assert.equal(result.ok, false);
    assert.deepEqual(
        Object.keys(result.errors).sort(),
        ["id", "priority", "title"]
    );
});

check("8. Входные данные не изменяются", () => {
    const source = Object.freeze(draft({ title: "  Название  " }));
    const before = JSON.stringify(tasks);

    assert.equal(validateTaskDraft(source, tasks).ok, true);
    assert.equal(source.id, "20");
    assert.equal(source.title, "  Название  ");
    assert.equal(JSON.stringify(tasks), before);
});

console.log("Все 8 проверок validateTaskDraft пройдены.");