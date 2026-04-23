import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class ProductModifiers extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      modifierId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      productId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      maxAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      minAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      defaultAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    }, {
      sequelize,
      tableName: 'productModifiers',
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
          name: 'productModifiers_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'product_modifiers_products_iikoId_fk',
          using: 'BTREE',
          fields: [
            { name: 'productId' },
          ],
        },
      ],
    });
    return ProductModifiers;
  }
}
