/**
 * ISTHO CRM - Módulo de Administración
 *
 * Página principal con tabs para Usuarios y Roles.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

import { useState } from 'react';
import { Users, Shield, Settings } from 'lucide-react';
import UsuariosList from './UsuariosList';
import RolesList from './RolesList';

const TABS = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles y Permisos', icon: Shield },
];

const Administracion = () => {
  const [activeTab, setActiveTab] = useState('usuarios');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-orange-500" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                Administración
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestión de usuarios, roles y permisos del sistema
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'usuarios' && <UsuariosList />}
        {activeTab === 'roles' && <RolesList />}

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>
    </div>
  );
};

export default Administracion;
