package co.edu.itm.factufacil.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "novedades")
@Getter @Setter @NoArgsConstructor
public class Novedad {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate fecha;
    private String descripcion;
    private BigDecimal valor;
    private Long empleadoId;
    private boolean activo = true;
    private LocalDateTime creadoEn = LocalDateTime.now();
}
