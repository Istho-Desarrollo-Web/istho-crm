/**
 * ISTHO CRM - Sistema de Logging
 * 
 * Logger personalizado con niveles y formato consistente.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Niveles de log
const levels = {
  error: { priority: 0, color: colors.red, label: 'ERROR' },
  warn: { priority: 1, color: colors.yellow, label: 'WARN' },
  info: { priority: 2, color: colors.green, label: 'INFO' },
  http: { priority: 3, color: colors.magenta, label: 'HTTP' },
  debug: { priority: 4, color: colors.cyan, label: 'DEBUG' }
};

// Nivel actual basado en entorno
const currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Obtener timestamp formateado
 */
const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Escribir en archivo de log
 */
const writeToFile = (message) => {
  if (process.env.LOG_FILE) {
    const logPath = path.resolve(process.env.LOG_FILE);
    const logDir = path.dirname(logPath);
    
    // Crear directorio si no existe
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(logPath, message + '\n');
  }
};

/**
 * Función principal de log
 */
const log = (level, message, meta = {}) => {
  const levelConfig = levels[level];
  
  // Verificar si el nivel está habilitado
  if (levelConfig.priority > levels[currentLevel].priority) {
    return;
  }
  
  const timestamp = getTimestamp();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  
  // Formato consola con colores
  const consoleMessage = `${colors.bright}[${timestamp}]${colors.reset} ${levelConfig.color}[${levelConfig.label}]${colors.reset} ${message}${metaString}`;
  
  // Formato archivo sin colores
  const fileMessage = `[${timestamp}] [${levelConfig.label}] ${message}${metaString}`;
  
  console.log(consoleMessage);
  writeToFile(fileMessage);
};

// Exportar métodos por nivel
module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};