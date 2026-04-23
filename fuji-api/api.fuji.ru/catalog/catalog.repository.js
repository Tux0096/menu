import { Op } from 'sequelize';

import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Groups,
  Products,
  StopList,
  ShopImages,
  ProductModifiers,
  ProductGroupModifiers,
  ProductGroupModifiersChildren,
} = models;

export const getGroupsAll = async () => Groups.findAll({
  attributes: [
    'name',
    'slug',
    'id',
    'parentGroup',
    'isIncludedInMenu',
    'order',
    'additionalInfo',
    'isGroupModifier',
    [sequelize.fn('MAX', sequelize.col('ShopImages.fileName')), 'image'],
  ],
  where: { isDeleted: false },
  include: [{
    model: ShopImages,
    as: 'ShopImages',
    attributes: [],
    required: false,
    where: {
      ownerId: {
        [Op.col]: 'Groups.id',
      },
    },
  }],
  group: ['Groups.id', 'Groups.name', 'Groups.slug', 'Groups.parentGroup',
    'Groups.isIncludedInMenu', 'Groups.order', 'Groups.additionalInfo',
    'Groups.isGroupModifier'],
  raw: true,
});

export const getProductsAll = async (isAdmin = false) => {
  try {
    return Products.findAll({
      attributes: [
        'id', 'description', 'name', 'slug', 'likesCount',
        'code', 'parentGroup', 'price', 'weight', 'order',
        'energyAmount', 'fiberAmount', 'fatAmount', 'carbohydrateAmount',
        'additionalInfo', 'isPublished', 'isIncludedInMenu', 'customImageId', 'createdAt',
        [sequelize.fn('MAX', sequelize.col('ShopImages.fileName')), 'image'],
      ],
      where: isAdmin ? { isDeleted: false } : { isPublished: true, isDeleted: false },
      include: [
        {
          model: ShopImages,
          as: 'ShopImages',
          attributes: [],
          required: false,
          where: {
            ownerId: {
              [Op.col]: 'Products.id',
            },
          },
        }],
      group: [
        'Products.id', 'Products.description', 'Products.name', 'Products.slug',
        'Products.likesCount', 'Products.code', 'Products.parentGroup',
        'Products.price', 'Products.weight', 'Products.order',
        'Products.energyAmount', 'Products.fiberAmount', 'Products.fatAmount',
        'Products.carbohydrateAmount', 'Products.additionalInfo',
        'Products.isPublished', 'Products.isIncludedInMenu', 'Products.customImageId', 'Products.createdAt'],
      raw: true,
    });
  } catch (e) {
    return console.log(e);
  }
};

export const getModifiersAll = async () => ProductModifiers
  .findAll({
    raw: true,
  });

export const getProductBySlug = async (slug) => Products
  .findOne({ where: { slug, isDeleted: false } });

export const getProductById = async (id) => Products.findOne({
  where: { id, isDeleted: false },
  raw: true,
});

export const getProductByCode = async (code) => Products
  .findOne({ where: { code, isDeleted: false } });

export const getProductImage = async (productId) => {
  const image = await ShopImages.findOne({
    attributes: ['fileName'],
    where: { ownerId: productId },
    raw: true,
  });
  return image.fileName;
};
export const getGroupModifiers = async (excludeMods) => ProductGroupModifiers
  .findAll({
    raw: true,
    where: {
      modifierId: { [Op.notIn]: excludeMods },
    },
  });

export const getGroupModifiersChildren = async () => ProductGroupModifiersChildren
  .findAll({
    raw: true, nest: true,
  });

export const getImagesAll = async () => ShopImages
  .findAll({
    raw: true,
  });

export const likeProduct = async (id) => {
  await Products.increment('likes', { by: 1, where: { id } });
};

export const getStopList = async () => StopList
  .findAll({
    raw: true,
  });

export async function getCategoryIdByProductId(id) {
  const product = await Products.findOne({ where: { id, isDeleted: false }, raw: true });
  return product?.parentGroup;
}

export const getGroupById = async (id) => {
  try {
    return await Groups.findOne({
      attributes: ['id', 'name', 'description', 'slug'],
      where: { id, isDeleted: false },
      raw: true,
    });
  } catch (error) {
    console.error('Error getting group by id:', error);
    return null;
  }
};

export const updateProduct = async (productId, updateData) => {
  try {
    await Products.update(updateData, {
      where: { id: productId },
    });

    // Возвращаем обновленный товар
    return await getProductById(productId);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const getDeliveryProducts = async () => {
  try {
    const products = await Products.findAll({
      attributes: [
        'id', 'name', 'code', 'price', 'additionalInfo',
      ],
      where: {
        isPublished: true,
        isDeleted: false,
      },
      raw: true,
    });

    // Фильтруем товары с isDelivery: true в additionalInfo
    const deliveryProducts = products.filter((product) => {
      if (!product.additionalInfo) return false;

      try {
        const additionalInfo = JSON.parse(product.additionalInfo);
        return additionalInfo?.isDelivery === true;
      } catch (e) {
        return false;
      }
    });

    return deliveryProducts;
  } catch (e) {
    console.error('Error getting delivery products:', e);
    return [];
  }
};
