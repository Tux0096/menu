import dotenv from 'dotenv';
import { getSettingByName } from '../setting/setting.service.js';

dotenv.config();

// eslint-disable-next-line no-unused-vars
const { IIKO_SERVER_URL_V1, IIKO_SERVER_URL_V2 } = process.env;

// здесь будет выбор использовать новый iiko транспорт или iiko BIZ
// IIKO_SERVER_URL_V2 - iiko BIZ
// IIKO_SERVER_URL_V1 - iiko новый транспорт
const IS_NEW_IIKO_TRANSPORT = await getSettingByName('IS_NEW_IIKO_TRANSPORT');
export const IIKO_SERVER_URL = IS_NEW_IIKO_TRANSPORT ? IIKO_SERVER_URL_V1 : IIKO_SERVER_URL_V2;

export const IIKO_CARD_PROGRAM_IDS = [
  'c47abe5e-159f-11ea-80dd-d8d385655247', // bonus
];

export const EXCLUDE_MODS = [
  '8189ba65-ddb8-41da-ac20-b3702f3ab9d6',
];
