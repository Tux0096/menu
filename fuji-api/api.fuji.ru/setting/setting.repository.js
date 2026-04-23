import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Settings,
} = models;

export const getSettings = async () => Settings.findAll({ raw: true });

export const getSettingByName = async (name) => Settings.findOne({ where: { name }, raw: true });

export const updateSetting = async (entity) => {
  const { id, ...fieldsToUpdate } = entity;
  await Settings.update(fieldsToUpdate, {
    where: { id },
  });
};

export const updateSettings = async (entities) => {
  const transaction = await sequelize.transaction();
  try {
    await Promise.all(
      entities.map((entity) => {
        const { id, ...fieldsToUpdate } = entity;
        return Settings.update(fieldsToUpdate, {
          where: { id },
          transaction,
        });
      }),
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const update = async (name, value) => {
  try {
    await Settings.update({
      value,
    }, {
      where: { name },
    });
  } catch (e) {
    console.log(e);
  }
};
