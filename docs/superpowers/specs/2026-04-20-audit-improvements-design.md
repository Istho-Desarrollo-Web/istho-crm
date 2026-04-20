# Spec: Mejoras de Auditoría UI — CRM CenthriX

**Fecha:** 2026-04-20  
**Proyecto:** CRM CenthriX — ISTHO S.A.S.  
**Origen:** Resultado de `/audit` con score 12/20 (Acceptable)  
**Objetivo:** Elevar el score a ≥16/20 ejecutando mejoras graduales con subagentes paralelos.

---

## Contexto

El frontend del CRM CenthriX (React 19 + Vite + Tailwind 4 + MUI 7) presentó los siguientes problemas principales en auditoría:

- **Accesibilidad (1/4):** Modal, Input, Button icono y Dropdowns sin atributos ARIA. Falla WCAG 2.1 AA.
- **Theming (2/4):** Sistema tripartito inconsistente (`slate-*` + `centhrix-*` + `orange-*`). `dark:bg-slate-800` ≠ `#1A1B3A`.
- **Anti-Patterns (3/4):** Easing bounce prohibido (`cubic-bezier(0.34,1.56,0.64,1)`), fuente tipográfica anónima.
- **Colores hardcodeados en Auth:** `[#E74C3C]` inline en `Login.jsx` y `ForgotPassword.jsx`.

---

## Estrategia de Ejecución

**Enfoque:** Complejidad creciente (Fase 0→3) con paralelismo por dominio dentro de cada fase.  
**Subagentes:** 2 en paralelo por fase (tareas con archivos disjuntos).  
**Verificación por fase:** ESLint → Build → Revisión visual en navegador.  
**Tipografía:** Incluida en Fase 3 con fuente **Rajdhani** (Google Fonts).

---

## Fase 0 — Setup

**Responsable:** Claude principal (sin subagentes)  
**Complejidad:** Baja — creación de archivo de contexto de diseño

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| Crear `.impeccable.md` | `/` raíz del proyecto | Brand personality: "industrial, dinámico, confiable" · Audiencia: operadores logísticos en Colombia · Dark theme principal · Acento `#E74C3C` · Tipografía objetivo: Segoe UI + Rajdhani display |

**Criterio de salida:** Archivo `.impeccable.md` creado y con sección `## Design Context` completa.

---

## Fase 1 — Cambios de Una Línea

**Responsable:** 2 subagentes `fullstack-developer` en paralelo  
**Complejidad:** Baja — ediciones puntuales sin lógica nueva

### Agente A — Motion Fix
| Archivo | Cambio |
|---------|--------|
| `frontend/src/index.css` | `@keyframes zoomIn`: cambiar `cubic-bezier(0.34,1.56,0.64,1)` → `cubic-bezier(0.16,1,0.3,1)` (ease-out-expo, sin rebote) |

### Agente B — Auth Colors
| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/Auth/Login.jsx` | Todos los `[#E74C3C]` → clase `orange-500`; todos los `[#C0392B]` → `orange-700` |
| `frontend/src/pages/Auth/ForgotPassword.jsx` | Mismo reemplazo de colores hardcodeados + mover animaciones inline a clases definidas en `index.css` |

**Verificación Fase 1:**
```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
cd frontend && npm run build
cd frontend && npm run dev
# Revisar: /login, /forgot-password, abrir cualquier modal
```

**Checklist visual:**
- [ ] `/login` — sin valores `[#E74C3C]` inline visibles en devtools
- [ ] `/forgot-password` — animaciones fluidas sin rebote
- [ ] Modal genérico — `zoomIn` sin overshooting

---

## Fase 2 — Cambios de Componente (ARIA)

**Responsable:** 2 subagentes `fullstack-developer` en paralelo  
**Complejidad:** Media — modificar componentes base sin romper la API existente

### Agente A — ARIA: Modal + Button + Dropdowns
| Archivo | Cambios concretos |
|---------|-------------------|
| `frontend/src/components/common/Modal/Modal.jsx` | Agregar `role="dialog"` · `aria-modal="true"` · `aria-labelledby="modal-title-{id}"` · `aria-describedby` condicional si hay subtitle · Asignar `id` al `<h2>` y `<p>` del subtitle · Implementar focus trap: al abrir, enfocar primer elemento focusable; al cerrar, devolver foco al trigger (usando `useRef`) |
| `frontend/src/components/common/Button/Button.jsx` | Cuando `children` es solo icono (sin texto visible), usar `aria-label={title}` explícito. Agregar prop `ariaLabel` como alias semántico de `title` para casos de icono puro |
| `frontend/src/components/common/FilterDropdown/` | `aria-haspopup="listbox"` · `aria-expanded={isOpen}` · `aria-controls="dropdown-{id}"` en el trigger · `role="listbox"` e `id` correspondiente en el `<ul>` |
| `frontend/src/components/layout/FloatingHeader.jsx` (menús de usuario y notificaciones) | Mismo patrón `aria-haspopup="menu"` + `aria-expanded` en cada trigger de menú desplegable |

### Agente B — ARIA: Input + Skeletons + Live Region
| Archivo | Cambios concretos |
|---------|-------------------|
| `frontend/src/components/common/Input/Input.jsx` | Importar `useId` de React · Generar `id` interno si no se pasa como prop · Vincular `<label htmlFor={id}>` · `<input id={id} aria-invalid={!!error} aria-describedby={error ? \`\${id}-error\` : undefined}` · `<p id={\`\${id}-error\`} role="alert">` en el mensaje de error |
| `frontend/src/components/common/Card/KpiCard.jsx` | Agregar `aria-busy={loading}` y `aria-label={loading ? "Cargando..." : title}` al contenedor raíz durante skeleton |
| `frontend/src/components/common/Table/DataTable.jsx` | Agregar `aria-busy={loading}` al `<table>` durante estado de carga |
| `frontend/src/components/layout/FloatingHeader.jsx` (notificaciones) — **sección diferente a Agente A** | Agregar `<div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region">` · Actualizar su contenido cuando llega una notificación nueva · **Nota:** Agente A toca los menús (líneas de dropdowns); Agente B toca la región de notificaciones — revisar diff antes de merge para evitar conflicto |

**Verificación Fase 2:**
```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
cd frontend && npm run build
cd frontend && npm run dev
# Navegar con Tab, probar formularios con error, abrir modal
```

**Checklist visual:**
- [ ] Tab por formulario de login — foco visible y orden lógico
- [ ] Campo con error — mensaje anunciable (inspeccionar `aria-describedby` en devtools)
- [ ] Modal abierto — `role="dialog"` presente en DOM
- [ ] Botón de cierre — tiene `aria-label` en devtools
- [ ] Dropdown abierto — `aria-expanded="true"` refleja estado

---

## Fase 3 — Cambios Sistémicos

**Responsable:** 2 subagentes `fullstack-developer` en paralelo  
**Complejidad:** Alta — afecta múltiples archivos y el sistema de diseño global

### Agente A — Normalización de Tokens de Color
**Objetivo:** Eliminar el sistema tripartito (`slate-*` + `centhrix-*` + `orange-*`) y unificar en tokens semánticos.

| Paso | Detalle |
|------|---------|
| **Grep exhaustivo** | Buscar `dark:bg-slate-800`, `dark:bg-slate-700`, `dark:bg-slate-900`, `dark:bg-slate-600` en todo `src/` |
| **Mapeo de reemplazos** | `dark:bg-slate-800` → `dark:bg-centhrix-card` (#1A1B3A) · `dark:bg-slate-900` → `dark:bg-centhrix-bg` (#0F1023) · `dark:bg-slate-700` → `dark:bg-centhrix-surface` (#151631) · `dark:bg-slate-600` → `dark:bg-centhrix-surface` |
| **Eliminar overrides CSS** | En `src/index.css`, borrar las reglas `.dark .bg-slate-*` que parchean colores — ya no serán necesarias |
| **Charts** | Crear `frontend/src/utils/chartColors.js` con constante `CHART_COLORS` exportada · Reemplazar arrays de colores hardcodeados en `PieChart.jsx` y `BarChart.jsx` |
| **Archivos afectados** | `KpiCard.jsx`, `DataTable.jsx`, `Modal.jsx`, `Button.jsx`, `Input.jsx`, `FloatingHeader.jsx`, `LoadingScreen.jsx` y cualquier otro componente con `dark:bg-slate-*` |

### Agente B — Tipografía Display
**Fuente seleccionada:** Rajdhani (Google Fonts)  
**Justificación:** Geométrico condensado, personalidad industrial-técnica, pesos 400–700, excelente en fondos dark, no está en la lista de fuentes prohibidas del skill impeccable.

| Paso | Archivo | Detalle |
|------|---------|---------|
| Import font | `frontend/index.html` | Agregar `<link>` de Google Fonts con `Rajdhani:wght@400;500;600;700` y `display=swap` |
| Configurar token | `frontend/tailwind.config.js` | Agregar `fontFamily.display: ['Rajdhani', 'system-ui', 'sans-serif']` |
| Definir utility | `frontend/src/index.css` | Agregar clase `.font-display` si se necesita fuera de Tailwind |
| Aplicar en headings | Páginas: `Dashboard`, `ClientesList`, `InventarioPage`, headers de sección | Clases `font-display` en `h1`, `h2`, `h3` de páginas principales — NO en tablas, inputs ni componentes de datos |
| Verificar contraste | Dark mode principal | Rajdhani en `#F0F0F5` sobre `#0F1023` — verificar legibilidad en peso 600+ |

**Verificación Fase 3:**
```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
cd frontend && npm run build
cd frontend && npm run dev
# Revisar dark mode, headings, charts
```

**Checklist visual:**
- [ ] Dark mode activo — tarjetas muestran `#1A1B3A` exacto (no azulado `slate-800`)
- [ ] Dashboard — headings con Rajdhani visibles y legibles
- [ ] Charts — colores consistentes, sin diferencias entre PieChart y BarChart
- [ ] Ningún componente desincronizado en dark
- [ ] Inspeccionar `computed styles` de un heading → `font-family` incluye Rajdhani

---

## Protocolo de Verificación Global

### Comandos por fase
```bash
# ESLint — solo errores nuevos bloquean
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0

# Build de producción
cd frontend && npm run build

# Dev server
cd frontend && npm run dev
```

### Política ESLint
- Errores nuevos introducidos por el agente: **bloquean la fase** — corregir antes de continuar
- Warnings preexistentes al proyecto: documentar en el PR, no bloquean
- `--max-warnings 0` se aplica sobre la delta de warnings nuevos, no sobre el total histórico

---

## Archivos Afectados — Resumen

| Fase | Archivos |
|------|----------|
| 0 | `.impeccable.md` |
| 1A | `src/index.css` |
| 1B | `src/pages/Auth/Login.jsx`, `src/pages/Auth/ForgotPassword.jsx` |
| 2A | `src/components/common/Modal/Modal.jsx`, `src/components/common/Button/Button.jsx`, `src/components/common/FilterDropdown/`, `src/components/layout/FloatingHeader.jsx` |
| 2B | `src/components/common/Input/Input.jsx`, `src/components/common/Card/KpiCard.jsx`, `src/components/common/Table/DataTable.jsx`, `src/components/layout/FloatingHeader.jsx` |
| 3A | `tailwind.config.js`, `src/index.css`, `src/utils/chartColors.js` (nuevo), múltiples componentes |
| 3B | `index.html`, `tailwind.config.js`, `src/index.css`, páginas principales |

---

## Criterios de Éxito

- Score de auditoría `/audit` ≥ 16/20
- ESLint sin errores nuevos introducidos
- Build de producción exitoso en todas las fases
- Componentes base (Modal, Input, Button) con ARIA completo verificado en devtools
- Dark mode unificado: todos los componentes usan tokens `centhrix-*`
- Rajdhani visible en headings de páginas principales
