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
  // Margen de 10 min: cubre tokens con TTL corto (15-20 min) y desfases de reloj
  return Date.now() >= _tokenData.expiresAt - 10 * 60 * 1000;
}

// ─── Instancia axios base ─────────────────────────────────────────────────────
const _http = axios.create({
  baseURL: process.env.WMS_URL,
  timeout: 10000,
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

// Interceptor de request: inyecta token antes de cada llamada
_http.interceptors.request.use(async (config) => {
  await _asegurarToken();
  config.headers.Authorization = `Bearer ${_tokenData.accessToken}`;
  return config;
});

// Interceptor de respuesta: si el WMS rechaza el token (401), fuerza re-login y reintenta una vez.
// Esto cubre el caso en que el token parece válido localmente (exp no expirado) pero el servidor
// lo considera inválido (revocado, desfase de reloj, sesión cerrada en el WMS, etc.).
_http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      logger.warn('[WmsApiService] WMS rechazó el token (401) — descartando sesión y re-loginando');
      _tokenData = { accessToken: null, refreshToken: null, expiresAt: null };
      try {
        await _login();
        config.headers.Authorization = `Bearer ${_tokenData.accessToken}`;
        return _http(config);
      } catch (loginErr) {
        logger.error('[WmsApiService] Re-login tras 401 falló:', loginErr.message);
        return Promise.reject(loginErr);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Normalizador de envelope WMS ────────────────────────────────────────────
// El WMS retorna: { success, message, data: { items: [], meta: {} } }
// o bien paginado clásico: { success, message, data: { data: [], meta: {} } }
// o bien con list=true: { success, message, data: [] }
function _normalizar(responseData, expectArray = false) {
  const inner = responseData?.data;
  if (Array.isArray(inner)) return inner;                    // list=true → array directo
  if (Array.isArray(inner?.items)) return inner.items;       // paginado { items, meta }
  if (inner?.data !== undefined) return inner;               // paginado { data, meta }
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

async function getPalletDetalle(palletId) {
  const res = await _http.get(`/pallets/${palletId}`);
  return _normalizar(res.data);
}

async function getWarehouses() {
  const res = await _http.get('/warehouses', { params: { limit: 100, page: 1 } });
  return _normalizar(res.data, true);
}

async function getProductoDetalle(wmsProductId) {
  const res = await _http.get(`/products/${wmsProductId}`);
  return _normalizar(res.data);
}

async function getProductoUbicaciones(_wmsProductId) {
  const res = await _http.get('/warehouses/search-details', {
    params: { limit: 100, page: 1 },
  });
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

// ─── Forklift drivers / Kardex ────────────────────────────────────────────────

async function searchPalletKardex(code) {
  const res = await _http.get('/forklift-drivers/kardex/search-pallet', { params: { code } });
  return _normalizar(res.data);
}

async function getKardexMotives() {
  const res = await _http.get('/forklift-drivers/kardex/motives');
  return _normalizar(res.data, true);
}

async function getKardexHistory(palletId, params = {}) {
  const res = await _http.get('/forklift-drivers/kardex/history', {
    params: { palletId, ...params },
  });
  return _normalizar(res.data);
}

async function postKardexAdjustment(body) {
  const res = await _http.post('/forklift-drivers/kardex', body);
  return _normalizar(res.data);
}

async function getPalletLabels(wmsOrderId) {
  const res = await _http.get(`/orders/${wmsOrderId}/pallet-labels`);
  return _normalizar(res.data, true);
}

// Llamar al arranque para tener token listo antes del primer ciclo de polling
async function calentarToken() {
  try {
    await _login();
  } catch (err) {
    logger.warn('[WmsApiService] Calentamiento de token falló (se reintentará en el primer ciclo):', err.message);
  }
}

module.exports = {
  getOrdenes,
  getOrdenDetalle,
  getOrdenItemsPallets,
  getPalletUbicacion,
  getPalletDetalle,
  getWarehouses,
  getProductoDetalle,
  getProductoUbicaciones,
  getProgresoRecepcion,
  getProgresoPickin,
  searchPalletKardex,
  getKardexMotives,
  getKardexHistory,
  postKardexAdjustment,
  getPalletLabels,
  calentarToken,
};
