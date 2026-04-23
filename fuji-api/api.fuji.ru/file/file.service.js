import fs from 'fs';
import path from 'path';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import appRoot from 'app-root-path';
import { pipeline } from 'stream';
import env from '../env.js';
import * as fileRepo from './file.repository.js';

const pump = util.promisify(pipeline);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ

const ALLOWED_IMAGE_TYPES = [
  'image/webp',
  'image/svg+xml',
  'image/png',
  'image/jpeg',
];

const isImage = (mimetype) => ALLOWED_IMAGE_TYPES.includes(mimetype);

export const saveFileData = async (fileData) => {
  if (!fileData?.file || !fileData?.filename || !fileData?.mimetype) {
    throw new Error('Invalid file data');
  }

  const isImageFile = isImage(fileData.mimetype);

  if (fileData.mimetype.startsWith('image/') && !isImageFile) {
    throw new Error('Unsupported image format. Allowed formats: WebP, SVG, PNG, JPEG');
  }

  const storageDir = path.resolve(appRoot.path, 'public/uploads/storage/');
  await fs.promises.mkdir(storageDir, { recursive: true });

  const ext = path.extname(fileData.filename).toLowerCase();
  const safeExt = ext.length <= 5 ? ext : ''; // защита от странных расширений
  const fileName = `${uuidv4()}${safeExt}`;
  const filePath = path.resolve(storageDir, fileName);

  try {
    await pump(fileData.file, fs.createWriteStream(filePath));

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;

    // if (fileSize > MAX_FILE_SIZE) {
    //   await fs.promises.unlink(filePath);
    //   throw new Error(`Размер файла превышает допустимый лимит ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
    // }

    const relativePath = `uploads/storage/${fileName}`;
    const publicUrl = `${env.API_FULL_URL}/${relativePath}`;

    const savedFile = await fileRepo.saveFileData({
      originalName: fileData.filename,
      fileName,
      path: relativePath,
      mimeType: fileData.mimetype,
      size: fileSize,
    });

    return {
      id: savedFile.id,
      name: savedFile.originalName,
      url: publicUrl,
      mimeType: savedFile.mimeType || fileData.mimetype,
      size: savedFile.size || fileSize,
      createdAt: savedFile.createdAt,
    };
  } catch (err) {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    throw new Error(`Ошибка при сохранении файла: ${err.message}`);
  }
};

export const deleteFileData = async (id) => await fileRepo.deleteFileData(id);

export const getFile = async (id) => {
  const fileData = await fileRepo.getFile(id);

  const url = `/${fileData.path}`;
  return {
    ...fileData,
    url,

  };
};
export const getFileByOriginalName = async (originalName) => await fileRepo.getFileByOriginalName(originalName);

export const getMenuFile = async (fileName) => {
  const fileData = await getFileByOriginalName(fileName);
  if (!fileData) {
    throw new Error('Файл не найден');
  }
  const fullFilePath = path.resolve(appRoot.path, 'public', fileData.path);
  if (!fs.existsSync(fullFilePath)) {
    throw new Error('Файл не найден');
  }
  return fs.createReadStream(fullFilePath);
};

export const deleteFile = async (id) => {
  try {
    const fileData = await getFile(id);
    if (!fileData) {
      return false;
    }

    const deletingResult = await fileRepo.deleteFile(id);
    if (deletingResult) {
      const fullFilePath = path.resolve(appRoot.path, 'public', fileData.path);

      if (fs.existsSync(fullFilePath)) {
        try {
          await fs.promises.unlink(fullFilePath);
          return true;
        } catch (fsError) {
          console.error('Ошибка при удалении файла с диска:', fsError);
          throw new Error('Ошибка при удалении файла с диска');
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
    throw new Error('Ошибка при удалении файла');
  }
};
