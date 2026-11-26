import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStore, nombreEmpleado, nombreCategoria } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { PageHeader } from '../ui.jsx';
import { DIAS, fechaDe, hoy, money, nombreMes, pct, sumarDias } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'analitica');
// Paleta categórica validada (orden fijo, nunca rotado): azul, naranja, aqua, amarillo, magenta, verde.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];

// Barras horizontales de una sola serie: un solo color, valor como texto al lado.
function Barras({ datos, formato = money, destacar }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="bars" role="list">
      {datos.map((d) => (
        <div key={d.label} className="bar-row" role="listitem" title={`${d.label}: ${formato(d.valor)}${d.extra ? ' · ' + d.extra : ''}`}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: d.label === destacar ? 700 : 400 }}>{d.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.valor / max) * 100}%`, background: SERIES[0], opacity: d.label === destacar || !destacar ? 1 : 0.55, borderRadius: '0 4px 4px 0' }} /></div>
          <span className="right" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: d.label === destacar ? 700 : 400 }}>{formato(d.valor)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analitica() {
  const { state } = useStore();
  const [dias, setDias] = useState(30);
  const desde = sumarDias(hoy(), -dias + 1);
  const activas = useMemo(() => state.facturas.filter((f) => f.estado === 'ACTIVA'), [state.facturas]);
  const enRango = activas.filter((f) => fechaDe(f.fecha) >= desde);

  // Categoría que más se mueve (unidades)
  const porCat = {};
  enRango.forEach((f) => f.items.forEach((it) => {
    const p = state.productos.find((x) => x.id === it.productoId);
    const c = nombreCategoria(state, p?.categoriaId);
    porCat[c] = (porCat[c] || 0) + it.cantidad;
  }));
  const cats = Object.entries(porCat).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);

  // Día de la semana que más vende
  const porDia = Array(7).fill(0);
  enRango.forEach((f) => { porDia[new Date(f.fecha).getDay()] += f.total; });
  const diasDatos = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: DIAS[i], valor: porDia[i] }));
  const mejorDia = [...diasDatos].sort((a, b) => b.valor - a.valor)[0];

  // Mes actual vs anterior (mismo número de días transcurridos para comparar justo)
  const h = hoy();
  const mesAct = h.slice(0, 7);
  const dAnt = new Date(h + 'T12:00:00'); dAnt.setDate(1); dAnt.setMonth(dAnt.getMonth() - 1);
  const mesAnt = `${dAnt.getFullYear()}-${String(dAnt.getMonth() + 1).padStart(2, '0')}`;
  const diaDelMes = Number(h.slice(8, 10));
  const totalMes = (ym, hastaDia) => activas.filter((f) => { const d = fechaDe(f.fecha); return d.startsWith(ym) && Number(d.slice(8, 10)) <= hastaDia; }).reduce((s, f) => s + f.total, 0);
  const vAct = totalMes(mesAct, diaDelMes);
  const vAnt = totalMes(mesAnt, diaDelMes);
  const vAntCompleto = totalMes(mesAnt, 31);
  const variacion = vAnt ? ((vAct - vAnt) / vAnt) * 100 : 0;

  // Empleada que más vende
  const porEmp = {};
  enRango.forEach((f) => { porEmp[f.empleadoId] = (porEmp[f.empleadoId] || 0) + f.total; });
  const emps = Object.entries(porEmp).map(([id, valor]) => ({ label: nombreEmpleado(state, Number(id)), valor, extra: `${enRango.filter((f) => f.empleadoId === Number(id)).length} facturas` })).sort((a, b) => b.valor - a.valor);

  // Porcentaje de cada entidad por día (últimos 10 días con datos), sobre el valor entregado
  const entidades = state.entidades;
  const fechasEnt = [...new Set(state.conciliaciones.filter((c) => c.fecha >= desde).map((c) => c.fecha))].sort().slice(-10).reverse();

  const total = enRango.reduce((s, f) => s + f.total, 0);

  return (
    <>
      <PageHeader modulo={MOD}>
        {[7, 30, 90].map((n) => (
          <button key={n} className={`btn btn-sm ${dias === n ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDias(n)}>Últimos {n} días</button>
        ))}
      </PageHeader>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k">Vendido en {dias} días</div><div className="v">{money(total)}</div><div className="s">{enRango.length} facturas · promedio {money(enRango.length ? total / enRango.length : 0)}</div></div>
        <div className="stat"><div className="k">Mejor día de la semana</div><div className="v">{mejorDia.label}</div><div className="s">{money(mejorDia.valor)} en el periodo</div></div>
        <div className="stat"><div className="k">Categoría que más se mueve</div><div className="v">{cats[0]?.label ?? '—'}</div><div className="s">{cats[0]?.valor ?? 0} unidades</div></div>
        <div className="stat">
          <div className="k">Este mes vs. el anterior</div>
          <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {variacion >= 0 ? <TrendingUp size={24} color="var(--ok)" /> : <TrendingDown size={24} color="var(--bad)" />}
            {variacion >= 0 ? '+' : ''}{pct(variacion)}
          </div>
          <div className="s">{money(vAct)} vs. {money(vAnt)} (días 1 a {diaDelMes})</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Unidades vendidas por categoría</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Últimos {dias} días</p>
          <Barras datos={cats} formato={(v) => `${v} u.`} destacar={cats[0]?.label} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Ventas por día de la semana</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Suma de facturas activas, últimos {dias} días</p>
          <Barras datos={diasDatos} destacar={mejorDia.label} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Ventas por empleado</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Últimos {dias} días</p>
          <Barras datos={emps} destacar={emps[0]?.label} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 17 }}>Mes actual vs. mes anterior</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Hasta el día {diaDelMes} de cada mes</p>
          <Barras datos={[{ label: nombreMes(mesAct), valor: vAct }, { label: nombreMes(mesAnt), valor: vAnt }]} />
          <p className="small muted">{nombreMes(mesAnt)} completo: {money(vAntCompleto)}</p>
        </div>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 17 }}>Porcentaje de cada entidad por día</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Participación en el valor entregado del día (últimos días con cuadre)</p>
          <div className="row small" style={{ gap: 16, margin: '6px 0 12px' }}>
            {entidades.map((e, i) => <span key={e.id} className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: SERIES[i % SERIES.length] }} />{e.nombre}</span>)}
          </div>
          <div className="bars">
            {fechasEnt.map((f) => {
              const del = state.conciliaciones.filter((c) => c.fecha === f);
              const tot = del.reduce((s, c) => s + c.valorEntregado, 0) || 1;
              return (
                <div key={f} className="bar-row" style={{ gridTemplateColumns: '110px 1fr' }}>
                  <span>{new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <div style={{ display: 'flex', gap: 2, height: 24 }}>
                    {entidades.map((e, i) => {
                      const v = del.filter((c) => c.entidadId === e.id).reduce((s, c) => s + c.valorEntregado, 0);
                      if (!v) return null;
                      const p = (v / tot) * 100;
                      return (
                        <div key={e.id} title={`${e.nombre}: ${pct(p)} (${money(v)})`} style={{ width: `${p}%`, background: SERIES[i % SERIES.length], borderRadius: 4, color: '#fff', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', paddingLeft: 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {p >= 18 ? `${e.nombre} ${Math.round(p)} %` : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!fechasEnt.length && <div className="muted">No hay cuadres con entidades en el periodo.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
