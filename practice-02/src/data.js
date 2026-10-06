// Общий контрольный набор задач.
// Он используется в основной части ПР2 и ПР3.
//
// Каждая задача хранит:
// id        — уникальный числовой идентификатор;
// title     — название задачи;
// completed — выполнена ли задача;
// priority  — приоритет: low, medium или high.
export const demoTasks = [
  {
    id: 1,
    title: "Изучить функции",
    completed: true,
    priority: "medium"
  },
  {
    id: 4,
    title: "Подготовить модель задач",
    completed: false,
    priority: "high"
  },
  {
    id: 7,
    title: "Проверить методы массивов",
    completed: false,
    priority: "low"
  },
  {
    id: 10,
    title: "Оформить README",
    completed: true,
    priority: "medium"
  },
];

// Номер моего индивидуального варианта.
export const variantNumber = 3;

// Индивидуальный набор задач для варианта №3:
// "Создание сайта-портфолио".
//
// Структура объектов такая же, как у demoTasks,
// поэтому одни и те же функции могут работать
// и с общим, и с индивидуальным набором.
export const variantTasks = [
  {
    id: 11,
    title: "Собрать примеры работ",
    completed: true,
    priority: "high"
  },
  {
    id: 23,
    title: "Выбрать цветовой профиль",
    completed: true,
    priority: "medium"
  },
  {
    id: 37,
    title: "Сверстать главную страницу",
    completed: false,
    priority: "high"
  },
  {
    id: 41,
    title: "Настроить отправку формы",
    completed: false,
    priority: "medium"
  },
  {
    id: 58,
    title: "Зарегистрировать домен",
    completed: false,
    priority: "low"
  },
  {
    id: 64,
    title: "Опубликовать сайт на хостинге",
    completed: false,
    priority: "high"
  }
];