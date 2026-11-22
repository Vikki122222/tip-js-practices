
/*
 * Практическая работа №7
 * Компонент TaskList
 *
 * Отображает список задач с использованием TaskItem.
 * Показывает количество найденных задач
 * и сообщение при отсутствии результатов.
 */

import TaskItem from './TaskItem.jsx';

export default function TaskList({
                                   tasks,
                                   categories,
                                   onToggle,
                                   onEdit,
                                   onDelete
                                 }) {
  return (
      <section aria-label="Список задач">

        {/* Заголовок раздела */}
        <h2>Задачи</h2>

        {/* Количество найденных задач */}
        <p>
          Найдено задач: {tasks.length}
        </p>

        {/* Проверяем, есть ли задачи для отображения */}
        {tasks.length === 0 ? (

            // Сообщение при пустой выборке
            <p role="status">
              Задачи не найдены.
              Попробуйте изменить параметры фильтрации.
            </p>

        ) : (

            // Отображаем список задач
            <ul className="task-list">

              {tasks.map(task => {

                // Находим категорию по её идентификатору
                const category = categories.find(
                    item => item.id === task.categoryId
                );

                // Получаем название категории
                const categoryName = category
                    ? category.name
                    : 'Неизвестная категория';

                // Создаём компонент для каждой задачи
                return (
                    <TaskItem
                        key={task.id}
                        task={task}
                        categoryName={categoryName}
                        onToggle={onToggle}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                );
              })}

            </ul>
        )}
      </section>
  );
}
