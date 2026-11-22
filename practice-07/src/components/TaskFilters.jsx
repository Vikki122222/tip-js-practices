
/*
 * Практическая работа №7
 * Компонент TaskFilters
 *
 * Реализует поиск и четыре управляемых поля:
 * поиск, статус, приоритет и категорию.
 *
 * Все фильтры применяются совместно.
 */

export default function TaskFilters({
                                      filters,
                                      categories,
                                      onChange
                                    }) {

  // Изменение одного фильтра без потери остальных
  function handleFilterChange(event) {
    const { name, value } = event.target;

    onChange({
      ...filters,
      [name]: value
    });
  }

  // Сброс всех фильтров
  function handleReset() {
    onChange({
      q: '',
      completed: '',
      priority: '',
      categoryId: ''
    });
  }

  return (
      <section aria-label="Фильтры задач">
        <h2>Фильтры</h2>

        {/* Поиск задачи по названию */}
        <div className="form-field">
          <label htmlFor="filter-search">
            Поиск по названию
          </label>

          <input
              id="filter-search"
              name="q"
              type="search"
              value={filters.q}
              onChange={handleFilterChange}
              placeholder="Введите название задачи"
          />
        </div>

        {/* Фильтр по статусу выполнения */}
        <div className="form-field">
          <label htmlFor="filter-completed">
            Статус
          </label>

          <select
              id="filter-completed"
              name="completed"
              value={filters.completed}
              onChange={handleFilterChange}
          >
            <option value="">Все статусы</option>
            <option value="false">В работе</option>
            <option value="true">Выполненные</option>
          </select>
        </div>

        {/* Фильтр по приоритету */}
        <div className="form-field">
          <label htmlFor="filter-priority">
            Приоритет
          </label>

          <select
              id="filter-priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
          >
            <option value="">Все приоритеты</option>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </div>

        {/* Фильтр по категории */}
        <div className="form-field">
          <label htmlFor="filter-category">
            Категория
          </label>

          <select
              id="filter-category"
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
          >
            <option value="">Все категории</option>

            {categories.map(category => (
                <option
                    key={category.id}
                    value={String(category.id)}
                >
                  {category.name}
                </option>
            ))}
          </select>
        </div>

        {/* Кнопка отключения всех фильтров */}
        <button
            type="button"
            onClick={handleReset}
        >
          Сбросить фильтры
        </button>
      </section>
  );
}
