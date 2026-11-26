import { useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { useStore, usuarioActual, nombreEmpleado } from '../store.jsx';
import { MODULOS, ROLES } from '../permisos.js';
import { Btn, Field, Input, Select, Modal, PageHeader, Estado, useAccion } from '../ui.jsx';
import { fechaCorta } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'empleados');

export default function Empleados() {
  const { state, api } = useStore();
  const accion = useAccion();
  const yo = usuarioActual(state);
  const [editar, setEditar] = useState(null);
  return (
    <>
      <PageHeader modulo={MOD}>
        <Btn variant="primary" icon={Plus} onClick={() => setEditar('nuevo')}>Nuevo empleado</Btn>
      </PageHeader>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Cédula</th><th>Nombre</th><th>Cargo</th><th>Creado por</th><th>Desde</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {state.empleados.map((e) => (
              <tr key={e.id} className={e.activo ? '' : 'inactivo'}>
                <td>{e.cedula}</td>
                <td><strong>{e.nombre}</strong>{e.id === yo.id && <span className="badge b-neutral" style={{ marginLeft: 8 }}>Tú</span>}</td>
                <td><span className="badge b-neutral">{e.rol}</span></td>
                <td>{e.creadoPorId ? nombreEmpleado(state, e.creadoPorId) : '—'}</td>
                <td>{fechaCorta(e.creadoEn)}</td>
                <td><Estado activo={e.activo} /></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Editar" aria-label={`Editar ${e.nombre}`} onClick={() => setEditar(e)}><Pencil size={18} /></button>
                  {e.id !== yo.id && <button className="icon-btn" title={e.activo ? 'Desactivar' : 'Reactivar'} aria-label={e.activo ? 'Desactivar' : 'Reactivar'} onClick={() => accion(() => api.cambiarEstadoEmpleado(e.id), e.activo ? 'Empleado desactivado' : 'Empleado reactivado')}><Power size={18} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">Solo el jefe y el desarrollador crean empleados y asignan cargos. Nadie puede cambiar su propio cargo. Nada se borra: se desactiva.</p>
      {editar && <FormEmpleado empleado={editar === 'nuevo' ? null : editar} esYo={editar !== 'nuevo' && editar.id === yo.id} onClose={() => setEditar(null)} />}
    </>
  );
}

function FormEmpleado({ empleado, esYo, onClose }) {
  const { api } = useStore();
  const accion = useAccion();
  const [f, setF] = useState({ cedula: empleado?.cedula ?? '', nombre: empleado?.nombre ?? '', rol: empleado?.rol ?? 'EMPLEADO', password: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const guardar = async () => {
    const ok = empleado ? await accion(() => api.editarEmpleado(empleado.id, f), 'Empleado guardado') : await accion(() => api.crearEmpleado(f), 'Empleado creado');
    if (ok) onClose();
  };
  return (
    <Modal title={empleado ? 'Editar empleado' : 'Nuevo empleado'} icon={MOD.icono} color={MOD.color} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} data-nav="">Guardar</Btn></>}>
      <div className="grid">
        <Field label="Cédula" hint="Con ella ingresa al sistema"><Input autoFocus inputMode="numeric" value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Nombre completo"><Input value={f.nombre} onChange={set('nombre')} /></Field>
        <Field label="Cargo" hint={esYo ? 'No puedes cambiar tu propio cargo' : ''}>
          <Select value={f.rol} onChange={set('rol')} disabled={esYo}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        {!empleado && <Field label="Contraseña inicial" hint="Mínimo 4 caracteres. En el servidor se guarda cifrada (bcrypt)."><Input type="password" value={f.password} onChange={set('password')} onEnter={guardar} /></Field>}
      </div>
    </Modal>
  );
}
