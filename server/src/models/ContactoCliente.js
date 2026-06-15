// server/src/models/ContactoCliente.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ContactoCliente extends Model {}

  ContactoCliente.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      contacto_id: { type: DataTypes.INTEGER, allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      es_principal: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'ContactoCliente',
      tableName: 'contacto_clientes',
      underscored: true,
      indexes: [
        { unique: true, fields: ['contacto_id', 'cliente_id'] },
        { fields: ['cliente_id'] },
      ],
      hooks: {
        afterSave: async (pivot, options) => {
          if (pivot.es_principal) {
            await ContactoCliente.update(
              { es_principal: false },
              {
                where: {
                  cliente_id: pivot.cliente_id,
                  id: { [sequelize.Sequelize.Op.ne]: pivot.id },
                },
                transaction: options.transaction,
                hooks: false,
              }
            );
          }
        },
      },
    }
  );

  return ContactoCliente;
};
