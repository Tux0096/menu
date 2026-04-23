import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const { Cities, Streets } = models;

export const getCladrAll = async () => {
  const [results] = await sequelize.query(
    `SELECT s.iikoId,
            s.name,
            s.cityId,
            s.classifierId,
            c.name cityName
     FROM streets s
              LEFT JOIN cities c ON s.cityId = c.iikoId;`,
  );
  return results;
};

export const updateCities = async (cities) => {
  try {
    const rows = await Cities.bulkCreate(cities, {
      updateOnDuplicate: [...Object.keys(cities[0])],
    });

    return Cities.findAll({
      where: {
        iikoId: rows.map((r) => r.iikoId),
      },
    });
  } catch (e) {
    throw e;
  }
};

export const updateStreets = async (streets) => {
  try {
    return await Streets.bulkCreate(streets, {
      updateOnDuplicate: [...Object.keys(streets[0])],
    });
  } catch (e) {
    throw e;
  }
};

export const deleteAllCities = async () => {
  try {
    return await Cities.destroy({ truncate: true });
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteAllStreets = async () => {
  try {
    return await Streets.destroy({ truncate: true });
  } catch (e) {
    throw new Error(e);
  }
};
