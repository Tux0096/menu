<script setup lang="ts">
import type { Dashboard, PaySettings } from '~/types/api';
import { useAuthStore } from '~/stores/auth';
import { useMenuStore } from '~/stores/menu';
import { useRestaurantStore } from '~/stores/restaurant';

useHead({ title: 'Сводка — Фуджи' });

const auth = useAuthStore();
const menu = useMenuStore();
const restaurants = useRestaurantStore();
const isAdmin = computed(() => auth.hasRole('admin'));

const data = ref<Dashboard | null>(null);
const payments = ref<PaySettings | null>(null);
const loading = ref(false);
const loadError = ref('');
const menuError = ref('');

async function load() {
  loading.value = true;
  loadError.value = '';
  menuError.value = '';
  const tasks: Promise<unknown>[] = [
    useAuthFetch<Dashboard>('/manager/dashboard')
      .then((d) => (data.value = d))
      .catch((e) => (loadError.value = getErrorMessage(e))),
  ];
  if (isAdmin.value) {
    tasks.push(
      useAuthFetch<PaySettings>('/admin/payments')
        .then((p) => (payments.value = p))
        .catch(() => (payments.value = null)),
      menu.load().catch((e) => (menuError.value = getErrorMessage(e))),
    );
  }
  await Promise.all(tasks);
  loading.value = false;
}

// Зал меняется каждую минуту — перечитываем сами, пока вкладка открыта
const { dashboardRefreshSec } = useRuntimeConfig().public;
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  load();
  timer = setInterval(() => {
    if (!document.hidden && !loading.value) load();
  }, Number(dashboardRefreshSec || 30) * 1000);
});
onBeforeUnmount(() => timer && clearInterval(timer));
watch(() => restaurants.slug, () => {
  data.value = null;
  payments.value = null;
  load();
});

// ---------- столы сейчас: сначала те, кто ждёт официанта
const tables = computed(() =>
  [...(data.value?.sessions ?? [])]
    .filter((s) => s.status === 'open')
    .sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue) || (b.waitingMinutes ?? -1) - (a.waitingMinutes ?? -1)),
);

// ---------- меню из iiko
const menuAgeHours = computed(() =>
  menu.data?.fetchedAt ? (Date.now() - new Date(menu.data.fetchedAt).getTime()) / 3_600_000 : null,
);
const noPrice = computed(() => (menu.data?.products ?? []).filter((p) => !p.isHidden && !p.price).length);
const menuState = computed(() => {
  if (!menu.data) return null;
  if (menuAgeHours.value !== null && menuAgeHours.value > 26) {
    return { color: 'amber', icon: 'i-heroicons-clock', label: 'Давно не обновлялось' } as const;
  }
  if (noPrice.value) return { color: 'amber', icon: 'i-heroicons-exclamation-triangle', label: 'Есть блюда без цены' } as const;
  return { color: 'green', icon: 'i-heroicons-check-circle', label: 'В порядке' } as const;
});

// ---------- что требует внимания
interface Warning {
  key: string;
  color: 'red' | 'amber' | 'cta';
  icon: string;
  title: string;
  text: string;
  to?: string;
  action?: string;
}
const warnings = computed<Warning[]>(() => {
  const list: Warning[] = [];
  const d = data.value;
  if (d?.overdueTables) {
    list.push({
      key: 'overdue',
      color: 'red',
      icon: 'i-heroicons-clock',
      title: `${d.overdueTables} ${pluralize(d.overdueTables, ['стол ждёт', 'стола ждут', 'столов ждут'])} официанта дольше ${d.slaMinutes} мин`,
      text: 'Гость сделал заказ или попросил счёт, а официант ещё не подошёл. Список — в блоке «Столы сейчас» ниже.',
    });
  }
  if (d?.openCalls) {
    list.push({
      key: 'calls',
      color: 'amber',
      icon: 'i-heroicons-bell-alert',
      title: `Открытых вызовов: ${d.openCalls}`,
      text: 'Вызов официанта или счёта, который в приложении официанта ещё не прочитан.',
    });
  }
  if (d?.feedback30d.low) {
    list.push({
      key: 'low-feedback',
      color: 'amber',
      icon: 'i-heroicons-face-frown',
      title: `Низких оценок за 30 дней: ${d.feedback30d.low}`,
      text: 'Оценка 3 и ниже — свяжитесь с гостем, пока он не ушёл писать отзыв на карты.',
      to: '/reviews?low=1',
      action: 'Показать',
    });
  }
  if (isAdmin.value && payments.value && !payments.value.ready) {
    list.push({
      key: 'payments',
      color: 'cta',
      icon: 'i-heroicons-credit-card',
      title: payments.value.onlineEnabled ? 'Онлайн-оплата включена, но ключей не хватает' : 'Онлайн-оплата выключена',
      text: 'Гости платят картой или наличными официанту. Чтобы гость платил сам из меню, нужны ключи CloudPayments.',
      to: '/payments',
      action: 'Настроить',
    });
  }
  if (isAdmin.value && menuAgeHours.value !== null && menuAgeHours.value > 26) {
    list.push({
      key: 'menu-old',
      color: 'amber',
      icon: 'i-heroicons-arrow-path-rounded-square',
      title: 'Меню из iiko давно не обновлялось',
      text: `Последняя выгрузка — ${formatAgo(menu.data!.fetchedAt)}. Цены и состав могли устареть.`,
      to: '/network-menu',
      action: 'К меню',
    });
  }
  if (isAdmin.value && noPrice.value) {
    list.push({
      key: 'no-price',
      color: 'amber',
      icon: 'i-heroicons-tag',
      title: `Без цены: ${noPrice.value} ${pluralize(noPrice.value, ['блюдо', 'блюда', 'блюд'])}`,
      text: 'Гость их не видит. Цены задаются во внешнем меню iiko — после правки нажмите «Обновить из iiko» у точки в меню сети.',
      to: '/network-menu',
      action: 'Показать',
    });
  }
  return list;
});

// ---------- быстрые действия
const actions = computed(() => {
  const list: { to: string; icon: string; title: string; text: string; count?: number | null; tone?: 'red' }[] = [];
  if (isAdmin.value) {
    list.push(
      { to: '/network-menu?chip=stop', icon: 'i-heroicons-no-symbol', title: 'Стоп-лист', text: 'Что сейчас нельзя заказать', count: menu.stopCount || null, tone: menu.stopCount ? 'red' : undefined },
      { to: '/network-menu', icon: 'i-heroicons-table-cells', title: 'Меню сети', text: 'Карточки блюд: фото, описание, метки — сразу на всех точках' },
      { to: '/stop-lists', icon: 'i-heroicons-no-symbol', title: 'Стоп-листы iiko', text: 'Что на стопе на каждой точке' },
      { to: '/banners', icon: 'i-heroicons-photo', title: 'Баннеры', text: 'Акции и новинки над меню' },
      { to: '/qr', icon: 'i-heroicons-qr-code', title: 'QR-коды столов', text: 'Распечатать наклейки на столы' },
    );
  }
  list.push({ to: '/reviews', icon: 'i-heroicons-chat-bubble-left-right', title: 'Отзывы гостей', text: 'Оценки после визита', count: data.value?.feedback30d.count || null });
  if (isAdmin.value) list.push({ to: '/staff', icon: 'i-heroicons-users', title: 'Сотрудники', text: 'Доступы в админку и PIN официантов' });
  return list;
});

const hello = computed(() => {
  const h = Number(new Date().toLocaleString('ru-RU', { timeZone: useRuntimeConfig().public.timezone || 'Europe/Samara', hour: '2-digit', hour12: false }));
  const part = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const name = auth.admin?.name?.split(' ')[0];
  return name ? `${part}, ${name}` : part;
});
const rating = computed(() => {
  const f = data.value?.feedback30d;
  return f?.count ? `${f.avg.toFixed(1).replace('.', ',')} из 5` : '—';
});
</script>

<template>
  <div>
    <PageHeader :title="hello" :description="`Зал сейчас и цифры за сегодня — ${restaurants.current?.name ?? ''}. Обновляется само раз в полминуты.`" hide-crumbs>
      <UButton icon="i-heroicons-arrow-path" color="white" :loading="loading" @click="load">Обновить</UButton>
    </PageHeader>

    <UAlert
      v-if="loadError"
      class="mb-5"
      color="red"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Не удалось загрузить сводку"
      :description="loadError"
    />

    <section v-if="warnings.length" class="mb-5 space-y-2" aria-label="Требует внимания">
      <UAlert
        v-for="w in warnings"
        :key="w.key"
        :color="w.color"
        variant="soft"
        :icon="w.icon"
        :title="w.title"
        :description="w.text"
        :actions="w.to ? [{ label: w.action ?? 'Открыть', color: w.color, variant: 'solid', click: () => navigateTo(w.to!) }] : []"
      />
    </section>

    <!-- Цифры дня -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Столов в работе"
        icon="i-heroicons-squares-2x2"
        tone="cta"
        :loading="!data && loading"
        :value="data ? data.activeTables : '—'"
        :hint="data?.waitingTables ? `ждут официанта: ${data.waitingTables}` : undefined"
      />
      <StatCard label="Выручка QR сегодня" icon="i-heroicons-banknotes" tone="green" :loading="!data && loading" :value="data ? formatRub(data.today.revenue) : '—'" :hint="data ? `заказов в iiko: ${data.today.orders}` : undefined" />
      <StatCard label="Средний чек" icon="i-heroicons-receipt-percent" :loading="!data && loading" :value="data ? formatRub(data.today.avgCheck) : '—'" :hint="data ? `визитов: ${data.today.visits}` : undefined" />
      <StatCard
        label="Оценка за 30 дней"
        icon="i-heroicons-star"
        :tone="data && data.feedback30d.count && data.feedback30d.avg < 4 ? 'red' : 'green'"
        :loading="!data && loading"
        :value="rating"
        :hint="data?.feedback30d.count ? `${data.feedback30d.count} ${pluralize(data.feedback30d.count, ['оценка', 'оценки', 'оценок'])}` : undefined"
        to="/reviews"
      />
    </div>
    <div class="mt-4 grid gap-4 sm:grid-cols-3">
      <StatCard label="Оплачено онлайн" icon="i-heroicons-credit-card" :loading="!data && loading" :value="data ? formatRub(data.today.paidSum) : '—'" />
      <StatCard label="Чаевые" icon="i-heroicons-heart" :loading="!data && loading" :value="data ? formatRub(data.today.tips) : '—'" />
      <StatCard
        label="Реакция официанта"
        icon="i-heroicons-clock"
        :tone="data && data.today.avg_response_min > data.slaMinutes ? 'red' : 'brand'"
        :loading="!data && loading"
        :value="data ? `${data.today.avg_response_min.toFixed(1).replace('.', ',')} мин` : '—'"
        :hint="data ? `от заказа гостя до «В работу», норма — ${data.slaMinutes} мин` : undefined"
      />
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
      <div class="min-w-0 space-y-6">
        <!-- Столы сейчас -->
        <section class="panel-box self-start overflow-hidden">
          <div class="border-b border-brand-50 px-5 py-4">
            <h2 class="panel-section-title">Столы сейчас</h2>
            <p class="text-xs text-slate-500">Сверху — кто дольше всех ждёт. Заказы ведёт официант в приложении на телефоне.</p>
          </div>
          <TableSkeleton v-if="!data && loading" :rows="4" />
          <EmptyState
            v-else-if="!tables.length"
            compact
            icon="i-heroicons-squares-2x2"
            title="Свободно — активных столов нет"
            description="Когда гость отсканирует QR на столе, стол появится здесь."
          />
          <ul v-else class="divide-y divide-brand-50">
            <li v-for="t in tables" :key="t.sessionId" class="flex items-center gap-4 px-5 py-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-sm font-semibold">{{ t.tableNumber }}</div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm">{{ (t.guests ?? []).map((g) => g.name).join(', ') || t.guest?.name || 'Гость' }}</div>
                <div class="text-xs" :class="t.isOverdue ? 'font-medium text-red-600' : 'text-slate-500'">
                  {{ t.waitingMinutes !== null ? `ждёт ${t.waitingMinutes} мин` : 'не ждёт' }}<template v-if="t.readyCount"> · готово блюд: {{ t.readyCount }}</template>
                </div>
              </div>
              <div class="hidden text-right font-medium sm:block">{{ formatRub(t.total) }}</div>
              <TableStatusBadge :status="t.workflowStatus" size="xs" class="w-32 justify-center" />
            </li>
          </ul>
        </section>

        <!-- Официанты -->
        <section class="panel-box overflow-hidden">
          <div class="border-b border-brand-50 px-5 py-4">
            <h2 class="panel-section-title">Официанты сегодня</h2>
          </div>
          <TableSkeleton v-if="!data && loading" :rows="3" />
          <EmptyState v-else-if="!data?.waiters.length" compact icon="i-heroicons-user-group" title="Сегодня столов ещё не брали" />
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="text-left text-xs text-slate-500">
                <tr>
                  <th class="px-5 py-2 font-medium">Официант</th>
                  <th class="px-3 py-2 font-medium">Столов</th>
                  <th class="px-3 py-2 font-medium">Выручка</th>
                  <th class="px-3 py-2 font-medium">Чаевые</th>
                  <th class="px-5 py-2 font-medium">Оценка</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-50">
                <tr v-for="w in data.waiters" :key="w.name">
                  <td class="px-5 py-2.5 font-medium">{{ w.name }}</td>
                  <td class="px-3 py-2.5">{{ w.tables }}</td>
                  <td class="px-3 py-2.5">{{ formatRub(w.revenue) }}</td>
                  <td class="px-3 py-2.5">{{ formatRub(w.tips) }}</td>
                  <td class="px-5 py-2.5">{{ w.rating ? `${w.rating.toFixed(1)} ★` : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div class="space-y-6">
        <!-- Быстрые действия -->
        <section class="panel-box p-5">
          <h2 class="panel-section-title mb-3">Что сделать</h2>
          <div class="space-y-2">
            <NuxtLink
              v-for="a in actions"
              :key="a.to"
              :to="a.to"
              class="group flex items-center gap-3 rounded-xl p-3 ring-1 ring-brand-100 transition hover:bg-cream hover:ring-brand-200"
            >
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="a.tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-blush text-brand-500'">
                <UIcon :name="a.icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium">{{ a.title }}</div>
                <div class="truncate text-xs text-slate-500">{{ a.text }}</div>
              </div>
              <span
                v-if="a.count"
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="a.tone === 'red' ? 'bg-red-500 text-white' : 'bg-blush text-brand-500'"
              >{{ a.count }}</span>
              <UIcon name="i-heroicons-chevron-right" class="h-4 w-4 text-slate-300 group-hover:text-brand-500" />
            </NuxtLink>
          </div>
        </section>

        <!-- Меню из iiko -->
        <section v-if="isAdmin" class="panel-box p-5">
          <div class="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 class="panel-section-title">Меню из iiko</h2>
              <p class="text-xs text-slate-500">Блюда и цены приходят из внешнего меню iiko сами, раз в сутки</p>
            </div>
            <UBadge v-if="menuState" :color="menuState.color" variant="subtle" class="shrink-0 whitespace-nowrap">{{ menuState.label }}</UBadge>
          </div>
          <dl v-if="menu.data" class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-cream p-3">
              <dt class="text-xs text-slate-500">Блюд</dt>
              <dd class="text-lg font-semibold">{{ menu.data.products.filter((p) => !p.isHidden).length }}</dd>
            </div>
            <div class="rounded-xl bg-cream p-3">
              <dt class="text-xs text-slate-500">В стоп-листе</dt>
              <dd class="text-lg font-semibold" :class="{ 'text-red-600': menu.stopCount > 0 }">{{ menu.stopCount }}</dd>
            </div>
            <div class="col-span-2 rounded-xl bg-cream p-3">
              <dt class="text-xs text-slate-500">Последняя выгрузка</dt>
              <dd class="font-semibold">{{ menu.data.fetchedAt ? formatDayTime(menu.data.fetchedAt) : 'не было' }}</dd>
            </div>
          </dl>
          <p v-else-if="menuError" class="text-sm text-slate-500">{{ menuError }}</p>
          <div v-else class="space-y-2">
            <USkeleton class="h-14 w-full" />
            <USkeleton class="h-4 w-1/2" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
