import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Cities,
  Streets,
} = models;

export const getCities = async () => {
  try {
    return await Cities.findAll({ raw: true });
  } catch (e) {
    throw e;
  }
};

export const getStreetById = (id) => Streets.findOne({
  where: {
    iikoId: id,
  },
  raw: true,
});

export const getCityById = (id) => Cities.findOne({
  where: {
    iikoId: id,
  },
  raw: true,
});
