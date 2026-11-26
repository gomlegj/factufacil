package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Facturación: crear (con número consecutivo atómico), modificar y anular con motivo. */
@Service
@RequiredArgsConstructor
@Transactional
public class FacturaService {
    static final String SECUENCIA = "FACTURA";

    private final FacturaRepo facturas;
    private final ProductoRepo productos;
    private final ClienteRepo clientes;
    private final SecuenciaRepo secuencias;
    private final EmpresaConfigRepo empresa;
    private final Sesion sesion;

    /** Resultado de validar un borrador: líneas, totales y pagos ya calculados. */
    private record Calculo(List<FacturaDetalle> items, Map<Long, Integer> porProducto, BigDecimal subtotal, BigDecimal iva,
                           BigDecimal total, BigDecimal efectivo, BigDecimal transferencia, BigDecimal entregado) {}

    public Dto.FacturaOut crear(Dto.FacturaIn in) {
        Empleado yo = sesion.actual();
        Calculo c = calcular(in, Map.of());
        c.porProducto().forEach((pid, cant) -> { Producto p = productos.findById(pid).orElseThrow(); p.setCantidad(p.getCantidad() - cant); });

        Secuencia s = secuencias.bloquear(SECUENCIA).orElseGet(() -> secuencias.save(new Secuencia(SECUENCIA, 0)));
        s.setValor(s.getValor() + 1);

        Factura f = new Factura();
        f.setNumero("FAC-" + String.format("%04d", s.getValor()));
        f.setFecha(LocalDateTime.now());
        f.setEmpleadoId(yo.getId());
        aplicar(f, in, c);
        FacturaHistorial h = historial(f, "CREAR", null, null, null);
        f.getHistorial().add(h);
        facturas.save(f);
        sesion.registrar("facturas", f.getId(), "CREAR", "Facturó " + f.getNumero() + " por " + Num.fmt(f.getTotal()));
        return Dto.FacturaOut.de(f);
    }

    public Dto.FacturaOut modificar(Long id, Dto.FacturaIn in) {
        if (Num.vacio(in.motivo())) throw new NegocioException("El motivo es obligatorio.");
        Factura f = facturas.findById(id).orElseThrow(() -> NegocioException.noExiste("la factura"));
        if ("ANULADA".equals(f.getEstado())) throw new NegocioException("Una factura anulada no se puede modificar.");
        Map<Long, Integer> liberado = new HashMap<>();
        f.getItems().forEach(i -> liberado.merge(i.getProductoId(), i.getCantidad(), Integer::sum));
        Calculo c = calcular(in, liberado);
        // devolver lo vendido antes y descontar lo nuevo
        liberado.forEach((pid, cant) -> { Producto p = productos.findById(pid).orElseThrow(); p.setCantidad(p.getCantidad() + cant); });
        c.porProducto().forEach((pid, cant) -> { Producto p = productos.findById(pid).orElseThrow(); p.setCantidad(p.getCantidad() - cant); });
        BigDecimal antes = f.getTotal();
        f.getItems().clear();
        f.getPagos().clear();
        facturas.flush();
        aplicar(f, in, c);
        f.setActualizadoEn(LocalDateTime.now());
        f.getHistorial().add(historial(f, "MODIFICAR", in.motivo().trim(), antes, f.getTotal()));
        sesion.registrar("facturas", id, "EDITAR", "Modificó " + f.getNumero() + " (total " + Num.fmt(antes) + " → " + Num.fmt(f.getTotal()) + "). Motivo: " + in.motivo().trim());
        return Dto.FacturaOut.de(f);
    }

    public Dto.FacturaOut anular(Long id, String motivo) {
        if (Num.vacio(motivo)) throw new NegocioException("El motivo es obligatorio.");
        Factura f = facturas.findById(id).orElseThrow(() -> NegocioException.noExiste("la factura"));
        if ("ANULADA".equals(f.getEstado())) throw new NegocioException("La factura ya está anulada.");
        f.getItems().forEach(i -> { Producto p = productos.findById(i.getProductoId()).orElseThrow(); p.setCantidad(p.getCantidad() + i.getCantidad()); });
        f.setEstado("ANULADA");
        f.setActualizadoEn(LocalDateTime.now());
        f.getHistorial().add(historial(f, "ANULAR", motivo.trim(), f.getTotal(), null));
        sesion.registrar("facturas", id, "ANULAR", "Anuló " + f.getNumero() + ". Motivo: " + motivo.trim());
        return Dto.FacturaOut.de(f);
    }

    private Calculo calcular(Dto.FacturaIn in, Map<Long, Integer> liberado) {
        if (in.clienteId() != null && !clientes.existsById(in.clienteId())) throw NegocioException.noExiste("el cliente");
        List<Dto.ItemIn> lineas = in.items() == null ? List.of() : in.items().stream().filter(i -> i.productoId() != null).toList();
        if (lineas.isEmpty()) throw new NegocioException("Agrega al menos un producto.");
        Map<Long, Integer> porProducto = new LinkedHashMap<>();
        List<FacturaDetalle> items = new java.util.ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Dto.ItemIn l : lineas) {
            Producto p = productos.findById(l.productoId()).orElseThrow(() -> NegocioException.noExiste("uno de los productos"));
            int cant = Num.v(l.cantidad());
            // Regla: la cantidad mínima por producto es 1
            if (cant < 1) throw new NegocioException("La cantidad de \"" + p.getNombre() + "\" debe ser 1 o más.");
            BigDecimal vu = Num.v(l.valorUnidad());
            if (vu.signum() <= 0) throw new NegocioException("Escribe el valor de \"" + p.getNombre() + "\".");
            FacturaDetalle d = new FacturaDetalle();
            d.setProductoId(p.getId());
            d.setNombreProducto(p.getNombre()); // copia histórica del nombre
            d.setCantidad(cant);
            d.setValorUnidad(vu);
            d.setValorTotal(vu.multiply(BigDecimal.valueOf(cant)));
            items.add(d);
            subtotal = subtotal.add(d.getValorTotal());
            porProducto.merge(p.getId(), cant, Integer::sum);
        }
        for (var e : porProducto.entrySet()) {
            Producto p = productos.findById(e.getKey()).orElseThrow();
            int disponible = p.getCantidad() + liberado.getOrDefault(e.getKey(), 0);
            if (e.getValue() > disponible) throw new NegocioException("Solo hay " + disponible + " de \"" + p.getNombre() + "\".");
        }
        subtotal = Num.pesos(subtotal);
        BigDecimal pctIva = empresa.findAll().stream().findFirst().map(EmpresaConfig::getPorcentajeIva).orElse(BigDecimal.valueOf(19));
        BigDecimal iva = subtotal.multiply(pctIva).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).setScale(2);
        BigDecimal total = subtotal.add(iva);

        BigDecimal ef = Num.v(in.efectivo()), tr = Num.v(in.transferencia());
        if (ef.signum() < 0 || tr.signum() < 0) throw new NegocioException("Los pagos no pueden ser negativos.");
        if (ef.compareTo(total) > 0) throw new NegocioException("El efectivo no puede ser mayor que el total.");
        if (tr.compareTo(total) > 0) throw new NegocioException("La transferencia no puede ser mayor que el total.");
        if (ef.add(tr).compareTo(total) != 0) throw new NegocioException("Efectivo + transferencia debe dar " + Num.fmt(total) + ".");
        BigDecimal entregado = in.entregado() == null ? ef : in.entregado();
        if (ef.signum() > 0 && entregado.compareTo(ef) < 0) throw new NegocioException("Lo que entrega el cliente no alcanza para el efectivo.");
        if (ef.signum() == 0) entregado = BigDecimal.ZERO;
        return new Calculo(items, porProducto, subtotal, iva, total, ef, tr, entregado);
    }

    private void aplicar(Factura f, Dto.FacturaIn in, Calculo c) {
        f.setClienteId(in.clienteId());
        c.items().forEach(i -> { i.setFactura(f); f.getItems().add(i); });
        f.setSubtotal(c.subtotal());
        f.setIva(c.iva());
        f.setTotal(c.total());
        f.setEntregado(c.entregado());
        f.setDevuelto(c.entregado().subtract(c.efectivo()).max(BigDecimal.ZERO));
        if (c.efectivo().signum() > 0) f.getPagos().add(pago(f, "EFECTIVO", c.efectivo()));
        if (c.transferencia().signum() > 0) f.getPagos().add(pago(f, "TRANSFERENCIA", c.transferencia()));
    }

    private FacturaPago pago(Factura f, String medio, BigDecimal valor) {
        FacturaPago p = new FacturaPago();
        p.setFactura(f);
        p.setMedioPago(medio);
        p.setValor(valor);
        return p;
    }

    private FacturaHistorial historial(Factura f, String accion, String motivo, BigDecimal antes, BigDecimal despues) {
        FacturaHistorial h = new FacturaHistorial();
        h.setFactura(f);
        h.setAccion(accion);
        h.setMotivo(motivo);
        h.setEmpleadoId(sesion.idActual());
        h.setTotalAntes(antes);
        h.setTotalDespues(despues);
        h.setFecha(LocalDateTime.now());
        return h;
    }
}
