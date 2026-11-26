package co.edu.itm.factufacil.config;

import co.edu.itm.factufacil.service.NegocioException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Todos los errores salen como {"mensaje": "..."} en español sencillo. */
@RestControllerAdvice
public class ManejadorErrores {
    private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

    @ExceptionHandler(NegocioException.class)
    ResponseEntity<Map<String, String>> negocio(NegocioException e) {
        return ResponseEntity.status(e.getEstado()).body(Map.of("mensaje", e.getMessage()));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ResponseEntity<Map<String, String>> permiso(Exception e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("mensaje", "Tu cargo no tiene permiso para esta acción."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> json(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(Map.of("mensaje", "Los datos enviados no tienen el formato correcto."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> integridad(DataIntegrityViolationException e) {
        log.warn("Violacion de integridad: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje", "Ese dato ya existe o no es válido."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> general(Exception e) {
        log.error("Error no controlado", e);
        return ResponseEntity.internalServerError().body(Map.of("mensaje", "Algo salió mal en el servidor. Intenta de nuevo."));
    }
}
