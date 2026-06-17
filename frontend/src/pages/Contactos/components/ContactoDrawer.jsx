/**
 * ============================================================================
 * ISTHO CRM - ContactoDrawer Component
 * ============================================================================
 * Panel lateral deslizable desde la derecha con el detalle de un contacto.
 * Muestra información, clientes asignados y permite asignar/desasignar clientes.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Junio 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Mail, Phone, FileText, UserMinus, ChevronDown, ChevronUp, UserRound, Bell } from 'lucide-react';
import { FilterDropdown, ConfirmDialog } from '@components/common';
import useNotification from '@hooks/useNotification';
import contactosService from '@api/contactos.service';
import clientesService from '@api/clientes.service';
import ContactoForm from './ContactoForm';

// ============================================================================
// SUBCOMPONENTES INTERNOS
// ============================================================================

/** Badge de tipo de contacto */
const TipoBadge = ({ tipo }) => {
  if (tipo === 'istho') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        ISTHO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
      Externo
    </span>
  );
};

/** Badge de rol CRM */
const CrmBadge = ({ rol }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
    Usuario CRM{rol ? `: ${rol}` : ''}
  </span>
);

/** Badge "Principal" */
const PrincipalBadge = () => (
  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
    Principal
  </span>
);

/** Fila de información con ícono */
const InfoRow = ({ icon: Icon, children, className = '' }) => {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <span className="text-sm text-slate-600 dark:text-slate-300 break-all">{children}</span>
    </div>
  );
};

/** Skeleton de carga */
const DrawerSkeleton = () => (
  <div className="p-6 space-y-4 animate-pulse">
    <div className="h-6 w-48 bg-slate-700/60 rounded" />
    <div className="h-4 w-32 bg-slate-700/40 rounded" />
    <div className="flex gap-2 mt-1">
      <div className="h-5 w-16 bg-slate-700/40 rounded-full" />
    </div>
    <div className="mt-6 space-y-3">
      <div className="h-4 w-full bg-slate-700/40 rounded" />
      <div className="h-4 w-3/4 bg-slate-700/40 rounded" />
      <div className="h-4 w-1/2 bg-slate-700/40 rounded" />
    </div>
    <div className="mt-6">
      <div className="h-5 w-36 bg-slate-700/40 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
        <div className="h-10 w-full bg-slate-700/30 rounded-lg" />
      </div>
    </div>
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ContactoDrawer = ({ open, onClose, contactoId, onContactoUpdated }) => {
  const { success: notifySuccess, error: notifyError } = useNotification();

  // ── Estado del contacto ────────────────────────────────────────────────────
  const [contacto, setContacto] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Modal edición ──────────────────────────────────────────────────────────
  const [editFormOpen, setEditFormOpen] = useState(false);

  // ── Asignación de cliente ──────────────────────────────────────────────────
  const [showAsignar, setShowAsignar] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [opcionesClientes, setOpcionesClientes] = useState([]);
  const [asignando, setAsignando] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // ── Confirmación de desasignación ──────────────────────────────────────────
  const [confirmDesasignar, setConfirmDesasignar] = useState(null); // ID del cliente
  const [desasignando, setDesasignando] = useState(false);

  // ── Fetch del contacto ────────────────────────────────────────────────────
  const fetchContacto = useCallback(async () => {
    if (!contactoId) return;
    setLoading(true);
    try {
      const res = await contactosService.getById(contactoId);
      // apiClient ya devuelve response.data → res = { success, data: {...contacto} }
      setContacto(res?.data ?? res);
    } catch (err) {
      notifyError(err?.message || 'Error al cargar el contacto');
    } finally {
      setLoading(false);
    }
  }, [contactoId, notifyError]);

  useEffect(() => {
    if (open && contactoId) {
      fetchContacto();
    }
    if (!open) {
      setContacto(null);
      setShowAsignar(false);
      setClienteSeleccionado('');
      setEsPrincipal(false);
      setConfirmDesasignar(null);
    }
  }, [open, contactoId, fetchContacto]);

  // ── Cargar clientes activos para el dropdown ──────────────────────────────
  const cargarClientes = useCallback(async () => {
    if (opcionesClientes.length > 0) return; // ya cargados
    setCargandoClientes(true);
    try {
      const res = await clientesService.getAll({ estado: 'activo', limit: 200 });
      // paginated() devuelve { success, data: [...array...], pagination: {...} }
      const raw = res?.data;
      const rows = Array.isArray(raw) ? raw : (raw?.rows ?? res?.rows ?? []);
      const opciones = rows.map((c) => ({
        value: String(c.id),
        label: c.razon_social || c.nombre || `Cliente ${c.id}`,
      }));
      setOpcionesClientes(opciones);
    } catch (err) {
      notifyError(err?.message || 'Error al cargar clientes');
    } finally {
      setCargandoClientes(false);
    }
  }, [opcionesClientes.length, notifyError]);

  const handleAbrirAsignar = () => {
    setShowAsignar(true);
    cargarClientes();
  };

  // ── Asignar cliente ───────────────────────────────────────────────────────
  const handleAsignar = async () => {
    if (!clienteSeleccionado) {
      notifyError('Selecciona un cliente');
      return;
    }
    setAsignando(true);
    try {
      await contactosService.asignarCliente(contactoId, {
        cliente_id: Number(clienteSeleccionado),
        es_principal: esPrincipal,
      });
      notifySuccess('Cliente asignado correctamente');
      setShowAsignar(false);
      setClienteSeleccionado('');
      setEsPrincipal(false);
      await fetchContacto();
      onContactoUpdated?.();
    } catch (err) {
      notifyError(err?.message || 'Error al asignar cliente');
    } finally {
      setAsignando(false);
    }
  };

  // ── Desasignar cliente ────────────────────────────────────────────────────
  const handleDesasignar = async (clienteId) => {
    setDesasignando(true);
    try {
      await contactosService.desasignarCliente(contactoId, clienteId);
      notifySuccess('Cliente desasignado');
      setConfirmDesasignar(null);
      await fetchContacto();
      onContactoUpdated?.();
    } catch (err) {
      notifyError(err?.message || 'Error al desasignar cliente');
    } finally {
      setDesasignando(false);
    }
  };

  // ── Tras editar el contacto ───────────────────────────────────────────────
  const handleEditSuccess = async () => {
    setEditFormOpen(false);
    await fetchContacto();
    onContactoUpdated?.();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel lateral */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del contacto"
        className={`
          fixed inset-y-0 right-0 z-50
          w-full max-w-md
          dark:bg-centhrix-card bg-white
          border-l border-white/10 dark:border-slate-700
          shadow-xl
          flex flex-col
          transform transition-transform duration-300
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex-1 min-w-0">
            {loading || !contacto ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-5 w-40 bg-slate-700/60 rounded" />
                <div className="h-4 w-28 bg-slate-700/40 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#E74C3C]/10 flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4 text-[#E74C3C]" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {contacto.nombre}
                  </h2>
                </div>
                {contacto.cargo && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 ml-10 truncate">
                    {contacto.cargo}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 ml-10 flex-wrap">
                  <TipoBadge tipo={contacto.tipo} />
                  {contacto.usuarioCrm && (
                    <CrmBadge rol={contacto.usuarioCrm.rol} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botones de acción en header */}
          <div className="flex items-center gap-1 shrink-0">
            {contacto && !loading && (
              <button
                type="button"
                onClick={() => setEditFormOpen(true)}
                title="Editar contacto"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-centhrix-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── CONTENIDO ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <DrawerSkeleton />
          ) : !contacto ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 dark:text-slate-400">
              <UserRound className="w-12 h-12 opacity-30" />
              <p className="text-sm">No se pudo cargar el contacto</p>
            </div>
          ) : (
            <div className="p-5 space-y-6">

              {/* ── INFORMACIÓN DE CONTACTO ─────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Información de contacto
                </h3>
                <div className="space-y-2.5">
                  <InfoRow icon={Mail}>
                    {contacto.email ? (
                      <a
                        href={`mailto:${contacto.email}`}
                        className="hover:text-[#E74C3C] transition-colors"
                      >
                        {contacto.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Sin email</span>
                    )}
                  </InfoRow>
                  <InfoRow icon={Phone}>
                    {contacto.celular || contacto.telefono ? (
                      <a
                        href={`tel:${contacto.celular || contacto.telefono}`}
                        className="hover:text-[#E74C3C] transition-colors"
                      >
                        {contacto.celular || contacto.telefono}
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Sin teléfono</span>
                    )}
                  </InfoRow>
                  {contacto.notas && (
                    <InfoRow icon={FileText}>
                      <span className="whitespace-pre-line">{contacto.notas}</span>
                    </InfoRow>
                  )}
                  {contacto.tipos_notificacion?.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <Bell className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1.5">
                        {contacto.tipos_notificacion.includes('todas') ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E74C3C]/20 text-[#E74C3C]">
                            Todas
                          </span>
                        ) : (
                          <>
                            {contacto.tipos_notificacion.includes('ingreso') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                Ingreso
                              </span>
                            )}
                            {contacto.tipos_notificacion.includes('salida') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400">
                                Salida
                              </span>
                            )}
                            {contacto.tipos_notificacion.includes('kardex') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">
                                Kardex
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ── CLIENTES ASIGNADOS ──────────────────────────────── */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Clientes asignados
                  {contacto.clientes?.length > 0 && (
                    <span className="ml-2 bg-slate-200 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 rounded-full px-1.5 py-0.5 text-xs font-normal normal-case tracking-normal">
                      {contacto.clientes.length}
                    </span>
                  )}
                </h3>

                {!contacto.clientes || contacto.clientes.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    No hay clientes asignados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contacto.clientes.map((cliente) => {
                      const esPrincipalCliente = cliente.ContactoCliente?.es_principal === true;
                      return (
                        <div
                          key={cliente.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-centhrix-surface border border-slate-100 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">
                              {cliente.razon_social}
                            </span>
                            {esPrincipalCliente && <PrincipalBadge />}
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDesasignar(cliente.id)}
                            title={`Desasignar ${cliente.razon_social}`}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── ASIGNAR CLIENTE ─────────────────────────────────── */}
              <section>
                <button
                  type="button"
                  onClick={showAsignar ? () => setShowAsignar(false) : handleAbrirAsignar}
                  className="flex items-center gap-2 text-sm font-medium text-[#E74C3C] hover:text-[#C0392B] transition-colors"
                >
                  {showAsignar ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {showAsignar ? 'Cancelar asignación' : '+ Asignar cliente'}
                </button>

                {showAsignar && (
                  <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-centhrix-surface space-y-3">
                    {/* Dropdown clientes */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Seleccionar cliente
                      </label>
                      {cargandoClientes ? (
                        <div className="h-9 w-full bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                      ) : (
                        <FilterDropdown
                          options={[
                            { value: '', label: 'Selecciona un cliente...' },
                            ...opcionesClientes,
                          ]}
                          value={clienteSeleccionado}
                          onChange={(v) => setClienteSeleccionado(v)}
                          placeholder="Selecciona un cliente..."
                          searchable
                        />
                      )}
                    </div>

                    {/* Checkbox principal */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={esPrincipal}
                        onChange={(e) => setEsPrincipal(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 text-[#E74C3C] focus:ring-[#E74C3C]/30"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        Marcar como contacto principal
                      </span>
                    </label>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAsignar}
                        disabled={asignando || !clienteSeleccionado}
                        className="flex-1 py-1.5 text-sm font-medium text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {asignando ? 'Asignando...' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAsignar(false);
                          setClienteSeleccionado('');
                          setEsPrincipal(false);
                        }}
                        disabled={asignando}
                        className="flex-1 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRM DIALOG DESASIGNAR ────────────────────────────────────── */}
      {contacto?.clientes?.map((cliente) => (
        <ConfirmDialog
          key={cliente.id}
          isOpen={confirmDesasignar === cliente.id}
          onClose={() => setConfirmDesasignar(null)}
          onConfirm={() => handleDesasignar(cliente.id)}
          title="Desasignar cliente"
          message={`¿Desasignar "${cliente.razon_social}" de este contacto?`}
          type="warning"
          confirmText="Desasignar"
          loading={desasignando}
        />
      ))}

      {/* ── MODAL EDITAR CONTACTO ────────────────────────────────────────── */}
      <ContactoForm
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        contacto={contacto}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default ContactoDrawer;
