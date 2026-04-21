/**
 * ISTHO CRM - Servicio de Generación PDF
 *
 * Genera documentos PDF con diseño corporativo CenthriX.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const logger = require('../utils/logger');

const LOGO_PATH = path.join(__dirname, '../assets/logo-negro.png');

// Paleta CenthriX
const COLORES = {
  primario:        '#1A1B3A',
  fondoOscuro:     '#0F1023',
  acento:          '#E74C3C',
  blanco:          '#FFFFFF',
  textoPrincipal:  '#333333',
  textoSecundario: '#666666',
  textoTenue:      '#AAAAAA',
  filaPar:         '#FAFAFA',
  filaImpar:       '#FFFFFF',
  separador:       '#F0F0F0',
  kpiBg:           '#F8F8F8',
  verde:           '#2ECC71',
  azul:            '#3498DB',
  morado:          '#9B59B6',
  amarillo:        '#F39C12',
};

// ─────────────────────────────────────────────
// HELPERS COMUNES
// ─────────────────────────────────────────────

/**
 * Encabezado CenthriX: fondo oscuro + banda roja + logo + título + fecha
 * @param {PDFDocument} doc
 * @param {string} titulo
 * @param {string} [subtitulo='']
 */
const agregarEncabezado = (doc, titulo, subtitulo = '') => {
  const W = doc.page.width;
  const H = 70;

  // Fondo oscuro principal
  doc.rect(0, 0, W, H).fill(COLORES.primario);

  // Banda degradada en el lado izquierdo (más oscura)
  doc.rect(0, 0, W * 0.35, H).fill(COLORES.fondoOscuro);

  // Banda roja superior de 4pt
  doc.rect(0, 0, W, 4).fill(COLORES.acento);

  // Logo
  try {
    doc.image(LOGO_PATH, 20, 13, { fit: [52, 44], align: 'left', valign: 'center' });
  } catch (_) {
    // fallback: rectángulo blanco semitransparente
    doc.rect(20, 13, 52, 44).fill('#FFFFFF').fillOpacity(0.15);
  }

  // Nombre de marca
  doc.fontSize(6.5)
     .fillColor(COLORES.acento)
     .fillOpacity(1)
     .text('ISTHO S.A.S. · CenthriX CRM', 82, 16, { continued: false });

  // Título del reporte
  doc.fontSize(15)
     .fillColor(COLORES.blanco)
     .text(titulo, 82, 26, { continued: false });

  // Subtítulo (opcional)
  if (subtitulo) {
    doc.fontSize(8)
       .fillColor(COLORES.textoSecundario)
       .text(subtitulo, 82, 46, { continued: false });
  }

  // Pill de fecha (esquina derecha)
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const pillW = 140;
  const pillX = W - pillW - 18;
  const pillY = 25;
  doc.roundedRect(pillX, pillY, pillW, 20, 4).fill(COLORES.acento);
  doc.fontSize(7.5)
     .fillColor(COLORES.blanco)
     .text(fecha, pillX, pillY + 6, { width: pillW, align: 'center' });

  doc.y = H + 5;
};

/**
 * Sección de KPI cards horizontales
 * @param {PDFDocument} doc
 * @param {Array<{label:string, valor:string|number, subtexto?:string, color?:string}>} kpis
 */
const agregarKpis = (doc, kpis) => {
  const W = doc.page.width;
  const startX = 30;
  const secW = W - 60;
  const secH = 52;
  const startY = doc.y;

  // Fondo sección
  doc.rect(startX, startY, secW, secH).fill(COLORES.kpiBg);
  doc.rect(startX, startY + secH - 1, secW, 1).fill('#E8E8E8');

  const cardW = secW / kpis.length;
  const padding = 8;

  kpis.forEach((kpi, i) => {
    const cx = startX + i * cardW;
    const color = kpi.color || COLORES.acento;

    // Card fondo
    doc.rect(cx + padding / 2, startY + padding / 2, cardW - padding, secH - padding)
       .fill(COLORES.blanco)
       .stroke('#EEEEEE');

    // Borde izquierdo de color
    doc.rect(cx + padding / 2, startY + padding / 2, 4, secH - padding).fill(color);

    // Label
    const labelX = cx + padding / 2 + 8;
    const labelY = startY + padding / 2 + 5;
    doc.fontSize(6.5)
       .fillColor(COLORES.textoTenue)
       .text(String(kpi.label).toUpperCase(), labelX, labelY, { width: cardW - padding - 12 });

    // Valor
    doc.fontSize(17)
       .fillColor(COLORES.primario)
       .text(String(kpi.valor), labelX, labelY + 10, { width: cardW - padding - 12 });

    // Subtexto
    if (kpi.subtexto) {
      doc.fontSize(6.5)
         .fillColor('#CCCCCC')
         .text(kpi.subtexto, labelX, labelY + 30, { width: cardW - padding - 12 });
    }
  });

  doc.y = startY + secH + 6;
};

/**
 * Pie de página CenthriX: fondo oscuro + marca izquierda + página derecha
 * @param {PDFDocument} doc
 * @param {number} numeroPagina
 * @param {number} [totalPaginas=0]
 */
const agregarPiePagina = (doc, numeroPagina, totalPaginas = 0) => {
  const W = doc.page.width;
  const footerH = 28;
  const footerY = doc.page.height - footerH;

  doc.rect(0, footerY, W, footerH).fill(COLORES.fondoOscuro);

  // Marca izquierda
  doc.fontSize(7)
     .fillColor(COLORES.acento)
     .text('CenthriX CRM · ISTHO S.A.S.', 20, footerY + 7, { continued: false });

  doc.fontSize(6.5)
     .fillColor('#555577')
     .text('Centro Logístico Industrial del Norte, Bodega 130 – Girardota, Antioquia', 20, footerY + 17, { continued: false });

  // Fecha generación + número de página (derecha)
  const ahora = new Date().toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const paginaLabel = totalPaginas > 0
    ? `Pág. ${numeroPagina} / ${totalPaginas}`
    : `Pág. ${numeroPagina}`;

  doc.fontSize(6.5)
     .fillColor('#555577')
     .text(`Generado: ${ahora}`, W - 220, footerY + 7, { width: 130, align: 'right' });

  doc.fontSize(7.5)
     .fillColor(COLORES.acento)
     .text(paginaLabel, W - 85, footerY + 7, { width: 65, align: 'right' });
};

/**
 * Tabla con diseño CenthriX
 * @param {PDFDocument} doc
 * @param {string[]} headers
 * @param {Array<Array<string|number>>} rows
 * @param {Object} opciones
 * @param {number[]} [opciones.anchoColumnas=[]]
 * @param {string[]} [opciones.alineacion=[]]
 * @param {number} [opciones.startX=30]
 * @param {number} [opciones.startY=doc.y]
 * @param {string} [opciones.etiquetaSeccion='']
 * @param {string} [opciones.titulosContinuacion='']
 */
const generarTabla = (doc, headers, rows, opciones = {}) => {
  const {
    anchoColumnas = [],
    alineacion = [],
    startX = 30,
    etiquetaSeccion = '',
    titulosContinuacion = '',
    paginaInicial = 1,
  } = opciones;

  const anchoTotal = doc.page.width - 60;
  const anchoPorColumna = anchoTotal / headers.length;

  // Etiqueta de sección antes de la tabla (sin caracteres Unicode especiales)
  if (etiquetaSeccion) {
    const ey = doc.y;
    doc.rect(startX, ey + 1, 3, 9).fill(COLORES.acento);
    doc.fontSize(8)
       .fillColor(COLORES.acento)
       .text(etiquetaSeccion, startX + 8, ey, { continued: false });
    doc.rect(startX, ey + 13, anchoTotal, 1).fill('#E8E8E8');
    doc.y = ey + 18;
  }

  let y = doc.y;
  let numeroPagina = paginaInicial;

  // Fila de encabezados
  const headerRowH = 22;
  doc.rect(startX, y, anchoTotal, headerRowH).fill(COLORES.primario);

  let x = startX;
  headers.forEach((header, i) => {
    const ancho = anchoColumnas[i] || anchoPorColumna;
    const align = alineacion[i] || 'left';
    doc.fontSize(8)
       .fillColor(COLORES.acento)
       .text(header, x + 5, y + 7, { width: ancho - 10, align });
    x += ancho;
  });

  y += headerRowH;

  // Filas
  const rowH = 18;
  rows.forEach((row, rowIndex) => {
    // Nueva página si no cabe la siguiente fila + espacio para footer
    if (y > doc.page.height - 60) {
      agregarPiePagina(doc, numeroPagina);
      numeroPagina++;
      doc.addPage();
      const cont = titulosContinuacion || 'Reporte (continuacion)';
      agregarEncabezado(doc, cont);
      y = doc.y;

      // Repetir encabezados en nueva página
      doc.rect(startX, y, anchoTotal, headerRowH).fill(COLORES.primario);
      let hx = startX;
      headers.forEach((header, i) => {
        const ancho = anchoColumnas[i] || anchoPorColumna;
        const align = alineacion[i] || 'left';
        doc.fontSize(8).fillColor(COLORES.acento).text(header, hx + 5, y + 7, { width: ancho - 10, align });
        hx += ancho;
      });
      y += headerRowH;
    }

    // Fondo alternado
    const bgColor = rowIndex % 2 === 1 ? COLORES.filaPar : COLORES.filaImpar;
    doc.rect(startX, y, anchoTotal, rowH).fill(bgColor);

    // Separador horizontal
    doc.strokeColor(COLORES.separador).lineWidth(0.5)
       .moveTo(startX, y + rowH)
       .lineTo(startX + anchoTotal, y + rowH)
       .stroke();

    x = startX;
    row.forEach((cell, i) => {
      const ancho = anchoColumnas[i] || anchoPorColumna;
      const align = alineacion[i] || 'left';
      doc.fontSize(8)
         .fillColor(COLORES.textoPrincipal)
         .text(String(cell ?? ''), x + 5, y + 5, { width: ancho - 10, align, lineBreak: false });
      x += ancho;
    });

    y += rowH;
  });

  // Borde inferior
  doc.rect(startX, y, anchoTotal, 1).fill(COLORES.primario);

  doc.y = y + 8;
  return numeroPagina;
};

// ─────────────────────────────────────────────
// GENERADORES
// ─────────────────────────────────────────────

/**
 * Generar PDF de operaciones
 */
const generarPDFOperaciones = async (operaciones, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE OPERACIONES', 'Ingresos, salidas y movimientos de inventario');

      const totalIngresos = operaciones.filter(o => o.tipo === 'ingreso').length;
      const totalSalidas  = operaciones.filter(o => o.tipo === 'salida').length;
      const totalUnidades = operaciones.reduce((s, o) => s + (parseFloat(o.total_unidades) || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Operaciones', valor: operaciones.length,                          subtexto: 'registros',   color: COLORES.acento },
        { label: 'Ingresos',          valor: totalIngresos,                               subtexto: 'CO · entrada', color: COLORES.verde  },
        { label: 'Salidas',           valor: totalSalidas,                                subtexto: 'PK · salida',  color: COLORES.acento },
        { label: 'Total Unidades',    valor: totalUnidades.toLocaleString('es-CO'),       subtexto: 'unidades',    color: COLORES.azul   },
      ]);

      const headers = ['N° Operación', 'Tipo', 'Cliente', 'Fecha', 'Estado', 'Unidades', 'Averías'];
      const rows = operaciones.map(op => [
        op.numero_operacion,
        op.tipo?.toUpperCase(),
        (op.cliente?.razon_social || 'N/A').substring(0, 25),
        op.fecha_operacion ? new Date(op.fecha_operacion).toLocaleDateString('es-CO') : '',
        op.estado?.toUpperCase(),
        parseFloat(op.total_unidades || 0).toLocaleString('es-CO'),
        op.total_averias || 0,
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [110, 65, 180, 85, 85, 90, 65],
        alineacion:    ['left', 'center', 'left', 'center', 'center', 'right', 'right'],
        etiquetaSeccion: 'Detalle de Operaciones',
        titulosContinuacion: 'REPORTE DE OPERACIONES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF operaciones generado:', { registros: operaciones.length });
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
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE INVENTARIO', 'Stock actual de productos en bodega');

      const totalUnidades = inventario.reduce((s, i) => s + (parseFloat(i.cantidad) || 0), 0);
      const valorTotal    = inventario.reduce((s, i) => s + ((parseFloat(i.cantidad) || 0) * (parseFloat(i.costo_unitario) || 0)), 0);

      agregarKpis(doc, [
        { label: 'Referencias',    valor: inventario.length,                                                         subtexto: 'productos',  color: COLORES.acento },
        { label: 'Total Unidades', valor: totalUnidades.toLocaleString('es-CO'),                                     subtexto: 'en bodega',  color: COLORES.azul   },
        { label: 'Valor Total',    valor: `$${valorTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,   subtexto: 'inventario', color: COLORES.verde  },
      ]);

      const headers = ['SKU', 'Producto', 'Cliente', 'Cantidad', 'Vencimiento', 'Estado'];
      const rows = inventario.map(item => [
        item.sku,
        (item.producto || '').substring(0, 32),
        (item.cliente?.razon_social || 'N/A').substring(0, 22),
        parseFloat(item.cantidad || 0).toLocaleString('es-CO'),
        item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-CO') : '',
        item.estado?.toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [85, 210, 125, 75, 100, 85],
        alineacion:    ['left', 'left', 'left', 'right', 'center', 'center'],
        etiquetaSeccion: 'Detalle de Inventario',
        titulosContinuacion: 'REPORTE DE INVENTARIO',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF inventario generado:', { registros: inventario.length });
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
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE CLIENTES', 'Directorio de clientes registrados en el sistema');

      const activos    = clientes.filter(c => c.estado === 'activo').length;
      const inactivos  = clientes.length - activos;
      const totalProds = clientes.reduce((s, c) => s + parseInt(c.getDataValue?.('total_productos') || c.total_productos || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Clientes', valor: clientes.length,                              subtexto: 'registrados', color: COLORES.acento },
        { label: 'Activos',        valor: activos,                                      subtexto: 'en operación', color: COLORES.verde  },
        { label: 'Inactivos',      valor: inactivos,                                    subtexto: 'suspendidos',  color: COLORES.textoSecundario },
        { label: 'Total Productos', valor: totalProds.toLocaleString('es-CO'),          subtexto: 'en inventario', color: COLORES.azul },
      ]);

      const headers = ['Código', 'Razón Social', 'NIT', 'Prod.', 'Ciudad', 'Teléfono', 'Email', 'Estado'];
      const rows = clientes.map(c => [
        c.codigo_cliente || '',
        (c.razon_social || '').substring(0, 28),
        c.nit || '',
        String(parseInt(c.getDataValue?.('total_productos') || c.total_productos || 0)),
        (c.ciudad || '').substring(0, 14),
        c.telefono || '',
        (c.email || '').substring(0, 24),
        (c.estado || '').toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [60, 162, 85, 38, 72, 75, 130, 58],
        alineacion:    ['left', 'left', 'left', 'center', 'left', 'left', 'left', 'center'],
        etiquetaSeccion: 'Directorio de Clientes',
        titulosContinuacion: 'REPORTE DE CLIENTES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF clientes generado:', { registros: clientes.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de detalle de operación (portrait, sin cambio de orientación)
 */
const generarPDFDetalleOperacion = async (operacion) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, `DETALLE DE OPERACIÓN`, operacion.numero_operacion);

      const seccionLabel = (texto) => {
        const sy = doc.y;
        doc.rect(50, sy + 1, 3, 9).fill(COLORES.acento);
        doc.fontSize(8).fillColor(COLORES.acento).text(texto, 58, sy, { continued: false });
        doc.rect(50, sy + 13, doc.page.width - 100, 1).fill('#E8E8E8');
        doc.y = sy + 18;
      };

      // Información general
      seccionLabel('INFORMACIÓN GENERAL');
      const info = [
        ['N° Operación:', operacion.numero_operacion],
        ['Documento WMS:', operacion.documento_wms],
        ['Tipo:', operacion.tipo?.toUpperCase()],
        ['Estado:', operacion.estado?.toUpperCase()],
        ['Cliente:', operacion.cliente?.razon_social || 'N/A'],
        ['Fecha:', operacion.fecha_operacion ? new Date(operacion.fecha_operacion).toLocaleDateString('es-CO') : ''],
      ];
      info.forEach(([label, value]) => {
        doc.fontSize(9)
           .fillColor(COLORES.textoSecundario)
           .text(label, 50, doc.y, { continued: true, width: 130 })
           .fillColor(COLORES.textoPrincipal)
           .text(value || 'N/A', { width: 350 });
      });

      doc.moveDown(0.8);
      seccionLabel('INFORMACIÓN DE TRANSPORTE');
      const transporte = [
        ['Origen:', operacion.origen || 'N/A'],
        ['Destino:', operacion.destino || 'N/A'],
        ['Placa:', operacion.vehiculo_placa || 'N/A'],
        ['Conductor:', operacion.conductor_nombre || 'N/A'],
        ['Cédula:', operacion.conductor_cedula || 'N/A'],
        ['Teléfono:', operacion.conductor_telefono || 'N/A'],
      ];
      transporte.forEach(([label, value]) => {
        doc.fontSize(9)
           .fillColor(COLORES.textoSecundario)
           .text(label, 50, doc.y, { continued: true, width: 130 })
           .fillColor(COLORES.textoPrincipal)
           .text(value, { width: 350 });
      });

      doc.moveDown(0.8);
      const headers = ['SKU', 'Producto', 'Cantidad', 'U.M.', 'Lote', 'Averías'];
      const rows = (operacion.detalles || []).map(d => [
        d.sku,
        (d.producto || '').substring(0, 28),
        parseFloat(d.cantidad || 0).toLocaleString('es-CO'),
        d.unidad_medida || 'UND',
        d.lote || '',
        d.cantidad_averia || 0,
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        startX: 50,
        anchoColumnas: [80, 190, 70, 50, 80, 50],
        alineacion:    ['left', 'left', 'right', 'center', 'left', 'right'],
        etiquetaSeccion: 'DETALLE DE PRODUCTOS',
        titulosContinuacion: `DETALLE DE OPERACION - ${operacion.numero_operacion}`,
        paginaInicial: 1,
      });

      doc.fontSize(9).fillColor(COLORES.textoPrincipal)
         .text(`Total Referencias: ${operacion.total_referencias || 0}`, 50)
         .text(`Total Unidades: ${parseFloat(operacion.total_unidades || 0).toLocaleString('es-CO')}`)
         .text(`Total Averias: ${operacion.total_averias || 0}`);

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF detalle operación generado:', { operacion: operacion.numero_operacion });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de viajes
 */
const generarPDFViajes = async (viajes, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE VIAJES', 'Historial de viajes, rutas y conductores');

      const completados  = viajes.filter(v => v.estado === 'completado').length;
      const enProgreso   = viajes.filter(v => v.estado === 'en_progreso').length;
      const totalGastos  = viajes.reduce((s, v) => s + (parseFloat(v.valor_viaje) || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Viajes',   valor: viajes.length,                                                           subtexto: 'registros',     color: COLORES.acento  },
        { label: 'En Progreso',    valor: enProgreso,                                                              subtexto: 'activos',        color: COLORES.azul    },
        { label: 'Completados',    valor: completados,                                                             subtexto: 'finalizados',    color: COLORES.verde   },
        { label: 'Total Gastos',   valor: `$${totalGastos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, subtexto: 'valor viajes',   color: COLORES.morado  },
      ]);

      const headers = ['N° Viaje', 'Conductor', 'Vehículo', 'Origen', 'Destino', 'Fecha', 'Estado', 'Valor'];
      const rows = viajes.map(v => [
        v.numero || '',
        (v.conductor?.nombre_completo || 'N/A').substring(0, 22),
        v.vehiculo?.placa || 'N/A',
        (v.origen || '').substring(0, 18),
        (v.destino || '').substring(0, 18),
        v.fecha ? new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-CO') : '',
        (v.estado || '').toUpperCase(),
        `$${(parseFloat(v.valor_viaje) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [65, 140, 70, 100, 100, 75, 80, 80],
        alineacion:    ['left', 'left', 'center', 'left', 'left', 'center', 'center', 'right'],
        etiquetaSeccion: 'Detalle de Viajes',
        titulosContinuacion: 'REPORTE DE VIAJES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF viajes generado:', { registros: viajes.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de cajas menores
 */
const generarPDFCajasMenores = async (cajas, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE CAJAS MENORES', 'Estado y saldos de cajas menores');

      const activas     = cajas.filter(c => c.estado === 'activa').length;
      const cerradas    = cajas.filter(c => c.estado === 'cerrada').length;
      const saldoTotal  = cajas.reduce((s, c) => s + (parseFloat(c.saldo_actual) || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Cajas',   valor: cajas.length,                                                              subtexto: 'registradas',  color: COLORES.acento },
        { label: 'Activas',       valor: activas,                                                                   subtexto: 'en uso',        color: COLORES.verde  },
        { label: 'Cerradas',      valor: cerradas,                                                                  subtexto: 'liquidadas',    color: COLORES.azul   },
        { label: 'Saldo Total',   valor: `$${saldoTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,  subtexto: 'saldo actual',  color: COLORES.morado },
      ]);

      const headers = ['N° Caja', 'Asignado A', 'Monto Inicial', 'Saldo Actual', 'Fecha Apertura', 'Fecha Cierre', 'Estado'];
      const rows = cajas.map(c => [
        c.numero || '',
        (c.asignado?.nombre_completo || 'N/A').substring(0, 28),
        `$${(parseFloat(c.saldo_inicial) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        `$${(parseFloat(c.saldo_actual) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        c.fecha_apertura ? new Date(c.fecha_apertura + 'T00:00:00').toLocaleDateString('es-CO') : '',
        c.fecha_cierre   ? new Date(c.fecha_cierre   + 'T00:00:00').toLocaleDateString('es-CO') : '—',
        (c.estado || '').toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [65, 165, 95, 95, 95, 95, 80],
        alineacion:    ['left', 'left', 'right', 'right', 'center', 'center', 'center'],
        etiquetaSeccion: 'Detalle de Cajas Menores',
        titulosContinuacion: 'REPORTE DE CAJAS MENORES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF cajas menores generado:', { registros: cajas.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de gastos (movimientos de caja menor)
 */
const generarPDFGastos = async (movimientos, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE GASTOS', 'Movimientos de cajas menores');

      const aprobados  = movimientos.filter(m => m.aprobado).length;
      const pendientes = movimientos.filter(m => !m.aprobado && !m.rechazado).length;
      const totalMonto = movimientos.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Movimientos', valor: movimientos.length,                                                         subtexto: 'registros',    color: COLORES.acento },
        { label: 'Aprobados',         valor: aprobados,                                                                  subtexto: 'confirmados',  color: COLORES.verde  },
        { label: 'Pendientes',        valor: pendientes,                                                                 subtexto: 'por revisar',  color: COLORES.azul   },
        { label: 'Total Monto',       valor: `$${totalMonto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,   subtexto: 'gastos',       color: COLORES.morado },
      ]);

      const headers = ['N° Mov.', 'Caja', 'Concepto', 'Descripción', 'Fecha', 'Monto', 'Estado', 'Usuario'];
      const rows = movimientos.map(m => [
        m.consecutivo || '',
        m.cajaMenor?.numero || 'N/A',
        (m.concepto || '').substring(0, 18),
        (m.descripcion || '').substring(0, 28),
        m.created_at ? new Date(m.created_at).toLocaleDateString('es-CO') : '',
        `$${(parseFloat(m.valor) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        m.aprobado ? 'APROBADO' : m.rechazado ? 'RECHAZADO' : 'PENDIENTE',
        (m.usuario?.nombre_completo || 'N/A').substring(0, 20),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [52, 55, 100, 160, 72, 80, 80, 115],
        alineacion:    ['center', 'center', 'left', 'left', 'center', 'right', 'center', 'left'],
        etiquetaSeccion: 'Detalle de Movimientos',
        titulosContinuacion: 'REPORTE DE GASTOS',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF gastos generado:', { registros: movimientos.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de averías
 */
const generarPDFAverias = async (averias, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Subtítulo con rango de fechas si aplica
      let subtitulo = 'Registro de daños y averías en operaciones';
      if (filtros.fecha_desde || filtros.fecha_hasta) {
        const desde = filtros.fecha_desde || '';
        const hasta = filtros.fecha_hasta || '';
        subtitulo = `Período: ${desde}${desde && hasta ? ' al ' : ''}${hasta}`;
      }

      agregarEncabezado(doc, 'REPORTE DE AVERÍAS', subtitulo);

      const totalUnidades = averias.reduce((s, a) => s + (parseFloat(a.cantidad) || 0), 0);
      const operacionesAfectadas = new Set(averias.map(a => a.operacion_id)).size;
      const tiposAveria = averias.reduce((acc, a) => {
        if (a.tipo_averia) acc[a.tipo_averia] = (acc[a.tipo_averia] || 0) + 1;
        return acc;
      }, {});
      const tipoFrecuente = Object.keys(tiposAveria).sort((a, b) => tiposAveria[b] - tiposAveria[a])[0] || '—';

      agregarKpis(doc, [
        { label: 'Total Averías',         valor: averias.length,                                subtexto: 'registros',        color: COLORES.acento },
        { label: 'Unidades Averiadas',    valor: totalUnidades.toLocaleString('es-CO'),          subtexto: 'unidades',         color: COLORES.amarillo || COLORES.morado },
        { label: 'Operaciones Afectadas', valor: operacionesAfectadas,                           subtexto: 'operaciones',      color: COLORES.azul   },
        { label: 'Tipo Más Frecuente',    valor: tipoFrecuente,                                  subtexto: 'tipo de avería',   color: COLORES.morado },
      ]);

      const headers = ['#', 'Fecha', 'N° Registro', 'Tipo', 'Cliente', 'Origen', 'Referencia', 'Producto', 'Tipo Avería', 'Cant.', 'Descripción', 'Registrado por'];
      const rows = averias.map((a, idx) => {
        const fechaRaw = a.operacion?.fecha_operacion;
        let fecha = '';
        if (fechaRaw) {
          const d = new Date(String(fechaRaw) + 'T00:00:00');
          fecha = d.toLocaleDateString('es-CO');
        }
        return [
          idx + 1,
          fecha,
          a.operacion?.numero_operacion || '—',
          (a.operacion?.tipo || '—').toUpperCase(),
          (a.operacion?.cliente?.razon_social || '—').substring(0, 18),
          (a.operacion?.origen || '—').substring(0, 14),
          a.sku || '—',
          (a.detalle?.producto || '—').substring(0, 20),
          (a.tipo_averia || '—').substring(0, 14),
          parseFloat(a.cantidad) || 0,
          (a.descripcion || '').substring(0, 20),
          (a.registrador?.nombre_completo || '—').substring(0, 16),
        ];
      });

      // Anchos: total usable = 792 - 60 = 732
      // #(22) Fecha(52) N°Reg(68) Tipo(42) Cliente(90) Origen(62) Ref(55) Producto(88) TipoAv(62) Cant(38) Desc(90) Registrador(63) = 732
      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [22, 52, 68, 42, 90, 62, 55, 88, 62, 38, 90, 63],
        alineacion:    ['center', 'center', 'left', 'center', 'left', 'left', 'left', 'left', 'left', 'right', 'left', 'left'],
        etiquetaSeccion: 'Detalle de Averías',
        titulosContinuacion: 'REPORTE DE AVERÍAS',
        paginaInicial: 1,
      });

      // Pie con totales
      doc.fontSize(8)
         .fillColor(COLORES.textoPrincipal)
         .text(`Total registros: ${averias.length}   |   Total unidades averiadas: ${totalUnidades.toLocaleString('es-CO')}`, 30, doc.y + 4);

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF averías generado:', { registros: averias.length });
    } catch (error) {
      reject(error);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIO POR UBICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const generarPDFInventarioUbicacion = async (cajas, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'INVENTARIO POR UBICACIÓN', 'Detalle de cajas disponibles por ubicación en bodega');

      const totalCajas = cajas.length;
      const totalUnidades = cajas.reduce((s, c) => s + (parseFloat(c.cantidad) || 0), 0);
      const ubicaciones = new Set(cajas.map(c => c.ubicacion).filter(Boolean)).size;
      const productos = new Set(cajas.map(c => c.inventario_id)).size;

      agregarKpis(doc, [
        { label: 'Total Cajas',  valor: totalCajas,                                      subtexto: 'registros', color: COLORES.azul   },
        { label: 'Unidades',     valor: totalUnidades.toLocaleString('es-CO'),            subtexto: 'en bodega', color: COLORES.verde  },
        { label: 'Ubicaciones',  valor: ubicaciones,                                      subtexto: 'únicas',   color: COLORES.acento },
        { label: 'Productos',    valor: productos,                                        subtexto: 'únicos',   color: COLORES.morado || COLORES.azul },
      ]);

      const hoy = new Date();
      const headers = ['#', 'Ref.', 'Caja', 'Saldo', 'Descripción', 'Unidad', 'Lote', 'Ubicación', 'Venc.'];
      const rows = cajas.map((c, idx) => {
        const fv = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null;
        const dias = fv ? Math.ceil((fv - hoy) / (1000 * 60 * 60 * 24)) : '';
        return [
          idx + 1,
          c.inventario?.id || c.inventario_id || '',
          c.numero_caja || '',
          parseFloat(c.cantidad || 0).toLocaleString('es-CO'),
          (c.inventario?.producto || '').substring(0, 30),
          c.unidad_medida || c.inventario?.unidad_medida || 'UND',
          c.lote || '',
          c.ubicacion || '',
          dias !== '' ? `${dias}d` : '',
        ];
      });

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [30, 45, 60, 65, 195, 45, 70, 85, 45],
        alineacion:    ['center', 'right', 'right', 'right', 'left', 'center', 'right', 'center', 'right'],
        etiquetaSeccion: 'Detalle por Ubicación',
        titulosContinuacion: 'INVENTARIO POR UBICACIÓN',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF inventario-ubicacion generado:', { registros: totalCajas });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generarPDFOperaciones,
  generarPDFInventario,
  generarPDFInventarioUbicacion,
  generarPDFDetalleOperacion,
  generarPDFClientes,
  generarPDFViajes,
  generarPDFCajasMenores,
  generarPDFGastos,
  generarPDFAverias,
};
