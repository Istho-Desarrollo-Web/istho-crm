/**
 * ============================================================================
 * ISTHO CRM - Endpoints API
 * ============================================================================
 * Definición centralizada de todos los endpoints de la API.
 * Facilita mantenimiento y evita strings hardcodeados.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.1.0
 * @date Enero 2026
 */

// ════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  ME_AVATAR: '/auth/me/avatar',
  ME_PREFERENCIAS: '/auth/me/preferencias',
  REGISTRO: '/auth/registro',
  CAMBIAR_PASSWORD: '/auth/cambiar-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  TOTP_VALIDAR: '/auth/2fa/validar',
  TOTP_SETUP: '/auth/2fa/setup',
  TOTP_ACTIVAR: '/auth/2fa/activar',
  TOTP_DESHABILITAR: '/auth/2fa/deshabilitar',
  DISPOSITIVOS_CONFIABLES: '/auth/dispositivos-confiables',
  DISPOSITIVO_REVOCAR: (jti) => `/auth/dispositivos-confiables/${jti}`,
};

// ════════════════════════════════════════════════════════════════════════════
// CLIENTES
// ════════════════════════════════════════════════════════════════════════════

export const CLIENTES_ENDPOINTS = {
  BASE: '/clientes',
  BY_ID: (id) => `/clientes/${id}`,
  STATS: '/clientes/stats',
  CONTACTOS: (id) => `/clientes/${id}/contactos`,
  CONTACTO: (clienteId, contactoId) => `/clientes/${clienteId}/contactos/${contactoId}`,
  CONTACTO_PRINCIPAL: (clienteId, contactoId) =>
    `/clientes/${clienteId}/contactos/${contactoId}/principal`,
  INVENTARIO: (id) => `/clientes/${id}/inventario`,
  DESPACHOS: (id) => `/clientes/${id}/despachos`,
  DOCUMENTOS: (id) => `/clientes/${id}/documentos`,
  HISTORIAL: (id) => `/clientes/${id}/historial`,
  LOGO: (id) => `/clientes/${id}/logo`,
  PLANTILLA_IMPORTACION: '/clientes/plantilla-importacion',
};

// ════════════════════════════════════════════════════════════════════════════
// INVENTARIO
// ════════════════════════════════════════════════════════════════════════════

export const INVENTARIO_ENDPOINTS = {
  // CRUD Base
  BASE: '/inventario',
  BY_ID: (id) => `/inventario/${id}`,
  BY_CLIENTE: (clienteId) => `/inventario/cliente/${clienteId}`,

  // Estadísticas y Alertas
  STATS: '/inventario/stats',
  ALERTAS: '/inventario/alertas',

  // Movimientos (entradas, salidas, ajustes)
  AJUSTAR: (id) => `/inventario/${id}/ajustar`,
  MOVIMIENTOS: (id) => `/inventario/${id}/movimientos`,
  ESTADISTICAS_PRODUCTO: (id) => `/inventario/${id}/estadisticas`,

  // Gestión de alertas
  ATENDER_ALERTA: (alertaId) => `/inventario/alertas/${alertaId}/atender`,
  DESCARTAR_ALERTA: (alertaId) => `/inventario/alertas/${alertaId}`,
  DESCARTAR_TODAS_ALERTAS: '/inventario/alertas/descartar-todas',

  // Cajas (detalle por operación)
  CAJAS: (id) => `/inventario/${id}/cajas`,

  // Importación masiva
  IMPORTAR: '/inventario/importar',
  PLANTILLA_IMPORTACION: '/inventario/plantilla-importacion',

  // Integración WMS (futuro)
  SYNC_WMS: '/inventario/sync-wms',
};

// ════════════════════════════════════════════════════════════════════════════
// OPERACIONES
// ════════════════════════════════════════════════════════════════════════════

export const OPERACIONES_ENDPOINTS = {
  BASE: '/operaciones',
  BY_ID: (id) => `/operaciones/${id}`,
  STATS: '/operaciones/stats',

  // WMS
  WMS_DOCUMENTOS: '/operaciones/wms/documentos',
  WMS_DOCUMENTO: (numero) => `/operaciones/wms/documento/${numero}`,

  // Acciones
  AVERIAS: (id) => `/operaciones/${id}/averias`,
  DOCUMENTOS: (id) => `/operaciones/${id}/documentos`,
  CERRAR: (id) => `/operaciones/${id}/cerrar`,
  REENVIAR_CORREO: (id) => `/operaciones/${id}/reenviar-correo`,
  TRANSPORTE: (id) => `/operaciones/${id}/transporte`,
};

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍAS (Entradas y Salidas WMS)
// ════════════════════════════════════════════════════════════════════════════

export const AUDITORIAS_ENDPOINTS = {
  // Entradas
  ENTRADAS: '/auditorias/entradas',
  ENTRADA_BY_ID: (id) => `/auditorias/entradas/${id}`,

  // Salidas
  SALIDAS: '/auditorias/salidas',
  SALIDA_BY_ID: (id) => `/auditorias/salidas/${id}`,

  // Kardex
  KARDEX: '/auditorias/kardex',
  KARDEX_BY_ID: (id) => `/auditorias/kardex/${id}`,

  // Acciones sobre una auditoría (entrada o salida)
  VERIFICAR_LINEA: (id, lineaId) => `/auditorias/${id}/lineas/${lineaId}/verificar`,
  ELIMINAR_LINEA: (id, lineaId) => `/auditorias/${id}/lineas/${lineaId}`,
  RESTAURAR_LINEA: (id, lineaId) => `/auditorias/${id}/lineas/${lineaId}/restaurar`,
  DATOS_LOGISTICOS: (id) => `/auditorias/${id}/logistica`,
  EVIDENCIAS: (id) => `/auditorias/${id}/evidencias`,
  CERRAR: (id) => `/auditorias/${id}/cerrar`,
  DESTINATARIOS: (id) => `/auditorias/${id}/destinatarios`,

  // KPIs y estadísticas
  STATS: '/auditorias/stats',
  RECIENTES: '/auditorias/recientes',

  // Exportar Excel
  EXPORT_EXCEL: (tipo) => `/auditorias/${tipo}/excel`,

  // Etiquetas WMS para impresión (proxy al WMS)
  ETIQUETAS_WMS: (tipo, id) => `/auditorias/${tipo}/${id}/etiquetas-wms`,
};

// ════════════════════════════════════════════════════════════════════════════
// DESPACHOS
// ════════════════════════════════════════════════════════════════════════════

export const DESPACHOS_ENDPOINTS = {
  BASE: '/despachos',
  BY_ID: (id) => `/despachos/${id}`,
  STATS: '/despachos/stats',
};

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

export const DOCUMENTOS_ENDPOINTS = {
  BASE: '/documentos',
  BY_ID: (id) => `/documentos/${id}`,
  UPLOAD: '/documentos/upload',
  DOWNLOAD: (id) => `/documentos/${id}/download`,
};

// ════════════════════════════════════════════════════════════════════════════
// REPORTES
// ════════════════════════════════════════════════════════════════════════════

export const REPORTES_ENDPOINTS = {
  // Dashboard consolidado
  DASHBOARD: '/reportes/dashboard',

  // Reportes específicos
  INVENTARIO: '/reportes/inventario',
  INVENTARIO_UBICACION: '/reportes/inventario-ubicacion',
  CLIENTES: '/reportes/clientes',
  OPERACIONES: '/reportes/operaciones',

  // Enviar por email
  ENVIAR_EMAIL: '/reportes/enviar-email',

  // Comparativos
  COMPARATIVO: '/reportes/comparativo',
  PERIODOS_DISPONIBLES: '/reportes/periodos-disponibles',

  // Viajes
  VIAJES_EXCEL: '/reportes/viajes/excel',
  CAJA_MENOR_EXCEL: (id) => `/reportes/cajas-menores/${id}/excel`,

  // Programados
  PROGRAMADOS: '/reportes/programados',
  PROGRAMADO_BY_ID: (id) => `/reportes/programados/${id}`,
  PROGRAMADO_EJECUTAR: (id) => `/reportes/programados/${id}/ejecutar`,
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════

export const NOTIFICACIONES_ENDPOINTS = {
  BASE: '/notificaciones',
  MARCAR_LEIDA: (id) => `/notificaciones/${id}/leer`,
  MARCAR_TODAS: '/notificaciones/leer-todas',
};

// ════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════════════════════

export const USUARIOS_ENDPOINTS = {
  BASE: '/usuarios',
  BY_ID: (id) => `/usuarios/${id}`,
  PERFIL: '/usuarios/perfil',
  CAMBIAR_PASSWORD: '/usuarios/cambiar-password',
  RESTABLECER_PASSWORD: '/usuarios/restablecer-password',
};

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD (Alias - usa reportes/dashboard)
// ════════════════════════════════════════════════════════════════════════════

export const DASHBOARD_ENDPOINTS = {
  STATS: '/reportes/dashboard',
  KPIS: '/reportes/dashboard',
  GRAFICOS: '/reportes/dashboard',
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLAS EMAIL
// ════════════════════════════════════════════════════════════════════════════

export const PLANTILLAS_EMAIL_ENDPOINTS = {
  BASE: '/plantillas-email',
  BY_ID: (id) => `/plantillas-email/${id}`,
  CAMPOS: (tipo) => `/plantillas-email/campos/${tipo}`,
  PREVIEW: (id) => `/plantillas-email/${id}/preview`,
  PREVIEW_RAW: '/plantillas-email/preview-raw',
  LOGO_FIRMA: '/plantillas-email/logo-firma',
};

// ════════════════════════════════════════════════════════════════════════════
// EMAIL MANUAL
// ════════════════════════════════════════════════════════════════════════════

export const EMAIL_ENDPOINTS = {
  ENVIAR: '/emails/enviar',
};

// ════════════════════════════════════════════════════════════════════════════
// ADMINISTRACIÓN
// ════════════════════════════════════════════════════════════════════════════

export const ADMIN_ENDPOINTS = {
  // Usuarios
  USUARIOS: '/admin/usuarios',
  USUARIO_BY_ID: (id) => `/admin/usuarios/${id}`,
  USUARIO_RESET_PASSWORD: (id) => `/admin/usuarios/${id}/resetear-password`,
  USUARIO_PERMISOS: (id) => `/admin/usuarios/${id}/permisos`,
  USUARIO_REENVIAR_CREDENCIALES: (id) => `/admin/usuarios/${id}/reenviar-credenciales`,
  USUARIO_CLIENTES_ASIGNADOS: (id) => `/admin/usuarios/${id}/clientes-asignados`,
  USUARIO_CLIENTE_ASIGNADO: (id, clienteId) => `/admin/usuarios/${id}/clientes-asignados/${clienteId}`,

  // Roles
  ROLES: '/admin/roles',
  ROL_BY_ID: (id) => `/admin/roles/${id}`,

  // Permisos
  PERMISOS: '/admin/permisos',

  // Sesiones
  SESIONES: '/admin/sesiones',
  SESION_CERRAR: (id) => `/admin/sesiones/${id}/cerrar`,
  SESIONES_CERRAR_TODAS: '/admin/sesiones/cerrar-todas',

  // Seguridad
  SEGURIDAD: '/admin/seguridad',
  USUARIO_DESBLOQUEAR: (id) => `/admin/usuarios/${id}/desbloquear`,

  // Configuración WMS
  CONFIGURACION_WMS: '/admin/configuracion-wms',
  CONFIGURACION_WMS_BY_ID: (id) => `/admin/configuracion-wms/${id}`,
  CONFIGURACION_WMS_TOGGLE: (id) => `/admin/configuracion-wms/${id}/toggle`,
};

// ════════════════════════════════════════════════════════════════════════════
// WMS DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

export const WMS_DASHBOARD_ENDPOINTS = {
  STATUS: '/wms/dashboard/status',
  ESTADISTICAS: '/wms/dashboard/estadisticas',
  HISTORIAL: '/wms/dashboard/historial',
  REEJECUTAR: '/wms/dashboard/reejecutar',
  POLLING_EJECUTAR: '/wms/dashboard/polling/ejecutar',
  SYNC_HISTORICO: '/wms/dashboard/sync-historico',
  SYNC_KARDEX_CAJA: '/wms/dashboard/sync-kardex-caja',
  UBICACION_PALLET: (id) => `/wms/dashboard/ubicacion/pallet/${id}`,
  UBICACION_PRODUCTO: '/wms/dashboard/ubicacion/producto',
  PRODUCTO_WMS_INFO: '/wms/dashboard/producto-info',
};

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍA DE ACCIONES
// ════════════════════════════════════════════════════════════════════════════

export const AUDITORIA_ACCIONES_ENDPOINTS = {
  BASE: '/auditoria-acciones',
  STATS: '/auditoria-acciones/stats',
  TABLAS: '/auditoria-acciones/tablas',
  EXCEL: '/auditoria-acciones/excel',
  PDF: '/auditoria-acciones/pdf',
};

// ════════════════════════════════════════════════════════════════════════════
// VEHÍCULOS
// ════════════════════════════════════════════════════════════════════════════

export const VEHICULOS_ENDPOINTS = {
  BASE: '/vehiculos',
  BY_ID: (id) => `/vehiculos/${id}`,
  CONDUCTORES: '/vehiculos/conductores',
  ALERTAS: '/vehiculos/alertas-vencimiento',
};

// ════════════════════════════════════════════════════════════════════════════
// CAJAS MENORES
// ════════════════════════════════════════════════════════════════════════════

export const CAJAS_MENORES_ENDPOINTS = {
  BASE: '/cajas-menores',
  BY_ID: (id) => `/cajas-menores/${id}`,
  STATS: '/cajas-menores/stats',
  CERRAR: (id) => `/cajas-menores/${id}/cerrar`,
  USUARIOS_ASIGNABLES: '/cajas-menores/usuarios-asignables',
};

// ════════════════════════════════════════════════════════════════════════════
// VIAJES
// ════════════════════════════════════════════════════════════════════════════

export const VIAJES_ENDPOINTS = {
  BASE: '/viajes',
  BY_ID: (id) => `/viajes/${id}`,
  COMPLETAR: (id) => `/viajes/${id}/completar`,
  ANULAR: (id) => `/viajes/${id}/anular`,
};

// ════════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS CAJA MENOR
// ════════════════════════════════════════════════════════════════════════════

export const MOVIMIENTOS_ENDPOINTS = {
  BASE: '/movimientos-caja-menor',
  BY_ID: (id) => `/movimientos-caja-menor/${id}`,
  APROBAR: (id) => `/movimientos-caja-menor/${id}/aprobar`,
  APROBAR_MASIVO: '/movimientos-caja-menor/aprobar-masivo',
  CONCEPTOS: '/movimientos-caja-menor/conceptos',
};

// ════════════════════════════════════════════════════════════════════════════
// CONTACTOS (Directorio)
// ════════════════════════════════════════════════════════════════════════════

export const CONTACTOS_ENDPOINTS = {
  BASE: '/contactos',
  BY_ID: (id) => `/contactos/${id}`,
  CLIENTES_DE_CONTACTO: (id) => `/contactos/${id}/clientes`,
  CLIENTE_DE_CONTACTO: (contactoId, clienteId) => `/contactos/${contactoId}/clientes/${clienteId}`,
  // Desde ClienteDetail
  CONTACTOS_DE_CLIENTE: (clienteId) => `/clientes/${clienteId}/contactos`,
  ASIGNAR_A_CLIENTE: (clienteId) => `/clientes/${clienteId}/contactos/asignar`,
  DESASIGNAR_DE_CLIENTE: (clienteId, contactoId) => `/clientes/${clienteId}/contactos/${contactoId}`,
};

// ════════════════════════════════════════════════════════════════════════════
// BACKUP
// ════════════════════════════════════════════════════════════════════════════

export const BACKUP_ENDPOINTS = {
  HISTORIAL: '/backup/historial',
  EJECUTAR: '/backup/ejecutar',
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT UNIFICADO
// ════════════════════════════════════════════════════════════════════════════

export const ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  CLIENTES: CLIENTES_ENDPOINTS,
  INVENTARIO: INVENTARIO_ENDPOINTS,
  OPERACIONES: OPERACIONES_ENDPOINTS,
  AUDITORIAS: AUDITORIAS_ENDPOINTS,
  DESPACHOS: DESPACHOS_ENDPOINTS,
  DOCUMENTOS: DOCUMENTOS_ENDPOINTS,
  REPORTES: REPORTES_ENDPOINTS,
  NOTIFICACIONES: NOTIFICACIONES_ENDPOINTS,
  USUARIOS: USUARIOS_ENDPOINTS,
  DASHBOARD: DASHBOARD_ENDPOINTS,
  PLANTILLAS_EMAIL: PLANTILLAS_EMAIL_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
  AUDITORIA_ACCIONES: AUDITORIA_ACCIONES_ENDPOINTS,
  VEHICULOS: VEHICULOS_ENDPOINTS,
  CAJAS_MENORES: CAJAS_MENORES_ENDPOINTS,
  VIAJES: VIAJES_ENDPOINTS,
  MOVIMIENTOS: MOVIMIENTOS_ENDPOINTS,
  CONTACTOS: CONTACTOS_ENDPOINTS,
  BACKUP: BACKUP_ENDPOINTS,
};

export default ENDPOINTS;
