import { checkCaptcha } from '../lib/helpers.js';
import * as mailService from '../mail/mail.service.js';
import { getStorage } from '../storage/storage.service.js';

export const sendCallback = async (data) => {
  try {
    const { formMail, formMailCC } = await getStorage();

    const message = `Имя: ${data.name}\nТелефон: ${data.phone}`;
    await mailService.sendMail(
      'На сайте заполнена форма заказать звонок.',
      message,
      formMail,
      formMailCC,
    );
  } catch (e) {
    console.log(e);
  }
};

export const sendReview = async (data) => {
  try {
    // const { formMail, formMailCC } = await getStorage();

    const formMail = [
      'avvoronyuk@mail.ru',
      'mma7373@mail.ru',
      'a.n.nt@mail.ru',
      'hodikina81@mail.ru',
      'ane4ka0108@mail.ru',
      'garila2206@yandex.ru',
      'osnovopashina@mail.ru',
      'ksushavasilyeva123@mail.ru',
      'guestform@mail.ru',
      't_gunova@mail.ru',
      'nadja-urusova@mail.ru',
      'jeka-tag@mail.ru',
      'zgamov@yandex.ru',
      'beglikova91@mail.ru',
      'katenka228@mail.ru',
      'vostryakov.albert@mail.ru',
      'salexov89@inbox.ru',
      'mitia.92@inbox.ru',
    ];

    const {
      restaurant, clear, service, quality, comment, recommended, fio, phone, email,
    } = data;

    const message = `
    Ресторан: ${restaurant}
      Чистота заведения: ${clear}
      Уровень обслуживания:${service}
      Качество блюд и напитков: ${quality}
      Комментарий: ${comment}
      Порекомендуете нас своим друзьям?: ${recommended ? 'Да' : 'Нет'}
      ФИО:${fio}
      Телефон: ${phone}
      Email: ${email}
    `;

    await mailService.sendMail('На сайте добавлен отзыв.', message, formMail);
  } catch (e) {
    console.log(e);
  }
};

export const sendVacancy = async (data, token) => {
  try {
    const { formMail, formMailCC } = await getStorage();
    const message = `
          Вакансия: ${data.vacancies},
          ФИО: ${data.fio},
          Телефон: ${data.phone}   
      `;

    await mailService.sendMail('На сайте заполнена форма вакансии.', message, formMail, formMailCC);
    return true;
  } catch (e) {
    console.log(e);
  }
};
