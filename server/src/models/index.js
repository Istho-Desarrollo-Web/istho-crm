/**
 * ISTHO CRM - Índice de Modelos
 * 
 * Inicializa todos los modelos Sequelize y define sus relaciones.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0 - Agregado MovimientoInventario
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Importar definiciones de modelos
const UsuarioModel = require('./Usuario');
const ClienteModel = require('./Cliente');
const ContactoModel = require('./Contacto');
const AuditoriaModel = require('./Auditoria');
const InventarioModel = require('./Inventario');
const OperacionModel = require('./Operacion');
const OperacionDetalleModel = require('./OperacionDetalle');
const OperacionAveriaModel = require('./OperacionAveria');
const OperacionDocumentoModel = require('./OperacionDocumento');
const NotificacionEmailModel = require('./NotificacionEmail');
const MovimientoInventarioModel = require('./MovimientoInventario'); // ← NUEVO
const CajaInventarioModel = require('./CajaInventario'); // ← NUEVO: Cajas individuales
const PlantillaEmailModel = require('./PlantillaEmail');
const RolModel = require('./Rol');
const PermisoModel = require('./Permiso');
const RolPermisoModel = require('./RolPermiso');
const ReporteProgramadoModel = require('./ReporteProgramado');
const VehiculoModel = require('./Vehiculo');
const CajaMenorModel = require('./CajaMenor');
const ViajeModel = require('./Viaje');
const MovimientoCajaMenorModel = require('./MovimientoCajaMenor');
const Notificacion = require('./Notificacion')(sequelize);

// Inicializar modelos
const Usuario = UsuarioModel(sequelize);
const Cliente = ClienteModel(sequelize);
const Contacto = ContactoModel(sequelize);
const Auditoria = AuditoriaModel(sequelize);
const Inventario = InventarioModel(sequelize);
const Operacion = OperacionModel(sequelize);
const OperacionDetalle = OperacionDetalleModel(sequelize);
const OperacionAveria = OperacionAveriaModel(sequelize);
const OperacionDocumento = OperacionDocumentoModel(sequelize);
const NotificacionEmail = NotificacionEmailModel(sequelize);
const MovimientoInventario = MovimientoInventarioModel(sequelize); // ← NUEVO
const CajaInventario = CajaInventarioModel(sequelize); // ← NUEVO
const PlantillaEmail = PlantillaEmailModel(sequelize);
const Rol = RolModel(sequelize);
const Permiso = PermisoModel(sequelize);
const RolPermiso = RolPermisoModel(sequelize);
const ReporteProgramado = ReporteProgramadoModel(sequelize);
const Vehiculo = VehiculoModel(sequelize);
const CajaMenor = CajaMenorModel(sequelize);
const Viaje = ViajeModel(sequelize);
const MovimientoCajaMenor = MovimientoCajaMenorModel(sequelize);

// ============================================
// DEFINIR ASOCIACIONES
// ============================================

// Cliente <-> Contacto (1:N)
Cliente.hasMany(Contacto, {
  foreignKey: 'cliente_id',
  as: 'contactos',
  onDelete: 'CASCADE'
});
Contacto.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

// Cliente <-> Inventario (1:N)
Cliente.hasMany(Inventario, {
  foreignKey: 'cliente_id',
  as: 'inventario',
  onDelete: 'CASCADE'
});
Inventario.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

// Cliente <-> Operación (1:N)
Cliente.hasMany(Operacion, {
  foreignKey: 'cliente_id',
  as: 'operaciones',
  onDelete: 'RESTRICT'
});
Operacion.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

// Usuario <-> Operación (creador)
Usuario.hasMany(Operacion, {
  foreignKey: 'creado_por',
  as: 'operaciones_creadas'
});
Operacion.belongsTo(Usuario, {
  foreignKey: 'creado_por',
  as: 'creador'
});

// Usuario <-> Operación (cerrador)
Usuario.hasMany(Operacion, {
  foreignKey: 'cerrado_por',
  as: 'operaciones_cerradas'
});
Operacion.belongsTo(Usuario, {
  foreignKey: 'cerrado_por',
  as: 'cerrador'
});

// Operación <-> OperacionDetalle (1:N)
Operacion.hasMany(OperacionDetalle, {
  foreignKey: 'operacion_id',
  as: 'detalles',
  onDelete: 'CASCADE'
});
OperacionDetalle.belongsTo(Operacion, {
  foreignKey: 'operacion_id',
  as: 'operacion'
});

// Operación <-> OperacionAveria (1:N)
Operacion.hasMany(OperacionAveria, {
  foreignKey: 'operacion_id',
  as: 'averias',
  onDelete: 'CASCADE'
});
OperacionAveria.belongsTo(Operacion, {
  foreignKey: 'operacion_id',
  as: 'operacion'
});

// OperacionDetalle <-> OperacionAveria (1:N)
OperacionDetalle.hasMany(OperacionAveria, {
  foreignKey: 'detalle_id',
  as: 'evidencias_averia'
});
OperacionAveria.belongsTo(OperacionDetalle, {
  foreignKey: 'detalle_id',
  as: 'detalle'
});

// Usuario <-> OperacionAveria (registrado por)
Usuario.hasMany(OperacionAveria, {
  foreignKey: 'registrado_por',
  as: 'averias_registradas'
});
OperacionAveria.belongsTo(Usuario, {
  foreignKey: 'registrado_por',
  as: 'registrador'
});

// Operación <-> OperacionDocumento (1:N)
Operacion.hasMany(OperacionDocumento, {
  foreignKey: 'operacion_id',
  as: 'documentos',
  onDelete: 'CASCADE'
});
OperacionDocumento.belongsTo(Operacion, {
  foreignKey: 'operacion_id',
  as: 'operacion'
});

// Usuario <-> OperacionDocumento (subido por)
Usuario.hasMany(OperacionDocumento, {
  foreignKey: 'subido_por',
  as: 'documentos_subidos'
});
OperacionDocumento.belongsTo(Usuario, {
  foreignKey: 'subido_por',
  as: 'usuario_subio'
});

// Usuario <-> Auditoría (1:N)
Usuario.hasMany(Auditoria, {
  foreignKey: 'usuario_id',
  as: 'acciones'
});
Auditoria.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// ============================================
// NUEVAS ASOCIACIONES - MovimientoInventario
// ============================================

// Inventario <-> MovimientoInventario (1:N)
Inventario.hasMany(MovimientoInventario, {
  foreignKey: 'inventario_id',
  as: 'movimientos',
  onDelete: 'CASCADE'
});
MovimientoInventario.belongsTo(Inventario, {
  foreignKey: 'inventario_id',
  as: 'inventario'
});

// Usuario <-> MovimientoInventario (1:N)
Usuario.hasMany(MovimientoInventario, {
  foreignKey: 'usuario_id',
  as: 'movimientos_inventario'
});
MovimientoInventario.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// Operacion <-> MovimientoInventario (1:N) - Opcional
Operacion.hasMany(MovimientoInventario, {
  foreignKey: 'operacion_id',
  as: 'movimientos_inventario'
});
MovimientoInventario.belongsTo(Operacion, {
  foreignKey: 'operacion_id',
  as: 'operacion'
});

// ============================================
// ASOCIACIONES - CajaInventario
// ============================================

// Inventario <-> CajaInventario (1:N)
Inventario.hasMany(CajaInventario, {
  foreignKey: 'inventario_id',
  as: 'cajas',
  onDelete: 'CASCADE'
});
CajaInventario.belongsTo(Inventario, {
  foreignKey: 'inventario_id',
  as: 'inventario'
});

// Operacion <-> CajaInventario (1:N)
Operacion.hasMany(CajaInventario, {
  foreignKey: 'operacion_id',
  as: 'cajas',
  onDelete: 'SET NULL'
});
CajaInventario.belongsTo(Operacion, {
  foreignKey: 'operacion_id',
  as: 'operacion'
});

// OperacionDetalle <-> CajaInventario (1:1)
OperacionDetalle.hasOne(CajaInventario, {
  foreignKey: 'operacion_detalle_id',
  as: 'caja'
});
CajaInventario.belongsTo(OperacionDetalle, {
  foreignKey: 'operacion_detalle_id',
  as: 'detalle'
});

Notificacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Notificacion, { foreignKey: 'usuario_id', as: 'notificaciones' });

// Usuario <-> Usuario (invitaciones)
Usuario.belongsTo(Usuario, {
  foreignKey: 'invitado_por',
  as: 'usuarioInvitador'
});

Usuario.hasMany(Usuario, {
  foreignKey: 'invitado_por',
  as: 'usuariosInvitados'
});

// Usuario <-> Cliente (para usuarios tipo cliente)
Usuario.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

// ============================================
// ASOCIACIONES - Roles y Permisos
// ============================================

// Rol <-> Permiso (N:M a través de RolPermiso)
Rol.belongsToMany(Permiso, {
  through: RolPermiso,
  foreignKey: 'rol_id',
  otherKey: 'permiso_id',
  as: 'permisos'
});
Permiso.belongsToMany(Rol, {
  through: RolPermiso,
  foreignKey: 'permiso_id',
  otherKey: 'rol_id',
  as: 'roles'
});

// Usuario <-> Rol (N:1)
Usuario.belongsTo(Rol, {
  foreignKey: 'rol_id',
  as: 'rolInfo'
});
Rol.hasMany(Usuario, {
  foreignKey: 'rol_id',
  as: 'usuarios'
});

// ReporteProgramado <-> Usuario y Cliente
ReporteProgramado.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });
ReporteProgramado.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// ============================================
// ASOCIACIONES - Módulo de Viajes
// ============================================

// Vehículo <-> Usuario (conductor asignado)
Vehiculo.belongsTo(Usuario, { foreignKey: 'conductor_id', as: 'conductor' });
Usuario.hasMany(Vehiculo, { foreignKey: 'conductor_id', as: 'vehiculos' });

// CajaMenor <-> Usuario (conductor)
CajaMenor.belongsTo(Usuario, { foreignKey: 'conductor_id', as: 'conductor' });
Usuario.hasMany(CajaMenor, { foreignKey: 'conductor_id', as: 'cajas_menores' });

// CajaMenor <-> Usuario (creador)
CajaMenor.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });

// CajaMenor <-> Usuario (cerrador)
CajaMenor.belongsTo(Usuario, { foreignKey: 'cerrada_por', as: 'cerrador' });

// CajaMenor <-> CajaMenor (caja anterior - traslado de sobrante)
CajaMenor.belongsTo(CajaMenor, { foreignKey: 'caja_anterior_id', as: 'cajaAnterior' });
CajaMenor.hasOne(CajaMenor, { foreignKey: 'caja_anterior_id', as: 'cajaSiguiente' });

// CajaMenor <-> Viaje (1:N)
CajaMenor.hasMany(Viaje, { foreignKey: 'caja_menor_id', as: 'viajes', onDelete: 'SET NULL' });
Viaje.belongsTo(CajaMenor, { foreignKey: 'caja_menor_id', as: 'cajaMenor' });

// Viaje <-> Vehículo (N:1)
Viaje.belongsTo(Vehiculo, { foreignKey: 'vehiculo_id', as: 'vehiculo' });
Vehiculo.hasMany(Viaje, { foreignKey: 'vehiculo_id', as: 'viajes' });

// Viaje <-> Usuario (conductor)
Viaje.belongsTo(Usuario, { foreignKey: 'conductor_id', as: 'conductor' });

// CajaMenor <-> MovimientoCajaMenor (1:N)
CajaMenor.hasMany(MovimientoCajaMenor, { foreignKey: 'caja_menor_id', as: 'movimientos', onDelete: 'CASCADE' });
MovimientoCajaMenor.belongsTo(CajaMenor, { foreignKey: 'caja_menor_id', as: 'cajaMenor' });

// Viaje <-> MovimientoCajaMenor (1:N - gastos del viaje)
Viaje.hasMany(MovimientoCajaMenor, { foreignKey: 'viaje_id', as: 'gastos', onDelete: 'SET NULL' });
MovimientoCajaMenor.belongsTo(Viaje, { foreignKey: 'viaje_id', as: 'viaje' });

// MovimientoCajaMenor <-> Usuario (conductor que registró)
MovimientoCajaMenor.belongsTo(Usuario, { foreignKey: 'conductor_id', as: 'conductor' });

// MovimientoCajaMenor <-> Usuario (aprobado por)
MovimientoCajaMenor.belongsTo(Usuario, { foreignKey: 'aprobado_por', as: 'aprobador' });

// ============================================
// EXPORTAR MODELOS
// ============================================

const db = {
  sequelize,
  Sequelize: require('sequelize'),

  // Modelos
  Usuario,
  Cliente,
  Contacto,
  Auditoria,
  Inventario,
  Operacion,
  OperacionDetalle,
  OperacionAveria,
  OperacionDocumento,
  NotificacionEmail,
  MovimientoInventario,
  CajaInventario,  // ← NUEVO: Cajas individuales
  PlantillaEmail,
  Notificacion,
  Rol,
  Permiso,
  RolPermiso,
  ReporteProgramado,
  Vehiculo,
  CajaMenor,
  Viaje,
  MovimientoCajaMenor
};

/**
 * Sincronizar modelos con la base de datos
 */
db.syncModels = async (options = {}) => {
  try {
    const defaultOptions = {
      alter: process.env.NODE_ENV === 'development',
      force: false
    };

    await sequelize.sync({ ...defaultOptions, ...options });
    logger.info('✅ Modelos sincronizados con la base de datos');
    return true;
  } catch (error) {
    logger.error('❌ Error al sincronizar modelos:', { message: error.message });
    throw error;
  }
};

module.exports = db;