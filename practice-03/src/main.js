// Импортируем данные:
// demoTasks — общий набор,
// variantTasks — задачи моего варианта,
// variantNumber — номер варианта.
import { demoTasks, variantTasks, variantNumber } from "./data.js";

// Импортируем функции работы с задачами из ПР2.
import {
    findTaskById,
    setTaskCompleted,
    removeTask
} from "./task-service.js";

// Функция фильтрации задач.
import { getVisibleTasks } from "./task-selectors.js";

// Функции, отвечающие за отображение данных в DOM.
import {
    renderTaskList,
    renderSummary,
    renderEmptyState
} from "./task-view.js";


// Сохраняем ссылки на основные DOM-элементы страницы,
// чтобы потом не искать их заново при каждом действии.
const elements = {
    // Список карточек задач.
    list: document.querySelector("#task-list"),

    // Контейнер с кнопками фильтров.
    filters: document.querySelector("#task-filters"),

    // Блок со статистикой.
    summary: document.querySelector("#task-summary"),

    // Сообщение о пустом списке.
    empty: document.querySelector("#empty-message"),

    // Сообщения об ошибках операций.
    message: document.querySelector("#operation-message"),

    // Подпись текущего набора данных.
    datasetLabel: document.querySelector("#dataset-label"),

    // Кнопка отмены последнего удаления.
    undoDeleteButton: document.querySelector("#undo-delete-button"),
};


// Проверяем параметр адресной строки.
//
// Если в URL есть:
// ?dataset=variant
//
// используем индивидуальный набор задач.
// Иначе используется общий demoTasks.
const isVariant =
    new URLSearchParams(window.location.search)
        .get("dataset") === "variant";


// Выбираем начальный набор задач.
const initialTasks =
    isVariant ? variantTasks : demoTasks;


// currentTasks — текущее состояние списка задач.
//
// map() и spread {...task} создают копии объектов,
// чтобы не изменять исходные demoTasks или variantTasks.
let currentTasks =
    initialTasks.map((task) => ({ ...task }));


// Текущий фильтр.
// Возможные значения:
// all, pending, completed.
let currentFilter = "all";


// Эти две переменные нужны для дополнительного задания
// "Отменить удаление".
//
// Здесь хранится последняя удалённая задача
// и её позиция в массиве.
let lastDeletedTask = null;
let lastDeletedIndex = -1;


// Показываем пользователю,
// какой набор данных сейчас используется.
elements.datasetLabel.textContent = isVariant
    ? `Индивидуальный вариант: ${variantNumber ?? "не указан"}`
    : "Общий контрольный набор";


// Главная функция отрисовки приложения.
//
// Она не изменяет задачи,
// а берёт текущее состояние и обновляет интерфейс.
function renderApp() {
    // Получаем задачи, которые должны быть видны
    // при текущем фильтре.
    const visibleTasks =
        getVisibleTasks(currentTasks, currentFilter);

    // Перерисовываем список карточек.
    renderTaskList(
        elements.list,
        visibleTasks
    );

    // Обновляем общую статистику.
    //
    // currentTasks — все задачи,
    // visibleTasks.length — количество видимых.
    renderSummary(
        elements.summary,
        currentTasks,
        visibleTasks.length
    );

    // Обновляем сообщение о пустом состоянии.
    renderEmptyState(
        elements.empty,
        currentTasks.length,
        visibleTasks.length
    );

    // Получаем все кнопки фильтров.
    const filterButtons =
        elements.filters.querySelectorAll(
            "button[data-filter]"
        );

    // Обновляем визуальное состояние фильтров.
    filterButtons.forEach((button) => {
        // Проверяем, соответствует ли кнопка
        // текущему фильтру.
        const isActive =
            button.dataset.filter === currentFilter;

        // Добавляем или удаляем CSS-класс.
        button.classList.toggle(
            "is-active",
            isActive
        );

        // Обновляем aria-pressed
        // для доступности интерфейса.
        button.setAttribute(
            "aria-pressed",
            isActive ? "true" : "false"
        );
    });
}


// Обработчик кликов по списку задач.
//
// Здесь используется делегирование событий:
// один обработчик стоит на общем контейнере,
// а не на каждой кнопке отдельно.
function handleTaskListClick(event) {
    // event.target — элемент,
    // по которому пользователь действительно нажал.
    //
    // Проверяем, что это DOM-элемент.
    if (!(event.target instanceof Element)) {
        return;
    }

    // Ищем ближайшую кнопку с data-action.
    //
    // Это позволяет обрабатывать клик,
    // даже если пользователь нажал на span внутри кнопки.
    const button =
        event.target.closest("button[data-action]");

    // Проверяем, что кнопка существует
    // и действительно находится внутри нашего списка.
    if (!button || !elements.list.contains(button)) {
        return;
    }

    // Получаем действие из data-action:
    // toggle или delete.
    const action = button.dataset.action;

    // Неизвестные действия не обрабатываем.
    if (action !== "toggle" && action !== "delete") {
        return;
    }

    // Находим карточку задачи,
    // внутри которой находится нажатая кнопка.
    const card =
        button.closest("li[data-task-id]");

    if (!card || !elements.list.contains(card)) {
        return;
    }

    // Получаем id задачи из data-task-id.
    //
    // dataset возвращает строку,
    // поэтому преобразуем её через Number().
    const id = Number(card.dataset.taskId);

    // Проверяем корректность id.
    if (!Number.isSafeInteger(id) || id <= 0) {
        elements.message.textContent =
            "Некорректный идентификатор задачи";

        return;
    }

    // Ищем нужную задачу в текущем массиве.
    const task =
        findTaskById(currentTasks, id);

    // Если задача не найдена — выводим ошибку.
    if (!task) {
        elements.message.textContent =
            "Задача не найдена";

        return;
    }

    // Здесь будет результат сервисной функции.
    let result;


    // ПЕРЕКЛЮЧЕНИЕ СТАТУСА

    if (action === "toggle") {
        // Передаём противоположный статус:
        // true становится false,
        // false становится true.
        result = setTaskCompleted(
            currentTasks,
            id,
            !task.completed
        );
    }


        // УДАЛЕНИЕ ЗАДАЧИ


    else {
        // Перед удалением сохраняем копию задачи.
        // Она понадобится для дополнительной функции Undo.
        lastDeletedTask = { ...task };

        // Запоминаем позицию удаляемой задачи.
        lastDeletedIndex =
            currentTasks.findIndex(
                (item) => item.id === id
            );

        // Вызываем сервисную функцию удаления.
        result =
            removeTask(currentTasks, id);
    }


    // Если сервисная функция вернула ошибку,
    // показываем её пользователю.
    if (!result.ok) {
        elements.message.textContent =
            result.error;

        return;
    }

    // При успешной операции сохраняем
    // новый массив задач.
    currentTasks = result.tasks;

    // Очищаем сообщение об ошибке.
    elements.message.textContent = "";

    // Если произошло удаление,
    // разрешаем нажать кнопку отмены.
    if (action === "delete") {
        elements.undoDeleteButton.disabled = false;
    }

    // Перерисовываем интерфейс
    // с новым состоянием данных.
    renderApp();

    // Возвращаем понятный клавиатурный фокус
    // после перерисовки DOM.
    restoreTaskFocus(id, action);
}


// Обработчик кликов по фильтрам.
function handleFilterClick(event) {
    if (!(event.target instanceof Element)) {
        return;
    }

    // Находим ближайшую кнопку с data-filter.
    const button =
        event.target.closest("button[data-filter]");

    // Проверяем, что кнопка принадлежит
    // контейнеру фильтров.
    if (
        !button ||
        !elements.filters.contains(button)
    ) {
        return;
    }

    // Читаем выбранный фильтр
    // из data-filter.
    const filter = button.dataset.filter;

    // Разрешены только три значения.
    if (
        !["all", "pending", "completed"]
            .includes(filter)
    ) {
        return;
    }

    // Меняем только значение текущего фильтра.
    //
    // Сам массив currentTasks
    // при фильтрации не изменяется.
    currentFilter = filter;

    // Убираем старое сообщение.
    elements.message.textContent = "";

    // Перерисовываем приложение.
    renderApp();
}


// Дополнительное задание:
// отмена последнего удаления.
function handleUndoDelete() {
    // Если удалённой задачи нет,
    // отменять нечего.
    if (!lastDeletedTask || lastDeletedIndex < 0) {
        return;
    }

    // Дополнительная защита:
    // проверяем, что задача с таким id
    // ещё не существует в массиве.
    const taskAlreadyExists =
        findTaskById(
            currentTasks,
            lastDeletedTask.id
        );

    if (taskAlreadyExists) {
        elements.message.textContent =
            "Задача уже существует";

        return;
    }

    // Создаём копию текущего массива,
    // чтобы не изменять currentTasks напрямую.
    const restoredTasks =
        [...currentTasks];

    // splice вставляет сохранённую задачу
    // обратно на прежнюю позицию.
    restoredTasks.splice(
        lastDeletedIndex,
        0,
        { ...lastDeletedTask }
    );

    // Сохраняем восстановленный массив.
    currentTasks = restoredTasks;

    // Очищаем данные об удалённой задаче,
    // потому что отмена разрешена только один раз.
    lastDeletedTask = null;
    lastDeletedIndex = -1;

    // После восстановления
    // кнопка отмены снова становится недоступной.
    elements.undoDeleteButton.disabled = true;

    // Очищаем сообщение.
    elements.message.textContent = "";

    // Перерисовываем интерфейс.
    renderApp();
}


// Вспомогательная функция для клавиатурного фокуса.
//
// После renderApp карточки создаются заново,
// поэтому старый DOM-элемент кнопки исчезает.
// Эта функция переводит фокус
// на новую кнопку или на активный фильтр.
function restoreTaskFocus(id, action) {
    // Пытаемся найти такую же кнопку
    // у той же задачи после перерисовки.
    const actionButton =
        elements.list.querySelector(
            `[data-task-id="${id}"] button[data-action="${action}"]`
        );

    // Если задача исчезла из видимого списка,
    // например после выполнения при фильтре pending,
    // можно поставить фокус на активный фильтр.
    const filterButton =
        elements.filters.querySelector(
            `[data-filter="${currentFilter}"]`
        );

    // ?? означает:
    // если actionButton отсутствует,
    // использовать filterButton.
    //
    // ?.focus() вызывает focus(),
    // только если элемент существует.
    (actionButton ?? filterButton)?.focus();
}

// ПОДКЛЮЧЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ

// Один обработчик кликов
// для всего списка задач.
elements.list.addEventListener(
    "click",
    handleTaskListClick
);

// Один обработчик
// для всего контейнера фильтров.
elements.filters.addEventListener(
    "click",
    handleFilterClick
);

// Отдельный обработчик
// для кнопки отмены удаления.
elements.undoDeleteButton.addEventListener(
    "click",
    handleUndoDelete
);


// Первый запуск приложения.
//
// try/catch позволяет показать понятное сообщение,
// если при запуске произошла ошибка.
try {
    renderApp();
} catch (error) {
    elements.message.textContent =
        `Ошибка запуска: ${error.message}`;

    console.error(error);
}