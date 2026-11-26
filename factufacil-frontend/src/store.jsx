// Store del prototipo. Simula el servidor: cada método de `api` equivale a un endpoint
// del backend (ver comentarios). Así, al conectar Spring Boot solo se cambia este archivo.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { crearSeed } from './seed.js';
import { ahoraISO, calcularTotales, fechaDe, hoy, nextId, norm, num, turnoDe } from './utils.js';
import { MODO_SERVIDOR, crearApiRemota, estadoInicialServidor } from './remoto.js';

export { MODO_SERVIDOR };

const CLAVE = 'factufacil-datos-v1';
const Ctx = createContext(null);

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return JSON.parse(raw);
  } catch { /* sin almacenamiento: se usan datos de prueba */ }
  return null;
}

export class ErrorNegocio extends Error {}
const falla = (msg) => { throw new ErrorNegocio(msg); };

// Estado vacío con la misma forma del prototipo (modo servidor, antes de iniciar sesión).
const VACIO = {
  version: 1, empresa: { nombre: 'Factufacil', direccion: '', celular: '', logo: '', porcentajeIva: 19 },
  empleados: [], categorias: [], productos: [], clientes: [], facturas: [], secuenciaFactura: 0,
  novedades: [], cierresTurno: [], cierresDia: [], entregasCaja: [], entidades: [], conciliaciones: [],
  ajustes: [], pedidos: [], auditoria: [], sesion: null,
};

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => (MODO_SERVIDOR ? VACIO : cargar() || crearSeed()));
  const [listo, setListo] = useState(!MODO_SERVIDOR);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    if (MODO_SERVIDOR) return; // en modo servidor los datos viven en la base de datos
    try { localStorage.setItem(CLAVE, JSON.stringify(state)); } catch { /* ignorar */ }
  }, [state]);

  const api = useMemo(() => {
    const get = () => ref.current;
    const set = (s) => { ref.current = s; setState(s); };
    if (!MODO_SERVIDOR) return crearApi(get, set);
    return crearApiRemota(get, set, () => set({ ...VACIO, empresa: ref.current.empresa }));
  }, []);

  // Modo servidor: trae nombre y logo del negocio, y recupera la sesión si había una.
  useEffect(() => {
    if (!MODO_SERVIDOR) return;
    (async () => {
      const { empresa } = await estadoInicialServidor();
      if (!ref.current.sesion) { ref.current = { ...ref.current, empresa }; setState(ref.current); }
      await api.restaurar();
      setListo(true);
    })();
  }, [api]);

  if (!listo) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-2)' }}>Conectando con el servidor…</div>;
  return <Ctx.Provider value={{ state, api }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// Ayudas de consulta usadas por varios módulos
export const usuarioActual = (s) => s.empleados.find((e) => e.id === s.sesion?.empleadoId);
export const nombreEmpleado = (s, id) => s.empleados.find((e) => e.id === id)?.nombre ?? '—';
export const nombreCliente = (s, id) => (id ? s.clientes.find((c) => c.id === id)?.nombre ?? '—' : 'Sin cliente');
export const nombreCategoria = (s, id) => s.categorias.find((c) => c.id === id)?.nombre ?? '—';
export const facturasActivasDe = (s, fecha) => s.facturas.filter((f) => f.estado === 'ACTIVA' && fechaDe(f.fecha) === fecha);

export function ventasTurno(s, fecha, turno) {
  const fs = facturasActivasDe(s, fecha).filter((f) => turnoDe(f.fecha) === turno);
  const efectivo = fs.reduce((a, f) => a + f.pagos.efectivo, 0);
  const transferencia = fs.reduce((a, f) => a + f.pagos.transferencia, 0);
  return { cantidad: fs.length, efectivo, transferencia, total: efectivo + transferencia };
}

function crearApi(get, set) {
  const mut = (fn) => {
    const s = structuredClone(get());
    const r = fn(s);
    set(s);
    return r;
  };
  const yo = (s) => {
    const u = usuarioActual(s);
    if (!u) falla('La sesión terminó. Vuelve a ingresar.');
    return u;
  };
  const log = (s, tabla, registroId, accion, detalle) => {
    s.auditoria.push({ id: nextId(s.auditoria), tabla, registroId, accion, empleadoId: s.sesion?.empleadoId ?? null, detalle, fecha: ahoraISO() });
  };
  const requiere = (s, roles) => {
    if (!roles.includes(yo(s).rol)) falla('Tu cargo no tiene permiso para esta acción.');
  };
  const DIRECCION = ['DESARROLLADOR', 'JEFE'];
  const GESTION = ['DESARROLLADOR', 'JEFE', 'ADMIN'];

  const asegurarCategoria = (s, nombre) => {
    const n = String(nombre || '').trim();
    if (!n) falla('Escoge o escribe una categoría.');
    const ex = s.categorias.find((c) => norm(c.nombre) === norm(n));
    if (ex) return ex.id;
    const id = nextId(s.categorias);
    s.categorias.push({ id, nombre: n, activo: true });
    log(s, 'categorias', id, 'CREAR', `Creó la categoría ${n}`);
    return id;
  };

  // Valida y normaliza un borrador de factura (lo usan crear y modificar)
  const prepararFactura = (s, draft, stockLiberado = {}) => {
    const items = draft.items
      .filter((it) => it.productoId)
      .map((it) => {
        const p = s.productos.find((x) => x.id === it.productoId);
        const cantidad = num(it.cantidad);
        const valorUnidad = num(it.valorUnidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) falla(`La cantidad de "${p.nombre}" debe ser 1 o más.`);
        if (valorUnidad <= 0) falla(`Escribe el valor de "${p.nombre}".`);
        return { productoId: p.id, nombre: p.nombre, cantidad, valorUnidad, valorTotal: cantidad * valorUnidad };
      });
    if (!items.length) falla('Agrega al menos un producto.');
    // Stock: se suma lo vendido por producto y se compara con lo disponible
    const porProducto = {};
    items.forEach((it) => { porProducto[it.productoId] = (porProducto[it.productoId] || 0) + it.cantidad; });
    for (const [id, cant] of Object.entries(porProducto)) {
      const p = s.productos.find((x) => x.id === Number(id));
      const disponible = p.cantidad + (stockLiberado[id] || 0);
      if (cant > disponible) falla(`Solo hay ${disponible} de "${p.nombre}".`);
    }
    const t = calcularTotales(items, s.empresa.porcentajeIva);
    const efectivo = num(draft.efectivo);
    const transferencia = num(draft.transferencia);
    if (efectivo < 0 || transferencia < 0) falla('Los pagos no pueden ser negativos.');
    if (efectivo > t.total) falla('El efectivo no puede ser mayor que el total.');
    if (transferencia > t.total) falla('La transferencia no puede ser mayor que el total.');
    if (efectivo + transferencia !== t.total) falla(`Efectivo + transferencia debe dar ${t.total.toLocaleString('es-CO')}.`);
    const entregado = draft.entregado === '' || draft.entregado == null ? efectivo : num(draft.entregado);
    if (efectivo > 0 && entregado < efectivo) falla('Lo que entrega el cliente no alcanza para el efectivo.');
    return { items, ...t, pagos: { efectivo, transferencia }, entregado, devuelto: efectivo > 0 ? entregado - efectivo : 0, porProducto };
  };

  return {
    // POST /api/auth/login
    login(cedula, password) {
      return mut((s) => {
        const e = s.empleados.find((x) => x.cedula === String(cedula).trim());
        if (!e) falla('No encontramos esa cédula.');
        if (!e.activo) falla('Este empleado está desactivado. Habla con el jefe.');
        if (!String(password || '').trim()) falla('Escribe tu contraseña.');
        s.sesion = { empleadoId: e.id, desde: ahoraISO() };
        log(s, 'empleados', e.id, 'INGRESAR', `${e.nombre} inició sesión`);
        return e;
      });
    },
    // POST /api/auth/logout
    logout() {
      mut((s) => { s.sesion = null; });
    },
    // POST /api/dev/reset (solo prototipo)
    reiniciarDatos() {
      set(crearSeed());
    },

    // PUT /api/empresa
    guardarEmpresa(data) {
      mut((s) => {
        requiere(s, DIRECCION);
        if (!data.nombre?.trim()) falla('El nombre del negocio es obligatorio.');
        const iva = num(data.porcentajeIva);
        if (iva < 0 || iva > 100) falla('El IVA debe estar entre 0 y 100.');
        s.empresa = { ...s.empresa, ...data, porcentajeIva: iva };
        log(s, 'empresa_config', 1, 'EDITAR', `Actualizó los datos del negocio (IVA ${iva} %)`);
      });
    },

    // POST /api/empleados
    crearEmpleado({ cedula, nombre, rol, password }) {
      return mut((s) => {
        requiere(s, DIRECCION);
        const c = String(cedula).trim();
        if (!/^\d{5,15}$/.test(c)) falla('La cédula debe tener solo números (5 a 15).');
        if (!nombre?.trim()) falla('Escribe el nombre.');
        if (!password || password.length < 4) falla('La contraseña debe tener al menos 4 caracteres.');
        if (s.empleados.some((e) => e.cedula === c)) falla('Ya existe un empleado con esa cédula.');
        const id = nextId(s.empleados);
        s.empleados.push({ id, cedula: c, nombre: nombre.trim(), rol, activo: true, creadoPorId: yo(s).id, creadoEn: ahoraISO() });
        log(s, 'empleados', id, 'CREAR', `Creó a ${nombre.trim()} (${rol})`);
        return id;
      });
    },
    // PUT /api/empleados/{id}
    editarEmpleado(id, { cedula, nombre, rol }) {
      mut((s) => {
        requiere(s, DIRECCION);
        const e = s.empleados.find((x) => x.id === id);
        const c = String(cedula).trim();
        if (!/^\d{5,15}$/.test(c)) falla('La cédula debe tener solo números (5 a 15).');
        if (s.empleados.some((x) => x.cedula === c && x.id !== id)) falla('Ya existe un empleado con esa cédula.');
        if (id === yo(s).id && rol !== e.rol) falla('No puedes cambiar tu propio cargo.');
        const antes = `${e.nombre} (${e.rol})`;
        Object.assign(e, { cedula: c, nombre: nombre.trim(), rol });
        log(s, 'empleados', id, 'EDITAR', `Antes: ${antes}. Ahora: ${e.nombre} (${e.rol})`);
      });
    },
    // PATCH /api/empleados/{id}/estado
    cambiarEstadoEmpleado(id) {
      mut((s) => {
        requiere(s, DIRECCION);
        if (id === yo(s).id) falla('No puedes desactivarte a ti mismo.');
        const e = s.empleados.find((x) => x.id === id);
        e.activo = !e.activo;
        log(s, 'empleados', id, e.activo ? 'REACTIVAR' : 'DESACTIVAR', `${e.activo ? 'Reactivó' : 'Desactivó'} a ${e.nombre}`);
      });
    },

    // POST /api/productos
    crearProducto({ nombre, valorUnidad, cantidad, categoria }) {
      return mut((s) => {
        if (!nombre?.trim()) falla('Escribe el nombre del producto.');
        if (s.productos.some((p) => norm(p.nombre) === norm(nombre))) falla('Ya existe un producto con ese nombre.');
        if (num(valorUnidad) <= 0) falla('El valor debe ser mayor a 0.');
        if (num(cantidad) < 0 || !Number.isInteger(num(cantidad))) falla('La cantidad debe ser un número entero.');
        const categoriaId = asegurarCategoria(s, categoria);
        const id = nextId(s.productos);
        s.productos.push({ id, nombre: nombre.trim(), valorUnidad: num(valorUnidad), cantidad: num(cantidad), categoriaId, activo: true, creadoEn: ahoraISO(), actualizadoEn: ahoraISO() });
        log(s, 'productos', id, 'CREAR', `Creó ${nombre.trim()} con ${num(cantidad)} unidades`);
        return id;
      });
    },
    // PUT /api/productos/{id}
    editarProducto(id, { nombre, valorUnidad, categoria }) {
      mut((s) => {
        const p = s.productos.find((x) => x.id === id);
        if (!nombre?.trim()) falla('Escribe el nombre del producto.');
        if (s.productos.some((x) => x.id !== id && norm(x.nombre) === norm(nombre))) falla('Ya existe un producto con ese nombre.');
        if (num(valorUnidad) <= 0) falla('El valor debe ser mayor a 0.');
        const antes = `${p.nombre} ${p.valorUnidad}`;
        p.nombre = nombre.trim();
        p.valorUnidad = num(valorUnidad);
        p.categoriaId = asegurarCategoria(s, categoria);
        p.actualizadoEn = ahoraISO();
        log(s, 'productos', id, 'EDITAR', `Antes: ${antes}. Ahora: ${p.nombre} ${p.valorUnidad}. La cantidad solo cambia con ajustes.`);
      });
    },
    cambiarEstadoProducto(id) {
      mut((s) => {
        requiere(s, GESTION);
        const p = s.productos.find((x) => x.id === id);
        p.activo = !p.activo;
        log(s, 'productos', id, p.activo ? 'REACTIVAR' : 'DESACTIVAR', `${p.activo ? 'Reactivó' : 'Desactivó'} ${p.nombre}`);
      });
    },
    // POST /api/pedidos
    crearPedido(lineas) {
      return mut((s) => {
        const det = lineas.filter((l) => num(l.cantidad) > 0);
        if (!det.length) falla('Escribe la cantidad de al menos un producto.');
        const id = nextId(s.pedidos);
        s.pedidos.push({ id, creadoPorId: yo(s).id, estado: 'PENDIENTE', creadoEn: ahoraISO(), detalle: det.map((l) => ({ productoId: l.productoId, cantidad: num(l.cantidad) })) });
        log(s, 'pedidos', id, 'CREAR', `Pedido con ${det.length} productos`);
        return id;
      });
    },

    // POST /api/clientes
    crearCliente({ documento, nombre, correo }) {
      return mut((s) => {
        const doc = String(documento || '').trim();
        if (!doc) falla('Escribe el documento (cédula o NIT).');
        if (!nombre?.trim()) falla('Escribe el nombre.');
        if (correo && !/^\S+@\S+\.\S+$/.test(correo)) falla('El correo no se ve bien escrito.');
        const porDoc = s.clientes.find((c) => norm(c.documento) === norm(doc));
        if (porDoc) falla(`Ya existe un cliente con ese documento: ${porDoc.nombre}.`);
        const porNombre = s.clientes.find((c) => norm(c.nombre) === norm(nombre));
        if (porNombre) falla(`Ya existe un cliente con ese nombre (documento ${porNombre.documento}).`);
        const id = nextId(s.clientes);
        s.clientes.push({ id, documento: doc, nombre: nombre.trim(), correo: (correo || '').trim(), activo: true, creadoEn: ahoraISO() });
        log(s, 'clientes', id, 'CREAR', `Creó al cliente ${nombre.trim()}`);
        return id;
      });
    },
    editarCliente(id, { documento, nombre, correo }) {
      mut((s) => {
        const c = s.clientes.find((x) => x.id === id);
        const doc = String(documento || '').trim();
        if (!doc || !nombre?.trim()) falla('Documento y nombre son obligatorios.');
        if (correo && !/^\S+@\S+\.\S+$/.test(correo)) falla('El correo no se ve bien escrito.');
        const porDoc = s.clientes.find((x) => x.id !== id && norm(x.documento) === norm(doc));
        if (porDoc) falla(`Ese documento ya es de ${porDoc.nombre}.`);
        const porNombre = s.clientes.find((x) => x.id !== id && norm(x.nombre) === norm(nombre));
        if (porNombre) falla(`Ya existe un cliente con ese nombre (documento ${porNombre.documento}).`);
        Object.assign(c, { documento: doc, nombre: nombre.trim(), correo: (correo || '').trim() });
        log(s, 'clientes', id, 'EDITAR', `Editó al cliente ${c.nombre}`);
      });
    },
    cambiarEstadoCliente(id) {
      mut((s) => {
        const c = s.clientes.find((x) => x.id === id);
        c.activo = !c.activo;
        log(s, 'clientes', id, c.activo ? 'REACTIVAR' : 'DESACTIVAR', `${c.activo ? 'Reactivó' : 'Desactivó'} al cliente ${c.nombre}`);
      });
    },

    // POST /api/facturas  (el número sale de una secuencia atómica en el servidor)
    crearFactura(draft) {
      return mut((s) => {
        const u = yo(s);
        const f = prepararFactura(s, draft);
        for (const [id, cant] of Object.entries(f.porProducto)) {
          s.productos.find((p) => p.id === Number(id)).cantidad -= cant;
        }
        delete f.porProducto;
        s.secuenciaFactura += 1;
        const factura = {
          id: nextId(s.facturas),
          numero: 'FAC-' + String(s.secuenciaFactura).padStart(4, '0'),
          fecha: ahoraISO(),
          clienteId: draft.clienteId || null,
          empleadoId: u.id,
          ...f,
          estado: 'ACTIVA',
          historial: [{ accion: 'CREAR', motivo: '', empleadoId: u.id, fecha: ahoraISO() }],
        };
        s.facturas.push(factura);
        log(s, 'facturas', factura.id, 'CREAR', `Facturó ${factura.numero} por ${factura.total}`);
        return factura;
      });
    },
    // PUT /api/facturas/{id}
    modificarFactura(id, draft, motivo) {
      return mut((s) => {
        requiere(s, GESTION);
        if (!motivo?.trim()) falla('El motivo es obligatorio.');
        const fac = s.facturas.find((x) => x.id === id);
        if (fac.estado === 'ANULADA') falla('Una factura anulada no se puede modificar.');
        const liberado = {};
        fac.items.forEach((it) => { liberado[it.productoId] = (liberado[it.productoId] || 0) + it.cantidad; });
        const f = prepararFactura(s, draft, liberado);
        // devolver lo viejo y descontar lo nuevo
        for (const [pid, cant] of Object.entries(liberado)) s.productos.find((p) => p.id === Number(pid)).cantidad += cant;
        for (const [pid, cant] of Object.entries(f.porProducto)) s.productos.find((p) => p.id === Number(pid)).cantidad -= cant;
        delete f.porProducto;
        const antes = fac.total;
        Object.assign(fac, f, { clienteId: draft.clienteId || null });
        fac.historial.push({ accion: 'MODIFICAR', motivo: motivo.trim(), empleadoId: yo(s).id, fecha: ahoraISO(), antes, despues: fac.total });
        log(s, 'facturas', id, 'EDITAR', `Modificó ${fac.numero} (total ${antes} → ${fac.total}). Motivo: ${motivo.trim()}`);
        return fac;
      });
    },
    // POST /api/facturas/{id}/anular
    anularFactura(id, motivo) {
      mut((s) => {
        requiere(s, GESTION);
        if (!motivo?.trim()) falla('El motivo es obligatorio.');
        const fac = s.facturas.find((x) => x.id === id);
        if (fac.estado === 'ANULADA') falla('La factura ya está anulada.');
        fac.items.forEach((it) => { s.productos.find((p) => p.id === it.productoId).cantidad += it.cantidad; });
        fac.estado = 'ANULADA';
        fac.historial.push({ accion: 'ANULAR', motivo: motivo.trim(), empleadoId: yo(s).id, fecha: ahoraISO() });
        log(s, 'facturas', id, 'ANULAR', `Anuló ${fac.numero}. Motivo: ${motivo.trim()}`);
      });
    },

    // POST /api/novedades
    crearNovedad({ fecha, descripcion, valor }) {
      mut((s) => {
        if (!fecha) falla('Escoge la fecha.');
        if (!descripcion?.trim()) falla('Escribe qué pasó.');
        if (num(valor) < 0) falla('El valor no puede ser negativo.');
        const id = nextId(s.novedades);
        s.novedades.push({ id, fecha, descripcion: descripcion.trim(), valor: num(valor), empleadoId: yo(s).id, activo: true, creadoEn: ahoraISO() });
        log(s, 'novedades', id, 'CREAR', `Novedad: ${descripcion.trim()} (${num(valor)})`);
      });
    },
    cambiarEstadoNovedad(id) {
      mut((s) => {
        const n = s.novedades.find((x) => x.id === id);
        n.activo = !n.activo;
        log(s, 'novedades', id, n.activo ? 'REACTIVAR' : 'DESACTIVAR', `${n.activo ? 'Reactivó' : 'Desactivó'} la novedad "${n.descripcion}"`);
      });
    },

    // POST /api/cierres-turno
    crearCierreTurno(d) {
      return mut((s) => {
        if (!d.fecha || !d.turno) falla('Escoge la fecha y el turno.');
        if (s.cierresTurno.some((c) => c.fecha === d.fecha && c.turno === d.turno)) falla(`El turno de la ${d.turno.toLowerCase()} de ese día ya se cerró.`);
        if (s.cierresDia.some((c) => c.fecha === d.fecha)) falla('Ese día ya está cerrado.');
        if (!d.empleadoEntregaId || !d.empleadoRecibeId) falla('Escoge quién entrega y quién recibe la caja.');
        if (d.empleadoEntregaId === d.empleadoRecibeId) falla('Quien entrega y quien recibe deben ser personas distintas.');
        const ventas = ventasTurno(s, d.fecha, d.turno);
        const ef = num(d.valorEfectivo), tr = num(d.valorTransferencia), g = num(d.gastos);
        if (ef < 0 || tr < 0 || g < 0) falla('Los valores no pueden ser negativos.');
        const dif = ef + tr + g - ventas.total;
        const id = nextId(s.cierresTurno);
        const c = {
          id, fecha: d.fecha, turno: d.turno,
          empleadoEntregaId: d.empleadoEntregaId, empleadoRecibeId: d.empleadoRecibeId,
          ventasSistema: ventas.total,
          valorEfectivo: ef, valorTransferencia: tr, gastos: g, valorTotal: ef + tr,
          sobra: Math.max(dif, 0), falta: Math.max(-dif, 0),
          coordinadoraValor: num(d.coordinadoraValor), ganaValor: num(d.ganaValor),
          observaciones: (d.observaciones || '').trim(), creadoEn: ahoraISO(),
        };
        s.cierresTurno.push(c);
        log(s, 'cierres_turno', id, 'CERRAR', `Cierre ${d.turno} ${d.fecha}: sobra ${c.sobra}, falta ${c.falta}`);
        return c;
      });
    },
    // POST /api/cierres-dia
    cerrarDia(fecha) {
      return mut((s) => {
        if (s.cierresDia.some((c) => c.fecha === fecha)) falla('Ese día ya está cerrado.');
        const ct = s.cierresTurno.filter((c) => c.fecha === fecha);
        if (!ct.length) falla('Primero cierra al menos un turno de ese día.');
        const id = nextId(s.cierresDia);
        const c = {
          id, fecha,
          totalVendido: facturasActivasDe(s, fecha).reduce((a, f) => a + f.total, 0),
          totalEfectivo: ct.reduce((a, x) => a + x.valorEfectivo, 0),
          totalTransferencia: ct.reduce((a, x) => a + x.valorTransferencia, 0),
          gastos: ct.reduce((a, x) => a + x.gastos, 0),
          sobra: ct.reduce((a, x) => a + x.sobra, 0),
          falta: ct.reduce((a, x) => a + x.falta, 0),
          ajusteManual: 0, motivoAjuste: '', cerradoPorId: yo(s).id, creadoEn: ahoraISO(),
        };
        s.cierresDia.push(c);
        log(s, 'cierres_dia', id, 'CERRAR', `Cerró el día ${fecha}`);
        return c;
      });
    },
    // PATCH /api/cierres-dia/{fecha}/ajuste
    ajustarCierreDia(fecha, valor, motivo) {
      mut((s) => {
        requiere(s, GESTION);
        const c = s.cierresDia.find((x) => x.fecha === fecha);
        if (!c) falla('Ese día todavía no está cerrado.');
        if (num(valor) === 0) falla('Escribe cuánto poner (+) o quitar (−).');
        if (!motivo?.trim()) falla('El motivo es obligatorio.');
        c.ajusteManual += num(valor);
        c.motivoAjuste = [c.motivoAjuste, motivo.trim()].filter(Boolean).join(' | ');
        log(s, 'cierres_dia', c.id, 'AJUSTAR', `Ajuste de ${num(valor)} al ${fecha}. Motivo: ${motivo.trim()}`);
      });
    },
    // POST /api/entregas-caja
    crearEntregaCaja(d) {
      mut((s) => {
        requiere(s, GESTION);
        if (!d.fechaDesde || !d.fechaHasta || d.fechaDesde > d.fechaHasta) falla('Revisa las fechas.');
        if (num(d.valorEntregado) <= 0) falla('Escribe el valor entregado.');
        if (!d.recibidoPorId) falla('Escoge quién recibe la plata.');
        const id = nextId(s.entregasCaja);
        s.entregasCaja.push({ id, ...d, valorEntregado: num(d.valorEntregado), entregadoPorId: yo(s).id, creadoEn: ahoraISO() });
        log(s, 'entregas_caja', id, 'CREAR', `Entregó ${num(d.valorEntregado)} (${d.fechaDesde} a ${d.fechaHasta})`);
      });
    },

    // POST /api/entidades
    crearEntidad({ nombre, requiereTipoPago }) {
      mut((s) => {
        if (!nombre?.trim()) falla('Escribe el nombre de la entidad.');
        if (s.entidades.some((e) => norm(e.nombre) === norm(nombre))) falla('Esa entidad ya existe.');
        const id = nextId(s.entidades);
        s.entidades.push({ id, nombre: nombre.trim(), requiereTipoPago: !!requiereTipoPago, activo: true });
        log(s, 'entidades', id, 'CREAR', `Creó la entidad ${nombre.trim()}`);
      });
    },
    cambiarEstadoEntidad(id) {
      mut((s) => {
        const e = s.entidades.find((x) => x.id === id);
        e.activo = !e.activo;
        log(s, 'entidades', id, e.activo ? 'REACTIVAR' : 'DESACTIVAR', `${e.activo ? 'Reactivó' : 'Desactivó'} ${e.nombre}`);
      });
    },
    // POST /api/entidades/conciliaciones
    crearConciliacion(d) {
      mut((s) => {
        const ent = s.entidades.find((e) => e.id === d.entidadId);
        if (!ent) falla('Escoge la entidad.');
        if (!d.fecha) falla('Escoge la fecha.');
        const ve = num(d.valorEntregado), vg = num(d.valorGanancia);
        if (ve < 0 || vg < 0) falla('Los valores no pueden ser negativos.');
        if (ent.requiereTipoPago && !d.tipoPago) falla(`Para ${ent.nombre} escoge el tipo de pago.`);
        if (s.conciliaciones.some((c) => c.entidadId === ent.id && c.fecha === d.fecha && (c.tipoPago || null) === (ent.requiereTipoPago ? d.tipoPago : null)))
          falla('Esa conciliación ya se registró ese día.');
        const id = nextId(s.conciliaciones);
        const porcentaje = ve + vg > 0 ? +((vg / (ve + vg)) * 100).toFixed(2) : 0;
        s.conciliaciones.push({ id, entidadId: ent.id, fecha: d.fecha, tipoPago: ent.requiereTipoPago ? d.tipoPago : null, valorEntregado: ve, valorGanancia: vg, porcentajeGanancia: porcentaje, empleadoId: yo(s).id, creadoEn: ahoraISO() });
        log(s, 'entidad_conciliaciones', id, 'CREAR', `${ent.nombre} ${d.fecha}: entregado ${ve}, ganancia ${vg} (${porcentaje} %)`);
      });
    },

    // POST /api/ajustes-inventario
    crearAjuste({ productoId, nuevo, tipo, cantidad, motivo }) {
      return mut((s) => {
        requiere(s, GESTION);
        const cant = num(cantidad);
        if (!Number.isInteger(cant) || cant < 1) falla('La cantidad debe ser un número entero mayor a 0.');
        if (!motivo?.trim()) falla('Escribe el motivo.');
        let p;
        if (tipo === 'INGRESO_NUEVO') {
          if (!nuevo?.nombre?.trim()) falla('Escribe el nombre del producto nuevo.');
          if (s.productos.some((x) => norm(x.nombre) === norm(nuevo.nombre))) falla('Ese producto ya existe: usa "Ingreso de producto existente".');
          if (num(nuevo.valorUnidad) <= 0) falla('Escribe el valor de venta.');
          const id = nextId(s.productos);
          p = { id, nombre: nuevo.nombre.trim(), valorUnidad: num(nuevo.valorUnidad), cantidad: 0, categoriaId: asegurarCategoria(s, nuevo.categoria), activo: true, creadoEn: ahoraISO(), actualizadoEn: ahoraISO() };
          s.productos.push(p);
          log(s, 'productos', id, 'CREAR', `Creó ${p.nombre} desde un ajuste`);
        } else {
          p = s.productos.find((x) => x.id === productoId);
          if (!p) falla('Escoge el producto.');
        }
        const signo = tipo === 'INGRESO_NUEVO' || tipo === 'INGRESO_EXISTENTE' ? 1 : -1;
        if (signo < 0 && cant > p.cantidad) falla(`Solo hay ${p.cantidad} de "${p.nombre}".`);
        p.cantidad += signo * cant;
        p.actualizadoEn = ahoraISO();
        const id = nextId(s.ajustes);
        s.ajustes.push({ id, productoId: p.id, tipo, cantidad: cant, motivo: motivo.trim(), empleadoId: yo(s).id, fecha: ahoraISO() });
        log(s, 'ajustes_inventario', id, 'CREAR', `${tipo} de ${cant} ${p.nombre}. Motivo: ${motivo.trim()}`);
        return p;
      });
    },
    // POST /api/inventario-fisico (carga del Excel diligenciado)
    aplicarConteo(lineas) {
      return mut((s) => {
        requiere(s, GESTION);
        let cambios = 0;
        for (const l of lineas) {
          const p = s.productos.find((x) => x.id === l.productoId);
          if (!p || l.contado == null) continue;
          const dif = l.contado - p.cantidad;
          if (dif === 0) continue;
          const id = nextId(s.ajustes);
          s.ajustes.push({ id, productoId: p.id, tipo: 'CONTEO_FISICO', cantidad: dif, motivo: `Inventario físico: sistema ${p.cantidad}, contado ${l.contado}`, empleadoId: yo(s).id, fecha: ahoraISO() });
          p.cantidad = l.contado;
          cambios++;
        }
        log(s, 'ajustes_inventario', null, 'CREAR', `Cargó inventario físico: ${cambios} productos corregidos`);
        return cambios;
      });
    },
  };
}

export const hoyStr = hoy;
