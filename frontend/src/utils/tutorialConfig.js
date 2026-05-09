export const TUTORIALES = {

  dashboard_operaciones: {
    modulo: 'dashboard_operaciones',
    pasos: [
      {
        element: '#tour-dash-kpis',
        popover: {
          title: 'KPIs del día',
          description: 'Resumen ejecutivo: operaciones activas, alertas de inventario y viajes en curso.',
        },
      },
      {
        element: '#tour-dash-grafico',
        popover: {
          title: 'Gráfico de actividad',
          description: 'Evolución de entradas y salidas del último mes.',
        },
      },
      {
        element: '#tour-dash-alertas',
        popover: {
          title: 'Alertas de stock',
          description: 'Productos por debajo del stock mínimo que requieren atención.',
        },
      },
    ],
  },

  dashboard_conductor: {
    modulo: 'dashboard_conductor',
    pasos: [
      {
        element: '#tour-dash-caja',
        popover: {
          title: 'Caja Menor Activa',
          description: 'Tu caja menor en curso. Muestra el saldo disponible para gastos del viaje.',
        },
      },
      {
        element: '#tour-dash-registrar',
        popover: {
          title: 'Registrar Gasto',
          description: 'Agrega un gasto con foto del soporte para su aprobación.',
        },
      },
    ],
  },

  dashboard_financiera: {
    modulo: 'dashboard_financiera',
    pasos: [
      {
        element: '#tour-dash-resumen',
        popover: {
          title: 'Resumen financiero',
          description: 'KPIs de cajas menores: saldo total, gastos del período y cajas abiertas.',
        },
      },
      {
        element: '#tour-dash-pendientes',
        popover: {
          title: 'Gastos pendientes',
          description: 'Movimientos que aún no tienen soporte aprobado. Apruébalos o recházalos desde aquí.',
        },
      },
    ],
  },

  clientes: {
    modulo: 'clientes',
    pasos: [
      {
        element: '#tour-clientes-tabla',
        popover: {
          title: 'Lista de clientes',
          description: 'Todos los clientes registrados. Puedes buscar por nombre, NIT o ciudad.',
        },
      },
      {
        element: '#tour-clientes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por estado (activo/inactivo) o por tipo de cliente.',
        },
      },
      {
        element: '#tour-clientes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga la lista completa en Excel para reportes externos.',
        },
      },
      {
        element: '#tour-clientes-nuevo',
        popover: {
          title: 'Nuevo cliente',
          description: 'Crea un cliente nuevo. Necesitas NIT, razón social y ciudad como mínimo.',
        },
      },
    ],
  },

  inventario: {
    modulo: 'inventario',
    pasos: [
      {
        element: '#tour-inventario-kpis',
        popover: {
          title: 'Resumen de inventario',
          description: 'Total de productos, valor en stock y alertas activas de stock mínimo.',
        },
      },
      {
        element: '#tour-inventario-buscar',
        popover: {
          title: 'Búsqueda y filtros',
          description: 'Busca por nombre o SKU. Filtra por cliente, estado o rango de stock.',
        },
      },
      {
        element: '#tour-inventario-tabla',
        popover: {
          title: 'Maestro de productos',
          description: 'Catálogo completo. Haz clic en un producto para ver su detalle, movimientos y ubicación WMS.',
        },
      },
    ],
  },

  operaciones: {
    modulo: 'operaciones',
    pasos: [
      {
        element: '#tour-ops-exportar',
        popover: {
          title: 'Exportar',
          description: 'Genera un Excel con las operaciones del período seleccionado.',
        },
      },
      {
        element: '#tour-ops-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por rango de fechas, estado o cliente para acotar los resultados.',
        },
      },
      {
        element: '#tour-ops-tabla',
        popover: {
          title: 'Tabla de operaciones',
          description: 'Cada fila es una orden del WMS. Haz clic para ver el detalle completo y el histórico de auditoría.',
        },
      },
    ],
  },

  viajes: {
    modulo: 'viajes',
    pasos: [
      {
        element: '#tour-viajes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de viajes en Excel.',
        },
      },
      {
        element: '#tour-viajes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por estado, conductor o rango de fechas.',
        },
      },
      {
        element: '#tour-viajes-tabla',
        popover: {
          title: 'Lista de viajes',
          description: 'Todos los viajes registrados. Haz clic para ver el detalle, gastos y documentos.',
        },
      },
      {
        element: '#tour-viajes-nuevo',
        popover: {
          title: 'Nuevo viaje',
          description: 'Registra un viaje: asigna conductor, vehículo, origen y destino.',
        },
      },
    ],
  },

  vehiculos: {
    modulo: 'vehiculos',
    pasos: [
      {
        element: '#tour-vehiculos-tabla',
        popover: {
          title: 'Flota de vehículos',
          description: 'Listado de todos los vehículos con placa, tipo y estado actual.',
        },
      },
      {
        element: '#tour-vehiculos-nuevo',
        popover: {
          title: 'Nuevo vehículo',
          description: 'Registra un vehículo con placa, marca, modelo y capacidad de carga.',
        },
      },
    ],
  },

  cajas_menores: {
    modulo: 'cajas_menores',
    pasos: [
      {
        element: '#tour-cajas-tabla',
        popover: {
          title: 'Cajas menores',
          description: 'Cada caja está asociada a un conductor. Muestra el saldo actual y el estado.',
        },
      },
      {
        element: '#tour-cajas-nueva',
        popover: {
          title: 'Nueva caja menor',
          description: 'Crea una caja menor para un conductor con su saldo inicial.',
        },
      },
    ],
  },

  movimientos: {
    modulo: 'movimientos',
    pasos: [
      {
        element: '#tour-movimientos-tabla',
        popover: {
          title: 'Movimientos',
          description: 'Historial de todos los gastos, anticipos y reintegros de cajas menores.',
        },
      },
      {
        element: '#tour-movimientos-nuevo',
        popover: {
          title: 'Nuevo movimiento',
          description: 'Registra un gasto o ingreso con soporte documental.',
        },
      },
    ],
  },

  salidas: {
    modulo: 'salidas',
    pasos: [
      {
        element: '#tour-salidas-kpis',
        popover: {
          title: 'Estado de despachos',
          description: 'Resumen de salidas: pendientes de auditoría, en proceso y ya cerradas.',
        },
      },
      {
        element: '#tour-salidas-filtros',
        popover: {
          title: 'Buscar y filtrar',
          description: 'Filtra por documento, cliente, estado o rango de fechas para encontrar una salida específica.',
        },
      },
      {
        element: '#tour-salidas-tabla',
        popover: {
          title: 'Lista de salidas',
          description: 'Cada fila es un despacho del WMS. Haz clic para iniciar o continuar la auditoría de esa salida.',
        },
      },
    ],
  },

  kardex: {
    modulo: 'kardex',
    pasos: [
      {
        element: '#tour-kardex-kpis',
        popover: {
          title: 'Estado de ajustes',
          description: 'Resumen de kardex: ajustes pendientes, en proceso y cerrados.',
        },
      },
      {
        element: '#tour-kardex-filtros',
        popover: {
          title: 'Buscar y filtrar',
          description: 'Filtra por documento, motivo, cliente o fechas para localizar un ajuste de inventario.',
        },
      },
      {
        element: '#tour-kardex-tabla',
        popover: {
          title: 'Lista de kardex',
          description: 'Cada fila es un ajuste de unidades generado por el WMS. Haz clic para ver el detalle y las líneas afectadas.',
        },
      },
    ],
  },

  operacion_detalle: {
    modulo: 'operacion_detalle',
    pasos: [
      {
        element: '#tour-op-header',
        popover: {
          title: 'Encabezado del documento',
          description: 'Número de orden, cliente y estado de la auditoría. El círculo de progreso indica cuántas líneas ya fueron verificadas.',
        },
      },
      {
        element: '#tour-op-lineas',
        popover: {
          title: 'Líneas de operación',
          description: 'Cada línea corresponde a un producto del WMS. Márcalas como verificadas conforme las revisas físicamente.',
        },
      },
      {
        element: '#tour-op-logistica',
        popover: {
          title: 'Datos logísticos',
          description: 'Conductor, placa del vehículo y otros datos requeridos para cerrar la auditoría.',
        },
      },
      {
        element: '#tour-op-evidencias',
        popover: {
          title: 'Evidencias y soportes',
          description: 'Adjunta fotos o PDFs como soporte del despacho o recepción. Se guardan automáticamente.',
        },
      },
    ],
  },

  cliente_detalle: {
    modulo: 'cliente_detalle',
    pasos: [
      {
        element: '#tour-cliente-kpis',
        popover: {
          title: 'Resumen del cliente',
          description: 'Operaciones del mes, productos en bodega y número de contactos registrados.',
        },
      },
      {
        element: '#tour-cliente-tabs',
        popover: {
          title: 'Tabs del cliente',
          description: 'Navega entre Información (datos fiscales y de contacto), Contactos, Usuarios Portal e Historial de actividad.',
        },
      },
    ],
  },

  producto_detalle: {
    modulo: 'producto_detalle',
    pasos: [
      {
        element: '#tour-producto-kpis',
        popover: {
          title: 'Indicadores del producto',
          description: 'Valor en stock, entradas y salidas del mes y tasa de rotación en los últimos 30 días.',
        },
      },
      {
        element: '#tour-producto-stock',
        popover: {
          title: 'Stock actual',
          description: 'Medidor visual del stock. Los límites mínimo y máximo son editables y disparan alertas automáticas.',
        },
      },
      {
        element: '#tour-producto-tabs',
        popover: {
          title: 'Detalle del producto',
          description: 'Tabs: Información general, Cajas en bodega, Movimientos (historial), Estadísticas y Ubicación WMS (si aplica).',
        },
      },
    ],
  },

  reportes: {
    modulo: 'reportes',
    pasos: [
      {
        element: '#tour-reportes-header',
        popover: {
          title: 'Reportes',
          description: 'Acceso centralizado a todos los informes del sistema.',
        },
      },
      {
        element: '#tour-reportes-cards',
        popover: {
          title: 'Tipos de reporte',
          description: 'Cada card abre el reporte con sus filtros y opciones de exportación.',
        },
      },
    ],
  },

  reportes_operaciones: {
    modulo: 'reportes_operaciones',
    pasos: [
      {
        element: '#tour-reportes-operaciones-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por rango de fechas y cliente para acotar el análisis.',
        },
      },
      {
        element: '#tour-reportes-operaciones-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores clave del período: total de operaciones, entradas, salidas y kardex.',
        },
      },
      {
        element: '#tour-reportes-operaciones-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte en Excel o PDF, o envíalo directamente por correo.',
        },
      },
    ],
  },

  reportes_inventario: {
    modulo: 'reportes_inventario',
    pasos: [
      {
        element: '#tour-reportes-inventario-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por cliente y fechas para ver el estado del inventario.',
        },
      },
      {
        element: '#tour-reportes-inventario-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores de stock: productos activos, valor total y alertas de bajo inventario.',
        },
      },
      {
        element: '#tour-reportes-inventario-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el inventario completo en Excel o PDF.',
        },
      },
    ],
  },

  reportes_inventario_ubicacion: {
    modulo: 'reportes_inventario_ubicacion',
    pasos: [
      {
        element: '#tour-reportes-inventario-ubicacion-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra por cliente o bodega para ver la distribución por ubicación.',
        },
      },
      {
        element: '#tour-reportes-inventario-ubicacion-kpis',
        popover: {
          title: 'Resumen',
          description: 'Resumen de cajas y posiciones ocupadas en bodega.',
        },
      },
      {
        element: '#tour-reportes-inventario-ubicacion-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el detalle de ubicaciones en Excel o PDF.',
        },
      },
    ],
  },

  reportes_clientes: {
    modulo: 'reportes_clientes',
    pasos: [
      {
        element: '#tour-reportes-clientes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra clientes por estado o rango de fechas de registro.',
        },
      },
      {
        element: '#tour-reportes-clientes-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de clientes activos, inactivos y nuevos en el período.',
        },
      },
      {
        element: '#tour-reportes-clientes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el listado de clientes con toda su información de contacto.',
        },
      },
    ],
  },

  reportes_viajes: {
    modulo: 'reportes_viajes',
    pasos: [
      {
        element: '#tour-reportes-viajes-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra viajes por conductor, vehículo o rango de fechas.',
        },
      },
      {
        element: '#tour-reportes-viajes-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Indicadores de viajes: completados, en curso y cancelados.',
        },
      },
      {
        element: '#tour-reportes-viajes-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de viajes en Excel o PDF.',
        },
      },
    ],
  },

  reportes_cajas_menores: {
    modulo: 'reportes_cajas_menores',
    pasos: [
      {
        element: '#tour-reportes-cajas-menores-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Saldo actual, total de ingresos y egresos del período.',
        },
      },
      {
        element: '#tour-reportes-cajas-menores-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el movimiento de caja menor en Excel o PDF.',
        },
      },
    ],
  },

  reportes_gastos: {
    modulo: 'reportes_gastos',
    pasos: [
      {
        element: '#tour-reportes-gastos-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra gastos por fecha, categoría o viaje asociado.',
        },
      },
      {
        element: '#tour-reportes-gastos-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de gastos del período agrupados por categoría.',
        },
      },
      {
        element: '#tour-reportes-gastos-exportar',
        popover: {
          title: 'Exportar',
          description: 'Descarga el reporte de gastos en Excel o PDF.',
        },
      },
    ],
  },

  reportes_averias: {
    modulo: 'reportes_averias',
    pasos: [
      {
        element: '#tour-reportes-averias-filtros',
        popover: {
          title: 'Filtros',
          description: 'Filtra averías por operación, cliente o rango de fechas.',
        },
      },
      {
        element: '#tour-reportes-averias-kpis',
        popover: {
          title: 'Indicadores',
          description: 'Total de averías registradas y su impacto económico.',
        },
      },
      {
        element: '#tour-reportes-averias-exportar',
        popover: {
          title: 'Exportar',
          description: 'Exporta el registro de averías en Excel o PDF.',
        },
      },
    ],
  },

  reportes_programados: {
    modulo: 'reportes_programados',
    pasos: [
      {
        element: '#tour-reportes-programados-tabla',
        popover: {
          title: 'Reportes programados',
          description: 'Tus reportes automáticos configurados con su frecuencia y próximo envío.',
        },
      },
      {
        element: '#tour-reportes-programados-nuevo',
        popover: {
          title: 'Nuevo reporte programado',
          description: 'Crea un nuevo reporte automático: elige tipo, frecuencia, formato y destinatarios.',
        },
      },
    ],
  },

  administracion_usuarios: {
    modulo: 'administracion_usuarios',
    pasos: [
      {
        element: '#tour-admin-usuarios-tabla',
        popover: {
          title: 'Usuarios del sistema',
          description: 'Lista de usuarios con su rol, estado y último acceso.',
        },
      },
      {
        element: '#tour-admin-usuarios-nuevo',
        popover: {
          title: 'Nuevo usuario',
          description: 'Crea un usuario nuevo asignándole rol, contraseña temporal y permisos.',
        },
      },
    ],
  },

  administracion_roles: {
    modulo: 'administracion_roles',
    pasos: [
      {
        element: '#tour-admin-roles-tabla',
        popover: {
          title: 'Matriz de permisos',
          description: 'Roles disponibles con sus permisos configurados por módulo.',
        },
      },
      {
        element: '#tour-admin-roles-nuevo',
        popover: {
          title: 'Nuevo rol',
          description: 'Crea un rol personalizado con nombre, nivel jerárquico y permisos granulares.',
        },
      },
    ],
  },

  administracion_sesiones: {
    modulo: 'administracion_sesiones',
    pasos: [
      {
        element: '#tour-admin-sesiones-tabla',
        popover: {
          title: 'Sesiones activas',
          description: 'Usuarios conectados en este momento. Puedes cerrar sesiones forzosamente.',
        },
      },
    ],
  },

  administracion_seguridad: {
    modulo: 'administracion_seguridad',
    pasos: [
      {
        element: '#tour-admin-seguridad-panel',
        popover: {
          title: 'Dashboard de seguridad',
          description: 'Métricas de seguridad: intentos fallidos, usuarios bloqueados y actividad reciente.',
        },
      },
    ],
  },
};

export const RUTAS_CON_TOUR = {
  '/dashboard': 'dashboard',
  '/clientes': 'clientes',
  '/inventario': 'inventario',
  '/operaciones/entradas': 'operaciones',
  '/operaciones/salidas': 'salidas',
  '/operaciones/kardex': 'kardex',
  '/viajes/viajes': 'viajes',
  '/viajes/vehiculos': 'vehiculos',
  '/viajes/cajas-menores': 'cajas_menores',
  '/viajes/movimientos': 'movimientos',
  '/reportes': 'reportes',
  '/reportes/operaciones': 'reportes_operaciones',
  '/reportes/inventario': 'reportes_inventario',
  '/reportes/inventario-ubicacion': 'reportes_inventario_ubicacion',
  '/reportes/clientes': 'reportes_clientes',
  '/reportes/viajes': 'reportes_viajes',
  '/reportes/cajas-menores': 'reportes_cajas_menores',
  '/reportes/gastos': 'reportes_gastos',
  '/reportes/averias': 'reportes_averias',
  '/reportes/programados': 'reportes_programados',
};
