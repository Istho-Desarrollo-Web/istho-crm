-- ============================================================
-- Limpieza de tablas de inventario y operaciones (istho_crm)
-- Conserva: clientes, usuarios, roles, permisos, viajes,
--           solicitudes, notificaciones, emails, plantillas,
--           averias, gastos, reportes programados, auditoria
-- ============================================================

USE istho_crm;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE wms_sync_logs;
TRUNCATE TABLE movimientos_inventario;
TRUNCATE TABLE caja_inventario;
TRUNCATE TABLE operacion_detalle;
TRUNCATE TABLE operaciones;
TRUNCATE TABLE inventario;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificación
SELECT 'wms_sync_logs'       AS tabla, COUNT(*) AS registros FROM wms_sync_logs
UNION ALL
SELECT 'movimientos_inventario',        COUNT(*) FROM movimientos_inventario
UNION ALL
SELECT 'caja_inventario',               COUNT(*) FROM caja_inventario
UNION ALL
SELECT 'operacion_detalle',             COUNT(*) FROM operacion_detalle
UNION ALL
SELECT 'operaciones',                   COUNT(*) FROM operaciones
UNION ALL
SELECT 'inventario',                    COUNT(*) FROM inventario;
