import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Pages extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'pages',
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
          name: 'pages_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Pages;
  }
}
