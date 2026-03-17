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
  REGISTRO: '/auth/registro',
  CAMBIAR_PASSWORD: '/auth/cambiar-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
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
  CONTACTO_PRINCIPAL: (clienteId, contactoId) => `/clientes/${clienteId}/contactos/${contactoId}/principal`,
  INVENTARIO: (id) => `/clientes/${id}/inventario`,
  DESPACHOS: (id) => `/clientes/${id}/despachos`,
  DOCUMENTOS: (id) => `/clientes/${id}/documentos`,
  HISTORIAL: (id) => `/clientes/${id}/historial`,
  LOGO: (id) => `/clientes/${id}/logo`,
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
  
  // Cajas (detalle por operación)
  CAJAS: (id) => `/inventario/${id}/cajas`,

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

  // KPIs y estadísticas
  STATS: '/auditorias/stats',
  RECIENTES: '/auditorias/recientes',

  // Exportar Excel
  EXPORT_EXCEL: (tipo) => `/auditorias/${tipo}/excel`,
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
  DESPACHOS: '/reportes/despachos',
  INVENTARIO: '/reportes/inventario',
  CLIENTES: '/reportes/clientes',
  OPERACIONES: '/reportes/operaciones',

  // Enviar por email
  ENVIAR_EMAIL: '/reportes/enviar-email',

  // Comparativos
  COMPARATIVO: '/reportes/comparativo',

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
// ADMINISTRACIÓN
// ════════════════════════════════════════════════════════════════════════════

export const ADMIN_ENDPOINTS = {
  // Usuarios
  USUARIOS: '/admin/usuarios',
  USUARIO_BY_ID: (id) => `/admin/usuarios/${id}`,
  USUARIO_RESET_PASSWORD: (id) => `/admin/usuarios/${id}/resetear-password`,
  USUARIO_PERMISOS: (id) => `/admin/usuarios/${id}/permisos`,
  USUARIO_REENVIAR_CREDENCIALES: (id) => `/admin/usuarios/${id}/reenviar-credenciales`,

  // Roles
  ROLES: '/admin/roles',
  ROL_BY_ID: (id) => `/admin/roles/${id}`,

  // Permisos
  PERMISOS: '/admin/permisos',
};

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍA DE ACCIONES
// ════════════════════════════════════════════════════════════════════════════

export const AUDITORIA_ACCIONES_ENDPOINTS = {
  BASE: '/auditoria-acciones',
  STATS: '/auditoria-acciones/stats',
  TABLAS: '/auditoria-acciones/tablas',
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
};

// ════════════════════════════════════════════════════════════════════════════
// VIAJES
// ════════════════════════════════════════════════════════════════════════════

export const VIAJES_ENDPOINTS = {
  BASE: '/viajes',
  BY_ID: (id) => `/viajes/${id}`,
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
};

export default ENDPOINTS;