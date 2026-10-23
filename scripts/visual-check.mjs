#!/usr/bin/env node
// Визуальная проверка «ничего не поменялось» (рефакторинг CSS / дизайн-токенов).
//
//   node scripts/visual-check.mjs shoot <каталог>            — снять скриншоты в каталог
//   node scripts/visual-check.mjs compare <до> <после> [diff-каталог]  — сравнить два каталога попиксельно
//
// Нужны: запущенный menu-api (BASE, по умолчанию http://localhost:3135, ALLOW_DEMO_MENU=true),
// собранная админка (cd menu-admin && npm run generate), Playwright (глобально или в node_modules),
// sharp (из menu-api/node_modules). В CI не обязателен.
//
// Экраны: гость 390px (главная, меню, карточка блюда, корзина), официант 390px (столы, карточка стола),
// админка 1280px (сводка, меню сети). Допуск: различается < 0.5% пикселей на экран.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASE = process.env.BASE || 'http://localhost:3135';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const LIMIT = Number(process.env.LIMIT || 0.5); // %
const NOISE = Number(process.env.NOISE || 24); // разница канала (0–255), ниже которой пиксель считаем одинаковым

function load(name, extraDirs = []) {
  const dirs = [join(ROOT, 'menu-api', 'node_modules'), join(ROOT, 'menu-admin', 'node_modules'), ...extraDirs];
  try { dirs.push(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch { /* нет npm */ }
  for (const d of dirs) {
    try { return createRequire(join(d, 'x.js'))(name); } catch { /* дальше */ }
  }
  throw new Error(`Не найден модуль ${name}`);
}

const [cmd, a, b, c] = process.argv.slice(2);

async function shoot(out) {
  const { chromium } = load('playwright');
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: existsSync(CHROMIUM) ? CHROMIUM : undefined });
  const frozen = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}';
  const open = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'ru-RU', timezoneId: 'Europe/Samara' });
    await ctx.addInitScript((css) => {
      const add = () => { const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st); };
      if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
    }, frozen);
    // Фото блюд и внешние ресурсы — вне сравнения (зависят от кэша картинок сервера); иконки интерфейса (/ui/, svg) грузятся
    await ctx.route('**/*', (r) => {
      const req = r.request();
      const u = new URL(req.url());
      const external = !['localhost', '127.0.0.1'].includes(u.hostname);
      const photo = req.resourceType() === 'image' && !u.pathname.startsWith('/ui/') && !u.pathname.endsWith('.svg') && !u.pathname.startsWith('/admin/');
      return external || photo ? r.abort() : r.continue();
    });
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    return page;
  };
  const snap = async (page, name, pre) => {
    await page.waitForTimeout(700);
    if (pre) await page.evaluate(pre);
    await page.screenshot({ path: join(out, `${name}.png`) });
    console.log('  ', name);
  };

  // ── Гость ─────────────────────────────────────────────
  console.log('guest');
  let g = await open(390, 844);
  await g.goto(`${BASE}/?restaurant=novo-sadovaya&table=17`);
  await g.waitForSelector('.dish');
  await snap(g, 'guest-1-home');
  await g.click('.cats__all');
  await g.waitForTimeout(600);
  await snap(g, 'guest-2-menu');
  await g.keyboard.press('Escape');
  await g.goto(`${BASE}/?restaurant=novo-sadovaya&table=17`);
  await g.waitForSelector('.dish');
  const first = g.locator('.dish[data-product] .dish__photo').first();
  await first.click();
  await g.waitForTimeout(800);
  await snap(g, 'guest-3-dish');
  await g.goto(`${BASE}/?restaurant=novo-sadovaya&table=17`);
  await g.waitForSelector('.dish');
  const adds = g.locator('button[data-inc][aria-label^="Добавить"]');
  await adds.first().click();
  if (await g.locator('#seat-form').count()) { // первый заказ — авторизация по телефону (демо-гость)
    if (await g.locator('#seat-name').count()) await g.fill('#seat-name', 'Тест');
    await g.fill('#phone', '+7 900 000 00 01');
    if (await g.locator('#seat-form #consent').count()) await g.check('#seat-form #consent', { force: true }); // согласие с политикой — без него вход не отправляется
    await g.click('#seat-form button[type=submit]');
    await g.waitForSelector('#seat-form', { state: 'detached' });
    await g.waitForTimeout(800);
  }
  await g.click('[data-go="order"]'); // стол мог остаться с прошлого прогона — начинаем с пустой корзины
  await g.waitForTimeout(600);
  if (await g.locator('[data-action="clear"]').count()) { await g.click('[data-action="clear"]'); await g.waitForTimeout(500); }
  await g.click('[data-go="menu"]');
  await g.waitForSelector('.dish');
  for (let i = 0; i < 2; i++) { await adds.nth(i).click(); await g.waitForTimeout(250); }
  await g.click('[data-go="order"]');
  await g.waitForTimeout(800);
  await snap(g, 'guest-4-cart');
  await g.waitForTimeout(1500); // корзина уходит на сервер с задержкой — официант увидит позиции
  await g.context().close();

  // ── Официант ──────────────────────────────────────────
  console.log('staff');
  const s = await open(390, 844);
  await s.goto(`${BASE}/staff/`);
  await s.waitForSelector('input[name="pin"]');
  await s.selectOption('select[name="restaurant"]', 'novo-sadovaya').catch(() => {});
  await s.fill('input[name="pin"]', '2580');
  await s.keyboard.press('Enter');
  await s.waitForSelector('.tcard, .empty, .tabs', { timeout: 10000 });
  await s.waitForTimeout(1200);
  // на общей базе рядом могут быть чужие столы — оставляем только стол 17 (наш)
  await snap(s, 'staff-1-tables', () => document.querySelectorAll('.tcard-wrap').forEach((w) => { if (w.querySelector('.tcard__num')?.textContent.trim() !== '17') w.remove(); }));
  const card = s.locator('.tcard').first();
  if (await card.count()) {
    await card.click();
    await s.waitForTimeout(1000);
    await snap(s, 'staff-2-table');
  } else {
    console.log('   (нет столов с сессией — staff-2-table пропущен)');
  }
  await s.context().close();

  // ── Админка ───────────────────────────────────────────
  console.log('admin');
  const ad = await open(1280, 800);
  await ad.goto(`${BASE}/admin/login`);
  await ad.waitForSelector('input');
  const inputs = ad.locator('input');
  await inputs.nth(0).fill('admin');
  await inputs.nth(1).fill('admin');
  await ad.keyboard.press('Enter');
  await ad.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 10000 });
  await ad.waitForTimeout(2500);
  await snap(ad, 'admin-1-dashboard');
  await ad.goto(`${BASE}/admin/network-menu`);
  await ad.waitForTimeout(3000);
  await snap(ad, 'admin-2-network-menu');
  await browser.close();
}

async function compare(dirA, dirB, diffDir) {
  const sharp = load('sharp');
  if (diffDir) mkdirSync(diffDir, { recursive: true });
  const names = readdirSync(dirA).filter((f) => f.endsWith('.png') && existsSync(join(dirB, f)));
  let bad = 0;
  console.log('экран'.padEnd(26), 'пикс.'.padStart(9), 'любое, %'.padStart(9), `>${NOISE}, %`.padStart(9), '  итог');
  for (const f of names) {
    const A = await sharp(join(dirA, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const B = await sharp(join(dirB, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
      console.log(f.padEnd(26), `размеры разные: ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}`, '  ПРОВАЛ');
      bad++;
      continue;
    }
    const { width, height } = A.info;
    const n = width * height;
    const out = Buffer.alloc(n * 4);
    let any = 0, strong = 0;
    for (let i = 0; i < n; i++) {
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.data[i * 4 + k] - B.data[i * 4 + k]));
      if (d > 0) any++;
      if (d > NOISE) { strong++; out[i * 4] = 255; out[i * 4 + 3] = 255; } else { out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = A.data[i * 4] >> 1; out[i * 4 + 3] = 255; }
    }
    const pAny = (any / n) * 100, pStrong = (strong / n) * 100;
    const ok = pStrong < LIMIT;
    if (!ok) bad++;
    console.log(f.padEnd(26), String(n).padStart(9), pAny.toFixed(3).padStart(9), pStrong.toFixed(3).padStart(9), ok ? '  ok' : '  ПРОВАЛ');
    if (diffDir) await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(join(diffDir, f));
  }
  console.log(bad ? `\nПРОВАЛ: ${bad} экр.` : `\nOK: ${names.length} экр., различия < ${LIMIT}%`);
  process.exitCode = bad ? 1 : 0;
}

if (cmd === 'shoot' && a) await shoot(resolve(a));
else if (cmd === 'compare' && a && b) await compare(resolve(a), resolve(b), c && resolve(c));
else console.log('Использование:\n  node scripts/visual-check.mjs shoot <каталог>\n  node scripts/visual-check.mjs compare <до> <после> [diff-каталог]');
