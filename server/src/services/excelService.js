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
const logger = require('../utils/logger');

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
 * Encabezado corporativo mejorado con merge dinámico
 */
const agregarEncabezado = (ws, titulo, subtitulo, totalCols) => {
  const lastCol = String.fromCharCode(64 + Math.min(totalCols, 26));

  // Fila 1: Título
  ws.mergeCells(`A1:${lastCol}1`);
  const c1 = ws.getCell('A1');
  c1.value = `ISTHO S.A.S.`;
  c1.font = { bold: true, size: 18, color: { argb: C.azulOscuro } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Fila 2: Subtítulo del reporte
  ws.mergeCells(`A2:${lastCol}2`);
  const c2 = ws.getCell('A2');
  c2.value = titulo;
  c2.font = { bold: true, size: 13, color: { argb: C.naranja } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Fila 3: Fecha / filtro aplicado
  ws.mergeCells(`A3:${lastCol}3`);
  const c3 = ws.getCell('A3');
  c3.value = subtitulo || `Generado el ${fechaHoy()}`;
  c3.font = { size: 9, italic: true, color: { argb: C.textoGris } };
  c3.alignment = { horizontal: 'center' };

  // Fila 4: separador
  ws.getRow(4).height = 6;

  return 5; // fila donde empieza el contenido
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
 * Aplicar encabezados de tabla con autofiltro
 */
const aplicarEncabezadosTabla = (ws, fila, columnas) => {
  const headerRow = ws.getRow(fila);
  headerRow.height = 28;

  columnas.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: C.blanco }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulOscuro } };
    cell.alignment = { horizontal: col.align || 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDE_MEDIO;
  });

  // Autofiltro
  const lastCol = String.fromCharCode(64 + columnas.length);
  ws.autoFilter = `A${fila}:${lastCol}${fila}`;

  return fila + 1;
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

    let fila = agregarEncabezado(ws, 'REPORTE DE OPERACIONES', sub, COLS.length);

    // Calcular estadísticas
    const totalOps = operaciones.length;
    const ingresos = operaciones.filter(o => o.tipo === 'ingreso').length;
    const salidas = operaciones.filter(o => o.tipo === 'salida').length;
    const cerradas = operaciones.filter(o => o.estado === 'cerrado').length;
    const pendientes = operaciones.filter(o => o.estado === 'pendiente').length;
    const totalUds = operaciones.reduce((s, o) => s + (parseFloat(o.total_unidades) || 0), 0);
    const totalRefs = operaciones.reduce((s, o) => s + (o.total_referencias || 0), 0);
    const totalAvg = operaciones.reduce((s, o) => s + (o.total_averias || 0), 0);

    fila = agregarResumen(ws, fila, [
      { label: 'Total Operaciones:', value: totalOps },
      { label: 'Ingresos:', value: ingresos },
      { label: 'Salidas:', value: salidas },
      { label: 'Cerradas:', value: cerradas },
      { label: 'Pendientes:', value: pendientes },
      { label: 'Total Unidades:', value: totalUds, numFmt: '#,##0.000' },
      { label: 'Total Referencias:', value: totalRefs },
      { label: 'Total Averías:', value: totalAvg },
    ], COLS.length);

    // Tabla
    let dataFila = aplicarEncabezadosTabla(ws, fila, COLS);

    operaciones.forEach((op, idx) => {
      const row = ws.getRow(dataFila);
      row.height = 20;

      const vals = [
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
      ];

      vals.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });

        // Formato fecha
        if (ci === 4 && val) cell.numFmt = 'DD/MM/YYYY';
        // Formato unidades
        if (ci === 7) cell.numFmt = '#,##0.000';

        // Color tipo
        if (ci === 1) {
          const tipo = (op.tipo || '').toLowerCase();
          cell.font = {
            bold: true,
            color: { argb: tipo === 'ingreso' ? C.verde : C.azulMedio },
          };
        }

        // Color estado
        if (ci === 5) {
          const estado = (op.estado || '').toLowerCase();
          if (estado === 'cerrado') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } };
            cell.font = { bold: true, color: { argb: C.verde } };
          } else if (estado === 'anulado') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } };
            cell.font = { bold: true, color: { argb: C.rojo } };
          } else if (estado === 'en_proceso') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } };
            cell.font = { bold: true, color: { argb: C.naranja } };
          } else if (estado === 'pendiente') {
            cell.font = { color: { argb: C.naranja } };
          }
        }

        // Averías en rojo
        if (ci === 8 && val > 0) {
          cell.font = { bold: true, color: { argb: C.rojo } };
        }
      });

      dataFila++;
    });

    // Fila totales
    dataFila++;
    agregarFilaTotales(ws, dataFila, [
      { col: 1, value: 'TOTALES' },
      { col: 7, value: totalRefs },
      { col: 8, value: totalUds, numFmt: '#,##0.000' },
      { col: 9, value: totalAvg },
    ], COLS.length);

    // Congelar encabezados de tabla
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
      { header: 'Reservado', key: 'res', width: 12, align: 'right' },
      { header: 'Disponible', key: 'disp', width: 12, align: 'right' },
      { header: 'U.M.', key: 'um', width: 8, align: 'center' },
      { header: 'Stock Mín.', key: 'min', width: 11, align: 'right' },
      { header: 'Ubicación', key: 'ubi', width: 12, align: 'center' },
      { header: 'Zona', key: 'zona', width: 12, align: 'center' },
      { header: 'Lote', key: 'lote', width: 13, align: 'center' },
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

    let fila = agregarEncabezado(ws, 'REPORTE DE INVENTARIO', sub, COLS.length);

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

    // Tabla
    let dataFila = aplicarEncabezadosTabla(ws, fila, COLS);

    inventario.forEach((item, idx) => {
      const row = ws.getRow(dataFila);
      row.height = 19;

      const cant = parseFloat(item.cantidad) || 0;
      const reservado = parseFloat(item.cantidad_reservada) || 0;
      const costoUnit = parseFloat(item.costo_unitario) || 0;
      const valorItem = cant * costoUnit;

      const vals = [
        item.sku,
        item.producto,
        item.cliente?.razon_social || 'N/A',
        cant,
        reservado,
        cant - reservado,
        item.unidad_medida || 'UND',
        parseFloat(item.stock_minimo) || 0,
        item.ubicacion || '',
        item.zona || '',
        item.lote || '',
        item.fecha_vencimiento ? new Date(item.fecha_vencimiento) : null,
        costoUnit,
        valorItem,
        (item.estado || '').toUpperCase(),
      ];

      vals.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });

        // Formatos numéricos
        if ([3, 4, 5, 7].includes(ci)) cell.numFmt = '#,##0.000';
        if (ci === 12 || ci === 13) cell.numFmt = '"$"#,##0.00';
        if (ci === 11 && val) cell.numFmt = 'DD/MM/YYYY';

        // Stock bajo
        if (ci === 3) {
          const minimo = parseFloat(item.stock_minimo) || 0;
          if (minimo > 0 && cant <= minimo) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } };
            cell.font = { bold: true, color: { argb: C.rojo } };
          }
        }

        // Disponible negativo
        if (ci === 5 && (cant - reservado) < 0) {
          cell.font = { bold: true, color: { argb: C.rojo } };
        }

        // Vencimiento
        if (ci === 11 && val) {
          const venc = new Date(val);
          const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
          if (dias < 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } };
            cell.font = { bold: true, color: { argb: C.rojo } };
          } else if (dias <= 30) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } };
            cell.font = { color: { argb: C.naranja } };
          }
        }

        // Estado
        if (ci === 14) {
          const est = (item.estado || '').toLowerCase();
          if (est === 'agotado') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } };
            cell.font = { bold: true, color: { argb: C.rojo } };
          } else if (est === 'bajo_stock') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaClaro } };
            cell.font = { color: { argb: C.naranja } };
          }
        }
      });

      dataFila++;
    });

    // Totales
    dataFila++;
    agregarFilaTotales(ws, dataFila, [
      { col: 1, value: 'TOTALES' },
      { col: 4, value: totalUds, numFmt: '#,##0.000' },
      { col: 14, value: totalValor, numFmt: '"$"#,##0.00' },
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

    let fila = agregarEncabezado(ws, 'DIRECTORIO DE CLIENTES', null, COLS.length);

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

    // Tabla
    let dataFila = aplicarEncabezadosTabla(ws, fila, COLS);

    clientes.forEach((cliente, idx) => {
      const row = ws.getRow(dataFila);
      row.height = 19;

      const contactoPrincipal = cliente.contactos?.find(c => c.es_principal) || cliente.contactos?.[0];

      const totalProductos = parseInt(cliente.getDataValue?.('total_productos') || cliente.total_productos || 0);

      const vals = [
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
        contactoPrincipal?.nombre || '',
        contactoPrincipal?.telefono || contactoPrincipal?.celular || '',
        contactoPrincipal?.email || '',
      ];

      vals.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });

        // Estado con color (ahora es columna 9, índice ci=9)
        if (ci === 9) {
          const est = (cliente.estado || '').toLowerCase();
          if (est === 'activo') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verdeClaro } };
            cell.font = { bold: true, color: { argb: C.verde } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rojoClaro } };
            cell.font = { bold: true, color: { argb: C.rojo } };
          }
        }
      });

      dataFila++;
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

    // Encabezado
    ws.mergeCells('A1:H1');
    const c1 = ws.getCell('A1');
    c1.value = 'ISTHO S.A.S.';
    c1.font = { bold: true, size: 18, color: { argb: C.azulOscuro } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:H2');
    const c2 = ws.getCell('A2');
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

    let dataFila = aplicarEncabezadosTabla(ws, fila, detCols);

    const detalles = operacion.detalles || [];
    let sumCant = 0, sumAvg = 0;

    detalles.forEach((det, idx) => {
      const row = ws.getRow(dataFila);
      row.height = 19;
      const cant = parseFloat(det.cantidad) || 0;
      const avg = parseFloat(det.cantidad_averia) || 0;
      sumCant += cant;
      sumAvg += avg;

      const vals = [
        idx + 1,
        det.sku || '',
        det.producto || '',
        cant,
        det.unidad_medida || 'UND',
        det.lote || '',
        det.fecha_vencimiento || '',
        avg,
      ];

      vals.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        estiloCelda(cell, ci, idx, { align: detCols[ci].align });
        if (ci === 3) cell.numFmt = '#,##0.000';
        if (ci === 7 && avg > 0) {
          cell.font = { bold: true, color: { argb: C.rojo } };
        }
      });

      dataFila++;
    });

    // Totales detalle
    dataFila++;
    agregarFilaTotales(ws, dataFila, [
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
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  exportarOperaciones,
  exportarInventario,
  exportarClientes,
  exportarDetalleOperacion,
};
