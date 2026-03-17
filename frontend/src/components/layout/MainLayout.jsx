/**
 * ISTHO CRM - Main Layout Component
 * Layout principal con header flotante (sin sidebar en desktop)
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import FloatingHeader from './FloatingHeader';

const MainLayout = () => {
  const navigate = useNavigate();
  
  // Estados para modals/drawers
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Handlers
  const handleSearchClick = () => {
    setSearchOpen(true);
    // Implementar modal de búsqueda global
  };

  const handleNotificationClick = () => {
    setNotificationsOpen(true);
    // Implementar drawer de notificaciones
  };

  const handleReportesClick = () => {
    navigate('/reportes');
  };

  const handleProfileClick = () => {
    navigate('/configuracion/perfil');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Floating Header */}
      <FloatingHeader
        notificationCount={3}
        onSearchClick={handleSearchClick}
        onNotificationClick={handleNotificationClick}
        onReportesClick={handleReportesClick}
        onProfileClick={handleProfileClick}
      />

      {/* Main Content Area */}
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Outlet renderiza las rutas hijas */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;