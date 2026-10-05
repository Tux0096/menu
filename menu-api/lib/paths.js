/** Каталоги, которые отдаёт сервер: фронт, загруженные медиа, сборка админки. */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WEB_DIR = process.env.MENU_WEB_DIR || join(ROOT, '..', 'menu-web');
// Фото блюд, загруженные в админке (вне git, переживают деплой)
export const MEDIA_DIR = process.env.MEDIA_DIR || join(ROOT, 'media');
// Админка (Nuxt SPA, menu-admin): сборку кладёт деплой (вне git); локально — menu-admin/.output/public
export const ADMIN_WEB_DIR = process.env.ADMIN_WEB_DIR || join(ROOT, '..', 'menu-admin', '.output', 'public');
