'use strict';

/**
 * ISTHO CRM - Importación masiva de órdenes WMS al CRM
 *
 * Descarga TODAS las órdenes finalizadas del WMS (paginando) y las sincroniza
 * al CRM usando el mismo flujo que el polling: wmsOrderMapper → syncEntrada/syncSalida.
 *
 * Las órdenes que ya existen en el CRM se omiten automáticamente (dedup por
 * wms_order_id / documento_wms, igual que el polling normal).
 *
 * PREREQUISITO: Que los clientes existan en el CRM con su NIT correcto.
 *
 * USO:
 *   node server/src/scripts/importarOrdenesWMS.js
 *   node server/src/scripts/importarOrdenesWMS.js --dry-run
 *   node server/src/scripts/importarOrdenesWMS.js --desde 2026-01-01
 *   node server/src/scripts/importarOrdenesWMS.js --tipo entradas
 *   node server/src/scripts/importarOrdenesWMS.js --tipo salidas
 *   node server/src/scripts/importarOrdenesWMS.js --paginas 5
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const wmsApiService   = require('../services/wmsApiService');
const wmsOrderMapper  = require('../services/wmsOrderMapper');

// ─── Argumentos ───────────────────────────────────────────────────────────────
const ARGS       = process.argv.slice(2);
const DRY_RUN    = ARGS.includes('--dry-run');
const TIPO       = (() => { const i = ARGS.indexOf('--tipo');    return i !== -1 ? ARGS[i + 1] : 'all'; })();
const DESDE_STR  = (() => { const i = ARGS.indexOf('--desde');   return i !== -1 ? ARGS[i + 1] : null; })();
const MAX_PAG    = (() => { const i = ARGS.indexOf('--paginas'); return i !== -1 ? parseInt(ARGS[i + 1], 10) : 9999; })();
const PAGE_SIZE  = 50;
const DESDE      = DESDE_STR ? new Date(DESDE_STR) : null;

if (DESDE && isNaN(DESDE.getTime())) {
  console.error(`❌ Fecha inválida en --desde: "${DESDE_STR}". Usa formato YYYY-MM-DD.`);
  process.exit(1);
}
if (!['all', 'entradas', 'salidas'].includes(TIPO)) {
  console.error(`❌ --tipo debe ser: entradas | salidas | all`);
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { sequelize, Operacion } = require('../models');
  const { Op }                   = require('sequelize');
  const { syncEntrada, syncSalida } = require('../services/wmsSyncService');

  await sequelize.authenticate();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    ISTHO CRM — Importación masiva de órdenes WMS            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (DRY_RUN)   console.log('⚠️  MODO DRY-RUN — no se escribe nada en BD');
  if (DESDE)     console.log(`📅 Filtrando desde: ${DESDE.toISOString().slice(0, 10)}`);
  if (TIPO !== 'all') console.log(`📦 Tipo: ${TIPO}`);
  console.log('');

  // Login al WMS
  console.log('🔐 Autenticando en WMS...');
  await wmsApiService.calentarToken();
  console.log('✅ Token WMS listo\n');

  // Contadores globales
  let paginaActual   = 1;
  let totalRevisadas = 0;
  let totalImportadas = 0;
  let totalOmitidas  = 0;
  const errores      = [];

  while (paginaActual <= MAX_PAG) {
    let ordenes;
    try {
      const resultado = await wmsApiService.getOrdenes({ limit: PAGE_SIZE, page: paginaActual });
      ordenes = Array.isArray(resultado)
        ? resultado
        : (resultado?.items ?? resultado?.data ?? []);
    } catch (err) {
      console.error(`❌ Error al obtener página ${paginaActual} del WMS:`, err.message);
      break;
    }

    if (ordenes.length === 0) break;

    totalRevisadas += ordenes.length;
    process.stdout.write(`📄 Pág ${paginaActual} — ${ordenes.length} órdenes (rev: ${totalRevisadas})...\n`);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const finalizadas = ordenes.filter(o => o.orderStatus?.name === 'Finalizada');
    const porFecha    = DESDE
      ? finalizadas.filter(o => {
          const f = o.orderDate ? new Date(o.orderDate) : null;
          return !f || isNaN(f) || f >= DESDE;
        })
      : finalizadas;
    const aProcesar   = porFecha.filter(o => {
      if (TIPO === 'entradas') return o.type === 1;
      if (TIPO === 'salidas')  return o.type === 2;
      return true;
    });

    // ── Procesar cada orden ───────────────────────────────────────────────────
    for (const orden of aProcesar) {
      const refOrden = orden.systemNumberOrder || orden.customerNumberOrder || orden.id;

      try {
        // Dedup: verificar si ya existe en CRM (mismo check que el polling)
        const yaExiste = await Operacion.findOne({
          where: {
            [Op.or]: [
              { wms_order_id: orden.id },
              ...(orden.systemNumberOrder
                ? [{ documento_wms: orden.systemNumberOrder.toString() }]
                : []),
              ...(orden.customerNumberOrder
                ? [{ documento_wms: orden.customerNumberOrder.toString() }]
                : []),
            ],
          },
          paranoid: false,
        });

        if (yaExiste) {
          totalOmitidas++;
          continue;
        }

        if (DRY_RUN) {
          const tipoStr = orden.type === 1 ? 'ENTRADA' : orden.type === 2 ? 'SALIDA' : `tipo-${orden.type}`;
          console.log(`  [DRY-RUN] Importaría ${tipoStr}: ${refOrden}`);
          totalImportadas++;
          continue;
        }

        // Obtener detalle completo del WMS (incluye NIT, orderItems con pallets)
        const detalle = await wmsApiService.getOrdenDetalle(orden.id);
        const ordenCompleta = (detalle && typeof detalle === 'object' && !Array.isArray(detalle))
          ? { ...orden, ...detalle }
          : orden;
        const itemsArr = Array.isArray(ordenCompleta.orderItems) ? ordenCompleta.orderItems : [];

        const { tipo, payload } = await wmsOrderMapper.mapearOrden(ordenCompleta, itemsArr);

        if (tipo === 'entrada') {
          await syncEntrada(payload);
        } else {
          await syncSalida(payload);
        }

        totalImportadas++;
        process.stdout.write(`  ✅ ${refOrden} (${tipo})\n`);

      } catch (err) {
        // Clientes inactivos/suspendidos: estado de negocio esperado
        if (/está (inactivo|suspendido)/i.test(err.message)) {
          totalOmitidas++;
          continue;
        }
        // Duplicado detectado dentro del servicio
        if (err.statusCode === 409) {
          totalOmitidas++;
          continue;
        }
        errores.push({ ref: refOrden, error: err.message });
        process.stdout.write(`  ⚠️  ${refOrden}: ${err.message.substring(0, 80)}\n`);
      }
    }

    // Si el WMS devolvió menos de PAGE_SIZE, no hay más páginas
    if (ordenes.length < PAGE_SIZE) break;
    paginaActual++;
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('═'.repeat(62));
  console.log('✅ IMPORTACIÓN DE ÓRDENES COMPLETADA');
  console.log('═'.repeat(62));
  console.log(`  Páginas procesadas               : ${paginaActual}`);
  console.log(`  Total órdenes revisadas en WMS   : ${totalRevisadas}`);
  console.log(`  Importadas al CRM                : ${totalImportadas}`);
  console.log(`  Omitidas (ya existían / skip)    : ${totalOmitidas}`);
  console.log(`  Errores                          : ${errores.length}`);
  if (errores.length) {
    console.log('');
    console.log('  Detalle de errores:');
    errores.forEach(e => console.warn(`    - ${e.ref}: ${e.error}`));
  }
  console.log('═'.repeat(62));
  console.log('');
  console.log('▶ Siguiente paso recomendado:');
  console.log('  node server/src/scripts/importarKardexWMS.js');
  console.log('  (sincroniza ajustes de kardex usando los wms_pallet_id ya guardados)');

  await sequelize.close();
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
