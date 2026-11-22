
/*
 * Практическая работа №7
 * Тема: Создание компонентного интерфейса на React
 * Вариант №3
 *
 * Компонент TaskForm.
 *
 * Предназначен для создания и редактирования задач.
 * Использует управляемые поля и хук useState.
 * Проверяет данные перед сохранением.
 */

import { useState } from 'react';

// Импорт функции проверки данных формы
import { validateTaskDraft } from '../domain/task-service.js';


/*
 * Создание начального состояния формы.
 *
 * При редактировании используются данные задачи.
 * При создании — пустое название, средний приоритет
 * и первая категория из справочника.
 */
function createInitialDraft(initialTask, categories) {
  return {
    title: initialTask?.title ?? '',
    priority: initialTask?.priority ?? 'medium',
    categoryId: String(
        initialTask?.categoryId ?? categories[0]?.id ?? ''
    )
  };
}


export default function TaskForm({
                                   categories,
                                   initialTask = null,
                                   onSave,
                                   onCancel
                                 }) {

  // Определяем режим работы формы
  const isEditing = initialTask !== null;

  // Состояние полей формы
  const [draft, setDraft] = useState(() =>
      createInitialDraft(initialTask, categories)
  );

  // Состояние ошибок валидации
  const [errors, setErrors] = useState({});

  // Сообщение об успешном сохранении
  const [message, setMessage] = useState('');

  // Сообщение об ошибке сохранения
  const [saveError, setSaveError] = useState('');


  /*
   * Обработка изменения полей формы.
   *
   * Значения берутся из HTML-элементов.
   * categoryId остаётся строкой до валидации.
   */
  function handleChange(event) {
    const { name, value } = event.target;

    // Обновляем только изменённое поле
    setDraft(previous => ({
      ...previous,
      [name]: value
    }));

    // Удаляем предыдущую ошибку этого поля
    setErrors(previous => {
      const nextErrors = { ...previous };
      delete nextErrors[name];
      return nextErrors;
    });

    // Сбрасываем сообщения при изменении данных
    setMessage('');
    setSaveError('');
  }


  /*
   * Обработка отправки формы.
   *
   * 1. Отменяем стандартную отправку.
   * 2. Проверяем данные.
   * 3. Показываем ошибки при неправильном вводе.
   * 4. Передаём проверенные данные в App.
   * 5. Очищаем форму только после успешного создания.
   */
  function handleSubmit(event) {
    event.preventDefault();

    // Проверяем введённые значения
    const result = validateTaskDraft(draft, categories);

    // Записываем ошибки всех полей
    setErrors(result.errors);
    setMessage('');
    setSaveError('');

    // Если данные некорректны, не сохраняем задачу
    if (!result.valid) {
      return;
    }

    // Вызываем обработчик сохранения из App.
    // По контракту он должен вернуть true или false.
    const saved =
        typeof onSave === 'function'
            ? onSave(result.value)
            : false;

    // Если сохранение не состоялось,
    // сохраняем введённые пользователем значения
    if (saved !== true) {
      setSaveError(
          'Не удалось сохранить задачу. Попробуйте ещё раз.'
      );
      return;
    }

    // После успешного создания очищаем форму
    if (!isEditing) {
      setDraft(createInitialDraft(null, categories));
      setMessage('Задача успешно создана.');
    }

    // После редактирования App сбросит editingId,
    // и форма вернётся в режим создания.
  }


  /*
   * Обработка отмены редактирования
   * или очистки формы создания.
   */
  function handleCancel() {
    // Очищаем ошибки и сообщения
    setErrors({});
    setMessage('');
    setSaveError('');

    // Возвращаем начальные значения полей
    setDraft(createInitialDraft(null, categories));

    // Сообщаем родительскому компоненту об отмене
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }


  return (
      <section aria-label="Форма задачи">

        {/* Заголовок зависит от режима формы */}
        <h2>
          {isEditing ? 'Редактирование задачи' : 'Новая задача'}
        </h2>

        {/* Отключаем встроенную HTML-валидацию,
          чтобы использовать собственные сообщения */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Поле названия задачи */}
          <div className="form-field">
            <label htmlFor="task-title">
              Название задачи
            </label>

            <input
                id="task-title"
                name="title"
                type="text"
                value={draft.title}
                onChange={handleChange}
                placeholder="Введите название задачи"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={
                  errors.title ? 'task-title-error' : undefined
                }
            />

            {/* Ошибка названия */}
            {errors.title && (
                <p id="task-title-error" className="error">
                  {errors.title}
                </p>
            )}
          </div>


          {/* Поле выбора приоритета */}
          <div className="form-field">
            <label htmlFor="task-priority">
              Приоритет
            </label>

            <select
                id="task-priority"
                name="priority"
                value={draft.priority}
                onChange={handleChange}
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={
                  errors.priority ? 'task-priority-error' : undefined
                }
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>

            {/* Ошибка выбора приоритета */}
            {errors.priority && (
                <p id="task-priority-error" className="error">
                  {errors.priority}
                </p>
            )}
          </div>


          {/* Поле выбора категории */}
          <div className="form-field">
            <label htmlFor="task-category">
              Категория
            </label>

            <select
                id="task-category"
                name="categoryId"
                value={draft.categoryId}
                onChange={handleChange}
                aria-invalid={Boolean(errors.categoryId)}
                aria-describedby={
                  errors.categoryId ? 'task-category-error' : undefined
                }
            >
              {categories.map(category => (
                  <option
                      key={category.id}
                      value={String(category.id)}
                  >
                    {category.name}
                  </option>
              ))}
            </select>

            {/* Ошибка выбора категории */}
            {errors.categoryId && (
                <p id="task-category-error" className="error">
                  {errors.categoryId}
                </p>
            )}
          </div>


          {/* Кнопки формы */}
          <div className="form-actions">

            {/* Отправка формы */}
            <button type="submit">
              {isEditing
                  ? 'Сохранить изменения'
                  : 'Создать задачу'}
            </button>

            {/* Отмена редактирования или очистка */}
            <button
                type="button"
                onClick={handleCancel}
            >
              {isEditing ? 'Отмена' : 'Очистить'}
            </button>

          </div>
        </form>


        {/* Сообщение об успешном создании */}
        {message && (
            <p role="status" className="success">
              {message}
            </p>
        )}

        {/* Сообщение об ошибке сохранения */}
        {saveError && (
            <p role="alert" className="error">
              {saveError}
            </p>
        )}

      </section>
  );
}
