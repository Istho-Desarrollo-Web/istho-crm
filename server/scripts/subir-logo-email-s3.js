/**
 * Script de migración: sube logo de email a S3 como objeto público.
 * Ejecutar una sola vez desde local: node server/scripts/subir-logo-email-s3.js
 *
 * Requisitos: AWS_S3_BUCKET y AWS_REGION en .env o variables de entorno.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const https = require('https');
const { S3Client, PutObjectCommand, PutBucketPolicyCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');

const LOGO_URL =
  'https://res.cloudinary.com/dut7n03xd/image/upload/v1774472303/istho-crm/branding/logo-email.png';
const S3_KEY = 'branding/logo-email.png';
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';

if (!BUCKET) {
  console.error('❌  AWS_S3_BUCKET no está configurado');
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

const descargar = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }));
      res.on('error', reject);
    });
  });

const habilitarAccesoPublico = async () => {
  // Agrega una política de bucket para permitir GetObject público en branding/*
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
    console.log('⬇️   Descargando logo desde Cloudinary...');
    const { buffer, contentType } = await descargar(LOGO_URL);
    console.log(`    ${buffer.length} bytes, tipo: ${contentType}`);

    console.log('⬆️   Subiendo a S3...');
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: S3_KEY,
        Body: buffer,
        ContentType: contentType || 'image/png',
      })
    );

    console.log('🔓  Configurando acceso público...');
    await habilitarAccesoPublico();

    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${S3_KEY}`;
    console.log('\n✅  Logo subido exitosamente.');
    console.log(`\n📋  Agrega esta variable en App Runner:`);
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
