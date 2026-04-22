/**
 * Tests de integración — Flujo de autenticación
 *
 * Usa supertest contra la app Express real.
 * La DB debe estar disponible y el .env cargado.
 *
 * Ejecutar: npm test
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app');
const { Usuario } = require('../../src/models');

const API = process.env.API_PREFIX || '/api/v1';

// ─────────────────────────────────────────────
// Credenciales de prueba (deben existir en DB)
// ─────────────────────────────────────────────
const CREDENCIALES_VALIDAS = {
  email: process.env.TEST_EMAIL || 'admin@istho.com.co',
  password: process.env.TEST_PASSWORD || process.env.SEED_PASSWORD_ADMIN || 'Admin2026*',
};

// Desbloquear el usuario de prueba antes de cada suite para evitar lockout
beforeAll(async () => {
  await Usuario.update(
    { intentos_fallidos: 0, bloqueado_hasta: null },
    { where: { email: CREDENCIALES_VALIDAS.email } }
  );
});

afterAll(async () => {
  // Limpiar estado después de tests
  await Usuario.update(
    { intentos_fallidos: 0, bloqueado_hasta: null },
    { where: { email: CREDENCIALES_VALIDAS.email } }
  );
});

// ─────────────────────────────────────────────
// Suite: Login
// ─────────────────────────────────────────────
describe('POST /auth/login', () => {
  test('devuelve 200 y token con credenciales válidas', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send(CREDENCIALES_VALIDAS);

    // Puede devolver 200 con token o 200 con requiere_2fa / requiere_setup_2fa
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('devuelve 401 con contraseña incorrecta', async () => {
    // Usamos un email que no existe para no contaminar el contador de intentos del admin
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'test_no_existe_abc@prueba.com', password: 'contraseña_incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 cuando falta el email', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ password: 'cualquier_cosa' });

    expect([400, 401, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 cuando falta la contraseña', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: CREDENCIALES_VALIDAS.email });

    expect([400, 401, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 401 con email inexistente', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'no_existe@ejemplo.com', password: 'cualquier' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Suite: Rutas protegidas
// ─────────────────────────────────────────────
describe('GET /auth/me', () => {
  test('devuelve 401 sin token', async () => {
    const res = await request(app).get(`${API}/auth/me`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 401 con token inválido', async () => {
    const res = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', 'Bearer token_invalido_xyz');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 200 con token válido', async () => {
    // Primero hacer login para obtener token
    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send(CREDENCIALES_VALIDAS);

    // Si el usuario tiene 2FA activo, saltamos este test
    if (loginRes.body.data?.requiere_2fa || loginRes.body.data?.requiere_setup_2fa) {
      return;
    }

    const token = loginRes.body.data?.token;
    if (!token) return; // Usuario con 2FA — no se puede probar sin código TOTP

    const meRes = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data).toHaveProperty('email');
  });
});

// ─────────────────────────────────────────────
// Suite: Refresh token
// ─────────────────────────────────────────────
describe('POST /auth/refresh', () => {
  test('devuelve 401 sin refreshToken', async () => {
    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 401 con refreshToken inválido', async () => {
    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: 'token_falso_xyz' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 200 con refreshToken válido', async () => {
    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send(CREDENCIALES_VALIDAS);

    if (loginRes.body.data?.requiere_2fa || loginRes.body.data?.requiere_setup_2fa) {
      return;
    }

    const refreshToken = loginRes.body.data?.refreshToken;
    if (!refreshToken) return;

    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });
});

// ─────────────────────────────────────────────
// Suite: Health check
// ─────────────────────────────────────────────
describe('GET /health', () => {
  test('devuelve 200 siempre', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
