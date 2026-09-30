/**
 * Картинки меню: оригиналы из iiko бывают по несколько мегабайт — сервер уменьшает их до нужной ширины,
 * перекодирует в WebP и хранит на диске. Гость получает 20–60 КБ вместо мегабайтов, повторно — из кэша браузера.
 * Отдаются только картинки, которые есть в меню (защита от использования сервера как прокси).
 */
import axios from 'axios';
import { createHash } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pool from '../db/pool.js';

const CACHE_DIR = process.env.IMG_CACHE_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'img');
export const IMG_WIDTHS = [160, 320, 480, 720, 960];
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
  allowedAt = Date.now();
  return allowed;
}

async function isAllowed(url) {
  if ((await allowedUrls()).has(url)) return true;
  allowedAt = 0; // меню могло только что обновиться
  return (await allowedUrls()).has(url);
}

export const pickWidth = (w) => IMG_WIDTHS.find((x) => x >= Number(w)) || IMG_WIDTHS[IMG_WIDTHS.length - 1];

const inflight = new Map();

/** WebP нужной ширины: из кэша на диске или скачать оригинал и уменьшить. */
export async function resizedImage(url, width) {
  const w = pickWidth(width);
  const file = join(CACHE_DIR, `${createHash('sha1').update(`${url}|${w}`).digest('hex')}.webp`);
  try {
    return await readFile(file);
  } catch {}
  const key = file;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      maxContentLength: MAX_SOURCE_BYTES,
      maxRedirects: 3,
    });
    const out = await sharp(Buffer.from(data), { failOn: 'none' })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    await mkdir(CACHE_DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, out);
    await rename(tmp, file);
    return out;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Express-обработчик GET /img?u=<url>&w=<ширина>. */
export async function imageHandler(req, res) {
  const url = String(req.query.u || '');
  if (!/^https?:\/\//i.test(url) || !(await isAllowed(url))) return res.status(404).end();
  try {
    const buf = await resizedImage(url, req.query.w || 480);
    res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=2592000, immutable' });
    return res.send(buf);
  } catch (e) {
    console.warn('img:', url.slice(0, 120), e.message);
    return res.redirect(302, url);
  }
}

/** После запуска и выгрузки меню: заранее готовим картинки, чтобы первый гость не ждал. */
export async function warmImages({ widths = [320, 720], concurrency = 3 } = {}) {
  const urls = [...await allowedUrls()].filter((u) => /^https?:\/\//i.test(u));
  let i = 0;
  let done = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      for (const w of widths) {
        try { await resizedImage(u, w); done++; } catch {}
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (urls.length) console.log(`Картинки меню: готово ${done} из ${urls.length * widths.length}`);
}
