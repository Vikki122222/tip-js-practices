import { getTaskStats } from "./task-service.js";

// Этот модуль отвечает только за отображение данных в DOM.
// Состояние приложения здесь не изменяется.


// Создаёт DOM-элемент одной карточки задачи.
//
// На вход получает объект task,
// на выходе возвращает готовый <li>.
export function createTaskElement(task) {
    // Создаём корневой элемент карточки.
    const item = document.createElement("li");
    item.classList.add("task-card");

    // Сохраняем id задачи в data-task-id.
    // dataset хранит значения как строки.
    item.dataset.taskId = String(task.id);

    // Если задача выполнена,
    // добавляем специальный CSS-класс.
    if (task.completed) {
        item.classList.add("is-completed");
    }

    // Создаём заголовок задачи.
    const title = document.createElement("h3");
    title.classList.add("task-title");

    // Используем textContent,
    // чтобы название выводилось как обычный текст,
    // а не интерпретировалось как HTML.
    title.textContent = task.title;

    // Создаём элемент со статусом задачи.
    const status = document.createElement("p");
    status.classList.add("task-status");

    // Тернарный оператор:
    // если completed === true -> "Выполнена",
    // иначе -> "В работе".
    status.textContent =
        task.completed ? "Выполнена" : "В работе";

    // Создаём элемент для приоритета.
    const priority = document.createElement("p");
    priority.classList.add("task-priority");

    // Сопоставляем технические значения приоритета
    // с текстом для пользователя.
    const priorityLabels = {
        low: "Низкий",
        medium: "Средний",
        high: "Высокий",
    };

    priority.textContent =
        priorityLabels[task.priority];

    // Контейнер для кнопок действий.
    const actions = document.createElement("div");
    actions.classList.add("task-actions");

    // Создаём кнопку переключения статуса.
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";

    // data-action используется обработчиком событий
    // в main.js для определения действия.
    toggleButton.dataset.action = "toggle";

    // aria-pressed показывает текущее состояние кнопки
    // для вспомогательных технологий.
    toggleButton.setAttribute(
        "aria-pressed",
        task.completed ? "true" : "false"
    );

    // Отдельный span внутри кнопки.
    const toggleLabel = document.createElement("span");
    toggleLabel.classList.add("action-label");
    toggleLabel.textContent = "Выполнена";

    // Добавляем подпись внутрь кнопки.
    toggleButton.append(toggleLabel);

    // Создаём кнопку удаления.
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";

    // По этому значению main.js понимает,
    // что нужно выполнить удаление.
    deleteButton.dataset.action = "delete";

    const deleteLabel = document.createElement("span");
    deleteLabel.classList.add("action-label");
    deleteLabel.textContent = "Удалить";

    deleteButton.append(deleteLabel);

    // Добавляем обе кнопки в контейнер действий.
    actions.append(toggleButton, deleteButton);

    // Собираем карточку целиком.
    item.append(
        title,
        status,
        priority,
        actions
    );

    // Возвращаем готовый DOM-элемент карточки.
    return item;
}


// Отрисовывает список задач.
//
// Для каждой задачи создаётся DOM-карточка.
// После этого старое содержимое списка
// полностью заменяется новым.
export function renderTaskList(listElement, tasks) {
    // map() создаёт массив DOM-элементов.
    const taskElements =
        tasks.map((task) => createTaskElement(task));

    // replaceChildren удаляет старые карточки
    // и вставляет новые.
    //
    // Поэтому при повторной отрисовке
    // карточки не дублируются.
    listElement.replaceChildren(...taskElements);
}


// Обновляет общую статистику интерфейса.
export function renderSummary(
    summaryElement,
    tasks,
    visibleCount
) {
    // Общую статистику считаем
    // по полному массиву задач.
    const stats = getTaskStats(tasks);

    // Находим элементы по data-stat
    // и обновляем их текст.
    summaryElement
        .querySelector('[data-stat="total"]')
        .textContent = stats.total;

    summaryElement
        .querySelector('[data-stat="completed"]')
        .textContent = stats.completed;

    summaryElement
        .querySelector('[data-stat="pending"]')
        .textContent = stats.pending;

    // Процент отображаем
    // с одним знаком после точки.
    summaryElement
        .querySelector('[data-stat="progress"]')
        .textContent = `${stats.progress.toFixed(1)}%`;

    // visibleCount — количество задач,
    // которые видны при текущем фильтре.
    summaryElement
        .querySelector('[data-stat="visible"]')
        .textContent = visibleCount;
}


// Показывает сообщение для пустого состояния.
//
// Здесь различаются два случая:
// 1. задач вообще нет;
// 2. задачи есть, но выбранный фильтр ничего не показывает.
export function renderEmptyState(
    messageElement,
    total,
    visibleCount
) {
    // Полностью пустой список.
    if (total === 0 && visibleCount === 0) {
        messageElement.textContent =
            "Список задач пуст.";

        messageElement.hidden = false;
        return;
    }

    // Задачи существуют,
    // но текущему фильтру ничего не соответствует.
    if (total > 0 && visibleCount === 0) {
        messageElement.textContent =
            "Нет задач по выбранному фильтру.";

        messageElement.hidden = false;
        return;
    }

    // Если видимые задачи есть,
    // очищаем сообщение и скрываем элемент.
    messageElement.textContent = "";
    messageElement.hidden = true;
}