# Guía de Despliegue - ISTHO CRM

## Arquitectura de Producción

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Frontend      │       │    Backend        │       │   Base de Datos │
│   (Vercel)      │──────▶│   (Railway)       │──────▶│   MySQL         │
│                 │       │                   │       │   (Railway)     │
│  React + Vite   │  API  │  Express + Node   │       │                 │
│  istho.vercel   │       │  istho.railway    │       │  Servicio MySQL │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

---

## 1. Backend en Railway (API + Base de Datos)

### Paso 1: Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) e iniciar sesión con GitHub
2. Click en **"New Project"**
3. Seleccionar **"Deploy from GitHub repo"**
4. Autorizar acceso al repositorio `istho-crm-p`

### Paso 2: Agregar MySQL

1. En el proyecto de Railway, click en **"+ New"** → **"Database"** → **"MySQL"**
2. Railway creará automáticamente el servicio MySQL y generará las variables:
   - `MYSQL_URL` (la más importante - conexión completa)
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`

### Paso 3: Configurar el servicio del backend

1. Click en el servicio del backend (el que se conectó al repo)
2. Ir a **Settings**:
   - **Root Directory**: `server`  ← MUY IMPORTANTE
   - **Build Command**: se auto-detecta (`npm install`)
   - **Start Command**: `node server.js` (ya configurado en railway.json)
3. Ir a **Variables** y agregar:

```env
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Railway vincula MySQL automáticamente, pero verificar que exista:
MYSQL_URL=${{MySQL.MYSQL_URL}}

# JWT (GENERAR UNO SEGURO)
JWT_SECRET=<generar con: openssl rand -base64 64>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<tu email>
SMTP_PASS=<tu app password de Gmail>
EMAIL_FROM=ISTHO CRM <notificaciones@istho.com.co>

# CORS - URL del frontend en Vercel (actualizar después del deploy)
CORS_ORIGIN=https://tu-app.vercel.app

# Archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

### Paso 4: Obtener URL del backend

1. En el servicio del backend, ir a **Settings** → **Networking**
2. Click en **"Generate Domain"** para obtener una URL pública
3. La URL será algo como: `https://istho-crm-p-production.up.railway.app`
4. Copiar esta URL, la necesitas para el frontend

### Paso 5: Verificar deploy

1. Visitar `https://TU-URL.up.railway.app/health`
2. Debe responder con JSON: `{ "success": true, "database": "connected" }`

---

## 2. Frontend en Vercel

### Paso 1: Importar proyecto

1. Ir a [vercel.com](https://vercel.com) e iniciar sesión con GitHub
2. Click en **"Add New..."** → **"Project"**
3. Importar el repositorio `istho-crm-p`

### Paso 2: Configurar proyecto

1. **Framework Preset**: `Vite` (auto-detectado)
2. **Root Directory**: `frontend`  ← MUY IMPORTANTE
3. **Build Command**: `npm run build` (auto-detectado)
4. **Output Directory**: `dist` (auto-detectado)

### Paso 3: Variables de entorno

Agregar en **Environment Variables**:

```env
VITE_API_URL=https://TU-BACKEND.up.railway.app/api/v1
VITE_API_TIMEOUT=30000
VITE_APP_NAME=ISTHO CRM
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Sistema CRM Interno ISTHO S.A.S.
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Paso 4: Deploy

1. Click en **"Deploy"**
2. Vercel construirá y desplegará automáticamente
3. Obtener la URL (ej: `https://istho-crm.vercel.app`)

### Paso 5: Actualizar CORS en Railway

**IMPORTANTE**: Ahora que tienes la URL de Vercel, vuelve a Railway y actualiza:

```env
CORS_ORIGIN=https://istho-crm.vercel.app
```

Si necesitas múltiples orígenes (ej: dominio personalizado + vercel):
```env
CORS_ORIGIN=https://istho-crm.vercel.app,https://crm.istho.com.co
```

---

## 3. Post-Deploy

### Inicializar datos

La primera vez que el backend arranca, automáticamente:
- Sincroniza los modelos de la base de datos
- Crea los usuarios por defecto (admin, supervisor, operador)

Para los seeds de roles y permisos, conectarse al servicio en Railway:
```bash
# Usando Railway CLI
railway link
railway run node src/scripts/seedRolesPermisos.js
railway run node src/scripts/seedPlantillasEmail.js
```

### Dominio personalizado (opcional)

**Vercel (frontend)**:
1. Settings → Domains → Agregar `crm.istho.com.co`
2. Configurar DNS: CNAME `crm` → `cname.vercel-dns.com`

**Railway (backend)**:
1. Settings → Networking → Custom Domain → Agregar `api.crm.istho.com.co`
2. Configurar DNS: CNAME `api.crm` → la URL de Railway

Actualizar `CORS_ORIGIN` y `VITE_API_URL` con los dominios nuevos.

---

## 4. Checklist Final

- [ ] Backend desplegado en Railway
- [ ] MySQL funcionando en Railway
- [ ] Variables de entorno configuradas en Railway
- [ ] Health check respondiendo OK (`/health`)
- [ ] Frontend desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel (VITE_API_URL apunta a Railway)
- [ ] CORS_ORIGIN en Railway apunta a la URL de Vercel
- [ ] Seeds ejecutados (roles, permisos, plantillas email)
- [ ] Login funciona con usuario admin
- [ ] WebSocket conecta correctamente
- [ ] Cambiar contraseñas por defecto de los usuarios

---

## Troubleshooting

### El backend no conecta a MySQL
- Verificar que `MYSQL_URL` esté configurada en Railway
- Revisar logs en Railway → servicio → Deployments → View Logs

### CORS errors en el frontend
- Verificar que `CORS_ORIGIN` en Railway coincida exactamente con la URL de Vercel (sin trailing slash)
- Si usas dominio personalizado, agregar ambas URLs separadas por coma

### WebSocket no conecta
- La URL de Socket.io se deriva de `VITE_API_URL`. Verificar que el backend en Railway permita WebSocket (Railway lo soporta por defecto)

### Build falla en Vercel
- Verificar que el Root Directory sea `frontend`
- Revisar que Node.js >= 20 esté configurado en Vercel (Settings → General → Node.js Version)
