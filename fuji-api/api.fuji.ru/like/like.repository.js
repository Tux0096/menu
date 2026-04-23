import { Op } from 'sequelize';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Likes,
} = models;

export const createLike = async (like) => Likes.create(like);

export const deleteLike = async (id) => Likes.destroy({ where: { id } });

export const deleteLikeByUser = async (userId, productId) => Likes
  .destroy({ where: { userId, productId } });

export async function isLikeExisting({ userId, productId }) {
  return Likes.findOne({ where: { userId, productId } });
}

export const getLikesByUserId = (userId) => Likes.findAll({
  where: {
    userId,
    productId: {
      [Op.not]: null,
    },
  },
});

export const deleteAllLikesByUserId = async (userId) => Likes
  .destroy({
    where: { userId },
  });
