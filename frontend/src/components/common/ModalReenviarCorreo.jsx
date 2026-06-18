import { useState, useEffect, useRef } from 'react';
import { Loader2, Mail, Users, X } from 'lucide-react';
import Modal from './Modal/Modal';

const ModalReenviarCorreo = ({ isOpen, onClose, onConfirm, correosIniciales = '', cargando = false }) => {
  const [chips, setChips] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const lista = (correosIniciales || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      setChips([...new Set(lista)]);
      setInputVal('');
    }
  }, [isOpen, correosIniciales]);

  const agregarEmail = (val) => {
    const email = val.trim().toLowerCase();
    if (!email) return;
    setChips((prev) => (prev.includes(email) ? prev : [...prev, email]));
    setInputVal('');
  };

  const eliminarChip = (email) => {
    setChips((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      agregarEmail(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && chips.length) {
      setChips((prev) => prev.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) agregarEmail(inputVal);
  };

  const handleConfirm = () => {
    const lista = [...chips];
    if (inputVal.trim()) {
      const email = inputVal.trim().toLowerCase();
      if (!lista.includes(email)) lista.push(email);
    }
    onConfirm(lista.join(', '));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cargando ? undefined : onClose}
      title="Reenviar correo de cierre"
      size="sm"
      closeOnOverlay={!cargando}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={cargando}
            className="px-5 py-2 text-sm bg-[#E74C3C] hover:bg-[#C0392B] disabled:opacity-60 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {cargando ? 'Enviando...' : 'Reenviar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-centhrix-surface border border-slate-100 dark:border-slate-700/50">
          <Mail className="w-4 h-4 text-[#E74C3C] mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Edita los destinatarios si necesitas cambiarlos. Si dejas el campo vacío se usarán los contactos activos del cliente.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Destinatarios
            </label>
            {chips.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E74C3C]/10 text-[#E74C3C]">
                {chips.length} {chips.length === 1 ? 'correo' : 'correos'}
              </span>
            )}
          </div>

          {/* Contenedor chips + input */}
          <div
            className="min-h-[80px] w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-centhrix-bg px-2.5 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#E74C3C]/40 focus-within:border-[#E74C3C]/60 transition-colors"
            onClick={() => inputRef.current?.focus()}
          >
            {chips.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 max-w-full"
              >
                <span className="truncate max-w-[220px]">{email}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); eliminarChip(email); }}
                  disabled={cargando}
                  className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600 disabled:pointer-events-none transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={cargando}
              placeholder={chips.length === 0 ? 'correo@ejemplo.com' : ''}
              className="flex-1 min-w-[160px] bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none py-0.5"
            />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            Escribe un correo y presiona <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">Enter</kbd> o <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">,</kbd> para agregarlo
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ModalReenviarCorreo;
