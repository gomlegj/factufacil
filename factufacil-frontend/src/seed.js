// Datos de prueba ficticios. Se generan de forma determinística (misma semilla = mismos datos)
// para que las demostraciones siempre muestren lo mismo.
import { fechaISO, sumarDias, hoy, calcularTotales, turnoDe, fechaDe } from './utils.js';

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearSeed() {
  const r = rng(15);
  const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
  const elegir = (arr) => arr[Math.floor(r() * arr.length)];
  const inicio = new Date('2026-09-01T00:00:00').toISOString();

  const empresa = {
    nombre: 'Tienda Don Chepe',
    direccion: 'Cra. 45 # 32-10, Medellín',
    celular: '300 123 4567',
    logo: '',
    porcentajeIva: 19,
  };

  const roles = [
    { id: 1, nombre: 'DESARROLLADOR' },
    { id: 2, nombre: 'JEFE' },
    { id: 3, nombre: 'ADMIN' },
    { id: 4, nombre: 'EMPLEADO' },
  ];

  const empleados = [
    { id: 1, cedula: '1000000001', nombre: 'Carlos Ruiz', rol: 'DESARROLLADOR', activo: true, creadoPorId: null, creadoEn: inicio },
    { id: 2, cedula: '1000000002', nombre: 'Ana Jefe', rol: 'JEFE', activo: true, creadoPorId: 1, creadoEn: inicio },
    { id: 3, cedula: '1000000003', nombre: 'Pedro Admin', rol: 'ADMIN', activo: true, creadoPorId: 2, creadoEn: inicio },
    { id: 4, cedula: '1000000004', nombre: 'Maria Empleada', rol: 'EMPLEADO', activo: true, creadoPorId: 2, creadoEn: inicio },
    { id: 5, cedula: '1000000005', nombre: 'Luisa Empleada', rol: 'EMPLEADO', activo: true, creadoPorId: 2, creadoEn: inicio },
  ];

  const categorias = ['Granos', 'Lácteos y huevos', 'Bebidas', 'Aseo', 'Panadería', 'Mecato', 'Café y chocolate'].map(
    (nombre, i) => ({ id: i + 1, nombre, activo: true })
  );

  // [nombre, valor unidad sin IVA, stock, categoría]
  const base = [
    ['Arroz Diana 500 g', 2100, 48, 1], ['Frijol cargamanto 500 g', 5200, 22, 1], ['Lentejas 500 g', 2900, 30, 1],
    ['Leche entera 1 L', 3700, 36, 2], ['Huevo AA unidad', 600, 120, 2], ['Queso campesino 250 g', 6300, 0, 2],
    ['Gaseosa 1,5 L', 4200, 40, 3], ['Agua 600 ml', 1500, 60, 3], ['Jugo de caja 200 ml', 1300, 3, 3],
    ['Jabón de barra', 2500, 25, 4], ['Papel higiénico x4', 6700, 18, 4], ['Detergente 500 g', 4800, 0, 4],
    ['Pan tajado', 5000, 12, 5], ['Arepas x5', 2600, 20, 5], ['Papas fritas 45 g', 2100, 50, 6],
    ['Chocolatina 12 g', 900, 80, 6], ['Café molido 250 g', 8800, 15, 7], ['Chocolate de mesa 250 g', 6100, 10, 7],
  ];
  const productos = base.map(([nombre, valorUnidad, cantidad, categoriaId], i) => ({
    id: i + 1, nombre, valorUnidad, cantidad, categoriaId, activo: true, creadoEn: inicio, actualizadoEn: inicio,
  }));

  const clientes = [
    ['1037654321', 'Rosa Elena Pérez', 'rosa.perez@correo.co'],
    ['900123456-7', 'Restaurante El Fogón', 'compras@elfogon.co'],
    ['43123987', 'Jorge Ramírez', ''],
    ['CE-883421', 'Valentina Rossi', 'vrossi@correo.co'],
    ['71234567', 'Hernán Gómez', ''],
  ].map(([documento, nombre, correo], i) => ({ id: i + 1, documento, nombre, correo, activo: true, creadoEn: inicio }));

  const entidades = [
    { id: 1, nombre: 'Gana', requiereTipoPago: false, activo: true },
    { id: 2, nombre: 'Coordinadora', requiereTipoPago: true, activo: true },
  ];

  // ---- Historial de ventas de los últimos 70 días ----
  const facturas = [];
  const vendedores = [4, 5, 4, 5, 3];
  const diaHoy = hoy();
  const DIAS_HISTORIA = 70;
  let consecutivo = 0;
  for (let d = DIAS_HISTORIA; d >= 0; d--) {
    const fecha = sumarDias(diaHoy, -d);
    const dow = new Date(fecha + 'T12:00:00').getDay();
    const extra = dow === 6 || dow === 0 ? 5 : dow === 5 ? 3 : 0; // fines de semana venden más
    const cuantas = d === 0 ? 4 : entre(5, 10) + extra;
    for (let k = 0; k < cuantas; k++) {
      const hora = d === 0 ? 7 + k : entre(7, 20);
      const fechaHora = new Date(`${fecha}T${String(hora).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00`);
      const nItems = entre(1, 4);
      const usados = new Set();
      const items = [];
      for (let j = 0; j < nItems; j++) {
        const p = elegir(productos);
        if (usados.has(p.id)) continue;
        usados.add(p.id);
        const cantidad = entre(1, 3);
        items.push({ productoId: p.id, nombre: p.nombre, cantidad, valorUnidad: p.valorUnidad, valorTotal: cantidad * p.valorUnidad });
      }
      const t = calcularTotales(items, 19);
      const x = r();
      let efectivo = t.total, transferencia = 0;
      if (x > 0.85) { efectivo = Math.round(t.total / 2 / 100) * 100; transferencia = t.total - efectivo; }
      else if (x > 0.6) { efectivo = 0; transferencia = t.total; }
      const entregado = efectivo > 0 ? Math.ceil(efectivo / 5000) * 5000 : 0;
      consecutivo++;
      facturas.push({
        id: consecutivo,
        numero: 'FAC-' + String(consecutivo).padStart(4, '0'),
        fecha: fechaHora.toISOString(),
        clienteId: r() > 0.75 ? elegir(clientes).id : null,
        empleadoId: elegir(vendedores),
        items, ...t,
        pagos: { efectivo, transferencia },
        entregado, devuelto: entregado ? entregado - efectivo : 0,
        estado: 'ACTIVA',
        historial: [],
      });
    }
  }
  // Dos facturas con historial para mostrar la revisión
  const anulada = facturas[facturas.length - 12];
  anulada.estado = 'ANULADA';
  anulada.historial.push({ accion: 'ANULAR', motivo: 'El cliente devolvió todos los productos', empleadoId: 3, fecha: anulada.fecha });

  // ---- Cierres de turno y de día para los días pasados (ayer queda sin cerrar el día) ----
  const cierresTurno = [];
  const cierresDia = [];
  const conciliaciones = [];
  for (let d = DIAS_HISTORIA; d >= 1; d--) {
    const fecha = sumarDias(diaHoy, -d);
    const delDia = facturas.filter((f) => f.estado === 'ACTIVA' && fechaDe(f.fecha) === fecha);
    for (const turno of ['MAÑANA', 'TARDE']) {
      const fs = delDia.filter((f) => turnoDe(f.fecha) === turno);
      const ef = fs.reduce((s, f) => s + f.pagos.efectivo, 0);
      const tr = fs.reduce((s, f) => s + f.pagos.transferencia, 0);
      const desvio = r() > 0.85 ? elegir([-2000, -500, 1000, 3000]) : 0;
      const gastos = r() > 0.7 ? elegir([5000, 8000, 12000]) : 0;
      const efectivoContado = ef - gastos + desvio;
      cierresTurno.push({
        id: cierresTurno.length + 1, fecha, turno,
        empleadoEntregaId: turno === 'MAÑANA' ? 4 : 5, empleadoRecibeId: turno === 'MAÑANA' ? 5 : 3,
        ventasSistema: ef + tr,
        valorEfectivo: efectivoContado, valorTransferencia: tr, gastos,
        valorTotal: efectivoContado + tr,
        sobra: Math.max(desvio, 0), falta: Math.max(-desvio, 0),
        coordinadoraValor: r() > 0.5 ? entre(2, 8) * 10000 : 0, ganaValor: r() > 0.4 ? entre(3, 15) * 10000 : 0,
        observaciones: desvio < 0 ? 'Faltó plata, se revisa con la empleada' : '',
        creadoEn: new Date(fecha + 'T' + (turno === 'MAÑANA' ? '14:05' : '21:10') + ':00').toISOString(),
      });
    }
    if (d >= 2) {
      const ct = cierresTurno.filter((c) => c.fecha === fecha);
      cierresDia.push({
        id: cierresDia.length + 1, fecha,
        totalVendido: delDia.reduce((s, f) => s + f.total, 0),
        totalEfectivo: ct.reduce((s, c) => s + c.valorEfectivo, 0),
        totalTransferencia: ct.reduce((s, c) => s + c.valorTransferencia, 0),
        gastos: ct.reduce((s, c) => s + c.gastos, 0),
        sobra: ct.reduce((s, c) => s + c.sobra, 0),
        falta: ct.reduce((s, c) => s + c.falta, 0),
        ajusteManual: 0, motivoAjuste: '', cerradoPorId: 3,
        creadoEn: new Date(fecha + 'T21:30:00').toISOString(),
      });
    }
    // Conciliaciones con entidades (algunos días en cero)
    for (const ent of entidades) {
      if (r() < 0.2) continue;
      const entregado = entre(10, 60) * 10000;
      const ganancia = Math.round(entregado * (ent.id === 1 ? 0.03 : 0.05) * (0.8 + r() * 0.4));
      conciliaciones.push({
        id: conciliaciones.length + 1, entidadId: ent.id, fecha,
        tipoPago: ent.requiereTipoPago ? elegir(['ESTABLECIMIENTO', 'CONTRAENTREGA']) : null,
        valorEntregado: entregado, valorGanancia: ganancia,
        porcentajeGanancia: +((ganancia / (entregado + ganancia)) * 100).toFixed(2),
        empleadoId: 3, creadoEn: new Date(fecha + 'T20:00:00').toISOString(),
      });
    }
  }
  // Un ajuste manual de ejemplo
  if (cierresDia.length > 10) {
    const c = cierresDia[cierresDia.length - 8];
    c.ajusteManual = -3000;
    c.motivoAjuste = 'Se contó dos veces un billete de $3.000 en el cierre';
  }

  const entregasCaja = [
    { id: 1, fechaDesde: sumarDias(diaHoy, -20), fechaHasta: sumarDias(diaHoy, -14), valorEntregado: 1850000, entregadoPorId: 3, recibidoPorId: 2, observaciones: 'Entrega semanal', creadoEn: new Date(sumarDias(diaHoy, -13) + 'T09:00:00').toISOString() },
    { id: 2, fechaDesde: sumarDias(diaHoy, -13), fechaHasta: sumarDias(diaHoy, -7), valorEntregado: 2100000, entregadoPorId: 3, recibidoPorId: 2, observaciones: '', creadoEn: new Date(sumarDias(diaHoy, -6) + 'T09:00:00').toISOString() },
  ];

  const novedades = [
    { id: 1, fecha: sumarDias(diaHoy, -3), descripcion: 'Pago del recibo de energía', valor: 85000, empleadoId: 3, activo: true, creadoEn: inicio },
    { id: 2, fecha: sumarDias(diaHoy, -1), descripcion: 'Compra de bolsas', valor: 12000, empleadoId: 4, activo: true, creadoEn: inicio },
    { id: 3, fecha: hoy(), descripcion: 'Se rompió una botella de gaseosa', valor: 4200, empleadoId: 5, activo: true, creadoEn: inicio },
  ];

  const ajustes = [
    { id: 1, productoId: 7, tipo: 'DANO', cantidad: 1, motivo: 'Botella rota al desempacar', empleadoId: 5, fecha: new Date(hoy() + 'T08:15:00').toISOString() },
    { id: 2, productoId: 4, tipo: 'INGRESO_EXISTENTE', cantidad: 24, motivo: 'Llegó el pedido del proveedor', empleadoId: 3, fecha: new Date(sumarDias(diaHoy, -2) + 'T10:00:00').toISOString() },
  ];

  const auditoria = [
    { id: 1, tabla: 'empleados', registroId: 4, accion: 'CREAR', empleadoId: 2, detalle: 'Creó a Maria Empleada (EMPLEADO)', fecha: inicio },
    { id: 2, tabla: 'facturas', registroId: anulada.id, accion: 'ANULAR', empleadoId: 3, detalle: `Anuló ${anulada.numero}. Motivo: El cliente devolvió todos los productos`, fecha: anulada.fecha },
  ];

  return {
    version: 1,
    empresa, roles, empleados, categorias, productos, clientes,
    facturas, secuenciaFactura: consecutivo,
    novedades, cierresTurno, cierresDia, entregasCaja,
    entidades, conciliaciones, ajustes, pedidos: [], auditoria,
    sesion: null,
    generadoEn: fechaISO(new Date()),
  };
}
