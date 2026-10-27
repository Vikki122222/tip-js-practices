const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

export function createTaskElement(task, category) {
  const item = document.createElement("li");
  item.classList.add("task-card");
  item.classList.toggle("is-completed", task.completed);
  item.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const values = [
    ["task-status", task.completed ? "Выполнена" : "В работе"],
    ["task-priority", PRIORITY_LABELS[task.priority]],
    ["task-category", category?.name ?? "Категория не найдена"],
  ];
  for (const [className, text] of values) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = text;
    meta.append(node);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";
  for (const [action, text] of [
    ["toggle", task.completed ? "Вернуть в работу" : "Завершить"],
    ["edit", "Изменить"],
    ["delete", "Удалить"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    if (action === "toggle") button.setAttribute("aria-pressed", String(task.completed));
    const label = document.createElement("span");
    label.className = "action-label";
    label.textContent = text;
    button.append(label);
    actions.append(button);
  }
  item.append(title, meta, actions);
  return item;
}

export function renderTaskList(list, tasks, categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, byId.get(task.categoryId))));
}
