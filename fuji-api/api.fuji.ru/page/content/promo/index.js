import { getImageURL } from '../../../lib/helpers.js';

const imageOptions = {
  width: 1024,
  format: 'webp',
};
export default {
  title: 'Акции',
  banners: [
    {
      path: getImageURL('content/promo/1.png', imageOptions),
      link: '/catalog/sety',
    },
    {
      path: getImageURL('content/promo/2.webp', imageOptions),
      link: '/catalog/zakuski',
    },

  ],
  text: '',
};
