import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class OrderProducts extends Model {
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
      iikoId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      code: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      price: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isGift: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
    }, {
      sequelize,
      tableName: 'orderProducts',
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
          name: 'orderProducts_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'orderProduct_orders_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderId' },
          ],
        },
        {
          name: 'orderProducts_products_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'iikoId' },
          ],
        },
      ],
    });
    return OrderProducts;
  }
}
