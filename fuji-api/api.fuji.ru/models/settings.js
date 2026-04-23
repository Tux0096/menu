import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Settings extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('boolean', 'string', 'number', 'json'),
        allowNull: true,
        defaultValue: 'boolean',
      },
      widget: {
        type: DataTypes.ENUM('switcher', 'multi-switcher', 'text', 'textarea', 'file', 'image-preset', 'work-time'),
        allowNull: true,
        defaultValue: 'text',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'settings',
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
  }
}
