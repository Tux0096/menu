import { col, literal } from 'sequelize';
import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';
import CustomError from '../errors/CustomError.js';

const models = initModels(sequelize);
const {
  Promocodes,
  Files,
  Customers,
  Orders,
  PromocodeUserSegments,
} = models;

export const getPromocodes = () => Promocodes.findAll({
  order: [['id', 'DESC']],
  include: [
    { model: Files, as: 'listBanner' },
    { model: Files, as: 'cardBanner' },
  ],
});

export const getPromocode = (id) => Promocodes.findByPk(id, {
  include: [
    { model: Files, as: 'listBanner' },
    { model: Files, as: 'cardBanner' },
  ],
});

export const addPromocode = async (data) => {
  const [promocode, created] = await Promocodes.findOrCreate({
    where: { coupon: data.coupon },
    defaults: data,
  });

  if (!created) {
    throw new CustomError({
      message: `Промокод '${promocode.coupon}' уже существует `,
      code: 'PROMO_IS_EXISTS',
      statusCode: 409,
    });
  }

  return promocode.get({ plain: true });
};

export const updatePromocode = async (id, data) => {
  await Promocodes.update(data, { where: { id } });
  return getPromocode(id);
};

export const deletePromocode = (id) => Promocodes.destroy({ where: { id } });

export const updatePromoBanner = async (id, type, bannerId) => {
  const updateData = {};
  if (type === 'list') {
    updateData.listBannerId = bannerId;
  } else if (type === 'card') {
    updateData.cardBannerId = bannerId;
  }

  await Promocodes.update(updateData, { where: { id } });
  return getPromocode(id);
};

export const removePromoBanner = async (id, type) => {
  const updateData = {};
  if (type === 'list') {
    updateData.listBannerId = null;
  } else if (type === 'card') {
    updateData.cardBannerId = null;
  }

  await Promocodes.update(updateData, { where: { id } });
  return getPromocode(id);
};

export const getCustomers = async (processedQueryData) => {
  const { filter } = processedQueryData;

  // Ограничиваем период (оптимизация запроса)
  const periodMonths = 12;
  const periodCondition = `AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ${periodMonths} MONTH)`;

  // Проверяем, нужно ли вытаскивать список продуктов
  const includeOrderedProducts = filter?.orderedProducts !== undefined
          && filter?.orderedProducts !== 'none'
          && filter?.orderedProducts.trim() !== '';

  const query = `
      SELECT
          c.id AS customerId,
          c.name AS fullName,
          c.birthday,
          agg.lastStatus AS orderStatus,
          agg.lastZoneId AS lastOrderTerminalId,
          agg.lastIsSelfService AS isSelfService,
          agg.orderCount,
          agg.lastOrderDate,
          agg.averageCheck
              ${includeOrderedProducts ? ', agg.orderedProducts' : ''}
      FROM customers c
               LEFT JOIN (
          SELECT
              o.userId,
              COUNT(*) AS orderCount,
              MAX(o.createdAt) AS lastOrderDate,
              ROUND(AVG(o.total), 2) AS averageCheck,
              SUBSTRING_INDEX(GROUP_CONCAT(o.status ORDER BY o.createdAt DESC), ',', 1) AS lastStatus,
              SUBSTRING_INDEX(GROUP_CONCAT(o.zoneId ORDER BY o.createdAt DESC), ',', 1) AS lastZoneId,
              SUBSTRING_INDEX(GROUP_CONCAT(o.isSelfService ORDER BY o.createdAt DESC), ',', 1) AS lastIsSelfService
              ${includeOrderedProducts ? ', GROUP_CONCAT(DISTINCT op.iikoId ORDER BY op.iikoId ASC SEPARATOR ",") AS orderedProducts' : ''}
          FROM orders o
              ${includeOrderedProducts ? 'LEFT JOIN orderProducts op ON op.orderId = o.id' : ''}
          WHERE 1=1 ${periodCondition}
          GROUP BY o.userId
      ) AS agg ON agg.userId = c.id
      ORDER BY c.id;
  `;

  const customers = await sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  return customers;
};

// Методы для работы с сегментами пользователей
export const savePromocodeUserSegment = async (promocodeId, userId) => {
  const [segment, created] = await PromocodeUserSegments.findOrCreate({
    where: { promocodeId, userId },
    defaults: { promocodeId, userId },
  });

  return segment;
};

export const removePromocodeUserSegments = async (promocodeId) => PromocodeUserSegments.destroy({
  where: { promocodeId },
});

export const getPromocodeUserSegments = async (promocodeId) => PromocodeUserSegments.findAll({
  where: { promocodeId },
  include: [
    {
      model: Customers,
      as: 'customer',
      attributes: ['id', 'name', 'phone', 'birthday'],
    },
  ],
});

export const checkUserInSegment = async (promocodeId, userId) => {
  if (!promocodeId || !userId) {
    console.error(`Ошибка при проверке сегмента: отсутствует promocodeId (${promocodeId}) или userId (${userId})`);
    return false;
  }

  // Проверяем наличие записи в таблице promocode_user_segments и активность промокода
  // Оптимизированный запрос с использованием EXISTS вместо JOIN
  const query = `
    SELECT 1 
    FROM promocode_user_segments pus
    WHERE pus.promocodeId = :promocodeId 
    AND pus.userId = :userId
    AND EXISTS (
      SELECT 1 FROM promocodes p 
      WHERE p.id = pus.promocodeId
      AND p.active = 1
      AND (p.dateFrom IS NULL OR p.dateFrom <= CURRENT_TIMESTAMP)
      AND (p.dateTo IS NULL OR p.dateTo >= CURRENT_TIMESTAMP)
    )
    LIMIT 1
  `;

  try {
    const result = await sequelize.query(query, {
      replacements: { promocodeId, userId },
      type: sequelize.QueryTypes.SELECT,
      raw: true,
    });

    const isInSegment = result.length > 0;

    // Если пользователь не в сегменте, выполняем дополнительную проверку для диагностики
    if (!isInSegment) {
      // Проверяем, есть ли запись в таблице вообще, без учета активности промокода
      const checkSegmentQuery = `
        SELECT COUNT(*) as count
        FROM promocode_user_segments
        WHERE promocodeId = :promocodeId AND userId = :userId
      `;

      const [segmentCheck] = await sequelize.query(checkSegmentQuery, {
        replacements: { promocodeId, userId },
        type: sequelize.QueryTypes.SELECT,
        raw: true,
      });

      // Проверяем активность промокода
      const checkPromoQuery = `
        SELECT active, 
               dateFrom, 
               dateTo, 
               (dateFrom IS NULL OR dateFrom <= CURRENT_TIMESTAMP) as dateFromValid,
               (dateTo IS NULL OR dateTo >= CURRENT_TIMESTAMP) as dateToValid
        FROM promocodes
        WHERE id = :promocodeId
      `;

      const [promoCheck] = await sequelize.query(checkPromoQuery, {
        replacements: { promocodeId },
        type: sequelize.QueryTypes.SELECT,
        raw: true,
      });
    }

    return isInSegment;
  } catch (error) {
    console.error(`Ошибка при проверке сегмента для пользователя ${userId} и промокода ${promocodeId}:`, error);
    throw error;
  }
};

export const getUserAvailablePromocodes = async (userId) => {
  // Получаем все промокоды, доступные конкретному пользователю
  // Модифицированный запрос: возвращаем полные данные о баннерах
  const query = `
    SELECT 
      p.*,
      fl.id as list_banner_id, 
      fl.originalName as list_banner_original_name,
      fl.fileName as list_banner_file_name,
      fl.path as list_banner_path,
      fl.createdAt as list_banner_created_at,
      fl.updatedAt as list_banner_updated_at,
      fc.id as card_banner_id,
      fc.originalName as card_banner_original_name,
      fc.fileName as card_banner_file_name,
      fc.path as card_banner_path,
      fc.createdAt as card_banner_created_at,
      fc.updatedAt as card_banner_updated_at
    FROM (
      SELECT DISTINCT promocodes.*
      FROM promocodes
      INNER JOIN promocode_user_segments pus ON pus.promocodeId = promocodes.id
      WHERE pus.userId = :userId
      AND promocodes.active = 1
      AND (promocodes.dateFrom IS NULL OR promocodes.dateFrom <= CURRENT_TIMESTAMP)
      AND (promocodes.dateTo IS NULL OR promocodes.dateTo >= CURRENT_TIMESTAMP)
    ) p
    LEFT JOIN files fl ON p.listBannerId = fl.id
    LEFT JOIN files fc ON p.cardBannerId = fc.id
    ORDER BY p.id DESC
  `;

  const result = await sequelize.query(query, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  // Преобразуем результат, чтобы он соответствовал формату админки
  return result.map((item) => {
    // Создаем объект промокода
    const promocode = {
      id: item.id,
      active: item.active,
      coupon: item.coupon,
      fullPrice: item.fullPrice,
      code: item.code,
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      times: item.times,
      hasProduct: item.hasProduct,
      title: item.title,
      description: item.description,
      isForSegment: item.isForSegment,
      segmentFilter: item.segmentFilter,
      hasTimeRestriction: item.hasTimeRestriction,
      timeFrom: item.timeFrom,
      timeTo: item.timeTo,
      listBannerId: item.listBannerId,
      cardBannerId: item.cardBannerId,
    };

    // Если есть баннер для списка
    if (item.list_banner_id) {
      promocode.listBanner = {
        id: item.list_banner_id,
        originalName: item.list_banner_original_name,
        fileName: item.list_banner_file_name,
        path: item.list_banner_path,
        createdAt: item.list_banner_created_at,
        updatedAt: item.list_banner_updated_at,
      };
    } else {
      promocode.listBanner = null;
    }

    // Если есть баннер для карточки
    if (item.card_banner_id) {
      promocode.cardBanner = {
        id: item.card_banner_id,
        originalName: item.card_banner_original_name,
        fileName: item.card_banner_file_name,
        path: item.card_banner_path,
        createdAt: item.card_banner_created_at,
        updatedAt: item.card_banner_updated_at,
      };
    } else {
      promocode.cardBanner = null;
    }

    return promocode;
  });
};
