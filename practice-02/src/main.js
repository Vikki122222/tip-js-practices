import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
  getTaskStats,
  getTaskTitles,
  getPendingTasks
} from "./task-service.js";

//вывод статистики по текущему списку
const printStats = (tasks, stepName) => {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`[${stepName}] Всего: ${total}, выполнено: ${completed}, осталось: ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
};

console.log("ЧАСТЬ 1. ОБЩИЙ СЦЕНАРИЙ");

let currentTasks = demoTasks;

console.log("Исходные задачи:", currentTasks);
console.log("Названия:", getTaskTitles(currentTasks));
console.log("Еще не выполнены:", getPendingTasks(currentTasks));
printStats(currentTasks, "Старт");

//добавляем задачу с id 20
let result = addTask(currentTasks, 20, "Добавить проверку", "high");
if (result.ok) currentTasks = result.tasks;
printStats(currentTasks, "Добавили id 20");

//отмечаем задачу 4 как выполненную
result = setTaskCompleted(currentTasks, 4, true);
if (result.ok) currentTasks = result.tasks;
printStats(currentTasks, "Выполнили id 4");

//меняем название задачи 10
result = renameTask(currentTasks, 10, "Подготовить инструкцию запуска");
if (result.ok) currentTasks = result.tasks;
printStats(currentTasks, "Переименовали id 10");

//удаляем 7
result = removeTask(currentTasks, 7);
if (result.ok) currentTasks = result.tasks;
printStats(currentTasks, "Удалили id 7");

//специально вызываем ошибку дубликатом
console.log("\nПробуем добавить дубликат:");
result = addTask(currentTasks, 20, "Какая-то задача", "low");
if (!result.ok) console.error(`Получили ошибку: ${result.error}`);

//проверяем, что исходный массив не изменился
console.log("\nПроверка мутаций исходного массива:");

console.log("Длина нового массива:", currentTasks.length);
console.log("Длина старого demoTasks:", demoTasks.length);
console.log("demoTasks после сценария:", demoTasks);


console.log(`\n\nЧАСТЬ 2. ИНДИВИДУАЛЬНЫЙ СЦЕНАРИЙ (ВАРИАНТ ${variantNumber})`);
let myTasks = variantTasks;

printStats(myTasks, "Начало варианта");

//добавляем 80 (по таблице приоритет low)
result = addTask(myTasks, 80, "Адаптировать под мобильные устройства", "low");
if (result.ok) myTasks = result.tasks;

//выполняем 11 (хотя она уже выполнена, по заданию нужно прогнать)
result = setTaskCompleted(myTasks, 11, true);
if (result.ok) myTasks = result.tasks;

//переименовываем 23
result = renameTask(myTasks, 23, "Выбрать итоговый цветовой профиль");
if (result.ok) myTasks = result.tasks;

//удаляем задачу 37
result = removeTask(myTasks, 37);
if (result.ok) myTasks = result.tasks;

//пробуем снова добавить 80
console.log("\nПробуем добавить id 80 повторно:");
result = addTask(myTasks, 80, "Лишняя задача", "high");
if (!result.ok) console.error(`Получили ошибку: ${result.error}`);

console.log("\nИтоговый массив варианта:");
console.log(myTasks);
printStats(myTasks, "Итог");

console.log("\nСнова проверяем мутации:");
console.log("Задач сейчас:", myTasks.length);
console.log("Задач в variantTasks изначально:", variantTasks.length);