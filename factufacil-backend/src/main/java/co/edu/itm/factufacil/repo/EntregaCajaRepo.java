package co.edu.itm.factufacil.repo;

import co.edu.itm.factufacil.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EntregaCajaRepo extends JpaRepository<EntregaCaja, Long> {
}
