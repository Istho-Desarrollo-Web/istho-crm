// frontend/src/pages/Solicitudes/SolicitudForm.jsx
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown, DatePicker } from '../../components/common';
import useNotification from '../../hooks/useNotification';

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'pallet', label: 'Pallet' },
];

const lineaVacia = () => ({ referencia: '', descripcion: '', cantidad: '', unidad: 'unidad' });

const SolicitudForm = ({ tipo, onClose, onSave }) => {
  const { success, error: notifyError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    prioridad: 'normal',
    fecha_estimada: '',
    numero_documento: '',
    transportista: '',
    direccion_entrega: '',
    contacto_destino: '',
    notas: '',
  });
  const [detalles, setDetalles] = useState([lineaVacia()]);
  const [adjunto, setAdjunto] = useState(null);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDetalleChange = (idx, field, value) => {
    setDetalles((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const addLinea = () => setDetalles((prev) => [...prev, lineaVacia()]);
  const removeLinea = (idx) => setDetalles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const lineasValidas = detalles.filter((d) => d.referencia.trim() && Number(d.cantidad) > 0);
    if (lineasValidas.length === 0) {
      setFormError('Agrega al menos un producto con referencia y cantidad válidas');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, tipo, detalles: lineasValidas };
      const res = await solicitudesService.crear(payload);
      const solicitudId = res.data?.id;

      if (adjunto && solicitudId) {
        await solicitudesService.subirDocumento(solicitudId, adjunto);
      }

      success(`Solicitud ${res.data?.numero_solicitud} creada correctamente`);
      onSave();
    } catch (err) {
      const msg = err.message || 'Error al crear la solicitud';
      setFormError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = tipo === 'ingreso' ? 'Aviso de Ingreso' : 'Solicitud de Despacho';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nueva {tipoLabel}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl">{formError}</div>
          )}

          {/* Campos comunes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prioridad</label>
              <FilterDropdown
                options={[{ value: 'normal', label: 'Normal' }, { value: 'urgente', label: 'Urgente' }]}
                value={form.prioridad}
                onChange={(v) => setForm((p) => ({ ...p, prioridad: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {tipo === 'ingreso' ? 'Fecha estimada de llegada' : 'Fecha deseada de despacho'}
              </label>
              <DatePicker value={form.fecha_estimada} onChange={(v) => setForm((p) => ({ ...p, fecha_estimada: v }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tipo === 'ingreso' ? 'N° Remisión / Factura' : 'N° Orden de Compra'}
            </label>
            <input name="numero_documento" value={form.numero_documento} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              placeholder="Número de documento" />
          </div>

          {/* Campos específicos por tipo */}
          {tipo === 'ingreso' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transportista / Vehículo</label>
              <input name="transportista" value={form.transportista} onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                placeholder="Nombre del transportista o placa" />
            </div>
          )}

          {tipo === 'despacho' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dirección de entrega</label>
                <input name="direccion_entrega" value={form.direccion_entrega} onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Ciudad, calle, número..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contacto en destino</label>
                <input name="contacto_destino" value={form.contacto_destino} onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Nombre y teléfono" />
              </div>
            </div>
          )}

          {/* Tabla de productos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Productos *</label>
              <button type="button" onClick={addLinea}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
                <Plus className="w-3 h-3" /> Agregar línea
              </button>
            </div>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-centhrix-surface">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Referencia *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-24">Cantidad *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Unidad</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {detalles.map((d, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5">
                        <input value={d.referencia} onChange={(e) => handleDetalleChange(idx, 'referencia', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                          placeholder="REF-001" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={d.descripcion} onChange={(e) => handleDetalleChange(idx, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                          placeholder="Descripción" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0.01" step="0.01" value={d.cantidad}
                          onChange={(e) => handleDetalleChange(idx, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <FilterDropdown compact options={UNIDADES} value={d.unidad}
                          onChange={(v) => handleDetalleChange(idx, 'unidad', v)} />
                      </td>
                      <td className="px-2 py-1.5">
                        {detalles.length > 1 && (
                          <button type="button" onClick={() => removeLinea(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notas adicionales</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none"
              placeholder="Instrucciones especiales, condiciones, observaciones..." />
          </div>

          {/* Adjunto */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Documento soporte (PDF / imagen)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setAdjunto(e.target.files[0] || null)}
              className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SolicitudForm;
