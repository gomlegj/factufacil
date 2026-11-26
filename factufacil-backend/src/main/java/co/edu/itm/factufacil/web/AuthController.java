package co.edu.itm.factufacil.web;

import co.edu.itm.factufacil.service.AuthService;
import co.edu.itm.factufacil.service.ConsultaService;
import co.edu.itm.factufacil.service.Sesion;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final Sesion sesion;
    private final ConsultaService consultas;

    @GetMapping("/salud")
    public Map<String, String> salud() { return Map.of("estado", "ok"); }

    @PostMapping("/auth/login")
    public Dto.Sesion login(@RequestBody Dto.Login in) { return auth.login(in); }

    @PostMapping("/auth/refresh")
    public Dto.Sesion refresh(@RequestBody Dto.Refresh in) { return auth.refrescar(in.refreshToken()); }

    @PostMapping("/auth/logout")
    public void logout(@RequestBody(required = false) Dto.Refresh in) { auth.logout(in == null ? null : in.refreshToken()); }

    @GetMapping("/auth/yo")
    public Dto.EmpleadoOut yo() { return Dto.EmpleadoOut.de(sesion.actual()); }

    /** Todo el estado que necesita la interfaz, filtrado por el cargo de quien pregunta. */
    @GetMapping("/estado")
    public Dto.Estado estado() { return consultas.estado(); }
}
