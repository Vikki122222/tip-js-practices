/*
 * ПР8. Список задач, уже отфильтрованных на сервере.
 * Карточки не меняют свои props; они сообщают App о действиях через callbacks.
 */
const priorities = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };

export default function TaskList({ tasks, categories, disabled, onEdit, onToggle, onDelete }) {
  return (
    <ul aria-label="Задачи">
      {tasks.map(task => (
        // Ключом служит настоящий id задачи, а не индекс массива.
        <li key={task.id}>
          {/* Значения вставляются как текст React, без опасного innerHTML. */}
          <strong>{task.title}</strong>
          <p>
            {task.completed ? 'Выполнена' : 'В работе'} · {priorities[task.priority]} ·{' '}
            {categories.find(category => category.id === task.categoryId)?.name ?? 'Неизвестная категория'}
          </p>
          <button type="button" disabled={disabled} onClick={() => onToggle(task)}>
            Переключить статус
          </button>
          <button type="button" disabled={disabled} onClick={() => onEdit(task)}>
            Редактировать
          </button>
          <button type="button" disabled={disabled} onClick={() => onDelete(task)}>
            Удалить
          </button>
        </li>
      ))}
    </ul>
  );
}
