import createError from 'http-errors';
import * as likeRepo from './like.repository.js';
import * as CatalogRepo from '../catalog/catalog.repository.js';
import CLogger from '../lib/CLogger.js';

const logger = new CLogger();

export const createLike = async ({ userId, productId }) => {
  const isLikeExisting = await likeRepo.isLikeExisting({ userId, productId });
  if (isLikeExisting) {
    throw createError(409, 'User already liked this product');
  }

  await likeRepo.createLike({ userId, productId });

  const product = await CatalogRepo.getProductById(productId);

  product.likesCount += 1;
  await product.save();
};
export const deleteLike = async (id) => likeRepo.deleteLike(id);

export const deleteLikeByUser = async (userId, productId) => likeRepo
  .deleteLikeByUser(userId, productId);

export const getLikesByUserId = async (userId) => likeRepo.getLikesByUserId(userId);

export const deleteAllLikesByUserId = async (userId) => {
  try {
    return await likeRepo.deleteAllLikesByUserId(userId);
  } catch (error) {
    logger.log(error);
    throw error;
  }
};
