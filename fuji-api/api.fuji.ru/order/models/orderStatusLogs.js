import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class OrderStatusLogs extends Model {
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
      externalId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      previousStatus: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      newStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      source: {
        type: DataTypes.ENUM('COURIER_APP', 'ADMIN', 'SYSTEM', 'CUSTOMER'),
        allowNull: false,
        defaultValue: 'SYSTEM',
      },
      rawData: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'order_status_logs',
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
          name: 'order_status_logs_orders_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderId' },
          ],
        },
      ],
    });
    return OrderStatusLogs;
  }
}
