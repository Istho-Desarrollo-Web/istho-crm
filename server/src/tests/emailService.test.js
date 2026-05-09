// server/src/tests/emailService.test.js
'use strict';

process.env.NODE_ENV = 'test';

const emailConfig = require('../../src/config/email');
const { PlantillaEmail } = require('../../src/models');
const emailService = require('../../src/services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const MARCA_DB = 'CONTENIDO-DESDE-BD-MOCK';
const MARCA_FIRMA = 'FIRMA-MOCK-TEST';

const plantillaMockBase = {
  id: 99,
  nombre: 'Test Plantilla',
  asunto_template: 'Asunto {{nombre}}',
  cuerpo_html: `<p>Hola {{nombre}}, ${MARCA_DB}</p>`,
  activo: true,
  es_predeterminada: true,
  firma_habilitada: false,
  firma_html: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup global: inyectar transporter de prueba (evita conexiones SMTP/Resend)
// ─────────────────────────────────────────────────────────────────────────────

let mockSendMail;
let spyFindOne;

beforeEach(() => {
  mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-test-001' });
  emailConfig._setTransporterForTest({
    sendMail: mockSendMail,
    verify: jest.fn().mockResolvedValue(true),
    close: () => {},
  });

  spyFindOne = jest.spyOn(PlantillaEmail, 'findOne').mockResolvedValue(null);
});

afterEach(() => {
  spyFindOne.mockRestore();
  emailConfig.resetTransporter();
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: enviarCorreo — selección de plantilla (DB vs. archivo)
// ─────────────────────────────────────────────────────────────────────────────

describe('enviarCorreo — selección de plantilla', () => {
  test('usa plantilla de BD cuando existe para el tipo del sistema', async () => {
    spyFindOne.mockResolvedValue({ ...plantillaMockBase, tipo: 'bienvenida' });

    const result = await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Test bienvenida',
      templateName: 'bienvenida',
      datos: { nombre: 'Juan' },
    });

    expect(result.success).toBe(true);
    expect(spyFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tipo: 'bienvenida' }) })
    );
    const htmlEnviado = mockSendMail.mock.calls[0][0].html;
    expect(htmlEnviado).toContain(MARCA_DB);
  });

  test('hace fallback a archivo estático cuando no hay plantilla en BD', async () => {
    spyFindOne.mockResolvedValue(null);

    const result = await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Test bienvenida fallback',
      templateName: 'bienvenida',
      datos: { nombre: 'Ana', urlLogin: 'http://localhost/login' },
    });

    expect(result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const htmlEnviado = mockSendMail.mock.calls[0][0].html;
    // El fallback usa el archivo .html del servidor — no debe contener la marca de BD
    expect(htmlEnviado).not.toContain(MARCA_DB);
  });

  test('no consulta PlantillaEmail cuando templateName no está en el mapa', async () => {
    const result = await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Cierre operación',
      templateName: 'operacion-cierre',
      datos: {
        tipoOperacion: 'INGRESO',
        productos: [],
        totalReferencias: 0,
        totalUnidades: 0,
        totalAverias: 0,
        tieneAverias: false,
        tieneEvidencias: false,
        evidenciasLinks: [],
      },
    });

    expect(result.success).toBe(true);
    expect(spyFindOne).not.toHaveBeenCalled();
  });

  test('retorna { success: false } cuando el transporter falla', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    emailConfig._setTransporterForTest({
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
      close: () => {},
    });

    const result = await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Test error',
      templateName: 'bienvenida',
      datos: { nombre: 'Carlos', urlLogin: 'http://localhost/login' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP connection refused');
  });

  test('incluye cc y bcc en las opciones del transporter cuando se pasan', async () => {
    spyFindOne.mockResolvedValue(null);

    await emailService.enviarCorreo({
      para: 'dest@test.com',
      cc: 'copia@test.com',
      cco: 'oculto@test.com',
      asunto: 'Con cc y bcc',
      templateName: 'bienvenida',
      datos: { nombre: 'Laura', urlLogin: 'http://localhost/login' },
    });

    const opciones = mockSendMail.mock.calls[0][0];
    expect(opciones.cc).toBe('copia@test.com');
    expect(opciones.bcc).toBe('oculto@test.com');
  });

  test.each([
    ['bienvenida', 'bienvenida'],
    ['alerta-inventario', 'alerta_inventario'],
    ['general', 'general'],
    ['reseteo-password', 'reseteo_password'],
    ['recuperacion-password', 'recuperacion_password'],
  ])('busca en BD con tipo "%s" para templateName "%s"', async (templateName, tipoEsperado) => {
    spyFindOne.mockResolvedValue(null);

    await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Test mapa',
      templateName,
      datos: {
        nombre: 'X',
        urlLogin: 'http://localhost',
        urlReset: 'http://localhost/reset',
        stockBajo: [],
        proximosVencer: [],
        vencidos: [],
        urlInventario: 'http://localhost/inventario',
      },
    });

    expect(spyFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tipo: tipoEsperado }) })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: renderFromDB — comportamiento de firma
// ─────────────────────────────────────────────────────────────────────────────

describe('renderFromDB — firma', () => {
  test('incluye contenido de firma cuando firma_habilitada es true', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'bienvenida',
      firma_habilitada: true,
      firma_html: `<p>${MARCA_FIRMA}</p>`,
    });

    await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Con firma',
      templateName: 'bienvenida',
      datos: { nombre: 'Pedro' },
    });

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain(MARCA_FIRMA);
  });

  test('no incluye firma cuando firma_habilitada es false', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'bienvenida',
      firma_habilitada: false,
    });

    await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Sin firma',
      templateName: 'bienvenida',
      datos: { nombre: 'María' },
    });

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain(MARCA_DB);
    // Sin firma_html explícito, la marca de firma no debe aparecer
    expect(html).not.toContain(MARCA_FIRMA);
  });

  test('usa FIRMA_DEFAULT cuando firma_habilitada es true y firma_html es null', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'bienvenida',
      firma_habilitada: true,
      firma_html: null,
    });

    // No debe lanzar error aunque firma_html sea null
    const result = await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Firma default',
      templateName: 'bienvenida',
      datos: { nombre: 'Sofía' },
    });

    expect(result.success).toBe(true);
  });

  test('interpola variables Handlebars del cuerpo_html con los datos pasados', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'bienvenida',
      cuerpo_html: '<p>Nombre: {{nombre}} — Email: {{email}}</p>',
    });

    await emailService.enviarCorreo({
      para: 'dest@test.com',
      asunto: 'Variables',
      templateName: 'bienvenida',
      datos: { nombre: 'Valentina', email: 'val@test.com' },
    });

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('Nombre: Valentina');
    expect(html).toContain('Email: val@test.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: funciones de notificación específicas
// ─────────────────────────────────────────────────────────────────────────────

describe('enviarBienvenida', () => {
  test('envía al email del usuario con asunto correcto', async () => {
    const usuario = {
      nombre_completo: 'Roberto Gómez',
      username: 'rgomez',
      email: 'roberto@test.com',
      rol: 'operador',
    };

    const result = await emailService.enviarBienvenida(usuario, 'Temp2026*');

    expect(result.success).toBe(true);
    const opts = mockSendMail.mock.calls[0][0];
    expect(opts.to).toBe('roberto@test.com');
    expect(opts.subject).toBe('[ISTHO] Bienvenido al CRM');
  });

  test('funciona sin contraseña temporal (passwordTemporal=null)', async () => {
    const result = await emailService.enviarBienvenida({
      nombre_completo: 'Claudia Ríos',
      username: 'crios',
      email: 'claudia@test.com',
      rol: 'supervisor',
    });

    expect(result.success).toBe(true);
  });
});

describe('enviarAlertaInventario', () => {
  test('envía a múltiples destinatarios con asunto de alerta', async () => {
    const alertas = { stockBajo: [], proximosVencer: [], vencidos: [] };
    const correos = ['bodega@test.com', 'admin@test.com'];

    const result = await emailService.enviarAlertaInventario(alertas, correos);

    expect(result.success).toBe(true);
    const opts = mockSendMail.mock.calls[0][0];
    expect(opts.subject).toContain('Alerta de Inventario');
  });

  test('acepta destinatarios como string separado por comas', async () => {
    const alertas = { stockBajo: [], proximosVencer: [], vencidos: [] };

    const result = await emailService.enviarAlertaInventario(
      alertas,
      'bodega@test.com, admin@test.com'
    );

    expect(result.success).toBe(true);
  });
});

describe('enviarReseteoPassword', () => {
  test('envía al email indicado con asunto de reseteo', async () => {
    const result = await emailService.enviarReseteoPassword({
      email: 'user@test.com',
      nombre: 'Felipe Torres',
      username: 'ftorres',
      passwordTemporal: 'NuevaPass2026*',
    });

    expect(result.success).toBe(true);
    const opts = mockSendMail.mock.calls[0][0];
    expect(opts.to).toBe('user@test.com');
    expect(opts.subject).toBe('[ISTHO] Reseteo de Contraseña');
  });

  test('acepta el alias "password" en lugar de "passwordTemporal"', async () => {
    const result = await emailService.enviarReseteoPassword({
      email: 'user2@test.com',
      nombre: 'Pilar Mora',
      password: 'Alias2026*',
    });

    expect(result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('deriva username del email cuando no se proporciona', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'reseteo_password',
      cuerpo_html: '<p>Usuario: {{username}}</p>',
    });

    await emailService.enviarReseteoPassword({
      email: 'maria.lopez@istho.com',
      nombre: 'María López',
      passwordTemporal: 'Pass2026*',
    });

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('Usuario: maria.lopez');
  });
});

describe('enviarRecuperacionPassword', () => {
  test('envía con asunto de recuperación y url de reset', async () => {
    const urlReset = 'https://crm.istho.com/reset-password?token=abc123def456';

    const result = await emailService.enviarRecuperacionPassword({
      email: 'forgot@test.com',
      nombre: 'Diego Sanz',
      username: 'dsanz',
      urlReset,
    });

    expect(result.success).toBe(true);
    const opts = mockSendMail.mock.calls[0][0];
    expect(opts.to).toBe('forgot@test.com');
    expect(opts.subject).toBe('[ISTHO] Recuperación de Contraseña');
  });

  test('con plantilla de BD usa el cuerpo_html almacenado en lugar del archivo estático', async () => {
    spyFindOne.mockResolvedValue({
      ...plantillaMockBase,
      tipo: 'recuperacion_password',
      cuerpo_html: `<p>${MARCA_DB}</p><a href="{{urlReset}}">Restablecer</a>`,
    });

    await emailService.enviarRecuperacionPassword({
      email: 'forgot2@test.com',
      nombre: 'Elena Vega',
      username: 'evega',
      urlReset: 'https://crm.istho.com/reset-password?token=xyz789',
    });

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain(MARCA_DB);
    expect(spyFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tipo: 'recuperacion_password' }) })
    );
  });
});
