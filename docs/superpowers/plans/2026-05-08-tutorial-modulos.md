# Tutorial Interactivo por Módulo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un sistema de tutoriales interactivos guiados (driver.js) en los módulos Dashboard, Clientes, Inventario, Operaciones y Viajes, activable mediante un botón `?` en el FloatingHeader que detecta la ruta y el rol del usuario.

**Architecture:** Config centralizada en `tutorialConfig.js` + hook `useTutorial.js` que encapsula driver.js + botón `?` en el `FloatingHeader`. Cada página expone elementos con atributos `id` estables que driver.js usa como anclas de los tooltips.

**Tech Stack:** driver.js, React 19, Tailwind 4, React Router v6 (`useLocation`), localStorage.

---

## Estructura de archivos

| Acción | Archivo |
|---|---|
| Crear | `frontend/src/utils/tutorialConfig.js` |
| Crear | `frontend/src/hooks/useTutorial.js` |
| Modificar | `frontend/src/index.css` |
| Modificar | `frontend/src/components/layout/FloatingHeader.jsx` |
| Modificar | `frontend/src/pages/Dashboard/Dashboard.jsx` |
| Modificar | `frontend/src/pages/Dashboard/DashboardConductor.jsx` |
| Modificar | `frontend/src/pages/Dashboard/DashboardFinanciera.jsx` |
| Modificar | `frontend/src/pages/Clientes/ClientesList.jsx` |
| Modificar | `frontend/src/pages/Inventario/InventarioList.jsx` |
| Modificar | `frontend/src/pages/Inventario/Entradas/EntradasList.jsx` |
| Modificar | `frontend/src/pages/Viajes/ViajesList.jsx` |
| Modificar | `frontend/src/pages/Viajes/VehiculosList.jsx` |
| Modificar | `frontend/src/pages/Viajes/CajaMenorList.jsx` |
| Modificar | `frontend/src/pages/Viajes/MovimientosList.jsx` |

---

## Task 1: Instalar driver.js y crear tutorialConfig.js

**Files:**
- Create: `frontend/src/utils/tutorialConfig.js`

- [ ] **Step 1: Instalar driver.js**

```bash
cd frontend && npm install driver.js
```

Salida esperada: `added 1 package` (o similar). Verifica que aparece en `package.json` bajo `dependencies`.

- [ ] **Step 2: Crear `frontend/src/utils/tutorialConfig.js`**

```js
export const TUTORIALES = {

  dashboard_operaciones: {
    modulo: 'dashboard_operaciones',
    pasos: [
      {
        element: '#tour-dash-kpis',
        popover: {
          title: 'KPIs del día',
          description: 'Resumen ejecutivo: operaciones activas, alertas de inventario y viajes en curso.',
        },
      },
      {
        element: '#tour-dash-grafico',
        popover: {
          title: 'Gráfico de actividad',
          description: 'Evolución de entradas y salidas del último mes.',
        },
      },
      {
        element: '#tour-dash-alertas',
        popover: {
          title: 'Alertas de stock',
          description: 'Productos por debajo del stock mínimo que requieren atención.',
        },
      },
    ],
  },

  dashboard_conductor: {
    modulo: 'dashboard_conductor',
    pasos: [
      {
        element: '#tour-dash-caja',
        popover: {
          title: 'Caja Menor Activa',
          description: 'Tu caja menor en curso. Muestra el saldo disponible para gastos del viaje.',
        },
      },
      {
        element: '#tour-dash-registrar',
        popover: {
          title: 'Registrar Gasto',
          description: 'Agrega un gasto con foto del soporte para su aprobación.',
        },
      },
    ],
  },

  dashboard_financiera: {
    modulo: 'dashboard_financiera',
    pasos: [
      {
        element: '#tour-dash-resumen',
        popover: {
          title: 'Resumen financiero',
          description: 'KPIs de cajas menores: saldo total, gastos del período y cajas abiertas.',
        },
      },
      {
        element: '#tour-dash-pendientes',
        popover: {
          title: 'Gastos pendientes',
          description: 'Movimientos que aún no tienen soporte aprobado. Apruébalos o recházalos desde aquí.',
        },
      },
    ],
  },

  clientes: {
    modulo: 'clientes',
    pasos: [
      {
        element: '#tour-clientes-tabla',
        popover: {
          title: 'Lista de clientes',
          description: 'Todos los clientes registrados. Puedes buscar por nombre, NIT o ciudad.',
        },
      },
      {
        element: '#tour-clientes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por estado (activo/inactivo) o por tipo de cliente.',
        },
      },
      {
        element: '#tour-clientes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga la lista completa en Excel para reportes externos.',
        },
      },
      {
        element: '#tour-clientes-nuevo',
        popover: {
          title: 'Nuevo cliente',
          description: 'Crea un cliente nuevo. Necesitas NIT, razón social y ciudad como mínimo.',
        },
      },
    ],
  },

  inventario: {
    modulo: 'inventario',
    pasos: [
      {
        element: '#tour-inventario-kpis',
        popover: {
          title: 'Resumen de inventario',
          description: 'Total de productos, valor en stock y alertas activas de stock mínimo.',
        },
      },
      {
        element: '#tour-inventario-buscar',
        popover: {
          title: 'Búsqueda y filtros',
          description: 'Busca por nombre o SKU. Filtra por cliente, estado o rango de stock.',
        },
      },
      {
        element: '#tour-inventario-tabla',
        popover: {
          title: 'Maestro de productos',
          description: 'Catálogo completo. Haz clic en un producto para ver su detalle, movimientos y ubicación WMS.',
        },
      },
    ],
  },

  operaciones: {
    modulo: 'operaciones',
    pasos: [
      {
        element: '#tour-ops-exportar',
        popover: {
          title: 'Exportar',
          description: 'Genera un Excel con las operaciones del período seleccionado.',
        },
      },
      {
        element: '#tour-ops-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por rango de fechas, estado o cliente para acotar los resultados.',
        },
      },
      {
        element: '#tour-ops-tabla',
        popover: {
          title: 'Tabla de operaciones',
          description: 'Cada fila es una orden del WMS. Haz clic para ver el detalle completo y el histórico de auditoría.',
        },
      },
    ],
  },

  viajes: {
    modulo: 'viajes',
    pasos: [
      {
        element: '#tour-viajes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de viajes en Excel.',
        },
      },
      {
        element: '#tour-viajes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por estado, conductor o rango de fechas.',
        },
      },
      {
        element: '#tour-viajes-tabla',
        popover: {
          title: 'Lista de viajes',
          description: 'Todos los viajes registrados. Haz clic para ver el detalle, gastos y documentos.',
        },
      },
      {
        element: '#tour-viajes-nuevo',
        popover: {
          title: 'Nuevo viaje',
          description: 'Registra un viaje: asigna conductor, vehículo, origen y destino.',
        },
      },
    ],
  },

  vehiculos: {
    modulo: 'vehiculos',
    pasos: [
      {
        element: '#tour-vehiculos-tabla',
        popover: {
          title: 'Flota de vehículos',
          description: 'Listado de todos los vehículos con placa, tipo y estado actual.',
        },
      },
      {
        element: '#tour-vehiculos-nuevo',
        popover: {
          title: 'Nuevo vehículo',
          description: 'Registra un vehículo con placa, marca, modelo y capacidad de carga.',
        },
      },
    ],
  },

  cajas_menores: {
    modulo: 'cajas_menores',
    pasos: [
      {
        element: '#tour-cajas-tabla',
        popover: {
          title: 'Cajas menores',
          description: 'Cada caja está asociada a un conductor. Muestra el saldo actual y el estado.',
        },
      },
      {
        element: '#tour-cajas-nueva',
        popover: {
          title: 'Nueva caja menor',
          description: 'Crea una caja menor para un conductor con su saldo inicial.',
        },
      },
    ],
  },

  movimientos: {
    modulo: 'movimientos',
    pasos: [
      {
        element: '#tour-movimientos-tabla',
        popover: {
          title: 'Movimientos',
          description: 'Historial de todos los gastos, anticipos y reintegros de cajas menores.',
        },
      },
      {
        element: '#tour-movimientos-nuevo',
        popover: {
          title: 'Nuevo movimiento',
          description: 'Registra un gasto o ingreso con soporte documental.',
        },
      },
    ],
  },
};

export const RUTAS_CON_TOUR = {
  '/dashboard': 'dashboard',
  '/clientes': 'clientes',
  '/inventario': 'inventario',
  '/operaciones/entradas': 'operaciones',
  '/operaciones/salidas': 'operaciones',
  '/operaciones/kardex': 'operaciones',
  '/viajes/viajes': 'viajes',
  '/viajes/vehiculos': 'vehiculos',
  '/viajes/cajas-menores': 'cajas_menores',
  '/viajes/movimientos': 'movimientos',
};
```

- [ ] **Step 3: Verificar que el archivo existe**

```bash
ls frontend/src/utils/tutorialConfig.js
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/tutorialConfig.js frontend/package.json frontend/package-lock.json
git commit -m "feat: instalar driver.js y crear tutorialConfig con pasos por módulo"
```

---

## Task 2: Crear el hook `useTutorial.js`

**Files:**
- Create: `frontend/src/hooks/useTutorial.js`

- [ ] **Step 1: Crear `frontend/src/hooks/useTutorial.js`**

```js
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TUTORIALES } from '../utils/tutorialConfig';

const STORAGE_PREFIX = 'centhrix_tour_';

export default function useTutorial() {
  const haTomadoTour = (modulo) =>
    localStorage.getItem(`${STORAGE_PREFIX}${modulo}`) === 'true';

  const iniciarTour = (modulo) => {
    const config = TUTORIALES[modulo];
    if (!config) return;

    const driverObj = driver({
      animate: true,
      overlayColor: 'rgba(15, 16, 35, 0.85)',
      smoothScroll: true,
      allowClose: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Entendido ✓',
      stagePadding: 8,
      stageRadius: 8,
      steps: config.pasos,
      onDestroyStarted: () => {
        localStorage.setItem(`${STORAGE_PREFIX}${modulo}`, 'true');
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  return { iniciarTour, haTomadoTour };
}
```

- [ ] **Step 2: Verificar que el hook tiene la firma correcta**

Abre `frontend/src/hooks/useTutorial.js` y confirma que exporta `useTutorial` como default, y que retorna `{ iniciarTour, haTomadoTour }`.

- [ ] **Step 3: Exportar desde el índice de hooks**

Abre `frontend/src/hooks/index.js` y agrega al final:

```js
export { default as useTutorial } from './useTutorial';
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useTutorial.js frontend/src/hooks/index.js
git commit -m "feat: crear hook useTutorial con persistencia en localStorage"
```

---

## Task 3: Agregar estilos CSS de driver.js en `index.css`

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Agregar el bloque CSS al final de `frontend/src/index.css`**

Abre el archivo y agrega al final (después de todos los estilos existentes):

```css
/* ── Driver.js Tour ───────────────────────────────────────────── */
.driver-popover {
  background: #1A1B3A !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  color: #e2e8f0 !important;
}

.driver-popover-title {
  color: #f1f5f9 !important;
  font-family: 'Rajdhani', sans-serif !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
}

.driver-popover-description {
  color: #94a3b8 !important;
  font-size: 0.875rem !important;
  line-height: 1.5 !important;
}

.driver-popover-next-btn {
  background: #E74C3C !important;
  border: none !important;
  border-radius: 8px !important;
  color: white !important;
}

.driver-popover-next-btn:hover {
  background: #C0392B !important;
}

.driver-popover-prev-btn {
  background: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 8px !important;
  color: #94a3b8 !important;
}

.driver-popover-progress-text {
  color: #64748b !important;
  font-size: 0.75rem !important;
}

.driver-popover-close-btn {
  color: #94a3b8 !important;
}

.driver-popover-close-btn:hover {
  color: #f1f5f9 !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: agregar estilos dark mode de driver.js para tour de tutoriales"
```

---

## Task 4: Agregar botón `?` en FloatingHeader

**Files:**
- Modify: `frontend/src/components/layout/FloatingHeader.jsx`

**Contexto:** El archivo importa solo `useNavigate` de react-router-dom (línea 13). La sección "Right Actions" comienza en la línea ~1408. `location.pathname` ya se usa en el JSX (líneas 1395, 1402) a través del global del navegador, pero no es reactivo. Debemos usar `useLocation()` para que el botón responda a cambios de ruta.

- [ ] **Step 1: Agregar `useLocation` al import de react-router-dom**

Busca la línea:
```js
import { useNavigate } from 'react-router-dom';
```

Reemplázala por:
```js
import { useNavigate, useLocation } from 'react-router-dom';
```

- [ ] **Step 2: Agregar `HelpCircle` al import de lucide-react**

Busca el bloque de imports de lucide-react (comienza en la línea ~15). Agrega `HelpCircle` a la lista existente:

```js
import {
  ChevronDown,
  Search,
  Bell,
  // ... (imports existentes) ...
  Upload,
  HelpCircle,   // ← agregar aquí al final de la lista
} from 'lucide-react';
```

- [ ] **Step 3: Agregar imports de tutorialConfig y useTutorial**

Después de las importaciones de contextos (después de la línea que importa `formatDateShort`), agrega:

```js
import { RUTAS_CON_TOUR } from '../../utils/tutorialConfig';
import useTutorial from '../../hooks/useTutorial';
```

- [ ] **Step 4: Agregar hooks en el cuerpo del componente FloatingHeader**

El componente `FloatingHeader` comienza en la línea ~1169. Dentro del cuerpo del componente, después de la línea:
```js
const { enqueueSnackbar } = useSnackbar();
```

Agrega:
```js
const { pathname } = useLocation();
const { iniciarTour, haTomadoTour } = useTutorial();
const rol = user?.rol;

const moduloActivo = useMemo(() => {
  if (RUTAS_CON_TOUR[pathname] === 'dashboard') {
    return rol === 'conductor'
      ? 'dashboard_conductor'
      : rol === 'financiera'
        ? 'dashboard_financiera'
        : 'dashboard_operaciones';
  }
  return RUTAS_CON_TOUR[pathname] ?? null;
}, [pathname, rol]);
```

**Importante:** El componente ya usa `useMemo` — agrégalo a la lista de dependencias del import de React (línea 12):
```js
import { useState, useEffect, useRef, useId, useMemo } from 'react';
```
`useMemo` ya está importado, no es necesario agregarlo de nuevo. Solo verifica que esté en el import.

- [ ] **Step 5: Agregar el botón `?` en el JSX**

Busca el comentario `{/* Search - abre GlobalSearch modal */}` (línea ~1409). Después del cierre del botón de búsqueda (el `</button>` que sigue al `<Search />`), agrega el botón del tutorial:

```jsx
{/* Tutorial del módulo */}
{moduloActivo && (
  <div className="relative">
    <button
      onClick={() => iniciarTour(moduloActivo)}
      title="Tutorial del módulo (ayuda)"
      aria-label="Abrir tutorial del módulo"
      className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-card rounded-lg transition-colors"
    >
      <HelpCircle className="w-5 h-5" aria-hidden="true" />
    </button>
    {!haTomadoTour(moduloActivo) && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full pointer-events-none" />
    )}
  </div>
)}
```

El bloque completo de "Right Actions" debe quedar así (fragmento):

```jsx
{/* Right Actions */}
<div className="flex items-center gap-2 sm:gap-4">
  {/* Search - abre GlobalSearch modal */}
  <button
    onClick={() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    }
    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-card rounded-lg transition-colors"
    title="Buscar (Ctrl+K)"
    aria-label="Buscar (Ctrl+K)"
  >
    <Search className="w-5 h-5" aria-hidden="true" />
  </button>

  {/* Tutorial del módulo */}
  {moduloActivo && (
    <div className="relative">
      <button
        onClick={() => iniciarTour(moduloActivo)}
        title="Tutorial del módulo (ayuda)"
        aria-label="Abrir tutorial del módulo"
        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-card rounded-lg transition-colors"
      >
        <HelpCircle className="w-5 h-5" aria-hidden="true" />
      </button>
      {!haTomadoTour(moduloActivo) && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full pointer-events-none" />
      )}
    </div>
  )}

  <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-200 dark:border-slate-700 pl-2 sm:pl-4">
    {/* ... resto del código existente (dark mode, notificaciones, etc.) */}
```

- [ ] **Step 6: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Salida esperada: sin errores. Si hay errores de TypeScript o imports, corrígelos antes de continuar.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/FloatingHeader.jsx
git commit -m "feat: agregar botón de tutorial ? en FloatingHeader con detección de ruta y rol"
```

---

## Task 5: Agregar IDs en los tres Dashboards

**Files:**
- Modify: `frontend/src/pages/Dashboard/Dashboard.jsx`
- Modify: `frontend/src/pages/Dashboard/DashboardConductor.jsx`
- Modify: `frontend/src/pages/Dashboard/DashboardFinanciera.jsx`

### Dashboard.jsx (Operaciones — roles: admin, supervisor, operador, cliente)

**Contexto:** El JSX principal inicia en la línea ~498. Los KPIs están en un `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">` (línea ~498). El BarChart está en `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">` (línea ~566). El AlertWidget está cerca del final del JSX (línea ~706).

- [ ] **Step 1: Agregar `id="tour-dash-kpis"` al div de KPI cards**

Busca:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  {KPI_CONFIG.map((kpiConfig) => {
```

Reemplaza por:
```jsx
<div id="tour-dash-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  {KPI_CONFIG.map((kpiConfig) => {
```

- [ ] **Step 2: Agregar `id="tour-dash-grafico"` al div que contiene el BarChart**

Busca la primera ocurrencia de:
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <BarChart
```

Reemplaza por:
```jsx
<div id="tour-dash-grafico" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <BarChart
```

- [ ] **Step 3: Agregar `id="tour-dash-alertas"` al div que contiene el AlertWidget**

Busca:
```jsx
<AlertWidget
```

El `AlertWidget` está envuelto en un `div`. Busca el div padre inmediato (la columna que lo contiene en el grid de 3 columnas). Agrega el id al `<AlertWidget>` directamente usando un div wrapper:

Busca el fragmento que contiene `<AlertWidget` y agrégale un wrapper con id. Ejemplo — si el código es:
```jsx
<div className="...algunas-clases...">
  <AlertWidget
    ...props
  />
</div>
```

Cámbialo por:
```jsx
<div id="tour-dash-alertas" className="...algunas-clases...">
  <AlertWidget
    ...props
  />
</div>
```

Si el `AlertWidget` no tiene div padre inmediato, agrégalo:
```jsx
<div id="tour-dash-alertas">
  <AlertWidget ... />
</div>
```

### DashboardConductor.jsx

**Contexto:** La card de caja menor activa comienza en la línea ~342 con `<div className={\`rounded-2xl p-5 shadow-sm border...`. El botón "Registrar Gasto" está en la sección de acciones rápidas (línea ~406).

- [ ] **Step 4: Agregar `id="tour-dash-caja"` a la card de caja menor**

Busca:
```jsx
<div
  className={`rounded-2xl p-5 shadow-sm border transition-colors ${
    cajaActiva
```

Reemplaza por:
```jsx
<div
  id="tour-dash-caja"
  className={`rounded-2xl p-5 shadow-sm border transition-colors ${
    cajaActiva
```

- [ ] **Step 5: Agregar `id="tour-dash-registrar"` al botón "Registrar Gasto"**

Busca el botón de "Registrar Gasto" (el `<button>` con `onClick={() => navigate('/viajes/movimientos?nuevo=1')}`):

```jsx
<button
  onClick={() => navigate('/viajes/movimientos?nuevo=1')}
  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 ...
```

Reemplaza por:
```jsx
<button
  id="tour-dash-registrar"
  onClick={() => navigate('/viajes/movimientos?nuevo=1')}
  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 ...
```

### DashboardFinanciera.jsx

**Contexto:** El dashboard financiera tiene KPI cards con estadísticas de cajas menores y una sección de gastos pendientes de aprobación.

- [ ] **Step 6: Leer el JSX del DashboardFinanciera para encontrar la sección de KPIs**

```bash
grep -n "KpiCard\|grid\|pendientes\|return (" frontend/src/pages/Dashboard/DashboardFinanciera.jsx | head -30
```

- [ ] **Step 7: Agregar `id="tour-dash-resumen"` al primer grid de KPIs**

Busca el primer `<div className="grid` que contiene `KpiCard` en el JSX de retorno. Agrega `id="tour-dash-resumen"`:

```jsx
<div id="tour-dash-resumen" className="grid ...">
  <KpiCard ...
```

- [ ] **Step 8: Agregar `id="tour-dash-pendientes"` a la sección de gastos pendientes**

Busca la sección que renderiza la lista de `pendientes` (los gastos que esperan aprobación). Añade el id al div contenedor de esa sección:

```jsx
<div id="tour-dash-pendientes" className="...clases existentes...">
  {/* Lista de gastos pendientes */}
```

- [ ] **Step 9: Verificar en el navegador que los 3 dashboards tienen los IDs**

Abre el devserver (`cd frontend && npm run dev`), navega a `/dashboard` con distintos roles en modo dev (puedes cambiar temporalmente el `DashboardRouter` para forzar un render), abre el inspector del navegador y verifica que los elementos con `id="tour-dash-kpis"`, `id="tour-dash-caja"`, `id="tour-dash-resumen"` existen en el DOM.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/Dashboard/Dashboard.jsx frontend/src/pages/Dashboard/DashboardConductor.jsx frontend/src/pages/Dashboard/DashboardFinanciera.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en los tres Dashboards"
```

---

## Task 6: Agregar IDs en Clientes e Inventario

**Files:**
- Modify: `frontend/src/pages/Clientes/ClientesList.jsx`
- Modify: `frontend/src/pages/Inventario/InventarioList.jsx`

### ClientesList.jsx

**Contexto:** El JSX de retorno principal comienza en la línea 498. Los botones "Exportar" y "Nuevo Cliente" están en el header (líneas ~520-590). La tabla principal está después de los KPIs y filtros.

- [ ] **Step 1: Agregar `id="tour-clientes-exportar"` al wrapper del botón Exportar**

Busca:
```jsx
<ProtectedAction module="clientes" action="exportar">
  <Button
    variant="outline"
    icon={Download}
    size="md"
    onClick={handleExport}
    title="Exportar"
  >
```

Reemplaza el `<ProtectedAction>` por:
```jsx
<ProtectedAction module="clientes" action="exportar">
  <div id="tour-clientes-exportar">
    <Button
      variant="outline"
      icon={Download}
      size="md"
      onClick={handleExport}
      title="Exportar"
    >
      <span className="hidden sm:inline">Exportar</span>
    </Button>
  </div>
</ProtectedAction>
```

- [ ] **Step 2: Agregar `id="tour-clientes-nuevo"` al botón Nuevo Cliente**

Busca el botón "Nuevo Cliente" (tiene texto "Nuevo Cliente" y un ícono `Plus` o `UserPlus`). Agrega el id al `<Button>` o su wrapper:

```jsx
<div id="tour-clientes-nuevo">
  <Button variant="primary" icon={UserPlus} onClick={...}>
    <span className="hidden sm:inline">Nuevo Cliente</span>
  </Button>
</div>
```

- [ ] **Step 3: Agregar `id="tour-clientes-filtros"` a la barra de filtros**

Busca el bloque de filtros (el `div` que contiene `showFilters` o los dropdowns de filtrado). Típicamente es el primer `div` con clase `rounded-2xl` o similar después del header. Agrega el id:

```jsx
<div id="tour-clientes-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl ...">
```

- [ ] **Step 4: Agregar `id="tour-clientes-tabla"` al contenedor de la tabla**

Busca el `<div>` o `<table>` que envuelve la tabla de clientes (la que tiene los `<thead>` y `<tbody>`). Agrega el id al contenedor inmediato:

```jsx
<div id="tour-clientes-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl ...">
  <table className="w-full">
```

### InventarioList.jsx

**Contexto:** Los KPIs están en un grid en la línea ~667. La sección de búsqueda y filtros en línea ~722. La tabla más abajo.

- [ ] **Step 5: Agregar `id="tour-inventario-kpis"` al grid de KPIs**

Busca:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
  <KpiCard
    title="Total Productos"
```

Reemplaza por:
```jsx
<div id="tour-inventario-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
  <KpiCard
    title="Total Productos"
```

- [ ] **Step 6: Agregar `id="tour-inventario-buscar"` al card de búsqueda y filtros**

Busca:
```jsx
<div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
  <div className="flex flex-col lg:flex-row gap-4">
    <div className="flex-1">
      <SearchBar
```

Reemplaza por:
```jsx
<div id="tour-inventario-buscar" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
  <div className="flex flex-col lg:flex-row gap-4">
    <div className="flex-1">
      <SearchBar
```

- [ ] **Step 7: Agregar `id="tour-inventario-tabla"` al contenedor de la tabla**

Busca el div que envuelve la `<table className="w-full">` de productos. Agrega el id al div contenedor:

```jsx
<div id="tour-inventario-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl ...">
  <table className="w-full">
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Clientes/ClientesList.jsx frontend/src/pages/Inventario/InventarioList.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en Clientes e Inventario"
```

---

## Task 7: Agregar IDs en Operaciones (EntradasList)

**Files:**
- Modify: `frontend/src/pages/Inventario/Entradas/EntradasList.jsx`

**Contexto:** El tour de Operaciones se muestra en las rutas `/operaciones/entradas`, `/operaciones/salidas` y `/operaciones/kardex`. Las tres páginas comparten estructura similar (lista de operaciones + filtros + exportar). Los IDs van en `EntradasList.jsx` — que es la página de `/operaciones/entradas`. El tour se activa desde cualquiera de las tres rutas con los mismos IDs. Si el usuario activa el tour en Salidas o Kardex y esos IDs no existen en el DOM, driver.js fallará. **Para la v1, los IDs solo se agregan en EntradasList.jsx**; en una versión futura pueden replicarse en SalidasList y KardexList.

- [ ] **Step 1: Agregar `id="tour-ops-exportar"` al botón de exportación Excel**

En `EntradasList.jsx`, busca el botón de exportación Excel (cerca de la línea ~364-373):
```jsx
<button
  onClick={handleExportExcel}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium ...
>
  <FileSpreadsheet className="w-4 h-4" />
  Excel
</button>
```

Reemplaza por:
```jsx
<button
  id="tour-ops-exportar"
  onClick={handleExportExcel}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium ...
>
  <FileSpreadsheet className="w-4 h-4" />
  Excel
</button>
```

- [ ] **Step 2: Agregar `id="tour-ops-filtros"` al card de filtros**

Busca el div de filtros (línea ~413):
```jsx
<div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
  <div className="flex flex-col lg:flex-row gap-4">
    {/* Search */}
```

Reemplaza por:
```jsx
<div id="tour-ops-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
  <div className="flex flex-col lg:flex-row gap-4">
    {/* Search */}
```

- [ ] **Step 3: Agregar `id="tour-ops-tabla"` al contenedor de la tabla**

Busca el div que envuelve la tabla de entradas (contiene `<table className="w-full">`). Agrega el id al div contenedor:

```jsx
<div id="tour-ops-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl ...">
  <table className="w-full">
```

- [ ] **Step 4: Verificar que driver.js no falla en rutas sin IDs**

Actualiza `useTutorial.js` para que el tour sea resiliente si algún elemento no existe en el DOM. Modifica el `iniciarTour` así:

```js
const iniciarTour = (modulo) => {
  const config = TUTORIALES[modulo];
  if (!config) return;

  // Filtrar pasos cuyos elementos no existen en el DOM
  const pasosValidos = config.pasos.filter((paso) => {
    if (!paso.element) return true;
    return document.querySelector(paso.element) !== null;
  });

  if (pasosValidos.length === 0) return;

  const driverObj = driver({
    animate: true,
    overlayColor: 'rgba(15, 16, 35, 0.85)',
    smoothScroll: true,
    allowClose: true,
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Entendido ✓',
    stagePadding: 8,
    stageRadius: 8,
    steps: pasosValidos,
    onDestroyStarted: () => {
      localStorage.setItem(`${STORAGE_PREFIX}${modulo}`, 'true');
      driverObj.destroy();
    },
  });

  driverObj.drive();
};
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Inventario/Entradas/EntradasList.jsx frontend/src/hooks/useTutorial.js
git commit -m "feat: agregar IDs en Operaciones/Entradas y hacer tour resiliente a elementos faltantes"
```

---

## Task 8: Agregar IDs en los sub-módulos de Viajes

**Files:**
- Modify: `frontend/src/pages/Viajes/ViajesList.jsx`
- Modify: `frontend/src/pages/Viajes/VehiculosList.jsx`
- Modify: `frontend/src/pages/Viajes/CajaMenorList.jsx`
- Modify: `frontend/src/pages/Viajes/MovimientosList.jsx`

### ViajesList.jsx

**Contexto:** JSX principal desde línea 455. Botón Excel (exportar) en línea ~488. KPIs en línea ~501. La tabla está más abajo. El botón "Nuevo Viaje" está en la parte inferior del filtro o en el header.

- [ ] **Step 1: Agregar `id="tour-viajes-exportar"` al botón Excel**

Busca el botón de exportación Excel en ViajesList.jsx:
```jsx
<button
  onClick={handleExportExcel}
  className="flex items-center gap-2 px-4 py-2 text-sm ...
>
  <FileSpreadsheet className="w-4 h-4" />
  <span className="hidden sm:inline">Excel</span>
</button>
```

Agrega `id="tour-viajes-exportar"` al button.

- [ ] **Step 2: Agregar `id="tour-viajes-filtros"` al card de filtros de ViajesList**

Busca el div de búsqueda/filtros en ViajesList (estructura similar a EntradasList). Agrega el id.

- [ ] **Step 3: Agregar `id="tour-viajes-tabla"` al contenedor de la tabla**

Busca el div que contiene `<table className="w-full">` en ViajesList. Agrega el id.

- [ ] **Step 4: Agregar `id="tour-viajes-nuevo"` al botón "Nuevo Viaje"**

Busca el botón con texto "Nuevo Viaje" (línea ~598). Agrega el id:
```jsx
<Button id="tour-viajes-nuevo" variant="primary" icon={Plus} onClick={...}>
  Nuevo Viaje
</Button>
```
Si `Button` no acepta `id`, envuelve en un div:
```jsx
<div id="tour-viajes-nuevo">
  <Button variant="primary" icon={Plus} onClick={...}>
    Nuevo Viaje
  </Button>
</div>
```

### VehiculosList.jsx

**Contexto:** JSX desde línea 458. No tiene botón "Nuevo" prominente (los vehículos se crean con un modal). Sí tiene tabla y filtros de estado.

- [ ] **Step 5: Agregar `id="tour-vehiculos-tabla"` al contenedor de tabla de VehiculosList**

Busca el div que contiene `<table className="w-full">` en VehiculosList. Agrega el id.

- [ ] **Step 6: Agregar `id="tour-vehiculos-nuevo"` al botón de nuevo vehículo**

Busca el botón que abre el modal de creación de vehículo. Agrega el id.

### CajaMenorList.jsx

**Contexto:** JSX desde línea 480. Tiene tabla en línea ~675 y botones de nueva caja.

- [ ] **Step 7: Agregar `id="tour-cajas-tabla"` al contenedor de tabla de CajaMenorList**

Busca el div que contiene `<table className="w-full">` en CajaMenorList (línea ~675). Agrega el id al wrapper.

- [ ] **Step 8: Agregar `id="tour-cajas-nueva"` al botón de nueva caja menor**

Busca el botón que abre el modal o el formulario de nueva caja menor. Agrega el id.

### MovimientosList.jsx

**Contexto:** JSX desde línea 676. Botón "Nuevo Movimiento" en línea ~826.

- [ ] **Step 9: Agregar `id="tour-movimientos-tabla"` al contenedor de tabla de MovimientosList**

Busca el div que contiene `<table className="w-full">` en MovimientosList (línea ~890). Agrega el id al wrapper.

- [ ] **Step 10: Agregar `id="tour-movimientos-nuevo"` al botón "Nuevo Movimiento"**

Busca el botón con texto "Nuevo Movimiento" (línea ~826). Agrega el id.

- [ ] **Step 11: Verificación final**

Levanta el devserver:
```bash
cd frontend && npm run dev
```

Prueba cada módulo:
1. Navega a `/clientes` → debe aparecer el botón `?` con punto rojo → haz clic → tour se lanza → punto desaparece.
2. Navega a `/inventario` → mismo flujo.
3. Navega a `/operaciones/entradas` → mismo flujo.
4. Navega a `/viajes/viajes` → mismo flujo.
5. Navega a `/viajes/vehiculos` → mismo flujo.
6. Navega a `/viajes/cajas-menores` → mismo flujo.
7. Navega a `/viajes/movimientos` → mismo flujo.
8. Navega a `/dashboard` → el tour correcto según el rol del usuario en sesión.
9. Navega a `/reportes` → el botón `?` **NO** debe aparecer (módulo sin tour).
10. Abre localStorage en DevTools → verifica que `centhrix_tour_clientes = "true"` está guardado.

- [ ] **Step 12: Commit final**

```bash
git add frontend/src/pages/Viajes/ViajesList.jsx frontend/src/pages/Viajes/VehiculosList.jsx frontend/src/pages/Viajes/CajaMenorList.jsx frontend/src/pages/Viajes/MovimientosList.jsx
git commit -m "feat: agregar IDs de anclaje del tutorial en sub-módulos de Viajes"
```
