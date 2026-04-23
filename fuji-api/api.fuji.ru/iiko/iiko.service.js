import * as fsPromises from 'fs/promises';
import lodash from 'lodash';

import * as path from 'path';
import { dirname } from 'path';

import { fileURLToPath } from 'url';
import { customSlugify } from '../catalog/catalog.helper.js';

import * as catalogService from '../catalog/catalog.service.js';
import download from '../lib/download.js';

import * as iikoApi from './iiko.api.js';
import * as iikoHelper from './iiko.helper.js';
import * as iikoRepo from './iiko.repository.js';
import { convertDateToIikoFormat } from './iiko.helper.js';

const _filename = fileURLToPath(import.meta.url);
const __dirname = dirname(_filename);

const PATH_DIR_IMAGES = path.resolve(__dirname, '../public/uploads', 'shop', 'full');
const PATH_DIR_OPTIMIZE_IMAGES = path.resolve(__dirname, '../public/uploads', 'shop', 'optimize');

export const updateGroups = async (groups = [], revision = 0) => {
  if (!groups.length) {
    return false;
  }
  const slugs = new Set();

  groups.forEach((g) => {
    g.revision = revision;

    const slugBase = customSlugify(g.name);
    let slug = slugBase;
    let count = 1;

    while (slugs.has(slug)) {
      slug = `${slugBase}_${count}`;
      count += 1;
    }
    slugs.add(slug);
    g.slug = slug;
  });

  try {
    const images = groups.flatMap(({ images, id }) => {
      if (!images) {
        return [];
      }
      return images.map((image) => ({
        ...image,
        ownerId: id,
        revision,
      }));
    });

    await iikoRepo.updateGroups(groups);
    await iikoRepo.updateImages(images);
  } catch (e) {
    throw new Error(e);
  }
  return true;
};

export const deleteOldGroups = async (revision) => await iikoRepo.deleteOldGroups(revision);

export const updateProducts = async (products, revision) => {
  if (!products.length) {
    return false;
  }

  const slugs = new Set();

  products.forEach((item) => {
    item.revision = revision;

    const slugBase = customSlugify(item.name);
    let slug = slugBase;
    let count = 1;

    while (slugs.has(slug)) {
      slug = `${slugBase}_${count}`;
      count += 1;
    }

    slugs.add(slug);
    item.slug = slug;
  });

  await iikoRepo.createOrUpdateProducts(products);

  const modifiers = iikoHelper.getModifiersFromIikoData(products);
  await iikoRepo.updateModifiers(modifiers);

  const groupModifiers = iikoHelper.getGroupModifiersFromIikoData(products);
  await iikoRepo.updateGroupModifiers(groupModifiers);

  const groupModifiersChildren = iikoHelper.getGroupModifiersChildrenFromIikoData(groupModifiers);
  await iikoRepo.updateGroupModifiersChildren(groupModifiersChildren);

  const images = products.flatMap(({ images, id }) => {
    if (!images) {
      return [];
    }

    return images.map((image) => {
      const filename = path.parse(image.imageUrl).name;

      return ({
        ...image,
        ownerId: id,
        revision,
        // fix: из айки картинки приходят с новым ID поэтому нельзя их соотнести по id с базой
        imageId: filename,
      });
    });
  });

  await iikoRepo.updateImages(images);
  return true;
};

export const deleteOldProducts = async (revision) => await iikoRepo.deleteOldProducts(revision);

export const addUploadedImagesPaths = async (paths) => {
  if (!paths.length) {
    return false;
  }

  return await iikoRepo.addUploadedImagesPaths(paths);
};

async function downloadImages(imageDataChunk) {
  const chunkPromises = [];

  for (const i of imageDataChunk) {
    const promise = download(i.imageUrl, i.filePath);
    chunkPromises.push(promise);
  }
  await Promise.allSettled(chunkPromises);
}

async function processImageData(imageDataChunked) {
  for (const imageDataChunk of imageDataChunked) {
    await downloadImages(imageDataChunk);
  }
}
export const uploadImagesFromRemote = async () => {
  try {
    const images = await catalogService.getImagesAll();

    if (!images || images.length === 0) {
      throw new Error('No images to upload.');
    }

    await fsPromises.mkdir(PATH_DIR_IMAGES, { recursive: true });

    const filePathsForDB = [];
    const imageData = [];

    for (const i of images) {
      const arr = i.imageUrl.split('/');
      const name = arr.pop();

      const filePath = path.resolve(PATH_DIR_IMAGES, name);

      filePathsForDB.push({
        imageId: i.imageId,
        fileName: name,
      });

      imageData.push({
        imageUrl: i.imageUrl, filePath,
      });
    }

    const imageDataChunked = lodash.chunk(imageData, 5);
    await processImageData(imageDataChunked);

    await addUploadedImagesPaths(filePathsForDB);
  } catch (e) {
    console.error('Error in uploadImagesFromRemote: ', e.message);
  }
};

export const calculateCheckinResult = async (orderData) => await iikoApi.calculateCheckinResult(
  orderData,
);

export const getOrderInfo = async (orderId, organizationId = null, requestTimeout = 10000) => await iikoApi.getOrderInfo(orderId, organizationId, requestTimeout);

export const checkCreateOrder = async (order) => await iikoApi.checkCreateOrder(order);

export const checkAddress = async (city, street, home) => await iikoApi.checkAddress(city, street, home);

export const deleteOldImages = async (revision) => {
  const deletedImages = await iikoRepo.deleteOldImages(revision);
  await Promise.allSettled(deletedImages.map((image) => {
    const filePath = path.resolve(PATH_DIR_IMAGES, image.fileName);

    return new Promise(async (resolve, reject) => {
      try {
        await fsPromises.unlink(filePath);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }));
};

export const getStopList = async () => await iikoApi.getStopList();

export const updateStopList = async (stopList = [], revision) => {
  if (!stopList.length) {
    return false;
  }

  try {
    const normalizedStopList = iikoHelper.normalizeStopList(stopList);
    normalizedStopList.forEach((el) => el.revision = revision);

    await iikoRepo.updateStopList(normalizedStopList);
  } catch (e) {
    throw new Error(e);
  }
};

export const deleteStopList = async (revision = null) => {
  if (!revision) {
    return false;
  }
  return await iikoRepo.deleteStopList(revision);
};

export const clearStopList = async () => await iikoRepo.clearStopList();

export const getCustomer = async (phone) => await iikoApi.getCustomer(phone);

export const createOrUpdateCustomer = async (customer) => {
  const getGender = (gender) => {
    switch (gender) {
      case 'male': return 1;
      case 'female': return 2;
      default: return 0;
    }
  };
  const normalizedCustomer = {
    ...customer,
    sex: getGender(customer.gender),
  };

  if (customer.birthday) {
    normalizedCustomer.birthday = convertDateToIikoFormat(customer.birthday);
  }
  return iikoApi.createOrUpdate(normalizedCustomer);
};

// iiko transport
export const getApiLogin = () => iikoRepo.getApiLogin();

export const getOrganizationId = () => iikoRepo.getOrganizationId();
