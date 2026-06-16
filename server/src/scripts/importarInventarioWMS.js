'use strict';

/**
 * ISTHO CRM - Importación inicial de inventario desde Excel WMS
 *
 * Crea operaciones de entrada reales en el CRM a partir del Excel exportado
 * del WMS, replicando el mismo flujo que wmsSyncService.syncEntrada:
 *   Operacion → OperacionDetalle → Inventario (findOrCreate + suma) → CajaInventario → MovimientoInventario
 *
 * AGRUPACIÓN:
 *   - Cada "Nº Orden" único por NIT = una operacion de entrada
 *   - Filas sin Nº Orden = una operacion por (NIT, F Ingreso) con doc "IMP-WMS-{NIT}-{fecha}"
 *   - Dentro de cada operacion: una línea (OperacionDetalle) por caja/fila del Excel
 *
 * SEGURIDAD:
 *   - Si documento_wms ya existe en `operaciones` → omite esa operacion completa
 *   - Si numero_caja ya existe en `cajas_inventario` → omite esa caja
 *   - Cada operacion va en su propia transaction (rollback individual si falla)
 *
 * USO:
 *   node server/src/scripts/importarInventarioWMS.js <ruta.xlsx>
 *   node server/src/scripts/importarInventarioWMS.js <ruta.xlsx> --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const path   = require('path');
const ExcelJS = require('exceljs');

const ARCHIVO  = process.argv[2];
const MODO_SECO = process.argv.includes('--dry-run');

if (!ARCHIVO) {
  console.error('USO: node server/src/scripts/importarInventarioWMS.js <ruta.xlsx> [--dry-run]');
  process.exit(1);
}

// ─────────────────────────────────────────────
// Helpers de parseo
// ─────────────────────────────────────────────

function parsearFecha(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str || str === 'null') return null;
  const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2,'0')}-${ddmm[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function parsearNumero(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function normalizarHeader(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─────────────────────────────────────────────
// Generador de número de operación (réplica del servicio)
// ─────────────────────────────────────────────

async function generarNumeroOperacion(Operacion, Op) {
  const year   = new Date().getFullYear();
  const prefix = `OP-${year}-`;
  const ultima = await Operacion.findOne({
    where: { numero_operacion: { [Op.like]: `${prefix}%` } },
    order: [['numero_operacion', 'DESC']],
    attributes: ['numero_operacion'],
    paranoid: false,
  });
  let siguiente = 1;
  if (ultima) {
    const num = parseInt(ultima.numero_operacion.replace(prefix, ''), 10);
    if (!isNaN(num)) siguiente = num + 1;
  }
  return `${prefix}${String(siguiente).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const {
    sequelize,
    Cliente,
    Inventario,
    Operacion,
    OperacionDetalle,
    CajaInventario,
    MovimientoInventario,
  } = require('../models');
  const { Op } = require('sequelize');

  await sequelize.authenticate();
  console.log('✅ Conectado a la base de datos\n');
  if (MODO_SECO) console.log('⚠️  MODO DRY-RUN — no se escribe nada en BD\n');

  // ── 1. Leer Excel ──────────────────────────────────────────────
  console.log(`📂 Leyendo: ${path.resolve(ARCHIVO)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(ARCHIVO));
  const ws = wb.worksheets[0];

  const colIdx = {};
  ws.getRow(1).eachCell((cell, colNum) => {
    const h = normalizarHeader(cell.value);
    if      (/^nit$/.test(h))       colIdx.nit          = colNum;
    else if (/razon/.test(h))        colIdx.razon_social  = colNum;
    else if (/^sku$/.test(h))        colIdx.sku           = colNum;
    else if (/desc/.test(h))         colIdx.descripcion   = colNum;
    else if (/^lote$/.test(h))       colIdx.lote          = colNum;
    else if (/^caja$/.test(h))       colIdx.caja          = colNum;
    else if (/saldo/.test(h))        colIdx.saldo         = colNum;
    else if (/orden/.test(h))        colIdx.nro_orden     = colNum;
    else if (/ubic/.test(h))         colIdx.ubicacion     = colNum;
    else if (/bodega/.test(h))       colIdx.bodega        = colNum;
    else if (/ingreso/.test(h))      colIdx.f_ingreso     = colNum;
    else if (/venc/.test(h))         colIdx.f_vencimiento = colNum;
  });

  const requeridos = ['nit', 'sku', 'descripcion', 'saldo'];
  const faltantes  = requeridos.filter(c => !colIdx[c]);
  if (faltantes.length) {
    console.error('❌ Columnas requeridas no encontradas:', faltantes.join(', '));
    process.exit(1);
  }
  console.log('📋 Columnas mapeadas:', Object.keys(colIdx).join(', '), '\n');

  // ── 2. Parsear todas las filas ────────────────────────────────
  const filas = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const nit = String(row.getCell(colIdx.nit)?.value ?? '').trim();
    const sku = String(row.getCell(colIdx.sku)?.value ?? '').trim();
    if (!nit || !sku) return;

    const f_ingreso = colIdx.f_ingreso ? parsearFecha(row.getCell(colIdx.f_ingreso)?.value) : null;
    const nro_orden = colIdx.nro_orden ? String(row.getCell(colIdx.nro_orden)?.value ?? '').trim() || null : null;

    filas.push({
      nit,
      sku,
      descripcion:   String(row.getCell(colIdx.descripcion)?.value ?? '').trim() || sku,
      lote:          colIdx.lote      ? String(row.getCell(colIdx.lote)?.value      ?? '').trim() || null : null,
      numero_caja:   colIdx.caja      ? String(row.getCell(colIdx.caja)?.value      ?? '').trim() || null : null,
      saldo:         parsearNumero(row.getCell(colIdx.saldo)?.value),
      nro_orden,
      ubicacion:     colIdx.ubicacion ? String(row.getCell(colIdx.ubicacion)?.value ?? '').trim() || null : null,
      bodega:        colIdx.bodega    ? String(row.getCell(colIdx.bodega)?.value    ?? '').trim() || null : null,
      f_ingreso,
      f_vencimiento: colIdx.f_vencimiento ? parsearFecha(row.getCell(colIdx.f_vencimiento)?.value) : null,
      // Clave de agrupación: si no hay Nº Orden, agrupar por (NIT, fecha)
      _grupKey: nro_orden
        ? `${nit}::${nro_orden}`
        : `${nit}::SIN-ORDEN::${f_ingreso || 'sin-fecha'}`,
      // Documento para la operacion
      _docWms: nro_orden
        ? nro_orden
        : `IMP-WMS-${nit}-${f_ingreso || 'S-F'}`,
    });
  });
  console.log(`📊 Filas leídas: ${filas.length}`);

  // ── 3. Resolver clientes ───────────────────────────────────────
  const nitsUnicos = [...new Set(filas.map(f => f.nit))];
  const clientes   = await Cliente.findAll({
    where: { nit: nitsUnicos },
    attributes: ['id', 'nit', 'razon_social'],
  });
  const clientePorNit = Object.fromEntries(clientes.map(c => [c.nit, c]));

  const nitsNoEncontrados = nitsUnicos.filter(n => !clientePorNit[n]);
  if (nitsNoEncontrados.length) {
    console.warn(`⚠️  NITs sin cliente en CRM (filas omitidas): ${nitsNoEncontrados.join(', ')}`);
  }
  console.log(`✅ Clientes resueltos: ${clientes.length}/${nitsUnicos.length}\n`);

  const filasValidas = filas.filter(f => clientePorNit[f.nit]);

  // ── 4. Agrupar en operaciones ──────────────────────────────────
  const grupos = new Map(); // _grupKey → { docWms, nit, f_ingreso, filas[] }
  for (const f of filasValidas) {
    if (!grupos.has(f._grupKey)) {
      grupos.set(f._grupKey, {
        docWms:    f._docWms,
        nit:       f.nit,
        f_ingreso: f.f_ingreso,
        filas:     [],
      });
    }
    grupos.get(f._grupKey).filas.push(f);
  }
  console.log(`📋 Operaciones a crear (grupos): ${grupos.size}`);

  // ── 5. Verificar cuáles ya existen en BD ─────────────────────
  const docsWms = [...grupos.values()].map(g => g.docWms);
  const opExistentes = await Operacion.findAll({
    where: { documento_wms: docsWms },
    attributes: ['documento_wms', 'numero_operacion'],
  });
  const docExistenteSet = new Set(opExistentes.map(o => o.documento_wms));

  const gruposNuevos   = [...grupos.values()].filter(g => !docExistenteSet.has(g.docWms));
  const gruposOmitidos = grupos.size - gruposNuevos.length;
  console.log(`  → ${gruposOmitidos} operaciones ya existen en CRM (omitidas)`);
  console.log(`  → ${gruposNuevos.length} nuevas a crear\n`);

  if (MODO_SECO) {
    const totalCajas = gruposNuevos.reduce((s, g) => s + g.filas.length, 0);
    console.log(`[DRY-RUN] Se crearían:`);
    console.log(`  ${gruposNuevos.length} operaciones de entrada`);
    console.log(`  ${totalCajas} líneas de detalle / cajas`);
    await sequelize.close();
    return;
  }

  // ── 6. Crear operaciones una a una (cada una en su transaction) ─
  const contadores = { operaciones: 0, detalles: 0, cajas: 0, errores: [] };

  for (let gi = 0; gi < gruposNuevos.length; gi++) {
    const grupo = gruposNuevos[gi];
    const cliente = clientePorNit[grupo.nit];

    process.stdout.write(
      `\r  Procesando ${gi + 1}/${gruposNuevos.length}: ${grupo.docWms.substring(0, 30).padEnd(30)} ` +
      `[ops:${contadores.operaciones} cajas:${contadores.cajas}]  `
    );

    const transaction = await sequelize.transaction();
    try {
      // Número de operación (dentro de transaction para evitar colisiones)
      const numeroOperacion = await generarNumeroOperacion(Operacion, Op);

      const totalUnidades  = grupo.filas.reduce((s, f) => s + f.saldo, 0);

      // Crear operacion
      const operacion = await Operacion.create({
        numero_operacion:   numeroOperacion,
        tipo:               'ingreso',
        documento_wms:      grupo.docWms,
        cliente_id:         cliente.id,
        fecha_documento:    grupo.f_ingreso || new Date().toISOString().slice(0, 10),
        fecha_operacion:    new Date(),
        fecha_cierre:       new Date(),
        tipo_documento_wms: 'CO',
        total_referencias:  new Set(grupo.filas.map(f => f.sku)).size,
        total_unidades:     totalUnidades,
        estado:             'cerrado',
        notas:              'Importación inicial desde Excel WMS',
      }, { transaction });

      // Crear detalle + inventario + caja por cada fila del grupo
      for (const fila of grupo.filas) {
        // Verificar si el numero_caja ya existe (para no duplicar cajas)
        if (fila.numero_caja) {
          const cajaExistente = await CajaInventario.findOne({
            where: { numero_caja: fila.numero_caja },
            transaction,
          });
          if (cajaExistente) continue;
        }

        // Crear detalle de operacion
        const detalle = await OperacionDetalle.create({
          operacion_id:      operacion.id,
          sku:               fila.sku,
          producto:          fila.descripcion,
          cantidad:          fila.saldo,
          unidad_medida:     'UND',
          lote:              fila.lote || null,
          fecha_vencimiento: fila.f_vencimiento || null,
          numero_caja:       fila.numero_caja || null,
          documento_asociado:fila.nro_orden || null,
        }, { transaction });

        // FindOrCreate inventario (sin modificar si ya existe)
        const [inventario, creado] = await Inventario.findOrCreate({
          where:    { cliente_id: cliente.id, sku: fila.sku },
          defaults: {
            producto:                  fila.descripcion,
            cantidad:                  0,
            unidad_medida:             'UND',
            estado:                    'disponible',
            ultima_sincronizacion_wms: new Date(),
            fecha_ingreso:             fila.f_ingreso || null,
            notas:                     'Importación inicial WMS',
          },
          transaction,
        });

        // Vincular detalle al inventario
        await detalle.update({ inventario_id: inventario.id }, { transaction });

        // Sumar cantidad al stock (tanto si es nuevo como si ya existía)
        const stockAnterior = parseFloat(inventario.cantidad) || 0;
        await inventario.update({
          cantidad:                  stockAnterior + fila.saldo,
          ultima_sincronizacion_wms: new Date(),
          alertas_silenciadas:       null,
          ...(creado ? {} : {}), // no sobrescribir nombre si ya existía
        }, { transaction });

        // Ubicacion combinada
        let ubicacionFinal = null;
        if (fila.bodega && fila.ubicacion)  ubicacionFinal = `${fila.bodega} - ${fila.ubicacion}`;
        else if (fila.ubicacion)            ubicacionFinal = fila.ubicacion;
        else if (fila.bodega)               ubicacionFinal = fila.bodega;

        // Crear caja
        const nuevaCaja = await CajaInventario.create({
          inventario_id:      inventario.id,
          operacion_id:       operacion.id,
          operacion_detalle_id: detalle.id,
          numero_caja:        fila.numero_caja || null,
          lote:               fila.lote || null,
          cantidad:           fila.saldo,
          tipo:               'entrada',
          estado:             fila.saldo === 0 ? 'inactiva' : 'disponible',
          ubicacion:          ubicacionFinal,
          fecha_vencimiento:  fila.f_vencimiento || null,
          fecha_movimiento:   fila.f_ingreso
                                ? new Date(fila.f_ingreso + 'T00:00:00')
                                : new Date(),
          documento_asociado: fila.nro_orden || null,
          observaciones:      'Importación inicial WMS',
        }, { transaction });

        // Si no venía número de caja, asignar uno autoincremental
        if (!fila.numero_caja) {
          await nuevaCaja.update(
            { numero_caja: `CJ-${String(nuevaCaja.id).padStart(6, '0')}` },
            { transaction }
          );
        }

        // Movimiento de inventario
        await MovimientoInventario.create({
          inventario_id:       inventario.id,
          operacion_id:        operacion.id,
          tipo:                'entrada',
          motivo:              'Ingreso WMS',
          cantidad:            fila.saldo,
          stock_anterior:      stockAnterior,
          stock_resultante:    stockAnterior + fila.saldo,
          documento_referencia:grupo.docWms,
          observaciones:       'Importación inicial Excel WMS',
          fecha_movimiento:    new Date(),
        }, { transaction });

        contadores.detalles++;
        contadores.cajas++;
      }

      await transaction.commit();
      contadores.operaciones++;

    } catch (err) {
      await transaction.rollback();
      contadores.errores.push({ doc: grupo.docWms, error: err.message });
    }
  }
  console.log(); // salto de línea tras el \r


  // ── Resumen ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(54));
  console.log('✅ IMPORTACIÓN COMPLETADA');
  console.log('═'.repeat(54));
  console.log(`  Operaciones creadas  : ${contadores.operaciones}`);
  console.log(`  Operaciones omitidas : ${gruposOmitidos} (ya existían)`);
  console.log(`  Líneas de detalle    : ${contadores.detalles}`);
  console.log(`  Cajas insertadas     : ${contadores.cajas}`);
  if (contadores.errores.length) {
    console.log(`  ⚠️  Errores          : ${contadores.errores.length}`);
    contadores.errores.forEach(e => console.warn(`     - ${e.doc}: ${e.error}`));
  }
  if (nitsNoEncontrados.length) {
    console.log(`  NITs no encontrados  : ${nitsNoEncontrados.join(', ')}`);
  }
  console.log('═'.repeat(54));

  await sequelize.close();
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
