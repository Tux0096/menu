import Sequelize from 'sequelize';
import { sequelize } from '../db.js';

import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Iiko,
  Groups,
  Products,
  ShopImages,
  ProductModifiers,
  ProductGroupModifiers,
  ProductGroupModifiersChildren,
  StopList,
} = models;

const { Op } = Sequelize;

export async function addUploadedImagesPaths(paths) {
  try {
    const res = await ShopImages.bulkCreate(paths, {
      updateOnDuplicate: [...Object.keys(paths[0])],
    });
    return res;
  } catch (e) {
    throw new Error(e);
  }
}

export const updateGroups = async (groups) => {
  try {
    return await Groups.bulkCreate(groups, {
      updateOnDuplicate: [...Object.keys(groups[0])],
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteOldGroups = async (revision) => {
  try {
    return await Groups.destroy({
      where: {
        revision: {
          [Op.or]: [
            { [Op.not]: revision }, null],
        },
      },
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const createOrUpdateProducts = async (products) => {
  if (!products.length) {
    return;
  }

  try {
    const updatableFields = [...Object.keys(products[0])];
    return await Products.bulkCreate(products, {
      updateOnDuplicate: updatableFields, returning: true, individualHooks: true,
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteOldProducts = async (revision) => {
  try {
    return await Products.destroy({
      where: {
        revision: {
          [Op.or]: [
            { [Op.not]: revision }, null],

        },
      },
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteOldImages = async (revision) => {
  try {
    const where = {
      [Op.or]: {
        ownerId: null,
        revision: {
          [Op.or]: [
            { [Op.not]: revision }, null],
        },
      },
    };

    const deletedImages = await ShopImages.findAll({
      where, raw: true,
    });

    await ShopImages.destroy({
      where,
    });

    return deletedImages;
  } catch (e) {
    throw new Error(e);
  }
};

export const updateImages = async (images) => {
  if (!images.length) {
    return false;
  }

  try {
    const updatableFields = [...Object.keys(images[0])];
    return await ShopImages.bulkCreate(images, {
      updateOnDuplicate: updatableFields,
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const updateModifiers = async (modifiers) => {
  if (!modifiers.length) {
    return false;
  }
  try {
    await ProductModifiers.destroy({
      where: {},
    });

    return await ProductModifiers.bulkCreate(modifiers);
  } catch (e) {
    throw new Error(e);
  }
};

export const updateGroupModifiers = async (groupModifiers) => {
  if (!groupModifiers.length) {
    return false;
  }
  try {
    await ProductGroupModifiers.destroy({
      where: {},
    });

    return await ProductGroupModifiers.bulkCreate(groupModifiers);
  } catch (e) {
    throw new Error(e);
  }
};

export const updateGroupModifiersChildren = async (groupModifiersChildren) => {
  if (!groupModifiersChildren.length) {
    return false;
  }
  try {
    await ProductGroupModifiersChildren.destroy({
      where: {},
    });

    return await ProductGroupModifiersChildren.bulkCreate(groupModifiersChildren);
  } catch (e) {
    throw new Error(e);
  }
};

export const updateStopList = async (stopList) => {
  if (!stopList.length) {
    return false;
  }

  try {
    return await StopList.bulkCreate(stopList, {
      updateOnDuplicate: [...Object.keys(stopList[0])],
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteStopList = async (revision) => {
  try {
    return await StopList.destroy({
      where: {
        revision: {
          [Op.or]: [
            { [Op.not]: revision }, null],

        },
      },
    });
  } catch (e) {
    throw new Error(e);
  }
};

export const clearStopList = async () => {
  try {
    return await StopList.destroy({
      where: {},
      truncate: true,
    });
  } catch (e) {
    throw new Error(e);
  }
};
export const getApiLogin = async () => {
  const row = await Iiko.findOne({ raw: true });
  return row.apiLogin;
};

export const getOrganizationId = async () => {
  const row = await Iiko.findOne({ raw: true });
  return row.organizationId;
};
