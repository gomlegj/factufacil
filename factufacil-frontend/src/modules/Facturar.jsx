import { useEffect, useRef, useState } from 'react';
import { Plus, X, Printer, Receipt, FilePlus2 } from 'lucide-react';
import { useStore } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Modal, PageHeader, useAccion } from '../ui.jsx';
import { fechaLarga, hoy } from '../utils.js';
import EditorFactura, { borradorVacio } from './EditorFactura.jsx';
import FacturaVista from './FacturaVista.jsx';

const MOD = MODULOS.find((m) => m.id === 'facturar');
const CLAVE = 'factufacil-borradores';

function cargar() {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (Array.isArray(b?.lista) && b.lista.length) return b;
  } catch { /* nada */ }
  const primero = borradorVacio('Factura 1');
  return { lista: [primero], activa: primero.key, n: 1 };
}

export default function Facturar() {
  const { state, api } = useStore();
  const accion = useAccion();
  const [b, setB] = useState(cargar);
  const [hecha, setHecha] = useState(null);
  const [foco, setFoco] = useState(0); // fuerza autofocus al cambiar de pestaña
  const guardarRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(CLAVE, JSON.stringify(b)); } catch { /* nada */ } }, [b]);

  const actual = b.lista.find((x) => x.key === b.activa) || b.lista[0];
  const cambiar = (d) => setB((prev) => ({ ...prev, lista: prev.lista.map((x) => (x.key === d.key ? d : x)) }));
  const nueva = () => {
    const n = b.n + 1;
    const d = borradorVacio(`Factura ${n}`);
    setB({ lista: [...b.lista, d], activa: d.key, n });
    setFoco((f) => f + 1);
  };
  const cerrar = (key) => {
    const d = b.lista.find((x) => x.key === key);
    if (d.items.some((it) => it.productoId) && !window.confirm(`¿Cerrar "${d.nombre}" sin guardar?`)) return;
    let lista = b.lista.filter((x) => x.key !== key);
    let n = b.n;
    if (!lista.length) { n += 1; lista = [borradorVacio(`Factura ${n}`)]; }
    setB({ lista, activa: b.activa === key ? lista[lista.length - 1].key : b.activa, n });
  };
  const guardar = async () => {
    const f = await accion(() => api.crearFactura(actual));
    if (!f) return;
    setHecha(f);
    let lista = b.lista.filter((x) => x.key !== actual.key);
    let n = b.n;
    if (!lista.length) { n += 1; lista = [borradorVacio(`Factura ${n}`)]; }
    setB({ lista, activa: lista[lista.length - 1].key, n });
  };
  guardarRef.current = guardar;

  // F9 guarda, F2 abre otra factura
  useEffect(() => {
    const k = (e) => {
      if (hecha) return;
      if (e.key === 'F9') { e.preventDefault(); guardarRef.current(); }
      if (e.key === 'F2') { e.preventDefault(); nueva(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <>
      <PageHeader modulo={MOD} titulo="Facturar">
        <div className="small muted" style={{ textAlign: 'right' }}>
          <div style={{ textTransform: 'capitalize' }}>{fechaLarga(hoy())}</div>
          <div>N.º de factura: se asigna al guardar (siguiente FAC-{String(state.secuenciaFactura + 1).padStart(4, '0')})</div>
        </div>
      </PageHeader>

      <div className="fac-tabs" role="tablist">
        {b.lista.map((d) => (
          <div key={d.key} className={`fac-tab ${d.key === actual.key ? 'on' : ''}`} role="tab" aria-selected={d.key === actual.key}>
            <button style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }} onClick={() => { setB({ ...b, activa: d.key }); setFoco((f) => f + 1); }}>
              <Receipt size={16} />{d.nombre}{d.items.some((it) => it.productoId) && <span style={{ width: 8, height: 8, borderRadius: 9, background: '#2f7d5b' }} />}
            </button>
            <button className="icon-btn" style={{ padding: 2 }} aria-label={`Cerrar ${d.nombre}`} onClick={() => cerrar(d.key)}><X size={15} /></button>
          </div>
        ))}
        <button className="fac-tab" onClick={nueva} title="Otra factura al mismo tiempo (F2)"><Plus size={16} /> Otra factura</button>
        <div className="spacer" />
        <span className="small muted" style={{ alignSelf: 'center' }}>F2: otra factura · F9: guardar</span>
      </div>

      <EditorFactura key={actual.key + foco} draft={actual} onChange={cambiar} onGuardar={guardar} />

      {hecha && (
        <Modal title={`Factura ${hecha.numero} guardada`} icon={Receipt} color="var(--ok)" width={640} onClose={() => { setHecha(null); setFoco((f) => f + 1); }}
          footer={<>
            <Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn>
            <Btn variant="ok" icon={FilePlus2} autoFocus onClick={() => { setHecha(null); setFoco((f) => f + 1); }}>Nueva factura</Btn>
          </>}>
          <FacturaVista factura={hecha} />
        </Modal>
      )}
    </>
  );
}
