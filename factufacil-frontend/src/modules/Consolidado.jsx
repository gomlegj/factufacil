import { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, Calendar, Layers, HandCoins, Scale, Plus } from 'lucide-react';
import { useStore, usuarioActual, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, Select, Modal, PageHeader, Tabs, useAccion, Vacio } from '../ui.jsx';
import { DIAS, fechaCorta, fechaDe, hoy, inicioSemana, money, nombreMes, num, sumarDias } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'consolidado');

// Resumen por día: ventas de facturas + datos del cierre (si existe) + ajuste manual.
function useResumenDias() {
  const { state } = useStore();
  return useMemo(() => {
    const m = {};
    for (const f of state.facturas) {
      if (f.estado !== 'ACTIVA') continue;
      const d = fechaDe(f.fecha);
      m[d] ??= { fecha: d, facturas: 0, vendido: 0, efectivo: 0, transferencia: 0 };
      m[d].facturas++; m[d].vendido += f.total; m[d].efectivo += f.pagos.efectivo; m[d].transferencia += f.pagos.transferencia;
    }
    for (const c of state.cierresDia) {
      m[c.fecha] ??= { fecha: c.fecha, facturas: 0, vendido: 0, efectivo: 0, transferencia: 0 };
      Object.assign(m[c.fecha], { cierre: c });
    }
    for (const d of Object.values(m)) {
      const c = d.cierre;
      d.ajuste = c?.ajusteManual ?? 0;
      d.gastos = c?.gastos ?? 0;
      d.sobra = c?.sobra ?? 0;
      d.falta = c?.falta ?? 0;
      d.final = d.vendido + d.ajuste;
    }
    return m;
  }, [state.facturas, state.cierresDia]);
}

const sumar = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);

function TablaDias({ dias, onAjustar, conDiaSemana }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>Día</th><th className="num">Facturas</th><th className="num">Vendido</th><th className="num">Efectivo</th><th className="num">Transf.</th><th className="num">Gastos</th><th className="num">Sobra / falta</th><th className="num">Ajuste</th><th className="num">Total final</th><th>Estado</th>{onAjustar && <th></th>}</tr></thead>
        <tbody>
          {dias.map((d) => (
            <tr key={d.fecha}>
              <td>{conDiaSemana && <strong>{DIAS[new Date(d.fecha + 'T12:00:00').getDay()]} </strong>}{fechaCorta(d.fecha)}</td>
              <td className="num">{d.facturas}</td>
              <td className="num">{money(d.vendido)}</td>
              <td className="num">{money(d.efectivo)}</td>
              <td className="num">{money(d.transferencia)}</td>
              <td className="num">{money(d.gastos)}</td>
              <td className="num">{d.sobra ? <span className="badge b-warn">+{money(d.sobra)}</span> : d.falta ? <span className="badge b-bad">−{money(d.falta)}</span> : '—'}</td>
              <td className="num" title={d.cierre?.motivoAjuste || ''}>{d.ajuste ? <span className="badge b-neutral">{d.ajuste > 0 ? '+' : ''}{money(d.ajuste)}</span> : '—'}</td>
              <td className="num"><strong>{money(d.final)}</strong></td>
              <td>{d.cierre ? <span className="badge b-ok">Cerrado</span> : <span className="badge b-warn">Sin cerrar</span>}</td>
              {onAjustar && <td className="right">{d.cierre && <button className="icon-btn" title="Ajuste manual" aria-label={`Ajustar ${d.fecha}`} onClick={() => onAjustar(d.fecha)}><Scale size={18} /></button>}</td>}
            </tr>
          ))}
        </tbody>
        {dias.length > 1 && (
          <tfoot>
            <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
              <td>Total</td><td className="num">{sumar(dias, 'facturas')}</td><td className="num">{money(sumar(dias, 'vendido'))}</td><td className="num">{money(sumar(dias, 'efectivo'))}</td><td className="num">{money(sumar(dias, 'transferencia'))}</td><td className="num">{money(sumar(dias, 'gastos'))}</td><td></td><td className="num">{money(sumar(dias, 'ajuste'))}</td><td className="num">{money(sumar(dias, 'final'))}</td><td></td>{onAjustar && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function Consolidado() {
  const [tab, setTab] = useState('dia');
  return (
    <>
      <PageHeader modulo={MOD} />
      <Tabs value={tab} onChange={setTab} color={MOD.color} tabs={[
        { id: 'dia', label: 'Por día', icon: CalendarDays },
        { id: 'semana', label: 'Semana', icon: CalendarRange },
        { id: 'mes', label: 'Mes', icon: Calendar },
        { id: 'total', label: 'Todos los meses', icon: Layers },
        { id: 'entregas', label: 'Entregas de caja', icon: HandCoins },
      ]} />
      {tab === 'dia' && <PorDia />}
      {tab === 'semana' && <Semana />}
      {tab === 'mes' && <Mes />}
      {tab === 'total' && <Acumulado />}
      {tab === 'entregas' && <Entregas />}
    </>
  );
}

function PorDia() {
  const resumen = useResumenDias();
  const [ajustar, setAjustar] = useState(null);
  const dias = Object.values(resumen).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 31);
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>Últimos 31 días. Usa <Scale size={14} /> para poner o quitar plata cuando un día se cerró mal (con motivo obligatorio).</p>
      <TablaDias dias={dias} onAjustar={setAjustar} />
      {ajustar && <AjusteModal fecha={ajustar} onClose={() => setAjustar(null)} />}
    </>
  );
}

function AjusteModal({ fecha, onClose }) {
  const { state, api } = useStore();
  const accion = useAccion();
  const [signo, setSigno] = useState('+');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const c = state.cierresDia.find((x) => x.fecha === fecha);
  const guardar = async () => { if (await accion(() => api.ajustarCierreDia(fecha, (signo === '+' ? 1 : -1) * num(valor), motivo), 'Ajuste guardado')) onClose(); };
  return (
    <Modal title={`Ajuste manual · ${fechaCorta(fecha)}`} icon={Scale} color={MOD.color} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} disabled={!num(valor) || !motivo.trim()}>Guardar ajuste</Btn></>}>
      {c && c.ajusteManual !== 0 &&<div className="alert info" style={{ marginBottom: 12 }}>Ajuste actual: {money(c.ajusteManual)} — {c.motivoAjuste}</div>}
      <div className="row" style={{ marginBottom: 12 }}>
        <Btn variant={signo === '+' ? 'ok' : 'ghost'} onClick={() => setSigno('+')} style={{ flex: 1 }}>Poner plata (+)</Btn>
        <Btn variant={signo === '-' ? 'bad' : 'ghost'} onClick={() => setSigno('-')} style={{ flex: 1 }}>Quitar plata (−)</Btn>
      </div>
      <div className="grid">
        <Field label="Valor"><Input autoFocus className="num" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Motivo (obligatorio)"><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} onEnter={guardar} placeholder="Ej: se contó mal un billete" /></Field>
      </div>
    </Modal>
  );
}

function Semana() {
  const resumen = useResumenDias();
  const [lunes, setLunes] = useState(inicioSemana(hoy()));
  const dias = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    return resumen[f] ?? { fecha: f, facturas: 0, vendido: 0, efectivo: 0, transferencia: 0, gastos: 0, ajuste: 0, final: 0 };
  });
  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <Btn size="sm" onClick={() => setLunes(sumarDias(lunes, -7))}>‹ Semana anterior</Btn>
        <strong>Semana del {fechaCorta(lunes)} al {fechaCorta(sumarDias(lunes, 6))}</strong>
        <Btn size="sm" onClick={() => setLunes(sumarDias(lunes, 7))}>Siguiente ›</Btn>
      </div>
      <TablaDias dias={dias} conDiaSemana />
    </>
  );
}

function Mes() {
  const resumen = useResumenDias();
  const meses = [...new Set(Object.keys(resumen).map((d) => d.slice(0, 7)))].sort().reverse();
  const [mes, setMes] = useState(meses[0] ?? hoy().slice(0, 7));
  const dias = Object.values(resumen).filter((d) => d.fecha.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <Field label="Mes"><select className="input" value={mes} onChange={(e) => setMes(e.target.value)} style={{ textTransform: 'capitalize' }}>{meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</select></Field>
        <div className="stat" style={{ alignSelf: 'stretch' }}><div className="k">Total del mes</div><div className="v">{money(sumar(dias, 'final'))}</div></div>
      </div>
      {dias.length ? <TablaDias dias={dias} conDiaSemana /> : <Vacio>Sin ventas ese mes.</Vacio>}
    </>
  );
}

function Acumulado() {
  const resumen = useResumenDias();
  const porMes = {};
  Object.values(resumen).forEach((d) => {
    const m = d.fecha.slice(0, 7);
    porMes[m] ??= { mes: m, dias: 0, facturas: 0, vendido: 0, efectivo: 0, transferencia: 0, ajuste: 0, final: 0 };
    const x = porMes[m];
    x.dias++; x.facturas += d.facturas; x.vendido += d.vendido; x.efectivo += d.efectivo; x.transferencia += d.transferencia; x.ajuste += d.ajuste; x.final += d.final;
  });
  const lista = Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes));
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>Mes</th><th className="num">Días con ventas</th><th className="num">Facturas</th><th className="num">Vendido</th><th className="num">Efectivo</th><th className="num">Transf.</th><th className="num">Ajustes</th><th className="num">Total final</th><th className="num">Promedio día</th></tr></thead>
        <tbody>
          {lista.map((m) => (
            <tr key={m.mes}>
              <td style={{ textTransform: 'capitalize' }}><strong>{nombreMes(m.mes)}</strong></td><td className="num">{m.dias}</td><td className="num">{m.facturas}</td>
              <td className="num">{money(m.vendido)}</td><td className="num">{money(m.efectivo)}</td><td className="num">{money(m.transferencia)}</td><td className="num">{money(m.ajuste)}</td>
              <td className="num"><strong>{money(m.final)}</strong></td><td className="num">{money(m.final / (m.dias || 1))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
            <td>Acumulado</td><td className="num">{sumar(lista, 'dias')}</td><td className="num">{sumar(lista, 'facturas')}</td><td className="num">{money(sumar(lista, 'vendido'))}</td><td className="num">{money(sumar(lista, 'efectivo'))}</td><td className="num">{money(sumar(lista, 'transferencia'))}</td><td className="num">{money(sumar(lista, 'ajuste'))}</td><td className="num">{money(sumar(lista, 'final'))}</td><td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Entregas() {
  const { state, api } = useStore();
  const accion = useAccion();
  const resumen = useResumenDias();
  const yo = usuarioActual(state);
  const ultima = [...state.entregasCaja].sort((a, b) => b.fechaHasta.localeCompare(a.fechaHasta))[0];
  const desdeSug = ultima ? sumarDias(ultima.fechaHasta, 1) : sumarDias(hoy(), -7);
  const [f, setF] = useState({ fechaDesde: desdeSug, fechaHasta: sumarDias(hoy(), -1), valorEntregado: '', recibidoPorId: '', observaciones: '' });
  const efectivoPeriodo = state.cierresDia.filter((c) => c.fecha >= f.fechaDesde && c.fecha <= f.fechaHasta).reduce((s, c) => s + c.totalEfectivo + c.ajusteManual, 0);
  const receptores = state.empleados.filter((e) => e.activo && ['JEFE', 'DESARROLLADOR', 'ADMIN'].includes(e.rol) && e.id !== yo.id);
  const guardar = async () => {
    if (await accion(() => api.crearEntregaCaja({ ...f, recibidoPorId: Number(f.recibidoPorId) }), 'Entrega registrada')) setF({ ...f, valorEntregado: '', observaciones: '' });
  };
  void resumen;
  return (
    <>
      <div className="card" data-navscope="" style={{ marginBottom: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', alignItems: 'end' }}>
          <Field label="Desde"><Input type="date" value={f.fechaDesde} onChange={(e) => setF({ ...f, fechaDesde: e.target.value })} /></Field>
          <Field label="Hasta"><Input type="date" value={f.fechaHasta} onChange={(e) => setF({ ...f, fechaHasta: e.target.value })} /></Field>
          <Field label="Valor entregado" hint={`Efectivo de días cerrados en el periodo: ${money(efectivoPeriodo)}`}><Input className="num" inputMode="numeric" value={f.valorEntregado} onChange={(e) => setF({ ...f, valorEntregado: e.target.value.replace(/\D/g, '') })} placeholder={String(efectivoPeriodo)} /></Field>
          <Field label="Recibe"><Select value={f.recibidoPorId} onChange={(e) => setF({ ...f, recibidoPorId: e.target.value })}><option value="">Escoge…</option>{receptores.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.rol})</option>)}</Select></Field>
          <Field label="Observaciones"><Input value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} onEnter={guardar} /></Field>
          <Btn variant="primary" icon={Plus} onClick={guardar}>Registrar entrega</Btn>
        </div>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Periodo</th><th className="num">Valor</th><th>Entregó</th><th>Recibió</th><th>Observaciones</th><th>Registrado</th></tr></thead>
          <tbody>
            {[...state.entregasCaja].reverse().map((e) => (
              <tr key={e.id}>
                <td>{fechaCorta(e.fechaDesde)} → {fechaCorta(e.fechaHasta)}</td><td className="num"><strong>{money(e.valorEntregado)}</strong></td>
                <td>{nombreEmpleado(state, e.entregadoPorId)}</td><td>{nombreEmpleado(state, e.recibidoPorId)}</td><td className="small">{e.observaciones || '—'}</td><td>{fechaCorta(e.creadoEn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
