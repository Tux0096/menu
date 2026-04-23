import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class Options extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      iiko_login: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      iiko_password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      iiko_organization_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      iikoRevision: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      isNeedCladrUpdate: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      tekegramApiKey: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      orderMail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      orderMailCC: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      formMail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      formMailCC: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      smtpHost: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smtpUser: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smtpPassword: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smsUser: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      smsPassword: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'options',
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
          name: 'options_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
      ],
    });
    return Options;
  }
}
