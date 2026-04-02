/**
 * ============================================================================
 * ISTHO CRM - CajaMenorForm Component
 * ============================================================================
 * Formulario modal para crear y editar cajas menores.
 * Soporta traslado de saldo desde cajas cerradas anteriores.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinacion TI ISTHO
 * @version 3.0.0
 * @date Abril 2026
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { Wallet, User, DollarSign, FileText, ArrowLeftRight, Info } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { cajasMenoresService } from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';
import { cajaMenorSchema } from '../../../utils/validationSchemas';
import { makeSanitizeHandler, SANITIZE } from '../../../utils/sanitizeForms';

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

const formatThousands = (value) => {
  if (!value && value !== 0) return '';
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return '';
  return Math.round(parsed).toLocaleString('es-CO');
};

const parseThousands = (formatted) => {
  const clean = String(formatted).replace(/[^\d]/g, '');
  return clean ? Number(clean) : '';
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD
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
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputClasses = (hasIcon, hasError) => `
  w-full px-4 py-2.5
  bg-white dark:bg-slate-800 border rounded-xl
  text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
  focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
  transition-all duration-200
  ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
  ${hasIcon ? 'pl-10' : ''}
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const CajaMenorForm = ({ open, onClose, onSuccess, cajaId }) => {
  const { success: notifySuccess, error: notifyError, apiError } = useNotification();

  const [loadingData, setLoadingData] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [cajasCerradas, setCajasCerradas] = useState([]);

  const isEditing = !!cajaId;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(cajaMenorSchema),
    defaultValues: {
      asignado_a: '',
      saldo_inicial: '',
      caja_anterior_id: '',
      observaciones: '',
    },
  });

  const watchAsignado = watch('asignado_a');
  const watchCajaAnterior = watch('caja_anterior_id');
  const watchSaldoInicial = watch('saldo_inicial');

  // ──────────────────────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setLoadingData(true);

    const fetchData = async () => {
      try {
        const [usuariosRes, cajasRes] = await Promise.all([
          cajasMenoresService.getUsuariosAsignables(),
          cajasMenoresService.getAll({ estado: 'cerrada' }),
        ]);

        const usrs = usuariosRes?.data?.rows || usuariosRes?.data || [];
        setUsuarios(Array.isArray(usrs) ? usrs : []);

        const cajas = cajasRes?.data?.rows || cajasRes?.data || [];
        setCajasCerradas(Array.isArray(cajas) ? cajas : []);
      } catch (err) {
        console.error('Error cargando datos:', err);
        notifyError('No se pudieron cargar los datos del formulario');
      }

      if (cajaId) {
        try {
          const response = await cajasMenoresService.getById(cajaId);
          if (response.success || response.data) {
            const caja = response.data;
            reset({
              asignado_a: caja.asignado_a || '',
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
        reset({ asignado_a: '', saldo_inicial: '', caja_anterior_id: '', observaciones: '' });
      }

      setLoadingData(false);
    };

    fetchData();
  }, [open, cajaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // CÁLCULOS
  // ──────────────────────────────────────────────────────────────────────────

  const cajaAnteriorSeleccionada = useMemo(() => {
    if (!watchCajaAnterior) return null;
    return cajasCerradas.find((c) => c.id === Number(watchCajaAnterior)) || null;
  }, [watchCajaAnterior, cajasCerradas]);

  const saldoTrasladado = useMemo(() => {
    if (!cajaAnteriorSeleccionada) return 0;
    return parseFloat(cajaAnteriorSeleccionada.saldo_actual) || 0;
  }, [cajaAnteriorSeleccionada]);

  const saldoTotal = useMemo(() => {
    const inicial = parseFloat(watchSaldoInicial) || 0;
    return inicial + saldoTrasladado;
  }, [watchSaldoInicial, saldoTrasladado]);

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const onSubmit = async (data) => {
    try {
      const payload = isEditing
        ? {
            asignado_a: data.asignado_a ? Number(data.asignado_a) : null,
            saldo_inicial: parseFloat(data.saldo_inicial) || 0,
            observaciones: data.observaciones || null,
          }
        : {
            asignado_a: data.asignado_a ? Number(data.asignado_a) : null,
            saldo_inicial: parseFloat(data.saldo_inicial) || 0,
            caja_anterior_id: data.caja_anterior_id ? Number(data.caja_anterior_id) : null,
            observaciones: data.observaciones || null,
          };

      const response = isEditing
        ? await cajasMenoresService.update(cajaId, payload)
        : await cajasMenoresService.create(payload);

      if (response.success !== false) {
        notifySuccess(
          isEditing ? 'Caja menor actualizada correctamente' : 'Caja menor creada correctamente'
        );
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Error guardando caja menor:', err);
      apiError(err);
    }
  };

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
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={loadingData}>
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Usuario Asignado */}
            <InputField label="Usuario Asignado" icon={User} required error={errors.asignado_a?.message}>
              <select
                {...register('asignado_a')}
                disabled={loadingData}
                className={inputClasses(true, !!errors.asignado_a)}
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre_completo || `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username}
                  </option>
                ))}
              </select>
            </InputField>

            {/* Saldo Inicial — input con formato miles */}
            <InputField
              label={saldoTrasladado > 0 && !isEditing ? 'Saldo Inicial (Heredado)' : 'Saldo Inicial'}
              icon={DollarSign}
              required
              error={errors.saldo_inicial?.message}
            >
              <Controller
                name="saldo_inicial"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    value={formatThousands(field.value)}
                    onChange={(e) => field.onChange(parseThousands(e.target.value))}
                    placeholder="0"
                    disabled={loadingData}
                    className={inputClasses(true, !!errors.saldo_inicial)}
                  />
                )}
              />
              {saldoTrasladado > 0 && !isEditing && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <ArrowLeftRight className="w-3 h-3" />
                  Saldo heredado de caja anterior: {formatMoney(saldoTrasladado)}
                </p>
              )}
            </InputField>

            {/* Caja Anterior (traslado de saldo) - solo en creación */}
            {!isEditing && (
              <InputField label="Caja Anterior (Traslado de saldo)" icon={ArrowLeftRight} error={null}>
                <select
                  {...register('caja_anterior_id')}
                  disabled={loadingData}
                  className={inputClasses(true, false)}
                >
                  <option value="">Sin traslado (opcional)</option>
                  {cajasCerradas
                    .filter((c) =>
                      parseFloat(c.saldo_actual) > 0 &&
                      (!watchAsignado || String(c.asignado_a) === String(watchAsignado))
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Caja #{c.numero || c.id} - {c.asignado_nombre || c.asignado?.nombre_completo || 'Sin asignar'} - {formatMoney(c.saldo_actual)}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Opcional. Seleccione una caja cerrada para trasladar su saldo.
                </p>
              </InputField>
            )}

            {/* Observaciones */}
            <div className="md:col-span-2">
              <InputField label="Observaciones" icon={FileText} error={errors.observaciones?.message}>
                <textarea
                  {...register('observaciones')}
                  placeholder="Notas adicionales sobre la caja menor..."
                  rows={3}
                  maxLength={500}
                  disabled={loadingData}
                  onChange={makeSanitizeHandler(setValue, 'observaciones', SANITIZE.TEXTO_LIBRE, 500)}
                  className={inputClasses(true, !!errors.observaciones)}
                />
              </InputField>
            </div>

            {/* Info: saldo a trasladar */}
            {cajaAnteriorSeleccionada && !isEditing && (
              <div className="md:col-span-2 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Saldo a trasladar: <strong>{formatMoney(saldoTrasladado)}</strong>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    De la caja #{cajaAnteriorSeleccionada.id}
                    {cajaAnteriorSeleccionada.asignado_nombre
                      ? ` (${cajaAnteriorSeleccionada.asignado_nombre})`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Info: saldo total calculado */}
            {!isEditing && (parseFloat(watchSaldoInicial) > 0 || saldoTrasladado > 0) && (
              <div className="md:col-span-2 flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <Wallet className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    <strong>Saldo total de la caja:</strong> {formatMoney(saldoTotal)}
                  </p>
                  {saldoTrasladado > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ({formatMoney(watchSaldoInicial || 0)} inicial + {formatMoney(saldoTrasladado)} trasladado)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
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
