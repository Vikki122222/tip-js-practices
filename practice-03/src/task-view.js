import { getTaskStats } from "./task-service.js";

// Здесь создаётся DOM, но не изменяется состояние приложения.
// Контракт карточки, селекторы и тексты описаны в методичке.
export function createTaskElement(task) {
    const item = document.createElement("li");
    item.classList.add("task-card");
    item.dataset.taskId = String(task.id);

    if (task.completed) {
        item.classList.add("is-completed");
    }

    const title = document.createElement("h3");
    title.classList.add("task-title");
    title.textContent = task.title;

    const status = document.createElement("p");
    status.classList.add("task-status");
    status.textContent = task.completed ? "Выполнена" : "В работе";

    const priority = document.createElement("p");
    priority.classList.add("task-priority");

    const priorityLabels = {
        low: "Низкий",
        medium: "Средний",
        high: "Высокий",
    };

    priority.textContent = priorityLabels[task.priority];

    const actions = document.createElement("div");
    actions.classList.add("task-actions");

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.dataset.action = "toggle";
    toggleButton.setAttribute(
        "aria-pressed",
        task.completed ? "true" : "false"
    );

    const toggleLabel = document.createElement("span");
    toggleLabel.classList.add("action-label");
    toggleLabel.textContent = "Выполнена";

    toggleButton.append(toggleLabel);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";

    const deleteLabel = document.createElement("span");
    deleteLabel.classList.add("action-label");
    deleteLabel.textContent = "Удалить";

    deleteButton.append(deleteLabel);

    actions.append(toggleButton, deleteButton);

    item.append(title, status, priority, actions);

    return item;
}

export function renderTaskList(listElement, tasks) {
    const taskElements = tasks.map((task) => createTaskElement(task));

    listElement.replaceChildren(...taskElements);
}

export function renderSummary(summaryElement, tasks, visibleCount) {
    const stats = getTaskStats(tasks);

    summaryElement.querySelector('[data-stat="total"]').textContent = stats.total;
    summaryElement.querySelector('[data-stat="completed"]').textContent = stats.completed;
    summaryElement.querySelector('[data-stat="pending"]').textContent = stats.pending;
    summaryElement.querySelector('[data-stat="progress"]').textContent =
        `${stats.progress.toFixed(1)}%`;
    summaryElement.querySelector('[data-stat="visible"]').textContent = visibleCount;
}

export function renderEmptyState(messageElement, total, visibleCount) {
    if (total === 0 && visibleCount === 0) {
        messageElement.textContent = "Список задач пуст.";
        messageElement.hidden = false;
        return;
    }

    if (total > 0 && visibleCount === 0) {
        messageElement.textContent = "Нет задач по выбранному фильтру.";
        messageElement.hidden = false;
        return;
    }

    messageElement.textContent = "";
    messageElement.hidden = true;
}