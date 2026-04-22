# Rediseño Matriz de Permisos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la tabla cruzada de permisos (módulos × roles con checkboxes) por una interfaz de tabs por rol + grid de tarjetas de módulo con auto-guardado en `RolesList.jsx`.

**Architecture:** Cambio de un único archivo (`frontend/src/pages/Administracion/RolesList.jsx`). Se añade un subcomponente `ModuloCard` declarado antes de `RolesList`. La lógica de guardado cambia de manual (botón "Guardar" por rol) a automática (clic = PUT inmediato con optimistic update y toast 2 s). El resto del componente —header con botón "Nuevo Rol", cards de resumen de roles, sección "Roles Personalizados" y ambos modales— se conserva sin cambios.

**Tech Stack:** React 19, Lucide React (iconos), inline styles con tokens CenthriX (`#0F1023`/`#151631`/`#1A1B3A`/`#252748`/`#E74C3C`), `adminService.actualizarRol()` (axios), `useNotification` hook (default export, usa `.error(msg)`).

---

## Estructura de archivos

| Archivo | Acción |
|---|---|
| `frontend/src/pages/Administracion/RolesList.jsx` | Única modificación — reemplazar imports, constantes, lógica de guardado y sección JSX de la tabla |

---

### Task 1: Actualizar imports y expandir constantes

**Files:**
- Modify: `frontend/src/pages/Administracion/RolesList.jsx` líneas 1-38

- [ ] **Step 1: Reemplazar el bloque de imports (líneas 1-11)**

Busca el bloque actual:
```js
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Save, Trash2, Users, RefreshCw, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import adminService from '../../api/admin.service';
import { useAuth } from '../../context/AuthContext';
```

Reemplázalo con:
```js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Users, RefreshCw, Lock,
  LayoutDashboard, Package, ClipboardList, BarChart3, Mail,
  UserCog, Shield, Activity, Settings, Truck, Bell, Car,
  MapPin, Wallet, Receipt, User, CheckCircle,
} from 'lucide-react';
import adminService from '../../api/admin.service';
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';
```

- [ ] **Step 2: Reemplazar MODULO_LABELS (líneas 16-27) con versión expandida**

Busca:
```js
const MODULO_LABELS = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  reportes: 'Reportes',
  auditoria: 'Completar Operación',
  usuarios: 'Usuarios',
  roles: 'Roles',
  configuracion: 'Configuración',
  notificaciones: 'Notificaciones',
};
```

Reemplaza con:
```js
const MODULO_LABELS = {
  dashboard:         'Dashboard',
  clientes:          'Clientes',
  inventario:        'Inventario',
  operaciones:       'Operaciones',
  reportes:          'Reportes',
  auditoria:         'Completar Operación',
  plantillas_email:  'Plantillas Email',
  usuarios:          'Usuarios',
  roles:             'Roles',
  configuracion:     'Configuración',
  configuracion_wms: 'Config. WMS',
  notificaciones:    'Notificaciones',
  vehiculos:         'Vehículos',
  viajes:            'Viajes',
  caja_menor:        'Caja Menor',
  movimientos:       'Movimientos',
  perfil:            'Perfil',
};
```

- [ ] **Step 3: Reemplazar ACCION_LABELS (líneas 29-38) con versión expandida**

Busca:
```js
const ACCION_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
  ajustar: 'Ajustar',
  cerrar: 'Cerrar',
  anular: 'Anular',
};
```

Reemplaza con:
```js
const ACCION_LABELS = {
  ver:             'Ver',
  crear:           'Crear',
  editar:          'Editar',
  eliminar:        'Eliminar',
  exportar:        'Exportar',
  importar:        'Importar',
  ajustar:         'Ajustar',
  cerrar:          'Cerrar',
  anular:          'Anular',
  aprobar:         'Aprobar',
  descargar:       'Descargar',
  alertas:         'Alertas',
  reenviar_correo: 'Reenviar correo',
};
```

- [ ] **Step 4: Añadir MODULO_ICONOS inmediatamente después de ACCION_LABELS**

Agrega este objeto justo después del bloque `ACCION_LABELS`:
```js
const MODULO_ICONOS = {
  dashboard:         LayoutDashboard,
  clientes:          Users,
  inventario:        Package,
  operaciones:       ClipboardList,
  reportes:          BarChart3,
  plantillas_email:  Mail,
  usuarios:          UserCog,
  roles:             Shield,
  auditoria:         Activity,
  configuracion:     Settings,
  configuracion_wms: Truck,
  notificaciones:    Bell,
  vehiculos:         Car,
  viajes:            MapPin,
  caja_menor:        Wallet,
  movimientos:       Receipt,
  perfil:            User,
};
```

- [ ] **Step 5: Verificar que el archivo compile sin errores**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Resultado esperado: sin errores en `RolesList.jsx` (puede haber warnings de otros archivos).

---

### Task 2: Actualizar estado y lógica de guardado

**Files:**
- Modify: `frontend/src/pages/Administracion/RolesList.jsx` — función `RolesList`, estado y handlers

Este task elimina `saving`, `expandedGroups`, `hasChanges`, `saveRolPermisos`, `toggleGroup` y añade `rolActivoId`, `guardando`, `toastVisible` con la función `guardarPermisos`.

- [ ] **Step 1: Reemplazar el bloque de estado de RolesList**

Busca (dentro del cuerpo de `const RolesList = () => {`):
```js
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosAgrupados, setPermisosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showNewRol, setShowNewRol] = useState(false);
  const [newRol, setNewRol] = useState({ nombre: '', codigo: '', descripcion: '', nivel_jerarquia: 50, color: '#6B7280' });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editPermisos, setEditPermisos] = useState({}); // { rolId: Set(permisoIds) }
```

Reemplaza con:
```js
  const { error: notifyError } = useNotification();

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosAgrupados, setPermisosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRol, setShowNewRol] = useState(false);
  const [newRol, setNewRol] = useState({ nombre: '', codigo: '', descripcion: '', nivel_jerarquia: 50, color: '#6B7280' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editPermisos, setEditPermisos] = useState({});   // { rolId: Set(permisoIds) }
  const [rolActivoId, setRolActivoId] = useState(null);   // ID del tab activo
  const [guardando, setGuardando] = useState(false);       // bloquea chips durante PUT
  const [toastVisible, setToastVisible] = useState(false); // toast "Guardado automáticamente"
  const toastTimerRef = useRef(null);
```

- [ ] **Step 2: Actualizar fetchData para asignar rolActivoId**

Busca dentro de `fetchData`:
```js
      // Expandir todos los grupos por defecto
      const groups = {};
      (permisosData.agrupados || []).forEach(function(g) { groups[g.modulo] = true; });
      setExpandedGroups(groups);
```

Reemplaza esas 3 líneas con:
```js
      setRolActivoId(prev => prev ?? (rolesData[0]?.id ?? null));
```

La línea `setRolActivoId(prev => prev ?? ...)` conserva el tab activo si ya había uno (por ejemplo, tras `fetchData` manual con el botón refresh), y asigna `roles[0].id` solo en la carga inicial.

- [ ] **Step 3: Eliminar la función toggleModuloCompleto completa (líneas 106-124)**

Busca y elimina todo este bloque:
```js
  const toggleModuloCompleto = (rolId, modulo) => {
    const moduloPermisos = permisos.filter(function(p) { return p.modulo === modulo; });
    const currentSet = editPermisos[rolId] || new Set();
    const allChecked = moduloPermisos.every(function(p) { return currentSet.has(p.id); });

    setEditPermisos(prev => {
      const updated = { ...prev };
      const set = new Set(updated[rolId] || []);
      moduloPermisos.forEach(function(p) {
        if (allChecked) {
          set.delete(p.id);
        } else {
          set.add(p.id);
        }
      });
      updated[rolId] = set;
      return updated;
    });
  };
```

- [ ] **Step 4: Eliminar hasChanges, saveRolPermisos y toggleGroup (líneas 126-174)**

Busca y elimina estos 3 bloques completos:
```js
  const hasChanges = (rolId) => {
    ...
  };

  const saveRolPermisos = async (rolId) => {
    ...
  };
```
y también:
```js
  const toggleGroup = (modulo) => {
    setExpandedGroups(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };
```

- [ ] **Step 5: Reemplazar togglePermiso (líneas 92-104) con la nueva función guardarPermisos y los dos handlers**

Busca:
```js
  const togglePermiso = (rolId, permisoId) => {
    setEditPermisos(prev => {
      const updated = { ...prev };
      const set = new Set(updated[rolId] || []);
      if (set.has(permisoId)) {
        set.delete(permisoId);
      } else {
        set.add(permisoId);
      }
      updated[rolId] = set;
      return updated;
    });
  };
```

Reemplaza con:
```js
  const guardarPermisos = useCallback(async (rolId, nuevoSet) => {
    const setAnterior = new Set(editPermisos[rolId] || []);
    setEditPermisos(prev => ({ ...prev, [rolId]: nuevoSet }));
    setGuardando(true);
    try {
      await adminService.actualizarRol(rolId, { permisos_ids: Array.from(nuevoSet) });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastVisible(true);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
    } catch {
      setEditPermisos(prev => ({ ...prev, [rolId]: setAnterior }));
      notifyError('Error al guardar los permisos');
    } finally {
      setGuardando(false);
    }
  }, [editPermisos, notifyError]);

  const handleToggleChip = useCallback((rolId, permisoId) => {
    const currentSet = editPermisos[rolId] || new Set();
    const nuevoSet = new Set(currentSet);
    if (nuevoSet.has(permisoId)) {
      nuevoSet.delete(permisoId);
    } else {
      nuevoSet.add(permisoId);
    }
    guardarPermisos(rolId, nuevoSet);
  }, [editPermisos, guardarPermisos]);

  const handleToggleMaestro = useCallback((rolId, moduloPermisos) => {
    const currentSet = editPermisos[rolId] || new Set();
    const todosActivos = moduloPermisos.every(p => currentSet.has(p.id));
    const nuevoSet = new Set(currentSet);
    moduloPermisos.forEach(p => {
      if (todosActivos) nuevoSet.delete(p.id);
      else nuevoSet.add(p.id);
    });
    guardarPermisos(rolId, nuevoSet);
  }, [editPermisos, guardarPermisos]);
```

- [ ] **Step 6: Verificar que el archivo no tiene referencias a funciones eliminadas**

```bash
grep -n "togglePermiso\|toggleModuloCompleto\|hasChanges\|saveRolPermisos\|toggleGroup\|expandedGroups\|setSaving\|saving" frontend/src/pages/Administracion/RolesList.jsx
```
Resultado esperado: 0 líneas (ninguna referencia a las funciones eliminadas).

---

### Task 3: Añadir subcomponente ModuloCard

**Files:**
- Modify: `frontend/src/pages/Administracion/RolesList.jsx` — añadir antes de `const RolesList`

- [ ] **Step 1: Insertar el componente ModuloCard antes de `const RolesList = () => {`**

Busca la línea exacta:
```js
const RolesList = () => {
```

Inserta **antes** de esa línea el siguiente bloque completo:
```js
const ModuloCard = ({ grupo, permisos, permisoSet, onToggleChip, onToggleMaestro, disabled }) => {
  const moduloPermisos = permisos.filter(p => p.modulo === grupo.modulo);
  const activosCount = moduloPermisos.filter(p => permisoSet.has(p.id)).length;
  const total = moduloPermisos.length;
  const todosActivos = total > 0 && activosCount === total;
  const Icono = MODULO_ICONOS[grupo.modulo] || Shield;

  return (
    <div style={{ background: '#151631', border: '1px solid #252748', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: '#1A1B3A', borderBottom: '1px solid #252748',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 11, color: '#F1F5F9' }}>
          <Icono style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
          {MODULO_LABELS[grupo.modulo] || grupo.modulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#64748B' }}>
            <span style={{ color: '#E74C3C', fontWeight: 700 }}>{activosCount}</span>/{total}
          </span>
          <button
            onClick={() => !disabled && onToggleMaestro(moduloPermisos)}
            disabled={disabled}
            title={todosActivos ? 'Desactivar todos' : 'Activar todos'}
            style={{
              width: 28, height: 15, borderRadius: 8, position: 'relative',
              flexShrink: 0, border: 'none', outline: 'none', padding: 0,
              background: todosActivos ? '#E74C3C' : '#334155',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: 2, width: 11, height: 11,
              borderRadius: '50%', background: '#fff',
              ...(todosActivos ? { right: 2 } : { left: 2 }),
            }} />
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {grupo.acciones.map(accion => {
          const permiso = moduloPermisos.find(p => p.accion === accion.accion);
          if (!permiso) return null;
          const activo = permisoSet.has(permiso.id);
          return (
            <button
              key={permiso.id}
              onClick={() => !disabled && onToggleChip(permiso.id)}
              disabled={disabled}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500,
                border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                ...(activo
                  ? { background: 'rgba(231,76,60,0.12)', color: '#E74C3C', borderColor: 'rgba(231,76,60,0.35)' }
                  : { background: '#1A1B3A', color: '#64748B', borderColor: '#252748' }
                ),
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: activo ? '#E74C3C' : '#64748B',
              }} />
              {ACCION_LABELS[accion.accion] || accion.accion}
            </button>
          );
        })}
      </div>
    </div>
  );
};

```

- [ ] **Step 2: Verificar que no hay error de sintaxis**

```bash
cd frontend && node --input-type=module < /dev/null; npx vite build --mode development 2>&1 | grep -i "error" | head -10
```

Si el comando anterior no funciona en Windows, usa:
```bash
cd frontend && npx eslint src/pages/Administracion/RolesList.jsx --max-warnings=0 2>&1 | head -20
```
Resultado esperado: 0 errores (puede haber warnings de otras reglas).

---

### Task 4: Reemplazar la sección JSX de la tabla por la nueva UI

**Files:**
- Modify: `frontend/src/pages/Administracion/RolesList.jsx` — sección JSX dentro de `return (...)`

- [ ] **Step 1: Localizar la sección que inicia con el comentario `{/* Matriz de Permisos */}`**

```bash
grep -n "Matriz de Permisos\|rolesMatriz\|overflow-x: auto" frontend/src/pages/Administracion/RolesList.jsx
```

La sección a reemplazar abarca desde `{/* Roles Cards (resumen) */}` hasta antes de `{/* Roles no sistema */}` y actualmente contiene:
- `const rolesMatriz = roles;` (línea ~185)
- div "Roles Cards" grid (líneas ~218-241)
- div "Matriz de Permisos" con `<table>` (líneas ~243-365)

**Solo se reemplaza el bloque de "Matriz de Permisos" (la tabla)**. Las Roles Cards y lo que viene después se conservan.

- [ ] **Step 2: Eliminar la variable `rolesMatriz` y la sección `{/* Matriz de Permisos */}` completa**

Busca y elimina:
```js
  // Todos los roles para la matriz de permisos
  const rolesMatriz = roles;
```
y también el bloque completo desde:
```jsx
      {/* Matriz de Permisos */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
```
hasta el `</div>` que cierra ese bloque (antes de `{/* Roles no sistema: delete option */}`).

- [ ] **Step 3: Insertar la nueva UI (tabs + cabecera + grid) en el lugar de la tabla eliminada**

Justo después del bloque de "Roles Cards" (el `</div>` que cierra el grid `grid-cols-2 md:grid-cols-4`) y antes de `{/* Roles no sistema: delete option */}`, añade:

```jsx
      {/* Nueva matriz: tabs de rol + grid de módulos */}
      {(() => {
        const rolActual = roles.find(r => r.id === rolActivoId);
        const esRolSistema = rolActual?.es_sistema === true;
        const chipDisabled = !canEditRol || esRolSistema || guardando;
        const permisoSet = editPermisos[rolActivoId] || new Set();

        return (
          <div style={{ background: '#0F1023', borderRadius: 12, padding: 16, fontFamily: "'Segoe UI', sans-serif" }}>

            {/* Tabs de rol */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #252748', marginBottom: 16, overflowX: 'auto' }}>
              {roles.map(rol => {
                const totalActivos = (editPermisos[rol.id] || new Set()).size;
                const esActivo = rolActivoId === rol.id;
                return (
                  <button
                    key={rol.id}
                    onClick={() => setRolActivoId(rol.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: '8px 8px 0 0',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      whiteSpace: 'nowrap', border: 'none', outline: 'none',
                      color: esActivo ? '#F1F5F9' : '#94A3B8',
                      background: esActivo ? '#1A1B3A' : 'transparent',
                      borderBottom: esActivo ? '2px solid #E74C3C' : '2px solid transparent',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: rol.color, flexShrink: 0 }} />
                    {rol.nombre}
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 8,
                      background: esActivo ? '#E74C3C' : '#1A1B3A',
                      color: esActivo ? '#fff' : '#64748B',
                    }}>
                      {totalActivos}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cabecera del rol activo */}
            {rolActual && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `${rolActual.color}22`,
                    color: rolActual.color,
                    border: `1px solid ${rolActual.color}55`,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: rolActual.color, display: 'inline-block' }} />
                    {rolActual.nombre}
                    {esRolSistema && <Lock style={{ width: 12, height: 12 }} />}
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>
                    {permisoSet.size} de {permisos.length} permisos activos
                  </span>
                  {toastVisible && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#2ECC71', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle style={{ width: 12, height: 12 }} />
                      Guardado automáticamente
                    </span>
                  )}
                </div>

                {/* Grid de módulos 2 columnas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {permisosAgrupados.map(grupo => (
                    <ModuloCard
                      key={grupo.modulo}
                      grupo={grupo}
                      permisos={permisos}
                      permisoSet={permisoSet}
                      onToggleChip={(permisoId) => handleToggleChip(rolActivoId, permisoId)}
                      onToggleMaestro={(moduloPerms) => handleToggleMaestro(rolActivoId, moduloPerms)}
                      disabled={chipDisabled}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}
```

- [ ] **Step 4: Verificar que el archivo cierra correctamente todos los tags JSX**

```bash
grep -c "return (" frontend/src/pages/Administracion/RolesList.jsx
```
Debe retornar al menos 2 (uno de ModuloCard y uno de RolesList).

```bash
grep -n "export default" frontend/src/pages/Administracion/RolesList.jsx
```
Debe aparecer `export default RolesList;` al final del archivo.

- [ ] **Step 5: Arrancar el servidor de desarrollo y probar manualmente**

```bash
cd frontend && npm run dev
```

**Prueba manual — checklist:**

1. Navegar a `/administracion` → tab "Roles y Permisos"
2. Verificar que aparecen tabs horizontales con el nombre de cada rol y el contador de permisos
3. Hacer clic en un tab distinto → se actualiza la cabecera y el grid
4. Hacer clic en un chip "off" → el chip cambia a activo (rojo) y aparece "Guardado automáticamente" por 2 segundos
5. Hacer clic en el toggle maestro de un módulo con todos activos → todos los chips del módulo se desactivan y se guarda
6. Hacer clic en el toggle maestro de un módulo con alguno inactivo → todos los chips se activan y se guarda
7. Navegar al tab "Administrador" → todos los chips visibles pero no clickeables (opacity 0.6, icono Lock en cabecera)
8. Verificar que el contador del tab se actualiza en tiempo real al activar/desactivar chips
9. Verificar que el modal "Nuevo Rol" y "Eliminar Rol" siguen funcionando
10. Verificar que las cards de resumen de roles en la parte superior siguen mostrándose

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Administracion/RolesList.jsx
git commit -m "feat: rediseño matriz de permisos con tabs por rol y auto-guardado"
```

---

## Notas de implementación

- `rolActivoId` se inicializa a `null` y se asigna a `roles[0].id` en el primer `fetchData`. Usar `prev => prev ?? newId` en `setRolActivoId` para no sobrescribir al hacer refresh manual.
- `guardando = true` bloquea todos los chips y toggles durante el PUT para evitar requests concurrentes.
- `toastTimerRef` limpia el timeout anterior antes de arrancar uno nuevo; así clicks rápidos consecutivos no dejan múltiples toasts.
- El tab Administrador usa `es_sistema` para detectar que es solo lectura. Si algún otro rol también tiene `es_sistema = true`, también quedará en modo solo lectura.
- Los inline styles usan los tokens exactos de CenthriX; no usar clases Tailwind en la nueva sección para mantener consistencia con el mockup aprobado.
