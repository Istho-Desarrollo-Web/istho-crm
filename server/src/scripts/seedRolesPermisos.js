/**
 * ISTHO CRM - Seed de Roles y Permisos
 *
 * Crea los roles base del sistema y el catálogo completo de permisos.
 * Luego migra los usuarios existentes (campo `rol` string) a `rol_id` FK.
 *
 * SEGURO DE EJECUTAR MÚLTIPLES VECES (idempotente).
 *
 * Uso: node src/scripts/seedRolesPermisos.js
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

require('dotenv').config();
const { sequelize, Rol, Permiso, RolPermiso, Usuario } = require('../models');

// ═══════════════════════════════════════════════════════════════════════════
// ROLES BASE
// ═══════════════════════════════════════════════════════════════════════════

const ROLES_BASE = [
  {
    codigo: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema',
    nivel_jerarquia: 100,
    es_sistema: true,
    es_cliente: false,
    color: '#EF4444',
  },
  {
    codigo: 'supervisor',
    nombre: 'Supervisor',
    descripcion: 'Gestión operativa completa',
    nivel_jerarquia: 75,
    es_sistema: true,
    es_cliente: false,
    color: '#F59E0B',
  },
  {
    codigo: 'financiera',
    nombre: 'Financiera',
    descripcion: 'Gestión financiera, cajas menores y aprobación de gastos',
    nivel_jerarquia: 70,
    es_sistema: true,
    es_cliente: false,
    color: '#10B981',
  },
  {
    codigo: 'operador',
    nombre: 'Operador',
    descripcion: 'Operaciones diarias de bodega',
    nivel_jerarquia: 50,
    es_sistema: true,
    es_cliente: false,
    color: '#3B82F6',
  },
  {
    codigo: 'conductor',
    nombre: 'Conductor',
    descripcion: 'Registro de viajes, gastos y soportes',
    nivel_jerarquia: 30,
    es_sistema: true,
    es_cliente: false,
    color: '#F97316',
  },
  {
    codigo: 'cliente',
    nombre: 'Portal Cliente',
    descripcion: 'Acceso limitado a información propia',
    nivel_jerarquia: 10,
    es_sistema: true,
    es_cliente: true,
    color: '#8B5CF6',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PERMISOS (10 módulos, 42 permisos)
// ═══════════════════════════════════════════════════════════════════════════

const PERMISOS_CATALOGO = [
  // Dashboard
  {
    modulo: 'dashboard',
    accion: 'ver',
    descripcion: 'Ver dashboard y estadísticas',
    grupo: 'General',
  },
  {
    modulo: 'dashboard',
    accion: 'exportar',
    descripcion: 'Exportar datos del dashboard',
    grupo: 'General',
  },

  // Clientes
  {
    modulo: 'clientes',
    accion: 'ver',
    descripcion: 'Ver listado y detalle de clientes',
    grupo: 'Gestión',
  },
  { modulo: 'clientes', accion: 'crear', descripcion: 'Crear nuevos clientes', grupo: 'Gestión' },
  {
    modulo: 'clientes',
    accion: 'editar',
    descripcion: 'Modificar datos de clientes',
    grupo: 'Gestión',
  },
  {
    modulo: 'clientes',
    accion: 'eliminar',
    descripcion: 'Eliminar clientes (soft delete)',
    grupo: 'Gestión',
  },
  {
    modulo: 'clientes',
    accion: 'exportar',
    descripcion: 'Exportar listado de clientes',
    grupo: 'Gestión',
  },
  {
    modulo: 'clientes',
    accion: 'importar',
    descripcion: 'Importar clientes desde Excel',
    grupo: 'Gestión',
  },

  // Inventario
  {
    modulo: 'inventario',
    accion: 'ver',
    descripcion: 'Ver productos e inventario',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'crear',
    descripcion: 'Crear nuevos productos',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'editar',
    descripcion: 'Modificar productos existentes',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'eliminar',
    descripcion: 'Eliminar productos',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'ajustar',
    descripcion: 'Ajustar cantidades de stock',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'exportar',
    descripcion: 'Exportar inventario Excel/PDF',
    grupo: 'Operaciones',
  },
  {
    modulo: 'inventario',
    accion: 'alertas',
    descripcion: 'Ver alertas de inventario (stock bajo, vencimientos)',
    grupo: 'Operaciones',
  },

  // Operaciones (Entradas, Salidas y Kardex desde WMS)
  {
    modulo: 'operaciones',
    accion: 'ver',
    descripcion: 'Ver Entradas, Salidas y Kardex y su detalle',
    grupo: 'Operaciones',
  },
  {
    modulo: 'operaciones',
    accion: 'exportar',
    descripcion: 'Exportar datos de operaciones Excel/PDF',
    grupo: 'Operaciones',
  },
  {
    modulo: 'operaciones',
    accion: 'reenviar_correo',
    descripcion: 'Reenviar correo de cierre de operación',
    grupo: 'Operaciones',
  },

  // Reportes
  { modulo: 'reportes', accion: 'ver', descripcion: 'Ver módulo de reportes', grupo: 'General' },
  {
    modulo: 'reportes',
    accion: 'crear',
    descripcion: 'Crear y programar reportes',
    grupo: 'General',
  },
  {
    modulo: 'reportes',
    accion: 'exportar',
    descripcion: 'Descargar reportes Excel/PDF',
    grupo: 'General',
  },

  // Plantillas de email
  {
    modulo: 'plantillas_email',
    accion: 'ver',
    descripcion: 'Ver plantillas de email',
    grupo: 'Sistema',
  },
  {
    modulo: 'plantillas_email',
    accion: 'crear',
    descripcion: 'Crear plantillas de email',
    grupo: 'Sistema',
  },
  {
    modulo: 'plantillas_email',
    accion: 'editar',
    descripcion: 'Editar plantillas de email',
    grupo: 'Sistema',
  },
  {
    modulo: 'plantillas_email',
    accion: 'eliminar',
    descripcion: 'Eliminar plantillas de email',
    grupo: 'Sistema',
  },

  // Usuarios
  { modulo: 'usuarios', accion: 'ver', descripcion: 'Ver listado de usuarios', grupo: 'Sistema' },
  {
    modulo: 'usuarios',
    accion: 'crear',
    descripcion: 'Crear usuarios del sistema',
    grupo: 'Sistema',
  },
  {
    modulo: 'usuarios',
    accion: 'editar',
    descripcion: 'Modificar usuarios y asignar roles',
    grupo: 'Sistema',
  },
  { modulo: 'usuarios', accion: 'eliminar', descripcion: 'Desactivar usuarios', grupo: 'Sistema' },

  // Roles
  { modulo: 'roles', accion: 'ver', descripcion: 'Ver roles del sistema', grupo: 'Sistema' },
  { modulo: 'roles', accion: 'crear', descripcion: 'Crear roles personalizados', grupo: 'Sistema' },
  {
    modulo: 'roles',
    accion: 'editar',
    descripcion: 'Modificar permisos de roles',
    grupo: 'Sistema',
  },
  {
    modulo: 'roles',
    accion: 'eliminar',
    descripcion: 'Eliminar roles no-sistema',
    grupo: 'Sistema',
  },

  // Auditoría (completar datos de una operación — "Cerrar CRM")
  {
    modulo: 'auditoria',
    accion: 'ver',
    descripcion: 'Completar datos de una operación (Cerrar CRM)',
    grupo: 'Operaciones',
  },

  // Configuración
  {
    modulo: 'configuracion',
    accion: 'ver',
    descripcion: 'Ver configuración del sistema',
    grupo: 'Sistema',
  },
  {
    modulo: 'configuracion',
    accion: 'editar',
    descripcion: 'Modificar configuración',
    grupo: 'Sistema',
  },

  // Configuración WMS
  {
    modulo: 'configuracion_wms',
    accion: 'ver',
    descripcion: 'Ver configuración de integración WMS',
    grupo: 'Sistema',
  },
  {
    modulo: 'configuracion_wms',
    accion: 'crear',
    descripcion: 'Crear reglas de mapeo WMS',
    grupo: 'Sistema',
  },
  {
    modulo: 'configuracion_wms',
    accion: 'editar',
    descripcion: 'Editar configuración WMS',
    grupo: 'Sistema',
  },
  {
    modulo: 'configuracion_wms',
    accion: 'eliminar',
    descripcion: 'Eliminar reglas de mapeo WMS',
    grupo: 'Sistema',
  },

  // Notificaciones
  {
    modulo: 'notificaciones',
    accion: 'ver',
    descripcion: 'Ver notificaciones y alertas',
    grupo: 'General',
  },
  {
    modulo: 'notificaciones',
    accion: 'crear',
    descripcion: 'Crear notificaciones/alertas',
    grupo: 'General',
  },
  {
    modulo: 'notificaciones',
    accion: 'editar',
    descripcion: 'Gestionar notificaciones',
    grupo: 'General',
  },
  {
    modulo: 'notificaciones',
    accion: 'eliminar',
    descripcion: 'Eliminar notificaciones',
    grupo: 'General',
  },
  {
    modulo: 'notificaciones',
    accion: 'enviar',
    descripcion: 'Enviar emails manuales',
    grupo: 'General',
  },

  // Vehículos
  { modulo: 'vehiculos', accion: 'ver', descripcion: 'Ver listado de vehículos', grupo: 'Viajes' },
  { modulo: 'vehiculos', accion: 'crear', descripcion: 'Registrar vehículos', grupo: 'Viajes' },
  {
    modulo: 'vehiculos',
    accion: 'editar',
    descripcion: 'Modificar datos de vehículos',
    grupo: 'Viajes',
  },
  { modulo: 'vehiculos', accion: 'eliminar', descripcion: 'Eliminar vehículos', grupo: 'Viajes' },

  // Viajes
  { modulo: 'viajes', accion: 'ver', descripcion: 'Ver listado de viajes', grupo: 'Viajes' },
  { modulo: 'viajes', accion: 'crear', descripcion: 'Registrar viajes', grupo: 'Viajes' },
  { modulo: 'viajes', accion: 'editar', descripcion: 'Modificar viajes', grupo: 'Viajes' },
  { modulo: 'viajes', accion: 'eliminar', descripcion: 'Eliminar viajes', grupo: 'Viajes' },
  {
    modulo: 'viajes',
    accion: 'exportar',
    descripcion: 'Exportar viajes Excel/PDF',
    grupo: 'Viajes',
  },

  // Caja Menor
  { modulo: 'caja_menor', accion: 'ver', descripcion: 'Ver cajas menores', grupo: 'Viajes' },
  { modulo: 'caja_menor', accion: 'crear', descripcion: 'Crear cajas menores', grupo: 'Viajes' },
  {
    modulo: 'caja_menor',
    accion: 'editar',
    descripcion: 'Modificar cajas menores',
    grupo: 'Viajes',
  },
  {
    modulo: 'caja_menor',
    accion: 'cerrar',
    descripcion: 'Cerrar/cuadrar cajas menores',
    grupo: 'Viajes',
  },
  {
    modulo: 'caja_menor',
    accion: 'aprobar',
    descripcion: 'Aprobar/rechazar gastos de caja menor',
    grupo: 'Viajes',
  },
  {
    modulo: 'caja_menor',
    accion: 'eliminar',
    descripcion: 'Eliminar cajas menores',
    grupo: 'Viajes',
  },
  {
    modulo: 'caja_menor',
    accion: 'exportar',
    descripcion: 'Exportar cajas menores',
    grupo: 'Viajes',
  },

  // Movimientos Caja Menor
  {
    modulo: 'movimientos',
    accion: 'ver',
    descripcion: 'Ver movimientos de caja menor',
    grupo: 'Viajes',
  },
  {
    modulo: 'movimientos',
    accion: 'crear',
    descripcion: 'Registrar gastos/ingresos',
    grupo: 'Viajes',
  },
  {
    modulo: 'movimientos',
    accion: 'editar',
    descripcion: 'Modificar movimientos',
    grupo: 'Viajes',
  },
  {
    modulo: 'movimientos',
    accion: 'eliminar',
    descripcion: 'Eliminar movimientos',
    grupo: 'Viajes',
  },
  {
    modulo: 'movimientos',
    accion: 'aprobar',
    descripcion: 'Aprobar/rechazar movimientos',
    grupo: 'Viajes',
  },

  // Solicitudes de clientes
  { modulo: 'solicitudes', accion: 'ver', descripcion: 'Ver solicitudes de clientes', grupo: 'Gestión' },
  { modulo: 'solicitudes', accion: 'crear', descripcion: 'Crear solicitudes', grupo: 'Gestión' },
  { modulo: 'solicitudes', accion: 'comentar', descripcion: 'Comentar y gestionar solicitudes', grupo: 'Gestión' },
  { modulo: 'solicitudes', accion: 'exportar', descripcion: 'Exportar reporte de solicitudes', grupo: 'Gestión' },

  // Contactos (directorio global)
  { modulo: 'contactos', accion: 'ver', descripcion: 'Ver directorio de contactos', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'crear', descripcion: 'Crear contactos en el directorio', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'editar', descripcion: 'Editar contactos y asignaciones', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'eliminar', descripcion: 'Desactivar contactos del directorio', grupo: 'Gestión' },

  // Perfil (disponible para todos los roles)
  { modulo: 'perfil', accion: 'ver', descripcion: 'Ver y editar perfil propio', grupo: 'General' },
  {
    modulo: 'perfil',
    accion: 'cambiar_password',
    descripcion: 'Cambiar contraseña propia',
    grupo: 'General',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PERMISOS POR ROL (qué permisos tiene cada rol base)
// ═══════════════════════════════════════════════════════════════════════════

const PERMISOS_POR_ROL = {
  // Admin: TODOS los permisos
  admin: '*',

  supervisor: {
    dashboard: ['ver', 'exportar'],
    clientes: ['ver'],
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'exportar', 'alertas'],
    operaciones: ['ver', 'exportar', 'reenviar_correo'],
    auditoria: ['ver'],
    reportes: ['ver', 'crear', 'exportar'],
    plantillas_email: ['ver'],
    usuarios: ['ver'],
    configuracion: ['ver', 'editar'],
    configuracion_wms: ['ver'],
    notificaciones: ['ver', 'enviar'],
    vehiculos: ['ver', 'crear', 'editar', 'eliminar'],
    viajes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    caja_menor: ['ver', 'crear', 'editar', 'cerrar', 'aprobar', 'eliminar', 'exportar'],
    movimientos: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    solicitudes: ['ver', 'comentar', 'exportar'],
    contactos: ['ver', 'crear', 'editar', 'eliminar'],
    perfil: ['ver', 'cambiar_password'],
  },

  financiera: {
    dashboard: ['ver'],
    clientes: ['ver'],
    reportes: ['ver', 'crear', 'exportar'],
    configuracion: ['ver', 'editar'],
    notificaciones: ['ver'],
    vehiculos: ['ver', 'crear', 'editar'],
    viajes: ['ver', 'exportar'],
    caja_menor: ['ver', 'crear', 'editar', 'cerrar', 'aprobar', 'exportar'],
    movimientos: ['ver', 'crear', 'editar', 'aprobar'],
    perfil: ['ver', 'cambiar_password'],
  },

  operador: {
    dashboard: ['ver'],
    clientes: ['ver'],
    inventario: ['ver', 'alertas'],
    operaciones: ['ver', 'exportar', 'reenviar_correo'],
    auditoria: ['ver'],
    reportes: ['ver', 'exportar'],
    configuracion: ['ver', 'editar'],
    notificaciones: ['ver'],
    caja_menor: ['ver'],
    movimientos: ['ver', 'crear', 'editar'],
    solicitudes: ['ver', 'comentar'],
    perfil: ['ver', 'cambiar_password'],
  },

  conductor: {
    dashboard: ['ver'],
    configuracion: ['ver', 'editar'],
    notificaciones: ['ver'],
    vehiculos: ['ver'],
    viajes: ['ver', 'crear', 'editar'],
    caja_menor: ['ver'],
    movimientos: ['ver', 'crear', 'editar'],
    perfil: ['ver', 'cambiar_password'],
  },

  cliente: {
    dashboard: ['ver'],
    inventario: ['ver', 'alertas'],
    operaciones: ['ver'],
    clientes: ['ver'],
    reportes: ['ver', 'exportar'],
    configuracion: ['ver', 'editar'],
    notificaciones: ['ver'],
    solicitudes: ['ver', 'crear', 'comentar'],
    perfil: ['ver', 'cambiar_password'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════

async function seed({ standalone = true } = {}) {
  try {
    if (standalone) {
      await sequelize.authenticate();
      console.log('Conectado a la base de datos.\n');
    }

    // 1. Sincronizar tablas nuevas
    await Rol.sync({ alter: true });
    await Permiso.sync({ alter: true });
    await RolPermiso.sync({ alter: true });
    // sync de usuarios deshabilitando FK checks temporalmente para evitar el error
    // errno 22 al re-crear la FK auto-referencial de invitado_por en MySQL.
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await Usuario.sync({ alter: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Tablas sincronizadas.\n');

    // 2. Crear/actualizar roles base
    console.log('=== ROLES ===');
    const rolesMap = {};
    for (const rolData of ROLES_BASE) {
      const [rol, created] = await Rol.findOrCreate({
        where: { codigo: rolData.codigo },
        defaults: rolData,
      });
      if (!created) {
        // Actualizar campos si ya existe (excepto código)
        await rol.update({
          nombre: rolData.nombre,
          descripcion: rolData.descripcion,
          nivel_jerarquia: rolData.nivel_jerarquia,
          es_sistema: rolData.es_sistema,
          es_cliente: rolData.es_cliente,
          color: rolData.color,
        });
      }
      rolesMap[rol.codigo] = rol;
      console.log(`  ${created ? '+' : '~'} ${rol.nombre} (nivel ${rol.nivel_jerarquia})`);
    }

    // 3. Crear/actualizar permisos
    console.log('\n=== PERMISOS ===');
    const permisosMap = {};
    for (const permData of PERMISOS_CATALOGO) {
      const [perm, created] = await Permiso.findOrCreate({
        where: { modulo: permData.modulo, accion: permData.accion },
        defaults: permData,
      });
      if (!created) {
        await perm.update({ descripcion: permData.descripcion, grupo: permData.grupo });
      }
      permisosMap[`${perm.modulo}.${perm.accion}`] = perm;
      if (created) console.log(`  + ${perm.modulo}.${perm.accion}`);
    }
    console.log(`  Total: ${Object.keys(permisosMap).length} permisos`);

    // 4. Asignar permisos a roles
    console.log('\n=== ASIGNACIÓN ROL-PERMISOS ===');
    for (const [codigoRol, permisosConfig] of Object.entries(PERMISOS_POR_ROL)) {
      const rol = rolesMap[codigoRol];
      if (!rol) continue;

      let permisoIds = [];

      if (permisosConfig === '*') {
        // Admin: todos los permisos
        permisoIds = Object.values(permisosMap).map((p) => p.id);
      } else {
        // Mapear módulo.acción a IDs
        for (const [modulo, acciones] of Object.entries(permisosConfig)) {
          for (const accion of acciones) {
            const key = `${modulo}.${accion}`;
            if (permisosMap[key]) {
              permisoIds.push(permisosMap[key].id);
            }
          }
        }
      }

      // Limpiar asignaciones existentes y reasignar
      await RolPermiso.destroy({ where: { rol_id: rol.id } });
      if (permisoIds.length > 0) {
        const records = permisoIds.map((pid) => ({ rol_id: rol.id, permiso_id: pid }));
        await RolPermiso.bulkCreate(records);
      }
      console.log(`  ${rol.nombre}: ${permisoIds.length} permisos asignados`);
    }

    // 5. Migrar usuarios existentes: campo `rol` → `rol_id`
    console.log('\n=== MIGRACIÓN USUARIOS ===');
    const usuarios = await Usuario.findAll({ where: { rol_id: null } });
    let migrados = 0;

    for (const usuario of usuarios) {
      const codigoRol = usuario.rol || 'operador';
      const rol = rolesMap[codigoRol];
      if (rol) {
        await usuario.update({ rol_id: rol.id });
        migrados++;
      } else {
        console.log(`  ! Usuario ${usuario.username} tiene rol "${codigoRol}" sin mapeo`);
      }
    }
    console.log(`  ${migrados} usuarios migrados a rol_id`);

    console.log('\n Seed completado exitosamente.');
    if (standalone) process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    if (standalone) process.exit(1);
    throw error;
  }
}

module.exports = seed;
if (require.main === module) {
  seed({ standalone: true });
}
