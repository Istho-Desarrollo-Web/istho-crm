/**
 * ISTHO CRM - Servicio de Generación PDF
 * 
 * Genera documentos PDF con diseño corporativo.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

// Colores corporativos
const COLORES = {
  primario: '#1A237E',
  secundario: '#283593',
  texto: '#333333',
  textoClaro: '#666666',
  exito: '#4CAF50',
  advertencia: '#FF9800',
  error: '#F44336',
  linea: '#E0E0E0',
  fondoClaro: '#F5F5F5'
};

/**
 * Agregar encabezado corporativo
 */
const agregarEncabezado = (doc, titulo) => {
  // Fondo del header
  doc.rect(0, 0, doc.page.width, 80).fill(COLORES.primario);
  
  // Logo/Nombre empresa
  doc.fontSize(24)
     .fillColor('#FFFFFF')
     .text('ISTHO S.A.S.', 50, 25, { continued: false });
  
  // Título del reporte
  doc.fontSize(12)
     .fillColor('#FFFFFF')
     .text(titulo, 50, 55);
  
  // Fecha
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.fontSize(10)
     .text(fecha, doc.page.width - 200, 55, { width: 150, align: 'right' });
  
  doc.moveDown(3);
  doc.y = 100;
};

/**
 * Agregar pie de página
 */
const agregarPiePagina = (doc, numeroPagina) => {
  const bottom = doc.page.height - 50;
  
  doc.fontSize(8)
     .fillColor(COLORES.textoClaro)
     .text(
       'ISTHO S.A.S. - Centro Logístico Industrial del Norte, Bodega 130 - Girardota, Antioquia',
       50,
       bottom,
       { align: 'center', width: doc.page.width - 100 }
     );
  
  doc.text(
    `Página ${numeroPagina}`,
    50,
    bottom + 15,
    { align: 'center', width: doc.page.width - 100 }
  );
};

/**
 * Generar tabla simple
 */
const generarTabla = (doc, headers, rows, opciones = {}) => {
  const {
    anchoColumnas = [],
    alineacion = [],
    startX = 50,
    startY = doc.y
  } = opciones;
  
  const anchoTotal = doc.page.width - 100;
  const anchoPorColumna = anchoTotal / headers.length;
  
  let y = startY;
  
  // Encabezados
  doc.rect(startX, y, anchoTotal, 25).fill(COLORES.primario);
  
  let x = startX;
  headers.forEach((header, i) => {
    const ancho = anchoColumnas[i] || anchoPorColumna;
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text(header, x + 5, y + 7, { width: ancho - 10, align: 'left' });
    x += ancho;
  });
  
  y += 25;
  
  // Filas
  rows.forEach((row, rowIndex) => {
    // Nueva página si es necesario
    if (y > doc.page.height - 100) {
      doc.addPage();
      agregarEncabezado(doc, 'REPORTE (continuación)');
      y = doc.y;
    }
    
    // Fondo alternado
    if (rowIndex % 2 === 1) {
      doc.rect(startX, y, anchoTotal, 20).fill(COLORES.fondoClaro);
    }
    
    x = startX;
    row.forEach((cell, i) => {
      const ancho = anchoColumnas[i] || anchoPorColumna;
      const align = alineacion[i] || 'left';
      
      doc.fontSize(9)
         .fillColor(COLORES.texto)
         .text(String(cell || ''), x + 5, y + 5, { width: ancho - 10, align });
      x += ancho;
    });
    
    // Línea separadora
    doc.strokeColor(COLORES.linea)
       .moveTo(startX, y + 20)
       .lineTo(startX + anchoTotal, y + 20)
       .stroke();
    
    y += 20;
  });
  
  doc.y = y + 10;
  return y;
};

/**
 * Generar PDF de operaciones
 */
const generarPDFOperaciones = async (operaciones, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'LETTER',
        layout: 'landscape',
        margin: 50
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      agregarEncabezado(doc, 'REPORTE DE OPERACIONES');
      
      // Resumen
      const totalIngresos = operaciones.filter(o => o.tipo === 'ingreso').length;
      const totalSalidas = operaciones.filter(o => o.tipo === 'salida').length;
      const totalUnidades = operaciones.reduce((sum, o) => sum + (parseFloat(o.total_unidades) || 0), 0);
      
      doc.fontSize(11)
         .fillColor(COLORES.texto)
         .text(`Total de operaciones: ${operaciones.length}`, 50)
         .text(`Ingresos: ${totalIngresos} | Salidas: ${totalSalidas}`)
         .text(`Total unidades: ${totalUnidades.toLocaleString('es-CO')}`)
         .moveDown();
      
      // Tabla
      const headers = ['N° Operación', 'Tipo', 'Cliente', 'Fecha', 'Estado', 'Unidades', 'Averías'];
      const rows = operaciones.map(op => [
        op.numero_operacion,
        op.tipo?.toUpperCase(),
        (op.cliente?.razon_social || 'N/A').substring(0, 25),
        op.fecha_operacion ? new Date(op.fecha_operacion).toLocaleDateString('es-CO') : '',
        op.estado?.toUpperCase(),
        parseFloat(op.total_unidades || 0).toLocaleString('es-CO'),
        op.total_averias || 0
      ]);
      
      generarTabla(doc, headers, rows, {
        anchoColumnas: [100, 60, 180, 80, 80, 80, 60],
        alineacion: ['left', 'center', 'left', 'center', 'center', 'right', 'right']
      });
      
      agregarPiePagina(doc, 1);
      
      doc.end();
      
      logger.info('PDF de operaciones generado:', { registros: operaciones.length });
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de inventario
 */
const generarPDFInventario = async (inventario, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'LETTER',
        layout: 'landscape',
        margin: 50
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      agregarEncabezado(doc, 'REPORTE DE INVENTARIO');
      
      // Resumen
      const totalItems = inventario.length;
      const totalUnidades = inventario.reduce((sum, i) => sum + (parseFloat(i.cantidad) || 0), 0);
      const valorTotal = inventario.reduce((sum, i) => {
        return sum + ((parseFloat(i.cantidad) || 0) * (parseFloat(i.costo_unitario) || 0));
      }, 0);
      
      doc.fontSize(11)
         .fillColor(COLORES.texto)
         .text(`Total referencias: ${totalItems}`)
         .text(`Total unidades: ${totalUnidades.toLocaleString('es-CO')}`)
         .text(`Valor total inventario: $${valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`)
         .moveDown();
      
      const headers = ['SKU', 'Producto', 'Cliente', 'Cantidad', 'Ubicación', 'Vencimiento', 'Estado'];
      const rows = inventario.map(item => [
        item.sku,
        (item.producto || '').substring(0, 30),
        (item.cliente?.razon_social || 'N/A').substring(0, 20),
        parseFloat(item.cantidad || 0).toLocaleString('es-CO'),
        item.ubicacion || '',
        item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-CO') : '',
        item.estado?.toUpperCase()
      ]);
      
      generarTabla(doc, headers, rows, {
        anchoColumnas: [80, 180, 120, 70, 70, 80, 80],
        alineacion: ['left', 'left', 'left', 'right', 'center', 'center', 'center']
      });
      
      agregarPiePagina(doc, 1);
      
      doc.end();
      
      logger.info('PDF de inventario generado:', { registros: inventario.length });
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de detalle de operación
 */
const generarPDFDetalleOperacion = async (operacion) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'LETTER',
        margin: 50
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      agregarEncabezado(doc, `DETALLE DE OPERACIÓN - ${operacion.numero_operacion}`);
      
      // Información general
      doc.fontSize(12)
         .fillColor(COLORES.primario)
         .text('INFORMACIÓN GENERAL', 50)
         .moveDown(0.5);
      
      const info = [
        ['N° Operación:', operacion.numero_operacion],
        ['Documento WMS:', operacion.documento_wms],
        ['Tipo:', operacion.tipo?.toUpperCase()],
        ['Estado:', operacion.estado?.toUpperCase()],
        ['Cliente:', operacion.cliente?.razon_social || 'N/A'],
        ['Fecha:', operacion.fecha_operacion ? new Date(operacion.fecha_operacion).toLocaleDateString('es-CO') : ''],
      ];
      
      info.forEach(([label, value]) => {
        doc.fontSize(10)
           .fillColor(COLORES.texto)
           .text(label, 50, doc.y, { continued: true, width: 120 })
           .text(value || 'N/A', { width: 400 });
      });
      
      doc.moveDown();
      
      // Transporte
      doc.fontSize(12)
         .fillColor(COLORES.primario)
         .text('INFORMACIÓN DE TRANSPORTE', 50)
         .moveDown(0.5);
      
      const transporte = [
        ['Origen:', operacion.origen || 'N/A'],
        ['Destino:', operacion.destino || 'N/A'],
        ['Placa:', operacion.vehiculo_placa || 'N/A'],
        ['Conductor:', operacion.conductor_nombre || 'N/A'],
        ['Cédula:', operacion.conductor_cedula || 'N/A'],
        ['Teléfono:', operacion.conductor_telefono || 'N/A'],
      ];
      
      transporte.forEach(([label, value]) => {
        doc.fontSize(10)
           .fillColor(COLORES.texto)
           .text(label, 50, doc.y, { continued: true, width: 120 })
           .text(value, { width: 400 });
      });
      
      doc.moveDown();
      
      // Detalle de productos
      doc.fontSize(12)
         .fillColor(COLORES.primario)
         .text('DETALLE DE PRODUCTOS', 50)
         .moveDown(0.5);
      
      const headers = ['SKU', 'Producto', 'Cantidad', 'U.M.', 'Lote', 'Averías'];
      const rows = (operacion.detalles || []).map(d => [
        d.sku,
        (d.producto || '').substring(0, 25),
        parseFloat(d.cantidad || 0).toLocaleString('es-CO'),
        d.unidad_medida || 'UND',
        d.lote || '',
        d.cantidad_averia || 0
      ]);
      
      generarTabla(doc, headers, rows, {
        anchoColumnas: [80, 180, 70, 50, 80, 50],
        alineacion: ['left', 'left', 'right', 'center', 'left', 'right']
      });
      
      // Totales
      doc.fontSize(11)
         .fillColor(COLORES.texto)
         .text(`Total Referencias: ${operacion.total_referencias || 0}`, 50)
         .text(`Total Unidades: ${parseFloat(operacion.total_unidades || 0).toLocaleString('es-CO')}`)
         .text(`Total Averías: ${operacion.total_averias || 0}`);
      
      agregarPiePagina(doc, 1);
      
      doc.end();
      
      logger.info('PDF de detalle generado:', { operacion: operacion.numero_operacion });
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de clientes
 */
const generarPDFClientes = async (clientes, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE CLIENTES');

      // Resumen
      const activos = clientes.filter(c => c.estado === 'activo').length;
      const inactivos = clientes.length - activos;

      doc.fontSize(11)
         .fillColor(COLORES.texto)
         .text(`Total de clientes: ${clientes.length}`)
         .text(`Activos: ${activos} | Inactivos: ${inactivos}`)
         .moveDown();

      // Total productos
      const totalProductos = clientes.reduce((sum, c) => sum + (parseInt(c.getDataValue?.('total_productos') || c.total_productos || 0)), 0);

      doc.text(`Total productos registrados: ${totalProductos.toLocaleString('es-CO')}`)
         .moveDown();

      // Tabla (ancho disponible LETTER landscape: ~692pt)
      const headers = ['Código', 'Razón Social', 'NIT', 'Prod.', 'Ciudad', 'Teléfono', 'Email', 'Estado'];
      const rows = clientes.map(c => [
        c.codigo_cliente || '',
        (c.razon_social || '').substring(0, 28),
        c.nit || '',
        String(parseInt(c.getDataValue?.('total_productos') || c.total_productos || 0)),
        (c.ciudad || '').substring(0, 14),
        c.telefono || '',
        (c.email || '').substring(0, 24),
        (c.estado || '').toUpperCase()
      ]);

      generarTabla(doc, headers, rows, {
        anchoColumnas: [60, 165, 85, 40, 72, 75, 135, 60],
        alineacion: ['left', 'left', 'left', 'center', 'left', 'left', 'left', 'center']
      });

      agregarPiePagina(doc, 1);

      doc.end();

      logger.info('PDF de clientes generado:', { registros: clientes.length });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generarPDFOperaciones,
  generarPDFInventario,
  generarPDFDetalleOperacion,
  generarPDFClientes
};