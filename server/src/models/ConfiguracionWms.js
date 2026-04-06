/**
 * ISTHO CRM - Modelo ConfiguracionWms
 *
 * Configuración dinámica para la integración WMS Centhrix.
 * Permite al admin gestionar:
 * - Motivos de Kardex permitidos (lista blanca)
 * - Mapeo de tipos de orden (fallback)
 * - Estados válidos para procesar órdenes
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfiguracionWms = sequelize.define('ConfiguracionWms', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Categoría de configuración
    categoria: {
      type: DataTypes.ENUM('motivo_kardex', 'tipo_orden', 'estado_valido'),
      allowNull: false,
      comment: 'Categoría: motivo_kardex, tipo_orden, estado_valido'
    },

    // Valor que envía el WMS
    valor_wms: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Valor exacto que envía el WMS (ej: "Recarga", "Recepcion", "Finalizada")'
    },

    // Valor mapeado en el CRM
    valor_crm: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre que se muestra en el CRM (ej: "Recarga de stock", "CO", "Finalizada")'
    },

    // Para tipo_orden: a qué tipo de documento se mapea
    tipo_documento: {
      type: DataTypes.ENUM('CO', 'PK', 'CR'),
      allowNull: true,
      comment: 'Solo para tipo_orden: CO=Entrada, PK=Salida, CR=Kardex'
    },

    // Si motivo=Otro, el WMS envía detalle adicional
    requiere_detalle: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si true, el WMS envía un campo adicional con el detalle del motivo'
    },

    // Descripción para el admin
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Descripción para el admin'
    },

    // Orden de visualización
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización en el panel'
    },

    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'configuracion_wms',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['categoria', 'activo'] },
      { fields: ['categoria', 'valor_wms'], unique: true },
      { fields: ['activo'] }
    ]
  });

  // Métodos estáticos de consulta

  /**
   * Obtener motivos de kardex permitidos (activos)
   */
  ConfiguracionWms.getMotivosKardex = async function () {
    return this.findAll({
      where: { categoria: 'motivo_kardex', activo: true },
      order: [['orden', 'ASC']],
      raw: true
    });
  };

  /**
   * Verificar si un motivo de kardex es permitido
   * @param {string} motivo - Motivo enviado por el WMS
   * @returns {{ permitido: boolean, valorCrm: string, requiereDetalle: boolean }}
   */
  ConfiguracionWms.verificarMotivoKardex = async function (motivo) {
    if (!motivo) return { permitido: false, valorCrm: null, requiereDetalle: false };

    const config = await this.findOne({
      where: {
        categoria: 'motivo_kardex',
        valor_wms: motivo.trim(),
        activo: true
      },
      raw: true
    });

    if (!config) return { permitido: false, valorCrm: null, requiereDetalle: false };

    return {
      permitido: true,
      valorCrm: config.valor_crm,
      requiereDetalle: config.requiere_detalle
    };
  };

  /**
   * Obtener mapeo de tipos de orden (fallback)
   */
  ConfiguracionWms.getTiposOrden = async function () {
    return this.findAll({
      where: { categoria: 'tipo_orden', activo: true },
      order: [['orden', 'ASC']],
      raw: true
    });
  };

  /**
   * Resolver tipo de documento WMS
   * @param {string} tipoDocumento - Campo tipo_documento del WMS (CO, PK, CR)
   * @param {string} tipoOrden - Campo tipo_orden del WMS (Recepcion, Picking)
   * @returns {string|null} Tipo de documento resuelto (CO, PK, CR) o null
   */
  ConfiguracionWms.resolverTipoDocumento = async function (tipoDocumento, tipoOrden) {
    // Primero: tipo_documento directo
    if (tipoDocumento && ['CO', 'PK', 'CR'].includes(tipoDocumento.toUpperCase())) {
      return tipoDocumento.toUpperCase();
    }

    // Segundo: buscar por tipo_orden en la tabla de mapeo
    if (tipoOrden) {
      const config = await this.findOne({
        where: {
          categoria: 'tipo_orden',
          valor_wms: tipoOrden.trim(),
          activo: true
        },
        raw: true
      });

      if (config) return config.tipo_documento;
    }

    return null;
  };

  /**
   * Obtener estados válidos para procesar órdenes
   */
  ConfiguracionWms.getEstadosValidos = async function () {
    return this.findAll({
      where: { categoria: 'estado_valido', activo: true },
      order: [['orden', 'ASC']],
      raw: true
    });
  };

  /**
   * Verificar si un estado es válido para procesar
   * @param {string} estado - Estado de la orden del WMS
   * @returns {boolean}
   */
  ConfiguracionWms.esEstadoValido = async function (estado) {
    if (!estado) return false;

    const count = await this.count({
      where: {
        categoria: 'estado_valido',
        valor_wms: estado.trim(),
        activo: true
      }
    });

    return count > 0;
  };

  return ConfiguracionWms;
};
