/**
 * ISTHO CRM - Entry Point
 * Punto de entrada de la aplicación
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import { NotificacionesProvider } from './context/NotificacionesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppThemeProvider>
        <NotificacionesProvider>
          <App />
        </NotificacionesProvider>
      </AppThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
);