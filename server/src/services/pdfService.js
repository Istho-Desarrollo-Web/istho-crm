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
  primario: '#1A1B3A',
  fondoOscuro: '#0F1023',
  acento: '#E74C3C',
  blanco: '#FFFFFF',
  textoPrincipal: '#333333',
  textoSecundario: '#666666',
  textoTenue: '#AAAAAA',
  filaPar: '#FAFAFA',
  filaImpar: '#FFFFFF',
  separador: '#F0F0F0',
  kpiBg: '#F8F8F8',
  verde: '#2ECC71',
  azul: '#3498DB',
  morado: '#9B59B6',
  amarillo: '#F39C12',
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

  // Logo — versión blanca (texto blanco sobre fondo oscuro, círculo negro se funde con el header)
  try {
    doc.image(LOGO_PATH, 16, 10, { fit: [52, 50], align: 'left', valign: 'center' });
  } catch (_) {
    doc.rect(16, 10, 52, 50).fill('#FFFFFF').fillOpacity(0.15);
  }

  // Nombre de marca
  doc
    .fontSize(6.5)
    .fillColor(COLORES.acento)
    .fillOpacity(1)
    .text('ISTHO S.A.S. · CenthriX CRM', 78, 16, { continued: false });

  // Título del reporte
  doc.fontSize(15).fillColor(COLORES.blanco).text(titulo, 78, 26, { continued: false });

  // Subtítulo (opcional)
  if (subtitulo) {
    doc
      .fontSize(8)
      .fillColor(COLORES.textoSecundario)
      .text(subtitulo, 78, 46, { continued: false });
  }

  // Pill de fecha (esquina derecha)
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const pillW = 140;
  const pillX = W - pillW - 18;
  const pillY = 25;
  doc.roundedRect(pillX, pillY, pillW, 20, 4).fill(COLORES.acento);
  doc
    .fontSize(7.5)
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
    doc
      .rect(cx + padding / 2, startY + padding / 2, cardW - padding, secH - padding)
      .fill(COLORES.blanco)
      .stroke('#EEEEEE');

    // Borde izquierdo de color
    doc.rect(cx + padding / 2, startY + padding / 2, 4, secH - padding).fill(color);

    // Label
    const labelX = cx + padding / 2 + 8;
    const labelY = startY + padding / 2 + 5;
    doc
      .fontSize(6.5)
      .fillColor(COLORES.textoTenue)
      .text(String(kpi.label).toUpperCase(), labelX, labelY, { width: cardW - padding - 12 });

    // Valor
    doc
      .fontSize(17)
      .fillColor(COLORES.primario)
      .text(String(kpi.valor), labelX, labelY + 10, { width: cardW - padding - 12 });

    // Subtexto
    if (kpi.subtexto) {
      doc
        .fontSize(6.5)
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
  doc
    .fontSize(7)
    .fillColor(COLORES.acento)
    .text('CenthriX CRM · ISTHO S.A.S.', 20, footerY + 7, { continued: false });

  doc
    .fontSize(6.5)
    .fillColor('#555577')
    .text(
      'Centro Logístico Industrial del Norte, Bodega 130 – Girardota, Antioquia',
      20,
      footerY + 17,
      { continued: false }
    );

  // Fecha generación + número de página (derecha)
  const ahora = new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const paginaLabel =
    totalPaginas > 0 ? `Pág. ${numeroPagina} / ${totalPaginas}` : `Pág. ${numeroPagina}`;

  doc
    .fontSize(6.5)
    .fillColor('#555577')
    .text(`Generado: ${ahora}`, W - 220, footerY + 7, { width: 130, align: 'right' });

  doc
    .fontSize(7.5)
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
    doc
      .fontSize(8)
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
    doc
      .fontSize(8)
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
        doc
          .fontSize(8)
          .fillColor(COLORES.acento)
          .text(header, hx + 5, y + 7, { width: ancho - 10, align });
        hx += ancho;
      });
      y += headerRowH;
    }

    // Fondo alternado
    const bgColor = rowIndex % 2 === 1 ? COLORES.filaPar : COLORES.filaImpar;
    doc.rect(startX, y, anchoTotal, rowH).fill(bgColor);

    // Separador horizontal
    doc
      .strokeColor(COLORES.separador)
      .lineWidth(0.5)
      .moveTo(startX, y + rowH)
      .lineTo(startX + anchoTotal, y + rowH)
      .stroke();

    x = startX;
    row.forEach((cell, i) => {
      const ancho = anchoColumnas[i] || anchoPorColumna;
      const align = alineacion[i] || 'left';
      doc
        .fontSize(8)
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
const generarPDFOperaciones = async (operaciones, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(
        doc,
        'REPORTE DE OPERACIONES',
        'Ingresos, salidas y movimientos de inventario'
      );

      const totalIngresos = operaciones.filter((o) => o.tipo === 'ingreso').length;
      const totalSalidas = operaciones.filter((o) => o.tipo === 'salida').length;
      const totalUnidades = operaciones.reduce(
        (s, o) => s + (parseFloat(o.total_unidades) || 0),
        0
      );

      agregarKpis(doc, [
        {
          label: 'Total Operaciones',
          valor: operaciones.length,
          subtexto: 'registros',
          color: COLORES.acento,
        },
        { label: 'Ingresos', valor: totalIngresos, subtexto: 'CO · entrada', color: COLORES.verde },
        { label: 'Salidas', valor: totalSalidas, subtexto: 'PK · salida', color: COLORES.acento },
        {
          label: 'Total Unidades',
          valor: totalUnidades.toLocaleString('es-CO'),
          subtexto: 'unidades',
          color: COLORES.azul,
        },
      ]);

      const headers = ['N° Operación', 'Tipo', 'Cliente', 'Fecha', 'Estado', 'Unidades', 'Averías'];
      const rows = operaciones.map((op) => [
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
        alineacion: ['left', 'center', 'left', 'center', 'center', 'right', 'right'],
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
const generarPDFInventario = async (inventario, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE INVENTARIO', 'Stock actual de productos en bodega');

      const totalUnidades = inventario.reduce((s, i) => s + (parseFloat(i.cantidad) || 0), 0);
      const valorTotal = inventario.reduce(
        (s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.costo_unitario) || 0),
        0
      );

      agregarKpis(doc, [
        {
          label: 'Referencias',
          valor: inventario.length,
          subtexto: 'productos',
          color: COLORES.acento,
        },
        {
          label: 'Total Unidades',
          valor: totalUnidades.toLocaleString('es-CO'),
          subtexto: 'en bodega',
          color: COLORES.azul,
        },
        {
          label: 'Valor Total',
          valor: `$${valorTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'inventario',
          color: COLORES.verde,
        },
      ]);

      const headers = ['SKU', 'Producto', 'Cliente', 'Cantidad', 'Vencimiento', 'Estado'];
      const rows = inventario.map((item) => [
        item.sku,
        (item.producto || '').substring(0, 32),
        (item.cliente?.razon_social || 'N/A').substring(0, 22),
        parseFloat(item.cantidad || 0).toLocaleString('es-CO'),
        item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-CO') : '',
        item.estado?.toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [85, 210, 125, 75, 100, 85],
        alineacion: ['left', 'left', 'left', 'right', 'center', 'center'],
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
const generarPDFClientes = async (clientes, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(
        doc,
        'REPORTE DE CLIENTES',
        'Directorio de clientes registrados en el sistema'
      );

      const activos = clientes.filter((c) => c.estado === 'activo').length;
      const inactivos = clientes.length - activos;
      const totalProds = clientes.reduce(
        (s, c) => s + parseInt(c.getDataValue?.('total_productos') || c.total_productos || 0),
        0
      );

      agregarKpis(doc, [
        {
          label: 'Total Clientes',
          valor: clientes.length,
          subtexto: 'registrados',
          color: COLORES.acento,
        },
        { label: 'Activos', valor: activos, subtexto: 'en operación', color: COLORES.verde },
        {
          label: 'Inactivos',
          valor: inactivos,
          subtexto: 'suspendidos',
          color: COLORES.textoSecundario,
        },
        {
          label: 'Total Productos',
          valor: totalProds.toLocaleString('es-CO'),
          subtexto: 'en inventario',
          color: COLORES.azul,
        },
      ]);

      const headers = [
        'Código',
        'Razón Social',
        'NIT',
        'Prod.',
        'Ciudad',
        'Teléfono',
        'Email',
        'Estado',
      ];
      const rows = clientes.map((c) => [
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
        alineacion: ['left', 'left', 'left', 'center', 'left', 'left', 'left', 'center'],
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
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
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
        [
          'Fecha:',
          operacion.fecha_operacion
            ? new Date(operacion.fecha_operacion).toLocaleDateString('es-CO')
            : '',
        ],
      ];
      info.forEach(([label, value]) => {
        doc
          .fontSize(9)
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
        doc
          .fontSize(9)
          .fillColor(COLORES.textoSecundario)
          .text(label, 50, doc.y, { continued: true, width: 130 })
          .fillColor(COLORES.textoPrincipal)
          .text(value, { width: 350 });
      });

      doc.moveDown(0.8);
      const headers = ['SKU', 'Producto', 'Cantidad', 'U.M.', 'Lote', 'Averías'];
      const rows = (operacion.detalles || []).map((d) => [
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
        alineacion: ['left', 'left', 'right', 'center', 'left', 'right'],
        etiquetaSeccion: 'DETALLE DE PRODUCTOS',
        titulosContinuacion: `DETALLE DE OPERACION - ${operacion.numero_operacion}`,
        paginaInicial: 1,
      });

      doc
        .fontSize(9)
        .fillColor(COLORES.textoPrincipal)
        .text(`Total Referencias: ${operacion.total_referencias || 0}`, 50)
        .text(
          `Total Unidades: ${parseFloat(operacion.total_unidades || 0).toLocaleString('es-CO')}`
        )
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
const generarPDFViajes = async (viajes, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE VIAJES', 'Historial de viajes, rutas y conductores');

      const completados = viajes.filter((v) => v.estado === 'completado').length;
      const enProgreso = viajes.filter((v) => v.estado === 'en_progreso').length;
      const totalGastos = viajes.reduce((s, v) => s + (parseFloat(v.valor_viaje) || 0), 0);

      agregarKpis(doc, [
        {
          label: 'Total Viajes',
          valor: viajes.length,
          subtexto: 'registros',
          color: COLORES.acento,
        },
        { label: 'En Progreso', valor: enProgreso, subtexto: 'activos', color: COLORES.azul },
        { label: 'Completados', valor: completados, subtexto: 'finalizados', color: COLORES.verde },
        {
          label: 'Total Gastos',
          valor: `$${totalGastos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'valor viajes',
          color: COLORES.morado,
        },
      ]);

      const headers = [
        'N° Viaje',
        'Conductor',
        'Vehículo',
        'Origen',
        'Destino',
        'Fecha',
        'Estado',
        'Valor',
      ];
      const rows = viajes.map((v) => [
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
        alineacion: ['left', 'left', 'center', 'left', 'left', 'center', 'center', 'right'],
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
 * Generar PDF de vehículos
 */
const generarPDFVehiculos = async (vehiculos, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE VEHÍCULOS', 'Gestión de flota y documentos de transporte');

      const activos = vehiculos.filter((v) => v.estado === 'activo').length;
      const mantenimiento = vehiculos.filter((v) => v.estado === 'mantenimiento').length;
      const inactivos = vehiculos.filter((v) => v.estado === 'inactivo').length;

      agregarKpis(doc, [
        {
          label: 'Total Vehículos',
          valor: vehiculos.length,
          subtexto: 'flota registrada',
          color: COLORES.acento,
        },
        { label: 'Activos', valor: activos, subtexto: 'operativos', color: COLORES.verde },
        {
          label: 'En Taller',
          valor: mantenimiento,
          subtexto: 'mantenimiento',
          color: COLORES.amarillo,
        },
        {
          label: 'Fuera Servicio',
          valor: inactivos,
          subtexto: 'inactivos',
          color: COLORES.textoTenue,
        },
      ]);

      const headers = [
        'Placa',
        'Tipo',
        'Marca / Modelo',
        'Cap. (Ton)',
        'Conductor',
        'SOAT Vence',
        'Tecno Vence',
        'Estado',
      ];
      const rows = vehiculos.map((v) => [
        v.placa || '',
        (v.tipo_vehiculo || '').toUpperCase().substring(0, 12),
        `${v.marca || ''} ${v.modelo || ''}`.substring(0, 20),
        parseFloat(v.capacidad_ton || 0).toFixed(1),
        (v.conductor?.nombre_completo || 'N/A').substring(0, 25),
        v.vencimiento_soat || 'N/A',
        v.vencimiento_tecnicomecanica || 'N/A',
        (v.estado || '').toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [65, 80, 140, 65, 140, 80, 80, 80],
        alineacion: ['left', 'center', 'left', 'right', 'left', 'center', 'center', 'center'],
        etiquetaSeccion: 'Lista de Vehículos',
        titulosContinuacion: 'REPORTE DE VEHÍCULOS (Continuación)',
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF vehiculos generado:', { registros: vehiculos.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de cajas menores
 */
const generarPDFCajasMenores = async (cajas, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE CAJAS MENORES', 'Estado y saldos de cajas menores');

      const activas = cajas.filter((c) => c.estado === 'activa').length;
      const cerradas = cajas.filter((c) => c.estado === 'cerrada').length;
      const saldoTotal = cajas.reduce((s, c) => s + (parseFloat(c.saldo_actual) || 0), 0);

      agregarKpis(doc, [
        {
          label: 'Total Cajas',
          valor: cajas.length,
          subtexto: 'registradas',
          color: COLORES.acento,
        },
        { label: 'Activas', valor: activas, subtexto: 'en uso', color: COLORES.verde },
        { label: 'Cerradas', valor: cerradas, subtexto: 'liquidadas', color: COLORES.azul },
        {
          label: 'Saldo Total',
          valor: `$${saldoTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'saldo actual',
          color: COLORES.morado,
        },
      ]);

      const headers = [
        'N° Caja',
        'Asignado A',
        'Monto Inicial',
        'Saldo Actual',
        'Fecha Apertura',
        'Fecha Cierre',
        'Estado',
      ];
      const rows = cajas.map((c) => [
        c.numero || '',
        (c.asignado?.nombre_completo || 'N/A').substring(0, 28),
        `$${(parseFloat(c.saldo_inicial) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        `$${(parseFloat(c.saldo_actual) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        c.fecha_apertura
          ? new Date(c.fecha_apertura + 'T00:00:00').toLocaleDateString('es-CO')
          : '',
        c.fecha_cierre ? new Date(c.fecha_cierre + 'T00:00:00').toLocaleDateString('es-CO') : '—',
        (c.estado || '').toUpperCase(),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [65, 165, 95, 95, 95, 95, 80],
        alineacion: ['left', 'left', 'right', 'right', 'center', 'center', 'center'],
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
const generarPDFGastos = async (movimientos, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(doc, 'REPORTE DE GASTOS', 'Movimientos de cajas menores');

      const aprobados = movimientos.filter((m) => m.aprobado).length;
      const pendientes = movimientos.filter((m) => !m.aprobado && !m.rechazado).length;
      const totalMonto = movimientos.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);

      agregarKpis(doc, [
        {
          label: 'Total Movimientos',
          valor: movimientos.length,
          subtexto: 'registros',
          color: COLORES.acento,
        },
        { label: 'Aprobados', valor: aprobados, subtexto: 'confirmados', color: COLORES.verde },
        { label: 'Pendientes', valor: pendientes, subtexto: 'por revisar', color: COLORES.azul },
        {
          label: 'Total Monto',
          valor: `$${totalMonto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'gastos',
          color: COLORES.morado,
        },
      ]);

      const headers = [
        'N° Mov.',
        'Caja',
        'Concepto',
        'Descripción',
        'Fecha',
        'Monto',
        'Estado',
        'Usuario',
      ];
      const rows = movimientos.map((m) => [
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
        alineacion: ['center', 'center', 'left', 'left', 'center', 'right', 'center', 'left'],
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

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIO POR UBICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const generarPDFInventarioUbicacion = async (cajas, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      agregarEncabezado(
        doc,
        'INVENTARIO POR UBICACIÓN',
        'Detalle de cajas disponibles por ubicación en bodega'
      );

      const totalCajas = cajas.length;
      const totalUnidades = cajas.reduce((s, c) => s + (parseFloat(c.cantidad) || 0), 0);
      const ubicaciones = new Set(cajas.map((c) => c.ubicacion).filter(Boolean)).size;
      const productos = new Set(cajas.map((c) => c.inventario_id)).size;

      agregarKpis(doc, [
        { label: 'Total Cajas', valor: totalCajas, subtexto: 'registros', color: COLORES.azul },
        {
          label: 'Unidades',
          valor: totalUnidades.toLocaleString('es-CO'),
          subtexto: 'en bodega',
          color: COLORES.verde,
        },
        { label: 'Ubicaciones', valor: ubicaciones, subtexto: 'únicas', color: COLORES.acento },
        {
          label: 'Productos',
          valor: productos,
          subtexto: 'únicos',
          color: COLORES.morado || COLORES.azul,
        },
      ]);

      const headers = [
        '#',
        'Ref.',
        'SKU',
        'Caja',
        'Saldo',
        'Descripción',
        'Unidad',
        'Lote',
        'Ubicación',
      ];
      const rows = cajas.map((c, idx) => {
        return [
          idx + 1,
          c.inventario?.id || c.inventario_id || '',
          c.inventario?.sku || '',
          c.numero_caja || '',
          parseFloat(c.cantidad || 0).toLocaleString('es-CO'),
          (c.inventario?.producto || '').substring(0, 30),
          c.unidad_medida || c.inventario?.unidad_medida || 'UND',
          c.lote || '',
          c.ubicacion || '',
        ];
      });

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [28, 40, 85, 55, 60, 160, 40, 65, 80],
        alineacion: [
          'center',
          'right',
          'left',
          'right',
          'right',
          'left',
          'center',
          'right',
          'center',
        ],
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

// ═══════════════════════════════════════════════════════════════════════════
// SOLICITUDES
// ═══════════════════════════════════════════════════════════════════════════

const generarPDFSolicitudes = async (solicitudes, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const subtitulo = _filtros.desde || _filtros.hasta
        ? `Período: ${_filtros.desde || '...'} al ${_filtros.hasta || '...'}`
        : 'Tiempos de respuesta, cumplimiento y volumen';
      agregarEncabezado(doc, 'REPORTE DE SOLICITUDES', subtitulo);

      const completadas = solicitudes.filter((s) => s.estado === 'completada').length;
      const rechazadas = solicitudes.filter((s) => s.estado === 'rechazada').length;
      const tasa = solicitudes.length > 0 ? Math.round((completadas / solicitudes.length) * 100) : 0;

      agregarKpis(doc, [
        { label: 'Total Solicitudes', valor: solicitudes.length, subtexto: 'registros', color: COLORES.acento },
        { label: 'Completadas', valor: completadas, subtexto: `${tasa}% cumplimiento`, color: COLORES.verde },
        { label: 'Rechazadas', valor: rechazadas, subtexto: 'no procesadas', color: '#E74C3C' },
        { label: 'Pendientes', valor: solicitudes.length - completadas - rechazadas, subtexto: 'en proceso', color: COLORES.azul },
      ]);

      const ESTADO_LABEL = {
        recibida: 'Recibida', en_proceso: 'En proceso', completada: 'Completada', rechazada: 'Rechazada',
      };

      const headers = ['#', 'N° Solicitud', 'Cliente', 'Tipo', 'Estado', 'Fecha Envío', 'T. Resp. (días)', 'Operación'];
      const rows = solicitudes.map((s, i) => {
        const tiempoDias =
          s.operacion_id && s.updatedAt && s.createdAt
            ? `${Math.round(((new Date(s.updatedAt) - new Date(s.createdAt)) / (1000 * 60 * 60 * 24)) * 10) / 10}d`
            : '—';
        return [
          i + 1,
          s.numero_solicitud || '',
          (s.cliente?.razon_social || '').substring(0, 24),
          s.tipo === 'ingreso' ? 'Ingreso' : 'Despacho',
          ESTADO_LABEL[s.estado] || s.estado || '',
          s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-CO') : '—',
          tiempoDias,
          s.operacion_id ? `#${s.operacion_id}` : '—',
        ];
      });

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [30, 110, 145, 65, 80, 75, 80, 75],
        alineacion: ['center', 'left', 'left', 'center', 'center', 'center', 'center', 'center'],
        etiquetaSeccion: 'Detalle de Solicitudes',
        titulosContinuacion: 'REPORTE DE SOLICITUDES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF solicitudes generado:', { registros: solicitudes.length });
    } catch (error) {
      reject(error);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// AVERÍAS
// ─────────────────────────────────────────────────────────────────────────────

const generarPDFAverias = async (averias, _filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const subtitulo = _filtros.fecha_desde || _filtros.fecha_hasta
        ? `Período: ${_filtros.fecha_desde || '...'} al ${_filtros.fecha_hasta || '...'}`
        : 'Registro detallado de averías por operación';
      agregarEncabezado(doc, 'REPORTE DE AVERÍAS', subtitulo);

      const totalUnidades = averias.reduce((s, a) => s + (parseFloat(a.cantidad) || 0), 0);

      agregarKpis(doc, [
        { label: 'Total Averías', valor: averias.length, subtexto: 'registros', color: COLORES.acento },
        { label: 'Unidades Averiadas', valor: totalUnidades.toLocaleString('es-CO'), subtexto: 'afectadas', color: '#E74C3C' },
        {
          label: 'Operaciones Afectadas',
          valor: new Set(averias.map((a) => a.operacion_id)).size,
          subtexto: 'con averías',
          color: COLORES.azul,
        },
      ]);

      const headers = ['#', 'Fecha', 'N° Registro', 'Tipo', 'Cliente', 'Referencia', 'Tipo Avería', 'Cantidad', 'Registrado por'];
      const rows = averias.map((a, i) => [
        i + 1,
        a.operacion?.fecha_operacion
          ? new Date(a.operacion.fecha_operacion + 'T00:00:00').toLocaleDateString('es-CO')
          : '—',
        a.operacion?.numero_operacion || '—',
        (a.operacion?.tipo || '').toUpperCase(),
        (a.operacion?.cliente?.razon_social || '—').substring(0, 20),
        a.sku || '—',
        (a.tipo_averia || '—').substring(0, 18),
        (parseFloat(a.cantidad) || 0).toLocaleString('es-CO'),
        (a.registrador?.nombre_completo || '—').substring(0, 20),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [30, 68, 100, 55, 120, 80, 105, 60, 115],
        alineacion: ['center', 'center', 'left', 'center', 'left', 'left', 'left', 'right', 'left'],
        etiquetaSeccion: 'Detalle de Averías',
        titulosContinuacion: 'REPORTE DE AVERÍAS',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF averías generado:', { registros: averias.length });
    } catch (error) {
      reject(error);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORÍA DE ACCIONES
// ═══════════════════════════════════════════════════════════════════════════

const generarPDFAuditoriaAcciones = async (registros, filtros = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let subtitulo = 'Registro de actividad del sistema';
      if (filtros.fecha_desde || filtros.fecha_hasta) {
        subtitulo = `Período: ${filtros.fecha_desde || '...'} al ${filtros.fecha_hasta || '...'}`;
      }
      agregarEncabezado(doc, 'AUDITORÍA DE ACCIONES', subtitulo);

      const conteos = registros.reduce((acc, r) => {
        acc[r.accion] = (acc[r.accion] || 0) + 1;
        return acc;
      }, {});

      agregarKpis(doc, [
        {
          label: 'Total Registros',
          valor: registros.length,
          subtexto: 'acciones',
          color: COLORES.acento,
        },
        {
          label: 'Crear',
          valor: conteos.crear || 0,
          subtexto: 'inserciones',
          color: COLORES.verde,
        },
        {
          label: 'Actualizar',
          valor: conteos.actualizar || 0,
          subtexto: 'ediciones',
          color: COLORES.azul,
        },
        {
          label: 'Eliminar',
          valor: conteos.eliminar || 0,
          subtexto: 'bajas',
          color: COLORES.acento,
        },
      ]);

      const headers = ['Fecha', 'Usuario', 'Rol', 'Acción', 'Módulo', 'Descripción', 'IP'];
      const rows = registros.map((r) => {
        const fecha = r.created_at || r.createdAt;
        return [
          fecha
            ? new Date(fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
            : '',
          (r.usuario?.nombre_completo || r.usuario_nombre || 'Sistema').substring(0, 22),
          r.usuario?.rol || '',
          (r.accion || '').toUpperCase(),
          r.tabla || '',
          (r.descripcion || '').substring(0, 50),
          r.ip_address || '',
        ];
      });

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [90, 115, 60, 60, 80, 215, 80],
        alineacion: ['center', 'left', 'center', 'center', 'left', 'left', 'center'],
        etiquetaSeccion: 'Detalle de Acciones',
        titulosContinuacion: 'AUDITORÍA DE ACCIONES',
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF auditoría generado:', { registros: registros.length });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generar PDF de liquidación de una caja menor (detalle con todos sus movimientos)
 */
const generarPDFDetalleCajaMenor = async (caja) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const movimientos = caja.movimientos || [];
      const asignado = caja.asignado?.nombre_completo || 'N/A';
      const saldoInicial = parseFloat(caja.saldo_inicial) || 0;
      const saldoFinal = parseFloat(caja.saldo_actual) || 0;
      const totalEgresos = movimientos
        .filter((m) => m.tipo_movimiento === 'egreso' && m.aprobado)
        .reduce((s, m) => s + (parseFloat(m.valor_aprobado || m.valor) || 0), 0);

      agregarEncabezado(
        doc,
        `LIQUIDACIÓN DE CAJA MENOR ${caja.numero || ''}`,
        `Asignada a: ${asignado}`
      );

      agregarKpis(doc, [
        {
          label: 'Saldo Inicial',
          valor: `$${saldoInicial.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'apertura',
          color: COLORES.azul,
        },
        {
          label: 'Total Egresos',
          valor: `$${totalEgresos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'aprobados',
          color: COLORES.acento,
        },
        {
          label: 'Saldo Final',
          valor: `$${saldoFinal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          subtexto: 'al cierre',
          color: COLORES.verde,
        },
        {
          label: 'Movimientos',
          valor: movimientos.length,
          subtexto: 'registros',
          color: COLORES.morado,
        },
      ]);

      // Bloque de información de la caja
      const startX = 30;
      const secW = doc.page.width - 60;
      const infoY = doc.y;
      doc.rect(startX, infoY, secW, 26).fill(COLORES.kpiBg);

      const campos = [
        ['Estado:', (caja.estado || '').toUpperCase()],
        [
          'Apertura:',
          caja.fecha_apertura
            ? new Date(caja.fecha_apertura + 'T00:00:00').toLocaleDateString('es-CO')
            : '—',
        ],
        [
          'Cierre:',
          caja.fecha_cierre
            ? new Date(caja.fecha_cierre + 'T00:00:00').toLocaleDateString('es-CO')
            : 'Activa',
        ],
      ];

      const colW = secW / campos.length;
      campos.forEach(([label, valor], i) => {
        const cx = startX + i * colW;
        doc.fontSize(7).fillColor(COLORES.textoSecundario).text(label, cx + 8, infoY + 5);
        doc.fontSize(8.5).fillColor(COLORES.primario).text(valor, cx + 8, infoY + 14);
      });
      doc.y = infoY + 32;

      // Tabla de movimientos
      const headers = ['N°', 'Fecha', 'Tipo', 'Concepto', 'Descripción', 'Monto', 'Estado', 'Usuario'];
      const rows = movimientos.map((m) => [
        m.consecutivo || '',
        m.created_at ? new Date(m.created_at).toLocaleDateString('es-CO') : '',
        m.tipo_movimiento === 'egreso' ? 'Egreso' : 'Ingreso',
        (m.concepto || '').replace(/_/g, ' ').substring(0, 18),
        (m.descripcion || '—').substring(0, 28),
        `$${(parseFloat(m.valor_aprobado || m.valor) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        m.aprobado ? 'APROBADO' : m.rechazado ? 'RECHAZADO' : 'PENDIENTE',
        (m.usuario?.nombre_completo || 'N/A').substring(0, 22),
      ]);

      const finalPage = generarTabla(doc, headers, rows, {
        anchoColumnas: [32, 64, 50, 115, 165, 82, 72, 134],
        alineacion: ['center', 'center', 'center', 'left', 'left', 'right', 'center', 'left'],
        etiquetaSeccion: 'Detalle de Movimientos',
        titulosContinuacion: `LIQUIDACIÓN ${caja.numero || ''}`,
        paginaInicial: 1,
      });

      agregarPiePagina(doc, finalPage);
      doc.end();

      logger.info('PDF liquidación caja menor generado:', { numero: caja.numero });
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
  generarPDFVehiculos,
  generarPDFCajasMenores,
  generarPDFGastos,
  generarPDFAverias,
  generarPDFSolicitudes,
  generarPDFAuditoriaAcciones,
  generarPDFDetalleCajaMenor,
};
