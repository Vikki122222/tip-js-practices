// Общий набор задач из ПР2.
// Выполнены задачи 1 и 10.
// Невыполнены задачи 4 и 7.
const demoTasks = [
    { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
    { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
    { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
    { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

// Возвращаем новый массив только с невыполненными задачами.
function getPendingTasks(tasks) {
    return tasks.filter(task => task.completed === false);
}

// Проверка 1.
// Ожидаемый результат: [4, 7].
const pendingDemoTasks = getPendingTasks(demoTasks);

console.log(
    "Невыполненные задачи demoTasks:",
    pendingDemoTasks.map(task => task.id)
);

// Проверка 2.
// Для пустого массива ожидаемый результат: [].
const pendingEmptyTasks = getPendingTasks([]);

console.log(
    "Невыполненные задачи пустого массива:",
    pendingEmptyTasks
);