/**
 * ============================================================================
 * ISTHO CRM - SalidaAuditoria (Vista de Auditoría de Salida/Despacho)
 * ============================================================================
 * Pantalla completa de verificación de un documento de salida del WMS.
 * Incluye: Stepper de estado, líneas interactivas, formulario logístico,
 * y zona de carga de evidencias.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Trash2,
  Check,
  X,
  Upload,
  FileText,
  Image,
  Building2,
  Truck,
  User,
  CreditCard,
  Phone,
  MapPin,
  MessageSquare,
  Shield,
  Eye,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Plus,
  Mail,
} from 'lucide-react';

import auditoriasService from '../../../api/auditorias.service';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import CierreAuditoriaModal from '../../../components/common/CierreAuditoriaModal';

const SERVER_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const resolveFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${SERVER_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS STEPPER
// ════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { key: 'pendiente', label: 'Pendiente', icon: Clock, description: 'Documento recibido del WMS' },
  { key: 'en_proceso', label: 'En Proceso', icon: Loader2, description: 'Verificando líneas y datos' },
  { key: 'cerrado', label: 'Cerrado', icon: CheckCircle2, description: 'Auditoría completada' },
];

const StatusStepper = ({ currentStatus }) => {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : isCurrent
                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className={`w-6 h-6 ${isCurrent && step.key === 'en_proceso' ? 'animate-spin' : ''}`} />
                )}
              </div>
              <p className={`mt-2 text-xs font-semibold ${
                isCompleted ? 'text-emerald-600 dark:text-emerald-400'
                  : isCurrent ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {step.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                {step.description}
              </p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-24px] transition-all duration-500 ${
                idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ════════════════════════════════════════════════════════════════════════════

const SECTION_COLORS = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-600 dark:text-amber-400' },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-600 dark:text-violet-400' },
  slate:   { bg: 'bg-slate-100 dark:bg-slate-900/30',   text: 'text-slate-600 dark:text-slate-400' },
};

const Section = ({ title, icon: Icon, children, badge, color = 'blue' }) => {
  const styles = SECTION_COLORS[color] || SECTION_COLORS.blue;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${styles.bg}`}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD
// ════════════════════════════════════════════════════════════════════════════

const FormField = ({ icon: Icon, label, value, onChange, placeholder, required, type = 'text', disabled }) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      <Icon className="w-4 h-4 text-slate-400" />
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// LIGHTBOX MODAL
// ════════════════════════════════════════════════════════════════════════════

const Lightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
        <X className="w-6 h-6" />
      </button>
      <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FILE PREVIEW GALLERY
// ════════════════════════════════════════════════════════════════════════════

const FilePreviewGallery = ({ files, onRemoveFile, readOnly = false }) => {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const previews = useMemo(() =>
    files.map((file) => {
      const type = file.type || '';
      const isImage = type.startsWith('image/');
      const isPdf = type === 'application/pdf';
      const nativeFile = file instanceof File ? file : file._nativeFile;
      let url = null;
      let isBlob = false;
      if (nativeFile && isImage) {
        url = URL.createObjectURL(nativeFile);
        isBlob = true;
      } else if (file.isUploaded && file.url) {
        url = file.url;
      }
      return { file, url, isImage, isPdf, isBlob };
    }),
  [files]);

  useEffect(() => {
    return () => previews.forEach((p) => p.isBlob && p.url && URL.revokeObjectURL(p.url));
  }, [previews]);

  const pdfFiles = previews.filter((p) => p.isPdf);
  const imageFiles = previews.filter((p) => p.isImage);

  if (files.length === 0 && readOnly) {
    return <p className="text-sm text-slate-400 text-center py-4">No hay evidencias adjuntas.</p>;
  }

  return (
    <div className="space-y-4">
      {lightboxIdx !== null && imageFiles[lightboxIdx] && (
        <Lightbox src={imageFiles[lightboxIdx].url} alt={imageFiles[lightboxIdx].file.name} onClose={() => setLightboxIdx(null)} />
      )}

      {pdfFiles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Documento PDF</p>
          {pdfFiles.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.file.name}</p>
                  <p className="text-xs text-slate-400">{(p.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { const native = p.file instanceof File ? p.file : p.file._nativeFile; const pdfUrl = native ? URL.createObjectURL(native) : p.file.url; window.open(pdfUrl, '_blank'); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ver PDF">
                  <Eye className="w-4 h-4" />
                </button>
                {!readOnly && (
                  <button onClick={() => onRemoveFile(files.indexOf(p.file))} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {imageFiles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Fotografías</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {imageFiles.map((p, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                <img src={p.url} alt={p.file.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2">
                  <button onClick={() => setLightboxIdx(idx)} className="p-2 bg-white/90 rounded-lg text-slate-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" title="Ver imagen">
                    <Eye className="w-4 h-4" />
                  </button>
                  {!readOnly && (
                    <button onClick={() => onRemoveFile(files.indexOf(p.file))} className="p-2 bg-red-500/90 rounded-lg text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" title="Eliminar">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[10px] text-white truncate">{p.file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// DROPZONE COMPONENT (Improved with type separation)
// ════════════════════════════════════════════════════════════════════════════

const EvidenceDropzone = ({ files, onAddFiles, onRemoveFile, maxPhotos = 5 }) => {
  const [dragActive, setDragActive] = useState({ pdf: false, photos: false });
  const pdfInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const pdfFiles = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  const imageFiles = files.filter((f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name));

  const onDrag = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };

  const onDrop = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(type, [...e.dataTransfer.files]);
    }
  };

  const handleFiles = (type, newFiles) => {
    const validFiles = [];
    if (type === 'pdf') {
      const pdf = newFiles.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdf && pdfFiles.length === 0) validFiles.push(pdf);
    } else {
      const photos = newFiles.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name));
      const remaining = maxPhotos - imageFiles.length;
      validFiles.push(...photos.slice(0, remaining));
    }
    
    if (validFiles.length > 0) onAddFiles(validFiles);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* PDF Upload Area */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-500" />
          Documento Supporte (PDF)
        </label>
        
        <div
          onDragEnter={onDrag('pdf')}
          onDragLeave={onDrag('pdf')}
          onDragOver={onDrag('pdf')}
          onDrop={onDrop('pdf')}
          onClick={() => pdfFiles.length === 0 && pdfInputRef.current?.click()}
          className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            pdfFiles.length > 0
              ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10'
              : dragActive.pdf
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.02]'
              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 cursor-pointer'
          }`}
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handleFiles('pdf', [...e.target.files])}
            className="hidden"
          />
          
          {pdfFiles.length > 0 ? (
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                {pdfFiles[0].name}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveFile(files.indexOf(pdfFiles[0])); }}
                className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-4">
                Sube la factura o remisión (1 archivo)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Photos Upload Area */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Image className="w-4 h-4 text-blue-500" />
          Fotos de la Carga ({imageFiles.length}/{maxPhotos})
        </label>
        
        <div
          onDragEnter={onDrag('photos')}
          onDragLeave={onDrag('photos')}
          onDragOver={onDrag('photos')}
          onDrop={onDrop('photos')}
          onClick={() => imageFiles.length < maxPhotos && photoInputRef.current?.click()}
          className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            imageFiles.length >= maxPhotos
              ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 cursor-default'
              : dragActive.photos
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 cursor-pointer'
          }`}
        >
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles('photos', [...e.target.files])}
            className="hidden"
          />
          
          <Upload className={`w-8 h-8 mb-2 ${imageFiles.length >= maxPhotos ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-4">
            {imageFiles.length >= maxPhotos 
              ? 'Límite de fotos alcanzado' 
              : 'Sube fotos del precinto, placa y carga'}
          </p>
        </div>
      </div>

      {/* Gallery Previews */}
      <div className="md:col-span-2">
        <FilePreviewGallery files={files} onRemoveFile={onRemoveFile} readOnly={false} />
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const SalidaAuditoria = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const { hasPermission } = useAuth();

  // Estado de carga
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [salidaData, setSalidaData] = useState(null);

  const [estado, setEstado] = useState('pendiente');
  const [lineas, setLineas] = useState([]);

  const [formData, setFormData] = useState({
    conductor: '',
    cedula: '',
    placa: '',
    telefono: '',
    origen: '',
    destino: '',
    observaciones: '',
  });

  const [files, setFiles] = useState([]);
  const [closing, setClosing] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);

  // Averías
  const [averias, setAverias] = useState([]);
  const [averiaForm, setAveriaForm] = useState({ detalle_id: '', tipo_averia: '', descripcion_custom: '' });
  const [savingAveria, setSavingAveria] = useState(false);

  // Control de guardado intermedio
  const [savingLogistica, setSavingLogistica] = useState(false);
  const [logisticaSaved, setLogisticaSaved] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const logisticaTimerRef = useRef(null);

  // Cargar datos desde API
  useEffect(() => {
    const fetchSalida = async () => {
      try {
        const response = await auditoriasService.getSalidaById(id);
        if (response.success && response.data) {
          const data = response.data;
          setSalidaData(data);
          setEstado(data.estado || 'pendiente');
          setLineas(data.lineas || []);
          if (data.logistica) {
            setFormData({
              conductor: data.logistica.conductor || '',
              cedula: data.logistica.cedula || '',
              placa: data.logistica.placa || '',
              telefono: data.logistica.telefono || '',
              origen: data.logistica.origen || '',
              destino: data.logistica.destino || '',
              observaciones: data.logistica.observaciones || '',
            });
          }
          if (data.evidencias) {
            setFiles(data.evidencias.map(ev => ({
              id: ev.id,
              name: ev.nombre,
              url: resolveFileUrl(ev.url),
              type: ev.tipo,
              size: ev.tamanio,
              isUploaded: true
            })));
          }

          // Cargar averías existentes
          try {
            const averiasRes = await auditoriasService.getAverias(id);
            if (averiasRes?.success) setAverias(averiasRes.data || []);
          } catch { /* silencioso */ }
        }
      } catch {
        setPageError('No se pudo cargar la auditoría. Verifique que el servidor esté activo e intente nuevamente.');
      } finally {
        setPageLoading(false);
      }
    };
    fetchSalida();
  }, [id]);

  // ── HANDLERS ──
  const guardarLogisticaRef = useRef(null);
  guardarLogisticaRef.current = async () => {
    if (estado === 'cerrado') return;
    setSavingLogistica(true);
    try {
      await auditoriasService.guardarDatosLogisticos(id, formData);
      setLogisticaSaved(true);
      if (estado === 'pendiente') setEstado('en_proceso');
    } catch {
      // Silencioso
    } finally {
      setSavingLogistica(false);
    }
  };

  const handleFieldChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setLogisticaSaved(false);

    if (logisticaTimerRef.current) clearTimeout(logisticaTimerRef.current);
    logisticaTimerRef.current = setTimeout(() => {
      guardarLogisticaRef.current?.();
    }, 2000);
  };

  const handleUploadEvidencias = async (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
    if (estado === 'pendiente') setEstado('en_proceso');

    setUploadingFiles(true);
    try {
      await auditoriasService.subirEvidencias(id, newFiles);
      setFiles((prev) => prev.map(f => f instanceof File ? { ...f, isUploaded: true, type: f.type, name: f.name, size: f.size, _nativeFile: f } : f));
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron subir las evidencias. Intente nuevamente.'
      });
      setFiles((prev) => prev.filter(f => !(newFiles.includes(f))));
    } finally {
      setUploadingFiles(false);
    }
  };

  useEffect(() => {
    return () => {
      if (logisticaTimerRef.current) clearTimeout(logisticaTimerRef.current);
    };
  }, []);

  const handleVerificarLinea = async (lineaId) => {
    const linea = lineas.find((l) => l.id === lineaId);
    const nuevoEstado = !linea?.verificado;

    setLineas((prev) => prev.map((l) => (l.id === lineaId ? { ...l, verificado: nuevoEstado } : l)));
    if (estado === 'pendiente') setEstado('en_proceso');

    try {
      await auditoriasService.verificarLinea(id, lineaId, nuevoEstado);
    } catch {
      // Mantener cambio local
    }
  };

  const handleEliminarLinea = async (lineaId) => {
    setLineas((prev) => prev.map((l) => (l.id === lineaId ? { ...l, eliminado: true } : l)));
    if (estado === 'pendiente') setEstado('en_proceso');

    try {
      await auditoriasService.eliminarLinea(id, lineaId);
    } catch {
      // Mantener cambio local
    }
  };

  const handleRestaurarLinea = async (lineaId) => {
    setLineas((prev) => prev.map((l) => (l.id === lineaId ? { ...l, eliminado: false } : l)));

    try {
      await auditoriasService.restaurarLinea(id, lineaId);
    } catch {
      // Mantener cambio local
    }
  };

  const handleAddFiles = useCallback((newFiles) => {
    handleUploadEvidencias(newFiles);
  }, [id, estado]);

  const handleRemoveFile = async (idx) => {
    const file = files[idx];
    setFiles((prev) => prev.filter((_, i) => i !== idx));

    if (file?.id && file?.isUploaded) {
      try {
        await auditoriasService.eliminarEvidencia(id, file.id);
      } catch {
        // Silencioso
      }
    }
  };

  // ── AVERÍAS ──
  const TIPOS_AVERIA = [
    'Producto golpeado',
    'Producto mojado',
    'Producto roto',
    'Producto vencido',
    'Empaque dañado',
    'Producto faltante',
    'Producto sobrante',
    'Contaminación',
    'Etiqueta ilegible',
    'Otra',
  ];

  const handleRegistrarAveria = async () => {
    const { detalle_id, tipo_averia, descripcion_custom } = averiaForm;
    if (!detalle_id || !tipo_averia) {
      showAlert({ type: 'warning', title: 'Campos requeridos', message: 'Seleccione el producto y el tipo de avería.' });
      return;
    }

    const linea = lineas.find(l => String(l.id) === String(detalle_id));
    const tipoFinal = tipo_averia === 'Otra' ? descripcion_custom.trim() : tipo_averia;

    if (tipo_averia === 'Otra' && !tipoFinal) {
      showAlert({ type: 'warning', title: 'Descripción requerida', message: 'Escriba el motivo de la avería.' });
      return;
    }

    setSavingAveria(true);
    try {
      const res = await auditoriasService.registrarAveria(id, {
        detalle_id,
        sku: linea?.sku || '',
        cantidad: 1,
        tipo_averia: tipoFinal,
      });
      if (res?.success) {
        setAverias(prev => [res.data, ...prev]);
        setAveriaForm({ detalle_id: '', tipo_averia: '', descripcion_custom: '' });
        showAlert({ type: 'success', title: 'Avería registrada', message: 'La avería fue registrada correctamente.' });
        if (estado === 'pendiente') setEstado('en_proceso');
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Error', message: err.message || 'No se pudo registrar la avería.' });
    } finally {
      setSavingAveria(false);
    }
  };

  // ── PROGRESS ──
  const lineasActivas = lineas.filter((l) => !l.eliminado);
  const lineasVerificadas = lineasActivas.filter((l) => l.verificado);
  const lineasProgress = lineasActivas.length > 0 ? Math.round((lineasVerificadas.length / lineasActivas.length) * 100) : 0;

  const requiredFields = ['conductor', 'cedula', 'placa', 'telefono', 'origen', 'destino'];
  const filledFields = requiredFields.filter((f) => formData[f].trim() !== '');
  const formProgress = Math.round((filledFields.length / requiredFields.length) * 100);

  const hasPdf = files.some((f) => f.type === 'application/pdf');
  const hasPhotos = files.some((f) => f.type.startsWith('image/'));
  const evidenceProgress = hasPdf && hasPhotos ? 100 : hasPdf || hasPhotos ? 50 : 0;

  const totalProgress = Math.round((lineasProgress + formProgress + evidenceProgress) / 3);
  const canClose = lineasProgress === 100 && formProgress === 100 && evidenceProgress === 100;
  const isCerrado = estado === 'cerrado';

  const handleCerrarAuditoria = () => {
    if (!canClose || closing) return;
    setShowCierreModal(true);
  };

  const handleConfirmarCierre = async ({ enviar_correo, plantilla_id }) => {
    setClosing(true);

    try {
      // Guardar logística una última vez por seguridad
      if (logisticaTimerRef.current) clearTimeout(logisticaTimerRef.current);
      await auditoriasService.guardarDatosLogisticos(id, formData);

      // Cerrar auditoría + enviar correo con plantilla seleccionada
      const result = await auditoriasService.cerrar(id, { enviar_correo, plantilla_id });
      setEstado('cerrado');
      setShowCierreModal(false);

      // Feedback: correo se envía en background
      const correoEstado = result?.data?.correo_enviado || result?.correo_enviado;
      if (correoEstado === 'enviando' || correoEstado === true) {
        showAlert({ type: 'success', title: 'Despacho Completado', message: 'El correo de notificación se está enviando en segundo plano.' });
      } else {
        showAlert({ type: 'success', title: 'Despacho Completado', message: 'Operación cerrada. No se envió correo (sin destinatarios configurados).' });
      }
    } catch (error) {
      console.error('Error al cerrar auditoría:', error);
      showAlert({
        type: 'error',
        title: 'Error de Despacho',
        message: 'No se pudo completar el cierre de la salida. Por favor reintente.'
      });
    } finally {
      setClosing(false);
    }
  };

  // ── REENVIAR CORREO ──
  const [reenviando, setReenviando] = useState(false);

  const handleReenviarCorreo = async () => {
    if (reenviando) return;

    const confirmed = await showConfirm({
      type: 'info',
      title: 'Reenviar correo de cierre',
      message: 'Se reenviará el correo de notificación a los contactos configurados del cliente.',
      confirmText: 'Reenviar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setReenviando(true);
    try {
      const result = await auditoriasService.reenviarCorreo(id);
      const success = result?.data?.correo_enviado || result?.correo_enviado;
      if (success) {
        showAlert({ type: 'success', title: 'Correo Reenviado', message: 'El correo fue reenviado exitosamente.' });
      } else {
        showAlert({ type: 'warning', title: 'Sin destinatarios', message: 'No hay contactos con notificaciones activas para este cliente.' });
      }
    } catch (error) {
      console.error('Error al reenviar correo:', error);
      showAlert({ type: 'error', title: 'Error', message: error.message || 'No se pudo reenviar el correo.' });
    } finally {
      setReenviando(false);
    }
  };

  // ── RENDER ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Cargando auditoría...</p>
        </div>
      </div>
    );
  }

  if (pageError || !salidaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/inventario/salidas')}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a Salidas
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/50 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              No se pudo cargar la auditoría
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {pageError || 'La salida solicitada no fue encontrada. Es posible que haya sido eliminada o que el ID sea incorrecto.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={() => navigate('/inventario/salidas')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors"
              >
                Volver al listado
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-32 max-w-5xl mx-auto">

        <button
          onClick={() => navigate('/inventario/salidas')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver a Salidas
        </button>

        {/* HEADER CARD */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {salidaData.documento_wms || salidaData.documento}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-xs">{salidaData.documento}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {salidaData.cliente}
                  </span>
                  <span>•</span>
                  <span>{salidaData.tipo_documento}</span>
                  <span>•</span>
                  <span>{new Date(salidaData.fecha_salida).toLocaleDateString('es-CO')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Progreso</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalProgress}%</p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100 dark:text-slate-700" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${totalProgress * 1.76} 176`} className="text-blue-500 transition-all duration-700" />
                </svg>
              </div>
            </div>
          </div>
          <StatusStepper currentStatus={estado} />
        </div>

        <div className="space-y-6">

          {/* LÍNEAS */}
          <Section
            title="Líneas de Operación (WMS)"
            icon={Package}
            color="blue"
            badge={
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                lineasProgress === 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {lineasVerificadas.length}/{lineasActivas.length} verificadas
              </span>
            }
          >
            <div className="space-y-3">
              {lineas.map((linea) => (
                <div
                  key={linea.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                    linea.eliminado
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 opacity-60'
                      : linea.verificado
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => !linea.eliminado && !isCerrado && handleVerificarLinea(linea.id)}
                      disabled={linea.eliminado || isCerrado}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        linea.eliminado
                          ? 'border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/30 cursor-not-allowed'
                          : linea.verificado
                          ? 'border-emerald-500 bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-500/20'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 cursor-pointer'
                      }`}
                    >
                      {linea.eliminado ? <X className="w-4 h-4 text-red-500 dark:text-red-400" /> : linea.verificado ? <Check className="w-4 h-4" /> : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${linea.eliminado ? 'line-through text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {linea.producto}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        SKU: {linea.sku} • {linea.cantidad_esperada} {linea.unidad}
                        {linea.caja && <span className="ml-1 text-blue-500 font-bold">• Caja: {linea.caja}</span>}
                      </p>
                    </div>
                  </div>
                  {!isCerrado && (
                    <div className="flex items-center gap-2 ml-4">
                      {linea.eliminado ? (
                        <button onClick={() => handleRestaurarLinea(linea.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                          Restaurar
                        </button>
                      ) : (
                        <button onClick={() => handleEliminarLinea(linea.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Quitar línea (no salió)">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* DATOS LOGÍSTICOS */}
          <Section
            title="Datos Logísticos"
            icon={Truck}
            color="slate"
            badge={
              <div className="flex items-center gap-2">
                {savingLogistica && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                {logisticaSaved && !savingLogistica && <Check className="w-3 h-3 text-emerald-500" />}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  formProgress === 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {filledFields.length}/{requiredFields.length} campos
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField icon={User} label="Nombre del Conductor" value={formData.conductor} onChange={handleFieldChange('conductor')} placeholder="Ej: Juan Pérez" required disabled={isCerrado} />
              <FormField icon={CreditCard} label="Cédula del Conductor" value={formData.cedula} onChange={handleFieldChange('cedula')} placeholder="Ej: 1.234.567.890" required disabled={isCerrado} />
              <FormField icon={Truck} label="Placa del Vehículo" value={formData.placa} onChange={handleFieldChange('placa')} placeholder="Ej: ABC-123" required disabled={isCerrado} />
              <FormField icon={Phone} label="Teléfono del Conductor" value={formData.telefono} onChange={handleFieldChange('telefono')} placeholder="Ej: 300 123 4567" required disabled={isCerrado} />
              <FormField icon={MapPin} label="Origen" value={formData.origen} onChange={handleFieldChange('origen')} placeholder="Ej: CEDI Girardota" required disabled={isCerrado} />
              <FormField icon={MapPin} label="Destino" value={formData.destino} onChange={handleFieldChange('destino')} placeholder="Ej: Tienda Cañaveral" required disabled={isCerrado} />
              <div className="md:col-span-2">
                <FormField icon={MessageSquare} label="Observaciones" value={formData.observaciones} onChange={handleFieldChange('observaciones')} placeholder="Novedades de la operación (opcional)..." type="textarea" disabled={isCerrado} />
              </div>
            </div>
          </Section>

          {/* AVERÍAS / NOVEDADES */}
          <Section
            title="Averías / Novedades"
            icon={AlertTriangle}
            color="amber"
            badge={
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                averias.length > 0
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {averias.length} avería{averias.length !== 1 ? 's' : ''}
              </span>
            }
          >
            {/* Formulario para registrar avería */}
            {!isCerrado && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector de producto */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        Producto afectado <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={averiaForm.detalle_id}
                        onChange={(e) => setAveriaForm(prev => ({ ...prev, detalle_id: e.target.value }))}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/50"
                      >
                        <option value="">-- Seleccionar producto --</option>
                        {lineas.filter(l => !l.eliminado).map(l => (
                          <option key={l.id} value={l.id}>
                            {l.sku} — {l.producto} {l.caja ? `(${l.caja})` : ''} ({l.cantidad_esperada} {l.unidad || 'UND'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {/* Preview del producto seleccionado */}
                    {averiaForm.detalle_id && (() => {
                      const sel = lineas.find(l => String(l.id) === String(averiaForm.detalle_id));
                      return sel ? (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-700/30 rounded-lg">
                          <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">{sel.sku}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{sel.producto}</span>
                          {sel.caja && <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/50 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded font-medium">{sel.caja}</span>}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Selector de tipo de avería */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Causa de la avería <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={averiaForm.tipo_averia}
                        onChange={(e) => setAveriaForm(prev => ({ ...prev, tipo_averia: e.target.value, descripcion_custom: '' }))}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/50"
                      >
                        <option value="">-- Seleccionar causa --</option>
                        {TIPOS_AVERIA.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {/* Indicador de tipo seleccionado */}
                    {averiaForm.tipo_averia && averiaForm.tipo_averia !== 'Otra' && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-700/30 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{averiaForm.tipo_averia}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campo personalizado cuando selecciona "Otra" */}
                {averiaForm.tipo_averia === 'Otra' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                          Describa el motivo <span className="text-red-500">*</span>
                        </div>
                        <span className={`text-xs font-mono ${averiaForm.descripcion_custom.length >= 50 ? 'text-red-400' : 'text-slate-400'}`}>
                          {averiaForm.descripcion_custom.length}/55
                        </span>
                      </div>
                    </label>
                    <input
                      type="text"
                      maxLength={55}
                      value={averiaForm.descripcion_custom}
                      onChange={(e) => setAveriaForm(prev => ({ ...prev, descripcion_custom: e.target.value }))}
                      placeholder="Escriba el motivo de la avería..."
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all hover:border-amber-400 dark:hover:border-amber-500/50"
                    />
                  </div>
                )}

                <button
                  onClick={handleRegistrarAveria}
                  disabled={savingAveria || !averiaForm.detalle_id || !averiaForm.tipo_averia}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-amber-500/20 hover:shadow-amber-500/30"
                >
                  {savingAveria ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Registrar Avería
                </button>
              </div>
            )}

            {/* Lista de averías registradas */}
            {averias.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Averías registradas</h4>
                {averias.map((av, idx) => {
                  const lineaRef = lineas.find(l => String(l.id) === String(av.detalle_id));
                  return (
                    <div key={av.id || idx} className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {lineaRef ? `${lineaRef.sku} — ${lineaRef.producto}` : av.sku || 'Producto'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {av.tipo_averia}{av.descripcion ? ` — ${av.descripcion}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        Cant: {av.cantidad}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                {isCerrado ? 'No se registraron averías en esta operación.' : 'No hay averías registradas aún.'}
              </p>
            )}
          </Section>

          {/* EVIDENCIAS */}
          <Section
            title="Evidencias y Soportes"
            icon={Upload}
            color="violet"
            badge={
              <div className="flex items-center gap-2">
                {uploadingFiles && <Loader2 className="w-3 h-3 animate-spin text-violet-500" />}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  evidenceProgress === 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {uploadingFiles ? 'Subiendo...' : `${files.length} archivo${files.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            }
          >
            {isCerrado ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Auditoría cerrada — {files.length} evidencia{files.length !== 1 && 's'} registrada{files.length !== 1 && 's'}
                  </p>
                </div>
                <FilePreviewGallery files={files} readOnly={true} />
              </div>
            ) : (
              <EvidenceDropzone files={files} onAddFiles={handleAddFiles} onRemoveFile={handleRemoveFile} maxPhotos={5} />
            )}
          </Section>
        </div>
      </main>

      {/* FLOATING BOTTOM BAR */}
      {!isCerrado && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 px-4 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${lineasProgress === 100 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="text-slate-600 dark:text-slate-300">Líneas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${formProgress === 100 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="text-slate-600 dark:text-slate-300">Datos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${evidenceProgress === 100 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="text-slate-600 dark:text-slate-300">Evidencias</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1 sm:flex-none">
              <div className="flex-1 sm:w-48">
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${canClose ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${totalProgress}%` }} />
                </div>
              </div>
              <button
                onClick={handleCerrarAuditoria}
                disabled={!canClose || closing}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  canClose && !closing
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {closing ? 'Cerrando...' : 'Completar Auditoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCerrado && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-blue-500 text-white px-4 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Auditoría de despacho completada y cerrada</span>
            </div>
            {hasPermission('auditoria', 'reenviar_correo') && (
              <button
                onClick={handleReenviarCorreo}
                disabled={reenviando}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {reenviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {reenviando ? 'Enviando...' : 'Reenviar correo'}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Modal de cierre con selección de plantilla */}
      <CierreAuditoriaModal
        isOpen={showCierreModal}
        onClose={() => setShowCierreModal(false)}
        onConfirm={handleConfirmarCierre}
        tipoAuditoria="salida"
        closing={closing}
        colorScheme="blue"
      />
    </div>
  );
};

export default SalidaAuditoria;
