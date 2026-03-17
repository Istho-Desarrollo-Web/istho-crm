/**
 * ISTHO CRM - Modelo Contacto
 * 
 * Gestiona los contactos asociados a cada cliente.
 * Permite múltiples contactos por cliente con uno principal.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contacto = sequelize.define('Contacto', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre es requerido' },
        len: {
          args: [2, 150],
          msg: 'El nombre debe tener entre 2 y 150 caracteres'
        }
      }
    },
    
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    celular: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: { msg: 'Debe ser un email válido' }
      }
    },
    
    es_principal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si es el contacto principal del cliente'
    },
    
    recibe_notificaciones: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Indica si recibe emails de notificación'
    },
    
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'contactos',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['cliente_id'] },
      { fields: ['email'] },
      { fields: ['es_principal'] }
    ],
    
    hooks: {
      // Si se marca como principal, desmarcar otros
      afterSave: async (contacto, options) => {
        if (contacto.es_principal) {
          await sequelize.models.Contacto.update(
            { es_principal: false },
            {
              where: {
                cliente_id: contacto.cliente_id,
                id: { [sequelize.Sequelize.Op.ne]: contacto.id }
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  /**
   * Obtener nombre completo con cargo
   */
  Contacto.prototype.getNombreConCargo = function() {
    return this.cargo ? `${this.nombre} (${this.cargo})` : this.nombre;
  };

  return Contacto;
};