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

const LOGOS = [
  {
    local: path.join(__dirname, '../../frontend/src/assets/logo-blanco.png'),
    key: 'branding/logo-email.png',
    label: 'logo blanco (header)',
  },
  {
    local: path.join(__dirname, '../../frontend/src/assets/logo-negro.png'),
    key: 'branding/logo-email-dark.png',
    label: 'logo oscuro (footer)',
  },
];
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-west-2';

if (!BUCKET) {
  console.error('❌  AWS_S3_BUCKET no está configurado');
  process.exit(1);
}

for (const { local, label } of LOGOS) {
  if (!fs.existsSync(local)) {
    console.error(`❌  No se encontró ${label}: ${local}`);
    process.exit(1);
  }
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
    try {
      console.log('🔓  Verificando/configurando acceso público para branding/*...');
      await habilitarAccesoPublico();
    } catch (policyErr) {
      console.warn(`⚠️   Sin permisos para modificar política del bucket (${policyErr.message.split(' because')[0].split(' on resource')[0].slice(-60)}). Continuando con la subida...`);
    }

    for (const { local, key, label } of LOGOS) {
      const buffer = fs.readFileSync(local);
      console.log(`\n📁  ${label}: ${local} (${buffer.length} bytes)`);
      console.log(`⬆️   Subiendo a s3://${BUCKET}/${key}...`);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
        })
      );
      const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      console.log(`✅  ${publicUrl}`);
    }

    console.log('\n📋  Variables de entorno para App Runner (opcionales):');
    console.log(`    LOGO_EMAIL_URL      = https://${BUCKET}.s3.${REGION}.amazonaws.com/branding/logo-email.png`);
    console.log(`    LOGO_EMAIL_DARK_URL = https://${BUCKET}.s3.${REGION}.amazonaws.com/branding/logo-email-dark.png\n`);
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
