/** Картинка не загрузилась (удалили из хранилища, нет сети) — прячем «битую» иконку, остаётся фон-заглушка */
export function hideBrokenImage(e: Event) {
  const el = e.target as HTMLImageElement | null;
  if (el) el.style.visibility = 'hidden';
}
