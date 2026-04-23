import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class StopList extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      deliveryTerminalId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      terminalGroupId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      productId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      balance: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revision: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'stopList',
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
          name: 'stopList_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return StopList;
  }
}
