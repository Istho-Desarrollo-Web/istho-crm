/**
 * ============================================================================
 * ISTHO CRM - Gestión de Permisos Usuario Cliente
 * ============================================================================
 * Modal para configurar los permisos específicos de un usuario cliente.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Package,
  Truck,
  BarChart3,
  FileText,
  User,
  Check,
  X,
  AlertCircle,
  Eye,
  Download,
  Bell,
  PlusCircle,
  Lock,
  Edit,
} from 'lucide-react';

// Components
import { Modal, Button } from '../../../components/common';

// ════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PERMISOS
// ════════════════════════════════════════════════════════════════════════════

const CATALOGO_PERMISOS = {
  inventario: {
    nombre: 'Inventario',
    descripcion: 'Gestión del inventario de productos',
    icon: Package,
    color: 'blue',
    permisos: [
      { 
        codigo: 'ver', 
        nombre: 'Ver inventario', 
        descripcion: 'Permite ver el inventario de productos',
        icon: Eye
      },
      { 
        codigo: 'exportar', 
        nombre: 'Exportar inventario', 
        descripcion: 'Permite exportar el inventario a Excel/PDF',
        icon: Download
      },
      { 
        codigo: 'alertas', 
        nombre: 'Ver alertas de stock', 
        descripcion: 'Permite ver alertas de stock bajo y vencimientos',
        icon: Bell
      }
    ]
  },
  despachos: {
    nombre: 'Despachos',
    descripcion: 'Operaciones de ingreso y salida',
    icon: Truck,
    color: 'emerald',
    permisos: [
      { 
        codigo: 'ver', 
        nombre: 'Ver despachos', 
        descripcion: 'Permite ver las operaciones de ingreso/salida',
        icon: Eye
      },
      { 
        codigo: 'crear_solicitud', 
        nombre: 'Crear solicitudes', 
        descripcion: 'Permite crear solicitudes de despacho',
        icon: PlusCircle
      },
      { 
        codigo: 'descargar_documentos', 
        nombre: 'Descargar documentos', 
        descripcion: 'Permite descargar cumplidos y documentos',
        icon: Download
      }
    ]
  },
  reportes: {
    nombre: 'Reportes',
    descripcion: 'Informes y estadísticas',
    icon: BarChart3,
    color: 'violet',
    permisos: [
      { 
        codigo: 'ver', 
        nombre: 'Ver reportes', 
        descripcion: 'Permite ver reportes y estadísticas',
        icon: Eye
      },
      { 
        codigo: 'descargar', 
        nombre: 'Descargar reportes', 
        descripcion: 'Permite descargar reportes en PDF/Excel',
        icon: Download
      }
    ]
  },
  facturacion: {
    nombre: 'Facturación',
    descripcion: 'Facturas y estado de cuenta',
    icon: FileText,
    color: 'amber',
    permisos: [
      { 
        codigo: 'ver', 
        nombre: 'Ver facturación', 
        descripcion: 'Permite ver facturas y estado de cuenta',
        icon: Eye
      },
      { 
        codigo: 'descargar', 
        nombre: 'Descargar facturas', 
        descripcion: 'Permite descargar facturas en PDF',
        icon: Download
      }
    ]
  },
  perfil: {
    nombre: 'Perfil',
    descripcion: 'Configuración de cuenta',
    icon: User,
    color: 'slate',
    permisos: [
      { 
        codigo: 'editar', 
        nombre: 'Editar perfil', 
        descripcion: 'Permite editar su información de perfil',
        icon: Edit
      },
      { 
        codigo: 'cambiar_password', 
        nombre: 'Cambiar contraseña', 
        descripcion: 'Permite cambiar su contraseña',
        icon: Lock
      }
    ]
  }
};

const PERMISOS_DEFAULT = {
  inventario: { ver: true, exportar: false, alertas: true },
  despachos: { ver: true, crear_solicitud: false, descargar_documentos: true },
  reportes: { ver: true, descargar: false },
  facturacion: { ver: true, descargar: true },
  perfil: { editar: true, cambiar_password: true }
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE MÓDULO DE PERMISOS
// ════════════════════════════════════════════════════════════════════════════

const ModuloPermisos = ({ 
  moduloKey, 
  modulo, 
  permisos, 
  onChange, 
  expanded, 
  onToggleExpand 
}) => {
  const Icon = modulo.icon;
  
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
  };
  
  const permisosActivos = Object.values(permisos || {}).filter(v => v).length;
  const totalPermisos = modulo.permisos.length;
  
  const handleToggleAll = (value) => {
    const newPermisos = {};
    modulo.permisos.forEach(p => {
      newPermisos[p.codigo] = value;
    });
    onChange(moduloKey, newPermisos);
  };
  
  const handleTogglePermiso = (codigo) => {
    onChange(moduloKey, {
      ...permisos,
      [codigo]: !permisos?.[codigo]
    });
  };
  
  return (
    <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header del módulo */}
      <div
        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[modulo.color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-slate-800 dark:text-slate-100">{modulo.nombre}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{modulo.descripcion}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${
            permisosActivos === totalPermisos ? 'text-emerald-600' : 
            permisosActivos > 0 ? 'text-amber-600' : 'text-slate-400'
          }`}>
            {permisosActivos}/{totalPermisos}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleAll(true); }}
            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Activar todos"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleAll(false); }}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Desactivar todos"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Lista de permisos (expandible) */}
      {expanded && (
        <div className="p-4 space-y-2 bg-white dark:bg-slate-800/50">
          {modulo.permisos.map((permiso) => {
            const PermisoIcon = permiso.icon;
            const activo = permisos?.[permiso.codigo] || false;

            return (
              <label
                key={permiso.codigo}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  activo
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${
                  activo
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500'
                }`}>
                  {activo && <Check className="w-3 h-3 text-white" />}
                </div>
                
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => handleTogglePermiso(permiso.codigo)}
                  className="sr-only"
                />
                
                <PermisoIcon className={`w-4 h-4 ${activo ? 'text-emerald-600' : 'text-slate-400'}`} />
                
                <div className="flex-1">
                  <p className={`text-sm font-medium ${activo ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                    {permiso.nombre}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{permiso.descripcion}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const UsuarioClientePermisos = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  usuario = null 
}) => {
  const [permisos, setPermisos] = useState(PERMISOS_DEFAULT);
  const [expandedModulos, setExpandedModulos] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (isOpen && usuario) {
      // Normalizar permisos: solo incluir módulos/acciones del catálogo
      // MySQL puede devolver JSON como string, parsear si es necesario
      let rawValue = usuario.permisos_cliente;
      if (typeof rawValue === 'string') {
        try { rawValue = JSON.parse(rawValue); } catch { rawValue = null; }
      }
      const raw = rawValue || PERMISOS_DEFAULT;
      const normalized = {};
      Object.entries(CATALOGO_PERMISOS).forEach(([moduloKey, modulo]) => {
        normalized[moduloKey] = {};
        modulo.permisos.forEach(p => {
          normalized[moduloKey][p.codigo] = raw[moduloKey]?.[p.codigo] === true;
        });
      });
      setPermisos(normalized);
      // Expandir todos los módulos por defecto
      const expanded = {};
      Object.keys(CATALOGO_PERMISOS).forEach(key => {
        expanded[key] = true;
      });
      setExpandedModulos(expanded);
      setHasChanges(false);
    }
  }, [isOpen, usuario]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleModuloChange = (moduloKey, newPermisos) => {
    setPermisos(prev => ({
      ...prev,
      [moduloKey]: newPermisos
    }));
    setHasChanges(true);
  };
  
  const toggleExpand = (moduloKey) => {
    setExpandedModulos(prev => ({
      ...prev,
      [moduloKey]: !prev[moduloKey]
    }));
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(permisos);
    } catch (err) {
      // Error manejado por componente padre
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = () => {
    setPermisos(PERMISOS_DEFAULT);
    setHasChanges(true);
  };
  
  const handleActivarTodos = () => {
    const todosActivos = {};
    Object.keys(CATALOGO_PERMISOS).forEach(moduloKey => {
      todosActivos[moduloKey] = {};
      CATALOGO_PERMISOS[moduloKey].permisos.forEach(p => {
        todosActivos[moduloKey][p.codigo] = true;
      });
    });
    setPermisos(todosActivos);
    setHasChanges(true);
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ──────────────────────────────────────────────────────────────────────────
  
  const totalPermisos = Object.values(CATALOGO_PERMISOS).reduce(
    (sum, m) => sum + m.permisos.length, 0
  );

  // Solo contar permisos que existen en el catálogo (evita contar keys extra de la BD)
  const permisosActivos = Object.entries(CATALOGO_PERMISOS).reduce((sum, [moduloKey, modulo]) => {
    const moduloPermisos = permisos[moduloKey] || {};
    return sum + modulo.permisos.filter(p => moduloPermisos[p.codigo] === true).length;
  }, 0);
  
  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  
  if (!usuario) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar Permisos"
      size="lg"
    >
      <div className="space-y-5">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER INFO */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
              {usuario.nombre_completo?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100">{usuario.nombre_completo}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{usuario.email}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Permisos activos</p>
            <p className={`text-xl font-bold ${
              permisosActivos === totalPermisos ? 'text-emerald-600' : 
              permisosActivos > totalPermisos / 2 ? 'text-amber-600' : 'text-slate-600'
            }`}>
              {permisosActivos} / {totalPermisos}
            </p>
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ACCIONES RÁPIDAS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Configura los permisos de acceso al portal
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Restaurar predeterminados
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleActivarTodos}
            >
              Activar todos
            </Button>
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* LISTA DE MÓDULOS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(CATALOGO_PERMISOS).map(([key, modulo]) => (
            <ModuloPermisos
              key={key}
              moduloKey={key}
              modulo={modulo}
              permisos={permisos[key]}
              onChange={handleModuloChange}
              expanded={expandedModulos[key]}
              onToggleExpand={() => toggleExpand(key)}
            />
          ))}
        </div>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* NOTA INFORMATIVA */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">Nota importante</p>
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                Los cambios en los permisos se aplicarán inmediatamente. 
                El usuario verá los cambios en su próxima carga de página.
              </p>
            </div>
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ACCIONES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!hasChanges}
          >
            Guardar Permisos
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UsuarioClientePermisos;