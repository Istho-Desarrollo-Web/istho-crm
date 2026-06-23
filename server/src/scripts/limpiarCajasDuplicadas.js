'use strict';

/**
 * ISTHO CRM - Limpieza de CajaInventario duplicadas
 *
 * Detecta cajas con el mismo (inventario_id, numero_caja) y tipo='entrada'
 * que existan más de una vez (creadas por ejecuciones incorrectas del script
 * de importación). Para cada grupo:
 *   1. Conserva el registro con mayor cantidad
 *   2. Elimina los duplicados
 *   3. Elimina los MovimientoInventario asociados a los duplicados
 *   4. Ajusta inventario.cantidad restando lo eliminado
 *
 * USO:
 *   node server/src/scripts/limpiarCajasDuplicadas.js             (preview)
 *   node server/src/scripts/limpiarCajasDuplicadas.js --ejecutar  (aplica cambios)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const { CajaInventario, MovimientoInventario, Inventario } = require('../models');

const EJECUTAR = process.argv.includes('--ejecutar');

async function limpiarDuplicados() {
  console.log(`\n🔍 Buscando cajas duplicadas (todos los tipos)...\n`);
  if (!EJECUTAR) {
    console.log('  ⚠️  MODO PREVIEW — pasa --ejecutar para aplicar los cambios\n');
  }

  // Resumen por tipo primero
  const [resumenTipos] = await sequelize.query(`
    SELECT tipo, COUNT(*) AS total_registros
    FROM caja_inventario
    GROUP BY tipo
    ORDER BY tipo
  `);
  console.log('  Registros por tipo:');
  resumenTipos.forEach((r) => console.log(`    ${r.tipo}: ${r.total_registros}`));
  console.log();

  // Duplicados: mismo (inventario_id, numero_caja, tipo), más de 1 registro
  const [grupos] = await sequelize.query(`
    SELECT inventario_id, numero_caja, tipo, COUNT(*) AS total
    FROM caja_inventario
    WHERE numero_caja IS NOT NULL
    GROUP BY inventario_id, numero_caja, tipo
    HAVING COUNT(*) > 1
    ORDER BY tipo, inventario_id, numero_caja
  `);

  if (grupos.length === 0) {
    console.log('✅ No se encontraron cajas duplicadas.\n');
    process.exit(0);
  }

  console.log(`⚠️  ${grupos.length} grupo(s) con duplicados:\n`);

  let totalEliminadas = 0;

  for (const grupo of grupos) {
    const { inventario_id, numero_caja, tipo: tipoGrupo, total } = grupo;

    const cajas = await CajaInventario.findAll({
      where: { inventario_id, numero_caja, tipo: tipoGrupo },
      order: [['cantidad', 'DESC'], ['id', 'ASC']],
    });

    // Salidas pueden tener múltiples registros legítimos (una por picking). Solo limpiar entradas.
    if (tipoGrupo !== 'entrada') {
      console.log(`    ⚠️  tipo=${tipoGrupo} — no se limpia automáticamente (puede ser legítimo)\n`);
      continue;
    }

    const [conservar, ...eliminar] = cajas;
    const cantidadEliminada = eliminar.reduce((s, c) => s + (parseFloat(c.cantidad) || 0), 0);
    const idsEliminar = eliminar.map((c) => c.id);
    const operacionIdsEliminar = [...new Set(eliminar.map((c) => c.operacion_id).filter(Boolean))];

    console.log(`  Caja ${numero_caja} | tipo=${tipoGrupo} | inventario_id=${inventario_id} | ${total} registros`);
    console.log(`    Conservar → ID=${conservar.id} (cantidad=${conservar.cantidad}, estado=${conservar.estado})`);
    eliminar.forEach((c) =>
      console.log(`    Eliminar  → ID=${c.id} (cantidad=${c.cantidad}, estado=${c.estado}, op_id=${c.operacion_id})`)
    );
    console.log(`    Stock a restar: ${cantidadEliminada}`);

    if (!EJECUTAR) {
      console.log();
      continue;
    }

    const transaction = await sequelize.transaction();
    try {
      // Eliminar MovimientoInventario vinculados a las operaciones duplicadas
      if (operacionIdsEliminar.length > 0) {
        const movEliminados = await MovimientoInventario.destroy({
          where: {
            inventario_id,
            operacion_id: { [Op.in]: operacionIdsEliminar },
            motivo: 'Ingreso WMS',
          },
          transaction,
        });
        if (movEliminados > 0) {
          console.log(`    Movimientos eliminados: ${movEliminados}`);
        }
      }

      // Eliminar cajas duplicadas
      await CajaInventario.destroy({
        where: { id: { [Op.in]: idsEliminar } },
        transaction,
      });

      // Ajustar stock del inventario
      const inventario = await Inventario.findByPk(inventario_id, { transaction });
      const stockActual = parseFloat(inventario.cantidad) || 0;
      const nuevoStock = Math.max(0, stockActual - cantidadEliminada);
      await inventario.update({ cantidad: nuevoStock }, { transaction });

      console.log(`    Stock ajustado: ${stockActual} → ${nuevoStock}`);

      await transaction.commit();
      totalEliminadas += eliminar.length;
      console.log('    ✅ OK\n');
    } catch (err) {
      await transaction.rollback();
      console.error(`    ❌ Error: ${err.message}\n`);
    }
  }

  if (EJECUTAR) {
    console.log(`\n✅ Limpieza completada: ${totalEliminadas} caja(s) duplicada(s) eliminada(s).\n`);
  } else {
    console.log(`\nPara aplicar los cambios ejecuta:\n  node server/src/scripts/limpiarCajasDuplicadas.js --ejecutar\n`);
  }
}

limpiarDuplicados()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
