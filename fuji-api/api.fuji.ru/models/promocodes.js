import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Promocodes extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 1,
      },
      coupon: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      fullPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      code: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      dateFrom: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dateTo: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      times: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hasProduct: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isForSegment: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      segmentFilter: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      listBannerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'files',
          key: 'id',
        },
      },
      cardBannerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'files',
          key: 'id',
        },
      },
      hasTimeRestriction: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      timeFrom: {
        type: DataTypes.STRING(5),
        allowNull: true,
      },
      timeTo: {
        type: DataTypes.STRING(5),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'promocodes',
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
          name: 'FK_promocodes_listBannerId',
          using: 'BTREE',
          fields: [
            { name: 'listBannerId' },
          ],
        },
        {
          name: 'FK_promocodes_cardBannerId',
          using: 'BTREE',
          fields: [
            { name: 'cardBannerId' },
          ],
        },
        {
          name: 'idx_promocodes_code',
          using: 'BTREE',
          fields: [
            { name: 'code' },
          ],
        },
        {
          name: 'idx_promocodes_active_dates',
          using: 'BTREE',
          fields: [
            { name: 'active' },
            { name: 'dateFrom' },
            { name: 'dateTo' },
          ],
        },
        {
          name: 'idx_promocodes_is_for_segment',
          using: 'BTREE',
          fields: [
            { name: 'isForSegment' },
          ],
        },
      ],
    });
  }

  static associate(models) {
    Promocodes.belongsTo(models.Files, { foreignKey: 'listBannerId', as: 'listBanner' });
    Promocodes.belongsTo(models.Files, { foreignKey: 'cardBannerId', as: 'cardBanner' });
    Promocodes.hasMany(models.PromocodeUserSegments, { foreignKey: 'promocodeId', as: 'userSegments' });
  }
}
