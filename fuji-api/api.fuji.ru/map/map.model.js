import _sequelize from 'sequelize';

const { Model } = _sequelize;

/**
 * Модель для хранения зон доставки
 */
export default class DeliveryZone extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      city_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'ID города, к которому относится зона',
      },
      zone_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Уникальный ID зоны доставки',
      },
      terminal_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'ID терминала который обслуживает зону',
      },
      deliveryId: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: 'ID товара доставки из iiko (обязательное поле)',
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Адрес зоны доставки (обязательное поле)',
      },
      zoneName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Название зоны (например: "зона 10.1")',
      },
      preparationTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 60,
        comment: 'Время приготовления в минутах',
      },
      deliveryTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30,
        comment: 'Время доставки в минутах',
      },
      zone_data: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Данные зоны в формате JSON',
        get() {
          const rawValue = this.getDataValue('zone_data');
          if (!rawValue) return null;
          try {
            const parsed = JSON.parse(rawValue);
            // Если это пустой объект, возвращаем null
            return Object.keys(parsed).length === 0 ? null : parsed;
          } catch (error) {
            console.warn('Ошибка парсинга zone_data:', error, 'rawValue:', rawValue);
            return null;
          }
        },
        set(value) {
          // Валидация перед сохранением
          if (!value || typeof value !== 'object') {
            throw new Error('zone_data должен быть объектом');
          }

          // Проверка обязательных полей
          if (!value.coords || !Array.isArray(value.coords) || value.coords.length < 3) {
            throw new Error('coords должен быть массивом с минимум 3 точками');
          }

          if (!value.zoneId) {
            throw new Error('zoneId обязателен');
          }

          this.setDataValue('zone_data', JSON.stringify(value));
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Дата создания записи',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Дата обновления записи',
      },
    }, {
      sequelize,
      tableName: 'delivery_zones',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'delivery_zones_city_id_idx',
          fields: ['city_id'],
        },
        {
          name: 'delivery_zones_zone_id_unique',
          fields: ['zone_id'],
          unique: true,
        },
        {
          name: 'delivery_zones_terminal_id_idx',
          fields: ['terminal_id'],
        },
        {
          name: 'delivery_zones_city_terminal_idx',
          fields: ['city_id', 'terminal_id'],
        },
        {
          name: 'delivery_zones_delivery_id_idx',
          fields: ['deliveryId'],
        },
      ],
    });
    return DeliveryZone;
  }
}
