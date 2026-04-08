# Especificación: Mejora de Diseño PDF + Nuevos Reportes PDF

**Fecha:** 2026-04-08  
**Estado:** Aprobado  
**Autor:** Osman Gallego / CenthriX CRM

---

## 1. Contexto y Objetivo

El sistema CenthriX CRM genera PDFs para reportes de operaciones, inventario, detalle de operación y clientes. Actualmente usan una paleta azul corporativa genérica que no refleja la identidad visual CenthriX (rojo #E74C3C, oscuro #1A1B3A).

**Objetivos:**
1. Rediseñar el estilo visual de todos los PDFs existentes para que coincidan con la identidad CenthriX.
2. Agregar generación PDF a los 3 reportes que actualmente solo tienen Excel: Viajes, Cajas Menores, Gastos/Movimientos.

---

## 2. Diseño Visual Aprobado

### 2.1 Paleta de Colores

| Token | Valor | Uso |
|---|---|---|
| `primario` | `#1A1B3A` | Header/footer bg, bordes de tabla, header de tabla |
| `fondo_oscuro` | `#0F1023` | Gradiente header/footer |
| `acento` | `#E74C3C` | Línea decorativa, fechas, textos de columnas, badges, etiquetas de sección |
| `texto_blanco` | `#FFFFFF` | Títulos sobre fondo oscuro |
| `texto_principal` | `#333333` | Datos de tabla |
| `texto_secundario` | `#666666` | Subtítulos, fechas en filas |
| `texto_tenue` | `#AAAAAA` | Texto de ayuda, "generado automáticamente" |
| `fila_par` | `#FAFAFA` | Filas alternas de tabla |
| `fila_impar` | `#FFFFFF` | Filas normales de tabla |
| `separador` | `#F0F0F0` | Bordes entre filas |
| `kpi_bg` | `#F8F8F8` | Fondo sección de KPIs |
| `verde` | `#2ECC71` | KPI entradas, badge "Entrada" |
| `azul` | `#3498DB` | KPI unidades |
| `morado` | `#9B59B6` | KPI clientes |

### 2.2 Orientación

- **Todos los reportes de lista:** LETTER landscape (11" × 8.5" / 792pt × 612pt)
- **Detalle de operación individual:** LETTER portrait (sin cambios de orientación)

### 2.3 Estructura de Página (layout landscape)

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: gradiente oscuro + banda roja + logo + título + fecha   │  ~70pt
├─────────────────────────────────────────────────────────────────┤
│ KPI CARDS: fila de tarjetas con métricas clave                  │  ~55pt
├─────────────────────────────────────────────────────────────────┤
│ TABLA: etiqueta sección + tabla con borde #1A1B3A               │  flex
├─────────────────────────────────────────────────────────────────┤
│ FOOTER: gradiente oscuro + marca + fecha generación + pág X/Y  │  ~28pt
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Helpers en pdfService.js

Se actualizan y crean helpers en `server/src/services/pdfService.js`. Todos los generadores existentes y nuevos los usan automáticamente.

### 3.1 `agregarEncabezado(doc, titulo, subtitulo)`

**Cambios respecto al actual:**
- Fondo: gradiente `#0F1023` → `#1A1B3A` (simulado con rectángulo + leve degradado)
- Banda roja de 4pt en la parte superior
- Logo `logo-blanco.png` a la izquierda (52×44pt, fondo semitransparente)
- Texto "ISTHO S.A.S. · CenthriX CRM" en rojo, tamaño 7pt, uppercase
- Título del reporte en blanco, 16pt, bold
- Subtítulo (e.g. "Ingresos y salidas de inventario") en `#666`, 8pt
- Fecha actual como pill rojo a la derecha (texto blanco)

**Firma nueva:** `agregarEncabezado(doc, titulo, subtitulo = '')`

### 3.2 `agregarPiePagina(doc, numeroPagina, totalPaginas)`

**Cambios respecto al actual:**
- Fondo oscuro (`#0F1023`) ocupando todo el ancho, 28pt de alto
- Izquierda: "CenthriX CRM · ISTHO S.A.S." en rojo + dirección en gris oscuro
- Derecha: fecha/hora de generación en gris + "Pág. X / Y" en rojo bold

**Firma nueva:** `agregarPiePagina(doc, numeroPagina, totalPaginas)`

### 3.3 `agregarKpis(doc, kpis)` — NUEVO

Dibuja una fila de tarjetas KPI entre el header y la tabla.

**Parámetros:**
```js
kpis = [
  { label: 'Total Registros', valor: 1248, subtexto: 'operaciones', color: '#E74C3C' },
  { label: 'Entradas',        valor: 842,  subtexto: 'CO · ingreso', color: '#2ECC71' },
  // ...
]
```

**Diseño:**
- Fondo sección `#F8F8F8`, borde inferior `#E8E8E8`, padding 10pt vertical
- Cada card: fondo blanco, borde `#EEEEEE`, border-left 4pt del color del KPI, rounded 6pt
- Texto label: uppercase, `#AAAAAA`, 7pt
- Valor: `#1A1B3A`, 18pt bold
- Subtexto: `#CCCCCC`, 7pt

### 3.4 `generarTabla(doc, headers, rows, opciones)` — actualizar

**Cambios:**
- `headerBg`: `#1A1B3A` (antes azul)
- `headerColor`: `#E74C3C` (antes blanco)
- `borderColor`: `#1A1B3A` (borde exterior más visible)
- Agregar `opciones.etiquetaSeccion` (string): si se pasa, dibuja antes de la tabla el label rojo con línea decorativa ("▬ Detalle de Operaciones ─────")
- Mantener alternancia `#FFFFFF` / `#FAFAFA`
- Separadores entre filas: `#F0F0F0`

---

## 4. Nuevos Generadores PDF

### 4.1 `generarPDFViajes(doc, data, filtros)`

**Datos fuente:** mismo query que `exportarViajesExcel` en `reporteController.js`  
**Includes necesarios:** Vehiculo (placa, tipo_vehiculo), conductor (nombre_completo), CajaMenor (numero)

**KPIs:**
| Label | Valor | Color |
|---|---|---|
| Total Viajes | `data.length` | `#E74C3C` |
| En Progreso | count donde estado='en_progreso' | `#3498DB` |
| Completados | count donde estado='completado' | `#2ECC71` |
| Total Gastos | suma de total_gastos | `#9B59B6` |

**Columnas tabla:**
| Columna | Ancho (pt) |
|---|---|
| N° Viaje | 80 |
| Conductor | 130 |
| Vehículo | 80 |
| Origen → Destino | flex |
| Fecha Inicio | 80 |
| Estado | 80 |
| Total Gastos | 80 |

**Badges estado:** en_progreso=azul, completado=verde, cancelado=rojo, programado=amarillo

### 4.2 `generarPDFCajasMenores(doc, data, filtros)`

**Datos fuente:** mismo query que `exportarCajasMenoresExcel`  
**Includes necesarios:** usuario asignado (nombre_completo)

**KPIs:**
| Label | Valor | Color |
|---|---|---|
| Total Cajas | `data.length` | `#E74C3C` |
| Activas | count donde estado='activa' | `#2ECC71` |
| Cerradas | count donde estado='cerrada' | `#3498DB` |
| Saldo Total | suma de saldo_actual | `#9B59B6` |

**Columnas tabla:**
| Columna | Ancho (pt) |
|---|---|
| N° Caja | 80 |
| Asignado A | 130 |
| Monto Inicial | 90 |
| Saldo Actual | 90 |
| Fecha Apertura | 90 |
| Fecha Cierre | 90 |
| Estado | 80 |

### 4.3 `generarPDFGastos(doc, data, filtros)`

**Datos fuente:** mismo query que `exportarMovimientosExcel` (MovimientoCajaMenor)  
**Includes necesarios:** CajaMenor (numero), usuario (nombre_completo)

**KPIs:**
| Label | Valor | Color |
|---|---|---|
| Total Movimientos | `data.length` | `#E74C3C` |
| Aprobados | count donde estado='aprobado' | `#2ECC71` |
| Pendientes | count donde estado='pendiente' | `#3498DB` |
| Total Monto | suma de monto | `#9B59B6` |

**Columnas tabla:**
| Columna | Ancho (pt) |
|---|---|
| N° Movimiento | 80 |
| Caja | 70 |
| Descripción | flex |
| Fecha | 80 |
| Monto | 80 |
| Estado | 80 |
| Usuario | 110 |

---

## 5. Backend: Controladores y Rutas

### 5.1 Funciones nuevas en `reporteController.js`

```js
exportarViajesPDF(req, res)
exportarCajasMenoresPDF(req, res)
exportarGastosPDF(req, res)
```

Patrón idéntico a `exportarOperacionesPDF`:
1. Aplicar filtros (fecha_inicio, fecha_fin, estado, etc.) — mismos que Excel
2. Limitar a MAX_EXPORT_ROWS (5000)
3. Crear doc PDFKit landscape
4. `agregarEncabezado` → `agregarKpis` → `generarTabla` → `agregarPiePagina`
5. Pipe a `res` con Content-Type `application/pdf`

### 5.2 Rutas nuevas en `reporte.routes.js`

```js
router.get('/viajes/pdf',        verificarToken, requierePermiso('reportes', 'ver'), exportarViajesPDF)
router.get('/cajas-menores/pdf', verificarToken, requierePermiso('reportes', 'ver'), exportarCajasMenoresPDF)
router.get('/movimientos/pdf',   verificarToken, requierePermiso('reportes', 'ver'), exportarGastosPDF)
```

---

## 6. Frontend: Botones PDF

### 6.1 Páginas con botón PDF nuevo

| Página | Archivo | Endpoint |
|---|---|---|
| Reporte Viajes | `frontend/src/pages/Reportes/ReporteViajes.jsx` | `/reportes/viajes/pdf` |
| Reporte Cajas Menores | `frontend/src/pages/Reportes/ReporteCajasMenores.jsx` | `/reportes/cajas-menores/pdf` |
| Reporte Gastos | `frontend/src/pages/Reportes/ReporteGastos.jsx` | `/reportes/movimientos/pdf` |

### 6.2 Patrón de botón (igual a reportes existentes)

```jsx
<button onClick={exportarPDF} disabled={cargandoPDF} className="...">
  {cargandoPDF ? <Loader2 className="animate-spin" /> : <FileText />}
  PDF
</button>
```

La función `exportarPDF` hace `GET` al endpoint con los filtros activos como query params y abre el blob en una nueva pestaña.

### 6.3 ReportesList.jsx

Actualizar la tarjeta de estadísticas de los 3 nuevos reportes para incluir el ícono PDF y marcar que soportan PDF.

---

## 7. Alcance Explícito

**Incluye:**
- Rediseño visual de helpers existentes (encabezado, pie, tabla)
- Nuevo helper `agregarKpis`
- 3 nuevas funciones generadoras en pdfService.js
- 3 nuevas funciones de controlador
- 3 nuevas rutas GET
- 3 botones PDF en páginas de reporte frontend

**No incluye:**
- Cambio de librería PDF (se mantiene PDFKit v0.17.2)
- Gráficas/charts en PDF
- Exportación de detalle individual de viajes/cajas/gastos (solo listas)
- Cambios en el reporte de detalle de operación individual (solo actualiza colores automáticamente al actualizar helpers)

---

## 8. Criterios de Éxito

1. Al abrir un PDF generado: header oscuro con logo, KPIs visibles, tabla con borde `#1A1B3A`, footer oscuro.
2. Los 3 nuevos reportes generan PDF sin errores (conexión a BD, stream correcto).
3. Los 4 reportes existentes mantienen su funcionamiento — solo cambia el estilo visual.
4. No hay regresiones en Excel (los controladores de Excel no se tocan).
5. Probado localmente antes de hacer commit.
