/*
 * ПР8. Асинхронная форма задачи.
 * Хранит введённые значения локально; изменение на сервере выполняет App.
 * При ошибке сохранения пользовательский ввод остаётся в форме.
 */
import { useRef, useState } from 'react';
import { validateTaskDraft } from '../form-validation.js';

export default function TaskForm({ categories, initialTask = null, onSave, onCancel, disabled }) {
  // Черновик создания: пустое название, средний приоритет и первая категория.
  const emptyDraft = () => ({
    title: '',
    priority: 'medium',
    categoryId: String(categories[0]?.id ?? ''),
  });

  // Для редактирования начальные значения берутся из выбранной записи.
  const [draft, setDraft] = useState(() => initialTask ? {
    title: initialTask.title,
    priority: initialTask.priority,
    categoryId: String(initialTask.categoryId),
  } : emptyDraft());
  const [errors, setErrors] = useState({});

  // useRef блокирует второе нажатие сразу, до очередного рендера.
  const submitting = useRef(false);

  function change(event) {
    const { name, value } = event.target;
    setDraft(previous => ({ ...previous, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault(); // Страница не должна перезагружаться после submit.
    if (disabled || submitting.current) return;

    // Проводим клиентскую валидацию до запроса на сервер.
    const result = validateTaskDraft(draft, categories);
    setErrors(result.errors);
    if (!result.valid) return;

    submitting.current = true;
    try {
      // onSave возвращает Promise<boolean>, в отличие от синхронной формы ПР7.
      const saved = await onSave(result.value);
      if (saved && !initialTask) {
        // Очищаем форму только после подтверждённого POST.
        setDraft(emptyDraft());
      }
      // Если saved === false, черновик сохраняется для повторной попытки.
    } catch (error) {
      setErrors({ submit: error.message || 'Ошибка сохранения.' });
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section>
      <h2>{initialTask ? 'Редактирование' : 'Новая задача'}</h2>
      <form onSubmit={submit} noValidate>
        {/* Блокируем поля, если идет запись или список неактуален. */}
        <fieldset disabled={disabled}>
          <legend>Поля задачи</legend>

          <label htmlFor="title">Название</label>
          <input
            id="title" name="title"
            value={draft.title} onChange={change}
            aria-invalid={Boolean(errors.title)} aria-describedby="title-error"
          />
          <p id="title-error" className="error">{errors.title}</p>

          <label htmlFor="priority">Приоритет</label>
          <select
            id="priority" name="priority"
            value={draft.priority} onChange={change}
            aria-invalid={Boolean(errors.priority)} aria-describedby="priority-error"
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
          <p id="priority-error" className="error">{errors.priority}</p>

          <label htmlFor="categoryId">Категория</label>
          <select
            id="categoryId" name="categoryId"
            value={draft.categoryId} onChange={change}
            aria-invalid={Boolean(errors.categoryId)} aria-describedby="category-error"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <p id="category-error" className="error">{errors.categoryId}</p>

          <button type="submit">Сохранить</button>
          {initialTask && (
            <button type="button" onClick={onCancel}>Отмена</button>
          )}
        </fieldset>
        {errors.submit && <p role="alert">{errors.submit}</p>}
      </form>
    </section>
  );
}
