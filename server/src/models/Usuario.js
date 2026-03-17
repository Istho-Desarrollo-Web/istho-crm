/**
 * ============================================================================
 * ISTHO CRM - Modelo Usuario
 * ============================================================================
 * 
 * Gestiona los usuarios del sistema con autenticación JWT.
 * Incluye hash de contraseñas y control de acceso por roles.
 * 
 * ACTUALIZACIÓN v2.0.0:
 * - Agregado cliente_id para usuarios de cliente
 * - Agregado permisos_cliente (JSON) para control granular
 * - Agregado campos de auditoría: invitado_por, fecha_invitacion
 * - Métodos para validar permisos de cliente
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE PERMISOS PARA CLIENTES
// ════════════════════════════════════════════════════════════════════════════

const PERMISOS_CLIENTE_DEFAULT = {
  inventario: { ver: true, exportar: false, alertas: true },
  despachos: { ver: true, crear_solicitud: false, descargar_documentos: true },
  reportes: { ver: true, descargar: false },
  facturacion: { ver: true, descargar: true },
  perfil: { editar: true, cambiar_password: true }
};

const PERMISOS_CLIENTE_CATALOGO = {
  inventario: [
    { codigo: 'ver', nombre: 'Ver inventario', descripcion: 'Permite ver el inventario de productos' },
    { codigo: 'exportar', nombre: 'Exportar inventario', descripcion: 'Permite exportar el inventario a Excel' },
    { codigo: 'alertas', nombre: 'Ver alertas de stock', descripcion: 'Permite ver alertas de stock bajo y vencimientos' }
  ],
  despachos: [
    { codigo: 'ver', nombre: 'Ver despachos', descripcion: 'Permite ver las operaciones de ingreso/salida' },
    { codigo: 'crear_solicitud', nombre: 'Crear solicitudes', descripcion: 'Permite crear solicitudes de despacho' },
    { codigo: 'descargar_documentos', nombre: 'Descargar documentos', descripcion: 'Permite descargar cumplidos y documentos' }
  ],
  reportes: [
    { codigo: 'ver', nombre: 'Ver reportes', descripcion: 'Permite ver reportes y estadísticas' },
    { codigo: 'descargar', nombre: 'Descargar reportes', descripcion: 'Permite descargar reportes en PDF/Excel' }
  ],
  facturacion: [
    { codigo: 'ver', nombre: 'Ver facturación', descripcion: 'Permite ver facturas y estado de cuenta' },
    { codigo: 'descargar', nombre: 'Descargar facturas', descripcion: 'Permite descargar facturas en PDF' }
  ],
  perfil: [
    { codigo: 'editar', nombre: 'Editar perfil', descripcion: 'Permite editar su información de perfil' },
    { codigo: 'cambiar_password', nombre: 'Cambiar contraseña', descripcion: 'Permite cambiar su contraseña' }
  ]
};

// Permisos por rol interno
const PERMISOS_ROL = {
  admin: null, // Admin tiene todos los permisos
  supervisor: {
    inventario: ['ver', 'crear', 'editar', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'cerrar'],
    clientes: ['ver', 'crear', 'editar'],
    reportes: ['ver', 'descargar'],
    usuarios: ['ver']
  },
  operador: {
    inventario: ['ver'],
    despachos: ['ver', 'crear', 'editar'],
    clientes: ['ver'],
    reportes: ['ver']
  }
};

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { msg: 'Este nombre de usuario ya está en uso' },
      validate: {
        notEmpty: { msg: 'El username es requerido' },
        len: { args: [3, 50], msg: 'El username debe tener entre 3 y 50 caracteres' },
        isAlphanumeric: { msg: 'El username solo puede contener letras y números' }
      }
    },
    
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: { msg: 'Este email ya está registrado' },
      validate: {
        notEmpty: { msg: 'El email es requerido' },
        isEmail: { msg: 'Debe ser un email válido' }
      }
    },
    
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // CAMPOS DE PERFIL
    // ═══════════════════════════════════════════════════════════════════════
    
    nombre: {
      type: DataTypes.STRING(75),
      allowNull: true
    },
    
    apellido: {
      type: DataTypes.STRING(75),
      allowNull: true
    },
    
    nombre_completo: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Operaciones'
    },
    
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // CAMPOS DE CONTROL Y ROL
    // ═══════════════════════════════════════════════════════════════════════
    
    rol: {
      type: DataTypes.STRING(30),
      defaultValue: 'operador',
      comment: 'Código del rol (legacy, se mantiene por compatibilidad)'
    },

    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK a tabla roles (sistema dinámico de roles)'
    },
    
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // CAMPOS PARA USUARIOS DE CLIENTE (NUEVO v2.0.0)
    // ═══════════════════════════════════════════════════════════════════════
    
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del cliente (solo para rol=cliente)'
    },
    
    permisos_cliente: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Permisos específicos para usuarios tipo cliente',
      get() {
        const val = this.getDataValue('permisos_cliente');
        if (!val) return null;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return null; }
        }
        return val;
      }
    },

    permisos_personalizados: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Permisos personalizados por usuario (override de rol). Array de permiso_ids o null para usar permisos del rol',
      get() {
        const val = this.getDataValue('permisos_personalizados');
        if (!val) return null;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return null; }
        }
        return val;
      }
    },
    
    requiere_cambio_password: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Forzar cambio en primer login'
    },
    
    invitado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que creó la invitación'
    },
    
    fecha_invitacion: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de creación de la cuenta'
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // CAMPOS DE SEGURIDAD
    // ═══════════════════════════════════════════════════════════════════════
    
    ultimo_acceso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    intentos_fallidos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    bloqueado_hasta: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'usuarios',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['rol'] },
      { fields: ['activo'] },
      { fields: ['cliente_id'] },
      { fields: ['rol', 'cliente_id'] },
      { fields: ['rol_id'] }
    ],
    
    hooks: {
      beforeCreate: async (usuario) => {
        // Hash password
        if (usuario.password_hash && !usuario.password_hash.startsWith('$2')) {
          const salt = await bcrypt.genSalt(12);
          usuario.password_hash = await bcrypt.hash(usuario.password_hash, salt);
        }
        // Sincronizar nombre_completo
        usuario.sincronizarNombreCompleto();
        // Normalizar email
        if (usuario.email) {
          usuario.email = usuario.email.toLowerCase();
        }
      },
      
      beforeUpdate: async (usuario) => {
        // Hash password si cambió
        if (usuario.changed('password_hash') && !usuario.password_hash.startsWith('$2')) {
          const salt = await bcrypt.genSalt(12);
          usuario.password_hash = await bcrypt.hash(usuario.password_hash, salt);
        }
        // Sincronizar nombre_completo si cambió nombre o apellido
        if (usuario.changed('nombre') || usuario.changed('apellido')) {
          usuario.sincronizarNombreCompleto();
        }
        // Normalizar email
        if (usuario.changed('email') && usuario.email) {
          usuario.email = usuario.email.toLowerCase();
        }
      }
    }
  });
  
  // ════════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE INSTANCIA
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Sincronizar nombre_completo desde nombre y apellido
   */
  Usuario.prototype.sincronizarNombreCompleto = function() {
    if (this.nombre || this.apellido) {
      this.nombre_completo = `${this.nombre || ''} ${this.apellido || ''}`.trim();
    }
  };
  
  /**
   * Verificar contraseña
   */
  Usuario.prototype.verificarPassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };
  
  /**
   * Verificar si el usuario está bloqueado
   */
  Usuario.prototype.estaBloqueado = function() {
    if (!this.bloqueado_hasta) return false;
    return new Date() < new Date(this.bloqueado_hasta);
  };
  
  /**
   * Obtener nombre para mostrar
   */
  Usuario.prototype.getNombreDisplay = function() {
    if (this.nombre || this.apellido) {
      return `${this.nombre || ''} ${this.apellido || ''}`.trim();
    }
    return this.nombre_completo || this.username;
  };
  
  /**
   * Verificar si es usuario interno (no cliente)
   */
  Usuario.prototype.esInterno = function() {
    return !this.cliente_id && this.rol !== 'cliente';
  };
  
  /**
   * Verificar si es usuario de cliente
   */
  Usuario.prototype.esCliente = function() {
    return this.rol === 'cliente' && this.cliente_id !== null;
  };
  
  /**
   * Verificar si es administrador
   */
  Usuario.prototype.esAdmin = function() {
    return this.rol === 'admin';
  };

  /**
   * Verificar si es conductor
   */
  Usuario.prototype.esConductor = function() {
    return this.rol === 'conductor';
  };

  /**
   * Verificar si es financiera
   */
  Usuario.prototype.esFinanciera = function() {
    return this.rol === 'financiera';
  };
  
  /**
   * Verificar si tiene un permiso específico
   * Para usuarios internos, verifica el rol
   * Para usuarios cliente, verifica permisos_cliente
   * 
   * @param {string} modulo - Módulo (inventario, despachos, etc.)
   * @param {string} accion - Acción (ver, crear, editar, eliminar)
   * @returns {boolean}
   */
  /**
   * @param {string} modulo
   * @param {string} accion
   * @param {Object} [permisosDB] - Permisos dinámicos del cache { modulo: ['accion1', ...] }
   */
  Usuario.prototype.tienePermiso = function(modulo, accion, permisosDB) {
    // Admin tiene todos los permisos
    if (this.rol === 'admin') return true;

    // Usuario cliente: verificar permisos_cliente
    if (this.esCliente()) {
      const permisos = this.permisos_cliente || PERMISOS_CLIENTE_DEFAULT;
      if (!permisos[modulo]) return false;
      return permisos[modulo][accion] === true;
    }

    // Usuario interno con permisos personalizados: usar permisosDB personalizado
    if (this.permisos_personalizados) {
      const pp = this.permisos_personalizados;
      // Formato: { modulo: ['accion1', 'accion2'] }
      if (pp[modulo]) {
        return pp[modulo].includes(accion);
      }
      return false;
    }

    // Usuario interno: usar permisos dinámicos de BD si están disponibles
    if (permisosDB) {
      return permisosDB[modulo]?.includes(accion) || false;
    }

    // Fallback a permisos hardcodeados (compatibilidad)
    const permisosRol = PERMISOS_ROL[this.rol];
    if (!permisosRol) return false;
    return permisosRol[modulo]?.includes(accion) || false;
  };
  
  /**
   * Obtener permisos del usuario (para enviar al frontend)
   * @returns {Object}
   */
  /**
   * @param {Object} [permisosDB] - Permisos dinámicos del cache { modulo: ['accion1', ...] }
   */
  Usuario.prototype.getPermisos = function(permisosDB) {
    if (this.rol === 'admin') {
      return {
        esAdmin: true,
        modulos: ['*'],
        acciones: ['*']
      };
    }

    if (this.esCliente()) {
      return {
        esAdmin: false,
        esCliente: true,
        clienteId: this.cliente_id,
        permisos: this.permisos_cliente || PERMISOS_CLIENTE_DEFAULT
      };
    }

    // Usuario interno con permisos personalizados
    if (this.permisos_personalizados) {
      return {
        esAdmin: false,
        esCliente: false,
        rol: this.rol,
        personalizado: true,
        permisos: this.permisos_personalizados
      };
    }

    // Usuario interno: usar permisos dinámicos si están disponibles
    return {
      esAdmin: false,
      esCliente: false,
      rol: this.rol,
      permisos: permisosDB || PERMISOS_ROL[this.rol] || {}
    };
  };
  
  /**
   * Registrar acceso
   */
  Usuario.prototype.registrarAcceso = async function() {
    await this.update({ ultimo_acceso: new Date() });
  };
  
  /**
   * Obtener datos públicos (sin password ni tokens)
   * ÚNICO PUNTO DE VERDAD para datos de usuario
   */
  /**
   * @param {Object} [permisosDB] - Permisos dinámicos del cache
   */
  Usuario.prototype.toPublicJSON = function(permisosDB) {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      nombre: this.nombre || null,
      apellido: this.apellido || null,
      nombre_completo: this.nombre_completo || this.getNombreDisplay(),
      telefono: this.telefono || null,
      cargo: this.cargo || null,
      departamento: this.departamento || 'Operaciones',
      avatar_url: this.avatar_url || null,
      rol: this.rol,
      rol_id: this.rol_id || null,
      activo: this.activo,
      estado: this.activo ? 'activo' : 'inactivo',
      ultimo_acceso: this.ultimo_acceso,
      created_at: this.created_at,
      // Campos de cliente (solo si aplica)
      cliente_id: this.cliente_id || null,
      permisos: this.getPermisos(permisosDB),
      requiere_cambio_password: this.requiere_cambio_password || false
    };
  };
  
  // ════════════════════════════════════════════════════════════════════════════
  // MÉTODOS ESTÁTICOS
  // ════════════════════════════════════════════════════════════════════════════
  
  Usuario.findByEmail = async function(email) {
    return await this.findOne({ where: { email: email.toLowerCase() } });
  };
  
  Usuario.findByUsername = async function(username) {
    return await this.findOne({ where: { username } });
  };
  
  /**
   * Buscar por email o username
   */
  Usuario.findByEmailOrUsername = async function(identificador) {
    return this.findOne({
      where: {
        [Op.or]: [
          { email: identificador.toLowerCase() },
          { username: identificador }
        ]
      }
    });
  };
  
  Usuario.crearConPassword = async function(datos) {
    const { password, ...resto } = datos;
    return await this.create({ ...resto, password_hash: password });
  };
  
  /**
   * Obtener usuarios de un cliente específico
   * @param {number} clienteId - ID del cliente
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<{rows: Array, count: number}>}
   */
  Usuario.getUsuariosCliente = async function(clienteId, options = {}) {
    const { page = 1, limit = 10, activo } = options;
    const offset = (page - 1) * limit;
    
    const where = {
      cliente_id: clienteId,
      rol: 'cliente'
    };
    
    if (activo !== undefined) {
      where.activo = activo;
    }
    
    return this.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
      include: [{
        model: sequelize.models.Usuario,
        as: 'usuarioInvitador',
        attributes: ['id', 'nombre_completo'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };
  
  /**
   * Crear usuario de cliente
   * @param {Object} data - Datos del usuario
   * @param {number} invitadoPorId - ID del usuario que crea
   * @returns {Promise<Usuario>}
   */
  Usuario.crearUsuarioCliente = async function(data, invitadoPorId) {
    const {
      cliente_id,
      nombre_completo,
      email,
      password,
      telefono,
      cargo,
      permisos_cliente
    } = data;
    
    // Generar username a partir del email
    let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (baseUsername.length > 20) baseUsername = baseUsername.substring(0, 20);
    
    let username = baseUsername;
    let contador = 1;
    
    while (await this.findOne({ where: { username } })) {
      username = `${baseUsername}${contador}`;
      contador++;
    }
    
    // Separar nombre y apellido si viene nombre_completo
    let nombre = null;
    let apellido = null;
    if (nombre_completo) {
      const partes = nombre_completo.trim().split(' ');
      nombre = partes[0] || null;
      apellido = partes.slice(1).join(' ') || null;
    }
    
    return this.create({
      cliente_id,
      username,
      email: email.toLowerCase(),
      password_hash: password, // El hook lo hasheará
      nombre,
      apellido,
      nombre_completo,
      telefono,
      cargo,
      departamento: 'Cliente',
      rol: 'cliente',
      permisos_cliente: permisos_cliente || PERMISOS_CLIENTE_DEFAULT,
      requiere_cambio_password: true,
      invitado_por: invitadoPorId,
      fecha_invitacion: new Date(),
      activo: true
    });
  };
  
  /**
   * Obtener catálogo de permisos para clientes
   * @returns {Object}
   */
  Usuario.getPermisosClienteCatalogo = function() {
    return PERMISOS_CLIENTE_CATALOGO;
  };
  
  /**
   * Obtener permisos por defecto para clientes
   * @returns {Object}
   */
  Usuario.getPermisosClienteDefault = function() {
    return PERMISOS_CLIENTE_DEFAULT;
  };
  
  // ════════════════════════════════════════════════════════════════════════════
  // ASOCIACIONES
  // ════════════════════════════════════════════════════════════════════════════
  
  Usuario.associate = (models) => {
    // Relación con Cliente (para usuarios tipo cliente)
    Usuario.belongsTo(models.Cliente, {
      foreignKey: 'cliente_id',
      as: 'cliente'
    });
    
    // Auto-referencia: quien invitó al usuario
    Usuario.belongsTo(models.Usuario, {
      foreignKey: 'invitado_por',
      as: 'usuarioInvitador'
    });
    
    // Usuarios que este usuario ha invitado
    Usuario.hasMany(models.Usuario, {
      foreignKey: 'invitado_por',
      as: 'usuariosInvitados'
    });
  };
  
  return Usuario;
};