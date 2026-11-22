
/*
 * Практическая работа №7
 * Компонент TaskItem
 *
 * Отображает одну задачу, её характеристики
 * и кнопки управления.
 */

// Названия приоритетов на русском языке
const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий'
};

export default function TaskItem({
                                   task,
                                   categoryName,
                                   onToggle,
                                   onEdit,
                                   onDelete
                                 }) {
  // Определяем статус задачи
  const status = task.completed
      ? 'Выполнена'
      : 'В работе';

  // Получаем название приоритета
  const priority = priorityLabels[task.priority];

  return (
      <li className="task-item">

        {/* Название задачи */}
        <h3>{task.title}</h3>

        {/* Статус выполнения */}
        <p>
          <strong>Статус:</strong> {status}
        </p>

        {/* Приоритет задачи */}
        <p>
          <strong>Приоритет:</strong> {priority}
        </p>

        {/* Название категории */}
        <p>
          <strong>Категория:</strong> {categoryName}
        </p>

        {/* Кнопки управления задачей */}
        <div className="task-actions">

          {/* Переключение статуса */}
          <button
              type="button"
              onClick={() => onToggle(task.id)}
          >
            {task.completed
                ? 'Вернуть в работу'
                : 'Завершить'}
          </button>

          {/* Редактирование задачи */}
          <button
              type="button"
              onClick={() => onEdit(task.id)}
          >
            Редактировать
          </button>

          {/* Удаление задачи */}
          <button
              type="button"
              onClick={() => onDelete(task.id)}
          >
            Удалить
          </button>

        </div>
      </li>
  );
}
