"use strict";

// Входные данные.
// totalTasks — общее количество задач.
// completedTasks — количество выполненных задач.
//
// Значения меняются для разных проверок.
const totalTasks = 5;
const completedTasks = 6;

// Проверяем, что оба значения имеют тип number.
// Строки вроде "5" не должны автоматически преобразовываться в число.
const isNumber =
    typeof totalTasks === "number" &&
    typeof completedTasks === "number";

// Проверяем, что оба значения являются целыми числами.
// Например, 5 подходит, а 5.5 — нет.
const isInteger =
    Number.isInteger(totalTasks) &&
    Number.isInteger(completedTasks);

// Дополнительно проверяем, что значения не являются NaN.
const isNotNaN =
    !Number.isNaN(totalTasks) &&
    !Number.isNaN(completedTasks);

// Если тип неправильный, значение нецелое или NaN,
// обычную сводку не выводим, а показываем ошибку.
if (!isNumber || !isInteger || !isNotNaN) {
    console.log("Ошибка: нужно ввести целые числа.");
}

// Количество задач и выполненных задач
// не может быть отрицательным.
else if (totalTasks < 0 || completedTasks < 0) {
    console.log("Ошибка: количество не может быть отрицательным.");
}

// По условию допустимо максимум 1000 задач.
else if (totalTasks > 1000) {
    console.log("Ошибка: слишком много задач, максимум 1000.");
}

// Выполненных задач не может быть больше,
// чем общее количество задач.
else if (completedTasks > totalTasks) {
    console.log("Ошибка: выполненных задач больше, чем всего.");
}

// Отдельно обрабатываем случай,
// когда задач вообще нет.
else if (totalTasks === 0 && completedTasks === 0) {
    console.log("Задач пока нет");
}

// Если данные корректны, рассчитываем сводку.
else {
    // Остаток — разница между общим количеством
    // и выполненными задачами.
    const left = totalTasks - completedTasks;

    // Вычисляем процент выполнения.
    const percent = (completedTasks / totalTasks) * 100;

    // Если выполнена хотя бы одна задача,
    // но ещё не все, статус — "В работе".
    let state = "В работе";

    // Если ни одна задача не выполнена.
    if (completedTasks === 0) {
        state = "Не начато";
    }

    // Если выполнены все задачи.
    else if (completedTasks === totalTasks) {
        state = "Завершено";
    }

    // Вывод итоговой сводки в консоль.
    console.log("Всего задач:", totalTasks);
    console.log("Выполнено:", completedTasks);
    console.log("Осталось:", left);

    // toFixed(1) оставляет один знак после точки.
    console.log("Прогресс:", percent.toFixed(1) + "%");

    console.log("Статус:", state);
}