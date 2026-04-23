import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class PaymentTypes extends Model {
  static init(sequelize, DataTypes) {
    super.init({
      id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: 'paymentTypes_code_uindex',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      comment: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      isProcessedExternally: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      paymentTypeKind: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'paymentTypes',
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
          name: 'paymentTypes_id_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'id' },
          ],
        },
        {
          name: 'paymentTypes_code_uindex',
          unique: true,
          using: 'BTREE',
          fields: [
            { name: 'code' },
          ],
        },
      ],
    });
    return PaymentTypes;
  }
}
