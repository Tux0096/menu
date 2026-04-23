import _sequelize from 'sequelize';

const { Model } = _sequelize;

export default class ExternalClients extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      clientId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'client_id',
        comment: 'Уникальный идентификатор клиента',
      },
      clientSecret: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'client_secret',
        comment: 'Хешированный секрет клиента',
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Название клиентского приложения',
      },
      scopes: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        comment: 'Массив разрешений в формате действие:ресурс',
        get() {
          const rawValue = this.getDataValue('scopes');
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue('scopes', JSON.stringify(value || []));
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Активен ли клиент',
      },
      tokenExpiresIn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3600, // 1 час по умолчанию
        field: 'token_expires_in',
        comment: 'Время жизни генерируемых токенов в секундах',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Описание клиентского приложения',
      },
    }, {
      sequelize,
      tableName: 'external_clients',
      timestamps: true,
      underscored: true,
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
          name: 'external_clients_client_id_unique',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'client_id' },
          ],
        },
      ],
    });
    return ExternalClients;
  }
}
