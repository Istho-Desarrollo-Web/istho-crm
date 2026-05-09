# Tutorial por Módulo — Diseño Técnico

**Fecha:** 2026-05-08
**Autor:** Osman Gallego / Coordinación TI ISTHO
**Estado:** Aprobado

---

## Objetivo

Agregar un sistema de tutorial interactivo guiado (tooltips paso a paso) a los módulos principales del CRM CenthriX, activable manualmente mediante un botón `?` fijo en el `FloatingHeader`. El tutorial resalta elementos reales de la pantalla con un overlay oscuro y globos de ayuda contextuales.

---

## Alcance — Módulos implementados (v1 + extensión 2026-05-08)

| Módulo | Ruta(s) | Clave localStorage |
|---|---|---|
| Dashboard (Operaciones) | `/dashboard` (rol: admin, supervisor, operador, cliente) | `centhrix_tour_dashboard_operaciones` |
| Dashboard (Conductor) | `/dashboard` (rol: conductor) | `centhrix_tour_dashboard_conductor` |
| Dashboard (Financiera) | `/dashboard` (rol: financiera) | `centhrix_tour_dashboard_financiera` |
| Clientes | `/clientes` | `centhrix_tour_clientes` |
| Inventario | `/inventario` | `centhrix_tour_inventario` |
| Operaciones Entradas | `/operaciones/entradas` | `centhrix_tour_operaciones` |
| Operaciones Salidas | `/operaciones/salidas` | `centhrix_tour_salidas` |
| Operaciones Kardex | `/operaciones/kardex` | `centhrix_tour_kardex` |
| Detalle Operación | `/operaciones/(entradas\|salidas\|kardex)/:id` | `centhrix_tour_operacion_detalle` |
| Detalle Cliente | `/clientes/:id` | `centhrix_tour_cliente_detalle` |
| Detalle Producto | `/inventario/productos/:id` | `centhrix_tour_producto_detalle` |
| Viajes | `/viajes/viajes` | `centhrix_tour_viajes` |
| Vehículos | `/viajes/vehiculos` | `centhrix_tour_vehiculos` |
| Cajas Menores | `/viajes/cajas-menores` | `centhrix_tour_cajas_menores` |
| Movimientos | `/viajes/movimientos` | `centhrix_tour_movimientos` |

> **Nota extensión 2026-05-08:** Salidas y Kardex recibieron tours propios (antes compartían `'operaciones'`). Los detalles de operación, cliente y producto usan regex en `FloatingHeader.moduloActivo` para detectar rutas con `:id`. El componente `Section` local en cada Auditoria recibió prop `id` opcional.

---

## Librería

**`driver.js`** — sin dependencias, ~5 KB gzip, compatible con React 19.

```bash
cd frontend && npm install driver.js
```

---

## Arquitectura

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/utils/tutorialConfig.js` | Define los pasos de cada módulo y el mapa `RUTAS_CON_TOUR` |
| `frontend/src/hooks/useTutorial.js` | Encapsula driver.js, lee/escribe localStorage, expone `iniciarTour` y `haTomadoTour` |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/components/layout/FloatingHeader.jsx` | Agrega botón `?` con lógica de ruta y rol |
| `frontend/src/index.css` | Estilos CSS para los popovers de driver.js |
| `frontend/src/pages/Dashboard/Dashboard.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Dashboard/DashboardConductor.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Dashboard/DashboardFinanciera.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Clientes/ClientesList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Inventario/InventarioList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Inventario/Entradas/EntradasList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Viajes/ViajesList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Viajes/VehiculosList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Viajes/CajaMenorList.jsx` | Agrega `id` a elementos del tour |
| `frontend/src/pages/Viajes/MovimientosList.jsx` | Agrega `id` a elementos del tour |

---

## `tutorialConfig.js`

```js
export const TUTORIALES = {

  dashboard_operaciones: {
    modulo: 'dashboard_operaciones',
    pasos: [
      { element: '#tour-dash-kpis',       popover: { title: 'KPIs del día',         description: 'Resumen ejecutivo: operaciones activas, alertas de inventario y viajes en curso.' } },
      { element: '#tour-dash-grafico',    popover: { title: 'Gráfico de actividad', description: 'Evolución de entradas y salidas del último mes.' } },
      { element: '#tour-dash-alertas',    popover: { title: 'Alertas de stock',      description: 'Productos por debajo del stock mínimo que requieren atención.' } },
    ],
  },

  dashboard_conductor: {
    modulo: 'dashboard_conductor',
    pasos: [
      { element: '#tour-dash-viaje',      popover: { title: 'Viaje activo',    description: 'Tu viaje en curso con destino, estado actual y gastos registrados.' } },
      { element: '#tour-dash-caja',       popover: { title: 'Caja menor',      description: 'Saldo disponible de tu caja para gastos del viaje.' } },
      { element: '#tour-dash-registrar',  popover: { title: 'Registrar gasto', description: 'Agrega un gasto con foto del soporte para su aprobación.' } },
    ],
  },

  dashboard_financiera: {
    modulo: 'dashboard_financiera',
    pasos: [
      { element: '#tour-dash-resumen',    popover: { title: 'Resumen financiero',    description: 'Ingresos, egresos y saldo neto del período seleccionado.' } },
      { element: '#tour-dash-cajas',      popover: { title: 'Cajas menores activas', description: 'Estado de todas las cajas menores abiertas y sus saldos.' } },
      { element: '#tour-dash-pendientes', popover: { title: 'Gastos pendientes',     description: 'Movimientos que aún no tienen soporte aprobado.' } },
    ],
  },

  clientes: {
    modulo: 'clientes',
    pasos: [
      { element: '#tour-clientes-tabla',    popover: { title: 'Lista de clientes', description: 'Todos los clientes registrados. Puedes buscar por nombre, NIT o ciudad.' } },
      { element: '#tour-clientes-filtros',  popover: { title: 'Filtros',           description: 'Filtra por estado (activo/inactivo) o por tipo de cliente.' } },
      { element: '#tour-clientes-nuevo',    popover: { title: 'Nuevo cliente',     description: 'Crea un cliente nuevo. Necesitas NIT, razón social y ciudad como mínimo.' } },
      { element: '#tour-clientes-exportar', popover: { title: 'Exportar',          description: 'Descarga la lista completa en Excel para reportes externos.' } },
    ],
  },

  inventario: {
    modulo: 'inventario',
    pasos: [
      { element: '#tour-inventario-tabla',   popover: { title: 'Maestro de productos', description: 'Catálogo completo de productos con stock actual, ubicación y estado.' } },
      { element: '#tour-inventario-buscar',  popover: { title: 'Búsqueda',            description: 'Busca por SKU, nombre o código WMS.' } },
      { element: '#tour-inventario-alertas', popover: { title: 'Alertas de stock',    description: 'Productos en rojo están por debajo del stock mínimo configurado.' } },
    ],
  },

  operaciones: {
    modulo: 'operaciones',
    pasos: [
      { element: '#tour-ops-tabs',     popover: { title: 'Entradas / Salidas / Kardex', description: 'Las tres vistas del módulo. Cada una muestra los movimientos sincronizados desde el WMS.' } },
      { element: '#tour-ops-tabla',    popover: { title: 'Tabla de operaciones',        description: 'Cada fila es una orden. Haz clic para ver el detalle completo y el histórico de auditoría.' } },
      { element: '#tour-ops-filtros',  popover: { title: 'Filtros de fecha',            description: 'Filtra por rango de fechas o por cliente para acotar los resultados.' } },
      { element: '#tour-ops-exportar', popover: { title: 'Exportar',                   description: 'Genera un Excel o PDF con las operaciones del período seleccionado.' } },
    ],
  },

  viajes: {
    modulo: 'viajes',
    pasos: [
      { element: '#tour-viajes-tabla',   popover: { title: 'Lista de viajes', description: 'Todos los viajes registrados con su estado, conductor y vehículo asignado.' } },
      { element: '#tour-viajes-nuevo',   popover: { title: 'Nuevo viaje',     description: 'Registra un viaje: asigna conductor, vehículo, origen y destino.' } },
      { element: '#tour-viajes-filtros', popover: { title: 'Filtros',         description: 'Filtra por estado, conductor o rango de fechas.' } },
    ],
  },

  vehiculos: {
    modulo: 'vehiculos',
    pasos: [
      { element: '#tour-vehiculos-tabla',   popover: { title: 'Flota de vehículos', description: 'Listado de todos los vehículos con placa, tipo y estado actual.' } },
      { element: '#tour-vehiculos-nuevo',   popover: { title: 'Nuevo vehículo',     description: 'Registra un vehículo con placa, marca, modelo y capacidad de carga.' } },
      { element: '#tour-vehiculos-estado',  popover: { title: 'Estado',             description: 'Indica si el vehículo está disponible, en ruta o en mantenimiento.' } },
    ],
  },

  cajas_menores: {
    modulo: 'cajas_menores',
    pasos: [
      { element: '#tour-cajas-tabla',  popover: { title: 'Cajas menores',    description: 'Cada caja está asociada a un viaje o conductor. Muestra el saldo actual y los movimientos.' } },
      { element: '#tour-cajas-saldo',  popover: { title: 'Saldo disponible', description: 'El saldo se actualiza automáticamente con cada movimiento registrado.' } },
      { element: '#tour-cajas-nuevo',  popover: { title: 'Nuevo movimiento', description: 'Registra un gasto o ingreso con su soporte documental.' } },
    ],
  },

  movimientos: {
    modulo: 'movimientos',
    pasos: [
      { element: '#tour-movimientos-tabla',    popover: { title: 'Movimientos',  description: 'Historial de todos los movimientos de cajas menores: gastos, anticipos y reintegros.' } },
      { element: '#tour-movimientos-filtros',  popover: { title: 'Filtros',      description: 'Filtra por tipo de movimiento, conductor o rango de fechas.' } },
      { element: '#tour-movimientos-exportar', popover: { title: 'Exportar',     description: 'Descarga el historial en Excel para conciliación contable.' } },
    ],
  },
};

export const RUTAS_CON_TOUR = {
  '/dashboard':              'dashboard',   // clave especial — FloatingHeader resuelve variante por rol
  '/clientes':               'clientes',
  '/inventario':             'inventario',
  '/operaciones/entradas':   'operaciones',
  '/operaciones/salidas':    'operaciones',
  '/operaciones/kardex':     'operaciones',
  '/viajes/viajes':          'viajes',
  '/viajes/vehiculos':       'vehiculos',
  '/viajes/cajas-menores':   'cajas_menores',
  '/viajes/movimientos':     'movimientos',
};
```

---

## `useTutorial.js`

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

---

## FloatingHeader — fragmento del botón `?`

```jsx
import { HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { RUTAS_CON_TOUR } from '../../utils/tutorialConfig';
import useTutorial from '../../hooks/useTutorial';

// Dentro del componente FloatingHeader (tiene useAuth ya importado):
const { pathname } = useLocation();
const { iniciarTour, haTomadoTour } = useTutorial();

const moduloActivo = useMemo(() => {
  if (RUTAS_CON_TOUR[pathname] === 'dashboard') {
    return rol === 'conductor'  ? 'dashboard_conductor'
         : rol === 'financiera' ? 'dashboard_financiera'
         : 'dashboard_operaciones';
  }
  return RUTAS_CON_TOUR[pathname] ?? null;
}, [pathname, rol]);

// En el JSX, junto a los íconos de búsqueda y notificaciones:
{moduloActivo && (
  <div className="relative">
    <button
      onClick={() => iniciarTour(moduloActivo)}
      title="Tutorial del módulo"
      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
    {!haTomadoTour(moduloActivo) && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
    )}
  </div>
)}
```

---

## Estilos CSS (`index.css`)

```css
/* ── Driver.js Tour ───────────────────────────────────────────── */
.driver-popover {
  background: #1A1B3A !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
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
.driver-popover-next-btn:hover { background: #C0392B !important; }
.driver-popover-prev-btn {
  background: transparent !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  border-radius: 8px !important;
  color: #94a3b8 !important;
}
.driver-popover-progress-text {
  color: #64748b !important;
  font-size: 0.75rem !important;
}
```

---

## Decisiones de diseño

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| driver.js | shepherd.js, react-joyride | Sin dependencias, más liviano, API simple |
| Config centralizada en `tutorialConfig.js` | Config por página | Mantiene FloatingHeader limpio, sin acoplamiento layout ↔ páginas |
| Botón en FloatingHeader | Botón en cada página | UX consistente, un solo lugar para mantener |
| localStorage por clave de módulo | BD / backend | No requiere API nueva, suficiente para este caso |
| Resolución de variante dashboard en FloatingHeader | En useTutorial | FloatingHeader ya tiene `useAuth`, evita pasar el rol como arg |

---

## IDs requeridos por módulo

### Dashboard Operaciones (`Dashboard.jsx`)
- `#tour-dash-kpis` — contenedor de tarjetas KPI
- `#tour-dash-grafico` — componente gráfico principal
- `#tour-dash-alertas` — sección de alertas de stock

### Dashboard Conductor (`DashboardConductor.jsx`)
- `#tour-dash-viaje` — card del viaje activo
- `#tour-dash-caja` — card de saldo de caja menor
- `#tour-dash-registrar` — botón o sección de registro de gasto

### Dashboard Financiera (`DashboardFinanciera.jsx`)
- `#tour-dash-resumen` — card de resumen financiero
- `#tour-dash-cajas` — sección de cajas menores activas
- `#tour-dash-pendientes` — sección de gastos pendientes

### Clientes (`ClientesList.jsx`)
- `#tour-clientes-tabla` — tabla principal
- `#tour-clientes-filtros` — barra de filtros
- `#tour-clientes-nuevo` — botón nuevo cliente
- `#tour-clientes-exportar` — botón exportar

### Inventario (`InventarioList.jsx`)
- `#tour-inventario-tabla` — tabla de productos
- `#tour-inventario-buscar` — barra de búsqueda
- `#tour-inventario-alertas` — indicador / columna de alertas

### Operaciones (`EntradasList.jsx` — compartidos)
- `#tour-ops-tabs` — tabs Entradas / Salidas / Kardex
- `#tour-ops-tabla` — tabla de operaciones
- `#tour-ops-filtros` — filtros de fecha y cliente
- `#tour-ops-exportar` — botón exportar

### Viajes (`ViajesList.jsx`)
- `#tour-viajes-tabla` — tabla de viajes
- `#tour-viajes-nuevo` — botón nuevo viaje
- `#tour-viajes-filtros` — filtros

### Vehículos (`VehiculosList.jsx`)
- `#tour-vehiculos-tabla` — tabla de vehículos
- `#tour-vehiculos-nuevo` — botón nuevo vehículo
- `#tour-vehiculos-estado` — columna o badge de estado

### Cajas Menores (`CajaMenorList.jsx`)
- `#tour-cajas-tabla` — tabla de cajas
- `#tour-cajas-saldo` — columna o card de saldo
- `#tour-cajas-nuevo` — botón nuevo movimiento

### Movimientos (`MovimientosList.jsx`)
- `#tour-movimientos-tabla` — tabla de movimientos
- `#tour-movimientos-filtros` — filtros
- `#tour-movimientos-exportar` — botón exportar
