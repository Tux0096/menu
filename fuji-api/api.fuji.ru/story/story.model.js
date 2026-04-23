import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Stories extends Model {
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
      type: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      linkTitle: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

    }, {
      sequelize,
      tableName: 'stories',
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
    return Stories;
  }
}
