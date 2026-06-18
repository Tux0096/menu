/**
 * Плагин для отслеживания изменения адреса и обновления deliveryId зоны
 */
export default ({ store, app }, inject) => {
  // Функция для обновления deliveryId зоны при изменении адреса
  const updateZoneDelivery = async () => {
    const selectedAddress = store.getters['address/selectedAddress'];
    const zoneId = selectedAddress?.zoneId;
    // Вызываем action для обновления zoneDeliveryId
    await store.dispatch('city/updateZoneDeliveryId', zoneId);
  };

  // Следим за изменениями в store адреса
  if (process.client) {
    store.watch(
      (state, getters) => getters['address/selectedAddress'],
      async (newAddress, oldAddress) => {
        // Если изменился zoneId, обновляем deliveryId зоны
        if (newAddress?.zoneId !== oldAddress?.zoneId) {
          await updateZoneDelivery();
        }
      },
      {
        deep: true,
        immediate: true,
      },
    );
  }

  // Инжектируем функцию для ручного обновления
  inject('updateZoneDelivery', updateZoneDelivery);
};
