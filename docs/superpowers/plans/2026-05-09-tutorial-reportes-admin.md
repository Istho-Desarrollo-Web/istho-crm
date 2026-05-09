# Tours Reportes y Administración — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar guided tours (driver.js) a la página de Reportes (lista + 9 individuales) y Administración (4 tabs vía DOM-resilience), llevando el sistema de 15 a 26 claves de tour.

**Architecture:** Solo frontend. Se extiende `tutorialConfig.js` con 11 nuevas entradas en `TUTORIALES` y 11 en `RUTAS_CON_TOUR` (todas estáticas, sin regex nuevo en `FloatingHeader`). Los IDs de anclaje se agregan a elementos JSX ya existentes — sin crear wrappers salvo cuando el elemento ancla es un componente React puro (ej. `<ReportFilters>`, `<AccionesDropdown>`). El tour de Administración usa 1 clave con DOM-resilience: `useTutorial.js` filtra automáticamente los pasos cuyo elemento no existe en el DOM activo.

**Tech Stack:** React 19, driver.js v1.4.0 (ya instalado), Tailwind 4

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `frontend/src/utils/tutorialConfig.js` | Modificar — +11 TUTORIALES, +11 RUTAS_CON_TOUR |
| `frontend/src/pages/Reportes/ReportesList.jsx` | Modificar — +2 IDs |
| `frontend/src/pages/Reportes/ReporteOperaciones.jsx` | Modificar — +3 IDs (wraps + id) |
| `frontend/src/pages/Reportes/ReporteInventario.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteInventarioUbicacion.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteClientes.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteViajes.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteCajasMenores.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteGastos.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReporteAverias.jsx` | Modificar — +3 IDs (mismo patrón) |
| `frontend/src/pages/Reportes/ReportesProgramados.jsx` | Modificar — +2 IDs |
| `frontend/src/pages/Administracion/UsuariosList.jsx` | Modificar — +2 IDs |
| `frontend/src/pages/Administracion/RolesList.jsx` | Modificar — +2 IDs |
| `frontend/src/pages/Administracion/SesionesActivas.jsx` | Modificar — +1 ID |
| `frontend/src/pages/Administracion/DashboardSeguridad.jsx` | Modificar — +1 ID |
| `CLAUDE.md` | Modificar — +11 filas en tabla de tours |

---

## Tarea 1: Extender `tutorialConfig.js`

**Archivos:**
- Modificar: `frontend/src/utils/tutorialConfig.js`

- [ ] **Paso 1: Agregar 11 entradas al objeto `TUTORIALES`**

Insertar antes del cierre `};` del objeto `TUTORIALES` (línea 386 del archivo actual):

```javascript
  reportes: {
    modulo: 'reportes',
    pasos: [
      {
        element: '#tour-reportes-header',
        popover: {
          title: 'Reportes',
          description: 'Acceso centralizado a todos los informes del sistema.',
        },
      },
      {
        element: '#tour-reportes-cards',
        popover: {
          title: 'Tipos de reporte',
          description: 'Cada card abre el reporte con sus filtros y opciones de exportación.',
        },
      },
    ],
  },

  reportes_operaciones: {
    modulo: 'reportes_operaciones',
    pasos: [
      {
        element: '#tour-reportes-operaciones-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por rango de fechas y cliente para acotar el análisis.',
        },
      },
      {
        element: '#tour-reportes-operaciones-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores clave del período: total de operaciones, entradas, salidas y kardex.',
        },
      },
      {
        element: '#tour-reportes-operaciones-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte en Excel o PDF, o envíalo directamente por correo.',
        },
      },
    ],
  },

  reportes_inventario: {
    modulo: 'reportes_inventario',
    pasos: [
      {
        element: '#tour-reportes-inventario-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por cliente y fechas para ver el estado del inventario.',
        },
      },
      {
        element: '#tour-reportes-inventario-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores de stock: productos activos, valor total y alertas de bajo inventario.',
        },
      },
      {
        element: '#tour-reportes-inventario-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el inventario completo en Excel o PDF.',
        },
      },
    ],
  },

  reportes_inventario_ubicacion: {
    modulo: 'reportes_inventario_ubicacion',
    pasos: [
      {
        element: '#tour-reportes-inventario-ubicacion-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por cliente o bodega para ver la distribución por ubicación.',
        },
      },
      {
        element: '#tour-reportes-inventario-ubicacion-kpis',
        popover: {
          title: 'Resumen',
          description: 'Resumen de cajas y posiciones ocupadas en bodega.',
        },
      },
      {
        element: '#tour-reportes-inventario-ubicacion-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el detalle de ubicaciones en Excel o PDF.',
        },
      },
    ],
  },

  reportes_clientes: {
    modulo: 'reportes_clientes',
    pasos: [
      {
        element: '#tour-reportes-clientes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra clientes por estado o rango de fechas de registro.',
        },
      },
      {
        element: '#tour-reportes-clientes-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de clientes activos, inactivos y nuevos en el período.',
        },
      },
      {
        element: '#tour-reportes-clientes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el listado de clientes con toda su información de contacto.',
        },
      },
    ],
  },

  reportes_viajes: {
    modulo: 'reportes_viajes',
    pasos: [
      {
        element: '#tour-reportes-viajes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra viajes por conductor, vehículo o rango de fechas.',
        },
      },
      {
        element: '#tour-reportes-viajes-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores de viajes: completados, en curso y cancelados.',
        },
      },
      {
        element: '#tour-reportes-viajes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de viajes en Excel o PDF.',
        },
      },
    ],
  },

  reportes_cajas_menores: {
    modulo: 'reportes_cajas_menores',
    pasos: [
      {
        element: '#tour-reportes-cajas-menores-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra movimientos de caja menor por fecha y responsable.',
        },
      },
      {
        element: '#tour-reportes-cajas-menores-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Saldo actual, total de ingresos y egresos del período.',
        },
      },
      {
        element: '#tour-reportes-cajas-menores-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el movimiento de caja menor en Excel o PDF.',
        },
      },
    ],
  },

  reportes_gastos: {
    modulo: 'reportes_gastos',
    pasos: [
      {
        element: '#tour-reportes-gastos-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra gastos por fecha, categoría o viaje asociado.',
        },
      },
      {
        element: '#tour-reportes-gastos-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de gastos del período agrupados por categoría.',
        },
      },
      {
        element: '#tour-reportes-gastos-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de gastos en Excel o PDF.',
        },
      },
    ],
  },

  reportes_averias: {
    modulo: 'reportes_averias',
    pasos: [
      {
        element: '#tour-reportes-averias-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra averías por operación, cliente o rango de fechas.',
        },
      },
      {
        element: '#tour-reportes-averias-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de averías registradas y su impacto económico.',
        },
      },
      {
        element: '#tour-reportes-averias-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el registro de averías en Excel o PDF.',
        },
      },
    ],
  },

  reportes_programados: {
    modulo: 'reportes_programados',
    pasos: [
      {
        element: '#tour-reportes-programados-tabla',
        popover: {
          title: 'Reportes programados',
          description: 'Tus reportes automáticos configurados con su frecuencia y próximo envío.',
        },
      },
      {
        element: '#tour-reportes-programados-nuevo',
        popover: {
          title: 'Nuevo reporte programado',
          description: 'Crea un nuevo reporte automático: elige tipo, frecuencia, formato y destinatarios.',
        },
      },
    ],
  },

  administracion: {
    modulo: 'administracion',
    pasos: [
      {
        element: '#tour-admin-usuarios-tabla',
        popover: {
          title: 'Usuarios del sistema',
          description: 'Lista de usuarios con su rol, estado y último acceso.',
        },
      },
      {
        element: '#tour-admin-usuarios-nuevo',
        popover: {
          title: 'Nuevo usuario',
          description: 'Crea un usuario nuevo asignándole rol, contraseña temporal y permisos.',
        },
      },
      {
        element: '#tour-admin-roles-tabla',
        popover: {
          title: 'Matriz de permisos',
          description: 'Roles disponibles con sus permisos configurados por módulo.',
        },
      },
      {
        element: '#tour-admin-roles-nuevo',
        popover: {
          title: 'Nuevo rol',
          description: 'Crea un rol personalizado con nombre, nivel jerárquico y permisos granulares.',
        },
      },
      {
        element: '#tour-admin-sesiones-tabla',
        popover: {
          title: 'Sesiones activas',
          description: 'Usuarios conectados en este momento. Puedes cerrar sesiones forzosamente.',
        },
      },
      {
        element: '#tour-admin-seguridad-panel',
        popover: {
          title: 'Dashboard de seguridad',
          description: 'Métricas de seguridad: intentos fallidos, usuarios bloqueados y actividad reciente.',
        },
      },
    ],
  },
```

- [ ] **Paso 2: Agregar 11 entradas a `RUTAS_CON_TOUR`**

Reemplazar el objeto `RUTAS_CON_TOUR` completo (desde la línea `export const RUTAS_CON_TOUR = {` hasta su cierre `};`) por:

```javascript
export const RUTAS_CON_TOUR = {
  '/dashboard': 'dashboard',
  '/clientes': 'clientes',
  '/inventario': 'inventario',
  '/operaciones/entradas': 'operaciones',
  '/operaciones/salidas': 'salidas',
  '/operaciones/kardex': 'kardex',
  '/viajes/viajes': 'viajes',
  '/viajes/vehiculos': 'vehiculos',
  '/viajes/cajas-menores': 'cajas_menores',
  '/viajes/movimientos': 'movimientos',
  '/reportes': 'reportes',
  '/reportes/operaciones': 'reportes_operaciones',
  '/reportes/inventario': 'reportes_inventario',
  '/reportes/inventario-ubicacion': 'reportes_inventario_ubicacion',
  '/reportes/clientes': 'reportes_clientes',
  '/reportes/viajes': 'reportes_viajes',
  '/reportes/cajas-menores': 'reportes_cajas_menores',
  '/reportes/gastos': 'reportes_gastos',
  '/reportes/averias': 'reportes_averias',
  '/reportes/programados': 'reportes_programados',
  '/administracion': 'administracion',
};
```

- [ ] **Paso 3: Verificar en navegador**

Arrancar `cd frontend && npm run dev`. Navegar a `/reportes` y `/administracion`. El botón `?` debe aparecer con punto rojo en ambas rutas.

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/utils/tutorialConfig.js
git commit -m "feat: agregar 11 claves de tour para Reportes y Administración en tutorialConfig"
```

---

## Tarea 2: IDs en `ReportesList.jsx`

**Archivos:**
- Modificar: `frontend/src/pages/Reportes/ReportesList.jsx`

El encabezado de la página está en `<div className="flex flex-col md:flex-row ...">` (≈línea 293). El grid de cards está en `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ...">` (≈línea 344).

- [ ] **Paso 1: Agregar `id` al encabezado**

Localizar:
```jsx
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
```
Cambiar a:
```jsx
        <div id="tour-reportes-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
```

- [ ] **Paso 2: Agregar `id` al grid de cards**

Localizar:
```jsx
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
```
Cambiar a:
```jsx
          <div id="tour-reportes-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
```

- [ ] **Paso 3: Verificar en navegador**

Navegar a `/reportes`, clic en `?`. El tour debe iniciar en el encabezado y luego en el grid de cards.

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Reportes/ReportesList.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en Reportes/ReportesList"
```

---

## Tarea 3: IDs en los 8 reportes individuales

**Archivos:**
- Modificar: `ReporteOperaciones.jsx`, `ReporteInventario.jsx`, `ReporteInventarioUbicacion.jsx`, `ReporteClientes.jsx`, `ReporteViajes.jsx`, `ReporteCajasMenores.jsx`, `ReporteGastos.jsx`, `ReporteAverias.jsx`

Cada reporte individual tiene 3 elementos ancla:
1. `AccionesDropdown` — componente React sin `id` nativo → envolverlo en `<div id="...">`
2. `ReportFilters` — componente React sin `id` nativo → envolverlo en `<div id="...">`
3. Grid de KPIs — `<div className="grid...">` ya existente → agregar `id="..."` al div

**Tabla de IDs por archivo:**

| Archivo | ID filtros | ID kpis | ID exportar |
|---|---|---|---|
| `ReporteOperaciones.jsx` | `tour-reportes-operaciones-filtros` | `tour-reportes-operaciones-kpis` | `tour-reportes-operaciones-exportar` |
| `ReporteInventario.jsx` | `tour-reportes-inventario-filtros` | `tour-reportes-inventario-kpis` | `tour-reportes-inventario-exportar` |
| `ReporteInventarioUbicacion.jsx` | `tour-reportes-inventario-ubicacion-filtros` | `tour-reportes-inventario-ubicacion-kpis` | `tour-reportes-inventario-ubicacion-exportar` |
| `ReporteClientes.jsx` | `tour-reportes-clientes-filtros` | `tour-reportes-clientes-kpis` | `tour-reportes-clientes-exportar` |
| `ReporteViajes.jsx` | `tour-reportes-viajes-filtros` | `tour-reportes-viajes-kpis` | `tour-reportes-viajes-exportar` |
| `ReporteCajasMenores.jsx` | `tour-reportes-cajas-menores-filtros` | `tour-reportes-cajas-menores-kpis` | `tour-reportes-cajas-menores-exportar` |
| `ReporteGastos.jsx` | `tour-reportes-gastos-filtros` | `tour-reportes-gastos-kpis` | `tour-reportes-gastos-exportar` |
| `ReporteAverias.jsx` | `tour-reportes-averias-filtros` | `tour-reportes-averias-kpis` | `tour-reportes-averias-exportar` |

**Patrón de cambio — usar `ReporteOperaciones.jsx` como referencia exacta:**

- [ ] **Paso 1: Envolver `AccionesDropdown` con div id exportar**

En `ReporteOperaciones.jsx`, localizar el `<AccionesDropdown` suelto dentro del header:
```jsx
          <AccionesDropdown
            acciones={[
```
Envolverlo:
```jsx
          <div id="tour-reportes-operaciones-exportar">
            <AccionesDropdown
              acciones={[
                ...
              ]}
            />
          </div>
```

- [ ] **Paso 2: Envolver `ReportFilters` con div id filtros**

Localizar:
```jsx
        <ReportFilters filters={filters} onChange={handleFiltersChange} loading={loading} />
```
Cambiar a:
```jsx
        <div id="tour-reportes-operaciones-filtros">
          <ReportFilters filters={filters} onChange={handleFiltersChange} loading={loading} />
        </div>
```

- [ ] **Paso 3: Agregar `id` al grid de KPIs**

Localizar:
```jsx
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
```
Cambiar a:
```jsx
        <div id="tour-reportes-operaciones-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
```

- [ ] **Paso 4: Repetir pasos 1-3 para los 7 archivos restantes**

Aplicar el mismo patrón (envolver AccionesDropdown, envolver filtros, id al grid de KPIs) en cada uno de los 7 archivos restantes usando los IDs de la tabla de arriba. Abrir cada archivo, identificar los mismos 3 elementos y aplicar el cambio.

Nota: Si algún archivo no usa `ReportFilters` sino filtros propios (ej. inputs inline), agregar el `id` al `div` que envuelve esa sección de filtros.

- [ ] **Paso 5: Verificar en navegador**

Navegar a `/reportes/operaciones`, clic en `?`. El tour debe iniciar en filtros, luego KPIs, luego botón de exportar. Verificar también `/reportes/inventario` para confirmar que el patrón funciona.

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Reportes/ReporteOperaciones.jsx frontend/src/pages/Reportes/ReporteInventario.jsx frontend/src/pages/Reportes/ReporteInventarioUbicacion.jsx frontend/src/pages/Reportes/ReporteClientes.jsx frontend/src/pages/Reportes/ReporteViajes.jsx frontend/src/pages/Reportes/ReporteCajasMenores.jsx frontend/src/pages/Reportes/ReporteGastos.jsx frontend/src/pages/Reportes/ReporteAverias.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en reportes individuales"
```

---

## Tarea 4: IDs en `ReportesProgramados.jsx`

**Archivos:**
- Modificar: `frontend/src/pages/Reportes/ReportesProgramados.jsx`

El botón "Nuevo Programado" está en el header (≈línea 376). La lista/tabla está en `<div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border...">` (≈línea 387).

- [ ] **Paso 1: Agregar `id` al botón Nuevo Programado**

Localizar:
```jsx
          <button
            onClick={() => setFormModal({ open: true, reporte: null })}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            title="Nuevo Programado"
          >
```
Cambiar a:
```jsx
          <button
            id="tour-reportes-programados-nuevo"
            onClick={() => setFormModal({ open: true, reporte: null })}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            title="Nuevo Programado"
          >
```

- [ ] **Paso 2: Agregar `id` al contenedor de la lista**

Localizar:
```jsx
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
```
Cambiar a:
```jsx
        <div id="tour-reportes-programados-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
```

- [ ] **Paso 3: Verificar en navegador**

Navegar a `/reportes/programados`, clic en `?`. El tour debe mostrar 2 pasos: tabla y botón nuevo.

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Reportes/ReportesProgramados.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en ReportesProgramados"
```

---

## Tarea 5: IDs en `UsuariosList.jsx`

**Archivos:**
- Modificar: `frontend/src/pages/Administracion/UsuariosList.jsx`

El botón "Nuevo Usuario" está condicionado por `hasPermission('usuarios', 'crear')` (≈línea 224). La tabla/contenedor está en `<div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-200 dark:border-slate-700">` (≈línea 264).

- [ ] **Paso 1: Agregar `id` al botón Nuevo Usuario**

Localizar:
```jsx
          <button
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
```
Cambiar a:
```jsx
          <button
            id="tour-admin-usuarios-nuevo"
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
```

- [ ] **Paso 2: Agregar `id` al contenedor de la tabla**

Localizar:
```jsx
        <div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-200 dark:border-slate-700">
```
(Es el div que contiene `<div className="overflow-x-auto rounded-t-2xl">` con la `<table>`.)

Cambiar a:
```jsx
        <div id="tour-admin-usuarios-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-200 dark:border-slate-700">
```

- [ ] **Paso 3: Verificar**

Navegar a `/administracion` (tab Usuarios activo por defecto), clic en `?`. El tour debe mostrar los 2 pasos del tab usuarios (tabla y botón nuevo). Los pasos de los otros tabs no deben aparecer (DOM-resilience los filtra).

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Administracion/UsuariosList.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en Administracion/UsuariosList"
```

---

## Tarea 6: IDs en `RolesList.jsx`

**Archivos:**
- Modificar: `frontend/src/pages/Administracion/RolesList.jsx`

El botón "Nuevo Rol" está condicionado por `canCreateRol` (≈línea 365). La matriz de permisos (panel principal) está en `<div className="bg-gray-50 dark:bg-centhrix-bg" style={{ borderRadius: 12, ...}}>` (≈línea 415).

- [ ] **Paso 1: Agregar `id` al botón Nuevo Rol**

Localizar:
```jsx
          {canCreateRol && (
            <button
              onClick={() => setShowNewRol(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nuevo Rol
            </button>
          )}
```
Cambiar a:
```jsx
          {canCreateRol && (
            <button
              id="tour-admin-roles-nuevo"
              onClick={() => setShowNewRol(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nuevo Rol
            </button>
          )}
```

- [ ] **Paso 2: Agregar `id` al panel de la matriz de permisos**

Localizar:
```jsx
          <div
            className="bg-gray-50 dark:bg-centhrix-bg"
            style={{ borderRadius: 12, padding: 16, fontFamily: "'Segoe UI', sans-serif" }}
          >
```
Cambiar a:
```jsx
          <div
            id="tour-admin-roles-tabla"
            className="bg-gray-50 dark:bg-centhrix-bg"
            style={{ borderRadius: 12, padding: 16, fontFamily: "'Segoe UI', sans-serif" }}
          >
```

- [ ] **Paso 3: Verificar**

Navegar a `/administracion`, cambiar al tab "Roles y Permisos", clic en `?`. El tour debe mostrar solo los 2 pasos del tab roles (matriz y botón nuevo). Los pasos de otros tabs no deben aparecer.

Nota: Si el usuario no tiene permiso `roles.crear`, el botón "Nuevo Rol" no estará en el DOM → `useTutorial` omitirá ese paso automáticamente. Verificar que el tour igualmente funciona mostrando solo el paso de la matriz.

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Administracion/RolesList.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en Administracion/RolesList"
```

---

## Tarea 7: IDs en `SesionesActivas.jsx` y `DashboardSeguridad.jsx`

**Archivos:**
- Modificar: `frontend/src/pages/Administracion/SesionesActivas.jsx`
- Modificar: `frontend/src/pages/Administracion/DashboardSeguridad.jsx`

### SesionesActivas

El grid de sesiones está en `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">` (≈línea 180). Este div solo se renderiza cuando hay sesiones — la DOM-resilience del tour cubrirá el caso de 0 sesiones (paso filtrado).

- [ ] **Paso 1: Agregar `id` al grid de sesiones en `SesionesActivas.jsx`**

Localizar:
```jsx
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```
Cambiar a:
```jsx
        <div id="tour-admin-sesiones-tabla" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### DashboardSeguridad

El panel principal (contenedor completo) está en `<div className="space-y-6">` (≈línea 172, dentro del return del componente).

- [ ] **Paso 2: Agregar `id` al contenedor del panel en `DashboardSeguridad.jsx`**

Localizar:
```jsx
    <div className="space-y-6">
```
Cambiar a:
```jsx
    <div id="tour-admin-seguridad-panel" className="space-y-6">
```

- [ ] **Paso 3: Verificar SesionesActivas**

Navegar a `/administracion`, cambiar al tab "Sesiones Activas", clic en `?`. El tour debe mostrar 1 paso con el grid de sesiones.

- [ ] **Paso 4: Verificar DashboardSeguridad**

Cambiar al tab "Seguridad", clic en `?`. El tour debe mostrar 1 paso apuntando al panel de métricas.

- [ ] **Paso 5: Commit**

```bash
git add frontend/src/pages/Administracion/SesionesActivas.jsx frontend/src/pages/Administracion/DashboardSeguridad.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en Administracion/SesionesActivas y DashboardSeguridad"
```

---

## Tarea 8: Actualizar `CLAUDE.md`

**Archivos:**
- Modificar: `CLAUDE.md`

- [ ] **Paso 1: Agregar 11 filas a la tabla de tours**

Localizar la tabla `## Tutorial Interactivo (driver.js)` en `CLAUDE.md`. Al final de la tabla (después de `| movimientos | /viajes/movimientos | ... |`), agregar:

```markdown
| `reportes` | `/reportes` | `tour-reportes-header`, `tour-reportes-cards` |
| `reportes_operaciones` | `/reportes/operaciones` | `tour-reportes-operaciones-filtros`, `-kpis`, `-exportar` |
| `reportes_inventario` | `/reportes/inventario` | `tour-reportes-inventario-filtros`, `-kpis`, `-exportar` |
| `reportes_inventario_ubicacion` | `/reportes/inventario-ubicacion` | `tour-reportes-inventario-ubicacion-filtros`, `-kpis`, `-exportar` |
| `reportes_clientes` | `/reportes/clientes` | `tour-reportes-clientes-filtros`, `-kpis`, `-exportar` |
| `reportes_viajes` | `/reportes/viajes` | `tour-reportes-viajes-filtros`, `-kpis`, `-exportar` |
| `reportes_cajas_menores` | `/reportes/cajas-menores` | `tour-reportes-cajas-menores-filtros`, `-kpis`, `-exportar` |
| `reportes_gastos` | `/reportes/gastos` | `tour-reportes-gastos-filtros`, `-kpis`, `-exportar` |
| `reportes_averias` | `/reportes/averias` | `tour-reportes-averias-filtros`, `-kpis`, `-exportar` |
| `reportes_programados` | `/reportes/programados` | `tour-reportes-programados-tabla`, `tour-reportes-programados-nuevo` |
| `administracion` | `/administracion` | `tour-admin-usuarios-tabla`, `tour-admin-usuarios-nuevo`, `tour-admin-roles-tabla`, `tour-admin-roles-nuevo`, `tour-admin-sesiones-tabla`, `tour-admin-seguridad-panel` |
```

- [ ] **Paso 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: actualizar CLAUDE.md con las 11 nuevas claves de tour (Reportes + Administración)"
```

---

## Verificación final

- [ ] Reiniciar `npm run dev` si aún no está corriendo.
- [ ] Navegar a `/reportes` → `?` → tour 2 pasos ✓
- [ ] Navegar a `/reportes/operaciones` → `?` → tour 3 pasos (filtros, KPIs, exportar) ✓
- [ ] Navegar a `/reportes/programados` → `?` → tour 2 pasos ✓
- [ ] Navegar a `/administracion` (tab Usuarios) → `?` → 2 pasos solo de usuarios ✓
- [ ] Cambiar a tab Roles → `?` → 2 pasos solo de roles ✓
- [ ] Cambiar a tab Sesiones → `?` → 1 paso ✓
- [ ] Cambiar a tab Seguridad → `?` → 1 paso ✓
- [ ] Verificar `localStorage`: key `centhrix_tour_administracion` aparece tras completar cualquier tour del módulo ✓
- [ ] El punto rojo del botón `?` desaparece después de completar el tour ✓
