/**
 * ISTHO CRM - Controlador de Backups
 *
 * Gestiona el registro del historial de backups (llamado por GitHub Actions)
 * y la consulta/ejecución manual desde el panel de administración.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const { BackupRegistro, Auditoria } = require('../models');
const { success, error } = require('../utils/responses');
const { getClientIP } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────────────────────────
// POST /backup/registrar
// Llamado por GitHub Actions al terminar el backup (éxito o fallo)
// Autenticado con API key (X-Backup-Token header)
// ─────────────────────────────────────────────────────────────────────────────

const registrarBackup = async (req, res) => {
  try {
    const apiKey = req.headers['x-backup-token'];
    const apiKeyEsperada = process.env.BACKUP_API_KEY;

    if (!apiKeyEsperada || !apiKey || apiKey !== apiKeyEsperada) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const {
      archivo,
      tamano_bytes,
      estado,
      duracion_segundos,
      error_mensaje,
      origen,
    } = req.body;

    if (!['exitoso', 'fallido'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const registro = await BackupRegistro.create({
      fecha: new Date(),
      archivo: archivo || null,
      tamano_bytes: tamano_bytes ? Number(tamano_bytes) : null,
      estado,
      duracion_segundos: duracion_segundos ? Number(duracion_segundos) : null,
      error_mensaje: error_mensaje || null,
      origen: origen || 'automatico',
    });

    return success(res, registro, 'Backup registrado correctamente');
  } catch (err) {
    console.error('Error registrando backup:', err);
    return error(res, 'Error al registrar backup', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /backup/historial
// Requiere JWT + rol admin
// ─────────────────────────────────────────────────────────────────────────────

const obtenerHistorial = async (req, res) => {
  try {
    const registros = await BackupRegistro.findAll({
      order: [['fecha', 'DESC']],
      limit: 30,
    });

    // Próximo backup: mañana a las 2:00 AM (hora Colombia, UTC-5)
    const proximoBackup = new Date();
    proximoBackup.setUTCDate(proximoBackup.getUTCDate() + 1);
    proximoBackup.setUTCHours(7, 0, 0, 0); // 7 UTC = 2 AM Colombia

    // Estadísticas rápidas
    const totalExitosos = registros.filter(r => r.estado === 'exitoso').length;
    const totalFallidos = registros.filter(r => r.estado === 'fallido').length;
    const tamanoPromedio = registros
      .filter(r => r.tamano_bytes)
      .reduce((acc, r) => acc + Number(r.tamano_bytes), 0) /
      (registros.filter(r => r.tamano_bytes).length || 1);

    return success(res, {
      registros,
      proximo_backup: proximoBackup,
      stats: {
        total: registros.length,
        exitosos: totalExitosos,
        fallidos: totalFallidos,
        tamano_promedio_bytes: Math.round(tamanoPromedio),
        tasa_exito: registros.length > 0
          ? Math.round((totalExitosos / registros.length) * 100)
          : 100,
      },
    });
  } catch (err) {
    console.error('Error obteniendo historial de backups:', err);
    return error(res, 'Error al obtener historial', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /backup/ejecutar
// Dispara el workflow de GitHub Actions manualmente
// Requiere JWT + rol admin
// ─────────────────────────────────────────────────────────────────────────────

const ejecutarBackup = async (req, res) => {
  try {
    const { GITHUB_TOKEN_BACKUP, GITHUB_REPO } = process.env;

    if (!GITHUB_TOKEN_BACKUP || !GITHUB_REPO) {
      return error(res, 'La ejecución manual de backups no está configurada. Agrega GITHUB_TOKEN_BACKUP y GITHUB_REPO en las variables de entorno.', 503);
    }

    const githubRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/backup-mysql.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN_BACKUP}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ISTHO-CRM',
        },
        body: JSON.stringify({ ref: 'main', inputs: { origen: 'manual' } }),
      }
    );

    // GitHub devuelve 204 No Content cuando el dispatch fue aceptado
    if (githubRes.status === 204) {
      await Auditoria.registrar({
        tabla: 'backup_registros',
        registro_id: 0,
        accion: 'crear',
        usuario_id: req.user.id,
        usuario_nombre: `${req.user.nombre} ${req.user.apellido}`,
        datos_anteriores: null,
        datos_nuevos: { origen: 'manual', disparado_por: req.user.email },
        ip_address: getClientIP(req),
        descripcion: `Backup manual disparado por ${req.user.nombre} ${req.user.apellido}`,
      });

      return success(res, null, 'Backup iniciado. Estará listo en 2-5 minutos.');
    }

    const texto = await githubRes.text();
    console.error('GitHub Actions error:', githubRes.status, texto);
    return error(res, `Error al disparar el workflow: ${githubRes.status}`, 500);
  } catch (err) {
    console.error('Error ejecutando backup manual:', err);
    return error(res, 'Error al ejecutar backup', 500);
  }
};

module.exports = { registrarBackup, obtenerHistorial, ejecutarBackup };
