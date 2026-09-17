"use strict";

const total = "12";
const done = "5";

console.log("Входные данные:", total, "и", done);

const t = total.trim();
const d = done.trim();

if (t === "" || d === "") {
    console.log("Ошибка: пустая строка.");
} else {
    const totalNum = Number(t);
    const doneNum = Number(d);

    console.log("После Number():", totalNum, "и", doneNum);

    if (!Number.isFinite(totalNum) || !Number.isFinite(doneNum)) {
        console.log("Ошибка: не число или бесконечность.");
    } else if (!Number.isInteger(totalNum) || !Number.isInteger(doneNum)) {
        console.log("Ошибка: должно быть целое число.");
    } else if (totalNum < 0 || doneNum < 0) {
        console.log("Ошибка: отрицательное количество.");
    } else if (totalNum > 1000) {
        console.log("Ошибка: превышена верхняя граница.");
    } else if (doneNum > totalNum) {
        console.log("Ошибка: выполнено больше, чем существует.");
    } else if (totalNum === 0 && doneNum === 0) {
        console.log("Задач пока нет");
    } else {
        const left = totalNum - doneNum;
        const percent = (doneNum / totalNum) * 100;

        let state = "в работе";
        if (doneNum === 0) {
            state = "не начато";
        } else if (doneNum === totalNum) {
            state = "завершено";
        }

        console.log("Всего задач:", totalNum);
        console.log("Выполнено:", doneNum);
        console.log("Осталось:", left);
        console.log("Прогресс:", percent.toFixed(1) + "%");
        console.log("Статус:", state);
    }
}