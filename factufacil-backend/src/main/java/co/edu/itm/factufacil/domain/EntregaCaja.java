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
@Table(name = "entregas_caja")
@Getter @Setter @NoArgsConstructor
public class EntregaCaja {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate fechaDesde;
    private LocalDate fechaHasta;
    private BigDecimal valorEntregado;
    private Long entregadoPorId;
    private Long recibidoPorId;
    private String observaciones;
    private LocalDateTime creadoEn = LocalDateTime.now();
}
