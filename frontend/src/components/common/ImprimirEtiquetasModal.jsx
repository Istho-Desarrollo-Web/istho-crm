/**
 * ISTHO CRM - Modal de Impresión de Etiquetas de Pallet
 *
 * Permite enviar etiquetas de una operación WMS al microservicio
 * centhrix-print-server para impresión en impresoras Zebra.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer, X, Wifi, WifiOff, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import useNotification from '../../hooks/useNotification';
import auditoriasService from '../../api/auditorias.service';
import { getPrintersDisponibles, enviarJobsBulk } from '../../api/printService';
import { FilterDropdown } from './index';

const BADGE_STATUS = {
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  printing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
};

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {'entradas'|'salidas'|'kardex'} props.tipoOperacion
 * @param {number} props.operacionId
 * @param {string} props.sourceRef  - numero_operacion o documento_wms para identificar en el log
 */
const ImprimirEtiquetasModal = ({ isOpen, onClose, tipoOperacion, operacionId, sourceRef }) => {
  const [printers, setPrinters] = useState([]);
  const [labels, setLabels] = useState([]);
  const [labelType, setLabelType] = useState('QR');
  const [printerId, setPrinterId] = useState('');
  const [copies, setCopies] = useState(1);
  const [loadingData, setLoadingData] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const { success, error } = useNotification();

  const filteredLabels = useMemo(
    () => labels.filter((l) => l.labelType === labelType),
    [labels, labelType]
  );

  const cargarDatos = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg('');
    setDone(false);
    setPrinterId('');
    setLabels([]);
    setPrinters([]);

    try {
      const [printersRes, labelsRes] = await Promise.allSettled([
        getPrintersDisponibles(),
        auditoriasService.getEtiquetasWms(tipoOperacion, operacionId),
      ]);

      if (printersRes.status === 'fulfilled') {
        setPrinters(printersRes.value);
        if (printersRes.value.length === 1) setPrinterId(printersRes.value[0].id);
      } else {
        setErrorMsg(`No se pudo conectar al servidor de impresión: ${printersRes.reason?.message || 'sin respuesta'}`);
      }

      if (labelsRes.status === 'fulfilled') {
        const data = labelsRes.value?.data ?? labelsRes.value;
        setLabels(data?.labels ?? []);
      } else {
        const msg = labelsRes.reason?.message || 'Error al obtener etiquetas del WMS';
        setErrorMsg((prev) => (prev ? `${prev} | ${msg}` : msg));
      }
    } finally {
      setLoadingData(false);
    }
  }, [tipoOperacion, operacionId]);

  useEffect(() => {
    if (isOpen) cargarDatos();
  }, [isOpen, cargarDatos]);

  const handleEnviar = async () => {
    if (!printerId) return;
    setSending(true);
    try {
      const payload = {
        printer_id: printerId,
        label_type: labelType,
        labels: filteredLabels.map((l) => ({ label_id: l.id || l.label_id, pallet_id: l.palletId || l.pallet_id })),
        copies: Math.max(1, Number(copies) || 1),
        priority: 5,
        source: 'crm-centhrix',
        source_ref: sourceRef || String(operacionId),
      };
      const res = await enviarJobsBulk(payload);
      success(`${res?.jobs_created ?? filteredLabels.length} etiqueta(s) enviadas a la impresora`);
      setDone(true);
    } catch (err) {
      error(err.message || 'Error al enviar trabajos de impresión');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E74C3C]/10 rounded-xl">
              <Printer className="w-5 h-5 text-[#E74C3C]" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Imprimir etiquetas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{sourceRef}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando impresoras y etiquetas…</span>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="font-medium text-slate-700 dark:text-slate-200">
                Trabajos enviados a la cola de impresión
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredLabels.length} etiqueta(s) {labelType} · {copies} copia(s) cada una
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tipo de etiqueta */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipo de etiqueta
                </label>
                <FilterDropdown
                  options={[
                    { value: 'QR', label: 'QR' },
                    { value: 'BARCODE', label: 'Código de barras' },
                  ]}
                  value={labelType}
                  onChange={(v) => setLabelType(v)}
                />
              </div>

              {/* Etiquetas disponibles */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-100">{filteredLabels.length}</strong> etiqueta(s) {labelType} encontradas en el WMS
                </span>
              </div>

              {/* Selector de impresora */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Impresora
                </label>
                {printers.length === 0 && !errorMsg ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    No hay impresoras en línea en este momento
                  </div>
                ) : (
                  <div className="space-y-2">
                    {printers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPrinterId(p.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                          printerId === p.id
                            ? 'border-[#E74C3C] bg-[#E74C3C]/5 dark:bg-[#E74C3C]/10'
                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Wifi className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.name}</p>
                            {p.location && (
                              <p className="text-xs text-slate-400">{p.location}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STATUS[p.status] || BADGE_STATUS.online}`}>
                          {p.status === 'printing' ? 'Imprimiendo' : 'En línea'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Copias */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Copias por etiqueta
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) => setCopies(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-16 text-center border border-gray-200 dark:border-slate-600 rounded-xl p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/40"
                  />
                  <button
                    onClick={() => setCopies((c) => Math.min(99, c + 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 ml-1">
                    = {filteredLabels.length * copies} impresión(es) total
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && (
            <button
              onClick={handleEnviar}
              disabled={!printerId || filteredLabels.length === 0 || sending || loadingData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#E74C3C] hover:bg-[#C0392B] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Imprimir {filteredLabels.length > 0 ? `${filteredLabels.length} etiqueta(s)` : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprimirEtiquetasModal;
