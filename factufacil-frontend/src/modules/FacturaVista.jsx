// Factura en formato A5, legible aunque tenga muchos productos.
import { useStore, nombreEmpleado } from '../store.jsx';
import { fechaHora, money } from '../utils.js';

export default function FacturaVista({ factura }) {
  const { state } = useStore();
  const e = state.empresa;
  const cliente = factura.clienteId ? state.clientes.find((c) => c.id === factura.clienteId) : null;
  const muchos = factura.items.length > 18;
  return (
    <div className="print-area">
      <div className="factura-print" style={muchos ? { fontSize: 10.5 } : undefined}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: 6 }}>
          {e.logo && <img src={e.logo} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{e.nombre}</div>
            <div>{e.direccion}</div>
            <div>Cel. {e.celular}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{factura.numero}</div>
            <div>{fechaHora(factura.fecha)}</div>
            {factura.estado === 'ANULADA' && <div style={{ color: '#b00', fontWeight: 800, fontSize: 14 }}>ANULADA</div>}
          </div>
        </div>
        <div style={{ margin: '6px 0' }}>
          <strong>Cliente:</strong> {cliente ? `${cliente.nombre} — ${cliente.documento}` : 'Consumidor final'}<br />
          <strong>Atendió:</strong> {nombreEmpleado(state, factura.empleadoId)}
        </div>
        <table>
          <thead><tr><th className="n">Cant.</th><th>Producto</th><th className="n">V. unidad</th><th className="n">Total</th></tr></thead>
          <tbody>
            {factura.items.map((it, i) => (
              <tr key={i}><td className="n">{it.cantidad}</td><td>{it.nombre}</td><td className="n">{money(it.valorUnidad)}</td><td className="n">{money(it.valorTotal)}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <div><strong>Pago</strong></div>
            {factura.pagos.efectivo > 0 && <div>Efectivo: {money(factura.pagos.efectivo)}</div>}
            {factura.pagos.transferencia > 0 && <div>Transferencia: {money(factura.pagos.transferencia)}</div>}
            {factura.pagos.efectivo > 0 && <div>Entregó: {money(factura.entregado)} · Devuelta: {money(factura.devuelto)}</div>}
          </div>
          <table style={{ width: 'auto', minWidth: '45%' }}>
            <tbody>
              <tr><td>Subtotal</td><td className="n">{money(factura.subtotal)}</td></tr>
              <tr><td>IVA</td><td className="n">{money(factura.iva)}</td></tr>
              <tr><td><strong>TOTAL</strong></td><td className="n" style={{ fontSize: 15 }}><strong>{money(factura.total)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div className="leyenda">Documento de control interno. No reemplaza la factura electrónica de la DIAN.</div>
        <div style={{ textAlign: 'center', marginTop: 4 }}>¡Gracias por su compra!</div>
      </div>
    </div>
  );
}
