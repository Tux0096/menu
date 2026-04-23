import moment from 'moment';

export function formatLastMessageSentAt(lastMessageSentAt) {
  if (!lastMessageSentAt) {
    return 'Не отправлялось';
  }

  const lastMessageDate = moment(lastMessageSentAt);
  const today = moment();
  const daysSinceLastMessage = today.diff(lastMessageDate, 'days');

  return `${lastMessageDate.format('DD.MM.YYYY')} (${daysSinceLastMessage} дн.)`;
}

export function formatBirthday(birthday) {
  if (!birthday) {
    return 'Неизвестно';
  }

  const today = moment();
  const birthdayThisYear = moment(birthday).year(today.year());

  if (birthdayThisYear.isBefore(today, 'day')) {
    birthdayThisYear.add(1, 'year');
  }

  const daysUntilBirthday = birthdayThisYear.diff(today, 'days');

  return `${moment(birthday).format('DD.MM.YYYY')} (${daysUntilBirthday} дн.)`;
}

export function formatLastOrderDate(lastOrderDate) {
  if (!lastOrderDate) return 'Дата заказа неизвестна';

  const orderDate = moment(lastOrderDate);
  const today = moment();
  const daysSinceOrder = today.diff(orderDate, 'days');

  return `${orderDate.format('DD.MM.YYYY')} (${daysSinceOrder} дн.)`;
}
