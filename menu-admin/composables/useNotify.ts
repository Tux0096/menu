/** Короткие тосты в едином стиле */
export function useNotify() {
  const toast = useToast();
  return {
    success(title: string, description?: string) {
      toast.add({ title, description, color: 'green', icon: 'i-heroicons-check-circle' });
    },
    error(error: unknown, title = 'Ошибка') {
      toast.add({
        title,
        description: typeof error === 'string' ? error : getErrorMessage(error),
        color: 'red',
        icon: 'i-heroicons-exclamation-triangle',
        timeout: 8000,
      });
    },
  };
}
