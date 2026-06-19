'use strict';

const { Op } = require('sequelize');
const { Operacion, OperacionDetalle, Cliente, Inventario, Viaje, Vehiculo, Usuario, CajaMenor } = require('../models');
const { success, error } = require('../utils/responses');

// ─── KPIs consolidados ────────────────────────────────────────────────────────
const kpis = async (req, res) => {
  try {
    const [
      totalOperaciones,
      totalEntradas,
      totalSalidas,
      totalKardex,
      totalClientes,
      totalProductos,
      totalViajes,
    ] = await Promise.all([
      Operacion.count({ where: { estado: { [Op.ne]: 'anulado' } } }),
      Operacion.count({ where: { tipo: 'ingreso', estado: { [Op.ne]: 'anulado' } } }),
      Operacion.count({ where: { tipo: 'salida', estado: { [Op.ne]: 'anulado' } } }),
      Operacion.count({ where: { tipo: 'kardex', estado: { [Op.ne]: 'anulado' } } }),
      Cliente.count({ where: { estado: 'activo' } }),
      Inventario.count(),
      Viaje.count({ where: { estado: { [Op.ne]: 'anulado' } } }),
    ]);

    return success(res, {
      generado_en: new Date().toISOString(),
      operaciones: {
        total: totalOperaciones,
        entradas: totalEntradas,
        salidas: totalSalidas,
        kardex: totalKardex,
      },
      clientes: { activos: totalClientes },
      inventario: { total_productos: totalProductos },
      viajes: { total: totalViajes },
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Dataset de operaciones ───────────────────────────────────────────────────
const operaciones = async (req, res) => {
  try {
    const registros = await Operacion.findAll({
      attributes: [
        'id', 'numero_operacion', 'tipo', 'estado',
        'documento_wms', 'documento_origen', 'numero_picking',
        'fecha_operacion', 'fecha_documento', 'fecha_cierre',
        'conductor_nombre', 'vehiculo_placa',
        'observaciones', 'editado_admin', 'created_at',
      ],
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nombre', 'nit', 'ciudad'],
        },
        {
          model: OperacionDetalle,
          as: 'detalles',
          attributes: ['id', 'producto', 'descripcion', 'cantidad', 'unidad_medida', 'lote'],
        },
      ],
      where: { estado: { [Op.ne]: 'anulado' } },
      order: [['fecha_operacion', 'DESC']],
    });

    const data = registros.map((op) => ({
      id: op.id,
      numero_operacion: op.numero_operacion,
      tipo: op.tipo,
      estado: op.estado,
      documento_wms: op.documento_wms,
      documento_origen: op.documento_origen,
      numero_picking: op.numero_picking,
      fecha_operacion: op.fecha_operacion,
      fecha_documento: op.fecha_documento,
      fecha_cierre: op.fecha_cierre,
      conductor: op.conductor_nombre,
      vehiculo_placa: op.vehiculo_placa,
      cliente_id: op.cliente?.id ?? null,
      cliente_nombre: op.cliente?.nombre ?? null,
      cliente_nit: op.cliente?.nit ?? null,
      cliente_ciudad: op.cliente?.ciudad ?? null,
      total_lineas: op.detalles?.length ?? 0,
      total_unidades: op.detalles?.reduce((s, d) => s + (Number(d.cantidad) || 0), 0) ?? 0,
      observaciones: op.observaciones,
      editado_admin: op.editado_admin ?? false,
      creado_en: op.created_at,
    }));

    return success(res, {
      total: data.length,
      generado_en: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Dataset de inventario ────────────────────────────────────────────────────
// Campos reales del modelo: sku, producto, descripcion, categoria, cantidad,
// stock_minimo, stock_maximo, unidad_medida, fecha_vencimiento, fecha_ingreso
const inventario = async (req, res) => {
  try {
    const registros = await Inventario.findAll({
      attributes: [
        'id', 'sku', 'producto', 'descripcion', 'categoria',
        'cantidad', 'stock_minimo', 'stock_maximo',
        'unidad_medida', 'fecha_vencimiento', 'fecha_ingreso',
        'updated_at',
      ],
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nombre', 'nit'],
        },
      ],
      order: [['producto', 'ASC']],
    });

    const data = registros.map((inv) => ({
      id: inv.id,
      sku: inv.sku,
      producto: inv.producto,
      descripcion: inv.descripcion,
      categoria: inv.categoria,
      cliente_id: inv.cliente?.id ?? null,
      cliente_nombre: inv.cliente?.nombre ?? null,
      cliente_nit: inv.cliente?.nit ?? null,
      cantidad: Number(inv.cantidad) || 0,
      stock_minimo: Number(inv.stock_minimo) || 0,
      stock_maximo: inv.stock_maximo != null ? Number(inv.stock_maximo) : null,
      bajo_minimo: (Number(inv.cantidad) || 0) <= (Number(inv.stock_minimo) || 0),
      unidad_medida: inv.unidad_medida,
      fecha_vencimiento: inv.fecha_vencimiento,
      fecha_ingreso: inv.fecha_ingreso,
      actualizado_en: inv.updated_at,
    }));

    return success(res, {
      total: data.length,
      generado_en: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Dataset de clientes ──────────────────────────────────────────────────────
// Cliente.estado es ENUM('activo','inactivo','suspendido') — no boolean
const clientes = async (req, res) => {
  try {
    const registros = await Cliente.findAll({
      attributes: [
        'id', 'nombre', 'nit', 'email', 'telefono',
        'ciudad', 'departamento', 'direccion',
        'tipo_cliente', 'estado', 'created_at',
      ],
      order: [['nombre', 'ASC']],
    });

    const data = registros.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      nit: c.nit,
      email: c.email,
      telefono: c.telefono,
      ciudad: c.ciudad,
      departamento: c.departamento,
      direccion: c.direccion,
      tipo_cliente: c.tipo_cliente,
      estado: c.estado,
      vinculado_en: c.created_at,
    }));

    return success(res, {
      total: data.length,
      activos: data.filter((c) => c.estado === 'activo').length,
      generado_en: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ─── Dataset de viajes ────────────────────────────────────────────────────────
// Campos reales del modelo: numero, fecha, origen, destino, descripcion, estado,
// cliente_nombre, valor_viaje, facturado
const viajes = async (req, res) => {
  try {
    const registros = await Viaje.findAll({
      attributes: [
        'id', 'numero', 'fecha', 'origen', 'destino', 'descripcion',
        'estado', 'cliente_nombre', 'valor_viaje', 'facturado',
        'peso', 'no_factura', 'created_at',
      ],
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          attributes: ['id', 'placa', 'marca', 'modelo', 'tipo_vehiculo'],
        },
        {
          model: Usuario,
          as: 'conductor',
          attributes: ['id', 'nombre', 'email'],
        },
        {
          model: CajaMenor,
          as: 'cajaMenor',
          attributes: ['id', 'nombre'],
          required: false,
        },
      ],
      where: { estado: { [Op.ne]: 'anulado' } },
      order: [['fecha', 'DESC']],
    });

    const data = registros.map((v) => ({
      id: v.id,
      numero: v.numero,
      fecha: v.fecha,
      origen: v.origen,
      destino: v.destino,
      descripcion: v.descripcion,
      estado: v.estado,
      cliente_nombre: v.cliente_nombre,
      valor_viaje: v.valor_viaje != null ? Number(v.valor_viaje) : null,
      facturado: v.facturado ? 'Sí' : 'No',
      no_factura: v.no_factura,
      peso_kg: v.peso != null ? Number(v.peso) : null,
      vehiculo_placa: v.vehiculo?.placa ?? null,
      vehiculo_marca: v.vehiculo?.marca ?? null,
      vehiculo_modelo: v.vehiculo?.modelo ?? null,
      vehiculo_tipo: v.vehiculo?.tipo_vehiculo ?? null,
      conductor_nombre: v.conductor?.nombre ?? null,
      conductor_email: v.conductor?.email ?? null,
      caja_menor_nombre: v.cajaMenor?.nombre ?? null,
      registrado_en: v.created_at,
    }));

    return success(res, {
      total: data.length,
      generado_en: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { kpis, operaciones, inventario, clientes, viajes };
