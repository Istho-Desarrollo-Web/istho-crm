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
  asunto_template: 'Entrada de Inventario - {{documentoWms}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #1a237e; margin: 0 0 5px 0;">Entrada de Inventario Completada</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha registrado exitosamente el ingreso de mercancía</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado el <strong>ingreso de mercancía</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td bgcolor="#1565c0" style="background-color: #1565c0; background: linear-gradient(135deg, #1e88e5, #1565c0); padding: 15px 20px;">
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">Caja</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">Lote</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #1e88e5;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; word-break: break-word; max-width: 180px;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e88e5; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.lote}}</td>
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
      <td colspan="4" style="padding: 12px; font-size: 13px; font-weight: 700; color: #1a237e;">TOTAL</td>
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Observación</th>
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
  Los documentos de cumplido y soportes se adjuntan a este correo.
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
  asunto_template: 'Salida con Picking - {{numeroPicking}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #1a237e; margin: 0 0 5px 0;">Salida con Picking Completada</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha completado el despacho de mercancía</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado exitosamente el <strong>despacho de mercancía</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td bgcolor="#e65100" style="background-color: #e65100; background: linear-gradient(135deg, #e65100, #f57c00); padding: 15px 20px;">
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">Caja</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">Lote</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #e65100;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; word-break: break-word; max-width: 180px;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #e65100; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.lote}}</td>
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
      <td colspan="4" style="padding: 12px; font-size: 13px; font-weight: 700; color: #e65100;">TOTAL DESPACHADO</td>
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ef5350;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ef5350;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ef5350;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ef5350;">Observación</th>
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
  Los documentos de cumplido, remisiones y soportes de despacho se adjuntan a este correo.
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
  asunto_template: 'Ajuste Kardex - {{numeroOperacion}} | {{clienteNombre}}',
  cuerpo_html: `<h2 style="color: #6d28d9; margin: 0 0 5px 0;">Ajuste de Inventario (Kardex) Completado</h2>
<p style="color: #64748b; margin: 0 0 25px 0; font-size: 14px;">Se ha registrado exitosamente un ajuste de inventario</p>

<p>Estimado(a) cliente,</p>

<p>Le informamos que se ha completado un <strong>ajuste de inventario (Kardex)</strong> asociado a su cuenta. A continuación los detalles de la operación:</p>

<!-- Resumen de la operación -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr>
    <td bgcolor="#6d28d9" style="background-color: #6d28d9; background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 15px 20px;">
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">Producto</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">Caja</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">Lote</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">Cantidad</th>
      <th style="padding: 10px 12px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">U.M.</th>
      {{#if tieneAverias}}
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #7c3aed;">Averías</th>
      {{/if}}
    </tr>
  </thead>
  <tbody>
    {{#each productos}}
    <tr style="border-bottom: 1px solid #f1f5f9; {{#if this.cantidad_averia}}background-color: #fff8f0;{{/if}}">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.sku}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; word-break: break-word; max-width: 180px;">{{this.producto}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #7c3aed; text-align: center; font-weight: 600;">{{this.numero_caja}}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center; font-family: monospace; word-break: break-all; max-width: 90px;">{{this.lote}}</td>
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
      <td colspan="4" style="padding: 12px; font-size: 13px; font-weight: 700; color: #6d28d9;">TOTAL AJUSTADO</td>
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
    <tr>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">SKU</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Tipo de Avería</th>
      <th style="padding: 10px 12px; text-align: right; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Cant.</th>
      <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; background-color: #ff9800;">Observación</th>
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
  Los documentos y soportes del ajuste se adjuntan a este correo.
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
// PLANTILLAS DEL SISTEMA (bienvenida, alerta, general, reseteo, recuperación)
// ════════════════════════════════════════════════════════════════════════════

const plantillaBienvenida = {
  nombre: 'Bienvenida al Sistema',
  tipo: 'bienvenida',
  asunto_template: '[ISTHO] Bienvenido al CRM',
  cuerpo_html: `<div style="padding: 0">
  {{#if esReenvio}}
  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 700">Reenvio de Credenciales</h2>
  {{else}}
  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 700">Bienvenido a ISTHO CRM</h2>
  {{/if}}

  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0">
    Hola <strong style="color: #1e293b">{{nombre}}</strong>,
  </p>

  {{#if esReenvio}}
  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0">
    Te reenviamos tus credenciales de acceso al sistema ISTHO CRM{{#if cliente}} para el portal de <strong>{{cliente}}</strong>{{/if}}.
  </p>
  {{else}}
  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0">
    Se ha creado una cuenta para ti en el sistema ISTHO CRM{{#if cliente}} para el portal de clientes de <strong>{{cliente}}</strong>{{/if}}. A continuacion encontraras tus credenciales de acceso:
  </p>
  {{/if}}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 25px 0;">
    <tr>
      <td style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0">
        <p style="margin: 0 0 3px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Usuario</p>
        <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">{{username}}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0">
        <p style="margin: 0 0 3px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
        <p style="margin: 0; color: #1e293b; font-size: 15px">{{email}}</p>
      </td>
    </tr>
    {{#if passwordTemporal}}
    <tr>
      <td style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0; background-color: #fff7ed">
        <p style="margin: 0 0 3px 0; color: #c2410c; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Contrasena Temporal</p>
        <p style="margin: 0; color: #c2410c; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">{{passwordTemporal}}</p>
      </td>
    </tr>
    {{/if}}
    <tr>
      <td style="padding: 15px 25px">
        <p style="margin: 0 0 3px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Rol</p>
        <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">{{rol}}</span>
      </td>
    </tr>
  </table>

  {{#if passwordTemporal}}
  <div class="info-box warning">
    <strong>Importante:</strong> Esta contrasena es temporal. Por seguridad, deberas cambiarla en tu primer inicio de sesion.
  </div>
  {{/if}}

  {{#if cliente}}
  <div class="info-box info">
    <p style="margin: 0 0 10px 0; font-weight: 600">Tu acceso al portal incluye:</p>
    <ul style="margin: 0; padding-left: 20px; line-height: 1.8">
      <li>Consulta de inventario en tiempo real</li>
      <li>Seguimiento de despachos y entregas</li>
      <li>Descarga de documentos y cumplidos</li>
      <li>Reportes y estadisticas de operaciones</li>
    </ul>
  </div>
  {{/if}}

  <div style="text-align: center; margin: 30px 0">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="background-color:#E74C3C;border-radius:10px;text-align:center;"><a href="{{urlLogin}}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;font-family:sans-serif;">{{#if cliente}}Acceder al Portal{{else}}Iniciar Sesion{{/if}}</a></td></tr></table>
  </div>

  {{#if invitadoPor}}
  <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0 0">
    Invitacion enviada por: <strong>{{invitadoPor}}</strong>
  </p>
  {{/if}}

  <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    Si no solicitaste esta cuenta o tienes alguna pregunta, contacta al administrador del sistema.
  </p>
</div>`,
  firma_habilitada: false,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: null,
  activo: true,
};

const plantillaAlertaInventario = {
  nombre: 'Alerta de Inventario',
  tipo: 'alerta_inventario',
  asunto_template: '[ISTHO] ⚠️ Alerta de Inventario',
  cuerpo_html: `<div style="padding: 0">
  <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 22px; font-weight: 700">Alerta de Inventario</h2>
  <p style="color: #64748b; font-size: 14px; margin: 0 0 25px 0">Se han detectado alertas que requieren su atencion</p>

  {{#if stockBajo.length}}
  <h3 style="color: #dc2626; margin: 25px 0 10px 0; font-size: 16px; font-weight: 600">Stock Bajo</h3>
  <div class="info-box error">Los siguientes productos tienen stock por debajo del minimo establecido.</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Producto</th>
        <th style="text-align: right">Stock Actual</th>
        <th style="text-align: right">Stock Minimo</th>
        <th>Ubicacion</th>
      </tr>
    </thead>
    <tbody>
      {{#each stockBajo}}
      <tr>
        <td style="font-family: monospace; font-size: 13px">{{this.sku}}</td>
        <td>{{this.producto}}</td>
        <td style="text-align: right; color: #dc2626; font-weight: 700">{{this.cantidad}}</td>
        <td style="text-align: right">{{this.stock_minimo}}</td>
        <td>{{this.ubicacion}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}

  {{#if proximosVencer.length}}
  <h3 style="color: #d97706; margin: 25px 0 10px 0; font-size: 16px; font-weight: 600">Proximos a Vencer</h3>
  <div class="info-box warning">Los siguientes productos vencen en los proximos 30 dias.</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Producto</th>
        <th>Lote</th>
        <th style="text-align: right">Cantidad</th>
        <th>Vencimiento</th>
      </tr>
    </thead>
    <tbody>
      {{#each proximosVencer}}
      <tr>
        <td style="font-family: monospace; font-size: 13px">{{this.sku}}</td>
        <td>{{this.producto}}</td>
        <td>{{this.lote}}</td>
        <td style="text-align: right">{{this.cantidad}}</td>
        <td style="color: #d97706; font-weight: 600">{{this.fecha_vencimiento}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}

  {{#if vencidos.length}}
  <h3 style="color: #dc2626; margin: 25px 0 10px 0; font-size: 16px; font-weight: 600">Productos Vencidos</h3>
  <div class="info-box error"><strong>ATENCION:</strong> Los siguientes productos ya estan vencidos y requieren accion inmediata.</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Producto</th>
        <th>Lote</th>
        <th style="text-align: right">Cantidad</th>
        <th>Vencimiento</th>
      </tr>
    </thead>
    <tbody>
      {{#each vencidos}}
      <tr>
        <td style="font-family: monospace; font-size: 13px">{{this.sku}}</td>
        <td>{{this.producto}}</td>
        <td>{{this.lote}}</td>
        <td style="text-align: right">{{this.cantidad}}</td>
        <td style="color: #dc2626; font-weight: 700">{{this.fecha_vencimiento}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}

  <div style="text-align: center; margin: 30px 0">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="background-color:#E74C3C;border-radius:10px;text-align:center;"><a href="{{urlInventario}}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;font-family:sans-serif;">Ver Inventario Completo</a></td></tr></table>
  </div>

  <p style="color: #94a3b8; font-size: 12px; margin: 15px 0 0 0">
    Este correo fue generado automaticamente por el sistema de alertas de ISTHO CRM.
  </p>
</div>`,
  firma_habilitada: false,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: null,
  activo: true,
};

const plantillaGeneral = {
  nombre: 'Notificación General',
  tipo: 'general',
  asunto_template: 'Notificación ISTHO CRM',
  cuerpo_html: `<div style="padding: 0">
  {{#if titulo}}
  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 700">{{titulo}}</h2>
  {{/if}}
  {{#if mensaje}}
  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0">{{mensaje}}</p>
  {{/if}}

  {{#if urlAccion}}
  <div style="text-align: center; margin: 30px 0">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="background-color:#E74C3C;border-radius:10px;text-align:center;"><a href="{{urlAccion}}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;font-family:sans-serif;">{{#if labelAccion}}{{labelAccion}}{{else}}Ver en el sistema{{/if}}</a></td></tr></table>
  </div>
  {{/if}}

  <p style="color: #94a3b8; font-size: 12px; margin: 25px 0 0 0; padding-top: 15px; border-top: 1px solid #f3f4f6;">
    Este mensaje fue generado automaticamente por el sistema ISTHO CRM.
  </p>
</div>`,
  firma_habilitada: false,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: null,
  activo: true,
};

const plantillaReseteoPassword = {
  nombre: 'Reseteo de Contraseña',
  tipo: 'reseteo_password',
  asunto_template: '[ISTHO] Reseteo de Contraseña',
  cuerpo_html: `<div style="padding: 0">
  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 700">Reseteo de Contrasena</h2>

  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0">
    Hola <strong style="color: #1e293b">{{nombre}}</strong>,
  </p>

  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0">
    Se ha generado una nueva contrasena para tu cuenta en el sistema ISTHO CRM.
  </p>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 25px 0;">
    <tr>
      <td style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0">
        <p style="margin: 0 0 3px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Usuario</p>
        <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">{{username}}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0">
        <p style="margin: 0 0 3px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
        <p style="margin: 0; color: #1e293b; font-size: 15px">{{email}}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; background-color: #fff7ed">
        <p style="margin: 0 0 3px 0; color: #c2410c; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Nueva Contrasena</p>
        <p style="margin: 0; color: #c2410c; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">{{passwordTemporal}}</p>
      </td>
    </tr>
  </table>

  <div class="info-box warning">
    <strong>Importante:</strong> Esta contrasena es temporal. Deberas cambiarla inmediatamente despues de iniciar sesion.
  </div>

  <div style="text-align: center; margin: 30px 0">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="background-color:#E74C3C;border-radius:10px;text-align:center;"><a href="{{urlLogin}}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;font-family:sans-serif;">Iniciar Sesion</a></td></tr></table>
  </div>

  <div class="info-box error">
    <strong>Seguridad:</strong> Si no solicitaste este cambio de contrasena, contacta inmediatamente al administrador del sistema.
  </div>

  <div class="info-box success">
    <p style="margin: 0 0 10px 0; font-weight: 600">Pasos a seguir:</p>
    <ol style="margin: 0; padding-left: 20px; line-height: 1.8">
      <li>Haz clic en "Iniciar Sesion"</li>
      <li>Ingresa tu usuario y la contrasena temporal</li>
      <li>El sistema te solicitara crear una nueva contrasena</li>
      <li>Elige una contrasena segura (minimo 8 caracteres)</li>
    </ol>
  </div>

  {{#if reseteadoPor}}
  <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0 0">
    Contrasena reseteada por: <strong>{{reseteadoPor}}</strong>
  </p>
  {{/if}}
</div>`,
  firma_habilitada: false,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: null,
  activo: true,
};

const plantillaRecuperacionPassword = {
  nombre: 'Recuperación de Contraseña',
  tipo: 'recuperacion_password',
  asunto_template: '[ISTHO] Recuperación de Contraseña',
  cuerpo_html: `<div style="padding: 0">
  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 700">Recuperación de Contraseña</h2>

  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0">
    Hola <strong style="color: #1e293b">{{nombre}}</strong>,
  </p>

  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 25px 0">
    Recibimos una solicitud para restablecer la contraseña de la cuenta
    <strong style="color: #1e293b; font-family: 'Courier New', monospace">{{username}}</strong>.
    Haz clic en el botón a continuación para crear una nueva contraseña.
  </p>

  <div style="text-align: center; margin: 32px 0">
    <a href="{{urlReset}}" style="display: inline-block; background: linear-gradient(135deg, #E74C3C, #C0392B); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 10px; letter-spacing: 0.3px;">
      Restablecer Contraseña
    </a>
  </div>

  <div class="info-box warning">
    <strong>Importante:</strong> Este enlace es válido por <strong>1 hora</strong>.
    Si no solicitaste este cambio, ignora este correo — tu contraseña no será modificada.
  </div>

  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0 0; word-break: break-all">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
    <a href="{{urlReset}}" style="color: #E74C3C; word-break: break-all">{{urlReset}}</a>
  </p>
</div>`,
  firma_habilitada: false,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  subtipo: null,
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLA 4: AVISO DE INGRESO (solicitud_nueva / ingreso)
// ════════════════════════════════════════════════════════════════════════════

const plantillaAvisoIngreso = {
  nombre: 'Aviso de Ingreso — Nueva Solicitud',
  tipo: 'solicitud_nueva',
  subtipo: 'ingreso',
  asunto_template: 'Nueva {{tipoLabel}}: {{numeroSolicitud}} — {{clienteNombre}}',
  cuerpo_html: `<h2 style="color:#E74C3C;margin:0 0 5px 0">Aviso de Ingreso recibida</h2>
<p style="color:#64748b;margin:0 0 25px 0;font-size:14px">El cliente ha registrado un nuevo aviso de ingreso de mercancía a bodega.</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td bgcolor="#C0392B" style="background-color:#C0392B;background:linear-gradient(135deg,#E74C3C,#C0392B);padding:14px 20px">
      <span style="color:#fff;font-size:14px;font-weight:600">Detalle de la Solicitud</span>
    </td>
  </tr>
  <tr>
    <td style="padding:0">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse">
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:180px">N° Solicitud</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;font-size:14px">{{numeroSolicitud}}</td>
        </tr>
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Cliente</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:14px">{{clienteNombre}}</td>
        </tr>
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Prioridad</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{prioridad}}</td>
        </tr>
        {{#if fechaEstimada}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Fecha estimada</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{fechaEstimada}}</td>
        </tr>
        {{/if}}
        {{#if numeroDocumento}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">N° Documento</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{numeroDocumento}}</td>
        </tr>
        {{/if}}
        {{#if transportista}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Transportista</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{transportista}}</td>
        </tr>
        {{/if}}
        {{#if notas}}
        <tr>
          <td style="padding:11px 20px;color:#64748b;font-size:13px">Notas</td>
          <td style="padding:11px 20px;color:#1e293b;font-size:14px">{{notas}}</td>
        </tr>
        {{/if}}
      </table>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0">
  <a href="{{urlSolicitud}}" style="background:#E74C3C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">Ver Solicitud</a>
</p>`,
  firma_habilitada: true,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLA 5: SOLICITUD DE DESPACHO (solicitud_nueva / despacho)
// ════════════════════════════════════════════════════════════════════════════

const plantillaSolicitudDespacho = {
  nombre: 'Solicitud de Despacho — Nueva Solicitud',
  tipo: 'solicitud_nueva',
  subtipo: 'despacho',
  asunto_template: 'Nueva {{tipoLabel}}: {{numeroSolicitud}} — {{clienteNombre}}',
  cuerpo_html: `<h2 style="color:#E74C3C;margin:0 0 5px 0">Solicitud de Despacho recibida</h2>
<p style="color:#64748b;margin:0 0 25px 0;font-size:14px">El cliente ha registrado una nueva solicitud de salida de productos de bodega.</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td bgcolor="#C0392B" style="background-color:#C0392B;background:linear-gradient(135deg,#E74C3C,#C0392B);padding:14px 20px">
      <span style="color:#fff;font-size:14px;font-weight:600">Detalle de la Solicitud</span>
    </td>
  </tr>
  <tr>
    <td style="padding:0">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse">
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:180px">N° Solicitud</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;font-size:14px">{{numeroSolicitud}}</td>
        </tr>
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Cliente</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:14px">{{clienteNombre}}</td>
        </tr>
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Prioridad</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{prioridad}}</td>
        </tr>
        {{#if fechaEstimada}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Fecha deseada</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{fechaEstimada}}</td>
        </tr>
        {{/if}}
        {{#if numeroDocumento}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">N° Orden de Compra</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{numeroDocumento}}</td>
        </tr>
        {{/if}}
        {{#if direccionEntrega}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Dirección de entrega</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{direccionEntrega}}</td>
        </tr>
        {{/if}}
        {{#if contactoDestino}}
        <tr>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">Contacto destino</td>
          <td style="padding:11px 20px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px">{{contactoDestino}}</td>
        </tr>
        {{/if}}
        {{#if notas}}
        <tr>
          <td style="padding:11px 20px;color:#64748b;font-size:13px">Notas</td>
          <td style="padding:11px 20px;color:#1e293b;font-size:14px">{{notas}}</td>
        </tr>
        {{/if}}
      </table>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0">
  <a href="{{urlSolicitud}}" style="background:#E74C3C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">Ver Solicitud</a>
</p>`,
  firma_habilitada: true,
  firma_html: null,
  campos_disponibles: null,
  es_predeterminada: true,
  activo: true,
};

// ════════════════════════════════════════════════════════════════════════════
// EJECUTAR SEED (upsert: actualiza si ya existe)
// ════════════════════════════════════════════════════════════════════════════

async function seed({ standalone = true } = {}) {
  try {
    if (standalone) {
      await db.sequelize.authenticate();
      console.log('✅ Conexión a BD establecida');
    }

    const { PlantillaEmail } = db;

    // Upsert plantilla de Entrada
    const [entrada, entradaCreated] = await PlantillaEmail.findOrCreate({
      where: { nombre: plantillaEntrada.nombre },
      defaults: plantillaEntrada,
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
      defaults: plantillaSalida,
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
      defaults: plantillaKardex,
    });

    if (!kardexCreated) {
      await kardex.update(plantillaKardex);
      console.log('🔄 Plantilla de Kardex actualizada (id:', kardex.id, ')');
    } else {
      console.log('✅ Plantilla de Kardex creada (id:', kardex.id, ')');
    }

    // Upsert plantillas de solicitudes nuevas
    const solicitudDefs = [plantillaAvisoIngreso, plantillaSolicitudDespacho];
    for (const def of solicitudDefs) {
      const [rec, created] = await PlantillaEmail.findOrCreate({
        where: { nombre: def.nombre },
        defaults: def,
      });
      if (!created) {
        await rec.update(def);
        console.log(`🔄 Plantilla "${def.nombre}" actualizada (id: ${rec.id})`);
      } else {
        console.log(`✅ Plantilla "${def.nombre}" creada (id: ${rec.id})`);
      }
    }

    // Upsert plantillas del sistema
    const sistemaDefs = [
      plantillaBienvenida,
      plantillaAlertaInventario,
      plantillaGeneral,
      plantillaReseteoPassword,
      plantillaRecuperacionPassword,
    ];

    for (const def of sistemaDefs) {
      const [rec, created] = await PlantillaEmail.findOrCreate({
        where: { nombre: def.nombre },
        defaults: def,
      });
      if (!created) {
        await rec.update(def);
        console.log(`🔄 Plantilla "${def.nombre}" actualizada (id: ${rec.id})`);
      } else {
        console.log(`✅ Plantilla "${def.nombre}" creada (id: ${rec.id})`);
      }
    }

    console.log('\n🎉 Seed completado exitosamente');
    if (standalone) process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (standalone) process.exit(1);
    throw err;
  }
}

module.exports = seed;
if (require.main === module) {
  seed({ standalone: true });
}
