/**
 * ============================================================================
 * ISTHO CRM - MovimientoForm Component
 * ============================================================================
 * Formulario modal para crear y editar movimientos de caja menor.
 * Sigue el mismo patrón de diseño que VehiculoForm / ClienteForm.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useRef } from 'react';
import { Receipt, Wallet, MapPin, DollarSign, FileText, Upload, ArrowUpDown } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { movimientosService, cajasMenoresService, viajesService } from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';
import { useAuth } from '../../../context/AuthContext';

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
];

const CONCEPTOS_INGRESO = [
  { value: 'ingreso_adicional', label: 'Ingreso Adicional' },
  { value: 'cuadre_de_caja', label: 'Cuadre de Caja' },
  { value: 'peajes_ingreso', label: 'Peajes Ingreso' },
  { value: 'ligas_ingresos', label: 'Ligas Ingresos' },
  { value: 'parqueadero_ingresos', label: 'Parqueadero Ingresos' },
  { value: 'urea_ingresos', label: 'UREA Ingresos' },
];

const INITIAL_FORM = {
  caja_menor_id: '',
  viaje_id: '',
  tipo_movimiento: '',
  concepto: '',
  concepto_otro: '',
  valor: '',
  descripcion: '',
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD (mismo patrón que VehiculoForm / ClienteForm)
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
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const MovimientoForm = ({ open, onClose, onSuccess, movimientoId, defaultCajaId, defaultViajeId }) => {
  const { success, error } = useNotification();
  const { user } = useAuth();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [cajas, setCajas] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [soporte, setSoporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('datos');
  const fileInputRef = useRef(null);

  const isEditing = !!movimientoId;
  const isConductor = user?.rol === 'conductor';

  const conceptosDisponibles = formData.tipo_movimiento === 'ingreso'
    ? CONCEPTOS_INGRESO
    : formData.tipo_movimiento === 'egreso'
      ? CONCEPTOS_EGRESO
      : [];

  const inputClasses = (hasIcon = false, hasError = false) => `
    w-full px-4 py-2.5
    bg-white dark:bg-slate-800 border rounded-xl
    text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    transition-all duration-200
    ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
    ${hasIcon ? 'pl-10' : ''}
  `;

  // ──────────────────────────────────────────────────────────────────────────
  // EFECTOS
  // ──────────────────────────────────────────────────────────────────────────

  // Cargar cajas menores al abrir
  useEffect(() => {
    if (!open) return;

    setActiveTab('datos');

    const fetchCajas = async () => {
      try {
        const params = { estado: 'abierta' };
        if (isConductor) params.conductor_id = user.id;
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

  // Cargar viajes cuando cambia la caja menor
  useEffect(() => {
    if (!formData.caja_menor_id) {
      setViajes([]);
      return;
    }

    const fetchViajes = async () => {
      try {
        const response = await viajesService.getAll({ caja_menor_id: formData.caja_menor_id });
        if (response.success) {
          setViajes(response.data?.rows || response.data || []);
        }
      } catch (err) {
        console.error('Error cargando viajes:', err);
      }
    };

    fetchViajes();
  }, [formData.caja_menor_id]);

  // Cargar datos del movimiento en modo edición o resetear
  useEffect(() => {
    if (!open) {
      setFormData(INITIAL_FORM);
      setSoporte(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (movimientoId) {
      const fetchMovimiento = async () => {
        setLoadingData(true);
        try {
          const response = await movimientosService.getById(movimientoId);
          if (response.success && response.data) {
            const m = response.data;
            setFormData({
              caja_menor_id: m.caja_menor_id ?? '',
              viaje_id: m.viaje_id ?? '',
              tipo_movimiento: m.tipo_movimiento || '',
              concepto: m.concepto || '',
              concepto_otro: m.concepto_otro || '',
              valor: m.valor ?? '',
              descripcion: m.descripcion || '',
            });
          } else {
            error('No se pudo cargar la información del movimiento');
            onClose();
          }
        } catch (err) {
          console.error('Error cargando movimiento:', err);
          error('Error al cargar el movimiento');
          onClose();
        } finally {
          setLoadingData(false);
        }
      };

      fetchMovimiento();
    } else {
      setFormData({
        ...INITIAL_FORM,
        caja_menor_id: defaultCajaId || '',
        viaje_id: defaultViajeId || '',
      });
      setSoporte(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, movimientoId, defaultCajaId, defaultViajeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Resetear concepto cuando cambia el tipo de movimiento
      if (name === 'tipo_movimiento') {
        updated.concepto = '';
        updated.concepto_otro = '';
      }

      // Limpiar viaje_id si cambia la caja
      if (name === 'caja_menor_id') {
        updated.viaje_id = '';
      }

      return updated;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSoporte(file);
    }
  };

  const formatMoney = (value) => {
    if (!value && value !== 0) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('es-CO');
  };

  const handleValorChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setFormData((prev) => ({ ...prev, valor: raw ? Number(raw) : '' }));
  };

  const formatThousands = (value) => {
    if (!value && value !== 0) return '';
    const num = String(value).replace(/[^\d]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('es-CO');
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.caja_menor_id) {
      error('Debe seleccionar una caja menor');
      return;
    }
    if (!formData.tipo_movimiento) {
      error('Debe seleccionar el tipo de movimiento');
      return;
    }
    if (!formData.concepto) {
      error('Debe seleccionar un concepto');
      return;
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      error('Debe ingresar un valor válido');
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('caja_menor_id', formData.caja_menor_id);
      if (formData.viaje_id) fd.append('viaje_id', formData.viaje_id);
      fd.append('tipo_movimiento', formData.tipo_movimiento);
      fd.append('concepto', formData.concepto);
      if (formData.concepto === 'otros' && formData.concepto_otro) {
        fd.append('concepto_otro', formData.concepto_otro);
      }
      fd.append('valor', parseFloat(formData.valor));
      if (formData.descripcion) fd.append('descripcion', formData.descripcion);
      if (soporte) fd.append('soporte', soporte);

      let response;
      if (isEditing) {
        response = await movimientosService.update(movimientoId, fd);
      } else {
        response = await movimientosService.create(fd);
      }

      if (response.success) {
        success(isEditing ? 'Movimiento actualizado correctamente' : 'Movimiento registrado correctamente');
        onSuccess?.();
        onClose();
      } else {
        error(response.message || 'Error al guardar el movimiento');
      }
    } catch (err) {
      console.error('Error guardando movimiento:', err);
      error(err.response?.data?.message || 'Error al guardar el movimiento');
    } finally {
      setLoading(false);
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
      title={isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'}
      subtitle={isEditing ? 'Editando movimiento existente' : 'Complete la información del movimiento'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loadingData}>
            {isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
          </Button>
        </>
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
                    ${activeTab === tab.id
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

          {/* Tab 1: Datos del Movimiento */}
          {activeTab === 'datos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Caja Menor */}
              <InputField label="Caja Menor" icon={Wallet} required>
                <select
                  name="caja_menor_id"
                  value={formData.caja_menor_id}
                  onChange={handleChange}
                  className={inputClasses(true)}
                >
                  <option value="">Seleccionar...</option>
                  {cajas.map((caja) => (
                    <option key={caja.id} value={caja.id}>
                      {caja.numero || `Caja #${caja.id}`}
                    </option>
                  ))}
                </select>
              </InputField>

              {/* Viaje (Opcional) */}
              <InputField label="Viaje (Opcional)" icon={MapPin}>
                <select
                  name="viaje_id"
                  value={formData.viaje_id}
                  onChange={handleChange}
                  disabled={!formData.caja_menor_id}
                  className={inputClasses(true)}
                >
                  <option value="">Sin viaje asociado</option>
                  {viajes.map((viaje) => (
                    <option key={viaje.id} value={viaje.id}>
                      {viaje.numero || `Viaje #${viaje.id}`}{viaje.destino ? ` - ${viaje.destino}` : ''}
                    </option>
                  ))}
                </select>
              </InputField>

              {/* Tipo de Movimiento */}
              <InputField label="Tipo de Movimiento" icon={ArrowUpDown} required>
                <select
                  name="tipo_movimiento"
                  value={formData.tipo_movimiento}
                  onChange={handleChange}
                  className={inputClasses(true)}
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
              <InputField label="Concepto" icon={Receipt} required>
                <select
                  name="concepto"
                  value={formData.concepto}
                  onChange={handleChange}
                  disabled={!formData.tipo_movimiento}
                  className={inputClasses(true)}
                >
                  <option value="">Seleccionar...</option>
                  {conceptosDisponibles.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </InputField>

              {/* Concepto Otro (solo si concepto === 'otros') */}
              {formData.concepto === 'otros' && (
                <InputField label="Especifique el Concepto" icon={FileText} required>
                  <input
                    type="text"
                    name="concepto_otro"
                    value={formData.concepto_otro}
                    onChange={handleChange}
                    placeholder="Describa el concepto..."
                    className={inputClasses(true)}
                  />
                </InputField>
              )}

              {/* Valor */}
              <InputField label="Valor" icon={DollarSign} required>
                <input
                  type="text"
                  name="valor"
                  value={formatThousands(formData.valor)}
                  onChange={handleValorChange}
                  placeholder="0"
                  className={inputClasses(true)}
                />
              </InputField>
            </div>
          )}

          {/* Tab 2: Soporte y Descripción */}
          {activeTab === 'soporte' && (
            <div className="grid grid-cols-1 gap-4">
              {/* Descripción */}
              <InputField label="Descripción" icon={FileText}>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Notas adicionales sobre el movimiento..."
                  rows={4}
                  className={inputClasses(true)}
                />
              </InputField>

              {/* Soporte (archivo) */}
              <InputField label="Soporte" icon={Upload}>
                <label
                  className={`
                    flex items-center gap-3 cursor-pointer
                    w-full px-4 py-3 pl-10
                    bg-white dark:bg-slate-800 border border-dashed rounded-xl
                    text-sm text-slate-500 dark:text-slate-400
                    border-slate-200 dark:border-slate-600
                    hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700
                    transition-all duration-200
                  `}
                >
                  <span className="truncate">
                    {soporte ? soporte.name : 'Seleccionar archivo (PDF, JPG o PNG)'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    ref={fileInputRef}
                    className="hidden"
                  />
                </label>
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
              </InputField>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default MovimientoForm;
