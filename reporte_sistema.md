# Reporte de Estructura y Stack Tecnológico del Sistema ISTHO CRM

**Fecha:** 9 de Enero, 2026
**Ubicación del Proyecto:** `~/Documents/GitHub/istho-crm`

## 1. Resumen Ejecutivo
El proyecto `istho-crm` es una aplicación web moderna construida principalmente como una Single Page Application (SPA). El repositorio analizado contiene una estructura dedicada al **frontend**, desarrollada con tecnologías de última generación como React 19 y Vite 7. La arquitectura es modular, organizada por características funcionales (páginas) y componentes reutilizables.

## 2. Stack Tecnológico

El proyecto utiliza un conjunto de herramientas moderno y robusto, orientado al rendimiento y la experiencia de desarrollo.

### Core Framework & Build Tool
- **React**: `^19.2.0` - Biblioteca principal de UI.
- **Vite**: `^7.2.4` - Empaquetador y servidor de desarrollo de alta velocidad.

### Lenguaje & Estándares
- **JavaScript (ES Modules)**: El proyecto utiliza módulos ES nativos (`type: "module"` en package.json).

### Estilos & UI
- **Tailwind CSS**: `^4.1.18` - Framework de utilidades CSS (versión más reciente).
- **Material UI (MUI)**: `^7.3.7` - Componentes de interfaz preconstruidos.
- **Emotion**: `@emotion/react` & `@emotion/styled` - Motor de estilos para MUI y CSS-in-JS.
- **Lucide React**: `^0.562.0` - Conjunto de iconos ligero y consistente.

### Enrutamiento & Estado
- **React Router DOM**: `^7.12.0` - Gestión de rutas del lado del cliente.
- **React Hook Form**: `^7.70.0` - Gestión eficiente de formularios.
- **Zustand / Context**: *(Inferencia basada en estructura)* Se detectó uso de Context API y/o Hooks personalizados para gestión de estado global.

### Utilidades & Librerías Auxiliares
- **Axios**: `^1.13.2` - Cliente HTTP para peticiones al backend.
- **Date-fns**: `^4.1.0` - Manipulación de fechas.
- **Recharts**: `^3.6.0` - Gráficos y visualización de datos.
- **Yup**: `^1.7.1` - Validación de esquemas (usado con React Hook Form).
- **Notistack**: `^3.0.2` - Notificaciones tipo "toast".

## 3. Estructura del Proyecto

La estructura de directorios sigue las mejores prácticas para aplicaciones React escalables:

```text
frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── api/             # Definiciones de llamadas al backend
│   ├── assets/          # Imágenes y recursos estáticos importados
│   ├── components/      # Componentes reutilizables
│   │   ├── charts/      # Componentes de gráficos (Recharts)
│   │   ├── common/      # Botones, inputs, cards genéricos
│   │   ├── forms/       # Componentes de formulario reutilizables
│   │   └── layout/      # Estructura de página (FloatingHeader, etc.)
│   ├── context/         # Contextos de React (Estado Global)
│   ├── hooks/           # Custom Hooks
│   ├── pages/           # Vistas principales (Módulos)
│   ├── styles/          # Estilos globales adicionales
│   ├── utils/           # Funciones de utilidad
│   ├── App.jsx          # Configuración principal y rutas
│   └── main.jsx         # Punto de entrada
└── package.json         # Dependencias y scripts
```

## 4. Módulos y Rutas

El sistema está dividido en módulos de negocio claros, cada uno con sus propias rutas definidas en `App.jsx`.

### Dashboard
- **Ruta Base:** `/dashboard`
- **Descripción:** Vista principal con métricas y resúmenes.

### Clientes
- **Rutas:**
    - `/clientes` (Listado)
    - `/clientes/:id` (Detalle)
- **Componentes Clave:** `ClientesList`, `ClienteDetail`.

### Inventario
- **Rutas:**
    - `/inventario` (Listado)
    - `/inventario/productos/:id` (Detalle Producto)
    - `/inventario/alertas` (Gestión de Alertas)

### Despachos
- **Rutas:**
    - `/despachos` (Listado)
    - `/despachos/:id` (Detalle)

### Trazabilidad
- **Rutas:**
    - `/trazabilidad` (Listado General)
    - `/trazabilidad/mapa` (Vista de Mapa)
    - `/trazabilidad/timeline/:id` (Línea de tiempo detallada)
    - `/trazabilidad/evidencias/:id` (Visualización de evidencias)

### Reportes
- **Rutas:**
    - `/reportes` (Panel General)
    - `/reportes/despachos`
    - `/reportes/inventario`
    - `/reportes/clientes`
    - `/reportes/operativo`
    - `/reportes/kpis`
    - `/reportes/financiero`

### Perfil y Configuración
- **Rutas:**
    - `/perfil`, `/configuracion`, `/notificaciones`, `/alertas`

### Autenticación & Seguridad
- Aunque no se listaron rutas explícitas de login en `App.jsx` (posiblemente manejado en un componente padre o layout condicional), existe un directorio `pages/Auth` y contextos relacionados.

## 5. Componentes Reutilizables Destacados

El directorio `src/components` revela una arquitectura orientada a la reutilización:
- **Layout:** Uso de `FloatingHeader` para una navegación consistente.
- **Charts:** Abstracción de gráficos para reportes y dashboard.
- **Common:** Probablemente incluye `StatCard`, botones personalizados y elementos de UI base.

## 6. Observaciones
- **Backend:** En la exploración actual (`frontend/`), no se encontró código de backend. Es probable que sea un servicio separado o una API externa.
- **Lazy Loading:** `App.jsx` implementa `React.lazy` y `Suspense` para todas las páginas principales, lo que optimiza significativamente el tiempo de carga inicial de la aplicación.
- **Estado de Desarrollo:** Rutas protegidas por una redirección por defecto al Dashboard o una página 404 "ComingSoon", indicando que el sistema tiene áreas en desarrollo activo.
