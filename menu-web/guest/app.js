/* Фуджи QR-меню: гость за столом. Без сборки, без зависимостей. */
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
    return hit ? UI(`cats/${hit[1]}.png`) : null;
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
  const imgSrc = (src, w = 480) => {
    if (!src) return null;
    if (/^https?:\/\//.test(src)) return `/img?w=${w}&u=${encodeURIComponent(src)}`;
    if (src.startsWith('/')) return src;
    return `/${src}`;
  };
  const imgHtml = (p, cls = 'dish__img', w = 320) => {
    const src = imgSrc(p.image, w);
    const hero = cls === 'product-hero';
    const lazy = hero ? 'fetchpriority="high"' : 'loading="lazy"';
    // «Живое» меню: короткое видео без звука по кругу; фото — обложка, пока видео грузится.
    // Видео не качается заранее (preload="none") и играет только на экране — список не подвисает.
    if (p.video) {
      return `<div class="${cls} has-video"><video src="${esc(p.video)}" ${src ? `poster="${esc(src)}"` : ''} muted loop playsinline
        preload="${hero ? 'auto' : 'none'}" data-live disablepictureinpicture disableremoteplayback aria-hidden="true"></video></div>`;
    }
    return `<div class="${cls}">${src ? `<img src="${esc(src)}" alt="" ${lazy} decoding="async" onerror="this.remove()">` : ''}${src ? '' : emojiFor(p)}</div>`;
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
  const cartLines = () => Object.values(S.cart).filter((l) => l.qty > 0);
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => cartLines().reduce((s, l) => s + l.qty * (Number(l.product.price) || 0), 0);
  // За столом может быть несколько гостей: корзина гостя — только его позиции
  const myItems = (session = S.session) => (session?.items || [])
    .filter((i) => (i.guestId || null) === (S.guest?.id || null));
  const lockedQty = (pid) => myItems()
    .filter((i) => i.isLocked && (String(i.productId) === String(pid) || String(i.iikoProductId) === String(pid)))
    .reduce((s, i) => s + i.quantity, 0);
  const pendingCount = () => cartLines().reduce((s, l) => s + Math.max(0, l.qty - lockedQty(l.product.id)), 0);
  const isStopped = (p) => p.isInStopList || (S.catalog?.stopList || []).includes(String(p.id));

  function findProduct(id) {
    return (S.catalog?.products || []).find((p) => String(p.id) === String(id) || String(p.iikoId) === String(id));
  }

  /** Корзина = сервер (источник правды) ⊕ несохранённые локальные правки. */
  function cartFromSession(session) {
    const next = {};
    for (const it of myItems(session)) {
      const key = String(it.productId || it.iikoProductId);
      const product = findProduct(key) || { id: key, iikoId: it.iikoProductId, name: it.name, price: it.price };
      if (!next[key]) next[key] = { qty: 0, product, course: null };
      next[key].qty += it.quantity;
      if (!it.isLocked && it.course) next[key].course = it.course;
    }
    return next;
  }

  function persistCart() { store.set('cart', S.cart); }

  function changeQty(product, delta) {
    // Меню открыто без стола/входа — сначала стол и телефон, потом положим блюдо в корзину
    if (delta > 0 && !S.session) { openSeatSheet(() => changeQty(product, delta)); return; }
    if (S.session?.isPaid) { toast('Счёт уже оплачен. Отсканируйте QR, чтобы начать новый заказ'); return; }
    const key = String(product.id);
    const line = S.cart[key] || { qty: 0, product };
    const next = line.qty + delta;
    if (delta > 0 && isStopped(product)) { toast('Эта позиция сейчас недоступна', true); return; }
    if (delta < 0 && next < lockedQty(key)) { toast('Это блюдо уже готовится — убрать можно через официанта', true); return; }
    if (next <= 0) delete S.cart[key]; else S.cart[key] = { ...line, qty: next, product };
    persistCart();
    S.changedSinceSubmit = true; store.set('changedSinceSubmit', true);
    if (delta > 0 && S.ai.query && S.tab === 'ai') {
      api('POST', '/api/v1/ai/feedback', { query: S.ai.query, productId: product.id }).catch(() => {});
    }
    scheduleCartSave();
    render();
  }

  let saveTimer;
  function scheduleCartSave() {
    S.cartDirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCart, 700);
  }
  const payloadItems = () => cartLines().map((l) => ({
    productId: l.product.id, iikoProductId: l.product.iikoId || l.product.id, name: l.product.name, price: l.product.price, quantity: l.qty,
    course: l.course || null,
  }));
  async function saveCart() {
    if (!S.sessionId) return;
    try {
      const session = await api('POST', '/api/v1/table-order/cart', { sessionId: S.sessionId, items: payloadItems() });
      S.cartDirty = false;
      applySession(session, { keepCart: true });
    } catch (e) {
      if (e.status === 403) { toast(e.message, true); await refreshSession(true); }
      else if (e.network) toast('Корзина сохранена на телефоне — отправим, когда появится связь', true);
    }
  }

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
  }

  /** Вход за стол. false — за столом уже сидят: показан вопрос «присоединиться?». */
  async function enterTable({ join = false, name = '', then = null } = {}) {
    const session = await api('POST', '/api/v1/table/enter', {
      restaurantSlug: S.restaurant, tableNumber: S.table, previousSessionId: S.sessionId, join, name, qrKey: S.qrKey || undefined,
    });
    if (session.joinRequired) { openJoinSheet({ ...session, guestName: session.guestName || name }, then); return false; }
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
    try {
      applySession(await api('GET', `/api/v1/table/session/${S.sessionId}`));
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
    bill: ['info', 'status-waiter.svg', 'Несём счёт'],
    table: ['info', 'status-pin.svg', 'Выберите стол'],
    offline: ['error', 'status-disconnected.svg', 'Нет связи'],
  };
  function pillKind(s) {
    if (S.offline) return 'offline';
    if (!s) return 'table';
    if (s.isPaid || s.workflowStatus === 'paid' || s.workflowStatus === 'closed') return 'paid';
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
        <img src="${UI(icon)}" alt=""><span>${esc(kind === 'table' && S.table && !s ? 'Войти за стол' : label)}</span></button>
    </header>`;
  }

  function nav() {
    const count = cartCount();
    const item = (key, label, attr, iconName) => {
      const active = S.tab === key;
      const icon = key === 'ai' ? `<img src="${UI('nav-ai.png')}" alt="" class="nav__orb">`
        : `<img src="${UI(`nav-${iconName}${active ? '-active' : ''}.svg`)}" alt="">`;
      return `<button class="nav__item ${active ? 'is-active' : ''}" ${attr} aria-label="${label}">
        <span class="nav__icon nav__icon--${key}">${icon}${key === 'order' && count ? `<span class="badge">${count}</span>` : ''}</span><span class="nav__label">${label}</span></button>`;
    };
    return `<nav class="nav" aria-label="Навигация">
      ${item('menu', 'Главная', 'data-go="menu"', 'home')}
      ${item('ai', 'Фуджи AI', 'data-go="ai"', 'ai')}
      ${item('help', 'Помощь', 'data-action="call"', 'help')}
      ${item('order', 'Корзина', 'data-go="order"', 'cart')}
    </nav>`;
  }

  /** Кнопка цены на карточке: «299 ₽» → в корзине «− 299 ₽ +»; нет в наличии — подпись вместо кнопки. */
  function pricePill(p, qty, stopped, cls = 'price-pill') {
    if (stopped) return `<span class="dish__soon">${Number(p.price) ? 'Закончился :(' : 'Скоро в продаже'}</span>`;
    if (!qty) return `<button class="${cls}" data-inc="${esc(p.id)}" aria-label="Добавить ${esc(p.name)}">${rub(p.price)}${cls.includes('big') ? `<img src="${UI('plus-circle.svg')}" alt="">` : ''}</button>`;
    return `<div class="${cls} ${cls}--qty">
      <button data-dec="${esc(p.id)}" aria-label="Убрать">${ICONS.minus}</button>
      <span>${rub(p.price)}</span>
      <button data-inc="${esc(p.id)}" aria-label="Добавить">${ICONS.plus}</button></div>`;
  }

  function dishCard(p, { reason = null } = {}) {
    const qty = S.cart[String(p.id)]?.qty || 0;
    const stopped = isStopped(p);
    const sub = reason || p.description || '';
    const count = qty && !stopped ? `<span class="dish__count" aria-label="В заказе ${qty}">${qty}</span>` : '';
    if (p.cardSize === 'big' && !reason) {
      return `<article class="dish dish--big ${stopped ? 'is-stopped' : ''} ${qty && !stopped ? 'has-qty' : ''}" data-product="${esc(p.id)}">
        <div class="dish__photo">${imgHtml(p, 'dish__img', 720)}${tagsHtml(p)}${count}</div>
        <div class="dish__overlay"><div class="dish__name">${esc(p.name)}</div>${pricePill(p, qty, stopped, 'price-pill price-pill--big')}</div>
      </article>`;
    }
    return `<article class="dish ${stopped ? 'is-stopped' : ''} ${qty && !stopped ? 'has-qty' : ''}" data-product="${esc(p.id)}">
      <div class="dish__photo">${imgHtml(p)}${tagsHtml(p)}${count}</div>
      <div class="dish__body">
        <div class="dish__name">${esc(p.name)}</div>
        ${sub ? `<div class="dish__desc">${esc(sub)}</div>` : ''}
        <div class="dish__foot"><span class="dish__weight">${esc(p.weight || '')}</span>${pricePill(p, qty, stopped)}</div>
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
      ${needLogin ? `<a class="fuji-btn" id="fuji-login" href="${fujiUrl ? esc(`${fujiUrl}${fujiUrl.includes('?') ? '&' : '?'}return=${encodeURIComponent(`${location.origin}${location.pathname}?restaurant=${S.restaurant || ''}&table=${S.table || ''}`)}`) : '#'}">
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
        try { await switchTable(table); closeSheet(); toast(`Стол №${S.table}: можно заказывать`); render(); } catch (e2) {
          btn.disabled = false; err.textContent = e2.message;
        }
      });
    });
  }

  /** Пересесть: неотправленные блюда уходят со старого стола и переезжают в корзину нового. */
  async function switchTable(table) {
    const carry = {};
    for (const l of cartLines()) {
      const q = Math.max(0, l.qty - lockedQty(l.product.id));
      if (q) carry[String(l.product.id)] = { ...l, qty: q };
    }
    clearTimeout(saveTimer);
    const oldSession = S.sessionId;
    const oldTable = S.table;
    if (oldSession && Object.keys(carry).length) {
      await api('POST', '/api/v1/table-order/cart', { sessionId: oldSession, items: [] }).catch(() => {});
    }
    const oldKey = S.qrKey;
    S.table = table; S.sessionId = null; S.session = null; S.cart = {}; S.qrKey = null;
    store.del('sessionId'); store.set('table', table); store.del('qrKey');
    try {
      const ok = await enterTable({
        then: () => { if (Object.keys(carry).length) { S.cart = carry; persistCart(); scheduleCartSave(); render(); } },
      });
      if (!ok) return; // стол занят — гость присоединится через шторку
    } catch (e) {
      // Стол не найден — возвращаемся за прежний
      S.table = oldTable; store.set('table', oldTable);
      S.qrKey = oldKey; if (oldKey) store.set('qrKey', oldKey);
      if (oldSession) { S.sessionId = oldSession; store.set('sessionId', oldSession); await enterTable().catch(() => {}); }
      if (Object.keys(carry).length) { S.cart = { ...S.cart, ...carry }; persistCart(); scheduleCartSave(); }
      throw e;
    }
    if (Object.keys(carry).length) { S.cart = carry; persistCart(); scheduleCartSave(); }
    startPolling();
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

  function formatPhone(v) {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('8')) d = `7${d.slice(1)}`;
    if (!d.startsWith('7')) d = `7${d}`;
    d = d.slice(0, 11);
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
      ? `<section class="ai-head"><img class="ai-head__orb ${loading ? 'is-thinking' : ''}" src="${UI('ai-orb.png')}" alt="">
          <div><div class="ai-head__title">Fudji AI</div><div class="ai-head__sub">${esc(loading ? 'Подбираю…' : error ? 'Не получилось' : (S.ai.label || 'Вот что я подобрал:'))}</div></div></section>`
      : `<section class="ai-hero"><img class="ai-orb" src="${UI('ai-orb.png')}" alt="">
          <h1>Спросите Fudji AI</h1><div class="ai-hero__hello">${esc(hello)}</div></section>`;
    return `${topbar()}<main class="screen screen--center screen--ai">
      ${head}
      ${hasResults ? '' : bannersHtml('ai')}
      ${body}
      <div class="ai-bottom">
        <div class="chips">${chips}</div>
        <form class="ai-input" id="ai-form">
          <input id="ai-input" type="text" enterkeyhint="send" maxlength="300" placeholder="${hasResults ? 'Повторить поиск' : 'Поиск блюда с помощью ИИ'}" value="${esc(query)}" aria-label="Запрос к AI">
          <button type="submit" aria-label="Спросить"><img src="${UI('ai-send.svg')}" alt=""></button>
        </form>
        ${cartCount() && !S.session?.isPaid ? submitBlock() : ''}
      </div>
    </main>`;
  }

  async function askAi(query, isChip = false) {
    const q = String(query || '').trim();
    if (!q) return;
    S.ai = { ...S.ai, query: q, loading: true, error: null };
    render();
    try {
      const res = await api('POST', '/api/v1/ai/suggest', {
        restaurantSlug: S.restaurant, query: q, chip: isChip, cart: cartLines().map((l) => l.product.name),
      }, { timeout: 9000 });
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
      S.ai = { ...S.ai, loading: false, results: fallback, label: fallback.length ? 'AI сейчас недоступен — вот популярные блюда:' : '', error: fallback.length ? null : e.message };
    }
    render();
  }

  const WAITING_WAITER = ['cart_ready', 'waiter_review', 'reorder_pending'];
  function submitBlock() {
    const pending = pendingCount();
    const reorder = (S.session?.items || []).some((i) => i.isLocked);
    if (!pending) return '';
    // Уже передано и с тех пор не менялось — повторно отправлять нечего
    if (WAITING_WAITER.includes(S.session?.workflowStatus) && !S.changedSinceSubmit) return '';
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
      return `<button class="banner ${src ? 'has-img' : ''}" data-banner="${esc(b.id)}">
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : ''}
        <div class="banner__text"><div class="banner__title">${esc(b.title)}</div>${b.text ? `<div class="banner__sub">${esc(b.text)}</div>` : ''}</div>
      </button>`;
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
    const q = S.menu.search.trim().toLowerCase();
    const filtered = q ? products.filter((p) => `${p.name} ${p.description || ''}`.toLowerCase().includes(q)) : products;
    const byGroup = new Map();
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
    if (!S.catalog) return `${topbar()}<main class="screen"><div class="list"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></main>`;
    const sections = menuSections();
    return `${topbar()}<main class="screen">
      <form class="search ${S.menu.search ? 'is-active' : ''}" id="search-form" onsubmit="return false">
        <input id="search" type="search" placeholder="Поиск по меню" value="${esc(S.menu.search)}" aria-label="Поиск">
        ${S.menu.search ? `<button type="button" class="search__clear" data-action="clear-search" aria-label="Очистить поиск">${ICONS.close}</button>`
    : `<span class="search__icon"><img src="${UI('search.svg')}" alt=""></span>`}
      </form>
      ${S.menu.search ? '' : `<div class="cats" id="cats"><button class="cats__all" data-action="all-cats" aria-label="Все разделы меню">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="5" height="5" rx="1.5"/><rect x="9" y="2" width="5" height="5" rx="1.5"/><rect x="2" y="9" width="5" height="5" rx="1.5"/><rect x="9" y="9" width="5" height="5" rx="1.5"/></svg>Меню</button>${sections.map((s) => `<button data-cat="${esc(s.id)}" class="${String(S.activeCat) === String(s.id) ? 'is-active' : ''}">${esc(s.name)}</button>`).join('')}</div>`}
      ${S.menu.search ? '' : bannersHtml('menu')}
      ${sections.length ? sections.map((s, i) => `<h2 class="section-title" id="cat-${esc(s.id)}">${esc(s.name)}</h2>
        <div class="list ${i === sections.length - 1 && !S.menu.search ? 'list--last' : ''}">${s.items.map((p) => dishCard(p)).join('')}</div>`).join('')
    : S.catalog.products?.length
      ? `<div class="empty"><img class="ai-orb ai-orb--md" src="${UI('ai-orb.png')}" alt="">Ничего не нашлось. Спросите AI — он подберёт похожее.</div>`
      : `<div class="empty"><img class="ai-orb ai-orb--md" src="${UI('ai-orb.png')}" alt="">Меню ресторана ещё загружается из iiko.<br>Загляните чуть позже или позовите официанта.</div>`}
    </main>`;
  }

  // ── Экран: заказ ───────────────────────────────────────────
  // Четыре шага макета: ждём заказ → ждём официанта → готовим → готово
  const STEP_TEXT = [
    ['Ждём ваш заказ', 'Выбирайте любимое или спросите AI'],
    ['Ждём официанта', 'Скоро подойдём и примем ваш заказ'],
    ['Готовим ваш заказ', 'Повара готовят ваши блюда'],
    ['Заказ готов', 'Несём к вашему столу. Приятного аппетита!'],
  ];
  function orderStep(s) {
    if (!s) return 0;
    if (s.isPaid || s.kitchenStatus === 'Served' || s.kitchenStatus === 'CookingCompleted') return 3;
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
    const sub = (wf && STATUS_SUB[wf]) || (s?.kitchenLabel && step === 2 ? `Кухня: ${s.kitchenLabel}` : sub0);
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
    const paid = s?.isPaid;
    // Корзина — то, что ещё не ушло официанту; отправленное — блоком выше, по гостям
    const fresh = lines.map((l) => ({ l, q: l.qty - lockedQty(l.product.id) })).filter((x) => x.q > 0);
    const cartHtml = fresh.map(({ l, q }) => `<div class="cart-line" data-key="cart-${esc(l.product.id)}">
        <div class="cart-line__row" data-swipe-del="${esc(l.product.id)}">
          ${thumb(findProduct(l.product.id) || l.product)}
          <div class="cart-line__main"><div class="cart-line__name">${esc(l.product.name)}</div><div class="cart-line__price">${rub(l.product.price)}</div></div>
          ${paid ? '' : `<div class="stepper-mini">
            <button data-dec="${esc(l.product.id)}" aria-label="Убрать">${ICONS.minus}</button><b>${q}</b>
            <button data-inc="${esc(l.product.id)}" aria-label="Добавить">${ICONS.plus}</button></div>`}
        </div>
        <button class="cart-line__del" data-remove="${esc(l.product.id)}" aria-label="Удалить"><img src="${UI('trash.svg')}" alt=""></button>
      </div>`).join('');

    // Отправленное: мои блюда («Вы») и остальные гости за столом
    const me = S.guest?.id || null;
    const groups = new Map();
    for (const i of s?.items || []) {
      const mine = (i.guestId || null) === me;
      if (mine && !i.isLocked) continue; // мои неотправленные — в корзине ниже
      const who = mine ? 'Вы' : i.guestName || (i.seatNumber ? `Место ${i.seatNumber}` : 'Добавил официант');
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

    const canClear = fresh.length > 0;
    const row = (attr, label, icon = '') => `<button class="menu-row" ${attr}>${icon}<span>${label}</span><img src="${UI('chevron.svg')}" alt=""></button>`;
    return `${topbar()}<main class="screen screen--order">
      ${orderStepper(s)}
      ${bannersHtml('order')}
      ${sentHtml ? `<section class="order-card">${sentHtml}
        ${s?.total > 0 ? `<div class="total-row"><span>${multi ? 'Весь стол' : 'Итого'}</span><b>${rub(s.total)}</b></div>` : ''}</section>` : ''}
      ${cartHtml ? `<section class="order-card">${cartHtml}
        <div class="total-row"><span>В корзине</span><b>${rub(fresh.reduce((n, x) => n + x.q * (Number(x.l.product.price) || 0), 0))}</b></div></section>`
    : sentHtml ? '' : '<section class="order-empty">Корзина пуста</section>'}
      <div class="actions">
        ${paid ? `<button class="btn btn--dark" data-action="new-visit"><span>Начать новый заказ</span><span class="round-btn">${ICONS.arrowRight}</span></button>
          ${s.feedbackLeft ? '' : row('data-action="feedback"', 'Оценить визит')}`
    : `${submitBlock()}
        ${s?.items?.length && s.total > 0 && (s.canRequestBill || S.config?.onlinePay) ? `<button class="btn ${pendingCount() ? 'btn--outline' : 'btn--dark'}" data-action="bill"><span>Оплатить счёт<span class="btn__sub">${rub(s.total)}</span></span><span class="round-btn">${ICONS.arrowRight}</span></button>` : ''}
        ${lines.length ? row('data-go="menu"', 'Дополнить из меню') : ''}
        ${row('data-action="call"', 'Позвать официанта', `<img class="menu-row__icon" src="${UI('status-help.svg')}" alt="">`)}
        ${canClear ? row('data-action="clear"', 'Очистить корзину') : ''}`}
      </div>
    </main>`;
  }

  // ── Шторки ─────────────────────────────────────────────────
  function openSheet(html, onMount, { cls = '' } = {}) {
    const root = $('#sheet-root');
    root.innerHTML = `<div class="sheet-backdrop" data-close><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet__grip"></div>${html}</div></div>`;
    const backdrop = root.firstElementChild;
    const sheet = backdrop.querySelector('.sheet');
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
    backdrop.classList.add('is-closing');
    sheet.style.transition = 'transform .22s ease-in';
    sheet.style.transform = 'translateY(105%)';
    setTimeout(() => { if (root.firstElementChild === backdrop) root.innerHTML = ''; }, 220);
  }
  /** Смахнуть шторку вниз пальцем (как в приложениях): тянется за пальцем, отпустил — закрылась или вернулась. */
  function enableSheetDrag(backdrop, sheet) {
    let y0 = null; let dy = 0; let t0 = 0; let dragging = false;
    const start = (y, target) => {
      if (target.closest('input, textarea, select') || sheet.scrollTop > 0) return;
      y0 = y; dy = 0; t0 = Date.now(); dragging = false;
    };
    const move = (y, e) => {
      if (y0 == null) return;
      dy = y - y0;
      if (!dragging && dy > 8) { dragging = true; sheet.style.transition = 'none'; }
      if (!dragging) return;
      if (e?.cancelable) e.preventDefault(); // не прокручиваем страницу, пока тянем шторку
      const d = Math.max(0, dy);
      sheet.style.transform = `translateY(${d}px)`;
      backdrop.style.backgroundColor = `rgba(9, 16, 39, ${Math.max(0, 0.28 * (1 - d / 400))})`;
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
    };
    sheet.addEventListener('touchstart', (e) => start(e.touches[0].clientY, e.target), { passive: true });
    sheet.addEventListener('touchmove', (e) => move(e.touches[0].clientY, e), { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    sheet.addEventListener('mousedown', (e) => start(e.clientY, e.target));
    addEventListener('mousemove', (e) => move(e.clientY, e));
    addEventListener('mouseup', end);
    // Клик после перетаскивания не должен нажимать кнопку под пальцем
    sheet.addEventListener('click', (e) => { if (dragging) { e.stopPropagation(); e.preventDefault(); dragging = false; } }, true);
  }

  function openCallSheet() {
    const hasItems = (S.session?.items || []).length > 0 && !S.session?.isPaid;
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

  /** Экран блюда (шторка): фото, метки, название, описание, КБЖУ, аллергены, кнопка. Его же рисует превью админки. */
  function productDetailHtml(p) {
    const grams = gramsOf(p.weight);
    const perDish = S.nutri === 'dish' && grams;
    const k = perDish ? grams / 100 : 1;
    const fmt = (v) => (Math.round(v * k * 10) / 10).toLocaleString('ru-RU');
    const nutri = [['Белки', p.fiberAmount], ['Жиры', p.fatAmount], ['Углеводы', p.carbohydrateAmount], ['Ккал', p.energyAmount]]
      .filter(([, v]) => v != null);
    const allergens = [...(p.allergensText || []), ...(p.allergens || []).map((a) => a.name || a)].filter(Boolean);
    const qty = S.cart[String(p.id)]?.qty || 0;
    const stopped = isStopped(p);
    const toggle = grams ? `<div class="nutri-toggle">
        <button data-nutri="dish" class="${perDish ? 'is-active' : ''}">Блюдо</button><button data-nutri="100" class="${perDish ? '' : 'is-active'}">100 грамм</button></div>` : '';
    return `<div class="product__photo">${imgHtml(p, 'product-hero', 720)}
        <button class="product__close" data-sheet-close aria-label="Закрыть"><img src="${UI('close-white.svg')}" alt=""></button>
        ${qty && !stopped ? `<span class="dish__count dish__count--hero" aria-label="В заказе ${qty}">${qty}</span>` : ''}</div>
      <div class="product__info">
        ${tagsHtml(p, { text: true })}
        <h2 class="product__name">${esc(p.name)}</h2>
        ${p.weight ? `<div class="product__weight">${esc(p.weight)}</div>` : ''}
        ${p.description ? `<div class="product__block"><div class="product__label">Описание</div><p>${esc(p.description)}</p></div>` : ''}
        ${nutri.length ? `<div class="product__block"><div class="product__label product__label--row">Пищевая ценность${toggle}</div>
          <div class="nutri">${nutri.map(([label, v]) => `<div><b>${fmt(v)}</b>${label}</div>`).join('')}</div></div>` : ''}
        ${allergens.length ? `<div class="product__block"><div class="product__label">Аллергены</div><p>${esc(allergens.join(', '))}</p></div>` : ''}
      </div>
      <div class="product__cta">
        ${stopped ? `<button class="btn btn--dark btn--center" disabled>${Number(p.price) ? 'Закончился' : 'Скоро в продаже'}</button>`
    : qty ? `<div class="btn btn--dark btn--qty"><button data-dec="${esc(p.id)}" aria-label="Убрать">${ICONS.minus}</button>
          <span>${rub(qty * p.price)}<i></i>${qty}</span><button data-inc="${esc(p.id)}" aria-label="Добавить">${ICONS.plus}</button></div>`
      : `<button class="btn btn--dark btn--center" data-inc="${esc(p.id)}">Добавить • ${rub(p.price)}</button>`}
      </div>`;
  }

  function openProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    const draw = () => productDetailHtml(p);
    openSheet(`<div id="product-sheet">${draw()}</div>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]'); const nutri = e.target.closest('[data-nutri]');
        if (inc) changeQty(p, 1); else if (dec) changeQty(p, -1); else if (nutri) S.nutri = nutri.dataset.nutri; else return;
        e.stopPropagation();
        const box = $('#product-sheet'); // шторку могла сменить форма входа за стол
        if (box) { box.innerHTML = draw(); watchLiveVideos(box); }
      });
    }, { cls: 'sheet--product' });
  }

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
    await new Promise((resolve) => {
      const widget = new window.cp.CloudPayments({ language: 'ru-RU' });
      widget.pay('charge', {
        publicId: p.publicId, description: p.description, amount: p.amount, currency: 'RUB',
        invoiceId: p.invoiceId, accountId: p.accountId, skin: 'mini',
      }, { onSuccess: resolve, onFail: resolve, onComplete: () => {} });
    });
    // Статус спрашиваем у сервера несколько раз: банку нужно пару секунд
    for (let i = 0; i < 8; i++) {
      const r = await api('POST', '/api/v1/table/pay/confirm', { sessionId: S.sessionId, invoiceId: p.invoiceId });
      if (r.session) applySession(r.session);
      if (r.status === 'completed') return 'ok';
      if (r.status === 'failed') throw new Error(r.reason ? `Оплата не прошла: ${r.reason}` : 'Оплата не прошла');
      await new Promise((res) => setTimeout(res, 2000));
    }
    return 'pending';
  }

  function openPaySheet() {
    const s = S.session;
    const online = Boolean(S.config?.onlinePay);
    const methods = S.config?.paymentMethods || [];
    const tips = S.config?.tipPresets || [0, 10, 15, 20];
    const st = { method: methods[0]?.id || 'sbp', tipPct: 10, tipCustom: null, paying: false };
    const tipAmount = () => (st.tipCustom != null ? Math.max(0, Math.round(st.tipCustom)) : Math.round((s.total * st.tipPct) / 100));
    const draw = () => `<h2>Оплата счёта</h2>
      <div class="card" style="text-align:center">
        <div class="big-sum">${rub(s.total + tipAmount())}</div>
        <div class="sum-rows"><span>Заказ</span><span>${rub(s.total)}</span></div>
        <div class="sum-rows"><span>Чаевые официанту</span><span>${rub(tipAmount())}</span></div>
      </div>
      ${online ? '' : `<div class="label">Способ оплаты</div>
      <div class="opt-grid" style="grid-template-columns:1fr 1fr">${methods.map((m) => `<button class="opt ${st.method === m.id ? 'is-active' : ''}" data-method="${m.id}">${esc(m.label)}</button>`).join('')}</div>`}
      <div class="label">Чаевые</div>
      <div class="opt-grid">${tips.map((t) => `<button class="opt ${st.tipCustom == null && st.tipPct === t ? 'is-active' : ''}" data-tip="${t}">${t ? `${t}%` : 'Без чаевых'}</button>`).join('')}
        <button class="opt ${st.tipCustom != null ? 'is-active' : ''}" data-tip="custom">Своя сумма</button></div>
      ${st.tipCustom != null ? `<div class="pill-input" style="min-height:56px;margin-bottom:16px"><input id="tip-custom" type="number" inputmode="numeric" min="0" placeholder="Сумма чаевых, ₽" value="${st.tipCustom || ''}"></div>` : ''}
      <button class="btn btn--dark" data-pay ${st.paying ? 'disabled' : ''}><span>${st.paying ? 'Оплачиваем…' : `Оплатить ${rub(s.total + tipAmount())}`}</span><span class="round-btn">${st.paying ? '<div class="spinner spinner--dark"></div>' : ICONS.arrowRight}</span></button>
      <p class="muted" style="font-size:12px;text-align:center;margin-top:12px">${online ? 'Картой, СБП или SberPay через CloudPayments. Данные карты не попадают в меню.' : 'Демо-оплата: платёжный провайдер подключается по выбору заказчика. Реквизиты карт не хранятся.'}</p>`;
    openSheet('<div id="pay-sheet"></div>', (sheet) => {
      const box = $('#pay-sheet'); box.innerHTML = draw();
      sheet.addEventListener('input', (e) => {
        if (e.target.id === 'tip-custom') {
          st.tipCustom = Number(e.target.value) || 0;
          box.querySelector('.big-sum').textContent = rub(s.total + tipAmount());
          box.querySelectorAll('.sum-rows span')[3].textContent = rub(tipAmount());
          box.querySelector('[data-pay] span').textContent = `Оплатить ${rub(s.total + tipAmount())}`;
        }
      });
      sheet.addEventListener('click', async (e) => {
        const m = e.target.closest('[data-method]'); const t = e.target.closest('[data-tip]'); const pay = e.target.closest('[data-pay]');
        if (m) st.method = m.dataset.method;
        else if (t) { if (t.dataset.tip === 'custom') st.tipCustom = st.tipCustom ?? 0; else { st.tipCustom = null; st.tipPct = Number(t.dataset.tip); } }
        else if (pay && !st.paying) {
          st.paying = true; box.innerHTML = draw();
          try {
            if (online) {
              const res = await runOnlinePay(tipAmount());
              render();
              if (res === 'ok') { toast('Оплачено, спасибо!'); openFeedbackSheet(); return; }
              toast('Проверяем оплату — статус обновится в течение минуты');
              closeSheet(); refreshSession(true); return;
            }
            const session = await api('POST', '/api/v1/table/guest-pay', { sessionId: S.sessionId, method: st.method, tipAmount: tipAmount() });
            applySession(session); render();
            openFeedbackSheet();
            return;
          } catch (err) {
            st.paying = false; toast(err.message, true);
            if (err.status === 409) { closeSheet(); refreshSession(true); return; }
          }
        } else return;
        box.innerHTML = draw();
      });
    });
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
        if (e.target.closest('[data-send]')) {
          try {
            await api('POST', '/api/v1/table/feedback', { sessionId: S.sessionId, rating: st.rating, comment: $('#fb-comment').value });
            if (S.session) S.session.feedbackLeft = true;
            closeSheet(); toast('Спасибо за отзыв!'); render();
          } catch (err) { toast(err.message, true); }
        }
      });
    });
  }

  // ── Действия ───────────────────────────────────────────────
  async function submitToWaiter(btn) {
    if (!pendingCount()) { toast('Корзина пуста — добавьте блюда', true); return; }
    if (btn) { btn.disabled = true; btn.classList?.add('is-busy'); }
    clearTimeout(saveTimer);
    try {
      const session = await api('POST', '/api/v1/table/submit-to-waiter', { sessionId: S.sessionId, items: payloadItems() });
      S.cartDirty = false;
      S.changedSinceSubmit = false; store.set('changedSinceSubmit', false);
      applySession(session);
      toast(session.workflowStatus === 'reorder_pending' ? 'Дозаказ передан официанту' : 'Заказ передан — официант скоро подойдёт');
      go('order');
    } catch (e) {
      toast(e.network ? 'Нет связи. Корзина сохранена — попробуйте ещё раз' : e.message, true);
      if (btn) { btn.disabled = false; btn.classList?.remove('is-busy', 'is-done'); }
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
    const covered = (i) => paidOnline.wholeTable || paidOnline.guestIds.includes(String(i.guestId));
    const picked = new Set(guests.map((g) => String(g.id)));
    const tips = S.config?.tipPresets || [0, 10, 15, 20];
    const st = { method: online ? 'online' : 'card', tipPct: 0, busy: false };
    const inScope = (i) => !multi || picked.size === guests.length || picked.has(String(i.guestId));
    const sum = (list) => list.reduce((n, i) => n + i.lineTotal, 0);
    const amounts = () => {
      const items = (s.items || []).filter(inScope);
      const kitchen = sum(items.filter((i) => !isBar(i) && !covered(i)));
      const bar = sum(items.filter(isBar));
      return { kitchen, bar, all: sum(items.filter((i) => isBar(i) || !covered(i))) };
    };
    const sumOf = (id) => sum((s.items || []).filter((i) => String(i.guestId) === String(id)));
    const noGuest = sum((s.items || []).filter((i) => !i.guestId));
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
  let sw = null;
  addEventListener('pointerdown', (e) => {
    const row = e.target.closest('[data-swipe-del]');
    document.querySelectorAll('.cart-line.is-open').forEach((l) => { if (!row || l !== row.parentElement) l.classList.remove('is-open'); });
    if (!row || e.target.closest('button')) return;
    sw = { row, x0: e.clientX, y0: e.clientY, dx: 0, open: row.parentElement.classList.contains('is-open'), active: false };
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
    const { row, dx, active } = sw;
    sw = null; S.dragging = false;
    if (!active) return;
    row.style.transition = ''; row.style.transform = '';
    row.parentElement.classList.toggle('is-open', dx < -40);
  };
  addEventListener('pointerup', endSwipe);
  addEventListener('pointercancel', endSwipe);
  addEventListener('online', () => { S.offline = false; render(); });
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
    const inc = t.closest('#app [data-inc]'); const dec = t.closest('#app [data-dec]');
    if (inc || dec) {
      const id = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
      const product = findProduct(id) || S.cart[id]?.product || (() => {
        const r = (S.ai.results || []).find((x) => String(x.productId) === String(id));
        return r && { id: r.productId, iikoId: r.iikoId, name: r.name, price: r.price, image: r.image, weight: r.weight };
      })();
      if (product) changeQty(product, inc ? 1 : -1);
      return;
    }
    const remove = t.closest('#app [data-remove]');
    if (remove) {
      // Удалить из корзины всё неотправленное; уже переданное официанту остаётся
      const key = remove.dataset.remove;
      const line = S.cart[key];
      if (line) changeQty(line.product, lockedQty(key) - line.qty);
      return;
    }
    const courseBtn = t.closest('[data-course]');
    if (courseBtn) {
      const line = S.cart[courseBtn.dataset.course];
      if (line) {
        line.course = courseBtn.dataset.c ? Number(courseBtn.dataset.c) : null;
        persistCart(); S.changedSinceSubmit = true; store.set('changedSinceSubmit', true);
        scheduleCartSave(); render();
      }
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
    else if (action === 'submit') submitToWaiter(t.closest('button'));
    else if (action === 'pay') openPaySheet();
    else if (action === 'bill') requestBill();
    else if (action === 'all-cats') openCategoriesSheet();
    else if (action === 'clear-search') { S.menu.search = ''; render(); $('#search')?.focus(); }
    else if (action === 'feedback') openFeedbackSheet();
    else if (action === 'new-visit') newVisit();
    else if (action === 'clear') {
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
  });

  // ── Старт ──────────────────────────────────────────────────
  async function loadCatalog() {
    try {
      S.catalog = await api('GET', `/api/v1/restaurants/${encodeURIComponent(S.restaurant || '')}/catalog`, null, { timeout: 20000 });
      // Обновить товары в корзине актуальными данными меню
      for (const [k, l] of Object.entries(S.cart)) { const p = findProduct(k); if (p) S.cart[k] = { ...l, product: p }; }
      render();
    } catch (e) { toast('Не удалось загрузить меню — проверьте интернет', true); }
  }

  let polling = false;
  function startPolling() {
    if (polling) return;
    polling = true;
    setInterval(() => { if (!document.hidden) refreshSession(); }, 10000);
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
    try {
      S.config = await api('GET', `/api/v1/config?restaurant=${encodeURIComponent(S.restaurant || '')}`);
      S.restaurant = S.config.restaurant.slug;
      store.set('restaurant', S.restaurant);
    } catch (e) {
      $('#app').innerHTML = `<div class="auth"><div class="auth__main"><div class="logo">ФУДЖИ</div><p style="text-align:center">${esc(e.message)}</p>
        <button class="btn btn--dark btn--center" onclick="location.reload()">Повторить</button></div></div>`;
      return;
    }
    // Меню видно сразу, без входа и выбора стола
    render();
    loadCatalog();

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
      if (idx >= 0) list[idx] = merged; else list.unshift(merged);
      S.catalog = { ...base, products: list };
      S.menu.search = '';
      S.menu.section = barGroupIds().has(String(merged.parentGroup)) ? 'bar' : 'kitchen';
      S.activeCat = merged.parentGroup;
      S.tab = 'menu';
      $('#sheet-root').innerHTML = '';
      lastHtml = '';
      render();
      document.body.classList.toggle('preview-list', view === 'list');
      const el = document.querySelector(`.dish[data-product="${CSS.escape(String(merged.id))}"]`);
      el?.classList.add('is-focus');
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
