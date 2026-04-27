# Guía de Despliegue - ISTHO CRM

## Arquitectura de Producción

### Opción A — Railway (actual)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Frontend      │       │    Backend        │       │   Base de Datos │
│   (Vercel)      │──────▶│   (Railway)       │──────▶│   MySQL         │
│                 │       │                   │       │   (Railway)     │
│  React + Vite   │  API  │  Express + Node   │       │                 │
│  istho.vercel   │       │  istho.railway    │       │  Servicio MySQL │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

### Opción B — AWS (activo)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Frontend      │       │   App Runner      │       │   RDS MySQL 8.0 │
│   (Vercel)      │──────▶│   (AWS)           │──────▶│   (AWS)         │
│                 │       │                   │  VPC  │                 │
│  React + Vite   │  API  │  Express + Node   │ priv. │  us-east-1      │
│  istho-crm-six  │       │  aw7pnktgbe.us-   │       │  istho-crm-db   │
│  .vercel.app    │       │  east-1.apprunner │       │                 │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

Variables no-sensibles en `apprunner.yaml` (raíz del repo). Variables sensibles
(`DB_PASSWORD`, `JWT_SECRET`, `SMTP_PASS`, `CLOUDINARY_*`) configuradas en la consola.

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

## 2. Backend en AWS App Runner + RDS MySQL

> Despliegue paralelo a Railway. Una vez verificado, actualizar `VITE_API_URL` en Vercel.

### Prerrequisitos

- AWS CLI instalada y configurada (`aws configure` con región `us-east-1`)
- Usuario IAM `istho-crm-deploy` con políticas: `AWSAppRunnerFullAccess`, `AmazonRDSFullAccess`, `AmazonVPCFullAccess`
- Generar JWT_SECRET: `openssl rand -base64 64`

### Paso 1: RDS MySQL 8.0

En la consola AWS → RDS → **Create database**:

| Campo | Valor |
|-------|-------|
| Engine | MySQL 8.0.x |
| Template | Production |
| Identifier | `istho-crm-db` |
| Master username | `istho_admin` |
| Instance | db.t3.micro |
| Storage | 20 GB GP2 |
| Public access | **NO** |
| Initial DB name | `istho_crm` |
| Security group | `istho-crm-rds-sg` (crear previamente, sin inbound rules) |

Guardar el **Endpoint** resultante (formato `istho-crm-db.xxxx.us-east-1.rds.amazonaws.com`).

### Paso 2: App Runner service

1. Ir a [console.aws.amazon.com/apprunner](https://console.aws.amazon.com/apprunner) → **Create service**
2. Source: **GitHub** → repo `istho-crm-p` → branch `main`
3. Configuration: **Configure todos los ajustes aquí** ← usar este modo, NO "usar archivo de configuración"
   - **Motivo**: el modo yaml no muestra la sección de variables de entorno durante la creación
4. **Tiempo de ejecución**: `Nodejs 22` (es el único Node.js disponible en us-east-1)
5. **Comando de compilación**: `cd server && npm ci --omit=dev`
6. **Comando de inicio**: `node server/server.js` ← CRÍTICO: ver nota abajo
7. **Puerto**: `8080`
8. Service name: `istho-crm-backend`
9. vCPU: 0.25 | Memory: 0.5 GB

> **CRÍTICO — Comando de inicio en monorepo:** App Runner ejecuta el start command
> directamente (sin shell), por lo que `cd server && node server.js` falla con
> `cd: too many arguments`. Usar `node server/server.js` desde la raíz del repo.
> El build command sí corre en shell, por eso `cd server && npm ci` funciona allí.

**Networking (VPC privado para RDS):**
- Outbound: **Custom VPC**
- Crear nuevo VPC connector: `istho-crm-vpc-connector`, VPC default
- Seleccionar subnets **excepto** `us-east-1e` / `use1-az3` (no soportada por App Runner)
- Guardar el Security Group ID del conector (`sg-...`)

**Conectar SG del conector a RDS:**
- Abrir `istho-crm-rds-sg` → Inbound rules → Add rule:
  - Type: MySQL/Aurora | Port: 3306 | Source: `sg-...` del VPC connector

```bash
# Alternativa vía AWS CLI
aws ec2 authorize-security-group-ingress \
  --group-id sg-<RDS-SG-ID> \
  --protocol tcp --port 3306 \
  --source-group sg-<VPC-CONNECTOR-SG-ID> \
  --region us-east-1
```

### Paso 3: Variables de entorno en App Runner

Configurar en **Variables de entorno de versión ejecutable** del servicio
(visibles en el paso "Configurar servicio" cuando se usa el modo consola):

```
DB_HOST               = <endpoint RDS sin protocolo ni puerto>
DB_NAME               = istho_crm
DB_USER               = istho_admin
DB_PASSWORD           = <contraseña RDS>
JWT_SECRET            = <openssl rand -base64 64>
CORS_ORIGIN           = https://istho-crm-six.vercel.app
APP_URL               = https://istho-crm-six.vercel.app
SMTP_HOST             = smtp.gmail.com
SMTP_PORT             = 587
SMTP_SECURE           = false
SMTP_USER             = <email>
SMTP_PASS             = <app password Gmail>
EMAIL_FROM            = ISTHO CRM <notificaciones@istho.com.co>
CLOUDINARY_CLOUD_NAME = dut7n03xd
CLOUDINARY_API_KEY    = <tuyo>
CLOUDINARY_API_SECRET = <tuyo>
UPLOAD_PATH           = ./uploads
```

Las variables no-sensibles (NODE_ENV, API_PREFIX, DB_PORT, pool, rate limit, JWT_EXPIRES_IN, etc.)
están en `apprunner.yaml` y no necesitan repetirse aquí.

### Paso 4: Verificar deploy

URL del servicio: `https://aw7pnktgbe.us-east-1.awsapprunner.com`

```bash
curl https://aw7pnktgbe.us-east-1.awsapprunner.com/health
# { "success": true, "database": "connected" }
```

El servidor arranca **antes** de que la DB esté lista (para no fallar el healthcheck de App Runner).
`"database": "connecting"` es normal los primeros segundos. Esperar hasta `"connected"`.

### Paso 5: Actualizar frontend

En Vercel → Variables de entorno:
```
VITE_API_URL=https://aw7pnktgbe.us-east-1.awsapprunner.com/api/v1
```

### Notas importantes App Runner

- `PORT` lo inyecta App Runner automáticamente (8080) — NO configurar manualmente
- `CORS_ORIGIN`: URL exacta de Vercel sin `/` final
- Auto-deploy activado: cada push a `main` dispara un nuevo deploy
- Las migraciones Umzug y los seeds se ejecutan automáticamente en cada startup
- Socket.io (WebSocket) funciona en App Runner sin configuración adicional
- El glob de Umzug usa `path.join(__dirname, 'src/migrations/*.js')` — si se cambia
  el entry point, el `__dirname` de `server.js` sigue apuntando correctamente a `server/src/migrations/`

---

## 3. Frontend en Vercel

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

## 4. Post-Deploy

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

## 5. Checklist Final

### Railway (Opción A)
- [x] Backend desplegado en Railway
- [x] MySQL funcionando en Railway
- [x] Variables de entorno configuradas en Railway
- [x] Health check respondiendo OK (`/health`)

### AWS App Runner + RDS (Opción B)
- [x] RDS MySQL 8.0 creado (`istho-crm-db`, sin acceso público)
- [x] VPC connector creado (`istho-crm-vpc-connector`, sin subnet us-east-1e)
- [x] Inbound rule 3306 en SG de RDS desde SG del VPC connector
- [x] App Runner service creado en modo consola con comandos correctos
- [x] Variables de entorno sensibles configuradas en App Runner
- [x] Health check respondiendo `"database": "connected"`

### Frontend (Vercel)
- [x] Frontend desplegado en Vercel
- [x] `VITE_API_URL` apunta al backend activo (App Runner)
- [x] `CORS_ORIGIN` en el backend apunta a la URL de Vercel (sin `/` final)

### Validación funcional
- [ ] Login funciona con usuario admin
- [ ] WebSocket conecta correctamente
- [ ] Cambiar contraseñas por defecto de los usuarios
- [ ] Seeds ejecutados (roles, permisos, plantillas email, configuración WMS)

---

## 6. Troubleshooting

### El backend no conecta a MySQL
- Verificar que `MYSQL_URL` esté configurada en Railway
- Revisar logs en Railway → servicio → Deployments → View Logs

### CORS errors en el frontend
- Verificar que `CORS_ORIGIN` en Railway coincida exactamente con la URL de Vercel (sin trailing slash)
- Si usas dominio personalizado, agregar ambas URLs separadas por coma

### WebSocket no conecta
- La URL de Socket.io se deriva de `VITE_API_URL`. Verificar que el backend en Railway/App Runner permita WebSocket (ambos lo soportan por defecto)

### App Runner: DB no conecta (`database: "error"`)
- Verificar que el Security Group de RDS tenga inbound rule 3306 desde el SG del VPC connector
- Verificar que `DB_HOST` sea el endpoint exacto de RDS (sin protocolo ni puerto)
- Verificar que `DB_PASSWORD` no tenga caracteres especiales sin escapar

### App Runner: deploy no arranca
- Revisar logs en App Runner → servicio → **Deployment logs**
- Error `JWT_SECRET debe tener al menos 32 caracteres`: falta la variable en App Runner
- Error `CORS_ORIGIN es requerido`: falta la variable en App Runner

### App Runner: `cd: too many arguments` en los logs de aplicación
- **Causa**: el start command usa `cd server && node server.js` pero App Runner lo ejecuta
  sin shell — `cd`, `&&` y `node` se pasan como argumentos literales a `cd`
- **Fix**: cambiar el comando de inicio a `node server/server.js` (ruta desde la raíz del repo)
- Ver logs en CloudWatch → `/aws/apprunner/<servicio>/application`

### App Runner: build falla con `Failed to execute 'build' command`
- Verificar en la pestaña **Configuración** que el Comando de compilación sea
  `cd server && npm ci --omit=dev` (el de inicio y el de compilación pueden quedar invertidos
  si se edita el servicio sin cuidado)
- El build command sí corre en shell; el start command NO

### App Runner: `no hay migraciones pendientes` en BD nueva (tablas no se crean)
- **Causa**: el glob de Umzug es relativo al CWD. Si el entry point es `node server/server.js`
  desde la raíz, el CWD es `/app` y `src/migrations/*.js` busca en `/app/src/` que no existe
- **Fix ya aplicado**: el glob usa `path.join(__dirname, 'src/migrations/*.js')` en `server.js`
- Si se replica este problema, verificar que el glob sea absoluto

### App Runner: `Table 'X' already exists` en migración initial-schema
- **Causa**: un arranque anterior falló a mitad y dejó algunas tablas creadas pero no todas
- **Fix ya aplicado**: la migración detecta el estado parcial, elimina las tablas huérfanas
  con `FOREIGN_KEY_CHECKS=0` y reconstruye el schema desde el baseline
- Es seguro en RDS nueva (sin datos reales)

### App Runner: advertencia `Error al recuperar la ACL web`
- Es una advertencia de WAF (Web Application Firewall) — no afecta el funcionamiento
- Para eliminarla: Configuración → Seguridad → quitar la Web ACL asociada

### Build falla en Vercel
- Verificar que el Root Directory sea `frontend` (no `./frontend`)
- Revisar que Node.js >= 20 esté configurado en Vercel (Settings → General → Node.js Version)
