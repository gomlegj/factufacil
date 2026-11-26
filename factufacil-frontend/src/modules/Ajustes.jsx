import { useMemo, useState } from 'react';
import { PackagePlus, PackageCheck, PackageMinus, Coffee, Save } from 'lucide-react';
import { useStore, nombreEmpleado } from '../store.jsx';
import { MODULOS } from '../permisos.js';
import { Autocomplete, Btn, Field, Input, PageHeader, useAccion, useAviso } from '../ui.jsx';
import { fechaHora, money } from '../utils.js';

const MOD = MODULOS.find((m) => m.id === 'ajustes');
export const TIPOS = [
  { id: 'INGRESO_EXISTENTE', label: 'Llegó mercancía', desc: 'Producto que ya existe', icon: PackageCheck, color: '#2f7d5b', signo: '+' },
  { id: 'INGRESO_NUEVO', label: 'Producto nuevo', desc: 'Crear y dar entrada', icon: PackagePlus, color: '#3b6b8c', signo: '+' },
  { id: 'DANO', label: 'Salida por daño', desc: 'Se rompió o venció', icon: PackageMinus, color: '#b83232', signo: '−' },
  { id: 'CONSUMO_INTERNO', label: 'Consumo interno', desc: 'Lo usó el negocio', icon: Coffee, color: '#b7791f', signo: '−' },
];
export const nombreTipo = (id) => TIPOS.find((t) => t.id === id)?.label ?? (id === 'CONTEO_FISICO' ? 'Inventario físico' : id);

export default function Ajustes() {
  const { state, api } = useStore();
  const accion = useAccion();
  const avisar = useAviso();
  const vacio = { tipo: 'INGRESO_EXISTENTE', productoId: null, productoTexto: '', cantidad: '', motivo: '', nuevo: { nombre: '', valorUnidad: '', categoria: '' } };
  const [f, setF] = useState(vacio);
  const tipo = TIPOS.find((t) => t.id === f.tipo);
  const productos = useMemo(() => state.productos.filter((p) => p.activo).map((p) => ({ id: p.id, label: p.nombre, sub: `hay ${p.cantidad}` })), [state.productos]);
  const cats = state.categorias.map((c) => ({ id: c.id, label: c.nombre }));
  const p = state.productos.find((x) => x.id === f.productoId);

  const guardar = async () => {
    const r = await accion(() => api.crearAjuste(f));
    if (r) {
      avisar(`Listo: ${r.nombre} quedó con ${r.cantidad} unidades`);
      setF({ ...vacio, tipo: f.tipo });
    }
  };
  const lista = [...state.ajustes].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 60);

  return (
    <>
      <PageHeader modulo={MOD} titulo="Ajustes de inventario" />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        {TIPOS.map((t) => (
          <button key={t.id} className="menu-btn" style={{ padding: 16, flexDirection: 'row', alignItems: 'center', outline: f.tipo === t.id ? `3px solid ${t.color}` : 'none' }} onClick={() => setF({ ...f, tipo: t.id })} aria-pressed={f.tipo === t.id}>
            <span className="menu-ico" style={{ width: 48, height: 48, background: t.color + '1a', color: t.color }}><t.icon size={26} /></span>
            <span><span style={{ fontWeight: 700, display: 'block' }}>{t.label}</span><span className="menu-d">{t.desc}</span></span>
          </button>
        ))}
      </div>
      <div className="card" data-navscope="" style={{ marginBottom: 20 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end' }}>
          {f.tipo === 'INGRESO_NUEVO' ? <>
            <Field label="Nombre del producto nuevo"><Input autoFocus value={f.nuevo.nombre} onChange={(e) => setF({ ...f, nuevo: { ...f.nuevo, nombre: e.target.value } })} /></Field>
            <Field label="Valor de venta (sin IVA)"><Input className="num" inputMode="numeric" value={f.nuevo.valorUnidad} onChange={(e) => setF({ ...f, nuevo: { ...f.nuevo, valorUnidad: e.target.value.replace(/\D/g, '') } })} /></Field>
            <Field label="Categoría"><Autocomplete value={f.nuevo.categoria} onText={(t) => setF({ ...f, nuevo: { ...f.nuevo, categoria: t } })} options={cats} onSelect={(o) => setF({ ...f, nuevo: { ...f.nuevo, categoria: o.label } })} allowNew onCreate={(t) => setF({ ...f, nuevo: { ...f.nuevo, categoria: t } })} /></Field>
          </> : (
            <Field label="Producto" hint={p ? `Hay ${p.cantidad} · ${money(p.valorUnidad)}` : 'Escribe y escoge con ↑ ↓ y Enter'}>
              <Autocomplete autoFocus value={f.productoTexto} onText={(t) => setF({ ...f, productoTexto: t, productoId: null })} options={productos} onSelect={(o) => setF({ ...f, productoId: o.id, productoTexto: o.label })} />
            </Field>
          )}
          <Field label={`Cantidad (${tipo.signo})`}><Input className="num" inputMode="numeric" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Motivo"><Input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} onEnter={guardar} placeholder="Ej: llegó el pedido" /></Field>
          <Btn variant="primary" icon={Save} onClick={guardar}>Guardar ajuste</Btn>
        </div>
      </div>
      <h3 style={{ fontSize: 17, marginBottom: 10 }}>Últimos movimientos</h3>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="num">Cantidad</th><th>Motivo</th><th>Empleado</th></tr></thead>
          <tbody>
            {lista.map((a) => {
              const entra = a.tipo.startsWith('INGRESO') || (a.tipo === 'CONTEO_FISICO' && a.cantidad > 0);
              return (
                <tr key={a.id}>
                  <td>{fechaHora(a.fecha)}</td>
                  <td>{state.productos.find((x) => x.id === a.productoId)?.nombre}</td>
                  <td>{nombreTipo(a.tipo)}</td>
                  <td className="num"><span className={`badge ${entra ? 'b-ok' : 'b-bad'}`}>{entra ? '+' : '−'}{Math.abs(a.cantidad)}</span></td>
                  <td className="small">{a.motivo}</td>
                  <td>{nombreEmpleado(state, a.empleadoId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
