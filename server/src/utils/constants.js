/**
 * ISTHO CRM - Constantes del Sistema
 * 
 * Valores constantes usados en toda la aplicación.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 */

module.exports = {
  // Roles de usuario
  ROLES: {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    FINANCIERA: 'financiera',
    OPERADOR: 'operador',
    CONDUCTOR: 'conductor',
    CLIENTE: 'cliente'
  },
  
  // Estados de cliente
  ESTADO_CLIENTE: {
    ACTIVO: 'activo',
    INACTIVO: 'inactivo',
    SUSPENDIDO: 'suspendido'
  },
  
  // Tipos de cliente
  TIPO_CLIENTE: {
    CORPORATIVO: 'corporativo',
    PYME: 'pyme',
    PERSONA: 'persona_natural'
  },
  
  // Estados de despacho
  ESTADO_DESPACHO: {
    PENDIENTE: 'pendiente',
    EN_PREPARACION: 'en_preparacion',
    DESPACHADO: 'despachado',
    EN_TRANSITO: 'en_transito',
    ENTREGADO: 'entregado',
    DEVOLUCION: 'devolucion',
    CANCELADO: 'cancelado'
  },
  
  // Estados de inventario
  ESTADO_INVENTARIO: {
    DISPONIBLE: 'disponible',
    RESERVADO: 'reservado',
    DAÑADO: 'dañado',
    CUARENTENA: 'cuarentena'
  },
  
  // Tipos de documento
  TIPO_DOCUMENTO: {
    CONTRATO: 'contrato',
    FACTURA: 'factura',
    REMISION: 'remision',
    CERTIFICADO: 'certificado',
    POLIZA: 'poliza',
    OTRO: 'otro'
  },
  
  // Tipos de notificación
  TIPO_NOTIFICACION: {
    DESPACHO: 'despacho',
    INVENTARIO: 'inventario',
    DOCUMENTO: 'documento',
    SISTEMA: 'sistema'
  },
  
  // Acciones de auditoría
  ACCION_AUDITORIA: {
    CREAR: 'crear',
    ACTUALIZAR: 'actualizar',
    ELIMINAR: 'eliminar',
    LOGIN: 'login',
    LOGOUT: 'logout'
  },
  
  // Paginación por defecto
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  
  // Extensiones de archivo permitidas
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'],
  
  // Tamaño máximo de archivo (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Expresiones regulares
  REGEX: {
    NIT: /^\d{9}-\d{1}$/,
    TELEFONO: /^(\+57)?[\s]?3\d{9}$/,
    CODIGO_CLIENTE: /^CLI-\d{4}$/
  }
};