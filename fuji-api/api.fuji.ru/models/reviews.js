import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Reviews extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      restaurant: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      clear: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      service: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quality: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recommended: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      fio: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'reviews',
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
          name: 'reviews_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Reviews;
  }
}
