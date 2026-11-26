package co.edu.itm.factufacil.config;

import co.edu.itm.factufacil.domain.*;
import co.edu.itm.factufacil.repo.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Al arrancar: crea los catálogos fijos (roles, empresa, secuencia) y un usuario desarrollador.
 * Si factufacil.datos-demo=true y no hay productos, carga datos ficticios para la demostración.
 * Contraseña de los usuarios de prueba: 1234.
 * Se ejecuta ANTES de que el servidor web acepte peticiones: así nadie intenta
 * ingresar mientras la base todavía está vacía (importante en Render, que reinicia la base al despertar).
 */
@Component
@RequiredArgsConstructor
public class DatosIniciales implements SmartInitializingSingleton {
    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);
    private static final String CLAVE_DEMO = "1234";

    private final RolRepo roles;
    private final EmpresaConfigRepo empresa;
    private final SecuenciaRepo secuencias;
    private final EmpleadoRepo empleados;
    private final CategoriaRepo categorias;
    private final ProductoRepo productos;
    private final ClienteRepo clientes;
    private final EntidadRepo entidades;
    private final FacturaRepo facturas;
    private final CierreTurnoRepo turnos;
    private final CierreDiaRepo dias;
    private final EntidadConciliacionRepo conciliaciones;
    private final NovedadRepo novedades;
    private final LogAuditoriaRepo auditoria;
    private final PasswordEncoder encoder;
    private final PlatformTransactionManager transacciones;

    @Value("${factufacil.datos-demo:false}")
    private boolean datosDemo;

    @Override
    public void afterSingletonsInstantiated() {
        new TransactionTemplate(transacciones).executeWithoutResult(t -> cargar());
    }

    private void cargar() {
        for (String r : List.of("DESARROLLADOR", "JEFE", "ADMIN", "EMPLEADO")) {
            if (roles.findByNombre(r).isEmpty()) { Rol x = new Rol(); x.setNombre(r); roles.save(x); }
        }
        if (empresa.count() == 0) {
            EmpresaConfig c = new EmpresaConfig();
            c.setNombre("Mi negocio");
            c.setPorcentajeIva(BigDecimal.valueOf(19));
            c.setActualizadoEn(LocalDateTime.now());
            empresa.save(c);
        }
        if (!secuencias.existsById("FACTURA")) secuencias.save(new Secuencia("FACTURA", 0));
        if (empleados.count() == 0) {
            empleado("1000000001", "Carlos Ruiz", "DESARROLLADOR", null);
            log.info("Usuario inicial creado: cédula 1000000001, contraseña {}. Cámbiela después de ingresar.", CLAVE_DEMO);
        }
        if (datosDemo && productos.count() == 0) {
            cargarDemo();
            log.info("Datos de demostración cargados.");
        }
    }

    private Empleado empleado(String cedula, String nombre, String rol, Long creadoPor) {
        Empleado e = new Empleado();
        e.setCedula(cedula);
        e.setNombre(nombre);
        e.setPasswordHash(encoder.encode(CLAVE_DEMO));
        e.setRol(roles.findByNombre(rol).orElseThrow());
        e.setCreadoPorId(creadoPor);
        return empleados.save(e);
    }

    private void cargarDemo() {
        Random r = new Random(15);
        EmpresaConfig c = empresa.findAll().get(0);
        c.setNombre("Tienda Don Chepe");
        c.setDireccion("Cra. 45 # 32-10, Medellín");
        c.setCelular("300 123 4567");

        Long dev = empleados.findByCedula("1000000001").orElseThrow().getId();
        Long jefe = empleado("1000000002", "Ana Jefe", "JEFE", dev).getId();
        Long admin = empleado("1000000003", "Pedro Admin", "ADMIN", jefe).getId();
        Long maria = empleado("1000000004", "Maria Empleada", "EMPLEADO", jefe).getId();
        Long luisa = empleado("1000000005", "Luisa Empleada", "EMPLEADO", jefe).getId();

        Map<String, Long> cat = new LinkedHashMap<>();
        for (String n : List.of("Granos", "Lácteos y huevos", "Bebidas", "Aseo", "Panadería", "Mecato", "Café y chocolate")) {
            Categoria x = new Categoria(); x.setNombre(n); cat.put(n, categorias.save(x).getId());
        }
        Object[][] base = {
            {"Arroz Diana 500 g", 2100, 48, "Granos"}, {"Frijol cargamanto 500 g", 5200, 22, "Granos"}, {"Lentejas 500 g", 2900, 30, "Granos"},
            {"Leche entera 1 L", 3700, 36, "Lácteos y huevos"}, {"Huevo AA unidad", 600, 120, "Lácteos y huevos"}, {"Queso campesino 250 g", 6300, 0, "Lácteos y huevos"},
            {"Gaseosa 1,5 L", 4200, 40, "Bebidas"}, {"Agua 600 ml", 1500, 60, "Bebidas"}, {"Jugo de caja 200 ml", 1300, 3, "Bebidas"},
            {"Jabón de barra", 2500, 25, "Aseo"}, {"Papel higiénico x4", 6700, 18, "Aseo"}, {"Detergente 500 g", 4800, 0, "Aseo"},
            {"Pan tajado", 5000, 12, "Panadería"}, {"Arepas x5", 2600, 20, "Panadería"}, {"Papas fritas 45 g", 2100, 50, "Mecato"},
            {"Chocolatina 12 g", 900, 80, "Mecato"}, {"Café molido 250 g", 8800, 15, "Café y chocolate"}, {"Chocolate de mesa 250 g", 6100, 10, "Café y chocolate"},
        };
        List<Producto> prods = new ArrayList<>();
        for (Object[] b : base) {
            Producto p = new Producto();
            p.setNombre((String) b[0]);
            p.setValorUnidad(BigDecimal.valueOf((Integer) b[1]).setScale(2));
            p.setCantidad((Integer) b[2]);
            p.setCategoriaId(cat.get((String) b[3]));
            prods.add(productos.save(p));
        }
        String[][] cls = {{"1037654321", "Rosa Elena Pérez", "rosa.perez@correo.co"}, {"900123456-7", "Restaurante El Fogón", "compras@elfogon.co"},
                {"43123987", "Jorge Ramírez", ""}, {"CE-883421", "Valentina Rossi", "vrossi@correo.co"}, {"71234567", "Hernán Gómez", ""}};
        List<Long> clienteIds = new ArrayList<>();
        for (String[] x : cls) {
            Cliente cl = new Cliente(); cl.setDocumento(x[0]); cl.setNombre(x[1]); cl.setCorreo(x[2]);
            clienteIds.add(clientes.save(cl).getId());
        }
        Entidad gana = new Entidad(); gana.setNombre("Gana"); entidades.save(gana);
        Entidad coord = new Entidad(); coord.setNombre("Coordinadora"); coord.setRequiereTipoPago(true); entidades.save(coord);

        // Historial de ventas: 45 días hacia atrás. Las existencias de arriba son las de hoy.
        long consecutivo = 0;
        LocalDate hoy = LocalDate.now();
        Long[] vendedores = {maria, luisa, maria, luisa, admin};
        for (int d = 45; d >= 0; d--) {
            LocalDate fecha = hoy.minusDays(d);
            DayOfWeek dow = fecha.getDayOfWeek();
            int extra = dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY ? 5 : dow == DayOfWeek.FRIDAY ? 3 : 0;
            int cuantas = d == 0 ? 3 : 5 + r.nextInt(6) + extra;
            List<Factura> delDia = new ArrayList<>();
            for (int k = 0; k < cuantas; k++) {
                int hora = 7 + r.nextInt(14);
                Factura f = new Factura();
                // Hoy: ventas en las últimas horas (nunca en el futuro)
                f.setFecha(d == 0 ? LocalDateTime.now().minusMinutes((cuantas - k) * 25L) : fecha.atTime(hora, r.nextInt(60)));
                f.setEmpleadoId(vendedores[r.nextInt(vendedores.length)]);
                f.setClienteId(r.nextDouble() > 0.75 ? clienteIds.get(r.nextInt(clienteIds.size())) : null);
                Set<Long> usados = new HashSet<>();
                BigDecimal sub = BigDecimal.ZERO;
                int n = 1 + r.nextInt(4);
                for (int j = 0; j < n; j++) {
                    Producto p = prods.get(r.nextInt(prods.size()));
                    if (!usados.add(p.getId())) continue;
                    int cant = 1 + r.nextInt(3);
                    FacturaDetalle it = new FacturaDetalle();
                    it.setFactura(f); it.setProductoId(p.getId()); it.setNombreProducto(p.getNombre());
                    it.setCantidad(cant); it.setValorUnidad(p.getValorUnidad());
                    it.setValorTotal(p.getValorUnidad().multiply(BigDecimal.valueOf(cant)));
                    f.getItems().add(it);
                    sub = sub.add(it.getValorTotal());
                }
                BigDecimal iva = sub.multiply(BigDecimal.valueOf(19)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).setScale(2);
                BigDecimal total = sub.add(iva);
                f.setSubtotal(sub); f.setIva(iva); f.setTotal(total);
                double x = r.nextDouble();
                BigDecimal ef = total, tr = BigDecimal.ZERO;
                if (x > 0.85) { ef = total.divide(BigDecimal.valueOf(200), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2); tr = total.subtract(ef); }
                else if (x > 0.6) { ef = BigDecimal.ZERO; tr = total; }
                BigDecimal entregado = ef.signum() > 0 ? ef.divide(BigDecimal.valueOf(5000), 0, RoundingMode.CEILING).multiply(BigDecimal.valueOf(5000)).setScale(2) : BigDecimal.ZERO;
                f.setEntregado(entregado);
                f.setDevuelto(entregado.subtract(ef).max(BigDecimal.ZERO));
                if (ef.signum() > 0) f.getPagos().add(pago(f, "EFECTIVO", ef));
                if (tr.signum() > 0) f.getPagos().add(pago(f, "TRANSFERENCIA", tr));
                FacturaHistorial h = new FacturaHistorial();
                h.setFactura(f); h.setAccion("CREAR"); h.setEmpleadoId(f.getEmpleadoId()); h.setFecha(f.getFecha());
                f.getHistorial().add(h);
                consecutivo++;
                f.setNumero("FAC-" + String.format("%04d", consecutivo));
                delDia.add(facturas.save(f));
            }
            if (d == 0) continue;
            // Cierres de turno (ayer queda con el día sin cerrar para mostrarlo en la demo)
            List<CierreTurno> ct = new ArrayList<>();
            for (String turno : List.of("MAÑANA", "TARDE")) {
                boolean manana = turno.equals("MAÑANA");
                BigDecimal ef = BigDecimal.ZERO, tr = BigDecimal.ZERO;
                for (Factura f : delDia) {
                    if ((f.getFecha().getHour() < 14) != manana) continue;
                    for (FacturaPago p : f.getPagos()) if (p.getMedioPago().equals("EFECTIVO")) ef = ef.add(p.getValor()); else tr = tr.add(p.getValor());
                }
                int desvio = r.nextDouble() > 0.85 ? new int[]{-2000, -500, 1000, 3000}[r.nextInt(4)] : 0;
                BigDecimal gastos = BigDecimal.valueOf(r.nextDouble() > 0.7 ? new int[]{5000, 8000, 12000}[r.nextInt(3)] : 0);
                BigDecimal contado = ef.subtract(gastos).add(BigDecimal.valueOf(desvio));
                CierreTurno c2 = new CierreTurno();
                c2.setFecha(fecha); c2.setTurno(turno);
                c2.setEmpleadoEntregaId(manana ? maria : luisa); c2.setEmpleadoRecibeId(manana ? luisa : admin);
                c2.setVentasSistema(ef.add(tr)); c2.setValorEfectivo(contado); c2.setValorTransferencia(tr);
                c2.setValorTotal(contado.add(tr)); c2.setGastos(gastos);
                c2.setSobra(BigDecimal.valueOf(Math.max(desvio, 0))); c2.setFalta(BigDecimal.valueOf(Math.max(-desvio, 0)));
                c2.setCoordinadoraValor(BigDecimal.valueOf(r.nextBoolean() ? (2 + r.nextInt(7)) * 10000 : 0));
                c2.setGanaValor(BigDecimal.valueOf(r.nextDouble() > 0.4 ? (3 + r.nextInt(13)) * 10000 : 0));
                c2.setObservaciones(desvio < 0 ? "Faltó plata, se revisa con la empleada" : "");
                c2.setCreadoEn(fecha.atTime(manana ? 14 : 21, 5));
                ct.add(turnos.save(c2));
            }
            if (d >= 2) {
                CierreDia cd = new CierreDia();
                cd.setFecha(fecha);
                cd.setTotalVendido(delDia.stream().map(Factura::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setTotalEfectivo(ct.stream().map(CierreTurno::getValorEfectivo).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setTotalTransferencia(ct.stream().map(CierreTurno::getValorTransferencia).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setGastos(ct.stream().map(CierreTurno::getGastos).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setSobra(ct.stream().map(CierreTurno::getSobra).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setFalta(ct.stream().map(CierreTurno::getFalta).reduce(BigDecimal.ZERO, BigDecimal::add));
                cd.setCerradoPorId(admin);
                cd.setCreadoEn(fecha.atTime(21, 30));
                dias.save(cd);
            }
            for (Entidad ent : List.of(gana, coord)) {
                if (r.nextDouble() < 0.2) continue;
                BigDecimal ve = BigDecimal.valueOf((10 + r.nextInt(51)) * 10000L);
                BigDecimal vg = ve.multiply(BigDecimal.valueOf(ent == gana ? 0.03 : 0.05)).multiply(BigDecimal.valueOf(0.8 + r.nextDouble() * 0.4)).setScale(0, RoundingMode.HALF_UP);
                EntidadConciliacion cc = new EntidadConciliacion();
                cc.setEntidadId(ent.getId()); cc.setFecha(fecha);
                cc.setTipoPago(ent.isRequiereTipoPago() ? (r.nextBoolean() ? "ESTABLECIMIENTO" : "CONTRAENTREGA") : null);
                cc.setValorEntregado(ve); cc.setValorGanancia(vg);
                cc.setPorcentajeGanancia(vg.multiply(BigDecimal.valueOf(100)).divide(ve.add(vg), 2, RoundingMode.HALF_UP));
                cc.setEmpleadoId(admin);
                cc.setCreadoEn(fecha.atTime(20, 0));
                conciliaciones.save(cc);
            }
        }
        Secuencia s = secuencias.findById("FACTURA").orElseThrow();
        s.setValor(consecutivo);

        Novedad n = new Novedad();
        n.setFecha(hoy.minusDays(1)); n.setDescripcion("Pago del recibo de energía"); n.setValor(BigDecimal.valueOf(85000)); n.setEmpleadoId(admin);
        novedades.save(n);

        LogAuditoria l = new LogAuditoria();
        l.setTabla("sistema"); l.setAccion("CREAR"); l.setDetalle("Se cargaron los datos de demostración"); l.setFecha(LocalDateTime.now());
        auditoria.save(l);
    }

    private static FacturaPago pago(Factura f, String medio, BigDecimal valor) {
        FacturaPago p = new FacturaPago();
        p.setFactura(f); p.setMedioPago(medio); p.setValor(valor);
        return p;
    }
}
