// Editor de factura: lo usan "Facturar" (nueva) y "Ver facturas" (modificar).
// Flujo de Enter: cliente → cantidad → producto → valor unidad → (fila nueva) … →
// producto vacío salta a pagos → efectivo → transferencia → entrega → guardar.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Plus, Banknote, Smartphone, UserPlus, X, AlertTriangle } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Autocomplete, Btn, Field, Input } from '../ui.jsx';
import { calcularTotales, money, num } from '../utils.js';
import { FormCliente } from './Clientes.jsx';

let contador = 0;
export const filaVacia = () => ({ k: `f${Date.now()}${contador++}`, cantidad: '1', productoId: null, productoTexto: '', valorUnidad: '' });
export const borradorVacio = (nombre) => ({ key: `b${Date.now()}${contador++}`, nombre, clienteId: null, clienteTexto: '', items: [filaVacia()], efectivo: '', transferencia: '', entregado: '' });

export function borradorDesdeFactura(f, state) {
  return {
    key: 'edit' + f.id, nombre: f.numero,
    clienteId: f.clienteId, clienteTexto: f.clienteId ? state.clientes.find((c) => c.id === f.clienteId)?.nombre ?? '' : '',
    items: [...f.items.map((it) => ({ k: `f${contador++}`, cantidad: String(it.cantidad), productoId: it.productoId, productoTexto: it.nombre, valorUnidad: String(it.valorUnidad) })), filaVacia()],
    efectivo: String(f.pagos.efectivo), transferencia: String(f.pagos.transferencia), entregado: f.pagos.efectivo ? String(f.entregado) : '',
  };
}

export default function EditorFactura({ draft, onChange, onGuardar, guardarLabel = 'Guardar factura', stockExtra = {}, autoFocus = true, children }) {
  const { state } = useStore();
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const refs = useRef({});
  const pendiente = useRef(null);
  const efectivoRef = useRef(null);
  const guardarRef = useRef(null);

  useLayoutEffect(() => {
    if (pendiente.current) {
      const el = refs.current[pendiente.current];
      pendiente.current = null;
      el?.focus(); el?.select?.();
    }
  });

  const set = (patch) => onChange({ ...draft, ...patch });
  const setItem = (k, patch) => set({ items: draft.items.map((it) => (it.k === k ? { ...it, ...patch } : it)) });

  const productos = useMemo(() => state.productos.filter((p) => p.activo).map((p) => ({
    id: p.id, label: p.nombre, sub: `${money(p.valorUnidad)} · hay ${p.cantidad + (stockExtra[p.id] || 0)}`,
  })), [state.productos, stockExtra]);
  const clientes = useMemo(() => state.clientes.filter((c) => c.activo).map((c) => ({ id: c.id, label: c.nombre, sub: c.documento })), [state.clientes]);

  const validos = draft.items.filter((it) => it.productoId);
  const t = calcularTotales(validos, state.empresa.porcentajeIva);
  const ef = num(draft.efectivo), tr = num(draft.transferencia);
  const entregado = draft.entregado === '' ? null : num(draft.entregado);
  const devuelve = entregado == null ? 0 : entregado - ef;

  // Cantidad vendida por producto (para avisar si no alcanza)
  const pedido = {};
  validos.forEach((it) => { pedido[it.productoId] = (pedido[it.productoId] || 0) + num(it.cantidad); });
  const sinStock = (it) => {
    if (!it.productoId) return false;
    const p = state.productos.find((x) => x.id === it.productoId);
    return pedido[it.productoId] > p.cantidad + (stockExtra[it.productoId] || 0);
  };

  const avisos = [];
  if (validos.some((it) => num(it.cantidad) < 1 || !Number.isInteger(num(it.cantidad)))) avisos.push('Cada cantidad debe ser 1 o más.');
  if (validos.some(sinStock)) avisos.push('Hay productos sin suficientes unidades.');
  if (ef > t.total) avisos.push('El efectivo es mayor que el total.');
  if (tr > t.total) avisos.push('La transferencia es mayor que el total.');
  if (validos.length && (draft.efectivo !== '' || draft.transferencia !== '') && ef + tr !== t.total)
    avisos.push(`Efectivo + transferencia debe dar ${money(t.total)} (faltan ${money(t.total - ef - tr)}).`);
  if (entregado != null && ef > 0 && entregado < ef) avisos.push('Lo que entrega el cliente no alcanza.');
  const listo = validos.length > 0 && ef + tr === t.total && avisos.length === 0;

  const agregarFilaYEnfocar = () => {
    const f = filaVacia();
    pendiente.current = 'c-' + f.k;
    set({ items: [...draft.items, f] });
  };

  const quitarFila = (k) => {
    const items = draft.items.filter((it) => it.k !== k);
    set({ items: items.length ? items : [filaVacia()] });
  };

  const pagarTodo = (medio) => {
    set(medio === 'ef' ? { efectivo: String(t.total), transferencia: '0' } : { efectivo: '0', transferencia: String(t.total), entregado: '' });
  };

  return (
    <div className="fac-grid" data-navscope="">
      <div className="grid" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Field label="Cliente (opcional)" style={{ flex: '1 1 260px' }}>
              <Autocomplete
                value={draft.clienteTexto}
                onText={(v) => set({ clienteTexto: v, clienteId: null })}
                options={clientes}
                onSelect={(o) => set({ clienteId: o.id, clienteTexto: o.label })}
                allowNew onCreate={(txt) => setNuevoCliente(txt)}
                placeholder="Escribe el nombre o déjalo vacío"
                autoFocus={autoFocus}
                inputClass={draft.clienteId ? 'cliente-ok' : ''}
              />
            </Field>
            {draft.clienteId
              ? <Btn size="sm" icon={X} onClick={() => set({ clienteId: null, clienteTexto: '' })}>Quitar</Btn>
              : <Btn size="sm" icon={UserPlus} onClick={() => setNuevoCliente(draft.clienteTexto || '')}>Nuevo</Btn>}
          </div>
          {draft.clienteTexto && !draft.clienteId && <div className="hint">Escoge un cliente de la lista, o créalo. Si lo dejas así, la factura sale sin cliente.</div>}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="table-wrap" style={{ border: 'none', overflow: 'visible' }}>
            <table className="t items-t">
              <thead><tr><th style={{ width: 90 }}>Cant.</th><th>Producto</th><th className="num" style={{ width: 130 }}>Valor unidad</th><th className="num" style={{ width: 120 }}>Total</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {draft.items.map((it, i) => {
                  const ultima = i === draft.items.length - 1;
                  return (
                    <tr key={it.k}>
                      <td>
                        <Input ref={(el) => { refs.current['c-' + it.k] = el; }} className="num" inputMode="numeric" value={it.cantidad} aria-label="Cantidad"
                          onChange={(e) => setItem(it.k, { cantidad: e.target.value.replace(/\D/g, '') })}
                          style={num(it.cantidad) < 1 && it.productoId ? { borderColor: 'var(--bad)' } : undefined} />
                      </td>
                      <td>
                        <Autocomplete
                          ref={(el) => { refs.current['p-' + it.k] = el; }}
                          value={it.productoTexto}
                          onText={(v) => setItem(it.k, { productoTexto: v, productoId: null })}
                          options={productos}
                          onSelect={(o) => {
                            const p = state.productos.find((x) => x.id === o.id);
                            setItem(it.k, { productoId: p.id, productoTexto: p.nombre, valorUnidad: String(p.valorUnidad) });
                          }}
                          onEnterEmpty={() => {
                            if (validos.length) { efectivoRef.current?.focus(); efectivoRef.current?.select(); }
                          }}
                          placeholder={i === 0 ? 'Escribe el producto' : ultima && validos.length ? 'Otro producto, o Enter para pagar' : ''}
                        />
                        {sinStock(it) && <div className="small" style={{ color: 'var(--bad)', marginTop: 3 }}>No hay suficientes unidades</div>}
                      </td>
                      <td>
                        <Input className="num" inputMode="numeric" value={it.valorUnidad} aria-label="Valor unidad"
                          onChange={(e) => setItem(it.k, { valorUnidad: e.target.value.replace(/\D/g, '') })}
                          onEnter={(e) => { if (ultima) { if (it.productoId) agregarFilaYEnfocar(); } else { refs.current['c-' + draft.items[i + 1].k]?.focus(); refs.current['c-' + draft.items[i + 1].k]?.select(); } void e; }} />
                      </td>
                      <td className="num"><strong>{money(num(it.cantidad) * num(it.valorUnidad))}</strong></td>
                      <td>{(it.productoId || draft.items.length > 1) && <button className="icon-btn" tabIndex={-1} aria-label="Quitar fila" title="Quitar" onClick={() => quitarFila(it.k)}><Trash2 size={18} /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Btn size="sm" icon={Plus} onClick={agregarFilaYEnfocar} tabIndex={-1}>Agregar fila</Btn>
          <span className="small muted" style={{ marginLeft: 10 }}>Tip: usa ↑ ↓ y Enter para escoger. Enter en un producto vacío pasa a los pagos.</span>
        </div>
        {children}
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card totales">
          <div className="lin"><span className="muted">Subtotal (sin IVA)</span><span>{money(t.subtotal)}</span></div>
          <div className="lin"><span className="muted">IVA ({state.empresa.porcentajeIva} %)</span><span>{money(t.iva)}</span></div>
          <div className="lin big"><span>Total</span><span>{money(t.total)}</span></div>
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <strong>¿Cómo paga?</strong>
            <div className="spacer" />
            <Btn size="sm" icon={Banknote} tabIndex={-1} onClick={() => pagarTodo('ef')} disabled={!t.total}>Todo efectivo</Btn>
            <Btn size="sm" icon={Smartphone} tabIndex={-1} onClick={() => pagarTodo('tr')} disabled={!t.total}>Todo transf.</Btn>
          </div>
          <div className="grid">
            <Field label="Efectivo" hint={draft.efectivo === '' && t.total ? 'Enter en vacío = todo en efectivo' : ''}>
              <Input ref={efectivoRef} className="num" inputMode="numeric" value={draft.efectivo} placeholder="0"
                onChange={(e) => set({ efectivo: e.target.value.replace(/\D/g, '') })}
                onEnter={() => {
                  if (draft.efectivo === '' && t.total) set({ efectivo: String(Math.max(t.total - tr, 0)), transferencia: draft.transferencia === '' ? '0' : draft.transferencia });
                  const n = refs.current.tr; n?.focus(); n?.select();
                }} />
            </Field>
            <Field label="Transferencia">
              <Input ref={(el) => { refs.current.tr = el; }} className="num" inputMode="numeric" value={draft.transferencia} placeholder="0"
                onChange={(e) => set({ transferencia: e.target.value.replace(/\D/g, '') })}
                onEnter={() => {
                  if (draft.transferencia === '' && t.total) set({ transferencia: String(Math.max(t.total - ef, 0)) });
                  const n = ef > 0 ? refs.current.ent : guardarRef.current;
                  n?.focus(); n?.select?.();
                }} />
            </Field>
          </div>
        </div>

        <div className="box-cambio">
          <strong style={{ display: 'block', marginBottom: 8 }}>Cambio (solo efectivo)</strong>
          <Field label="Entrega el cliente">
            <Input ref={(el) => { refs.current.ent = el; }} className="num" inputMode="numeric" value={draft.entregado} placeholder={ef ? String(ef) : '0'} disabled={!ef}
              onChange={(e) => set({ entregado: e.target.value.replace(/\D/g, '') })}
              onEnter={() => guardarRef.current?.focus()} />
          </Field>
          <div className="row" style={{ marginTop: 10, alignItems: 'baseline' }}>
            <span className="muted">Devuelve</span>
            <div className="spacer" />
            <span className="dev" style={devuelve < 0 ? { color: 'var(--bad)' } : undefined}>{money(Math.max(devuelve, 0))}</span>
          </div>
        </div>

        {avisos.length > 0 && (
          <div className="alert warn" role="alert"><AlertTriangle size={20} style={{ flexShrink: 0 }} /><div>{avisos.map((a) => <div key={a}>{a}</div>)}</div></div>
        )}
        <Btn ref={guardarRef} variant="ok" size="lg" disabled={!listo} onClick={onGuardar} data-nav="">{guardarLabel}</Btn>
      </div>

      {nuevoCliente !== null && (
        <FormCliente inicial={nuevoCliente} onClose={() => setNuevoCliente(null)}
          onCreado={(id, nombre) => set({ clienteId: id, clienteTexto: nombre })} />
      )}
    </div>
  );
}
