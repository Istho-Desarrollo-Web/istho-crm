import logoIstho from '@assets/logo-istho.png';

const PageFooter = ({ className = '' }) => (
  <footer
    className={`flex flex-col items-center gap-2 py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700 ${className}`}
  >
    <div className="flex items-center gap-2">
      <img src={logoIstho} alt="ISTHO" className="h-6 w-auto max-w-[72px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.30)] dark:drop-shadow-none" />
      <span>© {new Date().getFullYear()} ISTHO S.A.S. - Sistema CRM Interno</span>
    </div>
    <span className="text-xs text-slate-400 dark:text-slate-500">
      Centro Logístico Industrial del Norte, Girardota, Antioquia
    </span>
  </footer>
);

export default PageFooter;
