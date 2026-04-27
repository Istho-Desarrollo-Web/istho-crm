/**
 * ============================================================================
 * ISTHO CRM - MovimientoForm Component
 * ============================================================================
 * Formulario modal para crear y editar movimientos de caja menor.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinacion TI ISTHO
 * @version 3.0.0
 * @date Abril 2026
 */

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Receipt, Wallet, MapPin, DollarSign, FileText, Upload, ArrowUpDown } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import {
  movimientosService,
  cajasMenoresService,
  viajesService,
} from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';
import { useAuth } from '../../../context/AuthContext';
import { getServerFileUrl } from '../../../api/client';
import { movimientoSchema } from '../../../utils/validationSchemas';
import { makeSanitizeHandler, SANITIZE } from '../../../utils/sanitizeForms';

// ════════════════════════════════════════════════════════════════════════════
// OPCIONES ESTÁTICAS
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_MOVIMIENTO = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
];

const CONCEPTOS_EGRESO = [
  { value: 'cuadre_de_caja', label: 'Cuadre de Caja' },
  { value: 'descargues', label: 'Descargues' },
  { value: 'acpm', label: 'ACPM' },
  { value: 'administracion', label: 'Administración' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'comisiones', label: 'Comisiones' },
  { value: 'desencarpe', label: 'Desencarpe' },
  { value: 'encarpe', label: 'Encarpe' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'otros', label: 'Otros' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'repuestos', label: 'Repuestos' },
  { value: 'tecnicomecanica', label: 'Tecnomecánica' },
  { value: 'peajes', label: 'Peajes' },
  { value: 'ligas', label: 'Ligas' },
  { value: 'parqueadero', label: 'Parqueadero' },
  { value: 'urea', label: 'UREA' },
  { value: 'liquidacion', label: 'Liquidación de Caja' },
];

const CONCEPTOS_INGRESO = [
  { value: 'ingreso_adicional', label: 'Ingreso Adicional' },
  { value: 'recarga', label: 'Recarga de Saldo' },
  { value: 'cuadre_de_caja', label: 'Cuadre de Caja' },
  { value: 'peajes_ingreso', label: 'Peajes Ingreso' },
  { value: 'ligas_ingresos', label: 'Ligas Ingresos' },
  { value: 'parqueadero_ingresos', label: 'Parqueadero Ingresos' },
  { value: 'urea_ingresos', label: 'UREA Ingresos' },
];

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

const InputField = ({ label, icon: Icon, required, children, error }) => (
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

const inputCls = (hasIcon = false, hasError = false) =>
  `
  w-full px-4 py-2.5
  bg-white dark:bg-centhrix-card border rounded-xl
  text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
  focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
  transition-all duration-200
  ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
  ${hasIcon ? 'pl-10' : ''}
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const MovimientoForm = ({
  open,
  onClose,
  onSuccess,
  movimientoId,
  defaultCajaId,
  defaultViajeId,
  readOnly = false,
}) => {
  const { success, error: notifyError } = useNotification();
  const { user } = useAuth();

  const [cajas, setCajas] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [soporte, setSoporte] = useState(null);
  const [soporteExistente, setSoporteExistente] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('datos');
  const fileInputRef = useRef(null);

  const isEditing = !!movimientoId;
  const isConductor = user?.rol === 'conductor';

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(movimientoSchema),
    defaultValues: {
      caja_menor_id: defaultCajaId || '',
      viaje_id: defaultViajeId || '',
      tipo_movimiento: '',
      concepto: '',
      concepto_otro: '',
      valor: '',
      descripcion: '',
    },
  });

  const watchCajaId = watch('caja_menor_id');
  const watchTipo = watch('tipo_movimiento');
  const watchConcepto = watch('concepto');

  const cajaSeleccionada = cajas.find((c) => String(c.id) === String(watchCajaId));
  const asignadoEsConductor =
    cajaSeleccionada?.asignado?.rol?.nombre === 'conductor' ||
    cajaSeleccionada?.asignado?.Rol?.nombre === 'conductor' ||
    isConductor;

  const conceptosDisponibles =
    watchTipo === 'ingreso' ? CONCEPTOS_INGRESO : watchTipo === 'egreso' ? CONCEPTOS_EGRESO : [];

  // ──────────────────────────────────────────────────────────────────────────
  // CARGA DE CAJAS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setActiveTab('datos');

    const fetchCajas = async () => {
      try {
        const params = { estado: 'abierta' };
        if (isConductor) params.asignado_a = user.id;
        const response = await cajasMenoresService.getAll(params);
        if (response.success) {
          setCajas(response.data?.rows || response.data || []);
        }
      } catch (err) {
        console.error('Error cargando cajas menores:', err);
      }
    };

    fetchCajas();
  }, [open, isConductor, user?.id]);

  // ──────────────────────────────────────────────────────────────────────────
  // CARGA DE VIAJES según caja
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!watchCajaId) {
      setViajes([]);
      return;
    }

    const fetchViajes = async () => {
      try {
        const params = {};
        if (isConductor) params.conductor_id = user.id;
        else params.caja_menor_id = watchCajaId;
        const response = await viajesService.getAll(params);
        if (response.success) setViajes(response.data?.rows || response.data || []);
      } catch (err) {
        console.error('Error cargando viajes:', err);
      }
    };

    fetchViajes();
  }, [watchCajaId, isConductor, user?.id]);

  // ──────────────────────────────────────────────────────────────────────────
  // CARGA / RESET DEL FORMULARIO
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      reset();
      setSoporte(null);
      setSoporteExistente(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (movimientoId) {
      setLoadingData(true);
      movimientosService
        .getById(movimientoId)
        .then((response) => {
          if (response.success && response.data) {
            const m = response.data;
            reset({
              caja_menor_id: m.caja_menor_id ?? '',
              viaje_id: m.viaje_id ?? '',
              tipo_movimiento: m.tipo_movimiento || '',
              concepto: m.concepto || '',
              concepto_otro: m.concepto_otro || '',
              valor: m.valor != null ? Math.round(parseFloat(m.valor)) : '',
              descripcion: m.descripcion || '',
            });
            if (m.soporte_url)
              setSoporteExistente({
                url: m.soporte_url,
                nombre: m.soporte_nombre || 'Archivo adjunto',
              });
            else setSoporteExistente(null);
          } else {
            notifyError('No se pudo cargar la información del movimiento');
            onClose();
          }
        })
        .catch(() => {
          notifyError('Error al cargar el movimiento');
          onClose();
        })
        .finally(() => setLoadingData(false));
    } else {
      reset({
        caja_menor_id: defaultCajaId || '',
        viaje_id: defaultViajeId || '',
        tipo_movimiento: '',
        concepto: '',
        concepto_otro: '',
        valor: '',
        descripcion: '',
      });
      setSoporte(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, movimientoId, defaultCajaId, defaultViajeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resetear concepto cuando cambia el tipo
  useEffect(() => {
    setValue('concepto', '');
    setValue('concepto_otro', '');
  }, [watchTipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const onSubmit = async (data) => {
    try {
      const fd = new FormData();
      fd.append('caja_menor_id', data.caja_menor_id);
      if (data.viaje_id) fd.append('viaje_id', data.viaje_id);
      fd.append('tipo_movimiento', data.tipo_movimiento);
      fd.append('concepto', data.concepto);
      if (data.concepto === 'otros' && data.concepto_otro)
        fd.append('concepto_otro', data.concepto_otro);
      fd.append('valor', parseFloat(data.valor));
      if (data.descripcion) fd.append('descripcion', data.descripcion);
      if (soporte) fd.append('soporte', soporte);

      const response = isEditing
        ? await movimientosService.update(movimientoId, fd)
        : await movimientosService.create(fd);

      if (response.success) {
        success(
          isEditing ? 'Movimiento actualizado correctamente' : 'Movimiento registrado correctamente'
        );
        onSuccess?.();
        onClose();
      } else {
        notifyError(response.message || 'Error al guardar el movimiento');
      }
    } catch (err) {
      console.error('Error guardando movimiento:', err);
      notifyError(err.response?.data?.message || 'Error al guardar el movimiento');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'datos', label: 'Datos del Movimiento' },
    { id: 'soporte', label: 'Soporte y Descripción' },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={readOnly ? 'Detalle Movimiento' : isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'}
      subtitle={
        readOnly
          ? `Movimiento #${movimientoId}`
          : isEditing
            ? 'Editando movimiento existente'
            : 'Complete la información del movimiento'
      }
      size="lg"
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={loadingData}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </Button>
          </>
        )
      }
    >
      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-100 dark:border-slate-700 mb-6">
            <nav className="flex gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    pb-3 px-1 text-sm font-medium transition-colors relative
                    ${
                      activeTab === tab.id
                        ? 'text-orange-600'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }
                  `}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── TAB DATOS ── */}
            {activeTab === 'datos' && (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${readOnly ? 'pointer-events-none opacity-75' : ''}`}
              >
                {/* Caja Menor */}
                <InputField
                  label="Caja Menor"
                  icon={Wallet}
                  required
                  error={errors.caja_menor_id?.message}
                >
                  <select
                    {...register('caja_menor_id')}
                    className={inputCls(true, !!errors.caja_menor_id)}
                  >
                    <option value="">Seleccionar...</option>
                    {cajas.map((caja) => (
                      <option key={caja.id} value={caja.id}>
                        {caja.numero || `Caja #${caja.id}`}
                      </option>
                    ))}
                  </select>
                </InputField>

                {/* Viaje (solo si el asignado es conductor) */}
                {asignadoEsConductor && (
                  <InputField
                    label="Viaje (Opcional)"
                    icon={MapPin}
                    error={errors.viaje_id?.message}
                  >
                    <select
                      {...register('viaje_id')}
                      disabled={!watchCajaId}
                      className={inputCls(true, !!errors.viaje_id)}
                    >
                      <option value="">Sin viaje asociado</option>
                      {viajes.map((viaje) => (
                        <option key={viaje.id} value={viaje.id}>
                          {viaje.numero || `Viaje #${viaje.id}`}
                          {viaje.destino ? ` - ${viaje.destino}` : ''}
                        </option>
                      ))}
                    </select>
                  </InputField>
                )}

                {/* Tipo de Movimiento */}
                <InputField
                  label="Tipo de Movimiento"
                  icon={ArrowUpDown}
                  required
                  error={errors.tipo_movimiento?.message}
                >
                  <select
                    {...register('tipo_movimiento')}
                    className={inputCls(true, !!errors.tipo_movimiento)}
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_MOVIMIENTO.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                {/* Concepto */}
                <InputField
                  label="Concepto"
                  icon={Receipt}
                  required
                  error={errors.concepto?.message}
                >
                  <select
                    {...register('concepto')}
                    disabled={!watchTipo}
                    className={inputCls(true, !!errors.concepto)}
                  >
                    <option value="">Seleccionar...</option>
                    {conceptosDisponibles.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                {/* Concepto Otro */}
                {watchConcepto === 'otros' && (
                  <InputField
                    label="Especifique el Concepto"
                    icon={FileText}
                    required
                    error={errors.concepto_otro?.message}
                  >
                    <input
                      {...register('concepto_otro')}
                      type="text"
                      placeholder="Describa el concepto..."
                      maxLength={100}
                      onChange={makeSanitizeHandler(
                        setValue,
                        'concepto_otro',
                        SANITIZE.TEXTO_UPPER,
                        100
                      )}
                      className={inputCls(true, !!errors.concepto_otro)}
                    />
                  </InputField>
                )}

                {/* Valor */}
                <InputField label="Valor" icon={DollarSign} required error={errors.valor?.message}>
                  <Controller
                    name="valor"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        value={formatThousands(field.value)}
                        onChange={(e) => field.onChange(parseThousands(e.target.value))}
                        placeholder="0"
                        className={inputCls(true, !!errors.valor)}
                      />
                    )}
                  />
                </InputField>
              </div>
            )}

            {/* ── TAB SOPORTE ── */}
            {activeTab === 'soporte' && (
              <div
                className={`grid grid-cols-1 gap-4 ${readOnly ? '[&_textarea]:pointer-events-none [&_textarea]:opacity-75' : ''}`}
              >
                <InputField label="Descripción" icon={FileText} error={errors.descripcion?.message}>
                  <textarea
                    {...register('descripcion')}
                    placeholder="Notas adicionales sobre el movimiento..."
                    rows={4}
                    maxLength={500}
                    onChange={makeSanitizeHandler(
                      setValue,
                      'descripcion',
                      SANITIZE.TEXTO_LIBRE,
                      500
                    )}
                    className={inputCls(true, !!errors.descripcion)}
                  />
                </InputField>

                {/* Soporte existente */}
                {soporteExistente &&
                  !soporte &&
                  (() => {
                    const soporteUrl = getServerFileUrl(soporteExistente.url);
                    const isImage =
                      soporteExistente.url?.startsWith('data:image/') ||
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(
                        soporteExistente.nombre || soporteExistente.url
                      );
                    return (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Soporte actual
                        </label>
                        {isImage && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-centhrix-bg">
                            <img
                              src={soporteUrl}
                              alt="Soporte"
                              className="w-full max-h-48 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-centhrix-bg border border-slate-200 dark:border-slate-600 rounded-xl">
                          <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          <a
                            href={soporteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={soporteExistente.nombre}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {soporteExistente.nombre}
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                {/* Vista previa nuevo archivo */}
                {soporte && soporte.type?.startsWith('image/') && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vista previa
                    </label>
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-centhrix-bg">
                      <img
                        src={URL.createObjectURL(soporte)}
                        alt="Vista previa"
                        className="w-full max-h-48 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Subir soporte */}
                {!readOnly && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {soporteExistente && !soporte ? 'Reemplazar soporte' : 'Soporte'}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSoporte(e.target.files[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 cursor-pointer w-full px-4 py-3 text-left bg-white dark:bg-centhrix-card border border-dashed rounded-xl text-sm text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-centhrix-surface transition-all duration-200"
                    >
                      <Upload className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {soporte ? soporte.name : 'Seleccionar archivo (PDF, JPG o PNG)'}
                      </span>
                    </button>
                    {soporte && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {(soporte.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSoporte(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </>
      )}
    </Modal>
  );
};

export default MovimientoForm;
