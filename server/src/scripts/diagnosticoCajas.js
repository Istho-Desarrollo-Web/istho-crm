'use strict';

/**
 * Diagnóstico: muestra el estado real de CajaInventario y MovimientoInventario
 * para un número de caja específico.
 *
 * USO:
 *   node server/src/scripts/diagnosticoCajas.js 69934
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { sequelize } = require('../config/database');

const NUMERO_CAJA = process.argv[2] || '69934';

async function diagnosticar() {
  const SKU = process.argv[3] || null;

  if (SKU) {
    // Buscar por SKU para encontrar el inventario_id
    console.log(`\n🔍 Buscando inventario para SKU: ${SKU}\n${'═'.repeat(60)}\n`);
    const [invRecords] = await sequelize.query(`
      SELECT i.id, i.sku, i.producto, i.cantidad, i.cliente_id, c.razon_social
      FROM inventario i
      LEFT JOIN clientes c ON c.id = i.cliente_id
      WHERE i.sku LIKE ?
    `, { replacements: [`%${SKU}%`] });

    console.log(`  ${invRecords.length} registro(s):`);
    invRecords.forEach(r => {
      console.log(`  → inventario_id=${r.id} | sku=${r.sku} | cantidad=${r.cantidad} | cliente=${r.razon_social}`);
    });
    console.log();

    // Para cada inventario encontrado, mostrar sus cajas
    for (const inv of invRecords) {
      await mostrarCajasDeInventario(inv.id);
    }
    return;
  }

  console.log(`\n🔍 Diagnóstico para caja: ${NUMERO_CAJA}\n${'═'.repeat(60)}\n`);

  // 1. Todos los registros CajaInventario con ese numero_caja (búsqueda amplia)
  const [cajas] = await sequelize.query(`
    SELECT
      ci.id,
      ci.inventario_id,
      ci.operacion_id,
      ci.numero_caja,
      ci.cantidad,
      ci.tipo,
      ci.estado,
      ci.documento_asociado,
      ci.lote,
      ci.fecha_movimiento,
      ci.created_at,
      i.sku,
      i.producto AS inv_producto,
      i.cliente_id,
      c.razon_social AS cliente,
      o.numero_operacion,
      o.tipo AS op_tipo,
      o.documento_wms,
      o.numero_picking,
      o.wms_order_id
    FROM caja_inventario ci
    LEFT JOIN inventario i ON i.id = ci.inventario_id
    LEFT JOIN clientes c ON c.id = i.cliente_id
    LEFT JOIN operaciones o ON o.id = ci.operacion_id
    WHERE ci.numero_caja LIKE CONCAT('%', ?, '%')
    ORDER BY ci.tipo, ci.created_at
  `, { replacements: [NUMERO_CAJA] });

  console.log(`📦 CajaInventario — ${cajas.length} registro(s) con numero_caja LIKE '%${NUMERO_CAJA}%':\n`);

  if (cajas.length === 0) {
    console.log('  (sin registros — posible que numero_caja tenga formato diferente)\n');

    // Mostrar muestra de cajas existentes
    const [muestra] = await sequelize.query(`
      SELECT numero_caja, COUNT(*) as n FROM caja_inventario
      WHERE numero_caja IS NOT NULL
      GROUP BY numero_caja
      ORDER BY CAST(numero_caja AS UNSIGNED) DESC
      LIMIT 20
    `);
    console.log('  Muestra de numero_caja en BD:');
    muestra.forEach(r => console.log(`    "${r.numero_caja}" (${r.n} registros)`));
    console.log();
  } else {
    cajas.forEach((r, idx) => {
      console.log(`  [${idx + 1}] ID=${r.id} | tipo=${r.tipo} | estado=${r.estado} | cantidad=${r.cantidad}`);
      console.log(`       inventario_id=${r.inventario_id} | sku=${r.sku} | cliente=${r.cliente}`);
      console.log(`       operacion_id=${r.operacion_id} | op_tipo=${r.op_tipo} | doc_wms=${r.documento_wms} | picking=${r.numero_picking}`);
      console.log(`       doc_asociado=${r.documento_asociado} | lote=${r.lote}`);
      console.log(`       numero_caja_raw="${r.numero_caja}" | created_at=${r.created_at}\n`);
    });
  }

  // 2. Todos los inventario_id afectados
  const inventarioIds = [...new Set(cajas.map(c => c.inventario_id).filter(Boolean))];
  if (inventarioIds.length === 0) {
    console.log('No hay inventario_ids asociados. Fin.\n');
    return;
  }

  console.log(`\n📋 inventario_id(s) encontrados: ${inventarioIds.join(', ')}\n`);
  for (const invId of inventarioIds) {
    await mostrarCajasDeInventario(invId);
  }
}

async function mostrarCajasDeInventario(invId) {
  // MovimientoInventario
  const [movs] = await sequelize.query(`
    SELECT mi.id, mi.tipo, mi.motivo, mi.cantidad, mi.stock_anterior, mi.stock_resultante,
           mi.documento_referencia, mi.fecha_movimiento, o.numero_operacion, o.tipo AS op_tipo
    FROM movimientos_inventario mi
    LEFT JOIN operaciones o ON o.id = mi.operacion_id
    WHERE mi.inventario_id = ?
    ORDER BY mi.fecha_movimiento DESC LIMIT 20
  `, { replacements: [invId] });
  // Nota: la tabla se llama movimientos_inventario (con s)

  console.log(`\n🔄 MovimientoInventario inventario_id=${invId} — ${movs.length} (últimos 20):\n`);
  if (movs.length === 0) {
    console.log('  (sin movimientos)\n');
  } else {
    movs.forEach((m, i) => {
      console.log(`  [${i+1}] tipo=${m.tipo} | motivo=${m.motivo} | qty=${m.cantidad} | stock: ${m.stock_anterior}→${m.stock_resultante}`);
      console.log(`       doc=${m.documento_referencia} | op=${m.numero_operacion} | created=${m.created_at}\n`);
    });
  }

  // Resumen cajas
  const [resumen] = await sequelize.query(`
    SELECT tipo, estado, COUNT(*) AS total, SUM(cantidad) AS suma_qty
    FROM caja_inventario WHERE inventario_id = ?
    GROUP BY tipo, estado ORDER BY tipo, estado
  `, { replacements: [invId] });

  console.log(`📊 Resumen CajaInventario inventario_id=${invId}:`);
  resumen.forEach(r => {
    console.log(`  tipo=${r.tipo} | estado=${r.estado} | registros=${r.total} | suma_qty=${r.suma_qty}`);
  });

  // Todas las cajas de ese inventario
  const [todasCajas] = await sequelize.query(`
    SELECT ci.id, ci.numero_caja, ci.cantidad, ci.tipo, ci.estado, ci.documento_asociado, ci.lote,
           o.numero_operacion, o.tipo AS op_tipo, o.documento_wms, o.numero_picking
    FROM caja_inventario ci
    LEFT JOIN operaciones o ON o.id = ci.operacion_id
    WHERE ci.inventario_id = ?
    ORDER BY ci.tipo, ci.created_at
  `, { replacements: [invId] });

  console.log(`\n📦 Todas las cajas de inventario_id=${invId} (${todasCajas.length} total):\n`);
  todasCajas.forEach((c, i) => {
    console.log(`  [${i+1}] ID=${c.id} | caja="${c.numero_caja}" | tipo=${c.tipo} | estado=${c.estado} | qty=${c.cantidad}`);
    console.log(`       doc_asoc=${c.documento_asociado} | op=${c.numero_operacion} (${c.op_tipo}) | doc_wms=${c.documento_wms} | picking=${c.numero_picking}\n`);
  });
}

diagnosticar()
  .then(() => { sequelize.close(); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
