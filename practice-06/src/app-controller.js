import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  const apiMethods = [
    "loadInitialData", "getTasks", "createTask", "updateTask",
    "setTaskCompleted", "deleteTask", "resetDemoData",
  ];
  const viewMethods = [
    "setListState", "setTasks", "setCategories", "setTotal", "setFormTask",
    "showFormErrors", "setMutationPending", "notify",
  ];
  if (!apiMethods.every((name) => typeof api?.[name] === "function")
      || !viewMethods.every((name) => typeof view?.[name] === "function")
      || typeof validateDraft !== "function") {
    throw new TypeError("Контроллеру необходимы API, представление и функция валидации.");
  }

  let tasks = [];
  let categories = [];
  let categoriesLoaded = false;
  let filters = {};
  let editingId = null;
  let activeLoad = null;
  let loadSequence = 0;
  let mutationPending = false;
  let activeMutation = null;
  let destroyed = false;

  function isAborted(error) {
    return error instanceof ApiError && error.kind === "aborted";
  }

  async function loadCurrentTasks() {
    if (destroyed) return false;
    const sequence = ++loadSequence;
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    const started = performance.now();
    const needsCategories = !categoriesLoaded;
    view.setListState("loading");

    try {
      const options = { signal: controller.signal };
      const result = needsCategories
        ? await api.loadInitialData({ ...filters }, options)
        : await api.getTasks({ ...filters }, options);

      // Источник может проигнорировать abort, поэтому одного сигнала недостаточно.
      if (destroyed || sequence !== loadSequence || controller.signal.aborted) return false;
      if (needsCategories) {
        categories = result.categories.map((category) => ({ ...category }));
        categoriesLoaded = true;
        view.setCategories(categories);
      }
      tasks = result.tasks.map((task) => ({ ...task }));
      view.setTasks(tasks, categories);
      view.setTotal(result.meta.total);
      view.setListState(tasks.length === 0 ? "empty" : "ready");
      // Перерисовка создаёт новые кнопки; они тоже должны оставаться заблокированными.
      if (mutationPending) view.setMutationPending(true);
      return true;
    } catch (error) {
      if (destroyed || sequence !== loadSequence || controller.signal.aborted || isAborted(error)) {
        return false;
      }
      view.setListState("error", messageForError(error));
      return false;
    } finally {
      if (!destroyed && sequence === loadSequence && !controller.signal.aborted) {
        view.setLoadDuration?.(performance.now() - started);
        activeLoad = null;
      }
    }
  }

  function cancelEdit() {
    if (destroyed) return;
    editingId = null;
    view.showFormErrors({});
    view.setFormTask(null);
  }

// После успешного изменения повторно запрашиваем
// задачи с сервера с сохранением текущих фильтров.
// Поэтому завершённая задача исчезнет из выборки completed=false.
  async function mutate(operation, successMessage, afterSuccess) {
    if (destroyed || mutationPending) return false;
    mutationPending = true;
    const controller = new AbortController();
    activeMutation = controller;
    view.setMutationPending(true);
    view.notify("");
    try {
      await operation({ signal: controller.signal });
      if (destroyed || controller.signal.aborted) return false;
      afterSuccess?.();
      view.notify(successMessage, "success");
      await loadCurrentTasks();
      return true;
    } catch (error) {
      if (!destroyed && !controller.signal.aborted && !isAborted(error)) {
        if (error instanceof ApiError && error.code === "VALIDATION_ERROR"
            && error.details && typeof error.details === "object") {
          const fieldErrors = {};
          for (const name of ["title", "priority", "categoryId"]) {
            if (typeof error.details[name] === "string") fieldErrors[name] = error.details[name];
          }
          view.showFormErrors(fieldErrors);
        }
        view.notify(messageForError(error), "error");
      }
      return false;
    } finally {
      mutationPending = false;
      activeMutation = null;
      if (!destroyed) view.setMutationPending(false);
    }
  }

  function start(initialFilters = {}) {
    if (destroyed) return Promise.resolve(false);
    filters = { ...initialFilters };
    view.setFilters?.(filters);
    cancelEdit();
    return loadCurrentTasks();
  }

  function applyFilters(nextFilters = {}) {
    if (destroyed) return Promise.resolve(false);
    filters = { ...nextFilters };
    view.setFilters?.(filters);
    return loadCurrentTasks();
  }

  function beginEdit(id) {
    if (destroyed || mutationPending) return false;
    const task = tasks.find((item) => item.id === id);
    if (!task) {
      view.notify("Задача отсутствует в текущем списке. Обновите данные.", "error");
      return false;
    }
    editingId = task.id;
    view.showFormErrors({});
    view.setFormTask({ ...task });
    return true;
  }

  async function submit(draft) {
    if (destroyed || mutationPending) return false;
    const validation = validateDraft(draft, categories);
    view.showFormErrors(validation.errors);
    if (!validation.valid) return false;
    const id = editingId;
    return mutate(
      (options) => id === null
        ? api.createTask(validation.value, options)
        : api.updateTask(id, validation.value, options),
      id === null ? "Задача добавлена." : "Изменения сохранены.",
      cancelEdit,
    );
  }


  function toggleTask(id) {
    // Запрещаем изменение после уничтожения контроллера
    // или во время другой операции с сервером.
    if (destroyed || mutationPending) return Promise.resolve(false);

    // Находим задачу по ID в текущем списке.
    const task = tasks.find((item) => item.id === id);

    // Если задача не найдена, показываем сообщение.
    if (!task) {
      view.notify("Задача отсутствует в текущем списке. Обновите данные.", "error");
      return Promise.resolve(false);
    }

    // Меняем значение completed на противоположное.
    // mutate отправит изменение на сервер через API,
    // а после успешного PATCH повторно загрузит задачи.
    return mutate(
        (options) => api.setTaskCompleted(id, !task.completed, options),
        "Статус задачи изменён."
    );
  }


  function deleteTask(id) {
    return mutate((options) => api.deleteTask(id, options), "Задача удалена.", () => {
      if (editingId === id) cancelEdit();
    });
  }

  function resetData() {
    return mutate((options) => api.resetDemoData(options), "Учебные данные восстановлены.", cancelEdit);
  }

  function destroy() {
    destroyed = true;
    loadSequence += 1;
    activeLoad?.abort();
    activeMutation?.abort();
  }

  return {
    start, applyFilters, refresh: loadCurrentTasks, submit, beginEdit, cancelEdit,
    toggleTask, deleteTask, resetData, destroy,
  };
}
