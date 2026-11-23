import { Router } from 'express';
import { ApiError } from './errors.js';
import { parsePositiveId, parseFilters } from './validation.js';

/**
 * Создаёт маршруты для переданного store.
 * Маршруты не импортируют исходный массив напрямую и не хранят данные сами.
 */
export function createRouter(store) {
  const router = Router({ caseSensitive: true });

  // Health-маршрут показывает, что именно этот сервер отвечает на запрос.
  router.get('/health', (req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  // Список категорий и общее число элементов в полученном ответе.
  router.get('/categories', (req, res) => {
    const data = store.listCategories();
    return res.json({ data, meta: { total: data.length } });
  });

  // Query-строку разбираем как URLSearchParams, чтобы не потерять дубликаты.
  router.get('/tasks', (req, res) => {
    const url = new URL(req.originalUrl, 'http://localhost');
    const filters = parseFilters(url.searchParams);
    const data = store.listTasks(filters);

    return res.json({
      data,
      meta: {
        total: data.length, // total — число записей после применения фильтров.
        filters,
      },
    });
  });

  // Express декодирует :id автоматически; повторно decodeURIComponent не нужен.
  router.get('/tasks/:id', (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      throw new ApiError(400, 'INVALID_ID', 'Некорректный идентификатор задачи.');
    }

    const task = store.getTask(id);
    if (task === null) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id });
    }

    return res.json({ data: task });
  });

  // GET уже зарегистрированы выше. Остальные методы известных путей — 405.
  // HEAD автоматически обслуживается соответствующими GET-маршрутами,
  // а OPTIONS перехватывается общим middleware в app.js.
  const methodNotAllowed = (req, res, next) => {
    res.set('Allow', 'GET, HEAD, OPTIONS');
    next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается для этого маршрута.'));
  };

  router.all('/health', methodNotAllowed);
  router.all('/categories', methodNotAllowed);
  router.all('/tasks', methodNotAllowed);
  router.all('/tasks/:id', methodNotAllowed);

  return router;
}
