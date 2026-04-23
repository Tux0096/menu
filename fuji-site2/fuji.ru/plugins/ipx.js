/**
 * ================================================================
 *  ПЛАГИН $ipx() и $ipxSet() ДЛЯ NUXT 2 (РУССКАЯ ДОКУМЕНТАЦИЯ)
 * ================================================================
 *
 *  Для чего нужен:
 *  -----------------
 *  Этот плагин позволяет вручную формировать IPX ссылки,
 *  используя локальный эндпоинт:
 *
 *      /_ipx/
 *
 *  Пример реальной рабочей ссылки:
 *
 *      /_ipx/w_300/images/pic.png
 *
 *  Он заменяет собой @nuxt/image, если глобальный провайдер
 *  смотрит на внешний сервер и тебе нужно работать локально.
 *
 *  Условия работы:
 *  ---------------
 *  ✔ картинка должна лежать в /static, а НЕ в /assets
 *  ✔ Nuxt поднимает локальный IPX по /_ipx (у тебя это уже работает)
 *
 * ================================================================
 *  ЧТО ДАЁТ ПЛАГИН
 * ================================================================
 *
 *  1) this.$ipx(src, modifiers)
 *     Генерирует один IPX URL.
 *
 *  2) this.$ipxSet(src, modifiers, sizes)
 *     Генерирует retina srcset (1x, 2x, 3x ...).
 *
 * ================================================================
 *  ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
 * ================================================================
 *
 *  ----------- Пример 1: обычное изображение -----------
 *
 *      <img :src="$ipx('/images/gift.png', { w: 300 })">
 *
 *  РЕЗУЛЬТАТ:
 *      /_ipx/w_300/images/gift.png
 *
 *  ----------- Пример 2: формат + качество -----------
 *
 *      <img :src="$ipx('/images/gift.png', { w: 400, f: 'webp', q: 80 })">
 *
 *  РЕЗУЛЬТАТ:
 *      /_ipx/w_400,f_webp,q_80/images/gift.png
 *
 *  ----------- Пример 3: retina srcset -----------
 *
 *      <img
 *        :src="$ipx('/images/gift.png', { w: 200 })"
 *        :srcset="$ipxSet('/images/gift.png', { w: 200 })"
 *      >
 *
 *  РЕЗУЛЬТАТ:
 *      /_ipx/w_200/images/gift.png 1x,
 *      /_ipx/w_400/images/gift.png 2x,
 *      /_ipx/w_600/images/gift.png 3x
 *
 *  ----------- Пример 4: фоновая картинка -----------
 *
 *      <div :style="{
 *        backgroundImage: `url('${$ipx('/images/bg.jpg', { w: 1200 })}')`
 *      }">
 *
 *  ----------- Пример 5: использование в script -----------
 *
 *      methods: {
 *        preview() {
 *          return this.$ipx('/images/photo.jpg', { w: 600, f: 'webp' });
 *        }
 *      }
 *
 * ================================================================
 */

export default (_, inject) => {
  /**
   * Генерирует один IPX URL.
   *
   * @param {string} src - путь, например "/images/pic.png"
   * @param {Object} modifiers - параметры IPX (w, h, f, q, fit, blur...)
   * @returns {string}
   *
   * @example
   * $ipx('/images/pic.png', { w: 300 })
   * // → "/_ipx/w_300/images/pic.png"
   */
  const buildIPX = (src, modifiers = {}) => {
    const ops = [];

    const map = {
      w: 'w',
      width: 'w',
      h: 'h',
      height: 'h',
      f: 'f',
      format: 'f',
      q: 'q',
      quality: 'q',
      fit: 'fit',
      blur: 'blur',
      bg: 'bg',
      crop: 'crop',
    };

    for (const key in modifiers) {
      const ipxKey = map[key];
      if (ipxKey) {
        ops.push(`${ipxKey}_${modifiers[key]}`);
      }
    }

    const params = ops.length ? `/${ops.join(',')}` : '';
    return `/_ipx${params}${src}`;
  };

  /**
   * Создаёт retina srcset (1x, 2x, 3x).
   *
   * @param {string} src - путь к картинке
   * @param {Object} baseModifiers - базовые модификаторы (например { w: 200 })
   * @param {number[]} sizes - множители, по умолчанию [1,2,3]
   * @returns {string}
   *
   * @example
   * $ipxSet('/images/pic.png', { w: 200 })
   * // "/_ipx/w_200/images/pic.png 1x,
   * //  /_ipx/w_400/images/pic.png 2x,
   * //  /_ipx/w_600/images/pic.png 3x"
   */
  const generateSrcset = (src, sizes = [1, 2, 3], baseModifiers = {}) => sizes
    .map((scale) => {
      const w = baseModifiers.w ? baseModifiers.w * scale : undefined;
      const h = baseModifiers.h ? baseModifiers.h * scale : undefined;
      const url = buildIPX(src, { ...baseModifiers, w, h });
      return `${url} ${scale}x`;
    })
    .join(', ');

  inject('ipx', (src, modifiers = {}) => buildIPX(src, modifiers));
  inject('ipxSet', (src, baseModifiers = {}, sizes = [
    1,
    2,
    3]) => generateSrcset(src, sizes, baseModifiers));
};
