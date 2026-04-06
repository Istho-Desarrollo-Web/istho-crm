# Servicios Externos — ISTHO CRM (CenthriX)

Todos los servicios que el sistema consume externamente, su propósito y variables de entorno asociadas.

---

## 1. Railway
**Tipo:** Plataforma de hosting (PaaS)
**Plan recomendado:** Pro ($20/mes) dado el volumen actual de producción

| Instancia | Uso |
|-----------|-----|
| Node.js service | Backend Express (API) |
| MySQL service | Base de datos principal |

**Variables clave:**
```
DATABASE_URL / MYSQL_URL     # Conexión interna Railway-a-Railway
MYSQL_PUBLIC_URL             # Conexión externa (GitHub Actions, herramientas externas)
PORT                         # Asignado automáticamente por Railway — NO configurar manualmente
```

**Notas:**
- El hostname interno (`mysql.railway.internal`) solo funciona dentro de la red privada de Railway.
- Para conexiones externas usar el proxy público (`shuttle.proxy.rlwy.net:XXXXX`).

---

## 2. Vercel
**Tipo:** Hosting frontend (CDN global)
**Plan:** Free

Sirve el build de React (`frontend/dist`) con CDN global. Configurado en `frontend/vercel.json`.

**Variable clave en Railway:**
```
CORS_ORIGIN    # URL exacta de Vercel sin trailing slash (ej: https://istho-crm.vercel.app)
```

---

## 3. Cloudinary
**Tipo:** Almacenamiento y CDN de archivos multimedia
**Plan:** Free (25GB almacenamiento, 25GB transferencia/mes)

Almacena todos los archivos subidos por usuarios. Si las variables no están configuradas, el sistema usa base64 como fallback.

| Carpeta | Contenido |
|---------|-----------|
| `avatares/` | Fotos de perfil de usuarios |
| `soportes/` | Documentos soporte de movimientos de caja menor |
| `evidencias/` | Fotos y PDFs de auditorías |
| `averias/` | Fotos de daños en operaciones |
| `branding/` | Logo para firma de emails |

**Variables:**
```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

---

## 4. Resend
**Tipo:** Servicio de envío de emails transaccionales
**Plan:** Free (3,000 emails/mes)

Usado para todos los correos salientes del sistema.

| Evento | Descripción |
|--------|-------------|
| Cierre de auditoría | Notifica a contactos del cliente con detalle de la operación |
| Credenciales de usuario | Envía usuario y contraseña temporal al crear un usuario |
| Reenvío de credenciales | Permite al admin reenviar accesos |
| Alerta de backup fallido | Notifica al admin cuando el backup nocturno falla |
| Reportes programados | Envía reportes en Excel/PDF por correo |

**Variables:**
```
RESEND_API_KEY
EMAIL_FROM              # Email remitente verificado en Resend (ej: crm@dominio.com)
```

**En GitHub Secrets (para alertas de backup):**
```
RESEND_API_KEY
BACKUP_FROM_EMAIL       # Email remitente verificado
BACKUP_ALERT_EMAIL      # Email destinatario de alertas
```

---

## 5. Backblaze B2
**Tipo:** Almacenamiento de objetos en la nube (Object Storage)
**Plan:** Free (10 GB almacenamiento, 1 GB descarga/día)

Almacena los backups diarios de la base de datos MySQL. Los archivos se retienen 30 días y se eliminan automáticamente.

**Bucket:** `istho-crm-backups`
**Formato de archivo:** `istho_crm_backup_YYYY-MM-DD_HH-MM.sql.gz`

**Variables (GitHub Secrets):**
```
B2_KEY_ID       # ID de la App Key de Backblaze
B2_APP_KEY      # Application Key de Backblaze
B2_BUCKET       # Nombre del bucket (istho-crm-backups)
```

---

## 6. GitHub Actions
**Tipo:** CI/CD y automatización de tareas
**Plan:** Free (2,000 min/mes en repos públicos; 500 min/mes en privados)

| Workflow | Archivo | Trigger |
|----------|---------|---------|
| Backup MySQL → Backblaze B2 | `.github/workflows/backup-mysql.yml` | Cron diario 2AM Colombia + `workflow_dispatch` |

El workflow de backup es disparado automáticamente cada noche o manualmente desde el panel de administración del CRM mediante la API de GitHub (`workflow_dispatch`).

**Variables (GitHub Secrets):**
```
DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME   # Railway MySQL (conexión pública)
B2_KEY_ID / B2_APP_KEY / B2_BUCKET                # Backblaze B2
CRM_API_URL                                        # URL backend + /api/v1
BACKUP_API_KEY                                     # Clave compartida con backend
RESEND_API_KEY / BACKUP_FROM_EMAIL / BACKUP_ALERT_EMAIL
```

**Variables Railway (para disparar desde CRM):**
```
GITHUB_TOKEN_BACKUP    # PAT con scope workflow
GITHUB_REPO            # owner/repo (ej: gallego2022/istho-crm)
BACKUP_API_KEY         # Debe coincidir con el secret de GitHub
```

---

## 7. WMS Centhrix
**Tipo:** Sistema de Gestión de Almacenes (WMS) externo
**Integración:** Webhook entrante — Copérnico envía datos al CRM

Copérnico sincroniza productos, entradas (CO), salidas (PK) y kardex (CR) mediante la API `/wms/sync/*` autenticada con `X-WMS-API-Key`.

Ver especificación completa en [WMS_API_SPEC.md](WMS_API_SPEC.md).

**Variable:**
```
WMS_API_KEY    # Clave que Copérnico incluye en cada llamada
```

---

## Resumen de costos actuales

| Servicio | Plan | Costo |
|----------|------|-------|
| Railway | Pro (recomendado) | ~$20 USD/mes |
| Vercel | Free | $0 |
| Cloudinary | Free | $0 |
| Resend | Free | $0 |
| Backblaze B2 | Free | $0 |
| GitHub Actions | Free | $0 |
| WMS Centhrix | Proveedor externo | N/A |
| **Total** | | **~$20 USD/mes** |
