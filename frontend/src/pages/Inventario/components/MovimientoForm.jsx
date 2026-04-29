/**
 * ============================================================================
 * ISTHO CRM - MovimientoForm
 * ============================================================================
 * Formulario para registrar movimientos de inventario.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Abril 2026
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { X, PackagePlus, PackageMinus, Layers, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/common';
import { movimientoInventarioSchema } from '../../../utils/validationSchemas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN POR TIPO
// ════════════════════════════════════════════════════════════════════════════

const TIPO_CONFIG = {
  entrada: {
    title: 'Registrar Entrada',
    icon: PackagePlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    buttonVariant: 'success',
    buttonText: 'Registrar Entrada',
  },
  salida: {
    title: 'Registrar Salida',
    icon: PackageMinus,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    buttonVariant: 'primary',
    buttonText: 'Registrar Salida',
  },
  ajuste: {
    title: 'Ajuste de Inventario',
    icon: Layers,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    buttonVariant: 'warning',
    buttonText: 'Aplicar Ajuste',
  },
};

const MOTIVOS_ENTRADA = [
  'Compra/Reposición',
  'Devolución de cliente',
  'Transferencia entre bodegas',
  'Ajuste por inventario físico',
  'Producción',
  'Otro',
];

const MOTIVOS_SALIDA = [
  'Venta/Despacho',
  'Devolución a proveedor',
  'Transferencia entre bodegas',
  'Daño/Avería',
  'Vencimiento',
  'Ajuste por inventario físico',
  'Otro',
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const MovimientoForm = ({
  isOpen,
  onClose,
  onSubmit,
  tipo = 'entrada',
  producto,
  loading = false,
}) => {
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.entrada;
  const Icon = config.icon;
  const motivos = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;

  const stockActual = producto?.stock_actual ?? producto?.stockActual ?? producto?.cantidad ?? 0;
  const unidadMedida = producto?.unidad_medida ?? producto?.unidadMedida ?? 'UND';
  const productoNombre = producto?.nombre ?? producto?.producto ?? 'Producto';
  const productoCodigo = producto?.codigo ?? producto?.sku ?? '-';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(movimientoInventarioSchema),
    defaultValues: { cantidad: '', motivo: '', documento_referencia: '', observaciones: '' },
  });

  const watchCantidad = watch('cantidad');

  // ──────────────────────────────────────────────────────────────────────────
  // RESET AL ABRIR
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      reset({ cantidad: '', motivo: '', documento_referencia: '', observaciones: '' });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const submitForm = (data) => {
    if (tipo === 'salida' && data.cantidad > stockActual) {
      setError('cantidad', {
        message: `Stock insuficiente. Disponible: ${stockActual} ${unidadMedida}`,
      });
      return;
    }
    onSubmit({
      cantidad: data.cantidad,
      motivo: data.motivo,
      documento_referencia: data.documento_referencia || '',
      observaciones: data.observaciones || '',
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const parsedCantidad = parseFloat(watchCantidad);
  const showPreview = watchCantidad && !isNaN(parsedCantidad) && !errors.cantidad;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div aria-hidden="true" className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-centhrix-card rounded-2xl shadow-xl w-full max-w-md">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {config.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface/30 rounded-lg"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* INFO PRODUCTO */}
          {producto && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-centhrix-card/50 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{productoNombre}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                    {productoCodigo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Stock Actual</p>
                  <p
                    className={`text-lg font-bold ${stockActual === 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}
                  >
                    {stockActual.toLocaleString()} {unidadMedida}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit(submitForm)} className="p-6 space-y-4" noValidate>
            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cantidad *
              </label>
              <div className="relative">
                <input
                  {...register('cantidad')}
                  type="number"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-centhrix-card/50 dark:text-slate-100 ${
                    errors.cantidad
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="0"
                  min="0.001"
                  step="0.001"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500">
                  {unidadMedida}
                </span>
              </div>
              {errors.cantidad && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.cantidad.message}
                </p>
              )}

              {/* Quick select para salida */}
              {tipo === 'salida' && stockActual > 0 && (
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((percent) => {
                    const value = Math.floor(stockActual * (percent / 100));
                    return (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setValue('cantidad', value.toString())}
                        className="px-2 py-1 text-xs bg-slate-100 dark:bg-centhrix-surface hover:bg-slate-200 dark:hover:bg-centhrix-card text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                      >
                        {percent}% ({value})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Motivo *
              </label>
              <select
                {...register('motivo')}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-centhrix-card/50 dark:text-slate-100 ${
                  errors.motivo
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <option value="">Seleccionar motivo...</option>
                {motivos.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
              {errors.motivo && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.motivo.message}
                </p>
              )}
            </div>

            {/* Documento de referencia */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Documento de Referencia
              </label>
              <input
                {...register('documento_referencia')}
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-centhrix-card/50 dark:text-slate-100"
                placeholder="Ej: OC-2026-001, FAC-12345"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Orden de compra, factura, remisión, etc.
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-centhrix-card/50 dark:text-slate-100 resize-none"
                placeholder="Información adicional..."
              />
            </div>

            {/* Preview resultado */}
            {showPreview && (
              <div className="bg-slate-50 dark:bg-centhrix-card/50 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Resultado del movimiento:
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300">
                      {stockActual.toLocaleString()}
                    </span>
                    <span className={tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}>
                      {tipo === 'entrada' ? '+' : '-'} {parsedCantidad.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    ={' '}
                    {(tipo === 'entrada'
                      ? stockActual + parsedCantidad
                      : stockActual - parsedCantidad
                    ).toLocaleString()}{' '}
                    {unidadMedida}
                  </span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={config.buttonVariant}
                icon={Icon}
                className="flex-1"
                loading={loading}
              >
                {config.buttonText}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MovimientoForm;
