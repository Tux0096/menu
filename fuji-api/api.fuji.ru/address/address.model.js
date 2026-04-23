import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class AddressModel extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0,
      },
      city: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Наименование города *',
      },
      street: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Наименование улицы *',
      },
      zoneId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      streetId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Идентификатор улицы (если справочник улиц синхронизирован с справочником улиц в RMS)',
      },
      streetClassifierId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Идентификатор улицы в классификаторе, например, КЛАДР.',
      },
      home: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Дом *',
      },
      housing: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Корпус',
      },
      apartment: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Квартира',
      },
      entrance: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Подъезд',
      },
      floor: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Этаж',
      },
      doorphone: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Домофон',
      },
      isPrivateHouse: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        default: false,
      },
      comment: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Дополнительная информация',
      },
      regionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Идентификатор района, к которому относится адрес',
      },
      externalCartographyId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Идентификатор адреса во внешней картографической системе',
      },
      index: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Индекс улицы в адресе, если есть',
      },
    }, {
      sequelize,
      tableName: 'addresses',
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
          name: 'userAddresses_users_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'userId' },
          ],
        },
        {
          name: 'userAddresses_streets_id_fk',
          using: 'BTREE',
          fields: [
            { name: 'streetId' },
          ],
        },
      ],
    });
    return AddressModel;
  }
}
