/**
 * Generador de documentos Word (.docx) con branding CenthriX
 *
 * Genera:
 * 1. soporte-administrativo.docx
 * 2. manual-usuario.docx
 *
 * Uso: node generar-word.js
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, PageBreak,
  Header, Footer, ImageRun, ShadingType, convertInchesToTwip } = require('docx');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
// CenthriX Design Tokens
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary: '1A1A2E',
  accent: 'E74C3C',
  success: '2ECC71',
  text: '1A1A2E',
  textSecondary: '455A64',
  white: 'FFFFFF',
  bgLight: 'F8F9FA',
};

const FONT = 'Segoe UI';

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  children: [new TextRun({ text, font: FONT, bold: true, color: COLORS.primary, size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22 })],
  heading: level,
  spacing: { before: 300, after: 150 },
});

const para = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: FONT, size: 22, color: opts.color || COLORS.textSecondary, bold: opts.bold, italics: opts.italics })],
  spacing: { after: 120 },
  alignment: opts.alignment,
});

const bullet = (text) => new Paragraph({
  children: [new TextRun({ text, font: FONT, size: 22, color: COLORS.textSecondary })],
  bullet: { level: 0 },
  spacing: { after: 60 },
});

const numberedItem = (num, text) => new Paragraph({
  children: [
    new TextRun({ text: `${num}. `, font: FONT, size: 22, bold: true, color: COLORS.accent }),
    new TextRun({ text, font: FONT, size: 22, color: COLORS.textSecondary }),
  ],
  spacing: { after: 80 },
});

const divider = () => new Paragraph({
  children: [new TextRun({ text: '─'.repeat(60), font: FONT, size: 16, color: 'B0BEC5' })],
  spacing: { before: 200, after: 200 },
});

const screenshotPlaceholder = (desc) => new Paragraph({
  children: [new TextRun({ text: `[ Insertar captura: ${desc} ]`, font: FONT, size: 20, color: 'B0BEC5', italics: true })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 150, after: 150 },
  border: { top: { style: BorderStyle.DASHED, size: 1, color: 'B0BEC5' }, bottom: { style: BorderStyle.DASHED, size: 1, color: 'B0BEC5' }, left: { style: BorderStyle.DASHED, size: 1, color: 'B0BEC5' }, right: { style: BorderStyle.DASHED, size: 1, color: 'B0BEC5' } },
});

const tableCell = (text, opts = {}) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 20, color: opts.header ? COLORS.white : COLORS.text, bold: opts.bold || opts.header })], alignment: AlignmentType.LEFT })],
  shading: opts.header ? { type: ShadingType.CLEAR, fill: COLORS.primary } : opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
});

const simpleTable = (headers, rows) => new Table({
  rows: [
    new TableRow({ children: headers.map(h => tableCell(h, { header: true })) }),
    ...rows.map(row => new TableRow({ children: row.map(cell => tableCell(cell)) })),
  ],
  width: { size: 100, type: WidthType.PERCENTAGE },
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENTO 1: SOPORTE ADMINISTRATIVO
// ═══════════════════════════════════════════════════════════════

async function generarSoporteAdministrativo() {
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      headers: {
        default: new Header({ children: [para('CRM CenthriX — ISTHO S.A.S. | Soporte Administrativo', { color: 'B0BEC5' })] }),
      },
      footers: {
        default: new Footer({ children: [para('ISTHO S.A.S. © 2026 — Centro Logístico Industrial del Norte — Girardota, Antioquia', { color: 'B0BEC5', alignment: AlignmentType.CENTER })] }),
      },
      children: [
        // Portada
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({ children: [new TextRun({ text: 'Documento de Soporte Administrativo', font: FONT, bold: true, size: 48, color: COLORS.primary })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: 'CRM CenthriX', font: FONT, bold: true, size: 36, color: COLORS.accent })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'Sistema integral de gestión logística, transporte y almacenamiento', font: FONT, size: 24, color: COLORS.textSecondary })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        para('Versión: 1.1.0 | Fecha: Abril 2026', { alignment: AlignmentType.CENTER }),
        para('Elaborado por: Coordinación TI — ISTHO S.A.S.', { alignment: AlignmentType.CENTER }),
        para('Clasificación: Uso interno', { alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new PageBreak()] }),

        // 1. Introducción
        heading('1. Introducción'),
        para('El presente documento describe el soporte administrativo del sistema CRM CenthriX, una plataforma integral de gestión logística, transporte y almacenamiento desarrollada para ISTHO S.A.S. (Centro Logístico Industrial del Norte), ubicada en Girardota, Antioquia, Colombia.'),
        para('CenthriX centraliza la gestión de clientes, inventario, operaciones de bodega, despachos, viajes, cajas menores y la integración con el sistema WMS Centhrix (el WMS empuja datos al CRM via API REST).'),
        para('El sistema está diseñado para operar en entorno web, accesible desde navegadores de escritorio y dispositivos móviles, con soporte para modo claro y oscuro.'),
        divider(),

        // 2. Objetivo General
        heading('2. Objetivo General'),
        para('Implementar y mantener un sistema CRM que permita a ISTHO S.A.S. gestionar de manera integral sus operaciones logísticas, de transporte y almacenamiento, garantizando la trazabilidad de la información, la eficiencia operativa y el cumplimiento de los estándares ISO 9001:2015.'),
        divider(),

        // 3. Objetivos Específicos
        heading('3. Objetivos Específicos'),
        heading('3.1 Gestión de Clientes', HeadingLevel.HEADING_3),
        bullet('Centralizar la información de clientes corporativos con datos de contacto, documentación tributaria y estado comercial.'),
        bullet('Proporcionar un portal de consulta para que los clientes accedan a su inventario y operaciones en tiempo real.'),
        heading('3.2 Control de Inventario', HeadingLevel.HEADING_3),
        bullet('Gestionar el inventario por cliente con trazabilidad a nivel de caja, lote y ubicación.'),
        bullet('Sincronizar automáticamente entradas, salidas y ajustes desde el WMS Centhrix.'),
        bullet('Generar alertas automáticas de stock bajo, agotado y próximo a vencer.'),
        heading('3.3 Operaciones de Bodega', HeadingLevel.HEADING_3),
        bullet('Registrar y auditar todas las operaciones de ingreso (CO), salida/picking (PK) y ajustes de kardex (CR).'),
        bullet('Implementar un flujo de auditoría con verificación de líneas, registro de averías y evidencia fotográfica.'),
        bullet('Enviar notificaciones automáticas por email al cerrar auditorías.'),
        heading('3.4 Transporte y Viajes', HeadingLevel.HEADING_3),
        bullet('Gestionar la flota de vehículos con control de documentos (SOAT, tecnomecánica) y alertas de vencimiento.'),
        bullet('Registrar viajes con asignación de conductor, vehículo, ruta y caja menor.'),
        bullet('Controlar gastos de viaje con flujo de aprobación financiera.'),
        heading('3.5 Cajas Menores', HeadingLevel.HEADING_3),
        bullet('Administrar cajas menores asignables a cualquier usuario del sistema.'),
        bullet('Implementar flujo de egresos, ingresos, aprobación y cierre contable.'),
        bullet('Permitir traslado de saldos entre cajas y liquidación al cierre.'),
        heading('3.6 Reportes y Análisis', HeadingLevel.HEADING_3),
        bullet('Generar reportes operativos y financieros en formato Excel y PDF.'),
        bullet('Programar envío automático de reportes por email (6 tipos: operaciones, inventario, clientes, viajes, cajas menores, gastos).'),
        bullet('Proporcionar dashboards con KPIs diferenciados por rol.'),
        heading('3.7 Seguridad y Auditoría', HeadingLevel.HEADING_3),
        bullet('Implementar autenticación JWT con tokens de refresco y bloqueo por intentos fallidos.'),
        bullet('Controlar acceso granular por módulo y acción mediante sistema de permisos.'),
        bullet('Registrar todas las acciones del sistema en log de auditoría.'),
        heading('3.8 Integración WMS', HeadingLevel.HEADING_3),
        bullet('Recibir sincronización desde WMS Centhrix via API REST (el WMS empuja al CRM — el CRM no inicia pulls).'),
        bullet('Validar dinámicamente estados, tipos de orden y motivos de kardex.'),
        bullet('Proporcionar panel de configuración para gestionar reglas de integración.'),
        divider(),

        // 4. Alcance
        heading('4. Alcance del Sistema'),
        heading('4.1 Módulos del Sistema', HeadingLevel.HEADING_3),
        simpleTable(
          ['#', 'Módulo', 'Descripción', 'Roles'],
          [
            ['1', 'Dashboard', 'Panel de control con KPIs', 'Todos'],
            ['2', 'Clientes', 'Gestión de clientes y contactos', 'Admin, Supervisor, Operador, Financiera'],
            ['3', 'Inventario', 'Productos, stock, cajas, lotes', 'Admin, Supervisor, Operador, Cliente'],
            ['4', 'Entradas (CO)', 'Auditoría de recepciones WMS', 'Admin, Supervisor, Operador, Cliente'],
            ['5', 'Salidas (PK)', 'Auditoría de despachos WMS', 'Admin, Supervisor, Operador, Cliente'],
            ['6', 'Kardex (CR)', 'Auditoría de ajustes WMS', 'Admin, Supervisor, Operador, Cliente'],
            ['7', 'Vehículos', 'Flota y documentos', 'Admin, Supervisor, Financiera, Conductor'],
            ['8', 'Viajes', 'Rutas y asignaciones', 'Admin, Supervisor, Financiera, Conductor'],
            ['9', 'Cajas Menores', 'Fondos y saldos', 'Admin, Supervisor, Financiera, Conductor, Operador'],
            ['10', 'Movimientos', 'Egresos, ingresos, aprobación', 'Admin, Supervisor, Financiera, Conductor, Operador'],
            ['11', 'Reportes', 'Visualización y exportación', 'Admin, Supervisor, Financiera, Cliente'],
            ['12', 'Reportes Programados', 'Envío automático por email', 'Admin, Supervisor'],
            ['13', 'Plantillas Email', 'Diseño de correos', 'Admin, Supervisor'],
            ['14', 'Configuración WMS', 'Reglas de integración', 'Admin'],
            ['15', 'Administración', 'Usuarios, roles, permisos', 'Admin'],
            ['16', 'Perfil', 'Datos personales, avatar', 'Todos'],
            ['17', 'Notificaciones', 'Alertas en tiempo real', 'Todos'],
          ]
        ),
        heading('4.2 Integraciones', HeadingLevel.HEADING_3),
        simpleTable(
          ['Sistema', 'Tipo', 'Protocolo', 'Descripción'],
          [
            ['WMS Centhrix', 'Entrante', 'API REST + API Key', 'WMS empuja productos, entradas, salidas y kardex al CRM'],
            ['Outlook SMTP', 'Saliente', 'SMTP 587 (TLS)', 'Envío de emails transaccionales, recuperación de contraseña y reportes'],
            ['Socket.IO', 'Interno', 'HTTP Long-polling', 'Notificaciones en tiempo real (conexión persistente sin WebSocket)'],
          ]
        ),
        heading('4.3 Infraestructura', HeadingLevel.HEADING_3),
        simpleTable(
          ['Componente', 'Plataforma', 'Tecnología', 'Costo/mes'],
          [
            ['Backend', 'AWS App Runner (us-west-2)', 'Node.js 22, Express, Sequelize', '~$14-15'],
            ['Frontend', 'Vercel (Hobby)', 'React 19, Vite, Tailwind CSS 4', '$0'],
            ['Base de datos', 'AWS RDS MySQL 8.0 (us-west-2)', 'db.t3.micro, 20 GB gp2', '~$14.54'],
            ['Almacenamiento', 'AWS S3 (us-west-2)', 'Bucket istho-crm-files', '~$0.10'],
            ['Email', 'Outlook SMTP', 'Puerto 587, TLS', '$0'],
            ['Total', '', '', '~$30/mes'],
          ]
        ),
        divider(),

        // 5. Roles
        heading('5. Roles y Responsabilidades'),
        simpleTable(
          ['Rol', 'Nivel', 'Descripción'],
          [
            ['Administrador', '100', 'Acceso total. Gestión de usuarios, configuración WMS, plantillas email.'],
            ['Supervisor', '75', 'Operaciones, reportes, auditoría, plantillas email, aprobación de gastos.'],
            ['Financiera', '60', 'Cajas menores, aprobación de gastos, vehículos, viajes, reportes financieros.'],
            ['Operador', '50', 'Operaciones de bodega, inventario, movimientos en cajas asignadas.'],
            ['Conductor', '30', 'Viajes, gastos de viaje, vehículos asignados, cajas menores propias.'],
            ['Cliente', '10', 'Portal de consulta: inventario, operaciones, reportes propios.'],
          ]
        ),
        divider(),

        // 6. Requisitos
        heading('6. Requisitos Técnicos'),
        heading('6.1 Para el Usuario Final', HeadingLevel.HEADING_3),
        bullet('Navegador web moderno (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)'),
        bullet('Conexión a internet'),
        bullet('Resolución mínima: 360px (móvil) / 1024px (escritorio)'),
        heading('6.2 Para el Administrador del Sistema', HeadingLevel.HEADING_3),
        bullet('Acceso a la consola AWS (App Runner, RDS, S3) — región us-west-2'),
        bullet('Acceso al dashboard de Vercel (frontend)'),
        bullet('Acceso a la cuenta de Microsoft Outlook corporativa (gestión de credenciales SMTP)'),
        bullet('Conocimiento básico de variables de entorno'),
        bullet('Repositorio GitHub istho-crm-p (los pushes a main activan el redespliegue automático)'),
        divider(),

        // 7. Contacto
        heading('7. Contacto y Soporte'),
        simpleTable(
          ['Concepto', 'Detalle'],
          [
            ['Empresa', 'ISTHO S.A.S. — Centro Logístico Industrial del Norte'],
            ['Ubicación', 'Girardota, Antioquia, Colombia'],
            ['Certificación', 'ISO 9001:2015'],
            ['Dominio', 'istho.com.co'],
            ['Soporte TI', 'Coordinación TI — ISTHO S.A.S.'],
          ]
        ),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('soporte-administrativo.docx', buffer);
  console.log('✅ soporte-administrativo.docx generado');
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTO 2: MANUAL DE USUARIO (resumen ejecutivo)
// ═══════════════════════════════════════════════════════════════

async function generarManualUsuario() {
  const modules = [
    { title: '1. Autenticación', desc: 'Inicio de sesión, recuperar contraseña, cambio obligatorio, bloqueo de cuenta.', screenshot: 'Página de Login' },
    { title: '2. Dashboard', desc: 'Panel de control diferenciado por rol (Admin, Financiera, Conductor, Operador).', screenshot: 'Dashboard Administrador' },
    { title: '3. Clientes', desc: 'Gestión de clientes corporativos, contactos y portal de consulta.', screenshot: 'Listado de Clientes' },
    { title: '4. Inventario', desc: 'Productos, stock por cliente, cajas, lotes, alertas de inventario.', screenshot: 'Listado de Inventario' },
    { title: '5. Auditoría WMS', desc: 'Verificación de entradas (CO), salidas (PK) y kardex (CR). Registro de averías y evidencias.', screenshot: 'Auditoría de Entrada' },
    { title: '6. Vehículos', desc: 'Flota vehicular, documentos SOAT/tecnomecánica, alertas de vencimiento.', screenshot: 'Listado de Vehículos' },
    { title: '7. Viajes', desc: 'Creación de viajes con conductor, vehículo, ruta y gastos asociados.', screenshot: 'Formulario Nuevo Viaje' },
    { title: '8. Cajas Menores', desc: 'Fondos asignados a usuarios. Saldo, movimientos, cierre con traslado o liquidación.', screenshot: 'Detalle de Caja Menor' },
    { title: '9. Movimientos', desc: 'Egresos e ingresos. 18 conceptos de egreso, 7 de ingreso. Aprobación individual y masiva.', screenshot: 'Listado de Movimientos' },
    { title: '10. Reportes', desc: '6 tipos de reportes con KPIs, gráficos y exportación. Reportes programados por email.', screenshot: 'Vista de Reportes' },
    { title: '11. Configuración WMS', desc: 'Motivos de kardex, tipos de orden y estados válidos para procesamiento.', screenshot: 'Panel Configuración WMS' },
    { title: '12. Administración', desc: 'Usuarios, roles, permisos granulares, sesiones activas.', screenshot: 'Administración de Usuarios' },
    { title: '13. Perfil', desc: 'Datos personales, avatar, cambio de contraseña, tema oscuro/claro.', screenshot: 'Página de Perfil' },
    { title: '14. Notificaciones', desc: 'Alertas en tiempo real via HTTP Long-polling. Filtros por tipo y prioridad.', screenshot: 'Panel de Notificaciones' },
  ];

  const children = [
    // Portada
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({ children: [new TextRun({ text: 'Manual de Usuario', font: FONT, bold: true, size: 48, color: COLORS.primary })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: 'CRM CenthriX', font: FONT, bold: true, size: 36, color: COLORS.accent })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: 'Guía completa de uso del sistema', font: FONT, size: 24, color: COLORS.textSecondary })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    para('Versión: 1.1.0 | Fecha: Abril 2026', { alignment: AlignmentType.CENTER }),
    para('ISTHO S.A.S. — Centro Logístico Industrial del Norte', { alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),

    // Tabla de contenido
    heading('Tabla de Contenido'),
    ...modules.map(m => para(`${m.title}`)),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // Módulos
  for (const mod of modules) {
    children.push(heading(mod.title));
    children.push(para(mod.desc));
    children.push(screenshotPlaceholder(mod.screenshot));

    // Steps genéricos por módulo
    if (mod.title.includes('Autenticación')) {
      children.push(heading('Inicio de Sesión', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Abrir el navegador e ingresar la URL del sistema.'));
      children.push(numberedItem(2, 'Ingresar usuario o correo electrónico en el campo correspondiente.'));
      children.push(numberedItem(3, 'Ingresar la contraseña.'));
      children.push(numberedItem(4, 'Opcionalmente marcar "Recordarme" para mantener la sesión.'));
      children.push(numberedItem(5, 'Hacer clic en "Iniciar Sesión".'));
      children.push(para('Si es el primer inicio de sesión con contraseña temporal, el sistema solicitará cambiarla obligatoriamente.', { italics: true }));
      children.push(heading('Recuperar Contraseña', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Hacer clic en "¿Olvidaste tu contraseña?" en la página de login.'));
      children.push(numberedItem(2, 'Ingresar el correo electrónico registrado.'));
      children.push(numberedItem(3, 'Hacer clic en "Enviar Instrucciones".'));
      children.push(numberedItem(4, 'Revisar el correo y seguir el enlace de restablecimiento.'));
      children.push(heading('Bloqueo de Cuenta', HeadingLevel.HEADING_3));
      children.push(para('Después de 5 intentos fallidos consecutivos, la cuenta se bloquea por 15 minutos. El bloqueo se levanta automáticamente.'));
      children.push(heading('Autenticación de Dos Factores (2FA)', HeadingLevel.HEADING_3));
      children.push(para('El 2FA agrega una capa de seguridad adicional mediante códigos TOTP generados por una app autenticadora (Google Authenticator, Authy, etc.).'));
      children.push(heading('Activar 2FA', HeadingLevel.HEADING_4 || HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Ir a Perfil → pestaña "Seguridad".'));
      children.push(numberedItem(2, 'Hacer clic en "Activar autenticación de dos factores".'));
      children.push(numberedItem(3, 'Escanear el código QR con la app autenticadora.'));
      children.push(numberedItem(4, 'Ingresar el código de 6 dígitos generado para confirmar.'));
      children.push(numberedItem(5, 'Guardar los 8 códigos de respaldo en un lugar seguro (de un solo uso).'));
      children.push(heading('Iniciar Sesión con 2FA', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Ingresar usuario y contraseña normalmente.'));
      children.push(numberedItem(2, 'Cuando se solicite, ingresar el código de 6 dígitos de la app autenticadora.'));
      children.push(numberedItem(3, 'Si no tienes acceso a la app, usar uno de los códigos de respaldo.'));
    }

    if (mod.title.includes('Cajas Menores')) {
      children.push(heading('Crear Caja Menor', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Ir a Viajes → Cajas Menores.'));
      children.push(numberedItem(2, 'Hacer clic en "Nueva Caja Menor".'));
      children.push(numberedItem(3, 'Seleccionar el usuario asignado (puede ser cualquier usuario activo del sistema).'));
      children.push(numberedItem(4, 'Ingresar el saldo inicial.'));
      children.push(numberedItem(5, 'Agregar observaciones opcionales.'));
      children.push(numberedItem(6, 'Hacer clic en "Crear".'));
      children.push(para('Nota: Si el usuario asignado es conductor, podrá asociar viajes a los gastos. Para otros roles, el campo viaje no aparecerá.', { italics: true }));
      children.push(heading('Cerrar Caja Menor', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Abrir el detalle de la caja menor.'));
      children.push(numberedItem(2, 'Hacer clic en "Cerrar Caja".'));
      children.push(numberedItem(3, 'Si hay saldo sobrante, elegir: "Guardar para siguiente caja" o "Entregar al usuario".'));
      children.push(numberedItem(4, 'Confirmar el cierre.'));
    }

    if (mod.title.includes('Movimientos')) {
      children.push(heading('Crear Movimiento', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Ir a Viajes → Movimientos → "Nuevo Movimiento".'));
      children.push(numberedItem(2, 'Seleccionar la caja menor.'));
      children.push(numberedItem(3, 'Elegir tipo: Egreso o Ingreso.'));
      children.push(numberedItem(4, 'Seleccionar concepto de la lista predefinida.'));
      children.push(numberedItem(5, 'Ingresar el valor.'));
      children.push(numberedItem(6, 'Si el usuario es conductor: opcionalmente asociar un viaje.'));
      children.push(numberedItem(7, 'En la pestaña "Soporte": agregar descripción y archivo adjunto.'));
      children.push(numberedItem(8, 'Hacer clic en "Registrar Movimiento".'));
      children.push(heading('Aprobar/Rechazar Gastos', HeadingLevel.HEADING_3));
      children.push(para('Solo disponible para Admin, Supervisor y Financiera.'));
      children.push(numberedItem(1, 'Seleccionar uno o más movimientos pendientes.'));
      children.push(numberedItem(2, 'Hacer clic en "Aprobar" o "Rechazar".'));
      children.push(numberedItem(3, 'Al aprobar: el valor aprobado puede diferir del solicitado.'));
      children.push(numberedItem(4, 'Al rechazar: agregar observaciones del motivo.'));
    }

    if (mod.title.includes('Reportes')) {
      children.push(heading('Reportes Programados', HeadingLevel.HEADING_3));
      children.push(numberedItem(1, 'Ir a Dashboard → Reportes → Reportes Programados.'));
      children.push(numberedItem(2, 'Hacer clic en "Nuevo Reporte Programado".'));
      children.push(numberedItem(3, 'Ingresar nombre descriptivo.'));
      children.push(numberedItem(4, 'Seleccionar tipo: Operaciones, Inventario, Clientes, Viajes, Cajas Menores o Gastos.'));
      children.push(numberedItem(5, 'Seleccionar formato: Excel, PDF o ambos.'));
      children.push(numberedItem(6, 'Elegir frecuencia (diario, semanal, quincenal, mensual).'));
      children.push(numberedItem(7, 'Ingresar emails destinatarios separados por coma.'));
      children.push(numberedItem(8, 'Hacer clic en "Crear".'));
    }

    children.push(divider());
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      headers: {
        default: new Header({ children: [para('CRM CenthriX — Manual de Usuario | ISTHO S.A.S.', { color: 'B0BEC5' })] }),
      },
      footers: {
        default: new Footer({ children: [para('ISTHO S.A.S. © 2026 — Girardota, Antioquia', { color: 'B0BEC5', alignment: AlignmentType.CENTER })] }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('manual-usuario.docx', buffer);
  console.log('✅ manual-usuario.docx generado');
}

// ═══════════════════════════════════════════════════════════════
// EJECUTAR
// ═══════════════════════════════════════════════════════════════

(async () => {
  try {
    await generarSoporteAdministrativo();
    await generarManualUsuario();
    console.log('\n✅ Todos los documentos generados exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
