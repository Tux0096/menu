import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Slides extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      fileId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isMobile: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      sort: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      link: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('slide', 'promo'),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'slides',
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
      ],
    });
    return Slides;
  }
}
