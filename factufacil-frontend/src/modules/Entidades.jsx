import { useState } from 'react';
import { Plus, Power, HandCoins, Building2 } from 'lucide-react';
import { useStore, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, Select, PageHeader, Tabs, Estado, useAccion, Vacio } from '../ui.jsx';
import { money, hoy, fechaCorta, num, pct } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'entidades');

export default function Entidades() {
  const [tab, setTab] = useState('conc');
  return (
    <>
      <PageHeader modulo={MOD} />
      <Tabs value={tab} onChange={setTab} color={MOD.color} tabs={[
        { id: 'conc', label: 'Cuadre diario', icon: HandCoins },
        { id: 'lista', label: 'Entidades', icon: Building2 },
      ]} />
      {tab === 'conc' ? <Conciliaciones /> : <Lista />}
    </>
  );
}

function Conciliaciones() {
  const { state, api } = useStore();
  const accion = useAccion();
  const activas = state.entidades.filter((e) => e.activo);
  const inicial = { entidadId: String(activas[0]?.id ?? ''), fecha: hoy(), valorEntregado: '', valorGanancia: '', tipoPago: '' };
  const [f, setF] = useState(inicial);
  const ent = state.entidades.find((e) => e.id === Number(f.entidadId));
  const ve = num(f.valorEntregado), vg = num(f.valorGanancia);
  const porcentaje = ve + vg > 0 ? (vg / (ve + vg)) * 100 : 0;
  const guardar = async () => {
    if (await accion(() => api.crearConciliacion({ ...f, entidadId: Number(f.entidadId) }), 'Cuadre guardado')) setF({ ...inicial, entidadId: f.entidadId, fecha: f.fecha });
  };
  const lista = [...state.conciliaciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id).slice(0, 80);

  return (
    <>
      <div className="card" data-navscope="" style={{ marginBottom: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
          <Field label="Entidad"><Select value={f.entidadId} onChange={(e) => setF({ ...f, entidadId: e.target.value, tipoPago: '' })}>{activas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></Field>
          <Field label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
          {ent?.requiereTipoPago && (
            <Field label="Tipo de pago"><Select value={f.tipoPago} onChange={(e) => setF({ ...f, tipoPago: e.target.value })}><option value="">Escoge…</option><option value="ESTABLECIMIENTO">En el establecimiento</option><option value="CONTRAENTREGA">Contra entrega</option></Select></Field>
          )}
          <Field label="Valor entregado"><Input className="num" inputMode="numeric" value={f.valorEntregado} onChange={(e) => setF({ ...f, valorEntregado: e.target.value.replace(/\D/g, '') })} placeholder="0" /></Field>
          <Field label="Ganancia"><Input className="num" inputMode="numeric" value={f.valorGanancia} onChange={(e) => setF({ ...f, valorGanancia: e.target.value.replace(/\D/g, '') })} onEnter={guardar} placeholder="0" /></Field>
          <div className="stat" style={{ padding: '8px 14px', boxShadow: 'none' }}><div className="k">% ganancia</div><div className="v" style={{ fontSize: 22 }}>{pct(porcentaje)}</div></div>
          <Btn variant="primary" icon={Plus} onClick={guardar}>Guardar</Btn>
        </div>
        <div className="small muted mt">% ganancia = ganancia ÷ (entregado + ganancia). Puedes guardar días en cero.</div>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Fecha</th><th>Entidad</th><th>Tipo de pago</th><th className="num">Entregado</th><th className="num">Ganancia</th><th className="num">%</th><th>Registró</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{fechaCorta(c.fecha)}</td>
                <td><strong>{state.entidades.find((e) => e.id === c.entidadId)?.nombre}</strong></td>
                <td>{c.tipoPago === 'ESTABLECIMIENTO' ? 'Establecimiento' : c.tipoPago === 'CONTRAENTREGA' ? 'Contra entrega' : '—'}</td>
                <td className="num">{money(c.valorEntregado)}</td><td className="num">{money(c.valorGanancia)}</td><td className="num">{pct(c.porcentajeGanancia)}</td>
                <td>{nombreEmpleado(state, c.empleadoId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Lista() {
  const { state, api } = useStore();
  const accion = useAccion();
  const [f, setF] = useState({ nombre: '', requiereTipoPago: false });
  const guardar = async () => { if (await accion(() => api.crearEntidad(f), 'Entidad creada')) setF({ nombre: '', requiereTipoPago: false }); };
  return (
    <>
      <div className="card row" data-navscope="" style={{ marginBottom: 16, alignItems: 'flex-end' }}>
        <Field label="Nueva entidad" style={{ flex: '1 1 240px' }}><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} onEnter={guardar} placeholder="Ej: Efecty" /></Field>
        <label className="row small" style={{ gap: 6, minHeight: 46 }}><input type="checkbox" checked={f.requiereTipoPago} onChange={(e) => setF({ ...f, requiereTipoPago: e.target.checked })} /> Maneja tipo de pago (establecimiento / contra entrega)</label>
        <Btn variant="primary" icon={Plus} onClick={guardar}>Crear</Btn>
      </div>
      {state.entidades.length ? (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Entidad</th><th>Tipo de pago</th><th className="num">Cuadres</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {state.entidades.map((e) => (
                <tr key={e.id} className={e.activo ? '' : 'inactivo'}>
                  <td><strong>{e.nombre}</strong></td><td>{e.requiereTipoPago ? 'Sí' : 'No'}</td>
                  <td className="num">{state.conciliaciones.filter((c) => c.entidadId === e.id).length}</td>
                  <td><Estado activo={e.activo} /></td>
                  <td className="right"><button className="icon-btn" aria-label={e.activo ? 'Desactivar' : 'Reactivar'} title={e.activo ? 'Desactivar' : 'Reactivar'} onClick={() => accion(() => api.cambiarEstadoEntidad(e.id), e.activo ? 'Entidad desactivada' : 'Entidad reactivada')}><Power size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Vacio>No hay entidades.</Vacio>}
    </>
  );
}
