/**
 * ============================================================================
 * ISTHO CRM - CajaMenorForm Component
 * ============================================================================
 * Formulario modal para crear y editar cajas menores.
 * Soporta traslado de saldo desde cajas cerradas anteriores.
 * Sigue el mismo patrón de diseño que ClienteForm y VehiculoForm.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Wallet, User, DollarSign, FileText, ArrowLeftRight, Info } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { cajasMenoresService, vehiculosService } from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatMoney = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/** Formatea número con separadores de miles para input visual */
const formatThousands = (value) => {
  if (!value && value !== 0) return '';
  const num = String(value).replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-CO');
};

/** Extrae número limpio de string formateado */
const parseThousands = (formatted) => {
  const clean = String(formatted).replace(/[^\d]/g, '');
  return clean ? Number(clean) : '';
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD (mismo patrón que ClienteForm / VehiculoForm)
// ════════════════════════════════════════════════════════════════════════════

const InputField = ({ label, icon: Icon, required, error, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-slate-400" />
        </div>
      )}
      {children}
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const CajaMenorForm = ({ open, onClose, onSuccess, cajaId }) => {
  const { success: notifySuccess, error: notifyError, apiError } = useNotification();

  const [formData, setFormData] = useState({
    conductor_id: '',
    saldo_inicial: '',
    caja_anterior_id: '',
    observaciones: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Datos para selects
  const [conductores, setConductores] = useState([]);
  const [cajasCerradas, setCajasCerradas] = useState([]);

  const isEditing = !!cajaId;

  // ──────────────────────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setLoadingData(true);

    const fetchData = async () => {
      try {
        const [conductoresRes, cajasRes] = await Promise.all([
          vehiculosService.getConductores(),
          cajasMenoresService.getAll({ estado: 'cerrada' }),
        ]);

        if (conductoresRes.success || conductoresRes.data) {
          setConductores(conductoresRes.data || []);
        }
        if (cajasRes.success || cajasRes.data) {
          setCajasCerradas(cajasRes.data || []);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        notifyError('No se pudieron cargar los datos del formulario');
      }

      // Cargar caja existente en modo edición
      if (cajaId) {
        try {
          const response = await cajasMenoresService.getById(cajaId);
          if (response.success || response.data) {
            const caja = response.data;
            setFormData({
              conductor_id: caja.conductor_id || '',
              saldo_inicial: caja.saldo_inicial || '',
              caja_anterior_id: caja.caja_anterior_id || '',
              observaciones: caja.observaciones || '',
            });
          }
        } catch (err) {
          console.error('Error cargando caja menor:', err);
          apiError(err);
        }
      } else {
        setFormData({
          conductor_id: '',
          saldo_inicial: '',
          caja_anterior_id: '',
          observaciones: '',
        });
      }

      setLoadingData(false);
    };

    fetchData();
  }, [open, cajaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // CALCULOS
  // ──────────────────────────────────────────────────────────────────────────

  const cajaAnteriorSeleccionada = useMemo(() => {
    if (!formData.caja_anterior_id) return null;
    return cajasCerradas.find((c) => c.id === Number(formData.caja_anterior_id)) || null;
  }, [formData.caja_anterior_id, cajasCerradas]);

  const saldoTrasladado = useMemo(() => {
    if (!cajaAnteriorSeleccionada) return 0;
    return parseFloat(cajaAnteriorSeleccionada.saldo_actual) || 0;
  }, [cajaAnteriorSeleccionada]);

  const saldoTotal = useMemo(() => {
    const inicial = parseFloat(formData.saldo_inicial) || 0;
    return inicial + saldoTrasladado;
  }, [formData.saldo_inicial, saldoTrasladado]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDACION
  // ──────────────────────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};

    if (!formData.conductor_id) {
      newErrors.conductor_id = 'El conductor es requerido';
    }

    if (!isEditing) {
      if (!formData.saldo_inicial && formData.saldo_inicial !== 0) {
        newErrors.saldo_inicial = 'El saldo inicial es requerido';
      } else if (parseFloat(formData.saldo_inicial) < 0) {
        newErrors.saldo_inicial = 'El saldo inicial no puede ser negativo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = isEditing
        ? {
            conductor_id: formData.conductor_id,
            observaciones: formData.observaciones,
          }
        : {
            conductor_id: formData.conductor_id,
            saldo_inicial: parseFloat(formData.saldo_inicial) || 0,
            caja_anterior_id: formData.caja_anterior_id ? Number(formData.caja_anterior_id) : null,
            observaciones: formData.observaciones || null,
          };

      let response;
      if (isEditing) {
        response = await cajasMenoresService.update(cajaId, payload);
      } else {
        response = await cajasMenoresService.create(payload);
      }

      if (response.success !== false) {
        notifySuccess(
          isEditing
            ? 'Caja menor actualizada correctamente'
            : 'Caja menor creada correctamente'
        );
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Error guardando caja menor:', err);
      apiError(err);
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CLASES COMPARTIDAS
  // ──────────────────────────────────────────────────────────────────────────

  const baseInputClasses = (hasIcon, hasError) => `
    w-full px-4 py-2.5
    bg-white dark:bg-slate-800 border rounded-xl
    text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    transition-all duration-200
    ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
    ${hasIcon ? 'pl-10' : ''}
  `;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? 'Editar Caja Menor' : 'Nueva Caja Menor'}
      subtitle={isEditing ? 'Modifique los datos de la caja menor' : 'Complete la información para crear una caja menor'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loadingData}>
            {isEditing ? 'Guardar Cambios' : 'Crear Caja Menor'}
          </Button>
        </>
      }
    >
      {loadingData ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Cargando datos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conductor */}
          <InputField
            label="Conductor"
            icon={User}
            required
            error={errors.conductor_id}
          >
            <select
              name="conductor_id"
              value={formData.conductor_id}
              onChange={(e) => handleChange('conductor_id', e.target.value)}
              className={baseInputClasses(true, errors.conductor_id)}
              disabled={loadingData}
            >
              <option value="">Seleccionar conductor...</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.username}
                </option>
              ))}
            </select>
          </InputField>

          {/* Saldo Inicial */}
          <InputField
            label="Saldo Inicial"
            icon={DollarSign}
            required
            error={errors.saldo_inicial}
          >
            <input
              type="text"
              name="saldo_inicial"
              value={formatThousands(formData.saldo_inicial)}
              onChange={(e) => handleChange('saldo_inicial', parseThousands(e.target.value))}
              placeholder="0"
              disabled={isEditing || loadingData}
              className={`${baseInputClasses(true, errors.saldo_inicial)} ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </InputField>

          {/* Caja Anterior (traslado de saldo) - solo en creación */}
          {!isEditing && (
            <InputField
              label="Caja Anterior (Traslado de saldo)"
              icon={ArrowLeftRight}
              error={null}
            >
              <select
                name="caja_anterior_id"
                value={formData.caja_anterior_id}
                onChange={(e) => handleChange('caja_anterior_id', e.target.value)}
                className={baseInputClasses(true, false)}
                disabled={loadingData}
              >
                <option value="">Sin traslado (opcional)</option>
                {cajasCerradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caja #{c.id} - {c.conductor_nombre || 'Sin conductor'} - {formatMoney(c.saldo_actual)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Opcional. Seleccione una caja cerrada para trasladar su saldo.
              </p>
            </InputField>
          )}

          {/* Observaciones - ocupa 2 columnas */}
          <div className="md:col-span-2">
            <InputField
              label="Observaciones"
              icon={FileText}
              error={null}
            >
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                placeholder="Notas adicionales sobre la caja menor..."
                rows={3}
                disabled={loadingData}
                className={baseInputClasses(true, false)}
              />
            </InputField>
          </div>

          {/* Info box: Saldo a trasladar */}
          {cajaAnteriorSeleccionada && !isEditing && (
            <div className="md:col-span-2 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Saldo a trasladar: <strong>{formatMoney(saldoTrasladado)}</strong>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  De la caja #{cajaAnteriorSeleccionada.id}
                  {cajaAnteriorSeleccionada.conductor_nombre
                    ? ` (${cajaAnteriorSeleccionada.conductor_nombre})`
                    : ''}
                </p>
              </div>
            </div>
          )}

          {/* Info box: Saldo total calculado */}
          {!isEditing && (parseFloat(formData.saldo_inicial) > 0 || saldoTrasladado > 0) && (
            <div className="md:col-span-2 flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Wallet className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  <strong>Saldo total de la caja:</strong> {formatMoney(saldoTotal)}
                </p>
                {saldoTrasladado > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ({formatMoney(formData.saldo_inicial || 0)} inicial + {formatMoney(saldoTrasladado)} trasladado)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

CajaMenorForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  cajaId: PropTypes.number,
};

CajaMenorForm.defaultProps = {
  onSuccess: null,
  cajaId: null,
};

export default CajaMenorForm;
