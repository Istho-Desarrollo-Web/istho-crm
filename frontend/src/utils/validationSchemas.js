/**
 * ISTHO CRM - Schemas de Validación Centralizados (Yup)
 *
 * Fuente única de verdad para validaciones de formularios del frontend.
 * Mantener sincronizado con los validators del backend (server/src/validators/).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import * as yup from 'yup';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const TIPOS_VEHICULO = ['sencillo', 'tractomula', 'turbo', 'dobletroque', 'minimula', 'otro'];
export const ESTADOS_VEHICULO = ['activo', 'inactivo', 'mantenimiento'];
export const ESTADOS_VIAJE = ['activo', 'completado', 'anulado'];

export const CONCEPTOS_EGRESO = [
  'cuadre_de_caja', 'descargues', 'acpm', 'administracion', 'alimentacion',
  'comisiones', 'desencarpe', 'encarpe', 'hospedaje', 'otros',
  'seguros', 'repuestos', 'tecnicomecanica', 'peajes', 'ligas',
  'parqueadero', 'urea', 'liquidacion'
];

export const CONCEPTOS_INGRESO = [
  'ingreso_adicional', 'recarga', 'cuadre_de_caja', 'peajes_ingreso',
  'ligas_ingresos', 'parqueadero_ingresos', 'urea_ingresos'
];

export const TODOS_CONCEPTOS = [...new Set([...CONCEPTOS_EGRESO, ...CONCEPTOS_INGRESO])];

// ─────────────────────────────────────────────────────────────────────────────
// REGEX REUTILIZABLES
// ─────────────────────────────────────────────────────────────────────────────

const REGEX_PLACA = /^[A-Za-z0-9]+$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS DE AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = yup.object({
  email: yup
    .string()
    .required('El usuario o email es requerido')
    .min(3, 'Debe tener al menos 3 caracteres'),
  password: yup
    .string()
    .required('La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const cambiarPasswordSchema = yup.object({
  password_actual: yup
    .string()
    .required('La contraseña actual es requerida'),
  password_nuevo: yup
    .string()
    .required('La nueva contraseña es requerida')
    .min(8, 'Debe tener al menos 8 caracteres')
    .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .matches(/[a-z]/, 'Debe contener al menos una minúscula')
    .matches(/[0-9]/, 'Debe contener al menos un número')
    .matches(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  password_confirmar: yup
    .string()
    .required('Debe confirmar la nueva contraseña')
    .oneOf([yup.ref('password_nuevo')], 'Las contraseñas no coinciden'),
});

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required('El email es requerido')
    .email('Debe ser un email válido'),
});

export const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .required('La nueva contraseña es requerida')
    .min(8, 'Debe tener al menos 8 caracteres')
    .matches(REGEX_PASSWORD, 'Debe contener mayúscula, minúscula, número y carácter especial'),
  confirmar_password: yup
    .string()
    .required('Debe confirmar la contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE VEHÍCULO
// ─────────────────────────────────────────────────────────────────────────────

export const vehiculoSchema = yup.object({
  placa: yup
    .string()
    .required('La placa es requerida')
    .min(4, 'La placa debe tener entre 4 y 10 caracteres')
    .max(10, 'La placa debe tener entre 4 y 10 caracteres')
    .matches(REGEX_PLACA, 'La placa solo puede contener letras y números'),
  tipo_vehiculo: yup
    .string()
    .required('El tipo de vehículo es requerido')
    .oneOf(TIPOS_VEHICULO, 'Tipo de vehículo no válido'),
  capacidad_ton: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .min(0, 'La capacidad debe ser un número positivo'),
  marca: yup
    .string()
    .nullable()
    .max(50, 'La marca no puede exceder 50 caracteres'),
  modelo: yup
    .string()
    .nullable()
    .max(10, 'El modelo no puede exceder 10 caracteres'),
  color: yup
    .string()
    .nullable()
    .max(30, 'El color no puede exceder 30 caracteres'),
  vencimiento_soat: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .test('fecha-valida', 'La fecha del SOAT debe ser válida (YYYY-MM-DD)', (v) =>
      !v || REGEX_FECHA.test(v)
    ),
  vencimiento_tecnicomecanica: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .test('fecha-valida', 'La fecha de tecnomecánica debe ser válida (YYYY-MM-DD)', (v) =>
      !v || REGEX_FECHA.test(v)
    ),
  poliza_responsabilidad: yup
    .string()
    .nullable()
    .max(50, 'La póliza no puede exceder 50 caracteres'),
  numero_motor: yup
    .string()
    .nullable()
    .max(50, 'El número de motor no puede exceder 50 caracteres'),
  numero_chasis: yup
    .string()
    .nullable()
    .max(50, 'El número de chasis no puede exceder 50 caracteres'),
  conductor_id: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
  descripcion: yup
    .string()
    .nullable()
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  estado: yup
    .string()
    .oneOf(ESTADOS_VEHICULO, 'Estado no válido'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE VIAJE
// ─────────────────────────────────────────────────────────────────────────────

export const viajeSchema = yup.object({
  vehiculo_id: yup
    .number()
    .required('El vehículo es requerido')
    .min(1, 'Seleccione un vehículo válido'),
  conductor_id: yup
    .number()
    .required('El conductor es requerido')
    .min(1, 'Seleccione un conductor válido'),
  fecha: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .test('fecha-valida', 'La fecha debe ser válida (YYYY-MM-DD)', (v) =>
      !v || REGEX_FECHA.test(v)
    ),
  origen: yup
    .string()
    .nullable()
    .max(100, 'El origen no puede exceder 100 caracteres'),
  destino: yup
    .string()
    .required('El destino es requerido')
    .max(100, 'El destino no puede exceder 100 caracteres'),
  descripcion: yup
    .string()
    .nullable()
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  caja_menor_id: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
  cliente_nombre: yup
    .string()
    .nullable()
    .max(200, 'El nombre del cliente no puede exceder 200 caracteres'),
  documento_cliente: yup
    .string()
    .nullable()
    .max(50, 'El documento no puede exceder 50 caracteres'),
  peso: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .min(0, 'El peso debe ser un número positivo'),
  valor_descargue: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .min(0, 'El valor de descargue debe ser un número positivo'),
  num_personas: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .integer('El número de personas debe ser entero')
    .min(0, 'El número de personas debe ser positivo'),
  no_factura: yup
    .string()
    .nullable()
    .max(50, 'El número de factura no puede exceder 50 caracteres'),
  valor_viaje: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .min(0, 'El valor del viaje debe ser un número positivo'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE CAJA MENOR
// ─────────────────────────────────────────────────────────────────────────────

export const cajaMenorSchema = yup.object({
  asignado_a: yup
    .number()
    .required('El usuario asignado es requerido')
    .min(1, 'Seleccione un usuario válido'),
  saldo_inicial: yup
    .number()
    .required('El saldo inicial es requerido')
    .min(0, 'El saldo inicial no puede ser negativo'),
  caja_anterior_id: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
  observaciones: yup
    .string()
    .nullable()
    .max(2000, 'Las observaciones no pueden exceder 2000 caracteres'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE MOVIMIENTO DE CAJA MENOR
// ─────────────────────────────────────────────────────────────────────────────

export const movimientoSchema = yup.object({
  caja_menor_id: yup
    .number()
    .required('La caja menor es requerida')
    .min(1, 'Seleccione una caja menor válida'),
  tipo_movimiento: yup
    .string()
    .required('El tipo de movimiento es requerido')
    .oneOf(['ingreso', 'egreso'], 'Tipo inválido'),
  concepto: yup
    .string()
    .required('El concepto es requerido')
    .oneOf(TODOS_CONCEPTOS, 'Concepto no válido'),
  concepto_otro: yup
    .string()
    .nullable()
    .max(100, 'La descripción no puede exceder 100 caracteres')
    .when('concepto', {
      is: 'otros',
      then: (schema) => schema.required('Debe especificar el concepto cuando selecciona "otros"'),
    }),
  valor: yup
    .number()
    .required('El valor es requerido')
    .min(0.01, 'El valor debe ser mayor a cero'),
  viaje_id: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
  descripcion: yup
    .string()
    .nullable()
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE CLIENTE
// ─────────────────────────────────────────────────────────────────────────────

export const clienteSchema = yup.object({
  razon_social: yup
    .string()
    .required('La razón social es requerida')
    .min(3, 'Debe tener al menos 3 caracteres')
    .max(200, 'No puede exceder 200 caracteres'),
  nit: yup
    .string()
    .required('El NIT es requerido')
    .min(5, 'Debe tener al menos 5 caracteres')
    .max(20, 'No puede exceder 20 caracteres'),
  email: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .email('Debe ser un email válido'),
  telefono: yup
    .string()
    .nullable()
    .max(50, 'El teléfono no puede exceder 50 caracteres'),
  direccion: yup
    .string()
    .nullable()
    .max(255, 'La dirección no puede exceder 255 caracteres'),
  ciudad: yup
    .string()
    .nullable()
    .max(100, 'La ciudad no puede exceder 100 caracteres'),
  departamento: yup
    .string()
    .nullable()
    .max(100, 'El departamento no puede exceder 100 caracteres'),
  sitio_web: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .test('url-valida', 'Debe ser una URL válida (incluir https://)', (v) => {
      if (!v) return true;
      try { new URL(v); return true; } catch { return false; }
    }),
  tipo_cliente: yup
    .string()
    .nullable()
    .oneOf([null, 'corporativo', 'pyme', 'persona_natural'], 'Tipo no válido'),
  sector: yup
    .string()
    .nullable()
    .oneOf(
      [null, '', 'alimentos', 'construccion', 'manufactura', 'retail', 'farmaceutico', 'quimico', 'textil', 'tecnologia', 'servicios', 'otro'],
      'Sector no válido'
    ),
  fecha_inicio_relacion: yup
    .string()
    .nullable()
    .transform((v) => v || null)
    .test('fecha-valida', 'La fecha debe ser válida (YYYY-MM-DD)', (v) =>
      !v || REGEX_FECHA.test(v)
    ),
  estado: yup
    .string()
    .oneOf(['activo', 'inactivo', 'suspendido'], 'Estado no válido'),
  notas: yup
    .string()
    .nullable()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE USUARIO DE PORTAL CLIENTE
// ─────────────────────────────────────────────────────────────────────────────

export const usuarioClienteSchema = yup.object({
  nombre_completo: yup
    .string()
    .required('El nombre es requerido')
    .min(3, 'Debe tener al menos 3 caracteres'),
  email: yup
    .string()
    .required('El email es requerido')
    .email('Email inválido'),
  telefono: yup
    .string()
    .nullable()
    .max(50, 'El teléfono no puede exceder 50 caracteres'),
  cargo: yup
    .string()
    .nullable()
    .max(100, 'El cargo no puede exceder 100 caracteres'),
  password: yup
    .string()
    .nullable(),
  enviar_email: yup.boolean(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE MOVIMIENTO DE INVENTARIO
// ─────────────────────────────────────────────────────────────────────────────

export const movimientoInventarioSchema = yup.object({
  cantidad: yup
    .number()
    .transform((_, o) => (o === '' ? undefined : Number(o)))
    .required('La cantidad es requerida')
    .min(0.001, 'La cantidad debe ser mayor a 0'),
  motivo: yup
    .string()
    .required('Selecciona un motivo'),
  documento_referencia: yup
    .string()
    .nullable()
    .max(100, 'No puede exceder 100 caracteres'),
  observaciones: yup
    .string()
    .nullable()
    .max(2000, 'No puede exceder 2000 caracteres'),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE PRODUCTO DE INVENTARIO
// ─────────────────────────────────────────────────────────────────────────────

export const productoSchema = yup.object({
  producto: yup
    .string()
    .required('El nombre del producto es requerido'),
  sku: yup
    .string()
    .required('El código SKU es requerido'),
  cliente_id: yup
    .mixed()
    .nullable(),
  categoria: yup
    .string()
    .nullable(),
  unidad_medida: yup
    .string()
    .nullable(),
  stock_minimo: yup
    .string()
    .nullable(),
  ubicacion: yup
    .string()
    .nullable()
    .max(100, 'No puede exceder 100 caracteres'),
  descripcion: yup
    .string()
    .nullable()
    .max(2000, 'No puede exceder 2000 caracteres'),
  notas: yup
    .string()
    .nullable()
    .max(2000, 'No puede exceder 2000 caracteres'),
});
