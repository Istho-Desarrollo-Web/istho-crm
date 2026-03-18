/**
 * ISTHO CRM - ReportesList Page
 * Dashboard principal de reportes con acceso a diferentes tipos.
 * Filtra reportes visibles segun el rol del usuario.
 *
 * @author Coordinacion TI ISTHO
 * @date Marzo 2026
 */

import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Package,
  Users,
  Truck,
  Download,
  Calendar,
  Activity,
  Eye,
  Wallet,
  Receipt,
} from 'lucide-react';

import { Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

// ============================================
// REPORTES POR CATEGORIA
// ============================================

// Reportes operativos (admin, supervisor, operador)
const REPORTES_OPERATIVOS = [
  {
    id: 'despachos',
    titulo: 'Reporte de Despachos',
    descripcion: 'Analisis de operaciones de ingreso y salida del WMS',
    icon: Truck,
    color: 'bg-blue-500',
    exportEndpoints: { excel: '/reportes/operaciones/excel', pdf: '/reportes/operaciones/pdf' },
  },
  {
    id: 'inventario',
    titulo: 'Reporte de Inventario',
    descripcion: 'Estado del inventario, stock y valorizacion por cliente',
    icon: Package,
    color: 'bg-emerald-500',
    exportEndpoints: { excel: '/reportes/inventario/excel', pdf: '/reportes/inventario/pdf' },
  },
  {
    id: 'clientes',
    titulo: 'Reporte de Clientes',
    descripcion: 'Listado de clientes, contactos y estado',
    icon: Users,
    color: 'bg-violet-500',
    exportEndpoints: { excel: '/reportes/clientes/excel' },
  },
];

// Reportes financieros (financiera, admin, supervisor)
const REPORTES_FINANCIEROS = [
  {
    id: 'viajes',
    titulo: 'Reporte de Viajes',
    descripcion: 'Historial de viajes, rutas, conductores y estados',
    icon: Truck,
    color: 'bg-blue-500',
    exportEndpoints: { excel: '/reportes/viajes/excel', csv: '/reportes/viajes/csv' },
  },
  {
    id: 'cajas-menores',
    titulo: 'Reporte de Cajas Menores',
    descripcion: 'Resumen de cajas menores, saldos y movimientos',
    icon: Wallet,
    color: 'bg-amber-500',
    exportEndpoints: { excel: '/reportes/cajas-menores/excel' },
  },
  {
    id: 'gastos',
    titulo: 'Reporte de Gastos',
    descripcion: 'Detalle de egresos e ingresos por conductor y concepto',
    icon: Receipt,
    color: 'bg-orange-500',
    exportEndpoints: { excel: '/reportes/movimientos/excel', csv: '/reportes/movimientos/csv' },
  },
];

// Reportes para portal de clientes
const REPORTES_CLIENTE = [
  {
    id: 'inventario',
    titulo: 'Reporte de Inventario',
    descripcion: 'Estado del inventario y stock de tus productos',
    icon: Package,
    color: 'bg-emerald-500',
    exportEndpoints: { excel: '/reportes/inventario/excel', pdf: '/reportes/inventario/pdf' },
  },
  {
    id: 'despachos',
    titulo: 'Reporte de Operaciones',
    descripcion: 'Historial de ingresos y salidas de tus productos',
    icon: Truck,
    color: 'bg-blue-500',
    exportEndpoints: { excel: '/reportes/operaciones/excel', pdf: '/reportes/operaciones/pdf' },
  },
];

/**
 * Selecciona reportes visibles segun el rol del usuario
 */
const getReportesPorRol = (rol) => {
  switch (rol) {
    case 'financiera':
      return REPORTES_FINANCIEROS;
    case 'cliente':
      return REPORTES_CLIENTE;
    case 'conductor':
      return []; // Conductor no ve reportes (usa su dashboard)
    case 'admin':
    case 'supervisor':
      return [...REPORTES_OPERATIVOS, ...REPORTES_FINANCIEROS];
    case 'operador':
      return REPORTES_OPERATIVOS;
    default:
      return REPORTES_OPERATIVOS;
  }
};

// ============================================
// REPORTE CARD
// ============================================
const ReporteCard = ({ reporte, canExport }) => {
  const navigate = useNavigate();
  const Icon = reporte.icon;

  const handleView = () => {
    if (reporte.navigateTo) {
      navigate(reporte.navigateTo);
    } else {
      navigate(`/reportes/${reporte.id}`);
    }
  };

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    window.open(`${baseUrl}${reporte.exportEndpoints.excel}?token=${token}`, '_blank');
  };

  const handleExportCsv = () => {
    if (!reporte.exportEndpoints?.csv) return;
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    window.open(`${baseUrl}${reporte.exportEndpoints.csv}?token=${token}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${reporte.color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{reporte.titulo}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{reporte.descripcion}</p>

      <div className="space-y-2">
        {/* Boton Ver Modulo / Ver Reporte */}
        <Button
          variant="primary"
          size="sm"
          icon={Eye}
          onClick={handleView}
          fullWidth
        >
          {reporte.navigateTo ? 'Ver Modulo' : 'Ver Reporte'}
        </Button>

        {/* Botones de exportacion */}
        {canExport && reporte.exportEndpoints && (
          <div className="flex items-center gap-2">
            {reporte.exportEndpoints.excel && (
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportExcel}
                fullWidth
              >
                Excel
              </Button>
            )}
            {reporte.exportEndpoints.csv && (
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportCsv}
                fullWidth
              >
                CSV
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const ReportesList = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canExport = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');

  const rol = user?.rol || 'operador';
  const reportes = getReportesPorRol(rol);

  const subtitulo = rol === 'financiera'
    ? 'Reportes financieros y de gestion de viajes'
    : rol === 'cliente'
      ? 'Consulta y exporta reportes de tus productos'
      : 'Genera y exporta reportes de gestion';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reportes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitulo}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reportes.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Reportes disponibles</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">Excel / PDF</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Formatos de exportacion</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tiempo real</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Datos actualizados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reportes Grid */}
        {reportes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {reportes.map((reporte) => (
              <ReporteCard key={reporte.id} reporte={reporte} canExport={canExport} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-slate-700 text-center mb-6">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No hay reportes disponibles para tu rol</p>
          </div>
        )}

        {/* Reportes Programados - Solo supervisor+ */}
        {(hasPermission('reportes', 'exportar')) && (
          <div className="mb-8">
            <button
              onClick={() => navigate('/reportes/programados')}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Reportes Programados</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configura el envio automatico de reportes por email</p>
              </div>
              <Eye className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          &copy; 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logistico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>
    </div>
  );
};

export default ReportesList;
