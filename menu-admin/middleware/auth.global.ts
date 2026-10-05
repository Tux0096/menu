import { useAuthStore } from '~/stores/auth';
import { useRestaurantStore } from '~/stores/restaurant';

// Все страницы, кроме /login, требуют токен. Доступ к разделам — по роли (utils/navigation.ts).
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  if (to.path === '/login') {
    return auth.isAuthenticated ? navigateTo(homeFor(auth.role)) : undefined;
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} });
  }

  await auth.ensureMe();
  if (!auth.isAuthenticated) return navigateTo({ path: '/login', query: { redirect: to.fullPath } });

  // список ресторанов нужен до первого запроса страницы: от него зависит ?restaurant=
  try {
    await useRestaurantStore().load();
  } catch {
    // нет связи — страница покажет свою ошибку загрузки
  }

  if (!canAccess(to.path, auth.role)) {
    const home = homeFor(auth.role);
    if (to.path === home) return undefined;
    if (import.meta.client && to.path !== '/') {
      useToast().add({ title: 'Нет доступа', description: 'Раздел недоступен для вашей роли', color: 'amber' });
    }
    return navigateTo(home);
  }
});
