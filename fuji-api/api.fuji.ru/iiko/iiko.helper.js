export const getModifiersFromIikoData = (products) => {
  const { modifiers } = products;
  // убираем id, в базе используется modifierId
  const result = modifiers?.map(({
    id: modifierId,
    defaultAmount,
    minAmount,
    maxAmount,
    required,
  }) => ({
    defaultAmount,
    modifierId,
    minAmount,
    maxAmount,
    required,
  }));

  return result || [];
};

export const getGroupModifiersFromIikoData = (products) => products.reduce((acc, p) => {
  if (!p.groupModifiers?.length) {
    return acc;
  }

  p.groupModifiers.forEach((el) => {
    el.parentId = p.id;
  });

  acc = acc.concat(p.groupModifiers);
  return acc;
}, []);

export const getGroupModifiersChildrenFromIikoData = (groupModifiers) => groupModifiers.reduce((acc, current) => {
  if (!current.childModifiers?.length) {
    return acc;
  }

  current.childModifiers.forEach((el) => {
    el.parentId = current.modifierId;
  });

  acc = acc.concat(current.childModifiers);
  return acc;
}, []);

export const normalizeStopList = (stopList = []) => stopList.flatMap((org) => org.items.map((item) => ({
  organizationId: org.organizationId,
  deliveryTerminalId: org.deliveryTerminalId,
  productId: item.productId,
  balance: item.balance,
  terminalGroupId: org.terminalGroupId,
})));

export const isCompanyEmployee = (userCategories) => userCategories.map((uc) => uc.id)
  .includes('4be14fbd-bb2c-42c5-92d0-325e3ae4d4df');

export const convertDateToIikoFormat = (inputDate) => {
  const date = new Date(inputDate);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString()
    .padStart(2, '0');
  const day = date.getDate()
    .toString()
    .padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatDeliveryHistoryDate = (date = Date.now()) => {
  const createdAt = new Date(date);
  const y = createdAt.getFullYear();
  const m = String(createdAt.getMonth() + 1)
    .padStart(2, '0');
  const d = String(createdAt.getDate())
    .padStart(2, '0');

  return `${d}.${m}.${y}`;
};
