import { getImageURL } from '../../../lib/helpers.js';

const imageOptions = {
  width: 608,
};
export default {
  title: '',
  slides: {
    mobile: [
      getImageURL('content/vacancies/1.jpg', imageOptions),
    ],
    desktop: [
      getImageURL('content/vacancies/1.png', imageOptions),
    ],
  },
  text: '',
};
