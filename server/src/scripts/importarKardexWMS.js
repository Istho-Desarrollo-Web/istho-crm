'use strict';

/**
 * ISTHO CRM - Importación histórica de ajustes Kardex desde el WMS
 *
 * Recorre todas las cajas del CRM que tienen wms_pallet_id, descarga
 * el historial completo de movimientos kardex del WMS para cada una
 * y sincroniza los ajustes manuales que aún no estén en el CRM.
 *
 * Reglas de filtrado (mismas que el polling automático):
 *   - Solo operaciones de tipo "Carga" (ajustes de entrada manual)
 *   - Omite movimientos operacionales (picking / orden de recepción)
 *   - Dedup por clave única: palletCode::timestamp::operacion::cantidad
 *
 * PREREQUISITO: Las cajas deben tener wms_pallet_id.
 *   Si no lo tienen, primero ejecutar:
 *     node server/src/scripts/importarOrdenesWMS.js
 *
 * USO:
 *   node server/src/scripts/importarKardexWMS.js
 *   node server/src/scripts/importarKardexWMS.js --dry-run
 *   node server/src/scripts/importarKardexWMS.js --desde 2026-01-01
 *   node server/src/scripts/importarKardexWMS.js --batch 30
 *   node server/src/scripts/importarKardexWMS.js --limit-por-pallet 200
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const wmsApiService = require('../services/wmsApiService');

// ─── Argumentos ───────────────────────────────────────────────────────────────
const ARGS           = process.argv.slice(2);
const DRY_RUN        = ARGS.includes('--dry-run');
const DESDE_STR      = (() => { const i = ARGS.indexOf('--desde');            return i !== -1 ? ARGS[i + 1] : null; })();
const BATCH_SIZE     = (() => { const i = ARGS.indexOf('--batch');            return i !== -1 ? parseInt(ARGS[i + 1], 10) : 50; })();
const LIMIT_POR_PAL  = (() => { const i = ARGS.indexOf('--limit-por-pallet'); return i !== -1 ? parseInt(ARGS[i + 1], 10) : 200; })();
const DESDE          = DESDE_STR ? new Date(DESDE_STR) : null;

if (DESDE && isNaN(DESDE.getTime())) {
  console.error(`❌ Fecha inválida en --desde: "${DESDE_STR}". Usa formato YYYY-MM-DD.`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function motivoEsOperacional(motivoRaw) {
  const nombre = typeof motivoRaw === 'string'
    ? motivoRaw
    : (motivoRaw?.name || motivoRaw?.motive || '');
  const lower = nombre.toLowerCase();
  return lower.includes('picking') || lower.includes('orden de');
}

function motivoNombre(motivoRaw) {
  return typeof motivoRaw === 'string'
    ? motivoRaw
    : (motivoRaw?.name || motivoRaw?.motive || 'Ajuste WMS');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { sequelize, CajaInventario, Inventario, Cliente, WmsSyncLog } = require('../models');
  const { Op } = require('sequelize');
  const { syncKardex } = require('../services/wmsSyncService');

  await sequelize.authenticate();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    ISTHO CRM — Importación histórica de Kardex WMS          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('⚠️  MODO DRY-RUN — no se escribe nada en BD');
  if (DESDE)   console.log(`📅 Solo ajustes desde: ${DESDE.toISOString().slice(0, 10)}`);
  console.log(`📦 Batch: ${BATCH_SIZE} cajas | Historial por pallet: ${LIMIT_POR_PAL} entradas`);
  console.log('');

  // Login al WMS
  console.log('🔐 Autenticando en WMS...');
  await wmsApiService.calentarToken();
  console.log('✅ Token WMS listo\n');

  // ── 1. Contar cajas con wms_pallet_id ────────────────────────────────────
  const totalCajas = await CajaInventario.count({
    where: { wms_pallet_id: { [Op.not]: null } },
  });

  if (totalCajas === 0) {
    console.log('⚠️  No hay cajas con wms_pallet_id en el CRM.');
    console.log('   Ejecuta primero: node server/src/scripts/importarOrdenesWMS.js');
    await sequelize.close();
    return;
  }
  console.log(`📋 Cajas con wms_pallet_id: ${totalCajas}`);
  console.log('');

  // Contadores globales
  let cajasProcessed = 0;
  let ajustesImportados = 0;
  let ajustesOmitidos = 0;
  const erroresCajas = [];

  // ── 2. Procesar en batches para no cargar toda la tabla en memoria ────────
  let offset = 0;
  while (offset < totalCajas) {
    const cajas = await CajaInventario.findAll({
      where:   { wms_pallet_id: { [Op.not]: null } },
      order:   [['id', 'ASC']],
      limit:   BATCH_SIZE,
      offset,
      include: [
        {
          model: Inventario,
          as:    'inventario',
          include: [{ model: Cliente, as: 'cliente' }],
        },
      ],
    });

    if (cajas.length === 0) break;
    process.stdout.write(`\n📦 Procesando cajas ${offset + 1}–${offset + cajas.length} de ${totalCajas}...\n`);

    // Deduplicación dentro del batch: distintas cajas CRM pueden apuntar
    // al mismo wms_pallet_id (palletCode idéntico en el WMS).
    const palletIdsProcesados = new Set();

    for (const caja of cajas) {
      cajasProcessed++;
      const palletId  = caja.wms_pallet_id;
      const palletRef = caja.numero_caja || palletId;
      const nit       = caja.inventario?.cliente?.nit;

      if (!nit) {
        process.stdout.write(`  ⚠️  Caja ${palletRef}: sin NIT de cliente — omitida\n`);
        continue;
      }
      if (palletIdsProcesados.has(palletId)) continue;
      palletIdsProcesados.add(palletId);

      try {
        // Obtener historial de kardex del WMS para este pallet
        const items = await wmsApiService.getKardexHistory(palletId, {
          limit: LIMIT_POR_PAL,
          page: 1,
        });
        const historial = Array.isArray(items) ? items : [];

        if (historial.length === 0) continue;

        // Filtrar por fecha si se indicó --desde
        const entradas = DESDE
          ? historial.filter(e => new Date(e.createdAt) >= DESDE)
          : historial;

        for (const entry of entradas) {
          // Solo Cargas manuales (ajustes). Las Descargas y movimientos operacionales
          // quedan cubiertos por las órdenes de picking ya importadas.
          if (entry.operation !== 'Carga') continue;
          if (motivoEsOperacional(entry.motive)) continue;

          const palletCode = entry.palletCode || palletRef;
          const entryKey   = `${palletCode}::${entry.createdAt}::${entry.operation}::${entry.quantity}`.substring(0, 150);

          // Dedup entre ciclos: verificar si ya fue procesado (por el polling o scripts anteriores)
          const yaExiste = await WmsSyncLog.findOne({
            where: { tipo: 'polling_kardex', documento_origen: entryKey },
          });
          if (yaExiste) { ajustesOmitidos++; continue; }

          if (DRY_RUN) {
            console.log(`  [DRY-RUN] Importaría kardex: pallet=${palletCode} op=${entry.operation} qty=${entry.quantity} motivo="${motivoNombre(entry.motive)}"`);
            ajustesImportados++;
            continue;
          }

          try {
            await syncKardex({
              nit,
              motivo: motivoNombre(entry.motive),
              detalles: [
                {
                  producto:      entry.product?.sku || caja.inventario?.sku,
                  descripcion:   caja.inventario?.descripcion || caja.inventario?.producto,
                  caja:          palletCode,
                  cantidad:      entry.quantity, // siempre positivo (es Carga)
                  lote:          caja.lote || null,
                  unidad_medida: caja.inventario?.unidad_medida || 'UND',
                },
              ],
            });

            // Registrar en WmsSyncLog para que el polling no lo reprocese
            WmsSyncLog.create({
              tipo:             'polling_kardex',
              documento_origen: entryKey,
              nit,
              estado:           'exitoso',
              detalles: {
                motivo:         motivoNombre(entry.motive),
                operacion_wms:  entry.operation,
                cantidad:       entry.quantity,
                pallet_code:    palletCode,
                origen:         'script_importacion',
              },
            }).catch(() => {});

            ajustesImportados++;
          } catch (syncErr) {
            const esPermanente = syncErr.message?.includes('no está permitido');
            if (!esPermanente) {
              erroresCajas.push({ pallet: palletCode, error: syncErr.message });
              process.stdout.write(`  ❌ ${palletCode}: ${syncErr.message.substring(0, 70)}\n`);
            }
            // Guardar log de fallo para dedup (evitar reintentos infinitos)
            WmsSyncLog.create({
              tipo:             'polling_kardex',
              documento_origen: entryKey,
              nit,
              estado:           'fallido',
              error_mensaje:    syncErr.message,
              detalles:         { motivo: motivoNombre(entry.motive), origen: 'script_importacion' },
            }).catch(() => {});
          }
        }

        process.stdout.write(`\r  📊 ${cajasProcessed}/${totalCajas} cajas | kardex: ${ajustesImportados} importados, ${ajustesOmitidos} omitidos    `);

      } catch (err) {
        erroresCajas.push({ pallet: palletRef, error: err.message });
        process.stdout.write(`\n  ❌ Pallet ${palletRef}: ${err.message.substring(0, 70)}\n`);
      }
    }

    offset += BATCH_SIZE;
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n');
  console.log('═'.repeat(62));
  console.log('✅ IMPORTACIÓN DE KARDEX COMPLETADA');
  console.log('═'.repeat(62));
  console.log(`  Cajas procesadas                 : ${cajasProcessed}`);
  console.log(`  Ajustes importados al CRM        : ${ajustesImportados}`);
  console.log(`  Omitidos (ya existían)           : ${ajustesOmitidos}`);
  console.log(`  Errores                          : ${erroresCajas.length}`);
  if (erroresCajas.length) {
    console.log('');
    console.log('  Detalle de errores:');
    erroresCajas.forEach(e => console.warn(`    - Pallet ${e.pallet}: ${e.error}`));
  }
  console.log('═'.repeat(62));

  await sequelize.close();
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
