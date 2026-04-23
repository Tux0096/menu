import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

const models = initModels(sequelize);
const { Options } = models;

export const getStorage = async () => {
  try {
    return await Options.findOne({ raw: true });
  } catch (e) {
    throw e;
  }
};

export const getOrganizationId = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['iiko_organization_id'],
      raw: true,
    });

    if (!res) {
      return null;
    }

    return res.iiko_organization_id;
  } catch (e) {
    throw e;
  }
};

export const getLogin = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['iiko_login'],
      raw: true,
    });

    if (!res) {
      return null;
    }

    return res.iiko_login;
  } catch (e) {
    throw e;
  }
};

export const getPassword = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['iiko_password'],
      raw: true,
    });

    if (!res) {
      return null;
    }

    return res.iiko_password;
  } catch (e) {
    throw e;
  }
};

export const getRevision = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['iikoRevision'],
    });
    return res.iikoRevision;
  } catch (e) {
    throw e;
  }
};

export const getIsNeedCladrUpdate = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['isNeedCladrUpdate'],
    });
    return res.isNeedCladrUpdate;
  } catch (e) {
    throw e;
  }
};

export const getTekegramApiKey = async () => {
  try {
    const res = await Options.findOne({
      attributes: ['tekegramApiKey'],
    });
    return res.tekegramApiKey;
  } catch (e) {
    throw e;
  }
};

export const updateRevision = async (revision) => {
  console.log(revision);
  try {
    const option = await Options.findOne();
    option.iikoRevision = revision;
    return await option.save();
  } catch (e) {
    throw e;
  }
};

export const setIsNeedCladrUpdate = async (isNeedCladrUpdate) => {
  try {
    const option = await Options.findOne();
    option.isNeedCladrUpdate = isNeedCladrUpdate;
    return await option.save();
  } catch (e) {
    throw e;
  }
};
