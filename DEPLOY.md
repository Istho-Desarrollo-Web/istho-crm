# Guía de Despliegue - ISTHO CRM (CenthriX)

## Arquitectura de Producción (actual)

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Frontend      │     │   App Runner       │     │   RDS MySQL 8.0 │
│   (Vercel)      │────▶│   (AWS us-west-2)  │────▶│   (AWS)         │
│                 │     │                    │ VPC │                 │
│  React + Vite   │ API │  Express + Node 22 │priv.│  istho-crm-db   │
│  istho-crm-six  │     │  ebsnqupa45.us-    │     │  db.t3.micro    │
│  .vercel.app    │     │  west-2.apprunner  │     │  20 GB gp2      │
└─────────────────┘     └────────┬───────────┘     └─────────────────┘
                                 │
                         ┌───────▼───────┐
                         │  S3 us-west-2  │
                         │ istho-crm-files│
                         │  (archivos,   │
                         │   avatares,   │
                         │   soportes)   │
                         └───────────────┘
```

Variables no-sensibles en `apprunner.yaml` (raíz del repo).
Variables sensibles (`DB_PASSWORD`, `JWT_SECRET`, `SMTP_PASS`) configuradas en la consola AWS.

---

## Costos mensuales estimados

| Servicio | Config | Costo/mes |
|---|---|---|
| AWS App Runner | 1 vCPU / 2 GB, 1 instancia | ~$14-15 |
| AWS RDS MySQL | db.t3.micro, 20 GB gp2, Single-AZ | ~$14.54 |
| AWS S3 | ~2-5 GB almacenamiento + requests | ~$0.10 |
| Vercel | Hobby plan (free) | $0 |
| Upstash Redis | Free tier (Socket.IO adapter) | $0 |
| SMTP Gmail | Cuenta corporativa (free) | $0 |
| **Total** | | **~$30/mes** (~COP 130.000) |

> **Año 1 (AWS Free Tier):** RDS t3.micro cubierto (750 hrs/mes gratis) → total ~$15/mes.

**Mayor oportunidad de ahorro:**
- RDS Reserved Instance 1 año: $12.24 → ~$7.20/mes (ahorra ~$60 USD/año)
- Bajar App Runner a 0.5 vCPU / 1 GB si la carga lo permite: ~$7/mes (ahorra ~$7/mes)

---

## 1. RDS MySQL 8.0

> Ya creado. Esta sección es referencia para recrear si fuera necesario.

En la consola AWS → RDS → **Create database**:

| Campo | Valor |
|---|---|
| Engine | MySQL 8.0.x |
| Template | Free tier o Production |
| Identifier | `istho-crm-db` |
| Master username | `istho_admin` |
| Instance | db.t3.micro |
| Storage | 20 GB GP2 |
| Public access | **NO** |
| Initial DB name | `istho_crm` |
| Región | us-west-2 |
| Security group | `istho-crm-rds-sg` (sin inbound rules inicialmente) |

Guardar el **Endpoint** resultante (`istho-crm-db.xxxx.us-west-2.rds.amazonaws.com`).

**Conectar SG del VPC connector a RDS:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-<RDS-SG-ID> \
  --protocol tcp --port 3306 \
  --source-group sg-<VPC-CONNECTOR-SG-ID> \
  --region us-west-2
```

---

## 2. App Runner

**Servicio activo:** `https://ebsnqupa45.us-west-2.awsapprunner.com`

### Configuración del servicio

| Campo | Valor |
|---|---|
| Source | GitHub → repo `istho-crm-p` → branch `main` |
| Runtime | Node.js 22 |
| Build command | `cd server && npm ci --omit=dev` |
| Start command | `node server/server.js` ← ver nota crítica abajo |
| Puerto | `8080` |
| vCPU | 1 |
| RAM | 2 GB |
| Región | us-west-2 |
| Auto-deploy | Activado (cada push a main) |

> **CRÍTICO — Start command en monorepo:** App Runner ejecuta el start command
> directamente sin shell — `cd server && node server.js` falla porque `cd`, `&&`
> y `node` se pasan como argumentos literales. Usar `node server/server.js` desde la raíz.
> El build command sí corre en shell, por eso `cd server && npm ci` funciona.

### Networking (VPC para RDS)

- Outbound: **Custom VPC** → VPC connector `istho-crm-vpc-connector`
- Subnets: excluir las no soportadas por App Runner en us-west-2
- El SG del conector necesita inbound rule 3306 en el SG de RDS

### Variables de entorno sensibles (consola AWS)

```
DB_HOST        = <endpoint RDS — solo hostname, sin protocolo ni puerto>
DB_NAME        = istho_crm
DB_USER        = istho_admin
DB_PASSWORD    = <contraseña RDS>
JWT_SECRET     = <openssl rand -base64 64>
CORS_ORIGIN    = https://istho-crm-six.vercel.app
APP_URL        = https://istho-crm-six.vercel.app
SMTP_HOST      = smtp.gmail.com
SMTP_PORT      = 587
SMTP_SECURE    = false
SMTP_USER      = liderti@istho.com.co
SMTP_PASS      = <app password Gmail>
EMAIL_FROM     = ISTHO CRM <notificaciones@istho.com.co>
AWS_S3_BUCKET  = istho-crm-files
AWS_REGION     = us-west-2
```

Variables no-sensibles (NODE_ENV, DB_PORT, pool, rate limit, etc.) ya están en `apprunner.yaml`.

> **IAM para S3:** En producción usar IAM Instance Role — NO poner `AWS_ACCESS_KEY_ID` /
> `AWS_SECRET_ACCESS_KEY` en variables de entorno. El rol del servicio App Runner debe tener
> una policy con `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` sobre `istho-crm-files`.

---

## 3. S3 — Almacenamiento de archivos

**Bucket:** `istho-crm-files` (us-west-2, privado)

### Estructura de carpetas

```
istho-crm-files/
├── avatares/          # fotos de perfil de usuarios
├── soportes/          # comprobantes de movimientos caja menor
├── evidencias/{id}/   # evidencias de operaciones WMS
├── averias/{id}/      # fotos de averías en operaciones
└── branding/          # logo-email.png (URL pública para emails)
```

### Acceso

- **Archivos privados:** presigned URLs con TTL de 15 minutos (generadas por `s3Service.js`)
- **Logo email:** URL pública S3 (`/branding/logo-email.png`)
- **Desarrollo local:** configurar `aws configure` o variables `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` en `.env` (nunca en producción)

### Subir logo de email

```bash
cd server
node scripts/subir-logo-email-s3.js
```

---

## 4. Frontend en Vercel

**Servicio activo:** `https://istho-crm-six.vercel.app`

### Configuración

| Campo | Valor |
|---|---|
| Root Directory | `frontend` ← NO `./frontend` |
| Framework | Vite (auto-detectado) |
| Node.js | 20+ |

### Variables de entorno en Vercel

```env
VITE_API_URL=https://ebsnqupa45.us-west-2.awsapprunner.com/api/v1
VITE_API_TIMEOUT=30000
VITE_APP_NAME=ISTHO CRM
VITE_APP_VERSION=1.0.0
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## 5. Redis — Socket.IO multi-instancia (opcional)

Redis permite que todas las instancias App Runner (si se escala a 2+) compartan el estado de Socket.IO.

**Proveedor recomendado:** [Upstash](https://upstash.com) — sin VPC, gratis hasta 10K req/día.

1. Crear cuenta en Upstash → New Database → Redis → us-west-2
2. Copiar la URL `rediss://default:<password>@<host>.upstash.io:6379`
3. Agregar en App Runner → Variables de entorno:
   ```
   REDIS_URL = rediss://default:<password>@<host>.upstash.io:6379
   ```
4. Redesplegar → logs mostrarán `[WS] Redis adapter configurado`

Sin `REDIS_URL` el servicio funciona en modo single-instance (comportamiento actual).

---

## 6. Post-Deploy — Checklist

### Primer deploy (base de datos nueva)
- [ ] Verificar `/health` → `"database": "connected"` (los primeros segundos puede decir `"connecting"`)
- [ ] Seeds se ejecutan automáticamente (roles, permisos, plantillas email, configuración WMS)
- [ ] Login con `admin` (password: valor de `SEED_PASSWORD_ADMIN` en variables de entorno)
- [ ] **Cambiar contraseñas de usuarios seed inmediatamente**

### Cada deploy (push a main)
- [ ] App Runner muestra "Running" en la consola
- [ ] `/health` responde 200
- [ ] Migraciones Umzug corren automáticamente — revisar logs si hay errores

### Verificar deploy
```bash
curl https://ebsnqupa45.us-west-2.awsapprunner.com/health
# { "success": true, "database": "connected" }
```

---

## 7. Troubleshooting

### 429 Too Many Requests
- Rate limiter usa userId del JWT como clave, no IP → cada usuario tiene su cuota independiente
- Límite: 500 req/15min por usuario (configurado en `apprunner.yaml`)
- Socket.IO (`/socket.io`) excluido del rate limiter

### DB no conecta (`database: "error"`)
- Verificar SG de RDS: inbound rule 3306 desde el SG del VPC connector
- `DB_HOST` debe ser el endpoint exacto de RDS (sin `http://` ni `:3306`)
- `"connecting"` los primeros segundos es normal

### CORS errors en el frontend
- `CORS_ORIGIN` debe coincidir exactamente con la URL de Vercel (sin `/` final)
- Múltiples orígenes: separar con coma sin espacios

### App Runner: deploy no arranca
- `JWT_SECRET debe tener al menos 32 caracteres` → falta la variable en App Runner
- `CORS_ORIGIN es requerido` → falta la variable en App Runner

### App Runner: `cd: too many arguments`
- **Causa:** Start command usa `cd server && node server.js` sin shell
- **Fix:** cambiar start command a `node server/server.js`

### App Runner: tablas no se crean (BD nueva)
- Verificar logs: debe aparecer `Ejecutando migración: 001_initial_schema`
- El glob de Umzug usa `path.join(__dirname, ...)` — ruta absoluta, no depende del CWD

### Vercel: build falla
- Root Directory debe ser `frontend` (sin `./`)
- Node.js >= 20 en Settings → General
- Imports case-sensitive: Linux distingue `Component.jsx` de `component.jsx`

### S3: error de acceso
- En producción: verificar que el IAM role del App Runner tenga policy para `istho-crm-files`
- En desarrollo local: verificar `aws configure` o variables `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- Presigned URLs expiran en 15 minutos — el frontend debe manejar 403 y recargar la URL

### WebSocket no conecta
- Verificar que `VITE_API_URL` apunte al App Runner correcto
- Socket.IO usa solo polling (no WebSocket) — funciona sin config adicional en App Runner
- En desarrollo: `serverUrl = undefined` → usa proxy Vite (correcto para transporte polling)
