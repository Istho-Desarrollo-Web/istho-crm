/**
 * ============================================================================
 * ISTHO CRM - Servicio de Email
 * ============================================================================
 *
 * Servicio principal para envío de correos electrónicos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const nodemailer = require('nodemailer');
const { getTransporter, defaultFrom } = require('../config/email');
const logger = require('../utils/logger');

// URL de la app (para botones en emails)
const APP_URL =
  process.env.APP_URL || (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();

// Logo para emails — S3 URL pública (bucket istho-crm-files, carpeta branding/)
const LOGO_EMAIL_URL =
  process.env.LOGO_EMAIL_URL ||
  'https://istho-crm-files.s3.us-west-2.amazonaws.com/branding/logo-email.png';

// Cache de plantillas compiladas (deshabilitado en desarrollo para recargar cambios)
const templateCache = {};

const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Cargar y compilar plantilla
 */
const loadTemplate = (templateName) => {
  if (templateCache[templateName] && process.env.NODE_ENV !== 'development') {
    return templateCache[templateName];
  }

  const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
  const basePath = path.join(__dirname, '../templates/email/base.html');

  // ✅ CORREGIDO: Error de sintaxis en template literal
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Plantilla no encontrada: ${templateName}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const baseContent = fs.readFileSync(basePath, 'utf8');

  // Compilar plantilla de contenido
  const contentTemplate = Handlebars.compile(templateContent);

  // Compilar plantilla base
  const baseTemplate = Handlebars.compile(baseContent);

  templateCache[templateName] = { contentTemplate, baseTemplate };
  return templateCache[templateName];
};

// Mapa templateName → tipo de BD (solo para plantillas del sistema)
const TEMPLATE_TIPO_MAP = {
  bienvenida: 'bienvenida',
  'alerta-inventario': 'alerta_inventario',
  general: 'general',
  'reseteo-password': 'reseteo_password',
  'recuperacion-password': 'recuperacion_password',
};

/**
 * Renderizar email desde una plantilla de BD
 */
const renderFromDB = (plantilla, datos, asunto) => {
  const { PlantillaEmail } = require('../models');
  const basePath = path.join(__dirname, '../templates/email/base.html');
  const baseContent = fs.readFileSync(basePath, 'utf8');
  const baseTemplate = Handlebars.compile(baseContent);

  const logoUrl = LOGO_EMAIL_URL;
  const cuerpoTemplate = Handlebars.compile(plantilla.cuerpo_html);
  let contenido = cuerpoTemplate({ ...datos, logoUrl });

  if (plantilla.firma_habilitada) {
    const firmaSource = plantilla.firma_html || PlantillaEmail.FIRMA_DEFAULT;
    const firmaTemplate = Handlebars.compile(firmaSource);
    contenido += firmaTemplate({ logoFirmaDataUri: LOGO_EMAIL_URL });
  }

  return baseTemplate({
    asunto: asunto || 'Notificación ISTHO CRM',
    contenido,
    logoUrl,
    hasFirma: !!plantilla.firma_habilitada,
  });
};

/**
 * Renderizar email completo
 */
const renderEmail = (templateName, data) => {
  const { contentTemplate, baseTemplate } = loadTemplate(templateName);

  // Logo via URL (Cloudinary) — liviano, no base64
  const logoUrl = LOGO_EMAIL_URL;
  const logoFirmaDataUri = LOGO_EMAIL_URL;

  // Renderizar contenido
  const contenido = contentTemplate({ ...data, logoUrl, logoFirmaDataUri });

  // Insertar en plantilla base
  const html = baseTemplate({
    asunto: data.asunto || 'Notificación ISTHO CRM',
    contenido,
    logoUrl,
    logoFirmaDataUri,
  });

  return html;
};

/**
 * Enviar correo
 */
const enviarCorreo = async ({
  para,
  cc = null,
  cco = null,
  asunto,
  templateName,
  datos,
  adjuntos = [],
}) => {
  try {
    const transporter = await getTransporter();

    // Renderizar HTML — intentar plantilla de BD primero para templates del sistema
    let html;
    const tipoDB = TEMPLATE_TIPO_MAP[templateName];
    if (tipoDB) {
      const { PlantillaEmail } = require('../models');
      const plantillaDB = await PlantillaEmail.findOne({
        where: { tipo: tipoDB, activo: true, es_predeterminada: true },
      });
      html = plantillaDB
        ? renderFromDB(plantillaDB, datos, asunto)
        : renderEmail(templateName, { ...datos, asunto });
    } else {
      html = renderEmail(templateName, { ...datos, asunto });
    }

    // Preparar opciones
    const mailOptions = {
      from: `"${defaultFrom.name}" <${defaultFrom.address}>`,
      to: Array.isArray(para) ? para.join(', ') : para,
      subject: asunto,
      html,
      // Versión texto plano (básica)
      text: `${asunto}\n\nEste correo contiene contenido HTML. Por favor, visualícelo en un cliente compatible.`,
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    if (cco) {
      mailOptions.bcc = Array.isArray(cco) ? cco.join(', ') : cco;
    }

    // Adjuntos
    if (adjuntos.length > 0) {
      mailOptions.attachments = adjuntos.map((adj) => ({
        filename: adj.nombre || (adj.path ? path.basename(adj.path) : 'adjunto'),
        ...(adj.content ? { content: adj.content } : { path: adj.path }),
        contentType: adj.tipo,
      }));
    }

    // Enviar
    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Correo enviado:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: asunto,
    });

    // Si es Ethereal, mostrar URL de previsualización
    if (info.messageId && process.env.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info('📧 Preview URL:', previewUrl);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    logger.error('❌ Error al enviar correo:', {
      message: error.message,
      to: para,
      subject: asunto,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES ESPECÍFICAS DE NOTIFICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Enviar notificación de cierre de operación
 */
const enviarCierreOperacion = async (operacion, correosDestino, plantillaId = null) => {
  try {
    // Preparar datos para la plantilla
    const datos = {
      tipoOperacion:
        operacion.tipo === 'ingreso'
          ? 'INGRESO DE MERCANCÍA'
          : operacion.tipo === 'kardex'
            ? 'AJUSTE DE INVENTARIO (KARDEX)'
            : 'SALIDA DE MERCANCÍA',
      esIngreso: operacion.tipo === 'ingreso',
      esSalida: operacion.tipo === 'salida',
      esKardex: operacion.tipo === 'kardex',
      numeroOperacion: operacion.numero_operacion,
      documentoWms: operacion.documento_wms || 'N/A (Manual)',
      fecha: new Date(operacion.fecha_operacion).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      fechaCierre: operacion.fecha_cierre
        ? new Date(operacion.fecha_cierre).toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
      clienteNombre: operacion.cliente?.razon_social || '',
      productos: (operacion.detalles || []).map((d) => {
        const plain = d.toJSON ? d.toJSON() : d;
        // Asegurar valores numéricos legibles
        plain.cantidad = parseFloat(plain.cantidad) || 0;
        plain.cantidad_averia = parseFloat(plain.cantidad_averia) || 0;
        return plain;
      }),
      totalReferencias: operacion.total_referencias || 0,
      totalUnidades: Math.round(parseFloat(operacion.total_unidades) || 0),
      totalAverias: Math.round(parseFloat(operacion.total_averias) || 0),
      tieneAverias: operacion.total_averias > 0,
      origen: operacion.origen || 'No especificado',
      destino: operacion.destino || 'No especificado',
      placa: operacion.vehiculo_placa || 'No especificada',
      vehiculoTipo: operacion.vehiculo_tipo || '',
      conductor: operacion.conductor_nombre || 'No especificado',
      conductorCedula: operacion.conductor_cedula || 'No especificada',
      conductorTelefono: operacion.conductor_telefono || 'No especificado',
      observaciones: operacion.observaciones_cierre || operacion.observaciones,
      cerradoPor: operacion.cerrador?.nombre_completo || 'Sistema',
      // Campos WMS adicionales
      numeroPicking: operacion.numero_picking || '',
      tipoDocumentoWms: operacion.tipo_documento_wms || '',
      sucursalEntrega: operacion.sucursal_entrega || '',
      ciudadDestino: operacion.ciudad_destino || '',
      motivoKardex: operacion.motivo_kardex || '',
      // Detalle de averías
      averias: (operacion.averias || []).map((a) => {
        const plain = a.toJSON ? a.toJSON() : a;
        plain.cantidad = parseFloat(plain.cantidad) || 0;
        return plain;
      }),
    };

    // Recopilar documentos y fotos de averías para adjuntar individualmente
    const adjuntos = [];
    const archivosParaAdjuntar = [];

    if (operacion.documentos && operacion.documentos.length > 0) {
      for (const doc of operacion.documentos) {
        const key = doc.cloudinary_public_id || doc.archivo_url;
        if (key && !key.startsWith('http') && !key.startsWith('data:')) {
          archivosParaAdjuntar.push({ key, nombre: doc.archivo_nombre || `soporte_${doc.id}`, tipo: doc.archivo_tipo });
        } else if (key && !key.startsWith('http')) {
          const filePath = path.join(__dirname, '../../', key);
          if (fs.existsSync(filePath)) {
            archivosParaAdjuntar.push({ filePath, nombre: doc.archivo_nombre, tipo: doc.archivo_tipo });
          }
        }
      }
    }

    if (operacion.averias && operacion.averias.length > 0) {
      for (const av of operacion.averias) {
        const key = av.cloudinary_public_id || av.foto_url;
        if (key && !key.startsWith('http') && !key.startsWith('data:')) {
          archivosParaAdjuntar.push({ key, nombre: av.foto_nombre || `averia_${av.id}.jpg`, tipo: av.foto_tipo || 'image/jpeg' });
        }
      }
    }

    if (archivosParaAdjuntar.length > 0) {
      const s3Svc = require('./s3Service');
      const LIMITE_TOTAL_MB = 20;
      let bytesTotales = 0;

      for (const archivo of archivosParaAdjuntar) {
        try {
          let buffer;
          if (archivo.key) buffer = await s3Svc.getBuffer(archivo.key);
          else if (archivo.filePath) buffer = fs.readFileSync(archivo.filePath);
          if (!buffer) continue;

          let bufferFinal = buffer;
          let tipoFinal = archivo.tipo;
          let nombreFinal = archivo.nombre;

          // Comprimir imágenes con sharp (calidad 75%) → ahorra ~50–70% de peso
          if (tipoFinal && tipoFinal.startsWith('image/')) {
            try {
              const sharp = require('sharp');
              bufferFinal = await sharp(buffer).jpeg({ quality: 75 }).toBuffer();
              tipoFinal = 'image/jpeg';
              if (nombreFinal && !/\.(jpg|jpeg)$/i.test(nombreFinal)) {
                nombreFinal = nombreFinal.replace(/\.[^.]+$/, '.jpg');
              }
            } catch (sharpErr) {
              logger.warn(`Compresión imagen ${archivo.nombre}: ${sharpErr.message} — adjuntando original`);
              bufferFinal = buffer;
            }
          }

          if (bytesTotales + bufferFinal.length > LIMITE_TOTAL_MB * 1024 * 1024) {
            logger.warn(`Adjunto "${nombreFinal}" omitido — límite total de ${LIMITE_TOTAL_MB} MB alcanzado`);
            continue;
          }

          bytesTotales += bufferFinal.length;
          adjuntos.push({ nombre: nombreFinal, content: bufferFinal, tipo: tipoFinal });
          logger.info(`Adjunto: ${nombreFinal} (${(bufferFinal.length / 1024).toFixed(1)} KB)`);
        } catch (err) {
          logger.warn(`Error adjuntando ${archivo.nombre}: ${err.message}`);
        }
      }

      if (adjuntos.length > 0) {
        logger.info(`Adjuntos cierre: ${adjuntos.length} archivo(s), ${(bytesTotales / 1024).toFixed(1)} KB total`);
      }
    }

    datos.evidenciasLinks = [];
    datos.tieneEvidencias = false;

    // Parsear correos
    const correos = correosDestino
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (correos.length === 0) {
      logger.warn('No hay correos destino para enviar notificación de cierre');
      return { success: false, error: 'Sin destinatarios' };
    }

    // Intentar usar plantilla personalizada de la BD
    // Busca: 1) predeterminada + subtipo, 2) predeterminada genérica, 3) cualquier activa con subtipo
    try {
      const { PlantillaEmail } = require('../models');
      const subtipo = operacion.tipo; // 'ingreso', 'salida' o 'kardex'

      // 0. Si viene plantilla_id específica, usarla directamente
      let plantillaCustom = null;
      if (plantillaId) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { id: plantillaId, activo: true },
        });
      }

      // 1. Predeterminada con subtipo exacto
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo, es_predeterminada: true, activo: true },
        });
      }
      // 2. Predeterminada genérica (sin subtipo)
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo: null, es_predeterminada: true, activo: true },
        });
      }
      // 3. Cualquier plantilla activa con el subtipo correcto (aunque no sea predeterminada)
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo, activo: true },
        });
      }
      // 4. Cualquier plantilla activa de operacion_cierre
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', activo: true },
        });
      }

      if (plantillaCustom) {
        const asuntoCompiled = Handlebars.compile(plantillaCustom.asunto_template);
        const cuerpoCompiled = Handlebars.compile(plantillaCustom.cuerpo_html);

        let cuerpoHtml = cuerpoCompiled(datos);
        if (plantillaCustom.firma_habilitada) {
          const firmaSource = plantillaCustom.firma_html || PlantillaEmail.FIRMA_DEFAULT;
          const firmaCompiled = Handlebars.compile(firmaSource);
          cuerpoHtml += firmaCompiled({ logoFirmaDataUri: LOGO_EMAIL_URL });
        }

        // Usar base template del filesystem
        const { baseTemplate } = loadTemplate('operacion-cierre');
        const logoUrl = LOGO_EMAIL_URL;
        const htmlFinal = baseTemplate({
          asunto: asuntoCompiled(datos),
          contenido: cuerpoHtml,
          logoUrl,
          hasFirma: !!plantillaCustom.firma_habilitada,
        });

        const transporter = await getTransporter();
        const mailOptions = {
          from: `"${defaultFrom.name}" <${defaultFrom.address}>`,
          to: correos.join(', '),
          subject: asuntoCompiled(datos),
          html: htmlFinal,
          text: `${asuntoCompiled(datos)}\n\nEste correo contiene contenido HTML.`,
        };

        if (adjuntos.length > 0) {
          mailOptions.attachments = adjuntos.map((adj) => ({
            filename: adj.nombre || (adj.path ? path.basename(adj.path) : 'adjunto'),
            ...(adj.content ? { content: adj.content } : { path: adj.path }),
            contentType: adj.tipo,
          }));
        }

        const info = await transporter.sendMail(mailOptions);
        logger.info('Correo de cierre enviado (plantilla personalizada):', {
          messageId: info.messageId,
        });

        return {
          success: true,
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info),
        };
      }
    } catch (customErr) {
      logger.warn('Usando plantilla de archivo por defecto:', customErr.message);
    }

    // Fallback: usar plantilla de archivo
    return await enviarCorreo({
      para: correos,
      asunto: `[ISTHO] ${datos.tipoOperacion} - ${operacion.numero_operacion}`,
      templateName: 'operacion-cierre',
      datos,
      adjuntos,
    });
  } catch (error) {
    logger.error('Error al enviar cierre de operación:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar alerta de inventario
 */
const enviarAlertaInventario = async (alertas, correosDestino) => {
  try {
    const correos = Array.isArray(correosDestino)
      ? correosDestino
      : correosDestino.split(',').map((c) => c.trim());

    const datos = {
      stockBajo: alertas.stockBajo || [],
      proximosVencer: alertas.proximosVencer || [],
      vencidos: alertas.vencidos || [],
      urlInventario: `${APP_URL}/inventario`,
    };

    // Formatear fechas
    datos.proximosVencer = datos.proximosVencer.map((item) => ({
      ...item,
      fecha_vencimiento: new Date(item.fecha_vencimiento).toLocaleDateString('es-CO'),
    }));

    datos.vencidos = datos.vencidos.map((item) => ({
      ...item,
      fecha_vencimiento: new Date(item.fecha_vencimiento).toLocaleDateString('es-CO'),
    }));

    return await enviarCorreo({
      para: correos,
      asunto: '[ISTHO] ⚠️ Alerta de Inventario',
      templateName: 'alerta-inventario',
      datos,
    });
  } catch (error) {
    logger.error('Error al enviar alerta de inventario:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar correo de bienvenida
 */
const enviarBienvenida = async (usuario, passwordTemporal = null) => {
  try {
    const datos = {
      nombre: usuario.nombre_completo,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
      passwordTemporal,
      urlLogin: `${APP_URL}/login`,
    };

    return await enviarCorreo({
      para: usuario.email,
      asunto: '[ISTHO] Bienvenido al CRM',
      templateName: 'bienvenida',
      datos,
    });
  } catch (error) {
    logger.error('Error al enviar bienvenida:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar bienvenida a usuario de cliente
 */
const enviarBienvenidaUsuarioCliente = async ({
  email,
  nombre,
  username,
  password,
  cliente,
  invitadoPor,
  esReenvio,
}) => {
  try {
    const datos = {
      nombre,
      username,
      email,
      rol: 'Cliente',
      passwordTemporal: password,
      cliente,
      invitadoPor,
      urlLogin: `${APP_URL}/login`,
      esReenvio,
    };

    return await enviarCorreo({
      para: email,
      asunto: esReenvio
        ? '[ISTHO] Credenciales de Acceso - Portal Cliente'
        : `[ISTHO] Bienvenido al Portal de ${cliente || 'Clientes'}`,
      templateName: 'bienvenida',
      datos,
    });
  } catch (error) {
    logger.error('Error al enviar bienvenida usuario cliente:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar reseteo de contraseña
 * @param {Object} params
 * @param {string} params.email - Email del usuario
 * @param {string} params.nombre - Nombre del usuario
 * @param {string} params.username - Username (opcional, se deriva del email si no se proporciona)
 * @param {string} params.password - Contraseña temporal (alias de passwordTemporal)
 * @param {string} params.passwordTemporal - Contraseña temporal
 * @param {string} params.cliente - Nombre del cliente (opcional)
 * @param {string} params.reseteadoPor - Nombre de quien resetea (opcional)
 */
const enviarReseteoPassword = async ({
  email,
  nombre,
  username,
  password,
  passwordTemporal,
  cliente,
  reseteadoPor,
}) => {
  try {
    // Compatibilidad: aceptar 'password' o 'passwordTemporal'
    const passTemp = passwordTemporal || password;

    // Si no viene username, derivarlo del email
    const user = username || email?.split('@')[0];

    const datos = {
      nombre,
      username: user,
      email,
      passwordTemporal: passTemp,
      cliente,
      reseteadoPor,
      urlLogin: `${APP_URL}/login`,
    };

    return await enviarCorreo({
      para: email,
      asunto: '[ISTHO] Reseteo de Contraseña',
      templateName: 'reseteo-password',
      datos,
    });
  } catch (error) {
    logger.error('Error al enviar reseteo password:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar email de recuperación de contraseña (self-service, forgot-password)
 * Envía un enlace de un solo uso a /reset-password?token=<token>
 */
const enviarRecuperacionPassword = async ({ email, nombre, username, urlReset }) => {
  try {
    return await enviarCorreo({
      para: email,
      asunto: '[ISTHO] Recuperación de Contraseña',
      templateName: 'recuperacion-password',
      datos: { nombre, username, urlReset },
    });
  } catch (error) {
    logger.error('Error al enviar recuperación de password:', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Enviar notificación de nueva solicitud (Aviso de Ingreso / Solicitud de Despacho)
 * Busca plantilla BD por tipo 'solicitud_nueva' + subtipo (ingreso|despacho).
 * Fallback a plantilla genérica sin subtipo, y luego a HTML inline básico.
 */
const enviarSolicitudNueva = async (solicitud, emails, adjuntos = []) => {
  const { PlantillaEmail } = require('../models');
  const transporter = await getTransporter();

  const {
    id,
    numero_solicitud,
    tipo,
    prioridad,
    fecha_estimada,
    numero_documento,
    transportista,
    direccion_entrega,
    contacto_destino,
    notas,
    cliente,
  } = solicitud;

  const TIPO_LABEL = { ingreso: 'Aviso de Ingreso', despacho: 'Solicitud de Despacho' };
  const tipoLabel = TIPO_LABEL[tipo] || tipo;
  const clienteNombre = cliente?.razon_social || '';
  const urlSolicitud = `${APP_URL}/solicitudes/${id}`;

  const datos = {
    tipoLabel,
    numeroSolicitud: numero_solicitud,
    clienteNombre,
    prioridad: prioridad || 'normal',
    fechaEstimada: fecha_estimada || '',
    numeroDocumento: numero_documento || '',
    transportista: transportista || '',
    direccionEntrega: direccion_entrega || '',
    contactoDestino: contacto_destino || '',
    notas: notas || '',
    urlSolicitud,
  };

  // Buscar plantilla BD: subtipo exacto → genérica → cualquier activa
  let plantilla = await PlantillaEmail.findOne({
    where: { tipo: 'solicitud_nueva', subtipo: tipo, es_predeterminada: true, activo: true },
  });
  if (!plantilla) {
    plantilla = await PlantillaEmail.findOne({
      where: { tipo: 'solicitud_nueva', subtipo: null, es_predeterminada: true, activo: true },
    });
  }
  if (!plantilla) {
    plantilla = await PlantillaEmail.findOne({
      where: { tipo: 'solicitud_nueva', subtipo: tipo, activo: true },
    });
  }
  if (!plantilla) {
    plantilla = await PlantillaEmail.findOne({
      where: { tipo: 'solicitud_nueva', activo: true },
    });
  }

  const asunto = `Nueva ${tipoLabel}: ${numero_solicitud} — ${clienteNombre}`;
  let html;

  if (plantilla) {
    const asuntoTemplate = Handlebars.compile(plantilla.asunto_template);
    const asuntoRendered = asuntoTemplate(datos);
    html = renderFromDB(plantilla, datos, asuntoRendered);
  } else {
    // Fallback HTML inline usando la plantilla base
    const basePath = path.join(__dirname, '../templates/email/base.html');
    const baseContent = fs.readFileSync(basePath, 'utf8');
    const baseTemplate = Handlebars.compile(baseContent);
    const logoUrl = LOGO_EMAIL_URL;

    const filas = [
      ['N° Solicitud', numero_solicitud],
      ['Cliente', clienteNombre],
      ['Prioridad', prioridad || 'normal'],
      fecha_estimada && ['Fecha estimada', fecha_estimada],
      numero_documento && ['N° Documento', numero_documento],
      transportista && ['Transportista', transportista],
      direccion_entrega && ['Dirección de entrega', direccion_entrega],
      contacto_destino && ['Contacto destino', contacto_destino],
      notas && ['Notas', notas],
    ]
      .filter(Boolean)
      .map(
        ([label, valor]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:180px">${escHtml(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:14px">${escHtml(valor)}</td>
        </tr>`
      )
      .join('');

    const contenido = `
<h2 style="color:#E74C3C;margin:0 0 5px 0">${escHtml(tipoLabel)} recibida</h2>
<p style="color:#64748b;margin:0 0 20px 0;font-size:14px">Se ha recibido una nueva solicitud en el CRM.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td style="background:linear-gradient(135deg,#E74C3C,#C0392B);padding:12px 16px">
      <span style="color:#fff;font-size:14px;font-weight:600">Detalle de la Solicitud</span>
    </td>
  </tr>
  <tr>
    <td style="padding:0">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse">${filas}</table>
    </td>
  </tr>
</table>
<p style="margin:24px 0 0 0">
  <a href="${escHtml(urlSolicitud)}" style="background:#E74C3C;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Ver Solicitud</a>
</p>`;

    html = baseTemplate({ asunto, contenido, logoUrl });
  }

  const paraStr = Array.isArray(emails) ? emails.join(', ') : emails;
  const mailOptions = { from: defaultFrom, to: paraStr, subject: asunto, html };
  if (adjuntos.length > 0) {
    mailOptions.attachments = adjuntos.map((adj) => ({
      filename: adj.nombre,
      content: adj.content,
      contentType: adj.contentType,
    }));
  }
  await transporter.sendMail(mailOptions);
  logger.info('[emailService] Solicitud nueva notificada', {
    para: paraStr,
    asunto,
    adjuntos: adjuntos.length,
  });
};

/**
 * Enviar email manual (ad-hoc) — con plantilla de BD o HTML libre
 */
const enviarManual = async ({ para, cc = [], plantillaId, variables = {}, asunto, cuerpoHtml }) => {
  const { PlantillaEmail } = require('../models');
  const transporter = await getTransporter();

  let mailAsunto, mailHtml;

  if (plantillaId) {
    const plantilla = await PlantillaEmail.findByPk(plantillaId);
    if (!plantilla) throw new Error('Plantilla no encontrada');
    const asuntoTemplate = Handlebars.compile(plantilla.asunto_template);
    mailAsunto = asuntoTemplate(variables);
    mailHtml = renderFromDB(plantilla, variables, mailAsunto);
  } else {
    if (!asunto || !cuerpoHtml) throw new Error('Se requiere asunto y cuerpo cuando no se usa plantilla');
    mailAsunto = asunto;
    mailHtml = cuerpoHtml;
  }

  const paraStr = Array.isArray(para) ? para.join(', ') : para;
  const ccStr = cc && cc.length ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;

  await transporter.sendMail({
    from: defaultFrom,
    to: paraStr,
    cc: ccStr,
    subject: mailAsunto,
    html: mailHtml,
  });

  logger.info('Email manual enviado', { para: paraStr, asunto: mailAsunto, plantillaId });
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  enviarCorreo,
  renderEmail,
  enviarCierreOperacion,
  enviarAlertaInventario,
  enviarBienvenida,
  enviarBienvenidaUsuarioCliente,
  enviarReseteoPassword,
  enviarRecuperacionPassword,
  enviarManual,
  enviarSolicitudNueva,
};
