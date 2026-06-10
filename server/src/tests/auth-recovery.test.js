// server/src/tests/auth-recovery.test.js
'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const { Usuario } = require('../../src/models');

// Usar el módulo real de emailService y spy sobre sus métodos.
// jest.mock() no funciona aquí porque setup.js carga app→authController→emailService
// antes de que se registre el mock (setupFilesAfterEnv corre antes que el test file).
// Con jest.spyOn sobre el objeto real, el controller ve los mismos métodos espiados
// porque comparten la misma referencia de objeto.
const emailService = require('../../src/services/emailService');
const API = process.env.API_PREFIX || '/api/v1';
const EMAIL_TEST = process.env.TEST_EMAIL || 'admin@istho.com.co';

// Contraseña única por ejecución para evitar que falle la validación de reutilización
const PASS_UNICA = `Test${Date.now()}Aa*`;

let spyEnviarRecuperacion;
let spyEnviarReseteo;

beforeAll(() => {
  spyEnviarRecuperacion = jest
    .spyOn(emailService, 'enviarRecuperacionPassword')
    .mockResolvedValue({ success: true });
  spyEnviarReseteo = jest
    .spyOn(emailService, 'enviarReseteoPassword')
    .mockResolvedValue({ success: true });
});

afterAll(async () => {
  spyEnviarRecuperacion.mockRestore();
  spyEnviarReseteo.mockRestore();
  // Restaurar la contraseña original del admin para no contaminar otros test suites
  const passwordOriginal = process.env.SEED_PASSWORD_ADMIN || 'Admin2026*';
  const usuario = await Usuario.findOne({ where: { email: EMAIL_TEST } });
  if (usuario) {
    usuario.password_hash = passwordOriginal; // beforeUpdate lo hashea automáticamente
    await usuario.save();
  }
  await Usuario.update(
    { reset_token: null, reset_token_expires: null },
    { where: { email: EMAIL_TEST } }
  );
});

// Limpiar tokens del usuario de prueba antes de cada test
beforeEach(async () => {
  await Usuario.update(
    { reset_token: null, reset_token_expires: null, intentos_fallidos: 0, bloqueado_hasta: null },
    { where: { email: EMAIL_TEST } }
  );
  jest.clearAllMocks();
  // Re-aplicar implementación después de clearAllMocks (que limpia la impl del spy)
  spyEnviarRecuperacion.mockResolvedValue({ success: true });
  spyEnviarReseteo.mockResolvedValue({ success: true });
});

// ─────────────────────────────────────────────
// Suite: forgot-password
// ─────────────────────────────────────────────
describe('POST /auth/forgot-password', () => {
  test('devuelve 200 con mensaje genérico aunque el email no exista', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: 'noexiste_xyz@prueba.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
  });

  test('devuelve 200 con mensaje genérico cuando el email sí existe', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('guarda el hash del token en la BD (no el token en texto plano)', async () => {
    await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    const usuario = await Usuario.findOne({ where: { email: EMAIL_TEST } });
    expect(usuario.reset_token).not.toBeNull();
    // El hash SHA-256 tiene exactamente 64 caracteres hexadecimales
    expect(usuario.reset_token).toMatch(/^[a-f0-9]{64}$/);
    expect(usuario.reset_token_expires).not.toBeNull();
    // dateStrings:true devuelve el datetime como string en hora local Colombia (UTC-5).
    // Parsear con offset explícito para evitar que V8 lo interprete como UTC.
    const expires = new Date(String(usuario.reset_token_expires).replace(' ', 'T') + '-05:00');
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });

  test('llama a enviarRecuperacionPassword (no a enviarReseteoPassword)', async () => {
    await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    expect(emailService.enviarRecuperacionPassword).toHaveBeenCalledTimes(1);
    expect(emailService.enviarReseteoPassword).not.toHaveBeenCalled();

    const llamada = emailService.enviarRecuperacionPassword.mock.calls[0][0];
    expect(llamada.email).toBe(EMAIL_TEST);
    expect(llamada.urlReset).toMatch(/\/reset-password\?token=/);
    // El token en la URL NO debe ser el hash SHA-256 de 64 chars — es el raw de 64 chars hex
    expect(llamada.urlReset).toMatch(/[a-f0-9]{64}$/);
  });

  test('devuelve 400 si no se envía email', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Suite: reset-password
// ─────────────────────────────────────────────
describe('POST /auth/reset-password', () => {
  let rawToken;

  // Generar un token válido antes de cada test de esta suite
  beforeEach(async () => {
    rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await Usuario.update(
      {
        reset_token: hash,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
      { where: { email: EMAIL_TEST } }
    );
  });

  test('devuelve 200 y limpia el token con contraseña válida', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: PASS_UNICA });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const usuario = await Usuario.findOne({ where: { email: EMAIL_TEST } });
    expect(usuario.reset_token).toBeNull();
    expect(usuario.reset_token_expires).toBeNull();
  });

  test('devuelve 400 con token inválido (no existe en DB)', async () => {
    const tokenFalso = crypto.randomBytes(32).toString('hex');
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: tokenFalso, password: PASS_UNICA });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 con token expirado', async () => {
    // Sobreescribir el token con fecha ya pasada
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await Usuario.update(
      {
        reset_token: hash,
        reset_token_expires: new Date(Date.now() - 1000), // ya expiró
      },
      { where: { email: EMAIL_TEST } }
    );

    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: expiredToken, password: PASS_UNICA });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 si la contraseña tiene menos de 8 caracteres', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'Abc1*' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene mayúscula', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'sinmayuscula1*' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene número', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'SinNumero*abc' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene carácter especial', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'SinEspecial1234' });

    expect(res.status).toBe(400);
  });
});
