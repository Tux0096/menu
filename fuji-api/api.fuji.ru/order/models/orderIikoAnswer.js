import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class OrderIikoAnswer extends Model {
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
      answer: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const rawValue = this.getDataValue('answer');
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue('answer', value ? JSON.stringify(value) : null);
        },
      },
    }, {
      sequelize,
      tableName: 'orderIikoAnswer',
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
          name: 'OrderIikoAnswer_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'OrderIikoAnswer_orders_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderId' },
          ],
        },
      ],
    });
    return OrderIikoAnswer;
  }
}
