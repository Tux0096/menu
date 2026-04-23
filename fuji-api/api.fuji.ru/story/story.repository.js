import { sequelize } from '../db.js';

import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Stories,
} = models;

export const getStories = async () => Stories.findAll({
  raw: true,
  order: [
    ['sort', 'ASC'],
  ],
});

export const getStory = async (id) => Stories.findOne({
  where: {
    id,
  },
  raw: true,
});

export const createStory = async (story) => Stories.create(story, { raw: true });

export const updateStory = async (story) => {
  console.log(story);
  await Stories.update({
    ...story,
  }, {
    where: {
      id: story.id,
    },
  });
};

export const deleteStory = async (id) => {
  await Stories.destroy({
    where: {
      id,
    },
  });
};
