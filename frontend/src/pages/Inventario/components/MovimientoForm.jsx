/**
 * ============================================================================
 * ISTHO CRM - MovimientoForm (Versión Corregida)
 * ============================================================================
 * Formulario para registrar movimientos de inventario.
 * Usa snake_case para campos del backend.
 * 
 * CORRECCIONES:
 * - Corregidos errores de sintaxis en template literals
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import { X, PackagePlus, PackageMinus, Layers, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/common';

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
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    cantidad: '',
    motivo: '',
    documento_referencia: '',
    observaciones: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.entrada;
  const Icon = config.icon;
  const motivos = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;

  // Extraer datos del producto con snake_case (compatible con ambos formatos)
  const stockActual = producto?.stock_actual ?? producto?.stockActual ?? producto?.cantidad ?? 0;
  const unidadMedida = producto?.unidad_medida ?? producto?.unidadMedida ?? 'UND';
  const productoNombre = producto?.nombre ?? producto?.producto ?? 'Producto';
  const productoCodigo = producto?.codigo ?? producto?.sku ?? '-';

  // ──────────────────────────────────────────────────────────────────────────
  // RESET FORM AL ABRIR
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setFormData({ 
        cantidad: '', 
        motivo: '', 
        documento_referencia: '', 
        observaciones: '' 
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDACIÓN
  // ──────────────────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    const cantidad = parseFloat(formData.cantidad);
    
    if (!formData.cantidad) {
      newErrors.cantidad = 'La cantidad es requerida';
    } else if (isNaN(cantidad) || cantidad <= 0) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    } else if (tipo === 'salida' && cantidad > stockActual) {
      newErrors.cantidad = `Stock insuficiente. Disponible: ${stockActual} ${unidadMedida}`;
    }

    if (!formData.motivo) {
      newErrors.motivo = 'Selecciona un motivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ cantidad: true, motivo: true });
    
    if (validate()) {
      onSubmit({
        cantidad: parseFloat(formData.cantidad),
        motivo: formData.motivo,
        documento_referencia: formData.documento_referencia,
        observaciones: formData.observaciones,
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
          
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* HEADER */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">{config.title}</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PRODUCT INFO */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {producto && (
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{productoNombre}</p>
                  <p className="text-sm text-slate-500 font-mono">{productoCodigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Stock Actual</p>
                  <p className={`text-lg font-bold ${stockActual === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {stockActual.toLocaleString()} {unidadMedida}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* FORM */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cantidad *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => handleChange('cantidad', e.target.value)}
                  onBlur={() => handleBlur('cantidad')}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.cantidad && touched.cantidad ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="0"
                  min="0.001"
                  step="0.001"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {unidadMedida}
                </span>
              </div>
              {errors.cantidad && touched.cantidad && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.cantidad}
                </p>
              )}
              
              {/* Quick select buttons for salida */}
              {tipo === 'salida' && stockActual > 0 && (
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((percent) => {
                    const value = Math.floor(stockActual * (percent / 100));
                    return (
                      <button 
                        key={percent} 
                        type="button" 
                        onClick={() => handleChange('cantidad', value.toString())}
                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Motivo *
              </label>
              <select
                value={formData.motivo}
                onChange={(e) => handleChange('motivo', e.target.value)}
                onBlur={() => handleBlur('motivo')}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                  errors.motivo && touched.motivo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <option value="">Seleccionar motivo...</option>
                {motivos.map((motivo) => (
                  <option key={motivo} value={motivo}>{motivo}</option>
                ))}
              </select>
              {errors.motivo && touched.motivo && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.motivo}
                </p>
              )}
            </div>

            {/* Documento de referencia */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Documento de Referencia
              </label>
              <input
                type="text"
                value={formData.documento_referencia}
                onChange={(e) => handleChange('documento_referencia', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="Ej: OC-2026-001, FAC-12345"
              />
              <p className="mt-1 text-xs text-slate-400">
                Orden de compra, factura, remisión, etc.
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                placeholder="Información adicional..."
              />
            </div>

            {/* Preview del resultado */}
            {formData.cantidad && !errors.cantidad && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-2">Resultado del movimiento:</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{stockActual.toLocaleString()}</span>
                    <span className={tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}>
                      {tipo === 'entrada' ? '+' : '-'} {parseFloat(formData.cantidad).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">
                    = {(tipo === 'entrada' 
                      ? stockActual + parseFloat(formData.cantidad)
                      : stockActual - parseFloat(formData.cantidad)
                    ).toLocaleString()} {unidadMedida}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
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