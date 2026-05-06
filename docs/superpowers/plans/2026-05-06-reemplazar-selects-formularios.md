# Reemplazar Selects Nativos en Formularios y Modales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar todos los `<select>` nativos restantes en formularios y modales del CRM por el componente `FilterDropdown`, y los `<input type="date">` en formularios RHF por `DatePicker`.

**Architecture:** `FilterDropdown` y `DatePicker` ya existen en `frontend/src/components/common/`. En formularios React Hook Form (RHF) que usan `{...register(...)}`, se requiere el patrón `Controller` para integrar componentes controlados. En formularios con estado local simple, el reemplazo es directo.

**Tech Stack:** React 19, React Hook Form, Tailwind 4, `FilterDropdown` y `DatePicker` de `components/common`.

---

## Patrón A — Select simple (sin RHF)

```jsx
// ANTES:
<select value={val} onChange={(e) => setVal(e.target.value)} className="...">
  <option value="">Placeholder</option>
  {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
</select>

// DESPUÉS:
<FilterDropdown
  options={[
    { value: '', label: 'Placeholder' },
    ...opciones.map(o => ({ value: String(o.id), label: o.label })),
  ]}
  value={String(val)}
  onChange={(v) => setVal(v)}
/>
```

## Patrón B — Select con RHF + Controller (para campos que no usan Controller aún)

Primero agregar `Controller` al import y `control` a la destructura de `useForm`:

```js
// ANTES:
import { useForm } from 'react-hook-form';
const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({...});

// DESPUÉS:
import { useForm, Controller } from 'react-hook-form';
const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({...});
```

Luego reemplazar el select:

```jsx
// ANTES:
<select {...register('campo')} className={inputCls}>
  <option value="">Placeholder</option>
  {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
</select>

// DESPUÉS:
<Controller
  name="campo"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Placeholder' },
        ...opciones.map(o => ({ value: String(o.id), label: String(o.label) })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

## Patrón C — DatePicker con RHF + Controller

```jsx
// ANTES:
<input type="date" {...register('fecha')} className="..." />

// DESPUÉS:
<Controller
  name="fecha"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

---

## Archivos críticos

| Archivo | Patrón | Cambios |
|---|---|---|
| `pages/Reportes/ReporteInventarioUbicacion.jsx` | A | 1 select (cliente) |
| `pages/Reportes/ReportesProgramados.jsx` | A | 2 selects (tipo_reporte, formato) |
| `pages/PlantillasEmail/PlantillaEmailEditor.jsx` | A | 2 selects (tipo, subtipo) |
| `pages/Administracion/UsuarioForm.jsx` | A | 2 selects (rol_id, cliente_id) |
| `pages/Inventario/Entradas/EntradaAuditoria.jsx` | A | 2 selects en modal averías |
| `pages/Inventario/Salidas/SalidaAuditoria.jsx` | A | 2 selects en modal averías |
| `pages/Inventario/Kardex/KardexAuditoria.jsx` | A | 2 selects en modal averías |
| `pages/Clientes/components/ClienteForm.jsx` | B + C | 2 selects + 1 DatePicker |
| `pages/Inventario/components/ProductoForm.jsx` | B | 3 selects |
| `pages/Viajes/ViajeForm.jsx` | B (ya tiene Controller) + C | 4 selects + 1 DatePicker |
| `pages/Viajes/components/VehiculoForm.jsx` | B + C | 1 select + 2 DatePicker |
| `pages/Viajes/components/CajaMenorForm.jsx` | B (ya tiene Controller) | 2 selects |
| `pages/Viajes/components/MovimientoForm.jsx` | B (ya tiene Controller) | 4 selects |

---

## Tarea 1 — Módulos de reportes (Patrón A)

**Archivos:**
- Modificar: `frontend/src/pages/Reportes/ReporteInventarioUbicacion.jsx`
- Modificar: `frontend/src/pages/Reportes/ReportesProgramados.jsx`

- [ ] **Paso 1: ReporteInventarioUbicacion — agregar import FilterDropdown**

En `ReporteInventarioUbicacion.jsx`, agregar `FilterDropdown` al import de components/common. Buscar el import existente y agregar FilterDropdown. Ejemplo típico:

```jsx
import { FilterDropdown } from '../../components/common';
```

- [ ] **Paso 2: ReporteInventarioUbicacion — reemplazar select de cliente**

Buscar el bloque (alrededor de línea 189):
```jsx
<select
  value={clienteId}
  onChange={(e) => handleClienteChange(e.target.value)}
  className="w-full px-3 py-2 bg-slate-50 dark:bg-centhrix-surface border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400"
>
  <option value="">Seleccionar cliente...</option>
  {clientes.map((c) => (
    <option key={c.id} value={c.id}>
      {c.razon_social}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={[
    { value: '', label: 'Seleccionar cliente...' },
    ...clientes.map((c) => ({ value: String(c.id), label: c.razon_social })),
  ]}
  value={String(clienteId)}
  onChange={(v) => handleClienteChange(v)}
/>
```

- [ ] **Paso 3: ReportesProgramados — agregar import FilterDropdown**

En `ReportesProgramados.jsx`, agregar `FilterDropdown` al import de components/common.

- [ ] **Paso 4: ReportesProgramados — reemplazar select tipo_reporte**

Buscar (alrededor de línea 154):
```jsx
<select
  value={form.tipo_reporte}
  onChange={(e) => setForm((p) => ({ ...p, tipo_reporte: e.target.value }))}
  className={inputCls}
>
  {TIPOS.map((t) => (
    <option key={t.value} value={t.value}>
      {t.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={TIPOS}
  value={form.tipo_reporte}
  onChange={(v) => setForm((p) => ({ ...p, tipo_reporte: v }))}
/>
```

- [ ] **Paso 5: ReportesProgramados — reemplazar select formato**

Buscar (alrededor de línea 170):
```jsx
<select
  value={form.formato}
  onChange={(e) => setForm((p) => ({ ...p, formato: e.target.value }))}
  className={inputCls}
>
  <option value="excel">Excel</option>
  <option value="pdf">PDF</option>
  <option value="ambos">Excel + PDF</option>
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={[
    { value: 'excel', label: 'Excel' },
    { value: 'pdf', label: 'PDF' },
    { value: 'ambos', label: 'Excel + PDF' },
  ]}
  value={form.formato}
  onChange={(v) => setForm((p) => ({ ...p, formato: v }))}
/>
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Reportes/ReporteInventarioUbicacion.jsx frontend/src/pages/Reportes/ReportesProgramados.jsx
git commit -m "refactor(reportes): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 2 — Editor de Plantillas Email (Patrón A)

**Archivos:**
- Modificar: `frontend/src/pages/PlantillasEmail/PlantillaEmailEditor.jsx`

- [ ] **Paso 1: Agregar import FilterDropdown**

Buscar el bloque de imports y agregar:
```jsx
import { FilterDropdown } from '../../components/common';
```

- [ ] **Paso 2: Reemplazar select de Tipo**

Buscar (alrededor de línea 326):
```jsx
<select
  value={formData.tipo}
  onChange={(e) => handleChange('tipo', e.target.value)}
  className={inputClass}
>
  {TIPO_OPTIONS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={TIPO_OPTIONS}
  value={formData.tipo}
  onChange={(v) => handleChange('tipo', v)}
/>
```

- [ ] **Paso 3: Reemplazar select de Subtipo (Aplica a)**

Buscar (alrededor de línea 344):
```jsx
<select
  value={formData.subtipo}
  onChange={(e) => handleChange('subtipo', e.target.value)}
  className={inputClass}
>
  {SUBTIPO_OPTIONS[formData.tipo].map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={SUBTIPO_OPTIONS[formData.tipo] || []}
  value={formData.subtipo}
  onChange={(v) => handleChange('subtipo', v)}
/>
```

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/PlantillasEmail/PlantillaEmailEditor.jsx
git commit -m "refactor(plantillas): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 3 — UsuarioForm (Patrón A — estado local con handleChange)

**Archivos:**
- Modificar: `frontend/src/pages/Administracion/UsuarioForm.jsx`

Nota: Este formulario usa `handleChange` con `e.target.name` y `e.target.value`, patrón estado local (no RHF). El reemplazo es Patrón A pero la firma de `onChange` cambia ligeramente.

- [ ] **Paso 1: Agregar import FilterDropdown**

```jsx
import { FilterDropdown } from '../../components/common';
```

- [ ] **Paso 2: Reemplazar select rol_id**

Buscar (alrededor de línea 239):
```jsx
<select
  name="rol_id"
  value={form.rol_id}
  onChange={handleChange}
  required
  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
>
  <option value="">Seleccionar rol...</option>
  {roles
    .filter((r) => r.activo)
    .map((r) => (
      <option key={r.id} value={r.id}>
        {r.nombre} (Nivel {r.nivel_jerarquia})
      </option>
    ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={[
    { value: '', label: 'Seleccionar rol...' },
    ...roles
      .filter((r) => r.activo)
      .map((r) => ({
        value: String(r.id),
        label: `${r.nombre} (Nivel ${r.nivel_jerarquia})`,
      })),
  ]}
  value={String(form.rol_id || '')}
  onChange={(v) => setForm((prev) => ({ ...prev, rol_id: v }))}
/>
```

Nota: Si el componente usa `setForm` (estado local), adaptar la función `onChange` para actualizar el estado sin `e.target`. Si solo existe `handleChange(e)`, crear un manejador inline que simule el evento o actualice el estado directamente.

- [ ] **Paso 3: Reemplazar select cliente_id (condicional)**

Buscar (alrededor de línea 263):
```jsx
<select
  name="cliente_id"
  value={form.cliente_id}
  onChange={handleChange}
  required
  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
>
  <option value="">Seleccionar cliente...</option>
  {clientes.map((c) => (
    <option key={c.id} value={String(c.id)}>
      {c.razon_social} ({c.codigo_cliente})
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={[
    { value: '', label: 'Seleccionar cliente...' },
    ...clientes.map((c) => ({
      value: String(c.id),
      label: `${c.razon_social} (${c.codigo_cliente})`,
    })),
  ]}
  value={String(form.cliente_id || '')}
  onChange={(v) => setForm((prev) => ({ ...prev, cliente_id: v }))}
/>
```

- [ ] **Paso 4: Leer el archivo para confirmar el patrón de estado**

Antes de aplicar, leer `UsuarioForm.jsx` líneas 1-50 para confirmar si usa `useState` con `setForm` o solo `handleChange`. Adaptar los handlers según lo encontrado.

- [ ] **Paso 5: Commit**

```bash
git add frontend/src/pages/Administracion/UsuarioForm.jsx
git commit -m "refactor(usuarios): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 4 — ClienteForm: selects + DatePicker (Patrón B + C)

**Archivos:**
- Modificar: `frontend/src/pages/Clientes/components/ClienteForm.jsx`

- [ ] **Paso 1: Agregar Controller al import y control a useForm**

Línea 14, cambiar:
```js
import { useForm } from 'react-hook-form';
```
Por:
```js
import { useForm, Controller } from 'react-hook-form';
```

Alrededor de línea 91-101, agregar `control,` a la destructura:
```js
const {
  register,
  handleSubmit,
  reset,
  setValue,
  control,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: yupResolver(clienteSchema),
  defaultValues: { tipo_cliente: 'corporativo', estado: 'activo' },
});
```

- [ ] **Paso 2: Agregar imports FilterDropdown y DatePicker**

Buscar el import de components/common existente y agregar:
```jsx
import { FilterDropdown, DatePicker } from '../../components/common';
```

- [ ] **Paso 3: Reemplazar select tipo_cliente**

Buscar (alrededor de línea 236):
```jsx
<select
  {...register('tipo_cliente')}
  className={inputCls(false, !!errors.tipo_cliente)}
>
  <option value="">Seleccionar...</option>
  {TIPOS_CLIENTE.map((t) => (
    <option key={t.value} value={t.value}>
      {t.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="tipo_cliente"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...TIPOS_CLIENTE,
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 4: Reemplazar select sector**

Buscar (alrededor de línea 250):
```jsx
<select {...register('sector')} className={inputCls(false, !!errors.sector)}>
  <option value="">Seleccionar...</option>
  {SECTORES.map((s) => (
    <option key={s.value} value={s.value}>
      {s.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="sector"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...SECTORES,
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 5: Reemplazar input de fecha_inicio_relacion**

Buscar (alrededor de línea 267):
```jsx
<input
  type="date"
  {...register('fecha_inicio_relacion')}
  className="..."
/>
```

Reemplazar por:
```jsx
<Controller
  name="fecha_inicio_relacion"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Clientes/components/ClienteForm.jsx
git commit -m "refactor(clientes): reemplazar selects y date input por componentes personalizados"
```

---

## Tarea 5 — ProductoForm: 3 selects (Patrón B)

**Archivos:**
- Modificar: `frontend/src/pages/Inventario/components/ProductoForm.jsx`

- [ ] **Paso 1: Agregar Controller al import y control a useForm**

Línea 14:
```js
import { useForm, Controller } from 'react-hook-form';
```

Alrededor de línea 91-102, agregar `control,`:
```js
const {
  register,
  handleSubmit,
  reset,
  setError,
  control,
  formState: { errors },
} = useForm({
  resolver: yupResolver(productoSchema),
  defaultValues: { unidad_medida: 'UND' },
});
```

- [ ] **Paso 2: Agregar import FilterDropdown**

```jsx
import { FilterDropdown } from '../../../components/common';
```

- [ ] **Paso 3: Reemplazar select cliente_id**

Buscar (alrededor de línea 265):
```jsx
<select {...register('cliente_id')} className={fieldCls(!!errors.cliente_id)}>
  <option value="">Seleccionar cliente...</option>
  {clientes.map((cliente) => (
    <option key={cliente.id} value={cliente.id}>
      {cliente.codigo_cliente ? `${cliente.codigo_cliente} - ` : ''}
      {cliente.razon_social || cliente.nombre}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="cliente_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar cliente...' },
        ...clientes.map((c) => ({
          value: String(c.id),
          label: `${c.codigo_cliente ? c.codigo_cliente + ' - ' : ''}${c.razon_social || c.nombre}`,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 4: Reemplazar select categoria**

Buscar (alrededor de línea 308):
```jsx
<select {...register('categoria')} className={fieldCls(false)}>
  <option value="">Seleccionar categoría</option>
  {CATEGORIAS.map((cat) => (
    <option key={cat.value} value={cat.value}>
      {cat.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="categoria"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar categoría' },
        ...CATEGORIAS,
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 5: Reemplazar select unidad_medida**

Buscar (alrededor de línea 323):
```jsx
<select {...register('unidad_medida')} className={fieldCls(false)}>
  {UNIDADES.map((und) => (
    <option key={und.value} value={und.value}>
      {und.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="unidad_medida"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={UNIDADES}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Inventario/components/ProductoForm.jsx
git commit -m "refactor(productos): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 6 — ViajeForm: 4 selects + DatePicker (ya tiene Controller)

**Archivos:**
- Modificar: `frontend/src/pages/Viajes/ViajeForm.jsx`

Nota: `ViajeForm.jsx` ya importa `Controller` y ya tiene `control` disponible. Solo hay que agregar `DatePicker` al import existente.

- [ ] **Paso 1: Agregar DatePicker al import de components/common**

Buscar el import existente de components/common en ViajeForm y agregar `DatePicker`:
```jsx
import { /* otros */ DatePicker } from '../../components/common';
```

- [ ] **Paso 2: Agregar FilterDropdown al import si no está**

Verificar si `FilterDropdown` ya está importado. Si no:
```jsx
import { FilterDropdown, DatePicker } from '../../components/common';
```

- [ ] **Paso 3: Reemplazar select vehiculo_id**

Buscar (alrededor de línea 402). El campo ya usa `Controller` con `field`:
```jsx
<select
  value={field.value}
  onChange={(e) => handleVehiculoChange(e.target.value)}
  className={selectCls(true, !!errors.vehiculo_id)}
>
  <option value="">Seleccionar vehículo...</option>
  {vehiculos.map((v) => (
    <option key={v.id} value={v.id}>
      {v.placa} - {v.tipo_vehiculo}
      {v.conductor?.nombre_completo ? ` (${v.conductor.nombre_completo})` : ''}
    </option>
  ))}
</select>
```

Reemplazar **solo el `<select>` interno** (no el `<Controller>` externo):
```jsx
<FilterDropdown
  options={[
    { value: '', label: 'Seleccionar vehículo...' },
    ...vehiculos.map((v) => ({
      value: String(v.id),
      label: `${v.placa} - ${v.tipo_vehiculo}${v.conductor?.nombre_completo ? ` (${v.conductor.nombre_completo})` : ''}`,
    })),
  ]}
  value={String(field.value || '')}
  onChange={(v) => handleVehiculoChange(v)}
/>
```

- [ ] **Paso 4: Reemplazar select conductor_id**

Buscar (alrededor de línea 425):
```jsx
<select
  {...register('conductor_id')}
  disabled={esConductor}
  className={`${selectCls(true, !!errors.conductor_id)} ${esConductor ? 'opacity-60' : ''}`}
>
  <option value="">Seleccionar conductor...</option>
  {conductores.map((c) => (
    <option key={c.id} value={c.id}>
      {c.nombre_completo || c.username}
    </option>
  ))}
</select>
```

Este campo usa `{...register(...)}`, wrappear con `Controller`:
```jsx
<Controller
  name="conductor_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar conductor...' },
        ...conductores.map((c) => ({
          value: String(c.id),
          label: c.nombre_completo || c.username,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 5: Reemplazar select cliente (ya usa Controller con field.value)**

Buscar (alrededor de línea 445). Ya está dentro de un `<Controller>`:
```jsx
<select
  value={field.value}
  onChange={(e) => {
    field.onChange(e.target.value);
    handleClienteChange(e.target.value);
  }}
  className={selectCls(true)}
>
  <option value="">Seleccionar cliente...</option>
  {clientes.map((c) => (...))}
</select>
```

Reemplazar el `<select>` interno por:
```jsx
<FilterDropdown
  options={[
    { value: '', label: 'Seleccionar cliente...' },
    ...clientes.map((c) => ({
      value: String(c.id),
      label: `${c.nombre || c.razon_social}${c.documento || c.nit ? ` - ${c.documento || c.nit}` : ''}`,
    })),
  ]}
  value={String(field.value || '')}
  onChange={(v) => {
    field.onChange(v);
    handleClienteChange(v);
  }}
/>
```

- [ ] **Paso 6: Reemplazar select caja_menor_id**

Buscar (alrededor de línea 507):
```jsx
<select
  {...register('caja_menor_id')}
  className={selectCls(true, !!errors.caja_menor_id)}
>
  <option value="">Sin caja menor</option>
  {cajasMenores.map((c) => (
    <option key={c.id} value={c.id}>
      {c.numero} - {c.asignado?.nombre_completo || c.asignado?.username || ''}
    </option>
  ))}
</select>
```

Wrappear con Controller:
```jsx
<Controller
  name="caja_menor_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Sin caja menor' },
        ...cajasMenores.map((c) => ({
          value: String(c.id),
          label: `${c.numero} - ${c.asignado?.nombre_completo || c.asignado?.username || ''}`,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 7: Reemplazar input fecha**

Buscar (alrededor de línea 392):
```jsx
<input
  type="date"
  {...register('fecha')}
  className="..."
/>
```

Reemplazar por:
```jsx
<Controller
  name="fecha"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 8: Commit**

```bash
git add frontend/src/pages/Viajes/ViajeForm.jsx
git commit -m "refactor(viajes): reemplazar selects y date input por componentes personalizados"
```

---

## Tarea 7 — VehiculoForm: 1 select + 2 DatePicker (Patrón B + C)

**Archivos:**
- Modificar: `frontend/src/pages/Viajes/components/VehiculoForm.jsx`

- [ ] **Paso 1: Agregar Controller al import y control a useForm**

Línea 9:
```js
import { useForm, Controller } from 'react-hook-form';
```

Alrededor de línea 62-76, agregar `control,`:
```js
const {
  register,
  handleSubmit,
  reset,
  setValue,
  control,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: yupResolver(vehiculoSchema),
  defaultValues: {
    tipo_vehiculo: 'sencillo',
    estado: 'activo',
  },
});
```

- [ ] **Paso 2: Agregar imports FilterDropdown y DatePicker**

```jsx
import { FilterDropdown, DatePicker } from '../../../components/common';
```

- [ ] **Paso 3: Reemplazar select tipo_vehiculo**

Buscar (alrededor de línea 248):
```jsx
<select
  {...register('tipo_vehiculo')}
  disabled={readOnly}
  className={inputClasses(false, !!errors.tipo_vehiculo)}
>
  <option value="">Seleccionar...</option>
  {TIPOS_VEHICULO.map((t) => (
    <option key={t} value={t}>
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="tipo_vehiculo"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...TIPOS_VEHICULO.map((t) => ({
          value: t,
          label: t.charAt(0).toUpperCase() + t.slice(1),
        })),
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 4: Leer archivo para encontrar los inputs de vencimiento**

Leer `VehiculoForm.jsx` alrededor de líneas 346 y 359 para ver el contexto exacto de `vencimiento_soat` y `vencimiento_tecnicomecanica`.

- [ ] **Paso 5: Reemplazar inputs de fecha vencimiento_soat y vencimiento_tecnicomecanica**

Buscar los dos `<input type="date"` (líneas 346 y 359) y reemplazar cada uno con el patrón:

```jsx
<Controller
  name="vencimiento_soat"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

```jsx
<Controller
  name="vencimiento_tecnicomecanica"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Viajes/components/VehiculoForm.jsx
git commit -m "refactor(vehiculos): reemplazar selects y date inputs por componentes personalizados"
```

---

## Tarea 8 — CajaMenorForm: 2 selects (ya tiene Controller)

**Archivos:**
- Modificar: `frontend/src/pages/Viajes/components/CajaMenorForm.jsx`

Nota: `CajaMenorForm.jsx` ya importa `Controller` y tiene `control`.

- [ ] **Paso 1: Agregar import FilterDropdown**

```jsx
import { FilterDropdown } from '../../../components/common';
```

- [ ] **Paso 2: Reemplazar select asignado_a**

Buscar (alrededor de línea 273):
```jsx
<select
  {...register('asignado_a')}
  disabled={loadingData}
  className={inputClasses(true, !!errors.asignado_a)}
>
  <option value="">Seleccionar usuario...</option>
  {usuarios.map((u) => (
    <option key={u.id} value={u.id}>
      {u.nombre_completo ||
        `${u.nombre || ''} ${u.apellido || ''}`.trim() ||
        u.username}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="asignado_a"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar usuario...' },
        ...usuarios.map((u) => ({
          value: String(u.id),
          label: u.nombre_completo || `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 3: Reemplazar select caja_anterior_id**

Buscar (alrededor de línea 327):
```jsx
<select
  {...register('caja_anterior_id')}
  disabled={loadingData}
  className={inputClasses(true, false)}
>
  <option value="">Sin traslado (opcional)</option>
  {cajasCerradas
    .filter(...)
    .map((c) => (
      <option key={c.id} value={c.id}>
        Caja #{c.numero || c.id} - ...
      </option>
    ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="caja_anterior_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Sin traslado (opcional)' },
        ...cajasCerradas
          .filter(
            (c) =>
              parseFloat(c.saldo_actual) > 0 &&
              (!watchAsignado || String(c.asignado_a) === String(watchAsignado))
          )
          .map((c) => ({
            value: String(c.id),
            label: `Caja #${c.numero || c.id} - ${c.asignado_nombre || c.asignado?.nombre_completo || 'Sin asignar'} - ${formatMoney(c.saldo_actual)}`,
          })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/Viajes/components/CajaMenorForm.jsx
git commit -m "refactor(caja-menor): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 9 — MovimientoForm (Viajes): 4 selects (ya tiene Controller)

**Archivos:**
- Modificar: `frontend/src/pages/Viajes/components/MovimientoForm.jsx`

Nota: Tiene `Controller` importado y `control` en scope. Los 4 selects están en la misma área del archivo (líneas 416-490).

- [ ] **Paso 1: Agregar import FilterDropdown**

```jsx
import { FilterDropdown } from '../../../components/common';
```

- [ ] **Paso 2: Reemplazar select caja_menor_id**

Buscar (alrededor de línea 416):
```jsx
<select
  {...register('caja_menor_id')}
  className={inputCls(true, !!errors.caja_menor_id)}
>
  <option value="">Seleccionar...</option>
  {cajas.map((caja) => (
    <option key={caja.id} value={caja.id}>
      {caja.numero || `Caja #${caja.id}`}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="caja_menor_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...cajas.map((caja) => ({
          value: String(caja.id),
          label: caja.numero || `Caja #${caja.id}`,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 3: Reemplazar select viaje_id**

Buscar (alrededor de línea 436):
```jsx
<select
  {...register('viaje_id')}
  disabled={!watchCajaId}
  className={inputCls(true, !!errors.viaje_id)}
>
  <option value="">Sin viaje asociado</option>
  {viajes.map((viaje) => (
    <option key={viaje.id} value={viaje.id}>
      {viaje.numero || `Viaje #${viaje.id}`}
      {viaje.destino ? ` - ${viaje.destino}` : ''}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="viaje_id"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Sin viaje asociado' },
        ...viajes.map((v) => ({
          value: String(v.id),
          label: `${v.numero || `Viaje #${v.id}`}${v.destino ? ` - ${v.destino}` : ''}`,
        })),
      ]}
      value={String(field.value || '')}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 4: Reemplazar select tipo_movimiento**

Buscar (alrededor de línea 459):
```jsx
<select
  {...register('tipo_movimiento')}
  className={inputCls(true, !!errors.tipo_movimiento)}
>
  <option value="">Seleccionar...</option>
  {TIPOS_MOVIMIENTO.map((tipo) => (
    <option key={tipo.value} value={tipo.value}>
      {tipo.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="tipo_movimiento"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...TIPOS_MOVIMIENTO,
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 5: Reemplazar select concepto**

Buscar (alrededor de línea 479):
```jsx
<select
  {...register('concepto')}
  disabled={!watchTipo}
  className={inputCls(true, !!errors.concepto)}
>
  <option value="">Seleccionar...</option>
  {conceptosDisponibles.map((c) => (
    <option key={c.value} value={c.value}>
      {c.label}
    </option>
  ))}
</select>
```

Reemplazar por:
```jsx
<Controller
  name="concepto"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[
        { value: '', label: 'Seleccionar...' },
        ...conceptosDisponibles,
      ]}
      value={field.value || ''}
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Viajes/components/MovimientoForm.jsx
git commit -m "refactor(movimientos): reemplazar selects nativos por FilterDropdown"
```

---

## Tarea 10 — Averías: 3 archivos de auditoría (Patrón A)

**Archivos:**
- Modificar: `frontend/src/pages/Inventario/Entradas/EntradaAuditoria.jsx`
- Modificar: `frontend/src/pages/Inventario/Salidas/SalidaAuditoria.jsx`
- Modificar: `frontend/src/pages/Inventario/Kardex/KardexAuditoria.jsx`

Nota: Los 3 archivos tienen el mismo patrón de modal de averías con 2 selects: "Producto Afectado" y "Tipo de Avería". Usan estado local `averiaForm` con `setAveriaForm`. Aplicar los cambios identicamente en los 3 archivos.

- [ ] **Paso 1: En EntradaAuditoria — agregar import FilterDropdown**

Buscar el import de components/common existente y agregar `FilterDropdown`:
```jsx
import { /* otros */ FilterDropdown } from '../../../components/common';
```

- [ ] **Paso 2: EntradaAuditoria — reemplazar select detalle_id (Producto Afectado)**

Buscar (alrededor de línea 1619):
```jsx
<select
  value={averiaForm.detalle_id}
  onChange={(e) =>
    setAveriaForm((prev) => ({ ...prev, detalle_id: e.target.value }))
  }
  className="w-full appearance-none pl-4 pr-10 py-3 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 rounded-xl text-sm ..."
>
  <option value="">-- Seleccionar producto --</option>
  {Object.values(...)}
</select>
```

Reemplazar por:
```jsx
<FilterDropdown
  options={[
    { value: '', label: '-- Seleccionar producto --' },
    ...Object.values(/* el mismo objeto que mapeaba antes */).map((d) => ({
      value: String(d.id || d.detalle_id),
      label: d.producto_nombre || d.descripcion || `Producto #${d.id}`,
    })),
  ]}
  value={String(averiaForm.detalle_id || '')}
  onChange={(v) => setAveriaForm((prev) => ({ ...prev, detalle_id: v }))}
/>
```

Nota: Leer el bloque original para identificar exactamente qué objeto itera y qué campos tienen. Adaptar `value` y `label` al objeto real.

- [ ] **Paso 3: EntradaAuditoria — reemplazar select tipo_averia**

Buscar (alrededor de línea 1679):
```jsx
<select
  value={averiaForm.tipo_averia}
  onChange={(e) =>
    setAveriaForm((prev) => ({
      ...prev,
      tipo_averia: e.target.value,
    }))
  }
  className="..."
>
  {/* options de tipo de avería */}
</select>
```

Reemplazar por — leer primero las opciones originales y convertirlas a `{ value, label }`:
```jsx
<FilterDropdown
  options={[
    /* convertir las <option> originales a { value: '...', label: '...' } */
  ]}
  value={averiaForm.tipo_averia || ''}
  onChange={(v) => setAveriaForm((prev) => ({ ...prev, tipo_averia: v }))}
/>
```

- [ ] **Paso 4: Repetir pasos 1-3 para SalidaAuditoria.jsx**

Mismo patrón que EntradaAuditoria (líneas ~1557 y ~1617). Adaptar las líneas exactas según lo que encuentres al leer el archivo.

- [ ] **Paso 5: Repetir pasos 1-3 para KardexAuditoria.jsx**

Mismo patrón (líneas ~1581 y ~1641).

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/Inventario/Entradas/EntradaAuditoria.jsx \
        frontend/src/pages/Inventario/Salidas/SalidaAuditoria.jsx \
        frontend/src/pages/Inventario/Kardex/KardexAuditoria.jsx
git commit -m "refactor(averias): reemplazar selects nativos por FilterDropdown en los 3 modales de averías"
```

---

## Verificación Final

- [ ] **Verificar que no quedan `<select>` nativos en formularios de usuario**

```bash
grep -rn "<select" frontend/src/pages --include="*.jsx" | grep -v "node_modules"
```

Los únicos `<select>` que pueden quedar son en `Configuracion.jsx` (usa un componente `SelectField` propio — no tocar) y en `ConfiguracionWms.jsx` (campo técnico de admin — baja prioridad).

- [ ] **Commit final del plan**

```bash
git add docs/superpowers/plans/2026-05-06-reemplazar-selects-formularios.md frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): agregar react-day-picker y plan de reemplazo de selects en formularios"
```
