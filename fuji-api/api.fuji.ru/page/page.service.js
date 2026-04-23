import deliverySamara from './content/delivery/samara.js';
import deliveryNovokujbyshevsk from './content/delivery/novokujbyshevsk.js';
import deliveryTolyatty from './content/delivery/tolyatty.js';

import restSamara from './content/rest/samara.js';
import restNovokujbyshevsk from './content/rest/novokujbyshevsk.js';
import restTolyatty from './content/rest/tolyatty.js';

import legal from './content/legal/index.js';
import rule from './content/rule/index.js';
import oferta from './content/oferta/index.js';
import ofertaApp1 from './content/oferta/app-1.js';

import loyaltyProgram from './content/loyalty-program/index.js';
import loyaltyProgramApp1 from './content/loyalty-program/app-1.js';

import about from './content/about/index.js';
import vacancies from './content/vacancies/index.js';
import promo from './content/promo/index.js';
import userAgreement from './content/user-agreement/index.js';
import pushNotificationsRules from './content/push-notifications-rules/index.js';
import receiveAdvertisingInformation from './content/receive-advertising-information/index.js';
import happyHours from './content/happy-hours/index.js';
import { getSettings } from '../setting/setting.service.js';

const { NOVOKUJBYSHEVSK_ID, SAMARA_ID, TOLYATTI_ID } = await getSettings('samara');

// TODO: со временем перенести в базу все станицы и админку для их редактирования сделать
const pages = {
  delivery: {
    [SAMARA_ID]: deliverySamara,
    [NOVOKUJBYSHEVSK_ID]: deliveryNovokujbyshevsk,
    [TOLYATTI_ID]: deliveryTolyatty,
  },
  restaurant: {
    [SAMARA_ID]: restSamara,
    [NOVOKUJBYSHEVSK_ID]: restNovokujbyshevsk,
    [TOLYATTI_ID]: restTolyatty,
  },
  legal: {
    [SAMARA_ID]: legal,
    [NOVOKUJBYSHEVSK_ID]: legal,
    [TOLYATTI_ID]: legal,
  },
  rule: {
    [SAMARA_ID]: rule,
    [NOVOKUJBYSHEVSK_ID]: rule,
    [TOLYATTI_ID]: rule,
  },
  oferta: {
    [SAMARA_ID]: oferta,
    [NOVOKUJBYSHEVSK_ID]: oferta,
    [TOLYATTI_ID]: oferta,
  },
  'oferta-app-1': {
    [SAMARA_ID]: ofertaApp1,
    [NOVOKUJBYSHEVSK_ID]: ofertaApp1,
    [TOLYATTI_ID]: ofertaApp1,
  },

  'loyalty-program': {
    [SAMARA_ID]: loyaltyProgram,
    [NOVOKUJBYSHEVSK_ID]: loyaltyProgram,
    [TOLYATTI_ID]: loyaltyProgram,
  },
  'loyalty-program-app-1': {
    [SAMARA_ID]: loyaltyProgramApp1,
    [NOVOKUJBYSHEVSK_ID]: loyaltyProgramApp1,
    [TOLYATTI_ID]: loyaltyProgramApp1,
  },

  about: {
    [SAMARA_ID]: about,
    [NOVOKUJBYSHEVSK_ID]: about,
    [TOLYATTI_ID]: about,
  },
  vacancies: {
    [SAMARA_ID]: vacancies,
    [NOVOKUJBYSHEVSK_ID]: vacancies,
    [TOLYATTI_ID]: vacancies,
  },
  promo: {
    [SAMARA_ID]: promo,
    [NOVOKUJBYSHEVSK_ID]: promo,
    [TOLYATTI_ID]: promo,
  },
  'user-agreement': {
    [SAMARA_ID]: userAgreement,
    [NOVOKUJBYSHEVSK_ID]: userAgreement,
    [TOLYATTI_ID]: userAgreement,
  },
  'push-notifications-rules': {
    [SAMARA_ID]: pushNotificationsRules,
    [NOVOKUJBYSHEVSK_ID]: pushNotificationsRules,
    [TOLYATTI_ID]: pushNotificationsRules,
  },
  'receive-advertising-information': {
    [SAMARA_ID]: receiveAdvertisingInformation,
    [NOVOKUJBYSHEVSK_ID]: receiveAdvertisingInformation,
    [TOLYATTI_ID]: receiveAdvertisingInformation,
  },
  'happy-hours': {
    [SAMARA_ID]: happyHours,
    [NOVOKUJBYSHEVSK_ID]: happyHours,
    [TOLYATTI_ID]: happyHours,
  },
};
export const getPage = async (slug, cityId = SAMARA_ID) => pages[slug][cityId];
