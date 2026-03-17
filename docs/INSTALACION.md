# Guía de Instalación y Configuración - ISTHO CRM

## Requisitos Previos

| Software | Versión Mínima | Descripción |
|----------|---------------|-------------|
| **Node.js** | 18.x | Runtime JavaScript |
| **npm** | 9.x | Gestor de paquetes |
| **MySQL** | 8.0 | Base de datos (vía XAMPP o standalone) |
| **XAMPP** | 8.x | (Opcional) Para desarrollo local con MySQL |
| **Git** | 2.x | Control de versiones |

## Instalación Local

### 1. Clonar el Repositorio

```bash
git clone <repo-url>
cd istho-crm
```

### 2. Instalar Dependencias

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configurar Variables de Entorno

Crear archivo `server/.env` basado en la siguiente plantilla:

```env
# ============================================
# BASE DE DATOS
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_NAME=istho_crm
DB_USER=root
DB_PASSWORD=
# Para Railway producción:
# DB_HOST=containers-us-west-xxx.railway.app
# DB_PORT=3306
# DB_NAME=railway
# DB_USER=root
# DB_PASSWORD=<password>

# ============================================
# JWT (JSON Web Tokens)
# ============================================
JWT_SECRET=tu_clave_secreta_segura_aqui_min_32_caracteres
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=2592000
JWT_ISSUER=istho-crm
JWT_AUDIENCE=web

# ============================================
# SERVIDOR
# ============================================
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1

# ============================================
# CORS
# ============================================
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# ============================================
# WMS API
# ============================================
WMS_API_KEY=tu_api_key_wms_aqui

# ============================================
# EMAIL (SMTP)
# ============================================
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
EMAIL_FROM=ISTHO CRM <noreply@istho.com>

# Ethereal (desarrollo - emails de prueba)
# SMTP_HOST=smtp.ethereal.email
# SMTP_PORT=587
# SMTP_USER=ethereal_user
# SMTP_PASSWORD=ethereal_password

# ============================================
# UPLOADS
# ============================================
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
```

### 4. Crear la Base de Datos

**Opción A: XAMPP**
1. Iniciar XAMPP y activar MySQL
2. Abrir phpMyAdmin (`http://localhost/phpmyadmin`)
3. Crear base de datos `istho_crm` con cotejamiento `utf8mb4_unicode_ci`

**Opción B: Línea de comandos**
```sql
CREATE DATABASE istho_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Sincronizar Modelos (Auto-migración)

El servidor sincroniza automáticamente los modelos Sequelize al iniciar. En desarrollo usa `alter: true` para actualizar tablas sin perder datos.

```bash
cd server
npm run dev
```

Al iniciar por primera vez, Sequelize creará todas las tablas automáticamente.

### 6. Ejecutar Seeds (Datos Iniciales)

```bash
cd server

# Crear roles y permisos base (obligatorio)
node src/scripts/seedRolesPermisos.js

# Crear plantillas de email predeterminadas
node src/scripts/seedPlantillasEmail.js
```

**Roles creados:**
| Rol | Nivel | Color |
|-----|-------|-------|
| admin | 100 | Rojo |
| supervisor | 75 | Azul |
| operador | 50 | Verde |
| cliente | 10 | Gris |

**Permisos creados:** 42+ permisos en 10 módulos (dashboard, clientes, inventario, operaciones, reportes, usuarios, roles, auditoria, kardex, configuracion, notificaciones, despachos)

### 7. Crear Usuario Admin Inicial

El primer usuario debe crearse manualmente en la base de datos o mediante un script:

```bash
# Opción 1: Usar el endpoint de registro (requiere un admin existente)
# Opción 2: Insertar directamente en la base de datos

# Ejecutar en MySQL:
INSERT INTO usuarios (username, email, password_hash, nombre, apellido, nombre_completo, rol, rol_id, activo, created_at, updated_at)
VALUES ('admin', 'admin@istho.com', '$2a$12$...hash...', 'Admin', 'ISTHO', 'Admin ISTHO', 'admin', 1, 1, NOW(), NOW());
```

> **Nota:** El `password_hash` debe generarse con bcryptjs (12 salt rounds).

### 8. Iniciar en Desarrollo

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Servidor en http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Aplicación en http://localhost:5173
```

El frontend tiene un proxy configurado en `vite.config.js` que redirige `/api` a `http://localhost:5000`.

---

## Configuración de Producción (Railway)

### 1. Variables de Entorno en Railway

Configurar todas las variables del `.env` en el dashboard de Railway, con los valores de producción:

```env
NODE_ENV=production
DB_HOST=<railway-mysql-host>
DB_PORT=<railway-mysql-port>
DB_NAME=railway
DB_USER=root
DB_PASSWORD=<railway-password>
JWT_SECRET=<clave-segura-produccion>
CORS_ORIGIN=https://tu-dominio.com
```

### 2. Build del Frontend

```bash
cd frontend
npm run build
# Genera carpeta dist/ con la aplicación optimizada
```

### 3. Configuración SSL

En producción (Railway), la conexión a MySQL usa SSL automáticamente:

```javascript
// database.js detecta NODE_ENV=production
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

### 4. Start Command

```bash
# Railway detecta automáticamente:
npm start
# Equivale a: node server.js
```

---

## Configuración de Email

### Gmail (Producción)

1. Activar verificación en 2 pasos en la cuenta de Gmail
2. Generar "Contraseña de aplicación" en: `Configuración > Seguridad > Contraseñas de aplicaciones`
3. Usar la contraseña generada como `SMTP_PASSWORD`

### Ethereal (Desarrollo)

En modo desarrollo, si no se configuran credenciales SMTP, el sistema usa Ethereal (servicio de email de prueba de Nodemailer). Los emails se pueden ver en `https://ethereal.email` con las credenciales generadas.

---

## Configuración de Multer (Uploads)

| Tipo | Directorio | Límite | Formatos |
|------|-----------|--------|----------|
| Logos | `server/uploads/logos/` | 5 MB | Imágenes |
| Averías | `server/uploads/averias/` | 10 MB | Imágenes |
| Cumplidos | `server/uploads/cumplidos/` | 50 MB | PDF, Excel, Word, Imágenes |
| Avatares | `server/uploads/avatars/` | 2 MB | JPEG, PNG, WEBP |

Los archivos se sirven estáticamente desde `/uploads/`.

---

## Estructura de la Base de Datos

Al iniciar el servidor, Sequelize crea las siguientes tablas:

```
usuarios, roles, permisos, rol_permisos,
clientes, contactos,
inventario, caja_inventario, movimientos_inventario,
operaciones, operacion_detalle, operacion_averias, operacion_documentos,
plantillas_email, auditoria, notificaciones
```

**Opciones de sincronización (en `models/index.js`):**
- Desarrollo: `alter: true` (actualiza columnas sin perder datos)
- Producción: Sin sincronización automática (usar migraciones)

---

## Scripts Disponibles

### Backend (`server/`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Desarrollo** | `npm run dev` | Inicia con nodemon (hot reload) |
| **Producción** | `npm start` | Inicia servidor |
| **Seed Roles** | `node src/scripts/seedRolesPermisos.js` | Crea/actualiza roles y permisos |
| **Seed Email** | `node src/scripts/seedPlantillasEmail.js` | Crea plantillas predeterminadas |
| **Consolidar** | `node src/scripts/consolidarInventario.js` | Consolida inventario antiguo |
| **Test WMS** | `node scripts/wms-test.js` | Simulación completa WMS (14 pasos) |

### Frontend (`frontend/`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Desarrollo** | `npm run dev` | Inicia Vite dev server (:5173) |
| **Build** | `npm run build` | Genera build de producción |
| **Preview** | `npm run preview` | Preview del build local |

---

## Solución de Problemas

### Error: "Access denied for user 'root'@'localhost'"
- Verificar que MySQL esté corriendo (XAMPP > MySQL > Start)
- Verificar credenciales en `.env`

### Error: "CORS origin not allowed"
- Agregar la URL del frontend a `CORS_ORIGIN` en `.env`
- Las URLs deben estar separadas por coma, sin espacios

### Error: "JWT must be provided"
- Verificar que `JWT_SECRET` esté configurado en `.env`

### Error: "SMTP connection failed"
- Verificar credenciales de email
- En desarrollo, no configurar SMTP para usar Ethereal automáticamente

### Las tablas no se crean
- Verificar que la base de datos exista
- Revisar logs del servidor al iniciar
- Verificar conexión MySQL: `DB_HOST`, `DB_PORT`, `DB_NAME`

### El frontend no conecta con el backend
- Verificar que el backend esté corriendo en puerto 5000
- Verificar proxy en `vite.config.js`
- Verificar `VITE_API_URL` si está configurado
