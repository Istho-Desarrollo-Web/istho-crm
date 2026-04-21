# 2FA — Dispositivo Confiable ("Confiar en este navegador")

**Fecha:** 2026-04-21
**Estado:** Aprobado
**Proyecto:** CenthriX CRM — ISTHO S.A.S.

---

## Resumen

Agregar un checkbox "Confiar en este navegador" en la pantalla de verificación 2FA. Si el usuario lo marca, el backend genera un token de confianza (JWT firmado, 30 días) que se guarda en `localStorage`. En los siguientes logins desde ese navegador, el token se envía automáticamente y, si es válido, se salta la pantalla de verificación 2FA.

---

## Flujo completo

```
POST /auth/login (email + password + trusted_device_token?)
  └─ Usuario tiene 2FA habilitado?
       ├─ NO → completarLogin() directamente
       └─ SÍ → trusted_device_token presente y válido?
                ├─ SÍ → completarLogin() directamente (sin pantalla 2FA)
                └─ NO → devolver { requiere_2fa: true, temp_token }
                              └─ Usuario ingresa código
                                   └─ "Confiar en este navegador" marcado?
                                        ├─ SÍ → validar código → completarLogin()
                                        │        + devolver trusted_device_token
                                        └─ NO → validar código → completarLogin()
```

---

## Arquitectura

### Backend

**Archivo:** `server/src/controllers/authController.js`

#### Helpers nuevos

```js
// Genera JWT de confianza con scope 'trusted_device', expira en 30 días
const generarTokenDispositivoConfiable = (usuarioId) => {
  return jwt.sign(
    { id: usuarioId, scope: 'trusted_device' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Valida token de confianza: firma, scope y coincidencia de usuario
const validarTokenDispositivoConfiable = (token, usuarioId) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.scope === 'trusted_device' && payload.id === usuarioId;
  } catch {
    return false;
  }
};
```

#### Modificación: `login` (POST /auth/login)

Parámetro adicional opcional en el body: `trusted_device_token`.

Después de verificar email/password, si el usuario tiene 2FA habilitado:
1. Si `trusted_device_token` está presente → llamar `validarTokenDispositivoConfiable(token, usuario.id)`
2. Si válido → llamar `completarLogin()` directamente (sin devolver `requiere_2fa`)
3. Si inválido o ausente → flujo normal (devolver `requiere_2fa: true` con `temp_token`)

#### Modificación: `validarTotp` (POST /auth/2fa/validar)

Parámetro adicional opcional en el body: `recordar_dispositivo` (boolean).

Después de verificar el código TOTP con éxito:
1. Llamar `completarLogin()` como antes
2. Si `recordar_dispositivo === true` → generar `trusted_device_token` con `generarTokenDispositivoConfiable(usuario.id)`
3. Incluir `trusted_device_token` en la respuesta junto a `token` y `refreshToken`

#### Seguridad

- El scope `'trusted_device'` es distinto de `'totp_pending'` — no hay colisión
- Se verifica que `payload.id === usuario.id` — un token de otro usuario no funciona
- Si el usuario desactiva 2FA, el token de confianza queda huérfano e inofensivo (el backend nunca lo valida porque no requiere 2FA)
- El logout del cliente elimina el token de localStorage
- No se requiere tabla en BD ni migración

---

### Frontend

#### `frontend/src/api/auth.service.js`

**`login(email, password)`:**
- Antes de hacer el request, leer `localStorage.getItem('istho_trusted_device')`
- Incluirlo como `trusted_device_token` en el body si existe

**`validarTotp(temp_token, codigo, recordar_dispositivo)`:**
- Nuevo tercer parámetro `recordar_dispositivo` (boolean, default `false`)
- Incluirlo en el body del request

#### `frontend/src/pages/Auth/Login.jsx`

En la sección de verificación 2FA (`paso2FA === true`), agregar debajo del input del código:

```jsx
<label className="flex items-center gap-2 cursor-pointer select-none">
  <input
    type="checkbox"
    checked={recordarDispositivo}
    onChange={(e) => setRecordarDispositivo(e.target.checked)}
    className="..."
  />
  <span className="text-sm text-slate-400">Confiar en este navegador</span>
</label>
```

Estado local: `const [recordarDispositivo, setRecordarDispositivo] = useState(false)`

Al llamar `handleVerificar()`, pasar `recordarDispositivo` a `validarTotp()`.

#### `frontend/src/context/AuthContext.jsx`

**En la función que procesa la respuesta de `validarTotp`:**
```js
if (response.data?.trusted_device_token) {
  localStorage.setItem('istho_trusted_device', response.data.trusted_device_token);
}
```

**En `logout()`:**
```js
localStorage.removeItem('istho_trusted_device');
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `server/src/controllers/authController.js` | Helpers nuevos + modificar `login` y `validarTotp` |
| `frontend/src/api/auth.service.js` | Enviar `trusted_device_token` en login; `recordar_dispositivo` en validarTotp |
| `frontend/src/pages/Auth/Login.jsx` | Checkbox + estado `recordarDispositivo` |
| `frontend/src/context/AuthContext.jsx` | Guardar/limpiar `istho_trusted_device` en localStorage |

---

## Consideraciones de seguridad

- El token de confianza viaja en el **body** del POST, nunca en la URL
- Se firma con `JWT_SECRET` (≥ 32 chars, obligatorio por configuración existente)
- Expiración: 30 días (`'30d'` en jwt.sign)
- El navegador pierde la confianza si: el usuario hace logout, borra localStorage, o cambia de navegador
- No hay mecanismo de revocación administrativa (diseño intencional — Opción A aprobada)
