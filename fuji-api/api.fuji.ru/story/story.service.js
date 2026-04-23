import * as fileService from '../file/file.service.js';

import * as storyRepo from './story.repository.js';
import { getImageURL, getVideoURL } from '../lib/helpers.js';

export const getStories = async () => {
  const slidesData = await storyRepo.getStories();

  const storyPromises = slidesData.map(async (slide) => {
    const file = await fileService.getFile(slide.fileId);

    return ({
      id: slide.id,
      src: slide.type === 'video' ? getVideoURL(file.path) : getImageURL(file.path),
      sort: slide.sort,
      link: slide.link,
      type: slide.type,
      linkTitle: slide.linkTitle,
      isMobile: slide.isMobile,
    });
  });
  return Promise.all(storyPromises);
};

export const getStory = async (id) => storyRepo.getStory(id);

export const createStory = async (story) => {
  const slideRes = await storyRepo.createStory(story);
  const file = await fileService.getFile(story.fileId);

  return ({
    id: slideRes.id,
    src: getImageURL(file.path),
    sort: slideRes.sort,
    link: slideRes.link,
    type: slideRes.type,
    linkTitle: slideRes.linkTitle,
    isMobile: slideRes.isMobile,
  });
};

export const updateStory = async (id, story) => {
  const storyModel = await getStory(id);
  const updatingStore = { ...storyModel, ...story };
  await storyRepo.updateStory(updatingStore);
};

export const updateStories = async (stories = []) => {
  for (const s of stories) {
    // const slide = await getSlide(s.id);
    // const updatingStore = { ...slide, ...s };
    // await storyRepo.updateStory(updatingStore);
    await updateStory(s.id, s);
  }
};

export const deleteStory = async (id) => {
  const slide = await getStories(id);
  await storyRepo.deleteStory(id);
  await fileService.deleteFileData(slide.fileId);
};
