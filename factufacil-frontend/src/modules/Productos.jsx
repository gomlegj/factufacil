import { useMemo, useRef, useState } from 'react';
import { Plus, Download, Pencil, Power, Search, ClipboardList, ScanLine, Upload, PackageX, List } from 'lucide-react';
import { useStore, usuarioActual, nombreCategoria } from '../store.jsx';
import { MODULOS, veAgotados } from '../permisos.js';
import { Btn, Field, Input, Autocomplete, Modal, PageHeader, Tabs, Estado, useAccion, useAviso, Vacio } from '../ui.jsx';
import { money, norm, num, hoy } from '../utils.js';
import { descargarExcel, leerExcel } from '../excel.js';

const MOD = MODULOS.find((m) => m.id === 'productos');

export default function Productos() {
  const { state } = useStore();
  const u = usuarioActual(state);
  const gestion = veAgotados(u.rol);
  const [tab, setTab] = useState('lista');
  const tabs = [
    { id: 'lista', label: 'Productos', icon: List },
    { id: 'pedido', label: 'Hacer pedido', icon: ClipboardList },
    ...(gestion ? [{ id: 'fisico', label: 'Inventario físico', icon: ScanLine }] : []),
  ];
  return (
    <>
      <PageHeader modulo={MOD} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} color={MOD.color} />
      {tab === 'lista' && <Lista gestion={gestion} />}
      {tab === 'pedido' && <Pedido />}
      {tab === 'fisico' && <InventarioFisico />}
    </>
  );
}

function Lista({ gestion }) {
  const { state, api } = useStore();
  const accion = useAccion();
  const [q, setQ] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [editar, setEditar] = useState(null); // null | 'nuevo' | producto
  const [verAgotados, setVerAgotados] = useState(false);

  const lista = useMemo(() => state.productos
    .filter((p) => (verInactivos || p.activo) && (!q || norm(p.nombre).includes(norm(q)) || norm(nombreCategoria(state, p.categoriaId)).includes(norm(q))))
    .sort((a, b) => a.nombre.localeCompare(b.nombre)), [state, q, verInactivos]);
  const agotados = state.productos.filter((p) => p.activo && p.cantidad <= 0);

  const excel = () => descargarExcel(`productos_${hoy()}.xlsx`, 'Productos', lista.map((p) => ({
    Producto: p.nombre, Categoría: nombreCategoria(state, p.categoriaId), 'Valor unidad': p.valorUnidad, Cantidad: p.cantidad, Estado: p.activo ? 'Activo' : 'Inactivo',
  })), [32, 20, 14, 10, 10]);

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar producto o categoría" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="row small muted" style={{ gap: 6 }}><input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos</label>
        <div className="spacer" />
        {gestion && agotados.length > 0 && <Btn icon={PackageX} onClick={() => setVerAgotados(true)} style={{ color: 'var(--bad)' }}>Agotados ({agotados.length})</Btn>}
        <Btn icon={Download} onClick={excel}>Excel</Btn>
        <Btn variant="primary" icon={Plus} onClick={() => setEditar('nuevo')}>Nuevo producto</Btn>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Producto</th><th>Categoría</th><th className="num">Valor unidad</th><th className="num">Cantidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className={p.activo ? '' : 'inactivo'}>
                <td><strong>{p.nombre}</strong></td>
                <td>{nombreCategoria(state, p.categoriaId)}</td>
                <td className="num">{money(p.valorUnidad)}</td>
                <td className="num">
                  {p.cantidad <= 0 ? <span className="badge b-bad">Agotado</span> : p.cantidad <= 5 ? <span className="badge b-warn">{p.cantidad}</span> : p.cantidad}
                </td>
                <td><Estado activo={p.activo} /></td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Editar" aria-label={`Editar ${p.nombre}`} onClick={() => setEditar(p)}><Pencil size={18} /></button>
                  {gestion && <button className="icon-btn" title={p.activo ? 'Desactivar' : 'Reactivar'} aria-label={p.activo ? 'Desactivar' : 'Reactivar'} onClick={() => accion(() => api.cambiarEstadoProducto(p.id), p.activo ? 'Producto desactivado' : 'Producto reactivado')}><Power size={18} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lista.length && <Vacio>No hay productos con ese nombre.</Vacio>}
      <p className="small muted">La cantidad se cambia en <strong>Ajustes</strong> (entradas, daños, consumo) o vendiendo. Así queda registro de cada movimiento.</p>

      {editar && <FormProducto producto={editar === 'nuevo' ? null : editar} onClose={() => setEditar(null)} />}
      {verAgotados && (
        <Modal title="Productos agotados" icon={PackageX} color="var(--bad)" onClose={() => setVerAgotados(false)} footer={<Btn onClick={() => setVerAgotados(false)}>Cerrar</Btn>}>
          <ul style={{ fontSize: 17, lineHeight: 1.8, margin: 0 }}>{agotados.map((p) => <li key={p.id}>{p.nombre}</li>)}</ul>
        </Modal>
      )}
    </>
  );
}

function FormProducto({ producto, onClose }) {
  const { state, api } = useStore();
  const accion = useAccion();
  const [f, setF] = useState({
    nombre: producto?.nombre ?? '',
    valorUnidad: producto?.valorUnidad ?? '',
    cantidad: producto?.cantidad ?? '',
    categoria: producto ? nombreCategoria(state, producto.categoriaId) : '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cats = state.categorias.filter((c) => c.activo).map((c) => ({ id: c.id, label: c.nombre }));
  const guardar = async () => {
    const ok = producto
      ? await accion(() => api.editarProducto(producto.id, f), 'Producto guardado')
      : await accion(() => api.crearProducto(f), 'Producto creado');
    if (ok) onClose();
  };
  return (
    <Modal title={producto ? 'Editar producto' : 'Nuevo producto'} icon={MOD.icono} color={MOD.color} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} data-nav="">Guardar</Btn></>}>
      <div className="grid">
        <Field label="Nombre"><Input autoFocus value={f.nombre} onChange={set('nombre')} /></Field>
        <div className="grid grid-2">
          <Field label="Valor unidad (sin IVA)"><Input className="num" inputMode="numeric" value={f.valorUnidad} onChange={set('valorUnidad')} /></Field>
          <Field label="Cantidad" hint={producto ? 'Se cambia en Ajustes' : 'Unidades que hay hoy'}>
            <Input className="num" inputMode="numeric" value={f.cantidad} onChange={set('cantidad')} disabled={!!producto} />
          </Field>
        </div>
        <Field label="Categoría" hint="Usa ↑ ↓ y Enter para escoger, o escribe una nueva">
          <Autocomplete value={f.categoria} onText={(t) => setF({ ...f, categoria: t })} options={cats}
            onSelect={(o) => setF({ ...f, categoria: o.label })} allowNew onCreate={(t) => setF({ ...f, categoria: t })} placeholder="Escoge la categoría" />
        </Field>
      </div>
    </Modal>
  );
}

function Pedido() {
  const { state, api } = useStore();
  const accion = useAccion();
  const [cant, setCant] = useState({});
  const [q, setQ] = useState('');
  const productos = state.productos.filter((p) => p.activo).sort((a, b) => a.cantidad - b.cantidad || a.nombre.localeCompare(b.nombre));
  const visibles = productos.filter((p) => !q || norm(p.nombre).includes(norm(q)));
  const lineas = productos.filter((p) => num(cant[p.id]) > 0);
  const sugerir = () => {
    const n = {};
    productos.forEach((p) => { if (p.cantidad <= 5) n[p.id] = String(12 - p.cantidad); });
    setCant(n);
  };
  const descargar = async () => {
    const ok = await accion(() => api.crearPedido(lineas.map((p) => ({ productoId: p.id, cantidad: cant[p.id] }))), 'Pedido guardado y descargado');
    if (!ok) return;
    descargarExcel(`pedido_${hoy()}.xlsx`, 'Pedido', lineas.map((p) => ({ Producto: p.nombre, 'Cantidad a pedir': num(cant[p.id]) })), [34, 16]);
    setCant({});
  };
  return (
    <>
      <div className="alert info" style={{ marginBottom: 14 }}>Escribe cuántas unidades necesitas de cada producto y descarga el Excel para el proveedor. Los que tienen poco aparecen primero.</div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn onClick={sugerir}>Sugerir para los que tienen 5 o menos</Btn>
        <div className="spacer" />
        <Btn variant="primary" icon={Download} disabled={!lineas.length} onClick={descargar}>Descargar pedido ({lineas.length})</Btn>
      </div>
      <div className="table-wrap" data-navscope="">
        <table className="t">
          <thead><tr><th>Producto</th><th className="num">Hay</th><th className="num" style={{ width: 160 }}>Pedir</th></tr></thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td className="num">{p.cantidad <= 0 ? <span className="badge b-bad">0</span> : p.cantidad}</td>
                <td><Input className="num" inputMode="numeric" value={cant[p.id] ?? ''} onChange={(e) => setCant({ ...cant, [p.id]: e.target.value.replace(/\D/g, '') })} placeholder="0" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InventarioFisico() {
  const { state, api } = useStore();
  const accion = useAccion();
  const avisar = useAviso();
  const fileRef = useRef(null);
  const [carga, setCarga] = useState(null); // [{productoId, nombre, sistema, contado}]

  const plantilla = () => descargarExcel(`inventario_fisico_${hoy()}.xlsx`, 'Inventario', state.productos.filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => ({
    Código: p.id, Producto: p.nombre, Categoría: nombreCategoria(state, p.categoriaId), 'Cantidad en sistema': p.cantidad, 'Cantidad contada': '',
  })), [8, 32, 20, 18, 18]);

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const filas = await leerExcel(file);
      const lineas = [];
      for (const f of filas) {
        const id = num(f['Código'] ?? f['Codigo']);
        const p = state.productos.find((x) => x.id === id);
        const c = f['Cantidad contada'];
        if (!p || c === '' || c == null) continue;
        lineas.push({ productoId: p.id, nombre: p.nombre, sistema: p.cantidad, contado: Math.max(0, Math.round(num(c))) });
      }
      if (!lineas.length) { avisar('No encontramos cantidades contadas en el archivo. Revisa que uses la plantilla.', 'bad'); return; }
      setCarga(lineas);
    } catch {
      avisar('No se pudo leer el archivo. Debe ser un Excel (.xlsx).', 'bad');
    }
  };
  const conDiferencia = carga?.filter((l) => l.contado !== l.sistema) ?? [];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid grid-2">
        <div className="card">
          <h3>1. Descarga la plantilla</h3>
          <p className="muted">Trae todos los productos con la cantidad que dice el sistema y una columna vacía para escribir lo que cuentes.</p>
          <Btn variant="primary" icon={Download} onClick={plantilla}>Descargar plantilla</Btn>
        </div>
        <div className="card">
          <h3>2. Cuenta y llena la hoja</h3>
          <p className="muted" style={{ marginBottom: 0 }}>Imprímela y anota a mano, o llénala en el celular. Si la llenaste en papel, puedes <strong>escanearla</strong> con la app de Excel del celular (opción “Insertar datos desde imagen”) o con Microsoft Lens, que la convierte en Excel. Revisa los números antes de subirla.</p>
        </div>
        <div className="card">
          <h3>3. Sube el archivo</h3>
          <p className="muted">El sistema compara lo contado con lo que hay y te muestra las diferencias antes de aplicar.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={subir} style={{ display: 'none' }} />
          <Btn icon={Upload} onClick={() => fileRef.current?.click()}>Subir Excel diligenciado</Btn>
        </div>
      </div>
      {carga && (
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <h3>Resultado del conteo</h3>
            <span className="badge b-neutral">{carga.length} contados</span>
            <span className={`badge ${conDiferencia.length ? 'b-warn' : 'b-ok'}`}>{conDiferencia.length} con diferencia</span>
            <div className="spacer" />
            <Btn onClick={() => setCarga(null)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!conDiferencia.length} onClick={async () => {
              const n = await accion(() => api.aplicarConteo(carga));
              if (n !== false) { avisar(`Inventario corregido en ${n} productos`); setCarga(null); }
            }}>Aplicar correcciones</Btn>
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Producto</th><th className="num">Sistema</th><th className="num">Contado</th><th className="num">Diferencia</th></tr></thead>
              <tbody>
                {carga.map((l) => {
                  const d = l.contado - l.sistema;
                  return (
                    <tr key={l.productoId}>
                      <td>{l.nombre}</td><td className="num">{l.sistema}</td><td className="num">{l.contado}</td>
                      <td className="num">{d === 0 ? <span className="badge b-ok">Cuadra</span> : <span className={`badge ${d > 0 ? 'b-warn' : 'b-bad'}`}>{d > 0 ? '+' : ''}{d}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
