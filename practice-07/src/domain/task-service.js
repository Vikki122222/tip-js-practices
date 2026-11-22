
/*
 * Практическая работа №7
 * Тема: Создание компонентного интерфейса на React
 * Вариант №3
 *
 * Модуль содержит чистые функции для работы с задачами.
 * Функции не изменяют исходные массивы и объекты,
 * не используют React, DOM и HTTP-запросы.
 */

// Допустимые значения приоритета задачи
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];


/**
 * 1. Проверка и нормализация данных формы.
 *
 * Проверяет:
 * - название задачи (от 1 до 100 символов);
 * - допустимость приоритета;
 * - существование выбранной категории.
 *
 * Возвращает результат проверки, обработанные данные
 * и сообщения об ошибках.
 */
export function validateTaskDraft(draft, categories) {
  const errors = {};

  // Убираем пробелы в начале и конце названия.
  // Если название не является строкой, считаем его пустым.
  const title =
      typeof draft?.title === 'string'
          ? draft.title.trim()
          : '';

  // Получаем выбранный приоритет
  const priority = draft?.priority;

  // Получаем категорию из формы
  const rawCategoryId = draft?.categoryId;

  // Преобразуем идентификатор категории в число.
  // Строки вида "2x" и пустые значения не принимаем.
  let categoryId = NaN;

  if (
      typeof rawCategoryId === 'number' &&
      Number.isInteger(rawCategoryId)
  ) {
    categoryId = rawCategoryId;
  } else if (
      typeof rawCategoryId === 'string' &&
      /^\d+$/.test(rawCategoryId.trim())
  ) {
    categoryId = Number(rawCategoryId.trim());
  }

  // Проверка длины названия задачи
  if (title.length < 1 || title.length > 100) {
    errors.title =
        'Название должно содержать от 1 до 100 символов.';
  }

  // Проверка допустимого приоритета
  if (!ALLOWED_PRIORITIES.includes(priority)) {
    errors.priority =
        'Выберите корректный приоритет задачи.';
  }

  // Проверка существования категории
  if (
      !Number.isSafeInteger(categoryId) ||
      !categories.some(category => category.id === categoryId)
  ) {
    errors.categoryId =
        'Выберите существующую категорию.';
  }

  // Проверка наличия ошибок
  const valid = Object.keys(errors).length === 0;

  // Возвращаем результат проверки
  return {
    valid,
    value: {
      title,
      priority,
      categoryId
    },
    errors
  };
}


/**
 * 2. Поиск и фильтрация задач.
 *
 * Поддерживает четыре фильтра:
 * - поиск по названию;
 * - статус выполнения;
 * - приоритет;
 * - категория.
 *
 * Все активные фильтры применяются одновременно.
 * Порядок задач сохраняется.
 */
export function selectTasks(tasks, filters) {

  // Подготавливаем поисковый запрос:
  // удаляем крайние пробелы и приводим к нижнему регистру.
  const query = filters.q.trim().toLowerCase();

  return tasks.filter(task => {

    // Фильтр по названию задачи
    const matchesSearch =
        task.title.toLowerCase().includes(query);

    // Фильтр по статусу выполнения.
    // Сравниваем строки явно, потому что
    // Boolean('false') возвращает true.
    const matchesCompleted =
        filters.completed === '' ||
        task.completed === (filters.completed === 'true');

    // Фильтр по приоритету
    const matchesPriority =
        filters.priority === '' ||
        task.priority === filters.priority;

    // Фильтр по категории
    const matchesCategory =
        filters.categoryId === '' ||
        task.categoryId === Number(filters.categoryId);

    // Задача отображается только тогда,
    // когда соответствует всем четырём фильтрам.
    return (
        matchesSearch &&
        matchesCompleted &&
        matchesPriority &&
        matchesCategory
    );
  });
}


/**
 * 3. Получение статистики задач.
 *
 * Подсчитывает:
 * - общее количество;
 * - количество выполненных;
 * - количество задач в работе.
 *
 * Статистика рассчитывается по полному массиву,
 * а не по отфильтрованному списку.
 */
export function getTaskStats(tasks) {

  // Общее количество задач
  const total = tasks.length;

  // Количество выполненных задач
  const completed = tasks.filter(
      task => task.completed === true
  ).length;

  // Количество невыполненных задач
  const active = total - completed;

  return {
    total,
    completed,
    active
  };
}


/**
 * 4. Добавление новой задачи.
 *
 * Создаёт задачу с уникальным id.
 * Новая задача всегда имеет статус completed: false.
 *
 * Исходный массив не изменяется.
 */
export function addTask(tasks, value, id) {

  // Проверяем, что id — положительное целое число
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
        'Идентификатор должен быть положительным целым числом.'
    );
  }

  // Проверяем, что такой id ещё не используется
  const idExists = tasks.some(task => task.id === id);

  if (idExists) {
    throw new Error(
        'Задача с таким идентификатором уже существует.'
    );
  }

  // Создаём новую задачу
  const newTask = {
    id,
    title: value.title,
    completed: false,
    priority: value.priority,
    categoryId: value.categoryId
  };

  // Возвращаем новый массив с добавленной задачей
  return [...tasks, newTask];
}


/**
 * 5. Редактирование существующей задачи.
 *
 * Изменяет только:
 * - название;
 * - приоритет;
 * - категорию.
 *
 * Идентификатор и статус выполнения сохраняются.
 */
export function updateTask(tasks, id, value) {

  // Проверяем существование задачи
  const exists = tasks.some(task => task.id === id);

  // Если задача не найдена, ничего не изменяем
  if (!exists) {
    return tasks;
  }

  // Создаём новый массив с обновлённой задачей
  return tasks.map(task => {

    // Остальные задачи оставляем без изменений
    if (task.id !== id) {
      return task;
    }

    // Обновляем только разрешённые поля.
    // Поля id и completed сохраняются.
    return {
      ...task,
      title: value.title,
      priority: value.priority,
      categoryId: value.categoryId
    };
  });
}


/**
 * 6. Переключение статуса задачи.
 *
 * Если задача была в работе, она станет выполненной.
 * Если была выполненной — вернётся в работу.
 *
 * Используем новый объект вместо изменения исходного.
 */
export function toggleTask(tasks, id) {

  // Проверяем существование задачи
  const exists = tasks.some(task => task.id === id);

  if (!exists) {
    return tasks;
  }

  // Возвращаем новый массив
  return tasks.map(task => {

    if (task.id !== id) {
      return task;
    }

    // Инвертируем статус выполнения
    return {
      ...task,
      completed: !task.completed
    };
  });
}


/**
 * 7. Удаление задачи.
 *
 * Удаляет задачу по её id.
 * Если задача не найдена, исходный массив сохраняется.
 */
export function removeTask(tasks, id) {

  // Проверяем наличие задачи
  const exists = tasks.some(task => task.id === id);

  if (!exists) {
    return tasks;
  }

  // Метод filter создаёт новый массив,
  // в котором отсутствует удаляемая задача.
  return tasks.filter(task => task.id !== id);
}
