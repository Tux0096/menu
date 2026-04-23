import { renameObjectKey } from '../lib/helpers.js';

import * as cladrRepo from './cladr.repository.js';

const cityMap = new Map();
cityMap.set('samara', 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0');

cityMap.set('tolyatti', '3f02eb06-e771-434c-ab73-2ec5bbde1265');
cityMap.set('podstepki', '33f5a1c7-bf92-47c7-b66a-76bbe087d168');
cityMap.set('primorskij-posyolok', 'eaa41066-cba5-4c21-8a39-73c344ee0964');
cityMap.set('timofeevka', '3ff86d4b-f578-4741-a79a-83d583e8dc06');

cityMap.set('novokujbyshevsk', 'e27dec5a-4447-4bcb-a124-0c1795618998');
cityMap.set('mayak', '108a787b-b449-43e0-9517-0259409c264d');
cityMap.set('voskresenka', '11b8d33f-2f42-44d5-8e1d-6eb55778a532');

export const getCladrAll = async (cityIikoId = cityMap.get('samara')) => {
  const getCladrItem = ((cityName, iikoId, name, classifierId) => ({
    iikoId,
    id: iikoId,
    name,
    nameWithCity: `${cityName}, ${name}`,
    classifierId,
    cityName,
  }));

  const streets = await cladrRepo.getCladrAll();

  if (cityIikoId === cityMap.get('samara')) {
    return streets
      .filter((s) => s.cityId !== cityMap.get('novokujbyshevsk')
        && s.cityId !== cityMap.get('tolyatti')
        && s.cityId !== cityMap.get('mayak')
        && s.cityId !== cityMap.get('podstepki')
        && s.cityId !== cityMap.get('primorskij-posyolok')
        && s.cityId !== cityMap.get('timofeevka')
        && s.cityId !== cityMap.get('voskresenka')).map(({
        cityName, iikoId, name, classifierId,
      }) => getCladrItem(cityName, iikoId, name, classifierId));
  }

  if (cityIikoId === cityMap.get('tolyatti')) {
    return streets
      .filter((s) => s.cityId === cityMap.get('tolyatti')
        || s.cityId === cityMap.get('podstepki')
        || s.cityId === cityMap.get('primorskij-posyolok')
        || s.cityId === cityMap.get('timofeevka'))
      .map(({
        cityName, iikoId, name, classifierId,
      }) => getCladrItem(cityName, iikoId, name, classifierId));
  }

  if (cityIikoId === cityMap.get('novokujbyshevsk')) {
    return streets
      .filter((s) => s.cityId === cityMap.get('novokujbyshevsk')
        || s.cityId === cityMap.get('mayak')
        || s.cityId === cityMap.get('voskresenka'))
      .map(({
        cityName, iikoId, name, classifierId,
      }) => getCladrItem(cityName, iikoId, name, classifierId));
  }

  return [
    {
      iikoId: -1,
      id: -1,
      name: '- не найдено',
    },
  ];
};

export const updateCities = (cities) => {
  const data = cities.map((el) => {
    renameObjectKey(el, 'id', 'iikoId');
    return el;
  });

  return cladrRepo.updateCities(data);
};

export const updateStreets = (streets) => {
  const data = streets.map((el) => {
    renameObjectKey(el, 'id', 'iikoId');
    return el;
  });
  return cladrRepo.updateStreets(data);
};

export const updateCladr = async (cladr = []) => {
  if (!cladr.length) {
    return false;
  }

  try {
    const cities = cladr.flatMap((c) => c.city);
    const streets = cladr.flatMap((c) => c.streets);

    const cityModels = await updateCities(cities);

    streets.forEach((street) => {
      const city = cityModels.find((cm) => cm.iikoId === street.cityId);
      street.cityId = city.iikoId;
    });

    await updateStreets(streets);
  } catch (e) {
    throw e;
  }
};

export const deleteAllCities = async () => await cladrRepo.deleteAllCities();
export const deleteAllStreets = async () => await cladrRepo.deleteAllStreets();
