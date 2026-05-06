# Servicios Externos — ISTHO CRM (CenthriX)

Todos los servicios que el sistema consume externamente, su propósito y variables de entorno asociadas.

---

## 1. AWS App Runner
**Tipo:** Plataforma de hosting administrado (PaaS)
**Región:** us-west-2 (Oregon)

Sirve el backend Express (API). Escala automáticamente según demanda. La base de datos MySQL corre en AWS RDS en la misma región, conectada vía VPC Connector.

| Recurso | Detalles |
|---------|----------|
| App Runner service | Backend Express + Node.js (API) |
| RDS MySQL 8.0 | `istho-crm-db` (db.t3.micro, sin acceso público) |

**Variables clave:**
```
PORT          # NO configurar — App Runner lo inyecta automáticamente (8080)
CORS_ORIGIN   # URL exacta de Vercel sin trailing slash (ej: https://istho-crm.vercel.app)
```

**Notas:**
- Start command desde la raíz: `node server/server.js` — App Runner no interpreta `cd server && node server.js`
- El RDS se conecta vía VPC Connector (red privada). Sin acceso público desde internet
- Para acceso externo al RDS (GitHub Actions, herramientas) usar el endpoint público del RDS con el SG correspondiente
- En producción: IAM Instance Role para S3 — NO configurar `AWS_ACCESS_KEY_ID` manualmente

---

## 2. Vercel
**Tipo:** Hosting frontend (CDN global)
**Plan:** Free

Sirve el build de React (`frontend/dist`) con CDN global. Configurado en `frontend/vercel.json`. Root dir en Vercel: `frontend` (sin `./`).

**Variable clave en App Runner:**
```
CORS_ORIGIN    # URL exacta de Vercel sin trailing slash (ej: https://istho-crm.vercel.app)
```

---

## 3. Amazon S3
**Tipo:** Almacenamiento de objetos en la nube
**Región:** us-west-2 (Oregon)
**Bucket:** `istho-crm-files`

Almacena todos los archivos subidos por usuarios. Las URLs son presigned (TTL 15 min) para garantizar acceso privado por usuario autenticado. Las imágenes de branding tienen URL pública directa.

| Carpeta | Contenido |
|---------|-----------|
| `avatares/` | Fotos de perfil de usuarios |
| `soportes/` | Documentos soporte de movimientos de caja menor |
| `evidencias/{id}/` | Fotos y PDFs de auditorías WMS |
| `averias/{id}/` | Fotos de daños en operaciones |
| `branding/` | Logo para firma de emails (`/branding/logo-email.png`, URL pública) |

**Variables:**
```
AWS_REGION            # us-west-2
AWS_S3_BUCKET         # istho-crm-files

# En producción (App Runner): IAM Instance Role — NO configurar claves en env
# En desarrollo (local):
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
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
DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME   # RDS MySQL (endpoint público)
B2_KEY_ID / B2_APP_KEY / B2_BUCKET                # Backblaze B2
CRM_API_URL                                        # URL backend + /api/v1
BACKUP_API_KEY                                     # Clave compartida con backend
RESEND_API_KEY / BACKUP_FROM_EMAIL / BACKUP_ALERT_EMAIL
```

**Variables App Runner (para disparar desde CRM):**
```
GITHUB_TOKEN_BACKUP    # PAT con scope workflow
GITHUB_REPO            # owner/repo (ej: gallego2022/istho-crm)
BACKUP_API_KEY         # Debe coincidir con el secret de GitHub
```

---

## 7. WMS CenthriX
**Tipo:** Sistema de Gestión de Almacenes (WMS) externo
**Integración:** Modelo dual PUSH + PULL

### Modo PUSH (WMS → CRM)
El WMS envía datos al CRM mediante webhook autenticado con `X-WMS-API-Key`. Mecanismo permanente.

| Endpoint | Descripción |
|----------|-------------|
| `POST /wms/sync/productos` | Sincronización de catálogo de SKUs |
| `POST /wms/sync/entradas` | Recepción (CO) → Operación + Cajas + Stock |
| `POST /wms/sync/salidas` | Picking (PK) → Operación + Cajas despachadas |
| `POST /wms/sync/kardex` | Ajuste (CR) → máquina de estados de cajas |

### Modo PULL (CRM consulta WMS)
El CRM consulta periódicamente la API del WMS y sincroniza las órdenes finalizadas.

- Intervalo configurable: `WMS_SYNC_INTERVAL` minutos (default 5)
- Solo procesa órdenes con `orderStatus.name === 'Finalizada'`
- Deduplicación por `wms_order_id` (UUID del WMS) + `documento_wms` (número de orden)
- Logs con tipo `polling_entrada` / `polling_salida` (sin payload — no re-ejecutables)
- Job: `server/src/jobs/wmsPollingJob.js`

La deduplicación cruzada PUSH↔PULL evita duplicados cuando ambos mecanismos están activos.

Ver especificación técnica en [WMS_API_SPEC.md](WMS_API_SPEC.md) y flujos en [FLUJOS_NEGOCIO.md](FLUJOS_NEGOCIO.md).

**Variables:**
```
WMS_API_KEY         # Clave que el WMS incluye en cada llamada PUSH (X-WMS-API-Key)
WMS_URL             # URL base del WMS (para PULL, ej: https://api.wms.istho.com.co)
WMS_EMAIL           # Usuario de integración WMS (para PULL)
WMS_PASSWORD        # Contraseña WMS (para PULL)
WMS_SYNC_INTERVAL   # Minutos entre polling (default: 5)
```

---

## Resumen de costos actuales

| Servicio | Plan | Costo aprox. |
|----------|------|--------------|
| AWS App Runner | Pay-per-use | ~$15–25 USD/mes |
| AWS RDS MySQL 8.0 | db.t3.micro | ~$15 USD/mes |
| Amazon S3 | Pay-per-use | ~$1 USD/mes |
| Vercel | Free | $0 |
| Resend | Free | $0 |
| Backblaze B2 | Free | $0 |
| GitHub Actions | Free | $0 |
| WMS CenthriX | Proveedor externo | N/A |
| **Total** | | **~$31–41 USD/mes** |
