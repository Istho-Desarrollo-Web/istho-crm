/**
 * ============================================================================
 * ISTHO CRM - ProductoForm
 * ============================================================================
 * Formulario para crear/editar productos de inventario.
 * Usa snake_case para campos del backend.
 * 
 * CORRECCIÓN v2.2.0:
 * - FIX: Conversión de números robusta (evita x10 bug)
 * - Carga clientes desde el backend con useClientesSelector
 * - Selector de cliente en lugar de input de texto
 * 
 * @author Coordinación TI ISTHO
 * @version 2.2.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../../../components/common';
import { useClientesSelector } from '../../../hooks/useClientes';

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

const ZONAS = [
  { value: 'BOD-01', label: 'Área 01 - Refrigerados' },
  { value: 'BOD-02', label: 'Área 02 - Secos' },
  { value: 'BOD-03', label: 'Área 03 - Químicos' },
  { value: 'BOD-04', label: 'Área 04 - Construcción' },
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

const ESTADOS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'cuarentena', label: 'En Cuarentena' },
];

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE CONVERSIÓN NUMÉRICA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un string a número de forma segura
 * Maneja diferentes formatos de locale (comas, puntos)
 * @param {string|number} value - Valor a convertir
 * @returns {number|null} - Número convertido o null si no es válido
 */
const safeParseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Si ya es número, retornarlo directamente
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  // Convertir a string y limpiar
  let strValue = String(value).trim();
  
  // Remover cualquier separador de miles (puntos en formato colombiano)
  // y reemplazar coma decimal por punto
  // Detectar formato: si tiene punto y luego coma, es formato europeo
  // Si tiene coma y luego punto, es formato americano
  
  const hasComma = strValue.includes(',');
  const hasDot = strValue.includes('.');
  
  if (hasComma && hasDot) {
    // Formato mixto - determinar cuál es decimal
    const lastComma = strValue.lastIndexOf(',');
    const lastDot = strValue.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato europeo: 1.000,50 → 1000.50
      strValue = strValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,000.50 → 1000.50
      strValue = strValue.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Solo coma - podría ser decimal o miles
    // Si tiene exactamente 3 dígitos después de la coma, asumir miles
    const parts = strValue.split(',');
    if (parts[1] && parts[1].length === 3 && !parts[1].includes('.')) {
      // Probablemente separador de miles: 1,000 → 1000
      strValue = strValue.replace(/,/g, '');
    } else {
      // Probablemente decimal: 1,5 → 1.5
      strValue = strValue.replace(',', '.');
    }
  }
  // Si solo tiene puntos, dejarlo como está (formato americano o decimal)
  
  const result = parseFloat(strValue);
  return isNaN(result) ? null : result;
};

/**
 * Convierte un valor a entero de forma segura
 * @param {string|number} value - Valor a convertir
 * @returns {number|null} - Entero convertido o null
 */
const safeParseInt = (value) => {
  const num = safeParseNumber(value);
  return num !== null ? Math.round(num) : null;
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ProductoForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  producto = null,
  loading = false 
}) => {
  const isEditing = !!producto;
  
  // ✅ Cargar clientes desde el backend
  const { 
    clientes, 
    loading: loadingClientes, 
    error: errorClientes 
  } = useClientesSelector();

  const [formData, setFormData] = useState({
    cliente_id: '',
    sku: '',
    codigo_barras: '',
    producto: '',
    descripcion: '',
    categoria: '',
    unidad_medida: 'UND',
    cantidad: '',
    stock_minimo: '',
    stock_maximo: '',
    ubicacion: '',
    zona: '',
    lote: '',
    fecha_vencimiento: '',
    costo_unitario: '',
    estado: 'disponible',
    notas: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Cargar datos del producto si estamos editando
  useEffect(() => {
    if (isOpen && producto) {
      // ✅ Convertir números a string para el input, sin formateo de locale
      const toInputValue = (val) => {
        if (val === null || val === undefined || val === '') return '';
        const num = safeParseNumber(val);
        return num !== null ? String(num) : '';
      };

      setFormData({
        cliente_id: producto.cliente_id || '',
        sku: producto.sku || producto.codigo || '',
        codigo_barras: producto.codigo_barras || '',
        producto: producto.producto || producto.nombre || '',
        descripcion: producto.descripcion || '',
        categoria: producto.categoria || '',
        unidad_medida: producto.unidad_medida || 'UND',
        cantidad: toInputValue(producto.cantidad ?? producto.stock_actual),
        stock_minimo: toInputValue(producto.stock_minimo),
        stock_maximo: toInputValue(producto.stock_maximo),
        ubicacion: producto.ubicacion || '',
        zona: producto.zona || producto.bodega || '',
        lote: producto.lote || '',
        fecha_vencimiento: producto.fecha_vencimiento ? producto.fecha_vencimiento.split('T')[0] : '',
        costo_unitario: toInputValue(producto.costo_unitario),
        estado: producto.estado || 'disponible',
        notas: producto.notas || '',
      });
      setErrors({});
      setTouched({});
    } else if (isOpen) {
      // Reset form para nuevo producto
      setFormData({
        cliente_id: '',
        sku: '',
        codigo_barras: '',
        producto: '',
        descripcion: '',
        categoria: '',
        unidad_medida: 'UND',
        cantidad: '',
        stock_minimo: '',
        stock_maximo: '',
        ubicacion: '',
        zona: '',
        lote: '',
        fecha_vencimiento: '',
        costo_unitario: '',
        estado: 'disponible',
        notas: '',
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen, producto]);

  const validate = () => {
    const newErrors = {};

    if (!formData.producto.trim()) {
      newErrors.producto = 'El nombre del producto es requerido';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'El código SKU es requerido';
    }

    if (!isEditing && !formData.cliente_id) {
      newErrors.cliente_id = 'El cliente es requerido';
    }

    // Validar que los campos numéricos sean válidos
    if (formData.cantidad && safeParseNumber(formData.cantidad) === null) {
      newErrors.cantidad = 'La cantidad debe ser un número válido';
    }

    if (formData.stock_minimo && safeParseNumber(formData.stock_minimo) === null) {
      newErrors.stock_minimo = 'El stock mínimo debe ser un número válido';
    }

    if (formData.stock_maximo && safeParseNumber(formData.stock_maximo) === null) {
      newErrors.stock_maximo = 'El stock máximo debe ser un número válido';
    }

    if (formData.costo_unitario && safeParseNumber(formData.costo_unitario) === null) {
      newErrors.costo_unitario = 'El costo debe ser un número válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({
      producto: true,
      sku: true,
      cliente_id: true,
    });

    if (validate()) {
      // ✅ CORRECCIÓN: Usar safeParseNumber para conversión robusta
      const submitData = {
        ...formData,
        cliente_id: formData.cliente_id ? safeParseInt(formData.cliente_id) : null,
        cantidad: safeParseNumber(formData.cantidad) ?? 0,
        stock_minimo: safeParseNumber(formData.stock_minimo) ?? 0,
        stock_maximo: safeParseNumber(formData.stock_maximo),
        costo_unitario: safeParseNumber(formData.costo_unitario),
      };

      // ✅ DEBUG: Log para verificar qué se envía
      console.log('📦 ProductoForm - Datos a enviar:', {
        original: {
          stock_minimo: formData.stock_minimo,
          stock_maximo: formData.stock_maximo,
        },
        converted: {
          stock_minimo: submitData.stock_minimo,
          stock_maximo: submitData.stock_maximo,
        }
      });

      onSubmit(submitData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Nombre del producto */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.producto}
                  onChange={(e) => handleChange('producto', e.target.value)}
                  onBlur={() => handleBlur('producto')}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.producto && touched.producto ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Nombre del producto"
                />
                {errors.producto && touched.producto && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{errors.producto}
                  </p>
                )}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Código SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('sku')}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono ${
                    errors.sku && touched.sku ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="SKU-001"
                />
                {errors.sku && touched.sku && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{errors.sku}
                  </p>
                )}
              </div>

              {/* Código de barras */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={formData.codigo_barras}
                  onChange={(e) => handleChange('codigo_barras', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  placeholder="7701234567890"
                />
              </div>

              {/* ✅ Cliente - Selector desde Backend (Solo para nuevo) */}
              {!isEditing && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cliente *
                  </label>
                  {loadingClientes ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-slate-50">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span className="text-sm text-slate-500">Cargando clientes...</span>
                    </div>
                  ) : errorClientes ? (
                    <div className="px-4 py-2.5 border border-red-200 rounded-xl bg-red-50">
                      <p className="text-sm text-red-600">Error al cargar clientes: {errorClientes}</p>
                    </div>
                  ) : (
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => handleChange('cliente_id', e.target.value)}
                      onBlur={() => handleBlur('cliente_id')}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                        errors.cliente_id && touched.cliente_id ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
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
                  {errors.cliente_id && touched.cliente_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{errors.cliente_id}
                    </p>
                  )}
                </div>
              )}

              {/* Cliente Info (Solo lectura si editando) */}
              {isEditing && producto?.cliente && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cliente
                  </label>
                  <div className="px-4 py-2.5 border border-gray-200 rounded-xl bg-slate-50">
                    <span className="text-slate-700">
                      {producto.cliente.codigo_cliente ? `${producto.cliente.codigo_cliente} - ` : ''}
                      {producto.cliente.razon_social || producto.cliente.nombre || `Cliente ID: ${producto.cliente_id}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Categoría
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Unidad de medida */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Unidad de Medida
                </label>
                <select
                  value={formData.unidad_medida}
                  onChange={(e) => handleChange('unidad_medida', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {UNIDADES.map((und) => (
                    <option key={und.value} value={und.value}>{und.label}</option>
                  ))}
                </select>
              </div>

              {/* Zona/Bodega */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Zona/Bodega
                </label>
                <select
                  value={formData.zona}
                  onChange={(e) => handleChange('zona', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Seleccionar zona</option>
                  {ZONAS.map((zona) => (
                    <option key={zona.value} value={zona.value}>{zona.label}</option>
                  ))}
                </select>
              </div>

              {/* Ubicación (solo en creación) */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => handleChange('ubicacion', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                    placeholder="A1-B2-C3"
                  />
                </div>
              )}

              {/* Cantidad inicial (solo nuevo) */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cantidad Inicial
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.cantidad}
                    onChange={(e) => handleChange('cantidad', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                      errors.cantidad ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="0"
                  />
                  {errors.cantidad && (
                    <p className="mt-1 text-sm text-red-500">{errors.cantidad}</p>
                  )}
                </div>
              )}

              {/* Stock mínimo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Stock Mínimo
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.stock_minimo}
                  onChange={(e) => handleChange('stock_minimo', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.stock_minimo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="0"
                />
                {errors.stock_minimo && (
                  <p className="mt-1 text-sm text-red-500">{errors.stock_minimo}</p>
                )}
              </div>

              {/* Stock máximo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Stock Máximo
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.stock_maximo}
                  onChange={(e) => handleChange('stock_maximo', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.stock_maximo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="0"
                />
                {errors.stock_maximo && (
                  <p className="mt-1 text-sm text-red-500">{errors.stock_maximo}</p>
                )}
              </div>

              {/* Costo unitario */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Costo Unitario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.costo_unitario}
                    onChange={(e) => handleChange('costo_unitario', e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                      errors.costo_unitario ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="0"
                  />
                </div>
                {errors.costo_unitario && (
                  <p className="mt-1 text-sm text-red-500">{errors.costo_unitario}</p>
                )}
              </div>

              {/* Lote */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Lote
                </label>
                <input
                  type="text"
                  value={formData.lote}
                  onChange={(e) => handleChange('lote', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  placeholder="LOTE-2026-001"
                />
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleChange('fecha_vencimiento', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {ESTADOS.map((est) => (
                    <option key={est.value} value={est.value}>{est.label}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Descripción del producto..."
                />
              </div>

              {/* Notas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notas Internas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => handleChange('notas', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Notas internas..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
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