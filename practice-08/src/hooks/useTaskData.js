import { useEffect, useRef, useState } from 'react';

/**
 * ПР8. Данные задач из API: загрузка, отмена запросов и операции изменения.
 * Хук не хранит локальную копию задач для редактирования — источник истины API.
 */
export function useTaskData({ api, filters }) {
  // Последняя успешно полученная выборка сохраняется даже при ошибке нового GET.
  const [snapshot, setSnapshot] = useState({
    tasks: [],
    categories: [],
    meta: { total: 0 },
  });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);

  // Дополнительный счётчик для GET после успешной записи или ручного обновления.
  const [revision, setRevision] = useState(0);

  // Служебные ссылки: они не нужны для отображения и не вызывают рендер сами.
  const mountedRef = useRef(false);
  const mutationRef = useRef(null);

  // Отслеживаем монтирование и отменяем текущую запись при размонтировании.
  // Отдельный setup важен для дополнительного цикла React StrictMode.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationRef.current?.abort();
    };
  }, []);

  // Берём примитивы, а не объект filters целиком: новый объект с теми же
  // значениями не должен вызывать лишний сетевой запрос.
  const { q, completed, priority, categoryId } = filters;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStatus('loading');
    setError(null);

    async function load() {
      try {
        // Сервер получает ВСЕ фильтры и сам формирует выборку.
        const result = await api.loadInitialData(
          { q, completed, priority, categoryId },
          { signal: controller.signal }
        );

        // AbortController и active защищают от запоздавших ответов.
        if (!active || controller.signal.aborted || !mountedRef.current) return;
        setSnapshot(result);
        setStatus('ready');
      } catch (reason) {
        // Не показываем отмену и ошибки уже неактуальных запросов.
        if (!active || controller.signal.aborted || !mountedRef.current) return;
        if (reason?.kind === 'aborted') return;

        // При ошибке прежний успешный snapshot НЕ очищаем.
        setError(reason);
        setStatus('error');
      }
    }

    void load();

    // Cleanup происходит при смене фильтров, повторе или размонтировании.
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, q, completed, priority, categoryId, revision]);

  // Повторный GET без дублирования данных и без POST.
  function refresh() {
    if (mountedRef.current) setRevision(previous => previous + 1);
  }

  /**
   * Общая функция POST/PATCH/DELETE/reset.
   * Блокировка через ref устанавливается ДО первого await.
   */
  async function mutate(operation) {
    if (!mountedRef.current || mutationRef.current !== null) return false;

    const controller = new AbortController();
    mutationRef.current = controller;
    setPending(true);
    setMutationError(null);

    try {
      await operation(controller.signal);

      // Успешный ответ сервера ещё не гарантирует завершение GET,
      // но сама операция изменения уже подтверждена.
      if (!mountedRef.current || controller.signal.aborted) return false;
      setRevision(previous => previous + 1);
      return true;
    } catch (reason) {
      if (!mountedRef.current || controller.signal.aborted) return false;
      setMutationError(reason);
      return false;
    } finally {
      // Завершение старого вызова не должно снять блокировку нового.
      if (mutationRef.current === controller) {
        mutationRef.current = null;
        if (mountedRef.current) setPending(false);
      }
    }
  }

  // В форму передаётся только проверенный value; ID назначает сервер.
  function saveTask(id, value) {
    return mutate(signal => id === null
      ? api.createTask(value, { signal })
      : api.updateTask(id, value, { signal })
    );
  }

  function toggleTask(task) {
    return mutate(signal => api.setTaskCompleted(
      task.id, !task.completed, { signal }
    ));
  }

  function deleteTask(id) {
    return mutate(signal => api.deleteTask(id, { signal }));
  }

  function resetData() {
    return mutate(signal => api.resetDemoData({ signal }));
  }

  return {
    snapshot, status, error, mutationError, pending,
    refresh, saveTask, toggleTask, deleteTask, resetData,
  };
}
