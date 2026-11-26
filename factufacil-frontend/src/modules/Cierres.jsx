import { useState } from 'react';
import { Sun, Moon, CalendarCheck, Lock, History } from 'lucide-react';
import { useStore, usuarioActual, nombreEmpleado, ventasTurno, facturasActivasDe } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, Select, PageHeader, Tabs, useAccion, Vacio } from '../ui.jsx';
import { money, hoy, fechaLarga, fechaCorta, num, sumarDias } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'cierres');

export default function Cierres() {
  const [tab, setTab] = useState('turno');
  return (
    <>
      <PageHeader modulo={MOD} titulo="Cerrar caja" />
      <Tabs value={tab} onChange={setTab} color={MOD.color} tabs={[
        { id: 'turno', label: 'Cierre de turno', icon: Sun },
        { id: 'dia', label: 'Cierre del día', icon: CalendarCheck },
        { id: 'hist', label: 'Turnos cerrados', icon: History },
      ]} />
      {tab === 'turno' && <CierreTurno />}
      {tab === 'dia' && <CierreDia />}
      {tab === 'hist' && <Historial />}
    </>
  );
}

function Diferencia({ valor }) {
  if (valor === 0) return <div className="alert ok" style={{ fontSize: 18, fontWeight: 700 }}>✔ La caja cuadra exacto</div>;
  if (valor > 0) return <div className="alert warn" style={{ fontSize: 18, fontWeight: 700 }}>Sobran {money(valor)}</div>;
  return <div className="alert bad" style={{ fontSize: 18, fontWeight: 700 }}>Faltan {money(-valor)}</div>;
}

function CierreTurno() {
  const { state, api } = useStore();
  const accion = useAccion();
  const yo = usuarioActual(state);
  const turnoSugerido = new Date().getHours() < 14 ? 'MAÑANA' : 'TARDE';
  const inicial = { fecha: hoy(), turno: turnoSugerido, empleadoEntregaId: '', empleadoRecibeId: String(yo.id), valorEfectivo: '', valorTransferencia: '', gastos: '', coordinadoraValor: '', ganaValor: '', observaciones: '' };
  const [f, setF] = useState(inicial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setNum = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '') });

  const ventas = ventasTurno(state, f.fecha, f.turno);
  const ya = state.cierresTurno.find((c) => c.fecha === f.fecha && c.turno === f.turno);
  const contado = num(f.valorEfectivo) + num(f.valorTransferencia) + num(f.gastos);
  const dif = contado - ventas.total;
  const empleados = state.empleados.filter((e) => e.activo);

  const guardar = async () => {
    const ok = await accion(() => api.crearCierreTurno({ ...f, empleadoEntregaId: Number(f.empleadoEntregaId), empleadoRecibeId: Number(f.empleadoRecibeId) }), `Turno de la ${f.turno.toLowerCase()} cerrado`);
    if (ok) setF({ ...inicial, turno: f.turno === 'MAÑANA' ? 'TARDE' : 'MAÑANA' });
  };

  return (
    <div className="fac-grid" data-navscope="">
      <div className="card">
        <div className="grid grid-2">
          <Field label="Fecha"><Input type="date" value={f.fecha} onChange={set('fecha')} /></Field>
          <Field label="Turno">
            <div className="row">
              {['MAÑANA', 'TARDE'].map((t) => (
                <Btn key={t} variant={f.turno === t ? 'primary' : 'ghost'} icon={t === 'MAÑANA' ? Sun : Moon} onClick={() => setF({ ...f, turno: t })} style={{ flex: 1 }}>{t === 'MAÑANA' ? 'Mañana' : 'Tarde'}</Btn>
              ))}
            </div>
          </Field>
          <Field label="Entrega la caja"><Select value={f.empleadoEntregaId} onChange={set('empleadoEntregaId')}><option value="">Escoge…</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></Field>
          <Field label="Recibe y cierra"><Select value={f.empleadoRecibeId} onChange={set('empleadoRecibeId')}><option value="">Escoge…</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></Field>
        </div>
        <h3 className="mt" style={{ fontSize: 17 }}>¿Cuánto hay?</h3>
        <div className="grid grid-3 mt">
          <Field label="Efectivo contado"><Input className="num" inputMode="numeric" value={f.valorEfectivo} onChange={setNum('valorEfectivo')} placeholder="0" /></Field>
          <Field label="Transferencias"><Input className="num" inputMode="numeric" value={f.valorTransferencia} onChange={setNum('valorTransferencia')} placeholder={String(ventas.transferencia)} /></Field>
          <Field label="Gastos pagados de la caja"><Input className="num" inputMode="numeric" value={f.gastos} onChange={setNum('gastos')} placeholder="0" /></Field>
          <Field label="Coordinadora (si aplica)"><Input className="num" inputMode="numeric" value={f.coordinadoraValor} onChange={setNum('coordinadoraValor')} placeholder="0" /></Field>
          <Field label="Gana (si aplica)"><Input className="num" inputMode="numeric" value={f.ganaValor} onChange={setNum('ganaValor')} placeholder="0" /></Field>
        </div>
        <Field label="Observaciones" style={{ marginTop: 14 }}><Input value={f.observaciones} onChange={set('observaciones')} onEnter={guardar} placeholder="Opcional" /></Field>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <div className="card totales">
          <div className="small muted" style={{ marginBottom: 6 }}>Según el sistema ({ventas.cantidad} facturas de la {f.turno.toLowerCase()})</div>
          <div className="lin"><span>Ventas en efectivo</span><span>{money(ventas.efectivo)}</span></div>
          <div className="lin"><span>Ventas por transferencia</span><span>{money(ventas.transferencia)}</span></div>
          <div className="lin big"><span>Debe haber</span><span>{money(ventas.total)}</span></div>
          <div className="lin" style={{ marginTop: 8 }}><span>Contado + gastos</span><span>{money(contado)}</span></div>
          <div className="lin"><span>Total en caja (efectivo + transf.)</span><span>{money(num(f.valorEfectivo) + num(f.valorTransferencia))}</span></div>
        </div>
        {(f.valorEfectivo !== '' || f.valorTransferencia !== '') && <Diferencia valor={dif} />}
        {ya && <div className="alert warn"><Lock size={18} /> Ese turno ya se cerró ({money(ya.valorTotal)}).</div>}
        <Btn variant="ok" size="lg" icon={Lock} onClick={guardar} disabled={!!ya} data-nav="">Cerrar turno</Btn>
        <div className="small muted">Las facturas antes de las 2:00 p. m. son de la mañana; después, de la tarde.</div>
      </div>
    </div>
  );
}

function CierreDia() {
  const { state, api } = useStore();
  const accion = useAccion();
  const [fecha, setFecha] = useState(hoy());
  const turnos = state.cierresTurno.filter((c) => c.fecha === fecha);
  const cerrado = state.cierresDia.find((c) => c.fecha === fecha);
  const facturas = facturasActivasDe(state, fecha);
  const suma = (k) => turnos.reduce((s, c) => s + c[k], 0);
  const novedades = state.novedades.filter((n) => n.activo && n.fecha === fecha);
  const pendientes = state.cierresTurno.length ? [...new Set(state.cierresTurno.map((c) => c.fecha))].filter((d) => !state.cierresDia.some((c) => c.fecha === d)).sort() : [];

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <Field label="Día"><input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Btn size="sm" onClick={() => setFecha(sumarDias(fecha, -1))} style={{ alignSelf: 'flex-end' }}>‹ Anterior</Btn>
        <Btn size="sm" onClick={() => setFecha(sumarDias(fecha, 1))} style={{ alignSelf: 'flex-end' }}>Siguiente ›</Btn>
        <div className="spacer" />
        {pendientes.length > 0 && <div className="alert warn small">Días con turnos sin cerrar el día: {pendientes.map((d) => <button key={d} className="icon-btn" style={{ padding: '0 4px', color: '#8a5a12', textDecoration: 'underline' }} onClick={() => setFecha(d)}>{fechaCorta(d)}</button>)}</div>}
      </div>
      <h2 style={{ fontSize: 20, textTransform: 'capitalize', marginBottom: 12 }}>{fechaLarga(fecha)}</h2>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="k">Vendido (facturas)</div><div className="v">{money(facturas.reduce((s, f) => s + f.total, 0))}</div><div className="s">{facturas.length} facturas</div></div>
        <div className="stat"><div className="k">Efectivo en turnos</div><div className="v">{money(suma('valorEfectivo'))}</div></div>
        <div className="stat"><div className="k">Transferencias</div><div className="v">{money(suma('valorTransferencia'))}</div></div>
        <div className="stat"><div className="k">Gastos</div><div className="v">{money(suma('gastos'))}</div><div className="s">Novedades del día: {money(novedades.reduce((s, n) => s + n.valor, 0))}</div></div>
        <div className="stat"><div className="k">Sobrante</div><div className="v" style={{ color: suma('sobra') ? 'var(--warn)' : undefined }}>{money(suma('sobra'))}</div></div>
        <div className="stat"><div className="k">Faltante</div><div className="v" style={{ color: suma('falta') ? 'var(--bad)' : undefined }}>{money(suma('falta'))}</div></div>
      </div>
      {turnos.length ? (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="t">
            <thead><tr><th>Turno</th><th>Entregó</th><th>Recibió</th><th className="num">Efectivo</th><th className="num">Transf.</th><th className="num">Gastos</th><th className="num">Sobra</th><th className="num">Falta</th><th className="num">Coordinadora</th><th className="num">Gana</th></tr></thead>
            <tbody>
              {['MAÑANA', 'TARDE'].map((t) => {
                const c = turnos.find((x) => x.turno === t);
                if (!c) return <tr key={t}><td><strong>{t}</strong></td><td colSpan={9} className="muted">Sin cerrar</td></tr>;
                return (
                  <tr key={t}>
                    <td><strong>{t}</strong></td><td>{nombreEmpleado(state, c.empleadoEntregaId)}</td><td>{nombreEmpleado(state, c.empleadoRecibeId)}</td>
                    <td className="num">{money(c.valorEfectivo)}</td><td className="num">{money(c.valorTransferencia)}</td><td className="num">{money(c.gastos)}</td>
                    <td className="num">{c.sobra ? <span className="badge b-warn">{money(c.sobra)}</span> : '—'}</td>
                    <td className="num">{c.falta ? <span className="badge b-bad">{money(c.falta)}</span> : '—'}</td>
                    <td className="num">{money(c.coordinadoraValor)}</td><td className="num">{money(c.ganaValor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Vacio>No hay turnos cerrados ese día.</Vacio>}
      {cerrado
        ? <div className="alert ok mt"><Lock size={18} /> Día cerrado por {nombreEmpleado(state, cerrado.cerradoPorId)}.{cerrado.ajusteManual !== 0 && <> Ajuste manual: {money(cerrado.ajusteManual)} ({cerrado.motivoAjuste}).</>}</div>
        : <Btn variant="ok" size="lg" icon={CalendarCheck} className="mt" disabled={!turnos.length} onClick={() => accion(() => api.cerrarDia(fecha), 'Día cerrado')}>Cerrar el día</Btn>}
    </>
  );
}

function Historial() {
  const { state } = useStore();
  const lista = [...state.cierresTurno].sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.turno < b.turno ? 1 : -1)).slice(0, 60);
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>Fecha</th><th>Turno</th><th>Entregó → Recibió</th><th className="num">Sistema</th><th className="num">En caja</th><th className="num">Gastos</th><th>Diferencia</th><th>Observaciones</th></tr></thead>
        <tbody>
          {lista.map((c) => (
            <tr key={c.id}>
              <td>{fechaCorta(c.fecha)}</td><td>{c.turno}</td>
              <td>{nombreEmpleado(state, c.empleadoEntregaId)} → {nombreEmpleado(state, c.empleadoRecibeId)}</td>
              <td className="num">{money(c.ventasSistema)}</td><td className="num">{money(c.valorTotal)}</td><td className="num">{money(c.gastos)}</td>
              <td>{c.sobra ? <span className="badge b-warn">Sobra {money(c.sobra)}</span> : c.falta ? <span className="badge b-bad">Falta {money(c.falta)}</span> : <span className="badge b-ok">Cuadra</span>}</td>
              <td className="small">{c.observaciones || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
