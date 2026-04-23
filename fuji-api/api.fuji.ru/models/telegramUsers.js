import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class TelegramUsers extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      telegramChatId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: 'telegramUsers_telegramChatId_uindex',
      },
      isSendOrder: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      firstName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'telegramUsers',
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
          name: 'telegramUsers_telegramChatId_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'telegramChatId' },
          ],
        },
        {
          name: 'telegramUsers_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return TelegramUsers;
  }
}
