/**
 * ============================================================================
 * ISTHO CRM - ContactosList
 * ============================================================================
 * Página principal del Directorio de Contactos.
 * Lista paginada de todos los contactos del sistema con filtros, búsqueda
 * y acciones CRUD.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Junio 2026
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserRound,
  Plus,
  Pencil,
  UserX,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
} from 'lucide-react';

import {
  FilterDropdown,
  SearchBar,
  Pagination,
  ConfirmDialog,
} from '@components/common';
import useNotification from '@hooks/useNotification';
import { useAuth } from '@context/AuthContext';
import contactosService from '@api/contactos.service';
import { CONTACTOS_ENDPOINTS } from '@api/endpoints';
import { descargarArchivo, fechaDescarga } from '@utils/descargas';
import readXlsxFile from 'read-excel-file/browser';
import ContactoForm from './components/ContactoForm';
import ContactoDrawer from './components/ContactoDrawer';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const LIMIT = 20;

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'istho', label: 'ISTHO' },
  { value: 'externo', label: 'Externo' },
];

const ACTIVO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

// ════════════════════════════════════════════════════════════════════════════
// MODAL IMPORTAR CONTACTOS
// ════════════════════════════════════════════════════════════════════════════

const ModalImportarContactos = ({ open, onClose, onSuccess }) => {
  const { token } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [isDragOver, setIsDragOver] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const resetear = () => {
    setArchivo(null);
    setPreview([]);
    setResultado(null);
    setIsDragOver(false);
  };

  const handleClose = () => { resetear(); onClose(); };

  const procesarArchivo = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      notifyError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }
    setArchivo(file);
    setResultado(null);

    // Preview con read-excel-file
    try {
      const rows = await readXlsxFile(file);
      if (rows.length > 1) {
        const headers = rows[0].map(String);
        const data = rows.slice(1, 6).map((row) =>
          Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
        );
        setPreview(data);
      } else {
        setPreview([]);
      }
    } catch {
      setPreview([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  };

  const handleImportar = async () => {
    if (!archivo) return;
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const formData = new FormData();
      formData.append('archivo', archivo);
      const res = await fetch(`${baseUrl}${CONTACTOS_ENDPOINTS.IMPORTAR}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('istho_token')}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al importar');
      const data = json.data ?? json;
      setResultado(data);
      if (data.creados > 0) {
        notifySuccess(`${data.creados} contacto${data.creados !== 1 ? 's' : ''} importado${data.creados !== 1 ? 's' : ''}`);
        onSuccess?.();
      }
    } catch (err) {
      notifyError(err.message || 'Error al importar contactos');
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPlantilla = async () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    await descargarArchivo(`${baseUrl}${CONTACTOS_ENDPOINTS.PLANTILLA_IMPORTACION}`, 'plantilla-contactos.xlsx');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Importar Contactos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Carga masiva desde archivo Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-centhrix-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Resultado */}
          {resultado ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resultado.creados}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Creados</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resultado.vinculados}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Vinculados</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{resultado.omitidos}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Omitidos</p>
                </div>
              </div>
              {resultado.errores?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {resultado.errores.length} error(es)
                  </p>
                  <ul className="space-y-1">
                    {resultado.errores.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400">
                        Fila {e.fila} ({e.nombre}): {e.error}
                      </li>
                    ))}
                    {resultado.errores.length > 5 && (
                      <li className="text-xs text-red-500">...y {resultado.errores.length - 5} más</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={resetear} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors">
                  Importar otro archivo
                </button>
                <button onClick={handleClose} className="flex-1 px-4 py-2 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-sm font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Plantilla */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-centhrix-surface rounded-xl p-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ¿No tienes el formato? Descarga la plantilla primero.
                  </p>
                </div>
                <button onClick={handleDescargarPlantilla} className="shrink-0 ml-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2">
                  Descargar plantilla
                </button>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !archivo && inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
                  ${isDragOver ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/50'}
                  ${archivo ? 'bg-slate-50 dark:bg-centhrix-surface cursor-default' : 'bg-white dark:bg-centhrix-card'}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => procesarArchivo(e.target.files[0])}
                />
                {archivo ? (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{archivo.name}</p>
                        <p className="text-xs text-slate-500">{(archivo.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); resetear(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Upload className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Arrastra el archivo aquí o <span className="text-emerald-600 dark:text-emerald-400">haz clic para seleccionar</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">.xlsx o .xls — máx. 10 MB</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Vista previa (primeras {preview.length} filas)
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-centhrix-surface">
                          {Object.keys(preview[0]).slice(0, 6).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50">
                            {Object.values(row).slice(0, 6).map((val, j) => (
                              <td key={j} className="px-3 py-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botón importar */}
              {archivo && (
                <button
                  onClick={handleImportar}
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Importando...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Importar contactos</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ════════════════════════════════════════════════════════════════════════════

/** Filas skeleton para estado de carga inicial */
const SkeletonRows = () =>
  [...Array(8)].map((_, i) => (
    <tr key={i} className="border-b border-white/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700/60 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-700/40 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-24 bg-slate-700/60 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-36 bg-slate-700/60 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-28 bg-slate-700/60 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="h-5 w-8 bg-slate-700/60 rounded-full animate-pulse mx-auto" />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="h-5 w-14 bg-slate-700/60 rounded-full animate-pulse mx-auto" />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="h-7 w-16 bg-slate-700/40 rounded animate-pulse mx-auto" />
      </td>
    </tr>
  ));

/** Badge de tipo de contacto */
const TipoBadge = ({ tipo }) => {
  if (tipo === 'istho') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        ISTHO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
      Externo
    </span>
  );
};

/** Badge de usuario CRM */
const CrmBadge = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
    Usuario CRM
  </span>
);

/** Chip de estado */
const EstadoChip = ({ activo }) => {
  if (activo) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
      Inactivo
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ContactosList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { success, error: notifyError, apiError } = useNotification();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [contactos, setContactos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  // Filtros sincronizados con URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tipo, setTipo] = useState(searchParams.get('tipo') || '');
  const [activo, setActivo] = useState(searchParams.get('activo') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Modal de formulario (crear/editar)
  const [formModal, setFormModal] = useState({ open: false, contacto: null });

  // Drawer de detalle
  const [drawer, setDrawer] = useState({ open: false, contactoId: null });

  // Modal de desactivar
  const [deactivateModal, setDeactivateModal] = useState({ isOpen: false, contacto: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Export / Import
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  // Timer de debounce para búsqueda
  const searchTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  // ── Sincronizar filtros → URL ──────────────────────────────────────────
  const syncUrl = useCallback((newSearch, newTipo, newActivo, newPage) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newTipo) params.set('tipo', newTipo);
    if (newActivo) params.set('activo', newActivo);
    if (newPage > 1) params.set('page', String(newPage));
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchContactos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (tipo) params.tipo = tipo;
      if (activo !== '') params.activo = activo;

      const res = await contactosService.getAll(params);
      // paginated() devuelve { data: [...], pagination: { total, totalPages, ... } }
      const rows = Array.isArray(res?.data) ? res.data : (res?.data?.rows ?? []);
      const count = res?.pagination?.total ?? res?.count ?? 0;
      const pages = res?.pagination?.totalPages ?? (Math.ceil(count / LIMIT) || 1);

      setContactos(rows);
      setTotal(count);
      setTotalPages(pages);
    } catch (err) {
      apiError(err);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [page, search, tipo, activo, apiError]);

  useEffect(() => {
    fetchContactos();
  }, [fetchContactos]);

  // ── Handlers de filtros ───────────────────────────────────────────────
  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      syncUrl(value, tipo, activo, 1);
    }, 300);
  };

  const handleTipoChange = (value) => {
    setTipo(value);
    setPage(1);
    syncUrl(search, value, activo, 1);
  };

  const handleActivoChange = (value) => {
    setActivo(value);
    setPage(1);
    syncUrl(search, tipo, value, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    syncUrl(search, tipo, activo, newPage);
  };

  // ── Export / Import ───────────────────────────────────────────────────
  const handleExportar = async () => {
    setExportLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tipo) params.set('tipo', tipo);
      if (activo) params.set('activo', activo);
      const qs = params.toString() ? `?${params.toString()}` : '';
      await descargarArchivo(
        `${baseUrl}${CONTACTOS_ENDPOINTS.EXPORTAR_EXCEL}${qs}`,
        `contactos-${fechaDescarga()}.xlsx`
      );
    } catch {
      notifyError('Error al exportar los contactos');
    } finally {
      setExportLoading(false);
    }
  };

  // ── Handlers CRUD ─────────────────────────────────────────────────────
  const handleNuevoContacto = () => {
    setFormModal({ open: true, contacto: null });
  };

  const handleEditarContacto = (contacto) => {
    setFormModal({ open: true, contacto });
  };

  const handleVerContacto = (contacto) => {
    setDrawer({ open: true, contactoId: contacto.id });
  };

  const handleSolicitarDesactivar = (contacto) => {
    setDeactivateModal({ isOpen: true, contacto });
  };

  const handleConfirmarDesactivar = async () => {
    const { contacto } = deactivateModal;
    if (!contacto) return;
    setActionLoading(true);
    try {
      await contactosService.deactivate(contacto.id);
      success(`Contacto "${contacto.nombre}" desactivado`);
      setDeactivateModal({ isOpen: false, contacto: null });
      fetchContactos();
    } catch (err) {
      apiError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  const hayFiltros = search || tipo || activo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-centhrix-bg dark:to-[#0d0e1e]">
      <main className="pt-28 px-4 pb-10 max-w-[1700px] mx-auto">

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display flex items-center gap-3">
              <UserRound className="w-8 h-8 text-[#E74C3C]" />
              Directorio de Contactos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {total > 0
                ? `${total} contacto${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`
                : 'Gestiona los contactos del sistema'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchContactos}
              title="Actualizar"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-centhrix-surface transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {hasPermission('contactos', 'ver') && (
              <button
                onClick={handleExportar}
                disabled={exportLoading}
                title="Exportar Excel"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-centhrix-surface disabled:opacity-60 transition-colors"
              >
                <Download className={`w-4 h-4 ${exportLoading ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}

            {hasPermission('contactos', 'crear') && (
              <button
                onClick={() => setShowImportar(true)}
                title="Importar contactos"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>
            )}

            {hasPermission('contactos', 'crear') && (
              <button
                onClick={handleNuevoContacto}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Contacto
              </button>
            )}
          </div>
        </div>

        {/* ── BARRA DE FILTROS ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Búsqueda */}
            <div className="flex-1">
              <SearchBar
                placeholder="Buscar por nombre, email o cargo..."
                value={search}
                onChange={handleSearchChange}
                onClear={() => handleSearchChange('')}
              />
            </div>

            {/* Tipo */}
            <div className="w-full lg:w-48">
              <FilterDropdown
                options={TIPO_OPTIONS}
                value={tipo}
                onChange={handleTipoChange}
                compact
              />
            </div>

            {/* Estado */}
            <div className="w-full lg:w-44">
              <FilterDropdown
                options={ACTIVO_OPTIONS}
                value={activo}
                onChange={handleActivoChange}
                compact
              />
            </div>

            {/* Limpiar filtros */}
            {hayFiltros && (
              <button
                onClick={() => {
                  setSearch('');
                  setTipo('');
                  setActivo('');
                  setPage(1);
                  syncUrl('', '', '', 1);
                }}
                className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-[#E74C3C] dark:hover:text-[#E74C3C] underline underline-offset-2 transition-colors whitespace-nowrap self-center"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── TABLA ────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Clientes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className={loading && !firstLoad ? 'opacity-50 pointer-events-none' : ''}>
                {firstLoad ? (
                  <SkeletonRows />
                ) : contactos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-centhrix-surface flex items-center justify-center">
                          <UserRound className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          {hayFiltros
                            ? 'No se encontraron contactos con esos filtros'
                            : 'No hay contactos registrados'}
                        </p>
                        {!hayFiltros && hasPermission('contactos', 'crear') && (
                          <button
                            onClick={handleNuevoContacto}
                            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-sm font-medium transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Nuevo Contacto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  contactos.map((contacto) => (
                    <tr
                      key={contacto.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors cursor-pointer"
                      onClick={() => handleVerContacto(contacto)}
                    >
                      {/* Nombre + badges */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E74C3C]/10 flex items-center justify-center shrink-0">
                            <UserRound className="w-4 h-4 text-[#E74C3C]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {contacto.nombre}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <TipoBadge tipo={contacto.tipo} />
                              {contacto.usuario_id != null && <CrmBadge />}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td
                        className="px-4 py-3 text-slate-600 dark:text-slate-300 truncate max-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span onClick={() => handleVerContacto(contacto)}>
                          {contacto.cargo || '—'}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {contacto.email ? (
                          <a
                            href={`mailto:${contacto.email}`}
                            className="hover:text-[#E74C3C] transition-colors truncate block max-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                            title={contacto.email}
                          >
                            {contacto.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {contacto.celular || contacto.telefono ? (
                          <a
                            href={`tel:${contacto.celular || contacto.telefono}`}
                            className="hover:text-[#E74C3C] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contacto.celular || contacto.telefono}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Clientes */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 cursor-default"
                          title={`${contacto.clientes?.length ?? 0} cliente(s) asignado(s)`}
                        >
                          {contacto.clientes?.length ?? 0}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <EstadoChip activo={contacto.activo !== false} />
                      </td>

                      {/* Acciones */}
                      <td
                        className="px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {hasPermission('contactos', 'editar') && (
                            <button
                              onClick={() => handleEditarContacto(contacto)}
                              title="Editar contacto"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('contactos', 'eliminar') && contacto.activo !== false && (
                            <button
                              onClick={() => handleSolicitarDesactivar(contacto)}
                              title="Desactivar contacto"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!firstLoad && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={LIMIT}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </main>

      {/* ── FORMULARIO CREAR / EDITAR ────────────────────────────────── */}
      <ContactoForm
        open={formModal.open}
        onClose={() => setFormModal({ open: false, contacto: null })}
        contacto={formModal.contacto}
        onSuccess={() => {
          setFormModal({ open: false, contacto: null });
          fetchContactos();
        }}
      />

      {/* ── DRAWER DETALLE ───────────────────────────────────────────── */}
      <ContactoDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, contactoId: null })}
        contactoId={drawer.contactoId}
        onContactoUpdated={fetchContactos}
      />

      {/* ── MODAL IMPORTAR ───────────────────────────────────────────── */}
      <ModalImportarContactos
        open={showImportar}
        onClose={() => setShowImportar(false)}
        onSuccess={fetchContactos}
      />

      {/* ── MODAL DESACTIVAR ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, contacto: null })}
        onConfirm={handleConfirmarDesactivar}
        title="Desactivar Contacto"
        message={`¿Estás seguro de desactivar a "${deactivateModal.contacto?.nombre}"? El contacto dejará de aparecer como activo.`}
        confirmText="Desactivar"
        type="warning"
        loading={actionLoading}
      />
    </div>
  );
};

export default ContactosList;
