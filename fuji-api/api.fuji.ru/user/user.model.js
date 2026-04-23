import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Customers extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(40),
        allowNull: false,
        unique: 'users_phone_uindex',
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 1,
      },
      balance: {
        type: DataTypes.DECIMAL(10, 0),
        allowNull: true,
        defaultValue: 0,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
        defaultValue: 'male',
      },
      isCompanyEmployee: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },

      PUSHNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 1,
      },
      receiveAdvertisingInformation: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 1,
      },

    }, {
      sequelize,
      tableName: 'customers',
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
          name: 'users_phone_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'phone' },
          ],
        },
      ],
    });
    return Customers;
  }
}
