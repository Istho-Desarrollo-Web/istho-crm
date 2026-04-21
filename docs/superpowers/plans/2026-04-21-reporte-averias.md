# Reporte de Averías — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear la página `/reportes/averias` con KPIs, gráficos, tabla de 13 columnas y exportación Excel/PDF, siguiendo el patrón exacto de `ReporteInventario`.

**Architecture:** Endpoint `GET /reportes/averias` devuelve datos + KPIs al frontend. Dos endpoints de exportación (`/excel`, `/pdf`) generan buffers con ExcelJS y PDFKit. El frontend replica la estructura de `ReporteInventario.jsx` adaptada a averías.

**Tech Stack:** Node.js + Sequelize + ExcelJS + PDFKit (backend) · React 19 + Vite + Tailwind 4 (frontend)

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| MODIFICAR | `server/src/controllers/reporteController.js` |
| MODIFICAR | `server/src/routes/reporte.routes.js` |
| MODIFICAR | `server/src/services/excelService.js` |
| MODIFICAR | `server/src/services/pdfService.js` |
| MODIFICAR | `frontend/src/api/reportes.service.js` |
| CREAR | `frontend/src/pages/Reportes/ReporteAverias.jsx` |
| MODIFICAR | `frontend/src/App.jsx` |

---

## Asociaciones Sequelize necesarias (referencia)

```js
// OperacionAveria associations (ya en models/index.js)
OperacionAveria.belongsTo(Operacion,       { foreignKey: 'operacion_id', as: 'operacion' });
OperacionAveria.belongsTo(OperacionDetalle,{ foreignKey: 'detalle_id',   as: 'detalle'   });
OperacionAveria.belongsTo(Usuario,          { foreignKey: 'registrado_por', as: 'registrador' });
Operacion.belongsTo(Cliente,               { foreignKey: 'cliente_id',  as: 'cliente'   });
```

---

## Task 1: Endpoint de datos GET /reportes/averias

**Files:**
- Modify: `server/src/controllers/reporteController.js` (agregar función al final, antes del module.exports)
- Modify: `server/src/routes/reporte.routes.js` (agregar ruta)

- [ ] **Step 1: Agregar la función `getReporteAverias` en `reporteController.js`**

Busca el bloque `module.exports` al final del archivo y agrega ANTES de él:

```js
/**
 * GET /reportes/averias
 * Datos de averías con KPIs para la vista
 */
const getReporteAverias = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id } = req.query;

    const whereOperacion = {};
    if (fecha_desde) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.gte]: fecha_desde };
    if (fecha_hasta) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.lte]: fecha_hasta };
    if (cliente_id)  whereOperacion.cliente_id = cliente_id;

    const averias = await OperacionAveria.findAll({
      include: [
        {
          model: Operacion,
          as: 'operacion',
          required: true,
          where: whereOperacion,
          attributes: ['id', 'numero_operacion', 'tipo', 'fecha_operacion', 'origen'],
          include: [
            { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] }
          ]
        },
        {
          model: OperacionDetalle,
          as: 'detalle',
          required: false,
          attributes: ['producto']
        },
        {
          model: Usuario,
          as: 'registrador',
          attributes: ['id', 'nombre_completo']
        }
      ],
      order: [[{ model: Operacion, as: 'operacion' }, 'fecha_operacion', 'DESC']],
      limit: MAX_EXPORT_ROWS
    });

    const totalUnidades = averias.reduce((s, a) => s + (parseFloat(a.cantidad) || 0), 0);
    const operacionesAfectadas = new Set(averias.map(a => a.operacion_id)).size;

    const conteoTipo = {};
    averias.forEach(a => {
      const t = a.tipo_averia || 'Sin tipo';
      conteoTipo[t] = (conteoTipo[t] || 0) + 1;
    });
    const tipoFrecuente = Object.entries(conteoTipo).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const porTipo = Object.entries(conteoTipo).map(([tipo, count]) => ({
      tipo,
      count,
      unidades: averias.filter(a => (a.tipo_averia || 'Sin tipo') === tipo)
                       .reduce((s, a) => s + (parseFloat(a.cantidad) || 0), 0)
    }));

    return success(res, {
      averias,
      kpis: {
        totalAverias: averias.length,
        totalUnidades,
        operacionesAfectadas,
        tipoFrecuente
      },
      porTipo
    });
  } catch (error) {
    logger.error('Error en getReporteAverias:', { message: error.message });
    return serverError(res, 'Error al obtener reporte de averías', error);
  }
};
```

- [ ] **Step 2: Agregar `getReporteAverias` en el `module.exports` de `reporteController.js`**

Abre el `module.exports = {` al final del archivo y agrega `getReporteAverias,` junto a las demás funciones.

- [ ] **Step 3: Agregar la ruta en `reporte.routes.js`**

Busca el bloque de rutas de inventario (línea ~46) y agrega a continuación:

```js
// Averías
router.get('/averias', requierePermiso('reportes', 'ver'), reporteController.getReporteAverias);
router.get('/averias/excel', requierePermiso('reportes', 'ver'), reporteController.exportarAveriasExcel);
router.get('/averias/pdf',   requierePermiso('reportes', 'ver'), reporteController.exportarAveriasPDF);
```

- [ ] **Step 4: Verificar servidor inicia sin errores**

```bash
cd server && npm run dev
```
Esperado: sin errores de sintaxis. Si hay error `reporteController.exportarAveriasExcel is not a function`, es normal — se implementa en Task 2.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/reporteController.js server/src/routes/reporte.routes.js
git commit -m "feat(reportes): endpoint GET /reportes/averias con KPIs"
```

---

## Task 2: Exportación Excel

**Files:**
- Modify: `server/src/services/excelService.js` (agregar función al final, antes del module.exports)
- Modify: `server/src/controllers/reporteController.js` (agregar exportarAveriasExcel y exportarAveriasPDF)

- [ ] **Step 1: Agregar `exportarAverias` en `excelService.js`**

Busca el `module.exports = {` al final y agrega ANTES de él:

```js
// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR AVERÍAS
// ═══════════════════════════════════════════════════════════════════════════

const exportarAverias = async (averias, filtros = {}) => {
  try {
    const wb = crearLibro();
    const ws = wb.addWorksheet('Averías', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    const COLS = [
      { header: '#',              key: 'idx',    width: 5,  align: 'center' },
      { header: 'Fecha',         key: 'fecha',  width: 14, align: 'center' },
      { header: 'N° Registro',   key: 'num',    width: 18, align: 'left'   },
      { header: 'Tipo',          key: 'tipo',   width: 10, align: 'center' },
      { header: 'Cliente',       key: 'cli',    width: 30, align: 'left'   },
      { header: 'Origen',        key: 'origen', width: 16, align: 'left'   },
      { header: 'Referencia',    key: 'sku',    width: 16, align: 'left'   },
      { header: 'Producto',      key: 'prod',   width: 32, align: 'left'   },
      { header: 'Tipo Avería',   key: 'tavg',   width: 18, align: 'center' },
      { header: 'Cant. Averiada',key: 'cant',   width: 14, align: 'right'  },
      { header: 'Descripción',   key: 'desc',   width: 36, align: 'left'   },
      { header: 'Registrado por',key: 'reg',    width: 24, align: 'left'   },
      { header: 'Tiene Foto',    key: 'foto',   width: 10, align: 'center' },
    ];

    ws.columns = COLS.map(c => ({ width: c.width }));

    let sub = null;
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      const desde = filtros.fecha_desde || '...';
      const hasta = filtros.fecha_hasta || '...';
      sub = `Período: ${desde} al ${hasta} | Generado el ${fechaHoy()}`;
    }

    let fila = agregarEncabezado(ws, 'REPORTE DE AVERÍAS', sub, COLS.length, wb);

    const totalUnidades = averias.reduce((s, a) => s + (parseFloat(a.cantidad) || 0), 0);

    fila = agregarResumen(ws, fila, [
      { label: 'Total registros:',         value: averias.length },
      { label: 'Total unidades averiadas:', value: totalUnidades, numFmt: '0.###' },
    ], COLS.length);

    const filas = averias.map((a, i) => [
      i + 1,
      a.operacion?.fecha_operacion ? new Date(a.operacion.fecha_operacion + 'T00:00:00') : null,
      a.operacion?.numero_operacion || '',
      (a.operacion?.tipo || '').toUpperCase(),
      a.operacion?.cliente?.razon_social || '—',
      a.operacion?.origen || '—',
      a.sku || '',
      a.detalle?.producto || '—',
      a.tipo_averia || '—',
      parseFloat(a.cantidad) || 0,
      a.descripcion || '',
      a.registrador?.nombre_completo || '—',
      a.foto_url ? 'Sí' : 'No',
    ]);

    const dataFila = crearTablaExcel(ws, fila, 'Averias', COLS, filas);

    filas.forEach((fRow, idx) => {
      ws.getRow(dataFila + idx).height = 20;
      fRow.forEach((val, ci) => {
        const cell = ws.getCell(dataFila + idx, ci + 1);
        estiloCelda(cell, ci, idx, { align: COLS[ci].align });
        if (ci === 1 && val) cell.numFmt = 'DD/MM/YYYY';
        if (ci === 9)        cell.numFmt = '0.###';
        if (ci === 3) {
          const tipo = (val || '').toLowerCase();
          cell.font = { bold: true, color: { argb: tipo === 'ingreso' ? C.verde : C.naranja } };
        }
        if (ci === 9 && val > 0) cell.font = { bold: true, color: { argb: C.rojo } };
        if (ci === 12 && val === 'Sí') cell.font = { bold: true, color: { argb: C.verde } };
      });
    });

    agregarFilaTotales(ws, dataFila + filas.length + 1, [
      { col: 1, value: 'TOTALES' },
      { col: 10, value: totalUnidades, numFmt: '0.###' },
    ], COLS.length);

    ws.views = [{ state: 'frozen', ySplit: fila }];

    const buffer = await wb.xlsx.writeBuffer();
    logger.info('Excel averías generado:', { registros: averias.length });
    return buffer;
  } catch (error) {
    logger.error('Error Excel averías:', { message: error.message });
    throw error;
  }
};
```

- [ ] **Step 2: Agregar `exportarAverias` en el `module.exports` de `excelService.js`**

Busca `module.exports = {` al final y agrega `exportarAverias,`.

- [ ] **Step 3: Agregar `exportarAveriasExcel` en `reporteController.js`**

Agrega ANTES del `module.exports`:

```js
/**
 * GET /reportes/averias/excel
 */
const exportarAveriasExcel = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id } = req.query;
    const whereOperacion = {};
    if (fecha_desde) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.gte]: fecha_desde };
    if (fecha_hasta) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.lte]: fecha_hasta };
    if (cliente_id)  whereOperacion.cliente_id = cliente_id;

    const averias = await OperacionAveria.findAll({
      include: [
        {
          model: Operacion, as: 'operacion', required: true, where: whereOperacion,
          attributes: ['id', 'numero_operacion', 'tipo', 'fecha_operacion', 'origen'],
          include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] }]
        },
        { model: OperacionDetalle, as: 'detalle', required: false, attributes: ['producto'] },
        { model: Usuario, as: 'registrador', attributes: ['id', 'nombre_completo'] }
      ],
      order: [[{ model: Operacion, as: 'operacion' }, 'fecha_operacion', 'DESC']],
      limit: MAX_EXPORT_ROWS
    });

    const buffer = await excelService.exportarAverias(averias, req.query);
    const filename = `averias_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Error al exportar averías Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};
```

- [ ] **Step 4: Agregar `exportarAveriasExcel` al `module.exports` de `reporteController.js`**

- [ ] **Step 5: Probar descarga Excel**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/v1/reportes/averias/excel" \
  --output test-averias.xlsx
```
Esperado: archivo `.xlsx` descargado sin error 500.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/excelService.js server/src/controllers/reporteController.js
git commit -m "feat(reportes): exportación Excel de averías"
```

---

## Task 3: Exportación PDF

**Files:**
- Modify: `server/src/services/pdfService.js` (agregar función)
- Modify: `server/src/controllers/reporteController.js` (agregar exportarAveriasPDF)

- [ ] **Step 1: Identificar el patrón PDF existente**

Abre `server/src/services/pdfService.js` y busca una función como `generarPDFOperaciones` o `generarPDFClientes`. Observa:
- Cómo se inicializa el documento: `new PDFDocument({ margins: {...}, size: 'A4' })`
- Cómo se construye el buffer: `stream = new PassThrough()`, `doc.pipe(stream)`, `doc.end()`
- Cómo se dibuja la tabla

- [ ] **Step 2: Agregar `generarPDFAverias` en `pdfService.js`**

Al final, ANTES del `module.exports`, agrega la función siguiendo exactamente el mismo patrón que las otras funciones PDF del archivo. Columnas a incluir (sin columna Foto):

```
#  |  Fecha  |  N° Registro  |  Tipo  |  Cliente  |  Origen  |  Referencia  |  Producto  |  Tipo Avería  |  Cant. Averiada  |  Descripción  |  Registrado por
```

Cabecera del PDF: título "REPORTE DE AVERÍAS", subtítulo con rango de fechas si aplica, totales al pie (Total registros y Total unidades averiadas).

- [ ] **Step 3: Agregar `generarPDFAverias` al `module.exports` de `pdfService.js`**

- [ ] **Step 4: Agregar `exportarAveriasPDF` en `reporteController.js`**

Agrega ANTES del `module.exports`:

```js
/**
 * GET /reportes/averias/pdf
 */
const exportarAveriasPDF = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id } = req.query;
    const whereOperacion = {};
    if (fecha_desde) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.gte]: fecha_desde };
    if (fecha_hasta) whereOperacion.fecha_operacion = { ...whereOperacion.fecha_operacion, [Op.lte]: fecha_hasta };
    if (cliente_id)  whereOperacion.cliente_id = cliente_id;

    const averias = await OperacionAveria.findAll({
      include: [
        {
          model: Operacion, as: 'operacion', required: true, where: whereOperacion,
          attributes: ['id', 'numero_operacion', 'tipo', 'fecha_operacion', 'origen'],
          include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] }]
        },
        { model: OperacionDetalle, as: 'detalle', required: false, attributes: ['producto'] },
        { model: Usuario, as: 'registrador', attributes: ['id', 'nombre_completo'] }
      ],
      order: [[{ model: Operacion, as: 'operacion' }, 'fecha_operacion', 'DESC']],
      limit: MAX_EXPORT_ROWS
    });

    const buffer = await pdfService.generarPDFAverias(averias, req.query);
    const filename = `averias_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Error al exportar averías PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};
```

- [ ] **Step 5: Agregar `exportarAveriasPDF` al `module.exports` de `reporteController.js`**

- [ ] **Step 6: Commit**

```bash
git add server/src/services/pdfService.js server/src/controllers/reporteController.js
git commit -m "feat(reportes): exportación PDF de averías"
```

---

## Task 4: Frontend — Servicio API

**Files:**
- Modify: `frontend/src/api/reportes.service.js`

- [ ] **Step 1: Agregar método `getReporteAverias` en `reportes.service.js`**

Abre el archivo. El objeto `reportesService` tiene métodos como `getDashboard`. Agrega dentro del objeto:

```js
getReporteAverias: async (params = {}) => {
  const response = await apiClient.get('/reportes/averias', { params });
  return response.data;
},
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/reportes.service.js
git commit -m "feat(reportes): método getReporteAverias en servicio API"
```

---

## Task 5: Frontend — Página ReporteAverias.jsx

**Files:**
- Create: `frontend/src/pages/Reportes/ReporteAverias.jsx`

- [ ] **Step 1: Crear `ReporteAverias.jsx`**

Crear el archivo con el siguiente contenido completo:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Package, FileText, Tag,
  FileSpreadsheet, Download, RefreshCw, Mail, Image,
} from 'lucide-react';
import { Button, KpiCard, ReportFilters, AccionesDropdown } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import reportesService from '../../api/reportes.service';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';

const ReporteAverias = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canDownload = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');

  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [averias, setAverias] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [porTipo, setPorTipo] = useState([]);
  const [error, setError] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  const [filters, setFilters] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
      if (filters.cliente_id)  params.cliente_id  = filters.cliente_id;

      const res = await reportesService.getReporteAverias(params);
      if (res?.success && res.data) {
        setAverias(res.data.averias || []);
        setKpis(res.data.kpis || null);
        setPorTipo(res.data.porTipo || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id)  params.set('cliente_id',  filters.cliente_id);
    return params.toString();
  };

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const ext      = format === 'excel' ? 'xlsx' : 'pdf';
      const endpoint = format === 'excel' ? '/reportes/averias/excel' : '/reportes/averias/pdf';
      await descargarArchivo(
        `${baseUrl}${endpoint}?${buildFilterParams()}`,
        `reporte-averias-${fechaDescarga()}.${ext}`
      );
    } catch {
      enqueueSnackbar('Error al exportar reporte', { variant: 'error' });
    }
  };

  // Datos para gráficos
  const pieData = porTipo.map(t => ({ name: t.tipo, value: t.count }));
  const barData = [...porTipo]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 8)
    .map(t => ({ label: t.tipo.substring(0, 18), value1: t.unidades, value2: t.count }));

  if (loading && firstLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-centhrix-surface rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-centhrix-surface rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporte de Averías</h1>
                <p className="text-slate-500 dark:text-slate-400">Registro detallado de averías por operación</p>
              </div>
            </div>
          </div>

          <AccionesDropdown acciones={[
            { label: 'Actualizar',  icon: RefreshCw,      onClick: fetchData },
            { label: 'Enviar',      icon: Mail,            onClick: () => setEmailModal(true), hidden: !canDownload },
            { label: 'Excel',       icon: FileSpreadsheet, onClick: () => handleExport('excel'), hidden: !canDownload },
            { label: 'PDF',         icon: Download,        onClick: () => handleExport('pdf'),   hidden: !canDownload, variant: 'primary' },
          ]} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filtros */}
        <ReportFilters filters={filters} onChange={handleFiltersChange} loading={loading} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Averías"
            value={kpis?.totalAverias || 0}
            subtitle="Registros encontrados"
            icon={AlertTriangle}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <KpiCard
            title="Unidades Averiadas"
            value={(kpis?.totalUnidades || 0).toLocaleString('es-CO')}
            subtitle="Total unidades afectadas"
            icon={Package}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
          />
          <KpiCard
            title="Operaciones Afectadas"
            value={kpis?.operacionesAfectadas || 0}
            subtitle="Con al menos una avería"
            icon={FileText}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            title="Tipo más Frecuente"
            value={kpis?.tipoFrecuente || '—'}
            subtitle="Avería predominante"
            icon={Tag}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </div>

        {/* Gráficos */}
        {porTipo.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <PieChart
              title="Distribución por Tipo de Avería"
              subtitle="Conteo de registros por tipo"
              data={pieData}
              size={180}
            />
            <BarChart
              title="Unidades Averiadas por Tipo"
              subtitle="Top 8 tipos con más unidades"
              data={barData}
              legend={[{ label: 'Unidades', color: '#E74C3C' }, { label: 'Registros', color: '#3B82F6' }]}
              height={300}
            />
          </div>
        )}

        {/* Tabla */}
        {averias.length > 0 && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Detalle de Averías</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {averias.length} registro{averias.length !== 1 ? 's' : ''} encontrado{averias.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-centhrix-surface px-2.5 py-1 rounded-full">
                {averias.length} averías
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-centhrix-surface/50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-8">#</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">N° Registro</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Origen</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Referencia</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Producto</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tipo Avería</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cant.</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Descripción</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Registrado por</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {averias.map((a, idx) => {
                    const tipo = (a.operacion?.tipo || '').toLowerCase();
                    const tipoBadgeClass = tipo === 'ingreso'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                    const fecha = a.operacion?.fecha_operacion
                      ? new Date(a.operacion.fecha_operacion + 'T00:00:00').toLocaleDateString('es-CO')
                      : '—';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fecha}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{a.operacion?.numero_operacion || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadgeClass}`}>
                            {tipo === 'ingreso' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[160px] truncate" title={a.operacion?.cliente?.razon_social}>
                          {a.operacion?.cliente?.razon_social || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.operacion?.origen || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{a.sku || '—'}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-[180px] truncate" title={a.detalle?.producto}>
                          {a.detalle?.producto || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.tipo_averia || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                          {(parseFloat(a.cantidad) || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={a.descripcion}>
                          {a.descripcion || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.registrador?.nombre_completo || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {a.foto_url ? (
                            <a href={a.foto_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700">
                              <Image className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && averias.length === 0 && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center mb-6">
            <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No se encontraron averías en el período seleccionado.</p>
          </div>
        )}

        {/* Exportar */}
        {canDownload && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Exportar Reporte Completo</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Descarga el listado completo de averías con todos los detalles.
              Los filtros seleccionados se aplicarán a la exportación.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" icon={FileSpreadsheet} onClick={() => handleExport('excel')}>
                Exportar Excel
              </Button>
              <Button variant="outline" icon={Download} onClick={() => handleExport('pdf')}>
                Exportar PDF
              </Button>
            </div>
          </div>
        )}
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="averias"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail({ ...data, cliente_id: filters.cliente_id });
          if (res.success) enqueueSnackbar(res.message, { variant: 'success' });
          else throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteAverias;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Reportes/ReporteAverias.jsx
git commit -m "feat(reportes): página ReporteAverias con KPIs, gráficos y tabla"
```

---

## Task 6: Frontend — Routing

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Agregar import lazy en `App.jsx`**

Busca el bloque de imports de reportes (línea ~77) y agrega:

```js
const ReporteAverias = lazy(() => import('./pages/Reportes/ReporteAverias'));
```

- [ ] **Step 2: Agregar ruta en `App.jsx`**

Busca el bloque de rutas de reportes (línea ~314) y agrega junto a las demás:

```jsx
<Route path="/reportes/averias" element={<PermissionRoute module="reportes" action="ver"><ReporteAverias /></PermissionRoute>} />
```

- [ ] **Step 3: Verificar que la app compila**

```bash
cd frontend && npm run dev
```
Navega a `http://localhost:5173/reportes/averias`. Esperado: la página carga sin error de ruta.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(reportes): ruta /reportes/averias registrada en App"
```

---

## Task 7: Prueba de extremo a extremo

- [ ] **Step 1: Iniciar ambos servidores**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Verificar flujo completo**

1. Inicia sesión con rol `admin` o `supervisor`
2. Navega a `/reportes/averias`
3. Aplica filtro de fechas que incluya datos existentes
4. Verifica que los KPIs muestran valores (no cero si hay averías en BD)
5. Verifica que la tabla muestra filas con las 13 columnas
6. Descarga Excel — debe abrir correctamente en Excel/LibreOffice
7. Descarga PDF — debe abrir correctamente

- [ ] **Step 3: Verificar en dark mode**

Alterna dark mode y confirma que los colores usan tokens `dark:bg-centhrix-*` (no `dark:bg-slate-[6-9]`).

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(reportes): Reporte de Averías completo — backend + frontend"
```
