import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class ProductGroupModifiersChildren extends Model {
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
      parentId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      minAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      maxAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      defaultAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hideIfDefaultAmount: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'productGroupModifiersChildren',
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
        {
          name: 'productGroupModifiersChildren_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return ProductGroupModifiersChildren;
  }
}
