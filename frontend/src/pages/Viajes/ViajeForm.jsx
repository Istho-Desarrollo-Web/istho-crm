/**
 * ISTHO CRM - ViajeForm Page
 * Formulario de página completa para crear y editar viajes.
 * Diseño tipo SalidaAuditoria con secciones card + iconos.
 * @version 3.0.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, MapPin, Truck, User, FileText, DollarSign, Calendar,
  Building2, Weight, Users, Hash, ChevronDown, ChevronUp, Wallet, Loader2
} from 'lucide-react';
import { viajesService, vehiculosService, cajasMenoresService } from '../../api/viajes.service';
import clientesService from '../../api/clientes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatThousands = (value) => {
  if (!value && value !== 0) return '';
  const num = String(value).replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-CO');
};

const parseThousands = (formatted) => {
  const clean = String(formatted).replace(/[^\d]/g, '');
  return clean ? Number(clean) : '';
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENT (estilo SalidaAuditoria)
// ════════════════════════════════════════════════════════════════════════════

const Section = ({ icon: Icon, title, color = 'blue', badge, collapsible, open, onToggle, children }) => {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
          </div>
          {badge}
        </div>
      )}
      {(!collapsible || open) && <div className="px-6 py-5">{children}</div>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FORM FIELD
// ════════════════════════════════════════════════════════════════════════════

const FormField = ({ label, icon: Icon, required, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
      )}
      {children}
    </div>
  </div>
);

const inputCls = (hasIcon = false) =>
  `w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${hasIcon ? 'pl-10' : ''}`;

const selectCls = (hasIcon = false) => `${inputCls(hasIcon)} appearance-none cursor-pointer`;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ViajeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { user } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    vehiculo_id: '', conductor_id: '', cliente_nombre: '', documento_cliente: '',
    origen: 'GIRARDOTA', destino: '', caja_menor_id: '', descripcion: '',
    peso: '', valor_descargue: '', num_personas: '',
    no_factura: '', facturado: false, valor_viaje: '',
  });

  const [vehiculos, setVehiculos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [cajasMenores, setCajasMenores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdicional, setShowAdicional] = useState(false);
  const [showFacturacion, setShowFacturacion] = useState(false);

  const esConductor = user?.rol === 'conductor';

  // Carga inicial
  useEffect(() => {
    const load = async () => {
      try {
        const [vehRes, condRes, cajasRes, clientesRes] = await Promise.all([
          vehiculosService.getAll({ limit: 200 }),
          vehiculosService.getConductores(),
          cajasMenoresService.getAll({ estado: 'abierta', limit: 100 }),
          clientesService.getAll({ estado: 'activo', limit: 100 }),
        ]);
        if (vehRes.success) setVehiculos(vehRes.data || []);
        if (condRes.success) setConductores(condRes.data || []);
        if (cajasRes.success) setCajasMenores(Array.isArray(cajasRes.data) ? cajasRes.data : []);
        if (clientesRes.success) setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : clientesRes.data?.rows || []);
      } catch (err) {
        showError('Error al cargar datos iniciales');
      }

      if (id) {
        try {
          const res = await viajesService.getById(id);
          if (res.success && res.data) {
            const v = res.data;
            setFormData({
              fecha: v.fecha?.split('T')[0] || '', vehiculo_id: v.vehiculo_id || '',
              conductor_id: v.conductor_id || '', cliente_nombre: v.cliente_nombre || '',
              documento_cliente: v.documento_cliente || '', origen: v.origen || 'GIRARDOTA',
              destino: v.destino || '', caja_menor_id: v.caja_menor_id || '',
              descripcion: v.descripcion || '', peso: v.peso ?? '',
              valor_descargue: v.valor_descargue ?? '', num_personas: v.num_personas ?? '',
              no_factura: v.no_factura || '', facturado: v.facturado || false,
              valor_viaje: v.valor_viaje ?? '',
            });
            if (v.peso || v.valor_descargue || v.num_personas) setShowAdicional(true);
            if (v.no_factura || v.facturado || v.valor_viaje) setShowFacturacion(true);
          }
        } catch { showError('Error al cargar viaje'); navigate('/viajes/viajes'); }
      }
      setLoading(false);
    };
    load();
  }, [id]); // eslint-disable-line

  const handleChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  // Auto-fill conductor cuando se selecciona un vehículo con conductor asignado
  const handleVehiculoChange = (vehiculoId) => {
    handleChange('vehiculo_id', vehiculoId);
    if (vehiculoId && !esConductor) {
      const vehiculo = vehiculos.find(v => String(v.id) === String(vehiculoId));
      if (vehiculo?.conductor_id) {
        handleChange('conductor_id', vehiculo.conductor_id);
      }
    }
  };

  // Auto-fill nombre cuando se selecciona un cliente (documento queda vacío para llenarlo manual)
  const handleClienteChange = (clienteId) => {
    const cliente = clientes.find(c => String(c.id) === String(clienteId));
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_nombre: cliente.nombre || cliente.razon_social || '',
        documento_cliente: '',
      }));
    } else {
      setFormData(prev => ({ ...prev, cliente_nombre: '', documento_cliente: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.destino?.trim()) { showError('El destino es requerido'); return; }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        vehiculo_id: formData.vehiculo_id || null,
        conductor_id: formData.conductor_id || null,
        caja_menor_id: formData.caja_menor_id || null,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        valor_descargue: formData.valor_descargue ? parseFloat(formData.valor_descargue) : null,
        num_personas: formData.num_personas ? parseInt(formData.num_personas) : null,
        valor_viaje: formData.valor_viaje ? parseFloat(formData.valor_viaje) : null,
      };

      const response = isEditing
        ? await viajesService.update(id, payload)
        : await viajesService.create(payload);

      if (response.success) {
        success(isEditing ? 'Viaje actualizado' : 'Viaje creado');
        navigate('/viajes/viajes');
      } else {
        showError(response.message || 'Error al guardar');
      }
    } catch (err) {
      showError(err.message || 'Error al guardar el viaje');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pt-28 px-4 pb-32">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── BACK NAV ── */}
        <button
          onClick={() => navigate('/viajes/viajes')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Viajes
        </button>

        {/* ── HEADER CARD ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {isEditing ? `Editar Viaje #${id}` : 'Nuevo Viaje'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isEditing ? 'Modifique los datos del viaje' : 'Complete la información para registrar un nuevo viaje'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/viajes/viajes')}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Viaje'}
              </button>
            </div>
          </div>
        </div>

        {/* ── DATOS BÁSICOS ── */}
        <Section icon={MapPin} title="Datos Básicos" color="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Fecha" icon={Calendar} required>
              <input
                type="date"
                value={formData.fecha}
                onChange={e => handleChange('fecha', e.target.value)}
                className={inputCls(true)}
                required
              />
            </FormField>

            <FormField label="Vehículo" icon={Truck}>
              <select
                value={formData.vehiculo_id}
                onChange={e => handleVehiculoChange(e.target.value)}
                className={selectCls(true)}
              >
                <option value="">Seleccionar vehículo...</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.placa} - {v.tipo_vehiculo}
                    {v.conductor?.nombre_completo ? ` (${v.conductor.nombre_completo})` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Conductor" icon={User}>
              <select
                value={formData.conductor_id}
                onChange={e => handleChange('conductor_id', e.target.value)}
                disabled={esConductor}
                className={`${selectCls(true)} ${esConductor ? 'opacity-60' : ''}`}
              >
                <option value="">Seleccionar conductor...</option>
                {conductores.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_completo || c.username}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Cliente" icon={Building2}>
              <select
                onChange={e => handleClienteChange(e.target.value)}
                className={selectCls(true)}
                value={clientes.find(c => (c.nombre || c.razon_social) === formData.cliente_nombre)?.id || ''}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre || c.razon_social} {c.documento || c.nit ? `- ${c.documento || c.nit}` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Documento del Cliente" icon={FileText}>
              <input
                type="text"
                value={formData.documento_cliente}
                onChange={e => handleChange('documento_cliente', e.target.value)}
                placeholder="Remisión o documento"
                className={inputCls(true)}
              />
            </FormField>

            <FormField label="Origen" icon={MapPin} required>
              <input
                type="text"
                value={formData.origen}
                onChange={e => handleChange('origen', e.target.value.toUpperCase())}
                className={inputCls(true)}
                required
              />
            </FormField>

            <FormField label="Destino" icon={MapPin} required>
              <input
                type="text"
                value={formData.destino}
                onChange={e => handleChange('destino', e.target.value)}
                placeholder="Ciudad destino"
                className={inputCls(true)}
                required
              />
            </FormField>

            <FormField label="Caja Menor" icon={Wallet}>
              <select
                value={formData.caja_menor_id}
                onChange={e => handleChange('caja_menor_id', e.target.value)}
                className={selectCls(true)}
              >
                <option value="">Sin caja menor</option>
                {cajasMenores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero} - {c.conductor?.nombre_completo || c.conductor?.username || ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Descripción" className="md:col-span-2">
              <textarea
                value={formData.descripcion}
                onChange={e => handleChange('descripcion', e.target.value)}
                rows={3}
                placeholder="Notas del viaje..."
                className={inputCls()}
              />
            </FormField>
          </div>
        </Section>

        {/* ── INFORMACIÓN ADICIONAL ── */}
        <Section
          icon={Weight}
          title="Información Adicional"
          color="amber"
          collapsible
          open={showAdicional}
          onToggle={() => setShowAdicional(!showAdicional)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Peso (ton)" icon={Weight}>
              <input
                type="number"
                value={formData.peso}
                onChange={e => handleChange('peso', e.target.value)}
                min={0}
                step={0.01}
                placeholder="0.00"
                className={inputCls(true)}
              />
            </FormField>
            <FormField label="Valor Descargue ($)" icon={DollarSign}>
              <input
                type="text"
                value={formatThousands(formData.valor_descargue)}
                onChange={e => handleChange('valor_descargue', parseThousands(e.target.value))}
                placeholder="0"
                className={inputCls(true)}
              />
            </FormField>
            <FormField label="Nº Personas" icon={Users}>
              <input
                type="number"
                value={formData.num_personas}
                onChange={e => handleChange('num_personas', e.target.value)}
                min={0}
                step={1}
                placeholder="0"
                className={inputCls(true)}
              />
            </FormField>
          </div>
        </Section>

        {/* ── DATOS DE FACTURACIÓN ── */}
        <Section
          icon={DollarSign}
          title="Datos de Facturación"
          color="green"
          collapsible
          open={showFacturacion}
          onToggle={() => setShowFacturacion(!showFacturacion)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Nº Factura" icon={Hash}>
              <input
                type="text"
                value={formData.no_factura}
                onChange={e => handleChange('no_factura', e.target.value)}
                placeholder="Número de factura"
                className={inputCls(true)}
              />
            </FormField>
            <FormField label="Valor del Viaje ($)" icon={DollarSign}>
              <input
                type="text"
                value={formatThousands(formData.valor_viaje)}
                onChange={e => handleChange('valor_viaje', parseThousands(e.target.value))}
                placeholder="0"
                className={inputCls(true)}
              />
            </FormField>
            <FormField label="Facturado">
              <label className="flex items-center gap-3 h-[42px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.facturado}
                  onChange={e => handleChange('facturado', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formData.facturado ? 'Sí' : 'No'}
                </span>
              </label>
            </FormField>
          </div>
        </Section>

      </div>
    </div>
  );
};

export default ViajeForm;
