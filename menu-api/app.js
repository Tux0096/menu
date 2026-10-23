// .env загружается первым импортом: модули читают настройки при загрузке (импорты в ESM выполняются раньше кода файла)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { existsSync } from 'fs';
import { httpError, securityHeaders, sendError } from './lib/http.js';
import { ADMIN_WEB_DIR, MEDIA_DIR, WEB_DIR } from './lib/paths.js';
import { guestPage } from './lib/guest-page.js';
import { isIikoDemo } from './iiko-client.js';
import { isLlmEnabled } from './services/ai-llm.js';
import { startBackgroundJobs } from './services/background-jobs.js';
import publicRoutes from './routes/public.js';
import iikoWebhookRoutes from './routes/iiko-webhook.js';
import guestRoutes from './routes/guest.js';
import staffRoutes from './routes/staff.js';
import adminRoutes from './routes/admin.js';
import legacyRoutes from './routes/legacy.js';

const app = express();
const PORT = process.env.PORT || 3101;

// nginx на этом же сервере: доверяем только ему — req.ip берётся из последнего адреса, который добавил nginx,
// а не из подставленного клиентом X-Forwarded-For (иначе лимиты на PIN и вход обходились бы сменой заголовка)
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(securityHeaders);
// CORS: браузер пускает к API только наши сайты (меню, админка, официант); запросы без Origin (приложение, сервер) — как раньше.
// Свой список — CORS_ORIGINS через запятую
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsAllowed = (origin) => !origin
  || CORS_ORIGINS.includes(origin)
  || /^https:\/\/([a-z0-9-]+\.)*franchise-fuji\.ru$/i.test(origin)
  || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
app.use(cors({
  origin: (origin, cb) => cb(null, corsAllowed(origin)),
  exposedHeaders: ['X-Staff-Token'], // новый токен персонала (скользящий вход) читает приложение официанта
}));
app.use(express.json({ limit: '1mb' }));

// Маршруты API по областям: публичное, вебхуки iiko, гость, персонал, админка
app.use(publicRoutes);
app.use(iikoWebhookRoutes);
app.use(guestRoutes);
app.use(staffRoutes);
app.use(adminRoutes);

// Совместимость со старым фронтом
app.use(legacyRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ── Фронт: гостевое меню и терминал персонала ───────────────────────────────

app.use('/media', express.static(MEDIA_DIR, { maxAge: '30d', immutable: true }));
app.use('/staff', express.static(join(WEB_DIR, 'staff'), { index: 'index.html' }));
// Админка: файлы сборки с хэшем в имени (/admin/_nuxt/…) кэшируются навсегда, страница — без кэша;
// любой путь внутри /admin/ отдаёт SPA (роутинг делает Nuxt). Сборки ещё нет — старый терминал /staff/.
app.use('/admin', express.static(ADMIN_WEB_DIR, {
  index: false,
  redirect: false,
  setHeaders: (res, file) => res.set('Cache-Control', file.includes('/_nuxt/') ? 'public, max-age=31536000, immutable' : 'no-cache'),
}));
app.get(['/admin', '/admin/*'], (req, res) => {
  const page = ['200.html', 'index.html'].find((f) => existsSync(join(ADMIN_WEB_DIR, f)));
  if (!page) return res.redirect('/staff/');
  if (req.path === '/admin') return res.redirect('/admin/');
  res.set('Cache-Control', 'no-cache');
  return res.sendFile(join(ADMIN_WEB_DIR, page));
});
app.get('/waiter', (req, res) => res.redirect('/staff/'));
// Иконки и картинки интерфейса меняются только с релизом — телефон гостя хранит их неделю
app.use('/ui', express.static(join(WEB_DIR, 'guest', 'ui'), { maxAge: '7d', fallthrough: false }));
const guest = guestPage(join(WEB_DIR, 'guest'));
app.get(['/', '/index.html'], guest.page);
app.get(['/app.js', '/app.css'], guest.asset);
// Service worker гостя (только Web Push): без кэша, чтобы браузер сразу видел новую версию; область — всё меню
app.get('/sw.js', (req, res, next) => {
  res.set({ 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' });
  res.type('application/javascript').sendFile(join(WEB_DIR, 'guest', 'sw.js'), (err) => err && next(err));
});
app.use(express.static(join(WEB_DIR, 'guest'), { index: false }));
// Политика обработки ПДн и пользовательские условия: статические страницы (не SPA), открываются по ссылке из формы входа
app.get(['/privacy', '/terms'], (req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').sendFile(join(WEB_DIR, 'guest', `${req.path.slice(1)}.html`), (err) => err && next(err));
});
app.get('*', guest.page);

// Последний обработчик ошибок: битый JSON, слишком большой файл и т. п. — JSON без стека и путей сервера
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => sendError(res, err.type === 'entity.parse.failed' ? httpError(400, 'Неверный формат запроса') : err, req));

startBackgroundJobs();

app.listen(PORT, () => {
  console.log(`Menu API running on http://localhost:${PORT} (iiko: ${isIikoDemo() ? 'demo' : 'live'}, AI: ${isLlmEnabled() ? 'OpenRouter' : 'instant'})`);
});
