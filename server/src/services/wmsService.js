/**
 * ISTHO CRM - Servicio WMS (Simulación)
 * 
 * Simula la conexión al WMS de ISTHO.
 * En producción, esto se conectará a la base de datos real del WMS.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const logger = require('../utils/logger');

/**
 * Datos de prueba para simular documentos del WMS
 */
const documentosWMS = {
  // Ingresos
  'ING-2026-0001': {
    tipo: 'ingreso',
    numero_documento: 'ING-2026-0001',
    fecha_documento: '2026-01-08',
    cliente_codigo: 'CLI-0001',
    cliente_nombre: 'Lácteos Betania S.A.S.',
    proveedor: 'Colanta S.A.',
    observaciones: 'Ingreso de mercancía refrigerada',
    productos: [
      { sku: 'LECHE-001', producto: 'Leche Entera 1L', cantidad: 500, unidad_medida: 'UND', lote: 'L2026-001', fecha_vencimiento: '2026-03-15' },
      { sku: 'LECHE-002', producto: 'Leche Deslactosada 1L', cantidad: 300, unidad_medida: 'UND', lote: 'L2026-002', fecha_vencimiento: '2026-03-20' },
      { sku: 'YOGURT-001', producto: 'Yogurt Natural 1L', cantidad: 200, unidad_medida: 'UND', lote: 'L2026-003', fecha_vencimiento: '2026-02-28' }
    ]
  },
  'ING-2026-0002': {
    tipo: 'ingreso',
    numero_documento: 'ING-2026-0002',
    fecha_documento: '2026-01-08',
    cliente_codigo: 'CLI-0001',
    cliente_nombre: 'Lácteos Betania S.A.S.',
    proveedor: 'Alpina S.A.',
    observaciones: 'Importación desde Ecuador',
    productos: [
      { sku: 'QUESO-001', producto: 'Queso Fresco 500g', cantidad: 150, unidad_medida: 'UND', lote: 'Q2026-001', fecha_vencimiento: '2026-02-15' },
      { sku: 'QUESO-002', producto: 'Queso Mozarella 400g', cantidad: 100, unidad_medida: 'UND', lote: 'Q2026-002', fecha_vencimiento: '2026-02-20' }
    ]
  },
  'ING-2026-0003': {
    tipo: 'ingreso',
    numero_documento: 'ING-2026-0003',
    fecha_documento: '2026-01-08',
    cliente_codigo: 'CLI-0001',
    cliente_nombre: 'Lácteos Betania S.A.S.',
    proveedor: 'Alpina S.A.',
    observaciones: 'Importación desde Ecuador',
    productos: [
      { sku: 'QUESO-001', producto: 'Queso Fresco 500g', cantidad: 150, unidad_medida: 'UND', lote: 'Q2026-001', fecha_vencimiento: '2026-02-15' },
      { sku: 'QUESO-002', producto: 'Queso Mozarella 400g', cantidad: 100, unidad_medida: 'UND', lote: 'Q2026-002', fecha_vencimiento: '2026-02-20' }
    ]
  },
  // Salidas
  'SAL-2026-0001': {
    tipo: 'salida',
    numero_documento: 'SAL-2026-0001',
    fecha_documento: '2026-01-08',
    cliente_codigo: 'CLI-0001',
    cliente_nombre: 'Lácteos Betania S.A.S.',
    destino: 'Almacén Central Bogotá',
    observaciones: 'Despacho urgente',
    productos: [
      { sku: 'LECHE-001', producto: 'Leche Entera 1L', cantidad: 200, unidad_medida: 'UND', lote: 'L2026-001', fecha_vencimiento: '2026-03-15' },
      { sku: 'YOGURT-001', producto: 'Yogurt Natural 1L', cantidad: 100, unidad_medida: 'UND', lote: 'L2026-003', fecha_vencimiento: '2026-02-28' }
    ]
  },
  'SAL-2026-0002': {
    tipo: 'salida',
    numero_documento: 'SAL-2026-0002',
    fecha_documento: '2026-01-09',
    cliente_codigo: 'CLI-0001',
    cliente_nombre: 'Lácteos Betania S.A.S.',
    destino: 'Tienda Norte Medellín',
    observaciones: 'Pedido semanal',
    productos: [
      { sku: 'LECHE-002', producto: 'Leche Deslactosada 1L', cantidad: 150, unidad_medida: 'UND', lote: 'L2026-002', fecha_vencimiento: '2026-03-20' },
      { sku: 'QUESO-001', producto: 'Queso Fresco 500g', cantidad: 50, unidad_medida: 'UND', lote: 'Q2026-001', fecha_vencimiento: '2026-02-15' }
    ]
  }
};

/**
 * Buscar documento en el WMS
 * @param {string} numeroDocumento - Número del documento a buscar
 * @returns {Object|null} Documento encontrado o null
 */
const buscarDocumento = async (numeroDocumento) => {
  try {
    logger.info(`[WMS] Buscando documento: ${numeroDocumento}`);
    
    // Simular delay de consulta a BD
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const documento = documentosWMS[numeroDocumento.toUpperCase()];
    
    if (documento) {
      logger.info(`[WMS] Documento encontrado: ${numeroDocumento}`);
      return { ...documento };
    }
    
    logger.warn(`[WMS] Documento no encontrado: ${numeroDocumento}`);
    return null;
    
  } catch (error) {
    logger.error('[WMS] Error al buscar documento:', { message: error.message });
    throw error;
  }
};

/**
 * Listar documentos pendientes por tipo
 * @param {string} tipo - 'ingreso' o 'salida'
 * @param {string} clienteCodigo - Código del cliente (opcional)
 * @returns {Array} Lista de documentos
 */
const listarDocumentosPendientes = async (tipo, clienteCodigo = null) => {
  try {
    logger.info(`[WMS] Listando documentos: tipo=${tipo}, cliente=${clienteCodigo}`);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    let documentos = Object.values(documentosWMS).filter(d => d.tipo === tipo);
    
    if (clienteCodigo) {
      documentos = documentos.filter(d => d.cliente_codigo === clienteCodigo);
    }
    
    // Retornar solo resumen (sin detalle de productos)
    return documentos.map(d => ({
      numero_documento: d.numero_documento,
      fecha_documento: d.fecha_documento,
      cliente_codigo: d.cliente_codigo,
      cliente_nombre: d.cliente_nombre,
      total_productos: d.productos.length,
      total_unidades: d.productos.reduce((sum, p) => sum + p.cantidad, 0)
    }));
    
  } catch (error) {
    logger.error('[WMS] Error al listar documentos:', { message: error.message });
    throw error;
  }
};

/**
 * Validar si un documento existe y no ha sido procesado
 * @param {string} numeroDocumento 
 * @returns {boolean}
 */
const validarDocumento = async (numeroDocumento) => {
  const documento = await buscarDocumento(numeroDocumento);
  return documento !== null;
};

module.exports = {
  buscarDocumento,
  listarDocumentosPendientes,
  validarDocumento
};