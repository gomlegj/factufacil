package co.edu.itm.factufacil.web;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.service.CatalogoService;
import co.edu.itm.factufacil.service.ConsultaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogoController {
    private static final Sort POR_ID = Sort.by("id");
    private final CatalogoService catalogo;
    private final ConsultaService consultas;
    private final CategoriaRepo categorias;
    private final ProductoRepo productos;
    private final ClienteRepo clientes;
    private final NovedadRepo novedades;
    private final EntidadRepo entidades;

    // Empresa (lectura pública para mostrar nombre y logo en la pantalla de ingreso)
    @GetMapping("/empresa")
    public Dto.EmpresaOut empresa() { return Dto.EmpresaOut.de(catalogo.empresa()); }

    @PutMapping("/empresa") @PreAuthorize(Roles.DIRECCION)
    public Dto.EmpresaOut guardarEmpresa(@RequestBody Dto.EmpresaIn in) { return Dto.EmpresaOut.de(catalogo.guardarEmpresa(in)); }

    // Empleados: solo jefe y desarrollador los crean, editan y asignan cargo
    @GetMapping("/empleados")
    public List<Dto.EmpleadoOut> empleados() { return consultas.empleadosOut(); }

    @PostMapping("/empleados") @PreAuthorize(Roles.DIRECCION) @ResponseStatus(HttpStatus.CREATED)
    public Dto.EmpleadoOut crearEmpleado(@RequestBody Dto.EmpleadoIn in) { return Dto.EmpleadoOut.de(catalogo.crearEmpleado(in)); }

    @PutMapping("/empleados/{id}") @PreAuthorize(Roles.DIRECCION)
    public Dto.EmpleadoOut editarEmpleado(@PathVariable Long id, @RequestBody Dto.EmpleadoIn in) { return Dto.EmpleadoOut.de(catalogo.editarEmpleado(id, in)); }

    @PatchMapping("/empleados/{id}/estado") @PreAuthorize(Roles.DIRECCION)
    public Dto.EmpleadoOut estadoEmpleado(@PathVariable Long id) { return Dto.EmpleadoOut.de(catalogo.cambiarEstadoEmpleado(id)); }

    // Categorías y productos
    @GetMapping("/categorias")
    public List<Categoria> categorias() { return categorias.findAll(POR_ID); }

    @GetMapping("/productos")
    public List<Producto> productos() { return productos.findAll(POR_ID); }

    @PostMapping("/productos") @ResponseStatus(HttpStatus.CREATED)
    public Producto crearProducto(@RequestBody Dto.ProductoIn in) { return catalogo.crearProducto(in); }

    @PutMapping("/productos/{id}")
    public Producto editarProducto(@PathVariable Long id, @RequestBody Dto.ProductoIn in) { return catalogo.editarProducto(id, in); }

    @PatchMapping("/productos/{id}/estado") @PreAuthorize(Roles.GESTION)
    public Producto estadoProducto(@PathVariable Long id) { return catalogo.cambiarEstadoProducto(id); }

    @PostMapping("/pedidos") @ResponseStatus(HttpStatus.CREATED)
    public Dto.PedidoOut crearPedido(@RequestBody List<Dto.PedidoLinea> lineas) { return Dto.PedidoOut.de(catalogo.crearPedido(lineas)); }

    // Clientes
    @GetMapping("/clientes")
    public List<Cliente> clientes() { return clientes.findAll(POR_ID); }

    @PostMapping("/clientes") @ResponseStatus(HttpStatus.CREATED)
    public Cliente crearCliente(@RequestBody Dto.ClienteIn in) { return catalogo.crearCliente(in); }

    @PutMapping("/clientes/{id}")
    public Cliente editarCliente(@PathVariable Long id, @RequestBody Dto.ClienteIn in) { return catalogo.editarCliente(id, in); }

    @PatchMapping("/clientes/{id}/estado")
    public Cliente estadoCliente(@PathVariable Long id) { return catalogo.cambiarEstadoCliente(id); }

    // Novedades
    @GetMapping("/novedades")
    public List<Novedad> novedades() { return novedades.findAll(POR_ID); }

    @PostMapping("/novedades") @ResponseStatus(HttpStatus.CREATED)
    public Novedad crearNovedad(@RequestBody Dto.NovedadIn in) { return catalogo.crearNovedad(in); }

    @PatchMapping("/novedades/{id}/estado")
    public Novedad estadoNovedad(@PathVariable Long id) { return catalogo.cambiarEstadoNovedad(id); }

    // Entidades (tabla abierta: se crean desde la interfaz)
    @GetMapping("/entidades")
    public List<Entidad> entidades() { return entidades.findAll(POR_ID); }

    @PostMapping("/entidades") @ResponseStatus(HttpStatus.CREATED)
    public Entidad crearEntidad(@RequestBody Dto.EntidadIn in) { return catalogo.crearEntidad(in); }

    @PatchMapping("/entidades/{id}/estado")
    public Entidad estadoEntidad(@PathVariable Long id) { return catalogo.cambiarEstadoEntidad(id); }
}
