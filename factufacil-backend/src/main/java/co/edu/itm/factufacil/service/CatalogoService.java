package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/** Datos maestros: empresa, empleados, productos, categorías, pedidos, clientes, novedades y entidades. */
@Service
@RequiredArgsConstructor
@Transactional
public class CatalogoService {
    private static final Pattern CEDULA = Pattern.compile("^\\d{5,15}$");
    private static final Pattern CORREO = Pattern.compile("^\\S+@\\S+\\.\\S+$");
    private static final Set<String> ROLES = Set.of("DESARROLLADOR", "JEFE", "ADMIN", "EMPLEADO");

    private final EmpresaConfigRepo empresaRepo;
    private final EmpleadoRepo empleados;
    private final RolRepo roles;
    private final CategoriaRepo categorias;
    private final ProductoRepo productos;
    private final PedidoRepo pedidos;
    private final ClienteRepo clientes;
    private final NovedadRepo novedades;
    private final EntidadRepo entidades;
    private final PasswordEncoder encoder;
    private final Sesion sesion;

    // ---------------- Empresa ----------------
    @Transactional(readOnly = true)
    public EmpresaConfig empresa() {
        return empresaRepo.findAll().stream().findFirst().orElseThrow(() -> NegocioException.noExiste("los datos del negocio"));
    }

    public EmpresaConfig guardarEmpresa(Dto.EmpresaIn in) {
        if (Num.vacio(in.nombre())) throw new NegocioException("El nombre del negocio es obligatorio.");
        BigDecimal iva = Num.v(in.porcentajeIva());
        if (iva.signum() < 0 || iva.compareTo(BigDecimal.valueOf(100)) > 0) throw new NegocioException("El IVA debe estar entre 0 y 100.");
        if (in.logo() != null && in.logo().length() > 700_000) throw new NegocioException("El logo es muy pesado. Usa una imagen de menos de 400 KB.");
        EmpresaConfig c = empresa();
        c.setNombre(Num.texto(in.nombre()));
        c.setDireccion(Num.texto(in.direccion()));
        c.setCelular(Num.texto(in.celular()));
        c.setLogo(in.logo());
        c.setPorcentajeIva(iva);
        c.setActualizadoEn(LocalDateTime.now());
        sesion.registrar("empresa_config", c.getId(), "EDITAR", "Actualizó los datos del negocio (IVA " + iva.stripTrailingZeros().toPlainString() + " %)");
        return c;
    }

    // ---------------- Empleados ----------------
    public Empleado crearEmpleado(Dto.EmpleadoIn in) {
        String cedula = Num.texto(in.cedula());
        if (!CEDULA.matcher(cedula).matches()) throw new NegocioException("La cédula debe tener solo números (5 a 15).");
        if (Num.vacio(in.nombre())) throw new NegocioException("Escribe el nombre.");
        if (in.password() == null || in.password().length() < 4) throw new NegocioException("La contraseña debe tener al menos 4 caracteres.");
        if (empleados.findByCedula(cedula).isPresent()) throw new NegocioException("Ya existe un empleado con esa cédula.");
        Empleado e = new Empleado();
        e.setCedula(cedula);
        e.setNombre(Num.texto(in.nombre()));
        e.setPasswordHash(encoder.encode(in.password()));
        e.setRol(rol(in.rol()));
        e.setCreadoPorId(sesion.idActual());
        empleados.save(e);
        sesion.registrar("empleados", e.getId(), "CREAR", "Creó a " + e.getNombre() + " (" + e.getRol().getNombre() + ")");
        return e;
    }

    public Empleado editarEmpleado(Long id, Dto.EmpleadoIn in) {
        Empleado e = empleados.findById(id).orElseThrow(() -> NegocioException.noExiste("el empleado"));
        String cedula = Num.texto(in.cedula());
        if (!CEDULA.matcher(cedula).matches()) throw new NegocioException("La cédula debe tener solo números (5 a 15).");
        empleados.findByCedula(cedula).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new NegocioException("Ya existe un empleado con esa cédula."); });
        if (Num.vacio(in.nombre())) throw new NegocioException("Escribe el nombre.");
        Rol nuevo = rol(in.rol());
        // Regla: nadie cambia su propio cargo
        if (id.equals(sesion.idActual()) && !nuevo.getId().equals(e.getRol().getId()))
            throw new NegocioException("No puedes cambiar tu propio cargo.");
        String antes = e.getNombre() + " (" + e.getRol().getNombre() + ")";
        e.setCedula(cedula);
        e.setNombre(Num.texto(in.nombre()));
        e.setRol(nuevo);
        if (!Num.vacio(in.password())) {
            if (in.password().length() < 4) throw new NegocioException("La contraseña debe tener al menos 4 caracteres.");
            e.setPasswordHash(encoder.encode(in.password()));
        }
        e.setActualizadoEn(LocalDateTime.now());
        sesion.registrar("empleados", id, "EDITAR", "Antes: " + antes + ". Ahora: " + e.getNombre() + " (" + nuevo.getNombre() + ")");
        return e;
    }

    public Empleado cambiarEstadoEmpleado(Long id) {
        if (id.equals(sesion.idActual())) throw new NegocioException("No puedes desactivarte a ti mismo.");
        Empleado e = empleados.findById(id).orElseThrow(() -> NegocioException.noExiste("el empleado"));
        e.setActivo(!e.isActivo());
        sesion.registrar("empleados", id, e.isActivo() ? "REACTIVAR" : "DESACTIVAR", (e.isActivo() ? "Reactivó a " : "Desactivó a ") + e.getNombre());
        return e;
    }

    private Rol rol(String nombre) {
        String n = Num.texto(nombre).toUpperCase();
        if (!ROLES.contains(n)) throw new NegocioException("El cargo no es válido.");
        return roles.findByNombre(n).orElseThrow(() -> NegocioException.noExiste("el cargo"));
    }

    // ---------------- Categorías y productos ----------------
    Long asegurarCategoria(String nombre) {
        String n = Num.texto(nombre);
        if (n.isEmpty()) throw new NegocioException("Escoge o escribe una categoría.");
        return categorias.findByNombreIgnoreCase(n).map(Categoria::getId).orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombre(n);
            categorias.save(c);
            sesion.registrar("categorias", c.getId(), "CREAR", "Creó la categoría " + n);
            return c.getId();
        });
    }

    public Producto crearProducto(Dto.ProductoIn in) {
        String nombre = Num.texto(in.nombre());
        if (nombre.isEmpty()) throw new NegocioException("Escribe el nombre del producto.");
        if (productos.findByNombreIgnoreCase(nombre).isPresent()) throw new NegocioException("Ya existe un producto con ese nombre.");
        if (Num.v(in.valorUnidad()).signum() <= 0) throw new NegocioException("El valor debe ser mayor a 0.");
        if (Num.v(in.cantidad()) < 0) throw new NegocioException("La cantidad no puede ser negativa.");
        Producto p = new Producto();
        p.setNombre(nombre);
        p.setValorUnidad(in.valorUnidad());
        p.setCantidad(Num.v(in.cantidad()));
        p.setCategoriaId(asegurarCategoria(in.categoria()));
        p.setActualizadoEn(LocalDateTime.now());
        productos.save(p);
        sesion.registrar("productos", p.getId(), "CREAR", "Creó " + nombre + " con " + p.getCantidad() + " unidades");
        return p;
    }

    /** La cantidad no se edita aquí: solo cambia con ventas y ajustes, para que quede rastro. */
    public Producto editarProducto(Long id, Dto.ProductoIn in) {
        Producto p = productos.findById(id).orElseThrow(() -> NegocioException.noExiste("el producto"));
        String nombre = Num.texto(in.nombre());
        if (nombre.isEmpty()) throw new NegocioException("Escribe el nombre del producto.");
        productos.findByNombreIgnoreCase(nombre).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new NegocioException("Ya existe un producto con ese nombre."); });
        if (Num.v(in.valorUnidad()).signum() <= 0) throw new NegocioException("El valor debe ser mayor a 0.");
        String antes = p.getNombre() + " " + Num.fmt(p.getValorUnidad());
        p.setNombre(nombre);
        p.setValorUnidad(in.valorUnidad());
        p.setCategoriaId(asegurarCategoria(in.categoria()));
        p.setActualizadoEn(LocalDateTime.now());
        sesion.registrar("productos", id, "EDITAR", "Antes: " + antes + ". Ahora: " + nombre + " " + Num.fmt(p.getValorUnidad()));
        return p;
    }

    public Producto cambiarEstadoProducto(Long id) {
        Producto p = productos.findById(id).orElseThrow(() -> NegocioException.noExiste("el producto"));
        p.setActivo(!p.isActivo());
        sesion.registrar("productos", id, p.isActivo() ? "REACTIVAR" : "DESACTIVAR", (p.isActivo() ? "Reactivó " : "Desactivó ") + p.getNombre());
        return p;
    }

    public Pedido crearPedido(List<Dto.PedidoLinea> lineas) {
        List<Dto.PedidoLinea> det = lineas == null ? List.of() : lineas.stream().filter(l -> l.productoId() != null && Num.v(l.cantidad()) > 0).toList();
        if (det.isEmpty()) throw new NegocioException("Escribe la cantidad de al menos un producto.");
        Pedido p = new Pedido();
        p.setCreadoPorId(sesion.idActual());
        for (Dto.PedidoLinea l : det) {
            if (!productos.existsById(l.productoId())) throw NegocioException.noExiste("uno de los productos");
            PedidoDetalle d = new PedidoDetalle();
            d.setPedido(p);
            d.setProductoId(l.productoId());
            d.setCantidadNecesaria(l.cantidad());
            p.getDetalle().add(d);
        }
        pedidos.save(p);
        sesion.registrar("pedidos", p.getId(), "CREAR", "Pedido con " + det.size() + " productos");
        return p;
    }

    // ---------------- Clientes ----------------
    public Cliente crearCliente(Dto.ClienteIn in) {
        Cliente c = new Cliente();
        validarCliente(null, in);
        llenarCliente(c, in);
        clientes.save(c);
        sesion.registrar("clientes", c.getId(), "CREAR", "Creó al cliente " + c.getNombre());
        return c;
    }

    public Cliente editarCliente(Long id, Dto.ClienteIn in) {
        Cliente c = clientes.findById(id).orElseThrow(() -> NegocioException.noExiste("el cliente"));
        validarCliente(id, in);
        llenarCliente(c, in);
        c.setActualizadoEn(LocalDateTime.now());
        sesion.registrar("clientes", id, "EDITAR", "Editó al cliente " + c.getNombre());
        return c;
    }

    public Cliente cambiarEstadoCliente(Long id) {
        Cliente c = clientes.findById(id).orElseThrow(() -> NegocioException.noExiste("el cliente"));
        c.setActivo(!c.isActivo());
        sesion.registrar("clientes", id, c.isActivo() ? "REACTIVAR" : "DESACTIVAR", (c.isActivo() ? "Reactivó al cliente " : "Desactivó al cliente ") + c.getNombre());
        return c;
    }

    /** Duplicados: se revisa el documento Y el nombre, y se avisa cuál coincidió. */
    private void validarCliente(Long id, Dto.ClienteIn in) {
        String doc = Num.texto(in.documento());
        String nombre = Num.texto(in.nombre());
        if (doc.isEmpty()) throw new NegocioException("Escribe el documento (cédula o NIT).");
        if (nombre.isEmpty()) throw new NegocioException("Escribe el nombre.");
        if (!Num.vacio(in.correo()) && !CORREO.matcher(in.correo().trim()).matches()) throw new NegocioException("El correo no se ve bien escrito.");
        clientes.findByDocumentoIgnoreCase(doc).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new NegocioException("Ya existe un cliente con ese documento: " + x.getNombre() + "."); });
        clientes.findByNombreIgnoreCase(nombre).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new NegocioException("Ya existe un cliente con ese nombre (documento " + x.getDocumento() + ")."); });
    }

    private void llenarCliente(Cliente c, Dto.ClienteIn in) {
        c.setDocumento(Num.texto(in.documento()));
        c.setNombre(Num.texto(in.nombre()));
        c.setCorreo(Num.texto(in.correo()));
    }

    // ---------------- Novedades ----------------
    public Novedad crearNovedad(Dto.NovedadIn in) {
        if (in.fecha() == null) throw new NegocioException("Escoge la fecha.");
        if (Num.vacio(in.descripcion())) throw new NegocioException("Escribe qué pasó.");
        if (Num.negativo(in.valor())) throw new NegocioException("El valor no puede ser negativo.");
        Novedad n = new Novedad();
        n.setFecha(in.fecha());
        n.setDescripcion(Num.texto(in.descripcion()));
        n.setValor(Num.v(in.valor()));
        n.setEmpleadoId(sesion.idActual());
        novedades.save(n);
        sesion.registrar("novedades", n.getId(), "CREAR", "Novedad: " + n.getDescripcion() + " (" + Num.fmt(n.getValor()) + ")");
        return n;
    }

    public Novedad cambiarEstadoNovedad(Long id) {
        Novedad n = novedades.findById(id).orElseThrow(() -> NegocioException.noExiste("la novedad"));
        n.setActivo(!n.isActivo());
        sesion.registrar("novedades", id, n.isActivo() ? "REACTIVAR" : "DESACTIVAR", (n.isActivo() ? "Reactivó" : "Desactivó") + " la novedad \"" + n.getDescripcion() + "\"");
        return n;
    }

    // ---------------- Entidades ----------------
    public Entidad crearEntidad(Dto.EntidadIn in) {
        String nombre = Num.texto(in.nombre());
        if (nombre.isEmpty()) throw new NegocioException("Escribe el nombre de la entidad.");
        if (entidades.findByNombreIgnoreCase(nombre).isPresent()) throw new NegocioException("Esa entidad ya existe.");
        Entidad e = new Entidad();
        e.setNombre(nombre);
        e.setRequiereTipoPago(Boolean.TRUE.equals(in.requiereTipoPago()));
        entidades.save(e);
        sesion.registrar("entidades", e.getId(), "CREAR", "Creó la entidad " + nombre);
        return e;
    }

    public Entidad cambiarEstadoEntidad(Long id) {
        Entidad e = entidades.findById(id).orElseThrow(() -> NegocioException.noExiste("la entidad"));
        e.setActivo(!e.isActivo());
        sesion.registrar("entidades", id, e.isActivo() ? "REACTIVAR" : "DESACTIVAR", (e.isActivo() ? "Reactivó " : "Desactivó ") + e.getNombre());
        return e;
    }
}
