'use strict';

const crypto = require('crypto');
const { ApiKey, Auditoria } = require('../models');
const { success, error, notFound } = require('../utils/responses');

// ─── Listar ───────────────────────────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      attributes: ['id', 'nombre', 'descripcion', 'activa', 'ultimo_uso', 'creado_por', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    return success(res, keys);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Crear ────────────────────────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) {
      return error(res, 'El nombre es requerido', 400);
    }

    // Generar token de 32 bytes (64 caracteres hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const key = await ApiKey.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      key_hash: keyHash,
      activa: true,
      creado_por: req.user.id,
    });

    await Auditoria.registrar({
      tabla: 'api_keys',
      registro_id: key.id,
      accion: 'crear',
      usuario_id: req.user.id,
      datos_nuevos: { nombre: key.nombre },
    });

    // Retornar el token RAW una sola vez — nunca se podrá recuperar después
    return success(res, {
      id: key.id,
      nombre: key.nombre,
      descripcion: key.descripcion,
      activa: key.activa,
      created_at: key.created_at,
      token: rawToken, // ← solo aquí y nunca más
    }, 'API key creada. Copia el token ahora: no se podrá ver de nuevo.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Toggle activa/inactiva ───────────────────────────────────────────────────
const toggle = async (req, res) => {
  try {
    const { id } = req.params;
    const key = await ApiKey.findByPk(id);
    if (!key) return notFound(res, 'API key no encontrada');

    await key.update({ activa: !key.activa });

    await Auditoria.registrar({
      tabla: 'api_keys',
      registro_id: key.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      datos_nuevos: { activa: key.activa },
    });

    return success(res, { id: key.id, activa: key.activa });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Eliminar ─────────────────────────────────────────────────────────────────
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const key = await ApiKey.findByPk(id);
    if (!key) return notFound(res, 'API key no encontrada');

    await Auditoria.registrar({
      tabla: 'api_keys',
      registro_id: key.id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      datos_anteriores: { nombre: key.nombre },
    });

    await key.destroy();

    return success(res, null, 'API key eliminada');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { listar, crear, toggle, eliminar };
