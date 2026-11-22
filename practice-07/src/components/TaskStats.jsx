
/*
 * Практическая работа №7
 * Компонент TaskStats
 *
 * Отображает статистику по полному массиву задач.
 * Получает готовые значения от компонента App.
 */

export default function TaskStats({ stats }) {
  return (
      <section aria-label="Статистика задач">
        <h2>Статистика</h2>

        {/* Общее количество задач */}
        <p>
          <strong>Всего задач:</strong> {stats.total}
        </p>

        {/* Количество выполненных задач */}
        <p>
          <strong>Выполнено:</strong> {stats.completed}
        </p>

        {/* Количество задач в работе */}
        <p>
          <strong>В работе:</strong> {stats.active}
        </p>
      </section>
  );
}
