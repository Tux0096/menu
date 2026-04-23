import * as fileService from '../file/file.service.js';

import * as slideRepo from './slide.repository.js';
import { getImageURL } from '../lib/helpers.js';

export const getSlides = async () => {
  const slidesData = await slideRepo.getSlides();

  const slidePromises = slidesData.map(async (slide) => {
    const file = await fileService.getFile(slide.fileId);

    return ({
      id: slide.id,
      path: getImageURL(file.path),
      isMobile: slide.isMobile,
      link: slide.link,
      sort: slide.sort,
    });
  });
  return Promise.all(slidePromises);
};

export const getSlidesByType = async (type) => {
  const slidesData = await slideRepo.getSlidesByType(type);
  const slidePromises = slidesData.map(async (slide) => {
    const file = await fileService.getFile(slide.fileId);
    return {
      id: slide.id,
      path: `/${file.path}`,
      isMobile: slide.isMobile,
      link: slide.link,
      sort: slide.sort,
    };
  });
  return Promise.all(slidePromises);
};

export const getSlide = async (id) => await slideRepo.getSlide(id);

export const createSlide = async (slide) => {
  const slideRes = await slideRepo.createSlide(slide);
  const file = await fileService.getFile(slide.fileId);

  return ({
    id: slideRes.id,
    path: getImageURL(file.path),
    isMobile: slideRes.isMobile,
    link: slideRes.link,
    sort: slideRes.sort,
  });
};

export const updateSlides = async (slides = []) => {
  for (const s of slides) {
    const slide = getSlide(s.id);
    const updatingSlide = { ...slide, ...s };
    await slideRepo.updateSlide(updatingSlide);
  }
};

export const deleteSlide = async (id) => {
  const slide = await getSlide(id);
  await slideRepo.deleteSlide(id);
  await fileService.deleteFileData(slide.fileId);
};

export const updateLink = async (id, link) => {
  await slideRepo.updateLink(id, link);
};
