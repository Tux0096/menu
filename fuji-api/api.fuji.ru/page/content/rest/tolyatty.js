import { getImageURL } from '../../../lib/helpers.js';

const imageOptions = {
  width: 608,
  format: 'webp',
};
export default {
  title: 'О ресторанах',
  slides: [
    getImageURL('content/restaurant/tolyatti/1.jpg', imageOptions),
    getImageURL('content/restaurant/tolyatti/2.jpg', imageOptions),
    getImageURL('content/restaurant/tolyatti/3.jpg', imageOptions),

  ],
  text: `
 <p>
  Рестораны Фуджи - это идеальное место для любых встреч: от
  больших компаний до романтических вечеров. Это лучшие блюда,
  которые раскроют истинные чувства.
</p>
<p>
  Уютная атмосфера в сочетании ярких красок. Разнообразное меню,
  где каждый сможет найти то, что ему по вкусу. Более 100 видов
  роллов и сочные блюда Азии.
</p>
<p>
  В меню большой ассортимент напитков: От лёгких до крепких, от
  игристых до воздушных. Для любителей классики и для
  новаторов.
</p>
<p>
  За приятной атмосферой и вкусовым наслаждением ждём Вас в
  Фуджи.
</p>
  `,
};
