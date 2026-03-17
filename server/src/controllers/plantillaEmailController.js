/**
 * ============================================================================
 * ISTHO CRM - Controlador de Plantillas de Email
 * ============================================================================
 * CRUD para plantillas de correo electrónico personalizables.
 * Incluye preview con datos de ejemplo y gestión de firma.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 */

const Handlebars = require('handlebars');
const { PlantillaEmail, Auditoria, sequelize } = require('../models');
const {
  success,
  successMessage,
  created,
  notFound,
  serverError,
  error: errorResponse,
} = require('../utils/responses');
const { getClientIP, limpiarObjeto } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * GET /plantillas-email
 * Listar todas las plantillas
 */
const listar = async (req, res) => {
  try {
    const { tipo, subtipo, activo } = req.query;
    const where = {};

    if (tipo) where.tipo = tipo;
    if (subtipo) where.subtipo = subtipo;
    if (activo !== undefined) where.activo = activo === 'true';

    const plantillas = await PlantillaEmail.findAll({
      where,
      order: [['tipo', 'ASC'], ['nombre', 'ASC']],
      attributes: ['id', 'nombre', 'tipo', 'subtipo', 'asunto_template', 'es_predeterminada', 'activo', 'firma_habilitada', 'created_at', 'updated_at'],
    });

    return success(res, plantillas);
  } catch (error) {
    logger.error('Error al listar plantillas:', { message: error.message });
    return serverError(res, 'Error al obtener las plantillas', error);
  }
};

/**
 * GET /plantillas-email/campos/:tipo
 * Obtener campos disponibles para un tipo de plantilla
 */
const camposPorTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    const campos = PlantillaEmail.CAMPOS_POR_TIPO[tipo];

    if (!campos) {
      return errorResponse(res, `Tipo de plantilla no válido: ${tipo}`, 400);
    }

    return success(res, {
      tipo,
      campos,
      firma_default: PlantillaEmail.FIRMA_DEFAULT,
    });
  } catch (error) {
    logger.error('Error al obtener campos:', { message: error.message });
    return serverError(res, 'Error al obtener campos disponibles', error);
  }
};

/**
 * GET /plantillas-email/:id
 * Obtener una plantilla por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const plantilla = await PlantillaEmail.findByPk(req.params.id);

    if (!plantilla) {
      return notFound(res, 'Plantilla no encontrada');
    }

    return success(res, plantilla);
  } catch (error) {
    logger.error('Error al obtener plantilla:', { message: error.message });
    return serverError(res, 'Error al obtener la plantilla', error);
  }
};

/**
 * POST /plantillas-email
 * Crear nueva plantilla
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const datos = limpiarObjeto(req.body);

    // Si se marca como predeterminada, desmarcar las demás del mismo tipo+subtipo
    if (datos.es_predeterminada) {
      const whereDesmarcar = { tipo: datos.tipo };
      if (datos.subtipo) whereDesmarcar.subtipo = datos.subtipo;
      else whereDesmarcar.subtipo = null;
      await PlantillaEmail.update(
        { es_predeterminada: false },
        { where: whereDesmarcar, transaction }
      );
    }

    // Asignar campos disponibles según tipo
    if (!datos.campos_disponibles && datos.tipo) {
      datos.campos_disponibles = PlantillaEmail.CAMPOS_POR_TIPO[datos.tipo] || [];
    }

    const plantilla = await PlantillaEmail.create({
      ...datos,
      creado_por: req.user.id,
    }, { transaction });

    await Auditoria.registrar({
      tabla: 'plantillas_email',
      registro_id: plantilla.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Plantilla de email creada: ${plantilla.nombre}`,
    });

    await transaction.commit();

    logger.info('Plantilla creada:', { id: plantilla.id, nombre: plantilla.nombre });
    return created(res, 'Plantilla creada exitosamente', plantilla);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear plantilla:', { message: error.message });
    return serverError(res, 'Error al crear la plantilla', error);
  }
};

/**
 * PUT /plantillas-email/:id
 * Actualizar plantilla
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const plantilla = await PlantillaEmail.findByPk(id);
    if (!plantilla) {
      await transaction.rollback();
      return notFound(res, 'Plantilla no encontrada');
    }

    const datosAnteriores = plantilla.toJSON();

    // Si se marca como predeterminada, desmarcar las demás del mismo tipo+subtipo
    if (datos.es_predeterminada) {
      const tipo = datos.tipo || plantilla.tipo;
      const subtipo = datos.subtipo !== undefined ? datos.subtipo : plantilla.subtipo;
      const whereDesmarcar = { tipo };
      if (subtipo) whereDesmarcar.subtipo = subtipo;
      else whereDesmarcar.subtipo = null;
      await PlantillaEmail.update(
        { es_predeterminada: false },
        { where: whereDesmarcar, transaction }
      );
    }

    await plantilla.update({
      ...datos,
      actualizado_por: req.user.id,
    }, { transaction });

    await Auditoria.registrar({
      tabla: 'plantillas_email',
      registro_id: plantilla.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Plantilla de email actualizada: ${plantilla.nombre}`,
    });

    await transaction.commit();

    logger.info('Plantilla actualizada:', { id: plantilla.id });
    return successMessage(res, 'Plantilla actualizada exitosamente', plantilla);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar plantilla:', { message: error.message });
    return serverError(res, 'Error al actualizar la plantilla', error);
  }
};

/**
 * DELETE /plantillas-email/:id
 * Eliminar plantilla
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const plantilla = await PlantillaEmail.findByPk(id);
    if (!plantilla) {
      return notFound(res, 'Plantilla no encontrada');
    }

    await Auditoria.registrar({
      tabla: 'plantillas_email',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: plantilla.toJSON(),
      ip_address: getClientIP(req),
      descripcion: `Plantilla de email eliminada: ${plantilla.nombre}`,
    });

    await plantilla.destroy();

    logger.info('Plantilla eliminada:', { id });
    return successMessage(res, 'Plantilla eliminada exitosamente');
  } catch (error) {
    logger.error('Error al eliminar plantilla:', { message: error.message });
    return serverError(res, 'Error al eliminar la plantilla', error);
  }
};

/**
 * POST /plantillas-email/:id/preview
 * Generar vista previa de una plantilla con datos de ejemplo
 */
const preview = async (req, res) => {
  try {
    const { id } = req.params;
    const datosCustom = req.body.datos || {};

    const plantilla = await PlantillaEmail.findByPk(id);
    if (!plantilla) {
      return notFound(res, 'Plantilla no encontrada');
    }

    // Generar datos de ejemplo
    const camposTipo = PlantillaEmail.CAMPOS_POR_TIPO[plantilla.tipo] || [];
    const datosEjemplo = {};
    camposTipo.forEach(campo => {
      datosEjemplo[campo.variable] = datosCustom[campo.variable] || campo.ejemplo;
    });

    // Datos de ejemplo para listas (productos) en plantillas de operación
    if (plantilla.tipo === 'operacion_cierre') {
      datosEjemplo.productos = datosCustom.productos || [
        { sku: 'SKU-001', producto: 'Producto de Ejemplo A', numero_caja: 'CJ-000101', cantidad: 50, unidad_medida: 'UND', cantidad_averia: 0 },
        { sku: 'SKU-002', producto: 'Producto de Ejemplo B', numero_caja: 'CJ-000102', cantidad: 75, unidad_medida: 'UND', cantidad_averia: 2 },
        { sku: 'SKU-003', producto: 'Producto de Ejemplo C', numero_caja: 'CJ-000103', cantidad: 25, unidad_medida: 'CJ', cantidad_averia: 1 },
      ];
      datosEjemplo.tieneAverias = true;
      datosEjemplo.esIngreso = plantilla.subtipo === 'ingreso' || !plantilla.subtipo;
      datosEjemplo.esSalida = plantilla.subtipo === 'salida';
      datosEjemplo.averias = datosCustom.averias || [
        { sku: 'SKU-002', tipo_averia: 'Producto golpeado', cantidad: 2, descripcion: '' },
        { sku: 'SKU-003', tipo_averia: 'Empaque dañado', cantidad: 1, descripcion: 'Caja aplastada en transporte' },
      ];
    }

    // Compilar y renderizar
    const asuntoCompiled = Handlebars.compile(plantilla.asunto_template);
    const cuerpoCompiled = Handlebars.compile(plantilla.cuerpo_html);

    const asuntoRenderizado = asuntoCompiled(datosEjemplo);
    let cuerpoRenderizado = cuerpoCompiled(datosEjemplo);

    // Agregar firma si está habilitada
    if (plantilla.firma_habilitada) {
      const firmaHtml = plantilla.firma_html || PlantillaEmail.FIRMA_DEFAULT;
      const firmaCompiled = Handlebars.compile(firmaHtml);
      cuerpoRenderizado += firmaCompiled({ logoFirmaDataUri: PlantillaEmail.getLogoFirmaDataUri() });
    }

    return success(res, {
      asunto: asuntoRenderizado,
      cuerpo_html: cuerpoRenderizado,
      datos_utilizados: datosEjemplo,
    });
  } catch (error) {
    logger.error('Error al generar preview:', { message: error.message });
    return serverError(res, 'Error al generar la vista previa', error);
  }
};

/**
 * POST /plantillas-email/preview-raw
 * Preview sin guardar (para el editor en tiempo real)
 */
const previewRaw = async (req, res) => {
  try {
    const { asunto_template, cuerpo_html, tipo, firma_habilitada, firma_html } = req.body;

    if (!cuerpo_html) {
      return errorResponse(res, 'El cuerpo de la plantilla es requerido', 400);
    }

    // Generar datos de ejemplo
    const camposTipo = PlantillaEmail.CAMPOS_POR_TIPO[tipo] || [];
    const datosEjemplo = {};
    camposTipo.forEach(campo => {
      datosEjemplo[campo.variable] = campo.ejemplo;
    });

    // Datos de ejemplo para listas (productos) en plantillas de operación
    if (tipo === 'operacion_cierre') {
      datosEjemplo.productos = [
        { sku: 'SKU-001', producto: 'Producto de Ejemplo A', numero_caja: 'CJ-000101', cantidad: 50, unidad_medida: 'UND', cantidad_averia: 0 },
        { sku: 'SKU-002', producto: 'Producto de Ejemplo B', numero_caja: 'CJ-000102', cantidad: 75, unidad_medida: 'UND', cantidad_averia: 2 },
        { sku: 'SKU-003', producto: 'Producto de Ejemplo C', numero_caja: 'CJ-000103', cantidad: 25, unidad_medida: 'CJ', cantidad_averia: 1 },
      ];
      datosEjemplo.tieneAverias = true;
      datosEjemplo.esIngreso = true;
      datosEjemplo.esSalida = false;
      datosEjemplo.averias = [
        { sku: 'SKU-002', tipo_averia: 'Producto golpeado', cantidad: 2, descripcion: '' },
        { sku: 'SKU-003', tipo_averia: 'Empaque dañado', cantidad: 1, descripcion: 'Caja aplastada en transporte' },
      ];
    }

    const asuntoCompiled = Handlebars.compile(asunto_template || '');
    const cuerpoCompiled = Handlebars.compile(cuerpo_html);

    const asuntoRenderizado = asuntoCompiled(datosEjemplo);
    let cuerpoRenderizado = cuerpoCompiled(datosEjemplo);

    if (firma_habilitada !== false) {
      const firmaSource = firma_html || PlantillaEmail.FIRMA_DEFAULT;
      const firmaCompiled = Handlebars.compile(firmaSource);
      cuerpoRenderizado += firmaCompiled({ logoFirmaDataUri: PlantillaEmail.getLogoFirmaDataUri() });
    }

    return success(res, {
      asunto: asuntoRenderizado,
      cuerpo_html: cuerpoRenderizado,
    });
  } catch (error) {
    logger.error('Error al generar preview raw:', { message: error.message });
    return serverError(res, 'Error al generar la vista previa', error);
  }
};

/**
 * POST /plantillas-email/logo-firma
 * Subir logo para la firma de email (se convierte a base64)
 */
const subirLogoFirma = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No se proporcionó una imagen', 400);
    }

    const fs = require('fs');
    const path = require('path');

    // Leer archivo y convertir a base64
    const buffer = fs.readFileSync(req.file.path);
    const base64 = buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Guardar en archivo de configuración
    const configPath = path.join(__dirname, '../../uploads/assets/logo-firma.json');
    fs.writeFileSync(configPath, JSON.stringify({ dataUri, updatedAt: new Date() }));

    // También actualizar el logo PNG para CID en emails
    const logoPath = path.join(__dirname, '../../uploads/assets/logo.png');
    fs.copyFileSync(req.file.path, logoPath);

    // Limpiar temporal
    fs.unlinkSync(req.file.path);

    logger.info('Logo de firma actualizado');

    return successMessage(res, 'Logo de firma actualizado', { logoDataUri: dataUri });
  } catch (error) {
    logger.error('Error al subir logo firma:', { message: error.message });
    return serverError(res, 'Error al subir el logo', error);
  }
};

/**
 * GET /plantillas-email/logo-firma
 * Obtener logo de firma en base64
 */
const obtenerLogoFirma = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../uploads/assets/logo-firma.json');

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return success(res, { logoDataUri: config.dataUri });
    }

    // Fallback: intentar leer logo.png
    const logoPath = path.join(__dirname, '../../uploads/assets/logo.png');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
      return success(res, { logoDataUri: dataUri });
    }

    return success(res, { logoDataUri: null });
  } catch (error) {
    return serverError(res, 'Error al obtener logo', error);
  }
};

module.exports = {
  listar,
  camposPorTipo,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  preview,
  previewRaw,
  subirLogoFirma,
  obtenerLogoFirma,
};
