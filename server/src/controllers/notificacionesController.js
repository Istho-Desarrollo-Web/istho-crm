/**
 * ============================================================================
 * ISTHO CRM - Controlador de Notificaciones
 * ============================================================================
 * Gestiona las notificaciones del sistema.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

const { Notificacion, Usuario } = require('../models');

// ════════════════════════════════════════════════════════════════════════════
// LISTAR NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/notificaciones
 * Obtener notificaciones del usuario autenticado
 */
const listar = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { page = 1, limit = 50, tipo, no_leidas } = req.query;

    const result = await Notificacion.getByUsuario(usuario_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      tipo: tipo || null,
      soloNoLeidas: no_leidas === 'true' || no_leidas === '1',
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[Notificaciones] Error al listar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CONTAR NO LEÍDAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/notificaciones/count
 * Contar notificaciones no leídas
 */
const contarNoLeidas = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const count = await Notificacion.contarNoLeidas(usuario_id);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('[Notificaciones] Error al contar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al contar notificaciones',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// MARCAR COMO LEÍDA
// ════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/notificaciones/:id/leer
 * Marcar una notificación como leída
 */
const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user.id;

    const updated = await Notificacion.marcarLeida(id, usuario_id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
    });
  } catch (error) {
    console.error('[Notificaciones] Error al marcar leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// MARCAR TODAS COMO LEÍDAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/notificaciones/leer-todas
 * Marcar todas las notificaciones como leídas
 */
const marcarTodasLeidas = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const count = await Notificacion.marcarTodasLeidas(usuario_id);

    res.json({
      success: true,
      message: `${count} notificaciones marcadas como leídas`,
      data: { count },
    });
  } catch (error) {
    console.error('[Notificaciones] Error al marcar todas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ELIMINAR NOTIFICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/notificaciones/:id
 * Eliminar una notificación
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user.id;

    const deleted = await Notificacion.eliminar(id, usuario_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    console.error('[Notificaciones] Error al eliminar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ELIMINAR LEÍDAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/notificaciones/leidas
 * Eliminar todas las notificaciones leídas
 */
const eliminarLeidas = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const count = await Notificacion.eliminarLeidas(usuario_id);

    res.json({
      success: true,
      message: `${count} notificaciones eliminadas`,
      data: { count },
    });
  } catch (error) {
    console.error('[Notificaciones] Error al eliminar leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CREAR NOTIFICACIÓN (para uso interno/admin)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/notificaciones
 * Crear una nueva notificación (admin only)
 */
const crear = async (req, res) => {
  try {
    const { usuario_id, tipo, titulo, mensaje, prioridad, accion_url, accion_label } = req.body;

    // Validación básica
    if (!usuario_id || !titulo || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'usuario_id, titulo y mensaje son requeridos',
      });
    }

    const notificacion = await Notificacion.crear({
      usuario_id,
      tipo: tipo || 'sistema',
      titulo,
      mensaje,
      prioridad: prioridad || 'normal',
      accion_url,
      accion_label,
    });

    res.status(201).json({
      success: true,
      message: 'Notificación creada',
      data: notificacion,
    });
  } catch (error) {
    console.error('[Notificaciones] Error al crear:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAR
// ════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/notificaciones/todas
 * Eliminar TODAS las notificaciones del usuario
 */
const eliminarTodas = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const count = await Notificacion.eliminarTodas(usuario_id);

    res.json({
      success: true,
      message: `${count} notificaciones eliminadas`,
      data: { count },
    });
  } catch (error) {
    console.error('[Notificaciones] Error al eliminar todas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones',
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PREFERENCIAS DE NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════

const PREFERENCIAS_NOTIF_DEFAULT = {
  alertas_despachos: true,
  alertas_inventario: true,
  alertas_clientes: true,
  alertas_viajes: true,
  alertas_reportes: true,
  notificaciones_sonido: true,
};

// Parsea y valida el campo preferencias — resiste double-encoding y spreads corruptos
const parsearPrefs = (raw) => {
  if (!raw) return {};
  let val = raw;
  // Si es string (TEXT column o double-encode), parsear
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { return {}; }
  }
  // Si aún es string (triple-encode), parsear de nuevo
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { return {}; }
  }
  // Rechazar arrays, null, o el objeto-de-caracteres generado por { ...string }
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
  // Si tiene claves numéricas ("0","1",...) es un spread corrupto de string
  if ('0' in val) return {};
  return val;
};

/**
 * GET /api/v1/notificaciones/preferencias
 * Obtener preferencias de notificaciones del usuario autenticado
 */
const getPreferencias = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, { attributes: ['preferencias'] });
    const prefs = parsearPrefs(usuario?.preferencias);

    const resultado = {};
    Object.keys(PREFERENCIAS_NOTIF_DEFAULT).forEach(key => {
      resultado[key] = prefs[key] !== false;
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('[Notificaciones] Error al obtener preferencias:', error);
    res.status(500).json({ success: false, message: 'Error al obtener preferencias', error: error.message });
  }
};

/**
 * PUT /api/v1/notificaciones/preferencias
 * Actualizar preferencias de notificaciones del usuario autenticado
 */
const updatePreferencias = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, { attributes: ['id', 'preferencias'] });
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Parsear defensivamente para sobrevivir double-encoding o corrupción previa
    const prefsActuales = parsearPrefs(usuario.preferencias);
    const nuevasPrefs = { ...prefsActuales };

    Object.keys(PREFERENCIAS_NOTIF_DEFAULT).forEach(key => {
      if (key in req.body) {
        nuevasPrefs[key] = req.body[key] === true || req.body[key] === 'true';
      }
    });

    // Guardar como JSON string explícito para evitar double-serialization de Sequelize
    await Usuario.update(
      { preferencias: nuevasPrefs },
      { where: { id: req.user.id } }
    );

    const resultado = {};
    Object.keys(PREFERENCIAS_NOTIF_DEFAULT).forEach(key => {
      resultado[key] = nuevasPrefs[key] !== false;
    });

    res.json({ success: true, data: resultado, message: 'Preferencias actualizadas correctamente' });
  } catch (error) {
    console.error('[Notificaciones] Error al actualizar preferencias:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar preferencias', error: error.message });
  }
};

module.exports = {
  listar,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  eliminar,
  eliminarLeidas,
  eliminarTodas,
  crear,
  getPreferencias,
  updatePreferencias,
};