import _sequelize from 'sequelize';

const { Model } = _sequelize;

export default class DeliveryTerminals extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      terminalId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: 'deliveryTerminals_terminalId_uindex',
        comment: 'UUID терминала из iiko (deliveryTerminalId)',
      },
      cityId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        comment: 'UUID города',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Отображаемое название терминала',
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Адрес терминала',
      },
      organizationId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        comment: 'ID организации в iiko',
      },
      deliveryGroupName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Внутреннее название группы доставки',
      },
      deliveryRestaurantName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Внутреннее название ресторана',
      },
      isDisabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Флаг отключения терминала',
      },
      isRestHide: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Скрыть ресторан в списке самовывоза',
      },
      isOnlinePaymentHideDelivery: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Скрыть онлайн-оплату при выборе доставки',
      },
      isOnlinePaymentHideSelf: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Скрыть онлайн-оплату при выборе самовывоза',
      },
      cloudPaymentsPublicId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Public ID для интеграции с CloudPayments',
      },
      openingHours: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Часы работы ресторана в JSON формате',
      },
      times: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Расписание работы самовывоза в JSON формате',
      },
      technicalInformation: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Дополнительная техническая информация в JSON формате',
      },
    }, {
      sequelize,
      tableName: 'deliveryTerminals',
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
          name: 'deliveryTerminals_terminalId_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'terminalId' },
          ],
        },
        {
          name: 'deliveryTerminals_cityId_index',
          using: 'BTREE',
          fields: [
            { name: 'cityId' },
          ],
        },
        {
          name: 'deliveryTerminals_isDisabled_index',
          using: 'BTREE',
          fields: [
            { name: 'isDisabled' },
          ],
        },
      ],
    });
    return DeliveryTerminals;
  }
}
