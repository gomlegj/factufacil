package co.edu.itm.factufacil.web;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Facturas, caja, entidades, inventario y auditoría. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OperacionController {
    private static final Sort POR_ID = Sort.by("id");
    private final FacturaService facturas;
    private final CajaService caja;
    private final InventarioService inventario;
    private final ConsultaService consultas;
    private final CierreTurnoRepo turnos;
    private final CierreDiaRepo dias;
    private final EntregaCajaRepo entregas;
    private final EntidadConciliacionRepo conciliaciones;
    private final AjusteInventarioRepo ajustes;

    // ---------- Facturas ----------
    @GetMapping("/facturas") @PreAuthorize(Roles.GESTION)
    public List<Dto.FacturaOut> facturas(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return consultas.facturasOut(desde, hasta);
    }

    @GetMapping("/facturas/{id}")
    public Dto.FacturaOut factura(@PathVariable Long id) { return consultas.factura(id); }

    @PostMapping("/facturas") @ResponseStatus(HttpStatus.CREATED)
    public Dto.FacturaOut crearFactura(@RequestBody Dto.FacturaIn in) { return facturas.crear(in); }

    @PutMapping("/facturas/{id}") @PreAuthorize(Roles.GESTION)
    public Dto.FacturaOut modificarFactura(@PathVariable Long id, @RequestBody Dto.FacturaIn in) { return facturas.modificar(id, in); }

    @PostMapping("/facturas/{id}/anular") @PreAuthorize(Roles.GESTION)
    public Dto.FacturaOut anularFactura(@PathVariable Long id, @RequestBody Dto.Motivo in) { return facturas.anular(id, in.motivo()); }

    // ---------- Cierres ----------
    @GetMapping("/cierres-turno/ventas")
    public CajaService.Ventas ventasTurno(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha, @RequestParam String turno) {
        return caja.ventasTurno(fecha, turno);
    }

    @GetMapping("/cierres-turno")
    public List<CierreTurno> cierresTurno() { return turnos.findAll(POR_ID); }

    @PostMapping("/cierres-turno") @ResponseStatus(HttpStatus.CREATED)
    public CierreTurno cerrarTurno(@RequestBody Dto.CierreTurnoIn in) { return caja.cerrarTurno(in); }

    @GetMapping("/cierres-dia")
    public List<CierreDia> cierresDia() { return dias.findAll(POR_ID); }

    @PostMapping("/cierres-dia") @ResponseStatus(HttpStatus.CREATED)
    public CierreDia cerrarDia(@RequestBody Dto.CerrarDiaIn in) { return caja.cerrarDia(in.fecha()); }

    @PatchMapping("/cierres-dia/{fecha}/ajuste") @PreAuthorize(Roles.GESTION)
    public CierreDia ajustarDia(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha, @RequestBody Dto.AjusteDiaIn in) {
        return caja.ajustarDia(fecha, in);
    }

    @GetMapping("/entregas-caja") @PreAuthorize(Roles.GESTION)
    public List<EntregaCaja> entregas() { return entregas.findAll(POR_ID); }

    @PostMapping("/entregas-caja") @PreAuthorize(Roles.GESTION) @ResponseStatus(HttpStatus.CREATED)
    public EntregaCaja entregar(@RequestBody Dto.EntregaIn in) { return caja.entregar(in); }

    // ---------- Entidades ----------
    @GetMapping("/entidades/conciliaciones")
    public List<EntidadConciliacion> conciliaciones() { return conciliaciones.findAll(POR_ID); }

    @PostMapping("/entidades/conciliaciones") @ResponseStatus(HttpStatus.CREATED)
    public EntidadConciliacion conciliar(@RequestBody Dto.ConciliacionIn in) { return caja.conciliar(in); }

    // ---------- Inventario ----------
    @GetMapping("/ajustes-inventario")
    public List<AjusteInventario> ajustes() { return ajustes.findAll(POR_ID); }

    @PostMapping("/ajustes-inventario") @PreAuthorize(Roles.GESTION) @ResponseStatus(HttpStatus.CREATED)
    public Producto ajustar(@RequestBody Dto.AjusteIn in) { return inventario.ajustar(in); }

    @PostMapping("/inventario-fisico") @PreAuthorize(Roles.GESTION)
    public Map<String, Integer> conteo(@RequestBody List<Dto.ConteoLinea> lineas) { return Map.of("corregidos", inventario.aplicarConteo(lineas)); }

    // ---------- Auditoría ----------
    @GetMapping("/auditoria") @PreAuthorize(Roles.DIRECCION)
    public List<Dto.AuditoriaOut> auditoria() { return consultas.auditoriaOut(); }
}
