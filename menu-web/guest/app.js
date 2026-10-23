/* Фуджи QR-меню: гость за столом. Без сборки, без зависимостей. */
/* Ошибки браузера → POST /api/v1/client-errors (в журнал сервера; без ПДн, не больше 5 за сеанс) */
(() => {
  let sent = 0;
  const send = (message, source, line, col, stack) => {
    if (sent++ >= 5) return;
    try {
      fetch('/api/v1/client-errors', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: 'guest', message: String(message || '').slice(0, 300), source: String(source || '').slice(0, 200), line, col, stack: String(stack || '').slice(0, 1200) }) }).catch(() => {});
    } catch { /* мониторинг не должен ломать страницу */ }
  };
  window.addEventListener('error', (e) => send(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => send(e.reason && e.reason.message || e.reason, '', 0, 0, e.reason && e.reason.stack));
})();
(() => {
  'use strict';

  // ── Утилиты ────────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} ₽`;
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(`fm:${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`fm:${k}`, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(`fm:${k}`); } catch { /* noop */ } },
  };
  const plural = (n, [one, few, many]) => {
    const m10 = n % 10; const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>',
    home: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4.5 12.5L14 4.5l9.5 8V23a1 1 0 01-1 1H17v-7h-6v7H5.5a1 1 0 01-1-1V12.5z"/></svg>',
    bell: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19.5V12a7 7 0 0114 0v7.5l2 2.5H5l2-2.5zM11.5 24.5a2.5 2.5 0 005 0"/></svg>',
    cart: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h3.2l2.6 13h12.6l2.6-9.5H7.7"/><circle cx="10.5" cy="22.5" r="1.8"/><circle cx="19.5" cy="22.5" r="1.8"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  // Метки блюд (задаёт маркетинг в админке; у блюда их может быть несколько — через запятую)
  const BADGES = {
    mild: 'Остро', spicy: 'Остро', new: 'Новинка', hit: 'Хит', kids: 'Детям', gift: 'Подарок', nosugar: 'Без сахара',
    veg: 'Вег', sale: 'Выгодно', chef: 'Шеф рекомендует',
  };
  const BADGE_ICON = {
    mild: 'pepper-green', spicy: 'pepper-red', new: 'new', hit: 'hit', kids: 'child', gift: 'gift', nosugar: 'no-sugar',
  };
  const badgeList = (p) => String(p.badge || '').split(',').map((b) => b.trim()).filter(Boolean);
  const UI = (f) => `/ui/${f}`;
  /** Метки на фото: в списке — только значки, в карточке блюда — значок и текст. */
  function tagsHtml(p, { text = false } = {}) {
    const list = badgeList(p);
    if (!list.length) return '';
    return `<div class="tags ${text ? 'tags--text' : ''}">${list.map((b) => {
      const icon = BADGE_ICON[b];
      return `<span class="tag-chip" data-badge="${esc(b)}" title="${esc(BADGES[b] || b)}">${icon ? `<img src="${UI(`tags/${icon}.svg`)}" alt="">` : ''}${text || !icon ? `<span>${esc(BADGES[b] || b)}</span>` : ''}</span>`;
    }).join('')}</div>`;
  }
  // Картинки разделов в шторке «Меню»: своя из админки, иначе стандартная по названию раздела
  const CAT_IMAGES = [['новин', 'novinki'], ['хит', 'hity'], ['ролл', 'rolly'], ['суш', 'rolly'], ['сет', 'rolly'], ['пицц', 'pizza'],
    ['бенто', 'bento'], ['wok', 'wok'], ['вок', 'wok'], ['лапш', 'wok'], ['бургер', 'burgery'], ['поке', 'poke'], ['салат', 'poke'],
    ['суп', 'supy'], ['горяч', 'goryachee'], ['закуск', 'zakuski'], ['десерт', 'deserty'], ['напит', 'napitki'], ['бар', 'napitki'],
    ['лимонад', 'napitki'], ['чай', 'napitki'], ['кофе', 'napitki'], ['соус', 'sousy']];
  const catImage = (g) => {
    if (g.image) return imgSrc(g.image, 200);
    const name = String(g.name || '').toLowerCase();
    const hit = CAT_IMAGES.find(([k]) => name.includes(k));
    return hit ? UI(`cats/${hit[1]}.webp`) : null;
  };
  /** Вес порции в граммах (для КБЖУ «на блюдо»): «235 г», «0,3 кг»; иначе null. */
  const gramsOf = (w) => {
    const m = String(w || '').replace(',', '.').match(/([\d.]+)\s*(кг|г|гр|мл|л)?/i);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!n) return null;
    const unit = (m[2] || 'г').toLowerCase();
    return unit === 'кг' || unit === 'л' ? n * 1000 : n;
  };
  const GROUP_EMOJI = [['ролл', '🍣'], ['суш', '🍣'], ['сет', '🍱'], ['пицц', '🍕'], ['суп', '🍜'], ['wok', '🥡'], ['лапш', '🍜'],
    ['салат', '🥗'], ['закуск', '🥟'], ['десерт', '🍰'], ['напит', '🥤'], ['бар', '🍸'], ['чай', '🍵'], ['кофе', '☕'],
    ['бургер', '🍔'], ['поке', '🥙'], ['соус', '🥢'], ['горяч', '🔥']];
  const emojiFor = (p) => {
    const hay = `${p.parentGroupName || ''} ${p.name || ''}`.toLowerCase();
    return (GROUP_EMOJI.find(([k]) => hay.includes(k)) || [null, '🍽'])[1];
  };
  // Фото из iiko — через /img: сервер отдаёт WebP нужной ширины (в 20–50 раз легче оригинала)
  // Фото iiko и загруженные в админке (/media) идут через /img: сервер отдаёт WebP нужной ширины
  const proxied = (src) => /^https?:\/\//.test(src) || /^\/media\//.test(src);
  const imgSrc = (src, w = 480) => {
    if (!src) return null;
    if (proxied(src)) return `/img?w=${w}&u=${encodeURIComponent(src)}`;
    if (src.startsWith('/')) return src;
    return `/${src}`;
  };
  /**
   * Размеры фото под экран (srcset): телефон сам берёт нужную ширину — чётко на экранах 3x и легко на обычных.
   * Список: клетка 144 px → 320/480; большая карточка и фото блюда — во всю ширину → 720/960/1280; корзина — 48 px.
   */
  let eagerBudget = 0; // первые фото меню грузятся сразу, остальные — по мере прокрутки
  const imgHtml = (p, cls = 'dish__img', w = 320) => {
    const src = imgSrc(p.image, w);
    const hero = cls === 'product-hero';
    const wide = w >= 720;
    const thumb = cls === 'cart-line__img';
    const eager = hero || (cls === 'dish__img' && eagerBudget > 0 && eagerBudget--);
    const lazy = hero ? 'fetchpriority="high"' : eager ? 'loading="eager"' : 'loading="lazy"';
    const widths = thumb ? [160] : wide ? [720, 960, 1280] : [320, 480];
    const sizes = thumb ? '48px' : wide ? '(max-width: 480px) 100vw, 480px' : '(max-width: 370px) 120px, 144px';
    const srcset = p.image && proxied(p.image) ? ` srcset="${esc(widths.map((x) => `${imgSrc(p.image, x)} ${x}w`).join(', '))}" sizes="${sizes}"` : '';
    // «Живое» меню: короткое видео без звука по кругу; фото — обложка, пока видео грузится.
    // Видео не качается заранее (preload="none") и играет только на экране — список не подвисает.
    if (p.video) {
      return `<div class="${cls} has-video"><video src="${esc(p.video)}" ${src ? `poster="${esc(src)}"` : ''} muted loop playsinline
        preload="${hero ? 'auto' : 'none'}" data-live disablepictureinpicture disableremoteplayback aria-hidden="true"></video></div>`;
    }
    // Фото проявляется плавно один раз; загруженные и битые адреса запоминаются, чтобы перерисовка не мигала
    const ok = src && !IMG_BROKEN.has(src);
    // Карточка блюда: пока грузится большое фото, видно уже скачанное маленькое из списка (без белого экрана)
    const preview = hero && ok && proxied(p.image) ? ` style="--preview:url('${esc(imgSrc(p.image, 480))}')"` : '';
    return `<div class="${cls}${preview ? ' has-preview' : ''}"${preview}>${ok ? `<img src="${esc(src)}"${srcset} alt="" ${lazy} decoding="async" class="${IMG_LOADED.has(src) ? 'is-loaded' : ''}" onload="fujiImgLoaded(this)" onerror="fujiImgFailed(this)">` : emojiFor(p)}</div>`;
  };
  const IMG_LOADED = new Set();
  const IMG_BROKEN = new Set();
  window.fujiImgLoaded = (img) => { IMG_LOADED.add(img.getAttribute('src')); img.classList.add('is-loaded'); };
  window.fujiImgFailed = (img) => {
    IMG_BROKEN.add(img.getAttribute('src'));
    const box = img.parentNode; img.remove();
    if (box && !box.textContent) box.textContent = '🍽';
  };
  // Играют только видео, которые видно на экране
  const liveSeen = new WeakSet();
  const liveObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) { v.muted = true; v.play().catch(() => {}); } else if (!v.paused) v.pause();
    }
  }, { rootMargin: '120px 0px', threshold: 0.2 }) : null;
  function watchLiveVideos(root = document) {
    for (const v of root.querySelectorAll('video[data-live]')) {
      if (liveSeen.has(v)) continue;
      liveSeen.add(v);
      v.muted = true;
      if (liveObserver) liveObserver.observe(v); else v.play().catch(() => {});
    }
  }

  // ── Состояние ──────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  // ?reset=1 — начать «с чистого листа» (для демонстрации): выйти, забыть стол и корзину
  if (params.has('reset') || params.has('logout')) {
    try { Object.keys(localStorage).filter((k) => k.startsWith('fm:')).forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
    params.delete('reset'); params.delete('logout');
    history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
  }
  const S = {
    token: store.get('token'),
    guest: store.get('guest'),
    restaurant: params.get('restaurant') || params.get('r') || store.get('restaurant') || null,
    table: params.get('table') || params.get('tbl') || store.get('table') || null,
    // Подпись стола из QR (k): без неё за чужой стол не сесть, когда ресторан включил подписанные QR
    qrKey: params.get('table') ? params.get('k') : store.get('qrKey'),
    session: null,
    sessionId: store.get('sessionId'),
    config: null,
    catalog: null,
    cart: store.get('cart', {}), // productId -> { qty, product }
    tab: 'menu',
    ai: { query: '', results: store.get('aiResults', null), loading: false, error: null, engine: null },
    menu: { search: '', cat: null, section: 'kitchen' },
    cartDirty: false,
    changedSinceSubmit: store.get('changedSinceSubmit', true),
    aiFresh: false,
    nutri: '100', // КБЖУ в карточке блюда: '100' — на 100 г, 'dish' — на порцию
    helpUntil: 0, // официанта позвали — в шапке «Помощь», пока он идёт
    offline: typeof navigator !== 'undefined' && navigator.onLine === false,
  };
  const qrChanged = (params.get('table') && params.get('table') !== store.get('table'))
    || (params.get('restaurant') && params.get('restaurant') !== store.get('restaurant'));
  if (S.table) store.set('table', S.table);
  if (S.qrKey) store.set('qrKey', S.qrKey); else store.del('qrKey');
  if (S.restaurant) store.set('restaurant', S.restaurant);
  if (qrChanged) { S.sessionId = null; S.cart = {}; store.del('sessionId'); store.del('cart'); store.del('aiResults'); S.ai.results = null; }
  if (params.has('table') || params.has('restaurant')) {
    history.replaceState(null, '', location.pathname + (params.get('fujiToken') ? `?fujiToken=${encodeURIComponent(params.get('fujiToken'))}` : ''));
  }

  // ── API ────────────────────────────────────────────────────
  async function api(method, path, body, { timeout = 15000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(S.token ? { 'X-Guest-Token': S.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || `Ошибка ${res.status}`);
        err.status = res.status; err.code = data.code;
        if (res.status === 401 && data.code === 'GUEST_AUTH_REQUIRED') logout();
        throw err;
      }
      return data;
    } catch (e) {
      if (e.name === 'AbortError') { const err = new Error('Нет ответа от сервера — проверьте интернет'); err.network = true; throw err; }
      if (e instanceof TypeError) { const err = new Error('Нет соединения с интернетом'); err.network = true; throw err; }
      throw e;
    } finally { clearTimeout(t); }
  }

  let toastTimer;
  function toast(text, isError = false, icon = null) {
    const el = $('#toast');
    el.innerHTML = `${icon ? `<img src="${UI(icon)}" alt="">` : ''}<span>${esc(text)}</span>`;
    el.classList.toggle('is-error', isError);
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2800);
  }

  // ── Корзина ────────────────────────────────────────────────
  /*
   * Строка корзины: { key, qty, product, course, sizeId, mods: [{ id, groupId, amount }], options, price }.
   * Блюдо без выбора — ключ = ID блюда; с размером/модификаторами — ключ варианта (как на сервере:
   * «iikoId|sizeId|id:кол-во,…»), одно блюдо с разным выбором — разные строки.
   */
  const lineKey = (l) => l.key || String(l.product.id);
  const unitPrice = (l) => Number(l.price ?? l.product.price) || 0;
  const cartLines = () => Object.entries(S.cart).filter(([, l]) => l.qty > 0).map(([key, l]) => ({ ...l, key }));
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => cartLines().reduce((s, l) => s + l.qty * unitPrice(l), 0);
  // За столом может быть несколько гостей: корзина гостя — только его позиции
  const myItems = (session = S.session) => (session?.items || [])
    .filter((i) => (i.guestId || null) === (S.guest?.id || null));
  /** Ключ строки заказа с сервера — тот же, что у строки корзины. */
  const itemKey = (i) => (i.sizeId || i.modifiers?.length ? String(i.variantKey) : String(i.productId || i.iikoProductId));
  const lockedQty = (key) => myItems()
    .filter((i) => i.isLocked && (itemKey(i) === String(key) || (!i.sizeId && !i.modifiers?.length && String(i.iikoProductId) === String(key))))
    .reduce((s, i) => s + i.quantity, 0);
  const pendingCount = () => cartLines().reduce((s, l) => s + Math.max(0, l.qty - lockedQty(l.key)), 0);
  /** Сколько штук блюда в корзине — по всем вариантам (для отметки на карточке в меню). */
  const qtyOf = (p) => cartLines().filter((l) => String(l.product.id) === String(p.id)).reduce((n, l) => n + l.qty, 0);
  /** У блюда есть выбор (размер или модификаторы) — добавляется из карточки блюда. */
  const hasOptions = (p) => Boolean(p?.sizes?.length > 1 || p?.modifierGroups?.length || p?.sizes?.some((z) => z.groups?.length));
  // Визит окончен: оплачен или официант закрыл стол — заказывать в него нельзя
  const visitOver = (s = S.session) => Boolean(s && (s.isPaid || s.status === 'closed'));
  const isStopped = (p) => p.isInStopList || (S.catalog?.stopList || []).includes(String(p.id));

  function findProduct(id) {
    return (S.catalog?.products || []).find((p) => String(p.id) === String(id) || String(p.iikoId) === String(id));
  }

  // ── Алкоголь: 18+ и правила точки ──────────────────────────
  // Сервер помечает позиции (isAlcohol) и отдаёт правила точки (catalog.alcohol: часы, текст, нужно ли подтверждение 18+);
  // он же отклоняет заказ вне правил (409) — здесь только понятный интерфейс.
  const alco = () => S.catalog?.alcohol || null;
  const isAlco = (p) => Boolean(p && (p.isAlcohol || findProduct(p.id)?.isAlcohol));
  /** Продаётся ли алкоголь сейчас: флаг каталога, а после времени смены (nextChangeAt) — обратный, пока каталог не обновился. */
  function alcoOpen() {
    const a = alco();
    if (!a) return true;
    if (!a.enabled) return false;
    return a.nextChangeAt && Date.now() >= Date.parse(a.nextChangeAt) ? !a.open : a.open !== false;
  }
  const alcoClosedText = () => {
    const a = alco();
    if (a && !a.enabled) return 'На этой точке алкоголь не продаётся';
    return a?.from ? `Алкоголь продаём с ${a.from} до ${a.to}` : 'Алкоголь сейчас не продаётся';
  };
  // Подтверждение 18+ помнится на визит: sessionStorage по номеру визита (новый визит — спросим снова)
  const ageKey = () => `fm:age18:${S.sessionId || S.restaurant || ''}`;
  const ageOk = () => {
    if (S.ageSession && S.ageSession === (S.sessionId || '-')) return true;
    try { return sessionStorage.getItem(ageKey()) === '1'; } catch { return false; }
  };
  const ageRemember = () => {
    S.ageSession = S.sessionId || '-';
    try { sessionStorage.setItem(ageKey(), '1'); } catch { /* приватный режим: помним до перезагрузки страницы */ }
  };
  const needAge = () => Boolean(alco()?.requireAgeConfirm) && !ageOk();
  /** Метка 18+ на фото блюда в списке. */
  const alcoTag = (p) => (isAlco(p) ? '<span class="tag-18" title="Только с 18 лет">18+</span>' : '');
  /** Правила точки в карточке блюда; вне часов — причина, почему добавить нельзя. */
  function alcoNoteHtml(p) {
    if (!isAlco(p) || !alco()) return '';
    const open = alcoOpen();
    return `<div class="alco-note ${open ? '' : 'is-closed'}"><span class="tag-18 tag-18--big">18+</span>
      <div><div class="alco-note__rules">${esc(alco().rulesText || 'Алкоголь продаём только с 18 лет')}</div>
      ${open ? (alco().requireDocCheck ? '<div class="alco-note__sub">Официант может попросить документ</div>' : '') : `<div class="alco-note__sub">${esc(alcoClosedText())}</div>`}</div></div>`;
  }
  /**
   * Заглушка «Вам есть 18 лет?» поверх всего (в том числе поверх карточки блюда — её не закрываем).
   * Висит, пока гость не ответит: тап мимо окна, Esc и прокрутка под ним не работают.
   * Да — запоминаем на визит и вызываем onYes; Нет — ничего не добавляем (onNo — убрать уже лежащий в корзине алкоголь).
   */
  function openAgeModal(onYes, onNo = null) {
    if ($('#age-modal')) return; // уже спрашиваем — второе окно не открываем
    const el = document.createElement('div');
    el.id = 'age-modal';
    el.className = 'age-modal';
    el.innerHTML = `<div class="age-modal__box" role="alertdialog" aria-modal="true" aria-labelledby="age-title">
      <div class="age-modal__badge">18+</div>
      <h2 id="age-title">Вам есть 18 лет?</h2>
      <p>${esc(alco()?.rulesText || 'Алкоголь продаём только совершеннолетним.')}</p>
      ${alco()?.requireDocCheck ? '<p class="age-modal__doc">Официант может попросить документ.</p>' : ''}
      <button class="btn btn--dark btn--center" data-age="yes">Да, мне есть 18</button>
      <button class="btn btn--outline btn--center" data-age="no">Нет</button></div>`;
    // Esc не закрывает ни окно, ни шторку под ним; Tab не уводит фокус из окна
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); }
      if (e.key === 'Tab') {
        const btns = [...el.querySelectorAll('[data-age]')];
        const i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      }
    };
    const scrollY = document.documentElement.style.overflow;
    const done = (yes) => {
      el.remove();
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.style.overflow = scrollY;
      if (yes) { ageRemember(); onYes?.(); } else { toast('Алкоголь можно заказать только с 18 лет', true); onNo?.(); }
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-age]');
      if (b) done(b.dataset.age === 'yes');
      // тап мимо окна — окно на месте, слегка «вздрагивает»: нужен ответ
      else if (e.target === el) { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); }
    });
    el.addEventListener('touchmove', (e) => { if (e.target === el) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(el);
    el.querySelector('[data-age="yes"]').focus();
  }
  /** Убрать из корзины неотправленный алкоголь (продажа закрылась или гость ответил «Нет»). */
  function dropAlcoLines() {
    for (const [k, l] of Object.entries(S.cart)) {
      if (!isAlco(l.product)) continue;
      const keep = lockedQty(k);
      if (keep > 0) S.cart[k] = { ...l, qty: keep }; else delete S.cart[k];
    }
    persistCart();
  }
  /**
   * Ответ сервера про алкоголь: true — обработали. Нет подтверждения 18+ (корзина с прошлого визита): спрашиваем, «Да» — retry,
   * «Нет» — алкоголь из корзины убираем. Продажа закрылась: алкоголь убираем, остальную корзину сохраняем (сама не уходит).
   */
  function alcoServerError(e, retry) {
    const resave = () => { render(); if (S.sessionId) scheduleCartSave(); };
    if (e.code === 'ALCO_AGE_REQUIRED') {
      openAgeModal(retry, () => { dropAlcoLines(); resave(); });
      return true;
    }
    if (e.code === 'ALCO_CLOSED') {
      dropAlcoLines();
      toast(e.message, true);
      resave();
      return true;
    }
    return false;
  }

  // ── Время показа разделов («Завтраки до 12:00») ──────────────
  // Сервер отдаёт у раздела window { from, until, tz, text }; открыт ли он сейчас, считаем здесь по времени точки,
  // чтобы кэш каталога не задерживал скрытие. Заказ позиции закрытого раздела сервер всё равно отклонит (409).
  function windowOpen(w, now = new Date()) {
    if (!w) return true;
    let m;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: w.tz || 'Europe/Samara', hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(now);
      m = Number(parts.find((x) => x.type === 'hour').value) * 60 + Number(parts.find((x) => x.type === 'minute').value);
    } catch { return !w.closedNow; }
    const t = (v) => (v ? Number(v.split(':')[0]) * 60 + Number(v.split(':')[1]) : null);
    const f = t(w.from); const u = t(w.until);
    if (f != null && u != null) return f < u ? m >= f && m < u : m >= f || m < u;
    if (f != null) return m >= f;
    return u == null || m < u;
  }
  /** ID разделов, закрытых по времени прямо сейчас. */
  const closedGroupIds = () => new Set((S.catalog?.groups || []).filter((g) => g.window && !windowOpen(g.window)).map((g) => String(g.id)));
  /** Раздел, из-за которого блюдо сейчас нельзя заказать: все места блюда (раздел и копии) закрыты по времени. */
  function hoursGroupOf(p) {
    const closed = closedGroupIds();
    if (!closed.size || !p) return null;
    const same = (S.catalog.products || []).filter((x) => String(x.id) === String(p.id));
    if (!same.length || same.some((x) => !closed.has(String(x.parentGroup)))) return null;
    return (S.catalog.groups || []).find((g) => String(g.id) === String(same[0].parentGroup)) || null;
  }

  /** Корзина = сервер (источник правды) ⊕ несохранённые локальные правки. */
  function cartFromSession(session) {
    const next = {};
    for (const it of myItems(session)) {
      const key = itemKey(it);
      const variant = Boolean(it.sizeId || it.modifiers?.length);
      const pid = String(it.productId || it.iikoProductId);
      const product = findProduct(pid) || { id: pid, iikoId: it.iikoProductId, name: it.name, price: it.price };
      if (!next[key]) {
        next[key] = { key, qty: 0, product, course: null, ...(variant ? {
          sizeId: it.sizeId || null, mods: (it.modifiers || []).map((m) => ({ id: m.id, groupId: m.groupId ?? null, amount: m.amount })),
          options: it.options || null, price: it.price,
        } : {}) };
      }
      next[key].qty += it.quantity;
      if (!it.isLocked && it.course) next[key].course = it.course;
    }
    return next;
  }

  function persistCart() { store.set('cart', S.cart); }

  /**
   * Изменить количество: блюда без выбора — по ID; варианта — по выбору sel ({ sizeId, mods, options, price })
   * или по ключу уже существующей строки (key).
   */
  function changeQty(product, delta, { sel = null, key: lineK = null } = {}) {
    // Меню открыто без стола/входа — сначала стол и телефон, потом положим блюдо в корзину
    if (delta > 0 && !S.session) { openSeatSheet(() => changeQty(product, delta, { sel, key: lineK })); return; }
    if (visitOver()) { toast(S.session.isPaid ? 'Счёт уже оплачен. Отсканируйте QR, чтобы начать новый заказ' : 'Визит закрыт. Отсканируйте QR, чтобы начать новый заказ'); return; }
    const key = lineK || (sel ? sel.key : String(product.id));
    const line = S.cart[key] || { key, qty: 0, product, ...(sel ? { sizeId: sel.sizeId, mods: sel.mods, options: sel.options, price: sel.price } : {}) };
    const next = line.qty + delta;
    if (delta > 0 && isStopped(product)) { toast('Эта позиция сейчас недоступна', true); return; }
    if (delta > 0 && isAlco(product)) {
      if (!alcoOpen()) { toast(alcoClosedText(), true); return; }
      // Первый алкоголь за визит — «Вам есть 18 лет?»; ответ «Да» добавляет блюдо
      if (needAge()) { openAgeModal(() => { changeQty(product, delta, { sel, key: lineK }); S.productRedraw?.(); }); return; }
    }
    // Ограниченный остаток в iiko: больше, чем осталось, официант на кухню не отправит
    const left = Number((findProduct(product.id) || product).stopBalance) || 0;
    if (delta > 0 && left && next - lockedQty(key) > left) { toast(`Осталось только ${left} шт.`, true); return; }
    if (delta < 0 && next < lockedQty(key)) { toast('Это блюдо уже готовится — убрать можно через официанта', true); return; }
    if (next <= 0) delete S.cart[key]; else S.cart[key] = { ...line, key, qty: next, product };
    persistCart();
    S.changedSinceSubmit = true; store.set('changedSinceSubmit', true);
    if (delta > 0 && S.ai.query && S.tab === 'ai') {
      api('POST', '/api/v1/ai/feedback', { query: S.ai.query, productId: product.id }).catch(() => {});
    }
    scheduleCartSave();
    render();
  }

  let saveTimer;
  // Версия корзины: ответ сервера на старое сохранение или опрос не перетирает свежие нажатия гостя
  let cartVer = 0;
  function scheduleCartSave() {
    S.cartDirty = true;
    cartVer += 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCart, 700);
  }
  const payloadItems = () => cartLines().map((l) => ({
    productId: l.product.id, iikoProductId: l.product.iikoId || l.product.id, name: l.product.name, price: unitPrice(l), quantity: l.qty,
    course: l.course || null,
    ...(l.sizeId || l.mods?.length ? { sizeId: l.sizeId || null, modifiers: l.mods || [] } : {}),
  }));
  async function saveCart() {
    if (!S.sessionId) return;
    const v = cartVer;
    try {
      const session = await api('POST', '/api/v1/table-order/cart', { sessionId: S.sessionId, items: payloadItems(), ageConfirmed: ageOk() });
      if (v === cartVer) S.cartDirty = false;
      applySession(session, { keepCart: true });
      render();
    } catch (e) {
      if (e.network) { toast('Корзина сохранена на телефоне — отправим, когда появится связь', true); return; }
      // Алкоголь без подтверждения 18+ или вне часов продажи: спрашиваем / убираем из корзины и сохраняем остальное
      if (alcoServerError(e, scheduleCartSave)) return;
      // Сервер не принял корзину (блюдо уже готовится, визит закрыт, позицию нельзя заказать):
      // показываем причину и берём корзину с сервера — иначе опрос статусов встал бы
      S.cartDirty = false;
      toast(e.message, true);
      await refreshSession(true);
    }
  }
  /** Несохранённая корзина уходит на сервер, как только появилась связь. */
  function flushCart() { if (S.cartDirty && S.sessionId) { clearTimeout(saveTimer); saveCart(); } }

  // ── Сессия стола ───────────────────────────────────────────
  function applySession(session, { keepCart = false } = {}) {
    const prevStatus = S.session?.workflowStatus;
    S.session = session;
    S.sessionId = session.sessionId;
    store.set('sessionId', S.sessionId);
    if (!keepCart && !S.cartDirty) { S.cart = cartFromSession(session); persistCart(); }
    if (prevStatus && prevStatus !== session.workflowStatus) {
      const msg = {
        waiter_review: 'Официант уточняет заказ', in_production: 'Заказ передан на кухню 👨‍🍳',
        paid: 'Счёт оплачен. Спасибо!',
      }[session.workflowStatus];
      if (msg) toast(msg);
    }
    announceWaiter(session);
    pushPromptUpdate(session);
  }

  /** Имя официанта для гостя — первое слово («Анна Иванова» → «Анна») */
  // Наш официант (взял стол на of.) или официант, открывший заказ на кассе iiko
  const waiterFirstName = (s) => String(s?.waiterName || s?.iikoWaiterName || '').trim().split(/\s+/)[0] || '';
  /** Официант взял стол: тост «Ваш официант — Анна» один раз на визит и официанта (помним в localStorage) */
  function announceWaiter(session) {
    const name = String(session?.waiterName || '').trim().split(/\s+/)[0];
    if (!name || !session.waiterId) return;
    const key = `waiter:${session.sessionId}`;
    if (store.get(key) === session.waiterId) return;
    // Первое открытие уже назначенного стола тоже объявляем — гость мог зайти позже; повтор после перезагрузки страницы не показываем
    store.set(key, session.waiterId);
    toast(`Ваш официант — ${name}, он(а) скоро подойдёт`, false, 'status-help.svg');
  }
  const waiterLine = (s) => (waiterFirstName(s) && !visitOver(s) ? `<div class="waiter-line">Ваш официант: <b>${esc(waiterFirstName(s))}</b></div>` : '');

  // ── Web Push: «Ваш стол обслуживает официант …», «Ваш заказ готов» ──
  // Разрешение просим только по нажатию на плашку. Нет PushManager (например, iOS Safari не из «Домой») — плашки нет. Без SW меню работает как раньше.
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64ToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
  async function pushSubscribe(session) {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await api('GET', '/api/v1/push/vapid-public-key');
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    }
    await api('POST', '/api/v1/table-order/push-subscribe', { sessionId: session.sessionId, subscription: sub.toJSON() });
    store.set(`pushOn:${session.sessionId}`, true);
  }
  function pushPromptHide() { $('#push-prompt')?.remove(); }
  /** Вызывается при обновлении сессии стола: покажет плашку или тихо привяжет уже разрешённые уведомления к новому визиту */
  function pushPromptUpdate(session) {
    try {
      if (!pushSupported() || !session?.sessionId || visitOver(session)) { pushPromptHide(); return; }
      const sid = session.sessionId;
      if (Notification.permission === 'granted') {
        pushPromptHide();
        if (!store.get(`pushOn:${sid}`) && !S.pushBusy) {
          S.pushBusy = true;
          pushSubscribe(session).catch(() => {}).finally(() => { S.pushBusy = false; });
        }
        return;
      }
      if (Notification.permission === 'denied' || store.get(`pushNo:${sid}`)) { pushPromptHide(); return; }
      if ($('#push-prompt')) return;
      const el = document.createElement('div');
      el.id = 'push-prompt';
      el.className = 'push-prompt';
      el.innerHTML = `<div class="push-prompt__text"><b>Включить уведомления</b><span>Сообщим, кто вас обслуживает и когда блюда готовы</span></div>
        <button type="button" class="push-prompt__go">Включить</button><button type="button" class="push-prompt__x" aria-label="Не сейчас">×</button>`;
      el.querySelector('.push-prompt__x').onclick = () => { store.set(`pushNo:${sid}`, true); pushPromptHide(); };
      el.querySelector('.push-prompt__go').onclick = async () => {
        pushPromptHide();
        try {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') { store.set(`pushNo:${sid}`, true); return; }
          await pushSubscribe(S.session || session);
          toast('Уведомления включены');
        } catch { toast('Не удалось включить уведомления', true); }
      };
      document.body.appendChild(el);
    } catch { /* push необязателен */ }
  }

  /** Вход за стол. false — за столом уже сидят: показан вопрос «присоединиться?». */
  async function enterTable({ join = false, name = '', then = null } = {}) {
    const session = await api('POST', '/api/v1/table/enter', {
      restaurantSlug: S.restaurant, tableNumber: S.table, previousSessionId: S.sessionId, join, name, qrKey: S.qrKey || undefined,
    });
    // Имя, которое гость только что ввёл, главнее сохранённого для этого телефона
    if (session.joinRequired) { openJoinSheet({ ...session, guestName: name || session.guestName }, then); return false; }
    if (name && S.guest) { S.guest = { ...S.guest, name }; store.set('guest', S.guest); }
    const localCart = S.cart;
    const sameVisit = session.sessionId === S.sessionId;
    applySession(session);
    // Кейс 14: корзина, не успевшая уйти на сервер, восстанавливается с телефона
    if (sameVisit && Object.keys(localCart).length && !session.isPaid) {
      const serverCount = myItems(session).reduce((s, i) => s + i.quantity, 0);
      const localCount = Object.values(localCart).reduce((s, l) => s + l.qty, 0);
      if (localCount > serverCount) { S.cart = localCart; persistCart(); scheduleCartSave(); }
    }
    if (!sameVisit) { store.del('aiResults'); S.ai.results = null; S.changedSinceSubmit = true; store.set('changedSinceSubmit', true); }
    return true;
  }

  /** За столом уже есть гости или заказ: присоединиться к ним под своим именем или выбрать другой стол. */
  function openJoinSheet(info, then = null) {
    const who = (info.guests || []).join(', ');
    openSheet(`<form id="join-form">
      <h2>Стол №${esc(info.tableNumber)} уже занят</h2>
      <p class="sheet__hint" style="margin-top:0">${who ? `За столом: <b>${esc(who)}</b>` : 'За столом уже делают заказ'}${info.itemsCount ? ` · в заказе ${info.itemsCount} поз.` : ''}.<br>
        Присоединитесь к столу — ваши блюда будут отмечены вашим именем, официант принесёт их вам.</p>
      <label class="field"><span class="field__label">Ваше имя</span><input id="join-name" class="input" type="text" maxlength="40" autocomplete="given-name" placeholder="Как к вам обращаться" value="${esc(info.guestName || S.guest?.name || '')}"></label>
      <div class="auth__error" id="join-error"></div>
      <button class="btn btn--dark" type="submit"><span>Присоединиться к столу</span><span class="round-btn">${ICONS.arrowRight}</span></button>
      <button class="btn btn--outline" type="button" data-other-table><span>Это не мой стол</span></button>
    </form>`, (sheet) => {
      const input = $('#join-name', sheet);
      input.focus();
      $('[data-other-table]', sheet).addEventListener('click', () => {
        S.table = null; S.sessionId = null; store.del('sessionId'); store.del('table');
        S.changeTable = true; openSeatSheet(then);
      });
      $('#join-form', sheet).addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) { $('#join-error', sheet).textContent = 'Введите имя — официант будет знать, чьё блюдо'; return; }
        const btn = e.submitter || $('#join-form button[type=submit]', sheet);
        btn.disabled = true;
        try {
          await enterTable({ join: true, name });
          startPolling();
          closeSheet();
          toast(`Вы за столом №${S.table}`);
          render();
          if (then) then();
        } catch (e2) {
          btn.disabled = false;
          $('#join-error', sheet).textContent = e2.message;
        }
      });
    });
  }

  async function refreshSession(force = false) {
    if (!S.sessionId || (S.cartDirty && !force)) return;
    const v = cartVer;
    try {
      const session = await api('GET', `/api/v1/table/session/${S.sessionId}`);
      if (v !== cartVer || S.cartDirty) return; // гость успел изменить корзину — ответ устарел
      applySession(session);
      render();
    } catch (e) {
      if (e.status === 404 || e.code === 'NOT_AT_TABLE') { S.sessionId = null; S.session = null; store.del('sessionId'); await enterTable().catch(() => {}); render(); }
    }
  }

  let lastPing = 0;
  function pingActivity() {
    if (!S.sessionId || Date.now() - lastPing < 60000) return;
    lastPing = Date.now();
    api('POST', '/api/v1/table/activity', { sessionId: S.sessionId }).catch(() => {});
  }
  ['click', 'scroll', 'keydown'].forEach((ev) => addEventListener(ev, pingActivity, { passive: true }));

  // ── Весь экран ─────────────────────────────────────────────
  // В Telegram — развернуть Mini App на весь экран. В Chrome на Android сайт не может убрать адресную строку сам,
  // поэтому после первого касания включаем полноэкранный режим; если гость вышел из него — больше не навязываем.
  const tg = window.Telegram?.WebApp;
  if (tg) { try { tg.ready(); tg.expand(); tg.requestFullscreen?.(); tg.setHeaderColor?.('#F9F9F9'); tg.disableVerticalSwipes?.(); } catch { /* старый Telegram */ } }
  // Полный экран по умолчанию (Chrome на Android): браузер разрешает его только после касания, поэтому
  // разворачиваемся при первом касании гостя. Выход — стрелка «назад» в левом верхнем углу;
  // вышел — до следующего открытия меню больше не разворачиваем.
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const canFullscreen = !tg && !standalone && /Android/i.test(navigator.userAgent) && Boolean(document.documentElement.requestFullscreen);
  let fsDeclined = false;
  try { fsDeclined = sessionStorage.getItem('fsDeclined') === '1'; } catch { /* приватный режим */ }
  document.addEventListener('fullscreenchange', () => {
    document.documentElement.classList.toggle('is-fullscreen', Boolean(document.fullscreenElement));
    if (!document.fullscreenElement) { fsDeclined = true; try { sessionStorage.setItem('fsDeclined', '1'); } catch { /* приватный режим */ } }
    render();
  });
  const enterFullscreen = () => {
    if (!canFullscreen || fsDeclined || document.fullscreenElement) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  };
  addEventListener('touchend', enterFullscreen, { passive: true });
  addEventListener('click', enterFullscreen);
  function exitFullscreen() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  const fsBack = () => (document.fullscreenElement
    ? `<button class="back-btn" data-action="exit-fullscreen" aria-label="Выйти из полноэкранного режима">${ICONS.back}</button>`
    : '');

  // Виброотклик на нажатия (Android; на iPhone браузер вибрацию не поддерживает)
  let lastBuzz = 0;
  addEventListener('click', (e) => {
    if (!navigator.vibrate || Date.now() - lastBuzz < 60) return;
    const el = e.target.closest('button, a, [data-go], [data-cat], [data-chip], .dish, label');
    if (!el || el.disabled) return;
    lastBuzz = Date.now();
    try { navigator.vibrate(el.matches('[data-inc], .btn--dark, [data-action="submit"]') ? 25 : 12); } catch { /* нет вибро */ }
  }, { passive: true, capture: true });

  function logout() {
    S.token = null; S.guest = null;
    store.del('token'); store.del('guest');
    S.session = null; S.sessionId = null; store.del('sessionId');
    render();
  }

  // ── Статусы ────────────────────────────────────────────────
  // Пилюля в шапке (макет): тон и короткая подпись; полная — в подсказке
  const PILL = {
    welcome: ['welcome', 'status-welcome.svg', 'Добро пожаловать'],
    waiter: ['info', 'status-waiter.svg', 'Официант'],
    help: ['info', 'status-help.svg', 'Помощь'],
    cooking: ['cooking', 'status-cooking.svg', 'Готовится'],
    done: ['done', 'status-done.svg', 'Подано'],
    paid: ['done', 'status-done.svg', 'Оплачено'],
    closed: ['done', 'status-done.svg', 'Визит закрыт'],
    bill: ['info', 'status-waiter.svg', 'Несём счёт'],
    table: ['info', 'status-pin.svg', 'Выберите стол'],
    offline: ['error', 'status-disconnected.svg', 'Нет связи'],
  };
  function pillKind(s) {
    if (S.offline) return 'offline';
    if (!s) return 'table';
    if (s.isPaid || s.workflowStatus === 'paid') return 'paid';
    if (s.status === 'closed' || s.workflowStatus === 'closed') return 'closed';
    if (Date.now() < S.helpUntil) return 'help';
    if (s.workflowStatus === 'bill_requested') return 'bill';
    if (['cart_ready', 'waiter_review', 'reorder_pending'].includes(s.workflowStatus)) return 'waiter';
    if (s.kitchenStatus === 'Served' || s.kitchenStatus === 'CookingCompleted') return 'done';
    if (s.workflowStatus === 'in_production') return 'cooking';
    return 'welcome';
  }
  const shortRest = (name) => String(name || '').replace(/^Фуджи\s+/i, '');

  // ── Разметка: общие части ──────────────────────────────────
  function topbar() {
    const s = S.session;
    const kind = pillKind(s);
    const [tone, icon, label] = PILL[kind];
    const rest = shortRest(S.config?.restaurant?.name) || 'Ресторан не выбран';
    const table = s || S.table ? `Стол №${esc(S.table)}` : 'Стол не выбран';
    const pillAction = kind === 'table' ? 'data-action="seat"' : kind === 'help' ? 'data-action="call"' : 'data-go="order"';
    return `<header class="topbar">${fsBack()}
      <div class="topbar__main">
        <button class="topbar__rest" data-action="restaurant" aria-label="Сменить ресторан"><span>${esc(rest)}</span><img src="${UI('dropdown.svg')}" alt=""></button>
        <button class="topbar__table" data-action="${s ? 'place' : 'seat'}" aria-label="Выбрать стол">${table}</button>
      </div>
      <button class="status-pill" data-tone="${tone}" ${pillAction} title="${esc(s?.workflowLabel || label)}">
        <img src="${UI(icon)}" alt=""><span>${esc(kind === 'table' && S.table && !s ? 'Войти за стол'
          : ['waiter', 'welcome'].includes(kind) && waiterFirstName(s) ? `Официант ${waiterFirstName(s)}` : label)}</span></button>
    </header>`;
  }

  function nav() {
    const count = pendingCount();
    const item = (key, label, attr, iconName) => {
      const active = S.tab === key;
      const icon = key === 'ai' ? `<img src="${UI('nav-ai.webp')}" alt="" class="nav__orb">`
        : `<img src="${UI(`nav-${iconName}${active ? '-active' : ''}.svg`)}" alt="">`;
      return `<button class="nav__item ${active ? 'is-active' : ''}" ${attr} aria-label="${label}">
        <span class="nav__icon nav__icon--${key}">${icon}${key === 'order' && count ? `<span class="badge" data-key="badge-${count}">${count}</span>` : ''}</span><span class="nav__label">${label}</span></button>`;
    };
    return `<nav class="nav" aria-label="Навигация">
      ${item('menu', 'Главная', 'data-go="menu"', 'home')}
      ${item('ai', 'Фуджи ИИ', 'data-go="ai"', 'ai')}
      ${item('help', 'Помощь', 'data-action="call"', 'help')}
      ${item('order', 'Корзина', 'data-go="order"', 'cart')}
    </nav>`;
  }

  /** Кнопка цены на карточке: «299 ₽» → в корзине «− 299 ₽ +»; нет в наличии — подпись вместо кнопки. */
  /** Цена на карточке: у блюда с размерами или платным обязательным выбором (основа вока) — «от» самой низкой. */
  const fromPrice = (p) => {
    const prices = (p.sizes || []).map((z) => Number(z.price)).filter((v) => v > 0);
    const min = Math.min(Number(p.price) || Infinity, ...prices);
    const varied = prices.length > 1 && new Set(prices).size > 1;
    const viaMods = p.basePrice != null && Number(p.basePrice) < Number(p.price);
    return varied || viaMods ? `от ${rub(min)}` : rub(Number.isFinite(min) ? min : p.price);
  };
  function pricePill(p, qty, stopped, cls = 'price-pill') {
    if (stopped) return `<span class="dish__soon">${Number(p.price) ? 'Закончился :(' : 'Скоро в продаже'}</span>`;
    // Алкоголь вне часов продажи (или выключен на точке): добавить нельзя, причина — в карточке блюда
    if (!qty && isAlco(p) && !alcoOpen()) return `<span class="dish__soon dish__soon--alco">${alco()?.enabled ? 'Сейчас не продаём' : 'Не продаётся'}</span>`;
    // Блюдо с выбором — кнопка открывает карточку (выбор размера, соуса…); количество видно на фото
    if (hasOptions(p)) return `<button class="${cls}" data-inc="${esc(p.id)}" aria-label="Выбрать ${esc(p.name)}">${fromPrice(p)}${cls.includes('big') ? `<img src="${UI('plus-circle.svg')}" alt="">` : ''}</button>`;
    if (!qty) return `<button class="${cls}" data-inc="${esc(p.id)}" aria-label="Добавить ${esc(p.name)}">${rub(p.price)}${cls.includes('big') ? `<img src="${UI('plus-circle.svg')}" alt="">` : ''}</button>`;
    return `<div class="${cls} ${cls}--qty">
      <button data-dec="${esc(p.id)}" aria-label="Убрать">${ICONS.minus}</button>
      <span>${rub(p.price)}</span>
      <button data-inc="${esc(p.id)}" aria-label="Добавить">${ICONS.plus}</button></div>`;
  }

  function dishCard(p, { reason = null } = {}) {
    const qty = qtyOf(p);
    const stopped = isStopped(p);
    const sub = reason || p.description || '';
    const count = qty && !stopped ? `<span class="dish__count" data-key="count-${qty}" aria-label="В заказе ${qty}">${qty}</span>` : '';
    if (p.cardSize === 'big' && !reason) {
      return `<article class="dish dish--big ${stopped ? 'is-stopped' : ''} ${qty && !stopped ? 'has-qty' : ''} ${S.previewFocus === String(p.id) ? 'is-focus' : ''}" data-product="${esc(p.id)}">
        <div class="dish__photo">${imgHtml(p, 'dish__img', 720)}${tagsHtml(p)}${alcoTag(p)}${count}</div>
        <div class="dish__overlay"><div class="dish__name">${esc(p.name)}</div>${pricePill(p, qty, stopped, 'price-pill price-pill--big')}</div>
      </article>`;
    }
    return `<article class="dish ${stopped ? 'is-stopped' : ''} ${qty && !stopped ? 'has-qty' : ''} ${S.previewFocus === String(p.id) ? 'is-focus' : ''}" data-product="${esc(p.id)}">
      <div class="dish__photo">${imgHtml(p)}${tagsHtml(p)}${alcoTag(p)}${count}</div>
      <div class="dish__body">
        <div class="dish__name">${esc(p.name)}</div>
        ${sub ? `<div class="dish__desc">${esc(sub)}</div>` : ''}
        <div class="dish__foot"><span class="dish__weight">${esc(p.weight || '')}${p.stopBalance && !stopped ? `<i class="dish__left">осталось ${Number(p.stopBalance)}</i>` : ''}</span>${pricePill(p, qty, stopped)}</div>
      </div>
    </article>`;
  }
  // ── Экран: вход ────────────────────────────────────────────
  /** Шторка «Сделать заказ»: номер стола (если не из QR) и телефон (если гость ещё не входил). */
  function openSeatSheet(then = null, error = '') {
    const fujiUrl = S.config?.fujiAppLoginUrl;
    const needTable = !S.table || S.changeTable;
    const needLogin = !S.token;
    const needName = !S.guest?.name;
    const field = (label, input) => `<label class="field"><span class="field__label">${label}</span>${input}</label>`;
    openSheet(`<form id="seat-form" autocomplete="on">
      <h2>${needLogin ? 'Авторизация' : 'Выбор стола'}</h2>
      <p class="sheet__hint">${esc(S.config?.restaurant?.name || '')}${S.config?.restaurant?.address ? `, ${esc(S.config.restaurant.address)}` : ''}${needTable ? '' : `. Стол №${esc(S.table)} <button type="button" class="link-btn" data-change-table>Другой стол</button>`}</p>
      ${needTable ? field('Номер стола', `<input id="seat-table" class="input" type="text" inputmode="numeric" maxlength="10" placeholder="Номер стола на табличке" value="${esc(S.table || '')}">`) : ''}
      ${needName ? field('Ваше имя', '<input id="seat-name" class="input" type="text" maxlength="40" autocomplete="given-name" placeholder="Ваше имя">') : ''}
      ${needLogin ? `${field('Телефон', '<input id="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" value="+7 " aria-label="Номер телефона">')}
        <label class="consent"><input type="checkbox" id="consent" checked><span class="consent__box">${ICONS.check}</span><span>Согласие на обработку персональных данных</span></label>` : ''}
      <div class="auth__error" id="seat-error">${esc(error)}</div>
      <button class="btn btn--dark" type="submit"><span>Продолжить</span><span class="round-btn">${ICONS.arrowRight}</span></button>
      ${needLogin && fujiUrl ? `<a class="fuji-btn" id="fuji-login" href="${fujiUrl ? esc(`${fujiUrl}${fujiUrl.includes('?') ? '&' : '?'}return=${encodeURIComponent(`${location.origin}${location.pathname}?restaurant=${S.restaurant || ''}&table=${S.table || ''}`)}`) : '#'}">
        <img src="${UI('fuji-app.svg')}" alt=""><span>Войти через приложение Фуджи</span></a>` : ''}
    </form>`, (sheet) => {
      const phone = $('#phone', sheet);
      if (phone) phone.addEventListener('input', () => { phone.value = formatPhone(phone.value); });
      (needTable ? $('#seat-table', sheet) : phone)?.focus();
      sheet.addEventListener('click', (e) => {
        if (e.target.closest('[data-change-table]')) { S.changeTable = true; openSeatSheet(then); }
        if (e.target.closest('#fuji-login') && !fujiUrl) {
          e.preventDefault();
          toast('Откройте меню через QR-сканер в приложении Фуджи — вход произойдёт автоматически');
        }
      });
      $('#seat-form', sheet).addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#seat-error', sheet);
        const btn = e.submitter || $('#seat-form button[type=submit]', sheet);
        let table = S.table;
        if (needTable) {
          table = ($('#seat-table', sheet).value || '').trim();
          if (!table) { err.textContent = 'Введите номер стола'; return; }
        }
        if (needLogin && !$('#consent', sheet).checked) { err.textContent = 'Нужно согласие на обработку персональных данных'; return; }
        const name = needName ? ($('#seat-name', sheet).value || '').trim() : '';
        if (needName && !name) { err.textContent = 'Введите имя — официант будет знать, чьё блюдо'; return; }
        btn.disabled = true;
        try {
          if (needLogin) {
            const res = await api('POST', '/api/v1/guest/login', { phone: phone.value, consent: true });
            S.token = res.token; S.guest = res.guest;
            store.set('token', res.token); store.set('guest', res.guest);
          }
          if (table !== S.table) { S.table = table; S.sessionId = null; store.del('sessionId'); }
          store.set('table', S.table);
          S.changeTable = false;
          if (!(await enterTable({ name, then }))) return; // стол занят — спросили, присоединиться ли
          startPolling();
          closeSheet();
          toast(`Стол №${S.table}: можно заказывать`);
          render();
          if (then) then();
        } catch (e2) {
          btn.disabled = false;
          err.textContent = e2.message;
        }
      });
    });
  }

  /** Где я: сменить стол (пересесть) или ресторан. */
  function openPlaceSheet(error = '') {
    const pending = pendingCount();
    openSheet(`<form id="place-form">
      <h2>Выбор стола</h2>
      <p class="sheet__hint">${esc(S.config?.restaurant?.name || '')}${S.config?.restaurant?.address ? `, ${esc(S.config.restaurant.address)}` : ''}. Стол №${esc(S.table)}</p>
      <label class="field"><span class="field__label">Пересесть за другой стол</span><input id="place-table" class="input" type="text" inputmode="numeric" maxlength="10" placeholder="Номер стола на табличке"></label>
      <p class="field__note">Уже отправленные блюда остаются за столом №${esc(S.table)} – официант перенесёт их сам.${pending ? ' Неотправленные блюда из корзины перейдут на новый стол.' : ''}</p>
      <div class="auth__error" id="place-error">${esc(error)}</div>
      <button class="btn btn--dark" type="submit"><span>Продолжить</span><span class="round-btn">${ICONS.arrowRight}</span></button>
      <button class="btn btn--outline" type="button" data-place-rest><span>Сменить ресторан</span><span class="round-btn">${ICONS.arrowRight}</span></button>
    </form>`, (sheet) => {
      $('[data-place-rest]', sheet).addEventListener('click', () => openRestaurantSheet());
      $('#place-form', sheet).addEventListener('submit', async (e) => {
        e.preventDefault();
        const table = ($('#place-table', sheet).value || '').trim();
        const err = $('#place-error', sheet);
        if (!table) { err.textContent = 'Введите номер стола'; return; }
        if (table === String(S.table)) { closeSheet(); return; }
        const btn = e.submitter || $('#place-form button[type=submit]', sheet);
        btn.disabled = true;
        try { if (await switchTable(table)) { closeSheet(); toast(`Стол №${S.table}: можно заказывать`); render(); } } catch (e2) {
          btn.disabled = false; err.textContent = e2.message;
        }
      });
    });
  }

  /** Пересесть: неотправленные блюда уходят со старого стола и переезжают в корзину нового. */
  async function switchTable(table) {
    const carry = {};
    for (const l of cartLines()) {
      const q = Math.max(0, l.qty - lockedQty(l.key));
      if (q) carry[l.key] = { ...l, qty: q };
    }
    const hasCarry = Object.keys(carry).length > 0;
    clearTimeout(saveTimer);
    const oldSession = S.sessionId;
    const oldTable = S.table;
    const oldKey = S.qrKey;
    const oldCart = S.cart;
    // Неотправленное уходит со старого стола только после того, как гость сел за новый
    const moveCart = async () => {
      if (oldSession && hasCarry) await api('POST', '/api/v1/table-order/cart', { sessionId: oldSession, items: [] }).catch(() => {});
      if (hasCarry) { S.cart = carry; persistCart(); scheduleCartSave(); render(); }
    };
    S.table = table; S.sessionId = null; S.session = null; S.cart = {}; S.qrKey = null;
    store.del('sessionId'); store.set('table', table); store.del('qrKey');
    try {
      const ok = await enterTable({ then: moveCart });
      if (!ok) return false; // стол занят — гость присоединится через шторку, корзина переедет после этого
    } catch (e) {
      // Стол не найден — возвращаемся за прежний, корзина как была
      S.table = oldTable; store.set('table', oldTable);
      S.qrKey = oldKey; if (oldKey) store.set('qrKey', oldKey);
      if (oldSession) { S.sessionId = oldSession; store.set('sessionId', oldSession); await enterTable().catch(() => {}); }
      S.cart = oldCart; persistCart();
      throw e;
    }
    await moveCart();
    startPolling();
    return true;
  }

  /** Смена ресторана: QR выбирает его автоматически, но гость может переключиться вручную. */
  async function openRestaurantSheet() {
    let list = [];
    try { list = await api('GET', '/api/v1/restaurants'); } catch (e) { toast(e.message, true); return; }
    // Все рестораны сети; где QR-заказ ещё не подключён к iiko — видно, но выбрать нельзя
    const pending = pendingCount();
    openSheet(`<h2>Выбор ресторана</h2>
      <p class="sheet__hint">${S.session ? `Сейчас вы за столом №${esc(S.table)}. При смене ресторана стол нужно будет выбрать заново${pending ? ', неотправленные блюда из корзины удалятся' : ''}.` : 'Выберите, в каком ресторане вы находитесь'}</p>
      <div class="rest-list">${list.map((r) => {
    const off = r.hasMenu === false && r.slug !== S.restaurant;
    const here = r.slug === S.restaurant;
    const notes = [
      here ? '<i class="rest-note rest-note--here">Вы здесь</i>' : '',
      r.workHours && !off ? `<i class="rest-note">Время работы : ${esc(r.workHours)}</i>` : '',
      off ? '<i class="rest-note">Скоро в приложении</i>' : '',
    ].join('');
    return `<button class="rest-item ${here ? 'is-current' : ''}" ${off ? 'disabled' : `data-rest="${esc(r.slug)}"`}>
        <b>${esc(r.name)}</b><span>${esc(r.address || '')}</span>${notes}</button>`;
  }).join('')}</div>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rest]');
        if (!b) return;
        if (b.dataset.rest === S.restaurant) { closeSheet(); return; }
        // Новый ресторан — чистый старт: без стола, визита и корзины прошлого ресторана
        ['table', 'sessionId', 'cart', 'aiResults', 'qrKey'].forEach((k) => store.del(k));
        store.set('restaurant', b.dataset.rest);
        location.href = `${location.pathname}?restaurant=${encodeURIComponent(b.dataset.rest)}`;
      });
    });
  }

  /**
   * Маска телефона «+7 900-123-45-67». Цифры считаются после «+7»: раньше «8 900…» в поле «+7 » превращалось
   * в «+7 890…» — гость регистрировался под чужим номером. 11 цифр с 7 или 8 впереди (вставили номер целиком) —
   * первая лишняя. Одну «8» не убираем: код Самары 846 тоже начинается с 8.
   */
  function formatPhone(v) {
    const raw = String(v || '').trim();
    let d = (raw.startsWith('+7') ? raw.slice(2) : raw).replace(/\D/g, '');
    if (d.length >= 11 && /^[78]/.test(d)) d = d.slice(1);
    d = `7${d.slice(0, 10)}`;
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    let out = '+7';
    if (p[0]) out += ` ${p[0]}`;
    if (p[1]) out += `-${p[1]}`;
    if (p[2]) out += `-${p[2]}`;
    if (p[3]) out += `-${p[3]}`;
    return out;
  }

  async function onLoggedIn({ token, guest }) {
    S.token = token; S.guest = guest;
    store.set('token', token); store.set('guest', guest);
    if (S.table) await startTable(); else render();
  }

  // ── Экран: AI ──────────────────────────────────────────────
  const chipIcon = (c) => {
    const l = String(c.label || '').toLowerCase();
    if (l.includes('остр')) return `<img src="${UI('ai-pepper.svg')}" alt="">`;
    if (l.includes('реб') || l.includes('дет')) return `<img src="${UI('ai-child.svg')}" alt="">`;
    return c.emoji ? `<span class="chip__emoji">${esc(c.emoji)}</span>` : '';
  };
  function renderAi() {
    const { results, loading, error, query } = S.ai;
    const hasResults = Boolean(results?.length) || loading || error;
    const hello = S.guest?.name ? `${S.guest.name}, что сегодня хотите?` : 'Что сегодня хотите?';
    const chips = (S.config?.chips || []).map((c) => `<button class="chip ${query === c.query ? 'is-active' : ''}" data-chip="${esc(c.query)}">${chipIcon(c)}<span>${esc(c.label)}</span></button>`).join('');
    let body = '';
    if (loading) body = '<div class="ai-results"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
    else if (error) {
      body = `<div class="ai-results"><div class="ai-error">
        <div class="ai-error__title">${esc(error)}</div>
        <div class="muted">Пока можно выбрать из популярного или повторить запрос</div>
        <button class="btn btn--dark btn--center" data-retry>Повторить</button></div></div>`;
    } else if (results?.length) {
      body = `<div class="ai-results ${S.aiFresh ? 'is-fresh' : ''}">${results.map((r) => {
        const p = findProduct(r.productId) || { id: r.productId, iikoId: r.iikoId, name: r.name, price: r.price, image: r.image, weight: r.weight };
        return dishCard(p, { reason: r.reason });
      }).join('')}</div>`;
    }
    const head = hasResults
      ? `<section class="ai-head"><img class="ai-head__orb ${loading ? 'is-thinking' : ''}" src="${UI('ai-orb.webp')}" alt="">
          <div><div class="ai-head__title">Фуджи ИИ</div><div class="ai-head__sub">${esc(loading ? 'Подбираю…' : error ? 'Не получилось' : (S.ai.label || 'Вот что я подобрал:'))}</div></div></section>`
      : `<section class="ai-hero"><img class="ai-orb" src="${UI('ai-orb.webp')}" alt="">
          <h1>Спросите Фуджи ИИ</h1><div class="ai-hero__hello">${esc(hello)}</div></section>`;
    return `${topbar()}<main class="screen screen--center screen--ai">
      ${head}
      ${hasResults ? '' : bannersHtml('ai')}
      ${body}
      <div class="ai-bottom">
        <div class="chips">${chips}</div>
        <form class="ai-input" id="ai-form">
          <input id="ai-input" type="text" enterkeyhint="send" maxlength="300" placeholder="${hasResults ? 'Повторить поиск' : 'Поиск блюда с помощью ИИ'}" value="${esc(S.ai.draft ?? query)}" aria-label="Запрос к ИИ">
          <button type="submit" aria-label="Спросить"><img src="${UI('ai-send.svg')}" alt=""></button>
        </form>
        ${cartCount() && !visitOver() ? submitBlock() : ''}
      </div>
    </main>`;
  }

  let aiReq = 0;
  async function askAi(query, isChip = false) {
    const q = String(query || '').trim();
    if (!q) return;
    const my = ++aiReq; // ответ на прежний запрос (гость уже спросил другое) не показываем
    S.ai = { ...S.ai, query: q, draft: null, loading: true, error: null };
    render();
    try {
      const res = await api('POST', '/api/v1/ai/suggest', {
        restaurantSlug: S.restaurant, query: q, chip: isChip, cart: cartLines().map((l) => l.product.name),
      }, { timeout: 9000 });
      if (my !== aiReq) return;
      S.aiFresh = true;
      S.ai = { ...S.ai, results: res.suggestions, loading: false, engine: res.engine, label: res.answer || (res.suggestions.length ? 'Вот что я подобрал:' : '') };
      if (!res.suggestions.length) {
        S.ai.error = S.catalog && !S.catalog.products?.length
          ? 'Меню ресторана ещё загружается из iiko — загляните чуть позже или позовите официанта'
          : 'Не нашёл подходящих блюд';
      }
      store.set('aiResults', res.suggestions);
    } catch (e) {
      // Fallback по ТЗ: без пустого экрана — показываем популярное
      let fallback = [];
      try { fallback = (await api('GET', `/api/v1/ai/welcome?restaurant=${encodeURIComponent(S.restaurant || '')}`, null, { timeout: 4000 })).suggestions; } catch { /* offline */ }
      if (my !== aiReq) return;
      S.ai = { ...S.ai, loading: false, results: fallback, label: fallback.length ? 'Помощник сейчас недоступен — вот популярные блюда:' : '', error: fallback.length ? null : e.message };
    }
    render();
  }

  const WAITING_WAITER = ['cart_ready', 'waiter_review', 'reorder_pending'];
  /** Почему неотправленную позицию нельзя передать: блюдо на стопе или больше остатка в iiko. */
  function lineProblem(l, freshQty) {
    const p = findProduct(l.product.id) || l.product;
    const id = String(l.product.id);
    const stoppedOnServer = (S.session?.items || []).some((i) => !i.isLocked && i.isStopped
      && (String(i.productId) === id || String(i.iikoProductId) === id));
    if (isStopped(p) || stoppedOnServer) return 'Закончился — уберите из заказа';
    if (p.lunchCombo && S.catalog?.businessLunch && !S.catalog.businessLunch.active) return `Бизнес-ланч доступен ${S.catalog.businessLunch.text} — уберите из заказа`;
    const hg = hoursGroupOf(p);
    if (hg) return `Раздел «${hg.name}» доступен ${hg.window.text} — уберите из заказа`;
    const left = Number(p.stopBalance) || 0;
    if (left && freshQty > left) return `Осталось ${left} шт. — уменьшите количество`;
    return null;
  }
  const blockedLines = () => cartLines()
    .map((l) => ({ l, q: l.qty - lockedQty(l.key) })).filter((x) => x.q > 0 && lineProblem(x.l, x.q));
  function submitBlock() {
    const pending = pendingCount();
    const reorder = (S.session?.items || []).some((i) => i.isLocked);
    if (!pending) return '';
    // Уже передано и с тех пор не менялось — повторно отправлять нечего
    if (WAITING_WAITER.includes(S.session?.workflowStatus) && !S.changedSinceSubmit) return '';
    if (S.submitting) {
      return `<button class="btn btn--dark submit-btn btn--center" disabled><span class="spinner"></span>Передаём официанту…</button>`;
    }
    const blocked = blockedLines();
    if (blocked.length) {
      return `<button class="btn btn--dark submit-btn" disabled>
        <span>Уберите недоступные блюда<span class="btn__sub">${esc(blocked.map((x) => x.l.product.name).join(', ').slice(0, 80))}</span></span></button>`;
    }
    return `<button class="btn btn--dark submit-btn" data-action="submit">
      <span>${reorder ? 'Передать дозаказ официанту' : 'Передать заказ официанту'}<span class="btn__sub">${pending} ${plural(pending, ['позиция', 'позиции', 'позиций'])} · ${rub(cartTotal())}</span></span>
      <span class="round-btn">${ICONS.arrowRight}</span></button>`;
  }

  // ── Баннеры маркетинга (админка → «Баннеры и акции») ────────
  function bannersHtml(placement) {
    const list = (S.config?.promos || []).filter((b) => (b.placement || 'menu') === placement);
    if (!list.length) return '';
    return `<div class="banners">${list.map((b) => {
      const src = imgSrc(b.image, 960);
      const link = b.productId || b.categoryId || /^https?:\/\//.test(b.url || '');
      const tag = link ? 'button' : 'div';
      return `<${tag} class="banner ${src ? 'has-img' : ''} ${link ? '' : 'banner--static'}" ${link ? `data-banner="${esc(b.id)}"` : ''}>
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : ''}
        <div class="banner__text"><div class="banner__title">${esc(b.title)}</div>${b.text ? `<div class="banner__sub">${esc(b.text)}</div>` : ''}</div>
      </${tag}>`;
    }).join('')}</div>`;
  }
  function openBanner(id) {
    const b = (S.config?.promos || []).find((x) => String(x.id) === String(id));
    if (!b) return;
    if (b.productId) { openProduct(b.productId); return; }
    if (b.categoryId) {
      if (S.tab !== 'menu') go('menu');
      setTimeout(() => scrollToCategory(b.categoryId), 80);
      return;
    }
    if (b.url && /^https?:\/\//.test(b.url)) window.open(b.url, '_blank', 'noopener');
  }

  // ── Экран: меню ────────────────────────────────────────────
  function menuSections(section = S.menu.section) {
    const products = S.catalog?.products || [];
    const groups = S.catalog?.groups || [];
    // «угрем» и «угрём» находят одно и то же
    const norm = (t) => String(t).toLowerCase().replace(/ё/g, 'е');
    const q = norm(S.menu.search.trim());
    // В поиске блюдо один раз (копия того же блюда в бизнес-ланче — isAlias — не повторяется)
    // Наборы бизнес-ланча выбираются в конструкторе (баннер вверху раздела), в списке их нет; в поиске — есть
    const lunchGid = q ? null : lunchGroupId();
    const spot = q ? null : lunchSpot();
    // Разделы вне времени показа («до 12:00») у гостя скрыты вместе с блюдами
    const closed = closedGroupIds();
    const open = closed.size ? products.filter((p) => !closed.has(String(p.parentGroup))) : products;
    const filtered = q ? open.filter((p) => !p.isAlias && !p.lunchCombo && norm(`${p.name} ${p.description || ''}`).includes(q))
      : lunchGid ? open.filter((p) => !p.lunchCombo) : open;
    const byGroup = new Map();
    if (spot) byGroup.set(spot.gid, []); // раздел остаётся, даже если в нём одни наборы
    for (const p of filtered) {
      const g = p.parentGroup || 'other';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(p);
    }
    const order = new Map(groups.map((g, i) => [g.id, g.order ?? i]));
    const bar = barGroupIds();
    return [...byGroup.entries()]
      .map(([id, items]) => ({ id, name: groups.find((g) => g.id === id)?.name || items[0].parentGroupName || 'Другое', items, order: order.get(id) ?? 999 }))
      // Вкладки «Кухня / Бар»; поиск ищет по всему меню
      .filter((sec) => q || !bar.size || bar.has(String(sec.id)) === (section === 'bar'))
      .sort((a, b) => a.order - b.order);
  }

  /** Разделы бара (сервер помечает isBar: касса бара и напитки), только те, где есть позиции. */
  function barGroupIds() {
    const ids = new Set((S.catalog?.groups || []).filter((g) => g.isBar).map((g) => String(g.id)));
    const used = new Set((S.catalog?.products || []).map((p) => String(p.parentGroup || 'other')));
    return new Set([...ids].filter((id) => used.has(id)));
  }

  function renderMenu() {
    if (!S.catalog && S.catalogError) {
      return `${topbar()}<main class="screen"><div class="empty"><img class="ai-orb ai-orb--md" src="${UI('ai-orb.webp')}" alt="">
        <div class="empty__title">Меню не загрузилось</div><div>${esc(S.catalogError)}</div>
        <button class="btn btn--dark btn--center empty__btn" data-action="reload-catalog">Повторить</button></div></main>`;
    }
    if (!S.catalog) return `${topbar()}<main class="screen"><div class="skeleton skeleton--search"></div><div class="skeleton skeleton--cats"></div><div class="list">${'<div class="skeleton"></div>'.repeat(4)}</div></main>`;
    const sections = menuSections();
    const spot = S.menu.search ? null : lunchSpot();
    // В поиске наборов нет — по «ланч» или блюду набора показываем саму позицию «Бизнес-ланч»
    const lunchHit = Boolean(S.menu.search) && lunchMatches(S.menu.search.trim());
    eagerBudget = 4;
    // Кухня и бар — два меню: явный переключатель над разделами (что выбрано — видно сразу) и карточка в конце списка
    const hasBar = barGroupIds().size > 0 && !S.menu.search;
    const inBar = S.menu.section === 'bar';
    const menuTabs = hasBar ? `<div class="menu-tabs" role="tablist" aria-label="Кухня или бар">
        <button role="tab" aria-selected="${!inBar}" class="${inBar ? '' : 'is-on'}" data-section="kitchen">Кухня</button>
        <button role="tab" aria-selected="${inBar}" class="${inBar ? 'is-on' : ''}" data-section="bar">Бар и напитки</button></div>` : '';
    const switchCard = hasBar ? `<button class="section-switch" data-section="${inBar ? 'kitchen' : 'bar'}">
        <span>${inBar ? 'Блюда кухни' : 'Напитки и бар'}</span><small>${inBar ? 'роллы, горячее, десерты' : 'чай, кофе, лимонады, коктейли'}</small></button>` : '';
    return `${topbar()}<main class="screen">
      <form class="search ${S.menu.search ? 'is-active' : ''}" id="search-form" onsubmit="return false">
        <input id="search" type="search" placeholder="Поиск по меню" value="${esc(S.menu.search)}" aria-label="Поиск">
        ${S.menu.search ? `<button type="button" class="search__clear" data-action="clear-search" aria-label="Очистить поиск">${ICONS.close}</button>`
    : `<span class="search__icon"><img src="${UI('search.svg')}" alt=""></span>`}
      </form>
      ${S.menu.search ? '' : menuTabs}
      ${S.menu.search ? '' : `<div class="cats" id="cats"><button class="cats__all" data-action="all-cats" aria-label="Все разделы меню">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="5" height="5" rx="1.5"/><rect x="9" y="2" width="5" height="5" rx="1.5"/><rect x="2" y="9" width="5" height="5" rx="1.5"/><rect x="9" y="9" width="5" height="5" rx="1.5"/></svg>Меню</button>${sections.map((s) => `<button data-cat="${esc(s.id)}" class="${String(S.activeCat) === String(s.id) ? 'is-active' : ''}">${esc(s.name)}</button>`).join('')}</div>`}
      ${S.menu.search ? '' : bannersHtml('menu')}
      ${lunchHit ? `<div class="list" style="margin-top:8px">${lunchCard()}</div>` : ''}
      ${sections.length ? sections.map((s, i) => {
    // Карточка бизнес-ланча стоит среди блюд раздела на месте из админки
    const cards = s.items.map((p) => dishCard(p));
    if (!S.menu.search && spot && String(s.id) === spot.gid) {
      cards.splice(spot.position === 'last' ? cards.length : spot.position === 'index' ? Math.min(spot.index - 1, cards.length) : 0, 0, lunchCard());
    }
    return `<h2 class="section-title" id="cat-${esc(s.id)}">${esc(s.name)}</h2>
        <div class="list ${i === sections.length - 1 && !S.menu.search && !hasBar ? 'list--last' : ''}">${cards.join('')}</div>`;
  }).join('') + switchCard
    : lunchHit ? '' : S.catalog.products?.length
      ? `<div class="empty"><img class="ai-orb ai-orb--md" src="${UI('ai-orb.webp')}" alt="">
          <div class="empty__title">Ничего не нашлось</div><div>Спросите Фуджи ИИ — он подберёт похожее</div>
          <button class="btn btn--dark btn--center empty__btn" data-action="ask-ai-search">Спросить ИИ: «${esc(S.menu.search.trim().slice(0, 40))}»</button></div>`
      : `<div class="empty"><img class="ai-orb ai-orb--md" src="${UI('ai-orb.webp')}" alt="">Меню ресторана ещё загружается из iiko.<br>Загляните чуть позже или позовите официанта.</div>`}
    </main>`;
  }

  // ── Экран: заказ ───────────────────────────────────────────
  // Четыре шага макета: ждём заказ → ждём официанта → готовим → готово
  const STEP_TEXT = [
    ['Ждём ваш заказ', 'Выбирайте любимое или спросите ИИ'],
    ['Ждём официанта', 'Скоро подойдём и примем ваш заказ'],
    ['Готовим ваш заказ', 'Повара готовят ваши блюда'],
    ['Заказ готов', 'Несём к вашему столу. Приятного аппетита!'],
  ];
  function orderStep(s) {
    if (!s) return 0;
    if (visitOver(s) || s.kitchenStatus === 'Served' || s.kitchenStatus === 'CookingCompleted') return 3;
    if (['in_production', 'bill_requested', 'paid', 'closed'].includes(s.workflowStatus)) return 2;
    if (['cart_ready', 'waiter_review', 'reorder_pending'].includes(s.workflowStatus)) return 1;
    return 0;
  }
  const STATUS_SUB = {
    reorder_pending: 'Дозаказ ждёт подтверждения официанта',
    bill_requested: 'Официант скоро принесёт счёт',
    paid: 'Спасибо, что были с нами!',
  };
  function orderStepper(s) {
    const step = orderStep(s);
    const wf = s?.workflowStatus;
    const [title, sub0] = STEP_TEXT[step];
    const wname = waiterFirstName(s);
    const sub = (wf && STATUS_SUB[wf]) || (s?.kitchenLabel && step === 2 ? `Кухня: ${s.kitchenLabel}`
      : step === 1 && wname ? `${wname} скоро подойдёт и примет ваш заказ` : sub0);
    const bars = [0, 1, 2, 3].map((n) => `<div class="stepper__bar ${n < step ? 'is-done' : n === step ? 'is-current' : ''}">${n === step
      ? `<img src="${UI(`order-step${n + 1}.svg`)}" alt="">` : ''}</div>`).join('');
    return `<section class="stepper-card">
      <div class="stepper" aria-label="Шаг ${step + 1} из 4">${bars}</div>
      <div class="stepper__title">${esc(title)}</div>
      <div class="stepper__sub">${esc(sub)}${s?.waitingMinutes ? ` · ждёте ${s.waitingMinutes} мин` : ''}</div>
    </section>`;
  }

  const thumb = (p) => (p ? imgHtml(p, 'cart-line__img', 120) : '<div class="cart-line__img"></div>');
  const itemStatus = (i) => (i.servedAt || i.kitchenStatus === 'Served' ? ['served', 'подано'] : i.isReady ? ['ready', 'готово']
    : i.isLocked ? ['kitchen', i.kitchenLabel || 'на кухне'] : ['cart', 'в корзине']);

  function renderOrder() {
    const s = S.session;
    const lines = cartLines();
    const paid = visitOver(s);
    // Корзина — то, что ещё не ушло официанту; отправленное — блоком выше, по гостям
    const fresh = lines.map((l) => ({ l, q: l.qty - lockedQty(l.key) })).filter((x) => x.q > 0);
    const cartHtml = fresh.map(({ l, q }) => {
      const problem = lineProblem(l, q);
      return `<div class="cart-line ${problem ? 'is-problem' : ''} ${S.openLine === l.key ? 'is-open' : ''}" data-key="cart-${esc(l.key)}">
        <div class="cart-line__row" data-swipe-del="${esc(l.key)}">
          ${thumb(findProduct(l.product.id) || l.product)}
          <div class="cart-line__main"><div class="cart-line__name">${esc(l.product.name)}${isAlco(l.product) ? ' <span class="tag-18 tag-18--inline">18+</span>' : ''}</div>${l.options ? `<div class="cart-line__opts">${esc(l.options)}</div>` : ''}<div class="cart-line__price">${rub(unitPrice(l))}</div>${problem ? `<span class="st st--stop">${esc(problem)}</span>` : ''}</div>
          ${paid ? '' : `<div class="stepper-mini">
            <button data-line-dec="${esc(l.key)}" aria-label="Убрать">${ICONS.minus}</button><b>${q}</b>
            <button data-line-inc="${esc(l.key)}" aria-label="Добавить">${ICONS.plus}</button></div>`}
        </div>
        <button class="cart-line__del" data-remove="${esc(l.key)}" aria-label="Удалить"><img src="${UI('trash.svg')}" alt=""></button>
      </div>`;
    }).join('');

    // Отправленное: мои блюда («Вы») и остальные гости за столом
    const me = S.guest?.id || null;
    const groups = new Map();
    for (const i of s?.items || []) {
      const mine = (i.guestId || null) === me;
      if (mine && !i.isLocked) continue; // мои неотправленные — в корзине ниже
      const who = mine ? 'Вы' : i.guestName || (i.seatNumber ? `Место ${i.seatNumber}` : i.fromIiko ? 'Заказ на кассе' : 'Добавил официант');
      if (!groups.has(who)) groups.set(who, []);
      groups.get(who).push(i);
    }
    const multi = groups.size > 1 || [...groups.keys()].some((k) => k !== 'Вы');
    const sentHtml = [...groups].map(([who, list]) => `<div class="sent-group">
        ${multi ? `<div class="sent-group__name">${esc(who)}</div>` : ''}
        ${list.map((i) => {
    const [cls, label] = itemStatus(i);
    return `<div class="sent-line">${thumb(findProduct(i.productId) || findProduct(i.iikoProductId))}
            <div class="cart-line__main"><div class="cart-line__name">${esc(i.name)}</div><span class="st st--${cls}">${esc(label)}</span></div>
            <div class="sent-line__sum">${rub(i.price)} <span>x ${i.quantity}</span></div></div>`;
  }).join('')}
      </div>`).join('');

    // Удалили или отменили на кассе уже после отправки: спокойная пометка в истории заказа (без ошибок)
    const gone = (s?.removedItems || []).slice(-8).reverse();
    const removedHtml = gone.length ? `<div class="order-card__removed"><div class="order-card__removed-title">Отменено на кассе</div>
      ${gone.map((r) => `<div class="removed-line"><span>${esc(r.name)}${r.quantity > 1 ? ` × ${r.quantity}` : ''}</span><i>отменено на кассе</i></div>`).join('')}</div>` : '';

    // Передано официанту и с тех пор не менялось — это уже заказ, а не черновик корзины
    const handedOver = fresh.length > 0 && WAITING_WAITER.includes(s?.workflowStatus) && !S.changedSinceSubmit;
    const canClear = fresh.length > 0 && !handedOver;
    // Итого — по отправленному (все гости); неотправленное считается отдельно, «В корзине»
    const sentSum = (s?.items || []).filter((i) => i.isLocked).reduce((n, i) => n + (Number(i.lineTotal) || 0), 0);
    const row = (attr, label, icon = '') => `<button class="menu-row" ${attr}>${icon}<span>${label}</span><img src="${UI('chevron.svg')}" alt=""></button>`;
    return `${topbar()}<main class="screen screen--order">
      ${orderStepper(s)}
      ${waiterLine(s)}
      ${bannersHtml('order')}
      ${sentHtml || removedHtml ? `<section class="order-card">${s?.openedInIiko && sentHtml ? '<div class="order-card__note">Заказ открыт официантом на кассе — блюда из меню попадут в тот же счёт</div>' : ''}${sentHtml}${removedHtml}
        ${sentSum > 0 ? `<div class="total-row"><span>${multi ? 'Весь стол' : 'Итого'}</span><b>${rub(sentSum)}</b></div>` : ''}</section>` : ''}
      ${cartHtml ? `<section class="order-card">${handedOver ? '<div class="order-card__note">Передано официанту — он подойдёт и подтвердит заказ. Изменения придётся передать ещё раз</div>' : ''}${cartHtml}
        <div class="total-row"><span>${handedOver ? 'Передано официанту' : 'В корзине'}</span><b>${rub(fresh.reduce((n, x) => n + x.q * unitPrice(x.l), 0))}</b></div></section>`
    : sentHtml || removedHtml ? '' : '<section class="order-empty">Корзина пуста</section>'}
      <div class="actions">
        ${paid ? `<button class="btn btn--dark" data-action="new-visit"><span>Начать новый заказ</span><span class="round-btn">${ICONS.arrowRight}</span></button>
          ${s.feedbackLeft || !s.isPaid ? '' : row('data-action="feedback"', 'Оценить визит')}`
    : `${submitBlock()}
        ${sentSum > 0 && (s.canRequestBill || S.config?.onlinePay) ? `<button class="btn ${pendingCount() ? 'btn--outline' : 'btn--dark'}" data-action="bill"><span>Оплатить счёт<span class="btn__sub">${rub(sentSum)}</span></span><span class="round-btn">${ICONS.arrowRight}</span></button>` : ''}
        ${lines.length ? row('data-go="menu"', 'Дополнить из меню') : ''}
        ${row('data-action="call"', 'Позвать официанта', `<img class="menu-row__icon" src="${UI('status-help.svg')}" alt="">`)}
        ${canClear ? row('data-action="clear"', 'Очистить корзину') : ''}`}
      </div>
    </main>`;
  }

  // ── Шторки ─────────────────────────────────────────────────
  function openSheet(html, onMount, { cls = '' } = {}) {
    const root = $('#sheet-root');
    root.firstElementChild?.abort?.();
    root.innerHTML = `<div class="sheet-backdrop" data-close><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet__grip"></div>${html}</div></div>`;
    const backdrop = root.firstElementChild;
    const sheet = backdrop.querySelector('.sheet');
    document.documentElement.classList.add('sheet-open'); // страница под шторкой не прокручивается
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-sheet-close]')) closeSheet(); });
    enableSheetDrag(backdrop, sheet);
    onMount?.(sheet);
    watchLiveVideos(sheet);
  }
  /** Шторка закрывается плавно — уезжает вниз. */
  function closeSheet() {
    const root = $('#sheet-root');
    const backdrop = root.firstElementChild;
    if (!backdrop) return;
    const sheet = backdrop.querySelector('.sheet');
    backdrop.abort?.();
    backdrop.classList.add('is-closing');
    document.documentElement.classList.remove('sheet-open');
    sheet.style.transition = 'transform .22s ease-in';
    sheet.style.transform = 'translateY(105%)';
    setTimeout(() => { if (root.firstElementChild === backdrop) root.innerHTML = ''; }, 220);
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#sheet-root').firstElementChild) closeSheet(); });

  /** Смахнуть шторку вниз пальцем (как в приложениях): тянется за пальцем, отпустил — закрылась или вернулась. */
  function enableSheetDrag(backdrop, sheet) {
    let y0 = null; let dy = 0; let t0 = 0; let dragging = false;
    const scrolled = (el) => { for (let n = el; n && n !== backdrop; n = n.parentElement) if (n.scrollTop > 0) return true; return false; };
    const start = (y, target) => {
      dragging = false;
      // Тянуть шторку можно, только когда она и вложенный список (рестораны) прокручены к началу
      if (target.closest('input, textarea, select') || scrolled(target)) return;
      y0 = y; dy = 0; t0 = Date.now();
    };
    const move = (y, e) => {
      if (y0 == null) return;
      dy = y - y0;
      if (!dragging && dy > 8) { dragging = true; sheet.style.transition = 'none'; }
      if (!dragging) return;
      if (e?.cancelable) e.preventDefault(); // не прокручиваем страницу, пока тянем шторку
      const d = Math.max(0, dy);
      sheet.style.transform = `translateY(${d}px)`;
      backdrop.style.backgroundColor = `rgba(41, 41, 41, ${Math.max(0, 0.28 * (1 - d / 400))})`;
    };
    const end = () => {
      if (y0 == null) return;
      const fast = dy > 60 && Date.now() - t0 < 250;
      y0 = null;
      if (!dragging) return;
      if (dy > 110 || fast) { closeSheet(); return; }
      sheet.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.2)';
      sheet.style.transform = 'translateY(0)';
      backdrop.style.backgroundColor = '';
      setTimeout(() => { dragging = false; }, 0); // касание не даёт click — флаг не должен съесть следующее нажатие
    };
    sheet.addEventListener('touchstart', (e) => start(e.touches[0].clientY, e.target), { passive: true });
    sheet.addEventListener('touchmove', (e) => move(e.touches[0].clientY, e), { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    sheet.addEventListener('mousedown', (e) => start(e.clientY, e.target));
    // Слушатели окна живут, пока шторка открыта (без утечки на каждое открытие)
    const ctrl = new AbortController();
    backdrop.abort = () => ctrl.abort();
    addEventListener('mousemove', (e) => move(e.clientY, e), { signal: ctrl.signal });
    addEventListener('mouseup', end, { signal: ctrl.signal });
    // Клик после перетаскивания не должен нажимать кнопку под пальцем
    sheet.addEventListener('click', (e) => { if (dragging) { e.stopPropagation(); e.preventDefault(); dragging = false; } }, true);
  }

  function openCallSheet() {
    const hasItems = (S.session?.items || []).some((i) => i.isLocked) && !visitOver(); // счёт — когда заказ уже на кухне
    const opt = (reason, label) => `<button class="menu-row" data-reason="${reason}"><span>${label}</span><img src="${UI('chevron.svg')}" alt=""></button>`;
    openSheet(`<h2>Позвать официанта</h2><p class="sheet__hint">Официант увидит стол №${esc(S.table)} и причину вызова</p>
      <div class="menu-rows">${opt('general', 'Нужна помощь')}${opt('order', 'Дозаказ')}${hasItems ? opt('bill', 'Попросить счёт') : ''}${opt('question', 'Вопрос по блюдам')}</div>
      <button class="link-btn link-btn--logout" data-logout>Выйти (${esc(S.guest?.phoneMasked || 'гость')})</button>`, (sheet) => {
      sheet.addEventListener('click', async (e) => {
        if (e.target.closest('[data-logout]')) {
          closeSheet();
          try { Object.keys(localStorage).filter((k) => k.startsWith('fm:') && k !== 'fm:restaurant').forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
          location.href = location.pathname;
          return;
        }
        const b = e.target.closest('[data-reason]');
        if (!b) return;
        b.disabled = true;
        try {
          const res = await api('POST', '/api/v1/table/call-waiter', { sessionId: S.sessionId, reason: b.dataset.reason });
          if (res.session) applySession(res.session);
          S.helpUntil = Date.now() + 5 * 60_000;
          setTimeout(render, 5 * 60_000 + 500);
          closeSheet(); toast(res.message || 'Официант скоро подойдёт', false, 'bell.svg'); render();
        } catch (err) { b.disabled = false; toast(err.message, true); }
      });
    }, { cls: 'sheet--gray' });
  }

  // ── Выбор в карточке блюда: размер и модификаторы (как во внешнем меню iiko) ──
  // sel: { sizeId, mods: Map(id → кол-во) }. Правила те же, что на сервере (menu-pricing.js → priceVariant).
  const sizeOf = (p, sel) => {
    const sizes = p.sizes || [];
    return sizes.length ? sizes.find((z) => String(z.id) === String(sel.sizeId)) || sizes.find((z) => z.isDefault) || sizes[0] : null;
  };
  const groupsFor = (p, sel) => (p.sizes?.length ? sizeOf(p, sel)?.groups || [] : p.modifierGroups || []);
  const groupTotal = (g, sel) => g.items.reduce((n, it) => n + (sel.mods.get(String(it.id)) || 0), 0);
  /** Обязательные группы — варианты по умолчанию из iiko, иначе первые. */
  function fillDefaults(g, sel) {
    // По умолчанию из iiko — сколько помещается в группу (в акциях iiko отмечает по умолчанию все варианты)
    for (const it of g.items) {
      if (it.def > 0 && !sel.mods.has(String(it.id)) && (!g.max || groupTotal(g, sel) + it.def <= g.max)) sel.mods.set(String(it.id), it.def);
    }
    // Обязательный выбор без варианта по умолчанию гость делает сам: кухня не получит соус, который он не выбирал.
    // Кнопка «Добавить» до выбора показывает, что выбрать, и прокручивает к этой группе
  }
  function initSel(p) {
    const sel = { sizeId: null, mods: new Map() };
    const z = sizeOf(p, sel);
    sel.sizeId = z?.id ?? null;
    for (const g of groupsFor(p, sel)) fillDefaults(g, sel);
    return sel;
  }
  /** Выбор → строка корзины: ключ варианта, размер, модификаторы, текст выбора и цена за 1 шт. */
  function resolveSel(p, sel) {
    const z = sizeOf(p, sel);
    const groups = groupsFor(p, sel);
    const mods = [];
    let extra = 0;
    for (const g of groups) {
      const picked = g.items.filter((it) => sel.mods.get(String(it.id)) > 0).map((it) => ({ it, amount: sel.mods.get(String(it.id)) }));
      const units = picked.flatMap((x) => Array(x.amount).fill(Number(x.it.price) || 0)).sort((a, b) => a - b);
      extra += units.slice(Math.min(g.free || 0, units.length)).reduce((n, v) => n + v, 0);
      for (const x of picked) mods.push({ id: String(x.it.id), groupId: g.id ?? null, amount: x.amount, name: x.it.name });
    }
    const sizeId = z && p.sizes.length > 1 && z.id ? String(z.id) : null;
    const m = mods.map((x) => `${x.id}:${x.amount}`).sort();
    const key = sizeId || m.length ? `${p.iikoId || p.id}|${sizeId || ''}|${m.join(',')}` : String(p.id);
    const options = [sizeId ? z.name : null, ...mods.map((x) => (x.amount > 1 ? `${x.name} ×${x.amount}` : x.name))].filter(Boolean).join(', ');
    const missing = groups.filter((g) => groupTotal(g, sel) < g.min).map((g) => g.name);
    return {
      key, sizeId, mods: mods.map(({ id, groupId, amount }) => ({ id, groupId, amount })), options: options || null,
      price: Math.round(((z ? Number(z.price) : Number(p.basePrice ?? p.price)) + extra) * 100) / 100, weight: z?.weight || null, missing,
    };
  }
  const groupHint = (g) => [
    g.min > 0 && g.max === 1 ? 'выберите 1' : g.min > 0 ? `минимум ${g.min}` : 'по желанию',
    g.max > 1 ? `до ${g.max}` : null,
    g.free > 0 && g.items.some((it) => it.price > 0) ? `${g.free} бесплатно` : null,
  ].filter(Boolean).join(' · ');
  function optionsHtml(p, sel) {
    const sizes = p.sizes?.length > 1 ? p.sizes : [];
    const short = (name) => esc(String(name || '').replace(/\s*см\.?$/i, '').slice(0, 6) || '•');
    const sizesHtml = sizes.length ? `<div class="product__block"><div class="product__label">Размер</div>
      <div class="opt-tiles">${sizes.map((z) => `<button class="opt-tile ${String(z.id) === String(sel.sizeId) ? 'is-on' : ''}" data-size="${esc(z.id)}">
        <span class="opt-tile__circle opt-tile__circle--size">${short(z.name)}</span><span class="opt-tile__name">${esc(z.name)}</span><span class="opt-tile__price">${rub(z.price)}</span></button>`).join('')}</div></div>` : '';
    const groupsHtml = groupsFor(p, sel).map((g, gi) => `<div class="product__block" data-group-block="${gi}">
      <div class="product__label product__label--row">${esc(g.name)}<span class="opt-hint ${groupTotal(g, sel) < g.min ? 'is-missing' : ''}">${esc(groupHint(g))}</span></div>
      <div class="opt-tiles">${g.items.map((it) => {
    const amt = sel.mods.get(String(it.id)) || 0;
    const img = it.image ? imgSrc(it.image, 160) : null;
    return `<button class="opt-tile ${amt ? 'is-on' : ''}" data-mod="${esc(it.id)}" data-group="${gi}">
          ${img ? `<span class="opt-tile__circle"><img src="${esc(img)}" alt="" loading="lazy"></span>` : `<span class="opt-tile__circle">${esc(String(it.name || '?').slice(0, 1))}</span>`}
          <span class="opt-tile__name">${esc(it.name)}</span>${it.price > 0 ? `<span class="opt-tile__price">+${rub(it.price)}</span>` : ''}${amt > 1 ? `<i class="opt-tile__qty">×${amt}</i>` : ''}</button>`;
  }).join('')}</div></div>`).join('');
    return sizesHtml + groupsHtml;
  }
  function toggleMod(p, sel, id, gi) {
    const g = groupsFor(p, sel)[gi];
    const it = g?.items.find((x) => String(x.id) === String(id));
    if (!it) return;
    const cur = sel.mods.get(String(it.id)) || 0;
    if (g.max === 1) {
      if (cur) { if (g.min === 0) sel.mods.delete(String(it.id)); return; }
      for (const x of g.items) sel.mods.delete(String(x.id));
      sel.mods.set(String(it.id), 1);
      return;
    }
    const itemMax = it.max > 0 ? it.max : 1;
    if (cur < itemMax && (!g.max || groupTotal(g, sel) < g.max)) sel.mods.set(String(it.id), cur + 1);
    else if (cur) sel.mods.delete(String(it.id));
    else toast(`В «${g.name}» можно выбрать не больше ${g.max}`);
  }

  /** Экран блюда (шторка): фото, метки, название, выбор, описание, КБЖУ, аллергены, кнопка. Его же рисует превью админки. */
  function productDetailHtml(p, sel = null) {
    const grams = gramsOf(p.weight);
    const perDish = S.nutri === 'dish' && grams;
    const k = perDish ? grams / 100 : 1;
    const fmt = (v) => (Math.round(v * k * 10) / 10).toLocaleString('ru-RU');
    const nutri = [['Белки', p.fiberAmount], ['Жиры', p.fatAmount], ['Углеводы', p.carbohydrateAmount], ['Ккал', p.energyAmount]]
      .filter(([, v]) => v != null);
    const allergens = [...new Set([...(p.allergensText || []), ...(p.allergens || []).map((a) => a.name || a)].filter(Boolean))];
    const r = sel ? resolveSel(p, sel) : null;
    const lineQty = r ? S.cart[r.key]?.qty || 0 : S.cart[String(p.id)]?.qty || 0;
    const qty = qtyOf(p);
    const price = r ? r.price : Number(p.price) || 0;
    const weight = r?.weight ? `${r.weight} ${/\d\s*(мл|л)(?![а-яё])/i.test(String(p.weight || '')) ? 'мл' : 'г'}` : p.weight;
    const stopped = isStopped(p);
    const liquid = /\d\s*(мл|л)(?![а-яё])/i.test(String(p.weight || ''));
    const toggle = grams ? `<div class="nutri-toggle">
        <button data-nutri="dish" class="${perDish ? 'is-active' : ''}">${liquid ? 'Порция' : 'Блюдо'}</button><button data-nutri="100" class="${perDish ? '' : 'is-active'}">100 ${liquid ? 'мл' : 'грамм'}</button></div>` : '';
    return `<div class="product__photo">${imgHtml(p, 'product-hero', 720)}
        <button class="product__close" data-sheet-close aria-label="Закрыть"><img src="${UI('close-white.svg')}" alt=""></button>
        ${qty && !stopped ? `<span class="dish__count dish__count--hero" aria-label="В заказе ${qty}">${qty}</span>` : ''}</div>
      <div class="product__info">
        ${tagsHtml(p, { text: true })}
        <h2 class="product__name">${esc(p.name)}</h2>
        ${weight || p.stopBalance ? `<div class="product__weight">${esc(weight || '')}${p.stopBalance && !stopped ? `${weight ? ' · ' : ''}осталось ${Number(p.stopBalance)} шт.` : ''}</div>` : ''}
        ${alcoNoteHtml(p)}
        ${sel && !stopped ? optionsHtml(p, sel) : ''}
        ${p.description ? `<div class="product__block"><div class="product__label">Описание</div><p>${esc(p.description)}</p></div>` : ''}
        ${nutri.length ? `<div class="product__block"><div class="product__label product__label--row">Пищевая ценность${toggle}</div>
          <div class="nutri">${nutri.map(([label, v]) => `<div><b>${fmt(v)}</b>${label}</div>`).join('')}</div></div>` : ''}
        ${allergens.length ? `<div class="product__block"><div class="product__label">Аллергены</div><p>${esc(allergens.join(', '))}</p></div>` : ''}
      </div>
      <div class="product__cta">
        ${stopped ? `<button class="btn btn--dark btn--center" disabled>${Number(p.price) ? 'Закончился' : 'Скоро в продаже'}</button>`
    : !lineQty && isAlco(p) && !alcoOpen() ? `<button class="btn btn--dark btn--center btn--muted" disabled>${esc(alcoClosedText())}</button>`
    : r?.missing.length ? `<button class="btn btn--dark btn--center btn--muted" data-need>Выберите: ${esc(r.missing.join(', '))}</button>`
      : lineQty ? `<div class="btn btn--dark btn--qty"><button data-dec="${esc(p.id)}" aria-label="Убрать">${ICONS.minus}</button>
          <span>${rub(lineQty * price)}<i></i>${lineQty}</span><button data-inc="${esc(p.id)}" aria-label="Добавить">${ICONS.plus}</button></div>`
        : `<button class="btn btn--dark btn--center" data-inc="${esc(p.id)}">Добавить • ${rub(price)}</button>`}
      </div>`;
  }

  function openProduct(id) {
    // Подсказка AI может быть блюдом, которого уже нет в загруженном меню, — карточка из её данных
    const r = findProduct(id) ? null : (S.ai.results || []).find((x) => String(x.productId) === String(id));
    const p = findProduct(id) || (r && { id: r.productId, iikoId: r.iikoId, name: r.name, price: r.price, image: r.image, weight: r.weight, description: r.description });
    if (!p) return;
    // Алкоголь: сначала заглушка 18+ — карточку открываем только после «Да»
    if (isAlco(p) && needAge()) { openAgeModal(() => openProduct(id)); return; }
    const sel = hasOptions(p) ? initSel(p) : null;
    const draw = () => productDetailHtml(p, sel);
    const redraw = () => {
      const box = $('#product-sheet'); // шторку могла сменить форма входа за стол
      if (box) { const top = box.closest('.sheet')?.scrollTop; box.innerHTML = draw(); watchLiveVideos(box); if (top != null) box.closest('.sheet').scrollTop = top; }
    };
    S.productRedraw = redraw; // после ответа «Да» в окне 18+ блюдо добавляется позже нажатия — карточка перерисовывается отсюда
    openSheet(`<div id="product-sheet">${draw()}</div>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]'); const nutri = e.target.closest('[data-nutri]');
        const size = e.target.closest('[data-size]'); const mod = e.target.closest('[data-mod]'); const need = e.target.closest('[data-need]');
        if (sel && (inc || dec)) { const v = resolveSel(p, sel); changeQty(p, inc ? 1 : -1, inc ? { sel: v } : { key: v.key }); }
        else if (inc) changeQty(p, 1);
        else if (dec) changeQty(p, -1);
        else if (nutri) S.nutri = nutri.dataset.nutri;
        else if (size && sel) { sel.sizeId = size.dataset.size; sel.mods = new Map(); for (const g of groupsFor(p, sel)) fillDefaults(g, sel); }
        else if (mod && sel) toggleMod(p, sel, mod.dataset.mod, Number(mod.dataset.group));
        else if (need) {
          // Прокручиваем к первой невыбранной группе: на телефоне она часто под большим фото
          const groups = groupsFor(p, sel);
          const gi = groups.findIndex((g) => groupTotal(g, sel) < g.min);
          const el = sheet.querySelector(`[data-group-block="${gi}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast(`Выберите: ${resolveSel(p, sel).missing.join(', ')}`, true);
          return;
        }
        else return;
        e.stopPropagation();
        redraw();
      });
    }, { cls: 'sheet--product' });
  }


  // ── Конструктор бизнес-ланча («Собери свой ланч») ────────────
  // Наборы и ассортимент — catalog.businessLunch (сервер: настройки админки, время действия точки).
  // Заказ — обычная позиция с модификаторами (resolveSel), напиток — отдельная позиция бара.
  const lunch = () => S.catalog?.businessLunch || null;
  /** Где в меню карточка бизнес-ланча: раздел из админки («первой / последней / на месте №N») или, по умолчанию, первой в разделе «Бизнес-ланч». */
  function lunchSpot() {
    const gid = lunchGroupId();
    if (!gid) return null;
    const pl = lunch().placement;
    const closed = closedGroupIds();
    const to = pl && (S.catalog.groups || []).some((g) => String(g.id) === String(pl.groupId)) && !closed.has(String(pl.groupId)) ? pl : null;
    return to ? { gid: String(to.groupId), position: to.position, index: to.index || 1 } : closed.has(gid) ? null : { gid, position: 'first', index: 1 };
  }
  /** Раздел «Бизнес-ланч» кухни: там лежат наборы (сервер помечает их lunchCombo). */
  const lunchGroupId = () => {
    if (!lunch()?.combos?.length) return null;
    const p = (S.catalog.products || []).find((x) => x.lunchCombo && !x.isAlias) || (S.catalog.products || []).find((x) => x.lunchCombo);
    return p ? String(p.parentGroup) : null;
  };
  const lunchPrice = (c) => (c.fixed ? rub(c.price) : `от ${rub(c.price)}`);
  const lunchOffText = () => `Доступен ${lunch().text}`;
  /** Бизнес-ланч в меню — одна позиция с большим фото; нажатие открывает конструктор (набор → шаги) */
  function lunchCard() {
    const b = lunch();
    if (!b?.combos?.length) return '';
    const min = Math.min(...b.combos.map((c) => Number(c.price) || 0));

    return `<article class="dish dish--big lunch-card ${b.active ? '' : 'is-off'}" data-lunch-open role="button" tabindex="0" aria-label="Бизнес-ланч — собрать набор">
        <div class="dish__photo">${b.image ? imgHtml({ image: b.image, name: 'Бизнес-ланч' }, 'dish__img', 720) : '<div class="lunch-card__ph">🍱</div>'}
          <span class="lunch-card__time">${b.active ? esc(b.text) : esc(lunchOffText())}</span></div>
        <div class="dish__overlay"><div class="dish__name">Бизнес-ланч<small>Собери свой ланч · ${b.combos.length} ${b.combos.length > 4 ? 'наборов' : 'набора'}</small></div>
          <span class="price-pill price-pill--big">от ${rub(min)}</span></div>
      </article>`;
  }
  /** Поиск: «ланч», «бизнес» или название набора/блюда набора — показать позицию бизнес-ланча */
  function lunchMatches(q) {
    const b = lunch();
    if (!q || !b?.combos?.length) return false;
    const n = (t) => String(t || '').toLowerCase().replace(/ё/g, 'е');
    const hay = ['бизнес-ланч бизнес ланч', ...b.combos.flatMap((c) => [c.title, ...c.steps.flatMap((st) => st.items.map((i) => i.name))])].map(n).join(' | ');
    return hay.includes(n(q));
  }
  function lunchBanner() {
    const b = lunch();
    if (!b?.combos?.length) return '';
    return `<section class="lunch-banner ${b.active ? '' : 'is-off'}" data-lunch-open role="button" tabindex="0" aria-label="Собери свой ланч">
      <div class="lunch-banner__top"><span class="lunch-banner__tag">Бизнес-ланч</span>
        <span class="lunch-banner__time">${b.active ? `Сейчас · ${esc(b.text)}` : esc(lunchOffText())}</span></div>
      <h3 class="lunch-banner__title">Собери свой ланч</h3>
      <ul class="lunch-banner__list">${b.combos.map((c) => `<li><span>${esc(c.title)}</span><b>${lunchPrice(c)}</b></li>`).join('')}</ul>
      <span class="lunch-banner__cta">${b.active ? 'Собрать ланч' : 'Посмотреть состав'}<img src="${UI('chevron-white.svg')}" alt=""></span>
    </section>`;
  }

  let LC = null; // состояние конструктора: { combo, product, sel, i (экран), drink }
  const lunchScreens = () => {
    const b = lunch();
    if (!LC.combo) return ['combo'];
    return [...(b.combos.length > 1 ? ['combo'] : []), ...LC.combo.steps.map((_, k) => k), ...(b.drinks?.length ? ['drink'] : [])];
  };
  function lunchPick(c) {
    const product = findProduct(c.productId);
    if (!product) { toast('Набор сейчас недоступен', true); return; }
    LC.combo = c; LC.product = product;
    LC.sel = { sizeId: c.sizeId || null, mods: new Map() };
    LC.drink = null;
    for (const g of groupsFor(product, LC.sel)) fillDefaults(g, LC.sel);
    LC.i = lunchScreens().findIndex((x) => x !== 'combo');
  }
  const lunchMissing = (k) => {
    const g = groupsFor(LC.product, LC.sel)[k];
    return g && groupTotal(g, LC.sel) < g.min ? g.name : null;
  };
  function lunchTotals() {
    const r = LC.combo ? resolveSel(LC.product, LC.sel) : null;
    const drink = LC.drink ? lunch().drinks.find((d) => d.id === LC.drink) : null;
    return { r, drink, price: r ? r.price : 0 };
  }
  function lunchHtml() {
    const b = lunch();
    const screens = lunchScreens();
    const cur = screens[LC.i];
    const { r, drink, price } = lunchTotals();
    const labels = screens.map((x) => (x === 'combo' ? 'Набор' : x === 'drink' ? 'Напиток' : LC.combo.steps[x].title));
    const progress = LC.combo ? `<div class="lunch__progress" role="list">${screens.map((x, n) => `<button class="lunch__seg ${n < LC.i ? 'is-done' : ''} ${n === LC.i ? 'is-cur' : ''}" data-lunch-go="${n}" role="listitem" aria-label="${esc(labels[n])}"><i></i><span>${esc(labels[n])}</span></button>`).join('')}</div>` : '';
    let body = '';
    let foot = '';
    const off = !b.active;
    if (cur === 'combo') {
      body = `<h3 class="lunch__h">Выберите набор</h3><div class="lunch__combos">${b.combos.map((c) => `<button class="lunch-combo ${LC.combo?.id === c.id ? 'is-on' : ''} ${c.stopped ? 'is-stopped' : ''} ${c.image ? 'has-img' : ''}" data-lunch-combo="${esc(c.id)}" ${c.stopped ? 'disabled' : ''}>
          ${c.image ? `<span class="lunch-combo__img"><img src="${esc(imgSrc(c.image, 160))}" alt="" loading="lazy"></span>` : ''}
          <span class="lunch-combo__name">${esc(c.title)}${c.weight ? `<small>${esc(c.weight)}</small>` : ''}</span><span class="lunch-combo__steps">${esc(c.steps.map((s) => s.title).join(' · '))}</span>
          ${c.description ? `<span class="lunch-combo__desc">${esc(c.description)}</span>` : ''}
          <b class="lunch-combo__price">${c.stopped ? 'Недоступен' : lunchPrice(c)}</b></button>`).join('')}</div>`;
      foot = '';
    } else if (cur === 'drink') {
      body = `<h3 class="lunch__h">Напиток к ланчу<small>по желанию · отдельная позиция по цене ланча</small></h3><div class="lunch__drinks">${b.drinks.map((d) => `<button class="lunch-drink ${LC.drink === d.id ? 'is-on' : ''} ${d.stopped ? 'is-stopped' : ''}" data-lunch-drink="${esc(d.id)}" ${d.stopped ? 'disabled' : ''}>
          <span class="lunch-drink__img">${d.image ? `<img src="${esc(imgSrc(d.image, 160))}" alt="" loading="lazy">` : esc(d.name.slice(0, 1))}</span>
          <span class="lunch-drink__name">${esc(d.name)}${d.weight ? `<small>${esc(d.weight)}</small>` : ''}</span>
          <b>${d.stopped ? 'Закончился' : rub(d.price)}</b><i class="lunch-check" aria-hidden="true"></i></button>`).join('')}</div>`;
    } else {
      const st = LC.combo.steps[cur];
      const g = groupsFor(LC.product, LC.sel)[cur];
      body = `<h3 class="lunch__h">${esc(st.title)}<small>${esc(groupHint(g || st))}</small></h3><div class="lunch__grid">${st.items.map((it) => {
        const on = (LC.sel.mods.get(String(it.id)) || 0) > 0;
        const img = it.image ? imgSrc(it.image, 320) : null;
        return `<button class="lunch-item ${on ? 'is-on' : ''}" data-lunch-item="${esc(it.id)}" data-step="${cur}">
          <span class="lunch-item__photo">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<em>${esc(it.name.slice(0, 1))}</em>`}<i class="lunch-check" aria-hidden="true"></i></span>
          <span class="lunch-item__name">${esc(it.name)}</span>
          ${it.description ? `<span class="lunch-item__desc">${esc(it.description)}</span>` : ''}
          <span class="lunch-item__meta">${esc(it.weight || '')}${!LC.combo.fixed && it.price > 0 ? `${it.weight ? ' · ' : ''}+${rub(it.price)}` : ''}</span></button>`;
      }).join('')}</div>`;
    }
    // Пока набор не собран — цена набора («390 ₽» или «от 390 ₽»), а не сумма уже выбранных блюд
    const complete = LC.combo && groupsFor(LC.product, LC.sel).every((g) => groupTotal(g, LC.sel) >= g.min) && price >= LC.combo.price;
    const total = LC.combo ? `<div class="lunch__total"><span>Набор · <b>${complete ? rub(price) : lunchPrice(LC.combo)}</b></span>${drink ? `<small>+ ${esc(drink.name)} ${rub(drink.price)}</small>` : ''}</div>` : '';
    const last = LC.i === screens.length - 1;
    if (LC.combo) {
      const missing = typeof cur === 'number' ? lunchMissing(cur) : null;
      const incomplete = r?.missing?.length || (!(price > 0));
      let btn;
      if (!last) btn = missing ? `<button class="btn btn--dark btn--center btn--muted" data-lunch-need>Выберите: ${esc(missing)}</button>` : `<button class="btn btn--dark btn--center" data-lunch-next>Далее</button>`;
      else if (off) btn = `<button class="btn btn--dark btn--center btn--muted" disabled>${esc(lunchOffText())}</button>`;
      else if (incomplete) btn = `<button class="btn btn--dark btn--center btn--muted" data-lunch-need>Выберите: ${esc((r?.missing || []).join(', ') || 'блюда набора')}</button>`;
      else btn = `<button class="btn btn--dark btn--center" data-lunch-add>Добавить в заказ • ${rub(price + (drink?.price || 0))}</button>`;
      foot = `${total}${off && !last ? `<div class="lunch__off">${esc(lunchOffText())} — пока можно посмотреть состав</div>` : ''}${btn}`;
    }
    return `<header class="lunch__head"><div><h2>Собери свой ланч</h2><div class="lunch__time ${off ? 'is-off' : ''}">${off ? esc(lunchOffText()) : `Сейчас действует · ${esc(b.text)}`}</div></div>
        <button class="lunch__close" data-sheet-close aria-label="Закрыть"><img src="${UI('close.svg')}" alt=""></button></header>
      ${progress}
      <div class="lunch__body" id="lunch-body">${body}</div>
      ${foot ? `<footer class="lunch__foot">${foot}</footer>` : ''}`;
  }
  function openLunch(comboId = null) {
    const b = lunch();
    if (!b?.combos?.length) return;
    LC = { combo: null, product: null, sel: null, i: 0, drink: null };
    if (comboId) { const c = b.combos.find((x) => x.id === comboId); if (c) lunchPick(c); }
    else if (b.combos.length === 1) lunchPick(b.combos[0]);
    openSheet(`<div id="lunch-sheet" class="lunch">${lunchHtml()}</div>`, (sheet) => {
      const redraw = ({ top = false } = {}) => {
        const box = $('#lunch-sheet');
        if (!box) return;
        const prev = $('#lunch-body')?.scrollTop || 0;
        box.innerHTML = lunchHtml();
        const body = $('#lunch-body');
        if (body) body.scrollTop = top ? 0 : prev;
        box.querySelector('.lunch__seg.is-cur')?.scrollIntoView({ inline: 'center', block: 'nearest' });
      };
      sheet.addEventListener('click', (e) => {
        const t = e.target;
        const combo = t.closest('[data-lunch-combo]'); const item = t.closest('[data-lunch-item]'); const drink = t.closest('[data-lunch-drink]');
        const go = t.closest('[data-lunch-go]'); const next = t.closest('[data-lunch-next]'); const need = t.closest('[data-lunch-need]'); const add = t.closest('[data-lunch-add]');
        if (combo) { lunchPick(lunch().combos.find((c) => c.id === combo.dataset.lunchCombo)); redraw({ top: true }); }
        else if (item) {
          const k = Number(item.dataset.step);
          toggleMod(LC.product, LC.sel, item.dataset.lunchItem, k);
          redraw();
          // Выбор одного блюда в шаге — сразу к следующему шагу
          const g = groupsFor(LC.product, LC.sel)[k];
          if (g?.max === 1 && !lunchMissing(k) && LC.i < lunchScreens().length - 1) {
            clearTimeout(LC.timer);
            LC.timer = setTimeout(() => { if (LC && lunchScreens()[LC.i] === k) { LC.i += 1; redraw({ top: true }); } }, 280);
          }
        }
        else if (drink) { LC.drink = LC.drink === drink.dataset.lunchDrink ? null : drink.dataset.lunchDrink; redraw(); }
        else if (go) {
          const n = Number(go.dataset.lunchGo);
          // Вперёд — только через уже выбранные шаги
          const screens = lunchScreens();
          if (n <= LC.i || screens.slice(0, n).every((x) => typeof x !== 'number' || !lunchMissing(x))) { clearTimeout(LC.timer); LC.i = n; redraw({ top: true }); }
        }
        else if (next) { clearTimeout(LC.timer); LC.i += 1; redraw({ top: true }); }
        else if (need) {
          const cur = lunchScreens()[LC.i];
          const m = typeof cur === 'number' ? lunchMissing(cur) : null;
          toast(`Выберите: ${m || resolveSel(LC.product, LC.sel).missing.join(', ') || 'блюда набора'}`, true);
        }
        else if (add) {
          const { r, drink: d } = lunchTotals();
          if (!lunch().active || r.missing.length) return;
          const dp = d ? findProduct(d.productId) : null;
          const product = LC.product;
          const doAdd = () => {
            changeQty(product, 1, { sel: r });
            if (dp) changeQty(dp, 1);
            toast('Набор добавлен в заказ');
          };
          closeSheet();
          if (!S.session) openSeatSheet(doAdd); else doAdd();
        }
        else return;
        e.stopPropagation();
      });
    }, { cls: 'sheet--lunch' });
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#app [data-lunch-open]')) openLunch();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-lunch-open]')) { e.preventDefault(); openLunch(); }
  });

  // ── Онлайн-оплата CloudPayments ─────────────────────────────
  function loadCpWidget() {
    if (window.cp?.CloudPayments) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'https://widget.cloudpayments.ru/bundles/cloudpayments.js';
      sc.onload = () => resolve();
      sc.onerror = () => reject(new Error('Не удалось открыть оплату — проверьте интернет'));
      document.head.append(sc);
    });
  }
  /** Виджет CloudPayments → проверка оплаты на сервере по номеру счёта (колбэка нет). */
  async function runOnlinePay(tip, guestIds = null) {
    const p = await api('POST', '/api/v1/table/pay/start', { sessionId: S.sessionId, tipAmount: tip, guestIds });
    await loadCpWidget();
    const outcome = await new Promise((resolve) => {
      const widget = new window.cp.CloudPayments({ language: 'ru-RU' });
      widget.pay('charge', {
        publicId: p.publicId, description: p.description, amount: p.amount, currency: 'RUB',
        invoiceId: p.invoiceId, accountId: p.accountId, skin: 'mini',
      }, { onSuccess: () => resolve({ ok: true }), onFail: (reason) => resolve({ ok: false, reason }), onComplete: () => {} });
    });
    // Гость закрыл окно или банк отказал: один раз сверяемся с сервером и не ждём зря
    const tries = outcome.ok ? 8 : 1;
    for (let i = 0; i < tries; i++) {
      const r = await api('POST', '/api/v1/table/pay/confirm', { sessionId: S.sessionId, invoiceId: p.invoiceId });
      if (r.session) applySession(r.session);
      if (r.status === 'completed') return 'ok';
      if (r.status === 'failed') throw new Error(r.reason ? `Оплата не прошла: ${r.reason}` : 'Оплата не прошла');
      if (i < tries - 1) await new Promise((res) => setTimeout(res, 2000));
    }
    return outcome.ok ? 'pending' : 'cancelled';
  }

  function openFeedbackSheet() {
    const st = { rating: 0 };
    const draw = () => `<div style="text-align:center"><div class="orb orb--sm" style="margin:8px auto 16px"></div></div>
      <h2 style="text-align:center">${S.session?.isPaid ? 'Оплачено! ' : ''}Как вам визит?</h2>
      <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= st.rating ? 'is-on' : ''}" aria-label="${n}">★</button>`).join('')}</div>
      <textarea class="field" id="fb-comment" placeholder="Комментарий (необязательно)" maxlength="1000"></textarea>
      <button class="btn btn--dark" data-send style="margin-top:16px" ${st.rating ? '' : 'disabled'}><span>Отправить</span><span class="round-btn">${ICONS.arrowRight}</span></button>
      <button class="link-btn" data-skip style="display:block;margin:8px auto 0">Пропустить</button>`;
    openSheet('<div id="fb-sheet"></div>', (sheet) => {
      const box = $('#fb-sheet'); box.innerHTML = draw();
      sheet.addEventListener('click', async (e) => {
        const star = e.target.closest('[data-star]');
        if (star) { const c = $('#fb-comment').value; st.rating = Number(star.dataset.star); box.innerHTML = draw(); $('#fb-comment').value = c; return; }
        if (e.target.closest('[data-skip]')) { closeSheet(); return; }
        const send = e.target.closest('[data-send]');
        if (send) {
          if (st.busy) return;
          st.busy = true; send.disabled = true;
          try {
            await api('POST', '/api/v1/table/feedback', { sessionId: S.sessionId, rating: st.rating, comment: $('#fb-comment').value });
            if (S.session) S.session.feedbackLeft = true;
            closeSheet(); toast('Спасибо за отзыв!'); render();
          } catch (err) { toast(err.message, true); st.busy = false; send.disabled = false; }
        }
      });
    });
  }

  // ── Действия ───────────────────────────────────────────────
  async function submitToWaiter() {
    if (!pendingCount()) { toast('Корзина пуста — добавьте блюда', true); return; }
    if (S.submitting) return; // повторное нажатие, пока заказ уходит
    S.submitting = true; render();
    clearTimeout(saveTimer);
    try {
      const session = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: S.sessionId, items: payloadItems(), ageConfirmed: ageOk() });
      S.cartDirty = false;
      S.changedSinceSubmit = false; store.set('changedSinceSubmit', false);
      applySession(session);
      toast(session.workflowStatus === 'reorder_pending' ? 'Дозаказ передан официанту' : 'Заказ передан — официант скоро подойдёт');
      go('order');
    } catch (e) {
      if (!alcoServerError(e, submitToWaiter)) toast(e.network ? 'Нет связи. Корзина сохранена — попробуйте ещё раз' : e.message, true);
    } finally {
      S.submitting = false; render();
    }
  }

  async function sendBillRequest(guestIds = null, method = null, part = null, quiet = false) {
    try {
      applySession(await api('POST', '/api/v1/table/request-bill', { sessionId: S.sessionId, guestIds, method, part }));
      if (!quiet) toast(method === 'cash' ? 'Официант принесёт счёт — оплата наличными' : 'Официант принесёт счёт и терминал');
      render();
    } catch (e) { toast(e.message, true); }
  }

  /**
   * Счёт: как платить (онлайн — только кухня; картой официанту; наличными) и за кого
   * (весь стол, только мой заказ или отмеченные гости — например, за себя и спутницу).
   * Бар онлайн не оплачивается: после онлайн-оплаты кухни официанту уходит запрос на бар картой.
   */
  function requestBill() {
    const s = S.session;
    if (!s) return;
    const guests = s.guests || [];
    const multi = guests.length > 1;
    const me = String(S.guest?.id || '');
    const online = Boolean(S.config?.onlinePay);
    const paidOnline = s.onlinePaid || { wholeTable: false, guestIds: [] };
    const isBar = (i) => (i.source || 'main') !== 'main';
    // Оплачено онлайн — по строкам (сервер помечает каждую); старый ответ без пометок — по гостям
    const covered = (i) => (i.paidOnline !== undefined ? i.paidOnline : paidOnline.wholeTable || paidOnline.guestIds.includes(String(i.guestId)));
    const picked = new Set(guests.map((g) => String(g.id)));
    const tips = S.config?.tipPresets || [0, 10, 15, 20];
    const st = { method: online ? 'online' : 'card', tipPct: 0, busy: false };
    const inScope = (i) => !multi || picked.size === guests.length || picked.has(String(i.guestId));
    // В счёт — только переданное на кухню; черновики корзин не оплачиваются
    const sent = (s.items || []).filter((i) => i.isLocked);
    const sum = (list) => list.reduce((n, i) => n + i.lineTotal, 0);
    const amounts = () => {
      const items = sent.filter(inScope);
      const kitchen = sum(items.filter((i) => !isBar(i) && !covered(i)));
      const bar = sum(items.filter(isBar));
      return { kitchen, bar, all: sum(items.filter((i) => isBar(i) || !covered(i))) };
    };
    const sumOf = (id) => sum(sent.filter((i) => String(i.guestId) === String(id)));
    const noGuest = sum(sent.filter((i) => !i.guestId));
    const tipAmount = (base) => Math.round((base * st.tipPct) / 100);
    const methodsHtml = () => {
      const list = [...(online ? [['online', 'Онлайн']] : []), ['card', 'Картой официанту'], ['cash', 'Наличными']];
      return `<div class="label">Как оплатить</div>
        <div class="opt-grid" style="grid-template-columns:repeat(${list.length},1fr)">${list.map(([id, label]) => `<button class="opt ${st.method === id ? 'is-active' : ''}" data-bill-method="${id}">${label}</button>`).join('')}</div>`;
    };
    const draw = () => {
      const all = picked.size === guests.length;
      const a = amounts();
      const isOnline = st.method === 'online';
      const tip = isOnline ? tipAmount(a.kitchen) : 0;
      const canSend = (!multi || picked.size) && (isOnline ? a.kitchen > 0 : a.all > 0);
      const label = isOnline ? `Оплатить онлайн ${rub(a.kitchen + tip)}` : `Попросить счёт ${rub(a.all)}`;
      return `<h2>Счёт</h2>
        ${methodsHtml()}
        ${multi ? `<div class="label">За кого платите</div>
        <div class="opt-grid" style="grid-template-columns:1fr 1fr">
          <button class="opt ${all ? 'is-active' : ''}" data-bill-all>Весь стол</button>
          <button class="opt ${picked.size === 1 && picked.has(me) ? 'is-active' : ''}" data-bill-me>Только мой заказ</button>
        </div>
        <div class="bill-guests">${guests.map((g) => `<label class="bill-guest">
            <input type="checkbox" data-bill-guest="${esc(g.id)}" ${picked.has(String(g.id)) ? 'checked' : ''}>
            <span class="bill-guest__box">${ICONS.check}</span>
            <span class="bill-guest__name">${esc(g.name)}${String(g.id) === me ? ' <i>(вы)</i>' : ''}</span>
            <b>${rub(sumOf(g.id))}</b></label>`).join('')}
          ${noGuest ? `<div class="bill-guest bill-guest--note"><span class="bill-guest__name">Добавил официант, без гостя</span><b>${rub(noGuest)}</b></div>` : ''}
        </div>
        ${noGuest && !all ? '<p class="sheet__hint" style="margin-top:8px">Блюда без гостя входят только в счёт за весь стол.</p>' : ''}` : ''}
        ${isOnline ? `<div class="card" style="margin-top:14px">
            <div class="sum-rows"><span>Кухня — онлайн</span><span>${rub(a.kitchen)}</span></div>
            ${a.bar ? `<div class="sum-rows"><span>Бар — картой официанту</span><span>${rub(a.bar)}</span></div>` : ''}
            ${tip ? `<div class="sum-rows"><span>Чаевые</span><span>${rub(tip)}</span></div>` : ''}
          </div>
          <div class="label">Чаевые</div>
          <div class="opt-grid">${tips.map((t) => `<button class="opt ${st.tipPct === t ? 'is-active' : ''}" data-tip="${t}">${t ? `${t}%` : 'Без чаевых'}</button>`).join('')}</div>
          ${a.kitchen <= 0 ? '<p class="sheet__hint">Кухня уже оплачена — остаток официанту картой.</p>' : ''}
          ${a.bar ? '<p class="sheet__hint">Напитки бара онлайн не оплачиваются — официант подойдёт с терминалом.</p>' : ''}`
    : `<p class="sheet__hint" style="margin-top:12px">${st.method === 'cash' ? 'Официант принесёт счёт — оплата наличными.' : 'Официант принесёт счёт и терминал.'}</p>`}
        <button class="btn btn--dark" data-bill-send ${canSend && !st.busy ? '' : 'disabled'} style="margin-top:14px"><span>${st.busy ? 'Оплачиваем…' : label}</span><span class="round-btn">${st.busy ? '<div class="spinner spinner--dark"></div>' : ICONS.arrowRight}</span></button>
        ${isOnline ? '<p class="muted" style="font-size:12px;text-align:center;margin-top:12px">Картой, СБП или SberPay через CloudPayments. Данные карты не попадают в меню.</p>' : ''}`;
    };
    const send = async (box) => {
      const all = !multi || picked.size === guests.length;
      const ids = all ? null : [...picked];
      if (st.method !== 'online') { closeSheet(); sendBillRequest(ids, st.method); return; }
      const a = amounts();
      st.busy = true; box.innerHTML = draw();
      try {
        const res = await runOnlinePay(tipAmount(a.kitchen), ids);
        if (res === 'cancelled') { st.busy = false; box.innerHTML = draw(); toast('Оплата отменена'); return; }
        if (a.bar > 0) await sendBillRequest(ids, 'card', 'bar', true);
        render();
        if (res === 'ok') {
          toast(a.bar > 0 ? 'Кухня оплачена. Бар — картой официанту, он уже идёт' : 'Оплачено, спасибо!');
          if (S.session?.isPaid) { openFeedbackSheet(); return; }
          closeSheet(); return;
        }
        toast('Проверяем оплату — статус обновится в течение минуты');
        closeSheet(); refreshSession(true);
      } catch (err) {
        st.busy = false; toast(err.message, true);
        if (err.status === 409) { closeSheet(); refreshSession(true); return; }
        box.innerHTML = draw();
      }
    };
    openSheet('<div id="bill-sheet"></div>', (sheet) => {
      const box = $('#bill-sheet'); box.innerHTML = draw();
      sheet.addEventListener('click', (e) => {
        if (st.busy) return;
        const m = e.target.closest('[data-bill-method]'); const t = e.target.closest('[data-tip]');
        if (m) st.method = m.dataset.billMethod;
        else if (t) st.tipPct = Number(t.dataset.tip);
        else if (e.target.closest('[data-bill-all]')) guests.forEach((g) => picked.add(String(g.id)));
        else if (e.target.closest('[data-bill-me]')) { picked.clear(); if (me) picked.add(me); }
        else if (e.target.closest('[data-bill-send]')) { send(box); return; }
        else return;
        box.innerHTML = draw();
      });
      sheet.addEventListener('change', (e) => {
        const id = e.target.dataset?.billGuest;
        if (!id) return;
        if (e.target.checked) picked.add(id); else picked.delete(id);
        box.innerHTML = draw();
      });
    });
  }

  async function newVisit() {
    S.cart = {}; persistCart(); S.ai.results = null; store.del('aiResults');
    try { await enterTable(); go('ai'); } catch (e) { toast(e.message, true); }
  }

  /** Шторка «Меню»: разделы плитками с картинками, вкладки «Кухня / Бар». */
  function openCategoriesSheet() {
    const hasBar = barGroupIds().size > 0;
    let section = S.menu.section;
    const groups = new Map((S.catalog?.groups || []).map((g) => [String(g.id), g]));
    const draw = () => {
      const tab = (key, label) => `<button data-cat-tab="${key}" class="${section === key ? 'is-active' : ''}">${label}</button>`;
      return `<button class="sheet__close" data-sheet-close aria-label="Закрыть"><img src="${UI('close.svg')}" alt=""></button>
        <h2 class="sheet__title-center">Меню</h2>
        ${hasBar ? `<div class="cat-tabs">${tab('kitchen', 'Кухня')}${tab('bar', 'Бар')}</div>` : ''}
        <div class="cat-grid">${menuSections(section).map((sec) => {
    const src = catImage({ ...(groups.get(String(sec.id)) || {}), name: sec.name });
    return `<button data-cat-jump="${esc(sec.id)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="cat-grid__emoji">${emojiFor({ parentGroupName: sec.name })}</span>`}<span>${esc(sec.name)}</span></button>`;
  }).join('')}</div>`;
    };
    openSheet('<div id="cats-sheet"></div>', (sheet) => {
      const box = $('#cats-sheet', sheet); box.innerHTML = draw();
      sheet.addEventListener('click', (e) => {
        const t = e.target.closest('[data-cat-tab]');
        if (t) { section = t.dataset.catTab; box.innerHTML = draw(); return; }
        const b = e.target.closest('[data-cat-jump]');
        if (!b) return;
        closeSheet();
        if (section !== S.menu.section) { S.menu.section = section; S.activeCat = null; render(); }
        setTimeout(() => scrollToCategory(b.dataset.catJump), 60);
      });
    }, { cls: 'sheet--white' });
  }

  /** Высота закреплённой сверху части: шапка + строка категорий (с вырезом камеры и полноэкранным режимом). */
  function stickyOffset() {
    const top = document.querySelector('.topbar')?.offsetHeight || 0;
    const bar = document.getElementById('cats')?.offsetHeight || 0;
    return top + bar + 8;
  }
  function markCategory(id, center = true) {
    const bar = document.getElementById('cats');
    const chip = id && bar?.querySelector(`[data-cat="${CSS.escape(String(id))}"]`);
    if (!chip) return;
    S.activeCat = id;
    bar.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-active', b === chip));
    if (center) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }
  // Пока меню едет к выбранному разделу, подсветка не перескакивает на промежуточные
  let spyLockUntil = 0;
  function scrollToCategory(id) {
    let el = document.getElementById(`cat-${id}`);
    // Раздел на другой вкладке (переход из баннера или AI) — сначала переключаем «Кухня / Бар»
    const bar = barGroupIds();
    if (!el && bar.size && S.tab === 'menu') {
      const want = bar.has(String(id)) ? 'bar' : 'kitchen';
      if (want !== S.menu.section) { S.menu.section = want; render(); el = document.getElementById(`cat-${id}`); }
    }
    if (!el) return;
    setTopbarHeight();
    markCategory(id);
    spyLockUntil = Date.now() + 1200;
    const top = el.getBoundingClientRect().top + scrollY - stickyOffset();
    scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  addEventListener('scrollend', () => { spyLockUntil = 0; });

  // Шапка компактнее, когда меню прокручено (как в макете)
  // Порог с запасом (60 / 8 px): шапка меняет высоту, и без запаса на границе она бы мигала
  addEventListener('scroll', () => {
    const html = document.documentElement;
    if (scrollY > 60) html.classList.add('is-scrolled'); else if (scrollY < 8) html.classList.remove('is-scrolled');
  }, { passive: true });

  // Подсветка раздела при прокрутке: активная категория видна в строке
  let spyFrame = 0;
  addEventListener('scroll', () => {
    if (S.tab !== 'menu' || spyFrame || Date.now() < spyLockUntil) return;
    spyFrame = requestAnimationFrame(() => {
      spyFrame = 0;
      setTopbarHeight();
      const bar = document.getElementById('cats');
      if (!bar) return;
      const titles = [...document.querySelectorAll('.section-title')];
      const line = stickyOffset() + 4;
      let cur = titles[0];
      for (const t of titles) { if (t.getBoundingClientRect().top <= line) cur = t; else break; }
      const id = cur?.id?.slice(4);
      if (!id || bar.querySelector('.is-active')?.dataset.cat === id) return;
      markCategory(id);
    });
  }, { passive: true });

  function go(tab) {
    S.tab = tab;
    render();
    scrollTo({ top: 0 });
  }

  // ── Свайп влево по строке корзины — кнопка «удалить» (как в макете) ──
  // Открытая строка хранится в состоянии (S.openLine): перерисовка экрана её не закрывает
  let sw = null;
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('.cart-line__del')) return; // нажатие на «удалить» — строка остаётся открытой
    const row = e.target.closest('[data-swipe-del]');
    if (!row && S.openLine) { S.openLine = null; render(); }
    if (!row || e.target.closest('button')) return;
    sw = { row, id: row.dataset.swipeDel, x0: e.clientX, y0: e.clientY, dx: 0, open: S.openLine === row.dataset.swipeDel, active: false };
  });
  addEventListener('pointermove', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x0;
    if (!sw.active) {
      if (Math.abs(e.clientY - sw.y0) > 10) { sw = null; return; }
      if (Math.abs(dx) < 8) return;
      sw.active = true; S.dragging = true; sw.row.style.transition = 'none';
    }
    sw.dx = Math.max(-84, Math.min(0, dx + (sw.open ? -84 : 0)));
    sw.row.style.transform = `translateX(${sw.dx}px)`;
  });
  const endSwipe = () => {
    if (!sw) return;
    const { row, id, dx, active, open } = sw;
    sw = null; S.dragging = false;
    if (active) { row.style.transition = ''; row.style.transform = ''; S.openLine = dx < -40 ? id : null; }
    else if (open) S.openLine = null; // касание открытой строки — закрыть
    render(); // в том числе то, что пришло с сервера, пока палец тянул строку
  };
  addEventListener('pointerup', endSwipe);
  addEventListener('pointercancel', endSwipe);
  addEventListener('online', () => { S.offline = false; render(); flushCart(); loadCatalog({ quiet: true }); });
  addEventListener('offline', () => { S.offline = true; render(); });

  // ── Рендер ─────────────────────────────────────────────────
  /**
   * Плавный рендер: вместо замены всей страницы обновляем только изменившиеся узлы
   * (картинки не перезагружаются, прокрутка лент и фокус сохраняются, экран не дёргается).
   */
  function morph(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to); return to; }
    if (from.nodeType === 3 || from.nodeType === 8) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return from; }
    if (from.nodeType !== 1) return from;
    for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
    for (const { name, value } of [...to.attributes]) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
    if ((from.tagName === 'INPUT' || from.tagName === 'TEXTAREA') && from !== document.activeElement && from.value !== to.value) from.value = to.value;
    // Дети: по ключу (id / data-product / data-key), без ключа — по порядку с тем же тегом
    const keyOf = (n) => (n.nodeType === 1 ? (n.id || n.getAttribute('data-product') || n.getAttribute('data-key') || null) : null);
    const oldKids = [...from.childNodes];
    const byKey = new Map();
    for (const n of oldKids) { const k = keyOf(n); if (k && !byKey.has(k)) byKey.set(k, n); }
    const used = new Set();
    const result = [];
    let pos = 0;
    for (const next of [...to.childNodes]) {
      const k = keyOf(next);
      let match = null;
      if (k) {
        const m = byKey.get(k);
        if (m && !used.has(m)) match = m;
      } else {
        while (pos < oldKids.length && (used.has(oldKids[pos]) || keyOf(oldKids[pos]))) pos++;
        if (pos < oldKids.length && oldKids[pos].nodeName === next.nodeName) match = oldKids[pos++];
      }
      if (match) { used.add(match); result.push(morph(match, next)); } else result.push(next);
    }
    result.forEach((node, i) => { if (from.childNodes[i] !== node) from.insertBefore(node, from.childNodes[i] || null); });
    while (from.childNodes.length > result.length) from.lastChild.remove();
    return from;
  }

  let lastHtml = '';
  let lastTab = null;
  function render() {
    if (S.dragging) return; // не мешаем свайпу
    const app = $('#app');
    const html = (S.tab === 'menu' ? renderMenu() : S.tab === 'order' ? renderOrder() : renderAi()) + nav();
    const tabChanged = lastTab !== S.tab;
    lastTab = S.tab;
    S.aiFresh = false;
    if (html === lastHtml) return; // ничего не изменилось — экран не трогаем
    lastHtml = html;
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    if (tabChanged || !app.firstChild) {
      app.replaceChildren(...tpl.childNodes);
      app.querySelector('main')?.classList.add('screen-enter');
    } else {
      morph(app, Object.assign(app.cloneNode(false), { innerHTML: html }));
    }
    watchTopbar();
    watchLiveVideos();
  }

  // Строка категорий прилипает ровно под шапкой, какой бы высоты та ни была (вырез камеры, полный экран)
  let topbarObserved = null;
  const topbarRO = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => setTopbarHeight()) : null;
  function setTopbarHeight() {
    const h = document.querySelector('.topbar')?.offsetHeight;
    if (h) document.documentElement.style.setProperty('--topbar-h', `${h}px`);
  }
  addEventListener('resize', () => setTopbarHeight());
  document.addEventListener('fullscreenchange', () => setTimeout(setTopbarHeight, 50));
  function watchTopbar() {
    const el = document.querySelector('.topbar');
    setTopbarHeight();
    if (!topbarRO || !el || el === topbarObserved) return;
    if (topbarObserved) topbarRO.unobserve(topbarObserved);
    topbarRO.observe(el);
    topbarObserved = el;
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const goBtn = t.closest('[data-go]');
    if (goBtn) { go(goBtn.dataset.go); return; }
    const lineInc = t.closest('#app [data-line-inc]'); const lineDec = t.closest('#app [data-line-dec]');
    if (lineInc || lineDec) {
      const key = (lineInc || lineDec).dataset.lineInc || (lineInc || lineDec).dataset.lineDec;
      const line = S.cart[key];
      if (line) changeQty(line.product, lineInc ? 1 : -1, { key });
      return;
    }
    const inc = t.closest('#app [data-inc]'); const dec = t.closest('#app [data-dec]');
    if (inc || dec) {
      const id = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
      const product = findProduct(id) || S.cart[id]?.product || (() => {
        const r = (S.ai.results || []).find((x) => String(x.productId) === String(id));
        return r && { id: r.productId, iikoId: r.iikoId, name: r.name, price: r.price, image: r.image, weight: r.weight };
      })();
      // Блюдо с выбором (размер, соус, основа) добавляется из карточки — там выбор
      if (product && hasOptions(product)) { openProduct(product.id); return; }
      if (product) changeQty(product, inc ? 1 : -1);
      return;
    }
    const remove = t.closest('#app [data-remove]');
    if (remove) {
      // Удалить из корзины всё неотправленное; уже переданное официанту остаётся
      const key = remove.dataset.remove;
      const line = S.cart[key];
      if (line) changeQty(line.product, lockedQty(key) - line.qty, { key });
      return;
    }
    const banner = t.closest('[data-banner]');
    if (banner) { openBanner(banner.dataset.banner); return; }
    const chip = t.closest('[data-chip]');
    if (chip) { askAi(chip.dataset.chip, true); return; }
    if (t.closest('[data-retry]')) { askAi(S.ai.query); return; }
    const sec = t.closest('[data-section]');
    if (sec) {
      if (S.menu.section !== sec.dataset.section) {
        S.menu.section = sec.dataset.section;
        S.activeCat = null;
        render();
        window.scrollTo({ top: 0 });
      }
      return;
    }
    const cat = t.closest('[data-cat]');
    if (cat) {
      scrollToCategory(cat.dataset.cat);
      return;
    }
    const card = t.closest('#app .dish');
    if (card && !t.closest('button')) { openProduct(card.dataset.product); return; }
    const action = t.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'seat') openSeatSheet();
    else if (action === 'restaurant') openRestaurantSheet();
    else if (action === 'place') openPlaceSheet();
    else if (action === 'exit-fullscreen') exitFullscreen();
    else if (action === 'call') { if (S.session) openCallSheet(); else openSeatSheet(openCallSheet); }
    else if (action === 'submit') submitToWaiter();
    else if (action === 'bill') requestBill();
    else if (action === 'all-cats') openCategoriesSheet();
    else if (action === 'clear-search') { S.menu.search = ''; render(); $('#search')?.focus(); }
    else if (action === 'reload-catalog') { S.catalogError = null; render(); loadCatalog(); }
    else if (action === 'ask-ai-search') { const q = S.menu.search; S.menu.search = ''; go('ai'); askAi(q); }
    else if (action === 'feedback') openFeedbackSheet();
    else if (action === 'new-visit') newVisit();
    else if (action === 'clear') {
      if (!confirm('Убрать из корзины всё, что ещё не передано официанту?')) return;
      for (const [k, l] of Object.entries(S.cart)) {
        const locked = lockedQty(k);
        if (locked) S.cart[k] = { ...l, qty: locked }; else delete S.cart[k];
      }
      persistCart(); scheduleCartSave(); render();
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'ai-form') { e.preventDefault(); askAi($('#ai-input').value); }
  });
  let searchTimer;
  document.addEventListener('input', (e) => {
    if (e.target.id === 'search') {
      S.menu.search = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 150);
    }
    if (e.target.id === 'ai-input') S.ai.draft = e.target.value; // набранное не теряется при перерисовке
  });

  // ── Старт ──────────────────────────────────────────────────
  /**
   * Меню точки: сразу из копии на телефоне (открывается мгновенно и без сети), затем свежее с сервера.
   * Во время визита меню перезапрашивается раз в минуту — гость видит стоп-лист и цены без перезагрузки.
   */
  const catalogKey = () => `catalog:${S.restaurant || ''}`;
  let catalogBusy = false;
  async function loadCatalog({ quiet = false } = {}) {
    if (catalogBusy) return;
    if (!S.catalog) {
      const cached = store.get(catalogKey());
      if (cached?.products?.length) { S.catalog = cached; syncCartProducts(); render(); }
    }
    catalogBusy = true;
    try {
      // Первый раз — меню, которое страница начала грузить ещё до приложения (index.html)
      const early = window.__catalogEarly;
      window.__catalogEarly = null;
      const fresh = (early && early.slug === S.restaurant && await early.p)
        || await api('GET', `/api/v1/restaurants/${encodeURIComponent(S.restaurant || '')}/catalog`, null, { timeout: 20000 });
      S.catalog = fresh;
      S.catalogError = null;
      saveCatalogCopy(fresh);
      syncCartProducts();
      render();
    } catch (e) {
      if (!S.catalog) { S.catalogError = e.message || 'Не удалось загрузить меню'; render(); }
      else if (!quiet) toast('Нет связи — показываем сохранённое меню', true);
    } finally { catalogBusy = false; }
  }
  /**
   * Копия меню на телефоне — только текущего ресторана, перезапись лишь при изменении.
   * Не хватило места — копия не пишется, а вход, корзина и стол (они важнее) не страдают.
   */
  let savedSig = '';
  function saveCatalogCopy(cat) {
    const key = `fm:${catalogKey()}`;
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('fm:catalog:') && k !== key) localStorage.removeItem(k);
      if (!cat.products?.length) { localStorage.removeItem(key); return; }
      const sig = `${cat.fetchedAt}|${cat.products.length}|${(cat.stopList || []).join(',')}`;
      if (sig === savedSig) return;
      localStorage.setItem(key, JSON.stringify(cat));
      savedSig = sig;
    } catch { try { localStorage.removeItem(key); } catch { /* приватный режим */ } }
  }
  /** Товары в корзине — актуальными данными меню (цена, стоп, остаток). */
  function syncCartProducts() {
    for (const [k, l] of Object.entries(S.cart)) { const p = findProduct(l.product.id); if (p) S.cart[k] = { ...l, product: p }; }
  }
  let catalogTimer = null;
  function startCatalogRefresh() {
    if (catalogTimer) return;
    catalogTimer = setInterval(() => { if (!document.hidden && !S.dragging) loadCatalog({ quiet: true }); }, 60_000);
    // Часы продажи алкоголя закончились (или начались) без перезагрузки — кнопки «в корзину» обновляются сами
    let alcoShown = alcoOpen();
    setInterval(() => { const now = alcoOpen(); if (now !== alcoShown) { alcoShown = now; if (!S.dragging) render(); } }, 15_000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadCatalog({ quiet: true }); });
  }

  let polling = false;
  function startPolling() {
    if (polling) return;
    polling = true;
    setInterval(() => { if (document.hidden) return; if (S.cartDirty) flushCart(); else refreshSession(); }, 10000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSession(); });
  }

  async function startTable() {
    try {
      if (await enterTable()) {
        S.tab = 'ai';
        startPolling();
      }
    } catch (e) {
      // Стол не найден и т.п. — меню остаётся доступным, стол выберут при заказе
      if (e.status !== 401) toast(e.message, true);
    }
    render();
  }

  async function boot() {
    // Быстрый старт: ресторан известен из QR — настройки и меню грузятся параллельно,
    // а копия с прошлого визита показывается сразу (и без сети)
    const cachedConfig = S.restaurant ? store.get(`config:${S.restaurant}`) : null;
    if (cachedConfig?.restaurant) { S.config = cachedConfig; render(); }
    const catalogFirst = S.restaurant ? loadCatalog() : null;
    try {
      const config = await api('GET', `/api/v1/config?restaurant=${encodeURIComponent(S.restaurant || '')}`);
      const slugChanged = config.restaurant.slug !== S.restaurant;
      S.config = config;
      S.restaurant = config.restaurant.slug;
      store.set('restaurant', S.restaurant);
      store.set(`config:${S.restaurant}`, config);
      if (slugChanged) { S.catalog = null; await catalogFirst; loadCatalog(); }
    } catch (e) {
      if (!S.config) {
        $('#app').innerHTML = `<div class="auth"><div class="auth__main"><div class="logo">ФУДЖИ</div><p style="text-align:center">${esc(e.message)}</p>
          <button class="btn btn--dark btn--center" onclick="location.reload()">Повторить</button></div></div>`;
        return;
      }
      S.offline = Boolean(e.network) || S.offline; // работаем по сохранённой копии
    }
    // Меню видно сразу, без входа и выбора стола
    render();
    if (!catalogFirst) loadCatalog();
    startCatalogRefresh();

    const fujiToken = params.get('fujiToken');
    if (fujiToken) {
      history.replaceState(null, '', location.pathname);
      try { await onLoggedIn(await api('POST', '/api/v1/guest/fuji', { token: fujiToken })); } catch (e) { toast(e.message, true); }
      return;
    }
    if (!S.token) return;
    try {
      S.guest = await api('GET', '/api/v1/guest/me');
      store.set('guest', S.guest);
    } catch (e) { return; }
    if (S.table) await startTable();
  }

  /**
   * Превью карточки для админки (?preview=1) — настоящее меню точки, как у гостя: админка присылает (postMessage)
   * точку, вид и блюдо из формы; блюдо подставляется в загруженное меню точки поверх данных iiko.
   * Виды: product — открытая карточка блюда поверх меню; details — карточка, прокрученная к описанию и КБЖУ;
   * list — экран меню с блюдом на своём месте (соседи приглушены). Ничего не заказывает и не сохраняет.
   */
  function bootPreview() {
    document.body.classList.add('is-preview');
    S.cart = {}; S.token = null; S.guest = null; S.session = null; S.sessionId = null;
    let loadedFor = null;
    let base = null;
    let req = 0;
    const CONTENT = ['name', 'description', 'image', 'video', 'weight', 'badge', 'cardSize', 'energyAmount', 'fiberAmount', 'fatAmount', 'carbohydrateAmount'];
    async function ensure(slug) {
      if (loadedFor === slug && base) return;
      S.restaurant = slug;
      S.config = await api('GET', `/api/v1/config?restaurant=${encodeURIComponent(slug)}`);
      const cat = await api('GET', `/api/v1/restaurants/${encodeURIComponent(slug)}/catalog`, null, { timeout: 20000 });
      base = cat;
      loadedFor = slug;
    }
    async function show({ restaurant, view, product }) {
      const my = ++req;
      try { await ensure(restaurant); } catch (e) {
        $('#app').innerHTML = `<div class="empty">Меню точки не загрузилось: ${esc(e.message)}</div>`; return;
      }
      if (my !== req) return;
      const list = base.products.slice();
      const idx = list.findIndex((x) => String(x.id) === String(product.id) || String(x.iikoId) === String(product.id));
      const merged = { ...(idx >= 0 ? list[idx] : { id: product.id || 'preview', price: 0, parentGroup: list[0]?.parentGroup }) };
      // Пустое поле формы — «как в iiko»: оставляем то, что уже в меню точки
      for (const k of CONTENT) if (product[k] != null && product[k] !== '') merged[k] = product[k];
      if (product.allergensText?.length) merged.allergensText = product.allergensText;
      // Метки и размер карточки приходят всегда: пусто — «сняты» в форме
      for (const k of ['badge', 'cardSize']) if (k in product) merged[k] = product[k] || null;
      if (idx >= 0) list[idx] = merged; else list.unshift(merged);
      S.catalog = { ...base, products: list };
      S.menu.search = '';
      S.menu.section = barGroupIds().has(String(merged.parentGroup)) ? 'bar' : 'kitchen';
      S.activeCat = merged.parentGroup;
      S.tab = 'menu';
      $('#sheet-root').innerHTML = ''; document.documentElement.classList.remove('sheet-open');
      lastHtml = '';
      render();
      document.body.classList.toggle('preview-list', view === 'list');
      S.previewFocus = String(merged.id); // класс рисует dishCard — перерисовка его не снимет
      render();
      const el = document.querySelector(`.dish[data-product="${CSS.escape(String(merged.id))}"]`);
      el?.scrollIntoView({ block: 'center' });
      if (view !== 'list') {
        openProduct(merged.id);
        const sheet = document.querySelector('#sheet-root .sheet');
        if (sheet) { sheet.style.animation = 'none'; if (view === 'details') sheet.scrollTop = sheet.scrollHeight; }
      }
    }
    $('#app').innerHTML = '<div class="boot"><div class="orb orb--md"></div></div>';
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || e.data?.type !== 'fuji-preview' || !e.data.product || !e.data.restaurant) return;
      show(e.data);
    });
    // Клики в превью ничего не заказывают и не открывают
    for (const t of ['click', 'submit', 'input']) document.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    window.parent?.postMessage({ type: 'fuji-preview-ready' }, location.origin);
  }

  if (params.get('preview') === '1') bootPreview(); else boot();
})();
