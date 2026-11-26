package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Lecturas: listados y el estado completo que la interfaz carga al iniciar sesión. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultaService {
    private static final Sort POR_ID = Sort.by("id");

    private final CatalogoService catalogo;
    private final EmpleadoRepo empleados;
    private final CategoriaRepo categorias;
    private final ProductoRepo productos;
    private final ClienteRepo clientes;
    private final FacturaRepo facturas;
    private final SecuenciaRepo secuencias;
    private final NovedadRepo novedades;
    private final CierreTurnoRepo turnos;
    private final CierreDiaRepo dias;
    private final EntregaCajaRepo entregas;
    private final EntidadRepo entidades;
    private final EntidadConciliacionRepo conciliaciones;
    private final AjusteInventarioRepo ajustes;
    private final PedidoRepo pedidos;
    private final LogAuditoriaRepo auditoria;
    private final Sesion sesion;

    public Dto.Estado estado() {
        Empleado yo = sesion.actual();
        String rol = yo.getRol().getNombre();
        boolean gestion = Set.of("DESARROLLADOR", "JEFE", "ADMIN").contains(rol);
        boolean direccion = Set.of("DESARROLLADOR", "JEFE").contains(rol);
        return new Dto.Estado(
                Dto.EmpresaOut.de(catalogo.empresa()),
                empleadosOut(),
                categorias.findAll(POR_ID),
                productos.findAll(POR_ID),
                clientes.findAll(POR_ID),
                facturasOut(),
                secuencias.findById(FacturaService.SECUENCIA).map(Secuencia::getValor).orElse(0L),
                novedades.findAll(POR_ID),
                turnos.findAll(POR_ID),
                dias.findAll(POR_ID),
                gestion ? entregas.findAll(POR_ID) : List.of(),
                entidades.findAll(POR_ID),
                conciliaciones.findAll(POR_ID),
                ajustes.findAll(POR_ID),
                gestion ? pedidos.findAll(POR_ID).stream().map(Dto.PedidoOut::de).toList() : List.of(),
                direccion ? auditoriaOut() : List.of());
    }

    public List<Dto.EmpleadoOut> empleadosOut() {
        return empleados.findAll(POR_ID).stream().map(Dto.EmpleadoOut::de).toList();
    }

    public List<Dto.FacturaOut> facturasOut() {
        return facturas.findAll(POR_ID).stream().map(Dto.FacturaOut::de).toList();
    }

    public List<Dto.FacturaOut> facturasOut(LocalDate desde, LocalDate hasta) {
        return facturas.findByFechaBetweenOrderByFechaDesc(desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay().minusNanos(1))
                .stream().map(Dto.FacturaOut::de).toList();
    }

    public Dto.FacturaOut factura(Long id) {
        return Dto.FacturaOut.de(facturas.findById(id).orElseThrow(() -> NegocioException.noExiste("la factura")));
    }

    public List<Dto.AuditoriaOut> auditoriaOut() {
        return auditoria.findAll(Sort.by(Sort.Direction.DESC, "id")).stream().map(Dto.AuditoriaOut::de).toList();
    }
}
