/**
 * Подтверждение опасных действий вместо window.confirm:
 *   if (!(await confirm({ title: 'Удалить баннер?', danger: true }))) return;
 * Диалог рисует <ConfirmDialog /> в layouts/default.vue.
 */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

let resolver: ((ok: boolean) => void) | null = null;

export function useConfirmState() {
  return useState<ConfirmState>('confirm-dialog', () => ({ open: false, title: '' }));
}

export function resolveConfirm(ok: boolean) {
  const state = useConfirmState();
  state.value = { ...state.value, open: false };
  resolver?.(ok);
  resolver = null;
}

export function useConfirm() {
  const state = useConfirmState();
  return (options: ConfirmOptions): Promise<boolean> => {
    resolver?.(false);
    state.value = { ...options, open: true };
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  };
}
