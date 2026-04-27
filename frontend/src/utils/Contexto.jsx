import { useState } from 'react';

// ============================================================================
// CRM ISTHO - Análisis de Alineación ACTUALIZADO
// Incorpora: Stack real (React 19, Vite 7), Roles/Permisos, Estado actual
// Fecha: Enero 2026
// ============================================================================

export default function AnalisisAlineacionActualizado() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Stack Tecnológico REAL (actualizado)
  // ═══════════════════════════════════════════════════════════════════════════

  const stackActual = {
    frontend: {
      core: [
        { nombre: 'React', version: '^19.2.0', estado: 'actual' },
        { nombre: 'Vite', version: '^7.2.4', estado: 'actual' },
        { nombre: 'React Router DOM', version: '^7.12.0', estado: 'actual' },
      ],
      estilos: [
        { nombre: 'Tailwind CSS', version: '^4.1.18', estado: 'actual' },
        { nombre: 'Material UI (MUI)', version: '^7.3.7', estado: 'actual' },
        { nombre: 'Emotion', version: 'latest', estado: 'actual' },
        { nombre: 'Lucide React', version: '^0.562.0', estado: 'actual' },
      ],
      utilidades: [
        { nombre: 'Axios', version: '^1.13.2', estado: 'actual' },
        { nombre: 'React Hook Form', version: '^7.70.0', estado: 'actual' },
        { nombre: 'Yup', version: '^1.7.1', estado: 'actual' },
        { nombre: 'Date-fns', version: '^4.1.0', estado: 'actual' },
        { nombre: 'Recharts', version: '^3.6.0', estado: 'actual' },
        { nombre: 'Notistack', version: '^3.0.2', estado: 'actual' },
      ],
    },
    backend: {
      core: [
        { nombre: 'Node.js', version: '20.x', estado: 'operativo' },
        { nombre: 'Express.js', version: '4.x', estado: 'operativo' },
        { nombre: 'Sequelize', version: '6.x', estado: 'operativo' },
        { nombre: 'MySQL', version: '8.x', estado: 'operativo' },
      ],
      adicionales: [
        { nombre: 'JWT', version: '-', estado: 'operativo' },
        { nombre: 'Nodemailer', version: '-', estado: 'operativo' },
        { nombre: 'Multer', version: '-', estado: 'operativo' },
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Estructura del Frontend REAL
  // ═══════════════════════════════════════════════════════════════════════════

  const estructuraFrontend = {
    directorios: [
      {
        nombre: 'src/api/',
        descripcion: 'Servicios de API y cliente Axios',
        estado: 'existente',
        necesitaActualizacion: true,
      },
      {
        nombre: 'src/assets/',
        descripcion: 'Imágenes y recursos estáticos',
        estado: 'existente',
        necesitaActualizacion: false,
      },
      {
        nombre: 'src/components/',
        descripcion: 'Componentes reutilizables',
        estado: 'existente',
        necesitaActualizacion: true,
      },
      {
        nombre: 'src/context/',
        descripcion: 'Contextos de React (AuthContext)',
        estado: 'existente',
        necesitaActualizacion: true,
      },
      {
        nombre: 'src/hooks/',
        descripcion: 'Custom Hooks',
        estado: 'existente',
        necesitaActualizacion: true,
      },
      {
        nombre: 'src/pages/',
        descripcion: 'Vistas/Módulos principales',
        estado: 'existente',
        necesitaActualizacion: true,
      },
      {
        nombre: 'src/styles/',
        descripcion: 'Estilos globales',
        estado: 'existente',
        necesitaActualizacion: false,
      },
      {
        nombre: 'src/utils/',
        descripcion: 'Funciones utilitarias',
        estado: 'existente',
        necesitaActualizacion: false,
      },
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Roles y Permisos definidos
  // ═══════════════════════════════════════════════════════════════════════════

  const roles = [
    {
      codigo: 'admin',
      nombre: 'Administrador',
      descripcion: 'Control total del sistema, gestión de usuarios y configuración',
      usuarios: 'Coordinador TI, Gerencia',
      color: 'purple',
    },
    {
      codigo: 'supervisor',
      nombre: 'Supervisor',
      descripcion: 'Gestión operativa completa, sin acceso a configuración del sistema',
      usuarios: 'Coordinador Logística, Jefe de Operaciones',
      color: 'blue',
    },
    {
      codigo: 'operador',
      nombre: 'Operador',
      descripcion: 'Operaciones del día a día, registro de eventos',
      usuarios: 'Personal de bodega, Auxiliares logísticos',
      color: 'green',
    },
    {
      codigo: 'cliente',
      nombre: 'Cliente',
      descripcion: 'Solo consulta de su propia información',
      usuarios: 'Lácteos Betania, Éxito, etc.',
      color: 'orange',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Decisión de Nomenclatura
  // ═══════════════════════════════════════════════════════════════════════════

  const _decisionNomenclatura = {
    frontend: {
      modulo: 'Despachos',
      rutas: ['/despachos', '/despachos/:id'],
      documentacion: 'ROLES_PERMISOS_MODULOS.md usa "Despachos"',
    },
    backend: {
      modulo: 'Operaciones',
      rutas: ['/api/v1/operaciones', '/api/v1/operaciones/:id'],
      razon: 'Integración con WMS, flujo ingreso/salida',
    },
    decision: {
      mantener: 'Despachos en Frontend',
      mapear: 'Frontend /despachos → Backend /operaciones',
      razon:
        'La documentación de permisos y la UX ya usan "Despachos". Es más intuitivo para el usuario final.',
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Plan de Acción Actualizado
  // ═══════════════════════════════════════════════════════════════════════════

  const planAccion = [
    {
      fase: 1,
      titulo: 'Capa de Servicios API',
      descripcion: 'Conectar frontend con backend',
      tareas: [
        {
          tarea: 'Configurar cliente Axios con interceptores JWT',
          archivo: 'src/api/client.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear servicio de autenticación',
          archivo: 'src/api/auth.service.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear servicio de clientes',
          archivo: 'src/api/clientes.service.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear servicio de inventario',
          archivo: 'src/api/inventario.service.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear servicio de despachos (mapea a /operaciones)',
          archivo: 'src/api/despachos.service.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear constantes de endpoints',
          archivo: 'src/api/endpoints.js',
          estado: 'pendiente',
        },
      ],
      prioridad: 'CRÍTICO',
    },
    {
      fase: 2,
      titulo: 'Contexto de Autenticación',
      descripcion: 'Sistema de login y protección de rutas',
      tareas: [
        {
          tarea: 'Implementar AuthContext completo',
          archivo: 'src/context/AuthContext.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear página de Login',
          archivo: 'src/pages/Auth/Login.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Implementar PrivateRoute',
          archivo: 'src/components/auth/PrivateRoute.jsx',
          estado: 'pendiente',
        },
        { tarea: 'Implementar useAuth hook', archivo: 'src/hooks/useAuth.js', estado: 'pendiente' },
        {
          tarea: 'Persistencia de sesión (localStorage)',
          archivo: 'src/context/AuthContext.jsx',
          estado: 'pendiente',
        },
      ],
      prioridad: 'CRÍTICO',
    },
    {
      fase: 3,
      titulo: 'Sistema de Permisos',
      descripcion: 'Implementar roles y permisos según matriz',
      tareas: [
        {
          tarea: 'Implementar usePermissions hook',
          archivo: 'src/hooks/usePermissions.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Crear constantes de permisos',
          archivo: 'src/utils/permissions.js',
          estado: 'pendiente',
        },
        {
          tarea: 'Componente ProtectedAction',
          archivo: 'src/components/auth/ProtectedAction.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Filtrado de menú por rol',
          archivo: 'src/components/layout/FloatingHeader.jsx',
          estado: 'pendiente',
        },
      ],
      prioridad: 'ALTO',
    },
    {
      fase: 4,
      titulo: 'Hooks de Datos',
      descripcion: 'Custom hooks para cada módulo',
      tareas: [
        { tarea: 'useClientes hook', archivo: 'src/hooks/useClientes.js', estado: 'pendiente' },
        { tarea: 'useInventario hook', archivo: 'src/hooks/useInventario.js', estado: 'pendiente' },
        {
          tarea: 'useDespachos hook (usa /operaciones)',
          archivo: 'src/hooks/useDespachos.js',
          estado: 'pendiente',
        },
        { tarea: 'useReportes hook', archivo: 'src/hooks/useReportes.js', estado: 'pendiente' },
        { tarea: 'useDashboard hook', archivo: 'src/hooks/useDashboard.js', estado: 'pendiente' },
      ],
      prioridad: 'ALTO',
    },
    {
      fase: 5,
      titulo: 'Funcionalidades WMS',
      descripcion: 'Integrar flujo de documentos WMS en despachos',
      tareas: [
        {
          tarea: 'Selector de documento WMS',
          archivo: 'src/components/despachos/WmsDocumentoSelector.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Formulario de averías con foto',
          archivo: 'src/components/despachos/AveriaForm.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Upload de documento cumplido',
          archivo: 'src/components/despachos/DocumentoCumplidoUpload.jsx',
          estado: 'pendiente',
        },
        {
          tarea: 'Modal de cierre de despacho',
          archivo: 'src/components/despachos/CierreDespachoModal.jsx',
          estado: 'pendiente',
        },
      ],
      prioridad: 'MEDIO',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS: Mapeo de Endpoints (Frontend → Backend)
  // ═══════════════════════════════════════════════════════════════════════════

  const mapeoEndpoints = [
    { modulo: 'Auth', frontend: '/auth/*', backend: '/api/v1/auth/*', alineado: true },
    { modulo: 'Clientes', frontend: '/clientes/*', backend: '/api/v1/clientes/*', alineado: true },
    {
      modulo: 'Inventario',
      frontend: '/inventario/*',
      backend: '/api/v1/inventario/*',
      alineado: true,
    },
    {
      modulo: 'Despachos',
      frontend: '/despachos/*',
      backend: '/api/v1/operaciones/*',
      alineado: false,
      nota: 'Mapear en servicio',
    },
    {
      modulo: 'Dashboard',
      frontend: '/dashboard',
      backend: '/api/v1/operaciones/stats + /inventario/stats + /clientes/stats',
      alineado: true,
      nota: 'Combinar endpoints',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'resumen', label: '📊 Resumen', icon: '📊' },
    { id: 'stack', label: '🛠️ Stack', icon: '🛠️' },
    { id: 'estructura', label: '📁 Estructura', icon: '📁' },
    { id: 'roles', label: '👥 Roles', icon: '👥' },
    { id: 'nomenclatura', label: '📝 Nomenclatura', icon: '📝' },
    { id: 'plan', label: '🚀 Plan de Acción', icon: '🚀' },
  ];

  const getRoleColor = (color) => {
    const colors = {
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[color] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-400 text-white py-6 px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <span className="text-2xl">🔄</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Análisis de Alineación - ACTUALIZADO</h1>
                <p className="text-white/80 text-sm">
                  CRM ISTHO S.A.S. • Stack Real + Roles + Plan de Acción
                </p>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">React 19 • Vite 7 • Tailwind 4</p>
              <p className="text-xs text-white/60">MUI 7 • Node.js 20 • MySQL 8</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: RESUMEN */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Estado General */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📋</span> Estado General del Proyecto
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Frontend */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                      <span>🎨</span> Frontend
                    </h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Estructura Lista
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> 7 módulos con UI completa
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> 18 páginas implementadas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Lazy loading configurado
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">○</span> Conexión API pendiente
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">○</span> Sistema permisos pendiente
                    </li>
                  </ul>
                </div>

                {/* Backend */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <span>⚙️</span> Backend
                    </h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      85% Operativo
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-green-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Autenticación JWT
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> CRUD Clientes + Contactos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> CRUD Inventario + Alertas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Operaciones + WMS
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> Notificaciones Email
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Decisión Clave */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
                <span>⚡</span> Decisión de Nomenclatura
              </h2>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="bg-white rounded-xl p-4 flex-1 border border-amber-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Frontend (Usuario ve)</p>
                  <code className="text-lg font-bold text-blue-600">/despachos</code>
                </div>
                <span className="text-2xl text-amber-600">→</span>
                <div className="bg-white rounded-xl p-4 flex-1 border border-amber-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Backend (API real)</p>
                  <code className="text-lg font-bold text-green-600">/api/v1/operaciones</code>
                </div>
              </div>
              <p className="text-sm text-amber-700 mt-4">
                <strong>Decisión:</strong> Mantener &ldquo;Despachos&rdquo; en el frontend (más
                intuitivo para usuarios). El servicio de API hará el mapeo transparente a{' '}
                <code>/operaciones</code> del backend.
              </p>
            </div>

            {/* KPIs Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border text-center">
                <span className="text-3xl mb-2 block">👥</span>
                <p className="text-2xl font-bold text-gray-800">4</p>
                <p className="text-sm text-gray-500">Roles definidos</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border text-center">
                <span className="text-3xl mb-2 block">📦</span>
                <p className="text-2xl font-bold text-gray-800">12</p>
                <p className="text-sm text-gray-500">Módulos del sistema</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border text-center">
                <span className="text-3xl mb-2 block">🔧</span>
                <p className="text-2xl font-bold text-gray-800">5</p>
                <p className="text-sm text-gray-500">Fases del plan</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border text-center">
                <span className="text-3xl mb-2 block">📝</span>
                <p className="text-2xl font-bold text-gray-800">20+</p>
                <p className="text-sm text-gray-500">Archivos a crear</p>
              </div>
            </div>

            {/* Siguiente Paso */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span>🎯</span> Siguiente Paso Recomendado
              </h3>
              <p className="text-white/90 mb-4">
                Comenzar con la <strong>Fase 1: Capa de Servicios API</strong> para establecer la
                conexión entre el frontend existente y el backend operativo.
              </p>
              <div className="bg-white/20 rounded-xl p-4">
                <p className="font-mono text-sm">
                  📁 src/api/client.js → Axios con JWT interceptor
                  <br />
                  📁 src/api/despachos.service.js → Mapea a /operaciones
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: STACK */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stack' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Stack Tecnológico Real</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Frontend */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="bg-blue-500 text-white px-6 py-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>🎨</span> Frontend
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Core Framework</p>
                    <div className="space-y-2">
                      {stackActual.frontend.core.map((tech, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{tech.nombre}</span>
                          <code className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {tech.version}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Estilos & UI</p>
                    <div className="space-y-2">
                      {stackActual.frontend.estilos.map((tech, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{tech.nombre}</span>
                          <code className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {tech.version}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Utilidades</p>
                    <div className="space-y-2">
                      {stackActual.frontend.utilidades.map((tech, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{tech.nombre}</span>
                          <code className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {tech.version}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Backend */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="bg-green-500 text-white px-6 py-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>⚙️</span> Backend
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Core</p>
                    <div className="space-y-2">
                      {stackActual.backend.core.map((tech, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{tech.nombre}</span>
                          <code className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {tech.version}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Adicionales</p>
                    <div className="space-y-2">
                      {stackActual.backend.adicionales.map((tech, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{tech.nombre}</span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            ✓ Operativo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: ESTRUCTURA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'estructura' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Estructura del Proyecto Frontend
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <code className="text-sm text-gray-600">
                  ~/Documents/GitHub/istho-crm/frontend/src/
                </code>
              </div>
              <div className="divide-y">
                {estructuraFrontend.directorios.map((dir, i) => (
                  <div
                    key={i}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📁</span>
                      <div>
                        <code className="font-medium text-gray-800">{dir.nombre}</code>
                        <p className="text-sm text-gray-500">{dir.descripcion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          dir.estado === 'existente'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {dir.estado}
                      </span>
                      {dir.necesitaActualizacion && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                          Actualizar
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Árbol de estructura */}
            <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
              <pre className="text-green-400 text-xs font-mono">
                {`frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── api/             # 🔧 ACTUALIZAR - Servicios de API
│   │   ├── client.js        # Axios con JWT interceptor
│   │   ├── endpoints.js     # Constantes de rutas
│   │   ├── auth.service.js
│   │   ├── clientes.service.js
│   │   ├── inventario.service.js
│   │   └── despachos.service.js  # Mapea a /operaciones
│   │
│   ├── components/      # ✅ EXISTENTE - Componentes
│   │   ├── charts/          # Recharts
│   │   ├── common/          # Button, Modal, StatusChip...
│   │   ├── forms/           # Formularios reutilizables
│   │   ├── layout/          # FloatingHeader
│   │   └── auth/            # 🆕 NUEVO - PrivateRoute, ProtectedAction
│   │
│   ├── context/         # 🔧 ACTUALIZAR - Estado global
│   │   └── AuthContext.jsx  # Autenticación completa
│   │
│   ├── hooks/           # 🔧 ACTUALIZAR - Custom hooks
│   │   ├── useAuth.js
│   │   ├── usePermissions.js
│   │   ├── useClientes.js
│   │   ├── useInventario.js
│   │   └── useDespachos.js
│   │
│   ├── pages/           # ✅ EXISTENTE - Vistas
│   │   ├── Auth/            # 🆕 NUEVO - Login
│   │   ├── Dashboard/
│   │   ├── Clientes/
│   │   ├── Inventario/
│   │   ├── Despachos/       # Usa backend /operaciones
│   │   ├── Trazabilidad/
│   │   ├── Reportes/
│   │   └── Perfil/
│   │
│   ├── utils/           # ✅ EXISTENTE
│   │   └── permissions.js   # 🆕 NUEVO - Matriz de permisos
│   │
│   ├── App.jsx          # ✅ EXISTENTE - Agregar AuthProvider
│   └── main.jsx         # ✅ EXISTENTE
│
└── package.json         # ✅ EXISTENTE`}
              </pre>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: ROLES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Sistema de Roles y Permisos</h2>

            {/* Roles Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {roles.map((rol, i) => (
                <div key={i} className={`rounded-2xl p-6 border-2 ${getRoleColor(rol.color)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">{rol.nombre}</h3>
                    <code className="text-xs bg-white/50 px-2 py-1 rounded">{rol.codigo}</code>
                  </div>
                  <p className="text-sm mb-3">{rol.descripcion}</p>
                  <p className="text-xs opacity-75">
                    <strong>Usuarios típicos:</strong> {rol.usuarios}
                  </p>
                </div>
              ))}
            </div>

            {/* Jerarquía */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Jerarquía de Acceso</h3>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium">
                  Admin
                </div>
                <span className="text-gray-400">→</span>
                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium">
                  Supervisor
                </div>
                <span className="text-gray-400">→</span>
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium">
                  Operador
                </div>
                <span className="text-gray-400">→</span>
                <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-medium">
                  Cliente
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">
                Cada rol hereda los permisos de lectura de los roles inferiores
              </p>
            </div>

            {/* Implementación */}
            <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
              <p className="text-gray-400 text-sm mb-4">
                {'// hooks/usePermissions.js - Implementación sugerida'}
              </p>
              <pre className="text-green-400 text-xs font-mono">
                {`const PERMISSIONS = {
  admin: {
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'eliminar', 'confirmar', 'cancelar'],
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'sincronizar'],
    usuarios: ['ver', 'crear', 'editar', 'eliminar'],
    configuracion: ['ver', 'editar'],
    reportes: ['ver', 'exportar', 'programar'],
  },
  supervisor: {
    clientes: ['ver', 'crear', 'editar', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'confirmar', 'cancelar'],
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'sincronizar'],
    usuarios: [],
    configuracion: ['ver'],
    reportes: ['ver', 'exportar'],
  },
  operador: {
    clientes: ['ver'],
    despachos: ['ver', 'crear', 'editar', 'cambiar_estado'],
    inventario: ['ver'],
    usuarios: [],
    configuracion: [],
    reportes: ['ver'],
  },
  cliente: {
    clientes: ['ver_propio'],
    despachos: ['ver_propios'],
    inventario: ['ver_propio', 'exportar_propio'],
    usuarios: [],
    configuracion: [],
    reportes: ['ver_propios', 'exportar_propios'],
  }
};

export const usePermissions = () => {
  const { user } = useAuth();
  
  const can = (modulo, accion) => {
    if (!user) return false;
    const permisos = PERMISSIONS[user.rol]?.[modulo] || [];
    return permisos.includes(accion);
  };

  return { can, user };
};`}
              </pre>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: NOMENCLATURA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'nomenclatura' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Decisión de Nomenclatura: Despachos vs Operaciones
            </h2>

            {/* Comparativa */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <span>🎨</span> Frontend (Usuario)
                </h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Módulo</p>
                    <p className="font-bold text-blue-700 text-lg">Despachos</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Rutas</p>
                    <code className="text-blue-600">/despachos, /despachos/:id</code>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Documentación</p>
                    <p className="text-sm text-blue-700">
                      ROLES_PERMISOS_MODULOS.md usa &ldquo;Despachos&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                  <span>⚙️</span> Backend (API)
                </h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Módulo</p>
                    <p className="font-bold text-green-700 text-lg">Operaciones</p>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Endpoints</p>
                    <code className="text-green-600">/api/v1/operaciones/*</code>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Razón</p>
                    <p className="text-sm text-green-700">Integración WMS, flujo ingreso/salida</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decisión */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                <span>✅</span> Decisión Final
              </h3>
              <div className="bg-white rounded-xl p-4 mb-4">
                <p className="font-medium text-gray-800 mb-2">
                  <strong>Mantener &ldquo;Despachos&rdquo; en el Frontend</strong>
                </p>
                <p className="text-sm text-gray-600">
                  El servicio de API hará el mapeo transparente: el usuario nunca ve
                  &ldquo;operaciones&rdquo;, pero internamente las peticiones van a{' '}
                  <code>/api/v1/operaciones</code>.
                </p>
              </div>
              <p className="text-sm text-amber-700">
                <strong>Justificación:</strong> La documentación de permisos y toda la UX ya usan
                &ldquo;Despachos&rdquo;. Es el término más intuitivo para usuarios de logística en
                Colombia.
              </p>
            </div>

            {/* Mapeo en Código */}
            <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
              <p className="text-gray-400 text-sm mb-4">
                {'// api/despachos.service.js - Mapeo transparente'}
              </p>
              <pre className="text-green-400 text-xs font-mono">
                {`// El frontend usa "despachos", pero internamente llama a "operaciones"
import apiClient from './client';

const BASE_URL = '/operaciones';  // ← Backend usa operaciones

export const despachosService = {
  // Listar despachos (llama a /operaciones)
  getAll: (params) => apiClient.get(BASE_URL, { params }),
  
  // Obtener despacho por ID
  getById: (id) => apiClient.get(\`\${BASE_URL}/\${id}\`),
  
  // Crear despacho (operación)
  create: (data) => apiClient.post(BASE_URL, data),
  
  // Documentos WMS
  getDocumentosWMS: (tipo) => 
    apiClient.get(\`\${BASE_URL}/wms/documentos\`, { params: { tipo } }),
  
  // Cerrar despacho (operación)
  cerrar: (id, data) => apiClient.post(\`\${BASE_URL}/\${id}/cerrar\`, data),
};

export default despachosService;`}
              </pre>
            </div>

            {/* Tabla de Mapeo */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-800">Mapeo de Endpoints</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Módulo</th>
                    <th className="px-4 py-3 text-left">Frontend (UI)</th>
                    <th className="px-4 py-3 text-left">Backend (API)</th>
                    <th className="px-4 py-3 text-center">Alineado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mapeoEndpoints.map((ep, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ep.modulo}</td>
                      <td className="px-4 py-3">
                        <code className="text-blue-600">{ep.frontend}</code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-green-600">{ep.backend}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ep.alineado ? (
                          <span className="text-green-500 text-lg">✓</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                            {ep.nota}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: PLAN */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Plan de Acción para Alineación</h2>

            {planAccion.map((fase, faseIndex) => (
              <div
                key={faseIndex}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden"
              >
                <div
                  className={`px-6 py-4 cursor-pointer flex items-center justify-between ${
                    fase.prioridad === 'CRÍTICO'
                      ? 'bg-red-50'
                      : fase.prioridad === 'ALTO'
                        ? 'bg-amber-50'
                        : 'bg-blue-50'
                  }`}
                  onClick={() => toggleSection(`fase-${faseIndex}`)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        fase.prioridad === 'CRÍTICO'
                          ? 'bg-red-500'
                          : fase.prioridad === 'ALTO'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      }`}
                    >
                      {fase.fase}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{fase.titulo}</h3>
                      <p className="text-sm text-gray-600">{fase.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        fase.prioridad === 'CRÍTICO'
                          ? 'bg-red-100 text-red-700'
                          : fase.prioridad === 'ALTO'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {fase.prioridad}
                    </span>
                    <span
                      className={`transform transition-transform ${expandedSections[`fase-${faseIndex}`] ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {expandedSections[`fase-${faseIndex}`] && (
                  <div className="border-t">
                    {fase.tareas.map((tarea, tareaIndex) => (
                      <div
                        key={tareaIndex}
                        className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400">○</span>
                          <span className="text-sm text-gray-700">{tarea.tarea}</span>
                        </div>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tarea.archivo}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Resumen de Archivos */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span>📋</span> Resumen de Archivos a Crear/Modificar
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-2">Servicios API (6)</p>
                  <ul className="space-y-1 text-green-400 font-mono text-xs">
                    <li>• client.js</li>
                    <li>• endpoints.js</li>
                    <li>• auth.service.js</li>
                    <li>• clientes.service.js</li>
                    <li>• inventario.service.js</li>
                    <li>• despachos.service.js</li>
                  </ul>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Hooks (6)</p>
                  <ul className="space-y-1 text-blue-400 font-mono text-xs">
                    <li>• useAuth.js</li>
                    <li>• usePermissions.js</li>
                    <li>• useClientes.js</li>
                    <li>• useInventario.js</li>
                    <li>• useDespachos.js</li>
                    <li>• useDashboard.js</li>
                  </ul>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Componentes (5)</p>
                  <ul className="space-y-1 text-purple-400 font-mono text-xs">
                    <li>• AuthContext.jsx</li>
                    <li>• PrivateRoute.jsx</li>
                    <li>• ProtectedAction.jsx</li>
                    <li>• Login.jsx</li>
                    <li>• permissions.js</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold">ISTHO</span>
            <span>S.A.S. - Análisis de Alineación Actualizado</span>
          </div>
          <div>Enero 2026 • v2.0</div>
        </div>
      </footer>
    </div>
  );
}
