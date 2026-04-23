import { Op } from 'sequelize';
import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const {
  Sms,

} = models;

export const getCodeByPhone = async (phone) => {
  const currentDateTime = new Date();

  return Sms.findOne({
    where: {
      phone,
      expireAt: {
        [Op.gte]: currentDateTime,
      },
    },
    order: [
      ['id', 'DESC'],
    ],
    raw: true,
  });
};

export const saveCode = async (data) => {
  await Sms.create(data);
};
