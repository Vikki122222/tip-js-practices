/**
 * Возвращает новую выборку задач. Исходный массив не сортируется и не меняется.
 * Все заданные фильтры объединяются логическим И.
 */
export function selectTasks(tasks, filters) {
  const normalizedQuery = filters.q.toLocaleLowerCase('ru-RU');

  return tasks.filter(task => {
    // Сравнение через !== null важно для completed=false.
    if (filters.completed !== null && task.completed !== filters.completed) {
      return false;
    }

    if (filters.priority !== null && task.priority !== filters.priority) {
      return false;
    }

    if (filters.categoryId !== null && task.categoryId !== filters.categoryId) {
      return false;
    }

    // Поиск по названию нечувствителен к регистру, включая кириллицу.
    if (normalizedQuery && !task.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery)) {
      return false;
    }

    return true;
  });
}

/** Ищет запись по её полю id, а не по индексу в массиве. */
export function findTask(tasks, id) {
  return tasks.find(task => task.id === id) ?? null;
}
