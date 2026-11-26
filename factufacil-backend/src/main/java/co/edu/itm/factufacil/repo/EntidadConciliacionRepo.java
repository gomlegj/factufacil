package co.edu.itm.factufacil.repo;

import co.edu.itm.factufacil.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EntidadConciliacionRepo extends JpaRepository<EntidadConciliacion, Long> {
    boolean existsByEntidadIdAndFechaAndTipoPago(Long entidadId, LocalDate fecha, String tipoPago);
    boolean existsByEntidadIdAndFechaAndTipoPagoIsNull(Long entidadId, LocalDate fecha);
}
