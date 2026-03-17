/**
 * ISTHO CRM - Script de Consolidación de Inventario
 *
 * Migra de modelo antiguo (1 fila por cliente+sku+lote) al nuevo modelo
 * (1 fila por cliente+sku como referencia, cajas en tabla separada).
 *
 * Pasos:
 * 1. Identificar grupos de Inventario con mismo (cliente_id, sku) pero diferente lote
 * 2. Para cada grupo, conservar la fila con mayor cantidad como referencia
 * 3. Mover MovimientoInventario y OperacionDetalle al ID conservado
 * 4. Crear CajaInventario a partir de OperacionDetalle existentes
 * 5. Sumar cantidades en la fila conservada
 * 6. Eliminar filas duplicadas
 * 7. Alterar índice único de (cliente_id, sku, lote) a (cliente_id, sku)
 *
 * USO: node server/src/scripts/consolidarInventario.js
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { sequelize, Inventario, MovimientoInventario, OperacionDetalle, CajaInventario, Operacion } = require('../models');
const { Op, QueryTypes } = require('sequelize');

const consolidar = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  CONSOLIDACIÓN DE INVENTARIO - ISTHO CRM');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Paso 0: Sincronizar modelo CajaInventario (crear tabla si no existe)
    console.log('[0] Sincronizando modelo CajaInventario...');
    await CajaInventario.sync({ alter: true });
    console.log('    ✅ Tabla caja_inventario lista\n');

    // Paso 1: Encontrar grupos duplicados
    console.log('[1] Buscando duplicados (mismo cliente_id + sku, diferente lote)...');
    const duplicados = await sequelize.query(`
      SELECT cliente_id, sku, COUNT(*) as total, GROUP_CONCAT(id ORDER BY cantidad DESC) as ids
      FROM inventario
      GROUP BY cliente_id, sku
      HAVING COUNT(*) > 1
    `, { type: QueryTypes.SELECT });

    console.log(`    Encontrados: ${duplicados.length} grupos con duplicados\n`);

    if (duplicados.length === 0) {
      console.log('    No hay duplicados que consolidar.\n');
    }

    let totalConsolidados = 0;
    let totalEliminados = 0;
    let totalCajasCreadas = 0;

    for (const grupo of duplicados) {
      const ids = grupo.ids.split(',').map(Number);
      const keepId = ids[0]; // El que tiene mayor cantidad
      const removeIds = ids.slice(1);

      console.log(`  [${grupo.sku}] cliente=${grupo.cliente_id}: conservar ID ${keepId}, eliminar IDs [${removeIds.join(', ')}]`);

      const transaction = await sequelize.transaction();

      try {
        // Sumar cantidades de todas las filas
        const filas = await Inventario.findAll({
          where: { id: { [Op.in]: ids } },
          transaction
        });

        const cantidadTotal = filas.reduce((sum, f) => sum + (parseFloat(f.cantidad) || 0), 0);

        // Actualizar la fila conservada con la cantidad total
        await Inventario.update(
          { cantidad: cantidadTotal },
          { where: { id: keepId }, transaction }
        );

        // Mover MovimientoInventario al ID conservado
        const movsActualizados = await MovimientoInventario.update(
          { inventario_id: keepId },
          { where: { inventario_id: { [Op.in]: removeIds } }, transaction }
        );

        // Mover OperacionDetalle.inventario_id al ID conservado
        const detsActualizados = await OperacionDetalle.update(
          { inventario_id: keepId },
          { where: { inventario_id: { [Op.in]: removeIds } }, transaction }
        );

        // Eliminar filas duplicadas
        await Inventario.destroy({
          where: { id: { [Op.in]: removeIds } },
          transaction
        });

        await transaction.commit();

        totalConsolidados++;
        totalEliminados += removeIds.length;
        console.log(`    ✅ Consolidado (cantidad total: ${cantidadTotal}, movs: ${movsActualizados[0]}, dets: ${detsActualizados[0]})`);

      } catch (err) {
        await transaction.rollback();
        console.error(`    ❌ Error consolidando ${grupo.sku}: ${err.message}`);
      }
    }

    // Paso 2: Crear CajaInventario a partir de OperacionDetalle existentes (si no hay cajas aún)
    console.log('\n[2] Creando cajas a partir de OperacionDetalle existentes...');

    const cajasExistentes = await CajaInventario.count();
    if (cajasExistentes > 0) {
      console.log(`    Ya existen ${cajasExistentes} cajas. Saltando.\n`);
    } else {
      const detallesConOp = await OperacionDetalle.findAll({
        where: { inventario_id: { [Op.ne]: null } },
        include: [{
          model: Operacion,
          as: 'operacion',
          attributes: ['id', 'tipo', 'numero_operacion']
        }]
      });

      for (const det of detallesConOp) {
        try {
          await CajaInventario.create({
            inventario_id: det.inventario_id,
            operacion_id: det.operacion_id,
            operacion_detalle_id: det.id,
            numero_caja: det.numero_caja || null,
            lote: det.lote || null,
            lote_externo: det.lote_externo || null,
            cantidad: parseFloat(det.cantidad) || 0,
            peso: det.peso ? parseFloat(det.peso) : null,
            unidad_medida: det.unidad_medida || 'UND',
            tipo: det.operacion?.tipo === 'ingreso' ? 'entrada' : 'salida',
            estado: det.operacion?.tipo === 'ingreso' ? 'disponible' : 'despachada',
            documento_asociado: det.documento_asociado || null,
            fecha_vencimiento: det.fecha_vencimiento || null,
            fecha_movimiento: det.created_at,
          });
          totalCajasCreadas++;
        } catch (err) {
          // Ignorar errores individuales
        }
      }
      console.log(`    ✅ ${totalCajasCreadas} cajas creadas\n`);
    }

    // Paso 3: Intentar cambiar el índice único
    console.log('[3] Actualizando índice único de inventario...');
    try {
      // Intentar eliminar el índice antiguo
      await sequelize.query('ALTER TABLE inventario DROP INDEX idx_cliente_sku_lote').catch(() => {});
      // Crear el nuevo índice
      await sequelize.query('ALTER TABLE inventario ADD UNIQUE INDEX idx_cliente_sku (cliente_id, sku)').catch((e) => {
        if (e.message.includes('Duplicate')) {
          console.log('    ⚠️  Aún hay duplicados. Ejecuta el script de nuevo.');
        } else {
          console.log(`    ℹ️  Índice: ${e.message}`);
        }
      });
      console.log('    ✅ Índice actualizado\n');
    } catch (err) {
      console.log(`    ℹ️  ${err.message}\n`);
    }

    // Resumen
    console.log('═══════════════════════════════════════════════════');
    console.log('  RESUMEN');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Grupos consolidados: ${totalConsolidados}`);
    console.log(`  Filas eliminadas:    ${totalEliminados}`);
    console.log(`  Cajas creadas:       ${totalCajasCreadas}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

consolidar();
