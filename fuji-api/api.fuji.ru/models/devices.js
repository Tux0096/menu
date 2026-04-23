import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Devices extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      FCMToken: {
        type: DataTypes.STRING(4096),
        allowNull: true,
      },
      deviceType: {
        type: DataTypes.ENUM('mobile', 'web'),
        allowNull: false,
        defaultValue: 'mobile',
        comment: 'Тип устройства: mobile для мобильных приложений, web для браузеров',
      },
      customerId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      lastMessageSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Дата и время последней отправки сообщения на этот токен',
      },
    }, {
      sequelize,
      tableName: 'devices',
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
          name: 'devices_customers_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'customerId' },
          ],
        },
      ],
    });
  }
}
