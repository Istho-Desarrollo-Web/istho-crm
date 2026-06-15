# CenthriX Landing Page — Diseño

> **Para agentic workers:** REQUIRED SUB-SKILL: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.

**Objetivo:** Construir un sitio web público de una sola página que posicione CENTHRIX como ecosistema ERP logístico empresarial, dirigido tanto a clientes actuales de ISTHO como a potenciales licenciatarios en Latinoamérica.

**Arquitectura:** Single-page React SPA con scroll suave entre secciones. Sin routing. Sin backend — formulario de contacto vía `mailto:` + WhatsApp. Animaciones con CSS transitions + hook `useScrollReveal` basado en `IntersectionObserver`.

**Stack:** React 19 · Vite 6 · Tailwind CSS 4 · Lucide React · SVG puro para el diagrama de integración

---

## Contexto de negocio

CENTHRIX es el ERP logístico propio de **ISTHO S.A.S.** (Centro Logístico Industrial del Norte, Girardota, Antioquia, Colombia). No es un producto de terceros — ISTHO lo desarrolla y lo opera simultáneamente, siendo su primer y más exigente cliente.

El ecosistema está compuesto por 5 productos:

| Producto | Color | Estado |
|----------|-------|--------|
| CenthriX WMS | `#3498DB` | En producción |
| CenthriX CRM | `#E74C3C` | En producción |
| CenthriX Transporte | `#E67E22` | En desarrollo |
| CenthriX Finance | `#2ECC71` | Planeado |
| CenthriX Human | `#9B59B6` | Planeado |

La landing tiene dos audiencias simultáneas:
1. **Clientes actuales de ISTHO** — acceso al portal CRM
2. **Potenciales licenciatarios en LATAM** — operadores logísticos que podrían adoptar CENTHRIX

---

## Identidad visual

Tokens CSS (idénticos a la landing de ISTHO — `src/index.css`):

```css
:root {
  --bg-primary:   #0F1023;
  --bg-card:      #151631;
  --bg-surface:   #1A1B3A;
  --accent:       #E74C3C;
  --accent-hover: #C0392B;
  --success:      #2ECC71;
  --text-primary: #E8EAF6;
  --text-muted:   #6A7480;
}
```

Tipografía:
- **Rajdhani 700** — headings y display (importar desde Google Fonts)
- **system-ui / Segoe UI** — body y datos

---

## Estructura de archivos

```
centhrix-web/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── HeroSection.jsx
│   │   ├── EcosystemSection.jsx
│   │   ├── IntegrationDiagram.jsx
│   │   ├── ISTHOProof.jsx
│   │   ├── AudienceSection.jsx
│   │   ├── ContactSection.jsx
│   │   ├── Footer.jsx
│   │   └── ScrollToTop.jsx
│   ├── hooks/
│   │   └── useScrollReveal.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   ├── logo-centhrix.svg
│   ├── logo-istho.svg
│   └── favicon.ico
├── package.json
├── vite.config.js
├── tailwind.config.js
└── vercel.json
```

---

## Dependencias

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

**Excluidas explícitamente:**
- `framer-motion` — las animaciones se implementan con CSS keyframes + `IntersectionObserver`
- `react-router-dom` — sitio de una sola página, sin routing
- Cualquier librería de diagramas — el hub-spoke se hace en SVG puro

---

## Especificación de secciones

### Navbar

**Componente:** `Navbar.jsx`

Sticky top-0 con `backdrop-blur-md`. Borde inferior `border-b border-white/10` que aparece al hacer scroll (`scrollY > 50`, listener en `useEffect`).

Estructura:
- Izquierda: logo CENTHRIX (SVG, altura 32px)
- Centro: links de navegación `El Ecosistema`, `ISTHO`, `Contacto` — cada uno hace `scrollIntoView` al ID de su sección (`#ecosystem`, `#istho`, `#contact`)
- Derecha: botón `Solicitar Demo` (fondo `#E74C3C`, hover `#C0392B`) que scrollea a `#contact`

Mobile (< 768px): ocultar links del centro, mostrar botón hamburguesa que abre un drawer vertical con los mismos links + CTA.

---

### HeroSection

**Componente:** `HeroSection.jsx`

Layout asimétrico (Estilo C). Grid `grid-cols-1 lg:grid-cols-[3fr_2fr]` con gap-12.

**Columna izquierda:**
1. Badge: `— ISTHO S.A.S. · GIRARDOTA, COLOMBIA —` (texto 11px, color `#E74C3C`, letter-spacing 2px, uppercase)
2. Headline: `EL ECOSISTEMA` (línea 1, Rajdhani 700, 72px desktop/48px mobile, color `#E74C3C`) + `CENTHRIX` (línea 2, Rajdhani 700, 80px desktop/56px mobile, color white)
3. Subheadline: `Gestión integral de bodegas, clientes, transporte, finanzas y talento — todo conectado en una sola plataforma.` (18px, color `var(--text-muted)`, max-w-lg)
4. CTA doble:
   - `Solicitar Demo` — botón primario rojo, scrollea a `#contact`
   - `Conocer el ecosistema` — botón outline blanco/10, scrollea a `#ecosystem`

**Columna derecha:** Grid `grid-cols-2 gap-3` de 5 product cards (la quinta ocupa las 2 columnas, centrada). Cada card:
- Borde superior 3px con color del producto
- Fondo `var(--bg-card)` con hover `var(--bg-surface)`
- Punto de color (8px circle) + nombre del producto en bold + descripción corta en muted
- Chip `EN VIVO` (verde, `#2ECC71`) o `PRÓXIMO` (gris, `#5A6475`)

**Fondo del hero:** radial gradient desde esquina superior derecha `rgba(231,76,60,0.08)` sobre `var(--bg-primary)` + patrón SVG de puntos (grid de círculos 1px cada 24px) con opacity 0.04.

**Animaciones de entrada:**
- Columna izquierda: `fade-in + translate-y-4 → translate-y-0` a 0.6s
- Cards derecha: stagger de 0.1s por card (delay creciente con index)

---

### EcosystemSection

**Componente:** `EcosystemSection.jsx`  
**ID:** `#ecosystem`

Headline centrado: `El ecosistema completo` (Rajdhani 700, 48px) + subtexto: `Cinco productos. Un único sistema de datos.`

Grid de productos. WMS y CRM (en producción) usan cards **expandidas** (col-span 1 en grid de 2 columnas). Transporte, Finance y Human usan cards **compactas** en grid de 3 columnas.

**Card expandida (WMS / CRM):**
- Borde superior 3px con color del producto
- Header: ícono Lucide (24px) + nombre `CenthriX WMS` + badge `EN VIVO`
- Descripción (2-3 líneas)
- Lista de 4 features clave con checkmarks verdes
- Fondo `var(--bg-card)`

Contenido WMS: Gestión de inventario por caja/lote/ubicación · Sincronización bidireccional con app WMS móvil · Auditoría de entradas CO, salidas PK, ajustes CR · Alertas de stock bajo y vencimientos

Contenido CRM: Gestión de +15 clientes corporativos (Lactalis, Knauf, Eternit, Épiroc) · Portal de consulta para clientes · Solicitudes de ingreso y despacho · Reportes operativos en Excel y PDF

**Card compacta (Transporte / Finance / Human):**
- Borde superior 3px con color del producto
- Header: ícono Lucide + nombre + badge `PRÓXIMO`
- Descripción corta (1-2 líneas)
- Fondo `var(--bg-surface)` (más sutil que las en producción)

Contenido Transporte: TMS propio — gestión de flota, conductores y viajes. Reemplaza soluciones externas.

Contenido Finance: Facturación y liquidaciones integradas con la operación logística.

Contenido Human: Gestión de talento para operarios, conductores y personal administrativo.

**Animación:** sección aparece con `useScrollReveal` — fade-in + translate-y-8 al entrar en viewport.

---

### IntegrationDiagram

**Componente:** `IntegrationDiagram.jsx`  
**ID:** `#integration`

Fondo `var(--bg-card)` con padding generoso. Diferenciador visual del sitio.

**Headline:** `Un único sistema de datos para toda la operación` (Rajdhani 700, centrado)

**Layout grid-cols-1 lg:grid-cols-2:**

**Columna izquierda — Diagrama SVG hub-spoke:**
- SVG 400×400 viewBox
- Centro: círculo 60px radio, fondo `var(--bg-surface)`, texto `CENTHRIX`
- 5 nodos en posiciones polar (72° separación): cada uno es un círculo 36px radio con color del producto, texto del nombre
- Líneas de conexión: `stroke-dasharray` + animación CSS `@keyframes` que anima `stroke-dashoffset` en loop (sensación de "flujo de datos")
- Animación se activa cuando el componente entra en viewport (`useScrollReveal`)

**Columna derecha — Antes vs Después:**
- Título `Antes de CENTHRIX`
- Lista de ítems tachados: Excel para inventario · Avansat para transporte · Hojas separadas por área · Reportes manuales
- Título `Con CENTHRIX`
- Lista de ítems con checkmarks verdes: Todo integrado · Un único login · Datos en tiempo real · Reportes automáticos

---

### ISTHOProof

**Componente:** `ISTHOProof.jsx`  
**ID:** `#istho`

Fondo diferenciado `var(--bg-card)` con borde superior `border-t border-accent/20`.

**Headline:** `Desarrollado y operado por ISTHO S.A.S.` (Rajdhani 700, 40px)

**Subtexto:** `ISTHO no solo usa CENTHRIX — ISTHO es el primer y más exigente cliente de la plataforma. Lo que funciona aquí, funciona en producción real.`

**Grid de 3 stat cards** (`grid-cols-1 lg:grid-cols-3`):
1. `+15` · clientes corporativos activos
2. `ISO 9001:2015` · certificación de calidad
3. `2` · módulos en producción hoy

Cada stat card: número grande en Rajdhani 700 color `#E74C3C` + label en texto muted.

**Lista de clientes** (texto, sin logos de imagen para evitar solicitar permisos):
`Lactalis · Knauf · Eternit · Épiroc · PMA · y más de 10 empresas más`

**Certificación:** badge ISO 9001:2015 estilizado con borde dorado/neutro.

---

### AudienceSection

**Componente:** `AudienceSection.jsx`

**Headline:** `¿Para quién es CENTHRIX?`

**Grid de 4 audience cards** con ícono Lucide (32px) + título + descripción corta:

1. `Warehouse` ícono · **Operador logístico** · Empresas que gestionan bodegas y almacenamiento de terceros
2. `Truck` ícono · **Distribuidora con flota** · Empresas con transporte propio y necesidad de TMS
3. `Package` ícono · **Almacenador 3PL** · Operadores que manejan inventario por múltiples clientes
4. `Building2` ícono · **Empresa con bodega** · Industrias con operación interna de almacenamiento

**Párrafo de visión** (centrado, max-w-2xl, texto más grande ~20px):
`CENTHRIX nació en Girardota, Colombia. Su próxima escala es Latinoamérica.`

Decoración: mapa SVG minimalista de LATAM (solo contorno, líneas finas color white/5) con un punto rojo pulsante sobre Colombia.

---

### ContactSection

**Componente:** `ContactSection.jsx`  
**ID:** `#contact`

**Headline:** `Comienza hoy`

**Grid de 2 columnas** (`grid-cols-1 lg:grid-cols-2`):

**Card izquierda — "Soy cliente de ISTHO":**
- Ícono: `Users` Lucide (40px, color `#3498DB`)
- Título: `Acceder al portal`
- Descripción: `Si eres cliente de ISTHO, accede a tu inventario, operaciones y reportes en tiempo real.`
- Botón: `Ir al portal CRM` → enlace a `https://istho-crm-six.vercel.app/login`
- Borde: color `#3498DB`

**Card derecha — "Quiero CENTHRIX para mi empresa":**
- Ícono: `Rocket` Lucide (40px, color `#E74C3C`)
- Título: `Solicitar una demo`
- Formulario simple (sin backend):
  - Input: Nombre completo
  - Input: Empresa
  - Input: Email
  - Textarea: Mensaje (placeholder: `Cuéntanos sobre tu operación...`)
  - Botón `Enviar` → `mailto:liderti@istho.com.co?subject=Demo CENTHRIX&body=...` construido con los valores del form
- Enlace secundario: ícono WhatsApp + `Escribir por WhatsApp` → `https://wa.me/57XXXXXXXXXX` (**número a confirmar con el usuario antes de implementar**)
- Borde: color `#E74C3C`

**Nota:** el `mailto:` no requiere backend. El formulario construye el string del body con los valores del estado React y abre el cliente de email del usuario.

---

### Footer

**Componente:** `Footer.jsx`

Grid 3 columnas en desktop, 1 columna en mobile.

**Columna 1:** Logo CENTHRIX (SVG) + tagline `El ecosistema logístico de ISTHO`

**Columna 2 — Links:**
- El Ecosistema (scroll a #ecosystem)
- ISTHO (scroll a #istho)
- Contacto (scroll a #contact)
- Acceder al CRM (link externo)

**Columna 3 — Info:**
- ISO 9001:2015
- Girardota, Antioquia, Colombia
- liderti@istho.com.co

**Fila inferior** (border-top, padding-top):
- Izquierda: Logo ISTHO pequeño (SVG o texto) + `ISTHO S.A.S.`
- Derecha: `© 2026 CENTHRIX — Desarrollado por ISTHO S.A.S.`

---

### ScrollToTop

**Componente:** `ScrollToTop.jsx`

Botón circular fijo `fixed bottom-6 right-6`, aparece cuando `scrollY > 400`. Ícono `ChevronUp` Lucide. Al hacer click: `window.scrollTo({ top: 0, behavior: 'smooth' })`.

---

## Hook: useScrollReveal

**Archivo:** `src/hooks/useScrollReveal.js`

```js
// Uso: const ref = useScrollReveal()
// Agrega clase 'revealed' al elemento cuando entra en viewport
// CSS: .reveal { opacity: 0; transform: translateY(32px); transition: ... }
//      .reveal.revealed { opacity: 1; transform: translateY(0); }
```

Implementación con `IntersectionObserver`, threshold 0.15, `rootMargin: '-50px'`. Una sola observación por elemento (desconecta después de revelar).

---

## Animaciones

| Elemento | Tipo | Config |
|----------|------|--------|
| Hero headline | CSS keyframe `fade-slide-up` | 0.6s ease-out |
| Hero product cards | Stagger con `animation-delay: calc(index * 0.1s)` | 0.4s cada una |
| Sections on scroll | `useScrollReveal` + clase CSS `.reveal` | 0.5s ease-out |
| Diagram SVG lines | `stroke-dashoffset` loop | 2s linear infinite |
| Stat counters | `countUp` en `useEffect` al revelar | 1.5s lineal |
| Card hover | `transform: translateY(-2px)` + box-shadow | 0.2s ease |

---

## App.jsx

Composición de todas las secciones en orden:

```jsx
function App() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <EcosystemSection />
        <IntegrationDiagram />
        <ISTHOProof />
        <AudienceSection />
        <ContactSection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  )
}
```

---

## Deployment

**Repo:** `centhrix-web` (nuevo repo GitHub, independiente de `istho-crm-p`)

**Vercel:**
- Framework: Vite
- Root directory: `/`
- Build command: `vite build`
- Output directory: `dist`
- Sin variables de entorno requeridas

**`vercel.json`:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Dominio:** A confirmar — opciones: `centhrix.com` o `centhrix.istho.com.co`

---

## Fuera de alcance (v1)

- Sub-páginas por producto (`/wms`, `/crm`, etc.)
- Blog o contenido dinámico
- Backend propio para el formulario (se puede agregar Formspree después)
- Internacionalización (inglés / español)
- Animaciones con Framer Motion
- Login SSO desde la landing
- Analytics (se puede agregar Google Analytics / Vercel Analytics después)
