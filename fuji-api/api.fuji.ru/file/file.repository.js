import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const {
  Files,
} = models;

export const saveFileData = async (fileData) => {
  try {
    const createdFileData = await Files.create(fileData);
    return createdFileData.get({ plain: true });
  } catch (e) {
    console.log(e);
  }
};

export const deleteFileData = async (id) => {
  try {
    await Files.destroy({
      where: {
        id,
      },
    });
  } catch (e) {
    console.log(e);
  }
};

export const getFile = async (id) => {
  try {
    return await Files.findOne({
      where: {
        id,
      },
      raw: true,
    });
  } catch (e) {
    console.log(e);
  }
};

export const getFileByOriginalName = async (originalName) => {
  try {
    return await Files.findOne({
      where: {
        originalName,
      },
      raw: true,
      order: [['id', 'DESC']],
    });
  } catch (e) {
    console.log(e);
  }
};

export const deleteFile = async (id) => {
  try {
    const result = await Files.destroy({
      where: {
        id,
      },
    });
    return result !== 0;
  } catch (e) {
    console.log('Ошибка при удалении файла:', e);
    throw new Error('Ошибка при удалении файла');
  }
};
