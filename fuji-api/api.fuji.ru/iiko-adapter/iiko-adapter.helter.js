import * as paymentService from '../payment/payment.service.js';
import { getTerminalsAll } from './iiko-adapter.config.js';

const getImageIdFromImagePath = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.length) {
    throw new Error('Invalid image URL');
  }

  const parts = imageUrl.split('/');
  if (parts.length === 0) {
    throw new Error('Invalid image URL');
  }

  const fileName = parts.pop();
  if (!fileName.includes('.')) {
    throw new Error('Invalid image URL');
  }

  const imageId = fileName.split('.')[0];
  if (!imageId.length) {
    throw new Error('Invalid image URL');
  }

  return imageId;
};

export function convertGroups(sourceObj) {
  const targetObj = { ...sourceObj };

  try {
    targetObj.images = sourceObj.imageLinks.map((imageUrl) => ({
      imageId: getImageIdFromImagePath(imageUrl), imageUrl, uploadDate: null,
    }));
  } catch (e) {
    targetObj.images = [];
  }

  targetObj.tags = '';

  return targetObj;
}

export function convertProducts(sourceObj) {
  const {
    imageLinks,
    sizePrices,
    proteinsAmount,
    proteinsFullAmount,
    carbohydratesAmount,
    carbohydratesFullAmount,
    groupModifiers,
    ...rest
  } = sourceObj;

  let images = [];
  try {
    images = imageLinks.map((imageUrl) => ({
      imageId: getImageIdFromImagePath(imageUrl), imageUrl, uploadDate: null,
    }));
  } catch (e) {
    images = [];
  }

  const price = sizePrices[0].price.currentPrice;
  const fiberAmount = proteinsAmount;
  const fiberFullAmount = proteinsFullAmount;
  const carbohydrateAmount = carbohydratesAmount;
  const carbohydrateFullAmount = carbohydratesFullAmount;

  return {
    ...rest,
    images,
    price,
    fiberAmount,
    fiberFullAmount,
    carbohydrateAmount,
    carbohydrateFullAmount,
    groupModifiers: groupModifiers
      .map(({ id: groupModifierId, childModifiers, ...groupModifier }) => {
        const convertedChildModifiers = childModifiers.map(
          ({ id: childModifierId, ...childModifier }) => ({
            ...childModifier, modifierId: childModifierId,
          }),
        );

        return ({
          ...groupModifier, modifierId: groupModifierId, childModifiers: convertedChildModifiers,
        });
      }),
  };
}

export const convertOrder = async (sourceObj) => {
  const payments = await paymentService.getPayments();

  const orderTypeId = sourceObj.order.isSelfService
    ? '5b1508f9-fe5b-d6af-cb8d-043af587d5c2'
    : '76067ea3-356f-eb93-9d14-1fa00d082c4e';

  function formatDateToCustomString(date) {
    const pad = (number, length = 2) => String(number).padStart(length, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const milliseconds = pad(date.getMilliseconds(), 3);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  const result = {
    order: {
      completeBefore: formatDateToCustomString(new Date(sourceObj.order.date)),
      deliveryDate: formatDateToCustomString(new Date(sourceObj.order.date)),
      comment: sourceObj.order.comment,
      orderTypeId,
      customer: {
        name: sourceObj.customer.name, type: 'regular',
      },
      phone: sourceObj.customer.phone,
      guests: {
        count: sourceObj.order.personsCount,
      },

      items: sourceObj.order.items.map((item) => {
        const modifiers = item.modifiers?.map((modifier) => ({
          productId: modifier.id,
          amount: modifier.amount,
          productGroupId: modifier.groupId,

        }));

        const result = {
          productId: item.id,
          type: 'Product',
          amount: item.amount,

        };
        if (modifiers?.length) {
          result.modifiers = modifiers;
        }

        return result;
      }),

      payments: sourceObj.order.paymentItems.map((paymentItem) => {
        const payment = payments.find((p) => p.id === paymentItem.paymentType.id);
        return ({
          paymentTypeKind: payment.paymentTypeKind,
          sum: paymentItem.sum,
          paymentTypeId: paymentItem.paymentType.id,
          isProcessedExternally: paymentItem.isProcessedExternally,
          // paymentAdditionalData: {
          //   credential: sourceObj.customer.name,
          //   searchScope: 'Phone',
          //   type: 'IikoCard',
          // },
        });
      }),
    },

  };
  const { address } = sourceObj.order;

  if (!sourceObj.order.isSelfService && address) {
    const deliveryPoint = {
      address: {
        street: {
          // It's required specify only "classifierId" or "id" or "name" and "city" in request.order.deliveryPoint.address.street
          // classifierId: address.streetClassifierId,
          id: address.streetId,
          // name: address.street,
          // city: address.city,
        },

        house: address.home,
        building: address.housing,
        flat: address.apartment,
        entrance: address.entrance,
        floor: address.floor,
        doorphone: address.doorphone,
      },
    };
    result.order.deliveryPoint = deliveryPoint;
  }

  return result;
};

export const convertStopList = (sourceObject) => {
  const transformedObject = {
    stopList: [],
    unregisteredOrganizations: [],
  };

  if ('correlationId' in sourceObject) {
    transformedObject.correlationId = sourceObject.correlationId;
  }

  if ('terminalGroupStopLists' in sourceObject) {
    const { terminalGroupStopLists } = sourceObject;

    for (const terminalGroup of terminalGroupStopLists) {
      if (!('organizationId' in terminalGroup) || !('items' in terminalGroup)) {
        continue;
      }

      const { organizationId, items } = terminalGroup;

      for (const item of items) {
        if (!('terminalGroupId' in item) || !('items' in item)) {
          continue;
        }

        const { terminalGroupId } = item;
        const stopListItems = item.items;

        // Находим терминал
        const terminal = getTerminalsAll().find(
          (t) => t.terminalGroupId === terminalGroupId
            && t.organizationId === organizationId,
        );

        // СОЗДАЁМ НОВЫЙ stopList для этого терминала
        const stopList = {
          organizationId,
          terminalGroupId,
          deliveryTerminalId: terminal?.terminalId || null,
          items: [],
        };

        for (const stopListItem of stopListItems) {
          if ('productId' in stopListItem && 'balance' in stopListItem) {
            stopList.items.push({
              productId: stopListItem.productId,
              balance: stopListItem.balance,
            });
          }
        }

        // Добавляем отдельный стоп-лист
        transformedObject.stopList.push(stopList);
      }
    }
  }

  return transformedObject;
};

export const convertHistory = (sourceObject) => {
  const allOrders = sourceObject?.ordersByOrganizations
    .flatMap((organization) => organization.orders)
    .filter((order) => order.creationStatus !== 'Error')
    .map((orderWrap) => {
      const { order } = orderWrap;
      const items = order.items?.map((item) => {
        const modifiers = item.modifiers?.map((mod) => ({
          ...mod,
          name: mod.product.name,
          sum: mod.price,
        })) ?? [];

        return {
          ...item,
          id: item.product.id,
          name: item.product.name,
          sum: item.price,
          modifiers,
        };
      });

      return {
        id: orderWrap.id,
        date: order.whenCreated,
        number: order.number,
        status: order.status,
        items,
      };
    });

  return {
    customersDeliveryHistory: [
      {
        deliveryHistory: allOrders || [],
      },
    ],
  };
};

export const convertCustomer = (sourceObject) => ({
  anonymized: sourceObject.anonymized || false,
  birthday: sourceObject.birthday || null,
  cards: sourceObject.cards || [],
  categories: sourceObject.categories || [],
  comment: sourceObject.comment || null,
  consentStatus: sourceObject.consentStatus || 0,
  cultureName: sourceObject.cultureName || 'ru-RU',
  email: sourceObject.email || null,
  id: sourceObject.id,
  iikoCardOrdersSum: 0, // тут не нашел соответствующего поля в исходных данных
  isBlocked: false, // тут не нашел соответствующего поля в исходных данных
  isDeleted: sourceObject.isDeleted || false,
  middleName: sourceObject.middleName || null,
  name: sourceObject.name,
  personalDataConsentFrom: sourceObject.personalDataConsentFrom || null,
  personalDataConsentTo: sourceObject.personalDataConsentTo || null,
  personalDataProcessingFrom: sourceObject.personalDataProcessingFrom || null,
  personalDataProcessingTo: sourceObject.personalDataProcessingTo || null,
  phone: sourceObject.phone,
  rank: null, // тут не нашел соответствующего поля в исходных данных
  referrerId: sourceObject.referrerId || null,
  sex: sourceObject.sex || 0,
  shouldReceiveLoyaltyInfo: sourceObject.shouldReceiveLoyaltyInfo || true,
  shouldReceiveOrderStatusInfo: sourceObject.shouldReceiveOrderStatusInfo || true,
  shouldReceivePromoActionsInfo: sourceObject.shouldReceivePromoActionsInfo || false,
  surname: sourceObject.surname || null,
  userData: sourceObject.userData || null,

  walletBalances: sourceObject.walletBalances?.map((el) => ({
    balance: el.balance,
    wallet: {
      id: el.id,
      name: el.name,
      programType: 'Bonus',
      type: 'Real',
    },
  })),

});
