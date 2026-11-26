import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useStore, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, PageHeader, Vacio } from '../ui.jsx';
import { fechaHora, norm, hoy } from '../utils.js';
import { descargarExcel } from '../excel.js';

const MOD = MODULOS.find((m) => m.id === 'auditoria');
const COLOR = { CREAR: 'b-ok', EDITAR: 'b-warn', DESACTIVAR: 'b-neutral', REACTIVAR: 'b-ok', ANULAR: 'b-bad', CERRAR: 'b-neutral', AJUSTAR: 'b-warn', INGRESAR: 'b-neutral' };

export default function Auditoria() {
  const { state } = useStore();
  const [tabla, setTabla] = useState('');
  const [accion, setAccion] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [q, setQ] = useState('');
  const tablas = [...new Set(state.auditoria.map((a) => a.tabla))].sort();
  const acciones = [...new Set(state.auditoria.map((a) => a.accion))].sort();
  const lista = useMemo(() => [...state.auditoria].reverse().filter((a) =>
    (!tabla || a.tabla === tabla) && (!accion || a.accion === accion) && (!empleado || a.empleadoId === Number(empleado)) && (!q || norm(a.detalle).includes(norm(q)))
  ), [state.auditoria, tabla, accion, empleado, q]);

  return (
    <>
      <PageHeader modulo={MOD} titulo="Registro de auditoría">
        <Btn icon={Download} onClick={() => descargarExcel(`auditoria_${hoy()}.xlsx`, 'Auditoría', lista.map((a) => ({ Fecha: fechaHora(a.fecha), Tabla: a.tabla, Acción: a.accion, Empleado: nombreEmpleado(state, a.empleadoId), Detalle: a.detalle })), [20, 18, 12, 20, 70])}>Excel</Btn>
      </PageHeader>
      <p className="muted" style={{ marginTop: -8 }}>Cada acción importante queda aquí: qué se hizo, quién y cuándo. No se puede editar ni borrar.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 14 }}>
        <Field label="Buscar"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Texto del detalle" /></Field>
        <Field label="Tabla"><select className="input" value={tabla} onChange={(e) => setTabla(e.target.value)}><option value="">Todas</option>{tablas.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Acción"><select className="input" value={accion} onChange={(e) => setAccion(e.target.value)}><option value="">Todas</option>{acciones.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Empleado"><select className="input" value={empleado} onChange={(e) => setEmpleado(e.target.value)}><option value="">Todos</option>{state.empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Field>
      </div>
      {lista.length ? (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Fecha</th><th>Acción</th><th>Tabla</th><th>Quién</th><th>Detalle</th></tr></thead>
            <tbody>
              {lista.slice(0, 200).map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(a.fecha)}</td>
                  <td><span className={`badge ${COLOR[a.accion] || 'b-neutral'}`}>{a.accion}</span></td>
                  <td className="small">{a.tabla}</td>
                  <td>{nombreEmpleado(state, a.empleadoId)}</td>
                  <td className="small">{a.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Vacio>No hay registros con esos filtros.</Vacio>}
    </>
  );
}
