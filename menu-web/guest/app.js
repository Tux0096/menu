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
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>',
    home: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4.5 12.5L14 4.5l9.5 8V23a1 1 0 01-1 1H17v-7h-6v7H5.5a1 1 0 01-1-1V12.5z"/></svg>',
    bell: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19.5V12a7 7 0 0114 0v7.5l2 2.5H5l2-2.5zM11.5 24.5a2.5 2.5 0 005 0"/></svg>',
    cart: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h3.2l2.6 13h12.6l2.6-9.5H7.7"/><circle cx="10.5" cy="22.5" r="1.8"/><circle cx="19.5" cy="22.5" r="1.8"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const GROUP_EMOJI = [['ролл', '🍣'], ['суш', '🍣'], ['сет', '🍱'], ['пицц', '🍕'], ['суп', '🍜'], ['wok', '🥡'], ['лапш', '🍜'],
    ['салат', '🥗'], ['закуск', '🥟'], ['десерт', '🍰'], ['напит', '🥤'], ['бар', '🍸'], ['чай', '🍵'], ['кофе', '☕'],
    ['бургер', '🍔'], ['поке', '🥙'], ['соус', '🥢'], ['горяч', '🔥']];
  const emojiFor = (p) => {
    const hay = `${p.parentGroupName || ''} ${p.name || ''}`.toLowerCase();
    return (GROUP_EMOJI.find(([k]) => hay.includes(k)) || [null, '🍽'])[1];
  };
  const imgSrc = (src) => {
    if (!src) return null;
    if (/^https?:\/\//.test(src) || src.startsWith('/')) return src;
    return `/${src}`;
  };
  const imgHtml = (p, cls = 'dish__img') => {
    const src = imgSrc(p.image);
    return `<div class="${cls}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${src ? '' : emojiFor(p)}</div>`;
  };

  // ── Состояние ──────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const S = {
    token: store.get('token'),
    guest: store.get('guest'),
    restaurant: params.get('restaurant') || params.get('r') || store.get('restaurant') || null,
    table: params.get('table') || params.get('tbl') || store.get('table') || null,
    session: null,
    sessionId: store.get('sessionId'),
    config: null,
    catalog: null,
    cart: store.get('cart', {}), // productId -> { qty, product }
    tab: 'menu',
    ai: { query: '', results: store.get('aiResults', null), loading: false, error: null, engine: null },
    menu: { search: '', cat: null },
    cartDirty: false,
    changedSinceSubmit: store.get('changedSinceSubmit', true),
    aiFresh: false,
  };
  const qrChanged = (params.get('table') && params.get('table') !== store.get('table'))
    || (params.get('restaurant') && params.get('restaurant') !== store.get('restaurant'));
  if (S.table) store.set('table', S.table);
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
  function toast(text, isError = false) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.toggle('is-error', isError);
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2800);
  }

  // ── Корзина ────────────────────────────────────────────────
  const cartLines = () => Object.values(S.cart).filter((l) => l.qty > 0);
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => cartLines().reduce((s, l) => s + l.qty * (Number(l.product.price) || 0), 0);
  const lockedQty = (pid) => (S.session?.items || [])
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
    for (const it of session.items || []) {
      const key = String(it.productId || it.iikoProductId);
      const product = findProduct(key) || { id: key, iikoId: it.iikoProductId, name: it.name, price: it.price };
      if (!next[key]) next[key] = { qty: 0, product };
      next[key].qty += it.quantity;
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
    if (next <= 0) delete S.cart[key]; else S.cart[key] = { qty: next, product };
    persistCart();
    S.changedSinceSubmit = true; store.set('changedSinceSubmit', true);
    if (delta > 0 && S.ai.query && S.tab === 'ai') {
      api('POST', '/api/v1/ai/feedback', { query: S.ai.query, productId: product.id }).catch(() => {});
    }
    if (delta > 0 && navigator.vibrate) navigator.vibrate(8);
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

  async function enterTable() {
    const session = await api('POST', '/api/v1/table/enter', {
      restaurantSlug: S.restaurant, tableNumber: S.table, previousSessionId: S.sessionId,
    });
    const localCart = S.cart;
    const sameVisit = session.sessionId === S.sessionId;
    applySession(session);
    // Кейс 14: корзина, не успевшая уйти на сервер, восстанавливается с телефона
    if (sameVisit && Object.keys(localCart).length && !session.isPaid) {
      const serverCount = (session.items || []).reduce((s, i) => s + i.quantity, 0);
      const localCount = Object.values(localCart).reduce((s, l) => s + l.qty, 0);
      if (localCount > serverCount) { S.cart = localCart; persistCart(); scheduleCartSave(); }
    }
    if (!sameVisit) { store.del('aiResults'); S.ai.results = null; S.changedSinceSubmit = true; store.set('changedSinceSubmit', true); }
  }

  async function refreshSession(force = false) {
    if (!S.sessionId || (S.cartDirty && !force)) return;
    try {
      applySession(await api('GET', `/api/v1/table/session/${S.sessionId}`));
      render();
    } catch (e) {
      if (e.status === 404) { S.sessionId = null; store.del('sessionId'); await enterTable().catch(() => {}); render(); }
    }
  }

  let lastPing = 0;
  function pingActivity() {
    if (!S.sessionId || Date.now() - lastPing < 60000) return;
    lastPing = Date.now();
    api('POST', '/api/v1/table/activity', { sessionId: S.sessionId }).catch(() => {});
  }
  ['click', 'scroll', 'keydown'].forEach((ev) => addEventListener(ev, pingActivity, { passive: true }));

  function logout() {
    S.token = null; S.guest = null;
    store.del('token'); store.del('guest');
    S.session = null; S.sessionId = null; store.del('sessionId');
    render();
  }

  // ── Статусы ────────────────────────────────────────────────
  const STATUS_TONE = {
    browsing: 'idle', building_cart: 'idle', cart_ready: 'wait', waiter_review: 'work', in_production: 'work',
    reorder_pending: 'wait', bill_requested: 'wait', paid: 'ok', closed: 'ok',
  };

  // ── Разметка: общие части ──────────────────────────────────
  function topbar() {
    const s = S.session;
    const name = S.guest?.name || s?.guest?.name || '';
    const who = name || S.guest?.phoneMasked || '';
    if (!s) {
      return `<header class="topbar">
      <div>
        <div class="topbar__table">${esc(S.config?.restaurant?.name || 'Фуджи')}</div>
        <div class="topbar__guest">${esc(S.config?.restaurant?.address || '')}</div>
      </div>
      <button class="status-chip" data-action="seat" data-tone="idle">${S.table ? `Стол №${esc(S.table)} · войти` : 'Выбрать стол'}</button>
    </header>`;
    }
    return `<header class="topbar">
      <div>
        <div class="topbar__table">Стол №${esc(S.table)}</div>
        <div class="topbar__guest">${esc(who ? `${who} · ` : '')}${esc(S.config?.restaurant?.address || '')}</div>
      </div>
      ${s ? `<button class="status-chip" data-go="order" data-tone="${STATUS_TONE[s.workflowStatus] || 'idle'}">${esc(s.workflowLabel)}</button>` : ''}
    </header>`;
  }

  function nav() {
    const count = cartCount();
    return `<nav class="nav" aria-label="Навигация">
      <button class="nav__ai ${S.tab === 'ai' ? 'is-active' : ''}" data-go="ai" aria-label="AI-помощник"><div class="orb"></div><span>AI</span></button>
      <div class="nav__bar">
        <button class="nav__btn ${S.tab === 'menu' ? 'is-active' : ''}" data-go="menu" aria-label="Меню">${ICONS.home}</button>
        <button class="nav__btn" data-action="call" aria-label="Позвать официанта">${ICONS.bell}</button>
        <button class="nav__btn ${S.tab === 'order' ? 'is-active' : ''}" data-go="order" aria-label="Заказ">${ICONS.cart}${count ? `<span class="badge">${count}</span>` : ''}</button>
      </div>
    </nav>`;
  }

  function dishCard(p, { reason = null } = {}) {
    const qty = S.cart[String(p.id)]?.qty || 0;
    const stopped = isStopped(p);
    const sub = reason || p.description || '';
    return `<article class="dish ${stopped ? 'is-stopped' : ''}" data-product="${esc(p.id)}">
      ${imgHtml(p)}
      <div class="dish__body">
        <div>
          <div class="dish__name">${esc(p.name)}</div>
          ${sub ? `<div class="dish__desc" style="margin-top:6px">${esc(sub)}</div>` : ''}
        </div>
        <div class="dish__price"><b>${rub(p.price)}</b>${p.weight ? `<span>${esc(p.weight)}</span>` : ''}
          ${stopped ? '<span class="tag tag--stop">Нет в наличии</span>' : ''}</div>
      </div>
      <div class="dish__action">
        ${stopped ? '' : qty ? `<div class="qty">
            <button class="round-btn round-btn--sm round-btn--light" data-dec="${esc(p.id)}" aria-label="Убрать">${ICONS.minus}</button>
            <b>${qty}</b>
            <button class="round-btn round-btn--sm" data-inc="${esc(p.id)}" aria-label="Добавить">${ICONS.plus}</button>
          </div>` : `<button class="round-btn round-btn--sm" data-inc="${esc(p.id)}" aria-label="Добавить ${esc(p.name)}">${ICONS.plus}</button>`}
      </div>
    </article>`;
  }

  // ── Экран: вход ────────────────────────────────────────────
  /** Шторка «Сделать заказ»: номер стола (если не из QR) и телефон (если гость ещё не входил). */
  function openSeatSheet(then = null, error = '') {
    const fujiUrl = S.config?.fujiAppLoginUrl;
    const needTable = !S.table || S.changeTable;
    const needLogin = !S.token;
    openSheet(`<form id="seat-form" autocomplete="on">
      <h2>Сделать заказ</h2>
      <p class="sheet__hint">${esc(S.config?.restaurant?.name || '')}${S.config?.restaurant?.address ? `, ${esc(S.config.restaurant.address)}` : ''}</p>
      ${needTable ? `<div class="label">Номер стола</div>
        <div class="pill-input" style="min-height:60px;margin-bottom:8px"><input id="seat-table" type="text" inputmode="numeric" maxlength="10" placeholder="Номер на табличке стола" value="${esc(S.table || '')}"></div>`
    : `<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px">
        <span>Стол <b>№${esc(S.table)}</b></span><button type="button" class="link-btn" data-change-table>Другой стол</button></div>`}
      ${needLogin ? `<div class="label">Телефон</div>
        <div class="pill-input" style="min-height:60px"><input id="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 000 000 00 00" value="+7 " aria-label="Номер телефона"></div>
        <label class="consent"><input type="checkbox" id="consent" checked><span class="consent__box">${ICONS.check}</span><span>Согласие на обработку персональных данных</span></label>` : ''}
      <div class="auth__error" id="seat-error">${esc(error)}</div>
      <button class="btn btn--dark" type="submit"><span>Продолжить</span><span class="round-btn">${ICONS.arrowRight}</span></button>
      ${needLogin ? `<a class="fuji-btn" id="fuji-login" style="margin-top:12px" href="${fujiUrl ? esc(`${fujiUrl}${fujiUrl.includes('?') ? '&' : '?'}return=${encodeURIComponent(`${location.origin}${location.pathname}?restaurant=${S.restaurant || ''}&table=${S.table || ''}`)}`) : '#'}">
        <span class="fuji-btn__icon">Ф</span><span>Войти через приложение Фуджи</span></a>` : ''}
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
          await enterTable();
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
  function renderAi() {
    const { results, loading, error, query } = S.ai;
    const hasResults = Boolean(results?.length) || loading || error;
    const hello = S.guest?.name ? `${S.guest.name}, что сегодня хотите?` : 'Подберу блюда под ваше настроение';
    const chips = (S.config?.chips || []).map((c) => `<button class="chip ${query === c.query ? 'is-active' : ''}" data-chip="${esc(c.query)}">${c.emoji ? `${esc(c.emoji)} ` : ''}${esc(c.label)}</button>`).join('');
    let body = '';
    if (loading) body = '<div class="ai-results"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
    else if (error) {
      body = `<div class="ai-results"><div class="ai-error">
        <div style="font-weight:500;margin-bottom:6px">${esc(error)}</div>
        <div class="muted" style="font-size:14px;margin-bottom:14px">Пока можно выбрать из популярного или повторить запрос</div>
        <button class="btn btn--dark btn--center" data-retry>Повторить</button></div></div>`;
    } else if (results?.length) {
      body = `<div class="ai-answer">${S.ai.label ? esc(S.ai.label) : ''}</div><div class="ai-results ${S.aiFresh ? 'is-fresh' : ''}">${results.map((r) => {
        const p = findProduct(r.productId) || { id: r.productId, iikoId: r.iikoId, name: r.name, price: r.price, image: r.image, weight: r.weight };
        return dishCard(p, { reason: r.reason });
      }).join('')}</div>`;
    }
    return `${topbar()}<main class="screen screen--center">
      <section class="ai-hero ${hasResults ? 'ai-hero--compact' : ''}">
        <div class="orb ${hasResults ? 'orb--md' : 'orb--lg'} ${loading ? 'is-thinking' : ''}"></div>
        <h1>Спросите Fudji Ai</h1>
        <div class="ai-hero__hello">${esc(hello)}</div>
      </section>
      ${body}
      <div class="ai-bottom">
        <div class="chips">${chips}</div>
        <form class="pill-input" id="ai-form">
          <input id="ai-input" type="text" enterkeyhint="send" maxlength="300" placeholder="Например: что-то лёгкое на двоих" value="${esc(query)}" aria-label="Запрос к AI">
          <button class="round-btn" type="submit" aria-label="Спросить">${ICONS.arrowUp}</button>
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
      if (!res.suggestions.length) S.ai.error = 'Не нашёл подходящих блюд';
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
    return `<button class="btn btn--dark" data-action="submit" style="margin-top:16px">
      <span>${reorder ? 'Передать дозаказ' : 'Передать официанту'}<span class="btn__sub">${pending} ${plural(pending, ['позиция', 'позиции', 'позиций'])} · ${rub(cartTotal())}</span></span>
      <span class="round-btn">${ICONS.arrowRight}</span>
    </button>`;
  }

  // ── Экран: меню ────────────────────────────────────────────
  function menuSections() {
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
    return [...byGroup.entries()]
      .map(([id, items]) => ({ id, name: groups.find((g) => g.id === id)?.name || items[0].parentGroupName || 'Другое', items, order: order.get(id) ?? 999 }))
      .sort((a, b) => a.order - b.order);
  }

  function renderMenu() {
    if (!S.catalog) return `${topbar()}<main class="screen"><div class="list"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></main>`;
    const sections = menuSections();
    return `${topbar()}<main class="screen">
      <form class="pill-input search" id="search-form" onsubmit="return false">
        ${ICONS.search}<input id="search" type="search" placeholder="Поиск по меню" value="${esc(S.menu.search)}" aria-label="Поиск">
      </form>
      ${S.menu.search ? '' : `<div class="cats" id="cats">${sections.map((s) => `<button data-cat="${esc(s.id)}">${esc(s.name)}</button>`).join('')}</div>`}
      ${sections.length ? sections.map((s) => `<h2 class="section-title" id="cat-${esc(s.id)}">${esc(s.name)}</h2>
        <div class="list">${s.items.map((p) => dishCard(p)).join('')}</div>`).join('')
    : `<div class="empty"><div class="orb orb--md"></div>Ничего не нашлось. Спросите AI — он подберёт похожее.</div>`}
      ${cartCount() && !S.session?.isPaid ? `<div style="position:sticky;bottom:calc(100px + var(--safe-b));margin-top:20px">${submitBlock()}</div>` : ''}
    </main>`;
  }

  // ── Экран: заказ ───────────────────────────────────────────
  const STEPS = [
    { key: 'sent', label: 'Передан', done: (s) => ['cart_ready', 'waiter_review', 'in_production', 'reorder_pending', 'bill_requested', 'paid'].includes(s.workflowStatus) },
    { key: 'waiter', label: 'Официант', done: (s) => ['waiter_review', 'in_production', 'reorder_pending', 'bill_requested', 'paid'].includes(s.workflowStatus) },
    { key: 'kitchen', label: 'Готовится', done: (s) => ['in_production', 'reorder_pending', 'bill_requested', 'paid'].includes(s.workflowStatus) },
    { key: 'served', label: 'Подано', done: (s) => s.kitchenStatus === 'Served' },
  ];
  const STATUS_SUB = {
    browsing: 'Добавьте блюда из меню или спросите AI',
    building_cart: 'Проверьте заказ и передайте официанту',
    cart_ready: 'Официант получил заказ и скоро подойдёт',
    waiter_review: 'Официант сверяет состав заказа',
    in_production: 'Готовим! Можно дозаказать в любой момент',
    reorder_pending: 'Дозаказ ждёт подтверждения официанта',
    bill_requested: 'Официант скоро принесёт счёт',
    paid: 'Спасибо, что были с нами!',
  };

  function kitchenLabelFor(pid) {
    const it = (S.session?.items || []).find((i) => i.isLocked && (String(i.productId) === String(pid) || String(i.iikoProductId) === String(pid)));
    return it?.kitchenLabel || null;
  }

  function renderOrder() {
    const s = S.session;
    const wf = s?.workflowStatus || 'browsing';
    const lines = cartLines();
    const st0 = s || { workflowStatus: wf };
    const current = STEPS.findIndex((st) => !st.done(st0));
    const stepper = STEPS.map((st, i) => `<div class="step ${st.done(st0) ? 'is-done' : ''} ${i === current ? 'is-current' : ''}"><i></i>${st.label}</div>`).join('');

    const items = lines.map((l) => {
      const locked = lockedQty(l.product.id);
      const fresh = l.qty - locked;
      const tags = [
        locked ? `<span class="tag tag--kitchen">${esc(kitchenLabelFor(l.product.id) || 'на кухне')} ${locked}</span>` : '',
        locked && fresh > 0 ? `<span class="tag tag--new">+${fresh} новое</span>` : '',
      ].join('');
      return `<div class="line-item">
        <div class="line-item__main">
          <div class="line-item__name">${esc(l.product.name)}</div>
          <div class="line-item__meta">${rub(l.product.price)} × ${l.qty} ${tags}</div>
        </div>
        ${s?.isPaid ? `<b>${rub(l.qty * l.product.price)}</b>` : `<div class="qty">
          <button class="round-btn round-btn--sm round-btn--light" data-dec="${esc(l.product.id)}" ${l.qty <= locked ? 'disabled' : ''} aria-label="Убрать">${ICONS.minus}</button>
          <b>${l.qty}</b>
          <button class="round-btn round-btn--sm" data-inc="${esc(l.product.id)}" aria-label="Добавить">${ICONS.plus}</button>
        </div>`}
      </div>`;
    }).join('');

    const canClear = lines.some((l) => l.qty > lockedQty(l.product.id));
    const paid = s?.isPaid;
    return `${topbar()}<main class="screen">
      <h1 class="page-title">Заказ</h1>
      <section class="card">
        <div class="steps">${stepper}</div>
        <div class="status-text">${esc(s?.workflowLabel || 'Добро пожаловать')}</div>
        <div class="status-sub">${esc(s?.kitchenLabel ? `Кухня: ${s.kitchenLabel}` : (STATUS_SUB[wf] || ''))}${s?.waitingMinutes ? ` · ждёте ${s.waitingMinutes} мин` : ''}</div>
      </section>
      <section class="card">
        ${lines.length ? items : `<div class="empty" style="padding:24px 8px">Корзина пуста.<br>Выберите блюда в меню или спросите AI.</div>`}
        ${lines.length ? `<div class="total-row"><span class="muted">Итого</span><b>${rub(cartTotal())}</b></div>` : ''}
      </section>
      <div class="actions">
        ${paid ? `<button class="btn btn--dark" data-action="new-visit"><span>Начать новый заказ</span><span class="round-btn">${ICONS.arrowRight}</span></button>
          ${s.feedbackLeft ? '' : '<button class="btn" data-action="feedback"><span>Оценить визит</span></button>'}`
    : `${submitBlock()}
        ${s?.canGuestPay ? `<button class="btn ${pendingCount() ? '' : 'btn--dark'}" data-action="pay"><span>Оплатить счёт<span class="btn__sub">${rub(s.total)}</span></span><span class="round-btn">${ICONS.arrowRight}</span></button>` : ''}
        <div class="actions-grid">
          <button class="btn" data-go="menu">Дополнить из меню</button>
          <button class="btn" data-action="call">Позвать официанта</button>
          ${s?.canRequestBill ? '<button class="btn" data-action="bill">Попросить счёт</button>' : ''}
          ${canClear ? '<button class="btn" data-action="clear">Очистить</button>' : ''}
        </div>`}
      </div>
    </main>`;
  }

  // ── Шторки ─────────────────────────────────────────────────
  function openSheet(html, onMount) {
    const root = $('#sheet-root');
    root.innerHTML = `<div class="sheet-backdrop" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="sheet__grip"></div>${html}</div></div>`;
    const backdrop = root.firstElementChild;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeSheet(); });
    onMount?.(root.querySelector('.sheet'));
  }
  function closeSheet() { $('#sheet-root').innerHTML = ''; }

  function openCallSheet() {
    const hasItems = (S.session?.items || []).length > 0 && !S.session?.isPaid;
    const opt = (reason, label) => `<button class="btn" data-reason="${reason}"><span>${label}</span><span class="round-btn">${ICONS.arrowRight}</span></button>`;
    openSheet(`<h2>Позвать официанта</h2><p class="sheet__hint">Официант увидит стол №${esc(S.table)} и причину вызова</p>
      ${opt('general', 'Нужна помощь')}${opt('order', 'Дозаказ')}${hasItems ? opt('bill', 'Попросить счёт') : ''}${opt('question', 'Вопрос по блюдам')}`, (sheet) => {
      sheet.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-reason]');
        if (!b) return;
        b.disabled = true;
        try {
          const res = await api('POST', '/api/v1/table/call-waiter', { sessionId: S.sessionId, reason: b.dataset.reason });
          if (res.session) applySession(res.session);
          closeSheet(); toast(res.message || 'Официант скоро подойдёт'); render();
        } catch (err) { b.disabled = false; toast(err.message, true); }
      });
    });
  }

  function openProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    const nutri = [['ккал', p.energyAmount], ['белки', p.fiberAmount], ['жиры', p.fatAmount], ['углев.', p.carbohydrateAmount]]
      .filter(([, v]) => v != null);
    const allergens = [...(p.allergensText || []), ...(p.allergens || []).map((a) => a.name || a)].filter(Boolean);
    const draw = () => {
      const qty = S.cart[String(p.id)]?.qty || 0;
      const stopped = isStopped(p);
      return `${imgHtml(p, 'product-hero')}
        <h2 style="margin-top:16px">${esc(p.name)}</h2>
        <div class="dish__price" style="margin:0 4px 12px"><b>${rub(p.price)}</b>${p.weight ? `<span>${esc(p.weight)}</span>` : ''}${stopped ? '<span class="tag tag--stop">Нет в наличии</span>' : ''}</div>
        ${p.description ? `<p class="muted" style="margin:0 4px;font-size:15px;line-height:1.45">${esc(p.description)}</p>` : ''}
        ${nutri.length ? `<div class="nutri">${nutri.map(([k, v]) => `<div><b>${Math.round(v)}</b>${k}</div>`).join('')}</div>` : ''}
        ${allergens.length ? `<p style="margin:0 4px 16px;font-size:13px"><span class="muted">Аллергены:</span> ${esc(allergens.join(', '))}</p>` : ''}
        ${stopped ? '<button class="btn btn--center" disabled>Временно недоступно</button>'
    : qty ? `<div class="btn" style="justify-content:space-between"><button class="round-btn round-btn--light" data-dec="${esc(p.id)}">${ICONS.minus}</button><b>${qty} в заказе · ${rub(qty * p.price)}</b><button class="round-btn" data-inc="${esc(p.id)}">${ICONS.plus}</button></div>`
      : `<button class="btn btn--dark" data-inc="${esc(p.id)}"><span>Добавить в заказ</span><span class="round-btn">${ICONS.plus}</span></button>`}`;
    };
    openSheet(`<div id="product-sheet">${draw()}</div>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]');
        if (inc) changeQty(p, 1); else if (dec) changeQty(p, -1); else return;
        e.stopPropagation();
        $('#product-sheet').innerHTML = draw();
      });
    });
  }

  function openPaySheet() {
    const s = S.session;
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
      <div class="label">Способ оплаты</div>
      <div class="opt-grid" style="grid-template-columns:1fr 1fr">${methods.map((m) => `<button class="opt ${st.method === m.id ? 'is-active' : ''}" data-method="${m.id}">${esc(m.label)}</button>`).join('')}</div>
      <div class="label">Чаевые</div>
      <div class="opt-grid">${tips.map((t) => `<button class="opt ${st.tipCustom == null && st.tipPct === t ? 'is-active' : ''}" data-tip="${t}">${t ? `${t}%` : 'Без чаевых'}</button>`).join('')}
        <button class="opt ${st.tipCustom != null ? 'is-active' : ''}" data-tip="custom">Своя сумма</button></div>
      ${st.tipCustom != null ? `<div class="pill-input" style="min-height:56px;margin-bottom:16px"><input id="tip-custom" type="number" inputmode="numeric" min="0" placeholder="Сумма чаевых, ₽" value="${st.tipCustom || ''}"></div>` : ''}
      <button class="btn btn--dark" data-pay ${st.paying ? 'disabled' : ''}><span>${st.paying ? 'Оплачиваем…' : `Оплатить ${rub(s.total + tipAmount())}`}</span><span class="round-btn">${st.paying ? '<div class="spinner spinner--dark"></div>' : ICONS.arrowRight}</span></button>
      <p class="muted" style="font-size:12px;text-align:center;margin-top:12px">Демо-оплата: платёжный провайдер подключается по выбору заказчика. Реквизиты карт не хранятся.</p>`;
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
    if (btn) { btn.disabled = true; }
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
      if (btn) btn.disabled = false;
    }
  }

  async function requestBill() {
    try { applySession(await api('POST', '/api/v1/table/request-bill', { sessionId: S.sessionId })); toast('Официант получил запрос счёта'); render(); } catch (e) { toast(e.message, true); }
  }

  async function newVisit() {
    S.cart = {}; persistCart(); S.ai.results = null; store.del('aiResults');
    try { await enterTable(); go('ai'); } catch (e) { toast(e.message, true); }
  }

  function go(tab) {
    S.tab = tab;
    render();
    scrollTo({ top: 0 });
  }

  // ── Рендер ─────────────────────────────────────────────────
  function render() {
    const app = $('#app');
    const active = document.activeElement?.id;
    const caret = document.activeElement?.selectionStart;
    const html = S.tab === 'menu' ? renderMenu() : S.tab === 'order' ? renderOrder() : renderAi();
    app.innerHTML = html + nav();
    S.aiFresh = false;
    if (active) {
      const el = document.getElementById(active);
      if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch { /* not text */ } }
    }
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
    const chip = t.closest('[data-chip]');
    if (chip) { askAi(chip.dataset.chip, true); return; }
    if (t.closest('[data-retry]')) { askAi(S.ai.query); return; }
    const cat = t.closest('[data-cat]');
    if (cat) {
      document.querySelectorAll('#cats button').forEach((b) => b.classList.toggle('is-active', b === cat));
      document.getElementById(`cat-${cat.dataset.cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const card = t.closest('#app .dish');
    if (card && !t.closest('button')) { openProduct(card.dataset.product); return; }
    const action = t.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'seat') openSeatSheet();
    else if (action === 'call') { if (S.session) openCallSheet(); else openSeatSheet(openCallSheet); }
    else if (action === 'submit') submitToWaiter(t.closest('button'));
    else if (action === 'pay') openPaySheet();
    else if (action === 'bill') requestBill();
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
      await enterTable();
      S.tab = 'ai';
      startPolling();
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

  boot();
})();
