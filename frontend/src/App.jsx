/**
 * ============================================================================
 * ISTHO CRM - App.jsx (Fase 5 - Integración Completa)
 * ============================================================================
 * Aplicación principal con:
 * - AuthProvider para estado global de autenticación
 * - SnackbarProvider para notificaciones toast
 * - Rutas protegidas por rol
 * - Lazy loading para mejor rendimiento
 * 
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Enero 2026
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, Component } from 'react';
import { SnackbarProvider } from 'notistack';
import useNotification from './hooks/useNotification';
import useIdleTimer from './hooks/useIdleTimer';

// ════════════════════════════════════════════════════════════════════════════
// PROVIDERS Y COMPONENTES DE AUTH
// ════════════════════════════════════════════════════════════════════════════
import { AlertProvider } from './context/AlertContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute, {
  AdminRoute,
  PermissionRoute
} from './components/auth/PrivateRoute';

// Layout
import { AlertTriangle, Wrench } from 'lucide-react';
import FloatingHeader from './components/layout/FloatingHeader';
import ForceChangePasswordModal from './components/auth/ForceChangePasswordModal';
import GlobalSearch from './components/common/GlobalSearch';
import IdleWarningModal from './components/common/IdleWarningModal';
import apiClient from './api/client';
import * as allEndpoints from './api/endpoints';

// ════════════════════════════════════════════════════════════════════════════
// LOADING COMPONENT
// ════════════════════════════════════════════════════════════════════════════
import LoadingScreen from './components/common/LoadingScreen';
const PageLoader = () => <LoadingScreen tipo="pagina" />;

// ════════════════════════════════════════════════════════════════════════════
// LAZY LOAD PAGES
// ════════════════════════════════════════════════════════════════════════════

// Auth (públicas)
const Login = lazy(() => import('./pages/Auth/Login'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const Unauthorized = lazy(() => import('./pages/Auth/Unauthorized'));

// Dashboard
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Clientes
const ClientesList = lazy(() => import('./pages/Clientes/ClientesList'));
const ClienteDetail = lazy(() => import('./pages/Clientes/ClienteDetail'));

// Inventario
const InventarioList = lazy(() => import('./pages/Inventario/InventarioList'));
const ProductoDetail = lazy(() => import('./pages/Inventario/ProductoDetail'));
const AlertasInventario = lazy(() => import('./pages/Inventario/AlertasInventario'));

// Operaciones (Entradas, Salidas, Kardex desde WMS)
const EntradasList = lazy(() => import('./pages/Inventario/Entradas/EntradasList'));
const EntradaAuditoria = lazy(() => import('./pages/Inventario/Entradas/EntradaAuditoria'));
const SalidasList = lazy(() => import('./pages/Inventario/Salidas/SalidasList'));
const SalidaAuditoria = lazy(() => import('./pages/Inventario/Salidas/SalidaAuditoria'));
const KardexList = lazy(() => import('./pages/Inventario/Kardex/KardexList'));
const KardexAuditoria = lazy(() => import('./pages/Inventario/Kardex/KardexAuditoria'));

// Reportes
const ReportesList = lazy(() => import('./pages/Reportes/ReportesList'));
const ReporteOperaciones = lazy(() => import('./pages/Reportes/ReporteOperaciones'));
const ReporteInventario = lazy(() => import('./pages/Reportes/ReporteInventario'));
const ReporteInventarioUbicacion = lazy(() => import('./pages/Reportes/ReporteInventarioUbicacion'));
const ReporteClientes = lazy(() => import('./pages/Reportes/ReporteClientes'));
const ReportesProgramados = lazy(() => import('./pages/Reportes/ReportesProgramados'));
const ReporteViajes = lazy(() => import('./pages/Reportes/ReporteViajes'));
const ReporteCajasMenores = lazy(() => import('./pages/Reportes/ReporteCajasMenores'));
const ReporteGastos = lazy(() => import('./pages/Reportes/ReporteGastos'));
const ReporteAverias = lazy(() => import('./pages/Reportes/ReporteAverias'));

// Plantillas de Email
const PlantillasEmailList = lazy(() => import('./pages/PlantillasEmail/PlantillasEmailList'));
const PlantillaEmailEditor = lazy(() => import('./pages/PlantillasEmail/PlantillaEmailEditor'));

// Perfil y Configuración
const PerfilUsuario = lazy(() => import('./pages/Perfil/PerfilUsuario'));
const Configuracion = lazy(() => import('./pages/Perfil/Configuracion'));
const ConfiguracionWms = lazy(() => import('./pages/Configuracion/ConfiguracionWms'));
const Notificaciones = lazy(() => import('./pages/Perfil/Notificaciones'));
const PreferenciasNotificaciones = lazy(() => import('./pages/Notificaciones/PreferenciasNotificaciones'));

// Administración
const Administracion = lazy(() => import('./pages/Administracion'));

// Auditoría de Acciones
const AuditoriaAcciones = lazy(() => import('./pages/AuditoriaAcciones'));

// WMS Dashboard
const WmsDashboard = lazy(() => import('./pages/WmsDashboard'));

// Módulo de Viajes
const VehiculosList = lazy(() => import('./pages/Viajes/VehiculosList'));
const CajaMenorList = lazy(() => import('./pages/Viajes/CajaMenorList'));
const CajaMenorDetail = lazy(() => import('./pages/Viajes/CajaMenorDetail'));
const ViajesList = lazy(() => import('./pages/Viajes/ViajesList'));
const ViajeForm = lazy(() => import('./pages/Viajes/ViajeForm'));
const ViajeDetail = lazy(() => import('./pages/Viajes/ViajeDetail'));
const MovimientosList = lazy(() => import('./pages/Viajes/MovimientosList'));

// ════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY - Captura crashes de componentes React
// ════════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-centhrix-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Algo salió mal</h1>
            <p className="text-slate-400 text-sm mb-6">
              Ocurrió un error inesperado. Por favor recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER PARA PÁGINAS EN DESARROLLO
// ════════════════════════════════════════════════════════════════════════════
const ComingSoon = ({ title }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <FloatingHeader />
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <Wrench className="w-9 h-9 text-slate-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">{title || 'Página no encontrada'}</h1>
      <p className="text-slate-500">Módulo en desarrollo</p>
    </div>
  </div>
);

// Redirect para portal clientes: /mi-empresa → /clientes/:cliente_id
const MiEmpresaRedirect = () => {
  const { user } = useAuth();
  if (user?.cliente_id) return <Navigate to={`/clientes/${user.cliente_id}`} replace />;
  return <Navigate to="/dashboard" replace />;
};

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT WRAPPER - Incluye Header en páginas protegidas
// ════════════════════════════════════════════════════════════════════════════
const SEARCH_ENDPOINTS = {
  INVENTARIO: allEndpoints.INVENTARIO_ENDPOINTS,
  CLIENTES: allEndpoints.CLIENTES_ENDPOINTS,
  AUDITORIAS: allEndpoints.AUDITORIAS_ENDPOINTS,
  VIAJES: allEndpoints.VIAJES_ENDPOINTS,
  VEHICULOS: allEndpoints.VEHICULOS_ENDPOINTS,
  CAJAS_MENORES: allEndpoints.CAJAS_MENORES_ENDPOINTS,
  MOVIMIENTOS: allEndpoints.MOVIMIENTOS_ENDPOINTS,
};

const ProtectedLayout = () => {
  const { mostrarAviso, extenderSesion } = useIdleTimer();
  return (
    <>
      <FloatingHeader />
      <ForceChangePasswordModal />
      <GlobalSearch apiClient={apiClient} endpoints={SEARCH_ENDPOINTS} />
      <IdleWarningModal isOpen={mostrarAviso} onExtender={extenderSesion} />
      <Outlet />
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE NOTISTACK
// ════════════════════════════════════════════════════════════════════════════
const snackbarConfig = {
  maxSnack: 3,
  autoHideDuration: 3000,
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'center',
  },
  preventDuplicate: true,
  dense: true,
  style: { zIndex: 99999 },
  classes: {
    containerRoot: 'notistack-SnackbarContainer',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// LISTENER GLOBAL DE PERMISOS DENEGADOS (403)
// ════════════════════════════════════════════════════════════════════════════
const PermissionDeniedListener = () => {
  const { warning } = useNotification();

  useEffect(() => {
    const handler = (e) => {
      warning(`${e.detail?.message || 'No tienes permiso para realizar esta acción'}`, {
        autoHideDuration: 4000,
      });
    };
    window.addEventListener('istho:permission-denied', handler);
    return () => window.removeEventListener('istho:permission-denied', handler);
  }, [warning]);

  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// SCROLL TO TOP EN CADA NAVEGACIÓN
// ════════════════════════════════════════════════════════════════════════════
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Provider de notificaciones toast */}
      <SnackbarProvider {...snackbarConfig}>
        {/* Listener global para 403 - Permission Denied */}
        <PermissionDeniedListener />
        {/* Provider de alertas personalizadas */}
        <AlertProvider>
          {/* Provider de autenticación */}
          <AuthProvider>
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ══════════════════════════════════════════════════════════ */}
              {/* RUTAS PÚBLICAS */}
              {/* ══════════════════════════════════════════════════════════ */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* RUTAS PROTEGIDAS - Requieren autenticación */}
              {/* ══════════════════════════════════════════════════════════ */}
              <Route element={
                <PrivateRoute>
                  <ProtectedLayout />
                </PrivateRoute>
              }>
                {/* Dashboard - Todos los roles */}
                <Route path="/dashboard" element={<Dashboard />} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* CLIENTES - Requiere permiso clientes.ver */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/clientes" element={<PermissionRoute module="clientes" action="ver"><ClientesList /></PermissionRoute>} />
                <Route path="/clientes/:id" element={<PermissionRoute module="clientes" action="ver"><ClienteDetail /></PermissionRoute>} />
                <Route path="/mi-empresa" element={<PermissionRoute module="clientes" action="ver"><MiEmpresaRedirect /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* INVENTARIO - Requiere inventario.ver (todos los roles) */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/inventario" element={<PermissionRoute module="inventario" action="ver"><InventarioList /></PermissionRoute>} />
                <Route path="/inventario/productos/:id" element={<PermissionRoute module="inventario" action="ver"><ProductoDetail /></PermissionRoute>} />
                <Route path="/inventario/alertas" element={<PermissionRoute module="inventario" action="alertas"><AlertasInventario /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* OPERACIONES - Entradas, Salidas y Kardex desde WMS */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/operaciones/entradas" element={<PermissionRoute module="operaciones" action="ver"><EntradasList /></PermissionRoute>} />
                <Route path="/operaciones/entradas/:id" element={<PermissionRoute module="operaciones" action="ver"><EntradaAuditoria /></PermissionRoute>} />
                <Route path="/operaciones/salidas" element={<PermissionRoute module="operaciones" action="ver"><SalidasList /></PermissionRoute>} />
                <Route path="/operaciones/salidas/:id" element={<PermissionRoute module="operaciones" action="ver"><SalidaAuditoria /></PermissionRoute>} />
                <Route path="/operaciones/kardex" element={<PermissionRoute module="operaciones" action="ver"><KardexList /></PermissionRoute>} />
                <Route path="/operaciones/kardex/:id" element={<PermissionRoute module="operaciones" action="ver"><KardexAuditoria /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* REPORTES - Requiere reportes.ver (todos los roles) */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/reportes" element={<PermissionRoute module="reportes" action="ver"><ReportesList /></PermissionRoute>} />
                <Route path="/reportes/operaciones" element={<PermissionRoute module="reportes" action="ver"><ReporteOperaciones /></PermissionRoute>} />
                <Route path="/reportes/inventario" element={<PermissionRoute module="reportes" action="ver"><ReporteInventario /></PermissionRoute>} />
                <Route path="/reportes/inventario-ubicacion" element={<PermissionRoute module="reportes" action="ver"><ReporteInventarioUbicacion /></PermissionRoute>} />
                <Route path="/reportes/clientes" element={<PermissionRoute module="reportes" action="ver"><ReporteClientes /></PermissionRoute>} />
                <Route path="/reportes/viajes" element={<PermissionRoute module="reportes" action="ver"><ReporteViajes /></PermissionRoute>} />
                <Route path="/reportes/cajas-menores" element={<PermissionRoute module="reportes" action="ver"><ReporteCajasMenores /></PermissionRoute>} />
                <Route path="/reportes/gastos" element={<PermissionRoute module="reportes" action="ver"><ReporteGastos /></PermissionRoute>} />
                <Route path="/reportes/programados" element={<PermissionRoute module="reportes" action="crear"><ReportesProgramados /></PermissionRoute>} />
                <Route path="/reportes/operativo" element={<PermissionRoute module="reportes" action="ver"><ReporteOperaciones /></PermissionRoute>} />
                <Route path="/reportes/kpis" element={<PermissionRoute module="reportes" action="ver"><ReporteOperaciones /></PermissionRoute>} />
                <Route path="/reportes/financiero" element={<PermissionRoute module="reportes" action="ver"><ReporteClientes /></PermissionRoute>} />
                <Route path="/reportes/averias" element={<PermissionRoute module="reportes" action="ver"><ReporteAverias /></PermissionRoute>} />
                <Route path="/reportes/crear" element={<PermissionRoute module="reportes" action="crear"><ReportesList /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* PLANTILLAS DE EMAIL */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/plantillas-email" element={<PermissionRoute module="plantillas_email" action="ver"><PlantillasEmailList /></PermissionRoute>} />
                <Route path="/plantillas-email/nueva" element={<PermissionRoute module="plantillas_email" action="crear"><PlantillaEmailEditor /></PermissionRoute>} />
                <Route path="/plantillas-email/:id" element={<PermissionRoute module="plantillas_email" action="editar"><PlantillaEmailEditor /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* ADMINISTRACIÓN - Solo admin */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/administracion" element={<AdminRoute><Administracion /></AdminRoute>} />
                <Route path="/auditoria-acciones" element={<AdminRoute><AuditoriaAcciones /></AdminRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* MÓDULO DE VIAJES */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/viajes/vehiculos" element={<PermissionRoute module="vehiculos" action="ver"><VehiculosList /></PermissionRoute>} />
                <Route path="/viajes/cajas-menores" element={<PermissionRoute module="caja_menor" action="ver"><CajaMenorList /></PermissionRoute>} />
                <Route path="/viajes/cajas-menores/:id" element={<PermissionRoute module="caja_menor" action="ver"><CajaMenorDetail /></PermissionRoute>} />
                <Route path="/viajes/viajes" element={<PermissionRoute module="viajes" action="ver"><ViajesList /></PermissionRoute>} />
                <Route path="/viajes/viajes/nuevo" element={<PermissionRoute module="viajes" action="crear"><ViajeForm /></PermissionRoute>} />
                <Route path="/viajes/viajes/:id" element={<PermissionRoute module="viajes" action="ver"><ViajeDetail /></PermissionRoute>} />
                <Route path="/viajes/viajes/:id/editar" element={<PermissionRoute module="viajes" action="editar"><ViajeForm /></PermissionRoute>} />
                <Route path="/viajes/movimientos" element={<PermissionRoute module="movimientos" action="ver"><MovimientosList /></PermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* PERFIL Y CONFIGURACIÓN */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/perfil" element={<PerfilUsuario />} />
                <Route path="/configuracion" element={<PermissionRoute module="perfil" action="ver"><Configuracion /></PermissionRoute>} />
                <Route path="/configuracion-wms" element={<AdminRoute><ConfiguracionWms /></AdminRoute>} />
                <Route path="/wms-dashboard" element={<AdminRoute><WmsDashboard /></AdminRoute>} />
                <Route path="/notificaciones" element={<PermissionRoute module="notificaciones" action="ver"><Notificaciones /></PermissionRoute>} />
                <Route path="/notificaciones/preferencias" element={<PermissionRoute module="notificaciones" action="ver"><PreferenciasNotificaciones /></PermissionRoute>} />
                <Route path="/alertas" element={<PermissionRoute module="notificaciones" action="ver"><Notificaciones /></PermissionRoute>} />
              </Route>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* REDIRECCIONES */}
              {/* ══════════════════════════════════════════════════════════ */}

              {/* Raíz redirige a login */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Acceso no autorizado */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* 404 - Página no encontrada */}
              <Route path="*" element={<ComingSoon title="Página no encontrada" />} />
            </Routes>
          </Suspense>
            </ErrorBoundary>
        </AuthProvider>
      </AlertProvider>
    </SnackbarProvider>
  </BrowserRouter>
  );
}

export default App;