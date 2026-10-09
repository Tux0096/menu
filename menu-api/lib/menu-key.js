/** Ключ блюда по названию: без регистра, «ё», пробелов и знаков — одно блюдо на разных точках и после пересоздания в iiko */
export const menuKey = (name) => String(name || '').toLowerCase().replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9]+/g, ' ').trim();
