/**
 * ISTHO CRM - Modelo Cliente
 * 
 * Gestiona los clientes corporativos de ISTHO.
 * Incluye información fiscal, contacto y estado.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cliente = sequelize.define('Cliente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    codigo_cliente: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: {
        msg: 'Este código de cliente ya existe'
      },
      validate: {
        notEmpty: { msg: 'El código de cliente es requerido' }
      }
    },
    
    razon_social: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'La razón social es requerida' },
        len: {
          args: [3, 200],
          msg: 'La razón social debe tener entre 3 y 200 caracteres'
        }
      }
    },
    
    nit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: {
        msg: 'Este NIT ya está registrado'
      },
      validate: {
        notEmpty: { msg: 'El NIT es requerido' }
      }
    },
    
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    telefono: {
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
    
    sitio_web: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        isUrl: { msg: 'Debe ser una URL válida' }
      }
    },
    
    tipo_cliente: {
      type: DataTypes.ENUM('corporativo', 'pyme', 'persona_natural'),
      defaultValue: 'corporativo'
    },
    
    sector: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Sector económico: Alimentos, Retail, Industrial, etc.'
    },
    
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo', 'suspendido'),
      defaultValue: 'activo'
    },
    
    fecha_inicio_relacion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    
    credito_aprobado: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Límite de crédito en COP'
    },
    
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL del logo del cliente'
    },

    // Campos para integración WMS
    codigo_wms: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código del cliente en WMS Copérnico'
    },
    
    ultima_sincronizacion_wms: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'clientes',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    
    indexes: [
      { fields: ['codigo_cliente'] },
      { fields: ['nit'] },
      { fields: ['razon_social'] },
      { fields: ['estado'] },
      { fields: ['tipo_cliente'] },
      { fields: ['ciudad'] }
    ],
    
hooks: {
  // Generar código de cliente automáticamente
  beforeCreate: async (cliente, options) => { 
    if (!cliente.codigo_cliente) {
      // Usar el modelo directamente desde la instancia
      const Cliente = cliente.constructor;
      const ultimo = await Cliente.findOne({
        order: [['id', 'DESC']],
        paranoid: false
      });
      const siguienteNum = ultimo ? ultimo.id + 1 : 1;
      cliente.codigo_cliente = `CLI-${String(siguienteNum).padStart(4, '0')}`;
    }
  }
}
  });

  // ============================================
  // MÉTODOS DE INSTANCIA
  // ============================================

  /**
   * Obtener nombre corto para mostrar
   */
  Cliente.prototype.getNombreCorto = function() {
    return this.razon_social.length > 30 
      ? this.razon_social.substring(0, 30) + '...'
      : this.razon_social;
  };

  /**
   * Verificar si el cliente está activo
   */
  Cliente.prototype.estaActivo = function() {
    return this.estado === 'activo';
  };

  // ============================================
  // SCOPES (Consultas predefinidas)
  // ============================================

  Cliente.addScope('activos', {
    where: { estado: 'activo' }
  });

  Cliente.addScope('conContactos', {
    include: ['contactos']
  });

  return Cliente;
};