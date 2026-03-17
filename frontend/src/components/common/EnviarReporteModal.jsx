/**
 * ISTHO CRM - Modal para enviar reporte por email
 * Permite seleccionar uno o ambos formatos (Excel y/o PDF)
 */
import { useState } from 'react';
import { Mail, Send, FileSpreadsheet, FileText, Loader2, X, Check } from 'lucide-react';

const EnviarReporteModal = ({ isOpen, onClose, tipoReporte, onSend }) => {
  const [destinatarios, setDestinatarios] = useState('');
  const [formatoExcel, setFormatoExcel] = useState(true);
  const [formatoPdf, setFormatoPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emails = destinatarios.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      setError('Ingresa al menos un email');
      return;
    }
    if (!formatoExcel && !formatoPdf) {
      setError('Selecciona al menos un formato');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formatos = [];
      if (formatoExcel) formatos.push('excel');
      if (formatoPdf) formatos.push('pdf');

      await onSend({
        tipo_reporte: tipoReporte,
        formato: formatos.length === 1 ? formatos[0] : 'ambos',
        formatos,
        destinatarios: emails,
      });
      setDestinatarios('');
      onClose();
    } catch (err) {
      setError(err.message || 'Error al enviar');
    } finally {
      setLoading(false);
    }
  };

  const checkboxCls = (active) => `flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
    active
      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
  }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Enviar Reporte por Email</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Destinatarios */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destinatarios
            </label>
            <input
              type="text"
              value={destinatarios}
              onChange={(e) => { setDestinatarios(e.target.value); setError(''); }}
              placeholder="correo@ejemplo.com, otro@ejemplo.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">Separa varios emails con coma</p>
          </div>

          {/* Formatos - Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Formato (puedes seleccionar ambos)
            </label>
            <div className="flex gap-3">
              <label className={checkboxCls(formatoExcel)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formatoExcel ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-500'
                }`}>
                  {formatoExcel && <Check className="w-3 h-3 text-white" />}
                </div>
                <FileSpreadsheet className={`w-5 h-5 ${formatoExcel ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${formatoExcel ? 'text-orange-700 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300'}`}>Excel</span>
                <input type="checkbox" checked={formatoExcel} onChange={() => setFormatoExcel(!formatoExcel)} className="hidden" />
              </label>
              <label className={checkboxCls(formatoPdf)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formatoPdf ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-500'
                }`}>
                  {formatoPdf && <Check className="w-3 h-3 text-white" />}
                </div>
                <FileText className={`w-5 h-5 ${formatoPdf ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${formatoPdf ? 'text-orange-700 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300'}`}>PDF</span>
                <input type="checkbox" checked={formatoPdf} onChange={() => setFormatoPdf(!formatoPdf)} className="hidden" />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EnviarReporteModal;
