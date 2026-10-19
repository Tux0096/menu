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
      base: p.basePrice ?? null,
      sizeId: p.sizeId ?? null, // единственный продаваемый размер из нескольких в iiko
      sizes: p.sizes || [],
      groups: p.modifierGroups || [],
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
  // Блюдо пропало из меню, размер или выбранный соус закончились — iiko отклонит или пробьёт не то
  for (const i of items) {
    const p = index.get(String(i.key));
    if (!p) { out.push(`«${String(i.name || 'позиция').slice(0, 60)}» — больше нет в меню`); continue; }
    if (i.sizeId && p.sizes.length && !p.sizes.some((z) => String(z.id) === String(i.sizeId))) {
      out.push(`«${p.name.slice(0, 60)}» — этот размер закончился`);
    }
    const groups = i.sizeId ? (p.sizes.find((z) => String(z.id) === String(i.sizeId))?.groups || []) : p.groups;
    const live = new Set(groups.flatMap((g) => g.items.map((m) => String(m.id))));
    const gone = (i.modifiers || []).filter((m) => !live.has(String(m.id)));
    if (gone.length && (groups.length || p.sizes.length)) out.push(`«${p.name.slice(0, 60)}» — ${gone.map((m) => m.name || 'дополнение').join(', ')} закончилось`);
  }
  for (const [key, n] of qty) {
    const p = index.get(key);
    if (!p) continue; // уже в списке выше
    if (p.isInStopList) out.push(`«${p.name.slice(0, 60)}» — на стопе`);
    else if (p.balance && n > p.balance) out.push(`«${p.name.slice(0, 60)}» — осталось ${p.balance} шт., в заказе ${n}`);
  }
  return out;
}

// ── Размеры и модификаторы ──────────────────────────────────────────────────

/** Ключ варианта блюда: одинаковое блюдо с разным выбором — разные строки заказа. Без выбора — ID блюда. */
export function variantKey(productKey, sizeId, mods) {
  const m = (mods || []).filter((x) => x.amount > 0).map((x) => `${x.id}:${x.amount}`).sort();
  if (!sizeId && !m.length) return String(productKey);
  return `${productKey}|${sizeId || ''}|${m.join(',')}`;
}

/** Ключ варианта сохранённой строки заказа (table_order_items). */
export function rowVariantKey(row) {
  return variantKey(row.iiko_product_id, row.size_id, row.modifiers || []);
}

/**
 * Проверить выбор гостя (размер и модификаторы) по меню и посчитать цену за 1 шт.
 * Не выбранные обязательные группы заполняются вариантами по умолчанию (официант добавил блюдо без выбора —
 * iiko всё равно примет заказ). Бесплатные в группе (freeQuantity) — самые дешёвые из выбранных.
 * Возвращает { price, sizeId, sizeName, mods: [{ id, groupId, name, amount, price }], text, key }.
 */
export function priceVariant(entry, key, { sizeId = null, modifiers = [], defaults = false } = {}) {
  const name = entry.name.slice(0, 60);
  let size = null;
  let groups = entry.groups || [];
  if (entry.sizes?.length) {
    size = entry.sizes.find((z) => sizeId && String(z.id) === String(sizeId))
      || entry.sizes.find((z) => z.isDefault) || entry.sizes[0];
    if (sizeId && String(size.id) !== String(sizeId)) throw httpError(400, `«${name}»: такого размера больше нет — выберите заново`);
    groups = size.groups || [];
  }
  const wanted = new Map();
  for (const m of Array.isArray(modifiers) ? modifiers : []) {
    const amount = Math.floor(Number(m?.amount ?? 1) || 0);
    if (!m?.id || amount <= 0) continue;
    wanted.set(String(m.id), (wanted.get(String(m.id)) || 0) + amount);
  }
  if (!groups.length && wanted.size) throw httpError(400, `«${name}»: у блюда больше нет дополнений — выберите заново`);
  const mods = [];
  let extra = 0;
  for (const g of groups) {
    let picked = g.items.filter((it) => wanted.has(String(it.id))).map((it) => ({ it, amount: wanted.get(String(it.id)) }));
    for (const x of picked) wanted.delete(String(x.it.id));
    let total = picked.reduce((n, x) => n + x.amount, 0);
    // Выбор не прислали (официант добавил блюдо) — варианты по умолчанию из iiko, в пределах группы
    if (defaults && !picked.length) {
      for (const it of g.items.filter((x) => x.def > 0)) {
        if (g.max > 0 && total + it.def > g.max) break;
        picked.push({ it, amount: it.def }); total += it.def;
      }
    }
    // Обязательный выбор не сделан — по умолчанию из iiko, иначе первые варианты
    if (total < g.min) {
      const fill = g.items.filter((it) => it.def > 0 && !picked.some((x) => x.it.id === it.id)).map((it) => ({ it, amount: it.def }));
      for (const f of fill) { if (total >= g.min) break; picked.push(f); total += f.amount; }
      // Обязательный выбор без варианта по умолчанию — самый дешёвый (не навязываем доплату)
      for (const it of [...g.items].sort((a, b) => (a.price || 0) - (b.price || 0))) {
        if (total >= g.min) break;
        const cur = picked.find((x) => x.it.id === it.id);
        if (cur) { cur.amount += 1; } else picked.push({ it, amount: 1 });
        total += 1;
      }
    }
    if (g.max > 0 && total > g.max) throw httpError(400, `«${name}»: в «${g.name}» можно выбрать не больше ${g.max}`);
    for (const x of picked) {
      if (x.it.max > 0 && x.amount > x.it.max) throw httpError(400, `«${name}»: «${x.it.name}» — не больше ${x.it.max}`);
    }
    // Бесплатные единицы группы — самые дешёвые
    const units = picked.flatMap((x) => Array(x.amount).fill(x.it.price || 0)).sort((a, b) => a - b);
    extra += units.slice(Math.min(g.free || 0, units.length)).reduce((n, v) => n + v, 0);
    for (const x of picked) mods.push({ id: String(x.it.id), groupId: g.id, name: x.it.name, amount: x.amount, price: x.it.price || 0 });
  }
  if (wanted.size) throw httpError(400, `«${name}»: часть дополнений больше недоступна — выберите заново`);
  const base = size ? size.price : (entry.base ?? entry.price);
  const price = Math.round((base + extra) * 100) / 100;
  const text = [size?.name || null, ...mods.map((m) => (m.amount > 1 ? `${m.name} ×${m.amount}` : m.name))].filter(Boolean).join(', ');
  const sid = size && entry.sizes.length > 1 ? (size.id ? String(size.id) : null) : null;
  return { price, sizeId: sid, sizeName: sid ? size.name : null, mods, text: text.slice(0, 300), key: variantKey(key, sid, mods) };
}
