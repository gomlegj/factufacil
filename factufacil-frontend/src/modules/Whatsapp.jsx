import { useState } from 'react';
import { Copy, Send } from 'lucide-react';
import { useStore, facturasActivasDe, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, PageHeader, useAviso } from '../ui.jsx';
import { fechaLarga, hoy, money, pct } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'whatsapp');

export function textoResumen(state, fecha) {
  const facturas = facturasActivasDe(state, fecha);
  const porProducto = {};
  facturas.forEach((f) => f.items.forEach((it) => {
    porProducto[it.nombre] ??= { cant: 0, valor: 0 };
    porProducto[it.nombre].cant += it.cantidad;
    porProducto[it.nombre].valor += it.valorTotal;
  }));
  const total = facturas.reduce((s, f) => s + f.total, 0);
  const ef = facturas.reduce((s, f) => s + f.pagos.efectivo, 0);
  const tr = facturas.reduce((s, f) => s + f.pagos.transferencia, 0);
  const turnos = state.cierresTurno.filter((c) => c.fecha === fecha);
  const dia = state.cierresDia.find((c) => c.fecha === fecha);
  const conc = state.conciliaciones.filter((c) => c.fecha === fecha);
  const nov = state.novedades.filter((n) => n.activo && n.fecha === fecha);

  const L = [];
  L.push(`*${state.empresa.nombre}*`);
  L.push(`📅 Resumen del ${fechaLarga(fecha)}`);
  L.push('');
  L.push(`*Productos vendidos*`);
  Object.entries(porProducto).sort((a, b) => b[1].cant - a[1].cant).forEach(([n, v]) => L.push(`• ${n}: ${v.cant}  (${money(v.valor)})`));
  if (!facturas.length) L.push('• Sin ventas');
  L.push('');
  L.push(`*Total vendido: ${money(total)}*  (${facturas.length} facturas)`);
  L.push(`💵 Efectivo: ${money(ef)}`);
  L.push(`📲 Transferencia: ${money(tr)}`);
  L.push('');
  L.push('*Cierre de caja*');
  if (!turnos.length) L.push('Sin turnos cerrados');
  turnos.forEach((c) => {
    L.push(`_Turno ${c.turno.toLowerCase()}_ (${nombreEmpleado(state, c.empleadoEntregaId)} → ${nombreEmpleado(state, c.empleadoRecibeId)})`);
    L.push(`  Efectivo ${money(c.valorEfectivo)} · Transf. ${money(c.valorTransferencia)} · Total ${money(c.valorTotal)}`);
    L.push(`  Gastos ${money(c.gastos)} · Sobra ${money(c.sobra)} · Falta ${money(c.falta)}`);
    if (c.coordinadoraValor || c.ganaValor) L.push(`  Coordinadora ${money(c.coordinadoraValor)} · Gana ${money(c.ganaValor)}`);
    if (c.observaciones) L.push(`  Obs: ${c.observaciones}`);
  });
  if (dia) {
    L.push(`*Día cerrado* ✅ Efectivo ${money(dia.totalEfectivo)} · Transf. ${money(dia.totalTransferencia)} · Gastos ${money(dia.gastos)}`);
    if (dia.ajusteManual) L.push(`Ajuste manual: ${money(dia.ajusteManual)} (${dia.motivoAjuste})`);
  } else if (turnos.length) L.push('⚠️ El día aún no está cerrado');
  if (conc.length) {
    L.push('');
    L.push('*Entidades*');
    conc.forEach((c) => L.push(`• ${state.entidades.find((e) => e.id === c.entidadId)?.nombre}${c.tipoPago ? ` (${c.tipoPago === 'CONTRAENTREGA' ? 'contra entrega' : 'establecimiento'})` : ''}: entregado ${money(c.valorEntregado)}, ganancia ${money(c.valorGanancia)} (${pct(c.porcentajeGanancia)})`));
  }
  if (nov.length) {
    L.push('');
    L.push('*Novedades*');
    nov.forEach((n) => L.push(`• ${n.descripcion}: ${money(n.valor)}`));
  }
  return L.join('\n');
}

export default function Whatsapp() {
  const { state } = useStore();
  const avisar = useAviso();
  const [fecha, setFecha] = useState(hoy());
  const texto = textoResumen(state, fecha);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); avisar('Resumen copiado. Pégalo en WhatsApp.'); }
    catch { avisar('No se pudo copiar. Selecciona el texto y cópialo.', 'bad'); }
  };
  return (
    <>
      <PageHeader modulo={MOD} titulo="Resumen para WhatsApp" />
      <div className="row" style={{ marginBottom: 14, alignItems: 'flex-end' }}>
        <Field label="Día"><input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <div className="spacer" />
        <Btn variant="primary" icon={Copy} onClick={copiar}>Copiar</Btn>
        <a className="btn btn-ok" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><Send size={20} /> Abrir WhatsApp</a>
      </div>
      <div className="card" style={{ background: '#e7f6e7', borderColor: '#cfe6cf', maxWidth: 640 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: 15, lineHeight: 1.55 }}>{texto}</pre>
      </div>
    </>
  );
}
