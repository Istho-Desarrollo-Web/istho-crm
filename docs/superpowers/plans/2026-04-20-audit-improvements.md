# Mejoras de Auditoría UI — CRM CenthriX

> **Para agentes:** USA el skill `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans`. Marca cada paso con `- [x]` al completarlo.

**Goal:** Elevar el score de auditoría UI de 12/20 a ≥16/20 corrigiendo accesibilidad, theming, motion y tipografía.

**Architecture:** 4 fases de complejidad creciente. Fases 1–3 usan 2 subagentes `fullstack-developer` en paralelo sobre archivos disjuntos. Cada fase finaliza con ESLint + build + revisión visual antes de continuar.

**Tech Stack:** React 19 · Vite · Tailwind CSS 4 · MUI 7 · Lucide React · PropTypes

---

## Protocolo de Verificación (repetir al final de cada fase)

```bash
# Desde la raíz del proyecto
cd frontend

# 1. ESLint
npx eslint src/ --ext .jsx,.js --max-warnings 0

# 2. Build
npm run build

# 3. Dev server
npm run dev
# → Abrir http://localhost:5173 y validar checklist visual de la fase
```

**Política:** Errores ESLint nuevos introducidos por el agente bloquean la fase. Warnings preexistentes no bloquean pero se documentan.

---

## FASE 0 — Setup

> **Ejecutor:** Claude principal · Sin subagentes paralelos

### Task 0: Crear `.impeccable.md` con Design Context

**Files:**
- Create: `.impeccable.md`

- [ ] **Paso 1: Crear el archivo de contexto de diseño**

Crear el archivo `.impeccable.md` en la raíz del proyecto con este contenido exacto:

```markdown
## Design Context

### Users
Operadores logísticos, supervisores y administradores de ISTHO S.A.S. (Girardota, Colombia).
Usan el CRM en desktop durante turnos operativos para gestionar transporte, inventario y clientes.
Contexto de uso: oficinas y bodegas, pantallas de escritorio, jornadas prolongadas.
Job-to-be-done: registrar operaciones rápidamente, monitorear estado en tiempo real, generar reportes.

### Brand Personality
**3 palabras:** Industrial · Dinámico · Confiable

Tono: directo y funcional. Sin decoración innecesaria. La interfaz debe transmitir autoridad
operativa — como un panel de control, no una landing page.

### Aesthetic Direction
- **Tema:** Dark mode principal (`#0F1023` base, `#1A1B3A` cards)
- **Acento:** Rojo `#E74C3C` — energía, alerta, acción
- **Anti-referencias:** Nada que parezca SaaS genérico, glassmorphism, gradientes cyan/purple
- **Referencia de tono:** Tableros de control industrial, interfaces de logística como FedEx Insight

### Design Principles
1. **Densidad informativa** — las tablas y listas son el corazón; no sacrificar datos por estética
2. **Jerarquía clara** — headings con display font (Rajdhani), datos en Segoe UI
3. **Dark mode sin concesiones** — todos los componentes usan tokens centhrix-*, no slate-* de Tailwind
4. **Accesibilidad como base** — WCAG AA en todos los componentes interactivos
5. **Motion discreto** — transiciones de 200-300ms, ease-out-expo, sin rebotes
```

- [ ] **Paso 2: Verificar que el archivo existe**

```bash
ls -la .impeccable.md
```

Esperado: archivo creado en la raíz del proyecto.

- [ ] **Paso 3: Commit**

```bash
git add .impeccable.md
git commit -m "chore: agregar contexto de diseño .impeccable.md para CenthriX"
```

---

## FASE 1 — Cambios de Una Línea

> **Ejecutores:** 2 subagentes `fullstack-developer` en paralelo  
> Tasks 1A y 1B son independientes — no comparten archivos.

---

### Task 1A: Corregir easing bounce en animación `zoomIn`

**Files:**
- Modify: `frontend/src/index.css`

**Contexto:** `cubic-bezier(0.34, 1.56, 0.64, 1)` produce overshooting (rebote visual). El skill de diseño lo prohíbe explícitamente. Reemplazar por ease-out-expo que desacelera naturalmente.

- [ ] **Paso 1: Localizar la animación en index.css**

```bash
grep -n "cubic-bezier(0.34" frontend/src/index.css
```

Esperado: línea con `.animate-zoomIn { animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }`

- [ ] **Paso 2: Reemplazar el easing**

En `frontend/src/index.css`, cambiar esta línea:

```css
/* ANTES */
.animate-zoomIn {
  animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Por:

```css
/* DESPUÉS */
.animate-zoomIn {
  animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Paso 3: ESLint**

```bash
cd frontend && npx eslint src/index.css --ext .css 2>/dev/null || echo "CSS no aplica a ESLint — OK"
```

- [ ] **Paso 4: Verificar visualmente**

```bash
cd frontend && npm run dev
```

Abrir cualquier modal → la animación de apertura debe sentirse fluida, sin overshooting.

- [ ] **Paso 5: Commit**

```bash
git add frontend/src/index.css
git commit -m "fix: reemplazar easing bounce por ease-out-expo en animación zoomIn"
```

---

### Task 1B: Eliminar colores hardcodeados en páginas Auth y otros archivos

**Files:**
- Modify: `frontend/src/pages/Auth/Login.jsx`
- Modify: `frontend/src/pages/Auth/ForgotPassword.jsx`
- Modify: `frontend/src/pages/Auth/ResetPassword.jsx`
- Modify: `frontend/src/pages/Viajes/ViajesList.jsx`
- Modify: `frontend/src/pages/Viajes/MovimientosList.jsx`
- Modify: `frontend/src/pages/Viajes/CajaMenorList.jsx`
- Modify: `frontend/src/pages/Configuracion/ConfiguracionWms.jsx`
- Modify: `frontend/src/components/common/LoadingScreen.jsx`
- Modify: `frontend/src/components/layout/FloatingHeader.jsx`
- Modify: `frontend/src/utils/Contexto.jsx`
- Modify: `frontend/src/index.css`

**Contexto:** 10 archivos usan `[#E74C3C]` o `[#C0392B]` como clases Tailwind inline. Tailwind tiene `orange-500` = `#E74C3C` y `orange-700` = `#C0392B` configurados en `tailwind.config.js`. Usar esos tokens en su lugar.

- [ ] **Paso 1: Auditar todas las ocurrencias**

```bash
grep -rn "\[#E74C3C\]\|\[#C0392B\]" frontend/src/
```

Anota cada archivo y línea antes de modificar.

- [ ] **Paso 2: Reemplazar en masa con sed**

```bash
# Reemplazar [#E74C3C] → orange-500
find frontend/src -name "*.jsx" -o -name "*.js" | xargs sed -i 's/\[#E74C3C\]/orange-500/g'

# Reemplazar [#C0392B] → orange-700
find frontend/src -name "*.jsx" -o -name "*.js" | xargs sed -i 's/\[#C0392B\]/orange-700/g'
```

**Nota Windows:** Si `sed -i` no funciona en Git Bash, usar la alternativa PowerShell:
```powershell
Get-ChildItem -Recurse -Path frontend/src -Include *.jsx,*.js | ForEach-Object {
    (Get-Content $_.FullName) -replace '\[#E74C3C\]','orange-500' -replace '\[#C0392B\]','orange-700' | Set-Content $_.FullName
}
```

- [ ] **Paso 3: Verificar que no quedaron ocurrencias**

```bash
grep -rn "\[#E74C3C\]\|\[#C0392B\]" frontend/src/
```

Esperado: sin resultados.

- [ ] **Paso 4: Mover animaciones inline de ForgotPassword a index.css**

En `frontend/src/pages/Auth/ForgotPassword.jsx`, eliminar el bloque `const animationStyles = \`...\`` y el `<style>` tag que lo inyecta (si existe).

En `frontend/src/index.css`, agregar al final:

```css
/* Auth — ForgotPassword animations */
@keyframes forgotFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes forgotSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes forgotCheckBounce {
  0%   { transform: scale(0); opacity: 0; }
  50%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes forgotPulseRing {
  0%   { transform: scale(0.8); opacity: 0.5; }
  50%  { transform: scale(1.1); opacity: 0.2; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.animate-forgotFadeIn   { animation: forgotFadeIn 0.4s ease-out; }
.animate-forgotSlideUp  { animation: forgotSlideUp 0.5s ease-out; }
.animate-forgotCheckBounce { animation: forgotCheckBounce 0.5s ease-out 0.2s both; }
.animate-forgotPulseRing   { animation: forgotPulseRing 2s ease-in-out infinite; }
```

En `ForgotPassword.jsx`, reemplazar cada `style={{ animation: 'forgotXxx ...' }}` por la clase `className="animate-forgotXxx"` correspondiente.

- [ ] **Paso 5: ESLint**

```bash
cd frontend && npx eslint src/pages/Auth/ src/pages/Viajes/ src/pages/Configuracion/ src/components/common/LoadingScreen.jsx src/components/layout/FloatingHeader.jsx src/utils/Contexto.jsx --ext .jsx,.js --max-warnings 0
```

Esperado: sin errores nuevos.

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/
git commit -m "fix: reemplazar colores hardcodeados [#E74C3C]/[#C0392B] por tokens orange-500/orange-700"
```

---

### Verificación Fase 1

- [ ] **ESLint completo**

```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
```

- [ ] **Build**

```bash
cd frontend && npm run build
```

Esperado: `✓ built in X.Xs` sin errores.

- [ ] **Revisión visual**

```bash
cd frontend && npm run dev
```

Checklist:
- [ ] `/login` — sin valores `[#E74C3C]` en computed styles (inspeccionar con devtools)
- [ ] `/forgot-password` — animaciones fluidas
- [ ] Abrir cualquier modal — animación `zoomIn` sin rebote/overshooting

---

## FASE 2 — Cambios de Componente (ARIA)

> **Ejecutores:** 2 subagentes `fullstack-developer` en paralelo  
> **Nota sobre FloatingHeader.jsx:** Task 2A toca los menús desplegables (dropdowns de usuario/notificaciones). Task 2B toca la región live de notificaciones. Son secciones distintas del mismo archivo — revisar el diff de ambos agentes antes de hacer el commit final para evitar conflictos.

---

### Task 2A: ARIA — Modal + Button + Dropdowns

**Files:**
- Modify: `frontend/src/components/common/Modal/Modal.jsx`
- Modify: `frontend/src/components/common/Button/Button.jsx`
- Modify: `frontend/src/components/common/AccionesDropdown.jsx`
- Modify: `frontend/src/components/layout/FloatingHeader.jsx` (sección de menús de usuario/notificaciones)

---

#### Subtask 2A-1: Modal con ARIA completo + focus trap

El `Modal.jsx` actual no tiene `role`, `aria-modal`, ni manejo de foco. Reemplazar el componente completo:

```jsx
import { useEffect, useRef, useId } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  footer,
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  // Focus trap: guardar foco anterior, enfocar primer elemento al abrir
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.[0]?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Prevenir scroll del body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white rounded-2xl shadow-2xl
          max-h-[90vh] flex flex-col
          animate-fadeIn
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-slate-800">{title}</h2>
            {subtitle && (
              <p id={descId} className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 p-6 border-t border-gray-100 bg-slate-50 rounded-b-2xl [&>button]:w-full sm:[&>button]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  showCloseButton: PropTypes.bool,
  closeOnOverlay: PropTypes.bool,
  footer: PropTypes.node,
};

export default Modal;
```

- [ ] **Paso 1:** Reemplazar `Modal.jsx` con el código anterior.

- [ ] **Paso 2: ESLint sobre Modal**

```bash
cd frontend && npx eslint src/components/common/Modal/Modal.jsx --max-warnings 0
```

Esperado: sin errores.

- [ ] **Paso 3: Verificar en devtools**

```bash
cd frontend && npm run dev
```

Abrir cualquier modal → inspeccionar en devtools: el div del modal debe tener `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.

---

#### Subtask 2A-2: Button — agregar `aria-label` para botones de solo icono

En `frontend/src/components/common/Button/Button.jsx`, agregar el prop `ariaLabel` y pasarlo al elemento `<button>`:

- [ ] **Paso 1:** Agregar `ariaLabel` a la firma del componente y al elemento `<button>`:

```jsx
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  title,
  ariaLabel,        // ← nuevo prop
}) => {
  // ... (resto sin cambios) ...

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel ?? title}    // ← usar ariaLabel, fallback a title
      className={`...`}
    >
      {/* ... contenido sin cambios ... */}
    </button>
  );
};

Button.propTypes = {
  // ... props existentes ...
  ariaLabel: PropTypes.string,    // ← agregar al final de propTypes
};
```

- [ ] **Paso 2: ESLint**

```bash
cd frontend && npx eslint src/components/common/Button/Button.jsx --max-warnings 0
```

---

#### Subtask 2A-3: AccionesDropdown — agregar ARIA de expansión

Leer `frontend/src/components/common/AccionesDropdown.jsx` y agregar a su botón trigger:

- [ ] **Paso 1:** Leer el archivo actual:

```bash
cat frontend/src/components/common/AccionesDropdown.jsx
```

- [ ] **Paso 2:** Agregar al botón trigger del dropdown (busca el `<button>` que controla `isOpen`):

```jsx
// Agregar un id al contenedor de opciones para aria-controls
const menuId = useId(); // importar useId de react

// En el botón trigger:
<button
  onClick={() => setIsOpen(!isOpen)}
  aria-haspopup="menu"
  aria-expanded={isOpen}
  aria-controls={menuId}
  // ... resto de props existentes
>

// En el contenedor de opciones (ul/div que aparece al abrir):
<ul
  id={menuId}
  role="menu"
  // ... resto de clases existentes
>
  {/* Cada item: */}
  <li role="menuitem">...</li>
```

- [ ] **Paso 3: ESLint**

```bash
cd frontend && npx eslint src/components/common/AccionesDropdown.jsx --max-warnings 0
```

---

#### Subtask 2A-4: FloatingHeader — ARIA en menús de usuario y notificaciones

- [ ] **Paso 1:** Buscar los botones de menú en FloatingHeader:

```bash
grep -n "setShow\|isOpen\|onClick.*menu\|onClick.*notif" frontend/src/components/layout/FloatingHeader.jsx | head -30
```

- [ ] **Paso 2:** Para cada botón que abre un dropdown (menú de usuario, menú de notificaciones), agregar:

```jsx
// Patrón a aplicar en cada trigger de menú:
<button
  onClick={() => setShowUserMenu(!showUserMenu)}
  aria-haspopup="menu"
  aria-expanded={showUserMenu}
  aria-label="Menú de usuario"   // ← label descriptivo
>

// En el panel que abre:
<div
  role="menu"
  aria-label="Opciones de usuario"
>
  <button role="menuitem">...</button>
  <button role="menuitem">...</button>
```

Adaptar nombres de estado (`showUserMenu`, `showNotifMenu`, etc.) al estado real del componente.

- [ ] **Paso 3: ESLint (solo sección modificada)**

```bash
cd frontend && npx eslint src/components/layout/FloatingHeader.jsx --max-warnings 0
```

- [ ] **Paso 4: Commit parcial Task 2A (esperar Task 2B para FloatingHeader)**

```bash
git add frontend/src/components/common/Modal/Modal.jsx
git add frontend/src/components/common/Button/Button.jsx
git add frontend/src/components/common/AccionesDropdown.jsx
git commit -m "feat: agregar ARIA completo a Modal, Button e AccionesDropdown"
```

---

### Task 2B: ARIA — Input + KpiCard + DataTable + Live Region

**Files:**
- Modify: `frontend/src/components/common/Input/Input.jsx`
- Modify: `frontend/src/components/common/Card/KpiCard.jsx`
- Modify: `frontend/src/components/common/Table/DataTable.jsx`
- Modify: `frontend/src/components/layout/FloatingHeader.jsx` (sección de live region — distinta a Task 2A)

---

#### Subtask 2B-1: Input — vincular label, aria-invalid, aria-describedby

Reemplazar `frontend/src/components/common/Input/Input.jsx` completo:

```jsx
import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  className = '',
  containerClassName = '',
  type = 'text',
  disabled,
  id: externalId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full py-2.5 border rounded-xl text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
            ${Icon ? 'pl-10' : 'pl-4'} pr-4
            ${error
              ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300'
              : 'border-slate-200 bg-white text-slate-900'
            }
            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-500 mt-1 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  icon: PropTypes.elementType,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  id: PropTypes.string,
};

export default Input;
```

- [ ] **Paso 1:** Reemplazar `Input.jsx` con el código anterior.

- [ ] **Paso 2: ESLint**

```bash
cd frontend && npx eslint src/components/common/Input/Input.jsx --max-warnings 0
```

---

#### Subtask 2B-2: KpiCard — aria-busy durante loading

En `frontend/src/components/common/Card/KpiCard.jsx`, agregar `aria-busy` y `aria-label` al contenedor del skeleton:

- [ ] **Paso 1:** Leer el archivo actual:

```bash
cat frontend/src/components/common/Card/KpiCard.jsx
```

- [ ] **Paso 2:** En el bloque `if (loading)`, modificar el div raíz:

```jsx
// ANTES:
if (loading) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border ... animate-pulse">

// DESPUÉS:
if (loading) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando indicador"
      className="bg-white dark:bg-centhrix-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 animate-pulse"
    >
```

- [ ] **Paso 3: ESLint**

```bash
cd frontend && npx eslint src/components/common/Card/KpiCard.jsx --max-warnings 0
```

---

#### Subtask 2B-3: DataTable — aria-busy durante loading

En `frontend/src/components/common/Table/DataTable.jsx`:

- [ ] **Paso 1:** Leer el archivo:

```bash
cat frontend/src/components/common/Table/DataTable.jsx
```

- [ ] **Paso 2:** Agregar `aria-busy={loading}` al elemento `<table>` (o al contenedor de la tabla si `loading` es un prop):

```jsx
<table
  aria-busy={loading ?? false}
  className="w-full"
>
```

Si `loading` no es un prop existente, agregar al `propTypes` del componente:

```jsx
DataTable.propTypes = {
  // ... props existentes ...
  loading: PropTypes.bool,
};
```

- [ ] **Paso 3: ESLint**

```bash
cd frontend && npx eslint src/components/common/Table/DataTable.jsx --max-warnings 0
```

---

#### Subtask 2B-4: FloatingHeader — agregar live region para notificaciones

- [ ] **Paso 1:** Buscar el estado de notificaciones en FloatingHeader:

```bash
grep -n "notificacion\|notification\|nueva\|live" frontend/src/components/layout/FloatingHeader.jsx | head -20
```

- [ ] **Paso 2:** Agregar un live region al JSX de FloatingHeader (antes del cierre del `return`):

```jsx
{/* Live region para screen readers — anunciará nuevas notificaciones */}
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
  id="centhrix-live-region"
>
  {/* Actualizar este contenido cuando llegue una notificación nueva */}
  {/* Ejemplo: nuevaNotificacion ? `Nueva notificación: ${nuevaNotificacion.mensaje}` : '' */}
</div>
```

- [ ] **Paso 3:** Identificar dónde llegan notificaciones nuevas (buscar `useEffect` que actualiza lista de notificaciones) y agregar:

```jsx
// Dentro del useEffect que procesa notificaciones nuevas:
const liveRegion = document.getElementById('centhrix-live-region');
if (liveRegion && nuevaNotif?.mensaje) {
  liveRegion.textContent = `Nueva notificación: ${nuevaNotif.mensaje}`;
  // Limpiar después de que el lector lo anuncie
  setTimeout(() => { liveRegion.textContent = ''; }, 3000);
}
```

- [ ] **Paso 4: ESLint sobre FloatingHeader**

```bash
cd frontend && npx eslint src/components/layout/FloatingHeader.jsx --max-warnings 0
```

- [ ] **Paso 5: Commit Task 2B + FloatingHeader completo**

Esperar a que Task 2A haya commiteado sus cambios en FloatingHeader antes de este paso. Luego:

```bash
git add frontend/src/components/common/Input/Input.jsx
git add frontend/src/components/common/Card/KpiCard.jsx
git add frontend/src/components/common/Table/DataTable.jsx
git add frontend/src/components/layout/FloatingHeader.jsx
git commit -m "feat: agregar ARIA completo a Input, KpiCard, DataTable y live region en FloatingHeader"
```

---

### Verificación Fase 2

- [ ] **ESLint completo**

```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
```

- [ ] **Build**

```bash
cd frontend && npm run build
```

- [ ] **Revisión visual con devtools**

```bash
cd frontend && npm run dev
```

Checklist:
- [ ] Abrir un formulario → navegar con `Tab` → foco visible y orden lógico
- [ ] Ingresar un campo con error → inspeccionar en devtools: `<p>` de error tiene `id` que coincide con `aria-describedby` del input
- [ ] Abrir modal → devtools muestra `role="dialog"` y `aria-modal="true"`
- [ ] Botón de cerrar modal (X) → devtools muestra `aria-label="Cerrar modal"`
- [ ] Abrir AccionesDropdown → botón tiene `aria-expanded="true"` mientras está abierto
- [ ] KpiCard en estado loading → div tiene `aria-busy="true"`

---

## FASE 3 — Cambios Sistémicos

> **Ejecutores:** 2 subagentes `fullstack-developer` en paralelo  
> **Coordinación de archivos compartidos:**
> - `frontend/tailwind.config.js` → solo lo modifica Task 3B (sin conflicto)
> - `frontend/src/index.css` → ambas tasks lo tocan en **secciones distintas**. Task 3A debe commitear primero sus cambios en `index.css` (eliminar overrides) antes de que Task 3B agregue `.font-display`. Para el resto de sus archivos, ambas tasks pueden trabajar en paralelo desde el inicio.

---

### Task 3A: Normalizar tokens de color — reemplazar `dark:bg-slate-*` por `centhrix-*`

**Files:**
- Modify: 72 archivos con `dark:bg-slate-*` en `frontend/src/`
- Modify: `frontend/src/index.css` (eliminar overrides que parchean slate→centhrix)
- Create: `frontend/src/utils/chartColors.js`
- Modify: `frontend/src/components/charts/PieChart.jsx`
- Modify: `frontend/src/components/charts/BarChart.jsx`

**Contexto — mapeo de colores:**
| Clase Tailwind actual | Color real | Token centhrix equivalente | Color centhrix |
|----------------------|-----------|--------------------------|---------------|
| `dark:bg-slate-900`  | `#0f172a` | `dark:bg-centhrix-bg`    | `#0F1023`     |
| `dark:bg-slate-800`  | `#1e293b` | `dark:bg-centhrix-card`  | `#1A1B3A`     |
| `dark:bg-slate-700`  | `#334155` | `dark:bg-centhrix-surface` | `#151631`   |

**Importante:** `dark:hover:bg-slate-*` (hover states) se reemplaza de forma conservadora:
- `dark:hover:bg-slate-700` → `dark:hover:bg-centhrix-surface`
- `dark:hover:bg-slate-600` → `dark:hover:bg-centhrix-card`

---

- [ ] **Paso 1: Reemplazo automático con sed**

```bash
cd frontend

# Fondos estáticos
find src -name "*.jsx" -o -name "*.js" | xargs sed -i \
  -e 's/dark:bg-slate-900/dark:bg-centhrix-bg/g' \
  -e 's/dark:bg-slate-800/dark:bg-centhrix-card/g' \
  -e 's/dark:bg-slate-700/dark:bg-centhrix-surface/g' \
  -e 's/dark:bg-slate-600/dark:bg-centhrix-surface/g'

# Hover states
find src -name "*.jsx" -o -name "*.js" | xargs sed -i \
  -e 's/dark:hover:bg-slate-700/dark:hover:bg-centhrix-surface/g' \
  -e 's/dark:hover:bg-slate-600/dark:hover:bg-centhrix-card/g' \
  -e 's/dark:hover:bg-slate-800/dark:hover:bg-centhrix-card/g'
```

**Nota Windows (Git Bash):** Si `sed -i` no funciona correctamente:

```powershell
$patterns = @(
    @('dark:bg-slate-900',        'dark:bg-centhrix-bg'),
    @('dark:bg-slate-800',        'dark:bg-centhrix-card'),
    @('dark:bg-slate-700',        'dark:bg-centhrix-surface'),
    @('dark:bg-slate-600',        'dark:bg-centhrix-surface'),
    @('dark:hover:bg-slate-700',  'dark:hover:bg-centhrix-surface'),
    @('dark:hover:bg-slate-600',  'dark:hover:bg-centhrix-card'),
    @('dark:hover:bg-slate-800',  'dark:hover:bg-centhrix-card')
)
Get-ChildItem -Recurse -Path frontend/src -Include *.jsx,*.js | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    foreach ($p in $patterns) { $content = $content -replace [regex]::Escape($p[0]), $p[1] }
    Set-Content $_.FullName $content
}
```

- [ ] **Paso 2: Verificar que no quedaron `dark:bg-slate-` en componentes**

```bash
grep -rn "dark:bg-slate-[0-9]" frontend/src/ | grep -v "dark:hover:bg-slate-[0-9]"
```

Si hay residuos, reemplazarlos manualmente revisando el contexto.

- [ ] **Paso 3: Limpiar overrides en index.css**

En `frontend/src/index.css`, buscar y eliminar el bloque de overrides que parchea colores (tipicamente dice `.dark .bg-white`, `.dark .bg-slate-*`):

```bash
grep -n "\.dark \.bg-slate\|\.dark \.bg-white\|\.dark \.text-slate" frontend/src/index.css
```

Eliminar esas líneas — ya no son necesarias porque los componentes usan tokens directamente.

- [ ] **Paso 4: Crear `frontend/src/utils/chartColors.js`**

```js
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
];

export const CHART_COLORS_OPACITY = (opacity = 0.7) =>
  CHART_COLORS.map((c) => `${c}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
```

- [ ] **Paso 5: Actualizar PieChart.jsx para usar CHART_COLORS**

```bash
cat frontend/src/components/charts/PieChart.jsx
```

Localizar el array de colores hardcodeados (algo como `['#3b82f6', '#10b981', ...]`) y reemplazar por:

```jsx
import { CHART_COLORS } from '../../utils/chartColors';

// Reemplazar el array inline por:
const COLORS = CHART_COLORS;
```

- [ ] **Paso 6: Actualizar BarChart.jsx para usar CHART_COLORS**

```bash
cat frontend/src/components/charts/BarChart.jsx
```

Misma operación que PieChart — importar y usar `CHART_COLORS`.

- [ ] **Paso 7: ESLint**

```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
```

- [ ] **Paso 8: Commit Task 3A (sin tailwind.config.js — esperar coordinación con 3B)**

```bash
git add frontend/src/
git commit -m "feat: normalizar tokens dark mode a centhrix-* y centralizar colores de charts"
```

---

### Task 3B: Tipografía display con Rajdhani

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Modify: páginas principales (Dashboard, ClientesList, headings de sección)

**Contexto:**
- `index.html` carga Inter (fuente rechazada por el skill de diseño). Reemplazar por Rajdhani.
- Rajdhani: geométrico condensado, pesos 400–700, excelente en dark backgrounds. [Google Fonts](https://fonts.google.com/specimen/Rajdhani)
- Aplicar SOLO en `h1`, `h2`, `h3` de páginas principales — NO en tablas, inputs, labels ni datos operativos.

---

- [ ] **Paso 1: Reemplazar font en index.html**

En `frontend/index.html`, reemplazar:

```html
<!-- ELIMINAR ESTAS LÍNEAS: -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

Por:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Paso 2: Agregar `fontFamily.display` en tailwind.config.js**

En `frontend/tailwind.config.js`, dentro de `theme.extend`:

```js
fontFamily: {
  sans: ['"Segoe UI"', 'Calibri', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
  display: ['Rajdhani', '"Segoe UI"', 'system-ui', 'sans-serif'],  // ← agregar esta línea
},
```

- [ ] **Paso 3: Agregar utility en index.css — ESPERAR a que Task 3A haya commiteado sus cambios en este archivo**

En `frontend/src/index.css`, agregar al final (después de que Task 3A haya eliminado los overrides):

```css
/* Display font — headings de páginas principales */
.font-display {
  font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
}
```

- [ ] **Paso 4: Aplicar `font-display` en Dashboard**

```bash
grep -n "text-2xl\|text-3xl\|text-xl.*font-bold\|<h1\|<h2" frontend/src/pages/Dashboard/Dashboard.jsx | head -20
```

En el heading principal del Dashboard (título de página), agregar clase `font-display`:

```jsx
// Ejemplo — adaptar al JSX real encontrado:
<h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">
  Dashboard
</h1>
```

- [ ] **Paso 5: Aplicar `font-display` en páginas de listas principales**

Repetir para los headings de título de página en:
- `frontend/src/pages/Clientes/ClientesList.jsx`
- `frontend/src/pages/Inventario/InventarioList.jsx`
- `frontend/src/pages/Viajes/ViajesList.jsx`
- `frontend/src/pages/Reportes/ReportesList.jsx`

Patrón a buscar y modificar en cada archivo:

```bash
grep -n "text-2xl\|text-3xl\|font-bold.*text-slate" frontend/src/pages/Clientes/ClientesList.jsx | head -5
```

Agregar `font-display` al heading de título de cada página.

- [ ] **Paso 6: Verificar que Rajdhani carga en devtools**

```bash
cd frontend && npm run dev
```

Abrir devtools → Network → filtrar por "rajdhani" → debe aparecer la petición a Google Fonts.
Abrir devtools → Elements → seleccionar un `<h1>` → Computed → `font-family` debe incluir "Rajdhani".

- [ ] **Paso 7: Commit Task 3B**

```bash
git add frontend/index.html frontend/tailwind.config.js frontend/src/index.css frontend/src/pages/
git commit -m "feat: agregar tipografía display Rajdhani para headings de páginas principales"
```

---

### Verificación Fase 3

- [ ] **ESLint completo**

```bash
cd frontend && npx eslint src/ --ext .jsx,.js --max-warnings 0
```

- [ ] **Build**

```bash
cd frontend && npm run build
```

- [ ] **Revisión visual**

```bash
cd frontend && npm run dev
```

Checklist:
- [ ] Activar dark mode → tarjetas muestran tono navy-púrpura (`#1A1B3A`), no azul (`slate-800` = `#1e293b`)
- [ ] Dashboard → título "Dashboard" renderiza en Rajdhani (geométrico condensado)
- [ ] ClientesList, ViajesList → mismo heading en Rajdhani
- [ ] Charts (PieChart, BarChart) → colores consistentes entre ambos componentes
- [ ] Inspeccionar `computed styles` de un heading → `font-family` incluye Rajdhani

---

## Resumen de Commits Esperados

| Fase | Commit |
|------|--------|
| 0 | `chore: agregar contexto de diseño .impeccable.md para CenthriX` |
| 1A | `fix: reemplazar easing bounce por ease-out-expo en animación zoomIn` |
| 1B | `fix: reemplazar colores hardcodeados por tokens orange-500/orange-700` |
| 2A | `feat: agregar ARIA completo a Modal, Button e AccionesDropdown` |
| 2B | `feat: agregar ARIA completo a Input, KpiCard, DataTable y live region` |
| 3A | `feat: normalizar tokens dark mode a centhrix-* y centralizar colores de charts` |
| 3B | `feat: agregar tipografía display Rajdhani para headings de páginas principales` |

**Total: 7 commits · Score esperado post-implementación: ≥16/20**
