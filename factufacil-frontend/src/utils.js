// Utilidades generales: formato de dinero, fechas y búsqueda sin tildes.

const fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export const money = (n) => '$ ' + fmt.format(Math.round(Number(n) || 0));
export const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const pct = (n) => (Number(n) || 0).toFixed(1).replace('.', ',') + ' %';

const pad = (n) => String(n).padStart(2, '0');
export const fechaISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoy = () => fechaISO(new Date());
export const ahoraISO = () => new Date().toISOString();
export const fechaDe = (iso) => fechaISO(new Date(iso));
export const horaDe = (iso) => new Date(iso).getHours();
export const turnoDe = (iso) => (horaDe(iso) < 14 ? 'MAÑANA' : 'TARDE');

export const fechaLarga = (f) => {
  const d = typeof f === 'string' && f.length === 10 ? new Date(f + 'T12:00:00') : new Date(f);
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
export const fechaCorta = (f) => {
  const d = typeof f === 'string' && f.length === 10 ? new Date(f + 'T12:00:00') : new Date(f);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const sumarDias = (fecha, dias) => {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
};
// Lunes de la semana de la fecha dada
export const inicioSemana = (fecha) => {
  const d = new Date(fecha + 'T12:00:00');
  const dia = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dia);
  return fechaISO(d);
};
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
};

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const nextId = (lista) => lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;

export const calcularTotales = (items, porcentajeIva) => {
  const subtotal = Math.round(items.reduce((s, it) => s + num(it.cantidad) * num(it.valorUnidad), 0));
  const iva = Math.round((subtotal * num(porcentajeIva)) / 100);
  return { subtotal, iva, total: subtotal + iva };
};

// Mueve el foco al siguiente campo marcado con data-nav dentro del mismo formulario (data-navscope).
export function focusNext(el, saltos = 1) {
  const scope = el.closest('[data-navscope]') || document.body;
  const lista = [...scope.querySelectorAll('[data-nav]')].filter(
    (x) => !x.disabled && x.offsetParent !== null
  );
  const i = lista.indexOf(el);
  const sig = lista[i + saltos];
  if (sig) {
    sig.focus();
    if (sig.select) sig.select();
    return true;
  }
  return false;
}

export function descargarTexto(nombre, contenido, tipo = 'text/plain') {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
