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

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { SnackbarProvider } from 'notistack';
import useNotification from './hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// PROVIDERS Y COMPONENTES DE AUTH
// ════════════════════════════════════════════════════════════════════════════
import { AlertProvider } from './context/AlertContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute, {
  AdminRoute,
  SupervisorRoute,
  OperadorRoute,
  ClienteRoute,
  PortalPermissionRoute
} from './components/auth/PrivateRoute';

// Layout
import FloatingHeader from './components/layout/FloatingHeader';
import ForceChangePasswordModal from './components/auth/ForceChangePasswordModal';
import GlobalSearch from './components/common/GlobalSearch';
import apiClient from './api/client';
import * as allEndpoints from './api/endpoints';

// ════════════════════════════════════════════════════════════════════════════
// LOADING COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <div className="text-center">
      {/* Logo animado */}
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-white font-bold text-2xl">IS</span>
      </div>
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-500">Cargando...</p>
    </div>
  </div>
);

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

// Inventario Entradas
const EntradasList = lazy(() => import('./pages/Inventario/Entradas/EntradasList'));
const EntradaAuditoria = lazy(() => import('./pages/Inventario/Entradas/EntradaAuditoria'));

// Inventario Salidas
const SalidasList = lazy(() => import('./pages/Inventario/Salidas/SalidasList'));
const SalidaAuditoria = lazy(() => import('./pages/Inventario/Salidas/SalidaAuditoria'));

// Inventario Kardex
const KardexList = lazy(() => import('./pages/Inventario/Kardex/KardexList'));
const KardexAuditoria = lazy(() => import('./pages/Inventario/Kardex/KardexAuditoria'));

// Reportes
const ReportesList = lazy(() => import('./pages/Reportes/ReportesList'));
const ReporteDespachos = lazy(() => import('./pages/Reportes/ReporteDespachos'));
const ReporteInventario = lazy(() => import('./pages/Reportes/ReporteInventario'));
const ReporteClientes = lazy(() => import('./pages/Reportes/ReporteClientes'));
const ReportesProgramados = lazy(() => import('./pages/Reportes/ReportesProgramados'));

// Plantillas de Email
const PlantillasEmailList = lazy(() => import('./pages/PlantillasEmail/PlantillasEmailList'));
const PlantillaEmailEditor = lazy(() => import('./pages/PlantillasEmail/PlantillaEmailEditor'));

// Perfil y Configuración
const PerfilUsuario = lazy(() => import('./pages/Perfil/PerfilUsuario'));
const Configuracion = lazy(() => import('./pages/Perfil/Configuracion'));
const Notificaciones = lazy(() => import('./pages/Perfil/Notificaciones'));

// Administración
const Administracion = lazy(() => import('./pages/Administracion'));

// Auditoría de Acciones
const AuditoriaAcciones = lazy(() => import('./pages/AuditoriaAcciones'));

// Módulo de Viajes
const VehiculosList = lazy(() => import('./pages/Viajes/VehiculosList'));
const CajaMenorList = lazy(() => import('./pages/Viajes/CajaMenorList'));
const CajaMenorDetail = lazy(() => import('./pages/Viajes/CajaMenorDetail'));
const ViajesList = lazy(() => import('./pages/Viajes/ViajesList'));
const ViajeForm = lazy(() => import('./pages/Viajes/ViajeForm'));
const ViajeDetail = lazy(() => import('./pages/Viajes/ViajeDetail'));
const MovimientosList = lazy(() => import('./pages/Viajes/MovimientosList'));

// ════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER PARA PÁGINAS EN DESARROLLO
// ════════════════════════════════════════════════════════════════════════════
const ComingSoon = ({ title }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <FloatingHeader />
    <div className="text-center">
      <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">🚧</span>
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">{title || 'Página no encontrada'}</h1>
      <p className="text-slate-500">Módulo en desarrollo</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT WRAPPER - Incluye Header en páginas protegidas
// ════════════════════════════════════════════════════════════════════════════
const SEARCH_ENDPOINTS = {
  INVENTARIO: allEndpoints.INVENTARIO_ENDPOINTS,
  CLIENTES: allEndpoints.CLIENTES_ENDPOINTS,
  AUDITORIAS: allEndpoints.AUDITORIAS_ENDPOINTS,
};

const ProtectedLayout = () => (
  <>
    <FloatingHeader />
    <ForceChangePasswordModal />
    <GlobalSearch apiClient={apiClient} endpoints={SEARCH_ENDPOINTS} />
    <Outlet />
  </>
);

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE NOTISTACK
// ════════════════════════════════════════════════════════════════════════════
const snackbarConfig = {
  maxSnack: 3,
  autoHideDuration: 4000,
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'center',
  },
  preventDuplicate: true,
  dense: false,
  style: { zIndex: 9999 },
};

// ════════════════════════════════════════════════════════════════════════════
// LISTENER GLOBAL DE PERMISOS DENEGADOS (403)
// ════════════════════════════════════════════════════════════════════════════
const PermissionDeniedListener = () => {
  const { warning } = useNotification();

  useEffect(() => {
    const handler = (e) => {
      warning(`🔒 ${e.detail?.message || 'No tienes permiso para realizar esta acción'}`, {
        autoHideDuration: 4000,
      });
    };
    window.addEventListener('istho:permission-denied', handler);
    return () => window.removeEventListener('istho:permission-denied', handler);
  }, [warning]);

  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
function App() {
  return (
    <BrowserRouter>
      {/* Provider de notificaciones toast */}
      <SnackbarProvider {...snackbarConfig}>
        {/* Listener global para 403 - Permission Denied */}
        <PermissionDeniedListener />
        {/* Provider de alertas personalizadas */}
        <AlertProvider>
          {/* Provider de autenticación */}
          <AuthProvider>
          <SocketProvider>
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
                {/* CLIENTES - Solo usuarios internos */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/clientes" element={<OperadorRoute><ClientesList /></OperadorRoute>} />
                <Route path="/clientes/:id" element={<OperadorRoute><ClienteDetail /></OperadorRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* INVENTARIO - Portal users need inventario.ver */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/inventario" element={<PortalPermissionRoute module="inventario" action="ver"><InventarioList /></PortalPermissionRoute>} />
                <Route path="/inventario/productos/:id" element={<PortalPermissionRoute module="inventario" action="ver"><ProductoDetail /></PortalPermissionRoute>} />
                <Route path="/inventario/alertas" element={<PortalPermissionRoute module="inventario" action="alertas"><AlertasInventario /></PortalPermissionRoute>} />

                <Route path="/inventario/entradas" element={<PortalPermissionRoute module="inventario" action="ver"><EntradasList /></PortalPermissionRoute>} />
                <Route path="/inventario/entradas/:id" element={<PortalPermissionRoute module="inventario" action="ver"><EntradaAuditoria /></PortalPermissionRoute>} />

                <Route path="/inventario/salidas" element={<PortalPermissionRoute module="inventario" action="ver"><SalidasList /></PortalPermissionRoute>} />
                <Route path="/inventario/salidas/:id" element={<PortalPermissionRoute module="inventario" action="ver"><SalidaAuditoria /></PortalPermissionRoute>} />

                <Route path="/inventario/kardex" element={<PortalPermissionRoute module="kardex" action="ver"><KardexList /></PortalPermissionRoute>} />
                <Route path="/inventario/kardex/:id" element={<PortalPermissionRoute module="kardex" action="ver"><KardexAuditoria /></PortalPermissionRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* REPORTES - Portal users need reportes.ver */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/reportes" element={<PortalPermissionRoute module="reportes" action="ver"><ReportesList /></PortalPermissionRoute>} />
                <Route path="/reportes/despachos" element={<PortalPermissionRoute module="reportes" action="ver"><ReporteDespachos /></PortalPermissionRoute>} />
                <Route path="/reportes/inventario" element={<PortalPermissionRoute module="reportes" action="ver"><ReporteInventario /></PortalPermissionRoute>} />
                <Route path="/reportes/clientes" element={<OperadorRoute><ReporteClientes /></OperadorRoute>} />
                <Route path="/reportes/programados" element={<SupervisorRoute><ReportesProgramados /></SupervisorRoute>} />
                <Route path="/reportes/operativo" element={<ReporteDespachos />} />
                <Route path="/reportes/kpis" element={<OperadorRoute><ReporteDespachos /></OperadorRoute>} />
                <Route path="/reportes/financiero" element={<OperadorRoute><ReporteClientes /></OperadorRoute>} />
                <Route path="/reportes/crear" element={<OperadorRoute><ReportesList /></OperadorRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* PLANTILLAS DE EMAIL */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/plantillas-email" element={<SupervisorRoute><PlantillasEmailList /></SupervisorRoute>} />
                <Route path="/plantillas-email/nueva" element={<SupervisorRoute><PlantillaEmailEditor /></SupervisorRoute>} />
                <Route path="/plantillas-email/:id" element={<SupervisorRoute><PlantillaEmailEditor /></SupervisorRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* ADMINISTRACIÓN - Solo admin */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/administracion" element={<AdminRoute><Administracion /></AdminRoute>} />
                <Route path="/auditoria-acciones" element={<AdminRoute><AuditoriaAcciones /></AdminRoute>} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* MÓDULO DE VIAJES */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/viajes/vehiculos" element={<VehiculosList />} />
                <Route path="/viajes/cajas-menores" element={<CajaMenorList />} />
                <Route path="/viajes/cajas-menores/:id" element={<CajaMenorDetail />} />
                <Route path="/viajes/viajes" element={<ViajesList />} />
                <Route path="/viajes/viajes/nuevo" element={<ViajeForm />} />
                <Route path="/viajes/viajes/:id" element={<ViajeDetail />} />
                <Route path="/viajes/viajes/:id/editar" element={<ViajeForm />} />
                <Route path="/viajes/movimientos" element={<MovimientosList />} />

                {/* ────────────────────────────────────────────────────────── */}
                {/* PERFIL Y CONFIGURACIÓN */}
                {/* ────────────────────────────────────────────────────────── */}
                <Route path="/perfil" element={<PerfilUsuario />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/notificaciones" element={<Notificaciones />} />
                <Route path="/alertas" element={<Notificaciones />} />
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
          </SocketProvider>
        </AuthProvider>
      </AlertProvider>
    </SnackbarProvider>
  </BrowserRouter>
  );
}

export default App;