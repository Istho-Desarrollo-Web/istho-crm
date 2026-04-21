# 2FA — Dispositivo Confiable ("Confiar en este navegador") — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un checkbox "Confiar en este navegador" en la pantalla de verificación 2FA que, al marcarse, genera un JWT de 30 días que se guarda en localStorage para saltar la pantalla 2FA en los siguientes logins desde ese navegador.

**Architecture:** El backend genera un JWT firmado con scope `'trusted_device'` al validar TOTP con `recordar_dispositivo: true`. En cada `POST /auth/login`, si el usuario tiene 2FA, se verifica primero si existe un `trusted_device_token` válido; si es así, se llama `completarLogin()` directamente. El token de confianza se guarda en `localStorage` como `istho_trusted_device` y se limpia en logout.

**Tech Stack:** Node.js/Express, jsonwebtoken, React 19, localStorage

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `server/src/controllers/authController.js` | Agregar 2 helpers + modificar `login` + modificar `validarTotp` |
| `frontend/src/api/auth.service.js` | Enviar `trusted_device_token` en `login`; agregar `recordar_dispositivo` en `validarTotp`; limpiar en `logout` |
| `frontend/src/context/AuthContext.jsx` | Guardar/limpiar `istho_trusted_device`; pasar `recordar_dispositivo` a `validarTotp` |
| `frontend/src/pages/Auth/Login.jsx` | Estado `recordarDispositivo` + checkbox UI |

---

## Task 1: Backend — helpers y modificar `login`

**Files:**
- Modify: `server/src/controllers/authController.js`

### Contexto

El archivo `authController.js` tiene:
- `generarBackupCodes` en la línea ~140 — agregar los helpers justo debajo
- `login` en línea ~213: la verificación de 2FA está en la línea ~268 (`if (usuario.totp_habilitado && usuario.totp_secret)`)
- `jwtConfig` ya importado. `jwt` ya importado. Las funciones helper deben ir antes de `completarLogin`.

La clave de `jwtConfig` es `jwtConfig.secret`. El issuer y audience son `jwtConfig.issuer` y `jwtConfig.audience`.

### Pasos

- [ ] **Step 1: Agregar los dos helpers después de `generarBackupCodes`**

Busca la función `generarBackupCodes` (línea ~140). Debajo de su cierre (`};`) agrega:

```js
/**
 * Genera JWT de confianza para dispositivo (30 días).
 * scope: 'trusted_device'
 */
const generarTokenDispositivoConfiable = (usuarioId) => {
  return jwt.sign(
    { id: usuarioId, scope: 'trusted_device' },
    jwtConfig.secret,
    { expiresIn: '30d', issuer: jwtConfig.issuer, audience: jwtConfig.audience }
  );
};

/**
 * Valida token de confianza: firma, scope y coincidencia de usuario.
 * Retorna true si es válido, false en cualquier otro caso.
 */
const validarTokenDispositivoConfiable = (token, usuarioId) => {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
    return payload.scope === 'trusted_device' && payload.id === usuarioId;
  } catch {
    return false;
  }
};
```

- [ ] **Step 2: Modificar `login` para aceptar y validar `trusted_device_token`**

Dentro de la función `login`, busca la línea:
```js
const { email, password } = req.body;
```
Cámbiala a:
```js
const { email, password, trusted_device_token } = req.body;
```

Luego busca el bloque que comienza con:
```js
// Login exitoso — verificar si tiene 2FA habilitado
if (usuario.totp_habilitado && usuario.totp_secret) {
```

Reemplaza todo ese bloque (hasta el `}` que lo cierra, antes de `await completarLogin(...)`) con:

```js
// Login exitoso — verificar si tiene 2FA habilitado
if (usuario.totp_habilitado && usuario.totp_secret) {
  // Verificar si el dispositivo ya es de confianza
  if (trusted_device_token && validarTokenDispositivoConfiable(trusted_device_token, usuario.id)) {
    logger.info('Login con dispositivo confiable (2FA omitido):', { userId: usuario.id });
    return await completarLogin(usuario, req, res);
  }

  // Emitir token temporal de 5 minutos para el paso de TOTP
  const tempToken = jwt.sign(
    { id: usuario.id, scope: 'totp_pending' },
    jwtConfig.secret,
    { expiresIn: '5m', issuer: jwtConfig.issuer, audience: jwtConfig.audience }
  );

  logger.info('Login paso 1 (2FA requerido):', { userId: usuario.id });

  return successMessage(res, 'Se requiere verificación de dos factores', {
    requiere_2fa: true,
    temp_token: tempToken,
    usuario_nombre: usuario.getNombreDisplay()
  });
}
```

- [ ] **Step 3: Verificar manualmente que no hay errores de sintaxis**

Ejecuta:
```bash
cd server && node -e "require('./src/controllers/authController')" && echo "OK"
```
Esperado: `OK` sin errores.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/authController.js
git commit -m "feat(auth): helpers de dispositivo confiable y validación en login"
```

---

## Task 2: Backend — modificar `validarTotp` para emitir `trusted_device_token`

**Files:**
- Modify: `server/src/controllers/authController.js`

### Contexto

`validarTotp` está en la línea ~986. La línea clave es:
```js
return await completarLogin(usuario, req, res);
```
Esta línea aparece una vez al final (línea ~1043). `completarLogin` usa `res` internamente para devolver la respuesta, por lo que no podemos simplemente capturar su retorno. Necesitamos interceptar la respuesta o cambiar el enfoque.

**Estrategia:** Modificar `completarLogin` para que acepte un parámetro `extra` que se mezcla en el `data` de la respuesta. Así `trusted_device_token` se incluye en el body de respuesta existente sin duplicar lógica.

- [ ] **Step 1: Agregar parámetro `extra` a `completarLogin`**

Busca la función `completarLogin` (línea ~150). La firma es:
```js
const completarLogin = async (usuario, req, res) => {
```
Cámbiala a:
```js
const completarLogin = async (usuario, req, res, extra = {}) => {
```

Luego busca la llamada a `successMessage` al final de `completarLogin`:
```js
return successMessage(res, 'Inicio de sesión exitoso', {
  user: userData,
  token,
  refreshToken: refreshTokenJwt,
  expiresIn: jwtConfig.expiresIn,
  refreshExpiresIn: jwtConfig.refreshExpiresIn
});
```
Cámbiala a:
```js
return successMessage(res, 'Inicio de sesión exitoso', {
  user: userData,
  token,
  refreshToken: refreshTokenJwt,
  expiresIn: jwtConfig.expiresIn,
  refreshExpiresIn: jwtConfig.refreshExpiresIn,
  ...extra,
});
```

- [ ] **Step 2: Modificar `validarTotp` para leer `recordar_dispositivo` y pasar el token**

Busca la línea:
```js
const { temp_token, codigo } = req.body;
```
Cámbiala a:
```js
const { temp_token, codigo, recordar_dispositivo } = req.body;
```

Busca la línea al final de `validarTotp`:
```js
return await completarLogin(usuario, req, res);
```
Cámbiala a:
```js
const extra = {};
if (recordar_dispositivo) {
  extra.trusted_device_token = generarTokenDispositivoConfiable(usuario.id);
}
return await completarLogin(usuario, req, res, extra);
```

- [ ] **Step 3: Verificar que no hay errores de sintaxis**

```bash
cd server && node -e "require('./src/controllers/authController')" && echo "OK"
```
Esperado: `OK`

- [ ] **Step 4: Prueba manual con curl**

Primero obtén un `temp_token` haciendo login con un usuario que tenga 2FA habilitado:
```bash
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@istho.com","password":"tu_password"}' | jq .
```
Si devuelve `requiere_2fa: true`, copia el `temp_token`.

Luego valida con `recordar_dispositivo: true` (usa el código real de tu autenticador):
```bash
curl -s -X POST http://localhost:5000/api/v1/auth/2fa/validar \
  -H "Content-Type: application/json" \
  -d '{"temp_token":"TOKEN_AQUI","codigo":"123456","recordar_dispositivo":true}' | jq .
```
Esperado: respuesta con `trusted_device_token` en `data`.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/authController.js
git commit -m "feat(auth): emitir trusted_device_token en validarTotp cuando recordar_dispositivo=true"
```

---

## Task 3: Frontend — auth.service.js y AuthContext.jsx

**Files:**
- Modify: `frontend/src/api/auth.service.js`
- Modify: `frontend/src/context/AuthContext.jsx`

### Contexto

**`auth.service.js`:**
- `login` (línea ~42): recibe `credentials` y hace POST. Debe agregar `trusted_device_token` del localStorage al body.
- `validarTotp` (línea ~349): recibe `{ temp_token, codigo }`. Debe aceptar `recordar_dispositivo` y guardarlo en localStorage si la respuesta lo trae.
- `logout` (línea ~89): debe limpiar `istho_trusted_device` del localStorage.

**`AuthContext.jsx`:**
- `validarTotp` (línea ~342): `useCallback` que llama a `authService.validarTotp`. Debe aceptar tercer parámetro `recordar_dispositivo` y pasarlo al servicio.

La clave de localStorage: `istho_trusted_device` (sin ID de usuario — el backend valida que coincida con el usuario).

### Pasos

- [ ] **Step 1: Modificar `auth.service.js` — función `login`**

Busca:
```js
login: async (credentials) => {
  try {
    const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, credentials);
```
Cámbiala a:
```js
login: async (credentials) => {
  try {
    const trusted_device_token = localStorage.getItem('istho_trusted_device');
    const body = trusted_device_token
      ? { ...credentials, trusted_device_token }
      : credentials;
    const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, body);
```

- [ ] **Step 2: Modificar `auth.service.js` — función `validarTotp`**

Busca:
```js
validarTotp: async ({ temp_token, codigo }) => {
  try {
    const response = await apiClient.post(AUTH_ENDPOINTS.TOTP_VALIDAR, { temp_token, codigo });
    if (response.success) {
      const { token, refreshToken, user } = response.data;
      setAuthToken(token, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { success: true, data: response.data };
    }
    return { success: false, message: response.message, code: response.code };
  } catch (error) {
    return { success: false, message: error.message, code: error.code || 'TOTP_ERROR' };
  }
},
```
Reemplázala con:
```js
validarTotp: async ({ temp_token, codigo, recordar_dispositivo = false }) => {
  try {
    const response = await apiClient.post(AUTH_ENDPOINTS.TOTP_VALIDAR, {
      temp_token,
      codigo,
      recordar_dispositivo,
    });
    if (response.success) {
      const { token, refreshToken, user, trusted_device_token } = response.data;
      setAuthToken(token, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (trusted_device_token) {
        localStorage.setItem('istho_trusted_device', trusted_device_token);
      }
      return { success: true, data: response.data };
    }
    return { success: false, message: response.message, code: response.code };
  } catch (error) {
    return { success: false, message: error.message, code: error.code || 'TOTP_ERROR' };
  }
},
```

- [ ] **Step 3: Modificar `auth.service.js` — función `logout`**

Busca dentro de `logout`:
```js
clearAuthToken();
localStorage.removeItem(USER_KEY);
```
Cámbiala a:
```js
clearAuthToken();
localStorage.removeItem(USER_KEY);
localStorage.removeItem('istho_trusted_device');
```

- [ ] **Step 4: Modificar `AuthContext.jsx` — función `validarTotp`**

Busca:
```js
const validarTotp = useCallback(async (temp_token, codigo) => {
  setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
    const result = await authService.validarTotp({ temp_token, codigo });
```
Cámbiala a:
```js
const validarTotp = useCallback(async (temp_token, codigo, recordar_dispositivo = false) => {
  setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
    const result = await authService.validarTotp({ temp_token, codigo, recordar_dispositivo });
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/auth.service.js frontend/src/context/AuthContext.jsx
git commit -m "feat(auth): enviar y guardar trusted_device_token en servicio y contexto"
```

---

## Task 4: Frontend — checkbox en Login.jsx

**Files:**
- Modify: `frontend/src/pages/Auth/Login.jsx`

### Contexto

La pantalla de 2FA está en la función `LoginPage`, dentro del bloque `if (paso2FA)` (línea ~267-339).

- Estado 2FA: `const [paso2FA, setPaso2FA] = useState(null)` (línea ~93)
- Handler submit: `onSubmit2FA` (línea ~171), llama `validarTotp(paso2FA.temp_token, codigoTotp.replace(...))`
- La llamada actual NO pasa `recordar_dispositivo`

El checkbox va entre el input del código y el botón "Verificar".

### Pasos

- [ ] **Step 1: Agregar estado `recordarDispositivo`**

Busca el bloque de estados de 2FA (línea ~92-96):
```js
const [paso2FA, setPaso2FA] = useState(null); // { temp_token, usuario_nombre }
const [codigoTotp, setCodigoTotp] = useState('');
const [error2FA, setError2FA] = useState(null);
const [submitting2FA, setSubmitting2FA] = useState(false);
```
Agrégale una línea al final:
```js
const [paso2FA, setPaso2FA] = useState(null); // { temp_token, usuario_nombre }
const [codigoTotp, setCodigoTotp] = useState('');
const [error2FA, setError2FA] = useState(null);
const [submitting2FA, setSubmitting2FA] = useState(false);
const [recordarDispositivo, setRecordarDispositivo] = useState(false);
```

- [ ] **Step 2: Pasar `recordarDispositivo` a `validarTotp` en `onSubmit2FA`**

Busca en `onSubmit2FA`:
```js
const result = await validarTotp(paso2FA.temp_token, codigoTotp.replace(/\s/g, ''));
```
Cámbiala a:
```js
const result = await validarTotp(paso2FA.temp_token, codigoTotp.replace(/\s/g, ''), recordarDispositivo);
```

- [ ] **Step 3: Agregar el checkbox en el JSX**

Busca dentro del formulario 2FA (`<form onSubmit={onSubmit2FA} ...>`), la etiqueta de cierre `</div>` del input del código (justo antes del botón "Verificar"):

```jsx
                        </div>

                        <button
                            type="submit"
```

Inserta el checkbox entre el `</div>` y el `<button>`:

```jsx
                        </div>

                        {/* Checkbox confiar en este navegador */}
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={recordarDispositivo}
                                onChange={(e) => setRecordarDispositivo(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-[#E74C3C] focus:ring-[#E74C3C]/30 accent-[#E74C3C] cursor-pointer"
                            />
                            <span className="text-sm text-gray-500 dark:text-slate-400">
                                Confiar en este navegador
                            </span>
                        </label>

                        <button
                            type="submit"
```

- [ ] **Step 4: Resetear `recordarDispositivo` al volver al login**

Busca el botón "Volver al inicio de sesión":
```js
onClick={() => { setPaso2FA(null); setCodigoTotp(''); setError2FA(null); }}
```
Cámbialo a:
```js
onClick={() => { setPaso2FA(null); setCodigoTotp(''); setError2FA(null); setRecordarDispositivo(false); }}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Esperado: `✓ built in` sin errores TypeScript/JSX.

- [ ] **Step 6: Prueba manual en navegador**

1. Inicia servidor: `cd server && npm run dev`
2. Inicia frontend: `cd frontend && npm run dev`
3. Abre `http://localhost:5173`
4. Haz login con un usuario que tenga 2FA habilitado
5. Verifica que aparece el checkbox "Confiar en este navegador" debajo del input del código
6. Marca el checkbox, ingresa el código TOTP correcto y haz clic en "Verificar"
7. Abre DevTools → Application → LocalStorage → verifica que existe `istho_trusted_device`
8. Cierra la pestaña y vuelve a `http://localhost:5173`
9. Haz login con las mismas credenciales → debe entrar directo **sin** pedir el código 2FA
10. Haz logout → verifica en LocalStorage que `istho_trusted_device` fue eliminado
11. Haz login de nuevo → debe pedir el código 2FA otra vez

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Auth/Login.jsx
git commit -m "feat(auth): checkbox 'Confiar en este navegador' en pantalla 2FA"
```
