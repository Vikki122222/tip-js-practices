"use strict";
// Мой вариант (9, 9, 3): все задачи уже выполнены, поэтому цикл не запустится и потребуется 0 дней.
const totalTasks = 12;
const completedTasks = 5;
const dailyLimit = 2;

let err = "";

if (typeof totalTasks !== "number" || typeof completedTasks !== "number") {
    err = "Ошибка: задачи должны быть числами.";
} else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
    err = "Ошибка: задачи должны быть целыми.";
} else if (Number.isNaN(totalTasks) || Number.isNaN(completedTasks)) {
    err = "Ошибка: недопустимое число.";
} else if (totalTasks < 0 || completedTasks < 0) {
    err = "Ошибка: отрицательное количество.";
} else if (totalTasks > 1000) {
    err = "Ошибка: задач слишком много.";
} else if (completedTasks > totalTasks) {
    err = "Ошибка: выполнено больше, чем всего.";
}

// Проверяем dailyLimit отдельно
if (err === "") {
    if (typeof dailyLimit !== "number" || !Number.isInteger(dailyLimit) || Number.isNaN(dailyLimit)) {
        err = "Ошибка: дневная норма должна быть целым числом.";
    } else if (dailyLimit < 1 || dailyLimit > 100) {
        err = "Ошибка: норма должна быть от 1 до 100.";
    }
}

// Если ошибок нет — считаем
if (err !== "") {
    console.log(err);
} else {
    let left = totalTasks - completedTasks;
    console.log("Осталось задач:", left);

    if (left === 0) {
        console.log("Все задачи уже выполнены. Потребуется дней: 0");
    } else {
        let day = 0;

        while (left > 0) {
            day = day + 1;

            let today = dailyLimit;
            if (today > left) {
                today = left;
            }

            left = left - today;
            console.log("День " + day + ": выполнено " + today + ", осталось " + left);
        }

        console.log("Потребуется дней:", day);
    }
}