import yup from 'yup';

const createStringMaxValidator = (max, fieldName) => yup.string().nullable().max(max, `Поле '${fieldName}': максимум ${max} символов.`);

export const validateAddress = async (address) => {
  const addressSchema = yup.object({
    home: createStringMaxValidator(10, 'Дом'),
    housing: createStringMaxValidator(10, 'Корпус'),
    apartment: createStringMaxValidator(10, 'Квартира'),
    entrance: createStringMaxValidator(10, 'Подъезд'),
    floor: createStringMaxValidator(10, 'Этаж'),
    doorphone: createStringMaxValidator(10, 'Домофон'),
  });

  await addressSchema.validate(address);
};
