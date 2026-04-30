'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// ─── Token singleton en memoria ───────────────────────────────────────────────
let _tokenData = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,  // timestamp en ms
};

function _expiresAt(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function _estaProximoAExpirar() {
  if (!_tokenData.expiresAt) return true;
  return Date.now() >= _tokenData.expiresAt - 5 * 60 * 1000; // 5 min de margen
}

// ─── Instancia axios base ─────────────────────────────────────────────────────
const _http = axios.create({
  baseURL: process.env.WMS_URL,
  timeout: 15000,
});

async function _login() {
  const res = await axios.post(`${process.env.WMS_URL}/auth/login`, {
    email: process.env.WMS_EMAIL,
    password: process.env.WMS_PASSWORD,
  });
  const { accessToken, refreshToken } = res.data?.data ?? res.data;
  _tokenData = {
    accessToken,
    refreshToken,
    expiresAt: _expiresAt(accessToken),
  };
  logger.info('[WmsApiService] Login WMS exitoso');
}

async function _refresh() {
  const res = await axios.post(`${process.env.WMS_URL}/auth/refresh`, {
    refreshToken: _tokenData.refreshToken,
  });
  const { accessToken, refreshToken } = res.data?.data ?? res.data;
  _tokenData = {
    accessToken,
    refreshToken,
    expiresAt: _expiresAt(accessToken),
  };
}

async function _asegurarToken() {
  if (!_estaProximoAExpirar()) return;

  if (_tokenData.refreshToken) {
    try {
      await _refresh();
      return;
    } catch (err) {
      logger.warn('[WmsApiService] Refresh falló, re-login:', err.message);
    }
  }
  await _login();
}

// Interceptor: inyecta token en cada request
_http.interceptors.request.use(async (config) => {
  await _asegurarToken();
  config.headers.Authorization = `Bearer ${_tokenData.accessToken}`;
  return config;
});

// ─── Normalizador de envelope WMS ────────────────────────────────────────────
// El WMS retorna: { success, message, data: { data: [], meta: {} } }
// o bien con list=true: { success, message, data: [] }
function _normalizar(responseData, expectArray = false) {
  const inner = responseData?.data;
  if (Array.isArray(inner)) return inner;           // list=true
  if (inner?.data !== undefined) return inner;      // paginado { data, meta }
  if (expectArray && Array.isArray(responseData)) return responseData;
  return inner ?? responseData;
}

// ─── Métodos públicos ─────────────────────────────────────────────────────────

async function getOrdenes(params = {}) {
  const res = await _http.get('/orders', { params });
  return _normalizar(res.data);
}

async function getOrdenDetalle(id) {
  const res = await _http.get(`/orders/${id}`);
  return _normalizar(res.data);
}

async function getOrdenItemsPallets(id) {
  const res = await _http.get(`/orders/${id}/order-items-pallets`);
  return _normalizar(res.data, true);
}

async function getPalletUbicacion(palletId) {
  const res = await _http.get(`/pallets/${palletId}/location`);
  return _normalizar(res.data);
}

async function getProductoUbicaciones(wmsProductId, wmsWarehouseId) {
  const params = { productId: wmsProductId };
  if (wmsWarehouseId) params.warehouseId = wmsWarehouseId;
  const res = await _http.get('/products/find-all-locations', { params });
  return _normalizar(res.data, true);
}

async function getProgresoRecepcion(id) {
  const res = await _http.get(`/orders/${id}/reception-progress`);
  return _normalizar(res.data);
}

async function getProgresoPickin(id) {
  const res = await _http.get(`/orders/${id}/picking-progress`);
  return _normalizar(res.data);
}

module.exports = {
  getOrdenes,
  getOrdenDetalle,
  getOrdenItemsPallets,
  getPalletUbicacion,
  getProductoUbicaciones,
  getProgresoRecepcion,
  getProgresoPickin,
};
