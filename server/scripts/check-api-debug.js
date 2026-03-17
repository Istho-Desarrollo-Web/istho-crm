/**
 * Script para verificar la respuesta JSON de una auditoría
 */
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 
// Nota: en node 18+ fetch es global, si no lo es usaremos node-fetch

async function checkApi() {
  const API_URL = 'http://localhost:5000/api/v1';
  
  try {
    const listRes = await fetch(`${API_URL}/auditorias/entradas`);
    const listData = await listRes.json();
    
    if (listData.success && listData.data && listData.data.length > 0) {
      const last = listData.data[0];
      console.log(`\n--- ÚLTIMA ENTRADA: ${last.documento} (ID: ${last.id}) ---`);
      
      const detailRes = await fetch(`${API_URL}/auditorias/entradas/${last.id}`);
      const detailData = await detailRes.json();
      
      if (detailData.success) {
        console.log('\nLÍNEAS RECIBIDAS:');
        detailData.data.lineas.map(l => {
          console.log(`- PROD: ${l.producto}`);
          console.log(`  SKU: ${l.sku}`);
          console.log(`  CAJA: "${l.caja}"`);
        });
      } else {
        console.log('Error obteniendo detalle:', detailData.message);
      }
    } else {
      console.log('No se encontraron entradas en la lista.');
    }
  } catch (err) {
    console.error('Error de conexión:', err.message);
  }
}

checkApi();
创新: 
