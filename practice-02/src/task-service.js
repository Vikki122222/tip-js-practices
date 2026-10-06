// Создаёт новую задачу.
//
// id — уникальный идентификатор задачи.
// title — название задачи.
// priority — приоритет, по умолчанию "medium".
//
// Если данные некорректны, возвращаем:
// { ok: false, error: "..." }
//
// Если всё правильно:
// { ok: true, task: {...} }
export function createTask(id, title, priority = "medium") {
  // id должен быть положительным безопасным целым числом.
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный ID" };
  }

  // Название обязательно должно быть строкой.
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  // trim() убирает пробелы в начале и конце названия.
  const cleanTitle = title.trim();

  // Название должно содержать от 1 до 100 символов.
  if (cleanTitle.length < 1 || cleanTitle.length > 100) {
    return { ok: false, error: "Некорректная длина" };
  }

  // Разрешены только три значения приоритета.
  if (!["low", "medium", "high"].includes(priority)) {
    return { ok: false, error: "Неверный приоритет" };
  }

  // Новая задача всегда создаётся невыполненной:
  // completed: false.
  return {
    ok: true,
    task: {
      id,
      title: cleanTitle,
      completed: false,
      priority
    }
  };
}


// Ищет одну задачу по её id.
//
// find() возвращает первый найденный объект.
// Если такой задачи нет, возвращается undefined.
export function findTaskById(tasks, id) {
  return tasks.find(task => task.id === id);
}


// Возвращает новый массив только с невыполненными задачами.
//
// filter() не изменяет исходный массив.
// В результат попадают задачи,
// у которых completed строго равно false.
export function getPendingTasks(tasks) {
  return tasks.filter(task => task.completed === false);
}


// Возвращает новый массив,
// состоящий только из названий задач.
//
// map() проходит по всем задачам
// и для каждой возвращает task.title.
export function getTaskTitles(tasks) {
  return tasks.map(task => task.title);
}


// Рассчитывает общую статистику по задачам.
export function getTaskStats(tasks) {
  // Общее количество задач.
  const total = tasks.length;

  // Считаем количество выполненных задач.
  const completed = tasks.filter(t => t.completed === true).length;

  // Невыполненные = всего - выполненные.
  const pending = total - completed;

  // Если задачи есть, считаем процент выполнения.
  // Если массив пустой, прогресс равен 0,
  // чтобы не делить на ноль.
  const progress = total > 0
      ? (completed / total) * 100
      : 0;

  return {
    total,
    completed,
    pending,
    progress
  };
}


// Добавляет новую задачу в массив.
//
// Исходный массив tasks не изменяется.
// При успехе возвращается новый массив.
export function addTask(tasks, id, title, priority = "medium") {
  // Проверяем корректность id.
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный ID" };
  }

  // Проверяем, что задача с таким id ещё не существует.
  if (findTaskById(tasks, id)) {
    return { ok: false, error: "ID уже существует" };
  }

  // Используем createTask,
  // чтобы повторно не писать проверки title и priority.
  const res = createTask(id, title, priority);

  // Если createTask вернула ошибку,
  // сразу передаём её дальше.
  if (!res.ok) {
    return res;
  }

  // Spread ...tasks копирует старые элементы,
  // а res.task добавляется в конец.
  //
  // Поэтому создаётся новый массив,
  // а исходный tasks не меняется.
  return {
    ok: true,
    tasks: [...tasks, res.task]
  };
}


// Изменяет статус completed у задачи.
//
// Исходный массив не изменяется.
// Возвращается новый массив задач.
export function setTaskCompleted(tasks, id, completed) {
  // Проверяем id.
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный ID" };
  }

  // completed должен быть строго true или false.
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус должен быть boolean" };
  }

  // Проверяем, существует ли задача.
  if (!findTaskById(tasks, id)) {
    return { ok: false, error: "Задача не найдена" };
  }

  // map() создаёт новый массив.
  //
  // Если id совпадает, создаём новый объект задачи
  // через spread {...t} и заменяем только completed.
  //
  // Остальные задачи возвращаются без изменений.
  return {
    ok: true,
    tasks: tasks.map(
        t => t.id === id
            ? { ...t, completed }
            : t
    )
  };
}


// Изменяет название существующей задачи.
//
// Исходный массив также не изменяется.
export function renameTask(tasks, id, title) {
  // Проверяем корректность id.
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный ID" };
  }

  // Ищем задачу.
  const task = findTaskById(tasks, id);

  if (!task) {
    return { ok: false, error: "Задача не найдена" };
  }

  // Используем createTask для проверки нового названия.
  // Сохраняем текущий приоритет задачи.
  const dummy = createTask(id, title, task.priority);

  if (!dummy.ok) {
    return dummy;
  }

  // map() создаёт новый массив.
  //
  // Для нужной задачи создаётся новый объект,
  // в котором меняется только title.
  return {
    ok: true,
    tasks: tasks.map(
        t => t.id === id
            ? { ...t, title: dummy.task.title }
            : t
    )
  };
}


// Удаляет задачу по id.
//
// Исходный массив не изменяется.
// filter() создаёт новый массив без удаляемой задачи.
export function removeTask(tasks, id) {
  // Проверяем корректность id.
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный ID" };
  }

  // Если задача не найдена, возвращаем ошибку.
  if (!findTaskById(tasks, id)) {
    return { ok: false, error: "Задача не найдена" };
  }

  // В новый массив попадают все задачи,
  // id которых не равен удаляемому id.
  return {
    ok: true,
    tasks: tasks.filter(t => t.id !== id)
  };
}