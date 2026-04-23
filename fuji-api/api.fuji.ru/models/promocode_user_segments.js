import _sequelize from 'sequelize';

const { Model, Sequelize } = _sequelize;

export default class PromocodeUserSegments extends Model {
    static init(sequelize, DataTypes) {
        return super.init({
            id: {
                autoIncrement: true,
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
            },
            promocodeId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'promocodes',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            userId: {
                type: DataTypes.CHAR(36),
                allowNull: false,
                references: {
                    model: 'customers',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        }, {
            sequelize,
            tableName: 'promocode_user_segments',
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
                    name: 'unique_promocode_user',
                    unique: true,
                    using: 'BTREE',
                    fields: [
                        { name: 'promocodeId' },
                        { name: 'userId' },
                    ],
                },
                {
                    name: 'FK_promocode_user_segments_promocodeId',
                    using: 'BTREE',
                    fields: [
                        { name: 'promocodeId' },
                    ],
                },
                {
                    name: 'FK_promocode_user_segments_userId',
                    using: 'BTREE',
                    fields: [
                        { name: 'userId' },
                    ],
                },
                {
                    name: 'idx_promocode_user_segments_promo_user',
                    using: 'BTREE',
                    fields: [
                        { name: 'promocodeId' },
                        { name: 'userId' },
                    ],
                },
                {
                    name: 'idx_promocode_user_segments_user',
                    using: 'BTREE',
                    fields: [
                        { name: 'userId' },
                    ],
                },
            ],
        });
    }

    static associate(models) {
        PromocodeUserSegments.belongsTo(models.Promocodes, { foreignKey: 'promocodeId' });
        PromocodeUserSegments.belongsTo(models.Customers, { foreignKey: 'userId' });
    }
} 