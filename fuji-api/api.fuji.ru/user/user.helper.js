const normalizePhone = (phone) => {
  let normalizedPhone = phone.replace(/[^0-9]/gim, '');
  if (String(normalizedPhone)[0] === '8') {
    normalizedPhone = `7${normalizedPhone.slice(1)}`;
  }
  return `+${normalizedPhone}`;
};

const reformatDate = (date) => {
  const [d, m, y] = date.split('.');
  return `${y}-${m}-${d}`;
};

export {
  normalizePhone,
  reformatDate,
};
