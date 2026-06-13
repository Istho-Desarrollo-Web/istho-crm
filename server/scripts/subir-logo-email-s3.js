/**
 * Script: sube logo de email a S3 como objeto público.
 * Ejecutar desde la raíz del repo: node server/scripts/subir-logo-email-s3.js
 *
 * Requisitos: AWS_S3_BUCKET y AWS_REGION en server/.env (o variables de entorno).
 * Credenciales: usa AWS CLI (aws configure) o variables AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, PutBucketPolicyCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');

const LOGO_LOCAL = path.join(__dirname, '../../frontend/src/assets/logo-istho.png');
const S3_KEY = 'branding/logo-email.png';
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-west-2';

if (!BUCKET) {
  console.error('❌  AWS_S3_BUCKET no está configurado');
  process.exit(1);
}

if (!fs.existsSync(LOGO_LOCAL)) {
  console.error('❌  No se encontró el archivo:', LOGO_LOCAL);
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

const habilitarAccesoPublico = async () => {
  let policyStr = '{"Version":"2012-10-17","Statement":[]}';
  try {
    const existing = await s3.send(new GetBucketPolicyCommand({ Bucket: BUCKET }));
    policyStr = existing.Policy;
  } catch (_) { /* sin política existente */ }

  const policy = JSON.parse(policyStr);
  const sidPublico = 'PublicReadBranding';
  const yaExiste = policy.Statement.some((s) => s.Sid === sidPublico);

  if (!yaExiste) {
    policy.Statement.push({
      Sid: sidPublico,
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${BUCKET}/branding/*`,
    });
    await s3.send(
      new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: JSON.stringify(policy) })
    );
    console.log('✅  Política de acceso público para branding/* agregada al bucket');
  } else {
    console.log('ℹ️   Política de acceso público ya existía');
  }
};

(async () => {
  try {
    const buffer = fs.readFileSync(LOGO_LOCAL);
    console.log(`📁  Leyendo logo local: ${LOGO_LOCAL} (${buffer.length} bytes)`);

    console.log('⬆️   Subiendo a S3...');
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: S3_KEY,
        Body: buffer,
        ContentType: 'image/png',
      })
    );

    console.log('🔓  Configurando acceso público...');
    await habilitarAccesoPublico();

    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${S3_KEY}`;
    console.log('\n✅  Logo subido exitosamente.');
    console.log(`\n📋  URL pública: ${publicUrl}`);
    console.log(`\n    Si quieres fijar la URL en App Runner, agrega:`);
    console.log(`    LOGO_EMAIL_URL = ${publicUrl}\n`);
  } catch (err) {
    console.error('❌  Error:', err.message);
    if (err.Code === 'AccessDenied') {
      console.error(
        '    El bucket tiene "Block Public Access" activado.\n' +
        '    En S3 → tu bucket → Permisos → Bloquear acceso público:\n' +
        '    Desactiva "Bloquear políticas de bucket públicas" y vuelve a ejecutar.'
      );
    }
    process.exit(1);
  }
})();
