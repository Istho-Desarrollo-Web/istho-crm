/**
 * ISTHO CRM - ReportesList Page
 * Dashboard principal de reportes con acceso a diferentes tipos
 *
 * @author Coordinación TI ISTHO
 * @date Marzo 2026
 */

import { useNavigate } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  Package,
  Users,
  Truck,
  Download,
  Calendar,
  Activity,
  Eye,
} from 'lucide-react';

// Components
import { Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

// ============================================
// REPORTES DISPONIBLES (Configuración UI)
// ============================================
const REPORTES_DISPONIBLES = [
  {
    id: 'despachos',
    titulo: 'Reporte de Despachos',
    descripcion: 'Análisis de operaciones de ingreso y salida del WMS',
    icon: Truck,
    color: 'bg-blue-500',
    exportEndpoints: { excel: '/reportes/operaciones/excel', pdf: '/reportes/operaciones/pdf' },
  },
  {
    id: 'inventario',
    titulo: 'Reporte de Inventario',
    descripcion: 'Estado del inventario, stock y valorización por cliente',
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

// ============================================
// REPORTE CARD
// ============================================
const ReporteCard = ({ reporte, canExport }) => {
  const navigate = useNavigate();
  const Icon = reporte.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${reporte.color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{reporte.titulo}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{reporte.descripcion}</p>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          icon={Eye}
          onClick={() => navigate(`/reportes/${reporte.id}`)}
          fullWidth
        >
          Ver Reporte
        </Button>
        {canExport && reporte.exportEndpoints?.excel && (
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => {
              const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
              const token = localStorage.getItem('istho_token');
              window.open(`${baseUrl}${reporte.exportEndpoints.excel}?token=${token}`, '_blank');
            }}
          >
            Excel
          </Button>
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
  const { hasPermission, isCliente } = useAuth();
  // Portal clients use 'descargar', internal roles use 'exportar'
  const canExport = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reportes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Genera y exporta reportes de gestión
            </p>
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
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{REPORTES_DISPONIBLES.length}</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Formatos de exportación</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {REPORTES_DISPONIBLES.map((reporte) => (
            <ReporteCard key={reporte.id} reporte={reporte} canExport={canExport} />
          ))}
        </div>

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
                <p className="text-sm text-slate-500 dark:text-slate-400">Configura el envío automático de reportes por email</p>
              </div>
              <Eye className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>
    </div>
  );
};

export default ReportesList;
