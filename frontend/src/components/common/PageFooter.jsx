import logoNegro from '@assets/logo-negro.png';
import logoBlanco from '@assets/logo-blanco.png';

const PageFooter = ({ className = '' }) => (
  <footer className={`flex flex-col items-center gap-2 py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700 ${className}`}>
    <div className="flex items-center gap-2">
      <img src={logoNegro} alt="ISTHO" className="w-6 h-6 rounded dark:hidden" />
      <img src={logoBlanco} alt="ISTHO" className="w-6 h-6 rounded hidden dark:block" />
      <span>© {new Date().getFullYear()} ISTHO S.A.S. - Sistema CRM Interno</span>
    </div>
    <span className="text-xs text-slate-400 dark:text-slate-500">
      Centro Logístico Industrial del Norte, Girardota, Antioquia
    </span>
  </footer>
);

export default PageFooter;
