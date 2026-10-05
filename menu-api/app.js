import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { existsSync } from 'fs';
import { httpError, securityHeaders, sendError } from './lib/http.js';
import { ADMIN_WEB_DIR, MEDIA_DIR, WEB_DIR } from './lib/paths.js';
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
app.use(cors());
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
app.use(express.static(join(WEB_DIR, 'guest'), { index: 'index.html' }));
app.get('*', (req, res) => res.sendFile(join(WEB_DIR, 'guest', 'index.html')));

// Последний обработчик ошибок: битый JSON, слишком большой файл и т. п. — JSON без стека и путей сервера
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => sendError(res, err.type === 'entity.parse.failed' ? httpError(400, 'Неверный формат запроса') : err, req));

startBackgroundJobs();

app.listen(PORT, () => {
  console.log(`Menu API running on http://localhost:${PORT} (iiko: ${isIikoDemo() ? 'demo' : 'live'}, AI: ${isLlmEnabled() ? 'OpenRouter' : 'instant'})`);
});
