package co.edu.itm.factufacil.repo;

import co.edu.itm.factufacil.domain.Secuencia;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface SecuenciaRepo extends JpaRepository<Secuencia, String> {
    // SELECT ... FOR UPDATE: dos facturas guardadas al mismo tiempo nunca reciben el mismo numero
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Secuencia s where s.nombre = :nombre")
    Optional<Secuencia> bloquear(String nombre);
}
