/**
 * ISTHO CRM - Seed de Configuración WMS
 *
 * Crea la configuración inicial para la integración WMS Copérnico:
 * - Motivos de Kardex permitidos
 * - Mapeo de tipos de orden (fallback)
 * - Estados válidos para procesar órdenes
 *
 * Idempotente: solo crea lo que no existe.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

require('dotenv').config();

async function seed({ standalone = true } = {}) {
  try {
    const db = require('../models');

    if (standalone) {
      await db.sequelize.authenticate();
      console.log('✅ Conexión a la base de datos establecida');
    }

    const { ConfiguracionWms } = db;

    const CONFIGURACIONES = [
      // ═══════════════════════════════════════════
      // MOTIVOS DE KARDEX PERMITIDOS
      // ═══════════════════════════════════════════
      {
        categoria: 'motivo_kardex',
        valor_wms: 'Recarga',
        valor_crm: 'Recarga de stock',
        requiere_detalle: false,
        descripcion: 'Recarga de inventario desde el WMS',
        orden: 1
      },
      {
        categoria: 'motivo_kardex',
        valor_wms: 'Otro',
        valor_crm: 'Ajuste manual',
        requiere_detalle: true,
        descripcion: 'Motivo personalizado — el WMS envía el detalle adicional',
        orden: 2
      },

      // ═══════════════════════════════════════════
      // MAPEO DE TIPOS DE ORDEN (FALLBACK)
      // ═══════════════════════════════════════════
      {
        categoria: 'tipo_orden',
        valor_wms: 'Recepcion',
        valor_crm: 'Entrada (CO)',
        tipo_documento: 'CO',
        descripcion: 'Fallback: si no viene tipo_documento="CO", busca tipo_orden="Recepcion"',
        orden: 1
      },
      {
        categoria: 'tipo_orden',
        valor_wms: 'Picking',
        valor_crm: 'Salida (PK)',
        tipo_documento: 'PK',
        descripcion: 'Fallback: si no viene tipo_documento="PK", busca tipo_orden="Picking"',
        orden: 2
      },

      // ═══════════════════════════════════════════
      // ESTADOS VÁLIDOS PARA PROCESAR
      // ═══════════════════════════════════════════
      {
        categoria: 'estado_valido',
        valor_wms: 'Finalizada',
        valor_crm: 'Finalizada',
        descripcion: 'Solo procesar órdenes con estado "Finalizada"',
        orden: 1
      }
    ];

    let creados = 0;
    let existentes = 0;

    for (const config of CONFIGURACIONES) {
      const [, created] = await ConfiguracionWms.findOrCreate({
        where: {
          categoria: config.categoria,
          valor_wms: config.valor_wms
        },
        defaults: config
      });

      if (created) {
        creados++;
        console.log(`  ✅ Creado: [${config.categoria}] ${config.valor_wms} → ${config.valor_crm}`);
      } else {
        existentes++;
      }
    }

    console.log(`\n📊 Configuración WMS: ${creados} creados, ${existentes} ya existían`);

    if (standalone) process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed de configuración WMS:', error.message);
    if (standalone) process.exit(1);
    throw error;
  }
}

module.exports = seed;

if (require.main === module) {
  seed({ standalone: true });
}
