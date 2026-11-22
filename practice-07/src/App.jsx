
/*
 * Практическая работа №7
 * Тема: Создание компонентного интерфейса на React
 * Вариант №3
 *
 * Главный компонент App.
 * Управляет состоянием задач, фильтрацией,
 * созданием, редактированием и удалением.
 */

import { useState } from 'react';

// Исходный набор задач и категорий
import {
    tasks as initialTasks,
    categories
} from './data.js';

// Начальные фильтры индивидуального варианта
import { createInitialFilters } from './variant.js';

// Предметные функции
import {
    selectTasks,
    getTaskStats,
    addTask,
    updateTask,
    toggleTask,
    removeTask
} from './domain/task-service.js';

// Компоненты приложения
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

export default function App() {

    // Исходные задачи копируем в состояние React
    const [tasks, setTasks] = useState(() =>
        initialTasks.map(task => ({ ...task }))
    );

    // Фильтры, установленные по варианту
    const [filters, setFilters] = useState(createInitialFilters);

    // ID редактируемой задачи
    const [editingId, setEditingId] = useState(null);

    // Сообщение о выполненном действии
    const [feedback, setFeedback] = useState('');


    /*
     * Вычисляем видимые задачи.
     * Используем все четыре фильтра одновременно.
     * Отдельное состояние для списка не создаём.
     */
    const visibleTasks = selectTasks(tasks, filters);

    /*
     * Вычисляем статистику по полному массиву.
     * Фильтры не изменяют общую статистику.
     */
    const stats = getTaskStats(tasks);

    /*
     * Находим редактируемую задачу по её ID.
     * Если редактирование не выбрано, получаем null.
     */
    const editingTask = editingId === null
        ? null
        : tasks.find(task => task.id === editingId) ?? null;


    /*
     * Создание и редактирование задачи.
     * Получаем уже проверенные данные из TaskForm.
     */
    function handleSave(value) {

        // Редактирование существующей задачи
        if (editingId !== null) {

            // Если задача отсутствует, отменяем сохранение
            if (editingTask === null) {
                return false;
            }

            const id = editingId;

            // Обновляем выбранную задачу
            setTasks(previousTasks =>
                updateTask(previousTasks, id, value)
            );

            // Возвращаем форму в режим создания
            setEditingId(null);

            setFeedback('Изменения задачи сохранены.');

            return true;
        }

        // Создание новой задачи
        setTasks(previousTasks => {

            // Находим максимальный ID в полном массиве
            const maxId = previousTasks.reduce(
                (maximum, task) => Math.max(maximum, task.id),
                0
            );

            // Новый ID должен быть уникальным
            const nextId = maxId + 1;

            // Создаём новый массив с задачей
            return addTask(previousTasks, value, nextId);
        });

        setFeedback('Задача успешно создана.');

        return true;
    }


    // Выбор задачи для редактирования
    function handleEdit(id) {
        setEditingId(id);
        setFeedback('');
    }


    // Отмена редактирования
    function handleCancel() {
        setEditingId(null);
        setFeedback('');
    }


    // Переключение статуса выполнения
    function handleToggle(id) {
        setTasks(previousTasks =>
            toggleTask(previousTasks, id)
        );

        setFeedback('Статус задачи изменён.');
    }


    /*
     * Удаление задачи.
     * Подтверждение выполняем до обновления состояния.
     */
    function handleDelete(id) {

        const confirmed = window.confirm(
            'Вы действительно хотите удалить задачу?'
        );

        if (!confirmed) {
            return;
        }

        // Удаляем выбранную задачу
        setTasks(previousTasks =>
            removeTask(previousTasks, id)
        );

        // Сбрасываем редактирование удалённой задачи
        setEditingId(previousId =>
            previousId === id ? null : previousId
        );

        setFeedback('Задача удалена.');
    }


    /*
     * Основной интерфейс приложения.
     * Данные передаются компонентам через props.
     */
    return (
        <main>
            <h1>Задачи на React</h1>

            <p>
                ПР7: данные в памяти.
                Обновление страницы восстанавливает
                исходный набор.
            </p>

            <p>
                В наборе {tasks.length} задач,
                категорий: {categories.length}.
            </p>

            {/* Сообщения о действиях пользователя */}
            {feedback && (
                <p role="status">
                    {feedback}
                </p>
            )}

            {/* Статистика всего набора */}
            <TaskStats stats={stats} />

            {/* Управляемые фильтры */}
            <TaskFilters
                filters={filters}
                categories={categories}
                onChange={setFilters}
            />

            {/* Создание и редактирование задач */}
            <TaskForm
                key={editingId ?? 'new'}
                categories={categories}
                initialTask={editingTask}
                onSave={handleSave}
                onCancel={handleCancel}
            />

            {/* Список отфильтрованных задач */}
            <TaskList
                tasks={visibleTasks}
                categories={categories}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </main>
    );
}
