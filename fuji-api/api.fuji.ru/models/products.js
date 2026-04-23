import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Products extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      additionalInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      code: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      revision: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      seoDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      seoKeywords: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      seoText: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      seoTitle: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      carbohydrateAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      carbohydrateFullAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      fatAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      fatFullAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      fiberAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      fiberFullAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      doNotPrintInCheque: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      energyAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      energyFullAmount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      groupId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      measureUnit: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      price: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      productCategoryId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      weight: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      isIncludedInMenu: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      parentGroup: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      likesCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      customImageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'products',
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
          name: 'products_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Products;
  }
}
