import { sequelize } from '../db.js';
import * as promoService from './promo.service.js';

/**
 * Фоновая задача для обновления сегментов всех активных промокодов
 */
export const updateAllActiveSegments = async () => {
  try {
    console.log('[SegmentJob] Запуск обновления сегментов всех активных промокодов...');

    // Получаем все активные промокоды с сегментами
    const promocodes = await sequelize.query(
      `SELECT id, segmentFilter FROM promocodes 
       WHERE active = 1 AND isForSegment = 1 AND segmentFilter IS NOT NULL
       AND (dateFrom IS NULL OR dateFrom <= CURRENT_TIMESTAMP)
       AND (dateTo IS NULL OR dateTo >= CURRENT_TIMESTAMP)`,
      { type: sequelize.QueryTypes.SELECT },
    );

    console.log(`[SegmentJob] Найдено ${promocodes.length} активных промокодов с сегментами`);

    // Последовательно обновляем сегменты каждого промокода
    for (const promocode of promocodes) {
      try {
        if (!promocode.segmentFilter) {
          console.log(`[SegmentJob] Промокод ${promocode.id} имеет пустой фильтр сегмента, пропускаем...`);
          continue;
        }

        console.log(`[SegmentJob] Обновление сегмента для промокода ${promocode.id}...`);

        const result = await promoService.calculateSegmentForPromocode(promocode.id, promocode.segmentFilter);
        console.log(`[SegmentJob] Сегмент для промокода ${promocode.id} обновлен. Количество пользователей: ${result.usersCount}`);
      } catch (error) {
        console.error(`[SegmentJob] Ошибка при обновлении сегмента для промокода ${promocode.id}:`, error);
      }
    }

    console.log('[SegmentJob] Обновление сегментов всех активных промокодов завершено');
  } catch (error) {
    console.error('[SegmentJob] Ошибка при выполнении задачи обновления сегментов:', error);
  }
};

/**
 * Очистка устаревших сегментов промокодов
 */
export const cleanupExpiredSegments = async () => {
  try {
    console.log('[SegmentJob] Запуск очистки устаревших сегментов промокодов...');

    // Удаляем сегменты неактивных промокодов
    const result = await sequelize.query(
      `DELETE pus FROM promocode_user_segments pus
       JOIN promocodes p ON p.id = pus.promocodeId
       WHERE p.active = 0 OR p.isForSegment = 0 
       OR p.dateTo < CURRENT_TIMESTAMP`,
      { type: sequelize.QueryTypes.DELETE },
    );

    console.log(`[SegmentJob] Очистка устаревших сегментов завершена. Удалено записей: ${result[0]}`);
  } catch (error) {
    console.error('[SegmentJob] Ошибка при выполнении задачи очистки сегментов:', error);
  }
};

const main = async () => {
  await cleanupExpiredSegments();
  await updateAllActiveSegments();
};

await main();

export default main;
