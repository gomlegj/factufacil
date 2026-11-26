package co.edu.itm.factufacil.config;

import co.edu.itm.factufacil.domain.Empleado;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;

/** Emite y valida el access token (JWT firmado HS256) y genera refresh tokens aleatorios. */
@Service
public class JwtService {

    private final SecretKey clave;
    private final Duration duracionAccess;
    private final SecureRandom random = new SecureRandom();

    public JwtService(@Value("${factufacil.jwt.secret}") String secreto,
                      @Value("${factufacil.jwt.access-minutos}") long minutos) {
        byte[] bytes = sha256Bytes(secreto); // 32 bytes: longitud minima para HS256
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.duracionAccess = Duration.ofMinutes(minutos);
    }

    public String crearAccess(Empleado e) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(String.valueOf(e.getId()))
                .claim("rol", e.getRol().getNombre())
                .claim("nombre", e.getNombre())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + duracionAccess.toMillis()))
                .signWith(clave)
                .compact();
    }

    public Claims validar(String token) {
        return Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
    }

    public long segundosAccess() {
        return duracionAccess.toSeconds();
    }

    public String nuevoRefresh() {
        byte[] b = new byte[48];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static String sha256(String texto) {
        return HexFormat.of().formatHex(sha256Bytes(texto));
    }

    private static byte[] sha256Bytes(String texto) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
