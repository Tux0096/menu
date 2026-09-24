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
    menu: { search: '', group: '', onlyStop: false },
  };

  const ROLE_TABS = {
    waiter: [['tables', 'Столы']],
    manager: [['tables', 'Столы'], ['hall', 'Контроль зала'], ['feedback', 'Отзывы']],
    admin: [['tables', 'Столы'], ['hall', 'Контроль зала'], ['menu', 'Меню и стоп-лист'], ['chips', 'AI-подсказки'],
      ['promos', 'Акции'], ['qr', 'QR-коды'], ['feedback', 'Отзывы'], ['staff', 'Сотрудники'], ['audit', 'Журнал']],
  };
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
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && S.token) { logout(); throw new Error('Сессия истекла — войдите снова'); }
    if (!res.ok) { const e = new Error(data.error || `Ошибка ${res.status}`); e.status = res.status; throw e; }
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
  function renderLogin(err = '') {
    $('#app').innerHTML = `<div class="login"><form id="login">
      <div class="brand">ФУДЖИ<small>персонал</small></div>
      <input class="inp" name="login" placeholder="Логин" autocomplete="username" required>
      <input class="inp" name="password" type="password" placeholder="Пароль" autocomplete="current-password" required>
      <button class="btn btn--dark" type="submit">Войти</button>
      <div class="hint" style="color:var(--danger)">${esc(err)}</div>
      <div class="hint">Роли: официант — столы и заказы; управляющий — контроль зала; администратор — меню, AI, QR, сотрудники.</div>
    </form></div>`;
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const res = await api('POST', '/api/v1/staff/login', { login: f.get('login'), password: f.get('password') });
        S.token = res.token; S.staff = res.staff;
        ls.set('token', res.token); ls.set('staff', res.staff);
        start();
      } catch (e2) { renderLogin(e2.message); }
    });
  }
  function logout() { S.token = null; S.staff = null; ls.del('token'); ls.del('staff'); renderLogin(); }

  // ── Каркас ─────────────────────────────────────────────────
  function shell(content) {
    const tabs = ROLE_TABS[S.staff.role] || ROLE_TABS.waiter;
    const unread = S.notes.filter((n) => !n.is_read).length;
    return `<div class="shell">
      <header class="top">
        <div class="brand">ФУДЖИ<small>${esc({ waiter: 'официант', manager: 'управляющий', admin: 'администратор' }[S.staff.role])}</small></div>
        <nav class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'is-active' : ''}">${l}${k === 'tables' && unread ? `<span class="dot">${unread}</span>` : ''}</button>`).join('')}</nav>
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
    const tabs = (ROLE_TABS[S.staff.role] || ROLE_TABS.waiter).map(([k]) => k);
    if (!tabs.includes(S.tab)) S.tab = 'tables';
    const view = VIEWS[S.tab];
    try {
      $('#app').innerHTML = shell(await view.render());
      view.mounted?.();
    } catch (e) {
      $('#app').innerHTML = shell(`<div class="card error-box">${esc(e.message)}</div>`);
    }
  }

  // ── Официант ───────────────────────────────────────────────
  async function loadWaiter() {
    const [notes, sessions] = await Promise.all([
      api('GET', '/api/v1/waiter/notifications'),
      api('GET', '/api/v1/waiter/sessions'),
    ]);
    const fresh = notes.filter((n) => !n.is_read && !S.lastUnreadIds.has(n.id));
    if (S.lastUnreadIds.size && fresh.length) {
      beep();
      toast(`${fresh[0].title}: ${fresh[0].body}`);
    }
    S.lastUnreadIds = new Set(notes.filter((n) => !n.is_read).map((n) => n.id));
    if (!S.lastUnreadIds.size) S.lastUnreadIds.add('__none__');
    S.notes = notes; S.sessions = sessions;
    const open = sessions.find((x) => x.sessionId === S.openId);
    if (open && S.edit && !S.edit.dirty) S.edit = { items: open.items.map((i) => ({ ...i })), guestCount: open.guestCount, dirty: false };
  }

  function statusPill(s) {
    const [label, tone] = STATUS[s.workflowStatus] || [s.workflowStatus, ''];
    return `<span class="pill" data-tone="${tone}">${esc(label)}</span>`;
  }

  function editorHtml() {
    const s = S.sessions.find((x) => x.sessionId === S.openId);
    if (!s || !S.edit) return '';
    const e = S.edit;
    const total = e.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const seats = Array.from({ length: Math.max(e.guestCount, 1) }, (_, i) => i + 1);
    const lockedByOther = s.lockedBy && s.lockedBy !== S.staff.id;
    const q = S.productSearch.trim().toLowerCase();
    const found = q && S.catalog ? S.catalog.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 12) : [];
    const pending = e.items.filter((i) => !i.isLocked).length;
    return `<section class="card editor" id="editor">
      <div class="editor__head">
        <div>
          <div class="h2" style="margin-bottom:6px">Стол №${esc(s.tableNumber)} ${statusPill(s)}</div>
          <div class="muted">${s.guest ? `${esc(s.guest.name)} · ${esc(s.guest.phoneMasked || '')} · визитов: ${s.guest.visitsCount}` : 'Гость не идентифицирован'}
            ${s.guestsAtTable > 1 ? ` · телефонов за столом: ${s.guestsAtTable}` : ''}</div>
          <div class="muted" style="font-size:13px;margin-top:4px">Открыт ${time(s.createdAt)}${s.iikoOrderId ? ` · iiko ${esc(s.iikoOrderId.slice(0, 8))}…` : ''}${s.waitingMinutes != null ? ` · ждёт ${s.waitingMinutes} мин` : ''}</div>
        </div>
        <div class="field"><label>Гостей за столом</label>
          <div class="qty"><button class="icon-btn" data-guests="-1">−</button><b>${e.guestCount}</b><button class="icon-btn" data-guests="1">+</button></div></div>
      </div>
      ${lockedByOther ? '<div class="error-box">Стол сейчас редактирует другой официант</div>' : ''}
      ${s.iikoLastError ? `<div class="error-box"><b>Ошибка iiko:</b> ${esc(s.iikoLastError)}<br>Корзина сохранена — исправьте и нажмите «В работу» ещё раз.</div>` : ''}
      <div>${e.items.length ? e.items.map((it, idx) => `<div class="row ${it.isLocked ? '' : 'is-new'}">
        <div><div class="row__name">${esc(it.name)}</div>
          <div class="row__meta">${rub(it.price)} · ${it.isLocked ? `на кухне (партия ${it.batchNo || 1})` : '<b style="color:var(--ok)">новое</b>'}</div></div>
        <select class="sel hide-sm" data-seat="${idx}" title="Место"><option value="">Место —</option>${seats.map((n) => `<option value="${n}" ${Number(it.seatNumber) === n ? 'selected' : ''}>Место ${n}</option>`).join('')}</select>
        <select class="sel hide-sm" data-course="${idx}" title="Курс подачи"><option value="">Курс —</option>${[1, 2, 3].map((n) => `<option value="${n}" ${Number(it.course) === n ? 'selected' : ''}>Курс ${n}</option>`).join('')}</select>
        <div class="qty">${it.isLocked ? `<b>${it.quantity}</b>` : `<button class="icon-btn" data-qty="${idx}" data-d="-1">−</button><b>${it.quantity}</b><button class="icon-btn" data-qty="${idx}" data-d="1">+</button>`}</div>
        <b class="hide-sm" style="min-width:80px;text-align:right">${rub(it.price * it.quantity)}</b>
      </div>`).join('') : '<div class="muted">Позиции не выбраны</div>'}</div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:18px"><span class="muted">Итого</span><b>${rub(total)}</b></div>
      <div style="margin-top:16px"><input class="inp" id="prod-search" style="width:100%" placeholder="Добавить блюдо: начните вводить название" value="${esc(S.productSearch)}">
        <div class="search-results">${found.map((p) => `<button data-add="${esc(p.id)}" ${p.isInStopList ? 'disabled' : ''}><span>${esc(p.name)}${p.isInStopList ? ' · стоп' : ''}</span><b>${rub(p.price)}</b></button>`).join('')}</div></div>
      <div class="footer-actions">
        <button class="btn" data-save ${e.dirty && !lockedByOther ? '' : 'disabled'}>Сохранить правки</button>
        <button class="btn btn--dark" data-send ${pending && !lockedByOther ? '' : 'disabled'}>В работу → iiko (${pending})</button>
        <button class="btn" data-close-table>${s.isPaid ? 'Завершить визит' : 'Закрыть стол'}</button>
        <button class="btn" data-hide-editor>Свернуть</button>
      </div>
    </section>`;
  }

  const VIEWS = {
    tables: {
      async render() {
        await loadWaiter();
        const unread = S.notes.filter((n) => !n.is_read).length;
        return `<div class="grid-waiter">
          <section>
            <div class="toolbar"><div class="h2 grow" style="margin:0">Уведомления ${unread ? `<span class="pill" data-tone="bad">${unread}</span>` : ''}</div>
              ${unread ? '<button class="btn btn--sm" data-read-all>Прочитать все</button>' : ''}</div>
            <div class="feed">${S.notes.length ? S.notes.map((n) => `<button class="note ${n.is_read ? '' : 'is-unread'}" data-type="${esc(n.type)}" data-note="${esc(n.id)}" data-session="${esc(n.session_id || '')}">
              <div class="note__head"><span>${esc(n.title)}</span><span class="note__time">${time(n.created_at)}</span></div>
              <div class="note__body">${esc(n.body)}</div></button>`).join('') : '<div class="muted">Пока тихо</div>'}</div>
          </section>
          <section>
            <div class="h2">Активные столы <span class="muted" style="font-weight:400">${S.sessions.filter((s) => s.status === 'open').length}</span></div>
            <div class="tables">${S.sessions.length ? S.sessions.map((s) => `<button class="table-card ${S.openId === s.sessionId ? 'is-open' : ''}" data-open="${esc(s.sessionId)}">
              <div class="table-card__num">№${esc(s.tableNumber)} ${s.isOverdue ? '<span class="overdue">⏱ ' + s.waitingMinutes + ' мин</span>' : ''}</div>
              ${statusPill(s)}
              <div class="table-card__guest">${esc(s.guest?.name || 'Гость')}${s.pendingCount ? ` · новых: ${s.pendingCount}` : ''}</div>
              <div class="table-card__sum"><span class="muted" style="font-weight:400">${s.items.length} поз.</span><span>${rub(s.total)}</span></div>
            </button>`).join('') : '<div class="muted">Нет активных столов. Когда гость отсканирует QR, стол появится здесь.</div>'}</div>
            ${editorHtml()}
          </section>
        </div>`;
      },
      mounted() {
        const inp = $('#prod-search');
        if (inp && S.productSearch) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
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
        <div class="grid-waiter" style="grid-template-columns:1fr 1fr">
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
        return menuTable();
      },
    },

    chips: crudView({
      title: 'AI-подсказки (чипы на экране AI)',
      path: '/api/v1/admin/chips',
      fields: [['emoji', 'Эмодзи', 'text'], ['label', 'Текст чипа', 'text'], ['query', 'Запрос к AI', 'text'], ['sort_order', 'Порядок', 'number'], ['is_active', 'Показывать', 'bool']],
      hint: 'Чипы показываются гостю на экране AI. «Запрос к AI» — что будет искать помощник при нажатии.',
    }),
    promos: crudView({
      title: 'Маркетинговые блоки и акции',
      path: '/api/v1/admin/promos',
      fields: [['title', 'Заголовок', 'text'], ['text', 'Текст', 'text'], ['image_url', 'Картинка (URL)', 'text'], ['product_id', 'ID блюда', 'text'], ['sort_order', 'Порядок', 'number'], ['is_active', 'Активна', 'bool']],
      hint: 'Блоки доступны гостевому приложению через /api/v1/config (promos).',
    }),

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

    feedback: {
      async render() {
        const rows = await api('GET', '/api/v1/manager/feedback');
        return `<div class="card"><div class="h2">Отзывы гостей</div><div class="tbl-wrap"><table class="tbl">
          <tr><th>Когда</th><th>Стол</th><th>Оценка</th><th>Комментарий</th><th>Гость</th><th>Официант</th><th>Сумма</th></tr>
          ${rows.map((f) => `<tr><td>${dateTime(f.created_at)}</td><td>№${esc(f.table_number)}</td>
            <td><span class="stars">${'★'.repeat(f.rating)}</span><span class="muted">${'★'.repeat(5 - f.rating)}</span></td>
            <td>${f.rating <= 3 ? '<span class="pill" data-tone="bad">эскалация</span> ' : ''}${esc(f.comment || '')}</td>
            <td>${esc(f.guest_name || '—')}</td><td>${esc(f.waiter_name || '—')}</td><td>${rub(f.total)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Отзывов пока нет</td></tr>'}
        </table></div></div>`;
      },
    },

    staff: {
      async render() {
        const [rows, rests] = await Promise.all([api('GET', '/api/v1/admin/staff'), api('GET', '/api/v1/admin/restaurants')]);
        S.staffRests = rests;
        const roleName = { admin: 'Администратор', manager: 'Управляющий', waiter: 'Официант' };
        return `<div class="card"><div class="toolbar"><div class="h2 grow" style="margin:0">Сотрудники</div><button class="btn btn--dark btn--sm" data-staff-new>Добавить</button></div>
          <div class="tbl-wrap"><table class="tbl"><tr><th>Имя</th><th>Логин</th><th>Роль</th><th>Ресторан</th><th>Статус</th><th></th></tr>
          ${rows.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.login)}</td><td>${roleName[u.role]}</td>
            <td>${esc(rests.find((r) => r.id === u.restaurantId)?.name || 'Все')}</td><td>${u.isActive ? '<span class="pill" data-tone="ok">активен</span>' : '<span class="pill">отключён</span>'}</td>
            <td><button class="btn btn--sm" data-staff-edit='${esc(JSON.stringify(u))}'>Изменить</button></td></tr>`).join('')}
          </table></div></div>`;
      },
    },

    audit: {
      async render() {
        const rows = await api('GET', '/api/v1/admin/audit');
        return `<div class="card"><div class="h2">Журнал изменений</div><div class="tbl-wrap"><table class="tbl">
          <tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Детали</th></tr>
          ${rows.map((a) => `<tr><td>${dateTime(a.created_at)}</td><td>${esc(a.staff_name || '')}</td><td>${esc(a.action)}</td>
            <td>${esc(a.entity || '')} ${esc((a.entity_id || '').slice(0, 12))}</td><td class="muted" style="font-size:12px;max-width:380px">${esc(JSON.stringify(a.payload || {})).slice(0, 200)}</td></tr>`).join('')}
        </table></div></div>`;
      },
    },
  };

  // ── Админ: меню ────────────────────────────────────────────
  function menuTable() {
    const m = S.adminMenu;
    const q = S.menu.search.toLowerCase();
    const groups = [...new Set(m.products.map((p) => p.group).filter(Boolean))];
    const rows = m.products.filter((p) => (!q || p.name.toLowerCase().includes(q))
      && (!S.menu.group || p.group === S.menu.group) && (!S.menu.onlyStop || p.isInStopList || p.isHidden));
    const sw = (on, attr, red = false) => `<button class="switch ${on ? 'is-on' : ''} ${red ? 'is-red' : ''}" ${attr}></button>`;
    return `<div class="card">
      <div class="toolbar">
        <div class="h2 grow" style="margin:0">Меню <span class="muted" style="font-weight:400;font-size:14px">источник: ${esc(m.source)} · обновлено ${dateTime(m.fetchedAt)}</span></div>
        <button class="btn btn--sm" data-menu-refresh>Обновить из iiko / prod</button>
      </div>
      <div class="toolbar">
        <input class="inp grow" id="menu-search" placeholder="Поиск блюда" value="${esc(S.menu.search)}">
        <select class="sel" id="menu-group"><option value="">Все категории</option>${groups.map((g) => `<option ${g === S.menu.group ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <label style="display:flex;gap:8px;align-items:center">${sw(S.menu.onlyStop, 'data-only-stop')} Только стоп/скрытые</label>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <tr><th></th><th>Блюдо</th><th>Категория</th><th>Цена</th><th>Стоп-лист</th><th>Скрыть</th><th>Рекомендуем</th><th></th></tr>
        ${rows.map((p) => `<tr>
          <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb">🍽</div>'}</td>
          <td><b>${esc(p.name)}</b><div class="muted" style="font-size:12px">${esc(p.weight || '')}${p.energy ? ` · ${Math.round(p.energy)} ккал` : ''}${p.allergens?.length ? ` · аллергены: ${esc(p.allergens.join(', '))}` : ''}</div></td>
          <td class="muted">${esc(p.group)}</td><td>${p.price ? rub(p.price) : ''}</td>
          <td>${sw(p.isInStopList, `data-ov="${esc(p.id)}" data-field="is_stopped" data-val="${!p.isInStopList}"`, true)}</td>
          <td>${sw(p.isHidden, `data-ov="${esc(p.id)}" data-field="is_hidden" data-val="${!p.isHidden}"`)}</td>
          <td>${p.isHidden ? '' : sw(p.isRecommended, `data-ov="${esc(p.id)}" data-field="is_recommended" data-val="${!p.isRecommended}"`)}</td>
          <td>${p.isHidden ? '' : `<button class="btn btn--sm" data-edit-product="${esc(p.id)}">Карточка</button>`}</td>
        </tr>`).join('')}
      </table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">Стоп-лист: блюдо остаётся в меню, но заказать его нельзя. Скрыть: блюдо пропадает из QR-меню. Правки действуют поверх выгрузки iiko и не теряются при обновлении меню.</p>
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
    const f = (key, label, value, type = 'text') => `<div class="field"><label>${label}</label><input class="inp" name="${key}" type="${type}" value="${esc(value ?? '')}" ${type === 'number' ? 'step="0.1"' : ''}></div>`;
    modal(`<div class="h2">${esc(p.name)}</div>
      <form id="prod-form">
        ${f('image_url', 'Фото (URL)', p.image)}
        <div class="field" style="margin-top:10px"><label>Описание</label><textarea class="inp" name="description">${esc(p.description || '')}</textarea></div>
        <div class="form-grid" style="margin-top:10px">
          ${f('weight', 'Вес / объём', p.weight)}${f('energy', 'Ккал', p.energy, 'number')}${f('proteins', 'Белки', p.proteins, 'number')}
          ${f('fats', 'Жиры', p.fats, 'number')}${f('carbs', 'Углеводы', p.carbs, 'number')}
        </div>
        ${f('allergens', 'Аллергены (через запятую)', (p.allergens || []).join(', '))}
        <div class="field" style="margin-top:10px"><label>Где применить</label><select class="sel" name="scope"><option value="restaurant">Только в этом ресторане</option><option value="global">Во всех ресторанах</option></select></div>
        <div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Отмена</button></div>
      </form>`, (root) => {
      $('#prod-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        fd.allergens = fd.allergens ? fd.allergens.split(',').map((a) => a.trim()).filter(Boolean) : [];
        try { await setOverride(p.id, fd); closeModal(); toast('Карточка сохранена'); } catch (err) { toast(err.message, true); }
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
          <div class="tbl-wrap"><table class="tbl"><tr>${fields.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr>
          ${rows.map((r) => `<tr>${fields.map(([k, , t]) => `<td>${t === 'bool' ? (r[k] ? '✓' : '—') : esc(r[k] ?? '')}</td>`).join('')}
            <td style="white-space:nowrap"><button class="btn btn--sm" data-crud-edit='${esc(JSON.stringify({ path, row: r }))}'>Изменить</button>
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

  function openStaffForm(u = {}) {
    modal(`<div class="h2">${u.id ? 'Сотрудник' : 'Новый сотрудник'}</div><form id="staff-form"><div class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="field"><label>Имя</label><input class="inp" name="name" value="${esc(u.name || '')}" required></div>
      <div class="field"><label>Логин</label><input class="inp" name="login" value="${esc(u.login || '')}" required></div>
      <div class="field"><label>Роль</label><select class="sel" name="role">${[['waiter', 'Официант'], ['manager', 'Управляющий'], ['admin', 'Администратор']].map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Ресторан</label><select class="sel" name="restaurantId"><option value="">Все</option>${(S.staffRests || []).map((r) => `<option value="${r.id}" ${u.restaurantId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>${u.id ? 'Новый пароль (пусто — не менять)' : 'Пароль'}</label><input class="inp" name="password" type="password" ${u.id ? '' : 'required'}></div>
      <label style="display:flex;gap:10px;align-items:center;margin-top:20px"><input type="checkbox" name="isActive" ${u.isActive !== false ? 'checked' : ''}> Активен</label>
      </div><div class="footer-actions"><button class="btn btn--dark" type="submit">Сохранить</button><button class="btn" type="button" data-modal-close>Отмена</button></div></form>`, (root) => {
      $('#staff-form', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        fd.isActive = e.target.elements.isActive.checked; fd.id = u.id;
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
      S.edit = { items: s.items.map((i) => ({ ...i })), guestCount: s.guestCount, dirty: false };
    } catch (e) {
      toast(e.message, true);
      const s = await api('GET', `/api/v1/waiter/session/${sessionId}`);
      S.edit = { items: s.items.map((i) => ({ ...i })), guestCount: s.guestCount, dirty: false };
    }
    if (!S.catalog) {
      const slug = S.restaurant || S.restaurants[0]?.slug;
      S.catalog = await fetch(`/api/v1/restaurants/${slug}/catalog`).then((r) => r.json()).catch(() => null);
    }
    await render();
    $('#editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveEdit() {
    const s = await api('POST', `/api/v1/waiter/session/${S.openId}/cart`, { items: S.edit.items, guestCount: S.edit.guestCount });
    S.edit = { items: s.items.map((i) => ({ ...i })), guestCount: s.guestCount, dirty: false };
    return s;
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
      if (q('[data-hide-editor]')) {
        api('POST', `/api/v1/waiter/session/${S.openId}/release`).catch(() => {});
        S.openId = null; S.edit = null; render(); return;
      }
      if (q('[data-guests]')) { S.edit.guestCount = Math.max(1, S.edit.guestCount + Number(q('[data-guests]').dataset.guests)); S.edit.dirty = true; render(); return; }
      if (q('[data-qty]')) {
        const b = q('[data-qty]'); const it = S.edit.items[Number(b.dataset.qty)];
        it.quantity += Number(b.dataset.d);
        if (it.quantity <= 0) S.edit.items.splice(Number(b.dataset.qty), 1);
        S.edit.dirty = true; render(); return;
      }
      if (q('[data-add]')) {
        const p = S.catalog.products.find((x) => String(x.id) === q('[data-add]').dataset.add);
        const existing = S.edit.items.find((i) => !i.isLocked && String(i.productId) === String(p.id));
        if (existing) existing.quantity += 1;
        else S.edit.items.push({ productId: p.id, iikoProductId: p.iikoId || p.id, name: p.name, price: p.price, quantity: 1, isLocked: false });
        S.productSearch = ''; S.edit.dirty = true; render(); return;
      }
      if (q('[data-save]')) { await saveEdit(); toast('Правки сохранены — гость видит актуальный заказ'); render(); return; }
      if (q('[data-send]')) {
        const btn = q('[data-send]'); btn.disabled = true; btn.textContent = 'Отправляем в iiko…';
        if (S.edit.dirty) await saveEdit();
        try {
          const s = await api('POST', `/api/v1/waiter/session/${S.openId}/send-to-production`);
          S.edit = { items: s.items.map((i) => ({ ...i })), guestCount: s.guestCount, dirty: false };
          toast('Заказ отправлен на кухню');
        } catch (err) { toast(err.message, true); }
        render(); return;
      }
      if (q('[data-close-table]')) {
        if (!confirm('Закрыть стол? Гость при следующем скане начнёт новый визит.')) return;
        await api('POST', `/api/v1/waiter/session/${S.openId}/close`);
        S.openId = null; S.edit = null; toast('Стол закрыт'); render(); return;
      }
      // админ
      if (q('[data-menu-refresh]')) { S.adminMenu = { restaurant: S.restaurant, ...(await api('GET', '/api/v1/admin/menu?refresh=1')) }; toast(`Меню обновлено: ${S.adminMenu.source}`); render(); return; }
      if (q('[data-only-stop]')) { S.menu.onlyStop = !S.menu.onlyStop; render(); return; }
      if (q('[data-ov]')) { const b = q('[data-ov]'); await setOverride(b.dataset.ov, { [b.dataset.field]: b.dataset.val === 'true' }); toast('Сохранено'); return; }
      if (q('[data-edit-product]')) { openProductEditor(q('[data-edit-product]').dataset.editProduct); return; }
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
    } else if (e.target.dataset.seat != null) { S.edit.items[Number(e.target.dataset.seat)].seatNumber = Number(e.target.value) || null; S.edit.dirty = true; render(); }
    else if (e.target.dataset.course != null) { S.edit.items[Number(e.target.dataset.course)].course = Number(e.target.value) || null; S.edit.dirty = true; render(); }
    else if (e.target.id === 'menu-group') { S.menu.group = e.target.value; render(); }
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
      if (S.tab === 'tables' && !(S.edit?.dirty)) render();
      else if (S.tab === 'hall') render();
    }, 5000);
  }

  if (S.token) start(); else renderLogin();
})();
