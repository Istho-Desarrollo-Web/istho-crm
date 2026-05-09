# Spec: Guided Tours para Reportes y Administración

**Fecha:** 2026-05-09  
**Módulos:** Reportes (lista + 9 individuales) · Administración (4 tabs)  
**Librería:** driver.js v1.4.0 (ya instalada)

---

## Contexto

El sistema de tutoriales interactivos ya está en producción con 15 claves de tour. Este spec añade 11 claves nuevas para cubrir los módulos de Reportes y Administración, llevando el total a 26 claves.

Arquitectura existente (no se modifica):
- Config centralizada: `frontend/src/utils/tutorialConfig.js`
- Hook: `frontend/src/hooks/useTutorial.js` (DOM-resiliente)
- Botón `?`: `frontend/src/components/layout/FloatingHeader.jsx`
- Persistencia: `localStorage` clave `centhrix_tour_<modulo>`

---

## Alcance

### Claves nuevas

| Clave | Ruta | Notas |
|---|---|---|
| `reportes` | `/reportes` | Lista de cards |
| `reportes_operaciones` | `/reportes/operaciones` | |
| `reportes_inventario` | `/reportes/inventario` | |
| `reportes_inventario_ubicacion` | `/reportes/inventario-ubicacion` | |
| `reportes_clientes` | `/reportes/clientes` | |
| `reportes_viajes` | `/reportes/viajes` | |
| `reportes_cajas_menores` | `/reportes/cajas-menores` | |
| `reportes_gastos` | `/reportes/gastos` | |
| `reportes_averias` | `/reportes/averias` | |
| `reportes_programados` | `/reportes/programados` | |
| `administracion` | `/administracion` | 1 clave, 4 tabs via DOM-resilience |

Todas las rutas son **estáticas** → se agregan a `RUTAS_CON_TOUR`. No se requieren regex nuevos en `FloatingHeader`.

---

## IDs de anclaje

### `/reportes` — ReportesList

| ID | Elemento |
|---|---|
| `tour-reportes-header` | Encabezado de la página (título + descripción) |
| `tour-reportes-cards` | Grid de cards de reportes |

### Reportes individuales (patrón compartido)

Aplica a: operaciones, inventario, inventario-ubicacion, clientes, viajes, cajas-menores, gastos, averias.

| ID (reemplazar `<tipo>`) | Elemento |
|---|---|
| `tour-reportes-<tipo>-filtros` | Sección de filtros (fecha desde/hasta, cliente) |
| `tour-reportes-<tipo>-kpis` | Contenedor de tarjetas KPI |
| `tour-reportes-<tipo>-exportar` | `AccionesDropdown` con Excel/PDF/Enviar |

Valores de `<tipo>`: `operaciones` · `inventario` · `inventario-ubicacion` · `clientes` · `viajes` · `cajas-menores` · `gastos` · `averias`

### `/reportes/programados` — ReportesProgramados

| ID | Elemento |
|---|---|
| `tour-reportes-programados-tabla` | Tabla/lista de reportes programados |
| `tour-reportes-programados-nuevo` | Botón "Nuevo reporte programado" |

### `/administracion` — tabs (DOM-resilience filtra por tab activo)

| ID | Componente | Tab |
|---|---|---|
| `tour-admin-usuarios-tabla` | `UsuariosList` | usuarios |
| `tour-admin-usuarios-nuevo` | `UsuariosList` | usuarios |
| `tour-admin-roles-tabla` | `RolesList` | roles |
| `tour-admin-roles-nuevo` | `RolesList` | roles |
| `tour-admin-sesiones-tabla` | `SesionesActivas` | sesiones |
| `tour-admin-seguridad-panel` | `DashboardSeguridad` | seguridad |

---

## Contenido de los pasos

### Tour `reportes`
1. `#tour-reportes-header` — "Bienvenido al módulo de Reportes. Desde aquí accedes a todos los informes del sistema."
2. `#tour-reportes-cards` — "Cada card representa un tipo de reporte. Haz clic para ver sus filtros, indicadores y opciones de exportación."

### Tour `reportes_operaciones`
1. `#tour-reportes-operaciones-filtros` — "Filtra por rango de fechas y cliente para acotar el análisis."
2. `#tour-reportes-operaciones-kpis` — "Indicadores clave del período: total de operaciones, entradas, salidas y kardex."
3. `#tour-reportes-operaciones-exportar` — "Descarga el reporte en Excel o PDF, o envíalo directamente por correo."

### Tour `reportes_inventario`
1. `#tour-reportes-inventario-filtros` — "Filtra por cliente y fechas para ver el estado del inventario."
2. `#tour-reportes-inventario-kpis` — "Indicadores de stock: productos activos, valor total y alertas de bajo inventario."
3. `#tour-reportes-inventario-exportar` — "Exporta el inventario completo en Excel o PDF."

### Tour `reportes_inventario_ubicacion`
1. `#tour-reportes-inventario-ubicacion-filtros` — "Filtra por cliente o bodega para ver la distribución por ubicación."
2. `#tour-reportes-inventario-ubicacion-kpis` — "Resumen de cajas y posiciones ocupadas en bodega."
3. `#tour-reportes-inventario-ubicacion-exportar` — "Exporta el detalle de ubicaciones en Excel o PDF."

### Tour `reportes_clientes`
1. `#tour-reportes-clientes-filtros` — "Filtra clientes por estado o rango de fechas de registro."
2. `#tour-reportes-clientes-kpis` — "Total de clientes activos, inactivos y nuevos en el período."
3. `#tour-reportes-clientes-exportar` — "Exporta el listado de clientes con toda su información de contacto."

### Tour `reportes_viajes`
1. `#tour-reportes-viajes-filtros` — "Filtra viajes por conductor, vehículo o rango de fechas."
2. `#tour-reportes-viajes-kpis` — "Indicadores de viajes: completados, en curso y cancelados."
3. `#tour-reportes-viajes-exportar` — "Descarga el reporte de viajes en Excel o PDF."

### Tour `reportes_cajas_menores`
1. `#tour-reportes-cajas-menores-filtros` — "Filtra movimientos de caja menor por fecha y responsable."
2. `#tour-reportes-cajas-menores-kpis` — "Saldo actual, total de ingresos y egresos del período."
3. `#tour-reportes-cajas-menores-exportar` — "Exporta el movimiento de caja menor en Excel o PDF."

### Tour `reportes_gastos`
1. `#tour-reportes-gastos-filtros` — "Filtra gastos por fecha, categoría o viaje asociado."
2. `#tour-reportes-gastos-kpis` — "Total de gastos del período agrupados por categoría."
3. `#tour-reportes-gastos-exportar` — "Descarga el reporte de gastos en Excel o PDF."

### Tour `reportes_averias`
1. `#tour-reportes-averias-filtros` — "Filtra averías por operación, cliente o rango de fechas."
2. `#tour-reportes-averias-kpis` — "Total de averías registradas y su impacto económico."
3. `#tour-reportes-averias-exportar` — "Exporta el registro de averías en Excel o PDF."

### Tour `reportes_programados`
1. `#tour-reportes-programados-tabla` — "Aquí aparecen todos tus reportes automáticos configurados, con su frecuencia y próximo envío."
2. `#tour-reportes-programados-nuevo` — "Crea un nuevo reporte automático: elige tipo, frecuencia (cron), formato y destinatarios."

### Tour `administracion` (DOM-resilience filtra según tab activo)
1. `#tour-admin-usuarios-tabla` — "Lista de usuarios del sistema con su rol, estado y último acceso."
2. `#tour-admin-usuarios-nuevo` — "Crea un nuevo usuario asignándole rol, contraseña temporal y permisos."
3. `#tour-admin-roles-tabla` — "Roles disponibles en el sistema y el número de usuarios asignados a cada uno."
4. `#tour-admin-roles-nuevo` — "Crea o edita un rol configurando permisos granulares por módulo."
5. `#tour-admin-sesiones-tabla` — "Sesiones activas en este momento. Puedes cerrar forzosamente cualquier sesión."
6. `#tour-admin-seguridad-panel` — "Panel de auditoría de seguridad: intentos fallidos de login, IPs y eventos recientes."

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `frontend/src/utils/tutorialConfig.js` | +11 entradas en `TUTORIALES` · +11 en `RUTAS_CON_TOUR` |
| `frontend/src/pages/Reportes/ReportesList.jsx` | Agregar `id` en header y grid de cards |
| `frontend/src/pages/Reportes/ReporteOperaciones.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteInventario.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteInventarioUbicacion.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteClientes.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteViajes.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteCajasMenores.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteGastos.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReporteAverias.jsx` | Agregar `id` en filtros, KPIs, AccionesDropdown |
| `frontend/src/pages/Reportes/ReportesProgramados.jsx` | Agregar `id` en tabla y botón nuevo |
| `frontend/src/pages/Administracion/UsuariosList.jsx` | Agregar `id` en tabla y botón nuevo |
| `frontend/src/pages/Administracion/RolesList.jsx` | Agregar `id` en tabla y botón nuevo |
| `frontend/src/pages/Administracion/SesionesActivas.jsx` | Agregar `id` en tabla |
| `frontend/src/pages/Administracion/DashboardSeguridad.jsx` | Agregar `id` en panel principal |

`FloatingHeader.jsx` — **sin cambios** (todas las rutas son estáticas).

---

## Reglas de implementación

1. Agregar el `id` al elemento HTML/JSX que **ya existe** en el DOM — no crear wrappers.
2. Si el elemento ancla es un componente React (ej. `<AccionesDropdown>`), agregar el `id` al `div` contenedor más cercano, no al componente en sí.
3. Para los KPI cards: el `id` va en el `div` contenedor del grupo de cards, no en cada card individual.
4. Para filtros: el `id` va en el `div` que envuelve el bloque completo de filtros.
5. El tour de Administración usa DOM-resilience: los pasos cuyo `element` no está en el DOM (porque el tab no está activo) se filtran automáticamente en `useTutorial.js` — no se necesita lógica adicional.
6. Actualizar `CLAUDE.md` al final para agregar las 11 nuevas claves a la tabla de tours.
