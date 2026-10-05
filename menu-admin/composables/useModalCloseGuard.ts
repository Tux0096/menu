import type { Ref } from 'vue';

/**
 * Закрытие модалки редактирования без потери правок. Модалка всегда с :prevent-close (клик мимо и Esc
 * не закрывают её молча), крестик, «Отмена» и попытка закрыть (@close-prevented) идут через requestClose():
 * если форма изменилась с момента открытия — спрашиваем.
 *   const { takeSnapshot, requestClose } = useModalCloseGuard(open, () => form);
 *   function openEdit(x) { fill(x); open.value = true; takeSnapshot(); }
 *   <UModal v-model="open" prevent-close @close-prevented="requestClose"> … <UButton @click="requestClose">Отмена</UButton>
 */
export function useModalCloseGuard(open: Ref<boolean>, current: () => unknown, opts: { description?: string } = {}) {
  const confirm = useConfirm();
  const confirmState = useConfirmState();
  const reauthState = useReauthState();
  const snapshot = ref<string | null>(null);

  /** Запомнить форму «как при открытии» — вызывать сразу после заполнения формы */
  function takeSnapshot() {
    snapshot.value = JSON.stringify(current());
  }

  const dirty = computed(() => open.value && snapshot.value !== null && JSON.stringify(current()) !== snapshot.value);

  async function requestClose() {
    // клик в окне подтверждения или повторного входа поверх модалки — не попытка её закрыть
    if (confirmState.value.open || reauthState.value.open) return;
    if (dirty.value) {
      const ok = await confirm({
        title: 'Закрыть без сохранения?',
        description: opts.description ?? 'Введённые изменения пропадут.',
        confirmLabel: 'Закрыть',
        cancelLabel: 'Продолжить редактирование',
        danger: true,
      });
      if (!ok) return;
    }
    open.value = false;
  }

  watch(open, (v) => {
    if (!v) snapshot.value = null;
  });

  return { dirty, takeSnapshot, requestClose };
}
