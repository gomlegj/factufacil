package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;

/** Cierres de turno y de día, ajustes manuales, entregas de caja y cuadres con entidades. */
@Service
@RequiredArgsConstructor
@Transactional
public class CajaService {
    /** Las facturas antes de las 2:00 p. m. son del turno de la mañana. */
    public static final int HORA_CAMBIO_TURNO = 14;

    private final FacturaRepo facturas;
    private final CierreTurnoRepo turnos;
    private final CierreDiaRepo dias;
    private final EntregaCajaRepo entregas;
    private final EntidadRepo entidades;
    private final EntidadConciliacionRepo conciliaciones;
    private final EmpleadoRepo empleados;
    private final Sesion sesion;

    public record Ventas(int cantidad, BigDecimal efectivo, BigDecimal transferencia, BigDecimal total) {}

    @Transactional(readOnly = true)
    public Ventas ventasTurno(LocalDate fecha, String turno) {
        List<Factura> fs = facturasDelDia(fecha).stream()
                .filter(f -> (f.getFecha().getHour() < HORA_CAMBIO_TURNO) == "MAÑANA".equals(turno)).toList();
        BigDecimal ef = BigDecimal.ZERO, tr = BigDecimal.ZERO;
        for (Factura f : fs)
            for (FacturaPago p : f.getPagos())
                if ("EFECTIVO".equals(p.getMedioPago())) ef = ef.add(p.getValor()); else tr = tr.add(p.getValor());
        return new Ventas(fs.size(), ef, tr, ef.add(tr));
    }

    private List<Factura> facturasDelDia(LocalDate fecha) {
        return facturas.findByEstadoAndFechaBetween("ACTIVA", fecha.atStartOfDay(), fecha.plusDays(1).atStartOfDay().minusNanos(1));
    }

    public CierreTurno cerrarTurno(Dto.CierreTurnoIn in) {
        String turno = Num.texto(in.turno()).toUpperCase().replace("MANANA", "MAÑANA");
        if (in.fecha() == null || !(turno.equals("MAÑANA") || turno.equals("TARDE"))) throw new NegocioException("Escoge la fecha y el turno.");
        if (turnos.existsByFechaAndTurno(in.fecha(), turno)) throw new NegocioException("El turno de la " + turno.toLowerCase() + " de ese día ya se cerró.");
        if (dias.findByFecha(in.fecha()).isPresent()) throw new NegocioException("Ese día ya está cerrado.");
        if (in.empleadoEntregaId() == null || in.empleadoRecibeId() == null) throw new NegocioException("Escoge quién entrega y quién recibe la caja.");
        if (in.empleadoEntregaId().equals(in.empleadoRecibeId())) throw new NegocioException("Quien entrega y quien recibe deben ser personas distintas.");
        if (!empleados.existsById(in.empleadoEntregaId()) || !empleados.existsById(in.empleadoRecibeId())) throw NegocioException.noExiste("uno de los empleados");
        BigDecimal ef = Num.v(in.valorEfectivo()), tr = Num.v(in.valorTransferencia()), g = Num.v(in.gastos());
        if (ef.signum() < 0 || tr.signum() < 0 || g.signum() < 0) throw new NegocioException("Los valores no pueden ser negativos.");

        Ventas v = ventasTurno(in.fecha(), turno);
        // Diferencia = lo contado + lo que se pagó de gastos - lo que dicen las facturas
        BigDecimal dif = ef.add(tr).add(g).subtract(v.total());
        CierreTurno c = new CierreTurno();
        c.setFecha(in.fecha());
        c.setTurno(turno);
        c.setEmpleadoEntregaId(in.empleadoEntregaId());
        c.setEmpleadoRecibeId(in.empleadoRecibeId());
        c.setVentasSistema(v.total());
        c.setValorEfectivo(ef);
        c.setValorTransferencia(tr);
        c.setValorTotal(ef.add(tr));
        c.setGastos(g);
        c.setSobra(dif.max(BigDecimal.ZERO));
        c.setFalta(dif.negate().max(BigDecimal.ZERO));
        c.setCoordinadoraValor(Num.v(in.coordinadoraValor()));
        c.setGanaValor(Num.v(in.ganaValor()));
        c.setObservaciones(Num.texto(in.observaciones()));
        turnos.save(c);
        sesion.registrar("cierres_turno", c.getId(), "CERRAR", "Cierre " + turno + " " + in.fecha() + ": sobra " + Num.fmt(c.getSobra()) + ", falta " + Num.fmt(c.getFalta()));
        return c;
    }

    /** El cierre de día suma automáticamente los turnos de esa fecha. */
    public CierreDia cerrarDia(LocalDate fecha) {
        if (fecha == null) throw new NegocioException("Escoge la fecha.");
        if (dias.findByFecha(fecha).isPresent()) throw new NegocioException("Ese día ya está cerrado.");
        List<CierreTurno> ct = turnos.findByFecha(fecha);
        if (ct.isEmpty()) throw new NegocioException("Primero cierra al menos un turno de ese día.");
        CierreDia d = new CierreDia();
        d.setFecha(fecha);
        d.setTotalVendido(facturasDelDia(fecha).stream().map(Factura::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
        d.setTotalEfectivo(suma(ct, CierreTurno::getValorEfectivo));
        d.setTotalTransferencia(suma(ct, CierreTurno::getValorTransferencia));
        d.setGastos(suma(ct, CierreTurno::getGastos));
        d.setSobra(suma(ct, CierreTurno::getSobra));
        d.setFalta(suma(ct, CierreTurno::getFalta));
        d.setCerradoPorId(sesion.idActual());
        dias.save(d);
        sesion.registrar("cierres_dia", d.getId(), "CERRAR", "Cerró el día " + fecha);
        return d;
    }

    public CierreDia ajustarDia(LocalDate fecha, Dto.AjusteDiaIn in) {
        CierreDia d = dias.findByFecha(fecha).orElseThrow(() -> new NegocioException("Ese día todavía no está cerrado."));
        if (Num.v(in.valor()).signum() == 0) throw new NegocioException("Escribe cuánto poner (+) o quitar (−).");
        if (Num.vacio(in.motivo())) throw new NegocioException("El motivo es obligatorio.");
        d.setAjusteManual(Num.v(d.getAjusteManual()).add(in.valor()));
        String m = in.motivo().trim();
        d.setMotivoAjuste(Num.vacio(d.getMotivoAjuste()) ? m : d.getMotivoAjuste() + " | " + m);
        sesion.registrar("cierres_dia", d.getId(), "AJUSTAR", "Ajuste de " + Num.fmt(in.valor()) + " al " + fecha + ". Motivo: " + m);
        return d;
    }

    public EntregaCaja entregar(Dto.EntregaIn in) {
        if (in.fechaDesde() == null || in.fechaHasta() == null || in.fechaDesde().isAfter(in.fechaHasta())) throw new NegocioException("Revisa las fechas.");
        if (Num.v(in.valorEntregado()).signum() <= 0) throw new NegocioException("Escribe el valor entregado.");
        if (in.recibidoPorId() == null || !empleados.existsById(in.recibidoPorId())) throw new NegocioException("Escoge quién recibe la plata.");
        EntregaCaja e = new EntregaCaja();
        e.setFechaDesde(in.fechaDesde());
        e.setFechaHasta(in.fechaHasta());
        e.setValorEntregado(in.valorEntregado());
        e.setEntregadoPorId(sesion.idActual());
        e.setRecibidoPorId(in.recibidoPorId());
        e.setObservaciones(Num.texto(in.observaciones()));
        entregas.save(e);
        sesion.registrar("entregas_caja", e.getId(), "CREAR", "Entregó " + Num.fmt(e.getValorEntregado()) + " (" + in.fechaDesde() + " a " + in.fechaHasta() + ")");
        return e;
    }

    /** % ganancia = ganancia / (entregado + ganancia) * 100. Coordinadora exige tipo de pago. */
    public EntidadConciliacion conciliar(Dto.ConciliacionIn in) {
        Entidad ent = in.entidadId() == null ? null : entidades.findById(in.entidadId()).orElse(null);
        if (ent == null) throw new NegocioException("Escoge la entidad.");
        if (in.fecha() == null) throw new NegocioException("Escoge la fecha.");
        BigDecimal ve = Num.v(in.valorEntregado()), vg = Num.v(in.valorGanancia());
        if (ve.signum() < 0 || vg.signum() < 0) throw new NegocioException("Los valores no pueden ser negativos.");
        String tipo = null;
        if (ent.isRequiereTipoPago()) {
            tipo = Num.texto(in.tipoPago()).toUpperCase();
            if (!tipo.equals("ESTABLECIMIENTO") && !tipo.equals("CONTRAENTREGA")) throw new NegocioException("Para " + ent.getNombre() + " escoge el tipo de pago.");
            if (conciliaciones.existsByEntidadIdAndFechaAndTipoPago(ent.getId(), in.fecha(), tipo)) throw new NegocioException("Esa conciliación ya se registró ese día.");
        } else if (conciliaciones.existsByEntidadIdAndFechaAndTipoPagoIsNull(ent.getId(), in.fecha())) {
            throw new NegocioException("Esa conciliación ya se registró ese día.");
        }
        BigDecimal base = ve.add(vg);
        BigDecimal pct = base.signum() == 0 ? BigDecimal.ZERO : vg.multiply(BigDecimal.valueOf(100)).divide(base, 2, RoundingMode.HALF_UP);
        EntidadConciliacion c = new EntidadConciliacion();
        c.setEntidadId(ent.getId());
        c.setFecha(in.fecha());
        c.setTipoPago(tipo);
        c.setValorEntregado(ve);
        c.setValorGanancia(vg);
        c.setPorcentajeGanancia(pct);
        c.setEmpleadoId(sesion.idActual());
        conciliaciones.save(c);
        sesion.registrar("entidad_conciliaciones", c.getId(), "CREAR", ent.getNombre() + " " + in.fecha() + ": entregado " + Num.fmt(ve) + ", ganancia " + Num.fmt(vg) + " (" + pct + " %)");
        return c;
    }

    private static <T> BigDecimal suma(List<T> l, Function<T, BigDecimal> f) {
        return l.stream().map(f).map(Num::v).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
