/**
 * ISTHO CRM - Servicio de Exportación Excel (v2.0)
 *
 * Genera archivos Excel con formato profesional, resúmenes ejecutivos,
 * autofiltros, formato condicional y totales.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const ExcelJS = require('exceljs');
const path = require('path');
const logger = require('../utils/logger');

const LOGO_PATH = path.join(__dirname, '../assets/logo-negro.png');

// ═══════════════════════════════════════════════════════════════════════════
// COLORES Y ESTILOS
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  azulOscuro: 'FF1A237E',
  azulMedio: 'FF283593',
  azulClaro: 'FFE3F2FD',
  naranja: 'FFFF6F00',
  naranjaClaro: 'FFFFF3E0',
  verde: 'FF4CAF50',
  verdeClaro: 'FFE8F5E9',
  rojo: 'FFF44336',
  rojoClaro: 'FFFFEBEE',
  grisClaro: 'FFF8F9FA',
  grisBorde: 'FFE0E0E0',
  blanco: 'FFFFFFFF',
  negro: 'FF000000',
  textoGris: 'FF666666',
};

const BORDE_FINO = {
  top: { style: 'thin', color: { argb: C.grisBorde } },
  left: { style: 'thin', color: { argb: C.grisBorde } },
  bottom: { style: 'thin', color: { argb: C.grisBorde } },
  right: { style: 'thin', color: { argb: C.grisBorde } },
};

const BORDE_MEDIO = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const crearLibro = () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ISTHO CRM';
  wb.created = new Date();
  wb.modified = new Date();
  wb.properties.company = 'ISTHO S.A.S.';
  return wb;
};

const fechaHoy = () => new Date().toLocaleDateString('es-CO', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

/**
 * Encabezado corporativo con logo
 */
const agregarEncabezado = (ws, titulo, subtitulo, totalCols, wb) => {
  const lastCol = String.fromCharCode(64 + Math.min(totalCols, 26));

  ws.getRow(1).height = 30;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 6;

  // Logo en columna A (tamaño fijo para no distorsionar)
  try {
    const logoId = wb.addImage({ filename: LOGO_PATH, extension: 'png' });
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 95 }, editAs: 'oneCell' });
  } catch (_) { /* si el logo no está disponible, continúa sin él */ }

  // Fila 1: Nombre empresa (desde col C)
  ws.mergeCells(`C1:${lastCol}1`);
  const c1 = ws.getCell('C1');
  c1.value = 'ISTHO S.A.S.';
  c1.font = { bold: true, size: 18, color: { argb: C.azulOscuro } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Fila 2: Título del reporte
  ws.mergeCells(`C2:${lastCol}2`);
  const c2 = ws.getCell('C2');
  c2.value = titulo;
  c2.font = { bold: true, size: 13, color: { argb: C.naranja } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Fila 3: Fecha / filtro aplicado
  ws.mergeCells(`C3:${lastCol}3`);
  const c3 = ws.getCell('C3');
  c3.value = subtitulo || `Generado el ${fechaHoy()}`;
  c3.font = { size: 9, italic: true, color: { argb: C.textoGris } };
  c3.alignment = { horizontal: 'center' };

  // Fila 4: separador
  return 5;
};

/**
 * Agregar tarjeta de resumen ejecutivo
 */
const agregarResumen = (ws, fila, items, totalCols) => {
  const lastCol = String.fromCharCode(64 + Math.min(totalCols, 26));

  // Título de resumen
  ws.mergeCells(`A${fila}:${lastCol}${fila}`);
  const tCell = ws.getCell(`A${fila}`);
  tCell.value = 'RESUMEN EJECUTIVO';
  tCell.font = { bold: true, size: 11, color: { argb: C.azulOscuro } };
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulClaro } };
  tCell.alignment = { horizontal: 'center' };
  tCell.border = BORDE_MEDIO;
  fila++;

  // Items del resumen en pares (etiqueta + valor)
  const pairCols = Math.min(Math.floor(totalCols / 2), 4);
  for (let i = 0; i < items.length; i += pairCols) {
    const chunk = items.slice(i, i + pairCols);
    chunk.forEach((item, idx) => {
      const colLabel = idx * 2 + 1;
      const colValue = idx * 2 + 2;

      const labelCell = ws.getCell(fila, colLabel);
      labelCell.value = item.label;
      labelCell.font = { bold: true, size: 9, color: { argb: C.textoGris } };
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      labelCell.border = BORDE_FINO;

      const valueCell = ws.getCell(fila, colValue);
      valueCell.value = item.value;
      valueCell.font = { bold: true, size: 11, color: { argb: C.azulOscuro } };
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      valueCell.border = BORDE_FINO;
      if (item.numFmt) valueCell.numFmt = item.numFmt;
    });
    ws.getRow(fila).height = 22;
    fila++;
  }

  // Separador
  fila++;
  return fila;
};

/**
 * Crear tabla Excel real (con estructura Table reconocida por Excel)
 * y sobre-escribir el encabezado con el estilo corporativo.
 * Retorna la primera fila de datos para el loop de formato.
 */
const crearTablaExcel = (ws, filaInicio, nombre, cols, filas) => {
  const nombreSeguro = nombre.replace(/[^A-Za-z0-9_]/g, '_');

  ws.addTable({
    name: nombreSeguro,
    ref: `A${filaInicio}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
      showFirstColumn: false,
      showLastColumn: false,
    },
    columns: cols.map(c => ({ name: c.header, filterButton: true })),
    rows: filas,
  });

  // Sobre-escribir encabezado con estilo corporativo (fondo azul oscuro, texto blanco)
  const headerRow = ws.getRow(filaInicio);
  headerRow.height = 28;
  cols.forEach((col, i) => {
    const cell = ws.getCell(filaInicio, i + 1);
    cell.font = { bold: true, color: { argb: C.blanco }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulOscuro } };
    cell.alignment = { horizontal: col.align || 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDE_MEDIO;
  });

  return filaInicio + 1; // primera fila de datos
};

/**
 * Aplicar estilos a una celda de dato
 */
const estiloCelda = (cell, colIdx, filaIdx, config = {}) => {
  cell.border = BORDE_FINO;
  cell.alignment = {
    horizontal: config.align || 'left',
    vertical: 'middle',
    wrapText: config.wrap || false,
  };

  // Zebra
  if (filaIdx % 2 === 1) {
    if (!cell.fill || cell.fill.fgColor?.argb === C.blanco) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grisClaro } };
    }
  }
};

/**
 * Fila de totales
 */
const agregarFilaTotales = (ws, fila, celdas, totalCols) => {
  const row = ws.getRow(fila);
  row.height = 26;

  for (let i = 1; i <= totalCols; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulClaro } };
    cell.font = { bold: true, size: 10, color: { argb: C.azulOscuro } };
    cell.border = BORDE_MEDIO;
  }

  celdas.forEach(({ col, value, numFmt }) => {
    const cell = row.getCell(col);
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
  });

  return fila + 1;
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════

const exportarOperaciones = async (operaciones, filtros = {}) => {
  try {
    const wb = crearLibro();
    const ws = wb.addWorksheet('Operaciones', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    const COLS = [
      { header: 'N° Operación', key: 'num', width: 18, align: 'left' },
      { header: 'Tipo', key: 'tipo', width: 12, align: 'center' },
      { header: 'Doc. WMS', key: 'doc', width: 18, align: 'left' },
      { header: 'Cliente', key: 'cli', width: 32, align: 'left' },
      { header: 'Fecha Operación', key: 'fecha', width: 15, align: 'center' },
      { header: 'Estado', key: 'estado', width: 14, align: 'center' },
      { header: 'Referencias', key: 'refs', width: 12, align: 'center' },
      { header: 'Unidades', key: 'uds', width: 13, align: 'right' },
      { header: 'Averías', key: 'avg', width: 10, align: 'center' },
      { header: 'Placa', key: 'placa', width: 11, align: 'center' },
      { header: 'Conductor', key: 'cond', width: 22, align: 'left' },
    ];

    // Anchos
    ws.columns = COLS.map(c => ({ width: c.width }));

    // Subtítulo con filtros
    let sub = null;
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      const desde = filtros.fecha_desde || '...';
      const hasta = filtros.fecha_hasta || '...';
      sub = `Período: ${desde} al ${hasta} | Generado el ${fechaHoy()}`;
    }

    let fila = agregarEncabezado(ws, 'REPORTE DE OPERACIONES', sub, COLS.length, wb);

    // Calcular estadísticas
    const totalOps = operaciones.length;
    const ingresos = operaciones.filter(o => o.tipo === 'ingreso').length;
    const salidas = operaciones.filter(o => o.tipo === 'salida').length;
    const kardex = operaciones.filter(o => o.tipo === 'kardex').length;
    const cerradas = operaciones.filter(o => o.estado === 'cerrado').length;
    const pendientes = operaciones.filter(o => o.estado === 'pendiente').length;
    const totalUds = operaciones.reduce((s, o) => s + (parseFloat(o.total_unidades) || 0), 0);
    const totalRefs = operaciones.reduce((s, o) => s + (o.total_referencias || 0), 0);
    const totalAvg = operaciones.reduce((s, o) => s + (o.total_averias || 0), 0);

    fila = agregarResumen(ws, fila, [
      { label: 'Total Operaciones:', value: totalOps },
      { label: 'Ingresos:', value: ingresos },
      { label: 'Salidas:', value: salidas },
      { label: 'Kardex:', value: kardex },
      { label: 'Cerradas:', value: cerradas },
      { label: 'Pendientes:', value: pendientes },
      { label: 'Total Unidades:', value: totalUds, numFmt: '0' },
      { label: 'Total Referencias:', value: totalRefs },
      { label: 'Total Averías:', value: totalAvg },
    ], COLS.length);

    // Tabla Excel estructurada
    const filasOp = operaciones.map(op => [
      op.numero_operacion,
      (op.tipo || '').toUpperCase(),
      op.documento_wms || '',
      op.cliente?.razon_social || 'N/A',
      op.fecha_operacion ? new Date(op.fecha_operacion) : null,
      (op.estado || '').toUpperCase(),
      op.total_referencias || 0,
      parseFloat(op.total_unidades) || 0,
      op.total_averias || 0,
      op.vehiculo_placa || '',
      op.conductor_nombre || '',
    ]);

    const dataFila = crearTablaExcel(ws, fila, 'Operaciones', COLS, filasOp);

    operaciones.forEach((op, idx) => {
      ws.getRow(dataFila + idx).height = 20;
      filasOp[idx].forEach((val, ci) => {
        const cell = ws.getCell(dataFila + idx, ci + 1);
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });
        if (ci === 4 && val) cell.numFmt = 'DD/MM/YYYY';
        if (ci === 7) cell.numFmt = '0';
        if (ci === 1) {
          const tipo = (op.tipo || '').toLowerCase();
          cell.font = { bold: true, color: { argb: tipo === 'ingreso' ? C.verde : tipo === 'kardex' ? C.naranja : C.azulMedio } };
        }
        if (ci === 5) {
          const estado = (op.estado || '').toLowerCase();
          if (estado === 'cerrado') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
          else if (estado === 'anulado') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
          else if (estado === 'en_proceso') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } }; cell.font = { bold: true, color: { argb: C.naranja } }; }
          else if (estado === 'pendiente') { cell.font = { color: { argb: C.naranja } }; }
        }
        if (ci === 8 && val > 0) cell.font = { bold: true, color: { argb: C.rojo } };
      });
    });

    agregarFilaTotales(ws, dataFila + operaciones.length + 1, [
      { col: 1, value: 'TOTALES' },
      { col: 7, value: totalRefs },
      { col: 8, value: totalUds, numFmt: '0' },
      { col: 9, value: totalAvg },
    ], COLS.length);

    ws.views = [{ state: 'frozen', ySplit: fila }];

    const buffer = await wb.xlsx.writeBuffer();
    logger.info('Excel operaciones generado:', { registros: totalOps });
    return buffer;
  } catch (error) {
    logger.error('Error Excel operaciones:', { message: error.message });
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════

const exportarInventario = async (inventario, filtros = {}) => {
  try {
    const wb = crearLibro();
    const ws = wb.addWorksheet('Inventario', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    const COLS = [
      { header: 'SKU', key: 'sku', width: 15, align: 'left' },
      { header: 'Producto', key: 'prod', width: 36, align: 'left' },
      { header: 'Cliente', key: 'cli', width: 26, align: 'left' },
      { header: 'Cantidad', key: 'cant', width: 12, align: 'right' },
      { header: 'U.M.', key: 'um', width: 8, align: 'center' },
      { header: 'Stock Mín.', key: 'min', width: 11, align: 'right' },
      { header: 'Vencimiento', key: 'venc', width: 13, align: 'center' },
      { header: 'Costo Unit.', key: 'cu', width: 13, align: 'right' },
      { header: 'Valor Total', key: 'vt', width: 15, align: 'right' },
      { header: 'Estado', key: 'est', width: 13, align: 'center' },
    ];

    ws.columns = COLS.map(c => ({ width: c.width }));

    // Subtítulo
    let sub = null;
    const subParts = [];
    if (filtros.cliente_id) {
      const nombre = inventario[0]?.cliente?.razon_social;
      if (nombre) subParts.push(`Cliente: ${nombre}`);
    }
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      subParts.push(`Período: ${filtros.fecha_desde || '...'} al ${filtros.fecha_hasta || '...'}`);
    }
    if (subParts.length) sub = `${subParts.join(' | ')} | Generado el ${fechaHoy()}`;

    let fila = agregarEncabezado(ws, 'REPORTE DE INVENTARIO', sub, COLS.length, wb);

    // Estadísticas
    const totalItems = inventario.length;
    let totalUds = 0, totalValor = 0, stockBajo = 0, vencidos = 0;
    const hoy = new Date();

    inventario.forEach(item => {
      const cant = parseFloat(item.cantidad) || 0;
      const costo = parseFloat(item.costo_unitario) || 0;
      totalUds += cant;
      totalValor += cant * costo;

      const minimo = parseFloat(item.stock_minimo) || 0;
      if (minimo > 0 && cant <= minimo) stockBajo++;

      if (item.fecha_vencimiento) {
        const venc = new Date(item.fecha_vencimiento);
        if (venc < hoy) vencidos++;
      }
    });

    // Clientes únicos
    const clientesUnicos = [...new Set(inventario.map(i => i.cliente?.razon_social).filter(Boolean))];

    fila = agregarResumen(ws, fila, [
      { label: 'Total Referencias (SKUs):', value: totalItems },
      { label: 'Total Unidades:', value: totalUds, numFmt: '#,##0.000' },
      { label: 'Valor Total Inventario:', value: totalValor, numFmt: '"$"#,##0.00' },
      { label: 'Clientes:', value: clientesUnicos.length },
      { label: 'Productos con Stock Bajo:', value: stockBajo },
      { label: 'Productos Vencidos:', value: vencidos },
    ], COLS.length);

    // Tabla Excel estructurada
    const filasInv = inventario.map(item => {
      const cant = parseFloat(item.cantidad) || 0;
      const costoUnit = parseFloat(item.costo_unitario) || 0;
      return [
        item.sku,
        item.producto,
        item.cliente?.razon_social || 'N/A',
        cant,
        item.unidad_medida || 'UND',
        parseFloat(item.stock_minimo) || 0,
        item.fecha_vencimiento ? new Date(item.fecha_vencimiento) : null,
        costoUnit,
        cant * costoUnit,
        (item.estado || '').toUpperCase(),
      ];
    });

    const dataFila = crearTablaExcel(ws, fila, 'Inventario', COLS, filasInv);

    inventario.forEach((item, idx) => {
      ws.getRow(dataFila + idx).height = 19;
      const cant = parseFloat(item.cantidad) || 0;
      filasInv[idx].forEach((val, ci) => {
        const cell = ws.getCell(dataFila + idx, ci + 1);
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });
        if ([3, 5].includes(ci)) cell.numFmt = '#,##0.000';
        if (ci === 7 || ci === 8) cell.numFmt = '"$"#,##0.00';
        if (ci === 6 && val) cell.numFmt = 'DD/MM/YYYY';
        if (ci === 3) {
          const minimo = parseFloat(item.stock_minimo) || 0;
          if (minimo > 0 && cant <= minimo) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
        }
        if (ci === 6 && val) {
          const dias = Math.ceil((new Date(val) - hoy) / (1000 * 60 * 60 * 24));
          if (dias < 0) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
          else if (dias <= 30) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } }; cell.font = { color: { argb: C.naranja } }; }
        }
        if (ci === 9) {
          const est = (item.estado || '').toLowerCase();
          if (est === 'agotado') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
          else if (est === 'bajo_stock') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } }; cell.font = { color: { argb: C.naranja } }; }
        }
      });
    });

    agregarFilaTotales(ws, dataFila + inventario.length + 1, [
      { col: 1, value: 'TOTALES' },
      { col: 4, value: totalUds, numFmt: '#,##0.000' },
      { col: 9, value: totalValor, numFmt: '"$"#,##0.00' },
    ], COLS.length);

    ws.views = [{ state: 'frozen', ySplit: fila }];

    const buffer = await wb.xlsx.writeBuffer();
    logger.info('Excel inventario generado:', { registros: totalItems });
    return buffer;
  } catch (error) {
    logger.error('Error Excel inventario:', { message: error.message });
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR CLIENTES
// ═══════════════════════════════════════════════════════════════════════════

const exportarClientes = async (clientes) => {
  try {
    const wb = crearLibro();
    const ws = wb.addWorksheet('Clientes', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    const COLS = [
      { header: 'Código', key: 'cod', width: 13, align: 'center' },
      { header: 'Razón Social', key: 'rs', width: 36, align: 'left' },
      { header: 'NIT', key: 'nit', width: 16, align: 'center' },
      { header: 'Productos', key: 'productos', width: 12, align: 'center' },
      { header: 'Ciudad', key: 'ciudad', width: 16, align: 'left' },
      { header: 'Departamento', key: 'depto', width: 16, align: 'left' },
      { header: 'Teléfono', key: 'tel', width: 16, align: 'center' },
      { header: 'Email', key: 'email', width: 28, align: 'left' },
      { header: 'Tipo Cliente', key: 'tipo', width: 15, align: 'center' },
      { header: 'Estado', key: 'estado', width: 12, align: 'center' },
      { header: 'Contacto Principal', key: 'contacto', width: 26, align: 'left' },
      { header: 'Tel. Contacto', key: 'tel_contacto', width: 16, align: 'center' },
      { header: 'Email Contacto', key: 'email_contacto', width: 26, align: 'left' },
    ];

    ws.columns = COLS.map(c => ({ width: c.width }));

    let fila = agregarEncabezado(ws, 'DIRECTORIO DE CLIENTES', null, COLS.length, wb);

    // Estadísticas
    const total = clientes.length;
    const activos = clientes.filter(c => c.estado === 'activo').length;
    const inactivos = total - activos;

    // Contar por tipo
    const porTipo = {};
    clientes.forEach(c => {
      const tipo = c.tipo_cliente || 'Sin tipo';
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    });

    const resumenItems = [
      { label: 'Total Clientes:', value: total },
      { label: 'Activos:', value: activos },
      { label: 'Inactivos:', value: inactivos },
    ];

    Object.entries(porTipo).forEach(([tipo, count]) => {
      resumenItems.push({
        label: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)}:`,
        value: count,
      });
    });

    fila = agregarResumen(ws, fila, resumenItems, COLS.length);

    // Tabla Excel estructurada
    const filasCli = clientes.map(cliente => {
      const cp = cliente.contactos?.find(c => c.es_principal) || cliente.contactos?.[0];
      const totalProductos = parseInt(cliente.getDataValue?.('total_productos') || cliente.total_productos || 0);
      return [
        cliente.codigo_cliente || '',
        cliente.razon_social || '',
        cliente.nit || '',
        totalProductos,
        cliente.ciudad || '',
        cliente.departamento || '',
        cliente.telefono || cliente.celular || '',
        cliente.email || '',
        (cliente.tipo_cliente || '').toUpperCase(),
        (cliente.estado || '').toUpperCase(),
        cp?.nombre || '',
        cp?.telefono || cp?.celular || '',
        cp?.email || '',
      ];
    });

    const dataFila = crearTablaExcel(ws, fila, 'Clientes', COLS, filasCli);

    clientes.forEach((cliente, idx) => {
      ws.getRow(dataFila + idx).height = 19;
      filasCli[idx].forEach((val, ci) => {
        const cell = ws.getCell(dataFila + idx, ci + 1);
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });
        if (ci === 9) {
          const est = (cliente.estado || '').toLowerCase();
          if (est === 'activo') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
          else { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
        }
      });
    });

    ws.views = [{ state: 'frozen', ySplit: fila }];

    const buffer = await wb.xlsx.writeBuffer();
    logger.info('Excel clientes generado:', { registros: total });
    return buffer;
  } catch (error) {
    logger.error('Error Excel clientes:', { message: error.message });
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR DETALLE DE OPERACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const exportarDetalleOperacion = async (operacion) => {
  try {
    const wb = crearLibro();
    const ws = wb.addWorksheet('Detalle Operación', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    ws.columns = [
      { width: 16 }, { width: 18 }, { width: 36 },
      { width: 13 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 },
    ];

    // Encabezado con logo
    ws.getRow(1).height = 30;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 6;
    try {
      const logoId = wb.addImage({ filename: LOGO_PATH, extension: 'png' });
      ws.addImage(logoId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 2 }, editAs: 'oneCell' });
    } catch (_) {}

    ws.mergeCells('C1:H1');
    const c1 = ws.getCell('C1');
    c1.value = 'ISTHO S.A.S.';
    c1.font = { bold: true, size: 18, color: { argb: C.azulOscuro } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C2:H2');
    const c2 = ws.getCell('C2');
    c2.value = `DETALLE DE OPERACIÓN — ${operacion.numero_operacion}`;
    c2.font = { bold: true, size: 13, color: { argb: C.naranja } };
    c2.alignment = { horizontal: 'center' };

    // Información general
    let fila = 4;

    ws.mergeCells(`A${fila}:H${fila}`);
    const secTitle1 = ws.getCell(`A${fila}`);
    secTitle1.value = 'INFORMACIÓN GENERAL';
    secTitle1.font = { bold: true, size: 11, color: { argb: C.azulOscuro } };
    secTitle1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulClaro } };
    secTitle1.border = BORDE_MEDIO;
    fila++;

    const info = [
      ['N° Operación:', operacion.numero_operacion, 'Documento WMS:', operacion.documento_wms || 'N/A'],
      ['Tipo:', (operacion.tipo || '').toUpperCase(), 'Estado:', (operacion.estado || '').toUpperCase()],
      ['Cliente:', operacion.cliente?.razon_social || 'N/A', 'Fecha:', operacion.fecha_operacion || 'N/A'],
      ['Origen:', operacion.origen || 'N/A', 'Destino:', operacion.destino || 'N/A'],
    ];

    info.forEach(row => {
      ws.getCell(`A${fila}`).value = row[0];
      ws.getCell(`A${fila}`).font = { bold: true, size: 9, color: { argb: C.textoGris } };
      ws.getCell(`B${fila}`).value = row[1];
      ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
      ws.getCell(`E${fila}`).value = row[2];
      ws.getCell(`E${fila}`).font = { bold: true, size: 9, color: { argb: C.textoGris } };
      ws.getCell(`F${fila}`).value = row[3];
      ws.getCell(`F${fila}`).font = { bold: true, size: 10 };
      fila++;
    });

    // Transporte
    fila++;
    ws.mergeCells(`A${fila}:H${fila}`);
    const secTitle2 = ws.getCell(`A${fila}`);
    secTitle2.value = 'INFORMACIÓN DE TRANSPORTE';
    secTitle2.font = { bold: true, size: 11, color: { argb: C.azulOscuro } };
    secTitle2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulClaro } };
    secTitle2.border = BORDE_MEDIO;
    fila++;

    const transporte = [
      ['Placa:', operacion.vehiculo_placa || 'N/A', 'Conductor:', operacion.conductor_nombre || 'N/A'],
      ['Cédula:', operacion.conductor_cedula || 'N/A', 'Teléfono:', operacion.conductor_telefono || 'N/A'],
    ];

    transporte.forEach(row => {
      ws.getCell(`A${fila}`).value = row[0];
      ws.getCell(`A${fila}`).font = { bold: true, size: 9, color: { argb: C.textoGris } };
      ws.getCell(`B${fila}`).value = row[1];
      ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
      ws.getCell(`E${fila}`).value = row[2];
      ws.getCell(`E${fila}`).font = { bold: true, size: 9, color: { argb: C.textoGris } };
      ws.getCell(`F${fila}`).value = row[3];
      ws.getCell(`F${fila}`).font = { bold: true, size: 10 };
      fila++;
    });

    // Detalle de productos
    fila += 2;
    const detCols = [
      { header: '#', align: 'center' },
      { header: 'SKU', align: 'left' },
      { header: 'Producto', align: 'left' },
      { header: 'Cantidad', align: 'right' },
      { header: 'U.M.', align: 'center' },
      { header: 'Lote', align: 'center' },
      { header: 'Vencimiento', align: 'center' },
      { header: 'Averías', align: 'center' },
    ];

    const detalles = operacion.detalles || [];
    let sumCant = 0, sumAvg = 0;

    // Tabla Excel estructurada
    const filasDetalle = detalles.map((det, idx) => {
      const cant = parseFloat(det.cantidad) || 0;
      const avg = parseFloat(det.cantidad_averia) || 0;
      sumCant += cant;
      sumAvg += avg;
      return [idx + 1, det.sku || '', det.producto || '', cant, det.unidad_medida || 'UND', det.lote || '', det.fecha_vencimiento || '', avg];
    });

    const dataFila = crearTablaExcel(ws, fila, 'DetalleOperacion', detCols, filasDetalle);

    detalles.forEach((det, idx) => {
      ws.getRow(dataFila + idx).height = 19;
      const avg = parseFloat(det.cantidad_averia) || 0;
      filasDetalle[idx].forEach((val, ci) => {
        const cell = ws.getCell(dataFila + idx, ci + 1);
        estiloCelda(cell, ci, idx, { align: detCols[ci].align });
        if (ci === 3) cell.numFmt = '#,##0.000';
        if (ci === 7 && avg > 0) cell.font = { bold: true, color: { argb: C.rojo } };
      });
    });

    agregarFilaTotales(ws, dataFila + detalles.length + 1, [
      { col: 1, value: 'TOTALES' },
      { col: 3, value: `${detalles.length} referencias` },
      { col: 4, value: sumCant, numFmt: '#,##0.000' },
      { col: 8, value: sumAvg },
    ], 8);

    const buffer = await wb.xlsx.writeBuffer();
    logger.info('Excel detalle operación generado:', { operacion: operacion.numero_operacion });
    return buffer;
  } catch (error) {
    logger.error('Error Excel detalle:', { message: error.message });
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR VIAJES
// ═══════════════════════════════════════════════════════════════════════════

const exportarViajes = async (viajes, filtros = {}) => {
  const wb = crearLibro();
  const ws = wb.addWorksheet('Viajes', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const COLS = [
    { header: 'Número', key: 'num', width: 12, align: 'left' },
    { header: 'Fecha', key: 'fecha', width: 13, align: 'center' },
    { header: 'Origen', key: 'origen', width: 18, align: 'left' },
    { header: 'Destino', key: 'destino', width: 18, align: 'left' },
    { header: 'Cliente', key: 'cliente', width: 25, align: 'left' },
    { header: 'Doc. Cliente', key: 'doc', width: 15, align: 'center' },
    { header: 'Vehículo', key: 'vehiculo', width: 12, align: 'center' },
    { header: 'Conductor', key: 'conductor', width: 22, align: 'left' },
    { header: 'Peso (kg)', key: 'peso', width: 12, align: 'right' },
    { header: 'Valor Viaje', key: 'valor', width: 15, align: 'right' },
    { header: 'Facturado', key: 'facturado', width: 10, align: 'center' },
    { header: 'No. Factura', key: 'factura', width: 14, align: 'center' },
    { header: 'Caja Menor', key: 'caja', width: 12, align: 'center' },
    { header: 'Estado', key: 'estado', width: 12, align: 'center' },
  ];

  ws.columns = COLS.map(c => ({ width: c.width }));

  let sub = null;
  if (filtros.fecha_desde || filtros.fecha_hasta) {
    sub = `Período: ${filtros.fecha_desde || '...'} al ${filtros.fecha_hasta || '...'} | Generado el ${fechaHoy()}`;
  }

  let fila = agregarEncabezado(ws, 'REPORTE DE VIAJES', sub, COLS.length, wb);

  const total = viajes.length;
  const activos = viajes.filter(v => v.estado === 'activo').length;
  const completados = viajes.filter(v => v.estado === 'completado').length;
  const totalValor = viajes.reduce((s, v) => s + (parseFloat(v.valor_viaje) || 0), 0);
  const totalPeso = viajes.reduce((s, v) => s + (parseFloat(v.peso) || 0), 0);
  const facturados = viajes.filter(v => v.facturado).length;

  fila = agregarResumen(ws, fila, [
    { label: 'Total Viajes:', value: total },
    { label: 'Activos:', value: activos },
    { label: 'Completados:', value: completados },
    { label: 'Facturados:', value: facturados },
    { label: 'Valor Total:', value: totalValor, numFmt: '$#,##0' },
    { label: 'Peso Total:', value: totalPeso, numFmt: '#,##0' },
  ], COLS.length);

  // Tabla Excel estructurada
  const filasViajes = viajes.map(v => [
    v.numero, v.fecha ? new Date(v.fecha) : null, v.origen, v.destino,
    v.cliente_nombre || '', v.documento_cliente || '',
    v.vehiculo?.placa || '', v.conductor?.nombre_completo || '',
    parseFloat(v.peso) || 0, parseFloat(v.valor_viaje) || 0,
    v.facturado ? 'Sí' : 'No', v.no_factura || '',
    v.cajaMenor?.numero || '', (v.estado || '').toUpperCase(),
  ]);

  const dataFila = crearTablaExcel(ws, fila, 'Viajes', COLS, filasViajes);

  viajes.forEach((v, idx) => {
    ws.getRow(dataFila + idx).height = 20;
    filasViajes[idx].forEach((val, ci) => {
      const cell = ws.getCell(dataFila + idx, ci + 1);
      estiloCelda(cell, ci, idx, { align: COLS[ci].align });
      if (ci === 1 && val) cell.numFmt = 'DD/MM/YYYY';
      if (ci === 9) cell.numFmt = '$#,##0';
      if (ci === 8) cell.numFmt = '#,##0';
      if (ci === 13) {
        const est = (v.estado || '').toLowerCase();
        if (est === 'completado') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
        else if (est === 'anulado') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
        else if (est === 'activo') { cell.font = { color: { argb: C.naranja } }; }
      }
    });
  });

  agregarFilaTotales(ws, dataFila + viajes.length + 1, [
    { col: 1, value: 'TOTALES' },
    { col: 9, value: totalPeso, numFmt: '#,##0' },
    { col: 10, value: totalValor, numFmt: '$#,##0' },
  ], COLS.length);

  ws.views = [{ state: 'frozen', ySplit: fila }];
  return wb.xlsx.writeBuffer();
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR CAJAS MENORES
// ═══════════════════════════════════════════════════════════════════════════

const exportarCajasMenores = async (cajas) => {
  const wb = crearLibro();
  const ws = wb.addWorksheet('Cajas Menores', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const COLS = [
    { header: 'Número', key: 'num', width: 14, align: 'left' },
    { header: 'Asignado A', key: 'cond', width: 25, align: 'left' },
    { header: 'Estado', key: 'estado', width: 12, align: 'center' },
    { header: 'Saldo Inicial', key: 'si', width: 16, align: 'right' },
    { header: 'Saldo Trasladado', key: 'st', width: 16, align: 'right' },
    { header: 'Total Ingresos', key: 'ti', width: 16, align: 'right' },
    { header: 'Total Egresos', key: 'te', width: 16, align: 'right' },
    { header: 'Saldo Actual', key: 'sa', width: 16, align: 'right' },
    { header: 'Fecha Apertura', key: 'fa', width: 14, align: 'center' },
    { header: 'Fecha Cierre', key: 'fc', width: 14, align: 'center' },
    { header: 'Creado Por', key: 'creador', width: 22, align: 'left' },
  ];

  ws.columns = COLS.map(c => ({ width: c.width }));

  let fila = agregarEncabezado(ws, 'REPORTE DE CAJAS MENORES', null, COLS.length, wb);

  const abiertas = cajas.filter(c => c.estado === 'abierta').length;
  const cerradas = cajas.filter(c => c.estado === 'cerrada').length;
  const totalSaldoInicial = cajas.reduce((s, c) => s + (parseFloat(c.saldo_inicial) || 0), 0);
  const totalEgresos = cajas.reduce((s, c) => s + (parseFloat(c.total_egresos) || 0), 0);
  const totalIngresos = cajas.reduce((s, c) => s + (parseFloat(c.total_ingresos) || 0), 0);
  const totalSaldoActual = cajas.reduce((s, c) => s + (parseFloat(c.saldo_actual) || 0), 0);

  fila = agregarResumen(ws, fila, [
    { label: 'Total Cajas:', value: cajas.length },
    { label: 'Abiertas:', value: abiertas },
    { label: 'Cerradas:', value: cerradas },
    { label: 'Saldo Inicial Total:', value: totalSaldoInicial, numFmt: '$#,##0' },
    { label: 'Total Ingresos:', value: totalIngresos, numFmt: '$#,##0' },
    { label: 'Total Egresos:', value: totalEgresos, numFmt: '$#,##0' },
    { label: 'Saldo Actual Total:', value: totalSaldoActual, numFmt: '$#,##0' },
  ], COLS.length);

  // Tabla Excel estructurada
  const filasCajas = cajas.map(c => [
    c.numero, c.asignado?.nombre_completo || c.asignado_nombre || '', (c.estado || '').toUpperCase(),
    parseFloat(c.saldo_inicial) || 0, parseFloat(c.saldo_trasladado) || 0,
    parseFloat(c.total_ingresos) || 0, parseFloat(c.total_egresos) || 0,
    parseFloat(c.saldo_actual) || 0,
    c.fecha_apertura ? new Date(c.fecha_apertura) : null,
    c.fecha_cierre ? new Date(c.fecha_cierre) : null,
    c.creador?.nombre_completo || c.creador?.username || 'Sin registro',
  ]);

  const dataFila = crearTablaExcel(ws, fila, 'CajasMenores', COLS, filasCajas);

  cajas.forEach((c, idx) => {
    ws.getRow(dataFila + idx).height = 20;
    filasCajas[idx].forEach((val, ci) => {
      const cell = ws.getCell(dataFila + idx, ci + 1);
      estiloCelda(cell, ci, idx, { align: COLS[ci].align });
      if ([3, 4, 5, 6, 7].includes(ci)) cell.numFmt = '$#,##0';
      if ((ci === 8 || ci === 9) && val) cell.numFmt = 'DD/MM/YYYY';
      if (ci === 2) {
        const est = (c.estado || '').toLowerCase();
        if (est === 'abierta') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
        else if (est === 'cerrada') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grisClaro } }; cell.font = { color: { argb: C.textoGris } }; }
      }
      if (ci === 7 && (parseFloat(c.saldo_actual) || 0) < 0) cell.font = { bold: true, color: { argb: C.rojo } };
    });
  });

  agregarFilaTotales(ws, dataFila + cajas.length + 1, [
    { col: 1, value: 'TOTALES' },
    { col: 4, value: totalSaldoInicial, numFmt: '$#,##0' },
    { col: 6, value: totalIngresos, numFmt: '$#,##0' },
    { col: 7, value: totalEgresos, numFmt: '$#,##0' },
    { col: 8, value: totalSaldoActual, numFmt: '$#,##0' },
  ], COLS.length);

  ws.views = [{ state: 'frozen', ySplit: fila }];
  return wb.xlsx.writeBuffer();
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

const exportarMovimientos = async (movimientos) => {
  const wb = crearLibro();
  const ws = wb.addWorksheet('Movimientos', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const COLS = [
    { header: '#', key: 'num', width: 8, align: 'center' },
    { header: 'Caja Menor', key: 'caja', width: 14, align: 'center' },
    { header: 'Usuario', key: 'cond', width: 22, align: 'left' },
    { header: 'Tipo', key: 'tipo', width: 10, align: 'center' },
    { header: 'Concepto', key: 'concepto', width: 20, align: 'left' },
    { header: 'Descripción', key: 'desc', width: 28, align: 'left' },
    { header: 'Valor', key: 'valor', width: 15, align: 'right' },
    { header: 'Estado', key: 'estado', width: 12, align: 'center' },
    { header: 'Valor Aprobado', key: 'va', width: 15, align: 'right' },
    { header: 'Aprobador', key: 'aprobador', width: 22, align: 'left' },
    { header: 'Fecha Aprobación', key: 'faprobacion', width: 16, align: 'center' },
    { header: 'Viaje', key: 'viaje', width: 16, align: 'left' },
    { header: 'Fecha Creación', key: 'fecha', width: 14, align: 'center' },
  ];

  ws.columns = COLS.map(c => ({ width: c.width }));

  let fila = agregarEncabezado(ws, 'REPORTE DE MOVIMIENTOS DE CAJA MENOR', null, COLS.length, wb);

  const totalMov = movimientos.length;
  const ingresos = movimientos.filter(m => m.tipo_movimiento === 'ingreso');
  const egresos = movimientos.filter(m => m.tipo_movimiento === 'egreso');
  const aprobados = movimientos.filter(m => m.aprobado);
  const pendientes = movimientos.filter(m => !m.aprobado && !m.rechazado);
  const totalValor = movimientos.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);
  const totalAprobado = aprobados.reduce((s, m) => s + (parseFloat(m.valor_aprobado) || 0), 0);

  fila = agregarResumen(ws, fila, [
    { label: 'Total Movimientos:', value: totalMov },
    { label: 'Ingresos:', value: ingresos.length },
    { label: 'Egresos:', value: egresos.length },
    { label: 'Aprobados:', value: aprobados.length },
    { label: 'Pendientes:', value: pendientes.length },
    { label: 'Valor Total:', value: totalValor, numFmt: '$#,##0' },
    { label: 'Total Aprobado:', value: totalAprobado, numFmt: '$#,##0' },
  ], COLS.length);

  // Tabla Excel estructurada
  const filasMov = movimientos.map(m => [
    m.consecutivo, m.cajaMenor?.numero || '', m.usuario?.nombre_completo || '',
    (m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'),
    m.concepto, m.descripcion || '',
    parseFloat(m.valor) || 0,
    m.aprobado ? 'APROBADO' : m.rechazado ? 'RECHAZADO' : 'PENDIENTE',
    parseFloat(m.valor_aprobado) || 0, m.aprobador?.nombre_completo || '',
    m.fecha_aprobacion ? new Date(m.fecha_aprobacion) : null,
    m.viaje ? `#${m.viaje.numero} - ${m.viaje.destino}` : 'Directo',
    m.created_at ? new Date(m.created_at) : null,
  ]);

  const dataFila = crearTablaExcel(ws, fila, 'Movimientos', COLS, filasMov);

  movimientos.forEach((m, idx) => {
    ws.getRow(dataFila + idx).height = 20;
    filasMov[idx].forEach((val, ci) => {
      const cell = ws.getCell(dataFila + idx, ci + 1);
      estiloCelda(cell, ci, idx, { align: COLS[ci].align });
      if (ci === 6 || ci === 8) cell.numFmt = '$#,##0';
      if ((ci === 10 || ci === 12) && val) cell.numFmt = 'DD/MM/YYYY';
      if (ci === 3) cell.font = { bold: true, color: { argb: m.tipo_movimiento === 'ingreso' ? C.verde : C.rojo } };
      if (ci === 7) {
        if (m.aprobado) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
        else if (m.rechazado) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
        else { cell.font = { color: { argb: C.naranja } }; }
      }
    });
  });

  agregarFilaTotales(ws, dataFila + movimientos.length + 1, [
    { col: 1, value: 'TOTALES' },
    { col: 7, value: totalValor, numFmt: '$#,##0' },
    { col: 9, value: totalAprobado, numFmt: '$#,##0' },
  ], COLS.length);

  ws.views = [{ state: 'frozen', ySplit: fila }];
  return wb.xlsx.writeBuffer();
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR VEHICULOS
// ═══════════════════════════════════════════════════════════════════════════

const exportarVehiculos = async (vehiculos) => {
  const wb = crearLibro();
  const ws = wb.addWorksheet('Vehiculos', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const COLS = [
    { header: 'Placa', key: 'placa', width: 12, align: 'center' },
    { header: 'Tipo', key: 'tipo', width: 14, align: 'center' },
    { header: 'Marca', key: 'marca', width: 14, align: 'left' },
    { header: 'Modelo', key: 'modelo', width: 10, align: 'center' },
    { header: 'Color', key: 'color', width: 12, align: 'center' },
    { header: 'Capacidad (Ton)', key: 'cap', width: 14, align: 'right' },
    { header: 'Conductor', key: 'cond', width: 22, align: 'left' },
    { header: 'SOAT Vence', key: 'soat', width: 14, align: 'center' },
    { header: 'Tecnomecánica Vence', key: 'tecno', width: 18, align: 'center' },
    { header: 'No. Motor', key: 'motor', width: 18, align: 'left' },
    { header: 'No. Chasis', key: 'chasis', width: 18, align: 'left' },
    { header: 'Estado', key: 'estado', width: 14, align: 'center' },
  ];

  ws.columns = COLS.map(c => ({ width: c.width }));

  let fila = agregarEncabezado(ws, 'REPORTE DE VEHÍCULOS', null, COLS.length, wb);

  const activos = vehiculos.filter(v => v.estado === 'activo').length;
  const mantenimiento = vehiculos.filter(v => v.estado === 'mantenimiento').length;
  const inactivos = vehiculos.filter(v => v.estado === 'inactivo').length;
  const hoy = new Date();
  const soatVencidos = vehiculos.filter(v => v.vencimiento_soat && new Date(v.vencimiento_soat) < hoy).length;
  const tecnoVencidos = vehiculos.filter(v => v.vencimiento_tecnicomecanica && new Date(v.vencimiento_tecnicomecanica) < hoy).length;

  fila = agregarResumen(ws, fila, [
    { label: 'Total Vehículos:', value: vehiculos.length },
    { label: 'Activos:', value: activos },
    { label: 'En Mantenimiento:', value: mantenimiento },
    { label: 'Inactivos:', value: inactivos },
    { label: 'SOAT Vencidos:', value: soatVencidos },
    { label: 'Tecnomecánica Vencidos:', value: tecnoVencidos },
  ], COLS.length);

  // Tabla Excel estructurada
  const filasVehiculos = vehiculos.map(v => [
    v.placa, v.tipo_vehiculo, v.marca || '', v.modelo || '', v.color || '',
    parseFloat(v.capacidad_ton) || 0, v.conductor?.nombre_completo || '',
    v.vencimiento_soat ? new Date(v.vencimiento_soat) : null,
    v.vencimiento_tecnicomecanica ? new Date(v.vencimiento_tecnicomecanica) : null,
    v.numero_motor || '', v.numero_chasis || '', (v.estado || '').toUpperCase(),
  ]);

  const dataFila = crearTablaExcel(ws, fila, 'Vehiculos', COLS, filasVehiculos);

  vehiculos.forEach((v, idx) => {
    ws.getRow(dataFila + idx).height = 20;
    filasVehiculos[idx].forEach((val, ci) => {
      const cell = ws.getCell(dataFila + idx, ci + 1);
      estiloCelda(cell, ci, idx, { align: COLS[ci].align });
      if (ci === 5) cell.numFmt = '#,##0.00';
      if ((ci === 7 || ci === 8) && val) {
        cell.numFmt = 'DD/MM/YYYY';
        if (val < hoy) { cell.font = { bold: true, color: { argb: C.rojo } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; }
      }
      if (ci === 11) {
        const est = (v.estado || '').toLowerCase();
        if (est === 'activo') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } }; cell.font = { bold: true, color: { argb: C.verde } }; }
        else if (est === 'mantenimiento') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } }; cell.font = { bold: true, color: { argb: C.naranja } }; }
        else if (est === 'inactivo') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } }; cell.font = { bold: true, color: { argb: C.rojo } }; }
      }
    });
  });

  ws.views = [{ state: 'frozen', ySplit: fila }];
  return wb.xlsx.writeBuffer();
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  exportarOperaciones,
  exportarInventario,
  exportarClientes,
  exportarDetalleOperacion,
  exportarViajes,
  exportarCajasMenores,
  exportarMovimientos,
  exportarVehiculos,
};
