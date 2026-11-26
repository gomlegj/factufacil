package co.edu.itm.factufacil.web;

import co.edu.itm.factufacil.domain.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Objetos que entran y salen de la API. Tienen la misma forma (camelCase) que usa
 * el prototipo React, para que la interfaz cambie de datos locales a la API sin rehacer pantallas.
 */
public final class Dto {
    private Dto() {}

    // ---------- Entradas ----------
    public record Login(String cedula, String password) {}
    public record Refresh(String refreshToken) {}
    public record EmpresaIn(String nombre, String direccion, String celular, String logo, BigDecimal porcentajeIva) {}
    public record EmpleadoIn(String cedula, String nombre, String rol, String password) {}
    public record ProductoIn(String nombre, BigDecimal valorUnidad, Integer cantidad, String categoria) {}
    public record PedidoLinea(Long productoId, Integer cantidad) {}
    public record ClienteIn(String documento, String nombre, String correo) {}
    public record ItemIn(Long productoId, Integer cantidad, BigDecimal valorUnidad) {}
    public record FacturaIn(Long clienteId, List<ItemIn> items, BigDecimal efectivo, BigDecimal transferencia, BigDecimal entregado, String motivo) {}
    public record Motivo(String motivo) {}
    public record NovedadIn(LocalDate fecha, String descripcion, BigDecimal valor) {}
    public record CierreTurnoIn(LocalDate fecha, String turno, Long empleadoEntregaId, Long empleadoRecibeId,
                                BigDecimal valorEfectivo, BigDecimal valorTransferencia, BigDecimal gastos,
                                BigDecimal coordinadoraValor, BigDecimal ganaValor, String observaciones) {}
    public record CerrarDiaIn(LocalDate fecha) {}
    public record AjusteDiaIn(BigDecimal valor, String motivo) {}
    public record EntregaIn(LocalDate fechaDesde, LocalDate fechaHasta, BigDecimal valorEntregado, Long recibidoPorId, String observaciones) {}
    public record EntidadIn(String nombre, Boolean requiereTipoPago) {}
    public record ConciliacionIn(Long entidadId, LocalDate fecha, String tipoPago, BigDecimal valorEntregado, BigDecimal valorGanancia) {}
    public record ProductoNuevoIn(String nombre, BigDecimal valorUnidad, String categoria) {}
    public record AjusteIn(Long productoId, ProductoNuevoIn nuevo, String tipo, Integer cantidad, String motivo) {}
    public record ConteoLinea(Long productoId, Integer contado) {}

    // ---------- Salidas ----------
    public record EmpleadoOut(Long id, String cedula, String nombre, String rol, boolean activo, Long creadoPorId, LocalDateTime creadoEn) {
        public static EmpleadoOut de(Empleado e) {
            return new EmpleadoOut(e.getId(), e.getCedula(), e.getNombre(), e.getRol().getNombre(), e.isActivo(), e.getCreadoPorId(), e.getCreadoEn());
        }
    }
    public record Sesion(String accessToken, String refreshToken, long expiraEnSegundos, EmpleadoOut empleado) {}
    public record EmpresaOut(String nombre, String direccion, String celular, String logo, BigDecimal porcentajeIva) {
        public static EmpresaOut de(EmpresaConfig c) {
            return new EmpresaOut(c.getNombre(), c.getDireccion(), c.getCelular(), c.getLogo() == null ? "" : c.getLogo(), c.getPorcentajeIva());
        }
    }
    public record ItemOut(Long productoId, String nombre, int cantidad, BigDecimal valorUnidad, BigDecimal valorTotal) {}
    public record Pagos(BigDecimal efectivo, BigDecimal transferencia) {}
    public record HistorialOut(String accion, String motivo, Long empleadoId, LocalDateTime fecha, BigDecimal antes, BigDecimal despues) {}
    public record FacturaOut(Long id, String numero, LocalDateTime fecha, Long clienteId, Long empleadoId, List<ItemOut> items,
                             BigDecimal subtotal, BigDecimal iva, BigDecimal total, Pagos pagos, BigDecimal entregado,
                             BigDecimal devuelto, String estado, List<HistorialOut> historial) {
        public static FacturaOut de(Factura f) {
            BigDecimal ef = BigDecimal.ZERO, tr = BigDecimal.ZERO;
            for (FacturaPago p : f.getPagos()) {
                if ("EFECTIVO".equals(p.getMedioPago())) ef = ef.add(p.getValor()); else tr = tr.add(p.getValor());
            }
            return new FacturaOut(f.getId(), f.getNumero(), f.getFecha(), f.getClienteId(), f.getEmpleadoId(),
                    f.getItems().stream().map(i -> new ItemOut(i.getProductoId(), i.getNombreProducto(), i.getCantidad(), i.getValorUnidad(), i.getValorTotal())).toList(),
                    f.getSubtotal(), f.getIva(), f.getTotal(), new Pagos(ef, tr), f.getEntregado(), f.getDevuelto(), f.getEstado(),
                    f.getHistorial().stream().map(h -> new HistorialOut(h.getAccion(), h.getMotivo(), h.getEmpleadoId(), h.getFecha(), h.getTotalAntes(), h.getTotalDespues())).toList());
        }
    }
    public record AuditoriaOut(Long id, String tabla, Long registroId, String accion, Long empleadoId, String detalle, LocalDateTime fecha) {
        public static AuditoriaOut de(LogAuditoria l) {
            return new AuditoriaOut(l.getId(), l.getTabla(), l.getRegistroId(), l.getAccion(), l.getEmpleadoId(), l.getDetalle(), l.getFecha());
        }
    }
    public record PedidoOut(Long id, Long creadoPorId, String estado, LocalDateTime creadoEn, List<PedidoLinea> detalle) {
        public static PedidoOut de(Pedido p) {
            return new PedidoOut(p.getId(), p.getCreadoPorId(), p.getEstado(), p.getCreadoEn(),
                    p.getDetalle().stream().map(d -> new PedidoLinea(d.getProductoId(), d.getCantidadNecesaria())).toList());
        }
    }

    /** Todo lo que la interfaz necesita al iniciar sesión (misma forma que el estado del prototipo). */
    public record Estado(EmpresaOut empresa, List<EmpleadoOut> empleados, List<Categoria> categorias, List<Producto> productos,
                         List<Cliente> clientes, List<FacturaOut> facturas, long secuenciaFactura, List<Novedad> novedades,
                         List<CierreTurno> cierresTurno, List<CierreDia> cierresDia, List<EntregaCaja> entregasCaja,
                         List<Entidad> entidades, List<EntidadConciliacion> conciliaciones, List<AjusteInventario> ajustes,
                         List<PedidoOut> pedidos, List<AuditoriaOut> auditoria) {}
}
