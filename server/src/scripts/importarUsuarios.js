'use strict';

/**
 * Script de importación de usuarios desde Excel (.xlsx) o CSV.
 *
 * Uso:
 *   node server/src/scripts/importarUsuarios.js <ruta-al-archivo>
 *
 * Columnas esperadas en el archivo (los nombres son flexibles, sin distinguir mayúsculas):
 *   Requeridas : nombre · apellido · username (o "usuario") · password (o "contraseña" / "clave") · rol
 *   Opcionales : email (o "correo") · telefono · cargo · departamento
 *
 * Roles válidos : admin · supervisor · financiera · operador · conductor · cliente
 *
 * El script es idempotente: omite usuarios cuyo username ya exista en la BD.
 * Las contraseñas se hashean con bcrypt (10 rondas).
 * requiere_cambio_password = false en todos los usuarios importados.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const path   = require('path');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

// ─── Argumentos ───────────────────────────────────────────────────────────────
const archivoInput = process.argv[2];
if (!archivoInput) {
  console.error('\n❌  Uso: node server/src/scripts/importarUsuarios.js <ruta-al-archivo>\n');
  process.exit(1);
}

const rutaArchivo = path.resolve(archivoInput);
const ext = path.extname(rutaArchivo).toLowerCase();
if (!['.xlsx', '.csv'].includes(ext)) {
  console.error(`\n❌  Formato no soportado: "${ext}". Usa .xlsx o .csv\n`);
  process.exit(1);
}

// ─── Roles válidos del sistema ────────────────────────────────────────────────
const ROLES_VALIDOS = ['admin', 'supervisor', 'financiera', 'operador', 'conductor', 'cliente'];

// ─── Normalización de encabezados ─────────────────────────────────────────────
// Convierte cualquier variante del encabezado en la clave canónica del modelo.
function normalizarClave(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z0-9]/g, '');      // solo alfanumérico
}

const MAPA_COLUMNAS = {
  nombre:       ['nombre', 'name', 'firstname', 'primernombre'],
  apellido:     ['apellido', 'apellidos', 'lastname', 'surname'],
  username:     ['username', 'usuario', 'user', 'login', 'nombreusuario'],
  password:     ['password', 'contrasena', 'clave', 'pass', 'contraseña'],
  rol:          ['rol', 'role', 'perfil', 'tipo'],
  email:        ['email', 'correo', 'correoelectronico', 'mail'],
  telefono:     ['telefono', 'tel', 'celular', 'movil', 'phone'],
  cargo:        ['cargo', 'puesto', 'position', 'job'],
  departamento: ['departamento', 'area', 'departament', 'department'],
};

function mapearEncabezados(headers) {
  const mapa = {}; // { campoCanónico: índiceColumna }
  headers.forEach((h, i) => {
    const norm = normalizarClave(h);
    for (const [campo, variantes] of Object.entries(MAPA_COLUMNAS)) {
      if (variantes.includes(norm) && !(campo in mapa)) {
        mapa[campo] = i;
      }
    }
  });
  return mapa;
}

// ─── Lectura del archivo ───────────────────────────────────────────────────────
async function leerFilas(ruta) {
  const wb = new ExcelJS.Workbook();

  if (ext === '.xlsx') {
    await wb.xlsx.readFile(ruta);
  } else {
    await wb.csv.readFile(ruta, { parserOptions: { delimiter: ',', skipEmptyLines: true } });
  }

  const hoja = wb.worksheets[0];
  if (!hoja) throw new Error('El archivo no tiene hojas de cálculo.');

  const filas = [];
  hoja.eachRow((row, num) => {
    filas.push({ num, valores: row.values.slice(1) }); // slice(1): ExcelJS es 1-indexed
  });

  if (filas.length < 2) throw new Error('El archivo no tiene datos (mínimo encabezado + 1 fila).');

  const headers = filas[0].valores.map(v => (v == null ? '' : String(v)));
  const mapa = mapearEncabezados(headers);

  // Validar columnas obligatorias
  const faltantes = ['nombre', 'apellido', 'username', 'password', 'rol']
    .filter(c => !(c in mapa));
  if (faltantes.length) {
    throw new Error(
      `Columnas obligatorias no encontradas: ${faltantes.join(', ')}\n` +
      `  Encabezados detectados: ${headers.join(' | ')}`
    );
  }

  const usuarios = [];
  for (const { num, valores } of filas.slice(1)) {
    const get = (campo) => {
      if (!(campo in mapa)) return null;
      let v = valores[mapa[campo]];
      if (v == null) return null;
      // ExcelJS devuelve objetos para celdas con hipervínculo: { text, hyperlink }
      if (typeof v === 'object') {
        v = v.text || (v.hyperlink ? v.hyperlink.replace(/^mailto:/i, '') : '') || '';
      }
      return String(v).trim() || null;
    };

    const fila = {
      _fila: num,
      nombre:       get('nombre'),
      apellido:     get('apellido'),
      username:     get('username'),
      password:     get('password'),
      rol:          get('rol') ? normalizarClave(get('rol')) : null,
      email:        get('email'),
      telefono:     get('telefono'),
      cargo:        get('cargo'),
      departamento: get('departamento'),
    };

    // Omitir filas completamente vacías
    if (!fila.nombre && !fila.username) continue;

    usuarios.push(fila);
  }

  return usuarios;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('   Importador de usuarios — CRM CenthriX');
  console.log('══════════════════════════════════════════════════\n');
  console.log(`📂  Archivo: ${rutaArchivo}`);

  // Inicializar BD
  const { sequelize, Usuario, Rol } = require('../models');

  try {
    await sequelize.authenticate();
    console.log('✅  Conexión a BD establecida\n');
  } catch (err) {
    console.error('❌  No se pudo conectar a la BD:', err.message);
    process.exit(1);
  }

  // Asegurar que email sea nullable en BD (aplica la migración si aún no corrió)
  try {
    const [[col]] = await sequelize.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email'`
    );
    if (col && col.IS_NULLABLE === 'NO') {
      console.log('⚙️  Aplicando migración email → nullable...');
      await sequelize.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(100) NULL');
      console.log('✅  Columna email actualizada\n');
    }
  } catch (err) {
    console.warn('⚠️  No se pudo verificar la columna email:', err.message);
  }

  // Cargar roles disponibles
  const roles = await Rol.findAll({ where: { activo: true } });
  const rolPorCodigo = Object.fromEntries(roles.map(r => [r.codigo, r]));

  const rolesDisponibles = roles.map(r => r.codigo).join(', ');
  console.log(`🔑  Roles disponibles en BD: ${rolesDisponibles}\n`);

  // Leer archivo
  let filas;
  try {
    filas = await leerFilas(rutaArchivo);
  } catch (err) {
    console.error('❌  Error al leer el archivo:', err.message);
    process.exit(1);
  }
  console.log(`📋  Filas encontradas: ${filas.length}\n`);

  // Contadores
  const stats = { creados: 0, omitidos: 0, errores: 0 };
  const errores = [];

  for (const fila of filas) {
    const ref = `Fila ${fila._fila} (${fila.username || fila.nombre})`;

    // ── Validaciones ────────────────────────────────────────────────
    const problemas = [];

    if (!fila.nombre)    problemas.push('falta nombre');
    if (!fila.username)  problemas.push('falta username');
    if (!fila.password)  problemas.push('falta password');
    if (!fila.rol)       problemas.push('falta rol');
    else if (!ROLES_VALIDOS.includes(fila.rol)) {
      problemas.push(`rol inválido "${fila.rol}" (válidos: ${ROLES_VALIDOS.join(', ')})`);
    }

    if (problemas.length) {
      console.warn(`  ⚠️  ${ref}: omitido — ${problemas.join('; ')}`);
      errores.push({ ref, motivo: problemas.join('; ') });
      stats.errores++;
      continue;
    }

    // ── Verificar si ya existe ───────────────────────────────────────
    const existe = await Usuario.findOne({
      where: { username: fila.username },
      paranoid: false,
    });
    if (existe) {
      console.log(`  ⏭️  ${ref}: username ya existe — omitido`);
      stats.omitidos++;
      continue;
    }

    // ── Rol ID ──────────────────────────────────────────────────────
    const rolObj = rolPorCodigo[fila.rol];
    if (!rolObj) {
      const msg = `rol "${fila.rol}" no encontrado en BD (¿seeds ejecutados?)`;
      console.warn(`  ⚠️  ${ref}: omitido — ${msg}`);
      errores.push({ ref, motivo: msg });
      stats.errores++;
      continue;
    }

    // ── Hashear contraseña ───────────────────────────────────────────
    let hash;
    try {
      hash = await bcrypt.hash(fila.password, 10);
    } catch (err) {
      const msg = `error al hashear contraseña: ${err.message}`;
      console.error(`  ❌  ${ref}: ${msg}`);
      errores.push({ ref, motivo: msg });
      stats.errores++;
      continue;
    }

    // ── Crear usuario ────────────────────────────────────────────────
    try {
      await Usuario.create({
        nombre:                  fila.nombre,
        apellido:                fila.apellido || null,
        nombre_completo:         [fila.nombre, fila.apellido].filter(Boolean).join(' '),
        username:                fila.username,
        password_hash:           hash,
        rol:                     fila.rol,
        rol_id:                  rolObj.id,
        email:                   fila.email || null,
        telefono:                fila.telefono || null,
        cargo:                   fila.cargo || null,
        departamento:            fila.departamento || null,
        activo:                  true,
        requiere_cambio_password: false,
      });

      console.log(`  ✅  ${ref}: creado (rol: ${fila.rol}${fila.email ? ', email: ' + fila.email : ''})`);
      stats.creados++;
    } catch (err) {
      const msg = err.message || 'error desconocido';
      console.error(`  ❌  ${ref}: ${msg}`);
      errores.push({ ref, motivo: msg });
      stats.errores++;
    }
  }

  // ── Resumen final ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('   Resumen de importación');
  console.log('══════════════════════════════════════════════════');
  console.log(`  ✅  Creados  : ${stats.creados}`);
  console.log(`  ⏭️  Omitidos : ${stats.omitidos} (ya existían)`);
  console.log(`  ❌  Errores  : ${stats.errores}`);

  if (errores.length) {
    console.log('\n  Detalle de errores:');
    errores.forEach(e => console.log(`    • ${e.ref}: ${e.motivo}`));
  }

  console.log('\n══════════════════════════════════════════════════\n');

  await sequelize.close();
  process.exit(stats.errores > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌  Error inesperado:', err.message);
  process.exit(1);
});
