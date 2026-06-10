# Documento de Soporte Administrativo
## CRM CenthriX — ISTHO S.A.S.

**Versión:** 1.1.0
**Fecha:** Abril 2026
**Elaborado por:** Coordinación TI — ISTHO S.A.S.
**Clasificación:** Uso interno

---

## 1. Introducción

El presente documento describe el soporte administrativo del sistema **CRM CenthriX**, una plataforma integral de gestión logística, transporte y almacenamiento desarrollada para **ISTHO S.A.S.** (Centro Logístico Industrial del Norte), ubicada en Girardota, Antioquia, Colombia.

CenthriX centraliza la gestión de clientes, inventario, operaciones de bodega, despachos, viajes, cajas menores y la integración bidireccional con el sistema WMS CenthriX. El sistema está diseñado para operar en entorno web, accesible desde navegadores de escritorio y dispositivos móviles, con soporte para modo claro y oscuro.

El CRM reemplaza procesos manuales y hojas de cálculo, proporcionando trazabilidad completa, auditoría en tiempo real y reportes automatizados para la toma de decisiones.

---

## 2. Objetivo General

Implementar y mantener un sistema CRM que permita a ISTHO S.A.S. gestionar de manera integral sus operaciones logísticas, de transporte y almacenamiento, garantizando la trazabilidad de la información, la eficiencia operativa y el cumplimiento de los estándares ISO 9001:2015.

---

## 3. Objetivos Específicos

### 3.1 Gestión de Clientes
- Centralizar la información de clientes corporativos con datos de contacto, documentación tributaria y estado comercial.
- Proporcionar un portal de consulta para que los clientes accedan a su inventario y operaciones en tiempo real.

### 3.2 Control de Inventario
- Gestionar el inventario por cliente con trazabilidad a nivel de caja, lote y ubicación.
- Sincronizar automáticamente entradas, salidas y ajustes desde el WMS Centhrix.
- Generar alertas automáticas de stock bajo, agotado y próximo a vencer.

### 3.3 Operaciones de Bodega
- Registrar y auditar todas las operaciones de ingreso (CO), salida/picking (PK) y ajustes de kardex (CR).
- Implementar un flujo de auditoría con verificación de líneas, registro de averías y evidencia fotográfica.
- Enviar notificaciones automáticas por email al cerrar auditorías.

### 3.4 Transporte y Viajes
- Gestionar la flota de vehículos con control de documentos (SOAT, tecnomecánica) y alertas de vencimiento.
- Registrar viajes con asignación de conductor, vehículo, ruta y caja menor.
- Controlar gastos de viaje con flujo de aprobación financiera.

### 3.5 Cajas Menores
- Administrar cajas menores asignables a cualquier usuario del sistema.
- Implementar flujo de egresos, ingresos, aprobación y cierre contable.
- Permitir traslado de saldos entre cajas y liquidación al cierre.

### 3.6 Reportes y Análisis
- Generar reportes operativos y financieros en formato Excel y PDF.
- Programar envío automático de reportes por email con frecuencia configurable.
- Proporcionar dashboards con KPIs diferenciados por rol.

### 3.7 Seguridad y Auditoría
- Implementar autenticación JWT con tokens de refresco y bloqueo por intentos fallidos.
- Controlar acceso granular por módulo y acción mediante sistema de permisos.
- Registrar todas las acciones del sistema en log de auditoría.

### 3.8 Integración WMS
- **Modelo PUSH:** el WMS CenthriX empuja al CRM entradas, salidas y kardex via `POST /wms/sync/*` con API Key.
- **Modelo PULL (polling):** el CRM consulta el WMS cada 5 minutos y sincroniza automáticamente las órdenes finalizadas (entradas CO y salidas PK). Evita dependencia de que el WMS inicie la comunicación.
- Ajustes de kardex desde la app WMS móvil se sincronizan via polling de historial por pallet.
- Solo se procesan ajustes de tipo **Carga** (entrada); las Descargas son generadas por el polling de órdenes de picking.
- Deduplicación cruzada: una misma orden no puede ser procesada dos veces por PUSH y PULL simultáneamente.
- Validar dinámicamente estados, tipos de orden y motivos de kardex.
- Proporcionar panel de configuración y dashboard de monitoreo de sincronizaciones.

---

## 4. Alcance del Sistema

### 4.1 Módulos del Sistema

| # | Módulo | Descripción | Roles con acceso |
|---|--------|-------------|-----------------|
| 1 | **Dashboard** | Panel de control con KPIs por rol | Todos |
| 2 | **Clientes** | Gestión de clientes y contactos | Admin, Supervisor, Operador, Financiera |
| 3 | **Inventario** | Productos, stock, cajas, lotes | Admin, Supervisor, Operador, Cliente |
| 4 | **Entradas (CO)** | Auditoría de recepciones WMS | Admin, Supervisor, Operador, Cliente |
| 5 | **Salidas (PK)** | Auditoría de despachos WMS | Admin, Supervisor, Operador, Cliente |
| 6 | **Kardex (CR)** | Auditoría de ajustes WMS | Admin, Supervisor, Operador, Cliente |
| 7 | **Vehículos** | Flota y documentos | Admin, Supervisor, Financiera, Conductor |
| 8 | **Viajes** | Rutas y asignaciones | Admin, Supervisor, Financiera, Conductor |
| 9 | **Cajas Menores** | Fondos y saldos | Admin, Supervisor, Financiera, Conductor, Operador |
| 10 | **Movimientos** | Egresos, ingresos, aprobación | Admin, Supervisor, Financiera, Conductor, Operador |
| 11 | **Solicitudes** | Avisos de ingreso y solicitudes de despacho (portal cliente) | Admin, Supervisor, Operador, Cliente |
| 12 | **Reportes** | Visualización y exportación | Admin, Supervisor, Financiera, Cliente |
| 13 | **Reportes Programados** | Envío automático por email | Admin, Supervisor |
| 14 | **Plantillas Email** | Diseño de correos | Admin, Supervisor |
| 15 | **Configuración WMS** | Reglas de integración | Admin |
| 16 | **Administración** | Usuarios, roles, permisos, sesiones | Admin |
| 17 | **Perfil** | Datos personales, avatar, preferencias | Todos |
| 18 | **Notificaciones** | Alertas en tiempo real | Todos |

### 4.2 Integraciones

| Sistema | Tipo | Protocolo | Descripción |
|---------|------|-----------|-------------|
| WMS CenthriX | Bidireccional | API REST + API Key (PUSH) / JWT polling (PULL) | PUSH: WMS empuja productos, entradas, salidas y kardex. PULL: CRM consulta órdenes cada 5 min y ubicaciones en tiempo real. |
| Gmail SMTP | Saliente | SMTP 587 (TLS) | Envío de emails transaccionales, recuperación de contraseña y reportes |
| Socket.IO | Interno | HTTP Long-polling | Notificaciones en tiempo real (conexión persistente sin WebSocket) |

### 4.3 Infraestructura

| Componente | Plataforma | Tecnología | Costo/mes |
|-----------|-----------|-----------|-----------|
| Backend | AWS App Runner (us-west-2) | Node.js 22, Express, Sequelize | ~$14-15 |
| Frontend | Vercel (Hobby) | React 19, Vite, Tailwind CSS 4 | $0 |
| Base de datos | AWS RDS MySQL 8.0 (us-west-2) | db.t3.micro, 20 GB gp2 | ~$14.54 |
| Almacenamiento | AWS S3 (us-west-2) | Bucket `istho-crm-files` | ~$0.10 |
| Email | Gmail SMTP | Puerto 587, TLS | $0 |
| Cache/Socket | Upstash Redis (opcional) | Socket.IO multi-instancia | $0 |
| **Total** | | | **~$30/mes** |

---

## 5. Roles y Responsabilidades

### 5.1 Administrador (Admin)
- **Nivel jerárquico:** 100 (máximo)
- **Responsabilidades:**
  - Gestión completa de usuarios, roles y permisos
  - Configuración de la integración WMS
  - Supervisión de todas las operaciones
  - Gestión de plantillas de email
  - Monitoreo de sesiones activas
  - Acceso total a todos los módulos

### 5.2 Supervisor
- **Nivel jerárquico:** 75
- **Responsabilidades:**
  - Supervisión de operaciones de bodega
  - Auditoría de entradas, salidas y kardex
  - Generación y programación de reportes
  - Visualización de plantillas de email (solo lectura — no puede editar)
  - Aprobación de gastos de caja menor
  - Gestión de vehículos y viajes

### 5.3 Financiera
- **Nivel jerárquico:** 60
- **Responsabilidades:**
  - Gestión de cajas menores (crear, editar, cerrar)
  - Aprobación y rechazo de gastos
  - Control de vehículos (crear, editar)
  - Consulta de viajes y reportes financieros
  - Exportación de datos para contabilidad

### 5.4 Operador
- **Nivel jerárquico:** 50
- **Responsabilidades:**
  - Operaciones de bodega (entradas, salidas, kardex)
  - Verificación y auditoría de líneas
  - Registro de averías y evidencias
  - Gestión de movimientos en cajas menores asignadas
  - Consulta de inventario y clientes

### 5.5 Conductor
- **Nivel jerárquico:** 30
- **Responsabilidades:**
  - Creación y gestión de viajes
  - Registro de gastos de viaje con soporte
  - Consulta de vehículos asignados
  - Gestión de movimientos en cajas menores asignadas

### 5.6 Cliente (Portal)
- **Nivel jerárquico:** 10
- **Responsabilidades:**
  - Consulta de inventario propio (solo su empresa)
  - Consulta de operaciones (entradas, salidas, kardex) — solo lectura
  - Visualización de reportes propios
  - Acceso a detalle de su empresa (Mi Empresa) con historial de operaciones
  - Creación y seguimiento de solicitudes: **Aviso de Ingreso** y **Solicitud de Despacho**
  - Configuración de preferencias personales del sistema
- **Nota técnica:** Los permisos del cliente portal se gestionan mediante la columna `permisos_cliente` en la tabla `usuarios` y el método `getPermisos()` en el modelo `Usuario`. Son independientes del sistema de roles y permisos estándar. Cambios en el seed de roles NO afectan a usuarios portal.

---

## 6. Requisitos Técnicos

### 6.1 Para el Usuario Final
- Navegador web moderno (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- Conexión a internet
- Resolución mínima: 360px (móvil) / 1024px (escritorio)

### 6.2 Para el Administrador del Sistema
- Acceso a la consola AWS (App Runner, RDS, S3) — región us-west-2
- Acceso al dashboard de Vercel (frontend)
- Acceso a la cuenta de Gmail corporativa (gestión del App Password para SMTP)
- Conocimiento básico de variables de entorno
- Repositorio GitHub `istho-crm-p` (los pushes a `main` activan el redespliegue automático)

---

## 7. Contacto y Soporte

| Concepto | Detalle |
|----------|---------|
| **Empresa** | ISTHO S.A.S. — Centro Logístico Industrial del Norte |
| **Ubicación** | Girardota, Antioquia, Colombia |
| **Certificación** | ISO 9001:2015 |
| **Dominio** | istho.com.co |
| **Soporte TI** | Coordinación TI — ISTHO S.A.S. |

---

*Documento actualizado para CRM CenthriX v1.1.0 — ISTHO S.A.S. © 2026*
