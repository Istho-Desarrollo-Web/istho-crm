/**
 * ============================================================================
 * ISTHO CRM - ProductoForm
 * ============================================================================
 * Formulario para crear/editar productos de inventario.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Abril 2026
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { X, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../../../components/common';
import { useClientesSelector } from '../../../hooks/useClientes';
import { productoSchema } from '../../../utils/validationSchemas';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const CATEGORIAS = [
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'envases', label: 'Envases' },
  { value: 'quimicos', label: 'Químicos' },
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'farmaceutico', label: 'Farmacéutico' },
  { value: 'textil', label: 'Textil' },
  { value: 'tecnologia', label: 'Tecnología' },
];

const UNIDADES = [
  { value: 'UND', label: 'Unidades' },
  { value: 'KG', label: 'Kilogramos' },
  { value: 'LT', label: 'Litros' },
  { value: 'CAJ', label: 'Cajas' },
  { value: 'PAQ', label: 'Paquetes' },
  { value: 'BTO', label: 'Bultos' },
  { value: 'GAL', label: 'Galones' },
];

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const safeParseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;

  let str = String(value).trim();
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts[1] && parts[1].length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  }

  const result = parseFloat(str);
  return isNaN(result) ? null : result;
};

const toInputValue = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = safeParseNumber(val);
  return num !== null ? String(num) : '';
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ProductoForm = ({
  isOpen,
  onClose,
  onSubmit,
  producto = null,
  loading = false,
}) => {
  const isEditing = !!producto;

  const { clientes, loading: loadingClientes, error: errorClientes } = useClientesSelector();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(productoSchema),
    defaultValues: { unidad_medida: 'UND' },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR DATOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    if (producto) {
      reset({
        cliente_id: producto.cliente_id || '',
        sku: producto.sku || producto.codigo || '',
        producto: producto.producto || producto.nombre || '',
        descripcion: producto.descripcion || '',
        categoria: producto.categoria || '',
        unidad_medida: producto.unidad_medida || 'UND',
        stock_minimo: toInputValue(producto.stock_minimo),
        notas: producto.notas || '',
      });
    } else {
      reset({
        cliente_id: '',
        sku: '',
        producto: '',
        descripcion: '',
        categoria: '',
        unidad_medida: 'UND',
        stock_minimo: '',
        notas: '',
      });
    }
  }, [isOpen, producto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const submitForm = (data) => {
    if (!isEditing && !data.cliente_id) {
      setError('cliente_id', { message: 'El cliente es requerido' });
      return;
    }

    const submitData = {
      cliente_id: data.cliente_id ? parseInt(data.cliente_id, 10) : null,
      sku: data.sku?.toUpperCase(),
      producto: data.producto,
      descripcion: data.descripcion || '',
      categoria: data.categoria || '',
      unidad_medida: data.unidad_medida || 'UND',
      stock_minimo: safeParseNumber(data.stock_minimo) ?? 0,
      notas: data.notas || '',
    };

    onSubmit(submitData);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const fieldCls = (hasError) => `
    w-full px-4 py-2.5 border rounded-xl
    focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    dark:bg-centhrix-card/50 dark:text-slate-100
    ${hasError ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-slate-700'}
  `.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-[#1A1B3A] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-[#1A1B3A] z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface/30 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(submitForm)} noValidate className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Nombre del producto */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  {...register('producto')}
                  type="text"
                  placeholder="Nombre del producto"
                  className={fieldCls(!!errors.producto)}
                />
                {errors.producto && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{errors.producto.message}
                  </p>
                )}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Código SKU *
                </label>
                <input
                  {...register('sku')}
                  type="text"
                  placeholder="SKU-001"
                  className={`${fieldCls(!!errors.sku)} font-mono uppercase`}
                />
                {errors.sku && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{errors.sku.message}
                  </p>
                )}
              </div>

              {/* Cliente (solo en creación) */}
              {!isEditing && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Cliente *
                  </label>
                  {loadingClientes ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-centhrix-card/50">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">Cargando clientes...</span>
                    </div>
                  ) : errorClientes ? (
                    <div className="px-4 py-2.5 border border-red-200 rounded-xl bg-red-50">
                      <p className="text-sm text-red-600">Error al cargar clientes: {errorClientes}</p>
                    </div>
                  ) : (
                    <select
                      {...register('cliente_id')}
                      className={fieldCls(!!errors.cliente_id)}
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.codigo_cliente ? `${cliente.codigo_cliente} - ` : ''}
                          {cliente.razon_social || cliente.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.cliente_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{errors.cliente_id.message}
                    </p>
                  )}
                </div>
              )}

              {/* Cliente Info (solo lectura si editando) */}
              {isEditing && producto?.cliente && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Cliente
                  </label>
                  <div className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-centhrix-card/50">
                    <span className="text-slate-700 dark:text-slate-300">
                      {producto.cliente.codigo_cliente ? `${producto.cliente.codigo_cliente} - ` : ''}
                      {producto.cliente.razon_social || producto.cliente.nombre || `Cliente ID: ${producto.cliente_id}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Categoría
                </label>
                <select {...register('categoria')} className={fieldCls(false)}>
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Unidad de medida */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Unidad de Medida
                </label>
                <select {...register('unidad_medida')} className={fieldCls(false)}>
                  {UNIDADES.map((und) => (
                    <option key={und.value} value={und.value}>{und.label}</option>
                  ))}
                </select>
              </div>

              {/* Stock mínimo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Stock Mínimo
                </label>
                <input
                  {...register('stock_minimo')}
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  className={fieldCls(!!errors.stock_minimo)}
                />
                {errors.stock_minimo && (
                  <p className="mt-1 text-sm text-red-500">{errors.stock_minimo.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Descripción
                </label>
                <textarea
                  {...register('descripcion')}
                  rows={2}
                  placeholder="Descripción del producto..."
                  className={`${fieldCls(false)} resize-none`}
                />
              </div>

              {/* Notas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Notas Internas
                </label>
                <textarea
                  {...register('notas')}
                  rows={2}
                  placeholder="Notas internas..."
                  className={`${fieldCls(false)} resize-none`}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Package}
                className="flex-1"
                loading={loading}
                disabled={loadingClientes}
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductoForm;
