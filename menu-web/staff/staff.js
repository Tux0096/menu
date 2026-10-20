/* Фуджи — терминал персонала: официант / управляющий / администратор */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} ₽`;
  const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
  const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const ls = {
    get(k, d = null) { try { return JSON.parse(localStorage.getItem(`fs:${k}`)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`fs:${k}`, JSON.stringify(v)); } catch { /* noop */ } },
    del(k) { try { localStorage.removeItem(`fs:${k}`); } catch { /* noop */ } },
  };

  const S = {
    token: ls.get('token'),
    staff: ls.get('staff'),
    restaurant: ls.get('restaurant'),
    restaurants: [],
    tab: ls.get('tab', 'tables'),
    notes: [],
    sessions: [],
    openId: null,
    edit: null, // { items, guestCount, dirty }
    catalog: null,
    productSearch: '',
    lastUnreadIds: new Set(),
    menu: { search: '', group: '', onlyStop: false, src: '' },
  };

  const ROLE_TABS = {
    waiter: [['tables', 'Столы']],
    manager: [['tables', 'Столы'], ['hall', 'Контроль зала'], ['feedback', 'Отзывы']],
    admin: [['tables', 'Столы'], ['hall', 'Контроль зала'], ['menu', 'Меню и стоп-лист'], ['chips', 'AI-подсказки'],
      ['promos', 'Баннеры и акции'], ['qr', 'QR-коды'], ['payments', 'Оплата'], ['feedback', 'Отзывы'], ['staff', 'Сотрудники'], ['audit', 'Журнал']],
    marketing: [['menu', 'Карточки блюд'], ['promos', 'Баннеры и акции'], ['chips', 'AI-подсказки']],
  };
  // Что может каждая роль — показывается в карточке сотрудника
  const ROLE_INFO = {
    waiter: ['Официант', 'Столы и заказы гостей, отправка в iiko, «вынесено». Вход на of.menu.franchise-fuji.ru по PIN.'],
    manager: ['Управляющий', 'Статистика и контроль зала, отзывы гостей, плюс всё, что может официант.'],
    marketing: ['Маркетинг', 'Контент меню: карточки блюд, фото, метки «Хит/Новинка», баннеры и акции, AI-подсказки. Без стоп-листа, сотрудников и настроек iiko.'],
    admin: ['Администратор', 'Всё: сотрудники и их доступы, подключение iiko, QR-коды столов, стоп-лист, контент и статистика.'],
  };
  // Домены: of.menu… — экран официантов (только столы), adm.menu… — админка (без экрана столов)
  const HOST = location.hostname.startsWith('of.') ? 'waiter' : location.hostname.startsWith('adm.') ? 'admin' : '';
  function roleTabs(role) {
    const all = ROLE_TABS[role] || ROLE_TABS.waiter;
    const pick = HOST === 'waiter' ? all.filter(([k]) => k === 'tables') : HOST === 'admin' ? all.filter(([k]) => k !== 'tables') : all;
    return pick.length ? pick : all;
  }
  const PLACEMENTS = { menu: 'Меню — карусель сверху', ai: 'Экран AI', order: 'Экран заказа' };
  // Метки как в «Меню сети» админки; у блюда их может быть несколько (через запятую) — тогда здесь только показ
  const BADGES = {
    mild: 'Остро (зелёный)', spicy: 'Остро', new: 'Новинка', hit: 'Хит', kids: 'Детям', gift: 'Подарок', nosugar: 'Без сахара',
    veg: 'Вег', sale: 'Выгодно', chef: 'Шеф рекомендует',
  };
  const badgeList = (v) => String(v || '').split(',').map((b) => b.trim()).filter(Boolean);
  const badgeText = (v) => badgeList(v).map((b) => BADGES[b] || b).join(', ');
  const STATUS = {
    browsing: ['Изучает меню', ''], building_cart: ['Выбирает блюда', ''], cart_ready: ['Ждёт официанта', 'wait'],
    waiter_review: ['Уточняется', 'work'], in_production: ['На кухне', 'work'], reorder_pending: ['Дозаказ', 'wait'],
    bill_requested: ['Просит счёт', 'wait'], paid: ['Оплачено', 'ok'], closed: ['Закрыт', 'ok'],
  };

  async function api(method, path, body) {
    const sep = path.includes('?') ? '&' : '?';
    const url = S.restaurant && !path.startsWith('/api/v1/staff/login') ? `${path}${sep}restaurant=${encodeURIComponent(S.restaurant)}` : path;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    // Сервер продлил вход (смена дольше 12 часов) — запоминаем новый токен
    const fresh = res.headers.get('X-Staff-Token');
    if (fresh && S.token && fresh !== S.token) { S.token = fresh; ls.set('token', fresh); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && S.token) { logout(); throw new Error('Сессия истекла — войдите снова'); }
    if (!res.ok) { const e = new Error(data.error || `Ошибка ${res.status}`); e.status = res.status; e.code = data.code; throw e; }
    return data;
  }

  let toastT;
  function toast(t, err = false) {
    const el = $('#toast'); el.textContent = t; el.classList.toggle('is-error', err); el.classList.add('is-shown');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-shown'), 3000);
  }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start(); o.stop(ctx.currentTime + 0.35);
    } catch { /* no audio */ }
  }

  // ── Вход ───────────────────────────────────────────────────
  // Сервер говорит, как входить (/staff/login-mode): 'iiko' — код сотрудника из iiko, ресторан определяется по открытой смене;
  // 'pin' — PIN из админки в выбранном ресторане (демо iiko). Логин и пароль — для админки, переключатель мелко снизу.
  let serverMode = null;
  let loginMode = 'pin'; // iiko | pin | password
  let loginRests = null;
  const deviceId = () => {
    let id = ls.get('device');
    if (!id) { id = `d-${Math.random().toString(36).slice(2, 12)}`; ls.set('device', id); }
    return id;
  };
  async function resolveLoginMode() {
    if (!serverMode) {
      serverMode = await fetch('/api/v1/staff/login-mode').then((r) => r.json()).then((d) => (d.mode === 'iiko' ? 'iiko' : 'pin')).catch(() => 'pin');
    }
    // Пароль выбран вручную (или админский адрес) — иначе режим от сервера
    loginMode = ls.get('loginMode') === 'password' || (HOST === 'admin' && ls.get('loginMode') !== 'staff') ? 'password' : serverMode;
  }
  async function renderLogin(err = '', choose = null) {
    await resolveLoginMode();
    if (loginMode === 'pin' && !loginRests) {
      loginRests = await fetch('/api/v1/restaurants').then((r) => r.json()).catch(() => []);
    }
    const rest = ls.get('pinRestaurant') || loginRests?.[0]?.slug || '';
    const pinForm = `<select class="inp" name="restaurant" aria-label="Ресторан">${(loginRests || []).map((r) => `<option value="${esc(r.slug)}" ${r.slug === rest ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
      <input class="inp" name="pin" type="password" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" placeholder="PIN" autocomplete="one-time-code" required autofocus>`;
    const iikoForm = choose
      ? `<div class="hint">Смена открыта на нескольких точках — где вы работаете?</div>
         ${choose.restaurants.map((r) => `<button type="button" class="btn" data-pick="${esc(r.slug)}">${esc(r.name)}</button>`).join('')}`
      : `<input class="inp" name="pin" type="password" inputmode="text" maxlength="32" placeholder="PIN из iiko" aria-label="Код сотрудника из iiko (карта или PIN)" autocomplete="one-time-code" autocapitalize="off" required autofocus>`;
    const pwdForm = `<input class="inp" name="login" placeholder="Логин" autocomplete="username" required>
      <input class="inp" name="password" type="password" placeholder="Пароль" autocomplete="current-password" required>`;
    const form = loginMode === 'iiko' ? iikoForm : loginMode === 'pin' ? pinForm : pwdForm;
    const hint = loginMode === 'iiko'
      ? 'Код сотрудника из iiko (карта или PIN). Ресторан определится по открытой смене на кассе.'
      : loginMode === 'pin' ? 'PIN из 4–6 цифр выдаёт администратор. Ресторан телефон запомнит.'
        : 'Для админки. Права зависят от должности: администратор — всё, маркетинг — контент меню.';
    const switchLabel = loginMode === 'password' ? (serverMode === 'iiko' ? 'Войти по PIN из iiko' : 'Войти по PIN (официант)') : 'Войти по логину и паролю';
    $('#app').innerHTML = `<div class="login"><form id="login">
      <div class="brand">ФУДЖИ<small>персонал</small></div>
      ${form}
      ${choose ? '' : '<button class="btn btn--dark" type="submit">Войти</button>'}
      <div class="hint" style="color:var(--danger)" role="alert">${esc(err)}</div>
      <div class="hint">${hint}</div>
      <button type="button" class="btn btn--sm" data-login-mode style="align-self:center;opacity:.7">${switchLabel}</button>
    </form></div>`;
    $('[data-login-mode]').addEventListener('click', () => {
      ls.set('loginMode', loginMode === 'password' ? 'staff' : 'password'); renderLogin();
    });
    const done = (res) => {
      S.token = res.token; S.staff = res.staff;
      ls.set('token', res.token); ls.set('staff', res.staff);
      start();
    };
    const iikoLogin = async (pin, restaurant) => {
      const r = await fetch('/api/v1/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId() },
        body: JSON.stringify({ pin, restaurant: restaurant || undefined }),
      });
      const res = await r.json().catch(() => ({}));
      if (r.status === 409 && res.code === 'CHOOSE_RESTAURANT') return { choose: res.details };
      if (!r.ok) throw new Error(loginErrorText(r.status, res));
      if (res.restaurant?.slug) { S.restaurant = res.restaurant.slug; ls.set('restaurant', S.restaurant); }
      return { res };
    };
    if (choose) {
      document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', async () => {
        try { done((await iikoLogin(choose.pin, b.dataset.pick)).res); } catch (e2) { renderLogin(e2.message); }
      }));
    }
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector('button[type=submit]');
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      try {
        if (loginMode === 'iiko') {
          const pin = String(f.get('pin') || '').trim();
          const r = await iikoLogin(pin);
          if (r.choose) return renderLogin('', { ...r.choose, pin });
          done(r.res);
        } else if (loginMode === 'pin') {
          ls.set('pinRestaurant', f.get('restaurant'));
          const r = await fetch('/api/v1/staff/pin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId() },
            body: JSON.stringify({ restaurant: f.get('restaurant'), pin: f.get('pin') }),
          });
          const res = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(res.error || `Ошибка ${r.status}`);
          S.restaurant = f.get('restaurant'); ls.set('restaurant', S.restaurant);
          done(res);
        } else {
          done(await api('POST', '/api/v1/staff/login', { login: f.get('login'), password: f.get('password') }));
        }
      } catch (e2) { renderLogin(e2.message); }
    });
  }
  // Понятные ошибки входа по коду из iiko
  function loginErrorText(status, res) {
    if (status === 429) return res.error || 'Слишком много попыток — подождите минуту';
    const byCode = {
      INVALID_CODE: 'Неверный код', SHIFT_CLOSED: 'Нет открытой смены — откройте личную смену на кассе iiko',
      DISABLED: 'Вход отключён администратором',
    };
    return byCode[res.code] || res.error || `Ошибка ${status}`;
  }
  function logout() { S.token = null; S.staff = null; ls.del('token'); ls.del('staff'); renderLogin(); }

  // ── Каркас ─────────────────────────────────────────────────
  function shell(content) {
    const tabs = roleTabs(S.staff.role);
    const unread = S.notes.filter((n) => !n.is_read).length;
    return `<div class="shell">
      <header class="top">
        <div class="brand">ФУДЖИ<small>${esc({ waiter: 'официант', manager: 'управляющий', admin: 'администратор', marketing: 'маркетинг' }[S.staff.role] || '')}</small></div>
        ${tabs.length > 1 ? `<nav class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'is-active' : ''}">${l}${k === 'tables' && unread ? `<span class="dot">${unread}</span>` : ''}</button>`).join('')}</nav>` : ''}
        <div class="me">
          <select class="sel" id="rest-select">${S.restaurants.map((r) => `<option value="${esc(r.slug)}" ${r.slug === S.restaurant ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
          <span class="muted">${esc(S.staff.name)}</span>
          <button class="btn btn--sm" data-logout>Выйти</button>
        </div>
      </header>
      <main class="main">${content}</main>
    </div>`;
  }

  async function render() {
    const tabs = roleTabs(S.staff.role).map(([k]) => k);
    if (!tabs.includes(S.tab)) S.tab = tabs[0];
    const view = VIEWS[S.tab];
    try {
      const tabsScroll = $('.tabs')?.scrollLeft || 0;
      $('#app').innerHTML = shell(await view.render());
      // Телефон, открыт стол: общая шапка скрыта — у экрана стола своя, со стрелкой «назад»
      document.body.classList.toggle('table-open', S.tab === 'tables' && Boolean(S.openId && S.edit));
      // Лента вкладок на телефоне: сохраняем прокрутку и показываем активную вкладку
      const tabsEl = $('.tabs');
      const active = $('.tabs .is-active');
      if (tabsEl) {
        tabsEl.scrollLeft = tabsScroll;
        if (active && (active.offsetLeft < tabsEl.scrollLeft || active.offsetLeft + active.offsetWidth > tabsEl.scrollLeft + tabsEl.clientWidth)) {
          tabsEl.scrollLeft = active.offsetLeft - 12;
        }
      }
      view.mounted?.();
    } catch (e) {
      $('#app').innerHTML = shell(`<div class="card error-box">${esc(e.message)}</div>`);
    }
  }

  // ── Официант ───────────────────────────────────────────────
  async function loadWaiter() {
    const [notes, sessions, mine] = await Promise.all([
      api('GET', '/api/v1/waiter/notifications'),
      api('GET', '/api/v1/waiter/sessions'),
      api('GET', '/api/v1/waiter/my-tables').catch(() => null),
    ]);
    if (mine) S.myTables = { ...mine, draft: S.myTables?.dirty ? S.myTables.draft : new Set(mine.tables), dirty: Boolean(S.myTables?.dirty) };
    const fresh = notes.filter((n) => !n.is_read && !S.lastUnreadIds.has(n.id));
    if (S.lastUnreadIds.size && fresh.length) {
      beep();
      if (fresh.some((n) => n.type === 'dish_ready')) { setTimeout(beep, 400); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
      toast(`${fresh[0].title}: ${fresh[0].body}`);
    }
    S.lastUnreadIds = new Set(notes.filter((n) => !n.is_read).map((n) => n.id));
    if (!S.lastUnreadIds.size) S.lastUnreadIds.add('__none__');
    S.notes = notes; S.sessions = sessions;
    const open = sessions.find((x) => x.sessionId === S.openId);
    if (open && S.edit && !S.edit.dirty) S.edit = editFrom(open);
  }

  function statusPill(s) {
    const [label, tone] = STATUS[s.workflowStatus] || [s.workflowStatus, ''];
    return `<span class="pill" data-tone="${tone}">${esc(label)}</span>`;
  }

  // ── Экран стола (официант): отдельный экран, блюда по гостям, панель действий снизу ──
  const COURSES = [[null, 'сразу'], [1, '1'], [2, '2'], [3, '3']];
  // Статус блюда для официанта: отправлено → принято кассой → готовится → готово → вынесено
  const STAGES = {
    sent: ['Ждём подтверждения кассы', 'wait'], accepted: ['Принято кассой', ''], cooking: ['Готовится', 'work'],
    ready: ['Готово — выносить', 'ready'], served: ['✓ Вынесено', 'ok'],
  };
  function stagePill(it) {
    const served = it.servedAt || it.kitchenStatus === 'Served';
    const stage = served ? 'served' : it.isReady ? 'ready' : it.stage || 'accepted';
    const [label, tone] = STAGES[stage] || [it.kitchenLabel || 'на кухне', ''];
    return `<span class="pill pill--stage" data-tone="${tone}">${esc(stage === 'accepted' && it.kitchenLabel ? it.kitchenLabel : label)}</span>`;
  }
  function editorHtml() {
    const s = S.sessions.find((x) => x.sessionId === S.openId);
    if (!s || !S.edit) return '';
    const e = S.edit;
    const total = e.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const guests = s.guests || [];
    const seats = Array.from({ length: Math.max(e.guestCount, guests.length, 1) }, (_, i) => i + 1);
    const nameOf = (n) => guests.find((g) => g.seat === n)?.name || e.seatNames?.[n] || `Гость ${n}`;
    const lockedByOther = s.lockedBy && s.lockedBy !== S.staff.id;
    const pending = e.items.filter((i) => !i.isLocked);
    const pendingQty = pending.reduce((n, i) => n + i.quantity, 0);
    if (S.pickSeat && !seats.includes(S.pickSeat)) S.pickSeat = null;

    // «Набор (Ролл, Суп)» → название и состав отдельной строкой мелким текстом
    const nameOnly = (it) => (it.options && String(it.name).endsWith(`(${it.options})`) ? String(it.name).slice(0, -it.options.length - 3).trim() : it.name);
    const optsLine = (it) => (it.options ? `<div class="trow__comp">${esc(it.options)}</div>` : '');
    const row = (it, idx) => {
      const served = it.servedAt || it.kitchenStatus === 'Served';
      const src = ''; // кухня/бар делятся только при отправке в iiko — в интерфейсе одно меню
      if (it.isLocked) {
        return `<div class="trow is-sent ${served ? 'is-served' : ''} ${it.isReady ? 'is-ready' : ''}">
          <div class="trow__main"><div class="trow__name">${esc(nameOnly(it))} <span class="muted">×${it.quantity}</span></div>${optsLine(it)}
            <div class="trow__meta">${src}${stagePill(it)}${it.course ? ` · курс ${it.course}` : ''}</div></div>
          ${it.isReady && !served ? `<button class="btn btn--sm btn--dark" data-served-item="${esc(it.id)}">Вынесено</button>` : `<b class="trow__sum">${rub(it.price * it.quantity)}</b>`}
        </div>`;
      }
      return `<div class="trow is-new">
        <div class="trow__main"><div class="trow__name">${esc(nameOnly(it))}</div>${optsLine(it)}
          <div class="trow__meta">${src}${rub(it.price)} · <b style="color:var(--ok)">новое</b></div></div>
        <div class="qty"><button class="icon-btn" data-qty="${idx}" data-d="-1" aria-label="Меньше">−</button><b>${it.quantity}</b><button class="icon-btn icon-btn--dark" data-qty="${idx}" data-d="1" aria-label="Больше">+</button></div>
        <div class="trow__opts">
          <div class="seg" role="group" aria-label="Курс подачи"><span>Курс</span>${COURSES.map(([c, l]) => `<button class="${(it.course || null) === c ? 'is-on' : ''}" data-course-set="${idx}" data-c="${c ?? ''}">${l}</button>`).join('')}</div>
          <select class="sel sel--sm" data-seat="${idx}" aria-label="Гость"><option value="">Без гостя</option>${seats.map((n) => `<option value="${n}" ${Number(it.seatNumber) === n ? 'selected' : ''}>${esc(`${n} · ${nameOf(n)}`)}</option>`).join('')}</select>
        </div>
      </div>`;
    };
    // Блюда по гостям (место = гость по порядку присоединения), без места — отдельно
    const blocks = [...seats, null].map((seat) => {
      const list = e.items.map((it, idx) => [it, idx]).filter(([it]) => (Number(it.seatNumber) || null) === seat);
      if (!list.length) return '';
      const sum = list.reduce((n, [it]) => n + it.price * it.quantity, 0);
      return `<div class="gblock"><div class="gblock__title"><span>${seat ? `<b>${seat}</b> ${esc(nameOf(seat))}` : 'Без гостя'}</span><span>${rub(sum)}</span></div>
        ${list.map(([it, idx]) => row(it, idx)).join('')}</div>`;
    }).join('');

    return `<section class="tscreen" id="editor">
      <div class="tscreen__head">
        <button class="back-btn" data-hide-editor aria-label="К списку столов"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="tscreen__title"><div class="h2" style="margin:0">Стол №${esc(s.tableNumber)}</div>
          <div class="muted" style="font-size:12px">Открыт ${time(s.createdAt)}${s.waitingMinutes != null ? ` · ждёт ${s.waitingMinutes} мин` : ''}${s.guest?.visitsCount ? ` · визитов: ${s.guest.visitsCount}` : ''}</div></div>
        ${statusPill(s)}
      </div>
      ${lockedByOther ? '<div class="error-box">Стол сейчас редактирует другой официант</div>' : ''}
      ${s.readyCount ? `<div class="ready-box"><span>🔔 Готово на кухне: ${s.items.filter((i) => i.isReady).map((i) => `${esc(i.name)} ×${i.quantity}${i.guestName ? ` — ${esc(i.guestName)}` : ''}`).join(', ')}</span>
        <button class="btn btn--sm btn--dark" data-served>Вынесено всё</button></div>` : ''}
      ${(s.billRequests || []).length ? `<div class="bill-box"><b>Счёт запрошен</b>${s.billRequests.map((r) => `<div>${esc(r.by ? `${r.by}: ` : '')}${r.part === 'bar' ? 'бар (кухня оплачена онлайн), ' : ''}${r.scope === 'table' ? 'за весь стол' : esc((r.names || []).join(' и '))} — <b>${rub(r.amount)}</b>${r.method ? ` <span class="pill" data-tone="wait">${r.method === 'cash' ? 'наличными' : 'картой'}</span>` : ''} <span class="muted">${dateTime(r.at)}</span></div>`).join('')}</div>` : ''}
      ${s.iikoLastError ? `<div class="error-box"><b>Ошибка iiko:</b> ${esc(s.iikoLastError)}<br>Не отправленное сохранено — нажмите «В работу» ещё раз.</div>` : ''}
      <div class="gbar">
        <span class="muted">Гостей</span>
        <div class="qty"><button class="icon-btn" data-guests="-1" aria-label="Меньше гостей">−</button><b>${e.guestCount}</b><button class="icon-btn" data-guests="1" aria-label="Больше гостей">+</button></div>
        <div class="gbar__names">${seats.map((n) => (guests.some((g) => g.seat === n)
    ? `<span class="gchip"><b>${n}</b> ${esc(nameOf(n))}</span>`
    : `<button class="gchip gchip--edit" data-seat-name="${n}" title="Назвать гостя"><b>${n}</b> ${esc(nameOf(n))} <span class="muted">✎</span></button>`)).join('')}</div>
      </div>
      <div class="tscreen__items">${blocks || '<div class="empty-note">Заказа пока нет. Нажмите «+ Блюдо», чтобы добавить из меню.</div>'}</div>
      <div class="tscreen__total"><span class="muted">Итого по столу</span><b>${rub(total)}</b></div>
      ${payBox(s, pending)}
      <div class="tbar">
        <div class="tbar__status muted">${S.saveFailed ? '<b style="color:var(--danger)">Не сохранено — нет связи, повторяем</b>' : S.saving ? 'Сохраняем…' : e.dirty ? 'Есть несохранённые правки' : pendingQty ? `Новых: ${pendingQty} — ещё не на кухне` : 'Всё отправлено'}</div>
        <div class="tbar__btns">
          <button class="btn" data-open-picker ${lockedByOther ? 'disabled' : ''}>+ Блюдо</button>
          <button class="btn btn--dark grow" data-send ${pending.length && !lockedByOther ? '' : 'disabled'}>В работу${pendingQty ? ` · ${pendingQty}` : ''}</button>
        </div>
      </div>
      ${S.picker ? pickerHtml(seats, nameOf) : ''}
    </section>`;
  }

  /** Оплата официанту: наличные или карта — оплата и закрытие заказов в iiko (кухня и бар). */
  function payBox(s, pending) {
    if (s.isPaid || !(s.sentTotal > 0)) return '';
    const online = s.onlinePaid?.amount || 0;
    const due = Math.max(0, s.sentTotal - online);
    const ask = [...(s.billRequests || [])].reverse().find((r) => r.method);
    return `<div class="pay-box">
      <div><b>К оплате ${rub(due)}</b>${online ? ` <span class="muted">· онлайн оплачено ${rub(online)}</span>` : ''}
        ${ask ? `<div class="muted" style="font-size:12px">Гость хочет ${ask.method === 'cash' ? 'наличными' : 'картой'}</div>` : ''}</div>
      <div class="pay-box__btns">
        <button class="btn btn--sm ${ask?.method === 'cash' ? 'btn--dark' : ''}" data-accept-pay="cash" ${pending.length ? 'disabled' : ''}>Наличными</button>
        <button class="btn btn--sm ${ask?.method !== 'cash' ? 'btn--dark' : ''}" data-accept-pay="card" ${pending.length ? 'disabled' : ''}>Картой</button>
        <button class="btn btn--sm" data-close-table title="Счёт закрыт на кассе — просто закрыть стол">Закрыть стол</button>
      </div>
      ${pending.length ? '<div class="muted" style="font-size:12px">Сначала отправьте новые блюда в работу</div>' : ''}
    </div>`;
  }

  /** Выбор блюд — шторка поверх экрана стола: поиск, категории, «+» добавляет выбранному гостю. */
  function pickerHtml(seats, nameOf) {
    const q = S.productSearch.trim().toLowerCase();
    const products = S.catalog?.products || [];
    const groups = (S.catalog?.groups || []).filter((g) => products.some((p) => p.parentGroup === g.id));
    if (!S.pickCat || !groups.some((g) => g.id === S.pickCat)) S.pickCat = groups[0]?.id || null;
    const found = q ? products.filter((p) => !p.isAlias && p.name.toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q)).slice(0, 40) : products.filter((p) => p.parentGroup === S.pickCat);
    const inCart = (p) => S.edit.items.filter((i) => !i.isLocked && String(i.productId) === String(p.id) && (Number(i.seatNumber) || null) === (S.pickSeat || null)).reduce((n, i) => n + i.quantity, 0);
    return `<div class="pick-backdrop" data-close-picker>
      <div class="pick-sheet" role="dialog" aria-label="Добавить блюда">
        <div class="pick-sheet__grip"></div>
        <div class="pick-sheet__head"><div class="h3" style="margin:0">Добавить блюда</div><button class="btn btn--sm btn--dark" data-close-picker-btn>Готово</button></div>
        <div class="seg seg--wide" role="group" aria-label="Кому">${[null, ...seats].map((n) => `<button class="${(S.pickSeat || null) === n ? 'is-on' : ''}" data-pick-seat="${n ?? ''}">${n ? esc(`${n} · ${nameOf(n)}`) : 'Всем'}</button>`).join('')}</div>
        ${S.catalog?.businessLunch?.combos?.length ? `<button class="lunch-btn ${S.catalog.businessLunch.active ? '' : 'is-off'}" data-open-lunch>
          <span><b>Бизнес-ланч</b><small>${S.catalog.businessLunch.active ? `Собрать набор · ${esc(S.catalog.businessLunch.text)}` : `Сейчас недоступен · доступен ${esc(S.catalog.businessLunch.text)}`}</small></span><i>›</i></button>` : ''}
        ${products.length ? `<input class="inp" id="prod-search" style="width:100%" placeholder="Поиск: название или артикул" value="${esc(S.productSearch)}" autocomplete="off">
          ${q ? '' : `<div class="picker__cats">${groups.map((g) => `<button class="${g.id === S.pickCat ? 'is-active' : ''}" data-pick-cat="${esc(g.id)}">${esc(g.name)}</button>`).join('')}</div>`}
          <div class="pick-list">${found.map((p) => { const n = inCart(p); return `<button class="pick-item" data-add="${esc(p.id)}" ${p.isInStopList ? 'disabled' : ''}>
            <span class="pick-item__name">${esc(p.name)}${p.isInStopList ? ' <span class="pill" data-tone="bad">стоп</span>' : ''}${p.sku ? ` <span class="muted" style="font-size:11px">арт. ${esc(p.sku)}</span>` : ''}</span>
            <span class="pick-item__price">${hasVariants(p) ? '<span class="pill" style="font-size:10px">выбор</span> от ' : ''}${rub(p.price)}</span><span class="pick-item__add ${n ? 'has' : ''}">${n || '+'}</span></button>`; }).join('') || '<div class="muted" style="padding:12px">Ничего не найдено</div>'}</div>`
    : '<div class="error-box">Меню этого ресторана пустое — выгрузите его из iiko (админка → «Меню и стоп-лист»).</div>'}
      </div>
    </div>`;
  }

  const VIEWS = {
    tables: {
      async render() {
        await loadWaiter();
        const unread = S.notes.filter((n) => !n.is_read);
        const open = S.sessions.filter((x) => x.status === 'open' || x.sessionId === S.openId);
        const unreadBy = new Set(unread.map((n) => n.session_id));
        // Сверху — столы, которые ждут официанта: новый заказ/дозаказ, счёт, готовые блюда, долгое ожидание, вызов
        const needs = (x) => ['cart_ready', 'reorder_pending', 'bill_requested'].includes(x.workflowStatus) || x.readyCount > 0 || x.isOverdue || unreadBy.has(x.sessionId);
        const hot = open.filter(needs);
        const rest = open.filter((x) => !needs(x));
        const myList = S.myTables?.tables || [];
        const isMine = (x) => myList.includes(String(x.tableNumber));
        const card = (x) => `<button class="tcard ${S.openId === x.sessionId ? 'is-open' : ''} ${needs(x) ? 'is-hot' : ''}" data-open="${esc(x.sessionId)}">
          <div class="tcard__num">${esc(x.tableNumber)}${isMine(x) ? '<span class="tcard__mine" title="Мой стол">★</span>' : ''}</div>
          <div class="tcard__body">
            <div class="tcard__pills">${statusPill(x)}${x.readyCount ? ` <span class="pill" data-tone="bad">🔔 Готово ${x.readyCount}</span>` : ''}${x.isOverdue ? ` <span class="overdue">⏱ ${x.waitingMinutes} мин</span>` : ''}</div>
            <div class="tcard__guest">${esc((x.guests || []).length ? x.guests.map((g) => g.name).join(', ') : (x.guest?.name || 'Гость'))}${x.pendingCount ? ` · новых: ${x.pendingCount}` : ''}</div>
          </div>
          <div class="tcard__sum">${rub(x.total)}</div>
        </button>`;
        const tablesHtml = open.length
          ? `${hot.length ? `<div class="tsection">Ждут вас · ${hot.length}</div><div class="tlist">${hot.map(card).join('')}</div>` : ''}
             ${rest.length ? `<div class="tsection">${hot.length ? 'Остальные' : 'Активные столы'} · ${rest.length}</div><div class="tlist">${rest.map(card).join('')}</div>` : ''}`
          : '<div class="empty-note">Нет активных столов. Когда гость отсканирует QR, стол появится здесь.</div>';
        const notesHtml = `<div class="toolbar" style="margin-bottom:8px"><div class="grow muted">${unread.length ? `Непрочитанных: ${unread.length}` : 'Все прочитаны'}</div>
            ${unread.length ? '<button class="btn btn--sm" data-read-all>Прочитать все</button>' : ''}</div>
          <div class="feed">${S.notes.length ? S.notes.map((n) => `<button class="note ${n.is_read ? '' : 'is-unread'}" data-type="${esc(n.type)}" data-note="${esc(n.id)}" data-session="${esc(n.session_id || '')}">
            <div class="note__head"><span>${esc(n.title)}</span><span class="note__time">${time(n.created_at)}</span></div>
            <div class="note__body">${esc(n.body)}</div></button>`).join('') : '<div class="muted">Пока тихо</div>'}</div>`;
        const view = ['notes', 'mine'].includes(S.wview) ? S.wview : 'tables';
        // «Мои столы»: за какие столы отвечаю — уведомления и push только по ним (плюс столы без ответственного)
        const mt = S.myTables;
        const mineHtml = !mt ? '<div class="muted">Загружаем…</div>' : `<p class="muted" style="margin:0 0 10px;font-size:13px">
            Отметьте свои столы — уведомления и push будут приходить по ним, по столам, которые вы ведёте, и по столам, за которые никто не отвечает.
            Ничего не отмечено — приходят по всем столам.</p>
          <div class="mt-grid">${Array.from({ length: mt.tablesCount || 20 }, (_, i) => String(i + 1)).map((n) => {
            const on = mt.draft.has(n); const who = mt.others?.[n];
            return `<button class="mt-cell ${on ? 'is-on' : ''}" data-my-table="${n}" aria-pressed="${on}"><b>${n}</b>${who ? `<small>${esc(who.join(', '))}</small>` : ''}</button>`;
          }).join('')}</div>
          <div class="mt-bar"><span class="muted grow">${mt.draft.size ? `Выбрано: ${mt.draft.size}` : 'Все столы'}</span>
            ${mt.draft.size ? '<button class="btn btn--sm" data-my-clear>Снять все</button>' : ''}
            <button class="btn btn--sm btn--dark" data-my-save ${mt.dirty ? '' : 'disabled'}>Сохранить</button></div>`;
        return `<div class="waiter ${S.openId && S.edit ? 'has-open' : ''}">
          <section class="waiter__list">
            <div class="seg seg--wide seg--tabs" role="tablist">
              <button class="${view === 'tables' ? 'is-on' : ''}" data-wview="tables">Столы · ${open.length}</button>
              <button class="${view === 'notes' ? 'is-on' : ''}" data-wview="notes">Уведомления${unread.length ? ` <span class="dot-inline">${unread.length}</span>` : ''}</button>
              <button class="${view === 'mine' ? 'is-on' : ''}" data-wview="mine">Мои столы${S.myTables?.tables?.length ? ` · ${S.myTables.tables.length}` : ''}</button>
            </div>
            ${view === 'notes' ? notesHtml : view === 'mine' ? mineHtml : tablesHtml}
          </section>
          <section class="waiter__table">${editorHtml() || '<div class="empty-note hide-sm">Выберите стол слева</div>'}</section>
        </div>`;
      },
      mounted() {
        const inp = $('#prod-search');
        if (inp && S.productSearch) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        const list = $('.pick-list');
        if (list && S.pickScroll) list.scrollTop = S.pickScroll;
      },
    },

    hall: {
      async render() {
        const d = await api('GET', '/api/v1/manager/dashboard');
        const k = (label, value, bad = false) => `<div class="kpi ${bad ? 'is-bad' : ''}"><span class="muted">${label}</span><b>${value}</b></div>`;
        return `<div class="kpis">
          ${k('Столов в работе', d.activeTables)}
          ${k(`Ждут дольше ${d.slaMinutes} мин`, d.overdueTables, d.overdueTables > 0)}
          ${k('Ждут официанта', d.waitingTables, d.waitingTables > 0)}
          ${k('Открытые вызовы', d.openCalls, d.openCalls > 0)}
          ${k('Визитов сегодня', d.today.visits)}
          ${k('Заказов в iiko', d.today.orders)}
          ${k('Выручка QR', rub(d.today.revenue))}
          ${k('Средний чек', rub(d.today.avgCheck))}
          ${k('Оплачено онлайн', rub(d.today.paidSum))}
          ${k('Чаевые', rub(d.today.tips))}
          ${k('Реакция официанта', `${d.today.avg_response_min.toFixed(1)} мин`, d.today.avg_response_min > d.slaMinutes)}
          ${k('Оценка (30 дн.)', d.feedback30d.count ? `${d.feedback30d.avg.toFixed(1)} ★ (${d.feedback30d.count})` : '—', d.feedback30d.low > 0)}
        </div>
        <div class="grid-2">
          <section class="card"><div class="h3">Столы и время ожидания</div>
            <div class="tbl-wrap"><table class="tbl"><tr><th>Стол</th><th>Статус</th><th>Гость</th><th>Ждёт</th><th>Сумма</th></tr>
            ${d.sessions.map((s) => `<tr><td><b>№${esc(s.tableNumber)}</b></td><td>${statusPill(s)}</td><td>${esc(s.guest?.name || '—')}</td>
              <td>${s.waitingMinutes != null ? `<span class="${s.isOverdue ? 'overdue' : ''}">${s.waitingMinutes} мин</span>` : '—'}</td><td>${rub(s.total)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Нет активных столов</td></tr>'}
            </table></div></section>
          <section class="card"><div class="h3">Официанты сегодня</div>
            <div class="tbl-wrap"><table class="tbl"><tr><th>Официант</th><th>Столов</th><th>Выручка</th><th>Чаевые</th><th>Оценка</th></tr>
            ${d.waiters.map((w) => `<tr><td>${esc(w.name)}</td><td>${w.tables}</td><td>${rub(w.revenue)}</td><td>${rub(w.tips)}</td><td>${w.rating ? `${w.rating.toFixed(1)} ★` : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Нет данных</td></tr>'}
            </table></div></section>
        </div>`;
      },
    },

    menu: {
      async render() {
        if (!S.adminMenu || S.adminMenu.restaurant !== S.restaurant) {
          S.adminMenu = { restaurant: S.restaurant, ...(await api('GET', '/api/v1/admin/menu')) };
        }
        S.adminSources = S.staff.role !== 'admin' ? null : await api('GET', '/api/v1/admin/sources').catch(() => null);
        // Подключения iiko (кухня, бар) настраиваются при деплое — в админке одно меню
        return menuTable();
      },
    },

    chips: crudView({
      title: 'AI-подсказки (чипы на экране AI)',
      path: '/api/v1/admin/chips',
      fields: [['emoji', 'Эмодзи', 'text'], ['label', 'Текст чипа', 'text'], ['query', 'Запрос к AI', 'text'], ['sort_order', 'Порядок', 'number'], ['is_active', 'Показывать', 'bool']],
      hint: 'Чипы показываются гостю на экране AI. «Запрос к AI» — что будет искать помощник при нажатии.',
    }),
    promos: {
      path: '/api/v1/admin/promos',
      async render() {
        const rows = await api('GET', '/api/v1/admin/promos');
        const rest = (id) => (id ? S.restaurants.find((r) => r.id === id)?.name || 'ресторан' : 'Все рестораны');
        const state = (b) => {
          const now = Date.now();
          if (!b.is_active) return ['выключен', ''];
          if (b.starts_at && new Date(b.starts_at) > now) return [`с ${dateTime(b.starts_at)}`, 'wait'];
          if (b.ends_at && new Date(b.ends_at) <= now) return ['завершён', ''];
          return ['показывается', 'ok'];
        };
        return `<div class="card"><div class="toolbar"><div class="h2 grow" style="margin:0">Баннеры и акции</div>
            <button class="btn btn--dark btn--sm" data-banner-new>Добавить баннер</button></div>
          <p class="muted" style="margin-top:0">Баннеры видят гости в QR-меню: карусель над меню, на экране AI или в заказе.
            По нажатию открывается блюдо, раздел меню или ссылка. Картинка — 2:1, например 1200×600.</p>
          ${rows.length ? `<div class="banner-grid">${rows.map((b) => {
            const [label, tone] = state(b);
            return `<div class="banner-card">
              <div class="banner-card__img">${b.image_url ? `<img src="${esc(b.image_url)}" alt="" loading="lazy">` : `<span>${esc(b.title)}</span>`}</div>
              <div class="banner-card__body">
                <b>${esc(b.title)}</b>
                <div class="muted" style="font-size:12px">${esc(PLACEMENTS[b.placement] || PLACEMENTS.menu)} · ${esc(rest(b.restaurant_id))}${b.ends_at ? ` · до ${dateTime(b.ends_at)}` : ''}</div>
                <div style="display:flex;gap:6px;align-items:center;margin-top:8px"><span class="pill" data-tone="${tone}">${label}</span>
                  <span class="grow"></span>
                  <button class="btn btn--sm" data-banner-edit='${esc(JSON.stringify(b))}'>Изменить</button>
                  <button class="btn btn--sm btn--danger" data-crud-del="/api/v1/admin/promos/${b.id}">Удалить</button></div>
              </div></div>`;
          }).join('')}</div>` : '<div class="muted" style="padding:24px 0;text-align:center">Баннеров пока нет</div>'}
        </div>`;
      },
    },

    qr: {
      async render() {
        const [tables, rests] = await Promise.all([api('GET', '/api/v1/admin/tables'), api('GET', '/api/v1/admin/restaurants')]);
        const r = rests.find((x) => x.slug === S.restaurant) || rests[0];
        return `<div class="toolbar no-print"><div class="h2 grow" style="margin:0">QR-коды столов — ${esc(r.name)}</div>
          <label class="muted">Столов:</label><input class="inp" type="number" min="1" max="200" id="tables-count" value="${r.tables_count}" style="width:90px">
          <button class="btn btn--sm" data-save-tables="${esc(r.id)}">Сохранить</button>
          <button class="btn btn--dark btn--sm" onclick="window.print()">Печать</button></div>
          <div class="qr-grid">${tables.map((t) => `<div class="qr-card"><b>Стол №${esc(t.table)}</b>
            <img src="${esc(t.qr)}" alt="QR стол ${esc(t.table)}" loading="lazy">
            <div style="font-size:12px">Отсканируйте, чтобы открыть меню</div>
            <small><a href="${esc(t.url)}" target="_blank">${esc(t.url)}</a></small></div>`).join('')}</div>`;
      },
    },

    // Ключи оплаты ресторана: онлайн — только кухня (CloudPayments), бар гость оплачивает картой официанту
    payments: {
      async render() {
        const p = await api('GET', '/api/v1/admin/payments');
        const r = S.restaurants.find((x) => x.slug === S.restaurant) || S.restaurants[0] || {};
        return `<div class="card" style="max-width:720px"><div class="h2">Оплата — ${esc(r.name || '')}</div>
          <p class="muted" style="margin-top:0">Гость выбирает в меню: <b>онлайн</b>, <b>картой официанту</b> или <b>наличными</b>, и за кого платит
            (весь стол, свой заказ или отмеченные гости). Онлайн оплачивается только кухня; бар — картой официанту.
            После онлайн-оплаты заказ кухни в iiko закрывается сам, официанту приходит «бар — принять картой».</p>
          <div style="margin:0 0 14px"><span class="pill" data-tone="${p.ready ? 'ok' : ''}">${p.ready ? 'Онлайн-оплата работает' : p.onlineEnabled ? 'Не хватает ключей' : 'Онлайн-оплата выключена'}</span></div>
          <form id="pay-form">
            <label style="display:flex;gap:10px;align-items:center;margin-bottom:14px"><input type="checkbox" name="onlineEnabled" ${p.onlineEnabled ? 'checked' : ''}> Принимать оплату онлайн (CloudPayments)</label>
            <div class="field"><label>Public ID (из кабинета CloudPayments → Сайты)</label><input class="inp" name="publicId" value="${esc(p.publicId || '')}" autocomplete="off" placeholder="pk_…"></div>
            <div class="field"><label>Пароль для API (API Secret)${p.hasSecret ? ' — задан, пусто — не менять' : ''}</label><input class="inp" name="apiSecret" type="password" autocomplete="new-password" placeholder="${p.hasSecret ? '••••••••' : 'из кабинета CloudPayments'}"></div>
            ${p.hasSecret ? '<label style="display:flex;gap:10px;align-items:center;margin:0 0 14px"><input type="checkbox" name="clearSecret"> Удалить сохранённый пароль API</label>' : ''}
            <div class="field"><label>Тип оплаты в iiko кухни (ID, необязательно)</label><input class="inp" name="iikoPaymentTypeId" value="${esc(p.iikoPaymentTypeId || '')}" autocomplete="off" placeholder="пусто — тип с названием «Онлайн»"></div>
            <div class="h3" style="margin:18px 0 6px">Оплата официанту (кухня)</div>
            <p class="muted" style="margin-top:0;font-size:13px">Официант нажимает «Наличными» или «Картой» на экране стола — оплата вносится в iiko и счёт закрывается (кухня и бар).
              Типы оплат находятся в iiko автоматически («Наличные», «Банковские карты»); ID нужен, только если выбирается не тот.</p>
            <div class="field"><label>Тип оплаты «Наличные» в iiko (ID, необязательно)</label><input class="inp" name="iikoCashTypeId" value="${esc(p.iikoCashTypeId || '')}" autocomplete="off" placeholder="авто"></div>
            <div class="field"><label>Тип оплаты «Карта» в iiko (ID, необязательно)</label><input class="inp" name="iikoCardTypeId" value="${esc(p.iikoCardTypeId || '')}" autocomplete="off" placeholder="авто"></div>
            <p class="muted" style="font-size:12px">Пароль API хранится только на сервере и в браузер не возвращается. Уведомления (колбэк) CloudPayments не нужны — статус оплаты сервер проверяет сам.</p>
            <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button></div>
          </form></div>`;
      },
      mounted() {
        $('#pay-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const body = {
            onlineEnabled: f.onlineEnabled.checked, publicId: f.publicId.value.trim(), apiSecret: f.apiSecret.value.trim(),
            clearSecret: Boolean(f.clearSecret?.checked), iikoPaymentTypeId: f.iikoPaymentTypeId.value.trim(),
            iikoCashTypeId: f.iikoCashTypeId.value.trim(), iikoCardTypeId: f.iikoCardTypeId.value.trim(),
          };
          if (body.onlineEnabled && (!body.publicId || (!body.apiSecret && !f.clearSecret && !$('#pay-form [name=apiSecret]').placeholder.startsWith('•')))) {
            toast('Для онлайн-оплаты нужны Public ID и пароль API', true); return;
          }
          try { await api('POST', '/api/v1/admin/payments', body); toast('Сохранено'); render(); } catch (err) { toast(err.message, true); }
        });
      },
    },

    feedback: {
      async render() {
        const rows = await api('GET', '/api/v1/manager/feedback');
        return `<div class="card"><div class="h2">Отзывы гостей</div><div class="tbl-wrap"><table class="tbl tbl--cards">
          <tr><th>Когда</th><th>Стол</th><th>Оценка</th><th>Комментарий</th><th>Гость</th><th>Официант</th><th>Сумма</th></tr>
          ${rows.map((f) => `<tr><td data-label="Когда">${dateTime(f.created_at)}</td><td data-label="Стол">№${esc(f.table_number)}</td>
            <td data-label="Оценка"><span class="stars">${'★'.repeat(f.rating)}</span><span class="muted">${'★'.repeat(5 - f.rating)}</span></td>
            <td data-label="Комментарий">${f.rating <= 3 ? '<span class="pill" data-tone="bad">эскалация</span> ' : ''}${esc(f.comment || '')}</td>
            <td data-label="Гость">${esc(f.guest_name || '—')}</td><td data-label="Официант">${esc(f.waiter_name || '—')}</td><td data-label="Сумма">${rub(f.total)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Отзывов пока нет</td></tr>'}
        </table></div></div>`;
      },
    },

    staff: {
      async render() {
        const [rows, rests] = await Promise.all([api('GET', '/api/v1/admin/staff'), api('GET', '/api/v1/admin/restaurants')]);
        S.staffRests = rests;
        const roleName = { admin: 'Администратор', manager: 'Управляющий', waiter: 'Официант', marketing: 'Маркетинг' };
        return `<div class="card"><div class="toolbar"><div class="h2 grow" style="margin:0">Сотрудники</div><button class="btn btn--dark btn--sm" data-staff-new>Добавить</button></div>
          <div class="tbl-wrap"><table class="tbl tbl--cards"><tr><th>Имя</th><th>Логин</th><th>Роль</th><th>PIN</th><th>Ресторан</th><th>Статус</th><th></th></tr>
          ${rows.map((u) => `<tr><td class="td-title">${esc(u.name)}</td><td data-label="Логин">${esc(u.login)}</td><td data-label="Роль">${roleName[u.role]}</td><td data-label="PIN">${u.hasPin ? '●●●●' : '—'}</td>
            <td data-label="Ресторан">${esc(rests.find((r) => r.id === u.restaurantId)?.name || 'Все')}</td><td data-label="Статус">${u.isActive ? '<span class="pill" data-tone="ok">активен</span>' : '<span class="pill">отключён</span>'}</td>
            <td class="td-actions"><button class="btn btn--sm" data-staff-edit='${esc(JSON.stringify(u))}'>Изменить</button></td></tr>`).join('')}
          </table></div></div>`;
      },
    },

    audit: {
      async render() {
        const rows = await api('GET', '/api/v1/admin/audit');
        return `<div class="card"><div class="h2">Журнал изменений</div><div class="tbl-wrap"><table class="tbl tbl--cards">
          <tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Детали</th></tr>
          ${rows.map((a) => `<tr><td data-label="Когда">${dateTime(a.created_at)}</td><td data-label="Кто">${esc(a.staff_name || '')}</td><td data-label="Действие">${esc(a.action)}</td>
            <td data-label="Объект">${esc(a.entity || '')} ${esc((a.entity_id || '').slice(0, 12))}</td><td class="muted" data-label="Детали" style="font-size:12px;max-width:380px;overflow-wrap:anywhere">${esc(JSON.stringify(a.payload || {})).slice(0, 200)}</td></tr>`).join('')}
        </table></div></div>`;
      },
    },
  };

  // ── Админ: источники iiko (кухня + бар в другом iiko) ─────
  const SOURCE_LABEL = { main: 'Кухня', bar: 'Бар' };
  const sourceLabel = (code) => SOURCE_LABEL[code] || code;
  function sourcesCard() {
    const d = S.adminSources;
    if (!d) return '';
    const credsLabel = (c) => d.creds.find((x) => x.code === c)?.label || (c ? `Ключ ${c} — не задан на сервере` : 'Основной ключ');
    return `<div class="card" style="margin-bottom:16px">
      <div class="toolbar"><div class="h2 grow" style="margin:0">Источники iiko</div>
        <button class="btn btn--sm btn--dark" data-src-add>Добавить бар / другой iiko</button></div>
      <p class="muted" style="margin-top:0">Меню собирается из всех источников в одно — гость и официант видят один список.
        При «В работу» заказ делится: каждая часть уходит в свой iiko на тот же стол.</p>
      <div class="tbl-wrap"><table class="tbl tbl--cards"><tr><th>Источник</th><th>Организация iiko</th><th>Ключ</th><th>Внешнее меню</th><th></th></tr>
        ${d.sources.map((x) => `<tr>
          <td class="td-title">${esc(x.isMain ? 'Кухня (основной)' : x.name)}${x.is_enabled === false ? ' <span class="pill">выключен</span>' : ''}</td>
          <td data-label="Организация" style="font-size:12px;overflow-wrap:anywhere">${esc(x.organization_id || '—')}</td>
          <td data-label="Ключ">${esc(credsLabel(x.creds))}</td>
          <td data-label="Меню">${esc(x.isMain ? 'из настроек ресторана' : (x.external_menu_id ? `#${x.external_menu_id}` : 'авто'))}</td>
          <td class="td-actions">${x.isMain ? '' : `<button class="btn btn--sm" data-src-edit='${esc(JSON.stringify(x))}'>Изменить</button>
            <button class="btn btn--sm btn--danger" data-src-del="${esc(x.code)}">Удалить</button>`}</td></tr>`).join('')}
      </table></div>
    </div>`;
  }

  function openSourceForm(x = {}) {
    const d = S.adminSources;
    modal(`<div class="h2">${x.code ? 'Источник iiko' : 'Новый источник iiko'}</div>
      <p class="muted" style="margin-top:0">Например, бар: алкоголь продаётся через другую организацию iiko. Если она в другом аккаунте iiko —
        добавьте на сервер секреты IIKO_BAR_API_LOGIN, IIKO_BAR_CLIENT_SECRET (и IIKO_BAR_APP_ID, если отличается) и выберите «Ключ BAR».</p>
      <form id="src-form"><div class="form-grid">
        <div class="field"><label>Название</label><input class="inp" name="name" value="${esc(x.name || 'Бар')}" required></div>
        <div class="field"><label>Код</label><input class="inp" name="code" value="${esc(x.code || 'bar')}" ${x.code ? 'readonly' : ''} pattern="[a-z0-9_]+" required></div>
        <div class="field"><label>Ключ iiko</label><select class="sel" name="creds" id="src-creds">${d.creds.map((c) => `<option value="${esc(c.code)}" ${(x.creds || '') === c.code ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
        <div class="field"><label>Организация iiko</label><select class="sel" name="organizationId" id="src-org" required><option value="">Загрузка…</option></select></div>
        <div class="field"><label>Внешнее меню</label><select class="sel" name="externalMenuId" id="src-menu"><option value="">Авто</option></select></div>
        <label style="display:flex;gap:10px;align-items:center;margin-top:20px"><input type="checkbox" name="isEnabled" ${x.is_enabled !== false ? 'checked' : ''}> Включён</label>
      </div>
      <div class="error-box hidden" id="src-err"></div>
      <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить и выгрузить меню</button><button class="btn" type="button" data-modal-close>Отмена</button></div></form>`, (root) => {
      const load = async () => {
        const creds = $('#src-creds', root).value;
        const err = $('#src-err', root);
        err.classList.add('hidden');
        try {
          const o = await api('GET', `/api/v1/admin/sources/options?creds=${encodeURIComponent(creds)}`);
          $('#src-org', root).innerHTML = o.orgs.length
            ? o.orgs.map((g) => `<option value="${esc(g.id)}" ${g.id === x.organization_id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')
            : `<option value="${esc(x.organization_id || '')}">${x.organization_id ? esc(x.organization_id) : 'iiko не вернул организаций'}</option>`;
          $('#src-menu', root).innerHTML = `<option value="">Авто</option>${o.menus.map((m) => `<option value="${esc(m.id)}" ${m.id === String(x.external_menu_id || '') ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}`;
        } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
      };
      $('#src-creds', root).addEventListener('change', load);
      load();
      $('#src-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        fd.isEnabled = e.target.elements.isEnabled.checked;
        const btn = e.submitter; if (btn) { btn.disabled = true; btn.textContent = 'Сохраняем и выгружаем…'; }
        try {
          await api('POST', '/api/v1/admin/sources', fd);
          S.adminMenu = await api('POST', '/api/v1/admin/menu/sync');
          S.adminMenu.restaurant = S.restaurant;
          closeModal(); toast('Источник сохранён, меню перевыгружено'); render();
        } catch (err) { toast(err.message, true); if (btn) { btn.disabled = false; btn.textContent = 'Сохранить и выгрузить меню'; } }
      });
    });
  }

  // ── Админ: меню ────────────────────────────────────────────
  function menuTable() {
    const m = S.adminMenu;
    const q = S.menu.search.toLowerCase();
    const groups = [...new Set(m.products.map((p) => p.group).filter(Boolean))];
    const rows = m.products.filter((p) => (!q || p.name.toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q))
      && (!S.menu.group || p.group === S.menu.group) && (!S.menu.onlyStop || p.isInStopList || p.isHidden)
      && (!S.menu.src || (S.menu.src === 'bar' ? (p.source || 'main') !== 'main' : (p.source || 'main') === 'main')));
    const hasBar = m.products.some((p) => (p.source || 'main') !== 'main');
    const canStop = S.staff.role !== 'marketing';
    const sw = (on, attr, red = false) => `<button class="switch ${on ? 'is-on' : ''} ${red ? 'is-red' : ''}" ${attr}></button>`;
    return `<div class="card">
      <div class="toolbar">
        <div class="h2 grow" style="margin:0">Меню <span class="muted" style="font-weight:400;font-size:14px">источник: ${esc(m.source)} · обновлено ${dateTime(m.fetchedAt)}</span></div>
        ${S.staff.role === 'admin' ? '<button class="btn btn--sm" data-menu-refresh>Перевыгрузить из iiko</button>' : ''}
      </div>
      <div class="toolbar">
        <input class="inp grow" id="menu-search" placeholder="Поиск: название или артикул" value="${esc(S.menu.search)}">
        <select class="sel" id="menu-group"><option value="">Все категории</option>${groups.map((g) => `<option ${g === S.menu.group ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        ${hasBar ? `<div class="seg" role="group" aria-label="Кухня или бар">${[['', 'Все'], ['main', 'Кухня'], ['bar', 'Бар']].map(([v, l]) => `<button class="${S.menu.src === v ? 'is-on' : ''}" data-menu-src="${v}">${l}</button>`).join('')}</div>` : ''}
        <label style="display:flex;gap:8px;align-items:center">${sw(S.menu.onlyStop, 'data-only-stop')} Только стоп/скрытые</label>
      </div>
      <div class="tbl-wrap"><table class="tbl tbl--cards tbl--menu">
        <tr><th></th><th>Блюдо</th><th>Категория</th><th>Цена</th><th>Метка</th><th title="Больше — выше в разделе; 0 — как в iiko">Приоритет</th>${canStop ? '<th>Стоп-лист</th>' : ''}<th>Скрыть</th><th>Рекомендуем</th><th></th></tr>
        ${rows.map((p) => `<tr>
          <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb">🍽</div>'}</td>
          <td><b>${esc(p.name)}</b>${p.badge ? ` <span class="pill" data-tone="ok">${esc(badgeText(p.badge))}</span>` : ''}${p.video ? ' <span class="pill" data-tone="work">▶ видео</span>' : ''}<div class="muted" style="font-size:12px">${p.sku ? `арт. ${esc(p.sku)} · ` : ''}${esc(p.weight || '')}${p.energy ? ` · ${Math.round(p.energy)} ккал` : ''}${p.allergens?.length ? ` · аллергены: ${esc(p.allergens.join(', '))}` : ''}</div></td>
          <td class="muted" data-label="Категория">${esc(p.group)}</td><td data-label="Цена">${p.price ? rub(p.price) : ''}</td>
          <td data-label="Метка">${p.isHidden ? '' : badgeList(p.badge).length > 1 ? `<span class="muted" title="Несколько меток — меняются в «Меню сети»">${esc(badgeText(p.badge))}</span>` : `<select class="sel sel--sm sel--badge" data-badge-set="${esc(p.id)}" aria-label="Метка блюда"><option value="">—</option>${Object.entries(BADGES).map(([k, l]) => `<option value="${k}" ${p.badge === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`}</td>
          <td data-label="Приоритет">${p.isHidden ? '' : `<input class="inp inp--prio" type="number" inputmode="numeric" min="-999" max="999" step="1" value="${Number(p.priority) || 0}" data-prio="${esc(p.id)}" aria-label="Приоритет показа">`}</td>
          ${canStop ? `<td data-label="Стоп-лист">${sw(p.isInStopList, `data-ov="${esc(p.id)}" data-field="is_stopped" data-val="${!p.isInStopList}"`, true)}</td>` : ''}
          <td data-label="Скрыть">${sw(p.isHidden, `data-ov="${esc(p.id)}" data-field="is_hidden" data-val="${!p.isHidden}"`)}</td>
          <td data-label="Рекомендуем">${p.isHidden ? '' : sw(p.isRecommended, `data-ov="${esc(p.id)}" data-field="is_recommended" data-val="${!p.isRecommended}"`)}</td>
          <td class="td-actions">${p.isHidden ? '' : `<button class="btn btn--sm" data-edit-product="${esc(p.id)}">Карточка</button>`}</td>
        </tr>`).join('')}
      </table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">Стоп-лист: блюдо остаётся в меню, но заказать его нельзя. Скрыть: блюдо пропадает из QR-меню. Приоритет: чем больше число, тем выше блюдо в своём разделе (у гостя, официанта и в приложении); 0 — порядок как в iiko. Правки действуют поверх выгрузки iiko и не теряются при обновлении меню.</p>
    </div>`;
  }

  async function setOverride(productId, patch) {
    const p = S.adminMenu.products.find((x) => String(x.id) === String(productId));
    await api('POST', '/api/v1/admin/menu/override', { productId, product_name: p?.name, ...patch });
    S.adminMenu = null;
    await render();
  }

  function openProductEditor(id) {
    const p = S.adminMenu.products.find((x) => String(x.id) === String(id));
    const ownOverrides = (S.adminMenu.overrides || []).filter((o) => String(o.product_id) === String(id));
    const f = (key, label, value, type = 'text') => `<div class="field"><label>${label}</label><input class="inp" name="${key}" type="${type}" value="${esc(value ?? '')}" ${type === 'number' ? 'step="0.1"' : ''}></div>`;
    modal(`<div class="h2">${esc(p.name)}</div>
      <form id="prod-form">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">
          <img id="prod-img" src="${esc(p.image || '')}" alt="" style="width:96px;height:96px;border-radius:16px;object-fit:cover;background:#fff;${p.image ? '' : 'visibility:hidden'}">
          <label class="btn btn--sm" style="cursor:pointer">Загрузить фото<input type="file" id="prod-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
        </div>
        ${f('image_url', 'Фото (ссылка)', p.image)}
        <div style="display:flex;gap:14px;align-items:center;margin-top:12px">
          <video id="prod-video" ${p.video ? `src="${esc(p.video)}"` : ''} muted loop playsinline autoplay style="width:96px;height:96px;border-radius:16px;object-fit:cover;background:#fff;${p.video ? '' : 'display:none'}"></video>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label class="btn btn--sm" style="cursor:pointer">Загрузить видео<input type="file" id="prod-video-file" accept="video/mp4,video/webm,video/quicktime,image/gif,image/webp" hidden></label>
            ${p.video ? '<button class="btn btn--sm btn--danger" type="button" data-video-clear>Убрать видео</button>' : ''}
          </div>
        </div>
        <input type="hidden" name="video_url" value="${esc(p.video || '')}">
        <p class="muted" style="font-size:12px;margin:6px 4px 0">«Живое» меню: короткое видео без звука (3–6 с, до 25 МБ, лучше MP4 квадрат 720 px) играет вместо фото по кругу. Анимированный WebP/GIF — тоже можно. Фото остаётся обложкой, пока видео грузится.</p>
        ${badgeList(p.badge).length > 1 ? `<div class="field" style="margin-top:10px"><label>Метки в меню</label><div class="muted">${esc(badgeText(p.badge))} — несколько меток меняются в «Меню сети»</div></div>`
    : `<div class="field" style="margin-top:10px"><label>Метка в меню</label><select class="sel" name="badge"><option value="">Без метки</option>${Object.entries(BADGES).map(([k, l]) => `<option value="${k}" ${p.badge === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`}
        <div class="field" style="margin-top:10px"><label>Описание</label><textarea class="inp" name="description">${esc(p.description || '')}</textarea></div>
        <div class="form-grid" style="margin-top:10px">
          ${f('weight', 'Вес / объём', p.weight)}${f('energy', 'Ккал', p.energy, 'number')}${f('proteins', 'Белки', p.proteins, 'number')}
          ${f('fats', 'Жиры', p.fats, 'number')}${f('carbs', 'Углеводы', p.carbs, 'number')}
        </div>
        ${f('allergens', 'Аллергены (через запятую)', (p.allergens || []).join(', '))}
        <div class="field" style="margin-top:10px"><label>Где применить</label><select class="sel" name="scope"><option value="restaurant">Только в этом ресторане</option><option value="global">Во всех ресторанах</option></select></div>
        <p class="muted" style="font-size:12px;margin:12px 4px 0">Данные карточки приходят из iiko. Правки хранятся только в меню и накладываются по UUID блюда (${esc(p.id)}); в iiko ничего не меняется.</p>
        <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button>
          ${ownOverrides.length ? '<button class="btn btn--danger" type="button" data-reset-iiko>Вернуть как в iiko</button>' : ''}
          <button class="btn" type="button" data-modal-close>Отмена</button></div>
      </form>`, (root) => {
      root.querySelector('[data-reset-iiko]')?.addEventListener('click', async () => {
        try {
          for (const o of ownOverrides) await api('DELETE', `/api/v1/admin/menu/override/${o.id}`);
          S.adminMenu = null; closeModal(); toast('Карточка снова как в iiko'); render();
        } catch (err) { toast(err.message, true); }
      });
      root.querySelector('[data-video-clear]')?.addEventListener('click', (e) => {
        root.querySelector('[name=video_url]').value = '';
        const v = $('#prod-video', root); v.removeAttribute('src'); v.style.display = 'none'; e.target.remove();
        toast('Видео уберётся после «Сохранить»');
      });
      $('#prod-video-file', root).addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) { toast('Видео больше 25 МБ — сожмите или обрежьте до 3–6 секунд', true); return; }
        try {
          toast('Загружаем…');
          const res = await fetch('/api/v1/admin/upload', {
            method: 'POST', headers: { 'Content-Type': file.type || 'video/mp4', Authorization: `Bearer ${S.token}` }, body: file,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Не удалось загрузить');
          if (file.type.startsWith('image/')) {
            // Анимированная картинка — вместо фото
            root.querySelector('[name=image_url]').value = data.url;
            const img = $('#prod-img', root); img.src = data.url; img.style.visibility = 'visible';
          } else {
            root.querySelector('[name=video_url]').value = data.url;
            const v = $('#prod-video', root); v.src = data.url; v.style.display = 'block'; v.play().catch(() => {});
          }
          toast('Загружено — нажмите «Сохранить»');
        } catch (err) { toast(err.message, true); }
      });
      $('#prod-file', root).addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const res = await fetch('/api/v1/admin/upload', {
            method: 'POST', headers: { 'Content-Type': file.type, Authorization: `Bearer ${S.token}` }, body: file,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Не удалось загрузить');
          root.querySelector('[name=image_url]').value = data.url;
          const img = $('#prod-img', root); img.src = data.url; img.style.visibility = 'visible';
          toast('Фото загружено — нажмите «Сохранить»');
        } catch (err) { toast(err.message, true); }
      });
      $('#prod-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        if ((fd.badge ?? '') === (p.badge || '')) delete fd.badge; // метку не трогали — не перезаписываем
        fd.allergens = fd.allergens ? fd.allergens.split(',').map((a) => a.trim()).filter(Boolean) : [];
        try { await setOverride(p.id, fd); closeModal(); toast('Карточка сохранена'); } catch (err) { toast(err.message, true); }
      });
    });
  }

  // ── Баннер ─────────────────────────────────────────────────
  async function openBannerForm(b = {}) {
    const cat = await fetch(`/api/v1/restaurants/${encodeURIComponent(S.restaurant)}/catalog`).then((r) => r.json()).catch(() => ({ products: [], groups: [] }));
    const groups = (cat.groups || []).filter((g) => (cat.products || []).some((p) => p.parentGroup === g.id));
    const products = (cat.products || []).filter((p) => p.price > 0);
    const link = b.product_id ? 'product' : b.category_id ? 'category' : b.link_url ? 'url' : '';
    const dt = (v) => (v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    modal(`<div class="h2">${b.id ? 'Баннер' : 'Новый баннер'}</div><form id="banner-form">
      <div class="banner-preview" id="bn-preview">${b.image_url ? `<img src="${esc(b.image_url)}" alt="">` : '<span>Картинка 2:1</span>'}</div>
      <div style="display:flex;gap:8px;margin:8px 0 12px"><label class="btn btn--sm" style="cursor:pointer">Загрузить картинку<input type="file" id="bn-file" accept="image/jpeg,image/png,image/webp" hidden></label>
        <input class="inp grow" name="image_url" placeholder="или ссылка на картинку" value="${esc(b.image_url || '')}"></div>
      <div class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label>Заголовок</label><input class="inp" name="title" required maxlength="200" value="${esc(b.title || '')}"></div>
        <div class="field"><label>Текст (необязательно)</label><input class="inp" name="text" value="${esc(b.text || '')}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Где показывать</label><select class="sel" name="placement">${Object.entries(PLACEMENTS).map(([k, l]) => `<option value="${k}" ${(b.placement || 'menu') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Ресторан</label><select class="sel" name="restaurant_id"><option value="">Все рестораны</option>${S.restaurants.map((r) => `<option value="${r.id}" ${b.restaurant_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
        <div class="field"><label>По нажатию</label><select class="sel" id="bn-link"><option value="">Ничего</option><option value="product" ${link === 'product' ? 'selected' : ''}>Открыть блюдо</option><option value="category" ${link === 'category' ? 'selected' : ''}>Открыть раздел меню</option><option value="url" ${link === 'url' ? 'selected' : ''}>Ссылка</option></select></div>
        <div class="field" data-link="product" ${link === 'product' ? '' : 'hidden'}><label>Блюдо</label><select class="sel" name="product_id"><option value="">—</option>${products.map((p) => `<option value="${esc(p.id)}" ${String(b.product_id) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="field" data-link="category" ${link === 'category' ? '' : 'hidden'}><label>Раздел</label><select class="sel" name="category_id"><option value="">—</option>${groups.map((g) => `<option value="${esc(g.id)}" ${String(b.category_id) === String(g.id) ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
        <div class="field" data-link="url" ${link === 'url' ? '' : 'hidden'}><label>Ссылка</label><input class="inp" name="link_url" type="url" placeholder="https://" value="${esc(b.link_url || '')}"></div>
        <div class="field"><label>Показывать с</label><input class="inp" name="starts_at" type="datetime-local" value="${dt(b.starts_at)}"></div>
        <div class="field"><label>Показывать до</label><input class="inp" name="ends_at" type="datetime-local" value="${dt(b.ends_at)}"></div>
        <div class="field"><label>Порядок</label><input class="inp" name="sort_order" type="number" value="${esc(b.sort_order ?? 0)}"></div>
        <label style="display:flex;gap:10px;align-items:center;margin-top:20px"><input type="checkbox" name="is_active" ${b.is_active !== false ? 'checked' : ''}> Показывать</label>
      </div>
      <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Отмена</button></div></form>`, (root) => {
      const form = $('#banner-form', root);
      const preview = (url) => { $('#bn-preview', root).innerHTML = url ? `<img src="${esc(url)}" alt="">` : '<span>Картинка 2:1</span>'; };
      form.elements.image_url.addEventListener('change', (e) => preview(e.target.value));
      $('#bn-link', root).addEventListener('change', (e) => {
        root.querySelectorAll('[data-link]').forEach((el) => { el.hidden = el.dataset.link !== e.target.value; });
      });
      $('#bn-file', root).addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const res = await fetch('/api/v1/admin/upload', { method: 'POST', headers: { 'Content-Type': file.type, Authorization: `Bearer ${S.token}` }, body: file });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Не удалось загрузить');
          form.elements.image_url.value = data.url; preview(data.url); toast('Картинка загружена');
        } catch (err) { toast(err.message, true); }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const el = form.elements;
        const linkType = $('#bn-link', root).value;
        const iso = (v) => (v ? new Date(v).toISOString() : '');
        const data = {
          id: b.id, title: el.title.value.trim(), text: el.text.value.trim(), image_url: el.image_url.value.trim(),
          placement: el.placement.value, restaurant_id: el.restaurant_id.value,
          product_id: linkType === 'product' ? el.product_id.value : '', category_id: linkType === 'category' ? el.category_id.value : '',
          link_url: linkType === 'url' ? el.link_url.value.trim() : '',
          starts_at: iso(el.starts_at.value), ends_at: iso(el.ends_at.value), sort_order: el.sort_order.value, is_active: el.is_active.checked,
        };
        try { await api('POST', '/api/v1/admin/promos', data); closeModal(); toast('Баннер сохранён'); render(); } catch (err) { toast(err.message, true); }
      });
    });
  }

  // ── Универсальный CRUD ─────────────────────────────────────
  function crudView({ title, path, fields, hint }) {
    return {
      async render() {
        const rows = await api('GET', path);
        return `<div class="card"><div class="toolbar"><div class="h2 grow" style="margin:0">${title}</div><button class="btn btn--dark btn--sm" data-crud-new="${path}">Добавить</button></div>
          <p class="muted" style="margin-top:0">${hint}</p>
          <div class="tbl-wrap"><table class="tbl tbl--cards"><tr>${fields.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr>
          ${rows.map((r) => `<tr>${fields.map(([k, l, t]) => `<td data-label="${esc(l)}">${t === 'bool' ? (r[k] ? '✓' : '—') : esc(r[k] ?? '')}</td>`).join('')}
            <td class="td-actions" style="white-space:nowrap"><button class="btn btn--sm" data-crud-edit='${esc(JSON.stringify({ path, row: r }))}'>Изменить</button>
            <button class="btn btn--sm btn--danger" data-crud-del="${path}/${r.id}">Удалить</button></td></tr>`).join('')}
          </table></div></div>`;
      },
      fields,
      path,
    };
  }

  function openCrudForm(path, row = {}) {
    const view = Object.values(VIEWS).find((v) => v.path === path);
    modal(`<div class="h2">${row.id ? 'Изменить' : 'Добавить'}</div><form id="crud-form"><div class="form-grid" style="grid-template-columns:1fr">
      ${view.fields.map(([k, l, t]) => (t === 'bool'
    ? `<label style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="${k}" ${row[k] !== false ? 'checked' : ''}> ${l}</label>`
    : `<div class="field"><label>${l}</label><input class="inp" name="${k}" type="${t}" value="${esc(row[k] ?? '')}"></div>`)).join('')}
      </div><div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Отмена</button></div></form>`, (root) => {
      $('#crud-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { id: row.id };
        for (const [k, , t] of view.fields) data[k] = t === 'bool' ? e.target.elements[k].checked : e.target.elements[k].value;
        try { await api('POST', path, data); closeModal(); toast('Сохранено'); render(); } catch (err) { toast(err.message, true); }
      });
    });
  }

  /** Имя гостя, которого добавил официант: «Мария» вместо «Гость 3». */
  function openSeatNameForm(seat) {
    const current = S.edit?.seatNames?.[seat] || '';
    modal(`<div class="h2">Гость ${seat}</div><form id="seat-name-form">
      <div class="field"><label>Имя гостя</label><input class="inp" name="name" maxlength="40" autocomplete="off" placeholder="Например, Мария" value="${esc(current)}"></div>
      <p class="muted" style="font-size:12px;margin:8px 4px 0">Имя увидят кухня (в комментарии к блюду) и гости за столом. Можно оставить пустым.</p>
      <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Пропустить</button></div></form>`, (root) => {
      const input = root.querySelector('[name=name]');
      setTimeout(() => input.focus(), 50);
      $('#seat-name-form', root).addEventListener('submit', (e) => {
        e.preventDefault();
        if (!S.edit) return closeModal();
        S.edit.seatNames = { ...(S.edit.seatNames || {}), [seat]: input.value.trim() };
        closeModal();
        changed();
      });
    });
  }

  function openStaffForm(u = {}) {
    modal(`<div class="h2">${u.id ? 'Сотрудник' : 'Новый сотрудник'}</div><form id="staff-form"><div class="form-grid">
      <div class="field"><label>Имя</label><input class="inp" name="name" value="${esc(u.name || '')}" required></div>
      <div class="field"><label>Логин</label><input class="inp" name="login" value="${esc(u.login || '')}" required></div>
      <div class="field"><label>Роль</label><select class="sel" name="role" id="staff-role">${['waiter', 'manager', 'marketing', 'admin'].map((v) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${ROLE_INFO[v][0]}</option>`).join('')}</select>
        <small class="muted" id="role-info" style="display:block;margin-top:6px">${esc(ROLE_INFO[u.role || 'waiter'][1])}</small></div>
      <div class="field"><label>Ресторан</label><select class="sel" name="restaurantId"><option value="">Все</option>${(S.staffRests || []).map((r) => `<option value="${r.id}" ${u.restaurantId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>${u.id ? 'Новый пароль (пусто — не менять)' : 'Пароль'}</label><input class="inp" name="password" type="password" ${u.id ? '' : 'required'}></div>
      <div class="field"><label>PIN для входа официанта (4–6 цифр${u.hasPin ? ', пусто — не менять' : ''})</label><input class="inp" name="pin" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" autocomplete="off" placeholder="${u.hasPin ? 'PIN задан' : 'например, 482915'}"></div>
      ${u.hasPin ? '<label style="display:flex;gap:10px;align-items:center;margin-top:20px"><input type="checkbox" name="clearPin"> Сбросить PIN</label>' : ''}
      <label style="display:flex;gap:10px;align-items:center;margin-top:20px"><input type="checkbox" name="isActive" ${u.isActive !== false ? 'checked' : ''}> Активен</label>
      </div><div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Отмена</button></div></form>`, (root) => {
      $('#staff-role', root).addEventListener('change', (e) => { $('#role-info', root).textContent = ROLE_INFO[e.target.value][1]; });
      $('#staff-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        fd.isActive = e.target.elements.isActive.checked; fd.id = u.id;
        fd.clearPin = Boolean(e.target.elements.clearPin?.checked); if (!fd.pin) delete fd.pin;
        try { await api('POST', '/api/v1/admin/staff', fd); closeModal(); toast('Сохранено'); render(); } catch (err) { toast(err.message, true); }
      });
    });
  }

  function modal(html, onMount) {
    $('#modal-root').innerHTML = `<div class="backdrop"><div class="modal">${html}</div></div>`;
    const root = $('#modal-root');
    root.firstElementChild.addEventListener('click', (e) => { if (e.target === root.firstElementChild || e.target.closest('[data-modal-close]')) closeModal(); });
    onMount?.(root);
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  // ── Официант: действия ─────────────────────────────────────
  async function openTable(sessionId) {
    S.openId = sessionId; S.productSearch = '';
    try {
      const s = await api('POST', `/api/v1/waiter/session/${sessionId}/take`);
      const idx = S.sessions.findIndex((x) => x.sessionId === sessionId);
      if (idx >= 0) S.sessions[idx] = s; else S.sessions.unshift(s);
      S.edit = editFrom(s);
    } catch (e) {
      toast(e.message, true);
      const s = await api('GET', `/api/v1/waiter/session/${sessionId}`);
      S.edit = editFrom(s);
    }
    // Меню ресторана — свежее при каждом открытии стола (стоп-лист мог измениться)
    const slug = S.restaurant || S.restaurants[0]?.slug;
    S.catalog = await fetch(`/api/v1/restaurants/${slug}/catalog`).then((r) => r.json()).catch(() => S.catalog);
    S.picker = false; S.pickSeat = null;
    await render();
    if (matchMedia('(max-width: 900px)').matches) scrollTo({ top: 0 });
  }

  /**
   * Правки стола: knownIds — неотправленные строки, которые официант видел. Сервер заменяет только их, а блюда,
   * которые гость добавил за это время, оставляет (раньше сохранение официанта их стирало).
   */
  function editFrom(s) {
    return {
      items: s.items.map((i) => ({ ...i })), guestCount: s.guestCount, seatNames: { ...(s.seatNames || {}) }, dirty: false,
      knownIds: s.items.filter((i) => !i.isLocked && i.id).map((i) => String(i.id)),
    };
  }
  // ID новой строки создаёт терминал: повторное сохранение заменяет ту же строку, а не добавляет вторую
  const newRowId = () => (crypto.randomUUID ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

  const hasVariants = (p) => (p.sizes || []).length > 1 || (p.modifierGroups || []).length > 0;
  // Выбор строки: «+» прибавляет только к строке с тем же выбором (вок без выбора не сливается с воком гостя «с говядиной»)
  const variantOf = (i) => `${i.sizeId || ''}|${(i.modifiers || []).map((m) => `${m.id}:${m.amount || 1}`).sort().join(',')}`;
  function addLine(p, seat, v) {
    const key = v ? variantOf(v) : '|';
    const existing = S.edit.items.find((i) => !i.isLocked && String(i.productId) === String(p.id)
      && (Number(i.seatNumber) || null) === seat && variantOf(i) === key);
    if (existing) existing.quantity += 1;
    else {
      S.edit.items.push({
        id: newRowId(), local: true, productId: p.id, iikoProductId: p.iikoId || p.id,
        name: v?.text ? `${p.name} (${v.text})` : p.name, price: v ? v.price : p.price, quantity: 1, isLocked: false, ...(v?.text ? { options: v.text } : {}),
        seatNumber: seat, source: p.source, ...(v?.sizeId ? { sizeId: v.sizeId } : {}), ...(v?.modifiers?.length ? { modifiers: v.modifiers } : {}),
      });
    }
    if (navigator.vibrate) try { navigator.vibrate(10); } catch { /* нет вибро */ }
    changed();
  }

  /** Выбор официанта: размер и модификаторы по правилам iiko (минимум, максимум, бесплатные). Цену проверит сервер. */
  function openVariantForm(p, seat) {
    const sizes = (p.sizes || []).length > 1 ? p.sizes : [];
    const st = { size: sizes.find((z) => z.isDefault) || sizes[0] || null, mods: new Map() };
    const groupsOf = () => (st.size ? st.size.groups || [] : p.modifierGroups || []);
    const total = (g) => g.items.reduce((n, m) => n + (st.mods.get(String(m.id)) || 0), 0);
    const fill = () => {
      st.mods = new Map();
      for (const g of groupsOf()) {
        let n = 0;
        for (const m of g.items.filter((x) => x.def > 0)) { if (g.max > 0 && n + m.def > g.max) break; st.mods.set(String(m.id), m.def); n += m.def; }
        for (const m of [...g.items].sort((a, b) => (a.price || 0) - (b.price || 0))) {
          if (n >= g.min) break;
          if (!st.mods.has(String(m.id))) { st.mods.set(String(m.id), 1); n += 1; }
        }
      }
    };
    const price = () => {
      let sum = st.size ? Number(st.size.price) : Number(p.basePrice ?? p.price);
      for (const g of groupsOf()) {
        const units = g.items.flatMap((m) => Array(st.mods.get(String(m.id)) || 0).fill(Number(m.price) || 0)).sort((a, b) => a - b);
        sum += units.slice(Math.min(g.free || 0, units.length)).reduce((a, b) => a + b, 0);
      }
      return Math.round(sum * 100) / 100;
    };
    const rule = (g) => [g.min > 0 && g.max === 1 ? 'выберите 1' : g.min > 0 ? `минимум ${g.min}` : 'по желанию', g.max > 1 ? `до ${g.max}` : ''].filter(Boolean).join(' · ');
    fill();
    const draw = (root) => {
      const missing = groupsOf().filter((g) => total(g) < g.min).map((g) => g.name);
      root.querySelector('.modal').innerHTML = `<div class="h3" style="margin:0 0 12px">${esc(p.name)}</div>
        ${sizes.length ? `<div class="muted" style="margin:8px 0 6px"><b>Размер</b></div><div class="vchips">${sizes.map((z, i) => `<button class="vchip ${z === st.size ? 'is-on' : ''}" data-vsize="${i}">${esc(z.name)} · ${rub(z.price)}</button>`).join('')}</div>` : ''}
        ${groupsOf().map((g, gi) => `<div class="muted" style="margin:12px 0 6px;display:flex;justify-content:space-between;gap:8px"><b>${esc(g.name)}</b><span style="${total(g) < g.min ? 'color:var(--danger)' : ''}">${rule(g)}</span></div>
          <div class="vchips">${g.items.map((m) => `<button class="vchip ${st.mods.get(String(m.id)) ? 'is-on' : ''}" data-vmod="${gi}:${esc(m.id)}">${esc(m.name)}${m.price > 0 ? ` +${rub(m.price)}` : ''}</button>`).join('')}</div>`).join('')}
        <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" data-modal-close>Отмена</button>
          <button class="btn btn--dark grow" data-vok ${missing.length ? 'disabled' : ''}>${missing.length ? `Выберите: ${esc(missing.join(', '))}` : `Добавить · ${rub(price())}`}</button></div>`;
    };
    modal('', (root) => {
      draw(root);
      // Слушаем само окно (оно создаётся заново), а не #modal-root — иначе обработчики копятся и блюдо добавляется дважды
      root.firstElementChild.addEventListener('click', (e) => {
        const b = e.target.closest('[data-vsize],[data-vmod],[data-vok]');
        if (!b) return;
        if (b.dataset.vsize != null) { st.size = sizes[Number(b.dataset.vsize)]; fill(); }
        else if (b.dataset.vmod) {
          const [gi, id] = b.dataset.vmod.split(':');
          const g = groupsOf()[Number(gi)];
          const on = Boolean(st.mods.get(id));
          if (g.max === 1) { for (const m of g.items) st.mods.delete(String(m.id)); if (!on || g.min > 0) st.mods.set(id, 1); }
          else if (on) st.mods.delete(id);
          else if (!g.max || total(g) < g.max) st.mods.set(id, 1);
          else toast(`В «${g.name}» можно выбрать не больше ${g.max}`, true);
        } else if (b.dataset.vok != null) {
          const modifiers = []; const names = [];
          for (const g of groupsOf()) for (const m of g.items) {
            const n = st.mods.get(String(m.id)) || 0;
            if (!n) continue;
            modifiers.push({ id: String(m.id), groupId: g.id ?? null, amount: n, name: m.name });
            names.push(n > 1 ? `${m.name} ×${n}` : m.name);
          }
          closeModal();
          addLine(p, seat, { sizeId: st.size?.id ? String(st.size.id) : null, modifiers, price: price(), text: [st.size?.name, ...names].filter(Boolean).join(', ') });
          return;
        }
        draw(root);
      });
    });
  }


  /**
   * Конструктор бизнес-ланча (упрощённо): набор → шаги чипами → напиток → «Добавить».
   * Набор — обычная строка заказа с модификаторами, напиток — отдельная. Вне времени действия — только просмотр, сервер тоже откажет.
   */
  function openLunchForm(seat) {
    const b = S.catalog?.businessLunch;
    if (!b?.combos?.length) return;
    const st = { combo: b.combos.length === 1 ? b.combos[0] : null, mods: new Map(), drink: null };
    const price = () => {
      if (!st.combo) return 0;
      let sum = Number(st.combo.base) || 0;
      for (const g of st.combo.steps) {
        const units = g.items.flatMap((m) => Array(st.mods.get(String(m.id)) || 0).fill(Number(m.price) || 0)).sort((a, c) => a - c);
        sum += units.slice(Math.min(g.free || 0, units.length)).reduce((x, y) => x + y, 0);
      }
      return Math.round(sum * 100) / 100;
    };
    const total = (g) => g.items.reduce((n, m) => n + (st.mods.get(String(m.id)) || 0), 0);
    const draw = (root) => {
      const missing = st.combo ? st.combo.steps.filter((g) => total(g) < g.min).map((g) => g.title) : [];
      const drink = st.drink ? b.drinks.find((d) => d.id === st.drink) : null;
      const can = b.active && st.combo && !missing.length && price() > 0;
      root.querySelector('.modal').innerHTML = `<div class="h3" style="margin:0 0 4px">Собери свой ланч</div>
        <div class="muted" style="margin-bottom:12px;font-size:12px;${b.active ? '' : 'color:var(--danger)'}">${b.active ? `Сейчас действует · ${esc(b.text)}` : `Сейчас недоступен — доступен ${esc(b.text)}`}</div>
        <div class="muted" style="margin:8px 0 6px"><b>Набор</b></div>
        <div class="vchips">${b.combos.map((c, i) => `<button class="vchip ${st.combo === c ? 'is-on' : ''}" data-lc="${i}" ${c.stopped ? 'disabled' : ''}>${esc(c.title)} · ${c.fixed ? '' : 'от '}${rub(c.price)}</button>`).join('')}</div>
        ${st.combo ? st.combo.steps.map((g, gi) => `<div class="muted" style="margin:12px 0 6px;display:flex;justify-content:space-between;gap:8px"><b>${esc(g.title)}</b><span style="${total(g) < g.min ? 'color:var(--danger)' : ''}">${g.min > 0 && g.max === 1 ? 'выберите 1' : g.min > 0 ? `минимум ${g.min}` : 'по желанию'}</span></div>
          <div class="vchips">${g.items.map((m) => `<button class="vchip ${st.mods.get(String(m.id)) ? 'is-on' : ''}" data-lm="${gi}:${esc(m.id)}">${esc(m.name)}${!st.combo.fixed && m.price > 0 ? ` +${rub(m.price)}` : ''}</button>`).join('')}</div>`).join('') : ''}
        ${b.drinks?.length ? `<div class="muted" style="margin:12px 0 6px"><b>Напиток к ланчу</b> (по желанию)</div>
          <div class="vchips">${b.drinks.map((d) => `<button class="vchip ${st.drink === d.id ? 'is-on' : ''}" data-ld="${esc(d.id)}" ${d.stopped ? 'disabled' : ''}>${esc(d.name)} · ${rub(d.price)}</button>`).join('')}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" data-modal-close>Отмена</button>
          <button class="btn btn--dark grow" data-lok ${can ? '' : 'disabled'}>${!b.active ? 'Вне времени ланча' : !st.combo ? 'Выберите набор' : missing.length ? `Выберите: ${esc(missing.join(', '))}` : `Добавить · ${rub(price() + (drink?.price || 0))}`}</button></div>`;
    };
    modal('', (root) => {
      draw(root);
      root.firstElementChild.addEventListener('click', (e) => {
        const x = e.target.closest('[data-lc],[data-lm],[data-ld],[data-lok]');
        if (!x) return;
        if (x.dataset.lc != null) { st.combo = b.combos[Number(x.dataset.lc)]; st.mods = new Map(); }
        else if (x.dataset.lm) {
          const [gi, id] = x.dataset.lm.split(':');
          const g = st.combo.steps[Number(gi)];
          const on = Boolean(st.mods.get(id));
          if (g.max === 1) { for (const m of g.items) st.mods.delete(String(m.id)); if (!on || g.min > 0) st.mods.set(id, 1); }
          else if (on) st.mods.delete(id);
          else if (!g.max || total(g) < g.max) st.mods.set(id, 1);
          else toast(`В «${g.title}» можно выбрать не больше ${g.max}`, true);
        } else if (x.dataset.ld) st.drink = st.drink === x.dataset.ld ? null : x.dataset.ld;
        else if (x.dataset.lok != null) {
          const product = S.catalog.products.find((p) => String(p.id) === String(st.combo.productId));
          if (!product) { toast('Набор сейчас недоступен', true); return; }
          const modifiers = []; const names = [];
          for (const g of st.combo.steps) for (const m of g.items) {
            const n = st.mods.get(String(m.id)) || 0;
            if (!n) continue;
            modifiers.push({ id: String(m.id), groupId: g.groupId ?? null, amount: n, name: m.name });
            names.push(n > 1 ? `${m.name} ×${n}` : m.name);
          }
          const dp = st.drink ? S.catalog.products.find((p) => String(p.id) === String(b.drinks.find((d) => d.id === st.drink)?.productId)) : null;
          closeModal();
          addLine(product, seat, { sizeId: st.combo.sizeId || null, modifiers, price: price(), text: names.join(', ') });
          if (dp) addLine(dp, seat, null);
          return;
        }
        draw(root);
      });
    });
  }

  async function saveEdit() {
    const version = S.editVersion || 0;
    const known = [...new Set([...(S.edit.knownIds || []), ...S.edit.items.filter((i) => i.local).map((i) => String(i.id))])];
    const s = await api('POST', `/api/v1/waiter/session/${S.openId}/cart`, {
      items: S.edit.items, guestCount: S.edit.guestCount, seatNames: S.edit.seatNames || {}, knownIds: known,
    });
    const i = S.sessions.findIndex((x) => x.sessionId === S.openId);
    if (i >= 0) S.sessions[i] = s;
    // Пока сохраняли, официант мог ещё что-то поменять — тогда локальные правки не затираем
    if ((S.editVersion || 0) === version) S.edit = editFrom(s);
    return s;
  }

  /** Автосохранение правок официанта: без отдельной кнопки «Сохранить». */
  let saveT;
  function changed() {
    S.edit.dirty = true;
    S.editVersion = (S.editVersion || 0) + 1;
    clearTimeout(saveT);
    saveT = setTimeout(saveNow, 700);
    rerender();
  }
  async function saveNow() {
    if (!S.edit?.dirty) return;
    S.saving = true;
    try {
      await saveEdit();
      S.saveFailed = false; S.retry = 0;
    } catch (err) {
      if (err.code === 'EDIT_LOCKED') {
        // Стол взял другой официант — показываем его версию, править нельзя
        toast(err.message, true);
        const s = await api('GET', `/api/v1/waiter/session/${S.openId}`).catch(() => null);
        if (s) S.edit = editFrom(s);
      } else if (!err.status || err.status >= 500) {
        // Нет связи — правки остаются на экране и уходят, как только сервер ответит
        S.saveFailed = true; S.retry = Math.min((S.retry || 0) + 1, 5);
        S.saving = false;
        clearTimeout(saveT); saveT = setTimeout(saveNow, 1000 * 2 ** S.retry);
        rerender(); return;
      } else {
        // Сервер не принял правку (блюдо закончилось и т. п.) — возвращаем то, что сохранено
        toast(err.message, true);
        const s = await api('GET', `/api/v1/waiter/session/${S.openId}`).catch(() => null);
        if (s) S.edit = editFrom(s);
      }
    }
    S.saving = false;
    if (S.edit?.dirty && !S.saveFailed) changed(); else rerender();
  }
  /** Перерисовка с сохранением прокрутки списка блюд в шторке. */
  function rerender() {
    S.pickScroll = $('.pick-list')?.scrollTop || 0;
    return render();
  }

  // ── События ────────────────────────────────────────────────
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const q = (sel) => t.closest(sel);
    try {
      if (q('[data-logout]')) { logout(); return; }
      if (q('[data-tab]')) { S.tab = q('[data-tab]').dataset.tab; ls.set('tab', S.tab); render(); return; }
      if (q('[data-read-all]')) { await api('POST', '/api/v1/waiter/notifications/read-all'); render(); return; }
      if (q('[data-note]')) {
        const n = q('[data-note]');
        api('POST', `/api/v1/waiter/notifications/${n.dataset.note}/read`).catch(() => {});
        if (n.dataset.session) await openTable(n.dataset.session); else render();
        return;
      }
      if (q('[data-open]')) { await openTable(q('[data-open]').dataset.open); return; }
      if (q('[data-wview]')) { S.wview = q('[data-wview]').dataset.wview; render(); return; }
      if (q('[data-my-table]') && S.myTables) {
        const n = q('[data-my-table]').dataset.myTable;
        const d = new Set(S.myTables.draft);
        if (d.has(n)) d.delete(n); else d.add(n);
        S.myTables = { ...S.myTables, draft: d, dirty: true }; render(); return;
      }
      if (q('[data-my-clear]') && S.myTables) { S.myTables = { ...S.myTables, draft: new Set(), dirty: true }; render(); return; }
      if (q('[data-my-save]') && S.myTables) {
        const btn = q('[data-my-save]'); if (btn.disabled) return; btn.disabled = true;
        try {
          const res = await api('PUT', '/api/v1/waiter/my-tables', { tables: [...S.myTables.draft] });
          S.myTables = { ...res, draft: new Set(res.tables), dirty: false };
          toast(res.tables.length ? `Ваши столы: ${res.tables.join(', ')}` : 'Уведомления по всем столам');
        } catch (err) { toast(err.message, true); btn.disabled = false; }
        render(); return;
      }
      if (q('[data-hide-editor]')) {
        if (S.edit?.dirty) { clearTimeout(saveT); await saveEdit().catch(() => {}); }
        api('POST', `/api/v1/waiter/session/${S.openId}/release`).catch(() => {});
        S.openId = null; S.edit = null; S.picker = false; render(); return;
      }
      if (q('[data-open-picker]')) { S.picker = true; S.productSearch = ''; S.pickScroll = 0; render(); return; }
      if (q('[data-close-picker-btn]') || (t.matches?.('[data-close-picker]'))) { S.picker = false; render(); return; }
      if (q('[data-pick-seat]')) { S.pickSeat = Number(q('[data-pick-seat]').dataset.pickSeat) || null; rerender(); return; }
      if (q('[data-course-set]')) {
        const b = q('[data-course-set]');
        S.edit.items[Number(b.dataset.courseSet)].course = b.dataset.c ? Number(b.dataset.c) : null;
        changed(); return;
      }
      if (q('[data-served]') || q('[data-served-item]')) {
        const one = q('[data-served-item]')?.dataset.servedItem;
        const s = await api('POST', `/api/v1/waiter/session/${S.openId}/served`, one ? { itemIds: [one] } : undefined);
        const i = S.sessions.findIndex((x) => x.sessionId === S.openId);
        if (i >= 0) S.sessions[i] = s;
        if (!S.edit.dirty) S.edit = editFrom(s);
        toast('Отмечено: вынесено'); render(); return;
      }
      if (q('[data-guests]')) {
        const d = Number(q('[data-guests]').dataset.guests);
        S.edit.guestCount = Math.max(1, S.edit.guestCount + d);
        changed();
        // Новый гость — сразу предлагаем назвать (можно пропустить)
        if (d > 0) openSeatNameForm(Math.max(S.edit.guestCount, (S.sessions.find((x) => x.sessionId === S.openId)?.guests || []).length));
        return;
      }
      if (q('[data-seat-name]')) { openSeatNameForm(Number(q('[data-seat-name]').dataset.seatName)); return; }
      if (q('[data-qty]')) {
        const b = q('[data-qty]'); const it = S.edit.items[Number(b.dataset.qty)];
        it.quantity += Number(b.dataset.d);
        if (it.quantity <= 0) S.edit.items.splice(Number(b.dataset.qty), 1);
        changed(); return;
      }
      if (q('[data-pick-cat]')) { S.pickCat = q('[data-pick-cat]').dataset.pickCat; S.pickScroll = 0; render(); return; }
      if (q('[data-open-lunch]')) { openLunchForm(S.pickSeat || null); return; }
      if (q('[data-add]')) {
        const p = S.catalog.products.find((x) => String(x.id) === q('[data-add]').dataset.add);
        const seat = S.pickSeat || null;
        // Вок, пицца, сет — сначала выбор (основа, соус, размер), как у гостя в QR-меню
        if (hasVariants(p)) { openVariantForm(p, seat); return; }
        addLine(p, seat, null);
        if (navigator.vibrate) try { navigator.vibrate(10); } catch { /* нет вибро */ }
        changed(); return;
      }
      if (q('[data-save]')) { await saveEdit(); toast('Правки сохранены — гость видит актуальный заказ'); render(); return; }
      if (q('[data-send]')) {
        const btn = q('[data-send]'); btn.disabled = true; btn.textContent = 'Отправляем в iiko…';
        if (S.edit.dirty) await saveEdit();
        try {
          const s = await api('POST', `/api/v1/waiter/session/${S.openId}/send-to-production`);
          S.edit = editFrom(s);
          toast('Заказ отправлен на кухню');
        } catch (err) { toast(err.message, true); }
        render(); return;
      }
      if (q('[data-accept-pay]')) {
        const method = q('[data-accept-pay]').dataset.acceptPay;
        if (!confirm(`Принять оплату ${method === 'cash' ? 'наличными' : 'картой'} и закрыть счёт в iiko?`)) return;
        const btn = q('[data-accept-pay]'); btn.disabled = true; btn.textContent = 'Закрываем в iiko…';
        try {
          await api('POST', `/api/v1/waiter/session/${S.openId}/pay`, { method });
          S.openId = null; S.edit = null; toast('Оплачено, счёт закрыт в iiko');
        } catch (err) { toast(err.message, true); }
        render(); return;
      }
      if (q('[data-close-table]')) {
        if (!confirm('Закрыть стол? Гость при следующем скане начнёт новый визит.')) return;
        try {
          await api('POST', `/api/v1/waiter/session/${S.openId}/close`);
        } catch (err) {
          // Не оплачено или не отправлено — сервер называет сумму; закрыть можно только осознанно
          if (err.code !== 'UNPAID' || !confirm(err.message)) { if (err.code !== 'UNPAID') toast(err.message, true); return; }
          await api('POST', `/api/v1/waiter/session/${S.openId}/close`, { force: true });
        }
        S.openId = null; S.edit = null; toast('Стол закрыт'); render(); return;
      }
      // админ
      if (q('[data-src-add]')) { openSourceForm(); return; }
      if (q('[data-src-edit]')) { openSourceForm(JSON.parse(q('[data-src-edit]').dataset.srcEdit)); return; }
      if (q('[data-src-del]')) {
        const code = q('[data-src-del]').dataset.srcDel;
        if (!confirm(`Удалить источник «${code}»? Его блюда пропадут из меню.`)) return;
        await api('DELETE', `/api/v1/admin/sources/${encodeURIComponent(code)}`);
        S.adminMenu = null; toast('Источник удалён'); render(); return;
      }
      if (q('[data-menu-refresh]')) {
        const b = q('[data-menu-refresh]'); b.disabled = true; b.textContent = 'Выгружаем из iiko…';
        S.adminMenu = { restaurant: S.restaurant, ...(await api('POST', '/api/v1/admin/menu/sync')) };
        toast(`Меню выгружено из iiko: ${S.adminMenu.products.filter((p) => !p.isHidden).length} блюд`); render(); return;
      }
      if (q('[data-only-stop]')) { S.menu.onlyStop = !S.menu.onlyStop; render(); return; }
      if (q('[data-menu-src]')) { S.menu.src = q('[data-menu-src]').dataset.menuSrc; render(); return; }
      if (q('[data-ov]')) { const b = q('[data-ov]'); await setOverride(b.dataset.ov, { [b.dataset.field]: b.dataset.val === 'true' }); toast('Сохранено'); return; }
      if (q('[data-edit-product]')) { openProductEditor(q('[data-edit-product]').dataset.editProduct); return; }
      if (q('[data-banner-new]')) { openBannerForm(); return; }
      if (q('[data-banner-edit]')) { openBannerForm(JSON.parse(q('[data-banner-edit]').dataset.bannerEdit)); return; }
      if (q('[data-crud-new]')) { openCrudForm(q('[data-crud-new]').dataset.crudNew); return; }
      if (q('[data-crud-edit]')) { const { path, row } = JSON.parse(q('[data-crud-edit]').dataset.crudEdit); openCrudForm(path, row); return; }
      if (q('[data-crud-del]')) { if (!confirm('Удалить?')) return; await api('DELETE', q('[data-crud-del]').dataset.crudDel); render(); return; }
      if (q('[data-staff-new]')) { openStaffForm(); return; }
      if (q('[data-staff-edit]')) { openStaffForm(JSON.parse(q('[data-staff-edit]').dataset.staffEdit)); return; }
      if (q('[data-save-tables]')) { await api('PATCH', `/api/v1/admin/restaurants/${q('[data-save-tables]').dataset.saveTables}`, { tablesCount: $('#tables-count').value }); toast('Сохранено'); render(); }
    } catch (err) { toast(err.message, true); }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'rest-select') {
      S.restaurant = e.target.value; ls.set('restaurant', S.restaurant);
      S.openId = null; S.edit = null; S.catalog = null; S.adminMenu = null; S.lastUnreadIds = new Set();
      render();
    } else if (e.target.dataset.seat != null) { S.edit.items[Number(e.target.dataset.seat)].seatNumber = Number(e.target.value) || null; changed(); }
    else if (e.target.id === 'menu-group') { S.menu.group = e.target.value; render(); }
    else if (e.target.dataset.badgeSet) {
      setOverride(e.target.dataset.badgeSet, { badge: e.target.value })
        .then(() => toast(e.target.value ? 'Метка сохранена' : 'Метка снята')).catch((err) => toast(err.message, true));
    }
    else if (e.target.dataset.prio) {
      setOverride(e.target.dataset.prio, { priority: Number(e.target.value) || 0 })
        .then(() => toast('Приоритет сохранён')).catch((err) => toast(err.message, true));
    }
  });
  let inputT;
  document.addEventListener('input', (e) => {
    if (e.target.id === 'prod-search') { S.productSearch = e.target.value; clearTimeout(inputT); inputT = setTimeout(render, 200); }
    if (e.target.id === 'menu-search') {
      S.menu.search = e.target.value; clearTimeout(inputT);
      inputT = setTimeout(async () => { await render(); const i = $('#menu-search'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250);
    }
  });

  // ── Старт ──────────────────────────────────────────────────
  let poll;
  async function start() {
    try {
      S.staff = await api('GET', '/api/v1/staff/me').then((me) => ({ ...S.staff, ...me }));
      S.restaurants = await api('GET', '/api/v1/staff/restaurants');
      if (!S.restaurant || !S.restaurants.some((r) => r.slug === S.restaurant)) {
        const own = S.restaurants.find((r) => r.id === S.staff.restaurantId);
        S.restaurant = (own || S.restaurants.find((r) => r.slug === 'novo-sadovaya') || S.restaurants[0])?.slug;
      }
    } catch (e) { if (!S.token) return; toast(e.message, true); }
    await render();
    clearInterval(poll);
    poll = setInterval(() => {
      const busy = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (document.hidden || busy || $('#modal-root').innerHTML) return;
      // Стол открыт — продлеваем свою блокировку (иначе через 2 минуты просмотра стол «уходит» другому)
      if (S.openId && S.edit) api('GET', `/api/v1/waiter/session/${S.openId}`).catch(() => {});
      if (S.tab === 'tables' && !S.edit?.dirty && !S.saving && !S.picker) render();
      else if (S.tab === 'hall') render();
    }, 5000);
  }

  if (S.token) start(); else renderLogin();
})();
