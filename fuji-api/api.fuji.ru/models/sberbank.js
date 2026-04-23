import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Sberbank extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      zoneId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      login: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      returnUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      failUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      sessionTimeoutSecs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 300,
      },
      registerDoLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      getOrderStatusExtendedDoLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'sberbank',
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
          name: 'sberbank_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Sberbank;
  }
}
