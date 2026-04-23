import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Files extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'files',
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
      ],
    });
    return Files;
  }
}
