/**
 * ISTHO CRM - Configuración de Autenticación de Dos Factores (2FA)
 * Permite activar/desactivar TOTP desde el perfil del usuario.
 */

import { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  ShieldOff,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
} from 'lucide-react';
import authService from '@api/auth.service';
import { useAuth } from '@context/AuthContext';
import useNotification from '@hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// ESTADO DE PASOS DEL SETUP
// ════════════════════════════════════════════════════════════════════════════

const PASOS = { IDLE: 'idle', QR: 'qr', BACKUP: 'backup' };

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const Configuracion2FA = () => {
  const { user, updateUser } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();

  // Setup flow
  const [paso, setPaso] = useState(PASOS.IDLE);
  const [setupData, setSetupData] = useState(null); // { secret, qr_code }
  const [backupCodes, setBackupCodes] = useState([]); // mostrados una sola vez
  const [codigoConfirm, setCodigoConfirm] = useState('');
  const [errorConfirm, setErrorConfirm] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(false);

  // Desactivar flow
  const [showDesactivar, setShowDesactivar] = useState(false);
  const [passwordDesactivar, setPasswordDesactivar] = useState('');
  const [showPwdDesactivar, setShowPwdDesactivar] = useState(false);
  const [loadingDesactivar, setLoadingDesactivar] = useState(false);
  const [errorDesactivar, setErrorDesactivar] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  // ACTIVAR 2FA - Paso 1: obtener QR
  // ──────────────────────────────────────────────────────────────────────────

  const iniciarSetup = async () => {
    setLoadingSetup(true);
    try {
      const res = await authService.setup2FA();
      if (res.success) {
        setSetupData(res.data);
        setPaso(PASOS.QR);
      } else {
        notifyError(res.message || 'Error al iniciar la configuración');
      }
    } catch {
      notifyError('Error al comunicarse con el servidor');
    } finally {
      setLoadingSetup(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ACTIVAR 2FA - Paso 2: confirmar código
  // ──────────────────────────────────────────────────────────────────────────

  const confirmarActivacion = async (e) => {
    e.preventDefault();
    if (!codigoConfirm.trim()) return;
    setErrorConfirm(null);
    setLoadingSetup(true);

    try {
      const res = await authService.activar2FA({ codigo: codigoConfirm.replace(/\s/g, '') });
      if (res.success) {
        setBackupCodes(res.data.backup_codes || []);
        updateUser({ totp_habilitado: true });
        setPaso(PASOS.BACKUP);
      } else {
        setErrorConfirm(res.message || 'Código incorrecto');
      }
    } catch {
      setErrorConfirm('Error al verificar el código');
    } finally {
      setLoadingSetup(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DESACTIVAR 2FA
  // ──────────────────────────────────────────────────────────────────────────

  const desactivar = async (e) => {
    e.preventDefault();
    if (!passwordDesactivar) return;
    setErrorDesactivar(null);
    setLoadingDesactivar(true);

    try {
      const res = await authService.deshabilitar2FA({ password: passwordDesactivar });
      if (res.success) {
        updateUser({ totp_habilitado: false });
        notifySuccess('2FA desactivado correctamente');
        setShowDesactivar(false);
        setPasswordDesactivar('');
      } else {
        setErrorDesactivar(res.message || 'Error al desactivar');
      }
    } catch {
      setErrorDesactivar('Error al comunicarse con el servidor');
    } finally {
      setLoadingDesactivar(false);
    }
  };

  const copiarCodigos = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    notifySuccess('Códigos copiados al portapapeles');
  };

  const finalizarSetup = () => {
    setPaso(PASOS.IDLE);
    setSetupData(null);
    setBackupCodes([]);
    setCodigoConfirm('');
    setErrorConfirm(null);
    notifySuccess('2FA configurado correctamente');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER - Estado backup codes (post-activación)
  // ──────────────────────────────────────────────────────────────────────────

  if (paso === PASOS.BACKUP) {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <h3 className="text-base font-semibold text-green-800 dark:text-green-300">
            ¡2FA activado!
          </h3>
        </div>
        <p className="text-sm text-green-700 dark:text-green-400 mb-4">
          Guarda estos códigos de respaldo en un lugar seguro. Solo se muestran{' '}
          <strong>una vez</strong> y sirven si pierdes acceso a tu autenticador.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {backupCodes.map((code, i) => (
            <div
              key={i}
              className="bg-white dark:bg-centhrix-card border border-green-200 dark:border-green-800/50 rounded-lg px-3 py-2 text-center font-mono text-sm text-slate-700 dark:text-slate-200 tracking-widest"
            >
              {code}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={copiarCodigos}
            className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 hover:text-green-800 transition-colors"
          >
            <Copy className="w-4 h-4" /> Copiar todos
          </button>
          <button
            onClick={finalizarSetup}
            className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER - Paso QR (escanear + confirmar)
  // ──────────────────────────────────────────────────────────────────────────

  if (paso === PASOS.QR) {
    return (
      <div className="rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-500" />
            Configurar autenticador
          </h3>
          <button
            onClick={() => {
              setPaso(PASOS.IDLE);
              setSetupData(null);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4 list-decimal list-inside">
          <li>
            Abre <strong>Google Authenticator</strong>, <strong>Authy</strong> o similar.
          </li>
          <li>Escanea el código QR o ingresa el secreto manualmente.</li>
          <li>Ingresa el código de 6 dígitos para confirmar.</li>
        </ol>

        {setupData?.qr_code && (
          <div className="flex justify-center mb-4">
            <img
              src={setupData.qr_code}
              alt="QR 2FA"
              className="w-48 h-48 border-4 border-white dark:border-centhrix-card rounded-xl shadow"
            />
          </div>
        )}

        {setupData?.secret && (
          <div className="mb-4 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 break-all">
              {setupData.secret}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(setupData.secret);
                notifySuccess('Secreto copiado');
              }}
              className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={confirmarActivacion} className="space-y-3">
          {errorConfirm && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" /> {errorConfirm}
            </div>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            autoFocus
            value={codigoConfirm}
            onChange={(e) => {
              setCodigoConfirm(e.target.value);
              setErrorConfirm(null);
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-centhrix-card dark:text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          <button
            type="submit"
            disabled={loadingSetup || !codigoConfirm.trim()}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loadingSetup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
              </>
            ) : (
              'Activar 2FA'
            )}
          </button>
        </form>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER - Estado inicial (activo o inactivo)
  // ──────────────────────────────────────────────────────────────────────────

  const habilitado = user?.totp_habilitado;

  return (
    <div
      className={`rounded-2xl border p-6 ${habilitado ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/5' : 'border-slate-200 dark:border-centhrix-surface bg-white dark:bg-centhrix-card'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {habilitado ? (
            <ShieldCheck className="w-6 h-6 text-green-500" />
          ) : (
            <Smartphone className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          )}
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Autenticación de dos factores (2FA)
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {habilitado
                ? 'Activo — tu cuenta está protegida con TOTP.'
                : 'Inactivo — actívalo para mayor seguridad.'}
            </p>
          </div>
        </div>

        {habilitado ? (
          <button
            onClick={() => setShowDesactivar(true)}
            className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
          >
            <ShieldOff className="w-4 h-4" /> Desactivar
          </button>
        ) : (
          <button
            onClick={iniciarSetup}
            disabled={loadingSetup}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loadingSetup ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            Activar 2FA
          </button>
        )}
      </div>

      {/* Modal desactivar */}
      {showDesactivar && (
        <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Ingresa tu contraseña actual para desactivar el 2FA:
          </p>
          <form onSubmit={desactivar} className="space-y-3">
            {errorDesactivar && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorDesactivar}
              </div>
            )}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPwdDesactivar ? 'text' : 'password'}
                autoFocus
                placeholder="Contraseña actual"
                value={passwordDesactivar}
                onChange={(e) => {
                  setPasswordDesactivar(e.target.value);
                  setErrorDesactivar(null);
                }}
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-centhrix-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwdDesactivar((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPwdDesactivar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDesactivar(false);
                  setPasswordDesactivar('');
                  setErrorDesactivar(null);
                }}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingDesactivar || !passwordDesactivar}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-70 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                {loadingDesactivar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Desactivar 2FA'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Configuracion2FA;
