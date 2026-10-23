/**
 * Картинки меню: оригиналы из iiko бывают по несколько мегабайт — сервер уменьшает их до нужной ширины,
 * перекодирует в WebP и хранит на диске. Гость получает 20–60 КБ вместо мегабайтов, повторно — из кэша браузера.
 * Отдаются только картинки, которые есть в меню (защита от использования сервера как прокси).
 */
import axios from 'axios';
import { createHash } from 'crypto';
import { lookup as dnsLookup } from 'dns';
import { isIP } from 'net';
import { mkdir, readdir, readFile, rename, stat, unlink, utimes, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pool from '../db/pool.js';
import { MEDIA_DIR } from '../lib/paths.js';

const CACHE_DIR = process.env.IMG_CACHE_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'img');
// 480 — карточка списка на экранах 3x (144 px × 3), 1080/1280 — фото блюда на весь экран телефона
export const IMG_WIDTHS = [160, 320, 480, 720, 960, 1280];
// Загруженное в админке (/media/<uuid>.<ext>) — тоже уменьшается: оригинал бывает до 8 МБ
const MEDIA_RE = /^\/media\/([a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|gif))$/i;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

let allowed = new Set();
let allowedAt = 0;
async function allowedUrls() {
  if (Date.now() - allowedAt < 5 * 60 * 1000) return allowed;
  const { rows } = await pool.query(
    `SELECT image_url AS u FROM products WHERE image_url IS NOT NULL
     UNION SELECT image_url FROM categories WHERE image_url IS NOT NULL
     UNION SELECT image_url FROM menu_overrides WHERE image_url IS NOT NULL
     UNION SELECT image_url FROM promo_blocks WHERE image_url IS NOT NULL`,
  );
  allowed = new Set(rows.map((r) => r.u));
  // Картинки разделов и модификаторов (из админки и из внешнего меню iiko) — отдельным запросом: если что-то
  // не поддерживается базой, основные картинки меню всё равно работают
  try {
    const { rows: extra } = await pool.query(
      `SELECT image_url AS u FROM category_content WHERE image_url IS NOT NULL
       UNION SELECT image_url FROM modifier_content WHERE image_url IS NOT NULL
       UNION SELECT DISTINCT jsonb_path_query(options, '$.**.image') #>> '{}' FROM products WHERE options IS NOT NULL`,
    );
    for (const r of extra) if (r.u) allowed.add(r.u);
  } catch (e) { console.warn('img: картинки модификаторов не загружены в список:', e.message); }
  allowedAt = Date.now();
  return allowed;
}

let missReloadAt = 0;
async function isAllowed(url) {
  if ((await allowedUrls()).has(url)) return true;
  // Меню могло только что обновиться — перечитываем список, но не чаще раза в 30 секунд
  // (иначе каждый запрос с выдуманным адресом гонял бы тяжёлый запрос к базе)
  if (Date.now() - missReloadAt < 30_000) return false;
  missReloadAt = Date.now();
  allowedAt = 0;
  return (await allowedUrls()).has(url);
}

// ── Защита от SSRF: картинки качаем только с публичных адресов ─────────────
// Адрес картинки задаёт админка, поэтому сервер не должен ходить по нему во внутреннюю сеть
// (127.0.0.1, 10.x, 192.168.x, метаданные облака 169.254.169.254 и т. п.) — ни напрямую, ни через редирект.
function isPrivateIp(ip) {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    if (x.startsWith('::ffff:')) return isPrivateIp(x.slice(7));
    return x === '::' || x === '::1' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9')
      || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('ff');
  }
  return true;
}

/** DNS-резолвер для запросов картинок: отказ, если имя указывает на внутренний адрес (и при DNS rebinding) */
function publicLookup(hostname, options, callback) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options?.family || 4 }];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return callback(Object.assign(new Error(`запрещённый адрес картинки: ${hostname}`), { code: 'EPRIVATE' }));
    }
    if (options?.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

function assertPublicUrl(raw) {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error('картинка только по http(s)');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivateIp(host)) throw new Error(`запрещённый адрес картинки: ${host}`);
}

export const pickWidth = (w) => IMG_WIDTHS.find((x) => x >= Number(w)) || IMG_WIDTHS[IMG_WIDTHS.length - 1];

const inflight = new Map();

/** Оригинал: файл из /media на диске или картинка по ссылке (только с публичных адресов). */
async function sourceBytes(url) {
  const local = url.match(MEDIA_RE);
  if (local) return readFile(join(MEDIA_DIR, local[1]));
  assertPublicUrl(url);
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: MAX_SOURCE_BYTES,
    maxRedirects: 3,
    lookup: publicLookup,
    // Редирект на IP-адрес минует DNS — проверяем каждый шаг
    beforeRedirect: (opts) => assertPublicUrl(`${opts.protocol}//${opts.hostname}${opts.path || ''}`),
  });
  return Buffer.from(data);
}

// Версия настроек сжатия в ключе кэша: сменили настройки — файлы пересоберутся (прогрев после запуска)
const ENCODE_VERSION = 'v2';
const cacheFile = (url, w) => join(CACHE_DIR, `${createHash('sha1').update(`${url}|${w}|${ENCODE_VERSION}`).digest('hex')}.webp`);

// Не больше трёх пережатий одновременно: всплеск новых фото не съедает память и процессор сервера
let running = 0;
const waiting = [];
async function withSlot(fn) {
  if (running >= 3) await new Promise((r) => waiting.push(r));
  running += 1;
  try { return await fn(); } finally { running -= 1; waiting.shift()?.(); }
}

/**
 * Сжатие: WebP 70 и прозрачность 80 — на фото блюд без фона на 23% легче прежних 78/4 при том же виде.
 * limitInputPixels — защита от огромных загрузок (до ~40 Мп).
 */
async function encode(data, w, animated) {
  return withSlot(() => sharp(data, { failOn: 'none', animated, limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: 70, alphaQuality: 80, effort: 5 })
    .toBuffer());
}
const isAnimated = async (url, data) => /\.gif(\?|$)/i.test(url)
  || (await sharp(data, { failOn: 'none', limitInputPixels: 40_000_000 }).metadata().catch(() => ({}))).pages > 1;

async function store(file, out) {
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, out);
  await rename(tmp, file);
}

/** WebP нужной ширины: из кэша на диске или скачать оригинал и уменьшить. Анимация (GIF/WebP) сохраняется. */
export async function resizedImage(url, width) {
  const w = pickWidth(width);
  const file = cacheFile(url, w);
  try {
    const buf = await readFile(file);
    touch(file);
    return buf;
  } catch {}
  const key = file;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const data = await sourceBytes(url);
    const out = await encode(data, w, await isAnimated(url, data));
    await store(file, out);
    return out;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

// Отметка «файл нужен»: кэш, которым давно не пользовались (фото удалённых блюд), чистится раз в сутки
const touched = new Set();
function touch(file) {
  if (touched.has(file)) return;
  touched.add(file);
  if (touched.size > 20000) touched.clear();
  const now = new Date();
  utimes(file, now, now).catch(() => {});
}

export async function pruneImageCache(maxAgeDays = 30) {
  let removed = 0;
  const limit = Date.now() - maxAgeDays * 86_400_000;
  for (const name of await readdir(CACHE_DIR).catch(() => [])) {
    const f = join(CACHE_DIR, name);
    const st = await stat(f).catch(() => null);
    if (st && st.mtimeMs < limit) { await unlink(f).catch(() => {}); removed += 1; }
  }
  if (removed) console.log(`Кэш картинок: удалено ${removed} старых файлов`);
  return removed;
}

const CACHE_MAX_BYTES = parseInt(process.env.IMG_CACHE_MAX_MB || '2048', 10) * 1024 * 1024;

/** Раз в сутки: убрать файлы старше 30 дней, а если кэш всё равно больше лимита (2 ГБ) — самые давние, пока не влезет в 80%. */
export async function cleanImageCache({ maxAgeDays = 30, maxBytes = CACHE_MAX_BYTES } = {}) {
  let removed = await pruneImageCache(maxAgeDays);
  const files = [];
  let total = 0;
  for (const name of await readdir(CACHE_DIR).catch(() => [])) {
    const f = join(CACHE_DIR, name);
    const st = await stat(f).catch(() => null);
    if (st?.isFile()) { files.push({ f, size: st.size, at: st.mtimeMs }); total += st.size; }
  }
  if (total > maxBytes) {
    files.sort((x, y) => x.at - y.at);
    for (const file of files) {
      if (total <= maxBytes * 0.8) break;
      await unlink(file.f).catch(() => {});
      total -= file.size;
      removed += 1;
    }
    console.log(`Кэш картинок: превышен лимит ${Math.round(maxBytes / 1048576)} МБ, удалены самые давние файлы (всего удалено ${removed})`);
  }
  return removed;
}

/** Express-обработчик GET /img?u=<url>&w=<ширина>. */
export async function imageHandler(req, res) {
  const url = String(req.query.u || '');
  const ok = MEDIA_RE.test(url) || (/^https?:\/\//i.test(url) && (await isAllowed(url)));
  if (!ok) return res.status(404).end();
  try {
    const buf = await resizedImage(url, req.query.w || 480);
    res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=2592000, immutable' });
    return res.send(buf);
  } catch (e) {
    console.warn('img:', url.slice(0, 120), e.message);
    if (MEDIA_RE.test(url) && e.code === 'ENOENT') return res.status(404).end();
    return res.redirect(302, url);
  }
}

/**
 * После запуска и выгрузки меню: заранее готовим картинки всех размеров, чтобы первый гость не ждал.
 * Оригинал скачивается один раз на все недостающие размеры.
 */
export async function warmImages({ widths = IMG_WIDTHS, concurrency = 3 } = {}) {
  const urls = [...await allowedUrls()].filter((u) => /^https?:\/\//i.test(u) || MEDIA_RE.test(u));
  let i = 0;
  let done = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      const missing = [];
      for (const w of widths) {
        const file = cacheFile(u, w);
        if (await stat(file).then(() => true, () => false)) { touch(file); done++; } else missing.push([w, file]);
      }
      if (!missing.length) continue;
      try {
        const data = await sourceBytes(u);
        const animated = await isAnimated(u, data);
        for (const [w, file] of missing) {
          if (inflight.has(file)) { await inflight.get(file).catch(() => {}); done++; continue; }
          await store(file, await encode(data, w, animated));
          done++;
        }
      } catch {}
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (urls.length) console.log(`Картинки меню: готово ${done} из ${urls.length * widths.length}`);
  await pruneImageCache().catch(() => {});
}
