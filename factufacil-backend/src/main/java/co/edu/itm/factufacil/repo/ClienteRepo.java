package co.edu.itm.factufacil.repo;

import co.edu.itm.factufacil.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClienteRepo extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByDocumentoIgnoreCase(String documento);
    Optional<Cliente> findByNombreIgnoreCase(String nombre);
}
