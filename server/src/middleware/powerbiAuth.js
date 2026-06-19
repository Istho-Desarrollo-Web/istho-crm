'use strict';

const crypto = require('crypto');
const { ApiKey } = require('../models');

async function powerbiAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'API key requerida. Incluye el header: Authorization: Bearer <api-key>',
    });
  }

  const raw = authHeader.slice(7).trim();
  if (!raw) {
    return res.status(401).json({ success: false, message: 'API key vacía' });
  }

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const key = await ApiKey.findOne({ where: { key_hash: hash, activa: true } }).catch(() => null);

  if (!key) {
    return res.status(401).json({ success: false, message: 'API key inválida o inactiva' });
  }

  // Actualizar ultimo_uso sin bloquear la respuesta
  ApiKey.update({ ultimo_uso: new Date() }, { where: { id: key.id } }).catch(() => {});

  next();
}

module.exports = powerbiAuth;
