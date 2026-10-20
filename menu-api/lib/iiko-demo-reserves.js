/**
 * Демо-режим iiko (ключей нет): брони столов в памяти процесса.
 * Наполняется из env IIKO_DEMO_RESERVES (JSON-массив) и через /api/v1/iiko/demo/reserves;
 * отвечает на reserve/restaurant_sections_workload и reserve/status_by_id так, как отвечал бы iiko.
 *
 * IIKO_DEMO_RESERVES='[{"table":"7","time":"19:00","name":"Мария","phone":"+7 900 156-08-08","guests":4},
 *                      {"table":"3","startsInMin":10,"name":"Олег","guests":2,"comment":"у окна"}]'
 *   time — сегодня в это время (по часовому поясу точки), startsInMin — через столько минут от запуска / вызова.
 */
import { randomUUID } from 'crypto';
import { demoTableId } from './iiko-demo-orders.js';
import { RESERVE_TZ, formatIikoTime, parseIikoTime, zonedToMs } from './iiko-reserve-sync.js';
import { localParts } from './lunch-schedule.js';

const reserves = new Map(); // id -> бронь в формате iiko
let seeded = false;

const STATUSES = { new: 'New', started: 'Started', closed: 'Closed' };

/** Начало брони из описания: startsAt (ISO или «ГГГГ-ММ-ДД ЧЧ:ММ»), time «19:00» (сегодня) или startsInMin. */
function startOf(spec, now = new Date()) {
  if (spec.startsAt) return parseIikoTime(spec.startsAt) || now.toISOString();
  if (spec.time) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(spec.time).trim());
    if (m) {
      const p = localParts(now, RESERVE_TZ);
      return new Date(zonedToMs(p.year, p.month, p.day, +m[1], +m[2], 0, RESERVE_TZ)).toISOString();
    }
  }
  return new Date(now.getTime() + (Number(spec.startsInMin) || 0) * 60_000).toISOString();
}

function build(spec, prev = null) {
  const id = String(spec.id || prev?.id || randomUUID());
  const startsAt = spec.startsAt || spec.time || spec.startsInMin != null || !prev ? startOf(spec) : prev._startsAt;
  const table = spec.table != null ? String(spec.table) : prev?._table;
  return {
    id,
    organizationId: undefined,
    tableIds: table == null ? [] : [demoTableId(table)],
    estimatedStartTime: formatIikoTime(new Date(startsAt)),
    durationInMinutes: Number(spec.durationMin ?? prev?.durationInMinutes ?? 120),
    guestsCount: Number(spec.guests ?? prev?.guestsCount ?? 2),
    customer: { name: spec.name ?? prev?.customer?.name ?? 'Гость' },
    phone: spec.phone !== undefined ? spec.phone : prev?.phone,
    comment: spec.comment !== undefined ? spec.comment : prev?.comment,
    status: STATUSES[String(spec.status || '').toLowerCase()] || prev?.status || 'New',
    isDeleted: Boolean(spec.cancelled ?? prev?.isDeleted ?? false),
    _startsAt: startsAt,
    _table: table,
  };
}

function seed() {
  if (seeded) return;
  seeded = true;
  try {
    const list = JSON.parse(process.env.IIKO_DEMO_RESERVES || '[]');
    for (const spec of Array.isArray(list) ? list : []) {
      if (spec?.table != null) { const r = build(spec); reserves.set(r.id, r); }
    }
  } catch (e) {
    console.warn('IIKO_DEMO_RESERVES: не разобрать JSON —', e.message);
  }
}

/** Столы демо-броней — попадают в демо-схему зала, чтобы бронь можно было сопоставить со столом. */
export function demoReserveTables() {
  seed();
  return [...new Set([...reserves.values()].map((r) => r._table).filter((t) => t != null))];
}

/** Ответ без служебных полей демо. */
const publicShape = (r) => Object.fromEntries(Object.entries(r).filter(([k, v]) => !k.startsWith('_') && v !== undefined));

/** reserve/restaurant_sections_workload: брони, начинающиеся в окне dateFrom…dateTo, по залам. */
export function demoReservesWorkload(body) {
  seed();
  const from = body?.dateFrom ? new Date(parseIikoTime(body.dateFrom)).getTime() : -Infinity;
  const to = body?.dateTo ? new Date(parseIikoTime(body.dateTo)).getTime() : Infinity;
  const list = [...reserves.values()]
    .filter((r) => { const t = new Date(r._startsAt).getTime(); return t >= from && t < to; })
    .map(publicShape);
  const sections = body?.restaurantSectionIds?.length ? body.restaurantSectionIds : [null];
  return {
    correlationId: randomUUID(),
    restaurantSectionsWorkload: sections.map((id, i) => ({ restaurantSectionId: id, reserves: i === 0 ? list : [] })),
  };
}

/** reserve/status_by_id: бронь по ID (обёртка с creationStatus, как у заказов). */
export function demoReservesByIds(body) {
  seed();
  return {
    correlationId: randomUUID(),
    reserves: (body?.reserveIds || []).map((id) => reserves.get(String(id))).filter(Boolean)
      .map((r) => ({ id: r.id, creationStatus: 'Success', reserve: publicShape(r) })),
  };
}

/** Управление демо-бронями (проверка сценария локально и в e2e). */
export function demoReservesApply(op) {
  seed();
  switch (op?.op) {
    case 'reset': reserves.clear(); return { ok: true };
    case 'upsert': {
      const r = build(op.reserve || {}, reserves.get(String(op.reserve?.id || '')) || null);
      reserves.set(r.id, r);
      return { ok: true, reserveId: r.id, startsAt: r._startsAt };
    }
    case 'cancel': {
      const r = reserves.get(String(op.reserveId));
      if (!r) return { ok: false, error: 'нет такой брони' };
      r.isDeleted = true;
      return { ok: true };
    }
    case 'remove': // бронь исчезла из ответа iiko
      return { ok: reserves.delete(String(op.reserveId)) };
    case 'setStatus': {
      const r = reserves.get(String(op.reserveId));
      if (!r) return { ok: false, error: 'нет такой брони' };
      r.status = STATUSES[String(op.status || '').toLowerCase()] || r.status;
      return { ok: true };
    }
    default: return { ok: false, error: 'неизвестная операция' };
  }
}
