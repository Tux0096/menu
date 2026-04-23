import axios from 'axios';
import createError from 'http-errors';
import https from 'https';

import * as orderRepo from '../order/order.repository.js';
import { buildOrder } from '../order/order.service.js';
import * as orderService from '../order/order.service.js';
import * as senderService from '../sender/sender.service.js';
import * as paymentService from './payment.service.js';
import * as paymentRepo from './payment.repository.js';
import * as telegramApi from '../telegram/telegram.api.js';

async function callbackCloudPaymentsPay({ InvoiceId }) {
  if (!InvoiceId) {
    throw new Error('Invoice ID is missing in payment data.');
  }
  telegramApi.sendMessageAllTelegramUsers(`Заказ ${InvoiceId} оплачен (CloudPayments).`).then();
  const order = await buildOrder(InvoiceId);
  senderService.sendMessage(order).then();
  await orderService.setStatus(InvoiceId, 'PAYED');
}

async function callbackCloudPaymentsFail({ InvoiceId, Reason }) {
  if (!InvoiceId || !Reason) {
    throw new Error('Either Invoice ID or reason is missing in fail data.');
  }

  const errorMessage = `
Проблема при оплате заказа ${InvoiceId}!
Причина: ${Reason}
  `;
  telegramApi.sendMessageAllTelegramUsers(errorMessage).then();
  await orderService.setStatus(InvoiceId, 'ERROR_PAYMENT');
}

export async function callbackCloudPayments(type, { InvoiceId, ...restData }) {
  if (!InvoiceId) {
    throw createError(400, 'InvoiceId is required');
  }

  switch (type) {
    case 'fail':
      await callbackCloudPaymentsFail({ InvoiceId, ...restData });
      break;
    case 'pay':
      await callbackCloudPaymentsPay({ InvoiceId });
      break;
    case 'check':
      // TODO:  do something if "check" callback
      break;
    default:
      throw createError(400, `Unsupported payment type: ${type}`);
  }
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
export const payOrder = async (orderId) => {
  try {
    const orderModel = await orderRepo.getOrder(orderId);
    const sberbankAuth = await paymentRepo.getSberbankAuth(orderModel.terminalId);

    if (!sberbankAuth) {
      return null;
    }

    // https://securepayments.sberbank.ru/payment/rest/register.do - prod
    // https://3dsec.sberbank.ru/payment/rest/register.do - test
    const { data } = await axios.post(sberbankAuth.registerDoLink, {}, {
      httpsAgent,
      params: {
        userName: sberbankAuth.login,
        password: sberbankAuth.password,
        orderNumber: orderModel.id,
        amount: orderModel.total * 100,
        returnUrl: sberbankAuth.returnUrl,
        failUrl: sberbankAuth.failUrl,
        sessionTimeoutSecs: sberbankAuth.sessionTimeoutSecs,
      },
    });

    if (data.orderId && data.formUrl) {
      const orderSberbank = {
        orderId: orderModel.id, sberbankOrderId: data.orderId, formUrl: data.formUrl,
      };

      await paymentRepo.createOrderSberbank(orderSberbank);
      await orderService.setStatus(orderId, 'WAIT_PAYMENT');
      return { paymentLink: data.formUrl };
    }
    return { paymentLink: sberbankAuth.failUrl };
  } catch (e) {
    console.log(e);
    const errorMessage = `Сбербанк\n${e}`;
    await telegramApi
      .sendMessageAllTelegramUsers(errorMessage);
    return 'https://fuji.ru/complete-error';
  }
};

export const checkOrderPayment = async (orderNumber) => {
  try {
    const orderModel = await orderRepo.getOrder(orderNumber);
    const sberbankAuth = await paymentRepo.getSberbankAuth(orderModel.terminalId);

    if (!sberbankAuth) {
      return null;
    }

    // https://securepayments.sberbank.ru/payment/rest/getOrderStatusExtended.do - prod
    // https://3dsec.sberbank.ru/payment/rest/getOrderStatusExtended.do - test
    const { data } = await axios.get(sberbankAuth.getOrderStatusExtendedDoLink, {
      httpsAgent,
      params: {
        userName: sberbankAuth.login,
        password: sberbankAuth.password,
        orderNumber,

      },
    });

    const errorCode = parseInt(data.errorCode, 10);

    if (!errorCode) {
      const orderId = parseInt(data.orderNumber, 10);
      const orderStatus = parseInt(data.orderStatus, 10);
      const { actionCodeDescription } = data;

      const orderSberbank = {
        orderId,
        errorCode: orderStatus,
        errorMessage: data.errorMessage,
        orderStatus: data.orderStatus,
        actionCode: data.actionCode,
        actionCodeDescription,
      };

      switch (orderStatus) {
        case 0:
          await telegramApi
            .sendMessageAllTelegramUsers(
              `Заказ ${orderId} зарегистрирован, но не оплачен.\n${actionCodeDescription}`,
            );
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        case 1:
          await telegramApi
            .sendMessageAllTelegramUsers(
              `Заказ ${orderId}: предавторизованная сумма удержана (для двухстадийных платежей).`,
            );
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        case 2:
        {
          // сбер иногда шлет повторные калбеки, проверяем если заказ уже в статусе оплачен,
          // то повторно не шлем в айку и телегу
          const paymentData = await paymentService.getPaymentData(orderId);
          if (paymentData?.orderStatus === 2) { return; }

          await telegramApi.sendMessageAllTelegramUsers(`Заказ ${orderId} оплачен.`);
          const order = await buildOrder(orderId);
          senderService.sendMessage(order).then(() => {});
          await orderService.setStatus(orderId, 'PAYED');

          break;
        }

        case 3:
          await telegramApi.sendMessageAllTelegramUsers(`Заказ ${orderId}: авторизация отменена.`);
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        case 4:
          await telegramApi
            .sendMessageAllTelegramUsers(
              `Заказ ${orderId}: по транзакции была проведена операция возврата.`,
            );
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        case 5:
          await telegramApi
            .sendMessageAllTelegramUsers(
              `Заказ ${orderId}: инициирована авторизация через сервер контроля доступа банка-эмитента.`,
            );
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        case 6:
          await telegramApi.sendMessageAllTelegramUsers(
            `Заказ ${orderId}: авторизация отклонена.\n${actionCodeDescription}`,
          );
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
          break;

        default:
          await telegramApi
            .sendMessageAllTelegramUsers(`Заказ ${orderId}: проблема с оплатой заказа`);
          await orderService.setStatus(orderId, 'ERROR_PAYMENT');
      }

      await paymentRepo.updateOrderSberbank(orderSberbank);

      // await orderService.setStatus(orderId, 'COMPLETED');
    } else {
      console.log(data.errorMessage);
    }
  } catch (e) {
    console.log(e);
  }
};

export const callbackSberbank = async (orderNumber) => {
  const message = 'Получено уведомление от банка. Выполняем проверку.';
  await telegramApi.sendMessageAllTelegramUsers(message);

  await checkOrderPayment(orderNumber);
};

export const getPayments = async () => await paymentRepo.getPayments();

export const createPayments = async (payments) => await paymentRepo.createPayments(payments);

export const getPaymentByCode = async (code) => await paymentRepo.getPaymentByCode(code);
export const getPaymentById = async (id) => await paymentRepo.getPaymentById(id);

export const getPaymentData = async (orderId) => await paymentRepo.getPaymentData(orderId);
