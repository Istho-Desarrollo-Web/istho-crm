const db = require('./src/models');

async function check() {
  try {
    const products = await db.Inventario.findAll({
      where: { sku: '9400605' }
    });
    console.log('--- PRODUCTOS EN INVENTARIO ---');
    products.forEach(p => {
      console.log(`SKU: ${p.sku} | Producto: ${p.producto} | Cliente ID: ${p.cliente_id}`);
    });

    const details = await db.OperacionDetalle.findAll({
      where: { sku: '9400605' },
      order: [['id', 'DESC']],
      limit: 5
    });
    console.log('\n--- ÚLTIMOS DETALLES DE OPERACIÓN ---');
    details.forEach(d => {
      console.log(`ID: ${d.id} | OP_ID: ${d.operacion_id} | Producto: ${d.producto} | Caja: ${d.numero_caja}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

