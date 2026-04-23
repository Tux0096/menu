import { nuxtInstance } from '~/plugins/nuxt-instance';

/**
 * Сервис для работы с зонами доставки
 */
class DeliveryZoneService {
  constructor() {
    this.zonesCache = new Map();
    this.deliveryCostCache = new Map();
  }

  /**
   * Получение информации о стоимости доставки для зоны
   * @param {string} zoneId ID зоны
   * @returns {Promise<Object|null>} Информация о доставке или null
   */
  async getZoneDeliveryCost(zoneId) {
    if (!zoneId) {
      return null;
    }

    // Проверяем кеш
    if (this.deliveryCostCache.has(zoneId)) {
      return this.deliveryCostCache.get(zoneId);
    }

    try {
      const response = await nuxtInstance.$axios.get(
        `${nuxtInstance.$config.FRONT_API_URL}/api/v1/map/zones/delivery/${zoneId}`,
      );

      const deliveryInfo = response.data;

      // Кешируем результат на 5 минут
      this.deliveryCostCache.set(zoneId, deliveryInfo);
      setTimeout(() => {
        this.deliveryCostCache.delete(zoneId);
      }, 5 * 60 * 1000);

      return deliveryInfo;
    } catch (error) {
      console.error(`Error getting delivery cost for zone ${zoneId}:`, error);
      return null;
    }
  }

  /**
   * Получение deliveryId для зоны
   * @param {string} zoneId ID зоны
   * @returns {Promise<string|null>} ID товара доставки или null
   */
  async getZoneDeliveryId(zoneId) {
    const deliveryInfo = await this.getZoneDeliveryCost(zoneId);
    return deliveryInfo?.deliveryId || null;
  }

  /**
   * Очистка кеша
   */
  clearCache() {
    this.zonesCache.clear();
    this.deliveryCostCache.clear();
  }
}

// Создаем экземпляр сервиса
const deliveryZoneService = new DeliveryZoneService();

export default deliveryZoneService;
