import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class OrderProductModifiers extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      orderProductId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'orderProducts',
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
      groupId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      groupName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isGift: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
    }, {
      sequelize,
      tableName: 'orderProductModifiers',
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
          name: 'orderProductModifiers_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'orderProductModifiers_orderProducts_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'orderProductId' },
          ],
        },
      ],
    });
    return OrderProductModifiers;
  }
}
