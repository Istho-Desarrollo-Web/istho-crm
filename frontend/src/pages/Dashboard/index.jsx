/**
 * ISTHO CRM - Dashboard Page Router
 * Muestra dashboard diferente según el rol del usuario.
 * @author Coordinación TI ISTHO
 */

import { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';

const DashboardOperaciones = lazy(() => import('./Dashboard'));
const DashboardConductor = lazy(() => import('./DashboardConductor'));
const DashboardFinanciera = lazy(() => import('./DashboardFinanciera'));

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function DashboardRouter() {
  const { user } = useAuth();
  const rol = user?.rol;

  return (
    <Suspense fallback={<Loader />}>
      {rol === 'conductor' ? (
        <DashboardConductor />
      ) : rol === 'financiera' ? (
        <DashboardFinanciera />
      ) : (
        <DashboardOperaciones />
      )}
    </Suspense>
  );
}
