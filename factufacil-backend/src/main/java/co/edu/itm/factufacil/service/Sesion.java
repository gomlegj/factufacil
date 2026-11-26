package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.domain.Empleado;
import co.edu.itm.factufacil.domain.LogAuditoria;
import co.edu.itm.factufacil.repo.EmpleadoRepo;
import co.edu.itm.factufacil.repo.LogAuditoriaRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/** Empleado que hace la petición y registro automático de auditoría. */
@Service
@RequiredArgsConstructor
public class Sesion {
    private final EmpleadoRepo empleados;
    private final LogAuditoriaRepo auditoria;

    public Long idActual() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof Long id)) throw new NegocioException(401, "Tu sesión terminó. Vuelve a ingresar.");
        return id;
    }

    public Empleado actual() {
        Empleado e = empleados.findById(idActual()).orElseThrow(() -> new NegocioException(401, "Tu sesión terminó. Vuelve a ingresar."));
        if (!e.isActivo()) throw new NegocioException(401, "Tu usuario está desactivado.");
        return e;
    }

    public void registrar(String tabla, Long registroId, String accion, String detalle) {
        Long quien = null;
        try { quien = idActual(); } catch (NegocioException ignorada) { /* acciones del sistema */ }
        registrar(quien, tabla, registroId, accion, detalle);
    }

    public void registrar(Long empleadoId, String tabla, Long registroId, String accion, String detalle) {
        LogAuditoria l = new LogAuditoria();
        l.setTabla(tabla);
        l.setRegistroId(registroId);
        l.setAccion(accion);
        l.setEmpleadoId(empleadoId);
        l.setDetalle(detalle);
        l.setFecha(LocalDateTime.now());
        auditoria.save(l);
    }
}
