/**
 * ISTHO CRM - Reportes Programados
 * CRUD de reportes automáticos con cron
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Clock,
  Play,
  Trash2,
  Pencil,
  Mail,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  RefreshCw,
  X,
  Filter,
  Users,
} from 'lucide-react';
import { useSnackbar } from 'notistack';
import { FilterDropdown } from '../../components/common';
import reportesService from '../../api/reportes.service';
import clientesService from '../../api/clientes.service';
import { formatDateShort } from '../../utils/formatDate';

// ════════════════════════════════════════════════════════════════
// CONSTANTES
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
  { value: 'viajes', label: 'Viajes', icon: RefreshCw },
  { value: 'cajas_menores', label: 'Cajas Menores', icon: FileSpreadsheet },
  { value: 'gastos', label: 'Gastos / Movimientos', icon: FileSpreadsheet },
  { value: 'inventario_ubicacion', label: 'Inventario por Ubicación', icon: FileSpreadsheet },
];

// Tipos que admiten filtro por cliente
const TIPOS_CON_CLIENTE = ['operaciones', 'inventario', 'inventario_ubicacion'];

// Filtros disponibles por tipo de reporte
const FILTROS_POR_TIPO = {
  operaciones: [
    {
      key: 'tipo',
      label: 'Tipo de operación',
      options: [
        { value: '', label: 'Todos los tipos' },
        { value: 'entrada', label: 'Entradas' },
        { value: 'salida', label: 'Salidas' },
        { value: 'kardex', label: 'Kardex' },
      ],
    },
    {
      key: 'estado',
      label: 'Estado',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'en_proceso', label: 'En proceso' },
        { value: 'cerrado', label: 'Cerrado' },
        { value: 'anulado', label: 'Anulado' },
      ],
    },
  ],
  viajes: [
    {
      key: 'estado',
      label: 'Estado',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'en_proceso', label: 'En proceso' },
        { value: 'completado', label: 'Completado' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
  ],
  cajas_menores: [
    {
      key: 'estado',
      label: 'Estado',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'abierta', label: 'Abierta' },
        { value: 'cerrada', label: 'Cerrada' },
        { value: 'arqueo', label: 'En arqueo' },
      ],
    },
  ],
  gastos: [
    {
      key: 'estado',
      label: 'Estado',
      options: [
        { value: '', label: 'Todos los estados' },
        { value: 'aprobado', label: 'Aprobado' },
        { value: 'rechazado', label: 'Rechazado' },
        { value: 'pendiente', label: 'Pendiente' },
      ],
    },
  ],
  inventario: [],
  clientes: [],
  inventario_ubicacion: [],
};

// Etiquetas legibles para los valores de filtros
const FILTRO_LABELS = {
  tipo: { entrada: 'Entradas', salida: 'Salidas', kardex: 'Kardex' },
  estado: {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    cerrado: 'Cerrado',
    anulado: 'Anulado',
    completado: 'Completado',
    cancelado: 'Cancelado',
    abierta: 'Abierta',
    cerrada: 'Cerrada',
    arqueo: 'En arqueo',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
  },
};

// ════════════════════════════════════════════════════════════════
// MODAL CONFIRMAR ELIMINACIÓN
// ════════════════════════════════════════════════════════════════
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-sm w-full p-6 animate-zoomIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Eliminar reporte</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          ¿Estás seguro de que deseas eliminar este reporte programado? Se cancelará el envío automático.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MODAL CREAR/EDITAR
// ════════════════════════════════════════════════════════════════
const FORM_DEFAULT = {
  nombre: '',
  tipo_reporte: 'operaciones',
  formato: 'excel',
  frecuencia_idx: 0,
  cron_expresion: FRECUENCIAS[0].cron,
  frecuencia_label: FRECUENCIAS[0].label,
  destinatarios: '',
  filtros: {},
};

const FormModal = ({ isOpen, onClose, onSave, reporte, loading }) => {
  const [form, setForm] = useState(FORM_DEFAULT);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    clientesService.getAll({ limit: 500, estado: 'activo' }).then((res) => {
      setClientes(Array.isArray(res?.data) ? res.data : (res?.data?.rows || []));
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (reporte) {
      const freqIdx = FRECUENCIAS.findIndex((f) => f.cron === reporte.cron_expresion);
      // filtros puede llegar como string si fue serializado incorrectamente en versiones previas
      let filtros = reporte.filtros;
      if (typeof filtros === 'string') {
        try { filtros = JSON.parse(filtros); } catch { filtros = {}; }
      }
      setForm({
        nombre: reporte.nombre || '',
        tipo_reporte: reporte.tipo_reporte || 'operaciones',
        formato: reporte.formato || 'excel',
        frecuencia_idx: freqIdx >= 0 ? freqIdx : 0,
        cron_expresion: reporte.cron_expresion || FRECUENCIAS[0].cron,
        frecuencia_label: reporte.frecuencia_label || FRECUENCIAS[0].label,
        destinatarios: reporte.destinatarios || '',
        filtros: (() => {
          if (!filtros || typeof filtros !== 'object') return {};
          // Normalizar cliente_id a string para que coincida con los options del FilterDropdown
          return filtros.cliente_id !== undefined
            ? { ...filtros, cliente_id: String(filtros.cliente_id) }
            : filtros;
        })(),
      });
    } else {
      setForm(FORM_DEFAULT);
    }
  }, [reporte, isOpen]);

  if (!isOpen) return null;

  const handleFreqChange = (idx) => {
    setForm((prev) => ({
      ...prev,
      frecuencia_idx: idx,
      cron_expresion: FRECUENCIAS[idx].cron,
      frecuencia_label: FRECUENCIAS[idx].label,
    }));
  };

  const handleTipoChange = (v) => {
    setForm((prev) => ({ ...prev, tipo_reporte: v, filtros: {} }));
  };

  const handleFiltroChange = (key, value) => {
    setForm((prev) => {
      const filtros = { ...prev.filtros };
      if (value) {
        filtros[key] = value;
      } else {
        delete filtros[key];
      }
      return { ...prev, filtros };
    });
  };

  const handleClienteFilterChange = (clienteId) => {
    setForm((prev) => {
      const filtros = { ...prev.filtros };
      if (clienteId) {
        const cliente = clientes.find((c) => String(c.id) === clienteId);
        filtros.cliente_id = clienteId;
        filtros.cliente_nombre = cliente?.razon_social || '';
      } else {
        delete filtros.cliente_id;
        delete filtros.cliente_nombre;
      }
      return { ...prev, filtros };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const filtrosLimpios = Object.keys(form.filtros).length > 0 ? form.filtros : null;
    onSave({
      nombre: form.nombre,
      tipo_reporte: form.tipo_reporte,
      formato: form.formato,
      cron_expresion: form.cron_expresion,
      frecuencia_label: form.frecuencia_label,
      destinatarios: form.destinatarios,
      filtros: filtrosLimpios,
      // Sincronizar columna cliente_id dedicada (integer FK) — más confiable que filtros JSON
      cliente_id: filtrosLimpios?.cliente_id ? Number(filtrosLimpios.cliente_id) : null,
    });
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';

  const filtrosDisponibles = FILTROS_POR_TIPO[form.tipo_reporte] || [];
  const conFiltroCliente = TIPOS_CON_CLIENTE.includes(form.tipo_reporte);
  const totalFiltros = filtrosDisponibles.length + (conFiltroCliente ? 1 : 0);
  const clienteOpts = [
    { value: '', label: 'Todos los clientes' },
    ...clientes.map((c) => ({ value: String(c.id), label: c.razon_social })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            {reporte ? 'Editar Reporte Programado' : 'Nuevo Reporte Programado'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Reporte semanal de inventario"
              className={inputCls}
              required
            />
          </div>

          {/* Tipo y formato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Reporte
              </label>
              <FilterDropdown
                options={TIPOS}
                value={form.tipo_reporte}
                onChange={handleTipoChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Formato
              </label>
              <FilterDropdown
                options={[
                  { value: 'excel', label: 'Excel' },
                  { value: 'pdf', label: 'PDF' },
                  { value: 'ambos', label: 'Excel + PDF' },
                ]}
                value={form.formato}
                onChange={(v) => setForm((p) => ({ ...p, formato: v }))}
              />
            </div>
          </div>

          {/* Filtros dinámicos según tipo */}
          {totalFiltros > 0 && (
            <div className="bg-slate-50 dark:bg-centhrix-surface/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Filtros del reporte
                </span>
                <span className="text-xs text-slate-400">(opcional)</span>
              </div>
              <div className={`grid gap-3 ${totalFiltros > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {conFiltroCliente && (
                  <div key="cliente_id">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Cliente
                    </label>
                    <FilterDropdown
                      options={clienteOpts}
                      value={form.filtros.cliente_id || ''}
                      onChange={handleClienteFilterChange}
                    />
                  </div>
                )}
                {filtrosDisponibles.map((filtro) => (
                  <div key={filtro.key}>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {filtro.label}
                    </label>
                    <FilterDropdown
                      options={filtro.options}
                      value={form.filtros[filtro.key] || ''}
                      onChange={(v) => handleFiltroChange(filtro.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Frecuencia
            </label>
            <div className="space-y-2">
              {FRECUENCIAS.map((f, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    form.frecuencia_idx === idx
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={form.frecuencia_idx === idx}
                    onChange={() => handleFreqChange(idx)}
                    className="hidden"
                  />
                  <Clock
                    className={`w-4 h-4 ${form.frecuencia_idx === idx ? 'text-orange-500' : 'text-slate-400'}`}
                  />
                  <span
                    className={`text-sm ${form.frecuencia_idx === idx ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {f.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Destinatarios */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destinatarios
            </label>
            <input
              type="text"
              value={form.destinatarios}
              onChange={(e) => setForm((p) => ({ ...p, destinatarios: e.target.value }))}
              placeholder="correo@ejemplo.com, otro@ejemplo.com"
              className={inputCls}
              required
            />
            <p className="text-xs text-slate-400 mt-1">Separa varios emails con coma</p>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.nombre || !form.destinatarios}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 flex items-center gap-2"
            >
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportesService.getProgramados();
      setReportes(res?.data || []);
    } catch {
      setReportes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
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
      enqueueSnackbar(reporte.activo ? 'Reporte pausado' : 'Reporte activado', {
        variant: 'success',
      });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.message || 'Error al cambiar estado del reporte', { variant: 'error' });
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
    } finally {
      setExecuting(null);
    }
  };

  const tipoLabel = {
    operaciones: 'Operaciones',
    inventario: 'Inventario',
    inventario_ubicacion: 'Inv. Ubicación',
    clientes: 'Clientes',
    viajes: 'Viajes',
    cajas_menores: 'Cajas Menores',
    gastos: 'Gastos',
  };
  const tipoColor = {
    operaciones: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    inventario: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    clientes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    viajes: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    cajas_menores: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    gastos: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    inventario_ubicacion: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  };

  // Genera resumen legible de filtros activos de un reporte
  const getFiltrosBadges = (r) => {
    // filtros puede ser string si fue serializado incorrectamente en BD
    let filtros = r.filtros;
    if (typeof filtros === 'string') {
      try { filtros = JSON.parse(filtros); } catch { filtros = null; }
    }
    if (!filtros || typeof filtros !== 'object' || Object.keys(filtros).length === 0) return null;
    return Object.entries(filtros).map(([key, value]) => {
      if (key === 'cliente_nombre') return null;
      if (key === 'cliente_id') {
        const nombre = filtros.cliente_nombre || r.cliente?.razon_social || value;
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-700"
          >
            <Users className="w-2.5 h-2.5" />
            {nombre}
          </span>
        );
      }
      if (typeof value !== 'string' && typeof value !== 'number') return null;
      const label = FILTRO_LABELS[key]?.[value] || String(value);
      return (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-centhrix-surface text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
        >
          <Filter className="w-2.5 h-2.5" />
          {label}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Reportes Programados
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Envío automático de reportes por email
                </p>
              </div>
            </div>
          </div>
          <button
            id="tour-reportes-programados-nuevo"
            onClick={() => setFormModal({ open: true, reporte: null })}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            title="Nuevo Programado"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Nuevo Programado</span>
          </button>
        </div>

        {/* Lista */}
        <div id="tour-reportes-programados-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Cargando reportes programados...</p>
            </div>
          ) : reportes.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                Sin reportes programados
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Crea tu primer reporte automático
              </p>
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
                <div
                  key={r.id}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {r.nombre}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tipoColor[r.tipo_reporte] || ''}`}
                      >
                        {tipoLabel[r.tipo_reporte] || r.tipo_reporte}
                      </span>
                      {(r.formato === 'ambos' ? ['excel', 'pdf'] : [r.formato || 'excel']).map(
                        (fmt) => (
                          <span
                            key={fmt}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              fmt === 'excel'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {fmt === 'excel' ? (
                              <FileSpreadsheet className="w-3 h-3" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                            {fmt.toUpperCase()}
                          </span>
                        )
                      )}
                      {r.estado_ultima_ejecucion === 'exitoso' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Exitoso
                        </span>
                      )}
                      {r.estado_ultima_ejecucion === 'fallido' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          <XCircle className="w-3 h-3" /> Fallido
                        </span>
                      )}
                      {r.estado_ultima_ejecucion === 'ejecutando' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          <Loader2 className="w-3 h-3 animate-spin" /> Ejecutando
                        </span>
                      )}
                      {/* Badges de filtros activos */}
                      {getFiltrosBadges(r)}
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
                        <span>Último envío: {formatDateShort(r.ultima_ejecucion)}</span>
                      )}
                    </div>
                    {r.estado_ultima_ejecucion === 'fallido' && r.ultimo_error && (
                      <p
                        className="mt-1 text-xs text-red-500 dark:text-red-400 truncate"
                        title={r.ultimo_error}
                      >
                        ⚠ {r.ultimo_error}
                      </p>
                    )}
                  </div>

                  {/* Estado toggle */}
                  <button
                    onClick={() => handleToggle(r)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      r.activo
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-centhrix-surface text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {r.activo ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
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
                      {executing === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setFormModal({ open: true, reporte: r })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
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

      <ConfirmDeleteModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ReportesProgramados;
