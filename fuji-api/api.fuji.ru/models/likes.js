import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Likes extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
    }, {
      sequelize,
      tableName: 'likes',
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
          name: 'likes___fk',
          using: 'BTREE',
          fields: [
            { name: 'productId' },
          ],
        },
        {
          name: 'likes___fk2',
          using: 'BTREE',
          fields: [
            { name: 'userId' },
          ],
        },
      ],
    });
  }
}
