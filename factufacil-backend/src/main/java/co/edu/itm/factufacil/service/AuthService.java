package co.edu.itm.factufacil.service;

import co.edu.itm.factufacil.config.JwtService;
import co.edu.itm.factufacil.domain.Empleado;
import co.edu.itm.factufacil.domain.RefreshToken;
import co.edu.itm.factufacil.repo.EmpleadoRepo;
import co.edu.itm.factufacil.repo.RefreshTokenRepo;
import co.edu.itm.factufacil.web.Dto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Inicio de sesión con cédula + contraseña, JWT de acceso corto y refresh token rotativo. */
@Service
@RequiredArgsConstructor
public class AuthService {
    private final EmpleadoRepo empleados;
    private final RefreshTokenRepo tokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Sesion sesion;
    @Value("${factufacil.jwt.refresh-dias}")
    private long diasRefresh;

    @Transactional
    public Dto.Sesion login(Dto.Login in) {
        Empleado e = empleados.findByCedula(Num.texto(in.cedula()))
                .orElseThrow(() -> new NegocioException(401, "Cédula o contraseña incorrecta."));
        if (!encoder.matches(in.password() == null ? "" : in.password(), e.getPasswordHash()))
            throw new NegocioException(401, "Cédula o contraseña incorrecta.");
        if (!e.isActivo()) throw new NegocioException(403, "Este empleado está desactivado. Habla con el jefe.");
        sesion.registrar(e.getId(), "empleados", e.getId(), "INGRESAR", e.getNombre() + " inició sesión");
        return emitir(e);
    }

    @Transactional
    public Dto.Sesion refrescar(String refresh) {
        RefreshToken t = tokens.findByTokenHash(JwtService.sha256(Num.texto(refresh)))
                .orElseThrow(() -> new NegocioException(401, "Tu sesión terminó. Vuelve a ingresar."));
        if (t.isRevocado() || t.getExpiraEn().isBefore(LocalDateTime.now()))
            throw new NegocioException(401, "Tu sesión terminó. Vuelve a ingresar.");
        Empleado e = empleados.findById(t.getEmpleadoId()).orElseThrow();
        if (!e.isActivo()) throw new NegocioException(401, "Tu usuario está desactivado.");
        t.setRevocado(true); // rotación: cada refresh token sirve una sola vez
        return emitir(e);
    }

    @Transactional
    public void logout(String refresh) {
        if (Num.vacio(refresh)) return;
        tokens.findByTokenHash(JwtService.sha256(refresh)).ifPresent(t -> t.setRevocado(true));
    }

    private Dto.Sesion emitir(Empleado e) {
        String refresh = jwt.nuevoRefresh();
        RefreshToken t = new RefreshToken();
        t.setEmpleadoId(e.getId());
        t.setTokenHash(JwtService.sha256(refresh));
        t.setExpiraEn(LocalDateTime.now().plusDays(diasRefresh));
        tokens.save(t);
        return new Dto.Sesion(jwt.crearAccess(e), refresh, jwt.segundosAccess(), Dto.EmpleadoOut.de(e));
    }
}
