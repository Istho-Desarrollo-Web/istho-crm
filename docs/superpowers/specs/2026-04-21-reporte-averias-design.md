# Reporte de Averías — Especificación de Diseño

**Fecha:** 2026-04-21  
**Estado:** Aprobado  
**Proyecto:** CenthriX CRM — ISTHO S.A.S.

---

## Resumen

Nueva página `/reportes/averias` que muestra el listado detallado de todas las averías registradas en operaciones, con filtros por fecha y cliente, KPIs, gráficos y exportación a Excel y PDF. Sigue el mismo patrón visual y estructural de `ReporteInventario`.

---

## Arquitectura

### Backend

**Ruta:** `GET /reportes/averias/excel` y `GET /reportes/averias/pdf`  
**Archivo:** `server/src/routes/reporte.routes.js`

**Controlador:** `reporteController.js`  
Nuevas funciones:
- `exportarAveriasExcel(req, res)` — genera buffer Excel con ExcelJS
- `exportarAveriasPdf(req, res)` — genera buffer PDF con PDFKit

**Query params comunes:**
- `fecha_desde` (DATEONLY, opcional)
- `fecha_hasta` (DATEONLY, opcional)
- `cliente_id` (INTEGER, opcional)

**Consulta principal:** `OperacionAveria` con joins:
- `Operacion` → `Cliente` (razon_social)
- `OperacionDetalle` → `Producto` (nombre)
- `Usuario` (nombre del registrador)
- Filtro: `Operacion.fecha` entre `fecha_desde` y `fecha_hasta`
- Filtro opcional: `Cliente.id = cliente_id`

**Endpoint de datos para vista:** `GET /reportes/averias`  
Devuelve: listado paginado + totales para KPIs.

**Excel:** función `exportarAverias()` en `excelService.js` — mismos estilos corporativos (logo, colores CenthriX, fila de totales al pie).

**PDF:** función `exportarAveriasPdf()` en `pdfService.js` — mismo patrón que otros reportes PDF existentes.

---

## Frontend

### Página

**Archivo:** `frontend/src/pages/Reportes/ReporteAverias.jsx`  
**Ruta:** `/reportes/averias`  
**Protección:** `PermissionRoute module="reportes" action="ver"`

### Estructura visual (igual a ReporteInventario)

#### Header
- Botón ← volver a `/reportes`
- Ícono: `AlertTriangle` con fondo rojo (`bg-red-100 dark:bg-red-900/30`)
- Título: "Reporte de Averías"
- Subtítulo: "Registro detallado de averías por operación"
- `AccionesDropdown` con: Actualizar · Enviar (email) · Excel · PDF

#### Filtros
Componente `ReportFilters` existente:
- Desde / Hasta (fecha)
- Cliente (dropdown, "Todos los clientes")
- Filtros persistidos en URL (`useSearchParams`)

#### KPIs (4 tarjetas `KpiCard`)
| # | Título | Valor | Ícono | Color |
|---|--------|-------|-------|-------|
| 1 | Total Averías | Count registros | `AlertTriangle` | ámbar |
| 2 | Unidades Averiadas | Suma `cantidad` | `Package` | rojo |
| 3 | Operaciones Afectadas | Distinct `operacion_id` | `FileText` | azul |
| 4 | Tipo más Frecuente | `tipo_averia` dominante | `Tag` | violeta |

#### Gráficos
- `PieChart` — distribución por tipo de avería (golpeado, mojado, roto, etc.)
- `BarChart` — top 8 productos con más unidades averiadas

#### Tabla de datos
Columnas (en orden):

| # | Columna | Campo fuente |
|---|---------|-------------|
| 1 | # | índice |
| 2 | Fecha | `Operacion.fecha` |
| 3 | N° Registro | `Operacion.numero` |
| 4 | Tipo | `Operacion.tipo` (Entrada/Salida) |
| 5 | Cliente | `Cliente.razon_social` |
| 6 | Origen | `Operacion.origen` |
| 7 | Referencia (SKU) | `OperacionAveria.sku` |
| 8 | Producto | `Producto.nombre` |
| 9 | Tipo Avería | `OperacionAveria.tipo_averia` |
| 10 | Cant. Averiada | `OperacionAveria.cantidad` |
| 11 | Descripción | `OperacionAveria.descripcion` |
| 12 | Registrado por | `Usuario.nombre` |
| 13 | Foto | Ícono clickeable si tiene `foto_url` |

- Columna **Tipo** muestra badge (Entrada: azul / Salida: naranja)
- Columna **Foto** muestra ícono `ImageIcon` como `<a target="_blank">` si hay URL

#### Sección de exportación (al pie)
Igual al pie de ReporteInventario: descripción + botones "Exportar Excel" y "Exportar PDF". Solo visible si `hasPermission('reportes', 'exportar')`.

### Menú lateral
Agregar entrada "Reporte de Averías" bajo el grupo "Reportes" en `FloatingHeader.jsx` con `PermissionRoute` apropiado.

---

## Exportación Excel — Estructura del archivo

- **Hoja:** "Averías"
- **Filas de encabezado:** Logo CenthriX + título + rango de fechas + cliente (si aplica)
- **Columnas:** las 13 de la tabla (sin columna Foto — reemplazar por "Tiene foto: Sí/No")
- **Fila de totales:** suma de Cant. Averiada + count de registros
- **Estilos:** mismos que excelService existente

---

## Exportación PDF

- Misma estructura que otros PDF de reportes (encabezado, tabla, pie de página con paginación)
- Sin columna Foto en PDF

---

## Seguridad

- Descarga via `fetch + blob` con `Authorization: Bearer` — nunca `?token=` en URL
- Permiso requerido: `reportes.ver` para ver, `reportes.exportar` para descargar
- Excluir campos sensibles de usuarios en la respuesta API

---

## Archivos a crear/modificar

| Acción | Archivo |
|--------|---------|
| CREAR | `frontend/src/pages/Reportes/ReporteAverias.jsx` |
| MODIFICAR | `server/src/routes/reporte.routes.js` |
| MODIFICAR | `server/src/controllers/reporteController.js` |
| MODIFICAR | `server/src/services/excelService.js` |
| MODIFICAR | `server/src/services/pdfService.js` |
| MODIFICAR | `frontend/src/api/reportes.service.js` |
| MODIFICAR | `frontend/src/components/layout/FloatingHeader.jsx` (menú) |
| MODIFICAR | `frontend/src/App.jsx` o router (agregar ruta) |
