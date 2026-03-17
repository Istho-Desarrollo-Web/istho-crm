/**
 * ISTHO CRM - Reportes Programados
 * CRUD de reportes automáticos con cron
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Clock, Play, Trash2, Pencil, Mail,
  FileSpreadsheet, FileText, Loader2, CheckCircle, XCircle,
  Calendar, RefreshCw, X,
} from 'lucide-react';
import { useSnackbar } from 'notistack';
import reportesService from '../../api/reportes.service';

// ════════════════════════════════════════════════════════════════
// FRECUENCIAS PREDEFINIDAS
// ════════════════════════════════════════════════════════════════
const FRECUENCIAS = [
  { label: 'Diario a las 7:00 AM', cron: '0 7 * * *' },
  { label: 'Lunes a las 8:00 AM', cron: '0 8 * * 1' },
  { label: 'Lunes y Viernes a las 8:00 AM', cron: '0 8 * * 1,5' },
  { label: 'Primer día del mes a las 7:00 AM', cron: '0 7 1 * *' },
  { label: 'Cada 15 días (1 y 15) a las 7:00 AM', cron: '0 7 1,15 * *' },
];

const TIPOS = [
  { value: 'operaciones', label: 'Operaciones', icon: RefreshCw },
  { value: 'inventario', label: 'Inventario', icon: FileSpreadsheet },
  { value: 'clientes', label: 'Clientes', icon: Mail },
];

// ════════════════════════════════════════════════════════════════
// MODAL CREAR/EDITAR
// ════════════════════════════════════════════════════════════════
const FormModal = ({ isOpen, onClose, onSave, reporte, loading }) => {
  const [form, setForm] = useState({
    nombre: '',
    tipo_reporte: 'operaciones',
    formato: 'excel',
    frecuencia_idx: 0,
    cron_expresion: FRECUENCIAS[0].cron,
    frecuencia_label: FRECUENCIAS[0].label,
    destinatarios: '',
  });

  useEffect(() => {
    if (reporte) {
      const freqIdx = FRECUENCIAS.findIndex(f => f.cron === reporte.cron_expresion);
      setForm({
        nombre: reporte.nombre || '',
        tipo_reporte: reporte.tipo_reporte || 'operaciones',
        formato: reporte.formato || 'excel',
        frecuencia_idx: freqIdx >= 0 ? freqIdx : 0,
        cron_expresion: reporte.cron_expresion || FRECUENCIAS[0].cron,
        frecuencia_label: reporte.frecuencia_label || FRECUENCIAS[0].label,
        destinatarios: reporte.destinatarios || '',
      });
    } else {
      setForm({
        nombre: '', tipo_reporte: 'operaciones', formato: 'excel',
        frecuencia_idx: 0, cron_expresion: FRECUENCIAS[0].cron,
        frecuencia_label: FRECUENCIAS[0].label, destinatarios: '',
      });
    }
  }, [reporte, isOpen]);

  if (!isOpen) return null;

  const handleFreqChange = (idx) => {
    setForm(prev => ({
      ...prev,
      frecuencia_idx: idx,
      cron_expresion: FRECUENCIAS[idx].cron,
      frecuencia_label: FRECUENCIAS[idx].label,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      nombre: form.nombre,
      tipo_reporte: form.tipo_reporte,
      formato: form.formato,
      cron_expresion: form.cron_expresion,
      frecuencia_label: form.frecuencia_label,
      destinatarios: form.destinatarios,
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            {reporte ? 'Editar Reporte Programado' : 'Nuevo Reporte Programado'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
            <input type="text" value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Reporte semanal de inventario" className={inputCls} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Reporte</label>
              <select value={form.tipo_reporte} onChange={(e) => setForm(p => ({ ...p, tipo_reporte: e.target.value }))} className={inputCls}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato</label>
              <select value={form.formato} onChange={(e) => setForm(p => ({ ...p, formato: e.target.value }))} className={inputCls}>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
                <option value="ambos">Excel + PDF</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frecuencia</label>
            <div className="space-y-2">
              {FRECUENCIAS.map((f, idx) => (
                <label key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  form.frecuencia_idx === idx
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                }`}>
                  <input type="radio" checked={form.frecuencia_idx === idx} onChange={() => handleFreqChange(idx)} className="hidden" />
                  <Clock className={`w-4 h-4 ${form.frecuencia_idx === idx ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span className={`text-sm ${form.frecuencia_idx === idx ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                    {f.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destinatarios</label>
            <input type="text" value={form.destinatarios} onChange={(e) => setForm(p => ({ ...p, destinatarios: e.target.value }))}
              placeholder="correo@ejemplo.com, otro@ejemplo.com" className={inputCls} required />
            <p className="text-xs text-slate-400 mt-1">Separa varios emails con coma</p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.nombre || !form.destinatarios}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {reporte ? 'Guardar Cambios' : 'Crear Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
const ReportesProgramados = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState({ open: false, reporte: null });
  const [formLoading, setFormLoading] = useState(false);
  const [executing, setExecuting] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportesService.getProgramados();
      setReportes(res?.data || []);
    } catch { setReportes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data) => {
    setFormLoading(true);
    try {
      if (formModal.reporte) {
        await reportesService.actualizarProgramado(formModal.reporte.id, data);
        enqueueSnackbar('Reporte programado actualizado', { variant: 'success' });
      } else {
        await reportesService.crearProgramado(data);
        enqueueSnackbar('Reporte programado creado', { variant: 'success' });
      }
      setFormModal({ open: false, reporte: null });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.message || 'Error al guardar', { variant: 'error' });
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este reporte programado?')) return;
    try {
      await reportesService.eliminarProgramado(id);
      enqueueSnackbar('Reporte eliminado', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.message || 'Error al eliminar', { variant: 'error' });
    }
  };

  const handleToggle = async (reporte) => {
    try {
      await reportesService.actualizarProgramado(reporte.id, { activo: !reporte.activo });
      enqueueSnackbar(reporte.activo ? 'Reporte pausado' : 'Reporte activado', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.message || 'Error', { variant: 'error' });
    }
  };

  const handleExecute = async (id) => {
    setExecuting(id);
    try {
      const res = await reportesService.ejecutarProgramado(id);
      enqueueSnackbar(res?.message || 'Reporte enviado', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.message || 'Error al ejecutar', { variant: 'error' });
    } finally { setExecuting(null); }
  };

  const tipoLabel = { operaciones: 'Operaciones', inventario: 'Inventario', clientes: 'Clientes' };
  const tipoColor = { operaciones: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', inventario: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', clientes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reportes Programados</h1>
                <p className="text-slate-500 dark:text-slate-400">Envío automático de reportes por email</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFormModal({ open: true, reporte: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Programado
          </button>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Cargando reportes programados...</p>
            </div>
          ) : reportes.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">Sin reportes programados</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Crea tu primer reporte automático</p>
              <button
                onClick={() => setFormModal({ open: true, reporte: null })}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Crear Reporte Programado
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {reportes.map((r) => (
                <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate">{r.nombre}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tipoColor[r.tipo_reporte] || ''}`}>
                        {tipoLabel[r.tipo_reporte] || r.tipo_reporte}
                      </span>
                      {(r.formato === 'ambos' ? ['excel', 'pdf'] : [r.formato || 'excel']).map(fmt => (
                        <span key={fmt} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          fmt === 'excel'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {fmt === 'excel' ? <FileSpreadsheet className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {fmt.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.frecuencia_label || r.cron_expresion}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {r.destinatarios?.split(',').length || 0} destinatario(s)
                      </span>
                      {r.ultima_ejecucion && (
                        <span>Último envío: {new Date(r.ultima_ejecucion).toLocaleDateString('es-CO')}</span>
                      )}
                    </div>
                  </div>

                  {/* Estado */}
                  <button
                    onClick={() => handleToggle(r)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      r.activo
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {r.activo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.activo ? 'Activo' : 'Pausado'}
                  </button>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExecute(r.id)}
                      disabled={executing === r.id}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="Ejecutar ahora"
                    >
                      {executing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setFormModal({ open: true, reporte: r })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <FormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, reporte: null })}
        onSave={handleSave}
        reporte={formModal.reporte}
        loading={formLoading}
      />
    </div>
  );
};

export default ReportesProgramados;
