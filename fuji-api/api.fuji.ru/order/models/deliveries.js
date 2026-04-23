import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Deliveries extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
      },
      iikoId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID заказа в системе iiko',
      },
      number: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Понятный номер заказа. Может использоваться для передачи клиенту. Уникальность не гарантирована (может быть уникальным в рамках одного обслуживающего сервера).',
      },
      phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
        comment: 'Номер телефона клиента',

      },
      externalId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Внешний ID из курьерского приложения',
      },
      status: {
        type: DataTypes.ENUM(
          'Unconfirmed',
          'WaitCooking',
          'ReadyForCooking',
          'CookingStarted',
          'CookingCompleted',
          'Waiting',
          'OnWay',
          'OnWayCourier',
          'CourierNearby',
          'Delivered',
          'Closed',
          'Cancelled',
        ),
        allowNull: true,
        defaultValue: 'Unconfirmed',
        comment: 'Статус доставки',
      },
      courierInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Информация о курьере (имя, телефон, координаты)',
        get() {
          const rawValue = this.getDataValue('courierInfo');
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue('courierInfo', value ? JSON.stringify(value) : null);
        },
      },
      estimatedDeliveryTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ожидаемое время доставки',
      },
      actualDeliveryTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Фактическое время доставки',
      },
      trackingData: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Данные отслеживания доставки',
        get() {
          const rawValue = this.getDataValue('trackingData');
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue('trackingData', value ? JSON.stringify(value) : null);
        },
      },
    }, {
      sequelize,
      tableName: 'deliveries',
      timestamps: true,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'deliveries_orders_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderId' },
          ],
        },
        {
          name: 'deliveries_iiko_id_idx',
          using: 'BTREE',
          fields: [
            { name: 'iikoId' },
          ],
        },
        {
          name: 'deliveries_external_id_idx',
          using: 'BTREE',
          fields: [
            { name: 'externalId' },
          ],
        },
      ],
    });
    return Deliveries;
  }
}
