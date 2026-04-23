import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Groups extends Model {
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
      isGroupModifier: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
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
      tags: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      isIncludedInMenu: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 1,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      parentGroup: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'groups',
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
          name: 'groups_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Groups;
  }
}
