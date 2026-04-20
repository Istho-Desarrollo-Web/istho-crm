import { useEffect, useRef } from 'react';
import { X, Shield, FileText, Mail, Phone } from 'lucide-react';

const SECCION = ({ titulo, children }) => (
  <div className="mb-5">
    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2 uppercase tracking-wide">
      {titulo}
    </h3>
    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
      {children}
    </div>
  </div>
);

const PoliticaDatosModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-hidden="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="politica-titulo"
        className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#E74C3C]" aria-hidden="true" />
          </div>
          <div>
            <h2 id="politica-titulo" className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Política de Tratamiento de Datos Personales
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Ley 1581 de 2012 — ISTHO S.A.S.</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar política de datos"
            className="ml-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto px-6 py-5 flex-1">

          <SECCION titulo="1. Responsable del Tratamiento">
            <p><strong>ISTHO S.A.S.</strong> — NIT: 901.234.567-8</p>
            <p>Centro Logístico Industrial del Norte, Girardota, Antioquia, Colombia</p>
            <p className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              liderti@istho.com.co
            </p>
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              +57 (4) 444-0000
            </p>
          </SECCION>

          <SECCION titulo="2. Datos que Recopilamos">
            <ul className="list-disc pl-4 space-y-1">
              <li>Nombre completo, correo electrónico, número de teléfono</li>
              <li>Cargo, empresa y departamento</li>
              <li>Información de autenticación (contraseña cifrada, registros de acceso)</li>
              <li>Datos de actividad dentro del sistema (auditoría de acciones)</li>
            </ul>
          </SECCION>

          <SECCION titulo="3. Finalidades del Tratamiento">
            <ul className="list-disc pl-4 space-y-1">
              <li>Gestionar el acceso y la autenticación al sistema CRM CenthriX</li>
              <li>Administrar operaciones logísticas, inventarios y reportes</li>
              <li>Enviar notificaciones operativas por correo electrónico</li>
              <li>Cumplir obligaciones legales y requerimientos de auditoría</li>
              <li>Mejorar la seguridad y el funcionamiento del sistema</li>
            </ul>
          </SECCION>

          <SECCION titulo="4. Base Legal">
            <p>
              El tratamiento se realiza con fundamento en la <strong>Ley 1581 de 2012</strong>,
              el <strong>Decreto 1377 de 2013</strong> y demás normas que los complementen o modifiquen.
              El consentimiento es la base principal del tratamiento para usuarios del sistema.
            </p>
          </SECCION>

          <SECCION titulo="5. Derechos del Titular">
            <p>Como titular de los datos, usted tiene derecho a:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Conocer</strong> los datos que ISTHO S.A.S. tiene sobre usted</li>
              <li><strong>Actualizar y rectificar</strong> la información inexacta o incompleta</li>
              <li><strong>Solicitar la supresión</strong> de sus datos cuando no sean necesarios</li>
              <li><strong>Revocar</strong> la autorización de tratamiento en cualquier momento</li>
              <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC)</li>
            </ul>
          </SECCION>

          <SECCION titulo="6. Ejercicio de Derechos">
            <p>
              Para ejercer sus derechos, envíe una solicitud a{' '}
              <a
                href="mailto:liderti@istho.com.co"
                className="text-[#E74C3C] hover:underline font-medium"
              >
                liderti@istho.com.co
              </a>{' '}
              indicando su nombre, tipo de solicitud y los datos relacionados.
              El tiempo de respuesta es de <strong>10 días hábiles</strong> conforme a la Ley 1581.
            </p>
          </SECCION>

          <SECCION titulo="7. Seguridad de la Información">
            <p>
              ISTHO S.A.S. implementa medidas técnicas y organizativas para proteger sus datos:
              cifrado en tránsito (HTTPS/TLS), contraseñas almacenadas con hash seguro,
              control de acceso por roles, auditoría de acciones y copias de seguridad periódicas.
            </p>
          </SECCION>

          <SECCION titulo="8. Transferencias y Terceros">
            <p>
              Sus datos no serán vendidos ni compartidos con terceros sin su consentimiento,
              excepto cuando sea requerido por autoridad competente o sea necesario para
              la prestación del servicio (ej. proveedor de correo para notificaciones operativas).
            </p>
          </SECCION>

          <SECCION titulo="9. Vigencia">
            <p>
              Esta política rige desde el <strong>1 de enero de 2026</strong> y permanecerá vigente
              mientras ISTHO S.A.S. realice actividades de tratamiento de datos personales.
              Cualquier modificación será comunicada a los titulares con al menos 10 días de antelación.
            </p>
          </SECCION>

          <div className="mt-4 p-3 bg-slate-50 dark:bg-centhrix-surface rounded-xl flex items-start gap-2">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La política completa está disponible en{' '}
              <a href="mailto:liderti@istho.com.co" className="text-[#E74C3C] hover:underline">
                liderti@istho.com.co
              </a>
              . Versión 1.0 — Abril 2026.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white font-semibold text-sm hover:from-[#C0392B] hover:to-orange-800 transition-all focus:outline-none focus:ring-2 focus:ring-[#E74C3C] focus:ring-offset-2 dark:focus:ring-offset-centhrix-card"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoliticaDatosModal;
