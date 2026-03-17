/**
 * ============================================================================
 * ISTHO CRM - Test de Servicio de Email
 * ============================================================================
 * 
 * Ejecutar: node test-email.js
 * 
 * CONFIGURACIÓN REQUERIDA EN .env:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=tu-email@gmail.com
 * SMTP_PASS=xxxx xxxx xxxx xxxx   (Contraseña de aplicación de Google)
 * 
 * CÓMO OBTENER CONTRASEÑA DE APLICACIÓN:
 * 1. Ve a https://myaccount.google.com/security
 * 2. Activa "Verificación en 2 pasos" si no está activada
 * 3. Ve a https://myaccount.google.com/apppasswords
 * 4. Genera una nueva contraseña para "Correo" - "Windows"
 * 5. Copia los 16 caracteres y ponlos en SMTP_PASS
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 */

require('dotenv').config();

const nodemailer = require('nodemailer');

// ════════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO DE CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log('📧 ISTHO CRM - Test de Servicio de Email');
console.log('═'.repeat(60) + '\n');

console.log('📋 CONFIGURACIÓN DETECTADA:');
console.log('─'.repeat(40));
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ NO CONFIGURADO'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ NO CONFIGURADO'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ NO CONFIGURADO'}`);
console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Configurado (' + process.env.SMTP_PASS.replace(/\s/g, '').length + ' caracteres)' : '❌ NO CONFIGURADO'}`);
console.log(`   SMTP_FROM: ${process.env.SMTP_FROM || '(usará SMTP_USER)'}`);
console.log('');

// Verificar configuración
const errores = [];

if (!process.env.SMTP_HOST) errores.push('SMTP_HOST no está configurado');
if (!process.env.SMTP_PORT) errores.push('SMTP_PORT no está configurado');
if (!process.env.SMTP_USER) errores.push('SMTP_USER no está configurado');
if (!process.env.SMTP_PASS) errores.push('SMTP_PASS no está configurado');

if (process.env.SMTP_PASS) {
  const passLength = process.env.SMTP_PASS.replace(/\s/g, '').length;
  if (passLength !== 16) {
    console.log(`⚠️  ADVERTENCIA: La contraseña tiene ${passLength} caracteres.`);
    console.log('   Las contraseñas de aplicación de Google tienen exactamente 16 caracteres.');
    console.log('   Si estás usando tu contraseña normal de Gmail, NO funcionará.\n');
  }
}

if (errores.length > 0) {
  console.log('❌ ERRORES DE CONFIGURACIÓN:');
  errores.forEach(e => console.log(`   • ${e}`));
  console.log('\n📖 Configura las variables en tu archivo .env y vuelve a ejecutar.\n');
  process.exit(1);
}

// ════════════════════════════════════════════════════════════════════════════
// TEST DE CONEXIÓN Y ENVÍO
// ════════════════════════════════════════════════════════════════════════════

async function testEmail() {
  console.log('🔄 Iniciando pruebas...\n');
  
  // Crear transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s/g, '') // Eliminar espacios
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Verificar conexión
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📡 TEST 1: Verificando conexión SMTP...');
  
  try {
    await transporter.verify();
    console.log('   ✅ Conexión SMTP verificada exitosamente\n');
  } catch (error) {
    console.log('   ❌ Error de conexión:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n   💡 SOLUCIÓN: La contraseña es incorrecta.');
      console.log('   Asegúrate de usar una CONTRASEÑA DE APLICACIÓN de Google:');
      console.log('   1. Ve a https://myaccount.google.com/apppasswords');
      console.log('   2. Genera una nueva contraseña');
      console.log('   3. Copia los 16 caracteres a SMTP_PASS\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n   💡 SOLUCIÓN: No se puede conectar al servidor SMTP.');
      console.log('   Verifica que SMTP_HOST y SMTP_PORT sean correctos.\n');
    }
    
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Enviar correo de prueba
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📤 TEST 2: Enviando correo de prueba...');
  
  const destinatario = process.env.SMTP_USER; // Enviar a sí mismo
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"ISTHO CRM Test" <${process.env.SMTP_USER}>`,
      to: destinatario,
      subject: '✅ Test Exitoso - ISTHO CRM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; }
            .header { background: #E65100; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px; }
            .success { background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 15px 0; }
            .info { background: #fff7ed; border-left: 4px solid #E65100; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 ISTHO CRM</h1>
              <p>Test de Correo Electrónico</p>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ ¡Éxito!</strong><br>
                El servicio de correo está funcionando correctamente.
              </div>
              
              <div class="info">
                <strong>📋 Información del Test:</strong><br>
                <p>Fecha: ${new Date().toLocaleString('es-CO')}</p>
                <p>Servidor: ${process.env.SMTP_HOST}</p>
                <p>Puerto: ${process.env.SMTP_PORT}</p>
                <p>Usuario: ${process.env.SMTP_USER}</p>
              </div>
              
              <p style="color: #666; font-size: 12px; text-align: center;">
                Este es un correo de prueba automático del sistema ISTHO CRM.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('   ✅ Correo enviado exitosamente!');
    console.log(`   📧 Message ID: ${info.messageId}`);
    console.log(`   📬 Destinatario: ${destinatario}\n`);
    
  } catch (error) {
    console.log('   ❌ Error al enviar:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('\n   💡 SOLUCIÓN: Error de autenticación.');
      console.log('   Usa una CONTRASEÑA DE APLICACIÓN de Google, no tu contraseña normal.\n');
    }
    
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESUMEN
  // ─────────────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
  console.log('═'.repeat(60));
  console.log('\n✅ El servicio de email está configurado correctamente.');
  console.log(`📬 Revisa tu bandeja de entrada en: ${destinatario}\n`);
}

// Ejecutar
testEmail().catch(console.error);