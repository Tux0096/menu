import type { Ref } from 'vue';

/**
 * Несохранённые правки на странице: уход по ссылке админки — с подтверждением, закрытие вкладки — с вопросом браузера.
 * Для вкладок внутри страницы (Блюда / Разделы / Модификаторы) — `confirmLeave()` перед переключением.
 */
export function useLeaveGuard(dirty: Ref<boolean>) {
  const confirm = useConfirm();
  const confirmLeave = async () => !dirty.value || confirm({
    title: 'Уйти без сохранения?',
    description: 'Изменения на этой странице не сохранены и пропадут.',
    confirmLabel: 'Уйти без сохранения',
    danger: true,
  });
  onBeforeRouteLeave(async (to, from) => {
    if (to.path === from.path) return true; // смена query (вкладка, фильтр) — решает сама страница
    return confirmLeave();
  });
  const onUnload = (e: BeforeUnloadEvent) => {
    if (!dirty.value) return;
    e.preventDefault();
    e.returnValue = '';
  };
  onMounted(() => window.addEventListener('beforeunload', onUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onUnload));
  return { confirmLeave };
}
