/**
 * ============================================================================
 * ISTHO CRM - Lista de Plantillas de Email
 * ============================================================================
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Star,
  ArrowLeft,
  RefreshCw,
  FileText,
  Truck,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';

import { Button, ConfirmDialog } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import plantillasEmailService from '../../api/plantillasEmail.service';
import { useAuth } from '../../context/AuthContext';

const TIPO_CONFIG = {
  operacion_cierre: {
    label: 'Cierre de Operación',
    icon: Truck,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600 dark:text-blue-400',
  },
  alerta_inventario: {
    label: 'Alerta de Inventario',
    icon: AlertTriangle,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    color: 'text-amber-600 dark:text-amber-400',
  },
  bienvenida: {
    label: 'Bienvenida',
    icon: UserPlus,
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  general: {
    label: 'General',
    icon: FileText,
    bg: 'bg-slate-100 dark:bg-slate-700',
    color: 'text-slate-600 dark:text-slate-300',
  },
};

const PlantillaCard = ({ plantilla, onEdit, onDelete, onPreview, canEdit, canDelete }) => {
  const config = TIPO_CONFIG[plantilla.tipo] || TIPO_CONFIG.general;
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{plantilla.nombre}</h3>
                {plantilla.es_predeterminada && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                {plantilla.subtipo && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                    {plantilla.subtipo === 'ingreso' ? 'Entrada' : plantilla.subtipo === 'salida' ? 'Salida' : plantilla.subtipo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!plantilla.activo && (
            <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
              Inactiva
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-mono truncate">
          {plantilla.asunto_template}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Eye} onClick={() => onPreview(plantilla)} className="flex-1">
            Vista Previa
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit(plantilla)}>
              Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(plantilla)} className="text-slate-400 hover:text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
};

const PlantillasEmailList = () => {
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('notificaciones', 'crear');
  const canEdit = hasPermission('notificaciones', 'editar');
  const canDelete = hasPermission('notificaciones', 'eliminar');

  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, plantilla: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, html: '', asunto: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await plantillasEmailService.getAll();
      if (response?.success) {
        setPlantillas(response.data || []);
      }
    } catch (err) {
      console.error('Error cargando plantillas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  const handlePreview = async (plantilla) => {
    try {
      const response = await plantillasEmailService.preview(plantilla.id);
      if (response?.success) {
        setPreviewModal({
          isOpen: true,
          html: response.data.cuerpo_html,
          asunto: response.data.asunto,
        });
      }
    } catch (err) {
      notifyError('Error al generar vista previa');
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await plantillasEmailService.delete(deleteModal.plantilla.id);
      success('Plantilla eliminada');
      setDeleteModal({ isOpen: false, plantilla: null });
      fetchPlantillas();
    } catch (err) {
      notifyError(err.message || 'Error al eliminar');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/configuracion')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Plantillas de Email</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las plantillas de correo electrónico del sistema</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" icon={RefreshCw} onClick={fetchPlantillas} disabled={loading}>
              Actualizar
            </Button>
            {canCreate && (
              <Button variant="primary" icon={Plus} onClick={() => navigate('/plantillas-email/nueva')}>
                Nueva Plantilla
              </Button>
            )}
          </div>
        </div>

        {/* GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : plantillas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 py-16 text-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">No hay plantillas</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Crea tu primera plantilla de correo</p>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/plantillas-email/nueva')}>
              Crear Plantilla
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plantillas.map((plantilla) => (
              <PlantillaCard
                key={plantilla.id}
                plantilla={plantilla}
                onEdit={(p) => navigate(`/plantillas-email/${p.id}`)}
                onDelete={(p) => setDeleteModal({ isOpen: true, plantilla: p })}
                onPreview={handlePreview}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno
        </footer>
      </main>

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, plantilla: null })}
        onConfirm={handleDelete}
        title="Eliminar Plantilla"
        message={`¿Estás seguro de eliminar la plantilla "${deleteModal.plantilla?.nombre}"?`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Vista Previa</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{previewModal.asunto}</p>
              </div>
              <button
                onClick={() => setPreviewModal({ isOpen: false, html: '', asunto: '' })}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6"
                dangerouslySetInnerHTML={{ __html: previewModal.html }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantillasEmailList;
