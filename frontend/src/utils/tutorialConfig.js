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
};
