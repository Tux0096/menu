import { getImageURL } from '../../../lib/helpers.js';

const imageOptions = {
  width: 608,
  format: 'webp',
};
export default {
  title: 'О ресторанах',
  slides: [
    getImageURL('content/restaurant/samara/22.jpg', imageOptions),
    getImageURL('content/restaurant/samara/23.jpg', imageOptions),
    getImageURL('content/restaurant/samara/24.jpg', imageOptions),
  ],
  text: `
<p>Обновление в меню «Фуджи»!</p>
<p>
  Весна — время перемен. И наше меню не исключение. Открываем сезон яркой новинкой —разделом «Тартар роллы».
</p>
<p>
  Попробуйте новую линейку нежных роллов с тартаром из лосося, гребешка или сибаса. Идеальное сочетание свежих морепродуктов, нарезанных мелким кубиком, с авторскими соусами из авокадо, трюфеля и цитрусов. Смешиваем столь разные ингредиенты, поэтому получается интересно и по-весеннему свежо!
</p>
<p>
  Спешите заказать весенние новинки в мобильном приложении, на сайте или в ресторанах «Фуджи».
</p>
  `,
};
