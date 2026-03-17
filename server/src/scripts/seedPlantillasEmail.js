/**
 * ============================================================================
 * ISTHO CRM - Seed de Plantillas de Email
 * ============================================================================
 * Inserta/actualiza plantillas base para:
 *   1. Cierre de Entrada de Inventario (Ingreso)
 *   2. Cierre de Salida con Picking (Despacho)
 *   3. Cierre de Ajuste Kardex (Ajuste de Inventario)
 *
 * Todas las plantillas usan variables Handlebars dinámicas que se llenan
 * automáticamente al cerrar una operación desde el CRM.
 *
 * Uso: node server/src/scripts/seedPlantillasEmail.js
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('../models');

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLA 1: ENTRADA DE INVENTARIO
// ════════════════════════════════════════════════════════════════════════════

const plantillaEntrada = {
  nombre: 'Cierre de Entrada de Inventario',
  tipo: 'operacion_cierre',
  asunto_template: '📦 Entrada de Inventario - {{numeroOperacion}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #1a237e; margin: 0 0 5px 0;">📥 Entrada de Inventario Completada</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha registrado exitosamente el ingreso de mercancía</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado el <strong>ingreso de mercancía</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td style="background: linear-gradient(135deg, #1e88e5, #1565c0); padding: 15px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600;">📋 Datos de la Operación</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; width: 180px; color: #64748b; font-size: 13px;">N° Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{numeroOperacion}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Documento WMS</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{documentoWms}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Cliente</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{clienteNombre}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha de Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{fecha}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha de Cierre</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{fechaCierre}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; color: #64748b; font-size: 13px;">Origen</td>
          <td style="padding: 12px 20px; color: #1e293b; font-size: 14px;">{{origen}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Totales -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
  <tr>
    <td style="width: 33%; padding-right: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #1565c0;">{{totalReferencias}}</p>
            <p style="margin: 0; font-size: 11px; color: #1e88e5; font-weight: 600; text-transform: uppercase;">Referencias</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 34%; padding: 0 3px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e8f5e9; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #2e7d32;">{{totalUnidades}}</p>
            <p style="margin: 0; font-size: 11px; color: #4caf50; font-weight: 600; text-transform: uppercase;">Unidades Recibidas</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 33%; padding-left: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: {{#if tieneAverias}}#fff3e0{{else}}#f1f5f9{{/if}}; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: {{#if tieneAverias}}#e65100{{else}}#94a3b8{{/if}};">{{totalAverias}}</p>
            <p style="margin: 0; font-size: 11px; color: {{#if tieneAverias}}#ff9800{{else}}#94a3b8{{/if}}; font-weight: 600; text-transform: uppercase;">Averías</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Detalle de productos -->
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">📦 Detalle de Productos Recibidos</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #1e88e5;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">Caja</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e88e5; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: center;">{{this.unidad_medida}}</td>
      {{#if ../tieneAverias}}
      <td style="padding: 10px 12px; font-size: 12px; text-align: right; {{#if this.cantidad_averia}}color: #e65100; font-weight: 700;{{else}}color: #94a3b8;{{/if}}">
        {{this.cantidad_averia}}
      </td>
      {{/if}}
    </tr>
    {{/each}}
  </tbody>
  <tfoot>
    <tr style="background-color: #e3f2fd;">
      <td colspan="3" style="padding: 12px; font-size: 13px; font-weight: 700; color: #1a237e;">TOTAL</td>
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #1a237e; text-align: right;">{{totalUnidades}}</td>
      <td style="padding: 12px;"></td>
      {{#if tieneAverias}}
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #e65100; text-align: right;">{{totalAverias}}</td>
      {{/if}}
    </tr>
  </tfoot>
</table>

{{#if tieneAverias}}
<div style="margin: 20px 0; padding: 15px 20px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 0 8px 8px 0;">
  <p style="margin: 0; font-size: 13px; color: #e65100;">
    <strong>⚠️ Nota:</strong> Se registraron <strong>{{totalAverias}}</strong> unidades con avería durante la recepción.
  </p>
</div>

<h3 style="color: #e65100; margin: 25px 0 15px 0; font-size: 16px;">⚠️ Detalle de Averías</h3>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #ffcc80; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #ff9800;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Observación</th>
    </tr>
  </thead>
  <tbody>
    {{#each averias}}
    <tr style="border-bottom: 1px solid #fff3e0; background-color: #fff8f0;">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #e65100; font-weight: 600;">{{this.tipo_averia}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">{{this.descripcion}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}

<!-- Transporte -->
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">🚛 Información de Transporte</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; width: 160px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Origen</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{origen}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Placa Vehículo</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{placa}}{{#if vehiculoTipo}} ({{vehiculoTipo}}){{/if}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Conductor</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{conductor}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Cédula</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorCedula}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Teléfono</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorTelefono}}</td>
  </tr>
</table>

{{#if observaciones}}
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">📝 Observaciones</h3>
<div style="padding: 15px 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
  <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">{{observaciones}}</p>
</div>
{{/if}}

<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0 0 5px 0; font-size: 12px; color: #94a3b8;">Cerrado por: <strong style="color: #64748b;">{{cerradoPor}}</strong></p>
</div>

<p style="margin: 20px 0 5px 0; font-size: 13px; color: #475569;">
  Los documentos de cumplido y soportes se encuentran disponibles en el sistema CRM.
</p>

<p style="margin-top: 20px;">Atentamente,</p>
<p><strong>Equipo de Operaciones<br>ISTHO S.A.S.</strong></p>`,
  firma_habilitada: true,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: 'ingreso',
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLA 2: SALIDA CON PICKING
// ════════════════════════════════════════════════════════════════════════════

const plantillaSalida = {
  nombre: 'Cierre de Salida con Picking',
  tipo: 'operacion_cierre',
  asunto_template: '🚚 Salida con Picking - {{numeroOperacion}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #1a237e; margin: 0 0 5px 0;">📤 Salida con Picking Completada</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha completado el despacho de mercancía</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado exitosamente el <strong>despacho de mercancía</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td style="background: linear-gradient(135deg, #e65100, #f57c00); padding: 15px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600;">📋 Datos de la Operación</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; width: 180px; color: #64748b; font-size: 13px;">N° Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{numeroOperacion}}</td>
        </tr>
        {{#if numeroPicking}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">N° Picking</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #e65100; font-size: 14px;">{{numeroPicking}}</td>
        </tr>
        {{/if}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Documento WMS</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{documentoWms}}</td>
        </tr>
        {{#if tipoDocumentoWms}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Tipo Documento</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{tipoDocumentoWms}}</td>
        </tr>
        {{/if}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Cliente</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{clienteNombre}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha de Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{fecha}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha de Cierre</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{fechaCierre}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Destino</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{destino}}</td>
        </tr>
        {{#if ciudadDestino}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Ciudad Destino</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{ciudadDestino}}</td>
        </tr>
        {{/if}}
        {{#if sucursalEntrega}}
        <tr>
          <td style="padding: 12px 20px; color: #64748b; font-size: 13px;">Sucursal Entrega</td>
          <td style="padding: 12px 20px; color: #1e293b; font-size: 14px;">{{sucursalEntrega}}</td>
        </tr>
        {{/if}}
      </table>
    </td>
  </tr>
</table>

<!-- Totales -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
  <tr>
    <td style="width: 33%; padding-right: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff3e0; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #e65100;">{{totalReferencias}}</p>
            <p style="margin: 0; font-size: 11px; color: #ff9800; font-weight: 600; text-transform: uppercase;">Referencias</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 34%; padding: 0 3px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff3e0; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #e65100;">{{totalUnidades}}</p>
            <p style="margin: 0; font-size: 11px; color: #ff9800; font-weight: 600; text-transform: uppercase;">Unidades Despachadas</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 33%; padding-left: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: {{#if tieneAverias}}#ffebee{{else}}#f1f5f9{{/if}}; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: {{#if tieneAverias}}#c62828{{else}}#94a3b8{{/if}};">{{totalAverias}}</p>
            <p style="margin: 0; font-size: 11px; color: {{#if tieneAverias}}#ef5350{{else}}#94a3b8{{/if}}; font-weight: 600; text-transform: uppercase;">Averías</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Detalle de productos -->
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">📦 Detalle de Productos Despachados</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #e65100;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">Caja</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #e65100; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: center;">{{this.unidad_medida}}</td>
      {{#if ../tieneAverias}}
      <td style="padding: 10px 12px; font-size: 12px; text-align: right; {{#if this.cantidad_averia}}color: #c62828; font-weight: 700;{{else}}color: #94a3b8;{{/if}}">
        {{this.cantidad_averia}}
      </td>
      {{/if}}
    </tr>
    {{/each}}
  </tbody>
  <tfoot>
    <tr style="background-color: #fff3e0;">
      <td colspan="3" style="padding: 12px; font-size: 13px; font-weight: 700; color: #e65100;">TOTAL DESPACHADO</td>
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #e65100; text-align: right;">{{totalUnidades}}</td>
      <td style="padding: 12px;"></td>
      {{#if tieneAverias}}
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #c62828; text-align: right;">{{totalAverias}}</td>
      {{/if}}
    </tr>
  </tfoot>
</table>

{{#if tieneAverias}}
<div style="margin: 20px 0; padding: 15px 20px; background-color: #ffebee; border-left: 4px solid #ef5350; border-radius: 0 8px 8px 0;">
  <p style="margin: 0; font-size: 13px; color: #c62828;">
    <strong>⚠️ Nota:</strong> Se registraron <strong>{{totalAverias}}</strong> unidades con avería durante el despacho.
  </p>
</div>

<h3 style="color: #c62828; margin: 25px 0 15px 0; font-size: 16px;">⚠️ Detalle de Averías</h3>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #ef9a9a; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #ef5350;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Observación</th>
    </tr>
  </thead>
  <tbody>
    {{#each averias}}
    <tr style="border-bottom: 1px solid #ffebee; background-color: #fff5f5;">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #c62828; font-weight: 600;">{{this.tipo_averia}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">{{this.descripcion}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}

<!-- Transporte -->
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">🚚 Información de Despacho</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; width: 160px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Destino</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 600;">{{destino}}</td>
  </tr>
  {{#if ciudadDestino}}
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Ciudad</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{ciudadDestino}}</td>
  </tr>
  {{/if}}
  {{#if sucursalEntrega}}
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Sucursal</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{sucursalEntrega}}</td>
  </tr>
  {{/if}}
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Placa Vehículo</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{placa}}{{#if vehiculoTipo}} ({{vehiculoTipo}}){{/if}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Conductor</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{conductor}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Cédula</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorCedula}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Teléfono</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorTelefono}}</td>
  </tr>
</table>

{{#if observaciones}}
<h3 style="color: #1a237e; margin: 30px 0 15px 0; font-size: 16px;">📝 Observaciones</h3>
<div style="padding: 15px 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
  <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">{{observaciones}}</p>
</div>
{{/if}}

<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0 0 5px 0; font-size: 12px; color: #94a3b8;">Cerrado por: <strong style="color: #64748b;">{{cerradoPor}}</strong></p>
</div>

<p style="margin: 20px 0 5px 0; font-size: 13px; color: #475569;">
  Los documentos de cumplido, remisiones y soportes de despacho se encuentran disponibles en el sistema CRM.
</p>

<p style="margin-top: 20px;">Atentamente,</p>
<p><strong>Equipo de Operaciones<br>ISTHO S.A.S.</strong></p>`,
  firma_habilitada: true,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: 'salida',
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLA 3: AJUSTE KARDEX
// ════════════════════════════════════════════════════════════════════════════

const plantillaKardex = {
  nombre: 'Cierre de Ajuste Kardex',
  tipo: 'operacion_cierre',
  asunto_template: '🔄 Ajuste Kardex - {{numeroOperacion}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #6d28d9; margin: 0 0 5px 0;">🔄 Ajuste de Inventario (Kardex) Completado</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha registrado exitosamente un ajuste de inventario</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado un <strong>ajuste de inventario (Kardex)</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 15px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600;">📋 Datos de la Operación</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; width: 180px; color: #64748b; font-size: 13px;">N° Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{numeroOperacion}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Motivo Kardex</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #6d28d9; font-size: 14px;">{{motivoKardex}}</td>
        </tr>
        {{#if documentoWms}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Documento WMS</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{documentoWms}}</td>
        </tr>
        {{/if}}
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Cliente</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">{{clienteNombre}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha de Operación</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">{{fecha}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; color: #64748b; font-size: 13px;">Fecha de Cierre</td>
          <td style="padding: 12px 20px; color: #1e293b; font-size: 14px;">{{fechaCierre}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Totales -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
  <tr>
    <td style="width: 33%; padding-right: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3e8ff; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #7c3aed;">{{totalReferencias}}</p>
            <p style="margin: 0; font-size: 11px; color: #8b5cf6; font-weight: 600; text-transform: uppercase;">Referencias</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 34%; padding: 0 3px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3e8ff; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: #7c3aed;">{{totalUnidades}}</p>
            <p style="margin: 0; font-size: 11px; color: #8b5cf6; font-weight: 600; text-transform: uppercase;">Unidades Ajustadas</p>
          </td>
        </tr>
      </table>
    </td>
    <td style="width: 33%; padding-left: 6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: {{#if tieneAverias}}#fff3e0{{else}}#f1f5f9{{/if}}; border-radius: 12px; text-align: center;">
        <tr>
          <td style="padding: 18px 10px;">
            <p style="margin: 0 0 5px 0; font-size: 26px; font-weight: 700; color: {{#if tieneAverias}}#e65100{{else}}#94a3b8{{/if}};">{{totalAverias}}</p>
            <p style="margin: 0; font-size: 11px; color: {{#if tieneAverias}}#ff9800{{else}}#94a3b8{{/if}}; font-weight: 600; text-transform: uppercase;">Averías</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Detalle de productos -->
<h3 style="color: #6d28d9; margin: 30px 0 15px 0; font-size: 16px;">📦 Detalle de Productos Ajustados</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #7c3aed;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">Caja</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #7c3aed; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: center;">{{this.unidad_medida}}</td>
      {{#if ../tieneAverias}}
      <td style="padding: 10px 12px; font-size: 12px; text-align: right; {{#if this.cantidad_averia}}color: #e65100; font-weight: 700;{{else}}color: #94a3b8;{{/if}}">
        {{this.cantidad_averia}}
      </td>
      {{/if}}
    </tr>
    {{/each}}
  </tbody>
  <tfoot>
    <tr style="background-color: #f3e8ff;">
      <td colspan="3" style="padding: 12px; font-size: 13px; font-weight: 700; color: #6d28d9;">TOTAL AJUSTADO</td>
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #6d28d9; text-align: right;">{{totalUnidades}}</td>
      <td style="padding: 12px;"></td>
      {{#if tieneAverias}}
      <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #e65100; text-align: right;">{{totalAverias}}</td>
      {{/if}}
    </tr>
  </tfoot>
</table>

{{#if tieneAverias}}
<div style="margin: 20px 0; padding: 15px 20px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 0 8px 8px 0;">
  <p style="margin: 0; font-size: 13px; color: #e65100;">
    <strong>⚠️ Nota:</strong> Se registraron <strong>{{totalAverias}}</strong> unidades con avería durante el ajuste.
  </p>
</div>

<h3 style="color: #e65100; margin: 25px 0 15px 0; font-size: 16px;">⚠️ Detalle de Averías</h3>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #ffcc80; border-radius: 8px; overflow: hidden;">
  <thead>
    <tr style="background-color: #ff9800;">
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600;">Observación</th>
    </tr>
  </thead>
  <tbody>
    {{#each averias}}
    <tr style="border-bottom: 1px solid #fff3e0; background-color: #fff8f0;">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #e65100; font-weight: 600;">{{this.tipo_averia}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; text-align: right; font-weight: 600;">{{this.cantidad}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">{{this.descripcion}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}

<!-- Transporte (opcional para Kardex) -->
{{#if conductor}}
<h3 style="color: #6d28d9; margin: 30px 0 15px 0; font-size: 16px;">🚛 Información de Transporte</h3>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; width: 160px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Placa Vehículo</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{placa}}{{#if vehiculoTipo}} ({{vehiculoTipo}}){{/if}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Conductor</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b; font-weight: 500;">{{conductor}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #f1f5f9;">
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Cédula</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorCedula}}</td>
  </tr>
  <tr>
    <td style="padding: 10px 20px; color: #64748b; font-size: 13px; background-color: #f8fafc;">Teléfono</td>
    <td style="padding: 10px 20px; font-size: 13px; color: #1e293b;">{{conductorTelefono}}</td>
  </tr>
</table>
{{/if}}

{{#if observaciones}}
<h3 style="color: #6d28d9; margin: 30px 0 15px 0; font-size: 16px;">📝 Observaciones</h3>
<div style="padding: 15px 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
  <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">{{observaciones}}</p>
</div>
{{/if}}

<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0 0 5px 0; font-size: 12px; color: #94a3b8;">Cerrado por: <strong style="color: #64748b;">{{cerradoPor}}</strong></p>
</div>

<p style="margin: 20px 0 5px 0; font-size: 13px; color: #475569;">
  Los documentos y soportes del ajuste se encuentran disponibles en el sistema CRM.
</p>

<p style="margin-top: 20px;">Atentamente,</p>
<p><strong>Equipo de Operaciones<br>ISTHO S.A.S.</strong></p>`,
  firma_habilitada: true,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: 'kardex',
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// EJECUTAR SEED (upsert: actualiza si ya existe)
// ════════════════════════════════════════════════════════════════════════════

async function seed() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión a BD establecida');

    const { PlantillaEmail } = db;

    // Upsert plantilla de Entrada
    const [entrada, entradaCreated] = await PlantillaEmail.findOrCreate({
      where: { nombre: plantillaEntrada.nombre },
      defaults: plantillaEntrada
    });

    if (!entradaCreated) {
      await entrada.update(plantillaEntrada);
      console.log('🔄 Plantilla de Entrada actualizada (id:', entrada.id, ')');
    } else {
      console.log('✅ Plantilla de Entrada creada (id:', entrada.id, ')');
    }

    // Upsert plantilla de Salida
    const [salida, salidaCreated] = await PlantillaEmail.findOrCreate({
      where: { nombre: plantillaSalida.nombre },
      defaults: plantillaSalida
    });

    if (!salidaCreated) {
      await salida.update(plantillaSalida);
      console.log('🔄 Plantilla de Salida actualizada (id:', salida.id, ')');
    } else {
      console.log('✅ Plantilla de Salida creada (id:', salida.id, ')');
    }

    // Upsert plantilla de Kardex
    const [kardex, kardexCreated] = await PlantillaEmail.findOrCreate({
      where: { nombre: plantillaKardex.nombre },
      defaults: plantillaKardex
    });

    if (!kardexCreated) {
      await kardex.update(plantillaKardex);
      console.log('🔄 Plantilla de Kardex actualizada (id:', kardex.id, ')');
    } else {
      console.log('✅ Plantilla de Kardex creada (id:', kardex.id, ')');
    }

    console.log('\n🎉 Seed completado exitosamente');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
