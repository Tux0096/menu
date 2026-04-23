import _sequelize from 'sequelize';

const { Model } = _sequelize;

export default class Cities extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      iikoId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: 'cities_iikoId_uindex',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      additionalInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      classifierId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      externalRevision: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'cities',
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
          name: 'cities_iikoId_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'iikoId' },
          ],
        },
      ],
    });
    return Cities;
  }
}
