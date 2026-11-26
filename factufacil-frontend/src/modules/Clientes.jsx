import { useMemo, useState } from 'react';
import { Plus, Pencil, Power, Search } from 'lucide-react';
import { useStore } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, Modal, PageHeader, Estado, useAccion, Vacio } from '../ui.jsx';
import { norm } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'clientes');

export default function Clientes() {
  const { state, api } = useStore();
  const accion = useAccion();
  const [q, setQ] = useState('');
  const [editar, setEditar] = useState(null);
  const lista = useMemo(() => state.clientes
    .filter((c) => !q || norm(c.nombre).includes(norm(q)) || norm(c.documento).includes(norm(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre)), [state.clientes, q]);
  const compras = (id) => state.facturas.filter((f) => f.clienteId === id && f.estado === 'ACTIVA').length;

  return (
    <>
      <PageHeader modulo={MOD}>
        <Btn variant="primary" icon={Plus} onClick={() => setEditar('nuevo')}>Nuevo cliente</Btn>
      </PageHeader>
      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 14 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-3)' }} />
        <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar por nombre o documento" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Documento</th><th>Nombre</th><th>Correo</th><th className="num">Compras</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} className={c.activo ? '' : 'inactivo'}>
                <td>{c.documento}</td>
                <td><strong>{c.nombre}</strong></td>
                <td>{c.correo || <span className="muted">—</span>}</td>
                <td className="num">{compras(c.id)}</td>
                <td><Estado activo={c.activo} /></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" aria-label={`Editar ${c.nombre}`} title="Editar" onClick={() => setEditar(c)}><Pencil size={18} /></button>
                  <button className="icon-btn" aria-label={c.activo ? 'Desactivar' : 'Reactivar'} title={c.activo ? 'Desactivar' : 'Reactivar'} onClick={() => accion(() => api.cambiarEstadoCliente(c.id), c.activo ? 'Cliente desactivado' : 'Cliente reactivado')}><Power size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lista.length && <Vacio>No hay clientes con ese dato.</Vacio>}
      <p className="small muted">Solo guardamos los datos necesarios (Ley 1581 de 2012). En la factura el cliente es opcional.</p>
      {editar && <FormCliente cliente={editar === 'nuevo' ? null : editar} onClose={() => setEditar(null)} />}
    </>
  );
}

export function FormCliente({ cliente, inicial, onClose, onCreado }) {
  const { api } = useStore();
  const accion = useAccion();
  const [f, setF] = useState({ documento: cliente?.documento ?? '', nombre: cliente?.nombre ?? inicial ?? '', correo: cliente?.correo ?? '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const guardar = async () => {
    const r = cliente ? await accion(() => api.editarCliente(cliente.id, f), 'Cliente guardado') : await accion(() => api.crearCliente(f), 'Cliente creado');
    if (r) { onCreado?.(r, f.nombre.trim()); onClose(); }
  };
  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} icon={MOD.icono} color={MOD.color} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} data-nav="">Guardar</Btn></>}>
      <div className="grid">
        <Field label="Documento" hint="Cédula, NIT o pasaporte. Puede tener letras."><Input autoFocus={!inicial} value={f.documento} onChange={set('documento')} /></Field>
        <Field label="Nombre"><Input autoFocus={!!inicial} value={f.nombre} onChange={set('nombre')} /></Field>
        <Field label="Correo (opcional)"><Input type="email" value={f.correo} onChange={set('correo')} onEnter={guardar} /></Field>
        <div className="small muted">Al guardar, la persona autoriza el uso de sus datos solo para facturar.</div>
      </div>
    </Modal>
  );
}
