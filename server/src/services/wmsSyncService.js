/**
 * ISTHO CRM - Servicio de Sincronización WMS
 *
 * Mapea datos del WMS Copérnico a los modelos del CRM.
 * Asocia todo por NIT del cliente.
 *
 * Flujos:
 * - syncProductos: WMS → Inventario
 * - syncEntrada: WMS → Operacion(ingreso) + OperacionDetalle + Inventario
 * - syncSalida: WMS → Operacion(salida) + OperacionDetalle + Inventario
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { sequelize, Cliente, Inventario, Operacion, OperacionDetalle, MovimientoInventario, CajaInventario } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const notificacionService = require('./notificacionService');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Buscar cliente por NIT
 * @param {string} nit
 * @returns {Object} cliente
 * @throws Error si no existe
 */
const findClienteByNit = async (nit) => {
  if (!nit) throw new Error('NIT es requerido');

  const cliente = await Cliente.findOne({
    where: { nit: nit.toString().trim() },
    attributes: ['id', 'razon_social', 'nit', 'codigo_cliente', 'estado'],
  });

  if (!cliente) {
    throw new Error(`Cliente con NIT ${nit} no encontrado en el CRM`);
  }

  if (cliente.estado !== 'activo') {
    throw new Error(`Cliente ${cliente.razon_social} (NIT: ${nit}) está ${cliente.estado}`);
  }

  return cliente;
};

/**
 * Generar número de operación automático
 * @param {string} tipo - 'ingreso' o 'salida'
 * @returns {string} ej: OP-2026-0042
 */
const generarNumeroOperacion = async () => {
  const year = new Date().getFullYear();
  const prefix = `OP-${year}-`;

  const ultima = await Operacion.findOne({
    where: {
      numero_operacion: { [Op.like]: `${prefix}%` },
    },
    order: [['numero_operacion', 'DESC']],
    attributes: ['numero_operacion'],
    paranoid: false,
  });

  let siguiente = 1;
  if (ultima) {
    const num = parseInt(ultima.numero_operacion.replace(prefix, ''), 10);
    if (!isNaN(num)) siguiente = num + 1;
  }

  return `${prefix}${String(siguiente).padStart(4, '0')}`;
};

// ============================================================================
// SYNC PRODUCTOS
// ============================================================================

/**
 * Sincronizar productos del WMS al inventario del CRM
 *
 * @param {Object} data
 * @param {string} data.nit - NIT del cliente
 * @param {Array} data.productos - [{ codigo, descripcion, unidad_medida? }]
 * @returns {Object} { creados, actualizados, errores }
 */
const syncProductos = async (data) => {
  const { nit, productos } = data;

  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    throw new Error('Se requiere un array de productos');
  }

  const cliente = await findClienteByNit(nit);
  const resultado = { creados: 0, actualizados: 0, errores: [], total: productos.length };

  const transaction = await sequelize.transaction();

  try {
    for (const prod of productos) {
      try {
        if (!prod.codigo || !prod.descripcion) {
          resultado.errores.push({ codigo: prod.codigo, error: 'Código y descripción son requeridos' });
          continue;
        }

        const [inventario, created] = await Inventario.findOrCreate({
          where: {
            cliente_id: cliente.id,
            sku: prod.codigo.toString().trim(),
          },
          defaults: {
            producto: prod.descripcion.trim(),
            unidad_medida: prod.unidad_medida || 'UND',
            cantidad: 0,
            codigo_wms: prod.codigo.toString().trim(),
            ultima_sincronizacion_wms: new Date(),
            fecha_ingreso: new Date(),
          },
          transaction,
        });

        if (created) {
          resultado.creados++;
        } else {
          // Actualizar descripción si cambió
          await inventario.update({
            producto: prod.descripcion.trim(),
            ultima_sincronizacion_wms: new Date(),
          }, { transaction });
          resultado.actualizados++;
        }
      } catch (err) {
        resultado.errores.push({ codigo: prod.codigo, error: err.message });
      }
    }

    await transaction.commit();
    logger.info(`[WMS Sync] Productos sincronizados para ${cliente.razon_social}: ${resultado.creados} creados, ${resultado.actualizados} actualizados`);

    // Notificar sync de productos solo si hubo cambios
    if (resultado.creados > 0 || resultado.errores.length > 0) {
      notificacionService.notificarSyncWms({
        exitosa: resultado.errores.length === 0,
        mensaje: `Productos sincronizados para ${cliente.razon_social}: ${resultado.creados} creados, ${resultado.actualizados} actualizados${resultado.errores.length > 0 ? `, ${resultado.errores.length} errores` : ''}.`,
        detalles: resultado,
      }).catch(() => {});
    }

    return resultado;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================================
// SYNC ENTRADA (INGRESO)
// ============================================================================

/**
 * Sincronizar una entrada del WMS
 *
 * @param {Object} data
 * @param {string} data.nit - NIT del cliente
 * @param {string} data.documento_origen - Número de documento WMS
 * @param {string} data.fecha_ingreso - Fecha de ingreso (YYYY-MM-DD)
 * @param {string} data.tipo_documento - Tipo de documento
 * @param {Array} data.detalles - Líneas de la entrada
 * @returns {Object} operación creada
 */
const syncEntrada = async (data) => {
  const { nit, documento_origen, fecha_ingreso, tipo_documento, detalles, observaciones } = data;

  if (!documento_origen) throw new Error('documento_origen es requerido');
  if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
    throw new Error('Se requiere al menos una línea de detalle');
  }

  const cliente = await findClienteByNit(nit);

  // Verificar que no exista ya esta operación
  const existente = await Operacion.findOne({
    where: { documento_wms: documento_origen.toString().trim() },
  });
  if (existente) {
    throw new Error(`Ya existe una operación con documento WMS: ${documento_origen} (${existente.numero_operacion})`);
  }

  const transaction = await sequelize.transaction();

  try {
    const numeroOperacion = await generarNumeroOperacion();

    // Calcular totales
    const totalUnidades = detalles.reduce((sum, d) => sum + (parseFloat(d.cantidad) || 0), 0);
    const skusUnicos = new Set(detalles.map((d) => d.producto)).size;

    // Crear operación
    const operacion = await Operacion.create({
      numero_operacion: numeroOperacion,
      tipo: 'ingreso',
      documento_wms: documento_origen.toString().trim(),
      cliente_id: cliente.id,
      fecha_documento: fecha_ingreso || new Date(),
      fecha_operacion: new Date(),
      tipo_documento_wms: tipo_documento || null,
      total_referencias: skusUnicos,
      total_unidades: totalUnidades,
      estado: 'pendiente',
      observaciones: observaciones || `Entrada sincronizada desde WMS - ${tipo_documento || 'N/A'}`,
    }, { transaction });

    // Crear detalles y actualizar inventario
    for (const linea of detalles) {
      if (!linea.producto || !linea.cantidad) continue;

      const sku = linea.producto.toString().trim();
      const cantidad = parseFloat(linea.cantidad) || 0;

      // Buscar descripción en el catálogo maestro
      const productoMaestro = await Inventario.findOne({
        where: { cliente_id: cliente.id, sku },
        transaction
      });

      // Lógica de descripción: Preferir maestro si lo que viene es el SKU o está vacío
      let descripcionProducto = (linea.descripcion || linea.producto || 'Producto S/D').toString().trim();
      if (productoMaestro?.producto && (descripcionProducto === sku || !linea.descripcion)) {
        descripcionProducto = productoMaestro.producto;
      }

      // Crear detalle de operación
      const detalle = await OperacionDetalle.create({
        operacion_id: operacion.id,
        sku,
        producto: descripcionProducto,
        cantidad,
        unidad_medida: linea.unidad_medida || 'UND',
        lote: linea.lote || null,
        lote_externo: linea.lote_externo || null,
        fecha_vencimiento: linea.fecha_vencimiento || null,
        documento_asociado: linea.documento_asociado || null,
        numero_caja: linea.caja ? linea.caja.toString() : null,
        peso: linea.peso || null,
      }, { transaction });

      // Upsert inventario por referencia (cliente_id + sku, SIN lote)
      const [inventario] = await Inventario.findOrCreate({
        where: {
          cliente_id: cliente.id,
          sku,
        },
        defaults: {
          producto: descripcionProducto,
          unidad_medida: linea.unidad_medida || 'UND',
          cantidad: 0,
          codigo_wms: sku,
          fecha_vencimiento: linea.fecha_vencimiento || null,
          ultima_sincronizacion_wms: new Date(),
          fecha_ingreso: new Date(),
        },
        transaction,
      });

      // Vincular detalle al inventario
      await detalle.update({ inventario_id: inventario.id }, { transaction });

      const stockAnterior = parseFloat(inventario.cantidad) || 0;
      await inventario.update({
        cantidad: stockAnterior + cantidad,
        ultima_sincronizacion_wms: new Date(),
        alertas_silenciadas: null, // Limpiar alertas silenciadas al cambiar stock
      }, { transaction });

      // Verificar si la caja ya existe para evitar duplicados si el WMS re-envía
      let numeroCaja = linea.caja ? linea.caja.toString() : null;
      if (numeroCaja) {
        const cajaExistente = await CajaInventario.findOne({
          where: { numero_caja: numeroCaja, estado: 'disponible' },
          transaction
        });
        if (cajaExistente) {
          logger.warn(`[WMS Sync] La caja ${numeroCaja} ya existe y está disponible. Omitiendo duplicado.`);
          continue; 
        }
      }

      // Crear caja en el nuevo modelo
      const nuevaCaja = await CajaInventario.create({
        inventario_id: inventario.id,
        operacion_id: operacion.id,
        operacion_detalle_id: detalle.id,
        numero_caja: numeroCaja,
        lote: linea.lote || null,
        lote_externo: linea.lote_externo || null,
        ubicacion: linea.ubicacion || null,
        cantidad,
        peso: linea.peso || null,
        unidad_medida: linea.unidad_medida || 'UND',
        tipo: 'entrada',
        estado: 'disponible',
        documento_asociado: linea.documento_asociado || null,
        fecha_vencimiento: linea.fecha_vencimiento || null,
        fecha_movimiento: new Date(),
      }, { transaction });

      // Si no venía número de caja, podemos asignar el ID como número único
      if (!numeroCaja) {
        await nuevaCaja.update({ numero_caja: `CJ-${nuevaCaja.id.toString().padStart(6, '0')}` }, { transaction });
      }

      // Registrar movimiento
      await MovimientoInventario.create({
        inventario_id: inventario.id,
        operacion_id: operacion.id,
        tipo: 'entrada',
        motivo: 'Ingreso WMS',
        cantidad,
        stock_anterior: stockAnterior,
        stock_resultante: stockAnterior + cantidad,
        documento_referencia: documento_origen,
        observaciones: `Sync WMS - ${tipo_documento || 'Ingreso'}`,
        fecha_movimiento: new Date(),
      }, { transaction });
    }

    await transaction.commit();

    logger.info(`[WMS Sync] Entrada creada: ${numeroOperacion} para ${cliente.razon_social} (${detalles.length} líneas, ${totalUnidades} unidades)`);

    const resultado = {
      operacion_id: operacion.id,
      numero_operacion: numeroOperacion,
      cliente_id: cliente.id,
      cliente: cliente.razon_social,
      documento_wms: documento_origen,
      total_lineas: detalles.length,
      total_unidades: totalUnidades,
      estado: 'pendiente',
    };

    // Notificar usuarios del cliente + admins
    notificacionService.notificarEntradaWms(resultado).catch(() => {});

    return resultado;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================================
// SYNC SALIDA (PICKING)
// ============================================================================

/**
 * Sincronizar una salida/picking del WMS
 *
 * @param {Object} data
 * @param {string} data.nit - NIT del cliente
 * @param {string} data.numero_picking - Número de picking del WMS
 * @param {string} data.documento_wms - Documento WMS asociado
 * @param {string} data.sucursal_entrega - Sucursal destino
 * @param {string} data.ciudad_destino - Ciudad destino
 * @param {Array} data.detalles - Líneas del picking
 * @returns {Object} operación creada
 */
const syncSalida = async (data) => {
  const { nit, numero_picking, documento_wms, sucursal_entrega, ciudad_destino, detalles, observaciones } = data;

  if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
    throw new Error('Se requiere al menos una línea de detalle');
  }

  const cliente = await findClienteByNit(nit);

  // Verificar duplicados por picking
  const docRef = numero_picking || documento_wms;
  if (docRef) {
    const existente = await Operacion.findOne({
      where: {
        [Op.or]: [
          { numero_picking: docRef },
          { documento_wms: docRef },
        ],
      },
    });
    if (existente) {
      throw new Error(`Ya existe una operación con picking/documento: ${docRef} (${existente.numero_operacion})`);
    }
  }

  const transaction = await sequelize.transaction();

  try {
    const numeroOperacion = await generarNumeroOperacion();

    const totalUnidades = detalles.reduce((sum, d) => sum + (parseFloat(d.cantidad) || 0), 0);
    const skusUnicos = new Set(detalles.map((d) => d.producto)).size;

    // Crear operación
    const operacion = await Operacion.create({
      numero_operacion: numeroOperacion,
      tipo: 'salida',
      documento_wms: documento_wms || numero_picking || null,
      numero_picking: numero_picking || null,
      cliente_id: cliente.id,
      fecha_operacion: new Date(),
      sucursal_entrega: sucursal_entrega || null,
      ciudad_destino: ciudad_destino || null,
      destino: sucursal_entrega ? `${sucursal_entrega}${ciudad_destino ? `, ${ciudad_destino}` : ''}` : null,
      total_referencias: skusUnicos,
      total_unidades: totalUnidades,
      estado: 'pendiente',
      observaciones: observaciones || `Salida sincronizada desde WMS - Picking ${numero_picking || 'N/A'}`,
    }, { transaction });

    // Crear detalles y actualizar inventario
    for (const linea of detalles) {
      if (!linea.producto || !linea.cantidad) continue;

      const sku = linea.producto.toString().trim();
      const cantidad = parseFloat(linea.cantidad) || 0;

      // Buscar descripción en el catálogo maestro
      const productoMaestro = await Inventario.findOne({
        where: { cliente_id: cliente.id, sku },
        transaction
      });

      // Lógica de descripción: Preferir maestro si lo que viene es el SKU o está vacío
      let descripcionProducto = (linea.descripcion || linea.producto || 'Producto S/D').toString().trim();
      if (productoMaestro?.producto && (descripcionProducto === sku || !linea.descripcion)) {
        descripcionProducto = productoMaestro.producto;
      }
     const detalle = await OperacionDetalle.create({
        operacion_id: operacion.id,
        sku,
        producto: descripcionProducto,
        cantidad,
        unidad_medida: linea.unidad_medida || 'UND',
        lote: linea.lote_interno || linea.lote || null,
        lote_externo: linea.lote_externo || null,
        fecha_vencimiento: linea.fecha_vencimiento || null,
        numero_caja: linea.caja ? linea.caja.toString() : null,
        documento_asociado: linea.pedido || linea.documento_asociado || null,
        peso: linea.peso || null,
      }, { transaction });

      // Buscar inventario por referencia (cliente_id + sku, SIN lote)
      const inventario = await Inventario.findOne({
        where: {
          cliente_id: cliente.id,
          sku,
        },
        transaction,
      });

      if (inventario) {
        // Vincular detalle al inventario
        await detalle.update({ inventario_id: inventario.id }, { transaction });

        const stockAnterior = parseFloat(inventario.cantidad) || 0;
        const nuevoStock = Math.max(0, stockAnterior - cantidad);

        await inventario.update({
          cantidad: nuevoStock,
          ultima_sincronizacion_wms: new Date(),
          alertas_silenciadas: null, // Limpiar alertas silenciadas al cambiar stock
        }, { transaction });

        // Manejo de cajas para la salida
        const numeroCajaSalida = linea.caja ? linea.caja.toString() : null;
        
        if (numeroCajaSalida) {
          // Intentar encontrar la caja específica que está saliendo
          const cajaStock = await CajaInventario.findOne({
            where: { 
              numero_caja: numeroCajaSalida, 
              inventario_id: inventario.id,
              estado: 'disponible' 
            },
            transaction
          });

          if (cajaStock) {
            // Marcar la caja original como despachada
            await cajaStock.update({ 
              estado: 'despachada',
              operacion_id: operacion.id // Vincular a la salida
            }, { transaction });
          }
        }

        // Crear registro de movimiento de caja (tipo salida)
        await CajaInventario.create({
          inventario_id: inventario.id,
          operacion_id: operacion.id,
          operacion_detalle_id: detalle.id,
          numero_caja: numeroCajaSalida,
          lote: linea.lote_interno || linea.lote || null,
          lote_externo: linea.lote_externo || null,
          ubicacion: linea.ubicacion || null,
          cantidad,
          peso: linea.peso || null,
          unidad_medida: linea.unidad_medida || 'UND',
          tipo: 'salida',
          estado: 'despachada',
          documento_asociado: linea.pedido || linea.documento_asociado || null,
          fecha_vencimiento: linea.fecha_vencimiento || null,
          fecha_movimiento: new Date(),
        }, { transaction });

        await MovimientoInventario.create({
          inventario_id: inventario.id,
          operacion_id: operacion.id,
          tipo: 'salida',
          motivo: 'Salida WMS',
          cantidad,
          stock_anterior: stockAnterior,
          stock_resultante: nuevoStock,
          documento_referencia: numero_picking || documento_wms,
          observaciones: `Sync WMS - Picking ${numero_picking || 'N/A'}`,
          fecha_movimiento: new Date(),
        }, { transaction });
      }
    }

    await transaction.commit();

    logger.info(`[WMS Sync] Salida creada: ${numeroOperacion} para ${cliente.razon_social} (Picking: ${numero_picking}, ${detalles.length} líneas)`);

    const resultado = {
      operacion_id: operacion.id,
      numero_operacion: numeroOperacion,
      cliente_id: cliente.id,
      cliente: cliente.razon_social,
      numero_picking,
      total_lineas: detalles.length,
      total_unidades: totalUnidades,
      estado: 'pendiente',
    };

    // Notificar usuarios del cliente + admins
    notificacionService.notificarSalidaWms(resultado).catch(() => {});

    return resultado;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================================
// SYNC KARDEX (AJUSTE DE UNIDADES)
// ============================================================================

/**
 * Sincronizar un ajuste Kardex del WMS
 *
 * El Kardex suma o resta unidades a cajas/estibas existentes.
 * Reglas:
 * - Suma a caja disponible: actualiza cantidad
 * - Resta a caja disponible: actualiza cantidad. Si llega a 0 → estado 'inactiva', se libera ubicación
 * - Suma a caja inactiva (por resta previa): reactiva → 'disponible', ubicación = zona recepción
 * - Suma a caja despachada (por picking previo): reactiva → 'disponible', ubicación = zona recepción
 * - Resta a caja despachada: NO permitido
 *
 * @param {Object} data
 * @param {string} data.nit - NIT del cliente
 * @param {string} data.documento_origen - Número de documento WMS
 * @param {string} data.fecha_ingreso - Fecha del ajuste (YYYY-MM-DD)
 * @param {string} data.motivo - Motivo del ajuste (lista predefinida o texto libre)
 * @param {Array} data.detalles - Líneas del ajuste
 * @param {string} data.detalles[].caja - Número de caja/estiba
 * @param {string} data.detalles[].producto - SKU del producto
 * @param {number} data.detalles[].cantidad - Cantidad a ajustar (positivo=suma, negativo=resta)
 * @param {string} [data.observaciones] - Observaciones adicionales
 * @returns {Object} operación creada
 */
const syncKardex = async (data) => {
  const { nit, documento_origen, fecha_ingreso, motivo, detalles, observaciones } = data;

  if (!motivo) throw new Error('motivo es requerido para Kardex');
  if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
    throw new Error('Se requiere al menos una línea de detalle');
  }

  const cliente = await findClienteByNit(nit);

  // Verificar duplicados por documento_origen si viene
  if (documento_origen) {
    const existente = await Operacion.findOne({
      where: { documento_wms: documento_origen.toString().trim(), tipo_documento_wms: 'CR' },
    });
    if (existente) {
      throw new Error(`Ya existe un Kardex con documento: ${documento_origen} (${existente.numero_operacion})`);
    }
  }

  const transaction = await sequelize.transaction();

  try {
    const numeroOperacion = await generarNumeroOperacion();

    const totalUnidades = detalles.reduce((sum, d) => sum + Math.abs(parseFloat(d.cantidad) || 0), 0);
    const skusUnicos = new Set(detalles.map((d) => d.producto)).size;

    // Crear operación tipo kardex
    // Si no viene documento_origen, usar el motivo como documento_wms para que
    // el listado de auditoría muestre algo significativo en la columna "Documento"
    const documentoWms = documento_origen
      ? documento_origen.toString().trim()
      : motivo.trim();

    const operacion = await Operacion.create({
      numero_operacion: numeroOperacion,
      tipo: 'kardex',
      documento_wms: documentoWms,
      cliente_id: cliente.id,
      fecha_documento: fecha_ingreso || new Date(),
      fecha_operacion: new Date(),
      tipo_documento_wms: 'CR',
      motivo_kardex: motivo,
      total_referencias: skusUnicos,
      total_unidades: totalUnidades,
      estado: 'pendiente',
      observaciones: observaciones || `Kardex WMS - ${motivo}`,
    }, { transaction });

    // Procesar cada línea de ajuste
    let lineasProcesadas = 0;
    let unidadesProcesadas = 0;

    for (const linea of detalles) {
      if (!linea.producto || linea.cantidad === undefined) continue;

      const sku = linea.producto.toString().trim();
      const cantidad = parseFloat(linea.cantidad) || 0;
      const numeroCaja = linea.caja ? linea.caja.toString() : null;
      const esSuma = cantidad > 0;

      // Buscar inventario por referencia (antes de crear detalle)
      const inventario = await Inventario.findOne({
        where: { cliente_id: cliente.id, sku },
        transaction,
      });

      if (!inventario) {
        logger.warn(`[WMS Sync] Kardex: SKU ${sku} no encontrado en inventario para ${cliente.razon_social}. Omitiendo.`);
        continue;
      }

      // Validar resta en caja despachada ANTES de crear el detalle
      let cajaExistente = null;
      if (numeroCaja) {
        cajaExistente = await CajaInventario.findOne({
          where: {
            numero_caja: numeroCaja,
            inventario_id: inventario.id,
          },
          order: [['created_at', 'DESC']],
          transaction
        });

        if (cajaExistente && !esSuma && cajaExistente.estado === 'despachada') {
          logger.warn(`[WMS Sync] Kardex: No se puede restar a caja ${numeroCaja} en estado 'despachada'. Omitiendo.`);
          continue;
        }
      }

      // Buscar descripción en el catálogo maestro
      let descripcionProducto = (linea.descripcion || linea.producto || 'Producto S/D').toString().trim();
      if (inventario.producto && (descripcionProducto === sku || !linea.descripcion)) {
        descripcionProducto = inventario.producto;
      }

      // Crear detalle de operación (documento_asociado = motivo del kardex)
      const detalle = await OperacionDetalle.create({
        operacion_id: operacion.id,
        sku,
        producto: descripcionProducto,
        cantidad: Math.abs(cantidad),
        unidad_medida: linea.unidad_medida || 'UND',
        lote: linea.lote || null,
        lote_externo: linea.lote_externo || null,
        fecha_vencimiento: linea.fecha_vencimiento || null,
        documento_asociado: motivo, // El motivo va como documento
        numero_caja: numeroCaja,
        peso: linea.peso || null,
        inventario_id: inventario.id,
      }, { transaction });

      lineasProcesadas++;
      unidadesProcesadas += Math.abs(cantidad);

      const stockAnterior = parseFloat(inventario.cantidad) || 0;

      if (cajaExistente) {

        const cantidadCajaAnterior = parseFloat(cajaExistente.cantidad) || 0;
        const nuevaCantidadCaja = esSuma
          ? cantidadCajaAnterior + Math.abs(cantidad)
          : Math.max(0, cantidadCajaAnterior - Math.abs(cantidad));

        // Determinar nuevo estado de la caja
        let nuevoEstado = cajaExistente.estado;
        let nuevaUbicacion = cajaExistente.ubicacion;

        if (esSuma && (cajaExistente.estado === 'inactiva' || cajaExistente.estado === 'despachada')) {
          // Reactivar caja → disponible, zona recepción
          nuevoEstado = 'disponible';
          nuevaUbicacion = 'RECEPCIÓN';
        } else if (!esSuma && nuevaCantidadCaja <= 0) {
          // Resta a 0 → inactiva, liberar ubicación
          nuevoEstado = 'inactiva';
          nuevaUbicacion = null;
        }

        await cajaExistente.update({
          cantidad: nuevaCantidadCaja,
          estado: nuevoEstado,
          ubicacion: nuevaUbicacion,
          operacion_id: operacion.id,
          fecha_movimiento: new Date(),
        }, { transaction });
      }

      // Actualizar inventario maestro
      const nuevoStock = esSuma
        ? stockAnterior + Math.abs(cantidad)
        : Math.max(0, stockAnterior - Math.abs(cantidad));

      await inventario.update({
        cantidad: nuevoStock,
        ultima_sincronizacion_wms: new Date(),
        alertas_silenciadas: null,
      }, { transaction });

      // Registrar movimiento
      await MovimientoInventario.create({
        inventario_id: inventario.id,
        operacion_id: operacion.id,
        tipo: esSuma ? 'entrada' : 'salida',
        motivo: `Kardex WMS - ${motivo}`,
        cantidad: Math.abs(cantidad),
        stock_anterior: stockAnterior,
        stock_resultante: nuevoStock,
        documento_referencia: documento_origen || motivo,
        observaciones: `Sync WMS Kardex - ${esSuma ? 'Suma' : 'Resta'} - ${motivo}`,
        fecha_movimiento: new Date(),
      }, { transaction });
    }

    // Actualizar totales reales en la operación (descontando líneas omitidas)
    if (lineasProcesadas !== detalles.length || unidadesProcesadas !== totalUnidades) {
      await operacion.update({
        total_unidades: unidadesProcesadas,
        total_referencias: lineasProcesadas,
      }, { transaction });
    }

    await transaction.commit();

    logger.info(`[WMS Sync] Kardex creado: ${numeroOperacion} para ${cliente.razon_social} (${lineasProcesadas}/${detalles.length} líneas procesadas, motivo: ${motivo})`);

    const resultado = {
      operacion_id: operacion.id,
      numero_operacion: numeroOperacion,
      cliente_id: cliente.id,
      cliente: cliente.razon_social,
      motivo,
      total_lineas: lineasProcesadas,
      total_unidades: unidadesProcesadas,
      lineas_omitidas: detalles.length - lineasProcesadas,
      estado: 'pendiente',
    };

    // Notificar usuarios del cliente + admins
    notificacionService.notificarEntradaWms({
      ...resultado,
      documento_wms: documento_origen || motivo,
    }).catch(() => {});

    return resultado;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  findClienteByNit,
  syncProductos,
  syncEntrada,
  syncSalida,
  syncKardex,
};
