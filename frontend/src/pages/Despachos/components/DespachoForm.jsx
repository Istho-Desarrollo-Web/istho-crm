/**
 * ============================================================================
 * ISTHO CRM - DespachoForm Component (Integrado con Backend)
 * ============================================================================
 * Formulario para crear y editar despachos/operaciones.
 * 
 * INTEGRACIÓN v2.0.0:
 * - Carga clientes reales desde API
 * - Carga productos de inventario del cliente seleccionado
 * - Mapeo correcto de campos frontend ↔ backend (snake_case)
 * - Integración con documentos WMS
 * 
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Enero 2026
 */

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Truck, 
  Building2, 
  MapPin, 
  Calendar,
  User,
  Package,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';

import { Button, Modal } from '../../../components/common';

// ════════════════════════════════════════════════════════════════════════════
// SERVICIOS
// ════════════════════════════════════════════════════════════════════════════

import clientesService from '../../../api/clientes.service';
import inventarioService from '../../../api/inventario.service';

// ════════════════════════════════════════════════════════════════════════════
// OPCIONES ESTÁTICAS (Vehículos - TODO: Crear módulo de vehículos)
// ════════════════════════════════════════════════════════════════════════════

const VEHICULOS_OPTIONS = [
  { value: 'ABC-123', label: 'Camión ABC-123 - Furgón 5 Ton', tipo: 'Furgón', conductor: 'Juan Pérez', cedula: '1234567890', celular: '3001234567' },
  { value: 'DEF-456', label: 'Camión DEF-456 - Furgón 10 Ton', tipo: 'Furgón', conductor: 'Carlos García', cedula: '0987654321', celular: '3009876543' },
  { value: 'GHI-789', label: 'Camioneta GHI-789 - Turbo 2 Ton', tipo: 'Turbo', conductor: 'María López', cedula: '1122334455', celular: '3112233445' },
  { value: 'JKL-012', label: 'Tractomula JKL-012 - 30 Ton', tipo: 'Tractomula', conductor: 'Pedro Martínez', cedula: '5544332211', celular: '3155443322' },
];

const TIPOS_OPERACION = [
  { value: 'ingreso', label: 'Ingreso de Mercancía' },
  { value: 'salida', label: 'Salida / Despacho' },
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Línea de Producto
// ════════════════════════════════════════════════════════════════════════════

const ProductoLineItem = ({ item, index, onUpdate, onRemove, productos, loading }) => {
  const productoSeleccionado = productos.find(p => p.id === item.producto_id);
  
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="flex-1 grid grid-cols-12 gap-3 items-center">
        {/* Producto Select */}
        <div className="col-span-5">
          <select
            value={item.producto_id || ''}
            onChange={(e) => {
              const prod = productos.find(p => p.id === parseInt(e.target.value));
              onUpdate(index, {
                producto_id: parseInt(e.target.value) || '',
                sku: prod?.sku || '',
                producto: prod?.nombre || '',
                unidad_medida: prod?.unidad_medida || 'UND',
              });
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-slate-100"
          >
            <option value="">Seleccionar producto...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.nombre}
              </option>
            ))}
          </select>
        </div>
        
        {/* Cantidad */}
        <div className="col-span-2">
          <input
            type="number"
            min="1"
            max={productoSeleccionado?.stock_actual || 99999}
            value={item.cantidad || ''}
            onChange={(e) => onUpdate(index, { cantidad: parseInt(e.target.value) || 0 })}
            placeholder="Cant."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
        
        {/* Unidad */}
        <div className="col-span-2 text-sm text-slate-500">
          {productoSeleccionado?.unidad_medida || item.unidad_medida || '-'}
        </div>
        
        {/* Stock disponible */}
        <div className="col-span-2 text-sm text-slate-500">
          <span className="text-xs text-slate-400">Disp:</span>{' '}
          <span className={productoSeleccionado?.stock_actual < item.cantidad ? 'text-red-500 font-medium' : ''}>
            {productoSeleccionado?.stock_actual?.toLocaleString() || '-'}
          </span>
        </div>
        
        {/* Remove */}
        <div className="col-span-1">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

ProductoLineItem.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  productos: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const DespachoForm = ({
  isOpen,
  onClose,
  onSubmit,
  despacho = null,
  loading = false,
}) => {
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('general');
  
  // Estados de datos del backend
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [dataError, setDataError] = useState(null);
  
  const isEditing = !!despacho;
  
  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR CLIENTES AL ABRIR
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true);
    setDataError(null);
    
    try {
      const response = await clientesService.getActivos();
      
      if (response.success) {
        setClientes(response.data || []);
      } else {
        throw new Error(response.message || 'Error al cargar clientes');
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setDataError('No se pudieron cargar los clientes');
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR PRODUCTOS DEL CLIENTE SELECCIONADO
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchProductos = useCallback(async (clienteId) => {
    if (!clienteId) {
      setProductos([]);
      return;
    }
    
    setLoadingProductos(true);
    
    try {
      // Usar endpoint de inventario por cliente
      const response = await inventarioService.getByCliente(clienteId);
      
      if (response.success) {
        // Filtrar solo productos con stock disponible para salidas
        const productosDisponibles = (response.data || []).filter(p => 
          p.stock_actual > 0 || formData.tipo === 'ingreso'
        );
        setProductos(productosDisponibles);
      } else {
        throw new Error(response.message || 'Error al cargar productos');
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, [formData.tipo]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // EFECTOS
  // ──────────────────────────────────────────────────────────────────────────
  
  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchClientes();
    }
  }, [isOpen, fetchClientes]);
  
  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (despacho) {
        // Modo edición - cargar datos existentes
        setFormData({
          tipo: despacho.tipo || 'salida',
          cliente_id: despacho.cliente_id || despacho.cliente?.id || '',
          destino: despacho.destino || '',
          origen: despacho.origen || '',
          fecha_operacion: despacho.fecha_operacion?.split('T')[0] || new Date().toISOString().split('T')[0],
          hora_estimada: despacho.hora_estimada || '',
          vehiculo_placa: despacho.vehiculo_placa || '',
          vehiculo_tipo: despacho.vehiculo_tipo || '',
          conductor_nombre: despacho.conductor_nombre || '',
          conductor_cedula: despacho.conductor_cedula || '',
          conductor_telefono: despacho.conductor_telefono || '',
          observaciones: despacho.observaciones || '',
          prioridad: despacho.prioridad || 'normal',
          detalles: despacho.detalles || [{ producto_id: '', cantidad: 0, sku: '', producto: '' }],
        });
        
        // Cargar productos del cliente
        if (despacho.cliente_id || despacho.cliente?.id) {
          fetchProductos(despacho.cliente_id || despacho.cliente?.id);
        }
      } else {
        // Modo creación - valores por defecto
        setFormData({
          tipo: 'salida',
          cliente_id: '',
          destino: '',
          origen: 'Centro Logístico Industrial del Norte, Girardota',
          fecha_operacion: new Date().toISOString().split('T')[0],
          hora_estimada: '',
          vehiculo_placa: '',
          vehiculo_tipo: '',
          conductor_nombre: '',
          conductor_cedula: '',
          conductor_telefono: '',
          observaciones: '',
          prioridad: 'normal',
          detalles: [{ producto_id: '', cantidad: 0, sku: '', producto: '' }],
        });
        setProductos([]);
      }
      
      setErrors({});
      setActiveTab('general');
    }
  }, [despacho, isOpen, fetchProductos]);
  
  // Cargar productos cuando cambia el cliente
  useEffect(() => {
    if (formData.cliente_id) {
      fetchProductos(formData.cliente_id);
    }
  }, [formData.cliente_id, fetchProductos]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };
  
  const handleVehiculoChange = (placa) => {
    const vehiculo = VEHICULOS_OPTIONS.find(v => v.value === placa);
    
    setFormData(prev => ({
      ...prev,
      vehiculo_placa: placa,
      vehiculo_tipo: vehiculo?.tipo || '',
      conductor_nombre: vehiculo?.conductor || '',
      conductor_cedula: vehiculo?.cedula || '',
      conductor_telefono: vehiculo?.celular || '',
    }));
    
    if (errors.vehiculo_placa) {
      setErrors(prev => ({ ...prev, vehiculo_placa: null }));
    }
  };
  
  const handleProductoUpdate = (index, updates) => {
    const newDetalles = [...(formData.detalles || [])];
    newDetalles[index] = { ...newDetalles[index], ...updates };
    handleChange('detalles', newDetalles);
  };
  
  const handleProductoRemove = (index) => {
    const newDetalles = formData.detalles.filter((_, i) => i !== index);
    handleChange('detalles', newDetalles.length ? newDetalles : [{ producto_id: '', cantidad: 0 }]);
  };
  
  const handleProductoAdd = () => {
    handleChange('detalles', [
      ...(formData.detalles || []), 
      { producto_id: '', cantidad: 0, sku: '', producto: '' }
    ]);
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // VALIDACIÓN
  // ──────────────────────────────────────────────────────────────────────────
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.tipo) newErrors.tipo = 'Seleccione el tipo de operación';
    if (!formData.cliente_id) newErrors.cliente_id = 'Seleccione un cliente';
    if (!formData.fecha_operacion) newErrors.fecha_operacion = 'Fecha es requerida';
    
    if (formData.tipo === 'salida' && !formData.destino) {
      newErrors.destino = 'Destino es requerido para salidas';
    }
    
    if (!formData.vehiculo_placa) newErrors.vehiculo_placa = 'Seleccione un vehículo';
    
    // Validar productos
    const detallesValidos = formData.detalles?.filter(p => p.producto_id && p.cantidad > 0);
    if (!detallesValidos?.length) {
      newErrors.detalles = 'Agregue al menos un producto con cantidad';
    }
    
    // Validar stock suficiente para salidas
    if (formData.tipo === 'salida' && detallesValidos?.length) {
      const sinStock = detallesValidos.filter(d => {
        const prod = productos.find(p => p.id === d.producto_id);
        return prod && d.cantidad > prod.stock_actual;
      });
      
      if (sinStock.length > 0) {
        newErrors.detalles = 'Algunos productos exceden el stock disponible';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      if (errors.detalles) setActiveTab('productos');
      return;
    }
    
    // Preparar datos para el backend (snake_case)
    const dataToSubmit = {
      tipo: formData.tipo,
      cliente_id: parseInt(formData.cliente_id),
      fecha_operacion: formData.fecha_operacion,
      origen: formData.origen || null,
      destino: formData.destino || null,
      vehiculo_placa: formData.vehiculo_placa,
      vehiculo_tipo: formData.vehiculo_tipo,
      conductor_nombre: formData.conductor_nombre,
      conductor_cedula: formData.conductor_cedula,
      conductor_telefono: formData.conductor_telefono,
      observaciones: formData.observaciones || null,
      prioridad: formData.prioridad,
      // Filtrar detalles vacíos y formatear
      detalles: formData.detalles
        .filter(d => d.producto_id && d.cantidad > 0)
        .map(d => ({
          producto_id: parseInt(d.producto_id),
          sku: d.sku,
          producto: d.producto,
          cantidad: parseInt(d.cantidad),
          unidad_medida: d.unidad_medida || 'UND',
        })),
    };
    
    await onSubmit?.(dataToSubmit);
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // DATOS CALCULADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const clienteSeleccionado = clientes.find(c => c.id === parseInt(formData.cliente_id));
  const vehiculoSeleccionado = VEHICULOS_OPTIONS.find(v => v.value === formData.vehiculo_placa);
  
  const totalProductos = formData.detalles?.filter(d => d.producto_id).length || 0;
  const totalUnidades = formData.detalles?.reduce((sum, d) => sum + (parseInt(d.cantidad) || 0), 0) || 0;
  
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'productos', label: `Productos (${totalProductos})` },
    { id: 'observaciones', label: 'Observaciones' },
  ];
  
  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Operación' : 'Nueva Operación'}
      subtitle={isEditing ? `Editando: ${despacho?.numero_operacion}` : 'Complete la información de la operación'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {isEditing ? 'Guardar Cambios' : 'Crear Operación'}
          </Button>
        </>
      }
    >
      {/* Error de carga de datos */}
      {dataError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{dataError}</span>
          <button 
            onClick={fetchClientes}
            className="ml-auto text-sm underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-100 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                pb-3 px-1 text-sm font-medium transition-colors relative
                ${activeTab === tab.id
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-700'
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
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: General */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tipo de Operación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Operación <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={formData.tipo || ''}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.tipo ? 'border-red-300' : 'border-slate-200'}`}
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS_OPERACION.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo}</p>}
            </div>
            
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                {loadingClientes ? (
                  <div className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-slate-500">Cargando clientes...</span>
                  </div>
                ) : (
                  <select
                    value={formData.cliente_id || ''}
                    onChange={(e) => handleChange('cliente_id', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.cliente_id ? 'border-red-300' : 'border-slate-200'}`}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo_cliente} - {c.razon_social}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {errors.cliente_id && <p className="text-xs text-red-500 mt-1">{errors.cliente_id}</p>}
              {clienteSeleccionado && (
                <p className="text-xs text-slate-500 mt-1">
                  NIT: {clienteSeleccionado.nit}
                </p>
              )}
            </div>
            
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de Operación <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.fecha_operacion || ''}
                  onChange={(e) => handleChange('fecha_operacion', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.fecha_operacion ? 'border-red-300' : 'border-slate-200'}`}
                />
              </div>
              {errors.fecha_operacion && <p className="text-xs text-red-500 mt-1">{errors.fecha_operacion}</p>}
            </div>
            
            {/* Hora Estimada */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hora Estimada
              </label>
              <input
                type="time"
                value={formData.hora_estimada || ''}
                onChange={(e) => handleChange('hora_estimada', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            
            {/* Origen (para salidas) */}
            <div className={formData.tipo === 'ingreso' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Origen {formData.tipo === 'ingreso' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.origen || ''}
                  onChange={(e) => handleChange('origen', e.target.value)}
                  placeholder={formData.tipo === 'ingreso' ? 'Dirección del proveedor' : 'Centro Logístico Industrial del Norte'}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>
            
            {/* Destino (para salidas) */}
            {formData.tipo === 'salida' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Destino <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.destino || ''}
                    onChange={(e) => handleChange('destino', e.target.value)}
                    placeholder="Dirección de entrega"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.destino ? 'border-red-300' : 'border-slate-200'}`}
                  />
                </div>
                {errors.destino && <p className="text-xs text-red-500 mt-1">{errors.destino}</p>}
              </div>
            )}
            
            {/* Vehículo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vehículo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={formData.vehiculo_placa || ''}
                  onChange={(e) => handleVehiculoChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.vehiculo_placa ? 'border-red-300' : 'border-slate-200'}`}
                >
                  <option value="">Seleccionar vehículo...</option>
                  {VEHICULOS_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              {errors.vehiculo_placa && <p className="text-xs text-red-500 mt-1">{errors.vehiculo_placa}</p>}
            </div>
            
            {/* Conductor (auto-llenado) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Conductor
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.conductor_nombre || ''}
                  onChange={(e) => handleChange('conductor_nombre', e.target.value)}
                  placeholder="Se asigna con el vehículo"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50"
                />
              </div>
              {vehiculoSeleccionado && (
                <p className="text-xs text-slate-500 mt-1">
                  CC: {formData.conductor_cedula} • Tel: {formData.conductor_telefono}
                </p>
              )}
            </div>
            
            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prioridad
              </label>
              <select
                value={formData.prioridad || 'normal'}
                onChange={(e) => handleChange('prioridad', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Productos */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'productos' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Productos del {formData.tipo === 'ingreso' ? 'ingreso' : 'despacho'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleProductoAdd}
            >
              Agregar Producto
            </Button>
          </div>
          
          {/* Mensaje si no hay cliente */}
          {!formData.cliente_id && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Seleccione un cliente en la pestaña General para ver los productos disponibles.
            </div>
          )}
          
          {/* Loading productos */}
          {loadingProductos && (
            <div className="p-4 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando productos del cliente...</span>
            </div>
          )}
          
          {/* Error productos */}
          {errors.detalles && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {errors.detalles}
            </p>
          )}
          
          {/* Sin productos disponibles */}
          {formData.cliente_id && !loadingProductos && productos.length === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm text-center">
              No hay productos en inventario para este cliente.
              {formData.tipo === 'salida' && ' Solo se muestran productos con stock disponible.'}
            </div>
          )}
          
          {/* Lista de productos */}
          {formData.cliente_id && productos.length > 0 && (
            <div className="space-y-2">
              {/* Header de columnas */}
              <div className="grid grid-cols-12 gap-3 px-3 text-xs font-medium text-slate-500 uppercase">
                <div className="col-span-5">Producto</div>
                <div className="col-span-2">Cantidad</div>
                <div className="col-span-2">Unidad</div>
                <div className="col-span-2">Stock</div>
                <div className="col-span-1"></div>
              </div>
              
              {formData.detalles?.map((item, index) => (
                <ProductoLineItem
                  key={index}
                  item={item}
                  index={index}
                  onUpdate={handleProductoUpdate}
                  onRemove={handleProductoRemove}
                  productos={productos}
                  loading={loadingProductos}
                />
              ))}
            </div>
          )}
          
          {/* Totales */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="text-sm text-slate-500">
              {productos.length} productos disponibles en inventario
            </div>
            <div className="text-sm space-x-4">
              <span>
                <span className="text-slate-500">Referencias: </span>
                <span className="font-semibold text-slate-800">{totalProductos}</span>
              </span>
              <span>
                <span className="text-slate-500">Total unidades: </span>
                <span className="font-semibold text-slate-800">{totalUnidades.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Observaciones */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'observaciones' && (
        <div className="space-y-4">
          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones || ''}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre la operación..."
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          
          {/* Info del cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Información del Cliente
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Razón Social:</span>{' '}
                  <span className="text-slate-800">{clienteSeleccionado.razon_social}</span>
                </div>
                <div>
                  <span className="text-slate-500">NIT:</span>{' '}
                  <span className="text-slate-800">{clienteSeleccionado.nit}</span>
                </div>
                <div>
                  <span className="text-slate-500">Código:</span>{' '}
                  <span className="text-slate-800">{clienteSeleccionado.codigo_cliente}</span>
                </div>
                <div>
                  <span className="text-slate-500">Sector:</span>{' '}
                  <span className="text-slate-800">{clienteSeleccionado.sector || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

DespachoForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  despacho: PropTypes.object,
  loading: PropTypes.bool,
};

export default DespachoForm;