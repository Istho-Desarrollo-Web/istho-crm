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

// Cache de plantillas compiladas (deshabilitado en desarrollo para recargar cambios)
const templateCache = {};

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

/**
 * Renderizar email completo
 */
const renderEmail = (templateName, data) => {
  const { contentTemplate, baseTemplate } = loadTemplate(templateName);

  // Logo en base64 para máxima compatibilidad con clientes de email
  const { PlantillaEmail } = require('../models');
  const logoUrl = PlantillaEmail.getLogoFirmaDataUri() || '';
  const logoFirmaDataUri = logoUrl;

  // Renderizar contenido
  const contenido = contentTemplate({ ...data, logoUrl, logoFirmaDataUri });

  // Insertar en plantilla base
  const html = baseTemplate({
    asunto: data.asunto || 'Notificación ISTHO CRM',
    contenido,
    logoUrl,
    logoFirmaDataUri
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
  adjuntos = []
}) => {
  try {
    const transporter = await getTransporter();

    // Renderizar HTML
    const html = renderEmail(templateName, { ...datos, asunto });

    // Preparar opciones
    const mailOptions = {
      from: `"${defaultFrom.name}" <${defaultFrom.address}>`,
      to: Array.isArray(para) ? para.join(', ') : para,
      subject: asunto,
      html,
      // Versión texto plano (básica)
      text: `${asunto}\n\nEste correo contiene contenido HTML. Por favor, visualícelo en un cliente compatible.`
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    if (cco) {
      mailOptions.bcc = Array.isArray(cco) ? cco.join(', ') : cco;
    }

    // Adjuntos
    if (adjuntos.length > 0) {
      mailOptions.attachments = adjuntos.map(adj => ({
        filename: adj.nombre || path.basename(adj.path),
        path: adj.path,
        contentType: adj.tipo
      }));
    }

    // Enviar
    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Correo enviado:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: asunto
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
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    logger.error('❌ Error al enviar correo:', {
      message: error.message,
      to: para,
      subject: asunto
    });

    return {
      success: false,
      error: error.message
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
      tipoOperacion: operacion.tipo === 'ingreso' ? 'INGRESO DE MERCANCÍA'
        : operacion.tipo === 'kardex' ? 'AJUSTE DE INVENTARIO (KARDEX)'
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
        day: 'numeric'
      }),
      fechaCierre: operacion.fecha_cierre
        ? new Date(operacion.fecha_cierre).toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '',
      clienteNombre: operacion.cliente?.razon_social || '',
      productos: (operacion.detalles || []).map(d => {
        const plain = d.toJSON ? d.toJSON() : d;
        // Asegurar valores numéricos legibles
        plain.cantidad = parseFloat(plain.cantidad) || 0;
        plain.cantidad_averia = parseFloat(plain.cantidad_averia) || 0;
        return plain;
      }),
      totalReferencias: operacion.total_referencias || 0,
      totalUnidades: operacion.total_unidades,
      totalAverias: operacion.total_averias,
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
      averias: (operacion.averias || []).map(a => {
        const plain = a.toJSON ? a.toJSON() : a;
        plain.cantidad = parseFloat(plain.cantidad) || 0;
        return plain;
      }),
    };

    // Preparar adjuntos (documentos de cumplido)
    const adjuntos = [];
    if (operacion.documentos && operacion.documentos.length > 0) {
      for (const doc of operacion.documentos) {
        const filePath = path.join(__dirname, '../../', doc.archivo_url);
        if (fs.existsSync(filePath)) {
          adjuntos.push({
            nombre: doc.archivo_nombre,
            path: filePath,
            tipo: doc.archivo_tipo
          });
        }
      }
    }

    // Parsear correos
    const correos = correosDestino.split(',').map(c => c.trim()).filter(c => c);

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
          where: { id: plantillaId, activo: true }
        });
      }

      // 1. Predeterminada con subtipo exacto
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo, es_predeterminada: true, activo: true }
        });
      }
      // 2. Predeterminada genérica (sin subtipo)
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo: null, es_predeterminada: true, activo: true }
        });
      }
      // 3. Cualquier plantilla activa con el subtipo correcto (aunque no sea predeterminada)
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', subtipo, activo: true }
        });
      }
      // 4. Cualquier plantilla activa de operacion_cierre
      if (!plantillaCustom) {
        plantillaCustom = await PlantillaEmail.findOne({
          where: { tipo: 'operacion_cierre', activo: true }
        });
      }

      if (plantillaCustom) {
        const asuntoCompiled = Handlebars.compile(plantillaCustom.asunto_template);
        const cuerpoCompiled = Handlebars.compile(plantillaCustom.cuerpo_html);

        let cuerpoHtml = cuerpoCompiled(datos);
        if (plantillaCustom.firma_habilitada) {
          const firmaSource = plantillaCustom.firma_html || PlantillaEmail.FIRMA_DEFAULT;
          const firmaCompiled = Handlebars.compile(firmaSource);
          cuerpoHtml += firmaCompiled({ logoFirmaDataUri: PlantillaEmail.getLogoFirmaDataUri() });
        }

        // Usar base template del filesystem
        const { baseTemplate } = loadTemplate('operacion-cierre');
        const logoUrl = PlantillaEmail.getLogoFirmaDataUri() || '';
        const htmlFinal = baseTemplate({
          asunto: asuntoCompiled(datos),
          contenido: cuerpoHtml,
          logoUrl
        });

        const transporter = await getTransporter();
        const mailOptions = {
          from: `"${defaultFrom.name}" <${defaultFrom.address}>`,
          to: correos.join(', '),
          subject: asuntoCompiled(datos),
          html: htmlFinal,
          text: `${asuntoCompiled(datos)}\n\nEste correo contiene contenido HTML.`
        };

        if (adjuntos.length > 0) {
          mailOptions.attachments = adjuntos.map(adj => ({
            filename: adj.nombre || path.basename(adj.path),
            path: adj.path,
            contentType: adj.tipo
          }));
        }

        const info = await transporter.sendMail(mailOptions);
        logger.info('Correo de cierre enviado (plantilla personalizada):', { messageId: info.messageId });

        return {
          success: true,
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info)
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
      adjuntos
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
      : correosDestino.split(',').map(c => c.trim());

    const datos = {
      stockBajo: alertas.stockBajo || [],
      proximosVencer: alertas.proximosVencer || [],
      vencidos: alertas.vencidos || [],
      urlInventario: `${process.env.APP_URL}/inventario`
    };

    // Formatear fechas
    datos.proximosVencer = datos.proximosVencer.map(item => ({
      ...item,
      fecha_vencimiento: new Date(item.fecha_vencimiento).toLocaleDateString('es-CO')
    }));

    datos.vencidos = datos.vencidos.map(item => ({
      ...item,
      fecha_vencimiento: new Date(item.fecha_vencimiento).toLocaleDateString('es-CO')
    }));

    return await enviarCorreo({
      para: correos,
      asunto: '[ISTHO] ⚠️ Alerta de Inventario',
      templateName: 'alerta-inventario',
      datos
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
      urlLogin: `${process.env.APP_URL}/login`
    };

    return await enviarCorreo({
      para: usuario.email,
      asunto: '[ISTHO] Bienvenido al CRM',
      templateName: 'bienvenida',
      datos
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
  esReenvio
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
      urlLogin: `${process.env.APP_URL}/login`,
      esReenvio
    };

    return await enviarCorreo({
      para: email,
      asunto: esReenvio
        ? '[ISTHO] Credenciales de Acceso - Portal Cliente'
        : `[ISTHO] Bienvenido al Portal de ${cliente || 'Clientes'}`,
      templateName: 'bienvenida',
      datos
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
  reseteadoPor
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
      urlLogin: `${process.env.APP_URL}/login`
    };

    return await enviarCorreo({
      para: email,
      asunto: '[ISTHO] Reseteo de Contraseña',
      templateName: 'reseteo-password',
      datos
    });

  } catch (error) {
    logger.error('Error al enviar reseteo password:', { message: error.message });
    return { success: false, error: error.message };
  }
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
  enviarReseteoPassword
};