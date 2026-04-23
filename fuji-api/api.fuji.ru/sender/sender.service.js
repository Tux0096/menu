import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path, { dirname } from 'path';

import { fileURLToPath } from 'url';

import { formatDateForSending } from '../catalog/catalog.helper.js';
import * as iikoApi from '../iiko/iiko.api.js';
import CLogger from '../lib/CLogger.js';
import * as mailService from '../mail/mail.service.js';
import * as orderService from '../order/order.service.js';
import * as paymentService from '../payment/payment.service.js';
import * as cloudKassirService from '../order/cloudkassir.service.js';

import * as terminalsService from '../terminals/terminals.service.js';
import * as storageService from '../storage/storage.service.js';
import { getStorage } from '../storage/storage.service.js';

import * as telegramApi from '../telegram/telegram.api.js';
import { sendMessageAllTelegramUsers } from '../telegram/telegram.api.js';

import * as senderRepo from './sender.repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const logger = new CLogger();

export const sendMessage = async (order) => {
  await Promise.all([
    sendMessageTelegram(order),
    sendMessageIiko(order),
    // sendMail(order),
  ]);
};

export const buildOrderForSending = async (orderData, isHTML = false) => {
  const order = { ...orderData };

  order.formatDate = formatDateForSending(order.createdAt);

  order.deliveryTypeHTML = order.isSelfService ? 'самовывоз' : 'доставка';

  // TODO: get payments from DB
  order.paymentTypeHTML = {
    SBP: 'СБП при получении',
    ONL: 'банковская карта (online)',
    CARD: 'картой курьеру',
    CASH: 'наличными при получении',
  }[order.paymentType];

  // Получаем список ресторанов и находим нужный
  const restaurantList = await terminalsService.getRestaurantList();
  const rest = restaurantList.find((r) => r.value === order.terminalId);
  order.restaurantName = (rest && rest.text) || 'не определен';

  order.itemsHTML = order.orderProducts.map((i) => {
    const mods = i.orderProductModifiers.map((m) => `[${m.name} - ${m.amount}шт.]`).join(', ');
    return `${i.name} - ${i.amount}шт. ${mods}`;
  }).join(isHTML ? '<br>' : '\n');

  return order;
};

export const sendMessageTelegram = async (order) => {
  try {
    const orderForSending = await buildOrderForSending(order);
    const data = await fs.readFile(path.resolve(__dirname, '../views/telegram.views.hbs'), 'utf8');
    const template = Handlebars.compile(data);
    const message = template({ order: orderForSending });
    const telegramUsers = await senderRepo.getUsersToSend();
    const telegramApiKey = await storageService.getTekegramApiKey();
    await Promise.all(
      telegramUsers
        .map(
          (user) => telegramApi
            .sendMessageTelegram(telegramApiKey, user.telegramChatId, message),
        ),
    );
    await orderService.setIsTelegramSend(order.id, true);
  } catch (e) {
    logger.log(`Проблемы с телегой!! ${e}`);
  }
};

const sendMail = async (order) => {
  try {
    const { orderMail, orderMailCC } = await getStorage();

    const orderForSending = await buildOrderForSending(order, true);
    const data = await fs.readFile(
      path.resolve(__dirname, '..', 'views', 'mail.views.hbs'),
      'utf8',
    );

    const template = Handlebars.compile(data);
    const message = template({ order: orderForSending });
    await mailService
      .sendMail('Новый заказ на сайте Fuji', message, orderMail, orderMailCC, 'html');
  } catch (e) {
    console.log(`Проблемы с телегой${e}`);
  }
};

const getPaymentItems = async (order) => {
  const result = [];
  const paymentType = await paymentService.getPaymentByCode(order.paymentType);

  const paymentItem = {
    sum: order.total,
    paymentType: {
      id: paymentType.id,
    },
    isProcessedExternally: paymentType.isProcessedExternally ?? 0,
  };

  if (order.spendBonus) {
    const paymentTypeBonus = await paymentService.getPaymentByCode('INET');
    const paymentItemBonus = {
      sum: order.spendBonus,
      paymentType: {
        id: paymentTypeBonus.id,
      },
      isProcessedExternally: paymentTypeBonus.isProcessedExternally ?? 0,
      // ! !!!!!!don't touch this.
      // iiko required only format "{\"searchScope\": \"PHONE\", \"credential\": \"+7**********\"}"
      additionalData: '{"searchScope": "PHONE", "credential": "+7**********"}',
    };
    paymentItem.sum -= order.spendBonus;
    result.push(paymentItemBonus);
  }

  result.push(paymentItem);
  return result;
};

export const sendMessageIiko = async (order) => {
  const { user, address, orderProducts } = order;

  const paymentItems = await getPaymentItems(order);

  try {
    let deliveryDateTime = order.createdAt;

    if (order.deliveryDateTime) {
      deliveryDateTime = new Date(order.deliveryDateTime);
      // выставим 5 часов (в Самаре будет 10 (+5))
      // Потому что поварам удобно когда все заказы заранее утром выходят,
      // нежели за час до доставки
      deliveryDateTime.setUTCHours(5);
    }

    const data = {
      id: order.id,
      customer: {
        name: user.name || 'Не задано',
        phone: user.phone,
      },
      coupon: order.coupon,
      order: {
        date: deliveryDateTime,
        personsCount: order.personsCount,
        phone: user.phone,
        isSelfService: order.isSelfService,
        comment: order.comment,

        items: orderProducts.map((p) => {
          const { orderProductModifiers: mods } = p;

          const item = {
            id: p.iikoId,
            name: p.name,
            amount: p.amount,
            code: p.code,
          };

          if (mods?.length) {
            item.modifiers = mods.map((m) => {
              const mod = {
                id: m.iikoId,
                name: m.name,
                amount: m.amount,
                code: p.code,
              };

              if (m.groupId) {
                mod.groupId = m.groupId;
              }

              if (m.groupName) {
                mod.groupName = m.groupName;
              }

              return mod;
            });
          }
          return item;
        }),
        address,
        paymentItems,
      },
    };

    const iikoAnswer = await iikoApi.sendMessageIiko(data);

    // Сохраняем orderId из iiko в таблицу заказов
    if (iikoAnswer?.orderId) {
      try {
        await orderService.setIikoOrderId(order.id, iikoAnswer.orderId);
        logger.log(`Сохранен iikoOrderId ${iikoAnswer.orderId} для заказа ${order.id}`);

        // Автоматическое создание чека CloudKassir только для онлайн платежей
        // if (order.paymentType === 'ONL') {
        if (false) {
          try {
            const orderDataForReceipt = {
              orderId: order.id,
              iikoOrderId: iikoAnswer.orderId,
              total: order.total,
              user: {
                phone: order.user?.phone,
                email: order.user?.email,
                firstName: order.user?.name,
              },
              items: order.orderProducts?.map((product) => ({
                product: {
                  id: product.iikoId,
                  name: product.name,
                  price: product.price,
                },
                quantity: product.amount,
                modifiers: (product.orderProductModifiers || []).map((m) => ({
                  id: m.iikoId,
                  name: m.name,
                  price: m.price,
                  amount: m.amount,
                  groupId: m.groupId,
                  groupName: m.groupName,
                })),
              })) || [],
            };

            const receiptResult = await cloudKassirService
              .createReceiptWithRetry(orderDataForReceipt, 3, 2000);

            logger.log(`Чек CloudKassir создан автоматически для заказа ${order.id}, iikoOrderId: ${iikoAnswer.orderId}, URL: ${receiptResult.url}`);

            // Сохраняем URL чека в базу данных
            try {
              await orderService.setReceiptUrl(order.id, receiptResult.url);
              logger.log(`URL чека сохранен в БД для заказа ${order.id}: ${receiptResult.url}`);
            } catch (saveError) {
              logger.log(`Ошибка сохранения URL чека в БД для заказа ${order.id}: ${saveError.message}`);
            }
          } catch (receiptError) {
            // Ошибка создания чека не должна ломать основной процесс заказа
            logger.log(`Ошибка автоматического создания чека CloudKassir для заказа ${order.id}: ${receiptError.message}`);
          }
        } else {
          logger.log(`Чек CloudKassir не создается для заказа ${order.id} - тип оплаты: ${order.paymentType} (требуется ONL)`);
        }
      } catch (e) {
        logger.log(`Ошибка сохранения iikoOrderId для заказа ${order.id}: ${e.message}`);
      }
    }

    // Сохраняем orderId из iiko в таблицу deliveries для связи с доставкой
    if (iikoAnswer?.orderId && !order.isSelfService) {
      try {
        await orderService.setDeliveryIikoIdByOrderId(order.id, iikoAnswer.orderId);
        logger.log(`Сохранен iikoId ${iikoAnswer.orderId} для заказа ${order.id}`);
      } catch (e) {
        logger.log(`Ошибка сохранения iikoId для заказа ${order.id}: ${e.message}`);
      }
    }

    // TODO: удалить таблицу orderIikoAnswer
    // await orderService.createOrderIikoAnswer(order.id, iikoAnswer);
    logger.orderLog({ orderId: order.id, iikoAnswer });
    await orderService.setIsIikoSend(order.id, true);
  } catch (e) {
    console.dir(e, { depth: null, colors: true });
    let errorDetail = '';
    if (e?.response?.data) {
      errorDetail = JSON.stringify(e?.response?.data, null, 2);
    }

    const message = `Проблема с отправкой заказа в iiko.
    Номер заказа ${order.id}.
    Клиент: ${user.name}.
    Телефон: ${user.phone}.
    Сумма заказа: ${order.total}
    Ошибка: ${e}
    ${errorDetail}`;
    await sendMessageAllTelegramUsers(message);

    // eslint-disable-next-line no-use-before-define
    await sendErrorTelegram(message);
  }
};

export async function sendErrorTelegram(message) {
  // TODO: refactor this
  //  send order errors to another telegram bot
  const telegramApiKey = '1927257770:AAH0oFYdkgpjZxSSmN-Myv0wHu1QlxwgGQY';
  const telegramUsers = await senderRepo.getUsersToSend();
  await Promise.all(
    telegramUsers.map(
      (user) => telegramApi.sendMessageTelegram(telegramApiKey, user.telegramChatId, message),
    ),
  );
}
