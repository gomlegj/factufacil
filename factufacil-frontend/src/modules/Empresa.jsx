import { useState } from 'react';
import { Save, ImagePlus, RotateCcw } from 'lucide-react';
import { useStore, MODO_SERVIDOR } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, PageHeader, useAccion, useAviso } from '../ui.jsx';

const MOD = MODULOS.find((m) => m.id === 'empresa');

export default function Empresa() {
  const { state, api } = useStore();
  const accion = useAccion();
  const avisar = useAviso();
  const [f, setF] = useState({ ...state.empresa });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const logo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) { avisar('La imagen debe pesar menos de 400 KB.', 'bad'); return; }
    const r = new FileReader();
    r.onload = () => setF((x) => ({ ...x, logo: r.result }));
    r.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader modulo={MOD} titulo="Datos del negocio" />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 640px)', gap: 18 }}>
        <div className="card" data-navscope="">
          <div className="row" style={{ marginBottom: 16 }}>
            <div style={{ width: 84, height: 84, borderRadius: 16, background: 'var(--surface-2)', border: '1px dashed var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {f.logo ? <img src={f.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={30} color="var(--text-3)" />}
            </div>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}><ImagePlus size={20} /> Cambiar logo<input type="file" accept="image/*" onChange={logo} style={{ display: 'none' }} /></label>
            {f.logo && <Btn size="sm" onClick={() => setF({ ...f, logo: '' })}>Quitar</Btn>}
          </div>
          <div className="grid">
            <Field label="Nombre del negocio"><Input value={f.nombre} onChange={set('nombre')} /></Field>
            <Field label="Dirección"><Input value={f.direccion} onChange={set('direccion')} /></Field>
            <div className="grid grid-2">
              <Field label="Celular"><Input value={f.celular} onChange={set('celular')} /></Field>
              <Field label="IVA (%)" hint="Aplica a todos los productos. Se cambia solo aquí."><Input className="num" inputMode="decimal" value={f.porcentajeIva} onChange={set('porcentajeIva')} /></Field>
            </div>
            <Btn variant="primary" icon={Save} data-nav="" onClick={() => accion(() => api.guardarEmpresa(f), 'Datos guardados')}>Guardar</Btn>
          </div>
        </div>
        {!MODO_SERVIDOR && <div className="card">
          <h3 style={{ fontSize: 17 }}>Datos de prueba</h3>
          <p className="muted">Este prototipo guarda la información en el navegador. Si quieres empezar de nuevo la demostración, restablece los datos de ejemplo.</p>
          <Btn icon={RotateCcw} onClick={() => { if (window.confirm('¿Borrar los cambios y volver a los datos de prueba? Tendrás que ingresar de nuevo.')) { localStorage.removeItem('factufacil-borradores'); api.reiniciarDatos(); } }}>Restablecer datos de prueba</Btn>
        </div>}
        {MODO_SERVIDOR && <div className="card small muted">Conectado al servidor: los datos se guardan en la base de datos.</div>}
      </div>
    </>
  );
}
