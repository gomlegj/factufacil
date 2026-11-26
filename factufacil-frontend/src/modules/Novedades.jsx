import { useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useStore, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, PageHeader, useAccion, Vacio } from '../ui.jsx';
import { money, hoy, fechaCorta } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'novedades');

export default function Novedades() {
  const { state, api } = useStore();
  const accion = useAccion();
  const vacio = { fecha: hoy(), descripcion: '', valor: '' };
  const [f, setF] = useState(vacio);
  const [verInactivas, setVerInactivas] = useState(false);
  const guardar = async () => { if (await accion(() => api.crearNovedad(f), 'Novedad guardada')) setF(vacio); };
  const lista = state.novedades.filter((n) => verInactivas || n.activo).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  return (
    <>
      <PageHeader modulo={MOD} />
      <div className="card" data-navscope="" style={{ marginBottom: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', alignItems: 'end' }}>
          <Field label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
          <Field label="¿Qué pasó?" style={{ gridColumn: 'span 2' }}><Input autoFocus value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej: pago del agua" /></Field>
          <Field label="Valor"><Input className="num" inputMode="numeric" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value.replace(/\D/g, '') })} onEnter={guardar} placeholder="0" /></Field>
          <Btn variant="primary" icon={Plus} onClick={guardar}>Guardar</Btn>
        </div>
      </div>
      <label className="row small muted" style={{ gap: 6, marginBottom: 10 }}><input type="checkbox" checked={verInactivas} onChange={(e) => setVerInactivas(e.target.checked)} /> Ver desactivadas</label>
      {lista.length ? (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Fecha</th><th>Descripción</th><th className="num">Valor</th><th>Registró</th><th></th></tr></thead>
            <tbody>
              {lista.map((n) => (
                <tr key={n.id} className={n.activo ? '' : 'inactivo'}>
                  <td>{fechaCorta(n.fecha)}</td><td>{n.descripcion}</td><td className="num">{money(n.valor)}</td><td>{nombreEmpleado(state, n.empleadoId)}</td>
                  <td className="right"><button className="icon-btn" title={n.activo ? 'Desactivar' : 'Reactivar'} aria-label={n.activo ? 'Desactivar' : 'Reactivar'} onClick={() => accion(() => api.cambiarEstadoNovedad(n.id), n.activo ? 'Novedad desactivada' : 'Novedad reactivada')}><Power size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Vacio>No hay novedades.</Vacio>}
    </>
  );
}
