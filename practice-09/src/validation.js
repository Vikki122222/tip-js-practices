import { ApiError } from './errors.js';

// Разрешённые query-параметры списка задач. Другие имена считаются ошибкой.
const ALLOWED_FILTERS = new Set(['completed', 'priority', 'categoryId', 'q']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

/**
 * Преобразует строковый id в безопасное положительное целое число.
 * Возвращает null, если строка целиком не соответствует формату id.
 *
 * Важно проверять всю строку регулярным выражением: parseInt('4abc')
 * вернул бы 4, хотя такой идентификатор должен быть отклонён.
 */
export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * Проверяет URLSearchParams и возвращает нормализованный объект фильтров.
 * Отсутствующие ограничения представлены null, а пустой поиск — строкой ''.
 * Повторяющиеся и неизвестные имена запрещены, даже если значения совпадают.
 */
export function parseFilters(searchParams) {
  // Сначала проверяем имена и повторы, пока URLSearchParams ещё хранит их.
  for (const name of searchParams.keys()) {
    if (!ALLOWED_FILTERS.has(name)) {
      throw new ApiError(400, 'INVALID_QUERY', `Неизвестный параметр: ${name}.`);
    }

    if (searchParams.getAll(name).length > 1) {
      throw new ApiError(400, 'INVALID_QUERY', `Параметр ${name} не должен повторяться.`);
    }
  }

  // Не используем Boolean(raw): Boolean('false') равно true.
  let completed = null;
  if (searchParams.has('completed')) {
    const raw = searchParams.get('completed');
    if (raw !== 'true' && raw !== 'false') {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр completed должен быть true или false.');
    }
    completed = raw === 'true';
  }

  let priority = null;
  if (searchParams.has('priority')) {
    priority = searchParams.get('priority');
    if (!ALLOWED_PRIORITIES.has(priority)) {
      throw new ApiError(400, 'INVALID_QUERY', 'Недопустимое значение priority.');
    }
  }

  let categoryId = null;
  if (searchParams.has('categoryId')) {
    // Для categoryId действуют те же строгие правила положительного id.
    categoryId = parsePositiveId(searchParams.get('categoryId'));
    if (categoryId === null) {
      throw new ApiError(400, 'INVALID_QUERY', 'Параметр categoryId должен быть положительным целым числом.');
    }
  }

  // q может быть пустым; trim выполняется до проверки длины.
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length > 100) {
    throw new ApiError(400, 'INVALID_QUERY', 'Параметр q не должен превышать 100 символов.');
  }

  return { completed, priority, categoryId, q };
}
