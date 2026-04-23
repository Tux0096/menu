import axios from 'axios';

import { IIKO_SERVER_URL } from '../config/common.js';

import * as storageRepo from './storage.repository.js';

export const getStorage = async () => {
  try {
    return await storageRepo.getStorage();
  } catch (e) {
    throw e;
  }
};

export const getOrganizationId = async () => storageRepo.getOrganizationId();

export const getLogin = async () => storageRepo.getLogin();

export const getPassword = async () => storageRepo.getPassword();

export const getToken = async () => {
  const userLogin = await getLogin();
  const userPassword = await getPassword();

  if (userLogin && userPassword) {
    const token = await axios.get(`${IIKO_SERVER_URL}/api/0/auth/access_token`, {
      params: {
        user_id: userLogin,
        user_secret: userPassword,
      },
    });
    return token.data;
  }
};

export const getRevision = async () => await storageRepo.getRevision();

export const getIsNeedCladrUpdate = async () => await storageRepo.getIsNeedCladrUpdate();

export const getTekegramApiKey = async () => await storageRepo.getTekegramApiKey();

export const setRevision = async (revision) => await storageRepo.updateRevision(revision);

export const setIsNeedCladrUpdate = async (isNeedCladrUpdate) => await storageRepo
  .setIsNeedCladrUpdate(isNeedCladrUpdate);
