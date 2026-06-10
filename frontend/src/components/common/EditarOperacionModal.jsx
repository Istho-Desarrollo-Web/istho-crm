/**
 * ISTHO CRM - Modal de Edición Administrativa de Operaciones
 *
 * Solo visible y funcional para el rol admin.
 * Permite corregir encabezado y líneas de operaciones pendiente/en_proceso.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Plus, Trash2, Save, AlertTriangle, Ban } from 'lucide-react';
import Button from './Button/Button';
import { FilterDropdown } from './index';
import { DatePicker } from './index';
import useNotification from '../../hooks/useNotification';
import auditoriasService from '../../api/auditorias.service';
import clientesService from '../../api/clientes.service';

const UNIDADES = [
  { value: 'UND', label: 'UND' },
  { value: 'KG', label: 'KG' },
  { value: 'TON', label: 'TON' },
  { value: 'LT', label: 'LT' },
  { value: 'MT', label: 'MT' },
  { value: 'M2', label: 'M2' },
  { value: 'M3', label: 'M3' },
  { value: 'CAJA', label: 'CAJA' },
  { value: 'PALET', label: 'PALET' },
];

const lineaVacia = () => ({
  _key: Date.now() + Math.random(),
  sku: '',
  producto: '',
  cantidad: '',
  unidad_medida: 'UND',
  lote: '',
  peso: '',
  _nueva: true,
});

const InputField = ({ label, value, onChange, placeholder = '', type = 'text', required = false, disabled = false }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => !disabled && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
        disabled
          ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed'
          : 'bg-white dark:bg-centhrix-surface'
      }`}
    />
  </div>
);

const EditarOperacionModal = ({ isOpen, operacionId, onClose, onGuardado }) => {
  const [tab, setTab] = useState('encabezado');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [estadoOperacion, setEstadoOperacion] = useState(null);
  const { success, error } = useNotification();

  // Encabezado
  const [clienteId, setClienteId] = useState('');
  const [fechaDocumento, setFechaDocumento] = useState('');
  const [fechaOperacion, setFechaOperacion] = useState('');
  const [documentoWms, setDocumentoWms] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductorCedula, setConductorCedula] = useState('');
  const [conductorTelefono, setConductorTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');

  // Líneas
  const [lineas, setLineas] = useState([]);
  const [lineasEliminar, setLineasEliminar] = useState([]);

  const readonly = estadoOperacion === 'anulado' || estadoOperacion === 'cerrado';

  const cargarDatos = useCallback(async () => {
    if (!operacionId) return;
    setLoading(true);
    try {
      const [opResp, cliResp] = await Promise.all([
        auditoriasService.getOperacionById(operacionId),
        clientesService.getActivos(),
      ]);

      const cliList = Array.isArray(cliResp?.data) ? cliResp.data : cliResp?.data?.rows ?? [];
      setClientes(
        cliList.map((c) => ({ value: String(c.id), label: c.razon_social || c.nombre || String(c.id) }))
      );

      const raw = opResp?.data || opResp;
      if (raw) {
        setEstadoOperacion(raw.estado || null);
        setClienteId(String(raw.cliente_id || ''));
        setFechaDocumento(raw.fecha_documento || '');
        setFechaOperacion(raw.fecha_operacion || '');
        setDocumentoWms(raw.documento_wms || '');
        setOrigen(raw.origen || '');
        setDestino(raw.destino || '');
        setVehiculoPlaca(raw.vehiculo_placa || '');
        setConductorNombre(raw.conductor_nombre || '');
        setConductorCedula(raw.conductor_cedula || '');
        setConductorTelefono(raw.conductor_telefono || '');
        setObservaciones(raw.observaciones || '');
        setObservacionesCierre(raw.observaciones_cierre || '');
        // El endpoint /operaciones/:id devuelve detalles en raw.detalles
        setLineas(
          (raw.detalles || []).map((l) => ({
            ...l,
            _key: l.id,
            _nueva: false,
          }))
        );
      }
    } catch (_err) {
      error('No se pudo cargar la operación');
    } finally {
      setLoading(false);
    }
  }, [operacionId, error]);

  useEffect(() => {
    if (isOpen) {
      setTab('encabezado');
      setLineasEliminar([]);
      cargarDatos();
    }
  }, [isOpen, cargarDatos]);

  const handleAgregarLinea = () => setLineas((prev) => [...prev, lineaVacia()]);

  const handleEliminarLinea = (linea) => {
    if (!linea._nueva && linea.id) {
      setLineasEliminar((prev) => [...prev, linea.id]);
    }
    setLineas((prev) => prev.filter((l) => l._key !== linea._key));
  };

  const handleCampoLinea = (key, campo, valor) => {
    setLineas((prev) => prev.map((l) => (l._key === key ? { ...l, [campo]: valor } : l)));
  };

  const handleGuardar = async () => {
    const lineasNuevas = lineas.filter((l) => l._nueva);
    const lineasExistentes = lineas.filter((l) => !l._nueva);

    const errores = lineasNuevas.filter((l) => !l.sku.trim() || !l.producto.trim() || !l.cantidad);
    if (errores.length > 0) {
      error('Las líneas nuevas requieren SKU, descripción y cantidad');
      return;
    }

    setSaving(true);
    try {
      await auditoriasService.editarAdmin(operacionId, {
        cliente_id: clienteId ? Number(clienteId) : undefined,
        fecha_documento: fechaDocumento || undefined,
        fecha_operacion: fechaOperacion || undefined,
        documento_wms: documentoWms || undefined,
        origen: origen || undefined,
        destino: destino || undefined,
        vehiculo_placa: vehiculoPlaca || undefined,
        conductor_nombre: conductorNombre || undefined,
        conductor_cedula: conductorCedula || undefined,
        conductor_telefono: conductorTelefono || undefined,
        observaciones,
        observaciones_cierre: observacionesCierre,
        lineas_actualizar: lineasExistentes.map((l) => ({
          id: l.id,
          sku: l.sku,
          producto: l.producto,
          cantidad: parseFloat(l.cantidad),
          unidad_medida: l.unidad_medida,
          lote: l.lote,
          peso: l.peso ? parseFloat(l.peso) : null,
        })),
        lineas_agregar: lineasNuevas.map((l) => ({
          sku: l.sku,
          producto: l.producto,
          cantidad: parseFloat(l.cantidad),
          unidad_medida: l.unidad_medida,
          lote: l.lote,
          peso: l.peso ? parseFloat(l.peso) : null,
        })),
        lineas_eliminar: lineasEliminar,
      });
      success('Operación actualizada correctamente');
      onGuardado?.();
      onClose();
    } catch (err) {
      error(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${readonly ? 'bg-slate-100 dark:bg-slate-800' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              {readonly
                ? <Ban className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                : <Pencil className="w-5 h-5 text-orange-500" />
              }
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {readonly ? 'Detalle de Operación' : 'Editar Operación'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                {readonly
                  ? <><Ban className="w-3 h-3 text-red-400" /> Operación {estadoOperacion} — no se puede editar</>
                  : <><AlertTriangle className="w-3 h-3 text-amber-500" /> Acción administrativa — los cambios quedan en auditoría</>
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 shrink-0">
          {['encabezado', 'lineas'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-surface'
              }`}
            >
              {t === 'encabezado' ? 'Datos Generales' : `Líneas (${lineas.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!loading && readonly && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400">
              <Ban className="w-4 h-4 shrink-0" />
              Esta operación está <strong className="mx-1">{estadoOperacion}</strong> y no puede ser modificada.
            </div>
          )}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-centhrix-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tab === 'encabezado' ? (
            <div className="space-y-4">
              {/* Sección Documento */}
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Datos del Documento
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={readonly ? 'pointer-events-none opacity-60' : ''}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Cliente
                  </label>
                  <FilterDropdown
                    options={[{ value: '', label: '— Sin cambiar —' }, ...clientes]}
                    value={clienteId}
                    onChange={setClienteId}
                  />
                </div>
                <InputField
                  label="Documento WMS"
                  value={documentoWms}
                  onChange={setDocumentoWms}
                  placeholder="Ej: CO-2026-0001"
                  disabled={readonly}
                />
                <div className={readonly ? 'pointer-events-none opacity-60' : ''}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Fecha de Operación
                  </label>
                  <DatePicker value={fechaOperacion} onChange={setFechaOperacion} />
                </div>
                <div className={readonly ? 'pointer-events-none opacity-60' : ''}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Fecha Documento
                  </label>
                  <DatePicker value={fechaDocumento} onChange={setFechaDocumento} />
                </div>
              </div>

              {/* Sección Logística */}
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-2">
                Logística
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Origen" value={origen} onChange={setOrigen} placeholder="Ciudad/punto de origen" disabled={readonly} />
                <InputField label="Destino" value={destino} onChange={setDestino} placeholder="Ciudad/punto de destino" disabled={readonly} />
              </div>

              {/* Sección Transporte */}
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-2">
                Transporte
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Placa" value={vehiculoPlaca} onChange={setVehiculoPlaca} placeholder="Ej: ABC123" disabled={readonly} />
                <InputField label="Conductor" value={conductorNombre} onChange={setConductorNombre} disabled={readonly} />
                <InputField label="Cédula Conductor" value={conductorCedula} onChange={setConductorCedula} disabled={readonly} />
                <InputField label="Teléfono Conductor" value={conductorTelefono} onChange={setConductorTelefono} disabled={readonly} />
              </div>

              {/* Observaciones */}
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-2">
                Observaciones
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Observaciones Generales
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    disabled={readonly}
                    className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-surface'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Observaciones de Cierre
                  </label>
                  <textarea
                    rows={2}
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    disabled={readonly}
                    className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-surface'}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Tab Líneas */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {lineas.length} línea{lineas.length !== 1 ? 's' : ''}
                </p>
                {!readonly && (
                  <Button variant="ghost" size="sm" icon={Plus} onClick={handleAgregarLinea}>
                    Agregar línea
                  </Button>
                )}
              </div>

              {lineas.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                  No hay líneas. Usa &ldquo;Agregar línea&rdquo; para incluir productos.
                </div>
              ) : (
                <div className="space-y-2">
                  {lineas.map((linea) => (
                    <div
                      key={linea._key}
                      className={`p-4 rounded-xl border ${
                        linea._nueva
                          ? 'border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/10'
                          : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-centhrix-surface'
                      }`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">SKU</label>
                          <input
                            type="text"
                            value={linea.sku}
                            onChange={(e) => handleCampoLinea(linea._key, 'sku', e.target.value)}
                            placeholder="SKU-001"
                            disabled={readonly}
                            className={`w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-card'}`}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={linea.producto}
                            onChange={(e) => handleCampoLinea(linea._key, 'producto', e.target.value)}
                            placeholder="Nombre del producto"
                            disabled={readonly}
                            className={`w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-card'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={linea.cantidad}
                            onChange={(e) => handleCampoLinea(linea._key, 'cantidad', e.target.value)}
                            disabled={readonly}
                            className={`w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-card'}`}
                          />
                        </div>
                        <div className={readonly ? 'pointer-events-none opacity-60' : ''}>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Unidad</label>
                          <FilterDropdown
                            options={UNIDADES}
                            value={linea.unidad_medida || 'UND'}
                            onChange={(v) => handleCampoLinea(linea._key, 'unidad_medida', v)}
                            compact
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lote</label>
                          <input
                            type="text"
                            value={linea.lote || ''}
                            onChange={(e) => handleCampoLinea(linea._key, 'lote', e.target.value)}
                            placeholder="Opcional"
                            disabled={readonly}
                            className={`w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-card'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Peso (kg)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.peso || ''}
                            onChange={(e) => handleCampoLinea(linea._key, 'peso', e.target.value)}
                            placeholder="Opcional"
                            disabled={readonly}
                            className={`w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${readonly ? 'bg-slate-50 dark:bg-centhrix-bg opacity-60 cursor-not-allowed' : 'bg-white dark:bg-centhrix-card'}`}
                          />
                        </div>
                      </div>
                      {!readonly && (
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleEliminarLinea(linea)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700 shrink-0">
          {readonly ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleGuardar} loading={saving}>
                Guardar Cambios
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditarOperacionModal;
