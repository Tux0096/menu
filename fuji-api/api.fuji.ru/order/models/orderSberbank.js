import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class OrderSberbank extends Model {
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
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
      },
      sberbankOrderId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: 'orderSberbank_sberbankOrderId_uindex',
      },
      formUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      errorCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      orderStatus: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actionCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actionCodeDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'orderSberbank',
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
          name: 'orderSberbank_sberbankOrderId_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'sberbankOrderId' },
          ],
        },
        {
          name: 'orderSberbank_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'orderSberbank_orders_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderId' },
          ],
        },
      ],
    });
    return OrderSberbank;
  }
}
