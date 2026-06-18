'use strict';

/**
 * ISTHO CRM - Importación masiva de contactos desde Excel
 *
 * Crea contactos en el directorio y los vincula a clientes via la tabla
 * pivot contacto_clientes. Sigue el mismo flujo del controlador crear() +
 * asignarCliente(): verifica unicidad de email, crea el contacto y luego
 * la relación M:N con el cliente.
 *
 * FORMATO DEL EXCEL (una fila = un contacto):
 *   Columna            | Descripción                          | Req.
 *   -------------------|--------------------------------------|-----
 *   nombre             | Nombre completo                      | Sí
 *   tipo               | istho / externo (default: externo)   | No
 *   cargo              | Cargo o puesto                       | No
 *   telefono           | Teléfono fijo                        | No
 *   celular            | Teléfono celular                     | No
 *   email              | Correo electrónico (único)           | No
 *   nit                | NIT(s) del/los clientes — separar    | No
 *                      | múltiples con coma (ej: 800123,900X) |
 *   es_principal       | true/false — contacto principal      | No
 *   recibe_notif       | true/false (default: true)           | No
 *   notas              | Observaciones                        | No
 *
 * DEDUPLICACIÓN:
 *   - Si el email ya existe en BD → se omite la fila (no se duplica)
 *   - Si el contacto ya está vinculado al cliente → se omite esa relación
 *
 * USO:
 *   node server/src/scripts/importarContactos.js <ruta.xlsx>
 *   node server/src/scripts/importarContactos.js <ruta.xlsx> --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const path   = require('path');
const ExcelJS = require('exceljs');

const ARCHIVO   = process.argv[2];
const MODO_SECO = process.argv.includes('--dry-run');

if (!ARCHIVO) {
  console.error('USO: node server/src/scripts/importarContactos.js <ruta.xlsx> [--dry-run]');
  process.exit(1);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizarHeader(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parsearBooleano(val, defecto = true) {
  if (val === null || val === undefined || val === '') return defecto;
  const s = String(val).trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'yes', 'verdadero'].includes(s)) return true;
  if (['0', 'false', 'no', 'falso'].includes(s)) return false;
  return defecto;
}

function limpiarTexto(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function limpiarEmail(val) {
  const e = limpiarTexto(val);
  if (!e) return null;
  return e.toLowerCase();
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const { sequelize, Contacto, ContactoCliente, Cliente } = require('../models');

  await sequelize.authenticate();
  console.log('✅ Conectado a la base de datos\n');
  if (MODO_SECO) console.log('⚠️  MODO DRY-RUN — no se escribe nada en BD\n');

  // ── 1. Leer Excel ──────────────────────────────────────────────
  console.log(`📂 Leyendo: ${path.resolve(ARCHIVO)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(ARCHIVO));
  const ws = wb.worksheets[0];

  // Mapear columnas
  const colIdx = {};
  ws.getRow(1).eachCell((cell, colNum) => {
    const h = normalizarHeader(cell.value);
    if      (/^nombre$/.test(h))                       colIdx.nombre              = colNum;
    else if (/^tipo$/.test(h))                         colIdx.tipo                = colNum;
    else if (/^cargo$/.test(h))                        colIdx.cargo               = colNum;
    else if (/^telefono$/.test(h))                     colIdx.telefono            = colNum;
    else if (/^celular$/.test(h))                      colIdx.celular             = colNum;
    else if (/^email$/.test(h))                        colIdx.email               = colNum;
    else if (/^nit$/.test(h))                          colIdx.nit                 = colNum;
    else if (/^es_principal$/.test(h))                 colIdx.es_principal        = colNum;
    else if (/recibe/.test(h))                         colIdx.recibe_notif        = colNum;
    else if (/^nota/.test(h))                          colIdx.notas               = colNum;
  });

  if (!colIdx.nombre) {
    console.error('❌ Columna "nombre" no encontrada en el Excel. Es requerida.');
    process.exit(1);
  }
  console.log('📋 Columnas mapeadas:', Object.keys(colIdx).join(', '), '\n');

  // ── 2. Parsear filas ───────────────────────────────────────────
  const filas = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const nombre = limpiarTexto(row.getCell(colIdx.nombre)?.value);
    if (!nombre) return;

    const tipoRaw = limpiarTexto(colIdx.tipo ? row.getCell(colIdx.tipo)?.value : null);
    const tipo = (tipoRaw === 'istho') ? 'istho' : 'externo';

    filas.push({
      nombre,
      tipo,
      cargo:               limpiarTexto(colIdx.cargo      ? row.getCell(colIdx.cargo)?.value      : null),
      telefono:            limpiarTexto(colIdx.telefono   ? row.getCell(colIdx.telefono)?.value   : null),
      celular:             limpiarTexto(colIdx.celular    ? row.getCell(colIdx.celular)?.value     : null),
      email:               limpiarEmail(colIdx.email      ? row.getCell(colIdx.email)?.value       : null),
      nits: (() => {
        const raw = limpiarTexto(colIdx.nit ? row.getCell(colIdx.nit)?.value : null);
        return raw ? raw.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
      })(),
      es_principal:        parsearBooleano(colIdx.es_principal ? row.getCell(colIdx.es_principal)?.value : null, false),
      recibe_notificaciones: parsearBooleano(colIdx.recibe_notif ? row.getCell(colIdx.recibe_notif)?.value : null, true),
      notas:               limpiarTexto(colIdx.notas      ? row.getCell(colIdx.notas)?.value       : null),
      _fila: rowNum,
    });
  });
  console.log(`📊 Filas válidas leídas: ${filas.length}`);

  // ── 3. Resolver clientes por NIT ──────────────────────────────
  const nitsUnicos = [...new Set(filas.flatMap(f => f.nits).filter(Boolean))];
  let clientePorNit = {};

  if (nitsUnicos.length) {
    const clientes = await Cliente.findAll({
      where: { nit: nitsUnicos },
      attributes: ['id', 'nit', 'razon_social'],
    });
    clientePorNit = Object.fromEntries(clientes.map(c => [c.nit, c]));

    const nitsNoEncontrados = nitsUnicos.filter(n => !clientePorNit[n]);
    if (nitsNoEncontrados.length) {
      console.warn(`⚠️  NITs sin cliente en CRM (relación no se creará): ${nitsNoEncontrados.join(', ')}`);
    }
    console.log(`✅ Clientes resueltos: ${clientes.length}/${nitsUnicos.length}`);
  }

  // ── 4. Verificar emails ya existentes en BD ───────────────────
  const emailsEnExcel = [...new Set(filas.map(f => f.email).filter(Boolean))];
  let emailsExistentesSet = new Set();

  if (emailsEnExcel.length) {
    const { Op } = require('sequelize');
    const existentes = await Contacto.findAll({
      where: { email: emailsEnExcel },
      attributes: ['email'],
    });
    emailsExistentesSet = new Set(existentes.map(c => c.email));
    if (emailsExistentesSet.size) {
      console.warn(`⚠️  Emails ya registrados en BD (filas omitidas): ${[...emailsExistentesSet].join(', ')}`);
    }
  }

  // Separar filas a crear vs omitidas por email duplicado
  const filasACrear = filas.filter(f => !f.email || !emailsExistentesSet.has(f.email));
  const filasOmitidas = filas.length - filasACrear.length;

  console.log(`\n📋 Contactos a crear: ${filasACrear.length}`);
  if (filasOmitidas) console.log(`   → ${filasOmitidas} omitidos (email ya existe)`);

  if (MODO_SECO) {
    const conCliente = filasACrear.reduce((acc, f) => acc + f.nits.filter(n => clientePorNit[n]).length, 0);
    console.log(`\n[DRY-RUN] Se crearían:`);
    console.log(`  ${filasACrear.length} contactos`);
    console.log(`  ${conCliente} vínculos con cliente`);
    await sequelize.close();
    return;
  }

  // ── 5. Crear contactos uno a uno ──────────────────────────────
  const contadores = { creados: 0, vinculados: 0, omitidos: filasOmitidas, errores: [] };

  for (let i = 0; i < filasACrear.length; i++) {
    const fila = filasACrear[i];

    process.stdout.write(
      `\r  Procesando ${i + 1}/${filasACrear.length}: ${fila.nombre.substring(0, 30).padEnd(30)} ` +
      `[creados:${contadores.creados} vínculos:${contadores.vinculados}]  `
    );

    const transaction = await sequelize.transaction();
    try {
      // Crear contacto
      const contacto = await Contacto.create({
        tipo:                  fila.tipo,
        nombre:                fila.nombre,
        cargo:                 fila.cargo,
        telefono:              fila.telefono,
        celular:               fila.celular,
        email:                 fila.email,
        recibe_notificaciones: fila.recibe_notificaciones,
        tipos_notificacion:    ['todas'],
        notas:                 fila.notas,
        activo:                true,
      }, { transaction });

      // Vincular a cada cliente por NIT (soporta múltiples NITs por fila)
      for (const nit of fila.nits) {
        const cliente = clientePorNit[nit];
        if (!cliente) continue;

        if (fila.es_principal) {
          await ContactoCliente.update(
            { es_principal: false },
            { where: { cliente_id: cliente.id }, transaction }
          );
        }

        await ContactoCliente.create({
          contacto_id:  contacto.id,
          cliente_id:   cliente.id,
          es_principal: fila.es_principal,
        }, { transaction });

        contadores.vinculados++;
      }

      await transaction.commit();
      contadores.creados++;

    } catch (err) {
      await transaction.rollback();
      contadores.errores.push({ fila: fila._fila, nombre: fila.nombre, error: err.message });
    }
  }

  console.log(); // salto de línea tras el \r

  // ── Resumen ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(54));
  console.log('✅ IMPORTACIÓN COMPLETADA');
  console.log('═'.repeat(54));
  console.log(`  Contactos creados    : ${contadores.creados}`);
  console.log(`  Vínculos a cliente   : ${contadores.vinculados}`);
  console.log(`  Omitidos (email dup.): ${contadores.omitidos}`);
  if (contadores.errores.length) {
    console.log(`  ⚠️  Errores          : ${contadores.errores.length}`);
    contadores.errores.forEach(e =>
      console.warn(`     - Fila ${e.fila} (${e.nombre}): ${e.error}`)
    );
  }
  console.log('═'.repeat(54));

  await sequelize.close();
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
