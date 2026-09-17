"use strict";

const totalTasks = 9;
const completedTasks = 9;


const isNumber = typeof totalTasks === "number" && typeof completedTasks === "number";
const isInteger = Number.isInteger(totalTasks) && Number.isInteger(completedTasks);
const isNotNaN = !Number.isNaN(totalTasks) && !Number.isNaN(completedTasks);

if (!isNumber || !isInteger || !isNotNaN) {
    console.log("Ошибка: нужно ввести целые числа.");
}
else if (totalTasks < 0 || completedTasks < 0) {
    console.log("Ошибка: количество не может быть отрицательным.");
}
else if (totalTasks > 1000) {
    console.log("Ошибка: слишком много задач, максимум 1000.");
}
else if (completedTasks > totalTasks) {
    console.log("Ошибка: выполненных задач больше, чем всего.");
}
else if (totalTasks === 0 && completedTasks === 0) {
    console.log("Задач пока нет");
}
else {
    const left = totalTasks - completedTasks;
    const percent = (completedTasks / totalTasks) * 100;

    let state = "в работе";

    if (completedTasks === 0) {
        state = "не начато";
    }
    else if (completedTasks === totalTasks) {
        state = "завершено";
    }

    console.log("Всего задач:", totalTasks);
    console.log("Выполнено:", completedTasks);
    console.log("Осталось:", left);
    console.log("Прогресс:", percent.toFixed(1) + "%");
    console.log("Статус:", state);
}