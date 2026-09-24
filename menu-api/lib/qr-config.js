/** Ресторан по умолчанию, если в QR-ссылке нет ?restaurant= (демо: https://menu.franchise-fuji.ru/?table=5). */
export const QR_RESTAURANT_SLUG = process.env.QR_RESTAURANT_SLUG || 'novo-sadovaya';

/** Публичный адрес QR-меню — для генерации QR-кодов в админке. */
export const PUBLIC_MENU_URL = (process.env.PUBLIC_MENU_URL || 'https://menu.franchise-fuji.ru').replace(/\/$/, '');
