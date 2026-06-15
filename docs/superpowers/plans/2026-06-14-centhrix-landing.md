# CenthriX Landing Page — Plan de Implementación

> **Para agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el sitio web público de CENTHRIX — una single-page React SPA que posiciona el ecosistema ERP logístico de ISTHO como plataforma empresarial para operadores en LATAM.

**Architecture:** Proyecto independiente del monorepo CRM (`centhrix-web/`). Sin backend — formulario de contacto via `mailto:` + WhatsApp. Animaciones con CSS keyframes + `IntersectionObserver`, sin Framer Motion. Diagrama de integración hub-spoke en SVG puro.

**Tech Stack:** React 19 · Vite 6 · Tailwind CSS 4 (`@tailwindcss/vite`) · Lucide React · CSS custom properties · SVG nativo

---

## Nota importante

Este proyecto es **completamente independiente** del monorepo `istho-crm-p`. Se crea en un directorio nuevo `centhrix-web/` con su propio Git. **Todos los comandos de esta guía se ejecutan desde dentro de `centhrix-web/`**, salvo que se indique lo contrario.

Spec de referencia: `docs/superpowers/specs/2026-06-14-centhrix-landing-design.md`

---

## Mapa de archivos

```
centhrix-web/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           ← sticky nav + hamburger mobile
│   │   ├── HeroSection.jsx      ← grid 3:2 + 5 product cards + CTAs
│   │   ├── EcosystemSection.jsx ← cards expandidas (WMS/CRM) + compactas (3 próximos)
│   │   ├── IntegrationDiagram.jsx ← SVG hub-spoke + Antes/Después
│   │   ├── ISTHOProof.jsx       ← stats animados + clientes + ISO badge
│   │   ├── AudienceSection.jsx  ← 4 audience cards + mapa LATAM SVG
│   │   ├── ContactSection.jsx   ← dual CTA cards + formulario mailto
│   │   ├── Footer.jsx           ← 3 columnas + bottom row
│   │   └── ScrollToTop.jsx      ← botón fijo scroll-to-top
│   ├── hooks/
│   │   └── useScrollReveal.js   ← IntersectionObserver → clase 'revealed'
│   ├── App.jsx                  ← composición de todas las secciones
│   ├── main.jsx                 ← entry point React
│   └── index.css                ← @theme Tailwind + tokens CSS + keyframes + .reveal
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── vercel.json                  ← SPA rewrite rule
```

---

### Task 1: Scaffolding del proyecto

**Archivos creados:** directorio `centhrix-web/`, `package.json`, `vite.config.js`, `.gitignore`

- [ ] **Step 1: Crear el proyecto con Vite**

Ejecutar **fuera** del directorio `istho-crm-p`:

```bash
cd ..
npm create vite@latest centhrix-web -- --template react
cd centhrix-web
```

Resultado esperado: directorio `centhrix-web/` con estructura de Vite (src/, index.html, package.json).

- [ ] **Step 2: Instalar dependencias**

```bash
npm install
npm install lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Reemplazar `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Limpiar el boilerplate de Vite**

Eliminar: `src/assets/react.svg` · `src/App.css`

Reemplazar `src/App.jsx` con un stub para verificar que el setup funciona:

```jsx
export default function App() {
  return <div style={{ color: 'white', padding: 40 }}>CenthriX — en construcción</div>
}
```

Reemplazar `src/index.css` con solo `@import "tailwindcss";` (se completa en Task 2).

- [ ] **Step 5: Verificar que el proyecto arranca**

```bash
npm run dev
```

Abrir `http://localhost:5173` — debe mostrar "CenthriX — en construcción" sobre fondo oscuro (Tailwind aplica reset). Sin errores en consola.

- [ ] **Step 6: Inicializar Git**

```bash
git init
git add .
git commit -m "feat: inicializar proyecto centhrix-web con Vite + React + Tailwind 4"
```

---

### Task 2: Estilos globales y tokens CSS

**Archivos modificados:** `src/index.css` (reemplazar contenido completo)

- [ ] **Step 1: Escribir `src/index.css`**

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');

@theme {
  --color-accent:           #E74C3C;
  --color-accent-hover:     #C0392B;
  --color-success:          #2ECC71;
  --color-muted:            #6A7480;
  --color-centhrix-bg:      #0F1023;
  --color-centhrix-card:    #151631;
  --color-centhrix-surface: #1A1B3A;
}

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

*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  margin: 0;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── Scroll reveal ── */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* ── Hero animations ── */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-hero {
  animation: fade-slide-up 0.6s ease-out both;
}

/* ── Diagrama de integración: flujo de datos ── */
@keyframes dash-flow {
  from { stroke-dashoffset: 10; }
  to   { stroke-dashoffset: 0; }
}

.diagram-line {
  stroke-dasharray: 6 4;
  animation: dash-flow 1.5s linear infinite;
}

/* ── Punto pulsante LATAM ── */
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.8); opacity: 0.5; }
}

.latam-dot {
  animation: pulse-dot 2s ease-in-out infinite;
  transform-origin: center;
}
```

- [ ] **Step 2: Verificar que los estilos aplican**

```bash
npm run dev
```

Abrir `http://localhost:5173` — el fondo debe ser **azul oscuro casi negro** (`#0F1023`), no blanco. Verificar en DevTools → Elements → `:root` que `--bg-primary` está definida.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: estilos globales, tokens CSS y animaciones base"
```

---

### Task 3: Hook `useScrollReveal`

**Archivos creados:** `src/hooks/useScrollReveal.js`

- [ ] **Step 1: Crear el directorio y el hook**

```bash
mkdir -p src/hooks
```

Crear `src/hooks/useScrollReveal.js`:

```js
import { useEffect, useRef } from 'react'

export function useScrollReveal(options = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.disconnect()
        }
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? '-50px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
```

**Patrón de uso en cada componente:**
```jsx
import { useScrollReveal } from '../hooks/useScrollReveal'

export default function MiSeccion() {
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="reveal" id="mi-seccion">
      {/* contenido */}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useScrollReveal.js
git commit -m "feat: hook useScrollReveal con IntersectionObserver"
```

---

### Task 4: `main.jsx` + `App.jsx` + stubs de componentes

**Archivos creados/modificados:** `src/main.jsx`, `src/App.jsx`, todos los `.jsx` en `src/components/`

- [ ] **Step 1: Crear directorio de componentes con stubs**

```bash
mkdir -p src/components
```

Crear cada archivo con un stub mínimo (se implementan en tasks siguientes):

`src/components/Navbar.jsx`:
```jsx
export default function Navbar() { return null }
```

`src/components/HeroSection.jsx`:
```jsx
export default function HeroSection() { return null }
```

`src/components/EcosystemSection.jsx`:
```jsx
export default function EcosystemSection() { return null }
```

`src/components/IntegrationDiagram.jsx`:
```jsx
export default function IntegrationDiagram() { return null }
```

`src/components/ISTHOProof.jsx`:
```jsx
export default function ISTHOProof() { return null }
```

`src/components/AudienceSection.jsx`:
```jsx
export default function AudienceSection() { return null }
```

`src/components/ContactSection.jsx`:
```jsx
export default function ContactSection() { return null }
```

`src/components/Footer.jsx`:
```jsx
export default function Footer() { return null }
```

`src/components/ScrollToTop.jsx`:
```jsx
export default function ScrollToTop() { return null }
```

- [ ] **Step 2: Escribir `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Escribir `src/App.jsx`**

```jsx
import Navbar from './components/Navbar.jsx'
import HeroSection from './components/HeroSection.jsx'
import EcosystemSection from './components/EcosystemSection.jsx'
import IntegrationDiagram from './components/IntegrationDiagram.jsx'
import ISTHOProof from './components/ISTHOProof.jsx'
import AudienceSection from './components/AudienceSection.jsx'
import ContactSection from './components/ContactSection.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'

export default function App() {
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

- [ ] **Step 4: Verificar que el proyecto arranca sin errores**

```bash
npm run dev
```

Abrir `http://localhost:5173` — la página debe estar en blanco (todos los componentes retornan `null`) con el fondo `#0F1023` y **sin errores en consola**.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: App.jsx + main.jsx + stubs de todos los componentes"
```

---

### Task 5: `Navbar.jsx`

**Archivos modificados:** `src/components/Navbar.jsx`

- [ ] **Step 1: Implementar `Navbar.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'El Ecosistema', href: '#ecosystem' },
  { label: 'ISTHO',         href: '#istho' },
  { label: 'Contacto',      href: '#contact' },
]

function scrollTo(id) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-md border-b border-white/10' : ''
      }`}
      style={{ backgroundColor: scrolled ? 'rgba(15,16,35,0.92)' : 'transparent' }}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-xl font-bold text-white tracking-wider cursor-pointer bg-transparent border-none p-0"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          CENTHRIX
        </button>

        {/* Links — desktop */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <button
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        {/* CTA — desktop */}
        <button
          onClick={() => scrollTo('#contact')}
          className="hidden md:block px-5 py-2 rounded-lg text-sm font-bold text-white cursor-pointer transition-colors"
          style={{ backgroundColor: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        >
          Solicitar Demo
        </button>

        {/* Hamburguesa — mobile */}
        <button
          className="md:hidden text-white bg-transparent border-none cursor-pointer p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Drawer mobile */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => { scrollTo(link.href); setMenuOpen(false) }}
              className="text-left text-sm font-medium text-white/80 hover:text-white bg-transparent border-none cursor-pointer py-2"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => { scrollTo('#contact'); setMenuOpen(false) }}
            className="mt-2 px-5 py-3 rounded-lg text-sm font-bold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Solicitar Demo
          </button>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. La barra es transparente al inicio de la página
2. Al hacer scroll > 50px, aparece el fondo semitransparente + borde inferior
3. En mobile (< 768px): links ocultos, ícono hamburguesa visible
4. Al hacer click en hamburguesa: se abre el drawer con los links
5. Al hacer click en un link del drawer: el drawer se cierra

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.jsx
git commit -m "feat: Navbar con scroll listener y drawer mobile"
```

---

### Task 6: `HeroSection.jsx`

**Archivos modificados:** `src/components/HeroSection.jsx`

- [ ] **Step 1: Implementar `HeroSection.jsx`**

```jsx
const PRODUCTS = [
  { name: 'CenthriX WMS',        desc: 'Inventario y bodegas',       color: '#3498DB', live: true  },
  { name: 'CenthriX CRM',        desc: 'Clientes y operaciones',     color: '#E74C3C', live: true  },
  { name: 'CenthriX Transporte', desc: 'TMS y flota',                color: '#E67E22', live: false },
  { name: 'CenthriX Finance',    desc: 'Facturación y rentabilidad', color: '#2ECC71', live: false },
  { name: 'CenthriX Human',      desc: 'Gestión de talento',         color: '#9B59B6', live: false },
]

function scrollTo(id) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center pt-16"
      style={{
        background: 'var(--bg-primary)',
        backgroundImage: `
          radial-gradient(ellipse at top right, rgba(231,76,60,0.08) 0%, transparent 60%),
          url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1' fill='white' fill-opacity='0.04'/%3E%3C/svg%3E")
        `,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-center">

          {/* Columna izquierda */}
          <div className="animate-hero">
            <p
              className="text-xs font-bold uppercase mb-4"
              style={{ color: 'var(--accent)', letterSpacing: '3px' }}
            >
              — ISTHO S.A.S. · GIRARDOTA, COLOMBIA —
            </p>

            <h1
              className="font-bold leading-none mb-6"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <span
                className="block text-6xl md:text-7xl"
                style={{ color: 'var(--accent)' }}
              >
                EL ECOSISTEMA
              </span>
              <span className="block text-7xl md:text-8xl text-white">
                CENTHRIX
              </span>
            </h1>

            <p
              className="text-lg md:text-xl mb-8 max-w-lg leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              Gestión integral de bodegas, clientes, transporte, finanzas y talento —
              todo conectado en una sola plataforma.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => scrollTo('#contact')}
                className="px-7 py-3 rounded-lg font-bold text-white cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                Solicitar Demo
              </button>
              <button
                onClick={() => scrollTo('#ecosystem')}
                className="px-7 py-3 rounded-lg font-bold text-white/70 hover:text-white cursor-pointer border border-white/15 hover:border-white/30 transition-all"
                style={{ backgroundColor: 'transparent' }}
              >
                Conocer el ecosistema
              </button>
            </div>
          </div>

          {/* Columna derecha — product cards */}
          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map((product, index) => (
              <div
                key={product.name}
                className="rounded-xl p-4 border border-white/8 hover:-translate-y-0.5 transition-transform duration-200"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderTop: `3px solid ${product.color}`,
                  animation: 'fade-slide-up 0.4s ease-out both',
                  animationDelay: `${index * 0.1 + 0.3}s`,
                  gridColumn: index === 4 ? '1 / -1' : undefined,
                  maxWidth: index === 4 ? '55%' : undefined,
                  margin: index === 4 ? '0 auto' : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-sm font-bold text-white">{product.name}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {product.desc}
                </p>
                {product.live ? (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(46,204,113,0.15)', color: 'var(--success)' }}
                  >
                    EN VIVO
                  </span>
                ) : (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                  >
                    PRÓXIMO
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Hero ocupa al menos el alto de la pantalla (min-h-screen)
2. En desktop: texto a la izquierda, cards en grid 2×2+1 a la derecha
3. En mobile: columnas apiladas
4. Borde superior de cada card con el color del producto
5. WMS y CRM tienen badge verde "EN VIVO"; los demás gris "PRÓXIMO"
6. La 5ª card (Human) aparece centrada ocupando las 2 columnas
7. Animación fade+slide al cargar la página (stagger por card)
8. Botón "Solicitar Demo" rojo, botón outline blanco/transparente

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroSection.jsx
git commit -m "feat: HeroSection con grid asimétrico y 5 product cards"
```

---

### Task 7: `EcosystemSection.jsx`

**Archivos modificados:** `src/components/EcosystemSection.jsx`

- [ ] **Step 1: Implementar `EcosystemSection.jsx`**

```jsx
import { CheckCircle2, Package, Users, Truck, DollarSign, Users2 } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const WMS_FEATURES = [
  'Gestión de inventario por caja, lote y ubicación',
  'Sincronización bidireccional con app WMS móvil',
  'Auditoría de entradas CO, salidas PK y ajustes CR',
  'Alertas de stock bajo y vencimientos',
]

const CRM_FEATURES = [
  'Gestión de +15 clientes corporativos (Lactalis, Knauf, Eternit, Épiroc)',
  'Portal de consulta para clientes',
  'Solicitudes de ingreso y despacho',
  'Reportes operativos en Excel y PDF',
]

const COMPACT_PRODUCTS = [
  {
    icon: Truck,
    name: 'CenthriX Transporte',
    color: '#E67E22',
    desc: 'TMS propio — gestión de flota, conductores y viajes. Reemplaza soluciones externas.',
  },
  {
    icon: DollarSign,
    name: 'CenthriX Finance',
    color: '#2ECC71',
    desc: 'Facturación y liquidaciones integradas con la operación logística.',
  },
  {
    icon: Users2,
    name: 'CenthriX Human',
    color: '#9B59B6',
    desc: 'Gestión de talento para operarios, conductores y personal administrativo.',
  },
]

function ExpandedCard({ icon: Icon, name, color, features }) {
  const ref = useScrollReveal()
  return (
    <div
      ref={ref}
      className="reveal rounded-xl p-6 border border-white/8"
      style={{ backgroundColor: 'var(--bg-card)', borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon size={24} style={{ color }} />
        <h3
          className="text-xl font-bold text-white"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          {name}
        </h3>
        <span
          className="ml-auto text-xs font-bold px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(46,204,113,0.15)', color: '#2ECC71' }}
        >
          EN VIVO
        </span>
      </div>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#2ECC71' }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CompactCard({ icon: Icon, name, color, desc }) {
  const ref = useScrollReveal()
  return (
    <div
      ref={ref}
      className="reveal rounded-xl p-5 border border-white/6"
      style={{ backgroundColor: 'var(--bg-surface)', borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} style={{ color }} />
        <h3
          className="text-base font-bold text-white"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          {name}
        </h3>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
        >
          PRÓXIMO
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  )
}

export default function EcosystemSection() {
  return (
    <section id="ecosystem" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h2
            className="text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            El ecosistema completo
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            Cinco productos. Un único sistema de datos.
          </p>
        </div>

        {/* Cards en producción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ExpandedCard icon={Package} name="CenthriX WMS" color="#3498DB" features={WMS_FEATURES} />
          <ExpandedCard icon={Users}   name="CenthriX CRM" color="#E74C3C" features={CRM_FEATURES} />
        </div>

        {/* Cards próximas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COMPACT_PRODUCTS.map((p) => (
            <CompactCard key={p.name} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Sección aparece con animación al hacer scroll hasta ella
2. WMS y CRM: cards grandes con borde de color, badge "EN VIVO", 4 features con checkmark verde
3. Transporte, Finance, Human: cards sutiles con badge "PRÓXIMO", sin features
4. En mobile (375px): 1 columna para todas las cards

- [ ] **Step 3: Commit**

```bash
git add src/components/EcosystemSection.jsx
git commit -m "feat: EcosystemSection con cards expandidas (WMS/CRM) y compactas"
```

---

### Task 8: `IntegrationDiagram.jsx`

**Archivos modificados:** `src/components/IntegrationDiagram.jsx`

Los 5 nodos están a 72° entre sí, radio 140px desde el centro (200, 200). Posiciones:
- WMS: (200, 60) — arriba
- CRM: (333, 157) — arriba-derecha
- Transporte: (282, 313) — abajo-derecha
- Finance: (118, 313) — abajo-izquierda
- Human: (67, 157) — arriba-izquierda

- [ ] **Step 1: Implementar `IntegrationDiagram.jsx`**

```jsx
import { useScrollReveal } from '../hooks/useScrollReveal'

const NODES = [
  { name: 'WMS',        color: '#3498DB', x: 200, y: 60  },
  { name: 'CRM',        color: '#E74C3C', x: 333, y: 157 },
  { name: 'Transporte', color: '#E67E22', x: 282, y: 313 },
  { name: 'Finance',    color: '#2ECC71', x: 118, y: 313 },
  { name: 'Human',      color: '#9B59B6', x: 67,  y: 157 },
]

const BEFORE = [
  'Excel para inventario',
  'Avansat para transporte',
  'Hojas separadas por área',
  'Reportes manuales',
]

const AFTER = [
  'Todo integrado',
  'Un único login',
  'Datos en tiempo real',
  'Reportes automáticos',
]

export default function IntegrationDiagram() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref}
      className="reveal py-24 px-6 border-y border-white/6"
      id="integration"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-4xl md:text-5xl font-bold text-white text-center mb-16"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          Un único sistema de datos para toda la operación
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* SVG Hub-Spoke */}
          <div className="flex justify-center">
            <svg
              viewBox="0 0 400 400"
              className="w-full max-w-sm"
              aria-label="Diagrama de integración CENTHRIX"
            >
              {/* Líneas animadas de centro a nodos */}
              {NODES.map((node) => (
                <line
                  key={node.name}
                  x1={200} y1={200}
                  x2={node.x} y2={node.y}
                  stroke={node.color}
                  strokeWidth="2"
                  strokeOpacity="0.7"
                  className="diagram-line"
                />
              ))}

              {/* Círculo central */}
              <circle
                cx={200} cy={200} r={50}
                fill="var(--bg-surface)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              <text
                x={200} y={195}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="700"
                fontFamily="Rajdhani, sans-serif"
                letterSpacing="1"
              >
                CENTHRIX
              </text>
              <text
                x={200} y={212}
                textAnchor="middle"
                fill="rgba(255,255,255,0.35)"
                fontSize="9"
                fontFamily="sans-serif"
              >
                sistema central
              </text>

              {/* Nodos */}
              {NODES.map((node) => (
                <g key={node.name}>
                  <circle
                    cx={node.x} cy={node.y} r={32}
                    fill="var(--bg-primary)"
                    stroke={node.color}
                    strokeWidth="2"
                  />
                  <text
                    x={node.x} y={node.y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="Rajdhani, sans-serif"
                  >
                    {node.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Antes vs Después */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

            <div>
              <h3
                className="text-xl font-bold mb-4"
                style={{ fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-muted)' }}
              >
                Antes de CENTHRIX
              </h3>
              <ul className="space-y-3">
                {BEFORE.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm line-through"
                    style={{ color: 'var(--text-muted)', textDecorationColor: '#E74C3C' }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                      style={{ backgroundColor: 'rgba(231,76,60,0.15)', color: '#E74C3C' }}
                    >
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3
                className="text-xl font-bold text-white mb-4"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                Con CENTHRIX
              </h3>
              <ul className="space-y-3">
                {AFTER.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                      style={{ backgroundColor: 'rgba(46,204,113,0.2)', color: '#2ECC71' }}
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Al hacer scroll: sección aparece con animación
2. El SVG muestra el círculo "CENTHRIX" en el centro con 5 nodos de colores alrededor
3. Las líneas entre nodos tienen animación de puntos moviéndose (flujo de datos)
4. "Antes de CENTHRIX": ítems tachados en rojo
5. "Con CENTHRIX": ítems con checkmark verde
6. En mobile: SVG arriba, columnas Antes/Después debajo

- [ ] **Step 3: Commit**

```bash
git add src/components/IntegrationDiagram.jsx
git commit -m "feat: IntegrationDiagram con SVG hub-spoke animado y Antes vs Después"
```

---

### Task 9: `ISTHOProof.jsx`

**Archivos modificados:** `src/components/ISTHOProof.jsx`

- [ ] **Step 1: Implementar `ISTHOProof.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'

function AnimatedNumber({ value, duration = 1500 }) {
  const [display, setDisplay] = useState(0)
  const elRef    = useRef(null)
  const started  = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const update = (now) => {
            const p = Math.min((now - start) / duration, 1)
            setDisplay(Math.floor(p * value))
            if (p < 1) requestAnimationFrame(update)
            else setDisplay(value)
          }
          requestAnimationFrame(update)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (elRef.current) observer.observe(elRef.current)
    return () => observer.disconnect()
  }, [value, duration])

  return <span ref={elRef}>{display}</span>
}

export default function ISTHOProof() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref}
      className="reveal py-24 px-6"
      id="istho"
      style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid rgba(231,76,60,0.2)' }}
    >
      <div className="max-w-7xl mx-auto">

        <div className="max-w-3xl mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Desarrollado y operado por ISTHO S.A.S.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            ISTHO no solo usa CENTHRIX — ISTHO es el primer y más exigente cliente de la plataforma.
            Lo que funciona aquí, funciona en producción real.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          <div
            className="rounded-xl p-8 border border-white/8 text-center"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div
              className="text-6xl font-bold mb-2"
              style={{ fontFamily: 'Rajdhani, sans-serif', color: 'var(--accent)' }}
            >
              +<AnimatedNumber value={15} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              clientes corporativos activos
            </p>
          </div>

          <div
            className="rounded-xl p-8 border border-white/8 text-center"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div
              className="text-4xl font-bold mb-2"
              style={{ fontFamily: 'Rajdhani, sans-serif', color: 'var(--accent)' }}
            >
              ISO 9001
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              :2015 · certificación de calidad
            </p>
          </div>

          <div
            className="rounded-xl p-8 border border-white/8 text-center"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div
              className="text-6xl font-bold mb-2"
              style={{ fontFamily: 'Rajdhani, sans-serif', color: 'var(--accent)' }}
            >
              <AnimatedNumber value={2} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              módulos en producción hoy
            </p>
          </div>
        </div>

        {/* Lista de clientes */}
        <div
          className="rounded-xl p-6 border border-white/8"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Clientes que confían en CENTHRIX
          </p>
          <p className="text-white/80">
            Lactalis · Knauf · Eternit · Épiroc · PMA · y más de 10 empresas más
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Sección aparece con animación al hacer scroll
2. Stat "+15": al entrar en viewport, el número cuenta de 0 a 15 en ~1.5s
3. Stat "ISO 9001": se muestra estático (sin countUp, es texto)
4. Stat "2": al entrar en viewport, el número cuenta de 0 a 2 en ~1.5s
5. La lista de clientes es legible

- [ ] **Step 3: Commit**

```bash
git add src/components/ISTHOProof.jsx
git commit -m "feat: ISTHOProof con stats animados y lista de clientes"
```

---

### Task 10: `AudienceSection.jsx`

**Archivos modificados:** `src/components/AudienceSection.jsx`

- [ ] **Step 1: Implementar `AudienceSection.jsx`**

```jsx
import { Warehouse, Truck, Package, Building2 } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const AUDIENCE = [
  {
    icon: Warehouse,
    title: 'Operador logístico',
    desc: 'Empresas que gestionan bodegas y almacenamiento de terceros',
  },
  {
    icon: Truck,
    title: 'Distribuidora con flota',
    desc: 'Empresas con transporte propio y necesidad de TMS',
  },
  {
    icon: Package,
    title: 'Almacenador 3PL',
    desc: 'Operadores que manejan inventario por múltiples clientes',
  },
  {
    icon: Building2,
    title: 'Empresa con bodega',
    desc: 'Industrias con operación interna de almacenamiento',
  },
]

export default function AudienceSection() {
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="reveal py-24 px-6" id="audience">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            ¿Para quién es CENTHRIX?
          </h2>
        </div>

        {/* 4 audience cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {AUDIENCE.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-6 border border-white/8 hover:-translate-y-1 transition-transform duration-200"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <Icon size={32} className="mb-4" style={{ color: 'var(--accent)' }} />
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Visión LATAM */}
        <div
          className="rounded-2xl p-10 border border-white/8 text-center relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          {/* Mapa LATAM decorativo — muy simplificado */}
          <svg
            viewBox="0 0 200 300"
            className="absolute right-8 top-1/2 -translate-y-1/2 w-36 pointer-events-none opacity-[0.07]"
            aria-hidden="true"
          >
            {/* México + América Central */}
            <path
              d="M40,10 L100,5 L130,25 L140,50 L120,70 L100,80 L85,100 L75,90 L50,95 L30,80 L20,60 L30,30 Z"
              fill="none" stroke="white" strokeWidth="1.5"
            />
            {/* Suramérica */}
            <path
              d="M70,110 L100,100 L130,115 L150,140 L160,180 L155,220 L140,260 L110,290 L80,285 L55,250 L40,210 L42,170 L55,140 Z"
              fill="none" stroke="white" strokeWidth="1.5"
            />
          </svg>

          {/* Punto pulsante Colombia (aprox. centrado en Suramérica norte) */}
          <div
            className="latam-dot absolute"
            aria-hidden="true"
            style={{
              right: 'calc(2rem + 62px)',
              top: 'calc(50% - 15px)',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              opacity: 0.7,
            }}
          />

          <div className="relative z-10">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--accent)' }}
            >
              VISIÓN
            </p>
            <p
              className="text-2xl md:text-3xl font-bold text-white max-w-xl mx-auto"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              CENTHRIX nació en Girardota, Colombia.
              Su próxima escala es Latinoamérica.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Las 4 cards en grid: 4 columnas en desktop, 2 en tablet, 1 en mobile
2. Hover en las cards: se levantan ligeramente
3. Bloque de visión: mapa LATAM muy sutil como fondo decorativo (opacity muy baja)
4. Punto rojo pulsante sobre la posición de Colombia en el mapa
5. Sección aparece con animación al hacer scroll

- [ ] **Step 3: Commit**

```bash
git add src/components/AudienceSection.jsx
git commit -m "feat: AudienceSection con 4 cards y visión LATAM"
```

---

### Task 11: `ContactSection.jsx`

**Archivos modificados:** `src/components/ContactSection.jsx`

- [ ] **Step 1: Implementar `ContactSection.jsx`**

```jsx
import { useState } from 'react'
import { Users, Rocket, MessageSquare } from 'lucide-react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const WHATSAPP_NUMBER = '573000000000' // ← Reemplazar con número real de ISTHO

export default function ContactSection() {
  const ref = useScrollReveal()
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', mensaje: '' })

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Demo CENTHRIX — ${form.empresa}`)
    const body    = encodeURIComponent(
      `Nombre: ${form.nombre}\nEmpresa: ${form.empresa}\nEmail: ${form.email}\n\n${form.mensaje}`
    )
    window.location.href = `mailto:liderti@istho.com.co?subject=${subject}&body=${body}`
  }

  const inputBase = `
    w-full rounded-lg px-4 py-3 text-sm text-white border border-white/10
    focus:outline-none transition-colors
  `

  return (
    <section ref={ref} className="reveal py-24 px-6" id="contact">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Comienza hoy
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Elige cómo conectar con nosotros</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Card izquierda — Portal CRM */}
          <div
            className="rounded-2xl p-8 flex flex-col"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid #3498DB',
              borderTop: '3px solid #3498DB',
            }}
          >
            <Users size={40} className="mb-4" style={{ color: '#3498DB' }} />
            <h3
              className="text-2xl font-bold text-white mb-3"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              Acceder al portal
            </h3>
            <p className="mb-6 flex-1" style={{ color: 'var(--text-muted)' }}>
              Si eres cliente de ISTHO, accede a tu inventario, operaciones y
              reportes en tiempo real.
            </p>
            <a
              href="https://istho-crm-six.vercel.app/login"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center px-6 py-3 rounded-lg font-bold text-white transition-colors"
              style={{ backgroundColor: '#3498DB' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2980B9')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3498DB')}
            >
              Ir al portal CRM
            </a>
          </div>

          {/* Card derecha — Demo */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--accent)',
              borderTop: '3px solid var(--accent)',
            }}
          >
            <Rocket size={40} className="mb-4" style={{ color: 'var(--accent)' }} />
            <h3
              className="text-2xl font-bold text-white mb-6"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              Solicitar una demo
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="nombre"
                placeholder="Nombre completo"
                required
                value={form.nombre}
                onChange={handleChange}
                className={inputBase}
                style={{ backgroundColor: 'var(--bg-primary)' }}
              />
              <input
                type="text"
                name="empresa"
                placeholder="Empresa"
                required
                value={form.empresa}
                onChange={handleChange}
                className={inputBase}
                style={{ backgroundColor: 'var(--bg-primary)' }}
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                value={form.email}
                onChange={handleChange}
                className={inputBase}
                style={{ backgroundColor: 'var(--bg-primary)' }}
              />
              <textarea
                name="mensaje"
                rows={3}
                placeholder="Cuéntanos sobre tu operación..."
                value={form.mensaje}
                onChange={handleChange}
                className={inputBase}
                style={{ backgroundColor: 'var(--bg-primary)', resize: 'vertical' }}
              />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-bold text-white cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                Enviar
              </button>
            </form>

            <div className="mt-4 text-center">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#25D366')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <MessageSquare size={16} />
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Dos cards en columnas (desktop) o apiladas (mobile)
2. Card izquierda (borde azul): botón "Ir al portal CRM" abre `https://istho-crm-six.vercel.app/login` en nueva pestaña
3. Card derecha (borde rojo): formulario con 4 campos funcionales
4. Al hacer submit con campos llenos: abre el cliente de email con asunto y body pre-poblados
5. Link WhatsApp visible debajo del botón Enviar

- [ ] **Step 3: Commit**

```bash
git add src/components/ContactSection.jsx
git commit -m "feat: ContactSection con portal CRM y formulario mailto"
```

---

### Task 12: `Footer.jsx` + `ScrollToTop.jsx`

**Archivos modificados:** `src/components/Footer.jsx`, `src/components/ScrollToTop.jsx`

- [ ] **Step 1: Implementar `Footer.jsx`**

```jsx
import { Mail } from 'lucide-react'

function scrollTo(id) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Footer() {
  return (
    <footer
      className="border-t border-white/8 pt-16 pb-8 px-6"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          {/* Columna 1 — Logo y tagline */}
          <div>
            <div
              className="text-2xl font-bold text-white mb-3 tracking-wider"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              CENTHRIX
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              El ecosistema logístico de ISTHO
            </p>
          </div>

          {/* Columna 2 — Links */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Navegación
            </h4>
            <ul className="space-y-3 list-none p-0 m-0">
              {[
                { label: 'El Ecosistema', id: '#ecosystem' },
                { label: 'ISTHO',         id: '#istho' },
                { label: 'Contacto',      id: '#contact' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollTo(link.id)}
                    className="text-sm text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <a
                  href="https://istho-crm-six.vercel.app/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Acceder al CRM →
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3 — Info */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Contacto
            </h4>
            <ul className="space-y-3 text-sm list-none p-0 m-0" style={{ color: 'var(--text-muted)' }}>
              <li>ISO 9001:2015</li>
              <li>Girardota, Antioquia, Colombia</li>
              <li>
                <a
                  href="mailto:liderti@istho.com.co"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Mail size={13} />
                  liderti@istho.com.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t border-white/6 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="text-sm font-bold tracking-wider"
            style={{ fontFamily: 'Rajdhani, sans-serif', color: 'rgba(255,255,255,0.35)' }}
          >
            ISTHO S.A.S.
          </span>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2026 CENTHRIX — Desarrollado por ISTHO S.A.S.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Implementar `ScrollToTop.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border border-white/15 transition-all duration-200 hover:scale-110"
      style={{ backgroundColor: 'var(--bg-surface)' }}
      aria-label="Volver arriba"
    >
      <ChevronUp size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
    </button>
  )
}
```

- [ ] **Step 3: Verificar en browser**

```bash
npm run dev
```

Verificar:
1. Footer visible al final de la página, 3 columnas en desktop / 1 en mobile
2. Los botones de navegación del footer hacen scroll suave a sus secciones
3. "Acceder al CRM →" abre el CRM en nueva pestaña
4. Copyright: "© 2026 CENTHRIX — Desarrollado por ISTHO S.A.S."
5. Al hacer scroll > 400px: aparece el botón ↑ en la esquina inferior derecha
6. Al hacer click en ↑: vuelve al top con animación suave
7. Al estar arriba de la página: el botón ↑ desaparece

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.jsx src/components/ScrollToTop.jsx
git commit -m "feat: Footer 3 columnas y ScrollToTop button"
```

---

### Task 13: `index.html`, `vercel.json`, favicon y push a GitHub

**Archivos creados/modificados:** `index.html`, `vercel.json`, `public/favicon.svg`

- [ ] **Step 1: Actualizar `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="CENTHRIX — El ecosistema ERP logístico de ISTHO S.A.S. Gestión integral de inventario, clientes, transporte y finanzas para operadores en LATAM."
    />
    <meta property="og:title" content="CENTHRIX — Ecosistema Logístico" />
    <meta property="og:description" content="Gestión integral para operadores logísticos en LATAM." />
    <meta name="theme-color" content="#0F1023" />
    <title>CENTHRIX — El ecosistema logístico</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Crear `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 3: Crear `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0F1023"/>
  <text x="16" y="23" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="18" font-weight="900" fill="#E74C3C">C</text>
</svg>
```

- [ ] **Step 4: Build de producción — verificar que todo compila sin errores**

```bash
npm run build
```

Resultado esperado: carpeta `dist/` creada, sin errores ni warnings críticos.

- [ ] **Step 5: Preview local del build**

```bash
npm run preview
```

Abrir `http://localhost:4173`. Hacer scroll completo por toda la página y verificar:

| Check | Criterio |
|-------|----------|
| Hero | Visible al cargar, animación de entrada, 5 cards con badges correctos |
| Ecosystem | Cards WMS/CRM expandidas; Transporte/Finance/Human compactas |
| Diagrama | SVG hub-spoke con animación de flujo en las líneas |
| ISTHO Proof | Counters +15 y 2 se animan al entrar en viewport |
| Audience | 4 cards + mapa LATAM con punto pulsante |
| Contacto | Portal CRM (azul) + formulario que abre email al enviar |
| Footer | 3 columnas + copyright 2026 |
| ScrollToTop | Botón ↑ aparece al bajar 400px y funciona |
| Responsive | Layout correcto a 375px y a 1280px |
| Navbar | Transparente al inicio, fondo semitransparente al bajar |

- [ ] **Step 6: Crear repositorio en GitHub y hacer push**

```bash
# 1. Crear en GitHub: github.com → New repository → Name: centhrix-web → Create
# 2. Conectar y subir:
git remote add origin https://github.com/<USUARIO>/centhrix-web.git
git branch -M main
git push -u origin main
```

- [ ] **Step 7: Commit final**

```bash
git add index.html vercel.json public/favicon.svg
git commit -m "feat: vercel.json, favicon y meta tags — landing CENTHRIX completa"
git push
```

---

## Post-deploy

Una vez el repositorio esté en GitHub:

1. **Vercel**: conectar el repo `centhrix-web` en vercel.com → New Project → Framework: Vite → Root dir: `/` → Deploy
2. **WhatsApp**: reemplazar `'573000000000'` en `src/components/ContactSection.jsx` con el número real de ISTHO → commit + push → redeploy automático
3. **Dominio** (opcional): configurar `centhrix.istho.com.co` en Vercel → Settings → Domains
