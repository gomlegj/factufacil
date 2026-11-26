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
@Table(name = "entidad_conciliaciones")
@Getter @Setter @NoArgsConstructor
public class EntidadConciliacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long entidadId;
    private LocalDate fecha;
    private String tipoPago;
    private BigDecimal valorEntregado;
    private BigDecimal valorGanancia;
    private BigDecimal porcentajeGanancia;
    private Long empleadoId;
    private LocalDateTime creadoEn = LocalDateTime.now();
}
