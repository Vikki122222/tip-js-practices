/*
 * ПР8. Управляемые фильтры. Они не фильтруют массив в браузере:
 * при изменении props фильтры передаются хуку для нового GET к API.
 */
export default function TaskFilters({ filters, categories, onChange }) {
  // Обновляем одно поле, сохраняя все остальные значения фильтров.
  const change = event => onChange({
    ...filters,
    [event.target.name]: event.target.value,
  });

  function resetFilters() {
    onChange({ q: '', completed: '', priority: '', categoryId: '' });
  }

  return (
    <section>
      <h2>Фильтры сервера</h2>
      <label htmlFor="q">Поиск</label>
      <input id="q" name="q" maxLength={100} value={filters.q} onChange={change} />

      <label htmlFor="completed-filter">Статус</label>
      <select id="completed-filter" name="completed" value={filters.completed} onChange={change}>
        <option value="">Все</option>
        <option value="false">В работе</option>
        <option value="true">Выполненные</option>
      </select>

      <label htmlFor="priority-filter">Приоритет</label>
      <select id="priority-filter" name="priority" value={filters.priority} onChange={change}>
        <option value="">Все</option>
        <option value="low">Низкий</option>
        <option value="medium">Средний</option>
        <option value="high">Высокий</option>
      </select>

      <label htmlFor="category-filter">Категория</label>
      <select id="category-filter" name="categoryId" value={filters.categoryId} onChange={change}>
        <option value="">Все</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>

      {/* После сброса серверу отправятся четыре пустых значения фильтров. */}
      <button type="button" onClick={resetFilters}>Сбросить фильтры</button>
    </section>
  );
}
