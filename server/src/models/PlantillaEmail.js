/**
 * ============================================================================
 * ISTHO CRM - Modelo PlantillaEmail
 * ============================================================================
 * Plantillas de correo personalizables por el usuario.
 * Soporta variables dinámicas (Handlebars) y firma configurable.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlantillaEmail = sequelize.define('PlantillaEmail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'Nombre interno de la plantilla',
    },
    tipo: {
      type: DataTypes.ENUM(
        'operacion_cierre',
        'alerta_inventario',
        'bienvenida',
        'general'
      ),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Tipo de evento al que aplica la plantilla',
    },
    subtipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Subtipo para diferenciar plantillas del mismo tipo (ej: ingreso, salida)',
    },
    asunto_template: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Asunto del correo (acepta variables Handlebars)',
    },
    cuerpo_html: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: 'Cuerpo HTML de la plantilla (acepta variables Handlebars)',
    },
    firma_habilitada: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si incluye la firma de ISTHO al final',
    },
    firma_html: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Firma HTML personalizada (si es null se usa la firma por defecto)',
    },
    campos_disponibles: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Lista de campos/variables disponibles para esta plantilla',
    },
    es_predeterminada: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es la plantilla por defecto para su tipo',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'plantillas_email',
    timestamps: true,
    underscored: true,
  });

  // Campos disponibles por tipo de plantilla
  PlantillaEmail.CAMPOS_POR_TIPO = {
    operacion_cierre: [
      { variable: 'tipoOperacion', label: 'Tipo de Operación', ejemplo: 'INGRESO DE MERCANCÍA' },
      { variable: 'numeroOperacion', label: 'Número de Operación', ejemplo: 'OP-2026-0001' },
      { variable: 'documentoWms', label: 'Documento WMS', ejemplo: 'WMS-12345' },
      { variable: 'fecha', label: 'Fecha de la Operación', ejemplo: 'martes, 11 de marzo de 2026' },
      { variable: 'fechaCierre', label: 'Fecha de Cierre', ejemplo: 'martes, 11 de marzo de 2026, 14:30' },
      { variable: 'clienteNombre', label: 'Nombre del Cliente', ejemplo: 'LACTALIS COLOMBIA LTDA' },
      { variable: 'totalReferencias', label: 'Total Referencias/SKUs', ejemplo: '12' },
      { variable: 'totalUnidades', label: 'Total Unidades', ejemplo: '150' },
      { variable: 'totalAverias', label: 'Total Averías', ejemplo: '3' },
      { variable: 'tieneAverias', label: 'Tiene Averías (condicional)', ejemplo: 'true/false' },
      { variable: 'origen', label: 'Origen', ejemplo: 'Bodega Central' },
      { variable: 'destino', label: 'Destino', ejemplo: 'Cliente Final' },
      { variable: 'placa', label: 'Placa Vehículo', ejemplo: 'ABC-123' },
      { variable: 'vehiculoTipo', label: 'Tipo Vehículo', ejemplo: 'Furgón' },
      { variable: 'conductor', label: 'Nombre Conductor', ejemplo: 'Juan Pérez' },
      { variable: 'conductorCedula', label: 'Cédula Conductor', ejemplo: '1234567890' },
      { variable: 'conductorTelefono', label: 'Teléfono Conductor', ejemplo: '300 123 4567' },
      { variable: 'observaciones', label: 'Observaciones de Cierre', ejemplo: 'Sin novedad' },
      { variable: 'cerradoPor', label: 'Cerrado por (usuario)', ejemplo: 'Admin ISTHO' },
      { variable: 'numeroPicking', label: 'N° Picking (salidas)', ejemplo: 'PICK-001' },
      { variable: 'tipoDocumentoWms', label: 'Tipo Doc. WMS', ejemplo: 'Factura' },
      { variable: 'sucursalEntrega', label: 'Sucursal Entrega', ejemplo: 'Sucursal Norte' },
      { variable: 'ciudadDestino', label: 'Ciudad Destino', ejemplo: 'Bogotá' },
      { variable: 'motivoKardex', label: 'Motivo del Kardex', ejemplo: 'Ajuste por conteo físico' },
      { variable: 'averias', label: 'Lista de Averías ({{#each averias}})', ejemplo: '[{sku, tipo_averia, cantidad, descripcion}]' },
    ],
    alerta_inventario: [
      { variable: 'totalAlertas', label: 'Total de Alertas', ejemplo: '5' },
      { variable: 'alertasAgotado', label: 'Productos Agotados', ejemplo: '2' },
      { variable: 'alertasStockBajo', label: 'Productos con Stock Bajo', ejemplo: '3' },
      { variable: 'urlInventario', label: 'URL del Inventario', ejemplo: 'https://crm.istho.com/inventario' },
    ],
    bienvenida: [
      { variable: 'nombre', label: 'Nombre del Usuario', ejemplo: 'Juan Pérez' },
      { variable: 'username', label: 'Nombre de Usuario', ejemplo: 'jperez' },
      { variable: 'email', label: 'Email', ejemplo: 'juan@empresa.com' },
      { variable: 'passwordTemporal', label: 'Contraseña Temporal', ejemplo: '********' },
      { variable: 'cliente', label: 'Nombre del Cliente', ejemplo: 'LACTALIS COLOMBIA' },
      { variable: 'urlLogin', label: 'URL de Login', ejemplo: 'https://crm.istho.com/login' },
    ],
    general: [
      { variable: 'titulo', label: 'Título', ejemplo: 'Notificación' },
      { variable: 'mensaje', label: 'Mensaje', ejemplo: 'Contenido del mensaje' },
      { variable: 'urlAccion', label: 'URL de Acción', ejemplo: 'https://crm.istho.com' },
      { variable: 'labelAccion', label: 'Texto del Botón', ejemplo: 'Ver en CRM' },
    ],
  };

  PlantillaEmail.FIRMA_DEFAULT = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; border-top: 2px solid #E65100; padding-top: 20px;">
  <tr>
    <td style="vertical-align: top; padding-right: 15px; width: 60px;">
      {{#if logoFirmaDataUri}}
      <img src="{{logoFirmaDataUri}}" alt="ISTHO" width="50" height="50" style="width: 50px; height: 50px; border-radius: 12px; display: block;" />
      {{else}}
      <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #E65100, #F57C00); border-radius: 12px; text-align: center; line-height: 50px; font-size: 20px; font-weight: 800; color: #fff;">IS</div>
      {{/if}}
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 2px 0; color: #1e293b; font-size: 14px; font-weight: 700;">ISTHO S.A.S.</p>
      <p style="margin: 0 0 2px 0; color: #64748b; font-size: 12px;">Centro Logístico Industrial del Norte</p>
      <p style="margin: 0 0 2px 0; color: #64748b; font-size: 12px;">Girardota, Antioquia - Colombia</p>
      <p style="margin: 0 0 2px 0; color: #64748b; font-size: 12px;">Tel: (604) 405 2000 | info@istho.com.co</p>
    </td>
  </tr>
</table>`;

  /**
   * Obtener el logo de firma en base64 (si existe)
   */
  PlantillaEmail.getLogoFirmaDataUri = () => {
    try {
      const fs = require('fs');
      const path = require('path');

      // 1. Logo personalizado subido (uploads - runtime)
      const configPath = path.join(__dirname, '../../uploads/assets/logo-firma.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8')).dataUri;
      }

      // 2. Logo en uploads (runtime)
      const logoPath = path.join(__dirname, '../../uploads/assets/logo.png');
      if (fs.existsSync(logoPath)) {
        return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
      }

      // 3. Logo por defecto incluido en el repo (persiste en deploy)
      const defaultLogoPath = path.join(__dirname, '../assets/logo-default.png');
      if (fs.existsSync(defaultLogoPath)) {
        return `data:image/png;base64,${fs.readFileSync(defaultLogoPath).toString('base64')}`;
      }
    } catch { /* ignore */ }
    return null;
  };

  return PlantillaEmail;
};
