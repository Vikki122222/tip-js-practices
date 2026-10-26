// Новый модуль ПР3.
// Функция получает:
// tasks  — исходный массив задач;
// filter — выбранный фильтр: all, pending или completed.
//
// Возвращается новый массив.
// Исходный массив задач не изменяется,
// порядок элементов сохраняется.

export function getVisibleTasks(tasks, filter = "all") {

    // Фильтр "pending":
    // оставляем только невыполненные задачи.
    if (filter === "pending") {
        return tasks.filter(
            (task) => task.completed === false
        );
    }

    // Фильтр "completed":
    // оставляем только выполненные задачи.
    if (filter === "completed") {
        return tasks.filter(
            (task) => task.completed === true
        );
    }

    // Для фильтра "all" возвращаем копию массива.
    // [...tasks] создаёт новый массив,
    // поэтому исходный массив не изменяется.
    return [...tasks];
}