/**
 * Цена и название позиции заказа — только из меню ресторана (каталог iiko + правки админки),
 * никогда из запроса клиента. Иначе гость мог прислать «price: 1» и оплатить кухню онлайн за рубль.
 */
import { httpError } from '../lib/http.js';
import { getRestaurantCatalog } from './catalog.js';

/** Сколько штук одной позиции можно заказать за раз (защита от опечаток и переполнения сумм) */
export const MAX_LINE_QTY = 50;

/** Индекс меню ресторана: id и iikoId блюда → { name, price, isInStopList, balance } */
export async function menuIndex(restaurant) {
  const catalog = await getRestaurantCatalog(restaurant);
  const index = new Map();
  for (const p of catalog.products || []) {
    const entry = {
      name: String(p.name || 'Позиция').slice(0, 300),
      price: Math.round((Number(p.price) || 0) * 100) / 100,
      isInStopList: Boolean(p.isInStopList),
      balance: Number(p.stopBalance) > 0 ? Number(p.stopBalance) : null, // ограниченный остаток в iiko
    };
    if (p.id) index.set(String(p.id), entry);
    if (p.iikoId) index.set(String(p.iikoId), entry);
  }
  return index;
}

/**
 * Проверить позицию корзины по меню и вернуть серверные цену и название.
 * prevQty — сколько этой позиции уже лежало в неотправленной корзине: блюдо, попавшее в стоп-лист,
 * можно оставить или уменьшить, но не добавить. totalQty — сколько всего этой позиции в новой корзине
 * (у официанта одна позиция может быть на нескольких местах).
 */
export function priceLine(index, key, { qty, prevQty = 0, totalQty = qty, clientName = '' }) {
  const label = String(clientName || 'Позиция').slice(0, 60);
  const p = index.get(String(key));
  if (!p) throw httpError(400, `«${label}» больше нет в меню — уберите из корзины`);
  if (!(p.price > 0)) throw httpError(400, `«${p.name.slice(0, 60)}» нельзя заказать через меню — позовите официанта`);
  if (qty > MAX_LINE_QTY) throw httpError(400, `«${p.name.slice(0, 60)}»: не больше ${MAX_LINE_QTY} шт. за раз`);
  if (p.isInStopList && totalQty > prevQty) throw httpError(409, `«${p.name.slice(0, 60)}» закончилось — уберите из корзины`);
  if (p.balance && totalQty > p.balance && totalQty > prevQty) {
    throw httpError(409, `«${p.name.slice(0, 60)}»: осталось только ${p.balance} шт.`);
  }
  return { name: p.name, price: p.price };
}

/**
 * Позиции, которые нельзя отправить на кухню: на стопе или больше остатка. items — [{ key, name, quantity }].
 * Возвращает строки для ответа официанту; пусто — всё можно.
 */
export function stopProblems(index, items) {
  const qty = new Map();
  for (const i of items) qty.set(String(i.key), (qty.get(String(i.key)) || 0) + (Number(i.quantity) || 0));
  const out = [];
  for (const [key, n] of qty) {
    const p = index.get(key);
    if (!p) continue;
    if (p.isInStopList) out.push(`«${p.name.slice(0, 60)}» — на стопе`);
    else if (p.balance && n > p.balance) out.push(`«${p.name.slice(0, 60)}» — осталось ${p.balance} шт., в заказе ${n}`);
  }
  return out;
}
