import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Iiko extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      apiLogin: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      organizationId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'iiko',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
  }
}
