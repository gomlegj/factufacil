// Conexión con el servidor Spring Boot. Se activa cuando existe VITE_API_URL (ver .env).
// Mantiene el access token en memoria/almacenamiento y lo renueva con el refresh token.
import { num } from './utils.js';

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const MODO_SERVIDOR = !!API_URL;

const CLAVE_TOKENS = 'factufacil-tokens';

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

let tokens = leerTokens();
function leerTokens() {
  try { return JSON.parse(localStorage.getItem(CLAVE_TOKENS) || 'null'); } catch { return null; }
}
function guardarTokens(t) {
  tokens = t;
  try {
    if (t) localStorage.setItem(CLAVE_TOKENS, JSON.stringify(t));
    else localStorage.removeItem(CLAVE_TOKENS);
  } catch { /* sin almacenamiento: la sesión dura lo que dure la pestaña */ }
}
export const hayTokens = () => !!tokens?.refreshToken;

let renovando = null;
async function renovar() {
  // Si varias peticiones vencen a la vez, se renueva una sola vez.
  renovando ??= (async () => {
    try {
      const r = await fetch(API_URL + '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens?.refreshToken }),
      });
      if (!r.ok) { guardarTokens(null); return false; }
      const s = await r.json();
      guardarTokens({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => { renovando = null; }, 0);
    }
  })();
  return renovando;
}

export async function pedir(metodo, ruta, cuerpo, { sinToken = false, reintento = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (!sinToken && tokens?.accessToken) headers.Authorization = 'Bearer ' + tokens.accessToken;
  let r;
  try {
    r = await fetch(API_URL + ruta, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revisa que esté encendido.', 0);
  }
  if (r.status === 401 && !sinToken && reintento && tokens?.refreshToken) {
    if (await renovar()) return pedir(metodo, ruta, cuerpo, { reintento: false });
  }
  const texto = await r.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw new ErrorApi(datos?.mensaje || 'Algo salió mal en el servidor.', r.status);
  return datos;
}

// Convierte los números que la interfaz maneja como texto ("2100") a número para la API.
const n = (v) => (v === '' || v == null ? null : num(v));

/**
 * Misma interfaz que el store local (store.jsx), pero contra el servidor.
 * Después de cada cambio se vuelve a cargar el estado completo (GET /api/estado),
 * así la pantalla siempre muestra lo que quedó guardado en la base de datos.
 */
export function crearApiRemota(get, set, alCerrarSesion) {
  const sesionDe = (emp) => ({ empleadoId: emp.id, desde: new Date().toISOString() });

  async function cargar(sesion) {
    const e = await pedir('GET', '/estado');
    set({ ...e, sesion: sesion ?? get().sesion, version: 1 });
  }
  async function cambio(metodo, ruta, cuerpo) {
    try {
      const r = await pedir(metodo, ruta, cuerpo);
      await cargar();
      return r;
    } catch (e) {
      if (e.estado === 401) { guardarTokens(null); alCerrarSesion(); }
      throw e;
    }
  }

  return {
    /** Al recargar la página: si hay refresh token, recupera la sesión. */
    async restaurar() {
      if (!hayTokens()) return false;
      try {
        const yo = await pedir('GET', '/auth/yo');
        await cargar(sesionDe(yo));
        return true;
      } catch {
        guardarTokens(null);
        return false;
      }
    },
    async login(cedula, password) {
      const s = await pedir('POST', '/auth/login', { cedula: String(cedula).trim(), password }, { sinToken: true });
      guardarTokens({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      await cargar(sesionDe(s.empleado));
      return s.empleado;
    },
    async logout() {
      const refreshToken = tokens?.refreshToken;
      guardarTokens(null);
      alCerrarSesion();
      try { await pedir('POST', '/auth/logout', { refreshToken }, { sinToken: true }); } catch { /* igual se cierra */ }
    },
    reiniciarDatos() {
      throw new ErrorApi('Con servidor, los datos de prueba se reinician borrando la carpeta data/ del servidor.');
    },
    recargar: () => cargar(),

    guardarEmpresa: (d) => cambio('PUT', '/empresa', { ...d, porcentajeIva: n(d.porcentajeIva) }),

    crearEmpleado: async (d) => (await cambio('POST', '/empleados', d)).id,
    editarEmpleado: (id, d) => cambio('PUT', `/empleados/${id}`, d),
    cambiarEstadoEmpleado: (id) => cambio('PATCH', `/empleados/${id}/estado`),

    crearProducto: async (d) => (await cambio('POST', '/productos', { ...d, valorUnidad: n(d.valorUnidad), cantidad: n(d.cantidad) ?? 0 })).id,
    editarProducto: (id, d) => cambio('PUT', `/productos/${id}`, { nombre: d.nombre, valorUnidad: n(d.valorUnidad), categoria: d.categoria }),
    cambiarEstadoProducto: (id) => cambio('PATCH', `/productos/${id}/estado`),
    crearPedido: async (lineas) => (await cambio('POST', '/pedidos', lineas.map((l) => ({ productoId: l.productoId, cantidad: n(l.cantidad) })))).id,

    crearCliente: async (d) => (await cambio('POST', '/clientes', d)).id,
    editarCliente: (id, d) => cambio('PUT', `/clientes/${id}`, d),
    cambiarEstadoCliente: (id) => cambio('PATCH', `/clientes/${id}/estado`),

    crearFactura: (draft) => cambio('POST', '/facturas', facturaIn(draft)),
    modificarFactura: (id, draft, motivo) => cambio('PUT', `/facturas/${id}`, { ...facturaIn(draft), motivo }),
    anularFactura: (id, motivo) => cambio('POST', `/facturas/${id}/anular`, { motivo }),

    crearNovedad: (d) => cambio('POST', '/novedades', { ...d, valor: n(d.valor) }),
    cambiarEstadoNovedad: (id) => cambio('PATCH', `/novedades/${id}/estado`),

    crearCierreTurno: (d) => cambio('POST', '/cierres-turno', {
      ...d,
      valorEfectivo: n(d.valorEfectivo), valorTransferencia: n(d.valorTransferencia), gastos: n(d.gastos),
      coordinadoraValor: n(d.coordinadoraValor), ganaValor: n(d.ganaValor),
    }),
    cerrarDia: (fecha) => cambio('POST', '/cierres-dia', { fecha }),
    ajustarCierreDia: (fecha, valor, motivo) => cambio('PATCH', `/cierres-dia/${fecha}/ajuste`, { valor: n(valor), motivo }),
    crearEntregaCaja: (d) => cambio('POST', '/entregas-caja', { ...d, valorEntregado: n(d.valorEntregado) }),

    crearEntidad: (d) => cambio('POST', '/entidades', d),
    cambiarEstadoEntidad: (id) => cambio('PATCH', `/entidades/${id}/estado`),
    crearConciliacion: (d) => cambio('POST', '/entidades/conciliaciones', {
      ...d, tipoPago: d.tipoPago || null, valorEntregado: n(d.valorEntregado), valorGanancia: n(d.valorGanancia),
    }),

    crearAjuste: (d) => cambio('POST', '/ajustes-inventario', {
      productoId: d.productoId, tipo: d.tipo, cantidad: n(d.cantidad), motivo: d.motivo,
      nuevo: d.tipo === 'INGRESO_NUEVO' ? { ...d.nuevo, valorUnidad: n(d.nuevo.valorUnidad) } : null,
    }),
    aplicarConteo: async (lineas) => (await cambio('POST', '/inventario-fisico', lineas.map((l) => ({ productoId: l.productoId, contado: l.contado })))).corregidos,
  };
}

function facturaIn(d) {
  return {
    clienteId: d.clienteId || null,
    items: d.items.filter((it) => it.productoId).map((it) => ({ productoId: it.productoId, cantidad: n(it.cantidad), valorUnidad: n(it.valorUnidad) })),
    efectivo: n(d.efectivo) ?? 0,
    transferencia: n(d.transferencia) ?? 0,
    entregado: n(d.entregado),
  };
}

/** Estado mínimo antes de iniciar sesión: solo los datos públicos del negocio. */
export async function estadoInicialServidor() {
  let empresa = { nombre: 'Factufacil', direccion: '', celular: '', logo: '', porcentajeIva: 19 };
  try { empresa = await pedir('GET', '/empresa', undefined, { sinToken: true }); } catch { /* servidor apagado: se avisa al ingresar */ }
  return { empresa };
}
