import { hasPageSlider, normalizeRouteName } from '~/lib/common';

export default function (context) {
  const routeName = normalizeRouteName(context.route.name);
  const hasSlider = hasPageSlider(routeName);
  context.store.commit('view/setIsHeaderOnSlider', hasSlider);
  context.store.commit('view/setIsPageScrollHidden', false);
}
