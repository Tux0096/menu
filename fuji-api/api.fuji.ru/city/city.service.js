import slugify from 'slugify';
import { cityIn } from 'lvovich';
import * as cityRepo from './city.repository.js';

const customSlugify = (str) => slugify(str, { replacement: '-', lower: true, trim: true });

export const getCities = async () => {
  const citiesRaw = await cityRepo.getCities();

  // Фильтруем города по iikoId
  const cities = citiesRaw.filter((city) => [
    'e27dec5a-4447-4bcb-a124-0c1795618998', // Новокуйбышевск
    'a85360f2-55a8-47cc-8a79-1eb88a40c4f0', // Самара
    '3f02eb06-e771-434c-ab73-2ec5bbde1265', // Тольятти
  ].includes(city.iikoId));

  // Массив для определения порядка городов
  const order = ['Новокуйбышевск', 'Самара', 'Тольятти'];

  // Сортировка городов в соответствии с пользовательским порядком
  cities.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  // Маппинг городов с добавлением slug и cityIn
  return cities.map(
    (city) => ({ ...city, slug: customSlugify(city.name), cityIn: cityIn(city.name) }),
  );
};

export const getCityByStreetId = async (streetId) => {
  const street = await cityRepo.getStreetById(streetId);
  const city = await cityRepo.getCityById(street.cityId);
  return city;
};
