// Практическая работа №8. Вариант №3 — начальный фильтр «Высокий».
// Номер из предыдущих работ сохраняется. Номера свыше 8 приводятся к диапазону 1–8.
export const variant = 3;
export function createInitialFilters() {
  const presets = [
    { completed: 'false' }, { completed: 'true' },
    { priority: 'high' }, { priority: 'medium' },
    { categoryId: '1' }, { categoryId: '2' },
    { q: 'провер' }, { completed: 'false', priority: 'high', categoryId: '2' },
  ];
  return { q: '', completed: '', priority: '', categoryId: '', ...presets[((variant - 1) % 8 + 8) % 8] };
}
