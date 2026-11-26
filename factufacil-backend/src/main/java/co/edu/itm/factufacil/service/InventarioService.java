package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.AjusteInventario;
import co.edu.itm.factufacil.domain.Producto;
import co.edu.itm.factufacil.repo.AjusteInventarioRepo;
import co.edu.itm.factufacil.repo.ProductoRepo;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/** Ajustes de inventario (suman o restan existencias) y carga del inventario físico. */
@Service
@RequiredArgsConstructor
@Transactional
public class InventarioService {
    private static final Set<String> ENTRAN = Set.of("INGRESO_NUEVO", "INGRESO_EXISTENTE");
    private static final Set<String> TIPOS = Set.of("INGRESO_NUEVO", "INGRESO_EXISTENTE", "DANO", "CONSUMO_INTERNO");

    private final ProductoRepo productos;
    private final AjusteInventarioRepo ajustes;
    private final CatalogoService catalogo;
    private final Sesion sesion;

    public Producto ajustar(Dto.AjusteIn in) {
        String tipo = Num.texto(in.tipo()).toUpperCase();
        if (!TIPOS.contains(tipo)) throw new NegocioException("Escoge el tipo de ajuste.");
        int cant = Num.v(in.cantidad());
        if (cant < 1) throw new NegocioException("La cantidad debe ser un número entero mayor a 0.");
        if (Num.vacio(in.motivo())) throw new NegocioException("Escribe el motivo.");
        Producto p;
        if (tipo.equals("INGRESO_NUEVO")) {
            Dto.ProductoNuevoIn n = in.nuevo();
            if (n == null || Num.vacio(n.nombre())) throw new NegocioException("Escribe el nombre del producto nuevo.");
            if (productos.findByNombreIgnoreCase(n.nombre().trim()).isPresent()) throw new NegocioException("Ese producto ya existe: usa \"Ingreso de producto existente\".");
            p = catalogo.crearProducto(new Dto.ProductoIn(n.nombre(), n.valorUnidad(), 0, n.categoria()));
        } else {
            p = in.productoId() == null ? null : productos.findById(in.productoId()).orElse(null);
            if (p == null) throw new NegocioException("Escoge el producto.");
        }
        int signo = ENTRAN.contains(tipo) ? 1 : -1;
        if (signo < 0 && cant > p.getCantidad()) throw new NegocioException("Solo hay " + p.getCantidad() + " de \"" + p.getNombre() + "\".");
        p.setCantidad(p.getCantidad() + signo * cant);
        p.setActualizadoEn(LocalDateTime.now());
        AjusteInventario a = nuevo(p.getId(), tipo, cant, in.motivo().trim());
        sesion.registrar("ajustes_inventario", a.getId(), "CREAR", tipo + " de " + cant + " " + p.getNombre() + ". Motivo: " + a.getMotivo());
        return p;
    }

    /** Aplica el Excel de inventario físico: deja cada producto con lo contado y registra la diferencia. */
    public int aplicarConteo(List<Dto.ConteoLinea> lineas) {
        int cambios = 0;
        for (Dto.ConteoLinea l : lineas == null ? List.<Dto.ConteoLinea>of() : lineas) {
            if (l.productoId() == null || l.contado() == null) continue;
            if (l.contado() < 0) throw new NegocioException("Las cantidades contadas no pueden ser negativas.");
            Producto p = productos.findById(l.productoId()).orElse(null);
            if (p == null) continue;
            int dif = l.contado() - p.getCantidad();
            if (dif == 0) continue;
            nuevo(p.getId(), "CONTEO_FISICO", dif, "Inventario físico: sistema " + p.getCantidad() + ", contado " + l.contado());
            p.setCantidad(l.contado());
            p.setActualizadoEn(LocalDateTime.now());
            cambios++;
        }
        sesion.registrar("ajustes_inventario", null, "CREAR", "Cargó inventario físico: " + cambios + " productos corregidos");
        return cambios;
    }

    private AjusteInventario nuevo(Long productoId, String tipo, int cantidad, String motivo) {
        AjusteInventario a = new AjusteInventario();
        a.setProductoId(productoId);
        a.setTipo(tipo);
        a.setCantidad(cantidad);
        a.setMotivo(motivo);
        a.setEmpleadoId(sesion.idActual());
        a.setFecha(LocalDateTime.now());
        return ajustes.save(a);
    }
}
