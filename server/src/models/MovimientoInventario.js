/**
 * ISTHO CRM - Modelo MovimientoInventario
 * 
 * Registra el historial de movimientos de inventario (entradas, salidas, ajustes).
 * Proporciona trazabilidad completa para cumplimiento ISO 9001.
 * 
 * NOTA: Este modelo es compatible con el inventarioController existente.
 * El controller maneja la actualización del inventario, este modelo solo registra.
 * 
 * CORRECCIÓN v1.1.0:
 * - getEstadisticas usa SOLO fecha_movimiento (no existe created_at)
 * - Template literal corregido en console.log
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const { DataTypes, Model, Op } = require('sequelize');

module.exports = (sequelize) => {
  class MovimientoInventario extends Model {
    // ════════════════════════════════════════════════════════════════════════
    // MÉTODOS ESTÁTICOS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Registrar un movimiento de inventario
     * NOTA: Este método SOLO registra el movimiento. 
     * La actualización del inventario la hace el controller.
     * 
     * @param {Object} data - Datos del movimiento
     * @param {Object} options - Opciones de Sequelize (transaction, etc.)
     * @returns {Promise<MovimientoInventario>}
     */
    static async registrar(data, options = {}) {
      const {
        inventario_id,
        usuario_id,
        tipo,
        cantidad,
        motivo,
        stock_anterior,
        stock_resultante,
        documento_referencia = null,
        observaciones = null,
        operacion_id = null,
        ubicacion_origen = null,
        ubicacion_destino = null,
        costo_unitario = null,
        ip_address = null,
        user_agent = null
      } = data;

      // Validar campos requeridos
      if (!inventario_id) throw new Error('inventario_id es requerido');
      if (!tipo) throw new Error('tipo es requerido');
      if (cantidad === undefined || cantidad === null) throw new Error('cantidad es requerida');
      if (stock_anterior === undefined) throw new Error('stock_anterior es requerido');
      if (stock_resultante === undefined) throw new Error('stock_resultante es requerido');

      // Crear el registro de movimiento
      const movimiento = await this.create({
        inventario_id,
        usuario_id,
        operacion_id,
        tipo,
        motivo: motivo || `Movimiento de ${tipo}`,
        cantidad: parseFloat(cantidad),
        stock_anterior: parseFloat(stock_anterior),
        stock_resultante: parseFloat(stock_resultante),
        documento_referencia,
        observaciones,
        ubicacion_origen,
        ubicacion_destino,
        costo_unitario: costo_unitario ? parseFloat(costo_unitario) : null,
        ip_address,
      }, options);

      return movimiento;
    }

    /**
     * Obtener historial de movimientos de un producto
     * @param {number} inventario_id - ID del producto
     * @param {Object} options - Opciones de paginación y filtros
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    static async getHistorial(inventario_id, options = {}) {
      const {
        page = 1,
        limit = 20,
        tipo = null,
        fecha_inicio = null,
        fecha_fin = null
      } = options;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where = { inventario_id };

      if (tipo) {
        where.tipo = tipo;
      }

      if (fecha_inicio || fecha_fin) {
        where.fecha_movimiento = {};
        if (fecha_inicio) where.fecha_movimiento[Op.gte] = fecha_inicio;
        if (fecha_fin) where.fecha_movimiento[Op.lte] = fecha_fin;
      }

      const { count, rows } = await this.findAndCountAll({
        where,
        include: [
          {
            model: sequelize.models.Usuario,
            as: 'usuario',
            attributes: ['id', 'nombre_completo', 'username'],
            required: false
          },
          {
            model: sequelize.models.Operacion,
            as: 'operacion',
            attributes: ['id', 'consecutivo', 'tipo'],
            required: false
          }
        ],
        order: [['fecha_movimiento', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    }

    /**
     * ════════════════════════════════════════════════════════════════════════
     * Obtener estadísticas mensuales para gráficos
     * ════════════════════════════════════════════════════════════════════════
     * 
     * CORRECCIÓN v1.1.0: 
     * - Usa SOLO fecha_movimiento (la tabla NO tiene created_at)
     * - Devuelve formato compatible con BarChart del frontend
     * 
     * @param {number} inventario_id - ID del producto
     * @param {number} meses - Cantidad de meses hacia atrás (default: 6)
     * @returns {Promise<Array>}
     */
    static async getEstadisticas(inventario_id, meses = 6) {
      try {
        const fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - meses);
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);

        console.log(`[getEstadisticas] inventario_id=${inventario_id}, desde=${fechaInicio.toISOString()}`);

        // ═══════════════════════════════════════════════════════════════════
        // CONSULTA CORREGIDA: Usa SOLO fecha_movimiento
        // ═══════════════════════════════════════════════════════════════════
        const movimientos = await this.findAll({
          where: {
            inventario_id,
            fecha_movimiento: { [Op.gte]: fechaInicio },
            tipo: { [Op.in]: ['entrada', 'salida'] }
          },
          attributes: [
            [sequelize.fn('DATE_FORMAT', sequelize.col('fecha_movimiento'), '%Y-%m'), 'periodo'],
            [sequelize.fn('MONTH', sequelize.col('fecha_movimiento')), 'mes_num'],
            'tipo',
            [sequelize.fn('SUM', sequelize.fn('ABS', sequelize.col('cantidad'))), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'operaciones']
          ],
          group: ['periodo', 'mes_num', 'tipo'],
          order: [[sequelize.literal('periodo'), 'ASC']],
          raw: true,
        });

        console.log(`[getEstadisticas] Movimientos encontrados: ${movimientos.length}`);

        // Mapeo de número de mes a nombre en español (abreviado)
        const MESES_ES = {
          1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
          5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
          9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        };

        // Transformar a formato de gráfico
        const periodos = {};

        movimientos.forEach((m) => {
          if (!periodos[m.periodo]) {
            const mesNum = parseInt(m.mes_num);
            periodos[m.periodo] = {
              periodo: m.periodo,
              label: MESES_ES[mesNum] || m.periodo,
              entradas: 0,
              salidas: 0,
              value1: 0,  // Para BarChart (entradas)
              value2: 0,  // Para BarChart (salidas)
              operaciones_entrada: 0,
              operaciones_salida: 0
            };
          }

          const total = parseFloat(m.total) || 0;
          const operaciones = parseInt(m.operaciones) || 0;

          if (m.tipo === 'entrada') {
            periodos[m.periodo].entradas = total;
            periodos[m.periodo].value1 = total;
            periodos[m.periodo].operaciones_entrada = operaciones;
          } else if (m.tipo === 'salida') {
            periodos[m.periodo].salidas = total;
            periodos[m.periodo].value2 = total;
            periodos[m.periodo].operaciones_salida = operaciones;
          }
        });

        const resultado = Object.values(periodos);

        // Log para debug
        console.log(`[getEstadisticas] Resultado (${resultado.length} periodos):`, JSON.stringify(resultado));

        return resultado;
      } catch (error) {
        console.error('[getEstadisticas] Error:', error.message);
        return [];
      }
    }

    /**
     * Obtener resumen de movimientos por tipo
     * @param {number} inventario_id - ID del producto
     * @param {Date} desde - Fecha inicio (opcional)
     * @returns {Promise<Object>}
     */
    static async getResumen(inventario_id, desde = null) {
      const where = { inventario_id };

      if (desde) {
        where.fecha_movimiento = { [Op.gte]: desde };
      }

      const resumen = await this.findAll({
        where,
        attributes: [
          'tipo',
          [sequelize.fn('SUM', sequelize.fn('ABS', sequelize.col('cantidad'))), 'total'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad_operaciones']
        ],
        group: ['tipo'],
        raw: true
      });

      // Formatear resultado
      const resultado = {
        entradas: 0,
        salidas: 0,
        ajustes: 0,
        total_operaciones: 0
      };

      resumen.forEach(r => {
        if (r.tipo === 'entrada') resultado.entradas = parseFloat(r.total) || 0;
        else if (r.tipo === 'salida') resultado.salidas = parseFloat(r.total) || 0;
        else if (r.tipo === 'ajuste') resultado.ajustes = parseFloat(r.total) || 0;
        resultado.total_operaciones += parseInt(r.cantidad_operaciones) || 0;
      });

      return resultado;
    }

    /**
     * Obtener últimos movimientos (para dashboard)
     * @param {Object} options - Filtros opcionales
     * @returns {Promise<Array>}
     */
    static async getUltimos(options = {}) {
      const { limit = 10, cliente_id = null } = options;

      const include = [
        {
          model: sequelize.models.Inventario,
          as: 'inventario',
          attributes: ['id', 'producto', 'sku', 'cliente_id'],
          required: true,
          ...(cliente_id && {
            where: { cliente_id }
          })
        },
        {
          model: sequelize.models.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre_completo'],
          required: false
        }
      ];

      return await this.findAll({
        include,
        order: [['fecha_movimiento', 'DESC']],
        limit
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEFINICIÓN DEL MODELO
  // ════════════════════════════════════════════════════════════════════════════

  MovimientoInventario.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // ────────────────────────────────────────────────────────────────────────
      // RELACIONES
      // ────────────────────────────────────────────────────────────────────────
      inventario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Producto afectado por el movimiento',
      },

      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Usuario que realizó el movimiento',
      },

      operacion_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Operación de ingreso/salida relacionada',
      },

      // ────────────────────────────────────────────────────────────────────────
      // TIPO Y DETALLE
      // ────────────────────────────────────────────────────────────────────────
      tipo: {
        type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'reserva', 'liberacion', 'transferencia'),
        allowNull: false,
        comment: 'Tipo de movimiento',
      },

      motivo: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Razón del movimiento (Compra, Venta, Ajuste, etc.)',
      },

      cantidad: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        comment: 'Cantidad movida (+ entrada, - salida)',
      },

      stock_anterior: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        comment: 'Stock antes del movimiento',
      },

      stock_resultante: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        comment: 'Stock después del movimiento',
      },

      // ────────────────────────────────────────────────────────────────────────
      // DOCUMENTACIÓN
      // ────────────────────────────────────────────────────────────────────────
      documento_referencia: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Factura, OC, remisión, etc.',
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales',
      },

      // ────────────────────────────────────────────────────────────────────────
      // UBICACIÓN (para transferencias)
      // ────────────────────────────────────────────────────────────────────────
      ubicacion_origen: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ubicación de origen',
      },

      ubicacion_destino: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ubicación de destino',
      },

      // ────────────────────────────────────────────────────────────────────────
      // COSTOS
      // ────────────────────────────────────────────────────────────────────────
      costo_unitario: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Costo unitario al momento del movimiento',
      },

      // ────────────────────────────────────────────────────────────────────────
      // AUDITORÍA
      // ────────────────────────────────────────────────────────────────────────
      fecha_movimiento: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora del movimiento',
      },

      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP desde donde se realizó',
      },
    },
    {
      sequelize,
      modelName: 'MovimientoInventario',
      tableName: 'movimientos_inventario',
      timestamps: false, // Usamos fecha_movimiento en lugar de createdAt/updatedAt
      indexes: [
        { fields: ['inventario_id'] },
        { fields: ['usuario_id'] },
        { fields: ['operacion_id'] },
        { fields: ['fecha_movimiento'] },
        { fields: ['tipo'] },
        { fields: ['documento_referencia'] },
        { name: 'idx_inventario_fecha', fields: ['inventario_id', 'fecha_movimiento'] },
      ],
      comment: 'Historial de movimientos de inventario - Trazabilidad ISO 9001',
    }
  );

  return MovimientoInventario;
};