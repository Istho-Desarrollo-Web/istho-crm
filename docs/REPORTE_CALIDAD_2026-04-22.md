# Reporte de Calidad — CenthriX CRM
**Fecha:** 2026-04-22  
**Herramientas:** ESLint (frontend + backend), npm audit, Vite build  
**Commit base:** `2008566` (fix: adaptar matriz de permisos al modo claro)

---

## Resumen ejecutivo

| Área | Estado | Problemas |
|------|--------|-----------|
| Build frontend | ✅ OK | 0 errores de compilación |
| Vulnerabilidades frontend | ✅ OK | 0 vulnerabilidades |
| Vulnerabilidades backend | ⚠️ Moderado | 4 moderadas (fixables) |
| ESLint frontend | ❌ | 19 errores · 7 advertencias |
| ESLint backend | ❌ | 45 errores · 88 advertencias |
| Tests backend | ⚠️ | Existen pero sin env ESLint configurado |
| Tests frontend | ❌ | No existen |

---

## P0 — Crítico (bugs activos en producción)

### [FRONTEND] ClientesList.jsx: Hooks llamados condicionalmente

**Archivo:** `frontend/src/pages/Clientes/ClientesList.jsx:202–353`  
**Regla:** `react-hooks/rules-of-hooks`  
**Impacto:** Crash o comportamiento indefinido en React cuando un usuario con rol distinto de `cliente` accede a la lista de clientes.

**Causa:** El componente hace un `return <Navigate />` en la línea 196 si el usuario es de rol `cliente`. Inmediatamente después (líneas 202–353) se declaran todos los hooks del componente: `useNotification`, `useRef`, múltiples `useState`, `useClientes` y `useSort`. React exige que los hooks siempre se llamen en el mismo orden y nunca después de una condición o `return`. Esta violación es detectada por ESLint como 19 errores distintos.

```
ClientesList.jsx:195  if (user?.rol === 'cliente' && user?.cliente_id) {
ClientesList.jsx:196    return <Navigate to={...} replace />;  ← return temprano
ClientesList.jsx:202  }
ClientesList.jsx:202  const { ... } = useNotification();  ← HOOK DESPUÉS DEL RETURN
ClientesList.jsx:203  const fileInputRef = useRef(null);  ← HOOK DESPUÉS DEL RETURN
...
```

**Solución:** Mover el `return <Navigate />` al final del bloque de hooks, o reorganizar el componente en dos: uno que evalúa el rol y otro que tiene los hooks. Ejemplo mínimo:

```jsx
// Mover todos los hooks ANTES del return condicional
const { success: notifySuccess, ... } = useNotification();
const fileInputRef = useRef(null);
// ... resto de hooks ...
const { clientes, loading, ... } = useClientes(...);

// DESPUÉS de todos los hooks, el guard condicional
if (user?.rol === 'cliente' && user?.cliente_id) {
  return <Navigate to={`/clientes/${user.cliente_id}`} replace />;
}
```

---

## P1 — Alto

### [BACKEND] ESLint sin entorno Jest → 45 falsos errores en auth.test.js

**Archivo:** `server/src/tests/auth.test.js`  
**Regla:** `no-undef`  
**Impacto:** `npm run lint` falla con 45 errores sobre globales de Jest (`describe`, `test`, `expect`, `beforeAll`, `afterAll`). Bloquearía cualquier pipeline CI/CD.

**Causa:** El servidor tiene `jest` configurado en `package.json` pero **no tiene archivo `.eslintrc`**. Sin el archivo, ESLint no sabe que el código de tests corre en entorno Jest.

**Solución:** Crear `server/.eslintrc.json`:

```json
{
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "prefer-const": "warn"
  }
}
```

---

### [BACKEND] 4 vulnerabilidades moderadas — npm audit

**Paquete afectado:** `ajv@7–8.17.1` (ReDoS con opción `$data`)  
**Dependencia transitiva de:** `@rushstack/*` (herramientas de dev)  
**Impacto en producción:** Bajo (es una dependencia de build/dev), pero bloquea auditorías de seguridad.

**Solución:**

```bash
cd server && npm audit fix
```

---

## P2 — Medio

### [FRONTEND] AuthContext.jsx: useMemo con dependencias faltantes

**Archivo:** `frontend/src/context/AuthContext.jsx:651`  
**Regla:** `react-hooks/exhaustive-deps`  
**Problema:** `useMemo` no incluye `activar2FA` y `setup2FA` en su array de dependencias. Si esas funciones cambian de referencia (por re-renders del contexto), el valor memoizado quedará stale.

**Solución:** Agregar las dependencias faltantes al array, o usar `useCallback` para estabilizar las referencias de esas funciones antes de usarlas en el memo.

---

### [FRONTEND] Login.jsx: useEffect con dependencia faltante

**Archivo:** `frontend/src/pages/Auth/Login.jsx:160`  
**Regla:** `react-hooks/exhaustive-deps`  
**Problema:** `useEffect` depende de `getDestino` pero no lo declara. Puede ejecutarse con una versión stale de la función si el contexto cambia.

**Solución:** Añadir `getDestino` al array de dependencias del efecto, o envolver `getDestino` en `useCallback` para estabilizar su referencia.

---

### [FRONTEND] ClienteDetail.jsx: variable productosCliente sin usar

**Archivo:** `frontend/src/pages/Clientes/ClienteDetail.jsx:462`  
**Regla:** `no-unused-vars`  
**Problema:** `productosCliente` es asignado pero nunca leído. Indica una feature incompleta o código muerto.

**Acción:** Verificar si la funcionalidad era intencional. Si es código muerto, eliminar la declaración. Si es una feature pendiente, documentarlo.

---

## P3 — Bajo (limpieza de código)

### [FRONTEND] Importaciones no usadas

| Archivo | Símbolo | Acción |
|---------|---------|--------|
| `RolesList.jsx:10` | `React` (import) | Eliminar — React 19 no requiere import explícito en JSX |
| `DashboardSeguridad.jsx:19` | `AlertTriangle` | Eliminar o usar en el componente |
| `Login.jsx:85` | `location` | Eliminar la asignación |
| `Login.jsx:230` | `err` | Renombrar a `_err` o eliminar |

---

### [BACKEND] Variables `_` no usadas en controllers (88 warnings)

**Archivos con mayor cantidad:**

| Archivo | Ocurrencias |
|---------|-------------|
| `movimientoCajaMenorController.js` | 15 |
| `cajaMenorController.js` | 11 |
| `viajeController.js` | 18 |
| `vehiculoController.js` | 9 |
| `pdfService.js` | 8 |
| `excelService.js` | 2 |
| `operacionController.js` | 2 |

**Patrón común:** Destructuring de resultados Sequelize donde solo se usa el primer elemento:
```js
const [resultado, _] = await Modelo.findOrCreate(...);  // _ sin usar
```

**Solución masiva:** La regla ESLint ya permite `_` como prefijo, pero el nombre `_` solo no lo reconoce. Cambiar a `_creado`:
```js
const [resultado, _creado] = await Modelo.findOrCreate(...);
```

O añadir al `.eslintrc` del server: `"varsIgnorePattern": "^_"` (ya incluido en la solución P1 de arriba).

---

### [BACKEND] Importaciones no usadas en controllers

| Archivo | Símbolo |
|---------|---------|
| `adminController.js:11` | `bcrypt` |
| `adminController.js:13` | `forbidden` |
| `adminController.js:330` | `crypto` |
| `authController.js:18` | `totpGenerate` |
| `usuarioClienteController.js:15` | `crypto` |
| `usuarioClienteController.js:45` | `clienteId` |
| `usuarioClienteController.js:112` | `count` |
| `cajaMenorController.js:11` | `CajaMenor` → `Op` |
| `auditoriaWmsController.js:23` | `CajaInventario` |
| `reporteController.js:848` | `valorInventario` |
| `app.js:16` | `errorResponse` |
| `database.js:14` | `isProduction` |
| `wmsSyncService.js:736` | `detalle` |
| `reporteScheduler.js:11` | `Op` |

**Acción:** Eliminar cada import/variable no usado. Bajo riesgo, revisión manual archivo por archivo.

---

### [BACKEND] prefer-const

| Archivo | Variable |
|---------|---------|
| `clienteController.js:101` | `conteoPorCliente` — cambiar `let` → `const` |
| `reporteScheduler.js:14` | `scheduledJobs` — cambiar `let` → `const` |

---

## Estado de tests

### Backend
- **Archivo existente:** `server/src/tests/auth.test.js`
- **Ejecutar con:** `cd server && npm test`
- **Cobertura configurada:** controllers, services, middleware (excl. scripts y migraciones)
- **Problema activo:** Sin `.eslintrc`, lint falla en este archivo (ver P1 arriba)

### Frontend
- **Tests:** No existen
- **Recomendación:** Priorizar tests para flujos críticos: login, permisos, roles. Usar Vitest (ya compatiblie con Vite).

---

## Tamaños de bundle (referencia)

| Bundle | Tamaño | Gzip |
|--------|--------|------|
| React app principal | 425 KB | 133 KB |
| MUI components | 209 KB | 69 KB |
| index.esm (libs) | 66 KB | 23 KB |
| compressImage | 54 KB | 21 KB |
| ClienteDetail | 54 KB | 13 KB |
| SalidaAuditoria | 45 KB | 11 KB |

**Observación:** El bundle de React (`425KB / 133KB gzip`) está dentro del rango normal para un CRM con MUI. No requiere acción inmediata. Si crece más de 200KB gzip, considerar lazy loading adicional.

---

## Plan de acción recomendado

### Esta semana
1. **[P0] Corregir hooks condicionales en `ClientesList.jsx`** — bug real que puede causar crashes
2. **[P1] Crear `server/.eslintrc.json`** — habilita lint correcto en tests, desbloquea CI/CD

### Próxima semana
3. **[P1] `cd server && npm audit fix`** — cierra 4 vulnerabilidades moderadas
4. **[P2] Corregir `AuthContext.jsx` y `Login.jsx`** — dependencias de hooks faltantes

### Limpieza continua (PR de mantenimiento)
5. Eliminar imports no usados en frontend (4 archivos)
6. Eliminar variables no usadas en backend (por archivo, empezar por los de mayor cantidad)
7. Agregar `prefer-const` donde aplique

---

*Generado con ESLint, npm audit y Vite build. Próxima revisión sugerida: después de la corrección de P0 y P1.*
