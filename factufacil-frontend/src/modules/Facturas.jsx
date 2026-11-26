import { useMemo, useState } from 'react';
import { Printer, Pencil, Ban, History, Search } from 'lucide-react';
import { useStore, nombreCliente, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Btn, Field, Input, Modal, MotivoModal, PageHeader, useAccion, Vacio } from '../ui.jsx';
import { fechaHora, fechaDe, money, norm, sumarDias, hoy } from '../utils.js';
import FacturaVista from './FacturaVista.jsx';
import EditorFactura, { borradorDesdeFactura } from './EditorFactura.jsx';

const MOD = MODULOS.find((m) => m.id === 'facturas');

export default function Facturas() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [desde, setDesde] = useState(sumarDias(hoy(), -7));
  const [hasta, setHasta] = useState(hoy());
  const [limite, setLimite] = useState(50);
  const [verId, setVerId] = useState(null);

  const lista = useMemo(() => state.facturas
    .filter((f) => {
      const d = fechaDe(f.fecha);
      if (desde && d < desde) return false;
      if (hasta && d > hasta) return false;
      if (estado && f.estado !== estado) return false;
      if (empleado && f.empleadoId !== Number(empleado)) return false;
      if (q && !norm(f.numero).includes(norm(q)) && !norm(nombreCliente(state, f.clienteId)).includes(norm(q))) return false;
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha)), [state, q, estado, empleado, desde, hasta]);
  const total = lista.filter((f) => f.estado === 'ACTIVA').reduce((s, f) => s + f.total, 0);
  const ver = verId ? state.facturas.find((f) => f.id === verId) : null;

  return (
    <>
      <PageHeader modulo={MOD} />
      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
          <Field label="Buscar"><div style={{ position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-3)' }} /><input className="input" style={{ paddingLeft: 38 }} placeholder="Número o cliente" value={q} onChange={(e) => setQ(e.target.value)} /></div></Field>
          <Field label="Desde"><input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Hasta"><input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
          <Field label="Estado"><select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todas</option><option value="ACTIVA">Activas</option><option value="ANULADA">Anuladas</option></select></Field>
          <Field label="Empleado"><select className="input" value={empleado} onChange={(e) => setEmpleado(e.target.value)}><option value="">Todos</option>{state.empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Field>
        </div>
      </div>
      <div className="row small muted" style={{ marginBottom: 8 }}>
        <span>{lista.length} facturas · Total activas: <strong style={{ color: 'var(--text)' }}>{money(total)}</strong></span>
      </div>
      {lista.length ? (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Empleado</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {lista.slice(0, limite).map((f) => (
                <tr key={f.id} className="click" onClick={() => setVerId(f.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setVerId(f.id)}>
                  <td><strong>{f.numero}</strong></td>
                  <td>{fechaHora(f.fecha)}</td>
                  <td>{nombreCliente(state, f.clienteId)}</td>
                  <td>{nombreEmpleado(state, f.empleadoId)}</td>
                  <td className="num">{money(f.total)}</td>
                  <td>
                    {f.estado === 'ANULADA' ? <span className="badge b-bad">Anulada</span> : <span className="badge b-ok">Activa</span>}
                    {f.historial.some((h) => h.accion === 'MODIFICAR') && <span className="badge b-warn" style={{ marginLeft: 6 }}>Modificada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Vacio>No hay facturas con esos filtros.</Vacio>}
      {lista.length > limite && <div className="mt" style={{ textAlign: 'center' }}><Btn onClick={() => setLimite(limite + 50)}>Ver más</Btn></div>}
      {ver && <Detalle factura={ver} onClose={() => setVerId(null)} />}
    </>
  );
}

function Detalle({ factura, onClose }) {
  const { state, api } = useStore();
  const accion = useAccion();
  const [modo, setModo] = useState(null); // 'anular' | 'editar'
  const [draft, setDraft] = useState(null);
  const [motivo, setMotivo] = useState('');

  if (modo === 'editar') {
    const liberado = {};
    factura.items.forEach((it) => { liberado[it.productoId] = (liberado[it.productoId] || 0) + it.cantidad; });
    return (
      <Modal title={`Modificar ${factura.numero}`} icon={Pencil} color={MOD.color} width={1180} onClose={() => setModo(null)}>
        <EditorFactura draft={draft} onChange={setDraft} stockExtra={liberado} autoFocus={false} guardarLabel="Guardar cambios"
          onGuardar={async () => {
            if (!motivo.trim()) { accion(() => { throw new Error('Escribe el motivo del cambio.'); }); return; }
            if (await accion(() => api.modificarFactura(factura.id, draft, motivo), 'Factura modificada')) setModo(null);
          }}>
          <div className="card" style={{ padding: 16, borderColor: '#e0b44c' }}>
            <Field label="Motivo del cambio (obligatorio)">
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: se cobró mal la cantidad" nav={false} />
            </Field>
          </div>
        </EditorFactura>
      </Modal>
    );
  }

  return (
    <Modal title={`Factura ${factura.numero}`} icon={MOD.icono} color={MOD.color} width={720} onClose={onClose}
      footer={<>
        <Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn>
        <div className="spacer" />
        {factura.estado === 'ACTIVA' && <>
          <Btn variant="bad" icon={Ban} onClick={() => setModo('anular')}>Anular</Btn>
          <Btn variant="primary" icon={Pencil} onClick={() => { setDraft(borradorDesdeFactura(factura, state)); setMotivo(''); setModo('editar'); }}>Modificar</Btn>
        </>}
      </>}>
      <FacturaVista factura={factura} />
      <h3 className="mt" style={{ fontSize: 17, display: 'flex', gap: 8, alignItems: 'center' }}><History size={18} /> Historial de cambios</h3>
      {factura.historial.length ? (
        <div className="table-wrap mt">
          <table className="t">
            <thead><tr><th>Acción</th><th>Motivo</th><th>Quién</th><th>Cuándo</th></tr></thead>
            <tbody>
              {factura.historial.map((h, i) => (
                <tr key={i}>
                  <td><span className={`badge ${h.accion === 'ANULAR' ? 'b-bad' : h.accion === 'MODIFICAR' ? 'b-warn' : 'b-ok'}`}>{h.accion}</span></td>
                  <td>{h.motivo || '—'}{h.accion === 'MODIFICAR' && h.antes != null && <div className="small muted">Total: {money(h.antes)} → {money(h.despues)}</div>}</td>
                  <td>{nombreEmpleado(state, h.empleadoId)}</td>
                  <td>{fechaHora(h.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">Sin cambios desde que se creó.</p>}
      {modo === 'anular' && (
        <MotivoModal title={`Anular ${factura.numero}`} confirmar="Anular factura" texto="La factura no se borra: queda marcada como anulada y los productos vuelven al inventario."
          onClose={() => setModo(null)} onOk={async (m) => { if (await accion(() => api.anularFactura(factura.id, m), 'Factura anulada')) setModo(null); }} />
      )}
    </Modal>
  );
}
