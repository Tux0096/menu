import { sequelize } from '../db.js';

import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  Slides,
} = models;

export const getSlides = async () => {
  try {
    return await Slides.findAll({
      raw: true,
      order: [
        ['sort', 'ASC'],
      ],
    });
  } catch (e) {
    throw e;
  }
};

export const getSlidesByType = async (type) => await Slides.findAll({
  raw: true,
  where: { type },
  order: [
    ['sort', 'ASC'],
  ],
});

export const getSlide = async (id) => {
  try {
    return await Slides.findOne({
      where: {
        id,
      },
      raw: true,
    });
  } catch (e) {
    throw e;
  }
};

export const createSlide = async (slide) => Slides.create(slide, { raw: true });

export const updateSlide = async (slide) => {
  try {
    await Slides.update({
      ...slide,
    }, {
      where: {
        id: slide.id,
      },
    });
  } catch (e) {
    throw e;
  }
};

export const deleteSlide = async (id) => {
  await Slides.destroy({
    where: {
      id,
    },
  });
};

export const updateLink = async (id, link) => {
  await Slides.update({
    link,
  }, {
    where: {
      id,
    },
  });
};
