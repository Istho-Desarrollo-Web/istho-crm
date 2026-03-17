# Guía de Desarrollo - ISTHO CRM

## 1. Convenciones del Proyecto

### 1.1 Idioma
- **Código**: Variables y funciones en español (camelCase)
- **Commits**: Mensajes en español
- **Comentarios**: Español
- **UI**: Español (Colombia)

### 1.2 Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Variables/funciones | camelCase | `obtenerCliente`, `listarUsuarios` |
| Modelos Sequelize | PascalCase | `CajaInventario`, `OperacionDetalle` |
| Tablas DB | snake_case plural | `caja_inventario`, `operacion_detalle` |
| Archivos componentes | PascalCase.jsx | `ClientesList.jsx`, `EntradaAuditoria.jsx` |
| Archivos servicios | camelCase.service.js | `auditorias.service.js` |
| Archivos rutas | camelCase.routes.js | `wmsSync.routes.js` |
| Archivos controllers | camelCaseController.js | `auditoriaWmsController.js` |
| Endpoints API | kebab-case | `/cambiar-password`, `/reenviar-correo` |
| Constantes | UPPER_SNAKE | `CAMPOS_POR_TIPO`, `FIRMA_DEFAULT` |

### 1.3 Estructura de Archivos

**Backend:**
```
server/src/
├── config/          # Configuración (DB, JWT, email, multer)
├── controllers/     # Lógica de request/response
├── middleware/       # Auth, roles, validación
├── models/          # Sequelize models + asociaciones
├── routes/          # Express routes (solo definición)
├── services/        # Lógica de negocio pura
├── scripts/         # Seeds y utilidades
├── templates/       # Plantillas Handlebars
├── utils/           # Helpers, logger, responses
└── validators/      # express-validator schemas
```

**Frontend:**
```
frontend/src/
├── api/             # Servicios HTTP + endpoints
├── components/      # Componentes reutilizables
│   ├── common/      # Genéricos (Modal, Loader, etc.)
│   ├── layout/      # FloatingHeader, Footer
│   └── auth/        # PrivateRoute, Guards
├── context/         # React Context providers
├── hooks/           # Custom hooks
├── pages/           # Páginas organizadas por módulo
├── utils/           # Utilidades frontend
└── styles/          # Estilos globales
```

### 1.4 Patrones de Código

**Backend - Controller:**
```javascript
// controllers/ejemploController.js
const { Modelo } = require('../models');
const { success, paginated, notFound, serverError } = require('../utils/responses');
const { parsePaginacion, buildPaginacion } = require('../utils/helpers');

const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const { search, estado } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        // ...
      ];
    }

    const { count, rows } = await Modelo.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{ model: OtroModelo, as: 'relacion' }]
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    return serverError(res, 'Error al listar', error);
  }
};
```

**Frontend - Service:**
```javascript
// api/ejemplo.service.js
import client from './client';
import { EJEMPLO_ENDPOINTS } from './endpoints';

export const getAll = (params = {}) => {
  return client.get(EJEMPLO_ENDPOINTS.BASE, { params });
};

export const getById = (id) => {
  return client.get(EJEMPLO_ENDPOINTS.BY_ID(id));
};

export const create = (data) => {
  return client.post(EJEMPLO_ENDPOINTS.BASE, data);
};
```

**Frontend - Page:**
```javascript
// pages/Ejemplo/EjemploList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as ejemploService from '../../api/ejemplo.service';

const EjemploList = () => {
  const { hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  const fetchData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await ejemploService.getAll(params);
      setData(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="...">
      {/* Contenido */}
    </div>
  );
};

export default EjemploList;
```

---

## 2. Cómo Agregar un Nuevo Módulo

### Paso 1: Modelo Sequelize

Crear `server/src/models/NuevoModelo.js`:

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NuevoModelo = sequelize.define('NuevoModelo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      defaultValue: 'activo'
    }
  }, {
    tableName: 'nuevo_modulo',
    timestamps: true,
    indexes: [
      { fields: ['estado'] }
    ]
  });

  return NuevoModelo;
};
```

### Paso 2: Registrar en `models/index.js`

```javascript
// En la sección de imports
const NuevoModelo = require('./NuevoModelo')(sequelize);

// En la sección de asociaciones
NuevoModelo.belongsTo(Cliente, { as: 'cliente', foreignKey: 'cliente_id' });
Cliente.hasMany(NuevoModelo, { as: 'nuevos', foreignKey: 'cliente_id' });

// En el export
module.exports = {
  // ... existentes
  NuevoModelo
};
```

### Paso 3: Controlador

Crear `server/src/controllers/nuevoModuloController.js`:

```javascript
const { NuevoModelo } = require('../models');
const { success, paginated, notFound, serverError } = require('../utils/responses');
const { parsePaginacion, buildPaginacion } = require('../utils/helpers');
const { Auditoria } = require('../models');

const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const { count, rows } = await NuevoModelo.findAndCountAll({
      limit, offset,
      order: [['created_at', 'DESC']]
    });
    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    return serverError(res, 'Error al listar', error);
  }
};

const crear = async (req, res) => {
  try {
    const nuevo = await NuevoModelo.create(req.body);

    await Auditoria.registrar({
      tabla: 'nuevo_modulo',
      registro_id: nuevo.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: nuevo.toJSON(),
      ip_address: req.ip
    });

    return success(res, nuevo, 201);
  } catch (error) {
    return serverError(res, 'Error al crear', error);
  }
};

module.exports = { listar, crear };
```

### Paso 4: Rutas

Crear `server/src/routes/nuevoModulo.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/nuevoModuloController');
const { verificarToken } = require('../middleware/auth');
const { verificarPermisoCliente } = require('../middleware/auth');

router.get('/',
  verificarToken,
  verificarPermisoCliente('nuevo_modulo', 'ver'),
  controller.listar
);

router.post('/',
  verificarToken,
  verificarPermisoCliente('nuevo_modulo', 'crear'),
  controller.crear
);

module.exports = router;
```

### Paso 5: Registrar Ruta en App

En `server/src/app.js`:

```javascript
const nuevoModuloRoutes = require('./routes/nuevoModulo.routes');
// ...
app.use(`${apiPrefix}/nuevo-modulo`, nuevoModuloRoutes);
```

### Paso 6: Agregar Permisos

En `server/src/scripts/seedRolesPermisos.js`, agregar al array de permisos:

```javascript
{ modulo: 'nuevo_modulo', accion: 'ver', descripcion: 'Ver nuevo módulo', grupo: 'Operaciones' },
{ modulo: 'nuevo_modulo', accion: 'crear', descripcion: 'Crear en nuevo módulo', grupo: 'Operaciones' },
{ modulo: 'nuevo_modulo', accion: 'editar', descripcion: 'Editar en nuevo módulo', grupo: 'Operaciones' },
{ modulo: 'nuevo_modulo', accion: 'eliminar', descripcion: 'Eliminar en nuevo módulo', grupo: 'Operaciones' },
```

Ejecutar: `node src/scripts/seedRolesPermisos.js`

### Paso 7: Frontend - Endpoints

En `frontend/src/api/endpoints.js`:

```javascript
export const NUEVO_MODULO_ENDPOINTS = {
  BASE: '/nuevo-modulo',
  BY_ID: (id) => `/nuevo-modulo/${id}`,
  STATS: '/nuevo-modulo/stats',
};
```

### Paso 8: Frontend - Service

Crear `frontend/src/api/nuevoModulo.service.js`:

```javascript
import client from './client';
import { NUEVO_MODULO_ENDPOINTS } from './endpoints';

export const getAll = (params = {}) => {
  return client.get(NUEVO_MODULO_ENDPOINTS.BASE, { params });
};

export const getById = (id) => {
  return client.get(NUEVO_MODULO_ENDPOINTS.BY_ID(id));
};

export const create = (data) => {
  return client.post(NUEVO_MODULO_ENDPOINTS.BASE, data);
};

export const update = (id, data) => {
  return client.put(NUEVO_MODULO_ENDPOINTS.BY_ID(id), data);
};

export const remove = (id) => {
  return client.delete(NUEVO_MODULO_ENDPOINTS.BY_ID(id));
};
```

### Paso 9: Frontend - Páginas

Crear `frontend/src/pages/NuevoModulo/`:

```
NuevoModulo/
├── NuevoModuloList.jsx    # Listado con paginación
├── NuevoModuloDetail.jsx  # Vista de detalle
└── components/            # Componentes específicos
    ├── NuevoModuloForm.jsx
    └── NuevoModuloTable.jsx
```

### Paso 10: Frontend - Rutas

En `frontend/src/App.jsx`:

```javascript
const NuevoModuloList = lazy(() => import('./pages/NuevoModulo/NuevoModuloList'));
const NuevoModuloDetail = lazy(() => import('./pages/NuevoModulo/NuevoModuloDetail'));

// En el JSX de rutas:
<Route path="/nuevo-modulo" element={
  <PortalPermissionRoute modulo="nuevo_modulo" accion="ver">
    <NuevoModuloList />
  </PortalPermissionRoute>
} />
<Route path="/nuevo-modulo/:id" element={
  <PortalPermissionRoute modulo="nuevo_modulo" accion="ver">
    <NuevoModuloDetail />
  </PortalPermissionRoute>
} />
```

### Paso 11: Frontend - Navegación

En `frontend/src/components/layout/FloatingHeader.jsx`, agregar al menú:

```javascript
{
  label: 'Nuevo Módulo',
  path: '/nuevo-modulo',
  icon: IconComponent,
  shortcut: 'G N',
  permiso: { modulo: 'nuevo_modulo', accion: 'ver' }
}
```

---

## 3. Convenciones de API

### 3.1 Formato de Respuesta

Siempre usar los helpers de `utils/responses.js`:

```javascript
// Éxito simple
return success(res, data);

// Creación
return success(res, data, 201);

// Lista paginada
return paginated(res, rows, paginacion);

// Error
return notFound(res, 'Registro no encontrado');
return badRequest(res, 'Datos inválidos');
return unauthorized(res, 'Token inválido');
return forbidden(res, 'Sin permisos');
return serverError(res, 'Error interno', error);
```

### 3.2 Paginación

```javascript
const { parsePaginacion, buildPaginacion } = require('../utils/helpers');

const { page, limit, offset } = parsePaginacion(req.query);
// page=1, limit=20 por defecto

const { count, rows } = await Model.findAndCountAll({
  limit, offset, ...
});

return paginated(res, rows, buildPaginacion(count, page, limit));
```

### 3.3 Auditoría

Registrar todas las acciones CRUD:

```javascript
await Auditoria.registrar({
  tabla: 'nombre_tabla',
  registro_id: registro.id,
  accion: 'crear', // crear, actualizar, eliminar
  usuario_id: req.user.id,
  usuario_nombre: req.user.nombre_completo,
  datos_anteriores: datosAnteriores, // solo en actualizar/eliminar
  datos_nuevos: registro.toJSON(),   // solo en crear/actualizar
  ip_address: getClientIP(req),
  user_agent: req.headers['user-agent'],
  descripcion: 'Descripción legible'
});
```

---

## 4. Gestión de Permisos

### 4.1 Backend

```javascript
// Verificar permiso en ruta
router.get('/',
  verificarToken,
  verificarPermisoCliente('modulo', 'accion'),
  controller.listar
);

// Verificar permiso en controller
if (!req.user.tienePermiso('modulo', 'accion')) {
  return forbidden(res, 'Sin permisos');
}
```

### 4.2 Frontend

```javascript
// En componentes
const { hasPermission } = useAuth();

{hasPermission('modulo', 'crear') && (
  <Button>Crear</Button>
)}

// En rutas
<PortalPermissionRoute modulo="modulo" accion="ver">
  <Componente />
</PortalPermissionRoute>

// Para ocultar elementos
<ProtectedAction module="modulo" action="editar" hide={true}>
  <Button>Editar</Button>
</ProtectedAction>
```

---

## 5. Path Aliases (Frontend)

En `vite.config.js` están configurados los siguientes aliases:

```javascript
import Component from '@components/common/Modal';
import { useAuth } from '@context/AuthContext';
import * as service from '@api/ejemplo.service';
import { formatDate } from '@utils/helpers';
```

| Alias | Ruta |
|-------|------|
| `@/` | `src/` |
| `@components/` | `src/components/` |
| `@pages/` | `src/pages/` |
| `@hooks/` | `src/hooks/` |
| `@context/` | `src/context/` |
| `@api/` | `src/api/` |
| `@utils/` | `src/utils/` |
| `@styles/` | `src/styles/` |
| `@assets/` | `src/assets/` |

---

## 6. Modo Oscuro

El modo oscuro se implementa con:

1. **ThemeContext**: Provee `isDark` y `toggleDark()`
2. **Tailwind CSS**: Clases `dark:` para estilos condicionales
3. **MUI Theme**: Tema light/dark sincronizado
4. **Toggle**: `Ctrl+B` (global) o botón en FloatingHeader
5. **Persistencia**: `localStorage`

```javascript
// En componentes
const { isDark } = useThemeContext();

<div className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}>
```

---

## 7. Manejo de Archivos

### 7.1 Upload

```javascript
// Backend (con Multer)
const { uploadAveria, uploadCumplido } = require('../config/multer');

router.post('/:id/averias', uploadAveria.single('foto'), controller.registrarAveria);
router.post('/:id/documentos', uploadCumplido.single('archivo'), controller.subirDocumento);
```

```javascript
// Frontend (con createUploadClient)
import { createUploadClient } from '../api/client';

const uploadClient = createUploadClient();
const formData = new FormData();
formData.append('archivo', file);
formData.append('descripcion', 'Descripción');

await uploadClient.post(`/operaciones/${id}/documentos`, formData);
```

### 7.2 Servir Archivos

Los archivos se sirven estáticamente:
```
GET /uploads/logos/logo_1.png
GET /uploads/averias/foto_1.jpg
GET /uploads/cumplidos/doc_1.pdf
```

---

## 8. Testing

### 8.1 WMS Integration Test

```bash
# Ejecutar simulación completa (14 pasos)
cd server
node scripts/wms-test.js
```

### 8.2 Seeds para Desarrollo

```bash
# Roles y permisos
node src/scripts/seedRolesPermisos.js

# Plantillas de email
node src/scripts/seedPlantillasEmail.js

# Consolidar inventario (si migración de datos antiguos)
node src/scripts/consolidarInventario.js
```

---

## 9. Despliegue

### 9.1 Build de Producción

```bash
# Frontend
cd frontend
npm run build  # Genera dist/

# Backend
cd server
npm start      # NODE_ENV=production
```

### 9.2 Railway

El proyecto está configurado para Railway:
- MySQL como servicio adjunto
- Variables de entorno en dashboard
- SSL automático para MySQL
- Deploy automático desde Git

### 9.3 Variables Requeridas

```
NODE_ENV=production
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET (min 32 caracteres)
CORS_ORIGIN (URL del frontend en producción)
WMS_API_KEY
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
```

---

## 10. Utilidades Disponibles

### 10.1 Exportar a CSV (Frontend)

```javascript
import { exportToCsv } from '@utils/exportCsv';

exportToCsv(data, [
  { key: 'documento_wms', label: 'Documento WMS' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
], 'nombre_archivo');
```
Genera CSV con BOM UTF-8 y separador `;` (compatible con Excel en español).

### 10.2 URLs de Archivos del Servidor (Frontend)

```javascript
import { getServerFileUrl } from '@api/client';

// Convierte '/uploads/avatars/foto.jpg' → 'http://localhost:5000/uploads/avatars/foto.jpg'
const url = getServerFileUrl(user.avatar_url);
```

### 10.3 Búsqueda Global

El componente `GlobalSearch` se abre con `Ctrl+K` / `Cmd+K` desde cualquier página protegida. Busca en 5 módulos en paralelo (Inventario, Clientes, Entradas, Salidas, Kardex). Integrado en `ProtectedLayout` de `App.jsx`.

### 10.4 Logo de Email (Base64)

El sistema de email usa logos en base64 para máxima compatibilidad:

```javascript
// Obtener logo (servidor)
const { PlantillaEmail } = require('../models');
const logoDataUri = PlantillaEmail.getLogoFirmaDataUri();
// Retorna: 'data:image/png;base64,iVBORw0KGgo...' o null

// Subir logo (frontend)
await plantillasEmailService.uploadLogoFirma(file);
```

El logo se sube desde **Plantillas de Email > Firma > Subir Logo** y se usa automáticamente en:
- Header de todos los correos (`base.html` → `{{logoUrl}}`)
- Firma default (`FIRMA_DEFAULT` → `{{logoFirmaDataUri}}`)
- Footer de todos los correos

Almacenamiento: `server/uploads/assets/logo-firma.json` (data URI en JSON)

### 10.5 Persistir Filtros en URL

Para reportes y listados, usar `useSearchParams` de React Router:

```javascript
const [searchParams, setSearchParams] = useSearchParams();
const [filters, setFilters] = useState({
  fecha_desde: searchParams.get('fecha_desde') || '',
});

const handleFiltersChange = (newFilters) => {
  setFilters(newFilters);
  const params = new URLSearchParams();
  Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
  setSearchParams(params, { replace: true });
};
```

---

## 11. WebSocket (Notificaciones en Tiempo Real)

### Emitir notificación desde un controller

Las notificaciones se emiten automáticamente por WebSocket cuando usas `notificacionService`:

```javascript
const notificacionService = require('../services/notificacionService');

// Notificar a un usuario específico
await notificacionService.notificar({
  usuario_id: 5,
  tipo: 'sistema',
  titulo: 'Título',
  mensaje: 'Mensaje del evento',
  prioridad: 'normal',  // baja, normal, alta, urgente
  accion_url: '/ruta/en/el/sistema',
});

// Notificar a admins y supervisores
await notificacionService.notificarAdmins({ tipo: 'sistema', titulo: '...', mensaje: '...' });

// Notificar a usuarios de un cliente + admins
await notificacionService.notificarPorCliente(clienteId, { tipo: 'despacho', titulo: '...', mensaje: '...' });
```

Cada llamada:
1. Crea el registro en BD (tabla `notificaciones`)
2. Emite `notificacion:nueva` por WebSocket a los usuarios afectados
3. El frontend actualiza el badge y muestra un toast automáticamente

### Escuchar eventos en el frontend

```javascript
import { useSocket } from '@context/SocketContext';

const { on, off } = useSocket();

useEffect(() => {
  const handler = (data) => console.log('Nueva notificación:', data);
  on('notificacion:nueva', handler);
  return () => off('notificacion:nueva', handler);
}, [on, off]);
```

### Arquitectura

```
server.js → http.createServer(app) → socketService.inicializar(server)
notificacionService.notificar() → DB + socketService.emitToUser()
Frontend: SocketContext → NotificacionesContext → FloatingHeader toast
```

---

## 12. Troubleshooting Común

| Problema | Solución |
|----------|---------|
| WebSocket 404 en desarrollo | Verificar proxy `/socket.io` en `vite.config.js` con `ws: true` |
| WebSocket no conecta | Verificar que backend use `http.createServer(app)` + `socketService.inicializar(server)` |
| Toast no aparece | Verificar que `SocketProvider` envuelva la app dentro de `AuthProvider` |
| CORS bloqueado | Agregar URL a `CORS_ORIGIN` en `.env` |
| Permisos no funcionan | Ejecutar `seedRolesPermisos.js`, verificar `rol_id` del usuario |
| Caché de permisos desactualizado | Esperar 60s o reiniciar servidor |
| Plantilla email no encontrada | Ejecutar `seedPlantillasEmail.js` |
| Upload falla | Verificar que existan los directorios en `server/uploads/` |
| WMS sync duplicado | El sistema verifica duplicados por `documento_origen`/`numero_picking` |
| Token expirado en dev | Frontend tiene refresh automático via interceptor Axios |
| Too many keys (MySQL) | Índices duplicados en tabla. Ver sección de índices abajo |
| Avatar no se muestra | Usar `getServerFileUrl()` para construir URL completa del backend |

### Índices duplicados en MySQL

Si aparece el error `Too many keys specified; max 64 keys allowed`, es porque un campo tiene `unique: true` en la definición **y** un índice en el array `indexes`. Sequelize con `alter: true` crea un índice nuevo en cada reinicio.

**Solución:**
1. Quitar `unique: true` de la definición del campo (dejar solo el índice en `indexes`)
2. Limpiar duplicados en la BD:
```sql
-- Ver índices de una tabla
SHOW INDEX FROM nombre_tabla;
-- Eliminar índice duplicado
ALTER TABLE nombre_tabla DROP INDEX nombre_indice;
```
