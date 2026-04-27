/**
 * ISTHO CRM - Servicio de Backup
 */

import apiClient from './client';
import { BACKUP_ENDPOINTS } from './endpoints';

const backupService = {
  obtenerHistorial: () => apiClient.get(BACKUP_ENDPOINTS.HISTORIAL),

  ejecutarBackup: () => apiClient.post(BACKUP_ENDPOINTS.EJECUTAR),
};

export default backupService;
