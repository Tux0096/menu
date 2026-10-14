/**
 * Страница гостевого меню с версией файлов: /app.js?v=<хэш>, /app.css?v=<хэш>.
 * Телефон гостя хранит app.js и app.css год без перепроверки, а после выкладки
 * получает новый адрес и скачивает новую версию. Хэш пересчитывается, когда файлы меняются.
 */
import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

export function guestPage(guestDir) {
  const files = ['index.html', 'app.js', 'app.css'].map((f) => join(guestDir, f));
  let cache = { stamp: '', html: '', versions: {} };
  const build = () => {
    const stamp = files.map((f) => statSync(f).mtimeMs).join('|');
    if (stamp === cache.stamp) return cache;
    const versions = {};
    for (const name of ['app.js', 'app.css']) {
      versions[name] = createHash('sha1').update(readFileSync(join(guestDir, name))).digest('hex').slice(0, 10);
    }
    const html = readFileSync(join(guestDir, 'index.html'), 'utf8')
      .replace('href="/app.css"', `href="/app.css?v=${versions['app.css']}"`)
      .replace('src="/app.js"', `src="/app.js?v=${versions['app.js']}"`);
    cache = { stamp, html, versions };
    return cache;
  };
  return {
    /** HTML страницы: всегда свежий (no-cache), ссылки на файлы — с версией */
    page(req, res) {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(build().html);
    },
    /** app.js / app.css: с совпавшей версией — на год, без версии — с перепроверкой */
    asset(req, res, next) {
      const name = req.path.slice(1);
      const versioned = req.query.v && req.query.v === build().versions[name];
      res.sendFile(join(guestDir, name), { maxAge: versioned ? '365d' : 0, immutable: Boolean(versioned) }, (err) => err && next(err));
    },
  };
}
