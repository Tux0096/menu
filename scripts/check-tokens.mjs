#!/usr/bin/env node
// Проверка дизайн-токенов (docs/DESIGN_SYSTEM.md): в menu-web/guest/app.css и menu-web/staff/staff.css
// вне блока :root не должно остаться захардкоженных hex-цветов и font-size в px (цель — 0).
// Дополнительно (справочно, код возврата не меняет): rgba() с «сырыми» числами, не заведённые var(--…),
// повторяющиеся px-отступы вне шкалы.
//
//   node scripts/check-tokens.mjs          — отчёт, код 1 если есть hex или font-size px
//   node scripts/check-tokens.mjs -v       — плюс построчный список нарушений
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['menu-web/guest/app.css', 'menu-web/staff/staff.css'];
const verbose = process.argv.includes('-v');

let failed = false;
for (const rel of FILES) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); // комментарии → пробелы (строки сохраняем)
  const rootStart = clean.indexOf(':root');
  const rootEnd = clean.indexOf('}', rootStart);
  const defined = new Set([...clean.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const hits = { hex: [], 'font-size px': [], 'rgba (сырые)': [], 'var() без определения': [], 'px-отступы вне шкалы 4px': [] };

  // Переменные, которые задаёт JS через style="--x:…" (topbar-h, preview), в проверку не входят. Тела деклараций — самые внутренние {…}; @font-face и :root пропускаем
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    const start = m.index;
    if (start >= rootStart && start <= rootEnd) continue;
    const body = m[1];
    if (/src:\s*url/.test(body)) continue;
    const line = (off) => clean.slice(0, start + 1 + off).split('\n').length;
    for (const x of body.matchAll(/(?<![\w&])#[0-9a-fA-F]{3,8}\b/g)) hits.hex.push([line(x.index), x[0]]);
    for (const x of body.matchAll(/font-size:\s*\d+(?:\.\d+)?px/g)) hits['font-size px'].push([line(x.index), x[0]]);
    for (const x of body.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g)) hits['rgba (сырые)'].push([line(x.index), x[0]]);
    for (const x of body.matchAll(/var\((--[\w-]+)/g)) {
      if (!defined.has(x[1]) && !/^--(topbar-h|preview|vh|safe-)/.test(x[1])) hits['var() без определения'].push([line(x.index), x[1]]);
    }
    for (const x of body.matchAll(/(?:^|[;\s])(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?:\s*([^;}]+)/g)) {
      for (const t of x[1].matchAll(/(?<![\w.\-])(\d+)px/g)) if (Number(t[1]) % 4 !== 0 || Number(t[1]) > 48) hits['px-отступы вне шкалы 4px'].push([line(x.index), t[0]]);
    }
  }

  console.log(`\n${rel}`);
  for (const [k, v] of Object.entries(hits)) {
    console.log(`  ${k.padEnd(28)} ${v.length}`);
    if (verbose) for (const [l, t] of v) console.log(`      :${l}  ${t}`);
  }
  if (hits.hex.length || hits['font-size px'].length) failed = true;
  if (hits['var() без определения'].length) failed = true;
}
console.log(failed ? '\nПРОВАЛ: остались hex / font-size px / неопределённые переменные (см. -v)' : '\nOK: hex и font-size px вне :root нет');
process.exitCode = failed ? 1 : 0;
